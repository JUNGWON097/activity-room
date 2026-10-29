// 공통: Firebase 연결 · 닉네임 · 기록 저장 · 랭킹 · 결과 창
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, collection, doc, getDoc, getDocs, setDoc, query, orderBy, limit, increment } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAidrKvznTQ5BO85jNZ4FsQZ7QYUy3jUHw",
  authDomain: "pricey-room.firebaseapp.com",
  projectId: "pricey-room",
  storageBucket: "pricey-room.firebasestorage.app",
  messagingSenderId: "675654767413",
  appId: "1:675654767413:web:9284069211aa0d8a19727c"
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// 주소 끝에 ?dev 를 붙이면 연습용 보관함에 저장한다(실제 랭킹에 섞이지 않음)
export const DEV = new URLSearchParams(location.search).has('dev');
const ROOT = DEV ? 'arcade-dev' : 'arcade';
export const QS = DEV ? '?dev' : '';

// 계단 레이스 아이콘: 이모지에 계단 모양이 없어 직접 그린다
const STAIRS_ICON = '<svg class="ico-svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M2 22V17h5v-5h5V7h5V2h5v20z" fill="#ffc83d"/><path d="M2 17h5v-5h5V7h5V2h5" fill="none" stroke="#ff8fb1" stroke-width="1.6" stroke-linejoin="round"/></svg>';

