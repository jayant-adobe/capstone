/* eslint-disable */
/* global WebImporter */
/**
 * Parser for variant: cards-byline
 * Base block: cards (author-byline variant)
 * Source: magazine article pages (end-of-article author byline)
 *   Instance: main main div.experiencefragment
 * Generated: 2026-08-09
 *
 * The source is the author-bio experience fragment: a .cmp-byline with a
 * portrait (.cmp-byline__image img), a name (h2.cmp-byline__name), a role
 * (p.cmp-byline__occupations), and 3 social icon links
 * (div.button.cmp-button--icononly > a). A leading separator (hr) precedes it.
 *
 * blocks/cards-byline/cards-byline.js expected input — same content model as
 * cards / cards-profile: 2 columns, one row = one card [ image | body ]. Body
 * cell = name heading + role + social links. The block treats a cell with a
 * single <picture> as the image cell and the other as the body cell.
 * This is a 2-COLUMN block. Runs once per matched experience fragment.
 *
 * Social link hrefs are preserved VERBATIM (they are '#' anchor placeholders).
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

  // Portrait image — the byline image.
  const srcImg = element.querySelector('.cmp-byline__image img, .byline .cmp-image img, .cmp-image img, img');
  const imageCell = cleanImage(srcImg);

  // Body cell — name, role, social links.
  const bodyCell = [];

  // Name — the byline name heading (h2 in source). Emit as an h2 heading.
  const nameEl = element.querySelector('.cmp-byline__name, .byline h1, .byline h2, .byline h3');
  if (nameEl && nameEl.textContent.trim()) {
    const h2 = document.createElement('h2');
    h2.textContent = nameEl.textContent.trim();
    bodyCell.push(h2);
  }

  // Role — the occupations line. Emit as an h5 so the block styles it as the
  // muted role subheading (matches cards-byline.css role treatment).
  const roleEl = element.querySelector('.cmp-byline__occupations, .byline p');
  if (roleEl && roleEl.textContent.trim()) {
    const h5 = document.createElement('h5');
    h5.textContent = roleEl.textContent.trim();
    bodyCell.push(h5);
  }

  // Social links — icon-only buttons. Preserve hrefs verbatim; use the icon
  // platform name (button text / aria-label) as the link label.
  const socialLinks = Array.from(element.querySelectorAll('.button.cmp-button--icononly a, a.cmp-button'));
  socialLinks.forEach((a) => {
    const href = a.getAttribute('href');
    if (href === null) return;
    const link = document.createElement('a');
    link.setAttribute('href', href);
    const textEl = a.querySelector('.cmp-button__text');
    const label = (textEl ? textEl.textContent : a.getAttribute('aria-label') || a.textContent).trim();
    link.textContent = label;
    bodyCell.push(link);
  });

  // Empty-block guard.
  if (!imageCell && !bodyCell.length) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const cells = [
    [imageCell || '', bodyCell.length ? bodyCell : ''],
  ];

  const block = WebImporter.Blocks.createBlock(document, { name: 'cards-byline', cells });
  element.replaceWith(block);
}
