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

/**
 * Given HTML and the index of a `<div ...>` opening tag, return the index just
 * past its matching `</div>` (depth-balanced over all nested divs). Returns -1
 * if unbalanced.
 * @param {string} html
 * @param {number} openStart index of the '<' of the opening <div ...>
 * @returns {number} index just after the matching </div>, or -1
 */
function matchingDivEnd(html, openStart) {
  const tagRe = /<(\/?)div\b[^>]*>/gi;
  tagRe.lastIndex = openStart;
  let depth = 0;
  let m = tagRe.exec(html);
  while (m) {
    depth += m[1] ? -1 : 1;
    if (depth === 0) return tagRe.lastIndex;
    m = tagRe.exec(html);
  }
  return -1;
}

/**
 * Swap an authored adventure `cards` grid for the dynamic `adventure-cards`
 * block, so the homepage teaser and the Adventures listing render from the
 * query-index instead of hardcoded content. Finds the `<div class="cards">`
 * whose links point at `/adventures/…`, then removes the WHOLE element up to its
 * depth-matched `</div>` (the grid nests a div per card, so a naive regex would
 * orphan the card divs) and replaces it with `<div class="adventure-cards">…`.
 * On the homepage a `limit` row caps the teaser at 4; the listing shows all.
 * Returns the body unchanged if no adventure cards grid is present.
 * @param {string} bodyHtml the fragment HTML
 * @param {string} rel the output path (e.g. us/en.html)
 * @returns {string}
 */
function wireAdventureCards(bodyHtml, rel) {
  const isHome = rel === 'us/en.html';
  const isListing = rel === 'us/en/adventures.html';
  if (!isHome && !isListing) return bodyHtml;

  const openRe = /<div class="cards">/gi;
  let m = openRe.exec(bodyHtml);
  while (m) {
    const start = m.index;
    const end = matchingDivEnd(bodyHtml, start);
    if (end === -1) break;
    const block = bodyHtml.slice(start, end);
    if (/\/adventures\/[a-z]/.test(block)) {
      const limitRow = isHome ? '<div><div>limit</div><div>4</div></div>' : '';
      const replacement = `<div class="adventure-cards">${limitRow}</div>`;
      return bodyHtml.slice(0, start) + replacement + bodyHtml.slice(end);
    }
    openRe.lastIndex = end; // skip past this (non-adventure) cards block
    m = openRe.exec(bodyHtml);
  }
  return bodyHtml;
}

const files = walk(join(contentDir, 'us', 'en'));
// the homepage lives at content/us/en.plain.html — a SIBLING of the us/en/
// directory the walk covers — so add it explicitly (publishes to /us/en).
const homepageFile = join(contentDir, 'us', 'en.plain.html');
try {
  if (statSync(homepageFile).isFile() && !files.includes(homepageFile)) {
    files.push(homepageFile);
  }
} catch (e) { /* homepage file absent — skip */ }
let count = 0;
for (const file of files) {
  const rel = relative(contentDir, file).replace(/\.plain\.html$/, '.html');
  let body = readFileSync(file, 'utf8').trim();
  body = wireAdventureCards(body, rel);
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
