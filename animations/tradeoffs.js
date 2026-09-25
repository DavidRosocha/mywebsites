
'use strict';
/* ══════════════════════════════════════════════════════════════════
   OUTPUT SETTINGS

   The drawing below still works in the original 1920×1080 coordinate
   space; everything is multiplied by S on the way to the canvas, so at
   3840×2160 every glyph and hairline is re-rasterised rather than
   upscaled.

   TOTAL_FRAMES matches how the original recorder behaved: it forced
   t = 0 before starting and stopped the frame t reached DURATION, so
   there is no blank lead-in and the file lands one frame short of the
   full 64 s timeline. If ffprobe reports a different duration for your
   reference mp4, change TOTAL_FRAMES to round(duration × 60) — it is
   the only number that needs touching.
────────────────────────────────────────────────────────────────── */
const OUT = {
  W: Math.min(2560, Math.max(960, Math.round(innerWidth * Math.min(devicePixelRatio || 1, 2) / 16) * 16)),             // 1920 to reproduce the old file for A/B checking
  H: 1080,
  FPS: 60,
  LEAD_FRAMES: 0,      // recorder starts at t = 0, no blank head
  TOTAL_FRAMES: 3838,  // 3838 / 60 = 63.967 s

  AUTO: false,          // start the export on its own when the page opens
  AUTO_DELAY_MS: 2000  // grace period so you can hit Esc and just watch it
};

// One continuous 64-second timeline — no scene cuts, everything cross-fades.
// Pattern thumbnails are schematic stand-ins for the training set.
OUT.H = OUT.W * 9 / 16;
const cv=document.getElementById('c'),X=cv.getContext('2d'),W=1920,H=1080,DURATION=64;
const S=OUT.W/W;                       // logical → device scale factor
cv.width=OUT.W;cv.height=OUT.H;
function fit(){
  const f=Math.min(innerWidth/OUT.W,Math.max(1, innerHeight - (innerWidth < 540 ? 112 : 72))/OUT.H);
  cv.style.width=(OUT.W*f)+'px';cv.style.height=(OUT.H*f)+'px';
  cv.style.left=((innerWidth-OUT.W*f)/2)+'px';
  cv.style.top=((Math.max(1, innerHeight - (innerWidth < 540 ? 112 : 72))-OUT.H*f)/2)+'px';
}
fit();addEventListener('resize',fit);

const BG='#12141a',INK='#e4e6ea',DIM='#767d8c',MUT='#4a515f',EDGE='#282e3a',
      CYA='#6f9dc4',VIO='#8f7aa6',AMB='#cfae6a',RED='#b8635c',GRN='#7d9c6b';
const MONO='ui-monospace,SFMono-Regular,Menlo,monospace';
const clamp=v=>Math.max(0,Math.min(1,v)),mix=(a,b,p)=>a+(b-a)*p;
const ease=p=>{p=clamp(p);return p*p*(3-2*p)};
const ramp=(t,a,b)=>ease((t-a)/(b-a));
const during=(t,a,b,c,d)=>ramp(t,a,b)*(1-ramp(t,c,d));
const hash=(x,y=0)=>{const k=Math.sin(x*127.1+y*311.7)*43758.5453;return k-Math.floor(k)};
function layer(a,fn){if(a<.0001)return;X.save();X.globalAlpha*=a;fn();X.restore()}
function text(s,x,y,size=24,col=INK,align='center',math=false){X.save();X.font=math?`italic ${size}px Georgia`:`400 ${size}px ${MONO}`;X.textAlign=align;X.textBaseline='middle';X.fillStyle=col;X.fillText(s,x,y);X.restore()}
function box(x,y,w,h,col=EDGE,fill=null,r=8,lw=1.5){if(w<=0||h<=0)return;X.save();X.beginPath();X.roundRect(x,y,w,h,r);if(fill){X.fillStyle=fill;X.fill()}X.strokeStyle=col;X.lineWidth=lw;X.stroke();X.restore()}
function line(pts,col=DIM,lw=1.5,dash=null){X.save();X.strokeStyle=col;X.lineWidth=lw;X.lineJoin='round';if(dash)X.setLineDash(dash);X.beginPath();X.moveTo(...pts[0]);for(let i=1;i<pts.length;i++)X.lineTo(...pts[i]);X.stroke();X.restore()}

