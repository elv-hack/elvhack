import { coverInfo, type CoverStyle } from '@/lib/generative';

export interface LabEntry {
  slug: string;
  title: string;
  en: string;
  description: string;
  /** 怎么玩，一条一句 */
  howto: string[];
  date: string;
  cover: CoverStyle;
}

/** 实验室条目。顺序即编号（EXP-01 起）。新增实验：在 src/lab/ 写组件，并在 pages/lab/[slug].astro 注册。 */
export const labs: LabEntry[] = [
  {
    slug: 'flow-field',
    title: '流场',
    en: 'Flow Field',
    description: '上千个粒子沿着 Perlin 噪声场流动，留下渐隐的轨迹。指针附近会形成涡旋。',
    howto: ['在画面上移动指针，搅动流场。', '调低“拖尾”能让轨迹更长，调高“尺度”会让流线更碎。'],
    date: '2026-10-16',
    cover: 'flow',
  },
  {
    slug: 'moire',
    title: '莫尔纹',
    en: 'Moiré',
    description: '两组规则图案稍微错开，就会干涉出第三种图案。同心圆和平行线都可以。',
    howto: ['移动指针拖动第二组图案。', '切换到“平行线”，调整旋转角度看条纹的变化。'],
    date: '2026-10-16',
    cover: 'moire',
  },
  {
    slug: 'ridgelines',
    title: '山脊线',
    en: 'Ridgelines',
    description: '致敬 Joy Division《Unknown Pleasures》的封面：一排排脉冲星信号，前排遮住后排。',
    howto: ['左右移动指针，峰值会跟着走。', '调整线条数量和振幅，看它从平静变得剧烈。'],
    date: '2026-10-16',
    cover: 'ridge',
  },
  {
    slug: 'signal-scope',
    title: '双正弦示波器',
    en: 'Signal Scope',
    description: '两路正弦信号的叠加与李萨如图形。频率比决定图形，相位差决定它的姿态。',
    howto: ['拖动频率和相位滑块。', '切到李萨如模式，试试 3 : 2、相位 90°。'],
    date: '2026-10-16',
    cover: 'lissajous',
  },
];

export const labCover = (entry: LabEntry) => coverInfo(`lab/${entry.slug}`, entry.cover);

export const labCode = (entry: LabEntry) => `EXP-${String(labs.indexOf(entry) + 1).padStart(2, '0')}`;
