
/* ══════════════════════════════════════════════════════════════════
   OUTPUT SETTINGS  ·  aligned to the OBS capture

   The reference was screen-recorded, not captured in-page, so the
   animation's start had to be found rather than assumed. Two
   independent anchors in that file agree:

     · the white flash in scene 1 begins at recorded frame 258, and it
       sits 1700 ms into the animation (800 ms grid fade + 900 ms hold)
     · all motion stops at recorded frame 5250, and the animation runs
       84.917 s = 5095 frames

   Both put the animation's true t = 0 at frame 156. That the two agree
   to the frame across 85 seconds is the real result — it means the
   recording's real-time clock and this deterministic one do not drift.

     frames    0 – 155    backdrop, before the animation starts
     frames  156 – 5250   the animation, 84.917 s
     frames 5251 – 5433   final state held, 3.050 s
     total   5434 frames = 90.567 s, exactly the recording's length

   Note the recording begins ~1 s AFTER the animation did, so it never
   shows scene 1's opening fade. This render does. That is the one place
   the two deliberately differ.
────────────────────────────────────────────────────────────────── */
const OUT = {
  W: Math.min(2560, Math.max(960, Math.round(innerWidth * Math.min(devicePixelRatio || 1, 2) / 16) * 16)),             // 1920 to reproduce the old file for A/B checking
  H: 1080,
  FPS: 60,
  LEAD_FRAMES: 156,    // backdrop before the animation starts
  TOTAL_FRAMES: 5434,  // 5434 / 60 = 90.567 s

  AUTO: false,
  AUTO_DELAY_MS: 2000
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
const INK='#e4e6ea',DIM='#767d8c',FAINT='#20242e',LINE='#262b36';
const CYA='#6f9dc4',VIO='#8f7aa6',AMB='#cfae6a',MAG='#b8635c',STL='#818a9b',GRN='#7d9c6b';
const MONO='ui-monospace,SFMono-Regular,Menlo,monospace';
const MATH='Georgia,"Times New Roman",serif';

const eio=p=>p<.5?4*p*p*p:1-Math.pow(-2*p+2,3)/2;
const eo=p=>1-Math.pow(1-p,3), lin=p=>p;
const cl=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const lerp=(a,b,t)=>a+(b-a)*t;

/* ══════════════════════════════════════════════════════════════════
   CLOCK + SCHEDULER

   Every tween used to run on its own requestAnimationFrame and every
   wait() was a setTimeout, which ties the animation to wall-clock time.
   They now share one queue stepped by a single driver: rAF in preview,
   a virtual 1/60 s clock during export. That is what lets a slow 4K
   render still land on the exact frame counts above.
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
/* The packet emitter used Math.random, which would make every export
   different. Seeded here so a re-render is reproducible; the particles
   will not match the original recording's, which does not matter since
   they are decorative and the clip is being replaced wholesale. */
let rngState=1;
const srand=()=>{rngState=(rngState*1664525+1013904223)>>>0;return rngState/4294967296;};

/* ── drawing ──────────────────────────────────────────────────── */
const EYES=[[4,4],[4,5],[5,4],[5,5],[4,10],[4,11],[5,10],[5,11]];
const ML=[[9,3],[10,4],[11,5],[11,6],[12,7]];
const MR=[[12,8],[11,9],[11,10],[10,11],[9,12]];
const USER=[...EYES.filter(p=>p[1]<8),...ML];
const PRED=[...EYES.filter(p=>p[1]>=8),...MR];

/* ── real math ────────────────────────────────────────────────── */
const rnd=(a,b,s)=>{const v=Math.sin(a*127.1+b*311.7+s*74.7)*43758.5453;return v-Math.floor(v);};
const mk=(r,c,f)=>Array.from({length:r},(_,i)=>Array.from({length:c},(_,j)=>f(i,j)));
function mul(A,B){const n=A.length,m=B[0].length,k=B.length,C=mk(n,m,()=>0);
  for(let i=0;i<n;i++)for(let j=0;j<m;j++){let s=0;for(let t=0;t<k;t++)s+=A[i][t]*B[t][j];C[i][j]=s;}return C;}
function nz(M,t=1){let mx=0;for(const r of M)for(const v of r)mx=Math.max(mx,Math.abs(v));
  return M.map(r=>r.map(v=>v/(mx||1)*t));}
const T=M=>mk(M[0].length,M.length,(r,c)=>M[c][r]);

const PIX=mk(16,16,(r,c)=>USER.some(p=>p[0]===r&&p[1]===c)?1:0);
const WEMB=nz(mk(16,64,(r,c)=>rnd(r,c,1)*2-1));
const EMB=nz(mul(PIX,WEMB));
const POS=mk(16,64,(r,c)=>c%2?Math.cos(r/Math.pow(10000,(c-1)/64)):Math.sin(r/Math.pow(10000,c/64)));
const XP=nz(EMB.map((row,r)=>row.map((v,c)=>v+POS[r][c]*.5)));

const WQ=nz(mk(64,64,(r,c)=>rnd(r,c,7)*2-1));
const WK=nz(mk(64,64,(r,c)=>rnd(r,c,13)*2-1));
const WV=nz(mk(64,64,(r,c)=>rnd(r,c,23)*2-1));
const WO=nz(mk(64,64,(r,c)=>rnd(r,c,31)*2-1));
const QM=nz(mul(XP,WQ)),KM=nz(mul(XP,WK)),VM=nz(mul(XP,WV));
const SCM=nz(mul(QM,T(KM)),2.2);
const SROW=6, RAW=SCM[SROW];
const EXR=RAW.map(Math.exp),ESUM=EXR.reduce((a,b)=>a+b,0),NRM=EXR.map(v=>v/ESUM);
const ATT=SCM.map(r=>{const e=r.map(Math.exp),s=e.reduce((a,b)=>a+b,0);return e.map(v=>v/s);});
const CTX=nz(mul(ATT,VM));
const OUTM=nz(mul(CTX,WO));

const f2=v=>(v<0?'−':'')+Math.abs(v).toFixed(2);

/* ── helpers ──────────────────────────────────────────────────── */
const cam={ry:0,rx:0,d:2800,ox:960,oy:540};
function proj(x,y,z){
  const cy=Math.cos(cam.ry),sy=Math.sin(cam.ry);
  const X1=x*cy-z*sy,Z1=x*sy+z*cy;
  const cx=Math.cos(cam.rx),sx=Math.sin(cam.rx);
  const Y1=y*cx-Z1*sx,Z2=y*sx+Z1*cx;
  const k=cam.d/(cam.d+Z2);
  return [cam.ox+X1*k,cam.oy+Y1*k];
}
function quad(a,b,c,d,f,s,lw){X.beginPath();X.moveTo(a[0],a[1]);X.lineTo(b[0],b[1]);
  X.lineTo(c[0],c[1]);X.lineTo(d[0],d[1]);X.closePath();
  if(f){X.fillStyle=f;X.fill();}if(s){X.strokeStyle=s;X.lineWidth=lw||1;X.stroke();}}
const glow=(c,b,fn)=>{X.save();X.shadowColor=c;X.shadowBlur=b;fn();X.restore();};
function lab(s,x,y,sz,col,al='center',w=400){
  X.font=`${w} ${sz}px ${MONO}`;X.fillStyle=col;X.textAlign=al;X.fillText(s,x,y);}
function mlab(s,x,y,sz,col,al='center'){
  X.font=`italic 400 ${sz}px ${MATH}`;X.fillStyle=col;X.textAlign=al;X.fillText(s,x,y);}
function mix(a,b,t){const p=s=>[parseInt(s.slice(1,3),16),parseInt(s.slice(3,5),16),parseInt(s.slice(5,7),16)];
  const A=p(a),B=p(b);return `rgb(${A.map((v,i)=>Math.round(lerp(v,B[i],t))).join(',')})`;}
function corners(x,y,w,h,l,col,a){X.globalAlpha=a;X.strokeStyle=col;X.lineWidth=1.3;
  [[x,y,1,1],[x+w,y,-1,1],[x+w,y+h,-1,-1],[x,y+h,1,-1]].forEach(([px,py,sx,sy])=>{
    X.beginPath();X.moveTo(px+sx*l,py);X.lineTo(px,py);X.lineTo(px,py+sy*l);X.stroke();});}

/* ── state ────────────────────────────────────────────────────── */
const S={
  grid:{a:0,x:960,y:520,s:1,lc:LINE,flash:0,pred:0,predW:0},
  tok:{a:0,M:null,x:960,y:520,cw:42,ch:42,num:0,hi:-1,tilt:0,depth:0,sent:0,posA:0,cap:''},
  mm:{a:0,A:null,B:null,C:null,la:'',lb:'',lc:'',r:-1,c:-1,fill:0,terms:0,y:360},
  bar:{a:0,fill:0,chk:0,slide:0,count:0,wave:0},
  wire:{a:0,p:-1,dir:1},
  chip:{a:0},
  sm:{a:0,st:0,pick:0},
  pc:{a:0,step:0}
};

/* ── grid ─────────────────────────────────────────────────────── */
function drawGrid(){
  const g=S.grid;if(g.a<=0)return;
  X.save();X.globalAlpha=g.a;
  const cs=42*g.s,Tt=cs*16,ox=g.x-Tt/2,oy=g.y-Tt/2;
  X.beginPath();X.roundRect(ox-28,oy-28,Tt+56,Tt+56,16);
  X.fillStyle='rgba(10,12,18,.9)';X.fill();
  X.strokeStyle='#191d27';X.lineWidth=1.5;X.stroke();
  corners(ox-17,oy-17,Tt+34,Tt+34,16,'#2b313d',g.a);
  for(let i=0;i<16;i++){X.globalAlpha=g.a*.4;
    lab(String(i),ox+i*cs+cs/2,oy-36,10,'#39404e');
    lab(String(i),ox-38,oy+i*cs+cs/2+4,10,'#39404e');}
  X.globalAlpha=g.a;X.strokeStyle=g.lc;X.lineWidth=1;
  for(let i=0;i<=16;i++){X.globalAlpha=g.a*(i%4===0?1:.5);
    X.beginPath();X.moveTo(ox+i*cs,oy);X.lineTo(ox+i*cs,oy+Tt);X.stroke();
    X.beginPath();X.moveTo(ox,oy+i*cs);X.lineTo(ox+Tt,oy+i*cs);X.stroke();}
  X.globalAlpha=g.a;X.strokeStyle='#39404e';X.lineWidth=1.6;X.strokeRect(ox,oy,Tt,Tt);
  const pd=cs*.15;
  const paint=(l,col,al)=>{for(const[r,c]of l){X.globalAlpha=g.a*al;
    glow(col,4,()=>{X.fillStyle=col;X.beginPath();
      X.roundRect(ox+c*cs+pd,oy+r*cs+pd,cs-pd*2,cs-pd*2,4);X.fill();});}};
  paint(USER,g.flash>0?'#fff':INK,1);
  if(g.pred>0)paint(PRED,g.predW>0?mix(MAG,INK,g.predW):MAG,g.pred);
  if(g.flash>0){X.globalAlpha=g.a*g.flash*.5;X.fillStyle='#fff';
    X.fillRect(ox-28,oy-28,Tt+56,Tt+56);}
  X.restore();
}

/* ── slab ─────────────────────────────────────────────────────── */
function drawTok(){
  const t=S.tok;if(t.a<=0||!t.M)return;
  X.save();X.globalAlpha=t.a;
  cam.ox=t.x;cam.oy=t.y;cam.ry=t.tilt*.6;cam.rx=t.tilt*.28;
  const M=t.M,rows=M.length,cols=M[0].length,cw=t.cw,ch=t.ch;
  const w=cols*cw,h=rows*ch,x0=-w/2,y0=-h/2,tot=rows*cols;
  for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){
    const gone=t.sent>0&&(r*cols+c)<t.sent*tot;
    const v=M[r][c],m=Math.abs(v);
    let col=`rgba(143,122,166,${.07+m*.58})`;
    if(t.posA>0){const pw=Math.abs(POS[r]?POS[r][c]||0:0)*t.posA;
      col=`rgba(${Math.round(lerp(143,196,pw))},${Math.round(lerp(122,113,pw))},${Math.round(lerp(166,102,pw))},${.07+m*.58})`;}
    if(gone)col='rgba(46,52,66,.10)';
    const A=proj(x0+c*cw,y0+r*ch,0),B=proj(x0+(c+1)*cw,y0+r*ch,0),
          C=proj(x0+(c+1)*cw,y0+(r+1)*ch,0),D=proj(x0+c*cw,y0+(r+1)*ch,0);
    quad(A,B,C,D,col,'rgba(0,0,0,.4)',.5);
    if(t.num>0&&cw>22){X.globalAlpha=t.a*t.num*(gone?.15:1);
      lab(v===0?'0.00':f2(v),(A[0]+C[0])/2,(A[1]+C[1])/2+4,10,gone?FAINT:(m>.5?INK:DIM));
      X.globalAlpha=t.a;}
  }
  if(t.hi>=0){
    const A=proj(x0-7,y0+t.hi*ch-2,0),B=proj(x0+w+7,y0+t.hi*ch-2,0),
          C=proj(x0+w+7,y0+(t.hi+1)*ch+2,0),D=proj(x0-7,y0+(t.hi+1)*ch+2,0);
    glow(AMB,7,()=>quad(A,B,C,D,null,AMB,1.8));
    const p=proj(x0-26,y0+t.hi*ch+ch/2,0);
    X.globalAlpha=t.a;lab('token '+t.hi,p[0]-30,p[1]+4,12,AMB,'right');}
  const o=[proj(x0,y0,0),proj(x0+w,y0,0),proj(x0+w,y0+h,0),proj(x0,y0+h,0)];
  quad(o[0],o[1],o[2],o[3],null,'rgba(135,146,168,.45)',1.4);
  if(t.depth>.01){
    const z=[proj(x0,y0,-t.depth),proj(x0+w,y0,-t.depth),proj(x0+w,y0+h,-t.depth),proj(x0,y0+h,-t.depth)];
    quad(o[0],o[1],z[1],z[0],'rgba(143,122,166,.045)','rgba(135,146,168,.16)',1);
    quad(o[1],o[2],z[2],z[1],'rgba(143,122,166,.08)','rgba(135,146,168,.16)',1);
    quad(z[0],z[1],z[2],z[3],null,'rgba(135,146,168,.12)',1);}
  X.globalAlpha=t.a*.85;lab(t.cap,t.x,o[3][1]+44,17,DIM);
  cam.ry=0;cam.rx=0;X.restore();
}

