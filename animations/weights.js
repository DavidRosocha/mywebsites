
'use strict';
/* ══════════════════════════════════════════════════════════════════
   OUTPUT SETTINGS

   Nothing about the animation changes — same layout, same 28 s timeline.
   All drawing still happens in the original 1920 × 1080 coordinate space
   and is multiplied by S on the way to the canvas.

   Two things did need scaling beyond that, noted where they occur:
   the per-matrix textures (so they keep their 2:1 downscale instead of
   landing 1:1 and going hard-edged) and the drop shadows (canvas shadow
   blur and offset ignore the transform, so they would read half-size).
────────────────────────────────────────────────────────────────── */
const OUT = {
  W: Math.min(2560, Math.max(960, Math.round(innerWidth * Math.min(devicePixelRatio || 1, 2) / 16) * 16)),             // 1920 to reproduce at the old resolution
  H: 1080,
  FPS: 60,
  LEAD_FRAMES: 0,
  TOTAL_FRAMES: 1680,  // 1680 / 60 = 28.000 s, the full timeline

  AUTO: false,
  AUTO_DELAY_MS: 2000
};

// Exact user-supplied tensor shapes, with illustrative trained weight values.
// Every texture cell is one parameter. Dimensions are rows × columns.
OUT.H = OUT.W * 9 / 16;
const cv=document.getElementById('c'),X=cv.getContext('2d'),W=1920,H=1080,DURATION=28;
const S=OUT.W/W;                       // logical → device scale factor
cv.width=OUT.W;cv.height=OUT.H;
function fit(){
  const f=Math.min(innerWidth/OUT.W,Math.max(1, innerHeight - (innerWidth < 540 ? 112 : 72))/OUT.H);
  cv.style.width=(OUT.W*f)+'px';cv.style.height=(OUT.H*f)+'px';
  cv.style.left=((innerWidth-OUT.W*f)/2)+'px';
  cv.style.top=((Math.max(1, innerHeight - (innerWidth < 540 ? 112 : 72))-OUT.H*f)/2)+'px';
}
fit();addEventListener('resize',fit);

const BG='#12141a',INK='#e4e6ea',DIM='#858c9c',EDGE='#323847',AMB='#cfae6a',CYA='#6f9dc4',VIO='#8f7aa6';
const MONO='ui-monospace,SFMono-Regular,Menlo,monospace';
const clamp=v=>Math.max(0,Math.min(1,v)),mix=(a,b,p)=>a+(b-a)*p;
const ease=v=>{const p=clamp(v);return p*p*p*(p*(p*6-15)+10)};
const ramp=(t,a,b)=>ease((t-a)/(b-a));
const hash=(x,y=0)=>{const k=Math.sin(x*127.1+y*311.7)*43758.5453;return k-Math.floor(k)};
function layer(a,fn){if(a<.00001)return;X.save();X.globalAlpha*=a;fn();X.restore()}
function text(s,x,y,size=24,col=INK){X.save();X.font=`400 ${size}px ${MONO}`;X.textAlign='center';X.textBaseline='middle';X.fillStyle=col;X.fillText(s,x,y);X.restore()}
function outline(x,y,w,h,col=EDGE,r=4){X.beginPath();X.roundRect(x,y,w,h,r);X.strokeStyle=col;X.lineWidth=1.5;X.stroke()}

/* Backdrop is baked at the OUTPUT resolution rather than at 1920×1080 and
   stretched, so the vignette stays smooth and every grain speck stays a
   single pixel's worth of weight instead of becoming a 2×2 block. */
const backdrop=document.createElement('canvas');backdrop.width=OUT.W;backdrop.height=OUT.H;
{const b=backdrop.getContext('2d');b.fillStyle=BG;b.fillRect(0,0,OUT.W,OUT.H);
 const g=b.createRadialGradient(960*S,510*S,20*S,960*S,510*S,1100*S);
 g.addColorStop(0,'#20212e');g.addColorStop(.55,'#171923');g.addColorStop(1,'#101217');
 b.fillStyle=g;b.fillRect(0,0,OUT.W,OUT.H);
 for(let i=0;i<14000;i++){b.fillStyle=`rgba(185,195,211,${hash(i,2)*.035})`;
  b.fillRect(hash(i,3)*W*S,hash(i,4)*H*S,S,S)}}

