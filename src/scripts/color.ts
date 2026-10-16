/** 把任意 CSS 颜色（主题变量的值）转成 WebGL 用的 0–1 RGB */
export function toRgb(color: string): [number, number, number] {
  const probe = document.createElement('canvas').getContext('2d')!;
  probe.fillStyle = color;
  const normalized = probe.fillStyle as string;
  if (normalized.startsWith('#')) {
    const n = parseInt(normalized.slice(1), 16);
    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
  }
  const [r, g, b] = normalized.match(/[\d.]+/g)!.map(Number);
  return [r / 255, g / 255, b / 255];
}
