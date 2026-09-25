
/* ══════════════════════════════════════════════════════════════════
   OUTPUT SETTINGS

   The tiling scene only — nothing else from the original file is here.

   The feed animation on the right has been rebuilt. It used to be six
   cyan squares 26 px wide spaced 25 px apart along a 150 px path, so
   they overlapped into one solid bar that appeared to vibrate rather
   than travel. It is now a single tile at a time on a 320 px routed
   path, one delivery every 2.13 s, with the array flashing as each
   lands. See the feed block below for the detail.
────────────────────────────────────────────────────────────────── */
const OUT = {
  W: Math.min(2560, Math.max(960, Math.round(innerWidth * Math.min(devicePixelRatio || 1, 2) / 16) * 16)),             // 1920 to reproduce at the old resolution
  H: 1080,
  FPS: 60,
  LEAD_FRAMES: 0,
  TOTAL_FRAMES: 1090,  // 1090 / 60 = 18.167 s  (scene runs 18.000 s)

  AUTO: false,
  AUTO_DELAY_MS: 2000
};

OUT.H = OUT.W * 9 / 16;
const cv=document.getElementById('c'),X=cv.getContext('2d');
const W=1920,H=1080;
let sc=1,offX=0,offY=0;
function fit(){
  cv.width=OUT.W;cv.height=OUT.H;
  const f=Math.min(innerWidth/OUT.W,Math.max(1, innerHeight - (new URLSearchParams(location.search).has('scroll') ? 0 : (innerWidth < 540 ? 112 : 72)))/OUT.H);
  cv.style.width=(OUT.W*f)+'px';cv.style.height=(OUT.H*f)+'px';
  cv.style.left=((innerWidth-OUT.W*f)/2)+'px';
  cv.style.top=((Math.max(1, innerHeight - (new URLSearchParams(location.search).has('scroll') ? 0 : (innerWidth < 540 ? 112 : 72)))-OUT.H*f)/2)+'px';
  sc=Math.min(cv.width/W,cv.height/H);
  offX=(cv.width-W*sc)/2;offY=(cv.height-H*sc)/2;
}
fit();addEventListener('resize',fit);

const BG='#12141a';
const INK='#e4e6ea',DIM='#767d8c',MUT='#4a515f',FNT='#282e3a';
const CYA='#6f9dc4',VIO='#8f7aa6',AMB='#cfae6a',STL='#818a9b',RED='#b8635c',GRN='#7d9c6b';
const MONO='ui-monospace,SFMono-Regular,Menlo,monospace';
const MATH='Georgia,"Times New Roman",serif';

const eio=p=>p<.5?4*p*p*p:1-Math.pow(-2*p+2,3)/2;
const lin=p=>p;
const cl=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const lerp=(a,b,t)=>a+(b-a)*t;
const rnd=(a,b,s)=>{const v=Math.sin(a*127.1+b*311.7+s*74.7)*43758.5453;return v-Math.floor(v);};

/* ══════════════════════════════════════════════════════════════════
   CLOCK + SCHEDULER — one queue, rAF in preview, a virtual 1/60 s clock
   during export, so a slow 4K render costs time rather than accuracy.
────────────────────────────────────────────────────────────────── */
let gen=0;
let pending=[];
const RENDER={on:false,t:0};
const clock=()=>RENDER.on?RENDER.t:performance.now();

function tw(dur,fn,e=eio){
  const id=gen;
  return new Promise(res=>{
    const t0=clock();
    pending.push(()=>{
      if(id!==gen){res();return true;}
      const p=Math.min((clock()-t0)/dur,1);
      fn(e(p),p);
      if(p>=1){res();return true;}
      return false;
    });
  });
}
const wait=ms=>new Promise(res=>{
  const id=gen,t0=clock();
  pending.push(()=>{
    if(id!==gen||clock()-t0>=ms){res();return true;}
    return false;
  });
});
function pump(){
  const keep=[];
  for(let i=0;i<pending.length;i++){if(!pending[i]())keep.push(pending[i]);}
  pending=keep;
}

/* ── helpers ────────────────────────────────────────────────────── */
const glow=(c,b,fn)=>{X.save();X.shadowColor=c;X.shadowBlur=b;fn();X.restore();};
function lab(s,x,y,sz,col,al='center',w=400){
  X.font=`${w} ${sz}px ${MONO}`;X.fillStyle=col;X.textAlign=al;X.fillText(s,x,y);}
function mlab(s,x,y,sz,col,al='center'){
  X.font=`italic 400 ${sz}px ${MATH}`;X.fillStyle=col;X.textAlign=al;X.fillText(s,x,y);}
