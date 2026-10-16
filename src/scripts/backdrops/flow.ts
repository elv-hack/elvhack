/**
 * 文章页背景：粒子流场（阅读模式）。
 * 与首页同一个引擎，但更稀、更慢、更淡；滚动时粒子连同拖尾按 30% 视差上移，流速随滚动速度短暂加快。
 * 正文栏的位置由 <ambient-field> 写进 CSS 变量，用遮罩压暗那一段。
 */
import { FlowField } from '../flow-field';
import { themeColors } from '../theme';
import type { Backdrop, BackdropOptions } from './types';

const PARALLAX = 0.3;

export class FlowBackdrop implements Backdrop {
  #field: FlowField;
  #canvas: HTMLCanvasElement;
  #lite: boolean;
  #lastScroll = scrollY;
  #boost = 0;
  #baseSpeed = 0.8;

  constructor(host: HTMLElement, options: BackdropOptions) {
    this.#lite = options.lite;
    this.#canvas = document.createElement('canvas');
    this.#canvas.className = 'flow';
    host.append(this.#canvas);
    this.#field = new FlowField(this.#canvas, {
      areaPerParticle: options.lite ? 2600 : 2400,
      minCount: options.lite ? 140 : 160,
      maxCount: options.lite ? 480 : 720,
      scale: 0.0011,
      speed: this.#baseSpeed,
      fade: 0.045,
      accentEvery: 13,
      swirl: 0.45,
      radius: 150,
    });
    this.colors();
    addEventListener('pointermove', this.#onPointer, { passive: true });
  }

  colors() {
    const { bg, fg, accent } = themeColors();
    const light = document.documentElement.dataset.theme === 'light' && !document.documentElement.classList.contains('crt');
    this.#field.colors = { bg, ink: fg, accent };
    // 手机屏幕小、正文铺满，线条稍微实一点才看得出流动
    this.#field.params.inkAlpha = (light ? 0.16 : 0.2) + (this.#lite ? 0.05 : 0);
    this.#field.clear();
  }

  resize(width: number, height: number) {
    this.#field.resize(width, height);
    this.#field.renderStatic(60);
  }

  draw() {
    const delta = scrollY - this.#lastScroll;
    this.#lastScroll = scrollY;
    if (delta) this.#field.shift(-delta * PARALLAX);
    // 滚动时流速最多提到 3.5 倍，松手后约两秒平缓回落；
    // 停手后的基础流速要足够明显，否则在手机上看起来像静止
    this.#boost = Math.max(Math.min(2.5, Math.abs(delta) * 0.05), this.#boost * 0.97);
    this.#field.params.speed = this.#baseSpeed * (1 + this.#boost);
    this.#field.step();
  }

  #onPointer = (event: PointerEvent) => {
    this.#field.setPointer(event.clientX, event.clientY);
  };

  destroy() {
    removeEventListener('pointermove', this.#onPointer);
    this.#canvas.remove();
  }
}
