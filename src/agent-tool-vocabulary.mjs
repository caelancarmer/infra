// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Caelan Carmer

export const INFRA_AGENT_TOOL_CONTRACT_VERSION = '1.0.0';

const tools = [
  {
    name: 'infra_begin_work',
    concept: 'work',
    title: 'Infra Work',
    purpose: 'Open a durable record for one autonomous-work trajectory.',
    activity: { active: 'Opening Infra Work', completed: 'Infra Work opened' },
    capability: 'local-core'
  },
  {
    name: 'infra_checkpoint',
    concept: 'mark',
    title: 'Infra Mark',
    purpose: 'Set a verified safe point without ending the work.',
    activity: { active: 'Setting Infra Mark', completed: 'Infra Mark set' },
    capability: 'local-core'
  },
  {
    name: 'infra_resume_work',
    concept: 'relay',
    title: 'Infra Relay',
    purpose: 'Prepare the minimum verified context required by a successor.',
    activity: { active: 'Preparing Infra Relay', completed: 'Infra Relay prepared' },
    capability: 'local-core'
  },
  {
    name: 'infra_preflight_effect',
    concept: 'gate',
    title: 'Infra Gate',
    purpose: 'Check authority, policy, artifact truth, and duplicate risk before an external effect.',
    activity: { active: 'Checking Infra Gate', completed: 'Infra Gate checked' },
    capability: 'managed-refinery'
  },
  {
    name: 'infra_record_effect',
    concept: 'receipt',
    title: 'Infra Receipt',
    purpose: 'Record verifiable evidence that an external effect occurred.',
    activity: { active: 'Recording Infra Receipt', completed: 'Infra Receipt recorded' },
    capability: 'managed-refinery'
  },
  {
    name: 'infra_complete_work',
    concept: 'seal',
    title: 'Infra Seal',
    purpose: 'Close work only after the required outcome and evidence are verified.',
    activity: { active: 'Applying Infra Seal', completed: 'Infra Seal applied' },
    capability: 'managed-refinery'
  }
];

export const INFRA_AGENT_TOOLS = Object.freeze(
  Object.fromEntries(tools.map(tool => [tool.name, Object.freeze({
    ...tool,
    activity: Object.freeze({ ...tool.activity })
  })]))
);

export function agentToolVocabulary() {
  return Object.values(INFRA_AGENT_TOOLS).map(tool => ({
    ...tool,
    activity: { ...tool.activity }
  }));
}

export function agentToolDefinition(name) {
  const definition = INFRA_AGENT_TOOLS[name];
  if (!definition) throw new Error(`Unknown Infra agent tool: ${name}`);
  return definition;
}

export function agentToolActivity(name, phase = 'active') {
  const definition = agentToolDefinition(name);
  const label = definition.activity[phase];
  if (!label) throw new Error(`Unknown Infra agent tool activity phase: ${phase}`);
  return label;
}
