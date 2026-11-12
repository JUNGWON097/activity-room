import { initGamePage, showResult, setupCanvas, canvasPoint } from './common.js?v=32';

initGamePage('horror');

const VW = 720, VH = 480, T = 40, COLS = 31, ROWS = 21;
const WW = COLS * T, WH = ROWS * T;
const cv = document.getElementById('cv');
const ctx = setupCanvas(cv, VW, VH);
const veil = document.getElementById('veil');
// 어둠은 따로 그려서 손전등 모양으로 지운 뒤 덮는다
const dpr = Math.min(window.devicePixelRatio || 1, 2);
const dark = document.createElement('canvas');
dark.width = VW * dpr; dark.height = VH * dpr;
const dctx = dark.getContext('2d');
dctx.setTransform(dpr, 0, 0, dpr, 0, 0);

const P_SPEED = 140, G_SPEED = 92, P_R = 10, BEAM_R = 310, BEAM_A = .55, AMB_R = 120;
let seen;   // 한 번 본 칸은 어둡게라도 계속 보인다

let state = 'ready';   // ready → play → caught → done
let map, player, ghosts, keysLeft, got, batteries, exit, battery, lightOn, t0, now0, last, aim, mouseAt, scareAt, pathT, distP, msg, msgAt, flick;
// 숨기: 사물함 안에서는 숨(breath)이 줄고, 다 떨어지면 저절로 나온다
const BREATH_DRAIN = 100 / 3, BREATH_GAIN = 9, BREATH_MIN = 35, WANDER_AFTER = 2600;   // 최대 3초 숨기
let lockers, hidden, breath, wanderUntil, lightBefore, graceUntil = 0;
const GRACE = 1000;   // 사물함에서 나온 직후 잡히지 않는 시간
const keys = {};

/* ---------- 지도 ---------- */
const rnd = n => Math.floor(Math.random() * n);
function genMap() {
  const g = Array.from({ length: ROWS }, () => Array(COLS).fill(1));
  const st = [[1, 1]]; g[1][1] = 0;
  while (st.length) {
    const [x, y] = st[st.length - 1];
    const nb = [[2, 0], [-2, 0], [0, 2], [0, -2]].map(([dx, dy]) => [x + dx, y + dy, dx, dy])
      .filter(([nx, ny]) => nx > 0 && ny > 0 && nx < COLS - 1 && ny < ROWS - 1 && g[ny][nx] === 1);
    if (!nb.length) { st.pop(); continue; }
    const [nx, ny, dx, dy] = nb[rnd(nb.length)];
    g[y + dy / 2][x + dx / 2] = 0; g[ny][nx] = 0; st.push([nx, ny]);
  }
  // 길이 하나뿐이면 도망칠 곳이 없으니 벽을 조금 뚫어 고리를 만든다
  for (let i = 0, n = 0; i < 400 && n < 60; i++) {
    const x = 1 + rnd(COLS - 2), y = 1 + rnd(ROWS - 2);
    if (g[y][x] === 1 && ((g[y][x - 1] === 0 && g[y][x + 1] === 0) || (g[y - 1][x] === 0 && g[y + 1][x] === 0))) { g[y][x] = 0; n++; }
  }
  // 막다른 길은 대부분 뚫어서 이어 준다
  for (let y = 1; y < ROWS - 1; y += 2) for (let x = 1; x < COLS - 1; x += 2) {
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    if (dirs.filter(([dx, dy]) => g[y + dy][x + dx] === 0).length !== 1 || Math.random() < .2) continue;
    const opts = dirs.filter(([dx, dy]) => g[y + dy][x + dx] === 1 && g[y + 2 * dy]?.[x + 2 * dx] === 0 && x + 2 * dx > 0 && x + 2 * dx < COLS - 1 && y + 2 * dy > 0 && y + 2 * dy < ROWS - 1);
    if (opts.length) { const [dx, dy] = opts[rnd(opts.length)]; g[y + dy][x + dx] = 0; }
  }
  // 교실 같은 넓은 칸 몇 개
  for (let i = 0; i < 8; i++) {
    const cx = 3 + rnd(COLS - 6), cy = 3 + rnd(ROWS - 6);
    for (let y = cy - 1; y <= cy + 1; y++) for (let x = cx - 1; x <= cx + 1; x++) g[y][x] = 0;
  }
  return g;
}
function bfs(g, sx, sy) {
  const d = Array.from({ length: ROWS }, () => Array(COLS).fill(-1));
  sx = Math.max(0, Math.min(COLS - 1, sx)); sy = Math.max(0, Math.min(ROWS - 1, sy));
  const q = [[sx, sy]]; d[sy][sx] = 0;
  for (let h = 0; h < q.length; h++) {
    const [x, y] = q[h];
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (g[ny] && g[ny][nx] === 0 && d[ny][nx] < 0) { d[ny][nx] = d[y][x] + 1; q.push([nx, ny]); }
    }
  }
  return d;
}
const wall = (x, y) => { const tx = Math.floor(x / T), ty = Math.floor(y / T); return tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS || map[ty][tx] === 1; };
const center = (tx, ty) => ({ x: tx * T + T / 2, y: ty * T + T / 2 });
const tileOf = o => [Math.floor(o.x / T), Math.floor(o.y / T)];
function clearLine(ax, ay, bx, by) {
  const d = Math.hypot(bx - ax, by - ay), n = Math.ceil(d / 8);
  for (let i = 1; i < n; i++) if (wall(ax + (bx - ax) * i / n, ay + (by - ay) * i / n)) return false;
  return true;
}

