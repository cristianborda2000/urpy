"use strict";

/* Parâmetros principais da experiência. */
const PHOENIX_CONFIG = {
  duration: 6_800,
  speed: 1,
  phoenixSize: 1,
  fireIntensity: 1,
  particles: { desktop: 82, mobile: 46 },
  colors: { ash: "112,98,109", ember: "255,49,76", gold: "255,132,70" },
};

const root = document.querySelector("[data-experience]");
const canvas = document.querySelector("#effects");
const ctx = canvas.getContext("2d", { alpha: true });
const replay = document.querySelector("[data-replay]");
const loveSong = document.querySelector("#loveSong");
let width, height, dpr, frame, resizeFrame, startedAt, lastAt, burstDone, musicStarted=false, musicAttempted=false, lastColorStep=-1, particles = [];
const clamp = (n,a=0,b=1)=>Math.min(b,Math.max(a,n));
const mix = (a,b,t)=>a+(b-a)*t;
const smooth = t=>t*t*(3-2*t);
const range = (a,b)=>Math.random()*(b-a)+a;

function resize(){ width=innerWidth; height=innerHeight; dpr=Math.min(devicePixelRatio||1,width<700?1.25:1.5); canvas.width=Math.round(width*dpr); canvas.height=Math.round(height*dpr); ctx.setTransform(dpr,0,0,dpr,0,0); }

class Particle {
  constructor(kind="ash",burst=false){ this.reset(kind,burst); }
  reset(kind="ash",burst=false){
    this.kind=kind; this.age=0; this.life=range(kind==="ash"?4200:1800,kind==="ash"?8500:4300);
    this.x=kind==="ash"&&!burst?range(0,width):width*.5+range(-width*.24,width*.24); this.y=kind==="ash"&&!burst?range(height*.08,height*.94):height*(burst?.56:.78)+range(-height*.2,height*.15);
    const angle=range(Math.PI*1.08,Math.PI*1.92), power=burst?range(120,390):range(12,62);
    this.vx=Math.cos(angle)*power; this.vy=Math.sin(angle)*power-(kind==="ash"?4:42);
    this.size=range(kind==="ash"?.5:1.1,kind==="ash"?2.7:3.8); this.alpha=range(.18,.82); this.seed=range(0,7);this.depth=Math.random();
  }
  update(dt,phase,time){
    this.age+=dt*1000;
    if(phase>.16&&phase<.5){const dx=width*.5-this.x,dy=height*.68-this.y,dist=Math.max(50,Math.hypot(dx,dy));const strength=Math.sin(clamp((phase-.16)/.34)*Math.PI);this.vx+=(-dy/dist*42+dx/dist*12)*strength*dt;this.vy+=(dx/dist*42+dy/dist*12)*strength*dt;}
    this.vy-=(this.kind==="ash"?3:15)*dt;this.x+=this.vx*dt;this.y+=this.vy*dt;this.vx*=.985;
  }
  draw(){ const t=this.age/this.life;if(t>=1)return;const a=Math.sin(t*Math.PI)*this.alpha,c=this.kind==="gold"?PHOENIX_CONFIG.colors.gold:this.kind==="ember"?PHOENIX_CONFIG.colors.ember:PHOENIX_CONFIG.colors.ash;ctx.save();ctx.translate(this.x,this.y);ctx.rotate(this.age*.001*(this.seed-3.5));if(this.kind!=="ash"&&this.depth>.78){ctx.shadowBlur=6;ctx.shadowColor=`rgba(${c},${a})`;}ctx.fillStyle=`rgba(${c},${a})`;ctx.beginPath();ctx.ellipse(0,0,this.size*(this.kind==="ash"?1.8:.65),this.size,0,0,Math.PI*2);ctx.fill();ctx.restore();}
}

function seed(){ const amount=width<700?PHOENIX_CONFIG.particles.mobile:PHOENIX_CONFIG.particles.desktop;particles=Array.from({length:amount},(_,i)=>new Particle(i%6?"ash":"ember"));particles.forEach(p=>{p.age=range(0,p.life*.7);p.y=range(height*.15,height*.94);}); }
function burst(){ const n=width<700?24:42;for(let i=0;i<n;i++)particles.push(new Particle(i%3?"gold":"ember",true)); }

