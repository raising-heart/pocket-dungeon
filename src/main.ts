import Phaser from 'phaser';
import { Dungeon, W, H, type Input } from './simulation';
import { DungeonScene } from './scene';
import './style.css';
import './enemy-guide.css';
const qa=import.meta.env.DEV&&new URLSearchParams(location.search).has('playtest');
const seedText=qa?new URLSearchParams(location.search).get('seed'):null;
const qaSeed=seedText!==null&&/^\d+$/.test(seedText)?Number(seedText)>>>0:undefined;
const sim=new Dungeon(qaSeed);
const startRun=()=>sim.start(qaSeed);
if(qa) Object.defineProperty(window,'dungeonSnapshot',{get:()=>JSON.parse(JSON.stringify({phase:sim.phase,room:sim.room,player:sim.player,enemies:sim.enemies,bolts:sim.bolts,blocks:sim.blocks,seed:sim.seed,speed:sim.speed,roomName:sim.roomName,layoutVersion:sim.layoutVersion,coins:sim.coins,cleared:sim.cleared,kills:sim.kills}))});
try {sim.best=Number(localStorage.getItem('pocket-dungeon-best-v2')||0);}catch{}
document.querySelector<HTMLDivElement>('#app')!.innerHTML=`
 <main class="shell">
  <header class="masthead"><a class="brand" href="#" aria-label="Pocket Dungeon home"><span class="brand-mark">♜</span><span>POCKET<span class="brand-secondary">DUNGEON</span></span></a><div class="edition">THE HALLS HAVE SHIFTED <span> / </span> VOL. 02</div><button id="sound" class="icon-button" aria-label="Enable sound">♪ <span>Sound off</span></button></header>
  <section class="game-frame" aria-label="Pocket Dungeon game">
   <div class="hud"><div class="vitals"><span class="tiny-label">ADVENTURER</span><div id="hearts" aria-label="Health"></div></div><div class="room-info"><span id="room-label" class="tiny-label">ROOM 01 / 03</span><span id="room-name">The forgotten hall</span></div><div class="treasure"><span class="coin-icon">◆</span><span id="coins">000</span><button id="pause" class="icon-button" aria-label="Pause game">Ⅱ</button></div></div>
   <div class="playfield"><div id="game"></div><div id="overlay" class="overlay"></div><div id="toast" class="toast" role="status"></div></div>
   <div class="status-bar"><span id="objective"><i class="status-dot"></i> THE CROWN AWAITS</span><span id="dash-status">DASH READY <kbd>⇧</kbd></span></div>
  </section>
  <footer><div class="controls"><span><kbd>W A S D</kbd> move</span><span><kbd>↗</kbd> aim · hold click to fire</span><span><kbd>SPACE</kbd> auto-aim</span><span><kbd>SHIFT</kbd> dash</span><span><kbd>ESC</kbd> pause</span></div><span class="footer-note">Small dungeon. Big courage.</span></footer>
  <div class="touch-controls"><div class="dpad"><button data-dir="up" aria-label="Move up">▲</button><button data-dir="left" aria-label="Move left">◀</button><button data-dir="down" aria-label="Move down">▼</button><button data-dir="right" aria-label="Move right">▶</button></div><div class="touch-actions"><button id="touch-dash">DASH</button><button id="touch-fire">FIRE</button></div></div>
 </main>`;
