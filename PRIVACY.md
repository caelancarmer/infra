# Privacy Policy for the Self-Hosted Public Runtime

## Summary

The self-hosted public runtime runs locally. It does not send telemetry, work-state, prompts, artifacts, or identifiers to Infra by default. It does not require an Infra account or model-provider key.

## Data controlled by the operator

Work events are stored in the configured local JSONL file. The person or organization running the software controls what enters that file, how long it is retained, who can access it, and when it is exported or deleted.

The default removal command preserves work data. Permanent deletion requires the explicit `--delete-data` option. Operators should maintain their own backups and retention policy.

## Future managed service

This document does not govern a future hosted or managed Infra service. Such a service must publish separate terms, privacy disclosures, subprocessors, retention rules, and customer controls before accepting customer data.

## Sensitive data

The alpha is not certified for regulated, secret, or highly sensitive data. Minimize captured content, prefer references to large artifacts, and never store credentials in work events.
