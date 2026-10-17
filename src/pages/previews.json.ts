import type { APIRoute } from 'astro';

import { labCode, labCover, labs } from '@/lab/registry';
import { formatDate, getPosts, postCover, postHref, readingMinutes } from '@/lib/posts';

/** 站内链接悬停预览用的数据：路径 → 卡片内容。只在第一次悬停时下载。 */
export interface Preview {
  kind: string;
  code: string;
  title: string;
  description: string;
  meta: string;
  cover: string;
}

export const GET: APIRoute = async () => {
  const posts = await getPosts();
  const previews: Record<string, Preview> = {};
  for (const post of posts) {
    const { file, code } = postCover(post);
    previews[postHref(post)] = {
      kind: '文章',
      code,
      title: post.data.title,
      description: post.data.description,
      meta: [formatDate(post.data.pubDate), `约 ${readingMinutes(post.body)} 分钟`, ...post.data.tags.map((tag) => `#${tag}`)].join(' · '),
      cover: `${file}#art`,
    };
  }
  for (const entry of labs) {
    previews[`/lab/${entry.slug}/`] = {
      kind: '实验',
      code: labCode(entry),
      title: entry.title,
      description: entry.description,
      meta: `${entry.en} · ${entry.date.replaceAll('-', '.')}`,
      cover: `${labCover(entry).file}#art`,
    };
  }
  return new Response(JSON.stringify(previews), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
};
