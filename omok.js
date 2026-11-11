import { initGamePage, showResult, setupCanvas, canvasPoint } from './common.js?v=31';

initGamePage('omok');

const N = 15, W = 600, H = 640, M = 40, TOP = 40;
const GAP = (W - M * 2) / (N - 1);
const cv = document.getElementById('cv');
const ctx = setupCanvas(cv, W, H);
const veil = document.getElementById('veil');
const INK = '#5b4466';
const ME = 1, AI = 2;
const DIRS = [[1, 0], [0, 1], [1, 1], [1, -1]];
// 5칸 창 하나에 같은 색 돌이 n개(상대 돌 없음)일 때의 값
const WIN_VAL = [0, 2, 24, 260, 4000, 1e7];
const CARELESS = 0.65;   // 컴퓨터가 방심해 3을 놓치는 수의 비율
const BLIND = 0.1;       // 5목 직전(4)마저 못 보는 비율

let state = 'ready';   // ready → me → ai → won/lost → done
let board, moves, lastMove, hover = null, winLine = null, myCount = 0;

const inside = (x, y) => x >= 0 && y >= 0 && x < N && y < N;
const px = i => M + i * GAP, py = j => TOP + M + j * GAP;

function start() {
  board = Array.from({ length: N }, () => Array(N).fill(0));
  moves = 0; lastMove = null; winLine = null; myCount = 0;
  state = 'me'; veil.hidden = true;
}
function fiveFrom(x, y, c) {
  for (const [dx, dy] of DIRS) {
    const line = [[x, y]];
    for (const s of [1, -1]) {
      let i = x + dx * s, j = y + dy * s;
      while (inside(i, j) && board[j][i] === c) { line.push([i, j]); i += dx * s; j += dy * s; }
    }
    if (line.length >= 5) return line;
  }
  return null;
}
/* ---------- 쌍삼(3·3) 금지 ---------- */
// (x,y)를 지나는 dx,dy 방향에 '열린 3'이 생기는지: 빈칸 하나를 더 채우면 양쪽이 빈 4가 되는가
function openThreeDir(x, y, dx, dy, c) {
  for (let k = -4; k <= 4; k++) {
    if (!k) continue;
    const ex = x + dx * k, ey = y + dy * k;
    if (!inside(ex, ey) || board[ey][ex]) continue;
    board[ey][ex] = c;
    let a = 0, b = 0;
    while (inside(ex - dx * (a + 1), ey - dy * (a + 1)) && board[ey - dy * (a + 1)][ex - dx * (a + 1)] === c) a++;
    while (inside(ex + dx * (b + 1), ey + dy * (b + 1)) && board[ey + dy * (b + 1)][ex + dx * (b + 1)] === c) b++;
    board[ey][ex] = 0;
    // 정확히 4개가 이어지고, 그 4개 안에 (x,y)가 있고, 양 끝이 비어 있어야 한다
    if (a + b + 1 !== 4 || -k < -a || -k > b) continue;
    const s1x = ex - dx * (a + 1), s1y = ey - dy * (a + 1), s2x = ex + dx * (b + 1), s2y = ey + dy * (b + 1);
    if (inside(s1x, s1y) && !board[s1y][s1x] && inside(s2x, s2y) && !board[s2y][s2x]) return true;
  }
  return false;
}
function isDoubleThree(x, y, c) {
  if (board[y][x]) return false;
  board[y][x] = c;
  let n = 0;
  if (!fiveFrom(x, y, c)) for (const [dx, dy] of DIRS) if (openThreeDir(x, y, dx, dy, c)) n++;
  board[y][x] = 0;
  return n >= 2;
}
/* ---------- 4·3 금지(컴퓨터만) ---------- */
// (x,y)를 지나는 방향에 '4'가 있는지: 빈칸 하나만 더 채우면 (x,y)를 포함해 5개 이상이 되는가
function fourDir(x, y, dx, dy, c) {
  for (let k = -4; k <= 4; k++) {
    if (!k) continue;
    const ex = x + dx * k, ey = y + dy * k;
    if (!inside(ex, ey) || board[ey][ex]) continue;
    board[ey][ex] = c;
    let a = 0, b = 0;
    while (inside(ex - dx * (a + 1), ey - dy * (a + 1)) && board[ey - dy * (a + 1)][ex - dx * (a + 1)] === c) a++;
    while (inside(ex + dx * (b + 1), ey + dy * (b + 1)) && board[ey + dy * (b + 1)][ex + dx * (b + 1)] === c) b++;
    board[ey][ex] = 0;
    if (a + b + 1 >= 5 && -k >= -a && -k <= b) return true;
  }
  return false;
}
// 한 수로 4와 열린 3을 서로 다른 방향에 동시에 만드는가(바로 5가 되는 수는 제외)
function isFourThree(x, y, c) {
  if (board[y][x]) return false;
  board[y][x] = c;
  let fours = 0, threes = 0;
  if (!fiveFrom(x, y, c)) for (const [dx, dy] of DIRS) {
    if (fourDir(x, y, dx, dy, c)) fours++;
    else if (openThreeDir(x, y, dx, dy, c)) threes++;
  }
  board[y][x] = 0;
  return fours >= 1 && threes >= 1;
}

