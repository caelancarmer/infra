import { continuationPackageId } from './continuation-compiler.mjs';

export function buildResumePackage(compiled, options = {}) {
  const targetAgent = options.targetAgent || 'generic';
  const instructions = [
    'Do not repeat completed work unless verification shows it is invalid.',
    'Read and verify referenced artifacts before changing them.',
    'Record new failures, decisions, evidence, and artifacts as continuation events.',
    'Use the exact next action as the starting point unless a stale-state warning requires revalidation.'
  ];
  if (compiled.stale) instructions.unshift('State is stale: revalidate current files and approvals before executing the next action.');
  const handoffText = [
    'INFRA RESUME PACKAGE',
    'Goal: ' + compiled.goal,
    'Status: ' + compiled.status + ' | Revision: ' + compiled.revision,
    'Confidence: ' + compiled.confidence + (compiled.stale ? ' | STALE — REVALIDATE' : ''),
    'Completed: ' + JSON.stringify(compiled.completed),
    'Remaining: ' + JSON.stringify(compiled.remaining),
    'Next action: ' + compiled.next_action,
    'Decisions: ' + JSON.stringify(compiled.decisions),
    'Known failures: ' + JSON.stringify(compiled.failures),
    'Evidence: ' + JSON.stringify(compiled.evidence),
    'Artifacts: ' + JSON.stringify(compiled.artifact_lineage),
    'Constraints: ' + JSON.stringify(compiled.constraints),
    'Instructions: ' + JSON.stringify(instructions)
  ].join('\n');
  return {
    schema_version: 1,
    package_id: continuationPackageId(compiled),
    target_agent: targetAgent,
    target_model: options.targetModel || null,
    generated_at: new Date().toISOString(),
    ...compiled,
    instructions,
    handoff_text: handoffText
  };
}

