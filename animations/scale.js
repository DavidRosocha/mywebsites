
/* ══════════════════════════════════════════════════════════════════
   OUTPUT SETTINGS

   Rebuilt from DOM/CSS onto a canvas. The original had no canvas at all,
   which is why the recorder script in it never did anything — it looked
   for one and silently gave up. On canvas it can use the same
   deterministic 4K exporter as the others.

   Timing is free here, so the original's beats are kept as they were:
   the whole run lands at about 21.5 s and the final state holds to 24 s.
────────────────────────────────────────────────────────────────── */
const OUT = {
  W: Math.min(2560, Math.max(960, Math.round(innerWidth * Math.min(devicePixelRatio || 1, 2) / 16) * 16)),             // 1920 to reproduce at the old resolution
  H: 1080,
  FPS: 60,
  LEAD_FRAMES: 0,
  TOTAL_FRAMES: 1440,  // 1440 / 60 = 24.000 s

  AUTO: false,
  AUTO_DELAY_MS: 2000
};

OUT.H = OUT.W * 9 / 16;
const cv=document.getElementById('c'),X=cv.getContext('2d');
const W=1920,H=1080;
let S2=1;
function fit(){
  cv.width=OUT.W;cv.height=OUT.H;
  const f=Math.min(innerWidth/OUT.W,Math.max(1, innerHeight - (innerWidth < 540 ? 112 : 72))/OUT.H);
  cv.style.width=(OUT.W*f)+'px';cv.style.height=(OUT.H*f)+'px';
  cv.style.left=((innerWidth-OUT.W*f)/2)+'px';
  cv.style.top=((Math.max(1, innerHeight - (innerWidth < 540 ? 112 : 72))-OUT.H*f)/2)+'px';
  S2=OUT.W/W;
}
fit();addEventListener('resize',fit);

/* the background from the other animations, no grid */
const BG='#12141a';
const INK='#e4e6ea', SUB='#767d8c';
const GREY='#7d7d76', BLUE='#4a86c8';
const B1='#5f6670', HUDC='#5a616b';
const SANS='"Segoe UI",system-ui,-apple-system,Helvetica,Arial,sans-serif';

const eio=p=>p<.5?4*p*p*p:1-Math.pow(-2*p+2,3)/2;
const eo=p=>1-Math.pow(1-p,3), lin=p=>p;
const lerp=(a,b,t)=>a+(b-a)*t;

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

/* ══════════════════════════════════════════════════════════════════
   LAYOUT

   The original sized itself from innerWidth and then parked the camera
   at BAR_W * 0.72, which pushed the bar's left edge off frame and let
   the stat text drift toward the right margin. This is a fixed
   composition inside the 1920 × 1080 frame instead: the whole stack
   spans y 224–854, centred on 539 against a frame centre of 540, and
   the camera moves relative to it rather than defining it.
────────────────────────────────────────────────────────────────── */
const L={
  barX:398, barW:860, barH:84, barR:8,
  row1:398, row2:638,
  statX:1308,
  nameSz:58, numSz:64, unitSz:34, badgeSz:26
};
const RATIO=1555000;

const cam={x:960,y:540,z:1};
const POSE={
  open  :{x:820,y:440,z:1.40},   // in on the first bar, but not aggressively
  settle:{x:960,y:540,z:1},      // identity — whole composition in frame
  lower :{x:960,y:660,z:1.12}    // weighted to the second row
};
function camTo(t,dur){
  const sx=cam.x,sy=cam.y,ls=Math.log(cam.z),lt=Math.log(t.z);
  return tw(dur,e=>{
    cam.x=lerp(sx,t.x,e);cam.y=lerp(sy,t.y,e);cam.z=Math.exp(lerp(ls,lt,e));
  });
}

const S={n1:0,n2:0,s1:0,s2:0,b1:0,b2:0,ruler:0,rulerW:0,hud:0,hudZ:1,w1:0,w2:0};

/* ── drawing ────────────────────────────────────────────────────── */
function txt(s,x,y,sz,col,al='left',wt=500){
  X.font=`${wt} ${sz}px ${SANS}`;X.textAlign=al;X.textBaseline='alphabetic';
  X.fillStyle=col;X.fillText(s,x,y);
}
function bar(x,y,w,h,r,col){
  if(w<=0)return;
  X.fillStyle=col;X.beginPath();X.roundRect(x,y,w,Math.max(h,0),Math.min(r,w/2));X.fill();
}
function row(top,name,nameA,barW,barCol,num,unit,statA,badge,badgeA,badgeCol){
  if(nameA>0){X.globalAlpha=nameA;txt(name,L.barX,top-44,L.nameSz,INK);}
  X.globalAlpha=1;
  bar(L.barX,top,barW,L.barH,L.barR,barCol);
  if(statA>0){
    X.globalAlpha=statA;
    txt(num ,L.statX,top+34,L.numSz ,INK,'left',500);
    txt(unit,L.statX,top+76,L.unitSz,SUB,'left',400);
  }
  if(badgeA>0){
    X.globalAlpha=badgeA;
    txt(badge,L.barX,top+L.barH+40,L.badgeSz,badgeCol,'left',400);
  }
  X.globalAlpha=1;
}

