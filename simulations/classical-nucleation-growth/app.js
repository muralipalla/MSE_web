
'use strict';
/*
 CLASSICAL NUCLEATION & GROWTH LAB
 Self-contained, intentionally dependency-free. Physics and the stochastic core
 are independent of canvases, refresh rate and the volume quadrature.
 rates(): SI thermodynamics and kinetic closures.
 Experiment: exact exponential candidate times + continuous 3D thinning.
 ArrivalMaps: first arrival on a 2D section and a 3D quadrature.
 The closures and the default material follow the earlier CNT lab specification;
 this version provides a new standalone UI and explicit numerical safeguards.
*/
const KB=1.380649e-23, NA=6.02214076e23, RG=KB*NA, LN10=Math.LN10;
const $=id=>document.getElementById(id);
const clamp=(x,lo,hi)=>Math.max(lo,Math.min(hi,x));
const DEFAULTS={T:540,Tm:1000,H:10,gamma:0.140,logD0:-7,Q:80,Vm:10,a:0.30,L:1,speed:-2.7,seed:17};
const COLORS={text:'#2e2a74',muted:'#69648d',grid:'#ded8eb',teal:'#176f67',gold:'#c47b19',pink:'#6757a8',blue:'#386694',liquid:[247,244,251]};
const SPECS=[
 {key:'Tm',label:'Equilibrium temperature Tₘ',unit:'K',min:500,max:2000,step:10,dec:0},
 {key:'gamma',label:'Interfacial energy γ',unit:'J m⁻²',min:.04,max:.35,step:.001,dec:3},
 {key:'H',label:'Fusion enthalpy ΔHf',unit:'kJ mol⁻¹',min:2,max:30,step:.1,dec:1},
 {key:'logD0',label:'Diffusion prefactor log₁₀D₀',unit:'D₀ in m² s⁻¹',min:-10,max:-4,step:.1,dec:1},
 {key:'Q',label:'Activation energy QD',unit:'kJ mol⁻¹',min:10,max:180,step:1,dec:0},
 {key:'Vm',label:'Molar volume Vₘ',unit:'cm³ mol⁻¹',min:4,max:30,step:.1,dec:1,advanced:true},
 {key:'a',label:'Atomic jump distance λ',unit:'nm',min:.15,max:.60,step:.01,dec:2,advanced:true},
 {key:'L',label:'Cube side L',unit:'μm',min:.1,max:5,step:.1,dec:1,advanced:true}
];
function toSI(ui){return {T:ui.T,Tm:ui.Tm,H:ui.H*1000,gamma:ui.gamma,D0:10**ui.logD0,Q:ui.Q*1000,Vm:ui.Vm*1e-6,a:ui.a*1e-9,L:ui.L*1e-6};}
function expSafe(logx){return logx < -745 ? 0 : logx > 709 ? Infinity : Math.exp(logx);}
function rates(p,T=p.T){
 if(![T,p.Tm,p.H,p.gamma,p.D0,p.Vm,p.a,p.L].every(v=>Number.isFinite(v)&&v>0)||!Number.isFinite(p.Q)||p.Q<0)throw new RangeError('Finite positive SI parameters and a nonnegative activation energy are required.');
 const logD=Math.log(p.D0)-p.Q/(RG*T), D=expSafe(logD),dg=p.H*(1-T/p.Tm),omega=p.Vm/NA;
 if(dg<=0)return {T,D,logD,dg,dgv:dg/p.Vm,omega,mu:dg/NA,J:0,logJ:-Infinity,u:0,logu:-Infinity,r:Infinity,G:Infinity,B:Infinity,n:Infinity,Z:0,fplus:0,logfplus:-Infinity};
 const dgv=dg/p.Vm,mu=dg/NA,r=2*p.gamma/dgv,G=16*Math.PI*p.gamma**3/(3*dgv*dgv),B=G/(KB*T),n=(4*Math.PI/3)*r**3/omega;
 const Z=Math.sqrt(mu/(6*Math.PI*KB*T*n));
 const logfplus=Math.log(24)+logD+(2/3)*Math.log(n)-2*Math.log(p.a);
 const logJ=-Math.log(omega)+Math.log(Z)+logfplus-B;
 const drive=-Math.expm1(-dg/(RG*T));
 const logu=Math.log(6)+logD-Math.log(p.a)+Math.log(drive);
 return {T,D,logD,dg,dgv,omega,mu,r,G,B,n,Z,logfplus,fplus:expSafe(logfplus),logJ,J:expSafe(logJ),logu,u:expSafe(logu)};
}
// A separate, seeded random stream belongs exclusively to physical events.
function mulberry32(seed){let a=seed>>>0;return ()=>{a=(a+0x6D2B79F5)|0;let t=Math.imul(a^(a>>>15),1|a);t^=t+Math.imul(t^(t>>>7),61|t);return ((t^(t>>>14))>>>0)/4294967296;};}
function expHazard(random){return -Math.log((Math.floor(random()*4294967296)+.5)/4294967296);}
function periodicDelta(a,b){const d=Math.abs(a-b)%1;return Math.min(d,1-d);}
function colorFor(id){const h=((id*137.508+12)%360)/60,s=.47,l=.61,c=(1-Math.abs(2*l-1))*s,x=c*(1-Math.abs(h%2-1)),m=l-c/2;const v=h<1?[c,x,0]:h<2?[x,c,0]:h<3?[0,c,x]:h<4?[0,x,c]:h<5?[x,0,c]:[c,0,x];return v.map(q=>Math.round(255*(q+m)));}
class Experiment{
 constructor(p,seed=17){this.p={...p};this.rates=rates(p);this.seed=seed>>>0;this.random=mulberry32(this.seed);this.t=0;this.s=0;this.hazard=expHazard(this.random);this.grains=[];this.proposals=0;this.rejected=0;this.spontaneous=0;this.manual=0;this.maxGrains=2000;this.stopped='';this.onBirth=null;this.limited=false;}
 contains(x,y,z){for(const g of this.grains){const dx=periodicDelta(x,g.x),dy=periodicDelta(y,g.y),dz=periodicDelta(z,g.z),r=g.r0+this.s-g.s0;if(dx*dx+dy*dy+dz*dz<=r*r)return true;}return false;}
 add(x,y,z,manual=false){
  if(![x,y,z].every(Number.isFinite))throw new RangeError('Finite birth coordinates required.');
  x=((x%1)+1)%1;y=((y%1)+1)%1;z=((z%1)+1)%1;
  if(this.rates.dg<=0||this.contains(x,y,z))return false;
  if(this.grains.length>=this.maxGrains){this.stopped='Safety pause: '+this.maxGrains.toLocaleString()+' nuclei. Reduce L or the nucleation rate. No physical rate has been rescaled.';return false;}
  const id=this.grains.length+1,g={id,x,y,z,t:this.t,s0:this.s,r0:1.05*this.rates.r/this.p.L,manual,color:colorFor(id)};
  this.grains.push(g);if(manual)this.manual++;else this.spontaneous++;if(this.onBirth)this.onBirth(g);
  if(this.grains.length>=this.maxGrains)this.stopped='Safety pause: '+this.maxGrains.toLocaleString()+' nuclei retained. Restart with a smaller sample or lower nucleation rate.';
  return true;
 }
 advance(dt,budget=60){
  if(!(Number.isFinite(dt)&&dt>=0))throw new RangeError('Time increment must be finite and nonnegative.');
  if(this.stopped)return 0;
  let remain=dt,done=0,events=0;
  const rate=this.rates.J*this.p.L**3,speed=this.rates.u/this.p.L;
  this.limited=false;
  if(!Number.isFinite(rate)||!Number.isFinite(speed)){this.stopped='Numerical range exceeded. Reduce extreme material parameters.';return 0;}
  while(remain>0){
   if(events>=budget){this.limited=true;break;}
   const wait=rate>0?this.hazard/rate:Infinity;
   const jump=Math.min(wait,remain);
   if(this.t+jump===this.t && jump>0){this.stopped='Time increment is below floating-point precision at this clock time. Restart or increase the clock increment.';break;}
   if(!Number.isFinite(this.s+speed*jump)||!Number.isFinite(this.t+jump)){this.stopped='Numerical clock range exceeded.';break;}
   this.t+=jump;this.s+=speed*jump;done+=jump;remain=Math.max(0,remain-jump);
   if(wait>jump){if(rate>0)this.hazard=Math.max(0,this.hazard-rate*jump);break;}
   this.proposals++;events++;
   const x=this.random(),y=this.random(),z=this.random();
   if(this.contains(x,y,z))this.rejected++;else this.add(x,y,z,false);
   this.hazard=expHazard(this.random);
   if(this.stopped)break;
  }
  return done;
 }
}
const RES=320,VRES=40,VCOUNT=VRES**3;
class ArrivalMaps{
 constructor(z=.5){this.z=z;this.arrival=new Float64Array(RES*RES);this.owner=new Uint16Array(RES*RES);this.volume=new Float64Array(VCOUNT);this.clear();}
 clear(){this.arrival.fill(Infinity);this.owner.fill(0);this.volume.fill(Infinity);}
 addSection(g){
  const dz=periodicDelta(this.z,g.z),dz2=dz*dz,dx2=new Float64Array(RES);
  for(let i=0;i<RES;i++)dx2[i]=periodicDelta((i+.5)/RES,g.x)**2;
  for(let j=0;j<RES;j++){const dy2=periodicDelta((j+.5)/RES,g.y)**2;
   for(let i=0;i<RES;i++){const k=j*RES+i,hit=g.s0+Math.max(0,Math.sqrt(dx2[i]+dy2+dz2)-g.r0);if(hit<this.arrival[k]){this.arrival[k]=hit;this.owner[k]=g.id;}}
  }
 }
 addVolume(g){
  const dx2=new Float64Array(VRES),dy2=new Float64Array(VRES),dz2=new Float64Array(VRES);
  for(let i=0;i<VRES;i++){const c=(i+.5)/VRES;dx2[i]=periodicDelta(c,g.x)**2;dy2[i]=periodicDelta(c,g.y)**2;dz2[i]=periodicDelta(c,g.z)**2;}
  let idx=0;for(let k=0;k<VRES;k++)for(let j=0;j<VRES;j++){const d=dy2[j]+dz2[k];for(let i=0;i<VRES;i++,idx++){const hit=g.s0+Math.max(0,Math.sqrt(dx2[i]+d)-g.r0);if(hit<this.volume[idx])this.volume[idx]=hit;}}
 }
 add(g){this.addSection(g);this.addVolume(g);}
 setSection(z,grains){this.z=z;this.arrival.fill(Infinity);this.owner.fill(0);for(const g of grains)this.addSection(g);}
 fraction(s){let n=0;for(const hit of this.volume)if(hit<=s)n++;return n/VCOUNT;}
}
let ui={...DEFAULTS},p=toSI(ui),current=rates(p),sim, maps=new ArrivalMaps(),running=false,dirty=true,plotsDirty=true,kineticsDirty=true,history=[],curve=[],X=0;
let lastFrame=0,lastDraw=0,lastPlot=0,lastHistory=0,toastTimer=0,cubeYaw=-.66,cubePitch=.40;
let visibleSectionCount=0,sectionFraction=0;
const offscreen=document.createElement('canvas');offscreen.width=RES;offscreen.height=RES;
const offctx=offscreen.getContext('2d'),image=new ImageData(RES,RES);
function sci(x,digits=2){
 if(x===Infinity)return '∞';if(x===-Infinity)return '−∞';if(!Number.isFinite(x))return '—';if(x===0)return '0';
 const abs=Math.abs(x);if(abs>=.01&&abs<10000)return Number(x.toPrecision(digits+1)).toLocaleString('en-US',{maximumSignificantDigits:digits+1});
 const e=Math.floor(Math.log10(abs));return (x/10**e).toFixed(digits)+' × 10'+sup(e);
}
function sup(x){const m={'-':'⁻','0':'⁰','1':'¹','2':'²','3':'³','4':'⁴','5':'⁵','6':'⁶','7':'⁷','8':'⁸','9':'⁹','+':'⁺'};return String(x).split('').map(c=>m[c]||c).join('');}
function fromLog(logx){if(logx===-Infinity)return '0';if(logx===Infinity)return '∞';if(!Number.isFinite(logx))return '—';if(logx>-690&&logx<690)return sci(Math.exp(logx));const e=Math.floor(logx/LN10);return Math.exp(logx-e*LN10).toFixed(2)+' × 10'+sup(e);}
function timeLabel(t){if(t===0)return '0 s';if(!Number.isFinite(t))return '∞ s';if(t>=1&&t<10000)return sci(t)+' s';if(t>=1e-3&&t<1)return sci(t*1e3)+' ms';if(t>=1e-6&&t<1e-3)return sci(t*1e6)+' μs';if(t>=1e-9&&t<1e-6)return sci(t*1e9)+' ns';if(t>=1e-12&&t<1e-9)return sci(t*1e12)+' ps';return sci(t)+' s';}
function toast(text){$('toast').textContent=text;$('toast').style.display='block';clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').style.display='none',4500);}
function makeControls(){
 for(const spec of SPECS){const wrapper=document.createElement('div');wrapper.className='group';wrapper.innerHTML=`<div class="labelrow"><label for="${spec.key}R">${spec.label}</label><input type="number" id="${spec.key}N" min="${spec.min}" max="${spec.max}" step="${spec.step}" aria-label="${spec.label} (${spec.unit})"></div><input type="range" id="${spec.key}R" min="${spec.min}" max="${spec.max}" step="${spec.step}" aria-label="${spec.label}"><div class="unit">${spec.unit}</div>`;
  $(spec.advanced?'advancedControls':'materialControls').appendChild(wrapper);
  $(spec.key+'R').addEventListener('input',()=>setParameter(spec,Number($(spec.key+'R').value)));
  $(spec.key+'N').addEventListener('change',()=>{const raw=$(spec.key+'N').value;const value=Number(raw);if(raw.trim()===''||!Number.isFinite(value)){syncControls();toast('Enter a finite value within the displayed range.');return;}setParameter(spec,value);});
 }
}
function setParameter(spec,value){ui[spec.key]=Number(clamp(value,spec.min,spec.max).toFixed(spec.dec));if(spec.key==='Tm')ui.T=clamp(ui.T,Math.round(.18*ui.Tm),Math.round(1.05*ui.Tm));resetExperiment('Material changed — new isothermal experiment.');buildCurves();syncControls();}
function syncControls(){
 $('T').min=$('Tnumber').min=String(Math.round(.18*ui.Tm));$('T').max=$('Tnumber').max=String(Math.round(1.05*ui.Tm));$('T').value=$('Tnumber').value=String(ui.T);
 $('Tlarge').textContent=String(ui.T);$('deltaT').textContent='ΔT = '+(ui.Tm-ui.T).toFixed(0)+' K';$('reducedT').textContent='T/Tₘ = '+(ui.T/ui.Tm).toFixed(3);
 for(const spec of SPECS){$(spec.key+'R').value=String(ui[spec.key]);$(spec.key+'N').value=ui[spec.key].toFixed(spec.dec);}
 $('speed').value=String(ui.speed);$('speedLabel').textContent=sci(10**ui.speed);$('seed').value=String(ui.seed);
 document.querySelectorAll('[data-temp]').forEach(b=>b.classList.toggle('active',Math.abs(ui.T/ui.Tm-Number(b.dataset.temp))<.0006));
}
function setTemperature(value){if(!Number.isFinite(value)){syncControls();return;}ui.T=Math.round(clamp(value,.18*ui.Tm,1.05*ui.Tm));resetExperiment('Temperature changed — press Run for a new isothermal experiment.');syncControls();}
function resetExperiment(message='Ready — press Run to begin.'){
 running=false;p=toSI(ui);current=rates(p);sim=new Experiment(p,ui.seed);maps.clear();maps.z=Number($('slice').value);X=0;history=[{t:0,X:0,n:0,spontaneous:0,manual:0}];lastHistory=0;
 sim.onBirth=g=>{maps.add(g);dirty=true;};lastFrame=0;dirty=true;plotsDirty=true;$('runhint').textContent=message;updateReadouts();updateStats();
}
function buildCurves(){curve=[];const lo=.18*p.Tm,hi=1.05*p.Tm;for(let i=0;i<=420;i++)curve.push(rates(p,lo+(hi-lo)*i/420));plotsDirty=true;}
function updateReadouts(){
 const r=current;$('rStar').textContent=r.dg>0?sci(r.r*1e9):'—';$('barrierValue').textContent=r.dg>0?sci(r.B):'—';$('JValue').textContent=fromLog(r.logJ);$('uValue').textContent=fromLog(r.logu);$('DValue').textContent=fromLog(r.logD);$('nStar').textContent=r.dg>0?sci(r.n):'—';
 const logWait=-r.logJ-3*Math.log(p.L);
 $('waiting').textContent=r.dg>0?'Mean first-nucleus wait: '+(logWait<690?timeLabel(expSafe(logWait)):fromLog(logWait)+' s')+' · Cube: '+ui.L.toFixed(1)+' μm per side.':'T ≥ Tₘ: no forward solidification in this model.';
 const warnings=[];if(r.dg<=0)warnings.push('The model does not simulate melting. Choose T < Tₘ to nucleate and grow.');
 else{if(r.n<50)warnings.push('n* < 50: continuum capillarity is questionable. Interpret rates cautiously.');if(r.r/p.L>.025)warnings.push('The critical radius is significant relative to L: bulk CNT and finite seed insertion are poor approximations here.');if(r.logJ < -700||r.logu < -700)warnings.push('Extremely small rates: logarithmic values remain available, but the numerical clock may not resolve events.');if(r.B<3)warnings.push('A barrier of only a few kBT is outside the usual rare-event CNT regime.');}
 $('warnings').textContent=warnings.join(' ');$('testSeed').disabled=r.dg<=0;
}
function jmak(t,r=current){if(t<=0||!Number.isFinite(r.logJ)||!Number.isFinite(r.logu))return 0;const logY=Math.log(Math.PI/3)+r.logJ+3*r.logu+4*Math.log(t);return logY>5?1:-Math.expm1(-expSafe(logY));}
function updateStats(){
 $('time').textContent=timeLabel(sim.t);$('count').textContent=sim.grains.length.toLocaleString();$('fraction').textContent=(100*X).toFixed(1)+'%';$('progress').style.width=(100*X)+'%';
 const state=sim.stopped?'Paused':X>=.999?'Complete':running?'Running':sim.t===0?'Ready':'Paused';$('status').textContent=state;$('status').className='status'+(running?'':' paused');
 $('run').textContent=$('runMobile').textContent=running?'❚❚ Pause':'▶ Run';$('step').disabled=Boolean(sim.stopped)||X>=.999;
 $('eventCount').textContent=sim.spontaneous+' spontaneous · '+sim.manual+' test seeds';
 $('eventLog').innerHTML=sim.grains.length?sim.grains.slice(-5).reverse().map(g=>`<div><b>${g.manual?'Test seed':'Nucleus'} #${g.id}</b> at ${timeLabel(g.t)} · (x,y,z)/L = (${g.x.toFixed(2)}, ${g.y.toFixed(2)}, ${g.z.toFixed(2)})</div>`).join(''):'<div>No successful nucleation events yet.</div>';
 if(sim.stopped)$('runhint').textContent=sim.stopped;
 else if(X>=.999)$('runhint').textContent='Paused at ≥99.9% sampled volume transformation. Small unsampled liquid pockets can remain.';
 else if(sim.limited)$('runhint').textContent='Event-limited clock: the browser is advancing physical time more slowly. J and u are unchanged.';
 else if(sim.grains.length)$('runhint').textContent=visibleSectionCount+' grains intersect this section · '+(sectionFraction*100).toFixed(1)+'% section area · '+sim.grains.length+' nuclei in the full cube. Grain identities remain fixed at impingement.';
 else if(running)$('runhint').textContent='Waiting for a spontaneous event. The first-nucleus mean waiting time is shown in the physics panel.';
}
function sampleHistory(force=false){
 const last=history[history.length-1];if(!force&&last&&last.t===sim.t)return;
 kineticsDirty=true;const row={t:sim.t,X,n:sim.grains.length,spontaneous:sim.spontaneous,manual:sim.manual};if(last&&last.t===sim.t)history[history.length-1]=row;else history.push(row);
 if(history.length>4000){history=history.filter((_,i)=>i%2===0||i===history.length-1);}
}
// Device-pixel-ratio-aware plots. No external plotting package or font file.
function surface(canvas){const box=canvas.getBoundingClientRect(),w=Math.max(1,box.width),h=Math.max(1,box.height),dpr=Math.min(2,window.devicePixelRatio||1);const W=Math.round(w*dpr),H=Math.round(h*dpr);if(canvas.width!==W||canvas.height!==H){canvas.width=W;canvas.height=H;}const ctx=canvas.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);return {ctx,w,h};}
function axes(canvas,xmin,xmax,ymin,ymax,options={}){
 const {ctx,w,h}=surface(canvas),left=52,right=17,top=23,bottom=36;
 const pw=Math.max(1,w-left-right),ph=Math.max(1,h-top-bottom),px=x=>left+(x-xmin)/(xmax-xmin)*pw,py=y=>top+(ymax-y)/(ymax-ymin)*ph;
 ctx.font='10px system-ui';ctx.lineWidth=1;ctx.fillStyle=COLORS.muted;
 for(let i=0;i<=4;i++){const y=ymin+(ymax-ymin)*i/4,Y=py(y);ctx.strokeStyle=COLORS.grid;ctx.beginPath();ctx.moveTo(left,Y);ctx.lineTo(w-right,Y);ctx.stroke();ctx.textAlign='right';ctx.fillText((options.yFormat||tick)(y),left-8,Y+3);}
 for(let i=0;i<=4;i++){const x=xmin+(xmax-xmin)*i/4,Xp=px(x);ctx.textAlign='center';ctx.fillStyle=COLORS.muted;ctx.fillText((options.xFormat||tick)(x),Xp,h-bottom+16);}
 ctx.textAlign='left';ctx.fillStyle=COLORS.text;ctx.fillText(options.yLabel||'',left,13);
 ctx.textAlign='center';ctx.fillStyle=COLORS.muted;ctx.fillText(options.xLabel||'',left+pw/2,h-5);
 const clip=()=>{ctx.save();ctx.beginPath();ctx.rect(left,top,pw,ph);ctx.clip();};
 return {ctx,w,h,left,right,top,bottom,px,py,pw,ph,clip};
}
function tick(x){if(x===0)return '0';if(Math.abs(x)<.001||Math.abs(x)>=10000)return x.toExponential(1);return Number(x.toPrecision(3)).toString();}
function line(a,points,color,width=2,dash=[]){a.clip();a.ctx.strokeStyle=color;a.ctx.lineWidth=width;a.ctx.setLineDash(dash);a.ctx.beginPath();let open=false;for(const [x,y] of points){if(!Number.isFinite(x)||!Number.isFinite(y)){open=false;continue;}if(open)a.ctx.lineTo(a.px(x),a.py(y));else{a.ctx.moveTo(a.px(x),a.py(y));open=true;}}a.ctx.stroke();a.ctx.restore();}
function temperatureMarker(a,T,value,color){a.clip();a.ctx.setLineDash([3,4]);a.ctx.strokeStyle='#554f82';a.ctx.lineWidth=1;a.ctx.beginPath();a.ctx.moveTo(a.px(T),a.top);a.ctx.lineTo(a.px(T),a.top+a.ph);a.ctx.stroke();a.ctx.setLineDash([]);if(Number.isFinite(value)&&a.py(value)>=a.top&&a.py(value)<=a.top+a.ph){a.ctx.beginPath();a.ctx.arc(a.px(T),a.py(value),4,0,Math.PI*2);a.ctx.fillStyle=color;a.ctx.fill();a.ctx.strokeStyle='#09121e';a.ctx.stroke();}a.ctx.restore();}
function drawRate(which){
 const nuc=which==='J',key=nuc?'logJ':'logu',canvas=$(nuc?'nucleationPlot':'growthPlot'),color=nuc?COLORS.teal:COLORS.gold;
 const logs=curve.map(r=>r[key]).filter(Number.isFinite),max=Math.max(...logs),peak=curve.reduce((a,b)=>a[key]>b[key]?a:b),normal=$('rateScale').value==='normalized';
 const lo=.18*p.Tm,hi=1.05*p.Tm;let minY=0,maxY=1.08;
 if(!normal){maxY=Math.ceil(max/LN10/5)*5+1;minY=maxY-40;}
 const ylabel=normal?(nuc?'J / Jmax':'u / umax'):(nuc?'log₁₀[J / (m⁻³ s⁻¹)]':'log₁₀[u / (m s⁻¹)]');
 const a=axes(canvas,lo,hi,minY,maxY,{yLabel:ylabel,xLabel:'Temperature (K)',xFormat:v=>v.toFixed(0),yFormat:v=>normal?v.toFixed(1):v.toFixed(0)});
 const val=r=>normal?expSafe(r[key]-max):r[key]/LN10;
 line(a,curve.map(r=>[r.T,normal?val(r):Math.max(minY-1,val(r))]),color,2.3);
 temperatureMarker(a,p.T,val(current),color);
 const caption=normal?`Peak at ≈ ${peak.T.toFixed(0)} K · ${nuc?'Jmax':'umax'} = ${fromLog(max)} ${nuc?'m⁻³ s⁻¹':'m s⁻¹'}. Normalisation changes only the plot.`:`Absolute log scale; values more than 40 decades below the displayed upper limit are clipped. Current T = ${p.T.toFixed(0)} K.`;
 $(nuc?'nucleationCaption':'growthCaption').textContent=caption;
}
function drawBarrier(){
 const r=current;if(r.dg<=0){const {ctx,w,h}=surface($('barrierPlot'));ctx.fillStyle=COLORS.muted;ctx.font='12px system-ui';ctx.textAlign='center';ctx.fillText('No finite solidification barrier for T ≥ Tₘ.',w/2,h/2);return;}
 const rnm=r.r*1e9,B=r.B,xmax=1.75*rnm,ymin=-1.65*B,ymax=1.4*B;
 const a=axes($('barrierPlot'),0,xmax,ymin,ymax,{yLabel:'ΔG / (kBT)',xLabel:'Nucleus radius r (nm)',xFormat:v=>tick(v),yFormat:v=>tick(v)});
 const pts=[];for(let i=0;i<=180;i++){const q=1.75*i/180;pts.push([q*rnm,B*(3*q*q-2*q*q*q)]);}
 line(a,[[0,0],[xmax,0]],'#72859e',1);
 line(a,pts,COLORS.gold,2.5);
 line(a,[[rnm,ymin],[rnm,B],[0,B]],COLORS.blue,1,[4,4]);
 a.ctx.fillStyle=COLORS.gold;a.ctx.beginPath();a.ctx.arc(a.px(rnm),a.py(B),4,0,Math.PI*2);a.ctx.fill();a.ctx.font='10px system-ui';a.ctx.textAlign='left';a.ctx.fillText('r*',Math.min(a.px(rnm)+7,a.w-30),a.py(B)-8);
}
function drawKinetics(){
 let maxT=sim.t>0?sim.t*1.05:10**ui.speed*8;if(!Number.isFinite(maxT)||maxT<=0)maxT=1;
 let unit='s',scale=1;if(maxT<1&&maxT>=1e-3){unit='ms';scale=1e3;}else if(maxT<1e-3&&maxT>=1e-6){unit='μs';scale=1e6;}else if(maxT<1e-6&&maxT>=1e-9){unit='ns';scale=1e9;}else if(maxT<1e-9&&maxT>=1e-12){unit='ps';scale=1e12;}
 const a=axes($('kinetics'),0,maxT*scale,0,1,{yLabel:'Transformed volume fraction',xLabel:`Physical time (${unit})`,yFormat:v=>(100*v).toFixed(0)+'%'});
 if(sim.manual===0){const pts=[];for(let i=0;i<=150;i++){const t=maxT*i/150;pts.push([t*scale,jmak(t)]);}line(a,pts,COLORS.pink,1.5,[5,4]);}
 line(a,history.map(row=>[row.t*scale,row.X]).concat([[sim.t*scale,X]]),COLORS.teal,2.6);
 if(sim.t>0){a.ctx.beginPath();a.ctx.arc(a.px(sim.t*scale),a.py(X),3,0,Math.PI*2);a.ctx.fillStyle=COLORS.teal;a.ctx.fill();}
 if(sim.manual){a.ctx.font='11px system-ui';a.ctx.textAlign='right';a.ctx.fillStyle=COLORS.muted;a.ctx.fillText('Reference hidden: inserted test seed',a.w-18,14);}
}
function drawMicro(){
 const s=sim.s,owners=maps.owner,arrival=maps.arrival,seen=new Set();let filled=0;
 const boundary=$('boundaries').checked;
 for(let j=0;j<RES;j++)for(let i=0;i<RES;i++){
  const k=j*RES+i,idx=4*k,active=arrival[k]<=s,id=owners[k];let col=COLORS.liquid;
  if(active&&id){filled++;seen.add(id);col=sim.grains[id-1].color;
   if(boundary){const right=j*RES+(i+1)%RES,down=((j+1)%RES)*RES+i;if((arrival[right]<=s&&owners[right]!==id)||(arrival[down]<=s&&owners[down]!==id))col=[31,45,59];}
  }
  image.data[idx]=col[0];image.data[idx+1]=col[1];image.data[idx+2]=col[2];image.data[idx+3]=255;
 }
 visibleSectionCount=seen.size;sectionFraction=filled/(RES*RES);
 offctx.putImageData(image,0,0);
 const {ctx,w,h}=surface($('micro'));ctx.imageSmoothingEnabled=true;ctx.drawImage(offscreen,0,0,w,h);
 // A tiny unobtrusive grid is visible only in the liquid at the initial state.
 if(!sim.grains.length){ctx.strokeStyle='#26364c40';ctx.lineWidth=.5;for(let i=1;i<12;i++){ctx.beginPath();ctx.moveTo(i*w/12,0);ctx.lineTo(i*w/12,h);ctx.stroke();ctx.beginPath();ctx.moveTo(0,i*h/12);ctx.lineTo(w,i*h/12);ctx.stroke();}}
 const bar=.2*w,x=18,y=h-21;ctx.strokeStyle='#dce7f5';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+bar,y);ctx.moveTo(x,y-3);ctx.lineTo(x,y+3);ctx.moveTo(x+bar,y-3);ctx.lineTo(x+bar,y+3);ctx.stroke();ctx.font='11px system-ui';ctx.textAlign='left';ctx.fillStyle='#dce7f5';ctx.shadowColor='#000';ctx.shadowBlur=4;ctx.fillText(sci(.2*ui.L)+' μm',x,y-9);ctx.shadowBlur=0;
 if($('showCenters').checked){for(const g of sim.grains){if(periodicDelta(g.z,maps.z)>.02)continue;ctx.strokeStyle=g.manual?COLORS.gold:'#eff7ff';ctx.lineWidth=1;ctx.beginPath();ctx.arc(g.x*w,g.y*h,4,0,Math.PI*2);ctx.stroke();}ctx.fillStyle=COLORS.text;ctx.font='10px system-ui';ctx.textAlign='right';ctx.fillText('Markers: centres within ±0.02 L of section',w-10,h-9);}
 $('viewlabel').textContent='XY section · z/L = '+maps.z.toFixed(2);
 const empty=$('empty');empty.style.display=!filled?'block':'none';
 if(!filled){if(sim.grains.length)empty.innerHTML='<strong>'+sim.grains.length+' nuclei in the 3D sample</strong>None is resolved in this section yet. Growth or moving the section will reveal them.';else if(current.dg<=0)empty.innerHTML='<strong>No forward solidification</strong>T is at or above Tₘ. Lower the temperature to start a new experiment.';else if(running)empty.innerHTML='<strong>Waiting for the first nucleus</strong>Random waiting is physical. Check the mean waiting time or choose Fit clock.';else if(sim.t===0)empty.innerHTML='<strong>From a liquid to a microstructure</strong>Press Run. Each new grain begins with a stochastic nucleation event in the 3D sample.';else empty.innerHTML='<strong>Experiment paused</strong>No successful nucleus yet. Resume or adjust the physical clock.';}
}
function drawCube(){
 const {ctx,w,h}=surface($('cube')),scale=Math.min(w,h)*.55;
 const project=(x,y,z)=>{x-=.5;y-=.5;z-=.5;const xx=x*Math.cos(cubeYaw)-y*Math.sin(cubeYaw),yy=x*Math.sin(cubeYaw)+y*Math.cos(cubeYaw);return [w/2+scale*xx,h/2+scale*(yy*Math.sin(cubePitch)-z*Math.cos(cubePitch)),yy*Math.cos(cubePitch)+z*Math.sin(cubePitch)];};
 const verts=[];for(let z=0;z<=1;z++)for(let y=0;y<=1;y++)for(let x=0;x<=1;x++)verts.push(project(x,y,z));
 ctx.strokeStyle='#6d839c';ctx.lineWidth=1;for(let i=0;i<8;i++)for(const bit of [1,2,4]){const j=i^bit;if(j<i)continue;ctx.beginPath();ctx.moveTo(...verts[i].slice(0,2));ctx.lineTo(...verts[j].slice(0,2));ctx.stroke();}
 const plane=[[0,0,maps.z],[1,0,maps.z],[1,1,maps.z],[0,1,maps.z]].map(c=>project(...c));ctx.beginPath();plane.forEach((q,i)=>i?ctx.lineTo(q[0],q[1]):ctx.moveTo(q[0],q[1]));ctx.closePath();ctx.fillStyle='#70dfce24';ctx.fill();ctx.strokeStyle='#70dfcebb';ctx.stroke();
 const pts=sim.grains.map(g=>({g,q:project(g.x,g.y,g.z)})).sort((a,b)=>a.q[2]-b.q[2]);for(const {g,q} of pts){ctx.fillStyle='rgb('+g.color.join(',')+')';ctx.beginPath();ctx.arc(q[0],q[1],sim.grains.length>500?1.05:1.9,0,Math.PI*2);ctx.fill();}
 const top=project(0,0,1);ctx.fillStyle=COLORS.muted;ctx.font='9px system-ui';ctx.fillText('z',top[0]-7,top[1]-4);
}
function drawAll(){drawMicro();drawCube();X=maps.fraction(sim.s);updateStats();dirty=false;}
function performStep(dt,budget=60){const advanced=sim.advance(dt,budget);X=maps.fraction(sim.s);if(X>=.999||sim.stopped)running=false;sampleHistory();dirty=true;return advanced;}
function toggleRun(){if(sim.stopped){toast(sim.stopped);return;}if(X>=.999){toast('This sample is ≥99.9% transformed. Restart for another experiment.');return;}if(current.dg<=0){toast('Choose a temperature below Tₘ. This model does not simulate melting.');return;}running=!running;lastFrame=0;dirty=true;}
function fitClock(){
 if(current.dg<=0){toast('Choose T < Tₘ before fitting the clock.');return;}
 const logWait=-current.logJ-3*Math.log(p.L),logGrowth=Math.log(p.L)-current.logu;
 let logTime=sim.grains.length?logGrowth:Math.max(logWait,logGrowth);
 if(!Number.isFinite(logTime)){toast('The kinetic timescale is outside numerical range for these parameters.');return;}
 ui.speed=Number(clamp((logTime-Math.log(16))/LN10,-12,12).toFixed(1));syncControls();plotsDirty=true;
 toast('Clock set to '+sci(10**ui.speed)+' physical seconds per display second. J and u are unchanged.');
}
function insertTestSeed(){
 if(sim.stopped){toast('Restart the experiment before inserting another seed.');return;}if(current.dg<=0){toast('A supercritical solid seed requires T < Tₘ in this model.');return;}
 // Deterministic search avoids consuming the physical event random stream.
 let added=false;for(let i=0;i<257;i++){const x=i===0?.5:(.5+i*.61803398875)%1,y=i===0?.5:(.5+i*.41421356237)%1;if(sim.add(x,y,maps.z,true)){added=true;break;}}
 if(added){X=maps.fraction(sim.s);sampleHistory(true);dirty=true;plotsDirty=true;toast('One labelled test seed inserted. It is not counted as spontaneous nucleation.');}else toast('No untransformed centre found in this section. Try a different section or restart.');
}
function exportFile(name,text,type){const blob=new Blob([text],{type:type+';charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{a.remove();URL.revokeObjectURL(url);},1000);}
function exportData(){
 X=maps.fraction(sim.s);sampleHistory(true);
 const data={model:'Steady-state spherical homogeneous CNT + planar Wilson-Frenkel postcritical growth',version:'standalone-2026-09-10',parametersSI:sim.p,randomSeed:sim.seed,physicalTime_s:sim.t,rates:sim.rates,units:{T:'K',Tm:'K',H:'J/mol',gamma:'J/m^2',D0:'m^2/s',Q:'J/mol',Vm:'m^3/mol',a:'m',L:'m',J:'m^-3 s^-1',u:'m/s',r:'m',G:'J',n:'atoms',history_t:'s',events_xyz:'fractions of L',events_r0:'fraction of L',events_s0:'growth distance divided by L'},numerical:{sectionResolution:RES,volumeResolution:VRES,periodic:true,maxGrains:sim.maxGrains,stopAtSampledFraction:.999},proposals:sim.proposals,rejected:sim.rejected,spontaneous:sim.spontaneous,testSeeds:sim.manual,stoppingReason:sim.stopped,history,events:sim.grains.map(({color,...g})=>g),notes:['Illustrative uncalibrated material.','Subcritical clusters, transient lag and curvature-dependent growth are not resolved.','Finite initial radius r0=1.05*rCritical. A centre-only parent membership test is used.','First arrival fixes grain identity. X uses midpoint volume quadrature.','No independent display multiplier alters J or u. History is thinned if it exceeds 4000 records.']};
 exportFile('cnt_experiment.json',JSON.stringify(data,(_,v)=>typeof v==='number'&&!Number.isFinite(v)?String(v):v,2),'application/json');
}
function exportRates(){let text='T_K,J_m-3_s-1,log10_J,u_m_s-1,log10_u,D_m2_s-1,log10_D,rStar_m,barrier_J,barrier_kBT,nStar,Z,fplus_s-1\n';for(const r of curve)text+=[r.T,r.J,r.logJ/LN10,r.u,r.logu/LN10,r.D,r.logD/LN10,r.r,r.G,r.B,r.n,r.Z,r.fplus].join(',')+'\n';exportFile('cnt_temperature_rates.csv',text,'text/csv');}
function exportHistory(){X=maps.fraction(sim.s);sampleHistory(true);let text='time_s,volume_fraction,nuclei,spontaneous_nuclei,test_seeds,JMAK_point_seed_reference\n';for(const row of history)text+=[row.t,row.X,row.n,row.spontaneous,row.manual,sim.manual?'':jmak(row.t)].join(',')+'\n';exportFile('cnt_transformation_history.csv',text,'text/csv');}
function frame(now){
 const realDt=lastFrame?Math.min(.075,(now-lastFrame)/1000):0;lastFrame=now;
 if(running&&realDt>0)performStep(realDt*10**ui.speed,60);
 if((dirty||running)&&now-lastDraw>45){drawAll();lastDraw=now;}
 if(plotsDirty||((running||kineticsDirty)&&now-lastPlot>150)){if(plotsDirty){drawRate('J');drawRate('u');drawBarrier();}drawKinetics();lastPlot=now;plotsDirty=false;kineticsDirty=false;}
 requestAnimationFrame(frame);
}
makeControls();
$('T').addEventListener('input',()=>setTemperature(Number($('T').value)));
$('Tnumber').addEventListener('change',()=>{if($('Tnumber').value.trim()===''){syncControls();return;}setTemperature(Number($('Tnumber').value));});
for(const id of ['run','runMobile'])$(id).addEventListener('click',toggleRun);
for(const id of ['reset','resetMobile'])$(id).addEventListener('click',()=>resetExperiment('Restarted with the same random seed. Press Run.'));
$('step').addEventListener('click',()=>{running=false;performStep(.1*10**ui.speed,200);plotsDirty=true;});
$('fitClock').addEventListener('click',fitClock);
$('speed').addEventListener('input',()=>{ui.speed=Number($('speed').value);$('speedLabel').textContent=sci(10**ui.speed);plotsDirty=true;});
$('seed').addEventListener('change',()=>{const v=Number($('seed').value);ui.seed=Number.isFinite(v)?clamp(Math.round(v),0,4294967295):17;syncControls();resetExperiment('Random seed changed. Press Run for a new realization.');});
$('newSeed').addEventListener('click',()=>{let s;if(globalThis.crypto&&crypto.getRandomValues)s=crypto.getRandomValues(new Uint32Array(1))[0];else s=(Date.now()^Math.round(performance.now()*1000))>>>0;ui.seed=s;syncControls();resetExperiment('New random seed. Press Run.');});
$('testSeed').addEventListener('click',insertTestSeed);
$('defaults').addEventListener('click',()=>{ui={...DEFAULTS};$('slice').value='.5';$('sliceLabel').textContent='0.50';resetExperiment('Defaults restored: 540 K, 1 μm cube. Press Run.');buildCurves();syncControls();});
for(const b of document.querySelectorAll('[data-temp]'))b.addEventListener('click',()=>setTemperature(Number(b.dataset.temp)*ui.Tm));
$('slice').addEventListener('input',()=>{const z=Number($('slice').value);$('sliceLabel').textContent=z.toFixed(2);maps.setSection(z,sim.grains);dirty=true;});
for(const id of ['boundaries','showCenters'])$(id).addEventListener('change',()=>{dirty=true;});
$('rateScale').addEventListener('change',()=>{plotsDirty=true;});
for(const id of ['nucleationPlot','growthPlot']){const canvas=$(id);canvas.style.cursor='crosshair';canvas.addEventListener('click',e=>{const box=canvas.getBoundingClientRect(),f=clamp((e.clientX-box.left-52)/(box.width-69),0,1);setTemperature((.18+.87*f)*ui.Tm);});}
$('help').addEventListener('click',()=>{$('theoryDetails').open=true;$('theory').scrollIntoView({behavior:'smooth',block:'start'});});
$('exportData').addEventListener('click',exportData);
$('csvHistory').addEventListener('click',exportHistory);
const rateButton=document.createElement('button');rateButton.className='small secondary';rateButton.textContent='Export temperature curves · CSV';rateButton.style.marginTop='10px';rateButton.addEventListener('click',exportRates);$('warnings').parentNode.appendChild(rateButton);
let drag=null;$('cube').addEventListener('pointerdown',e=>{drag={x:e.clientX,y:e.clientY};$('cube').setPointerCapture(e.pointerId);});$('cube').addEventListener('pointermove',e=>{if(!drag)return;cubeYaw+=(e.clientX-drag.x)*.012;cubePitch=clamp(cubePitch+(e.clientY-drag.y)*.012,-1.3,1.3);drag={x:e.clientX,y:e.clientY};dirty=true;});for(const event of ['pointerup','pointercancel'])$('cube').addEventListener(event,()=>{drag=null;});
window.addEventListener('resize',()=>{dirty=true;plotsDirty=true;});document.addEventListener('visibilitychange',()=>{lastFrame=0;});
// Expose pure functions and the model for reproducibility and automated checks.
window.CNT={KB,NA,RG,rates,toSI,Experiment,ArrivalMaps,mulberry32,periodicDelta,jmak,defaults:()=>({...DEFAULTS}),getParameters:()=>({...p}),getRates:()=>({...current}),getState:()=>({t:sim.t,s:sim.s,n:sim.grains.length,X:maps.fraction(sim.s),running,proposals:sim.proposals,spontaneous:sim.spontaneous,manual:sim.manual,stopped:sim.stopped}),getSimulation:()=>sim,pause:()=>{running=false;dirty=true;},step:dt=>{running=false;const advanced=performStep(dt,10000);plotsDirty=true;return advanced;},setTemperature,render:()=>{drawAll();drawKinetics();},getHistory:()=>history.map(x=>({...x}))};
syncControls();resetExperiment();buildCurves();requestAnimationFrame(frame);

