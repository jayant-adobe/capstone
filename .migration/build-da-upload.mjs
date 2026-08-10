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
 * Swap an authored `cards` grid for a dynamic, index-driven cards block, so a
 * page renders from a query-index instead of hardcoded content. Finds the first
 * `<div class="cards">` whose links match `linkPattern`, removes the WHOLE
 * element up to its depth-matched `</div>` (the grid nests a div per card, so a
 * naive regex would orphan the card divs) and replaces it with
 * `<div class="{blockClass}">` — with an optional `| limit | N |` row.
 * Returns the body unchanged if no matching grid is present.
 * @param {string} bodyHtml the fragment HTML
 * @param {object} opts
 * @param {RegExp} opts.linkPattern identifies the target grid by its card links
 * @param {string} opts.blockClass the dynamic block class to insert
 * @param {number} [opts.limit] optional card cap (emits a `| limit | N |` row)
 * @returns {string}
 */
function wireDynamicCards(bodyHtml, { linkPattern, blockClass, limit }) {
  const openRe = /<div class="cards">/gi;
  let m = openRe.exec(bodyHtml);
  while (m) {
    const start = m.index;
    const end = matchingDivEnd(bodyHtml, start);
    if (end === -1) break;
    const block = bodyHtml.slice(start, end);
    if (linkPattern.test(block)) {
      const limitRow = limit ? `<div><div>limit</div><div>${limit}</div></div>` : '';
      const replacement = `<div class="${blockClass}">${limitRow}</div>`;
      return bodyHtml.slice(0, start) + replacement + bodyHtml.slice(end);
    }
    openRe.lastIndex = end; // skip past this (non-matching) cards block
    m = openRe.exec(bodyHtml);
  }
  return bodyHtml;
}

/**
 * Replace the authored adventure `cards` grid with the dynamic `adventure-cards`
 * block on the homepage teaser (limit 4) and the full Adventures listing.
 * @param {string} bodyHtml
 * @param {string} rel output path (e.g. us/en.html)
 * @returns {string}
 */
function wireAdventureCards(bodyHtml, rel) {
  const isHome = rel === 'us/en.html';
  const isListing = rel === 'us/en/adventures.html';
  if (!isHome && !isListing) return bodyHtml;
  return wireDynamicCards(bodyHtml, {
    linkPattern: /\/adventures\/[a-z]/,
    blockClass: 'adventure-cards',
    limit: isHome ? 4 : 0,
  });
}

/**
 * Replace the authored magazine `cards` grid ("Recent Articles") with the
 * dynamic `magazine-cards` block on the homepage (limit 4).
 * @param {string} bodyHtml
 * @param {string} rel output path (e.g. us/en.html)
 * @returns {string}
 */
function wireMagazineCards(bodyHtml, rel) {
  if (rel !== 'us/en.html') return bodyHtml;
  return wireDynamicCards(bodyHtml, {
    linkPattern: /\/magazine\/[a-z]/,
    blockClass: 'magazine-cards',
    limit: 4,
  });
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
  body = wireMagazineCards(body, rel);
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
