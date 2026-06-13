#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createCtxshotMcpServer } from "./server.js";

const cwd = process.cwd();
const server = createCtxshotMcpServer(cwd);
const transport = new StdioServerTransport();
await server.connect(transport);
