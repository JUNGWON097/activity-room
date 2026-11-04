import { initGamePage, showResult, setupCanvas, canvasPoint } from './common.js?v=17';

initGamePage('merge');

const W = 420, H = 640;
const L = 22, R = W - 22, FLOOR = H - 18, LINE = 178, AIM = 128;
const cv = document.getElementById('cv');
const ctx = setupCanvas(cv, W, H);
const veil = document.getElementById('veil');
const INK = '#5b4466';

const FRUIT = ['🍒', '🍓', '🍇', '🍋', '🍊', '🍎', '🍐', '🍑', '🍍', '🍈', '🍉'];
const RAD = [15, 20, 26, 32, 39, 47, 55, 64, 74, 85, 98];
const COL = ['#ffd0d8', '#ffc9cf', '#e3d4ff', '#fff3a8', '#ffdcb0', '#ffc9c2', '#e9f7c4', '#ffe0d2', '#fff0b0', '#dcf5c8', '#c9f2cf'];
const PTS = [0, 1, 3, 6, 10, 15, 21, 28, 36, 45, 55];
const G = 1700, E = 0.12, SUB = 6;

let state = 'ready';   // ready → play → over → done
let fruits = [], cur = 0, next = 0, aimX = W / 2, score = 0, coolUntil = 0, overT = 0, last = 0, pops = [], best = 0;
const keys = {};

const pick = () => Math.floor(Math.random() * 5);
function start() {
  fruits = []; cur = pick(); next = pick(); aimX = W / 2; score = 0; coolUntil = 0; overT = 0; pops = []; best = 0;
  last = performance.now();
  state = 'play'; veil.hidden = true;
}
function clampAim() { const r = RAD[cur]; aimX = Math.max(L + r, Math.min(R - r, aimX)); }
function dropFruit(now) {
  if (state !== 'play' || now < coolUntil) return;
  clampAim();
  fruits.push({ lv: cur, x: aimX + (Math.random() - .5) * .5, y: AIM, vx: 0, vy: 0, r: RAD[cur], born: now, pop: 0 });
  cur = next; next = pick(); coolUntil = now + 450;
}

function physics(dt, now) {
  const h = dt / SUB;
  for (let s = 0; s < SUB; s++) {
    for (const f of fruits) { f.vy += G * h; f.x += f.vx * h; f.y += f.vy * h; }
    const merges = [];
    for (let it = 0; it < 2; it++) {
      for (let i = 0; i < fruits.length; i++) {
        const a = fruits[i]; if (a.dead) continue;
        for (let j = i + 1; j < fruits.length; j++) {
          const b = fruits[j]; if (b.dead) continue;
          const dx = b.x - a.x, dy = b.y - a.y, rr = a.r + b.r, d2 = dx * dx + dy * dy;
          if (d2 >= rr * rr || d2 < 1e-6) continue;
          if (a.lv === b.lv) { a.dead = b.dead = true; merges.push([a, b]); continue; }
          const d = Math.sqrt(d2), nx = dx / d, ny = dy / d, ov = rr - d;
          const ia = 1 / (a.r * a.r), ib = 1 / (b.r * b.r), sum = ia + ib;
          a.x -= nx * ov * ia / sum; a.y -= ny * ov * ia / sum;
          b.x += nx * ov * ib / sum; b.y += ny * ov * ib / sum;
          const vn = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
          if (vn < 0) {
            const jn = -(1 + E) * vn / sum;
            a.vx -= jn * ia * nx; a.vy -= jn * ia * ny; b.vx += jn * ib * nx; b.vy += jn * ib * ny;
            // 맞닿은 면 미끄럼을 조금 줄인다
            const tx = -ny, ty = nx, vt = (b.vx - a.vx) * tx + (b.vy - a.vy) * ty, jt = vt * .04 / sum;
            a.vx += jt * ia * tx; a.vy += jt * ia * ty; b.vx -= jt * ib * tx; b.vy -= jt * ib * ty;
          }
        }
      }
      for (const f of fruits) {
        if (f.x - f.r < L) { f.x = L + f.r; if (f.vx < 0) f.vx *= -.2; }
        if (f.x + f.r > R) { f.x = R - f.r; if (f.vx > 0) f.vx *= -.2; }
        if (f.y + f.r > FLOOR) { f.y = FLOOR - f.r; if (f.vy > 0) f.vy *= -.15; f.vx *= .985; }
      }
    }
    if (merges.length) {
      for (const [a, b] of merges) {
        const x = (a.x + b.x) / 2, y = (a.y + b.y) / 2;
        if (a.lv === FRUIT.length - 1) {
          score += 100;
          pops.push({ x, y, t: now, s: '+100 🎉' });
        } else {
          const lv = a.lv + 1;
          score += PTS[lv];
          best = Math.max(best, lv);
          fruits.push({ lv, x, y, vx: (a.vx + b.vx) / 2, vy: (a.vy + b.vy) / 2, r: RAD[lv], born: now - 2000, pop: now });
          pops.push({ x, y, t: now, s: `+${PTS[lv]}` });
        }
      }
      fruits = fruits.filter(f => !f.dead);
    }
    for (const f of fruits) { f.vx *= .9995; f.vy *= .9995; }
  }
}

