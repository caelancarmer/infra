# Infra Agent Tool Vocabulary

Infra exposes one stable technical vocabulary and one human-facing product vocabulary. Technical names remain
descriptive for SDK, MCP, plugin, and workflow integrations. Product terms make activity recognizable without
forcing developers to learn opaque abbreviations.

| Product concept | Meaning | Stable tool name | Active UI label |
| --- | --- | --- | --- |
| Infra Work | One tracked autonomous-work trajectory | `infra_begin_work` | Opening Infra Work |
| Infra Mark | A verified safe point inside active work | `infra_checkpoint` | Setting Infra Mark |
| Infra Relay | Minimum verified context prepared for a successor | `infra_resume_work` | Preparing Infra Relay |
| Infra Gate | Authority and safety check before an external effect | `infra_preflight_effect` | Checking Infra Gate |
| Infra Receipt | Verifiable evidence that an external effect occurred | `infra_record_effect` | Recording Infra Receipt |
| Infra Seal | Verified closure of the work and its outcome | `infra_complete_work` | Applying Infra Seal |

## What users may see

An integration should prefer the product title and activity label when its host supports custom tool metadata.
Examples include `Preparing Infra Relay`, `Checking Infra Gate`, and `Applying Infra Seal`.

The exact surrounding phrase, animation, or status treatment remains controlled by Codex, Claude Code, n8n,
Dify, or another host. A host may therefore render `Using Infra Relay` instead of the canonical active label.
The semantic identity must remain `Infra Relay` even when the host controls the verb.

## Capability boundary

The public local alpha currently implements Work, Mark, and Relay. Gate, Receipt, and Seal describe the complete
Infra product contract, but their authoritative governance, reconciliation, and verification behavior belongs to
the managed refinery and is not included in the public local runtime. Integrations must not present an unavailable
managed capability as active.

## Naming rules

- Files and slugs use lowercase kebab-case.
- Tool and function identifiers use snake_case because hyphens are not portable function identifiers.
- Human-facing concepts use `Infra` plus the stable product term.
- Tool names are versioned contracts. Future wording changes should use display metadata or aliases instead of
  silently breaking existing workflows.
- `Work`, `Mark`, `Relay`, `Gate`, `Receipt`, and `Seal` are product concepts. They are not six independent
  products and do not expose the private refinery architecture.

## Lifecycle

```text
Infra Work
    -> Infra Mark
    -> Infra Relay
    -> Infra Gate
    -> Infra Receipt
    -> Infra Seal
```

Not every trajectory calls every tool. The lightweight path may use only Work, Mark, and Relay. Gate and Receipt
are used around material external effects, and Seal is used only when completion can be verified.
