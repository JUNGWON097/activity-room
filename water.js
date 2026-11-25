import { initGamePage, showResult, setupCanvas, canvasPoint } from './common.js?v=66';

initGamePage('water');

const W = 420, H = 580;
const CAP = 4;                 // 병 하나에 물 4칸
// 단계마다 제한 시간이 있고, 시간 안에 못 풀면 끝난다(전체 시간 제한은 없다)
const limitFor = lv => 30 + colorsFor(lv) * 10;   // 3색 60초 … 9색 120초
const cv = document.getElementById('cv');
const ctx = setupCanvas(cv, W, H);
const veil = document.getElementById('veil');
const INK = '#4a3f66';
const COLORS = ['#ff5c7a', '#ffa23a', '#ffd93d', '#4fcf7a', '#3fc6e8', '#3f6fe8', '#9a5cf0', '#ff8fd0', '#8a5a3a'];

let state = 'ready';   // ready → play → over → done
let bottles = [], start0 = [], history = [], sel = -1, level = 0, endAt = 0, limit = 60, leftAtClear = 0, pours = [], clearAt = 0, shake = { i: -1, t: 0 }, solvedFx = {};
let pausedAt = 0;   // 0이 아니면 일시정지 중(멈춘 시각)

/* ---------- 문제 만들기 · 풀 수 있는지 확인 ---------- */
const colorsFor = lv => Math.min(COLORS.length, 3 + Math.ceil(lv / 2));
function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
const top = b => b[b.length - 1];
function canPour(a, b) { return a !== b && a.length && b.length < CAP && (!b.length || top(b) === top(a)); }
function pourCount(a, b) {
  let run = 1; while (run < a.length && a[a.length - 1 - run] === top(a)) run++;
  return Math.min(run, CAP - b.length);
}
const isDone = b => b.length === 0 || (b.length === CAP && b.every(c => c === b[0]));
const solved = bs => bs.every(isDone);
const key = bs => bs.map(b => b.join('')).sort().join('|');
// 깊이 우선 탐색으로 실제로 풀리는지 확인한다(풀리는 문제만 낸다)
function solvable(bs) {
  const seen = new Set(); let nodes = 0;
  const dfs = s => {
    if (solved(s)) return true;
    if (++nodes > 40000) return false;
    const k = key(s); if (seen.has(k)) return false; seen.add(k);
    for (let i = 0; i < s.length; i++) for (let j = 0; j < s.length; j++) {
      const a = s[i], b = s[j];
      if (!canPour(a, b)) continue;
      if (!b.length && a.every(c => c === a[0])) continue;   // 한 색뿐인 병을 빈 병으로 옮기는 건 의미 없음
      const n = pourCount(a, b), t = s.map(x => x.slice());
      for (let m = 0; m < n; m++) t[j].push(t[i].pop());
      if (dfs(t)) return true;
    }
    return false;
  };
  return dfs(bs.map(b => b.slice()));
}
function makeLevel(lv) {
  const n = colorsFor(lv);
  for (let tries = 0; tries < 200; tries++) {
    const pool = shuffle([].concat(...Array.from({ length: n }, (_, c) => Array(CAP).fill(c))));
    const bs = Array.from({ length: n }, (_, i) => pool.slice(i * CAP, i * CAP + CAP));
    bs.push([], []);
    if (bs.some(b => b.length && isDone(b))) continue;        // 처음부터 다 된 병이 있으면 다시
    if (solvable(bs)) return bs;
  }
  // (사실상 오지 않지만) 끝내 못 찾으면 쉬운 배치
  return [...Array.from({ length: n }, (_, c) => Array(CAP).fill(c)), [], []];
}

