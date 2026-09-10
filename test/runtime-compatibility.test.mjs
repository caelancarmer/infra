import assert from 'node:assert/strict';

import { inspectRuntimeCompatibility } from '../src/runtime-compatibility.mjs';

for (const nodeVersion of ['22.0.0', '24.19.0']) {
  for (const architecture of ['x64', 'arm64']) {
    const result = inspectRuntimeCompatibility({ nodeVersion, platform: 'linux', architecture });
    assert.equal(result.compatible, true);
  }
}

for (const nodeVersion of ['20.20.0', '23.11.1', '25.6.0', '26.0.0']) {
  const result = inspectRuntimeCompatibility({ nodeVersion, platform: 'linux', architecture: 'x64' });
  assert.equal(result.compatible, false);
  assert.match(result.reasons.join(' '), /major 22 or 24/);
}

assert.equal(inspectRuntimeCompatibility({
  nodeVersion: '24.19.0',
  platform: 'freebsd',
  architecture: 'x64'
}).compatible, false);

assert.equal(inspectRuntimeCompatibility({
  nodeVersion: '24.19.0',
  platform: 'linux',
  architecture: 'riscv64'
}).compatible, false);

console.log('PASS supported Node.js, operating-system, and architecture compatibility contract');
