
'use strict';
/* ══════════════════════════════════════════════════════════════════
   OUTPUT SETTINGS

   The drawing below still works in the original 1920×1080 coordinate
   space; everything is multiplied by S on the way to the canvas, so at
   3840×2160 every glyph, wire and rounded corner is re-rasterised
   rather than upscaled. Nothing here is a cached bitmap — even the
   background grid is drawn as lines — so there is no texture to re-bake.

   TOTAL_FRAMES matches how the original recorder behaved: it forced
   t = 0 before starting and stopped the frame t reached DURATION, so
   there is no blank lead-in and the file lands one frame short of the
   full 70 s timeline. Check your reference mp4 with
     ffprobe -v error -show_entries format=duration -of default=nw=1 FILE
   and if it differs, set TOTAL_FRAMES to round(duration × 60).
────────────────────────────────────────────────────────────────── */
const OUT = {
  W: Math.min(2560, Math.max(960, Math.round(innerWidth * Math.min(devicePixelRatio || 1, 2) / 16) * 16)),             // 1920 to reproduce the old file for A/B checking
  H: 1080,
  FPS: 60,
  LEAD_FRAMES: 0,      // recorder starts at t = 0, no blank head
  TOTAL_FRAMES: 4198,  // 4198 / 60 = 69.967 s

  AUTO: false,          // start the export on its own when the page opens
  AUTO_DELAY_MS: 2000  // grace period so you can hit Esc and just watch it
};

// Timing is deterministic: every object is a function of one continuous clock.
// Numbers in the worked example are illustrative bins, not implementation bit widths.
// Reported 0.9% / 96% / zero-BRAM figures are supplied by the narration.
OUT.H = OUT.W * 9 / 16;
const cv=document.getElementById('c'),X=cv.getContext('2d'),W=1920,H=1080,DURATION=70;
const S=OUT.W/W;                       // logical → device scale factor
cv.width=OUT.W;cv.height=OUT.H;
function fit(){
  const f=Math.min(innerWidth/OUT.W,Math.max(1, innerHeight - (new URLSearchParams(location.search).has('scroll') ? 0 : (innerWidth < 540 ? 112 : 72)))/OUT.H);
  cv.style.width=(OUT.W*f)+'px';cv.style.height=(OUT.H*f)+'px';
  cv.style.left=((innerWidth-OUT.W*f)/2)+'px';
  cv.style.top=((Math.max(1, innerHeight - (new URLSearchParams(location.search).has('scroll') ? 0 : (innerWidth < 540 ? 112 : 72)))-OUT.H*f)/2)+'px';
}
fit();addEventListener('resize',fit);

