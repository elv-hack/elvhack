import type { APIRoute } from 'astro';

import { labs } from '@/lab/registry';
import { coverSvg, type CoverStyle } from '@/lib/generative';
import { getPosts, postCover } from '@/lib/posts';

export async function getStaticPaths() {
  const posts = await getPosts();
  return [
    ...posts.map((post) => ({ params: { slug: post.id.replaceAll('/', '--') }, props: { id: post.id, style: postCover(post).style } })),
    ...labs.map((entry) => ({ params: { slug: `lab--${entry.slug}` }, props: { id: `lab/${entry.slug}`, style: entry.cover } })),
  ];
}

export const GET: APIRoute<{ id: string; style: CoverStyle }> = ({ props }) =>
  new Response(coverSvg(props.id, props.style), {
    headers: { 'Content-Type': 'image/svg+xml; charset=utf-8' },
  });
