/* eslint-disable */
/* global WebImporter, Node */

/**
 * Transformer: WKND section breaks + section metadata.
 *
 * Runs in afterTransform only. Driven by payload.template.sections from
 * tools/importer/page-templates.json (the homepage template has 5 sections),
 * so the import validator runs section validation against this file.
 *
 * Behaviour:
 *   1. Resolve the FIRST authorable element ("anchor") of every section, holding
 *      direct element references BEFORE any DOM mutation. This matters because
 *      two section anchors are position-sensitive
 *      (div.title.cmp-title--underline:nth-of-type(2) = "Recent Articles",
 *       div.title.cmp-title--underline:nth-of-type(6) = "Next Adventures");
 *      removing a sibling div.separator first would shift those nth-of-type
 *      indices and break the selectors. Capturing refs up front makes the later
 *      mutations order-independent.
 *   2. Insert an <hr> section break before each NON-first section's anchor
 *      (sections.length - 1 = 4 breaks).
 *   3. Insert a "Section Metadata" block for any section that has a `style`
 *      (none on this homepage — all styles are null — so 0 are created, which
 *      matches the validator's expected count).
 *   4. Remove the authorable div.separator dividers (rc7 between Recent Articles
 *      and Next Adventures; rc13 trailing after the "All Trips" CTA). Their role
 *      is now served by the template-driven <hr>s, so keeping them would produce
 *      a duplicate break (empty section) and a trailing empty section. This is
 *      the "separators become section breaks" step from the migration brief and
 *      is done LAST so it cannot disturb the nth-of-type anchor resolution above.
 *
 * All anchor selectors come from page-templates.json (verified against
 * migration-work/cleaned.html):
 *   - Hero:            div.carousel.cmp-carousel--hero                         (first section, no leading break)
 *   - Featured Article:div.teaser.cmp-teaser--featured
 *   - Recent Articles: div.title.cmp-title--underline:nth-of-type(2)           (H2 "Recent Articles")
 *   - Next Adventures: div.title.cmp-title--underline:nth-of-type(6)           (H2 "Next Adventures")
 *   - Where do you...: main.cmp-layout-container--fixed:nth-of-type(2) div.title (H3 "Where do you want to go?")
 */

const TransformHook = { beforeTransform: 'beforeTransform', afterTransform: 'afterTransform' };

/**
 * Return the earliest-in-document element among all of a section's selectors
 * (its defaultContent selectors plus its block selector). That earliest element
 * is the section's first authorable element and therefore where its leading
 * section break belongs. Default-content anchors (headings) are preferred
 * implicitly because they appear before the block in DOM order.
 */
function firstElementOfSection(root, section) {
  const selectors = [...(section.defaultContent || []), section.selector].filter(Boolean);
  let earliest = null;
  selectors.forEach((selector) => {
    let el = null;
    try {
      el = root.querySelector(selector);
    } catch (e) {
      el = null;
    }
    if (!el) return;
    // Update if this is the first candidate, or if `el` precedes the current earliest.
    if (!earliest
      || (earliest.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_PRECEDING)) {
      earliest = el;
    }
  });
  return earliest;
}

export default function transform(hookName, element, payload) {
  if (hookName !== TransformHook.afterTransform) return;

  const template = payload && payload.template;
  const sections = template && Array.isArray(template.sections) ? template.sections : [];
  if (sections.length < 2) return;

  // 1. Resolve every section's first-element anchor up front (hold references).
  const anchors = sections.map((section) => firstElementOfSection(element, section));

  // 2. Insert section-break <hr> before each non-first section (reverse order,
  //    for-safety even though we hold references).
  for (let i = sections.length - 1; i >= 1; i -= 1) {
    const anchor = anchors[i];
    if (!anchor) continue;
    const hr = element.ownerDocument.createElement('hr');
    anchor.parentElement.insertBefore(hr, anchor);
  }

  // 3. Section Metadata blocks for sections that declare a style (none here).
  sections.forEach((section, i) => {
    if (!section.style) return;
    const anchor = anchors[i];
    if (!anchor) return;
    const metadataBlock = WebImporter.Blocks.createBlock(element.ownerDocument, {
      name: 'Section Metadata',
      cells: { style: section.style },
    });
    // Place at the end of this section = just before the next section's anchor,
    // or append to this section's container when it is the last section.
    const nextAnchor = anchors[i + 1];
    if (nextAnchor && nextAnchor.parentElement) {
      nextAnchor.parentElement.insertBefore(metadataBlock, nextAnchor);
    } else {
      anchor.parentElement.appendChild(metadataBlock);
    }
  });

  // 4. Remove the authorable divider components now superseded by the section
  //    breaks above. Done last so it cannot shift the nth-of-type anchors.
  WebImporter.DOMUtils.remove(element, ['div.separator']);
}
