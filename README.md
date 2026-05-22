# China, International Law, and International Order

A curated scholarly portal for Professor Wang Jiangyu's research on China's approach to international law and its impact on the evolving international order.

## What Is Included

- Astro static website with GitHub Pages workflow
- Eight topic dossiers
- Searchable archive with 185 launch records
- Chronology with 28 timeline entries
- Bibliography with 52 literature/report entries
- Bilingual record metadata where available
- Content validation for duplicate IDs, invalid URLs, missing citations, invalid dates, and unknown topic tags

## Local Setup

```bash
npm install
npm run test
npm run build
npm run dev
```

The build disables Astro telemetry through the package script so local builds do not need to write preference files outside the project.

## Editing Content

- Archive records: `src/data/records.csv`
- Timelines: `src/data/timelines.csv`
- Bibliography: `src/data/bibliography.csv`
- Topic guide source notes: `src/content/topics/*.mdx`
- Topic guide display metadata: `src/lib/guides.mjs`

Run `npm run validate` after editing CSV files. The validator fails the build if required metadata is missing or inconsistent.

## Regenerating Seed Data

The launch corpus was generated from `scripts/seed-content.mjs`:

```bash
npm run seed
```

Treat generated summaries and significance notes as editorial scaffolding. They should be reviewed before public launch.

## Deployment

The repository includes `.github/workflows/deploy.yml` for GitHub Pages. After pushing to `main`, GitHub Actions will validate content, build the Astro site, and publish `dist`.
