/**
 * 文章页背景的几套图案。每套只写一个 GLSL 函数 scene(p, a, acc)：
 * 给定像素坐标 p，输出墨色不透明度 a（0–1）和强调色比例 acc（0–1）。
 * a、acc 进来时都是 0（用 inout 而不是 out：out 参数进函数时的值是未定义的，先读后写或提前 return 都不可靠）。
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
    void scene(vec2 p, inout float a, inout float acc) {
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

    void scene(vec2 p, inout float a, inout float acc) {
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

    void scene(vec2 p, inout float a, inout float acc) {
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
    void scene(vec2 p, inout float a, inout float acc) {
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
    void scene(vec2 p, inout float a, inout float acc) {
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

const constellation: Scene = {
  id: 'constellation',
  label: '星图',
  glsl: `
    float segDist(vec2 p, vec2 a, vec2 b) {
      vec2 pa = p - a;
      vec2 ba = b - a;
      float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
      return length(pa - ba * h);
    }

    // 两颗星之间的连线：离得越近越清楚，超过 1.5 格就断开
    float link(vec2 p, vec2 a, vec2 b, float size) {
      float k = smoothstep(1.5 * size, 0.85 * size, distance(a, b));
      if (k <= 0.0) return 0.0;
      return k * (1.0 - smoothstep(0.35 * uDpr, 1.1 * uDpr, segDist(p, a, b)));
    }

    void scene(vec2 p, inout float a, inout float acc) {
      float size = 118.0 * uDpr;
      vec2 id = floor(p / size);
      vec2 s[9];
      float t = uTime * 0.11;
      float stars = 0.0;
      float starAcc = 0.0;
      for (int j = 0; j < 3; j++) {
        for (int i = 0; i < 3; i++) {
          // 每格一颗星，绕格子中心慢慢漂
          vec2 cell = id + vec2(float(i - 1), float(j - 1));
          float h1 = hash(cell + 0.7);
          float h2 = hash(cell + 9.2);
          vec2 wobble = vec2(sin(t * (0.6 + h1) + h2 * 6.2832), cos(t * (0.5 + h2) + h1 * 6.2832));
          vec2 c = (cell + 0.5 + 0.34 * wobble) * size;
          s[j * 3 + i] = c;
          float d = distance(p, c);
          if (d > 8.0 * uDpr) continue;
          float h = fract((h1 + h2) * 9.13);
          float bright = 0.55 + 0.45 * sin(uTime * (0.7 + h) + h * 40.0);
          float r = mix(1.0, 2.3, h * h) * uDpr;
          float core = 1.0 - smoothstep(r - 0.6 * uDpr, r + 0.6 * uDpr, d);
          // 少数亮星用强调色，外面套一圈细环
          float big = step(0.9, h);
          float ring = big * (1.0 - smoothstep(0.3 * uDpr, 1.0 * uDpr, abs(d - 6.0 * uDpr)));
          float v = max(core * (0.3 + 0.4 * bright), ring * 0.35 * bright);
          if (v > stars) {
            stars = v;
            starAcc = big;
          }
        }
      }
      // 中心格的星连向周围 8 颗；另外 4 条补上斜穿本格、但两端都不在本格的连线
      float lines = 0.0;
      for (int k = 0; k < 9; k++) {
        if (k == 4) continue;
        lines = max(lines, link(p, s[4], s[k], size));
      }
      lines = max(lines, link(p, s[1], s[3], size));
      lines = max(lines, link(p, s[1], s[5], size));
      lines = max(lines, link(p, s[7], s[3], size));
      lines = max(lines, link(p, s[7], s[5], size));
      float lineA = lines * (0.11 + 0.25 * lensAt(p));
      if (stars >= lineA) {
        a = stars;
        acc = starAcc;
      } else {
        a = lineA;
      }
    }
  `,
};

const ripples: Scene = {
  id: 'ripples',
  label: '涟漪',
  glsl: `
    void scene(vec2 p, inout float a, inout float acc) {
      float size = 170.0 * uDpr;
      float spacing = 13.0 * uDpr;
      vec2 id = floor(p / size);
      float lens = lensAt(p);
      // 涟漪最大半径 1.15 格，所以只需看周围 3×3 格的雨滴
      for (int j = -1; j <= 1; j++) {
        for (int i = -1; i <= 1; i++) {
          vec2 cell = id + vec2(float(i), float(j));
          float h = hash(cell + 3.3);
          float k = uTime / mix(6.0, 11.0, fract(h * 17.3)) + h * 5.0;
          float n = mod(floor(k), 251.0);
          // 一轮里前 70% 的时间在扩散，之后这一格安静一会儿；每轮只有一半的格子落雨
          float life = fract(k) / 0.7;
          float on = hash(cell + n * 1.37 + 0.5);
          if (life > 1.0 || on < 0.5) continue;
          vec2 drop = (cell + 0.2 + 0.6 * vec2(hash(cell + n * 3.1 + 1.0), hash(cell + n * 5.7 + 2.0))) * size;
          float reach = size * mix(0.7, 1.15, fract(on * 7.7));
          float radius = (1.0 - (1.0 - life) * (1.0 - life)) * reach;
          float front = radius - distance(p, drop);
          // 不在任何一圈附近就跳过，省掉后面的计算
          if (front < -2.0 * uDpr || front > 2.0 * spacing + 2.0 * uDpr) continue;
          float w = mix(1.1, 0.5, life) * uDpr;
          float rings = 0.0;
          for (int r = 0; r < 3; r++) {
            float rr = front - float(r) * spacing;
            rings += (1.0 - smoothstep(w - 0.5 * uDpr, w + 0.6 * uDpr, abs(rr))) * pow(0.5, float(r)) * step(float(r) * spacing, radius);
          }
          // 先淡入再随扩散变淡，不会一落下就是个实心的靶子
          float fade = (1.0 - life) * (1.0 - life) * smoothstep(0.0, 0.2, life);
          float v = min(rings, 1.0) * fade * (0.42 + 0.3 * lens);
          if (v > a) {
            a = v;
            acc = step(0.88, fract(on * 31.1));
          }
        }
      }
    }
  `,
};

const radar: Scene = {
  id: 'radar',
  label: '雷达',
  glsl: `
    const float TAU = 6.2831853;

    void scene(vec2 p, inout float a, inout float acc) {
      // 圆心放在右下，避开正文栏
      vec2 center = vec2(uRes.x * 0.86, uRes.y * 0.24);
      vec2 d = p - center;
      float r = length(d);
      float ang = atan(d.y, d.x);
      // 扫描线逆时针转，约 15 秒一圈；behind 是扫过这里之后又转过的角度
      float sweep = mod(uTime * 0.42, TAU);
      float behind = mod(sweep - ang, TAU);
      float gap = 96.0 * uDpr;
      float inner = step(gap * 0.5, r);

      float rr = abs(fract(r / gap + 0.5) - 0.5) * gap;
      float rings = (1.0 - smoothstep(0.35 * uDpr, 1.1 * uDpr, rr)) * inner;
      float sector = TAU / 12.0;
      float spokes = (1.0 - smoothstep(0.35 * uDpr, 1.0 * uDpr, abs(fract(ang / sector + 0.5) - 0.5) * sector * r)) * inner;
      // 每圈上每 5° 一个短刻度
      float tick = TAU / 72.0;
      float ticks = (1.0 - smoothstep(0.3 * uDpr, 0.9 * uDpr, abs(fract(ang / tick + 0.5) - 0.5) * tick * r)) *
        (1.0 - smoothstep(3.0 * uDpr, 4.0 * uDpr, rr)) * inner;

      float glow = exp(-behind * 2.4);
      float beam = (1.0 - smoothstep(0.6 * uDpr, 1.8 * uDpr, min(behind, TAU - behind) * r)) * step(4.0 * uDpr, r);

      // 目标点：扫描线经过时亮起，然后慢慢暗下去
      float cell = 58.0 * uDpr;
      vec2 id = floor(p / cell);
      vec2 blip = (id + 0.25 + 0.5 * vec2(hash(id + 1.3), hash(id + 6.1))) * cell;
      float has = step(0.86, hash(id + 2.7));
      float lit = exp(-mod(sweep - atan(blip.y - center.y, blip.x - center.x), TAU) * 0.9);
      float bd = distance(p, blip);
      float dotMask = has * (1.0 - smoothstep(1.6 * uDpr, 2.6 * uDpr, bd));
      float halo = has * (1.0 - smoothstep(0.3 * uDpr, 1.0 * uDpr, abs(bd - 7.0 * uDpr))) * lit * smoothstep(0.0, 0.5, lit);

      // 圆心的小十字
      float hair = (1.0 - smoothstep(0.4 * uDpr, 1.1 * uDpr, min(abs(d.x), abs(d.y)))) * (1.0 - step(10.0 * uDpr, r));

      float lens = lensAt(p);
      // 离圆心越远线越淡
      float near = mix(1.0, 0.55, smoothstep(0.0, 1400.0 * uDpr, r));
      float grid = max(rings * (0.11 + 0.3 * glow), max(spokes * (0.06 + 0.16 * glow), ticks * 0.11)) * near;
      a = grid + glow * 0.075 * inner * near + lens * max(rings, spokes) * 0.18;
      a = max(a, max(beam * 0.55, dotMask * (0.16 + 0.6 * lit)));
      a = max(a, max(halo * 0.4, hair * 0.4));
      acc = max(beam, max(dotMask, halo) * step(0.25, lit));
    }
  `,
};

const engraving: Scene = {
  id: 'engraving',
  label: '铜版',
  glsl: `
    // 一片缓慢起伏的地形
    float height(vec2 p) {
      vec2 uv = p / min(uRes.x, uRes.y);
      float t = uTime * 0.015;
      return 0.6 * noise(uv * 2.2 + vec2(t, t * 0.6)) + 0.3 * noise(uv * 4.8 + vec2(-t * 0.8, t * 0.5) + 3.1) +
        0.1 * noise(uv * 9.5 + vec2(t * 0.4, 0.0) + 7.7);
    }

    // 一组平行线：方向 dir、间距 gap、半线宽 w，bend 让线条整体偏移
    float hatch(vec2 p, vec2 dir, float gap, float w, float bend) {
      float d = abs(fract((dot(p, dir) + bend) / gap) - 0.5) * gap;
      return 1.0 - smoothstep(w - 0.55 * uDpr, w + 0.55 * uDpr, d);
    }

    void scene(vec2 p, inout float a, inout float acc) {
      // 光从左上方照过来，背光的坡面线条变粗，像铜版画 / 钞票上的地形浮雕
      float e = 2.0 * uDpr;
      float h0 = height(p);
      vec2 g = vec2(height(p + vec2(e, 0.0)) - h0, height(p + vec2(0.0, e)) - h0) / e * min(uRes.x, uRes.y);
      vec3 n = normalize(vec3(-g * 0.22, 1.0));
      float light = dot(n, normalize(vec3(-0.6, 0.6, 0.5)));
      float v = clamp(smoothstep(0.9, 0.25, light) + lensAt(p) * 0.3, 0.0, 1.0);
      // 一组横向刻线被地形整体推弯，起伏处像水波一样流动
      float gap = 8.0 * uDpr;
      float u = p.y + h0 * 70.0 * uDpr;
      float l = hatch(vec2(0.0, u), vec2(0.0, 1.0), gap, mix(0.15 * uDpr, 0.3 * gap, v), 0.0);
      a = l * (0.03 + 0.17 * v * sqrt(v));
      // 其中一条刻线用强调色
      float idx = floor(u / gap);
      float pick = floor(uRes.y / gap * 0.62);
      acc = step(abs(idx - pick), 0.5);
      a = max(a, l * acc * 0.32);
    }
  `,
};

const wind: Scene = {
  id: 'wind',
  label: '风场',
  glsl: `
    void scene(vec2 p, inout float a, inout float acc) {
      float size = 34.0 * uDpr;
      vec2 id = floor(p / size);
      vec2 c = (id + 0.5 + 0.12 * (vec2(hash(id), hash(id + 4.4)) - 0.5)) * size;
      vec2 uv = c / min(uRes.x, uRes.y);
      float t = uTime * 0.025;
      // 风向和风速各是一层缓慢漂移的噪声
      float ang = noise(uv * 1.6 + vec2(t, -t * 0.7)) * 6.2832 * 1.3 + 0.6;
      vec2 dir = vec2(cos(ang), sin(ang));
      float speed = smoothstep(0.25, 0.85, noise(uv * 3.0 + vec2(-t * 1.2, t) + 5.0));
      float len = size * mix(0.16, 0.42, speed);
      vec2 q = p - c;
      float along = dot(q, dir);
      float side = abs(dot(q, vec2(-dir.y, dir.x)));
      float body = (1.0 - smoothstep(0.35 * uDpr, 1.05 * uDpr, side)) * (1.0 - smoothstep(len - 0.6 * uDpr, len + 0.6 * uDpr, abs(along)));
      float head = 1.0 - smoothstep(1.0 * uDpr, 1.9 * uDpr, distance(q, dir * len));
      // 尾淡头浓，看得出风往哪吹
      float grad = pow(clamp(along / len * 0.5 + 0.5, 0.0, 1.0), 1.6);
      // 一片片亮区顺着风向往前推
      float gust = smoothstep(0.3, 0.8, noise(uv * 3.0 - dir * uTime * 0.12 + 11.0));
      float v = (0.35 + 0.65 * speed) * (0.3 + 0.7 * gust);
      a = max(body * grad, head) * (0.06 + 0.36 * v + 0.3 * lensAt(c));
      acc = step(0.95, hash(id + 8.8)) * step(0.5, gust);
    }
  `,
};

export const scenes: Scene[] = [dots, contour, traces, blueprint, rain, constellation, ripples, radar, engraving, wind];

export const fragmentFor = (scene: Scene) => PRELUDE + scene.glsl + MAIN;
