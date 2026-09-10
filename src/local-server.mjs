import { startLocalHttpServer } from './local-http-api.mjs';
import { resolveLocalRuntimeOptions } from './local-config.mjs';

const { host, port, logPath } = resolveLocalRuntimeOptions();

const runtime = await startLocalHttpServer({ host, port, logPath });
console.log(`Infra local runtime listening at http://${runtime.host}:${runtime.port}`);
console.log(`Local data: ${logPath}`);
console.log('Press Ctrl+C to stop.');

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => runtime.server.close(() => process.exit(0)));
}