/* ---------- 진행 ---------- */
function loadLevel() {
  bottles = makeLevel(level); start0 = bottles.map(b => b.slice());
  history = []; sel = -1; pours = []; solvedFx = {};
  limit = limitFor(level); endAt = performance.now() + limit * 1000;
}
function start() {
  level = 0; clearAt = 0; pausedAt = 0;
  loadLevel();
  state = 'play'; veil.hidden = true;
}
function layout() {
  const n = bottles.length, rows = n > 7 ? 2 : 1, per = Math.ceil(n / rows);
  const bw = 40, bh = CAP * 30 + 18, gap = Math.min(22, (W - 40 - per * bw) / Math.max(1, per - 1));
  const rowH = bh + 42, top0 = rows === 1 ? 240 : 168;
  return bottles.map((_, i) => {
    const r = Math.floor(i / per), c = i % per, cnt = r === rows - 1 ? n - per * (rows - 1) : per;
    const total = cnt * bw + (cnt - 1) * gap;
    return { x: (W - total) / 2 + c * (bw + gap), y: top0 + r * rowH, w: bw, h: bh };
  });
}
function tapBottle(i, now) {
  if (state !== 'play' || clearAt) return;
  if (sel < 0) {
    if (bottles[i].length) sel = i;   // 빈 병은 집을 수 없다
    return;
  }
  if (sel === i) { sel = -1; return; }
  const a = bottles[sel], b = bottles[i];
  if (!canPour(a, b)) {
    // 다른 병을 고른 걸로 본다(물이 있을 때)
    if (b.length) { shake = { i: sel, t: now }; sel = i; } else { shake = { i: sel, t: now }; sel = -1; }
    return;
  }
  history.push(bottles.map(x => x.slice()));
  const n = pourCount(a, b), col = top(a);
  for (let m = 0; m < n; m++) b.push(a.pop());
  pours.push({ from: sel, to: i, col, t: now });
  if (isDone(b) && b.length) solvedFx[i] = now;
  sel = -1;
  if (solved(bottles)) { leftAtClear = Math.max(0, endAt - now) / 1000; clearAt = now; level++; setTimeout(() => { if (state === 'play') { clearAt = 0; loadLevel(); } }, 900); }
}
function undo() { if (state !== 'play' || clearAt || !history.length) return; bottles = history.pop(); sel = -1; }
function restart() { if (state !== 'play' || clearAt) return; history = []; bottles = start0.map(b => b.slice()); sel = -1; }
// 일시정지: 남은 시간을 멈추고 화면을 완전히 가린다
function pause() { if (state !== 'play' || clearAt || pausedAt) return; pausedAt = performance.now(); sel = -1; }
function resume() { if (!pausedAt) return; endAt += performance.now() - pausedAt; pausedAt = 0; }
const PAUSE = { x: W - 62, y: 22, w: 44, h: 44 };
const RESUME = { x: W / 2 - 90, y: H / 2 + 20, w: 180, h: 56 };
function finish() {
  state = 'over';
  setTimeout(() => {
    state = 'done';
    showResult('water', level, { detail: `마지막 단계는 ${colorsFor(level)}가지 색이었어요`, onRetry: start });
  }, 1300);
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
// 병 모양: 위가 열리고 아래가 둥근 시험관
function tube(x, y, w, h) {
  const r = w / 2;
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + h - r); ctx.arc(x + r, y + h - r, r, Math.PI, 0, true);
  ctx.lineTo(x + w, y); ctx.closePath();
}
const BTN = { undo: { x: 60, y: 520, w: 140, h: 44, label: '↶ 되돌리기' }, reset: { x: 220, y: 520, w: 140, h: 44, label: '⟲ 처음부터' } };
function draw(now) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#eaf4ff'); g.addColorStop(1, '#f6ecff');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

  const left = state === 'ready' ? limitFor(0) : state !== 'play' ? 0 : clearAt ? leftAtClear : Math.max(0, endAt - (pausedAt || now)) / 1000;
  if (state === 'play' && !clearAt && !pausedAt && left <= 0) finish();

  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  outlined(state === 'ready' ? '0' : String(level), W / 2, 46, '900 44px Pretendard, sans-serif', '#3f9be8');
  ctx.font = '800 13px Pretendard, sans-serif'; ctx.fillStyle = INK;
  ctx.fillText('깬 단계', W / 2, 80);
  // 남은 시간 막대
  ctx.fillStyle = 'rgba(74,63,102,.12)'; rr(20, 98, W - 40, 14, 7); ctx.fill();
  const k = left / (state === 'ready' ? limitFor(0) : limit);
  ctx.fillStyle = k < .15 ? (Math.floor(now / 200) % 2 ? '#ff5c7a' : '#ff9db0') : '#7fb8ff';
  if (k > 0) { rr(20, 98, Math.max(14, (W - 40) * k), 14, 7); ctx.fill(); }
  ctx.font = '800 13px Pretendard, sans-serif'; ctx.fillStyle = INK;
  const m = Math.floor(left / 60), s = Math.floor(left % 60);
  ctx.fillText(`이번 단계 남은 시간 ${m}:${String(s).padStart(2, '0')}`, W / 2, 128);

  if (state === 'ready') {
    // 미리보기 병
    const demo = [[0, 1, 0, 2], [2, 1, 2, 0], [1, 0, 1, 2], [], []];
    const prev = bottles; bottles = demo; const L = layout(); bottles = prev;
    L.forEach((r, i) => drawBottle(r, demo[i], false, now, -1));
    return;
  }

  const L = layout();
  L.forEach((r, i) => drawBottle(r, bottles[i], i === sel, now, i));

  // 붓는 물줄기
  for (const p of pours) {
    const t = (now - p.t) / 320; if (t > 1) continue;
    const a = L[p.from], b = L[p.to]; if (!a || !b) continue;
    ctx.globalAlpha = 1 - t; ctx.strokeStyle = COLORS[p.col]; ctx.lineWidth = 6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(a.x + a.w / 2, a.y - 24); ctx.quadraticCurveTo((a.x + b.x) / 2 + b.w / 2, Math.min(a.y, b.y) - 70, b.x + b.w / 2, b.y + 6); ctx.stroke();
    ctx.globalAlpha = 1;
  }
  pours = pours.filter(p => now - p.t < 320);

  // 버튼
  for (const b of Object.values(BTN)) {
    const off = (b === BTN.undo && !history.length) || clearAt;
    ctx.globalAlpha = off ? .45 : 1;
    ctx.fillStyle = 'rgba(74,63,102,.15)'; rr(b.x, b.y + 4, b.w, b.h, 14); ctx.fill();
    ctx.fillStyle = '#fff'; rr(b.x, b.y, b.w, b.h, 14); ctx.fill();
    ctx.font = '800 16px Pretendard, sans-serif'; ctx.fillStyle = INK; ctx.fillText(b.label, b.x + b.w / 2, b.y + b.h / 2 + 1);
    ctx.globalAlpha = 1;
  }

  if (clearAt) {
    const t = Math.min(1, (now - clearAt) / 250);
    ctx.globalAlpha = t; banner(); outlined('완성!', W / 2, 300, `900 ${30 + 10 * t}px Pretendard, sans-serif`, '#ff7fa0', 9); ctx.globalAlpha = 1;
  }
  if (state === 'over' || state === 'done') { banner(); outlined('시간 끝!', W / 2, 300, '900 38px Pretendard, sans-serif', '#ff7fa0', 9); }

  // 일시정지 버튼(오른쪽 위)
  if (state === 'play' && !pausedAt) {
    const b = PAUSE;
    ctx.globalAlpha = clearAt ? .45 : 1;
    ctx.fillStyle = 'rgba(74,63,102,.15)'; rr(b.x, b.y + 3, b.w, b.h, 14); ctx.fill();
    ctx.fillStyle = '#fff'; rr(b.x, b.y, b.w, b.h, 14); ctx.fill();
    ctx.fillStyle = INK; rr(b.x + 14, b.y + 12, 6, 20, 2); ctx.fill(); rr(b.x + 24, b.y + 12, 6, 20, 2); ctx.fill();
    ctx.globalAlpha = 1;
  }
  // 일시정지 중: 병이 전혀 안 보이게 판 전체를 가린다
  if (pausedAt) {
    ctx.fillStyle = '#2b2440'; ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff'; rr(W / 2 - 22, H / 2 - 120, 16, 52, 4); ctx.fill(); rr(W / 2 + 6, H / 2 - 120, 16, 52, 4); ctx.fill();
    ctx.font = '900 34px Pretendard, sans-serif'; ctx.fillText('일시정지', W / 2, H / 2 - 30);
    ctx.font = '700 14px Pretendard, sans-serif'; ctx.fillStyle = '#c9c0e0';
    const lt = Math.max(0, endAt - pausedAt) / 1000;
    ctx.fillText(`${level + 1}단계 · 남은 시간 ${Math.floor(lt / 60)}:${String(Math.floor(lt % 60)).padStart(2, '0')}`, W / 2, H / 2 - 2);
    const b = RESUME;
    ctx.fillStyle = '#d95f84'; rr(b.x, b.y + 5, b.w, b.h, 18); ctx.fill();
    ctx.fillStyle = '#ff7fa0'; rr(b.x, b.y, b.w, b.h, 18); ctx.fill();
    ctx.font = '900 19px Pretendard, sans-serif'; ctx.fillStyle = '#fff'; ctx.fillText('▶ 계속하기', W / 2, b.y + b.h / 2 + 1);
  }
}
// 가운데 알림 글자 뒤에 까는 반투명 판
function banner() { ctx.fillStyle = 'rgba(255,255,255,.82)'; rr(60, 262, W - 120, 76, 22); ctx.fill(); }
function drawBottle(r, b, lifted, now, i) {
  let x = r.x, y = r.y - (lifted ? 22 : 0);
  if (i === shake.i && now - shake.t < 300) x += Math.sin((now - shake.t) / 18) * 5 * (1 - (now - shake.t) / 300);
  // 물
  ctx.save(); tube(x, y, r.w, r.h); ctx.clip();
  ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fillRect(x, y, r.w, r.h);
  const cell = (r.h - 18) / CAP;
  b.forEach((c, k) => {
    const yy = y + r.h - (k + 1) * cell;
    ctx.fillStyle = COLORS[c]; ctx.fillRect(x, yy, r.w, cell + 1);
    if (k === b.length - 1) { ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(x, yy, r.w, 4); }
  });
  ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(x + 6, y + 8, 5, r.h - 30);
  ctx.restore();
  // 병 테두리
  tube(x, y, r.w, r.h);
  ctx.strokeStyle = lifted ? '#ff7fa0' : INK; ctx.lineWidth = lifted ? 4 : 3; ctx.stroke();
  ctx.fillStyle = lifted ? '#ff7fa0' : INK; rr(x - 5, y - 4, r.w + 10, 7, 3); ctx.fill();
  // 한 색으로 다 찬 병에는 반짝이
  if (b.length === CAP && b.every(c => c === b[0])) {
    const t = solvedFx[i] ? Math.min(1, (now - solvedFx[i]) / 400) : 1;
    ctx.font = `${16 + (1 - t) * 10}px sans-serif`; ctx.fillText('✨', x + r.w / 2, y - 22);
  }
}

