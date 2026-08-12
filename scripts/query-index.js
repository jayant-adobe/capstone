/*
 * query-index.js — shared helper for consuming an AEM Edge Delivery query-index.
 *
 * A query-index endpoint (built by helix-query.yaml) returns a paginated sheet:
 *   { columns: [...], data: [...], offset: 0, limit: 500, total: N }
 * A single `fetch(path)` returns only the FIRST page — up to the sheet's page
 * size (500 rows by default). Once an index grows past that cap, a plain fetch
 * silently truncates the result set. The best-practice pattern (see
 * https://www.aem.live/developer/indexing and the query-index docs) is to
 * request pages with `?offset=&limit=` until every row of `total` is retrieved.
 *
 * queryIndex() does exactly that and returns the full `data` array. It degrades
 * to [] on any failure (network error, non-OK response, malformed JSON) so
 * callers can render a graceful empty state instead of breaking.
 */

// Rows to request per page. EDS caps a query-index page at 500 rows; asking for
// that many keeps the number of round-trips minimal (one request per 500 rows).
const PAGE_SIZE = 500;

// Safety bound on the number of pages, so a misbehaving endpoint (e.g. one that
// never advances `total`/`offset`) can't spin into an unbounded fetch loop.
const MAX_PAGES = 20;

/**
 * Fetch a single page of a query-index.
 * @param {string} path the query-index path (e.g. /us/en/magazine/query-index.json)
 * @param {number} offset row offset to start from
 * @param {number} limit page size
 * @returns {Promise<{data: Array, total: number}>} the page's rows and the
 *   index's total row count (0/[] on failure)
 */
async function fetchPage(path, offset, limit) {
  const sep = path.includes('?') ? '&' : '?';
  const resp = await fetch(`${path}${sep}offset=${offset}&limit=${limit}`);
  if (!resp.ok) throw new Error(`query-index ${path} -> ${resp.status}`);
  const json = await resp.json();
  return {
    data: Array.isArray(json.data) ? json.data : [],
    total: Number.isFinite(json.total) ? json.total : 0,
  };
}

/**
 * Fetch ALL rows of a query-index, following pagination.
 * @param {string} path the query-index path to read
 * @returns {Promise<Array>} every row in the index (or [] on any failure)
 */
export default async function queryIndex(path) {
  try {
    const first = await fetchPage(path, 0, PAGE_SIZE);
    const rows = [...first.data];
    // Keep requesting pages until we've collected `total` rows (or hit the
    // page-count safety bound, or a page comes back empty — either of which
    // means there's nothing more to collect).
    for (let page = 1; page < MAX_PAGES && rows.length < first.total; page += 1) {
      // eslint-disable-next-line no-await-in-loop
      const next = await fetchPage(path, page * PAGE_SIZE, PAGE_SIZE);
      if (!next.data.length) break;
      rows.push(...next.data);
    }
    return rows;
  } catch (e) {
    return [];
  }
}
