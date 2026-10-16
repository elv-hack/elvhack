/** 动画循环：只在元素可见、页面在前台且未暂停时运行 */
export class Loop {
  #frame = 0;
  #visible = true;
  #paused = false;
  #observer?: IntersectionObserver;
  #el: Element;
  #tick: (now: number) => void;

  constructor(el: Element, tick: (now: number) => void) {
    this.#el = el;
    this.#tick = tick;
  }

  start() {
    this.#observer = new IntersectionObserver(([entry]) => {
      this.#visible = entry.isIntersecting;
      this.#sync();
    });
    this.#observer.observe(this.#el);
    document.addEventListener('visibilitychange', this.#sync);
    this.#sync();
  }

  stop() {
    cancelAnimationFrame(this.#frame);
    this.#observer?.disconnect();
    document.removeEventListener('visibilitychange', this.#sync);
  }

  get paused() {
    return this.#paused;
  }

  set paused(value: boolean) {
    this.#paused = value;
    this.#sync();
  }

  #sync = () => {
    cancelAnimationFrame(this.#frame);
    if (this.#paused || !this.#visible || document.hidden) return;
    const run = (now: number) => {
      this.#tick(now);
      this.#frame = requestAnimationFrame(run);
    };
    this.#frame = requestAnimationFrame(run);
  };
}
