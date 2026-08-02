import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const blog = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/blog" }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      description: z.string(),
      pubDate: z.coerce.date(),
      updatedDate: z.coerce.date().optional(),
      author: z.string().default("Equipe técnica Integra"),
      tags: z.array(z.string()).default([]),
      heroImage: image().optional(),
      heroAlt: z.string().optional(),
      /** Arte social dedicada (1200x630) em public/, ex.: "/og/blog-slug.png". */
      ogImage: z.string().optional(),
      draft: z.boolean().default(false),
    }),
});

const cases = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/cases" }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      summary: z.string(),
      pubDate: z.coerce.date(),
      updatedDate: z.coerce.date().optional(),
      sector: z.string(),
      tech: z.array(z.string()).default([]),
      heroImage: image().optional(),
      heroAlt: z.string().optional(),
      heroIllustrative: z.boolean().default(false),
      gallery: z.array(image()).default([]),
      draft: z.boolean().default(false),
    }),
});

const eventos = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/eventos" }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      summary: z.string(),
      startDate: z.coerce.date(),
      endDate: z.coerce.date().optional(),
      eventStatus: z
        .enum(["scheduled", "completed", "cancelled", "postponed"])
        .default("completed"),
      location: z.string(),
      organizer: z.string(),
      tags: z.array(z.string()).default([]),
      coverImage: image(),
      coverAlt: z.string(),
      gallery: z.array(image()).default([]),
      draft: z.boolean().default(false),
    }).superRefine((event, context) => {
      if (event.endDate && event.endDate.getTime() < event.startDate.getTime()) {
        context.addIssue({
          code: "custom",
          path: ["endDate"],
          message: "endDate não pode ser anterior a startDate",
        });
      }
    }),
});

export const collections = { blog, cases, eventos };
