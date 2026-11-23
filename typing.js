import { initGamePage, showResult, setupCanvas, loadBoard, IS_MOBILE, esc } from './common.js?v=53';

initGamePage('typing');

const $ = s => document.querySelector(s);
const stage = $('#stage'), screen = $('#screen'), boardEl = $('#board');
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const ENTER = IS_MOBILE ? '키보드의 이동(엔터)' : 'Enter';

/* ---------- 글감 (모두 저작권이 끝났거나 없는 글) ---------- */
// 속담
const PROVERBS = [
  '가는 말이 고와야 오는 말이 곱다', '낮말은 새가 듣고 밤말은 쥐가 듣는다', '세 살 버릇 여든까지 간다',
  '천 리 길도 한 걸음부터', '원숭이도 나무에서 떨어질 때가 있다', '발 없는 말이 천 리 간다',
  '백지장도 맞들면 낫다', '윗물이 맑아야 아랫물이 맑다', '가랑비에 옷 젖는 줄 모른다',
  '고래 싸움에 새우 등 터진다', '등잔 밑이 어둡다', '소 잃고 외양간 고친다',
  '호랑이도 제 말 하면 온다', '하늘이 무너져도 솟아날 구멍이 있다', '돌다리도 두들겨 보고 건너라',
  '될성부른 나무는 떡잎부터 알아본다', '아니 땐 굴뚝에 연기 날까', '콩 심은 데 콩 나고 팥 심은 데 팥 난다',
  '빈 수레가 요란하다', '꿩 먹고 알 먹는다', '구슬이 서 말이라도 꿰어야 보배',
  '말 한마디로 천 냥 빚을 갚는다', '배보다 배꼽이 더 크다', '벼는 익을수록 고개를 숙인다',
  '쇠뿔도 단김에 빼라', '열 번 찍어 안 넘어가는 나무 없다', '웃는 낯에 침 못 뱉는다',
  '서당 개 삼 년이면 풍월을 읊는다', '개구리 올챙이 적 생각 못 한다', '작은 고추가 더 맵다',
  '급할수록 돌아가라', '남의 떡이 더 커 보인다', '바늘 도둑이 소도둑 된다',
  '뛰는 놈 위에 나는 놈 있다', '물에 빠지면 지푸라기라도 잡는다', '티끌 모아 태산',
  '시작이 반이다', '누워서 떡 먹기', '우물 안 개구리', '가재는 게 편이다',
];
// 긴 글: 빈 줄은 연 구분(치지 않고 건너뜀)
const LONG = [
  { title: '애국가', author: '1절~4절', lines: [
    '동해 물과 백두산이 마르고 닳도록', '하느님이 보우하사 우리나라 만세', '무궁화 삼천리 화려 강산', '대한 사람 대한으로 길이 보전하세', '',
    '남산 위에 저 소나무 철갑을 두른 듯', '바람 서리 불변함은 우리 기상일세', '무궁화 삼천리 화려 강산', '대한 사람 대한으로 길이 보전하세', '',
    '가을 하늘 공활한데 높고 구름 없이', '밝은 달은 우리 가슴 일편단심일세', '무궁화 삼천리 화려 강산', '대한 사람 대한으로 길이 보전하세', '',
    '이 기상과 이 맘으로 충성을 다하여', '괴로우나 즐거우나 나라 사랑하세', '무궁화 삼천리 화려 강산', '대한 사람 대한으로 길이 보전하세'] },
  { title: '서시', author: '윤동주', lines: [
    '죽는 날까지 하늘을 우러러', '한 점 부끄럼이 없기를,', '잎새에 이는 바람에도', '나는 괴로워했다.',
    '별을 노래하는 마음으로', '모든 죽어 가는 것을 사랑해야지', '그리고 나한테 주어진 길을', '걸어가야겠다.', '',
    '오늘 밤에도 별이 바람에 스치운다.'] },
  { title: '진달래꽃', author: '김소월', lines: [
    '나 보기가 역겨워', '가실 때에는', '말없이 고이 보내 드리우리다', '',
    '영변에 약산', '진달래꽃', '아름 따다 가실 길에 뿌리우리다', '',
    '가시는 걸음걸음', '놓인 그 꽃을', '사뿐히 즈려밟고 가시옵소서', '',
    '나 보기가 역겨워', '가실 때에는', '죽어도 아니 눈물 흘리우리다'] },
  { title: '산유화', author: '김소월', lines: [
    '산에는 꽃 피네', '꽃이 피네', '갈 봄 여름 없이', '꽃이 피네', '',
    '산에', '산에', '피는 꽃은', '저만치 혼자서 피어 있네', '',
    '산에서 우는 작은 새요', '꽃이 좋아', '산에서', '사노라네', '',
    '산에는 꽃 지네', '꽃이 지네', '갈 봄 여름 없이', '꽃이 지네'] },
  { title: '엄마야 누나야', author: '김소월', lines: [
    '엄마야 누나야 강변 살자', '뜰에는 반짝이는 금모래 빛', '뒷문 밖에는 갈잎의 노래', '엄마야 누나야 강변 살자'] },
  { title: '새로운 길', author: '윤동주', lines: [
    '내를 건너서 숲으로', '고개를 넘어서 마을로', '',
    '어제도 가고 오늘도 갈', '나의 길 새로운 길', '',
    '민들레가 피고 까치가 날고', '아가씨가 지나고 바람이 일고', '',
    '나의 길은 언제나 새로운 길', '오늘도 내일도', '',
    '내를 건너서 숲으로', '고개를 넘어서 마을로'] },
  { title: '광야', author: '이육사', lines: [
    '까마득한 날에', '하늘이 처음 열리고', '어데 닭 우는 소리 들렸으랴', '',
    '모든 산맥들이', '바다를 연모해 휘달릴 때도', '차마 이곳을 범하던 못하였으리라', '',
    '끊임없는 광음을', '부지런한 계절이 피어선 지고', '큰 강물이 비로소 길을 열었다', '',
    '지금 눈 내리고', '매화 향기 홀로 아득하니', '내 여기 가난한 노래의 씨를 뿌려라', '',
    '다시 천고의 뒤에', '백마 타고 오는 초인이 있어', '이 광야에서 목놓아 부르게 하리라'] },
];
// 운석 요격 단어
const WORDS = [
  '우주', '은하수', '별빛', '행성', '위성', '혜성', '운석', '궤도', '로켓', '착륙선', '망원경', '블랙홀', '성운', '북극성',
  '견우', '직녀', '화성', '목성', '토성', '금성', '수성', '해왕성', '천왕성', '명왕성', '지구', '달빛', '초승달', '보름달',
  '일식', '월식', '우주복', '산소', '무중력', '정거장', '탐사선', '신호', '레이더', '안테나', '광선', '레이저', '방어막',
  '엔진', '연료', '조종석', '비행사', '외계인', '비행접시', '별자리', '오리온', '은하', '성단', '중력', '광년', '빅뱅',
  '태양풍', '오로라', '관제탑', '발사', '귀환', '교신', '좌표', '항로', '워프', '함대', '사령관', '기지', '나침반',
  '별똥별', '우주선', '소행성', '대기권', '성층권', '진공', '픽셀', '오락실', '조이스틱', '동전', '점수판', '플로피',
  '카세트', '브라운관', '모뎀', '삐삐', '게임기', '전자파', '로봇', '레트로', '네온', '홀로그램', '카운트다운',
];