/* Desenha uma pena curva com nervura central e brilho de fogo. */
function feather(length,widthValue,curve,hue,alpha=1,flicker=0,tone=0){
  const tipGlow=.82+flicker*.18;
  // A ponta usa duas curvas, evitando o triângulo rígido de uma pena pontuda.
  const red=clamp(224+tone,150,255),blue=clamp(35-tone*.35,12,70);
  const fire=ctx.createLinearGradient(0,0,length,curve);fire.addColorStop(0,`rgba(116,25,31,${alpha})`);fire.addColorStop(.45,`rgba(${red},73,${blue},${alpha})`);fire.addColorStop(.82,`rgba(255,152,52,${alpha})`);fire.addColorStop(1,`rgba(255,226,148,${alpha})`);ctx.fillStyle=fire;ctx.beginPath();ctx.moveTo(0,0);ctx.bezierCurveTo(length*.28,-widthValue,length*.72,curve-widthValue*.52,length*.94,curve-widthValue*.12);ctx.quadraticCurveTo(length*1.025,curve,length*.94,curve+widthValue*.12);ctx.bezierCurveTo(length*.7,curve+widthValue*.45,length*.22,widthValue*.62,0,0);ctx.fill();
  if(flicker>.82||tone>8){ctx.strokeStyle=`rgba(255,186,82,${alpha*tipGlow*.5})`;ctx.lineWidth=Math.max(1,widthValue*.075);ctx.beginPath();ctx.moveTo(length*.76,curve*.68);ctx.quadraticCurveTo(length*.9,curve,length,curve);ctx.stroke();}
  ctx.strokeStyle=`rgba(255,209,134,${alpha*.46})`;ctx.lineWidth=Math.max(.55,widthValue*.048);ctx.beginPath();ctx.moveTo(length*.04,0);ctx.quadraticCurveTo(length*.54,curve*.16,length*.97,curve);ctx.stroke();
}

function drawWing(side,open,flap,scale,time,visibility){
  ctx.save();ctx.scale(side,1);
  const fold=mix(1.4,.34,open), shoulderLift=flap+Math.sin(time*.0017+side)*.012*open;
  ctx.rotate(-fold+shoulderLift);

  // Penas primárias: longas, separadas e com flexão progressiva nas pontas.
  for(let i=0;i<9;i++){
    const n=i/8,lag=Math.sin(time*.0022-i*.16)*.028*open;
    const spread=mix(-.34,.48,n);
    ctx.save();ctx.rotate(mix(-.025,spread,open)+shoulderLift*(.3+n*.8)+lag);
    const len=scale*mix(.7,1.03,Math.sin((n*.72+.13)*Math.PI));
    feather(len,scale*mix(.05,.072,1-Math.abs(n-.52)*1.2),scale*mix(-.015,.12,n),16+i,visibility*.82,(Math.sin(time*.008+i)+1)/2,-8);ctx.restore();
  }

  // Penas secundárias formam volume, com origem deslocada ao longo do braço.
  for(let i=0;i<10;i++){
    const n=i/9,delay=Math.sin(time*.0021-i*.12)*.014*open;ctx.save();ctx.translate(scale*mix(.035,.36,n),scale*mix(-.015,.025,n));ctx.rotate(mix(-.018,mix(-.14,.42,n),open)+flap*.5+delay);
    feather(scale*mix(.44,.66,Math.sin((n*.7+.15)*Math.PI)),scale*mix(.058,.07,1-n),scale*.065,28+i,visibility*.94,(Math.sin(time*.009+i*.7)+1)/2,2);ctx.restore();
  }

  // Coberturas sobrepostas escondem as articulações e definem a anatomia da asa.
  const cover=ctx.createLinearGradient(0,-scale*.12,scale*.52,scale*.1);cover.addColorStop(0,`rgba(109,27,25,${visibility})`);cover.addColorStop(.58,`rgba(214,66,29,${visibility})`);cover.addColorStop(1,`rgba(255,166,60,${visibility*.9})`);ctx.fillStyle=cover;
  ctx.beginPath();ctx.moveTo(-scale*.03,-scale*.055);ctx.bezierCurveTo(scale*.13,-scale*.18,scale*.38,-scale*.17,scale*.57,scale*.035);ctx.bezierCurveTo(scale*.38,scale*.14,scale*.12,scale*.12,-scale*.03,scale*.055);ctx.fill();
  for(let i=0;i<6;i++){ctx.save();ctx.translate(scale*(.035+i*.065),-scale*.018);ctx.rotate(mix(.02,.12+i*.038,open)+Math.sin(time*.002-i*.15)*.008*open);feather(scale*mix(.27,.35,i/5),scale*.046,scale*.04,40+i,visibility*.98,0,10);ctx.restore();}
  ctx.restore();
}