const overlay=document.querySelector<HTMLDivElement>('#overlay')!, objective=document.querySelector('#objective')!,toast=document.querySelector<HTMLDivElement>('#toast')!;
let lastPhase='',lastHud='', sound=false, audio:AudioContext|undefined,toastTimer=0; const held=new Set<string>();let touchFire=false,touchDash=false;
function readInput():Partial<Input>{if(!held.size&&!touchFire&&!touchDash)return{};const dash=touchDash;touchDash=false;return{x:(held.has('right')?1:0)-(held.has('left')?1:0),y:(held.has('down')?1:0)-(held.has('up')?1:0),fire:touchFire,dash,autoAim:true};}
function chime(freq:number,duration=.06){if(!sound)return;audio??=new AudioContext();void audio.resume();const osc=audio.createOscillator(),gain=audio.createGain();osc.type='triangle';osc.frequency.setValueAtTime(freq,audio.currentTime);osc.frequency.exponentialRampToValueAtTime(freq*.6,audio.currentTime+duration);gain.gain.setValueAtTime(.035,audio.currentTime);gain.gain.exponentialRampToValueAtTime(.001,audio.currentTime+duration);osc.connect(gain);gain.connect(audio.destination);osc.start();osc.stop(audio.currentTime+duration);}
function showToast(text:string){toast.textContent=text;toast.classList.add('visible');window.clearTimeout(toastTimer);toastTimer=window.setTimeout(()=>toast.classList.remove('visible'),3000);}
function render(){
 const guardian=sim.enemies.find(e=>e.kind==='guardian'),enraged=guardian&&guardian.hp<=guardian.maxHp/2;
 const hud=[sim.player.hp,sim.player.maxHp,sim.coins,sim.room,sim.layoutVersion,sim.phase,sim.cleared,sim.enemies.length,enraged,Math.ceil(sim.player.dashCooldown*10)].join(',');
 if(hud!==lastHud){lastHud=hud;document.querySelector('#hearts')!.innerHTML=Array.from({length:sim.player.maxHp},(_,i)=>`<span class="heart ${i>=sim.player.hp?'empty':''}">♥</span>`).join('');document.querySelector('#hearts')!.setAttribute('aria-label',`${sim.player.hp} of ${sim.player.maxHp} health`);document.querySelector('#coins')!.textContent=String(sim.coins).padStart(3,'0');document.querySelector('#room-label')!.textContent=`ROOM 0${sim.room+1} / 03`;document.querySelector('#room-name')!.textContent=sim.roomName;document.querySelector('#dash-status')!.innerHTML=sim.player.dashCooldown>0?`DASH ${sim.player.dashCooldown.toFixed(1)}s`:'DASH READY <kbd>⇧</kbd>';objective.innerHTML=sim.phase==='title'?'<i class="status-dot"></i> THE CROWN AWAITS':sim.cleared?'<i class="status-dot green"></i> ROOM CLEAR · ENTER THE NORTH DOOR':`<i class="status-dot"></i> ${sim.enemies.length} ${sim.enemies.length===1?'FOE':'FOES'} REMAIN`;
   if(enraged&&sim.phase==='playing')objective.innerHTML='<i class="status-dot"></i> GUARDIAN ENRAGED · KEEP MOVING';
 }
 for(const e of sim.events){if(e.kind==='shot')chime(420,.045);if(e.kind==='hurt')chime(95,.2);if(e.kind==='coin')chime(850);if(e.kind==='clear'){chime(620,.3);showToast(sim.room===2?'The crown is yours. Enter the north door.':'Room cleared! Enter the north door.');}}
 if(sim.phase===lastPhase)return;lastPhase=sim.phase;held.clear();touchFire=false;touchDash=false;
 overlay.classList.toggle('hidden',sim.phase==='playing');document.querySelector('#pause')!.textContent=sim.phase==='paused'?'▶':'Ⅱ';
 const badge='<div class="crest"><span>♜</span><i>✦</i></div>';
 if(sim.phase==='title')overlay.innerHTML=`<div class="menu title-menu"><div class="eyebrow">SHIFTING HALLS. SIX KINDS OF TROUBLE.</div>${badge}<h1>Pocket<br><em>Dungeon</em></h1><p>Brave the halls. Gather your strength.<br>Leave with a crown, or a good story.</p><button class="primary" id="start">Enter the dungeon <span>→</span></button><div class="menu-note">Move with WASD · Hold SPACE to fire at the nearest foe</div></div>`;
 if(sim.phase==='paused')overlay.innerHTML=`<div class="menu pause-menu"><div class="eyebrow">TAKE A BREATHER</div><h2>Dungeon paused</h2><p>Watch the warnings. Keep moving. Use cover.</p><button class="primary" id="resume">Keep adventuring <span>→</span></button><details class="enemy-guide"><summary>Know your foes</summary><div><span><b>Slimes</b> pursue around cover.</span><span><b>Bats</b> fly fast over obstacles.</span><span><b>Bone archers</b> line up a shot. Sidestep.</span><span><b>Beetles</b> charge down the amber line.</span><span><b>Wisps</b> circle and fire three-bolt spreads.</span><span><b>The guardian</b> fires rings; below half health, it enrages and summons bats.</span></div></details><button class="secondary" id="restart">Start a fresh run</button></div>`;
 if(sim.phase==='upgrade')overlay.innerHTML=`<div class="menu upgrade-menu"><div class="eyebrow">ROOM ${sim.room+1} COMPLETE</div><h2>A little stronger.</h2><p>Choose a blessing for the rooms ahead.<br>You recover 1 health on entering the next room.</p><div class="upgrade-grid"><button class="upgrade" data-upgrade="power"><span class="upgrade-symbol">✧</span><strong>Ember stone</strong><span>+1 bolt damage</span><small>Make every hit count.</small></button><button class="upgrade" data-upgrade="haste"><span class="upgrade-symbol">»</span><strong>Wind charm</strong><span>28% faster firing</span><small>A little quicker on your feet.</small></button><button class="upgrade" data-upgrade="heart"><span class="upgrade-symbol">♥</span><strong>Heart bloom</strong><span>+2 max health · full heal</span><small>Courage grows here.</small></button></div></div>`;
 if(sim.phase==='dead'||sim.phase==='won'){
  const won=sim.phase==='won';if(won&&sim.coins>sim.best){sim.best=sim.coins;try{localStorage.setItem('pocket-dungeon-best-v2',String(sim.best));}catch{}}
  overlay.innerHTML=`<div class="menu"><div class="eyebrow">${won?'THE CROWN HAS A NEW KEEPER':'EVERY ADVENTURE TEACHES SOMETHING'}</div>${badge}<h2>${won?'A tiny triumph.':'Rest, brave soul.'}</h2><p>${won?'Three rooms conquered. One story worth telling.':'The dungeon got you this time. Try a new blessing.'}</p><div class="results"><span><strong>${sim.coins}</strong>coins gathered</span><span><strong>${sim.kills}</strong>foes defeated</span><span><strong>${Math.floor(sim.elapsed/60)}:${String(Math.floor(sim.elapsed%60)).padStart(2,'0')}</strong>run time</span></div><button class="primary" id="restart">${won?'Another adventure':'Try again'} <span>→</span></button>${sim.best?`<div class="menu-note">BEST COMPLETED RUN · ${sim.best} COINS</div>`:''}</div>`;
 }
 if(sim.phase==='title'&&matchMedia('(pointer: coarse)').matches){const note=overlay.querySelector<HTMLElement>('.menu-note')!;note.textContent='Use the pad to move · Hold FIRE · Tap DASH';note.style.fontSize='8px';note.style.letterSpacing='0';}
 overlay.querySelector<HTMLButtonElement>('button')?.focus({preventScroll:true});
}
overlay.addEventListener('click',e=>{const b=(e.target as HTMLElement).closest('button');if(!b)return;if(b.id==='start'||b.id==='restart'){startRun();showToast('Keep moving. Dodge the warnings. Use cover.');}if(b.id==='resume')sim.pause();if(b.dataset.upgrade){sim.chooseUpgrade(b.dataset.upgrade);showToast(`Room ${sim.room+1} · ${sim.roomName}`);}render();});
document.querySelector('#pause')!.addEventListener('click',()=>{sim.pause();render();});
document.querySelector('.brand')!.addEventListener('click',e=>{e.preventDefault();if(sim.phase==='playing')sim.pause();render();});
document.querySelector('#sound')!.addEventListener('click',()=>{sound=!sound;document.querySelector('#sound')!.innerHTML=`♪ <span>Sound ${sound?'on':'off'}</span>`;document.querySelector('#sound')!.setAttribute('aria-label',sound?'Mute sound':'Enable sound');chime(700,.1);});
window.addEventListener('keydown',e=>{if(e.code==='Escape'){e.preventDefault();sim.pause();render();}if(e.code==='Enter'&&sim.phase==='title'){startRun();render();}});
function loseFocus(){held.clear();touchFire=false;touchDash=false;if(sim.phase==='playing'){sim.pause();render();}}
window.addEventListener('blur',loseFocus);document.addEventListener('visibilitychange',()=>{if(document.hidden)loseFocus();});
for(const b of document.querySelectorAll<HTMLButtonElement>('[data-dir]')){b.addEventListener('pointerdown',e=>{e.preventDefault();b.setPointerCapture(e.pointerId);held.add(b.dataset.dir!);});for(const name of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(name,()=>held.delete(b.dataset.dir!));}
const fire=document.querySelector<HTMLButtonElement>('#touch-fire')!;fire.addEventListener('pointerdown',e=>{e.preventDefault();fire.setPointerCapture(e.pointerId);touchFire=true;});for(const name of ['pointerup','pointercancel','lostpointercapture'])fire.addEventListener(name,()=>touchFire=false);
document.querySelector('#touch-dash')!.addEventListener('pointerdown',e=>{e.preventDefault();touchDash=true;});
new Phaser.Game({type:Phaser.AUTO,parent:'game',width:W,height:H,pixelArt:true,antialias:false,backgroundColor:'#171d21',scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},scene:[new DungeonScene(sim,readInput,render)],audio:{noAudio:true}});
render();
