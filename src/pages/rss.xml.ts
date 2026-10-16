import rss from '@astrojs/rss';
import type { APIContext } from 'astro';

import { getPosts, postHref } from '@/lib/posts';
import { site } from '@/site.config';

export async function GET(context: APIContext) {
  const posts = await getPosts();

  return rss({
    title: site.title,
    description: site.description,
    site: context.site ?? site.url,
    customData: '<language>zh-cn</language>',
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.pubDate,
      categories: [...post.data.tags],
      link: postHref(post),
    })),
  });
}
