/** 文章页背景渲染器的公共接口：由 <ambient-field> 统一管理循环、尺寸与主题 */
export interface Backdrop {
  /** 画布尺寸（CSS 像素） */
  resize(width: number, height: number): void;
  draw(now: number): void;
  /** 主题或 CRT 模式变化后重新读取颜色 */
  colors(): void;
  /** 是否需要持续动画；返回 false 时只在滚动时重绘 */
  readonly continuous: boolean;
  destroy(): void;
}

export type BackdropMode = 'flow' | 'nebula' | 'off';

export const backdropModes: BackdropMode[] = ['flow', 'nebula', 'off'];
