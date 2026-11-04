import { initGamePage } from './common.js?v=14';

initGamePage('makeup');

/* ================= 고를 수 있는 것 ================= */
// [이름, 색] — 요즘 쓰는 핑크 · 코랄 · 피치 · 로즈 · 모브 · 브라운 계열만
const SKIN = [['핑크 아이보리', '#fbe3d8'], ['웜 아이보리', '#f8dcc8'], ['내추럴 베이지', '#efcdb2'], ['허니 베이지', '#deb08e'], ['탠', '#c08e6c']];
const CONTOUR = [['none', '없음'], ['soft', '은은하게'], ['strong', '또렷하게']];
const HIGHLIGHT = [['없음', null], ['샴페인', '#fff1d6'], ['핑크 펄', '#ffe1ec'], ['화이트 펄', '#ffffff']];
const BROW = [['straight', '일자'], ['soft', '부드러운'], ['arch', '아치']];
const BROW_COL = [['헤어색', null], ['소프트 브라운', '#8a6450'], ['다크 브라운', '#5a3e33'], ['그레이 브라운', '#6e625e']];
const SHADOW = [['없음', null], ['피치 핑크', '#f7a6a0'], ['코랄', '#f2876f'], ['로지 브라운', '#b9776c'], ['모브 핑크', '#c98a9e'], ['말린 장미', '#b0646f'], ['라벤더 핑크', '#d9a3cf'], ['샴페인 골드', '#e8c48f'], ['누드 베이지', '#d9ab92']];
const GLITTER = [['none', '없음'], ['champagne', '샴페인'], ['pink', '핑크']];
const LINER = [['none', '없음'], ['natural', '내추럴'], ['puppy', '강아지'], ['cat', '고양이']];
const LASH = [['natural', '내추럴'], ['volume', '풍성'], ['doll', '인형']];
const LENS = [['내추럴 브라운', '#8a5a3c'], ['초코', '#5a3a2c'], ['헤이즐', '#a87a45'], ['그레이', '#8d8d96'], ['블랙', '#2d2428'], ['핑크 브라운', '#a86a6a']];
const BLUSH = [['없음', null], ['베이비 핑크', '#ff9fb4'], ['코랄', '#ff8c78'], ['피치', '#ffab8f'], ['로즈', '#e9788f'], ['라벤더', '#d8a0d8'], ['말린 장미', '#c47a85']];
const BLUSH_LV = [['light', '연하게'], ['normal', '보통'], ['deep', '진하게']];
const LIP = [['누드 MLBB', '#d98a80'], ['코랄', '#f26b5b'], ['피치', '#f58f78'], ['로즈 핑크', '#e2607e'], ['체리 레드', '#d42a45'], ['말린 장미', '#b8586a'], ['베리', '#a13457'], ['베이비 핑크', '#f590a8']];
const LIP_FIN = [['glossy', '촉촉 글로시'], ['blur', '그라데이션'], ['matte', '벨벳 매트']];
const HAIR_STYLE = [['straight', '긴 생머리'], ['wave', '웨이브 펌'], ['hippie', '히피 펌'], ['bob', '단발 C컬']];
const BANGS = [['none', '없음 (가르마)'], ['seethrough', '시스루뱅'], ['full', '풀뱅'], ['curtain', '커튼뱅']];
const HAIR_COL = [['흑발', '#2b2124'], ['다크 초코', '#4a3129'], ['애쉬 브라운', '#7a6158'], ['밀크티 베이지', '#b58d6f'], ['로즈 브라운', '#9c5f5a'], ['베이비 핑크', '#f2a7b4'], ['애쉬 블론드', '#d8c3a5']];
const ACC = [['ribbon', '🎀 새틴 리본'], ['flower', '🌸 꽃핀'], ['hairpin', '✨ 크리스탈 핀'], ['pearl', '진주 귀걸이'], ['drop', '드롭 귀걸이'], ['choker', '진주 초커'], ['layered', '레이어드 목걸이'], ['jewel', '💎 볼 주얼'], ['mole', '애교점']];
const TOP = [['lace', '레이스 블라우스'], ['offshoulder', '오프숄더'], ['cami', '캐미솔'], ['knit', '니트'], ['ribbonblouse', '리본 블라우스']];
const TOP_COL = [['크림', '#fbf3e6'], ['화이트', '#ffffff'], ['베이비 핑크', '#f9d3dd'], ['라일락', '#e2d3f0'], ['버터', '#f8ebc2'], ['로즈', '#e8a6b4'], ['블랙', '#2c2629']];
const BG = [['라벤더', ['#d9c6f5', '#f7d9ea']], ['핑크', ['#fbd3e1', '#fff0f4']], ['피치', ['#ffd9c9', '#fff2ea']], ['크림', ['#f6ead8', '#fffaf2']], ['모브', ['#c7a3c4', '#ecd4e6']]];

const DEFAULT = {
  skin: 1, contour: 'soft', highlight: 1, brow: 'soft', browCol: 0,
  shadow: 1, glitter: 'champagne', liner: 'puppy', lash: 'volume', lens: 0,
  blush: 1, blushLv: 'normal', lip: 3, lipFin: 'glossy',
  hair: 'wave', bangs: 'seethrough', hairCol: 1,
  acc: { pearl: true }, top: 'lace', topCol: 0, bg: 0,
};
let S = structuredClone(DEFAULT);

// 탭: [이름, 구역들]. 구역: [제목, 종류, 상태 키, 목록]. 종류: pan(둥근 팬) · stick(립스틱) · lens · chip · multi
const TABS = [
  ['베이스', [['피부 톤', 'pan', 'skin', SKIN], ['음영(컨투어)', 'chip', 'contour', CONTOUR], ['하이라이터', 'pan', 'highlight', HIGHLIGHT]]],
  ['아이섀도', [['섀도', 'pan', 'shadow', SHADOW], ['애교살 글리터', 'chip', 'glitter', GLITTER]]],
  ['라인·속눈썹', [['아이라인', 'chip', 'liner', LINER], ['속눈썹', 'chip', 'lash', LASH]]],
  ['렌즈', [['컬러 렌즈', 'lens', 'lens', LENS]]],
  ['눈썹', [['모양', 'chip', 'brow', BROW], ['색', 'pan', 'browCol', BROW_COL]]],
  ['블러셔', [['색', 'pan', 'blush', BLUSH], ['강도', 'chip', 'blushLv', BLUSH_LV]]],
  ['립', [['색', 'stick', 'lip', LIP], ['마무리', 'chip', 'lipFin', LIP_FIN]]],
  ['헤어', [['스타일 · 펌', 'chip', 'hair', HAIR_STYLE], ['앞머리', 'chip', 'bangs', BANGS], ['염색', 'pan', 'hairCol', HAIR_COL]]],
  ['액세서리', [['여러 개 고를 수 있어요', 'multi', 'acc', ACC]]],
  ['옷', [['모양', 'chip', 'top', TOP], ['색', 'pan', 'topCol', TOP_COL]]],
  ['배경', [['배경', 'bg', 'bg', BG]]],
];
let tab = 0;

