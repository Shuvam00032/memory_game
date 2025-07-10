const board = document.getElementById('board');
const movesSpan = document.getElementById('moves');
const timerSpan = document.getElementById('timer');
const restartBtn = document.getElementById('restart');
const audioFlip = document.getElementById('audio-flip');
const audioMatch = document.getElementById('audio-match');
const audioWin = document.getElementById('audio-win');
const winModal = document.getElementById('win-modal');
const winStats = document.getElementById('win-stats');
const playAgainBtn = document.getElementById('play-again');
const leaderboardDiv = document.getElementById('leaderboard');
const themeToggle = document.getElementById('theme-toggle');
const difficultySelect = document.getElementById('difficulty');
const cardTypeToggle = document.getElementById('card-type-toggle');

let moves = 0;
let timer = 0;
let timerInterval = null;
let firstCard = null;
let secondCard = null;
let lockBoard = false;
let matchedPairs = 0;

let theme = localStorage.getItem('theme') || 'dark';

const CARD_EMOJIS = [
  '🍕', '🎩', '🚗', '🐶', '🌈', '🎲', '🎸', '🦄',
  '🍔', '🍦', '🎮', '🚀', '🐱', '🌟', '🎹', '🧩'
];
const IMAGE_URLS = [
  'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=facearea&w=80&h=80',
  'https://images.unsplash.com/photo-1519125323398-675f0ddb6308?auto=format&fit=facearea&w=80&h=80',
  'https://images.unsplash.com/photo-1465101046530-73398c7f28ca?auto=format&fit=facearea&w=80&h=80',
  'https://images.unsplash.com/photo-1502082553048-f009c37129b9?auto=format&fit=facearea&w=80&h=80',
  'https://images.unsplash.com/photo-1518717758536-85ae29035b6d?auto=format&fit=facearea&w=80&h=80',
  'https://images.unsplash.com/photo-1519985176271-adb1088fa94c?auto=format&fit=facearea&w=80&h=80',
  'https://images.unsplash.com/photo-1465101178521-c1a9136a3b99?auto=format&fit=facearea&w=80&h=80',
  'https://images.unsplash.com/photo-1465101046530-73398c7f28ca?auto=format&fit=facearea&w=80&h=80',
  'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=facearea&w=80&h=80',
  'https://images.unsplash.com/photo-1519125323398-675f0ddb6308?auto=format&fit=facearea&w=80&h=80',
  'https://images.unsplash.com/photo-1518717758536-85ae29035b6d?auto=format&fit=facearea&w=80&h=80',
  'https://images.unsplash.com/photo-1519985176271-adb1088fa94c?auto=format&fit=facearea&w=80&h=80'
];

let useImages = false;

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
  const secs = (seconds % 60).toString().padStart(2, '0');
  return `${mins}:${secs}`;
}

function startTimer() {
  timerInterval = setInterval(() => {
    timer++;
    timerSpan.textContent = `Time: ${formatTime(timer)}`;
  }, 1000);
}

function stopTimer() {
  if (timerInterval) clearInterval(timerInterval);
}

function playSound(audio) {
  if (audio) {
    audio.currentTime = 0;
    audio.play();
  }
}

function showModal(moves, time) {
  winStats.textContent = `Moves: ${moves}, Time: ${formatTime(time)}`;
  winModal.classList.remove('hidden');
  updateLeaderboard(moves, time);
}

function hideModal() {
  winModal.classList.add('hidden');
}

function updateLeaderboard(moves, time) {
  let best = JSON.parse(localStorage.getItem('memory-best')) || null;
  let updated = false;
  if (!best || moves < best.moves || (moves === best.moves && time < best.time)) {
    best = { moves, time };
    localStorage.setItem('memory-best', JSON.stringify(best));
    updated = true;
  }
  leaderboardDiv.innerHTML = best ? `<h3>🏆 Best Score</h3><p>Moves: ${best.moves}<br>Time: ${formatTime(best.time)}</p>${updated ? '<p>New Record!</p>' : ''}` : '';
}

function animateShuffle() {
  const cards = document.querySelectorAll('.card');
  cards.forEach((card, i) => {
    card.style.transform = `scale(0.7) rotate(${Math.random()*20-10}deg)`;
    card.style.opacity = '0.5';
    setTimeout(() => {
      card.style.transform = '';
      card.style.opacity = '1';
    }, 400 + i*30);
  });
}

