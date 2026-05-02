function clamp(v,lo,hi){return Math.min(Math.max(v,lo),hi);}
function normDim(val,min,max,def){const n=Number(val);if(!isFinite(n)||n<=0)return def;return Math.min(Math.max(n,min),max);}

const ML=82,MR=60,MT=44,MB=98;
const cases=[
  {name:'user breaking (620x396)',rawW:620,rawH:396},
  {name:'standard (96x108)',       rawW:96, rawH:108},
  {name:'very wide (360x108)',     rawW:360,rawH:108},
  {name:'very tall (120x180)',     rawW:120,rawH:180},
  {name:'maximum (600x180)',       rawW:600,rawH:180},
  {name:'minimum (36x84)',         rawW:36, rawH:84},
  {name:'zero (0x0)',              rawW:0,  rawH:0},
];

cases.forEach(({name,rawW,rawH})=>{
  const W=normDim(rawW,36,600,120);
  const H=normDim(rawH,84,180,108);
  const clamped=(rawW!==W||rawH!==H)?'CLAMPED':'ok';
  const sx=760/Math.max(W,1);
  const sy=520/Math.max(H,1);
  const scale=clamp(Math.min(sx,sy),0.5,8);
  const totalW=Math.round(ML+W*scale+MR);
  const totalH=Math.round(MT+H*scale+MB);
  console.log(name+': '+clamped+' | dims '+W+'x'+H+'" | scale '+scale.toFixed(3)+' | SVG '+totalW+'x'+totalH+'px');
});
