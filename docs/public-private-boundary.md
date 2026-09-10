# Public-Private Boundary

## Included in the public release

- work-state schema and validation;
- local append-only state storage;
- history integrity metadata and verification;
- normalized continuation events and idempotency;
- continuation compiler and resume package;
- portable adapter definitions and resume envelopes;
- component-level tests.

This is a functional self-hosted runtime, not a mock or documentation-only SDK. It can create work, capture events, checkpoint state, preserve verifiable history, compile a continuation package, export records, and delete local records.

## Excluded from this extraction

- managed control plane and multi-tenant operations;
- cross-customer learned policy and outcome corpus;
- adaptive routing and proprietary context refinery;
- semantic recovery services and managed memory lifecycle;
- protected-effect operations and reconciliation service;
- internal model credentials, provider configuration, and spend data;
- private dogfood configuration and founder evidence;
- customer or prospect information;
- benchmark fixtures, raw results, and internal reports;
- production deployment configuration, backup, monitoring, and incident operations.

## Release rule

A file is included only when it is explicitly allowlisted in `extraction-manifest.json`, contains no secret or private-data material, and is required by the public self-hosted runtime or MIT integration surface. Absence from the package is intentional until reviewed.

## License boundary

- `src/agent-adapters.mjs` and `src/portable-adapter-contract.mjs` are MIT licensed so third-party tools can integrate without inheriting the runtime restriction.
- All other files are governed by PolyForm Shield 1.0.0 unless a file explicitly says otherwise.
- Excluded managed-refinery systems are proprietary and receive no license grant through this repository.

See [licensing.md](licensing.md) for the plain-language map and the root [`LICENSE`](../LICENSE) for controlling terms.


