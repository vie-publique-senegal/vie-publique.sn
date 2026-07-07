/**
 * Charge le .env à la racine du projet dans process.env.
 * À importer en tête de chaque script (avant lecture des variables).
 *
 *   import './load-env.mjs';
 */

import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const ENV_PATH = join(ROOT_DIR, '.env');

if (existsSync(ENV_PATH)) {
  process.loadEnvFile(ENV_PATH);
}
