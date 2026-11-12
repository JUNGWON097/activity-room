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
    tagline: '바람을 읽고 6발로 66점에 도전',
    how: {
      goal: '과녁 한가운데를 맞혀 6발 합계 점수를 최대한 높이세요. 한 발은 최대 10점이고, 한가운데 작은 원 X에 맞히면 보너스 1점을 더해 11점이에요. 6발 모두 X면 66점이에요.',
      keys: [['마우스 이동', '조준점 움직이기'], ['마우스 꾹 누르기', '활시위 당기기 — 아래 막대가 찰 때까지'], ['손 떼기', '발사']],
      score: '6발 합계 점수(최대 66점, X 하나당 보너스 1점 포함) · 높을수록 1등',
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
      keys: [['마우스', '공이 커서를 따라가요 — 좌우는 물론 앞뒤로도']],
      score: '버틴 시간(초) · 길수록 1등',
      tips: ['커서를 <b>위로</b> 올리면 공이 앞으로 나가요. 다음 틈 쪽으로 미리 가서 기다리세요.', '점선 동그라미가 공이 따라갈 자리예요.', '시간이 지날수록 벽이 빨라지고 틈이 좁아져요.', '<b>분홍 벽</b>은 좌우로 움직여요. 틈이 지나가는 타이밍을 노리세요.'],
    } },
  stairs: { name: '계단 레이스', icon: STAIRS_ICON, unit: '계단', order: 'desc', decimals: 0,
    tagline: '다음 계단 방향만 맞히면 끝없이 위로',
    how: {
      goal: '지그재그로 이어진 계단을 한 칸씩 올라 최대한 높이 가세요.',
      keys: [['← / A', '다음 계단이 왼쪽 위일 때'], ['→ / D', '다음 계단이 오른쪽 위일 때'], ['화면 왼쪽·오른쪽 클릭', '키보드 대신 써도 돼요']],
      score: '오른 계단 수 · 많을수록 1등',
      tips: ['반짝이는 <b>노란 계단</b>이 다음 칸이에요. 그쪽 방향을 누르세요.', '방향을 틀리면 발을 헛디뎌 떨어져요.', '위쪽 시간 막대는 계속 줄고, 한 칸 오를 때마다 조금 채워져요. 오를수록 빨리 줄어요.'],
    } },
  // 시간제 · 1회차 방식 기록과 섞이지 않게 점수제는 따로 보관한다
  ticket: { name: '티켓팅 체험', icon: '🎫', unit: '점', order: 'desc', decimals: 0, store: 'ticket-pts',
    tagline: '앞자리를 빨리 잡을수록 고득점, 3회차 예매',
    how: {
      goal: '3회차 공연을 차례로 예매하세요. 대형 아레나에서 시작해 점점 좌석이 적은 공연장으로 바뀌어요. <b>앞자리를 빨리</b> 잡을수록 점수가 높아요.',
      keys: [['클릭', '예매하기 · 좌석 · 결제 버튼'], ['키보드', '보안문자 입력 후 Enter']],
      score: '3회차 점수 합계 · 높을수록 1등. 회차 점수 = 좌석 점수(맨 앞줄 1,000점 → 맨 뒷줄 200점, 가운데일수록 최대 +100점) + 속도 점수(최대 600점, 오픈부터 결제 완료까지 1초마다 15점씩 깎여요). 매진되면 그 회차는 0점이에요.',
      tips: ['오픈 전에 누르면 "오픈 전입니다"만 떠요. 정각에 버튼이 보라색으로 바뀌는 순간 누르세요. 늦을수록 대기 순서가 뒤로 밀려요.', '다른 사람들은 <b>앞줄 · 가운데부터</b> 채가요. 보안문자를 치는 동안에도 계속 팔려요.', '앞자리일수록 "이미 선택된 좌석입니다"가 자주 떠요. 앞자리를 노릴지, 조금 뒤를 빨리 잡을지 골라야 해요.', '좌석을 고르면 오른쪽에 그 좌석 점수가 보여요.', '결제는 결제 수단 선택 + 동의 체크까지 해야 넘어가요.'],
    } },
  tug: { name: '연타 줄다리기', icon: '🐱', unit: '회', order: 'desc', decimals: 0,
    tagline: '10초 동안 스페이스 연타',
    how: {
      goal: '고양이 팀이 되어 곰돌이 팀과 줄다리기! 10초 동안 최대한 많이 눌러 줄을 끌어오세요.',
      keys: [['스페이스', '한 번 누를 때마다 1회'], ['클릭', '마우스로 눌러도 1회']],
      score: '10초 동안 누른 횟수 · 많을수록 1등',
      tips: ['3 · 2 · 1 뒤에 시작해요. 카운트 중에 누른 건 안 세요.', '꾹 누르고 있기는 1회로만 세요. 떼고 다시 눌러야 해요.', '곰돌이 팀은 초당 6회쯤 당겨요. 10초 동안 60회를 넘기면 이겨요.'],
    } },
  snake: { name: '스네이크', icon: '🐍', unit: '개', order: 'desc', decimals: 0,
    tagline: '과일을 먹을수록 길어지고 빨라지는 뱀',
    how: {
      goal: '뱀을 움직여 과일을 최대한 많이 먹으세요. 과일을 먹을 때마다 몸이 한 칸 길어지고 조금씩 빨라져요. 벽이나 내 몸에 부딪히면 끝나요.',
      keys: [['← ↑ → ↓ / WASD', '방향 바꾸기'], ['화면 클릭', '뱀 머리 기준으로 클릭한 쪽으로 꺾기']],
      score: '먹은 과일 수 · 많을수록 1등',
      tips: ['바로 뒤로는 돌 수 없어요. 반대 방향을 누르면 무시돼요.', '키를 빠르게 두 번 누르면 차례로 꺾여요. 좁은 곳에서 U턴할 때 쓰세요.', '몸이 길어지면 가운데보다 <b>벽을 따라</b> 크게 도는 게 안전해요.'],
    } },
  drop: { name: '블록 낙하', icon: '🧱', unit: '줄', order: 'desc', decimals: 0,
    tagline: '떨어지는 블록으로 가로줄을 채워 지우기',
    how: {
      goal: '위에서 떨어지는 블록을 돌리고 옮겨 가로줄을 빈틈없이 채우세요. 꽉 찬 줄은 사라져요. 블록이 맨 위까지 쌓이면 끝나요.',
      keys: [['← →', '옮기기'], ['↑ / X', '돌리기 (Z는 반대로)'], ['↓', '빨리 내리기'], ['스페이스', '바로 떨어뜨리기']],
      score: '지운 줄 수 · 많을수록 1등',
      tips: ['10줄을 지울 때마다 레벨이 오르고 블록이 빨라져요.', '바닥에 보이는 테두리가 블록이 떨어질 자리예요.', '오른쪽 "다음"을 보고 그 블록이 들어갈 자리를 비워 두세요.', '바닥에 닿아도 잠깐은 옮기거나 돌릴 수 있어요.'],
    } },
  blast: { name: '컬러블록', icon: '🟪', unit: '점', order: 'desc', decimals: 0,
    tagline: '블록을 놓아 가로·세로 한 줄을 채우면 팡!',
    how: {
      goal: '아래에 나오는 블록 3개를 8×8 판에 끌어다 놓으세요. 가로줄이나 세로줄이 꽉 차면 팡 터지며 사라져요. 남은 블록을 놓을 곳이 없으면 끝나요.',
      keys: [['마우스 끌기', '블록을 집어 판 위에 놓기']],
      score: '점수 · 높을수록 1등. 놓은 칸마다 1점, 한 번에 n줄을 지우면 n×n×10점, 연달아 지우면 콤보 보너스가 붙어요.',
      tips: ['블록은 돌릴 수 없어요.', '3개를 다 놓아야 새 블록 3개가 나와요. 큰 블록이 들어갈 자리를 남겨 두세요.', '놓을 곳이 없는 블록은 회색으로 바뀌어요.', '가로와 세로를 <b>한 번에 같이</b> 지우면 점수가 크게 올라요.'],
    } },
  merge: { name: '과일 머지', icon: '🍉', unit: '점', order: 'desc', decimals: 0,
    tagline: '같은 과일끼리 부딪혀 수박까지 키우기',
    how: {
      goal: '과일을 상자에 떨어뜨리세요. 같은 과일 두 개가 닿으면 합쳐져 다음 과일이 돼요. 🍒→🍓→🍇→🍋→🍊→🍎→🍐→🍑→🍍→🍈→🍉. 과일이 위쪽 점선을 넘은 채 2초가 지나면 끝나요.',
      keys: [['마우스 이동', '떨어뜨릴 위치 고르기'], ['클릭 / 스페이스', '떨어뜨리기'], ['← →', '키보드로 위치 옮기기']],
      score: '점수 · 높을수록 1등. 큰 과일로 합칠수록 점수가 커요. 수박 두 개가 합쳐지면 100점.',
      tips: ['오른쪽 위에서 다음 과일을 미리 볼 수 있어요.', '큰 과일은 한쪽 구석에 모아 두면 작은 과일이 굴러다닐 자리가 생겨요.', '합쳐진 과일이 옆 과일과 또 닿으면 연달아 합쳐져요.', '점선이 빨갛게 깜빡이면 곧 끝나요.'],
    } },
  omok: { name: '오목', icon: '⚫', unit: '수', order: 'asc', decimals: 0,
    tagline: '컴퓨터를 상대로 적은 수에 이기기',
    how: {
      goal: '흑돌로 컴퓨터(백돌)와 오목을 둬요. 가로·세로·대각선으로 5개를 먼저 이으면 이겨요. 적은 수로 이길수록 좋은 기록이에요.',
      keys: [['클릭', '돌 놓기']],
      score: '이길 때까지 놓은 흑돌 수 · 적을수록 1등. 지거나 비기면 기록이 남지 않아요.',
      tips: ['흑돌(나)이 먼저 둬요. 6개 이상 이어도 이겨요.', '<b>쌍삼(3·3) · 4·3</b>: 나는 둘 수 있지만 컴퓨터는 못 둬요. 한 수로 두 군데를 노리면 거의 이겨요.', '컴퓨터는 열린 3을 자주 놓치고, 가끔은 4도 못 봐요. 양쪽이 열린 3을 만들어 보세요.', '두 군데를 한 번에 노리는 <b>4·3</b>을 만들면 컴퓨터가 다 막을 수 없어요.', '마지막에 놓인 돌에는 빨간 점이 찍혀요.'],
    } },
  tower: { name: '탑 쌓기', icon: '🏢', unit: '층', order: 'desc', decimals: 0,
    tagline: '움직이는 층을 딱 맞춰 하늘까지',
    how: {
      goal: '좌우로 움직이는 층을 알맞은 때에 떨어뜨려 탑을 높이 쌓으세요. 아래층에서 삐져나온 부분은 잘려 나가 탑이 점점 좁아져요. 완전히 빗나가면 끝나요.',
      keys: [['클릭 / 스페이스', '층 떨어뜨리기']],
      score: '쌓은 층 수 · 많을수록 1등',
      tips: ['아래층과 거의 똑같이 맞추면 <b>딱 맞아요!</b>가 뜨고 잘리지 않아요.', '딱 맞추기를 3번 넘게 이어 가면 층이 조금씩 다시 넓어져요.', '올라갈수록 층이 빨리 움직여요.', '층은 왼쪽과 오른쪽에서 번갈아 나와요.'],
    } },
  hue: { name: '다른 색 찾기', icon: '🎨', unit: '개', order: 'desc', decimals: 0,
    tagline: '30초 동안 색이 살짝 다른 한 칸 찾기',
    how: {
      goal: '같은 색 칸들 사이에 색이 살짝 다른 칸이 하나 있어요. 30초 동안 최대한 많이 찾아 누르세요.',
      keys: [['클릭', '색이 다른 칸 고르기']],
      score: '찾은 개수 · 많을수록 1등',
      tips: ['찾을수록 칸이 많아지고(최대 8×8) 색 차이가 줄어들어요.', '틀린 칸을 누르면 <b>3초</b>가 깎여요. 마구 누르면 손해예요.', '한 칸씩 보기보다 판 전체를 흐리게 보면 튀는 칸이 눈에 들어와요.', '시간이 끝나면 마지막 정답 칸을 보여 줘요.'],
    } },
  run: { name: '달려라 토끼', icon: '🐰', unit: 'm', order: 'desc', decimals: 0,
    tagline: '장애물을 피하고 모퉁이를 돌며 끝없이 달리기',
    how: {
      goal: '토끼가 하늘 위 길을 끝없이 달려요. 장애물을 피하고 길 끝 모퉁이에서 방향을 틀어 최대한 멀리 가세요. 장애물에 부딪히거나 길에서 떨어지면 끝나요.',
      keys: [['← → / A D', '옆 칸으로 옮기기 · 모퉁이에서 방향 틀기'], ['↑ / W / 스페이스', '점프'], ['↓ / S', '숙이기']],
      score: '달린 거리(m) · 멀수록 1등',
      tips: ['<b>분홍 기둥</b>은 옆 칸으로 피하세요. <b>노란 허들</b>과 <b>구멍</b>은 점프, <b>민트색 막대</b>는 숙여서 지나가요.', '길이 끝나기 전에 바닥에 <b>화살표</b>가 그려지고 "꺾어요"가 깜빡여요. 그때 화살표 방향을 누르면 모퉁이에서 돌아요. 화살표가 초록색이 되면 성공이에요.', '화살표가 두 개면 아무 쪽으로나 돌 수 있어요. 안 누르면 길 끝에서 떨어져요.', '달리는 속도는 그대로예요. 대신 멀리 갈수록 장애물이 촘촘해지고 종류가 늘어나요.', '점프 중에 아래를 누르면 바로 내려와 숙여요.'],
    } },
  horror: { name: '불 꺼진 학교', icon: '👻', unit: '초', order: 'asc', decimals: 1,
    tagline: '손전등 하나로 열쇠 3개 찾아 탈출하기',
    how: {
      goal: '캄캄한 학교에서 열쇠 3개를 찾아 비상구로 탈출하세요. 유령에게 닿으면 끝이에요.',
      keys: [['W A S D / 방향키', '움직이기'], ['마우스', '손전등 비추는 방향'], ['스페이스', '손전등 켜기 · 끄기'], ['E', '사물함에 숨기 · 나오기'], ['M', '소리 켜기 · 끄기']],
      score: '탈출까지 걸린 시간(초) · 짧을수록 1등. 잡히면 기록이 남지 않아요.',
      tips: ['유령은 <b>손전등 빛을 받는 동안 움직이지 못해요.</b> 빛이 닿지 않으면 다가와요.', '배터리가 닳으면 손전등이 꺼져요. 바닥의 🔋 건전지를 주우세요. 꺼 두면 배터리가 줄지 않아요.', '<b>사물함</b> 앞에서 E를 누르면 숨어요. 숨으면 유령이 나를 놓치고 다른 곳으로 가요. 나온 뒤에도 잠깐은 못 찾아요.', '사물함 안은 <b>무조건 안전</b>해요. 유령이 바로 옆에 있어도 못 잡고, 근처 유령은 사물함에서 멀어져요.', '숨는 동안 💨 숨이 줄어요(최대 3초). 다 떨어지면 저절로 튀어나오고, 숨이 어느 정도 돌아와야 다시 숨을 수 있어요.', '사물함에서 나온 직후 1초 동안은 잡히지 않아요.', '한 번 비춘 길은 어둡게 남아서 지도처럼 쌓여요.', '열쇠를 2개 모으면 유령이 하나 더 나타나요.', '심장 소리가 빨라지고 손전등이 깜빡이면 유령이 가까이 있다는 뜻이에요.', '열쇠 3개를 다 모으면 비상구의 초록 불빛이 멀리서도 보여요.', '⚠️ 갑자기 놀라는 장면과 소리가 있어요.'],
    } },
};
// 휴대폰에서도 할 수 있는 게임과 손가락 조작 안내(나머지는 휴대폰에서 숨긴다)
const TOUCH = {
  archery: [['손가락 꾹 누르기', '활시위 당기기 — 조준점은 손가락보다 조금 위'], ['누른 채 움직이기', '조준점 옮기기'], ['손 떼기', '발사']],
  duel: [['화면 탭', '쏘기']],
  roll: [['손가락 대고 움직이기', '공이 손가락 조금 위를 따라가요 (좌우 · 앞뒤)']],
  stairs: [['화면 왼쪽 탭', '다음 계단이 왼쪽 위일 때'], ['화면 오른쪽 탭', '다음 계단이 오른쪽 위일 때']],
  tug: [['화면 탭', '한 번 탭할 때마다 1회 (여러 손가락으로 번갈아 쳐도 돼요)']],
  blast: [['끌어서 놓기', '블록을 집어 판 위에 놓기']],
  merge: [['손가락 대고 좌우로', '떨어뜨릴 위치 고르기'], ['손 떼기', '떨어뜨리기']],
  omok: [['손가락 대기', '놓을 자리 미리 보기 (대고 끌면 옮겨져요)'], ['손 떼기', '돌 놓기']],
  tower: [['화면 탭', '층 떨어뜨리기']],
  hue: [['탭', '색이 다른 칸 고르기']],
  run: [['좌우로 밀기', '옆 칸으로 옮기기 · 모퉁이에서 방향 틀기'], ['위로 밀기', '점프'], ['아래로 밀기', '숙이기']],
};
for (const [id, keys] of Object.entries(TOUCH)) { GAMES[id].mobile = true; GAMES[id].touchKeys = keys; }
export const GAME_IDS = Object.keys(GAMES);
// 휴대폰 · 태블릿: 기본 입력이 손가락이거나(갤럭시 S펜처럼 펜이 있어도 기본은 손가락), 휴대기기 브라우저
const UA = navigator.userAgent || '';
export const IS_MOBILE = /Android|iPhone|iPad|iPod|Mobile/i.test(UA)
  || (/Macintosh/.test(UA) && navigator.maxTouchPoints > 1)   // 데스크톱처럼 보이는 아이패드
  || (window.matchMedia('(pointer: coarse)').matches && !window.matchMedia('(hover: hover)').matches);
