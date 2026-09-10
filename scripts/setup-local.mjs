import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  DEFAULT_LOCAL_CONFIG,
  LOCAL_CONFIG_FILE,
  LOCAL_DIRECTORY,
  readLocalConfig,
  validateLocalConfig
} from '../src/local-config.mjs';
import { assertRuntimeCompatibility } from '../src/runtime-compatibility.mjs';

export function setupLocal({ projectRoot = process.cwd(), port } = {}) {
  assertRuntimeCompatibility();
  const configPath = path.resolve(projectRoot, LOCAL_CONFIG_FILE);
  const localDirectory = path.resolve(projectRoot, LOCAL_DIRECTORY);

  if (fs.existsSync(localDirectory) && fs.lstatSync(localDirectory).isSymbolicLink()) {
    throw new Error('Infra refuses to use a symbolic link as the local data directory');
  }

  if (fs.existsSync(configPath)) {
    const existing = readLocalConfig({ projectRoot, allowMissing: false });
    if (port !== undefined && port !== existing.port) {
      throw new Error(`Infra is already configured on port ${existing.port}; remove the setup before changing it`);
    }
    return { created: false, configPath, config: existing };
  }

  const config = validateLocalConfig({ ...DEFAULT_LOCAL_CONFIG, port: port ?? DEFAULT_LOCAL_CONFIG.port }, { projectRoot });
  fs.mkdirSync(localDirectory, { recursive: true });
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n', { encoding: 'utf8', flag: 'wx' });
  return { created: true, configPath, config };
}

function parsePort(args) {
  const index = args.indexOf('--port');
  if (index === -1) return undefined;
  if (!args[index + 1]) throw new Error('--port requires a number');
  return Number(args[index + 1]);
}

function isDirectRun() {
  return process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
}

if (isDirectRun()) {
  try {
    const result = setupLocal({ port: parsePort(process.argv.slice(2)) });
    console.log(result.created ? 'Infra local setup is ready.' : 'Infra local setup was already ready; nothing changed.');
    console.log(`Config: ${result.configPath}`);
    console.log('Start Infra with: npm start');
  } catch (error) {
    console.error(`Setup failed: ${error.message}`);
    process.exitCode = 1;
  }
}
