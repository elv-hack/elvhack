import type { transformerNotationHighlight } from '@shikijs/transformers';

type ShikiTransformer = ReturnType<typeof transformerNotationHighlight>;

/** Sätteri 传来的 meta 可能是字符串，也可能是 { __raw }，统一取出原始文本 */
const rawMeta = (meta: unknown): string => {
  if (typeof meta === 'string') return meta;
  if (meta && typeof meta === 'object' && '__raw' in meta) return String((meta as { __raw?: string }).__raw ?? '');
  return '';
};

/** 解析 {1,3-5} 形式的行号 */
const parseLines = (raw: string): Set<number> => {
  const lines = new Set<number>();
  const block = raw.match(/\{([\d,\s-]+)\}/)?.[1];
  if (!block) return lines;
  for (const part of block.split(',')) {
    const [start, end = start] = part.trim().split('-').map(Number);
    if (!Number.isFinite(start) || !Number.isFinite(end)) continue;
    for (let n = start; n <= end; n++) lines.add(n);
  }
  return lines;
};

/**
 * 代码块元信息：
 *   ```ts title="src/demo.ts" {2,4-6}
 * title 写到 <pre data-title>，由正文脚本渲染成文件名标题栏；花括号里的行会被高亮。
 */
export function transformerCodeMeta(): ShikiTransformer {
  return {
    name: 'elvhack:code-meta',
    pre(node) {
      const title = rawMeta(this.options.meta).match(/title=(?:"([^"]+)"|'([^']+)')/);
      if (title) node.properties['data-title'] = title[1] ?? title[2];
    },
    line(node, line) {
      if (parseLines(rawMeta(this.options.meta)).has(line)) this.addClassToHast(node, 'highlighted');
    },
  };
}
