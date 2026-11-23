import { initGamePage, showResult, setupCanvas } from './common.js?v=53';

initGamePage('swing');

const W = 480, H = 560;
const cv = document.getElementById('cv');
const ctx = setupCanvas(cv, W, H);
const veil = document.getElementById('veil');
const FONT = 'Galmuri11, Pretendard, sans-serif';
const INK = '#120d24';

const G = 1500;            // 중력
const REACH = 330;         // 줄이 닿는 거리
const REEL = 110;          // 누르고 있으면 줄을 이만큼씩 감는다(빨라진다)
const PUSH = 170;          // 매달린 동안 흔들리는 방향으로 살짝 밀어 준다
const VMAX = 950;
const START_X = 90;
const ACORN_M = 10;        // 도토리 하나 = 10m

/* ---------- 다람쥐 그림 (12×11 픽셀) ---------- */
const SQ_MAP = [
  '.TT.........',
  'TTTT..e.e...',
  'TTtT.eeeee..',
  'TTtT.ewwkw..',
  '.TTt.eeeeen.',
  '..TTbbbeee..',
  '...Tbccbb...',
  '....bccbb...',
  '....bbbbb...',
  '....f..f....',
  '...ff.ff....',
];
const SQ_COL = { T: '#c8692a', t: '#f0a050', e: '#e08a3a', w: '#ffffff', k: '#1a1020', n: '#3a1a10', b: '#c8692a', c: '#ffe0b0', f: '#8a4a1a' };
const SPX = 3;

let state = 'ready';   // ready → play → over → done
let p, rope, anchors, acorns, cam, maxX, got, holding = false, overAt = 0, pops = [], sparks = [], nextAX = 0;
const rnd = (a, b) => a + Math.random() * (b - a);

/* ---------- 고리 · 도토리 만들기 ---------- */
function addAnchor() {
  const d = Math.max(0, nextAX - START_X) / 10;      // 지금까지 온 거리(m)
  const gap = rnd(150, 210) + Math.min(90, d * 0.04);
  const last = anchors[anchors.length - 1];
  const x = last ? last.x + gap : 260;
  const y = last ? Math.max(60, Math.min(250, last.y + rnd(-90, 90))) : 140;
  anchors.push({ x, y });
  // 고리와 고리 사이, 흔들리는 길목에 도토리
  if (last && Math.random() < .8) {
    const n = 1 + Math.floor(Math.random() * 3), mx = (last.x + x) / 2, my = Math.min(430, (last.y + y) / 2 + rnd(110, 200));
    for (let i = 0; i < n; i++) acorns.push({ x: mx + (i - (n - 1) / 2) * 28, y: my - Math.abs(i - (n - 1) / 2) * 12, got: false });
  }
  nextAX = x;
}
function start() {
  anchors = []; acorns = []; nextAX = START_X; pops = []; sparks = [];
  while (anchors.length < 8) addAnchor();
  p = { x: START_X, y: 330, vx: 430, vy: -520 };
  rope = null; cam = 0; maxX = START_X; got = 0;
  state = 'play'; veil.hidden = true;
}
const dist = () => Math.max(0, Math.floor((maxX - START_X) / 10));
const score = () => dist() + got * ACORN_M;