/* ================= 도우미 ================= */
function mix(hex, to, k) {
  const a = parseInt(hex.slice(1), 16), b = parseInt(to.slice(1), 16);
  const ch = s => Math.round(((a >> s) & 255) * (1 - k) + ((b >> s) & 255) * k);
  return '#' + ((1 << 24) + (ch(16) << 16) + (ch(8) << 8) + ch(0)).toString(16).slice(1);
}
const W = 600, H = 720;
// 왼쪽 눈 · 눈썹 · 귀 좌표를 오른쪽으로 뒤집는다
const mirror = d => d.replace(/(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g, (_, x, y) => `${+(W - x).toFixed(1)},${y}`);
const flip = el => `<g transform="matrix(-1,0,0,1,${W},0)">${el}</g>`;
const both = el => el + flip(el);
const f = n => +n.toFixed(1);
function bez(p0, p1, p2, p3, t) {
  const u = 1 - t;
  return [u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
    u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]];
}
function sparkle(x, y, r, col = '#fff', op = 1) {
  return `<path d="M${x},${y - r} Q${x + r * .18},${y - r * .18} ${x + r},${y} Q${x + r * .18},${y + r * .18} ${x},${y + r} Q${x - r * .18},${y + r * .18} ${x - r},${y} Q${x - r * .18},${y - r * .18} ${x},${y - r}Z" fill="${col}" opacity="${op}"/>`;
}

/* ================= 머리카락 ================= */
// 양옆 머리선. 파마는 물결을 넣는다
function sideEdge(x0, y0, x1, y1, amp, waves, steps = 14) {
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const k = Math.max(0, t - .15) / .85; // 위쪽은 곧게, 아래로 갈수록 물결
    pts.push([f(x0 + (x1 - x0) * t + Math.sin(t * Math.PI * waves) * amp * k), f(y0 + (y1 - y0) * t)]);
  }
  return pts;
}
function smooth(pts) {
  let d = '';
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
    d += ` Q${x0},${y0} ${f((x0 + x1) / 2)},${f((y0 + y1) / 2)}`;
  }
  const l = pts[pts.length - 1];
  return d + ` L${l[0]},${l[1]}`;
}
const HAIR_SHAPE = {
  straight: { len: 690, outX: 128, amp: 0, waves: 0 },
  wave: { len: 690, outX: 112, amp: 16, waves: 3.5 },
  hippie: { len: 670, outX: 82, amp: 24, waves: 6 },
  bob: { len: 530, outX: 162, amp: 0, waves: 0 },
};
// 같은 그림이 매번 같게 나오도록 고정 난수
function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

