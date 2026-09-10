import crypto from 'node:crypto';

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]));
}

function digest(value) {
  return crypto.createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
}

function recordCore(record) {
  const { history, ...event } = record;
  return event;
}

export function historyRecordHash(record, previousHash = null, sequence = 1) {
  return digest({
    history_schema_version: 1,
    ledger_sequence: sequence,
    previous_hash: previousHash,
    record: recordCore(record)
  });
}

export function attachHistoryMetadata(record, previousRecord = null) {
  if (record?.history?.record_hash) return record;
  const previousSequence = Number(previousRecord?.history?.ledger_sequence || 0);
  const ledgerSequence = previousSequence + 1;
  const previousHash = previousRecord?.history?.record_hash || null;
  const next = { ...record };
  next.history = {
    schema_version: 1,
    ledger_sequence: ledgerSequence,
    previous_hash: previousHash,
    record_hash: historyRecordHash(next, previousHash, ledgerSequence)
  };
  return next;
}

export function verifyHistoryChain(events = []) {
  const ordered = [...events].sort((a, b) => {
    const sequence = Number(a.history?.ledger_sequence || a.sequence || 0) - Number(b.history?.ledger_sequence || b.sequence || 0);
    if (sequence) return sequence;
    return new Date(a.timestamp || 0).getTime() - new Date(b.timestamp || 0).getTime();
  });
  const issues = [];
  let previousHash = null;
  let expectedSequence = 1;
  for (const event of ordered) {
    const metadata = event.history;
    if (!metadata) {
      issues.push({ event_id: event.event_id || null, type: 'missing-history-metadata' });
      continue;
    }
    if (metadata.ledger_sequence !== expectedSequence) {
      issues.push({ event_id: event.event_id || null, type: 'sequence-gap', expected: expectedSequence, actual: metadata.ledger_sequence });
    }
    if (metadata.previous_hash !== previousHash) {
      issues.push({ event_id: event.event_id || null, type: 'previous-hash-mismatch', expected: previousHash, actual: metadata.previous_hash });
    }
    const expectedHash = historyRecordHash(event, metadata.previous_hash, metadata.ledger_sequence);
    if (metadata.record_hash !== expectedHash) {
      issues.push({ event_id: event.event_id || null, type: 'record-hash-mismatch', expected: expectedHash, actual: metadata.record_hash });
    }
    previousHash = metadata.record_hash;
    expectedSequence = metadata.ledger_sequence + 1;
  }
  return {
    schema_version: 1,
    verified: issues.length === 0,
    event_count: ordered.length,
    head_hash: previousHash,
    issues
  };
}

export function canonicalHistory(events = []) {
  const byWork = new Map();
  for (const event of events) {
    if (!byWork.has(event.work_id)) byWork.set(event.work_id, []);
    byWork.get(event.work_id).push(event);
  }
  return [...byWork.entries()].map(([workId, records]) => ({
    work_id: workId,
    ...verifyHistoryChain(records)
  }));
}

