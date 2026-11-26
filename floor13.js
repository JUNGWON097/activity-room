import { initGamePage, showResult, setupCanvas, canvasPoint } from './common.js?v=67';

initGamePage('floor13');

const VW = 720, VH = 480, CX0 = VW / 2, CY0 = VH * .45;
const cv = document.getElementById('cv');
const ctx = setupCanvas(cv, VW, VH);
const veil = document.getElementById('veil');

/* ---------- 세계 ----------
   1인칭 복도. 눈높이 0, 바닥 -1, 천장 0.55, 폭 1.4, 길이 16.
   이상한 것이 없으면 끝까지 앞으로(→ 다음 층), 있으면 뒤돌아 처음 계단으로(→ 다음 층).
   틀리면 1층부터 다시. 13층 끝 문을 열면 탈출. */
const F = 340, HW = .7, FLOOR = -1, CEIL = .55, RAIL = -.38, NEAR = .2;
const L = 11.2, SPEED = 2.0, START = 1.4, GOAL = 13;
const LIGHTS = [1.05, 3.5, 5.95, 8.4, 10.6];
const DW = .66, DTOP = .28;
const DOORS = [
  { s: -1, z: 2.1, n: 1 }, { s: -1, z: 4.55, n: 3 }, { s: -1, z: 7, n: 5 }, { s: -1, z: 9.45, n: 7 },
  { s: 1, z: 2.66, n: 2 }, { s: 1, z: 5.11, n: 4 }, { s: 1, z: 7.56, n: 6 }, { s: 1, z: 10.0, n: 8 },
];
// 이상 현상 목록(층마다 하나 또는 없음)
// 모두 눈으로 찾을 수 있다(회사에서 소리 없이 해도 된다). 소리는 분위기용
const ANOMS = ['extraDoor', 'doorNum', 'ajar', 'red', 'dark', 'figure', 'hands', 'writing', 'poster', 'sign', 'puddle', 'crawler', 'shoes',
  'noDoor', 'redDoor', 'tallDoor', 'posterFlip', 'extColor', 'exitRed', 'carpet', 'hatch', 'tilt', 'faceWindow', 'hangLight'];
const C = {
  wall: [190, 180, 154], wains: [112, 98, 80], base: [46, 40, 34], floor: [84, 74, 62], runner: [104, 34, 36],
  ceil: [196, 192, 180], door: [70, 82, 92], frame: [42, 46, 52], end: [172, 164, 144],
};

let state = 'ready';   // ready → play ⇄ (trans | scare) → done
let floor = 1, anom = null, bag = [], lastAnom = null, resets = 0;
let pz = START, dir = 1, bob = 0, stepN = 0, turnT = -1, t0 = 0, last = 0, endT = 0;
let trans = null, scareAt = 0, fx = {}, tint = [1, 1, 1];
let CX = CX0, CY = CY0;
const keys = {};
let touchWalk = null;

/* ---------- 소리 (WebAudio로 직접 만든다) ---------- */
let ac = null, master = null, muted = false, drone = null, hum = null, NB = null;
function audioStart() {
  try {
    ac = ac || new (window.AudioContext || window.webkitAudioContext)();
    ac.resume();
    if (!master) {
      master = ac.createGain(); master.connect(ac.destination);
      const mk = (type, f, lpF) => {
        const o = ac.createOscillator(), lp = ac.createBiquadFilter(), g = ac.createGain();
        o.type = type; o.frequency.value = f; lp.type = 'lowpass'; lp.frequency.value = lpF; g.gain.value = 0;
        o.connect(lp).connect(g).connect(master); o.start(); return g;
      };
      drone = mk('sawtooth', 41, 130);   // 낮게 웅웅거리는 소리
      hum = mk('square', 120, 360);       // 형광등 지잉
    }
  } catch { ac = null; }
}
function setAmb(on) {
  if (!ac || !drone) return;
  const t = ac.currentTime, ok = on && !muted;
  drone.gain.setTargetAtTime(ok ? .07 : 0, t, .4);
  hum.gain.setTargetAtTime(ok ? (anom === 'dark' ? .005 : .016) : 0, t, .2);
}
function nb() {
  if (NB) return NB;
  NB = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
  const ch = NB.getChannelData(0); for (let i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1;
  return NB;
}
function out(node, pan) {
  if (pan && ac.createStereoPanner) { const p = ac.createStereoPanner(); p.pan.value = pan; node.connect(p); p.connect(master); }
  else node.connect(master);
}
function noise(dur, { f = 500, f2 = 0, q = 1, type = 'lowpass', vol = .2, at = 0, pan = 0 } = {}) {
  if (!ac || muted) return;
  const t = ac.currentTime + at, s = ac.createBufferSource(); s.buffer = nb(); s.loop = true;
  const fl = ac.createBiquadFilter(); fl.type = type; fl.Q.value = q;
  fl.frequency.setValueAtTime(f, t); if (f2) fl.frequency.exponentialRampToValueAtTime(f2, t + dur);
  const g = ac.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + Math.min(.02, dur / 4)); g.gain.exponentialRampToValueAtTime(.001, t + dur);
  s.connect(fl).connect(g); out(g, pan); s.start(t, Math.random()); s.stop(t + dur + .05);
}
function tone(f0, f1, dur, { type = 'sine', vol = .15, at = 0, pan = 0 } = {}) {
  if (!ac || muted) return;
  const t = ac.currentTime + at, o = ac.createOscillator(), g = ac.createGain();
  o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .015); g.gain.exponentialRampToValueAtTime(.001, t + dur);
  o.connect(g); out(g, pan); o.start(t); o.stop(t + dur + .05);
}
const step = (vol = .16, at = 0) => noise(.09, { f: 360 + Math.random() * 140, vol, at });
const thump = (vol = .3) => tone(72, 38, .22, { vol });
function whisper(pan = 0) { noise(1.3, { type: 'bandpass', f: 2700, f2: 1300, q: 7, vol: .16, pan }); noise(1, { type: 'bandpass', f: 3600, f2: 1900, q: 9, vol: .1, at: .35, pan: -pan }); }
function creak() { tone(85, 150, 1.1, { type: 'sawtooth', vol: .05, pan: .5 }); tone(91, 140, 1.1, { type: 'sawtooth', vol: .04, pan: .5 }); }
function scream() {
  noise(1.3, { type: 'bandpass', f: 2200, f2: 380, q: 2, vol: .7 });
  tone(1050, 110, 1.1, { type: 'sawtooth', vol: .28 }); tone(1390, 170, 1, { type: 'square', vol: .12 }); tone(55, 30, 1.2, { type: 'sawtooth', vol: .3 });
}
const swish = () => noise(.28, { type: 'bandpass', f: 500, f2: 1800, q: 1, vol: .07 });

