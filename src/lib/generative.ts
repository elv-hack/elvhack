/**
 * 构建时的生成艺术：每篇文章由 id 的哈希决定一张唯一的 SVG 封面。
 * 墨线用 currentColor，强调色用 var(--cover-accent)，遮挡填充用 var(--cover-bg)，
 * 所以同一个文件能跟随页面的明暗主题（通过 <use> 继承颜色）。
 */

export const COVER_W = 800;
export const COVER_H = 500;

export const coverStyles = ['flow', 'moire', 'ridge', 'halftone', 'lissajous'] as const;
export type CoverStyle = (typeof coverStyles)[number];

/** 自动分配时只用前四种，新增风格不会改变已有文章的封面 */
const autoStyles: CoverStyle[] = ['flow', 'moire', 'ridge', 'halftone'];

/** FNV-1a 32 位哈希 */
export function hash(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** mulberry32 伪随机数 */
export function random(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const lerp = (a: number, b: number, t: number) => a + t * (b - a);
const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);

/** 带种子的二维 Perlin 噪声，输出约在 [-1, 1] */
export function perlin2(rand: () => number) {
  const base = Array.from({ length: 256 }, (_, i) => i);
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [base[i], base[j]] = [base[j], base[i]];
  }
  const p = new Uint8Array(512);
  for (let i = 0; i < 512; i++) p[i] = base[i & 255];

  const grad = (h: number, x: number, y: number) => {
    switch (h & 7) {
      case 0: return x + y;
      case 1: return -x + y;
      case 2: return x - y;
      case 3: return -x - y;
      case 4: return x;
      case 5: return -x;
      case 6: return y;
      default: return -y;
    }
  };

  return (x: number, y: number) => {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    x -= Math.floor(x);
    y -= Math.floor(y);
    const u = fade(x);
    const v = fade(y);
    const top = lerp(grad(p[p[X] + Y], x, y), grad(p[p[X + 1] + Y], x - 1, y), u);
    const bottom = lerp(grad(p[p[X] + Y + 1], x, y - 1), grad(p[p[X + 1] + Y + 1], x - 1, y - 1), u);
    return lerp(top, bottom, v);
  };
}

const r = Math.round;
const ACCENT_STROKE = 'style="stroke:var(--cover-accent,#c6ff3d)"';

/** 流线：沿噪声场追踪的细线，少数为强调色 */
function flow(rand: () => number): string {
  const noise = perlin2(rand);
  const scale = 0.0028 + rand() * 0.0025;
  const twist = 1.6 + rand() * 1.6;
  let ink = '';
  let accent = '';
  for (let i = 0; i < 110; i++) {
    let x = rand() * COVER_W;
    let y = rand() * COVER_H;
    let d = `M${r(x)} ${r(y)}`;
    const steps = 18 + Math.floor(rand() * 40);
    for (let s = 0; s < steps; s++) {
      const a = noise(x * scale, y * scale) * Math.PI * twist;
      x += Math.cos(a) * 8;
      y += Math.sin(a) * 8;
      if (x < -10 || x > COVER_W + 10 || y < -10 || y > COVER_H + 10) break;
      d += `L${r(x)} ${r(y)}`;
    }
    if (i % 9 === 0) accent += d;
    else ink += d;
  }
  return (
    `<g fill="none" stroke-linecap="round" stroke-linejoin="round">` +
    `<path d="${ink}" stroke="currentColor" stroke-opacity=".4" stroke-width="1.2"/>` +
    `<path d="${accent}" ${ACCENT_STROKE} stroke-width="2.2"/></g>`
  );
}

/** 莫尔纹：两组错位的同心圆相互干涉 */
function moire(rand: () => number): string {
  const ax = 220 + rand() * 360;
  const ay = 140 + rand() * 220;
  const bx = ax + (rand() - 0.5) * 220;
  const by = ay + (rand() - 0.5) * 160;
  const step = 12 + rand() * 6;
  const rings = (cx: number, cy: number) => {
    let out = '';
    for (let radius = step; radius < 900; radius += step) out += `<circle cx="${r(cx)}" cy="${r(cy)}" r="${r(radius)}"/>`;
    return out;
  };
  return (
    `<g fill="none" stroke-width="1.15">` +
    `<g stroke="currentColor" stroke-opacity=".5">${rings(ax, ay)}</g>` +
    `<g ${ACCENT_STROKE} stroke-opacity=".6">${rings(bx, by)}</g></g>`
  );
}

