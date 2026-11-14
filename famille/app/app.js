(function(){
'use strict';
const CFG=window.CC_CONFIG,S=window.CC_S;
const LOC=['es','fr-CA','en-CA'],CODE=['ES','FR','EN'],HTML=['es','fr','en'];
const store={get(k){try{return localStorage.getItem(k)}catch(e){return null}},set(k,v){try{localStorage.setItem(k,v)}catch(e){}},del(k){try{localStorage.removeItem(k)}catch(e){}}};
let li=(()=>{const s=store.get('cc-lang');if(s!==null&&S.home[+s])return +s;const n=(navigator.language||'fr').slice(0,2);return n==='es'?0:n==='en'?2:1})();
const t=(k,...a)=>a.reduce((s,v,i)=>s.split('{'+i+'}').join(v),(S[k]||[k,k,k])[li]);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const iso=x=>x.getFullYear()+'-'+String(x.getMonth()+1).padStart(2,'0')+'-'+String(x.getDate()).padStart(2,'0');
const d=n=>{const x=new Date();x.setDate(x.getDate()+n);return iso(x)};
const dt=s=>new Date(s+'T12:00:00');
const fmt=(s,o)=>new Intl.DateTimeFormat(LOC[li],o).format(dt(s));
const today=()=>d(0);
const day=s=>s===today()?t('today'):s===d(1)?t('tomorrow'):s===d(-1)?t('yesterday'):fmt(s,{weekday:'short',day:'numeric',month:'short'});
const stamp=ts=>{const x=new Date(ts);return{date:iso(x),time:String(x.getHours()).padStart(2,'0')+':'+String(x.getMinutes()).padStart(2,'0')}};
const longDate=s=>fmt(s,{day:'numeric',month:'long',year:'numeric'});
const age=s=>{const b=dt(s),n=new Date();let a=n.getFullYear()-b.getFullYear();if(n.getMonth()<b.getMonth()||(n.getMonth()===b.getMonth()&&n.getDate()<b.getDate()))a--;return a};
const hm=v=>String(v||'').slice(0,5);
const weekStart=()=>{const x=new Date();x.setDate(x.getDate()-((x.getDay()+6)%7));return iso(x)};

const DEMO=window.CC_DEMO||null;
const configured=!!DEMO||CFG.supabaseUrl.startsWith('http');
const db=DEMO?DEMO.client:configured?window.supabase.createClient(CFG.supabaseUrl,CFG.supabaseKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}}):null;
if(DEMO)DEMO.li=()=>li;
const must=async p=>{const r=await p;if(r.error)throw r.error;return r.data};
const rpc=(f,a)=>must(db.rpc(f,a));

let session=null,memberships=[],cid=null,D=null,authMode='login',authMsg='',recovery=false,booted=false;
let pendingInvite=null,invitePreview=null,inviteChecked=false;
let view='home',taskFilter='open',taskWho=null,msgFilter='all',jFilter='all',vFilter='all',selDate=today(),calY=new Date().getFullYear(),calM=new Date().getMonth();

let auditN=30,auditF={who:'',act:'',from:'',to:''},auditMore=false;
const AUDIT_GROUPS={insert:['insert'],update:['update'],delete:['delete'],open:['open'],rep:['propose','confirm','end']};
async function fetchAudit(){
 let qy=db.from('audit_log').select('*').eq('circle_id',cid);
 if(auditF.who)qy=qy.eq('actor_member',auditF.who);
 if(auditF.act)qy=qy.in('action',AUDIT_GROUPS[auditF.act]);
 if(auditF.from)qy=qy.gte('created_at',new Date(auditF.from+'T00:00:00').toISOString());
 if(auditF.to)qy=qy.lte('created_at',new Date(auditF.to+'T23:59:59').toISOString());
 const rows=await must(qy.order('created_at',{ascending:false}).limit(auditN+1));
 auditMore=rows.length>auditN;return rows.slice(0,auditN);
}
async function refreshAudit(){try{D.audit=await fetchAudit()}catch(e){toast(errText(e))}render(true)}
function auditSection(){
 if(D.audit===null)return '';
 const f=auditF,filtered=f.who||f.act||f.from||f.to;
 const sel=`<div class="afilters"><label>${t('auditWho')}<select data-change="auditWho">${opts([['',t('mAll')],...D.members.map(m=>[m.id,m.display_name])],f.who)}</select></label><label>${t('auditAct')}<select data-change="auditAct">${opts([['',t('mAll')],['insert',t('ag_insert')],['update',t('ag_update')],['delete',t('ag_delete')],['open',t('ag_open')],['rep',t('ag_rep')]],f.act)}</select></label><label>${t('auditFrom')}<input type="date" data-change="auditFrom" value="${esc(f.from)}"></label><label>${t('auditTo')}<input type="date" data-change="auditTo" value="${esc(f.to)}"></label></div>${filtered?`<p><button class="linkbtn" data-act="auditReset">${t('auditReset')}</button></p>`:''}`;
 const list=D.audit.length?`<ul>${D.audit.map(a=>{const s=stamp(a.created_at),m=member(a.actor_member);return `<li class="row"><div class="grow"><span>${esc(m?m.display_name:t('exMember'))} ${t('a_'+a.action)} ${t('o_'+a.target)}</span><div class="meta"><span>${esc(day(s.date))}, ${s.time}</span></div></div></li>`}).join('')}</ul>`:`<p class="empty">${t(filtered?'auditNone':'emptyList')}</p>`;
 return `<section class="sheet"><h2>${t('auditT')}</h2><p class="note">${t('auditNote')}</p>${sel}${list}${auditMore?`<p style="padding:10px 0"><button class="btn small ghost" data-act="auditMoreBtn">${t('seeMore')}</button></p>`:''}</section>`;
}
const LI={es:0,fr:1,en:2},tl=(k,l,...a)=>a.reduce((s,v,i)=>s.split('{'+i+'}').join(v),(S[k]||[k,k,k])[l]);
const invState=i=>i.accepted_at?'accepted':new Date(i.expires_at)<=new Date()?'expired':'pending';
const CS=()=>li===1?'\u00A0: ':': ',CL=()=>li===1?'\u00A0:':':';
const NAV=[['home',0,'M3 11.5 12 4l9 7.5M5.5 10v10h13V10'],['calendar',0,'M4 6h16v15H4zM4 10.5h16M8.5 3v5M15.5 3v5'],['tasks',0,'M5 5h14v15H5zM8.5 12l2.5 2.5 4.5-5'],['messages',0,'M4 5h16v12H9l-5 4z'],['voice',0,'M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3zM5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21'],['journal',1,'M6 3h12v18H6zM9.5 8h5M9.5 12h5M9.5 16h3'],['documents',1,'M7 3h7l4 4v14H7zM14 3v4h4'],['meds',1,'M8.5 15.5l7-7a3.5 3.5 0 0 0-5-5l-7 7a3.5 3.5 0 0 0 5 5zM7 9l5 5'],['meeting',1,'M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM17 11a2.5 2.5 0 1 0 0-5M3 20c.5-3.5 3-5 6-5s5.5 1.5 6 5M16 15c2.5 0 4.5 1.5 5 5'],['foryou',1,'M12 20s-7.5-4.6-7.5-10A4 4 0 0 1 12 7a4 4 0 0 1 7.5 3c0 5.4-7.5 10-7.5 10z'],['profile',1,'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4.5 21c.6-4 3.6-6 7.500-6s6.900 2 7.500 6'],['summary',1,'M5 20V11M12 20V5M19 20v-7']];
const ic=p=>`<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="${p}"/></svg>`;
const LOGO='<svg width="30" height="30" viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="12" fill="none" stroke="#3A36A8" stroke-width="5" stroke-dasharray="56 6"/><circle cx="16" cy="16" r="4" fill="#F5BE3B"/></svg>';

// ===== Datos =====
const me=()=>D.members.find(m=>m.user_id===session.user.id);
const member=id=>D.members.find(m=>m.id===id);
const family=()=>D.members.filter(m=>m.role!=='person');
const canEdit=()=>['coord','fam'].includes(me().role);
const isCoord=()=>me().role==='coord';
const isPerson=()=>me().role==='person';
const canWrite=()=>canEdit()||isPerson();
const isRep=()=>D.circle.capacity_status==='represented'&&D.circle.rep_member_id===me().id;
const speaksFor=()=>isPerson()||isRep();
const seeDocs=()=>isCoord()||speaksFor();
const firstName=()=>D.circle.person_name.split(' ')[0];
const open=()=>D.tasks.filter(x=>!x.done_at);
const isLate=x=>!x.done_at&&x.due<today();
const PERSON_NAV=[['home',0],['voice',0],['calendar',0],['messages',0],['meds',0],['documents',1],['meeting',1],['tasks',1],['journal',1],['profile',1]];
const navItems=()=>isPerson()?PERSON_NAV.map(([k,sec])=>[k,sec,NAV.find(n=>n[0]===k)[2]]):NAV;
const color=m=>`var(--m${(m.color%6)+1})`;
const ini=n=>String(n||'?').trim().slice(0,2);
function av(id,sm){const m=member(id);return m?`<span class="av${sm?' sm':''}" style="background:${color(m)}" aria-hidden="true">${esc(ini(m.display_name))}</span>`:`<span class="av none${sm?' sm':''}" aria-hidden="true">?</span>`}
function avP(sm){const p=D.members.find(m=>m.role==='person');return p?av(p.id,sm):`<span class="av${sm?' sm':''}" style="background:var(--m6)" aria-hidden="true">${esc(ini(firstName()))}</span>`}
const opts=(arr,sel)=>arr.map(([v,l])=>`<option value="${esc(v)}"${v===sel?' selected':''}>${esc(l)}</option>`).join('');
const memOpts=()=>[['',t('unassigned')],...family().map(m=>[m.id,m.display_name])];
const roleName=r=>t({coord:'coord',fam:'fam',viewer:'viewer',person:'person'}[r]);

async function loadMemberships(){
  memberships=await must(db.from('circle_members').select('id,circle_id,role,display_name,circles!circle_members_circle_id_fkey(person_name)').eq('user_id',session.user.id));
  const saved=store.get('cc-circle');
  cid=memberships.some(m=>m.circle_id===saved)?saved:(memberships[0]?memberships[0].circle_id:null);
}
async function load(){
  if(!cid){D=null;return}
  const q=(tbl,cols)=>must(db.from(tbl).select(cols||'*').eq('circle_id',cid));
  const [circle,members,events,tasks,messages,journal,documents,contacts,needs,practical,voices,replies,wishes,moods]=await Promise.all([
    must(db.from('circles').select('*').eq('id',cid).single()),q('circle_members'),q('events'),q('tasks'),q('messages'),q('journal'),q('documents'),q('contacts'),q('needs'),q('practical'),q('voices'),q('voice_replies'),q('wishes'),q('moods')]);
  const role=members.find(m=>m.user_id===session.user.id).role;
  const [invites,priv,audit]=await Promise.all([
    role==='coord'?q('invites'):Promise.resolve([]),
    role==='coord'?db.from('circle_private').select('*').eq('circle_id',cid).then(r=>r.error?[]:r.data,()=>[]):Promise.resolve([]),
    (role==='coord'||role==='person'||(circle.capacity_status==='represented'&&circle.rep_member_id===members.find(m=>m.user_id===session.user.id).id))?fetchAudit():Promise.resolve(null)]);
  const qs=tbl=>db.from(tbl).select('*').eq('circle_id',cid).then(r=>r.error?[]:r.data,()=>[]);
  const [meds,med_logs,meetings,meeting_points,notif_prefs]=await Promise.all(['meds','med_logs','meetings','meeting_points','notif_prefs'].map(qs));
  D={priv:(priv&&priv[0])||null,meds,med_logs,meetings,meeting_points,notif_prefs,circle,members:members.sort((a,b)=>a.created_at.localeCompare(b.created_at)),events,tasks,messages:messages.sort((a,b)=>a.created_at.localeCompare(b.created_at)),journal,documents,contacts,needs,practical,voices,replies,wishes,moods,invites,audit};
}
const ins=(tbl,row)=>must(db.from(tbl).insert({circle_id:cid,...row}));
const upd=(tbl,id,row)=>must(db.from(tbl).update(row).eq('id',id));
const del=(tbl,id)=>must(db.from(tbl).delete().eq('id',id));
const post=(key,who,what)=>ins('messages',{author:me().id,sys_key:key,sys_who:who,sys_what:what||null});

function errText(e){const m=(e&&e.message)||'';if(m==='file')return t('e_file');if(m==='times')return t('e_times');for(const k of ['not_yet','only_responsible','last_coord','person_exists','needs_other_member','already_member','invite_invalid','confirm_mismatch']){if(m.includes(k))return t('e_'+k)}return t('genericErr')}
async function act(fn,okMsg){try{await fn();await load();render(true);if(okMsg)toast(okMsg);return true}catch(e){console.error(e);toast(errText(e));return false}}