/* Vignette + fixed grain, baked at the OUTPUT resolution rather than at
   1920×1080 and stretched — otherwise every grain speck becomes a 2×2
   block. The grain is still placed in logical space and drawn S px wide,
   so density and weight are unchanged. */
const backdrop=document.createElement('canvas');backdrop.width=OUT.W;backdrop.height=OUT.H;
{const b=backdrop.getContext('2d');b.fillStyle=BG;b.fillRect(0,0,OUT.W,OUT.H);
 const g=b.createRadialGradient(1030*S,445*S,10*S,1030*S,445*S,1160*S);
 g.addColorStop(0,'#1c1d2a');g.addColorStop(.5,'#161923');g.addColorStop(1,'#101217');
 b.fillStyle=g;b.fillRect(0,0,OUT.W,OUT.H);
 for(let i=0;i<11000;i++){b.fillStyle=`rgba(185,195,211,${hash(i,2)*.022})`;b.fillRect(hash(i,3)*W*S,hash(i,4)*H*S,S,S)}}

// ── shapes ───────────────────────────────────────────────────────────────
const bits={
 heart :['0110110','1111111','1111111','0111110','0011100','0001000','0000000'],
 smiley:['0111110','1000001','1010101','1000001','1010101','1001001','0111110'],
 star  :['0001000','0001000','1111111','0111110','0011100','0100010','1000001'],
 tree  :['0001000','0011100','0111110','1111111','0011100','0001000','0011100'],
 arrow :['0001000','0011100','0111110','0001000','0001000','0001000','0001000'],
 house :['0001000','0011100','0111110','1111111','1101011','1101011','1111111'],
 fish  :['0000000','0011100','0111111','1111110','0111111','0011100','0000000'],
 cross :['0001000','0001000','1111111','1111111','0001000','0001000','0001000']
};
const glyphs=[...'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789','↑','→','↓','←','+','×','÷','=','○','□','△','◇','☆','∞','∩','!','?','<','>','⌂','♦','⬟','⬢','◐','◑','▲','▼','◀','▶','⬤','◼','✦'];
const NAMES=Object.keys(bits);
function glyphFor(i){return i<NAMES.length?{bits:bits[NAMES[i]]}:{glyph:glyphs[(i-NAMES.length)%glyphs.length]}}
function shape(i,x,y,size,alpha=1,tint=null){
 layer(alpha,()=>{
  box(x-size/2,y-size/2,size,size,EDGE,'#151821',6);
  const p=glyphFor(i),col=tint||(i%3===0?AMB:i%3===1?CYA:VIO);
  if(p.bits){const cell=size*.085;X.fillStyle=col;
   p.bits.forEach((row,r)=>[...row].forEach((v,c)=>{if(v==='1')
    X.fillRect(x+(c-3.5)*cell,y+(r-3.5)*cell,cell*.84,cell*.84)}))}
  else text(p.glyph,x,y,size*.5,col,'center',true);
 });
}

// ── the model: fixed capacity, carved up between shapes ─────────────────
const MX=960,MY=350,MS=250;                  // centre stage, fixed size
const IN_X=430,OUT_X=1490,ROW_Y=350;         // input left, prediction right
const GRID=30;

// Variety overshoots on purpose — past what the model can carry — then settles.
function variety(t){
 if(t<17)return 4;                                  // the failure below happens here
 if(t<37)return Math.round(mix(4,104,ramp(t,17,37)));
 if(t<49)return 104;                                // overshoot, then retreat
 return Math.round(mix(104,69,ramp(t,49,55)));
}
function regionOf(r,c,n){
 const cols=Math.ceil(Math.sqrt(n)),rows=Math.ceil(n/cols);
 const rr=Math.min(rows-1,Math.floor(r/GRID*rows));
 const cc=Math.min(cols-1,Math.floor(c/GRID*cols));
 return Math.min(n-1,rr*cols+cc);
}
const HUES=[[207,174,106],[111,157,196],[143,122,166],[125,156,107],[129,138,155]];

