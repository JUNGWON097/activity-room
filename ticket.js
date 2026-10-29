import { initGamePage, showResult } from './common.js?v=9';

initGamePage('ticket');

const body = document.getElementById('body');
const clockEl = document.getElementById('clock');
const timerEl = document.getElementById('timer');
const veil = document.getElementById('veil');

const ROW_NAMES = 'ABCDEFGHIJKLMNOPQRST';
const GRADE = { vip: { name: 'VIP석', price: 154000 }, r: { name: 'R석', price: 132000 }, s: { name: 'S석', price: 99000 } };
// 회차마다 공연장이 작아진다. blocks: 한 줄을 통로로 나눈 구역별 좌석 수
const VENUES = [
  { name: '대형 아레나', icon: '🏟️', rows: 20, blocks: [12, 14, 12], sell: 15, clash: 1, seat: 11, gap: 2 },
  { name: '중형 홀', icon: '🎭', rows: 14, blocks: [9, 12, 9], sell: 9, clash: 1.1, seat: 14, gap: 3 },
  { name: '소극장', icon: '🎪', rows: 10, blocks: [8, 8], sell: 4.5, clash: 1.2, seat: 18, gap: 3 },
];
// 점수: 앞줄일수록(1000 → 200) · 가운데일수록(+최대 100) · 빨리 끝낼수록(+최대 600, 40초면 0)
const ROW_MAX = 1000, ROW_MIN = 200, CENTER_MAX = 100, TIME_MAX = 600, TIME_PER_SEC = 15;
const CAPTCHA_CHARS = 'ABCDEFGHJKLMNPRSTUVWXYZ';

let round, results, venue, openAt, phase, earlyClicks, captchaMiss, clashes, queueNo, seats, mine, checking, simTimer, clockTimer, toastTimer;

const perRow = () => venue.blocks.reduce((a, b) => a + b, 0);
function gradeOf(r) { const k = r / venue.rows; return k < .2 ? 'vip' : k < .55 ? 'r' : 's'; }
const rowK = s => s.row / (venue.rows - 1);                                   // 0 = 맨 앞줄, 1 = 맨 뒷줄
const centerK = s => 1 - Math.abs(s.col - 0.5 - perRow() / 2) / (perRow() / 2); // 1 = 정가운데
function seatPoints(s) { return Math.round(ROW_MAX - (ROW_MAX - ROW_MIN) * rowK(s) + CENTER_MAX * centerK(s)); }
function timePoints(secs) { return Math.max(0, Math.round(TIME_MAX - secs * TIME_PER_SEC)); }
// 다른 사람들은 앞줄 · 가운데부터 채간다
function demand(s) { return Math.exp(-2.6 * rowK(s)) * (0.55 + 0.45 * centerK(s)); }
function seatLabel(s) { return `${GRADE[s.grade].name} ${ROW_NAMES[s.row]}열 ${s.col}번`; }
function won(n) { return n.toLocaleString('ko-KR') + '원'; }
function roundTag() { return `${round + 1}회차 · ${venue.icon} ${venue.name}`; }

/* ---------- 시계 ---------- */
// 오픈 순간을 20:00:00으로 두고 가상의 서버 시각을 보여 준다
function tickClock() {
  const now = performance.now();
  const ms = 20 * 3600000 + (now - openAt);
  const h = Math.floor(ms / 3600000), m = Math.floor(ms / 60000) % 60, s = Math.floor(ms / 1000) % 60;
  const p = n => String(n).padStart(2, '0');
  clockEl.innerHTML = `서버 시각 <b>${p(h)}:${p(m)}:${p(s)}</b>`;
  timerEl.textContent = now >= openAt && !['done', 'soldout', 'between'].includes(phase) ? `⏱ ${((now - openAt) / 1000).toFixed(2)}초` : '';
  if (phase === 'before' && now >= openAt) openNow();
}

