import { initGamePage, showResult, setupCanvas, canvasPoint } from './common.js';

initGamePage('stairs');

const W = 480, H = 640;
const cv = document.getElementById('cv');
const ctx = setupCanvas(cv, W, H);
const veil = document.getElementById('veil');

const STEP_W = 66, STEP_H = 16, SHIFT = 50, RISE = 46, PLAYER_Y = 470;

let state = 'ready';          // ready → play → over
let cols, idx, gauge, last, cam, pos, facing, overAt, overReason, fallY;

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
  state = 'play'; veil.hidden = true;
}
function drainRate() { return Math.min(75, 15 + idx * 0.2); }

function step(dir) {
  if (state !== 'play') return;
  ensureSteps(idx + 30);
  facing = dir;
  if (cols[idx + 1] - cols[idx] !== dir) { pos.x += dir * SHIFT * 0.6; return over('fall'); }
  idx++;
  gauge = Math.min(100, gauge + 7);
}
function over(reason) {
  state = 'over'; overAt = performance.now(); overReason = reason;
  setTimeout(() => showResult('stairs', idx, {
    detail: reason === 'fall' ? '발을 헛디뎠어요' : '시간이 다 됐어요',
    extra: { reason },
    onRetry: start,
  }), 800);
}

function update(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
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
  cam.x += (tx - cam.x) * Math.min(1, dt * 8);
  cam.y += (ty - cam.y) * Math.min(1, dt * 10);
}

function draw(now) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  const hue = 230 - Math.min(160, (idx || 0) * 0.8);   // 높이 오를수록 하늘색이 바뀐다
  g.addColorStop(0, `hsl(${hue},45%,16%)`); g.addColorStop(1, `hsl(${hue},40%,28%)`);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  if (state === 'ready') return;

  const ox = W / 2 - cam.x, oy = PLAYER_Y - cam.y;
  for (let i = Math.max(0, idx - 10); i < idx + 16 && i < cols.length; i++) {
    const x = ox + cols[i] * SHIFT - STEP_W / 2, y = oy - i * RISE + 14;
    if (y < -30 || y > H + 30) continue;
    ctx.fillStyle = i === idx + 1 ? '#ffc83d' : i <= idx ? 'rgba(255,255,255,.28)' : '#b7b9ff';
    ctx.fillRect(x, y, STEP_W, STEP_H);
    ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(x, y + STEP_H - 4, STEP_W, 4);
    if (i % 50 === 0 && i > 0) {
      ctx.fillStyle = '#fff'; ctx.font = '700 12px Pretendard, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(`${i}`, x + STEP_W / 2, y + STEP_H + 14);
    }
  }
  // 캐릭터
  const px = ox + pos.x, py = oy + pos.y + fallY;
  ctx.save(); ctx.translate(px, py); ctx.scale(facing, 1);
  ctx.fillStyle = state === 'over' ? '#ff5c7a' : '#3fd0c0';
  ctx.beginPath(); ctx.arc(0, -4, 14, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(5, -7, 4, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(6.5, -7, 2, 0, Math.PI * 2); ctx.fill();
  ctx.restore();

  // 시간 막대 · 점수
  const bw = W - 60, bx = 30, by = 22;
  ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.fillRect(bx, by, bw, 12);
  ctx.fillStyle = gauge > 35 ? '#3fd0c0' : gauge > 15 ? '#ffc83d' : '#ff5c7a';
  ctx.fillRect(bx, by, bw * gauge / 100, 12);
  ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  ctx.font = '900 42px Pretendard, sans-serif'; ctx.fillText(idx, W / 2, 46);
  if (idx === 0 && state === 'play') {
    ctx.font = '600 15px Pretendard, sans-serif'; ctx.fillStyle = 'rgba(255,255,255,.75)';
    ctx.fillText('노란 계단이 있는 쪽 화살표를 누르세요', W / 2, 100);
  }
}

function frame(now) { update(now); draw(now); requestAnimationFrame(frame); }

document.addEventListener('keydown', e => {
  if (e.repeat || document.querySelector('.overlay')) return;
  if (e.code === 'ArrowLeft' || e.code === 'KeyA') { e.preventDefault(); step(-1); }
  else if (e.code === 'ArrowRight' || e.code === 'KeyD') { e.preventDefault(); step(1); }
  else if (e.code === 'Space') { e.preventDefault(); if (state === 'ready') start(); }
});
cv.addEventListener('mousedown', e => {
  if (state !== 'play') return;
  step(canvasPoint(cv, W, e).x < W / 2 ? -1 : 1);
});
veil.addEventListener('click', start);
last = performance.now();
cols = [0]; idx = 0; gauge = 100;
requestAnimationFrame(frame);
