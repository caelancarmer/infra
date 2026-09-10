import crypto from 'node:crypto';

function unique(values = []) {
  return [...new Set(values.filter(value => value !== undefined && value !== null && String(value).trim() !== '').map(value => String(value)))];
}

function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, Number(value.toFixed(3))));
}

function latestState(events) {
  return [...events].reverse().find(event => event.state)?.state || null;
}

function asArtifact(value, event = null) {
  if (typeof value === 'string') return { path: value, source_event_id: event?.event_id || null, verified: false };
  if (!value || typeof value !== 'object') return null;
  return {
    artifact_id: value.artifact_id || value.id || null,
    path: value.relative_path || value.path || value.name || null,
    sha256: value.sha256 || null,
    content_type: value.content_type || value.contentType || null,
    source_event_id: value.source_event_id || event?.event_id || null,
    created_by: value.created_by || event?.agent_id || event?.actor_user_id || null,
    verified: Boolean(value.sha256_verified || value.verified || event?.type === 'verification_passed'),
    authoritative: Boolean(value.authoritative),
    status: value.status || null,
    supersedes: unique(value.supersedes || []),
    superseded_by: value.superseded_by || null
  };
}

function compileArtifactLineage(events, state) {
  const entries = [];
  for (const artifact of state?.artifacts || []) entries.push(asArtifact(artifact));
  for (const event of events.filter(item => item.type === 'artifact_created')) {
    const artifact = asArtifact(event.payload?.artifact || event.payload, event);
    if (artifact) entries.push(artifact);
  }
  const byKey = new Map();
  for (const artifact of entries) {
    const key = artifact.artifact_id || artifact.path || artifact.sha256;
    if (!key) continue;
    byKey.set(key, { ...byKey.get(key), ...artifact });
  }
  const resolved = [...byKey.values()];
  const supersededBy = new Map();
  for (const artifact of resolved) {
    for (const prior of artifact.supersedes || []) supersededBy.set(prior, artifact.artifact_id || artifact.path || artifact.sha256);
  }
  const authoritativeKeys = new Set((state?.artifacts || []).flatMap(item => typeof item === 'string'
    ? [item]
    : [item.artifact_id || item.id, item.path || item.relative_path, item.sha256]).filter(Boolean));
  return resolved.map(artifact => {
    const key = artifact.artifact_id || artifact.path || artifact.sha256;
    const superseded = artifact.status === 'superseded' || Boolean(artifact.superseded_by) || supersededBy.has(key);
    return {
      ...artifact,
      authoritative: !superseded && (artifact.authoritative || authoritativeKeys.has(artifact.artifact_id) || authoritativeKeys.has(artifact.path) || authoritativeKeys.has(artifact.sha256)),
      effective_status: superseded ? 'superseded' : 'active',
      superseded_by: artifact.superseded_by || supersededBy.get(key) || null
    };
  });
}

function sourceEventIds(events) {
  return events.map(event => event.event_id).filter(Boolean).slice(-100);
}

export function compileContinuation(events = [], options = {}) {
  const ordered = [...events].filter(Boolean).sort((a, b) => {
    const time = new Date(a.timestamp || 0).getTime() - new Date(b.timestamp || 0).getTime();
    return time || (Number(a.sequence) || 0) - (Number(b.sequence) || 0);
  });
  const state = latestState(ordered) || {};
  const lastEvent = ordered.at(-1) || null;
  const lastTimestamp = lastEvent?.timestamp || state.updated_at || null;
  const now = options.now ? new Date(options.now) : new Date();
  const staleAfterMs = Number(options.staleAfterMs ?? 7 * 24 * 60 * 60 * 1000);
  const ageMs = lastTimestamp ? Math.max(0, now.getTime() - new Date(lastTimestamp).getTime()) : null;
  const stale = state.status !== 'completed' && ageMs !== null && ageMs > staleAfterMs;
  const failures = unique([
    ...(state.failures || []),
    ...ordered.filter(event => event.type === 'tool_failed' || event.type === 'verification_failed').map(event => event.payload?.error || event.payload?.evidence || event.reason)
  ]);
  const decisions = unique([
    ...(state.decisions || []),
    ...ordered.filter(event => event.type === 'decision_recorded').map(event => event.payload?.decision || event.reason)
  ]);
  const evidence = unique([
    ...(state.evidence || []),
    ...ordered.filter(event => event.type === 'verification_passed' || event.type === 'verification_failed').map(event => event.payload?.evidence || event.reason)
  ]);
  const completed = unique(state.completed || []);
  const remaining = unique(state.remaining || []);
  const artifactLineage = compileArtifactLineage(ordered, state);
  const reasons = [];
  let confidence = 0.25;
  if (state.work_id) { confidence += 0.2; reasons.push('work-state exists'); }
  if (state.next_action) { confidence += 0.15; reasons.push('next action is explicit'); }
  if (evidence.length) { confidence += 0.15; reasons.push('evidence is present'); }
  if (ordered.some(event => event.type === 'verification_passed')) { confidence += 0.15; reasons.push('verification passed'); }
  if (artifactLineage.some(artifact => artifact.verified)) { confidence += 0.1; reasons.push('artifact lineage contains verified artifact'); }
  if (failures.length) { confidence -= 0.1; reasons.push('unresolved failure history exists'); }
  if (stale) { confidence -= 0.25; reasons.push('last event is stale'); }
  if (!ordered.length) reasons.push('no continuation events available');
  const stalenessReasons = stale ? [`last event is ${ageMs}ms old`, 'state requires revalidation before execution'] : [];
  const currentRevision = Number.isInteger(state.revision) ? state.revision : Number(ordered.at(-1)?.revision || 0);
  return {
    compiler_version: '0.1.0',
    work_id: state.external_work_id || state.work_id || ordered[0]?.work_id || null,
    scoped_work_id: state.work_id || ordered[0]?.work_id || null,
    tenant_id: state.tenant_id || ordered[0]?.tenant_id || null,
    goal: state.goal || '',
    status: state.status || 'unknown',
    revision: currentRevision,
    completed,
    remaining,
    next_action: state.next_action || remaining[0] || '',
    decisions,
    failures,
    evidence,
    constraints: unique(state.constraints || []),
    artifacts: artifactLineage,
    artifact_lineage: artifactLineage,
    confidence: clamp(confidence),
    confidence_reasons: reasons,
    stale,
    age_ms: ageMs,
    stale_after_ms: staleAfterMs,
    staleness_reasons: stalenessReasons,
    resume_allowed: state.status !== 'completed' && !stale,
    source_event_ids: sourceEventIds(ordered),
    last_event_at: lastTimestamp
  };
}

export function continuationPackageId(compiled) {
  return 'resume_' + crypto.createHash('sha256').update(JSON.stringify({
    work_id: compiled.scoped_work_id,
    revision: compiled.revision,
    next_action: compiled.next_action,
    source_event_ids: compiled.source_event_ids
  })).digest('hex').slice(0, 24);
}

