import { existsSync, readdirSync, readFileSync } from "fs"
import { join } from "path"
import { PET_SEARCH_PATHS } from "./constants.js"
import type { PetInfo } from "./types.js"
import { log } from "./logger.js"

export function findAllPets(): PetInfo[] {
  const pets: PetInfo[] = []
  const seen = new Set<string>()

  for (const petsRoot of PET_SEARCH_PATHS) {
    if (!existsSync(petsRoot)) continue
    try {
      const entries = readdirSync(petsRoot, { withFileTypes: true })
      for (const entry of entries) {
        if (!entry.isDirectory()) continue
        const slug = entry.name
        if (seen.has(slug)) continue
        const petDir = join(petsRoot, slug)
        const petJsonPath = join(petDir, "pet.json")
        const hasSprite =
          existsSync(join(petDir, "spritesheet.webp")) ||
          existsSync(join(petDir, "spritesheet.png"))
        if (existsSync(petJsonPath) && hasSprite) {
          seen.add(slug)
          try {
            const petJson = JSON.parse(readFileSync(petJsonPath, "utf-8"))
            pets.push({
              slug,
              dir: petDir,
              name: petJson.displayName || slug,
            })
          } catch {
            pets.push({ slug, dir: petDir, name: slug })
          }
        }
      }
    } catch {}
  }

  log(`[discovery] Found ${pets.length} pets: ${pets.map(p => p.slug).join(", ")}`)
  return pets
}
