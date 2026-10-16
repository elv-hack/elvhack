import type { APIRoute } from 'astro';

import { renderOg } from '@/lib/og';
import { formatDate, getPosts, postCover, type Post } from '@/lib/posts';

export async function getStaticPaths() {
  const posts = await getPosts();
  return posts.map((post) => ({ params: { slug: post.id.replaceAll('/', '--') }, props: { post } }));
}

export const GET: APIRoute<{ post: Post }> = async ({ props: { post } }) => {
  const { code, style } = postCover(post);
  const png = await renderOg({
    id: post.id,
    title: post.data.title,
    tags: post.data.tags,
    date: formatDate(post.data.pubDate),
    code,
    style,
  });
  return new Response(new Uint8Array(png), { headers: { 'Content-Type': 'image/png' } });
};
