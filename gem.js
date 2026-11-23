import { initGamePage, showResult, setupCanvas, canvasPoint } from './common.js?v=50';

initGamePage('gem');

const COLS = 6, ROWS = 13, C = 38, BX = 22, BY = 34;
const W = 420, H = 560;
const cv = document.getElementById('cv');
const ctx = setupCanvas(cv, W, H);
const veil = document.getElementById('veil');
const FONT = 'Galmuri11, Pretendard, sans-serif';
const INK = '#0b0a1e';

/* ---------- 보석 그림 (9×9 픽셀) ---------- */
const GEM_MAP = [
  '..ooooo..',
  '.olllllo.',
  'olwlllmmo',
  'ollllmmmo',
  'olllmmmdo',
  'olmmmmddo',
  'ommmmdddo',
  '.odddddo.',
  '..ooooo..',
];
// [밝은 면, 가운데, 그늘, 테두리]
const COLORS = [
  ['#ff9aa8', '#ff3b5c', '#b0123a', '#4a0718'],   // 빨강
  ['#ffe99a', '#ffc21f', '#c98400', '#4a2c00'],   // 노랑
  ['#a8ffb0', '#2fd85a', '#118a34', '#063014'],   // 초록
  ['#b0f6ff', '#2fd0f0', '#1080b0', '#06304a'],   // 하늘
  ['#b0bcff', '#5068ff', '#2430b0', '#0c1250'],   // 파랑
  ['#f0b0ff', '#c050f0', '#7020a8', '#2e0848'],   // 보라
];
const PX = 4;
function gemSprite(pal) {
  const c = document.createElement('canvas');
  c.width = c.height = 9 * PX;
  const g = c.getContext('2d');
  const col = { l: pal[0], m: pal[1], d: pal[2], o: pal[3], w: '#ffffff' };
  GEM_MAP.forEach((row, y) => [...row].forEach((ch, x) => { if (col[ch]) { g.fillStyle = col[ch]; g.fillRect(x * PX, y * PX, PX, PX); } }));
  return c;
}
const SPRITES = COLORS.map(gemSprite);
const WHITE = gemSprite(['#ffffff', '#ffffff', '#e8e8ff', '#ffffff']);
const GREY = gemSprite(['#9a98b0', '#6a6880', '#4a4860', '#1a1830']);

/* ---------- 상태 ---------- */
let state = 'ready';     // ready → play ↔ clear → over → done
let board, piece, next, score, gems, level, chain, maxChain, acc, lockT, last, clearing, clearAt, popups = [], overAt = 0, magicCount = 0;

const emptyBoard = () => Array.from({ length: ROWS }, () => Array(COLS).fill(-1));
function newPiece() {
  // 레벨 3부터 가끔 무지개 보석: 닿은 칸의 색을 판에서 모두 없앤다
  if (gems >= 60 && Math.random() < 1 / 22) return { magic: true, g: [-2, -2, -2] };
  const n = Math.min(COLORS.length, level >= 6 ? 6 : 5);
  return { g: [0, 1, 2].map(() => Math.floor(Math.random() * n)) };
}
function start() {
  board = emptyBoard(); score = 0; gems = 0; level = 1; chain = 0; maxChain = 0; magicCount = 0;
  acc = 0; lockT = 0; popups = []; clearing = null;
  next = newPiece(); spawn();
  last = performance.now();
  state = 'play'; veil.hidden = true;
}
function spawn() {
  piece = { ...next, g: next.g.slice(), x: 2, y: -3 };
  next = newPiece(); acc = 0; lockT = 0;
}
const cellFree = (x, y) => x >= 0 && x < COLS && y < ROWS && (y < 0 || board[y][x] < 0);
const fits = (x, y) => [0, 1, 2].every(i => cellFree(x, y + i));
const grounded = () => !fits(piece.x, piece.y + 1);

