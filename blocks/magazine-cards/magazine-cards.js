import { createOptimizedPicture } from '../../scripts/aem.js';

/*
 * magazine-cards — dynamic, index-driven magazine article card grid.
 *
 * Mirrors blocks/adventure-cards: instead of authored/hardcoded cards, this
 * block fetches the magazine query-index (built by helix-query.yaml over
 * /us/en/magazine/**) at runtime and renders one card per article — image +
 * linked title + description, each linking to the article. The index is the
 * single source of truth; no article content lives in this JS or the authored
 * document. Powers the homepage "Recent Articles" grid.
 *
 * It renders the SAME `.cards > ul > li` structure the article `cards` block
 * uses (and adds the `cards` class), but owns its own grid CSS in
 * magazine-cards.css — EDS loads a block's CSS by its registered name, so this
 * block can't rely on cards.css being present on the page.
 *
 * Authoring:
 *   | Magazine Cards |
 *   | limit | 4 |            (optional; omit = show all)
 * A `limit` row (or a numeric first cell) caps the number of cards — e.g. the
 * homepage "Recent Articles" shows 4.
 *
 * Order is author-controlled per article: each article carries a numeric
 * `order` metadata (exposed as the index `order` column). Cards render sorted by
 * that order ascending, THEN the limit is applied. Articles with no order sort
 * last.
 */

const INDEX_PATH = '/us/en/magazine/query-index.json';

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
 * Fetch the magazine query-index. Returns [] on any failure so the block
 * degrades to an empty (not broken) grid.
 * @returns {Promise<Array>} index rows
 */
async function fetchArticles() {
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
 * Sort index rows by their author-controlled `order` (meta[name="order"] on the
 * article, exposed as an index column). Lower order first; rows with no valid
 * order sort after all ordered rows, keeping their original index order (stable)
 * so the sequence is deterministic. This makes a `limit` meaningful — e.g.
 * limit=4 renders the four lowest-order articles.
 * @param {Array} rows index rows
 * @returns {Array} a new, sorted array
 */
function sortByOrder(rows) {
  const rank = (row) => {
    const n = parseInt(row.order, 10);
    return Number.isNaN(n) ? Infinity : n;
  };
  return rows
    .map((row, i) => ({ row, i }))
    .sort((a, b) => rank(a.row) - rank(b.row) || a.i - b.i)
    .map((entry) => entry.row);
}

/**
 * Build one card <li> matching the article cards markup.
 * @param {object} row an index row {path,title,description,image}
 * @returns {Element} the <li>
 */
function buildCard(row) {
  const li = document.createElement('li');

  // image cell — wrapped in a link to the article (aria-hidden: the title link
  // below is the accessible/keyboard target, matching the article cards)
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
 * loads and decorates the magazine-cards block
 * @param {Element} block
 */
export default async function decorate(block) {
  const limit = readLimit(block);
  block.textContent = '';

  // render the same .cards markup (magazine-cards.css scopes the grid visuals)
  block.classList.add('cards');

  const articles = await fetchArticles();
  if (!articles.length) {
    // graceful empty state — no broken layout, no error surfaced to the user
    return;
  }

  // order by the author-controlled `order` column first, then cap to `limit`
  const ordered = sortByOrder(articles);
  const rows = limit > 0 ? ordered.slice(0, limit) : ordered;
  const ul = document.createElement('ul');
  rows.forEach((row) => ul.append(buildCard(row)));
  block.append(ul);
}
