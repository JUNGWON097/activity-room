import { initGamePage, showResult, setupCanvas, canvasPoint } from './common.js?v=51';

initGamePage('stairs');

const W = 480, H = 640;
const cv = document.getElementById('cv');
const ctx = setupCanvas(cv, W, H);
const veil = document.getElementById('veil');

const STEP_W = 68, STEP_H = 20, SHIFT = 50, RISE = 46, PLAYER_Y = 470;
const INK = '#1a1240';
const FONT = 'Galmuri11, Pretendard, sans-serif';

let state = 'ready';          // ready → play → over
let cols, idx, gauge, last, cam = { x: 0, y: 0 }, pos, facing, overAt, overReason, fallY, hopAt = 0;
let runSeed = 1, chunks = new Map(), meteors = [], banner = null;

/* ---------- 계단 ---------- */
function ensureSteps(n) {
  while (cols.length < n) {
    const c = cols[cols.length - 1], p = cols[cols.length - 2];
    const prevDir = p === undefined ? 1 : c - p;
    const dir = Math.random() < 0.55 ? prevDir : -prevDir;   // 같은 방향이 조금 더 자주 이어진다
    cols.push(c + dir);
  }
}
function start() {
  cols = [0]; ensureSteps(40);
  idx = 0; gauge = 100; last = performance.now(); facing = 1; fallY = 0;
  cam = { x: 0, y: 0 }; pos = { x: 0, y: 0 };
  runSeed = Math.floor(Math.random() * 1e9); chunks = new Map(); meteors = []; banner = null;
  state = 'play'; veil.hidden = true;
}
// 시간 막대가 닳는 속도(초당). 버티려면 초당 (닳는 속도 ÷ 한 칸 회복량) 칸을 올라야 한다
function drainRate() { return Math.min(45, 12 + idx * 0.08); }

function step(dir) {
  if (state !== 'play') return;
  ensureSteps(idx + 30);
  facing = dir;
  if (cols[idx + 1] - cols[idx] !== dir) { pos.x += dir * SHIFT * 0.6; return over('fall'); }
  idx++; hopAt = performance.now();
  gauge = Math.min(100, gauge + 8);
  const z = zoneStart(idx);
  if (z) banner = { text: z, at: hopAt };
}
function over(reason) {
  state = 'over'; overAt = performance.now(); overReason = reason;
  setTimeout(() => showResult('stairs', idx, {
    detail: reason === 'fall' ? '삐약! 발을 헛디뎠어요' : '헥헥… 시간이 다 됐어요',
    extra: { reason },
    onRetry: start,
  }), 900);
}

function update(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  // 별똥별: 밤하늘부터
  if (alt() > 520 && Math.random() < dt * 0.5) {
    meteors.push({ x: Math.random() * W, y: Math.random() * H * 0.5, vx: -(260 + Math.random() * 200), vy: 120 + Math.random() * 120, t: 0 });
  }
  for (const m of meteors) { m.x += m.vx * dt; m.y += m.vy * dt; m.t += dt; }
  meteors = meteors.filter(m => m.t < 1.4);
  if (state === 'ready') return;
  if (state === 'play' && idx > 0) {
    gauge -= drainRate() * dt;
    if (gauge <= 0) { gauge = 0; over('time'); }
  }
  // 캐릭터와 화면이 목표 칸으로 부드럽게 따라간다
  const tx = cols[idx] * SHIFT, ty = -idx * RISE;
  if (state !== 'over' || overReason !== 'fall') {
    pos.x += (tx - pos.x) * Math.min(1, dt * 28);
    pos.y += (ty - pos.y) * Math.min(1, dt * 28);
  } else {
    fallY += 900 * dt * Math.min(3, (now - overAt) / 300 + 0.3);
  }
  // 화면은 앞으로 오를 몇 칸의 가운데를 보여 줘서 위쪽 계단이 잘리지 않게 한다
  ensureSteps(idx + 30);
  let ahead = 0;
  for (let i = idx; i < idx + 7; i++) ahead += cols[i];
  const camX = (tx + ahead / 7 * SHIFT) / 2;
  cam.x += (camX - cam.x) * Math.min(1, dt * 6);
  cam.y += (ty - cam.y) * Math.min(1, dt * 10);
}

/* ---------- 높이 구역 ----------
   지상 → 하늘 → 구름 → 노을 → 밤하늘(별) → 달 → 우주 → 행성 → 성운 → 은하수 → 블랙홀 → 미지의 우주(끝없이 새로 만든다) */
