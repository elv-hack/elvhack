/**
 * 构建时为每篇文章生成 1200×630 的分享图：生成封面 + 宋体标题 + 等宽字信息。
 * satori 只认 woff/ttf，而且不会在同名字体间按字形回退，
 * 所以按标题用到的字挑出思源宋体的切片，每片单独命名，再用 font-family 列表串起来。
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import satori from 'satori';
import sharp from 'sharp';

import { COVER_H, COVER_W, coverSvg, type CoverStyle } from './generative';

const W = 1200;
const H = 630;
const MODULES = join(process.cwd(), 'node_modules');
const COLORS = { bg: '#0a0b0d', ink: '#ecebe6', muted: '#9b9b95', faint: '#55575a', accent: '#c6ff3d' };

interface Slice {
  file: string;
  ranges: [number, number][];
}

let slices: Slice[] | undefined;

function serifSlices(): Slice[] {
  if (slices) return slices;
  const css = readFileSync(join(MODULES, '@fontsource/noto-serif-sc/600.css'), 'utf8');
  slices = [...css.matchAll(/url\(\.\/files\/([^)]+?)\.woff2\)[^;]*;\s*unicode-range:\s*([^;]+);/g)].map(([, file, range]) => ({
    file,
    ranges: range.split(',').map((part) => {
      const [start, end] = part.trim().replace(/^U\+/i, '').split('-').map((hex) => parseInt(hex, 16));
      return [start, end ?? start] as [number, number];
    }),
  }));
  return slices;
}

const fontFile = (pkg: string, file: string) => readFileSync(join(MODULES, pkg, 'files', `${file}.woff`));

function fontsFor(text: string) {
  const codes = [...new Set([...text].map((ch) => ch.codePointAt(0)!))];
  const needed = serifSlices().filter((slice) => codes.some((cp) => slice.ranges.some(([a, b]) => cp >= a && cp <= b)));
  const serif = needed.map((slice, i) => ({
    name: `serif-${i}`,
    data: fontFile('@fontsource/noto-serif-sc', slice.file),
    weight: 600 as const,
    style: 'normal' as const,
  }));
  return {
    serifFamily: serif.map((font) => font.name).join(', '),
    fonts: [
      ...serif,
      { name: 'mono', data: fontFile('@fontsource/jetbrains-mono', 'jetbrains-mono-latin-400-normal'), weight: 400 as const, style: 'normal' as const },
      { name: 'grotesk', data: fontFile('@fontsource/space-grotesk', 'space-grotesk-latin-700-normal'), weight: 700 as const, style: 'normal' as const },
    ],
  };
}

type Node = { type: string; props: { style?: Record<string, unknown>; children?: (Node | string)[] | Node | string } };
const el = (style: Record<string, unknown>, children?: Node['props']['children']): Node => ({ type: 'div', props: { style: { display: 'flex', ...style }, children } });

export interface OgInput {
  id: string;
  title: string;
  tags: readonly string[];
  date: string;
  code: string;
  style: CoverStyle;
}

export async function renderOg({ id, title, tags, date, code, style }: OgInput): Promise<Buffer> {
  const tagLine = tags.map((tag) => `#${tag}`).join('  ');
  const { fonts, serifFamily } = fontsFor(title + tagLine);
  const size = title.length > 24 ? 60 : title.length > 14 ? 72 : 92;

  const text = await satori(
    el(
      { width: W, height: H, flexDirection: 'column', justifyContent: 'space-between', padding: '64px 72px', color: COLORS.ink },
      [
        el({ alignItems: 'center', gap: 18, fontFamily: 'mono', fontSize: 22, color: COLORS.muted }, [
          el({ width: 18, height: 18, background: COLORS.accent }),
          `ELVHACK  /  ${code} · ${style.toUpperCase()}`,
        ]),
        el({ flexDirection: 'column', gap: 28, maxWidth: 860 }, [
          el({ fontFamily: serifFamily, fontSize: size, fontWeight: 600, lineHeight: 1.25 }, title),
          ...(tags.length
            ? [el({ gap: 24, fontFamily: `mono, ${serifFamily}`, fontSize: 24, color: COLORS.accent }, tags.map((tag) => el({}, `#${tag}`)))]
            : []),
        ]),
        el({ width: '100%', justifyContent: 'space-between', fontFamily: 'mono', fontSize: 20, color: COLORS.faint }, [el({}, 'elvhack.com'), el({}, date)]),
      ],
    ),
    { width: W, height: H, fonts },
  );

  // 背景：封面放在右侧，向左淡入纯色
  const artWidth = Math.round((H * COVER_W) / COVER_H);
  const art = coverSvg(id, style)
    .replaceAll('var(--cover-accent,#c6ff3d)', COLORS.accent)
    .replaceAll('var(--cover-bg,#121418)', COLORS.bg)
    .replaceAll('currentColor', COLORS.ink)
    .replace('<svg ', `<svg width="${artWidth}" height="${H}" `);
  const fade = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    <defs><linearGradient id="f" x1="0" x2="1"><stop offset="0.3" stop-color="${COLORS.bg}"/><stop offset="0.75" stop-color="${COLORS.bg}" stop-opacity="0.35"/><stop offset="1" stop-color="${COLORS.bg}" stop-opacity="0.15"/></linearGradient></defs>
    <rect width="100%" height="100%" fill="url(#f)"/></svg>`;

  return sharp({ create: { width: W, height: H, channels: 3, background: COLORS.bg } })
    .composite([
      { input: Buffer.from(art), left: W - artWidth, top: 0 },
      { input: Buffer.from(fade), left: 0, top: 0 },
      { input: Buffer.from(text), left: 0, top: 0 },
    ])
    .png({ compressionLevel: 9 })
    .toBuffer();
}