function drawTailRibbons(scale,alpha,time){
  for(let i=-2;i<=2;i++){
    const offset=i*scale*.027,length=scale*mix(.78,1.2,1-Math.abs(i)/3),side=i<0?-1:1;
    const speed=.00125+(i+2)*.00011,amplitude=scale*(.055+Math.abs(i)*.012),wave=Math.sin(time*speed+i*1.17)*amplitude;
    ctx.strokeStyle=i===0?`rgba(255,193,86,${alpha*.9})`:`rgba(${i%2?"255,132,35":"240,76,26"},${alpha*.72})`;
    ctx.lineWidth=scale*(i===0?.018:.011);ctx.lineCap="round";
    const tipX=offset+side*scale*.08+wave;
    ctx.beginPath();ctx.moveTo(offset,scale*.27);ctx.bezierCurveTo(offset+side*scale*.14+wave*.2,scale*.5,offset-side*scale*.2-wave*.35,scale*.72,tipX,length);ctx.stroke();
    ctx.fillStyle=`rgba(255,214,123,${alpha*.86})`;ctx.save();ctx.translate(tipX,length);ctx.rotate(side*.45+Math.sin(time*speed+i)*.18);ctx.beginPath();ctx.moveTo(0,0);ctx.quadraticCurveTo(scale*.095,-scale*.04,scale*.16,0);ctx.quadraticCurveTo(scale*.085,scale*.078,0,0);ctx.fill();ctx.restore();
  }
}

function drawLegs(scale,alpha,time){
  const motion=Math.sin(time*.0016)*scale*.006;
  ctx.save();ctx.lineCap="round";ctx.lineJoin="round";
  for(const side of [-1,1]){
    const hip=side*scale*.052,kneeX=side*scale*.073+motion*side,footX=side*scale*.09;
    ctx.strokeStyle=`rgba(193,90,36,${alpha*.9})`;ctx.lineWidth=Math.max(1.4,scale*.014);ctx.beginPath();ctx.moveTo(hip,scale*.18);ctx.bezierCurveTo(side*scale*.06,scale*.27,kneeX,scale*.34,footX,scale*.405);ctx.stroke();
    ctx.strokeStyle=`rgba(255,190,79,${alpha*.78})`;ctx.lineWidth=Math.max(1,scale*.008);
    for(let claw=-1;claw<=1;claw++){ctx.beginPath();ctx.moveTo(footX,scale*.405);ctx.quadraticCurveTo(footX+side*scale*(.035+claw*.006),scale*(.43+Math.abs(claw)*.008),footX+side*scale*(.062+claw*.008),scale*.414);ctx.stroke();}
  }
  ctx.restore();
}

function drawBody(scale,bodyAlpha,headAlpha,tailAlpha,time){
  ctx.save();
  drawTailRibbons(scale,tailAlpha,time);
  ctx.globalAlpha=bodyAlpha;
  const body=ctx.createLinearGradient(-scale*.13,-scale*.25,scale*.15,scale*.3);body.addColorStop(0,"#782221");body.addColorStop(.45,"#dc571f");body.addColorStop(1,"#ffb74b");ctx.fillStyle=body;ctx.beginPath();ctx.moveTo(scale*.025,-scale*.3);ctx.bezierCurveTo(-scale*.13,-scale*.19,-scale*.16,scale*.08,-scale*.035,scale*.34);ctx.bezierCurveTo(scale*.13,scale*.2,scale*.15,-scale*.12,scale*.025,-scale*.3);ctx.fill();
  const chest=ctx.createRadialGradient(0,-scale*.03,0,0,-scale*.03,scale*.2);chest.addColorStop(0,`rgba(255,206,102,${bodyAlpha*.38})`);chest.addColorStop(1,"rgba(230,101,32,0)");ctx.fillStyle=chest;ctx.beginPath();ctx.arc(0,-scale*.03,scale*.2,0,Math.PI*2);ctx.fill();
  drawLegs(scale,bodyAlpha,time);
  // Pequenas penas sobrepostas dão profundidade ao peito.
  for(let row=0;row<5;row++){const py=-scale*.18+row*scale*.075,count=3+row;for(let col=0;col<count;col++){const px=(col-(count-1)/2)*scale*.031,shade=190+row*8;ctx.fillStyle=`rgba(${shade},106,36,${bodyAlpha*.48})`;ctx.beginPath();ctx.moveTo(px-scale*.025,py);ctx.quadraticCurveTo(px,py+scale*.052,px+scale*.025,py);ctx.quadraticCurveTo(px,py+scale*.028,px-scale*.025,py);ctx.fill();}}
  // Neck, head and beak.
  ctx.save();ctx.globalAlpha=headAlpha;
  ctx.beginPath();ctx.moveTo(-scale*.045,-scale*.22);ctx.bezierCurveTo(-scale*.1,-scale*.34,-scale*.015,-scale*.5,scale*.14,-scale*.465);ctx.bezierCurveTo(scale*.055,-scale*.39,scale*.085,-scale*.27,scale*.035,-scale*.19);ctx.fill();
  // Curved crest inspired by the reference silhouette.
  ctx.strokeStyle=`rgba(255,168,65,${headAlpha})`;ctx.lineWidth=scale*.014;ctx.lineCap="round";ctx.beginPath();ctx.moveTo(scale*.075,-scale*.47);ctx.bezierCurveTo(-scale*.01,-scale*.61,-scale*.15,-scale*.53,-scale*.07,-scale*.42);ctx.stroke();ctx.beginPath();ctx.moveTo(scale*.1,-scale*.465);ctx.bezierCurveTo(scale*.02,-scale*.57,-scale*.1,-scale*.48,-scale*.025,-scale*.4);ctx.stroke();
  ctx.fillStyle="#ffd58a";ctx.beginPath();ctx.moveTo(scale*.135,-scale*.475);ctx.lineTo(scale*.245,-scale*.445);ctx.lineTo(scale*.132,-scale*.42);ctx.closePath();ctx.fill();
  ctx.fillStyle="#ffd6a4";ctx.shadowBlur=6;ctx.shadowColor="#ff375f";ctx.beginPath();ctx.arc(scale*.112,-scale*.465,Math.max(1.2,scale*.007),0,Math.PI*2);ctx.fill();ctx.restore();ctx.restore();
}

