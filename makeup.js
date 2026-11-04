import { initGamePage } from './common.js?v=13';

initGamePage('makeup');

/* ---------- 고를 수 있는 것 ---------- */
const SKIN = [['아이보리', '#ffeadf'], ['라이트', '#fddcc6'], ['내추럴', '#f3c7a5'], ['허니', '#d9a27a'], ['딥', '#a8714f']];
const HAIR_STYLE = [['bob', '단발'], ['long', '긴 머리'], ['twin', '양갈래'], ['bun', '똥머리']];
const HAIR_COL = [['흑발', '#3b2b2f'], ['갈색', '#7a4a2e'], ['밀크브라운', '#b07a52'], ['금발', '#f2c75e'], ['핑크', '#ff9ec4'], ['라벤더', '#b9a2ff'], ['민트', '#7fd8c4'], ['애쉬그레이', '#9aa0ad']];
const EYE = [['초콜릿', '#6a4232'], ['블랙', '#2b2230'], ['헤이즐', '#a0702f'], ['블루', '#4b8fd9'], ['그린', '#4fae7f'], ['바이올렛', '#8a5cc9']];
const BROW = [['straight', '일자'], ['arch', '아치'], ['round', '둥근'], ['thin', '가는']];
const SHADOW = [['없음', null], ['피치핑크', '#ffa9c0'], ['코랄', '#ff9a76'], ['라일락', '#c9a0ff'], ['아이스블루', '#8fd3ff'], ['브라운', '#c99a6a'], ['로즈', '#ff6f91'], ['골드', '#f5c85a']];
const LASH = [['none', '없음'], ['natural', '자연스럽게'], ['volume', '풍성하게']];
const BLUSH = [['없음', null], ['핑크', '#ff9fb5'], ['피치', '#ffab8a'], ['로즈', '#ff7b9c'], ['라벤더', '#e0a0ff']];
const LIP = [['누드', '#e3a08c'], ['코랄', '#ff7f6e'], ['체리', '#e8324f'], ['로즈', '#d9577a'], ['핑크', '#ff8fb8'], ['플럼', '#8e3b5e'], ['오렌지', '#ff8a3d']];
const GLOSS = [['matte', '매트'], ['gloss', '촉촉 글로시']];
const ACC = [['ribbon', '🎀 리본'], ['headband', '머리띠'], ['flower', '🌼 꽃핀'], ['crown', '👑 왕관'], ['glasses', '👓 안경'], ['earring', '귀걸이']];
const STICKER = [['freckles', '주근깨'], ['heart', '💗 하트'], ['star', '⭐ 별'], ['mole', '애교점']];
const TOP = [['tee', '라운드 티'], ['blouse', '카라 블라우스'], ['hoodie', '후드티'], ['turtle', '터틀넥'], ['dress', '끈 원피스'], ['sailor', '세일러']];
const OUTFIT = [['화이트', '#ffffff'], ['핑크', '#ffd1e0'], ['스카이', '#cfe8ff'], ['민트', '#d4f2d0'], ['레몬', '#fff1a8'], ['라벤더', '#e5d4ff'], ['레드', '#ff6b7f'], ['네이비', '#3b3f66'], ['블랙', '#2e2a33']];
const PATTERN = [['plain', '무늬 없음'], ['stripe', '줄무늬'], ['dot', '물방울'], ['heart', '하트'], ['check', '체크']];
const OUTER = [['none', '없음'], ['cardigan', '가디건'], ['jacket', '재킷']];
const OUTER_COL = [['베이지', '#e9d6b9'], ['그레이', '#b9bcc8'], ['핑크', '#ffb3c8'], ['스카이', '#9fcaf5'], ['브라운', '#9a6b4f'], ['블랙', '#34303a']];
const NECK = [['none', '없음'], ['pearl', '진주'], ['heart', '하트 펜던트'], ['choker', '초커']];
const BG = [['핑크', '#fde3ef'], ['하늘', '#e1f0ff'], ['크림', '#fff3d6'], ['민트', '#e2f7e6'], ['라벤더', '#efe6ff'], ['밤하늘', '#2c2840']];

