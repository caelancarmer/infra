const REQUIRED = ['version', 'work_id', 'goal', 'status', 'completed', 'artifacts', 'decisions', 'failures', 'evidence', 'remaining', 'next_action', 'constraints'];

export function createWorkState(input = {}) {
  return {
    version: 1,
    revision: Number.isInteger(input.revision) ? input.revision : 0,
    work_id: input.work_id || 'work-' + Date.now(),
    tenant_id: input.tenant_id,
    external_work_id: input.external_work_id,
    goal: input.goal || '',
    status: input.status || 'in_progress',
    completed: input.completed || [],
    artifacts: input.artifacts || [],
    decisions: input.decisions || [],
    failures: input.failures || [],
    evidence: input.evidence || [],
    remaining: input.remaining || [],
    next_action: input.next_action || '',
    constraints: input.constraints || [],
    updated_at: new Date().toISOString()
  };
}

export function validateWorkState(state) {
  const errors = [];
  for (const key of REQUIRED) {
    if (!(key in state)) errors.push('missing:' + key);
  }
  if (!state.work_id) errors.push('empty:work_id');
  if (!state.goal) errors.push('empty:goal');
  if (!['in_progress', 'blocked', 'completed'].includes(state.status)) errors.push('invalid:status');
  if (state.status !== 'completed' && !state.next_action) errors.push('missing:next_action');
  for (const key of ['completed', 'artifacts', 'decisions', 'failures', 'evidence', 'remaining', 'constraints']) {
    if (!Array.isArray(state[key])) errors.push('not_array:' + key);
  }
  return { valid: errors.length === 0, errors };
}

export function updateWorkState(state, patch = {}) {
  const next = { ...state, ...patch, version: 1, revision: Number.isInteger(state.revision) ? state.revision + 1 : 1, updated_at: new Date().toISOString() };
  const result = validateWorkState(next);
  if (!result.valid) throw new Error('Invalid work-state: ' + result.errors.join(', '));
  return next;
}

export function stateContext(state) {
  const result = validateWorkState(state);
  if (!result.valid) throw new Error('Cannot build context: ' + result.errors.join(', '));
  return [
    'WORK_STATE_VERSION: ' + state.version,
    'WORK_STATE_REVISION: ' + (state.revision ?? 0),
    'WORK_ID: ' + state.work_id,
    'GOAL: ' + state.goal,
    'STATUS: ' + state.status,
    'COMPLETED: ' + JSON.stringify(state.completed),
    'ARTIFACTS: ' + JSON.stringify(state.artifacts),
    'DECISIONS: ' + JSON.stringify(state.decisions),
    'FAILURES: ' + JSON.stringify(state.failures),
    'EVIDENCE: ' + JSON.stringify(state.evidence),
    'REMAINING: ' + JSON.stringify(state.remaining),
    'NEXT_ACTION: ' + state.next_action,
    'CONSTRAINTS: ' + JSON.stringify(state.constraints)
  ].join('\n');
}

