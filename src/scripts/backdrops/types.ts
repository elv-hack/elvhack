/** 文章页背景渲染器的公共接口：由 <ambient-field> 统一管理循环、尺寸与主题 */
export interface Backdrop {
  /** 画布尺寸（CSS 像素） */
  resize(width: number, height: number): void;
  draw(now: number): void;
  /** 主题或 CRT 模式变化后重新读取颜色 */
  colors(): void;
  destroy(): void;
}

export interface BackdropOptions {
  /** 触屏等性能较弱的设备：减少粒子 / 星星数量 */
  lite: boolean;
}

export type BackdropMode = 'flow' | 'nebula' | 'off';

export const backdropModes: BackdropMode[] = ['flow', 'nebula', 'off'];
