/* eslint-disable */
/* global WebImporter */
/**
 * Parser for variant: accordion
 * Base block: accordion
 * Source: FAQ pages
 *   Instance: div.accordion.panelcontainer
 * Generated: 2026-08-09
 *
 * The source is a core accordion: div.cmp-accordion with cmp-accordion__item
 * entries. Each item = a header button (question, span.cmp-accordion__title
 * inside h3.cmp-accordion__header) + a hidden panel (answer, rich text inside
 * .cmp-accordion__panel).
 *
 * blocks/accordion/accordion.js expected input — 2 columns, one row per item:
 *   [ question | answer ]
 * The block reads row.children[0] as the clickable label and row.children[1]
 * as the toggled body. This is a 2-COLUMN block.
 *
 * Answers preserve rich text (paragraphs, inline bold, etc.). Internal link
 * hrefs are preserved verbatim.
 */
export default function parse(element, { document }) {
  const cells = [];

  const items = Array.from(element.querySelectorAll('.cmp-accordion__item'));

  items.forEach((item) => {
    // Question — the accordion title text (inside the header button).
    const titleEl = item.querySelector('.cmp-accordion__title, .cmp-accordion__header, [class*="title"]');
    const questionP = document.createElement('p');
    questionP.textContent = titleEl ? titleEl.textContent.trim() : '';

    // Answer — the panel body's rich content.
    const panel = item.querySelector('.cmp-accordion__panel, [data-cmp-hook-accordion="panel"]');
    const answerCell = [];
    if (panel) {
      const clone = document.createElement('div');
      // Collect meaningful block-level nodes directly from the panel. Filter
      // out NESTED matches: the source wraps text as <div class="text"><div
      // class="cmp-text"><p>…</p></div></div>, so query for the block nodes
      // once and keep only those NOT contained by another collected node —
      // this prevents duplicating each paragraph via its wrapper.
      const all = Array.from(panel.querySelectorAll('p, ul, ol, h1, h2, h3, h4, h5, h6'));
      all.forEach((node) => {
        if (!node.textContent.trim()) return;
        // Skip if an ancestor block node in the same list is already collected.
        const nestedInAnother = all.some((other) => other !== node && other.contains(node));
        if (nestedInAnother) return;
        clone.appendChild(node.cloneNode(true));
      });
      if (!clone.childNodes.length && panel.textContent.trim()) {
        const p = document.createElement('p');
        p.textContent = panel.textContent.trim();
        clone.appendChild(p);
      }
      answerCell.push(...clone.childNodes);
    }

    // Only emit rows that have a question and/or answer.
    if (questionP.textContent || answerCell.length) {
      cells.push([questionP, answerCell.length ? answerCell : '']);
    }
  });

  // Empty-block guard: no items found → unwrap gracefully.
  if (cells.length === 0) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const block = WebImporter.Blocks.createBlock(document, { name: 'accordion', cells });
  element.replaceWith(block);
}