// how: 목표(goal) · 조작(keys: [키, 설명]) · 기록(score) · 팁(tips)
export const GAMES = {
  archery: { name: '바람 양궁', icon: '🏹', unit: '점', order: 'desc', decimals: 0,
    tagline: '바람을 읽고 6발로 60점에 도전',
    how: {
      goal: '과녁 한가운데를 맞혀 6발 합계 점수를 최대한 높이세요. 한 발 만점은 10점, 한가운데 작은 원은 X(10점)로 표시돼요.',
      keys: [['마우스 이동', '조준점 움직이기'], ['마우스 꾹 누르기', '활시위 당기기 — 아래 막대가 찰 때까지'], ['손 떼기', '발사']],
      score: '6발 합계 점수 · 높을수록 1등',
      tips: ['막대가 다 차기 전에 놓으면 힘이 모자라 화살이 <b>아래로</b> 떨어져요.', '다 당긴 채 오래 버티면 팔이 떨려 조준점이 크게 흔들려요. 막대가 차면 바로 놓으세요.', '오른쪽 위 화살표가 바람 방향이에요. 화살은 바람 쪽으로 밀리니 <b>반대쪽</b>을 겨누세요.', '뒤로 갈수록 바람이 세지고 손 떨림도 커져요.'],
    } },
  duel: { name: '석양의 결투', icon: '🤠', unit: 'ms', order: 'asc', decimals: 0,
    tagline: '"쏴!" 신호에 누가 가장 빠를까',
    how: {
      goal: '"쏴!" 신호가 뜨는 순간 누구보다 빨리 반응하세요. 모두 5판이에요.',
      keys: [['클릭 / 스페이스', '쏘기']],
      score: '5판 평균 반응속도(ms) · 낮을수록 1등',
      tips: ['"준비…"가 뜬 뒤 1.5~4.5초 사이 아무 때나 신호가 와요.', '신호 전에 누르면 <b>부정출발</b>로 그 판은 1000ms 처리돼요. 한 번만 나와도 평균이 크게 올라가요.', '보통 사람은 250ms 안팎이에요. 200ms 아래면 번개 손!'],
    } },
  roll: { name: '굴러라 공', icon: '🐹', unit: '초', order: 'desc', decimals: 1,
    tagline: '빨라지는 벽 사이로 끝까지 굴러가기',
    how: {
      goal: '위에서 내려오는 벽의 빈틈으로 공을 빼내며 최대한 오래 버티세요. 벽에 닿으면 끝나요.',
      keys: [['마우스', '화면 위에서 움직이면 공이 마우스를 따라가요'], ['← → / A D', '키보드로 굴리기 (키를 누르면 키보드가 우선)']],
      score: '버틴 시간(초) · 길수록 1등',
      tips: ['공은 미끄러져서 바로 멈추지 않아요. 다음 틈을 미리 보고 움직이세요.', '시간이 지날수록 벽이 빨라지고 틈이 좁아져요.', '<b>분홍 벽</b>은 좌우로 움직여요. 틈이 지나가는 타이밍을 노리세요.'],
    } },
  stairs: { name: '계단 레이스', icon: STAIRS_ICON, unit: '계단', order: 'desc', decimals: 0,
    tagline: '다음 계단 방향만 맞히면 끝없이 위로',
    how: {
      goal: '지그재그로 이어진 계단을 한 칸씩 올라 최대한 높이 가세요.',
      keys: [['← / A', '다음 계단이 왼쪽 위일 때'], ['→ / D', '다음 계단이 오른쪽 위일 때'], ['화면 왼쪽·오른쪽 클릭', '키보드 대신 써도 돼요']],
      score: '오른 계단 수 · 많을수록 1등',
      tips: ['반짝이는 <b>노란 계단</b>이 다음 칸이에요. 그쪽 방향을 누르세요.', '방향을 틀리면 발을 헛디뎌 떨어져요.', '위쪽 시간 막대는 계속 줄고, 한 칸 오를 때마다 조금 채워져요. 오를수록 빨리 줄어요.'],
    } },
  ticket: { name: '티켓팅 체험', icon: '🎫', unit: '초', order: 'asc', decimals: 2,
    tagline: '큰 공연장부터 소극장까지 3회차 예매',
    how: {
      goal: '3회차 공연을 차례로 예매하세요. 큰 공연장에서 시작해 점점 좌석이 적은 공연장으로 바뀌어요.',
      keys: [['클릭', '예매하기 · 좌석 · 결제 버튼'], ['키보드', '보안문자 입력 후 Enter']],
      score: '3회차 예매 시간 합계(초) · 짧을수록 1등. 회차마다 오픈 정각부터 결제 완료까지 재요.',
      tips: ['오픈 전에 누르면 "오픈 전입니다"만 떠요. 정각에 버튼이 보라색으로 바뀌는 순간 누르세요. 늦을수록 대기 순서가 뒤로 밀려요.', '보안문자를 치는 동안에도 좌석은 계속 팔려요.', '좌석을 눌러도 "이미 선택된 좌석"이 뜰 수 있어요. 앞쪽 좋은 자리일수록 잘 뺏겨요.', '매진되면 그 회차는 <b>40초</b>로 기록돼요.', '결제는 결제 수단 선택 + 동의 체크까지 해야 넘어가요.'],
    } },
  tug: { name: '연타 줄다리기', icon: '🐱', unit: '회', order: 'desc', decimals: 0,
    tagline: '10초 동안 스페이스 연타',
    how: {
      goal: '고양이 팀이 되어 곰돌이 팀과 줄다리기! 10초 동안 최대한 많이 눌러 줄을 끌어오세요.',
      keys: [['스페이스', '한 번 누를 때마다 1회'], ['클릭', '마우스로 눌러도 1회']],
      score: '10초 동안 누른 횟수 · 많을수록 1등',
      tips: ['3 · 2 · 1 뒤에 시작해요. 카운트 중에 누른 건 안 세요.', '꾹 누르고 있기는 1회로만 세요. 떼고 다시 눌러야 해요.', '곰돌이 팀은 초당 7~8회쯤 당겨요. 그보다 빠르면 이겨요.'],
    } },
};
export const GAME_IDS = Object.keys(GAMES);

export function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
export function fmt(id, v) {
  const g = GAMES[id];
  if (typeof v !== 'number') return '-';
  return v.toLocaleString('ko-KR', { minimumFractionDigits: g.decimals, maximumFractionDigits: g.decimals }) + g.unit;
}
export const isBetter = (id, a, b) => GAMES[id].order === 'desc' ? a > b : a < b;
function shortDate(ms) { const d = new Date(ms); return `${d.getMonth() + 1}/${d.getDate()}`; }

