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
let selectedOrder=null;
const ORDERS={blockade:{name:'Mercenary blockade',cost:2,desc:'Close a rival port for their next launch.',mark:'▣'},tailwind:{name:'Invoke Garuda',cost:1,desc:'Call on Garuda to reverse your sailing wind for one voyage.',mark:'↝'},guard:{name:"Naga's ward",cost:1,desc:'A serpent spirit shelters one port from a capture.',mark:'◈'},cargo:{name:'Spice caravan',cost:2,desc:'Add two crates to one of your ports.',mark:'✦'}};
const ORDER_IDS=Object.keys(ORDERS);
function random(s){s.rng=(Math.imul(s.rng,1664525)+1013904223)>>>0;return s.rng}
function draw(s,p){if(s.hands[p].length<3)s.hands[p].push(ORDER_IDS[random(s)%ORDER_IDS.length])}
function newMatch(second){const seed=(Math.random()*4294967296)>>>0,s={pits:Array(12).fill(4),scores:[0,0],turn:0,plies:0,wind:1,contract:[2,9],log:[],players:[store.active().id,second],over:false,seed,rng:seed,influence:[2,2],hands:[[],[]],blockades:[null,null],guards:[null,null],tailwind:[false,false],used:false,voyages:[0,0],markets:[]};s.markets=[random(s)%6,6+random(s)%6];for(let p=0;p<2;p++){draw(s,p);draw(s,p)}return s}
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
function menu(){screen='menu';shell(`<section class="panel"><p class="eyebrow">The spice coast</p><h2>Read the wind before you sail.</h2><p class="lead">Command a merchant fleet around a changing coast. Bank cargo, capture rivals, and time one order card per voyage. Every four voyages, the wind reverses.</p><p class="myth-note">On this fictional coast, sailors tell stories of Garuda in the sky and naga beneath the water. Their powers in the game are fantasy inspired by regional traditions.</p><div class="button-row"><button class="primary" id="solo">Trade against the computer</button><button id="local">Local two-player</button></div></section><section class="panel"><h2>Rules of the coast</h2><div class="rules"><article><b>1 · Choose a port</b><p>Move all crates from a glowing port, one per stop in the wind direction. Your harbor gate banks cargo and earns influence.</p></article><article><b>2 · Shape the voyage</b><p>Spend influence on one order before sailing. Mercenaries blockade a port; Garuda changes your sailing wind; a naga shelters cargo.</p></article><article><b>3 · Claim the season</b><p>Capture opposite cargo, land on a ★ contract for two coins, or visit your ✦ spice market for one. Draw a card after every third voyage of your fleet.</p></article></div></section>${G.recordsHTML(store).replace('Fight record','Recent voyages')}`);$('solo').onclick=()=>setup('ai');$('local').onclick=()=>setup('local')}
function setup(m){mode=m;screen='setup';const opts=store.profiles().filter(p=>p.id!==store.active().id);shell(`<section class="panel"><p class="eyebrow">Trade charter</p><h2>${m==='ai'?'Face the harbor master':'Choose a rival'}</h2><p class="muted">${m==='ai'?'Your amber fleet owns the southern shore. The computer commands the teal northern ports.':'Each merchant needs a separate local profile. Both fleets and their cargo are visible on the shared chart.'}</p>${m==='local'?`<div class="formline"><label>Amber fleet: ${G.esc(store.active().name)}</label><label>Teal fleet<select id="second"><option value="">Choose a profile</option>${opts.map(p=>`<option value="${G.esc(p.id)}">${G.esc(p.name)}</option>`).join('')}</select></label></div>${opts.length?'':'<p class="notice">Create a second profile before starting.</p>'}`:''}<div class="button-row"><button class="primary" id="begin" ${m==='local'&&!opts.length?'disabled':''}>Begin voyage</button><button id="back">Back</button></div></section>`);$('back').onclick=menu;$('begin').onclick=()=>{const second=m==='local'?$('second').value:null;if(m==='local'&&!second){alert('Choose a second profile.');return}match=newMatch(second);selectedOrder=null;screen='play';play()}}
function owned(i,p){return p===0?i>=0&&i<6:i>=6&&i<12}
function sideEmpty(s,p){return s.pits.slice(p*6,p*6+6).every(n=>n===0)}
function contractFor(p,phase){return p*6+((2+phase)%6)}
function legal(s,p){const all=Array.from({length:6},(_,i)=>p*6+i).filter(i=>s.pits[i]>0),clear=all.filter(i=>i!==s.blockades[p]);return clear.length?clear:all}
function clone(s){return{...s,pits:s.pits.slice(),scores:s.scores.slice(),contract:s.contract.slice(),log:s.log.slice(),influence:s.influence.slice(),hands:s.hands.map(h=>h.slice()),blockades:s.blockades.slice(),guards:s.guards.slice(),tailwind:s.tailwind.slice(),voyages:s.voyages.slice(),markets:s.markets.slice()}}
function orderTargets(s,p,id){if(id==='tailwind')return [-1];return Array.from({length:6},(_,j)=>(id==='blockade'?1-p:p)*6+j).filter(i=>id==='blockade'?s.pits[i]>0:id==='cargo'?true:s.pits[i]>0)}
function applyOrder(s,p,index,target){const id=s.hands[p][index],card=ORDERS[id];if(s.turn!==p||s.over||s.used||!card||s.influence[p]<card.cost||!orderTargets(s,p,id).includes(target))throw Error('This order cannot be played.');const out=clone(s);out.influence[p]-=card.cost;out.hands[p].splice(index,1);out.used=true;if(id==='blockade')out.blockades[1-p]=target;if(id==='guard')out.guards[p]=target;if(id==='cargo')out.pits[target]+=2;if(id==='tailwind')out.tailwind[p]=true;out.log.push(`${s.plies+1}. ${playerName(s,p)} ordered ${card.name}${target>=0?' at '+PORTS[target].name:''}.`);return out}
function playerName(s,p){const id=s.players[p];return id?store.profiles().find(x=>x.id===id)?.name||'Merchant':'Harbor master'}
function gatePosition(p,wind){if(p===0)return wind===1?{x:7,y:66}:{x:93,y:66};return wind===1?{x:93,y:34}:{x:7,y:34}}
function step(s,p,i){
 if(s.turn!==p||!legal(s,p).includes(i))throw Error('Choose an available occupied port.');
 const out=clone(s),n=out.pits[i],stops=[],wind=s.tailwind[p]?-s.wind:s.wind;out.pits[i]=0;
 let pos=i,lastStore=false,landed=-1,remaining=n,justLeftStore=false;
 while(remaining){
   const boundary=p===0?(wind===1?5:0):(wind===1?11:6);
   if(pos===boundary&&!justLeftStore){out.scores[p]++;out.influence[p]=Math.min(6,out.influence[p]+1);stops.push({kind:'harbor',player:p});remaining--;lastStore=true;landed=-1;justLeftStore=true;continue}
   pos=(pos+wind+12)%12;out.pits[pos]++;stops.push({kind:'port',index:pos});remaining--;lastStore=false;landed=pos;justLeftStore=false;
 }
 let captured=0,bonus=0,marketBonus=0,guarded=false;
 if(landed>=0&&owned(landed,p)){
   if(out.pits[landed]===1){const opposite=11-landed;if(out.pits[opposite]){if(out.guards[1-p]===opposite){out.guards[1-p]=null;guarded=true}else{captured=out.pits[opposite]+1;out.scores[p]+=captured;out.pits[opposite]=0;out.pits[landed]=0}}}
   if(landed===out.contract[p]){bonus=2;out.scores[p]+=bonus}
   if(landed===out.markets[p]){marketBonus=1;out.scores[p]++}
 }
 out.blockades[p]=null;out.tailwind[p]=false;out.used=false;out.voyages[p]++;if(out.voyages[p]%3===0)draw(out,p);
 out.plies++;const ended=sideEmpty(out,0)||sideEmpty(out,1)||out.plies>=MAX_TURNS;
 if(ended){for(let k=0;k<12;k++){out.scores[k<6?0:1]+=out.pits[k];out.pits[k]=0}out.over=true}
 else{if(out.plies%4===0){out.wind*=-1;const phase=out.plies/4;out.contract=[contractFor(0,phase),contractFor(1,phase)]}out.turn=lastStore?p:1-p}
 const detail=`${n} crate${n===1?'':'s'} from ${PORTS[i].name}${captured?`; captured ${captured}`:''}${guarded?'; guard held':''}${bonus?'; contract +2':''}${marketBonus?'; spice market +1':''}${lastStore&&!ended?'; sails again':''}${!ended&&out.plies%4===0?'; wind reversed':''}.`;
 out.log.push(`${s.plies+1}. ${playerName(s,p)} sailed ${detail}`);
 out.voyage={source:i,player:p,wind,stops,captured,bonus,marketBonus,guarded,extra:lastStore&&!ended};
 return out;
}
function coastShape(seed,top){let n=(seed^(top?0x51ed270b:0x8921e4ab))>>>0;const roll=()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296};let d=top?'M0 0H1000V':'M0 650H1000V';d+=top?'55':'595';for(let x=1000;x>=0;x-=100){const y=(top?70:580)+(roll()-.5)*55;d+=` L${x} ${Math.round(y)}`}return d+'Z'}
function mapArt(s){const seed=s.seed||1,dx=(seed%53)-26,dy=((seed>>>8)%31)-15;return `<svg class="chart-art" viewBox="0 0 1000 650" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="sea" x2="1" y2="1"><stop stop-color="#37748a"/><stop offset="1" stop-color="#133847"/></linearGradient><pattern id="grain" width="28" height="28" patternUnits="userSpaceOnUse"><circle cx="3" cy="7" r="1" fill="#d8eee2" opacity=".13"/></pattern></defs><rect width="1000" height="650" fill="url(#sea)"/><rect width="1000" height="650" fill="url(#grain)"/><path class="shoal" d="M0 0H1000V110Q740 130 500 95T0 145ZM0 650H1000V550Q700 535 500 560T0 525Z"/><path class="land" d="${coastShape(seed,true)} ${coastShape(seed,false)}"/><path class="island" d="M${380+dx} ${302+dy}q35-22 69 5l-10 36-41 8-29-22zM${595-dx} ${395-dy}q22-19 52-3l-4 27-36 15-25-14z"/><path class="contour" d="M70 130Q300 170 490 115T930 138M70 520Q330 475 500 538T930 508"/><path class="route" d="${routePath}"/><path class="wind-flow" d="M180 325 C320 180 680 180 820 325"/><path class="wind-flow" d="M820 370 C680 510 320 510 180 370"/></svg>`}
function fleetAt(p,i){const x=p.x+(50-p.x)*.30,y=p.y+(50-p.y)*.30;return `<span class="fleet ${i<6?'south':'north'}" style="${posStyle(x,y)}" aria-hidden="true">${shipSVG}</span>`}
function boardHTML(){
 const s=match,canPlay=!(mode==='ai'&&s.turn===1)&&!animating;
 const targets=selectedOrder===null?null:orderTargets(s,s.turn,s.hands[s.turn][selectedOrder]);
 const ports=PORTS.map((p,i)=>{const available=!s.over&&canPlay&&(targets?targets.includes(i):legal(s,s.turn).includes(i)),contract=s.contract.includes(i),market=s.markets.includes(i),blocked=s.blockades[i<6?0:1]===i,guarded=s.guards[i<6?0:1]===i;return `<button class="port ${i<6?'south':'north'} ${available?'available':''} ${contract?'contract':''} ${market?'spice':''} ${blocked?'blocked':''} ${guarded?'guarded':''}" style="${posStyle(p.x,p.y)}" data-port="${i}" ${available?'':'disabled'} aria-label="${p.name}, port ${i+1}, ${s.pits[i]} crates, ${i<6?'amber':'teal'} fleet${contract?', contract plus two coins':''}${market?', spice market plus one coin':''}${blocked?', blockaded':''}${guarded?', guarded':''}"><span class="port-no">${i+1}</span><small>${G.esc(p.name)}</small><strong class="port-count">${s.pits[i]}</strong><span class="port-badges">${contract?'<em>★ +2</em>':''}${market?'<em>✦ +1</em>':''}${blocked?'<em>⛔</em>':''}${guarded?'<em>◆</em>':''}</span></button>`}).join('');
 const fleets=PORTS.map(fleetAt).join('');
 const gates=[0,1].map(p=>{const q=gatePosition(p,s.wind);return `<span class="bank-gate ${p?'north':'south'}" style="${posStyle(q.x,q.y)}" title="${p?'Teal':'Amber'} harbor gate" aria-hidden="true">BANK</span>`}).join('');
 return `<div class="chart ${s.wind===-1?'reverse':''}" id="chart" role="group" aria-label="Fictional spice coast, twelve fixed ports and a generated coastline">${mapArt(s)}<div class="map-title">The Spice Coast<small>Chart ${String(s.seed>>>0).padStart(10,'0')}</small></div>${ports}${fleets}${gates}<span id="voyage-ship" class="fleet travel ${s.turn?'north':'south'}" style="${posStyle(50,50)}" hidden aria-hidden="true">${shipSVG}</span></div>`;
}
function play(){
 screen='play';const s=match,p=s.turn,next=4-s.plies%4,who=playerName(s,p),effective=s.tailwind[p]?-s.wind:s.wind,aiTurn=mode==='ai'&&p===1;
 if(selectedOrder!==null&&!s.hands[p][selectedOrder])selectedOrder=null;
 const cards=s.hands[p].map((id,i)=>{const c=ORDERS[id],enabled=!aiTurn&&!s.used&&s.influence[p]>=c.cost;return `<button class="order-card order-${id} ${selectedOrder===i?'selected':''}" data-order="${i}" ${enabled?'':'disabled'} aria-pressed="${selectedOrder===i}"><i aria-hidden="true">${c.mark}</i><strong>${G.esc(c.name)}</strong><span>${G.esc(c.desc)}</span><b>${c.cost} influence</b></button>`}).join('');
 shell(`<section class="panel game-panel"><div class="spread"><div><p class="eyebrow">Voyage ${s.plies+1} of ${MAX_TURNS}</p><h2>${G.esc(who)} sails next</h2><p class="muted">${selectedOrder!==null?'Choose a glowing target on the chart, or cancel the order.':'Choose a glowing port to sail. Play one order first if it helps your plan.'}</p></div><div class="turn-resource"><b>${s.influence[p]} / 6</b><span>Influence · +1 per banked crate</span></div></div><div class="chart-head"><div class="wind-status"><b>${effective===1?'↻':'↺'}</b><span>${s.tailwind[p]?'Garuda’s wind: ':''}Wind ${effective===1?'clockwise':'counterclockwise'}<small>Global wind reverses in ${next} voyage${next===1?'':'s'}</small></span></div><span class="ship-note">★ contract +2 · ✦ spice market +1 · ◆ guarded · ⛔ blockaded</span></div>${boardHTML()}<div class="harbors"><div class="harbor-card"><div><strong>Amber harbor</strong><span>${G.esc(playerName(s,0))} · ${s.influence[0]} influence</span></div><b class="score" data-harbor="0">${s.scores[0]}</b></div><div class="harbor-card north"><div><strong>Teal harbor</strong><span>${G.esc(playerName(s,1))} · ${s.influence[1]} influence</span></div><b class="score" data-harbor="1">${s.scores[1]}</b></div></div><div id="voyage-status" class="voyage-status" role="status" aria-live="polite">${selectedOrder!==null?'Select a highlighted target for '+G.esc(ORDERS[s.hands[p][selectedOrder]].name)+'.':'Choose a glowing port. The ship will show every cargo stop.'}</div><div class="orders-head"><div><p class="eyebrow">Your orders</p><h3>One card per voyage</h3></div><span>Draw after every third fleet voyage · ${3-s.voyages[p]%3} to next draw</span></div><div class="orders">${cards||'<p class="muted">Your hand is empty. More orders arrive after your third voyage.</p>'}</div>${selectedOrder!==null?'<button id="cancel-order" class="cancel-order">Cancel selection</button>':''}<div class="map-legend"><span>Amber ports 1–6</span><span>Teal ports 7–12</span><span>★ contract +2</span><span>✦ market +1</span></div></section><section class="panel"><h3>Voyage log</h3><ol class="log">${s.log.slice(-10).reverse().map(x=>`<li>${G.esc(x)}</li>`).join('')}</ol></section>`);
 document.querySelectorAll('[data-port]').forEach(b=>b.onclick=()=>turn(+b.dataset.port));
 document.querySelectorAll('[data-order]').forEach(b=>b.onclick=()=>{const i=+b.dataset.order,id=s.hands[p][i];if(id==='tailwind'){playOrder(i,-1);return}selectedOrder=selectedOrder===i?null:i;play()});
 if($('cancel-order'))$('cancel-order').onclick=()=>{selectedOrder=null;play()};
 if(mode==='ai'&&p===1)setTimeout(ai,420);
}
function playOrder(i,target){if(!match||animating)return;try{match=applyOrder(match,match.turn,i,target);selectedOrder=null;play()}catch(e){$('voyage-status').textContent=e.message}}
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
 const news=[v.captured?`Captured ${v.captured} crates.`:'',v.guarded?'A harbor guard prevented a capture.':'',v.bonus?'Contract fulfilled: +2 coins.':'',v.marketBonus?'Spice market: +1 coin.':'',v.extra?'Last crate reached the harbor: sail again.':'',after.wind!==before.wind?'The wind has reversed.':''].filter(Boolean).join(' ');
 status.innerHTML=`<strong>Voyage complete.</strong> ${G.esc(news||'Cargo delivered along the coast.')}`;
 await pause(reduced||skipRequested?250:800);
 return token===animationToken&&screen==='play';
}
async function sail(i){
 if(!match||animating||match.over||!legal(match,match.turn).includes(i)||(mode==='ai'&&match.turn===1))return;
 const before=match,old=before.turn,afterState=step(before,old,i),token=++animationToken;
 animating=true;skipRequested=false;
 document.querySelectorAll('[data-port],[data-order]').forEach(b=>b.disabled=true);
 const status=$('voyage-status'),skip=document.createElement('button');skip.className='skip';skip.type='button';skip.textContent='Skip animation';skip.onclick=()=>{skipRequested=true};status.after(skip);
 const completed=await animateVoyage(before,afterState,token);
 if(!completed)return;
 skip.remove();match=afterState;animating=false;after(old);
}
function turn(i){if(selectedOrder!==null){playOrder(selectedOrder,i);return}sail(i)}
function after(old){if(match.over){finish();return}if(mode==='local'){const next=match.turn;document.getElementById('app').innerHTML='';G.handoff(playerName(match,next),next===old?'Your final crate reached home. Take another turn.':'Take the device and plan your next voyage.',play)}else play()}
function ai(){if(!match||match.over||match.turn!==1||screen!=='play'||animating)return;const s=match,p=1;if(!s.used){for(let j=0;j<s.hands[p].length;j++){const id=s.hands[p][j],card=ORDERS[id];if(s.influence[p]<card.cost)continue;let target=null;if(id==='blockade'){const rivals=legal(s,0);if(rivals.length>1)target=rivals.reduce((a,b)=>s.pits[a]>s.pits[b]?a:b)}if(id==='guard'){target=orderTargets(s,p,id).sort((a,b)=>s.pits[b]-s.pits[a])[0]}if(id==='cargo'){target=legal(s,p).sort((a,b)=>s.pits[b]-s.pits[a])[0]}if(id==='tailwind'){const normal=Math.max(...legal(s,p).map(i=>step(s,p,i).scores[p]));const altered=clone(s);altered.tailwind[p]=true;const against=Math.max(...legal(altered,p).map(i=>step(altered,p,i).scores[p]));if(against>normal)target=-1}if(target!==null&&target!==undefined){match=applyOrder(s,p,j,target);break}}}const choices=legal(match,1);let best=choices[0],value=-Infinity;for(const i of choices){const test=step(match,1,i);const score=(test.scores[1]-match.scores[1])*2+(test.over?(test.scores[1]-test.scores[0])*10:0)+(test.turn===1?2:0)+Math.random()*1.5;if(score>value){value=score;best=i}}play();const before=match,afterState=step(before,1,best),token=++animationToken;animating=true;skipRequested=false;document.querySelectorAll('[data-port],[data-order]').forEach(b=>b.disabled=true);animateVoyage(before,afterState,token).then(completed=>{if(!completed)return;match=afterState;animating=false;after(1)})}
function finish(){screen='result';const s=match,w=s.scores[0]===s.scores[1]?-1:s.scores[0]>s.scores[1]?0:1,winId=w<0?null:s.players[w];store.record(s.players,winId,mode==='ai'?'Solo':'Local two-player',s.log,`${s.scores[0]}–${s.scores[1]} coins.`);shell(`<section class="panel"><p class="eyebrow">Trade season complete</p><h2>${w<0?'The harbors are tied.':`${G.esc(playerName(s,w))} claims the coast.`}</h2><p class="lead">${G.esc(playerName(s,0))}: ${s.scores[0]} coins · ${G.esc(playerName(s,1))}: ${s.scores[1]} coins.</p><div class="button-row"><button class="primary" id="again">Trade again</button><button id="home">Home</button></div></section><section class="panel"><h3>Voyage record</h3><ol class="log">${s.log.map(x=>`<li>${G.esc(x)}</li>`).join('')}</ol></section>`);$('again').onclick=()=>setup(mode);$('home').onclick=menu}
menu();
})();
