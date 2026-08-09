/* eslint-disable */
/* global WebImporter */
/**
 * Parser for variant: tabs
 * Base block: tabs (classic content-switcher)
 * Source: adventure-detail / itinerary pages
 *   Instance: main div.tabs.panelcontainer
 * Generated: 2026-08-09
 *
 * The source is the CLASSIC tabs pattern: a tablist
 * (ol.cmp-tabs__tablist > li.cmp-tabs__tab, labels Overview / Itinerary /
 * What to Bring) plus one .cmp-tabs__tabpanel per tab holding rich text and
 * images (rendered from a content fragment).
 *
 * blocks/tabs/tabs.js expected input — 2 columns, one row per tab:
 *   [ tab label | tab content ]
 * The block reads each row's first cell as the tab button label and turns the
 * row into a panel with the rest of the content. This is a 2-COLUMN block.
 *
 * Panel content is preserved as rich HTML (paragraphs, lists, images cleaned
 * to src + alt). Internal link hrefs are preserved verbatim.
 */
export default function parse(element, { document }) {
  // Helper: clean <img> keeping only src + alt.
  const cleanImage = (srcImg) => {
    const src = srcImg.getAttribute('src');
    if (!src) return null;
    const img = document.createElement('img');
    img.setAttribute('src', src);
    const alt = srcImg.getAttribute('alt');
    if (alt) img.setAttribute('alt', alt);
    return img;
  };

  // Replace every coreimg <img> inside a panel with a clean src+alt image so
  // the exported markdown carries only the essential image attributes.
  const cleanPanelImages = (panel) => {
    panel.querySelectorAll('img').forEach((srcImg) => {
      const clean = cleanImage(srcImg);
      if (clean) srcImg.replaceWith(clean);
      else srcImg.remove();
    });
  };

  const cells = [];

  // Tab labels, in order.
  const tabLabels = Array.from(element.querySelectorAll('.cmp-tabs__tablist .cmp-tabs__tab, ol[role="tablist"] > li[role="tab"]'));
  // Tab panels, in order (each holds the content for the matching label).
  const panels = Array.from(element.querySelectorAll('.cmp-tabs__tabpanel, [role="tabpanel"]'));

  panels.forEach((panel, i) => {
    // Label cell — prefer the matching tablist label; fall back to the panel's
    // own dc:title-derived aria label or index.
    const labelEl = tabLabels[i];
    const labelText = labelEl ? labelEl.textContent.trim() : '';
    const labelP = document.createElement('p');
    labelP.textContent = labelText || `Tab ${i + 1}`;

    // Content cell — the panel's rich content. Extract the content-fragment
    // body if present (skips the fragment title heading), else use the panel.
    let contentRoot = panel.querySelector('.cmp-contentfragment__elements');
    if (!contentRoot) contentRoot = panel;

    // Clone so we can strip wrapper chrome without mutating the live panel.
    const clone = contentRoot.cloneNode(true);
    cleanPanelImages(clone);

    // Collect meaningful content nodes: headings, paragraphs, lists, images.
    const contentCell = [];
    clone.querySelectorAll('p, ul, ol, h1, h2, h3, h4, h5, h6, img').forEach((node) => {
      // Skip empty text nodes and the layout-grid scaffolding wrappers.
      if (node.tagName === 'IMG') {
        contentCell.push(node);
        return;
      }
      if (node.closest('.aem-Grid') && node.tagName !== 'IMG') {
        // paragraphs/lists live as siblings of grid wrappers; only skip the
        // empty grid containers themselves, not real content.
      }
      if (node.textContent.trim() || node.querySelector('img')) {
        // Avoid double-adding an image already pushed as a standalone node.
        if (node.querySelector('img') && !node.textContent.trim()) {
          node.querySelectorAll('img').forEach((im) => contentCell.push(im));
        } else {
          contentCell.push(node);
        }
      }
    });

    // Fallback: if nothing meaningful was collected, use the whole panel clone.
    if (!contentCell.length) {
      contentCell.push(clone);
    }

    cells.push([labelP, contentCell]); // 2-column row: [ label | content ]
  });

  // Empty-block guard: no panels found → unwrap gracefully.
  if (cells.length === 0) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const block = WebImporter.Blocks.createBlock(document, { name: 'tabs', cells });
  element.replaceWith(block);
}