/* ---------- 타수 세기 ---------- */
// 두벌식 기준으로 자판을 누르는 횟수. 쌍자음 · 겹모음 · 겹받침은 2타
const CHO2 = new Set([1, 4, 8, 10, 13]);                       // ㄲ ㄸ ㅃ ㅆ ㅉ
const JUNG2 = new Set([3, 7, 9, 10, 11, 14, 15, 16, 19]);      // ㅒ ㅖ ㅘ ㅙ ㅚ ㅝ ㅞ ㅟ ㅢ
const JONG2 = new Set([2, 3, 5, 6, 9, 10, 11, 12, 13, 14, 15, 18, 20]);
function strokes(ch) {
  const c = ch.charCodeAt(0) - 0xAC00;
  if (c < 0 || c > 11171) return 1;
  const cho = Math.floor(c / 588), jung = Math.floor((c % 588) / 28), jong = c % 28;
  return (CHO2.has(cho) ? 2 : 1) + (JUNG2.has(jung) ? 2 : 1) + (jong ? (JONG2.has(jong) ? 2 : 1) : 0);
}
const strokesOf = s => [...s].reduce((a, ch) => a + strokes(ch), 0);

/* ---------- 랭킹 탭 ---------- */
function showBoard(id) {
  document.querySelectorAll('.board-tabs button').forEach(b => b.classList.toggle('on', b.dataset.id === id));
  loadBoard(id, boardEl);
}
document.querySelectorAll('.board-tabs button').forEach(b => b.addEventListener('click', () => showBoard(b.dataset.id)));