function drawFrame(){
  X.setTransform(1,0,0,1,0,0);
  X.globalAlpha=1;X.shadowBlur=0;X.setLineDash([]);
  X.fillStyle=BG;X.fillRect(0,0,cv.width,cv.height);

  // camera, in the fixed 1920×1080 layout space
  X.setTransform(S2,0,0,S2,0,0);
  X.translate(960,540);X.scale(cam.z,cam.z);X.translate(-cam.x,-cam.y);

  row(L.row1,'GPT-3',S.n1,S.w1*L.barW,GREY,'350 GB','3,200 watts',S.s1,
      'actual size',S.b1,B1);

  if(S.ruler>0){
    X.globalAlpha=S.ruler*.85;
    X.strokeStyle=BLUE;X.lineWidth=4;X.setLineDash([18,14]);
    X.beginPath();X.moveTo(L.barX,L.row2-18);
    X.lineTo(L.barX+S.rulerW*L.barW,L.row2-18);X.stroke();
    X.setLineDash([]);X.globalAlpha=1;
  }

  row(L.row2,'My TPU',S.n2,S.w2*L.barW,BLUE,'225 KB','2 watts',S.s2,
      'zoomed in 1,555,000\u00d7',S.b2,BLUE);

  // zoom readout, pinned to the frame rather than the world
  if(S.hud>0){
    X.setTransform(S2,0,0,S2,0,0);
    X.globalAlpha=S.hud;
    const z=S.hudZ;
    const s=(z<10?z.toFixed(1):Math.round(z).toLocaleString('en-US'))+'\u00d7';
    X.font=`400 26px ${SANS}`;X.textAlign='center';X.fillStyle=HUDC;
    X.fillText(s,960,1016);
    X.globalAlpha=1;
  }
}
function loop(){
  if(!RENDER.on){pump();drawFrame();}
  requestAnimationFrame(loop);
}

function reset(){
  gen++;pending=[];
  Object.assign(S,{n1:0,n2:0,s1:0,s2:0,b1:0,b2:0,ruler:0,rulerW:0,hud:0,hudZ:1,w1:0,w2:0});
  Object.assign(cam,POSE.open);
}

/* the second bar grows exponentially; the readout is its own multiplier */
function deepZoom(dur){
  const from=1/RATIO;
  const lf=Math.log(from),lt=Math.log(1);
  return tw(dur,e=>{
    S.w2=Math.exp(lerp(lf,lt,e));
    S.hudZ=S.w2/from;
  });
}

async function run(){
  reset();const id=gen;
  await wait(500);

  await tw(450,p=>S.n1=p);
  await wait(450);

  // the bar grows while the camera eases out to the settled composition
  tw(3200,p=>S.w1=p,eo);
  await camTo(POSE.settle,3200);
  await wait(500);
  if(id!==gen)return;

  await tw(500,p=>S.s1=p);
  await wait(1500);

  await camTo(POSE.lower,1700);
  await tw(450,p=>S.n2=p);
  await wait(450);
  if(id!==gen)return;

  // it is there, it is just 1/1,555,000th of the width
  S.w2=1/RATIO;
  await wait(1500);

  await tw(400,p=>S.hud=p);
  await deepZoom(6000);
  await wait(400);
  await tw(400,p=>S.hud=1-p);
  if(id!==gen)return;

  await tw(500,p=>S.s2=p);
  await wait(400);

  await camTo(POSE.settle,1700);
  S.rulerW=1;
  await tw(500,p=>{S.ruler=p;S.b1=p;S.b2=p});
  await wait(2000);
}


let portfolioFrame=-1,portfolioStarted=false;
window.portfolioAnimation={
 duration:24,poster:2,
 reset(){RENDER.on=true;RENDER.t=-OUT.LEAD_FRAMES*1000/60;reset();portfolioFrame=-1;portfolioStarted=false;},
 async advance(seconds){
  const last=Math.round(seconds*60);
  if(last<portfolioFrame)this.reset();
  for(let frame=portfolioFrame+1;frame<=last;frame++){
   RENDER.t=(frame-OUT.LEAD_FRAMES)*1000/60;
   if(!portfolioStarted && frame>=OUT.LEAD_FRAMES){portfolioStarted=true;run();}
   if(portfolioStarted)pump();
   for(let flush=0;flush<5;flush++)await Promise.resolve();
   portfolioFrame=frame;
  }
  drawFrame();
 },
 draw(){drawFrame();}
};
