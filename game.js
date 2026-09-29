(()=>{'use strict';
const G=GameKit,$=id=>document.getElementById(id),store=G.create('monsoon-traders'),MAX_TURNS=60;
const PORTS=[
 {name:'East Gate',x:82,y:60},{name:'Ember Point',x:72,y:70},
 {name:'Pearl Bay',x:59,y:78},{name:'Salt Quay',x:44,y:84},
 {name:'Coral Key',x:30,y:80},{name:'Amber Cove',x:18,y:70},
 {name:'West Gate',x:18,y:36},{name:'Storm Cape',x:30,y:24},
 {name:'Moonport',x:44,y:18},{name:'Spice Isle',x:59,y:22},
 {name:'Cedar Bay',x:72,y:29},{name:'North Gate',x:82,y:38}
];
let match=null,mode='ai',screen='menu',animating=false,skipRequested=false,animationToken=0;
const reduceMotion=()=>window.matchMedia?.('(prefers-reduced-motion: reduce)').matches||false;
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const shipSVG='<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M5 27h30l-5 7H11zM18 5h2v21h-2zM22 8v16h11zM16 12v12H8z"/></svg>';
const posStyle=(x,y)=>`--x:${x}%;--y:${y}%`;
const routePath='M '+PORTS.map(p=>`${p.x*10} ${p.y*6.5}`).join(' L ')+' Z';
function leave(){if(match&&screen==='play'&&!match.over){if(!confirm('Leave this match? It will not be recorded.'))return false}animationToken++;animating=false;match=null;return true}
function shell(body){
 $('app').innerHTML=`<header class="mast"><div><p class="eyebrow">A game of shifting winds</p><h1 class="brand">Monsoon Traders</h1><p class="tagline">Two merchant fleets. Twelve ports. A wind that changes everything.</p></div><div class="mast-actions"><button id="nav-home">Home</button><button id="nav-records">Records</button><button id="nav-profiles">Profiles</button></div></header>${body}<p class="footer">Monsoon Traders · A fictional spice coast · Export profiles to keep your record</p>`;
 $('nav-home').onclick=()=>{if(leave())menu()};
 $('nav-records').onclick=()=>{if(leave()){screen='records';shell(G.recordsHTML(store).replace('Fight record','Trade record'))}};
 $('nav-profiles').onclick=()=>{if(leave())profiles()};
}
function profiles(){screen='profiles';shell(G.profilesHTML(store));G.wireProfiles(store,profiles)}
function menu(){screen='menu';shell(`<section class="panel"><p class="eyebrow">The spice coast</p><h2>Read the wind before you sail.</h2><p class="lead">Each fleet owns six ports around a sheltered sea. Move every crate from one of your ports along the coastal route. Bank cargo at your harbor, seize an opposite port, or fulfill a marked contract. Every four voyages, the wind reverses.</p><div class="button-row"><button class="primary" id="solo">Trade against the computer</button><button id="local">Local two-player</button></div></section><section class="panel"><h2>Rules of the coast</h2><div class="rules"><article><b>1 · Choose a port</b><p>Tap a highlighted port on your shore. A ship carries its crates to the next stops in wind direction, one per stop. The moving ship shows the route.</p></article><article><b>2 · Bank and capture</b><p>Cross your harbor gate to bank a crate. Land the last crate in your empty port to take the cargo opposite. A last crate in the harbor earns another voyage.</p></article><article><b>3 · Watch the forecast</b><p>The wind reverses every four voyages. Land at your ★ contract port for two coins. Play ends when one shore empties or after sixty voyages.</p></article></div></section>${G.recordsHTML(store).replace('Fight record','Recent voyages')}`);$('solo').onclick=()=>setup('ai');$('local').onclick=()=>setup('local')}
function setup(m){mode=m;screen='setup';const opts=store.profiles().filter(p=>p.id!==store.active().id);shell(`<section class="panel"><p class="eyebrow">Trade charter</p><h2>${m==='ai'?'Face the harbor master':'Choose a rival'}</h2><p class="muted">${m==='ai'?'Your amber fleet owns the southern shore. The computer commands the teal northern ports.':'Each merchant needs a separate local profile. Both fleets and their cargo are visible on the shared chart.'}</p>${m==='local'?`<div class="formline"><label>Amber fleet: ${G.esc(store.active().name)}</label><label>Teal fleet<select id="second"><option value="">Choose a profile</option>${opts.map(p=>`<option value="${G.esc(p.id)}">${G.esc(p.name)}</option>`).join('')}</select></label></div>${opts.length?'':'<p class="notice">Create a second profile before starting.</p>'}`:''}<div class="button-row"><button class="primary" id="begin" ${m==='local'&&!opts.length?'disabled':''}>Begin voyage</button><button id="back">Back</button></div></section>`);$('back').onclick=menu;$('begin').onclick=()=>{const second=m==='local'?$('second').value:null;if(m==='local'&&!second){alert('Choose a second profile.');return}match={pits:Array(12).fill(4),scores:[0,0],turn:0,plies:0,wind:1,contract:[2,9],log:[],players:[store.active().id,second],over:false};screen='play';play()}}
function owned(i,p){return p===0?i>=0&&i<6:i>=6&&i<12}
function sideEmpty(s,p){return s.pits.slice(p*6,p*6+6).every(n=>n===0)}
function contractFor(p,phase){return p*6+((2+phase)%6)}
function legal(s,p){return Array.from({length:6},(_,i)=>p*6+i).filter(i=>s.pits[i]>0)}
function clone(s){return{...s,pits:s.pits.slice(),scores:s.scores.slice(),contract:s.contract.slice(),log:s.log.slice()}}
function playerName(s,p){const id=s.players[p];return id?store.profiles().find(x=>x.id===id)?.name||'Merchant':'Harbor master'}
function gatePosition(p,wind){if(p===0)return wind===1?{x:7,y:66}:{x:93,y:66};return wind===1?{x:93,y:34}:{x:7,y:34}}
function step(s,p,i){
 if(!owned(i,p)||s.pits[i]<1)throw Error('Choose one of your occupied ports.');
 const out=clone(s),n=out.pits[i],stops=[];out.pits[i]=0;
 let pos=i,lastStore=false,landed=-1,remaining=n,justLeftStore=false;
 while(remaining){
   const boundary=p===0?(out.wind===1?5:0):(out.wind===1?11:6);
   if(pos===boundary&&!justLeftStore){out.scores[p]++;stops.push({kind:'harbor',player:p});remaining--;lastStore=true;landed=-1;justLeftStore=true;continue}
   pos=(pos+out.wind+12)%12;out.pits[pos]++;stops.push({kind:'port',index:pos});remaining--;lastStore=false;landed=pos;justLeftStore=false;
 }
 let captured=0,bonus=0;
 if(landed>=0&&owned(landed,p)){
   if(out.pits[landed]===1){const opposite=11-landed;if(out.pits[opposite]){captured=out.pits[opposite]+1;out.scores[p]+=captured;out.pits[opposite]=0;out.pits[landed]=0}}
   if(landed===out.contract[p]){bonus=2;out.scores[p]+=bonus}
 }
 out.plies++;const ended=sideEmpty(out,0)||sideEmpty(out,1)||out.plies>=MAX_TURNS;
 if(ended){for(let k=0;k<12;k++){out.scores[k<6?0:1]+=out.pits[k];out.pits[k]=0}out.over=true}
 else{if(out.plies%4===0){out.wind*=-1;const phase=out.plies/4;out.contract=[contractFor(0,phase),contractFor(1,phase)]}out.turn=lastStore?p:1-p}
 const detail=`${n} crate${n===1?'':'s'} from ${PORTS[i].name}${captured?`; captured ${captured}`:''}${bonus?'; contract +2':''}${lastStore&&!ended?'; sails again':''}${!ended&&out.plies%4===0?'; wind reversed':''}.`;
 out.log.push(`${s.plies+1}. ${playerName(s,p)} sailed ${detail}`);
 out.voyage={source:i,player:p,wind:s.wind,stops,captured,bonus,extra:lastStore&&!ended};
 return out;
}
function mapArt(s){return `<svg class="chart-art" viewBox="0 0 1000 650" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="sea" x2="1" y2="1"><stop stop-color="#2c6070"/><stop offset="1" stop-color="#153949"/></linearGradient></defs><rect width="1000" height="650" fill="url(#sea)"/><path class="shoal" d="M0 70Q130 25 230 60T440 40Q660 0 890 65L1000 10V0H0zM0 520Q190 605 380 585T750 605Q900 575 1000 535V650H0z"/><path class="land" d="M0 0h1000v52Q870 25 750 66Q630 86 510 65Q360 70 250 105Q120 110 0 94zM0 650h1000v-66Q850 610 745 575Q590 610 490 583Q360 598 260 556Q120 560 0 600zM0 0v650h48Q75 500 73 405Q60 290 85 205L55 0zM1000 0v650h-50Q925 520 930 406Q950 285 918 190L950 0z"/><path class="island" d="M380 302q35-22 69 5l-10 36-41 8-29-22zM595 395q22-19 52-3l-4 27-36 15-25-14zM500 210q12-10 23 2l-2 15-22 4z"/><path class="contour" d="M70 130Q300 170 490 115T930 138M70 520Q330 475 500 538T930 508"/><path class="route" d="${routePath}"/><path class="wind-flow" d="M180 325 C320 180 680 180 820 325"/><path class="wind-flow" d="M820 370 C680 510 320 510 180 370"/></svg>`}
function fleetAt(p,i){const x=p.x+(50-p.x)*.23,y=p.y+(50-p.y)*.23;return `<span class="fleet ${i<6?'south':'north'}" style="${posStyle(x,y)}" aria-hidden="true">${shipSVG}</span>`}
function boardHTML(){
 const s=match,canPlay=!(mode==='ai'&&s.turn===1)&&!animating;
 const ports=PORTS.map((p,i)=>{const available=!s.over&&canPlay&&owned(i,s.turn)&&s.pits[i]>0,contract=s.contract.includes(i);return `<button class="port ${i<6?'south':'north'} ${available?'available':''} ${contract?'contract':''}" style="${posStyle(p.x,p.y)}" data-port="${i}" ${available?'':'disabled'} aria-label="${p.name}, port ${i+1}, ${s.pits[i]} crates, ${i<6?'amber':'teal'} fleet${contract?', contract port, two bonus coins':''}"><span class="port-no">${i+1}</span><small>${G.esc(p.name)}</small><strong class="port-count">${s.pits[i]}</strong>${contract?'<em>★ +2</em>':''}</button>`}).join('');
 const fleets=PORTS.map(fleetAt).join('');
 const gates=[0,1].map(p=>{const q=gatePosition(p,s.wind);return `<span class="bank-gate ${p?'north':'south'}" style="${posStyle(q.x,q.y)}" title="${p?'Teal':'Amber'} harbor gate" aria-hidden="true">BANK</span>`}).join('');
 return `<div class="chart ${s.wind===-1?'reverse':''}" id="chart" role="group" aria-label="Fictional spice coast, twelve ports on a clockwise route">${mapArt(s)}<div class="map-title">The Spice Coast<small>Fictional sea chart</small></div>${ports}${fleets}${gates}<span id="voyage-ship" class="fleet travel ${s.turn?'north':'south'}" style="${posStyle(50,50)}" hidden aria-hidden="true">${shipSVG}</span></div>`;
}
function play(){
 screen='play';const s=match,p=s.turn,next=4-s.plies%4,who=playerName(s,p);
 shell(`<section class="panel"><div class="spread"><div><p class="eyebrow">Voyage ${s.plies+1} of ${MAX_TURNS}</p><h2>${G.esc(who)} sails next</h2><p class="muted">Tap a glowing ${p?'teal':'amber'} port to move all its crates. Numbered ports follow the route; ★ marks this season's contract.</p></div></div><div class="chart-head"><div class="wind-status"><b>${s.wind===1?'↻':'↺'}</b><span>Wind ${s.wind===1?'clockwise':'counterclockwise'}<small>Reverses in ${next} voyage${next===1?'':'s'}</small></span></div><span class="ship-note">Ship icons show each fleet's ports; harbor gates move with the wind.</span></div>${boardHTML()}<div class="harbors"><div class="harbor-card"><div><strong>Amber harbor</strong><span>${G.esc(playerName(s,0))}</span></div><b class="score" data-harbor="0">${s.scores[0]}</b></div><div class="harbor-card north"><div><strong>Teal harbor</strong><span>${G.esc(playerName(s,1))}</span></div><b class="score" data-harbor="1">${s.scores[1]}</b></div></div><div id="voyage-status" class="voyage-status" role="status" aria-live="polite">Choose one of your glowing ports. The ship will show every cargo stop.</div><div class="map-legend"><span>Amber fleet (ports 1–6)</span><span>Teal fleet (ports 7–12)</span><span>★ contract: +2</span></div></section><section class="panel"><h3>Voyage log</h3><ol class="log">${s.log.slice(-10).reverse().map(x=>`<li>${G.esc(x)}</li>`).join('')}</ol></section>`);
 document.querySelectorAll('[data-port]').forEach(b=>b.onclick=()=>turn(+b.dataset.port));
 if(mode==='ai'&&p===1)setTimeout(ai,420);
}
function updateVisual(pits,scores){for(let i=0;i<12;i++){const b=document.querySelector(`[data-port="${i}"] .port-count`);if(b)b.textContent=pits[i]}for(let p=0;p<2;p++){const b=document.querySelector(`[data-harbor="${p}"]`);if(b)b.textContent=scores[p]}}
async function animateVoyage(before,after,token){
 const v=after.voyage,ship=$('voyage-ship'),status=$('voyage-status'),pits=before.pits.slice(),scores=before.scores.slice(),source=PORTS[v.source];
 const reduced=reduceMotion();pits[v.source]=0;updateVisual(pits,scores);
 ship.hidden=false;ship.style.left=source.x+'%';ship.style.top=source.y+'%';
 status.innerHTML=`<strong>${G.esc(playerName(before,v.player))}</strong> launches ${v.stops.length} crate${v.stops.length===1?'':'s'} from ${source.name}.`;
 await pause(reduced?0:220);
 for(let j=0;j<v.stops.length;j++){
   if(token!==animationToken||screen!=='play')return false;
   const stop=v.stops[j],target=stop.kind==='port'?PORTS[stop.index]:gatePosition(v.player,v.wind);
   ship.style.left=target.x+'%';ship.style.top=target.y+'%';
   if(stop.kind==='port'){pits[stop.index]++;status.innerHTML=`Crate ${j+1}/${v.stops.length} → <strong>${PORTS[stop.index].name}</strong> (port ${stop.index+1}).`}
   else{scores[v.player]++;status.innerHTML=`Crate ${j+1}/${v.stops.length} → <strong>${v.player?'Teal':'Amber'} harbor</strong>. Cargo banked.`}
   updateVisual(pits,scores);
   await pause(reduced||skipRequested?0:155);
 }
 if(token!==animationToken||screen!=='play')return false;
 updateVisual(after.pits,after.scores);ship.hidden=true;
 const news=[v.captured?`Captured ${v.captured} crates.`:'',v.bonus?'Contract fulfilled: +2 coins.':'',v.extra?'Last crate reached the harbor: sail again.':'',after.wind!==before.wind?'The wind has reversed.':''].filter(Boolean).join(' ');
 status.innerHTML=`<strong>Voyage complete.</strong> ${G.esc(news||'Cargo delivered along the coast.')}`;
 await pause(reduced||skipRequested?250:800);
 return token===animationToken&&screen==='play';
}
async function sail(i){
 if(!match||animating||match.over||!owned(i,match.turn)||!match.pits[i]||(mode==='ai'&&match.turn===1))return;
 const before=match,old=before.turn,afterState=step(before,old,i),token=++animationToken;
 animating=true;skipRequested=false;
 document.querySelectorAll('[data-port]').forEach(b=>b.disabled=true);
 const status=$('voyage-status'),skip=document.createElement('button');skip.className='skip';skip.type='button';skip.textContent='Skip animation';skip.onclick=()=>{skipRequested=true};status.after(skip);
 const completed=await animateVoyage(before,afterState,token);
 if(!completed)return;
 skip.remove();match=afterState;animating=false;after(old);
}
function turn(i){sail(i)}
function after(old){if(match.over){finish();return}if(mode==='local'){const next=match.turn;document.getElementById('app').innerHTML='';G.handoff(playerName(match,next),next===old?'Your final crate reached home. Take another turn.':'Take the device and plan your next voyage.',play)}else play()}
function ai(){if(!match||match.over||match.turn!==1||screen!=='play'||animating)return;const choices=legal(match,1);let best=choices[0],value=-Infinity;for(const i of choices){const test=step(match,1,i);const score=(test.scores[1]-match.scores[1])*2+(test.over?(test.scores[1]-test.scores[0])*10:0)+(test.turn===1?2:0)+Math.random()*1.5;if(score>value){value=score;best=i}}const before=match,afterState=step(before,1,best),token=++animationToken;animating=true;skipRequested=false;animateVoyage(before,afterState,token).then(completed=>{if(!completed)return;match=afterState;animating=false;after(1)})}
function finish(){screen='result';const s=match,w=s.scores[0]===s.scores[1]?-1:s.scores[0]>s.scores[1]?0:1,winId=w<0?null:s.players[w];store.record(s.players,winId,mode==='ai'?'Solo':'Local two-player',s.log,`${s.scores[0]}–${s.scores[1]} coins.`);shell(`<section class="panel"><p class="eyebrow">Trade season complete</p><h2>${w<0?'The harbors are tied.':`${G.esc(playerName(s,w))} claims the coast.`}</h2><p class="lead">${G.esc(playerName(s,0))}: ${s.scores[0]} coins · ${G.esc(playerName(s,1))}: ${s.scores[1]} coins.</p><div class="button-row"><button class="primary" id="again">Trade again</button><button id="home">Home</button></div></section><section class="panel"><h3>Voyage record</h3><ol class="log">${s.log.map(x=>`<li>${G.esc(x)}</li>`).join('')}</ol></section>`);$('again').onclick=()=>setup(mode);$('home').onclick=menu}
menu();
})();
