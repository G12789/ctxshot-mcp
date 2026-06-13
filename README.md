# ctxshot-mcp

[![CI](https://github.com/G12789/ctxshot-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/G12789/ctxshot-mcp/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/ctxshot-mcp?color=cb3837&logo=npm)](https://www.npmjs.com/package/ctxshot-mcp)
[![MCP](https://img.shields.io/badge/MCP-stdio-7c3aed)](https://modelcontextprotocol.io)
[![node](https://img.shields.io/badge/node-%3E%3D18-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![license](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

> **给 Cursor / Claude Code 的轻量项目简报 MCP。**
> 每天开会话 ~400 token 交代项目结构，不是 Repomix 全库打包。
>
> Tools: `session_brief` · `pack_context` · `context_stats`

[ctxshot](https://github.com/G12789/ctxshot) 的 MCP 封装。让 Agent **原生调用**打包逻辑，自动写 `.ai/context.md`，不用你每次手动 `npx ctxshot`。

---

## 解决什么问题

| 场景 | 笨办法 | ctxshot-mcp |
|---|---|---|
| 每天新开会话 | 反复贴 README、glob 目录 | Agent 调 `session_brief` → `@.ai/context.md` |
| 想知道简报多大 | 跑完再看 | `context_stats` 先看 token 估算 |
| 临时要结构 | 复制终端输出 | `pack_context` 直接返回 Markdown |
| 要读全库 | Repomix 一把梭 | **仍用 Repomix**，本 MCP 不替代 |

---

## 实测（同仓库 benchmark）

基于 [ctxshot](https://github.com/G12789/ctxshot) 自身仓库：

| 工具 | 耗时 | 估 token |
|---|---:|---:|
| ctxshot / session_brief | **356ms** | **423** |
| README 手贴 | <1ms | 685 |
| repomix --stdout | **3.6s** | **7,023** |

<p align="center">
  <img src="https://raw.githubusercontent.com/G12789/ctxshot/main/docs/benchmark-chart.svg" alt="ctxshot vs Repomix" width="860" />
</p>

---

## 30 秒接入

### Cursor

`~/.cursor/mcp.json` 或项目 `.cursor/mcp.json`：

```json
{
  "mcpServers": {
    "ctxshot": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "ctxshot-mcp@latest"]
    }
  }
}
```

**Developer: Reload Window** 后，Settings → **Tools & MCPs** 看到绿色 `ctxshot` 即成功。

### Claude Code

```bash
claude mcp add ctxshot -- npx -y ctxshot-mcp@latest
```

### 验证

```bash
npx ctxshot-mcp   # stdio server（由 IDE 拉起，勿手动交互）
```

或在项目里：

```bash
git clone https://github.com/G12789/ctxshot-mcp
cd ctxshot-mcp && npm install
npm run test:mcp
```

---

## MCP Tools 完整说明

### `session_brief`（推荐：每日起手）

打包 compact + diff 简报，写入 `.ai/context.md`，并返回全文。

| 参数 | 类型 | 说明 |
|---|---|---|
| `root` | string? | 项目根目录（默认：server cwd） |
| `out` | string? | 输出路径，相对 root（默认 `.ai/context.md`） |

**典型用法：** 新会话开头让 Agent 调用，然后 `@.ai/context.md`。

---

### `pack_context`

返回 Markdown 简报，不写文件。

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| `compact` | boolean? | `true` | 浅树 + 截断 README |
| `diff` | boolean? | `false` | 包含 git 摘要 |
| `depth` | number? | compact=2 | 目录树深度 (1–6) |
| `maxEntries` | number? | compact=50 | 最多树节点 (10–500) |
| `root` | string? | cwd | 项目根目录 |

---

### `context_stats`

只返回 JSON 统计，不拉全文。适合对比 token 成本。

| 参数 | 类型 | 说明 |
|---|---|---|
| `compact` | boolean? | 同 pack_context |
| `diff` | boolean? | 同 pack_context |
| `root` | string? | 项目根目录 |

返回示例：

```json
{
  "estimatedTokens": 423,
  "lineCount": 76,
  "treeLineCount": 22,
  "compact": true,
  "hasGit": true,
  "manifestCount": 1,
  "root": "/your/project",
  "hint": "Use pack_context for full brief; Repomix for entire codebase."
}
```

---

## 推荐工作流

```
┌─────────────────────────────────────────────────────┐
│  1. 打开项目（或传 root 参数）                        │
│  2. 新会话 → Agent 调用 session_brief                │
│  3. 生成 .ai/context.md + ledger-events.jsonl      │
│  4. 对话 @.ai/context.md                             │
│  5. 读具体实现 → @文件 或 Repomix                    │
└─────────────────────────────────────────────────────┘
```

`.ai/ledger-events.jsonl` 记录每次调用的 token 估算，为后续 token 账本功能预埋。

---

## 架构

```
Cursor / Claude Code
        │  stdio MCP
        ▼
ctxshot-mcp (本仓库)
  ├── index.ts   stdio 入口
  └── server.ts  注册 3 个 Tool
        │
        ▼
ctxshot/core (npm 依赖)
  packContext() — 与 CLI 共用同一套逻辑
        │
        ▼
.ai/context.md
.ai/ledger-events.jsonl
```

与 CLI 的关系：

| | [ctxshot](https://github.com/G12789/ctxshot) CLI | ctxshot-mcp |
|---|---|---|
| 调用方 | 人 / 脚本 | Agent / IDE |
| 传输 | 终端 | MCP stdio |
| 核心 | `packContext()` | 同左 |
| 输出 | stdout 或 `-o` 文件 | Tool 返回 + `session_brief` 写文件 |

---

## 和 Repomix 怎么选

| | ctxshot-mcp | Repomix |
|---|---|---|
| Token | ~200–2k | 可达 100k+ |
| 速度 | <1s | 大仓库慢 |
| 内容 | 树 + 脚本 + 摘要 | 全文件内容 |
| 场景 | **每日开会话** | 全库 refactor / 审计 |
| 关系 | **互补** | 互补 |

---

## 常见问题

**Q: MCP 绿灯但扫错目录？**  
全局 MCP 的 cwd 可能是用户主目录。解法：
- 把目标项目作为 Cursor 工作区根目录打开
- 或调用时传 `root`: `"/path/to/your/project"`

**Q: 和 CLI 有什么区别？**  
逻辑完全一样（共用 `ctxshot/core`）。MCP 让 Agent 在会话里自动调用，不用你记命令。

**Q: 能替代 Repomix 吗？**  
不能。简报 ≠ 全库。需要 AI 读每一行代码时请用 Repomix。

**Q: 离线能用吗？**  
能。纯本地扫描，不联网，不上传任何内容。

---

## 开发

```bash
git clone https://github.com/G12789/ctxshot-mcp
cd ctxshot-mcp && npm install
npm run build
npm run test:smoke    # 单元 smoke
npm run test:mcp      # MCP 客户端端到端
npm run inspect       # MCP Inspector
```

依赖 [ctxshot@0.2.1+](https://www.npmjs.com/package/ctxshot) 的 `ctxshot/core` 导出。

---

## 相关项目

| 项目 | 链接 |
|---|---|
| ctxshot CLI | https://github.com/G12789/ctxshot |
| evaldrift | https://github.com/G12789/evaldrift |
| mcp-quickstart | https://github.com/G12789/mcp-quickstart |
| ship-skills | https://www.npmjs.com/package/ship-skills |

---

## License

MIT · [ctxshot CLI](https://github.com/G12789/ctxshot) · [npm](https://www.npmjs.com/package/ctxshot-mcp)