const matrices=[
 {name:'Embedding',rows:64,cols:16,color:AMB,x:490,y:176,labelY:270,detail:'pixels → tokens',group:0},
 {name:'Positional embedding',rows:16,cols:64,color:VIO,x:960,y:176,labelY:270,detail:'row positions',group:0},
 {name:'Output projection',rows:16,cols:64,color:AMB,x:1430,y:176,labelY:270,detail:'tokens → pixels',group:0}
];
for(let block=0;block<2;block++){
 const y=480+block*352,group=block+1;
 [['W_q',64,64,CYA,355],['W_k',64,64,CYA,575],['W_v',64,64,CYA,795],['W_out',64,64,VIO,1015],['Feed-forward up',128,64,AMB,1235],['Feed-forward down',64,128,AMB,1535]].forEach(([name,rows,cols,color,x])=>matrices.push({name,rows,cols,color,x,y,labelY:y+158,group}));
 for(let n=0;n<2;n++)matrices.push({name:'LayerNorm '+(n+1),rows:2,cols:64,color:DIM,x:1770,y:y-35+n*75,labelY:y-11+n*75,norm:true,group});
}
/* Each texture is baked at 4·S px per cell. At 1080p the source was 4 px
   per cell drawn into 2 logical px, a 2:1 downscale; keeping that ratio
   at 4K is what preserves the softened look of the grids rather than
   landing them 1:1 and turning every cell into a hard 3-on-4 square. */
matrices.forEach((m,i)=>{
 m.w=m.cols*2;m.h=m.rows*2;
 m.texture=document.createElement('canvas');
 m.texture.width=m.cols*4*S;m.texture.height=m.rows*4*S;
 const c=m.texture.getContext('2d');
 for(let r=0;r<m.rows;r++)for(let k=0;k<m.cols;k++){
  const value=hash(k+10,r+i*137);c.globalAlpha=.2+.7*value;c.fillStyle=value<.5?VIO:m.color;
  c.fillRect(k*4*S,r*4*S,3*S,3*S);
 }
});
function layout(i,t){
 const m=matrices[i],start=3.2+m.group*.8+(i%8)*.09,p=ramp(t,start,start+5.2);
 return {x:mix(960+(i-9)*12,m.x,p),y:mix(550-(i-9)*11,m.y,p),w:m.w,h:m.h,angle:mix(-.1,0,p),p,
 label:ramp(t,start+5.2,start+6.2)*(1-ramp(t,20.5,24))};
}
function drawMatrix(i,t){
 const m=matrices[i],g=layout(i,t);
 X.save();X.translate(g.x,g.y);X.rotate(g.angle);
 /* shadowBlur and shadowOffsetY are in device pixels — the canvas
    transform does not apply to them — so they are scaled by hand. */
 X.shadowColor='#080a10';X.shadowBlur=mix(18,4,g.p)*S;X.shadowOffsetY=4*S;
 X.fillStyle='#171b25';X.fillRect(-g.w/2,-g.h/2,g.w,g.h);X.shadowBlur=0;X.shadowOffsetY=0;
 X.drawImage(m.texture,-g.w/2,-g.h/2,g.w,g.h);
 outline(-g.w/2,-g.h/2,g.w,g.h,m.color,0);
 X.restore();
 layer(g.label,()=>{
  text(m.name,m.x,m.labelY,m.norm?19:23,m.color);
  text(m.norm?'128 params':m.rows+' × '+m.cols,m.x,m.labelY+(m.norm?24:29),m.norm?17:21,DIM);
  if(m.detail)text(m.detail,m.x,m.labelY+56,18,DIM);
 });
}
function draw(t){
 X.setTransform(1,0,0,1,0,0);X.globalAlpha=1;X.drawImage(backdrop,0,0);
 X.setTransform(S,0,0,S,0,0);
 const casing=1-ramp(t,2.9,5.4);
 layer(casing,()=>{
  outline(659,300,602,502,'#414656',16);
  text('TRAINED MODEL',960,236,29,INK);
 });
 layer(ramp(t,9,11)*(1-ramp(t,20.5,24)),()=>{
  text('SHARED · ONCE',960,66,23,DIM);
  text('LAYER 1',132,480,22,DIM);text('LAYER 2',132,832,22,DIM);
 });
 // Fixed draw order and endpoint-derived placement prevent transition jolts.
 for(let i=0;i<matrices.length;i++)drawMatrix(i,t);
}

/* ── preview: real elapsed time, scrubbable; stands down during export ── */

window.portfolioAnimation={duration:28,poster:1,reset(){},async advance(seconds){draw(seconds);},draw(){}};