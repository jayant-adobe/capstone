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
/**
 * Category membership for the WKND adventures, keyed by the adventure's URL slug
 * (the last path segment of its detail link). This is the source of truth for the
 * Adventures landing-page category filter and was extracted from the live source
 * (wknd.site/us/en/adventures) by activating each category tab and recording which
 * cards it revealed. A slug may belong to multiple categories (e.g. cycling-tuscany
 * is Cycling + Travel). A slug absent from this map (e.g. cycling-southern-utah,
 * which the source leaves untagged) is shown only under "All".
 *
 * The source computes this from each teaser's authored category tags — data that
 * lives only in its client-side filter JS, not in the delivered DOM — so we
 * reconstruct it here, at import time, and BAKE it into the content as a visible
 * block cell (see below). That way the runtime block reads categories straight
 * from authored content instead of a hard-coded map in the block JS.
 */
const SLUG_CATEGORIES = {
  'bali-surf-camp': ['Surfing'],
  'beervana-portland': ['Travel'],
  'climbing-new-zealand': ['Climbing'],
  'colorado-rock-climbing': ['Climbing'],
  'cycling-tuscany': ['Cycling', 'Travel'],
  'downhill-skiing-wyoming': ['Skiing'],
  'gastronomic-marais-tour': ['Travel'],
  'napa-wine-tasting': ['Travel'],
  'riverside-camping-australia': ['Travel'],
  'ski-touring-mont-blanc': ['Skiing'],
  'surf-camp-costa-rica': ['Surfing'],
  'tahoe-skiing': ['Skiing'],
  'west-coast-cycling': ['Cycling'],
  'whistler-mountain-biking': ['Cycling'],
  'yosemite-backpacking': ['Travel'],
};

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

    // Gated CTA label: the source shows a "Read More" affordance on each secure
    // teaser, but the content is member-gated so it's plain (non-linked) text —
    // emit it as a paragraph, NOT an anchor, so the locked-card styling
    // (.cards:not(:has(a)): dimmed + padlock badge) still applies.
    const action = element.querySelector('.cmp-teaser__action-link, .cmp-teaser__action-container, [class*="action"]');
    const actionText = action && action.textContent.trim();
    if (actionText) {
      const cta = document.createElement('p');
      cta.textContent = actionText;
      textCell.push(cta);
    }

    if (imageCell || textCell.length) {
      cells.push([imageCell || '', textCell.length ? textCell : '']);
    }
  } else {
    // IMAGE-LIST: each card is a list item within the image list.
    const cards = Array.from(element.querySelectorAll('.cmp-image-list__item, li'));

    // Is this grid the one controlled by the category tab filter? The tabs-filter
    // parser runs BEFORE this one and moves the Adventures grid out of the tabs
    // subtree (so a `.cmp-tabs` ancestor check no longer works here); before moving
    // it, that parser stamps `data-filtered-grid` on the grid. Fall back to the
    // original tabs ancestry in case the grid is parsed in place. The homepage grid
    // has neither marker, so it stays the plain 2-column [image | text] shape.
    const isFilteredGrid = element.hasAttribute('data-filtered-grid')
      || !!element.closest('[class*="cmp-tabs__tabpanel"], .cmp-tabs');

    cards.forEach((card) => {
      // Image cell.
      const srcImg = card.querySelector('.cmp-image-list__item-image img, .cmp-image img, img');
      const imageCell = cleanImage(srcImg);

      // Text cell.
      const textCell = [];

      // Linked title — anchor wrapping the title text. Render as a heading with a link.
      const titleLink = card.querySelector('a.cmp-image-list__item-title-link, a[class*="title-link"]');
      const titleText = card.querySelector('.cmp-image-list__item-title, [class*="item-title"]:not([class*="title-link"])');
      let href = '';
      if (titleLink) {
        href = titleLink.getAttribute('href') || '';
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
        const row = [imageCell || '', textCell.length ? textCell : ''];

        // Bake the category membership into a 3rd cell for the filtered grid. The
        // categories are keyed by the adventure's detail-link slug (see
        // SLUG_CATEGORIES). Emit the labels as a comma-joined <p> (matching the
        // filter tab labels, e.g. "Cycling, Travel"); untagged adventures get the
        // sentinel "None" so every row stays a clean 3-cell block (no empty cells
        // to lose in the HTML→markdown round-trip). The runtime cards block reads
        // this cell into a `data-categories` attribute and removes it from render.
        if (isFilteredGrid) {
          const slug = href.match(/\/adventures\/([^./?#]+)/)?.[1] || '';
          const cats = SLUG_CATEGORIES[slug] || [];
          const p = document.createElement('p');
          p.textContent = cats.length ? cats.join(', ') : 'None';
          row.push([p]);
        }

        cells.push(row);
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