/* ── generic matrix multiply ──────────────────────────────────── */
function mgrid(cx,cy,M,cell,tint,alpha,hiR,hiC,fillTo){
  const rows=M.length,cols=M[0].length,w=cols*cell,h=rows*cell,x0=cx-w/2,y0=cy-h/2;
  for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){
    if(fillTo!==undefined&&r*cols+c>fillTo)continue;
    let a=alpha;
    if(hiR>=0||hiC>=0) a*= (r===hiR||c===hiC)?1:.26;
    X.globalAlpha=a;X.fillStyle=tint(Math.abs(M[r][c]));
    X.fillRect(x0+c*cell,y0+r*cell,Math.max(cell-.55,.8),Math.max(cell-.55,.8));}
  X.globalAlpha=alpha;X.strokeStyle='rgba(135,146,168,.26)';X.lineWidth=1;
  X.strokeRect(x0-.5,y0-.5,w+1,h+1);
  corners(x0-6,y0-6,w+12,h+12,10,'#262c38',alpha);
  if(hiR>=0)glow(AMB,5,()=>{X.globalAlpha=alpha;X.strokeStyle=AMB;X.lineWidth=1.5;
    X.strokeRect(x0-1.5,y0+hiR*cell-1,w+3,cell+2);});
  if(hiC>=0)glow(CYA,5,()=>{X.globalAlpha=alpha;X.strokeStyle=CYA;X.lineWidth=1.5;
    X.strokeRect(x0+hiC*cell-1,y0-1.5,cell+2,h+3);});
  return {x0,y0,w,h,cell};
}
const tV=m=>`rgba(143,122,166,${.06+m*.60})`;
const tS=m=>`rgba(129,138,155,${.06+m*.48})`;
const tC=m=>`rgba(111,157,196,${.06+m*.60})`;

