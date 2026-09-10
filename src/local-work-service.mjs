import fs from 'node:fs';
import path from 'node:path';

import { verifyHistoryChain } from './canonical-history.mjs';
import { compileContinuation } from './continuation-compiler.mjs';
import { captureAgentEvent } from './continuation-events.mjs';
import { buildResumePackage } from './resume-package.mjs';
import { createWorkState, updateWorkState, validateWorkState } from './work-state.mjs';
import { WorkStateStore } from './work-state-store.mjs';

export class LocalRuntimeError extends Error {
  constructor(message, statusCode = 400, code = 'invalid-request') {
    super(message);
    this.name = 'LocalRuntimeError';
    this.statusCode = statusCode;
    this.code = code;
  }
}
function requiredText(value, field) {
  const text = String(value || '').trim();
  if (!text) throw new LocalRuntimeError(`${field} is required`, 400, `missing-${field}`);
  return text;
}

function validateWorkId(workId) {
  const value = requiredText(workId, 'work_id');
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$/.test(value)) {
    throw new LocalRuntimeError('work_id must contain only letters, numbers, dot, underscore, or hyphen', 400, 'invalid-work-id');
  }
  return value;
}

function requireState(store, workId) {
  const state = store.load(workId);
  if (!state) throw new LocalRuntimeError(`Work not found: ${workId}`, 404, 'work-not-found');
  return state;
}

export class LocalWorkService {
  constructor({ logPath }) {
    this.store = new WorkStateStore(logPath);
  }

  create(input = {}) {
    const workId = validateWorkId(input.work_id);
    if (this.store.load(workId)) throw new LocalRuntimeError(`Work already exists: ${workId}`, 409, 'work-already-exists');
    const state = createWorkState({
      ...input,
      work_id: workId,
      goal: requiredText(input.goal, 'goal'),
      next_action: requiredText(input.next_action || 'start work', 'next_action')
    });
    const validation = validateWorkState(state);
    if (!validation.valid) throw new LocalRuntimeError(`Invalid work-state: ${validation.errors.join(', ')}`);
    const event = this.store.append({ type: 'work_started', work_id: workId, state });
    return { state, event };
  }

  get(workId) {
    return requireState(this.store, validateWorkId(workId));
  }

  checkpoint(workId, input = {}) {
    const id = validateWorkId(workId);
    const current = requireState(this.store, id);
    const idempotencyKey = input.idempotency_key || null;
    const existing = this.store.findIdempotency(id, idempotencyKey);
    if (existing) return { state: existing.state || current, event: existing, duplicate: true };
    if (input.expected_revision !== undefined && Number(input.expected_revision) !== Number(current.revision)) {
      throw new LocalRuntimeError(
        `Revision mismatch: expected ${input.expected_revision}, current ${current.revision}`,
        409,
        'revision-mismatch'
      );
    }
    const state = updateWorkState(current, input.patch || {});
    const event = this.store.checkpoint(state, input.reason || 'checkpoint', {
      idempotency_key: idempotencyKey,
      expected_revision: input.expected_revision ?? null
    });
    return { state, event, duplicate: false };
  }

  captureEvent(workId, input = {}) {
    const id = validateWorkId(workId);
    requireState(this.store, id);
    return captureAgentEvent(this.store, { ...input, work_id: id });
  }

  resumePackage(workId, options = {}) {
    const id = validateWorkId(workId);
    const events = this.store.events(id);
    if (!events.length) throw new LocalRuntimeError(`Work not found: ${id}`, 404, 'work-not-found');
    const compiled = compileContinuation(events, options);
    return buildResumePackage(compiled, {
      targetAgent: options.target_agent || options.targetAgent || 'generic',
      targetModel: options.target_model || options.targetModel || null
    });
  }

  history(workId) {
    const id = validateWorkId(workId);
    const events = this.store.events(id);
    if (!events.length) throw new LocalRuntimeError(`Work not found: ${id}`, 404, 'work-not-found');
    return { verification: verifyHistoryChain(events), events };
  }

  export(workId) {
    const id = validateWorkId(workId);
    const history = this.history(id);
    return {
      schema_version: 1,
      exported_at: new Date().toISOString(),
      work_id: id,
      state: requireState(this.store, id),
      ...history
    };
  }

  delete(workId) {
    const id = validateWorkId(workId);
    const allEvents = this.store.events();
    const retained = allEvents.filter(event => event.work_id !== id);
    const removed = allEvents.length - retained.length;
    if (!removed) throw new LocalRuntimeError(`Work not found: ${id}`, 404, 'work-not-found');
    const filePath = this.store.filePath;
    const temporaryPath = `${filePath}.${process.pid}.tmp`;
    const body = retained.map(event => JSON.stringify(event)).join('\n');
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(temporaryPath, body ? `${body}\n` : '', 'utf8');
    fs.renameSync(temporaryPath, filePath);
    return { deleted: true, work_id: id, removed_event_count: removed };
  }
}