/* ---------- 진행 ---------- */
function pickAnom() {
  if (floor === 1 || floor === GOAL) return null;            // 1층은 늘 평범한 복도(익혀 두기), 13층은 마지막 층
  if (Math.random() < .4) return null;
  if (!bag.length) bag = ANOMS.slice().sort(() => Math.random() - .5);
  let a = bag.pop();
  if (a === lastAnom && bag.length) { bag.unshift(a); a = bag.pop(); }
  lastAnom = a; return a;
}
function setupFloor() {
  anom = pickAnom();
  pz = START; dir = 1; turnT = -1; bob = 0; stepN = 0;
  const wrong = [floor + 3, 13, 4, floor > 2 ? floor - 1 : floor + 1].filter(n => n !== floor);
  fx = {
    figZ: L - 2.4, charge: false, crawlZ: L - 1.4,
    creaked: false, scrapeAt: 0, beatAt: 0,
    hair: Array.from({ length: 34 }, () => ({ x: -.26 + Math.random() * .52, z: 4.35 + Math.random() * .6, len: .3 + Math.random() * .6 })),
    sign: `${wrong[Math.floor(Math.random() * wrong.length)]}F`,
    hands: Array.from({ length: 7 }, () => ({ z: 8.05 + Math.random() * 1.45, y: -.75 + Math.random() * 1.05 })),
  };
  tint = anom === 'red' ? [1, .26, .22] : [1, 1, 1];
}
function start() {
  floor = 1; resets = 0; bag = []; lastAnom = null; trans = null;
  setupFloor();
  t0 = last = performance.now();
  state = 'play'; veil.hidden = true;
  audioStart(); setAmb(true);
}
function turn() {
  if (state !== 'play' || turnT >= 0) return;
  turnT = 0; swish();
}
// 끝에 닿음: saidAnom = 뒤돌아 처음 계단으로 왔다(이상 있다고 판단)
function arrive(saidAnom, now) {
  if (floor === GOAL) return win(now);
  if (saidAnom === (anom !== null)) {
    state = 'trans'; trans = { at: now, kind: 'up' };
    for (let i = 0; i < 6; i++) step(.13, i * .13);
  } else fail(now);
}
function fail(now) {
  if (state !== 'play') return;
  state = 'scare'; scareAt = now; resets++;
  setAmb(false); scream();
}
function win(now) {
  state = 'done'; endT = now; setAmb(false);
  tone(440, 660, .8, { type: 'triangle', vol: .12 });
  const sec = Math.round((now - t0) / 100) / 10;
  setTimeout(() => showResult('floor13', sec, { detail: resets ? `중간에 ${resets}번 처음부터 다시 했어요` : '한 번도 안 틀리고 탈출했어요!', onRetry: start }), 1200);
}

function update(now) {
  const dt = Math.min(.05, (now - last) / 1000); last = now;
  if (state === 'play') {
    if (turnT >= 0) {
      const prev = turnT; turnT += dt / .42;
      if (prev < .5 && turnT >= .5) dir = -dir;
      if (turnT >= 1) turnT = -1;
    } else if (keys.ArrowUp || keys.KeyW || touchWalk !== null) {
      pz += dir * SPEED * dt; bob += dt * 9;
      const n = Math.floor(bob / Math.PI);
      if (n !== stepN) { stepN = n; step(); }
    }
    pz = Math.max(.5, Math.min(L - .5, pz));
    hostiles(now, dt);
    if (state === 'play') {
      if (dir > 0 && pz >= L - .9) arrive(false, now);
      else if (dir < 0 && pz <= .9) { if (floor === GOAL) pz = .9; else arrive(true, now); }
    }
  }
  if (state === 'scare' && now - scareAt > 1300) { state = 'trans'; trans = { at: now, kind: 'fail' }; whisper(); }
  if (state === 'trans') {
    const k = (now - trans.at) / 1000;
    if (!trans.set && k >= .55) {
      trans.set = true;
      floor = trans.kind === 'up' ? floor + 1 : 1;
      setupFloor(); setAmb(true);
    }
    if (k >= 1.8) { state = 'play'; trans = null; }
  }
}
// 다가오는 것들
function hostiles(now, dt) {
  let danger = 0;
  if (anom === 'figure') {
    // 복도 끝에 서 있다가, 너무 가까이 가면 달려든다
    if (!fx.charge && dir > 0 && pz > fx.figZ - 4.5) { fx.charge = true; noise(.6, { type: 'bandpass', f: 600, f2: 2400, q: 3, vol: .3 }); }
    if (fx.charge) { fx.figZ -= dt * 9; danger = 1; for (let i = 0; i < 2; i++) if (Math.random() < .25) step(.25); if (Math.abs(fx.figZ - pz) < .7) return fail(now); }
  }
  if (anom === 'crawler' && pz > START + .8) {
    // 천장에 붙어 기어 온다
    fx.crawlZ -= dt * .8;
    const gap = fx.crawlZ - pz;
    if (gap < 6) danger = Math.max(danger, 1 - gap / 6);
    if (now > fx.scrapeAt) { noise(.35, { type: 'bandpass', f: 260, q: 2, vol: .12 + .2 * danger }); fx.scrapeAt = now + 650; }
    if (gap < .9) return fail(now);
  }
  if (anom === 'ajar' && !fx.creaked && Math.abs(7.56 - pz) < 5) { creak(); fx.creaked = true; }
  if (danger > 0 && now > fx.beatAt) { thump(.25 + .25 * danger); fx.beatAt = now + 700 - 380 * danger; }
}