function drawEnergyVortex(progress,time){
  const energy=Math.sin(clamp((progress-.13)/.34)*Math.PI);if(energy<=0)return;
  ctx.save();ctx.translate(width*.5,height*.7);ctx.globalCompositeOperation="lighter";ctx.lineCap="round";
  for(let i=0;i<7;i++){const phase=time*.0012+i*.9,radius=mix(18,Math.min(width,height)*.2,i/6)*energy;ctx.strokeStyle=`rgba(${i%2?"232,45,105":"255,100,55"},${energy*(.18+i*.025)})`;ctx.lineWidth=1+i*.18;ctx.beginPath();ctx.arc(Math.cos(phase)*radius*.12,-i*height*.025,radius,phase,phase+Math.PI*.9);ctx.stroke();}
  ctx.restore();
}

function drawClimax(progress){
  const t=clamp((progress-.72)/.12),pulse=Math.sin(t*Math.PI);if(pulse<=0)return;
  const radius=Math.min(width,height)*mix(.08,.48,t),glow=ctx.createRadialGradient(width*.5,height*.45,0,width*.5,height*.45,radius);glow.addColorStop(0,`rgba(255,225,172,${pulse*.2})`);glow.addColorStop(.35,`rgba(255,65,104,${pulse*.14})`);glow.addColorStop(1,"rgba(160,25,105,0)");ctx.fillStyle=glow;ctx.fillRect(0,0,width,height);
}

function drawPhoenix(progress,time){
  const bodyForm=smooth(clamp((progress-.27)/.17)),headForm=smooth(clamp((progress-.34)/.15)),wingForm=smooth(clamp((progress-.4)/.2)),open=smooth(clamp((progress-.54)/.2)),tailForm=smooth(clamp((progress-.53)/.18)),flight=smooth(clamp((progress-.75)/.13));if(bodyForm<=0)return;
  const viewportUnit=Math.min(width,height*1.05),scale=viewportUnit*(width<700?.43:.34)*PHOENIX_CONFIG.phoenixSize;
  const formation=smooth(clamp((progress-.27)/.3)),pathCurve=Math.sin(formation*Math.PI)*width*.025;
  const y=mix(height*.82,height*.37,formation)-flight*height*.045,x=width*.5+pathCurve;
  // Harmônicas diferentes criam subida lenta e descida firme, sem movimento de pêndulo.
  const cycle=time*.00165,primary=Math.sin(cycle),secondary=Math.sin(cycle*2-.65)*.26;
  const wingBeat=(primary+secondary)*.12*(1-flight*.35),flap=open<1?0:wingBeat;
  const bodyBob=open*(Math.cos(cycle)*scale*.017+Math.cos(cycle*2)*scale*.004),bodyPitch=open*Math.sin(cycle-.4)*.014;
  ctx.save();ctx.translate(x,y+bodyBob);ctx.rotate(bodyPitch);ctx.globalCompositeOperation="lighter";const glow=ctx.createRadialGradient(0,0,0,0,0,scale*1.12);glow.addColorStop(0,`rgba(255,72,76,${.19*bodyForm})`);glow.addColorStop(1,"rgba(184,32,105,0)");ctx.fillStyle=glow;ctx.beginPath();ctx.arc(0,0,scale*1.12,0,Math.PI*2);ctx.fill();ctx.globalCompositeOperation="source-over";
  drawWing(-1,open,flap*.985,scale,time,wingForm);drawWing(1,open,flap,scale,time,wingForm);drawBody(scale,bodyForm,headForm,tailForm,time);ctx.restore();
}