function frame(now) { draw(now); requestAnimationFrame(frame); }
requestAnimationFrame(frame);

cv.addEventListener('pointerdown', e => {
  if (e.pointerType !== 'touch' && e.button !== 0) return;
  e.preventDefault();
  if (state !== 'play') return;
  const p = canvasPoint(cv, W, e), now = performance.now();
  const inBtn = b => p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h;
  if (pausedAt) { if (inBtn(RESUME)) resume(); return; }   // 멈춘 동안엔 계속하기만 된다
  if (inBtn({ x: PAUSE.x - 6, y: PAUSE.y - 6, w: PAUSE.w + 12, h: PAUSE.h + 12 })) return pause();
  if (inBtn(BTN.undo)) return undo();
  if (inBtn(BTN.reset)) return restart();
  // 병 주변을 넉넉하게 눌러도 잡히게
  const L = layout();
  for (let i = 0; i < L.length; i++) {
    const r = L[i];
    if (p.x > r.x - 10 && p.x < r.x + r.w + 10 && p.y > r.y - 40 && p.y < r.y + r.h + 14) return tapBottle(i, now);
  }
  sel = -1;
});
document.addEventListener('keydown', e => {
  if (document.querySelector('.overlay')) return;
  if (e.code === 'Space' && state === 'ready') { e.preventDefault(); start(); }
  if (e.code === 'Escape' || e.code === 'KeyP') { if (pausedAt) resume(); else pause(); return; }
  if (pausedAt) return;
  if ((e.ctrlKey || e.metaKey) && e.code === 'KeyZ') { e.preventDefault(); undo(); }
});
// 다른 탭으로 가면 저절로 멈춘다
document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
veil.addEventListener('click', start);