const ZONES = [
  [60, '☀️ 하늘로!'], [150, '☁️ 구름층'], [350, '🌇 노을 하늘'], [600, '🌃 밤하늘'], [900, '🌕 달 근처'],
  [1200, '🚀 우주 진입'], [1600, '🪐 행성 지대'], [2000, '🌌 성운'], [2600, '✨ 은하수'], [3200, '🕳️ 블랙홀 주의'], [3600, '👽 미지의 우주'],
];
function zoneStart(n) {
  const z = ZONES.find(([a]) => a === n);
  if (z) return z[1];
  if (n > 3600 && n % 500 === 0) return `👽 미지의 우주 ${(n - 3600) / 500 + 1}구역`;
  return null;
}
const alt = () => -cam.y / RISE;   // 지금 화면이 보고 있는 높이(계단 수, 소수)

/* ---------- 그리기 도구 (레트로 픽셀) ---------- */
const P = 4;
// 위치는 1px 단위로 부드럽게 옮기고(4px 단위로 튀면 화면이 덜덜 떨린다), 크기만 4px 칸으로 맞춰 레트로 느낌을 낸다
const snap = v => Math.round(v);
const sz = v => Math.round(v / P) * P;
function px(x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(snap(x), snap(y), Math.max(P, sz(w)), Math.max(P, sz(h))); }
function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
function hex(c) { return c.replace('#', '').match(/\w\w/g).map(h => parseInt(h, 16)); }
function lerpColor(a, b, k) { const pa = hex(a), pb = hex(b); return `rgb(${pa.map((v, i) => Math.round(v + (pb[i] - v) * k)).join(',')})`; }
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
function star(x, y, s) {
  ctx.beginPath();
  for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, r = i % 2 ? s * .35 : s; ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); }
  ctx.closePath(); ctx.fill();
}
function outlinedText(text, x, y, font, fill = '#fff', line = 6) {
  ctx.font = font; ctx.lineJoin = 'round';
  ctx.strokeStyle = INK; ctx.lineWidth = line; ctx.strokeText(text, x, y);
  ctx.fillStyle = fill; ctx.fillText(text, x, y);
}

/* ---------- 하늘색 ---------- */
const SKY = [
  [0, '#7ec8ff', '#d6f1ff'], [120, '#5aaef5', '#c4e8ff'], [300, '#4a78d8', '#ffc59a'], [450, '#3a3f9a', '#ff8f8f'],
  [600, '#1d1a5a', '#6b3f8f'], [800, '#0d0b30', '#2a1d5a'], [1100, '#07061a', '#141030'], [1600, '#0a0618', '#1e0f3a'],
  [2000, '#12062a', '#3a0f4a'], [2600, '#040818', '#0f1f3f'], [3200, '#000000', '#1f0a06'], [3600, '#060414', '#101030'],
];
const DEEP = [['#060414', '#101030'], ['#04101a', '#0f2f3a'], ['#140808', '#3a1010'], ['#0a1408', '#1a3a20'], ['#100818', '#38103a'], ['#06061e', '#1a1a4a']];
function skyAt(a) {
  if (a >= 3600) {
    const t = (a - 3600) / 400, i = Math.floor(t), k = t - i;
    const p = DEEP[i % DEEP.length], q = DEEP[(i + 1) % DEEP.length];
    return [lerpColor(p[0], q[0], k), lerpColor(p[1], q[1], k)];
  }
  let i = 0;
  while (i < SKY.length - 2 && a >= SKY[i + 1][0]) i++;
  const [a0, t0, b0] = SKY[i], [a1, t1, b1] = SKY[i + 1];
  const k = clamp((a - a0) / (a1 - a0));
  return [lerpColor(t0, t1, k), lerpColor(b0, b1, k)];
}

/* ---------- 별 ---------- */
const STARS = Array.from({ length: 150 }, () => ({
  x: Math.random() * W, y: Math.random() * H * 2, big: Math.random() < .15, p: Math.random() * 6,
  c: ['#ffffff', '#fff6c8', '#bfefff', '#ffc8f0'][Math.floor(Math.random() * 4)],
}));
function drawStars(a, now) {
  const k = clamp((a - 420) / 280);
  if (k <= 0) return;
  const off = a * RISE * 0.05;
  for (const s of STARS) {
    const y = ((s.y + off) % (H * 2) + H * 2) % (H * 2);
    if (y > H) continue;
    ctx.globalAlpha = k * (.45 + .55 * Math.abs(Math.sin(now / 700 + s.p)));
    const z = s.big ? 4 : 2;
    ctx.fillStyle = s.c; ctx.fillRect(Math.round(s.x), Math.round(y), z, z);
    if (s.big && Math.sin(now / 500 + s.p) > .6) { ctx.fillRect(Math.round(s.x) - 3, Math.round(y) + 1, 10, 2); ctx.fillRect(Math.round(s.x) + 1, Math.round(y) - 3, 2, 10); }
  }
  ctx.globalAlpha = 1;
  for (const m of meteors) {
    const fade = 1 - m.t / 1.4;
    for (let i = 0; i < 10; i++) {
      ctx.globalAlpha = fade * (1 - i / 10);
      ctx.fillStyle = i < 2 ? '#fff' : '#bfefff';
      ctx.fillRect(Math.round(m.x - m.vx * i * 0.012), Math.round(m.y - m.vy * i * 0.012), 4, 4);
    }
  }
  ctx.globalAlpha = 1;
}

