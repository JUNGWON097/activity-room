import { initGamePage, showResult, setupCanvas, canvasPoint } from './common.js?v=33';

initGamePage('blast');

const N = 8, C = 52, W = 480, H = 700;
const GX = (W - N * C) / 2, GY = 92;
const TRAY_Y = 612, SLOT_X = [88, 240, 392], TC = 24, LIFT = 84;
const cv = document.getElementById('cv');
const ctx = setupCanvas(cv, W, H);
const veil = document.getElementById('veil');
const INK = '#5b4466';
const COLORS = ['#ff8fab', '#ffb86b', '#ffd84d', '#7fdca0', '#6cc4ff', '#b49cff', '#ff9de2'];

const SHAPES = [
  [[0, 0]],
  [[0, 0], [1, 0]], [[0, 0], [0, 1]],
  [[0, 0], [1, 0], [2, 0]], [[0, 0], [0, 1], [0, 2]],
  [[0, 0], [1, 0], [2, 0], [3, 0]], [[0, 0], [0, 1], [0, 2], [0, 3]],
  [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0]], [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4]],
  [[0, 0], [1, 0], [0, 1], [1, 1]],
  [[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1], [0, 2], [1, 2], [2, 2]],
  [[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1]], [[0, 0], [1, 0], [0, 1], [1, 1], [0, 2], [1, 2]],
  [[0, 0], [0, 1], [1, 1]], [[1, 0], [0, 1], [1, 1]], [[0, 0], [1, 0], [0, 1]], [[0, 0], [1, 0], [1, 1]],
  [[0, 0], [0, 1], [0, 2], [1, 2], [2, 2]], [[2, 0], [2, 1], [0, 2], [1, 2], [2, 2]],
  [[0, 0], [1, 0], [2, 0], [0, 1], [0, 2]], [[0, 0], [1, 0], [2, 0], [2, 1], [2, 2]],
  [[0, 0], [1, 0], [2, 0], [1, 1]], [[1, 0], [0, 1], [1, 1], [2, 1]],
  [[0, 1], [1, 0], [1, 1], [1, 2]], [[0, 0], [0, 1], [1, 1], [0, 2]],
  [[1, 0], [2, 0], [0, 1], [1, 1]], [[0, 0], [1, 0], [1, 1], [2, 1]],
  [[0, 0], [0, 1], [0, 2], [1, 2]], [[0, 0], [1, 0], [2, 0], [0, 1]], [[1, 0], [1, 1], [1, 2], [0, 2]], [[0, 0], [1, 0], [2, 0], [2, 1]],
];

let state = 'ready';   // ready → play → over → done
let grid, tray, score, streak, drag = null, bursts = [], texts = [], overAt = 0, shown = 0;

