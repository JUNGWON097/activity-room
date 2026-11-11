import { initGamePage, showResult, setupCanvas, canvasPoint } from './common.js?v=30';

initGamePage('snake');

const COLS = 20, ROWS = 14, C = 34, HUD = 46;
const W = COLS * C, H = ROWS * C + HUD;   // 680 × 522
const cv = document.getElementById('cv');
const ctx = setupCanvas(cv, W, H);
const veil = document.getElementById('veil');
const INK = '#5b4466';
const FRUITS = ['🍓', '🍎', '🍒', '🍇', '🍑', '🍊'];

let state = 'ready';   // ready → play → dead → done
let snake = [], prev = [], dir = { x: 1, y: 0 }, queue = [], food = null;
let eaten = 0, stepMs = 150, acc = 0, last = 0, deadAt = 0, pops = [], full = false;

function start() {
  snake = [{ x: 6, y: 7 }, { x: 5, y: 7 }, { x: 4, y: 7 }];
  prev = snake.map(s => ({ ...s }));
  dir = { x: 1, y: 0 }; queue = []; eaten = 0; stepMs = 150; acc = 0; pops = []; full = false;
  last = performance.now();
  placeFood();
  state = 'play'; veil.hidden = true;
}
function placeFood() {
  const free = [];
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++)
    if (!snake.some(s => s.x === x && s.y === y)) free.push({ x, y });
  if (!free.length) { food = null; return; }
  food = { ...free[Math.floor(Math.random() * free.length)], k: FRUITS[Math.floor(Math.random() * FRUITS.length)] };
}
function turn(dx, dy) {
  if (state === 'ready') return start();
  if (state !== 'play') return;
  const ref = queue.length ? queue[queue.length - 1] : dir;
  if ((ref.x === dx && ref.y === dy) || (ref.x === -dx && ref.y === -dy)) return;
  if (queue.length < 3) queue.push({ x: dx, y: dy });
}
function step(now) {
  if (queue.length) dir = queue.shift();
  const h = snake[0], n = { x: h.x + dir.x, y: h.y + dir.y };
  const grow = food && n.x === food.x && n.y === food.y;
  const body = grow ? snake : snake.slice(0, -1);
  if (n.x < 0 || n.y < 0 || n.x >= COLS || n.y >= ROWS || body.some(s => s.x === n.x && s.y === n.y)) return die(now);
  prev = snake.map(s => ({ ...s }));
  snake.unshift(n);
  if (grow) {
    eaten++;
    stepMs = Math.max(72, 150 - eaten * 2.5);
    pops.push({ x: n.x, y: n.y, t: now, k: food.k });
    placeFood();
    if (!food) { full = true; die(now); }
  } else snake.pop();
}
function die(now) {
  state = 'dead'; deadAt = now;
  setTimeout(() => {
    state = 'done';
    showResult('snake', eaten, {
      detail: full ? '판을 가득 채웠어요! 🎉' : `몸길이 ${snake.length}칸`,
      extra: { len: snake.length },
      onRetry: start,
    });
  }, 800);
}

function update(now) {
  if (state !== 'play') return;
  acc += now - last; last = now;
  if (acc > 400) acc = stepMs;          // 탭을 오래 비웠다 돌아온 경우
  while (acc >= stepMs && state === 'play') { acc -= stepMs; step(now); }
  pops = pops.filter(p => now - p.t < 700);
}

