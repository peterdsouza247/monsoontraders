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
let selectedOrder=null,selectedPort=null;
const ORDERS={blockade:{name:'Mercenary blockade',cost:2,desc:'Close a rival port for their next launch.',mark:'▣'},tailwind:{name:'Invoke Garuda',cost:1,desc:'Call on Garuda to reverse your sailing wind for one voyage.',mark:'↝'},guard:{name:"Naga's ward",cost:1,desc:'A serpent spirit shelters one port from a capture.',mark:'◈'},cargo:{name:'Spice caravan',cost:2,desc:'Add two crates to one of your ports.',mark:'✦'}};
const ORDER_IDS=Object.keys(ORDERS);
const CHARTERS=[
 {name:'Harbor tribute',goal:2,desc:'Bank two crates before the wind turns.',story:'The harbor council calls for cargo to fill its storehouses.'},
 {name:'Spice passage',goal:1,desc:'Finish a voyage at your spice market.',story:'The spice brokers offer a prize for a daring passage.'},
 {name:'Coast watch',goal:3,desc:'Capture three rival crates before the wind turns.',story:'The coast wardens reward a decisive seizure.'}
];
const charterFor=(seed,phase)=>(seed%CHARTERS.length+phase)%CHARTERS.length;
function random(s){s.rng=(Math.imul(s.rng,1664525)+1013904223)>>>0;return s.rng}
function draw(s,p){if(s.hands[p].length<3)s.hands[p].push(ORDER_IDS[random(s)%ORDER_IDS.length])}
function newMatch(second){const seed=(Math.random()*4294967296)>>>0,s={pits:Array(12).fill(4),scores:[0,0],turn:0,plies:0,wind:1,contract:[2,9],log:[],players:[store.active().id,second],over:false,seed,rng:seed,influence:[2,2],hands:[[],[]],blockades:[null,null],guards:[null,null],tailwind:[false,false],used:false,voyages:[0,0],markets:[],charter:charterFor(seed,0),charterProgress:[0,0],charterClaimed:[false,false],charterWins:[0,0]};s.markets=[random(s)%6,6+random(s)%6];for(let p=0;p<2;p++){draw(s,p);draw(s,p)}s.log.push(CHARTERS[s.charter].story);return s}
const reduceMotion=()=>window.matchMedia?.('(prefers-reduced-motion: reduce)').matches||false;
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const shipSVG='<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M5 27h30l-5 7H11zM18 5h2v21h-2zM22 8v16h11zM16 12v12H8z"/></svg>';
const posStyle=(x,y)=>`--x:${x}%;--y:${y}%`;
const routePath='M '+PORTS.map(p=>`${p.x*10} ${p.y*6.5}`).join(' L ')+' Z';
function leave(){if(match&&screen==='play'&&!match.over){if(!confirm('Leave this match? It will not be recorded.'))return false}animationToken++;animating=false;match=null;selectedOrder=null;selectedPort=null;return true}
function shell(body){
 $('app').innerHTML=`<header class="mast"><div><p class="eyebrow">A game of shifting winds</p><h1 class="brand">Monsoon Traders</h1><p class="tagline">Two merchant fleets. Twelve ports. A wind that changes everything.</p></div><div class="mast-actions"><button id="nav-home">Home</button><button id="nav-records">Records</button><button id="nav-profiles">Profiles</button></div></header>${body}<p class="footer">Monsoon Traders · A fictional spice coast · Export profiles to keep your record</p>`;
 $('nav-home').onclick=()=>{if(leave())menu()};
 $('nav-records').onclick=()=>{if(leave()){screen='records';shell(G.recordsHTML(store).replace('Fight record','Trade record'))}};
 $('nav-profiles').onclick=()=>{if(leave())profiles()};
}
function profiles(){screen='profiles';shell(G.profilesHTML(store));G.wireProfiles(store,profiles)}
function menu(){screen='menu';shell(`<section class="panel"><p class="eyebrow">The spice coast</p><h2>Move cargo. Build your fortune.</h2><p class="lead">Choose a port and move its crates around the coast. Bank them for coins or capture a rival’s cargo. Select a port to see its route before you sail.</p><p class="myth-note">On this fictional coast, sailors tell stories of Garuda in the sky and naga beneath the water. Their powers in the game are fantasy inspired by regional traditions.</p><div class="button-row"><button class="primary" id="solo">Trade against the computer</button><button id="local">Local two-player</button></div></section><section class="panel"><h2>Rules of the coast</h2><div class="rules"><article><b>1 · Choose a port</b><p>Move all crates from a glowing port, one per stop in the wind direction. Your harbor gate banks cargo and earns influence.</p></article><article><b>2 · Shape the voyage</b><p>Spend influence on one order before sailing. Mercenaries blockade a port; Garuda changes your sailing wind; a naga shelters cargo.</p></article><article><b>3 · Claim the season</b><p>Capture opposite cargo, visit a ★ contract or ✦ spice market, and pursue the public harbor charter for two bonus coins. It changes with the wind. Draw a card after every third fleet voyage.</p></article></div></section>${G.recordsHTML(store).replace('Fight record','Recent voyages')}`);$('solo').onclick=()=>setup('ai');$('local').onclick=()=>setup('local')}
function setup(m){mode=m;screen='setup';const opts=store.profiles().filter(p=>p.id!==store.active().id);shell(`<section class="panel"><p class="eyebrow">Trade charter</p><h2>${m==='ai'?'Face the harbor master':'Choose a rival'}</h2><p class="muted">${m==='ai'?'Your amber fleet owns the southern shore. The computer commands the teal northern ports.':'Each merchant needs a separate local profile. Both fleets and their cargo are visible on the shared chart.'}</p>${m==='local'?`<div class="formline"><label>Amber fleet: ${G.esc(store.active().name)}</label><label>Teal fleet<select id="second"><option value="">Choose a profile</option>${opts.map(p=>`<option value="${G.esc(p.id)}">${G.esc(p.name)}</option>`).join('')}</select></label></div>${opts.length?'':'<p class="notice">Create a second profile before starting.</p>'}`:''}<div class="button-row"><button class="primary" id="begin" ${m==='local'&&!opts.length?'disabled':''}>Begin voyage</button><button id="back">Back</button></div></section>`);$('back').onclick=menu;$('begin').onclick=()=>{const second=m==='local'?$('second').value:null;if(m==='local'&&!second){alert('Choose a second profile.');return}match=newMatch(second);selectedOrder=null;selectedPort=null;screen='play';play()}}
function owned(i,p){return p===0?i>=0&&i<6:i>=6&&i<12}
function sideEmpty(s,p){return s.pits.slice(p*6,p*6+6).every(n=>n===0)}
function contractFor(p,phase){return p*6+((2+phase)%6)}
function legal(s,p){const all=Array.from({length:6},(_,i)=>p*6+i).filter(i=>s.pits[i]>0),clear=all.filter(i=>i!==s.blockades[p]);return clear.length?clear:all}
function clone(s){return{...s,pits:s.pits.slice(),scores:s.scores.slice(),contract:s.contract.slice(),log:s.log.slice(),influence:s.influence.slice(),hands:s.hands.map(h=>h.slice()),blockades:s.blockades.slice(),guards:s.guards.slice(),tailwind:s.tailwind.slice(),voyages:s.voyages.slice(),markets:s.markets.slice(),charterProgress:s.charterProgress.slice(),charterClaimed:s.charterClaimed.slice(),charterWins:s.charterWins.slice()}}
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
 let captured=0,bonus=0,marketBonus=0,guarded=false,banked=stops.filter(stop=>stop.kind==='harbor').length;
 if(landed>=0&&owned(landed,p)){
   if(out.pits[landed]===1){const opposite=11-landed;if(out.pits[opposite]){if(out.guards[1-p]===opposite){out.guards[1-p]=null;guarded=true}else{captured=out.pits[opposite]+1;out.scores[p]+=captured;out.pits[opposite]=0;out.pits[landed]=0}}}
   if(landed===out.contract[p]){bonus=2;out.scores[p]+=bonus}
   if(landed===out.markets[p]){marketBonus=1;out.scores[p]++}
 }
 const charter=CHARTERS[out.charter];let charterBonus=0,charterGain=0;
 if(!out.charterClaimed[p]){charterGain=out.charter===0?banked:out.charter===1?marketBonus:captured;out.charterProgress[p]=Math.min(charter.goal,out.charterProgress[p]+charterGain);if(out.charterProgress[p]>=charter.goal){out.charterClaimed[p]=true;out.charterWins[p]++;out.scores[p]+=2;charterBonus=2}}
 out.blockades[p]=null;out.tailwind[p]=false;out.used=false;out.voyages[p]++;if(out.voyages[p]%3===0)draw(out,p);
 out.plies++;const ended=sideEmpty(out,0)||sideEmpty(out,1)||out.plies>=MAX_TURNS;
 if(ended){for(let k=0;k<12;k++){out.scores[k<6?0:1]+=out.pits[k];out.pits[k]=0}out.over=true}
 else{if(out.plies%4===0){out.wind*=-1;const phase=out.plies/4;out.contract=[contractFor(0,phase),contractFor(1,phase)];out.charter=charterFor(out.seed,phase);out.charterProgress=[0,0];out.charterClaimed=[false,false]}out.turn=lastStore?p:1-p}
 const detail=`${n} crate${n===1?'':'s'} from ${PORTS[i].name}${captured?`; captured ${captured}`:''}${guarded?'; guard held':''}${bonus?'; contract +2':''}${marketBonus?'; spice market +1':''}${charterBonus?'; '+charter.name+' +2':''}${lastStore&&!ended?'; sails again':''}${!ended&&out.plies%4===0?'; wind reversed':''}.`;
 out.log.push(`${s.plies+1}. ${playerName(s,p)} sailed ${detail}`);
 if(!ended&&out.plies%4===0)out.log.push(CHARTERS[out.charter].story);
 out.voyage={source:i,player:p,wind,stops,banked,captured,bonus,marketBonus,charterGain,charterBonus,guarded,extra:lastStore&&!ended};
 return out;
}
function coastShape(seed,top){let n=(seed^(top?0x51ed270b:0x8921e4ab))>>>0;const roll=()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296};let d=top?'M0 0H1000V':'M0 650H1000V';d+=top?'55':'595';for(let x=1000;x>=0;x-=100){const y=(top?70:580)+(roll()-.5)*55;d+=` L${x} ${Math.round(y)}`}return d+'Z'}
function mapArt(s){const seed=s.seed||1,dx=(seed%53)-26,dy=((seed>>>8)%31)-15;return `<svg class="chart-art" viewBox="0 0 1000 650" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="sea" x2="1" y2="1"><stop stop-color="#37748a"/><stop offset="1" stop-color="#133847"/></linearGradient><pattern id="grain" width="28" height="28" patternUnits="userSpaceOnUse"><circle cx="3" cy="7" r="1" fill="#d8eee2" opacity=".13"/></pattern></defs><rect width="1000" height="650" fill="url(#sea)"/><rect width="1000" height="650" fill="url(#grain)"/><path class="shoal" d="M0 0H1000V110Q740 130 500 95T0 145ZM0 650H1000V550Q700 535 500 560T0 525Z"/><path class="land" d="${coastShape(seed,true)} ${coastShape(seed,false)}"/><path class="island" d="M${380+dx} ${302+dy}q35-22 69 5l-10 36-41 8-29-22zM${595-dx} ${395-dy}q22-19 52-3l-4 27-36 15-25-14z"/><path class="contour" d="M70 130Q300 170 490 115T930 138M70 520Q330 475 500 538T930 508"/><path class="route" d="${routePath}"/><path class="wind-flow" d="M180 325 C320 180 680 180 820 325"/><path class="wind-flow" d="M820 370 C680 510 320 510 180 370"/></svg>`}
function fleetAt(p,i){const x=p.x+(50-p.x)*.30,y=p.y+(50-p.y)*.30;return `<span class="fleet ${i<6?'south':'north'}" style="${posStyle(x,y)}" aria-hidden="true">${shipSVG}</span>`}
function boardHTML(){
 const s=match,canPlay=!(mode==='ai'&&s.turn===1)&&!animating;
 const targets=selectedOrder===null?null:orderTargets(s,s.turn,s.hands[s.turn][selectedOrder]);
 const ports=PORTS.map((p,i)=>{const available=!s.over&&canPlay&&(targets?targets.includes(i):legal(s,s.turn).includes(i)),contract=s.contract.includes(i),market=s.markets.includes(i),blocked=s.blockades[i<6?0:1]===i,guarded=s.guards[i<6?0:1]===i;return `<button class="port ${i<6?'south':'north'} ${available?'available':''} ${contract?'contract':''} ${market?'spice':''} ${blocked?'blocked':''} ${guarded?'guarded':''}" style="${posStyle(p.x,p.y)}" data-port="${i}" ${available?'':'disabled'} aria-label="${p.name}, port ${i+1}, ${s.pits[i]} crates, ${i<6?'amber':'teal'} fleet${contract?', contract plus two coins':''}${market?', spice market plus one coin':''}${blocked?', blockaded':''}${guarded?', guarded':''}"><span class="port-no">${i+1}</span><small>${G.esc(p.name)}</small><strong class="port-count">${s.pits[i]}</strong><span class="port-unit">crates</span><span class="port-badges">${contract?'<em>★ +2</em>':''}${market?'<em>✦ +1</em>':''}${blocked?'<em>⛔</em>':''}${guarded?'<em>◆</em>':''}</span></button>`}).join('');
 const fleets=PORTS.map(fleetAt).join('');
 const gates=[0,1].map(p=>{const q=gatePosition(p,s.wind);return `<span class="bank-gate ${p?'north':'south'}" style="${posStyle(q.x,q.y)}" title="${p?'Teal':'Amber'} harbor gate" aria-hidden="true">${p?'T':'A'} BANK</span>`}).join('');
 return `<div class="chart ${s.wind===-1?'reverse':''} " id="chart" role="group" aria-label="Fictional spice coast, twelve fixed ports and a generated coastline">${mapArt(s)}<svg class="preview-overlay" viewBox="0 0 1000 650" preserveAspectRatio="none" aria-hidden="true"><defs><marker id="preview-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z"/></marker></defs><polyline id="preview-line" points="" marker-end="url(#preview-arrow)"/></svg><div class="map-title">The Spice Coast<small>Chart ${String(s.seed>>>0).padStart(10,'0')}</small></div>${ports}${fleets}${gates}<span id="voyage-ship" class="fleet travel ${s.turn?'north':'south'}" style="${posStyle(50,50)}" hidden aria-hidden="true">${shipSVG}</span></div>`;
}
function charterHTML(s){const c=CHARTERS[s.charter],left=4-s.plies%4;return `<aside class="charter" aria-label="Current harbor charter"><div><p class="eyebrow">Harbor charter · ${left} voyage${left===1?'':'s'} left</p><h3>${G.esc(c.name)} <span>+2 coins</span></h3><p>${G.esc(c.desc)}</p></div><div class="charter-progress">${[0,1].map(p=>`<div><span class="${p?'teal':'amber'}">${p?'Teal':'Amber'}</span><strong>${s.charterClaimed[p]?'Claimed':`${s.charterProgress[p]}/${c.goal}`}</strong></div>`).join('')}</div></aside>`}
function clearForecast(restore=true){
 document.querySelectorAll('.preview-source,.preview-end,.preview-pass,.preview-bank').forEach(b=>{b.classList.remove('preview-source','preview-end','preview-pass','preview-bank');b.removeAttribute('data-preview-step')});
 const line=$('preview-line');line?.setAttribute?.('points','');
 const box=$('forecast'),route=$('route-steps');if(box)box.textContent=selectedOrder===null?'Choose a glowing port. Its large number is the crates you will move. Tap once to see the route.':`Choose a glowing target for ${ORDERS[match.hands[match.turn][selectedOrder]].name}.`;if(route)route.innerHTML='';
 if(restore&&selectedPort!==null&&selectedOrder===null)showForecast(selectedPort);
}
function showForecast(i){
 const s=match,box=$('forecast');if(!s||!box||animating)return;clearForecast(false);
 document.querySelector(`[data-port="${i}"]`)?.classList.add('preview-source');
 if(selectedOrder!==null){const id=s.hands[s.turn][selectedOrder],c=ORDERS[id];box.textContent=`${c.name} at ${PORTS[i].name}. ${c.desc} Cost: ${c.cost} influence.`;return}
 if(!legal(s,s.turn).includes(i))return;
 const after=step(s,s.turn,i),v=after.voyage,last=v.stops.at(-1),destination=last.kind==='harbor'?`${s.turn?'Teal':'Amber'} BANK`:PORTS[last.index].name;
 const visible=v.stops.slice(0,8),coords=[PORTS[i]];
 visible.forEach((stop,j)=>{const point=stop.kind==='harbor'?gatePosition(s.turn,v.wind):PORTS[stop.index];coords.push(point);const el=stop.kind==='harbor'?document.querySelector(`.bank-gate.${s.turn?'north':'south'}`):document.querySelector(`[data-port="${stop.index}"]`);el?.classList.add(stop.kind==='harbor'?'preview-bank':'preview-pass');el?.setAttribute('data-preview-step',String(j+1))});
 $('preview-line')?.setAttribute?.('points',coords.map(q=>`${q.x*10},${q.y*6.5}`).join(' '));
 if(last.kind==='port')document.querySelector(`[data-port="${last.index}"]`)?.classList.add('preview-end');
 const coins=after.scores[s.turn]-s.scores[s.turn],parts=[`Move all ${v.stops.length} crates from ${PORTS[i].name}. The last crate reaches ${destination}.`];
 if(v.banked)parts.push(`${v.banked} at your BANK = ${v.banked} coin${v.banked===1?'':'s'}`);
 if(v.captured)parts.push(`Capture ${v.captured} crates = ${v.captured} coins`);
 if(v.guarded)parts.push('A ward prevents a capture');
 if(v.bonus)parts.push('Contract +2 coins');if(v.marketBonus)parts.push('Spice market +1 coin');
 if(v.charterBonus)parts.push(`${CHARTERS[s.charter].name} +2 coins`);else if(v.charterGain&&!s.charterClaimed[s.turn])parts.push(`Charter progress ${Math.min(CHARTERS[s.charter].goal,s.charterProgress[s.turn]+v.charterGain)}/${CHARTERS[s.charter].goal}`);
 if(!coins)parts.push('No coins yet; the cargo stays on the coast');if(v.extra)parts.push('You sail again');if(after.over)parts.push('Season ends; final cargo is included in the score');box.textContent=parts.join(' · ')+'.';
 const route=$('route-steps');if(route)route.innerHTML='<span class="route-label">One crate at each stop:</span>'+visible.map((stop,j)=>`<span class="route-stop ${stop.kind==='harbor'?'bank':''} ${j===v.stops.length-1?'last':''}" title="${stop.kind==='harbor'?'Harbor bank':PORTS[stop.index].name}">${j+1}. ${stop.kind==='harbor'?'BANK':`${PORTS[stop.index].name} (${stop.index+1})`}</span>`).join('')+(v.stops.length>8?`<span class="route-more">+${v.stops.length-8} more stops</span>`:'');
}
function play(){
 screen='play';const s=match,p=s.turn,next=4-s.plies%4,who=playerName(s,p),effective=s.tailwind[p]?-s.wind:s.wind,aiTurn=mode==='ai'&&p===1;
 if(selectedOrder!==null&&!s.hands[p][selectedOrder])selectedOrder=null;
 const cards=s.hands[p].map((id,i)=>{const c=ORDERS[id],enabled=!aiTurn&&!s.used&&s.influence[p]>=c.cost;return `<button class="order-card order-${id} ${selectedOrder===i?'selected':''}" data-order="${i}" ${enabled?'':'disabled'} aria-pressed="${selectedOrder===i}"><i aria-hidden="true">${c.mark}</i><strong>${G.esc(c.name)}</strong><span>${G.esc(c.desc)}</span><b>${c.cost} influence</b></button>`}).join('');
 shell(`<section class="panel game-panel"><div class="spread"><div><p class="eyebrow">Voyage ${s.plies+1} of ${MAX_TURNS}</p><h2>${G.esc(who)} sails next</h2><p class="muted">${selectedOrder!==null?'Choose a glowing target for your order.':'Earn more coins than your rival. Tap one of your glowing ports to see where every crate will go.'}</p></div><div class="turn-resource"><b>${s.scores[p]} coins</b><span>${p?'Teal':'Amber'} fleet · ${s.influence[p]} influence</span></div></div>
 <div class="chart-head"><div class="wind-status"><b>${effective===1?'↻':'↺'}</b><span>Wind: ${effective===1?'clockwise':'counterclockwise'}${s.tailwind[p]?' (Garuda)':''}<small>Reverses in ${next} voyage${next===1?'':'s'}</small></span></div><span class="ship-note">Follow the arrow on the chart when you select a port.</span></div>
 <div class="board-key"><span class="key-own">${selectedOrder!==null?'Glowing ports are valid targets':`Your ports: ${p?'teal 7–12':'amber 1–6'}`}</span><span>Large number = crates</span><span class="key-bank">BANK = 1 coin per crate</span></div>
 <div class="forecast-row"><div class="forecast-content"><div id="forecast" class="forecast" role="status" aria-live="polite">${selectedOrder!==null?'Choose a glowing target for '+G.esc(ORDERS[s.hands[p][selectedOrder]].name)+'.':'Choose a glowing port. Its large number is the crates you will move. Tap once to see the route.'}</div><div id="route-steps" class="route-steps" aria-label="Cargo stops"></div></div><button id="confirm-sail" class="primary" hidden>Sail</button></div>
 ${boardHTML()}
 <div class="harbors"><div class="harbor-card"><div><strong>Amber harbor</strong><span>${G.esc(playerName(s,0))} · ${s.influence[0]} influence</span></div><b class="score" data-harbor="0">${s.scores[0]}</b></div><div class="harbor-card north"><div><strong>Teal harbor</strong><span>${G.esc(playerName(s,1))} · ${s.influence[1]} influence</span></div><b class="score" data-harbor="1">${s.scores[1]}</b></div></div>
 ${charterHTML(s)}<details class="quick-help"><summary>How do banking and captures work?</summary><p>Every crate moves one stop in the wind direction. A crate at your BANK earns one coin. If the last crate lands in one of your empty ports, you also take the cargo from the rival port directly opposite. The preview shows the exact result before you sail. ★ gives two coins and ✦ gives one when your last crate lands there.</p></details>
 <div id="voyage-status" class="voyage-status" role="status" aria-live="polite">${selectedOrder!==null?'Select a highlighted target for '+G.esc(ORDERS[s.hands[p][selectedOrder]].name)+'.':'Tap a glowing port to preview. Tap it again or press Sail to move.'}</div>
 <details class="order-drawer" ${selectedOrder!==null?'open':''}><summary>Order cards · ${s.hands[p].length} in hand · ${s.influence[p]} influence <span>Optional tactics</span></summary><div class="orders-head"><div><p class="eyebrow">Your orders</p><h3>One card per voyage</h3></div><span>Draw after every third fleet voyage · ${3-s.voyages[p]%3} to next draw</span></div><div class="orders">${cards||'<p class="muted">Your hand is empty. More orders arrive after your third voyage.</p>'}</div>${selectedOrder!==null?'<button id="cancel-order" class="cancel-order">Cancel selection</button>':''}</details>
 <div class="map-legend"><span>Amber ports 1–6</span><span>Teal ports 7–12</span><span>★ contract +2</span><span>✦ market +1</span></div></section><section class="panel"><h3>Voyage log</h3><ol class="log">${s.log.slice(-10).reverse().map(x=>`<li>${G.esc(x)}</li>`).join('')}</ol></section>`);
 document.querySelectorAll('[data-port]').forEach(b=>{b.onclick=()=>turn(+b.dataset.port);b.onmouseenter=b.onfocus=()=>showForecast(+b.dataset.port);b.onmouseleave=b.onblur=clearForecast});
 document.querySelectorAll('[data-order]').forEach(b=>b.onclick=()=>{const i=+b.dataset.order,id=s.hands[p][i];if(id==='tailwind'){playOrder(i,-1);return}selectedPort=null;selectedOrder=selectedOrder===i?null:i;play()});
 if($('cancel-order'))$('cancel-order').onclick=()=>{selectedOrder=null;play()};$('confirm-sail').onclick=()=>{if(selectedPort!==null)sail(selectedPort)};
 if(mode==='ai'&&p===1)setTimeout(ai,420);
}
function playOrder(i,target){if(!match||animating)return;try{match=applyOrder(match,match.turn,i,target);selectedOrder=null;selectedPort=null;play()}catch(e){$('voyage-status').textContent=e.message}}
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
 const news=[v.banked?`${v.banked} crate${v.banked===1?'':'s'} banked for ${v.banked} coin${v.banked===1?'':'s'}.`:'',v.captured?`Captured ${v.captured} crates.`:'',v.guarded?'A naga ward prevented a capture.':'',v.bonus?'Contract fulfilled: +2 coins.':'',v.marketBonus?'Spice market: +1 coin.':'',v.charterBonus?'Harbor charter fulfilled: +2 coins.':'',v.extra?'Last crate reached the harbor: sail again.':'',after.wind!==before.wind?'The wind has reversed.':''].filter(Boolean).join(' ');
 status.innerHTML=`<strong>Voyage complete.</strong> ${G.esc(news||'Cargo delivered along the coast.')}`;
 const forecast=$('forecast');if(forecast)forecast.textContent=`Voyage complete. ${news||'Cargo moved to new ports. Plan your next voyage from their new positions.'}`;
 await pause(reduced||skipRequested?250:800);
 return token===animationToken&&screen==='play';
}
async function sail(i){
 if(!match||animating||match.over||!legal(match,match.turn).includes(i)||(mode==='ai'&&match.turn===1))return;
 selectedPort=null;
 const before=match,old=before.turn,afterState=step(before,old,i),token=++animationToken;
 animating=true;skipRequested=false;
 const forecast=$('forecast');if(forecast)forecast.textContent='Sailing now. Watch each crate reach the numbered stops.';
 document.querySelectorAll('[data-port],[data-order],#confirm-sail').forEach(b=>b.disabled=true);
 const status=$('voyage-status'),skip=document.createElement('button');skip.className='skip';skip.type='button';skip.textContent='Skip animation';skip.onclick=()=>{skipRequested=true};status.after(skip);
 const completed=await animateVoyage(before,afterState,token);
 if(!completed)return;
 skip.remove();match=afterState;animating=false;after(old);
}
function turn(i){if(selectedOrder!==null){playOrder(selectedOrder,i);return}if(selectedPort===i){sail(i);return}selectedPort=i;showForecast(i);const button=$('confirm-sail');if(button){button.hidden=false;button.textContent=`Sail from ${PORTS[i].name}`}}
function after(old){selectedPort=null;if(match.over){finish();return}if(mode==='local'){const next=match.turn;document.getElementById('app').innerHTML='';G.handoff(playerName(match,next),next===old?'Your final crate reached home. Take another turn.':'Take the device and plan your next voyage.',play)}else play()}
function ai(){if(!match||match.over||match.turn!==1||screen!=='play'||animating)return;const s=match,p=1;if(!s.used){for(let j=0;j<s.hands[p].length;j++){const id=s.hands[p][j],card=ORDERS[id];if(s.influence[p]<card.cost)continue;let target=null;if(id==='blockade'){const rivals=legal(s,0);if(rivals.length>1)target=rivals.reduce((a,b)=>s.pits[a]>s.pits[b]?a:b)}if(id==='guard'){target=orderTargets(s,p,id).sort((a,b)=>s.pits[b]-s.pits[a])[0]}if(id==='cargo'){target=legal(s,p).sort((a,b)=>s.pits[b]-s.pits[a])[0]}if(id==='tailwind'){const normal=Math.max(...legal(s,p).map(i=>step(s,p,i).scores[p]));const altered=clone(s);altered.tailwind[p]=true;const against=Math.max(...legal(altered,p).map(i=>step(altered,p,i).scores[p]));if(against>normal)target=-1}if(target!==null&&target!==undefined){match=applyOrder(s,p,j,target);break}}}const choices=legal(match,1);let best=choices[0],value=-Infinity;for(const i of choices){const test=step(match,1,i);const score=(test.scores[1]-match.scores[1])*2+(test.over?(test.scores[1]-test.scores[0])*10:0)+(test.turn===1?2:0)+Math.random()*1.5;if(score>value){value=score;best=i}}play();const before=match,afterState=step(before,1,best),token=++animationToken;animating=true;skipRequested=false;document.querySelectorAll('[data-port],[data-order]').forEach(b=>b.disabled=true);animateVoyage(before,afterState,token).then(completed=>{if(!completed)return;match=afterState;animating=false;after(1)})}
function finish(){screen='result';const s=match,w=s.scores[0]===s.scores[1]?-1:s.scores[0]>s.scores[1]?0:1,winId=w<0?null:s.players[w];store.record(s.players,winId,mode==='ai'?'Solo':'Local two-player',s.log,`${s.scores[0]}–${s.scores[1]} coins.`);shell(`<section class="panel"><p class="eyebrow">Trade season complete</p><h2>${w<0?'The harbors are tied.':`${G.esc(playerName(s,w))} claims the coast.`}</h2><p class="lead">${G.esc(playerName(s,0))}: ${s.scores[0]} coins · ${G.esc(playerName(s,1))}: ${s.scores[1]} coins.</p><p class="epilogue">${w<0?'The harbor council records a hard-fought tie.':`${G.esc(playerName(s,w))} returns with ${s.charterWins[w]} charter${s.charterWins[w]===1?'':'s'} fulfilled. The coast will remember the voyages, the bargains, and the wind that carried them.`}</p><div class="button-row"><button class="primary" id="again">Trade again</button><button id="home">Home</button></div></section><section class="panel"><h3>Voyage record</h3><ol class="log">${s.log.map(x=>`<li>${G.esc(x)}</li>`).join('')}</ol></section>`);$('again').onclick=()=>setup(mode);$('home').onclick=menu}
menu();
})();
