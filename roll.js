import { initGamePage, showResult, setupCanvas } from './common.js';

initGamePage('roll');

const W = 480, H = 640;
const cv = document.getElementById('cv');
const ctx = setupCanvas(cv, W, H);
const veil = document.getElementById('veil');

const BALL_Y = 560, BALL_R = 13, WALL_H = 20;
const ACCEL = 1700, MAX_V = 430, FRICTION = 3.2;

let state = 'ready';          // ready → play → crash
let ball, walls, elapsed, scroll, last, keys = { l: false, r: false }, passed, crashAt;

function speedAt(t) { return Math.min(660, 210 + t * 14); }
function start() {
  ball = { x: W / 2, vx: 0, rot: 0 };
  walls = []; elapsed = 0; scroll = 0; passed = 0; last = performance.now();
  spawn();
  state = 'play'; veil.hidden = true;
}
function spawn() {
  const t = elapsed;
  const gapW = Math.max(82, 172 - t * 2.6);
  const prev = walls[walls.length - 1];
  const prevCenter = prev ? prev.gapX + prev.gapW / 2 : W / 2;
  // 이전 틈에서 공이 갈 수 있는 거리 안에서만 다음 틈을 만든다
  const reach = Math.max(120, (spacing(t) / speedAt(t)) * MAX_V * 0.75);
  let center = prevCenter + (Math.random() * 2 - 1) * reach;
  center = Math.max(16 + gapW / 2, Math.min(W - 16 - gapW / 2, center));
  const moving = t > 14 && Math.random() < Math.min(0.5, 0.2 + (t - 14) * 0.012)
    ? { amp: 40 + Math.random() * 40, speed: 1.4 + Math.random() * 1.4, phase: Math.random() * 6 } : null;
  walls.push({ y: -WALL_H, baseX: center - gapW / 2, gapX: center - gapW / 2, gapW, moving, counted: false });
}
function spacing(t) { return Math.max(165, 290 - t * 4); }

function hitRect(cx, cy, r, x, y, w, h) {
  const nx = Math.max(x, Math.min(cx, x + w)), ny = Math.max(y, Math.min(cy, y + h));
  return (cx - nx) ** 2 + (cy - ny) ** 2 < r * r;
}

function update(dt) {
  elapsed += dt;
  const v = speedAt(elapsed);
  scroll = (scroll + v * dt) % 80;

  const dir = (keys.r ? 1 : 0) - (keys.l ? 1 : 0);
  ball.vx += dir * ACCEL * dt;
  ball.vx -= ball.vx * FRICTION * dt;
  ball.vx = Math.max(-MAX_V, Math.min(MAX_V, ball.vx));
  ball.x += ball.vx * dt;
  if (ball.x < BALL_R) { ball.x = BALL_R; ball.vx *= -0.4; }
  if (ball.x > W - BALL_R) { ball.x = W - BALL_R; ball.vx *= -0.4; }
  ball.rot += ball.vx * dt / BALL_R;

  for (const w of walls) {
    w.y += v * dt;
    if (w.moving) {
      const m = w.moving;
      w.gapX = Math.max(8, Math.min(W - 8 - w.gapW, w.baseX + Math.sin(elapsed * m.speed + m.phase) * m.amp));
    }
    if (hitRect(ball.x, BALL_Y, BALL_R, 0, w.y, w.gapX, WALL_H) ||
        hitRect(ball.x, BALL_Y, BALL_R, w.gapX + w.gapW, w.y, W - w.gapX - w.gapW, WALL_H)) {
      return crash();
    }
    if (!w.counted && w.y > BALL_Y + BALL_R) { w.counted = true; passed++; }
  }
  walls = walls.filter(w => w.y < H + 40);
  const top = walls[walls.length - 1];
  if (!top || top.y > spacing(elapsed) - WALL_H) spawn();
}
function crash() {
  state = 'crash'; crashAt = performance.now();
  const score = Math.floor(elapsed * 10) / 10;
  setTimeout(() => showResult('roll', score, {
    detail: `벽 ${passed}개 통과`,
    extra: { walls: passed },
    onRetry: start,
  }), 700);
}

function draw(now) {
  ctx.fillStyle = '#171a2b'; ctx.fillRect(0, 0, W, H);
  // 바닥 줄무늬(속도감)
  ctx.fillStyle = 'rgba(255,255,255,.04)';
  for (let y = -80 + (scroll || 0); y < H; y += 80) ctx.fillRect(0, y, W, 40);
  ctx.strokeStyle = 'rgba(255,255,255,.06)'; ctx.setLineDash([14, 18]); ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(W / 3, 0); ctx.lineTo(W / 3, H); ctx.moveTo(W * 2 / 3, 0); ctx.lineTo(W * 2 / 3, H); ctx.stroke();
  ctx.setLineDash([]);

  if (walls) for (const w of walls) {
    ctx.fillStyle = w.moving ? '#ff5c7a' : '#6c63ff';
    ctx.fillRect(0, w.y, w.gapX, WALL_H);
    ctx.fillRect(w.gapX + w.gapW, w.y, W - w.gapX - w.gapW, WALL_H);
    ctx.fillStyle = 'rgba(255,255,255,.25)';
    ctx.fillRect(0, w.y, w.gapX, 3); ctx.fillRect(w.gapX + w.gapW, w.y, W - w.gapX - w.gapW, 3);
  }

  if (ball) {
    const shake = state === 'crash' && now - crashAt < 300 ? (Math.random() - .5) * 8 : 0;
    ctx.save(); ctx.translate(ball.x + shake, BALL_Y); ctx.rotate(ball.rot);
    const g = ctx.createRadialGradient(-4, -5, 2, 0, 0, BALL_R);
    g.addColorStop(0, '#fff6d6'); g.addColorStop(1, state === 'crash' ? '#ff5c7a' : '#ffc83d');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, BALL_R, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(80,50,0,.6)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-BALL_R + 3, 0); ctx.lineTo(BALL_R - 3, 0); ctx.stroke();
    ctx.restore();
  }

  if (state !== 'ready') {
    ctx.fillStyle = '#fff'; ctx.font = '900 34px Pretendard, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.fillText(`${(Math.floor(elapsed * 10) / 10).toFixed(1)}초`, W / 2, 18);
    ctx.font = '600 14px Pretendard, sans-serif'; ctx.fillStyle = 'rgba(255,255,255,.6)';
    ctx.fillText(`통과 ${passed}`, W / 2, 58);
  }
}

function frame(now) {
  if (state === 'play') {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    update(dt);
  }
  draw(now);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

const KEYMAP = { ArrowLeft: 'l', KeyA: 'l', ArrowRight: 'r', KeyD: 'r' };
document.addEventListener('keydown', e => {
  if (document.querySelector('.overlay')) return;
  if (KEYMAP[e.code]) { e.preventDefault(); keys[KEYMAP[e.code]] = true; }
  if (e.code === 'Space') { e.preventDefault(); if (state === 'ready') start(); }
});
document.addEventListener('keyup', e => { if (KEYMAP[e.code]) keys[KEYMAP[e.code]] = false; });
window.addEventListener('blur', () => { keys.l = keys.r = false; });
veil.addEventListener('click', start);