function move(dx) {
  if (state !== 'play') return;
  if (fits(piece.x + dx, piece.y)) { piece.x += dx; if (grounded()) lockT = Math.min(lockT, 150); }
}
function cycle() {
  if (state !== 'play' || piece.magic) return;
  piece.g.unshift(piece.g.pop());     // 맨 아래 보석이 맨 위로
}
function softDrop() {
  if (state !== 'play') return;
  if (!grounded()) { piece.y++; acc = 0; score += 1; } else lockT = 999;
}
function hardDrop() {
  if (state !== 'play') return;
  let n = 0;
  while (!grounded()) { piece.y++; n++; }
  score += n * 2;
  lock();
}

function lock() {
  const { x, y } = piece;
  if (piece.magic) {
    const below = y + 3 < ROWS ? board[y + 3][x] : -1;
    const marks = new Set();
    if (below >= 0) for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (board[r][c] === below) marks.add(r * COLS + c);
    magicCount++;
    if (marks.size) { chain = 0; startClear(marks, true); return; }
    popups.push({ text: '꽝!', x: BX + x * C + C / 2, y: BY + (y + 2) * C, t: performance.now() });
    return spawn();
  }
  if (y < 0) return gameOver();
  for (let i = 0; i < 3; i++) board[y + i][x] = piece.g[i];
  chain = 0;
  resolve();
}
// 가로 · 세로 · 대각선 두 방향으로 같은 색이 3개 이상 이어진 칸을 찾는다
function findMatches() {
  const marks = new Set();
  for (const [dx, dy] of [[1, 0], [0, 1], [1, 1], [1, -1]]) {
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
      const c = board[y][x];
      if (c < 0) continue;
      const px0 = x - dx, py0 = y - dy;
      if (px0 >= 0 && px0 < COLS && py0 >= 0 && py0 < ROWS && board[py0][px0] === c) continue;   // 줄의 시작에서만 센다
      let n = 1;
      while (true) {
        const nx = x + dx * n, ny = y + dy * n;
        if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS || board[ny][nx] !== c) break;
        n++;
      }
      if (n >= 3) for (let k = 0; k < n; k++) marks.add((y + dy * k) * COLS + x + dx * k);
    }
  }
  return marks;
}
function resolve() {
  const marks = findMatches();
  if (!marks.size) {
    state = 'play';
    // 맨 윗줄 가운데가 막히면 끝
    if (board[0][2] >= 0) return gameOver();
    return spawn();
  }
  startClear(marks, false);
}
function startClear(marks, magic) {
  chain++;
  maxChain = Math.max(maxChain, chain);
  const n = marks.size;
  const gain = n * 10 * chain * level;
  score += gain;
  gems += n;
  level = 1 + Math.floor(gems / 30);
  let sx = 0, sy = 0;
  for (const m of marks) { sx += m % COLS; sy += Math.floor(m / COLS); }
  popups.push({ text: chain > 1 ? `${chain}연쇄! +${gain}` : `+${gain}`, x: BX + (sx / n + .5) * C, y: BY + (sy / n + .5) * C, t: performance.now(), big: chain > 1 });
  clearing = marks; clearAt = performance.now();
  state = 'clear';
}
function finishClear() {
  for (const m of clearing) board[Math.floor(m / COLS)][m % COLS] = -1;
  clearing = null;
  // 빈칸 메우기: 위 보석이 아래로 떨어진다
  for (let x = 0; x < COLS; x++) {
    const col = [];
    for (let y = ROWS - 1; y >= 0; y--) if (board[y][x] >= 0) col.push(board[y][x]);
    for (let y = ROWS - 1, i = 0; y >= 0; y--, i++) board[y][x] = i < col.length ? col[i] : -1;
  }
  resolve();
}
function gameOver() {
  state = 'over'; overAt = performance.now();
  setTimeout(() => {
    state = 'done';
    showResult('gem', score, {
      detail: `레벨 ${level} · 보석 ${gems}개 · 최대 ${maxChain}연쇄`,
      extra: { level, gems, maxChain }, onRetry: start,
    });
  }, 1000);
}

function update(now) {
  const dt = Math.min(100, now - last); last = now;
  popups = popups.filter(p => now - p.t < 1100);
  if (state === 'clear' && now - clearAt > 420) finishClear();
  if (state !== 'play') return;
  const interval = Math.max(110, 850 - (level - 1) * 65);
  if (grounded()) {
    lockT += dt;
    if (lockT >= 380) lock();
  } else {
    acc += dt;
    while (acc >= interval && !grounded()) { acc -= interval; piece.y++; }
  }
}

