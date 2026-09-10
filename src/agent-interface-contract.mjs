// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Caelan Carmer

import * as z from 'zod';

import { agentToolDefinition, agentToolVocabulary } from './agent-tool-vocabulary.mjs';

export const LOCAL_AGENT_TOOL_NAMES = Object.freeze([
  'infra_begin_work',
  'infra_checkpoint',
  'infra_resume_work'
]);

const text = z.string().trim().min(1);
const textList = z.array(z.string());
const artifact = z.object({
  artifact_id: text,
  relative_path: z.string().optional(),
  sha256: z.string().optional(),
  sha256_verified: z.boolean().optional()
}).passthrough();

const statePatch = z.object({
  goal: text.optional(),
  status: z.enum(['in_progress', 'blocked', 'completed']).optional(),
  completed: textList.optional(),
  artifacts: z.array(artifact).optional(),
  decisions: textList.optional(),
  failures: textList.optional(),
  evidence: textList.optional(),
  remaining: textList.optional(),
  next_action: z.string().optional(),
  constraints: textList.optional()
}).strict();

const schemas = Object.freeze({
  infra_begin_work: z.object({
    work_id: text.max(128),
    goal: text,
    next_action: text,
    tenant_id: z.string().optional(),
    external_work_id: z.string().optional(),
    status: z.enum(['in_progress', 'blocked']).optional(),
    completed: textList.optional(),
    artifacts: z.array(artifact).optional(),
    decisions: textList.optional(),
    failures: textList.optional(),
    evidence: textList.optional(),
    remaining: textList.optional(),
    constraints: textList.optional()
  }).strict(),
  infra_checkpoint: z.object({
    work_id: text.max(128),
    expected_revision: z.number().int().nonnegative().optional(),
    idempotency_key: z.string().optional(),
    reason: z.string().optional(),
    patch: statePatch
  }).strict(),
  infra_resume_work: z.object({
    work_id: text.max(128),
    target_agent: z.string().optional(),
    target_model: z.string().nullable().optional()
  }).strict(),
  infra_preflight_effect: z.object({
    work_id: text.max(128),
    effect_id: text,
    effect_type: text,
    idempotency_key: text,
    tenant_id: text.optional(),
    expected_revision: z.number().int().nonnegative().optional(),
    artifact_id: z.string().optional(),
    artifact_sha256: z.string().optional(),
    approval_id: z.string().optional(),
    policy_context: z.record(z.string(), z.unknown()).optional()
  }).strict(),
  infra_record_effect: z.object({
    work_id: text.max(128),
    effect_id: text,
    effect_type: text,
    idempotency_key: text,
    status: z.enum(['succeeded', 'failed', 'unknown']),
    provider_receipt_id: z.string().optional(),
    evidence: z.array(z.unknown()).optional(),
    occurred_at: z.string().optional()
  }).strict(),
  infra_complete_work: z.object({
    work_id: text.max(128),
    expected_revision: z.number().int().nonnegative().optional(),
    outcome: text,
    verification: z.record(z.string(), z.unknown()),
    evidence: z.array(z.unknown()).optional(),
    idempotency_key: z.string().optional()
  }).strict()
});

const annotations = Object.freeze({
  infra_begin_work: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  infra_checkpoint: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  infra_resume_work: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  infra_preflight_effect: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
  infra_record_effect: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
  infra_complete_work: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false }
});

export class AgentCapabilityUnavailableError extends Error {
  constructor(toolName) {
    const definition = agentToolDefinition(toolName);
    super(`${definition.title} requires a managed-refinery implementation`);
    this.name = 'AgentCapabilityUnavailableError';
    this.code = 'capability-unavailable';
    this.statusCode = 501;
    this.toolName = toolName;
  }
}

function localHandlers(service) {
  return {
    infra_begin_work: input => service.create(input),
    infra_checkpoint: ({ work_id: workId, ...input }) => service.checkpoint(workId, input),
    infra_resume_work: ({ work_id: workId, target_agent: targetAgent, target_model: targetModel }) =>
      service.resumePackage(workId, { target_agent: targetAgent || 'generic', target_model: targetModel || null })
  };
}

export function agentInterfaceDefinitions() {
  return agentToolVocabulary().map(vocabulary => ({
    ...vocabulary,
    inputSchema: schemas[vocabulary.name],
    annotations: { ...annotations[vocabulary.name] }
  }));
}

export function createAgentInterface({ service, managedHandlers = {} } = {}) {
  if (!service) throw new TypeError('A work service is required');
  const handlers = { ...localHandlers(service), ...managedHandlers };

  function isAvailable(name) {
    agentToolDefinition(name);
    return typeof handlers[name] === 'function';
  }

  function definitions({ availableOnly = false } = {}) {
    return agentInterfaceDefinitions().filter(definition => !availableOnly || isAvailable(definition.name));
  }

  function catalog() {
    return definitions().map(({ inputSchema, ...definition }) => ({
      ...definition,
      available: isAvailable(definition.name),
      input_schema: z.toJSONSchema(inputSchema)
    }));
  }

  async function invoke(name, input = {}) {
    const definition = definitions().find(candidate => candidate.name === name);
    if (!definition) throw new Error(`Unknown Infra agent tool: ${name}`);
    if (!isAvailable(name)) throw new AgentCapabilityUnavailableError(name);
    const parsed = definition.inputSchema.safeParse(input);
    if (!parsed.success) {
      const error = new Error(`Invalid ${name} input: ${z.prettifyError(parsed.error)}`);
      error.name = 'AgentToolInputError';
      error.code = 'invalid-tool-input';
      error.statusCode = 400;
      throw error;
    }
    return handlers[name](parsed.data);
  }

  return Object.freeze({ isAvailable, definitions, catalog, invoke });
}
