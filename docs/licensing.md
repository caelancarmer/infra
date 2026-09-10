# Licensing

Infra uses a deliberately split licensing model. The public repository is useful and self-hostable, but it is not the complete managed Infra product.

## License map

| Scope | License | What that means |
| --- | --- | --- |
| `src/agent-adapters.mjs`, `src/agent-tool-vocabulary.mjs`, `src/agent-interface-contract.mjs`, `src/mcp-server.mjs`, `src/mcp-stdio.mjs`, and `src/portable-adapter-contract.mjs` | MIT | May be used, modified, distributed, sublicensed, and included in commercial products when the MIT notice is preserved. |
| Every other file in this repository unless a file states otherwise | PolyForm Shield License 1.0.0 | Source is available for permitted purposes, including self-hosting and modification, but may not be used to provide a product that competes with Infra or another product provided by the licensor. |
| Managed refinery and control-plane systems not present in this repository | Proprietary | No rights are granted by this repository because those systems are not distributed here. |

The root [`LICENSE`](../LICENSE) contains the controlling PolyForm Shield terms and required notices. The MIT text is in [`licenses/mit.txt`](../licenses/mit.txt), and each MIT-licensed source file carries an explicit SPDX header.

## Practical examples

Subject to the complete license terms:

- You may run this repository for your own personal or organizational workflows.
- You may inspect and modify the self-hosted runtime for a permitted purpose.
- You may use the MIT adapters and portable contract in commercial integrations.
- You may not use the PolyForm Shield-licensed runtime to offer a competing hosted service, plugin, library, or other practical substitute for Infra.
- A commercial license may be available for use outside the public license grant.

This page is a plain-language summary, not a replacement for the license text and not legal advice. If this summary and the license differ, the license controls.

## Why the split exists

The MIT integration surface lowers adoption friction across agents, runtimes, and workflow systems. The source-available runtime gives developers a real local product they can inspect and operate. The managed refinery remains private because its learned routing policy, operational reliability, cross-customer optimization, and governance systems are the commercial product's compounding layer.
