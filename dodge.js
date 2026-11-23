import { initGamePage, showResult, setupCanvas, canvasPoint } from './common.js?v=54';

initGamePage('dodge');

const W = 480, H = 560;
const cv = document.getElementById('cv');
const ctx = setupCanvas(cv, W, H);
const veil = document.getElementById('veil');
const FONT = 'Galmuri11, Pretendard, sans-serif';
const INK = '#0b0a1e';
const PX = 3;

/* ---------- 우주선 그림 (9×9 픽셀) ---------- */
const SHIP_MAP = [
  '....w....',
  '...wcw...',
  '...cbc...',
  '..wcbcw..',
  '.wccbccw.',
  'wwcccccww',
  'w.rcccr.w',
  '...o.o...',
  '...y.y...',
];
const SHIP_COL = { w: '#e8ecff', c: '#7aa6ff', b: '#2fd0f0', r: '#ff3b5c', o: '#ffb000', y: '#ffe99a' };
const SHIP_R = 5;   // 맞는 범위(그림보다 작게 — 스치는 건 봐준다)

let state = 'ready';   // ready → play → over → done
let ship, bullets, t, last, keys = {}, sparks = [], overAt = 0, spawnAcc = 0, waveAt = 0;
const STARS = Array.from({ length: 90 }, () => ({ x: Math.random() * W, y: Math.random() * H, v: 8 + Math.random() * 30, s: Math.random() < .2 ? 3 : 2 }));

function start() {
  ship = { x: W / 2, y: H / 2 };
  bullets = []; sparks = []; t = 0; spawnAcc = 0; waveAt = 12;
  for (let i = 0; i < 28; i++) bullets.push(makeBullet(true));
  last = performance.now();
  state = 'play'; veil.hidden = true;
}
// 화면 가장자리 아무 곳에서 나와 우주선 근처를 향해 날아간다
function makeBullet(first = false) {
  const side = Math.floor(Math.random() * 4);
  let x, y;
  if (side === 0) { x = Math.random() * W; y = -8; }
  else if (side === 1) { x = W + 8; y = Math.random() * H; }
  else if (side === 2) { x = Math.random() * W; y = H + 8; }
  else { x = -8; y = Math.random() * H; }
  const fast = t > 20 && Math.random() < Math.min(.35, (t - 20) / 80);
  const aim = Math.atan2(ship.y - y, ship.x - x) + (Math.random() - .5) * (first ? .9 : .5);
  const sp = (95 + Math.min(130, t * 2.2)) * (fast ? 1.6 : 1) * (.8 + Math.random() * .4);
  return { x, y, vx: Math.cos(aim) * sp, vy: Math.sin(aim) * sp, fast };
}
// 가끔 사방에서 원 모양으로 한꺼번에 몰려오는 파도
function wave() {
  const n = 18 + Math.min(18, Math.floor(t / 8));
  const R = Math.hypot(W, H) / 2 + 10, sp = 90 + Math.min(80, t * 1.2), off = Math.random() * Math.PI;
  for (let i = 0; i < n; i++) {
    const a = off + i / n * Math.PI * 2;
    const x = ship.x + Math.cos(a) * R, y = ship.y + Math.sin(a) * R;
    bullets.push({ x, y, vx: -Math.cos(a) * sp, vy: -Math.sin(a) * sp, wave: true });
  }
}
const target = () => 28 + Math.floor(t * 1.6);   // 화면에 떠 있는 총알 수가 시간에 따라 늘어난다

function update(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  for (const s of STARS) { s.y += s.v * dt; if (s.y > H) { s.y = 0; s.x = Math.random() * W; } }
  for (const p of sparks) { p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; }
  sparks = sparks.filter(p => p.life > 0);
  if (state !== 'play') return;
  t += dt;
  // 키보드 이동
  let dx = (keys.ArrowRight || keys.KeyD ? 1 : 0) - (keys.ArrowLeft || keys.KeyA ? 1 : 0);
  let dy = (keys.ArrowDown || keys.KeyS ? 1 : 0) - (keys.ArrowUp || keys.KeyW ? 1 : 0);
  if (dx || dy) { const k = 210 / Math.hypot(dx, dy); ship.x += dx * k * dt; ship.y += dy * k * dt; }
  ship.x = Math.max(12, Math.min(W - 12, ship.x)); ship.y = Math.max(12, Math.min(H - 12, ship.y));
  // 총알
  for (const b of bullets) { b.x += b.vx * dt; b.y += b.vy * dt; }
  const out = b => b.x < -30 || b.x > W + 30 || b.y < -30 || b.y > H + 30;
  bullets = bullets.filter(b => !(out(b) && (!b.wave || b.age > 4)) && (b.age = (b.age || 0) + dt) < 30);
  const normal = bullets.filter(b => !b.wave).length;
  for (let i = normal; i < target(); i++) bullets.push(makeBullet());
  if (t > waveAt) { wave(); waveAt = t + 10 + Math.random() * 6; }
  // 맞았나
  for (const b of bullets) {
    const r = b.fast ? 4 : 3;
    if ((b.x - ship.x) ** 2 + (b.y - ship.y) ** 2 < (r + SHIP_R) ** 2) return boom();
  }
}
function boom() {
  state = 'over'; overAt = performance.now();
  const cols = ['#ffe99a', '#ffb000', '#ff3b5c', '#ffffff'];
  for (let i = 0; i < 40; i++) {
    const a = Math.random() * Math.PI * 2, s = 40 + Math.random() * 200;
    sparks.push({ x: ship.x, y: ship.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: .5 + Math.random() * .7, c: cols[i % 4] });
  }
  const score = Math.floor(t * 100) / 100;
  setTimeout(() => {
    state = 'done';
    showResult('dodge', score, { detail: `마지막엔 총알 ${target()}발이 날아다녔어요`, extra: {}, onRetry: start });
  }, 1100);
}

