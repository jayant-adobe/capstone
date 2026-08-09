/* eslint-disable */
/* global WebImporter */
/**
 * Parser for variant: columns
 * Base block: columns
 * Source: homepage, magazine landing, adventures landing
 *   Instances:
 *     - div.teaser.cmp-teaser--featured (Featured Article: eyebrow + H2 + description + CTA)
 *     - div.teaser.cmp-teaser--hero.cmp-teaser--imagebottom (Next Adventures: H2 + description + CTA)
 *     - div.teaser.cmp-teaser--hero (Adventures landing intro: H2 + description, NO eyebrow, NO CTA)
 * Generated: 2026-08-07 (extended 2026-08-09 for the eyebrow-less / CTA-less hero intro)
 *
 * Block Collection "Columns" model (teaser variant): 2 columns.
 *   Row 1: block name ("Columns").
 *   Row 2: [ image | copy ].
 *     copy cell = optional eyebrow + H2 heading + description paragraph + optional CTA link.
 *
 * Degrades gracefully: eyebrow and CTA are optional, so the eyebrow-less /
 * CTA-less hero-intro teaser produces a copy cell of just heading + description.
 *
 * Runs once per matched teaser instance.
 */
export default function parse(element, { document }) {
  // Helper: clean <img> keeping only src + alt.
  const cleanImage = (srcImg) => {
    if (!srcImg) return null;
    const src = srcImg.getAttribute('src');
    if (!src) return null;
    const img = document.createElement('img');
    img.setAttribute('src', src);
    const alt = srcImg.getAttribute('alt');
    if (alt) img.setAttribute('alt', alt);
    return img;
  };

  // Image cell.
  const srcImg = element.querySelector('.cmp-teaser__image img, .cmp-image img, img');
  const imageCell = cleanImage(srcImg);

  // Copy cell.
  const copyCell = [];

  // Eyebrow / pretitle — only present on the Featured Article instance.
  const eyebrow = element.querySelector('.cmp-teaser__pretitle, [class*="pretitle"], [class*="eyebrow"]');
  if (eyebrow && eyebrow.textContent.trim()) {
    const p = document.createElement('p');
    const strong = document.createElement('strong');
    strong.textContent = eyebrow.textContent.trim();
    p.appendChild(strong);
    copyCell.push(p);
  }

  // Heading. Exclude pretitle/eyebrow — "pretitle" contains the substring "title",
  // and querySelector returns the first match in DOM order (the pretitle precedes the h2),
  // which would otherwise put the eyebrow text in the heading and drop the real title.
  const title = element.querySelector('.cmp-teaser__title, h2, [class*="title"]:not([class*="pretitle"])');
  if (title && title.textContent.trim()) {
    const h2 = document.createElement('h2');
    h2.textContent = title.textContent.trim();
    copyCell.push(h2);
  }

  // Description.
  const description = element.querySelector('.cmp-teaser__description, [class*="description"]');
  if (description && description.textContent.trim()) {
    const p = document.createElement('p');
    p.textContent = description.textContent.trim();
    copyCell.push(p);
  }

  // CTA link.
  const cta = element.querySelector('.cmp-teaser__action-link, a[class*="action"], a');
  if (cta && cta.getAttribute('href')) {
    const link = document.createElement('a');
    link.setAttribute('href', cta.getAttribute('href'));
    link.textContent = cta.textContent.trim();
    copyCell.push(link);
  }

  // Empty-block guard.
  if (!imageCell && !copyCell.length) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const cells = [
    [imageCell || '', copyCell.length ? copyCell : ''],
  ];

  const block = WebImporter.Blocks.createBlock(document, { name: 'columns', cells });
  element.replaceWith(block);
}
