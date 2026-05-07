import { defineCollection, z } from "astro:content";

const blog = defineCollection({
  type: "content",
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      description: z.string(),
      pubDate: z.coerce.date(),
      updatedDate: z.coerce.date().optional(),
      author: z.string().default("Integra Automação Industrial"),
      tags: z.array(z.string()).default([]),
      heroImage: image().optional(),
      heroAlt: z.string().optional(),
      draft: z.boolean().default(false),
    }),
});

const cases = defineCollection({
  type: "content",
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      summary: z.string(),
      pubDate: z.coerce.date(),
      sector: z.string(),
      tech: z.array(z.string()).default([]),
      heroImage: image().optional(),
      heroAlt: z.string().optional(),
      gallery: z.array(image()).default([]),
      draft: z.boolean().default(false),
    }),
});

const eventos = defineCollection({
  type: "content",
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      summary: z.string(),
      pubDate: z.coerce.date(),
      dateLabel: z.string(),
      location: z.string(),
      organizer: z.string(),
      tags: z.array(z.string()).default([]),
      coverImage: image(),
      coverAlt: z.string(),
      gallery: z.array(image()).default([]),
      draft: z.boolean().default(false),
    }),
});

export const collections = { blog, cases, eventos };
