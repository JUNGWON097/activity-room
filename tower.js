import { initGamePage, showResult, setupCanvas } from './common.js?v=35';

initGamePage('tower');

const W = 420, H = 640;
const BH = 30;               // 층 높이
const BASE_W = 220;          // 처음 너비
const BASE_Y = H - 70;       // 바닥층 윗면(카메라 0일 때)
const PERFECT = 6;           // 이만큼 이내로 맞으면 딱 맞춘 것으로 친다
const cv = document.getElementById('cv');
const ctx = setupCanvas(cv, W, H);
const veil = document.getElementById('veil');
const INK = '#5b4466';

let state = 'ready';   // ready → play → over → done
let stack, mover, chips, pops, cam, camTo, combo, hue0, overAt, last;

const color = (i, l = 70) => `hsl(${(hue0 + i * 9) % 360} 75% ${l}%)`;
const speedFor = n => Math.min(560, 170 + n * 9);   // 올라갈수록 빨라진다

function start() {
  hue0 = Math.floor(Math.random() * 360);
  stack = [{ x: (W - BASE_W) / 2, w: BASE_W }];
  chips = []; pops = []; cam = camTo = 0; combo = 0;
  spawn();
  last = performance.now();
  state = 'play'; veil.hidden = true;
}
function spawn() {
  const top = stack[stack.length - 1], n = stack.length;
  const fromLeft = n % 2 === 1;
  mover = { x: fromLeft ? -top.w : W, w: top.w, dir: fromLeft ? 1 : -1, v: speedFor(n - 1) };
}
const yOf = i => BASE_Y - i * BH;   // i층 윗면 y(카메라 적용 전)

function drop(now) {
  if (state !== 'play') return;
  const top = stack[stack.length - 1], m = mover, i = stack.length;
  const L = Math.max(top.x, m.x), R = Math.min(top.x + top.w, m.x + m.w);
  if (R - L <= 0) {   // 완전히 빗나감
    chips.push({ x: m.x, y: yOf(i), w: m.w, vy: 0, vx: m.dir * 60, c: color(i), t: now });
    mover = null; state = 'over'; overAt = now;
    setTimeout(() => {
      state = 'done';
      const floors = stack.length - 1;
      showResult('tower', floors, { detail: `${floors}층까지 쌓았어요`, onRetry: start });
    }, 1100);
    return;
  }
  let nx = L, nw = R - L;
  if (Math.abs(m.x - top.x) <= Math.min(PERFECT, top.w * .15)) {   // 좁아지면 더 정확해야 한다
    // 딱 맞춤: 아래층 그대로. 연속으로 맞추면 조금씩 넓어진다
    nx = top.x; nw = top.w; combo++;
    if (combo >= 3) { const g = Math.min(10, BASE_W - nw); nx -= g / 2; nw += g; }
    pops.push({ s: combo >= 2 ? `딱 맞아요! ×${combo}` : '딱 맞아요!', x: nx + nw / 2, y: yOf(i) - BH, t: now });
  } else {
    combo = 0;
    // 삐져나온 조각은 떨어진다
    if (m.x < top.x) chips.push({ x: m.x, y: yOf(i), w: top.x - m.x, vy: 0, vx: -40, c: color(i), t: now });
    else chips.push({ x: top.x + top.w, y: yOf(i), w: m.x + m.w - (top.x + top.w), vy: 0, vx: 40, c: color(i), t: now });
  }
  nx = Math.max(0, Math.min(W - nw, nx));
  stack.push({ x: nx, w: nw, t: now });
  camTo = Math.max(0, (stack.length - 9) * BH);
  spawn();
}

function update(now) {
  const dt = Math.min(1 / 30, (now - last) / 1000); last = now;
  cam += (camTo - cam) * Math.min(1, dt * 6);
  for (const c of chips) { c.vy += 1500 * dt; c.y += c.vy * dt; c.x += c.vx * dt; }
  chips = chips.filter(c => c.y - cam < H + 60);
  pops = pops.filter(p => now - p.t < 900);
  if (state === 'play' && mover) {
    mover.x += mover.dir * mover.v * dt;
    if (mover.x + mover.w > W + 20 && mover.dir > 0) mover.dir = -1;
    if (mover.x < -20 && mover.dir < 0) mover.dir = 1;
  }
}

