# Data Handling

## What the local core stores

The runtime can store work identity, goals, checkpoints, normalized events, decisions, constraints, artifact references, effect receipts, provenance, and continuation packages. The default store is `.infra/events.jsonl`.

## Where data goes

The local core writes to the configured file inside the project directory and listens on loopback. It contains no default external data sink and no hidden telemetry path.

Adapters or applications built by users may send data elsewhere. Those integrations are outside the self-hosted runtime's control and must be reviewed separately.

## Retention, export, and deletion

- retention is controlled by the operator;
- `GET /v1/work/:work-id/export` exports a work record;
- `DELETE /v1/work/:work-id` deletes the selected work through the local API;
- `npm run remove` removes configuration but preserves data;
- `npm run remove -- --delete-data` explicitly removes local work data.

Deletion from backups, copied exports, logs, or downstream adapters remains the operator's responsibility.

## Data minimization

Store the smallest authoritative state needed for continuation. Prefer artifact identifiers, hashes, and references over copying entire artifacts. Do not store passwords, API keys, access tokens, or unrelated personal information.

## Alpha limitation

JSONL is useful for local evaluation, not for production concurrency, high availability, disaster recovery, or regulated retention. A production operator must provide a suitable data layer and controls.
