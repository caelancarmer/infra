// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Caelan Carmer

import { McpServer } from '@modelcontextprotocol/server';

import { createAgentInterface } from './agent-interface-contract.mjs';

export const INFRA_MCP_SERVER_VERSION = '0.1.0-alpha.1';

function toolResult(result) {
  return {
    content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    structuredContent: result
  };
}

function toolError(error) {
  return {
    isError: true,
    content: [{ type: 'text', text: JSON.stringify({ error: error.code || 'tool-error', message: error.message }, null, 2) }]
  };
}

export function createInfraMcpServer({ service, managedHandlers = {}, agentInterface } = {}) {
  const interfaceContract = agentInterface || createAgentInterface({ service, managedHandlers });
  const server = new McpServer(
    { name: 'infra', version: INFRA_MCP_SERVER_VERSION },
    { instructions: 'Use Infra Work, Mark, and Relay to preserve verifiable autonomous-work continuity. Material effects require managed Gate, Receipt, and Seal capabilities.' }
  );

  for (const definition of interfaceContract.definitions({ availableOnly: true })) {
    server.registerTool(
      definition.name,
      {
        title: definition.title,
        description: definition.purpose,
        inputSchema: definition.inputSchema,
        annotations: definition.annotations,
        _meta: {
          'infra/concept': definition.concept,
          'infra/activity/active': definition.activity.active,
          'infra/activity/completed': definition.activity.completed,
          'infra/contract-version': '1.0.0'
        }
      },
      async input => {
        try {
          return toolResult(await interfaceContract.invoke(definition.name, input));
        } catch (error) {
          return toolError(error);
        }
      }
    );
  }

  return server;
}
