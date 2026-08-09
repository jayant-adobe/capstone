import { toClassName } from '../../scripts/aem.js';

/**
 * Category membership for the WKND adventures, keyed by the adventure's URL slug
 * (the last path segment of its detail link). Extracted from the source filter
 * (wknd.site/us/en/adventures) by reading which cards each category tab reveals.
 * A slug may belong to multiple categories (e.g. cycling-tuscany is Cycling +
 * Travel). The source uses the card's authored category tags for this; our
 * import did not carry them onto the cards, so we reconstruct the mapping here.
 */
const SLUG_CATEGORIES = {
  'climbing-new-zealand': ['climbing'],
  'colorado-rock-climbing': ['climbing'],
  'whistler-mountain-biking': ['cycling'],
  'cycling-tuscany': ['cycling', 'travel'],
  'west-coast-cycling': ['cycling'],
  'downhill-skiing-wyoming': ['skiing'],
  'ski-touring-mont-blanc': ['skiing'],
  'tahoe-skiing': ['skiing'],
  'bali-surf-camp': ['surfing'],
  'surf-camp-costa-rica': ['surfing'],
  'beervana-portland': ['travel'],
  'gastronomic-marais-tour': ['travel'],
  'napa-wine-tasting': ['travel'],
  'riverside-camping-australia': ['travel'],
  'yosemite-backpacking': ['travel'],
};

/**
 * Resolve a card's categories. Prefers an explicit `data-categories` attribute
 * (if the import ever populates it); otherwise derives them from the adventure
 * slug in the card's detail link via SLUG_CATEGORIES.
 * @param {Element} card the card `li`
 * @returns {string[]} lower-case category class names
 */
function categoriesForCard(card) {
  const explicit = (card.dataset.categories || '').split(/\s+/).filter(Boolean);
  if (explicit.length) return explicit;
  const href = card.querySelector('a[href]')?.getAttribute('href') || '';
  const slug = href.match(/\/adventures\/([^./?#]+)/)?.[1];
  return (slug && SLUG_CATEGORIES[slug]) || [];
}

/**
 * Tabs Filter block.
 *
 * A category filter bar that toggles the visibility of cards in a sibling
 * `cards` block, rather than a panel-per-tab content switcher.
 *
 * Authoring model (one category label per row):
 *   | Tabs Filter |
 *   | All         |
 *   | Climbing    |
 *   | Cycling     |
 *   | ...         |
 *
 * The block filters the first following sibling `.cards` block in the same
 * section. Each card (`li`) is matched to a category via its
 * `data-categories` attribute (a space-separated list of category class names,
 * e.g. `cycling travel`) which the import transformer populates from the
 * source. The "All" category (or any label whose class name is `all`) shows
 * every card.
 *
 * @param {Element} block The block element
 */
export default function decorate(block) {
  // build the filter button bar
  const tablist = document.createElement('div');
  tablist.className = 'tabs-filter-list';
  tablist.setAttribute('role', 'tablist');

  // one row = one category label
  const labels = [...block.children].map((row) => {
    const cell = row.firstElementChild || row;
    return {
      text: cell.textContent.trim(),
      html: cell.innerHTML,
    };
  }).filter((label) => label.text);

  // locate the cards grid this filter controls: the next sibling `.cards`
  // block in the same section wrapper, falling back to any `.cards` block
  // after this one in the document.
  const findCards = () => {
    let el = block.nextElementSibling;
    while (el) {
      if (el.classList.contains('cards')) return el;
      const nested = el.querySelector(':scope .cards');
      if (nested) return nested;
      el = el.nextElementSibling;
    }
    const wrapper = block.closest('.section') || document;
    return wrapper.querySelector('.cards');
  };

  const applyFilter = (category) => {
    const cards = findCards();
    if (!cards) return;
    cards.querySelectorAll('li').forEach((card) => {
      const cats = categoriesForCard(card);
      const show = category === 'all' || cats.includes(category);
      card.hidden = !show;
    });
  };

  labels.forEach((label, i) => {
    const id = toClassName(label.text);

    const button = document.createElement('button');
    button.className = 'tabs-filter-tab';
    button.id = `tab-${id}`;
    button.innerHTML = label.html;
    button.setAttribute('aria-selected', !i);
    button.setAttribute('role', 'tab');
    button.setAttribute('type', 'button');
    button.dataset.category = id;

    button.addEventListener('click', () => {
      tablist.querySelectorAll('button').forEach((btn) => {
        btn.setAttribute('aria-selected', false);
      });
      button.setAttribute('aria-selected', true);
      applyFilter(id);
    });

    tablist.append(button);
  });

  block.replaceChildren(tablist);

  // apply the default (first) category on load
  if (labels.length) applyFilter(toClassName(labels[0].text));
}
