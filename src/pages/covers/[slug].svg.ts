import type { APIRoute } from 'astro';

import { coverSvg } from '@/lib/generative';
import { getPosts, postCover, type Post } from '@/lib/posts';

export async function getStaticPaths() {
  const posts = await getPosts();
  return posts.map((post) => ({ params: { slug: post.id.replaceAll('/', '--') }, props: { post } }));
}

export const GET: APIRoute<{ post: Post }> = ({ props }) => {
  const { style } = postCover(props.post);
  return new Response(coverSvg(props.post.id, style), {
    headers: { 'Content-Type': 'image/svg+xml; charset=utf-8' },
  });
};
