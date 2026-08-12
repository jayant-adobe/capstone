import queryIndex from '../../scripts/query-index.js';

/*
 * faq-accordion — dynamic, index-driven FAQ accordion.
 *
 * Instead of authored question/answer rows, this block fetches the FAQ
 * query-index (built by helix-query.yaml over /us/en/faqs/**) at runtime and
 * renders one <details> accordion item per FAQ page — the page's title is the
 * question, its description the answer. The index is the single source of
 * truth; no FAQ text lives in this JS or the authored landing document. Adding
 * or editing a FAQ page updates the accordion automatically.
 *
 * It renders the SAME `details.accordion-item > summary + div.accordion-item-body`
 * structure the authored `accordion` block produces, and adds the `accordion`
 * class so blocks/accordion/accordion.css styles it — but owns a small
 * self-contained fallback in faq-accordion.css (EDS loads a block's CSS by its
 * registered name, so this block can't rely on accordion.css being present).
 *
 * Authoring:
 *   | FAQ Accordion |
 *   | source | /us/en/faqs/query-index.json |   (optional; overrides default)
 * The `source` row makes the query-index path explicit in the document (EDS
 * best practice); when absent the block falls back to INDEX_PATH.
 */

// Default FAQ query-index. Authors may override per instance with a
// `| source | <path> |` row so the data source is explicit in the document.
const INDEX_PATH = '/us/en/faqs/query-index.json';

/**
 * Read the block's authored config rows. Recognises `source` (the query-index
 * path to fetch; defaults to INDEX_PATH). A blank value is ignored.
 * @param {Element} block
 * @returns {{source: string}}
 */
function readConfig(block) {
  const cfg = { source: INDEX_PATH };
  block.querySelectorAll(':scope > div').forEach((row) => {
    const cells = [...row.children].map((c) => c.textContent.trim());
    const [key, val] = cells;
    if ((key || '').toLowerCase() === 'source' && val) cfg.source = val;
  });
  return cfg;
}

/**
 * Sort index rows by author-controlled numeric `order` ascending; rows with no
 * valid order sort last, keeping their original (stable) sequence.
 * @param {Array} rows
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
 * Build one accordion <details> item from an index row (title = question,
 * description = answer), matching the authored accordion markup.
 * @param {object} row index row {title, description}
 * @returns {Element} the <details>
 */
function buildItem(row) {
  const details = document.createElement('details');
  details.className = 'accordion-item';

  const summary = document.createElement('summary');
  summary.className = 'accordion-item-label';
  const q = document.createElement('p');
  q.textContent = row.title || '';
  summary.append(q);

  const body = document.createElement('div');
  body.className = 'accordion-item-body';
  const a = document.createElement('p');
  a.textContent = row.description || '';
  body.append(a);

  details.append(summary, body);
  return details;
}

/**
 * loads and decorates the faq-accordion block
 * @param {Element} block
 */
export default async function decorate(block) {
  const { source } = readConfig(block);
  block.textContent = '';

  // render the same markup the authored accordion produces so its styling applies
  block.classList.add('accordion');

  const rows = await queryIndex(source);
  if (!rows.length) {
    // graceful empty state — no broken layout, no error surfaced to the user
    return;
  }

  sortByOrder(rows).forEach((row) => block.append(buildItem(row)));
}
