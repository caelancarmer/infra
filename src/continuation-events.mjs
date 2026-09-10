import crypto from 'node:crypto';

const EVENT_TYPE_MAP = new Map([
  ['SessionStart', 'session_started'],
  ['SessionEnd', 'session_stopped'],
  ['PostToolUse', 'tool_completed'],
  ['PostToolUseFailure', 'tool_failed'],
  ['SubagentStart', 'agent_started'],
  ['SubagentStop', 'agent_stopped'],
  ['PreCompact', 'context_compaction_started'],
  ['PostCompact', 'context_compaction_completed'],
  ['Stop', 'session_stopped']
]);

const KNOWN_TYPES = new Set([
  'session_started', 'session_stopped', 'tool_started', 'tool_completed', 'tool_failed',
  'agent_started', 'agent_stopped', 'decision_recorded', 'artifact_created',
  'verification_passed', 'verification_failed', 'human_approval', 'checkpoint',
  'resume', 'work_completed', 'continuation_metered', 'context_compaction_started', 'context_compaction_completed',
  'work_linked', 'context_promoted', 'decision_capsule_recorded', 'route_outcome_recorded',
  'memory_distilled', 'context_refined', 'effect_reconciled', 'governance_decision_recorded'
]);

function compact(value, maxLength = 4000) {
  if (typeof value === 'string') return value.length > maxLength ? value.slice(0, maxLength) + '…' : value;
  if (Array.isArray(value)) return value.slice(0, 100).map(item => compact(item, 1000));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).slice(0, 100).map(([key, item]) => [key, compact(item, key.includes('output') || key.includes('response') ? maxLength : 1500)]));
  }
  return value;
}

function deterministicEventId(input) {
  return 'evt_' + crypto.createHash('sha256').update(JSON.stringify({
    work_id: input.work_id,
    type: input.type,
    session_id: input.session_id,
    sequence: input.sequence,
    timestamp: input.timestamp,
    payload: input.payload
  })).digest('hex').slice(0, 24);
}

export function normalizeAgentEvent(input = {}) {
  const rawType = input.type || input.event_type || input.hook_event_name || 'unknown';
  const type = EVENT_TYPE_MAP.get(rawType) || rawType.toLowerCase().replaceAll('-', '_');
  if (!KNOWN_TYPES.has(type)) throw new Error('Unsupported continuation event type: ' + rawType);
  const payload = input.payload ?? {
    tool_name: input.tool_name,
    tool_input: input.tool_input,
    tool_response: input.tool_response ?? input.tool_output,
    error: input.error,
    step: input.step,
    artifact: input.artifact,
    decision: input.decision,
    evidence: input.evidence
  };
  return {
    schema_version: 1,
    event_id: input.event_id || deterministicEventId({ ...input, type, payload }),
    work_id: input.work_id,
    tenant_id: input.tenant_id,
    actor_user_id: input.actor_user_id,
    agent_id: input.agent_id || input.agent,
    session_id: input.session_id,
    sequence: Number.isInteger(input.sequence) ? input.sequence : undefined,
    type,
    source: input.source || 'agent-adapter',
    timestamp: input.timestamp || new Date().toISOString(),
    idempotency_key: input.idempotency_key || null,
    payload: compact(payload)
  };
}

export function captureAgentEvent(store, input) {
  const event = normalizeAgentEvent(input);
  const existing = store.events(event.work_id).find(record => record.event_id === event.event_id || (event.idempotency_key && record.idempotency_key === event.idempotency_key));
  if (existing) return { record: existing, duplicate: true };
  if (event.sequence === undefined) {
    const prior = store.events(event.work_id);
    event.sequence = prior.reduce((max, item) => Math.max(max, Number(item.sequence) || 0), 0) + 1;
  }
  return { record: store.append(event), duplicate: false };
}

export function supportedContinuationEventTypes() {
  return [...KNOWN_TYPES].sort();
}

