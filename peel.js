import { initGamePage, showResult, setupCanvas, canvasPoint, IS_MOBILE } from './common.js?v=63';

initGamePage('peel');

// 휴대폰은 세로로 긴 판(버튼 · 과일을 크게), 컴퓨터는 조금 낮은 판
const MOB = IS_MOBILE;
const W = 420;
const TIME = 60;                          // 한 판 60초
const ARROWS = 10;                        // 과일 하나에 10칸(화살표 · 스페이스가 섞여 나온다)
const SPACE = 4;                          // 순서 안의 '돌리기(스페이스)' 칸
const INK = '#5b4466';
const FS = MOB ? 1.15 : 1;                // 과일 크기 배율
const FX = 246, FY = MOB ? 312 : 232;     // 과일 자리(왼쪽엔 토끼)
const BOARD = FY + 70 * FS;               // 도마 윗면
// 순서판: 10칸을 한 줄로, 판 너비를 거의 다 써서 크게
const PX = 8, TOK = 37, TGAP = 2;
const SY = BOARD + 66, SH = 34 + TOK + 14;
// 버튼: ← ↑ ↓ → 돌리기 를 한 줄로
const BY = SY + SH + 16, BG = 8, SBW = 104, BW = (W - 28 - BG * 4 - SBW) / 4, BH = MOB ? 150 : 104;
const H = BY + BH + 16;
const cv = document.getElementById('cv');
if (MOB) document.getElementById('stage').classList.add('tall');
const ctx = setupCanvas(cv, W, H);
const veil = document.getElementById('veil');

// 과일: 껍질색 · 속살색 · 크기 · 모양
const FRUITS = [
  { name: '사과', peel: '#ff5a5f', flesh: '#fff4d6', r: 78, shape: 'apple' },
  { name: '배', peel: '#d6df63', flesh: '#fffbe6', r: 76, shape: 'pear' },
  { name: '오렌지', peel: '#ffa53d', flesh: '#ffd27a', r: 78, shape: 'round' },
  { name: '복숭아', peel: '#ffb0a3', flesh: '#fff0cf', r: 78, shape: 'peach' },
  { name: '키위', peel: '#a07c4c', flesh: '#a5d65c', r: 70, shape: 'oval' },
  { name: '수박', peel: '#3fae4f', flesh: '#ff5d6c', r: 96, shape: 'round', stripes: true },
];
// 방향: 0 위 · 1 오른쪽 · 2 아래 · 3 왼쪽
const KEY_DIR = { ArrowUp: 0, KeyW: 0, ArrowRight: 1, KeyD: 1, ArrowDown: 2, KeyS: 2, ArrowLeft: 3, KeyA: 3 };
const BTN_ORDER = [3, 0, 2, 1];           // 화면 버튼은 ← ↑ ↓ → 순서

let state = 'ready';   // ready → play → over → done
let count = 0, miss = 0, seq = [], prog = 0, kind = 0, endAt = 0;
let spinAt = -1e9, enterAt = 0, shakeAt = -1e9, okAt = -1e9, flies = [], pops = [], sparks = [], pressed = {};

const rnd = (a, b) => a + Math.random() * (b - a);
function newFruit(now) {
  kind = count < 12 ? Math.floor(count / 2) : Math.floor(Math.random() * FRUITS.length);
  seq = [];
  // ← ↑ ↓ → 스페이스(돌리기) 다섯 개가 똑같은 확률로 섞여 나온다
  for (let i = 0; i < ARROWS; i++) {
    let d;
    do d = Math.floor(Math.random() * 5);
    while (i >= 2 && d === seq[i - 1] && d === seq[i - 2]);   // 같은 것 3번 연속은 안 나오게
    seq.push(d);
  }
  prog = 0; enterAt = now;
}
function start() {
  const now = performance.now();
  count = 0; miss = 0; flies = []; pops = []; sparks = []; shakeAt = -1e9; okAt = -1e9;
  endAt = now + TIME * 1000;
  newFruit(now);
  state = 'play'; veil.hidden = true;
}
function press(dir, now) {
  pressed[dir] = now;
  if (state !== 'play') return;
  if (dir === seq[prog]) {
    prog++;
    if (dir === SPACE) spinAt = now;   // 과일을 휙 돌린다
    if (prog >= seq.length) {
      count++; okAt = now;
      flies.push({ kind, t: now });
      pops.push({ s: '+1', x: FX, y: FY - 100 * FS, t: now });
      const f = FRUITS[kind];
      for (let i = 0; i < 14; i++) { const a = Math.random() * 6.28, s = rnd(120, 260); sparks.push({ x: FX, y: FY, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 80, life: .6, c: i % 2 ? f.flesh : '#ffffff' }); }
      newFruit(now);
    }
  } else {
    // 틀리면 이 과일은 처음부터
    miss++; prog = 0; shakeAt = now;
    pops.push({ s: '처음부터!', x: FX, y: FY - 100 * FS, t: now });
  }
}
function finish() {
  state = 'over';
  setTimeout(() => {
    state = 'done';
    showResult('peel', count, { detail: miss ? `틀려서 처음부터 다시 깎은 게 ${miss}번이에요` : '한 번도 안 틀렸어요!', onRetry: start });
  }, 1100);
}

