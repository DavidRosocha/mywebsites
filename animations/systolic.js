
/* ══════════════════════════════════════════════════════════════════
   OUTPUT SETTINGS

   The canvas used to size itself from the window and devicePixelRatio,
   so the capture resolution was whatever the browser happened to be.
   It is now pinned to a fixed export size, making the internal scale
   factor exactly 2.0 at 4K — every glyph and hairline is re-rasterised
   rather than stretched.

   Matched to the reference render, which I measured at 9407 frames /
   156.783 s with no blank lead-in. The scene chain itself runs 155.017 s
   and scene 12 has no fade-out, so the final card holds for the last
   1.77 s — exactly what the reference does.

   Scene ends, if you want to spot-check against your timeline:
     1  16.150   2  29.167   3  32.867   4  38.617
     5  43.617   6  68.717   7  81.217   8  88.017
     9 101.917  10 125.317  11 144.517  12 155.017
────────────────────────────────────────────────────────────────── */
const OUT = {
  W: Math.min(2560, Math.max(960, Math.round(innerWidth * Math.min(devicePixelRatio || 1, 2) / 16) * 16)),             // 1920 to reproduce the old file for A/B checking
  H: 1080,
  FPS: 60,
  LEAD_FRAMES: 0,      // no blank head in the reference
  TOTAL_FRAMES: 9407,  // 9407 / 60 = 156.783 s

  AUTO: false,          // start the export on its own when the page opens
  AUTO_DELAY_MS: 2000  // grace period so you can hit Esc and just watch it
};