function backHairD() {
  const sh = HAIR_SHAPE[S.hair];
  if (S.hair === 'bob') return 'M300,92 C202,92 148,168 148,292 C148,392 144,468 164,520 C184,552 230,552 244,530 L356,530 C370,552 416,552 436,520 C456,468 452,392 452,292 C452,168 398,92 300,92Z';
  const L = sideEdge(150, 300, sh.outX, sh.len, sh.amp, sh.waves);
  const R = sideEdge(450, 300, W - sh.outX, sh.len, sh.amp, sh.waves).reverse();
  return `M300,90 C204,90 150,166 150,300${smooth(L)} L${W - sh.outX},${sh.len} L${R[0][0]},${R[0][1]}${smooth(R)} C450,166 396,90 300,90Z`;
}
// 얼굴 옆 머리 한쪽(왼쪽). 오른쪽은 뒤집어 쓴다
function sideD() {
  const sh = HAIR_SHAPE[S.hair];
  if (S.hair === 'bob') return 'M300,110 C232,112 176,168 166,262 C158,350 162,440 172,520 C186,536 208,530 210,512 C196,440 188,360 188,292 C192,216 246,172 300,160Z';
  const end = Math.min(sh.len - 30, 640), wav = sh.amp;
  const out = sideEdge(166, 262, 146 - wav * .4, end, wav * .8, sh.waves, 12);
  const inn = sideEdge(186, 292, 186 - wav * .3, end - 10, wav * .8, sh.waves, 12).reverse();
  return `M300,110 C232,112 176,168 166,262${smooth(out)} L${inn[0][0]},${inn[0][1]}${smooth(inn)} C192,216 246,172 300,160Z`;
}
const CROWN_D = 'M168,312 C160,176 222,94 300,94 C378,94 440,176 432,312 C424,228 384,170 300,164 C216,170 176,228 168,312Z';
function bangsD() {
  if (S.bangs === 'full') {
    let d = 'M192,206 C202,152 252,138 300,138 C348,138 398,152 408,206 L412,262';
    const xs = [412, 390, 368, 346, 324, 302, 280, 258, 234, 212, 190];
    for (let i = 1; i < xs.length; i++) d += ` Q${f((xs[i - 1] + xs[i]) / 2)},${i % 2 ? 274 : 268} ${xs[i]},${262 + (i % 3) * 3}`;
    return [d + ' Z'];
  }
  if (S.bangs === 'curtain') {
    const l = 'M300,150 C266,164 232,204 214,284 C210,296 202,296 200,282 C208,212 246,160 300,142Z';
    return [l, mirror(l)];
  }
  return [];
}
// 머리결: 정수리에서 끝까지 내려가는 가는 선을 잔뜩, 머리 모양 안쪽에만
function strands(c, n, seed, front) {
  const r = rng(seed), sh = HAIR_SHAPE[S.hair];
  const light = mix(c, '#ffffff', .45), dark = mix(c, '#000000', .45);
  let s = '';
  for (let i = 0; i < n; i++) {
    const side = i % 2 ? 1 : -1, k = r();
    const sx = 300 + side * (6 + r() * 30), sy = 96 + r() * 14;
    const midX = 300 + side * (148 + (k - .5) * 40);
    const endY = S.hair === 'bob' ? 500 + r() * 30 : sh.len - 20 - r() * 70;
    const endX = S.hair === 'bob' ? 300 + side * (128 + r() * 24) : 300 + side * (300 - sh.outX - 10 + (r() - .5) * 60);
    const pts = sideEdge(midX, 300, endX, endY, sh.amp * (.7 + r() * .6), sh.waves, 10);
    const d = `M${f(sx)},${f(sy)} C${f(300 + side * (70 + k * 60))},${f(104 + r() * 20)} ${f(300 + side * (138 + k * 30))},${f(190 + r() * 40)} ${pts[0][0]},${pts[0][1]}${smooth(pts)}`;
    const isLight = r() < .45;
    s += `<path d="${d}" stroke="${isLight ? light : dark}" stroke-opacity="${f(isLight ? .12 + r() * .18 : .14 + r() * .2)}" stroke-width="${f(.8 + r() * 2.2)}" fill="none" stroke-linecap="round"/>`;
  }
  // 앞머리 결
  if (front && S.bangs === 'full') for (let i = 0; i < 26; i++) { const x = 200 + r() * 200; s += `<path d="M${f(300 + (x - 300) * .6)},${f(140 + r() * 10)} Q${f(x)},${f(200)} ${f(x + (x - 300) * .05)},${f(260 + r() * 10)}" stroke="${r() < .5 ? light : dark}" stroke-opacity=".2" stroke-width="${f(.8 + r() * 1.6)}" fill="none"/>`; }
  if (front && S.bangs === 'curtain') for (let i = 0; i < 16; i++) { const o = r() * 18; s += both(`<path d="M${f(298 - o * .3)},${f(146 + o * .3)} C${f(266 - o)},${f(166 + o)} ${f(234 - o)},${f(208 + o)} ${f(214 - o * .4)},${f(282 - o * .6)}" stroke="${r() < .5 ? light : dark}" stroke-opacity=".22" stroke-width="1.2" fill="none"/>`); }
  return s;
}
function hairBack(c) {
  return `<path d="${backHairD()}" fill="url(#hairG)"/><g clip-path="url(#hairBackClip)">${strands(c, 70, 7, false)}</g>`;
}
function hairFront(c) {
  const light = mix(c, '#ffffff', .4), dark = mix(c, '#000000', .3);
  let s = `<path d="${CROWN_D}" fill="url(#hairG)"/>` + both(`<path d="${sideD()}" fill="url(#hairG)"/>`);
  for (const d of bangsD()) s += `<path d="${d}" fill="url(#hairG)"/>`;
  if (S.bangs === 'seethrough') {
    // 시스루뱅: 얇게 비치는 가닥들
    const r = rng(11);
    s += `<path d="M206,196 C224,152 270,140 300,140 C330,140 376,152 394,196 C368,168 330,158 300,158 C270,158 232,168 206,196Z" fill="url(#hairG)"/>`;
    s += `<path d="M214,200 C230,160 370,160 386,200 L382,246 Q300,232 218,246Z" fill="${c}" opacity=".28" filter="url(#b4)"/>`;
    for (let i = 0; i < 70; i++) {
      const x = 216 + r() * 168, tip = 232 + r() * 30 - Math.abs(x - 300) * .06;
      const w = .8 + r() * 1.8;
      s += `<path d="M${f(300 + (x - 300) * .7)},${f(144 + r() * 6)} C${f(x - 2)},${f(180)} ${f(x + (x - 300) * .06)},${f(tip - 30)} ${f(x + (x - 300) * .1)},${f(tip)}" stroke="${r() < .3 ? mix(c, '#ffffff', .2) : c}" stroke-width="${f(w)}" stroke-opacity="${f(.45 + r() * .4)}" fill="none" stroke-linecap="round"/>`;
    }
  }
  s += `<g clip-path="url(#hairFrontClip)">${strands(c, 60, 23, true)}</g>`;
  if (S.bangs === 'none') s += `<path d="M300,96 Q297,130 300,164" stroke="${dark}" stroke-width="2.4" fill="none" stroke-linecap="round" opacity=".55"/>`;
  // 윤기 띠
  s += `<g clip-path="url(#hairFrontClip)"><path d="M196,214 C214,148 386,148 404,214" stroke="${light}" stroke-opacity=".32" stroke-width="16" fill="none" filter="url(#b8)"/></g>`;
  return s;
}
function hairClips() {
  const front = [CROWN_D, sideD(), mirror(sideD()), ...bangsD()].map(d => `<path d="${d}"/>`).join('');
  return `<clipPath id="hairBackClip"><path d="${backHairD()}"/></clipPath><clipPath id="hairFrontClip">${front}</clipPath>`;
}

/* ================= 얼굴 (실사 비율) ================= */
const FACE = 'M300,160 C380,160 432,214 432,300 C432,362 416,404 390,440 C362,478 330,498 300,500 C270,498 238,478 210,440 C184,404 168,362 168,300 C168,214 220,160 300,160Z';
// 왼쪽 눈: 눈머리 (276,334) → 눈꼬리 (212,330). 폭은 얼굴의 1/5 정도
const EYE_IN = [276, 334], EYE_C1 = [266, 314], EYE_C2 = [230, 309], EYE_OUT = [212, 330];
const EYE_SHAPE = 'M276,334 C266,314 230,309 212,330 C226,344 262,348 276,334Z';

