import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { createWorkState, updateWorkState, validateWorkState } from '../src/work-state.mjs';
import { WorkStateStore } from '../src/work-state-store.mjs';
import { normalizeAgentEvent, captureAgentEvent } from '../src/continuation-events.mjs';
import { compileContinuation } from '../src/continuation-compiler.mjs';
import { buildResumePackage } from '../src/resume-package.mjs';
import { normalizeAdapterEvent, resumeEnvelope } from '../src/agent-adapters.mjs';
import {
  buildPortableResumeEnvelope,
  builtInPortableAdapterDefinitions,
  validatePortableAdapterDefinition
} from '../src/portable-adapter-contract.mjs';

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'infra-public-core-'));
const store = new WorkStateStore(path.join(root, 'events.jsonl'));
const workId = 'public-core-001';

let state = createWorkState({
  work_id: workId,
  goal: 'Continue verified work across agent runtimes',
  completed: ['requirements inspected'],
  artifacts: [{ artifact_id: 'plan', relative_path: 'plan.md', sha256: 'abc123', sha256_verified: true }],
  decisions: ['use staged verification'],
  failures: [],
  evidence: ['requirements approved'],
  remaining: ['run verifier'],
  next_action: 'run verifier',
  constraints: ['do not repeat completed effects']
});

assert.equal(validateWorkState(state).valid, true);
store.append({ type: 'work_started', work_id: workId, state });

const event = normalizeAgentEvent({
  work_id: workId,
  type: 'tool_completed',
  event_id: 'effect-001',
  tool_name: 'prepare_release',
  payload: { output: 'prepared' }
});
assert.equal(captureAgentEvent(store, event).duplicate, false);
assert.equal(captureAgentEvent(store, event).duplicate, true);

state = updateWorkState(state, {
  completed: [...state.completed, 'release prepared'],
  remaining: ['run verifier'],
  next_action: 'run verifier'
});
store.checkpoint(state, 'agent A interrupted after preparation');

const compiled = compileContinuation(store.events(workId));
const resumePackage = buildResumePackage(compiled, { targetAgent: 'claude-code' });
assert.equal(resumePackage.next_action, 'run verifier');
assert.match(resumePackage.handoff_text, /Do not repeat completed work/);

const claudeEnvelope = resumeEnvelope('claude-code', resumePackage);
assert.ok(claudeEnvelope);
assert.equal(normalizeAdapterEvent('n8n', { type: 'nodeExecuted', work_id: workId }).type, 'tool_completed');

const portableProduct = {
  ...resumePackage,
  selected_context: resumePackage.handoff_text,
  provenance: { history_head_hash: compiled.history_head_hash || null }
};
for (const definition of builtInPortableAdapterDefinitions()) {
  assert.equal(validatePortableAdapterDefinition(definition).valid, true);
  assert.ok(buildPortableResumeEnvelope(definition, portableProduct));
}

console.log('PASS public-safe continuation core contract');

