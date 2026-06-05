import { existsSync, readFileSync, writeFileSync } from "fs"
import { CONFIG_FILE } from "./constants.js"
import type { PetConfig } from "./types.js"
import { log } from "./logger.js"

export function readConfig(): PetConfig {
  try {
    if (existsSync(CONFIG_FILE)) {
      return JSON.parse(readFileSync(CONFIG_FILE, "utf-8"))
    }
  } catch {}
  return { selectedPet: "" }
}

export function saveConfig(config: PetConfig): void {
  try {
    writeFileSync(CONFIG_FILE, JSON.stringify(config))
    log(`[config] Saved: selected=${config.selectedPet}`)
  } catch (err: any) {
    log(`[config] Failed to save: ${err.message}`)
  }
}