function makePiece() {
  const cells = SHAPES[Math.floor(Math.random() * SHAPES.length)];
  return {
    cells, used: false,
    w: Math.max(...cells.map(c => c[0])) + 1, h: Math.max(...cells.map(c => c[1])) + 1,
    col: COLORS[Math.floor(Math.random() * COLORS.length)],
  };
}
function fits(p, col, row) {
  return p.cells.every(([x, y]) => {
    const gx = col + x, gy = row + y;
    return gx >= 0 && gy >= 0 && gx < N && gy < N && !grid[gy][gx];
  });
}
function fitsAnywhere(p) {
  for (let r = 0; r <= N - p.h; r++) for (let c = 0; c <= N - p.w; c++) if (fits(p, c, r)) return true;
  return false;
}
/* ---------- 세 블록을 모두 놓을 수 있는지 ---------- */
// 판을 줄마다 8비트 숫자로 바꿔, 놓는 순서 · 자리를 모두 따져 본다(줄이 터지는 것까지)
const FULL = (1 << N) - 1;
const toRows = g => g.map(r => r.reduce((m, c, i) => (c ? m | (1 << i) : m), 0));
function pieceMask(p) { const rows = Array(p.h).fill(0); for (const [x, y] of p.cells) rows[y] |= 1 << x; return rows; }
function clearFull(b) {
  let colFull = FULL;
  for (const r of b) colFull &= r;
  return b.map(r => (r === FULL ? 0 : r & ~colFull));
}
function canPlaceAll(b, ps, budget) {
  if (!ps.length) return true;
  for (let i = 0; i < ps.length; i++) {
    const { rows, w, h } = ps[i], rest = ps.filter((_, j) => j !== i);
    for (let r = 0; r <= N - h; r++) for (let c = 0; c <= N - w; c++) {
      if (--budget.n < 0) return false;
      let ok = true;
      for (let k = 0; k < h; k++) if (b[r + k] & (rows[k] << c)) { ok = false; break; }
      if (!ok) continue;
      const nb = b.slice();
      for (let k = 0; k < h; k++) nb[r + k] |= rows[k] << c;
      if (canPlaceAll(clearFull(nb), rest, budget)) return true;
    }
  }
  return false;
}
function solvable(set) {
  const ps = set.map(p => ({ rows: pieceMask(p), w: p.w, h: p.h }));
  return canPlaceAll(toRows(grid), ps, { n: 60000 });
}
function newTray() {
  // 세 개 모두 놓을 수 있는 순서가 있는 세트만 준다
  for (let i = 0; i < 60; i++) {
    tray = [makePiece(), makePiece(), makePiece()];
    if (solvable(tray)) return;
  }
  // 판이 많이 찼으면: 지금 판에 들어가는 모양만 모아 무작위로 다시 찾고
  const fit = SHAPES.map(cells => shapeToPiece(cells)).filter(p => solvable([p]));
  const pick = () => shapeToPiece(fit[Math.floor(Math.random() * fit.length)].cells);
  if (fit.length) for (let i = 0; i < 80; i++) {
    tray = [pick(), pick(), pick()];
    if (solvable(tray)) return;
  }
  // 그래도 없으면 작은 블록부터 모든 조합을 차례로 따져 본다(빠뜨리는 경우 없음)
  const bySize = fit.slice().sort((a, b) => a.cells.length - b.cells.length);
  for (let a = 0; a < bySize.length; a++) for (let b = a; b < bySize.length; b++) for (let c = b; c < bySize.length; c++) {
    const set = [bySize[a], bySize[b], bySize[c]].map(p => shapeToPiece(p.cells));
    if (solvable(set)) { tray = set.sort(() => Math.random() - .5); return; }
  }
  // 어떤 세 개도 다 놓을 수 없는 판: 들어가는 블록이라도 주고, 다 쓰면 게임이 끝난다
  tray = [0, 1, 2].map(() => (fit.length ? pick() : makePiece()));
}
function shapeToPiece(cells) {
  return { ...makePiece(), cells, w: Math.max(...cells.map(c => c[0])) + 1, h: Math.max(...cells.map(c => c[1])) + 1 };
}
function start() {
  grid = Array.from({ length: N }, () => Array(N).fill(null));
  score = 0; shown = 0; streak = 0; bursts = []; texts = []; drag = null;
  newTray();
  state = 'play'; veil.hidden = true;
}
// 놓았다고 치고 꽉 차는 줄을 찾는다
function fullLines(g) {
  const rows = [], cols = [];
  for (let i = 0; i < N; i++) {
    if (g[i].every(Boolean)) rows.push(i);
    if (g.every(r => r[i])) cols.push(i);
  }
  return { rows, cols };
}
function place(p, col, row) {
  const now = performance.now();
  p.cells.forEach(([x, y]) => { grid[row + y][col + x] = p.col; });
  p.used = true;
  let gain = p.cells.length;
  const { rows, cols } = fullLines(grid);
  const k = rows.length + cols.length;
  if (k) {
    streak++;
    const bonus = k * k * 10 + (streak - 1) * 20;
    gain += bonus;
    const cleared = new Set();
    rows.forEach(r => { for (let c = 0; c < N; c++) cleared.add(r * N + c); });
    cols.forEach(c => { for (let r = 0; r < N; r++) cleared.add(r * N + c); });
    cleared.forEach(i => {
      const r = Math.floor(i / N), c = i % N;
      bursts.push({ x: GX + c * C, y: GY + r * C, col: grid[r][c], t: now, d: (Math.abs(r - row) + Math.abs(c - col)) * 18 });
      grid[r][c] = null;
    });
    const label = (k >= 2 ? `${k}줄 팡! ` : '팡! ') + `+${bonus}` + (streak > 1 ? ` · 콤보 ${streak}` : '');
    texts.push({ s: label, x: GX + (col + p.w / 2) * C, y: GY + (row + p.h / 2) * C, t: now });
  } else streak = 0;
  score += gain;
  if (tray.every(t => t.used)) newTray();
  if (!tray.some(t => !t.used && fitsAnywhere(t))) {
    state = 'over'; overAt = now;
    setTimeout(() => {
      state = 'done';
      showResult('blast', score, { detail: '더 놓을 곳이 없어요', onRetry: start });
    }, 1100);
  }
}

