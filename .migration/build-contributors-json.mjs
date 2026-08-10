#!/usr/bin/env node
/**
 * Build the About Us "contributors" data sheet for Document Authoring.
 *
 * The About Us contributor/guide profiles are NOT backed by pages, so there is
 * nothing for helix-query.yaml to index. Instead we author them as a single EDS
 * data sheet published to /us/en/contributors.json; the profile-cards block
 * fetches that JSON and renders the two grids (team=contributor / team=guide).
 *
 * DA stores a single-sheet workbook as a JSON file in the source; when
 * previewed/published it is served as the standard EDS sheet shape
 * ({ total, offset, limit, data, ":type": "sheet" }). We write that shape here
 * and POST it to the DA source API, then preview/publish it.
 *
 * Image paths use the same site-relative media the About Us page already serves
 * (author-portrait experience-fragment assets, optimized by the media pipeline).
 */
import { writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outPath = join(__dirname, 'da-upload', 'us', 'en', 'contributors.json');

// order = display order within its team; team = which grid (contributor|guide).
// image = the site-relative media path the About Us page already uses.
const PEOPLE = [
  { name: 'Stacey Roswells', role: 'Artist | Photographer | Traveler', image: '/us/en/media_14d602e5d9734cdcbd0bde08c544b902c9c94c9d0.jpg', team: 'contributor', order: 1 },
  { name: 'Jake Hammer', role: 'Influencer | Writer', image: '/us/en/media_1f40e3118907b15ffb10dd48d2a0437c7becc775a.jpg', team: 'contributor', order: 2 },
  { name: 'Ian Provo', role: 'Photographer', image: '/us/en/media_182c0eb8bb070bf369598d7d8732c8c48b84997f2.jpg', team: 'contributor', order: 3 },
  { name: 'Jacob Wester', role: 'Skater | Writer', image: '/us/en/media_18848bc6b96d02b09a1b6f5c5164824b4e04a5589.jpg', team: 'contributor', order: 4 },
  { name: 'Sofia Sjöberg', role: 'Photographer | Youtuber', image: '/us/en/media_1572f6fd750a93c163d9781473f1c0504fb6632d8.jpg', team: 'guide', order: 1 },
  { name: 'Justin Barr', role: 'Artist | Rock Climber', image: '/us/en/media_17d56677293ed4c3fcfd3ec3bfe4e4dcdb728e16d.jpg', team: 'guide', order: 2 },
  { name: 'Kumar Selveraj', role: 'Photographer | Surfer', image: '/us/en/media_1ef1828871f9c15877d42f804af3c53dd10cc71d6.jpg', team: 'guide', order: 3 },
];

const sheet = {
  total: PEOPLE.length,
  offset: 0,
  limit: PEOPLE.length,
  data: PEOPLE.map((p) => ({
    name: p.name,
    role: p.role,
    image: p.image,
    team: p.team,
    order: String(p.order),
  })),
  ':type': 'sheet',
};

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, `${JSON.stringify(sheet, null, 2)}\n`);
console.log(`wrote ${outPath} (${PEOPLE.length} people)`);
