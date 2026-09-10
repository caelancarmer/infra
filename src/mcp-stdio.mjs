// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Caelan Carmer

import { serveStdio } from '@modelcontextprotocol/server/stdio';

import { resolveLocalRuntimeOptions } from './local-config.mjs';
import { LocalWorkService } from './local-work-service.mjs';
import { createInfraMcpServer } from './mcp-server.mjs';

const { logPath } = resolveLocalRuntimeOptions();

serveStdio(() => createInfraMcpServer({
  service: new LocalWorkService({ logPath })
}));

console.error(`Infra MCP ready; local data: ${logPath}`);