/* ---------- 끌기 ---------- */
function slotAt(p) {
  if (p.y < TRAY_Y - 80 || p.y > H) return -1;
  return SLOT_X.findIndex(x => Math.abs(p.x - x) < 76);
}
function dragTarget(p) {
  const pc = tray[drag.i];
  const ox = p.x - pc.w * C / 2, oy = p.y - LIFT - pc.h * C / 2;
  const col = Math.round((ox - GX) / C), row = Math.round((oy - GY) / C);
  return { col, row, ok: fits(pc, col, row) };
}
cv.addEventListener('pointerdown', e => {
  if (state !== 'play') return;
  const p = canvasPoint(cv, W, e), i = slotAt(p);
  if (i < 0 || tray[i].used) return;
  drag = { i, p };
  try { cv.setPointerCapture(e.pointerId); } catch { }
});
cv.addEventListener('pointermove', e => { if (drag) drag.p = canvasPoint(cv, W, e); });
cv.addEventListener('pointerup', e => {
  if (!drag) return;
  drag.p = canvasPoint(cv, W, e);
  const t = dragTarget(drag.p), pc = tray[drag.i];
  drag = null;
  if (t.ok && state === 'play') place(pc, t.col, t.row);
});
cv.addEventListener('pointercancel', () => { drag = null; });