function start() {
  round = 0; results = []; earlyClicks = 0; captchaMiss = 0; clashes = 0;
  veil.hidden = true;
  beginRound();
}
function beginRound() {
  clearInterval(simTimer); clearInterval(clockTimer);
  venue = VENUES[round]; mine = null; checking = null;
  openAt = performance.now() + (round === 0 ? 3000 + Math.random() * 3000 : 2000 + Math.random() * 2500);
  phase = 'before';
  screenOpen();
  clockTimer = setInterval(tickClock, 30); tickClock();
}
veil.addEventListener('click', start);

function toast(msg) {
  body.querySelector('.toast-in')?.remove();
  body.insertAdjacentHTML('beforeend', `<div class="toast-in">${msg}</div>`);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => body.querySelector('.toast-in')?.remove(), 1200);
}
function roundsBar() {
  return `<div class="rounds-bar">${VENUES.map((v, i) => {
    const r = results[i];
    const cls = i === round && phase !== 'between' ? 'now' : r ? (r.soldOut ? 'bad' : 'ok') : '';
    return `<span class="${cls}">${v.icon} ${i + 1}회차 ${r ? (r.soldOut ? '매진 0점' : r.points.toLocaleString('ko-KR') + '점') : v.name}</span>`;
  }).join('')}</div>`;
}

/* ---------- 1. 오픈 대기 ---------- */
function screenOpen() {
  const total = venue.rows * perRow();
  body.innerHTML = `${roundsBar()}<div class="poster">
    <div class="art">${venue.icon}</div>
    <div>
      <div class="round-tag">${round + 1}회차 / 3</div>
      <h2>한여름 밤의 오락실 콘서트</h2>
      <dl><dt>장소</dt><dd>${venue.name} (${total}석)</dd><dt>일시</dt><dd>8월 ${15 + round}일 저녁 7시</dd><dt>가격</dt><dd>VIP 154,000원 · R 132,000원 · S 99,000원</dd></dl>
      <div class="open-at" id="openMsg">오늘 20:00 예매 오픈</div>
      <button class="tk-btn off" id="buy">예매하기</button>
    </div>
  </div>`;
  body.querySelector('#buy').addEventListener('click', () => {
    if (phase === 'before') { earlyClicks++; toast('아직 예매 오픈 전입니다'); return; }
    if (phase === 'open') screenQueue();
  });
}
function openNow() {
  phase = 'open';
  body.querySelector('#buy')?.classList.remove('off');
  const m = body.querySelector('#openMsg');
  if (m) m.textContent = '지금 예매 가능!';
}

/* ---------- 2. 대기열 ---------- */
function screenQueue() {
  phase = 'queue';
  const reaction = performance.now() - openAt;
  // 늦게 누를수록 대기 순서가 뒤로 밀린다
  queueNo = Math.max(1, Math.round(reaction * 2.8 + Math.random() * 400 + 30));
  const waitMs = Math.max(1000, Math.min(7500, queueNo * 3.2));
  body.innerHTML = `${roundsBar()}<div class="queue">
    <h3>접속 대기 중입니다</h3>
    <div style="color:#50546a;font-size:14px">나의 대기 순서</div>
    <div class="num" id="qn">${queueNo.toLocaleString('ko-KR')}</div>
    <div class="bar"><i id="qb"></i></div>
    <p>새로고침하면 대기 순서가 뒤로 밀려요. 잠시만 기다려 주세요.</p>
  </div>`;
  const t0 = performance.now();
  const qn = body.querySelector('#qn'), qb = body.querySelector('#qb');
  const iv = setInterval(() => {
    const k = Math.min(1, (performance.now() - t0) / waitMs);
    qn.textContent = Math.max(0, Math.round(queueNo * (1 - k))).toLocaleString('ko-KR');
    qb.style.width = (k * 100) + '%';
    if (k >= 1) { clearInterval(iv); screenSeats(); }
  }, 50);
}