export const VISIBLE_IDS = IS_MOBILE ? GAME_IDS.filter(id => GAMES[id].mobile) : GAME_IDS;

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
  const ref = doc(db, ROOT, GAMES[id].store || id, 'scores', nick);
  const snap = await getDoc(ref);
  const prev = snap.exists() ? snap.data().score : null;
  const isNew = typeof prev !== 'number' || isBetter(id, score, prev);
  const data = { nick, plays: increment(1), lastAt: Date.now() };
  if (isNew) Object.assign(data, { score, extra, at: Date.now() });
  await setDoc(ref, data, { merge: true });
  return { nick, isNew, prev, best: isNew ? score : prev };
}
export async function topScores(id, n = 20) {
  // 점수 순으로 넉넉히 받아 와서, 같은 점수면 먼저 달성한 사람(at이 이른 쪽)을 위로 올린다
  const q = query(collection(db, ROOT, GAMES[id].store || id, 'scores'), orderBy('score', GAMES[id].order), limit(Math.max(n * 10, 200)));
  const s = await getDocs(q);
  const rows = s.docs.map(d => d.data());
  rows.sort((a, b) => a.score === b.score ? (a.at ?? Infinity) - (b.at ?? Infinity) : (isBetter(id, a.score, b.score) ? -1 : 1));
  return rows.slice(0, n);
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
  // 휴대폰이면 손가락 조작 안내로 바꿔 보여 준다
  const keys = IS_MOBILE && g.touchKeys ? g.touchKeys : g.how.keys;
  document.getElementById('how').innerHTML = howHTML({ ...g.how, keys });
  // 시작 화면에도 조작법을 짧게 보여 준다
  document.querySelectorAll('.veil > div').forEach(v => v.insertAdjacentHTML('beforeend',
    `<ul class="veil-keys">${keys.map(([k, d]) => `<li><kbd>${k}</kbd> ${d}</li>`).join('')}</ul>`));
  // 휴대폰이면 '클릭 · 스페이스' 안내를 '탭'으로
  if (IS_MOBILE) document.querySelectorAll('.veil .t, .veil .s, #t, #s').forEach(el => {
    el.textContent = el.textContent.replace(/클릭하거나 스페이스로 시작|클릭해서 시작/, '탭해서 시작').replace('또는 스페이스 · ', '');
  });
  // 휴대폰에서 지원하지 않는 게임에 주소로 바로 들어온 경우
  if (IS_MOBILE && !g.mobile) {
    // 시작 화면 위에 한 겹 더 덮어 시작을 막는다
    const stage = document.querySelector('.stage');
    if (stage) stage.insertAdjacentHTML('beforeend', `<div class="veil" style="z-index:9;cursor:default"><div><div class="t">💻 PC에서 해 주세요</div><div class="s">이 게임은 키보드 · 마우스가 필요해요</div><p style="margin-top:16px"><a class="btn primary" href="./${QS}">휴대폰용 게임 보러 가기</a></p></div></div>`);
  }
  paintNickChips();
  // free: 점수 없이 노는 게임은 랭킹을 부르지 않는다
  if (g.free) { document.querySelector('.nick-chip').addEventListener('click', () => askNick()); return; }
  document.querySelector('.nick-chip').addEventListener('click', () => askNick().then(() => loadBoard(id, document.getElementById('board'))));
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
  // 저장이 실패하면 '다시 저장' 버튼을 띄워, 결과 창을 닫기 전까지 몇 번이든 다시 시도할 수 있게 한다
  const trySave = async () => {
    saveEl.className = 'save muted';
    saveEl.textContent = '기록 저장 중…';
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
      saveEl.classList.remove('muted');
      saveEl.innerHTML = '기록을 저장하지 못했어요. 인터넷 연결을 확인한 뒤 다시 눌러 주세요.<br><button class="btn primary resave" type="button" style="margin-top:10px">다시 저장</button>';
      saveEl.querySelector('.resave').addEventListener('click', trySave);
    }
  };
  trySave();
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
// 화면에 보이는 크기가 원래 비율과 달라도 맞도록 가로 · 세로를 따로 계산한다
export function canvasPoint(canvas, w, e) {
  const r = canvas.getBoundingClientRect();
  const h = w * canvas.height / canvas.width;
  return { x: (e.clientX - r.left) * w / r.width, y: (e.clientY - r.top) * h / r.height };
}