/* ---------- 배경: 흐르는 별 + 픽셀 행성 ---------- */
const bg = $('#bg');
let bctx = null, bw = 0, bh = 0;
const stars = Array.from({ length: 110 }, () => ({ x: Math.random(), y: Math.random(), z: .25 + Math.random() * .75, p: Math.random() * 6 }));
function sizeBg() {
  const r = stage.getBoundingClientRect(), d = Math.min(window.devicePixelRatio || 1, 2);
  bw = r.width; bh = r.height;
  bg.width = Math.round(bw * d); bg.height = Math.round(bh * d);
  bctx = bg.getContext('2d'); bctx.setTransform(d, 0, 0, d, 0, 0);
}
new ResizeObserver(sizeBg).observe(stage);
sizeBg();
function pixelBall(c, cx, cy, r, cols, px = 4) {
  for (let y = -r; y < r; y += px) for (let x = -r; x < r; x += px) {
    const d = Math.hypot(x + px / 2, y + px / 2);
    if (d > r) continue;
    const shade = (x + y) / (2 * r);                 // 왼쪽 위가 밝고 오른쪽 아래가 어둡다
    c.fillStyle = cols[shade < -.25 ? 0 : shade < .2 ? 1 : 2];
    c.fillRect(Math.round(cx + x), Math.round(cy + y), px, px);
  }
}
function drawBg(now) {
  if (bctx) {
    bctx.fillStyle = '#05060f'; bctx.fillRect(0, 0, bw, bh);
    for (const s of stars) {
      const y = ((s.y + now * .000012 * s.z) % 1) * bh, x = s.x * bw;
      const tw = .55 + .45 * Math.sin(now / 500 + s.p);
      bctx.fillStyle = s.z > .85 ? `rgba(255,226,122,${tw})` : `rgba(200,225,255,${tw * s.z})`;
      const sz = s.z > .7 ? 2 : 1;
      bctx.fillRect(Math.round(x), Math.round(y), sz, sz);
    }
    // 오른쪽 아래 고리 행성
    // 좁은 화면에서는 작게, 구석으로 비켜 그려 글자를 가리지 않게
    const pr = bw < 560 ? 20 : 32, px = bw - pr - 10, py = bh - pr - 6;
    pixelBall(bctx, px, py, pr, ['#ff9de6', '#c55ad8', '#6b2b95']);
    bctx.fillStyle = 'rgba(255,226,122,.8)';
    for (let x = -pr * 1.8; x < pr * 1.8; x += 4) { const y = Math.round(x * .22); if (Math.abs(x) > pr - 4 || y > 0) bctx.fillRect(Math.round(px + x), Math.round(py + y), 4, 3); }
  }
  requestAnimationFrame(drawBg);
}
requestAnimationFrame(drawBg);

