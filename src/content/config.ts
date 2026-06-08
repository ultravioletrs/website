import { defineCollection, z } from "astro:content";

const authorSchema = z.object({
  name: z.string(),
  picture: z.string().optional(),
});

const blog = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    excerpt: z.string().optional(),
    author: authorSchema.optional(),
    authors: z.array(authorSchema).optional(),
    date: z.coerce.date(),
    image: z.string().optional(),
    coverImage: z.string().optional(),
    ogImage: z.union([z.string(), z.object({ url: z.string() })]).optional(),
    tags: z.array(z.string()).optional(),
    featured: z.boolean().optional(),
    category: z.string().optional(),
  }),
});

const supportingProduct = z.object({
  which: z.string(),
  name: z.string(),
  role: z.string(),
  blurb: z.string(),
});

const lensPageSchema = z.object({
  title: z.string(),
  description: z.string(),
  eyebrow: z.string(),
  h1: z.string(),
  sub: z.string(),
  compH2: z.string(),
  compBody: z.string(),
  compHeaders: z.tuple([z.string(), z.string()]),
  compRows: z.array(z.tuple([z.string(), z.string(), z.string()])),
  product: z.object({
    which: z.string(),
    name: z.string(),
    role: z.string(),
    blurb: z.string(),
    points: z.array(z.string()),
    supporting: z.array(supportingProduct).optional(),
  }),
  ctaH2: z.string(),
  ctaSub: z.string(),
  ctaLabel: z.string(),
  ctaHref: z.string(),
  ctaExternal: z.boolean().optional(),
});

const industries = defineCollection({ type: "data", schema: lensPageSchema });
const solutions = defineCollection({ type: "data", schema: lensPageSchema });

export const collections = { blog, industries, solutions };
