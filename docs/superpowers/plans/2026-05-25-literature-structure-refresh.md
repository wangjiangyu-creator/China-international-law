# Literature Structure Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the growing research corpus easier to browse by restructuring the literature and topic pages while adding another curated batch of China/international-law/order materials.

**Architecture:** Add small content-layer helpers that group bibliography and guide readings by topic and source category, then reuse those helpers in the page templates. Keep the data model CSV-first, preserve existing routes, and make the UI changes additive rather than rewriting the site's structure.

**Tech Stack:** Astro, plain `.astro` components, `node:test`, CSV-backed content helpers in `src/lib/content.mjs`

---

### Task 1: Add helper tests for grouped bibliography and guide readings

**Files:**
- Modify: `tests/content.test.mjs`
- Test: `tests/content.test.mjs`

- [x] Add failing tests for bibliography section grouping and topic reading grouping.
- [x] Run the targeted test file and confirm the new assertions fail for missing helpers.
- [x] Implement only enough helper API shape in the tests to drive the content-layer work.

### Task 2: Implement grouping helpers in the content layer

**Files:**
- Modify: `src/lib/content.mjs`
- Test: `tests/content.test.mjs`

- [x] Add helper functions for bibliography topic sections, recent additions, and reading-category grouping.
- [x] Keep topic ordering tied to the existing `topicOrder` and labels from `topics.mjs`.
- [x] Re-run the content tests and make the new helper tests pass.

### Task 3: Refine the literature and topic page structure

**Files:**
- Create: `src/components/ReadingCard.astro`
- Modify: `src/pages/literature.astro`
- Modify: `src/pages/topics/[slug].astro`
- Modify: `src/styles/global.css`

- [x] Replace the flat literature stream with a structured surface: summary stats, quick-jump navigation, recent additions, and grouped topic sections.
- [x] Split topic-guide readings into clearer editorial buckets such as scholarship/books and reports/policy analysis.
- [x] Add only the styling needed to support the new layouts and keep the existing visual language.

### Task 4: Expand the corpus with another curated batch

**Files:**
- Modify: `src/data/records-scholarship.csv`
- Modify: `src/data/bibliography.csv`
- Modify: `src/lib/guides.mjs`

- [x] Add another focused batch of recent journal articles and reports on China, international law, international order, human rights order, maritime order, and economic security.
- [x] Surface the best new items in both the searchable scholarship corpus and the literature bibliography.
- [x] Thread the strongest additions into the relevant topic guides without bloating every list.

### Task 5: Verify the refreshed site

**Files:**
- Verify only

- [x] Run `node scripts/validate-content.mjs`.
- [x] Run `node --test tests/*.test.mjs`.
- [x] Run `ASTRO_TELEMETRY_DISABLED=1 node scripts/create-visual-asset.mjs`.
- [x] Run `ASTRO_TELEMETRY_DISABLED=1 node node_modules/astro/bin/astro.mjs build`.
- [x] Report the updated corpus counts and structural improvements from fresh command output only.
