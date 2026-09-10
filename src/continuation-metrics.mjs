import fs from 'node:fs';

function asNumber(value) {
  return Number.isFinite(Number(value)) ? Number(value) : 0;
}

export function summarizeContinuationEvents(events = []) {
  const ordered = [...events].filter(event => event?.timestamp).sort((a, b) =>
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
  const timestamps = ordered.map(event => new Date(event.timestamp).getTime()).filter(Number.isFinite);
  const latestStates = ordered.map(event => event.state).filter(Boolean);
  const lastState = latestStates.at(-1) || null;
  const metrics = ordered.reduce((summary, event) => {
    const usage = event.metrics || {};
    summary.token_usage += asNumber(usage.total_tokens);
    summary.cost_usd += asNumber(usage.cost_usd);
    summary.repeated_steps += asNumber(usage.repeated_steps);
    return summary;
  }, { token_usage: 0, cost_usd: 0, repeated_steps: 0 });

  return {
    work_id: lastState?.external_work_id || lastState?.work_id || ordered[0]?.work_id || null,
    event_count: ordered.length,
    checkpoint_count: ordered.filter(event => event.type === 'checkpoint').length,
    resume_count: ordered.filter(event => event.type === 'resume' || event.reason === 'resume requested').length,
    verification_pass_count: ordered.filter(event => event.type === 'verification_passed').length,
    verification_fail_count: ordered.filter(event => event.type === 'verification_failed').length,
    completion_count: latestStates.filter(state => state.status === 'completed').length,
    first_event_at: ordered[0]?.timestamp || null,
    last_event_at: ordered.at(-1)?.timestamp || null,
    elapsed_ms: timestamps.length > 1 ? Math.max(0, timestamps.at(-1) - timestamps[0]) : 0,
    ...metrics
  };
}

if (process.argv[1] && process.argv[1].endsWith('continuation-metrics.mjs')) {
  const logPath = process.argv[2];
  const workId = process.argv[3];
  if (!logPath) throw new Error('Usage: node continuation-metrics.mjs <events.jsonl> [work-id]');
  const events = fs.readFileSync(logPath, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map(line => JSON.parse(line))
    .filter(event => !workId || event.work_id === workId);
  console.log(JSON.stringify(summarizeContinuationEvents(events), null, 2));
}

