import { screen, BrowserWindow, app } from "electron"
import { join, dirname } from "path"
import { fileURLToPath } from "url"
import { WINDOW_WIDTH, WINDOW_HEIGHT, WINDOW_MARGIN, POSITION_SAVE_DEBOUNCE_MS } from "../constants.js"
import { log } from "../logger.js"
import { readConfig, saveConfig } from "../config.js"

const __dirname = dirname(fileURLToPath(import.meta.url))

let mainWindow: BrowserWindow | null = null
let saveTimer: ReturnType<typeof setTimeout> | null = null

export function getMainWindow(): BrowserWindow | null {
  return mainWindow
}

export function createWindow(
  rendererPath: string,
  onContextMenu?: () => void,
): BrowserWindow {
  const primaryDisplay = screen.getPrimaryDisplay()
  const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize

  const defaultX = screenWidth - WINDOW_WIDTH - WINDOW_MARGIN
  const defaultY = screenHeight - WINDOW_HEIGHT - WINDOW_MARGIN

  let x = defaultX
  let y = defaultY

  const config = readConfig()
  const savedX = config.windowX
  const savedY = config.windowY

  if (
    typeof savedX === "number" &&
    typeof savedY === "number" &&
    !isNaN(savedX) &&
    !isNaN(savedY)
  ) {
    const display = screen.getDisplayNearestPoint({ x: savedX, y: savedY })
    const { x: bx, y: by, width: bw, height: bh } = display.bounds
    if (savedX >= bx && savedX < bx + bw && savedY >= by && savedY < by + bh) {
      x = savedX
      y = savedY
      log(`[electron] Restoring window position from config: (${x}, ${y})`)
    } else {
      log(`[electron] Saved position (${savedX}, ${savedY}) is off-screen, using default`)
    }
  }

  log(`[electron] Creating window at (${x}, ${y}), screen: ${screenWidth}x${screenHeight}`)

  mainWindow = new BrowserWindow({
    width: WINDOW_WIDTH,
    height: WINDOW_HEIGHT,
    x,
    y,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    hasShadow: false,
    webPreferences: {
      preload: join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  const htmlPath = join(rendererPath, "index.html")
  log(`[electron] Loading HTML: ${htmlPath}`)

  mainWindow.loadFile(htmlPath).then(() => {
    log("[electron] HTML loaded successfully")
  }).catch((err: Error) => {
    log(`[electron] Failed to load HTML: ${err.message}`)
  })

  mainWindow.webContents.on("did-fail-load", (_event, errorCode, errorDescription) => {
    log(`[electron] Page load failed: ${errorCode} ${errorDescription}`)
  })

  mainWindow.webContents.on("console-message", (_event, level, message) => {
    log(`[electron:renderer:${level}] ${message}`)
  })

  if (onContextMenu) {
    mainWindow.webContents.on("context-menu", () => {
      onContextMenu()
    })
  }

  mainWindow.on("closed", () => {
    log("[electron] Window closed")
    mainWindow = null
  })

  mainWindow.on("move", () => {
    if (saveTimer) clearTimeout(saveTimer)
    saveTimer = setTimeout(() => {
      if (!mainWindow) return
      const { x, y } = mainWindow.getBounds()
      const config = readConfig()
      config.windowX = x
      config.windowY = y
      saveConfig(config)
    }, POSITION_SAVE_DEBOUNCE_MS)
  })

  if (process.platform === "darwin") {
    app.dock?.hide()
    mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
  }

  if (process.platform === "win32") {
    mainWindow.setSkipTaskbar(true)
  }

  return mainWindow
}
