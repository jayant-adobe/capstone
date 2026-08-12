/* eslint-disable */
/* global WebImporter */
/**
 * Parser for variant: magazine-cards
 * Base block: cards (dynamic, index-driven variant)
 * Source: homepage "Recent Articles" grid + magazine landing "All Articles" grid
 *   Instances (routed per template in page-templates.json):
 *     - homepage:  main.cmp-layout-container--fixed:nth-of-type(1) div.image-list.list
 *                  (Recent Articles → limit 4, sort by `order`)
 *     - landing:   div.image-list.list
 *                  (All Articles → all, sort by `listOrder`)
 * Generated: 2026-08-12
 *
 * WHY THIS PARSER EMITS NO CARDS
 * blocks/magazine-cards renders its cards at RUNTIME from the magazine
 * query-index (/us/en/magazine/query-index.json, built by helix-query.yaml over
 * /us/en/magazine/**). The article content is therefore NOT authored into the
 * page — the index is the single source of truth. So, unlike the static `cards`
 * parser, this parser must NOT scrape the source grid's articles; doing so would
 * re-introduce the hardcoded cards the dynamic block was created to replace.
 *
 * Instead it emits ONLY the block's small config table, matching what the
 * deployed content authors:
 *   Homepage "Recent Articles":      | Magazine Cards |
 *                                    | limit | 4 |
 *   Magazine landing "All Articles": | Magazine Cards |
 *                                    | order-field | listOrder |
 *
 * WHICH CONFIG — keyed off the IMPORT URL, not DOM position.
 * The homepage and the magazine landing each carry a magazine grid, but they
 * need different configs. DOM position can't tell them apart: on the landing the
 * grid is inside the FIRST (and only) fixed layout container, exactly like the
 * homepage teaser grid. The reliable discriminator is the page being imported —
 * html2md passes it as payload.url and each template imports a distinct URL:
 *   homepage  → /us/en          (2 path segments)  → limit 4, order
 *   landing   → /us/en/magazine (3 path segments)  → order-field listOrder
 * A grid on the locale root (≤2 segments after the domain) is the homepage
 * teaser; anything deeper is the landing "All Articles". This mirrors
 * blocks/magazine-cards.js readConfig (limit + order-field; default order-field
 * `order`).
 *
 * NOTE ON VALIDATION: the completeness check compares this block's output to the
 * full source grid (which contains the scraped article cards). Because the
 * dynamic block deliberately emits only a config table, that score is expected
 * to be low — a known, accepted false negative for index-driven blocks (same as
 * adventure-cards and tabs-filter). The config table is the complete, correct
 * input blocks/magazine-cards.js decorates.
 */

/**
 * Number of path segments in the imported page URL (e.g. /us/en → 2,
 * /us/en/magazine → 3). Used to tell the homepage (locale root) from the
 * magazine landing. Returns 0 on an unparseable URL.
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
  // Homepage teaser lives on the locale root (/us/en → 2 segments); the magazine
  // landing "All Articles" grid is one level deeper (/us/en/magazine → 3).
  const isHomepageTeaser = pathSegmentCount(url) <= 2;

  const cells = [];
  if (isHomepageTeaser) {
    // Homepage "Recent Articles": show the four lowest-`order` articles.
    const key = document.createElement('div');
    key.textContent = 'limit';
    const val = document.createElement('div');
    val.textContent = '4';
    cells.push([key, val]);
  } else {
    // Magazine landing "All Articles": show every article, ordered by listOrder.
    const key = document.createElement('div');
    key.textContent = 'order-field';
    const val = document.createElement('div');
    val.textContent = 'listOrder';
    cells.push([key, val]);
  }

  const block = WebImporter.Blocks.createBlock(document, { name: 'magazine-cards', cells });
  element.replaceWith(block);
}
