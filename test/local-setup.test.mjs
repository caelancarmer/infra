import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { removeLocal } from '../scripts/remove-local.mjs';
import { setupLocal } from '../scripts/setup-local.mjs';
import { readLocalConfig, validateLocalConfig } from '../src/local-config.mjs';

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'infra-local-setup-'));

let result = setupLocal({ projectRoot: root });
assert.equal(result.created, true);
assert.equal(fs.existsSync(path.join(root, '.infra', 'config.json')), true);
assert.equal(readLocalConfig({ projectRoot: root }).host, '127.0.0.1');

result = setupLocal({ projectRoot: root });
assert.equal(result.created, false);

const customRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'infra-local-custom-port-'));
result = setupLocal({ projectRoot: customRoot, port: 5111 });
assert.equal(result.config.port, 5111);
result = setupLocal({ projectRoot: customRoot });
assert.equal(result.created, false);
assert.equal(result.config.port, 5111);
fs.rmSync(customRoot, { recursive: true, force: true });

const dataPath = path.join(root, '.infra', 'events.jsonl');
fs.writeFileSync(dataPath, '{"event":"preserve-me"}\n');
result = removeLocal({ projectRoot: root });
assert.equal(result.removed, true);
assert.equal(result.dataPreserved, true);
assert.equal(fs.existsSync(dataPath), true);

result = setupLocal({ projectRoot: root });
assert.equal(result.created, true);
result = removeLocal({ projectRoot: root, deleteData: true });
assert.equal(result.removed, true);
assert.equal(result.dataDeleted, true);
assert.equal(fs.existsSync(dataPath), false);
assert.equal(fs.existsSync(path.join(root, '.infra')), false);

assert.throws(
  () => validateLocalConfig({
    schema_version: 1,
    runtime: 'infra-local',
    host: '127.0.0.1',
    port: 4317,
    data_file: '../outside.jsonl'
  }, { projectRoot: root }),
  /must remain inside/
);
assert.throws(
  () => validateLocalConfig({
    schema_version: 1,
    runtime: 'infra-local',
    host: '127.0.0.1',
    port: 4317,
    data_file: '.infra/config.json'
  }, { projectRoot: root }),
  /cannot replace/
);

fs.mkdirSync(path.join(root, '.infra'), { recursive: true });
fs.writeFileSync(path.join(root, '.infra', 'config.json'), '{"unexpected":true}\n');
assert.throws(() => setupLocal({ projectRoot: root }), /marker is missing/);
assert.throws(() => removeLocal({ projectRoot: root, deleteData: true }), /marker is missing/);

fs.rmSync(root, { recursive: true, force: true });
console.log('PASS one-command local setup, idempotency, safe removal, and explicit data deletion');