OUT.H = OUT.W * 9 / 16;
const cv=document.getElementById('c'),X=cv.getContext('2d');
const W=1920,H=1080;
let sc=1,offX=0,offY=0;
function fit(){
  cv.width=OUT.W;cv.height=OUT.H;
  const f=Math.min(innerWidth/OUT.W,Math.max(1, innerHeight - (innerWidth < 540 ? 112 : 72))/OUT.H);
  cv.style.width=(OUT.W*f)+'px';cv.style.height=(OUT.H*f)+'px';
  cv.style.left=((innerWidth-OUT.W*f)/2)+'px';
  cv.style.top=((Math.max(1, innerHeight - (innerWidth < 540 ? 112 : 72))-OUT.H*f)/2)+'px';
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
const hex=n=>'0x'+n.toString(16).toUpperCase().padStart(4,'0');

/* ══════════════════════════════════════════════════════════════════
   CLOCK + SCHEDULER

   Previously every tween ran on its own requestAnimationFrame and every
   wait() was a setTimeout, tying the animation to wall-clock time and to
   whatever framerate the browser could manage. At 4K that means dropped
   frames and a video that no longer matches the original — and over
   156 seconds the drift would be severe.

   Now all tweens and waits go into one queue stepped by a single driver.
   In preview the driver is rAF and behaves exactly as before. In export
   it is a virtual clock advancing 1/60 s per frame, so the machine can
   take as long as it likes per frame and the timing stays exact.
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
function arrow(x1,y1,x2,y2,col,lw,a){
  X.globalAlpha=a;X.strokeStyle=col;X.lineWidth=lw;
  X.beginPath();X.moveTo(x1,y1);X.lineTo(x2,y2);X.stroke();
  const ang=Math.atan2(y2-y1,x2-x1),h=6+lw*2.2;
  X.beginPath();X.moveTo(x2,y2);
  X.lineTo(x2-h*Math.cos(ang-.42),y2-h*Math.sin(ang-.42));
  X.lineTo(x2-h*Math.cos(ang+.42),y2-h*Math.sin(ang+.42));
  X.closePath();X.fillStyle=col;X.fill();}

/* ══ the memory block — real rows, addresses, a read port ════════ */
function memory(x,y,w,h,alpha,hotRow,label){
  if(alpha<=0)return;
  const ROWS=Math.floor((h-56)/29);
  X.globalAlpha=alpha;
  X.fillStyle='rgba(255,255,255,.006)';X.fillRect(x,y,w,h);
  X.strokeStyle='#2a3040';X.lineWidth=1.6;X.strokeRect(x,y,w,h);
  corners(x-11,y-11,w+22,h+22,18,'#2b313d',alpha);
  // header
  X.globalAlpha=alpha;
  lab(label||'BLOCK RAM',x+14,y-32,15,STL,'left',500);
  lab('225 KB  ·  single read port',x+14,y-12,11,MUT,'left');
  X.globalAlpha=alpha*.5;
  X.strokeStyle='#242a35';X.lineWidth=1;
  X.beginPath();X.moveTo(x,y+30);X.lineTo(x+w,y+30);X.stroke();
  X.globalAlpha=alpha*.7;
  lab('ADDR',x+14,y+21,10,MUT,'left');
  lab('DATA',x+82,y+21,10,MUT,'left');

  for(let r=0;r<ROWS;r++){
    const yy=y+38+r*29;
    const hot=(hotRow!==undefined&&hotRow===r);
    if(hot){
      glow(AMB,10,()=>{X.globalAlpha=alpha;
        X.fillStyle='rgba(207,174,106,.14)';X.fillRect(x+3,yy-4,w-6,26);
        X.strokeStyle=AMB;X.lineWidth=1.4;X.strokeRect(x+3,yy-4,w-6,26);});
    }
    X.globalAlpha=alpha*(hot?.95:.42);
    lab(hex(r*16),x+14,yy+14,11,hot?AMB:MUT,'left');
    // data words
    for(let c=0;c<4;c++){
      const v=Math.floor(rnd(r,c,7)*255);
      X.globalAlpha=alpha*(hot?.9:.28);
      X.fillStyle=hot?'rgba(207,174,106,.5)':'rgba(129,138,155,.4)';
      X.fillRect(x+82+c*((w-96)/4),yy,((w-96)/4)-6,18);
      X.globalAlpha=alpha*(hot?1:.55);
      lab(v.toString(16).toUpperCase().padStart(2,'0'),
          x+82+c*((w-96)/4)+(((w-96)/4)-6)/2,yy+13,10,hot?INK:MUT);
    }
  }
  // read port at the right edge
  X.globalAlpha=alpha*.8;
  X.strokeStyle='#2a3040';X.lineWidth=1.3;
  X.beginPath();X.moveTo(x+w,y+h*0.5);X.lineTo(x+w+18,y+h*0.5);X.stroke();
  X.globalAlpha=alpha*.55;
  lab('read',x+w+22,y+h*0.5+4,10,MUT,'left');
  return {x,y,w,h,port:{x:x+w+18,y:y+h*0.5},rows:ROWS};
}

/* ── state ──────────────────────────────────────────────────────── */
const S={
  naive:{a:0,pkt:-1,acc:0,k:0,hot:0,fetched:0,solved:0},
  tl:{a:0,p:0,cmp:0},
  gtl:{a:0,p:0},
  gpu:{a:0,t:0,q:0},
  ttl:{a:0,p:0},
  sysc:{a:0,cyc:0,note:0,drain:0},
  scale:{a:0,p:0,brk:0},
  cmp:{a:0,p:0},
  tiles:{a:0,p:0,buf:0,fill:0},
  bars:{a:0,stack:0,dbl:0,cur:0,lbl:0},
  math:{a:0,step:0},
  fin:{a:0,p:0}
};

const NA=[[2,1,3],[1,4,2],[3,2,1]];
const NB=[[1,2,1],[3,1,2],[2,1,3]];

/* ══ 1 · one multiply at a time ══════════════════════════════════ */
function d1(){
  const n=S.naive;if(n.a<=0)return;
  const M=memory(300,320,200,440,n.a,n.hot);
  const a=NA[0][n.k], b=NB[n.k][0];
  const inFlight = n.pkt>=0 && n.pkt<1;      // packet still on the wire
  const holding  = n.pkt>=1;                 // values are in the MAC
  const solved   = n.solved>0;               // product resolved

  /* the multiplication we are working through */
  const cell=58, my=290;
  const grid=(Mx,mx,name,col,hi)=>{
    for(let r=0;r<3;r++)for(let c=0;c<3;c++){
      const on=hi&&hi[0]===r&&hi[1]===c;
      X.globalAlpha=n.a*(on?1:.34);
      X.fillStyle=on?'rgba(207,174,106,.34)':'rgba(129,138,155,.08)';
      X.fillRect(mx+c*cell,my+r*cell,cell-5,cell-5);
      if(on)glow(AMB,9,()=>{X.globalAlpha=n.a;X.strokeStyle=AMB;X.lineWidth=2;
        X.strokeRect(mx+c*cell,my+r*cell,cell-5,cell-5);});
      X.globalAlpha=n.a*(on?1:.5);
      lab(String(Mx[r][c]),mx+c*cell+(cell-5)/2,my+r*cell+(cell-5)/2+7,19,on?INK:DIM);
    }
    X.globalAlpha=n.a;mlab(name,mx+1.5*cell-3,my-22,24,col);
  };
  grid(NA,700,'A',VIO,[0,n.k]);
  grid(NB,960,'B',STL,[n.k,0]);
  X.globalAlpha=n.a;mlab('×',930,my+92,24,FNT);mlab('=',1190,my+92,24,FNT);

  for(let r=0;r<3;r++)for(let c=0;c<3;c++){
    const target=(r===0&&c===0);
    X.globalAlpha=n.a*(target?1:.14);
    X.fillStyle=target?'rgba(111,157,196,.2)':'rgba(129,138,155,.06)';
    X.fillRect(1250+c*cell,my+r*cell,cell-5,cell-5);
    if(target){
      glow(CYA,8,()=>{X.globalAlpha=n.a;X.strokeStyle=CYA;X.lineWidth=2;
        X.strokeRect(1250+c*cell,my+r*cell,cell-5,cell-5);});
      X.globalAlpha=n.a;
      lab(String(n.acc),1250+(cell-5)/2,my+(cell-5)/2+8,22,CYA,'center',500);
    }
  }
  X.globalAlpha=n.a;mlab('C',1250+1.5*cell-3,my-22,24,CYA);

  /* the MAC — two input slots that are genuinely empty until data lands */
  const bx=740,by=620,bw=440,bh=160;
  X.globalAlpha=n.a;
  glow(solved?AMB:'#000',solved?18:0,()=>{
    X.fillStyle=solved?'rgba(207,174,106,.13)':'rgba(255,255,255,.010)';
    X.beginPath();X.roundRect(bx,by,bw,bh,10);X.fill();
    X.strokeStyle=solved?AMB:'#2a3040';X.lineWidth=solved?2.4:1.4;
    X.beginPath();X.roundRect(bx,by,bw,bh,10);X.stroke();});
  X.globalAlpha=n.a;
  lab('MAC UNIT',bx+bw/2,by-20,13,DIM,'center',500);

  const slot=(x,val,col,filled)=>{
    X.globalAlpha=n.a;
    X.strokeStyle=filled?col:'#2a3040';X.lineWidth=filled?2:1.3;
    X.setLineDash(filled?[]:[4,5]);
    X.beginPath();X.roundRect(x-32,by+58,64,64,7);X.stroke();
    X.setLineDash([]);
    if(filled){X.globalAlpha=n.a;lab(String(val),x,by+104,38,col,'center',500);}
  };
  slot(bx+92,a,VIO,holding);
  X.globalAlpha=n.a*(holding?.8:.25);lab('×',bx+148,by+100,26,MUT);
  slot(bx+204,b,STL,holding);
  X.globalAlpha=n.a*(solved?.8:.25);lab('=',bx+262,by+100,26,MUT);
  if(solved){X.globalAlpha=n.a;lab(String(a*b),bx+340,by+104,44,AMB,'center',500);}
  else{X.globalAlpha=n.a*.18;
    X.strokeStyle='#2a3040';X.lineWidth=1.3;X.setLineDash([4,5]);
    X.beginPath();X.roundRect(bx+308,by+58,64,64,7);X.stroke();X.setLineDash([]);}

  /* the trip — the packet carries the two numbers */
  if(inFlight){
    const p=cl(n.pkt);
    const sx=M.port.x,sy=M.port.y,ex=bx+92,ey=by+90;
    X.globalAlpha=n.a*.2;X.setLineDash([5,7]);X.strokeStyle=MUT;X.lineWidth=1.3;
    X.beginPath();X.moveTo(sx,sy);X.lineTo(ex,ey);X.stroke();X.setLineDash([]);
    const px=lerp(sx,ex,p),py=lerp(sy,ey,p);
    X.globalAlpha=n.a;
    glow(VIO,10,()=>{X.fillStyle='rgba(143,122,166,.95)';
      X.beginPath();X.roundRect(px-34,py-17,32,34,5);X.fill();});
    lab(String(a),px-18,py+8,20,'#12141a','center',500);
    glow(STL,10,()=>{X.fillStyle='rgba(129,138,155,.95)';
      X.beginPath();X.roundRect(px+2,py-17,32,34,5);X.fill();});
    lab(String(b),px+18,py+8,20,'#12141a','center',500);
    X.globalAlpha=n.a*.8;
    lab('fetch',lerp(sx,ex,.5),lerp(sy,ey,.5)-30,15,RED);
  }
}

/* ══ 2 · the timeline, 29 vs 2 ═══════════════════════════════════ */
function d2(){
  const t=S.tl;if(t.a<=0)return;
  memory(110,230,300,620,t.a,undefined,'BLOCK RAM');
  X.globalAlpha=t.a;
  const x0=520,w=1300,y=400,h=86;
  X.strokeStyle='#242a35';X.lineWidth=1.4;X.strokeRect(x0,y,w,h);
  corners(x0-10,y-10,w+20,h+20,16,'#2b313d',t.a);
  lab('ONE MULTIPLY-ACCUMULATE, IN TIME',x0,y-28,16,DIM,'left',500);

  const ph=[['issue request',4,'rgba(184,99,92,.28)'],
            ['waiting on memory',22,'rgba(184,99,92,.6)'],
            ['data arriving',3,'rgba(111,157,196,.55)'],
            ['MULTIPLY',2,'rgba(125,156,107,.9)']];
  const total=31, reveal=cl(t.p*1.4);
  let x=x0;
  ph.forEach(p=>{
    const pw=(p[1]/total)*w*reveal;
    if(pw<=0)return;
    X.globalAlpha=t.a;X.fillStyle=p[2];X.fillRect(x,y+1,pw,h-2);
    X.globalAlpha=t.a*.25;X.strokeStyle='#06070b';X.lineWidth=1;
    for(let i=1;i<p[1];i++){const px=x+(i/p[1])*((p[1]/total)*w);
      if(px<x+pw){X.beginPath();X.moveTo(px,y+1);X.lineTo(px,y+h-1);X.stroke();}}
    if(pw>70){X.globalAlpha=t.a;lab(p[0],x+pw/2,y+h/2+6,14,INK);
      X.globalAlpha=t.a*.8;lab(p[1]+' cycles',x+pw/2,y+h+22,12,MUT);}
    x+=pw;
  });
  if(t.p<1){X.globalAlpha=t.a;
    glow(INK,10,()=>{X.strokeStyle=INK;X.lineWidth=2;
      X.beginPath();X.moveTo(x,y-12);X.lineTo(x,y+h+12);X.stroke();});}

  if(t.cmp>0){
    const s=cl(t.cmp);
    X.globalAlpha=t.a*s;
    // 29 vs 2, drawn to scale
    const by2=620, bw2=1000, bx2=520;
    X.fillStyle='rgba(184,99,92,.55)';X.fillRect(bx2,by2,bw2*(29/31),54);
    X.fillStyle='rgba(125,156,107,.9)';X.fillRect(bx2+bw2*(29/31),by2,bw2*(2/31),54);
    X.globalAlpha=t.a*s;
    lab('29',bx2+bw2*(29/31)/2,by2+36,34,INK,'center',500);
    lab('cycles spent waiting',bx2+bw2*(29/31)/2,by2+80,15,RED);
    lab('2',bx2+bw2*(29/31)+bw2*(2/31)/2,by2+36,26,INK,'center',500);
    lab('working',bx2+bw2*.985,by2+80,15,GRN,'right');
    X.globalAlpha=t.a*s;
    lab('6% utilisation',960,790,44,RED,'center',500);
    lab('remember 29 — it comes back later',960,832,15,MUT);
  }
}

/* ══ 3 / 5 · title cards ═════════════════════════════════════════ */
function titleCard(st,word,sub,col){
  if(st.a<=0)return;
  X.globalAlpha=st.a;
  lab(word,960,500,88,INK,'center',500);
  X.globalAlpha=st.a*cl(st.p*2);
  lab(sub,960,566,22,col);
  X.globalAlpha=st.a*.4;X.strokeStyle=col;X.lineWidth=1.5;
  const w=lerp(0,440,cl(st.p*1.6));
  X.beginPath();X.moveTo(960-w/2,600);X.lineTo(960+w/2,600);X.stroke();
}
function d3(){ titleCard(S.gtl,'GPU','every unit fetches for itself',RED); }
function d5(){ titleCard(S.ttl,'SYSTOLIC','fetch once · let the data flow',AMB); }

/* ══ 4 · the GPU array and its one bus ═══════════════════════════ */
function d4(){
  const g=S.gpu;if(g.a<=0)return;
  // the bus can serve exactly one unit at a time — that IS the bottleneck
  const served=Math.floor(g.t*6)%64;
  const M=memory(90,220,270,640,g.a,served%14);
  const N=8,cell=56,ax=880,ay=270;
  for(let r=0;r<N;r++)for(let c=0;c<N;c++){
    const idx=r*N+c;
    const working=(idx===served);
    X.globalAlpha=g.a;
    X.fillStyle=working?'rgba(125,156,107,.6)':'rgba(184,99,92,.12)';
    X.fillRect(ax+c*cell,ay+r*cell,cell-5,cell-5);
    if(working)glow(GRN,10,()=>{X.strokeStyle=GRN;X.lineWidth=2;
      X.strokeRect(ax+c*cell,ay+r*cell,cell-5,cell-5);});
    X.globalAlpha=g.a*(working?1:.55);
    lab(working?'×':'wait',ax+c*cell+(cell-5)/2,ay+r*cell+(cell-5)/2+(working?6:4),
        working?18:10,working?INK:RED);
  }
  X.globalAlpha=g.a;
  X.strokeStyle='rgba(135,146,168,.3)';X.lineWidth=1.2;
  X.strokeRect(ax-4,ay-4,N*cell+3,N*cell+3);
  lab('64 MULTIPLY-ACCUMULATE UNITS',ax+N*cell/2,ay-26,15,DIM,'center',500);

  if(g.q>0){
    const byy=560;
    // the served unit gets a line; everyone else queues
    const sr=Math.floor(served/N), scq=served%N;
    X.globalAlpha=g.a*g.q;
    glow(GRN,8,()=>{X.strokeStyle=GRN;X.lineWidth=2;
      X.beginPath();X.moveTo(M.port.x,M.port.y);
      X.lineTo(ax+scq*cell+cell/2,ay+sr*cell+cell/2);X.stroke();});
    X.globalAlpha=g.a*g.q*.3;
    X.fillStyle=RED;X.fillRect(M.port.x,byy-9,ax-40-M.port.x,18);
    X.globalAlpha=g.a*g.q;
    X.strokeStyle=RED;X.lineWidth=1.4;
    X.strokeRect(M.port.x,byy-9,ax-40-M.port.x,18);
    lab('ONE MEMORY BUS',(M.port.x+ax-40)/2,byy-24,14,RED,'center',500);
    for(let i=0;i<18;i++){
      const p=((g.t*.5+i/18)%1);
      const x=lerp(ax-46,M.port.x+4,p);
      X.globalAlpha=g.a*g.q*.9;X.fillStyle=RED;X.fillRect(x-5,byy-6,10,12);
    }
    X.globalAlpha=g.a*g.q;
    lab('63 units waiting while 1 is served',(M.port.x+ax-40)/2,byy+42,19,RED);
    lab('the bus is the bottleneck, not the multipliers',(M.port.x+ax-40)/2,byy+70,14,MUT);
  }
}

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
  const slot=cell;                          // feed tracks use the same pitch
  const tc=s.cyc, ti=Math.floor(tc+0.001);
  const TRK=2;                              // visible track slots

  /* ── feed tracks: a channel per row and per column ── */
  X.globalAlpha=s.a*.55;
  X.strokeStyle='#232935';X.lineWidth=1.3;
  for(let r=0;r<N3;r++){
    const y=ay+r*cell+(cell-12)/2;
    X.strokeRect(ax-TRK*slot-6,y-30,TRK*slot,60);
    for(let i=1;i<TRK;i++){
      X.globalAlpha=s.a*.28;
      X.beginPath();X.moveTo(ax-TRK*slot-6+i*slot,y-30);
      X.lineTo(ax-TRK*slot-6+i*slot,y+30);X.stroke();
      X.globalAlpha=s.a*.55;
    }
  }
  for(let c=0;c<N3;c++){
    const x=ax+c*cell+(cell-12)/2;
    X.strokeRect(x-30,ay-TRK*slot-6,60,TRK*slot);
    for(let i=1;i<TRK;i++){
      X.globalAlpha=s.a*.28;
      X.beginPath();X.moveTo(x-30,ay-TRK*slot-6+i*slot);
      X.lineTo(x+30,ay-TRK*slot-6+i*slot);X.stroke();
      X.globalAlpha=s.a*.55;
    }
  }

  /* ── the values sitting in those channels, shifting one slot a cycle ── */
  const SZ=44;
  const chip=(x,y,txt,col,bright)=>{
    glow(col,bright?10:0,()=>{
      X.fillStyle=bright?col:'rgba(120,120,130,.20)';
      X.beginPath();X.roundRect(x-SZ/2,y-SZ/2,SZ,SZ,6);X.fill();});
    X.strokeStyle=bright?'rgba(255,255,255,.25)':'rgba(255,255,255,.06)';
    X.lineWidth=1;X.beginPath();X.roundRect(x-SZ/2,y-SZ/2,SZ,SZ,6);X.stroke();
    lab(txt,x,y+8,22,bright?'#12141a':MUT,'center',500);
  };

  // chips only render while they are still in the feed track or crossing the
  // edge — once inside a PE the accumulator owns that square
  for(let r=0;r<N3;r++)for(let k=0;k<N3;k++){
    const pos=tc-(r+k);
    if(pos>0.35||pos<-TRK)continue;
    const x=ax+pos*cell+(cell-12)/2, y=ay+r*cell+(cell-12)/2;
    X.globalAlpha=s.a*cl(1+(pos<-TRK+.6?(pos+TRK)/.6:1))*cl((0.35-pos)/0.35+0.15);
    chip(x,y,String(SA[r][k]),'rgba(143,122,166,.95)',pos>-0.6);
  }
  for(let c=0;c<N3;c++)for(let k=0;k<N3;k++){
    const pos=tc-(c+k);
    if(pos>0.35||pos<-TRK)continue;
    const x=ax+c*cell+(cell-12)/2, y=ay+pos*cell+(cell-12)/2;
    X.globalAlpha=s.a*cl(1+(pos<-TRK+.6?(pos+TRK)/.6:1))*cl((0.35-pos)/0.35+0.15);
    chip(x,y,String(SB[k][c]),'rgba(129,138,155,.95)',pos>-0.6);
  }

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
    const v=accAt(r,c,tc);
    const started=ti>=r+c;
    X.globalAlpha=s.a*.4;
    lab('C'+r+c,ax+c*cell+10,ay+r*cell+20,11,MUT,'left');
    if(started){
      X.globalAlpha=s.a;
      lab(String(v),ax+c*cell+(cell-12)/2,ay+r*cell+(cell-12)/2+14,30,CYA);
    }
    // hand-off links
    X.globalAlpha=s.a*.3;X.strokeStyle='#333a48';X.lineWidth=1.4;
    if(c<N3-1){X.beginPath();X.moveTo(ax+c*cell+cell-12,ay+r*cell+(cell-12)/2);
      X.lineTo(ax+(c+1)*cell,ay+r*cell+(cell-12)/2);X.stroke();}
    if(r<N3-1){X.beginPath();X.moveTo(ax+c*cell+(cell-12)/2,ay+r*cell+cell-12);
      X.lineTo(ax+c*cell+(cell-12)/2,ay+(r+1)*cell);X.stroke();}
  }

  /* ── labels on the feeds ── */
  X.globalAlpha=s.a;
  mlab('A',ax-TRK*slot-52,ay+cell*1.5,28,VIO);
  lab('each row delayed',ax-TRK*slot-52,ay+cell*1.5+28,11,MUT,'center');
  lab('one more cycle',ax-TRK*slot-52,ay+cell*1.5+44,11,MUT,'center');
  mlab('B',ax+cell*1.5,ay-TRK*slot-46,28,STL);
  lab('columns, same offset',ax+cell*1.5,ay-TRK*slot-24,11,MUT,'center');

  /* ── cycle readout, top right, clear of everything ── */
  const rx=1330,ry=300;
  X.globalAlpha=s.a;
  X.strokeStyle='#242a35';X.lineWidth=1.3;X.strokeRect(rx,ry,430,120);
  corners(rx-8,ry-8,446,136,13,'#2b313d',s.a);
  lab('CYCLE',rx+26,ry+34,13,MUT,'left',500);
  lab(Math.min(ti,TOT-1)+' / '+(TOT-1),rx+26,ry+94,44,AMB,'left',500);
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

