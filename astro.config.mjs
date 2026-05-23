import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";

export default defineConfig({
  site: "https://int.eastlaw.wang",
  integrations: [mdx()],
  output: "static",
});