/* ---------- 하늘에 떠 있는 것들 ----------
   30계단마다 한 묶음씩, 그 높이에 어울리는 것을 무작위로 만든다(판마다 다르게). 랜드마크는 정해진 높이에 하나씩 */
const CH = 30;
const LANDMARKS = [
  { type: 'moon', A: 1000, p: .3, x: .72, r: 96 },
  { type: 'earth', A: 1240, p: .16, x: .26, r: 128 },
  { type: 'station', A: 1380, p: .55, x: .7 },
  { type: 'mars', A: 1660, p: .3, x: .76, r: 56 },
  { type: 'saturn', A: 1860, p: .28, x: .26, r: 60 },
  { type: 'jupiter', A: 2160, p: .2, x: .72, r: 104 },
  { type: 'galaxy', A: 2750, p: .14, x: .3, r: 120 },
  { type: 'blackhole', A: 3320, p: .22, x: .5, r: 56 },
];
// 배경 천체 · 구름이 화면 움직임을 따라가는 정도(작을수록 느긋하게 움직여 멀미가 덜하다)
const VP = .45;
function makeChunk(c) {
  const r = rng(runSeed * 31 + c * 104729), list = [], A0 = c * CH, mid = A0 + CH / 2;
  const add = (type, o = {}) => {
    const p = o.p ?? (.3 + r() * .5);
    list.push({ type, A: A0 + r() * CH, p, wx: r() * (W + 160) - 80 + cam.x * p * VP, s: .7 + r() * .7, h: r(), ...o });
  };
  for (const L of LANDMARKS) if (L.A >= A0 && L.A < A0 + CH) list.push({ ...L, lm: true, wx: L.x * W + cam.x * L.p * VP, s: 1, h: .5 });
  const cloudN = mid < 40 ? 1 : mid < 600 ? 3 + Math.floor(r() * 3) : mid < 900 ? Math.floor(r() * 2) : 0;
  for (let i = 0; i < cloudN; i++) add('cloud');
  if (mid > 20 && mid < 280 && r() < .6) add('birds', { p: .7 });
  if (mid > 200 && mid < 500 && r() < .35) add('balloon', { hue: r() * 360 });
  if (mid > 150 && mid < 580 && r() < .3) add('plane', { p: .6, dir: r() < .5 ? -1 : 1 });
  if (mid > 760 && mid < 1900 && r() < .45) add('satellite');
  if (mid > 1150) for (let i = 0, n = Math.floor(r() * 3); i < n; i++) add('asteroid', { r: 8 + r() * 14 });
  if (mid > 1300 && r() < .2) add('ufo', { p: .7 });
  if (mid > 1550 && r() < .4) add('planet', { p: .15 + r() * .2, r: 16 + r() * 40, hue: r() * 360, ring: r() < .35, bands: 2 + Math.floor(r() * 4) });
  if ((mid > 1950 && mid < 2700) || mid > 3400) for (let i = 0, n = 1 + Math.floor(r() * 2); i < n; i++) add('nebula', { p: .1 + r() * .08, r: 90 + r() * 90, hue: r() * 360 });
  if (mid > 2500 && r() < .3) add('galaxy', { p: .12, r: 40 + r() * 50 });
  if (mid > 2300 && r() < .3) add('comet', { p: .5 });
  return list;
}
function visibleObjects(a) {
  const c0 = Math.floor((a - 420) / CH), c1 = Math.floor((a + 520) / CH), out = [];
  for (const k of chunks.keys()) if (k < c0 - 2) chunks.delete(k);
  for (let c = Math.max(0, c0); c <= c1; c++) {
    if (!chunks.has(c)) chunks.set(c, makeChunk(c));
    for (const o of chunks.get(c)) {
      const y = PLAYER_Y - (o.A - a) * RISE * o.p * VP, x = o.wx - cam.x * o.p * VP, m = (o.r || 60) * 2.2;
      if (y > -m && y < H + m && x > -m - 80 && x < W + m + 80) out.push({ o, x, y });
    }
  }
  // 랜드마크(달 · 지구 · 블랙홀 등)는 무작위 천체에 가리지 않게 맨 나중에
  return out.sort((p, q) => (p.o.lm ? 1 : 0) - (q.o.lm ? 1 : 0) || p.o.p - q.o.p);
}