/* ══ 7 · scale to 8×8 with travelling labels ═════════════════════ */
function d7(){
  const s=S.scale;if(s.a<=0)return;
  X.globalAlpha=s.a;
  const N=8,cell=62,ax=520,ay=290;
  const tc=s.p*(3*N-2);
  for(let r=0;r<N;r++)for(let c=0;c<N;c++){
    const active=tc>=r+c&&tc<r+c+N;
    const done=tc>=r+c+N;
    X.globalAlpha=s.a;
    X.fillStyle=done?'rgba(111,157,196,.28)':(active?'rgba(207,174,106,.34)':'rgba(129,138,155,.08)');
    X.fillRect(ax+c*cell,ay+r*cell,cell-6,cell-6);
    // running accumulator, appearing as the wavefront passes over
    const terms=cl(Math.floor(tc)-r-c,0,N);
    if(terms>0){
      let v=0;for(let k=0;k<terms;k++)v+=(3+((r*7+k*5)%6))*(2+((c*5+k*3)%5));
      X.globalAlpha=s.a*(done?.95:.8);
      lab(String(v),ax+c*cell+(cell-6)/2,ay+r*cell+(cell-6)/2+7,
          v>99?15:18,done?CYA:INK);
    }
  }
  // the actual values marching in, labelled, so nothing has to be memorised
  const sz=30;
  for(let r=0;r<N;r++)for(let k=0;k<N;k++){
    const pos=tc-(r+k);
    if(pos<-1.2||pos>N+.3)continue;
    const x=ax+pos*cell-cell*.5, y=ay+r*cell+(cell-6)/2;
    X.globalAlpha=s.a*cl(1+(pos<0?pos:0))*.95;
    X.fillStyle='rgba(143,122,166,.9)';X.fillRect(x-sz/2,y-sz/2,sz,sz);
    X.globalAlpha=s.a;
    lab('a'+k,x,y+5,13,INK);
  }
  for(let c=0;c<N;c++)for(let k=0;k<N;k++){
    const pos=tc-(c+k);
    if(pos<-1.2||pos>N+.3)continue;
    const x=ax+c*cell+(cell-6)/2, y=ay+pos*cell-cell*.5;
    X.globalAlpha=s.a*cl(1+(pos<0?pos:0))*.95;
    X.fillStyle='rgba(129,138,155,.9)';X.fillRect(x-sz/2,y-sz/2,sz,sz);
    X.globalAlpha=s.a;
    lab('b'+k,x,y+5,13,INK);
  }
  X.globalAlpha=s.a;
  X.strokeStyle='rgba(135,146,168,.3)';X.lineWidth=1.2;
  X.strokeRect(ax-4,ay-4,N*cell+3,N*cell+3);
  lab('8 × 8',ax+N*cell/2,ay-90,17,AMB,'center',500);
  mlab('A',ax-100,ay+N*cell/2,26,VIO);
  mlab('B',ax+N*cell/2,ay-56,26,STL);
  X.globalAlpha=s.a*.8;
  lab('cycle '+Math.min(Math.floor(tc),22),ax+N*cell/2,ay+N*cell+40,18,AMB);

  if(s.brk>0){
    const bx=1160,by=300;
    const rows=[['8','to feed all 8 values in',VIO],
                ['+ 7','for the front to reach the far corner',AMB],
                ['+ 7','for the last value to drain out',STL],
                ['= 22','cycles, start to finish',CYA]];
    rows.forEach((v,i)=>{
      const t=cl(s.brk*4-i);if(t<=0)return;
      X.globalAlpha=s.a*t;
      lab(v[0],bx+120,by+70+i*96,38,v[2],'right',500);
      X.globalAlpha=s.a*t*.85;
      lab(v[1],bx+146,by+64+i*96,15,MUT,'left');
    });
    X.globalAlpha=s.a*cl(s.brk*4-3.4);
    lab('3N − 2   for   N = 8',bx+300,by+458,22,DIM);
  }
}