const newGhost = (tx, ty) => ({ ...center(tx, ty), tgt: null, lit: false, wander: null, saw: false });
function start() {
  map = genMap();
  const d = bfs(map, 1, 1);
  const open = [];
  let far = [1, 1];
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) if (d[y][x] > 0) { open.push([x, y, d[y][x]]); if (d[y][x] > d[far[1]][far[0]]) far = [x, y]; }
  const maxD = d[far[1]][far[0]];
  exit = { tx: far[0], ty: far[1] };
  // 열쇠: 시작점에서 멀고 서로 떨어진 곳
  keysLeft = [];
  const cand = open.filter(([x, y, dd]) => dd > maxD * .35 && !(x === far[0] && y === far[1])).sort(() => Math.random() - .5);
  for (const [x, y] of cand) {
    if (keysLeft.every(k => Math.abs(k.tx - x) + Math.abs(k.ty - y) > 9)) keysLeft.push({ tx: x, ty: y });
    if (keysLeft.length === 3) break;
  }
  batteries = open.filter(([, , dd]) => dd > 6).sort(() => Math.random() - .5).slice(0, 7).map(([x, y]) => ({ tx: x, ty: y }));
  // 사물함: 열쇠 · 건전지 · 비상구와 겹치지 않게, 서로 떨어뜨려 배치
  const taken = new Set([...keysLeft, ...batteries, exit].map(o => o.tx + ',' + o.ty));
  lockers = [];
  for (const [x, y] of open.filter(([, , dd]) => dd > 3).sort(() => Math.random() - .5)) {
    if (taken.has(x + ',' + y)) continue;
    if (lockers.every(l => Math.abs(l.tx - x) + Math.abs(l.ty - y) > 6)) lockers.push({ tx: x, ty: y });
    if (lockers.length === 10) break;
  }
  const gs = open.filter(([, , dd]) => dd > maxD * .5).sort(() => Math.random() - .5)[0] || far;
  ghosts = [newGhost(gs[0], gs[1])];
  player = { ...center(1, 1) };
  got = 0; battery = 100; lightOn = true; aim = 0; mouseAt = 0; scareAt = 0; pathT = 0; distP = null; flick = 1;
  hidden = null; breath = 100; wanderUntil = 0; lightBefore = true;
  seen = Array.from({ length: ROWS }, () => Array(COLS).fill(false));
  msg = '열쇠 3개를 찾아 비상구로 탈출하세요'; msgAt = performance.now();
  t0 = performance.now(); last = t0;
  state = 'play'; veil.hidden = true;
  audioStart();
}

/* ---------- 소리 (WebAudio로 직접 만든다) ---------- */
let ac = null, muted = false, drone = null, nextBeat = 0;
function audioStart() {
  try {
    ac = ac || new (window.AudioContext || window.webkitAudioContext)();
    ac.resume();
    if (!drone) {
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = 'sawtooth'; o.frequency.value = 46; g.gain.value = 0;
      const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 160;
      o.connect(lp).connect(g).connect(ac.destination); o.start();
      drone = g;
    }
  } catch { ac = null; }
}
function droneLevel(v) { if (drone && ac) drone.gain.setTargetAtTime(muted ? 0 : v, ac.currentTime, .3); }
function thump(at, vol) {
  if (!ac || muted) return;
  const o = ac.createOscillator(), g = ac.createGain();
  o.frequency.setValueAtTime(70, at); o.frequency.exponentialRampToValueAtTime(38, at + .15);
  g.gain.setValueAtTime(0, at); g.gain.linearRampToValueAtTime(vol, at + .02); g.gain.exponentialRampToValueAtTime(.001, at + .22);
  o.connect(g).connect(ac.destination); o.start(at); o.stop(at + .25);
}
function blip(freq, dur = .12, type = 'sine', vol = .12) {
  if (!ac || muted) return;
  const o = ac.createOscillator(), g = ac.createGain(), t = ac.currentTime;
  o.type = type; o.frequency.setValueAtTime(freq, t); o.frequency.exponentialRampToValueAtTime(freq * 1.5, t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.001, t + dur);
  o.connect(g).connect(ac.destination); o.start(t); o.stop(t + dur);
}
function scream() {
  if (!ac || muted) return;
  const t = ac.currentTime, len = 1.1;
  const buf = ac.createBuffer(1, ac.sampleRate * len, ac.sampleRate), ch = buf.getChannelData(0);
  for (let i = 0; i < ch.length; i++) ch[i] = (Math.random() * 2 - 1) * (1 - i / ch.length);
  const n = ac.createBufferSource(); n.buffer = buf;
  const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.setValueAtTime(1800, t); bp.frequency.exponentialRampToValueAtTime(500, t + len); bp.Q.value = 2;
  const g = ac.createGain(); g.gain.setValueAtTime(.5, t); g.gain.exponentialRampToValueAtTime(.001, t + len);
  n.connect(bp).connect(g).connect(ac.destination); n.start(t);
  const o = ac.createOscillator(), og = ac.createGain();
  o.type = 'sawtooth'; o.frequency.setValueAtTime(900, t); o.frequency.exponentialRampToValueAtTime(120, t + .9);
  og.gain.setValueAtTime(.18, t); og.gain.exponentialRampToValueAtTime(.001, t + .9);
  o.connect(og).connect(ac.destination); o.start(t); o.stop(t + 1);
}

