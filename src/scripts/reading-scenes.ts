/**
 * 文章页背景的几套图案。每套只写一个 GLSL 函数 scene(p, a, acc)：
 * 给定像素坐标 p，输出墨色不透明度 a（0–1）和强调色比例 acc（0–1）。
 * 颜色、正文栏压淡、指针“放大镜”由公共外壳负责。所有图案都只由坐标和时间决定，不依赖上一帧。
 */

export interface Scene {
  id: string;
  label: string;
  glsl: string;
}

/** 公共头部：uniform、噪声和放大镜 */
export const PRELUDE = `
  precision highp float;
  uniform vec2 uRes;
  uniform float uTime;
  uniform float uDpr;
  uniform vec3 uBg;
  uniform vec3 uInk;
  uniform vec3 uAccent;
  uniform vec2 uCol;
  uniform float uCalm;
  uniform vec2 uPointer;
  uniform float uLens;

  float hash(vec2 p) {
    p = fract(p * vec2(127.1, 311.7));
    p += dot(p, p + 34.5);
    return fract(p.x * p.y);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
  }

  // 指针附近的“放大镜”：0–1
  float lensAt(vec2 q) {
    return uLens * smoothstep(1.0, 0.0, distance(q, uPointer) / (160.0 * uDpr));
  }
`;

/** 公共主函数：上色、正文栏压淡 */
export const MAIN = `
  void main() {
    vec2 p = gl_FragCoord.xy;
    float a = 0.0;
    float acc = 0.0;
    scene(p, a, acc);
    float x = p.x / uRes.x;
    float column = smoothstep(uCol.x - 0.05, uCol.x + 0.01, x) * (1.0 - smoothstep(uCol.y - 0.01, uCol.y + 0.05, x));
    a *= mix(1.0, uCalm, column);
    vec3 color = mix(uInk, uAccent, clamp(acc, 0.0, 1.0));
    gl_FragColor = vec4(mix(uBg, color, clamp(a, 0.0, 1.0)), 1.0);
  }
`;

const dots: Scene = {
  id: 'dots',
  label: '点阵',
  glsl: `
    void scene(vec2 p, out float a, out float acc) {
      float cell = 22.0 * uDpr;
      vec2 id = floor(p / cell);
      vec2 c = (id + 0.5) * cell;
      vec2 uv = c / min(uRes.x, uRes.y);
      float t = uTime;
      // 两层噪声缓慢漂移，决定每个点的“信号强度”
      float n = 0.62 * noise(uv * 2.4 + vec2(t * 0.035, -t * 0.02)) + 0.38 * noise(uv * 6.0 + vec2(-t * 0.05, t * 0.04));
      float v = smoothstep(0.3, 0.85, n);
      // 扫描带：约 16 秒从顶到底扫一遍
      float scan = 1.15 - fract(t / 16.0) * 1.3;
      float band = exp(-pow((c.y / uRes.y - scan) * 9.0, 2.0));
      float level = clamp(v * 0.85 + band * 0.35 + lensAt(c) * 0.55, 0.0, 1.0);
      float radius = cell * (0.05 + 0.13 * level);
      float aa = 0.9 * uDpr;
      float dotMask = 1.0 - smoothstep(radius - aa, radius + aa, length(p - c));
      // 少数固定位置的点用强调色，缓慢闪烁
      acc = step(0.93, hash(id + 17.0)) * step(0.5, v) * (0.6 + 0.4 * sin(t * 0.8 + hash(id) * 6.2832));
      a = dotMask * (0.07 + 0.34 * level) * (1.0 + 0.5 * acc);
    }
  `,
};

const contour: Scene = {
  id: 'contour',
  label: '等高线',
  glsl: `
    float field(vec2 p) {
      vec2 uv = p / min(uRes.x, uRes.y) * 1.7;
      float t = uTime * 0.022;
      vec2 q = mat2(0.8, -0.6, 0.6, 0.8) * uv * 2.2;
      return 0.66 * noise(uv + vec2(t, -t * 0.7)) + 0.34 * noise(q + vec2(-t * 0.9, t * 0.5) + 7.3);
    }

    void scene(vec2 p, out float a, out float acc) {
      const float LEVELS = 16.0;
      float n = field(p);
      // 用相邻像素估计梯度，让线宽在陡坡和缓坡上保持一致
      float gx = field(p + vec2(1.0, 0.0)) - n;
      float gy = field(p + vec2(0.0, 1.0)) - n;
      float g = max(length(vec2(gx, gy)) * LEVELS, 1e-5);
      float v = n * LEVELS;
      float idx = floor(v + 0.5);
      float d = abs(v - idx) / g;
      float major = step(mod(idx, 4.0), 0.5);
      float width = mix(0.55, 1.05, major) * uDpr;
      float line = 1.0 - smoothstep(width - 0.5 * uDpr, width + 0.7 * uDpr, d);
      // 其中一条等高线用强调色
      acc = step(abs(idx - 10.0), 0.5);
      a = line * (0.1 + 0.14 * major + 0.3 * lensAt(p) + 0.22 * acc);
    }
  `,
};

