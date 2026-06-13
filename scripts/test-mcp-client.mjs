/**
 * End-to-end MCP client test (same transport Cursor uses).
 * Usage: node scripts/test-mcp-client.mjs [project-root]
 */
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const projectRoot = resolve(
  process.argv[2] ?? join(import.meta.dirname, "..", "..", "ctxshot"),
);
const contextFile = join(projectRoot, ".ai", "context.md");

const transport = new StdioClientTransport({
  command: "npx",
  args: ["-y", "ctxshot-mcp@latest"],
  cwd: projectRoot,
});

const client = new Client({ name: "ctxshot-test", version: "1.0.0" });

try {
  await client.connect(transport);

  const { tools } = await client.listTools();
  const names = tools.map((t) => t.name).sort();
  console.log("✓ listTools:", names.join(", "));
  const expected = ["context_stats", "pack_context", "session_brief"];
  for (const n of expected) {
    if (!names.includes(n)) throw new Error(`missing tool: ${n}`);
  }

  const stats = await client.callTool({
    name: "context_stats",
    arguments: { compact: true, diff: false },
  });
  const statsText = stats.content?.[0]?.text ?? "";
  if (!statsText.includes("estimatedTokens")) {
    throw new Error("context_stats bad response");
  }
  console.log("✓ context_stats:", statsText.split("\n")[1] ?? statsText.slice(0, 80));

  const packed = await client.callTool({
    name: "pack_context",
    arguments: { compact: true, diff: false },
  });
  const packText = packed.content?.[0]?.text ?? "";
  if (!packText.includes("Project context")) {
    throw new Error("pack_context bad response");
  }
  console.log("✓ pack_context:", `~${Math.round(packText.length / 4)} tokens`);

  await client.callTool({
    name: "session_brief",
    arguments: {},
  });
  if (!existsSync(contextFile)) {
    throw new Error(`session_brief did not create ${contextFile}`);
  }
  const ctx = readFileSync(contextFile, "utf8");
  console.log("✓ session_brief wrote", contextFile);
  console.log("  lines:", ctx.split("\n").length, "tokens~", Math.round(ctx.length / 4));

  const ledger = join(projectRoot, ".ai", "ledger-events.jsonl");
  if (existsSync(ledger)) {
    console.log("✓ ledger-events.jsonl created (for token-ledger B)");
  }

  console.log("\nMCP client test PASSED");
} finally {
  await transport.close?.();
  try {
    await client.close();
  } catch {
    /* ignore */
  }
}