function corners(x,y,w,h,l,col,a){
  X.globalAlpha=a;X.strokeStyle=col;X.lineWidth=1.3;
  [[x,y,1,1],[x+w,y,-1,1],[x+w,y+h,-1,-1],[x,y+h,1,-1]].forEach(([px,py,sx,sy])=>{
    X.beginPath();X.moveTo(px+sx*l,py);X.lineTo(px,py);X.lineTo(px,py+sy*l);X.stroke();});}
function matrix(cx,cy,rows,cols,cell,tint,alpha,seed){
  const w=cols*cell,h=rows*cell,x0=cx-w/2,y0=cy-h/2;
  const g=cell<3?0:0.5;
  for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){
    X.globalAlpha=alpha;X.fillStyle=tint(rnd(r,c,seed));
    X.fillRect(x0+c*cell,y0+r*cell,cell-g,cell-g);}
  X.globalAlpha=alpha;X.strokeStyle='rgba(135,146,168,.26)';X.lineWidth=1;
  X.strokeRect(x0-.5,y0-.5,w+1,h+1);
  corners(x0-7,y0-7,w+14,h+14,11,'#262c38',alpha);
  return {x0,y0,w,h};
}
const tV=m=>`rgba(143,122,166,${.06+m*.58})`;
const tS=m=>`rgba(129,138,155,${.06+m*.46})`;


/* ── state ──────────────────────────────────────────────────────── */
const S={ tile:{a:0,slice:0,count:0,feed:0} };