function capacity(t){
 const a=ramp(t,4,7)*(1-ramp(t,61,64));
 if(a<=0)return;
 X.save();X.globalAlpha*=a;
 const n=variety(t),cell=MS/GRID,crowd=clamp((n-8)/80);
 X.save();X.beginPath();X.roundRect(MX-MS/2,MY-MS/2,MS,MS,9);X.clip();
 for(let r=0;r<GRID;r++)for(let c=0;c<GRID;c++){
  const h=HUES[regionOf(r,c,n)%HUES.length];
  X.fillStyle=`rgba(${h[0]},${h[1]},${h[2]},${.20+hash(r,c)*.55})`;
  X.fillRect(MX-MS/2+c*cell,MY-MS/2+r*cell,cell-.7,cell-.7);
 }
 const cols=Math.ceil(Math.sqrt(n)),rows=Math.ceil(n/cols);
 layer(mix(.55,.08,crowd),()=>{
  for(let i=1;i<cols;i++)line([[MX-MS/2+i*MS/cols,MY-MS/2],[MX-MS/2+i*MS/cols,MY+MS/2]],'#0d0f14',1.6);
  for(let i=1;i<rows;i++)line([[MX-MS/2,MY-MS/2+i*MS/rows],[MX+MS/2,MY-MS/2+i*MS/rows]],'#0d0f14',1.6);
 });
 X.restore();
 box(MX-MS/2,MY-MS/2,MS,MS,crowd>.55?AMB:CYA,null,9,1.5+crowd*1.7);
 layer(during(t,6,8,59,62),()=>{
  text('THE MODEL',MX,MY-MS/2-44,19,DIM);
  text('fixed capacity',MX,MY-MS/2-21,15,MUT);
 });
 X.restore();
}

// ── the axis, with the training set accumulating along it ────────────────
const AX=230,AY=800,AW=1460,AMAX=120;
const posFor=n=>AX+(n/AMAX)*AW;
function axis(t){
 const a=ramp(t,2,5)*(1-ramp(t,60,64));
 layer(a,()=>{
  line([[AX,AY],[AX+AW,AY]],EDGE,2);
  for(let n=0;n<=AMAX;n+=10){const x=posFor(n);
   line([[x,AY],[x,AY+(n%20?7:13)]],MUT,1.2);
   if(n%20===0)layer(.55,()=>text(String(n),x,AY+34,16,MUT));}
  const n=variety(t);
  for(let i=0;i<n;i++){
   const x=posFor(i+1),tier=i%6;
   layer(.85,()=>shape(i,x,AY-40-tier*30,mix(30,15,ramp(t,12,32))));
  }
  const x=posFor(n);
  layer(during(t,4,6,58,61),()=>{
   line([[x,AY-8],[x,AY+18]],INK,2.4);
   box(x-52,AY+42,104,40,INK,'#12141aee',7,1.6);
   text(String(n),x,AY+62,23,INK);
  });
  layer(.7,()=>text('shapes in the training set',AX+AW/2,AY+112,18,DIM));
 });
}

// ── input, model, prediction — three stations in a row ───────────────────
// a freehand scrawl — deliberately not one of the training shapes
function scrawl(x,y,size,alpha,progress,col=GRN){
 layer(alpha,()=>{
  box(x-size/2,y-size/2,size,size,EDGE,'#151821',6);
  const pts=[];for(let i=0;i<=34;i++){const a=i/34*Math.PI*2.4;
   pts.push([x+Math.cos(a)*size*.29*(1+Math.sin(a*3)*.22),
             y+Math.sin(a)*size*.29*(1+Math.cos(a*2.4)*.20)])}
  const nn=Math.max(2,Math.floor(pts.length*clamp(progress)));
  line(pts.slice(0,nn),col,3.2);
 });
}
function mush(x,y,size,alpha,seed){
 layer(alpha,()=>{
  box(x-size/2,y-size/2,size,size,EDGE,'#151821',6);
  const cell=size*.085;
  for(let r=0;r<7;r++)for(let c=0;c<7;c++){
   if(hash(seed+r*7+c,seed)<.5)continue;
   layer(.35+hash(r,c+seed)*.5,()=>{
    const h=HUES[Math.floor(hash(r+seed,c)*4)];
    X.fillStyle=`rgb(${h[0]},${h[1]},${h[2]})`;
    X.fillRect(x+(c-3.5)*cell,y+(r-3.5)*cell,cell*.84,cell*.84)});
  }
 });
}
// the spinner lives in the prediction slot, so the answer replaces it
function pending(x,y,size,alpha,t){
 layer(alpha,()=>{
  box(x-size/2,y-size/2,size,size,EDGE,'#151821',6);
  X.save();X.strokeStyle=EDGE;X.lineWidth=3.4;
  X.beginPath();X.arc(x,y,26,0,Math.PI*2);X.stroke();
  X.strokeStyle=CYA;X.lineWidth=3.4;X.lineCap='round';
  X.beginPath();X.arc(x,y,26,t*4.4,t*4.4+1.9);X.stroke();X.restore();
 });
}
function feed(t,a){
 layer(a*.5,()=>{
  line([[IN_X+90,ROW_Y],[MX-MS/2-16,ROW_Y]],MUT,1.8,[6,7]);
  line([[MX+MS/2+16,ROW_Y],[OUT_X-90,ROW_Y]],MUT,1.8,[6,7]);
 });
}

