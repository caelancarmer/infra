import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { createLocalHttpServer, startLocalHttpServer } from '../src/local-http-api.mjs';

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'infra-local-runtime-'));
const logPath = path.join(root, 'events.jsonl');

async function openRuntime() {
  const runtime = createLocalHttpServer({ logPath });
  await new Promise(resolve => runtime.server.listen(0, '127.0.0.1', resolve));
  const baseUrl = `http://127.0.0.1:${runtime.server.address().port}`;
  return { ...runtime, baseUrl };
}

async function close(server) {
  await new Promise(resolve => server.close(resolve));
}

async function request(baseUrl, pathname, options = {}) {
  const response = await fetch(baseUrl + pathname, {
    ...options,
    headers: options.body ? { 'content-type': 'application/json', ...options.headers } : options.headers
  });
  return { status: response.status, body: await response.json() };
}

assert.throws(
  () => createLocalHttpServer({ logPath, host: '0.0.0.0' }),
  /loopback host/
);
await assert.rejects(
  () => startLocalHttpServer({ logPath, port: 70000 }),
  /port must be an integer/
);

let runtime = await openRuntime();
let result = await request(runtime.baseUrl, '/health');
assert.equal(result.status, 200);
assert.equal(result.body.ok, true);

result = await request(runtime.baseUrl, '/v1/tools');
assert.equal(result.status, 200);
assert.equal(result.body.tools.length, 6);
assert.equal(result.body.tools.filter(tool => tool.available).length, 3);

result = await request(runtime.baseUrl, '/v1/tools/infra_begin_work', {
  method: 'POST',
  body: JSON.stringify({
    work_id: 'tool-http-001',
    goal: 'Invoke Infra from a workflow host',
    next_action: 'prepare a relay'
  })
});
assert.equal(result.status, 200);
assert.equal(result.body.state.work_id, 'tool-http-001');

result = await request(runtime.baseUrl, '/v1/tools/infra_preflight_effect', {
  method: 'POST',
  body: JSON.stringify({
    work_id: 'tool-http-001',
    effect_id: 'effect-001',
    effect_type: 'deployment',
    idempotency_key: 'effect-001'
  })
});
assert.equal(result.status, 501);
assert.equal(result.body.error, 'capability-unavailable');

result = await request(runtime.baseUrl, '/v1/work', {
  method: 'POST',
  body: JSON.stringify({
    work_id: 'runtime-001',
    goal: 'Resume a verified release after interruption',
    next_action: 'inspect the release plan',
    constraints: ['do not repeat completed effects']
  })
});
assert.equal(result.status, 201);
assert.equal(result.body.state.revision, 0);

result = await request(runtime.baseUrl, '/v1/work/runtime-001/checkpoint', {
  method: 'POST',
  body: JSON.stringify({
    expected_revision: 0,
    idempotency_key: 'checkpoint-001',
    reason: 'agent A interrupted',
    patch: {
      completed: ['release plan inspected'],
      decisions: ['use staged release'],
      evidence: ['plan checksum verified'],
      remaining: ['run verifier'],
      next_action: 'run verifier'
    }
  })
});
assert.equal(result.status, 200);
assert.equal(result.body.state.revision, 1);
assert.equal(result.body.duplicate, false);

result = await request(runtime.baseUrl, '/v1/work/runtime-001/checkpoint', {
  method: 'POST',
  body: JSON.stringify({
    expected_revision: 0,
    idempotency_key: 'checkpoint-001',
    patch: { next_action: 'must not replace the first checkpoint' }
  })
});
assert.equal(result.status, 200);
assert.equal(result.body.duplicate, true);
assert.equal(result.body.state.next_action, 'run verifier');

result = await request(runtime.baseUrl, '/v1/work/runtime-001/events', {
  method: 'POST',
  body: JSON.stringify({
    event_id: 'tool-event-001',
    type: 'tool_completed',
    tool_name: 'prepare_release',
    payload: { output: 'release prepared' }
  })
});
assert.equal(result.status, 202);
assert.equal(result.body.duplicate, false);

result = await request(runtime.baseUrl, '/v1/work/runtime-001/resume-package?agent=claude-code');
assert.equal(result.status, 200);
assert.equal(result.body.target_agent, 'claude-code');
assert.equal(result.body.next_action, 'run verifier');
assert.match(result.body.handoff_text, /Do not repeat completed work/);

result = await request(runtime.baseUrl, '/v1/work/runtime-001/history');
assert.equal(result.status, 200);
assert.equal(result.body.verification.verified, true);

result = await request(runtime.baseUrl, '/v1/work/runtime-001/export');
assert.equal(result.status, 200);
assert.equal(result.body.work_id, 'runtime-001');
assert.equal(result.body.verification.verified, true);

await close(runtime.server);
runtime = await openRuntime();
result = await request(runtime.baseUrl, '/v1/work/runtime-001');
assert.equal(result.status, 200);
assert.equal(result.body.next_action, 'run verifier');

result = await request(runtime.baseUrl, '/v1/work/runtime-001', { method: 'DELETE' });
assert.equal(result.status, 200);
assert.equal(result.body.deleted, true);
result = await request(runtime.baseUrl, '/v1/work/runtime-001');
assert.equal(result.status, 404);

await close(runtime.server);
console.log('PASS self-contained local runtime create/checkpoint/resume/history/export/delete/restart');