/* ══ the tiling scene ════════════════════════════════════════════ */
function s7(){
  const t=S.tile;if(t.a<=0)return;
  X.globalAlpha=t.a;
  const cell=5.0, tile=8*cell;              // one 8×8 tile = 40 px

  // X : 16 × 64  →  2 tiles down, 8 tiles across
  const A=matrix(430,300,16,64,cell,tV,t.a,0);
  // W : 64 × 64  →  8 tiles down, 8 tiles across
  const B=matrix(980,420,64,64,cell,tS,t.a,3);
  X.globalAlpha=t.a;
  mlab('X',430,A.y0-58,26,VIO); lab('16 × 64',430,A.y0-36,14,MUT);
  mlab('W',980,B.y0-58,26,STL); lab('64 × 64',980,B.y0-36,14,MUT);
  mlab('×',(A.x0+A.w+B.x0)/2-30,308,30,FNT);

  if(t.slice>0){
    X.globalAlpha=t.a*t.slice;
    glow(AMB,5,()=>{
      X.strokeStyle=AMB;X.lineWidth=1.3;
      for(let i=0;i<=2;i++){X.beginPath();X.moveTo(A.x0,A.y0+i*tile);X.lineTo(A.x0+A.w,A.y0+i*tile);X.stroke();}
      for(let i=0;i<=8;i++){X.beginPath();X.moveTo(A.x0+i*tile,A.y0);X.lineTo(A.x0+i*tile,A.y0+A.h);X.stroke();}
      for(let i=0;i<=8;i++){X.beginPath();X.moveTo(B.x0,B.y0+i*tile);X.lineTo(B.x0+B.w,B.y0+i*tile);X.stroke();}
      for(let i=0;i<=8;i++){X.beginPath();X.moveTo(B.x0+i*tile,B.y0);X.lineTo(B.x0+i*tile,B.y0+B.h);X.stroke();}
    });
    // dimension brackets, placed clear of the matrix labels
    X.globalAlpha=t.a*t.slice*.9;
    lab('8 across',A.x0+A.w/2,A.y0+A.h+30,14,AMB);
    lab('2',A.x0-26,A.y0+A.h/2+5,14,AMB,'right');
    lab('down',A.x0-26,A.y0+A.h/2+22,11,MUT,'right');
    lab('8 across',B.x0+B.w/2,B.y0+B.h+30,14,AMB);
    lab('8',B.x0-26,B.y0+B.h/2+5,14,AMB,'right');
    lab('down',B.x0-26,B.y0+B.h/2+22,11,MUT,'right');
  }

  /* One clock for everything on the right. The walk's tile index drives the
     highlights, the connector lines and the array alike, so nothing can drift
     against anything else. Clamped at 127 so the last frames hold on tile 128
     instead of wrapping back to tile 1 during the fade. */
  const kf=Math.min(t.count*128,127.999);
  const k=Math.floor(kf);
  const mr=Math.floor(k/64), n=Math.floor((k%64)/8), d=k%8;   // row, col, depth

  // the three-way walk: which tile of A, which tile of B, and the depth step
  if(t.count>0){
    X.globalAlpha=t.a;
    // A tile  (row mr, depth d)
    glow(AMB,10,()=>{X.strokeStyle=AMB;X.lineWidth=2.2;
      X.strokeRect(A.x0+d*tile,A.y0+mr*tile,tile,tile);});
    // B tile  (depth d, col n)
    glow(CYA,10,()=>{X.strokeStyle=CYA;X.lineWidth=2.2;
      X.strokeRect(B.x0+n*tile,B.y0+d*tile,tile,tile);});
    // the depth link between them
    X.globalAlpha=t.a*.45;X.setLineDash([4,5]);
    X.strokeStyle=AMB;X.lineWidth=1.3;
    X.beginPath();
    X.moveTo(A.x0+d*tile+tile/2,A.y0+mr*tile+tile);
    X.lineTo(A.x0+d*tile+tile/2,B.y0+d*tile+tile/2);
    X.lineTo(B.x0+n*tile,B.y0+d*tile+tile/2);X.stroke();
    X.setLineDash([]);

    // readout of the three counters
    X.globalAlpha=t.a;
    const rx=250, ry=700;
    X.strokeStyle='#242a35';X.lineWidth=1.3;X.strokeRect(rx,ry,700,120);
    corners(rx-8,ry-8,716,136,12,'#2b313d',t.a);
    const trip=[['row',mr+1,2,AMB],['col',n+1,8,CYA],['depth',d+1,8,VIO]];
    trip.forEach((v,i)=>{
      const x=rx+60+i*225;
      lab(v[0],x,ry+34,13,MUT,'left');
      lab(v[1]+' / '+v[2],x,ry+76,30,v[3],'left',500);
    });
    X.globalAlpha=t.a*.6;
    lab('every row of A meets every column of W, and steps through all 8 depths between them',
        rx+350,ry+108,13,MUT);

    X.globalAlpha=t.a;
    lab('2  ×  8  ×  8',1480,700,40,INK,'center',500);
    lab('=  128 tiles',1480,748,22,AMB,'center',500);
    lab('tile '+(k+1)+' of 128',1480,790,15,MUT);
  }

  /* ── the single array they all queue through ──────────────────────
     Nothing here has its own timeline. Two connector lines run from the
     currently highlighted X tile and W tile to a junction just left of
     the array, then one arrow in — so the lines always point at exactly
     the tile the counters say is being processed.

     Dashes march along them at a steady rate to show flow, which reads
     without anything jumping. The array blooms once per completed output
     tile, i.e. every 8 depth steps, about 1.4 times a second. Flashing
     once per tile would be 11.6 Hz, which is a strobe, not a pulse.
  ──────────────────────────────────────────────────────────────── */
  if(t.feed>0){
    const vis=cl(t.feed*3);
    const ax=1420, ay=250, c2=22, aw=8*c2;
    const jx=1300, jy=ay+aw/2;
    const flash=cl(1-(kf%8)/3.2);      // decays over roughly 275 ms

    // routes from the two highlighted tiles to the junction
    const aRoute=[[A.x0+d*tile+tile/2,A.y0+mr*tile],
                  [A.x0+d*tile+tile/2,150],[jx,150],[jx,jy]];
    const bRoute=[[B.x0+n*tile+tile,B.y0+d*tile+tile/2],
                  [jx,B.y0+d*tile+tile/2],[jx,jy]];
    const run=(P,col)=>{
      X.globalAlpha=t.a*vis*.75;
      X.strokeStyle=col;X.lineWidth=1.8;
      X.setLineDash([6,8]);X.lineDashOffset=-t.feed*180;
      X.beginPath();X.moveTo(P[0][0],P[0][1]);
      for(let i=1;i<P.length;i++)X.lineTo(P[i][0],P[i][1]);
      X.stroke();X.setLineDash([]);X.lineDashOffset=0;
    };
    run(aRoute,AMB);
    run(bRoute,CYA);

    // the junction where the pair meets, then one arrow into the array
    X.globalAlpha=t.a*vis;
    glow(CYA,6,()=>{X.fillStyle=CYA;X.beginPath();X.arc(jx,jy,4,0,7);X.fill();});
    X.strokeStyle=CYA;X.lineWidth=1.8;
    X.beginPath();X.moveTo(jx,jy);X.lineTo(ax-18,jy);X.stroke();
    X.fillStyle=CYA;
    X.beginPath();X.moveTo(ax-8,jy);X.lineTo(ax-20,jy-6);X.lineTo(ax-20,jy+6);
    X.closePath();X.fill();

    // the array: lit while tiles flow, blooming as each output tile lands
    for(let r=0;r<8;r++)for(let c=0;c<8;c++){
      X.globalAlpha=t.a*vis;
      X.fillStyle=`rgba(207,174,106,${.42+flash*.34})`;
      X.fillRect(ax+c*c2,ay+r*c2,c2-3,c2-3);}
    if(flash>0)glow(AMB,8+flash*14,()=>{
      X.globalAlpha=t.a*vis*flash*.9;X.strokeStyle=AMB;X.lineWidth=2.4;
      X.strokeRect(ax-5,ay-5,aw+6,aw+6);});
    X.globalAlpha=t.a*vis;
    X.strokeStyle='rgba(207,174,106,.55)';X.lineWidth=1.4;
    X.strokeRect(ax-5,ay-5,aw+6,aw+6);
    lab('ONE 8 × 8 ARRAY',ax+aw/2-2,ay-24,15,AMB,'center',500);
    lab('reused 128 times',ax+aw/2-2,ay+aw+26,13,MUT);
    X.globalAlpha=t.a*vis*.7;
    lab('one pair of tiles at a time',jx-6,jy+30,13,DIM);
  }
}

