import { initGamePage, showResult, setupCanvas } from './common.js?v=8';

initGamePage('tug');

const W = 720, H = 380;
const cv = document.getElementById('cv');
const ctx = setupCanvas(cv, W, H);
const veil = document.getElementById('veil');

const DURATION = 10000, CPU_RATE = 6, PX_PER_TAP = 5, ROPE_Y = 268;
const INK = '#5b4466';

let state = 'ready';          // ready → count → play → done
let taps = 0, cpu = 0, t0 = 0, last = 0, offset = 0, recent = [], bump = 0, pops = [];

function start() {
  taps = 0; cpu = 0; offset = 0; recent = []; bump = 0; pops = [];
  state = 'count'; t0 = performance.now() + 3000; last = t0;
  veil.hidden = true;
}
function tap(now) {
  if (state === 'ready') return start();
  if (state !== 'play') return;
  taps++; recent.push(now); bump = 1;
  if (taps % 5 === 0) pops.push({ x: 150 + Math.random() * 140, y: 150, t: now, k: Math.random() < .5 ? '💦' : '💪' });
}
function finish() {
  state = 'done';
  const win = taps > cpu;
  showResult('tug', taps, {
    detail: `초당 ${(taps / 10).toFixed(1)}회 · 곰돌이 팀에게 ${win ? '승리 🎉' : '패배 🐻'}`,
    extra: { cpu: Math.round(cpu), win },
    onRetry: start,
  });
}

function update(now) {
  if (state === 'count' && now >= t0) state = 'play';
  if (state === 'play') {
    const dt = (now - last) / 1000; last = now;
    // 곰돌이 팀은 일정한 힘에 약간의 출렁임을 섞어 당긴다
    cpu += dt * (CPU_RATE + Math.sin(now / 420) * 1.2);
    if (now - t0 >= DURATION) finish();
  }
  const target = Math.max(-230, Math.min(230, (cpu - taps) * PX_PER_TAP));
  offset += (target - offset) * 0.2;
  bump *= 0.85;
  recent = recent.filter(t => now - t < 1000);
  pops = pops.filter(p => now - p.t < 700);
}

