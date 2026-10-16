export const site = {
  title: 'Elvhack',
  description: 'Elvhack —— 代码、视觉与好奇心的个人实验室。写下做过的东西，留下能玩的实验。',
  tagline: '代码、视觉与好奇心的个人实验室。',
  url: 'https://elvhack.com',
  lang: 'zh-CN',
  locale: 'zh_CN',
  author: 'Elvhack',
  ogImage: '/og.png',
  nav: [
    { href: '/posts/', label: '文章' },
    { href: '/tags/', label: '标签' },
    { href: '/about/', label: '关于' },
  ],
  social: {
    github: 'https://github.com/vx-zjr',
  },
  // 评论：在仓库开启 Discussions 并安装 giscus App 后，
  // 到 https://giscus.app/zh-CN 生成 repoId / categoryId 填进来即可启用。
  giscus: {
    repo: 'vx-zjr/elvhack',
    repoId: '',
    category: 'Announcements',
    categoryId: '',
  },
} as const;
