import { initGamePage, showResult, setupCanvas, canvasPoint } from './common.js?v=9';

initGamePage('stairs');

const W = 480, H = 640;
const cv = document.getElementById('cv');
const ctx = setupCanvas(cv, W, H);
const veil = document.getElementById('veil');

const STEP_W = 68, STEP_H = 20, SHIFT = 50, RISE = 46, PLAYER_Y = 470;
const INK = '#5b4466';
const CAKE = ['#ffd6e5', '#d9ccff', '#c8f0e0', '#ffe2b8'];

let state = 'ready';          // ready → play → over
let cols, idx, gauge, last, cam, pos, facing, overAt, overReason, fallY, hopAt = 0;
const clouds = Array.from({ length: 7 }, (_, i) => ({ x: Math.random() * W, y: i * 120 + Math.random() * 60, s: .7 + Math.random() * .6, v: 6 + Math.random() * 10 }));
const twinkles = Array.from({ length: 40 }, () => ({ x: Math.random() * W, y: Math.random() * H, p: Math.random() * 6 }));

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
  idx++; hopAt = performance.now();
  gauge = Math.min(100, gauge + 7);
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
  for (const c of clouds) { c.x += c.v * dt; if (c.x > W + 80) c.x = -80; }
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

/* ---------- 그리기 ---------- */
function rr(x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
function star(x, y, s) {
  ctx.beginPath();
  for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, r = i % 2 ? s * .35 : s; ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); }
  ctx.closePath(); ctx.fill();
}
function lerpColor(a, b, k) {
  const pa = a.match(/\w\w/g).map(h => parseInt(h, 16)), pb = b.match(/\w\w/g).map(h => parseInt(h, 16));
  return `rgb(${pa.map((v, i) => Math.round(v + (pb[i] - v) * k)).join(',')})`;
}
// 높이 오를수록 낮 → 노을 → 밤하늘
const SKY = [['#bfe6ff', '#fff3f8'], ['#ffc4d8', '#ffe8c7'], ['#b9a6ff', '#ffc7e0'], ['#3c3a78', '#8a6fc4']];
function skyAt(n) {
  const t = Math.min(SKY.length - 1.001, n / 80), i = Math.floor(t), k = t - i;
  return [lerpColor(SKY[i][0], SKY[i + 1][0], k), lerpColor(SKY[i][1], SKY[i + 1][1], k)];
}
function drawBg(now) {
  const [top, bottom] = skyAt(idx || 0);
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, top); g.addColorStop(1, bottom);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  const night = Math.max(0, Math.min(1, ((idx || 0) - 150) / 80));
  if (night > 0) {
    for (const t of twinkles) {
      ctx.fillStyle = `rgba(255,250,210,${night * (.4 + .6 * Math.abs(Math.sin(now / 600 + t.p)))})`;
      star(t.x, t.y, 2.5);
    }
  }
  const par = cam ? cam.y * 0.15 : 0;
  ctx.fillStyle = `rgba(255,255,255,${0.85 - night * .5})`;
  for (const c of clouds) {
    const y = ((c.y - par) % (H + 120) + H + 120) % (H + 120) - 60;
    ctx.beginPath();
    ctx.arc(c.x, y, 22 * c.s, 0, Math.PI * 2); ctx.arc(c.x + 24 * c.s, y - 10 * c.s, 26 * c.s, 0, Math.PI * 2);
    ctx.arc(c.x + 50 * c.s, y, 20 * c.s, 0, Math.PI * 2); ctx.rect(c.x, y, 50 * c.s, 20 * c.s);
    ctx.fill();
  }
}
function drawStep(i, x, y, now) {
  const next = i === idx + 1;
  const base = next ? '#ffe27a' : CAKE[i % CAKE.length];
  ctx.fillStyle = 'rgba(91,68,102,.15)'; rr(x + 2, y + 5, STEP_W, STEP_H, 9); ctx.fill();
  ctx.fillStyle = base; rr(x, y, STEP_W, STEP_H, 9); ctx.fill();
  // 위쪽 크림
  ctx.fillStyle = next ? '#fff6c8' : '#fffaf5';
  ctx.beginPath(); ctx.moveTo(x + 8, y + 1);
  ctx.lineTo(x + STEP_W - 8, y + 1); ctx.arcTo(x + STEP_W, y + 1, x + STEP_W, y + 9, 8);
  for (let k = 0; k < 4; k++) {
    const cx = x + STEP_W - 9 - k * 16.5;
    ctx.quadraticCurveTo(cx, y + 13 + (k % 2) * 3, cx - 8, y + 8);
  }
  ctx.arcTo(x, y + 1, x + 8, y + 1, 8); ctx.closePath(); ctx.fill();
  if (i <= idx) { ctx.fillStyle = 'rgba(255,255,255,.35)'; rr(x, y, STEP_W, STEP_H, 9); ctx.fill(); }
  if (next) {
    ctx.fillStyle = '#fff';
    const tw = .6 + .4 * Math.sin(now / 120);
    star(x + STEP_W - 6, y - 4, 5 * tw); star(x + 6, y - 2, 3.5 * (1.4 - tw));
  }
  if (i % 50 === 0 && i > 0) {
    ctx.fillStyle = INK; ctx.font = '800 12px Pretendard, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(`${i}층 🎉`, x + STEP_W / 2, y + STEP_H + 12);
  }
}
function drawChick(x, y, now) {
  const hopK = Math.max(0, 1 - (now - hopAt) / 160);
  const squash = state === 'play' ? 1 + hopK * .12 : 1;
  const dizzy = state === 'over';
  ctx.save(); ctx.translate(x, y + 8); ctx.scale(facing * (1 / squash), squash);
  // 그림자
  ctx.fillStyle = 'rgba(91,68,102,.18)'; ctx.beginPath(); ctx.ellipse(0, 6, 14, 3.5, 0, 0, Math.PI * 2); ctx.fill();
  // 발
  ctx.strokeStyle = '#ff9a3c'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-5, 0); ctx.lineTo(-5, 5); ctx.moveTo(5, 0); ctx.lineTo(5, 5); ctx.stroke();
  // 몸
  ctx.fillStyle = dizzy ? '#ffd5a8' : '#ffe066';
  ctx.beginPath(); ctx.ellipse(0, -14, 16, 15, 0, 0, Math.PI * 2); ctx.fill();
  // 머리 깃
  ctx.beginPath(); ctx.ellipse(-2, -30, 3, 6, -0.4, 0, Math.PI * 2); ctx.ellipse(3, -30, 2.5, 5, 0.4, 0, Math.PI * 2); ctx.fill();
  // 날개
  const flap = Math.sin(now / 70) * (state === 'play' && hopK > 0 ? .5 : .1);
  ctx.fillStyle = '#ffd23f';
  ctx.save(); ctx.translate(-12, -12); ctx.rotate(-0.4 - flap); ctx.beginPath(); ctx.ellipse(0, 0, 5, 8, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  // 볼터치 · 눈 · 부리
  ctx.fillStyle = 'rgba(255,120,150,.5)'; ctx.beginPath(); ctx.arc(10, -10, 3.2, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = INK; ctx.strokeStyle = INK; ctx.lineWidth = 1.6;
  if (dizzy) {
    ctx.beginPath(); ctx.moveTo(3, -20); ctx.lineTo(8, -15); ctx.moveTo(8, -20); ctx.lineTo(3, -15); ctx.stroke();
  } else {
    ctx.beginPath(); ctx.arc(6, -17, 2.6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(6.8, -18, 1, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = '#ff9a3c';
  ctx.beginPath(); ctx.moveTo(13, -15); ctx.lineTo(20, -12.5); ctx.lineTo(13, -10); ctx.closePath(); ctx.fill();
  ctx.restore();
  if (dizzy) {
    ctx.fillStyle = '#fff3a0';
    const a = now / 160;
    for (let i = 0; i < 3; i++) star(x + Math.cos(a + i * 2.1) * 20, y - 34 + Math.sin(a + i * 2.1) * 5, 5);
  }
}
function outlinedText(text, x, y, font, fill, line = 6) {
  ctx.font = font; ctx.lineJoin = 'round';
  ctx.strokeStyle = '#fff'; ctx.lineWidth = line; ctx.strokeText(text, x, y);
  ctx.fillStyle = fill; ctx.fillText(text, x, y);
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

  // 시간 막대 · 점수
  const bw = W - 60, bx = 30, by = 20;
  ctx.fillStyle = 'rgba(255,255,255,.8)'; rr(bx - 3, by - 3, bw + 6, 18, 9); ctx.fill();
  ctx.fillStyle = gauge > 35 ? '#7fdcb8' : gauge > 15 ? '#ffd23f' : '#ff7fa0';
  if (gauge > 1) { rr(bx, by, bw * gauge / 100, 12, 6); ctx.fill(); }
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  outlinedText(idx, W / 2, 46, '900 44px Pretendard, sans-serif', INK, 8);
  if (idx === 0 && state === 'play') {
    outlinedText('반짝이는 노란 계단 쪽 화살표를 누르세요', W / 2, 102, '700 15px Pretendard, sans-serif', INK, 5);
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
