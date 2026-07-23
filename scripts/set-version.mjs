// Writes src/version.ts from the APP_VERSION env var (falls back to a dev marker).
// Run automatically during the Docker/CI build; locally: `APP_VERSION=1.2.3 node scripts/set-version.mjs`.
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const version = process.env.APP_VERSION || '0.0.0-dev';
const target = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'version.ts');

writeFileSync(
  target,
  `// Generated at build time by scripts/set-version.mjs — do not edit by hand.
export const APP_VERSION = '${version}';
`,
);

console.log(`set-version: wrote ${target} (APP_VERSION=${version})`);