/* ---------- 3. 좌석 + 보안문자 ---------- */
function buildSeats() {
  seats = [];
  for (let r = 0; r < venue.rows; r++) for (let c = 1; c <= perRow(); c++) {
    seats.push({ row: r, col: c, grade: gradeOf(r), taken: false, el: null });
  }
  // 대기 순서가 늦을수록 이미 팔린 좌석이 많다
  sellRandom(Math.round(seats.length * Math.min(0.3, 0.05 + queueNo / 6000)));
}
function sellRandom(n) {
  for (let i = 0; i < n; i++) {
    const pool = seats.filter(s => !s.taken && s !== mine && s !== checking);
    if (!pool.length) return;
    let pick = Math.random() * pool.reduce((a, s) => a + demand(s), 0);
    const s = pool.find(x => (pick -= demand(x)) <= 0) || pool[pool.length - 1];
    s.taken = true;
    if (s.el) s.el.className = 'seat taken';
  }
}
function screenSeats() {
  phase = 'seats';
  buildSeats();
  body.innerHTML = `${roundsBar()}<div class="seat-wrap">
    <div class="seat-map">
      <div class="stage-label">STAGE</div>
      <div class="seats" id="seats" style="--seat:${venue.seat}px;gap:${venue.gap}px;grid-template-columns:16px ${venue.blocks.map(n => `repeat(${n},var(--seat))`).join(' 8px ')}"></div>
      <div class="legend"><span><i style="background:#8b6cff"></i>VIP</span><span><i style="background:#2fb8a8"></i>R</span><span><i style="background:#f2a93b"></i>S</span><span><i style="background:#d9dbe3"></i>판매 완료</span></div>
    </div>
    <div class="side">
      <h4>남은 좌석</h4>
      <div class="left-cnt" id="left"></div>
      <div class="pick" id="pick">좌석을 선택해 주세요</div>
      <button class="tk-btn off" id="next">좌석 선택 완료</button>
    </div>
  </div>`;
  const grid = body.querySelector('#seats');
  for (let r = 0; r < venue.rows; r++) {
    grid.insertAdjacentHTML('beforeend', `<span class="rl">${ROW_NAMES[r]}</span>`);
    let edge = 0;
    const aisles = venue.blocks.slice(0, -1).map(n => (edge += n));   // 이 번호 뒤에 통로
    for (let c = 1; c <= perRow(); c++) {
      const s = seats[r * perRow() + c - 1];
      const b = document.createElement('button');
      b.className = 'seat ' + (s.taken ? 'taken' : s.grade);
      b.title = seatLabel(s);
      b.addEventListener('click', () => clickSeat(s));
      s.el = b; grid.appendChild(b);
      if (aisles.includes(c)) grid.appendChild(document.createElement('span'));
    }
  }
  body.querySelector('#next').addEventListener('click', () => {
    if (!mine) { toast('좌석을 먼저 선택해 주세요'); return; }
    clearInterval(simTimer); screenPay();
  });
  paintLeft();
  let carry = 0;
  simTimer = setInterval(() => {
    carry += venue.sell / 10;
    const n = Math.floor(carry + (Math.random() - .5)); carry -= Math.max(0, n);
    sellRandom(Math.max(0, n));
    paintLeft();
    if (!mine && !checking && seats.every(s => s.taken)) soldOut();
  }, 100);
  showCaptcha();
}
function paintLeft() {
  const el = body.querySelector('#left'); if (!el) return;
  el.innerHTML = Object.keys(GRADE).map(g =>
    `<div><span>${GRADE[g].name}</span><b>${seats.filter(s => s.grade === g && !s.taken && s !== mine).length}석</b></div>`).join('');
}
function clickSeat(s) {
  if (phase !== 'seats' || s === mine || checking || body.querySelector('.dim')) return;
  if (s.taken) { dialog('이미 선택된 좌석입니다', '다른 고객님이 먼저 선택한 좌석이에요. 다른 좌석을 선택해 주세요.'); return; }
  if (mine) { mine.el.className = 'seat ' + mine.grade; mine = null; paintPick(); }
  checking = s;
  s.el.classList.add('checking');
  setTimeout(() => {
    checking = null;
    if (phase !== 'seats') return;
    s.el.classList.remove('checking');
    // 앞줄 · 가운데 좌석일수록 다른 사람과 겹칠 확률이 높다
    if (s.taken || Math.random() < (0.08 + 0.45 * demand(s)) * venue.clash) {
      // 확인하는 사이 다른 사람이 먼저 결제 단계로 넘어갔다
      s.taken = true; s.el.className = 'seat taken'; clashes++;
      paintLeft();
      dialog('이미 선택된 좌석입니다', '다른 고객님이 먼저 선택한 좌석이에요. 다른 좌석을 선택해 주세요.');
      return;
    }
    mine = s; s.el.className = 'seat mine';
    paintPick(); paintLeft();
  }, 300 + Math.random() * 300);
}
function paintPick() {
  body.querySelector('#pick').innerHTML = mine
    ? `<b>${seatLabel(mine)}</b><br>${won(GRADE[mine.grade].price)}<br><span class="pts">좌석 점수 ${seatPoints(mine).toLocaleString('ko-KR')}점</span>`
    : '좌석을 선택해 주세요<br><span class="pts">앞줄 · 가운데일수록 점수가 높아요</span>';
  body.querySelector('#next').classList.toggle('off', !mine);
}
function dialog(title, msg) {
  body.insertAdjacentHTML('beforeend', `<div class="dim"><div class="box"><h4>${title}</h4><p>${msg}</p><button class="tk-btn">확인</button></div></div>`);
  const d = body.lastElementChild;
  d.querySelector('button').addEventListener('click', () => d.remove());
}

