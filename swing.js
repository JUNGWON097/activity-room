import { initGamePage, showResult, setupCanvas } from './common.js?v=65';

initGamePage('swing');

const W = 480, H = 560;
const cv = document.getElementById('cv');
const ctx = setupCanvas(cv, W, H);
const veil = document.getElementById('veil');
const FONT = 'Galmuri11, Pretendard, sans-serif';
const INK = '#120d24';

const G = 2200;            // 중력
const REACH = 360;         // 줄이 닿는 거리
const REEL = 80;           // 누르고 있으면 줄을 이만큼씩 감는다
const VMAX = 1550;
const JUMP = 560;          // 고리가 안 닿을 때 땅에서 누르면 폴짝
const FOOT = 15;           // 다람쥐 중심에서 발끝까지
const ACORN_M = 10;        // 도토리 하나 = 10m
const scrollSpeed = t => Math.min(820, 420 + t * 5);   // 화면이 저절로 흘러가는 빠르기(점점 빨라진다)

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
const SQ_RUN = ['....f...f...', '...f...f....'];   // 달릴 때 발 모양 두 가지
const SQ_COL = { T: '#c8692a', t: '#f0a050', e: '#e08a3a', w: '#ffffff', k: '#1a1020', n: '#3a1a10', b: '#c8692a', c: '#ffe0b0', f: '#8a4a1a' };
const SPX = 3;

let state = 'ready';   // ready → play → over → done
let p, rope, anchors, acorns, grounds, cam, t, got, holding = false, wasHolding = false, overAt = 0, overWhy = '', pops = [], sparks = [], genX = 0;
const rnd = (a, b) => a + Math.random() * (b - a);

/* ---------- 땅 · 구덩이 · 고리 · 도토리 만들기 ----------
   땅(나뭇가지 다리)이 이어지다가 구덩이가 나오고, 구덩이 위에는 줄을 걸 고리가 있다. */
function addSection() {
  const d = genX / 10;                                            // 여기까지의 거리(m)
  const last = grounds[grounds.length - 1];
  const gap = last ? rnd(130, 190) + Math.min(700, d * 0.08) : 0;
  const x0 = last ? last.x1 + gap : -200;
  const len = last ? rnd(160, 420) - Math.min(120, d * 0.03) : 760;
  const y = last ? Math.max(380, Math.min(470, last.y + rnd(-50, 50))) : 440;
  if (last) {
    // 구덩이 위 고리: 넓은 구덩이엔 여러 개를 띄엄띄엄(공중에서 이어 타야 한다)
    const n = Math.max(1, Math.round(gap / 240));
    for (let k = 1; k <= n; k++) {
      const ax = last.x1 + gap * (k - .5) / n + rnd(-25, 25), ay = Math.min(last.y, y) - rnd(210, 300);
      anchors.push({ x: ax, y: ay });
      // 흔들리는 길목(고리 아래 호)에 도토리
      const L = 230;
      for (let i = -1; i <= 1; i++) if (Math.random() < .6) acorns.push({ x: ax + Math.sin(i * .45) * L, y: ay + Math.cos(i * .45) * L, got: false });
    }
  }
  grounds.push({ x0, x1: x0 + len, y });
  // 땅 위에도 가끔 도토리 줄 · 높은 곳에 걸린 보너스 도토리
  if (last && Math.random() < .5) {
    const n = 3 + Math.floor(Math.random() * 3), sx = x0 + rnd(40, Math.max(50, len - n * 26 - 20));
    for (let i = 0; i < n; i++) acorns.push({ x: sx + i * 26, y: y - FOOT - 8, got: false });
  }
  if (last && Math.random() < .35) {
    const ax = x0 + len * rnd(.3, .7);
    anchors.push({ x: ax, y: rnd(90, 150) });
    acorns.push({ x: ax + rnd(-30, 30), y: rnd(60, 100), got: false });
  }
  genX = x0 + len;
}
function start() {
  grounds = []; anchors = []; acorns = []; genX = 0; pops = []; sparks = [];
  while (genX < W * 3) addSection();
  p = { x: 120, y: 440 - FOOT, vx: 0, vy: 0, onGround: true };
  rope = null; cam = 0; t = 0; got = 0; wasHolding = holding = false;
  state = 'play'; veil.hidden = true;
}
const dist = () => Math.max(0, Math.floor(cam / 10));
const score = () => dist() + got * ACORN_M;
const groundAt = (x, m = 0) => grounds.find(g => x >= g.x0 - m && x <= g.x1 + m);

