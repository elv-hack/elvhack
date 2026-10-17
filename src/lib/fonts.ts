import css from '@fontsource/noto-serif-sc/600.css?raw';

/** 构建后的切片文件地址，和 600.css 里引用的是同一批文件（Vite 按内容取哈希，地址一致） */
const files = import.meta.glob<string>('/node_modules/@fontsource/noto-serif-sc/files/noto-serif-sc-*-600-normal.woff2', {
  query: '?url',
  import: 'default',
  eager: true,
});

/** 每个切片覆盖的码位区间 */
const slices = [...css.matchAll(/url\(\.\/files\/([^)]+\.woff2)\)[^;]*;\s*unicode-range:\s*([^;]+);/g)].map(([, file, range]) => ({
  url: Object.entries(files).find(([path]) => path.endsWith(`/${file}`))?.[1],
  ranges: range.split(',').map((part) => {
    const [from, to = from] = part.trim().slice(2).split('-');
    return [parseInt(from, 16), parseInt(to, 16)] as const;
  }),
}));

/**
 * 一段标题文字用到的宋体切片。在 <head> 里预加载它们，标题就不会先用系统字体画一遍再跳成宋体。
 * 标题一般只落在 4–6 个切片里（每个约 40KB），本来就要下载，预加载只是让它更早开始；max 防止长标题拖慢首屏。
 */
export function serifSlicesFor(text: string, max = 8): string[] {
  const count = new Map<string, number>();
  for (const char of new Set(text)) {
    const code = char.codePointAt(0)!;
    const slice = slices.find(({ ranges }) => ranges.some(([from, to]) => code >= from && code <= to));
    if (slice?.url) count.set(slice.url, (count.get(slice.url) ?? 0) + 1);
  }
  return [...count]
    .sort((a, b) => b[1] - a[1])
    .slice(0, max)
    .map(([url]) => url);
}
