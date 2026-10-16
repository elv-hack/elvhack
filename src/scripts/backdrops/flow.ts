/**
 * 文章页背景：粒子流场（阅读模式）。
 * 与首页同一个引擎，但更稀、更慢、更淡；滚动时粒子连同拖尾按 30% 视差上移，流速随滚动速度短暂加快。
 * 正文栏的位置由 <ambient-field> 写进 CSS 变量，用遮罩压暗那一段。
 */
import { FlowField } from '../flow-field';
import { themeColors } from '../theme';
import type { Backdrop } from './types';

const PARALLAX = 0.3;

export class FlowBackdrop implements Backdrop {
  readonly continuous: boolean;
  #field: FlowField;
  #canvas: HTMLCanvasElement;
  #lastScroll = scrollY;
  #boost = 0;
  #baseSpeed = 0.55;
  #frame = 0;

  constructor(host: HTMLElement, options: { continuous: boolean }) {
    this.continuous = options.continuous;
    this.#canvas = document.createElement('canvas');
    this.#canvas.className = 'flow';
    host.append(this.#canvas);
    this.#field = new FlowField(this.#canvas, {
      areaPerParticle: 2400,
      minCount: 160,
      maxCount: 720,
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
    this.#field.params.inkAlpha = light ? 0.16 : 0.2;
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
    // 滚动越快流速越高，松手后在约一秒内回落
    this.#boost = Math.max(Math.min(6, Math.abs(delta) * 0.08), this.#boost * 0.94);
    this.#field.params.speed = this.#baseSpeed * (1 + this.#boost);

    // 持续模式下 30fps 就够了；滚动时每帧都画，保证视差跟手
    this.#frame += 1;
    if (this.continuous && !delta && this.#boost < 0.05 && this.#frame % 2) return;
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
