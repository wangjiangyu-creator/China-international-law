import { copyFileSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { loadSiteContent, sourceTypes, topicLabels, topicOrder } from "../src/lib/content.mjs";
import { guides } from "../src/lib/guides.mjs";
import { getFacetValues, getTopicProfile } from "../src/lib/search.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");
const content = loadSiteContent();

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function ensureDir(path) {
  mkdirSync(path, { recursive: true });
}

function writePage(path, title, body, hero = false) {
  const full = join(dist, path, "index.html");
  ensureDir(dirname(full));
  writeFileSync(
    full,
    `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="A curated scholarly portal on China's approach to international law and the evolving international order.">
  <title>${escapeHtml(title)}</title>
  <link rel="stylesheet" href="/styles/global.css">
</head>
<body class="${hero ? "has-hero" : ""}">
  <a class="skip-link" href="#main">Skip to content</a>
  ${header()}
  <main id="main">${body}</main>
  ${footer()}
</body>
</html>`,
  );
}

function header() {
  const nav = [
    ["Topics", "/topics/theory-order/"],
    ["Archive", "/archive/"],
    ["Timelines", "/timelines/"],
    ["Literature", "/literature/"],
    ["Methodology", "/methodology/"],
    ["About", "/about/"],
  ];
  return `<header class="site-header" aria-label="Site header">
    <a class="brand" href="/">
      <span class="brand-mark">CILO</span>
      <span><strong>China, International Law, and International Order</strong><small>Curated by Professor Wang Jiangyu</small></span>
    </a>
    <nav class="site-nav" aria-label="Primary navigation">${nav.map(([label, href]) => `<a href="${href}">${label}</a>`).join("")}</nav>
  </header>`;
}

function footer() {
  return `<footer class="site-footer">
    <div><strong>China, International Law, and International Order</strong><p>Official documents, international-law materials, state practice, reports, and scholarship for research and teaching.</p></div>
    <div><a href="/methodology/">Methodology</a><a href="/archive/">Source archive</a><a href="/about/">About Professor Wang</a></div>
  </footer>`;
}

function tags(topics) {
  return `<div class="tag-row">${topics.map((topic) => `<a class="tag" href="/topics/${topic}/">${escapeHtml(topicLabels[topic])}</a>`).join("")}</div>`;
}

function recordCard(record, compact = false) {
  return `<article class="record-card ${compact ? "record-card--compact" : ""}">
    <div class="record-card__meta"><span>${escapeHtml(record.source_type)}</span><span>${escapeHtml(record.date)}</span><span>${escapeHtml(record.institution)}</span></div>
    <h3><a href="${escapeHtml(record.url)}" target="_blank" rel="noreferrer">${escapeHtml(record.title_en)}</a></h3>
    ${record.title_zh ? `<p class="record-card__zh" lang="zh-Hans">${escapeHtml(record.title_zh)}</p>` : ""}
    ${compact ? "" : `<p>${escapeHtml(record.summary)}</p>`}
    <p class="record-card__note">${escapeHtml(record.significance_note)}</p>
    <p class="record-card__citation">${escapeHtml(record.citation)}</p>
    ${tags(record.topics)}
  </article>`;
}

function intro(eyebrow, h1, p, modifier = "") {
  return `<section class="page-intro ${modifier}"><p class="eyebrow">${escapeHtml(eyebrow)}</p><h1>${escapeHtml(h1)}</h1><p>${escapeHtml(p)}</p></section>`;
}

rmSync(dist, { recursive: true, force: true });
ensureDir(join(dist, "styles"));
ensureDir(join(dist, "images"));
copyFileSync(join(root, "src/styles/global.css"), join(dist, "styles/global.css"));
copyFileSync(join(root, "public/images/order-map.png"), join(dist, "images/order-map.png"));

const featured = ["prc-2023-global-community-shared-future", "prc-2023-bri-whitepaper", "prc-2021-anti-foreign-sanctions-law"]
  .map((id) => content.records.find((record) => record.id === id))
  .filter(Boolean);

