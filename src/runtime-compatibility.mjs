export const SUPPORTED_NODE_MAJORS = Object.freeze([22, 24]);
export const SUPPORTED_PLATFORMS = Object.freeze(['darwin', 'linux', 'win32']);
export const SUPPORTED_ARCHITECTURES = Object.freeze(['arm64', 'x64']);

export function inspectRuntimeCompatibility({
  nodeVersion = process.versions.node,
  platform = process.platform,
  architecture = process.arch
} = {}) {
  const nodeMajor = Number(String(nodeVersion).split('.')[0]);
  const reasons = [];

  if (!SUPPORTED_NODE_MAJORS.includes(nodeMajor)) {
    reasons.push(`Node.js ${nodeVersion} is unsupported; use an LTS release from major 22 or 24`);
  }
  if (!SUPPORTED_PLATFORMS.includes(platform)) {
    reasons.push(`Operating system ${platform} is outside the declared compatibility target`);
  }
  if (!SUPPORTED_ARCHITECTURES.includes(architecture)) {
    reasons.push(`Architecture ${architecture} is outside the declared compatibility target`);
  }

  return {
    compatible: reasons.length === 0,
    node_version: nodeVersion,
    node_major: nodeMajor,
    platform,
    architecture,
    reasons
  };
}

export function assertRuntimeCompatibility(options) {
  const result = inspectRuntimeCompatibility(options);
  if (!result.compatible) throw new Error(result.reasons.join('; '));
  return result;
}
