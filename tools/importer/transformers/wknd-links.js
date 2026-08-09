/* eslint-disable */
/* global WebImporter */

/**
 * Transformer: WKND internal link remapping.
 *
 * The WKND source authors internal links with a `.html` extension against the
 * `/us/en/...` content tree (e.g. `/us/en/adventures.html`,
 * `/us/en/adventures/bali-surf-camp.html`, and the home page `/us/en.html`).
 *
 * Edge Delivery serves EXTENSIONLESS paths — the migrated home page lives at
 * `/us/en` (verified: `/us/en` → 200, `/us/en.html` → 404). If we imported the
 * source hrefs verbatim, every internal link/nav URL/button action on the
 * migrated pages would 404. This transformer rewrites those links to the
 * migrated EDS paths so they resolve.
 *
 * Rules (afterTransform, so it also fixes links inside parser-generated block
 * tables):
 *   - Root-relative links ending in `.html` (optionally with ?query / #hash):
 *       /us/en.html                       -> /us/en
 *       /us/en/adventures.html            -> /us/en/adventures
 *       /us/en/adventures/bali-surf-camp.html#x -> /us/en/adventures/bali-surf-camp#x
 *     This strips the extension for the whole same-site tree so links follow the
 *     EDS convention. (Non-migrated locales like /ca/en are out of migration
 *     scope, but stripping their extension keeps them EDS-shaped and harmless.)
 *   - Absolute WKND links (https://wknd.site/us/en/...html or the aem.page/live
 *     preview hosts) are normalised to root-relative extensionless paths so they
 *     resolve on whatever host serves the migrated site.
 *   - Left untouched: `#`-only anchors (share/sign-in placeholders), `mailto:`,
 *     `tel:`, and external links to other domains (docs.adobe.com, stock.adobe.com,
 *     github.com, pinterest.com, etc.).
 */

const TransformHook = { beforeTransform: 'beforeTransform', afterTransform: 'afterTransform' };

// Hosts whose links point at the WKND site itself (source + migrated preview/live).
const WKND_HOSTS = new Set([
  'wknd.site',
  'www.wknd.site',
  'main--capstone--jayant-adobe.aem.page',
  'main--capstone--jayant-adobe.aem.live',
]);

/**
 * Strip a trailing `.html`/`.htm` from a pathname, preserving any ?query/#hash.
 * Returns the original value when there is nothing to strip.
 */
function stripHtml(pathWithSuffix) {
  return pathWithSuffix.replace(/\.html?(?=($|[?#]))/i, '');
}

function remapHref(raw) {
  if (!raw) return raw;
  const value = raw.trim();

  // Pure fragment / non-navigational schemes — leave as-is.
  if (value.startsWith('#') || /^(mailto:|tel:|javascript:)/i.test(value)) return raw;

  // Absolute URL (http/https or protocol-relative).
  if (/^(https?:)?\/\//i.test(value)) {
    let url;
    try {
      url = new URL(value, 'https://wknd.site');
    } catch (e) {
      return raw;
    }
    if (!WKND_HOSTS.has(url.hostname)) return raw; // external — untouched
    const path = stripHtml(url.pathname);
    return `${path}${url.search}${url.hash}`; // root-relative, extensionless
  }

  // Root-relative internal link (starts with `/`).
  if (value.startsWith('/')) return stripHtml(value);

  // Relative link (rare here) — strip extension conservatively.
  return stripHtml(value);
}

export default function transform(hookName, element, payload) {
  if (hookName !== TransformHook.afterTransform) return;

  element.querySelectorAll('a[href]').forEach((a) => {
    const raw = a.getAttribute('href');
    const next = remapHref(raw);
    if (next && next !== raw) a.setAttribute('href', next);
  });
}
