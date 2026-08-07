# WKND Site EDS Analysis Report Plan

Analyze **https://wknd.site/us/en.html** (and the broader WKND site) through the lens of Adobe Edge Delivery Services principles, produce a structured EDS analysis report, and publish it to Document Authoring (da.live) under the `jayant-adobe/capstone` content source.

> **Status:** Plan finalized and ready to run. Actual execution requires switching to **Execute mode** — I cannot create files or make network calls while Plan mode is active.

## Objective & Deliverable

- **Deliverable:** A single EDS-authored HTML report page uploaded to `da.live`.
- **DA target:** `https://admin.da.live/source/jayant-adobe/capstone/reports/wknd-eds-analysis.html` (viewable/editable in DA at `jayant-adobe/capstone/reports/wknd-eds-analysis`).
- **Scope:** Whole WKND site (URL discovery → page templates → block/design catalog), anchored on the `/us/en.html` homepage.
- **Report focus (all four):**
  1. EDS structure & blocks (sections, default content, reusable blocks)
  2. Content model & authoring approach
  3. Performance & accessibility (against `keeping-it-100` / Core Web Vitals / WCAG 2.1 AA)
  4. Migration scope (URLs, templates, block inventory, effort estimate)

## Approach Notes

- The report itself must follow **EDS markup principles**: semantic sections separated by `---`, heading hierarchy, and any tabular/structured findings expressed as EDS blocks (e.g. a `Cards` or `Columns` block for template inventories, tables for URL/block catalogs).
- Credentials for `admin.da.live` are injected automatically (no token needed). If upload returns 401/403, the DA opt-in is off — I'll pause and ask you to enable it in Settings → LLM Permissions rather than request a token.
- The report is an analysis artifact, not site content — it goes to `reports/` in DA, not into the repo's `content/` directory.

## Checklist

### Phase 1 — Discovery & Site Scope
- [ ] Confirm WKND site is reachable and inspect `https://wknd.site/us/en.html` (rendered DOM + structure)
- [ ] Discover site URLs (sitemap or crawl) rooted at `/us/en`
- [ ] Capture homepage screenshots and cleaned HTML for reference

### Phase 2 — Structural & Template Analysis
- [ ] Decompose the homepage into EDS sections and content sequences (default content vs. blocks)
- [ ] Identify candidate EDS blocks per section (hero, cards, columns, teaser/article lists, etc.)
- [ ] Group discovered pages into page templates (homepage, article/adventure detail, listing, etc.)
- [ ] Build a block inventory across templates (name, purpose, variants)

### Phase 3 — Content Model & Authoring Assessment
- [ ] For each key block, describe the authoring content model (what the author fills in)
- [ ] Note authoring decisions (section metadata, block options/variants, autoblocking opportunities)
- [ ] Flag any content patterns that are awkward for authors and suggest EDS-friendly alternatives

### Phase 4 — Performance & Accessibility Review
- [ ] Assess homepage against EDS performance best practices (LCP image, eager/lazy/delayed phasing, JS/CSS weight)
- [ ] Review accessibility: heading hierarchy, alt text, ARIA, contrast, keyboard nav (WCAG 2.1 AA)
- [ ] Summarize risks and concrete recommendations with priority

### Phase 5 — Migration Scope Summary
- [ ] Summarize URL count, template count, and block inventory
- [ ] Provide a rough migration effort/complexity estimate per template
- [ ] List reusable-block opportunities and net-new blocks required

### Phase 6 — Author the EDS Report
- [ ] Assemble findings into an EDS-structured report (sections via `---`, semantic headings)
- [ ] Express inventories/matrices as EDS blocks or tables (e.g. Cards/Columns/table)
- [ ] Produce the final report HTML file locally (EDS `.html` markup conventions)

### Phase 7 — Publish to da.live
- [ ] POST the report to `https://admin.da.live/source/jayant-adobe/capstone/reports/wknd-eds-analysis.html` (no auth header; injected)
- [ ] Verify a 200/success response; if 401/403, pause and ask you to enable the DA opt-in in Settings
- [ ] Confirm the report is retrievable in DA and report the final DA location back to you

## Open Assumptions
- Content source org/repo is **`jayant-adobe/capstone`** (from project config). If WKND content should instead go to an `aemsites/wknd`-style DA source, tell me and I'll adjust the target path.
- "Whole site" analysis will be scoped to the `/us/en` locale tree to keep it focused; I'll note other locales exist rather than fully cataloging them.
