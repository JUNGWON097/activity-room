import { initGamePage, showResult, setupCanvas, canvasPoint } from './common.js?v=59';

initGamePage('peel');

const W = 420, H = 580;
const TIME = 60;                          // 한 판 60초
const cv = document.getElementById('cv');
const ctx = setupCanvas(cv, W, H);
const veil = document.getElementById('veil');
const INK = '#5b4466';
const FX = W / 2, FY = 236;               // 과일 자리

// 과일: 껍질색 · 속살색 · 크기 · 모양
const FRUITS = [
  { name: '사과', peel: '#ff5a5f', flesh: '#fff4d6', r: 78, shape: 'apple' },
  { name: '배', peel: '#d6df63', flesh: '#fffbe6', r: 76, shape: 'pear' },
  { name: '오렌지', peel: '#ffa53d', flesh: '#ffd27a', r: 78, shape: 'round' },
  { name: '복숭아', peel: '#ffb0a3', flesh: '#fff0cf', r: 78, shape: 'peach' },
  { name: '키위', peel: '#a07c4c', flesh: '#a5d65c', r: 70, shape: 'oval' },
  { name: '수박', peel: '#3fae4f', flesh: '#ff5d6c', r: 96, shape: 'round', stripes: true },
];
// 방향: 0 위 · 1 오른쪽 · 2 아래 · 3 왼쪽
const KEY_DIR = { ArrowUp: 0, KeyW: 0, ArrowRight: 1, KeyD: 1, ArrowDown: 2, KeyS: 2, ArrowLeft: 3, KeyA: 3 };
const BTN_ORDER = [3, 0, 2, 1];           // 화면 버튼은 ← ↑ ↓ → 순서
const BY = 462, BH = 88, BG = 10, BW = (W - 28 - BG * 3) / 4;

let state = 'ready';   // ready → play → over → done
let count = 0, miss = 0, seq = [], prog = 0, kind = 0, startAt = 0, endAt = 0;
let enterAt = 0, shakeAt = -1e9, flies = [], pops = [], sparks = [], pressed = {};

const rnd = (a, b) => a + Math.random() * (b - a);
function newFruit(now) {
  kind = count < 12 ? Math.floor(count / 2) : Math.floor(Math.random() * FRUITS.length);
  const n = Math.min(9, 4 + Math.floor(count / 3));   // 깎을수록 화살표가 길어진다
  seq = [];
  for (let i = 0; i < n; i++) {
    let d;
    do d = Math.floor(Math.random() * 4);
    while (i >= 2 && d === seq[i - 1] && d === seq[i - 2]);   // 같은 화살표 3번 연속은 안 나오게
    seq.push(d);
  }
  prog = 0; enterAt = now;
}
function start() {
  const now = performance.now();
  count = 0; miss = 0; flies = []; pops = []; sparks = []; shakeAt = -1e9;
  startAt = now; endAt = now + TIME * 1000;
  newFruit(now);
  state = 'play'; veil.hidden = true;
}
function press(dir, now) {
  pressed[dir] = now;
  if (state !== 'play') return;
  if (dir === seq[prog]) {
    prog++;
    if (prog >= seq.length) {
      count++;
      flies.push({ kind, t: now });
      pops.push({ s: '+1', x: FX, y: FY - 100, t: now });
      const f = FRUITS[kind];
      for (let i = 0; i < 14; i++) { const a = Math.random() * 6.28, s = rnd(120, 260); sparks.push({ x: FX, y: FY, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 80, life: .6, c: i % 2 ? f.flesh : '#ffffff' }); }
      newFruit(now);
    }
  } else {
    // 틀리면 이 과일은 처음부터
    miss++; prog = 0; shakeAt = now;
    pops.push({ s: '처음부터!', x: FX, y: FY - 100, t: now });
  }
}
function finish(now) {
  state = 'over';
  setTimeout(() => {
    state = 'done';
    showResult('peel', count, { detail: miss ? `틀려서 처음부터 다시 깎은 게 ${miss}번이에요` : '한 번도 안 틀렸어요!', onRetry: start });
  }, 1100);
}

