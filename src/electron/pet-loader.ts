import { readFileSync, existsSync } from "fs"
import { join } from "path"
import type { PetData } from "../types.js"
import { log } from "../logger.js"

export function loadPetData(petDir: string): PetData | null {
  if (!petDir || !existsSync(petDir)) return null

  try {
    const petJson = JSON.parse(readFileSync(join(petDir, "pet.json"), "utf-8"))
    const ext = existsSync(join(petDir, "spritesheet.webp")) ? "webp" : "png"
    const spritePath = join(petDir, `spritesheet.${ext}`)
    const spriteBuffer = readFileSync(spritePath)
    const mime = ext === "webp" ? "image/webp" : "image/png"
    const base64 = spriteBuffer.toString("base64")
    return {
      spriteDataUrl: `data:${mime};base64,${base64}`,
      name: petJson.displayName || petJson.id || "Pet",
      slug: petJson.id || petJson.slug || "",
    }
  } catch (err: any) {
    log(`[electron] Failed to load pet data from ${petDir}: ${err.message}`)
    return null
  }
}
