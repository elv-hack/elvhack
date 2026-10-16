import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { transformerNotationDiff, transformerNotationHighlight } from '@shikijs/transformers';
import { defineConfig } from 'astro/config';

import { transformerCodeMeta } from './src/lib/shiki-transformers';

export default defineConfig({
  site: 'https://elvhack.com',
  output: 'static',
  integrations: [mdx(), sitemap()],
  vite: {
    build: {
      // lightningcss 会把 animation-timeline 合并进 animation 简写，Chrome 判为无效，滚动驱动动画全部失效；换用 esbuild 压缩
      cssMinify: 'esbuild',
    },
  },
  markdown: {
    shikiConfig: {
      themes: { light: 'github-light', dark: 'github-dark' },
      defaultColor: false,
      // 行内标注：// [!code highlight]、// [!code ++]、// [!code --]
      transformers: [transformerCodeMeta(), transformerNotationHighlight(), transformerNotationDiff()],
    },
  },
});
