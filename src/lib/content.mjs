import { readFileSync } from "node:fs";
import { join } from "node:path";

import { parseCsv } from "./csv.mjs";
import { sourceTypes, topicLabels, topicOrder } from "./topics.mjs";

const dataDir = join(process.cwd(), "src/data");
const recordFiles = [
  "records.csv",
  "records-extra.csv",
  "records-scholarship.csv",
];
const datePattern = /^\d{4}(-\d{2}(-\d{2})?)?$/;
const recordCorrections = {
  "prc-1982-constitution": {
    url: "https://www.npc.gov.cn/englishnpc/constitution2019/201911/t20191120_384295.html",
  },
  "prc-1993-whitepaper-taiwan": {
    url: "https://www.china.org.cn/e-white/taiwan/index.htm",
  },
  "prc-2001-china-wto-accession": {
    url: "https://www.wto.org/english/thewto_e/acc_e/completeacc_e.htm",
  },
  "prc-2012-diaoyu-whitepaper": {
    url: "https://english.www.gov.cn/archive/white_paper/2014/08/23/content_281474983043212.htm",
  },
  "prc-2020-export-control-law": {
    url: "https://www.npc.gov.cn/englishnpc/c2759/c23934/202112/t20211209_384804.html",
  },
  "prc-2021-anti-foreign-sanctions-law": {
    language: "Chinese",
    url: "http://www.npc.gov.cn/npc/c30834/202106/d4a714d5813c4ad2ac54a5f0f78a5270.shtml",
  },
  "prc-2023-gdi-progress-report": {
    url: "https://en.cikd.org/knowledge?id=1631550975178334210",
  },
  "prc-2024-punitive-measures-taiwan": {
    language: "Chinese",
    url: "https://www.court.gov.cn/zixun/xiangqing/435511.html",
  },
  "practice-2008-piracy-escort": {
    url: "https://eng.mod.gov.cn/xb/News_213114/TopStories/4901838.html",
  },
  "practice-2013-bri-launch": {
    url: "http://eng.yidaiyilu.gov.cn/p/1849.html",
  },
  "practice-2017-bri-forum": {
    url: "https://2017.beltandroadforum.org/english/index.html",
  },
  "practice-2020-hk-national-security-law": {
    url: "https://www.elegislation.gov.hk/doc/hk/a406/eng_translation_(a406)_en.pdf",
  },
  "practice-2021-sanctions-countermeasures": {
    url: "https://www.mfa.gov.cn/eng/xw/fyrbt/fyrbt/202405/t20240530_11349690.html",
  },
  "practice-2023-saudi-iran": {
    url: "https://www.mfa.gov.cn/eng/zy/gb/202405/t20240531_11367487.html",
  },
  "practice-2023-bri-forum-third": {
    url: "https://www.beltandroadforum.org/english/",
  },
};

export { sourceTypes, topicLabels, topicOrder };

function compareByDateDesc(a, b) {
  return String(b.date ?? "").localeCompare(String(a.date ?? ""));
}

function normalizeEntryType(entry) {
  return String(entry.type ?? entry.source_type ?? "").toLowerCase();
}

function isReportLike(entry) {
  return /report|policy|commentary|memo|portal/.test(normalizeEntryType(entry));
}

function isReferenceLike(entry) {
  return /portal|database|project/.test(normalizeEntryType(entry));
}

function toReadingEntry(entry) {
  if ("title" in entry) {
    return {
      id: entry.id,
      title: entry.title,
      url: entry.url,
      citation: entry.citation,
      note: entry.note,
      type: entry.type,
      date: entry.date,
      author: entry.author,
      outlet: entry.outlet,
      topics: entry.topics ?? [],
    };
  }

  return {
    id: entry.id,
    title: entry.title_en,
    url: entry.url,
    citation: entry.citation,
    note: [entry.source_type, entry.date, entry.summary, entry.significance_note]
      .filter(Boolean)
      .join(" · "),
    type: entry.source_type,
    date: entry.date,
    topics: entry.topics ?? [],
  };
}

function validateWebUrl(url, label, errors) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    errors.push(`${label} has invalid URL: ${url}`);
    return;
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    errors.push(`${label} must use an HTTP(S) URL: ${url}`);
  }
  if (/^www\.google\.[^/]+$/i.test(parsed.hostname) && parsed.pathname === "/search") {
    errors.push(`${label} uses a Google search placeholder URL: ${url}`);
  }
  if (/%3e/i.test(url)) {
    errors.push(`${label} has a malformed URL artifact: ${url}`);
  }
}

