import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";

export default defineConfig({
  site: "https://wangjiangyu-creator.github.io",
  base: "/China-international-law",
  integrations: [mdx()],
  output: "static",
});
