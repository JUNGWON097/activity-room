import { initGamePage, showResult, setupCanvas } from './common.js?v=34';

initGamePage('run');

const W = 420, H = 640;
const HOR = 210;                    // 지평선 높이
const F = 330;                      // 원근 배율
const CAM_H = 2.6, Z_OFF = 2.6;     // 카메라 높이 · 토끼 뒤로 물러난 거리
const LANE = 1.05, HALF = 1.65;     // 칸 너비 · 길 반폭
const SPEED = 16;                   // 달리는 속도(m/초) — 끝까지 같다
const VIEW = 70;                    // 보이는 거리
const JUMP_T = .56, JUMP_H = 1.2, DUCK_T = .56;
const G = 2 * JUMP_H / (JUMP_T / 2) ** 2, V0 = G * JUMP_T / 2;
const WIN = 19;                     // 모퉁이 몇 m 앞부터 방향 틀기를 받는지
const cv = document.getElementById('cv');
const ctx = setupCanvas(cv, W, H);
const veil = document.getElementById('veil');
const INK = '#5b4466';

let state = 'ready';   // ready → play → over → done
let dist = 0, seg = null, obs = [], lane = 0, px = 0, py = 0, vy = 0, duckAt = -1e9, duckQ = false;
let turns = 0, turnAt = -1e9, turnDir = 0, overAt = 0, how = '', last = 0;

const P = (x, z, h = 0) => { const s = F / (z + Z_OFF); return [W / 2 + x * s, HOR + (CAM_H - h) * s, s]; };
const ducking = now => now - duckAt < DUCK_T * 1000;
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

/* ---------- 길 만들기 ---------- */
// 멀리 갈수록 장애물 사이가 좁아지고 종류가 늘어난다(속도는 그대로)
const gapFor = d => Math.max(10.5, 24 - d / 35);
const PATTERNS = [['block1', 0], ['low', 0], ['block2', 70], ['high', 140], ['gap', 240], ['blockLow', 400], ['blockHigh', 560], ['zigzag', 720]];
const ALL = [-1, 0, 1];

function addRow(z) {
  const ok = PATTERNS.filter(p => z >= p[1]);
  const k = ok[Math.floor(Math.random() * ok.length)][0];
  const l = shuffle([...ALL]);
  const put = (kind, lanes, at = z) => obs.push({ z: at, kind, lanes, d: kind === 'block' ? .8 : kind === 'gap' ? 2.4 : .35 });
  if (k === 'block1') put('block', [l[0]]);
  else if (k === 'block2') put('block', [l[0], l[1]]);
  else if (k === 'low') put('low', ALL);
  else if (k === 'high') put('high', ALL);
  else if (k === 'gap') put('gap', ALL);
  else if (k === 'blockLow') { put('block', [l[0], l[1]]); put('low', [l[2]]); }
  else if (k === 'blockHigh') { put('block', [l[0], l[1]]); put('high', [l[2]]); }
  else if (k === 'zigzag') {   // 열린 칸이 바로 이어서 바뀐다
    put('block', [l[0], l[1]]);
    const open2 = l[2] === 0 ? (Math.random() < .5 ? -1 : 1) : 0;
    put('block', ALL.filter(v => v !== open2), z + 9);
    return 9;
  }
  return 0;
}
function makeSeg(s0) {
  const len = Math.max(80, 160 - s0 / 10) + Math.random() * 30;
  const r = Math.random();
  seg = { s: s0, e: s0 + len, turn: r < .4 ? 'L' : r < .8 ? 'R' : 'T', chosen: 0 };
  obs = [];
  let z = s0 + (s0 === 0 ? 28 : 16);
  while (z < seg.e - 20) { z += addRow(z); z += gapFor(z) * (.85 + Math.random() * .3); }
}
const allows = d => seg.turn === 'T' || (seg.turn === 'L' ? d < 0 : d > 0);
const inWindow = () => dist >= seg.e - WIN && dist < seg.e + HALF;

