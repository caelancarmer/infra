import { validateWorkState } from './work-state.mjs';

const normalize = value => String(value ?? '').trim().toLowerCase().replace(/\s+/g, ' ');

function decisionEntry(value) {
  const text = normalize(value);
  const index = text.indexOf('=');
  return index < 1 ? { key: text, value: null } : { key: text.slice(0, index).trim(), value: text.slice(index + 1).trim() };
}

export function inspectStateIntegrity(state, policy = {}) {
  const issues = validateWorkState(state).errors.map(detail => ({ type: 'structural', detail, critical: true }));
  const decisions = new Map();
  for (const raw of Array.isArray(state.decisions) ? state.decisions : []) {
    const entry = decisionEntry(raw);
    if (!entry.key || entry.value === null) continue;
    if (decisions.has(entry.key) && decisions.get(entry.key) !== entry.value) {
      issues.push({ type: 'decision-contradiction', key: entry.key, values: [decisions.get(entry.key), entry.value], critical: true });
    }
    decisions.set(entry.key, entry.value);
  }
  const artifactKeys = new Set();
  for (const artifact of Array.isArray(state.artifacts) ? state.artifacts : []) {
    const key = normalize(artifact?.artifact_id || artifact?.path || artifact);
    if (!key) continue;
    if (artifactKeys.has(key)) issues.push({ type: 'duplicate-artifact', artifact: key, critical: false });
    artifactKeys.add(key);
    if (policy.requireVerifiedArtifacts && typeof artifact === 'object' && artifact.verified !== true) {
      issues.push({ type: 'unverified-artifact', artifact: key, critical: true });
    }
  }
  const allText = normalize([state.goal, state.next_action, ...(state.completed || []), ...(state.decisions || []), ...(state.evidence || []), ...(state.remaining || []), ...(state.constraints || [])].join('\n'));
  for (const fact of policy.staleFacts || []) if (allText.includes(normalize(fact))) issues.push({ type: 'stale-fact-present', fact, critical: true });
  for (const fact of policy.forbiddenFacts || []) if (allText.includes(normalize(fact))) issues.push({ type: 'forbidden-fact-present', fact, critical: true });
  if (state.status === 'completed' && (state.remaining?.length || state.next_action)) issues.push({ type: 'inconsistent-completion', critical: true });
  if (state.status !== 'completed' && !state.remaining?.length) issues.push({ type: 'missing-remaining-work', critical: false });
  return {
    schema_version: 1,
    valid: !issues.some(issue => issue.critical),
    critical_issue_count: issues.filter(issue => issue.critical).length,
    issues
  };
}

