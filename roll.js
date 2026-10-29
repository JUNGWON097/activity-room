import { initGamePage, showResult, setupCanvas, canvasPoint } from './common.js';

initGamePage('roll');

const W = 480, H = 640;
const cv = document.getElementById('cv');
const ctx = setupCanvas(cv, W, H);
const veil = document.getElementById('veil');
const stage = document.getElementById('stage');

const BALL_Y = 556, BALL_R = 16, WALL_H = 24;
const ACCEL = 1700, MAX_V = 430, FRICTION = 3.2;
const JELLY = ['#b8e8d8', '#cdbcff', '#ffd2a8', '#a9d8ff'];
const INK = '#5b4466';

let state = 'ready';          // ready → play → crash
let ball, walls, elapsed, scroll, last, keys = { l: false, r: false }, passed, crashAt;
let mouseX = null;            // 화면 위 마우스 x (없으면 null)
let deco = Array.from({ length: 18 }, () => ({ x: Math.random() * W, y: Math.random() * H, k: Math.random() < .5 ? 'star' : 'heart', s: 4 + Math.random() * 5 }));

function speedAt(t) { return Math.min(660, 210 + t * 14); }
function spacing(t) { return Math.max(165, 290 - t * 4); }
function start() {
  ball = { x: W / 2, vx: 0, rot: 0 };
  walls = []; elapsed = 0; scroll = 0; passed = 0; last = performance.now();
  spawn();
  state = 'play'; veil.hidden = true;
}
function spawn() {
  const t = elapsed;
  const gapW = Math.max(84, 174 - t * 2.6);
  const prev = walls[walls.length - 1];
  const prevCenter = prev ? prev.gapX + prev.gapW / 2 : W / 2;
  // 이전 틈에서 공이 갈 수 있는 거리 안에서만 다음 틈을 만든다
  const reach = Math.max(120, (spacing(t) / speedAt(t)) * MAX_V * 0.75);
  let center = prevCenter + (Math.random() * 2 - 1) * reach;
  center = Math.max(16 + gapW / 2, Math.min(W - 16 - gapW / 2, center));
  const moving = t > 14 && Math.random() < Math.min(0.5, 0.2 + (t - 14) * 0.012)
    ? { amp: 40 + Math.random() * 40, speed: 1.4 + Math.random() * 1.4, phase: Math.random() * 6 } : null;
  walls.push({ y: -WALL_H, baseX: center - gapW / 2, gapX: center - gapW / 2, gapW, moving, counted: false,
    color: JELLY[Math.floor(Math.random() * JELLY.length)],
    sprinkles: Array.from({ length: 10 }, () => ({ x: Math.random(), y: 6 + Math.random() * 12, c: ['#ff8fb1', '#fff', '#ffd84d', '#7fd1ff'][Math.floor(Math.random() * 4)] })) });
}

function hitRect(cx, cy, r, x, y, w, h) {
  const nx = Math.max(x, Math.min(cx, x + w)), ny = Math.max(y, Math.min(cy, y + h));
  return (cx - nx) ** 2 + (cy - ny) ** 2 < r * r;
}

function update(dt) {
  elapsed += dt;
  const v = speedAt(elapsed);
  scroll += v * dt;

  const dir = (keys.r ? 1 : 0) - (keys.l ? 1 : 0);
  if (dir) {
    ball.vx += dir * ACCEL * dt;
  } else if (mouseX !== null) {
    // 마우스를 따라가되, 같은 관성으로 미끄러지듯 움직인다
    const want = Math.max(-MAX_V, Math.min(MAX_V, (mouseX - ball.x) * 7));
    ball.vx += Math.max(-ACCEL * dt, Math.min(ACCEL * dt, want - ball.vx));
  }
  if (dir || mouseX === null) ball.vx -= ball.vx * FRICTION * dt;
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
    const hr = BALL_R + 2;   // 볼 테두리보다 살짝 안쪽까지만 부딪힌 것으로 본다
    if (hitRect(ball.x, BALL_Y, hr, 0, w.y, w.gapX, WALL_H) ||
        hitRect(ball.x, BALL_Y, hr, w.gapX + w.gapW, w.y, W - w.gapX - w.gapW, WALL_H)) {
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
    detail: `젤리 벽 ${passed}개 통과`,
    extra: { walls: passed },
    onRetry: start,
  }), 900);
}

