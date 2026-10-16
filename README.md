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
cover: ridge              # 可选：flow / moire / ridge / halftone，不填由文章 id 决定
---
```

每篇文章都有一张由 id 生成的封面（`src/lib/generative.ts`），构建时输出到 `/covers/<id>.svg`，并自动适配明暗主题。

`.mdx` 里不用 import 就能直接用这些组件：

- `<Experiment title="..." note="...">…</Experiment>`：交互实验外框
- `<SignalScope f1={3} f2={2} phase={90} />`：示例实验，双正弦示波器
- `<Callout type="note|tip|warn" title="...">…</Callout>`：提示框

新的实验组件放在 `src/components/mdx/`，再到 `src/pages/posts/[...slug].astro` 的 `components` 里注册。

## 交互与彩蛋

- `⌘K` / `Ctrl K` / `/`：命令面板，页面跳转、全文搜索（Pagefind，构建时生成索引）、切换主题、开关文章背景特效
- 文章页背景“信号点阵”（`src/components/ReadingBackdrop.astro`）：固定在视口、不随页面滚动，每帧只由坐标和时间算出；可在命令面板里开关
- 实验室 `/lab`：实验注册在 `src/lab/registry.ts`，组件放在 `src/lab/`
- 彩蛋：Konami 秘籍 ↑↑↓↓←→←→BA，或命令面板里的“CRT 模式”

## 结构

| 路径 | 说明 |
| --- | --- |
| `src/site.config.ts` | 站点标题、导航、社交链接、评论配置 |
| `src/data/profile.ts` | “关于”页的个人资料（目前是示例，替换后把 `sample` 改成 `false`） |
| `src/styles/tokens.css` | 颜色、字体、间距等设计变量（亮/暗两套） |
| `src/components/FieldCanvas.astro` | 首页粒子流场 |
| `src/layouts/PostLayout.astro` | 文章页：目录、阅读进度、代码复制、上下篇、评论 |
| `public/` | 原样输出的静态文件（`_headers` 是 Cloudflare Pages 的响应头配置） |

## 部署

推送到 `main` 后，Cloudflare Pages 项目 `elvhack` 会自动构建并发布：

- 构建命令：`npm run build`
- 输出目录：`dist`
- Node 版本：见 `.node-version`

## www 跳转

`www.elvhack.com` 由一个独立的小 Worker 301 跳转到 `https://elvhack.com`，源码在 `infra/www-redirect/`。它绑定为自定义域名，DNS 记录和证书由 Cloudflare 自动管理。修改后在该目录运行：

```bash
npx wrangler@4.146.0 deploy
```

## 开启评论（Giscus）

1. 在 GitHub 仓库 `elv-hack/elvhack` 的 Settings → Features 打开 Discussions。
2. 安装 [giscus App](https://github.com/apps/giscus) 并授权这个仓库。
3. 到 <https://giscus.app/zh-CN> 选择仓库和分类，把生成的 `data-repo-id`、`data-category-id` 填进 `src/site.config.ts` 的 `giscus`。

没填之前，文章页不会显示评论区。
