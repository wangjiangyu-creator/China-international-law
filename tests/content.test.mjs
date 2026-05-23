import test from "node:test";
import assert from "node:assert/strict";

import { parseCsv } from "../src/lib/csv.mjs";
import {
  loadSiteContent,
  validateContent,
  topicLabels,
} from "../src/lib/content.mjs";
import { guides } from "../src/lib/guides.mjs";
import { filterRecords, getTopicProfile } from "../src/lib/search.mjs";

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