// ===== Componentes =====
function ring(){
  const o=open(),total=o.length||1,R=118,C=160,gap=.05;
  const parts=family().map(m=>({m,n:o.filter(x=>x.who_member===m.id).length})).filter(p=>p.n).map(p=>({n:p.n,c:color(p.m),l:ini(p.m.display_name),name:p.m.display_name}));
  const un=o.filter(x=>!x.who_member).length;if(un)parts.push({n:un,c:'var(--yolk)',l:'?',name:t('unassigned')});
  let a=-Math.PI/2,out='';const b=[];
  const pt=(an,r=R)=>[(C+r*Math.cos(an)).toFixed(1),(C+r*Math.sin(an)).toFixed(1)];
  if(!parts.length)out=`<circle cx="${C}" cy="${C}" r="${R}" fill="none" stroke="rgba(255,255,255,.2)" stroke-width="30"/>`;
  parts.forEach(p=>{const span=p.n/total*Math.PI*2,s=a+gap,e=a+span-gap,[x1,y1]=pt(s),[x2,y2]=pt(e);
    out+=parts.length===1?`<circle cx="${C}" cy="${C}" r="${R}" fill="none" stroke="${p.c}" stroke-width="30"/>`:`<path d="M${x1} ${y1}A${R} ${R} 0 ${span-2*gap>Math.PI?1:0} 1 ${x2} ${y2}" fill="none" stroke="${p.c}" stroke-width="30"/>`;
    const [bx,by]=pt(a+span/2);b.push(`<circle cx="${bx}" cy="${by}" r="21" fill="#fff" stroke="${p.c}" stroke-width="4"/><text x="${bx}" y="${+by+6}" text-anchor="middle" font-size="17" font-weight="700" fill="#241B3F">${esc(p.l)}</text>`);a+=span});
  const desc=parts.map(p=>p.name+CS()+p.n).join(', ');
  return `<svg viewBox="0 0 320 320" role="img" aria-label="${esc(t('openTasks')+'. '+desc)}">${out}${b.join('')}<text x="160" y="148" text-anchor="middle" fill="#fff" font-family="var(--display)" font-weight="800" font-size="29">${esc(firstName().slice(0,14))}</text><text x="160" y="187" text-anchor="middle" fill="#fff" font-size="33" font-weight="700">${o.length}</text><text x="160" y="209" text-anchor="middle" fill="#D8D3EE" font-size="15">${esc(t('openTasks'))}</text></svg>`;
}
function taskMeta(x){return `<div class="meta"><span>${esc(t('due2',day(x.due)))}</span>${notYet(x)&&x.who_member===(me()||{}).id?`<span class="tag plain">${esc(t('availOn',day(x.due)))}</span>`:''}${isLate(x)?`<span class="tag late">${t('late')}</span>`:''}${x.priority==='high'?`<span class="tag high">${t('highTag')}</span>`:''}${!x.who_member?`<span class="tag yolk">${t('unassigned')}</span>`:''}</div>`}
function eventRow(e,showDate,canDel){const m=member(e.who_member);return `<li class="row wrap-sm">${av(e.who_member)}<div class="grow"><div class="title">${esc(e.title)}</div><div class="meta"><span>${showDate?esc(day(e.date))+', ':''}${hm(e.time)}</span><span>${t(e.type)}</span>${m?`<span>${esc(m.display_name)}</span>`:`<span class="tag yolk">${t('noCompanion')}</span>`}</div></div>${!m&&canEdit()?`<button class="btn small ghost" data-act="takeEvent" data-id="${e.id}">${t('take')}</button>`:''}${canDel&&canEdit()?`<button class="mini" data-act="delEvent" data-id="${e.id}">${t('del')}</button>`:''}</li>`}
const notYet=x=>!x.done_at&&x.due>today();
function taskRow(x,canDel){return `<li class="row wrap-sm${x.done_at?' done':''}${isLate(x)?' late':''}"><button class="check" data-act="toggle" data-id="${x.id}" aria-pressed="${!!x.done_at}" aria-label="${esc(t('markDone',x.title)+(notYet(x)?'. '+t('availOn',day(x.due)):''))}"${canEdit()&&x.who_member===me().id&&!notYet(x)?'':' disabled'}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 13l4.5 4.5L19 7"/></svg></button><div class="grow"><div class="title">${esc(x.title)}</div>${taskMeta(x)}</div>${canEdit()&&!x.done_at?`<select data-change="assign" data-id="${x.id}" aria-label="${esc(t('assignTo')+CS()+x.title)}">${opts(memOpts(),x.who_member||'')}</select>`:av(x.who_member,1)}${canDel===true&&canEdit()?`<button class="mini" data-act="delTask" data-id="${x.id}">${t('del')}</button>`:''}</li>`}
function head(k,sub,action){return `<div class="head"><div><h1>${t(k)}</h1>${sub?`<p>${esc(sub)}</p>`:''}</div>${action||''}</div>`}
function block(title,rows){return `<section class="sheet"><h2>${esc(title)}</h2>${rows.length?`<ul>${rows.join('')}</ul>`:`<p class="empty">${t('none')}</p>`}</section>`}
function docTag(x){if(!x.exp)return '';const lbl=esc(t('expiresOn',fmt(x.exp,{day:'numeric',month:'short',year:'numeric'})));if(x.exp<today())return `<span class="tag late">${t('expired')}</span>`;return x.exp<=d(30)?`<span class="tag yolk">${lbl}</span>`:`<span>${lbl}</span>`}
function sayButtons(){return `<div class="say">${['need','wish','advice','unhappy','other'].map(c=>`<button class="c-${c}" data-act="say" data-id="${c}">${t('c_'+c)}</button>`).join('')}</div>`}
const visLabel=v=>v.vis==='family'?t('vFam'):v.vis==='private'?t('vMe'):t('vOnly',(member(v.vis_member)||{}).display_name||'');
const visVal=v=>v.vis==='member'?v.vis_member:v.vis;
const visOpts=priv=>[['family',t('vFam')],...family().map(m=>[m.id,t('vOnly',m.display_name)]),...(priv?[['private',t('vMe')]]:[])];
const parseVis=x=>x==='family'||x==='private'?{vis:x,vis_member:null}:{vis:'member',vis_member:x};
const voicesSorted=()=>[...D.voices].sort((a,b)=>b.created_at.localeCompare(a.created_at));
function voiceItem(v){const st={new:'yolk',progress:'plain',done:'ok'}[v.status],reps=D.replies.filter(r=>r.voice_id===v.id).sort((a,b)=>a.created_at.localeCompare(b.created_at));
 return `<li class="voice c-${v.cat}"><div class="meta"><span class="tag plain">${t('c_'+v.cat)}</span><span>${esc(day(stamp(v.created_at).date))}</span><span class="tag ${st}">${t('st_'+v.status)}</span><span>${esc(visLabel(v))}</span></div><p class="said">${esc(v.body)}</p>${v.via_member&&member(v.via_member)?`<p class="note">${esc(t('via',member(v.via_member).display_name))}</p>`:''}
 ${reps.map(r=>{const m=member(r.author);return `<div class="reply">${av(r.author,1)}<div class="grow"><b>${esc(m?m.display_name:'')}</b> <span class="note">${esc(day(stamp(r.created_at).date))}</span><p style="overflow-wrap:anywhere">${esc(r.sys_key?t(r.sys_key,r.sys_what):r.body)}</p></div></div>`}).join('')}
 <div class="vactions">${canWrite()&&v.vis!=='private'?`<button class="btn small ghost" data-act="replyVoice" data-id="${v.id}">${t('reply')}</button>`:''}${canEdit()?`<button class="btn small ghost" data-act="voiceTask" data-id="${v.id}">${t('toTask')}</button><select data-change="voiceSt" data-id="${v.id}" aria-label="${t('status')}">${opts([['new',t('st_new')],['progress',t('st_progress')],['done',t('st_done')]],v.status)}</select>`:''}${speaksFor()?`<select data-change="voiceVis" data-id="${v.id}" aria-label="${t('who_reads')}">${opts(visOpts(true),visVal(v))}</select><button class="btn small ghost" data-act="delVoice" data-id="${v.id}">${t('del')}</button>`:''}</div></li>`}
function emergencyCard(){const c=D.contacts.filter(x=>x.grp==='emergency');return `<section class="sheet emg"><h2>${t('emgCard')}</h2><p style="padding-bottom:6px"><b>${esc(D.circle.person_name)}</b>${D.circle.city?', '+esc(D.circle.city):''}</p>${D.circle.birth_date?`<p style="padding-bottom:6px">${esc(t('bornOn',longDate(D.circle.birth_date)))} (${esc(t('years',age(D.circle.birth_date)))})</p>`:''}<p class="note" style="padding-bottom:6px">${esc(t('cardDate',longDate(today())))}</p><ul class="facts">${c.map((x,i)=>`<li class="line"><span>${i===0?`<b>${t('emgCallFirst')}${CL()}</b> `:''}${esc(x.name)}${x.what?', '+esc(x.what):''}</span><b>${esc(x.phone)}</b></li>`).join('')}${D.needs.map(n=>`<li>${esc(n.body)}</li>`).join('')}${D.practical.map(p=>`<li>${esc(p.body)}</li>`).join('')}</ul><p style="padding:8px 0"><button class="btn small ghost" data-act="copyCard">${t('copyCard')}</button></p></section>`}
function weekData(){return{done:D.tasks.filter(x=>x.done_at&&x.done_at>=d(-7)),pend:open().sort((a,b)=>a.due.localeCompare(b.due)),ev:D.events.filter(e=>e.date>=today()&&e.date<=d(7)).sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time)),log:D.journal.filter(j=>j.date>=d(-7)).sort((a,b)=>b.date.localeCompare(a.date)),voice:D.voices.filter(v=>v.vis==='family'&&stamp(v.created_at).date>=d(-7))}}

// ===== Medicamentos, reparto, reunión =====
const nowHM=()=>{const x=new Date();return String(x.getHours()).padStart(2,'0')+':'+String(x.getMinutes()).padStart(2,'0')};
const addMin=(v,n)=>{const [h,m]=v.split(':').map(Number),q=h*60+m+n;return String(Math.floor(q/60)%24).padStart(2,'0')+':'+String(q%60).padStart(2,'0')};
const medsActive=()=>(D.meds||[]).filter(m=>m.active!==false);
const slots=m=>String(m.times||'').split(',').map(s=>s.trim()).filter(s=>/^\d{1,2}:\d{2}$/.test(s)).map(s=>s.padStart(5,'0')).sort();
const isLateSlot=(dd,time)=>dd<today()||(dd===today()&&nowHM()>addMin(time,60));
function dosesOn(dd){return medsActive().flatMap(m=>slots(m).map(time=>{const log=(D.med_logs||[]).find(l=>l.med_id===m.id&&l.date===dd&&l.time===time);return{m,time,log,late:!log&&isLateSlot(dd,time)}})).sort((a,b)=>a.time.localeCompare(b.time))}
const canDose=()=>canEdit()||isPerson();
const giverOpts=()=>[['',t('unassigned')],...family().filter(m=>m.role!=='viewer').map(m=>[m.id,m.display_name]),...D.members.filter(m=>m.role==='person').map(m=>[m.id,t('selfGiver',m.display_name)])];
function doseRow(x){const by=x.log&&member(x.log.given_by);
 return `<li class="row wrap-sm"><div class="grow"><div class="title">${esc(x.m.name)} <span class="note">${esc(x.m.dose||'')}</span></div><div class="meta"><span>${x.time}</span>${x.log?(x.log.status==='given'?`<span class="tag ok">${esc(t('givenBy',by?by.display_name:'',hm(x.log.given_at)))}</span>`:`<span class="tag late">${t('skipped')}</span>`):x.late?`<span class="tag late">${t('doseLate')}</span>`:`<span class="tag plain">${t('pendingDose')}</span>`}${x.m.giver&&member(x.m.giver)?`<span>${esc(t('giverOf',member(x.m.giver).display_name))}</span>`:`<span class="tag yolk">${t('unassigned')}</span>`}${x.m.note?`<span>${esc(x.m.note)}</span>`:''}</div></div>${!x.log&&canDose()?`<button class="btn small" data-act="giveDose" data-id="${esc(x.m.id+'|'+x.time)}">${isPerson()?t('tookIt'):t('given')}</button><button class="mini" data-act="skipDose" data-id="${esc(x.m.id+'|'+x.time)}">${t('skipped')}</button>`:''}</li>`}
const WEEKMS=7*864e5;
const wkIdx=s=>{const b=dt(s);b.setDate(b.getDate()-((b.getDay()+6)%7));return Math.round((dt(weekStart())-b)/WEEKMS)};
const carers=()=>family().filter(m=>m.role!=='viewer');
function shareData(){
 const fam=carers(),w=[...Array(8)].map(()=>({}));
 const add=(i,m,min)=>{if(i<0||i>7||!m)return;w[i][m]=(w[i][m]||0)+min};
 D.tasks.forEach(x=>{if(x.done_at)add(wkIdx(x.done_at),x.done_by,x.minutes||30)});
 D.events.forEach(e=>{if(e.date<=today()&&e.who_member&&e.type!=='reminder')add(wkIdx(e.date),e.who_member,60)});
 const tot4={};let all4=0;for(let i=0;i<4;i++)for(const m in w[i]){tot4[m]=(tot4[m]||0)+w[i][m];all4+=w[i][m]}
 let warn=null;
 if(fam.length>1){const tops=[1,2,3].map(i=>{const tt=Object.values(w[i]).reduce((a,b)=>a+b,0);if(!tt)return null;const [m,v]=Object.entries(w[i]).sort((a,b)=>b[1]-a[1])[0];return v/tt>=.5?{m,p:v/tt}:null});
  if(tops.every(x=>x)&&tops.every(x=>x.m===tops[0].m)){const mm=member(tops[0].m);if(mm)warn={m:mm,p:Math.round(tops.reduce((a,x)=>a+x.p,0)/3*100)}}}
 return{w,tot4,all4,warn};
}
function shareSection(){const s=shareData(),fam=carers(),max=Math.max(1,...fam.map(m=>s.tot4[m.id]||0)),spm=Math.max(1,...fam.flatMap(q=>[0,1,2,3,4,5,6,7].map(i=>s.w[i][q.id]||0)));
 return `<section class="sheet"><h2>${t('shareT')}</h2><p class="note">${t('shareSub')}</p>${s.warn?`<p class="warn-line" style="margin:8px 0">${esc(t('shareWarn',s.warn.m.display_name,s.warn.p))}</p>`:''}<ul class="bars share">${fam.map(m=>{const v=s.tot4[m.id]||0,p=s.all4?Math.round(v/s.all4*100):0;return `<li>${av(m.id,1)}<span>${esc(m.display_name)}</span><span class="b"><i style="width:${v/max*100}%;background:${color(m)}"></i></span><em>${p}%</em><small class="note">${esc(t('hrs',(v/60).toFixed(v%60?1:0)))}</small><span class="spark" aria-hidden="true">${[7,6,5,4,3,2,1,0].map(i=>`<i style="height:${Math.max(2,(s.w[i][m.id]||0)/spm*28)}px;background:${color(m)}"></i>`).join('')}</span></li>`}).join('')}</ul><p class="note" style="padding:6px 0 10px">${t('estNote')} ${t('sparkNote')}</p></section>`}