/* ---------- 그리기 ---------- */
function rr(x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
function outlined(s, x, y, font, fill, lw = 8) {
  ctx.font = font; ctx.strokeStyle = '#fff'; ctx.lineWidth = lw; ctx.lineJoin = 'round';
  ctx.strokeText(s, x, y); ctx.fillStyle = fill; ctx.fillText(s, x, y);
}
function fruitPath(f, x, y, r) {
  ctx.beginPath();
  if (f.shape === 'pear') {
    ctx.arc(x, y + r * .22, r * .82, 0, Math.PI * 2);
    ctx.moveTo(x + r * .52, y - r * .45); ctx.arc(x, y - r * .45, r * .52, 0, Math.PI * 2);
  } else if (f.shape === 'oval') {
    ctx.ellipse(x, y, r * 1.12, r * .92, 0, 0, Math.PI * 2);
  } else if (f.shape === 'apple' || f.shape === 'peach') {
    // 위쪽이 살짝 오목한 모양: 동그라미 세 개를 겹친다
    ctx.arc(x - r * .32, y, r * .72, 0, Math.PI * 2);
    ctx.moveTo(x + r * .32 + r * .72, y); ctx.arc(x + r * .32, y, r * .72, 0, Math.PI * 2);
    ctx.moveTo(x + r * .9, y + r * .1); ctx.arc(x, y + r * .1, r * .9, 0, Math.PI * 2);
  } else ctx.arc(x, y, r, 0, Math.PI * 2);
}
// done: 0~1 깎인 정도
function drawFruit(f, x, y, s, done, now) {
  const r = f.r * s;
  ctx.fillStyle = 'rgba(91,68,102,.13)'; ctx.beginPath(); ctx.ellipse(x, y + r * 1.02, r * .8, r * .16, 0, 0, Math.PI * 2); ctx.fill();
  ctx.save();
  fruitPath(f, x, y, r); ctx.fillStyle = f.peel; ctx.fill('nonzero');
  fruitPath(f, x, y, r); ctx.clip('nonzero');
  if (f.stripes) {
    ctx.strokeStyle = '#237a35'; ctx.lineWidth = 9 * s;
    for (let i = -3; i <= 3; i++) { ctx.beginPath(); ctx.moveTo(x + i * r * .3, y - r); ctx.quadraticCurveTo(x + i * r * .3 + r * .14, y, x + i * r * .3, y + r); ctx.stroke(); }
  }
  // 깎인 부분: 꼭대기부터 시계 방향으로 속살이 드러난다
  if (done > 0) {
    ctx.fillStyle = f.flesh; ctx.beginPath(); ctx.moveTo(x, y);
    ctx.arc(x, y, r * 2, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * done); ctx.closePath(); ctx.fill();
    if (f.name === '키위') {
      ctx.fillStyle = '#3d2a1a';
      for (let i = 0; i < 12; i++) { const a = -Math.PI / 2 + i / 12 * Math.PI * 2; if (i / 12 < done) { ctx.beginPath(); ctx.ellipse(x + Math.cos(a) * r * .45, y + Math.sin(a) * r * .38, 3 * s, 2 * s, a, 0, Math.PI * 2); ctx.fill(); } }
    }
  }
  // 반짝임
  ctx.fillStyle = 'rgba(255,255,255,.45)'; ctx.beginPath(); ctx.ellipse(x - r * .38, y - r * .38, r * .16, r * .09, -.7, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  // 꼭지 · 잎
  const topY = f.shape === 'pear' ? y - r * .95 : f.shape === 'oval' ? y - r * .9 : y - r * .78;
  if (f.shape !== 'oval') {
    ctx.strokeStyle = '#7a5230'; ctx.lineWidth = 5 * s; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x, topY + 6 * s); ctx.quadraticCurveTo(x + 2 * s, topY - 10 * s, x + 6 * s, topY - 16 * s); ctx.stroke();
    ctx.fillStyle = '#5fc46b'; ctx.beginPath(); ctx.ellipse(x + 18 * s, topY - 10 * s, 14 * s, 7 * s, -.5, 0, Math.PI * 2); ctx.fill();
  }
}
function drawPeelAndKnife(f, x, y, done, now) {
  const r = f.r, a = -Math.PI / 2 + Math.PI * 2 * done;
  const ex = x + Math.cos(a) * r * .98, ey = y + Math.sin(a) * r * .98;
  // 껍질이 길게 늘어진다
  if (done > 0) {
    const len = 24 + 150 * done;
    ctx.strokeStyle = f.peel; ctx.lineWidth = 11; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(ex, ey);
    for (let i = 1; i <= 16; i++) {
      const k = i / 16;
      ctx.lineTo(ex + Math.sin(k * 9 + now / 260) * 12 * k + (ex > x ? 14 : -14) * k, ey + len * k);
    }
    ctx.stroke();
  }
  // 칼
  ctx.save(); ctx.translate(ex, ey); ctx.rotate(a + Math.PI / 2);
  ctx.fillStyle = '#dfe6f0'; ctx.strokeStyle = '#8a94a8'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-4, -4); ctx.lineTo(34, -4); ctx.quadraticCurveTo(42, 2, 34, 8); ctx.lineTo(-4, 8); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#b07a4a'; rr(-36, -5, 32, 14, 6); ctx.fill();
  ctx.restore();
}
function arrow(x, y, s, dir, col) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(dir * Math.PI / 2);
  ctx.fillStyle = col; ctx.beginPath();
  ctx.moveTo(0, -s); ctx.lineTo(s * .85, -s * .05); ctx.lineTo(s * .32, -s * .05); ctx.lineTo(s * .32, s * .85);
  ctx.lineTo(-s * .32, s * .85); ctx.lineTo(-s * .32, -s * .05); ctx.lineTo(-s * .85, -s * .05); ctx.closePath(); ctx.fill();
  ctx.restore();
}
function btnRect(i) { return { x: 14 + i * (BW + BG), y: BY, w: BW, h: BH }; }