function drawMM(){
  const m=S.mm;if(m.a<=0||!m.A)return;
  X.save();
  const md=Math.max(m.A.length,m.A[0].length,m.B.length,m.B[0].length);
  const cell=Math.min(320/md,14);
  const A=mgrid(400,m.y,m.A,cell,tV,m.a,m.r,-1);
  const B=mgrid(900,m.y,m.B,cell,tS,m.a,-1,m.c);
  const C=mgrid(1450,m.y,m.C,cell,tC,m.a,-1,-1,Math.floor(m.fill*m.C.length*m.C[0].length));
  X.globalAlpha=m.a;
  const dim=M=>M.length+' × '+M[0].length;
  mlab(m.la,400,A.y0-26,26,VIO); lab(dim(m.A),400,A.y0+A.h+26,14,DIM);
  mlab(m.lb,900,B.y0-26,26,STL); lab(dim(m.B),900,B.y0+B.h+26,14,DIM);
  mlab(m.lc,1450,C.y0-26,26,CYA);lab(dim(m.C),1450,C.y0+C.h+26,14,DIM);
  mlab('×',(A.x0+A.w+B.x0)/2,m.y+10,34,'#39404e');
  mlab('=',(B.x0+B.w+C.x0)/2,m.y+10,34,'#39404e');
  if(m.r>=0&&m.c>=0){
    const ay=A.y0+m.r*cell+cell/2, bx=B.x0+m.c*cell+cell/2;
    const rx=C.x0+m.c*cell+cell/2, ry=C.y0+m.r*cell+cell/2;
    X.globalAlpha=m.a*.38;X.setLineDash([4,5]);
    X.strokeStyle=AMB;X.lineWidth=1.1;
    X.beginPath();X.moveTo(A.x0+A.w,ay);X.lineTo(B.x0-8,ay);X.stroke();
    X.strokeStyle=CYA;
    X.beginPath();X.moveTo(bx,B.y0+B.h);X.lineTo(bx,C.y0+C.h+20);
    X.lineTo(rx,C.y0+C.h+20);X.lineTo(rx,ry);X.stroke();X.setLineDash([]);
    glow(AMB,6,()=>{X.globalAlpha=m.a;X.fillStyle=AMB;
      X.fillRect(rx-cell/2,ry-cell/2,cell,cell);});}
  if(m.terms>0&&m.r>=0&&m.c>=0){
    X.globalAlpha=m.a*m.terms;
    const y=760,x0=250,w=1420;
    X.beginPath();X.roundRect(x0,y-52,w,112,12);
    X.fillStyle='rgba(9,11,17,.92)';X.fill();
    X.strokeStyle='#181c25';X.lineWidth=1.2;X.stroke();
    corners(x0+8,y-44,w-16,96,12,'#222833',m.a*m.terms);
    mlab(`${m.lc}[${m.r},${m.c}]`,x0+34,y-2,23,CYA,'left');
    mlab('=',x0+168,y-2,23,'#39404e','left');
    let x=x0+204;
    const K=m.A[0].length;
    for(let k=0;k<5;k++){
      lab(f2(m.A[m.r][k]),x,y-2,17,AMB,'left');
      lab('·',x+46,y-2,17,'#333945','left');
      lab(f2(m.B[k][m.c]),x+60,y-2,17,CYA,'left');
      if(k<4)lab('+',x+116,y-2,17,'#333945','left');
      x+=138;}
    lab('+ ⋯ '+(K-5)+' more',x,y-2,17,'#333945','left');
    lab('= '+f2(m.C[m.r][m.c]),x0+w-34,y-2,20,INK,'right',500);
    X.globalAlpha=m.a*m.terms*.45;
    lab(K+' multiply-accumulates per cell  ·  '+
      (m.C.length*m.C[0].length*K).toLocaleString()+' for this matrix',x0+w/2,y+40,13,'#39404e');}
  X.restore();
}

