import { initGamePage, showResult, setupCanvas } from './common.js?v=11';

initGamePage('drop');

const COLS = 10, ROWS = 20, C = 28, BX = 20, BY = 20;
const W = 440, H = 600;
const cv = document.getElementById('cv');
const ctx = setupCanvas(cv, W, H);
const veil = document.getElementById('veil');
const INK = '#5b4466';

// 블록 모양: n×n 상자 안의 칸 좌표
const SHAPES = {
  I: { n: 4, c: [[0, 1], [1, 1], [2, 1], [3, 1]], col: '#8fd8ff' },
  O: { n: 4, c: [[1, 0], [2, 0], [1, 1], [2, 1]], col: '#ffe27a' },
  T: { n: 3, c: [[1, 0], [0, 1], [1, 1], [2, 1]], col: '#d4a6ff' },
  S: { n: 3, c: [[1, 0], [2, 0], [0, 1], [1, 1]], col: '#9be8a8' },
  Z: { n: 3, c: [[0, 0], [1, 0], [1, 1], [2, 1]], col: '#ff9fb5' },
  J: { n: 3, c: [[0, 0], [0, 1], [1, 1], [2, 1]], col: '#a0b4ff' },
  L: { n: 3, c: [[2, 0], [0, 1], [1, 1], [2, 1]], col: '#ffc58f' },
};
const KINDS = Object.keys(SHAPES);

let state = 'ready';   // ready → play → over → done
let board, piece, bag = [], nextK, lines = 0, level = 1, acc = 0, lockT = 0, resets = 0, last = 0, flashes = [], overAt = 0;

function emptyBoard() { return Array.from({ length: ROWS }, () => Array(COLS).fill(null)); }
function draw7() {
  if (!bag.length) bag = KINDS.slice().sort(() => Math.random() - .5);
  return bag.pop();
}
function makePiece(k) {
  const s = SHAPES[k];
  return { k, n: s.n, cells: s.c.map(c => c.slice()), x: k === 'O' ? 3 : 3, y: k === 'I' ? -1 : 0 };
}
function fits(cells, x, y) {
  return cells.every(([cx, cy]) => {
    const gx = x + cx, gy = y + cy;
    if (gx < 0 || gx >= COLS || gy >= ROWS) return false;
    return gy < 0 || !board[gy][gx];
  });
}
function start() {
  board = emptyBoard(); bag = []; lines = 0; level = 1; acc = 0; lockT = 0; resets = 0; flashes = [];
  nextK = draw7(); spawn();
  last = performance.now();
  state = 'play'; veil.hidden = true;
}
function spawn() {
  piece = makePiece(nextK); nextK = draw7(); lockT = 0; resets = 0; acc = 0;
  if (!fits(piece.cells, piece.x, piece.y)) gameOver();
}
const grounded = () => !fits(piece.cells, piece.x, piece.y + 1);
function afterMove() { if (grounded() && resets < 15) { lockT = 0; resets++; } }
function move(dx) {
  if (state !== 'play') return;
  if (fits(piece.cells, piece.x + dx, piece.y)) { piece.x += dx; afterMove(); }
}
function rotate(dirn) {
  if (state !== 'play' || piece.k === 'O') return;
  const n = piece.n;
  const rot = piece.cells.map(([x, y]) => dirn > 0 ? [n - 1 - y, x] : [y, n - 1 - x]);
  for (const [kx, ky] of [[0, 0], [-1, 0], [1, 0], [-2, 0], [2, 0], [0, -1]]) {
    if (fits(rot, piece.x + kx, piece.y + ky)) { piece.cells = rot; piece.x += kx; piece.y += ky; afterMove(); return; }
  }
}
function softDrop() {
  if (state !== 'play') return;
  if (!grounded()) { piece.y++; acc = 0; }
}
function hardDrop() {
  if (state !== 'play') return;
  while (!grounded()) piece.y++;
  lock();
}
function lock() {
  let above = false;
  for (const [cx, cy] of piece.cells) {
    const gy = piece.y + cy;
    if (gy < 0) above = true; else board[gy][piece.x + cx] = SHAPES[piece.k].col;
  }
  if (above) return gameOver();
  const full = [];
  for (let y = 0; y < ROWS; y++) if (board[y].every(Boolean)) full.push(y);
  if (full.length) {
    const now = performance.now();
    full.forEach(y => flashes.push({ y, t: now }));
    board = board.filter((_, y) => !full.includes(y));
    while (board.length < ROWS) board.unshift(Array(COLS).fill(null));
    lines += full.length;
    level = 1 + Math.floor(lines / 10);
  }
  spawn();
}
function gameOver() {
  state = 'over'; overAt = performance.now();
  setTimeout(() => {
    state = 'done';
    showResult('drop', lines, { detail: `레벨 ${level}`, extra: { level }, onRetry: start });
  }, 900);
}

function update(now) {
  const dt = Math.min(100, now - last); last = now;
  flashes = flashes.filter(f => now - f.t < 350);
  if (state !== 'play') return;
  const interval = Math.max(90, 800 - (level - 1) * 75);
  if (grounded()) {
    lockT += dt;
    if (lockT >= 450) lock();
  } else {
    acc += dt;
    while (acc >= interval && !grounded()) { acc -= interval; piece.y++; }
  }
}