/* ---------- 3D 그리기 ---------- */
const dep = z => (z - pz) * dir;
const P = (x, y, z) => { const d = dep(z); return [CX + x * dir * F / d, CY - y * F / d]; };
function clipZ(z0, z1) {
  const lim = pz + NEAR * dir;
  let a = z0, b = z1;
  if (dir > 0) { if (b <= lim) return null; if (a < lim) a = lim; } else { if (a >= lim) return null; if (b > lim) b = lim; }
  return [a, b];
}
function poly(pts, fill) {
  ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath(); ctx.fillStyle = fill; ctx.fill();
}
function wallQ(s, z0, z1, y0, y1, fill) {
  const c = clipZ(z0, z1); if (!c) return;
  const x = s * HW;
  poly([P(x, y0, c[0]), P(x, y0, c[1]), P(x, y1, c[1]), P(x, y1, c[0])], fill);
}
function flatQ(x0, x1, z0, z1, y, fill) {
  const c = clipZ(z0, z1); if (!c) return;
  poly([P(x0, y, c[0]), P(x1, y, c[0]), P(x1, y, c[1]), P(x0, y, c[1])], fill);
}
const rgb = (c, l) => `rgb(${c[0] * l * tint[0] | 0},${c[1] * l * tint[1] | 0},${c[2] * l * tint[2] | 0})`;
function flick(now, seed) { const k = Math.floor(now / 70) + seed; const r = Math.sin(k * 12.9898) * 43758.5453; return r - Math.floor(r) > .45 ? 1 : .04; }
function lightLv(i, now) {
  if (anom === 'dark') return i === 0 ? 1 : i === 3 ? flick(now, 0) : 0;
  return 1;
}
function bright(z, now) {
  let b = .03;
  for (let i = 0; i < LIGHTS.length; i++) b += lightLv(i, now) * .82 * Math.exp(-((z - LIGHTS[i]) ** 2) / 5);
  return Math.min(1, b);
}
const fog = d => 1 / (1 + .022 * d * d);
const lit = (z, now) => bright(z, now) * fog(Math.max(0, dep(z)));

// 벽에 붙은 판(문패 · 안내문 · 글씨): 네 귀퉁이를 비춰 그 안에 평면 그림을 그린다
function plate(s, z0, z1, y0, y1, fn) {
  if (Math.min(dep(z0), dep(z1)) < NEAR + .05) return;
  const x = s * HW;
  let a = P(x, y1, z0), b = P(x, y1, z1), c = P(x, y0, z0), flip = false;
  if (b[0] < a[0]) { a = P(x, y1, z1); b = P(x, y1, z0); c = P(x, y0, z1); flip = true; }
  const w = 100 * (z1 - z0), h = 100 * (y1 - y0);
  ctx.save(); ctx.transform((b[0] - a[0]) / w, (b[1] - a[1]) / w, (c[0] - a[0]) / h, (c[1] - a[1]) / h, a[0], a[1]);
  fn(w, h, flip); ctx.restore();
}
function floorBlob(x, z, rx, rz, fill) {
  if (dep(z) - rz < NEAR + .05) return;
  const pts = [];
  for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2; pts.push(P(x + Math.cos(a) * rx, FLOOR + .002, z + Math.sin(a) * rz)); }
  poly(pts, fill);
}

