/* eslint-disable */
/* global WebImporter */

/**
 * Transformer: WKND site-wide cleanup.
 *
 * Removes non-authorable AEM Core Components chrome and tracking cruft so the
 * import contains only page-level authorable content. Every selector below was
 * verified against migration-work/cleaned.html (the scraped wknd.site home page).
 *
 * Verified in cleaned.html:
 *   - <header class="experiencefragment cmp-experiencefragment--header ...">  (line 5) — site-wide header XF, OUT OF SCOPE
 *   - <footer class="experiencefragment cmp-experiencefragment--footer ...">  (line 471) — site-wide footer XF, OUT OF SCOPE
 *   - <iframe id="destination_publishing_iframe_wkndsite_0" ...>              (line 566) — Adobe demdex ID-sync iframe (tracking)
 *   - <div id="toggleNav"> ... <i class="wknd__icon wkndicon-menu">           (line 568) — mobile nav hamburger toggle
 *   - <div id="mobileNav" class="cmp-navigation--mobile">                     (line 574) — mobile navigation drawer
 *   - stray inline <meta> elements inside div.cmp-image                       (lines 183, 204, 227, 271, 334, 378) — malformed HTML leftover
 *   - data-cmp-* attributes on <body> and Core Component elements            (data-cmp-data-layer-*, data-cmp-link-accessibility-*, etc.)
 *
 * NOTE ON WRAPPERS: div.aem-Grid / div.cmp-container / .aem-GridColumn / cmp-*
 * utility wrappers around BLOCKS are consumed when the block parsers replace
 * those elements with tables; the wrappers around DEFAULT CONTENT (headings,
 * buttons, separators) carry no semantic markup and are dropped automatically by
 * EDS html-to-markdown generation. They are intentionally NOT unwrapped here:
 * WebImporter.DOMUtils.remove would delete their content, and a structural
 * unwrap in afterTransform would break the nth-of-type section selectors that
 * wknd-sections.js depends on (both run in afterTransform). We therefore limit
 * this transformer to (1) removing non-authorable content and (2) attribute
 * cleanup — neither of which perturbs the section boundaries.
 */

const TransformHook = { beforeTransform: 'beforeTransform', afterTransform: 'afterTransform' };

export default function transform(hookName, element, payload) {
  if (hookName === TransformHook.beforeTransform) {
    // Malformed HTML: stray inline <meta> tags left inside div.cmp-image blocks.
    // Removing them before parsing keeps the image parsers clean (they extract <img>, not <meta>).
    WebImporter.DOMUtils.remove(element, ['meta']);
  }

  if (hookName === TransformHook.afterTransform) {
    // Non-authorable site chrome (header/footer experience fragments, mobile nav,
    // hamburger toggle) and tracking iframe. All verified in cleaned.html.
    WebImporter.DOMUtils.remove(element, [
      'header.experiencefragment.cmp-experiencefragment--header',
      'footer.experiencefragment.cmp-experiencefragment--footer',
      'header',
      'footer',
      '#toggleNav',
      '#mobileNav',
      '.cmp-navigation--mobile',
      'iframe',
    ]);

    // Attribute cleanup: strip Core Components tracking/behavior hooks
    // (data-cmp-data-layer-*, data-cmp-link-accessibility-*, etc.) and inline
    // event handlers. Class/id are left intact so downstream flattening and any
    // sibling section transformer selectors continue to resolve.
    const stripAttrs = (el) => {
      [...el.attributes].forEach((attr) => {
        if (attr.name.startsWith('data-cmp') || attr.name === 'onclick') {
          el.removeAttribute(attr.name);
        }
      });
    };
    stripAttrs(element);
    element.querySelectorAll('*').forEach(stripAttrs);
  }
}