function reset() {
  dist = 0; lane = 0; px = 0; py = 0; vy = 0; duckAt = -1e9; duckQ = false; turns = 0; turnAt = -1e9;
  makeSeg(0);
}
function start() {
  reset();
  last = performance.now();
  state = 'play'; veil.hidden = true;
}

/* ---------- 조작 ---------- */
function act(dir) {
  if (state !== 'play') return;
  const now = performance.now();
  if (dir === 'L' || dir === 'R') {
    const d = dir === 'L' ? -1 : 1;
    if (inWindow() && !seg.chosen && allows(d)) { seg.chosen = d; return; }
    lane = Math.max(-1, Math.min(1, lane + d));
  } else if (dir === 'U') {
    if (py <= 0) { duckAt = -1e9; vy = V0; py = .001; }
  } else if (dir === 'D') {
    if (py > 0) { vy = Math.min(vy, -14); duckQ = true; }   // 공중이면 빨리 내려와서 숙인다
    else duckAt = now;
  }
}
function end(kind, now) {
  state = 'over'; how = kind; overAt = now;
  if (kind === 'fall') vy = Math.min(vy, 0);
  setTimeout(() => {
    state = 'done';
    const m = Math.floor(dist);
    showResult('run', m, { detail: `모퉁이 ${turns}번 돌았어요`, onRetry: start });
  }, 1300);
}

/* ---------- 움직임 ---------- */
function update(now) {
  const dt = Math.min(1 / 30, (now - last) / 1000); last = now;
  if (state === 'play') {
    dist += SPEED * dt;
    px += (lane - px) * Math.min(1, dt * 16);
    if (py > 0 || vy > 0) {
      vy -= G * dt; py += vy * dt;
      if (py <= 0) { py = 0; vy = 0; if (duckQ) { duckAt = now; duckQ = false; } }
    }
    // 부딪힘 검사
    const ln = Math.round(px), a = dist - .3, b = dist + .3;
    for (const o of obs) {
      if (o.z > b || o.z + o.d < a || !o.lanes.includes(ln)) continue;
      if (o.kind === 'block') return end('hit', now);
      if (o.kind === 'low' && py < .5) return end('hit', now);
      if (o.kind === 'high' && !ducking(now)) return end('hit', now);
      if (o.kind === 'gap' && py <= 0 && dist > o.z + .35 && dist < o.z + o.d - .35) return end('fall', now);
    }
    // 모퉁이
    if (seg.chosen && dist >= seg.e) {
      turnDir = seg.chosen; turnAt = now; turns++;
      makeSeg(dist);
    } else if (!seg.chosen && dist > seg.e + HALF - .3) return end('fall', now);
  } else if (state === 'over' && how === 'fall') {
    dist += SPEED * dt * Math.max(0, 1 - (now - overAt) / 300);
    vy -= G * dt; py += vy * dt;
  }
}

/* ---------- 그리기 ---------- */
function poly(pts, fill) { ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); }
const quadG = (x0, x1, z0, z1, h = 0) => [P(x0, z0, h), P(x1, z0, h), P(x1, z1, h), P(x0, z1, h)];
const fog = z => Math.max(0, Math.min(1, (VIEW - z) / 22));