/* ---------- 화면 전환 ---------- */
let cleanup = () => { };
function setScreen(html) { cleanup(); cleanup = () => { }; screen.innerHTML = html; }
// 판 아무 곳이나 누르면 입력칸에 커서를 둔다(휴대폰은 키보드가 올라온다)
stage.addEventListener('click', e => {
  if (e.target.closest('button, a, input')) return;
  const inp = $('#inp'); if (inp) inp.focus();
});
function focusInput(inp) {
  inp.focus();
  // 휴대폰 키보드가 올라오면 판 윗부분이 보이게 올린다
  if (IS_MOBILE) setTimeout(() => stage.scrollIntoView({ block: 'start', behavior: 'smooth' }), 350);
}
const INPUT = `<input id="inp" type="text" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" enterkeyhint="send" lang="ko">`;
function guardInput(inp) {
  // 붙여 넣기 · 끌어다 놓기 금지
  for (const ev of ['paste', 'drop']) inp.addEventListener(ev, e => e.preventDefault());
}
// 한글 조합 중인지 기록한다(마지막 글자가 아직 확정 전인지)
function trackComposing(inp) {
  const st = { on: false };
  inp.addEventListener('compositionstart', () => { st.on = true; });
  inp.addEventListener('compositionend', () => { st.on = false; });
  return st;
}
// 엔터: 한글 조합 중이어도 바로 넘긴다. 입력칸 값에는 조합 중인 마지막 글자도 들어 있으니 그대로 쓰고,
// 남은 조합은 입력칸을 잠깐 놓았다 다시 잡아 끊는다(안 그러면 다음 줄에 마지막 글자가 따라온다)
function bindEnter(inp, form, comp, onEnter) {
  let last = 0;
  const fire = () => {
    const now = performance.now();
    if (now - last < 250) return;   // 조합 중 엔터는 브라우저가 두 번 보내기도 한다
    last = now;
    const v = inp.value;
    if (comp.on) { inp.blur(); inp.value = ''; comp.on = false; inp.focus(); }
    else inp.value = '';
    onEnter(v);
  };
  inp.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.keyCode === 13) { e.preventDefault(); fire(); }
  });
  inp.addEventListener('beforeinput', e => {
    if (e.inputType === 'insertLineBreak' || e.inputType === 'insertParagraph') { e.preventDefault(); fire(); }
  });
  form.addEventListener('submit', e => { e.preventDefault(); fire(); });
}

/* ---------- 메뉴 ---------- */
function menu() {
  setScreen(`<div class="menu">
    <div class="logo"><span class="l1">SPACE</span><span class="l2">TYPER</span></div>
    <p class="sub">우주 타자 연습실 · 사령관님, 손가락으로 우주를 지켜 주세요</p>
    <div class="modes">
      <button class="mode" type="button" data-m="short"><b>🛰️ 짧은 글 연습</b><span>속담 10문장 · 평균 타수로 랭킹</span></button>
      <button class="mode" type="button" data-m="long"><b>📜 긴 글 연습</b><span>애국가 · 시 한 편을 끝까지 · 기록 없음</span></button>
      <button class="mode" type="button" data-m="meteor"><b>☄️ 운석 요격</b><span>단어를 쳐서 운석 격추 · 점수로 랭킹</span></button>
    </div>
    <p class="blink">▶ 모드를 고르세요</p>
  </div>`);
  screen.querySelectorAll('.mode').forEach(b => b.addEventListener('click', () => ({ short: startShort, long: chooseLong, meteor: startMeteor })[b.dataset.m]()));
}

