/* eslint-disable */
/* global WebImporter */
/**
 * Parser for variant: adventure-cards
 * Base block: cards (dynamic, index-driven variant)
 * Source: homepage "Where do you want to go?" grid
 *   Instance (routed in page-templates.json):
 *     - homepage: main.cmp-layout-container--fixed:nth-of-type(2) div.image-list.list
 *                 (adventure recommendations → limit 4, sort by `order`)
 * Generated: 2026-08-12
 *
 * WHY THIS PARSER EMITS NO CARDS
 * blocks/adventure-cards renders its cards at RUNTIME from the adventures
 * query-index (/us/en/adventures/query-index.json, built by helix-query.yaml
 * over /us/en/adventures/**). Adventure content is NOT authored into the page —
 * the index is the single source of truth. So this parser must NOT scrape the
 * source grid's cards (that would re-introduce the hardcoded cards the dynamic
 * block replaced); it emits ONLY the block's small config table, matching the
 * deployed content:
 *   Homepage "Where do you want to go?": | Adventure Cards |
 *                                        | limit | 4 |
 *
 * blocks/adventure-cards.js reads a single numeric `limit` (a `| limit | 4 |`
 * row or a bare number); 0/absent means show all. The homepage teaser caps at 4.
 * A grid imported from a deeper URL (e.g. a future full adventures listing)
 * emits an empty config = show all — keyed off the import URL, not DOM position,
 * so it stays correct regardless of where the grid sits on the page.
 *
 * NOTE ON VALIDATION: like magazine-cards/tabs-filter, output is a config table,
 * not the scraped cards, so the source-completeness score is expectedly low — a
 * known, accepted false negative for index-driven blocks. The config table is
 * the complete, correct input blocks/adventure-cards.js decorates.
 */

/**
 * Number of path segments in the imported page URL (e.g. /us/en → 2). Used to
 * tell the homepage (locale root) from a deeper listing page. Returns 0 on an
 * unparseable URL.
 * @param {string} url the page URL being imported (payload.url)
 * @returns {number}
 */
function pathSegmentCount(url) {
  try {
    return new URL(url).pathname
      .replace(/\.html?$/, '')
      .split('/')
      .filter(Boolean).length;
  } catch (e) {
    return 0;
  }
}

export default function parse(element, { document, url }) {
  // Homepage teaser lives on the locale root (/us/en → 2 segments) and shows
  // four cards; a deeper page (full listing) shows all.
  const isHomepageTeaser = pathSegmentCount(url) <= 2;

  const cells = [];
  if (isHomepageTeaser) {
    const key = document.createElement('div');
    key.textContent = 'limit';
    const val = document.createElement('div');
    val.textContent = '4';
    cells.push([key, val]);
  }
  // else: no config row → block shows all adventures (empty config table).

  const block = WebImporter.Blocks.createBlock(document, { name: 'adventure-cards', cells });
  element.replaceWith(block);
}
