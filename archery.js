import { initGamePage, showResult, setupCanvas, canvasPoint } from './common.js?v=9';

initGamePage('archery');

const W = 720, H = 480;
const cv = document.getElementById('cv');
const ctx = setupCanvas(cv, W, H);
const veil = document.getElementById('veil');

const CX = W / 2, CY = 262, R = 180, RING = R / 10;
const SHOTS = 6, FULL_DRAW = 850;
// 발마다 난이도가 오른다: 최대 바람(m/s) · 당기는 중 떨림(px) · 다 당긴 뒤 버틸 때 떨림 증가(px/초)
const LEVELS = [
  { wind: 3, sway: 6, tire: 22 },
  { wind: 4, sway: 6, tire: 24 },
  { wind: 5, sway: 7, tire: 26 },
  { wind: 6, sway: 7, tire: 28 },
  { wind: 7, sway: 8, tire: 30 },
  { wind: 8.5, sway: 9, tire: 34 },
];
const level = () => LEVELS[Math.min(arrows.length, SHOTS - 1)];
const RING_COLORS = ['#f4f1e8', '#f4f1e8', '#2a2b33', '#2a2b33', '#3a8fd8', '#3a8fd8', '#e8473c', '#e8473c', '#f6cf3a', '#f6cf3a'];

let phase = 'ready';          // ready → aim → flying → (aim …) → done
let arrows, wind, mouse = { x: CX, y: CY }, holding = false, drawStart = 0;
let flight = null, popup = null, phases;

function newWind() {
  const max = level().wind;
  const speed = Math.round((max * 0.4 + Math.random() * max * 0.6) * 10) / 10;
  const angle = Math.random() * Math.PI * 2;
  return { speed, angle };
}
function start() {
  arrows = []; wind = newWind(); holding = false; flight = null; popup = null;
  phases = [Math.random() * 9, Math.random() * 9, Math.random() * 9, Math.random() * 9];
  phase = 'aim'; veil.hidden = true;
}
veil.addEventListener('click', start);

function power(t) { return holding ? Math.min(1, (t - drawStart) / FULL_DRAW) : 0; }
function sway(t) {
  const s = t / 1000;
  const lv = level();
  let amp = lv.sway + 5;
  if (holding) {
    const over = t - drawStart - FULL_DRAW;
    amp = over < 0 ? lv.sway : lv.sway + Math.min(70, over / 1000 * lv.tire);  // 오래 버티면 떨림이 커진다
  }
  return {
    x: amp * (Math.sin(s * 1.3 + phases[0]) * 0.65 + Math.sin(s * 3.1 + phases[1]) * 0.35),
    y: amp * (Math.sin(s * 1.7 + phases[2]) * 0.65 + Math.sin(s * 2.6 + phases[3]) * 0.35),
  };
}
// 조준점에 바람과 덜 당김을 더한 착지점
function landing(x, y, p) {
  const drift = wind.speed * 7.5;
  return { x: x + Math.cos(wind.angle) * drift, y: y + Math.sin(wind.angle) * drift + (1 - p) * 150 };
}
function gauss() { return (Math.random() + Math.random() + Math.random() - 1.5) / 1.5; }
function scoreAt(x, y) {
  const d = Math.hypot(x - CX, y - CY);
  if (d > R) return { s: 0, x10: false };
  return { s: Math.max(1, 10 - Math.floor(d / RING)), x10: d < RING / 2 };
}

cv.addEventListener('mousemove', e => { mouse = canvasPoint(cv, W, e); });
cv.addEventListener('mousedown', e => {
  if (phase !== 'aim' || e.button !== 0) return;
  mouse = canvasPoint(cv, W, e);
  holding = true; drawStart = performance.now();
});
window.addEventListener('mouseup', () => {
  if (!holding || phase !== 'aim') return;
  const t = performance.now();
  const p = power(t), sw = sway(t);
  holding = false;
  const hit = landing(mouse.x + sw.x, mouse.y + sw.y, p);
  const tx = hit.x + gauss() * 3;
  const ty = hit.y + gauss() * 3;
  flight = { tx, ty, t0: t };
  phase = 'flying';
});

function land(t) {
  const { s, x10 } = scoreAt(flight.tx, flight.ty);
  arrows.push({ x: flight.tx, y: flight.ty, s, x10 });
  popup = { x: flight.tx, y: flight.ty, text: s === 0 ? '빗나감' : x10 ? 'X 10' : String(s), t0: t };
  flight = null;
  if (arrows.length >= SHOTS) {
    phase = 'done';
    setTimeout(finish, 900);
  } else {
    setTimeout(() => { wind = newWind(); phase = 'aim'; }, 650);
    phase = 'wait';
  }
}
function finish() {
  const total = arrows.reduce((a, b) => a + b.s, 0);
  const xs = arrows.filter(a => a.x10).length;
  showResult('archery', total, {
    detail: `${arrows.map(a => a.x10 ? 'X' : a.s).join(' · ')}${xs ? ` (X ${xs}개)` : ''}`,
    extra: { shots: arrows.map(a => a.s), x: xs },
    onRetry: start,
  });
}

