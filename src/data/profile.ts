/**
 * “关于”页的个人资料。
 * 目前除了本站信息（colophon）和 GitHub 链接，其余都是占位用的示例资料，替换成你自己的即可。
 * 换完后把 sample 改成 false，页面上的“示例资料”标记就会消失。
 */
export const profile = {
  sample: true,
  handle: 'Elvhack',
  role: '独立开发者 · 创意编程爱好者',
  intro: [
    '写代码，也用代码画画。喜欢把一个想法做成能直接在浏览器里玩的小东西。',
    '这个站是我的实验室和笔记本：做过的东西写下来，好玩的实验留下来。',
  ],
  spec: [
    { label: '代号', value: 'Elvhack' },
    { label: '身份', value: '独立开发者' },
    { label: '坐标', value: '地球 · 某个时区' },
    { label: '常用语言', value: 'TypeScript / Rust / Python / GLSL' },
    { label: '当前状态', value: '正在折腾这个网站' },
  ],
  now: {
    updated: '2026-10-16',
    items: ['重写个人网站，把视觉实验都搬进实验室', '学习 WebGPU 和着色器编程', '整理过去几年的项目笔记'],
  },
  stack: [
    { group: '语言', items: ['TypeScript', 'Rust', 'Python', 'GLSL'] },
    { group: '前端', items: ['Astro', 'React', 'Canvas', 'WebGL'] },
    { group: '基础设施', items: ['Cloudflare', 'GitHub Actions', 'Docker'] },
    { group: '日常工具', items: ['Neovim', 'Figma', 'Obsidian'] },
  ],
  timeline: [
    { year: '2026', title: '从零重建 elvhack.com', note: 'Astro + Cloudflare Pages，生成封面、实验室和 ⌘K 搜索。' },
    { year: '2025', title: '开始做生成艺术实验', note: '流场、莫尔纹、山脊线，一个周末一个。' },
    { year: '2024', title: '第一个开源项目', note: '一个小工具，后来被几个人用上了。' },
    { year: '2022', title: '写下第一行 Rust', note: '和借用检查器打了一个月的架。' },
  ],
} as const;