/* ---------- 움직임 ---------- */
function grab() {
  // 앞쪽(조금 뒤까지 포함)에서 가장 가까운 고리에 줄을 건다
  let best = null, bd = REACH;
  for (const a of anchors) {
    if (a.x < p.x - 40) continue;
    const d = Math.hypot(a.x - p.x, a.y - p.y);
    if (d < bd && d > 30) { bd = d; best = a; }
  }
  if (best) rope = { a: best, L: bd };
}
function step(dt) {
  if (holding && !rope) grab();
  if (!holding) rope = null;
  p.vy += G * dt;
  if (rope) {
    const a = rope.a;
    rope.L = Math.max(70, rope.L - REEL * dt);
    let dx = p.x - a.x, dy = p.y - a.y, d = Math.hypot(dx, dy) || 1;
    const nx = dx / d, ny = dy / d;
    // 흔들리는 방향(접선)으로 살짝 밀기
    let tx = -ny, ty = nx;
    const vt = p.vx * tx + p.vy * ty;
    if (vt < 0) { tx = -tx; ty = -ty; }
    p.vx += tx * PUSH * dt; p.vy += ty * PUSH * dt;
    p.x += p.vx * dt; p.y += p.vy * dt;
    dx = p.x - a.x; dy = p.y - a.y; d = Math.hypot(dx, dy) || 1;
    if (d > rope.L) {
      const ux = dx / d, uy = dy / d;
      p.x = a.x + ux * rope.L; p.y = a.y + uy * rope.L;
      const vr = p.vx * ux + p.vy * uy;
      if (vr > 0) { p.vx -= ux * vr; p.vy -= uy * vr; }
    }
  } else {
    p.x += p.vx * dt; p.y += p.vy * dt;
  }
  const sp = Math.hypot(p.vx, p.vy);
  if (sp > VMAX) { p.vx *= VMAX / sp; p.vy *= VMAX / sp; }
}
function update(dt, now) {
  for (const s of sparks) { s.x += s.vx * dt; s.y += s.vy * dt; s.vy += 600 * dt; s.life -= dt; }
  sparks = sparks.filter(s => s.life > 0);
  if (state !== 'play') return;
  const n = 4;
  for (let i = 0; i < n; i++) step(dt / n);
  maxX = Math.max(maxX, p.x);
  while (nextAX < p.x + W * 1.5) addAnchor();
  anchors = anchors.filter(a => a.x > cam - 200);
  acorns = acorns.filter(c => c.x > cam - 100);
  for (const c of acorns) {
    if (!c.got && Math.hypot(c.x - p.x, c.y - p.y) < 24) {
      c.got = true; got++;
      pops.push({ s: `+${ACORN_M}m`, x: c.x, y: c.y, t: now });
      for (let i = 0; i < 8; i++) { const a = Math.random() * 6.28; sparks.push({ x: c.x, y: c.y, vx: Math.cos(a) * 140, vy: Math.sin(a) * 140 - 60, life: .5, c: '#ffd84d' }); }
    }
  }
  // 화면은 다람쥐를 왼쪽 1/3쯤에 두고 따라간다
  const target = p.x - 170;
  cam += (target - cam) * Math.min(1, dt * 5);
  if (p.y > H + 40) fall(now);
}
function fall(now) {
  state = 'over'; overAt = now; rope = null;
  setTimeout(() => {
    state = 'done';
    showResult('swing', score(), { detail: `${dist()}m 날고 도토리 ${got}개를 주웠어요`, extra: {}, onRetry: start });
  }, 1000);
}

