import type { APIRoute } from 'astro';

import { labCode, labs } from '@/lab/registry';
import { renderOg, type OgInput } from '@/lib/og';
import { formatDate, getPosts, postCover } from '@/lib/posts';

export async function getStaticPaths() {
  const posts = await getPosts();
  return [
    ...posts.map((post) => {
      const { code, style } = postCover(post);
      const input: OgInput = { id: post.id, title: post.data.title, tags: post.data.tags, date: formatDate(post.data.pubDate), code, style };
      return { params: { slug: post.id.replaceAll('/', '--') }, props: { input } };
    }),
    ...labs.map((entry) => {
      const input: OgInput = {
        id: `lab/${entry.slug}`,
        title: entry.title,
        tags: ['实验室', entry.en],
        date: formatDate(new Date(entry.date)),
        code: labCode(entry),
        style: entry.cover,
      };
      return { params: { slug: `lab--${entry.slug}` }, props: { input } };
    }),
  ];
}

export const GET: APIRoute<{ input: OgInput }> = async ({ props }) =>
  new Response(new Uint8Array(await renderOg(props.input)), { headers: { 'Content-Type': 'image/png' } });
