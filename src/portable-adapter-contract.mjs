// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Caelan Carmer

import { normalizeAgentEvent } from './continuation-events.mjs';

function setPath(target, path, value) {
  let cursor = target;
  for (let index = 0; index < path.length - 1; index += 1) {
    const key = path[index];
    if (!cursor[key] || typeof cursor[key] !== 'object') cursor[key] = {};
    cursor = cursor[key];
  }
  cursor[path.at(-1)] = value;
}

export function validatePortableAdapterDefinition(definition = {}) {
  const issues = [];
  if (!/^[a-z0-9][a-z0-9-]{1,63}$/.test(String(definition.adapter_id || ''))) issues.push('adapter_id must use lower-kebab-case');
  if (!definition.event_map || typeof definition.event_map !== 'object' || Array.isArray(definition.event_map)) issues.push('event_map is required');
  const contextPath = definition.resume_envelope?.context_path;
  const packagePath = definition.resume_envelope?.package_path;
  if (!Array.isArray(contextPath) || !contextPath.length || contextPath.some(item => typeof item !== 'string' || !item)) issues.push('resume_envelope.context_path is required');
  if (!Array.isArray(packagePath) || !packagePath.length || packagePath.some(item => typeof item !== 'string' || !item)) issues.push('resume_envelope.package_path is required');
  return { valid: issues.length === 0, issues };
}

export function normalizePortableAdapterEvent(definition, input = {}) {
  const validation = validatePortableAdapterDefinition(definition);
  if (!validation.valid) throw new Error(`Invalid portable adapter: ${validation.issues.join('; ')}`);
  const rawType = input.type || input.event_type || input.hook_event_name || input.event || 'unknown';
  return normalizeAgentEvent({
    ...input,
    type: definition.event_map[rawType] || rawType,
    source: definition.adapter_id
  });
}

export function buildPortableResumeEnvelope(definition, productPackage) {
  const validation = validatePortableAdapterDefinition(definition);
  if (!validation.valid) throw new Error(`Invalid portable adapter: ${validation.issues.join('; ')}`);
  if (!productPackage?.selected_context || !productPackage?.package_id) throw new Error('Portable envelope requires an Infra End-to-End product package');
  const envelope = {};
  setPath(envelope, definition.resume_envelope.context_path, productPackage.selected_context);
  setPath(envelope, definition.resume_envelope.package_path, productPackage);
  return envelope;
}

export function builtInPortableAdapterDefinitions() {
  return [
    { adapter_id: 'codex', event_map: { session_start: 'session_started', session_stop: 'session_stopped', tool_success: 'tool_completed', tool_failure: 'tool_failed' }, resume_envelope: { context_path: ['additionalContext'], package_path: ['infra_resume_package'] } },
    { adapter_id: 'claude-code', event_map: { SessionStart: 'session_started', SessionEnd: 'session_stopped', PostToolUse: 'tool_completed', PostToolUseFailure: 'tool_failed' }, resume_envelope: { context_path: ['additionalContext'], package_path: ['infra', 'resume_package'] } },
    { adapter_id: 'n8n', event_map: { workflowStarted: 'session_started', nodeExecuted: 'tool_completed', nodeFailed: 'tool_failed', workflowSucceeded: 'work_completed' }, resume_envelope: { context_path: ['json', 'resume_context'], package_path: ['json', 'infra_resume_package'] } },
    { adapter_id: 'dify', event_map: { workflow_started: 'session_started', node_finished: 'tool_completed', node_failed: 'tool_failed', workflow_finished: 'work_completed' }, resume_envelope: { context_path: ['variables', 'infra_resume_context'], package_path: ['variables', 'infra_resume_package'] } }
  ];
}