/* ---------- 타자 연습(짧은 글 · 긴 글 공통) ---------- */
function runTyping({ title, lines, onEnd }) {
  let idx = 0, t0 = 0;
  const tot = { strokes: 0, sec: 0, correct: 0, chars: 0, best: 0 };
  setScreen(`<div class="hud">
      <span class="ttl">${esc(title)}</span><span id="prog"></span>
      <span>타수 <b id="cpm">0</b></span><span>정확도 <b id="acc">100</b>%</span>
      <button class="pbtn" id="quit" type="button">메뉴</button>
    </div>
    <div class="bar"><i id="barFill"></i></div>
    <div class="lines"><div class="prev" id="prev"></div><div class="target" id="target"></div><div class="next" id="next"></div></div>
    <form class="prompt" id="form" autocomplete="off"><span class="caret">&gt;</span>${INPUT}</form>
    <p class="hint">위 글자를 그대로 치고 ${ENTER} → 다음 줄 · 틀린 글자는 타수에서 빠져요</p>`);
  const inp = $('#inp'), target = $('#target');
  guardInput(inp);
  const comp = trackComposing(inp);
  $('#quit').addEventListener('click', menu);

  // 지금 줄에서 맞게 친 글자 수 · 타수.
  // 조합 중인 마지막 글자는 정답과 같으면 맞은 것으로 치고, 아직 다르면(쓰는 중) 세지 않는다
  function cur(v = inp.value, final = false) {
    const t = lines[idx] || '';
    let correct = 0, st = 0, typed = 0;
    for (let i = 0; i < Math.min(v.length, t.length); i++) {
      const pendingChar = !final && comp.on && i === v.length - 1;
      if (v[i] === t[i]) { correct++; st += strokes(t[i]); typed++; }
      else if (!pendingChar) typed++;
    }
    return { correct, st, typed, sec: t0 ? (performance.now() - t0) / 1000 : 0 };
  }
  function hud() {
    const c = cur(), sec = tot.sec + c.sec, st = tot.strokes + c.st;
    $('#cpm').textContent = sec > .8 ? Math.round(st / sec * 60) : 0;
    const chars = tot.chars + c.typed;
    $('#acc').textContent = chars ? Math.round((tot.correct + c.correct) / chars * 100) : 100;
  }
  function paint() {
    const v = inp.value, t = lines[idx];
    let h = '';
    for (let i = 0; i < t.length; i++) {
      let cl = '';
      if (i < v.length) cl = v[i] === t[i] ? 'ok' : comp.on && i === v.length - 1 ? 'typing' : 'bad';
      else if (i === v.length) cl = 'cur';
      h += `<span class="${cl}">${esc(t[i])}</span>`;
    }
    if (v.length > t.length) h += `<span class="bad">${esc(v.slice(t.length))}</span>`;
    target.innerHTML = h;
  }
  function showLine() {
    $('#prev').textContent = lines[idx - 1] || '';
    $('#next').textContent = lines[idx + 1] || '';
    $('#prog').textContent = `${idx + 1} / ${lines.length}`;
    $('#barFill').style.width = `${idx / lines.length * 100}%`;
    paint();
  }
  function commit(v) {
    if (!v.trim()) { paint(); return; }
    const t = lines[idx], c = cur(v, true), sec = Math.max(.5, c.sec);
    tot.strokes += c.st; tot.sec += sec; tot.correct += c.correct; tot.chars += Math.max(t.length, v.length);
    tot.best = Math.max(tot.best, Math.round(c.st / sec * 60));
    t0 = 0; idx++;
    if (idx >= lines.length) {
      clearInterval(timer);
      $('#barFill').style.width = '100%';
      onEnd({ cpm: Math.round(tot.strokes / tot.sec * 60), acc: Math.round(tot.correct / tot.chars * 100), best: tot.best, sec: tot.sec });
      return;
    }
    showLine(); hud();
  }
  inp.addEventListener('compositionend', () => { if (idx < lines.length) paint(); });
  inp.addEventListener('input', () => { if (idx >= lines.length) return; if (!t0 && inp.value) t0 = performance.now(); paint(); hud(); });
  bindEnter(inp, $('#form'), comp, commit);
  const timer = setInterval(hud, 250);
  cleanup = () => clearInterval(timer);
  showLine();
  focusInput(inp);
}

function startShort() {
  showBoard('typing');
  const lines = shuffle([...PROVERBS]).slice(0, 10);
  runTyping({ title: '🛰️ 짧은 글 연습', lines, onEnd: r => {
    const fail = r.acc < 80;
    menu();
    showResult('typing', r.cpm, {
      detail: fail ? `${r.cpm}타 · 정확도 ${r.acc}% — 정확도 80% 이상이어야 기록돼요` : `정확도 ${r.acc}% · 가장 빠른 문장 ${r.best}타`,
      fail, onRetry: startShort,
    });
  } });
}

function chooseLong() {
  setScreen(`<div class="hud"><span class="ttl">📜 긴 글 연습 · 글 고르기</span><button class="pbtn" id="quit" type="button">메뉴</button></div>
    <div class="picks">${LONG.map((t, i) => `<button class="mode" type="button" data-i="${i}"><b>${esc(t.title)}</b><span>${esc(t.author)} · ${t.lines.filter(Boolean).length}줄</span></button>`).join('')}</div>`);
  $('#quit').addEventListener('click', menu);
  screen.querySelectorAll('.picks .mode').forEach(b => b.addEventListener('click', () => startLong(+b.dataset.i)));
}
function startLong(i) {
  const t = LONG[i];
  runTyping({ title: `📜 ${t.title}`, lines: t.lines.filter(Boolean), onEnd: r => {
    const m = Math.floor(r.sec / 60), s = Math.round(r.sec % 60);
    setScreen(`<div class="menu">
      <div class="logo small"><span class="l1">CLEAR!</span></div>
      <p class="sub">${esc(t.title)} · ${esc(t.author)}</p>
      <div class="stats">
        <div><span>평균 타수</span><b>${r.cpm}타</b></div>
        <div><span>정확도</span><b>${r.acc}%</b></div>
        <div><span>걸린 시간</span><b>${m ? `${m}분 ` : ''}${s}초</b></div>
      </div>
      <p class="hint">긴 글 연습은 랭킹에 남지 않아요</p>
      <div class="row">
        <button class="pbtn" id="again" type="button">다시 치기</button>
        <button class="pbtn" id="other" type="button">다른 글</button>
        <button class="pbtn" id="quit" type="button">메뉴</button>
      </div>
    </div>`);
    $('#again').addEventListener('click', () => startLong(i));
    $('#other').addEventListener('click', chooseLong);
    $('#quit').addEventListener('click', menu);
  } });
}

