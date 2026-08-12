import { toClassName } from '../../scripts/aem.js';
import queryIndex from '../../scripts/query-index.js';

/**
 * Resolve a card's categories from its `data-categories` attribute — a
 * space-separated list of category class names (e.g. `cycling travel`) that the
 * adventure-cards block sets from the query-index `category` column (see
 * blocks/adventure-cards/adventure-cards.js). A card with no attribute is
 * untagged and appears only under "All".
 * @param {Element} card the card `li`
 * @returns {string[]} lower-case category class names
 */
function categoriesForCard(card) {
  return (card.dataset.categories || '').split(/\s+/).filter(Boolean);
}

/**
 * Tabs Filter block.
 *
 * A category filter bar that toggles the visibility of cards in a sibling
 * `cards` block, rather than a panel-per-tab content switcher.
 *
 * DYNAMIC CATEGORIES (best practice): the category list is derived at RUNTIME
 * from the same query-index the sibling adventure-cards grid renders from — the
 * distinct values of the index `category` column, sorted, with "All" prepended.
 * So adding/removing an adventure (or retagging one) updates the filter tabs
 * automatically; nothing is hardcoded. The index path is read from an authored
 * `source` row (visible/editable in da.live), matching adventure-cards:
 *   | Tabs Filter |
 *   | source | /us/en/adventures/query-index.json |
 *
 * Graceful fallback: if there's no `source` row or the index can't be read, the
 * block falls back to any authored category labels (one per row), and if there
 * are none, to the categories present on the already-rendered sibling cards —
 * so it always renders a usable bar.
 *
 * Each card (`li`) is matched to a category via its `data-categories` attribute.
 * The "All" category (class name `all`) shows every card.
 *
 * @param {Element} block The block element
 */
export default async function decorate(block) {
  // Read config rows BEFORE we empty the block: `source` = the query-index to
  // derive categories from; any other single-cell row is treated as an authored
  // category label (the legacy hardcoded form, kept as a fallback).
  let source = '';
  const authoredLabels = [];
  [...block.children].forEach((row) => {
    const cells = [...row.children].map((c) => c.textContent.trim());
    const [key, val] = cells;
    if ((key || '').toLowerCase() === 'source' && val) {
      source = val;
    } else if (cells.length === 1 && key) {
      authoredLabels.push(key);
    }
  });

  // Locate the cards grid this filter controls: the next sibling `.cards` block
  // in the same section, falling back to any `.cards` block after this one.
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

  /**
   * Derive the ordered category label list. Priority:
   *   1. distinct `category` values from the query-index (dynamic, preferred)
   *   2. authored labels (legacy hardcoded rows)
   *   3. categories present on the already-rendered sibling cards
   * "All" is always first. Returns display labels (index/authored casing kept;
   * card-derived falls back to the class name).
   * @returns {Promise<string[]>}
   */
  const resolveCategories = async () => {
    // 1. from the query-index
    if (source) {
      const rows = await queryIndex(source);
      if (rows.length) {
        const seen = new Map(); // class name -> display label (first-seen casing)
        rows.forEach((row) => {
          (row.category || '').split(',').forEach((c) => {
            const label = c.trim();
            const cls = toClassName(label);
            if (cls && !seen.has(cls)) seen.set(cls, label);
          });
        });
        if (seen.size) {
          const labels = [...seen.values()].sort((a, b) => a.localeCompare(b));
          return ['All', ...labels];
        }
      }
    }
    // 2. authored labels
    if (authoredLabels.length) return authoredLabels;
    // 3. from rendered sibling cards
    const cards = findCards();
    if (cards) {
      const seen = new Set();
      cards.querySelectorAll('li').forEach((li) => {
        categoriesForCard(li).forEach((c) => seen.add(c));
      });
      if (seen.size) return ['All', ...[...seen].sort()];
    }
    return [];
  };

  const labels = await resolveCategories();

  // build the filter button bar
  const tablist = document.createElement('div');
  tablist.className = 'tabs-filter-list';
  tablist.setAttribute('role', 'tablist');

  // track the active category so late-arriving cards (the dynamic
  // adventure-cards block renders asynchronously after its query-index fetch)
  // can be filtered to the current selection when they appear.
  let activeCategory = 'all';

  const applyFilter = (category) => {
    activeCategory = category;
    const cards = findCards();
    if (!cards) return;
    cards.querySelectorAll('li').forEach((card) => {
      const cats = categoriesForCard(card);
      const show = category === 'all' || cats.includes(category);
      card.hidden = !show;
    });
  };

  labels.forEach((label, i) => {
    const id = toClassName(label);

    const button = document.createElement('button');
    button.className = 'tabs-filter-tab';
    button.id = `tab-${id}`;
    button.textContent = label;
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
  if (labels.length) applyFilter(toClassName(labels[0]));

  // The dynamic adventure-cards grid fetches its query-index and renders its
  // <li>s asynchronously, after this filter has decorated. Re-apply the active
  // category once those cards exist so the initial filter state is correct.
  document.addEventListener('adventure-cards:rendered', () => applyFilter(activeCategory));
}
