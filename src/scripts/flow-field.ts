/** 粒子流场引擎：首页背景和实验室共用。只负责模拟和绘制，循环与事件由调用方管理。 */
import { lerp, noise3 } from './noise';

export interface FlowParams {
  /** 每多少 CSS 像素面积一个粒子 */
  areaPerParticle: number;
  minCount: number;
  maxCount: number;
  /** 噪声场尺度，越小越平缓 */
  scale: number;
  speed: number;
  /** 拖尾衰减，越小拖尾越长 */
  fade: number;
  accentEvery: number;
  /** 指针涡旋强度 0–1 */
  swirl: number;
  radius: number;
  inkAlpha: number;
}

export const defaultFlow: FlowParams = {
  areaPerParticle: 700,
  minCount: 350,
  maxCount: 1800,
  scale: 0.0016,
  speed: 1.15,
  fade: 0.085,
  accentEvery: 9,
  swirl: 0.9,
  radius: 220,
  inkAlpha: 0.32,
};

const STRIDE = 4; // x, y, age, life

export class FlowField {
  params: FlowParams;
  colors = { bg: '#0a0b0d', ink: '#ecebe6', accent: '#c6ff3d' };
  pointer = { x: 0, y: 0, active: false };
  count = 0;
  #ctx: CanvasRenderingContext2D;
  #canvas: HTMLCanvasElement;
  #particles = new Float32Array(0);
  #w = 1;
  #h = 1;
  #dpr = 1;
  #t = 0;

  constructor(canvas: HTMLCanvasElement, params: Partial<FlowParams> = {}) {
    this.#canvas = canvas;
    this.#ctx = canvas.getContext('2d', { alpha: false })!;
    this.params = { ...defaultFlow, ...params };
  }

  /** 按 CSS 尺寸重设画布；count 不传则按面积推算 */
  resize(width: number, height: number, count?: number) {
    this.#dpr = Math.min(devicePixelRatio || 1, 2);
    this.#w = Math.max(1, Math.round(width * this.#dpr));
    this.#h = Math.max(1, Math.round(height * this.#dpr));
    this.#canvas.width = this.#w;
    this.#canvas.height = this.#h;
    const { areaPerParticle, minCount, maxCount } = this.params;
    // 尺寸变了，所有粒子按新画布重新撒点
    this.#particles = new Float32Array(0);
    this.count = 0;
    this.setCount(count ?? Math.round(Math.min(maxCount, Math.max(minCount, (width * height) / areaPerParticle))));
    this.clear();
  }

  setCount(count: number) {
    const next = new Float32Array(count * STRIDE);
    next.set(this.#particles.subarray(0, Math.min(this.#particles.length, next.length)));
    const previous = this.count;
    this.#particles = next;
    this.count = count;
    for (let i = previous; i < count; i++) this.#spawn(i, true);
  }

  /** 指针位置，CSS 像素，相对画布左上角 */
  setPointer(x: number, y: number) {
    this.pointer = { x: x * this.#dpr, y: y * this.#dpr, active: true };
  }

  releasePointer() {
    this.pointer.active = false;
  }

  clear() {
    this.#ctx.globalAlpha = 1;
    this.#ctx.fillStyle = this.colors.bg;
    this.#ctx.fillRect(0, 0, this.#w, this.#h);
  }

  renderStatic(steps = 140) {
    for (let i = 0; i < steps; i++) this.step(false);
  }

  #spawn(i: number, randomAge = false) {
    const o = i * STRIDE;
    const p = this.#particles;
    p[o] = Math.random() * this.#w;
    p[o + 1] = Math.random() * this.#h;
    p[o + 3] = 80 + Math.random() * 220;
    p[o + 2] = randomAge ? Math.random() * p[o + 3] : 0;
  }

  step(fade = true) {
    const ctx = this.#ctx;
    const p = this.#particles;
    const { scale, speed: baseSpeed, accentEvery, swirl, inkAlpha } = this.params;
    const { x: px, y: py, active } = this.pointer;
    const radius = this.params.radius * this.#dpr;
    const speed = baseSpeed * this.#dpr;
    const s = scale / this.#dpr;

    if (fade) {
      ctx.globalAlpha = this.params.fade;
      ctx.fillStyle = this.colors.bg;
      ctx.fillRect(0, 0, this.#w, this.#h);
    }

    this.#t += 0.0022;
    ctx.lineWidth = this.#dpr;
    ctx.lineCap = 'round';

    for (let pass = 0; pass < 2; pass++) {
      const isAccent = pass === 1;
      ctx.beginPath();
      for (let i = 0; i < this.count; i++) {
        if (isAccent !== (i % accentEvery === 0)) continue;
        const o = i * STRIDE;
        const x = p[o];
        const y = p[o + 1];
        let angle = noise3(x * s, y * s, this.#t) * Math.PI * 3;

        if (active) {
          const dx = x - px;
          const dy = y - py;
          const dist = Math.hypot(dx, dy);
          if (dist < radius) angle = lerp(angle, Math.atan2(dy, dx) + Math.PI / 2, (1 - dist / radius) * swirl);
        }

        const v = speed * (isAccent ? 1.6 : 1);
        const nx = x + Math.cos(angle) * v;
        const ny = y + Math.sin(angle) * v;
        ctx.moveTo(x, y);
        ctx.lineTo(nx, ny);
        p[o] = nx;
        p[o + 1] = ny;
        p[o + 2] += 1;
        if (p[o + 2] > p[o + 3] || nx < 0 || nx > this.#w || ny < 0 || ny > this.#h) this.#spawn(i);
      }
      ctx.globalAlpha = isAccent ? 0.9 : inkAlpha;
      ctx.strokeStyle = isAccent ? this.colors.accent : this.colors.ink;
      ctx.stroke();
    }
  }
}