function makeCaptcha() {
  return Array.from({ length: 6 }, () => CAPTCHA_CHARS[Math.floor(Math.random() * CAPTCHA_CHARS.length)]).join('');
}
function drawCaptcha(cv, text) {
  const ctx = cv.getContext('2d');
  ctx.clearRect(0, 0, cv.width, cv.height);
  ctx.fillStyle = '#eef0f6'; ctx.fillRect(0, 0, cv.width, cv.height);
  for (let i = 0; i < 8; i++) {
    ctx.strokeStyle = `hsla(${Math.random() * 360},50%,50%,.5)`; ctx.lineWidth = 1 + Math.random() * 2;
    ctx.beginPath(); ctx.moveTo(Math.random() * cv.width, Math.random() * cv.height);
    ctx.bezierCurveTo(Math.random() * cv.width, Math.random() * cv.height, Math.random() * cv.width, Math.random() * cv.height, Math.random() * cv.width, Math.random() * cv.height);
    ctx.stroke();
  }
  [...text].forEach((ch, i) => {
    ctx.save();
    ctx.translate(22 + i * 34, cv.height / 2 + (Math.random() - .5) * 16);
    ctx.rotate((Math.random() - .5) * .8);
    ctx.font = `900 ${28 + Math.random() * 10}px Pretendard, sans-serif`;
    ctx.fillStyle = `hsl(${220 + Math.random() * 80},45%,${25 + Math.random() * 18}%)`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(ch, 0, 0);
    ctx.restore();
  });
}
function showCaptcha() {
  let answer = makeCaptcha();
  body.insertAdjacentHTML('beforeend', `<div class="dim" id="cap"><form class="box">
    <h4>문자를 입력해 주세요</h4>
    <p>부정 예매 방지를 위해 아래 문자를 입력해 주세요</p>
    <canvas width="220" height="70"></canvas>
    <input maxlength="6" autocomplete="off" spellcheck="false">
    <p class="err"></p>
    <button class="tk-btn" type="submit">입력 완료</button>
  </form></div>`);
  const cap = body.querySelector('#cap'), cv = cap.querySelector('canvas'), input = cap.querySelector('input'), err = cap.querySelector('.err');
  drawCaptcha(cv, answer);
  setTimeout(() => input.focus(), 30);
  cap.querySelector('form').addEventListener('submit', e => {
    e.preventDefault();
    if (input.value.trim().toUpperCase() === answer) { cap.remove(); return; }
    captchaMiss++;
    err.textContent = '문자를 다시 입력해 주세요';
    cap.querySelector('.box').classList.remove('shake'); void cap.offsetWidth; cap.querySelector('.box').classList.add('shake');
    answer = makeCaptcha(); drawCaptcha(cv, answer);
    input.value = ''; input.focus();
  });
}