function setTheme(newTheme) {
  document.body.classList.toggle('light', newTheme === 'light');
  themeToggle.classList.toggle('light', newTheme === 'light');
  theme = newTheme;
  localStorage.setItem('theme', theme);
  themeToggle.textContent = theme === 'light' ? '🌞' : '🌙';
}

themeToggle.addEventListener('click', () => {
  setTheme(theme === 'dark' ? 'light' : 'dark');
});

function createCard(cardValue, index) {
  const card = document.createElement('div');
  card.classList.add('card');
  card.dataset.value = cardValue;
  card.dataset.index = index;
  // Ensure correct structure for smooth flipping
  const cardInner = document.createElement('div');
  cardInner.classList.add('card-inner');
  const cardFront = document.createElement('div');
  cardFront.classList.add('card-front');
  if (useImages) {
    cardFront.innerHTML = `<img src="${cardValue}" alt="img" style="width:100%;height:100%;border-radius:12px;object-fit:cover;">`;
  } else {
    cardFront.textContent = cardValue;
  }
  const cardBack = document.createElement('div');
  cardBack.classList.add('card-back');
  cardBack.textContent = '?';
  cardInner.appendChild(cardFront);
  cardInner.appendChild(cardBack);
  card.appendChild(cardInner);
  card.addEventListener('click', () => handleCardClick(card));
  console.log(card.outerHTML);
  return card;
}

function handleCardClick(card) {
  if (lockBoard || card.classList.contains('flipped') || card.classList.contains('matched') || card === firstCard) return;

  // Force repaint before flipping
  card.offsetWidth;
  requestAnimationFrame(() => {
    card.classList.add('flipped');
  });
  playSound(audioFlip);

  if (!firstCard) {
    firstCard = card;
    firstCard.classList.add('waiting');
    if (moves === 0 && timer === 0) startTimer();
    return;
  }

  secondCard = card;
  moves++;
  movesSpan.textContent = `Moves: ${moves}`;
  firstCard.classList.remove('waiting');

  if (firstCard.dataset.value === secondCard.dataset.value) {
    matchedPairs++;
    playSound(audioMatch);
    firstCard.classList.add('matched');
    secondCard.classList.add('matched');
    firstCard = null;
    secondCard = null;
    if (matchedPairs === cardSetSize) {
      stopTimer();
      setTimeout(() => {
        playSound(audioWin);
        showModal(moves, timer);
      }, 500);
    }
    return;
  }

  lockBoard = true;
  const flipStart = Date.now();
  setTimeout(() => {
    console.log('Flipping back:', firstCard, secondCard, 'Elapsed:', Date.now() - flipStart, 'ms');
    firstCard.classList.remove('flipped', 'waiting');
    secondCard.classList.remove('flipped');
    firstCard = null;
    secondCard = null;
    lockBoard = false;
  }, 1200);
}

function startGame() {
  moves = 0;
  timer = 0;
  matchedPairs = 0;
  firstCard = null;
  secondCard = null;
  lockBoard = false;
  movesSpan.textContent = 'Moves: 0';
  timerSpan.textContent = 'Time: 00:00';
  stopTimer();
  hideModal();
  // Get difficulty
  cardSetSize = parseInt(difficultySelect.value, 10);
  // Prepare and shuffle cards
  let cards = (useImages ? IMAGE_URLS : CARD_EMOJIS).slice(0, cardSetSize);
  cards = [...cards, ...cards];
  shuffle(cards);
  // Adjust board grid
  let cols = cardSetSize <= 6 ? 3 : cardSetSize <= 8 ? 4 : 6;
  let rows = Math.ceil((cardSetSize * 2) / cols);
  board.style.gridTemplateColumns = `repeat(${cols}, 80px)`;
  board.style.gridTemplateRows = `repeat(${rows}, 80px)`;
  // Clear board
  board.innerHTML = '';
  // Render cards
  cards.forEach((val, idx) => {
    const card = createCard(val, idx);
    board.appendChild(card);
  });
  setTimeout(animateShuffle, 100);
}

difficultySelect.addEventListener('change', startGame);
cardTypeToggle.addEventListener('click', () => {
  useImages = !useImages;
  cardTypeToggle.classList.toggle('active', useImages);
  cardTypeToggle.textContent = useImages ? '😀 Emojis' : '🖼️ Images';
  startGame();
});
restartBtn.addEventListener('click', startGame);
playAgainBtn.addEventListener('click', startGame);
window.onclick = function(e) {
  if (e.target === winModal) hideModal();
};
window.onload = () => {
  setTheme(theme);
  startGame();
}; 