/* ── UART: logic-analyser style ───────────────────────────────── */
const BAR={y:840,h:44,x:250,w:1420};
function fields(){
  const x=BAR.x+S.bar.slide*1750;
  return [{x:x,w:120,l:'0xAA',s:'start',c:AMB},
          {x:x+120,w:960,l:'',s:'payload · 2048 B',c:CYA,pay:1},
          {x:x+1080,w:220,l:'0x?? XOR',s:'checksum',c:MAG,chk:1},
          {x:x+1300,w:120,l:'0x55',s:'stop',c:AMB}];
}
function drawBar(){
  const b=S.bar;if(b.a<=0)return;
  X.save();
  const y=BAR.y,h=BAR.h,F=fields();
  const L=F[0].x, R=F[3].x+F[3].w;

  // outer chassis
  X.globalAlpha=b.a*.9;
  X.beginPath();X.roundRect(L-18,y-46,R-L+36,h+92,10);
  X.fillStyle='rgba(8,10,15,.92)';X.fill();
  X.strokeStyle='#141822';X.lineWidth=1.2;X.stroke();
  corners(L-10,y-38,R-L+20,h+76,14,'#242a36',b.a*.9);

  // byte offset ruler
  X.globalAlpha=b.a*.5;
  X.strokeStyle='#1b2029';X.lineWidth=1;
  X.beginPath();X.moveTo(L,y-20);X.lineTo(R,y-20);X.stroke();
  for(let i=0;i<=16;i++){
    const px=L+i*((R-L)/16), major=i%4===0;
    X.globalAlpha=b.a*(major?.55:.3);
    X.beginPath();X.moveTo(px,y-20);X.lineTo(px,y-20-(major?8:4));X.stroke();
    if(major){X.globalAlpha=b.a*.4;
      lab(String(Math.round(i*2052/16)),px,y-34,10,'#39404e');}
  }

  for(const f of F){
    const al=f.chk?b.chk:1;
    X.globalAlpha=b.a*al;
    X.fillStyle='rgba(6,8,12,.95)';X.fillRect(f.x,y,f.w,h);
    if(f.pay){
      X.save();X.beginPath();X.rect(f.x,y,f.w,h);X.clip();
      const fw=f.w*b.fill;
      const g=X.createLinearGradient(f.x,y,f.x+f.w,y+h);
      g.addColorStop(0,'rgba(143,122,166,.7)');
      g.addColorStop(.55,'rgba(126,146,172,.62)');
      g.addColorStop(1,'rgba(111,157,196,.62)');
      X.fillStyle=g;X.fillRect(f.x,y,fw,h);
      // subtle scanline texture
      X.globalAlpha=b.a*.14;X.fillStyle='#06070b';
      for(let t=0;t<h;t+=3)X.fillRect(f.x,y+t,fw,1);
      // byte cell divisions
      X.globalAlpha=b.a*.22;X.strokeStyle='#06070b';X.lineWidth=1;
      for(let t=1;t<80;t++){const px=f.x+t*(f.w/80);
        if(px<f.x+fw){X.beginPath();X.moveTo(px,y);X.lineTo(px,y+h);X.stroke();}}
      X.restore();
      if(b.fill>0&&b.fill<1){
        const ex=f.x+f.w*b.fill;
        glow(CYA,8,()=>{X.globalAlpha=b.a;X.strokeStyle=CYA;X.lineWidth=2;
          X.beginPath();X.moveTo(ex,y+1);X.lineTo(ex,y+h-1);X.stroke();});
        X.globalAlpha=b.a*.5;
        glow(CYA,4,()=>{X.fillStyle=CYA;X.beginPath();
          X.moveTo(ex,y-6);X.lineTo(ex-4,y-13);X.lineTo(ex+4,y-13);X.closePath();X.fill();});
      }
    }else{
      X.globalAlpha=b.a*al*.16;X.fillStyle=f.c;X.fillRect(f.x,y,f.w,h);
      X.globalAlpha=b.a*al;lab(f.l,f.x+f.w/2,y+h/2+6,16,f.c,'center',500);
    }
    X.globalAlpha=b.a*al;
    X.strokeStyle=f.c;X.lineWidth=1.3;X.strokeRect(f.x+.5,y+.5,f.w-1,h-1);
    // corner nubs on each field
    X.globalAlpha=b.a*al*.7;X.fillStyle=f.c;
    X.fillRect(f.x+1,y+1,4,1.4);X.fillRect(f.x+f.w-5,y+h-2.4,4,1.4);
    X.globalAlpha=b.a*al*.5;lab(f.s,f.x+f.w/2,y+h+22,12,DIM);
  }
  if(b.count>0){X.globalAlpha=b.a;
    lab(Math.round(b.count*1024)+' / 1024 values  ·  Q8.8',L+(R-L)/2,y+h+50,16,DIM);}
  X.restore();
}
let fliers=[];
function drawFliers(){
  if(!fliers.length)return;
  X.save();const now=clock();
  for(const f of fliers){
    const p=cl((now-f.t0)/f.dur),e=eo(p);
    const x=lerp(f.x0,f.x1,e),y=lerp(f.y0,f.y1,e)-Math.sin(p*Math.PI)*70;
    X.globalAlpha=(1-p*p)*.9;
    glow(f.c,8,()=>{X.fillStyle=f.c;X.fillRect(x-5,y-5,10,10);});}
  fliers=fliers.filter(f=>now-f.t0<f.dur);X.restore();
}
function emit(p,fromY,cw,ch){
  const pay=fields()[1];
  const idx=Math.floor(p*1024),r=Math.floor(idx/64),c=idx%64;
  fliers.push({x0:960+(c-32)*cw,y0:fromY+(r-8)*ch,
    x1:pay.x+10+p*(pay.w-20)+(srand()*10-5),y1:BAR.y+BAR.h/2,
    t0:clock(),dur:480,c:srand()<.5?VIO:CYA});
}

