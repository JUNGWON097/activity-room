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
  acc: { ribbon: true, pearl: true }, top: 'lace', topCol: 0, bg: 0,
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
function backHair(c) {
  const sh = HAIR_SHAPE[S.hair];
  if (S.hair === 'bob') {
    return `<path d="M300,96 C204,96 150,170 150,292 C150,392 146,468 166,520 C186,552 230,552 244,530 L356,530 C370,552 414,552 434,520 C454,468 450,392 450,292 C450,170 396,96 300,96Z" fill="url(#hairG)"/>`;
  }
  const L = sideEdge(150, 300, sh.outX, sh.len, sh.amp, sh.waves);
  const R = sideEdge(450, 300, W - sh.outX, sh.len, sh.amp, sh.waves).reverse();
  let d = `M300,94 C206,94 150,168 150,300${smooth(L)} L${W - sh.outX},${sh.len} L${R[0][0]},${R[0][1]}${smooth(R)} C450,168 394,94 300,94Z`;
  return `<path d="${d}" fill="url(#hairG)"/>`;
}
function frontHair(c) {
  const sh = HAIR_SHAPE[S.hair];
  const light = mix(c, '#ffffff', .35), dark = mix(c, '#000000', .3);
  let s = '';
  // 정수리 · 이마 위 머리
  s += `<path d="M168,312 C160,176 222,96 300,96 C378,96 440,176 432,312 C424,226 384,166 300,160 C216,166 176,226 168,312Z" fill="url(#hairG)"/>`;
  // 얼굴 옆 머리(양쪽)
  const end = S.hair === 'bob' ? 528 : Math.min(sh.len - 30, 640);
  const wav = sh.amp;
  let side;
  if (S.hair === 'bob') side = `M300,112 C232,114 176,170 166,262 C158,350 162,440 172,520 C186,536 208,530 210,512 C196,440 186,360 186,290 C190,214 246,168 300,156Z`;
  else {
    const out = sideEdge(166, 262, 146 - wav * .4, end, wav * .8, sh.waves, 12);
    const inn = sideEdge(184, 290, 184 - wav * .3, end - 10, wav * .8, sh.waves, 12).reverse();
    side = `M300,112 C232,114 176,170 166,262${smooth(out)} L${inn[0][0]},${inn[0][1]}${smooth(inn)} C190,214 246,168 300,156Z`;
  }
  s += both(`<path d="${side}" fill="url(#hairG)"/>`);
  // 결 · 윤기
  const strands = S.hair === 'bob'
    ? ['M296,118 C240,124 190,176 178,262 C170,360 172,440 184,512', 'M270,126 C226,148 196,200 186,280']
    : ['M296,118 C240,124 190,176 176,262 C170,360 166,470 158,600', 'M272,128 C224,150 194,206 180,290 C174,380 170,470 164,560'];
  if (S.hair !== 'bob') s += both(`<path d="M172,330 C166,430 160,520 154,${Math.min(sh.len - 60, 620)}" stroke="${light}" stroke-opacity=".2" stroke-width="3" fill="none" stroke-linecap="round"/>`);
  for (const st of strands) s += both(`<path d="${st}" stroke="${dark}" stroke-opacity=".28" stroke-width="2" fill="none" stroke-linecap="round"/>`);
  s += both(`<path d="M290,122 C246,128 210,168 196,226" stroke="${light}" stroke-opacity=".55" stroke-width="7" fill="none" stroke-linecap="round" filter="url(#b2)"/>`);
  s += `<ellipse cx="300" cy="122" rx="86" ry="16" fill="${light}" opacity=".35" filter="url(#b8)"/>`;
  // 앞머리
  if (S.bangs === 'none') {
    s += `<path d="M300,98 Q296,128 300,158" stroke="${mix(S.skinCol, dark, .5)}" stroke-width="3" fill="none" stroke-linecap="round" opacity=".6"/>`;
  } else if (S.bangs === 'full') {
    let d = 'M190,206 C200,150 250,138 300,138 C350,138 400,150 410,206 L414,268';
    const xs = [414, 392, 368, 344, 320, 298, 276, 252, 230, 208, 188];
    for (let i = 1; i < xs.length; i++) d += ` Q${f((xs[i - 1] + xs[i]) / 2)},${i % 2 ? 278 : 270} ${xs[i]},${266 + (i % 3) * 3}`;
    d += ' Z';
    s += `<path d="${d}" fill="url(#hairG)"/>`;
    for (let x = 214; x < 400; x += 26) s += `<path d="M${x + 6},150 Q${x},210 ${x - 2},262" stroke="${dark}" stroke-opacity=".22" stroke-width="2" fill="none"/>`;
    s += `<path d="M236,160 Q300,146 364,160" stroke="${light}" stroke-opacity=".5" stroke-width="6" fill="none" stroke-linecap="round" filter="url(#b2)"/>`;
  } else if (S.bangs === 'seethrough') {
    // 가는 가닥 사이로 이마가 보이게
    // 얇게 비치는 앞머리: 반투명 막 + 가는 가닥 몇 줄, 끝은 부드럽게
    let d = 'M200,206 C208,154 254,138 300,138 C346,138 392,154 400,206 L398,250';
    const tips = [[386, 258], [366, 250], [346, 262], [326, 252], [304, 264], [282, 252], [262, 262], [240, 250], [220, 258], [202, 250]];
    let px = 398, py = 250;
    for (const [x, y] of tips) { d += ` Q${f((px + x) / 2)},${f(Math.max(py, y) + 10)} ${x},${y}`; px = x; py = y; }
    d += ' Z';
    s += `<g filter="url(#b1)"><path d="${d}" fill="url(#hairG)" opacity=".62"/>`;
    for (const [i, [x, y]] of tips.entries()) {
      const top = 150 + Math.abs(x - 300) * .1;
      s += `<path d="M${x + (i % 2 ? 6 : -6)},${top} C${x + (i % 2 ? 4 : -4)},${f(top + 40)} ${x + 1},${y - 30} ${x},${y + 6}" stroke="${i % 3 ? c : dark}" stroke-opacity=".7" stroke-width="${3 + (i % 3)}" fill="none" stroke-linecap="round"/>`;
    }
    s += `</g>`;
    s += `<path d="M204,194 C222,152 270,140 300,140 C330,140 378,152 396,194 C368,166 330,156 300,156 C270,156 232,166 204,194Z" fill="url(#hairG)"/>`;
  } else if (S.bangs === 'curtain') {
    s += both(`<path d="M300,146 C268,160 230,200 212,288 C208,300 200,300 198,286 C206,214 244,160 300,140Z" fill="url(#hairG)"/><path d="M290,152 C258,174 230,214 216,276" stroke="${light}" stroke-opacity=".45" stroke-width="3" fill="none"/>`);
  }
  return s;
}