function eyeLeft() {
  const lens = LENS[S.lens][1], sk = S.skinCol;
  let s = '';
  // 눈두덩 그늘 · 쌍꺼풀
  s += `<ellipse cx="248" cy="318" rx="34" ry="12" fill="${mix(sk, '#8a5a4a', .5)}" opacity=".18" filter="url(#b4)"/>`;
  s += `<path d="M274,324 C262,304 230,300 212,320" stroke="${mix(sk, '#6a3a30', .5)}" stroke-opacity=".45" stroke-width="1.3" fill="none" stroke-linecap="round"/>`;
  // 흰자 · 눈동자
  s += `<g clip-path="url(#eyeClipL)">
    <path d="${EYE_SHAPE}" fill="#f6f0ee"/>
    <circle cx="245" cy="330" r="13.5" fill="url(#lensG)"/>
    <circle cx="245" cy="330" r="13.5" fill="none" stroke="${mix(lens, '#000000', .55)}" stroke-width="1.6" opacity=".8"/>
    <circle cx="245" cy="330.5" r="5" fill="#140c0e"/>
    <path d="M208,328 C232,306 264,312 280,336 L280,300 L208,300Z" fill="#3a1e20" opacity=".32" filter="url(#b1)"/>
    <circle cx="240" cy="325" r="2.6" fill="#fff" opacity=".95"/>
    <circle cx="250" cy="335" r="1.2" fill="#fff" opacity=".7"/>
  </g>`;
  // 아랫눈꺼풀 · 애교살
  s += `<path d="M274,337 C260,346 228,346 214,333" stroke="${mix(sk, '#c08070', .3)}" stroke-width="1.6" fill="none" stroke-linecap="round" opacity=".7"/>`;
  s += `<path d="M272,342 C258,352 228,352 216,340" stroke="#fff" stroke-opacity=".28" stroke-width="5" fill="none" stroke-linecap="round" filter="url(#b2)"/>`;
  s += `<path d="M272,348 C258,357 230,357 218,346" stroke="${mix(sk, '#8a5040', .5)}" stroke-opacity=".12" stroke-width="2" fill="none" stroke-linecap="round" filter="url(#b1)"/>`;
  if (S.glitter !== 'none') {
    const gc = S.glitter === 'pink' ? '#ffd0e0' : '#fff2cf';
    s += `<path d="M270,342 C256,351 230,351 220,340" stroke="${gc}" stroke-opacity=".9" stroke-width="4" fill="none" stroke-linecap="round" filter="url(#b1)"/>`;
    for (const [x, y, r] of [[264, 346, 1], [254, 348, .8], [246, 349, 1.2], [236, 348, .8], [228, 345, 1]]) s += `<circle cx="${x}" cy="${y}" r="${r}" fill="#fff"/>`;
    s += sparkle(248, 348, 3.5);
  }
  // 윗눈꺼풀 선 · 아이라인
  const lw = S.liner === 'none' ? 1.8 : S.liner === 'natural' ? 2.6 : 3.2;
  const lc = S.liner === 'none' ? '#4a2e2a' : '#21161a';
  s += `<path d="M276,334 C266,314 230,309 212,330" stroke="${lc}" stroke-width="${lw}" fill="none" stroke-linecap="round"/>`;
  if (S.liner === 'puppy') s += `<path d="M218,326 C212,330 208,333 202,337 C209,337 214,334 219,330Z" fill="${lc}"/>`;
  if (S.liner === 'cat') s += `<path d="M220,322 C213,321 207,319 199,315 C205,322 210,326 215,329Z" fill="${lc}"/>`;
  // 속눈썹(짧고 촘촘하게, 눈꼬리로 갈수록 길게)
  const n = { natural: 12, volume: 18, doll: 24 }[S.lash], base = { natural: 5, volume: 7, doll: 9 }[S.lash];
  for (let i = 0; i < n; i++) {
    const t = .3 + .7 * i / (n - 1);
    const [x, y] = bez(EYE_IN, EYE_C1, EYE_C2, EYE_OUT, t);
    const L = base * (.6 + t * .8);
    const ang = -Math.PI / 2 - (.25 + t * .7);
    s += `<path d="M${f(x)},${f(y)} Q${f(x + Math.cos(ang + .5) * L * .5)},${f(y + Math.sin(ang + .5) * L * .5)} ${f(x + Math.cos(ang) * L)},${f(y + Math.sin(ang) * L)}" stroke="#1e1416" stroke-width="${S.lash === 'doll' ? 1.2 : .9}" fill="none" stroke-linecap="round" opacity=".9"/>`;
  }
  const low = S.lash === 'doll' ? [[256, 344], [244, 345], [232, 343], [222, 339]] : S.lash === 'volume' ? [[230, 343], [220, 338]] : [];
  for (const [x, y] of low) s += `<path d="M${x},${y} L${x - 1.5},${y + 4}" stroke="#2a1c1e" stroke-width=".8" stroke-linecap="round" opacity=".6"/>`;
  return s;
}
function browLeft() {
  const d = {
    straight: 'M284,302 C270,296 244,293 222,293 C214,293 208,295 204,298 C216,297 236,298 252,300 C266,302 276,305 284,309Z',
    soft: 'M284,303 C270,295 246,289 224,289 C214,290 208,293 204,298 C216,295 236,296 252,299 C266,302 276,305 284,310Z',
    arch: 'M284,304 C270,293 248,285 228,285 C216,286 208,291 203,298 C216,293 236,294 252,298 C266,301 276,305 284,311Z',
  }[S.brow];
  const hc = HAIR_COL[S.hairCol][1];
  const col = BROW_COL[S.browCol][1] || mix(hc, '#5a4038', ['#f2a7b4', '#d8c3a5', '#b58d6f'].includes(hc) ? .55 : .2);
  // 결이 보이게 짧은 털 몇 가닥을 얹는다
  let hairs = '';
  for (let i = 0; i < 14; i++) { const x = 210 + i * 5.4, y = 299 - Math.sin(i / 13 * Math.PI) * 6; hairs += `<path d="M${f(x)},${f(y + 3)} L${f(x - 4)},${f(y - 1.5)}" stroke="${col}" stroke-width="1" opacity=".5"/>`; }
  return `<path d="${d}" fill="${col}" opacity=".62" filter="url(#b1)"/>${hairs}`;
}
function nose(skin) {
  const sd = mix(skin, '#8a4a3e', .45);
  return `<g filter="url(#b2)" opacity=".5"><path d="M287,322 C288,346 287,370 284,388" stroke="${sd}" stroke-width="3" fill="none"/></g>
    <g filter="url(#b4)"><ellipse cx="300" cy="392" rx="9" ry="7" fill="#fff" opacity=".35"/><ellipse cx="300" cy="350" rx="3" ry="22" fill="#fff" opacity=".22"/></g>
    <path d="M284,392 C279,398 282,406 290,405" stroke="${sd}" stroke-width="1.6" fill="none" stroke-linecap="round" opacity=".55"/>
    <path d="M316,392 C321,398 318,406 310,405" stroke="${sd}" stroke-width="1.6" fill="none" stroke-linecap="round" opacity=".55"/>
    <g filter="url(#b1)" fill="${mix(skin, '#5a2a24', .6)}" opacity=".55"><ellipse cx="292" cy="405" rx="4.5" ry="2"/><ellipse cx="308" cy="405" rx="4.5" ry="2"/></g>
    <path d="M292,409 Q300,412 308,409" stroke="${sd}" stroke-width="2" fill="none" opacity=".25" filter="url(#b1)"/>
    <path d="M295,416 L294,430 M305,416 L306,430" stroke="${sd}" stroke-width="2.4" opacity=".12" filter="url(#b2)"/>`;
}
function lips() {
  const c = LIP[S.lip][1], deep = mix(c, '#4a0e1a', .4), light = mix(c, '#ffffff', .35);
  const up = 'M267,444 C278,438 290,432 300,437 C310,432 322,438 333,444 C318,447 282,447 267,444Z';
  const lo = 'M267,444 C282,447 318,447 333,444 C326,460 313,467 300,467 C287,467 274,460 267,444Z';
  let s = `<ellipse cx="300" cy="474" rx="18" ry="5" fill="${mix(S.skinCol, '#8a4a3e', .4)}" opacity=".25" filter="url(#b4)"/>`;
  s += `<g ${S.lipFin === 'blur' ? 'filter="url(#b1)"' : ''}>`;
  if (S.lipFin === 'blur') {
    s += `<path d="${up}" fill="${mix(c, S.skinCol, .6)}"/><path d="${lo}" fill="${mix(c, S.skinCol, .6)}"/>`;
    s += `<ellipse cx="300" cy="447" rx="20" ry="9" fill="${c}" filter="url(#b4)"/>`;
  } else {
    s += `<path d="${up}" fill="${mix(c, '#000000', .1)}"/><path d="${lo}" fill="url(#lipG)"/>`;
  }
  s += `</g><path d="M268,444 C284,447.5 316,447.5 332,444" stroke="${deep}" stroke-width="1.5" fill="none" stroke-linecap="round" opacity=".8"/>`;
  s += `<circle cx="267" cy="444" r="1.6" fill="${deep}" opacity=".5"/><circle cx="333" cy="444" r="1.6" fill="${deep}" opacity=".5"/>`;
  if (S.lipFin === 'glossy') {
    s += `<path d="M288,455 C294,460 306,460 312,455" stroke="#fff" stroke-opacity=".7" stroke-width="3" fill="none" stroke-linecap="round" filter="url(#b1)"/>`;
    s += `<ellipse cx="306" cy="457" rx="3.6" ry="1.6" fill="#fff" opacity=".9"/><ellipse cx="288" cy="439" rx="3.5" ry="1.2" fill="#fff" opacity=".5"/>`;
  } else if (S.lipFin === 'matte') {
    s += `<ellipse cx="300" cy="457" rx="9" ry="3" fill="${light}" opacity=".2" filter="url(#b2)"/>`;
  }
  return s;
}