function drawWire(){
  const w=S.wire;if(w.a<=0)return;
  X.save();X.globalAlpha=w.a;
  X.strokeStyle='#12141c';X.lineWidth=2;
  X.beginPath();X.moveTo(160,1010);X.lineTo(1760,1010);X.stroke();
  if(w.p>=0){const x=w.dir>0?160+w.p*1600:1760-w.p*1600;
    const g=X.createLinearGradient(x-150*w.dir,0,x,0);
    g.addColorStop(0,'rgba(111,157,196,0)');g.addColorStop(1,'rgba(111,157,196,.85)');
    X.strokeStyle=g;X.lineWidth=2.5;
    X.beginPath();X.moveTo(x-150*w.dir,1010);X.lineTo(x,1010);X.stroke();
    glow(CYA,8,()=>{X.fillStyle=CYA;X.beginPath();X.arc(x,1010,5,0,7);X.fill();});}
  X.restore();
}
function drawChip(){
  const c=S.chip;if(c.a<=0)return;
  X.save();X.globalAlpha=c.a;
  X.beginPath();X.roundRect(160,70,1600,850,20);
  X.fillStyle='rgba(9,11,16,.55)';X.fill();
  X.strokeStyle='#171b24';X.lineWidth=1.8;X.stroke();
  X.strokeStyle='#12151e';
  for(let i=0;i<26;i++){X.beginPath();X.roundRect(208+i*60,62,24,7,2);X.stroke();
    X.beginPath();X.roundRect(208+i*60,921,24,7,2);X.stroke();}
  corners(182,90,1556,810,20,'#252a35',c.a);
  X.globalAlpha=c.a;
  lab('ARTIX-7 · XC7A35T',198,118,15,'#2b303c','left',500);
  lab('90 DSP · 225 KB BRAM',1722,118,15,'#2b303c','right');
  X.restore();
}

