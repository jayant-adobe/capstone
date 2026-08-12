import { createOptimizedPicture } from '../../scripts/aem.js';
import queryIndex from '../../scripts/query-index.js';

/*
 * magazine-cards — dynamic, index-driven magazine article card grid.
 *
 * Mirrors blocks/adventure-cards: instead of authored/hardcoded cards, this
 * block fetches the magazine query-index (built by helix-query.yaml over
 * /us/en/magazine/**) at runtime and renders one card per article — image +
 * linked title + description, each linking to the article. The index is the
 * single source of truth; no article content lives in this JS or the authored
 * document. Powers the homepage "Recent Articles" grid and the magazine
 * landing "All Articles" grid.
 *
 * It renders the SAME `.cards > ul > li` structure the article `cards` block
 * uses (and adds the `cards` class), but owns its own grid CSS in
 * magazine-cards.css — EDS loads a block's CSS by its registered name, so this
 * block can't rely on cards.css being present on the page.
 *
 * Authoring:
 *   | Magazine Cards |
 *   | limit | 4 |                              (optional; omit = show all)
 *   | order-field | listOrder |                (optional; which index column to sort by)
 *   | source | /us/en/magazine/query-index.json | (optional; which index to fetch)
 * A `limit` row (or a numeric first cell) caps the number of cards — the
 * homepage "Recent Articles" shows 4; the landing "All Articles" shows all.
 * `source` overrides which query-index the grid reads (default is the en-US
 * magazine index) — so an author can repoint the grid without a code change.
 *
 * Order is author-controlled per article. Each article carries two order metas
 * exposed as index columns: `order` (homepage teaser sequence) and `listOrder`
 * (magazine landing sequence) — the same articles appear in different orders on
 * the two pages. `order-field` selects which column this instance sorts by
 * (default `order`). Cards render sorted ascending, THEN the limit is applied;
 * articles with no value for that column sort last.
 */

// Default query-index path. Authors may override it per instance with a
// `| source | <path> |` row (see readConfig) — e.g. to point a grid at a
// different locale's index — without touching this code.
const INDEX_PATH = '/us/en/magazine/query-index.json';

/**
 * Read the block's authored key/value rows into a config object.
 * Recognised keys:
 *   - `limit` (number): cap the number of cards (0/absent = show all)
 *   - `order-field` (string): which index column to sort by; defaults to
 *     `order` (homepage teaser). The magazine landing passes `listOrder` so the
 *     two grids can order the same articles independently.
 *   - `source` (string): the query-index path to fetch; defaults to
 *     INDEX_PATH. Lets an author repoint the grid at a different index
 *     (e.g. another locale) straight from the document. A blank value is
 *     ignored so the default still applies.
 * A bare numeric first cell (no key) is also accepted as the limit.
 * @param {Element} block
 * @returns {{limit: number, orderField: string, source: string}}
 */
function readConfig(block) {
  const cfg = { limit: 0, orderField: 'order', source: INDEX_PATH };
  block.querySelectorAll(':scope > div').forEach((row) => {
    const cells = [...row.children].map((c) => c.textContent.trim());
    const key = (cells[0] || '').toLowerCase();
    const val = cells[1] || '';
    if (key === 'limit') {
      const n = (val.match(/\d+/) || [])[0];
      if (n) cfg.limit = parseInt(n, 10);
    } else if (key === 'order-field' && val) {
      cfg.orderField = val;
    } else if (key === 'source' && val) {
      cfg.source = val;
    } else if (cells.length === 1) {
      // bare numeric row → limit
      const n = (key.match(/\d+/) || [])[0];
      if (n) cfg.limit = parseInt(n, 10);
    }
  });
  return cfg;
}

/**
 * Fetch a magazine query-index. Delegates to the shared queryIndex helper,
 * which follows the sheet's pagination so the FULL set of articles is returned
 * even if the index grows past a single page (500 rows). Returns [] on any
 * failure so the block degrades to an empty (not broken) grid.
 * @param {string} indexPath the query-index path to fetch (default INDEX_PATH)
 * @returns {Promise<Array>} index rows
 */
async function fetchArticles(indexPath = INDEX_PATH) {
  return queryIndex(indexPath);
}

/**
 * Sort index rows by an author-controlled order column (default `order`; the
 * landing uses `listOrder`). Lower value first; rows with no valid value sort
 * after all ordered rows, keeping their original index order (stable) so the
 * sequence is deterministic. This makes a `limit` meaningful — e.g. limit=4
 * renders the four lowest-order articles.
 * @param {Array} rows index rows
 * @param {string} field the index column to sort by
 * @returns {Array} a new, sorted array
 */
function sortByOrder(rows, field) {
  const rank = (row) => {
    const n = parseInt(row[field], 10);
    return Number.isNaN(n) ? Infinity : n;
  };
  return rows
    .map((row, i) => ({ row, i }))
    .sort((a, b) => rank(a.row) - rank(b.row) || a.i - b.i)
    .map((entry) => entry.row);
}

/**
 * Build the card's image element. Prefer the source per-article thumbnail
 * (`cardImage`) over the article's og:image (`image`, the hero). Same-origin
 * images are optimized via createOptimizedPicture; a cross-origin cardImage
 * (the source's wknd.site coreimg thumbnail) is kept as a plain <img> —
 * createOptimizedPicture is path-only and would mangle an external URL (same
 * reason the cards-byline avatar is left un-optimized).
 * @param {object} row index row
 * @returns {Element|null} <picture> or <img>, or null if no image
 */
function buildCardImage(row) {
  const src = row.cardImage || row.image;
  if (!src) return null;
  let sameOrigin = false;
  try {
    sameOrigin = new URL(src, window.location.href).origin === window.location.origin;
  } catch (e) {
    sameOrigin = false;
  }
  if (sameOrigin) {
    return createOptimizedPicture(src, row.title || '', false, [{ width: '750' }]);
  }
  const img = document.createElement('img');
  img.src = src;
  img.alt = row.title || '';
  img.loading = 'lazy';
  return img;
}

/**
 * Build one card <li> matching the article cards markup.
 * @param {object} row an index row {path,title,description,cardDescription,image,cardImage}
 * @returns {Element} the <li>
 */
function buildCard(row) {
  const li = document.createElement('li');

  // image cell — wrapped in a link to the article (aria-hidden: the title link
  // below is the accessible/keyboard target, matching the article cards)
  const imageWrap = document.createElement('div');
  imageWrap.className = 'cards-card-image';
  const pic = buildCardImage(row);
  if (pic) {
    const link = document.createElement('a');
    link.href = row.path;
    link.setAttribute('aria-hidden', 'true');
    link.setAttribute('tabindex', '-1');
    link.append(pic);
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
  // prefer the author's short card blurb (meta[name="card-description"]) over
  // the full page description when one is set for this article
  const blurb = row.cardDescription || row.description;
  if (blurb) {
    const p = document.createElement('p');
    p.textContent = blurb;
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
  const { limit, orderField, source } = readConfig(block);
  block.textContent = '';

  // render the same .cards markup (magazine-cards.css scopes the grid visuals)
  block.classList.add('cards');

  const articles = await fetchArticles(source);
  if (!articles.length) {
    // graceful empty state — no broken layout, no error surfaced to the user
    return;
  }

  // order by the author-controlled order column first, then cap to `limit`
  const ordered = sortByOrder(articles, orderField);
  const rows = limit > 0 ? ordered.slice(0, limit) : ordered;
  const ul = document.createElement('ul');
  rows.forEach((row) => ul.append(buildCard(row)));
  block.append(ul);
}
