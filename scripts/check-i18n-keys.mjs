// Issue #33: every translation key the app uses exists in public/i18n/en-GB.json, and every key
// there is used. Keys are found as string literals ('nav.posts', 'compose.title', ...) in src/app.
// Runs as part of `npm run lint`.
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const source = JSON.parse(readFileSync(join(root, 'public/i18n/en-GB.json'), 'utf-8'));

function flatten(obj, prefix = '') {
  return Object.entries(obj).flatMap(([k, v]) =>
    typeof v === 'object' ? flatten(v, `${prefix}${k}.`) : [`${prefix}${k}`],
  );
}

function sourceFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const path = join(dir, e.name);
    if (e.isDirectory()) return sourceFiles(path);
    return /\.(ts|html)$/.test(e.name) && !e.name.endsWith('.spec.ts') ? [path] : [];
  });
}

const defined = new Set(flatten(source));
const namespaces = Object.keys(source).join('|');
const KEY = new RegExp(`'((?:${namespaces})(?:\\.[A-Za-z0-9]+)+)'`, 'g');

const used = new Map();
for (const file of sourceFiles(join(root, 'src/app'))) {
  readFileSync(file, 'utf-8')
    .split('\n')
    .forEach((line, i) => {
      for (const [, key] of line.matchAll(KEY)) {
        if (!used.has(key)) used.set(key, `${relative(root, file)}:${i + 1}`);
      }
    });
}

const missing = [...used].filter(([key]) => !defined.has(key));
const unused = [...defined].filter((key) => !used.has(key));
for (const [key, where] of missing) console.error(`missing translation: ${key} (${where})`);
for (const key of unused) console.error(`unused translation: ${key}`);
if (missing.length || unused.length) process.exit(1);
console.log(`check-i18n-keys: ${defined.size} keys, all used and defined`);
