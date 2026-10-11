import { generateRoom, freshSeed, seededRandom, pointFree, lineClear, buildFlow, flowDirection, type Block, type RoomLayout } from './rooms';
export const W = 960, H = 600;
export type Phase = 'title' | 'playing' | 'upgrade' | 'paused' | 'dead' | 'won';
export type Kind = 'slime' | 'bat' | 'archer' | 'beetle' | 'wisp' | 'guardian';
export interface Body { id: number; x: number; y: number; r: number }
export interface Enemy extends Body { kind: Kind; hp: number; maxHp: number; cooldown: number; flash: number; state: 'hunt'|'windup'|'charge'; actionTime: number; aimX: number; aimY: number; grace: number }
export interface Bolt extends Body { vx: number; vy: number; life: number; hostile: boolean; damage: number }
export interface Coin extends Body { value: number }
export interface Input { x: number; y: number; aimX: number; aimY: number; fire: boolean; dash: boolean; autoAim?: boolean }
export interface Event { kind: 'shot'|'hit'|'hurt'|'coin'|'kill'|'dash'|'clear'|'summon'; x: number; y: number; color?: number }
export function makeEnemy(id:number,kind:Kind,x:number,y:number,room=0):Enemy {
  const hp=kind==='guardian'?76:kind==='beetle'?5+room*2:kind==='slime'?4+room:kind==='bat'?2+room:3+room;
  return {id,kind,x,y,r:kind==='guardian'?30:kind==='beetle'?19:kind==='bat'||kind==='wisp'?12:16,hp,maxHp:hp,cooldown:1.4,flash:0,state:'hunt',actionTime:0,aimX:x,aimY:y,grace:1.2};
}
export class Dungeon {
  phase:Phase='title';room=0;coins=0;kills=0;elapsed=0;best=0;seed:number;layoutVersion=0;
  player={x:480,y:440,r:14,hp:6,maxHp:6,invulnerable:0,dashTime:0,dashCooldown:0,dashX:0,dashY:-1,shotCooldown:0};
  enemies:Enemy[]=[];bolts:Bolt[]=[];loot:Coin[]=[];events:Event[]=[];
  damage=1;fireInterval=.3;speed=205;upgrades:string[]=[];cleared=false;layout!:RoomLayout;
  private nextId=1;private random:()=>number;private flow=new Map<string,number>();private flowTimer=0;
  get blocks():Block[]{return this.layout.blocks;}
  get roomName(){return this.layout.name;}
  constructor(seed=freshSeed()){this.seed=seed>>>0;this.random=seededRandom(this.seed);this.populate();}
  start(seed=freshSeed()){
    this.seed=seed>>>0;this.random=seededRandom(this.seed);this.room=0;this.coins=0;this.kills=0;this.elapsed=0;this.damage=1;this.fireInterval=.3;this.speed=205;this.upgrades=[];
    Object.assign(this.player,{x:480,y:440,hp:6,maxHp:6,invulnerable:1,dashTime:0,dashCooldown:0,shotCooldown:0});
    this.phase='playing';this.populate();
  }
  populate(){
    this.bolts=[];this.loot=[];this.events=[];this.cleared=false;this.flowTimer=0;
    this.layout=generateRoom(this.random,this.room);this.layoutVersion++;
    const count=this.room===0?8+Math.floor(this.random()*3):this.room===1?11+Math.floor(this.random()*3):9+Math.floor(this.random()*3);
    const roster:Kind[]=this.room===0?['slime','bat','archer','beetle','wisp','slime','bat']:['archer','beetle','wisp','slime','bat','archer','beetle','wisp'];
    const candidates=this.layout.cells.filter(c=>Math.hypot(c.x-480,c.y-440)>235 && c.y<400 && (this.room!==2||Math.hypot(c.x-480,c.y-210)>95));
    this.enemies=[];
    for(let i=0;i<count;i++){
      const options=candidates.filter(c=>this.enemies.every(e=>Math.hypot(c.x-e.x,c.y-e.y)>58));
      const point=options[Math.floor(this.random()*options.length)];if(!point)break;
      const kind=i<roster.length?roster[i]:roster[Math.floor(this.random()*roster.length)];
      const e=makeEnemy(this.nextId++,kind,point.x,point.y,this.room);e.cooldown=1+this.random()*1.5;e.grace=.8+this.random()*.6;this.enemies.push(e);
    }
    if(this.room===2)this.enemies.push(makeEnemy(this.nextId++,'guardian',480,210,this.room));
  }
  pause(){if(this.phase==='playing')this.phase='paused';else if(this.phase==='paused')this.phase='playing';}
  chooseUpgrade(type:string){
    if(this.phase!=='upgrade'||!['power','haste','heart'].includes(type))return;
    if(type==='power')this.damage++;
    else if(type==='haste'){this.fireInterval*=.72;this.speed+=15;}
    else{this.player.maxHp+=2;this.player.hp=this.player.maxHp;}
    this.upgrades.push(type);this.room++;Object.assign(this.player,{x:480,y:440,hp:Math.min(this.player.maxHp,this.player.hp+1),invulnerable:1,dashTime:0,dashCooldown:0});
    this.populate();this.phase='playing';
  }
  private move(body:Pick<Body,'x'|'y'|'r'>,dx:number,dy:number,flying=false){
    const valid=(x:number,y:number)=>pointFree(x,y,body.r,flying?[]:this.blocks);
    const x=Math.max(66+body.r,Math.min(W-66-body.r,body.x+dx));if(valid(x,body.y))body.x=x;
    const y=Math.max(78+body.r,Math.min(H-64-body.r,body.y+dy));if(valid(body.x,y))body.y=y;
  }
  private enemyBolt(e:Enemy,angle:number,speed:number){this.bolts.push({id:this.nextId++,x:e.x+Math.cos(angle)*(e.r+9),y:e.y+Math.sin(angle)*(e.r+9),r:6,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,life:4.5,hostile:true,damage:1});}
  private enemyAction(e:Enemy){
    const angle=Math.atan2(e.aimY-e.y,e.aimX-e.x);
    if(e.kind==='beetle'){e.state='charge';e.actionTime=.48;return;}
    if(e.kind==='archer')this.enemyBolt(e,angle,235+this.room*15);
    if(e.kind==='wisp')for(const spread of [-.22,0,.22])this.enemyBolt(e,angle+spread,180+this.room*12);
    if(e.kind==='guardian'){
      const enraged=e.hp<=e.maxHp/2,count=enraged?16:12;
      for(let i=0;i<count;i++)this.enemyBolt(e,angle+i*Math.PI*2/count, enraged?200:170);
      if(enraged&&this.enemies.length<13){
        const point=this.layout.cells.filter(c=>Math.hypot(c.x-this.player.x,c.y-this.player.y)>150 && this.enemies.every(n=>Math.hypot(c.x-n.x,c.y-n.y)>40));
        const c=point[Math.floor(this.random()*point.length)];if(c){const bat=makeEnemy(this.nextId++,'bat',c.x,c.y,this.room);bat.grace=.8;this.enemies.push(bat);this.events.push({kind:'summon',x:c.x,y:c.y});}
      }
    }
    e.state='hunt';e.cooldown=e.kind==='guardian'?(e.hp<=e.maxHp/2?1.55:2.1):e.kind==='wisp'?2.6:1.7+this.random()*.5;
  }
  step(dt:number,input:Input){
    this.events=[];if(this.phase!=='playing')return;dt=Math.min(Math.max(0,dt),.04);this.elapsed+=dt;
    const p=this.player;p.invulnerable=Math.max(0,p.invulnerable-dt);p.dashCooldown=Math.max(0,p.dashCooldown-dt);p.shotCooldown-=dt;
    const mag=Math.max(1,Math.hypot(input.x,input.y));
    if(input.dash&&p.dashCooldown===0){p.dashX=input.x||input.y?input.x/mag:Math.cos(Math.atan2(input.aimY-p.y,input.aimX-p.x));p.dashY=input.x||input.y?input.y/mag:Math.sin(Math.atan2(input.aimY-p.y,input.aimX-p.x));p.dashTime=.18;p.dashCooldown=1.5;p.invulnerable=Math.max(p.invulnerable,.3);this.events.push({kind:'dash',x:p.x,y:p.y});}
    if(p.dashTime>0){p.dashTime-=dt;this.move(p,p.dashX*640*dt,p.dashY*640*dt);}else this.move(p,input.x/mag*this.speed*dt,input.y/mag*this.speed*dt);
    if(input.fire&&p.shotCooldown<=0&&this.enemies.length){
      let ax=input.aimX,ay=input.aimY;
      if(input.autoAim){const sorted=[...this.enemies].sort((a,b)=>Math.hypot(a.x-p.x,a.y-p.y)-Math.hypot(b.x-p.x,b.y-p.y));const target=sorted.find(e=>lineClear(p.x,p.y,e.x,e.y,this.blocks))??sorted[0];ax=target.x;ay=target.y;}
      const angle=Math.atan2(ay-p.y,ax-p.x);this.bolts.push({id:this.nextId++,x:p.x,y:p.y,r:5,vx:Math.cos(angle)*530,vy:Math.sin(angle)*530,life:1.5,hostile:false,damage:this.damage});p.shotCooldown=this.fireInterval;this.events.push({kind:'shot',x:p.x,y:p.y});
    }
    const hurt=()=>{if(p.invulnerable<=0&&this.phase==='playing'){p.hp--;p.invulnerable=.8;this.events.push({kind:'hurt',x:p.x,y:p.y});if(p.hp<=0)this.phase='dead';}};
    this.flowTimer-=dt;if(this.flowTimer<=0){this.flow=buildFlow(this.layout.cells,p.x,p.y);this.flowTimer=.2;}
    for(const e of [...this.enemies]){
      e.flash=Math.max(0,e.flash-dt);e.grace=Math.max(0,e.grace-dt);if(e.grace>0)continue;
      e.cooldown-=dt;const angle=Math.atan2(p.y-e.y,p.x-e.x),distance=Math.hypot(p.x-e.x,p.y-e.y);
      if(e.state==='windup'){e.actionTime-=dt;if(e.actionTime<=0)this.enemyAction(e);}
      else if(e.state==='charge'){
        e.actionTime-=dt;const a=Math.atan2(e.aimY-e.y,e.aimX-e.x);const beforeX=e.x,beforeY=e.y;
        this.move(e,Math.cos(a)*445*dt,Math.sin(a)*445*dt);
        if(e.actionTime<=0||Math.hypot(e.x-beforeX,e.y-beforeY)<dt*20){e.state='hunt';e.cooldown=1.9;}
      }else{
        let dx=Math.cos(angle),dy=Math.sin(angle);const flying=e.kind==='bat'||e.kind==='wisp';
        if(!flying&&!lineClear(e.x,e.y,p.x,p.y,this.blocks,e.r+2)){[dx,dy]=flowDirection(this.layout.cells,this.flow,e.x,e.y,this.blocks,e.r+1);}
        let speed=e.kind==='bat'?115+this.room*10:e.kind==='guardian'?48:e.kind==='beetle'?58:e.kind==='archer'?65:75+this.room*7;
        if(e.kind==='archer'&&distance<260&&lineClear(e.x,e.y,p.x,p.y,this.blocks)){speed=distance<165?-50:0;}
        if(e.kind==='wisp'&&distance<280){const orbit=angle+(e.id%2?1:-1)*1.35;dx=Math.cos(orbit);dy=Math.sin(orbit);speed=75;}
        this.move(e,dx*speed*dt,dy*speed*dt,flying);
        const ranged=e.kind==='archer'||e.kind==='wisp'||e.kind==='guardian';
        if(e.cooldown<=0&&((ranged&&lineClear(e.x,e.y,p.x,p.y,this.blocks))||(e.kind==='beetle'&&distance<330&&lineClear(e.x,e.y,p.x,p.y,this.blocks,e.r)))){
          e.state='windup';e.actionTime=e.kind==='guardian'?.8:e.kind==='beetle'?.7:.6;
          const a=Math.atan2(p.y-e.y,p.x-e.x),length=e.kind==='beetle'?320:distance;e.aimX=e.x+Math.cos(a)*length;e.aimY=e.y+Math.sin(a)*length;
        }
      }
      if(Math.hypot(e.x-p.x,e.y-p.y)<e.r+p.r-3)hurt();
    }
    for(const b of this.bolts){
      b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;if(!pointFree(b.x,b.y,b.r,this.blocks))b.life=0;if(b.life<=0)continue;
      if(b.hostile){if(Math.hypot(b.x-p.x,b.y-p.y)<b.r+p.r){hurt();b.life=0;}}
      else{const e=this.enemies.find(e=>e.hp>0&&Math.hypot(e.x-b.x,e.y-b.y)<e.r+b.r);if(e){e.hp-=b.damage;e.flash=.12;b.life=0;this.events.push({kind:'hit',x:e.x,y:e.y,color:e.kind==='slime'?0x9db98b:e.kind==='wisp'?0x91c9d2:0xe5b164});}}
    }
    this.bolts=this.bolts.filter(b=>b.life>0);
    for(const e of this.enemies.filter(e=>e.hp<=0)){this.kills++;this.loot.push({id:this.nextId++,x:e.x,y:e.y,r:8,value:e.kind==='guardian'?20:e.kind==='beetle'?5:3});this.events.push({kind:'kill',x:e.x,y:e.y});}
    this.enemies=this.enemies.filter(e=>e.hp>0);
    for(const c of this.loot){const d=Math.hypot(c.x-p.x,c.y-p.y);if(d<125){const a=Math.atan2(p.y-c.y,p.x-c.x);c.x+=Math.cos(a)*300*dt;c.y+=Math.sin(a)*300*dt;}if(d<24){this.coins+=c.value;c.value=0;this.events.push({kind:'coin',x:c.x,y:c.y});}}
    this.loot=this.loot.filter(c=>c.value>0);
    if(!this.enemies.length&&!this.cleared&&this.phase==='playing'){this.cleared=true;this.bolts=[];this.events.push({kind:'clear',x:480,y:100});}
    if(this.cleared&&this.phase==='playing'&&Math.hypot(p.x-480,p.y-100)<42){this.coins+=this.loot.reduce((s,c)=>s+c.value,0);this.loot=[];this.phase=this.room===2?'won':'upgrade';}
  }
}
