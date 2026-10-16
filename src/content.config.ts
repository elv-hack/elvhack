import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

import { coverStyles } from './lib/generative';

const posts = defineCollection({
  // 以下划线开头的文件不会被收录，可用来放草稿片段
  loader: glob({ pattern: '**/[^_]*.{md,mdx}', base: './src/content/posts' }),
  schema: z.object({
    title: z.string().min(1),
    description: z.string().min(1),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    tags: z.array(z.string().min(1)).default([]),
    draft: z.boolean().default(false),
    /** 生成封面的风格；不填则由文章 id 决定 */
    cover: z.enum(coverStyles).optional(),
  }),
});

export const collections = { posts };
