# Agents Guide

This document outlines rules and constraints for AI agents working on this codebase.

## DO NOT Add

### Hardcoded Mirror Sources
- **DO NOT** hardcode specific mirror URLs (e.g., `https://npmmirror.com/mirrors/electron/`) as defaults
- **DO NOT** add new mirror detection logic without checking existing `detectElectronMirror()` in `src/index.ts`
- Respect user's `ELECTRON_MIRROR` environment variable first, then `.npmrc` config, then auto-detect from npm registry

### Debug/Verbose Logging
- **DO NOT** add `console.log` or verbose debug logs
- **DO NOT** log routine operations (e.g., "Loading pet...", "Starting electron...")
- Only log: errors, warnings, selected pet name, download status, IPC failures
- Use the existing `log()` function from `src/logger.ts`

### Duplicate Pet Discovery Logic
- **DO NOT** add new pet search paths without updating `src/constants.ts`
- **DO NOT** change the search priority order:
  1. `~/.config/deveco/pets/`
  2. `~/.config/opencode/pets/`
  3. `~/.petdex/pets/`
  4. Bundled `dist/pets/`

### Vendor-Specific Branding
- **DO NOT** rename the plugin from `open-tui-pet` to vendor-specific names
- **DO NOT** add vendor-specific config paths without keeping the generic ones
- Keep the plugin vendor-neutral

### Electron Binary Handling
- **DO NOT** bundle Electron binary in the npm package (too large)
- **DO NOT** download Electron from sources other than GitHub Releases or user-configured mirrors
- **DO NOT** modify the postinstall script in `scripts/install.js` without testing on both npm and bun

### Config File Handling
- **DO NOT** assume `.json` config exists — always check `.jsonc` first
- **DO NOT** write to config files without preserving existing content
- **DO NOT** create config files in locations other than `~/.config/opencode/` or `~/.config/deveco/`

### IPC Protocol
- **DO NOT** change IPC message types (`pet-event`, `permission-reply`) without updating both sides
- **DO NOT** add new IPC channels without documenting them in `src/electron/ipc.ts`
- **DO NOT** remove the `detached: true` spawn option (pet must survive CLI restarts)

### Dependencies
- **DO NOT** add runtime dependencies that require native compilation (breaks cross-platform)
- **DO NOT** add dependencies that duplicate what `@opencode-ai/plugin` already provides
- **DO NOT** pin exact versions in `dependencies` — use ranges (e.g., `^1.0.0`)

### Build Output
- **DO NOT** commit files in `dist/` to git
- **DO NOT** modify `tsconfig.json` output settings without updating `package.json` exports
- **DO NOT** add source maps to production builds

## MUST Follow

### Pet Resource Format
- Spritesheet must be 8 columns × 9 rows grid
- Each frame is 192×208px (total sheet: 1536×1872px)
- `pet.json` must have: `id`, `displayName`, `spritesheetPath`

### Error Handling
- All async operations must have try/catch with logging
- IPC failures must not crash the plugin — log and continue
- Electron spawn errors must be logged with full error message

### Cross-Platform Compatibility
- Use `path.join()` for all file paths (never string concatenation)
- Use `existsSync()` before file operations
- Test on macOS, Linux, and Windows before releasing

### Version Management
- Update `package.json` version before publishing
- Use semantic versioning (MAJOR.MINOR.PATCH)
- Tag releases with both `latest` and `beta` during development