/* ══ 8 · where the reads actually go ═════════════════════════════ */
function d8(){
  const c=S.cmp;if(c.a<=0)return;
  const N=8,cell=34;
  const t=c.p*64;                       // both sides advance on the same clock
  const M1=memory(110,290,180,420,c.a,Math.floor(t)%14);
  const M2=memory(1010,290,180,420,c.a,Math.floor(t/4)%14);

  /* GPU: one read per multiply — the cell being served changes every step */
  const gx=400,gy=320;
  X.globalAlpha=c.a;
  lab('GPU',gx+N*cell/2,gy-58,20,RED,'center',500);
  lab('a read for every single multiply',gx+N*cell/2,gy-34,13,MUT);
  const gi=Math.floor(t*8)%64;
  for(let r=0;r<N;r++)for(let cc=0;cc<N;cc++){
    const idx=r*N+cc, hot=(idx===gi);
    X.globalAlpha=c.a;
    X.fillStyle=hot?'rgba(184,99,92,.6)':'rgba(129,138,155,.10)';
    X.fillRect(gx+cc*cell,gy+r*cell,cell-4,cell-4);
  }
  // the one line that exists at this instant
  const gr=Math.floor(gi/N),gc=gi%N;
  X.globalAlpha=c.a*.9;
  glow(RED,7,()=>{X.strokeStyle=RED;X.lineWidth=1.8;
    X.beginPath();X.moveTo(M1.port.x,M1.port.y);
    X.lineTo(gx+gc*cell+cell/2,gy+gr*cell+cell/2);X.stroke();});

  /* systolic: values cross the edge once, then flow through */
  const sx=1300,sy=320;
  X.globalAlpha=c.a;
  lab('SYSTOLIC',sx+N*cell/2,sy-58,20,GRN,'center',500);
  lab('a read only where data enters',sx+N*cell/2,sy-34,13,MUT);
  for(let r=0;r<N;r++)for(let cc=0;cc<N;cc++){
    const reached=t/4>=r+cc;
    X.globalAlpha=c.a;
    X.fillStyle=reached?'rgba(125,156,107,.34)':'rgba(129,138,155,.10)';
    X.fillRect(sx+cc*cell,sy+r*cell,cell-4,cell-4);
  }
  // the sixteen edge values, entering once then travelling inward
  for(let r=0;r<N;r++){
    const pos=t/4-r;
    if(pos<0||pos>N)continue;
    const x=sx+Math.min(pos,N-1)*cell+cell/2, y=sy+r*cell+cell/2;
    X.globalAlpha=c.a*.9;
    glow(VIO,7,()=>{X.fillStyle=VIO;X.fillRect(x-8,y-8,16,16);});
    if(pos<0.6){X.globalAlpha=c.a*.7;X.strokeStyle=GRN;X.lineWidth=1.4;
      X.beginPath();X.moveTo(M2.port.x,M2.port.y);X.lineTo(sx-10,y);X.stroke();}
  }
  for(let cc=0;cc<N;cc++){
    const pos=t/4-cc;
    if(pos<0||pos>N)continue;
    const x=sx+cc*cell+cell/2, y=sy+Math.min(pos,N-1)*cell+cell/2;
    X.globalAlpha=c.a*.9;
    glow(STL,7,()=>{X.fillStyle=STL;X.fillRect(x-8,y-8,16,16);});
    if(pos<0.6){X.globalAlpha=c.a*.7;X.strokeStyle=GRN;X.lineWidth=1.4;
      X.beginPath();X.moveTo(M2.port.x,M2.port.y);X.lineTo(x,sy-10);X.stroke();}
  }

  /* the counters, ticking on the same clock */
  const gRead=Math.min(Math.floor(t*64),4096);
  const sRead=Math.min(Math.floor(t/4)*2,16);
  X.globalAlpha=c.a;
  lab(gRead.toLocaleString(),gx+N*cell/2,gy+N*cell+80,52,RED,'center',500);
  lab('reads so far',gx+N*cell/2,gy+N*cell+112,14,MUT);
  lab(String(sRead),sx+N*cell/2,sy+N*cell+80,52,GRN,'center',500);
  lab('reads so far',sx+N*cell/2,sy+N*cell+112,14,MUT);
  if(c.p>.8){X.globalAlpha=c.a*cl(c.p*5-4);
    lab('4,096   vs   16',960,880,34,AMB,'center',500);}
}