/* ---------- 그리기 ---------- */
function rr(x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
function block(x, y, w, c, i) {
  ctx.fillStyle = c; rr(x, y, w, BH - 2, 6); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.35)'; rr(x + 4, y + 4, Math.max(0, w - 8), 6, 3); ctx.fill();
  ctx.fillStyle = color(i, 58); rr(x, y + BH - 9, w, 7, 4); ctx.fill();
}
function draw(now) {
  // 높이 올라갈수록 하늘이 어두워진다
  const k = Math.min(1, cam / 2400);
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, `hsl(${265 - k * 30} ${60 + k * 10}% ${92 - k * 62}%)`);
  g.addColorStop(1, `hsl(${330 - k * 40} 80% ${94 - k * 50}%)`);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // 별(높이 올라가면 보인다)
  if (k > .3) {
    ctx.fillStyle = `rgba(255,255,255,${(k - .3) * 1.2})`;
    for (let s = 0; s < 40; s++) { const sx = (s * 97) % W, sy = ((s * 151) % H + cam * .2) % H; ctx.fillRect(sx, sy, 2, 2); }
  }

  ctx.save(); ctx.translate(0, cam);
  // 땅
  ctx.fillStyle = '#c8a6d8'; ctx.fillRect(-10, BASE_Y + BH, W + 20, 400);
  stack.forEach((b, i) => {
    let y = yOf(i);
    if (b.t && now - b.t < 120) y -= 4 * (1 - (now - b.t) / 120);
    block(b.x, y, b.w, color(i), i);
  });
  for (const c of chips) { ctx.globalAlpha = .85; block(c.x, c.y, c.w, c.c, 0); ctx.globalAlpha = 1; }
  if (mover) block(mover.x, yOf(stack.length), mover.w, color(stack.length), stack.length);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (const p of pops) {
    const t = (now - p.t) / 900;
    ctx.globalAlpha = 1 - t; ctx.font = '900 20px Pretendard, sans-serif';
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 5; ctx.strokeText(p.s, p.x, p.y - t * 30);
    ctx.fillStyle = '#ff7fa0'; ctx.fillText(p.s, p.x, p.y - t * 30);
    ctx.globalAlpha = 1;
  }
  ctx.restore();

  // 층수
  if (state !== 'ready') {
    const floors = stack.length - 1;
    ctx.textAlign = 'center'; ctx.font = '900 54px Pretendard, sans-serif';
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 9; ctx.strokeText(floors, W / 2, 62);
    ctx.fillStyle = '#ff7fa0'; ctx.fillText(floors, W / 2, 62);
    ctx.font = '800 14px Pretendard, sans-serif'; ctx.fillStyle = k > .5 ? '#fff' : INK; ctx.fillText('층', W / 2, 100);
  }
  if (state === 'over') {
    ctx.font = '900 34px Pretendard, sans-serif'; ctx.textAlign = 'center';
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 8; ctx.strokeText('와르르!', W / 2, H / 2);
    ctx.fillStyle = '#ff7fa0'; ctx.fillText('와르르!', W / 2, H / 2);
  }
}

function frame(now) { update(now); draw(now); requestAnimationFrame(frame); }
start(); state = 'ready'; veil.hidden = false;   // 시작 전에도 바닥층이 보이게
requestAnimationFrame(frame);

cv.addEventListener('pointerdown', e => {
  if (e.pointerType !== 'touch' && e.button !== 0) return;
  e.preventDefault();
  drop(performance.now());
});
document.addEventListener('keydown', e => {
  if (document.querySelector('.overlay')) return;
  if (e.code === 'Space' || e.code === 'Enter') {
    e.preventDefault();
    if (state === 'ready') start(); else if (!e.repeat) drop(performance.now());
  }
});
veil.addEventListener('click', start);
