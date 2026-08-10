/* eslint-disable */
/* global WebImporter */

/**
 * Transformer: WKND site-wide cleanup.
 *
 * Removes non-authorable AEM Core Components chrome and tracking cruft so the
 * import contains only page-level authorable content. Every selector below was
 * verified against captured DOM: migration-work/cleaned.html (currently the
 * scraped arctic-surfing magazine-article page) and the live adventure-detail
 * page (bali-surf-camp) for the selectors that only appear on that template.
 * This transformer is site-wide and template-agnostic: it must be a no-op on any
 * template that lacks a given element (e.g. the homepage has no breadcrumb or
 * share widget), which WebImporter.DOMUtils.remove guarantees.
 *
 * Site chrome (removed on every template that has it):
 *   - <header class="experiencefragment cmp-experiencefragment--header ...">  — site-wide header XF (cleaned.html line 5)
 *   - <footer class="experiencefragment cmp-experiencefragment--footer ...">  — site-wide footer XF (cleaned.html line 378). The footer teaser
 *       ("Follow Us" title.cmp-title--right, social buttons, separator, copyright) lives INSIDE this footer XF (cleaned.html lines 417-461),
 *       so it is removed together with the footer — it is NOT page content.
 *   - <iframe id="destination_publishing_iframe_wkndsite_0" ...>              — Adobe demdex ID-sync iframe / tracking (cleaned.html line 473)
 *   - <div id="toggleNav"> ... <i class="wknd__icon wkndicon-menu">           — mobile nav hamburger toggle (cleaned.html line 475)
 *   - <div id="mobileNav" class="cmp-navigation--mobile">                     — mobile navigation drawer (cleaned.html line 481)
 *
 * Breadcrumb navigation (site chrome on adventure-detail + magazine-article; auto-generated, NOT page content):
 *   - magazine-article: <div class="breadcrumb ..."> > <nav class="cmp-breadcrumb"> (cleaned.html lines 170-171) — nav has no aria-label
 *   - adventure-detail: <div class="breadcrumb cmp-breadcrumb--fixed ..."> > <nav class="cmp-breadcrumb" aria-label="Breadcrumb" role="navigation"> (live bali-surf-camp lines 532-533)
 *   Removing the div.breadcrumb wrapper takes the whole widget on both. The article lead image (div.image) and inner <main> are
 *   separate siblings of the breadcrumb inside the outer main, so they are untouched.
 *
 * Empty / non-functional social share widgets (site chrome; NOT page content). Conservative: only the AEM Sharing
 * component container is removed — the sibling H5 heading that labels it ("SHARE THIS STORY" / "Share this Adventure")
 * and the related-articles list are KEPT as authorable content:
 *   - magazine-article sidebar: <div class="sharing ..."> = empty div.fb-share-button + a bare Pinterest <a> (cleaned.html lines 338-343)
 *   - adventure-detail:         <div class="sharing ..."> = div.fb-share-button + Pinterest <a> (live bali-surf-camp lines 721-727)
 *   The WKND Sharing component renders with class "sharing" (there is no .cmp-sharing / [data-cmp-is="sharing"] in the captured DOM),
 *   so div.sharing is the verified, precise selector.
 *
 * PRESERVED (do NOT remove): the author-bio experience fragment on magazine articles is
 * <div class="experiencefragment"> > <div class="cmp-experiencefragment cmp-experiencefragment--jacob-wester"> (cleaned.html lines 271-272).
 * It has NO --header/--footer modifier and is NOT a <header>/<footer> element, so none of the header/footer selectors below match it.
 * It is mapped to the cards-byline block and must survive cleanup. (Do not add a broad div.experiencefragment removal.)
 *
 *   - stray inline <meta> elements inside div.cmp-image / breadcrumb items     — malformed HTML leftover (removed in beforeTransform)
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
    // hamburger toggle) and tracking iframe. All verified in captured DOM.
    //
    // Only --header / --footer experience fragments are targeted here — the
    // author-bio XF on magazine articles (div.experiencefragment >
    // .cmp-experiencefragment--jacob-wester, no modifier) is intentionally NOT
    // matched by any selector below and is preserved for the cards-byline block.
    WebImporter.DOMUtils.remove(element, [
      'header.experiencefragment.cmp-experiencefragment--header',
      'footer.experiencefragment.cmp-experiencefragment--footer',
      'header',
      'footer',
      '#toggleNav',
      '#mobileNav',
      '.cmp-navigation--mobile',
      'iframe',
      // Breadcrumb navigation (adventure-detail + magazine-article): auto-generated
      // site chrome, not authored page content. Remove the outer div.breadcrumb
      // wrapper (covers both the --fixed adventure-detail variant and the plain
      // magazine-article variant) plus the inner nav for safety on any variant
      // where the wrapper class differs.
      'div.breadcrumb',
      'nav.cmp-breadcrumb',
      // Empty / non-functional social share widget (adventure-detail
      // "Share this Adventure" + magazine-article sidebar "SHARE THIS STORY").
      // Only the AEM Sharing component container (rendered with class "sharing")
      // is removed; the sibling H5 heading that labels it and the related-articles
      // list are separate elements and are KEPT as authorable content.
      'div.sharing',
      // Content-fragment title (magazine-article rich text): the article body's
      // <h3 class="cmp-contentfragment__title"> repeats the page H1 and is
      // display:none in the source (visually hidden), so it is NOT authored
      // content. Left in, it renders as a duplicate title heading beneath the
      // byline. Remove it so the article goes H1 -> byline -> body like the source.
      '.cmp-contentfragment__title',
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
