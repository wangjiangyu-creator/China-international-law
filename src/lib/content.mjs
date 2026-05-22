import { readFileSync } from "node:fs";
import { join } from "node:path";

import { parseCsv } from "./csv.mjs";
import { sourceTypes, topicLabels, topicOrder } from "./topics.mjs";

const dataDir = join(process.cwd(), "src/data");
const datePattern = /^\d{4}(-\d{2}(-\d{2})?)?$/;

export { sourceTypes, topicLabels, topicOrder };

export function splitList(value) {
  return String(value ?? "")
    .split(/[;|]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function loadCsv(filename) {
  return parseCsv(readFileSync(join(dataDir, filename), "utf8"));
}

export function normalizeRecord(record) {
  const topics = splitList(record.topics);
  return {
    ...record,
    topics,
    year: Number(String(record.date).slice(0, 4)),
    searchText: [
      record.title_en,
      record.title_zh,
      record.source_type,
      record.institution,
      record.jurisdiction,
      record.language,
      record.citation,
      record.summary,
      record.significance_note,
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
    records: loadCsv("records.csv").map(normalizeRecord),
    timeline: loadCsv("timelines.csv").map(normalizeTimeline),
    bibliography: loadCsv("bibliography.csv").map(normalizeBibliography),
  };
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
      try {
        new URL(record.url);
      } catch {
        errors.push(`Record ${id} has invalid URL: ${record.url}`);
      }
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
    if (!entry.url) errors.push(`Bibliography ${id} is missing URL`);
    for (const topic of Array.isArray(entry.topics) ? entry.topics : splitList(entry.topics)) {
      if (!knownTopics.has(topic)) errors.push(`Bibliography ${id} has unknown topic: ${topic}`);
    }
  }

  return { ok: errors.length === 0, errors };
}