/* ================= 소품 · 옷 ================= */
function bow(x, y, sc, flip) {
  const c1 = '#fbf1e1', c2 = '#e8d3b5';
  const g = `<g transform="translate(${x},${y}) scale(${flip ? -sc : sc},${sc})">
    <path d="M0,0 C-14,30 -22,60 -16,92 L-4,80 L4,96 C8,62 6,30 0,0Z" fill="${c1}" stroke="${c2}" stroke-width="1.5"/>
    <path d="M0,0 C10,34 22,62 30,88 L36,72 L46,82 C34,52 18,24 0,0Z" fill="${c1}" stroke="${c2}" stroke-width="1.5"/>
    <path d="M0,0 C-30,-26 -62,-30 -66,-8 C-68,12 -36,14 0,0Z" fill="${c1}" stroke="${c2}" stroke-width="1.5"/>
    <path d="M0,0 C26,-34 58,-42 64,-20 C70,2 36,10 0,0Z" fill="${c1}" stroke="${c2}" stroke-width="1.5"/>
    <path d="M-8,-4 C-30,-18 -50,-20 -58,-10" stroke="#fff" stroke-width="3" fill="none" opacity=".8"/>
    <path d="M8,-6 C24,-22 44,-28 56,-20" stroke="#fff" stroke-width="3" fill="none" opacity=".8"/>
    <ellipse cx="0" cy="0" rx="11" ry="9" fill="${c1}" stroke="${c2}" stroke-width="1.5"/>
  </g>`;
  return g;
}
function pearl(x, y, r) {
  return `<circle cx="${x}" cy="${y}" r="${r}" fill="url(#pearlG)"/>`;
}
function accessories(where) {
  const A = S.acc;
  let s = '';
  if (where === 'ear') {
    if (A.pearl) s += pearl(178, 400, 6) + pearl(422, 400, 6) + `<path d="M178,406 L178,420 M422,406 L422,420" stroke="#d9c39a" stroke-width="1.5"/>` + pearl(178, 430, 10) + pearl(422, 430, 10);
    if (A.drop && !A.pearl) {
      for (const x of [178, 422]) {
        s += `<path d="M${x},400 L${x},452" stroke="#d6d6de" stroke-width="1.5"/>`;
        for (const [y, r] of [[404, 4], [420, 5], [438, 6], [458, 8]]) s += `<path d="M${x},${y - r} L${x + r * .8},${y} L${x},${y + r * 1.3} L${x - r * .8},${y}Z" fill="#fdfdff" stroke="#c9c9d6" stroke-width="1"/>`;
        s += sparkle(x + 6, 452, 6);
      }
    }
    return s;
  }
  if (where === 'neck') {
    if (A.choker) for (let i = 0; i <= 14; i++) { const t = i / 14; s += pearl(f(262 + 76 * t), f(560 + Math.sin(t * Math.PI) * 10), 4.6); }
    if (A.layered) {
      s += `<path d="M256,580 Q300,640 344,580" stroke="#e3c98f" stroke-width="1.6" fill="none"/><path d="M246,590 Q300,680 354,590" stroke="#e3c98f" stroke-width="1.6" fill="none"/>`;
      s += `<path d="M300,630 L306,638 L300,648 L294,638Z" fill="#fff" stroke="#d9c39a" stroke-width="1"/>` + pearl(300, 669, 5) + sparkle(306, 634, 5);
    }
    return s;
  }
  if (where === 'face') {
    if (A.jewel) for (const [x, y, r] of [[212, 372, 3.2], [204, 384, 2.4], [218, 390, 2], [388, 372, 3.2], [396, 384, 2.4], [382, 390, 2]]) s += `<circle cx="${x}" cy="${y}" r="${r}" fill="#fff" stroke="#e9d9ef" stroke-width="1"/>` + sparkle(x, y, r * 2.2, '#fff', .9);
    if (A.mole) s += `<circle cx="374" cy="380" r="2.6" fill="#5a3a32" opacity=".85"/>`;
    return s;
  }
  // 머리 위
  if (A.ribbon) s += bow(170, 196, .62, false) + bow(430, 196, .62, true);
  if (A.flower) {
    s += '<g>';
    for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; s += `<ellipse cx="${f(420 + Math.cos(a) * 14)}" cy="${f(236 + Math.sin(a) * 14)}" rx="13" ry="9" transform="rotate(${f(a * 180 / Math.PI)} ${f(420 + Math.cos(a) * 14)} ${f(236 + Math.sin(a) * 14)})" fill="#fff6f2" stroke="#f3d5d9" stroke-width="1.2"/>`; }
    s += `<circle cx="420" cy="236" r="7" fill="#f7d58c"/></g>`;
  }
  if (A.hairpin) for (let i = 0; i < 5; i++) { const x = 380 + i * 11, y = 150 + i * 13; s += `<path d="M${x},${y - 6} L${x + 5},${y} L${x},${y + 6} L${x - 5},${y}Z" fill="#fdfdff" stroke="#c7c7d4" stroke-width="1"/>`; if (i % 2 === 0) s += sparkle(x + 4, y - 4, 6); }
  return s;
}
function clothes(skin, shade) {
  const c = TOP_COL[S.topCol][1], edge = mix(c, '#000000', .14), lace = c === '#2c2629' ? '#4a4044' : '#ffffff';
  const shoulders = 'M70,720 C84,644 170,606 262,596 L338,596 C430,606 516,644 530,720Z';
  let s = `<path d="${shoulders}" fill="${skin}"/>`;
  s += `<path d="M214,610 Q256,622 286,616 M386,610 Q344,622 314,616" stroke="${shade}" stroke-width="2.5" fill="none" stroke-linecap="round" opacity=".7"/>`;
  const scallop = (x0, x1, y, r = 7) => { let d = `M${x0},${y}`; for (let x = x0; x < x1; x += r * 2) d += ` a${r},${r} 0 0 0 ${r * 2},0`; return d; };
  if (S.top === 'offshoulder') {
    s += `<path d="M64,720 C70,680 90,660 110,654 Q300,676 490,654 C510,660 530,680 536,720Z" fill="${c}" stroke="${edge}" stroke-width="1.5"/>`;
    s += `<path d="M104,650 Q300,690 496,650 L500,672 Q300,712 100,672Z" fill="${mix(c, '#ffffff', .3)}" stroke="${edge}" stroke-width="1.2"/>`;
    for (let x = 120; x < 490; x += 24) s += `<path d="M${x},${660 + Math.sin((x - 100) / 400 * Math.PI) * 20} l2,18" stroke="${edge}" stroke-opacity=".35" stroke-width="1.5"/>`;
  } else if (S.top === 'cami') {
    s += `<path d="M170,720 C176,690 184,668 196,656 Q300,676 404,656 C416,668 424,690 430,720Z" fill="${c}" stroke="${edge}" stroke-width="1.5"/>`;
    s += `<path d="${scallop(196, 404, 658, 6)}" fill="none" stroke="${lace}" stroke-width="2.5"/>`;
    s += `<path d="M206,660 L230,600 M394,660 L370,600" stroke="${edge}" stroke-width="2.5"/>`;
    s += `<path d="M290,672 l10,8 l10,-8 l-10,-4Z" fill="${mix(c, '#000000', .2)}"/>`;
  } else {
    const neck = { lace: 'M232,600 Q300,650 368,600', knit: 'M252,598 Q300,628 348,598', ribbonblouse: 'M262,594 Q300,606 338,594' }[S.top];
    s += `<path d="M70,720 C84,648 160,606 232,598 ${neck.slice(neck.indexOf('Q'))} C440,606 516,648 530,720Z" fill="${c}" stroke="${edge}" stroke-width="1.5"/>`;
    if (S.top === 'lace') {
      s += `<path d="M232,600 Q300,650 368,600" stroke="${lace}" stroke-width="7" fill="none" stroke-dasharray="2 5" stroke-linecap="round"/>`;
      s += `<path d="M228,598 Q300,656 372,598" stroke="${lace}" stroke-width="2" fill="none"/>`;
      s += `<path d="M84,700 C96,654 138,630 170,624 M516,700 C504,654 462,630 430,624" stroke="${edge}" stroke-opacity=".4" stroke-width="2" fill="none"/>`;
    } else if (S.top === 'knit') {
      s += `<path d="M252,598 Q300,628 348,598" stroke="${mix(c, '#000000', .1)}" stroke-width="9" fill="none"/>`;
      for (let x = 110; x < 500; x += 16) s += `<path d="M${x},${720} Q${x + 4},${690} ${x + (x - 300) * .05},${650 + Math.abs(x - 300) * .05}" stroke="${edge}" stroke-opacity=".25" stroke-width="2" fill="none"/>`;
    } else {
      s += `<path d="M262,594 L246,628 L300,614 L354,628 L338,594" fill="${mix(c, '#ffffff', .4)}" stroke="${edge}" stroke-width="1.5" stroke-linejoin="round"/>`;
      s += `<path d="M300,616 C276,600 248,606 252,624 C256,640 284,630 300,616Z M300,616 C324,600 352,606 348,624 C344,640 316,630 300,616Z" fill="${mix(c, '#000000', .08)}" stroke="${edge}" stroke-width="1.5"/>`;
      s += `<path d="M296,620 L284,676 L296,670 Z M304,620 L316,676 L304,670Z" fill="${mix(c, '#000000', .08)}" stroke="${edge}" stroke-width="1.2"/><ellipse cx="300" cy="617" rx="7" ry="6" fill="${mix(c, '#000000', .12)}"/>`;
    }
  }
  return s;
}

