import { defineCollection, z } from 'astro:content';

const blog = defineCollection({
	type: 'content',
	schema: z.object({
		title: z.string(),
		description: z.string().optional(),
        excerpt: z.string().optional(),
		author: z.object({
            name: z.string(),
            picture: z.string().optional(),
        }).optional(),
		date: z.coerce.date(),
		image: z.string().optional(),
        coverImage: z.string().optional(),
        ogImage: z.union([z.string(), z.object({ url: z.string() })]).optional(),
        tags: z.array(z.string()).optional(),
        featured: z.boolean().optional(),
	}),
});

export const collections = { blog };
