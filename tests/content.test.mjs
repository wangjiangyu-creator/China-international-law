import test from "node:test";
import assert from "node:assert/strict";

import { parseCsv } from "../src/lib/csv.mjs";
import * as contentLib from "../src/lib/content.mjs";
import { guides } from "../src/lib/guides.mjs";
import { filterRecords, getTopicProfile } from "../src/lib/search.mjs";

const {
  loadSiteContent,
  validateContent,
  topicLabels,
  buildBibliographySections,
  groupReadingEntries,
} = contentLib;

test("parseCsv preserves quoted commas and empty cells", () => {
  const rows = parseCsv('id,title,notes\nr1,"One, two",\nr2,Plain,"quoted ""term"""');

  assert.deepEqual(rows, [
    { id: "r1", title: "One, two", notes: "" },
    { id: "r2", title: "Plain", notes: 'quoted "term"' },
  ]);
});

test("validateContent rejects duplicate record IDs, invalid URLs, and unknown topics", () => {
  const result = validateContent({
    records: [
      {
        id: "dup",
        title_en: "Valid source",
        title_zh: "",
        source_type: "PRC official document",
        institution: "Ministry of Foreign Affairs",
        date: "2024-01-01",
        topics: "theory-order",
        jurisdiction: "China",
        language: "English",
        url: "https://example.com/source",
        doi_or_isbn: "",
        citation: "Valid citation",
        summary: "Summary.",
        significance_note: "Note.",
      },
      {
        id: "dup",
        title_en: "",
        title_zh: "",
        source_type: "PRC official document",
        institution: "Ministry of Foreign Affairs",
        date: "bad-date",
        topics: "unknown-topic",
        jurisdiction: "China",
        language: "English",
        url: "not a url",
        doi_or_isbn: "",
        citation: "",
        summary: "Summary.",
        significance_note: "Note.",
      },
      {
        id: "search-link",
        title_en: "Search placeholder",
        title_zh: "",
        source_type: "PRC official document",
        institution: "Ministry of Foreign Affairs",
        date: "2024-01-01",
        topics: "theory-order",
        jurisdiction: "China",
        language: "English",
        url: "https://www.google.com/search?q=source%3E",
        doi_or_isbn: "",
        citation: "Valid citation",
        summary: "Summary.",
        significance_note: "Note.",
      },
    ],
    timeline: [],
    bibliography: [],
  });

  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /Duplicate record id: dup/);
  assert.match(result.errors.join("\n"), /Record dup is missing title_en/);
  assert.match(result.errors.join("\n"), /Record dup has invalid date/);
  assert.match(result.errors.join("\n"), /Record dup has invalid URL/);
  assert.match(result.errors.join("\n"), /Record dup has unknown topic: unknown-topic/);
  assert.match(result.errors.join("\n"), /Record dup is missing citation/);
  assert.match(result.errors.join("\n"), /Record search-link uses a Google search placeholder URL/);
  assert.match(result.errors.join("\n"), /Record search-link has a malformed URL artifact/);
});

test("loadSiteContent provides the launch-scale curated corpus", () => {
  const content = loadSiteContent();
  const result = validateContent(content);

  assert.equal(result.ok, true, result.errors.join("\n"));
  assert.ok(content.records.length >= 295);
  assert.ok(content.timeline.length >= 20);
  assert.ok(content.bibliography.length >= 20);
  assert.ok(content.records.some((record) => record.id === "prc-2018-arctic-policy"));
  assert.ok(content.records.some((record) => record.id === "prc-2020-unreliable-entity-list"));
  assert.ok(content.records.some((record) => record.id === "practice-2025-iomed-signing"));
  assert.ok(content.records.some((record) => record.id === "lit-2024-cjtl-frl-political-framing"));
  assert.ok(content.records.some((record) => record.id === "lit-2025-hague-foreign-related-rule-of-law"));
  assert.ok(content.records.some((record) => record.id === "tt-2026-hcss-chinese-lawfare"));
  assert.deepEqual(Object.keys(topicLabels), [
    "theory-order",
    "sovereignty-non-interference",
    "one-country-two-systems",
    "use-of-force",
    "global-economic-system",
    "sanctions-anti-sanctions",
    "belt-and-road",
    "dispute-settlement",
  ]);
});

test("filterRecords combines search text with topic and source filters", () => {
  const { records } = loadSiteContent();

  const sanctions = filterRecords(records, {
    query: "sanctions",
    topic: "sanctions-anti-sanctions",
    sourceType: "PRC official document",
  });

  assert.ok(sanctions.length >= 3);
  assert.ok(
    sanctions.every((record) =>
      record.topics.includes("sanctions-anti-sanctions"),
    ),
  );
  assert.ok(
    sanctions.every((record) => record.source_type === "PRC official document"),
  );

  const wto = filterRecords(records, {
    query: "WTO",
    topic: "dispute-settlement",
  });

  assert.ok(wto.length >= 10);

  const mediation = filterRecords(records, {
    query: "International Organization for Mediation",
    topic: "dispute-settlement",
  });

  assert.ok(mediation.length >= 2);

  const foreignRelationsLaw = filterRecords(records, {
    query: "Foreign Relations Law",
    sourceType: "Literature",
  });

  assert.ok(foreignRelationsLaw.length >= 3);

  const lawfare = filterRecords(records, {
    query: "lawfare",
    sourceType: "Think tank report",
  });

  assert.ok(lawfare.length >= 2);
});

