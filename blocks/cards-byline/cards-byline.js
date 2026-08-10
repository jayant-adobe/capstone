import { createOptimizedPicture } from '../../scripts/aem.js';

/*
 * cards-byline — author byline card (variant of the vanilla `cards` block).
 *
 * Same content model as cards / cards-profile: each row is one card with
 * an image cell (portrait) and a body cell (name, role, social links).
 * Rendered as a single horizontal byline row rather than a grid — see
 * cards-byline.css. Follows the repo's cards convention (no instrumentation
 * helper; this is a DA project, not xwalk).
 */

// Inline social glyphs (currentColor) matching icons/social-*.svg, keyed by the
// social link's label text. The source renders each byline social link as a
// dark square with a white platform glyph; the imported links arrive as plain
// text ("Facebook"/"Twitter"/"Instagram"), so we swap the label for its icon.
const SOCIAL_ICONS = {
  facebook: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M13.5 21v-8h2.7l.4-3.1h-3.1V7.9c0-.9.25-1.5 1.55-1.5H16.7V3.6c-.3 0-1.3-.1-2.45-.1-2.42 0-4.08 1.48-4.08 4.2v2.3H7.5V13h2.67v8h3.33z"/></svg>',
  twitter: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M22 5.9c-.7.32-1.5.53-2.3.63.83-.5 1.46-1.28 1.76-2.22-.78.46-1.63.8-2.55.98A4.02 4.02 0 0 0 12 8.75c0 .31.03.62.1.9A11.4 11.4 0 0 1 3.8 4.9a4.02 4.02 0 0 0 1.24 5.37c-.65-.02-1.26-.2-1.8-.5v.05a4.02 4.02 0 0 0 3.23 3.94c-.6.16-1.23.18-1.82.07a4.02 4.02 0 0 0 3.75 2.79A8.07 8.07 0 0 1 2 18.55a11.38 11.38 0 0 0 6.16 1.8c7.4 0 11.44-6.13 11.44-11.44l-.01-.52A8.18 8.18 0 0 0 22 5.9z"/></svg>',
  instagram: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2.16c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41a3.72 3.72 0 0 1-1.38-.9 3.72 3.72 0 0 1-.9-1.38c-.16-.42-.36-1.06-.41-2.23C2.17 15.58 2.16 15.2 2.16 12s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.41C8.42 2.17 8.8 2.16 12 2.16zm0 1.62c-3.14 0-3.51.01-4.75.07-1.15.05-1.77.24-2.18.4-.55.22-.94.47-1.35.88-.41.41-.66.8-.88 1.35-.16.41-.35 1.03-.4 2.18-.06 1.24-.07 1.61-.07 4.75s.01 3.51.07 4.75c.05 1.15.24 1.77.4 2.18.22.55.47.94.88 1.35.41.41.8.66 1.35.88.41.16 1.03.35 2.18.4 1.24.06 1.61.07 4.75.07s3.51-.01 4.75-.07c1.15-.05 1.77-.24 2.18-.4.55-.22.94-.47 1.35-.88.41-.41.66-.8.88-1.35.16-.41.35-1.03.4-2.18.06-1.24.07-1.61.07-4.75s-.01-3.51-.07-4.75c-.05-1.15-.24-1.77-.4-2.18a3.63 3.63 0 0 0-.88-1.35 3.63 3.63 0 0 0-1.35-.88c-.41-.16-1.03-.35-2.18-.4-1.24-.06-1.61-.07-4.75-.07zm0 2.76a5.3 5.3 0 1 1 0 10.6 5.3 5.3 0 0 1 0-10.6zm0 1.62a3.68 3.68 0 1 0 0 7.36 3.68 3.68 0 0 0 0-7.36zm5.5-.9a1.24 1.24 0 1 1-2.48 0 1.24 1.24 0 0 1 2.48 0z"/></svg>',
};

export default function decorate(block) {
  /* change to ul, li */
  const ul = document.createElement('ul');
  [...block.children].forEach((row) => {
    const li = document.createElement('li');
    while (row.firstElementChild) li.append(row.firstElementChild);
    [...li.children].forEach((div) => {
      if (div.children.length === 1 && div.querySelector('picture')) div.className = 'cards-byline-card-image';
      else div.className = 'cards-byline-card-body';
    });
    ul.append(li);
  });
  ul.querySelectorAll('picture > img').forEach((img) => {
    // The author portrait is an absolute URL on the source origin (an
    // experience-fragment asset, e.g. wknd.site/content/.../jacob-wester.jpeg).
    // createOptimizedPicture rewrites the path with ?width/&format params that
    // only the EDS media pipeline serves — the external origin 404s them, so the
    // avatar breaks. Only optimize same-origin/relative images; leave absolute
    // cross-origin sources as their original <img>.
    let sameOrigin = false;
    try {
      sameOrigin = new URL(img.src, window.location.href).origin === window.location.origin;
    } catch (e) {
      sameOrigin = false;
    }
    if (sameOrigin) {
      const optimizedPic = createOptimizedPicture(img.src, img.alt, false, [{ width: '200' }]);
      img.closest('picture').replaceWith(optimizedPic);
    }
  });

  // Swap each social link's label text for its platform glyph (source renders a
  // white icon inside the dark square). Keep the accessible name via aria-label.
  ul.querySelectorAll('.cards-byline-card-body a').forEach((a) => {
    const label = a.textContent.trim();
    const icon = SOCIAL_ICONS[label.toLowerCase()];
    if (icon) {
      a.setAttribute('aria-label', label);
      a.innerHTML = icon;
    }
  });

  // Group the body cell to match the source layout: name + role stacked on the
  // left, the social buttons collected into one adjacent group on the right.
  // The imported links arrive as separate paragraphs; without grouping the flex
  // row spreads every heading/paragraph apart instead of clustering the icons.
  ul.querySelectorAll('.cards-byline-card-body').forEach((body) => {
    const social = document.createElement('div');
    social.className = 'cards-byline-social';
    body.querySelectorAll('a').forEach((a) => social.append(a));
    // drop the now-empty paragraphs the links were wrapped in
    [...body.querySelectorAll('p')].forEach((p) => {
      if (!p.textContent.trim() && !p.querySelector('a, img, svg')) p.remove();
    });
    // wrap the remaining name/role into a left-aligned meta group
    const meta = document.createElement('div');
    meta.className = 'cards-byline-meta';
    [...body.children].forEach((child) => meta.append(child));
    body.append(meta);
    if (social.children.length) body.append(social);
  });

  block.textContent = '';
  block.append(ul);
}
