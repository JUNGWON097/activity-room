import { initGamePage, showResult, setupCanvas, canvasPoint } from './common.js?v=35';

initGamePage('hue');

const W = 420, H = 580;
const GX = 14, GY = 150, GS = W - GX * 2;   // 판 위치 · 크기(정사각형)
const TIME = 30, PENALTY = 3;               // 30초, 틀리면 3초 깎임
const cv = document.getElementById('cv');
const ctx = setupCanvas(cv, W, H);
const veil = document.getElementById('veil');
const INK = '#5b4466';

let state = 'ready';   // ready → play → over → done
let found = 0, n = 2, odd = 0, base = '', oddCol = '', endAt = 0, shake = 0, flash = 0, pops = [], lastN = 2;

// 맞힐수록 칸이 많아지고(2×2 → 8×8) 색 차이가 줄어든다
const sizeFor = lv => Math.min(8, 2 + Math.floor(Math.sqrt(lv * 1.6)));
const diffFor = lv => Math.max(3, 22 * Math.pow(0.93, lv));   // 밝기 차이(%)

function newRound() {
  n = sizeFor(found);
  odd = Math.floor(Math.random() * n * n);
  // 사이트 분위기에 맞춘 파스텔 톤
  const h = Math.floor(Math.random() * 360), s = 50 + Math.random() * 25, l = 60 + Math.random() * 14;
  const d = diffFor(found) * (l + diffFor(found) > 88 || Math.random() < .5 ? -1 : 1);
  base = `hsl(${h} ${s}% ${l}%)`;
  oddCol = `hsl(${h} ${s}% ${l + d}%)`;
}
function start() {
  found = 0; shake = 0; flash = 0; pops = []; lastN = 2;
  newRound();
  endAt = performance.now() + TIME * 1000;
  state = 'play'; veil.hidden = true;
}
function cellRect(i) {
  const gap = n <= 4 ? 10 : 6, c = (GS - gap * (n - 1)) / n;
  return { x: GX + (i % n) * (c + gap), y: GY + Math.floor(i / n) * (c + gap), c };
}
function tap(p, now) {
  if (state !== 'play') return;
  for (let i = 0; i < n * n; i++) {
    const r = cellRect(i);
    if (p.x < r.x || p.x > r.x + r.c || p.y < r.y || p.y > r.y + r.c) continue;
    if (i === odd) {
      found++; flash = now;
      pops.push({ s: '+1', x: r.x + r.c / 2, y: r.y + r.c / 2, t: now, good: true });
      newRound();
    } else {
      endAt -= PENALTY * 1000; shake = now;
      pops.push({ s: `-${PENALTY}초`, x: r.x + r.c / 2, y: r.y + r.c / 2, t: now, good: false });
    }
    return;
  }
}
function finish() {
  state = 'over';
  setTimeout(() => {
    state = 'done';
    showResult('hue', found, { detail: `${n}×${n} 판까지 갔어요`, onRetry: start });
  }, 1400);
}

/* ---------- 그리기 ---------- */
function rr(x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
function draw(now) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#f4ecff'); g.addColorStop(1, '#ffe6f0');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

  const left = state === 'play' ? Math.max(0, endAt - now) / 1000 : state === 'ready' ? TIME : 0;
  if (state === 'play' && left <= 0) finish();

  // 점수 · 남은 시간
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = '900 46px Pretendard, sans-serif';
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 8; ctx.strokeText(state === 'ready' ? 0 : found, W / 2, 50);
  ctx.fillStyle = '#ff7fa0'; ctx.fillText(state === 'ready' ? 0 : found, W / 2, 50);
  ctx.fillStyle = 'rgba(91,68,102,.12)'; rr(GX, 96, GS, 16, 8); ctx.fill();
  const k = left / TIME;
  ctx.fillStyle = k < .2 ? (Math.floor(now / 200) % 2 ? '#ff5c7a' : '#ff9db0') : '#b49cff';
  if (k > 0) { rr(GX, 96, Math.max(16, GS * k), 16, 8); ctx.fill(); }
  ctx.font = '800 13px Pretendard, sans-serif'; ctx.fillStyle = INK;
  ctx.fillText(`${left.toFixed(1)}초`, W / 2, 128);

  // 판
  if (state !== 'ready') {
    const sx = shake && now - shake < 300 ? Math.sin((now - shake) / 18) * 6 * (1 - (now - shake) / 300) : 0;
    ctx.save(); ctx.translate(sx, 0);
    for (let i = 0; i < n * n; i++) {
      const r = cellRect(i);
      ctx.fillStyle = i === odd ? oddCol : base;
      rr(r.x, r.y, r.c, r.c, Math.min(16, r.c * .2)); ctx.fill();
      // 끝나면 정답 칸을 보여 준다
      if (state !== 'play' && i === odd) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 5; ctx.stroke(); ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.stroke(); }
    }
    ctx.restore();
  } else {
    // 시작 전 미리보기
    for (let i = 0; i < 4; i++) {
      const c = (GS - 10) / 2, x = GX + (i % 2) * (c + 10), y = GY + Math.floor(i / 2) * (c + 10);
      ctx.fillStyle = i === 2 ? '#ffb3c8' : '#ff9dba'; rr(x, y, c, c, 16); ctx.fill();
    }
  }

  for (const p of pops) {
    const t = (now - p.t) / 700;
    ctx.globalAlpha = Math.max(0, 1 - t); ctx.font = '900 24px Pretendard, sans-serif';
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 6; ctx.strokeText(p.s, p.x, p.y - t * 30);
    ctx.fillStyle = p.good ? INK : '#ff5c7a'; ctx.fillText(p.s, p.x, p.y - t * 30);
    ctx.globalAlpha = 1;
  }
  pops = pops.filter(p => now - p.t < 700);
  if (state === 'over' || state === 'done') {
    ctx.font = '900 34px Pretendard, sans-serif';
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 8; ctx.strokeText('시간 끝!', W / 2, GY - 2 + GS / 2);
    ctx.fillStyle = '#ff7fa0'; ctx.fillText('시간 끝!', W / 2, GY - 2 + GS / 2);
  }
}

function frame(now) { draw(now); requestAnimationFrame(frame); }
requestAnimationFrame(frame);

cv.addEventListener('pointerdown', e => {
  if (e.pointerType !== 'touch' && e.button !== 0) return;
  e.preventDefault();
  tap(canvasPoint(cv, W, e), performance.now());
});
document.addEventListener('keydown', e => {
  if (document.querySelector('.overlay')) return;
  if (e.code === 'Space' && state === 'ready') { e.preventDefault(); start(); }
});
veil.addEventListener('click', start);