/* ================= 전체 그림 ================= */
function svg(w = W, h = H) {
  const skin = SKIN[S.skin][1];
  S.skinCol = skin;
  const shade = mix(skin, '#a0624f', .32);
  const hair = HAIR_COL[S.hairCol][1];
  const [bg1, bg2] = BG[S.bg][1];
  const lens = LENS[S.lens][1];
  const lip = LIP[S.lip][1];
  const sh = SHADOW[S.shadow][1], bl = BLUSH[S.blush][1], hl = HIGHLIGHT[S.highlight][1];
  const blushOp = { light: .32, normal: .5, deep: .72 }[S.blushLv];
  const contourOp = { none: 0, soft: .3, strong: .52 }[S.contour];

  let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${w}" height="${h}">
  <defs>
    <linearGradient id="bgG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${bg1}"/><stop offset="1" stop-color="${bg2}"/></linearGradient>
    <linearGradient id="hairG" gradientUnits="userSpaceOnUse" x1="0" y1="90" x2="0" y2="700"><stop offset="0" stop-color="${mix(hair, '#ffffff', .1)}"/><stop offset=".4" stop-color="${hair}"/><stop offset="1" stop-color="${mix(hair, '#000000', .25)}"/></linearGradient>
    <radialGradient id="skinG" gradientUnits="userSpaceOnUse" cx="296" cy="330" r="190"><stop offset="0" stop-color="${mix(skin, '#ffffff', .22)}"/><stop offset=".6" stop-color="${skin}"/><stop offset="1" stop-color="${mix(skin, '#b8785e', .3)}"/></radialGradient>
    <radialGradient id="lensG"><stop offset="0" stop-color="${mix(lens, '#ffffff', .2)}"/><stop offset=".6" stop-color="${lens}"/><stop offset="1" stop-color="${mix(lens, '#000000', .5)}"/></radialGradient>
    <linearGradient id="lipG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${mix(lip, '#000000', .12)}"/><stop offset="1" stop-color="${mix(lip, '#ffffff', .1)}"/></linearGradient>
    <radialGradient id="pearlG" cx=".35" cy=".3" r=".75"><stop offset="0" stop-color="#ffffff"/><stop offset=".6" stop-color="#f6efe8"/><stop offset="1" stop-color="#d9cfc6"/></radialGradient>
    <clipPath id="eyeClipL"><path d="${EYE_SHAPE}"/></clipPath>
    <clipPath id="faceClip"><path d="${FACE}"/></clipPath>
    ${hairClips()}
    ${[1, 2, 4, 8, 14].map(b => `<filter id="b${b}" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="${b}"/></filter>`).join('')}
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bgG)"/>`;
  for (let i = 0; i < 14; i++) s += `<circle cx="${(i * 137) % W}" cy="${(i * 89 + 40) % H}" r="${10 + (i % 4) * 8}" fill="#fff" opacity=".16" filter="url(#b4)"/>`;
  for (const [x, y, r] of [[70, 90, 12], [530, 70, 9], [548, 300, 7], [52, 380, 8], [520, 560, 10], [96, 610, 6], [470, 150, 5]]) s += sparkle(x, y, r, '#fff', .85);

  s += hairBack(hair);
  // 몸 · 목
  s += `<g transform="translate(0,-44)">${clothes(skin, shade).replace(/,720(?=[\sZQCLa-z"])/g, ',780')}</g>`;
  s += `<path d="M274,456 C276,505 272,535 264,560 Q300,574 336,560 C328,535 324,505 326,456Z" fill="${skin}"/>`;
  s += `<path d="M274,480 Q300,524 326,480 L326,460 L274,460Z" fill="${shade}" opacity=".55" filter="url(#b8)"/>`;
  s += `<g transform="translate(0,-44)">${accessories('neck')}</g>`;
  s += both(`<path d="M172,316 C156,312 154,344 162,364 C168,380 176,388 182,384Z" fill="${shade}"/>`);
  // 얼굴 바탕 · 자연 음영
  s += `<path d="${FACE}" fill="url(#skinG)"/>`;
  s += `<g clip-path="url(#faceClip)">`;
  s += both(`<ellipse cx="180" cy="330" rx="22" ry="110" fill="${mix(skin, '#9a5a48', .5)}" opacity=".22" filter="url(#b14)"/>`);
  s += both(`<ellipse cx="282" cy="316" rx="9" ry="14" fill="${mix(skin, '#9a5a48', .5)}" opacity=".22" filter="url(#b4)"/>`);
  s += `<ellipse cx="300" cy="220" rx="60" ry="30" fill="#fff" opacity=".18" filter="url(#b14)"/>`;
  if (contourOp) {
    const cc = mix(skin, '#7a4a3c', .55);
    s += `<g fill="${cc}" opacity="${contourOp}" filter="url(#b14)">${both('<ellipse cx="182" cy="250" rx="24" ry="60"/><ellipse cx="206" cy="420" rx="18" ry="56" transform="rotate(-26 206 420)"/>')}<ellipse cx="300" cy="514" rx="56" ry="14"/></g>`;
    s += `<g fill="${cc}" opacity="${contourOp * .7}" filter="url(#b4)"><ellipse cx="288" cy="356" rx="3.5" ry="26"/><ellipse cx="312" cy="356" rx="3.5" ry="26"/></g>`;
  }
  if (bl) s += `<g fill="${bl}" opacity="${blushOp}" filter="url(#b14)">${both('<ellipse cx="238" cy="382" rx="40" ry="20"/>')}</g>`;
  if (hl) s += `<g fill="${hl}" opacity=".75" filter="url(#b4)"><ellipse cx="300" cy="352" rx="3.5" ry="22"/><ellipse cx="300" cy="392" rx="6" ry="4.5"/><ellipse cx="300" cy="488" rx="10" ry="5"/><ellipse cx="300" cy="428" rx="6" ry="2.5"/></g>
    <g fill="${hl}" opacity=".85" filter="url(#b8)">${both('<ellipse cx="232" cy="362" rx="26" ry="8" transform="rotate(-10 232 362)"/>')}</g>`;
  if (sh) {
    s += both(`<g fill="${sh}" opacity=".8" filter="url(#b8)"><ellipse cx="246" cy="320" rx="34" ry="13" transform="rotate(-4 246 320)"/><ellipse cx="222" cy="326" rx="16" ry="10"/></g>`);
    s += both(`<g fill="${mix(sh, '#000000', .12)}" opacity=".55" filter="url(#b2)"><ellipse cx="226" cy="341" rx="14" ry="3.5" transform="rotate(14 226 341)"/></g>`);
  }
  s += `</g>`;
  s += nose(skin);
  s += both(browLeft());
  s += both(`<g transform="translate(244,330) scale(1.12) translate(-244,-330)">${eyeLeft()}</g>`);
  s += lips();
  s += accessories('face');
  s += hairFront(hair);
  s += accessories('ear');
  s += accessories('head');
  return s + '</svg>';
}

