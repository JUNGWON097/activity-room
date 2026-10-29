import { initGamePage, showResult } from './common.js?v=9';

initGamePage('duel');

const ROUNDS = 5, FOUL_MS = 1000, MIN_HUMAN = 90;
const stage = document.getElementById('duel');
const tEl = document.getElementById('t'), sEl = document.getElementById('s');
const roundsEl = document.getElementById('rounds');

let state = 'idle';           // idle → wait → fire → between → … → done
let rounds = [], timer = null, fireAt = 0;

function paint(t, s, cls = '') {
  tEl.textContent = t; sEl.textContent = s;
  stage.classList.remove('fire', 'foul');
  if (cls) stage.classList.add(cls);
}
function paintRounds() {
  roundsEl.innerHTML = Array.from({ length: ROUNDS }, (_, i) => {
    const r = rounds[i];
    if (r) return `<span class="${r.foul ? 'bad' : ''}">${r.foul ? '부정출발' : r.ms + 'ms'}</span>`;
    return `<span class="${i === rounds.length && state !== 'done' ? 'now' : ''}">${i + 1}판</span>`;
  }).join('');
}

function start() {
  rounds = []; nextRound();
}
function nextRound() {
  if (rounds.length >= ROUNDS) return finish();
  state = 'wait';
  paint('준비…', '신호를 기다리세요');
  paintRounds();
  timer = setTimeout(() => {
    state = 'fire';
    fireAt = performance.now();
    paint('쏴!', '');
  }, 1500 + Math.random() * 3000);
}
function press(ts) {
  if (state === 'idle') return start();
  if (state === 'wait') {
    clearTimeout(timer);
    rounds.push({ ms: FOUL_MS, foul: true });
    state = 'between';
    paint('부정출발!', `이번 판은 ${FOUL_MS}ms로 처리돼요`, 'foul');
    paintRounds();
    setTimeout(nextRound, 1400);
    return;
  }
  if (state === 'fire') {
    const ms = Math.round(ts - fireAt);
    const foul = ms < MIN_HUMAN;   // 사람이 반응할 수 없는 속도 = 미리 누른 것
    rounds.push(foul ? { ms: FOUL_MS, foul: true } : { ms });
    state = 'between';
    if (foul) paint('부정출발!', '신호보다 먼저 누른 것으로 봐요', 'foul');
    else paint(`${ms}ms`, ms < 200 ? '번개 같은 손!' : ms < 260 ? '빠르다!' : ms < 330 ? '괜찮아요' : '조금 느렸어요');
    paintRounds();
    setTimeout(nextRound, 1200);
  }
}
function finish() {
  state = 'done';
  paintRounds();
  const avg = Math.round(rounds.reduce((a, r) => a + r.ms, 0) / ROUNDS);
  const fouls = rounds.filter(r => r.foul).length;
  const best = Math.min(...rounds.filter(r => !r.foul).map(r => r.ms));
  paint(`평균 ${avg}ms`, '');
  showResult('duel', avg, {
    detail: `${Number.isFinite(best) ? `최고 ${best}ms` : ''}${fouls ? ` · 부정출발 ${fouls}회` : ''}`,
    extra: { rounds: rounds.map(r => r.ms), fouls },
    onRetry: () => { state = 'idle'; start(); },
  });
}

stage.addEventListener('mousedown', e => { if (e.button === 0) press(performance.now()); });
document.addEventListener('keydown', e => {
  if (e.repeat || document.querySelector('.overlay')) return;
  if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); press(performance.now()); }
});
paintRounds();