function setPhases(p){
  root.classList.toggle("phase-embers",p>=.1);root.classList.toggle("phase-wings",p>=.54);root.classList.toggle("phase-flight",p>=.75);root.classList.toggle("phase-complete",p>=.9);
  if(p>=.54&&!musicAttempted)startMusic();
}
function render(now){
  if(!startedAt)startedAt=now;
  const elapsed=matchMedia("(prefers-reduced-motion: reduce)").matches?PHOENIX_CONFIG.duration:(now-startedAt)*PHOENIX_CONFIG.speed,p=clamp(elapsed/PHOENIX_CONFIG.duration),dt=Math.min(32,lastAt?now-lastAt:16)/1000;
  lastAt=now;setPhases(p);
  const colorReveal=smooth(clamp((p-.54)/.2)),colorStep=Math.round(colorReveal*100);
  if(colorStep!==lastColorStep){root.style.setProperty("--color-progress",colorReveal.toFixed(2));lastColorStep=colorStep;}
  if(!burstDone&&p>=.74){burstDone=true;burst();}
  ctx.clearRect(0,0,width,height);
  particles.forEach(part=>{part.update(dt,p,elapsed);if(part.age>=part.life)part.reset(p>.38?(Math.random()>.35?"ember":"gold"):"ash");});
  // Plano traseiro, ave e plano frontal são renderizados separadamente.
  particles.forEach(part=>{if(part.depth<.62)part.draw();});
  drawEnergyVortex(p,elapsed);
  drawPhoenix(p,elapsed);
  drawClimax(p);
  particles.forEach(part=>{if(part.depth>=.62)part.draw();});
  if(!matchMedia("(prefers-reduced-motion: reduce)").matches)frame=requestAnimationFrame(render);
}

function restartAnimation(){cancelAnimationFrame(frame);root.classList.remove("phase-embers","phase-wings","phase-flight","phase-complete");loveSong.pause();loveSong.currentTime=0;musicStarted=false;musicAttempted=false;startedAt=0;lastAt=0;burstDone=false;lastColorStep=-1;root.style.setProperty("--color-progress",0);seed();frame=requestAnimationFrame(render);}
window.restartAnimation=restartAnimation;window.PHOENIX_CONFIG=PHOENIX_CONFIG;
function scheduleResize(){cancelAnimationFrame(resizeFrame);resizeFrame=requestAnimationFrame(()=>{resize();seed();});}
function startMusic(){if(musicStarted)return;musicAttempted=true;loveSong.volume=.72;const attempt=loveSong.play();if(attempt)attempt.then(()=>{musicStarted=true;}).catch(()=>{});}
function unlockMusic(){if(root.classList.contains("phase-wings")&&!musicStarted){musicAttempted=false;startMusic();}}
addEventListener("resize",scheduleResize,{passive:true});replay.addEventListener("click",restartAnimation);document.addEventListener("pointerdown",unlockMusic,{passive:true});resize();restartAnimation();

// Keep the original audio element alive while displaying the conversation.
let chatFrame = null;
function showChat() {
  if (chatFrame) return;
  cancelAnimationFrame(frame);
  root.hidden = true;
  chatFrame = document.createElement('iframe');
  chatFrame.src = 'chat.html';
  chatFrame.title = 'Conversa';
  chatFrame.className = 'chat-screen';
  document.body.append(chatFrame);
  chatFrame.addEventListener('load', () => chatFrame.focus());
}
function closeChat() {
  if (!chatFrame) return;
  chatFrame.remove();
  chatFrame = null;
  root.hidden = false;
  lastAt = 0;
  frame = requestAnimationFrame(render);
}
document.querySelector('a[href="chat.html"]').addEventListener('click', event => {
  if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  startMusic();
  if (location.hash !== '#chat') history.pushState(null, '', '#chat');
  showChat();
});
addEventListener('popstate', () => location.hash === '#chat' ? showChat() : closeChat());
if (location.hash === '#chat') showChat();
