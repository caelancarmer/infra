import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const sourceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const temporaryRoot = path.resolve(os.tmpdir());
const prefix = 'infra-clean-room-';
const npmCli = process.env.npm_execpath;

function run(command, args, cwd) {
  execFileSync(command, args, { cwd, stdio: 'inherit', windowsHide: true });
}

function copyDeclaredPackage(destination) {
  const manifest = JSON.parse(fs.readFileSync(path.join(sourceRoot, 'extraction-manifest.json'), 'utf8'));
  for (const relative of manifest.included_files) {
    const source = path.resolve(sourceRoot, relative);
    const target = path.resolve(destination, relative);
    if (!source.startsWith(sourceRoot + path.sep)) throw new Error(`Manifest path escapes package: ${relative}`);
    if (!fs.existsSync(source) || !fs.statSync(source).isFile()) throw new Error(`Declared package file is missing: ${relative}`);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(source, target, fs.constants.COPYFILE_EXCL);
  }
}

function removeTemporaryPackage(directory) {
  const resolved = path.resolve(directory);
  if (path.dirname(resolved) !== temporaryRoot || !path.basename(resolved).startsWith(prefix)) {
    throw new Error('Refusing to remove an unverified clean-room directory');
  }
  fs.rmSync(resolved, { recursive: true, force: false });
}

const cleanRoot = fs.mkdtempSync(path.join(temporaryRoot, prefix));

try {
  if (!npmCli || !fs.existsSync(npmCli)) throw new Error('Run this rehearsal through npm so its portable CLI path is available');
  copyDeclaredPackage(cleanRoot);
  if (fs.existsSync(path.join(cleanRoot, '.git'))) throw new Error('Clean-room package unexpectedly contains Git metadata');
  if (fs.existsSync(path.join(cleanRoot, 'node_modules'))) throw new Error('Clean-room package unexpectedly contains dependencies');

  run(process.execPath, [npmCli, 'ci', '--ignore-scripts', '--no-audit', '--no-fund'], cleanRoot);
  run(process.execPath, [npmCli, 'test'], cleanRoot);
  run(process.execPath, [npmCli, 'run', 'setup'], cleanRoot);

  const configPath = path.join(cleanRoot, '.infra', 'config.json');
  if (!fs.existsSync(configPath)) throw new Error('One-command setup did not create local configuration');

  run(process.execPath, [npmCli, 'run', 'remove', '--', '--delete-data'], cleanRoot);
  if (fs.existsSync(configPath)) throw new Error('One-command removal left local configuration behind');

  console.log('PASS clean-room package, tests, setup, and removal');
} finally {
  removeTemporaryPackage(cleanRoot);
}
