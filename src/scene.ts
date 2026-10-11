import Phaser from 'phaser';
import { Dungeon, W, H, type Input } from './simulation';
import { art, buildAssets } from './assets';
export class DungeonScene extends Phaser.Scene {
  sim: Dungeon; readInput: () => Partial<Input>; onFrame: () => void;
  private hero!: Phaser.GameObjects.Image; private entities=new Map<number,Phaser.GameObjects.Image>();
  private shadows=new Map<number,Phaser.GameObjects.Ellipse>(); private bolts=new Map<number,Phaser.GameObjects.Arc>();
  private decorations!:Phaser.GameObjects.Graphics; private bars!:Phaser.GameObjects.Graphics; private gate!:Phaser.GameObjects.Graphics; private warnings!:Phaser.GameObjects.Graphics;
  private keys!: Record<string,Phaser.Input.Keyboard.Key>; private visualRoom=-1; private torchLights:Phaser.GameObjects.Arc[]=[]; private dashQueued=false;
  constructor(sim:Dungeon, readInput:()=>Partial<Input>, onFrame:()=>void) {super('Dungeon');this.sim=sim;this.readInput=readInput;this.onFrame=onFrame;}
  create() {
    buildAssets(this);this.cameras.main.setBackgroundColor('#181c20');
    this.decorations=this.add.graphics();this.drawRoom();
    this.gate=this.add.graphics().setDepth(1);this.bars=this.add.graphics().setDepth(1000);
    this.warnings=this.add.graphics().setDepth(3);
    this.hero=this.add.image(480,440,art.hero).setScale(3).setDepth(440);
    this.keys=this.input.keyboard!.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,SPACE,SHIFT') as Record<string,Phaser.Input.Keyboard.Key>;
    this.input.keyboard!.addCapture(['SPACE','UP','DOWN','LEFT','RIGHT']);
    this.input.keyboard!.on('keydown-SHIFT', (event:KeyboardEvent)=>{if(!event.repeat)this.dashQueued=true;});
    this.input.mouse?.disableContextMenu();this.input.addPointer(2);
    this.add.rectangle(480,573,960,54,0x11161a).setAlpha(.3);
  }
  private drawRoom() {
    const g=this.decorations;g.clear();this.torchLights.forEach(l=>l.destroy());this.torchLights=[];
    g.fillStyle(0x11171b);g.fillRect(0,0,W,H);
    for(let y=74;y<540;y+=32)for(let x=64;x<896;x+=32) {
      const hash=(x*19+y*31+this.sim.layout.decoration)%7;const shades=[[0x2b3032,0x2d3234,0x303637,0x2b3133,0x323739,0x2b3032,0x303537],[0x29382e,0x2d3932,0x303d34,0x2b3831,0x323f36,0x2b382e,0x303c33],[0x363035,0x382f34,0x3c3337,0x362e34,0x3d3438,0x362f33,0x3a3237]][this.sim.layout.theme];g.fillStyle(shades[hash]);g.fillRect(x,y,31,31);
      g.fillStyle(0x424849,.2);g.fillRect(x+3,y+3,24,1);
      if(hash===2){g.lineStyle(1,0x1b2226,.6);g.lineBetween(x+5,y+20,x+11,y+14);g.lineBetween(x+11,y+14,x+15,y+16);}
    }
    for(let y=12;y<78;y+=22)for(let x=22+(y===34?22:0);x<940;x+=44){g.fillStyle(y===56?0x626365:0x444b51);g.fillRect(x,y,42,20);g.fillStyle(0x727677,.25);g.fillRect(x+2,y+2,38,2);}
    g.fillStyle(0x101619,.65);g.fillRect(64,78,832,16);
    for(const x of [24,898])for(let y=78;y<556;y+=32){g.fillStyle(0x464e52);g.fillRect(x,y,38,30);g.fillStyle(0x73787a,.4);g.fillRect(x+3,y+2,2,26);}
    for(let x=24;x<940;x+=44){g.fillStyle(0x485055);g.fillRect(x,540,42,30);g.fillStyle(0x71767a,.4);g.fillRect(x+2,542,38,3);}
    // Faded central sigil and runner frame the room without hiding enemies.
    g.lineStyle(2,0x958465,.14);g.strokeCircle(480,300,88);g.strokeCircle(480,300,96);
    for(let i=0;i<8;i++){const a=i*Math.PI/4;g.lineBetween(480+Math.cos(a)*80,300+Math.sin(a)*80,480+Math.cos(a)*104,300+Math.sin(a)*104);}
    g.fillStyle(0x795644,.18);g.fillRect(440,92,80,420);g.lineStyle(1,0xb5a071,.18);g.strokeRect(446,92,68,420);
    for(const b of this.sim.blocks) {
      g.fillStyle(0x11191c,.65);g.fillRect(b.x+5,b.y+12,b.w+4,b.h+8);
      g.fillStyle(0x464f54);g.fillRect(b.x,b.y,b.w,b.h);g.fillStyle(0x788087);g.fillRect(b.x-3,b.y-4,b.w+6,13);
      g.fillStyle(0x596267);g.fillRect(b.x+6,b.y+11,10,b.h-14);g.fillStyle(0x333c42);g.fillRect(b.x+b.w-12,b.y+11,8,b.h-14);
      g.lineStyle(2,0x899090,.35);g.strokeRect(b.x+22,b.y+13,18,34);g.fillStyle(0x626b6e);g.fillRect(b.x-2,b.y+b.h-6,b.w+4,9);
    }
    for(const [x,y] of [[148,70],[812,70],[42,292],[918,292]]) {
      for(let i=5;i>0;i--)this.torchLights.push(this.add.circle(x,y+5,12+i*9,0xffad55,.018).setDepth(2));
      g.fillStyle(0x161b21);g.fillRect(x-6,y-4,12,26);g.fillStyle(0x916b48);g.fillRect(x-4,y,8,16);g.fillStyle(0xf1ad59);g.fillRect(x-5,y-11,10,14);g.fillStyle(0xffe3a3);g.fillRect(x-2,y-15,5,14);
    }
    // Bones and broken jars stay at the edges.
    for(const [x,y] of [[107,130],[850,470],[110,470],[850,120]]){g.fillStyle(0x8b8678,.65);g.fillRect(x,y,10,5);g.fillRect(x+6,y+7,14,3);g.fillStyle(0x323334);g.fillRect(x+2,y+1,2,2);g.fillRect(x+6,y+1,2,2);}
    this.visualRoom=this.sim.layoutVersion;
  }
  update(time:number, delta:number) {
    if(!this.hero)return;
    const k=this.keys,pointer=this.input.activePointer, extra=this.readInput();
    const input:Input={x:(k.D.isDown||k.RIGHT.isDown?1:0)-(k.A.isDown||k.LEFT.isDown?1:0),y:(k.S.isDown||k.DOWN.isDown?1:0)-(k.W.isDown||k.UP.isDown?1:0),aimX:pointer.x,aimY:pointer.y,fire:pointer.isDown||k.SPACE.isDown,dash:this.dashQueued,autoAim:k.SPACE.isDown,...extra};
    this.dashQueued=false;
    this.sim.step(delta/1000,input);if(this.visualRoom!==this.sim.layoutVersion)this.drawRoom();
    const p=this.sim.player,moving=Math.abs(input.x)+Math.abs(input.y)>0&&this.sim.phase==='playing';
    this.hero.setPosition(p.x,p.y+(moving?Math.sin(time*.023)*2:Math.sin(time*.004))).setDepth(p.y+30).setAlpha(p.invulnerable>0&&Math.floor(time/70)%2? .45:1);
    if(input.x)this.hero.setFlipX(input.x<0);
    const alive=new Set<number>();this.bars.clear();this.warnings.clear();
    for(const e of this.sim.enemies) {
      alive.add(e.id);let sprite=this.entities.get(e.id);
      if(!sprite){sprite=this.add.image(e.x,e.y,art[e.kind]).setScale(e.kind==='guardian'?4:3);this.entities.set(e.id,sprite);this.shadows.set(e.id,this.add.ellipse(e.x,e.y+16,e.r*2.2,10,0x101518,.6));}
      sprite.setPosition(e.x,e.y+Math.sin(time*.007+e.id)*2).setDepth(e.y+25).setFlipX(e.x>p.x).setAlpha(e.grace>0?.45:1);if(e.flash)sprite.setTintFill(0xfff0cf);else if(e.state==='charge'||(e.kind==='guardian'&&e.hp<=e.maxHp/2))sprite.setTint(0xffac83);else sprite.clearTint();
      if(e.state==='windup'){
        const color=e.kind==='wisp'?0x8acbd5:e.kind==='beetle'?0xffb66c:0xf59779;
        this.warnings.lineStyle(2,color,.8);this.warnings.strokeCircle(e.x,e.y,e.r+9+Math.sin(time*.014)*3);
        if(e.kind==='guardian'){this.warnings.lineStyle(4,color,.25);this.warnings.strokeCircle(e.x,e.y,52);}
        else{this.warnings.lineStyle(e.kind==='beetle'?10:2,color,e.kind==='beetle'?.24:.45);this.warnings.lineBetween(e.x,e.y,e.aimX,e.aimY);this.warnings.lineStyle(2,color,.65);this.warnings.strokeCircle(e.aimX,e.aimY,10);}
      }
      this.shadows.get(e.id)!.setPosition(e.x,e.y+16).setDepth(e.y-1);
      if(e.hp<e.maxHp||e.kind==='guardian'){const w=e.kind==='guardian'?84:34;this.bars.fillStyle(0x11171b).fillRect(e.x-w/2,e.y-e.r-16,w,5);this.bars.fillStyle(e.kind==='guardian'?0xe6ad61:0x9cbc85).fillRect(e.x-w/2,e.y-e.r-16,w*e.hp/e.maxHp,3);}
    }
    for(const c of this.sim.loot){alive.add(c.id);let sprite=this.entities.get(c.id);if(!sprite){sprite=this.add.image(c.x,c.y,art.coin).setScale(2);this.entities.set(c.id,sprite);}sprite.setPosition(c.x,c.y+Math.sin(time*.008+c.id)*2).setDepth(c.y+20);}
    for(const [id,s] of this.entities)if(!alive.has(id)){s.destroy();this.entities.delete(id);this.shadows.get(id)?.destroy();this.shadows.delete(id);}
    const liveBolts=new Set<number>();for(const b of this.sim.bolts){liveBolts.add(b.id);let view=this.bolts.get(b.id);if(!view){view=this.add.circle(b.x,b.y,b.r,b.hostile?0xe78a65:0xffdfa0).setDepth(900);view.setStrokeStyle(2,b.hostile?0xa54e48:0xe5aa55,.8);this.bolts.set(b.id,view);}view.setPosition(b.x,b.y);}
    for(const[id,b]of this.bolts)if(!liveBolts.has(id)){b.destroy();this.bolts.delete(id);}
    this.gate.clear();this.gate.fillStyle(0x10171c);this.gate.fillRect(450,20,60,61);this.gate.lineStyle(4,0x7d7a6d);this.gate.strokeRect(447,18,66,63);
    if(this.sim.cleared){this.gate.fillStyle(0xa7c58b,.15+Math.sin(time*.005)*.05);this.gate.fillRect(451,23,58,56);this.gate.lineStyle(3,0xc3d5a2,.8);this.gate.lineBetween(480,63,480,33);this.gate.lineBetween(480,33,470,44);this.gate.lineBetween(480,33,490,44);}
    else{this.gate.lineStyle(3,0x6c7274);for(let x=459;x<510;x+=12)this.gate.lineBetween(x,22,x,76);}
    this.torchLights.forEach((l,i)=>l.setAlpha(.02+Math.sin(time*.005+i)*.007));
    for(const e of this.sim.events){
      if(e.kind==='hurt'){if(!matchMedia('(prefers-reduced-motion: reduce)').matches)this.cameras.main.shake(120,.004);this.burst(e.x,e.y,0xdb785f,8);}
      if(e.kind==='hit'||e.kind==='kill')this.burst(e.x,e.y,e.color??0xb9ca9c,e.kind==='kill'?12:4);
      if(e.kind==='dash')this.burst(e.x,e.y,0xcbd6d2,8);
      if(e.kind==='coin')this.burst(e.x,e.y,0xf5c675,4);
      if(e.kind==='summon')this.burst(e.x,e.y,0xbea4d2,12);
    }
    this.onFrame();
  }
  private burst(x:number,y:number,color:number,count:number) {for(let i=0;i<count;i++){const a=Math.random()*Math.PI*2,d=15+Math.random()*30;const bit=this.add.rectangle(x,y,3,3,color).setDepth(999);this.tweens.add({targets:bit,x:x+Math.cos(a)*d,y:y+Math.sin(a)*d,alpha:0,duration:250+Math.random()*150,onComplete:()=>bit.destroy()});}}
}
