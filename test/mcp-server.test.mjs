import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { InMemoryTransport, LATEST_PROTOCOL_VERSION } from '@modelcontextprotocol/server';

import { LocalWorkService } from '../src/local-work-service.mjs';
import { createInfraMcpServer } from '../src/mcp-server.mjs';

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'infra-mcp-server-'));
const service = new LocalWorkService({ logPath: path.join(root, 'events.jsonl') });
const server = createInfraMcpServer({ service });
const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
const responses = new Map();
const waiters = new Map();

clientTransport.onmessage = message => {
  if (!('id' in message)) return;
  responses.set(message.id, message);
  const resolve = waiters.get(message.id);
  if (resolve) {
    waiters.delete(message.id);
    resolve(message);
  }
};

function waitFor(id) {
  if (responses.has(id)) return Promise.resolve(responses.get(id));
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(`Timed out waiting for MCP response ${id}`)), 3000);
    waiters.set(id, message => {
      clearTimeout(timeout);
      resolve(message);
    });
  });
}

await clientTransport.start();
await server.connect(serverTransport);

await clientTransport.send({
  jsonrpc: '2.0',
  id: 1,
  method: 'initialize',
  params: {
    protocolVersion: LATEST_PROTOCOL_VERSION,
    capabilities: {},
    clientInfo: { name: 'infra-test-client', version: '1.0.0' }
  }
});
let response = await waitFor(1);
assert.equal(response.result.serverInfo.name, 'infra');
await clientTransport.send({ jsonrpc: '2.0', method: 'notifications/initialized' });

await clientTransport.send({ jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} });
response = await waitFor(2);
assert.deepEqual(response.result.tools.map(tool => tool.name), [
  'infra_begin_work',
  'infra_checkpoint',
  'infra_resume_work'
]);
assert.equal(response.result.tools[2].title, 'Infra Relay');
assert.equal(response.result.tools[2]._meta['infra/activity/active'], 'Preparing Infra Relay');

await clientTransport.send({
  jsonrpc: '2.0',
  id: 3,
  method: 'tools/call',
  params: {
    name: 'infra_begin_work',
    arguments: {
      work_id: 'mcp-001',
      goal: 'Preserve work through MCP',
      next_action: 'set a mark'
    }
  }
});
response = await waitFor(3);
assert.equal(response.result.isError, undefined);
assert.equal(response.result.structuredContent.state.work_id, 'mcp-001');

await server.close();
await clientTransport.close();
console.log('PASS official MCP transport discovery, metadata, and tool invocation');
