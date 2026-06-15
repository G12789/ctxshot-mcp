import { appendFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { packContext, type ContextStats } from "ctxshot/core";
import { z } from "zod";

const VERSION = "0.1.0";
const DEFAULT_OUT = ".ai/context.md";
const LEDGER_PATH = ".ai/ledger-events.jsonl";

function recordLedger(
  root: string,
  tool: string,
  stats: ContextStats,
): void {
  try {
    const ledger = join(root, LEDGER_PATH);
    mkdirSync(dirname(ledger), { recursive: true });
    const row = JSON.stringify({
      ts: new Date().toISOString(),
      tool,
      estimatedTokens: stats.estimatedTokens,
      compact: stats.compact,
      source: "ctxshot-mcp",
    });
    appendFileSync(ledger, row + "\n", "utf8");
  } catch {
    /* ledger optional */
  }
}

export function registerCtxshotTools(server: McpServer, cwd: string): void {
  const packSchema = {
    compact: z
      .boolean()
      .optional()
      .describe("Shorter tree and truncated README (default true)"),
    diff: z
      .boolean()
      .optional()
      .describe("Include recent commits and uncommitted diff (default false)"),
    depth: z
      .number()
      .int()
      .min(1)
      .max(6)
      .optional()
      .describe("Directory tree depth"),
    maxEntries: z
      .number()
      .int()
      .min(10)
      .max(500)
      .optional()
      .describe("Max tree entries"),
    root: z
      .string()
      .optional()
      .describe("Project root path (default: server cwd)"),
  };

  server.registerTool(
    "pack_context",
    {
      title: "Pack project context",
      description:
        "Generate a lightweight markdown project brief (~200-2000 tokens): tree, npm scripts, README/AGENTS excerpt, optional git diff. Use at session start instead of reading the whole repo or running Repomix.",
      inputSchema: packSchema,
    },
    async (args) => {
      const root = resolve(args.root ?? cwd);
      const compact = args.compact ?? true;
      const result = packContext({
        root,
        compact,
        diff: args.diff ?? false,
        depth: args.depth,
        maxEntries: args.maxEntries,
      });
      recordLedger(root, "pack_context", result.stats);
      return {
        content: [
          {
            type: "text" as const,
            text: result.markdown,
          },
        ],
      };
    },
  );

  server.registerTool(
    "session_brief",
    {
      title: "Daily session brief",
      description:
        "Pack compact context with git diff and write to .ai/context.md in the project root. Call when starting a new AI coding session or switching tasks.",
      inputSchema: {
        root: z.string().optional().describe("Project root (default: server cwd)"),
        out: z
          .string()
          .optional()
          .describe("Output file relative to root (default .ai/context.md)"),
      },
    },
    async (args) => {
      const root = resolve(args.root ?? cwd);
      const outRel = args.out ?? DEFAULT_OUT;
      const result = packContext({ root, compact: true, diff: true });
      const outPath = join(root, outRel);
      mkdirSync(dirname(outPath), { recursive: true });
      writeFileSync(outPath, result.markdown, "utf8");
      recordLedger(root, "session_brief", result.stats);
      const summary = [
        `Wrote ${outRel} (${result.stats.lineCount} lines, ~${result.stats.estimatedTokens} tokens est.)`,
        `Root: ${root}`,
        "Tell the user they can @-reference this file in the next turns.",
      ].join("\n");
      return {
        content: [{ type: "text" as const, text: summary + "\n\n" + result.markdown }],
      };
    },
  );

  server.registerTool(
    "context_stats",
    {
      title: "Context pack statistics",
      description:
        "Estimate token cost of a context pack without returning full markdown. Useful before/after comparisons.",
      inputSchema: {
        compact: z.boolean().optional(),
        diff: z.boolean().optional(),
        root: z.string().optional(),
      },
    },
    async (args) => {
      const root = resolve(args.root ?? cwd);
      const result = packContext({
        root,
        compact: args.compact ?? true,
        diff: args.diff ?? false,
      });
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                ...result.stats,
                root,
                hint: "Use pack_context for full brief; Repomix for entire codebase.",
              },
              null,
              2,
            ),
          },
        ],
      };
    },
  );
}

export function createCtxshotMcpServer(cwd: string): McpServer {
  const server = new McpServer({
    name: "ctxshot-mcp",
    version: VERSION,
  });
  registerCtxshotTools(server, cwd);
  return server;
}