function drawEndWall(now) {
  const E = dir > 0 ? L : 0, d = dep(E); if (d <= NEAR) return;
  const l = lit(E, now), k = F / d, fin = floor === GOAL && E === L;
  poly([P(-HW, FLOOR, E), P(HW, FLOOR, E), P(HW, CEIL, E), P(-HW, CEIL, E)], rgb(C.end, l));
  poly([P(-HW, FLOOR, E), P(HW, FLOOR, E), P(HW, RAIL, E), P(-HW, RAIL, E)], rgb(C.wains, l * .85));
  // 계단으로 나가는 철문
  poly([P(-.36, FLOOR, E), P(.36, FLOOR, E), P(.36, DTOP + .04, E), P(-.36, DTOP + .04, E)], rgb(C.frame, l));
  poly([P(-.32, FLOOR, E), P(.32, FLOOR, E), P(.32, DTOP, E), P(-.32, DTOP, E)], rgb(fin ? [70, 110, 84] : [92, 100, 92], l));
  poly([P(-.28, -.47, E), P(.28, -.47, E), P(.28, -.42, E), P(-.28, -.42, E)], rgb([150, 150, 140], l));
  poly([P(-.12, -.04, E), P(.12, -.04, E), P(.12, .17, E), P(-.12, .17, E)], fin ? `rgba(160,255,190,${.4 + .3 * fog(d)})` : rgb([20, 22, 24], 1));
  if (anom === 'faceWindow' && E === L) {
    // 철문 창에 얼굴이 붙어 있다
    const [wx0, wy0] = P(0, .06, E);
    ctx.fillStyle = rgb([190, 182, 168], Math.max(.55, l)); ctx.beginPath(); ctx.ellipse(wx0, wy0, .085 * k, .1 * k, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#000';
    for (const ex of [-.035, .035]) { ctx.beginPath(); ctx.ellipse(wx0 + ex * k, wy0 - .02 * k, .022 * k, .017 * k, 0, 0, 7); ctx.fill(); }
    ctx.beginPath(); ctx.ellipse(wx0, wy0 + .05 * k, .018 * k, .028 * k, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#0b0909'; ctx.fillRect(wx0 - .1 * k, wy0 - .11 * k, .2 * k, .035 * k);
  }
  // 초록 비상구 표시(스스로 빛난다)
  const [sx, sy] = P(0, .4, E);
  ctx.fillStyle = anom === 'exitRed' && !fin ? `rgba(200,26,30,${.35 + .65 * fog(d)})` : `rgba(30,${fin ? 220 : 170},95,${.35 + .65 * fog(d)})`;
  poly([P(-.24, .34, E), P(.24, .34, E), P(.24, .46, E), P(-.24, .46, E)], ctx.fillStyle);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = `800 ${.075 * k}px Pretendard, sans-serif`; ctx.fillStyle = `rgba(235,255,240,${.4 + .6 * fog(d)})`;
  ctx.fillText(fin ? '옥상 출구' : E === L ? '비상계단 ▲' : '비상계단 ▼', sx, sy + .005 * k);
  // 끝 벽에 피로 쓴 글씨
  if (anom === 'writing' && E === L) {
    const [wx, wy] = P(0, -.02, E);
    ctx.save(); ctx.translate(wx, wy); ctx.rotate(-.06);
    ctx.font = `900 ${.3 * k}px Pretendard, sans-serif`; ctx.fillStyle = rgb([130, 6, 6], Math.max(.45, l));
    ctx.fillText('돌아가', 0, 0);
    for (let j = 0; j < 9; j++) ctx.fillRect((-.42 + j * .1 + (j % 3) * .013) * k, .08 * k, .012 * k, (.06 + (j * 37 % 11) * .02) * k);
    ctx.restore();
  }
  // 층 표시판(앞쪽 끝 벽에만)
  if (E === L) {
    poly([P(.42, -.02, E), P(.64, -.02, E), P(.64, .2, E), P(.42, .2, E)], rgb([214, 212, 204], l));
    const [px, py] = P(.53, .09, E);
    ctx.font = `900 ${.12 * k}px Pretendard, sans-serif`; ctx.fillStyle = rgb([30, 30, 34], Math.max(.3, l));
    ctx.fillText(anom === 'sign' ? fx.sign : `${floor}F`, px, py + .01 * k);
  }
}
function drawSurfaces(now) {
  const STEP = .5, zs = [];
  for (let z = 0; z < L; z += STEP) zs.push(z);
  if (dir > 0) zs.reverse();               // 먼 곳부터
  for (const z0 of zs) {
    const c = clipZ(z0, z0 + STEP + .012); if (!c) continue;
    const zm = (c[0] + c[1]) / 2, l = lit(zm, now);
    flatQ(-HW, HW, c[0], c[1], CEIL, rgb(C.ceil, l * .72));
    flatQ(-HW, HW, c[0], c[1], FLOOR, rgb(C.floor, l));
    flatQ(-.42, .42, c[0], c[1], FLOOR + .001, rgb(anom === 'carpet' ? [30, 58, 104] : C.runner, l));
    for (const s of [-1, 1]) {
      wallQ(s, c[0], c[1], RAIL, CEIL, rgb(C.wall, l * (s * dir > 0 ? .92 : 1)));
      wallQ(s, c[0], c[1], FLOOR, RAIL, rgb(C.wains, l * .85));
      wallQ(s, c[0], c[1], RAIL - .02, RAIL + .015, rgb(C.base, l));
      wallQ(s, c[0], c[1], FLOOR, FLOOR + .06, rgb(C.base, l * .8));
    }
  }
}
function drawLights(now) {
  if (anom === 'hatch' && dep(5.0) > NEAR + .3) {
    // 천장 점검구가 열려 있고 긴 머리카락이 늘어져 있다
    flatQ(-.3, .3, 4.3, 5.0, CEIL - .001, '#030303');
    ctx.strokeStyle = '#090707'; ctx.lineCap = 'round';
    for (const h of fx.hair) {
      if (dep(h.z) < NEAR + .1) continue;
      const sw = Math.sin(now / 700 + h.x * 30) * .015, [x0, y0] = P(h.x, CEIL, h.z), [x1, y1] = P(h.x + sw, CEIL - h.len, h.z);
      ctx.lineWidth = Math.max(1.5, .02 * F / dep(h.z)); ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    }
  }
  LIGHTS.forEach((z, i) => {
    if (dep(z) < NEAR + .4) return;
    const on = lightLv(i, now), d = dep(z);
    if (anom === 'hangLight' && i === 2) {
      // 형광등 한쪽이 떨어져 비스듬히 매달려 있고 깜빡인다
      const fl = flick(now, 5) > .5, lo = -.12 + Math.sin(now / 600) * .02;
      ctx.strokeStyle = rgb([40, 40, 40], fog(d)); ctx.lineWidth = 1.5;
      for (const x of [-.18, .18]) { const [a1, b1] = P(x, CEIL, z + .3), [a2, b2] = P(x, lo, z + .3); ctx.beginPath(); ctx.moveTo(a1, b1); ctx.lineTo(a2, b2); ctx.stroke(); }
      poly([P(-.2, CEIL - .01, z - .32), P(.2, CEIL - .01, z - .32), P(.2, lo, z + .3), P(-.2, lo, z + .3)], fl ? rgb([255, 250, 230], .55 + .45 * fog(d)) : rgb([60, 60, 56], fog(d)));
      return;
    }
    flatQ(-.2, .2, z - .32, z + .32, CEIL - .001, on > .5 ? rgb([255, 250, 230], .55 + .45 * fog(d)) : rgb([60, 60, 56], fog(d)));
    if (on > .5) {
      const [x, y] = P(0, CEIL, z), r = .9 * F / d;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, `rgba(${255 * tint[0] | 0},${245 * tint[1] | 0},${210 * tint[2] | 0},${.22 * fog(d)})`); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2); ctx.globalCompositeOperation = 'source-over';
    }
  });
}
function doorText(dr) {
  if (anom === 'doorNum' && dr.s === 1 && dr.n === 4) return '444';
  return `${floor}0${dr.n}`;
}
function drawDoors(now) {
  const list = DOORS.slice();
  if (anom === 'extraDoor') list.push({ s: 1, z: 3.88, n: null });
  for (const dr of list) {
    if (anom === 'noDoor' && dr.s === 1 && dr.n === 4) continue;          // 문 하나가 사라짐
    const z = dr.z, z0 = z - DW / 2, z1 = z + DW / 2, l = lit(z, now);
    const top = anom === 'tallDoor' && dr.s === -1 && dr.n === 5 ? CEIL - .03 : DTOP;   // 천장까지 닿는 문
    const col = anom === 'redDoor' && dr.s === -1 && dr.n === 3 ? [128, 20, 22] : C.door;   // 빨갛게 칠한 문
    wallQ(dr.s, z0 - .04, z1 + .04, FLOOR, top + .04, rgb(C.frame, l));
    const ajar = anom === 'ajar' && dr.s === 1 && dr.n === 6;
    const gap = ajar ? .05 + .13 * Math.max(0, Math.min(1, 1 - Math.abs(7.56 - pz) / 6)) : 0;
    wallQ(dr.s, z0 + gap, z1, FLOOR, top, rgb(col, l));
    wallQ(dr.s, z1 - .1, z1 - .05, -.22, -.14, rgb([176, 166, 136], l));               // 손잡이
    if (ajar) {
      wallQ(dr.s, z0, z0 + gap, FLOOR, DTOP, '#020202');
      // 문틈 속 눈
      if (now % 3800 > 160) {
        const ez = z0 + gap * .5;
        wallQ(dr.s, ez - .035, ez - .015, -.04, -.015, 'rgb(232,226,204)');
        wallQ(dr.s, ez + .015, ez + .035, -.04, -.015, 'rgb(232,226,204)');
      }
    }
    if (dr.n !== null && top === DTOP) plate(dr.s, z - .1, z + .1, .07, .15, (w, h) => {
      ctx.fillStyle = rgb([206, 196, 160], l); ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = rgb([30, 26, 22], Math.max(.25, l)); ctx.font = '800 6px Pretendard, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(doorText(dr), w / 2, h / 2 + .4);
    });
    plate(dr.s, z - .012, z + .012, -.01, .01, (w, h) => { ctx.fillStyle = rgb([20, 20, 20], 1); ctx.beginPath(); ctx.arc(w / 2, h / 2, 1, 0, 7); ctx.fill(); });
  }
}
function drawWallStuff(now) {
  // 안내문(왼쪽 벽)
  const pl = lit(5.78, now);
  plate(-1, 5.48, 6.08, -.15, .3, (w, h, flip) => {
    ctx.fillStyle = rgb([222, 218, 206], pl); ctx.fillRect(0, 0, w, h);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    if (anom === 'posterFlip') { ctx.translate(w, h); ctx.rotate(Math.PI); }   // 거꾸로 붙은 안내문
    if (anom === 'poster') {
      // 얼굴이 나를 따라 본다
      const near0 = Math.abs(5.48 - pz) < Math.abs(6.08 - pz);
      const left = flip ? !near0 : near0;
      const off = (left ? -1 : 1) * Math.min(1, Math.abs(pz - 5.78) / 2.5) * 3.2;
      ctx.fillStyle = rgb([24, 20, 20], Math.max(.3, pl));
      for (const ex of [w * .33, w * .67]) {
        ctx.beginPath(); ctx.ellipse(ex, h * .36, 7, 6, 0, 0, 7); ctx.fill();
        ctx.fillStyle = rgb([236, 230, 220], Math.max(.3, pl)); ctx.beginPath(); ctx.arc(ex + off, h * .36, 1.6, 0, 7); ctx.fill();
        ctx.fillStyle = rgb([24, 20, 20], Math.max(.3, pl));
      }
      ctx.lineWidth = 2.4; ctx.strokeStyle = rgb([24, 20, 20], Math.max(.3, pl));
      ctx.beginPath(); ctx.arc(w / 2, h * .5, 16, .25, Math.PI - .25); ctx.stroke();
    } else {
      ctx.fillStyle = rgb([40, 40, 46], Math.max(.3, pl)); ctx.font = '800 7px Pretendard, sans-serif';
      ctx.fillText('입주민 안내', w / 2, 8);
      ctx.fillStyle = rgb([120, 118, 112], pl);
      for (let i = 0; i < 6; i++) ctx.fillRect(8, 17 + i * 4.6, w - 16 - (i % 3) * 6, 1.6);
    }
  });
  // 소화기함(오른쪽 벽)
  const el = lit(6.34, now);
  plate(1, 6.14, 6.54, -.5, -.08, (w, h) => {
    const blue = anom === 'extColor';                                     // 파란 소화기함
    ctx.fillStyle = rgb(blue ? [34, 66, 150] : [168, 28, 28], el); ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = rgb([230, 220, 210], el); ctx.font = '800 7px Pretendard, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('소화기', w / 2, h * .25);
    ctx.fillStyle = rgb(blue ? [16, 30, 80] : [90, 14, 14], el); ctx.fillRect(w * .25, h * .42, w * .5, h * .5);
  });
  if (anom === 'hands') {
    for (const hd of fx.hands) {
      const l = lit(hd.z, now);
      plate(1, hd.z - .13, hd.z + .13, hd.y - .15, hd.y + .15, (w, h) => {
        ctx.save(); ctx.scale(w / 14, h / 16);
        w = 14; h = 16;
        ctx.fillStyle = rgb([150, 12, 12], Math.max(.5, l));
        ctx.beginPath(); ctx.ellipse(w / 2, h * .62, 4.4, 4.2, 0, 0, 7); ctx.fill();
        for (let f = 0; f < 5; f++) { const a = -2.5 + f * .42; ctx.save(); ctx.translate(w / 2 + Math.cos(a) * 3.4, h * .56 + Math.sin(a) * 3.4); ctx.rotate(a + Math.PI / 2); ctx.fillRect(-.9, -5.2, 1.8, 5.2); ctx.restore(); }
        ctx.fillRect(w / 2 - .8, h * .66, 1.6, 6);
        ctx.restore();
      });
    }
  }
}
function drawFloorStuff(now) {
  if (anom === 'puddle') {
    const l = lit(10, now);
    floorBlob(.35, 9.95, .32, .7, rgb([70, 4, 6], Math.max(.3, l)));
    floorBlob(.48, 10, .2, .42, rgb([110, 10, 12], Math.max(.3, l)));
  }
  if (anom === 'shoes') {
    // 문 앞 빨간 신발, 젖은 발자국이 나에게로 이어진다
    for (let i = 0, z = 9.0; z > 1.9; z -= .34, i++) floorBlob(i % 2 ? -.06 : -.18, z, .028, .06, rgba(40, 26, 24, .85 * fog(dep(z))));
    const l = lit(9.45, now);
    floorBlob(-.52, 9.1, .045, .1, rgb([150, 16, 22], Math.max(.3, l)));
    floorBlob(-.41, 9.05, .045, .1, rgb([150, 16, 22], Math.max(.3, l)));
  }
}
const rgba = (r, g, b, a) => `rgba(${r * tint[0] | 0},${g * tint[1] | 0},${b * tint[2] | 0},${a})`;