function cloud(x, y, s, a) {
  const tint = a < 330 ? ['#ffffff', '#cfe6ff'] : a < 620 ? ['#ffe3ec', '#f2a7b8'] : ['#8a86b8', '#5a5690'];
  ctx.globalAlpha = a < 620 ? .95 : clamp(1 - (a - 620) / 300) * .7;
  const w = 72 * s;
  px(x, y, w, 12 * s, tint[0]);
  px(x + 8 * s, y - 8 * s, w - 24 * s, 8 * s, tint[0]);
  px(x + 20 * s, y - 16 * s, 24 * s, 8 * s, tint[0]);
  px(x + 4 * s, y + 12 * s - 4, w - 8 * s, 4, tint[1]);
  ctx.globalAlpha = 1;
}
function planetBody(cx, cy, r, c1, c2, bands = 0, shade = true) {
  cx = snap(cx); cy = snap(cy);
  for (let dy = -r; dy < r; dy += P) {
    const hw = sz(Math.sqrt(Math.max(0, r * r - (dy + P / 2) ** 2)));
    if (!hw) continue;
    ctx.fillStyle = bands && Math.floor((dy + r) / (r * 2 / (bands * 2 + 1))) % 2 ? c2 : c1;
    ctx.fillRect(cx - hw, snap(cy + dy), hw * 2, P);
    if (shade) {
      ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fillRect(cx + sz(hw * .3), snap(cy + dy), hw - sz(hw * .3), P);
      ctx.fillStyle = 'rgba(255,255,255,.16)'; ctx.fillRect(cx - hw, snap(cy + dy), Math.max(P, sz(hw * .3)), P);
    }
  }
}
function glow(x, y, r, color) {
  const g = ctx.createRadialGradient(x, y, r * .6, x, y, r * 1.8);
  g.addColorStop(0, color); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g; ctx.fillRect(x - r * 2, y - r * 2, r * 4, r * 4);
}
function ring(cx, cy, R, color, front) {
  ctx.fillStyle = color;
  for (let t = 0; t < Math.PI * 2; t += .05) {
    const s = Math.sin(t);
    if ((s > 0) !== front) continue;
    for (const k of [1, 1.12, 1.24]) ctx.fillRect(snap(cx + Math.cos(t) * R * k), snap(cy + s * R * k * .28), P, P);
  }
}
function drawObject({ o, x, y }, a, now) {
  const s = o.s;
  switch (o.type) {
    case 'cloud': cloud(x, y, s, a); break;
    case 'birds':
      for (let i = 0; i < 3; i++) {
        const bx = x + i * 22 + Math.sin(now / 900 + i) * 6, by = y + (i % 2) * 12, f = Math.sin(now / 120 + i * 2) > 0 ? -4 : 0;
        px(bx, by, 4, 4, '#2a2a4a'); px(bx - 8, by + f, 8, 4, '#2a2a4a'); px(bx + 4, by + f, 8, 4, '#2a2a4a');
      }
      break;
    case 'balloon': {
      const by = y + Math.sin(now / 900 + o.h * 6) * 6;
      planetBody(x, by, 28, `hsl(${o.hue},80%,62%)`, '#fff3c8', 3);
      px(x - 8, by + 34, 2, 14, '#5a3a20'); px(x + 6, by + 34, 2, 14, '#5a3a20');
      px(x - 10, by + 46, 20, 12, '#a0622e'); px(x - 10, by + 46, 20, 4, '#c98a4a');
      break;
    }
    case 'plane': {
      const span = W + 240, px0 = ((x + o.dir * now * 0.05) % span + span) % span - 120;
      ctx.save(); ctx.translate(snap(px0), snap(y)); ctx.scale(o.dir, 1);
      px(-24, 0, 48, 8, '#f4f4fa'); px(16, 0, 8, 4, '#9ac8ff'); px(-28, -12, 8, 12, '#ff6b6b');
      px(-4, 4, 16, 8, '#c8c8d8'); px(-12, 4, 4, 4, '#9ac8ff'); px(-4, 0, 4, 4, '#9ac8ff');
      ctx.restore();
      break;
    }
    case 'satellite': {
      const sy = y + Math.sin(now / 1300 + o.h * 6) * 4;
      px(x - 8, sy - 8, 16, 16, '#c9cbd8'); px(x - 8, sy - 8, 16, 4, '#eef0f8');
      px(x - 36, sy - 4, 24, 8, '#3a6bd8'); px(x + 12, sy - 4, 24, 8, '#3a6bd8');
      px(x - 32, sy - 4, 4, 8, '#7aa6ff'); px(x + 24, sy - 4, 4, 8, '#7aa6ff');
      px(x - 2, sy - 16, 4, 8, '#c9cbd8');
      if (Math.sin(now / 300 + o.h * 9) > .4) px(x - 2, sy - 20, 4, 4, '#ff5c7a');
      break;
    }
    case 'asteroid': {
      const r = o.r, ax = x + Math.sin(now / 2000 + o.h * 9) * 8;
      planetBody(ax, y, r, '#8a8070', '#8a8070');
      px(ax - r * .4, y - r * .3, 4, 4, '#5e564a'); px(ax + r * .1, y + r * .2, 8, 4, '#5e564a');
      break;
    }
    case 'ufo': {
      const uy = y + Math.sin(now / 400) * 6, ux = x + Math.sin(now / 1500 + o.h * 5) * 30;
      planetBody(ux, uy - 8, 12, '#9ff0ff', '#9ff0ff', 0, false);
      px(ux - 28, uy, 56, 8, '#c9cbd8'); px(ux - 20, uy + 8, 40, 4, '#8a8ca0');
      for (let i = 0; i < 4; i++) px(ux - 22 + i * 14, uy + 2, 4, 4, Math.floor(now / 200 + i) % 2 ? '#ffd84d' : '#ff5c7a');
      break;
    }
    case 'moon':
      glow(x, y, o.r, 'rgba(255,250,220,.25)');
      planetBody(x, y, o.r, '#e6e4d8', '#e6e4d8');
      for (const [dx, dy, cr] of [[-.4, -.3, .18], [.25, .35, .14], [-.1, .45, .1], [.35, -.35, .12], [-.5, .2, .08]]) planetBody(x + dx * o.r, y + dy * o.r, o.r * cr, '#bdbaa8', '#bdbaa8', 0, false);
      break;
    case 'earth': {
      glow(x, y, o.r, 'rgba(120,190,255,.25)');
      planetBody(x, y, o.r, '#2f6fd0', '#2f6fd0');
      const r = rng(7);
      for (let i = 0; i < 9; i++) planetBody(x + (r() - .6) * o.r * 1.1, y + (r() - .5) * o.r * 1.2, o.r * (.12 + r() * .16), '#4fb36a', '#4fb36a', 0, false);
      for (let i = 0; i < 6; i++) px(x + (r() - .7) * o.r * 1.2, y + (r() - .5) * o.r * 1.4, 24 + r() * 30, 4, 'rgba(255,255,255,.75)');
      planetBody(x, y, o.r, 'rgba(0,0,0,0)', 'rgba(0,0,0,0)');   // 그늘만 다시 덮는다
      break;
    }
    case 'station': {
      const sy = y + Math.sin(now / 1500) * 4;
      px(x - 70, sy - 3, 140, 6, '#9a9cb0');
      for (const dx of [-70, -46, 30, 54]) { px(x + dx, sy - 22, 16, 18, '#3a6bd8'); px(x + dx, sy + 4, 16, 18, '#3a6bd8'); px(x + dx + 6, sy - 22, 4, 44, '#7aa6ff'); }
      px(x - 18, sy - 12, 36, 24, '#e6e8f2'); px(x - 18, sy - 12, 36, 4, '#ffffff'); px(x - 10, sy - 4, 4, 4, '#ffd84d'); px(x + 4, sy - 4, 4, 4, '#ffd84d');
      if (Math.floor(now / 500) % 2) px(x - 2, sy - 20, 4, 4, '#ff5c7a');
      break;
    }
    case 'mars': glow(x, y, o.r, 'rgba(255,120,80,.2)'); planetBody(x, y, o.r, '#d0603a', '#b84c2a', 3); break;
    case 'saturn':
      ring(x, y, o.r * 1.6, '#c9b07a', false);
      planetBody(x, y, o.r, '#e8c87a', '#d4a85a', 3);
      ring(x, y, o.r * 1.6, '#e8d4a0', true);
      break;
    case 'jupiter':
      planetBody(x, y, o.r, '#d9a877', '#b97a52', 5);
      planetBody(x + o.r * .3, y + o.r * .35, o.r * .16, '#c0503a', '#c0503a', 0, false);
      break;
    case 'planet':
      if (o.ring) ring(x, y, o.r * 1.6, `hsl(${o.hue + 40},50%,70%)`, false);
      planetBody(x, y, o.r, `hsl(${o.hue},60%,55%)`, `hsl(${o.hue + 20},55%,42%)`, o.bands);
      if (o.ring) ring(x, y, o.r * 1.6, `hsl(${o.hue + 40},60%,80%)`, true);
      break;
    case 'nebula': {
      const g = ctx.createRadialGradient(x, y, 0, x, y, o.r);
      g.addColorStop(0, `hsla(${o.hue},90%,65%,.35)`); g.addColorStop(.6, `hsla(${o.hue + 40},90%,55%,.14)`); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.fillRect(x - o.r, y - o.r, o.r * 2, o.r * 2);
      break;
    }
    case 'galaxy': {
      const turn = now / 8000;
      for (let i = 0; i < 140; i++) {
        const arm = i % 2, k = Math.floor(i / 2) / 70, ang = arm * Math.PI + k * 5 + turn;
        ctx.globalAlpha = 1 - k * .8;
        px(x + Math.cos(ang) * k * o.r, y + Math.sin(ang) * k * o.r * .45, 4, 4, k < .2 ? '#fff6c8' : arm ? '#c8a0ff' : '#9fd8ff');
      }
      ctx.globalAlpha = 1;
      break;
    }
    case 'comet': {
      const cx = x + ((now / 20) % 400) - 200, cy = y + (((now / 20) % 400) - 200) * .3;
      for (let i = 12; i > 0; i--) { ctx.globalAlpha = 1 - i / 13; px(cx - i * 8, cy - i * 2.4, 8, 4, '#9fe8ff'); }
      ctx.globalAlpha = 1; px(cx, cy - 4, 8, 8, '#ffffff');
      break;
    }
    case 'blackhole': {
      const t = now / 600;
      glow(x, y, o.r * 1.3, 'rgba(255,140,40,.25)');
      ring(x, y, o.r * 1.5, '#ff8a2a', false);
      planetBody(x, y, o.r, '#000000', '#000000', 0, false);
      for (let i = 0; i < 40; i++) { const a2 = i / 40 * Math.PI * 2 + t; px(x + Math.cos(a2) * (o.r + 6), y + Math.sin(a2) * (o.r + 6), 4, 4, i % 3 ? '#ffb84d' : '#fff3c8'); }
      ring(x, y, o.r * 1.5, '#ffd84d', true);
      break;
    }
  }
}

