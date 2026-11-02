'use strict';
const landing = document.getElementById('landing');
const loveSong = document.getElementById('loveSong');
const musicButton = document.getElementById('home-music');
const openButton = document.querySelector('a[href="chat.html"]');
let chatFrame = null;
loveSong.volume = .72;
function updateMusic() {
  musicButton.classList.toggle('is-playing', !loveSong.paused);
  musicButton.setAttribute('aria-label', loveSong.paused ? 'Reproduzir música' : 'Pausar música');
  musicButton.querySelector('span').textContent = loveSong.paused ? 'Música' : 'Pausar música';
}
async function startMusic() { try { await loveSong.play(); } catch { updateMusic(); } }
musicButton.addEventListener('click', () => loveSong.paused ? startMusic() : loveSong.pause());
loveSong.addEventListener('play', updateMusic);
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
  startMusic();
  if (location.hash !== '#chat') history.pushState(null, '', '#chat');
  showChat();
});
addEventListener('popstate', () => location.hash === '#chat' ? showChat() : closeChat());
if (location.hash === '#chat') showChat();
updateMusic();
startMusic();