/* ══ 9 · what the tile buffer is for ═════════════════════════════ */
function d9(){
  const t=S.tiles;if(t.a<=0)return;
  // one full cycle = fill the buffer (64 reads) then drain it into the array
  const phase=(t.p*4)%1;
  const filling = phase<0.6;
  const fillP   = filling ? phase/0.6 : 1;
  const drainP  = filling ? 0 : (phase-0.6)/0.4;

  const M=memory(90,250,220,540,t.a,Math.floor(t.p*200)%16);

  const bx=520,by=330,bc=31;
  X.globalAlpha=t.a;
  X.strokeStyle=filling?CYA:'#2a3040';X.lineWidth=1.6;
  X.strokeRect(bx-9,by-9,8*bc+18,8*bc+18);
  corners(bx-17,by-17,8*bc+34,8*bc+34,14,'#2b313d',t.a);
  lab('TILE BUFFER',bx+8*bc/2,by-32,15,CYA,'center',500);
  lab(filling?'reading 64 values from memory':'feeding the array, edge by edge',
      bx+8*bc/2,by+8*bc+34,13,filling?CYA:AMB);

  const held=Math.floor(fillP*64);
  const gone=Math.floor(drainP*64);
  for(let i=0;i<64;i++){
    const r=Math.floor(i/8),c2=i%8;
    const present = i<held && i>=gone;
    X.globalAlpha=t.a*(present?1:.12);
    X.fillStyle=present?'rgba(111,157,196,.5)':'rgba(129,138,155,.18)';
    X.fillRect(bx+c2*bc,by+r*bc,bc-4,bc-4);
    if(present){X.globalAlpha=t.a*.85;
      lab(String(Math.floor(rnd(r,c2,9)*9)),bx+c2*bc+(bc-4)/2,by+r*bc+(bc-4)/2+5,11,INK);}
  }

  const ax=980,ay=330,ac=31;
  for(let r=0;r<8;r++)for(let c2=0;c2<8;c2++){
    const fed = drainP>0 && (r+c2)/14 < drainP;
    X.globalAlpha=t.a;
    X.fillStyle=fed?'rgba(207,174,106,.5)':'rgba(207,174,106,.16)';
    X.fillRect(ax+c2*ac,ay+r*ac,ac-4,ac-4);}
  X.globalAlpha=t.a;
  X.strokeStyle=filling?'#2a3040':AMB;X.lineWidth=1.6;
  X.strokeRect(ax-6,ay-6,8*ac+8,8*ac+8);
  lab('8 × 8 ARRAY',ax+8*ac/2,by-32,15,AMB,'center',500);
  lab(filling?'idle — nothing to work on':'computing, 22 cycles',
      ax+8*ac/2,ay+8*ac+34,13,filling?RED:AMB);

  // which way the data is moving right now
  if(filling){
    arrow(M.port.x+8,500,bx-26,500,CYA,2.2,t.a*.9);
    X.globalAlpha=t.a*.8;lab('64 reads',(M.port.x+bx)/2,478,13,CYA);
  }else{
    arrow(bx+8*bc+26,500,ax-26,500,AMB,2.2,t.a*.9);
    X.globalAlpha=t.a*.8;lab('16 per cycle, at the edges',(bx+8*bc+ax)/2,478,13,AMB);
  }

  const gx=1330,gy=310;
  const k=Math.floor(t.p*128)%128;
  X.globalAlpha=t.a;
  X.strokeStyle='#242a35';X.lineWidth=1.3;X.strokeRect(gx,gy,420,336);
  corners(gx-8,gy-8,436,352,13,'#2b313d',t.a);
  lab('TILES COMPLETED',gx+28,gy+38,14,MUT,'left',500);
  lab(k+' / 128',gx+28,gy+106,46,AMB,'left',500);
  for(let i=0;i<128;i++){
    const r=Math.floor(i/16),c2=i%16;
    X.globalAlpha=t.a*(i<k?.9:.14);
    X.fillStyle=i<k?AMB:STL;
    X.fillRect(gx+26+c2*23,gy+152+r*23,18,18);
  }
  if(t.buf>0){
    X.globalAlpha=t.a*t.buf;
    lab('with one buffer, the array is idle for the whole fill',960,880,19,RED);
  }
}