/* ---------- 지상 ---------- */
function drawGround(a) {
  // 먼 언덕 두 겹 (느리게 내려간다)
  for (const [p, color, base] of [[.2, '#8fd0a6', 10], [.35, '#5fae6e', 40]]) {
    const hy = PLAYER_Y + base + a * RISE * p;
    if (hy - 80 > H) continue;
    for (let x = 0; x < W; x += 8) {
      const wx = x + cam.x * p;
      const h = 44 + 26 * Math.sin(wx / 90 + p * 10) + 16 * Math.sin(wx / 37);
      px(x, hy - h, 8, H, color);
    }
  }
  const gy = PLAYER_Y + a * RISE + 12 + STEP_H + 10;
  if (gy > H + 80) return;
  const ox = W / 2 - cam.x;
  px(0, gy, W, H, '#8a5a3a');
  px(0, gy, W, 16, '#5fbf4a'); px(0, gy, W, 4, '#8fe070');
  for (let x = 0; x < W; x += 24) px(x + ((x * 7) % 12), gy + 28 + ((x * 13) % 20), 8, 4, '#6e4630');
  // 나무 · 꽃 (땅에 붙어 있다)
  const k0 = Math.floor((-ox - 80) / 40), k1 = Math.ceil((W - ox + 80) / 40);
  for (let k = k0; k <= k1; k++) {
    const r = rng(k * 7907 + 13), wx = k * 40 + r() * 20, sx = ox + wx;
    if (Math.abs(wx) < 50) continue;                       // 첫 계단 주변은 비워 둔다
    if (k % 4 === 0) {                                     // 나무
      const th = 40 + r() * 30;
      px(sx - 4, gy - th, 8, th, '#7a4a2a');
      const cc = ['#3f9a4a', '#4fb35a', '#7ad070'];
      px(sx - 24, gy - th - 20, 48, 24, cc[0]); px(sx - 16, gy - th - 36, 32, 16, cc[1]); px(sx - 8, gy - th - 44, 16, 8, cc[1]);
      px(sx - 12, gy - th - 32, 8, 8, cc[2]); px(sx + 8, gy - th - 16, 8, 4, cc[2]);
      if (r() < .5) px(sx + 4, gy - th - 12, 4, 4, '#ff5c7a');   // 사과
    } else {                                               // 꽃
      const fc = ['#ff6b8b', '#ffd84d', '#ffffff', '#c89cff'][Math.floor(r() * 4)];
      px(sx, gy - 12, 4, 12, '#3f9a4a');
      px(sx - 4, gy - 20, 12, 4, fc); px(sx, gy - 24, 4, 12, fc); px(sx, gy - 20, 4, 4, '#ffb000');
    }
  }
}