/** 山脊线：致敬《Unknown Pleasures》，后排被前排遮挡 */
function ridge(rand: () => number): string {
  const noise = perlin2(rand);
  const lines = 28;
  const points = 60;
  const top = 120;
  const bottom = 470;
  const gap = (bottom - top) / lines;
  const peaks = Array.from({ length: 2 + Math.floor(rand() * 2) }, () => ({
    x: 240 + rand() * 320,
    w: 50 + rand() * 90,
    h: 0.6 + rand() * 0.6,
  }));
  const accentLine = Math.floor(lines * (0.35 + rand() * 0.4));
  let out = '';
  for (let li = 0; li < lines; li++) {
    const y0 = top + li * gap;
    let d = '';
    for (let pi = 0; pi <= points; pi++) {
      const x = (pi / points) * COVER_W;
      const envelope = peaks.reduce((sum, p) => sum + p.h * Math.exp(-(((x - p.x) / p.w) ** 2)), 0);
      const n = noise(x * 0.011, li * 0.31);
      // tanh 软限幅：峰值平滑地收在画布内，不会被顶边截平
      const room = y0 - 12;
      const lift = room * Math.tanh((envelope * (42 + 100 * Math.abs(n)) + n * 5) / room);
      d += `${pi === 0 ? 'M' : 'L'}${r(x)} ${r(y0 - lift)}`;
    }
    // 闭合段先水平延伸出画布再绕回，描边不可见，所以一条路径同时负责遮挡和描线
    const stroke = li === accentLine ? 'stroke:var(--cover-accent,#c6ff3d);stroke-width:2.2' : 'stroke:currentColor;stroke-opacity:.7;stroke-width:1.3';
    const out1 = COVER_W + 100;
    const ground = COVER_H + 100;
    out += `<path d="${d}H${out1}V${ground}H-100V${r(y0)}Z" style="fill:var(--cover-bg,#121418);${stroke}"/>`;
  }
  return `<g stroke-linejoin="round">${out}</g>`;
}

/** 半调网点：噪声决定方块大小，高值处随机点亮强调色 */
function halftone(rand: () => number): string {
  const noise = perlin2(rand);
  const cell = 20;
  const scale = 0.0028 + rand() * 0.003;
  const cols = COVER_W / cell;
  const rows = COVER_H / cell;
  let ink = '';
  let accent = '';
  for (let cy = 0; cy < rows; cy++) {
    for (let cx = 0; cx < cols; cx++) {
      const x = cx * cell + cell / 2;
      const y = cy * cell + cell / 2;
      const v = (noise(x * scale, y * scale) + 1) / 2;
      const size = r(v ** 1.6 * cell * 1.3);
      if (size < 2) continue;
      const half = size / 2;
      const square = `M${r(x - half)} ${r(y - half)}h${size}v${size}h-${size}z`;
      if (v > 0.68 && rand() < 0.25) accent += square;
      else ink += square;
    }
  }
  return `<path d="${ink}" fill="currentColor" fill-opacity=".55"/><path d="${accent}" style="fill:var(--cover-accent,#c6ff3d)"/>`;
}

/** 李萨如曲线：几组嵌套的频率比曲线，像示波器的 X/Y 模式 */
function lissajous(rand: () => number): string {
  const ratios = [[3, 2], [5, 4], [3, 4], [5, 6], [2, 3], [4, 5]];
  const [a, b] = ratios[Math.floor(rand() * ratios.length)];
  const delta = Math.PI * (0.25 + rand() * 0.5);
  const layers = 9;
  const steps = 420;
  let ink = '';
  let accent = '';
  for (let layer = 0; layer < layers; layer++) {
    const k = 1 - layer * 0.085;
    const shift = layer * 0.06;
    let d = '';
    for (let i = 0; i <= steps; i++) {
      const t = (i / steps) * Math.PI * 2;
      const x = COVER_W / 2 + Math.sin(a * t + delta + shift) * COVER_W * 0.36 * k;
      const y = COVER_H / 2 + Math.sin(b * t) * COVER_H * 0.38 * k;
      d += `${i === 0 ? 'M' : 'L'}${r(x)} ${r(y)}`;
    }
    if (layer === 2) accent += d;
    else ink += d;
  }
  return (
    `<g fill="none" stroke-linejoin="round">` +
    `<path d="${ink}" stroke="currentColor" stroke-opacity=".45" stroke-width="1.2"/>` +
    `<path d="${accent}" ${ACCENT_STROKE} stroke-width="2.2"/></g>`
  );
}

const generators: Record<CoverStyle, (rand: () => number) => string> = { flow, moire, ridge, halftone, lissajous };

export interface CoverInfo {
  file: string;
  style: CoverStyle;
  code: string;
}

/** 由文章 id 推导封面文件名、风格和信号编号 */
export function coverInfo(id: string, style?: CoverStyle): CoverInfo {
  const h = hash(id);
  return {
    file: `/covers/${id.replaceAll('/', '--')}.svg`,
    style: style ?? autoStyles[h % autoStyles.length],
    code: `SIG-${h.toString(16).padStart(8, '0').slice(0, 4).toUpperCase()}`,
  };
}

export function coverSvg(id: string, style: CoverStyle): string {
  const rand = random(hash(id));
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${COVER_W} ${COVER_H}">` +
    `<g id="art">${generators[style](rand)}</g></svg>`
  );
}
