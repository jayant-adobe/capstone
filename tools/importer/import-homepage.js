/* eslint-disable */
/* global WebImporter */

// PARSER IMPORTS
import carouselParser from './parsers/carousel.js';
import columnsParser from './parsers/columns.js';
import cardsParser from './parsers/cards.js';

// TRANSFORMER IMPORTS
import cleanupTransformer from './transformers/wknd-cleanup.js';
import sectionsTransformer from './transformers/wknd-sections.js';

// PAGE TEMPLATE CONFIGURATION - Embedded from page-templates.json
const PAGE_TEMPLATE = {
  name: 'homepage',
  description: 'WKND home page: hero carousel (3 slides), Featured Article teaser, Recent Articles card grid (4), Next Adventures teaser, and adventure recommendations card grid (4). Content-driven card and slide sections are dynamic/repeatable.',
  urls: [
    'https://wknd.site/us/en.html',
  ],
  blocks: [
    {
      name: 'carousel',
      instances: ['div.carousel.cmp-carousel--hero'],
    },
    {
      name: 'columns',
      instances: [
        'div.teaser.cmp-teaser--featured',
        'div.teaser.cmp-teaser--hero.cmp-teaser--imagebottom',
      ],
    },
    {
      name: 'cards',
      instances: ['div.image-list.list'],
    },
  ],
  sections: [
    {
      id: 'rc2',
      name: 'Hero',
      selector: 'div.carousel.cmp-carousel--hero',
      style: null,
      blocks: ['carousel'],
      defaultContent: [],
    },
    {
      id: 'rc3',
      name: 'Featured Article',
      selector: 'div.teaser.cmp-teaser--featured',
      style: null,
      blocks: ['columns'],
      defaultContent: [],
    },
    {
      id: 'rc5',
      name: 'Recent Articles',
      selector: 'div.image-list.list',
      style: null,
      blocks: ['cards'],
      defaultContent: [
        'div.title.cmp-title--underline:nth-of-type(2)',
        'div.button.cmp-button--primary',
        'div.separator',
      ],
    },
    {
      id: 'rc9',
      name: 'Next Adventures',
      selector: 'div.teaser.cmp-teaser--hero.cmp-teaser--imagebottom',
      style: null,
      blocks: ['columns'],
      defaultContent: ['div.title.cmp-title--underline:nth-of-type(6)'],
    },
    {
      id: 'rc11',
      name: 'Where do you want to go?',
      selector: 'main.cmp-layout-container--fixed:nth-of-type(2) div.image-list.list',
      style: null,
      blocks: ['cards'],
      defaultContent: [
        'main.cmp-layout-container--fixed:nth-of-type(2) div.title',
        'main.cmp-layout-container--fixed:nth-of-type(2) div.button.cmp-button--primary',
        'main.cmp-layout-container--fixed:nth-of-type(2) div.separator',
      ],
    },
  ],
};

// PARSER REGISTRY
const parsers = {
  carousel: carouselParser,
  columns: columnsParser,
  cards: cardsParser,
};

// TRANSFORMER REGISTRY (cleanup first, then sections in afterTransform)
const transformers = [
  cleanupTransformer,
  ...(PAGE_TEMPLATE.sections && PAGE_TEMPLATE.sections.length > 1 ? [sectionsTransformer] : []),
];

/**
 * Execute all page transformers for a specific hook.
 * @param {string} hookName 'beforeTransform' | 'afterTransform'
 * @param {Element} element DOM element (document.body)
 * @param {Object} payload { document, url, html, params }
 */
function executeTransformers(hookName, element, payload) {
  const enhancedPayload = { ...payload, template: PAGE_TEMPLATE };
  transformers.forEach((transformerFn) => {
    try {
      transformerFn.call(null, hookName, element, enhancedPayload);
    } catch (e) {
      console.error(`Transformer failed at ${hookName}:`, e);
    }
  });
}

/**
 * Find all blocks on the page based on the embedded template configuration.
 * @param {Document} document
 * @param {Object} template PAGE_TEMPLATE
 * @returns {Array} block instances found on the page
 */
function findBlocksOnPage(document, template) {
  const pageBlocks = [];
  template.blocks.forEach((blockDef) => {
    blockDef.instances.forEach((selector) => {
      const elements = document.querySelectorAll(selector);
      if (elements.length === 0) {
        console.warn(`Block "${blockDef.name}" selector not found: ${selector}`);
      }
      elements.forEach((element) => {
        pageBlocks.push({
          name: blockDef.name,
          selector,
          element,
          section: blockDef.section || null,
        });
      });
    });
  });
  console.log(`Found ${pageBlocks.length} block instances on page`);
  return pageBlocks;
}

export default {
  transform: (payload) => {
    const {
      document, url, html, params,
    } = payload;

    const main = document.body;

    // 1. beforeTransform (initial cleanup)
    executeTransformers('beforeTransform', main, payload);

    // 2. Discover blocks from embedded template
    const pageBlocks = findBlocksOnPage(document, PAGE_TEMPLATE);

    // 3. Parse each block (skip elements already replaced by a prior parser)
    pageBlocks.forEach((block) => {
      if (!block.element.parentNode) return;
      const parser = parsers[block.name];
      if (parser) {
        try {
          parser(block.element, { document, url, params });
        } catch (e) {
          console.error(`Failed to parse ${block.name} (${block.selector}):`, e);
        }
      } else {
        console.warn(`No parser found for block: ${block.name}`);
      }
    });

    // 4. afterTransform (final cleanup + section breaks/metadata)
    executeTransformers('afterTransform', main, payload);

    // 5. WebImporter built-in rules
    const hr = document.createElement('hr');
    main.appendChild(hr);
    WebImporter.rules.createMetadata(main, document);
    WebImporter.rules.transformBackgroundImages(main, document);
    WebImporter.rules.adjustImageUrls(main, url, params.originalURL);

    // 6. Sanitized path (map root/homepage to /index to avoid empty-path crash)
    const rawPath = new URL(params.originalURL).pathname
      .replace(/\/$/, '')
      .replace(/\.html?$/, '');
    const path = WebImporter.FileUtils.sanitizePath(rawPath === '' ? '/index' : rawPath);

    return [{
      element: main,
      path,
      report: {
        title: document.title,
        template: PAGE_TEMPLATE.name,
        blocks: pageBlocks.map((b) => b.name),
      },
    }];
  },
};
