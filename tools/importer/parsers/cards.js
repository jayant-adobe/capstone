/* eslint-disable */
/* global WebImporter */
/**
 * Parser for variant: cards
 * Base block: cards
 * Source: https://wknd.site/us/en.html (div.image-list.list)
 * Generated: 2026-08-07
 *
 * Block Collection "Cards" model: 2 columns.
 *   Row 1: block name ("Cards").
 *   One row PER CARD (dynamic): [ image | text ].
 *   text cell = linked title (heading with anchor) + description paragraph.
 *
 * Runs once per matched grid instance (each grid holds multiple cards).
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

  const cells = [];

  // Each card is a list item within the image list.
  const cards = Array.from(element.querySelectorAll('.cmp-image-list__item, li'));

  cards.forEach((card) => {
    // Image cell.
    const srcImg = card.querySelector('.cmp-image-list__item-image img, .cmp-image img, img');
    const imageCell = cleanImage(srcImg);

    // Text cell.
    const textCell = [];

    // Linked title — anchor wrapping the title text. Render as a heading with a link.
    const titleLink = card.querySelector('a.cmp-image-list__item-title-link, a[class*="title-link"]');
    const titleText = card.querySelector('.cmp-image-list__item-title, [class*="item-title"]:not([class*="title-link"])');
    if (titleLink) {
      const href = titleLink.getAttribute('href');
      const text = (titleText ? titleText.textContent : titleLink.textContent).trim();
      const h3 = document.createElement('h3');
      if (href) {
        const link = document.createElement('a');
        link.setAttribute('href', href);
        link.textContent = text;
        h3.appendChild(link);
      } else {
        h3.textContent = text;
      }
      textCell.push(h3);
    } else if (titleText && titleText.textContent.trim()) {
      const h3 = document.createElement('h3');
      h3.textContent = titleText.textContent.trim();
      textCell.push(h3);
    }

    // Description.
    const description = card.querySelector('.cmp-image-list__item-description, [class*="description"]');
    if (description && description.textContent.trim()) {
      const p = document.createElement('p');
      p.textContent = description.textContent.trim();
      textCell.push(p);
    }

    if (imageCell || textCell.length) {
      cells.push([imageCell || '', textCell.length ? textCell : '']);
    }
  });

  // Empty-block guard.
  if (cells.length === 1) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const block = WebImporter.Blocks.createBlock(document, { name: 'cards', cells });
  element.replaceWith(block);
}