const DEFAULT = {
  skin: 1, hair: 'bob', hairCol: 1, eye: 0, brow: 'arch', shadow: 0, lash: 'natural',
  blush: 1, lip: 0, gloss: 'gloss', acc: {}, sticker: {}, bg: 0,
  top: 'blouse', outfit: 1, pattern: 'plain', outer: 'none', outerCol: 0, neck: 'none',
};
let S = structuredClone(DEFAULT);

// 탭: [이름, 구역들]. 구역: [제목, 종류, 상태 키, 목록]
const TABS = [
  ['👩 얼굴', [['피부', 'color', 'skin', SKIN], ['눈동자', 'color', 'eye', EYE]]],
  ['💇 헤어', [['스타일', 'chip', 'hair', HAIR_STYLE], ['색', 'color', 'hairCol', HAIR_COL]]],
  ['✏️ 눈썹', [['모양', 'chip', 'brow', BROW]]],
  ['👁️ 눈', [['아이섀도', 'color', 'shadow', SHADOW], ['속눈썹', 'chip', 'lash', LASH]]],
  ['🌸 볼', [['볼터치', 'color', 'blush', BLUSH]]],
  ['💋 립', [['색', 'color', 'lip', LIP], ['광택', 'chip', 'gloss', GLOSS]]],
  ['🎀 소품', [['액세서리 (여러 개)', 'multi', 'acc', ACC], ['스티커 (여러 개)', 'multi', 'sticker', STICKER]]],
  ['👗 옷', [['옷 모양', 'chip', 'top', TOP], ['옷 색', 'color', 'outfit', OUTFIT], ['무늬', 'chip', 'pattern', PATTERN]]],
  ['🧥 겉옷·목걸이', [['겉옷', 'chip', 'outer', OUTER], ['겉옷 색', 'color', 'outerCol', OUTER_COL], ['목걸이', 'chip', 'neck', NECK]]],
  ['🖼️ 배경', [['배경', 'color', 'bg', BG]]],
];
let tab = 0;

