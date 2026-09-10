# Infra

Public alpha of the source-available Infra self-hosted runtime and MIT-licensed integration surface.

Infra turns long-running agent activity into a compact, verifiable work record that another agent or runtime can continue without guessing what happened before.

This repository contains a useful, self-contained local foundation:

- canonical work-state and checkpoints;
- append-only history with integrity metadata;
- normalized agent events and idempotency;
- continuation compilation and resume packages;
- portable envelopes for Codex, Claude Code, n8n, Dify, and custom adapters;
- a stable six-concept agent-tool vocabulary for portable integrations;
- local component tests and a repository-boundary check;
- a self-contained loopback runtime with JSONL persistence.

It intentionally excludes the managed control plane, cross-customer learned policy, private refinery, internal outcome corpus, private dogfood configuration, credentials, and operational evidence.

## Current status

This is a public alpha, not a production release or managed service. The package remains deliberately non-publishable to npm while its installation and integration contract are still evolving.

Package identity:

- product and package name: `infra`;
- alpha-candidate version: `0.1.0-alpha.1`;
- maintainer identity: Caelan Carmer;
- canonical engineering repository: `caelancarmer/infra`.

No personal email address or unrelated identity is embedded in the package metadata.

## Run locally

Requires a maintained Node.js 22 or Node.js 24 LTS release. No cloud account, model key, or external database is required.

```bash
npm run setup
npm start
```

Setup is idempotent: running it again does not overwrite a valid configuration. The server listens only on `127.0.0.1:4317` and stores events in `.infra/events.jsonl`. The runtime rejects non-loopback bind addresses.

To remove the generated local setup while preserving work data:

```bash
npm run remove
```

Data deletion is intentionally separate and explicit:

```bash
npm run remove -- --delete-data
```

The removal command validates the Infra config marker and will only delete the configured data file inside this project's `.infra` directory.

Core local endpoints:

- `GET /health`
- `POST /v1/work`
- `GET /v1/work/:work-id`
- `POST /v1/work/:work-id/checkpoint`
- `POST /v1/work/:work-id/events`
- `GET /v1/work/:work-id/resume-package?agent=claude-code`
- `GET /v1/work/:work-id/history`
- `GET /v1/work/:work-id/export`
- `DELETE /v1/work/:work-id`

## Agent-tool vocabulary

Infra uses six stable product concepts across Codex, Claude Code, n8n, Dify, and future integrations:

| Concept | Tool contract | Purpose |
| --- | --- | --- |
| Infra Work | `infra_begin_work` | Open tracked work |
| Infra Mark | `infra_checkpoint` | Set a verified safe point |
| Infra Relay | `infra_resume_work` | Prepare successor context |
| Infra Gate | `infra_preflight_effect` | Check a material action before execution |
| Infra Receipt | `infra_record_effect` | Record evidence of an external effect |
| Infra Seal | `infra_complete_work` | Close work after verification |

The public local alpha currently implements Work, Mark, and Relay. Gate, Receipt, and Seal require managed
governance and verification capabilities that are not included here. See the
[agent-tool vocabulary](docs/agent-tool-vocabulary.md) for activity labels, naming rules, and host UI behavior.

## Verify the extraction

Check whether the current machine is inside the declared compatibility target:

```bash
npm run compatibility
```

Then run the complete package suite:

```bash
npm test
```

Run the package from a newly assembled temporary directory, using only files declared in the extraction manifest:

```bash
npm run clean-room
```

The test command validates runtime compatibility, the core contract, local setup and removal, and the exact extraction manifest. It also scans the repository for forbidden internal paths and common secret formats.

GitHub Actions executes the suite on Windows x64, Linux x64, Linux arm64, and macOS arm64 with Node.js 22 and 24. The workflow runs the full test suite and a manifest-only clean-room rehearsal in every combination. See the [current CI status](https://github.com/caelancarmer/infra/actions/workflows/ci.yml) and [compatibility details](docs/compatibility.md).

## Safety and data

- [Security policy](SECURITY.md)
- [Privacy policy for the local core](PRIVACY.md)
- [Data handling](docs/data-handling.md)
- [Telemetry](docs/telemetry.md)
- [Shared responsibility](docs/shared-responsibility.md)
- [Public-private boundary](docs/public-private-boundary.md)

The self-hosted public runtime is local development software, provided as-is. It is not a managed production service, compliance product, backup system, or substitute for application-level authorization and human approval.

## License

Infra uses three licensing layers:

| Layer | Scope | License |
| --- | --- | --- |
| Integration | Agent adapters and portable adapter contract | [MIT](licenses/mit.txt) |
| Self-hosted runtime | All other repository files unless explicitly stated | [PolyForm Shield 1.0.0](LICENSE) |
| Managed refinery | Learned policy, adaptive routing, semantic recovery, governance operations, cross-customer optimization, and managed control plane | Proprietary and not included |

The self-hosted runtime can be inspected, run, and modified for permitted purposes, but it may not be used to provide a product that competes with Infra. Read the [plain-language license map](docs/licensing.md); the license texts control if a summary differs.

Infra is therefore not accurately described as an entirely open-source product. The integration layer is open source, the public runtime is source-available, and the managed refinery remains private.

## Repository policy

- Do not add customer data, private experiment results, API keys, access tokens, or internal outcome corpora.
- Add files through the allowlist in `extraction-manifest.json`.
- Treat artifacts and evidence as authoritative; memory is only a navigation aid.
- Read [contributing.md](contributing.md) before proposing source changes.
