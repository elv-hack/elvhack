import { getCollection, type CollectionEntry } from 'astro:content';

export type Post = CollectionEntry<'posts'>;

export interface Tag {
  name: string;
  slug: string;
  count: number;
}

/** 已发布文章，按发布时间倒序。开发模式下草稿也会显示。 */
export async function getPosts(): Promise<Post[]> {
  const posts = await getCollection('posts', ({ data }) => import.meta.env.DEV || !data.draft);
  return posts.sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());
}

export const postHref = (post: Post) => `/posts/${post.id}/`;

export const tagSlug = (tag: string) => tag.trim().toLowerCase().replace(/\s+/g, '-');

export const tagHref = (tag: string) => `/tags/${tagSlug(tag)}/`;

export function getTags(posts: Post[]): Tag[] {
  const tags = new Map<string, Tag>();
  for (const post of posts) {
    for (const name of post.data.tags) {
      const slug = tagSlug(name);
      const tag = tags.get(slug) ?? { name, slug, count: 0 };
      tag.count += 1;
      tags.set(slug, tag);
    }
  }
  return [...tags.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'zh-CN'));
}

const CJK = /[㐀-鿿豈-﫿]/g;

/** 粗略阅读时长：中文约 400 字/分钟，英文约 220 词/分钟。 */
export function readingMinutes(body = ''): number {
  const text = body
    .replace(/```[\s\S]*?```/g, '')
    .replace(/^(import|export)\s.*$/gm, '')
    .replace(/<[^>]+>/g, '');
  const cjk = text.match(CJK)?.length ?? 0;
  const words = text.replace(CJK, ' ').match(/[A-Za-z0-9][\w'-]*/g)?.length ?? 0;
  return Math.max(1, Math.round(cjk / 400 + words / 220));
}

const TZ = 'Asia/Shanghai';
const dayFormat = new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: TZ });
const yearFormat = new Intl.DateTimeFormat('en', { year: 'numeric', timeZone: TZ });

/** 2026.10.16 */
export const formatDate = (date: Date) => dayFormat.format(date).replaceAll('/', '.');

export const postYear = (date: Date) => Number(yearFormat.format(date));