function put(x, y, c, now) {
  board[y][x] = c; moves++; lastMove = { x, y, t: now };
  if (c === ME) myCount++;
  const line = fiveFrom(x, y, c);
  if (line) { winLine = line; return end(c === ME ? 'won' : 'lost'); }
  if (moves >= N * N) return end('draw');
  state = c === ME ? 'ai' : 'me';
  if (state === 'ai') setTimeout(aiMove, 380 + Math.random() * 300);
}
function end(kind) {
  state = kind;
  setTimeout(() => {
    state = 'done';
    if (kind === 'won') showResult('omok', myCount, { detail: `흑돌 ${myCount}개로 승리 🎉`, onRetry: start });
    else showResult('omok', 0, { fail: true, detail: kind === 'lost' ? '컴퓨터가 먼저 5개를 이었어요 ⚪' : '판이 가득 차 비겼어요', onRetry: start });
  }, 1200);
}

/* ---------- 컴퓨터 ---------- */
// 그 칸에 c 돌을 놓았을 때 그 칸을 지나는 5칸 창들의 값
function evalCell(x, y, c) {
  let v = 0;
  for (const [dx, dy] of DIRS) {
    for (let k = -4; k <= 0; k++) {
      let cnt = 0, blocked = false;
      for (let s = 0; s < 5; s++) {
        const i = x + dx * (k + s), j = y + dy * (k + s);
        if (!inside(i, j)) { blocked = true; break; }
        const b = (i === x && j === y) ? c : board[j][i];
        if (b === c) cnt++; else if (b !== 0) { blocked = true; break; }
      }
      if (!blocked) v += WIN_VAL[cnt];
    }
  }
  return v;
}
function aiMove() {
  if (state !== 'ai') return;
  let best = null, bestV = -1;
  // 방심한 수: 3 이하 수비는 거의 보지 않는다. 가끔은 5목 직전(4)도 못 본다
  const careless = Math.random() < CARELESS;
  const blind = Math.random() < BLIND;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    if (board[y][x]) continue;
    let near = false;
    for (let j = -2; j <= 2 && !near; j++) for (let i = -2; i <= 2; i++)
      if (inside(x + i, y + j) && board[y + j][x + i]) { near = true; break; }
    // 컴퓨터는 쌍삼(3·3)과 4·3을 둘 수 없다
    if (!near || isDoubleThree(x, y, AI) || isFourThree(x, y, AI)) continue;
    let atk = evalCell(x, y, AI);
    if (atk < WIN_VAL[5]) atk *= .55;   // 공격도 덜 적극적으로(5목 완성은 그대로)
    let def = evalCell(x, y, ME);
    if (def < WIN_VAL[5]) def *= careless ? .12 : .5;
    else if (blind) def = WIN_VAL[3];
    const v = atk + def + Math.random() * 160;
    if (v > bestV) { bestV = v; best = [x, y]; }
  }
  // 둘 곳이 모두 금지된 드문 경우: 아무 빈칸이나
  if (!best) for (let y = 0; y < N && !best; y++) for (let x = 0; x < N; x++) if (!board[y][x]) { best = [x, y]; break; }
  if (!best) return end('draw');
  put(best[0], best[1], AI, performance.now());
}

/* ---------- 입력 ---------- */
function cellAt(p) {
  const i = Math.round((p.x - M) / GAP), j = Math.round((p.y - TOP - M) / GAP);
  if (!inside(i, j)) return null;
  if (Math.hypot(p.x - px(i), p.y - py(j)) > GAP * .48) return null;
  return { x: i, y: j };
}
// 손가락: 대면 가장 가까운 칸을 미리 보여 주고(끌어서 옮길 수 있음), 떼면 놓는다
let touching = false;
function nearestCell(p) {
  const i = Math.round((p.x - M) / GAP), j = Math.round((p.y - TOP - M) / GAP);
  return inside(i, j) ? { x: i, y: j } : null;
}
cv.addEventListener('pointermove', e => {
  const p = canvasPoint(cv, W, e);
  hover = e.pointerType === 'touch' ? nearestCell(p) : cellAt(p);
});
cv.addEventListener('pointerleave', e => { if (e.pointerType !== 'touch') hover = null; });
cv.addEventListener('pointerdown', e => {
  if (state !== 'me') return;
  if (e.pointerType === 'touch') { touching = true; hover = nearestCell(canvasPoint(cv, W, e)); e.preventDefault(); return; }
  if (e.button !== 0) return;
  const c = cellAt(canvasPoint(cv, W, e));
  if (!c || board[c.y][c.x]) return;
  put(c.x, c.y, ME, performance.now());
});
cv.addEventListener('pointerup', e => {
  if (!touching) return;
  touching = false;
  const c = hover; hover = null;
  if (state !== 'me' || !c || board[c.y][c.x]) return;
  put(c.x, c.y, ME, performance.now());
});
cv.addEventListener('pointercancel', () => { touching = false; hover = null; });

