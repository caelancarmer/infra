import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { LOCAL_CONFIG_FILE, LOCAL_DIRECTORY, readLocalConfig } from '../src/local-config.mjs';

function removeEmptyDirectory(directory) {
  if (fs.existsSync(directory) && fs.readdirSync(directory).length === 0) fs.rmdirSync(directory);
}

export function removeLocal({ projectRoot = process.cwd(), deleteData = false } = {}) {
  const configPath = path.resolve(projectRoot, LOCAL_CONFIG_FILE);
  const localDirectory = path.resolve(projectRoot, LOCAL_DIRECTORY);

  if (fs.existsSync(localDirectory) && fs.lstatSync(localDirectory).isSymbolicLink()) {
    throw new Error('Infra refuses to remove data through a symbolic link');
  }

  if (!fs.existsSync(configPath)) {
    return { removed: false, dataDeleted: false, dataPreserved: fs.existsSync(localDirectory) };
  }

  const config = readLocalConfig({ projectRoot, allowMissing: false });
  const dataPath = path.resolve(projectRoot, config.data_file);

  if (deleteData && fs.existsSync(dataPath)) fs.rmSync(dataPath, { force: false });
  fs.rmSync(configPath, { force: false });
  removeEmptyDirectory(localDirectory);

  return {
    removed: true,
    dataDeleted: deleteData,
    dataPreserved: !deleteData && fs.existsSync(dataPath),
    dataPath
  };
}

function isDirectRun() {
  return process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
}

if (isDirectRun()) {
  try {
    const deleteData = process.argv.slice(2).includes('--delete-data');
    const result = removeLocal({ deleteData });
    if (!result.removed) {
      console.log('Infra local setup was not present; nothing changed.');
    } else if (result.dataPreserved) {
      console.log('Infra local setup was removed. Work data was preserved.');
      console.log(`Preserved data: ${result.dataPath}`);
    } else {
      console.log(deleteData ? 'Infra local setup and work data were removed.' : 'Infra local setup was removed.');
    }
  } catch (error) {
    console.error(`Removal failed: ${error.message}`);
    process.exitCode = 1;
  }
}
