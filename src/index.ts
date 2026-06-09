import type { Plugin, PluginInput } from "@opencode-ai/plugin"
import { spawn, execSync } from "child_process"
import { dirname, join } from "path"
import { fileURLToPath } from "url"
import { existsSync } from "fs"
import { log } from "./logger.js"
import { readConfig } from "./config.js"
import { findAllPets } from "./pet-discovery.js"
import { LOG_FILE, CONFIG_FILE } from "./constants.js"

const __dirname = dirname(fileURLToPath(import.meta.url))

function findElectronPackage(): string | null {
  let dir = __dirname
  while (true) {
    const candidate = join(dir, "node_modules", "electron", "package.json")
    if (existsSync(candidate)) return dirname(candidate)
    const parent = dirname(dir)
    if (parent === dir) break
    dir = parent
  }
  return null
}

function detectElectronMirror(): string | null {
  try {
    const mirror = execSync("npm config get electron_mirror", { stdio: "pipe", timeout: 5000 })
      .toString().trim()
    if (mirror && mirror !== "undefined" && mirror !== "null") return mirror
  } catch {}

  try {
    const registry = execSync("npm config get registry", { stdio: "pipe", timeout: 5000 })
      .toString().trim()
    const mirrors: Record<string, string> = {
      "registry.npmmirror.com": "https://npmmirror.com/mirrors/electron/",
      "registry.npm.taobao.org": "https://npm.taobao.org/mirrors/electron/",
      "registry.npm.taobao.com": "https://npm.taobao.org/mirrors/electron/",
      "r.cnpmjs.org": "https://r.cnpmjs.org/mirrors/electron/",
    }
    for (const [host, url] of Object.entries(mirrors)) {
      if (registry.includes(host)) {
        log(`[pet] Auto-mapped registry to electron mirror: ${url}`)
        return url
      }
    }
  } catch (err: any) {
    log(`[pet] Failed to read npm registry: ${err.message}`)
  }

  return null
}

function resolveElectronPath(): string {
  try {
    return require("electron") as string
  } catch {}

  const electronPkg = findElectronPackage()
  if (electronPkg) {
    const installScript = join(electronPkg, "install.js")
    if (existsSync(installScript)) {
      log(`[pet] Electron binary missing, downloading...`)
      const env = { ...process.env }
      if (!env.ELECTRON_MIRROR && !env.npm_config_electron_mirror) {
        const mirror = detectElectronMirror()
        if (mirror) env.npm_config_electron_mirror = mirror
      }
      try {
        execSync(`node "${installScript}"`, {
          cwd: electronPkg,
          stdio: "pipe",
          timeout: 300_000,
          env,
        })
        try {
          return require("electron") as string
        } catch {}
      } catch (err: any) {
        log(`[pet] Electron install.js failed: ${err.message}`)
      }
    }
  }

  throw new Error(
    "Cannot find electron binary. Make sure electron is installed. " +
    "Run: npm install electron in your project."
  )
}

const server: Plugin = async (input: PluginInput) => {
  const allPets = findAllPets()
  const config = readConfig()
  const selectedSlug = config.selectedPet && allPets.find(p => p.slug === config.selectedPet)
    ? config.selectedPet
    : allPets[0]?.slug ?? ""

  log(`[pet] Selected: ${selectedSlug || "(none)"}, pets: ${allPets.length}, pid: ${process.pid}`)

  const proc = spawn(resolveElectronPath(), [join(__dirname, "electron", "main.js")], {
    env: {
      ...process.env,
      PET_RENDERER_PATH: join(__dirname, "renderer"),
      PET_PARENT_PID: String(process.pid),
      PET_LOG_FILE: LOG_FILE,
      PET_ALL_PETS: JSON.stringify(allPets),
      PET_SELECTED: selectedSlug,
      PET_CONFIG_FILE: CONFIG_FILE,
      PET_CWD: process.cwd(),
    },
    detached: true,
    stdio: ["ignore", "pipe", "pipe", "ipc"],
  })

  proc.stdout?.on("data", (d: Buffer) => log(`[electron:stdout] ${d.toString().trim()}`))
  proc.stderr?.on("data", (d: Buffer) => log(`[electron:stderr] ${d.toString().trim()}`))
  proc.on("error", (err: Error) => log(`[pet] Spawn error: ${err.message}`))

  const client = (input as any).client

  proc.on("message", async (msg: any) => {
    if (msg?.type === "permission-reply" && msg.data) {
      const { requestID, sessionID, reply } = msg.data
      try {
        if (!client._client) throw new Error("client._client is undefined")
        await client._client.post({
          url: "/session/{id}/permissions/{permissionID}",
          path: { id: sessionID, permissionID: requestID },
          body: { response: reply },
        })
      } catch (err: any) {
        log(`[pet] Permission reply failed: ${err.message}`)
      }
    }
  })

  proc.unref()

  return {
    event: async ({ event }) => {
      if (proc.connected && !proc.killed) {
        try { proc.send({ type: "pet-event", event }) }
        catch (err: any) { log(`[pet] IPC send failed: ${err.message}`) }
      }
    },
  }
}

export default { id: "open-tui-pet", server }
