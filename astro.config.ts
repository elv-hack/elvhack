import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { transformerNotationDiff, transformerNotationHighlight } from '@shikijs/transformers';
import { defineConfig } from 'astro/config';

import { transformerCodeMeta } from './src/lib/shiki-transformers';

export default defineConfig({
  site: 'https://elvhack.com',
  output: 'static',
  integrations: [mdx(), sitemap()],
  markdown: {
    shikiConfig: {
      themes: { light: 'github-light', dark: 'github-dark' },
      defaultColor: false,
      // 行内标注：// [!code highlight]、// [!code ++]、// [!code --]
      transformers: [transformerCodeMeta(), transformerNotationHighlight(), transformerNotationDiff()],
    },
  },
});