/* ---------- 진행 ---------- */
function move(o, dx, dy, r) {
  const nx = o.x + dx, ny = o.y + dy;
  if (!wall(nx - r, o.y - r) && !wall(nx + r, o.y - r) && !wall(nx - r, o.y + r) && !wall(nx + r, o.y + r)) o.x = nx;
  if (!wall(o.x - r, ny - r) && !wall(o.x + r, ny - r) && !wall(o.x - r, ny + r) && !wall(o.x + r, ny + r)) o.y = ny;
}
function say(s) { msg = s; msgAt = performance.now(); }
function isLit(gx, gy) {
  if (!lightOn || battery <= 0) return false;
  const dx = gx - player.x, dy = gy - player.y, d = Math.hypot(dx, dy);
  if (d > BEAM_R) return false;
  let da = Math.atan2(dy, dx) - aim; da = Math.atan2(Math.sin(da), Math.cos(da));
  return Math.abs(da) < BEAM_A + 12 / Math.max(d, 1) && clearLine(player.x, player.y, gx, gy);
}
function update(now) {
  const dt = Math.min(.05, (now - last) / 1000); last = now;
  if (state !== 'play') return;
  // 움직임
  let mx = 0, my = 0;
  if (keys.KeyA || keys.ArrowLeft) mx--; if (keys.KeyD || keys.ArrowRight) mx++;
  if (keys.KeyW || keys.ArrowUp) my--; if (keys.KeyS || keys.ArrowDown) my++;
  if ((mx || my) && !hidden) {
    const l = Math.hypot(mx, my), step = P_SPEED * dt;
    const bx = player.x, by = player.y;
    move(player, mx / l * step, my / l * step, P_R);
    // 모퉁이 도움: 가려는 쪽 칸이 뚫려 있는데 벽 모서리에 걸리면, 길 가운데로 살짝 밀어 준다
    if (mx && player.x === bx) {
      const rowC = Math.floor(player.y / T) * T + T / 2, off = rowC - player.y;
      if (!wall(player.x + Math.sign(mx) * (T / 2 + 2), rowC) && Math.abs(off) > .5) move(player, 0, Math.sign(off) * Math.min(Math.abs(off), step), P_R);
    }
    if (my && player.y === by) {
      const colC = Math.floor(player.x / T) * T + T / 2, off = colC - player.x;
      if (!wall(colC, player.y + Math.sign(my) * (T / 2 + 2)) && Math.abs(off) > .5) move(player, Math.sign(off) * Math.min(Math.abs(off), step), 0, P_R);
    }
    if (now - mouseAt > 1500) aim = Math.atan2(my, mx);
  }
  // 본 칸 기억: 내 주변
  const [stx, sty] = tileOf(player);
  for (let y = sty - 2; y <= sty + 2; y++) for (let x = stx - 2; x <= stx + 2; x++) if (seen[y] && x >= 0 && x < COLS) seen[y][x] = true;
  // 배터리
  if (lightOn && battery > 0) { battery = Math.max(0, battery - dt * 1.6); if (battery === 0) say('손전등이 꺼졌어요… 건전지를 찾으세요'); }
  // 숨: 숨어 있으면 줄고, 다 떨어지면 저절로 튀어나온다
  if (hidden) {
    breath = Math.max(0, breath - BREATH_DRAIN * dt);
    if (breath === 0) { unhide(now); say('💨 숨이 막혀서 뛰쳐나왔어요!'); }
  } else breath = Math.min(100, breath + BREATH_GAIN * dt);
  // 줍기
  const [ptx, pty] = tileOf(player);
  for (const k of keysLeft) if (!k.got && k.tx === ptx && k.ty === pty) {
    k.got = true; got++; blip(880, .25, 'triangle', .15);
    if (got === 2) {
      ghosts.push(newGhost(exit.tx, exit.ty));
      say('🔑 2개… 어디선가 무언가 깨어났어요');
    } else say(got === 3 ? '🔑 3개 다 모았어요! 초록 불빛의 비상구로!' : `🔑 열쇠 ${got}/3`);
  }
  for (const b of batteries) if (!b.got && b.tx === ptx && b.ty === pty) { b.got = true; battery = Math.min(100, battery + 45); blip(520, .15); say('🔋 배터리 +45%'); }
  if (got === 3 && ptx === exit.tx && pty === exit.ty) return win(now);
  // 유령 길찾기: 주기적으로 플레이어까지의 거리표를 새로 만든다
  if (now - pathT > 250 || !distP) { distP = bfs(map, ptx, pty); pathT = now; }
  let nearest = 1e9;
  const lost = hidden || now < wanderUntil;   // 숨어 있거나 막 나온 참이면 유령은 나를 놓친다
  for (const g of ghosts) {
    const d = Math.hypot(g.x - player.x, g.y - player.y);
    nearest = Math.min(nearest, d);
    g.lit = isLit(g.x, g.y);
    // 숨는 걸 들킨 유령은 사물함까지 와서 끌어낸다
    // 사물함 안은 무조건 안전, 나온 직후 잠깐도 안전
    if (d < 24 && !hidden && now > graceUntil) return caught(now);
    if (g.lit) continue;
    const speed = G_SPEED * (1 + got * .06);
    let field = distP, flee = false;
    if (lost) {
      // 나와 먼 곳으로 떠돈다: 목적지까지의 거리표를 따라 내려간다
      const [gtx, gty] = tileOf(g);
      // 사물함 가까이(4칸 안)면 일단 나에게서 곧장 멀어진다 = 사물함 앞을 지키지 않는다
      flee = (distP[gty]?.[gtx] ?? 99) < 4;
      if (!flee && (!g.wander || (gtx === g.wander.tx && gty === g.wander.ty))) {
        // 유령에게는 가깝고 나에게서는 먼 곳 = 나를 지나치지 않고 반대쪽으로 가는 곳
        // (나와의 거리 - 유령과의 거리)가 지금 나와의 거리와 비슷하면, 가는 길 내내 나에게서 멀어진다
        const fromG = bfs(map, gtx, gty), dpG = Math.max(0, distP[gty]?.[gtx] ?? 0), cand = [], loose = [];
        for (let y = 1; y < ROWS - 1; y++) for (let x = 1; x < COLS - 1; x++) {
          const dp = distP[y][x], dg = fromG[y][x];
          if (dp < 0 || dg < 4) continue;
          if (dp - dg >= dpG - 2 && dg >= 6) cand.push([x, y, dg]);
          else if (dp > 8 && dg < dp - 4) loose.push([x, y, dp - dg]);
        }
        cand.sort((a, b) => b[2] - a[2]); loose.sort((a, b) => b[2] - a[2]);
        const pool = cand.length ? cand.slice(0, 6) : loose.slice(0, 6);
        const [wx, wy] = pool[rnd(pool.length)] || [gtx, gty];
        g.wander = { tx: wx, ty: wy, field: bfs(map, wx, wy) };
        g.tgt = null;
      }
      if (g.wander) field = g.wander.field;
    } else {
      if (g.wander) { g.wander = null; g.tgt = null; }
      // 바로 보이면 곧장 다가온다
      if (d < 70 && clearLine(g.x, g.y, player.x, player.y)) {
        const l = d || 1; move(g, (player.x - g.x) / l * speed * dt, (player.y - g.y) / l * speed * dt, 8); continue;
      }
    }
    const [gtx, gty] = tileOf(g);
    if (flee && g.tgt && (distP[Math.floor(g.tgt.y / T)]?.[Math.floor(g.tgt.x / T)] ?? 0) < (distP[gty]?.[gtx] ?? 0)) g.tgt = null;
    if (!g.tgt || (Math.abs(g.x - g.tgt.x) < 3 && Math.abs(g.y - g.tgt.y) < 3)) {
      let best = null;
      if (flee) {
        // 나와의 거리가 가장 커지는 옆 칸으로
        let bd = distP[gty]?.[gtx] ?? 0;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const v = distP[gty + dy]?.[gtx + dx]; if (v > bd) { bd = v; best = [gtx + dx, gty + dy]; } }
        if (!best) g.wander = null;
      } else {
        let bd = field[gty]?.[gtx] ?? 999;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const v = field[gty + dy]?.[gtx + dx];
          if (v >= 0 && v < bd) { bd = v; best = [gtx + dx, gty + dy]; }
        }
      }
      g.tgt = best ? center(best[0], best[1]) : center(gtx, gty);
    }
    const dx = g.tgt.x - g.x, dy = g.tgt.y - g.y, l = Math.hypot(dx, dy) || 1;
    const sp = Math.min(l, (flee ? speed * 1.1 : lost ? speed * .85 : speed) * dt);
    g.x += dx / l * sp; g.y += dy / l * sp;
  }
  // 긴장감: 가까울수록 심장 소리 빨라지고 손전등이 떨린다
  const near = Math.max(0, 1 - nearest / 420);
  flick = near > .45 && Math.random() < near * .25 ? .25 + Math.random() * .5 : 1;
  droneLevel(.015 + near * .05);
  if (ac && near > 0) {
    const t = ac.currentTime;
    if (t > nextBeat) { const gap = 1.1 - near * .75; thump(t, .25 + near * .35); thump(t + .16, .18 + near * .25); nextBeat = t + gap; }
  }
}
/* ---------- 숨기 ---------- */
function nearLocker() {
  return lockers.find(l => Math.hypot(l.tx * T + T / 2 - player.x, l.ty * T + T / 2 - player.y) < T * .9);
}
function hide(now) {
  const l = nearLocker();
  if (!l) return;
  if (breath < BREATH_MIN) { say('💨 숨이 차서 아직 못 숨어요'); return; }
  hidden = l;
  const c = center(l.tx, l.ty); player.x = c.x; player.y = c.y;
  lightBefore = lightOn; lightOn = false;
  distP = null;   // 유령이 떠날 방향을 지금 내 위치 기준으로 다시 계산
  // 사물함 안은 안전: 유령은 모두 나를 놓치고 다른 곳으로 간다
  for (const g of ghosts) { g.wander = null; g.tgt = null; }
  blip(180, .18, 'square', .08);
  say('🤫 숨었어요… 3초 안에 나가야 해요');
}
function unhide(now) {
  if (!hidden) return;
  hidden = null; lightOn = lightBefore;
  wanderUntil = now + WANDER_AFTER;
  graceUntil = now + GRACE;
  blip(220, .15, 'square', .08);
}

