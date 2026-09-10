import fs from 'node:fs';
import path from 'node:path';

export const LOCAL_DIRECTORY = '.infra';
export const LOCAL_CONFIG_FILE = '.infra/config.json';
export const DEFAULT_LOCAL_CONFIG = Object.freeze({
  schema_version: 1,
  runtime: 'infra-local',
  host: '127.0.0.1',
  port: 4317,
  data_file: '.infra/events.jsonl'
});

function isInside(parent, candidate) {
  const relative = path.relative(parent, candidate);
  return relative === '' || (!relative.startsWith('..' + path.sep) && relative !== '..' && !path.isAbsolute(relative));
}

export function validateLocalConfig(value, { projectRoot = process.cwd() } = {}) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Infra local config must be a JSON object');
  }
  if (value.schema_version !== 1 || value.runtime !== 'infra-local') {
    throw new Error('Infra local config marker is missing or unsupported');
  }
  if (!['127.0.0.1', '::1', 'localhost'].includes(value.host)) {
    throw new Error('Infra local runtime can bind only to a loopback host');
  }
  if (!Number.isInteger(value.port) || value.port < 0 || value.port > 65535) {
    throw new Error('Infra local port must be an integer between 0 and 65535');
  }
  if (typeof value.data_file !== 'string' || !value.data_file.trim()) {
    throw new Error('Infra local data_file must be a non-empty path');
  }

  const dataRoot = path.resolve(projectRoot, LOCAL_DIRECTORY);
  const dataPath = path.resolve(projectRoot, value.data_file);
  if (!isInside(dataRoot, dataPath) || dataPath === dataRoot) {
    throw new Error('Infra local data_file must remain inside the project .infra directory');
  }
  if (dataPath === path.resolve(projectRoot, LOCAL_CONFIG_FILE)) {
    throw new Error('Infra local data_file cannot replace the local config file');
  }

  return {
    schema_version: 1,
    runtime: 'infra-local',
    host: value.host,
    port: value.port,
    data_file: path.relative(projectRoot, dataPath).split(path.sep).join('/')
  };
}

export function readLocalConfig({ projectRoot = process.cwd(), allowMissing = true } = {}) {
  const configPath = path.resolve(projectRoot, LOCAL_CONFIG_FILE);
  if (!fs.existsSync(configPath)) {
    if (allowMissing) return { ...DEFAULT_LOCAL_CONFIG };
    throw new Error(`Infra local setup not found at ${configPath}`);
  }

  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch (error) {
    throw new Error(`Infra local config is not valid JSON: ${error.message}`);
  }
  return validateLocalConfig(parsed, { projectRoot });
}

export function resolveLocalRuntimeOptions({ projectRoot = process.cwd(), env = process.env } = {}) {
  const config = readLocalConfig({ projectRoot });
  const host = env.INFRA_LOCAL_HOST || config.host;
  const port = env.INFRA_LOCAL_PORT === undefined ? config.port : Number(env.INFRA_LOCAL_PORT);
  const dataFile = env.INFRA_LOCAL_DATA || config.data_file;
  const validated = validateLocalConfig({ ...config, host, port, data_file: dataFile }, { projectRoot });
  return {
    host: validated.host,
    port: validated.port,
    logPath: path.resolve(projectRoot, validated.data_file)
  };
}