function drawScorePanel(){
  const s=S.sm;if(s.a<=0)return;
  X.save();
  const cell=22, cx=460, cy=540;
  const g=mgrid(cx,cy,SCM,cell,tV,s.a,-1,-1);
  X.globalAlpha=s.a;
  mlab('scores',cx,g.y0-30,26,VIO);
  lab('16 × 16',cx,g.y0+g.h+28,14,DIM);
  const ry=g.y0+SROW*cell+cell/2;
  glow(AMB,7,()=>{X.globalAlpha=s.a;X.strokeStyle=AMB;X.lineWidth=2;
    X.strokeRect(g.x0-3,g.y0+SROW*cell-1,g.w+6,cell+2);});
  X.globalAlpha=s.a*.85;
  lab('row '+SROW,g.x0-14,ry+5,12,AMB,'right');
  X.globalAlpha=s.a*.4;X.setLineDash([5,6]);X.strokeStyle=AMB;X.lineWidth=1.3;
  X.beginPath();X.moveTo(g.x0+g.w+10,ry);X.lineTo(700,ry);X.stroke();X.setLineDash([]);
  X.globalAlpha=s.a*.6;X.fillStyle=AMB;
  X.beginPath();X.moveTo(712,ry);X.lineTo(700,ry-5);X.lineTo(700,ry+5);X.closePath();X.fill();
  X.restore();
}
function drawSoft(){
  const s=S.sm;if(s.a<=0)return;
  X.save();X.globalAlpha=s.a;
  const ox=770,base=716,bw=34,gp=14,span=16*(bw+gp);
  const mR=Math.max(...RAW.map(Math.abs)),mE=Math.max(...EXR),mN=Math.max(...NRM);
  for(let i=0;i<=4;i++){X.globalAlpha=s.a*.28;X.strokeStyle='#12151d';X.lineWidth=1;
    X.beginPath();X.moveTo(ox-18,base-i*62);X.lineTo(ox+span,base-i*62);X.stroke();}
  X.globalAlpha=s.a;X.strokeStyle='#1a1e28';X.lineWidth=1.2;
  X.beginPath();X.moveTo(ox-18,base);X.lineTo(ox+span,base);X.stroke();
  if(s.st>0&&s.st<2){const t=cl(s.st);
    X.globalAlpha=s.a*t*.5;X.strokeStyle=AMB;X.lineWidth=1.6;X.beginPath();
    for(let i=0;i<=140;i++){const u=i/140,v=Math.exp(-mR+u*2*mR);
      const yy=base-(v/mE)*246;i?X.lineTo(ox+u*span,yy):X.moveTo(ox+u*span,yy);}
    X.stroke();X.globalAlpha=s.a*t;lab('eˣ',ox+span+16,base-242,19,AMB,'left');}
  for(let i=0;i<16;i++){
    const x=ox+i*(bw+gp);let h,col;
    if(s.st<=0){h=(RAW[i]/mR)*118;
      X.fillStyle='rgba(129,138,155,.75)';
      X.beginPath();X.roundRect(x,RAW[i]>=0?base-h:base,bw,Math.abs(h),3);X.fill();
      X.globalAlpha=s.a*.55;lab(f2(RAW[i]),x+bw/2,RAW[i]>=0?base+22:base-Math.abs(h)-10,10,DIM);
      X.globalAlpha=s.a;continue;}
    if(s.st<2){const t=cl(s.st);
      h=lerp(Math.max((RAW[i]/mR)*118,0),(EXR[i]/mE)*246,t);
      col=`rgba(207,174,106,${.32+.46*t})`;}
    else{const t=cl(s.st-2);
      h=lerp((EXR[i]/mE)*246,(NRM[i]/mN)*246,t);
      const mx=NRM[i]===Math.max(...NRM);
      col=(mx&&s.pick>0)?AMB:`rgba(111,157,196,${.5+.3*t})`;
      X.globalAlpha=s.a*((mx&&s.pick>0)?1:1-s.pick*.5);}
    X.fillStyle=col;X.beginPath();X.roundRect(x,base-h,bw,h,3);X.fill();
    if(s.st>=2){const mx=NRM[i]===Math.max(...NRM);
      X.globalAlpha=s.a*cl(s.st-2)*(mx?1:.5);
      lab(NRM[i].toFixed(2).slice(1),x+bw/2,base-h-10,10,mx?AMB:DIM);}
    X.globalAlpha=s.a;}
  if(s.st>=2){X.globalAlpha=s.a*cl(s.st-2);lab('Σ = 1.00',ox+span+16,base-30,19,CYA,'left');}
  X.restore();
}