/* ══ 10 · one buffer vs two, with a playhead ═════════════════════ */
function d10(){
  const b=S.bars;if(b.a<=0)return;
  X.globalAlpha=b.a;
  const x0=300,w1=1320,u=w1/(64*3+22*3),rowY=280;
  const seg=(x,y,cyc,col,h,al,txt)=>{
    X.globalAlpha=b.a*al;X.fillStyle=col;X.fillRect(x,y,cyc*u-2,h);
    X.strokeStyle='rgba(0,0,0,.3)';X.lineWidth=1;X.strokeRect(x,y,cyc*u-2,h);
    if(txt&&cyc*u>56){X.globalAlpha=b.a*al*.95;lab(txt,x+cyc*u/2,y+h/2+5,12,INK);}};

  if(b.stack>0){
    X.globalAlpha=b.a*b.stack;
    lab('ONE BUFFER',x0,rowY-26,16,RED,'left',500);
    let x=x0;
    for(let i=0;i<3;i++){const t=cl(b.stack*3-i);if(t<=0)break;
      seg(x,rowY,64,'rgba(184,99,92,.55)',56,t,'load 64');x+=64*u;
      seg(x,rowY,22,'rgba(125,156,107,.85)',56,t,'22');x+=22*u;}
    X.globalAlpha=b.a*b.stack;
    lab('86 cycles per tile',x0+(64+22)*3*u+28,rowY+34,19,RED,'left',500);
  }
  if(b.dbl>0){
    const y2=rowY+180;
    X.globalAlpha=b.a*b.dbl;
    lab('TWO BUFFERS',x0,y2-26,16,GRN,'left',500);
    const live=b.cur>0?Math.floor(b.cur%3):-1;   // which tile the playhead is in
    let x=x0;
    for(let i=0;i<3;i++){const t=cl(b.dbl*3-i);if(t<=0)break;
      const on=(i===live);
      seg(x,y2,64,on?'rgba(184,99,92,.85)':'rgba(184,99,92,.30)',26,t,'load '+(i+2));
      seg(x,y2+30,22,on?'rgba(125,156,107,1)':'rgba(125,156,107,.45)',26,t,'compute '+(i+1));
      if(on){
        X.globalAlpha=b.a*b.dbl;
        glow(RED,10,()=>{X.strokeStyle=RED;X.lineWidth=2;
          X.strokeRect(x-1,y2-1,64*u,28);});
        glow(GRN,10,()=>{X.strokeStyle=GRN;X.lineWidth=2;
          X.strokeRect(x-1,y2+29,22*u,28);});
      }
      x+=64*u;}
    X.globalAlpha=b.a*b.dbl;
    lab('64 cycles per tile',x0+3*64*u+28,y2+34,19,GRN,'left',500);
  }

  // the playhead, driving the buffer swap below
  if(b.cur>0){
    const y2=rowY+180;
    const cyc=b.cur%3;                 // 0..3 across the three tiles, wraps cleanly
    const px=x0+(cyc/3)*3*64*u;
    X.globalAlpha=b.a;
    glow(INK,10,()=>{X.strokeStyle=INK;X.lineWidth=2;
      X.beginPath();X.moveTo(px,y2-40);X.lineTo(px,760);X.stroke();});
    // which buffer is feeding depends on which tile the playhead is inside,
    // and it has to keep alternating across the wrap
    const tileIdx=Math.floor(b.cur);
    const flip=tileIdx%2;
    const liveTile=Math.floor(b.cur%3);
    const sy=790;
    [0,1].forEach(i=>{
      const bx2=640+i*320,active=(i===flip);
      X.globalAlpha=b.a;
      glow(active?GRN:CYA,10,()=>{
        X.fillStyle=active?'rgba(125,156,107,.18)':'rgba(184,99,92,.14)';
        X.fillRect(bx2,sy,260,120);
        X.strokeStyle=active?GRN:RED;X.lineWidth=2.1;X.strokeRect(bx2,sy,260,120);});
      X.globalAlpha=b.a;
      lab('BUFFER '+(i+1),bx2+130,sy+46,17,INK,'center',500);
      lab(active?'feeding the array':'loading from memory',bx2+130,sy+76,12,
          active?GRN:RED);
      X.globalAlpha=b.a*.75;
      lab(active?('compute '+(liveTile+1)):('load '+(liveTile+2)),
          bx2+130,sy+100,12,MUT);
    });
    X.globalAlpha=b.a*.7;lab('⇄',960,sy+66,30,FNT);
  }
  if(b.lbl>0){
    X.globalAlpha=b.a*b.lbl;
    lab('DOUBLE BUFFERING',960,980,26,GRN,'center',500);
  }
}