// 사람 모양: 흰 옷 · 얼굴을 덮은 긴 머리
function drawFigure(x, z, now, flip = false) {
  const d = dep(z); if (d <= NEAR + .1) return;
  const [sx, sy] = P(x, flip ? CEIL : FLOOR, z), k = F / d, l = Math.max(.3, lit(z, now));
  const X = u => sx + u * dir * k, Y = v => flip ? sy + v * k : sy - v * k;
  const sway = Math.sin(now / 900) * .006;
  ctx.lineCap = 'round';
  ctx.strokeStyle = rgb([150, 140, 128], l); ctx.lineWidth = .03 * k;
  for (const u of [-.045, .045]) { ctx.beginPath(); ctx.moveTo(X(u), Y(.14)); ctx.lineTo(X(u), Y(0)); ctx.stroke(); }
  poly([[X(-.11), Y(.9)], [X(.11), Y(.9)], [X(.17), Y(.13)], [X(-.17), Y(.13)]], rgb([206, 202, 192], l));
  ctx.strokeStyle = rgb([190, 180, 166], l); ctx.lineWidth = .034 * k;
  for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(X(s * .11), Y(.87)); ctx.lineTo(X(s * .15 + sway), Y(.38)); ctx.stroke(); }
  ctx.fillStyle = rgb([196, 186, 172], l); ctx.beginPath(); ctx.ellipse(X(0), Y(1.0), .066 * k, .086 * k, 0, 0, 7); ctx.fill();
  // 머리카락이 얼굴과 어깨를 덮는다
  ctx.fillStyle = '#0b0909';
  ctx.beginPath(); ctx.moveTo(X(-.075), Y(1.0)); ctx.quadraticCurveTo(X(-.08), Y(1.1), X(0), Y(1.095)); ctx.quadraticCurveTo(X(.08), Y(1.1), X(.075), Y(1.0));
  ctx.lineTo(X(.1 + sway), Y(.6)); ctx.lineTo(X(.05), Y(.66)); ctx.lineTo(X(.02), Y(.58)); ctx.lineTo(X(-.03), Y(.65)); ctx.lineTo(X(-.1 + sway), Y(.6)); ctx.closePath(); ctx.fill();
  // 머리카락 사이로 한쪽 눈
  if (d < 6) { ctx.fillStyle = `rgba(235,230,215,${Math.min(1, (6 - d) / 3)})`; ctx.beginPath(); ctx.ellipse(X(.022), Y(.995), .011 * k, .006 * k, 0, 0, 7); ctx.fill(); ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(X(.022), Y(.995), .004 * k, 0, 7); ctx.fill(); }
}
function drawBillboards(now) {
  const list = [];
  if (anom === 'figure') list.push([0, fx.figZ, false]);
  if (anom === 'crawler') list.push([0, fx.crawlZ, true]);
  list.sort((a, b) => dep(b[1]) - dep(a[1]));
  for (const [x, z, flip] of list) drawFigure(x, z, now, flip);
}