/* ---------- 그리기 ---------- */
function rr(x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
function block(x, y, col, size = C, ghost = false) {
  const p = 1.5, s = size - p * 2;
  if (ghost) {
    ctx.strokeStyle = col; ctx.lineWidth = 2; rr(x + p + 1, y + p + 1, s - 2, s - 2, 6); ctx.stroke();
    return;
  }
  const r = s * .26;
  ctx.fillStyle = col; rr(x + p, y + p, s, s, r); ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,.08)'; rr(x + p, y + p + s * .62, s, s * .38, r); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.65)'; rr(x + p + s * .18, y + p + s * .14, s * .34, s * .16, 3); ctx.fill();
}
function draw(now) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#f6e9ff'); g.addColorStop(1, '#ffe9f2');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

  // 판
  ctx.fillStyle = '#fffafc'; rr(BX - 6, BY - 6, COLS * C + 12, ROWS * C + 12, 14); ctx.fill();
  ctx.strokeStyle = '#ead6ee'; ctx.lineWidth = 1;
  for (let x = 1; x < COLS; x++) { ctx.beginPath(); ctx.moveTo(BX + x * C, BY); ctx.lineTo(BX + x * C, BY + ROWS * C); ctx.stroke(); }
  for (let y = 1; y < ROWS; y++) { ctx.beginPath(); ctx.moveTo(BX, BY + y * C); ctx.lineTo(BX + COLS * C, BY + y * C); ctx.stroke(); }

  if (board) {
    const grey = state === 'over' || state === 'done';
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++)
      if (board[y][x]) block(BX + x * C, BY + y * C, grey ? '#cbbfd1' : board[y][x]);
    for (const f of flashes) {
      const k = (now - f.t) / 350;
      ctx.fillStyle = `rgba(255,255,255,${.9 * (1 - k)})`;
      ctx.fillRect(BX, BY + f.y * C, COLS * C, C);
    }
    if (state === 'play') {
      let gy = piece.y; while (fits(piece.cells, piece.x, gy + 1)) gy++;
      for (const [cx, cy] of piece.cells) if (gy + cy >= 0) block(BX + (piece.x + cx) * C, BY + (gy + cy) * C, SHAPES[piece.k].col, C, true);
      for (const [cx, cy] of piece.cells) if (piece.y + cy >= 0) block(BX + (piece.x + cx) * C, BY + (piece.y + cy) * C, SHAPES[piece.k].col);
    }
  }

  // 옆 정보
  const sx = BX + COLS * C + 22, sw = W - sx - 14;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = '#fffafc'; rr(sx, BY - 6, sw, 110, 12); ctx.fill();
  ctx.fillStyle = '#a07fae'; ctx.font = '800 13px Pretendard, sans-serif'; ctx.fillText('다음', sx + sw / 2, BY + 12);
  if (nextK && board) {
    const s = SHAPES[nextK], bs = 18;
    const xs = s.c.map(c => c[0]), ys = s.c.map(c => c[1]);
    const w = (Math.max(...xs) - Math.min(...xs) + 1) * bs, h = (Math.max(...ys) - Math.min(...ys) + 1) * bs;
    const ox = sx + (sw - w) / 2 - Math.min(...xs) * bs, oy = BY + 58 - h / 2 - Math.min(...ys) * bs;
    for (const [x, y] of s.c) block(ox + x * bs, oy + y * bs, s.col, bs);
  }
  ctx.fillStyle = '#fffafc'; rr(sx, BY + 118, sw, 96, 12); ctx.fill();
  ctx.fillStyle = '#a07fae'; ctx.font = '800 13px Pretendard, sans-serif'; ctx.fillText('지운 줄', sx + sw / 2, BY + 138);
  ctx.fillStyle = '#ff7fa0'; ctx.font = '900 38px Pretendard, sans-serif'; ctx.fillText(lines || 0, sx + sw / 2, BY + 180);
  ctx.fillStyle = '#fffafc'; rr(sx, BY + 226, sw, 80, 12); ctx.fill();
  ctx.fillStyle = '#a07fae'; ctx.font = '800 13px Pretendard, sans-serif'; ctx.fillText('레벨', sx + sw / 2, BY + 246);
  ctx.fillStyle = INK; ctx.font = '900 28px Pretendard, sans-serif'; ctx.fillText(level || 1, sx + sw / 2, BY + 280);

  if (state === 'over') {
    ctx.fillStyle = 'rgba(120,80,130,.35)'; ctx.fillRect(BX, BY, COLS * C, ROWS * C);
    ctx.font = '900 34px Pretendard, sans-serif';
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 8; ctx.strokeText('꽉 찼어요!', BX + COLS * C / 2, BY + ROWS * C / 2);
    ctx.fillStyle = '#ff7fa0'; ctx.fillText('꽉 찼어요!', BX + COLS * C / 2, BY + ROWS * C / 2);
  }
}

function frame(now) { update(now); draw(now); requestAnimationFrame(frame); }
requestAnimationFrame(frame);

document.addEventListener('keydown', e => {
  if (document.querySelector('.overlay')) return;
  const k = e.code;
  const game = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space', 'KeyA', 'KeyD', 'KeyW', 'KeyS', 'KeyX', 'KeyZ'];
  if (!game.includes(k)) return;
  e.preventDefault();
  if (state === 'ready') { if (k === 'Space' && !e.repeat) start(); return; }
  if (k === 'ArrowLeft' || k === 'KeyA') move(-1);
  else if (k === 'ArrowRight' || k === 'KeyD') move(1);
  else if (k === 'ArrowUp' || k === 'KeyW' || k === 'KeyX') { if (!e.repeat) rotate(1); }
  else if (k === 'KeyZ') { if (!e.repeat) rotate(-1); }
  else if (k === 'ArrowDown' || k === 'KeyS') softDrop();
  else if (k === 'Space') { if (!e.repeat) hardDrop(); }
});
veil.addEventListener('click', start);