/* ---------- 그리기 ---------- */
function rr(x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
function heart(x, y, s) {
  ctx.beginPath(); ctx.moveTo(x, y + s * .9);
  ctx.bezierCurveTo(x - s * 1.6, y - s * .2, x - s * .6, y - s * 1.3, x, y - s * .4);
  ctx.bezierCurveTo(x + s * .6, y - s * 1.3, x + s * 1.6, y - s * .2, x, y + s * .9); ctx.fill();
}
// kind: 'cat' | 'bear', dir: 1이면 오른쪽을 본다
function critter(x, y, kind, dir, lean, effort, now, i) {
  const cat = kind === 'cat';
  const body = cat ? ['#ffd9a8', '#fff3e0', '#e8a86a'][i % 3] : ['#c99a74', '#b08060', '#d9b08c'][i % 3];
  const wob = Math.sin(now / 60 + i) * effort * 1.5;
  ctx.save(); ctx.translate(x, y); ctx.scale(dir, 1); ctx.rotate(-lean);
  ctx.fillStyle = 'rgba(91,68,102,.15)'; ctx.beginPath(); ctx.ellipse(0, 4, 24, 5, 0, 0, Math.PI * 2); ctx.fill();
  // 발
  ctx.fillStyle = body;
  ctx.beginPath(); ctx.ellipse(-10, 0, 7, 5, 0, 0, Math.PI * 2); ctx.ellipse(10, 0, 7, 5, 0, 0, Math.PI * 2); ctx.fill();
  // 몸통
  ctx.beginPath(); ctx.ellipse(0, -24, 22, 24, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = cat ? '#fffaf2' : '#ecd2b8';
  ctx.beginPath(); ctx.ellipse(3, -20, 12, 14, 0, 0, Math.PI * 2); ctx.fill();
  // 꼬리
  if (cat) {
    ctx.strokeStyle = body; ctx.lineWidth = 6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-20, -14); ctx.quadraticCurveTo(-36, -24 + wob * 3, -30, -40); ctx.stroke();
  }
  // 머리
  const hx = 4, hy = -56 + wob;
  ctx.fillStyle = body;
  if (cat) {
    ctx.beginPath(); ctx.moveTo(hx - 17, hy - 6); ctx.lineTo(hx - 13, hy - 26); ctx.lineTo(hx - 2, hy - 15); ctx.fill();
    ctx.beginPath(); ctx.moveTo(hx + 17, hy - 6); ctx.lineTo(hx + 13, hy - 26); ctx.lineTo(hx + 2, hy - 15); ctx.fill();
    ctx.fillStyle = '#ffb3c6';
    ctx.beginPath(); ctx.moveTo(hx - 13, hy - 9); ctx.lineTo(hx - 12, hy - 20); ctx.lineTo(hx - 6, hy - 14); ctx.fill();
    ctx.beginPath(); ctx.moveTo(hx + 13, hy - 9); ctx.lineTo(hx + 12, hy - 20); ctx.lineTo(hx + 6, hy - 14); ctx.fill();
  } else {
    ctx.beginPath(); ctx.arc(hx - 13, hy - 14, 7, 0, Math.PI * 2); ctx.arc(hx + 13, hy - 14, 7, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ecd2b8';
    ctx.beginPath(); ctx.arc(hx - 13, hy - 14, 3.5, 0, Math.PI * 2); ctx.arc(hx + 13, hy - 14, 3.5, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = body;
  ctx.beginPath(); ctx.ellipse(hx, hy, 20, 17, 0, 0, Math.PI * 2); ctx.fill();
  if (!cat) { ctx.fillStyle = '#ecd2b8'; ctx.beginPath(); ctx.ellipse(hx + 2, hy + 5, 8, 6, 0, 0, Math.PI * 2); ctx.fill(); }
  // 볼터치
  ctx.fillStyle = 'rgba(255,120,150,.5)';
  ctx.beginPath(); ctx.arc(hx - 11, hy + 4, 3.5, 0, Math.PI * 2); ctx.arc(hx + 13, hy + 4, 3.5, 0, Math.PI * 2); ctx.fill();
  // 눈: 힘줄 때는 > < 로 질끈
  ctx.strokeStyle = INK; ctx.fillStyle = INK; ctx.lineWidth = 2; ctx.lineCap = 'round';
  if (effort > .3) {
    ctx.beginPath(); ctx.moveTo(hx - 9, hy - 5); ctx.lineTo(hx - 4, hy - 2); ctx.lineTo(hx - 9, hy + 1); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(hx + 11, hy - 5); ctx.lineTo(hx + 6, hy - 2); ctx.lineTo(hx + 11, hy + 1); ctx.stroke();
  } else {
    ctx.beginPath(); ctx.arc(hx - 6, hy - 2, 2.6, 0, Math.PI * 2); ctx.arc(hx + 8, hy - 2, 2.6, 0, Math.PI * 2); ctx.fill();
  }
  // 코 · 입
  ctx.fillStyle = cat ? '#ff8fa8' : INK;
  ctx.beginPath(); ctx.arc(hx + 2, hy + 3, cat ? 1.8 : 2.4, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.moveTo(hx - 1, hy + 6); ctx.quadraticCurveTo(hx + 2, hy + 9, hx + 2, hy + 5); ctx.quadraticCurveTo(hx + 2, hy + 9, hx + 5, hy + 6); ctx.stroke();
  if (cat) {
    ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(91,68,102,.5)';
    ctx.beginPath(); ctx.moveTo(hx + 12, hy + 2); ctx.lineTo(hx + 22, hy); ctx.moveTo(hx + 12, hy + 5); ctx.lineTo(hx + 22, hy + 6); ctx.stroke();
  }
  // 앞발(줄 잡기)
  ctx.fillStyle = body;
  ctx.beginPath(); ctx.ellipse(20, -30, 7, 6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function draw(now) {
  // 하늘 · 잔디
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#cdeaff'); g.addColorStop(.62, '#fff1f6'); g.addColorStop(.62, '#bfe8b8'); g.addColorStop(1, '#a6dca0');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(255,255,255,.9)';
  for (const [cx, cy, s] of [[90, 60, 1], [600, 80, .8], [380, 40, .6]]) {
    ctx.beginPath(); ctx.arc(cx, cy, 18 * s, 0, Math.PI * 2); ctx.arc(cx + 20 * s, cy - 8 * s, 22 * s, 0, Math.PI * 2); ctx.arc(cx + 42 * s, cy, 16 * s, 0, Math.PI * 2); ctx.fill();
  }
  // 꽃
  for (let i = 0; i < 14; i++) {
    const fx = (i * 53 + 20) % W, fy = 300 + (i * 37) % 70;
    ctx.fillStyle = ['#ffb3c6', '#fff', '#ffe066'][i % 3];
    for (let p = 0; p < 5; p++) { ctx.beginPath(); ctx.arc(fx + Math.cos(p * 1.26) * 4, fy + Math.sin(p * 1.26) * 4, 3, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = '#ffb347'; ctx.beginPath(); ctx.arc(fx, fy, 2.2, 0, Math.PI * 2); ctx.fill();
  }

  // 가운데 선
  ctx.strokeStyle = 'rgba(255,255,255,.95)'; ctx.lineWidth = 4; ctx.setLineDash([10, 9]);
  ctx.beginPath(); ctx.moveTo(W / 2, 236); ctx.lineTo(W / 2, H); ctx.stroke(); ctx.setLineDash([]);

  const o = offset;
  const myEffort = Math.min(1, recent.length / 8), cpuEffort = state === 'play' ? .8 : 0;
  // 줄
  ctx.strokeStyle = '#e8c48c'; ctx.lineWidth = 8; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(60 + o, ROPE_Y); ctx.lineTo(W - 60 + o, ROPE_Y); ctx.stroke();
  ctx.strokeStyle = 'rgba(180,130,70,.5)'; ctx.lineWidth = 2; ctx.setLineDash([6, 6]);
  ctx.beginPath(); ctx.moveTo(60 + o, ROPE_Y); ctx.lineTo(W - 60 + o, ROPE_Y); ctx.stroke(); ctx.setLineDash([]);
  // 가운데 하트 리본
  ctx.fillStyle = '#ff7fa0'; heart(W / 2 + o, ROPE_Y + 14, 11);
  // 팀
  for (let i = 0; i < 3; i++) {
    critter(110 + i * 66 + o, ROPE_Y + 34, 'cat', 1, .18 + myEffort * .15 + bump * .05, myEffort, now, i);
    critter(W - 110 - i * 66 + o, ROPE_Y + 34, 'bear', -1, .2, cpuEffort, now, i);
  }
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = '800 15px Pretendard, sans-serif';
  ctx.fillStyle = '#fff'; rr(150 + o, ROPE_Y + 56, 80, 24, 12); ctx.fill();
  ctx.fillStyle = '#ff7fa0'; ctx.fillText('🐱 나', 190 + o, ROPE_Y + 68);
  ctx.fillStyle = '#fff'; rr(W - 230 + o, ROPE_Y + 56, 80, 24, 12); ctx.fill();
  ctx.fillStyle = '#a0704c'; ctx.fillText('🐻 곰돌이', W - 190 + o, ROPE_Y + 68);

  // 효과
  for (const p of pops) {
    const k = (now - p.t) / 700;
    ctx.globalAlpha = 1 - k; ctx.font = '22px sans-serif';
    ctx.fillText(p.k, p.x + o, p.y - k * 30);
    ctx.globalAlpha = 1;
  }

  // 숫자
  ctx.lineJoin = 'round';
  ctx.font = `900 ${58 + bump * 12}px Pretendard, sans-serif`;
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 9; ctx.strokeText(taps, W / 2, 70);
  ctx.fillStyle = '#ff7fa0'; ctx.fillText(taps, W / 2, 70);
  ctx.font = '700 14px Pretendard, sans-serif';
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 5; ctx.strokeText(`초당 ${recent.length}회`, W / 2, 112);
  ctx.fillStyle = INK; ctx.fillText(`초당 ${recent.length}회`, W / 2, 112);

  if (state === 'count') {
    const n = Math.ceil((t0 - now) / 1000);
    ctx.fillStyle = 'rgba(120,80,130,.45)'; ctx.fillRect(0, 0, W, H);
    ctx.font = '900 120px Pretendard, sans-serif';
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 12; ctx.strokeText(n, W / 2, H / 2);
    ctx.fillStyle = '#ff7fa0'; ctx.fillText(n, W / 2, H / 2);
  }
  if (state === 'play' || state === 'done') {
    const left = state === 'done' ? 0 : Math.max(0, DURATION - (now - t0));
    ctx.fillStyle = 'rgba(255,255,255,.85)'; rr(27, 15, W - 54, 16, 8); ctx.fill();
    ctx.fillStyle = left < 3000 ? '#ff7fa0' : '#7fdcb8';
    if (left > 0) { rr(30, 18, (W - 60) * left / DURATION, 10, 5); ctx.fill(); }
    ctx.textAlign = 'right'; ctx.font = '800 14px Pretendard, sans-serif';
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 4; ctx.strokeText(`${(left / 1000).toFixed(1)}초`, W - 30, 44);
    ctx.fillStyle = INK; ctx.fillText(`${(left / 1000).toFixed(1)}초`, W - 30, 44);
  }
}

function frame(now) { update(now); draw(now); requestAnimationFrame(frame); }
requestAnimationFrame(frame);

document.addEventListener('keydown', e => {
  if (document.querySelector('.overlay')) return;
  if (e.code === 'Space') { e.preventDefault(); if (!e.repeat) tap(performance.now()); }
});
cv.addEventListener('mousedown', e => { if (e.button === 0) tap(performance.now()); });
veil.addEventListener('click', start);