/* ---------- 그리기 ---------- */
function rr(x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
const cx = x => x * C + C / 2, cy = y => HUD + y * C + C / 2;

function draw(now) {
  // 상단 띠
  ctx.fillStyle = '#fff1f6'; ctx.fillRect(0, 0, W, HUD);
  ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
  ctx.font = '800 20px Pretendard, sans-serif'; ctx.fillStyle = INK;
  ctx.fillText(`🍓 ${eaten}개`, 18, HUD / 2);
  ctx.textAlign = 'right'; ctx.font = '700 14px Pretendard, sans-serif'; ctx.fillStyle = '#a07fae';
  ctx.fillText(`몸길이 ${snake.length || 3}칸 · 속도 ${Math.round(1000 / stepMs * 10) / 10}칸/초`, W - 18, HUD / 2);

  // 잔디 바둑판
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
    ctx.fillStyle = (x + y) % 2 ? '#c4eebb' : '#b5e6ab';
    ctx.fillRect(x * C, HUD + y * C, C, C);
  }

  // 과일
  if (food) {
    const bob = Math.sin(now / 220) * 2;
    ctx.fillStyle = 'rgba(91,68,102,.15)';
    ctx.beginPath(); ctx.ellipse(cx(food.x), cy(food.y) + C * .34, C * .26, C * .08, 0, 0, Math.PI * 2); ctx.fill();
    ctx.textAlign = 'center'; ctx.font = `${C * .78}px "Segoe UI Emoji", sans-serif`; ctx.fillStyle = '#000';
    ctx.fillText(food.k, cx(food.x), cy(food.y) + bob);
  }

  if (!snake.length) return;
  const t = state === 'play' ? Math.min(1, acc / stepMs) : 1;
  const pts = snake.map((s, i) => {
    const p = prev[i] || prev[prev.length - 1] || s;
    return { x: cx(p.x + (s.x - p.x) * t), y: cy(p.y + (s.y - p.y) * t) };
  });
  const blink = state === 'dead' && Math.floor((now - deadAt) / 120) % 2 === 0;

  // 몸통: 굵은 선으로 잇고 마디마다 원
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.strokeStyle = blink ? '#ffb3c6' : '#5cc596'; ctx.lineWidth = C * .74;
  ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); ctx.stroke();
  for (let i = pts.length - 1; i >= 1; i--) {
    ctx.fillStyle = blink ? '#ffc8d6' : (i % 2 ? '#7fdcb8' : '#6fd0aa');
    ctx.beginPath(); ctx.arc(pts[i].x, pts[i].y, C * .36, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.35)';
    ctx.beginPath(); ctx.arc(pts[i].x - C * .1, pts[i].y - C * .12, C * .1, 0, Math.PI * 2); ctx.fill();
  }

  // 머리
  const h = pts[0], d = dir;
  ctx.fillStyle = blink ? '#ffc8d6' : '#8ee6c2';
  ctx.beginPath(); ctx.arc(h.x, h.y, C * .48, 0, Math.PI * 2); ctx.fill();
  const px = -d.y, py = d.x;   // 진행 방향에 수직
  const ex = h.x + d.x * C * .12, ey = h.y + d.y * C * .12;
  ctx.fillStyle = 'rgba(255,120,150,.5)';
  for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(ex + px * s * C * .3 - d.x * C * .14, ey + py * s * C * .3 - d.y * C * .14 + 4, C * .08, 0, Math.PI * 2); ctx.fill(); }
  for (const s of [-1, 1]) {
    const x = ex + px * s * C * .2, y = ey + py * s * C * .2;
    if (state === 'dead') {
      ctx.strokeStyle = INK; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x - 3, y - 3); ctx.lineTo(x + 3, y + 3); ctx.moveTo(x + 3, y - 3); ctx.lineTo(x - 3, y + 3); ctx.stroke();
    } else {
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y, C * .13, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(x + d.x * 2, y + d.y * 2, C * .07, 0, Math.PI * 2); ctx.fill();
    }
  }
  // 혀
  if (state === 'play' && Math.floor(now / 400) % 3 === 0) {
    ctx.strokeStyle = '#ff6f91'; ctx.lineWidth = 2.4;
    const tx = h.x + d.x * C * .48, ty = h.y + d.y * C * .48;
    ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(tx + d.x * 7, ty + d.y * 7); ctx.stroke();
  }

  // +1 효과
  ctx.textAlign = 'center';
  for (const p of pops) {
    const k = (now - p.t) / 700;
    ctx.globalAlpha = 1 - k;
    ctx.font = '900 18px Pretendard, sans-serif';
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 4;
    ctx.strokeText('+1', cx(p.x), cy(p.y) - 14 - k * 24);
    ctx.fillStyle = '#ff7fa0'; ctx.fillText('+1', cx(p.x), cy(p.y) - 14 - k * 24);
    ctx.globalAlpha = 1;
  }
}

function frame(now) { update(now); draw(now); requestAnimationFrame(frame); }
requestAnimationFrame(frame);

const KEYS = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1], KeyA: [-1, 0], KeyD: [1, 0], KeyW: [0, -1], KeyS: [0, 1] };
document.addEventListener('keydown', e => {
  if (document.querySelector('.overlay')) return;
  if (KEYS[e.code]) { e.preventDefault(); turn(...KEYS[e.code]); }
  else if (e.code === 'Space') { e.preventDefault(); if (state === 'ready') start(); }
});
cv.addEventListener('mousedown', e => {
  if (e.button !== 0 || state !== 'play') return;
  const p = canvasPoint(cv, W, e), h = snake[0];
  const dx = p.x - cx(h.x), dy = p.y - cy(h.y);
  const cur = queue.length ? queue[queue.length - 1] : dir;
  if (cur.x !== 0) turn(0, dy < 0 ? -1 : 1); else turn(dx < 0 ? -1 : 1, 0);
});
veil.addEventListener('click', start);