function drawPC(){
  const m=S.pc;if(m.a<=0)return;
  X.save();
  ['residual','LayerNorm','feed-forward','projection','sigmoid'].forEach((s,i)=>{
    const on=m.step>i,x=200+i*312;
    X.globalAlpha=m.a*(on?1:.14);
    X.beginPath();X.roundRect(x,470,264,92,12);
    if(on){X.fillStyle='rgba(143,122,166,.09)';X.fill();}
    X.strokeStyle=on?VIO:FAINT;X.lineWidth=1.6;X.stroke();
    lab(s,x+132,523,21,on?INK:FAINT);
    if(i<4){X.globalAlpha=m.a*(on?.5:.12);X.strokeStyle=FAINT;X.lineWidth=1.4;
      X.beginPath();X.moveTo(x+272,516);X.lineTo(x+306,516);X.stroke();}});
  X.restore();
}

function backdrop(){
  X.save();
  X.strokeStyle='rgba(150,160,185,.022)';X.lineWidth=1;
  for(let x=0;x<=W;x+=40){X.beginPath();X.moveTo(x,0);X.lineTo(x,H);X.stroke();}
  for(let y=0;y<=H;y+=40){X.beginPath();X.moveTo(0,y);X.lineTo(W,y);X.stroke();}
  X.strokeStyle='rgba(150,160,185,.042)';
  for(let x=0;x<=W;x+=200){X.beginPath();X.moveTo(x,0);X.lineTo(x,H);X.stroke();}
  for(let y=0;y<=H;y+=200){X.beginPath();X.moveTo(0,y);X.lineTo(W,y);X.stroke();}
  X.restore();
}
function drawFrame(){
  X.setTransform(1,0,0,1,0,0);X.globalAlpha=1;X.shadowBlur=0;X.setLineDash([]);
  X.fillStyle=BG;X.fillRect(0,0,cv.width,cv.height);
  X.setTransform(sc,0,0,sc,offX,offY);
  backdrop();
  drawChip();drawGrid();drawTok();drawMM();drawScorePanel();drawSoft();drawPC();
  drawBar();drawFliers();drawWire();
}
function loop(){
  if(!RENDER.on){pump();drawFrame();}
  requestAnimationFrame(loop);
}

function reset(){
  gen++;pending=[];fliers=[];rngState=1;
  Object.assign(S.grid,{a:0,x:960,y:520,s:1,lc:LINE,flash:0,pred:0,predW:0});
  Object.assign(S.tok,{a:0,M:null,x:960,y:520,cw:42,ch:42,num:0,hi:-1,tilt:0,depth:0,sent:0,posA:0,cap:''});
  Object.assign(S.mm,{a:0,A:null,B:null,C:null,la:'',lb:'',lc:'',r:-1,c:-1,fill:0,terms:0,y:360});
  Object.assign(S.bar,{a:0,fill:0,chk:0,slide:0,count:0,wave:0});
  Object.assign(S.wire,{a:0,p:-1,dir:1});
  S.chip.a=0;S.sm.a=0;S.sm.st=0;S.sm.pick=0;S.pc.a=0;S.pc.step=0;
}

/* run one multiply: slow stepping, term readout, then a raster sweep */
async function runMul(A,B,C,la,lb,lc,slow,sweepMs,showTerms){
  const id=gen;
  Object.assign(S.mm,{A,B,C,la,lb,lc,r:-1,c:-1,fill:0,terms:0});
  if(S.mm.a<1)await tw(600,p=>S.mm.a=p);
  const cols=C[0].length,rows=C.length;
  if(showTerms)await tw(400,p=>S.mm.terms=p);
  for(let n=0;n<slow;n++){
    if(id!==gen)return;
    S.mm.r=Math.floor(n/2)%rows;S.mm.c=(n*13)%cols;
    S.mm.fill=(S.mm.r*cols+S.mm.c)/(rows*cols);
    await wait(showTerms?320:130);}
  if(showTerms)await tw(350,p=>S.mm.terms=1-p);
  await tw(sweepMs,p=>{const idx=Math.floor(lerp(0,rows*cols,p));
    S.mm.r=Math.floor(idx/cols);S.mm.c=idx%cols;S.mm.fill=idx/(rows*cols);},lin);
  S.mm.r=-1;S.mm.c=-1;S.mm.fill=1;
}

/* ══ SCENE 1 ══ */
async function s1(){
  reset();const id=gen;
  await tw(800,p=>S.grid.a=p);await wait(900);
  await tw(130,p=>{S.grid.flash=p;S.grid.lc=mix(LINE,'#ffffff',p)});
  await tw(480,p=>{S.grid.flash=1-p;S.grid.lc=mix('#ffffff',LINE,p)});
  if(id!==gen)return;await wait(300);

  S.tok.M=PIX;S.tok.cap='16 × 16  ·  1 = drawn, 0 = empty';
  S.tok.cw=42;S.tok.ch=42;S.tok.x=960;S.tok.y=520;
  await tw(900,p=>{S.tok.a=p;S.grid.a=1-p*.5});
  await tw(1200,p=>{S.tok.x=lerp(960,1250,p);S.grid.x=lerp(960,540,p);S.grid.s=lerp(1,.58,p)});
  await tw(800,p=>S.tok.num=p);
  await wait(1100);
  await tw(700,p=>{S.grid.a=.5*(1-p);S.tok.a=1-p});

  // the actual embedding multiply
  S.mm.y=380;
  await runMul(PIX,WEMB,EMB,'pixels','W_embed','tokens',5,2200,true);
  await wait(700);
  await tw(600,p=>S.mm.a=1-p);

  // slab + positional encoding
  S.tok.M=EMB;S.tok.cw=15;S.tok.ch=27;S.tok.num=0;S.tok.tilt=0;S.tok.x=960;S.tok.y=470;
  S.tok.cap='16 × 64  ·  1024 values';
  await tw(700,p=>S.tok.a=p);
  await tw(1100,p=>S.tok.tilt=p*.5);
  await wait(400);
  S.tok.M=XP;
  await tw(1200,p=>S.tok.posA=p);
  await wait(700);
  for(let r=0;r<16;r++){if(id!==gen)return;S.tok.hi=r;await wait(70);}
  S.tok.hi=-1;await wait(400);
  await tw(1000,p=>{S.tok.tilt=lerp(.5,.18,p);S.tok.y=lerp(470,380,p)});

  await tw(600,p=>S.bar.a=p);
  await tw(4400,p=>{S.tok.sent=p;S.bar.fill=p;S.bar.count=p;
    if(srand()<.55)emit(p,380,15,27);},eo);
  if(id!==gen)return;await wait(350);
  await tw(700,p=>S.tok.a=1-p);
  await tw(700,p=>S.bar.chk=p);await wait(600);
  S.wire.a=1;S.wire.dir=1;
  await tw(1600,p=>{S.bar.slide=p;S.wire.p=p});
  await tw(400,p=>S.bar.a=1-p);
}

