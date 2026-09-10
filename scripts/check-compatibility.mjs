import { assertRuntimeCompatibility } from '../src/runtime-compatibility.mjs';

try {
  const result = assertRuntimeCompatibility();
  console.log(`PASS Infra runtime compatibility: Node.js ${result.node_version}, ${result.platform}, ${result.architecture}`);
} catch (error) {
  console.error(`Compatibility check failed: ${error.message}`);
  process.exitCode = 1;
}