export function splitList(value) {
  return String(value ?? "")
    .split(/[;|]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function loadCsv(filename) {
  return parseCsv(readFileSync(join(dataDir, filename), "utf8"));
}

export function loadRecords() {
  return recordFiles.flatMap((filename) => loadCsv(filename)).map(normalizeRecord);
}

export function normalizeRecord(record) {
  const normalized = { ...record, ...(recordCorrections[record.id] ?? {}) };
  const topics = splitList(normalized.topics);
  return {
    ...normalized,
    topics,
    year: Number(String(normalized.date).slice(0, 4)),
    searchText: [
      normalized.title_en,
      normalized.title_zh,
      normalized.source_type,
      normalized.institution,
      normalized.jurisdiction,
      normalized.language,
      normalized.citation,
      normalized.summary,
      normalized.significance_note,
      topics.map((topic) => topicLabels[topic]).join(" "),
    ]
      .join(" ")
      .toLowerCase(),
  };
}

export function normalizeTimeline(entry) {
  return {
    ...entry,
    topics: splitList(entry.topics),
    record_ids: splitList(entry.record_ids),
    year: Number(String(entry.date).slice(0, 4)),
  };
}

export function normalizeBibliography(entry) {
  return {
    ...entry,
    topics: splitList(entry.topics),
    year: Number(String(entry.date).slice(0, 4)),
  };
}

export function loadSiteContent() {
  return {
    records: loadRecords(),
    timeline: loadCsv("timelines.csv").map(normalizeTimeline),
    bibliography: loadCsv("bibliography.csv").map(normalizeBibliography),
  };
}

export function buildBibliographySections(bibliography) {
  const ordered = [...bibliography].sort(compareByDateDesc);
  const reportCount = bibliography.filter((entry) => isReportLike(entry)).length;

  return {
    summary: {
      total: bibliography.length,
      reportCount,
      scholarshipCount: bibliography.length - reportCount,
    },
    recentEntries: ordered.slice(0, 12),
    topicSections: topicOrder
      .map((slug) => {
        const entries = bibliography
          .filter((entry) => entry.topics.includes(slug))
          .sort(compareByDateDesc);
        return {
          slug,
          label: topicLabels[slug],
          count: entries.length,
          reportCount: entries.filter((entry) => isReportLike(entry)).length,
          scholarshipCount: entries.filter((entry) => !isReportLike(entry)).length,
          entries,
        };
      })
      .filter((section) => section.count > 0),
  };
}

export function groupReadingEntries(entries) {
  const grouped = {
    scholarship: [],
    reports: [],
    references: [],
  };

  for (const entry of entries.map(toReadingEntry)) {
    if (isReferenceLike(entry)) {
      grouped.references.push(entry);
      continue;
    }
    if (isReportLike(entry)) {
      grouped.reports.push(entry);
      continue;
    }
    grouped.scholarship.push(entry);
  }

  const sections = [
    {
      key: "scholarship",
      title: "Core scholarship and books",
      entries: grouped.scholarship.sort(compareByDateDesc),
    },
    {
      key: "reports",
      title: "Reports and policy analysis",
      entries: grouped.reports.sort(compareByDateDesc),
    },
    {
      key: "references",
      title: "Reference portals and research tools",
      entries: grouped.references.sort(compareByDateDesc),
    },
  ];

  return sections.filter((section) => section.entries.length > 0);
}

export function validateContent(content) {
  const errors = [];
  const recordIds = new Set();
  const knownTopics = new Set(topicOrder);

  for (const record of content.records ?? []) {
    const id = record.id || "(missing id)";

    if (!record.id) errors.push("Record is missing id");
    if (recordIds.has(record.id)) errors.push(`Duplicate record id: ${record.id}`);
    if (record.id) recordIds.add(record.id);
    if (!record.title_en) errors.push(`Record ${id} is missing title_en`);
    if (!record.source_type) errors.push(`Record ${id} is missing source_type`);
    if (record.source_type && !sourceTypes.includes(record.source_type)) {
      errors.push(`Record ${id} has unknown source_type: ${record.source_type}`);
    }
    if (!record.institution) errors.push(`Record ${id} is missing institution`);
    if (!record.date || !datePattern.test(record.date)) {
      errors.push(`Record ${id} has invalid date: ${record.date}`);
    }
    if (!record.url) {
      errors.push(`Record ${id} is missing URL`);
    } else {
      validateWebUrl(record.url, `Record ${id}`, errors);
    }
    if (!record.citation) errors.push(`Record ${id} is missing citation`);
    if (!record.summary) errors.push(`Record ${id} is missing summary`);
    if (!record.significance_note) {
      errors.push(`Record ${id} is missing significance_note`);
    }

    const topics = Array.isArray(record.topics)
      ? record.topics
      : splitList(record.topics);
    if (topics.length === 0) errors.push(`Record ${id} has no topics`);
    for (const topic of topics) {
      if (!knownTopics.has(topic)) {
        errors.push(`Record ${id} has unknown topic: ${topic}`);
      }
    }
  }

  for (const entry of content.timeline ?? []) {
    const id = entry.id || "(missing id)";
    if (!entry.id) errors.push("Timeline entry is missing id");
    if (!entry.date || !datePattern.test(entry.date)) {
      errors.push(`Timeline ${id} has invalid date: ${entry.date}`);
    }
    if (!entry.title) errors.push(`Timeline ${id} is missing title`);
    for (const topic of Array.isArray(entry.topics) ? entry.topics : splitList(entry.topics)) {
      if (!knownTopics.has(topic)) errors.push(`Timeline ${id} has unknown topic: ${topic}`);
    }
    for (const recordId of Array.isArray(entry.record_ids) ? entry.record_ids : splitList(entry.record_ids)) {
      if (!recordIds.has(recordId)) errors.push(`Timeline ${id} links missing record: ${recordId}`);
    }
  }

  for (const entry of content.bibliography ?? []) {
    const id = entry.id || "(missing id)";
    if (!entry.id) errors.push("Bibliography entry is missing id");
    if (!entry.title) errors.push(`Bibliography ${id} is missing title`);
    if (!entry.citation) errors.push(`Bibliography ${id} is missing citation`);
    if (!entry.url) {
      errors.push(`Bibliography ${id} is missing URL`);
    } else {
      validateWebUrl(entry.url, `Bibliography ${id}`, errors);
    }
    for (const topic of Array.isArray(entry.topics) ? entry.topics : splitList(entry.topics)) {
      if (!knownTopics.has(topic)) errors.push(`Bibliography ${id} has unknown topic: ${topic}`);
    }
  }

  return { ok: errors.length === 0, errors };
}