let lastAgenda={};
function agendaItems(){
 const it=[];
 voicesSorted().filter(v=>v.status!=='done').forEach(v=>it.push({key:'voice:'+v.id,src:t('src_voice',firstName()),title:v.body}));
 open().filter(isLate).forEach(x=>it.push({key:'late:'+x.id,src:t('src_late'),title:x.title}));
 open().filter(x=>x.relief_member&&!isLate(x)).forEach(x=>it.push({key:'relief:'+x.id,src:t('src_relief'),title:x.title}));
 open().filter(x=>!x.who_member&&!x.relief_member&&!isLate(x)).forEach(x=>it.push({key:'un:'+x.id,src:t('src_un'),title:x.title}));
 D.events.filter(e=>!e.who_member&&e.date>=today()).forEach(e=>it.push({key:'ev:'+e.id,src:t('src_un'),title:e.title+' ('+day(e.date)+')'}));
 const sh=shareData();if(sh.warn)it.push({key:'load:'+weekStart(),src:t('src_load'),title:t('shareWarn',sh.warn.m.display_name,sh.warn.p)});
 const miss=[1,2,3,4,5,6,7].map(i=>d(-i)).flatMap(dosesOn).filter(x=>x.late||(x.log&&x.log.status==='skipped')).length;
 if(miss)it.push({key:'dose:'+weekStart(),src:t('src_dose'),title:t('missN',miss)});
 D.documents.filter(x=>x.exp&&x.exp<=d(30)).forEach(x=>it.push({key:'doc:'+x.id,src:t('src_doc'),title:x.name}));
 return it;
}
const NK=['n_task','n_dose','n_imp','n_relief','n_week'];
const prefRow=k=>(D.notif_prefs||[]).find(x=>x.user_id===session.user.id&&x.key===k);
const prefOn=k=>{const p=prefRow(k);return p?!!p.on:true};
function notifSection(){return `<section class="sheet"><h2>${t('notifT')}</h2><p class="note">${t('notifSub')}${DEMO?' '+t('notifDemo'):''}</p><p class="note" style="padding-top:6px">${t('notifLimit')}</p><ul>${NK.map(k=>`<li class="row"><button class="check" data-act="pref" data-id="${k}" aria-pressed="${prefOn(k)}" aria-label="${esc(t(k))}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 13l4.5 4.5L19 7"/></svg></button><div class="grow">${t(k)}</div></li>`).join('')}</ul></section>`}
function demoTips(){if(!DEMO||store.get('cc-tips')==='0'||isPerson())return '';const tips=[['tip1','meds'],['tip2','meeting'],['tip3','summary'],['tip4','voice']];
 return `<section class="sheet"><h2>${t('demoTipsT')}</h2><ul class="facts">${tips.map(([k,v])=>`<li class="line"><span>${t(k)}</span><button class="btn small ghost" data-nav="${v}">${t('see')}</button></li>`).join('')}</ul><p style="padding:8px 0"><button class="mini" data-act="hideTips">${t('hideTips')}</button></p></section>`}