/* ---------- 그리기 ---------- */
const STARS = Array.from({ length: 70 }, () => ({ x: Math.random() * W, y: Math.random() * H, p: Math.random() * 6, s: Math.random() < .2 ? 3 : 2 }));
function gem(c, x, y, now, size = C) {
  const off = (size - 36) / 2;
  let img = c === -2 ? SPRITES[Math.floor(now / 90) % SPRITES.length] : SPRITES[c];
  if (state === 'over' || state === 'done') img = GREY;
  if (size === C) ctx.drawImage(img, Math.round(x + off), Math.round(y + off));
  else ctx.drawImage(img, Math.round(x), Math.round(y), size, size);
}
function frameBox(x, y, w, h) {
  ctx.fillStyle = '#ff3bd4'; ctx.fillRect(x - 6, y - 6, w + 12, h + 12);
  ctx.fillStyle = '#2fd0f0'; ctx.fillRect(x - 4, y - 4, w + 8, h + 8);
  ctx.fillStyle = INK; ctx.fillRect(x - 2, y - 2, w + 4, h + 4);
}
function label(text, x, y, color = '#2fd0f0', size = 12) {
  ctx.font = `bold ${size}px ${FONT}`; ctx.fillStyle = color; ctx.fillText(text, x, y);
}
function draw(now) {
  // 배경: 어두운 우주 + 반짝이는 별
  ctx.fillStyle = '#140f30'; ctx.fillRect(0, 0, W, H);
  for (const s of STARS) {
    ctx.globalAlpha = .3 + .7 * Math.abs(Math.sin(now / 800 + s.p));
    ctx.fillStyle = '#c8c0ff'; ctx.fillRect(Math.round(s.x), Math.round(s.y), s.s, s.s);
  }
  ctx.globalAlpha = 1;

  // 판
  const bw = COLS * C, bh = ROWS * C;
  frameBox(BX, BY, bw, bh);
  ctx.fillStyle = '#1c1644';
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) if ((x + y) % 2) ctx.fillRect(BX + x * C, BY + y * C, C, C);
  // 위험선: 맨 윗줄
  ctx.fillStyle = 'rgba(255,59,92,.18)'; ctx.fillRect(BX, BY, bw, C);

  if (board) {
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
      const c = board[y][x];
      if (c < 0) continue;
      if (clearing && clearing.has(y * COLS + x)) {
        const blink = Math.floor((now - clearAt) / 70) % 2;
        if (blink) ctx.drawImage(WHITE, BX + x * C + 1, BY + y * C + 1);
        else gem(c, BX + x * C, BY + y * C, now);
      } else gem(c, BX + x * C, BY + y * C, now);
    }
    if (state === 'play') {
      // 떨어질 자리 표시
      let gy = piece.y; while (fits(piece.x, gy + 1)) gy++;
      ctx.fillStyle = 'rgba(255,255,255,.12)';
      for (let i = 0; i < 3; i++) if (gy + i >= 0) ctx.fillRect(BX + piece.x * C + 2, BY + (gy + i) * C + 2, C - 4, C - 4);
      ctx.save(); ctx.beginPath(); ctx.rect(BX, BY, bw, bh); ctx.clip();
      for (let i = 0; i < 3; i++) gem(piece.g[i], BX + piece.x * C, BY + (piece.y + i) * C, now);
      ctx.restore();
    }
  }
  // 화면 줄무늬 (CRT 느낌)
  ctx.fillStyle = 'rgba(0,0,0,.16)';
  for (let y = 0; y < H; y += 3) ctx.fillRect(0, y, W, 1);

  // 옆 정보
  const sx = BX + bw + 24, sw = W - sx - 14;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  frameBox(sx, BY, sw, 150);
  label('NEXT', sx + sw / 2, BY + 16);
  if (next && board) for (let i = 0; i < 3; i++) gem(next.g[i], sx + sw / 2 - 19, BY + 30 + i * 38, now);
  frameBox(sx, BY + 172, sw, 64);
  label('SCORE', sx + sw / 2, BY + 188);
  label(String(score || 0), sx + sw / 2, BY + 216, '#ffe99a', score >= 100000 ? 16 : 20);
  frameBox(sx, BY + 258, sw, 64);
  label('LEVEL', sx + sw / 2, BY + 274);
  label(String(level || 1), sx + sw / 2, BY + 302, '#ffffff', 22);
  frameBox(sx, BY + 344, sw, 64);
  label('GEMS', sx + sw / 2, BY + 360);
  label(String(gems || 0), sx + sw / 2, BY + 388, '#a8ffb0', 20);

  // 터진 점수 · 연쇄
  for (const p of popups) {
    const k = (now - p.t) / 1100;
    ctx.globalAlpha = 1 - k;
    ctx.font = `bold ${p.big ? 22 : 16}px ${FONT}`; ctx.lineJoin = 'round';
    ctx.strokeStyle = INK; ctx.lineWidth = 5; ctx.strokeText(p.text, p.x, p.y - k * 40);
    ctx.fillStyle = p.big ? '#ffe99a' : '#ffffff'; ctx.fillText(p.text, p.x, p.y - k * 40);
  }
  ctx.globalAlpha = 1;

  if (state === 'over') {
    ctx.fillStyle = 'rgba(11,10,30,.55)'; ctx.fillRect(BX, BY, bw, bh);
    ctx.font = `bold 30px ${FONT}`; ctx.lineJoin = 'round';
    ctx.strokeStyle = INK; ctx.lineWidth = 8; ctx.strokeText('GAME OVER', BX + bw / 2, BY + bh / 2);
    ctx.fillStyle = '#ff3b5c'; ctx.fillText('GAME OVER', BX + bw / 2, BY + bh / 2);
  }
}

