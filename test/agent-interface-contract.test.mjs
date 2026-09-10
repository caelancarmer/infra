import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  AgentCapabilityUnavailableError,
  LOCAL_AGENT_TOOL_NAMES,
  agentInterfaceDefinitions,
  createAgentInterface
} from '../src/agent-interface-contract.mjs';
import { LocalWorkService } from '../src/local-work-service.mjs';

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'infra-agent-interface-'));
const service = new LocalWorkService({ logPath: path.join(root, 'events.jsonl') });
const agentInterface = createAgentInterface({ service });

assert.equal(agentInterfaceDefinitions().length, 6);
assert.deepEqual(agentInterface.definitions({ availableOnly: true }).map(tool => tool.name), [...LOCAL_AGENT_TOOL_NAMES]);
assert.equal(agentInterface.catalog().length, 6);
assert.equal(agentInterface.catalog().filter(tool => tool.available).length, 3);
assert.equal(agentInterface.catalog().find(tool => tool.name === 'infra_preflight_effect').available, false);

const managedInterface = createAgentInterface({
  service,
  managedHandlers: {
    infra_preflight_effect: input => ({ allowed: true, effect_id: input.effect_id }),
    infra_record_effect: input => ({ recorded: true, effect_id: input.effect_id }),
    infra_complete_work: input => ({ sealed: true, outcome: input.outcome })
  }
});
assert.equal(managedInterface.definitions({ availableOnly: true }).length, 6);

let result = await agentInterface.invoke('infra_begin_work', {
  work_id: 'agent-interface-001',
  goal: 'Continue a release across agents',
  next_action: 'inspect release plan',
  constraints: ['do not repeat completed effects']
});
assert.equal(result.state.revision, 0);

result = await agentInterface.invoke('infra_checkpoint', {
  work_id: 'agent-interface-001',
  expected_revision: 0,
  idempotency_key: 'agent-interface-mark-001',
  reason: 'planned relay',
  patch: {
    completed: ['release plan inspected'],
    remaining: ['run verifier'],
    next_action: 'run verifier'
  }
});
assert.equal(result.state.revision, 1);

result = await agentInterface.invoke('infra_resume_work', {
  work_id: 'agent-interface-001',
  target_agent: 'claude-code'
});
assert.equal(result.target_agent, 'claude-code');
assert.equal(result.next_action, 'run verifier');

await assert.rejects(
  () => agentInterface.invoke('infra_preflight_effect', {
    work_id: 'agent-interface-001',
    effect_id: 'deploy-001',
    effect_type: 'deployment',
    idempotency_key: 'deploy-001'
  }),
  error => error instanceof AgentCapabilityUnavailableError && error.statusCode === 501
);
await assert.rejects(
  () => agentInterface.invoke('infra_resume_work', { work_id: '' }),
  error => error.code === 'invalid-tool-input'
);

console.log('PASS six-tool agent interface contract and public capability boundary');
