# Security Policy

## Supported release

Only the latest public alpha is considered for security fixes. The alpha is development software and has no production reliability or support commitment.

## Report a vulnerability

Please use GitHub's private vulnerability reporting or open a draft repository security advisory. Do not disclose a suspected vulnerability in a public issue.

Include:

- the affected version and environment;
- steps to reproduce;
- expected and observed behavior;
- likely impact;
- a minimal proof of concept with secrets and personal data removed.

Reports are reviewed on a best-effort basis. Acknowledgement, remediation, and disclosure timing depend on severity and maintainer capacity; no service-level agreement is offered for the community alpha.

## Security boundary

The local core binds to loopback only and has no built-in remote authentication, authorization, encryption-at-rest, backup, or multi-tenant isolation. Do not expose it directly to an untrusted network. See [shared responsibility](docs/shared-responsibility.md) and [data handling](docs/data-handling.md).