/* ══ 11 / 12 · the arithmetic and the number ═════════════════════ */
function d11(){
  const m=S.math;if(m.a<=0)return;
  X.globalAlpha=m.a;
  const lines=[['64','cycles to load one tile',AMB],
               ['+ 0','the 22 compute cycles hide underneath',GRN],
               ['× 576','tiles in one layer',CYA],
               ['= 36,864','cycles',INK],
               ['÷ 100 MHz','',MUT]];
  lines.forEach((l,i)=>{
    const t=cl(m.step-i);if(t<=0)return;
    const y=300+i*84;
    X.globalAlpha=m.a*t;lab(l[0],880,y,44,l[2],'right',500);
    X.globalAlpha=m.a*t*.8;lab(l[1],920,y-4,17,MUT,'left');});
}
function d12(){
  const f=S.fin;if(f.a<=0)return;
  X.globalAlpha=f.a;
  const s=1+(1-cl(f.p*3))*.12;
  X.save();X.translate(960,470);X.scale(s,s);X.translate(-960,-470);
  glow(AMB,10+cl(f.p*3)*20,()=>{lab('0.37 ms',960,500,120,AMB,'center',500);});
  X.restore();
  X.globalAlpha=f.a*cl(f.p*2-.4);
  lab('six matrix multiplications',960,660,26,DIM);
  lab('half a million multiply-accumulates',960,706,26,DIM);
  X.globalAlpha=f.a*cl(f.p*2-1);
  lab('in about a third of a millisecond',960,790,30,INK,'center',500);
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
  d1();d2();d3();d4();d5();d6();d7();d8();d9();d10();d11();d12();
}
function loop(){
  /* During an export the driver owns the canvas, so the preview loop
     stands down rather than drawing half-stepped frames into it. */
  if(!RENDER.on){pump();drawFrame();}
  requestAnimationFrame(loop);
}

