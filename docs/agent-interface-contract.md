# Agent Interface Contract

Infra exposes the same product vocabulary to agent hosts and workflow builders through two transports:

```text
Codex / Claude Code  -> MCP stdio -> agent interface contract
n8n / Dify / custom -> local HTTP -> agent interface contract
                                      -> Infra work service
```

The contract contains six stable tools. The source-available local alpha executes Work, Mark, and Relay. A managed
implementation can inject authoritative handlers for Gate, Receipt, and Seal without changing tool names or host
workflows.

## MCP for Codex and Claude Code

Install dependencies and prepare local storage:

```bash
npm install
npm run setup
```

Register the server with the absolute path to this clone:

```bash
codex mcp add infra -- node /absolute/path/to/infra/src/mcp-stdio.mjs
claude mcp add infra -- node /absolute/path/to/infra/src/mcp-stdio.mjs
```

These commands follow the current Codex and Claude Code local-stdio conventions. `npm run mcp` remains available
for direct startup and debugging from the repository directory.

The MCP server advertises only capabilities it can execute. In this public alpha that means:

- `infra_begin_work` — Infra Work;
- `infra_checkpoint` — Infra Mark;
- `infra_resume_work` — Infra Relay.

It writes protocol messages only to standard output. Human-readable startup information goes to standard error.

## HTTP for n8n, Dify, and custom workflows

Start the local server with `npm start`, then discover the full contract and current availability:

```text
GET http://127.0.0.1:4317/v1/tools
```

Call an available tool by its stable name:

```text
POST http://127.0.0.1:4317/v1/tools/infra_begin_work
POST http://127.0.0.1:4317/v1/tools/infra_checkpoint
POST http://127.0.0.1:4317/v1/tools/infra_resume_work
```

An unavailable managed capability returns HTTP `501` with `capability-unavailable`. This prevents a local demo from
pretending that it performed governance or effect verification.

The loopback endpoint works only when the workflow process can reach the same machine. n8n Cloud and Dify Cloud
cannot call `127.0.0.1`; they require a separately authenticated managed Infra endpoint. Do not expose this local
alpha to the public internet as a workaround.

## Host display behavior

Each MCP tool carries a product title plus activity metadata such as `Preparing Infra Relay`. The host application
controls whether and how that metadata is rendered. Integrators must treat the technical snake_case name as the
stable contract and the human-facing title as display vocabulary.

## Security boundary

The public HTTP server remains loopback-only and has no remote authentication. The MCP server is a local child
process using the same local JSONL store. Neither transport is a managed production endpoint, authorization layer,
or substitute for application-level approval.
