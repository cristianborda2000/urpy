'use strict';
const landing = document.getElementById('landing');
const loveSong = document.getElementById('loveSong');
const musicButton = document.getElementById('home-music');
const openButton = document.querySelector('a[href="chat.html"]');
let chatFrame = null;
let hasPlayed = !loveSong.paused;
let needsGesture = false;
loveSong.volume = .72;
function updateMusic() {
  const playing = !loveSong.paused;
  musicButton.classList.toggle('is-playing', playing);
  const label = playing ? 'Pausar música' : 'Reproduzir música';
  musicButton.setAttribute('aria-label', label);
  musicButton.title = needsGesture ? 'Toque para ativar a música' : label;
  musicButton.querySelector('span').textContent = playing ? 'Pausar música' : needsGesture ? 'Ativar música' : 'Música';
}
function stopGestureListeners() {
  document.removeEventListener('click', unlockMusic);
  document.removeEventListener('touchend', unlockMusic);
  document.removeEventListener('keydown', unlockMusic);
}
async function startMusic() {
  try {
    await loveSong.play();
    hasPlayed = true;
    needsGesture = false;
    stopGestureListeners();
  } catch (error) {
    // Sound autoplay can require an actual visitor gesture, especially on phones.
    needsGesture = error.name === 'NotAllowedError';
  }
  updateMusic();
}
function unlockMusic(event) {
  if (hasPlayed || musicButton.contains(event.target)) return;
  if (event.type === 'keydown' && (event.repeat || event.ctrlKey || event.metaKey || event.altKey || ['Shift', 'Control', 'Alt', 'Meta', 'Escape', 'Tab'].includes(event.key))) return;
  startMusic();
}
document.addEventListener('click', unlockMusic);
document.addEventListener('touchend', unlockMusic, { passive: true });
document.addEventListener('keydown', unlockMusic);
musicButton.addEventListener('click', () => loveSong.paused ? startMusic() : loveSong.pause());
loveSong.addEventListener('play', () => {
  hasPlayed = true;
  needsGesture = false;
  stopGestureListeners();
  updateMusic();
});
loveSong.addEventListener('pause', updateMusic);
function showChat() {
  if (chatFrame) return;
  landing.hidden = true;
  document.body.classList.add('chat-open');
  chatFrame = document.createElement('iframe');
  chatFrame.src = 'chat.html';
  chatFrame.title = 'Conversa';
  chatFrame.className = 'chat-screen';
  document.body.append(chatFrame);
  chatFrame.addEventListener('load', () => chatFrame?.focus());
}
function closeChat() {
  if (!chatFrame) return;
  chatFrame.remove(); chatFrame = null;
  landing.hidden = false;
  document.body.classList.remove('chat-open');
  openButton.focus();
}
openButton.addEventListener('click', event => {
  if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  if (!hasPlayed) startMusic();
  if (location.hash !== '#chat') history.pushState(null, '', '#chat');
  showChat();
});
addEventListener('popstate', () => location.hash === '#chat' ? showChat() : closeChat());
if (location.hash === '#chat') showChat();
updateMusic();
startMusic();