function drawSky(now) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#cdb8ff'); g.addColorStop(.33, '#ffe3f1'); g.addColorStop(.34, '#fff0f6'); g.addColorStop(1, '#ffd2e4');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // 구름(아래로 구름 바다)
  ctx.fillStyle = 'rgba(255,255,255,.75)';
  for (let i = 0; i < 7; i++) {
    const x = ((i * 137 - now * .006 * (1 + i % 3)) % (W + 160) + W + 160) % (W + 160) - 80, y = 60 + (i * 53) % 110;
    ctx.beginPath(); ctx.ellipse(x, y, 34, 11, 0, 0, Math.PI * 2); ctx.ellipse(x + 20, y - 6, 22, 10, 0, 0, Math.PI * 2); ctx.fill();
  }
  for (let i = 0; i < 6; i++) {
    const x = ((i * 191 + now * .01) % (W + 200)) - 100, y = HOR + 40 + i * 70;
    ctx.fillStyle = `rgba(255,255,255,${.35 + i * .06})`;
    ctx.beginPath(); ctx.ellipse(x, y, 70 + i * 20, 14 + i * 4, 0, 0, Math.PI * 2); ctx.fill();
  }
}
function slab(x0, x1, z0, z1, color, sideCol) {
  // 길 윗면 + 옆면 두께
  if (x0 < 0 && x0 > -10) poly([P(x0, z0, 0), P(x0, z1, 0), P(x0, z1, -.7), P(x0, z0, -.7)], sideCol);
  if (x1 > 0 && x1 < 10) poly([P(x1, z0, 0), P(x1, z1, 0), P(x1, z1, -.7), P(x1, z0, -.7)], sideCol);
  poly([P(x0, z0, -.7), P(x1, z0, -.7), P(x1, z0, 0), P(x0, z0, 0)], sideCol);
  poly(quadG(x0, x1, z0, z1), color);
}
function drawRoad() {
  const z0 = Math.max(-1.4, seg.s - HALF - dist), zEnd = seg.e + HALF - dist, z1 = Math.min(VIEW, zEnd);
  // 모퉁이에서 옆으로 뻗는 길
  if (zEnd - 2 * HALF < VIEW) {
    const a = Math.max(-1.4, zEnd - 2 * HALF), b = zEnd;
    ctx.globalAlpha = fog(a);
    if (seg.turn !== 'R') slab(-40, -HALF, a, b, '#f3e6ff', '#c9a8e8');
    if (seg.turn !== 'L') slab(HALF, 40, a, b, '#f3e6ff', '#c9a8e8');
    ctx.globalAlpha = 1;
  }
  // 2m마다 줄무늬, 먼 쪽부터
  const strips = [];
  for (let s = Math.floor((dist + z0) / 2) * 2; s - dist < z1; s += 2) {
    const a = Math.max(z0, s - dist), b = Math.min(z1, s + 2 - dist);
    if (b > a) strips.push([a, b, (s / 2) & 1]);
  }
  for (let i = strips.length - 1; i >= 0; i--) {
    const [a, b, odd] = strips[i];
    ctx.globalAlpha = fog(a);
    slab(-HALF, HALF, a, b, odd ? '#f3e6ff' : '#fbf4ff', '#c9a8e8');
    // 칸 구분선(점선)
    if (odd) for (const x of [-LANE / 2, LANE / 2]) poly(quadG(x - .03, x + .03, a, b), 'rgba(185,150,230,.55)');
  }
  ctx.globalAlpha = 1;
  // 구멍
  for (const o of obs) {
    if (o.kind !== 'gap') continue;
    const a = o.z - dist, b = a + o.d;
    if (b < -1.4 || a > VIEW) continue;
    const aa = Math.max(-1.4, a);
    ctx.globalAlpha = fog(aa);
    poly(quadG(-HALF - .02, HALF + .02, aa, b), '#a985d6');
    poly([P(-HALF, b, 0), P(HALF, b, 0), P(HALF, b, -.7), P(-HALF, b, -.7)], '#7e5bb0');   // 건너편 벽
    ctx.globalAlpha = 1;
  }
  // 모퉁이 앞 화살표
  const c = seg.e - dist - 6;
  if (c > -1 && c < VIEW) {
    const col = seg.chosen ? '#6fd3a8' : '#ff8fb1';
    ctx.globalAlpha = fog(c);
    const arrow = (cx, d) => poly([[.7, -.22], [-.1, -.22], [-.1, -.6], [-.8, 0], [-.1, .6], [-.1, .22], [.7, .22]]
      .map(([u, v]) => P(cx + u * d * .9, c + v * 1.4)), col);
    if (seg.turn === 'L') arrow(0, 1);
    else if (seg.turn === 'R') arrow(0, -1);
    else { arrow(-.85, 1); arrow(.85, -1); }
    ctx.globalAlpha = 1;
  }
}
function box(x0, x1, z0, z1, h0, h1, top, front, side) {
  if (z0 + Z_OFF < .6) return;
  if (x1 < 0) poly([P(x1, z0, h0), P(x1, z1, h0), P(x1, z1, h1), P(x1, z0, h1)], side);
  if (x0 > 0) poly([P(x0, z0, h0), P(x0, z1, h0), P(x0, z1, h1), P(x0, z0, h1)], side);
  poly([P(x0, z0, h1), P(x1, z0, h1), P(x1, z1, h1), P(x0, z1, h1)], top);
  poly([P(x0, z0, h0), P(x1, z0, h0), P(x1, z0, h1), P(x0, z0, h1)], front);
}
function drawObstacle(o) {
  const z0 = o.z - dist, z1 = z0 + o.d;
  if (z1 < -1.4 || z0 > VIEW) return;
  ctx.globalAlpha = fog(z0);
  if (o.kind === 'block') {
    for (const l of o.lanes) {
      const x = l * LANE, w = LANE * .4;
      box(x - w, x + w, z0, z1, 0, 1.55, '#ffd0de', '#ff9dba', '#f07fa3');
      // 별 무늬
      const [sx, sy, s] = P(x, z0, 1.0);
      if (s > 6) { ctx.fillStyle = '#fff'; ctx.font = `900 ${Math.round(s * .45)}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('★', sx, sy); }
    }
  } else if (o.kind === 'low') {
    for (const l of o.lanes) {
      const x = l * LANE, w = LANE / 2 - .06;
      box(x - w, x - w + .08, z0, z1, 0, .5, '#e8b54a', '#d99a2b', '#c4861d');
      box(x + w - .08, x + w, z0, z1, 0, .5, '#e8b54a', '#d99a2b', '#c4861d');
      box(x - w, x + w, z0, z1, .28, .52, '#ffe08a', '#ffc83d', '#e8ae22');
      // 줄무늬
      for (let i = 0; i < 4; i++) { const u = x - w + (i + .25) * (2 * w / 4); poly([P(u, z0, .28), P(u + .12, z0, .28), P(u + .22, z0, .52), P(u + .1, z0, .52)], '#fff6d6'); }
    }
  } else if (o.kind === 'high') {
    const xs = o.lanes.map(l => l * LANE), x0 = Math.min(...xs) - LANE / 2 + .02, x1 = Math.max(...xs) + LANE / 2 - .02;
    box(x0, x0 + .1, z0, z1, 0, 1.45, '#9de6c8', '#6fd3a8', '#55bf92');
    box(x1 - .1, x1, z0, z1, 0, 1.45, '#9de6c8', '#6fd3a8', '#55bf92');
    box(x0, x1, z0, z1, .82, 1.4, '#c6f3df', '#8fe0bd', '#6fd3a8');
    // 아래 화살표 표시
    const [sx, sy, s] = P((x0 + x1) / 2, z0, 1.11);
    if (s > 6) { ctx.fillStyle = '#fff'; ctx.font = `900 ${Math.round(s * .38)}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(o.lanes.length > 1 ? '▼  ▼  ▼' : '▼', sx, sy); }
  }
  ctx.globalAlpha = 1;
}
function drawBunny(now) {
  const x = px * LANE, duck = state === 'play' ? ducking(now) || duckQ : ducking(overAt);
  const [sx, gy, s] = P(x, 0, 0);
  const [, by] = P(x, 0, py);
  const fallen = state !== 'ready' && state !== 'play' && how === 'fall';
  // 그림자
  if (!fallen || py > -.2) {
    const k = 1 - Math.min(1, Math.max(0, py)) * .35;
    ctx.fillStyle = 'rgba(90,50,120,.22)'; ctx.beginPath(); ctx.ellipse(sx, gy, s * .3 * k, s * .07 * k, 0, 0, Math.PI * 2); ctx.fill();
  }
  const run = state === 'play' && py <= 0;
  const bob = run && !duck ? Math.abs(Math.sin(now / 75)) * s * .045 : 0;
  const shrink = fallen ? Math.max(.3, 1 + py * .25) : 1;
  const OUT = '#f2a0bd', FUR = '#fffafc', PINK = '#ffc9da';
  const ell = (x, y, rx, ry, fill, stroke = true, rot = 0) => {
    ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2); ctx.fillStyle = fill; ctx.fill(); if (stroke) ctx.stroke();
  };
  ctx.save();
  ctx.translate(sx, by - bob);
  ctx.rotate((lane - px) * .35);
  ctx.scale(shrink * 1.2, shrink * 1.2);
  ctx.strokeStyle = OUT; ctx.lineWidth = 2.5; ctx.lineJoin = 'round';
  // 머리가 큰 2등신. 숙이면 몸이 납작해지고 머리가 내려온다
  const headY = (duck ? -.3 : -.5) * s, headR = .25 * s;
  const bodyY = (duck ? -.13 : -.21) * s, bodyRX = (duck ? .25 : .2) * s, bodyRY = (duck ? .12 : .17) * s;
  // 발(달릴 때 번갈아 든다)
  const step = run ? Math.sin(now / 75) : 0;
  for (const d of [-1, 1]) ell(d * .1 * s, -.035 * s - Math.max(0, step * d) * s * .09, .075 * s, .05 * s, PINK);
  // 몸 · 팔
  ell(0, bodyY, bodyRX, bodyRY, FUR);
  for (const d of [-1, 1]) ell(d * bodyRX * .95, bodyY - .02 * s + (run ? -step * d * .03 * s : 0), .05 * s, .07 * s, FUR, true, d * .5);
  // 동글동글 꼬리
  ell(0, bodyY + .02 * s, .075 * s, .07 * s, '#fff');
  ctx.save(); ctx.strokeStyle = 'rgba(242,160,189,.6)'; ctx.lineWidth = 1.5;
  for (const a of [-.6, .6]) { ctx.beginPath(); ctx.arc(0, bodyY + .02 * s, .04 * s, a + Math.PI, a + Math.PI + .9); ctx.stroke(); }
  ctx.restore();
  // 귀: 왼쪽은 쫑긋, 오른쪽은 끝이 살짝 접힘
  const wig = Math.sin(now / 110) * .06;
  for (const d of [-1, 1]) {
    ctx.save(); ctx.translate(d * .1 * s, headY - headR * .8);
    ctx.rotate(duck ? d * 1.25 : d * (.16 + (d > 0 ? .12 : 0)) + wig * d);
    ell(0, -.15 * s, .075 * s, .17 * s, FUR);
    ell(0, -.14 * s, .035 * s, .12 * s, PINK, false);
    if (d > 0 && !duck) { ell(.045 * s, -.29 * s, .06 * s, .05 * s, FUR, true, .9); }
    ctx.restore();
  }
  // 머리
  ell(0, headY, headR, headR * .92, FUR);
  // 옆으로 살짝 보이는 볼터치
  ctx.globalAlpha = .85;
  for (const d of [-1, 1]) ell(d * headR * .86, headY + headR * .3, .055 * s, .035 * s, '#ffadc6', false);
  ctx.globalAlpha = 1;
  ctx.restore();
}
function text(s, x, y, size, fill = '#ff7fa0', lw = 8) {
  ctx.font = `900 ${size}px Pretendard, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.strokeStyle = '#fff'; ctx.lineWidth = lw; ctx.strokeText(s, x, y); ctx.fillStyle = fill; ctx.fillText(s, x, y);
}
function draw(now) {
  drawSky(now);
  const hit = state !== 'play' && state !== 'ready' && how === 'hit';
  const shake = hit && now - overAt < 350 ? Math.sin((now - overAt) / 22) * 8 * (1 - (now - overAt) / 350) : 0;
  // 모퉁이를 돌면 새 길이 옆에서 미끄러져 들어온다
  const tp = Math.min(1, (now - turnAt) / 260), slide = turnDir * W * .75 * (1 - tp) ** 2;
  ctx.save(); ctx.translate(slide + shake, 0);
  drawRoad();
  const far = obs.filter(o => o.kind !== 'gap' && o.z + o.d - dist >= -.3).sort((a, b) => b.z - a.z);
  const near = obs.filter(o => o.kind !== 'gap' && o.z + o.d - dist < -.3).sort((a, b) => b.z - a.z);
  far.forEach(drawObstacle);
  ctx.restore();
  drawBunny(now);
  ctx.save(); ctx.translate(slide + shake, 0); near.forEach(drawObstacle); ctx.restore();

  // 거리
  if (state !== 'ready') {
    text(`${Math.floor(dist)}`, W / 2, 58, 50, '#ff7fa0', 9);
    ctx.font = '800 14px Pretendard, sans-serif'; ctx.fillStyle = INK; ctx.fillText('m', W / 2, 94);
  }
  // 모퉁이 알림
  if (state === 'play' && inWindow()) {
    const blink = seg.chosen || Math.floor(now / 180) % 2;
    if (blink) {
      const col = seg.chosen ? '#3fbf8a' : '#ff5c7a';
      const label = seg.chosen ? (seg.chosen < 0 ? '← 왼쪽으로!' : '오른쪽으로! →') : seg.turn === 'L' ? '← 꺾어요' : seg.turn === 'R' ? '꺾어요 →' : '← 꺾어요 →';
      text(label, W / 2, 134, 24, col, 7);
    }
  }
  if (state === 'over' || state === 'done') text(how === 'hit' ? '쿵!' : '앗, 떨어졌어요!', W / 2, H * .42, how === 'hit' ? 46 : 32);
}

function frame(now) { update(now); draw(now); requestAnimationFrame(frame); }
reset();
requestAnimationFrame(frame);

/* ---------- 입력: 키보드 ---------- */
const KEYS = { ArrowLeft: 'L', KeyA: 'L', ArrowRight: 'R', KeyD: 'R', ArrowUp: 'U', KeyW: 'U', Space: 'U', ArrowDown: 'D', KeyS: 'D' };
document.addEventListener('keydown', e => {
  if (document.querySelector('.overlay')) return;
  const d = KEYS[e.code];
  if (!d && e.code !== 'Enter') return;
  e.preventDefault();
  if (e.repeat) return;
  if (state === 'ready') { if (e.code === 'Space' || e.code === 'Enter') start(); return; }
  if (d) act(d);
});

/* ---------- 입력: 스와이프 ---------- */
let sw = null;
cv.addEventListener('pointerdown', e => {
  e.preventDefault();
  sw = { id: e.pointerId, x: e.clientX, y: e.clientY, used: false };
  try { cv.setPointerCapture(e.pointerId); } catch { }
});
cv.addEventListener('pointermove', e => {
  if (!sw || sw.id !== e.pointerId || sw.used) return;
  const dx = e.clientX - sw.x, dy = e.clientY - sw.y;
  if (Math.hypot(dx, dy) < 24) return;
  sw.used = true;
  act(Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'L' : 'R') : (dy < 0 ? 'U' : 'D'));
});
const swEnd = e => { if (sw && sw.id === e.pointerId) sw = null; };
cv.addEventListener('pointerup', swEnd);
cv.addEventListener('pointercancel', swEnd);
veil.addEventListener('click', start);
