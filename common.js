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

export const GAMES = {
  archery: { name: '바람 양궁', icon: '🏹', unit: '점', order: 'desc', decimals: 0,
    tagline: '바람을 읽고 6발로 60점에 도전',
    how: '마우스로 조준하고 <b>누르고 있으면</b> 활을 당겨요. 끝까지 당긴 뒤 놓으면 발사. 덜 당기면 화살이 아래로 떨어지고, 너무 오래 버티면 손이 떨려요. <b>바람 방향의 반대쪽</b>을 겨누세요. 처음 두 발은 꽂힐 자리를 미리 보여 주고, 뒤로 갈수록 바람과 떨림이 세져요.' },
  duel: { name: '석양의 결투', icon: '🤠', unit: 'ms', order: 'asc', decimals: 0,
    tagline: '"쏴!" 신호에 누가 가장 빠를까',
    how: '"쏴!"가 뜨는 순간 <b>클릭</b>하거나 <b>스페이스</b>를 누르세요. 5판 평균 반응속도가 기록이에요. 신호 전에 누르면 부정출발로 그 판은 1000ms 처리돼요.' },
  roll: { name: '굴러라 공', icon: '⚽', unit: '초', order: 'desc', decimals: 1,
    tagline: '빨라지는 벽 사이로 끝까지 굴러가기',
    how: '<b>← →</b> (또는 A · D)로 공을 굴려 벽의 틈으로 빠져나가세요. 공은 미끄러지니 미리 움직이세요. 버틴 시간이 기록이에요.' },
  stairs: { name: '계단 레이스', icon: '🪜', unit: '계단', order: 'desc', decimals: 0,
    tagline: '다음 계단 방향만 맞히면 끝없이 위로',
    how: '다음 계단이 왼쪽이면 <b>←</b>, 오른쪽이면 <b>→</b> (또는 A · D). 틀리면 떨어지고, 위쪽 시간 막대가 다 닳아도 끝나요. 오를수록 막대가 빨리 닳아요.' },
  ticket: { name: '티켓팅 체험', icon: '🎫', unit: '초', order: 'asc', decimals: 2,
    tagline: '오픈 정각부터 결제 완료까지',
    how: '8시 정각에 <b>예매하기</b> → 대기열 → 보안문자 → 좌석 선택 → 결제까지. 정각부터 결제 완료까지 걸린 시간이 기록이에요. 좌석은 다른 사람들이 계속 채가요.' },
  tug: { name: '연타 줄다리기', icon: '💪', unit: '회', order: 'desc', decimals: 0,
    tagline: '10초 동안 스페이스 연타',
    how: '시작 신호 뒤 10초 동안 <b>스페이스</b>를 최대한 많이 누르세요(클릭도 돼요). 누른 횟수가 기록이에요. 꾹 누르고 있기는 1회로만 세요.' },
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
export function initGamePage(id) {
  const g = GAMES[id];
  document.title = `${g.name} · 액티비티룸`;
  document.getElementById('top').innerHTML = `
    <a class="home" href="./${QS}">← 전체 게임</a>
    <h1><span>${g.icon}</span> ${g.name}${DEV ? ' <small class="dev">연습 모드</small>' : ''}</h1>
    <button class="nick-chip" type="button"></button>`;
  document.getElementById('how').innerHTML = `<h3>방법</h3><p>${g.how}</p>`;
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
