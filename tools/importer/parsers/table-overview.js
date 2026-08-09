/* eslint-disable */
/* global WebImporter */
/**
 * Parser for variant: table-overview
 * Base block: table (overview / spec-list variant)
 * Source: https://wknd.site/us/en/adventures/*.html
 *   Instance: div.contentfragment.cmp-contentfragment--elements
 * Generated: 2026-08-09
 *
 * The source is an adventure content fragment rendered as a labelled
 * definition list (dl.cmp-contentfragment__elements) of 6 elements:
 * Activity, Adventure Type, Trip Length, Group Size, Difficulty, Price.
 * Each element = a dt (label) + dd (value).
 *
 * blocks/table-overview/table-overview.js expected input — a 2-column table,
 * one row per element: [ label | value ]. The block turns each row into a
 * table row (label cell + value cell). This is a 2-COLUMN block.
 */
export default function parse(element, { document }) {
  const cells = [];

  // Each element is a labelled key/value pair.
  const elements = Array.from(element.querySelectorAll('.cmp-contentfragment__element'));

  elements.forEach((el) => {
    const labelEl = el.querySelector('.cmp-contentfragment__element-title, dt');
    const valueEl = el.querySelector('.cmp-contentfragment__element-value, dd');

    const label = labelEl ? labelEl.textContent.trim() : '';
    const value = valueEl ? valueEl.textContent.trim() : '';

    // Only emit rows that carry a label and/or value.
    if (label || value) {
      const labelP = document.createElement('p');
      labelP.textContent = label;
      const valueP = document.createElement('p');
      valueP.textContent = value;
      cells.push([labelP, valueP]); // 2-column row: [ label | value ]
    }
  });

  // Empty-block guard: no elements found → unwrap gracefully.
  if (cells.length === 0) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const block = WebImporter.Blocks.createBlock(document, { name: 'table-overview', cells });
  element.replaceWith(block);
}