/* ---------- 놀라는 장면 ---------- */
function drawScare(now) {
  const k = (now - scareAt) / 1000;
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, VW, VH);
  const s = (.5 + Math.min(1, k / .2) * .85) * VH / 480;
  const sh = k < 1 ? 1 : 0;
  ctx.save(); ctx.translate(VW / 2 + (Math.random() - .5) * 26 * sh, VH / 2 + 40 + (Math.random() - .5) * 26 * sh); ctx.scale(s, s);
  ctx.fillStyle = '#060404'; ctx.beginPath(); ctx.ellipse(0, -20, 230, 260, 0, 0, 7); ctx.fill();
  const g = ctx.createRadialGradient(-30, -60, 20, 0, 0, 230);
  g.addColorStop(0, '#e6e0d4'); g.addColorStop(.6, '#a9a194'); g.addColorStop(1, '#3d3832');
  ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, 0, 150, 205, 0, 0, 7); ctx.fill();
  ctx.fillStyle = '#000';
  for (const ex of [-58, 58]) { ctx.beginPath(); ctx.ellipse(ex, -40, 46, 34, ex < 0 ? .15 : -.15, 0, 7); ctx.fill(); }
  ctx.fillStyle = '#fff'; for (const ex of [-52, 52]) { ctx.beginPath(); ctx.arc(ex, -38, 3.2, 0, 7); ctx.fill(); }
  const mg = ctx.createLinearGradient(0, 20, 0, 190); mg.addColorStop(0, '#000'); mg.addColorStop(1, '#3a0004');
  ctx.fillStyle = mg; ctx.beginPath(); ctx.ellipse(0, 100, 46, 82 + Math.sin(now / 30) * 6, 0, 0, 7); ctx.fill();
  ctx.strokeStyle = 'rgba(40,20,16,.7)'; ctx.lineWidth = 2;
  for (const [a, b, c, d2] of [[-120, -150, -70, -90], [90, -170, 60, -110], [-100, 60, -60, 120], [110, 40, 70, 150]]) { ctx.beginPath(); ctx.moveTo(a, b); ctx.lineTo((a + c) / 2 + 8, (b + d2) / 2); ctx.lineTo(c, d2); ctx.stroke(); }
  ctx.fillStyle = '#060404';
  for (let i = 0; i < 9; i++) { const x = -150 + i * 37; ctx.fillRect(x, -220, 9, 110 + (i * 53 % 90)); }
  ctx.restore();
  // 붉은 번쩍임과 화면 찢김
  ctx.fillStyle = `rgba(160,0,0,${.18 + .18 * Math.sin(now / 40)})`; ctx.fillRect(0, 0, VW, VH);
  for (let i = 0; i < 6; i++) { ctx.fillStyle = Math.random() < .5 ? 'rgba(0,0,0,.8)' : 'rgba(255,255,255,.08)'; ctx.fillRect(0, Math.random() * VH, VW, 2 + Math.random() * 14); }
  if (k < .07) { ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.fillRect(0, 0, VW, VH); }
}