/* ---------- 색 도우미 ---------- */
function mix(hex, to, k) {
  const a = parseInt(hex.slice(1), 16), b = parseInt(to.slice(1), 16);
  const ch = s => Math.round(((a >> s) & 255) * (1 - k) + ((b >> s) & 255) * k);
  return '#' + ((1 << 24) + (ch(16) << 16) + (ch(8) << 8) + ch(0)).toString(16).slice(1);
}
const mirror = d => d.replace(/(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g, (_, x, y) => `${400 - x},${y}`);

/* ---------- 캐릭터 ---------- */
function bangs(style, col) {
  const shine = `<path d="M140,122 Q200,102 262,122" stroke="#fff" stroke-opacity=".35" stroke-width="7" fill="none" stroke-linecap="round"/>`;
  if (style === 'long') return `<path d="M84,228 C78,130 140,90 210,92 C272,94 320,136 316,224 C302,182 272,152 238,140 C222,172 164,202 112,202 C100,208 90,216 84,228Z" fill="${col}"/>${shine}`;
  if (style === 'bun') return `<path d="M84,218 C80,130 136,92 200,92 C264,92 320,130 316,218 C302,172 262,140 206,128 L200,142 L194,128 C138,140 98,172 84,218Z" fill="${col}"/>${shine}`;
  // 일자 앞머리: 끝을 동글동글하게
  let d = 'M84,216 C80,130 136,92 200,92 C264,92 320,130 316,216 C310,196 304,182 298,170';
  for (let x = 298; x > 110; x -= 23.5) d += ` Q${x - 11.75},${190} ${x - 23.5},170`;
  d += ' C100,182 90,198 84,216Z';
  return `<path d="${d}" fill="${col}"/>${shine}`;
}
function backHair(style, col) {
  const dark = mix(col, '#000000', .12);
  if (style === 'long') return `<path d="M66,222 C56,108 130,70 200,70 C270,70 344,108 334,222 L352,452 C304,474 262,462 244,442 L156,442 C138,462 96,474 48,452Z" fill="${dark}"/>`;
  if (style === 'twin') {
    const tie = '#ff8fb1';
    return `<ellipse cx="54" cy="336" rx="36" ry="76" transform="rotate(-12 54 336)" fill="${dark}"/>
      <ellipse cx="346" cy="336" rx="36" ry="76" transform="rotate(12 346 336)" fill="${dark}"/>
      <path d="M72,222 C62,116 132,80 200,80 C268,80 338,116 328,222 L322,282 L78,282Z" fill="${dark}"/>
      <circle cx="72" cy="268" r="11" fill="${tie}"/><circle cx="328" cy="268" r="11" fill="${tie}"/>`;
  }
  if (style === 'bun') return `<circle cx="200" cy="80" r="48" fill="${dark}"/><path d="M180,52 Q200,40 222,52" stroke="#fff" stroke-opacity=".3" stroke-width="6" fill="none" stroke-linecap="round"/>
      <path d="M74,222 C64,118 132,82 200,82 C268,82 336,118 326,222 L320,262 L80,262Z" fill="${dark}"/>`;
  return `<path d="M70,230 C60,118 130,78 200,78 C270,78 340,118 330,230 L338,334 C304,352 272,344 262,334 L138,334 C128,344 96,352 62,334Z" fill="${dark}"/>`;
}
function brows(shape, col) {
  const d = { straight: 'M124,207 L176,204', arch: 'M122,211 Q148,192 178,204', round: 'M124,210 Q150,196 176,210', thin: 'M122,211 Q148,193 178,204' }[shape];
  const w = shape === 'thin' ? 4 : 7;
  const c = mix(col, '#000000', .15);
  return `<path d="${d}" stroke="${c}" stroke-width="${w}" fill="none" stroke-linecap="round"/><path d="${mirror(d)}" stroke="${c}" stroke-width="${w}" fill="none" stroke-linecap="round"/>`;
}
function eye(side) {
  const m = side === 'R' ? mirror : d => d;
  const cx = side === 'R' ? 250 : 150;
  const shape = m('M123,252 Q150,222 178,248 Q177,288 150,288 Q123,288 123,252Z');
  const iris = EYE[S.eye][1];
  let s = `<clipPath id="eye${side}"><path d="${shape}"/></clipPath>
    <g clip-path="url(#eye${side})">
      <rect x="${cx - 40}" y="210" width="80" height="90" fill="#fff"/>
      <ellipse cx="${cx}" cy="262" rx="20" ry="25" fill="${iris}"/>
      <ellipse cx="${cx}" cy="250" rx="20" ry="13" fill="#000" fill-opacity=".18"/>
      <ellipse cx="${cx}" cy="264" rx="9" ry="11" fill="#2b2230"/>
      <circle cx="${cx - 7}" cy="252" r="6.5" fill="#fff"/>
      <circle cx="${cx + 7}" cy="271" r="3" fill="#fff"/>
    </g>
    <path d="${m('M121,252 Q150,222 180,247')}" stroke="#3b2b2f" stroke-width="${S.lash === 'volume' ? 6.5 : 5}" fill="none" stroke-linecap="round"/>
    <path d="${m('M132,284 Q150,292 168,284')}" stroke="#3b2b2f" stroke-opacity=".25" stroke-width="2.5" fill="none" stroke-linecap="round"/>`;
  const lashes = S.lash === 'natural' ? ['M124,249 L112,242', 'M129,242 L119,233']
    : S.lash === 'volume' ? ['M124,250 L109,244', 'M127,244 L114,235', 'M133,238 L124,227', 'M141,233 L136,222', 'M134,286 L130,293', 'M144,289 L142,296'] : [];
  for (const l of lashes) s += `<path d="${m(l)}" stroke="#3b2b2f" stroke-width="3" stroke-linecap="round"/>`;
  return s;
}
function lips() {
  const c = LIP[S.lip][1], line = mix(c, '#000000', .25);
  let s = `<path d="M176,328 Q187,317 196,321 Q200,323 204,321 Q213,317 224,328 Q200,333 176,328Z" fill="${mix(c, '#000000', .06)}"/>
    <path d="M176,328 Q200,333 224,328 Q215,348 200,348 Q185,348 176,328Z" fill="${c}"/>
    <path d="M179,328 Q200,334 221,328" stroke="${line}" stroke-width="1.6" fill="none" stroke-linecap="round"/>`;
  if (S.gloss === 'gloss') s += `<ellipse cx="207" cy="339" rx="7" ry="3.2" fill="#fff" fill-opacity=".7"/><ellipse cx="190" cy="324" rx="3.5" ry="1.6" fill="#fff" fill-opacity=".6"/>`;
  return s;
}
function heart(x, y, s, col) {
  return `<path d="M${x},${y + s * .9} C${x - s * 1.6},${y - s * .2} ${x - s * .6},${y - s * 1.3} ${x},${y - s * .4} C${x + s * .6},${y - s * 1.3} ${x + s * 1.6},${y - s * .2} ${x},${y + s * .9}Z" fill="${col}"/>`;
}
function star(x, y, r, col) {
  let d = '';
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * .45 : r;
    d += `${i ? 'L' : 'M'}${(x + Math.cos(a) * rr).toFixed(1)},${(y + Math.sin(a) * rr).toFixed(1)} `;
  }
  return `<path d="${d}Z" fill="${col}" stroke="#fff" stroke-width="2" stroke-linejoin="round"/>`;
}