/* ---------- 그리기 ---------- */
function rr(x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
function cell(x, y, col, s, alpha = 1) {
  const p = s * .05, w = s - p * 2, r = s * .2;
  ctx.globalAlpha = alpha;
  ctx.fillStyle = col; rr(x + p, y + p, w, w, r); ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,.1)'; rr(x + p, y + p + w * .66, w, w * .34, r); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.6)'; rr(x + p + w * .16, y + p + w * .12, w * .38, w * .16, w * .08); ctx.fill();
  ctx.globalAlpha = 1;
}
function draw(now) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#efe6ff'); g.addColorStop(1, '#ffe6f1');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

  // 점수(올라가는 숫자)
  if (shown < (score || 0)) shown = Math.min(score, shown + Math.max(1, Math.ceil((score - shown) / 8)));
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = '900 44px Pretendard, sans-serif';
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 8; ctx.strokeText(shown.toLocaleString(), W / 2, 48);
  ctx.fillStyle = '#ff7fa0'; ctx.fillText(shown.toLocaleString(), W / 2, 48);

  // 판
  ctx.fillStyle = '#5b4466'; rr(GX - 8, GY - 8, N * C + 16, N * C + 16, 16); ctx.fill();
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
    ctx.fillStyle = '#6d5578'; rr(GX + c * C + 2, GY + r * C + 2, C - 4, C - 4, 9); ctx.fill();
  }
  if (grid) {
    // 놓을 자리 · 터질 줄 미리 보기
    let preview = null;
    if (drag) {
      const t = dragTarget(drag.p);
      if (t.ok) {
        const pc = tray[drag.i];
        const g2 = grid.map(r => r.slice());
        pc.cells.forEach(([x, y]) => { g2[t.row + y][t.col + x] = pc.col; });
        preview = { t, pc, lines: fullLines(g2) };
      }
    }
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
      let col = grid[r][c];
      if (preview && col && (preview.lines.rows.includes(r) || preview.lines.cols.includes(c))) col = preview.pc.col;
      if (col) cell(GX + c * C, GY + r * C, state === 'over' ? '#a99bb0' : col, C);
    }
    if (preview) {
      const { t, pc, lines } = preview;
      pc.cells.forEach(([x, y]) => cell(GX + (t.col + x) * C, GY + (t.row + y) * C, pc.col, C, .45));
      const pulse = .25 + .2 * Math.sin(now / 90);
      ctx.fillStyle = `rgba(255,255,255,${pulse})`;
      lines.rows.forEach(r => { rr(GX, GY + r * C, N * C, C, 9); ctx.fill(); });
      lines.cols.forEach(c => { rr(GX + c * C, GY, C, N * C, 9); ctx.fill(); });
    }
  }

  // 팡 효과
  bursts = bursts.filter(b => now - b.t - b.d < 380);
  for (const b of bursts) {
    const k = Math.max(0, (now - b.t - b.d) / 380);
    if (now - b.t < b.d) { cell(b.x, b.y, b.col, C); continue; }
    const s = C * (1 + k * .5);
    ctx.globalAlpha = 1 - k;
    cell(b.x + (C - s) / 2, b.y + (C - s) / 2, '#fff', s, 1 - k);
    ctx.globalAlpha = 1;
  }

  // 받침대
  ctx.fillStyle = 'rgba(255,255,255,.7)'; rr(16, TRAY_Y - 70, W - 32, 140, 22); ctx.fill();
  if (tray) tray.forEach((p, i) => {
    if (p.used || (drag && drag.i === i)) return;
    const ok = state !== 'play' || fitsAnywhere(p);
    const ox = SLOT_X[i] - p.w * TC / 2, oy = TRAY_Y - p.h * TC / 2;
    p.cells.forEach(([x, y]) => cell(ox + x * TC, oy + y * TC, ok ? p.col : '#c9bccf', TC));
  });
  if (drag) {
    const pc = tray[drag.i];
    const ox = drag.p.x - pc.w * C / 2, oy = drag.p.y - LIFT - pc.h * C / 2;
    pc.cells.forEach(([x, y]) => cell(ox + x * C, oy + y * C, pc.col, C, .92));
  }

  // 글씨
  texts = texts.filter(t => now - t.t < 900);
  for (const t of texts) {
    const k = (now - t.t) / 900;
    ctx.globalAlpha = 1 - k * k;
    ctx.font = '900 26px Pretendard, sans-serif';
    ctx.strokeStyle = INK; ctx.lineWidth = 7; ctx.strokeText(t.s, t.x, t.y - k * 40);
    ctx.fillStyle = '#ffe066'; ctx.fillText(t.s, t.x, t.y - k * 40);
    ctx.globalAlpha = 1;
  }
  if (state === 'over') {
    ctx.font = '900 32px Pretendard, sans-serif';
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 8; ctx.strokeText('놓을 곳이 없어요!', W / 2, GY + N * C / 2);
    ctx.fillStyle = '#ff7fa0'; ctx.fillText('놓을 곳이 없어요!', W / 2, GY + N * C / 2);
  }
}

function frame(now) { draw(now); requestAnimationFrame(frame); }
requestAnimationFrame(frame);

document.addEventListener('keydown', e => {
  if (document.querySelector('.overlay')) return;
  if (e.code === 'Space' && state === 'ready') { e.preventDefault(); start(); }
});
veil.addEventListener('click', start);