/* ================= 얼굴 ================= */
const FACE = 'M300,150 C388,150 436,208 436,300 C436,358 422,402 394,440 C366,478 330,498 300,500 C270,498 234,478 206,440 C178,402 164,358 164,300 C164,208 212,150 300,150Z';
// 왼쪽 눈(화면 기준): 안쪽 눈머리 (282,342) → 바깥 눈꼬리 (190,330). 눈동자가 위아래 눈꺼풀에 걸치도록 납작한 아몬드형
const EYE_IN = [282, 342], EYE_C1 = [270, 314], EYE_C2 = [228, 304], EYE_OUT = [190, 330];
const EYE_SHAPE = 'M282,342 C270,314 228,304 190,330 C208,352 258,358 282,342Z';

function eyeLeft() {
  const lens = LENS[S.lens][1];
  let s = '';
  // 쌍꺼풀 선
  s += `<path d="M280,330 C267,304 226,294 194,318" stroke="${mix(S.skinCol, '#6a3a30', .45)}" stroke-opacity=".5" stroke-width="1.8" fill="none" stroke-linecap="round"/>`;
  // 흰자 · 렌즈
  s += `<g clip-path="url(#eyeClipL)">
    <path d="${EYE_SHAPE}" fill="#fbf7f6"/>
    <ellipse cx="237" cy="336" rx="23" ry="26" fill="url(#lensG)"/>
    <ellipse cx="237" cy="336" rx="23" ry="26" fill="none" stroke="${mix(lens, '#000000', .5)}" stroke-width="2.4" opacity=".7"/>
    <ellipse cx="237" cy="338" rx="8" ry="9" fill="#1d1416"/>
    <path d="M186,326 C226,300 270,310 286,340 L286,296 L186,296Z" fill="#2a1418" opacity=".3"/>
    <ellipse cx="228" cy="328" rx="6" ry="5" fill="#fff" opacity=".95"/>
    <circle cx="247" cy="346" r="2.4" fill="#fff" opacity=".8"/>
    <path d="M222,348 Q237,355 252,348" stroke="#fff" stroke-opacity=".3" stroke-width="3" fill="none"/>
  </g>`;
  // 애교살
  s += `<path d="M276,352 C258,366 218,366 202,346" stroke="#fff" stroke-opacity=".3" stroke-width="6" fill="none" stroke-linecap="round" filter="url(#b4)"/>`;
  s += `<path d="M276,358 C258,372 220,372 204,352" stroke="${mix(S.skinCol, '#8a5040', .5)}" stroke-opacity=".14" stroke-width="2" fill="none" stroke-linecap="round" filter="url(#b1)"/>`;
  s += `<path d="M280,345 C262,358 220,358 196,334" stroke="#7a4a44" stroke-opacity=".3" stroke-width="1.4" fill="none" stroke-linecap="round"/>`;
  if (S.glitter !== 'none') {
    const gc = S.glitter === 'pink' ? '#ffd0e0' : '#fff2cf';
    s += `<path d="M274,353 C254,368 222,368 206,350" stroke="${gc}" stroke-opacity=".85" stroke-width="5" fill="none" stroke-linecap="round" filter="url(#b1)"/>`;
    for (const [x, y, r] of [[266, 358, 1.4], [254, 362, 1], [244, 363, 1.6], [232, 362, 1], [222, 358, 1.3], [260, 361, .8], [238, 365, .8]]) s += `<circle cx="${x}" cy="${y}" r="${r}" fill="#fff" opacity=".9"/>`;
    s += sparkle(248, 364, 6);
  }
  // 윗눈꺼풀 선 · 아이라인
  const lw = S.liner === 'none' ? 2.4 : S.liner === 'natural' ? 3.4 : 4.4;
  const lc = S.liner === 'none' ? '#5a3a34' : '#2a1c1e';
  s += `<path d="M282,342 C270,314 228,304 190,330" stroke="${lc}" stroke-width="${lw}" fill="none" stroke-linecap="round"/>`;
  if (S.liner === 'puppy') s += `<path d="M199,322 C192,328 186,334 178,340 C188,339 196,336 202,330Z" fill="${lc}"/>`;
  if (S.liner === 'cat') s += `<path d="M203,318 C194,317 186,315 174,310 C182,320 190,326 197,329Z" fill="${lc}"/>`;
  // 속눈썹: 눈꼬리로 갈수록 길게
  const n = { natural: 9, volume: 14, doll: 18 }[S.lash], base = { natural: 9, volume: 12, doll: 15 }[S.lash];
  for (let i = 0; i < n; i++) {
    const t = .18 + .82 * i / (n - 1);
    const [x, y] = bez(EYE_IN, EYE_C1, EYE_C2, EYE_OUT, t);
    const L = base * (.55 + t * .7);
    const ang = -Math.PI / 2 - (.15 + t * .75);
    const ex = x + Math.cos(ang) * L, ey = y + Math.sin(ang) * L;
    s += `<path d="M${f(x)},${f(y)} Q${f(x + Math.cos(ang + .5) * L * .5)},${f(y + Math.sin(ang + .5) * L * .5)} ${f(ex)},${f(ey)}" stroke="#241819" stroke-width="${S.lash === 'doll' ? 1.8 : 1.4}" fill="none" stroke-linecap="round"/>`;
  }
  // 아래 속눈썹
  const low = S.lash === 'doll' ? [[248, 356], [232, 355], [218, 351], [206, 344]] : S.lash === 'volume' ? [[222, 352], [208, 345]] : [];
  for (const [x, y] of low) s += `<path d="M${x},${y} Q${x - 1},${y + 3} ${x - 3},${y + 6}" stroke="#3a2a2a" stroke-width="1" fill="none" stroke-linecap="round" opacity=".55"/>`;
  return s;
}
function browLeft() {
  const d = {
    straight: 'M286,286 C270,281 240,279 198,284 C228,283 260,286 286,293Z',
    soft: 'M286,288 C268,278 238,272 196,284 C228,278 262,284 286,295Z',
    arch: 'M286,290 C266,274 234,265 194,286 C226,274 262,282 286,297Z',
  }[S.brow];
  const col = BROW_COL[S.browCol][1] || mix(HAIR_COL[S.hairCol][1], '#6a5048', HAIR_COL[S.hairCol][1] === '#f2a7b4' || HAIR_COL[S.hairCol][1] === '#d8c3a5' ? .55 : .15);
  return `<path d="${d}" fill="${col}" opacity=".72" filter="url(#b1)"/>`;
}
function lips() {
  const c = LIP[S.lip][1], deep = mix(c, '#5a1020', .35), light = mix(c, '#ffffff', .35);
  const up = 'M268,458 C280,449 291,443 300,449 C309,443 320,449 332,458 C316,461 284,461 268,458Z';
  const lo = 'M268,458 C284,461 316,461 332,458 C325,475 312,483 300,483 C288,483 275,475 268,458Z';
  let s = `<g ${S.lipFin === 'blur' ? 'filter="url(#b1)"' : ''}>`;
  if (S.lipFin === 'blur') {
    // 그라데이션: 바깥은 연하게, 안쪽은 진하게
    s += `<path d="${up}" fill="${mix(c, S.skinCol, .55)}"/><path d="${lo}" fill="${mix(c, S.skinCol, .55)}"/>`;
    s += `<ellipse cx="300" cy="462" rx="24" ry="12" fill="${c}" filter="url(#b4)"/>`;
  } else {
    s += `<path d="${up}" fill="${mix(c, '#000000', .08)}"/><path d="${lo}" fill="url(#lipG)"/>`;
  }
  s += `</g><path d="M270,458 C285,462 315,462 330,458" stroke="${deep}" stroke-width="1.8" fill="none" stroke-linecap="round"/>`;
  if (S.lipFin === 'glossy') {
    s += `<path d="M284,470 C292,476 310,476 318,470" stroke="#fff" stroke-opacity=".75" stroke-width="4" fill="none" stroke-linecap="round" filter="url(#b1)"/>`;
    s += `<ellipse cx="308" cy="472" rx="5" ry="2.4" fill="#fff" opacity=".9"/><ellipse cx="286" cy="451" rx="5" ry="1.8" fill="#fff" opacity=".55"/>`;
  } else if (S.lipFin === 'matte') {
    s += `<ellipse cx="300" cy="473" rx="12" ry="4" fill="${light}" opacity=".25" filter="url(#b2)"/>`;
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
  if (A.ribbon) s += bow(176, 190, .9, false) + bow(424, 190, .9, true);
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
  const blushOp = { light: .38, normal: .58, deep: .8 }[S.blushLv];
  const contourOp = { none: 0, soft: .32, strong: .55 }[S.contour];

  let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${w}" height="${h}">
  <defs>
    <linearGradient id="bgG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${bg1}"/><stop offset="1" stop-color="${bg2}"/></linearGradient>
    <linearGradient id="hairG" gradientUnits="userSpaceOnUse" x1="0" y1="90" x2="0" y2="700"><stop offset="0" stop-color="${mix(hair, '#ffffff', .12)}"/><stop offset=".45" stop-color="${hair}"/><stop offset="1" stop-color="${mix(hair, '#000000', .22)}"/></linearGradient>
    <radialGradient id="skinG" cx=".5" cy=".42" r=".62"><stop offset="0" stop-color="${mix(skin, '#ffffff', .25)}"/><stop offset=".7" stop-color="${skin}"/><stop offset="1" stop-color="${mix(skin, '#c98a70', .25)}"/></radialGradient>
    <radialGradient id="lensG"><stop offset="0" stop-color="${mix(lens, '#ffffff', .25)}"/><stop offset=".55" stop-color="${lens}"/><stop offset="1" stop-color="${mix(lens, '#000000', .45)}"/></radialGradient>
    <linearGradient id="lipG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${mix(lip, '#000000', .1)}"/><stop offset="1" stop-color="${mix(lip, '#ffffff', .12)}"/></linearGradient>
    <radialGradient id="pearlG" cx=".35" cy=".3" r=".75"><stop offset="0" stop-color="#ffffff"/><stop offset=".6" stop-color="#f6efe8"/><stop offset="1" stop-color="#d9cfc6"/></radialGradient>
    <clipPath id="eyeClipL"><path d="${EYE_SHAPE}"/></clipPath>
    <clipPath id="faceClip"><path d="${FACE}"/></clipPath>
    ${[1, 2, 4, 8, 14].map(b => `<filter id="b${b}" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="${b}"/></filter>`).join('')}
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bgG)"/>`;
  // 배경 반짝이 · 빛망울
  for (let i = 0; i < 14; i++) s += `<circle cx="${(i * 137) % W}" cy="${(i * 89 + 40) % H}" r="${10 + (i % 4) * 8}" fill="#fff" opacity=".18" filter="url(#b4)"/>`;
  for (const [x, y, r] of [[70, 90, 12], [530, 70, 9], [548, 300, 7], [52, 380, 8], [520, 560, 10], [96, 610, 6], [470, 150, 5]]) s += sparkle(x, y, r, '#fff', .9);

  s += backHair(hair);
  // 몸은 조금 올려 목이 길어 보이지 않게
  // 옷은 위로 올린 만큼 아래 끝을 늘려 바닥까지 채운다
  s += `<g transform="translate(0,-44)">${clothes(skin, shade).replace(/,720(?=[\sZQCLa-z"])/g, ',780')}</g>`;
  s += `<path d="M272,460 C274,505 270,535 262,560 Q300,574 338,560 C330,535 326,505 328,460Z" fill="${skin}"/><path d="M272,488 Q300,532 328,488 L328,470 L272,470Z" fill="${shade}" opacity=".5" filter="url(#b8)"/>`;
  s += `<g transform="translate(0,-44)">${accessories('neck')}</g>`;
  // 귀
  s += both(`<path d="M170,322 C154,318 152,350 160,370 C166,386 174,394 180,390 Z" fill="${shade}"/>`);
  // 얼굴
  s += `<path d="${FACE}" fill="url(#skinG)"/>`;
  s += `<g clip-path="url(#faceClip)">`;
  if (contourOp) {
    const cc = mix(skin, '#7a4a3c', .55);
    s += `<g fill="${cc}" opacity="${contourOp}" filter="url(#b14)">
      <ellipse cx="176" cy="250" rx="28" ry="70"/><ellipse cx="424" cy="250" rx="28" ry="70"/>
      <ellipse cx="196" cy="430" rx="22" ry="62" transform="rotate(-24 196 430)"/><ellipse cx="404" cy="430" rx="22" ry="62" transform="rotate(24 404 430)"/>
      <ellipse cx="300" cy="530" rx="60" ry="16"/></g>
      <g fill="${cc}" opacity="${contourOp * .7}" filter="url(#b4)"><ellipse cx="287" cy="362" rx="3.5" ry="24"/><ellipse cx="313" cy="362" rx="3.5" ry="24"/></g>`;
  }
  if (bl) s += `<g fill="${bl}" opacity="${blushOp}" filter="url(#b14)"><ellipse cx="228" cy="398" rx="50" ry="26"/><ellipse cx="372" cy="398" rx="50" ry="26"/></g>`;
  if (hl) s += `<g fill="${hl}" opacity=".8" filter="url(#b4)"><ellipse cx="300" cy="362" rx="4" ry="20"/><ellipse cx="300" cy="398" rx="6" ry="4.5"/><ellipse cx="300" cy="226" rx="30" ry="20" opacity=".6"/><ellipse cx="300" cy="494" rx="11" ry="6"/><ellipse cx="300" cy="428" rx="7" ry="3"/></g>
    <g fill="${hl}" opacity=".9" filter="url(#b8)"><ellipse cx="226" cy="376" rx="30" ry="10" transform="rotate(-12 226 376)"/><ellipse cx="374" cy="376" rx="30" ry="10" transform="rotate(12 374 376)"/></g>`;
  if (sh) {
    s += both(`<g fill="${sh}" opacity=".85" filter="url(#b8)"><ellipse cx="232" cy="318" rx="46" ry="23" transform="rotate(-6 232 318)"/><ellipse cx="200" cy="326" rx="24" ry="17"/></g>`);
    s += both(`<g fill="${mix(sh, '#000000', .12)}" opacity=".6" filter="url(#b2)"><ellipse cx="216" cy="352" rx="22" ry="5" transform="rotate(16 216 352)"/></g>`);
  }
  s += `</g>`;
  // 코
  s += `<path d="M291,394 Q294,399 298,398 M309,394 Q306,399 302,398" stroke="${mix(skin, '#8a4a3e', .5)}" stroke-width="2" fill="none" stroke-linecap="round" opacity=".55" filter="url(#b1)"/>`;
  s += `<path d="M288,388 Q300,404 312,388" stroke="${mix(skin, '#9a5a4a', .4)}" stroke-width="3" fill="none" opacity=".25" filter="url(#b2)"/>`;
  // 눈썹 · 눈 · 입술
  s += both(browLeft());
  s += both(`<g transform="translate(237,336) scale(1.14) translate(-237,-336)">${eyeLeft()}</g>`);
  s += `<g transform="translate(0,-20)">${lips()}</g>`;
  s += accessories('face');
  s += frontHair(hair);
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