/* ---------- 닉네임 ---------- */
const NICK_KEY = 'activity-room:nick';
export function getNick() { try { return localStorage.getItem(NICK_KEY) || ''; } catch { return ''; } }
function storeNick(n) { try { localStorage.setItem(NICK_KEY, n); } catch { } }
function cleanNick(s) { return String(s || '').replace(/[\/\\.#$\[\]]/g, '').replace(/\s+/g, ' ').trim().slice(0, 20); }
function paintNickChips() {
  document.querySelectorAll('.nick-chip').forEach(b => { b.textContent = getNick() ? `👤 ${getNick()}` : '👤 닉네임 정하기'; });
}
export function askNick() {
  return new Promise(resolve => {
    const ov = document.createElement('div');
    ov.className = 'overlay';
    ov.innerHTML = `<form class="modal">
      <h2>닉네임</h2>
      <p class="muted">랭킹에 이 이름으로 기록돼요. 20자 이내.</p>
      <input name="nick" maxlength="20" autocomplete="off" placeholder="예: 정원" value="${esc(getNick())}">
      <p class="err" hidden>한 글자 이상 입력해 주세요</p>
      <div class="row"><button class="btn primary" type="submit">확인</button></div>
    </form>`;
    document.body.appendChild(ov);
    const input = ov.querySelector('input');
    setTimeout(() => input.focus(), 30);
    ov.querySelector('form').addEventListener('submit', e => {
      e.preventDefault();
      const n = cleanNick(input.value);
      if (!n) { ov.querySelector('.err').hidden = false; return; }
      storeNick(n); paintNickChips(); ov.remove(); resolve(n);
    });
    ov.addEventListener('keydown', e => e.stopPropagation());
  });
}
export async function ensureNick() { return getNick() || askNick(); }

/* ---------- 기록 ---------- */
// 닉네임마다 게임별 최고 기록 1건만 둔다. 판수(plays)는 매번 늘린다.
export async function saveScore(id, score, extra = {}) {
  const nick = await ensureNick();
  const ref = doc(db, ROOT, id, 'scores', nick);
  const snap = await getDoc(ref);
  const prev = snap.exists() ? snap.data().score : null;
  const isNew = typeof prev !== 'number' || isBetter(id, score, prev);
  const data = { nick, plays: increment(1), lastAt: Date.now() };
  if (isNew) Object.assign(data, { score, extra, at: Date.now() });
  await setDoc(ref, data, { merge: true });
  return { nick, isNew, prev, best: isNew ? score : prev };
}
export async function topScores(id, n = 20) {
  const q = query(collection(db, ROOT, id, 'scores'), orderBy('score', GAMES[id].order), limit(n));
  const s = await getDocs(q);
  return s.docs.map(d => d.data());
}
export function boardHTML(id, rows, me) {
  if (!rows.length) return '<p class="muted empty">아직 기록이 없어요. 첫 1등이 되어 보세요!</p>';
  const medal = ['🥇', '🥈', '🥉'];
  return `<ol class="board">${rows.map((r, i) => `
    <li class="${r.nick === me ? 'me' : ''}">
      <span class="rk">${medal[i] || i + 1}</span>
      <span class="nm">${esc(r.nick)}</span>
      <span class="sc">${fmt(id, r.score)}</span>
      <span class="dt">${r.at ? shortDate(r.at) : ''}</span>
    </li>`).join('')}</ol>`;
}
export async function loadBoard(id, el) {
  el.innerHTML = '<p class="muted empty">불러오는 중…</p>';
  try {
    const rows = await topScores(id);
    el.innerHTML = boardHTML(id, rows, getNick());
    return rows;
  } catch (e) {
    console.error(e);
    el.innerHTML = '<p class="muted empty">랭킹을 불러오지 못했어요</p>';
    return null;
  }
}

/* ---------- 게임 페이지 틀 ---------- */
function howHTML(h) {
  return `<h3>🎯 목표</h3><p>${h.goal}</p>
    <h3>🎮 조작</h3><ul class="keys">${h.keys.map(([k, d]) => `<li><kbd>${k}</kbd><span>${d}</span></li>`).join('')}</ul>
    <h3>🏆 기록</h3><p>${h.score}</p>
    <h3>💡 팁</h3><ul class="tips">${h.tips.map(t => `<li>${t}</li>`).join('')}</ul>`;
}
export function initGamePage(id) {
  const g = GAMES[id];
  document.title = `${g.name} · 액티비티룸`;
  document.getElementById('top').innerHTML = `
    <a class="home" href="./${QS}">← 전체 게임</a>
    <h1><span>${g.icon}</span> ${g.name}${DEV ? ' <small class="dev">연습 모드</small>' : ''}</h1>
    <button class="nick-chip" type="button"></button>`;
  document.getElementById('how').innerHTML = howHTML(g.how);
  // 시작 화면에도 조작법을 짧게 보여 준다
  document.querySelectorAll('.veil > div').forEach(v => v.insertAdjacentHTML('beforeend',
    `<ul class="veil-keys">${g.how.keys.map(([k, d]) => `<li><kbd>${k}</kbd> ${d}</li>`).join('')}</ul>`));
  document.querySelector('.nick-chip').addEventListener('click', () => askNick().then(() => loadBoard(id, document.getElementById('board'))));
  paintNickChips();
  loadBoard(id, document.getElementById('board'));
}

/* ---------- 결과 창 ---------- */
// fail: 기록 없이 끝난 판(예: 매진). detail: 점수 아래 한 줄 설명(HTML)
export async function showResult(id, score, { detail = '', onRetry, fail = false, extra = {} } = {}) {
  if (document.activeElement) document.activeElement.blur();
  const ov = document.createElement('div');
  ov.className = 'overlay';
  ov.innerHTML = `<div class="modal result">
    <div class="big ${fail ? 'fail' : ''}">${fail ? '기록 없음' : fmt(id, score)}</div>
    ${detail ? `<p class="detail">${detail}</p>` : ''}
    <p class="save muted">${fail ? '' : '기록 저장 중…'}</p>
    <div class="row">
      <button class="btn primary retry" type="button" disabled>다시 하기 <kbd>R</kbd></button>
      <a class="btn" href="./${QS}">전체 게임</a>
    </div>
  </div>`;
  document.body.appendChild(ov);
  const retryBtn = ov.querySelector('.retry');
  const retry = () => { ov.remove(); document.removeEventListener('keydown', onKey, true); onRetry && onRetry(); };
  const onKey = e => {
    if (retryBtn.disabled) return;
    if (e.key === 'r' || e.key === 'R' || e.key === 'ㄱ') { e.preventDefault(); e.stopPropagation(); retry(); }
  };
  // 연타 중 결과 창이 떠도 바로 다시 시작되지 않게 잠깐 막아 둔다
  setTimeout(() => { retryBtn.disabled = false; }, 700);
  retryBtn.addEventListener('click', retry);
  document.addEventListener('keydown', onKey, true);
  if (fail) return;

  const saveEl = ov.querySelector('.save');
  try {
    const r = await saveScore(id, score, extra);
    const rows = await loadBoard(id, document.getElementById('board'));
    const rank = rows ? rows.findIndex(x => x.nick === r.nick) + 1 : 0;
    const rankTxt = rank ? ` · 랭킹 ${rank}위` : '';
    saveEl.classList.remove('muted');
    saveEl.innerHTML = r.isNew
      ? `<b class="new">🎉 내 최고 기록${r.prev == null ? '' : ' 경신'}!</b>${rankTxt}`
      : `내 최고 기록 ${fmt(id, r.best)}${rankTxt}`;
  } catch (e) {
    console.error(e);
    saveEl.textContent = '기록을 저장하지 못했어요. 인터넷 연결을 확인해 주세요.';
  }
}

/* ---------- 캔버스 도우미 ---------- */
// 논리 크기(w×h)로 그리고, 화면 크기·고해상도에 맞춰 선명하게 늘린다
export function setupCanvas(canvas, w, h) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = w * dpr; canvas.height = h * dpr;
  canvas.style.aspectRatio = `${w} / ${h}`;
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return ctx;
}
export function canvasPoint(canvas, w, e) {
  const r = canvas.getBoundingClientRect();
  const k = w / r.width;
  return { x: (e.clientX - r.left) * k, y: (e.clientY - r.top) * k };
}