/* ================= 도구 패널 ================= */
const stage = document.getElementById('face');
const tabsEl = document.getElementById('tabs'), optsEl = document.getElementById('opts');

function icon(kind, col, i) {
  if (!col) return `<svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="15" fill="#fff" stroke="#f0c9d5" stroke-width="2"/><path d="M10,30 L30,10" stroke="#f0a9bd" stroke-width="2.5"/></svg>`;
  if (kind === 'stick') return `<svg viewBox="0 0 40 40"><rect x="13" y="22" width="14" height="15" rx="2" fill="#e8c78e"/><rect x="14" y="17" width="12" height="7" fill="#f3dcae"/><path d="M15,17 L15,8 Q20,1 25,5 L25,17Z" fill="${col}"/><path d="M17,15 L17,9" stroke="#fff" stroke-opacity=".6" stroke-width="1.5"/></svg>`;
  if (kind === 'lens') return `<svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="15" fill="${col}"/><circle cx="20" cy="20" r="15" fill="none" stroke="${mix(col, '#000000', .5)}" stroke-width="2.5"/><circle cx="20" cy="20" r="6" fill="#1d1416"/><circle cx="15" cy="15" r="3" fill="#fff"/></svg>`;
  if (kind === 'bg') return `<svg viewBox="0 0 40 40"><defs><linearGradient id="ib${i}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${col[0]}"/><stop offset="1" stop-color="${col[1]}"/></linearGradient></defs><rect x="5" y="5" width="30" height="30" rx="8" fill="url(#ib${i})"/>${sparkle(27, 13, 4)}</svg>`;
  return `<svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="16" fill="#efe3e6"/><circle cx="20" cy="20" r="13" fill="${col}"/><ellipse cx="15" cy="14" rx="5" ry="3" fill="#fff" opacity=".45"/></svg>`;
}
function paint() { stage.innerHTML = svg(); }
function paintTools() {
  tabsEl.innerHTML = TABS.map(([name], i) => `<button type="button" class="tab ${i === tab ? 'on' : ''}" data-tab="${i}">${name}</button>`).join('');
  optsEl.innerHTML = TABS[tab][1].map(([title, kind, key, list]) => {
    const items = list.map((item, i) => {
      if (kind === 'chip' || kind === 'multi') {
        const [val, label] = item;
        const on = kind === 'multi' ? !!S[key][val] : S[key] === val;
        return `<button type="button" class="chip ${on ? 'on' : ''}" data-key="${key}" data-val="${val}" data-multi="${kind === 'multi' ? 1 : ''}">${label}</button>`;
      }
      const [label, col] = item;
      return `<button type="button" class="tile ${S[key] === i ? 'on' : ''}" data-key="${key}" data-val="${i}">${icon(kind, col, i)}<span>${label}</span></button>`;
    }).join('');
    return `<div class="opt-sec"><h3>${title}</h3><div class="${kind === 'chip' || kind === 'multi' ? 'chips' : 'tiles'}">${items}</div></div>`;
  }).join('');
}
tabsEl.addEventListener('click', e => {
  const b = e.target.closest('[data-tab]'); if (!b) return;
  tab = +b.dataset.tab; paintTools();
});
optsEl.addEventListener('click', e => {
  const b = e.target.closest('[data-key]'); if (!b) return;
  const { key, val, multi } = b.dataset;
  if (multi) S[key][val] = !S[key][val];
  else S[key] = /^\d+$/.test(val) ? +val : val;
  paint(); paintTools();
});