/* ---------- 그리기 ---------- */
function rr(x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
function heart(x, y, s) {
  ctx.beginPath(); ctx.moveTo(x, y + s * .9);
  ctx.bezierCurveTo(x - s * 1.6, y - s * .2, x - s * .6, y - s * 1.3, x, y - s * .4);
  ctx.bezierCurveTo(x + s * .6, y - s * 1.3, x + s * 1.6, y - s * .2, x, y + s * .9); ctx.fill();
}
function star(x, y, s) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? s * .45 : s; ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); }
  ctx.closePath(); ctx.fill();
}
function drawBg() {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#ffe9f3'); g.addColorStop(1, '#e6f1ff');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // 물방울 무늬
  const off = (scroll || 0) * 0.35 % 60;
  ctx.fillStyle = 'rgba(255,255,255,.55)';
  for (let y = -60 + off; y < H; y += 60) for (let x = (Math.floor((y - off) / 60) % 2) * 30; x < W; x += 60) {
    ctx.beginPath(); ctx.arc(x + 15, y, 5, 0, Math.PI * 2); ctx.fill();
  }
  for (const d of deco) {
    const y = (d.y + (scroll || 0) * 0.6) % (H + 20) - 10;
    ctx.fillStyle = d.k === 'star' ? 'rgba(255,214,90,.7)' : 'rgba(255,143,177,.55)';
    d.k === 'star' ? star(d.x, y, d.s) : heart(d.x, y, d.s * .8);
  }
}
function drawWall(w, x, width) {
  if (width <= 0) return;
  const c = w.moving ? '#ff9fc0' : w.color;
  ctx.fillStyle = 'rgba(91,68,102,.12)'; rr(x, w.y + 4, width, WALL_H, 12); ctx.fill();
  ctx.fillStyle = c; rr(x, w.y, width, WALL_H, 12); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.7)'; rr(x + 6, w.y + 4, Math.max(0, width - 12), 5, 3); ctx.fill();
  ctx.save(); ctx.beginPath(); ctx.rect(x + 4, w.y, Math.max(0, width - 8), WALL_H); ctx.clip();
  for (const s of w.sprinkles) {
    ctx.fillStyle = s.c; rr(x + s.x * width - 3, w.y + s.y, 6, 3, 1.5); ctx.fill();
  }
  ctx.restore();
}
function drawFaceOnWall(w) {
  // 움직이는 젤리는 얼굴이 있다
  const fx = w.gapX > W - w.gapX - w.gapW ? w.gapX / 2 : w.gapX + w.gapW + (W - w.gapX - w.gapW) / 2;
  const fy = w.y + WALL_H / 2 + 1;
  ctx.fillStyle = INK;
  ctx.beginPath(); ctx.arc(fx - 7, fy - 1, 2, 0, Math.PI * 2); ctx.arc(fx + 7, fy - 1, 2, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = INK; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(fx, fy + 1, 3, 0.1 * Math.PI, 0.9 * Math.PI); ctx.stroke();
}
function drawHamster(x, y, now) {
  const dizzy = state === 'crash';
  const tilt = Math.max(-0.35, Math.min(0.35, (ball?.vx || 0) / 900));
  // 공(투명한 햄스터 볼)
  ctx.fillStyle = 'rgba(91,68,102,.15)';
  ctx.beginPath(); ctx.ellipse(x, y + BALL_R + 4, BALL_R * .9, 4, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(200,235,255,.55)';
  ctx.beginPath(); ctx.arc(x, y, BALL_R + 6, 0, Math.PI * 2); ctx.fill();
  // 햄스터
  ctx.save(); ctx.translate(x, y + 2); ctx.rotate(tilt);
  ctx.fillStyle = '#f7c78f';
  ctx.beginPath(); ctx.arc(-9, -11, 5, 0, Math.PI * 2); ctx.arc(9, -11, 5, 0, Math.PI * 2); ctx.fill();   // 귀
  ctx.fillStyle = '#ffb3c6';
  ctx.beginPath(); ctx.arc(-9, -11, 2.5, 0, Math.PI * 2); ctx.arc(9, -11, 2.5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#f7c78f';
  ctx.beginPath(); ctx.ellipse(0, 0, 15, 13, 0, 0, Math.PI * 2); ctx.fill();                                // 얼굴
  ctx.fillStyle = '#fff8ec';
  ctx.beginPath(); ctx.ellipse(0, 5, 9, 7, 0, 0, Math.PI * 2); ctx.fill();                                  // 입 주변
  ctx.fillStyle = 'rgba(255,128,160,.55)';
  ctx.beginPath(); ctx.arc(-10, 3, 3.2, 0, Math.PI * 2); ctx.arc(10, 3, 3.2, 0, Math.PI * 2); ctx.fill();   // 볼터치
  ctx.fillStyle = INK; ctx.strokeStyle = INK; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
  if (dizzy) {
    for (const ex of [-5.5, 5.5]) { ctx.beginPath(); ctx.moveTo(ex - 2.5, -4.5); ctx.lineTo(ex + 2.5, .5); ctx.moveTo(ex + 2.5, -4.5); ctx.lineTo(ex - 2.5, .5); ctx.stroke(); }
  } else {
    ctx.beginPath(); ctx.arc(-5.5, -2, 2.4, 0, Math.PI * 2); ctx.arc(5.5, -2, 2.4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(-4.8, -2.8, .9, 0, Math.PI * 2); ctx.arc(6.2, -2.8, .9, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = '#ff8fa8'; ctx.beginPath(); ctx.arc(0, 2.5, 1.6, 0, Math.PI * 2); ctx.fill();               // 코
  ctx.beginPath(); ctx.moveTo(-2.5, 5); ctx.quadraticCurveTo(0, 7, 0, 4.5); ctx.quadraticCurveTo(0, 7, 2.5, 5); ctx.stroke();
  ctx.restore();
  // 볼 테두리와 반짝임(굴러가며 돈다)
  ctx.strokeStyle = 'rgba(255,255,255,.95)'; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.arc(x, y, BALL_R + 6, 0, Math.PI * 2); ctx.stroke();
  ctx.save(); ctx.translate(x, y); ctx.rotate(ball ? ball.rot : 0);
  ctx.strokeStyle = 'rgba(140,190,255,.8)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(0, 0, BALL_R + 4, -0.6, 0.3); ctx.stroke();
  ctx.beginPath(); ctx.arc(0, 0, BALL_R + 4, Math.PI - 0.6, Math.PI + 0.3); ctx.stroke();
  ctx.restore();
  ctx.fillStyle = 'rgba(255,255,255,.9)';
  ctx.beginPath(); ctx.ellipse(x - 12, y - 14, 5, 3, -0.6, 0, Math.PI * 2); ctx.fill();
  if (dizzy) {
    const a = now / 180;
    ctx.fillStyle = '#ffd84d';
    for (let i = 0; i < 3; i++) star(x + Math.cos(a + i * 2.1) * 24, y - 30 + Math.sin(a + i * 2.1) * 6, 6);
  }
}
function outlinedText(text, x, y, font, fill) {
  ctx.font = font; ctx.lineJoin = 'round';
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 6; ctx.strokeText(text, x, y);
  ctx.fillStyle = fill; ctx.fillText(text, x, y);
}

function draw(now) {
  drawBg();
  if (walls) for (const w of walls) {
    drawWall(w, 0, w.gapX);
    drawWall(w, w.gapX + w.gapW, W - w.gapX - w.gapW);
    if (w.moving) drawFaceOnWall(w);
  }
  const shake = state === 'crash' && now - crashAt < 300 ? (Math.random() - .5) * 8 : 0;
  drawHamster((ball ? ball.x : W / 2) + shake, BALL_Y, now);
  if (state !== 'ready') {
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    outlinedText(`${(Math.floor(elapsed * 10) / 10).toFixed(1)}초`, W / 2, 18, '900 36px Pretendard, sans-serif', INK);
    outlinedText(`통과 ${passed}`, W / 2, 60, '700 14px Pretendard, sans-serif', '#a07bb0');
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
// 캔버스 바깥(양옆 여백)에서도 마우스를 따라가도록 무대 전체에서 받는다
stage.addEventListener('mousemove', e => { mouseX = Math.max(0, Math.min(W, canvasPoint(cv, W, e).x)); });
stage.addEventListener('mouseleave', () => { mouseX = null; });
veil.addEventListener('click', start);