/* ---------- 화면 ---------- */
const TURN_BTN = { x: 62, y: VH - 62, r: 38 };
const fmtT = ms => { const s = ms / 1000; return `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, '0')}`; };
function drawScene(now) {
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, VW, VH);
  drawEndWall(now);
  drawSurfaces(now);
  drawLights(now);
  drawDoors(now);
  drawWallStuff(now);
  drawFloorStuff(now);
  drawBillboards(now);
  // 가장자리 어둠 · 지글거리는 잡음
  const v = ctx.createRadialGradient(VW / 2, VH / 2, VH * .28, VW / 2, VH / 2, VH * .88);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.82)');
  ctx.fillStyle = v; ctx.fillRect(0, 0, VW, VH);
  for (let i = 0; i < 180; i++) { ctx.fillStyle = i % 2 ? 'rgba(255,255,255,.05)' : 'rgba(0,0,0,.18)'; ctx.fillRect(Math.random() * VW, Math.random() * VH, 2, 2); }
}
function draw(now) {
  if (state === 'scare') return drawScare(now);
  // 걸을 때 고개가 살짝 흔들리고, 뒤돌 때는 화면이 휙 돈다
  const walking = state === 'play' && turnT < 0 && (keys.ArrowUp || keys.KeyW || touchWalk !== null);
  CY = CY0 + (walking ? Math.sin(bob) * 3.2 : 0);
  CX = CX0 + (walking ? Math.sin(bob / 2) * 2 : 0);
  if (turnT >= 0) CX += (turnT < .5 ? turnT : turnT - 1) * 2 * 620;
  if (anom === 'tilt' && state !== 'ready') {
    // 복도 전체가 비스듬히 기울어 있다
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, VW, VH);
    ctx.save(); ctx.translate(VW / 2, VH / 2); ctx.rotate(.09); ctx.scale(1.14, 1.14); ctx.translate(-VW / 2, -VH / 2);
    drawScene(now); ctx.restore();
  } else drawScene(now);
  if (turnT >= 0) { ctx.fillStyle = `rgba(0,0,0,${Math.sin(turnT * Math.PI) * .92})`; ctx.fillRect(0, 0, VW, VH); }

  if (state === 'ready') { ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillRect(0, 0, VW, VH); return; }
  // 층 · 시간 · 조작
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left'; ctx.font = '800 22px Pretendard, sans-serif'; ctx.fillStyle = 'rgba(235,228,214,.9)';
  ctx.fillText(`${floor}층`, 20, 28);
  ctx.textAlign = 'right'; ctx.font = '700 15px Pretendard, sans-serif'; ctx.fillStyle = 'rgba(235,228,214,.75)';
  ctx.fillText(fmtT((state === 'done' ? endT : now) - t0), VW - 20, 26);
  ctx.font = '700 12px Pretendard, sans-serif'; ctx.fillStyle = '#7d776e'; ctx.fillText(muted ? '🔇 M' : '🔊 M', VW - 20, 48);
  // 뒤돌기 버튼
  ctx.fillStyle = 'rgba(255,255,255,.08)'; ctx.beginPath(); ctx.arc(TURN_BTN.x, TURN_BTN.y, TURN_BTN.r, 0, 7); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.lineWidth = 2; ctx.stroke();
  ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(235,228,214,.85)'; ctx.font = '800 24px Pretendard, sans-serif'; ctx.fillText('↺', TURN_BTN.x, TURN_BTN.y - 6);
  ctx.font = '700 11px Pretendard, sans-serif'; ctx.fillText('뒤돌기 S', TURN_BTN.x, TURN_BTN.y + 18);
  if (floor <= 2 && state === 'play') {
    ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(VW / 2 - 230, VH - 78, 460, 56);
    ctx.fillStyle = 'rgba(235,228,214,.9)'; ctx.font = '700 14px Pretendard, sans-serif';
    ctx.fillText('이상한 게 없으면 ▲ 끝까지 앞으로 (W · 화면 누르고 있기)', VW / 2, VH - 60);
    ctx.fillText('이상한 게 보이면 ↺ 뒤돌아서 처음 계단으로', VW / 2, VH - 38);
  }
  if (floor === GOAL && state === 'play' && pz < 4) {
    ctx.fillStyle = 'rgba(200,240,210,.85)'; ctx.font = '800 16px Pretendard, sans-serif'; ctx.fillText('마지막 층. 끝의 문으로 나가세요', VW / 2, VH - 40);
  }
  // 층 넘어가기
  if (state === 'trans') {
    const k = (now - trans.at) / 1000, fail = trans.kind === 'fail';
    const a = fail ? (k < 1.4 ? 1 : 1 - (k - 1.4) / .4) : k < .55 ? k / .55 : k < 1.4 ? 1 : 1 - (k - 1.4) / .4;
    ctx.fillStyle = `rgba(0,0,0,${Math.max(0, Math.min(1, a))})`; ctx.fillRect(0, 0, VW, VH);
    if (k > .55 && k < 1.5) {
      ctx.globalAlpha = Math.min(1, (k - .55) / .2) * Math.min(1, (1.5 - k) / .2);
      if (fail) { ctx.fillStyle = '#b3121c'; ctx.font = '800 18px Pretendard, sans-serif'; ctx.fillText('처음부터…', VW / 2, VH / 2 - 44); }
      ctx.fillStyle = '#e8e0d0'; ctx.font = '900 46px Pretendard, sans-serif'; ctx.fillText(`${floor}층`, VW / 2, VH / 2);
      if (floor === GOAL) { ctx.font = '700 15px Pretendard, sans-serif'; ctx.fillStyle = '#9fd8b0'; ctx.fillText('마지막 층', VW / 2, VH / 2 + 40); }
      ctx.globalAlpha = 1;
    }
  }
  if (state === 'done') {
    const k = Math.min(1, (now - endT) / 900);
    ctx.fillStyle = `rgba(230,240,232,${k})`; ctx.fillRect(0, 0, VW, VH);
    ctx.globalAlpha = k; ctx.fillStyle = '#1d3a26'; ctx.font = '900 34px Pretendard, sans-serif'; ctx.fillText('탈출했다', VW / 2, VH / 2); ctx.globalAlpha = 1;
  }
}

