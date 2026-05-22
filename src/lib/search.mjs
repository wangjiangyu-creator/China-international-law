import { topicLabels } from "./topics.mjs";

export function filterRecords(records, filters = {}) {
  const query = String(filters.query ?? "").trim().toLowerCase();
  const startYear = filters.startYear ? Number(filters.startYear) : null;
  const endYear = filters.endYear ? Number(filters.endYear) : null;

  return records.filter((record) => {
    if (query && !record.searchText.includes(query)) return false;
    if (filters.topic && !record.topics.includes(filters.topic)) return false;
    if (filters.sourceType && record.source_type !== filters.sourceType) return false;
    if (filters.institution && record.institution !== filters.institution) return false;
    if (filters.language && record.language !== filters.language) return false;
    if (filters.jurisdiction && record.jurisdiction !== filters.jurisdiction) return false;
    if (startYear && record.year < startYear) return false;
    if (endYear && record.year > endYear) return false;
    return true;
  });
}

export function getFacetValues(records, field) {
  return [...new Set(records.map((record) => record[field]).filter(Boolean))].sort(
    (left, right) => left.localeCompare(right),
  );
}

export function getTopicProfile(content, topic) {
  return {
    topic,
    label: topicLabels[topic],
    records: content.records.filter((record) => record.topics.includes(topic)),
    timeline: content.timeline
      .filter((entry) => entry.topics.includes(topic))
      .sort((left, right) => left.date.localeCompare(right.date)),
    bibliography: content.bibliography.filter((entry) =>
      entry.topics.includes(topic),
    ),
  };
}