/* ---------- 움직임 ---------- */
function grab() {
  let best = null, bd = REACH;
  for (const a of anchors) {
    if (a.x < p.x - 20 || a.y > p.y - 20) continue;   // 앞쪽 위에 있는 고리만
    const d = Math.hypot(a.x - p.x, a.y - p.y);
    if (d < bd) { bd = d; best = a; }
  }
  // 줄을 걸면 와이어가 확 당겨져 몸이 끌려 올라간다
  if (best) { rope = { a: best, L: bd, T: Math.max(90, bd * .78) }; p.onGround = false; }
  return !!best;
}
function step(dt, run) {
  const press = holding && !wasHolding;
  wasHolding = holding;
  if (holding && !rope) {
    if (!grab() && press && p.onGround) { p.vy = -JUMP; p.onGround = false; }
  }
  if (!holding) rope = null;

  if (p.onGround) {
    // 달리기: 화면보다 조금 빠르게 달려서 천천히 앞으로 나간다(뒤처져 있으면 더 힘껏 따라잡는다)
    const lag = p.x - cam < W * .3 ? 170 : 50;
    p.vx += (run + lag - p.vx) * Math.min(1, dt * 6);
    p.x += p.vx * dt;
    const g = groundAt(p.x);
    if (!g) p.onGround = false;               // 땅 끝을 지나면 떨어지기 시작
    else p.y = g.y - FOOT;
    return;
  }
  p.vy += G * dt;
  if (rope) {
    const a = rope.a;
    rope.L = rope.L > rope.T ? Math.max(rope.T, rope.L - 420 * dt) : Math.max(80, rope.L - REEL * dt);
    p.x += p.vx * dt; p.y += p.vy * dt;
    const dx = p.x - a.x, dy = p.y - a.y, d = Math.hypot(dx, dy) || 1;
    if (d > rope.L) {
      const ux = dx / d, uy = dy / d;
      p.x = a.x + ux * rope.L; p.y = a.y + uy * rope.L;
      const vr = p.vx * ux + p.vy * uy;
      if (vr > 0) { p.vx -= ux * vr; p.vy -= uy * vr; }
    }
  } else {
    const prevFoot = p.y + FOOT;
    p.x += p.vx * dt; p.y += p.vy * dt;
    // 위에서 내려와 땅에 닿으면 착지
    // 땅 끝이나 옆면에 살짝 걸려도 올라선다
    const g = groundAt(p.x, 14);
    if (g && p.vy > 0 && prevFoot <= g.y + 30 && p.y + FOOT >= g.y) { p.y = g.y - FOOT; p.vy = 0; p.onGround = true; }
  }
  const sp = Math.hypot(p.vx, p.vy);
  if (sp > VMAX) { p.vx *= VMAX / sp; p.vy *= VMAX / sp; }
}
function update(dt, now) {
  for (const s of sparks) { s.x += s.vx * dt; s.y += s.vy * dt; s.vy += 600 * dt; s.life -= dt; }
  sparks = sparks.filter(s => s.life > 0);
  if (state !== 'play') return;
  t += dt;
  const run = scrollSpeed(t);
  for (let i = 0; i < 4; i++) step(dt / 4, run);
  // 화면은 저절로 흘러가고, 다람쥐가 너무 앞서면 따라간다
  cam += run * dt;
  cam = Math.max(cam, p.x - W * .62);
  while (genX < cam + W * 2) addSection();
  grounds = grounds.filter(g => g.x1 > cam - 100);
  anchors = anchors.filter(a => a.x > cam - 200);
  acorns = acorns.filter(c => c.x > cam - 100);
  for (const c of acorns) {
    if (!c.got && Math.hypot(c.x - p.x, c.y - p.y) < 24) {
      c.got = true; got++;
      pops.push({ s: `+${ACORN_M}m`, x: c.x, y: c.y, t: now });
      for (let i = 0; i < 8; i++) { const a = Math.random() * 6.28; sparks.push({ x: c.x, y: c.y, vx: Math.cos(a) * 140, vy: Math.sin(a) * 140 - 60, life: .5, c: '#ffd84d' }); }
    }
  }
  if (p.y > H + 40) over(now, 'fall');
  else if (p.x < cam - 30) over(now, 'left');
}
function over(now, why) {
  state = 'over'; overAt = now; overWhy = why; rope = null;
  setTimeout(() => {
    state = 'done';
    showResult('swing', score(), { detail: `${dist()}m 달리고 도토리 ${got}개를 주웠어요`, extra: {}, onRetry: start });
  }, 1000);
}