function draw(now) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#fff6e8'); g.addColorStop(1, '#ffeef4');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // 도마
  ctx.fillStyle = '#f1d3a8'; rr(60, FY + 70, W - 120, 40, 18); ctx.fill();
  ctx.fillStyle = '#e4bf8c'; rr(60, FY + 96, W - 120, 14, 8); ctx.fill();

  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  if (state === 'play' && now >= endAt) finish(now);
  const left = state === 'ready' ? TIME : state === 'play' ? Math.max(0, (endAt - now) / 1000) : 0;
  // 깎은 개수 · 남은 시간
  outlined(`${count}개`, W / 2, 44, '900 40px Pretendard, sans-serif', '#ff6f8e');
  ctx.fillStyle = 'rgba(91,68,102,.12)'; rr(40, 78, W - 80, 12, 6); ctx.fill();
  ctx.fillStyle = left < 10 ? '#ff5c7a' : '#ffb84d'; rr(40, 78, (W - 80) * left / TIME, 12, 6); ctx.fill();
  ctx.font = '800 14px Pretendard, sans-serif'; ctx.fillStyle = INK;
  ctx.fillText(`남은 시간 ${Math.ceil(left)}초`, W / 2, 106);

  // 다 깎은 과일은 위로 톡 튀어 날아간다
  for (const fl of flies) {
    const k = (now - fl.t) / 450;
    ctx.globalAlpha = Math.max(0, 1 - k);
    drawFruit(FRUITS[fl.kind], FX - k * 160, FY - Math.sin(k * Math.PI) * 90 - k * 40, 1 - k * .4, 1, now);
    ctx.globalAlpha = 1;
  }
  flies = flies.filter(fl => now - fl.t < 450);

  if (state !== 'ready') {
    const f = FRUITS[kind];
    const ek = Math.min(1, (now - enterAt) / 180);
    let x = FX + (1 - ek) * 200;
    if (now - shakeAt < 320) x += Math.sin((now - shakeAt) / 20) * 7 * (1 - (now - shakeAt) / 320);
    const done = prog / seq.length;
    drawFruit(f, x, FY, 1, done, now);
    if (state === 'play') drawPeelAndKnife(f, x, FY, done, now);
    ctx.font = '800 14px Pretendard, sans-serif'; ctx.fillStyle = 'rgba(91,68,102,.6)';
    ctx.fillText(f.name, FX, FY + 132);
  } else {
    drawFruit(FRUITS[0], FX, FY, 1, 0, now);
  }

  // 눌러야 할 화살표 줄
  if (state === 'play' || state === 'over') {
    const n = seq.length, gap = 6, bs = Math.min(52, (W - 28 - gap * (n - 1)) / n);
    const x0 = (W - (bs * n + gap * (n - 1))) / 2, y0 = 396;
    const bad = now - shakeAt < 320;
    for (let i = 0; i < n; i++) {
      const x = x0 + i * (bs + gap), cur = i === prog && state === 'play';
      const done = i < prog;
      ctx.fillStyle = 'rgba(91,68,102,.12)'; rr(x, y0 + 3, bs, bs, 10); ctx.fill();
      ctx.fillStyle = bad ? '#ffd9e0' : done ? '#e9e2f0' : cur ? '#ffffff' : '#fdf8ff';
      rr(x, y0 - (cur ? 4 : 0), bs, bs, 10); ctx.fill();
      if (cur) { ctx.strokeStyle = '#ff8fab'; ctx.lineWidth = 3; ctx.stroke(); }
      arrow(x + bs / 2, y0 + bs / 2 - (cur ? 4 : 0), bs * .3, seq[i], done ? '#cbbfd8' : bad ? '#ff5c7a' : INK);
    }
  } else {
    ctx.font = '800 15px Pretendard, sans-serif'; ctx.fillStyle = INK;
    ctx.fillText('나오는 화살표를 순서대로 누르면 한 개 완성!', W / 2, 418);
  }

  // 화면 버튼 (손가락 · 마우스)
  for (let i = 0; i < 4; i++) {
    const b = btnRect(i), dir = BTN_ORDER[i];
    const down = now - (pressed[dir] || -1e9) < 110;
    ctx.fillStyle = 'rgba(91,68,102,.16)'; rr(b.x, b.y + 5, b.w, b.h, 18); ctx.fill();
    ctx.fillStyle = down ? '#ffe1ea' : '#ffffff'; rr(b.x, b.y + (down ? 4 : 0), b.w, b.h, 18); ctx.fill();
    arrow(b.x + b.w / 2, b.y + b.h / 2 + (down ? 4 : 0), 22, dir, '#ff7fa0');
  }

  for (const s of sparks) {
    s.x += s.vx / 60; s.y += s.vy / 60; s.vy += 12; s.life -= 1 / 60;
    ctx.globalAlpha = Math.max(0, s.life / .6); ctx.fillStyle = s.c;
    ctx.beginPath(); ctx.arc(s.x, s.y, 5, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
  sparks = sparks.filter(s => s.life > 0);
  for (const p of pops) {
    const k = (now - p.t) / 700;
    ctx.globalAlpha = Math.max(0, 1 - k);
    outlined(p.s, p.x, p.y - k * 30, '900 24px Pretendard, sans-serif', p.s === '+1' ? '#4c9dff' : '#ff5c7a', 6);
    ctx.globalAlpha = 1;
  }
  pops = pops.filter(p => now - p.t < 700);

  if (state === 'over' || state === 'done') {
    ctx.fillStyle = 'rgba(255,255,255,.85)'; rr(W / 2 - 110, FY - 34, 220, 68, 20); ctx.fill();
    outlined('시간 끝!', W / 2, FY, '900 38px Pretendard, sans-serif', '#4c9dff', 8);
  }
}

function frame(now) { draw(now); requestAnimationFrame(frame); }
requestAnimationFrame(frame);

cv.addEventListener('pointerdown', e => {
  if (e.pointerType !== 'touch' && e.button !== 0) return;
  e.preventDefault();
  const p = canvasPoint(cv, W, e);
  for (let i = 0; i < 4; i++) {
    const b = btnRect(i);
    if (p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y - 6 && p.y <= b.y + b.h + 10) return press(BTN_ORDER[i], performance.now());
  }
});
document.addEventListener('keydown', e => {
  if (document.querySelector('.overlay')) return;
  if (e.code === 'Space') { e.preventDefault(); if (state === 'ready' && !e.repeat) start(); return; }
  if (e.code in KEY_DIR) { e.preventDefault(); if (!e.repeat) press(KEY_DIR[e.code], performance.now()); }
});
veil.addEventListener('click', start);