/* ---------- 운석 요격 ---------- */
const MW = 480, MH = 340, GROUND = MH - 30;
const SHIP = ['....c....', '...cwc...', '...ccc...', '..ccccc..', '.mcccccm.', 'mmcmmmcmm', 'm..m.m..m'];
const SHIP_COL = { c: '#5ef1ff', w: '#ffffff', m: '#ff5cf0' };
const rockCache = {};
function rockSprite(r, gold) {
  const k = r + (gold ? 'g' : '');
  if (rockCache[k]) return rockCache[k];
  const c = document.createElement('canvas'); c.width = c.height = r * 2 + 4;
  pixelBall(c.getContext('2d'), r + 2, r + 2, r, gold ? ['#fff3b0', '#ffc83d', '#c27c0e'] : ['#c9b8ff', '#8a74d6', '#4b3a8f'], 3);
  return (rockCache[k] = c);
}

function startMeteor() {
  showBoard('typing-meteor');
  setScreen(`<div class="hud">
      <span class="ttl">☄️ 운석 요격</span>
      <span>점수 <b id="msc">0</b></span><span>레벨 <b id="mlv">1</b></span><span>방어막 <b id="msh"></b></span>
      <button class="pbtn" id="quit" type="button">메뉴</button>
    </div>
    <canvas id="mcv"></canvas>
    <form class="prompt" id="form" autocomplete="off"><span class="caret">&gt;</span>${INPUT}</form>
    <p class="hint">운석에 적힌 단어를 치고 ${IS_MOBILE ? '띄어쓰기나 이동(엔터)' : '스페이스나 Enter'} → 발사</p>`);
  const cv = $('#mcv'), ctx = setupCanvas(cv, MW, MH), inp = $('#inp'), form = $('#form');
  ctx.imageSmoothingEnabled = false;
  guardInput(inp);
  $('#quit').addEventListener('click', menu);

  const field = Array.from({ length: 50 }, () => ({ x: Math.random() * MW, y: Math.random() * GROUND, z: .3 + Math.random() * .7 }));
  let rocks = [], fx = [], shots = [], texts = [], bag = [];
  let score = 0, kills = 0, level = 1, shield = 3, spawnT = .6, flash = 0, alive = true, raf = 0, last = performance.now();
  const nextWord = () => { if (!bag.length) bag = shuffle([...WORDS]); return bag.pop(); };

  function hud() {
    $('#msc').textContent = score.toLocaleString('ko-KR');
    $('#mlv').textContent = level;
    $('#msh').textContent = '■'.repeat(shield) + '□'.repeat(Math.max(0, 3 - shield));
  }
  function spawn() {
    const word = nextWord(), gold = shield < 5 && Math.random() < .08;
    ctx.font = '16px Galmuri11, monospace';
    const tw = ctx.measureText(word).width + 12;
    // 위쪽에 막 나온 운석과 단어가 겹치지 않는 자리를 몇 번 골라 본다
    let x = 0;
    for (let k = 0; k < 8; k++) {
      x = tw / 2 + 6 + Math.random() * (MW - tw - 12);
      if (!rocks.some(r => r.y < 70 && Math.abs(r.x - x) < (r.tw + tw) / 2 + 8)) break;
    }
    rocks.push({ word, x, y: -14, r: 9 + Math.floor(Math.random() * 3) * 3, vy: (15 + level * 4.5) * (.85 + Math.random() * .3), gold, tw, spin: Math.random() * 6 });
  }
  function boom(x, y, col, n = 14) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, s = 40 + Math.random() * 90;
      fx.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, t: 0, life: .5 + Math.random() * .4, col });
    }
  }
  function fire(raw) {
    const w = raw.trim();
    if (!w || !alive) return;
    const hit = rocks.filter(r => r.word === w).sort((a, b) => b.y - a.y)[0];
    if (!hit) {
      form.classList.remove('shake'); void form.offsetWidth; form.classList.add('shake');
      texts.push({ x: MW / 2, y: GROUND - 40, s: 'MISS', col: '#ff6b8b', t: 0 });
      return;
    }
    rocks.splice(rocks.indexOf(hit), 1);
    kills++;
    const pts = strokesOf(w) * level;
    score += pts;
    shots.push({ x: hit.x, y: hit.y, t: 0 });
    boom(hit.x, hit.y, hit.gold ? '#ffc83d' : '#b9a6ff');
    texts.push({ x: hit.x, y: hit.y - 10, s: `+${pts}`, col: '#7dff8a', t: 0 });
    if (hit.gold) { shield = Math.min(5, shield + 1); texts.push({ x: hit.x, y: hit.y + 8, s: '방어막 +1', col: '#ffe27a', t: 0 }); }
    level = 1 + Math.floor(kills / 8);
    hud();
  }
  function over() {
    alive = false;
    boom(MW / 2, GROUND - 14, '#ff5cf0', 40);
    const t0 = performance.now();
    const tail = now => { draw(now, (now - t0) / 1000); if (now - t0 < 900) raf = requestAnimationFrame(tail); };
    raf = requestAnimationFrame(tail);
    setTimeout(() => {
      if (!document.contains(cv)) return;   // 그사이 메뉴로 나갔으면 결과를 띄우지 않는다
      cancelAnimationFrame(raf);
      menu();
      showResult('typing-meteor', score, { detail: `운석 ${kills}개 격추 · 레벨 ${level}`, onRetry: startMeteor });
    }, 1000);
  }
  function update(dt) {
    spawnT -= dt;
    if (spawnT <= 0) { spawn(); spawnT = Math.max(.7, 2.5 - level * .17) * (.8 + Math.random() * .4); }
    for (const r of [...rocks]) {
      r.y += r.vy * dt;
      if (r.y + r.r >= GROUND) {
        rocks.splice(rocks.indexOf(r), 1);
        shield--; flash = 1;
        boom(r.x, GROUND, '#ff6b8b', 18);
        hud();
        if (shield <= 0) { over(); return; }
      }
    }
  }
  function draw(now, endT = 0) {
    const dt = 1 / 60;
    ctx.fillStyle = '#060818'; ctx.fillRect(0, 0, MW, MH);
    for (const s of field) {
      s.y += s.z * 18 * dt; if (s.y > GROUND) { s.y = 0; s.x = Math.random() * MW; }
      ctx.fillStyle = `rgba(200,225,255,${s.z * .8})`; ctx.fillRect(Math.round(s.x), Math.round(s.y), s.z > .75 ? 2 : 1, s.z > .75 ? 2 : 1);
    }
    // 땅 · 기지
    ctx.fillStyle = '#1b1240'; ctx.fillRect(0, GROUND, MW, MH - GROUND);
    ctx.fillStyle = '#7a5cff'; ctx.fillRect(0, GROUND, MW, 2);
    ctx.fillStyle = '#2c1d63';
    for (let x = 8; x < MW; x += 46) ctx.fillRect(x, GROUND + 10 + (x % 3) * 4, 14, 4);
    // 방어막(남은 칸만큼 밝게)
    if (shield > 0 && alive) {
      ctx.fillStyle = `rgba(94,241,255,${.08 + shield * .04})`;
      ctx.fillRect(0, GROUND - 6, MW, 4);
    }
    // 포대
    const sx = MW / 2 - SHIP[0].length * 2, sy = GROUND - SHIP.length * 4 - 2;
    if (alive || endT < .15) SHIP.forEach((row, y) => [...row].forEach((ch, x) => { if (SHIP_COL[ch]) { ctx.fillStyle = SHIP_COL[ch]; ctx.fillRect(sx + x * 4, sy + y * 4, 4, 4); } }));
    // 레이저
    for (const s of shots) {
      const a = 1 - s.t / .18;
      ctx.strokeStyle = `rgba(94,241,255,${a})`; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(MW / 2, sy); ctx.lineTo(s.x, s.y); ctx.stroke();
      ctx.strokeStyle = `rgba(255,255,255,${a})`; ctx.lineWidth = 1.5; ctx.stroke();
    }
    // 운석 + 단어. 지금 치고 있는 글자와 앞부분이 같으면 그만큼 하늘색으로
    // 조합 중인 마지막 글자까지 맞으면 그만큼, 아직 쓰는 중이면 그 앞까지 하늘색으로
    const v = inp.value.trim(), vShort = comp.on ? v.slice(0, -1) : v;
    ctx.font = '16px Galmuri11, monospace'; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
    for (const r of rocks) {
      const img = rockSprite(r.r, r.gold);
      ctx.drawImage(img, Math.round(r.x - img.width / 2), Math.round(r.y - img.height / 2));
      // 꼬리
      ctx.fillStyle = r.gold ? 'rgba(255,200,61,.35)' : 'rgba(185,166,255,.3)';
      for (let i = 1; i <= 3; i++) ctx.fillRect(Math.round(r.x - 2), Math.round(r.y - r.r - i * 6), 4, 3);
      const m = v && r.word.startsWith(v) ? v.length : vShort && r.word.startsWith(vShort) ? vShort.length : 0;
      const bx = Math.round(r.x - r.tw / 2), by = Math.round(r.y + r.r + 4);
      ctx.fillStyle = m ? 'rgba(10,40,60,.92)' : 'rgba(5,6,20,.82)'; ctx.fillRect(bx, by, Math.round(r.tw), 22);
      ctx.strokeStyle = r.gold ? '#ffc83d' : m ? '#5ef1ff' : '#3b4fa8'; ctx.lineWidth = 1; ctx.strokeRect(bx + .5, by + .5, Math.round(r.tw) - 1, 21);
      const head = r.word.slice(0, m), rest = r.word.slice(m);
      ctx.fillStyle = '#5ef1ff'; ctx.fillText(head, bx + 6, by + 11.5);
      ctx.fillStyle = r.gold ? '#ffe27a' : '#e8ecff'; ctx.fillText(rest, bx + 6 + ctx.measureText(head).width, by + 11.5);
    }
    // 파편
    for (const p of fx) { ctx.fillStyle = p.col; ctx.globalAlpha = Math.max(0, 1 - p.t / p.life); ctx.fillRect(Math.round(p.x), Math.round(p.y), 3, 3); }
    ctx.globalAlpha = 1;
    // 떠오르는 글자
    ctx.textAlign = 'center';
    for (const t of texts) { ctx.globalAlpha = Math.max(0, 1 - t.t / .8); ctx.fillStyle = t.col; ctx.fillText(t.s, t.x, t.y - t.t * 30); }
    ctx.globalAlpha = 1;
    if (flash > 0) { ctx.fillStyle = `rgba(255,60,100,${flash * .35})`; ctx.fillRect(0, 0, MW, MH); }
    if (!alive) {
      ctx.font = '28px Galmuri11, monospace'; ctx.textAlign = 'center';
      ctx.fillStyle = '#ff5cf0'; ctx.fillText('GAME OVER', MW / 2 + 2, MH / 2 + 2);
      ctx.fillStyle = '#ffe27a'; ctx.fillText('GAME OVER', MW / 2, MH / 2);
    }
    // 효과 시간 흐르기
    for (const s of shots) s.t += dt;
    shots = shots.filter(s => s.t < .18);
    for (const p of fx) { p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 120 * dt; }
    fx = fx.filter(p => p.t < p.life);
    for (const t of texts) t.t += dt;
    texts = texts.filter(t => t.t < .8);
    flash = Math.max(0, flash - dt * 2.5);
  }
  function loop(now) {
    if (!alive) return;
    const dt = Math.min(.05, (now - last) / 1000); last = now;
    update(dt);
    if (alive) draw(now);
    if (alive) raf = requestAnimationFrame(loop);
  }

  const comp = trackComposing(inp);
  // 띄어쓰기를 치면 그 앞 단어로 발사
  inp.addEventListener('input', () => {
    if (/\s/.test(inp.value)) { const w = inp.value.split(/\s/)[0]; inp.value = ''; fire(w); }
  });
  // 엔터도 발사(한글 조합 중이어도 바로)
  bindEnter(inp, form, comp, fire);

  cleanup = () => { alive = false; cancelAnimationFrame(raf); };
  hud();
  focusInput(inp);
  document.fonts && document.fonts.load('16px Galmuri11').catch(() => { });
  raf = requestAnimationFrame(t => { last = t; loop(t); });
}

menu();
