// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Caelan Carmer

import { normalizeAgentEvent } from './continuation-events.mjs';
import { buildResumePackage } from './resume-package.mjs';

const ADAPTER_EVENT_MAP = {
  codex: { session_start: 'session_started', session_stop: 'session_stopped', tool_success: 'tool_completed', tool_failure: 'tool_failed' },
  'claude-code': { SessionStart: 'session_started', SessionEnd: 'session_stopped', PostToolUse: 'tool_completed', PostToolUseFailure: 'tool_failed' },
  n8n: { workflowStarted: 'session_started', nodeExecuted: 'tool_completed', nodeFailed: 'tool_failed', workflowSucceeded: 'work_completed' },
  dify: { workflow_started: 'session_started', node_finished: 'tool_completed', node_failed: 'tool_failed', workflow_finished: 'work_completed' }
};

export const SUPPORTED_AGENT_ADAPTERS = ['codex', 'claude-code', 'n8n', 'dify'];

export function normalizeAdapterEvent(adapter, input = {}) {
  if (!SUPPORTED_AGENT_ADAPTERS.includes(adapter)) throw new Error('Unsupported agent adapter: ' + adapter);
  const rawType = input.type || input.event_type || input.hook_event_name || input.event || 'unknown';
  return normalizeAgentEvent({
    ...input,
    type: ADAPTER_EVENT_MAP[adapter][rawType] || rawType,
    source: adapter
  });
}

export function resumeEnvelope(adapter, compiled, options = {}) {
  if (!SUPPORTED_AGENT_ADAPTERS.includes(adapter)) throw new Error('Unsupported agent adapter: ' + adapter);
  const pkg = compiled.handoff_text ? compiled : buildResumePackage(compiled, { ...options, targetAgent: adapter });
  if (adapter === 'codex') return { additionalContext: pkg.handoff_text, infra_resume_package: pkg };
  if (adapter === 'claude-code') return { additionalContext: pkg.handoff_text, infra: { resume_package: pkg } };
  if (adapter === 'n8n') return { json: { infra_resume_package: pkg, resume_context: pkg.handoff_text } };
  return { variables: { infra_resume_package: JSON.stringify(pkg), infra_resume_context: pkg.handoff_text } };
}