function win(now) {
  state = 'done';
  droneLevel(0);
  const sec = Math.round((now - t0) / 100) / 10;
  blip(660, .4, 'triangle', .15);
  showResult('horror', sec, { detail: `무사히 탈출! 🏃 배터리 ${Math.round(battery)}% 남음`, extra: { battery: Math.round(battery) }, onRetry: start });
}
function caught(now) {
  state = 'caught'; scareAt = now;
  droneLevel(0); scream();
  setTimeout(() => {
    state = 'done';
    showResult('horror', 0, { fail: true, detail: `유령에게 잡혔어요 👻 (열쇠 ${got}/3)`, onRetry: start });
  }, 1300);
}

/* ---------- 그리기 ---------- */
function ghostShape(x, y, s, now, alpha) {
  const bob = Math.sin(now / 300 + x) * 3;
  ctx.save(); ctx.translate(x, y + bob); ctx.scale(s, s); ctx.globalAlpha = alpha;
  // 흰 옷
  ctx.fillStyle = '#e9e6ee';
  ctx.beginPath(); ctx.moveTo(-14, -6); ctx.quadraticCurveTo(-20, 18, -16, 28);
  for (let i = 0; i <= 6; i++) ctx.lineTo(-16 + i * 16 / 3, 28 + (i % 2 ? -5 : 2) + Math.sin(now / 150 + i) * 2);
  ctx.quadraticCurveTo(20, 18, 14, -6); ctx.fill();
  // 긴 머리
  ctx.fillStyle = '#0c0a0e';
  ctx.beginPath(); ctx.ellipse(0, -16, 15, 16, 0, Math.PI, 0); ctx.lineTo(16, 14); ctx.lineTo(9, 6); ctx.lineTo(-9, 6); ctx.lineTo(-16, 14); ctx.fill();
  // 얼굴
  ctx.fillStyle = '#d8d4dc'; ctx.beginPath(); ctx.ellipse(0, -12, 8, 10, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#0c0a0e';
  ctx.beginPath(); ctx.moveTo(-9, -22); ctx.quadraticCurveTo(0, -8, 9, -22); ctx.lineTo(9, -26); ctx.lineTo(-9, -26); ctx.fill();
  ctx.beginPath(); ctx.ellipse(-3.5, -12, 2, 2.8, 0, 0, Math.PI * 2); ctx.ellipse(3.5, -12, 2, 2.8, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(0, -5, 1.8, 2.6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}
function drawWorld(now, cx, cy) {
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, VW, VH);
  const x0 = Math.max(0, Math.floor(cx / T)), y0 = Math.max(0, Math.floor(cy / T));
  const x1 = Math.min(COLS - 1, Math.floor((cx + VW) / T)), y1 = Math.min(ROWS - 1, Math.floor((cy + VH) / T));
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const sx = x * T - cx, sy = y * T - cy;
    if (map[y][x] === 1) {
      ctx.fillStyle = '#3a3640'; ctx.fillRect(sx, sy, T, T);
      ctx.fillStyle = '#4a4552'; ctx.fillRect(sx, sy, T, 6);
      ctx.fillStyle = '#2a2730'; ctx.fillRect(sx, sy + T - 4, T, 4);
    } else {
      ctx.fillStyle = (x + y) % 2 ? '#5c4a3c' : '#544336'; ctx.fillRect(sx, sy, T, T);
      ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.strokeRect(sx + .5, sy + .5, T - 1, T - 1);
      if ((x * 7 + y * 13) % 17 === 0) { ctx.fillStyle = 'rgba(120,20,20,.35)'; ctx.beginPath(); ctx.ellipse(sx + 20, sy + 22, 9, 5, .4, 0, Math.PI * 2); ctx.fill(); }
    }
  }
  // 비상구
  const ex = exit.tx * T - cx, ey = exit.ty * T - cy;
  ctx.fillStyle = '#1d4a2c'; ctx.fillRect(ex + 4, ey + 4, T - 8, T - 8);
  ctx.fillStyle = got === 3 ? '#4dff88' : '#2b7a46'; ctx.font = '800 10px Pretendard, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('EXIT', ex + T / 2, ey + T / 2);
  ctx.font = '20px "Segoe UI Emoji", sans-serif'; ctx.fillStyle = '#000';
  for (const k of keysLeft) if (!k.got) ctx.fillText('🔑', k.tx * T - cx + T / 2, k.ty * T - cy + T / 2 + Math.sin(now / 300) * 2);
  ctx.font = '18px "Segoe UI Emoji", sans-serif';
  for (const b of batteries) if (!b.got) ctx.fillText('🔋', b.tx * T - cx + T / 2, b.ty * T - cy + T / 2);
  // 사물함
  for (const l of lockers) {
    const lx = l.tx * T - cx, ly = l.ty * T - cy;
    if (lx < -T || ly < -T || lx > VW || ly > VH) continue;
    ctx.fillStyle = '#20262b'; ctx.fillRect(lx + 7, ly + 6, T - 14, T - 4);
    ctx.fillStyle = hidden === l ? '#3c4a55' : '#4a5a66'; ctx.fillRect(lx + 9, ly + 3, T - 18, T - 6);
    ctx.fillStyle = '#2a333a';
    for (let i = 0; i < 3; i++) ctx.fillRect(lx + 13, ly + 8 + i * 4, T - 26, 1.6);
    ctx.fillStyle = '#c9b27a'; ctx.fillRect(lx + T - 15, ly + 20, 2.5, 6);
  }
  for (const g of ghosts) ghostShape(g.x - cx, g.y - cy, 1.35, now, g.lit ? .6 + Math.random() * .4 : .95);
  if (hidden) return;
  // 나
  const px = player.x - cx, py = player.y - cy;
  ctx.fillStyle = '#ffd9b8'; ctx.beginPath(); ctx.arc(px, py, P_R, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#3a2a24'; ctx.beginPath(); ctx.arc(px, py, P_R, Math.PI * .9, Math.PI * 2.1); ctx.fill();
  ctx.fillStyle = '#ffe9a8'; ctx.beginPath(); ctx.arc(px + Math.cos(aim) * 12, py + Math.sin(aim) * 12, 3.5, 0, Math.PI * 2); ctx.fill();
}
function drawDark(cx, cy) {
  dctx.globalCompositeOperation = 'source-over';
  dctx.clearRect(0, 0, VW, VH);
  dctx.fillStyle = 'rgba(2,2,6,.95)'; dctx.fillRect(0, 0, VW, VH);
  dctx.globalCompositeOperation = 'destination-out';
  const px = player.x - cx, py = player.y - cy;
  let g = dctx.createRadialGradient(px, py, 0, px, py, AMB_R);
  g.addColorStop(0, 'rgba(0,0,0,.85)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  dctx.fillStyle = g; dctx.beginPath(); dctx.arc(px, py, AMB_R, 0, Math.PI * 2); dctx.fill();
  if (lightOn && battery > 0) {
    // 벽에 막히는 빛: 부채꼴 안으로 광선을 쏴서 다각형을 만든다
    const pts = [];
    const N = 48, R = BEAM_R * (battery < 15 ? .6 : 1);
    for (let i = 0; i <= N; i++) {
      const a = aim - BEAM_A + 2 * BEAM_A * i / N;
      let r = 0;
      while (r < R && !wall(player.x + Math.cos(a) * r, player.y + Math.sin(a) * r)) {
        const sx = Math.floor((player.x + Math.cos(a) * r) / T), sy = Math.floor((player.y + Math.sin(a) * r) / T);
        if (seen[sy]) { seen[sy][sx] = true; if (seen[sy - 1]) seen[sy - 1][sx] = true; if (seen[sy + 1]) seen[sy + 1][sx] = true; if (sx > 0) seen[sy][sx - 1] = true; if (sx < COLS - 1) seen[sy][sx + 1] = true; }
        r += 6;
      }
      pts.push([px + Math.cos(a) * (r + 4), py + Math.sin(a) * (r + 4)]);
    }
    g = dctx.createRadialGradient(px, py, 10, px, py, R);
    g.addColorStop(0, `rgba(0,0,0,${flick})`); g.addColorStop(.75, `rgba(0,0,0,${.85 * flick})`); g.addColorStop(1, 'rgba(0,0,0,0)');
    dctx.fillStyle = g; dctx.beginPath(); dctx.moveTo(px, py); for (const [x, y] of pts) dctx.lineTo(x, y); dctx.closePath(); dctx.fill();
  }
  ctx.drawImage(dark, 0, 0, VW, VH);
  // 본 길 기억: 어둠 위에 길과 벽 윤곽만 흐리게(유령은 보이지 않는다)
  const x0 = Math.max(0, Math.floor(cx / T)), y0 = Math.max(0, Math.floor(cy / T));
  const x1 = Math.min(COLS - 1, Math.floor((cx + VW) / T)), y1 = Math.min(ROWS - 1, Math.floor((cy + VH) / T));
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    if (!seen[y][x]) continue;
    const sx = x * T - cx, sy = y * T - cy;
    if (map[y][x] === 1) { ctx.fillStyle = 'rgba(95,90,110,.32)'; ctx.fillRect(sx, sy, T, T); ctx.fillStyle = 'rgba(140,132,160,.25)'; ctx.fillRect(sx, sy, T, 3); }
    else { ctx.fillStyle = 'rgba(110,90,70,.14)'; ctx.fillRect(sx + 1, sy + 1, T - 2, T - 2); }
  }
  for (const l of lockers) if (seen[l.ty][l.tx]) { ctx.fillStyle = 'rgba(120,140,155,.35)'; ctx.fillRect(l.tx * T - cx + 9, l.ty * T - cy + 3, T - 18, T - 6); }
  if (seen[exit.ty][exit.tx]) { ctx.fillStyle = 'rgba(60,160,90,.45)'; ctx.fillRect(exit.tx * T - cx + 4, exit.ty * T - cy + 4, T - 8, T - 8); }
  // 빛 색감
  if (lightOn && battery > 0) {
    ctx.save(); ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha = .18 * flick;
    ctx.fillStyle = '#ffe2a0'; ctx.beginPath(); ctx.moveTo(px, py); ctx.arc(px, py, BEAM_R, aim - BEAM_A, aim + BEAM_A); ctx.fill(); ctx.restore();
  }
}
function drawHUD(now, cx, cy) {
  // 어둠 속에서도 보이는 것들: 가까운 유령 눈빛, 모두 모은 뒤의 비상구 불빛
  for (const g of ghosts) {
    const d = Math.hypot(g.x - player.x, g.y - player.y);
    if (!g.lit && d < 330 && Math.sin(now / 90 + g.x) > -.3) {
      ctx.fillStyle = `rgba(255,60,60,${.55 * (1 - d / 330)})`;
      ctx.beginPath(); ctx.arc(g.x - cx - 4, g.y - cy - 13, 1.8, 0, Math.PI * 2); ctx.arc(g.x - cx + 4, g.y - cy - 13, 1.8, 0, Math.PI * 2); ctx.fill();
    }
  }
  if (got === 3) {
    const ex = exit.tx * T - cx + T / 2, ey = exit.ty * T - cy + T / 2, a = .5 + .3 * Math.sin(now / 200);
    const g = ctx.createRadialGradient(ex, ey, 2, ex, ey, 60); g.addColorStop(0, `rgba(77,255,136,${a})`); g.addColorStop(1, 'rgba(77,255,136,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(ex, ey, 60, 0, Math.PI * 2); ctx.fill();
    // 화면 밖이면 가장자리 화살표
    if (ex < 0 || ey < 0 || ex > VW || ey > VH) {
      const ang = Math.atan2(ey - VH / 2, ex - VW / 2);
      const ax = VW / 2 + Math.cos(ang) * (VW / 2 - 30), ay = VH / 2 + Math.sin(ang) * (VH / 2 - 30);
      ctx.save(); ctx.translate(Math.max(24, Math.min(VW - 24, ax)), Math.max(60, Math.min(VH - 24, ay))); ctx.rotate(ang);
      ctx.fillStyle = `rgba(77,255,136,${a + .2})`; ctx.beginPath(); ctx.moveTo(14, 0); ctx.lineTo(-8, -9); ctx.lineTo(-8, 9); ctx.fill(); ctx.restore();
    }
  }
  // 위쪽 정보
  ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(0, 0, VW, 40);
  ctx.textBaseline = 'middle'; ctx.textAlign = 'left'; ctx.font = '800 16px Pretendard, sans-serif';
  ctx.fillStyle = '#ffe9a8'; ctx.fillText(`🔑 ${got}/3`, 16, 20);
  ctx.fillStyle = '#ccc'; ctx.fillText('🔦', 92, 20);
  ctx.fillStyle = '#333'; ctx.fillRect(118, 13, 110, 14);
  ctx.fillStyle = battery < 20 ? '#ff5c5c' : '#9be37a'; ctx.fillRect(120, 15, 106 * battery / 100, 10);
  ctx.fillStyle = lightOn ? '#ccc' : '#ff8a8a'; ctx.font = '700 12px Pretendard, sans-serif'; ctx.fillText(lightOn ? `${Math.round(battery)}%` : '꺼짐', 236, 20);
  // 숨 게이지
  ctx.font = '800 15px Pretendard, sans-serif'; ctx.fillStyle = '#ccc'; ctx.fillText('💨', 290, 20);
  ctx.fillStyle = '#333'; ctx.fillRect(314, 13, 90, 14);
  ctx.fillStyle = breath < BREATH_MIN ? '#ff8a5c' : '#8fd3ff'; ctx.fillRect(316, 15, 86 * breath / 100, 10);
  // 사물함 앞이면 안내
  const nl = !hidden && nearLocker();
  if (nl) {
    const lx = nl.tx * T - cx + T / 2, ly = nl.ty * T - cy - 10;
    const txt = breath < BREATH_MIN ? '💨 숨 고르는 중…' : 'E  숨기';
    ctx.textAlign = 'center'; ctx.font = '800 13px Pretendard, sans-serif';
    const w = ctx.measureText(txt).width + 16;
    ctx.fillStyle = 'rgba(0,0,0,.7)'; ctx.fillRect(lx - w / 2, ly - 11, w, 22);
    ctx.fillStyle = breath < BREATH_MIN ? '#ff9a7a' : '#ffe9a8'; ctx.fillText(txt, lx, ly);
    ctx.textAlign = 'left';
  }
  ctx.textAlign = 'right'; ctx.font = '800 16px Pretendard, sans-serif'; ctx.fillStyle = '#ddd';
  const tNow = state === 'play' ? now : (scareAt || now);
  ctx.fillText(`${Math.max(0, (tNow - t0) / 1000).toFixed(1)}초`, VW - 16, 20);
  ctx.font = '700 12px Pretendard, sans-serif'; ctx.fillStyle = '#888'; ctx.fillText(muted ? '🔇 M' : '🔊 M', VW - 90, 20);
  if (now - msgAt < 3500) {
    ctx.globalAlpha = Math.min(1, (3500 - (now - msgAt)) / 600);
    ctx.textAlign = 'center'; ctx.font = '800 17px Pretendard, sans-serif';
    ctx.fillStyle = 'rgba(0,0,0,.6)'; const w = ctx.measureText(msg).width + 30; ctx.fillRect(VW / 2 - w / 2, VH - 52, w, 32);
    ctx.fillStyle = '#f2e6d0'; ctx.fillText(msg, VW / 2, VH - 36);
    ctx.globalAlpha = 1;
  }
  // 가까우면 붉은 테두리
  const nearest = Math.min(...ghosts.map(g => Math.hypot(g.x - player.x, g.y - player.y)));
  if (nearest < 260) {
    const k = (1 - nearest / 260) * (.6 + .4 * Math.sin(now / 120));
    const g = ctx.createRadialGradient(VW / 2, VH / 2, VH * .35, VW / 2, VH / 2, VW * .65);
    g.addColorStop(0, 'rgba(120,0,0,0)'); g.addColorStop(1, `rgba(150,0,0,${.55 * k})`);
    ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
  }
}
function drawScare(now) {
  const k = Math.min(1, (now - scareAt) / 180);
  const shake = (1 - Math.min(1, (now - scareAt) / 1200)) * 14;
  ctx.save();
  ctx.translate(VW / 2 + (Math.random() - .5) * shake, VH / 2 + 30 + (Math.random() - .5) * shake);
  ctx.fillStyle = '#000'; ctx.fillRect(-VW, -VH, VW * 2, VH * 2);
  const s = 1.4 + k * 1.6;
  ctx.scale(s, s);
  // 머리카락
  ctx.fillStyle = '#060507';
  ctx.beginPath(); ctx.ellipse(0, -40, 120, 130, 0, Math.PI, 0); ctx.lineTo(130, 150); ctx.lineTo(60, 60); ctx.lineTo(-60, 60); ctx.lineTo(-130, 150); ctx.fill();
  // 얼굴
  const fg = ctx.createRadialGradient(0, -20, 10, 0, -20, 110);
  fg.addColorStop(0, '#e8e4ea'); fg.addColorStop(1, '#8c8794');
  ctx.fillStyle = fg; ctx.beginPath(); ctx.ellipse(0, -20, 70, 95, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#060507';
  ctx.beginPath(); ctx.moveTo(-74, -70); ctx.quadraticCurveTo(-20, -40, 0, -78); ctx.quadraticCurveTo(20, -40, 74, -70); ctx.lineTo(74, -130); ctx.lineTo(-74, -130); ctx.fill();
  // 눈 · 입
  ctx.beginPath(); ctx.ellipse(-26, -20, 15, 20, .1, 0, Math.PI * 2); ctx.ellipse(26, -20, 15, 20, -.1, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,40,40,.9)'; ctx.beginPath(); ctx.arc(-26, -18, 2.5, 0, Math.PI * 2); ctx.arc(26, -18, 2.5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#060507'; ctx.beginPath(); ctx.ellipse(0, 38, 18, 30 + Math.sin(now / 40) * 4, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(40,0,0,.5)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-26, 0); ctx.lineTo(-30, 40); ctx.moveTo(26, 0); ctx.lineTo(31, 44); ctx.stroke();
  ctx.restore();
  ctx.fillStyle = `rgba(160,0,0,${.25 + Math.random() * .2})`; ctx.fillRect(0, 0, VW, VH);
}
function draw(now) {
  if (state === 'ready') {
    ctx.fillStyle = '#05050a'; ctx.fillRect(0, 0, VW, VH);
    return;
  }
  if (state === 'caught' || (state === 'done' && scareAt)) return drawScare(now);
  const cx = Math.max(0, Math.min(WW - VW, player.x - VW / 2)), cy = Math.max(-44, Math.min(WH - VH, player.y - VH / 2));
  drawWorld(now, cx, cy);
  drawDark(cx, cy);
  if (hidden) drawHidden(now);
  drawHUD(now, cx, cy);
}
// 사물함 안: 문틈 사이로만 밖이 보인다
function drawHidden(now) {
  const slits = [VH / 2 - 34, VH / 2 - 6, VH / 2 + 22], sh = 12;
  ctx.fillStyle = '#07080a';
  let y = 0;
  for (const s of slits) { ctx.fillRect(0, y, VW, s - y); y = s + sh; }
  ctx.fillRect(0, y, VW, VH - y);
  ctx.fillStyle = '#151a1e';
  for (const s of slits) { ctx.fillRect(0, s - 3, VW, 3); ctx.fillRect(0, s + sh, VW, 3); }
  // 숨소리처럼 화면이 살짝 어두워졌다 밝아진다
  const k = breath / 100;
  ctx.fillStyle = `rgba(0,0,0,${.15 + .1 * Math.sin(now / (200 + 400 * k))})`; ctx.fillRect(0, 0, VW, VH);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = '800 16px Pretendard, sans-serif'; ctx.fillStyle = '#c9c2b8';
  ctx.fillText('사물함 안은 안전해요 · E로 나가기', VW / 2, VH / 2 + 86);
  ctx.fillStyle = '#222'; ctx.fillRect(VW / 2 - 120, VH / 2 + 106, 240, 12);
  ctx.fillStyle = k < .3 ? '#ff6a5c' : '#8fd3ff'; ctx.fillRect(VW / 2 - 118, VH / 2 + 108, 236 * k, 8);
  ctx.font = '700 12px Pretendard, sans-serif'; ctx.fillStyle = '#8a857e';
  ctx.fillText(`숨 ${Math.ceil(breath / BREATH_DRAIN)}초 남음`, VW / 2, VH / 2 + 132);
}
function frame(now) { update(now); draw(now); requestAnimationFrame(frame); }
requestAnimationFrame(frame);

/* ---------- 입력 ---------- */
document.addEventListener('keydown', e => {
  if (document.querySelector('.overlay')) return;
  if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'].includes(e.code)) e.preventDefault();
  if (e.code === 'KeyM') { muted = !muted; droneLevel(0); return; }
  if (state === 'ready' && e.code === 'Space') return start();
  if (state === 'play' && e.code === 'Space' && !e.repeat && !hidden) { lightOn = !lightOn; blip(lightOn ? 1200 : 700, .05, 'square', .05); }
  if (state === 'play' && (e.code === 'KeyE' || e.code === 'KeyF') && !e.repeat) { if (hidden) unhide(performance.now()); else hide(performance.now()); }
  keys[e.code] = true;
});
document.addEventListener('keyup', e => { keys[e.code] = false; });
window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; });
cv.addEventListener('pointermove', e => {
  if (state !== 'play') return;
  const p = canvasPoint(cv, VW, e);
  const cx = Math.max(0, Math.min(WW - VW, player.x - VW / 2)), cy = Math.max(-44, Math.min(WH - VH, player.y - VH / 2));
  aim = Math.atan2(p.y - (player.y - cy), p.x - (player.x - cx)); mouseAt = performance.now();
});
veil.addEventListener('click', start);
