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
 * `<div class="{blockClass}">` — with optional `| limit | N |` and
 * `| order-field | … |` rows. Returns the body unchanged if no matching grid.
 * @param {string} bodyHtml the fragment HTML
 * @param {object} opts
 * @param {RegExp} opts.linkPattern identifies the target grid by its card links
 * @param {string} opts.blockClass the dynamic block class to insert
 * @param {number} [opts.limit] optional card cap (emits a `| limit | N |` row)
 * @param {string} [opts.orderField] index column to sort by (emits an
 *   `| order-field | … |` row); omit to use the block's default (`order`)
 * @returns {string}
 */
function wireDynamicCards(bodyHtml, {
  linkPattern, blockClass, limit, orderField,
}) {
  const openRe = /<div class="cards">/gi;
  let m = openRe.exec(bodyHtml);
  while (m) {
    const start = m.index;
    const end = matchingDivEnd(bodyHtml, start);
    if (end === -1) break;
    const block = bodyHtml.slice(start, end);
    if (linkPattern.test(block)) {
      const limitRow = limit ? `<div><div>limit</div><div>${limit}</div></div>` : '';
      const orderRow = orderField ? `<div><div>order-field</div><div>${orderField}</div></div>` : '';
      const replacement = `<div class="${blockClass}">${limitRow}${orderRow}</div>`;
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
 * Replace an authored magazine article `cards` grid with the dynamic
 * `magazine-cards` block:
 *   - homepage "Recent Articles" → sort by `order`, limit 4
 *   - magazine landing "All Articles" → sort by `listOrder`, show all
 * The landing's "Members Only" locked cards have no `/magazine/` article links,
 * so `linkPattern` never matches them — they stay authored (dimmed + padlock).
 * @param {string} bodyHtml
 * @param {string} rel output path (e.g. us/en.html)
 * @returns {string}
 */
function wireMagazineCards(bodyHtml, rel) {
  const isHome = rel === 'us/en.html';
  const isListing = rel === 'us/en/magazine.html';
  if (!isHome && !isListing) return bodyHtml;
  return wireDynamicCards(bodyHtml, {
    linkPattern: /\/magazine\/[a-z]/,
    blockClass: 'magazine-cards',
    limit: isHome ? 4 : 0,
    orderField: isHome ? undefined : 'listOrder',
  });
}

/**
 * Replace the authored About Us `cards-profile` blocks (one per person) with two
 * dynamic `profile-cards` blocks that render from /us/en/contributors.json:
 * the contributor profiles (before the "WKND Guides" heading) become
 * profile-cards(team=contributor); the guide profiles become
 * profile-cards(team=guide). Each authored block is a `<div class="cards-profile">`
 * — remove the whole run of them in each section and drop in one block.
 * @param {string} bodyHtml
 * @param {string} rel output path (e.g. us/en/about-us.html)
 * @returns {string}
 */
function wireProfileCards(bodyHtml, rel) {
  if (rel !== 'us/en/about-us.html') return bodyHtml;

  // Replace a maximal run of adjacent `<div class="cards-profile">…</div>`
  // (ignoring whitespace between them) starting at `fromIndex` with a single
  // profile-cards block for `team`. Returns { html, end } or null if none there.
  const replaceRun = (html, fromIndex, team) => {
    const openRe = /<div class="cards-profile">/gi;
    openRe.lastIndex = fromIndex;
    const m = openRe.exec(html);
    if (!m) return null;
    const runStart = m.index;
    let cursor = runStart;
    // consume consecutive cards-profile blocks (only whitespace allowed between)
    for (;;) {
      const end = matchingDivEnd(html, cursor);
      if (end === -1) break;
      const after = html.slice(end);
      const next = after.match(/^\s*<div class="cards-profile">/i);
      if (next) { cursor = end + after.indexOf('<div'); } else { cursor = end; break; }
    }
    const block = `<div class="profile-cards"><div><div>team</div><div>${team}</div></div></div>`;
    return { html: html.slice(0, runStart) + block + html.slice(cursor), runStart, blockLen: block.length };
  };

  let out = bodyHtml;
  const first = replaceRun(out, 0, 'contributor');
  if (first) {
    out = first.html;
    // search for the guides run AFTER the just-inserted contributor block
    const second = replaceRun(out, first.runStart + first.blockLen, 'guide');
    if (second) out = second.html;
  }
  return out;
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
  body = wireProfileCards(body, rel);
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