function clearAll(){
  gen++;
  pending=[];
  Object.assign(S.naive,{a:0,pkt:-1,acc:0,k:0,hot:0,fetched:0,solved:0});
  Object.assign(S.tl,{a:0,p:0,cmp:0});
  Object.assign(S.gtl,{a:0,p:0});
  Object.assign(S.gpu,{a:0,t:0,q:0});
  Object.assign(S.ttl,{a:0,p:0});
  Object.assign(S.sysc,{a:0,cyc:0,note:0,drain:0});
  Object.assign(S.scale,{a:0,p:0,brk:0});
  Object.assign(S.cmp,{a:0,p:0});
  Object.assign(S.tiles,{a:0,p:0,buf:0,fill:0});
  Object.assign(S.bars,{a:0,stack:0,dbl:0,cur:0,lbl:0});
  Object.assign(S.math,{a:0,step:0});
  Object.assign(S.fin,{a:0,p:0});
}

async function sc1(){                      // ends 16.150 s
  const id=gen;
  await tw(700,p=>S.naive.a=p);
  const n=S.naive;
  for(let i=0;i<5;i++){
    if(id!==gen)return;
    n.k=i%3; if(i%3===0)n.acc=0;
    n.solved=0; n.pkt=-1;
    n.hot=(i*3)%14;
    await wait(420);                       // the operands are identified
    await tw(1400,p=>n.pkt=p,lin);         // the long trip
    n.pkt=1;                                // values now sit in the MAC
    await wait(320);
    n.solved=1;                             // and only now does it multiply
    n.acc+=NA[0][n.k]*NB[n.k][0]; n.fetched+=2;
    await wait(700);
  }
  await wait(600);
  if(id!==gen)return;
  await tw(500,p=>S.naive.a=1-p);
}
async function sc2(){                      // ends 29.167 s
  const id=gen;
  await tw(600,p=>S.tl.a=p);
  await tw(5200,p=>S.tl.p=p,lin);
  S.tl.p=1;                       // let the top bar land completely first
  await wait(1400);
  if(id!==gen)return;
  await tw(900,p=>S.tl.cmp=p);
  await wait(4400);
  if(id!==gen)return;
  await tw(500,p=>S.tl.a=1-p);
}
async function sc3(){                      // ends 32.867 s
  const id=gen;
  await tw(600,p=>S.gtl.a=p);
  await tw(1300,p=>S.gtl.p=p);
  await wait(1300);
  if(id!==gen)return;
  await tw(500,p=>S.gtl.a=1-p);
}
async function sc4(){                      // ends 38.617 s
  const id=gen;
  await tw(500,p=>S.gpu.a=p);
  tw(5600,p=>S.gpu.t=p*6,lin);
  await tw(800,p=>S.gpu.q=p);
  await wait(4000);
  if(id!==gen)return;
  await tw(450,p=>S.gpu.a=1-p);
}
async function sc5(){                      // ends 43.617 s
  const id=gen;
  await tw(600,p=>S.ttl.a=p);
  await tw(1400,p=>S.ttl.p=p);
  await wait(2500);
  if(id!==gen)return;
  await tw(500,p=>S.ttl.a=1-p);
}
async function sc6(){                      // ends 68.717 s
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
async function sc7(){                      // ends 81.217 s
  const id=gen;
  await tw(600,p=>S.scale.a=p);
  await tw(5000,p=>S.scale.p=p,lin);
  await tw(2400,p=>S.scale.brk=p,lin);
  await wait(4000);
  if(id!==gen)return;
  await tw(500,p=>S.scale.a=1-p);
}
async function sc8(){                      // ends 88.017 s
  const id=gen;
  await tw(500,p=>S.cmp.a=p);
  await tw(4000,p=>S.cmp.p=p,lin);
  await wait(1800);
  if(id!==gen)return;
  await tw(500,p=>S.cmp.a=1-p);
}
async function sc9(){                      // ends 101.917 s
  const id=gen;
  await tw(500,p=>S.tiles.a=p);
  tw(13000,p=>S.tiles.p=p,lin);
  await wait(6000);
  await tw(700,p=>S.tiles.buf=p);
  await wait(6200);
  if(id!==gen)return;
  await tw(500,p=>S.tiles.a=1-p);
}
async function sc10(){                     // ends 125.317 s
  const id=gen;
  await tw(500,p=>S.bars.a=p);
  await tw(2400,p=>S.bars.stack=p,lin);
  await wait(4400);
  if(id!==gen)return;
  await tw(2200,p=>S.bars.dbl=p,lin);
  await wait(3600);
  if(id!==gen)return;
  tw(9000,p=>S.bars.cur=p*6,lin);
  await wait(6500);
  await tw(700,p=>S.bars.lbl=p);
  await wait(2600);
  if(id!==gen)return;
  await tw(500,p=>S.bars.a=1-p);
}
async function sc11(){                     // ends 144.517 s
  const id=gen;
  await tw(600,p=>S.math.a=p);
  await wait(3000);
  for(let i=1;i<=5;i++){
    if(id!==gen)return;
    await tw(500,p=>S.math.step=i-1+p);
    await wait(2500);
  }
  await tw(600,p=>S.math.a=1-p);
}
async function sc12(){                     // ends 155.017 s, then the card holds
  await tw(500,p=>S.fin.a=p);
  await tw(4000,p=>S.fin.p=p,lin);
  await wait(6000);
}

const SCENES=[sc1,sc2,sc3,sc4,sc5,sc6,sc7,sc8,sc9,sc10,sc11,sc12];
async function play(from=0){
  clearAll();const id=gen;
  for(let i=from;i<SCENES.length;i++){ if(id!==gen)return; await SCENES[i](); }
}
const KEYS={'1':0,'2':1,'3':2,'4':3,'5':4,'6':5,'7':6,'8':7,'9':8,'q':9,'w':10,'e':11};


let portfolioFrame=-1,portfolioStarted=false;
window.portfolioAnimation={
 duration:156.783,poster:1,
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