/* ---------- 그리기 ---------- */
function rr(x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
function outlined(s, x, y, font, fill, lw = 8) {
  ctx.font = font; ctx.strokeStyle = '#fff'; ctx.lineWidth = lw; ctx.lineJoin = 'round';
  ctx.strokeText(s, x, y); ctx.fillStyle = fill; ctx.fillText(s, x, y);
}
function fruitPath(f, x, y, r) {
  ctx.beginPath();
  if (f.shape === 'pear') {
    ctx.arc(x, y + r * .22, r * .82, 0, Math.PI * 2);
    ctx.moveTo(x + r * .52, y - r * .45); ctx.arc(x, y - r * .45, r * .52, 0, Math.PI * 2);
  } else if (f.shape === 'oval') {
    ctx.ellipse(x, y, r * 1.12, r * .92, 0, 0, Math.PI * 2);
  } else if (f.shape === 'apple' || f.shape === 'peach') {
    // 위쪽이 살짝 오목한 모양: 동그라미 세 개를 겹친다
    ctx.arc(x - r * .32, y, r * .72, 0, Math.PI * 2);
    ctx.moveTo(x + r * .32 + r * .72, y); ctx.arc(x + r * .32, y, r * .72, 0, Math.PI * 2);
    ctx.moveTo(x + r * .9, y + r * .1); ctx.arc(x, y + r * .1, r * .9, 0, Math.PI * 2);
  } else ctx.arc(x, y, r, 0, Math.PI * 2);
}
// done: 0~1 깎인 정도
function drawFruit(f, x, y, s, done) {
  const r = f.r * s;
  ctx.fillStyle = 'rgba(91,68,102,.13)'; ctx.beginPath(); ctx.ellipse(x, y + r * 1.02, r * .8, r * .16, 0, 0, Math.PI * 2); ctx.fill();
  ctx.save();
  fruitPath(f, x, y, r); ctx.fillStyle = f.peel; ctx.fill('nonzero');
  fruitPath(f, x, y, r); ctx.clip('nonzero');
  if (f.stripes) {
    ctx.strokeStyle = '#237a35'; ctx.lineWidth = 9 * s;
    for (let i = -3; i <= 3; i++) { ctx.beginPath(); ctx.moveTo(x + i * r * .3, y - r); ctx.quadraticCurveTo(x + i * r * .3 + r * .14, y, x + i * r * .3, y + r); ctx.stroke(); }
  }
  // 깎인 부분: 꼭대기부터 시계 방향으로 속살이 드러난다
  if (done > 0) {
    ctx.fillStyle = f.flesh; ctx.beginPath(); ctx.moveTo(x, y);
    ctx.arc(x, y, r * 2, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * done); ctx.closePath(); ctx.fill();
    if (f.name === '키위') {
      ctx.fillStyle = '#3d2a1a';
      for (let i = 0; i < 12; i++) { const a = -Math.PI / 2 + i / 12 * Math.PI * 2; if (i / 12 < done) { ctx.beginPath(); ctx.ellipse(x + Math.cos(a) * r * .45, y + Math.sin(a) * r * .38, 3 * s, 2 * s, a, 0, Math.PI * 2); ctx.fill(); } }
    }
  }
  // 반짝임
  ctx.fillStyle = 'rgba(255,255,255,.45)'; ctx.beginPath(); ctx.ellipse(x - r * .38, y - r * .38, r * .16, r * .09, -.7, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  // 꼭지 · 잎
  const topY = f.shape === 'pear' ? y - r * .95 : f.shape === 'oval' ? y - r * .9 : y - r * .78;
  if (f.shape !== 'oval') {
    ctx.strokeStyle = '#7a5230'; ctx.lineWidth = 5 * s; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x, topY + 6 * s); ctx.quadraticCurveTo(x + 2 * s, topY - 10 * s, x + 6 * s, topY - 16 * s); ctx.stroke();
    ctx.fillStyle = '#5fc46b'; ctx.beginPath(); ctx.ellipse(x + 18 * s, topY - 10 * s, 14 * s, 7 * s, -.5, 0, Math.PI * 2); ctx.fill();
  }
}
// 칼날 자리와 손잡이 자리(토끼 손이 여기를 잡는다)
function knifeAt(f, x, y, done) {
  const a = -Math.PI / 2 + Math.PI * 2 * done, rot = a + Math.PI / 2, r = f.r * FS;
  const ex = x + Math.cos(a) * r * .98, ey = y + Math.sin(a) * r * .98;
  return { a, ex, ey, hx: ex - Math.cos(rot) * 20 - Math.sin(rot) * 2, hy: ey - Math.sin(rot) * 20 + Math.cos(rot) * 2 };
}

/* ---------- 토끼 ---------- */
const BX = 78, BASE = BOARD + 24;
const LINE = '#e3d2e6', FUR = '#ffffff', PINK = '#ffc4d6';
function blob(fn, fill = FUR) { ctx.beginPath(); fn(); ctx.fillStyle = fill; ctx.fill(); ctx.strokeStyle = LINE; ctx.lineWidth = 3; ctx.stroke(); }
function bunnyY(now) {
  const last = Math.max(0, ...Object.values(pressed));
  return Math.sin(now / 420) * 1.5 + (now - last < 90 ? 3 : 0) - (now - okAt < 260 ? 8 * Math.sin((now - okAt) / 260 * Math.PI) : 0);
}
function drawBunny(now) {
  const dy = bunnyY(now), hy = BASE - 96 + dy;
  // 귀
  for (const [ox, tilt] of [[-12, -.18], [14, .22]]) {
    blob(() => ctx.ellipse(BX + ox, hy - 46, 11, 30, tilt, 0, Math.PI * 2));
    ctx.fillStyle = PINK; ctx.beginPath(); ctx.ellipse(BX + ox, hy - 44, 5, 20, tilt, 0, Math.PI * 2); ctx.fill();
  }
  // 몸 · 머리
  blob(() => ctx.ellipse(BX, BASE - 34 + dy * .5, 34, 36, 0, 0, Math.PI * 2));
  ctx.fillStyle = '#fff3f7'; ctx.beginPath(); ctx.ellipse(BX + 4, BASE - 28 + dy * .5, 20, 22, 0, 0, Math.PI * 2); ctx.fill();
  blob(() => ctx.ellipse(BX + 2, hy, 36, 32, 0, 0, Math.PI * 2));
  // 얼굴(과일 쪽을 본다)
  const ex1 = BX - 4, ex2 = BX + 20, ey = hy - 2;
  ctx.strokeStyle = INK; ctx.fillStyle = INK; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  if (now - okAt < 380) {                       // 신남 ^ ^
    for (const x of [ex1, ex2]) { ctx.beginPath(); ctx.moveTo(x - 5, ey + 2); ctx.lineTo(x, ey - 3); ctx.lineTo(x + 5, ey + 2); ctx.stroke(); }
  } else if (now - shakeAt < 450) {             // 당황 > <
    ctx.beginPath(); ctx.moveTo(ex1 - 5, ey - 4); ctx.lineTo(ex1 + 4, ey); ctx.lineTo(ex1 - 5, ey + 4); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(ex2 + 5, ey - 4); ctx.lineTo(ex2 - 4, ey); ctx.lineTo(ex2 + 5, ey + 4); ctx.stroke();
    ctx.fillStyle = '#8fd0ff'; ctx.beginPath(); ctx.moveTo(BX + 34, hy - 26); ctx.quadraticCurveTo(BX + 40, hy - 14, BX + 34, hy - 12); ctx.quadraticCurveTo(BX + 28, hy - 14, BX + 34, hy - 26); ctx.fill();
  } else if (now % 3200 < 130) {                // 깜빡
    for (const x of [ex1, ex2]) { ctx.beginPath(); ctx.moveTo(x - 4, ey); ctx.lineTo(x + 4, ey); ctx.stroke(); }
  } else {
    for (const x of [ex1, ex2]) {
      ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(x, ey, 4.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x + 1.5, ey - 1.5, 1.6, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.fillStyle = 'rgba(255,140,170,.45)';
  ctx.beginPath(); ctx.ellipse(ex1 - 8, ey + 11, 7, 4, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(ex2 + 8, ey + 11, 7, 4, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ff8fab'; ctx.beginPath(); ctx.ellipse(BX + 8, ey + 7, 3.5, 2.5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = INK; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(BX + 3, ey + 11); ctx.quadraticCurveTo(BX + 8, ey + 15, BX + 8, ey + 10); ctx.quadraticCurveTo(BX + 8, ey + 15, BX + 13, ey + 11); ctx.stroke();
  // 안 쓰는 손 · 발
  blob(() => ctx.ellipse(BX - 26, BASE - 36 + dy * .5, 9, 11, .4, 0, Math.PI * 2));
  blob(() => ctx.ellipse(BX - 14, BASE - 2, 14, 8, 0, 0, Math.PI * 2));
  blob(() => ctx.ellipse(BX + 16, BASE - 2, 14, 8, 0, 0, Math.PI * 2));
}
// 칼 잡은 팔: 과일 뒤로 지나가 손잡이를 잡는다
function bunnyArm(now, hx, hy) {
  const sx = BX + 22, sy = BASE - 46 + bunnyY(now) * .5;
  ctx.lineCap = 'round';
  ctx.strokeStyle = LINE; ctx.lineWidth = 19; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(hx, hy); ctx.stroke();
  ctx.strokeStyle = FUR; ctx.lineWidth = 13; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(hx, hy); ctx.stroke();
}
function bunnyPaw(hx, hy) { blob(() => ctx.arc(hx, hy, 9, 0, Math.PI * 2)); }

function drawPeelAndKnife(f, x, y, done, now) {
  const { a, ex, ey, hx, hy } = knifeAt(f, x, y, done);
  // 껍질이 길게 늘어진다
  if (done > 0) {
    const len = (24 + 150 * done) * FS;
    ctx.strokeStyle = f.peel; ctx.lineWidth = 11 * FS; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(ex, ey);
    for (let i = 1; i <= 16; i++) {
      const k = i / 16;
      ctx.lineTo(ex + Math.sin(k * 9 + now / 260) * 12 * k + (ex > x ? 14 : -14) * k, ey + len * k);
    }
    ctx.stroke();
  }
  // 칼
  ctx.save(); ctx.translate(ex, ey); ctx.rotate(a + Math.PI / 2);
  ctx.fillStyle = '#dfe6f0'; ctx.strokeStyle = '#8a94a8'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-4, -4); ctx.lineTo(34, -4); ctx.quadraticCurveTo(42, 2, 34, 8); ctx.lineTo(-4, 8); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#b07a4a'; rr(-36, -5, 32, 14, 6); ctx.fill();
  ctx.restore();
  bunnyPaw(hx, hy);
}
function arrow(x, y, s, dir, col) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(dir * Math.PI / 2);
  ctx.fillStyle = col; ctx.beginPath();
  ctx.moveTo(0, -s); ctx.lineTo(s * .85, -s * .05); ctx.lineTo(s * .32, -s * .05); ctx.lineTo(s * .32, s * .85);
  ctx.lineTo(-s * .32, s * .85); ctx.lineTo(-s * .32, -s * .05); ctx.lineTo(-s * .85, -s * .05); ctx.closePath(); ctx.fill();
  ctx.restore();
}
// 돌리기 표시(↻)
function spinIcon(x, y, s, col) {
  ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = s * .28; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(x, y, s, -Math.PI * .35, Math.PI * 1.25); ctx.stroke();
  const a = -Math.PI * .35, tx = x + Math.cos(a) * s, ty = y + Math.sin(a) * s;
  ctx.beginPath(); ctx.moveTo(tx + s * .55, ty - s * .05); ctx.lineTo(tx - s * .2, ty - s * .5); ctx.lineTo(tx - s * .05, ty + s * .45); ctx.closePath(); ctx.fill();
}
// 버튼 5개: ← ↑ ↓ → 돌리기(넓게)
const BTNS = [...BTN_ORDER.map((dir, i) => ({ dir, x: 14 + i * (BW + BG), w: BW })), { dir: SPACE, x: 14 + 4 * (BW + BG), w: SBW }];

// 순서판: 보여 주기만 하는 판. 10칸을 한 줄로, 지금 누를 차례만 더 크게
function drawSequence(now) {
  ctx.fillStyle = '#f3e9fa'; rr(PX, SY, W - PX * 2, SH, 18); ctx.fill();
  ctx.strokeStyle = '#e2d2ee'; ctx.lineWidth = 2; ctx.setLineDash([6, 5]); ctx.stroke(); ctx.setLineDash([]);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = '800 14px Pretendard, sans-serif'; ctx.fillStyle = INK;
  if (state === 'ready') {
    ctx.fillText('이 판에 나오는 화살표와 스페이스(돌리기)를', W / 2, SY + SH / 2 - 12);
    ctx.fillText('순서대로 아래 버튼으로 누르세요', W / 2, SY + SH / 2 + 12);
    return;
  }
  ctx.fillText(`${FRUITS[kind].name} · 이 순서대로 아래 버튼을 누르세요`, W / 2, SY + 17);
  const n = seq.length, bad = now - shakeAt < 320;
  const x0 = (W - (TOK * n + TGAP * (n - 1))) / 2, cy = SY + 34 + TOK / 2;
  for (let i = 0; i < n; i++) {
    const cx = x0 + i * (TOK + TGAP) + TOK / 2, sp = seq[i] === SPACE;
    const cur = i === prog && state === 'play', done = i < prog;
    const s = TOK * (cur ? 1.1 : .96);
    ctx.fillStyle = bad ? '#ffd9e0' : done ? '#e4d8ee' : sp ? '#fff0b8' : '#ffffff';
    rr(cx - s / 2, cy - s / 2, s, s, s * .3); ctx.fill();
    if (cur) { ctx.strokeStyle = '#ff7fa0'; ctx.lineWidth = 3; ctx.stroke(); }
    const col = done ? '#c9bad8' : bad ? '#ff5c7a' : sp ? '#b8741e' : INK;
    if (sp) {
      spinIcon(cx, cy - 4, s * .2, col);
      ctx.font = `900 ${Math.round(s * .21)}px Pretendard, sans-serif`; ctx.fillStyle = col;
      ctx.fillText('SPACE', cx, cy + s * .3);
    } else arrow(cx, cy, s * .36, seq[i], col);
  }
}
// 누르는 버튼: 진한 분홍 · 두툼하게 튀어나온 모양
function drawButtons(now) {
  for (const b of BTNS) {
    const down = now - (pressed[b.dir] || -1e9) < 110, d = down ? 5 : 0, sp = b.dir === SPACE;
    ctx.fillStyle = sp ? '#c9862e' : '#d95f84'; rr(b.x, BY + 7, b.w, BH - 7, 20); ctx.fill();
    ctx.fillStyle = sp ? (down ? '#ffd27a' : '#ffb84d') : (down ? '#ff9db7' : '#ff7fa0'); rr(b.x, BY + d, b.w, BH - 7, 20); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.22)'; rr(b.x + 8, BY + d + 6, b.w - 16, 10, 5); ctx.fill();
    const mid = BY + d + (BH - 7) / 2;
    if (sp) {
      spinIcon(b.x + b.w / 2, mid - 10, 14, '#ffffff');
      ctx.font = '900 15px Pretendard, sans-serif'; ctx.fillStyle = '#ffffff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(MOB ? '돌리기' : '돌리기 Space', b.x + b.w / 2, mid + 22);
    } else arrow(b.x + b.w / 2, mid, Math.min(26, b.w * .32), b.dir, '#ffffff');
  }
}

function draw(now) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#fff6e8'); g.addColorStop(1, '#ffeef4');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // 도마
  ctx.fillStyle = '#f1d3a8'; rr(20, BOARD, W - 40, 40, 18); ctx.fill();
  ctx.fillStyle = '#e4bf8c'; rr(20, BOARD + 26, W - 40, 14, 8); ctx.fill();
  drawBunny(now);

  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  if (state === 'play' && now >= endAt) finish();
  const left = state === 'ready' ? TIME : state === 'play' ? Math.max(0, (endAt - now) / 1000) : 0;
  // 깎은 개수 · 남은 시간
  outlined(`${count}개`, W / 2, 44, '900 40px Pretendard, sans-serif', '#ff6f8e');
  ctx.fillStyle = 'rgba(91,68,102,.12)'; rr(40, 78, W - 80, 12, 6); ctx.fill();
  ctx.fillStyle = left < 10 ? '#ff5c7a' : '#ffb84d'; rr(40, 78, (W - 80) * left / TIME, 12, 6); ctx.fill();
  ctx.font = '800 14px Pretendard, sans-serif'; ctx.fillStyle = INK;
  ctx.fillText(`남은 시간 ${Math.ceil(left)}초`, W / 2, 106);

  // 다 깎은 과일은 오른쪽 위로 톡 튀어 날아간다
  for (const fl of flies) {
    // 스페이스바로 돌리면 빙글 돌면서 날아간다
    const k = (now - fl.t) / 520;
    ctx.globalAlpha = Math.max(0, 1 - k * k);
    ctx.save(); ctx.translate(FX + k * 110, FY - Math.sin(k * Math.PI) * 90 - k * 40); ctx.rotate(k * Math.PI * 3);
    drawFruit(FRUITS[fl.kind], 0, 0, FS * (1 - k * .4), 1);
    ctx.restore();
    ctx.globalAlpha = 1;
  }
  flies = flies.filter(fl => now - fl.t < 520);

  if (state === 'play') {
    const f = FRUITS[kind];
    const ek = Math.min(1, (now - enterAt) / 180);
    let x = FX + (1 - ek) * 200;
    if (now - shakeAt < 320) x += Math.sin((now - shakeAt) / 20) * 7 * (1 - (now - shakeAt) / 320);
    const done = Math.min(1, prog / ARROWS), k = knifeAt(f, x, FY, done);
    bunnyArm(now, k.hx, k.hy);
    // 스페이스: 과일이 한 바퀴 휙 돈다
    const sk = (now - spinAt) / 260;
    if (sk >= 0 && sk < 1) {
      ctx.save(); ctx.translate(x, FY); ctx.rotate((1 - (1 - sk) ** 3) * Math.PI * 2);
      drawFruit(f, 0, 0, FS, done); ctx.restore();
    } else drawFruit(f, x, FY, FS, done);
    drawPeelAndKnife(f, x, FY, done, now);
  } else {
    const f = state === 'ready' ? FRUITS[0] : FRUITS[kind];
    const k = knifeAt(f, FX, FY, 0);
    bunnyArm(now, k.hx, k.hy);
    drawFruit(f, FX, FY, FS, 0);
    drawPeelAndKnife(f, FX, FY, 0, now);
  }

  drawSequence(now);
  drawButtons(now);

  for (const s of sparks) {
    s.x += s.vx / 60; s.y += s.vy / 60; s.vy += 12; s.life -= 1 / 60;
    ctx.globalAlpha = Math.max(0, s.life / .6); ctx.fillStyle = s.c;
    ctx.beginPath(); ctx.arc(s.x, s.y, 5, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
  sparks = sparks.filter(s => s.life > 0);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (const p of pops) {
    const k = (now - p.t) / 700;
    ctx.globalAlpha = Math.max(0, 1 - k);
    outlined(p.s, p.x, p.y - k * 30, '900 24px Pretendard, sans-serif', p.s === '+1' ? '#4c9dff' : '#ff5c7a', 6);
    ctx.globalAlpha = 1;
  }
  pops = pops.filter(p => now - p.t < 700);

  if (state === 'over' || state === 'done') {
    ctx.fillStyle = 'rgba(255,255,255,.88)'; rr(W / 2 - 110, FY - 34, 220, 68, 20); ctx.fill();
    outlined('시간 끝!', W / 2, FY, '900 38px Pretendard, sans-serif', '#4c9dff', 8);
  }
}

function frame(now) { draw(now); requestAnimationFrame(frame); }
requestAnimationFrame(frame);

cv.addEventListener('pointerdown', e => {
  if (e.pointerType !== 'touch' && e.button !== 0) return;
  e.preventDefault();
  const p = canvasPoint(cv, W, e);
  for (const b of BTNS) {
    if (p.x >= b.x - BG / 2 && p.x <= b.x + b.w + BG / 2 && p.y >= BY - 8 && p.y <= BY + BH + 10) return press(b.dir, performance.now());
  }
});
document.addEventListener('keydown', e => {
  if (document.querySelector('.overlay')) return;
  if (e.code === 'Space') {
    e.preventDefault();
    if (e.repeat) return;
    if (state === 'ready') start(); else press(SPACE, performance.now());
    return;
  }
  if (e.code in KEY_DIR) { e.preventDefault(); if (!e.repeat) press(KEY_DIR[e.code], performance.now()); }
});
veil.addEventListener('click', start);