writePage(
  "",
  "China, International Law, and International Order",
  `<section class="hero">
    <div class="hero__shade"></div>
    <div class="hero__content">
      <p class="eyebrow">Curated research portal</p>
      <h1>China, International Law, and International Order</h1>
      <p class="hero__lede">A scholarly guide to official documents, international legal materials, Chinese state practice, think tank reports, and literature on China's evolving approach to international law and global order.</p>
      <div class="hero__actions"><a class="button button--primary" href="/archive/">Search the archive</a><a class="button" href="/topics/theory-order/">Explore topic guides</a></div>
    </div>
  </section>
  <section class="band band--stats"><div class="stats"><span><strong>${content.records.length}</strong> curated records</span><span><strong>${Object.keys(topicLabels).length}</strong> topic guides</span><span><strong>${content.timeline.length}</strong> chronology entries</span><span><strong>${content.bibliography.length}</strong> bibliography items</span></div></section>
  <section class="section-grid">
    <div><p class="eyebrow">Topic dossiers</p><h2>Begin with the legal questions, then move into the documents.</h2><p>Each guide combines a short analytical frame, key questions, selected records, chronology links, and scholarly readings.</p></div>
    <div class="topic-list">${guides.map((guide) => `<a class="topic-tile" href="/topics/${guide.slug}/"><span>${escapeHtml(guide.eyebrow)}</span><strong>${escapeHtml(guide.title)}</strong><small>${escapeHtml(guide.dek)}</small></a>`).join("")}</div>
  </section>
  <section class="band"><div class="section-heading"><p class="eyebrow">Featured sources</p><h2>Launch records for editorial review</h2></div><div class="record-grid">${featured.map((record) => recordCard(record)).join("")}</div></section>`,
  true,
);

const facets = {
  institutions: getFacetValues(content.records, "institution"),
  languages: getFacetValues(content.records, "language"),
  jurisdictions: getFacetValues(content.records, "jurisdiction"),
};