/* ── loop ───────────────────────────────────────────────────────── */
function backdrop(){
  X.setTransform(sc,0,0,sc,offX,offY);
  X.globalAlpha=1;
  X.strokeStyle='rgba(150,160,185,.022)';X.lineWidth=1;
  for(let x=0;x<=W;x+=40){X.beginPath();X.moveTo(x,0);X.lineTo(x,H);X.stroke();}
  for(let y=0;y<=H;y+=40){X.beginPath();X.moveTo(0,y);X.lineTo(W,y);X.stroke();}
  X.strokeStyle='rgba(150,160,185,.042)';
  for(let x=0;x<=W;x+=200){X.beginPath();X.moveTo(x,0);X.lineTo(x,H);X.stroke();}
  for(let y=0;y<=H;y+=200){X.beginPath();X.moveTo(0,y);X.lineTo(W,y);X.stroke();}
}
function drawFrame(){
  X.setTransform(1,0,0,1,0,0);
  X.globalAlpha=1;X.shadowBlur=0;X.setLineDash([]);
  X.fillStyle=BG;X.fillRect(0,0,cv.width,cv.height);
  backdrop();
  s7();
}
function loop(){
  if(!RENDER.on){pump();drawFrame();}
  requestAnimationFrame(loop);
}

function clearAll(){
  gen++;
  pending=[];
  Object.assign(S.tile,{a:0,slice:0,count:0,feed:0});
}

async function sc7(){                       // 18.000 s
  const id=gen;
  await tw(600,p=>S.tile.a=p);
  await wait(2600);
  await tw(1600,p=>S.tile.slice=p,lin);      // slice into tiles
  await wait(1600);
  tw(11000,p=>S.tile.count=p,lin);           // walk row / col / depth
  await wait(3200);
  tw(8500,p=>S.tile.feed=p*2.6,lin);         // queue into the array
  await wait(7800);
  if(id!==gen)return;
  await tw(600,p=>{S.tile.a=1-p;});
}

async function play(){
  clearAll();const id=gen;
  if(id!==gen)return;
  await sc7();
}


let portfolioFrame=-1,portfolioStarted=false;
window.portfolioAnimation={
 duration:18.167,poster:1,
 reset(){RENDER.on=true;RENDER.t=-OUT.LEAD_FRAMES*1000/60;clearAll();portfolioFrame=-1;portfolioStarted=false;},
 async advance(seconds){
  const last=Math.round(seconds*60);
  if(last<portfolioFrame)this.reset();
  for(let frame=portfolioFrame+1;frame<=last;frame++){
   RENDER.t=(frame-OUT.LEAD_FRAMES)*1000/60;
   if(!portfolioStarted && frame>=OUT.LEAD_FRAMES){portfolioStarted=true;play();}
   if(portfolioStarted)pump();
   for(let flush=0;flush<5;flush++)await Promise.resolve();
   portfolioFrame=frame;
  }
  drawFrame();
 },
 draw(){drawFrame();}
};

window.portfolioAnimation.scrollTo = seconds => {
 const t = Math.max(0, seconds);
 Object.assign(S.tile, {a:eio(cl(t/.6)) * (1-eio(cl((t-17.4)/.6))),
   slice:cl((t-3.2)/1.6), count:cl((t-6.4)/11), feed:cl((t-9.6)/8.5)*2.6});
 drawFrame();
};
