/**
 * 把实验控制面板里的 <input name> 绑定到回调，并同步 <output data-for>。
 * 窄屏默认收起面板，避免挡住画面。
 */
export interface Panel {
  value(name: string): number;
  set(name: string, value: number): void;
  choice(name: string): string;
  on(action: string, fn: (button: HTMLButtonElement) => void): void;
}

export function bindPanel(
  root: HTMLElement,
  handlers: Record<string, (value: number) => void>,
  options: { fixed?: Record<string, number>; choices?: Record<string, (value: string) => void> } = {},
): Panel {
  const details = root.querySelector<HTMLDetailsElement>('.lab-panel');
  if (details && innerWidth < 640) details.open = false;

  const input = (name: string) => root.querySelector<HTMLInputElement>(`input[name="${name}"]`)!;
  const show = (name: string) => {
    const out = root.querySelector(`output[data-for="${name}"]`);
    if (!out) return;
    const digits = options.fixed?.[name];
    const value = Number(input(name).value);
    out.textContent = digits === undefined ? input(name).value : value.toFixed(digits);
  };

  for (const [name, fn] of Object.entries(handlers)) {
    const el = input(name);
    el.addEventListener('input', () => {
      show(name);
      fn(Number(el.value));
    });
    show(name);
    fn(Number(el.value));
  }

  for (const [name, fn] of Object.entries(options.choices ?? {})) {
    for (const radio of root.querySelectorAll<HTMLInputElement>(`input[name="${name}"]`)) {
      radio.addEventListener('change', () => radio.checked && fn(radio.value));
      if (radio.checked) fn(radio.value);
    }
  }

  return {
    value: (name) => Number(input(name).value),
    set: (name, value) => {
      input(name).value = String(value);
      show(name);
      handlers[name]?.(value);
    },
    choice: (name) => root.querySelector<HTMLInputElement>(`input[name="${name}"]:checked`)?.value ?? '',
    on: (action, fn) => {
      const button = root.querySelector<HTMLButtonElement>(`[data-action="${action}"]`);
      button?.addEventListener('click', () => fn(button));
    },
  };
}