/* ---------- 그리기 ---------- */
const STARS = Array.from({ length: 70 }, () => ({ x: Math.random() * W, y: Math.random() * 300, s: Math.random() < .2 ? 3 : 2, t: Math.random() * 6 }));
function rect(x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); }
function treeLine(par, base, col, step, hgt) {
  const off = cam * par;
  const k0 = Math.floor(off / step) - 1;
  for (let k = k0; k < k0 + W / step + 3; k++) {
    const seed = Math.sin(k * 12.9898 + par * 78.233) * 43758.5453, r = seed - Math.floor(seed);
    const x = k * step - off, h = hgt * (.6 + r * .6), w = step * (.7 + r * .5);
    for (let i = 0; i < h; i += 6) rect(x + w / 2 - (i / h) * w / 2, base - h + i, Math.max(4, Math.round((i / h) * w)), 6, col);
    rect(x + w / 2 - 3, base - 4, 6, 14, col);
  }
}
function drawSquirrel(x, y, now, running) {
  ctx.save(); ctx.translate(Math.round(x), Math.round(y + (running && Math.floor(now / 90) % 2 ? -2 : 0)));
  const ox = -6 * SPX, oy = -6 * SPX;
  SQ_MAP.forEach((row, r) => {
    if (running && r === 9) row = SQ_RUN[Math.floor(now / 90) % 2];
    if (running && r === 10) return;
    [...row].forEach((ch, c) => {
      const col = SQ_COL[ch]; if (!col) return;
      ctx.fillStyle = col; ctx.fillRect(ox + c * SPX, oy + r * SPX, SPX, SPX);
    });
  });
  ctx.restore();
}
function drawAcorn(x, y, now) {
  const b = Math.sin(now / 300 + x) * 2;
  x = Math.round(x); y = Math.round(y + b);
  rect(x - 6, y - 8, 12, 5, '#7a4a20'); rect(x - 1, y - 11, 2, 3, '#5a3010');
  rect(x - 5, y - 3, 10, 7, '#e0a040'); rect(x - 3, y + 4, 6, 3, '#e0a040'); rect(x - 3, y - 2, 2, 3, '#ffe0a0');
}
function drawGround(g) {
  const x = g.x0, w = g.x1 - g.x0;
  rect(x, g.y, w, H - g.y, '#3a2418');                 // 나무 기둥 쪽 어두운 흙
  rect(x, g.y, w, 10, '#8a5a32'); rect(x, g.y + 10, w, 4, '#5a3a20');   // 통나무 윗면
  rect(x, g.y - 4, w, 4, '#4fae5a'); rect(x, g.y - 6, w, 2, '#7ad070');  // 이끼
  for (let k = Math.ceil(x / 36) * 36; k < g.x1 - 6; k += 36) rect(k, g.y + 18, 4, H - g.y, '#2a1810');  // 나무결
}
function draw(now) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#1a1448'); g.addColorStop(.6, '#3a2a78'); g.addColorStop(1, '#6a3a80');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  for (const s of STARS) {
    ctx.globalAlpha = .5 + .5 * Math.abs(Math.sin(now / 900 + s.t));
    rect(((s.x - (cam || 0) * .05) % W + W) % W, s.y, s.s, s.s, '#e8e4ff');
  }
  ctx.globalAlpha = 1;
  for (let dy = -30; dy <= 30; dy += 3) { const hw = Math.round(Math.sqrt(900 - dy * dy) / 3) * 3; rect(380 - hw, 90 + dy, hw * 2, 3, '#fff2c0'); }
  rect(370, 80, 6, 6, '#e8d8a0'); rect(392, 100, 9, 6, '#e8d8a0');
  cam = cam || 0;
  treeLine(.15, 470, '#2a1f5a', 60, 120);
  treeLine(.35, 520, '#1c1540', 52, 150);

  if (!grounds) {
    rect(0, 440, W, H - 440, '#3a2418'); rect(0, 440, W, 10, '#8a5a32'); rect(0, 436, W, 4, '#4fae5a');
    drawSquirrel(W / 2, 440 - FOOT, now, true); return;
  }
  ctx.save(); ctx.translate(-Math.round(cam), 0);
  for (const gr of grounds) drawGround(gr);
  // 고리
  for (const a of anchors) {
    const near = state === 'play' && !rope && a.x > p.x - 20 && a.y < p.y - 20 && Math.hypot(a.x - p.x, a.y - p.y) < REACH;
    rect(a.x - 1, 0, 2, a.y - 10, 'rgba(255,255,255,.18)');
    const c = rope && rope.a === a ? '#ffffff' : near ? '#ffe066' : '#a08040';
    rect(a.x - 9, a.y - 6, 18, 3, c); rect(a.x - 9, a.y + 3, 18, 3, c); rect(a.x - 9, a.y - 6, 3, 12, c); rect(a.x + 6, a.y - 6, 3, 12, c);
  }
  for (const c of acorns) if (!c.got) drawAcorn(c.x, c.y, now);
  if (rope && state === 'play') {
    ctx.strokeStyle = '#f4f0ff'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(Math.round(rope.a.x), Math.round(rope.a.y)); ctx.lineTo(Math.round(p.x), Math.round(p.y - 6)); ctx.stroke();
  }
  if (state === 'play' || (state === 'over' && overWhy === 'left')) drawSquirrel(p.x, p.y, now, state === 'play' && p.onGround);
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

  // 왼쪽 끝에 밀릴 것 같으면 경고
  if (state === 'play') {
    const lag = p.x - cam;
    if (lag < 90) {
      ctx.globalAlpha = (1 - lag / 90) * (.5 + .3 * Math.sin(now / 80));
      for (let i = 0; i < 4; i++) rect(i * 6, 0, 6, H, '#ff3b5c');
      ctx.globalAlpha = 1;
    }
    if (p.y < -10) { const x = Math.round(p.x - cam); rect(x - 6, 6, 12, 3, '#ffe066'); rect(x - 3, 3, 6, 3, '#ffe066'); rect(x - 1, 0, 2, 3, '#ffe066'); }
  }
  ctx.fillStyle = 'rgba(0,0,0,.15)';
  for (let y = 0; y < H; y += 3) ctx.fillRect(0, y, W, 1);

  ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.lineJoin = 'round';
  const line = (s, x, y, size, col) => { ctx.font = `bold ${size}px ${FONT}`; ctx.strokeStyle = INK; ctx.lineWidth = 6; ctx.strokeText(s, x, y); ctx.fillStyle = col; ctx.fillText(s, x, y); };
  if (state !== 'ready') {
    line(`${score()}m`, 16, 14, 30, '#ffffff');
    line(`🌰 ${got}`, 18, 52, 16, '#ffd84d');
  }
  if (state === 'play' && t < 5) {
    ctx.textAlign = 'center';
    line('구덩이 앞에서 누르면 고리에 줄을 걸어요', W / 2, 96, 14, '#ffe066');
    line('떼면 날아가요 · 화면에 밀리면 끝!', W / 2, 118, 14, '#ffe066');
  }
  if (state === 'over') {
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    line(overWhy === 'left' ? '화면에 밀려났어요!' : '으악, 떨어졌다!', W / 2, H / 2 - 40, 28, '#ff6b8a');
  }
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.033, (now - last) / 1000); last = now;
  update(dt, now); draw(now);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

/* ---------- 조작: 누르고 있는 동안 줄(고리가 없으면 폴짝) ---------- */
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