/* ---------- 그리기 ---------- */
const STARS = Array.from({ length: 70 }, () => ({ x: Math.random() * W, y: Math.random() * 300, s: Math.random() < .2 ? 3 : 2, t: Math.random() * 6 }));
function rect(x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), w, h); }
// 멀리 있는 나무 실루엣(느리게 지나간다)
function treeLine(par, base, col, step, hgt) {
  const off = cam * par;
  const k0 = Math.floor(off / step) - 1;
  for (let k = k0; k < k0 + W / step + 3; k++) {
    const seed = Math.sin(k * 12.9898 + par * 78.233) * 43758.5453, r = seed - Math.floor(seed);
    const x = k * step - off, h = hgt * (.6 + r * .6), w = step * (.7 + r * .5);
    // 뾰족한 나무(층층이 넓어지는 픽셀 삼각형)
    for (let i = 0; i < h; i += 6) rect(x + w / 2 - (i / h) * w / 2, base - h + i, Math.max(4, Math.round((i / h) * w)), 6, col);
    rect(x + w / 2 - 3, base - 4, 6, 14, col);
  }
}
function drawSquirrel(x, y, now) {
  const flip = p && p.vx < 0 ? -1 : 1;
  ctx.save(); ctx.translate(Math.round(x), Math.round(y)); ctx.scale(flip, 1);
  const ox = -6 * SPX, oy = -6 * SPX;
  SQ_MAP.forEach((row, r) => [...row].forEach((ch, c) => {
    const col = SQ_COL[ch]; if (!col) return;
    ctx.fillStyle = col; ctx.fillRect(ox + c * SPX, oy + r * SPX, SPX, SPX);
  }));
  ctx.restore();
}
function drawAcorn(x, y, now) {
  const b = Math.sin(now / 300 + x) * 2;
  x = Math.round(x); y = Math.round(y + b);
  rect(x - 6, y - 8, 12, 5, '#7a4a20'); rect(x - 1, y - 11, 2, 3, '#5a3010');
  rect(x - 5, y - 3, 10, 7, '#e0a040'); rect(x - 3, y + 4, 6, 3, '#e0a040'); rect(x - 3, y - 2, 2, 3, '#ffe0a0');
}
function draw(now) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#1a1448'); g.addColorStop(.6, '#3a2a78'); g.addColorStop(1, '#6a3a80');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  for (const s of STARS) {
    ctx.globalAlpha = .5 + .5 * Math.abs(Math.sin(now / 900 + s.t));
    rect(((s.x - cam * .05) % W + W) % W, s.y, s.s, s.s, '#e8e4ff');
  }
  ctx.globalAlpha = 1;
  // 픽셀 달
  for (let dy = -30; dy <= 30; dy += 3) { const hw = Math.round(Math.sqrt(900 - dy * dy) / 3) * 3; rect(380 - hw, 90 + dy, hw * 2, 3, '#fff2c0'); }
  rect(370, 80, 6, 6, '#e8d8a0'); rect(392, 100, 9, 6, '#e8d8a0');
  treeLine(.15, 470, '#2a1f5a', 60, 120);
  treeLine(.35, 500, '#1c1540', 52, 150);
  // 바닥: 깊은 숲 아래(떨어지면 끝)
  rect(0, 520, W, 40, '#120d24');
  for (let x = -((cam * .6) % 24); x < W; x += 24) rect(x, 512, 16, 8, '#120d24');

  if (!anchors) { drawSquirrel(W / 2, 300, now); return; }
  ctx.save(); ctx.translate(-Math.round(cam), 0);
  // 고리
  for (const a of anchors) {
    const near = state === 'play' && !rope && a.x > p.x - 40 && Math.hypot(a.x - p.x, a.y - p.y) < REACH;
    rect(a.x - 1, 0, 2, a.y - 10, 'rgba(255,255,255,.18)');
    const c = rope && rope.a === a ? '#ffffff' : near ? '#ffe066' : '#c8a040';
    rect(a.x - 9, a.y - 6, 18, 3, c); rect(a.x - 9, a.y + 3, 18, 3, c); rect(a.x - 9, a.y - 6, 3, 12, c); rect(a.x + 6, a.y - 6, 3, 12, c);
  }
  for (const c of acorns) if (!c.got) drawAcorn(c.x, c.y, now);
  // 줄
  if (rope && state === 'play') {
    ctx.strokeStyle = '#f4f0ff'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(Math.round(rope.a.x), Math.round(rope.a.y)); ctx.lineTo(Math.round(p.x), Math.round(p.y - 6)); ctx.stroke();
  }
  if (state === 'play' || (state === 'over' && now - overAt < 200)) drawSquirrel(p.x, p.y, now);
  for (const s of sparks) { ctx.globalAlpha = Math.min(1, s.life * 2); rect(s.x, s.y, 3, 3, s.c); }
  ctx.globalAlpha = 1;
  for (const q of pops) {
    const k = (now - q.t) / 700;
    ctx.globalAlpha = Math.max(0, 1 - k); ctx.font = `bold 14px ${FONT}`; ctx.textAlign = 'center';
    ctx.strokeStyle = INK; ctx.lineWidth = 4; ctx.strokeText(q.s, q.x, q.y - 14 - k * 24);
    ctx.fillStyle = '#ffd84d'; ctx.fillText(q.s, q.x, q.y - 14 - k * 24);
  }
  ctx.globalAlpha = 1;
  pops = pops.filter(q => now - q.t < 700);
  ctx.restore();

  // 화면 위로 날아가면 위치 표시
  if (state === 'play' && p.y < -10) {
    const x = Math.round(p.x - cam);
    rect(x - 6, 6, 12, 3, '#ffe066'); rect(x - 3, 3, 6, 3, '#ffe066'); rect(x - 1, 0, 2, 3, '#ffe066');
  }
  // CRT 줄무늬
  ctx.fillStyle = 'rgba(0,0,0,.15)';
  for (let y = 0; y < H; y += 3) ctx.fillRect(0, y, W, 1);

  // 점수판
  ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.lineJoin = 'round';
  const line = (s, x, y, size, col) => { ctx.font = `bold ${size}px ${FONT}`; ctx.strokeStyle = INK; ctx.lineWidth = 6; ctx.strokeText(s, x, y); ctx.fillStyle = col; ctx.fillText(s, x, y); };
  if (state !== 'ready') {
    line(`${score()}m`, 16, 14, 30, '#ffffff');
    line(`🌰 ${got}`, 18, 52, 16, '#ffd84d');
  }
  if (state === 'play' && dist() < 25) {
    ctx.textAlign = 'center';
    const tip = matchMedia('(pointer: coarse)').matches ? '누르고 있으면 줄을 걸고, 떼면 날아가요' : '누르고 있으면 줄을 걸고, 떼면 날아가요 (스페이스·클릭)';
    line(tip, W / 2, 96, 14, '#ffe066');
  }
  if (state === 'over') {
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    line('으악, 떨어졌다!', W / 2, H / 2, 28, '#ff6b8a');
  }
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.033, (now - last) / 1000); last = now;
  update(dt, now); draw(now);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

/* ---------- 조작: 누르고 있는 동안 줄 ---------- */
cv.addEventListener('pointerdown', e => {
  if (e.pointerType !== 'touch' && e.button !== 0) return;
  e.preventDefault();
  if (state !== 'play') return;
  cv.setPointerCapture?.(e.pointerId);
  holding = true;
});
const up = () => { holding = false; };
cv.addEventListener('pointerup', up);
cv.addEventListener('pointercancel', up);
document.addEventListener('keydown', e => {
  if (document.querySelector('.overlay')) return;
  if (e.code !== 'Space') return;
  e.preventDefault();
  if (state === 'ready' && !e.repeat) { start(); return; }
  if (state === 'play') holding = true;
});
document.addEventListener('keyup', e => { if (e.code === 'Space') holding = false; });
window.addEventListener('blur', up);
veil.addEventListener('click', () => { holding = false; start(); });