// ===== Vistas =====
const V={
home(){
  if(isPerson())return personHome();
  const o=open(),assigned=family().map(m=>({m,n:o.filter(x=>x.who_member===m.id).length}));
  const top=[...assigned].sort((a,b)=>b.n-a.n)[0],over=top&&top.n>=3&&top.n/o.length>=.4;
  const un=o.filter(x=>!x.who_member).length,nl=n=>n===1?t('nOpen1'):t('nOpen',n);
  const lateT=o.filter(isLate),noE=D.events.filter(e=>!e.who_member&&e.date>=today()),unT=o.filter(x=>!x.who_member);
  const docW=D.documents.filter(x=>x.exp&&x.exp<=d(30));
  const todayE=D.events.filter(e=>e.date===today()).sort((a,b)=>a.time.localeCompare(b.time)),todayT=o.filter(x=>x.due===today());
  const vNew=voicesSorted().filter(v=>v.status==='new');
  const dLate=dosesOn(today()).filter(x=>x.late),dNext=dosesOn(today()).filter(x=>!x.log&&!x.late),shw=shareData().warn;
  const att=[...dLate.map(doseRow),...(shw?[`<li class="row wrap-sm"><div class="grow"><div class="title">${esc(t('shareWarn',shw.m.display_name,shw.p))}</div><div class="meta"><span class="tag yolk">${t('shareT')}</span></div></div><button class="btn small ghost" data-nav="summary">${t('see')}</button></li>`]:[]),...vNew.map(v=>`<li class="row wrap-sm">${avP()}<div class="grow"><div class="title">${esc(v.body)}</div><div class="meta"><span class="tag plain">${t('c_'+v.cat)}</span></div></div><button class="btn small ghost" data-nav="voice">${t('see')}</button></li>`),
   ...(D.circle.capacity_status==='pending'?[`<li class="row wrap-sm"><div class="grow"><div class="title">${t('capPending')}</div></div><button class="btn small ghost" data-nav="profile">${t('see')}</button></li>`]:[]),
   ...lateT.map(x=>`<li class="row wrap-sm">${av(x.who_member)}<div class="grow"><div class="title">${esc(x.title)}</div>${taskMeta(x)}</div></li>`),
   ...noE.map(e=>eventRow(e,true)),
   ...unT.filter(x=>!isLate(x)).map(x=>`<li class="row wrap-sm">${av(null)}<div class="grow"><div class="title">${esc(x.title)}</div>${taskMeta(x)}</div>${canEdit()?`<button class="btn small ghost" data-act="takeTask" data-id="${x.id}">${t('take')}</button>`:''}</li>`),
   ...docW.map(x=>`<li class="row"><div class="grow"><div class="title">${esc(x.name)}</div><div class="meta">${docTag(x)}</div></div></li>`)];
  return `<section class="hero"><div>${ring()}</div><div><h1>${esc(t('hello',me().display_name))}</h1><p class="sub">${esc(t('circleOf',firstName()))}</p>
  <div class="share">${assigned.map(({m,n})=>`<button data-act="filterWho" data-id="${m.id}">${av(m.id)}<span><b>${esc(m.display_name)}</b><small>${esc(m.city||'')}</small></span><span>${esc(nl(n))}</span></button>`).join('')}${un?`<button data-act="filterOpen">${av(null)}<span><b>${t('unassigned')}</b></span><span>${esc(nl(un))}</span></button>`:''}</div>
  ${over?`<p class="warn-line">${esc(t('overload',top.m.display_name,top.n,o.length))}</p>`:''}</div></section>
  ${lateT.length?`<section class="alert-late" role="status"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v6M12 16.5v.5"/></svg><b>${esc(lateT.length===1?t('lateBanner1'):t('lateBanner',String(lateT.length)))}</b><button class="btn small" data-act="seeLate">${t('see')}</button></section>`:''}
  ${D.members.length===1&&isCoord()?`<section class="callout"><b>${t('inviteFirst')}</b><button class="btn small" data-act="invite">${t('invite')}</button></section>`:''}
  ${demoTips()}<div class="cols"><section class="sheet"><h2>${t('today')}</h2>${todayE.length+todayT.length+dNext.length?`<ul>${todayE.map(e=>eventRow(e)).join('')}${dNext.map(doseRow).join('')}${todayT.map(x=>taskRow(x)).join('')}</ul>`:`<p class="empty">${t('nothingToday')}</p>`}</section>
  <section class="sheet"><h2>${t('attention')}</h2>${att.length?`<ul>${att.join('')}</ul>`:`<p class="empty">${t('allClear')}</p>`}</section></div>`;
},
calendar(){
  const first=new Date(calY,calM,1),lead=(first.getDay()+6)%7,days=new Date(calY,calM+1,0).getDate(),mon=new Date(2024,0,1);
  const heads=[...Array(7)].map((_,i)=>{const x=new Date(mon);x.setDate(1+i);return `<span>${esc(new Intl.DateTimeFormat(LOC[li],{weekday:'short'}).format(x))}</span>`}).join('');
  let cells='<div></div>'.repeat(lead);
  for(let n=1;n<=days;n++){const s=iso(new Date(calY,calM,n)),ev=D.events.filter(e=>e.date===s),tk=D.tasks.filter(x=>x.due===s&&!x.done_at);cells+=`<button data-act="pickDay" data-id="${s}" aria-pressed="${s===selDate}" class="${s===today()?'today':''}" aria-label="${esc(fmt(s,{day:'numeric',month:'long'})+CS()+t('calCount',String(ev.length),String(tk.length)))}">${n}<span class="dots-d">${ev.length?`<i class="${ev.some(e=>!e.who_member)?'open':''}"></i>`:''}${tk.length?`<i class="task${tk.some(isLate)?' late':''}"></i>`:''}</span></button>`}
  const selE=D.events.filter(e=>e.date===selDate).sort((a,b)=>a.time.localeCompare(b.time));
  const selT=D.tasks.filter(x=>x.due===selDate&&!x.done_at);
  const up=D.events.filter(e=>e.date>=today()).sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time));
  return head('calendar',null,canEdit()?`<button class="btn" data-act="newEvent">${t('addEvent')}</button>`:'')+`<div class="calview"><section class="sheet calsheet"><div class="calbar"><button class="iconbtn" data-act="calPrev" aria-label="${t('prev')}">‹</button><b>${esc(new Intl.DateTimeFormat(LOC[li],{month:'long',year:'numeric'}).format(first))}</b><button class="iconbtn" data-act="calNext" aria-label="${t('next')}">›</button></div><div class="cal">${heads}${cells}</div><p class="cal-legend"><span><i></i>${t('calLegEv')}</span><span><i class="task"></i>${t('calLegTask')}</span></p><h2 style="padding:8px 0">${esc(day(selDate))}</h2>${selE.length?`<ul>${selE.map(e=>eventRow(e,false,true)).join('')}</ul>`:(selT.length?'':`<p class="empty">${t('noEvents')}</p>`)}${selT.length?`<h3 class="cal-sub">${t('calTasksDay')}</h3><ul>${selT.map(x=>taskRow(x,false)).join('')}</ul>`:''}</section><section class="sheet"><h2>${t('upcoming')}</h2>${up.length?`<ul>${up.map(e=>eventRow(e,true)).join('')}</ul>`:`<p class="empty">${t('emptyEvents')}</p>`}</section></div>`;
},
tasks(){
  let l=D.tasks;
  if(taskFilter==='open')l=open();if(taskFilter==='late')l=D.tasks.filter(isLate);if(taskFilter==='done')l=D.tasks.filter(x=>x.done_at);
  if(taskWho)l=l.filter(x=>x.who_member===taskWho);
  l=[...l].sort((a,b)=>a.due.localeCompare(b.due));
  const hist=D.tasks.filter(x=>x.done_at).sort((a,b)=>b.done_at.localeCompare(a.done_at));
  return head('tasks',null,canEdit()?`<button class="btn" data-act="newTask">${t('addTask')}</button>`:'')+`<div class="chips">${[['all','fAll'],['open','fOpen'],['late','fLate'],['done','fDone']].map(([v,k])=>`<button data-act="tf" data-id="${v}" aria-pressed="${taskFilter===v}">${t(k)}</button>`).join('')}</div>
  <div class="chips">${[{id:null,display_name:t('mAll')},...family()].map(m=>`<button data-act="tw" data-id="${m.id||''}" aria-pressed="${taskWho===m.id}">${esc(m.display_name)}</button>`).join('')}</div>
  <p class="note">${t('onlyResp')}</p><section class="sheet">${l.length?`<ul>${l.map(x=>taskRow(x,true)).join('')}</ul>`:`<p class="empty">${t('noTasks')}</p>`}</section>
  <section class="sheet"><h2>${t('history')}</h2>${hist.length?`<ul>${hist.map(x=>{const by=member(x.done_by);return `<li class="row">${av(x.done_by,1)}<div class="grow"><div class="title">${esc(x.title)}</div><div class="meta"><span>${esc(t('doneBy',by?by.display_name:'',fmt(x.done_at,{day:'numeric',month:'short'})))}</span></div></div></li>`}).join('')}</ul>`:`<p class="empty">${t('emptyList')}</p>`}</section>`;
},
messages(){
  const l=msgFilter==='imp'?D.messages.filter(m=>m.important):D.messages;
  return head('messages')+`<div class="chips">${[['all','mAll'],['imp','mImp']].map(([v,k])=>`<button data-act="mf" data-id="${v}" aria-pressed="${msgFilter===v}">${t(k)}</button>`).join('')}</div><section class="sheet">${l.length?`<ul>${l.map(m=>{const sys=!!m.sys_key,a=member(m.author),s=stamp(m.created_at);return `<li class="msg${m.important?' important':''}">${sys?'<span class="av sm sys" aria-hidden="true">CC</span>':av(m.author,1)}<div class="grow bubble"><div class="meta"><b style="color:var(--ink)">${sys?t('system'):esc(a?a.display_name:'')}</b><span>${esc(day(s.date))}, ${s.time}</span>${m.important?`<span class="tag yolk">${t('important')}</span>`:''}</div><p style="overflow-wrap:anywhere">${esc(sys?t(m.sys_key,m.sys_who,m.sys_what||''):m.body)}</p><div class="msgact">${canWrite()?`<button class="star" data-act="star" data-id="${m.id}">${m.important?t('unmarkImp'):t('markImp')}</button>`:''}${!sys&&m.author===me().id?`<button class="star" data-act="delMsg" data-id="${m.id}">${t('del')}</button>`:''}</div></div></li>`}).join('')}</ul>`:`<p class="empty">${t('emptyList')}</p>`}${canWrite()?`<form class="composer" id="composer"><textarea id="msg-text" aria-label="${t('compose')}" placeholder="${t('compose')}" required></textarea><button class="btn">${t('send')}</button></form>`:`<p class="empty">${t('readOnly')}</p>`}</section>`;
},
voice(){
  const all=voicesSorted(),l=vFilter==='all'?all:all.filter(v=>v.status===vFilter);
  const chips=`<div class="chips">${[['all','mAll'],['new','st_new'],['progress','st_progress'],['done','st_done']].map(([v,k])=>`<button data-act="vf" data-id="${v}" aria-pressed="${vFilter===v}">${t(k)}</button>`).join('')}</div>`;
  const wish=`<section class="sheet"><h2>${t('wishes')}</h2>${D.wishes.length?`<ul class="facts">${D.wishes.map(w=>`<li class="line"><span>${esc(w.body)}</span>${speaksFor()?`<button class="mini" data-act="delWish" data-id="${w.id}">${t('del')}</button>`:''}</li>`).join('')}</ul>`:`<p class="empty">${t('noWishes')}</p>`}${speaksFor()?`<p style="padding:8px 0"><button class="btn small ghost" data-act="newWish">${t('addWish')}</button></p>`:''}</section>`;
  const list=`<section class="sheet"><h2>${speaksFor()&&isPerson()?t('said'):t('saidFam')}</h2>${l.length?`<ul>${l.map(voiceItem).join('')}</ul>`:`<p class="empty">${t('noVoice')}</p>`}</section>`;
  if(isPerson())return head('voice',t('voiceMine'))+sayButtons()+`<p class="note">${t('emgNote')}</p>${chips}${list}${wish}`;
  return `<div class="head"><div><h1>${esc(t('voiceOf',firstName()))}</h1><p>${t('voiceSub')}</p></div>${canEdit()?`<button class="btn ghost" data-act="behalf">${t('onBehalf')}</button>`:''}</div>${D.members.some(m=>m.role==='person')?'':`<section class="callout"><b>${esc(t('voiceHowSelf',firstName()))}</b>${isCoord()?`<button class="btn small" data-act="invite" data-id="person">${t('invitePerson')}</button>`:''}</section>`}${wish}${chips}${list}`;
},
foryou(){
  const hist=[...D.moods].filter(m=>m.user_id===session.user.id).sort((a,b)=>a.week_start.localeCompare(b.week_start)),levels=hist.map(m=>m.level);
  const curRow=hist.find(m=>m.week_start===weekStart()),cur=curRow?curRow.level:null,tired=levels.length>=2&&levels.slice(-2).every(x=>x>=3);
  const relief=open().filter(x=>x.relief_member);
  const btn=canEdit()?`<button class="btn small" data-act="newRelief">${t('relief')}</button>`:'';
  return head('foryou',t('fySub'))+`<div class="cols"><section class="sheet"><h2>${t('how')}</h2><div class="moods">${[1,2,3,4].map(n=>`<button data-act="mood" data-id="${n}" aria-pressed="${cur===n}">${t('m'+n)}</button>`).join('')}</div>
  ${levels.length?`<p class="note">${t('last4')}</p><div class="trend" role="img" aria-label="${esc(levels.slice(-6).map(n=>t('m'+n)).join(', '))}">${levels.slice(-6).map(n=>`<i style="height:${n*12}px"></i>`).join('')}</div>`:''}
  ${cur===4?`<div class="callout"><b>${t('limitCall')}</b>${btn}</div>`:tired?`<div class="callout"><b>${t('tiredCall')}</b>${btn}</div>`:''}</section>
  <section class="sheet"><h2>${t('helpLines')}</h2><ul class="facts">${helpLines().map(([l,n])=>`<li class="line"><span>${l}</span><b>${n}</b></li>`).join('')}</ul></section></div>
  <section class="sheet"><h2>${t('relief')}</h2><p class="note">${t('reliefSub')}</p>${canEdit()?`<p style="padding:10px 0"><button class="btn" data-act="newRelief">${t('relief')}</button></p>`:''}<h3 style="font-size:1rem;padding:6px 0;color:var(--muted)">${t('reliefOpen')}</h3>${relief.length?`<ul>${relief.map(x=>`<li class="row wrap-sm">${av(x.relief_member,1)}<div class="grow"><div class="title">${esc(x.title)}</div>${taskMeta(x)}</div>${canEdit()&&x.relief_member!==me().id&&!x.who_member?`<button class="btn small ghost" data-act="takeTask" data-id="${x.id}">${t('take')}</button>`:''}</li>`).join('')}</ul>`:`<p class="empty">${t('noRelief')}</p>`}</section>`;
},
journal(){
  const cats=[['all','mAll'],['obs','obs'],['need','needChange'],['visit','visit'],['major','major']],label={obs:'obs',need:'needChange',visit:'visit',major:'major'};
  const l=[...D.journal].filter(j=>jFilter==='all'||j.cat===jFilter).sort((a,b)=>b.date.localeCompare(a.date)||b.created_at.localeCompare(a.created_at));
  return head('journal',t('jsubtitle'),canEdit()?`<button class="btn" data-act="newEntry">${t('addEntry')}</button>`:'')+`<div class="chips">${cats.map(([v,k])=>`<button data-act="jf" data-id="${v}" aria-pressed="${jFilter===v}">${t(k)}</button>`).join('')}</div><section class="sheet">${l.length?`<ul class="tl">${l.map(j=>`<li class="${j.cat}"><div class="meta"><b style="color:var(--ink)">${esc(day(j.date))}</b><span class="tag plain">${t(label[j.cat])}</span><span>${esc((member(j.author)||{}).display_name||'')}</span></div><p style="overflow-wrap:anywhere">${esc(j.body)}</p></li>`).join('')}</ul>`:`<p class="empty">${t('noEntries')}</p>`}</section>`;
},
documents(){
  const groups=[['emergency',t('emergency')],['family',t('fam')],['pro',t('pro')]];
  return head('documents',null,canEdit()?`<button class="btn" data-act="newDoc">${t('addDoc')}</button>`:'')+emergencyCard()+`<div class="cols"><section class="sheet"><h2>${t('docs')}</h2>${D.documents.length?`<ul>${D.documents.map(x=>`<li class="row wrap-sm docrow"><div class="grow"><div class="title">${esc(x.name)}</div><div class="meta">${docTag(x)}<span class="tag plain">${x.vis==='coord'?t('vCoord'):t('vAll')}</span></div></div><div class="docctl">${x.storage_path?`<button class="btn small ghost" data-act="openDoc" data-id="${x.id}">${t('open')}</button>`:''}${isCoord()?`<select data-change="docVis" data-id="${x.id}" aria-label="${t('access')}">${opts([['all',t('vAll')],['coord',t('vCoord')]],x.vis)}</select><button class="mini" data-act="delDoc" data-id="${x.id}">${t('del')}</button>`:''}</div></li>`).join('')}</ul>`:`<p class="empty">${t('emptyList')}</p>`}</section>
  <div style="display:flex;flex-direction:column;gap:22px"><section class="sheet"><h2>${t('contacts')}</h2>${groups.map(([g,label])=>{const l=D.contacts.filter(c=>c.grp===g);return l.length?`<h3 style="font-size:1rem;padding:8px 0 2px;color:var(--muted)">${label}</h3><ul>${l.map(c=>`<li class="row wrap-sm"><div class="grow"><div class="title">${esc(c.name)}</div><div class="meta"><span>${esc(c.what||'')}</span></div></div><a href="tel:${esc(String(c.phone).replace(/[^0-9+]/g,''))}" style="white-space:nowrap">${esc(c.phone)}</a>${canEdit()?`<button class="mini" data-act="delContact" data-id="${c.id}">${t('del')}</button>`:''}</li>`).join('')}</ul>`:''}).join('')}${canEdit()?`<p style="padding:8px 0"><button class="btn small ghost" data-act="newContact">${t('addContact')}</button></p>`:''}</section>
  <section class="sheet"><h2>${t('practical')}</h2>${D.practical.length?`<ul class="facts">${D.practical.map(p=>`<li class="line"><span>${esc(p.body)}</span>${canEdit()?`<button class="mini" data-act="delPractical" data-id="${p.id}">${t('del')}</button>`:''}</li>`).join('')}</ul>`:`<p class="empty">${t('emptyList')}</p>`}${canEdit()?`<p style="padding:8px 0"><button class="btn small ghost" data-act="newPractical">${t('addPractical')}</button></p>`:''}</section></div></div>`;
},
profile(){
  const c=D.circle,rep=member(c.rep_member_id),pendInv=[...D.invites].sort((a,b)=>String(b.created_at||'').localeCompare(String(a.created_at||''))).slice(0,20);
  const capDetails=rep?`<ul class="facts"><li>${esc(t('capRep',rep.display_name))}</li><li>${esc(t('capBasis',t(c.rep_basis)))}</li>${c.rep_date?`<li>${esc(fmt(c.rep_date,{day:'numeric',month:'long',year:'numeric'}))}</li>`:''}${c.rep_note?`<li>${esc(c.rep_note)}</li>`:''}${c.rep_private_access?`<li>${t('capPrivY')}</li>`:''}</ul>`:'';
  const canEnd=isCoord()||(isPerson()&&c.rep_basis==='family_agreement');
  const canConfirm=c.capacity_status==='pending'&&canEdit()&&me().id!==c.rep_proposed_by&&me().id!==c.rep_member_id;
  const cap=c.capacity_status==='autonomous'?`<p style="padding-bottom:8px">${esc(t('capAuto',firstName()))}</p>${isCoord()?`<p style="padding-bottom:10px"><button class="btn small ghost" data-act="proposeRep">${t('capRegister')}</button></p>`:''}`:`<p style="padding-bottom:6px"><span class="tag ${c.capacity_status==='pending'?'yolk':'plain'}">${c.capacity_status==='pending'?t('capPending'):t('capActive')}</span></p>${capDetails}<div class="vactions" style="margin-bottom:10px">${canConfirm?`<button class="btn small" data-act="confirmRep">${t('capConfirm')}</button>`:''}${isCoord()&&c.capacity_status==='represented'&&c.rep_basis==='family_agreement'?`<button class="btn small" data-act="proposeRep">${t('capCourt')}</button>`:''}${canEnd?`<button class="btn small ghost" data-act="endRep">${c.capacity_status==='pending'?t('capCancel'):t('capEnd')}</button>`:''}</div>`;
  return `<div class="head"><div><h1>${esc(c.person_name)}</h1><p>${c.birth_date?esc(t('bornOn',longDate(c.birth_date))+' ('+t('years',age(c.birth_date))+')'):''}${c.birth_date&&c.city?', ':''}${esc(c.city||'')}</p>${isCoord()&&D.priv&&(D.priv.person_phone||D.priv.person_email)?`<p class="pcontact">${D.priv.person_phone?`<a href="tel:${esc(D.priv.person_phone.replace(/[^0-9+]/g,''))}">${esc(D.priv.person_phone)}</a>`:''}${D.priv.person_email?`<a href="mailto:${esc(D.priv.person_email)}">${esc(D.priv.person_email)}</a>`:''}<span class="tag plain">${t('coordOnly')}</span></p>`:''}</div><div class="vactions">${isCoord()?`<button class="btn" data-act="invite">${t('invite')}</button><button class="btn ghost" data-act="editPerson">${t('editPerson')}</button>`:''}<button class="btn ghost" data-act="pdf">${t('pdfBtn')}</button><button class="btn ghost" data-act="signOut">${t('signOut')}</button></div></div>
  ${isCoord()?'':`<p class="note">${t('inviteOnlyCoord')}</p>`}<div class="cols"><section class="sheet"><h2>${t('needs')}</h2>${D.needs.length?`<ul class="facts">${D.needs.map(n=>`<li class="line"><span>${esc(n.body)}</span>${canWrite()?`<button class="mini" data-act="delNeed" data-id="${n.id}">${t('del')}</button>`:''}</li>`).join('')}</ul>`:`<p class="empty">${t('emptyList')}</p>`}${canWrite()?`<p style="padding:8px 0"><button class="btn small ghost" data-act="newNeed">${t('addNeed')}</button></p>`:''}</section>
  <section class="sheet"><h2>${t('family')}</h2><ul>${D.members.map(m=>`<li class="row wrap-sm">${av(m.id)}<div class="grow"><div class="title">${esc(m.display_name)}</div><div class="meta"><span>${esc(m.relation||'')}</span><span>${esc(m.city||'')}</span></div></div>${isCoord()&&m.id!==me().id&&m.role!=='person'?`<select data-change="role" data-id="${m.id}" aria-label="${esc(t('role')+CS()+m.display_name)}">${opts([['coord',t('coord')],['fam',t('fam')],['viewer',t('viewer')]],m.role)}</select>`:`<span class="tag plain">${roleName(m.role)}</span>`}${isCoord()&&m.id!==me().id?`<button class="mini" data-act="removeMember" data-id="${m.id}">${t('remove')}</button>`:''}</li>`).join('')}</ul><p class="note" style="padding:8px 0">${t('permHelp')}</p>
  ${pendInv.length?`<h3 style="font-size:1rem;padding:6px 0;color:var(--muted)">${t('invitesT')}</h3><ul>${pendInv.map(i=>{const st=invState(i);return `<li class="row wrap-sm"><div class="grow"><div class="title">${esc(i.display_name)}</div><div class="meta"><span class="tag ${st==='pending'?'yolk':st==='expired'?'late':'okt'}">${t('inv_'+st)}</span><span>${esc(t('invCreated',i.created_at?fmt(iso(new Date(i.created_at)),{day:'numeric',month:'short'}):''))}</span>${i.contact?`<span>${esc(i.contact)}</span>`:''}<span>${roleName(i.role)}</span></div></div>${st==='pending'?`<button class="btn small ghost" data-act="showInvite" data-id="${i.id}">${t('resend')}</button><button class="mini" data-act="revokeInv" data-id="${i.id}">${t('revoke')}</button>`:st==='expired'?`<button class="btn small ghost" data-act="renewInv" data-id="${i.id}">${t('resend')}</button><button class="mini" data-act="revokeInv" data-id="${i.id}">${t('del')}</button>`:''}</li>`}).join('')}</ul>`:''}
  ${isCoord()?`<p class="note" style="padding:4px 0">${t('invShareNote')}</p><p style="padding:0 0 10px"><button class="btn small ghost" data-act="invite">${t('invite')}</button></p>`:''}</section>
  <section class="sheet"><h2>${t('capT')}</h2>${cap}</section>
  <section class="sheet"><h2>${t('agrT')}</h2><p class="note" style="padding-bottom:8px">${t('agrHelp')}</p>${c.family_agreement?`<p style="white-space:pre-wrap;overflow-wrap:anywhere">${esc(c.family_agreement)}</p>${c.family_agreement_date?`<p class="note">${esc(fmt(c.family_agreement_date,{day:'numeric',month:'long',year:'numeric'}))}</p>`:''}`:`<p class="empty">${t('emptyList')}</p>`}${isCoord()?`<p style="padding:8px 0"><button class="btn small ghost" data-act="editAgreement">${t('agrEdit')}</button></p>`:''}</section>
  ${notifSection()}<section class="sheet"><h2>${t('account')}</h2><div class="vactions" style="margin:8px 0 12px"><button class="btn small ghost" data-act="exportData">${t('exportData')}</button><button class="btn small ghost" data-act="signOut">${t('signOut')}</button>${me().role!=='coord'||D.members.filter(m=>m.role==='coord').length>1?`<button class="btn small ghost" data-act="leave">${t('leave')}</button>`:''}${isCoord()?`<button class="btn small ghost" data-act="delCircle">${t('delCircle')}</button>`:''}</div><p style="padding-bottom:10px;display:flex;gap:16px;flex-wrap:wrap"><a href="conditions.html" target="_blank" rel="noopener">${t('termsLink')}</a><a href="privacidad.html" target="_blank" rel="noopener">${t('privacyLink')}</a></p></section>
  ${auditSection()}</div>
  <p class="note">${t('disclaimer')}</p>`;
},
summary(){
  const w=weekData(),max=Math.max(1,...family().map(q=>w.done.filter(x=>x.who_member===q.id).length));
  return head('summary',t('period'),`<button class="btn ghost" data-act="copy">${t('copy')}</button>`)+`<div class="stats"><div><b>${w.done.length}</b><span>${t('doneWeek')}</span></div><div><b>${w.pend.length}</b><span>${t('pendingWeek')}</span></div><div><b>${w.ev.length}</b><span>${t('apptWeek')}</span></div><div><b>${w.log.length}</b><span>${t('logWeek')}</span></div></div>
  <div class="cols">${shareSection()}<section class="sheet" hidden><h2>${t('whoDid')}</h2><ul class="bars">${family().map(m=>{const n=w.done.filter(x=>x.who_member===m.id).length;return `<li>${av(m.id,1)}<span>${esc(m.display_name)}</span><span class="b"><i style="width:${n/max*100}%;background:${color(m)}"></i></span><em>${n}</em></li>`}).join('')}</ul></section>
  ${block(t('apptWeek'),w.ev.map(e=>eventRow(e,true)))}${block(t('pendList'),w.pend.map(x=>`<li class="row">${av(x.who_member,1)}<div class="grow"><div class="title">${esc(x.title)}</div>${taskMeta(x)}</div></li>`))}${block(t('eventsLog'),w.log.map(j=>`<li class="row"><div class="grow"><div class="meta"><b style="color:var(--ink)">${esc(day(j.date))}</b></div><p>${esc(j.body)}</p></div></li>`))}${block(t('voiceWeek',firstName()),w.voice.map(v=>`<li class="row">${avP(1)}<div class="grow"><div class="meta"><span class="tag plain">${t('c_'+v.cat)}</span><span>${esc(day(stamp(v.created_at).date))}</span></div><p>${esc(v.body)}</p></div></li>`))}</div>`;
},
meds(){
  const td=dosesOn(today()),days=[...Array(7)].map((_,i)=>d(i-6));
  return head('meds',t('medsSub'),canEdit()?`<button class="btn" data-act="newMed">${t('addMed')}</button>`:'')+`<div class="cols"><section class="sheet"><h2>${t('todayDoses')}</h2>${td.length?`<ul>${td.map(doseRow).join('')}</ul>`:`<p class="empty">${t('noMeds')}</p>`}</section>
  <section class="sheet"><h2>${t('week7')}</h2>${medsActive().length?`<ul>${medsActive().map(m=>`<li class="row wrap-sm"><div class="grow"><div class="title">${esc(m.name)}</div><div class="meta"><span>${esc(m.dose||'')}</span><span>${esc(slots(m).join(', '))}</span></div><div class="dots">${days.map(dd=>slots(m).map(time=>{const l=(D.med_logs||[]).find(z=>z.med_id===m.id&&z.date===dd&&z.time===time);const c=l?(l.status==='given'?'ok':'miss'):(isLateSlot(dd,time)?'miss':'wait');return `<i class="${c}" title="${esc(fmt(dd,{weekday:'short',day:'numeric'})+' '+time)}"></i>`}).join('')).join('<b></b>')}</div></div>${canEdit()?`<select data-change="medGiver" data-id="${m.id}" aria-label="${esc(t('giverL')+CS()+m.name)}">${opts(giverOpts(),m.giver||'')}</select><button class="mini" data-act="delMed" data-id="${m.id}">${t('del')}</button>`:''}</li>`).join('')}</ul><p class="note" style="padding:6px 0 10px">${t('dotsLegend')}</p>`:`<p class="empty">${t('noMeds')}</p>`}</section></div>`;
},
meeting(){
  const pts=D.meeting_points||[],pend=pts.filter(p=>!p.meeting_id),ms=D.meetings||[],next=ms.filter(m=>m.status==='planned').sort((a,b)=>a.date.localeCompare(b.date))[0];
  const auto=agendaItems().map(i=>({...i,pt:pend.find(p=>p.ref===i.key)}));
  const manual=pend.filter(p=>p.source==='manual').map(p=>({key:'m:'+p.id,src:t('src_manual',(member(p.added_by)||{}).display_name||''),title:p.title,pt:p}));
  const items=[...manual,...auto];lastAgenda={};items.forEach(i=>lastAgenda[i.key]=i);
  const row=i=>`<li class="row wrap-sm"><div class="grow"><div class="meta"><span class="tag plain">${esc(i.src)}</span>${i.pt&&i.pt.decision?`<span class="tag ok">${t('decided')}</span>`:''}</div><div class="title" style="font-weight:400">${esc(i.title)}</div>${i.pt&&i.pt.decision?`<p style="margin-top:4px"><b>${t('decision')}${CL()}</b> ${esc(i.pt.decision)}${i.pt.decision_who&&member(i.pt.decision_who)?' ('+esc(member(i.pt.decision_who).display_name)+')':''}</p>`:''}</div>${canEdit()?`<button class="btn small ghost" data-act="decide" data-id="${esc(i.key)}">${i.pt&&i.pt.decision?t('edit'):t('decide')}</button>`:''}</li>`;
  const past=ms.filter(m=>m.status==='done').sort((a,b)=>b.date.localeCompare(a.date));
  return head('meeting',t('meetingSub'),canWrite()?`<button class="btn" data-act="addPoint">${t('addPoint')}</button>`:'')+`<section class="sheet"><h2>${t('nextMeeting')}</h2><div class="line" style="padding:6px 0 12px"><span>${next?esc(day(next.date)+', '+hm(next.time)):t('noMeeting')}</span>${canEdit()?`<button class="btn small ghost" data-act="scheduleMeeting">${next?t('edit'):t('schedule')}</button>`:''}</div></section>
  <section class="sheet"><h2>${t('agenda')}</h2>${items.length?`<ul>${items.map(row).join('')}</ul>`:`<p class="empty">${t('emptyAgenda')}</p>`}${canEdit()?`<div class="callout" style="background:var(--ground)"><span class="note">${t('closeHelp')}</span><button class="btn small" data-act="closeMeeting">${t('closeMeeting')}</button></div>`:''}</section>
  <section class="sheet"><h2>${t('pastMeetings')}</h2>${past.length?past.map(m=>{const dec=pts.filter(p=>p.meeting_id===m.id&&p.decision);return `<h3 style="font-size:1rem;padding:10px 0 2px">${esc(t('minutesOf',fmt(m.date,{day:'numeric',month:'long',year:'numeric'})))}</h3><ul class="facts">${dec.map(p=>`<li>${esc(p.decision)}${p.decision_who&&member(p.decision_who)?' ('+esc(member(p.decision_who).display_name)+')':''}</li>`).join('')}</ul>`}).join(''):`<p class="empty">${t('emptyList')}</p>`}</section>`;
},
more(){return `<div class="head"><h1>${t('more')}</h1></div><section class="sheet"><ul class="morelist">${navItems().filter(n=>n[1]).map(([k,,p])=>`<li><button data-nav="${k}">${ic(p)}${t(k)}</button></li>`).join('')}<li><button data-act="pdf">${ic('M6 3h9l4 4v14H6zM14 3v5h5M9 13h7M9 17h7')}${t('pdfBtn')}</button></li><li><button data-act="signOut">${ic('M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10')}${t('signOut')}</button></li></ul></section>`}
};
function helpLines(){const r=D.circle.region,c=[[t('line988'),'988'],[t('lineEm'),'911']];if(r==='qc')return [[t('lineAid'),'1 855 852-7784'],[t('lineSoc'),t('linePhone811')],...c];if(r==='us')return [[t('lineElder'),'1 800 677-1116'],[t('line211'),'211'],...c];return [[t('line211'),'211'],...c]}
const regionOpts=()=>[['qc',t('r_qc')],['ca',t('r_ca')],['us',t('r_us')]];
function personHome(){const up=D.events.filter(e=>e.date>=today()).sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time)).slice(0,3),mine=voicesSorted().slice(0,3);
 return `<section class="hero person"><div><h1>${esc(t('hello',firstName()))}</h1><p class="sub">${t('voiceMine')}</p>${sayButtons()}</div></section><p class="note">${t('emgNote')}</p>${dosesOn(today()).length?`<section class="sheet"><h2>${t('mymeds')}</h2><ul>${dosesOn(today()).map(doseRow).join('')}</ul></section>`:''}<div class="cols"><section class="sheet"><h2>${t('comingSoon')}</h2>${up.length?`<ul>${up.map(e=>eventRow(e,true)).join('')}</ul>`:`<p class="empty">${t('emptyEvents')}</p>`}</section><section class="sheet"><h2>${t('said')}</h2>${mine.length?`<ul>${mine.map(voiceItem).join('')}</ul>`:`<p class="empty">${t('noVoice')}</p>`}</section></div>`}

const langBar=()=>`<div class="langs" role="group" aria-label="Langue / Idioma / Language">${[1,2,0].map(i=>`<button data-act="lang" data-id="${i}" aria-pressed="${li===i}">${CODE[i]}</button>`).join('')}</div>`;
function authView(){
  const f=authMode;
  const title=f==='login'?t('login'):f==='signup'?t('signup'):f==='reset'?t('forgot'):t('newPass');
  return `<div class="top"><div class="logo">${LOGO}Vrylive</div>${langBar()}</div><p>${t('tagline')}</p><form class="authcard" data-form="auth"><h1>${title}</h1>${authMsg?`<p class="note" id="auth-msg" style="font-weight:700;color:var(--ink)">${esc(authMsg)}</p>`:''}
  ${f!=='newpass'?`<label for="a-email">${t('email')}<input id="a-email" type="email" autocomplete="email" required></label>`:''}
  ${f!=='reset'?`<label for="a-pass">${f==='newpass'?t('newPass'):t('password')}<input id="a-pass" type="password" minlength="8" autocomplete="${f==='login'?'current-password':'new-password'}" required></label>`:''}
  ${f==='signup'?`<label class="chk" for="a-consent"><input id="a-consent" type="checkbox" required><span>${t('consent')} <a href="conditions.html" target="_blank" rel="noopener">${t('termsLink')}</a>, <a href="privacidad.html" target="_blank" rel="noopener">${t('privacyLink')}</a></span></label>`:''}
  ${f==='login'||f==='signup'?`<a class="btn ghost" href="demo.html" style="text-align:center;text-decoration:none;display:block;padding-top:12px">${t('tryDemo')}</a>`:''}<button class="btn" id="a-go">${f==='login'?t('login'):f==='signup'?t('signup'):f==='reset'?t('sendReset'):t('save')}</button>
  ${f==='login'?`<button type="button" class="linkbtn" data-act="mode" data-id="signup">${t('noAcc')}</button><button type="button" class="linkbtn" data-act="mode" data-id="reset">${t('forgot')}</button>`:f!=='newpass'?`<button type="button" class="linkbtn" data-act="mode" data-id="login">${t('haveAcc')}</button>`:''}</form>`;
}
function inviteView(){
  if(!invitePreview)return `<div class="top"><div class="logo">${LOGO}Vrylive</div>${langBar()}</div><div class="authcard"><p class="err">${t('inviteBad')}</p><button class="btn ghost" data-act="declineInvite">${t('close')}</button></div>`;
  return `<div class="top"><div class="logo">${LOGO}Vrylive</div>${langBar()}</div><div class="authcard"><h1>${esc(t('inviteTitle',invitePreview.person_name))}</h1><p>${esc(t('inviteAs',invitePreview.display_name,roleName(invitePreview.role)))}</p><button class="btn" data-act="acceptInvite">${t('acceptBtn')}</button><button class="btn ghost" data-act="declineInvite">${t('declineBtn')}</button></div>`;
}
function createView(){return `<div class="top"><div class="logo">${LOGO}Vrylive</div>${langBar()}</div><form class="authcard" data-form="create"><h1>${t('newCircle')}</h1><p class="note">${t('newCircleSub')}</p>
 <label for="c-p">${t('personName')}<input id="c-p" required maxlength="120"></label><label for="c-y">${t('birthDate')}<input id="c-y" type="date" min="1900-01-01"></label><label for="c-c">${t('city')}<input id="c-c" maxlength="80"></label><label for="c-reg">${t('region')}<select id="c-reg">${opts(regionOpts(),'qc')}</select></label>
 <label for="c-me">${t('yourName')}<input id="c-me" required maxlength="80"></label><label for="c-r">${t('yourRel')}<input id="c-r" maxlength="60"></label><label for="c-mc">${t('yourCity')}<input id="c-mc" maxlength="80"></label>
 <button class="btn">${t('create')}</button><button type="button" class="linkbtn" data-act="signOut">${t('signOut')}</button></form>`}

let installEvt=null;
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installEvt=e;if(booted)render(true)});
window.addEventListener('appinstalled',()=>{installEvt=null;store.set('vl-install-snooze',String(Date.now()+3650*864e5));render(true)});
const isStandalone=()=>{try{return matchMedia('(display-mode: standalone)').matches||navigator.standalone===true}catch(e){return false}};
const isIOS=()=>/iphone|ipad|ipod/i.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
function installBanner(){
 if(DEMO||isStandalone()||!tourDone())return '';
 const snooze=+(store.get('vl-install-snooze')||0);if(snooze>Date.now())return '';
 if(installEvt)return `<section class="install" role="region" aria-label="${esc(t('installT'))}"><img src="icons/icon-192.png" alt="" width="56" height="56"><div class="grow"><b>${t('installT')}</b><p>${t('installAndroid')}</p><div class="vactions"><button class="btn" data-act="installApp">${t('installBtn')}</button><button class="btn ghost" data-act="installLater">${t('notNow')}</button></div></div></section>`;
 if(isIOS())return `<section class="install" role="region" aria-label="${esc(t('installT'))}"><img src="icons/apple-touch-icon.png" alt="" width="56" height="56"><div class="grow"><b>${t('installT')}</b><ol class="ios-steps"><li>${t('installIos1')} <svg class="ios-share" viewBox="0 0 24 24" role="img" aria-label="${esc(t('shareIconAlt'))}"><path d="M12 15V3M8 7l4-4 4 4M6 11H5v10h14V11h-1"/></svg></li><li>${t('installIos2')}</li></ol><div class="vactions"><button class="btn ghost" data-act="installLater">${t('notNow')}</button></div></div></section>`;
 return '';
}
function tourDone(){return store.get('vl-tour-done')==='1'||!!(session&&session.user&&session.user.user_metadata&&session.user.user_metadata.tour_done)}
let tourStep=0;
function showTour(){
 if(tourDone()||document.getElementById('tour'))return;
 const dl=document.createElement('dialog');dl.id='tour';dl.className='tour';dl.setAttribute('aria-labelledby','tour-h');document.body.appendChild(dl);
 const icons=['M12 4a8 8 0 1 0 0 16a8 8 0 1 0 0-16M12 9a3 3 0 1 0 0 6a3 3 0 1 0 0-6','M9 8a3 3 0 1 0 0 .1M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M17 8v6M14 11h6','M5 5h14v15H5zM8.5 12l2.5 2.5 4.5-5'];
 const end=()=>{store.set('vl-tour-done','1');if(!DEMO&&session){db.auth.updateUser({data:{tour_done:true}}).catch(()=>{})}dl.close();dl.remove()};
 const draw=()=>{const i=tourStep;dl.innerHTML=`<div class="tour-in"><p class="tour-n">${esc(t('tourStep',String(i+1),'3'))}</p><svg class="tour-ic" viewBox="0 0 24 24" aria-hidden="true"><path d="${icons[i]}"/></svg><h2 id="tour-h">${t('tour'+(i+1)+'T')}</h2><p>${t('tour'+(i+1)+'P')}</p><div class="tour-dots" aria-hidden="true">${[0,1,2].map(k=>`<span class="${k===i?'on':''}"></span>`).join('')}</div><div class="actions"><button type="button" class="btn ghost" id="tour-skip">${t('tourSkip')}</button><button type="button" class="btn" id="tour-next">${i<2?t('tourNext'):t('tourStart')}</button></div></div>`;
  document.getElementById('tour-skip').onclick=end;document.getElementById('tour-next').onclick=()=>{if(tourStep<2){tourStep++;draw()}else end()};document.getElementById('tour-next').focus()};
 dl.addEventListener('cancel',e=>{e.preventDefault();end()});
 tourStep=0;draw();dl.showModal();
}
function render(keep){
  const y=window.scrollY,root=document.getElementById('root'),nav=document.getElementById('nav'),app=document.getElementById('app');
  document.documentElement.lang=HTML[li];
  if(!configured){app.className='app solo';root.innerHTML=`<p class="err">${t('configMissing')}</p>`;return}
  if(!booted){app.className='app solo';root.innerHTML=`<p>${t('loading')}</p>`;return}
  let solo=null;
  if(recovery){authMode='newpass';solo=authView()}
  else if(!session)solo=authView();
  else if(pendingInvite)solo=inviteView();
  else if(!cid||!D)solo=createView();
  if(solo!==null){document.documentElement.classList.remove('pm');app.className='app solo';nav.innerHTML='';root.innerHTML=solo;window.scrollTo(0,0);if(session&&!recovery&&!pendingInvite)setTimeout(showTour,0);return}
  if(session)setTimeout(showTour,0);
  if(!isPerson()||view!=='foryou'){}else view='home';
  app.className='app'+(isPerson()?' person-mode':'');
  document.documentElement.classList.toggle('pm',isPerson());
  const active=view;
  nav.innerHTML=`<div class="brand">${LOGO}<span>Vrylive<small style="display:block;font:600 .8rem var(--body);color:var(--muted)">${t('appSub')}</small></span></div>`+navItems().map(([k,sec,p])=>`<button class="${sec?'nav-2nd':''}" data-nav="${k}"${active===k?' aria-current="page"':''}>${ic(p)}<span>${t(k)}</span></button>`).join('')+`<button class="nav-more" data-nav="more"${active==='more'||navItems().some(n=>n[1]&&n[0]===active)?' aria-current="page"':''}>${ic('M5 12h.01M12 12h.01M19 12h.01')}<span>${t('more')}</span></button>`;
  const sw=memberships.length>1?`<select class="circle-switch" data-change="circle" aria-label="Vrylive Famille">${opts(memberships.map(m=>[m.circle_id,m.circles.person_name]),cid)}</select>`:`<span class="note">${esc(D.circle.person_name)}</span>`;
  root.innerHTML=(DEMO?`<p class="demo" style="border-radius:10px">${t('demoBanner')}${CFG.realUrl?` <a href="${CFG.realUrl}" style="color:#F5BE3B;font-weight:700">${t('createMine')}</a>`:''}</p><div class="viewer"><label for="demo-user">${t('viewAs')}</label><select id="demo-user" data-change="demoUser">${opts(D.members.map(m=>[m.user_id,m.display_name+' ('+roleName(m.role)+')']),session.user.id)}</select></div>`:'')+`<div class="top">${sw}${langBar()}</div>`+(store.get('vl-joined')==='1'&&!DEMO?`<section class="joined" role="status"><b>${t('joinedT')}</b><p>${t('joinedP')}</p><button class="btn small" data-act="joinedOk">${t('understood')}</button></section>`:'')+(view==='home'?installBanner():'')+V[view]();
  window.scrollTo(0,keep?y:0);
}
let toastT;function toast(m){const el=document.getElementById('toast');el.textContent=m;el.classList.add('on');clearTimeout(toastT);toastT=setTimeout(()=>el.classList.remove('on'),3200)}
const busy=()=>document.getElementById('sheet').open||(document.getElementById('msg-text')&&document.getElementById('msg-text').value)||['INPUT','TEXTAREA','SELECT'].includes((document.activeElement||{}).tagName);

function form(title,fields,onSave,note){
  const dlg=document.getElementById('sheet');
  dlg.innerHTML=`<form id="sheet-form"><h2>${esc(title)}</h2>${fields.map(f=>`<label for="f-${f.id}">${esc(f.label)}${f.type==='select'?`<select id="f-${f.id}">${opts(f.options,f.value==null?'':f.value)}</select>`:f.type==='textarea'?`<textarea id="f-${f.id}" rows="3"${f.req?' required':''}></textarea>${f.dictate?`<span class="dict"><button type="button" class="btn small ghost" id="mic-${f.id}" aria-pressed="false">${t('dictate')}</button><span class="note" id="micmsg-${f.id}" aria-live="polite">${t('micPrivacy')}</span></span>`:''}`:f.type==='file'?`<input id="f-${f.id}" type="file" accept="application/pdf,image/jpeg,image/png">`:`<input id="f-${f.id}" type="${f.type||'text'}" value="${esc(f.value==null?'':f.value)}"${f.req?' required':''}${f.max?` max="${f.max}"`:''}${f.min?` min="${f.min}"`:''}>`}</label>`).join('')}${note?`<p class="note">${esc(note)}</p>`:''}<div class="actions"><button type="button" class="btn ghost" id="sheet-cancel">${t('cancel')}</button><button class="btn" id="sheet-save">${t('save')}</button></div></form>`;
  document.getElementById('sheet-cancel').onclick=()=>dlg.close();
  document.getElementById('sheet-form').onsubmit=async e=>{e.preventDefault();const v={};fields.forEach(f=>{const el=document.getElementById('f-'+f.id);v[f.id]=f.type==='file'?el.files[0]:el.value.trim()});const b=document.getElementById('sheet-save');b.disabled=true;
    let after;const fine=await act(async()=>{after=await onSave(v)},t('saved'));if(fine){dlg.close();if(typeof after==='function')after()}else b.disabled=false};
  fields.filter(f=>f.dictate).forEach(f=>attachDictation(f.id,dlg));
  dlg.showModal();
}
function attachDictation(id,dlg){
  const btn=document.getElementById('mic-'+id),ta=document.getElementById('f-'+id),msg=document.getElementById('micmsg-'+id),SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!btn)return;
  if(!SR){btn.disabled=true;msg.textContent=t('micNo');return}
  let rec=null;
  const stop=()=>{if(rec)try{rec.stop()}catch(e){}};
  dlg.addEventListener('close',stop,{once:true});
  btn.onclick=()=>{
    if(rec){stop();return}
    rec=new SR();rec.lang=['es-ES','fr-CA','en-CA'][li];rec.interimResults=true;rec.continuous=true;
    const base=ta.value.trim()?ta.value.trim()+' ':'';let fin='';
    rec.onresult=e=>{let tmp='';for(let i=e.resultIndex;i<e.results.length;i++){const r=e.results[i];if(r.isFinal)fin+=r[0].transcript+' ';else tmp+=r[0].transcript}ta.value=(base+fin+tmp).replace(/\s+/g,' ')};
    rec.onerror=e=>{msg.textContent=(e.error==='not-allowed'||e.error==='service-not-allowed')?t('micDenied'):t('micErr')};
    rec.onend=()=>{rec=null;btn.setAttribute('aria-pressed','false');btn.textContent=t('dictate');if(msg.textContent===t('listening'))msg.textContent=t('micPrivacy')};
    try{rec.start();btn.setAttribute('aria-pressed','true');btn.textContent=t('stopDictate');msg.textContent=t('listening')}catch(e){rec=null;msg.textContent=t('micErr')}
  };
}
function infoDialog(title,html){const dlg=document.getElementById('sheet');dlg.innerHTML=`<form id="sheet-form"><h2>${esc(title)}</h2>${html}<div class="actions"><button type="button" class="btn" id="sheet-cancel">${t('close')}</button></div></form>`;document.getElementById('sheet-cancel').onclick=()=>dlg.close();document.getElementById('sheet-form').onsubmit=e=>e.preventDefault();dlg.showModal()}
const inviteUrl=tok=>location.origin+location.pathname+'?invite='+tok;
function invMessage(tok,name,lang){const l=LI[lang]??li;return tl('invMsg',l,name,D.circle.person_name,inviteUrl(tok))}
function showInviteLink(tok,name,lang,contact){const msg=invMessage(tok,name,lang),c=(contact||'').trim(),isMail=/@/.test(c),isTel=!isMail&&/[0-9]{3}/.test(c),enc=encodeURIComponent(msg),subj=encodeURIComponent(tl('invSubject',LI[lang]??li,D.circle.person_name));
 lastShare={msg,name};
 infoDialog(t('inviteLink'),`<p class="note">${esc(t('inviteHelp',name))}</p><div class="copybox" id="inv-url">${esc(msg)}</div><div class="sharebtns">${navigator.share?`<button type="button" class="btn" data-act="shareInv">${t('share')}</button>`:''}<a class="btn ghost" href="https://wa.me/${isTel?waNum(c):''}?text=${enc}" target="_blank" rel="noopener">WhatsApp</a><a class="btn ghost" href="sms:${isTel?esc(c.replace(/[^0-9+]/g,'')):''}?&body=${enc}">${t('shareSms')}</a><a class="btn ghost" href="mailto:${isMail?esc(c):''}?subject=${subj}&body=${enc}">${t('shareMail')}</a><button type="button" class="btn ghost" data-act="copyInvMsg">${t('copyLink')}</button></div>`)}
let lastShare=null;
const waNum=c=>{const d=c.replace(/[^0-9]/g,'');return d.length===10?'1'+d:d};
const copyText=(s,ok)=>{try{navigator.clipboard.writeText(s).then(()=>toast(ok),()=>toast(t('copyFail')))}catch(e){toast(t('copyFail'))}};
const voice=id=>D.voices.find(q=>q.id===id);
const task=id=>D.tasks.find(q=>q.id===id);

const A={
 lang:id=>{li=+id;store.set('cc-lang',id);if(DEMO&&session)return act(async()=>{});render(true)},
 mode:id=>{authMode=id;authMsg='';render()},
 signOut:async()=>{if(DEMO){toast(t('demoNo'));return}try{await db.auth.signOut({scope:'local'})}catch(e){}try{Object.keys(localStorage).filter(k=>k.startsWith('sb-')).forEach(k=>localStorage.removeItem(k))}catch(e){}store.del('cc-circle');session=null;D=null;cid=null;memberships=[];location.replace(location.pathname)},
 acceptInvite:async()=>{try{const c=await rpc('accept_invite',{p_token:pendingInvite});clearInvite();store.set('vl-joined','1');await loadMemberships();cid=c;store.set('cc-circle',c);await load();view='home';render()}catch(e){toast(errText(e));clearInvite();render()}},
 declineInvite:()=>{clearInvite();render()},
 toggle:id=>{const x=task(id);if(x.done_at)return act(()=>upd('tasks',id,{done_at:null,done_by:null}));if(notYet(x)){toast(t('availOn',day(x.due)));return}form(x.title,[{id:'d',label:t('doneDate'),type:'date',value:today(),min:x.due,max:today(),req:1}],async v=>{await upd('tasks',id,{done_at:v.d,done_by:me().id});await post('sysDone',me().display_name,x.title)})},
 takeTask:id=>{const x=task(id);return act(async()=>{await upd('tasks',id,{who_member:me().id});await post('sysTake',me().display_name,x.title)},t('saved'))},
 takeEvent:id=>{const x=D.events.find(q=>q.id===id);return act(async()=>{await upd('events',id,{who_member:me().id});await post('sysTake',me().display_name,x.title)},t('saved'))},
 delEvent:id=>act(()=>del('events',id),t('deleted')),delTask:id=>act(()=>del('tasks',id),t('deleted')),delContact:id=>act(()=>del('contacts',id),t('deleted')),delPractical:id=>act(()=>del('practical',id),t('deleted')),delNeed:id=>act(()=>del('needs',id),t('deleted')),delWish:id=>act(()=>del('wishes',id),t('deleted')),delVoice:id=>act(()=>del('voices',id),t('deleted')),revokeInv:id=>act(()=>del('invites',id),t('deleted')),
 pdf:()=>act(makePdf,t('pdfDone')),
 delMsg:id=>act(()=>del('messages',id),t('deleted')),
 delDoc:id=>{const x=D.documents.find(q=>q.id===id);return act(async()=>{if(x.storage_path)await must(db.storage.from('documents').remove([x.storage_path]));await del('documents',id)},t('deleted'))},
 openDoc:async id=>{if(DEMO){toast(t('demoNo'));return}const x=D.documents.find(q=>q.id===id),w=window.open('','_blank');try{await rpc('log_document_open',{p_doc:id});const r=await must(db.storage.from('documents').createSignedUrl(x.storage_path,60));if(w)w.location=r.signedUrl;else location.href=r.signedUrl}catch(e){if(w)w.close();toast(errText(e))}},
 filterWho:id=>{taskWho=id;taskFilter='open';view='tasks';render()},filterOpen:()=>{taskWho=null;taskFilter='open';view='tasks';render()},installApp:async()=>{if(!installEvt)return;installEvt.prompt();try{const r=await installEvt.userChoice;if(r&&r.outcome!=='accepted')store.set('vl-install-snooze',String(Date.now()+30*864e5))}catch(e){}installEvt=null;render(true)},installLater:()=>{store.set('vl-install-snooze',String(Date.now()+30*864e5));render(true)},joinedOk:()=>{store.del('vl-joined');render(true)},auditMoreBtn:()=>{auditN+=30;refreshAudit()},auditReset:()=>{auditF={who:'',act:'',from:'',to:''};auditN=30;refreshAudit()},seeLate:()=>{taskWho=null;taskFilter='late';view='tasks';render()},
 tf:id=>{taskFilter=id;render(true)},tw:id=>{taskWho=id||null;render(true)},mf:id=>{msgFilter=id;render(true)},jf:id=>{jFilter=id;render(true)},vf:id=>{vFilter=id;render(true)},pickDay:id=>{selDate=id;render(true)},
 calPrev:()=>{calM--;if(calM<0){calM=11;calY--}render(true)},calNext:()=>{calM++;if(calM>11){calM=0;calY++}render(true)},
 star:id=>{const m=D.messages.find(q=>q.id===id);return act(()=>upd('messages',id,{important:!m.important}))},
 newEvent:()=>form(t('addEvent'),[{id:'title',label:t('title'),req:1},{id:'type',label:t('type'),type:'select',value:'appointment',options:['appointment','visit','activity','reminder'].map(k=>[k,t(k)])},{id:'date',label:t('date'),type:'date',value:selDate,req:1},{id:'time',label:t('time'),type:'time',value:'10:00',req:1},{id:'who',label:t('responsible'),type:'select',value:'',options:memOpts()}],async v=>{await ins('events',{title:v.title,type:v.type,date:v.date,time:v.time,who_member:v.who||null});await post('sysNew',me().display_name,v.title);selDate=v.date;const x=dt(v.date);calY=x.getFullYear();calM=x.getMonth()},t('reminderNote')),
 newTask:()=>form(t('addTask'),[{id:'title',label:t('title'),req:1},{id:'who',label:t('responsible'),type:'select',value:me().id,options:memOpts()},{id:'due',label:t('due'),type:'date',value:d(3),req:1},{id:'pr',label:t('priority'),type:'select',value:'normal',options:['high','normal','low'].map(k=>[k,t(k)])},{id:'min',label:t('minutesL'),type:'select',value:'30',options:[['15','15 min'],['30','30 min'],['60','1 h'],['120','2 h'],['240','4 h']]}],async v=>{await ins('tasks',{title:v.title,who_member:v.who||null,due:v.due,priority:v.pr,minutes:+v.min});taskFilter='open';taskWho=null}),
 newEntry:()=>form(t('addEntry'),[{id:'text',label:t('entry'),type:'textarea',req:1},{id:'cat',label:t('cat'),type:'select',value:'obs',options:[['obs',t('obs')],['need',t('needChange')],['visit',t('visit')],['major',t('major')]]},{id:'date',label:t('date'),type:'date',value:today(),req:1}],async v=>{await ins('journal',{date:v.date,cat:v.cat,author:me().id,body:v.text});jFilter='all'}),
 newDoc:()=>form(t('addDoc'),[{id:'name',label:t('docName'),req:1},{id:'exp',label:t('expiry'),type:'date'},...(seeDocs()?[{id:'vis',label:t('access'),type:'select',value:'all',options:[['all',t('vAll')],['coord',t('vCoord')]]}]:[]),{id:'file',label:t('file'),type:'file'}],async v=>{
   const f=v.file,id=crypto.randomUUID();let path=null;
   if(f){if(f.size>10485760||!['application/pdf','image/jpeg','image/png'].includes(f.type))throw{message:'file'};path=cid+'/'+id+'.'+(f.type==='application/pdf'?'pdf':f.type==='image/png'?'png':'jpg')}
   await ins('documents',{id,name:v.name,exp:v.exp||null,vis:v.vis||'all',storage_path:path});
   if(f){const up=await db.storage.from('documents').upload(path,f,{contentType:f.type,upsert:false});if(up.error){await rpc('discard_failed_doc',{p_doc:id}).catch(()=>{});throw up.error}}
 }),
 newContact:()=>form(t('addContact'),[{id:'name',label:t('name'),req:1},{id:'what',label:t('descr')},{id:'phone',label:t('phone'),type:'tel',req:1},{id:'g',label:t('group'),type:'select',value:'pro',options:[['emergency',t('emergency')],['family',t('fam')],['pro',t('pro')]]}],v=>ins('contacts',{name:v.name,what:v.what,phone:v.phone,grp:v.g})),
 newPractical:()=>form(t('addPractical'),[{id:'n',label:t('info'),req:1}],v=>ins('practical',{body:v.n})),
 newNeed:()=>form(t('addNeed'),[{id:'n',label:t('need'),req:1}],v=>ins('needs',{body:v.n})),
 newWish:()=>form(t('addWish'),[{id:'w',label:t('wish'),req:1}],v=>ins('wishes',{body:v.w})),
 editPerson:()=>form(t('editPerson'),[{id:'n',label:t('personName'),req:1,value:D.circle.person_name},{id:'y',label:t('birthDate'),type:'date',value:D.circle.birth_date},{id:'c',label:t('city'),value:D.circle.city},{id:'r',label:t('region'),type:'select',value:D.circle.region,options:regionOpts()},{id:'ph',label:t('personPhone'),type:'tel',value:(D.priv||{}).person_phone||''},{id:'em',label:t('personEmail'),type:'email',value:(D.priv||{}).person_email||''}],async v=>{await upd('circles',cid,{person_name:v.n,birth_date:v.y||null,city:v.c,region:v.r});await must(db.from('circle_private').upsert({circle_id:cid,person_phone:(v.ph||'').trim()||null,person_email:(v.em||'').trim()||null,updated_at:new Date().toISOString()},{onConflict:'circle_id'}))},t('coordOnlyNote')),
 invite:r=>form(t('invite'),[{id:'name',label:t('name'),req:1},{id:'rel',label:t('relation')},{id:'contact',label:t('invContact')},{id:'lang',label:t('invLang'),type:'select',value:['es','fr','en'][li],options:[['fr','Français'],['es','Español'],['en','English']]},{id:'city',label:t('city')},{id:'role',label:t('role'),type:'select',value:r==='person'?'person':'fam',options:[['coord',t('coord')],['fam',t('fam')],['viewer',t('viewer')],['person',t('person')]]}],async v=>{const tok=await rpc('create_invite',{p_circle:cid,p_name:v.name,p_relation:v.rel,p_city:v.city,p_role:v.role,p_contact:v.contact||null,p_lang:v.lang});return ()=>showInviteLink(tok,v.name,v.lang,v.contact)},t('invShareNote')),
 showInvite:id=>{const i=D.invites.find(q=>q.id===id);showInviteLink(i.token,i.display_name,i.lang,i.contact)},
 copyInv:tok=>copyText(inviteUrl(tok),t('linkCopied')),
 copyInvMsg:()=>{if(lastShare)copyText(lastShare.msg,t('linkCopied'))},
 shareInv:()=>{if(!lastShare)return;navigator.share({text:lastShare.msg}).catch(()=>{})},
 renewInv:id=>{const i=D.invites.find(q=>q.id===id);if(!i)return;return act(async()=>{const tok=await rpc('create_invite',{p_circle:cid,p_name:i.display_name,p_relation:i.relation,p_city:i.city,p_role:i.role,p_contact:i.contact||null,p_lang:i.lang||'fr'});await del('invites',i.id);setTimeout(()=>showInviteLink(tok,i.display_name,i.lang,i.contact),50)},t('invRenewed'))},
 removeMember:id=>act(()=>rpc('remove_member',{p_member:id}),t('saved')),
 leave:async()=>{if(DEMO){toast(t('demoNo'));return}const ok=await act(async()=>{await rpc('remove_member',{p_member:me().id});store.del('cc-circle');await loadMemberships()});if(ok){view='home';render()}},
 say:cat=>form(t('c_'+cat),[{id:'text',label:t('p_'+cat),type:'textarea',req:1,dictate:1},{id:'vis',label:t('who_reads'),type:'select',value:'family',options:visOpts(true)}],v=>ins('voices',{cat,body:v.text,...parseVis(v.vis)}),t('emgNote')),
 behalf:()=>form(t('onBehalf'),[{id:'text',label:t('entry'),type:'textarea',req:1,dictate:1},{id:'cat',label:t('cat'),type:'select',value:'need',options:['need','wish','advice','unhappy','other'].map(c=>[c,t('c_'+c)])},{id:'vis',label:t('who_reads'),type:'select',value:'family',options:visOpts(isRep())}],v=>ins('voices',{cat:v.cat,body:v.text,via_member:me().id,...parseVis(v.vis)}),t('behalfNote')),
 replyVoice:id=>form(t('reply'),[{id:'text',label:t('replyTo'),type:'textarea',req:1}],v=>ins('voice_replies',{voice_id:id,author:me().id,body:v.text})),
 voiceTask:id=>{const v=voice(id);form(t('toTask'),[{id:'title',label:t('title'),value:v.body.slice(0,90),req:1},{id:'who',label:t('responsible'),type:'select',value:'',options:memOpts()},{id:'due',label:t('due'),type:'date',value:d(3),req:1}],async x=>{await ins('tasks',{title:x.title,who_member:x.who||null,due:x.due});await rpc('set_voice_status',{p_voice:id,p_status:'progress'});await ins('voice_replies',{voice_id:id,author:me().id,sys_key:'taskCreated',sys_what:x.title})})},
 mood:id=>act(()=>must(db.from('moods').upsert({user_id:session.user.id,circle_id:cid,week_start:weekStart(),level:+id},{onConflict:'user_id,circle_id,week_start'})),t('saved')),
 newRelief:()=>form(t('relief'),[{id:'what',label:t('reliefWhat'),req:1},{id:'date',label:t('reliefDate'),type:'date',value:d(3),req:1}],async v=>{await ins('tasks',{title:t('reliefT',me().display_name,v.what),who_member:null,due:v.date,priority:'high',relief_member:me().id});await post('sysRelief',me().display_name,v.what)}),
 proposeRep:()=>{const cand=D.members.filter(m=>['coord','fam'].includes(m.role)).map(m=>[m.id,m.display_name]);form(t('capRegister'),[{id:'who',label:t('capWho'),type:'select',value:me().id,options:cand},{id:'basis',label:t('capBasisL'),type:'select',value:D.circle.capacity_status==='represented'?'court_decision':'family_agreement',options:D.circle.capacity_status==='represented'?[['court_decision',t('court_decision')]]:[['family_agreement',t('family_agreement')],['court_decision',t('court_decision')]]},{id:'date',label:t('capDate'),type:'date',value:today(),req:1},{id:'note',label:t('capRef')},{id:'priv',label:t('capPriv'),type:'select',value:'no',options:[['no',t('no')],['yes',t('yes')]]}],v=>rpc('propose_representation',{p_circle:cid,p_member:v.who,p_basis:v.basis,p_date:v.date,p_note:v.note,p_private:v.priv==='yes'}),t('capNote'))},
 editAgreement:()=>{const dlg=form;dlg(t('agrEdit'),[{id:'a',label:t('agrT'),type:'textarea'},{id:'d',label:t('date'),type:'date',value:D.circle.family_agreement_date||today()}],v=>upd('circles',cid,{family_agreement:v.a||null,family_agreement_date:v.a?v.d:null}));document.getElementById('f-a').value=D.circle.family_agreement||''},
 confirmRep:()=>act(()=>rpc('confirm_representation',{p_circle:cid}),t('saved')),
 endRep:()=>act(()=>rpc('end_representation',{p_circle:cid}),t('saved')),
 delCircle:()=>{if(DEMO){toast(t('demoNo'));return}const dlg=form;dlg(t('delCircle'),[{id:'c',label:t('delCircleHelp'),req:1}],async v=>{if(v.c!==D.circle.person_name)throw{message:'confirm_mismatch'};const paths=D.documents.filter(x=>x.storage_path).map(x=>x.storage_path);if(paths.length)await must(db.storage.from('documents').remove(paths));await rpc('delete_circle',{p_circle:cid,p_confirm:v.c});store.del('cc-circle');await loadMemberships();view='home'})},
 exportData:()=>{if(DEMO){toast(t('demoNo'));return}const {invites,audit,...rest}=D;const blob=new Blob([JSON.stringify(rest,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='vrylive-'+today()+'.json';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),2000)},
 hideTips:()=>{store.set('cc-tips','0');render(true)},
 giveDose:id=>{const [m,time]=id.split('|');return act(()=>ins('med_logs',{med_id:m,date:today(),time,status:'given',given_by:me().id,given_at:nowHM()}),t('saved'))},
 skipDose:id=>{const [m,time]=id.split('|');return act(()=>ins('med_logs',{med_id:m,date:today(),time,status:'skipped',given_by:me().id,given_at:nowHM()}),t('saved'))},
 newMed:()=>form(t('addMed'),[{id:'n',label:t('name'),req:1},{id:'dose',label:t('dose')},{id:'times',label:t('times'),value:'08:00',req:1},{id:'giver',label:t('giverL'),type:'select',value:'',options:giverOpts()},{id:'note',label:t('medNote')}],v=>{if(!String(v.times).split(',').some(s=>/^\s*\d{1,2}:\d{2}\s*$/.test(s)))throw{message:'times'};return ins('meds',{name:v.n,dose:v.dose,times:v.times,note:v.note,giver:v.giver||null,active:true})},t('medsSub')),
 delMed:id=>act(()=>del('meds',id),t('deleted')),
 pref:k=>{const p=prefRow(k);return act(()=>p?upd('notif_prefs',p.id,{on:!p.on}):ins('notif_prefs',{user_id:session.user.id,key:k,on:false}),t('saved'))},
 addPoint:()=>form(t('addPoint'),[{id:'p',label:t('point'),type:'textarea',req:1}],v=>ins('meeting_points',{meeting_id:null,source:'manual',ref:null,title:v.p,added_by:me().id})),
 scheduleMeeting:()=>{const next=(D.meetings||[]).find(m=>m.status==='planned');form(t('schedule'),[{id:'d',label:t('date'),type:'date',value:next?next.date:d(7),req:1},{id:'h',label:t('time'),type:'time',value:next?hm(next.time):'19:00',req:1}],async v=>{if(next){await upd('meetings',next.id,{date:v.d,time:v.h})}else{await ins('meetings',{date:v.d,time:v.h,status:'planned',created_by:me().id});await ins('events',{title:t('meeting'),type:'reminder',date:v.d,time:v.h,who_member:me().id})}})},
 decide:key=>{const i=lastAgenda[key];if(!i)return;const pt=i.pt,first=!pt||!pt.decision;form(t('decide'),[{id:'dec',label:t('decision'),type:'textarea',req:1},{id:'who',label:t('decWho'),type:'select',value:pt&&pt.decision_who||'',options:memOpts()},{id:'due',label:t('due'),type:'date',value:pt&&pt.decision_due||d(7)}],async v=>{
   const row={decision:v.dec,decision_who:v.who||null,decision_due:v.who?v.due:null};
   if(pt)await upd('meeting_points',pt.id,row);else await ins('meeting_points',{meeting_id:null,source:key.split(':')[0],ref:key,title:i.title,added_by:me().id,...row});
   if(first&&v.who)await ins('tasks',{title:v.dec.slice(0,120),who_member:v.who,due:v.due||d(7),priority:'normal',minutes:30});
  });const el=document.getElementById('f-dec');if(el&&pt&&pt.decision)el.value=pt.decision},
 closeMeeting:()=>{const dec=(D.meeting_points||[]).filter(p=>!p.meeting_id&&p.decision);if(!dec.length){toast(t('noDecisions'));return}
  return act(async()=>{let next=(D.meetings||[]).find(m=>m.status==='planned'),mid=next?next.id:crypto.randomUUID();
   if(next)await upd('meetings',mid,{status:'done',date:today()});else await ins('meetings',{id:mid,date:today(),time:nowHM(),status:'done',created_by:me().id});
   for(const p of dec)await upd('meeting_points',p.id,{meeting_id:mid});
   await post('sysMeeting',fmt(today(),{day:'numeric',month:'long'}),String(dec.length));},t('saved'))},
 copyCard:()=>{const lines=[t('emgCard')+' - '+t('cardDate',longDate(today())),D.circle.person_name+(D.circle.birth_date?', '+t('bornOn',longDate(D.circle.birth_date)):''),...D.contacts.filter(x=>x.grp==='emergency').map(x=>x.name+CS()+x.phone),...D.needs.map(n=>'- '+n.body),...D.practical.map(p=>'- '+p.body)];copyText(lines.join('\n'),t('cardCopied'))},
 copy:()=>{const w=weekData(),lines=[t('summary')+' - '+D.circle.person_name,'',t('doneList')+CL(),...w.done.map(x=>'- '+x.title),'',t('pendList')+CL(),...w.pend.map(x=>'- '+x.title+' ('+day(x.due)+')'),'',t('apptWeek')+CL(),...w.ev.map(e=>'- '+day(e.date)+' '+hm(e.time)+CS()+e.title),'',t('eventsLog')+CL(),...w.log.map(j=>'- '+day(j.date)+CS()+j.body),'',t('voiceWeek',firstName())+':',...w.voice.map(v=>'- '+v.body)];copyText(lines.join('\n'),t('copied'))}
};
function clearInvite(){pendingInvite=null;invitePreview=null;store.del('cc-invite');if(location.search.includes('invite='))history.replaceState(null,'',location.pathname)}
function loadPdfLib(){return window.jspdf?Promise.resolve(window.jspdf):new Promise((ok,ko)=>{const sc=document.createElement('script');sc.src='vendor/jspdf.umd.min.js';sc.onload=()=>ok(window.jspdf);sc.onerror=ko;document.head.appendChild(sc)})}
async function makePdf(){
 const {jsPDF}=await loadPdfLib(),doc=new jsPDF({unit:'mm',format:'letter'}),W=doc.internal.pageSize.getWidth(),H=doc.internal.pageSize.getHeight(),M=18;let y=M;
 const clean=x=>String(x==null?'':x).replace(/[\u2018\u2019]/g,"'").replace(/[\u201C\u201D]/g,'"').replace(/\u2013|\u2014/g,'-').replace(/\u2026/g,'...').replace(/\u202F|\u00A0/g,' ');
 const need=h=>{if(y+h>H-M){doc.addPage();y=M}};
 const line=(txt,o={})=>{doc.setFont('helvetica',o.b?'bold':'normal');doc.setFontSize(o.s||11);const ls=doc.splitTextToSize(clean(txt),W-2*M-(o.ind||0));const lh=(o.s||11)*0.45;need(ls.length*lh+1);doc.text(ls,M+(o.ind||0),y+lh*0.8);y+=ls.length*lh+(o.gap==null?1.5:o.gap)};
 const sec=title=>{y+=4;need(14);doc.setDrawColor(58,54,168);doc.setLineWidth(0.6);doc.line(M,y,W-M,y);y+=2;line(title,{b:1,s:13,gap:2})};
 const c=D.circle,mn=id=>{const m=member(id);return m?m.display_name:t('unassigned')};
 line(t('pdfTitle'),{b:1,s:18,gap:3});
 line(c.person_name+(c.birth_date?' - '+t('bornOn',longDate(c.birth_date))+' ('+t('years',age(c.birth_date))+')':''),{b:1,s:12});
 line(t('pdfDate',longDate(today())),{s:10,gap:3});
 sec(t('pdfAppts'));
 const ev=D.events.filter(e=>e.date>=today()&&e.date<=d(60)).sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time));
 if(ev.length)ev.forEach(e=>line(longDate(e.date)+', '+hm(e.time)+' - '+e.title+(e.who_member?' ('+t('pdfWith',mn(e.who_member))+')':''),{ind:2}));else line(t('pdfNone'),{ind:2});
 sec(t('pdfTasks'));
 const tk=open().sort((a,b)=>a.due.localeCompare(b.due));
 if(tk.length)tk.forEach(x=>line((isLate(x)?'['+t('late')+'] ':'')+x.title+' - '+t('due2',longDate(x.due))+' - '+mn(x.who_member),{ind:2}));else line(t('pdfNone'),{ind:2});
 sec(t('pdfMeds'));
 const md=medsActive();
 if(md.length)md.forEach(m=>{line(m.name+(m.dose?' - '+m.dose:''),{b:1,ind:2,gap:0.5});line(t('pdfTimes',slots(m).join(', '))+(m.giver?' - '+t('pdfGiver',mn(m.giver)):''),{ind:6,gap:0.5});if(m.note)line(m.note,{ind:6,gap:0.5});y+=1.5});else line(t('pdfNone'),{ind:2});
 y+=6;line(t('pdfFoot'),{s:9});
 const pages=doc.getNumberOfPages();for(let i=1;i<=pages;i++){doc.setPage(i);doc.setFont('helvetica','normal');doc.setFontSize(9);doc.setTextColor(90,83,114);doc.text('Vrylive Famille - '+i+'/'+pages,W-M,H-8,{align:'right'});doc.setTextColor(0)}
 doc.save('vrylive-'+today()+'.pdf');
}
const DELS={delMsg:['messages','body'],delEvent:['events','title'],delTask:['tasks','title'],delContact:['contacts','name'],delPractical:['practical','body'],delNeed:['needs','body'],delWish:['wishes','body'],delVoice:['voices','body'],delDoc:['documents','name'],delMed:['meds','name'],revokeInv:['invites','display_name'],removeMember:['members','display_name'],leave:[null,null]};
function confirmDel(act,id){
  const [tb,f]=DELS[act],row=tb?(D[tb]||[]).find(r=>r.id===id):null,name=act==='leave'?D.circle.person_name:row?String(row[f]||''):'';
  const head=act==='revokeInv'?'confirmRevokeT':act==='removeMember'?'confirmRemoveT':act==='leave'?'confirmLeaveT':'confirmDelT',btn=act==='revokeInv'?'revoke':act==='removeMember'?'remove':act==='leave'?'leave':'del',note=act==='delDoc'?'confirmDocNote':act==='leave'?'confirmLeaveNote':'confirmNote';
  const dlg=document.getElementById('sheet');
  dlg.innerHTML=`<form id="sheet-form"><h2>${t(head)}</h2>${name?`<p style="overflow-wrap:anywhere"><b>${esc(name.length>140?name.slice(0,140)+'…':name)}</b></p>`:''}<p class="note">${t(note)}</p><div class="actions"><button type="button" class="btn ghost" id="sheet-cancel">${t('cancel')}</button><button class="btn danger" id="sheet-save">${t(btn)}</button></div></form>`;
  document.getElementById('sheet-cancel').onclick=()=>dlg.close();
  document.getElementById('sheet-form').onsubmit=e=>{e.preventDefault();dlg.close();A[act](id)};
  dlg.showModal();document.getElementById('sheet-cancel').focus();
}
document.addEventListener('click',e=>{
 const n=e.target.closest('[data-nav]');if(n){view=n.dataset.nav;render();return}
 const a=e.target.closest('[data-act]');if(a&&DELS[a.dataset.act]&&!(DEMO&&a.dataset.act==='leave')){confirmDel(a.dataset.act,a.dataset.id);return}
 if(a&&A[a.dataset.act])A[a.dataset.act](a.dataset.id);
});
document.addEventListener('change',e=>{
 const c=e.target.dataset.change;if(!c)return;const id=e.target.dataset.id,v=e.target.value;
 if(c==='demoUser'){DEMO.setUser(v);session=DEMO.session();act(async()=>{await loadMemberships()});return}
 if(c==='auditWho'||c==='auditAct'||c==='auditFrom'||c==='auditTo'){auditF[{auditWho:'who',auditAct:'act',auditFrom:'from',auditTo:'to'}[c]]=v;auditN=30;refreshAudit();return}
 if(c==='medGiver'){act(()=>upd('meds',id,{giver:v||null}),t('saved'));return}
 if(c==='assign'){const x=task(id),m=member(v);act(async()=>{await upd('tasks',id,{who_member:v||null});if(m)await post('sysAssign',m.display_name,x.title)},t('saved'))}
 if(c==='role')act(()=>rpc('set_member_role',{p_member:id,p_role:v}),t('saved'));
 if(c==='docVis')act(()=>upd('documents',id,{vis:v}),t('saved'));
 if(c==='voiceSt')act(()=>rpc('set_voice_status',{p_voice:id,p_status:v}),t('saved'));
 if(c==='voiceVis'){const p=parseVis(v);act(()=>rpc('set_voice_vis',{p_voice:id,p_vis:p.vis,p_vis_member:p.vis_member}),t('saved'))}
 if(c==='circle'){cid=v;store.set('cc-circle',v);act(async()=>{view='home'})}
});
document.addEventListener('submit',async e=>{
 const id=e.target.id,kind=e.target.dataset.form;
 if(id==='composer'){e.preventDefault();const box=document.getElementById('msg-text'),v=box.value.trim();if(!v)return;box.value='';box.blur();await act(()=>ins('messages',{author:me().id,body:v}),t('sent'));return}
 if(kind==='auth'){e.preventDefault();await submitAuth();return}
 if(kind==='create'){e.preventDefault();const g=x=>document.getElementById(x).value.trim();try{const y=g('c-y');const c=await rpc('create_circle',{p_person_name:g('c-p'),p_birth_date:y||null,p_city:g('c-c'),p_my_name:g('c-me'),p_relation:g('c-r'),p_my_city:g('c-mc'),p_region:g('c-reg')});await loadMemberships();cid=c;store.set('cc-circle',c);await load();view='home';render()}catch(err){toast(errText(err))}}
});
async function submitAuth(){
 const g=x=>{const el=document.getElementById(x);return el?el.value.trim():''},btn=document.getElementById('a-go');btn.disabled=true;authMsg='';
 try{
  if(authMode==='login'){const r=await db.auth.signInWithPassword({email:g('a-email'),password:document.getElementById('a-pass').value});if(r.error){authMsg=t('loginErr');render();return}}
  else if(authMode==='signup'){const redir=location.origin+location.pathname+(pendingInvite?'?invite='+pendingInvite:'');const r=await db.auth.signUp({email:g('a-email'),password:document.getElementById('a-pass').value,options:{emailRedirectTo:redir,data:{privacy_consent_at:new Date().toISOString(),privacy_version:'2026-11-draft'}}});if(r.error){authMsg=r.error.message;render();return}if(!r.data.session){authMode='login';authMsg=t('checkEmail');render();return}}
  else if(authMode==='reset'){await db.auth.resetPasswordForEmail(g('a-email'),{redirectTo:location.origin+location.pathname});authMode='login';authMsg=t('resetSent');render();return}
  else if(authMode==='newpass'){const r=await db.auth.updateUser({password:document.getElementById('a-pass').value});if(r.error){authMsg=r.error.message;render();return}recovery=false;authMode='login';toast(t('passChanged'));await afterSession();render();return}
 }catch(e){authMsg=t('genericErr');render()}finally{const b=document.getElementById('a-go');if(b)b.disabled=false}
}
async function afterSession(){
 try{
  if(!session){memberships=[];cid=null;D=null;return}
  await loadMemberships();await load();
  if(pendingInvite&&!inviteChecked){inviteChecked=true;const p=await rpc('invite_preview',{p_token:pendingInvite});invitePreview=p&&p[0]||null}
 }catch(e){console.error(e);toast(t('genericErr'))}
}
async function boot(){
 const qs=new URLSearchParams(location.search),inv=qs.get('invite');
 if(inv)store.set('cc-invite',inv);
 pendingInvite=inv||store.get('cc-invite');
 if(!configured){render();return}
 render();
 db.auth.onAuthStateChange((ev,s)=>{
  if(ev==='PASSWORD_RECOVERY'){recovery=true;session=s;booted=true;setTimeout(render,0);return}
  const had=session&&session.user.id,now=s&&s.user.id;session=s;
  if(booted&&had!==now)setTimeout(async()=>{inviteChecked=false;await afterSession();view='home';render()},0);
 });
 const {data}=await db.auth.getSession();session=data.session;
 await afterSession();booted=true;render();
 const refresh=async()=>{if(session&&cid&&!busy()&&!recovery){try{await load();render(true)}catch(e){}}};
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh()});
 setInterval(()=>{if(!document.hidden)refresh()},60000);
}
if('serviceWorker' in navigator&&!DEMO&&location.protocol==='https:'){window.addEventListener('load',()=>{navigator.serviceWorker.register('sw.js').catch(()=>{})})}
boot();
})();
