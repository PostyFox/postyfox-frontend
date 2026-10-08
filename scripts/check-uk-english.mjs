// Issue #32: the UI is written in UK English, ready for localisation. Fails on US spellings in
// src/ templates, styles, strings and comments, and in the public/i18n translation files. Runs as
// part of `npm run lint`.
// `color`/`center`/`centered` are left out: CSS and Bootstrap use them.
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const US_SPELLING =
  /\b(?:[A-Z]?[a-z]+(?:iz|yz)(?:e|es|ed|ing|ation|ations|ational|er|ers|able)|[Bb]ehaviors?|[Ff]avorites?|[Cc]atalogs?|[Cc]anceled|[Cc]anceling|[Ll]abeled|[Mm]odeled)\b/g;
// Real -ize words in UK English, plus the HTTP header name.
const ALLOWED = new Set([
  'size',
  'sizes',
  'sized',
  'resize',
  'resized',
  'resizes',
  'resizing',
  'oversized',
  'prize',
  'seize',
  'Authorization',
]);

function sourceFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const path = join(dir, e.name);
    if (e.isDirectory()) return sourceFiles(path);
    return /\.(ts|html|scss|json)$/.test(e.name) ? [path] : [];
  });
}

const found = [join(root, 'src'), join(root, 'public/i18n')].flatMap(sourceFiles).flatMap((file) =>
  readFileSync(file, 'utf-8')
    .split('\n')
    .flatMap((line, i) =>
      (line.match(US_SPELLING) ?? [])
        .filter((w) => !ALLOWED.has(w))
        .map((w) => `${relative(root, file)}:${i + 1}  ${w}`),
    ),
);

if (found.length > 0) {
  console.error(`US spellings found (use UK English, issue #32):\n${found.join('\n')}`);
  process.exit(1);
}
console.log('check-uk-english: no US spellings found');
