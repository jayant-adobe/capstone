import { createOptimizedPicture } from '../../scripts/aem.js';

/*
 * profile-cards — dynamic, data-driven team profile grid.
 *
 * The About Us contributor/guide profiles aren't backed by pages, so there's
 * nothing for a query-index to crawl. Instead they're authored as a single EDS
 * data sheet published to /us/en/contributors.json; this block fetches that
 * sheet, filters to a `team` (contributor | guide) chosen by the author, sorts
 * by `order`, and renders the same `.cards-profile` markup the authored profile
 * cards use (circular portrait + name h3 + role h5 + Facebook/Twitter/Instagram
 * links). It adds the `cards-profile` class so blocks/cards-profile/cards-profile.css
 * styles it, and owns a small self-contained fallback so it works even where
 * that CSS isn't present.
 *
 * Authoring:
 *   | Profile Cards |
 *   | team | contributor |   (which sheet rows to show; required)
 * Each About Us grid is one instance: team=contributor (4 cards) and
 * team=guide (3 cards). A `limit` row optionally caps the count.
 */

const DATA_PATH = '/us/en/contributors.json';

/**
 * Read the block's authored key/value rows: `team` (which rows to render) and
 * an optional numeric `limit`.
 * @param {Element} block
 * @returns {{team: string, limit: number}}
 */
function readConfig(block) {
  const cfg = { team: '', limit: 0 };
  block.querySelectorAll(':scope > div').forEach((row) => {
    const cells = [...row.children].map((c) => c.textContent.trim());
    const key = (cells[0] || '').toLowerCase();
    const val = cells[1] || '';
    if (key === 'team') cfg.team = val.toLowerCase();
    else if (key === 'limit') { const n = (val.match(/\d+/) || [])[0]; if (n) cfg.limit = parseInt(n, 10); }
  });
  return cfg;
}

/**
 * Fetch the contributors data sheet. Returns [] on any failure so the block
 * degrades to an empty (not broken) grid.
 * @returns {Promise<Array>} sheet rows
 */
async function fetchPeople() {
  try {
    const resp = await fetch(DATA_PATH);
    if (!resp.ok) return [];
    const json = await resp.json();
    return Array.isArray(json.data) ? json.data : [];
  } catch (e) {
    return [];
  }
}

/**
 * Sort rows by numeric `order` ascending (missing sorts last, stable).
 * @param {Array} rows
 * @returns {Array} a new, sorted array
 */
function sortByOrder(rows) {
  const rank = (r) => { const n = parseInt(r.order, 10); return Number.isNaN(n) ? Infinity : n; };
  return rows
    .map((row, i) => ({ row, i }))
    .sort((a, b) => rank(a.row) - rank(b.row) || a.i - b.i)
    .map((e) => e.row);
}

/**
 * Build one social link matching the authored profile card (label text hidden
 * by CSS; a `title` drives the platform-specific glyph in cards-profile.css).
 * @param {string} platform Facebook | Twitter | Instagram
 * @returns {Element} a <p><a></a></p>
 */
function socialLink(platform) {
  const p = document.createElement('p');
  const a = document.createElement('a');
  a.href = '#';
  a.title = platform;
  a.setAttribute('aria-label', platform);
  a.textContent = platform;
  p.append(a);
  return p;
}

/**
 * Build one profile card <li> (image cell + body cell), matching cards-profile.
 * @param {object} row a sheet row {name, role, image}
 * @returns {Element} the <li>
 */
function buildCard(row) {
  const li = document.createElement('li');

  const imageWrap = document.createElement('div');
  imageWrap.className = 'cards-profile-card-image';
  if (row.image) {
    imageWrap.append(createOptimizedPicture(row.image, row.name || '', false, [{ width: '750' }]));
  }

  const body = document.createElement('div');
  body.className = 'cards-profile-card-body';
  const h3 = document.createElement('h3');
  h3.textContent = row.name || '';
  const h5 = document.createElement('h5');
  h5.textContent = row.role || '';
  body.append(h3, h5, socialLink('Facebook'), socialLink('Twitter'), socialLink('Instagram'));

  li.append(imageWrap, body);
  return li;
}

/**
 * loads and decorates the profile-cards block
 * @param {Element} block
 */
export default async function decorate(block) {
  const { team, limit } = readConfig(block);
  block.textContent = '';

  // reuse cards-profile styling (circular portrait, centered name/role, social)
  block.classList.add('cards-profile');

  const people = await fetchPeople();
  if (!people.length) return; // graceful empty state

  let rows = sortByOrder(people.filter((p) => !team || (p.team || '').toLowerCase() === team));
  if (limit > 0) rows = rows.slice(0, limit);

  const ul = document.createElement('ul');
  rows.forEach((row) => ul.append(buildCard(row)));
  block.append(ul);
}
