export interface Block {x:number;y:number;w:number;h:number}
export interface Cell {x:number;y:number}
export interface RoomLayout {blocks:Block[];cells:Cell[];name:string;theme:number;decoration:number}
export const GRID=24;
export function freshSeed(){return crypto.getRandomValues(new Uint32Array(1))[0];}
export function seededRandom(seed:number){let state=seed>>>0;return()=>{state=(state+0x6D2B79F5)>>>0;let t=state;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};}
export function pointFree(x:number,y:number,r:number,blocks:Block[]){return x-r>=66&&x+r<=894&&y-r>=78&&y+r<=536&&!blocks.some(b=>x+r>b.x&&x-r<b.x+b.w&&y+r>b.y&&y-r<b.y+b.h);}
export function lineClear(ax:number,ay:number,bx:number,by:number,blocks:Block[],r=0){
  for(const b of blocks){let lo=0,hi=1;const deltas=[bx-ax,by-ay],starts=[ax,ay],mins=[b.x-r,b.y-r],maxs=[b.x+b.w+r,b.y+b.h+r];let hit=true;
    for(let axis=0;axis<2;axis++){const d=deltas[axis];if(Math.abs(d)<1e-8){if(starts[axis]<=mins[axis]||starts[axis]>=maxs[axis]){hit=false;break;}}else{const a=(mins[axis]-starts[axis])/d,c=(maxs[axis]-starts[axis])/d;lo=Math.max(lo,Math.min(a,c));hi=Math.min(hi,Math.max(a,c));if(lo>=hi){hit=false;break;}}}
    if(hit)return false;
  }return true;
}
export function walkableCells(blocks:Block[],radius=32){const cells:Cell[]=[];for(let y=108;y<=516;y+=GRID)for(let x=96;x<=864;x+=GRID)if(pointFree(x,y,radius,blocks))cells.push({x,y});return cells;}
const key=(x:number,y:number)=>`${x},${y}`;
export function buildFlow(cells:Cell[],x:number,y:number){
  const result=new Map<string,number>();if(!cells.length)return result;
  const allowed=new Set(cells.map(c=>key(c.x,c.y)));const closest=cells.reduce((a,b)=>Math.hypot(a.x-x,a.y-y)<Math.hypot(b.x-x,b.y-y)?a:b);const queue=[closest];result.set(key(closest.x,closest.y),0);
  for(let i=0;i<queue.length;i++){const c=queue[i],distance=result.get(key(c.x,c.y))!;for(const[dx,dy]of [[GRID,0],[-GRID,0],[0,GRID],[0,-GRID]]){const k=key(c.x+dx,c.y+dy);if(allowed.has(k)&&!result.has(k)){result.set(k,distance+1);queue.push({x:c.x+dx,y:c.y+dy});}}}
  return result;
}
export function flowDirection(cells:Cell[],flow:Map<string,number>,x:number,y:number,blocks:Block[]=[],radius=0):[number,number]{
  let reachable=cells.filter(c=>Math.hypot(c.x-x,c.y-y)<=GRID*2.5&&lineClear(x,y,c.x,c.y,blocks,radius));
  // Smaller enemies can enter wall-side passages absent from the large-body grid.
  // Rejoin the graph through any visible node rather than stranding them there.
  if(!reachable.length)reachable=cells.filter(c=>lineClear(x,y,c.x,c.y,blocks,radius));
  if(!reachable.length)return[0,0];
  const target=reachable.reduce((a,b)=>{const da=flow.get(key(a.x,a.y))??Infinity,db=flow.get(key(b.x,b.y))??Infinity;return da<db||(da===db&&Math.hypot(a.x-x,a.y-y)<Math.hypot(b.x-x,b.y-y))?a:b;});
  const d=Math.hypot(target.x-x,target.y-y);return d>1?[(target.x-x)/d,(target.y-y)/d]:[0,0];
}
export function generateRoom(random:()=>number,room:number):RoomLayout{
  let blocks:Block[]=[];const desired=4+Math.floor(random()*4);let cells=walkableCells(blocks);
  const candidates:Block[]=[];for(const x of [152,264,376,544,656,768])for(const y of [148,260,372])candidates.push({x,y,w:random()<.25?40:64,h:random()<.3?40:64});
  while(candidates.length&&blocks.length<desired){const b=candidates.splice(Math.floor(random()*candidates.length),1)[0];
    const trial=[...blocks,b],free=walkableCells(trial);const flow=buildFlow(free,480,440);
    if(flow.size===free.length&&free.length>280&&lineClear(480,440,480,100,trial,32)){blocks=trial;cells=free;}
  }
  const names=[['The mossbound hall','The broken cloister','The crooked vault'],['The whispering crypt','The sunken archive','The thornlit passage'],['The crown chamber','The ember throne','The last sanctuary']];
  return{blocks,cells,name:names[room][Math.floor(random()*3)],theme:Math.floor(random()*3),decoration:Math.floor(random()*65536)};
}
