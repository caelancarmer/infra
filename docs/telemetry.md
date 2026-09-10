# Telemetry

## Current behavior

The self-hosted public runtime collects and transmits no product telemetry by default. It makes no background call to Infra and has no analytics key.

Local health responses, history, continuation metrics, and logs remain on the operator's machine unless an operator-created integration exports them.

## Future rule

Any future community telemetry must be:

- opt-in rather than hidden;
- documented before activation;
- limited to the stated purpose;
- removable without breaking the local core;
- separated from work content and sensitive data wherever possible.

A future managed service may require operational telemetry, but that collection must be governed by separate service terms and privacy documentation.