function frame(now) { update(now); draw(now); requestAnimationFrame(frame); }
requestAnimationFrame(frame);

/* ---------- 입력 ---------- */
document.addEventListener('keydown', e => {
  if (document.querySelector('.overlay')) return;
  if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'].includes(e.code)) e.preventDefault();
  if (e.code === 'KeyM') { muted = !muted; setAmb(state === 'play'); return; }
  if (state === 'ready' && e.code === 'Space') return start();
  if ((e.code === 'ArrowDown' || e.code === 'KeyS') && !e.repeat) turn();
  keys[e.code] = true;
});
document.addEventListener('keyup', e => { keys[e.code] = false; });
window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; touchWalk = null; });
// 화면을 누르고 있으면 걷고, 왼쪽 아래 ↺ 버튼은 뒤돌기
cv.addEventListener('pointerdown', e => {
  if (state !== 'play') return;
  if (e.pointerType !== 'touch' && e.button !== 0) return;
  e.preventDefault();
  const p = canvasPoint(cv, VW, e);
  if (Math.hypot(p.x - TURN_BTN.x, p.y - TURN_BTN.y) < TURN_BTN.r + 14) return turn();
  touchWalk = e.pointerId; cv.setPointerCapture?.(e.pointerId);
});
const endWalk = e => { if (e.pointerId === touchWalk) touchWalk = null; };
cv.addEventListener('pointerup', endWalk);
cv.addEventListener('pointercancel', endWalk);
veil.addEventListener('click', start);
