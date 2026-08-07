/* eslint-disable */
/* global WebImporter */
/**
 * Parser for variant: carousel
 * Base block: carousel
 * Source: https://wknd.site/us/en.html (div.carousel.cmp-carousel--hero)
 * Generated: 2026-08-07
 *
 * Block Collection "Carousel" model: 2 columns.
 *   Row 1: block name ("Carousel").
 *   One row PER SLIDE (dynamic): [ image | content ].
 *   Content cell = H2 title + description paragraph + optional CTA link.
 */
export default function parse(element, { document }) {
  // Pick the highest-resolution candidate: the base `src` is a capped web
  // rendition (~1280w); the `srcset` carries larger renditions (up to 1600w).
  // Choosing the widest srcset entry matches the crisp full-bleed source hero.
  const highestResSrc = (srcImg) => {
    const baseSrc = srcImg.getAttribute('src');
    const srcset = srcImg.getAttribute('srcset');
    if (srcset) {
      let bestUrl = null;
      let bestWidth = 0;
      srcset.split(',').forEach((candidate) => {
        const [url, descriptor = ''] = candidate.trim().split(/\s+/);
        const match = descriptor.match(/(\d+)w/);
        const width = match ? parseInt(match[1], 10) : 0;
        if (url && width >= bestWidth) {
          bestWidth = width;
          bestUrl = url;
        }
      });
      if (bestUrl) return bestUrl;
    }
    return baseSrc;
  };

  // Helper: build a clean <img> from a source coreimg <img>, keeping only src + alt.
  const cleanImage = (srcImg) => {
    if (!srcImg) return null;
    const src = highestResSrc(srcImg);
    if (!src) return null;
    const img = document.createElement('img');
    img.setAttribute('src', src);
    const alt = srcImg.getAttribute('alt');
    if (alt) img.setAttribute('alt', alt);
    return img;
  };

  const cells = [];

  // Each slide is a carousel item. Fall back to teaser scaffolding if items aren't marked.
  let slides = Array.from(element.querySelectorAll('.cmp-carousel__item'));
  if (!slides.length) {
    slides = Array.from(element.querySelectorAll('.teaser, [class*="teaser"]'));
  }

  slides.forEach((slide) => {
    // Image cell — source image lives in the teaser image wrapper.
    const srcImg = slide.querySelector('.cmp-teaser__image img, .cmp-image img, img');
    const imageCell = cleanImage(srcImg);

    // Content cell — title + description + optional CTA.
    const contentCell = [];

    const title = slide.querySelector('.cmp-teaser__title, h2, [class*="title"]');
    if (title) {
      const h2 = document.createElement('h2');
      h2.textContent = title.textContent.trim();
      contentCell.push(h2);
    }

    const description = slide.querySelector('.cmp-teaser__description, [class*="description"]');
    if (description) {
      // Use inner paragraph text if present, otherwise the container text.
      const text = description.textContent.trim();
      if (text) {
        const p = document.createElement('p');
        p.textContent = text;
        contentCell.push(p);
      }
    }

    const cta = slide.querySelector('.cmp-teaser__action-link, a[class*="action"], a');
    if (cta && cta.getAttribute('href')) {
      const link = document.createElement('a');
      link.setAttribute('href', cta.getAttribute('href'));
      link.textContent = cta.textContent.trim();
      contentCell.push(link);
    }

    // Only add the slide row if it has real content.
    if (imageCell || contentCell.length) {
      cells.push([imageCell || '', contentCell.length ? contentCell : '']);
    }
  });

  // Empty-block guard: no slides found → unwrap gracefully.
  if (cells.length === 1) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const block = WebImporter.Blocks.createBlock(document, { name: 'carousel', cells });
  element.replaceWith(block);
}
