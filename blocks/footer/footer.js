import { getMetadata } from '../../scripts/aem.js';
import { loadFragment } from '../fragment/fragment.js';

/**
 * Return the authorable content of a fragment section (its
 * `.default-content-wrapper` if present, otherwise the section itself).
 * @param {Element} section a fragment `.section` element
 * @returns {Element|null}
 */
function contentOf(section) {
  if (!section) return null;
  return section.querySelector(':scope > .default-content-wrapper') || section;
}

/**
 * Rebase fragment-relative image sources (e.g. `images/social-facebook.svg`)
 * against the footer fragment path so they resolve to the content root rather
 * than the page URL. Absolute/root-relative/`./media_` paths are left untouched.
 * @param {Element} root element containing the images
 * @param {string} footerPath path to the footer fragment (e.g. `/footer`)
 */
function rebaseImages(root, footerPath) {
  const base = new URL(footerPath, window.location);
  root.querySelectorAll('img[src]').forEach((img) => {
    const raw = img.getAttribute('src');
    if (!raw || /^(https?:)?\/\//.test(raw) || raw.startsWith('/')) return;
    img.src = new URL(raw, base).href;
  });
}

/**
 * Normalize internal WKND links to the Edge Delivery convention (extensionless).
 * The authored fragment carries source-style `.html` links but EDS serves
 * extensionless paths — the `.html` form 404s. Strip the extension from
 * root-relative internal links, preserving any ?query/#hash. Absolute external
 * links and `#` anchors are left untouched.
 * @param {Element} root element containing the links
 */
function normalizeInternalLinks(root) {
  root.querySelectorAll('a[href]').forEach((a) => {
    const raw = a.getAttribute('href');
    if (!raw || !raw.startsWith('/')) return;
    const next = raw.replace(/\.html?(?=($|[?#]))/i, '');
    if (next !== raw) a.setAttribute('href', next);
  });
}

/**
 * loads and decorates the footer
 * @param {Element} block The footer block element
 */
export default async function decorate(block) {
  // load footer as fragment. The local `aem up --html-folder content` server
  // serves it under `/content/footer`; DA/EDS production serves it at the content
  // root (`/footer`). Pick the order by environment so production does not log a
  // 404 for the local-only path: localhost tries `/content/footer` first,
  // production tries the metadata path (or `/footer`) first. Each still falls back.
  const footerMeta = getMetadata('footer');
  const footerPath = footerMeta ? new URL(footerMeta, window.location).pathname : '/footer';
  const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const candidates = isLocal ? ['/content/footer', footerPath] : [footerPath, '/content/footer'];
  let loadedPath = candidates[0];
  let fragment = await loadFragment(loadedPath);
  if (!fragment) {
    [, loadedPath] = candidates;
    fragment = await loadFragment(loadedPath);
  }
  if (!fragment) return;

  rebaseImages(fragment, loadedPath);
  normalizeInternalLinks(fragment);

  const sections = [...fragment.children];
  const mainContent = contentOf(sections[0]);
  const legalContent = contentOf(sections[1]);

  block.textContent = '';

  const footer = document.createElement('div');
  footer.className = 'footer-inner';

  // --- Top row: brand | nav | follow-us ---
  const top = document.createElement('div');
  top.className = 'footer-top';

  if (mainContent) {
    const logoP = mainContent.querySelector(':scope > p');
    const lists = mainContent.querySelectorAll(':scope > ul');
    const followHeading = mainContent.querySelector(':scope > h4');

    // brand
    if (logoP) {
      const brand = document.createElement('div');
      brand.className = 'footer-brand';
      brand.append(logoP);
      top.append(brand);
    }

    // primary nav (first list)
    if (lists[0]) {
      const nav = document.createElement('nav');
      nav.className = 'footer-nav';
      nav.setAttribute('aria-label', 'Footer navigation');
      nav.append(lists[0]);
      top.append(nav);
      // The "Home" link is present in the source footer DOM but hidden; keep it
      // for parity and tag its <li> so CSS hides it (visible nav = 4 items).
      // Links are normalized to extensionless above; match `/us/en` with the
      // legacy `.html` form as a fallback.
      const homeLink = nav.querySelector('a[href="/us/en"], a[href$="/us/en"], a[href="/us/en.html"], a[href$="/us/en.html"]');
      const homeLi = homeLink ? homeLink.closest('li') : null;
      if (homeLi) homeLi.classList.add('footer-nav-hidden');
    }

    // follow-us + social (heading + second list)
    const social = document.createElement('div');
    social.className = 'footer-social';
    if (followHeading) social.append(followHeading);
    if (lists[1]) {
      lists[1].classList.add('footer-social-list');
      social.append(lists[1]);
    }
    if (social.childElementCount) top.append(social);
  }

  footer.append(top);

  // --- Separator ---
  const hr = document.createElement('hr');
  hr.className = 'footer-separator';
  footer.append(hr);

  // --- Legal: copyright + disclaimer + Adobe Stock ---
  if (legalContent) {
    const legal = document.createElement('div');
    legal.className = 'footer-legal';
    while (legalContent.firstElementChild) legal.append(legalContent.firstElementChild);
    footer.append(legal);
  }

  block.append(footer);
}
