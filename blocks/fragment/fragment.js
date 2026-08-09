/*
 * Fragment Block
 * Include content on a page as a fragment.
 * https://www.aem.live/developer/block-collection/fragment
 */

// eslint-disable-next-line import/no-cycle
import {
  decorateMain,
} from '../../scripts/scripts.js';

import {
  loadSections,
} from '../../scripts/aem.js';

/**
 * Loads a fragment.
 * @param {string} path The path to the fragment
 * @returns {HTMLElement} The root element of the fragment
 */
export async function loadFragment(path) {
  if (path && path.startsWith('/') && !path.startsWith('//')) {
    const resp = await fetch(`${path}.plain.html`);
    if (resp.ok) {
      const main = document.createElement('main');
      main.innerHTML = await resp.text();

      // Reset base path for media to the fragment base. This must run before the
      // browser resolves the (now-detached) media against the fragment path.
      // Covers `./media_` hashed assets AND bare-relative paths like
      // `images/flag-us.svg` — the latter otherwise resolve against the CURRENT
      // page URL (e.g. /us/en/adventures/<slug>/images/…), firing a burst of 404
      // /ERR_ABORTED requests on deep paths before header.js/footer.js rebase them.
      // `main` is detached here, so rewriting src/srcset does not trigger a fetch.
      const fragmentBase = new URL(path, window.location);
      const resetAttributeBase = (tag, attr) => {
        main.querySelectorAll(`${tag}[${attr}]`).forEach((elem) => {
          const raw = elem.getAttribute(attr);
          // skip absolute URLs (http(s)://, //host) and root-relative (/…) paths;
          // rebase everything else (./media_…, images/…, etc.) to the fragment.
          if (!raw || /^(https?:)?\/\//.test(raw) || raw.startsWith('/')) return;
          elem[attr] = new URL(raw, fragmentBase).href;
        });
      };
      resetAttributeBase('img', 'src');
      resetAttributeBase('source', 'srcset');

      // Unwrap rasterized SVGs. The authored fragment wraps SVG logos/icons in a
      // <picture> with type="image/webp" <source>s (…format=webply), which tell the
      // browser to rasterize a vector to WebP at width=2000 — wasteful and served
      // unreliably by the pipeline (failed/aborted requests). SVGs should render
      // natively, so for any <picture> whose <img> is an SVG, drop the non-SVG
      // <source>s and keep the <img>. Runs while `main` is detached, so the bad
      // webp requests never fire.
      main.querySelectorAll('picture').forEach((picture) => {
        const img = picture.querySelector('img');
        const imgSrc = img && img.getAttribute('src');
        if (!imgSrc || !/\.svg(\?|$)/i.test(imgSrc)) return;
        picture.querySelectorAll('source').forEach((source) => {
          const srcset = source.getAttribute('srcset') || '';
          // keep only a native-SVG source (if any); remove webp/other rasterized ones
          if (source.getAttribute('type') !== 'image/svg+xml' || /format=webply/i.test(srcset)) {
            source.remove();
          }
        });
      });

      decorateMain(main);
      await loadSections(main);
      return main;
    }
  }
  return null;
}

export default async function decorate(block) {
  const link = block.querySelector('a');
  const path = link ? link.getAttribute('href') : block.textContent.trim();
  const fragment = await loadFragment(path);
  if (!fragment) return;

  const wrapper = block.closest('.fragment-wrapper');
  const section = wrapper.closest('.section');

  if (section && section.children.length === 1) {
    // fragment is the ONLY child of its section; replace the whole section
    section.replaceWith(...fragment.childNodes);
  } else {
    // fragment shares section with other children; flatten children into it
    fragment.querySelectorAll(':scope > .section').forEach((fragSection) => {
      [...fragSection.childNodes].forEach((child) => wrapper.before(child));
    });
    wrapper.remove();
  }
}
