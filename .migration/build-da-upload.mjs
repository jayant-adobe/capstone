#!/usr/bin/env node
/**
 * Wrap each imported `.plain.html` fragment in the Document Authoring page shell
 * (<body><header></header><main>…</main><footer></footer></body>) and write it
 * to .migration/da-upload/ preserving the content tree path.
 *
 * The DA source API path mirrors the content path (e.g. content/us/en.plain.html
 * -> DA source /jayant-adobe/capstone/us/en.html). We keep the tree in the
 * output dir so the uploader can POST each to its matching DA path.
 */
import {
  readdirSync, readFileSync, writeFileSync, mkdirSync, statSync,
} from 'fs';
import { join, dirname, relative } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..');
const contentDir = join(repoRoot, 'content');
const outDir = join(__dirname, 'da-upload');

// Only page content under content/us/en (skip nav/footer/index/block-library/reports).
function walk(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, acc);
    else if (name.endsWith('.plain.html')) acc.push(full);
  }
  return acc;
}

const files = walk(join(contentDir, 'us', 'en'));
let count = 0;
for (const file of files) {
  const rel = relative(contentDir, file).replace(/\.plain\.html$/, '.html');
  const body = readFileSync(file, 'utf8').trim();
  const doc = `<body>
  <header></header>
  <main>
${body}
  </main>
  <footer></footer>
</body>
`;
  const outPath = join(outDir, rel);
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, doc);
  count += 1;
  console.log(`wrote ${relative(repoRoot, outPath)}`);
}
console.log(`\n${count} DA-upload document(s) written to ${relative(repoRoot, outDir)}/`);
