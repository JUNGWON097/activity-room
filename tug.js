import { initGamePage, showResult, setupCanvas } from './common.js';

initGamePage('tug');

const W = 720, H = 360;
const cv = document.getElementById('cv');
const ctx = setupCanvas(cv, W, H);
const veil = document.getElementById('veil');

const DURATION = 10000, CPU_RATE = 7.6, PX_PER_TAP = 5, ROPE_Y = 210;

let state = 'ready';          // ready → count → play → done
let taps = 0, cpu = 0, t0 = 0, last = 0, offset = 0, recent = [], bump = 0;

function start() {
  taps = 0; cpu = 0; offset = 0; recent = []; bump = 0;
  state = 'count'; t0 = performance.now() + 3000; last = t0;
  veil.hidden = true;
}
function tap(now) {
  if (state === 'ready') return start();
  if (state !== 'play') return;
  taps++; recent.push(now); bump = 1;
}
function finish() {
  state = 'done';
  const win = taps > cpu;
  showResult('tug', taps, {
    detail: `초당 ${(taps / 10).toFixed(1)}회 · CPU에게 ${win ? '승리 🎉' : '패배'}`,
    extra: { cpu: Math.round(cpu), win },
    onRetry: start,
  });
}

function update(now) {
  if (state === 'count' && now >= t0) state = 'play';
  if (state === 'play') {
    const dt = (now - last) / 1000; last = now;
    // CPU는 일정한 힘에 약간의 출렁임을 섞어 당긴다
    cpu += dt * (CPU_RATE + Math.sin(now / 420) * 1.6);
    if (now - t0 >= DURATION) finish();
  }
  const target = Math.max(-260, Math.min(260, (cpu - taps) * PX_PER_TAP));
  offset += (target - offset) * 0.2;
  bump *= 0.85;
  recent = recent.filter(t => now - t < 1000);
}

function person(x, y, lean, color, flip) {
  ctx.save(); ctx.translate(x, y); ctx.scale(flip, 1); ctx.rotate(lean);
  ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 6; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(0, -62, 11, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.moveTo(0, -50); ctx.lineTo(0, -16); ctx.stroke();            // 몸
  ctx.beginPath(); ctx.moveTo(0, -16); ctx.lineTo(-12, 10); ctx.moveTo(0, -16); ctx.lineTo(14, 10); ctx.stroke(); // 다리
  ctx.beginPath(); ctx.moveTo(0, -42); ctx.lineTo(24, -30); ctx.stroke();           // 팔
  ctx.restore();
}

function draw(now) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#22284a'); g.addColorStop(.68, '#3a4470'); g.addColorStop(.68, '#2e5a3a'); g.addColorStop(1, '#203e29');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

  // 가운데 선과 승리선
  ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 3; ctx.setLineDash([10, 8]);
  ctx.beginPath(); ctx.moveTo(W / 2, 150); ctx.lineTo(W / 2, H); ctx.stroke(); ctx.setLineDash([]);

  const o = offset, pull = bump * 0.12;
  // 줄
  ctx.strokeStyle = '#d9b77a'; ctx.lineWidth = 7;
  ctx.beginPath(); ctx.moveTo(40 + o, ROPE_Y); ctx.lineTo(W - 40 + o, ROPE_Y); ctx.stroke();
  // 가운데 리본
  ctx.fillStyle = '#ff5c7a';
  ctx.beginPath(); ctx.moveTo(W / 2 + o, ROPE_Y); ctx.lineTo(W / 2 + o - 10, ROPE_Y + 34); ctx.lineTo(W / 2 + o + 10, ROPE_Y + 34); ctx.closePath(); ctx.fill();
  // 팀
  for (let i = 0; i < 3; i++) {
    person(110 + i * 62 + o, ROPE_Y + 34, -0.32 - pull, '#3fd0c0', 1);
    person(W - 110 - i * 62 + o, ROPE_Y + 34, -0.3, '#ff8fa3', -1);
  }
  ctx.font = '700 15px Pretendard, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = '#3fd0c0'; ctx.fillText('나', 172 + o, ROPE_Y + 64);
  ctx.fillStyle = '#ff8fa3'; ctx.fillText('CPU', W - 172 + o, ROPE_Y + 64);

  // 숫자
  ctx.fillStyle = '#fff'; ctx.font = `900 ${56 + bump * 10}px Pretendard, sans-serif`;
  ctx.fillText(taps, W / 2, 62);
  ctx.font = '600 14px Pretendard, sans-serif'; ctx.fillStyle = 'rgba(255,255,255,.7)';
  ctx.fillText(`초당 ${recent.length}회`, W / 2, 104);

  if (state === 'count') {
    const n = Math.ceil((t0 - now) / 1000);
    ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#ffc83d'; ctx.font = '900 110px Pretendard, sans-serif'; ctx.fillText(n, W / 2, H / 2);
  }
  if (state === 'play' || state === 'done') {
    const left = state === 'done' ? 0 : Math.max(0, DURATION - (now - t0));
    ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.fillRect(30, 18, W - 60, 10);
    ctx.fillStyle = left < 3000 ? '#ff5c7a' : '#ffc83d'; ctx.fillRect(30, 18, (W - 60) * left / DURATION, 10);
    ctx.fillStyle = '#fff'; ctx.font = '700 14px Pretendard, sans-serif'; ctx.textAlign = 'right';
    ctx.fillText(`${(left / 1000).toFixed(1)}초`, W - 30, 42);
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
