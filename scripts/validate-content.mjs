import { loadSiteContent, validateContent } from "../src/lib/content.mjs";

const result = validateContent(loadSiteContent());

if (!result.ok) {
  console.error(result.errors.join("\n"));
  process.exit(1);
}

console.log("Content validation passed.");
