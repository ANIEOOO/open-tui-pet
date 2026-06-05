import { existsSync, appendFileSync, mkdirSync } from "fs"
import { dirname } from "path"
import { LOG_FILE } from "./constants.js"

export function log(msg: string) {
  const line = `[${new Date().toISOString()}] ${msg}\n`
  try {
    const dir = dirname(LOG_FILE)
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
    appendFileSync(LOG_FILE, line)
  } catch {}
}
