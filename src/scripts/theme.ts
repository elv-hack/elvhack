/** 读取当前主题的颜色变量，供 canvas / WebGL 使用 */
export interface ThemeColors {
  bg: string;
  bgElev: string;
  fg: string;
  muted: string;
  faint: string;
  line: string;
  accent: string;
}

export function themeColors(): ThemeColors {
  const css = getComputedStyle(document.documentElement);
  const get = (name: string, fallback: string) => css.getPropertyValue(name).trim() || fallback;
  return {
    bg: get('--bg', '#0a0b0d'),
    bgElev: get('--bg-elev', '#121418'),
    fg: get('--fg', '#ecebe6'),
    muted: get('--fg-muted', '#9b9b95'),
    faint: get('--fg-faint', '#55575a'),
    line: get('--line', 'rgba(236,235,230,.11)'),
    accent: get('--accent-ink', '#c6ff3d'),
  };
}

export const prefersReducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
export const hasFinePointer = () => matchMedia('(hover: hover) and (pointer: fine)').matches;
