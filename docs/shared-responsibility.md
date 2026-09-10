# Shared Responsibility

## Self-hosted public runtime provides

- source code for the allowlisted continuation foundation;
- local work-state, event, checkpoint, history, and resume behavior;
- loopback-only default networking;
- integrity, idempotency, compatibility, and boundary tests;
- export and explicit deletion controls.

## Self-hosted operator provides

- secure hosting and network boundaries;
- authentication, authorization, tenant isolation, and secret management;
- database durability, concurrency, backup, restore, and disaster recovery;
- monitoring, alerting, upgrades, and incident response;
- data classification, retention, deletion, and regulatory compliance;
- validation of adapters, models, tools, policies, and human approvals;
- application-level protection for payments, deployments, messages, and other side effects.

## Infra does not assume for the public alpha

- custody of operator data;
- production availability or recovery guarantees;
- correctness of third-party models, agents, tools, or adapters;
- responsibility for actions executed by an operator's workflow;
- compliance certification or legal suitability for a particular use.

## Future managed service

A managed offering may take responsibility for selected storage, operations, security, recovery, governance, and support functions under a separate service agreement. Those obligations are not implied by this repository.

Self-hosting rights remain subject to the repository's license terms. Operational responsibility and licensing permission are separate questions: an operator may be technically capable of running the software while still being prohibited from offering a competing product.
