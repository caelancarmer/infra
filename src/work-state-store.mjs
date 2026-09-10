import fs from 'node:fs';
import path from 'node:path';
import { attachHistoryMetadata } from './canonical-history.mjs';

export class WorkStateStore {
  constructor(filePath) {
    this.filePath = path.resolve(filePath);
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
  }

  append(event) {
    const prior = this.events(event.work_id).at(-1) || null;
    const record = attachHistoryMetadata({ ...event, timestamp: event.timestamp || new Date().toISOString() }, prior);
    fs.appendFileSync(this.filePath, JSON.stringify(record) + '\n', 'utf8');
    return record;
  }

  events(workId) {
    if (!fs.existsSync(this.filePath)) return [];
    return fs.readFileSync(this.filePath, 'utf8')
      .split('\n')
      .filter(Boolean)
      .map(line => JSON.parse(line))
      .filter(event => !workId || event.work_id === workId);
  }

  checkpoint(state, reason = 'checkpoint', metadata = {}) {
    return this.append({
      type: 'checkpoint',
      work_id: state.work_id,
      reason,
      ...metadata,
      state
    });
  }

  findIdempotency(workId, idempotencyKey) {
    if (!idempotencyKey) return null;
    return [...this.events(workId)].reverse().find(event => event.idempotency_key === idempotencyKey) || null;
  }

  findEvent(workId, eventId) {
    if (!eventId) return null;
    return this.events(workId).find(event => event.event_id === eventId) || null;
  }

  audit(workId) {
    return this.events(workId).map(event => ({
      type: event.type,
      work_id: event.work_id,
      timestamp: event.timestamp,
      reason: event.reason,
      revision: event.state?.revision ?? null,
      actor_user_id: event.actor_user_id || null,
      idempotency_key: event.idempotency_key || null,
      expected_revision: event.expected_revision ?? null,
      metrics: event.metrics || null,
      value_metrics: event.value_metrics || null,
      customer_value_ledger: event.customer_value_ledger || null,
      infra_cost_ledger: event.infra_cost_ledger || null,
      payload: event.payload || null,
      passed: event.passed ?? null
      ,history: event.history || null
    }));
  }

  toolCompleted(workId, tool, output, state) {
    return this.append({
      type: 'tool_completed',
      work_id: workId,
      tool,
      output,
      state
    });
  }

  verification(workId, passed, evidence, state) {
    return this.append({
      type: passed ? 'verification_passed' : 'verification_failed',
      work_id: workId,
      passed,
      evidence,
      state
    });
  }

  load(workId) {
    const records = this.events(workId);
    const latest = [...records].reverse().find(record => record.state);
    return latest?.state || null;
  }
}

