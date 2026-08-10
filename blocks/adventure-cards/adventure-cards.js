import { createOptimizedPicture, toClassName } from '../../scripts/aem.js';

/*
 * adventure-cards — dynamic, index-driven adventure card grid.
 *
 * Instead of authored/hardcoded cards, this block fetches the adventures
 * query-index (built by helix-query.yaml over /us/en/adventures/**) at runtime
 * and renders one card per adventure: image + linked title + description, each
 * linking to the adventure detail page. The index is the single source of truth
 * — no adventure content lives in this JS or in the authored document.
 *
 * It renders the SAME `.cards > ul > li` structure the article `cards` block
 * uses, so it inherits blocks/cards/cards.css styling (image ratio, uppercase
 * titles, single-line descriptions, 14px/32px gaps) and works with the
 * tabs-filter block, which reads each card's `data-categories`.
 *
 * Authoring:
 *   | Adventure Cards |
 *   | limit | 4 |            (optional; omit = show all)
 * A `limit` row (or a numeric first cell) caps the number of cards — e.g. the
 * homepage teaser shows 4, the full Adventures listing shows all.
 */

const INDEX_PATH = '/us/en/adventures/query-index.json';

/**
 * Read an optional numeric limit from the block's authored rows
 * (`| limit | 4 |` or a bare number), then empty the block for re-render.
 * @param {Element} block
 * @returns {number} the limit, or 0 for "no limit"
 */
function readLimit(block) {
  let limit = 0;
  block.querySelectorAll(':scope > div').forEach((row) => {
    const cells = [...row.children];
    const text = cells.map((c) => c.textContent.trim()).join(' ');
    const num = text.match(/\d+/);
    if (num) limit = parseInt(num[0], 10);
  });
  return limit;
}

/**
 * Fetch the adventures query-index. Returns [] on any failure so the block
 * degrades to an empty (not broken) grid.
 * @returns {Promise<Array>} index rows
 */
async function fetchAdventures() {
  try {
    const resp = await fetch(INDEX_PATH);
    if (!resp.ok) return [];
    const json = await resp.json();
    return Array.isArray(json.data) ? json.data : [];
  } catch (e) {
    return [];
  }
}

/**
 * Build one card <li> matching the article cards markup so cards.css applies.
 * @param {object} row an index row {path,title,description,image,category}
 * @returns {Element} the <li>
 */
function buildCard(row) {
  const li = document.createElement('li');

  // categories → data-categories (space-separated class names) for tabs-filter
  const cats = (row.category || '')
    .split(',')
    .map((c) => toClassName(c.trim()))
    .filter(Boolean);
  if (cats.length) li.dataset.categories = cats.join(' ');

  // image cell — wrapped in a link to the detail page (aria-hidden: the title
  // link below is the accessible/keyboard target, matching the article cards)
  const imageWrap = document.createElement('div');
  imageWrap.className = 'cards-card-image';
  if (row.image) {
    const link = document.createElement('a');
    link.href = row.path;
    link.setAttribute('aria-hidden', 'true');
    link.setAttribute('tabindex', '-1');
    link.append(createOptimizedPicture(row.image, row.title || '', false, [{ width: '750' }]));
    imageWrap.append(link);
  }

  // body cell — linked title (h3) + description (p)
  const body = document.createElement('div');
  body.className = 'cards-card-body';
  const h3 = document.createElement('h3');
  const titleLink = document.createElement('a');
  titleLink.href = row.path;
  titleLink.textContent = row.title || '';
  h3.append(titleLink);
  body.append(h3);
  if (row.description) {
    const p = document.createElement('p');
    p.textContent = row.description;
    body.append(p);
  }

  li.append(imageWrap, body);
  return li;
}

/**
 * loads and decorates the adventure-cards block
 * @param {Element} block
 */
export default async function decorate(block) {
  const limit = readLimit(block);
  block.textContent = '';

  // render the same .cards markup so cards.css + tabs-filter apply
  block.classList.add('cards');

  const adventures = await fetchAdventures();
  if (!adventures.length) {
    // graceful empty state — no broken layout, no error surfaced to the user
    return;
  }

  const rows = limit > 0 ? adventures.slice(0, limit) : adventures;
  const ul = document.createElement('ul');
  rows.forEach((row) => ul.append(buildCard(row)));
  block.append(ul);

  // let a following tabs-filter (if present) re-scan now that cards exist
  block.dispatchEvent(new CustomEvent('adventure-cards:rendered', { bubbles: true }));
}