test("getTopicProfile returns records, timeline entries, and bibliography for a topic", () => {
  const content = loadSiteContent();
  const profile = getTopicProfile(content, "belt-and-road");

  assert.equal(profile.label, "Belt and Road Initiative");
  assert.ok(profile.records.length >= 10);
  assert.ok(profile.timeline.length >= 3);
  assert.ok(profile.bibliography.length >= 2);
});

test("topic guides include detailed overview introductions", () => {
  assert.equal(guides.length, 8);
  for (const guide of guides) {
    assert.ok(Array.isArray(guide.overview), `${guide.slug} overview should be an array`);
    assert.ok(guide.overview.length >= 2, `${guide.slug} should have at least two overview paragraphs`);
    assert.ok(
      guide.overview.every((paragraph) => paragraph.length >= 120),
      `${guide.slug} overview paragraphs should be substantive`,
    );
  }
});

test("topic guide reading IDs resolve to bibliography or records", () => {
  const content = loadSiteContent();
  const bibliographyIds = new Set(content.bibliography.map((entry) => entry.id));
  const recordIds = new Set(content.records.map((record) => record.id));

  for (const guide of guides) {
    assert.ok(guide.readingIds.length >= 10, `${guide.slug} should have a substantial reading list`);
    for (const id of guide.readingIds) {
      assert.ok(
        bibliographyIds.has(id) || recordIds.has(id),
        `${guide.slug} references missing reading id ${id}`,
      );
    }
  }
});

test("one country two systems topic covers Hong Kong, Macau, and Taiwan materials", () => {
  const content = loadSiteContent();
  const profile = getTopicProfile(content, "one-country-two-systems");
  const guide = guides.find((entry) => entry.slug === "one-country-two-systems");

  assert.equal(
    profile.label,
    "One Country, Two Systems: Hong Kong, Macau and Taiwan",
  );
  assert.equal(
    guide?.title,
    "China's One Country, Two Systems: Hong Kong, Macau and Taiwan",
  );
  assert.ok(profile.records.length >= 18);
  assert.ok(profile.timeline.length >= 4);
  assert.ok(profile.bibliography.length >= 2);
  assert.ok(profile.records.some((record) => /Hong Kong/.test(record.title_en)));
  assert.ok(profile.records.some((record) => /Macau|Macao/.test(record.title_en)));
  assert.ok(profile.records.some((record) => /Taiwan/.test(record.title_en)));
});

test("buildBibliographySections groups literature by topic order and recent additions", () => {
  const content = loadSiteContent();
  const sections = buildBibliographySections(content.bibliography);

  assert.equal(sections.summary.total, content.bibliography.length);
  assert.ok(sections.summary.reportCount >= 20);
  assert.ok(sections.summary.scholarshipCount >= 80);
  assert.equal(sections.topicSections[0].slug, "theory-order");
  assert.ok(sections.topicSections[0].entries.length >= 20);
  assert.ok(
    sections.topicSections.every((section) => section.label === topicLabels[section.slug]),
  );
  assert.ok(sections.recentEntries.length >= 8);
  assert.ok(
    new Date(sections.recentEntries[0].date) >=
      new Date(sections.recentEntries.at(-1).date),
  );
});

test("groupReadingEntries separates guide readings into scholarship and reports", () => {
  const content = loadSiteContent();
  const guide = guides.find((entry) => entry.slug === "theory-order");
  const readingEntries = guide.readingIds
    .map(
      (id) =>
        content.bibliography.find((entry) => entry.id === id) ??
        content.records.find((record) => record.id === id),
    )
    .filter(Boolean);

  const groups = groupReadingEntries(readingEntries);
  const scholarship = groups.find((group) => group.key === "scholarship");
  const reports = groups.find((group) => group.key === "reports");

  assert.ok(scholarship);
  assert.ok(reports);
  assert.ok(scholarship.entries.length >= 10);
  assert.ok(reports.entries.length >= 3);
  assert.ok(
    scholarship.entries.some((entry) => /AJIL|International Organization|International Affairs/.test(entry.citation)),
  );
  assert.ok(
    reports.entries.some((entry) => /Brookings|Carnegie|CSIS|Chatham House/.test(entry.citation)),
  );
});

test("groupReadingEntries preserves bibliography author and outlet metadata", () => {
  const content = loadSiteContent();
  const bibliographyEntry = content.bibliography.find(
    (entry) => entry.id === "lit-2026-aplr-data-export-regime",
  );

  assert.ok(bibliographyEntry);

  const groups = groupReadingEntries([bibliographyEntry]);
  const scholarship = groups.find((group) => group.key === "scholarship");
  const reading = scholarship?.entries.find(
    (entry) => entry.id === "lit-2026-aplr-data-export-regime",
  );

  assert.equal(reading?.author, "Guang Ma and Hong Wu");
  assert.equal(reading?.outlet, "Asia Pacific Law Review");
});