const traces: Scene = {
  id: 'traces',
  label: '波形',
  glsl: `
    // 第 r 行信号线在 x 处的高度（像素）
    float traceY(float x, float r, out float env) {
      float gap = 30.0 * uDpr;
      float h = hash(vec2(r, 3.7));
      float t = uTime;
      // 一个沿线行进的信号包
      float center = (fract(t * mix(0.035, 0.1, h) + h * 7.0) * 1.6 - 0.3) * uRes.x;
      float w = mix(0.08, 0.2, hash(vec2(r, 9.1))) * uRes.x;
      env = exp(-pow((x - center) / w, 2.0));
      float wave = sin(x / (mix(10.0, 22.0, h) * uDpr) - t * 2.0) * env;
      float drift = (noise(vec2(x / min(uRes.x, uRes.y) * 3.0 + t * 0.05, r * 0.7)) - 0.5) * 0.35;
      return (r + 0.5) * gap + (wave * 0.42 + drift) * gap;
    }

    void scene(vec2 p, out float a, out float acc) {
      float gap = 30.0 * uDpr;
      float row = floor(p.y / gap);
      for (int k = -1; k <= 1; k++) {
        float r = row + float(k);
        float env;
        float y = traceY(p.x, r, env);
        float env2;
        float slope = traceY(p.x + 1.0, r, env2) - y;
        // 按斜率换算成到曲线的垂直距离，线宽才一致
        float d = abs(p.y - y) / sqrt(1.0 + slope * slope);
        float line = 1.0 - smoothstep(0.45 * uDpr, 1.3 * uDpr, d);
        float strength = 0.08 + 0.3 * env + 0.25 * lensAt(vec2(p.x, y));
        if (line * strength > a) {
          a = line * strength;
          acc = step(0.88, hash(vec2(r, 1.3))) * env;
        }
      }
    }
  `,
};

const blueprint: Scene = {
  id: 'blueprint',
  label: '蓝图',
  glsl: `
    void scene(vec2 p, out float a, out float acc) {
      float cell = 64.0 * uDpr;
      float t = uTime;
      vec2 g = abs(fract(p / cell + 0.5) - 0.5) * cell;
      float vx = 1.0 - smoothstep(0.35 * uDpr, 1.1 * uDpr, g.x);
      float hy = 1.0 - smoothstep(0.35 * uDpr, 1.1 * uDpr, g.y);
      float grid = max(vx, hy);
      // 交点处的小十字更亮一点
      float mark = step(max(g.x, g.y), 5.0 * uDpr) * grid;
      vec2 id = floor(p / cell + 0.5);
      float tail = 110.0 * uDpr;

      // 横线上的光点：从左往右
      float hr = hash(vec2(id.y, 5.3));
      float pulseH = 0.0;
      if (hr > 0.55) {
        float span = uRes.x + 600.0 * uDpr;
        float head = fract(t * mix(0.04, 0.11, hr) + hr * 9.0) * span - 300.0 * uDpr;
        float behind = head - p.x;
        pulseH = step(0.0, behind) * exp(-behind / tail) * hy;
      }
      // 竖线上的光点：从上往下
      float hc = hash(vec2(id.x, 8.1));
      float pulseV = 0.0;
      if (hc > 0.62) {
        float span = uRes.y + 600.0 * uDpr;
        float head = uRes.y + 300.0 * uDpr - fract(t * mix(0.035, 0.09, hc) + hc * 5.0) * span;
        float behind = p.y - head;
        pulseV = step(0.0, behind) * exp(-behind / tail) * vx;
      }
      float pulse = max(pulseH, pulseV);
      acc = smoothstep(0.1, 0.6, pulse);
      a = grid * 0.07 + mark * 0.13 + pulse * 0.55 + lensAt(p) * grid * 0.25;
    }
  `,
};

const rain: Scene = {
  id: 'rain',
  label: '数据雨',
  glsl: `
    void scene(vec2 p, out float a, out float acc) {
      float colW = 16.0 * uDpr;
      float col = floor(p.x / colW);
      float h = hash(vec2(col, 1.7));
      if (h < 0.28) return;
      float cx = (col + 0.5) * colW;
      float xMask = 1.0 - smoothstep(0.4 * uDpr, 1.1 * uDpr, abs(p.x - cx));
      float speed = mix(35.0, 110.0, hash(vec2(col, 4.2))) * uDpr;
      float len = mix(140.0, 420.0, hash(vec2(col, 8.8))) * uDpr;
      float period = uRes.y + len + mix(60.0, 520.0, hash(vec2(col, 2.4))) * uDpr;
      float head = mod(uTime * speed + h * period * 3.0, period) - len;
      float y = uRes.y - p.y;
      float d = head - y;
      float inside = step(0.0, d) * step(d, len);
      // 断续的小段，像一列列字符
      float seg = step(0.32, fract(y / (9.0 * uDpr)));
      float trail = inside * pow(1.0 - d / len, 1.5) * seg;
      float tip = step(0.0, d) * step(d, 7.0 * uDpr);
      acc = xMask * tip;
      a = xMask * max(trail * (0.34 + 0.3 * lensAt(p)), tip * 0.75);
    }
  `,
};

export const scenes: Scene[] = [dots, contour, traces, blueprint, rain];

export const fragmentFor = (scene: Scene) => PRELUDE + scene.glsl + MAIN;
