import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const self = path.resolve(fileURLToPath(import.meta.url));
const ignoredDirectories = new Set(['.git', '.infra', 'node_modules', 'coverage', 'dist']);
const forbiddenFragments = [
  ['private', '-', 'dogfood'].join(''),
  ['.infra', '-', 'private'].join(''),
  ['DAYTONA', '_API_KEY'].join(''),
  ['DEEPSEEK', '_API_KEY'].join(''),
  ['FIREWORKS', '_API_KEY'].join(''),
  ['N8N', '_PASSWORD'].join(''),
  ['C:', '\\Users'].join(''),
  ['@gmail', '.com'].join('')
];
const secretPatterns = [
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /\bgh[opusr]_[A-Za-z0-9_]{20,}\b/,
  /\bsk-[A-Za-z0-9_-]{20,}\b/,
  /\bBearer\s+[A-Za-z0-9._~-]{20,}\b/i
];

function listFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) return [];
    const absolute = path.join(directory, entry.name);
    return entry.isDirectory() ? listFiles(absolute) : [absolute];
  });
}

const findings = [];
const packageFiles = listFiles(root);
for (const file of packageFiles) {
  if (path.resolve(file) === self) continue;
  const relative = path.relative(root, file).replaceAll('\\', '/');
  const content = fs.readFileSync(file, 'utf8');
  const isDocumentation = relative.endsWith('.md') || relative === 'extraction-manifest.json';
  if (!isDocumentation) {
    for (const fragment of forbiddenFragments) {
      if (content.includes(fragment)) findings.push(`${relative}: forbidden internal fragment`);
    }
  }
  for (const pattern of secretPatterns) {
    if (pattern.test(content)) findings.push(`${relative}: possible secret material`);
  }
}

const manifest = JSON.parse(fs.readFileSync(path.join(root, 'extraction-manifest.json'), 'utf8'));
const packageMetadata = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const actualFiles = packageFiles.map(file => path.relative(root, file).replaceAll('\\', '/')).sort();
const declaredFiles = [...(manifest.included_files || [])].sort();

if (new Set(declaredFiles).size !== declaredFiles.length) findings.push('extraction-manifest.json: duplicate included_files entry');
for (const file of actualFiles) {
  if (!declaredFiles.includes(file)) findings.push(`${file}: absent from extraction manifest allowlist`);
}
for (const file of declaredFiles) {
  if (!actualFiles.includes(file)) findings.push(`${file}: declared in extraction manifest but missing from package`);
}
if (manifest.package?.name !== packageMetadata.name) findings.push('package.json: name differs from extraction manifest');
if (manifest.package?.version !== packageMetadata.version) findings.push('package.json: version differs from extraction manifest');
if (manifest.package?.license !== packageMetadata.license) findings.push('package.json: license differs from extraction manifest');
if (packageMetadata.private !== true) findings.push('package.json: public alpha must remain non-publishable to npm');

if (manifest.license_scopes?.default !== 'PolyForm Shield License 1.0.0') {
  findings.push('extraction-manifest.json: default license must be PolyForm Shield License 1.0.0');
}
const mitFiles = manifest.license_scopes?.mit || [];
for (const file of mitFiles) {
  if (!declaredFiles.includes(file)) findings.push(`${file}: MIT scope is not included in extraction manifest`);
  const absolute = path.join(root, file);
  if (!fs.existsSync(absolute)) continue;
  const content = fs.readFileSync(absolute, 'utf8');
  if (!content.startsWith('// SPDX-License-Identifier: MIT')) findings.push(`${file}: missing MIT SPDX header`);
}
const undeclaredMitFiles = actualFiles.filter(file => {
  if (!file.endsWith('.mjs') || mitFiles.includes(file)) return false;
  return fs.readFileSync(path.join(root, file), 'utf8').startsWith('// SPDX-License-Identifier: MIT');
});
for (const file of undeclaredMitFiles) findings.push(`${file}: MIT header is absent from declared license scope`);

const rootLicense = fs.readFileSync(path.join(root, 'LICENSE'), 'utf8');
const requiredNotice = 'Required Notice: Copyright 2026 Caelan Carmer.';
const lineOfBusiness = 'Licensor Line of Business: Infrastructure for autonomous-work continuity, work-state, governance, audit, and protected effects.';
const rootLicenseBase = rootLicense.split(requiredNotice)[0].trimEnd().replaceAll('\r\n', '\n');
const rootLicenseHash = crypto.createHash('sha256').update(rootLicenseBase).digest('hex');
if (rootLicenseHash !== '80ee7a573d585da44a6b993274071240470d2645922fff9f37910418b34fb836') {
  findings.push('LICENSE: official PolyForm Shield 1.0.0 text changed');
}
if (!rootLicense.includes(requiredNotice)) findings.push('LICENSE: required copyright notice is missing');
if (!rootLicense.includes(lineOfBusiness)) findings.push('LICENSE: licensor line of business is missing');
if (!fs.readFileSync(path.join(root, 'licenses', 'mit.txt'), 'utf8').startsWith('MIT License')) {
  findings.push('licenses/mit.txt: MIT license text is missing');
}

if (findings.length) {
  console.error(findings.join('\n'));
  process.exitCode = 1;
} else {
  console.log('PASS exact extraction manifest, repository boundary, and secret-pattern scan');
}
