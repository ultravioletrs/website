import { defineCollection, z } from 'astro:content';

const blog = defineCollection({
	type: 'content',
	// Example:
	// title: "Unleashing Confidential AI: Cocos v0.8.0 and Prism v0.6.0 Released"
	// excerpt: "..."
	// author: { name: "sammy oina", picture: "..." }
	// date: 2026-02-06
	// image: /img/prism-cocos.png
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
        ogImage: z.string().optional(),
        tags: z.array(z.string()).optional(),
        featured: z.boolean().optional(),
	}),
});

export const collections = { blog };