const pick = a => Math.floor(Math.random() * a.length);
const pickV = a => a[pick(a)][0];
document.getElementById('rand').addEventListener('click', () => {
  S = {
    skin: pick(SKIN.slice(0, 4)), contour: pickV(CONTOUR), highlight: 1 + pick(HIGHLIGHT.slice(1)), brow: pickV(BROW), browCol: 0,
    shadow: 1 + pick(SHADOW.slice(1)), glitter: pickV(GLITTER), liner: pickV(LINER), lash: pickV(LASH), lens: pick(LENS),
    blush: 1 + pick(BLUSH.slice(1)), blushLv: pickV(BLUSH_LV), lip: pick(LIP), lipFin: pickV(LIP_FIN),
    hair: pickV(HAIR_STYLE), bangs: pickV(BANGS), hairCol: pick(HAIR_COL),
    acc: {}, top: pickV(TOP), topCol: pick(TOP_COL), bg: pick(BG),
  };
  S.acc[['pearl', 'drop'][pick([0, 1])]] = true;
  for (let i = 0, n = 1 + pick([0, 1, 2]); i < n; i++) S.acc[pickV(ACC)] = true;
  paint(); paintTools();
});
document.getElementById('reset').addEventListener('click', () => { S = structuredClone(DEFAULT); paint(); paintTools(); });
document.getElementById('save').addEventListener('click', async () => {
  const img = new Image();
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg(W * 1.5, H * 1.5));
  await img.decode();
  const c = document.createElement('canvas'); c.width = W * 1.5; c.height = H * 1.5;
  c.getContext('2d').drawImage(img, 0, 0);
  c.toBlob(blob => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = '메이크업앤코디.png';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }, 'image/png');
});

paint(); paintTools();
