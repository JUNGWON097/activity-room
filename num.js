import { initGamePage, showResult, setupCanvas, canvasPoint } from './common.js?v=63';

initGamePage('num');

const W = 420, H = 580;
const N = 5, COUNT = N * N;                 // 5×5 판, 1~25
const GX = 14, GY = 150, GS = W - GX * 2, GAP = 8;
const CELL = (GS - GAP * (N - 1)) / N;
const PENALTY = 1;                          // 틀린 숫자를 누르면 1초 더해진다
const cv = document.getElementById('cv');
const ctx = setupCanvas(cv, W, H);
const veil = document.getElementById('veil');
const INK = '#5b4466';
const TINTS = ['#ffd6e4', '#ffe3c2', '#fff2b8', '#d4f5dc', '#d6ecff', '#e6dcff'];

let state = 'ready';   // ready → play → over → done
let board = [], tints = [], sizes = [], next = 1, startAt = 0, penalty = 0, endTime = 0, shake = 0, shakeCell = -1, pops = [], hits = {};

function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
// 색이 길잡이가 되지 않게: 이어지는 숫자끼리, 바로 옆 칸끼리, 같은 색이 오지 않게 고른다
function makeTints() {
  for (let tries = 0; tries < 200; tries++) {
    const t = new Array(COUNT), at = {};
    board.forEach((v, i) => { at[v] = i; });
    let ok = true;
    for (let i = 0; i < COUNT && ok; i++) {
      const v = board[i], ban = new Set();
      const r = Math.floor(i / N), c = i % N;
      for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
        const rr = r + dr, cc = c + dc;
        if (rr >= 0 && rr < N && cc >= 0 && cc < N && t[rr * N + cc]) ban.add(t[rr * N + cc]);
      }
      for (const u of [v - 1, v + 1, v - 2, v + 2]) if (t[at[u]]) ban.add(t[at[u]]);
      const pick = TINTS.filter(x => !ban.has(x));
      if (!pick.length) { ok = false; break; }
      t[i] = pick[Math.floor(Math.random() * pick.length)];
    }
    if (ok) return t;
  }
  return board.map((_, i) => TINTS[i % TINTS.length]);
}
function start() {
  board = shuffle(Array.from({ length: COUNT }, (_, i) => i + 1));
  tints = makeTints();
  sizes = board.map(() => .3 + Math.random() * .2);   // 글자 크기도 칸마다 조금씩 다르게
  next = 1; penalty = 0; shake = 0; shakeCell = -1; pops = []; hits = {};
  startAt = performance.now();
  state = 'play'; veil.hidden = true;
}
const elapsed = now => state === 'play' ? (now - startAt) / 1000 + penalty : endTime;
function cellRect(i) { return { x: GX + (i % N) * (CELL + GAP), y: GY + Math.floor(i / N) * (CELL + GAP) }; }

function tap(p, now) {
  if (state !== 'play') return;
  for (let i = 0; i < COUNT; i++) {
    const r = cellRect(i);
    if (p.x < r.x || p.x > r.x + CELL || p.y < r.y || p.y > r.y + CELL) continue;
    const v = board[i];
    if (v < next) return;                     // 이미 누른 칸은 무시
    if (v === next) {
      hits[i] = now; next++;
      if (next > COUNT) finish(now);
    } else {
      penalty += PENALTY; shake = now; shakeCell = i;
      pops.push({ s: `+${PENALTY}초`, x: r.x + CELL / 2, y: r.y + CELL / 2, t: now });
    }
    return;
  }
}
function finish(now) {
  endTime = Math.floor(((now - startAt) / 1000 + penalty) * 100) / 100;
  state = 'over';
  setTimeout(() => {
    state = 'done';
    showResult('num', endTime, { detail: penalty ? `틀려서 ${penalty}초가 더해졌어요` : '한 번도 안 틀렸어요!', onRetry: toReady });
  }, 1000);
}
// 다시 하기: 바로 시작하지 않고 처음처럼 '눌러서 시작' 화면으로 돌아간다
function toReady() { state = 'ready'; endTime = 0; pops = []; veil.hidden = false; }

/* ---------- 그리기 ---------- */
function rr(x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
function outlined(s, x, y, font, fill, lw = 8) {
  ctx.font = font; ctx.strokeStyle = '#fff'; ctx.lineWidth = lw; ctx.lineJoin = 'round';
  ctx.strokeText(s, x, y); ctx.fillStyle = fill; ctx.fillText(s, x, y);
}
function draw(now) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#eef6ff'); g.addColorStop(1, '#fff0f6');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const t = state === 'ready' ? 0 : elapsed(now);
  outlined(t.toFixed(2), W / 2, 52, '900 46px Pretendard, sans-serif', '#4c9dff');
  if (state === 'play') {
    ctx.font = '800 15px Pretendard, sans-serif'; ctx.fillStyle = INK;
    ctx.fillText('다음 숫자', W / 2 - 34, 112);
    outlined(String(next), W / 2 + 30, 112, '900 28px Pretendard, sans-serif', '#ff7fa0', 6);
  } else if (state === 'ready') {
    ctx.font = '800 15px Pretendard, sans-serif'; ctx.fillStyle = INK;
    ctx.fillText('1부터 25까지 순서대로', W / 2, 112);
  }

  // 판
  for (let i = 0; i < COUNT; i++) {
    const r = cellRect(i);
    let x = r.x, y = r.y;
    if (state === 'ready') {
      ctx.fillStyle = 'rgba(91,68,102,.08)'; rr(x, y, CELL, CELL, 14); ctx.fill();
      continue;
    }
    const v = board[i], done = v < next;
    if (i === shakeCell && now - shake < 300) x += Math.sin((now - shake) / 18) * 5 * (1 - (now - shake) / 300);
    // 누른 칸은 쏙 들어가며 흐려진다
    const hk = hits[i] ? Math.min(1, (now - hits[i]) / 160) : 0;
    const s = done ? 1 - .12 * hk : 1, ox = CELL * (1 - s) / 2;
    if (!done) { ctx.fillStyle = 'rgba(91,68,102,.14)'; rr(x, y + 4, CELL, CELL, 14); ctx.fill(); }
    ctx.globalAlpha = done ? 1 - .7 * hk : 1;
    ctx.fillStyle = done ? '#ffffff' : tints[i]; rr(x + ox, y + ox, CELL * s, CELL * s, 14); ctx.fill();
    ctx.font = `900 ${CELL * (done ? .4 : sizes[i])}px Pretendard, sans-serif`;
    ctx.fillStyle = done ? '#c9bcd6' : INK;
    ctx.fillText(String(v), x + CELL / 2, y + CELL / 2 + 2);
    ctx.globalAlpha = 1;
  }

  for (const p of pops) {
    const k = (now - p.t) / 700;
    ctx.globalAlpha = Math.max(0, 1 - k);
    outlined(p.s, p.x, p.y - k * 30, '900 22px Pretendard, sans-serif', '#ff5c7a', 6);
    ctx.globalAlpha = 1;
  }
  pops = pops.filter(p => now - p.t < 700);
  if (state === 'over' || state === 'done') outlined('완료!', W / 2, GY + GS / 2, '900 40px Pretendard, sans-serif', '#4c9dff', 9);
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