function drawBg(now) {
  const a = Math.max(0, alt());
  const [top, bottom] = skyAt(a);
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, top); g.addColorStop(1, bottom);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // 낮에는 해
  if (a < 420) {
    const sy = 120 + a * RISE * .08;
    ctx.globalAlpha = clamp(1 - (a - 300) / 120);
    planetBody(390, sy, 28, a < 300 ? '#fff2a0' : '#ffb070', '#fff2a0', 0, false);
    ctx.globalAlpha = 1;
  }
  drawStars(a, now);
  for (const v of visibleObjects(a)) drawObject(v, a, now);
  drawGround(a);
}

/* ---------- 계단 · 병아리 ---------- */
function stepPal(i) {
  if (i < 60) return ['#a0683e', '#5fbf4a', '#6e4630', '#8fe070'];          // 흙 벽돌 + 잔디
  if (i < 350) return ['#d4e6fb', '#ffffff', '#8aaad6', '#ffffff'];         // 구름 블록
  if (i < 600) return ['#ff9e6e', '#ffd2a0', '#c9603a', '#fff0d8'];         // 노을 블록
  if (i < 1200) return ['#4a40a8', '#7d74f0', '#26205e', '#b0a8ff'];        // 밤하늘 블록
  if (i < 2000) return ['#6b7390', '#aab3d0', '#3a4060', '#e8ecff'];        // 우주 금속판
  if (i < 3200) return ['#7a3fa0', '#c88cff', '#3f1f5a', '#f0d8ff'];        // 성운 크리스탈
  const h = (i * .3) % 360;
  return [`hsl(${h},45%,40%)`, `hsl(${h},70%,70%)`, `hsl(${h},50%,22%)`, `hsl(${h},90%,88%)`];
}
function drawStep(i, x, y, now) {
  const [body, top, shade, shine] = stepPal(i);
  x = snap(x); y = snap(y);
  px(x + 4, y + 8, STEP_W, STEP_H, 'rgba(0,0,0,.22)');
  px(x, y, STEP_W, STEP_H, body);
  px(x, y, STEP_W, 8, top);
  px(x + 4, y, STEP_W - 16, 4, shine);
  px(x, y + STEP_H - 4, STEP_W, 4, shade);
  if (i >= 1200 && i < 2000) { px(x + 4, y + 12, 4, 4, shade); px(x + STEP_W - 8, y + 12, 4, 4, shade); }   // 리벳
  if (i <= idx) { ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.fillRect(x, y, STEP_W, STEP_H); }
  if (i % 100 === 0 && i > 0) {
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    outlinedText(`${i}층`, x + STEP_W / 2, y + STEP_H + 14, `bold 13px ${FONT}`, '#ffd84d', 4);
  }
}
function drawChick(x, y, now) {
  const hopK = Math.max(0, 1 - (now - hopAt) / 160);
  const squash = state === 'play' ? 1 + hopK * .12 : 1;
  const dizzy = state === 'over';
  const space = alt() > 1150;
  ctx.save(); ctx.translate(x, y + 8); ctx.scale(facing * (1 / squash), squash);
  ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.beginPath(); ctx.ellipse(0, 6, 14, 3.5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#ff9a3c'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-5, 0); ctx.lineTo(-5, 5); ctx.moveTo(5, 0); ctx.lineTo(5, 5); ctx.stroke();
  // 우주에서는 산소통
  if (space) { ctx.fillStyle = '#c9cbd8'; ctx.fillRect(-22, -24, 8, 18); ctx.fillStyle = '#ff5c7a'; ctx.fillRect(-22, -24, 8, 4); }
  ctx.fillStyle = dizzy ? '#ffd5a8' : '#ffe066';
  ctx.beginPath(); ctx.ellipse(0, -14, 16, 15, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(-2, -30, 3, 6, -0.4, 0, Math.PI * 2); ctx.ellipse(3, -30, 2.5, 5, 0.4, 0, Math.PI * 2); ctx.fill();
  const flap = Math.sin(now / 70) * (state === 'play' && hopK > 0 ? .5 : .1);
  ctx.fillStyle = '#ffd23f';
  ctx.save(); ctx.translate(-12, -12); ctx.rotate(-0.4 - flap); ctx.beginPath(); ctx.ellipse(0, 0, 5, 8, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  ctx.fillStyle = 'rgba(255,120,150,.5)'; ctx.beginPath(); ctx.arc(10, -10, 3.2, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#5b4466'; ctx.strokeStyle = '#5b4466'; ctx.lineWidth = 1.6;
  if (dizzy) {
    ctx.beginPath(); ctx.moveTo(3, -20); ctx.lineTo(8, -15); ctx.moveTo(8, -20); ctx.lineTo(3, -15); ctx.stroke();
  } else {
    ctx.beginPath(); ctx.arc(6, -17, 2.6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(6.8, -18, 1, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = '#ff9a3c';
  ctx.beginPath(); ctx.moveTo(13, -15); ctx.lineTo(20, -12.5); ctx.lineTo(13, -10); ctx.closePath(); ctx.fill();
  // 우주 헬멧
  if (space) {
    ctx.fillStyle = 'rgba(190,240,255,.16)'; ctx.strokeStyle = 'rgba(200,245,255,.9)'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(1, -18, 24, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.fillRect(-12, -34, 6, 4); ctx.fillRect(-15, -29, 4, 4);
  }
  ctx.restore();
  if (dizzy) {
    ctx.fillStyle = '#fff3a0';
    const a = now / 160;
    for (let i = 0; i < 3; i++) star(x + Math.cos(a + i * 2.1) * 20, y - 34 + Math.sin(a + i * 2.1) * 5, 5);
  }
}

function draw(now) {
  drawBg(now);
  if (state === 'ready') return;
  const ox = W / 2 - cam.x, oy = PLAYER_Y - cam.y;
  for (let i = Math.max(0, idx - 10); i < idx + 16 && i < cols.length; i++) {
    const x = ox + cols[i] * SHIFT - STEP_W / 2, y = oy - i * RISE + 12;
    if (y < -30 || y > H + 30) continue;
    drawStep(i, x, y, now);
  }
  drawChick(ox + pos.x, oy + pos.y + fallY, now);

  // 시간 막대 (레트로)
  const bw = W - 60, bx = 30, by = 18;
  px(bx - 4, by - 4, bw + 8, 20, INK);
  px(bx, by, bw, 12, '#3a3466');
  const gc = gauge > 35 ? '#4fe0a0' : gauge > 15 ? '#ffd84d' : '#ff5c7a';
  if (gauge > 1) { px(bx, by, bw * gauge / 100, 12, gc); px(bx, by, bw * gauge / 100, 4, 'rgba(255,255,255,.45)'); }
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  outlinedText(idx, W / 2, 44, `bold 44px ${FONT}`, '#fff', 8);
  if (idx === 0 && state === 'play') {
    outlinedText('다음 계단 방향을 누르세요', W / 2, 104, `bold 15px ${FONT}`, '#fff', 5);
  }
  // 새 구역 안내
  if (banner) {
    const t = (now - banner.at) / 2200;
    if (t >= 1) banner = null;
    else {
      ctx.globalAlpha = t < .1 ? t / .1 : t > .8 ? (1 - t) / .2 : 1;
      ctx.font = `bold 18px ${FONT}`;
      const tw = ctx.measureText(banner.text).width + 40;
      px(W / 2 - tw / 2, 102, tw, 36, INK);
      px(W / 2 - tw / 2 + 4, 106, tw - 8, 28, '#2a2266');
      ctx.textBaseline = 'middle'; ctx.fillStyle = '#ffd84d'; ctx.fillText(banner.text, W / 2, 121);
      ctx.globalAlpha = 1;
    }
  }
}

function frame(now) { update(now); draw(now); requestAnimationFrame(frame); }

document.addEventListener('keydown', e => {
  if (e.repeat || document.querySelector('.overlay')) return;
  if (e.code === 'ArrowLeft' || e.code === 'KeyA') { e.preventDefault(); step(-1); }
  else if (e.code === 'ArrowRight' || e.code === 'KeyD') { e.preventDefault(); step(1); }
  else if (e.code === 'Space') { e.preventDefault(); if (state === 'ready') start(); }
});
// 마우스 클릭 · 손가락 탭 모두: 화면 왼쪽 절반이면 왼쪽, 오른쪽 절반이면 오른쪽
cv.addEventListener('pointerdown', e => {
  if (state !== 'play' || (e.pointerType === 'mouse' && e.button !== 0)) return;
  e.preventDefault();
  step(canvasPoint(cv, W, e).x < W / 2 ? -1 : 1);
});
veil.addEventListener('click', start);
last = performance.now();
cols = [0]; idx = 0; gauge = 100;
requestAnimationFrame(frame);
