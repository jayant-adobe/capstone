/* eslint-disable */
/* global WebImporter */
/**
 * Parser for variant: cards
 * Base block: cards
 * Source: homepage / magazine / adventures grids and magazine "Members Only"
 *   Instances:
 *     - div.image-list.list (article/adventure grid: many .cmp-image-list__item cards)
 *     - div.cmp-tabs__tabpanel--active div.image-list.list (adventures landing, inside tab filter)
 *     - div.teaser.cmp-teaser--secure (magazine Members Only: a SINGLE member-gated teaser card)
 * Generated: 2026-08-07 (extended 2026-08-09 for the secure-teaser shape)
 *
 * Block Collection "Cards" model: 2 columns.
 *   Row 1: block name ("Cards").
 *   One row PER CARD (dynamic): [ image | text ].
 *   text cell = linked title (heading with anchor) + description paragraph.
 *
 * Handles BOTH shapes:
 *   - IMAGE-LIST: iterate .cmp-image-list__item; each card has a linked title + description.
 *   - SECURE-TEASER (cmp-teaser--secure): a single .cmp-teaser card (image + title +
 *     description + "Read More"). Member-gated with NO href → emit title as a plain heading.
 *
 * Runs once per matched instance (a grid holds multiple cards; a secure teaser is one card).
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

  // Detect the secure-teaser shape: a .cmp-teaser structure with no image-list items.
  const isSecureTeaser = element.classList.contains('cmp-teaser--secure')
    || (!element.querySelector('.cmp-image-list__item') && element.querySelector('.cmp-teaser'));

  if (isSecureTeaser) {
    // Single member-gated teaser card: image + title + description, NO link.
    const srcImg = element.querySelector('.cmp-teaser__image img, .cmp-image img, img');
    const imageCell = cleanImage(srcImg);

    const textCell = [];

    const title = element.querySelector('.cmp-teaser__title, h2, [class*="title"]');
    if (title && title.textContent.trim()) {
      const h3 = document.createElement('h3');
      h3.textContent = title.textContent.trim();
      textCell.push(h3);
    }

    const description = element.querySelector('.cmp-teaser__description, [class*="description"]');
    if (description && description.textContent.trim()) {
      const p = document.createElement('p');
      p.textContent = description.textContent.trim();
      textCell.push(p);
    }

    if (imageCell || textCell.length) {
      cells.push([imageCell || '', textCell.length ? textCell : '']);
    }
  } else {
    // IMAGE-LIST: each card is a list item within the image list.
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
  }

  // Empty-block guard: no cards found → unwrap gracefully. (cells does NOT
  // include the createBlock name row, so a single valid card has length 1.)
  if (cells.length === 0) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const block = WebImporter.Blocks.createBlock(document, { name: 'cards', cells });
  element.replaceWith(block);
}