/* ---------- 4. 결제 ---------- */
function screenPay() {
  phase = 'pay';
  const g = GRADE[mine.grade];
  body.innerHTML = `${roundsBar()}<form class="pay">
    <h3>결제하기</h3>
    <div class="sum"><b>공연</b><span>한여름 밤의 오락실 콘서트 (${roundTag()})</span><b>좌석</b><span>${seatLabel(mine)}</span><b>금액</b><span>${won(g.price + 2000)} <small style="color:#8a8ea3">(수수료 2,000원 포함)</small></span></div>
    <div><div style="font-weight:700;margin-bottom:8px">결제 수단</div>
      <div class="methods">
        <label><input type="radio" name="m" value="card">신용카드</label>
        <label><input type="radio" name="m" value="bank">무통장입금</label>
        <label><input type="radio" name="m" value="easy">간편결제</label>
      </div></div>
    <label class="agree"><input type="checkbox" name="agree">주문자 정보 확인 및 취소 규정에 동의합니다</label>
    <p class="err"></p>
    <button class="tk-btn" type="submit">결제하기</button>
  </form>`;
  const f = body.querySelector('form');
  f.addEventListener('submit', e => {
    e.preventDefault();
    const err = f.querySelector('.err');
    if (!f.m.value) { err.textContent = '결제 수단을 선택해 주세요'; return; }
    if (!f.agree.checked) { err.textContent = '취소 규정에 동의해 주세요'; return; }
    const secs = Math.round((performance.now() - openAt) / 10) / 100;
    const seatPts = seatPoints(mine), timePts = timePoints(secs);
    endRound({ secs, seat: seatLabel(mine), grade: mine.grade, seatPts, timePts, points: seatPts + timePts });
  });
}

/* ---------- 회차 끝 · 매진 ---------- */
function soldOut() {
  endRound({ soldOut: true, points: 0 });
}
function endRound(r) {
  clearInterval(simTimer); clearInterval(clockTimer);
  results.push(r);
  timerEl.textContent = '';
  const last = round === VENUES.length - 1;
  phase = 'between';
  body.innerHTML = `${roundsBar()}<div class="done">
    <div class="big">${r.soldOut ? '😭' : '🎉'}</div>
    <h3>${r.soldOut ? '매진되었습니다' : '예매 완료!'}</h3>
    ${r.soldOut ? `<p style="color:#50546a">이 회차는 0점이에요</p>` : `<p style="color:#50546a">${r.seat} · ${r.secs.toFixed(2)}초</p>
    <div class="score-break"><span>좌석 ${r.seatPts.toLocaleString('ko-KR')}점</span><span>+</span><span>속도 ${r.timePts.toLocaleString('ko-KR')}점</span><span>=</span><b>${r.points.toLocaleString('ko-KR')}점</b></div>`}
    ${last ? '' : `<button class="tk-btn" id="nextRound">다음 회차: ${VENUES[round + 1].icon} ${VENUES[round + 1].name} →</button>`}
  </div>`;
  if (last) return finish();
  body.querySelector('#nextRound').addEventListener('click', () => { round++; beginRound(); });
}
function finish() {
  const total = results.reduce((a, r) => a + r.points, 0);
  const per = results.map((r, i) => `${i + 1}회차 ${r.soldOut ? '매진' : `${r.seat.replace(/^\S+ /, '')} ${r.points.toLocaleString('ko-KR')}점`}`).join(' · ');
  const notes = [];
  if (earlyClicks) notes.push(`오픈 전 클릭 ${earlyClicks}회`);
  if (clashes) notes.push(`좌석 뺏김 ${clashes}회`);
  if (captchaMiss) notes.push(`보안문자 틀림 ${captchaMiss}회`);
  showResult('ticket', total, {
    detail: per + (notes.length ? `<br><small>${notes.join(' · ')}</small>` : ''),
    extra: { points: results.map(r => r.points), secs: results.map(r => r.soldOut ? null : r.secs), seats: results.map(r => r.seat || null), earlyClicks, clashes, captchaMiss },
    onRetry: start,
  });
}

// 시작 전 화면
round = 0; results = []; venue = VENUES[0]; openAt = performance.now() + 1e9; phase = 'idle';
screenOpen();
clockEl.innerHTML = '서버 시각 <b>19:59:5x</b>';
