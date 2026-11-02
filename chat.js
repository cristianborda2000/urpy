const $=id=>document.getElementById(id),token=()=>Array.from(crypto.getRandomValues(new Uint8Array(24)),n=>n.toString(16).padStart(2,'0')).join('');
const read=k=>{try{return localStorage.getItem(k)}catch{return null}},save=(k,v)=>{try{localStorage.setItem(k,v)}catch{}};
let room=location.hash.slice(1);
async function connect(){if(!/^[a-f0-9]{48}$/.test(room)){const response=await fetch('/api/conversation');if(!response.ok)throw Error();room=(await response.json()).room;}save('chat-room',room);}
const senderKey=document.body.dataset.responder==='true'?'chat-responder':'chat-sender';
const sender=read(senderKey)||token();save(senderKey,sender);
let signature='',sending=false,pending=null;
async function refresh(){try{const r=await fetch('/api/messages',{headers:{'X-Chat-Room':room},cache:'no-store'});if(!r.ok)throw Error();const messages=await r.json(),next=JSON.stringify(messages);if(signature!==next){const list=$('messages'),bottom=list.scrollHeight-list.scrollTop-list.clientHeight<100;if(messages.length){const fragment=document.createDocumentFragment();for(const m of messages){const bubble=document.createElement('article');bubble.className='bubble'+(m.sender===sender?' mine':'');const name=document.createElement('strong');name.textContent=m.sender===sender?'Você':'Meu bem';const text=document.createElement('p');text.textContent=m.text;const time=document.createElement('time');time.dateTime=m.time;time.textContent=new Date(m.time).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});bubble.append(text,time);fragment.append(bubble)}list.replaceChildren(fragment)}else{list.replaceChildren();const empty=document.createElement('div');empty.className='empty';const hint=document.createElement('p');hint.textContent='Escreva sua primeira mensagem.';empty.append(hint);list.append(empty)}if(bottom||!signature)list.scrollTop=list.scrollHeight;signature=next}$('status').textContent='Conectado · histórico salvo'}catch{$('status').textContent='Sem conexão · tentando reconectar'}}
$('composer').addEventListener('submit',async e=>{e.preventDefault();if(sending)return;const name='Meu bem',text=$('text').value.trim();if(!room){$('notice').textContent='Aguarde a conexão para enviar.';return}if(!text)return;sending=true;$('send').disabled=true;$('notice').textContent='';if(!pending||pending.text!==text||pending.name!==name)pending={id:token(),name,text,sender};try{const r=await fetch('/api/messages',{method:'POST',headers:{'Content-Type':'application/json','X-Chat-Room':room},body:JSON.stringify(pending)});if(!r.ok)throw Error();if($('text').value.trim()===text){$('text').value='';$('text').style.height='auto';}pending=null;await refresh();$('messages').scrollTop=$('messages').scrollHeight}catch{$('notice').textContent='Não foi possível confirmar o envio. Seu texto foi mantido; tente novamente.'}finally{sending=false;$('send').disabled=false;$('text').focus()}});
$('text').addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing&&matchMedia('(pointer: fine)').matches){e.preventDefault();$('composer').requestSubmit()}});
if(location.protocol==='file:')$('notice').textContent='Execute node local-server.js e abra http://localhost:5500/chat.html.';
async function poll(){try{if(!/^[a-f0-9]{48}$/.test(room))await connect();await refresh();}catch{$('status').textContent='Sem conexão · tentando reconectar';}setTimeout(poll,2000)}poll();

$('text').addEventListener('input',()=>{const field=$('text');field.style.height='auto';field.style.height=Math.min(field.scrollHeight,130)+'px';});
function fitViewport(){if(window.visualViewport)document.documentElement.style.setProperty('--chat-height',window.visualViewport.height+'px');}
window.visualViewport?.addEventListener('resize',fitViewport);fitViewport();

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
  const label = chatAudio.paused ? 'Reproduzir m\u00fasica' : 'Pausar m\u00fasica';
  musicToggle.textContent = label;
  musicToggle.setAttribute('aria-label', label);
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
  catch { $('notice').textContent = 'N\u00e3o foi poss\u00edvel tocar a m\u00fasica. Toque novamente para tentar.'; }
  syncMusicButton();
});
syncMusicButton();
