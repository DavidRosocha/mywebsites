
/* ══════════════════════════════════════════════════════════════════
   OUTPUT SETTINGS

   The canvas used to size itself from the window and devicePixelRatio,
   so the capture resolution was whatever the browser happened to be.
   It is now pinned to a fixed export size, which makes the internal
   scale factor exactly 2.0 at 4K — every glyph and hairline is
   re-rasterised rather than stretched.

   The original recorder had a hard 48-second auto-stop (RECORD_MS) and
   kicked off play() one frame after starting, so the reference file is
   48.000 s with a single frame before scene 1 begins. The scene
   timings below total 46.9 s, leaving ~1.1 s of held final state.
   If ffprobe reports a different duration for your reference mp4, set
   TOTAL_FRAMES to round(duration × 60) — it is the only number that
   needs changing.
────────────────────────────────────────────────────────────────── */
const OUT = {
  W: Math.min(2560, Math.max(960, Math.round(innerWidth * Math.min(devicePixelRatio || 1, 2) / 16) * 16)),             // 1920 to reproduce the old file for A/B checking
  H: 1080,
  FPS: 60,
  LEAD_FRAMES: 1,      // one frame before scene 1 starts, as in the original
  TOTAL_FRAMES: 2880,  // 2880 / 60 = 48.000 s, matching the RECORD_MS stop

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

/* ══════════════════════════════════════════════════════════════════
   CLOCK + SCHEDULER

   Previously every tween ran on its own requestAnimationFrame and every
   wait() was a setTimeout, tying the animation to wall-clock time and to
   whatever framerate the browser could manage. At 4K that means dropped
   frames and a video that no longer matches the original.

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
function scene(){}   /* labels removed */

/* one row of the score matrix */
const RAW=[-1.2,0.4,2.3,-0.6,1.1,-0.3,0.8,-1.5];
const EX=RAW.map(Math.exp), SUM=EX.reduce((a,b)=>a+b,0);
const P=EX.map(v=>v/SUM);
const f1=v=>(v<0?'−':'')+Math.abs(v).toFixed(1);

const S={
  row:{a:0,pull:0,q:0},
  sq:{a:0,morph:0,sum:0},
  form:{a:0,step:0,mark:0},
  cost:{a:0,mul:0,div:0,cyc:0},
  fin:{a:0,p:0,dsp:0}
};

/* ══ SCENE 1 · the scores are arbitrary numbers ══════════════════ */
function d1(){
  const s=S.row;if(s.a<=0)return;
  

  // the matrix, with one row lifted out
  const cell=30, mx=200, my=330;
  X.globalAlpha=s.a;
  for(let r=0;r<16;r++)for(let c=0;c<16;c++){
    X.globalAlpha=s.a*(r===6?1:.30);
    X.fillStyle=`rgba(143,122,166,${.08+Math.abs(rnd(r,c,3)*2-1)*.6})`;
    X.fillRect(mx+c*cell,my+r*cell,cell-3,cell-3);
  }
  X.globalAlpha=s.a;
  X.strokeStyle='rgba(135,146,168,.25)';X.lineWidth=1.1;
  X.strokeRect(mx-2,my-2,16*cell+1,16*cell+1);
  corners(mx-9,my-9,16*cell+15,16*cell+15,12,'#262c38',s.a);
  lab('SCORES  16 × 16',mx,my-24,15,VIO,'left',500);
  glow(AMB,10,()=>{X.globalAlpha=s.a;X.strokeStyle=AMB;X.lineWidth=2;
    X.strokeRect(mx-4,my+6*cell-2,16*cell+5,cell+1);});
  X.globalAlpha=s.a*.8;
  lab('row 6',mx-16,my+6*cell+20,13,AMB,'right');

  // the eight numbers, pulled out
  if(s.pull>0){
    const bx=790, by=my+6*cell+12;
    X.globalAlpha=s.a*s.pull*.4;
    X.setLineDash([4,6]);X.strokeStyle=AMB;X.lineWidth=1.3;
    X.beginPath();X.moveTo(mx+16*cell+8,by);X.lineTo(bx-30,by);X.stroke();
    X.setLineDash([]);
    RAW.forEach((v,i)=>{
      const t=cl(s.pull*2-i*.12);
      if(t<=0)return;
      const x=bx+i*118;
      X.globalAlpha=s.a*t;
      X.strokeStyle='#2a3040';X.lineWidth=1.3;
      X.beginPath();X.roundRect(x,by-42,100,84,8);X.stroke();
      lab(f1(v),x+50,by+12,30,v<0?RED:INK,'center',500);
    });
  }

}

/* ══ SCENE 2 · squash them ═══════════════════════════════════════ */
function d2(){
  const s=S.sq;if(s.a<=0)return;
  

  const n=8,bw=112,gp=30,span=n*bw+(n-1)*gp;
  const x0=(W-span)/2, base=700, maxH=300;
  const mR=Math.max(...RAW.map(Math.abs)), mP=Math.max(...P);
  const m=s.morph;

  X.globalAlpha=s.a*.35;X.strokeStyle=MUT;X.lineWidth=1.4;
  X.beginPath();X.moveTo(x0-40,base);X.lineTo(x0+span+40,base);X.stroke();

  for(let i=0;i<n;i++){
    const x=x0+i*(bw+gp);
    const h=lerp((RAW[i]/mR)*175,(P[i]/mP)*maxH,m);
    const col=m<.5?`rgba(129,138,155,${.5+.25*(1-m*2)})`
                  :`rgba(111,157,196,${.45+.4*(m*2-1)})`;
    X.globalAlpha=s.a;X.fillStyle=col;
    X.beginPath();X.roundRect(x,Math.min(base-h,base),bw,Math.abs(h),5);X.fill();
    const shown=m<.5?f1(RAW[i]):P[i].toFixed(2).slice(1);
    X.globalAlpha=s.a*.95;
    lab(shown,x+bw/2,h>=0?base-h-18:base+Math.abs(h)+28,24,m<.5?DIM:CYA,'center',500);
  }
  X.globalAlpha=s.a*cl(1-m*2.2);
  lab('RAW',W/2,base+92,20,STL,'center',500);
  X.globalAlpha=s.a*cl(m*2.2-1.2);
  lab('PROBABILITIES',W/2,base+92,20,CYA,'center',500);
  if(s.sum>0){
    X.globalAlpha=s.a*s.sum;
    glow(GRN,10,()=>{lab('Σ = 1.00',W/2,base+168,34,GRN,'center',500);});
  }
}

/* ══ SCENE 3 · the formula ═══════════════════════════════════════ */
function d3(){
  const s=S.form;if(s.a<=0)return;

  /* Every panel is positioned from its centre so borders and content agree. */
  const panel=(cx,cy,w,h,col,alpha)=>{
    const x=Math.round(cx-w/2)+.5,y=Math.round(cy-h/2)+.5;
    X.globalAlpha=alpha;
    X.fillStyle='rgba(255,255,255,.008)';
    X.beginPath();X.roundRect(x,y,w,h,12);X.fill();
    X.strokeStyle=col;X.lineWidth=1.5;
    X.beginPath();X.roundRect(x,y,w,h,12);X.stroke();
    return {x,y,cx,cy,w,h};
  };
  const mathMeasure=(text,size)=>{
    X.save();X.font=`italic 400 ${size}px ${MATH}`;
    const w=X.measureText(text).width;X.restore();return w;
  };
  const expToken=(cx,baseline,baseSize,supSize,col,alpha)=>{
    const ew=mathMeasure('e',baseSize),xw=mathMeasure('x',supSize);
    const total=ew+xw-2,left=cx-total/2;
    X.globalAlpha=alpha;
    mlab('e',left,baseline,baseSize,col,'left');
    mlab('x',left+ew-2,baseline-baseSize*.48,supSize,col,'left');
    return total;
  };
  const divisionToken=(cx,baseline,alpha)=>{
    const divSize=58,sumSize=52,baseSize=50,supSize=29,gap=18;
    const dw=mathMeasure('÷',divSize),sw=mathMeasure('Σ',sumSize);
    const ew=mathMeasure('e',baseSize),xw=mathMeasure('x',supSize);
    const total=dw+gap+sw+ew+xw-4,left=cx-total/2;
    X.globalAlpha=alpha;
    mlab('÷',left,baseline,divSize,CYA,'left');
    mlab('Σ',left+dw+gap,baseline,sumSize,CYA,'left');
    mlab('e',left+dw+gap+sw,baseline,baseSize,CYA,'left');
    mlab('x',left+dw+gap+sw+ew-4,baseline-baseSize*.43,supSize,CYA,'left');
  };

  /* two equal panels, mirrored around the canvas centre */
  const BW=440,BH=200,TOP_Y=405,TOP_OFFSET=300;
  const LEFT_CX=W/2-TOP_OFFSET,RIGHT_CX=W/2+TOP_OFFSET;

  const t1=cl(s.step);
  if(t1>0){
    const col=s.mark>0?RED:'#2a3040',alpha=s.a*t1;
    if(s.mark>0)glow(RED,10,()=>panel(LEFT_CX,TOP_Y,BW,BH,col,alpha));
    else panel(LEFT_CX,TOP_Y,BW,BH,col,alpha);
    expToken(LEFT_CX,TOP_Y+26,74,42,AMB,alpha);
    X.globalAlpha=s.a*t1*.75;
    lab('exponentiate every score',LEFT_CX,TOP_Y+BH/2+34,15,MUT);
    if(s.mark>0){X.globalAlpha=s.a*s.mark;lab('expensive',LEFT_CX,TOP_Y-BH/2-24,15,RED);}
  }

  const t2=cl(s.step-1);
  if(t2>0){
    const col=s.mark>0?RED:'#2a3040',alpha=s.a*t2;
    if(s.mark>0)glow(RED,10,()=>panel(RIGHT_CX,TOP_Y,BW,BH,col,alpha));
    else panel(RIGHT_CX,TOP_Y,BW,BH,col,alpha);
    divisionToken(RIGHT_CX,TOP_Y+24,alpha);
    X.globalAlpha=s.a*t2*.75;
    lab('divide by the total',RIGHT_CX,TOP_Y+BH/2+34,15,MUT);
    if(s.mark>0){X.globalAlpha=s.a*s.mark;lab('expensive',RIGHT_CX,TOP_Y-BH/2-24,15,RED);}
  }

  /* assembled expression: measured first, then centred as one unit */
  const t3=cl(s.step-2);
  if(t3>0){
    const FW=840,FH=210,FORM_Y=750,alpha=s.a*t3;
    panel(W/2,FORM_Y,FW,FH,'#242a35',alpha);

    const label='softmax(x)',labelSize=38,eqSize=36,fracW=170;
    const labelW=mathMeasure(label,labelSize),eqW=mathMeasure('=',eqSize);
    const gap1=34,gap2=34,total=labelW+gap1+eqW+gap2+fracW;
    const left=W/2-total/2,eqX=left+labelW+gap1;
    const fracCX=eqX+eqW+gap2+fracW/2;
    X.globalAlpha=alpha;
    mlab(label,left,FORM_Y+14,labelSize,INK,'left');
    mlab('=',eqX,FORM_Y+14,eqSize,MUT,'left');
    expToken(fracCX,FORM_Y-20,39,23,AMB,alpha);
    X.globalAlpha=alpha;X.strokeStyle=INK;X.lineWidth=2;
    X.beginPath();X.moveTo(fracCX-fracW/2,FORM_Y+2);X.lineTo(fracCX+fracW/2,FORM_Y+2);X.stroke();
    const sw=mathMeasure('Σ',34),ew=mathMeasure('e',34),xw=mathMeasure('x',21);
    const denomW=sw+ew+xw-3,denomLeft=fracCX-denomW/2;
    mlab('Σ',denomLeft,FORM_Y+54,34,CYA,'left');
    mlab('e',denomLeft+sw,FORM_Y+54,34,CYA,'left');
    mlab('x',denomLeft+sw+ew-3,FORM_Y+35,21,CYA,'left');
  }
}

/* ══ SCENE 4 · what those cost in hardware ═══════════════════════ */
function d4(){
  const s=S.cost;if(s.a<=0)return;
  

  const box=(x,y,w,h,title,sub,col,alpha)=>{
    X.globalAlpha=alpha;
    X.fillStyle='rgba(255,255,255,.012)';X.fillRect(x,y,w,h);
    X.strokeStyle=col;X.lineWidth=1.6;X.strokeRect(x,y,w,h);
    corners(x-9,y-9,w+18,h+18,15,'#2b313d',alpha);
    lab(title,x+18,y-16,15,col,'left',500);
    if(sub){X.globalAlpha=alpha*.6;lab(sub,x+w-18,y-16,13,MUT,'right');}
  };

  // the multiplier — small, tidy, one cycle
  if(s.mul>0){
    box(200,300,520,300,'MULTIPLIER','one DSP slice',AMB,s.a*s.mul);
    for(let r=0;r<3;r++)for(let c=0;c<5;c++){
      X.globalAlpha=s.a*s.mul*(.25+rnd(r,c,4)*.4);
      X.fillStyle=AMB;X.fillRect(280+c*84,360+r*76,64,56);
    }
    X.globalAlpha=s.a*s.mul;
    lab('1',460,700,72,AMB,'center',500);
    lab('cycle',460,738,16,MUT);
  }

  // the divider — sprawling, many cycles
  if(s.div>0){
    box(1200,300,520,300,'DIVIDER','built from logic',RED,s.a*s.div);
    const n=Math.floor(cl(s.div)*180);
    for(let i=0;i<n;i++){
      const r=Math.floor(i/15),c=i%15;
      X.globalAlpha=s.a*s.div*(.18+rnd(r,c,8)*.4);
      X.fillStyle=RED;X.fillRect(1224+c*33,320+r*24,27,18);
    }
    X.globalAlpha=s.a*s.div;
    lab('many',1460,700,72,RED,'center',500);
    lab('cycles, and a lot of logic',1460,738,16,MUT);
  }

  if(s.cyc>0){
    X.globalAlpha=s.a*s.cyc;
    lab('and the row has 16 of these  ·  the matrix has 16 rows',960,860,20,DIM);
  }
  X.globalAlpha=s.a*.5;
  mlab('vs',960,460,40,FNT);
}

/* ══ SCENE 5 · so it is not happening ════════════════════════════ */
function d5(){
  const s=S.fin;if(s.a<=0)return;
  

  // the 90 DSPs, all of them already committed
  if(s.dsp>0){
    const cols=15,rows=6,cw=52,ch=44;
    const x0=(W-cols*cw)/2, y0=300;
    for(let i=0;i<90;i++){
      const r=Math.floor(i/cols),c=i%cols;
      X.globalAlpha=s.a*s.dsp;
      X.fillStyle='rgba(207,174,106,.42)';
      X.fillRect(x0+c*cw,y0+r*ch,cw-6,ch-6);
    }
    X.globalAlpha=s.a*s.dsp;
    X.strokeStyle='rgba(207,174,106,.4)';X.lineWidth=1.4;
    X.strokeRect(x0-6,y0-6,cols*cw+6,rows*ch+6);
    lab('90 DSP SLICES  ·  64 ALREADY IN THE SYSTOLIC ARRAY',960,y0-30,16,AMB,'center',500);
  }
  X.globalAlpha=s.a*cl(s.p*2);
  lab('a divider per element is not happening',960,660,34,RED,'center',500);
  X.globalAlpha=s.a*cl(s.p*2-1);
  lab('so we do not build one',960,760,26,DIM);
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
  d1();d2();d3();d4();d5();
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
  Object.assign(S.row,{a:0,pull:0,q:0});
  Object.assign(S.sq,{a:0,morph:0,sum:0});
  Object.assign(S.form,{a:0,step:0,mark:0});
  Object.assign(S.cost,{a:0,mul:0,div:0,cyc:0});
  Object.assign(S.fin,{a:0,p:0,dsp:0});
}

async function sc1(){                      // 8.4 s
  const id=gen;
  await tw(700,p=>S.row.a=p);
  await wait(900);
  await tw(1600,p=>S.row.pull=p,lin);
  await wait(700);
  await tw(800,p=>S.row.q=p);
  await wait(3200);
  if(id!==gen)return;
  await tw(500,p=>S.row.a=1-p);
}
async function sc2(){                      // 8.4 s
  const id=gen;
  await tw(600,p=>S.sq.a=p);
  await wait(1200);
  await tw(2200,p=>S.sq.morph=p);
  await wait(600);
  await tw(700,p=>S.sq.sum=p);
  await wait(2600);
  if(id!==gen)return;
  await tw(500,p=>S.sq.a=1-p);
}
async function sc3(){                      // 11.4 s
  const id=gen;
  await tw(600,p=>S.form.a=p);
  await tw(700,p=>S.form.step=p);
  await wait(1400);
  await tw(700,p=>S.form.step=1+p);
  await wait(1600);
  await tw(800,p=>S.form.step=2+p);
  await wait(1800);
  await tw(700,p=>S.form.mark=p);
  await wait(2600);
  if(id!==gen)return;
  await tw(500,p=>S.form.a=1-p);
}
async function sc4(){                      // 10.7 s
  const id=gen;
  await tw(600,p=>S.cost.a=p);
  await tw(900,p=>S.cost.mul=p);
  await wait(1400);
  await tw(2200,p=>S.cost.div=p,lin);
  await wait(1600);
  await tw(700,p=>S.cost.cyc=p);
  await wait(2800);
  if(id!==gen)return;
  await tw(500,p=>S.cost.a=1-p);
}
async function sc5(){                      // 8 s, no fade-out — the end holds
  const id=gen;
  await tw(600,p=>S.fin.a=p);
  await tw(1400,p=>S.fin.dsp=p,lin);
  await wait(1000);
  await tw(1600,p=>S.fin.p=p*2);
  await wait(3400);
}

const SCENES=[sc1,sc2,sc3,sc4,sc5];
async function play(){
  clearAll();const id=gen;
  for(const f of SCENES){ if(id!==gen)return; await f(); }
}


let portfolioFrame=-1,portfolioStarted=false;
window.portfolioAnimation={
 duration:48,poster:1,
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
