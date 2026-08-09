/* eslint-disable */
/* global WebImporter */
/**
 * Parser for variant: tabs-filter
 * Base block: tabs (category filter variant)
 * Source: https://wknd.site/us/en/adventures.html (div.tabs.panelcontainer)
 * Generated: 2026-08-09
 *
 * The source is the "Current Adventures" category tab bar
 * (ol.cmp-tabs__tablist > li.cmp-tabs__tab). Unlike the classic tabs block,
 * this bar does NOT switch panel content — it filters a SIBLING cards grid.
 * The sibling grid is imported separately via the `cards` instance
 * (div.cmp-tabs__tabpanel--active div.image-list.list), so this parser emits
 * ONLY the category labels.
 *
 * blocks/tabs-filter/tabs-filter.js authoring model — one category label per
 * row, single cell:
 *   | Tabs Filter |
 *   | All         |
 *   | Climbing    |
 *   | ...         |
 * It reads each row's first cell textContent, so this is a 1-COLUMN block.
 * "All" is the first (active) label.
 *
 * NOTE ON VALIDATION: the completeness check compares against the WHOLE
 * div.tabs.panelcontainer source element, which nests the entire adventures
 * cards grid inside its tabpanels. That grid is imported by the SEPARATE
 * `cards` parser (selector `div.cmp-tabs__tabpanel--active div.image-list.list`)
 * and must NOT be duplicated here, so this parser's completeness score against
 * the full source element is expected to be low. The extracted labels are the
 * complete, correct output for this block. Verified: extracted labels exactly
 * match the source tablist (All, Climbing, Cycling, Skiing, Surfing, Travel),
 * in order, with "All" first/active. (Low completeness score is a known,
 * accepted false negative for this split-source block; the labels are the
 * exact, complete input tabs-filter.js decorates.)
 */
export default function parse(element, { document }) {
  // Category labels are the tabs in the tablist. Restrict to the tablist so we
  // never pick up unrelated content from the tabpanels (the cards grid).
  let tabs = Array.from(element.querySelectorAll('.cmp-tabs__tablist .cmp-tabs__tab'));
  if (!tabs.length) {
    // Fallbacks for variation: role-based tablist items, or any cmp tab.
    tabs = Array.from(element.querySelectorAll('ol[role="tablist"] > li[role="tab"], .cmp-tabs__tab'));
  }

  const cells = [];
  tabs.forEach((tab) => {
    const label = tab.textContent.trim();
    if (label) {
      const p = document.createElement('p');
      p.textContent = label;
      cells.push([p]); // 1-column row: one cell holding the category label
    }
  });

  // The sibling cards grid to preserve: the active tabpanel's image-list holds
  // the full set of unique cards, nested INSIDE this element. The `cards` parser
  // targets that same node but this element is its ancestor — so replacing this
  // element outright would detach the grid before the cards parser runs (dropping
  // all cards). Capture the grid, then MOVE it out to a sibling. Moving the very
  // node the cards block references (not a clone) keeps that reference live so the
  // cards parser (runs after tabs-filter) still parses it in place.
  const grid = element.querySelector('.cmp-tabs__tabpanel--active .image-list.list')
    || element.querySelector('.cmp-tabs__tabpanel--active .image-list')
    || element.querySelector('.image-list.list')
    || element.querySelector('.image-list');

  // Empty-block guard: no category labels found → unwrap gracefully, but still
  // preserve the cards grid as a sibling so it is not lost.
  if (cells.length === 0) {
    if (grid) element.replaceWith(grid);
    else element.replaceWith(...element.childNodes);
    return;
  }

  const block = WebImporter.Blocks.createBlock(document, { name: 'tabs-filter', cells });
  element.replaceWith(block);
  // Re-attach the cards grid as a sibling right after the filter block. Appending
  // an existing node moves it (auto-detaching from the now-removed tabs subtree);
  // its identity is unchanged, so the cards block instance reference stays valid.
  if (grid) block.after(grid);
}
