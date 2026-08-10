import { getMetadata } from '../../scripts/aem.js';
import { loadFragment } from '../fragment/fragment.js';

// media query match that indicates desktop width (nav visible inline, no hamburger)
const isDesktop = window.matchMedia('(min-width: 900px)');

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
 * Rebase fragment-relative image sources (e.g. `images/flag-us.svg`) against the
 * nav fragment path so they resolve to the content root rather than the page URL.
 * Absolute URLs and root-relative/`./media_` paths are left untouched.
 * @param {Element} root element containing the images
 * @param {string} navPath path to the nav fragment (e.g. `/nav`)
 */
function rebaseImages(root, navPath) {
  const base = new URL(navPath, window.location);
  root.querySelectorAll('img[src]').forEach((img) => {
    const raw = img.getAttribute('src');
    if (!raw || /^(https?:)?\/\//.test(raw) || raw.startsWith('/')) return;
    img.src = new URL(raw, base).href;
  });
}

/**
 * Normalize internal WKND links to the Edge Delivery convention (extensionless).
 * The authored fragment carries source-style `.html` links (e.g. `/us/en.html`,
 * `/us/en/magazine.html`) but EDS serves extensionless paths (`/us/en`,
 * `/us/en/magazine`) — the `.html` form 404s. Strip the extension from
 * root-relative internal links, preserving any ?query/#hash. Absolute external
 * links, `#` anchors, and mailto:/tel: are left untouched.
 * @param {Element} root element containing the links
 */
function normalizeInternalLinks(root) {
  root.querySelectorAll('a[href]').forEach((a) => {
    const raw = a.getAttribute('href');
    if (!raw || !raw.startsWith('/')) return; // only root-relative internal links
    const next = raw.replace(/\.html?(?=($|[?#]))/i, '');
    if (next !== raw) a.setAttribute('href', next);
  });
}

/**
 * Wire the scroll-triggered header shadow. Matches the source, which toggles a
 * `scrolly` class once the page is scrolled past ~15px; the CSS then fades in the
 * header's drop shadow (`header.scrolly .nav-wrapper`). Identical on all widths.
 * Uses requestAnimationFrame to coalesce scroll events (passive listener) and
 * sets the initial state in case the page loads already scrolled (deep link/hash).
 * @param {Element} header the semantic <header> element that carries the class
 */
function setupScrollShadow(header) {
  const THRESHOLD = 15; // px; source adds `scrolly` at scrollY 16 (> 15)
  let ticking = false;
  const update = () => {
    header.classList.toggle('scrolly', window.scrollY > THRESHOLD);
    ticking = false;
  };
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(update);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  update(); // initial state
}

/**
 * Collapse the mobile nav and reset the hamburger to its closed state.
 * @param {Element} nav The nav element
 */
function closeMobileNav(nav) {
  nav.setAttribute('aria-expanded', 'false');
  const button = nav.querySelector('.nav-hamburger button');
  if (button) button.setAttribute('aria-label', 'Open navigation');
  document.body.style.overflowY = '';
}

/**
 * Toggle the mobile nav open/closed.
 * @param {Element} nav The nav element
 * @param {boolean} [forceExpanded] Optional forced state
 */
function toggleMobileNav(nav, forceExpanded = null) {
  const expanded = forceExpanded !== null
    ? !forceExpanded
    : nav.getAttribute('aria-expanded') === 'true';
  const button = nav.querySelector('.nav-hamburger button');
  document.body.style.overflowY = (expanded || isDesktop.matches) ? '' : 'hidden';
  nav.setAttribute('aria-expanded', expanded ? 'false' : 'true');
  if (button) button.setAttribute('aria-label', expanded ? 'Open navigation' : 'Close navigation');
}

/**
 * Close the locale dropdown.
 * @param {Element} locale The locale wrapper
 */
function closeLocale(locale) {
  const toggle = locale.querySelector('.nav-locale-toggle');
  locale.classList.remove('open');
  if (toggle) toggle.setAttribute('aria-expanded', 'false');
}

/**
 * Build the search form. Form controls are created in JS, never authored in the
 * plain fragment.
 * @returns {Element} the search wrapper
 */
function buildSearch() {
  const wrapper = document.createElement('div');
  wrapper.className = 'nav-search';

  const form = document.createElement('form');
  form.className = 'nav-search-form';
  form.setAttribute('role', 'search');
  form.method = 'get';
  form.action = '/us/en/search.html';

  const icon = document.createElement('span');
  icon.className = 'nav-search-icon';
  icon.setAttribute('aria-hidden', 'true');

  const input = document.createElement('input');
  input.className = 'nav-search-input';
  input.type = 'search';
  input.name = 'fulltext';
  input.placeholder = 'Search';
  input.setAttribute('aria-label', 'Search');

  form.append(icon, input);
  wrapper.append(form);
  return wrapper;
}

/**
 * Build the utility bar: Sign In link + locale selector.
 * Reads the sign-in link and the country/locale list from the fragment DOM —
 * no country names, flags, or URLs are hardcoded here.
 * @param {Element} signInContent the sign-in section content
 * @param {Element} localeContent the locale section content (holds the country <ul>)
 * @returns {Element} the utility bar element
 */
function buildUtilityBar(signInContent, localeContent) {
  // Full-width dark band; its inner wrapper centers the content to the same
  // 1164px column as the main bar so Sign In + locale align above the search box.
  const utility = document.createElement('div');
  utility.className = 'nav-utility';
  const inner = document.createElement('div');
  inner.className = 'nav-utility-inner';
  utility.append(inner);

  // Sign In
  const signInLink = signInContent ? signInContent.querySelector('a') : null;
  if (signInLink) {
    const signIn = document.createElement('div');
    signIn.className = 'nav-signin';
    signIn.append(signInLink);
    inner.append(signIn);
  }

  // Locale selector — the first country's first locale link is the "current"
  // locale label; that country's image is the current flag.
  const list = localeContent ? localeContent.querySelector(':scope > ul') : null;
  if (list) {
    const locale = document.createElement('div');
    locale.className = 'nav-locale';

    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'nav-locale-toggle';
    toggle.setAttribute('aria-expanded', 'false');

    const firstCountry = list.querySelector(':scope > li');
    const currentFlag = firstCountry ? firstCountry.querySelector('img') : null;
    const currentLabel = firstCountry ? firstCountry.querySelector('ul a') : null;
    const labelText = currentLabel ? currentLabel.textContent.trim() : 'en-US';
    toggle.setAttribute('aria-label', `Toggle Language ${labelText}`);

    if (currentFlag) {
      const flagClone = currentFlag.cloneNode(true);
      flagClone.className = 'nav-locale-flag';
      toggle.append(flagClone);
    }
    const labelSpan = document.createElement('span');
    labelSpan.className = 'nav-locale-label';
    labelSpan.textContent = labelText;
    const caret = document.createElement('span');
    caret.className = 'nav-locale-caret';
    caret.setAttribute('aria-hidden', 'true');
    toggle.append(labelSpan, caret);

    const panel = document.createElement('div');
    panel.className = 'nav-locale-panel';
    // Wrap each country's leading text label in a titled span so it reads as a
    // group title (matches the source's country headings), keeping the flag and
    // the nested locale list intact.
    list.querySelectorAll(':scope > li').forEach((li) => {
      [...li.childNodes].forEach((node) => {
        if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
          const title = document.createElement('span');
          title.className = 'nav-locale-title';
          title.textContent = node.textContent.trim();
          li.replaceChild(title, node);
        }
      });
    });
    panel.append(list);

    locale.append(toggle, panel);

    toggle.addEventListener('click', (e) => {
      e.stopPropagation();
      const open = locale.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });

    inner.append(locale);
  }

  return utility;
}

/**
 * loads and decorates the header, mainly the nav
 * @param {Element} block The header block element
 */
export default async function decorate(block) {
  // load nav as fragment. The local `aem up --html-folder content` server serves
  // the file under `/content/nav`, while DA/EDS production serves it at the
  // content root (`/nav`). Pick the order by environment so production does not
  // log a 404 for the local-only path: localhost tries `/content/nav` first,
  // production tries the metadata path (or `/nav`) first. Each still falls back.
  const navMeta = getMetadata('nav');
  const navPath = navMeta ? new URL(navMeta, window.location).pathname : '/nav';
  const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const candidates = isLocal ? ['/content/nav', navPath] : [navPath, '/content/nav'];
  let loadedPath = candidates[0];
  let fragment = await loadFragment(loadedPath);
  if (!fragment) {
    [, loadedPath] = candidates;
    fragment = await loadFragment(loadedPath);
  }
  if (!fragment) return;

  rebaseImages(fragment, loadedPath);
  normalizeInternalLinks(fragment);

  // fragment sections in authored order: brand, primary nav, sign-in, locale
  const sections = [...fragment.children];
  const brandContent = contentOf(sections[0]);
  const navContent = contentOf(sections[1]);
  const signInContent = contentOf(sections[2]);
  const localeContent = contentOf(sections[3]);

  block.textContent = '';

  const nav = document.createElement('nav');
  nav.id = 'nav';
  nav.setAttribute('aria-expanded', 'false');

  // --- Utility bar (dark) ---
  const utility = buildUtilityBar(signInContent, localeContent);

  // --- Main bar (white) ---
  const main = document.createElement('div');
  main.className = 'nav-main';

  // brand / logo
  const brand = document.createElement('div');
  brand.className = 'nav-brand';
  if (brandContent) {
    while (brandContent.firstElementChild) brand.append(brandContent.firstElementChild);
  }

  // primary nav
  const navSections = document.createElement('div');
  navSections.className = 'nav-sections';
  if (navContent) {
    while (navContent.firstElementChild) navSections.append(navContent.firstElementChild);
  }
  // The "Home" link is a mobile-drawer-only item (the source shows it only in the
  // mobile menu). Tag its <li> so CSS can hide it at desktop width. Links are
  // normalized to extensionless above, so match `/us/en` (with the legacy
  // `.html` form as a fallback).
  const homeLink = navSections.querySelector('a[href="/us/en"], a[href$="/us/en"], a[href="/us/en.html"], a[href$="/us/en.html"]');
  if (homeLink) {
    const homeLi = homeLink.closest('li');
    if (homeLi) homeLi.classList.add('nav-home-mobile');
  }

  // search (built in JS)
  const search = buildSearch();

  // hamburger for mobile
  const hamburger = document.createElement('div');
  hamburger.className = 'nav-hamburger';
  hamburger.innerHTML = `<button type="button" aria-controls="nav" aria-label="Open navigation">
      <span class="nav-hamburger-icon"></span>
    </button>`;
  hamburger.addEventListener('click', () => toggleMobileNav(nav));

  // clicking a drawer link closes the mobile drawer
  navSections.querySelectorAll('a').forEach((a) => {
    a.addEventListener('click', () => {
      if (!isDesktop.matches) closeMobileNav(nav);
    });
  });

  main.append(hamburger, brand, navSections, search);

  nav.append(utility, main);

  // close mobile nav + locale dropdown when crossing to desktop
  isDesktop.addEventListener('change', () => {
    if (isDesktop.matches) {
      closeMobileNav(nav);
      const locale = nav.querySelector('.nav-locale');
      if (locale) closeLocale(locale);
    }
  });

  // close the locale dropdown on outside click; also dismiss the open mobile
  // drawer when tapping outside it (matches the source, which has no close
  // button — the drawer closes on outside tap / link tap / hamburger / Escape).
  document.addEventListener('click', (e) => {
    const locale = nav.querySelector('.nav-locale.open');
    if (locale && !locale.contains(e.target)) closeLocale(locale);

    if (!isDesktop.matches && nav.getAttribute('aria-expanded') === 'true') {
      const drawer = nav.querySelector('.nav-sections');
      const hamburgerBtn = nav.querySelector('.nav-hamburger');
      // ignore clicks on the drawer itself or the hamburger (it toggles its own)
      if (drawer && !drawer.contains(e.target)
        && hamburgerBtn && !hamburgerBtn.contains(e.target)) {
        closeMobileNav(nav);
      }
    }
  });

  // Escape closes the locale dropdown, then the mobile nav
  document.addEventListener('keydown', (e) => {
    if (e.code !== 'Escape') return;
    const locale = nav.querySelector('.nav-locale.open');
    if (locale) {
      closeLocale(locale);
      return;
    }
    if (!isDesktop.matches && nav.getAttribute('aria-expanded') === 'true') {
      toggleMobileNav(nav);
      const button = nav.querySelector('.nav-hamburger button');
      if (button) button.focus();
    }
  });

  const navWrapper = document.createElement('div');
  navWrapper.className = 'nav-wrapper';
  navWrapper.append(nav);
  block.append(navWrapper);

  // scroll-triggered drop shadow on the fixed header (matches source)
  setupScrollShadow(block.closest('header') || document.querySelector('header'));
}