/* ---------- 그리기 ---------- */
function drawShip(x, y, now) {
  const ox = Math.round(x - 4.5 * PX), oy = Math.round(y - 4.5 * PX);
  SHIP_MAP.forEach((row, r) => [...row].forEach((ch, c) => {
    let col = SHIP_COL[ch];
    if (!col) return;
    if ((ch === 'o' || ch === 'y') && Math.floor(now / 80) % 2) col = ch === 'o' ? '#ff3b5c' : '#ffb000';   // 불꽃 깜빡
    ctx.fillStyle = col; ctx.fillRect(ox + c * PX, oy + r * PX, PX, PX);
  }));
}
function draw(now) {
  ctx.fillStyle = '#0d0a26'; ctx.fillRect(0, 0, W, H);
  for (const s of STARS) { ctx.fillStyle = s.s === 3 ? '#e8e4ff' : '#7a74b8'; ctx.fillRect(Math.round(s.x), Math.round(s.y), s.s, s.s); }

  if (state !== 'ready') {
    for (const b of bullets) {
      const x = Math.round(b.x), y = Math.round(b.y);
      if (b.fast) { ctx.fillStyle = '#ff3b5c'; ctx.fillRect(x - 4, y - 4, 8, 8); ctx.fillStyle = '#ffd0d8'; ctx.fillRect(x - 2, y - 2, 4, 4); }
      else if (b.wave) { ctx.fillStyle = '#c050f0'; ctx.fillRect(x - 3, y - 3, 6, 6); ctx.fillStyle = '#f0c8ff'; ctx.fillRect(x - 1, y - 1, 2, 2); }
      else { ctx.fillStyle = '#ffc21f'; ctx.fillRect(x - 3, y - 3, 6, 6); ctx.fillStyle = '#fff6c8'; ctx.fillRect(x - 1, y - 1, 2, 2); }
    }
    if (state === 'play') drawShip(ship.x, ship.y, now);
    for (const p of sparks) { ctx.globalAlpha = Math.min(1, p.life * 2); ctx.fillStyle = p.c; ctx.fillRect(Math.round(p.x), Math.round(p.y), 4, 4); }
    ctx.globalAlpha = 1;
  } else drawShip(W / 2, H / 2, now);

  // CRT 줄무늬
  ctx.fillStyle = 'rgba(0,0,0,.18)';
  for (let y = 0; y < H; y += 3) ctx.fillRect(0, y, W, 1);

  // 시간
  ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.lineJoin = 'round';
  const txt = (Math.floor((t || 0) * 100) / 100).toFixed(2);
  ctx.font = `bold 36px ${FONT}`;
  ctx.strokeStyle = INK; ctx.lineWidth = 7; ctx.strokeText(txt, W / 2, 16);
  ctx.fillStyle = '#ffffff'; ctx.fillText(txt, W / 2, 16);
  if (state === 'play' && t < 3) {
    ctx.font = `bold 15px ${FONT}`; ctx.strokeStyle = INK; ctx.lineWidth = 5;
    const tip = matchMedia('(pointer: coarse)').matches ? '화면 아무 데나 대고 끌어서 움직여요' : '방향키로 움직여서 피하세요';
    ctx.strokeText(tip, W / 2, 62); ctx.fillStyle = '#ffe99a'; ctx.fillText(tip, W / 2, 62);
  }
  if (state === 'over') {
    ctx.font = `bold 30px ${FONT}`; ctx.textBaseline = 'middle';
    ctx.strokeStyle = INK; ctx.lineWidth = 8; ctx.strokeText('GAME OVER', W / 2, H / 2);
    ctx.fillStyle = '#ff3b5c'; ctx.fillText('GAME OVER', W / 2, H / 2);
  }
}

function frame(now) { update(now); draw(now); requestAnimationFrame(frame); }
requestAnimationFrame(frame);

/* ---------- 조작 ---------- */
const MOVE_KEYS = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'KeyA', 'KeyD', 'KeyW', 'KeyS'];
document.addEventListener('keydown', e => {
  if (document.querySelector('.overlay')) return;
  if (e.code === 'Space') { e.preventDefault(); if (state === 'ready' && !e.repeat) start(); return; }
  if (MOVE_KEYS.includes(e.code)) { e.preventDefault(); keys[e.code] = true; }
});
document.addEventListener('keyup', e => { keys[e.code] = false; });
window.addEventListener('blur', () => { keys = {}; });
// 손가락 · 마우스: 누른 순간의 '손가락과 우주선 사이 거리'를 그대로 유지하며 따라온다
// (손가락이 우주선을 가리지 않고, 오래 끌어도 사이가 벌어지지 않는다)
let drag = null;
cv.addEventListener('pointerdown', e => {
  if (state !== 'play') return;
  e.preventDefault();
  cv.setPointerCapture?.(e.pointerId);
  const p = canvasPoint(cv, W, e);
  drag = { id: e.pointerId, ox: ship.x - p.x, oy: ship.y - p.y };
});
cv.addEventListener('pointermove', e => {
  if (!drag || drag.id !== e.pointerId || state !== 'play') return;
  const p = canvasPoint(cv, W, e);
  ship.x = Math.max(12, Math.min(W - 12, p.x + drag.ox));
  ship.y = Math.max(12, Math.min(H - 12, p.y + drag.oy));
});
const endDrag = () => { drag = null; };
cv.addEventListener('pointerup', endDrag);
cv.addEventListener('pointercancel', endDrag);
veil.addEventListener('click', start);