writePage(
  "archive",
  "Archive | China, International Law, and International Order",
  `${intro("Source archive", "Search and filter the curated corpus.", "Records link to official or stable source locations and include concise annotations for review.")}
  <section class="archive-shell" data-archive>
    <form class="filters" aria-label="Archive filters">
      <label><span>Search</span><input id="filter-query" type="search" placeholder="sanctions, WTO, sovereignty, BRI..."></label>
      <label><span>Topic</span><select id="filter-topic"><option value="">All topics</option>${topicOrder.map((topic) => `<option value="${topic}">${escapeHtml(topicLabels[topic])}</option>`).join("")}</select></label>
      <label><span>Source type</span><select id="filter-source"><option value="">All source types</option>${sourceTypes.map((type) => `<option value="${escapeHtml(type)}">${escapeHtml(type)}</option>`).join("")}</select></label>
      <label><span>Institution</span><select id="filter-institution"><option value="">All institutions</option>${facets.institutions.map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`).join("")}</select></label>
      <label><span>Language</span><select id="filter-language"><option value="">All languages</option>${facets.languages.map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`).join("")}</select></label>
      <label><span>Jurisdiction</span><select id="filter-jurisdiction"><option value="">All jurisdictions</option>${facets.jurisdictions.map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`).join("")}</select></label>
      <div class="filter-actions"><output id="result-count">${content.records.length} records</output><button type="reset">Reset</button></div>
    </form>
    <div class="record-list" id="record-list">${content.records.map((record) => `<div class="record-item" data-record-id="${record.id}">${recordCard(record, true)}</div>`).join("")}</div>
  </section>
  <script>
    const recordsForClient = ${JSON.stringify(content.records.map((record) => ({ id: record.id, sourceType: record.source_type, institution: record.institution, language: record.language, jurisdiction: record.jurisdiction, topics: record.topics, searchText: record.searchText })))};
    const controls = { query: document.querySelector("#filter-query"), topic: document.querySelector("#filter-topic"), sourceType: document.querySelector("#filter-source"), institution: document.querySelector("#filter-institution"), language: document.querySelector("#filter-language"), jurisdiction: document.querySelector("#filter-jurisdiction") };
    const output = document.querySelector("#result-count");
    const items = new Map([...document.querySelectorAll("[data-record-id]")].map((item) => [item.dataset.recordId, item]));
    function matches(record, filters) {
      if (filters.query && !record.searchText.includes(filters.query)) return false;
      if (filters.topic && !record.topics.includes(filters.topic)) return false;
      if (filters.sourceType && record.sourceType !== filters.sourceType) return false;
      if (filters.institution && record.institution !== filters.institution) return false;
      if (filters.language && record.language !== filters.language) return false;
      if (filters.jurisdiction && record.jurisdiction !== filters.jurisdiction) return false;
      return true;
    }
    function updateArchive() {
      const filters = { query: controls.query.value.trim().toLowerCase(), topic: controls.topic.value, sourceType: controls.sourceType.value, institution: controls.institution.value, language: controls.language.value, jurisdiction: controls.jurisdiction.value };
      let count = 0;
      for (const record of recordsForClient) { const visible = matches(record, filters); items.get(record.id).hidden = !visible; if (visible) count += 1; }
      output.value = count + " " + (count === 1 ? "record" : "records");
    }
    for (const control of Object.values(controls)) control.addEventListener("input", updateArchive);
    document.querySelector(".filters").addEventListener("reset", () => window.setTimeout(updateArchive, 0));
    const initialParams = new URLSearchParams(window.location.search);
    if (initialParams.has("q")) controls.query.value = initialParams.get("q");
    if (initialParams.has("topic")) controls.topic.value = initialParams.get("topic");
    if (initialParams.has("source")) controls.sourceType.value = initialParams.get("source");
    if (initialParams.has("institution")) controls.institution.value = initialParams.get("institution");
    if (initialParams.has("language")) controls.language.value = initialParams.get("language");
    if (initialParams.has("jurisdiction")) controls.jurisdiction.value = initialParams.get("jurisdiction");
    updateArchive();
  </script>`,
);

for (const guide of guides) {
  const profile = getTopicProfile(content, guide.slug);
  const featuredRecords = guide.featuredIds.map((id) => content.records.find((record) => record.id === id)).filter(Boolean);
  const readings = guide.readingIds.map((id) => content.bibliography.find((entry) => entry.id === id)).filter(Boolean);
  writePage(
    `topics/${guide.slug}`,
    `${guide.title} | China, International Law, and International Order`,
    `${intro(guide.eyebrow, guide.title, guide.dek, "page-intro--topic")}
    <section class="dossier">
      <aside class="dossier__aside"><h2>Key questions</h2><ol>${guide.questions.map((q) => `<li>${escapeHtml(q)}</li>`).join("")}</ol><a class="button button--primary" href="/archive/">Search this topic</a></aside>
      <div class="dossier__main">
        <h2>Analytical frame</h2><p>${escapeHtml(guide.thesis)}</p>
        <h2>Featured documents and practice</h2><div class="record-stack">${featuredRecords.map((record) => recordCard(record)).join("")}</div>
        <h2>Chronology signals</h2><div class="timeline-list">${profile.timeline.slice(0, 6).map((entry) => `<article><time datetime="${entry.date}">${entry.date}</time><h3>${escapeHtml(entry.title)}</h3><p>${escapeHtml(entry.summary)}</p></article>`).join("")}</div>
        <h2>Selected readings</h2><div class="reading-list">${readings.map((entry) => `<article><h3><a href="${escapeHtml(entry.url)}" target="_blank" rel="noreferrer">${escapeHtml(entry.title)}</a></h3><p>${escapeHtml(entry.citation)}</p><small>${escapeHtml(entry.note)}</small></article>`).join("")}</div>
      </div>
    </section>`,
  );
}

writePage(
  "timelines",
  "Timelines | China, International Law, and International Order",
  `${intro("Chronology", "Follow doctrinal change through events and documents.", "Timeline entries connect official sources, international legal materials, and state practice so readers can see how arguments and institutions develop over time.")}
  <section class="timeline-list timeline-list--full">${content.timeline.map((entry) => `<article><time datetime="${entry.date}">${entry.date}</time><h2>${escapeHtml(entry.title)}</h2><p>${escapeHtml(entry.summary)}</p>${tags(entry.topics)}</article>`).join("")}</section>`,
);

writePage(
  "literature",
  "Literature and Reports | China, International Law, and International Order",
  `${intro("Bibliography", "Scholarship, monographs, articles, and research reports.", "This bibliography is a launch layer for teaching and research.")}
  <section class="reading-list reading-list--full">${content.bibliography.map((entry) => `<article><p class="eyebrow">${escapeHtml(entry.type)} · ${entry.date}</p><h2><a href="${escapeHtml(entry.url)}" target="_blank" rel="noreferrer">${escapeHtml(entry.title)}</a></h2><p>${escapeHtml(entry.citation)}</p><small>${escapeHtml(entry.note)}</small>${tags(entry.topics)}</article>`).join("")}</section>`,
);

writePage(
  "methodology",
  "Methodology | China, International Law, and International Order",
  `${intro("Methodology", "How the collection is organized.", "The site is designed as a curated scholarly portal with stable links, transparent metadata, and reviewable editorial notes.")}
  <section class="prose-grid"><article><h2>Source selection</h2><p>The launch corpus covers PRC official documents, international legal materials, Chinese state practice, think tank reports, and literature.</p></article><article><h2>Citation policy</h2><p>Bibliographic display follows an OSCOLA-like legal style with institutional author, title, date, and source link.</p></article><article><h2>PDF and copyright policy</h2><p>The default policy is link-and-cite. The site does not mirror copyrighted scholarship or institution-controlled PDFs without later review.</p></article><article><h2>Annotation standards</h2><p>Launch annotations are concise editorial scaffolding for review before public release.</p></article></section>`,
);

writePage(
  "about",
  "About | China, International Law, and International Order",
  `${intro("Curator", "Professor Wang Jiangyu", "Professor Wang Jiangyu is based at the City University of Hong Kong and formerly taught at the National University of Singapore.")}
  <section class="prose-grid"><article><h2>Purpose</h2><p>The project brings together official documents, international legal materials, Chinese state practice, policy reports, and scholarship for research and teaching.</p></article><article><h2>Editorial posture</h2><p>The site uses moderate annotations: enough interpretation to orient readers, while preserving the source record and leaving space for competing scholarly views.</p></article></section>`,
);

console.log(`Static preview built at ${join(dist, "index.html")}`);
