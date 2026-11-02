const $ = id => document.getElementById(id);
const token = () => Array.from(crypto.getRandomValues(new Uint8Array(24)), n => n.toString(16).padStart(2, '0')).join('');
const read = key => { try { return localStorage.getItem(key); } catch { return null; } };
const save = (key, value) => { try { localStorage.setItem(key, value); } catch {} };
let room = location.hash.slice(1);
const senderKey = document.body.dataset.responder === 'true' ? 'chat-responder' : 'chat-sender';
const sender = read(senderKey) || token();
save(senderKey, sender);
let signature = '', sending = false, pending = null;

function setConnection(online) {
  document.body.dataset.connection = online ? 'online' : 'offline';
  $('status').textContent = online ? 'Conectado · histórico salvo' : 'Reconectando…';
}
function showEmpty() {
  $('messages').replaceChildren($('empty-state').content.cloneNode(true));
}
async function connect() {
  if (!/^[a-f0-9]{48}$/.test(room)) {
    const response = await fetch('/api/conversation', { cache: 'no-store' });
    if (!response.ok) throw Error();
    const conversation = await response.json();
    if (!/^[a-f0-9]{48}$/.test(conversation.room || '')) throw Error();
    room = conversation.room;
  }
  save('chat-room', room);
}
async function refresh() {
  try {
    const response = await fetch('/api/messages', { headers: { 'X-Chat-Room': room }, cache: 'no-store' });
    if (!response.ok) throw Error();
    const messages = await response.json();
    if (!Array.isArray(messages)) throw Error();
    const next = JSON.stringify(messages);
    if (signature !== next) {
      const list = $('messages');
      const nearBottom = list.scrollHeight - list.scrollTop - list.clientHeight < 100;
      if (messages.length) {
        const fragment = document.createDocumentFragment();
        let previousDay = '';
        for (const message of messages) {
          const date = new Date(message.time);
          const day = date.toLocaleDateString('pt-BR');
          if (day !== previousDay) {
            const separator = document.createElement('div');
            separator.className = 'date-label';
            separator.textContent = date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
            fragment.append(separator);
            previousDay = day;
          }
          const bubble = document.createElement('article');
          bubble.className = 'bubble' + (message.sender === sender ? ' mine' : '');
          const text = document.createElement('p');
          text.textContent = message.text;
          const time = document.createElement('time');
          time.dateTime = message.time;
          time.textContent = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
          time.title = date.toLocaleString('pt-BR');
          bubble.append(text, time);
          fragment.append(bubble);
        }
        list.replaceChildren(fragment);
      } else {
        showEmpty();
      }
      if (nearBottom || !signature) list.scrollTop = list.scrollHeight;
      signature = next;
    }
    setConnection(true);
  } catch { setConnection(false); }
}
$('composer').addEventListener('submit', async event => {
  event.preventDefault();
  if (sending) return;
  const text = $('text').value.trim();
  const name = 'Participante';
  if (!/^[a-f0-9]{48}$/.test(room)) {
    $('notice').textContent = 'Aguarde a conexão para enviar sua mensagem.';
    return;
  }
  if (!text) return;
  sending = true;
  $('send').disabled = true;
  $('notice').textContent = '';
  if (!pending || pending.text !== text || pending.name !== name) pending = { id: token(), name, text, sender };
  try {
    const response = await fetch('/api/messages', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Chat-Room': room }, body: JSON.stringify(pending) });
    if (!response.ok) throw Error();
    if ($('text').value.trim() === text) {
      $('text').value = '';
      $('text').style.height = 'auto';
    }
    pending = null;
    await refresh();
    $('messages').scrollTop = $('messages').scrollHeight;
  } catch {
    $('notice').textContent = 'Não foi possível confirmar o envio. Sua mensagem está aqui; tente novamente.';
  } finally {
    sending = false;
    $('send').disabled = false;
    $('text').focus();
  }
});
$('text').addEventListener('keydown', event => {
  if (event.key === 'Enter' && !event.shiftKey && !event.isComposing && matchMedia('(pointer: fine)').matches) {
    event.preventDefault();
    $('composer').requestSubmit();
  }
});
$('text').addEventListener('input', () => {
  const field = $('text');
  field.style.height = 'auto';
  field.style.height = Math.min(field.scrollHeight, 130) + 'px';
});
function fitViewport() {
  if (window.visualViewport) document.documentElement.style.setProperty('--chat-height', window.visualViewport.height + 'px');
}
window.visualViewport?.addEventListener('resize', fitViewport);
fitViewport();

// Embedded chat controls the existing track; direct links have their own player.
let chatAudio;
try {
  if (window.parent !== window) chatAudio = window.parent.document.getElementById('loveSong');
} catch {}
if (!chatAudio) {
  chatAudio = document.createElement('audio');
  chatAudio.src = 'assets/audio/grupo-5-el-secreto.mp3';
  chatAudio.loop = true;
  chatAudio.preload = 'none';
  chatAudio.volume = .72;
  document.body.append(chatAudio);
}
const musicToggle = $('music-toggle');
function syncMusicButton() {
  const playing = !chatAudio.paused;
  const label = playing ? 'Pausar música' : 'Reproduzir música';
  $('music-label').textContent = playing ? 'Pausar' : 'Reproduzir';
  musicToggle.dataset.playing = String(playing);
  musicToggle.setAttribute('aria-label', label);
  musicToggle.title = label;
}
chatAudio.addEventListener('play', syncMusicButton);
chatAudio.addEventListener('pause', syncMusicButton);
chatAudio.addEventListener('ended', syncMusicButton);
window.addEventListener('pagehide', () => {
  chatAudio.removeEventListener('play', syncMusicButton);
  chatAudio.removeEventListener('pause', syncMusicButton);
  chatAudio.removeEventListener('ended', syncMusicButton);
});
musicToggle.addEventListener('click', async () => {
  if (!chatAudio.paused) { chatAudio.pause(); return; }
  try { await chatAudio.play(); }
  catch { $('notice').textContent = 'Não foi possível tocar a música. Toque novamente para tentar.'; }
  syncMusicButton();
});
syncMusicButton();
showEmpty();
if (location.protocol === 'file:') $('notice').textContent = 'Abra o chat pelo endereço do site para se conectar.';
async function poll() {
  try {
    if (!/^[a-f0-9]{48}$/.test(room)) await connect();
    await refresh();
  } catch { setConnection(false); }
  setTimeout(poll, 2000);
}
poll();
