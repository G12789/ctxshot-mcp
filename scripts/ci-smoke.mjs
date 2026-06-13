import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const root = join(import.meta.dirname, "..");

function run(cmd, args, cwd) {
  const r = spawnSync(cmd, args, {
    cwd,
    encoding: "utf8",
    shell: process.platform === "win32",
  });
  if (r.status !== 0) {
    console.error(r.stdout, r.stderr);
    process.exit(1);
  }
}

run("npm", ["run", "build"], root);

const { createCtxshotMcpServer } = await import(
  pathToFileURL(join(root, "dist", "server.js")).href
);
const { packContext } = await import("ctxshot/core");

const tmp = mkdtempSync(join(tmpdir(), "ctxshot-mcp-"));
try {
  const result = packContext({ root: tmp, compact: true });
  if (!result.markdown.includes("Project context")) {
    throw new Error("packContext failed");
  }

  createCtxshotMcpServer(tmp);
  console.log("ctxshot-mcp smoke OK");
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