/* ---------- 그리기 ---------- */
function rr(x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
function stone(x, y, c, alpha = 1, scale = 1) {
  const r = GAP * .44 * scale;
  ctx.globalAlpha = alpha;
  ctx.fillStyle = 'rgba(91,68,102,.25)'; ctx.beginPath(); ctx.arc(x + 1.5, y + 2.5, r, 0, Math.PI * 2); ctx.fill();
  const g = ctx.createRadialGradient(x - r * .35, y - r * .4, r * .1, x, y, r);
  if (c === ME) { g.addColorStop(0, '#7a6a86'); g.addColorStop(1, '#2d2333'); }
  else { g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#e6dcea'); }
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 1;
}
function draw(now) {
  ctx.fillStyle = '#fde3ef'; ctx.fillRect(0, 0, W, H);
  // 상태 띠
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = '800 17px Pretendard, sans-serif'; ctx.fillStyle = INK;
  const msg = { ready: '흑돌(나)부터 시작해요', me: `내 차례 · 흑돌 ${myCount}개`, ai: '컴퓨터가 생각 중…', won: '내가 이겼어요! 🎉', lost: '컴퓨터가 이겼어요', draw: '비겼어요', done: '' }[state];
  ctx.fillText(msg, W / 2, TOP / 2 + 2);

  // 판
  ctx.fillStyle = '#f2cf96'; rr(M - GAP * .7, TOP + M - GAP * .7, GAP * (N - 1) + GAP * 1.4, GAP * (N - 1) + GAP * 1.4, 14); ctx.fill();
  ctx.strokeStyle = 'rgba(120,80,40,.55)'; ctx.lineWidth = 1.2;
  for (let i = 0; i < N; i++) {
    ctx.beginPath(); ctx.moveTo(px(i), py(0)); ctx.lineTo(px(i), py(N - 1)); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(px(0), py(i)); ctx.lineTo(px(N - 1), py(i)); ctx.stroke();
  }
  ctx.fillStyle = 'rgba(120,80,40,.7)';
  for (const [i, j] of [[3, 3], [11, 3], [7, 7], [3, 11], [11, 11]]) { ctx.beginPath(); ctx.arc(px(i), py(j), 3.5, 0, Math.PI * 2); ctx.fill(); }

  if (!board) return;
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    if (!board[j][i]) continue;
    const isLast = lastMove && lastMove.x === i && lastMove.y === j;
    const k = isLast ? Math.min(1, (now - lastMove.t) / 140) : 1;
    stone(px(i), py(j), board[j][i], 1, .7 + .3 * k);
  }
  if (lastMove) {
    ctx.fillStyle = '#ff5c7a';
    ctx.beginPath(); ctx.arc(px(lastMove.x), py(lastMove.y), 4, 0, Math.PI * 2); ctx.fill();
  }
  if (state === 'me' && hover && !board[hover.y][hover.x]) {
    // 손가락으로 가려지지 않게, 대고 있는 동안은 그 줄 · 칸에 길게 표시
    if (touching) {
      ctx.strokeStyle = 'rgba(255,92,122,.55)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(px(0), py(hover.y)); ctx.lineTo(px(N - 1), py(hover.y)); ctx.moveTo(px(hover.x), py(0)); ctx.lineTo(px(hover.x), py(N - 1)); ctx.stroke();
      ctx.beginPath(); ctx.arc(px(hover.x), py(hover.y), GAP * .62, 0, Math.PI * 2); ctx.stroke();
    }
    stone(px(hover.x), py(hover.y), ME, touching ? .7 : .4);
  }
  if (winLine) {
    const pulse = .6 + .4 * Math.sin(now / 120);
    ctx.strokeStyle = `rgba(255,92,122,${pulse})`; ctx.lineWidth = 4;
    for (const [i, j] of winLine) { ctx.beginPath(); ctx.arc(px(i), py(j), GAP * .48, 0, Math.PI * 2); ctx.stroke(); }
  }
}

function frame(now) { draw(now); requestAnimationFrame(frame); }
requestAnimationFrame(frame);

document.addEventListener('keydown', e => {
  if (document.querySelector('.overlay')) return;
  if (e.code === 'Space' && state === 'ready') { e.preventDefault(); start(); }
});
veil.addEventListener('click', start);