/* ---------- 옷 ---------- */
const BODY = 'M86,480 C92,420 140,390 200,390 C260,390 308,420 314,480Z';
const lum = hex => { const n = parseInt(hex.slice(1), 16); return (((n >> 16) & 255) * .3 + ((n >> 8) & 255) * .59 + (n & 255) * .11) / 255; };
function patternDef(col) {
  const pc = lum(col) > .6 ? mix(col, '#000000', .14) : mix(col, '#ffffff', .35);
  const p = {
    stripe: `<pattern id="pt" width="18" height="18" patternUnits="userSpaceOnUse"><rect width="18" height="7" fill="${pc}"/></pattern>`,
    dot: `<pattern id="pt" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="5" cy="5" r="3.2" fill="${pc}"/><circle cx="15" cy="15" r="3.2" fill="${pc}"/></pattern>`,
    heart: `<pattern id="pt" width="26" height="26" patternUnits="userSpaceOnUse">${heart(7, 8, 4, pc)}${heart(20, 21, 4, pc)}</pattern>`,
    check: `<pattern id="pt" width="24" height="24" patternUnits="userSpaceOnUse"><rect width="12" height="24" fill="${pc}" fill-opacity=".55"/><rect width="24" height="12" fill="${pc}" fill-opacity=".55"/></pattern>`,
  }[S.pattern];
  return p || '';
}
function clothes(shade) {
  const col = OUTFIT[S.outfit][1], edge = mix(col, '#000000', .15), light = mix(col, '#ffffff', .55);
  const pat = S.pattern !== 'plain';
  const fillShape = d => `<path d="${d}" fill="${col}" stroke="${edge}" stroke-width="2"/>${pat ? `<path d="${d}" fill="url(#pt)"/>` : ''}`;
  let s = '';
  if (S.top === 'dress') {
    // 어깨가 드러나고 가슴 아래부터 원피스
    const dress = 'M128,480 L136,426 Q168,440 200,430 Q232,440 264,426 L272,480Z';
    s += `<path d="${BODY}" fill="${shade}"/>` + fillShape(dress);
    s += `<path d="M146,430 L160,392 M254,430 L240,392" stroke="${edge}" stroke-width="4" stroke-linecap="round"/>`;
    s += `<rect x="178" y="330" width="44" height="66" rx="18" fill="${shade}"/>`;
    return s;
  }
  if (S.top === 'hoodie') s += `<path d="M132,404 Q200,360 268,404 Q234,424 200,422 Q166,424 132,404Z" fill="${mix(col, '#000000', .1)}"/>`;
  s += fillShape(BODY);
  s += `<rect x="178" y="330" width="44" height="66" rx="18" fill="${shade}"/>`;
  if (S.top === 'turtle') {
    s += `<rect x="170" y="362" width="60" height="44" rx="14" fill="${col}" stroke="${edge}" stroke-width="2"/>`;
    for (let x = 180; x <= 220; x += 10) s += `<path d="M${x},366 L${x},402" stroke="${edge}" stroke-opacity=".35" stroke-width="2"/>`;
  } else if (S.top === 'blouse') {
    s += `<path d="M172,391 L200,426 L228,391 Q200,404 172,391Z" fill="${shade}"/>`;
    s += `<path d="M200,428 L170,390 L156,412 Q178,424 200,428Z" fill="${light}" stroke="${edge}" stroke-width="2" stroke-linejoin="round"/>`;
    s += `<path d="M200,428 L230,390 L244,412 Q222,424 200,428Z" fill="${light}" stroke="${edge}" stroke-width="2" stroke-linejoin="round"/>`;
    s += `<circle cx="200" cy="446" r="3.5" fill="${edge}"/><circle cx="200" cy="466" r="3.5" fill="${edge}"/>`;
  } else if (S.top === 'hoodie') {
    s += `<path d="M170,392 Q200,416 230,392" fill="${shade}"/>`;
    s += `<path d="M188,414 L186,452 M212,414 L214,452" stroke="#fff" stroke-width="3" stroke-linecap="round"/><circle cx="186" cy="455" r="4" fill="#fff"/><circle cx="214" cy="455" r="4" fill="#fff"/>`;
  } else if (S.top === 'sailor') {
    s += `<path d="M174,392 L200,440 L226,392 Q200,404 174,392Z" fill="${shade}"/>`;
    s += `<path d="M150,398 L200,452 L250,398 L282,414 L200,470 L118,414Z" fill="#3b3f66"/><path d="M134,412 L200,458 L266,412" stroke="#fff" stroke-width="3" fill="none"/>`;
    s += `<path d="M200,452 L184,476 L196,474 L200,462 L204,474 L216,476Z" fill="#ff5c7a"/><circle cx="200" cy="452" r="6" fill="#ff5c7a"/>`;
  } else {
    s += `<path d="M168,391 Q200,418 232,391" fill="${shade}" stroke="${edge}" stroke-width="2"/>`;
  }
  return s;
}
function outer() {
  if (S.outer === 'none') return '';
  const c = OUTER_COL[S.outerCol][1], edge = mix(c, '#000000', .2);
  const L = 'M86,480 C92,420 132,394 168,392 L186,480Z';
  let s = `<path d="${L}" fill="${c}" stroke="${edge}" stroke-width="2"/><path d="${mirror(L)}" fill="${c}" stroke="${edge}" stroke-width="2"/>`;
  if (S.outer === 'jacket') {
    const lap = 'M168,392 L190,444 L176,450 L150,402Z';
    s += `<path d="${lap}" fill="${mix(c, '#000000', .12)}" stroke="${edge}" stroke-width="2" stroke-linejoin="round"/><path d="${mirror(lap)}" fill="${mix(c, '#000000', .12)}" stroke="${edge}" stroke-width="2" stroke-linejoin="round"/>`;
  } else {
    for (const y of [430, 452, 474]) s += `<circle cx="${182 - (480 - y) * .06}" cy="${y}" r="3.5" fill="${edge}"/>`;
    s += `<path d="M172,396 L186,480 M228,396 L214,480" stroke="${mix(c, '#ffffff', .4)}" stroke-width="3"/>`;
  }
  return s;
}
function necklace() {
  if (S.neck === 'choker') return `<rect x="176" y="368" width="48" height="9" rx="4" fill="#2e2a33"/><circle cx="200" cy="378" r="4" fill="#ffd84d"/>`;
  if (S.neck === 'pearl') {
    let s = '';
    for (let i = 0; i <= 10; i++) { const t = i / 10, x = 172 + 56 * t, y = 392 + Math.sin(t * Math.PI) * 24; s += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3.6" fill="#fffaf2" stroke="#e6d9cf" stroke-width="1"/>`; }
    return s;
  }
  if (S.neck === 'heart') return `<path d="M174,392 Q200,424 226,392" stroke="#e0a800" stroke-width="1.6" fill="none"/>${heart(200, 414, 6, '#ff5c7a')}`;
  return '';
}

function svg(w = 400, h = 480) {
  const skin = SKIN[S.skin][1], hair = HAIR_COL[S.hairCol][1], shade = mix(skin, '#c97a5a', .25);
  const bg = BG[S.bg][1], dots = S.bg === 5 ? '#ffffff' : mix(bg, '#ffffff', .6);
  let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 480" width="${w}" height="${h}">
  <defs>
    <radialGradient id="sh"><stop offset="0" stop-color="${SHADOW[S.shadow][1] || '#fff'}" stop-opacity=".85"/><stop offset="1" stop-color="${SHADOW[S.shadow][1] || '#fff'}" stop-opacity="0"/></radialGradient>
    ${patternDef(OUTFIT[S.outfit][1])}
    <radialGradient id="bl"><stop offset="0" stop-color="${BLUSH[S.blush][1] || '#fff'}" stop-opacity=".75"/><stop offset="1" stop-color="${BLUSH[S.blush][1] || '#fff'}" stop-opacity="0"/></radialGradient>
  </defs>
  <rect width="400" height="480" fill="${bg}"/>`;
  for (let i = 0; i < 26; i++) {
    const x = (i * 97) % 400, y = (i * 61) % 480;
    s += S.bg === 5 ? star(x, y, 3 + (i % 3), '#fff6b0') : `<circle cx="${x}" cy="${y}" r="${4 + (i % 3) * 2}" fill="${dots}" fill-opacity=".8"/>`;
  }
  s += backHair(S.hair, hair);
  // 몸 · 목
  s += clothes(shade) + outer() + necklace();
  // 귀 · 얼굴
  s += `<ellipse cx="84" cy="242" rx="17" ry="23" fill="${shade}"/><ellipse cx="316" cy="242" rx="17" ry="23" fill="${shade}"/>
    <path d="M82,220 C82,140 140,104 200,104 C260,104 318,140 318,220 C318,300 270,362 200,362 C130,362 82,300 82,220Z" fill="${skin}"/>`;
  if (SHADOW[S.shadow][1]) s += `<ellipse cx="150" cy="240" rx="40" ry="27" fill="url(#sh)"/><ellipse cx="250" cy="240" rx="40" ry="27" fill="url(#sh)"/>`;
  if (BLUSH[S.blush][1]) s += `<ellipse cx="124" cy="304" rx="30" ry="17" fill="url(#bl)"/><ellipse cx="276" cy="304" rx="30" ry="17" fill="url(#bl)"/>`;
  s += eye('L') + eye('R');
  s += brows(S.brow, hair);
  s += `<path d="M195,298 Q200,302 205,298" stroke="${mix(skin, '#8a4a3a', .45)}" stroke-width="3" fill="none" stroke-linecap="round"/>`;
  s += lips();
  // 스티커
  if (S.sticker.freckles) for (const [x, y] of [[118, 292], [130, 286], [126, 300], [140, 296], [282, 292], [270, 286], [274, 300], [260, 296]]) s += `<circle cx="${x}" cy="${y}" r="2.4" fill="#b8754f" fill-opacity=".6"/>`;
  if (S.sticker.heart) s += heart(292, 318, 9, '#ff6f91');
  if (S.sticker.star) s += star(106, 292, 10, '#ffd84d');
  if (S.sticker.mole) s += `<circle cx="232" cy="340" r="2.8" fill="#5b3a2e"/>`;
  s += bangs(S.hair, hair);
  // 액세서리
  if (S.acc.earring) s += `<circle cx="84" cy="270" r="6" fill="#ffd84d" stroke="#e0a800" stroke-width="1.5"/><circle cx="84" cy="284" r="5" fill="#ff8fb1"/><circle cx="316" cy="270" r="6" fill="#ffd84d" stroke="#e0a800" stroke-width="1.5"/><circle cx="316" cy="284" r="5" fill="#ff8fb1"/>`;
  if (S.acc.headband) s += `<path d="M90,196 C88,118 148,86 200,86 C252,86 312,118 310,196" stroke="#ff8fb1" stroke-width="13" fill="none" stroke-linecap="round"/><path d="M106,150 C126,108 170,94 200,94" stroke="#fff" stroke-opacity=".5" stroke-width="3" fill="none" stroke-linecap="round"/>`;
  if (S.acc.crown) s += `<path d="M156,104 L162,62 L182,84 L200,52 L218,84 L238,62 L244,104 Q200,96 156,104Z" fill="#ffd84d" stroke="#e0a800" stroke-width="3" stroke-linejoin="round"/><circle cx="200" cy="88" r="6" fill="#ff6f91"/><circle cx="174" cy="94" r="4" fill="#7fc8ff"/><circle cx="226" cy="94" r="4" fill="#7fc8ff"/>`;
  if (S.acc.ribbon) s += `<g transform="rotate(18 296 126)"><path d="M296,126 L252,100 Q246,126 254,150Z" fill="#ff6f91"/><path d="M296,126 L340,100 Q346,126 338,150Z" fill="#ff6f91"/><path d="M262,110 L280,124" stroke="#fff" stroke-opacity=".5" stroke-width="3" stroke-linecap="round"/><circle cx="296" cy="126" r="11" fill="#ff4f7b"/></g>`;
  if (S.acc.flower) {
    s += '<g>';
    for (let i = 0; i < 5; i++) { const a = i * Math.PI * 2 / 5 - Math.PI / 2; s += `<circle cx="${(104 + Math.cos(a) * 13).toFixed(1)}" cy="${(158 + Math.sin(a) * 13).toFixed(1)}" r="11" fill="#fff" stroke="#ffd1e0" stroke-width="2"/>`; }
    s += `<circle cx="104" cy="158" r="8" fill="#ffd84d"/></g>`;
  }
  if (S.acc.glasses) s += `<g fill="#ffffff" fill-opacity=".14" stroke="#5b4466" stroke-width="4"><circle cx="150" cy="258" r="36"/><circle cx="250" cy="258" r="36"/></g><path d="M186,252 Q200,243 214,252" stroke="#5b4466" stroke-width="4" fill="none"/><path d="M114,250 L92,238 M286,250 L308,238" stroke="#5b4466" stroke-width="4" stroke-linecap="round"/>`;
  return s + '</svg>';
}

/* ---------- 화면 ---------- */
const stage = document.getElementById('face');
const tabsEl = document.getElementById('tabs'), optsEl = document.getElementById('opts');

function paint() { stage.innerHTML = svg(); }
function paintTools() {
  tabsEl.innerHTML = TABS.map(([name], i) => `<button type="button" class="tab ${i === tab ? 'on' : ''}" data-tab="${i}">${name}</button>`).join('');
  optsEl.innerHTML = TABS[tab][1].map(([title, kind, key, list]) => {
    const items = list.map((item, i) => {
      if (kind === 'color') {
        const [label, col] = item, on = S[key] === i;
        return `<button type="button" class="swatch ${col ? '' : 'none'} ${on ? 'on' : ''}" style="${col ? `background:${col}` : ''}" data-key="${key}" data-val="${i}" title="${label}" aria-label="${label}"></button>`;
      }
      const [val, label] = item;
      const on = kind === 'multi' ? !!S[key][val] : S[key] === val;
      return `<button type="button" class="chip ${on ? 'on' : ''}" data-key="${key}" data-val="${val}" data-multi="${kind === 'multi' ? 1 : ''}">${label}</button>`;
    }).join('');
    return `<div class="opt-sec"><h3>${title}</h3><div class="sw">${items}</div></div>`;
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
document.getElementById('rand').addEventListener('click', () => {
  S = {
    skin: pick(SKIN), hair: HAIR_STYLE[pick(HAIR_STYLE)][0], hairCol: pick(HAIR_COL), eye: pick(EYE), brow: BROW[pick(BROW)][0],
    shadow: pick(SHADOW), lash: LASH[pick(LASH)][0], blush: pick(BLUSH), lip: pick(LIP), gloss: GLOSS[pick(GLOSS)][0],
    acc: {}, sticker: {}, bg: pick(BG),
    top: TOP[pick(TOP)][0], outfit: pick(OUTFIT), pattern: Math.random() < .5 ? 'plain' : PATTERN[pick(PATTERN)][0],
    outer: Math.random() < .6 ? 'none' : OUTER[1 + pick([1, 2])][0], outerCol: pick(OUTER_COL),
    neck: Math.random() < .5 ? 'none' : NECK[pick(NECK)][0],
  };
  // 소품은 0~2개만
  for (let i = 0, n = Math.floor(Math.random() * 3); i < n; i++) S.acc[ACC[pick(ACC)][0]] = true;
  if (Math.random() < .4) S.sticker[STICKER[pick(STICKER)][0]] = true;
  paint(); paintTools();
});
document.getElementById('reset').addEventListener('click', () => { S = structuredClone(DEFAULT); paint(); paintTools(); });
document.getElementById('save').addEventListener('click', async () => {
  const img = new Image();
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg(800, 960));
  await img.decode();
  const c = document.createElement('canvas'); c.width = 800; c.height = 960;
  c.getContext('2d').drawImage(img, 0, 0);
  c.toBlob(blob => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = '메이크업룸.png';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }, 'image/png');
});

paint(); paintTools();