function frame(now) { update(now); draw(now); requestAnimationFrame(frame); }
requestAnimationFrame(frame);

/* ---------- 조작 ---------- */
document.addEventListener('keydown', e => {
  if (document.querySelector('.overlay')) return;
  const k = e.code;
  const keys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space', 'KeyA', 'KeyD', 'KeyW', 'KeyS', 'KeyX', 'KeyZ'];
  if (!keys.includes(k)) return;
  e.preventDefault();
  if (state === 'ready') { if (k === 'Space' && !e.repeat) start(); return; }
  if (k === 'ArrowLeft' || k === 'KeyA') move(-1);
  else if (k === 'ArrowRight' || k === 'KeyD') move(1);
  else if (k === 'ArrowUp' || k === 'KeyW' || k === 'KeyX' || k === 'KeyZ') { if (!e.repeat) cycle(); }
  else if (k === 'ArrowDown' || k === 'KeyS') softDrop();
  else if (k === 'Space') { if (!e.repeat) hardDrop(); }
});
// 손가락: 좌우로 밀면 한 칸씩 이동, 탭하면 순서 바꾸기, 아래로 휙 밀면 바로 떨어뜨리기
let touch = null;
cv.addEventListener('pointerdown', e => {
  if (state !== 'play' && state !== 'clear') return;
  e.preventDefault();
  const p = canvasPoint(cv, W, e);
  touch = { x0: p.x, y0: p.y, lastX: p.x, t: performance.now(), moved: false, dropped: false };
});
cv.addEventListener('pointermove', e => {
  if (!touch) return;
  const p = canvasPoint(cv, W, e);
  while (p.x - touch.lastX > C * .8) { move(1); touch.lastX += C * .8; touch.moved = true; }
  while (touch.lastX - p.x > C * .8) { move(-1); touch.lastX -= C * .8; touch.moved = true; }
  if (!touch.dropped && p.y - touch.y0 > 70 && Math.abs(p.x - touch.x0) < 50) { touch.dropped = true; hardDrop(); }
});
cv.addEventListener('pointerup', e => {
  if (!touch) return;
  const p = canvasPoint(cv, W, e);
  if (!touch.moved && !touch.dropped && Math.hypot(p.x - touch.x0, p.y - touch.y0) < 14 && performance.now() - touch.t < 400) cycle();
  touch = null;
});
cv.addEventListener('pointercancel', () => { touch = null; });
veil.addEventListener('click', start);
