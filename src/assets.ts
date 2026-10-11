import Phaser from 'phaser';
export const art = {hero:'character.hero',slime:'character.slime',bat:'character.bat',archer:'character.archer',beetle:'character.beetle',wisp:'character.wisp',guardian:'character.guardian',coin:'item.coin'};
const palette: Record<string,string> = {o:'#171d24',a:'#424f63',b:'#81939d',c:'#dbe3db',s:'#e1b38a',d:'#aa7259',r:'#ab5849',R:'#df7b57',g:'#577e60',G:'#9fbf81',e:'#f5e7b2',p:'#706582',P:'#a296b0',y:'#e0ac54',Y:'#ffdf8b',t:'#46858e',T:'#91d6dc'};
const sprites: Record<string,string[]> = {
  [art.hero]: ['      ooooo     ','     oabbbao    ','    oabcccbbo   ','    oabcccbbo   ','    obbbbbbbo   ','    ossossso    ','    ossossso    ','     oddddo     ','   ooaRRRaao    ','  oaaRRRRRaao   ','  osaaRRRaaso   ','  osoabbbaoso   ','   ooabbbao     ','    oaaoaao     ','    oaaoaao     ','    ooo ooo     '],
  [art.slime]: ['                ','     oooooo     ','   ooGGGGGGoo   ','  oGGGGGGGGGGo  ',' oGGGGeGGGeGGGo ',' oGGGGooGGooGGo ',' oGGGGGGGGGGGGo ',' oGGGgGGGGgGGGo ','  oggggggggggo  ','   oooooooooo   '],
  [art.bat]: ['o              o','oo     oo     oo','oPo   oppo   oPo','oPPo oppppo oPPo',' oPPooppppooPPo ','  oPPPpeepPPPo  ','   oPPpoopPPo   ','    ooppppoo    ','      oooo      '],
  [art.archer]: ['    ooooo       ','   occccco      ','   coocooo      ','   cccccco      ','    occco    y  ','     oco    oyo ','   ooccco   ooy ','  occocooco  oy ','  ococccoco  oy ','   oooco oo  oy ','    ococo   oyo ','    ococo    y  ','    ocooco      ','    co  co      ','    oo  oo      '],
  [art.beetle]: ['    y      y    ','   ooyo  oyoo   ','   ooRRRRRoo    ','  ooRRRrRRRoo   ',' ooRRRRrRRRRoo  ',' ooRRRRrRRRRoo  ','oaoRRRRrRRRRoao ','  oRRRRrRRRRo   ','oaoRRRrrrRRRoao ','   oRRReeRRo    ','    ooYYoo      ','     oooo       '],
  [art.wisp]: ['      T         ','     TtT        ','    oTTTo       ','   oTTTTTo      ','  otTTTTTto     ','  otToToTto     ','  otTTTTTto     ','   ottttto      ','    ottto       ','    tTt         ','   t  tT        ','       t        '],
  [art.guardian]: ['     y      y     ','    oyooooooyo    ','    oyYYyYYyyo    ','    oooooooooo    ','   ooabbccbbboo   ','   oabccbbccbbo   ','   oabYobboYbbo   ','   oabbbaabbbbo   ','    oabbbbbbao    ','  oooaRRRRRaaooo  ',' oaabaRRRRRaabbao ',' oabbaRRRRRaabbao ',' oabbaRRRRRaabbao ','  oooabbbbbaooo   ','    oaabbaao      ','    oaaooaao      ','    oaaooaao      ','    oooo oooo     '],
  [art.coin]: ['   oooo   ','  oyYYyo  ',' oyYYyYyo ',' oyYyyYyo ',' oyYyyYyo ','  oyyyyo  ','   oooo   ']
};
export function buildAssets(scene:Phaser.Scene) {
  for(const [key,rows] of Object.entries(sprites)) {
    const width=Math.max(...rows.map(r=>r.length)); const texture=scene.textures.createCanvas(key,width,rows.length)!;
    const ctx=texture.context;rows.forEach((row,y)=>[...row].forEach((p,x)=>{if(palette[p]){ctx.fillStyle=palette[p];ctx.fillRect(x,y,1,1);}}));texture.refresh();
  }
}