/* ---------- 그리기 ---------- */
function drawBg() {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#20314f'); g.addColorStop(.62, '#3c5a72'); g.addColorStop(.62, '#2f5a3a'); g.addColorStop(1, '#1f3d28');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // 과녁 받침
  ctx.fillStyle = '#6b4a2b';
  ctx.fillRect(CX - 120, CY + R - 20, 14, 140); ctx.fillRect(CX + 106, CY + R - 20, 14, 140);
}
function drawTarget() {
  ctx.fillStyle = '#c9b48a';
  ctx.beginPath(); ctx.arc(CX, CY, R + 12, 0, Math.PI * 2); ctx.fill();
  for (let i = 0; i < 10; i++) {
    const r = R - i * RING;
    ctx.fillStyle = RING_COLORS[i];
    ctx.beginPath(); ctx.arc(CX, CY, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = i === 2 || i === 3 ? 'rgba(255,255,255,.35)' : 'rgba(0,0,0,.28)';
    ctx.lineWidth = 1; ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(0,0,0,.35)';
  ctx.beginPath(); ctx.arc(CX, CY, RING / 2, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(CX - 4, CY); ctx.lineTo(CX + 4, CY); ctx.moveTo(CX, CY - 4); ctx.lineTo(CX, CY + 4); ctx.stroke();
}
function drawArrow(x, y, scale = 1) {
  ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale);
  ctx.strokeStyle = '#3b2a1a'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(9, 14); ctx.stroke();
  ctx.fillStyle = '#ff5c7a';
  ctx.beginPath(); ctx.moveTo(9, 14); ctx.lineTo(16, 14); ctx.lineTo(11, 22); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(0, 0, 3, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}
function drawHud(t) {
  // 발별 점수
  ctx.font = '700 15px Pretendard, sans-serif'; ctx.textBaseline = 'middle';
  for (let i = 0; i < SHOTS; i++) {
    const x = 18 + i * 40, y = 18;
    const a = arrows[i];
    ctx.fillStyle = a ? 'rgba(255,200,61,.92)' : 'rgba(255,255,255,.12)';
    roundRect(x, y, 34, 34, 8); ctx.fill();
    ctx.fillStyle = a ? '#1b1400' : 'rgba(255,255,255,.5)';
    ctx.textAlign = 'center';
    ctx.fillText(a ? (a.x10 ? 'X' : a.s) : i + 1, x + 17, y + 18);
  }
  const total = arrows.reduce((s, a) => s + a.s, 0);
  ctx.textAlign = 'left'; ctx.fillStyle = '#fff'; ctx.font = '800 22px Pretendard, sans-serif';
  ctx.fillText(`${total}점`, 18 + SHOTS * 40 + 8, 36);

  // 바람
  const wx = W - 70, wy = 50;
  ctx.fillStyle = 'rgba(0,0,0,.35)';
  ctx.beginPath(); ctx.arc(wx, wy, 34, 0, Math.PI * 2); ctx.fill();
  ctx.save(); ctx.translate(wx, wy); ctx.rotate(wind.angle);
  const len = 8 + wind.speed * 3;
  ctx.strokeStyle = '#3fd0c0'; ctx.fillStyle = '#3fd0c0'; ctx.lineWidth = 4; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-len, 0); ctx.lineTo(len - 6, 0); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(len + 4, 0); ctx.lineTo(len - 8, -8); ctx.lineTo(len - 8, 8); ctx.closePath(); ctx.fill();
  ctx.restore();
  ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.font = '700 14px Pretendard, sans-serif';
  ctx.fillText(`바람 ${wind.speed.toFixed(1)}m/s`, wx, wy + 50);

  // 당김 막대
  if (phase === 'aim') {
    const p = power(t);
    const bw = 220, bx = CX - bw / 2, by = H - 30;
    ctx.fillStyle = 'rgba(0,0,0,.4)'; roundRect(bx, by, bw, 12, 6); ctx.fill();
    ctx.fillStyle = p >= 1 ? '#3fd0c0' : '#ffc83d';
    if (p > 0) { roundRect(bx, by, bw * p, 12, 6); ctx.fill(); }
    ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.font = '600 13px Pretendard, sans-serif';
    ctx.fillText(holding ? (p >= 1 ? '지금 놓기!' : '당기는 중… 계속 누르고 있기') : '마우스를 꾹 누르고 있으면 활을 당겨요', CX, by - 12);
  }
}
function roundRect(x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
function drawCrosshair(t) {
  const sw = sway(t);
  const x = mouse.x + sw.x, y = mouse.y + sw.y;
  const p = power(t);
  const r = 18 - p * 8;
  ctx.strokeStyle = holding && p >= 1 ? '#3fd0c0' : '#fff';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x - r - 8, y); ctx.lineTo(x - r + 4, y); ctx.moveTo(x + r - 4, y); ctx.lineTo(x + r + 8, y);
  ctx.moveTo(x, y - r - 8); ctx.lineTo(x, y - r + 4); ctx.moveTo(x, y + r - 4); ctx.lineTo(x, y + r + 8);
  ctx.stroke();
  ctx.fillStyle = '#ff5c7a'; ctx.beginPath(); ctx.arc(x, y, 2.5, 0, Math.PI * 2); ctx.fill();
}

function frame(t) {
  drawBg(); drawTarget();
  if (arrows) arrows.forEach(a => drawArrow(a.x, a.y));
  if (phase !== 'ready') {
    if (flight) {
      const k = Math.min(1, (t - flight.t0) / 280);
      const x = CX + (flight.tx - CX) * k, y = H + 40 + (flight.ty - H - 40) * k;
      drawArrow(x, y, 3 - 2 * k);
      if (k >= 1) land(t);
    }
    if (popup && t - popup.t0 < 900) {
      const k = (t - popup.t0) / 900;
      ctx.globalAlpha = 1 - k;
      ctx.fillStyle = '#fff'; ctx.font = '900 30px Pretendard, sans-serif'; ctx.textAlign = 'center';
      ctx.strokeStyle = 'rgba(0,0,0,.6)'; ctx.lineWidth = 5;
      ctx.strokeText(popup.text, popup.x, popup.y - 26 - k * 30); ctx.fillText(popup.text, popup.x, popup.y - 26 - k * 30);
      ctx.globalAlpha = 1;
    }
    drawHud(t);
    if (phase === 'aim') drawCrosshair(t);
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
