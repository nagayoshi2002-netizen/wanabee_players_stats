// タイマー機能
let timerInterval;
let seconds = 0;

document.getElementById('start-timer').addEventListener('click', () => {
  clearInterval(timerInterval);
  seconds = 0;
  timerInterval = setInterval(() => {
    seconds++;
    const m = String(Math.floor(seconds / 60)).padStart(2, '0');
    const s = String(seconds % 60).padStart(2, '0');
    document.getElementById('timer').textContent = `${m}:${s}`;
  }, 1000);
});

// スコア記録
document.getElementById('record-score').addEventListener('click', () => {
  const player = document.getElementById('player-select').value;
  const time = document.getElementById('timer').textContent;
  const list = document.getElementById('score-list');

  if (player === '選手を選択') {
    alert('選手を選んでください');
    return;
  }

  const item = document.createElement('li');
  item.textContent = `${player} が ${time} に得点！`;
  list.appendChild(item);
});