/* ══ SCENE 2 ══ */
async function s2(){
  reset();const id=gen;
  S.wire.a=1;S.wire.dir=1;
  await tw(900,p=>{S.chip.a=p;S.wire.p=p});
  S.wire.p=-1;await wait(300);
  S.mm.y=340;

  await runMul(XP,WQ,QM,'X','W_q','Q',6,2200,true);   await wait(400);
  await runMul(XP,WK,KM,'X','W_k','K',2,1200,false);  await wait(300);
  await runMul(XP,WV,VM,'X','W_v','V',2,1200,false);  await wait(600);

  await runMul(QM,T(KM),SCM,'Q','Kᵀ','scores',3,1800,true);
  await wait(1000);
  await tw(600,p=>S.mm.a=1-p);

  // softmax on one row
  await tw(700,p=>S.sm.a=p);await wait(1100);
  await tw(1400,p=>S.sm.st=p);await wait(900);
  await tw(900,p=>S.sm.st=1+p);
  await tw(1300,p=>S.sm.st=2+p);await wait(600);
  await tw(700,p=>S.sm.pick=p);await wait(1200);
  await tw(700,p=>S.sm.a=1-p);

  // attention × V, then output projection
  await runMul(ATT,VM,CTX,'attention','V','context',3,1600,true); await wait(500);
  await runMul(CTX,WO,OUTM,'context','W_out','output',2,1600,false);
  await wait(700);
  await tw(600,p=>S.mm.a=1-p);

  // ship the output back
  S.tok.M=OUTM;S.tok.cw=15;S.tok.ch=27;S.tok.tilt=.2;S.tok.x=960;S.tok.y=380;
  S.tok.cap='output  16 × 64';S.tok.sent=0;S.tok.posA=0;
  await tw(800,p=>S.tok.a=p);await wait(900);
  await tw(500,p=>S.bar.a=p);
  await tw(2800,p=>{S.tok.sent=p;S.bar.fill=p;S.bar.count=p;
    if(srand()<.5)emit(p,380,15,27);},eo);
  await tw(500,p=>{S.tok.a=1-p;S.bar.chk=p});await wait(500);
  S.wire.dir=-1;
  await tw(1600,p=>{S.bar.slide=-p;S.wire.p=p});
  await tw(500,p=>{S.chip.a=1-p;S.bar.a=1-p});
}

/* ══ SCENE 3 ══ */
async function s3(){
  reset();const id=gen;
  S.wire.a=1;S.wire.dir=-1;
  await tw(900,p=>S.wire.p=p);S.wire.p=-1;
  await tw(500,p=>S.pc.a=p);
  for(let i=1;i<=5;i++){if(id!==gen)return;S.pc.step=i;await wait(520);}
  await wait(700);
  await tw(600,p=>{S.pc.a=1-p;S.wire.a=1-p});
  S.grid.a=0;S.grid.x=960;S.grid.y=520;S.grid.s=1;
  await tw(800,p=>S.grid.a=p);await wait(600);
  await tw(160,p=>S.grid.lc=mix(LINE,'#3a5a7d',p));
  await tw(1300,p=>S.grid.pred=p,eo);await wait(1000);
  await tw(1500,p=>S.grid.predW=p);
  await tw(400,p=>S.grid.lc=mix('#3a5a7d',LINE,p));
  await wait(1400);
}
async function all(){await s1();await wait(500);await s2();await wait(500);await s3();}


let portfolioFrame=-1,portfolioStarted=false;
window.portfolioAnimation={
 duration:90.567,poster:4,
 reset(){RENDER.on=true;RENDER.t=-OUT.LEAD_FRAMES*1000/60;reset();portfolioFrame=-1;portfolioStarted=false;},
 async advance(seconds){
  const last=Math.round(seconds*60);
  if(last<portfolioFrame)this.reset();
  for(let frame=portfolioFrame+1;frame<=last;frame++){
   RENDER.t=(frame-OUT.LEAD_FRAMES)*1000/60;
   if(!portfolioStarted && frame>=OUT.LEAD_FRAMES){portfolioStarted=true;all();}
   if(portfolioStarted)pump();
   for(let flush=0;flush<5;flush++)await Promise.resolve();
   portfolioFrame=frame;
  }
  drawFrame();
 },
 draw(){drawFrame();}
};
