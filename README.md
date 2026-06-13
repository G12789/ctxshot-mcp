# ctxshot-mcp

[![CI](https://github.com/G12789/ctxshot-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/G12789/ctxshot-mcp/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/ctxshot-mcp?color=cb3837&logo=npm)](https://www.npmjs.com/package/ctxshot-mcp)

[![MCP](https://img.shields.io/badge/MCP-stdio-7c3aed)](https://modelcontextprotocol.io)

> **轻量项目简报 MCP** — 每日开会话用，不是 Repomix 全库打包。  
> Tools: `pack_context` · `session_brief` · `context_stats`

## Cursor 配置

```json
{
  "mcpServers": {
    "ctxshot": {
      "command": "npx",
      "args": ["-y", "ctxshot-mcp@latest"]
    }
  }
}
```

## Claude Code

```bash
claude mcp add ctxshot -- npx -y ctxshot-mcp@latest
```

## Tools

| Tool | 何时用 |
|---|---|
| `session_brief` | **每天**新会话 — 写 `.ai/context.md` + 返回简报 |
| `pack_context` | 需要项目全貌但不要全库文件 |
| `context_stats` | 只看 token 估算，不拉全文 |

## vs Repomix

| | ctxshot-mcp | Repomix |
|---|---|---|
| Token | ~200–2k | 可达 100k+ |
| 速度 | <1s | 大仓库慢 |
| 场景 | **每日开会话** | 全库 refactor |

## 开发

```bash
cd ctxshot && npm run build
cd ../ctxshot-mcp && npm install && npm run build
npm run inspect   # MCP Inspector
```

## License

MIT · [ctxshot CLI](https://github.com/G12789/ctxshot) · [GitHub](https://github.com/G12789/ctxshot-mcp)
