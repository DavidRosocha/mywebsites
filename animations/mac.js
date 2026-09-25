
/* ══════════════════════════════════════════════════════════════════
   OUTPUT SETTINGS

   Scene 6 only — the updated version with the compact feed queues, the
   split A × B landing positions and the opaque running totals.

   The scene runs 25.133 s; 1515 frames leaves a few blank frames after
   the closing fade. The seven cycles land at 3.100, 5.600, 8.100,
   10.617, 13.117, 15.617 and 18.117 s if you need to cut to any of them.
────────────────────────────────────────────────────────────────── */
const OUT = {
  W: Math.min(2560, Math.max(960, Math.round(innerWidth * Math.min(devicePixelRatio || 1, 2) / 16) * 16)),             // 1920 to reproduce at the old resolution
  H: 1080,
  FPS: 60,
  LEAD_FRAMES: 0,
  TOTAL_FRAMES: 1515,  // 1515 / 60 = 25.250 s

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

const glow=(c,b,fn)=>{X.save();X.shadowColor=c;X.shadowBlur=b;fn();X.restore();};
function lab(s,x,y,sz,col,al='center',w=400){
  X.font=`${w} ${sz}px ${MONO}`;X.fillStyle=col;X.textAlign=al;X.fillText(s,x,y);}
function mlab(s,x,y,sz,col,al='center'){
  X.font=`italic 400 ${sz}px ${MATH}`;X.fillStyle=col;X.textAlign=al;X.fillText(s,x,y);}
function corners(x,y,w,h,l,col,a){
  X.globalAlpha=a;X.strokeStyle=col;X.lineWidth=1.3;
  [[x,y,1,1],[x+w,y,-1,1],[x+w,y+h,-1,-1],[x,y+h,1,-1]].forEach(([px,py,sx,sy])=>{
    X.beginPath();X.moveTo(px+sx*l,py);X.lineTo(px,py);X.lineTo(px,py+sy*l);X.stroke();});}

/* ── state ──────────────────────────────────────────────────────── */
const S={ sysc:{a:0,cyc:0,note:0,drain:0} };

/* ══ 6 · the 3×3 walkthrough ═════════════════════════════════════ */
const SA=[[2,1,3],[1,4,2],[3,2,1]];
const SB=[[1,2,1],[3,1,2],[2,1,3]];
const N3=3, TOT=3*N3-2;
function accAt(r,c,t){let s=0;
  for(let k=0;k<N3;k++) if(t>r+c+k) s+=SA[r][k]*SB[k][c];
  return s;}

function d6(){
  const s=S.sysc;if(s.a<=0)return;
  const cell=108, ax=760, ay=430;          // the array
  const slot=64;                            // compact queues, unchanged PE pitch
  const tc=s.cyc;
  // Integer times are the held end of a step, not the start of the next one.
  const ti=Math.min(TOT-1,Math.floor(Math.max(0,tc-0.000001)));
  const phase=cl(tc-ti), travel=ti+cl(phase/.62);
  const merged=phase>=.84;
  const TRK=2*N3-1;                         // include the entire staggered input
  const feedOffset=p=>p>=-1?p*cell:-cell+(p+1)*slot;
  const queueLeft=ax+feedOffset(-TRK)+(cell-12)/2-22-30;
  const queueTop=ay+feedOffset(-TRK)+(cell-12)/2+4-30;

  /* ── feed tracks: a channel per row and per column ── */
  X.globalAlpha=s.a*.55;
  X.strokeStyle='#232935';X.lineWidth=1.3;
  for(let r=0;r<N3;r++){
    const y=ay+r*cell+(cell-12)/2+4;
    X.strokeRect(queueLeft,y-30,ax-6-queueLeft,60);
    for(let i=1;i<TRK;i++){
      X.globalAlpha=s.a*.28;
      const div=ax+feedOffset(-i)+(cell-12)/2-22-slot/2;
      X.beginPath();X.moveTo(div,y-30);
      X.lineTo(div,y+30);X.stroke();
      X.globalAlpha=s.a*.55;
    }
  }
  for(let c=0;c<N3;c++){
    const x=ax+c*cell+(cell-12)/2+22;
    X.strokeRect(x-30,queueTop,60,ay-6-queueTop);
    for(let i=1;i<TRK;i++){
      X.globalAlpha=s.a*.28;
      const div=ay+feedOffset(-i)+(cell-12)/2+4-slot/2;
      X.beginPath();X.moveTo(x-30,div);
      X.lineTo(x+30,div);X.stroke();
      X.globalAlpha=s.a*.55;
    }
  }

  /* ── the values sitting in those channels, shifting one slot a cycle ── */
  const SZ=32;
  const chip=(x,y,txt,col,bright)=>{
    glow(col,bright?10:0,()=>{
      X.fillStyle=bright?col:'rgba(120,120,130,.20)';
      X.beginPath();X.roundRect(x-SZ/2,y-SZ/2,SZ,SZ,6);X.fill();});
    X.strokeStyle=bright?'rgba(255,255,255,.25)':'rgba(255,255,255,.06)';
    X.lineWidth=1;X.beginPath();X.roundRect(x-SZ/2,y-SZ/2,SZ,SZ,6);X.stroke();
    lab(txt,x,y+7,20,bright?'#12141a':DIM,'center',500);
  };

  /* ── the processing elements ── */
  for(let r=0;r<N3;r++)for(let c=0;c<N3;c++){
    const live=ti>=r+c&&ti<r+c+N3;
    X.globalAlpha=s.a;
    X.fillStyle=live?'rgba(207,174,106,.13)':'rgba(255,255,255,.014)';
    X.beginPath();X.roundRect(ax+c*cell,ay+r*cell,cell-12,cell-12,8);X.fill();
    X.strokeStyle=live?AMB:'#2a3040';X.lineWidth=live?2.4:1.3;
    if(live)glow(AMB,11,()=>{X.beginPath();
      X.roundRect(ax+c*cell,ay+r*cell,cell-12,cell-12,8);X.stroke();});
    else {X.beginPath();X.roundRect(ax+c*cell,ay+r*cell,cell-12,cell-12,8);X.stroke();}
    X.globalAlpha=s.a*.4;
    lab('C'+r+c,ax+c*cell+10,ay+r*cell+20,11,MUT,'left');
    // hand-off links
    X.globalAlpha=s.a*.3;X.strokeStyle='#333a48';X.lineWidth=1.4;
    if(c<N3-1){X.beginPath();X.moveTo(ax+c*cell+cell-12,ay+r*cell+(cell-12)/2+4);
      X.lineTo(ax+(c+1)*cell,ay+r*cell+(cell-12)/2+4);X.stroke();}
    if(r<N3-1){X.beginPath();X.moveTo(ax+c*cell+(cell-12)/2+22,ay+r*cell+cell-12);
      X.lineTo(ax+c*cell+(cell-12)/2+22,ay+(r+1)*cell);X.stroke();}
  }

  // Continuous, numbered A and B streams travel through every PE. Separate
  // landing positions make the incoming pair readable as A × B.
  for(let r=0;r<N3;r++)for(let k=0;k<N3;k++){
    const pos=travel-r-k-1;
    if(pos<-TRK||pos>N3-1)continue;
    const x=ax+feedOffset(pos)+(cell-12)/2-22, y=ay+r*cell+(cell-12)/2+4;
    X.globalAlpha=s.a;
    chip(x,y,String(SA[r][k]),VIO,pos>-.7);
  }
  for(let c=0;c<N3;c++)for(let k=0;k<N3;k++){
    const pos=travel-c-k-1;
    if(pos<-TRK||pos>N3-1)continue;
    const x=ax+c*cell+(cell-12)/2+22, y=ay+feedOffset(pos)+(cell-12)/2+4;
    X.globalAlpha=s.a;
    chip(x,y,String(SB[k][c]),STL,pos>-.7);
  }

  // The opaque total sits above the departing values. During an incoming
  // step it yields to the pair, then returns only after both have arrived.
  for(let r=0;r<N3;r++)for(let c=0;c<N3;c++){
    const live=ti>=r+c&&ti<r+c+N3;
    const cx=ax+c*cell+(cell-12)/2, cy=ay+r*cell+(cell-12)/2+4;
    if(live&&!merged&&phase>=.22){
      if(phase>=.62){X.globalAlpha=s.a;lab('×',cx,cy+6,17,INK);}
      continue;
    }
    const completed=ti+(merged?1:0);
    if(completed<=r+c)continue;
    X.globalAlpha=s.a;X.fillStyle=BG;
    X.beginPath();X.roundRect(cx-42,cy-23,84,46,5);X.fill();
    lab(String(accAt(r,c,completed)),cx,cy+10,30,CYA);
  }

  /* ── labels on the feeds ── */
  X.globalAlpha=s.a;
  mlab('A',queueLeft-70,ay+cell*1.5,28,VIO);
  lab('each row delayed',queueLeft-70,ay+cell*1.5+28,11,MUT,'center');
  lab('one more cycle',queueLeft-70,ay+cell*1.5+44,11,MUT,'center');
  mlab('B',ax+cell+(cell-12)/2+22,queueTop-46,28,STL);
  lab('columns, same offset',ax+cell+(cell-12)/2+22,queueTop-24,11,MUT,'center');

  /* ── cycle readout, top right, clear of everything ── */
  const rx=1330,ry=300;
  X.globalAlpha=s.a;
  X.strokeStyle='#242a35';X.lineWidth=1.3;X.strokeRect(rx,ry,430,120);
  corners(rx-8,ry-8,446,136,13,'#2b313d',s.a);
  lab('CYCLE',rx+26,ry+34,13,MUT,'left',500);
  lab((ti+1)+' / '+TOT,rx+26,ry+94,44,AMB,'left',500);
  X.globalAlpha=s.a*.6;lab('3N − 2 = 7',rx+404,ry+94,19,DIM,'right');

  /* ── what is happening right now, in words ── */
  if(ti<TOT){
    const activeCells=[];
    for(let r=0;r<N3;r++)for(let c=0;c<N3;c++){
      const k=ti-r-c;
      if(k>=0&&k<N3)activeCells.push([r,c,k]);
    }
    X.globalAlpha=s.a;
    X.strokeStyle='#242a35';X.lineWidth=1.3;X.strokeRect(rx,ry+150,430,250);
    corners(rx-8,ry+142,446,266,13,'#2b313d',s.a);
    lab('THIS CYCLE',rx+26,ry+184,13,MUT,'left',500);
    activeCells.slice(0,4).forEach(([r,c,k],i)=>{
      const y=ry+224+i*46;
      X.globalAlpha=s.a;
      lab('C'+r+c,rx+26,y,20,CYA,'left',500);
      X.globalAlpha=s.a*.85;
      lab('+=',rx+92,y,17,MUT,'left');
      lab(String(SA[r][k]),rx+134,y,20,VIO,'left');
      lab('×',rx+160,y,15,MUT,'left');
      lab(String(SB[k][c]),rx+184,y,20,STL,'left');
      lab('=',rx+214,y,15,MUT,'left');
      lab(String(SA[r][k]*SB[k][c]),rx+240,y,20,AMB,'left');
    });
    if(activeCells.length===0){
      X.globalAlpha=s.a*.5;
      lab('array draining',rx+26,ry+226,17,MUT,'left');
    }
  }

  if(s.note>0){
    X.globalAlpha=s.a*s.note;
    lab('each value crosses the edge once — after that it is passed hand to hand',
        960,ay+N3*cell+44,16,GRN);
  }
  if(s.drain>0){
    X.globalAlpha=s.a*s.drain;
    lab('every accumulator now holds a finished dot product',960,ay+N3*cell+80,19,CYA);
  }
}

/* ── loop ───────────────────────────────────────────────────────── */
function backdrop(){
  X.setTransform(sc,0,0,sc,offX,offY);X.globalAlpha=1;
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
  d6();
}
function loop(){
  if(!RENDER.on){pump();drawFrame();}
  requestAnimationFrame(loop);
}

function clearAll(){
  gen++;
  pending=[];
  Object.assign(S.sysc,{a:0,cyc:0,note:0,drain:0});
}

async function sc6(){                       // 25.133 s
  const id=gen;
  await tw(700,p=>S.sysc.a=p);
  await wait(1500);
  for(let k=0;k<TOT;k++){
    if(id!==gen)return;
    await tw(900,p=>S.sysc.cyc=k+p,lin);
    await wait(1600);
    if(k===2) tw(800,p=>S.sysc.note=p);
  }
  await tw(800,p=>S.sysc.drain=p);
  await wait(4000);
  if(id!==gen)return;
  await tw(600,p=>S.sysc.a=1-p);
}

async function play(){
  clearAll();const id=gen;
  if(id!==gen)return;
  await sc6();
}


let portfolioFrame=-1,portfolioStarted=false;
window.portfolioAnimation={
 duration:25.25,poster:1,
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
 const t = Math.max(0, seconds), elapsed = Math.max(0, t - 2.2);
 const cycle = Math.min(TOT, Math.floor(elapsed / 2.5) + Math.min(1, (elapsed % 2.5) / .9));
 Object.assign(S.sysc, {a:eio(cl(t/.7)) * (1-eio(cl((t-24.5)/.6))), cyc:cycle,
   note:eio(cl((t-9.7)/.8)), drain:eio(cl((t-19.7)/.8))});
 drawFrame();
};
