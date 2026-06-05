# open-tui-pet

**[English](README.md)**

OpenCode / DevEco CLI 桌面宠物插件。一个动画伴侣，坐在屏幕上实时响应你的编码活动。

## 特性

- **11 个内置宠物** — Boba、Mochi、Shoggoth、Cortana、Friday、Humboldt、Luffy、Nezuko、One Punch Pet、Clawd-2、Xiaobai
- **活动响应** — 宠物根据你正在做的事情播放动画（编辑、搜索、执行命令、思考等）
- **权限授权** — 工具需要审批时弹出窗口，支持 Allow / Always / Reject 三个按钮
- **气泡消息** — 上下文提示，如"编辑文件中..."、"搜索中..."、"执行命令..."
- **系统托盘** — 右键切换宠物、显示/隐藏、退出
- **睡眠模式** — 5 分钟无活动后宠物进入待机
- **自定义宠物** — 放入自己的 spritesheet 即可使用

## 快速开始

### 1. 安装

```bash
npm install open-tui-pet
```

### 2. 配置

在项目配置文件中添加（`.opencode/opencode.jsonc`）：

```jsonc
{
  "plugin": ["../node_modules/open-tui-pet/dist/index.js"]
}
```

详见 [配置方式](#配置方式)。

### 3. 启动

```bash
opencode   # 或 deveco
```

宠物窗口会出现在屏幕右下角。

## 配置方式

### npm install + 文件路径（推荐）

先安装包，确保 Electron 和所有依赖在本地可用：

```bash
npm install open-tui-pet
```

然后使用文件路径配置，避免重复下载：

```jsonc
{
  "plugin": ["../node_modules/open-tui-pet/dist/index.js"]
}
```

**为什么推荐这种方式？**
- Electron 二进制文件在 `npm install` 时下载（通过 postinstall 脚本）
- 所有依赖都在 `node_modules/` 中可用
- 插件加载更快（无需在首次运行时下载 Electron）
- 不会重复下载（OpenCode 不会重新下载到缓存）

### npm 包名（备选）

如果不想运行 `npm install`，OpenCode 可以自动下载插件：

```jsonc
{
  "plugin": ["open-tui-pet"]
}
```

OpenCode 会下载并缓存插件到 `~/.cache/opencode/packages/`。注意首次运行时可能会触发单独的 Electron 下载。

### 本地文件路径

使用相对于配置文件的路径，或绝对路径：

```jsonc
{
  // 相对于 .opencode/opencode.jsonc
  "plugin": ["../node_modules/open-tui-pet/dist/index.js"]
}
```

```jsonc
{
  // 绝对路径
  "plugin": ["/path/to/open-tui-pet/dist/index.js"]
}
```

### 从源码构建

```bash
git clone <repo>
cd open-tui-pet
bun install
npm run build
```

然后将配置指向 `dist/index.js`。

## 使用方法

- **切换宠物**：右键系统托盘图标 → Switch Pet
- **显示/隐藏**：双击托盘图标，或使用托盘菜单
- **退出**：托盘菜单 → Quit（或关闭 CLI）

## 添加自定义宠物

### 宠物资源获取

**[Petdex](https://petdex.crafter.run)** — 公共宠物画廊，拥有 2900+ 社区宠物。

```bash
# 通过 CLI 浏览和安装
npx petdex install <宠物名>

# 示例
npx petdex install boba
npx petdex install shoggoth
npx petdex install luffy
```

宠物默认安装到 `~/.codex/pets/`。open-tui-pet 也会自动扫描 `~/.petdex/pets/`。

其他来源：
- **[petdex.crafter.run](https://petdex.crafter.run)** — 网页画廊，预览动画，下载 ZIP
- **[crafter-station/petdex](https://github.com/crafter-station/petdex)** — 源码仓库，所有宠物包在 `public/pets/` 下
- **自己制作** — 使用 [Hatch Pet](https://petdex.crafter.run/create) 工具或手动设计 spritesheet

### 宠物目录结构

将宠物文件放入以下目录之一（优先级从高到低）：

| 优先级 | 路径 |
|--------|------|
| 1（最高） | `~/.config/deveco/pets/<宠物名>/` |
| 2 | `~/.config/opencode/pets/<宠物名>/` |
| 3 | `~/.petdex/pets/<宠物名>/` |
| 4（内置） | 随插件分发 |

每个宠物目录需要包含：

```
<宠物名>/
├── pet.json
└── spritesheet.webp   (或 .png)
```

**pet.json**：
```json
{
  "id": "my-pet",
  "displayName": "我的宠物",
  "description": "一个自定义宠物",
  "spritesheetPath": "spritesheet.webp"
}
```

**Spritesheet 格式**：8 列 × 9 行网格，每帧 192×208px（总尺寸 1536×1872px）。

行布局：

| 行 | 动画 |
|----|------|
| 0 | 待机 |
| 1 | 向右跑 |
| 2 | 向左跑 |
| 3 | 挥手 |
| 4 | 跳跃 |
| 5 | 失败 |
| 6 | 等待 |
| 7 | 奔跑 |
| 8 | 审查/思考 |

兼容 [petdex](https://github.com/nicepkg/petdex) 的宠物资源。

## 架构

```
src/
├── index.ts              # 插件入口 — 启动 Electron，转发事件
├── constants.ts          # 路径、窗口尺寸、超时配置
├── config.ts             # 读写宠物选择配置
├── pet-discovery.ts      # 扫描目录发现已安装宠物
├── logger.ts             # 文件日志
├── types.ts              # 共享 TypeScript 接口
├── electron/
│   ├── main.ts           # Electron 主进程
│   ├── window.ts         # 无边框透明窗口
│   ├── tray.ts           # 系统托盘 + 宠物切换菜单
│   ├── ipc.ts            # 父进程 ↔ Electron ↔ 渲染器 间通信
│   ├── preload.ts        # 渲染器上下文桥接
│   └── pet-loader.ts     # 将 spritesheet 加载为 data URL
└── renderer/
    ├── index.html        # 渲染器入口
    ├── styles.css         # 宠物 + 权限弹窗样式
    ├── pet.js             # 主渲染逻辑 — 串联所有组件
    ├── sprite-engine.js   # Spritesheet 帧播放器
    ├── state-machine.js   # 动画状态 + 状态转换
    ├── event-handler.js   # CLI 事件 → 宠物状态 + 气泡消息
    ├── speech-bubble.js   # 宠物头顶浮动文字气泡
    └── permission-popup.js # 权限授权弹窗 UI
```

## 事件映射

| CLI 事件 | 宠物状态 | 气泡消息 |
|----------|----------|----------|
| `session.status: busy` | 奔跑 | "Working on it" |
| `session.status: idle` | 挥手 | "Done!" |
| `session.status: retry` | 失败 | "Needs attention" |
| `session.thinking` | 审查 | "Reviewing..." |
| `permission.asked` | 等待 | "Permission needed!" |
| `permission.replied` | 奔跑 | — |
| `tool: edit/write` | 奔跑 | "Editing file..." |
| `tool: grep/glob` | 奔跑 | "Searching..." |
| `tool: bash/shell` | 奔跑 | "Running command..." |
| `tool: fetch/websearch` | 奔跑 | "Browsing web..." |
| `tool: task` | 奔跑 | "Delegating..." |
| 5 分钟无事件 | 待机（睡眠） | — |

## 开发

```bash
bun install
npm run build        # 打包到 dist/
npm run typecheck    # tsc --noEmit
```

插件基于 `@opencode-ai/plugin` SDK。Electron 进程作为 CLI 进程的子进程启动，通过 Node IPC 通信。事件流向：

```
CLI → 插件 (index.ts) → IPC → Electron 主进程 → webContents → 渲染器
```

权限回复流向：

```
渲染器 → IPC → Electron 主进程 → IPC → 插件 → HTTP POST 到 CLI API
```

## 许可证

MIT
