# open-tui-pet

**[中文文档](README.zh-CN.md)**

Desktop pet plugin for OpenCode / DevEco CLI. An animated companion that sits on your screen and reacts to your coding activity in real-time.

## Features

- **11 built-in pets** — Boba, Mochi, Shoggoth, Cortana, Friday, Humboldt, Luffy, Nezuko, One Punch Pet, Clawd-2, Xiaobai
- **Activity reactions** — pet animates based on what you're doing (editing, searching, running commands, thinking, etc.)
- **Permission authorization** — popup appears when tools need approval, with Allow / Always / Reject buttons
- **Speech bubbles** — contextual messages like "Editing file...", "Searching...", "Running command..."
- **System tray** — right-click to switch pets, show/hide, or quit
- **Sleep mode** — pet goes idle after 5 minutes of inactivity
- **Custom pets** — drop your own spritesheet into the pets directory

## Quick Start

### 1. Install

```bash
npm install open-tui-pet
```

### 2. Configure

Add to your project's config file (`.opencode/opencode.jsonc`):

```jsonc
{
  "plugin": ["../node_modules/open-tui-pet/dist/index.js"]
}
```

See [Configuration options](#configuration-options) for alternative setups.

### 3. Run

```bash
opencode   # or deveco
```

The pet window appears at the bottom-right corner of your screen.

## Configuration options

### npm install + file path (recommended)

Install the package first to ensure Electron and all dependencies are available locally:

```bash
npm install open-tui-pet
```

Then configure with a file path to avoid duplicate downloads:

```jsonc
{
  "plugin": ["../node_modules/open-tui-pet/dist/index.js"]
}
```

**Why this approach?**
- Electron binary is downloaded during `npm install` (via postinstall script)
- All dependencies are available in `node_modules/`
- Faster plugin loading (no need to download Electron on first run)
- No duplicate downloads (OpenCode won't re-download to its cache)

### npm package name (alternative)

If you don't want to run `npm install`, OpenCode can download the plugin automatically:

```jsonc
{
  "plugin": ["open-tui-pet"]
}
```

OpenCode will download and cache the plugin in `~/.cache/opencode/packages/`. Note that this may trigger a separate Electron download on first run.

### Local file path

Use a file path relative to the config file, or an absolute path:

```jsonc
{
  // Relative to .opencode/opencode.jsonc
  "plugin": ["../node_modules/open-tui-pet/dist/index.js"]
}
```

```jsonc
{
  // Absolute path
  "plugin": ["/path/to/open-tui-pet/dist/index.js"]
}
```

### From source

```bash
git clone <repo>
cd open-tui-pet
bun install
npm run build
```

Then point your config to `dist/index.js`.

## Usage

- **Switch pets**: right-click the system tray icon → Switch Pet
- **Show/Hide**: double-click the tray icon, or use the tray menu
- **Quit**: tray menu → Quit (or close the CLI)

## Adding custom pets

### Where to get pets

**[Petdex](https://petdex.crafter.run)** — the public gallery of animated companions, with 2900+ community pets.

```bash
# Browse and install via CLI
npx petdex install <pet-name>

# Examples
npx petdex install boba
npx petdex install shoggoth
npx petdex install luffy
```

Pets are installed to `~/.codex/pets/` by default. open-tui-pet also scans `~/.petdex/pets/` automatically.

Other sources:
- **[petdex.crafter.run](https://petdex.crafter.run)** — web gallery, preview animations, download ZIP
- **[crafter-station/petdex](https://github.com/crafter-station/petdex)** — source repo with all pet packages under `public/pets/`
- **Create your own** — use the [Hatch Pet](https://petdex.crafter.run/create) tool or design a spritesheet manually

### Pet directory structure

Place pet files in one of these directories (first match wins):

| Priority | Path |
|----------|------|
| 1 (highest) | `~/.config/deveco/pets/<pet-name>/` |
| 2 | `~/.config/opencode/pets/<pet-name>/` |
| 3 | `~/.petdex/pets/<pet-name>/` |
| 4 (bundled) | ships with plugin |

Each pet directory needs:

```
<pet-name>/
├── pet.json
└── spritesheet.webp   (or .png)
```

**pet.json**:
```json
{
  "id": "my-pet",
  "displayName": "My Pet",
  "description": "A custom pet",
  "spritesheetPath": "spritesheet.webp"
}
```

**Spritesheet format**: 8 columns × 9 rows grid. Each frame is 192×208px (total sheet: 1536×1872px).

Row layout:

| Row | Animation |
|-----|-----------|
| 0 | idle |
| 1 | running right |
| 2 | running left |
| 3 | waving |
| 4 | jumping |
| 5 | failed |
| 6 | waiting |
| 7 | running |
| 8 | review / thinking |

Pets from [petdex](https://github.com/nicepkg/petdex) are compatible.

## Architecture

```
src/
├── index.ts              # Plugin entry — spawns Electron, forwards events
├── constants.ts          # Paths, window dimensions, timeouts
├── config.ts             # Read/write pet selection config
├── pet-discovery.ts      # Scan directories for installed pets
├── logger.ts             # File-based logging
├── types.ts              # Shared TypeScript interfaces
├── electron/
│   ├── main.ts           # Electron main process
│   ├── window.ts         # Frameless transparent window
│   ├── tray.ts           # System tray with pet switcher
│   ├── ipc.ts            # IPC between parent ↔ electron ↔ renderer
│   ├── preload.ts        # Context bridge for renderer
│   └── pet-loader.ts     # Load spritesheet as data URL
└── renderer/
    ├── index.html        # Renderer entry
    ├── styles.css         # Pet + permission popup styles
    ├── pet.js             # Main renderer — wires everything together
    ├── sprite-engine.js   # Spritesheet frame player
    ├── state-machine.js   # Animation states + transitions
    ├── event-handler.js   # Maps CLI events → pet states + bubbles
    ├── speech-bubble.js   # Floating text bubble above pet
    └── permission-popup.js # Permission authorization UI
```

## Event mapping

| CLI Event | Pet State | Bubble |
|-----------|-----------|--------|
| `session.status: busy` | running | "Working on it" |
| `session.status: idle` | waving | "Done!" |
| `session.status: retry` | failed | "Needs attention" |
| `session.thinking` | review | "Reviewing..." |
| `permission.asked` | waiting | "Permission needed!" |
| `permission.replied` | running | — |
| `tool: edit/write` | running | "Editing file..." |
| `tool: grep/glob` | running | "Searching..." |
| `tool: bash/shell` | running | "Running command..." |
| `tool: fetch/websearch` | running | "Browsing web..." |
| `tool: task` | running | "Delegating..." |
| 5min no events | idle (sleep) | — |

## Development

```bash
bun install
npm run build        # bundle to dist/
npm run typecheck    # tsc --noEmit
```

The plugin uses `@opencode-ai/plugin` SDK. The Electron process is spawned as a child of the CLI process and communicates via Node IPC. Events flow:

```
CLI → plugin (index.ts) → IPC → electron main → webContents → renderer
```

Permission replies flow back:

```
renderer → IPC → electron main → IPC → plugin → HTTP POST to CLI API
```

## License

MIT
