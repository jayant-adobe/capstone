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
  block.textContent = '';
  block.append(ul);
}