const BG='#12141a',INK='#e4e6ea',DIM='#767d8c',MUT='#4a515f',EDGE='#282e3a',CYA='#6f9dc4',VIO='#8f7aa6',AMB='#cfae6a',RED='#b8635c',GRN='#7d9c6b';
const MONO='ui-monospace,SFMono-Regular,Menlo,monospace';
const clamp=v=>Math.max(0,Math.min(1,v)),mix=(a,b,p)=>a+(b-a)*p;
const ease=p=>{p=clamp(p);return p*p*(3-2*p)};
const ramp=(t,a,b)=>ease((t-a)/(b-a));
const windowAt=(t,a,b,c,d)=>ramp(t,a,b)*(1-ramp(t,c,d));
function layer(a,fn){if(a<.001)return;X.save();X.globalAlpha*=a;fn();X.restore()}
function text(s,x,y,size=22,col=INK,align='center',math=false){X.save();X.font=math?`italic ${size}px Georgia`:`400 ${size}px ${MONO}`;X.textAlign=align;X.textBaseline='middle';X.fillStyle=col;X.fillText(s,x,y);X.restore()}
function rect(x,y,w,h,col=EDGE,fill=BG,r=8,lw=1.5){X.save();X.beginPath();X.roundRect(x,y,w,h,r);if(fill){X.fillStyle=fill;X.fill()}X.strokeStyle=col;X.lineWidth=lw;X.stroke();X.restore()}
function line(points,col=DIM,p=1,lw=2){const seg=points.slice(1).map((v,i)=>Math.hypot(v[0]-points[i][0],v[1]-points[i][1]));let rem=seg.reduce((a,b)=>a+b,0)*clamp(p);X.save();X.strokeStyle=col;X.lineWidth=lw;X.lineJoin='round';X.beginPath();X.moveTo(...points[0]);for(let i=0;i<seg.length;i++){let q=Math.min(1,rem/seg[i]);X.lineTo(mix(points[i][0],points[i+1][0],q),mix(points[i][1],points[i+1][1],q));rem-=seg[i];if(rem<=0)break}X.stroke();X.restore()}
function packet(points,p,col=AMB,label=''){if(p<=0||p>=1)return;const seg=points.slice(1).map((v,i)=>Math.hypot(v[0]-points[i][0],v[1]-points[i][1]));let rem=seg.reduce((a,b)=>a+b,0)*p;for(let i=0;i<seg.length;i++){if(rem<=seg[i]){const q=rem/seg[i],x=mix(points[i][0],points[i+1][0],q),y=mix(points[i][1],points[i+1][1],q);X.save();X.shadowColor=col;X.shadowBlur=15;rect(x-7,y-7,14,14,col,col,3);X.restore();if(label)text(label,x,y-29,20,col);break}rem-=seg[i]}}
function badge(s,x,y,col=AMB,width=145){rect(x-width/2,y-25,width,50,col,BG,6);text(s,x,y,23,col)}
function grid(){X.fillStyle=BG;X.fillRect(0,0,W,H);for(let x=0;x<=W;x+=40)line([[x,0],[x,H]],x%200===0?'#1a1e26':'#161920',1,1);for(let y=0;y<=H;y+=40)line([[0,y],[W,y]],y%200===0?'#1a1e26':'#161920',1,1)}
const expRows=[['−0.693','0.50'],['0.000','1.00'],['0.405','1.50'],['0.693','2.00'],['1.099','3.00'],['1.386','4.00'],['1.609','5.00']];
// One stable read port: changing a table address never reroutes its wire.
const READS=[1,2,3,4].map((value,i)=>({value,row:[1,3,4,5][i],start:20.6+i*1.45,arrival:21.7+i*1.45}));
const READ_PATH=[[522.2,571.6],[650,571.6],[650,665],[754,665]];
const NUM_PATH=[[650,571.6],[710,571.6],[710,525.5],[1070,525.5]];
const readProgress=(t,r)=>clamp((t-r.start)/(r.arrival-r.start));
const accumulated=t=>READS.reduce((sum,r)=>sum+(t>=r.arrival?r.value:0),0);
const wiringVisible=t=>ramp(t,20,20.5)*(1-windowAt(t,42.5,43,47,47.5))*(1-windowAt(t,50.5,51,55,55.5));
function expTable(t){
 const move=ramp(t,16,20),cx=mix(1060,350,move),cy=mix(525,475,move),s=mix(1,.84,move);
 X.save();X.translate(cx,cy);X.scale(s,s);
 text('EXPONENTIAL TABLE',0,-254,20,AMB);rect(-205,-217,410,432);
 text('x',-106,-186,26,DIM);text('stored eˣ',91,-186,23,AMB);line([[-205,-157],[205,-157]],EDGE);line([[0,-217],[0,215]],EDGE);
 let selected=t<20?5:READS.reduce((row,r)=>t>=r.start?r.row:row,1);
expRows.forEach((r,i)=>{const y=-130+i*49;line([[-205,y+24],[205,y+24]],EDGE,1,1);text(r[0],-106,y,23,DIM);const a=t>=2+(i+1)*.7?1:0;layer(a,()=>text(r[1],99,y,26,AMB));
 const hi=ramp(t,10,11)*(i===selected?1:0);layer(hi,()=>{rect(-203,y-22,406,46,AMB,'#cfae6a16',3,2);text(r[0],-106,y,23,INK);text(r[1],99,y,26,AMB)});
 });
 layer(windowAt(t,7.5,8.3,13,14),()=>{text('stored once',0,257,20,GRN);text('read at runtime',0,292,18,DIM)});
 X.restore();return {cx,cy,s};
}
function table2(t){
 const a=ramp(t,25,27);if(a<=0)return;
 layer(a,()=>{
 const gx=1120,gy=305,cw=88,ch=63;
 text('2D NORMALIZATION TABLE',1384,205,22,CYA);
 text('sum →',1384,254,23,VIO);text('eˣ',1050,480,30,AMB);
 for(let c=0;c<6;c++)text(String(8+c),gx+c*cw+cw/2,gy-24,22,VIO);
 for(let r=0;r<6;r++){text(String(r+1),gx-28,gy+r*ch+ch/2,23,AMB);for(let c=0;c<6;c++){
 const v=((r+1)/(8+c)*.9925).toFixed(3);
 rect(gx+c*cw,gy+r*ch,cw,ch,EDGE,`rgba(111,157,196,${.025+(r+1)/(8+c)*.13})`,0,1);
 text(v,gx+c*cw+cw/2,gy+r*ch+ch/2,18,DIM);
 }}
 const row=ramp(t,28,30),col=ramp(t,30,32),pick=ramp(t,32,33.5);
 layer(row,()=>rect(gx,gy+3*ch,6*cw,ch,AMB,'#cfae6a12',0,2));
 layer(col,()=>rect(gx+2*cw,gy,cw,6*ch,VIO,'#8f7aa61c',0,2));
 layer(pick,()=>{rect(gx+2*cw,gy+3*ch,cw,ch,CYA,'#263a4a',3,3);text('0.397',gx+2.5*cw,gy+3.5*ch,21,INK);});
 layer(windowAt(t,27,28,38,40),()=>text('illustrative quantized coordinates',1384,720,17,MUT));
 });
}
function circuit(t){
 const shrink=ramp(t,43,47),lift=ramp(t,51,55),scale=mix(1,.86,shrink)*mix(1,.69,lift);
 X.save();X.translate(960,mix(540,292,lift));X.scale(scale,scale);X.translate(-960,-540);
 layer(ramp(t,45,47),()=>{rect(105,140,1710,690,VIO,'#15171e',16);text('GENERAL-PURPOSE LOGIC',960,173,23,VIO)});
 const table=expTable(t);
 // Offline computation visibly writes the same table that will be read later.
 layer(windowAt(t,0,.7,8,9.5),()=>{
 text('eˣ',500,435,92,AMB,'center',true);text('precompute once',500,528,23,DIM);
 X.save();X.font='italic 92px Georgia';X.textAlign='center';const symbol=X.measureText('eˣ');X.restore();
 const sourceX=500+(symbol.actualBoundingBoxRight??symbol.width/2)+4;
 const active=Math.min(6,Math.max(0,Math.floor((t-2)/.7)));
 const rowY=table.cy+(-130+active*49)*table.s;
 const writePath=[[sourceX,435],[740,435],[740,rowY],[table.cx-205*table.s,rowY]];
 // A single path defines both the complete visible wire and its travelling value.
 layer(ramp(t,1,2),()=>line(writePath,AMB));
 const start=2+active*.7,arrival=2+(active+1)*.7;
 packet(writePath,clamp((t-start)/(arrival-start)),AMB,expRows[active][1]);
 });
 layer(windowAt(t,9,10,15.2,16),()=>{
 const rowY=table.cy+115*table.s,inputX=570,inputW=210,outputX=1540,outputW=145;
 const inputPath=[[inputX+inputW/2,rowY],[table.cx-205*table.s,rowY]];
 const outputPath=[[table.cx+205*table.s,rowY],[outputX-outputW/2,rowY]];
 badge('x = 1.386',inputX,rowY,VIO,inputW);line(inputPath,VIO,ramp(t,10,11));packet(inputPath,clamp((t-10)/1.3),VIO);
 layer(ramp(t,12,13),()=>rect(outputX-outputW/2,rowY-25,outputW,50,AMB));
 line(outputPath,AMB,ramp(t,12,13));packet(outputPath,clamp((t-12)/1.3),AMB,'4.00');layer(ramp(t,13,14),()=>{badge('4.00',outputX,rowY,AMB,outputW);text('one table read',outputX,rowY+69,20,DIM)});
 });
 const ad=ramp(t,20,20.5),wire=wiringVisible(t);
 layer(ad,()=>{
 layer(wire,()=>line(READ_PATH,AMB));
 rect(754,619,92,92,AMB,BG,46,2);text('+',800,663,59,AMB);
 const pulse=READS.reduce((p,r)=>Math.max(p,t>=r.arrival?1-ramp(t,r.arrival,r.arrival+.3):0),0);
 layer(pulse,()=>rect(754,619,92,92,AMB,'#cfae6a22',46,3));
 text('ACCUMULATE',800,758,18,DIM);
 badge('Σ = '+accumulated(t)+'.00',970,665,VIO,192);
 layer(wire,()=>{line([[846,665],[874,665]],VIO);for(const r of READS)packet(READ_PATH,readProgress(t,r),AMB,r.value.toFixed(2));});
 layer(windowAt(t,20,20.5,26.3,28),()=>{
 text('ONE SCORE ROW',350,745,18,DIM);
 READS.forEach((r,i)=>{const a=ramp(t,r.start,r.start+.25);layer(a,()=>badge(r.value.toFixed(2),170+i*120,801,AMB,96))});
 });
 });
 table2(t);
 // Numerator branches before the accumulator; the completed sum takes the other axis.
 layer(wire*ramp(t,27,28),()=>{
 line(NUM_PATH,AMB,ramp(t,27,28));
 packet(NUM_PATH,clamp((t-28)/1.6),AMB,'eˣ = 4.00');
 // A small bridge separates the sum wire from the numerator at their crossing.
 layer(ramp(t,29.5,30),()=>{
 line([[970,640],[970,538.5]],VIO);
 X.save();X.strokeStyle=BG;X.lineWidth=8;X.beginPath();X.arc(970,525.5,13,Math.PI/2,-Math.PI/2,true);X.stroke();X.strokeStyle=VIO;X.lineWidth=2;X.stroke();X.restore();
 line([[970,512.5],[970,235],[1340,235],[1340,270]],VIO);
 });
 // Animate along the very same bridged route used by the stationary wire.
 const bridge=Array.from({length:17},(_,i)=>{const a=Math.PI/2-i*Math.PI/16;return [970+13*Math.cos(a),525.5+13*Math.sin(a)]});
 packet([[970,640],...bridge,[970,235],[1340,235],[1340,270]],clamp((t-30)/1.8),VIO,'Σ = 10.00');
 });
 layer(wire*ramp(t,34,35),()=>{
 line([[1648,525],[1740,525],[1740,742],[1460,742]],CYA,ramp(t,34,35.5));
 packet([[1340,525],[1740,525],[1740,742],[1460,742]],clamp((t-34)/2),CYA);
 badge('p ≈ 0.397',1360,774,CYA,245);
 });
 layer(windowAt(t,38,39,44,45),()=>{
 text('READ 1',350,192,25,AMB);text('ADDER',800,568,23,AMB);text('READ 2',1384,157,25,CYA);
 text('two table reads + an adder',960,900,34,INK);
 });
 X.restore();
 layer(windowAt(t,47,48,52,54),()=>{text('0',960,925,83,GRN);text('BLOCK RAM',960,996,24,DIM)});
}
function precision(t){
 const a=ramp(t,52,54);if(!a)return;
 layer(a,()=>{
 const slide=ramp(t,62,64),cx=mix(960,620,slide),sc=mix(1,.83,slide);
 X.save();X.translate(cx,750);X.scale(sc,sc);
 text('≈ 0.9%',0,-199,53,AMB);text('average error',0,-148,23,DIM);
 const vals=[.1,.2,.3,.4],approx=[.101,.198,.303,.397];
 const morph=ramp(t,55,58),winner=ramp(t,58,60);
 for(let i=0;i<4;i++){
 const x=-330+i*220,h=vals[i]*460,ah=mix(vals[i],approx[i],morph)*460;
 rect(x-57,130-h,51,h,EDGE,'#444b58',4,1);
 rect(x+6,130-ah,51,ah,i===3?CYA:EDGE,i===3?'#6f9dc4':'#46637c',4,1);
 text(vals[i].toFixed(3),x-32,105-h,19,DIM);text(mix(vals[i],approx[i],morph).toFixed(3),x+32,105-ah,19,CYA);
 text('token '+(i+1),x,164,21,DIM);
 if(i===3)layer(winner,()=>{rect(x-76,-100,152,288,GRN,null,9,2);text('WINNER',x,-126,23,GRN)});
 }
 text('exact',-155,222,21,DIM);text('table lookup',113,222,21,CYA);
 X.restore();
 layer(windowAt(t,59,60,62,64),()=>text('same winning token',960,1030,25,GRN));
 layer(ramp(t,63,65),()=>{
 const x0=1215,y0=728;
 text('≈ 96%',1450,568,66,GRN);text('winning-token agreement',1450,628,22,DIM);
 for(let i=0;i<100;i++){const p=ramp(t,64+i*.016,64.5+i*.016);layer(p,()=>{let col=i<96?GRN:RED;rect(x0+(i%20)*24,y0+Math.floor(i/20)*31,17,22,col,col,2,1)})}
 text('96 match / 4 differ',1450,926,20,DIM);
 text('reported result · illustrative distribution',1450,968,15,MUT);
 });
 });
}
/* Everything draws through the S scale in the original coordinates.
   grid() paints the full 1920×1080 logical field, so it still covers
   the whole canvas and no separate clear is needed. */
function draw(t){X.setTransform(S,0,0,S,0,0);X.globalAlpha=1;grid();circuit(t);precision(t)}

// ── transport ────────────────────────────────────────────────────────────

window.portfolioAnimation={duration:70,poster:1,reset(){},async advance(seconds){draw(seconds);},draw(){}};