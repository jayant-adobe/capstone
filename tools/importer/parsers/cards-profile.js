/* eslint-disable */
/* global WebImporter */
/**
 * Parser for variant: cards-profile
 * Base block: cards (team-member / contributor profile variant)
 * Source: https://wknd.site/us/en/about-us.html
 *   Instance: main div.container.responsivegrid.cmp-layout-container--fixed
 *             :has(div.title):has(div.button.cmp-button--icononly)
 * Generated: 2026-08-09
 *
 * The source is a SINGLE team-member profile container: a portrait image
 * (div.image), a name (div.title > h3), a role (div.title.cmp-title--black > h5),
 * and 3 social icon links (div.button.cmp-button--icononly > a). The About Us
 * page has 7 such sibling containers split into two grids by H2 headings; this
 * parser matches ONE container per invocation and emits ONE card.
 *
 * blocks/cards-profile/cards-profile.js expected input — 2 columns, one row per
 * card: [ image | body ]. The body cell holds h3 name + h5 role + social links.
 * The block treats a cell with a single <picture> as the image cell and the
 * other as the body cell. This is a 2-COLUMN block.
 *
 * Social link hrefs are preserved VERBATIM (they are '#'/anchor placeholders).
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

  // Portrait image.
  const srcImg = element.querySelector('.image img, .cmp-image img, img');
  const imageCell = cleanImage(srcImg);

  // Body cell — name, role, social links.
  const bodyCell = [];

  // Name + role are both rendered as .title headings, but their WRAPPER class
  // varies across profiles (some roles use `.title.cmp-title--black`, others a
  // plain `.title`). Classify by HEADING LEVEL instead: the name is the higher
  // heading (h1–h4, always h3 in source) and the role is the lower heading
  // (h5–h6). DOM order also puts name first, role second — used as a fallback.
  const titleHeadings = Array.from(element.querySelectorAll('.title .cmp-title__text, .title h1, .title h2, .title h3, .title h4, .title h5, .title h6'));
  let nameEl = null;
  let roleEl = null;
  titleHeadings.forEach((h) => {
    const level = parseInt((h.tagName || 'H3').replace(/[^0-9]/g, ''), 10) || 3;
    if (level <= 4) {
      if (!nameEl) nameEl = h;
    } else if (!roleEl) {
      roleEl = h;
    }
  });
  // Fallback: if level-based classification missed one, use DOM order.
  if (!nameEl && titleHeadings[0]) [nameEl] = titleHeadings;
  if (!roleEl && titleHeadings.length > 1) {
    roleEl = titleHeadings.find((h) => h !== nameEl) || null;
  }

  if (nameEl && nameEl.textContent.trim()) {
    const h3 = document.createElement('h3');
    h3.textContent = nameEl.textContent.trim();
    bodyCell.push(h3);
  }

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

  const block = WebImporter.Blocks.createBlock(document, { name: 'cards-profile', cells });
  element.replaceWith(block);
}
