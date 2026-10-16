# Elvhack

个人博客 / 实验室，部署在 <https://elvhack.com>。Astro 生成静态页面，Cloudflare Pages 托管。

## 本地开发

```bash
pnpm install
pnpm dev        # http://localhost:4321
pnpm build      # 类型检查 + 构建到 dist/
pnpm preview    # 预览构建结果
```

## 写文章

在 `src/content/posts/` 新建 `.md` 或 `.mdx`，文件名就是网址（`hello-world.mdx` → `/posts/hello-world/`）。

```md
---
title: 标题
description: 一句话摘要，用于列表、RSS 和分享卡片
pubDate: 2026-10-16
updatedDate: 2026-10-20   # 可选
tags: [随笔, 实验]
draft: false              # true 时只在 pnpm dev 里可见
---
```

`.mdx` 里不用 import 就能直接用这些组件：

- `<Experiment title="..." note="...">…</Experiment>`：交互实验外框
- `<SignalScope f1={3} f2={2} phase={90} />`：示例实验，双正弦示波器
- `<Callout type="note|tip|warn" title="...">…</Callout>`：提示框

新的实验组件放在 `src/components/mdx/`，再到 `src/pages/posts/[...slug].astro` 的 `components` 里注册。

## 结构

| 路径 | 说明 |
| --- | --- |
| `src/site.config.ts` | 站点标题、导航、社交链接、评论配置 |
| `src/styles/tokens.css` | 颜色、字体、间距等设计变量（亮/暗两套） |
| `src/components/FieldCanvas.astro` | 首页粒子流场 |
| `src/layouts/PostLayout.astro` | 文章页：目录、阅读进度、代码复制、上下篇、评论 |
| `public/` | 原样输出的静态文件（`_headers` 是 Cloudflare Pages 的响应头配置） |

## 部署

推送到 `main` 后，Cloudflare Pages 项目 `elvhack` 会自动构建并发布：

- 构建命令：`npm run build`
- 输出目录：`dist`
- Node 版本：见 `.node-version`

## 开启评论（Giscus）

1. 在 GitHub 仓库 `vx-zjr/elvhack` 的 Settings → Features 打开 Discussions。
2. 安装 [giscus App](https://github.com/apps/giscus) 并授权这个仓库。
3. 到 <https://giscus.app/zh-CN> 选择仓库和分类，把生成的 `data-repo-id`、`data-category-id` 填进 `src/site.config.ts` 的 `giscus`。

没填之前，文章页不会显示评论区。