// too few — it answers confidently, and it is wrong
function tooFew(t){
 const a=during(t,6,8,16,18.5);
 layer(a,()=>{
  feed(t,ramp(t,8,9.5));
  scrawl(IN_X,ROW_Y,150,1,ramp(t,7.5,10));
  layer(during(t,10.2,11,12.6,13.4),()=>pending(OUT_X,ROW_Y,150,1,t));
  layer(ramp(t,12.6,13.4),()=>{
   const wrong=ramp(t,14.6,15.7);
   shape(0,OUT_X,ROW_Y,150,1,wrong>.4?RED:null);
   layer(wrong,()=>{
    line([[OUT_X-62,ROW_Y-62],[OUT_X+62,ROW_Y+62]],RED,3.6);
    line([[OUT_X+62,ROW_Y-62],[OUT_X-62,ROW_Y+62]],RED,3.6);});
  });
 });
}
// past saturation — the answer resolves into noise
function tooMany(t){
 const a=during(t,37,39.5,48,50.5);
 layer(a,()=>{
  feed(t,ramp(t,39.5,41));
  scrawl(IN_X,ROW_Y,150,1,ramp(t,39,41.5));
  layer(during(t,41.8,42.6,44.8,45.6),()=>pending(OUT_X,ROW_Y,150,1,t));
  layer(ramp(t,44.8,45.6),()=>mush(OUT_X,ROW_Y,150,1,Math.floor(t*4)));
 });
}

// ── the spectrum ─────────────────────────────────────────────────────────
function spectrum(t){
 const a=ramp(t,51,55)*(1-ramp(t,63,64));
 layer(a,()=>{
  const y=AY-250,h=58;
  const g=X.createLinearGradient(AX,0,AX+AW,0);
  g.addColorStop(0,'rgba(184,99,92,.85)');
  g.addColorStop(.20,'rgba(184,99,92,.32)');
  g.addColorStop(.42,'rgba(125,156,107,.72)');
  g.addColorStop(.62,'rgba(125,156,107,.72)');
  g.addColorStop(.82,'rgba(184,99,92,.32)');
  g.addColorStop(1,'rgba(184,99,92,.85)');
  X.save();X.beginPath();X.roundRect(AX,y,AW,h,8);X.fillStyle=g;X.fill();
  X.strokeStyle=EDGE;X.lineWidth=1.4;X.stroke();X.restore();
  layer(ramp(t,53,56),()=>{
   text('memorises',AX+60,y-28,19,RED,'left');
   text('generalises',AX+AW*.5,y-28,19,GRN);
   text('saturated',AX+AW-60,y-28,19,RED,'right');
  });
  layer(ramp(t,55.5,58.5),()=>{
   const x=posFor(69);
   line([[x,y-12],[x,y+h+12]],INK,2.6);
   box(x-56,y+h+18,112,44,INK,'#12141aee',8,1.8);
   text('69',x,y+h+40,25,INK);
  });
 });
 layer(ramp(t,59,62),()=>text('squeezed from both ends',960,110,40,INK));
}
/* Backdrop goes down at device scale with an identity transform, then
   everything else draws through the S scale in original coordinates. */
function draw(t){
 X.setTransform(1,0,0,1,0,0);X.globalAlpha=1;X.drawImage(backdrop,0,0);
 X.setTransform(S,0,0,S,0,0);
 axis(t);capacity(t);tooFew(t);tooMany(t);spectrum(t);
}

// ── transport ────────────────────────────────────────────────────────────

window.portfolioAnimation={duration:64,poster:1,reset(){},async advance(seconds){draw(seconds);},draw(){}};