function update(now) {
  const dt = Math.min(1 / 30, (now - last) / 1000); last = now;
  pops = pops.filter(p => now - p.t < 800);
  if (state !== 'play' && state !== 'over') return;
  if (state === 'play') {
    if (keys.left) aimX -= 320 * dt;
    if (keys.right) aimX += 320 * dt;
    clampAim();
  }
  physics(dt, now);
  if (state !== 'play') return;
  // 점선 위에 1.2초 넘게 머문 과일이 2초 동안 있으면 끝
  const danger = fruits.some(f => now - f.born > 1200 && f.y - f.r < LINE);
  overT = danger ? overT + dt : Math.max(0, overT - dt * 2);
  if (overT > 2) {
    state = 'over';
    setTimeout(() => {
      state = 'done';
      showResult('merge', score, { detail: `가장 큰 과일 ${FRUIT[best]}`, extra: { best }, onRetry: start });
    }, 900);
  }
}

/* ---------- 그리기 ---------- */
function rr(x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
function fruit(lv, x, y, r, alpha = 1) {
  ctx.globalAlpha = alpha;
  ctx.fillStyle = COL[lv]; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(91,68,102,.18)'; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = `${Math.round(r * 1.45)}px "Segoe UI Emoji", "Apple Color Emoji", sans-serif`; ctx.fillStyle = '#000';
  ctx.fillText(FRUIT[lv], x, y + r * .08);
  ctx.globalAlpha = 1;
}
function draw(now) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#fff4e0'); g.addColorStop(1, '#ffe3ec');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

  // 상자
  ctx.fillStyle = 'rgba(255,255,255,.75)'; rr(L - 8, LINE - 30, R - L + 16, FLOOR - LINE + 38, 18); ctx.fill();
  ctx.fillStyle = '#e9c9a0'; rr(L - 8, FLOOR, R - L + 16, 12, 6); ctx.fill();

  // 위험선
  const warn = state === 'play' && overT > 0;
  ctx.strokeStyle = warn && Math.floor(now / 150) % 2 ? '#ff5c7a' : 'rgba(255,127,160,.55)';
  ctx.lineWidth = 2.5; ctx.setLineDash([8, 7]);
  ctx.beginPath(); ctx.moveTo(L, LINE); ctx.lineTo(R, LINE); ctx.stroke(); ctx.setLineDash([]);

  // 조준
  if (state === 'play') {
    const r = RAD[cur];
    ctx.strokeStyle = 'rgba(91,68,102,.18)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(aimX, AIM + r); ctx.lineTo(aimX, FLOOR); ctx.stroke();
    if (now >= coolUntil) fruit(cur, aimX, AIM, r);
  }

  for (const f of fruits) {
    const k = f.pop ? Math.min(1, (now - f.pop) / 160) : 1;
    fruit(f.lv, f.x, f.y, f.r * (.7 + .3 * k));
  }

  // 점수 · 다음
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.font = '900 30px Pretendard, sans-serif';
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 7; ctx.strokeText(score, 22, 34);
  ctx.fillStyle = '#ff7fa0'; ctx.fillText(score, 22, 34);
  ctx.fillStyle = 'rgba(255,255,255,.85)'; rr(W - 92, 12, 74, 48, 14); ctx.fill();
  ctx.fillStyle = '#a07fae'; ctx.font = '800 12px Pretendard, sans-serif'; ctx.fillText('다음', W - 84, 36);
  fruit(next, W - 38, 36, Math.min(16, RAD[next]));

  // 진화 순서
  const sz = 15, step = (W - 40) / FRUIT.length;
  ctx.font = `${sz}px "Segoe UI Emoji", sans-serif`; ctx.textAlign = 'center'; ctx.fillStyle = '#000';
  FRUIT.forEach((f, i) => { ctx.globalAlpha = i <= best ? 1 : .35; ctx.fillText(f, 20 + step * (i + .5), 74); });
  ctx.globalAlpha = 1;

  ctx.textAlign = 'center';
  for (const p of pops) {
    const k = (now - p.t) / 800;
    ctx.globalAlpha = 1 - k; ctx.font = '900 20px Pretendard, sans-serif';
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 5; ctx.strokeText(p.s, p.x, p.y - k * 36);
    ctx.fillStyle = INK; ctx.fillText(p.s, p.x, p.y - k * 36);
    ctx.globalAlpha = 1;
  }
  if (state === 'over') {
    ctx.font = '900 34px Pretendard, sans-serif';
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 8; ctx.strokeText('넘쳤어요!', W / 2, H / 2);
    ctx.fillStyle = '#ff7fa0'; ctx.fillText('넘쳤어요!', W / 2, H / 2);
  }
}

function frame(now) { update(now); draw(now); requestAnimationFrame(frame); }
requestAnimationFrame(frame);

cv.addEventListener('pointermove', e => { if (state === 'play') { aimX = canvasPoint(cv, W, e).x; clampAim(); } });
cv.addEventListener('pointerdown', e => {
  if (e.button !== 0 || state !== 'play') return;
  aimX = canvasPoint(cv, W, e).x; dropFruit(performance.now());
});
document.addEventListener('keydown', e => {
  if (document.querySelector('.overlay')) return;
  if (e.code === 'ArrowLeft' || e.code === 'KeyA') { keys.left = true; e.preventDefault(); }
  if (e.code === 'ArrowRight' || e.code === 'KeyD') { keys.right = true; e.preventDefault(); }
  if (e.code === 'Space') {
    e.preventDefault();
    if (state === 'ready') start(); else if (!e.repeat) dropFruit(performance.now());
  }
});
document.addEventListener('keyup', e => {
  if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.left = false;
  if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.right = false;
});
veil.addEventListener('click', start);
