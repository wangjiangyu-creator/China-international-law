import { defineCollection, z } from "astro:content";

const topics = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    slug: z.string(),
  }),
});

export const collections = { topics };
