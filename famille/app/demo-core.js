(function(){
const iso=dt=>dt.getFullYear()+'-'+String(dt.getMonth()+1).padStart(2,'0')+'-'+String(dt.getDate()).padStart(2,'0');
const d=n=>{const x=new Date();x.setDate(x.getDate()+n);return iso(x)};
const person={name:'Marguerite Lavoie',first:'Marguerite',age:82,city:'Laval',needs:[
['Usa andador dentro y fuera de casa','Se déplace avec une marchette, dedans comme dehors','Uses a walker indoors and out'],
['Necesita transporte para todas las citas','A besoin de transport pour tous ses rendez-vous','Needs a ride to every appointment'],
['Prefiere las citas por la mañana','Préfère les rendez-vous le matin','Prefers morning appointments'],
['Oye mejor del lado derecho; hablarle de frente','Entend mieux à droite; lui parler de face','Hears better on the right; speak facing her']]};
let members=[
{id:'s',name:'Sofía',rel:['Hija','Fille','Daughter'],city:'Laval',role:'coord',c0:'--m1'},
{id:'m',name:'Marc',rel:['Hijo','Fils','Son'],city:'Québec',role:'fam',c0:'--m2'},
{id:'c',name:'Camila',rel:['Nieta','Petite-fille','Granddaughter'],city:'Bogotá',role:'fam',c0:'--m3'},
{id:'d',name:'Daniel',rel:['Yerno','Gendre','Son-in-law'],city:'Laval',role:'viewer',c0:'--m4'}];
let events=[
{id:1,title:['Visita de Sofía','Visite de Sofía','Sofía visits'],type:'visit',date:d(0),time:'14:30',who:'s'},
{id:2,title:['Cita con la geriatra','Rendez-vous chez la gériatre','Geriatrician appointment'],type:'appointment',date:d(1),time:'10:00',who:'m'},
{id:3,title:['Videollamada con Camila','Appel vidéo avec Camila','Video call with Camila'],type:'activity',date:d(3),time:'13:00',who:'c'},
{id:4,title:['Cita de podología','Rendez-vous en podologie','Foot care appointment'],type:'appointment',date:d(4),time:'09:30',who:null},
{id:5,title:['Paseo al mercado','Sortie au marché','Trip to the market'],type:'activity',date:d(6),time:'11:00',who:'m'},
{id:6,title:['Reunión familiar en línea','Réunion de famille en ligne','Online family meeting'],type:'reminder',date:d(9),time:'19:00',who:'s'},
{id:7,title:['Visita de Marc','Visite de Marc','Marc visits'],type:'visit',date:d(-3),time:'15:00',who:'m'}];
let tasks=[
{id:1,title:['Renovar la tarjeta de transporte adaptado','Renouveler la carte de transport adapté','Renew the adapted transit card'],who:'s',due:d(-2),pr:'high'},
{id:2,title:['Recoger el pedido de la farmacia','Récupérer la commande à la pharmacie','Pick up the pharmacy order'],who:'s',due:d(0),pr:'high'},
{id:3,title:['Hacer las compras de la semana','Faire l\'épicerie de la semaine','Do the weekly groceries'],who:'m',due:d(1),pr:'normal'},
{id:4,title:['Llamar al centro de salud para confirmar la ayuda a domicilio','Appeler le centre de santé pour confirmer le soutien à domicile','Call the health center to confirm home support'],who:'c',due:d(2),pr:'normal'},
{id:5,title:['Reunir los papeles para la notaria','Rassembler les papiers pour la notaire','Gather papers for the notary'],who:null,due:d(4),pr:'normal'},
{id:6,title:['Instalar la barra de apoyo en el baño','Installer la barre d\'appui dans la salle de bain','Install the bathroom grab bar'],who:'m',due:d(5),pr:'normal'},
{id:7,title:['Enviar los recibos al contador','Envoyer les reçus au comptable','Send receipts to the accountant'],who:'s',due:d(6),pr:'low'},
{id:8,title:['Cambiar la pila del detector de humo','Changer la pile du détecteur de fumée','Replace the smoke detector battery'],who:'m',due:d(-1),pr:'high',done:d(-1)},
{id:9,title:['Reservar la peluquería','Réserver le coiffeur','Book the hairdresser'],who:'c',due:d(-2),pr:'low',done:d(-2)},
{id:10,title:['Limpiar la nevera','Nettoyer le réfrigérateur','Clean the fridge'],who:'s',due:d(-3),pr:'normal',done:d(-3)}];
let messages=[
{id:1,by:'s',date:d(-1),time:'18:12',text:['La geriatra pidió llevar la lista actualizada de medicamentos mañana. La dejé en la carpeta azul.','La gériatre demande la liste à jour des médicaments demain. Elle est dans le cartable bleu.','The geriatrician wants the updated medication list tomorrow. It is in the blue binder.'],imp:true},
{id:2,by:'c',date:d(-1),time:'20:40',text:['Puedo encargarme de las llamadas desde Bogotá en la tarde.','Je peux faire les appels depuis Bogotá l\'après-midi.','I can make the calls from Bogotá in the afternoon.']},
{id:3,by:'m',date:d(0),time:'08:05',text:['Salgo de Québec esta noche; mañana la llevo a la cita.','Je pars de Québec ce soir; demain je l\'amène au rendez-vous.','I leave Québec tonight and will take her to the appointment tomorrow.']}];
let journal=[
{id:1,date:d(0),cat:'obs',by:'s',text:['Durmió bien y desayunó con apetito.','Elle a bien dormi et a déjeuné avec appétit.','She slept well and had a good breakfast.']},
{id:2,date:d(-1),cat:'need',by:'m',text:['Ya no se siente segura en la bañera sola. Hace falta ayuda para el baño.','Ne se sent plus en sécurité seule dans le bain. Il faut de l\'aide.','No longer feels safe alone in the tub. She needs help bathing.']},
{id:3,date:d(-3),cat:'visit',by:'m',text:['Visita de la tarde: revisamos el correo y las cuentas.','Visite en après-midi : courrier et factures vérifiés.','Afternoon visit: went through the mail and bills.']},
{id:4,date:d(-5),cat:'major',by:'s',text:['Resbaló en la entrada, sin golpes. Pedimos alfombra antideslizante.','A glissé à l\'entrée, sans blessure. Tapis antidérapant commandé.','Slipped at the entrance, no injury. Non-slip mat ordered.']},
{id:5,date:d(-9),cat:'obs',by:'c',text:['Conversamos media hora; estaba de muy buen ánimo.','Une demi-heure au téléphone; elle était de très bonne humeur.','Talked for half an hour; she was in very good spirits.']}];
let docs=[
{id:1,name:['Copia de la tarjeta de seguro de salud','Copie de la carte d\'assurance maladie','Copy of health insurance card'],exp:d(45),vis:'coord'},
{id:2,name:['Mandato de protección','Mandat de protection','Protection mandate'],exp:null,vis:'coord'},
{id:3,name:['Contrato de ayuda a domicilio','Contrat de soutien à domicile','Home support contract'],exp:d(20),vis:'all'},
{id:4,name:['Seguro de la vivienda','Assurance habitation','Home insurance'],exp:d(-10),vis:'all'},
{id:5,name:['Contrato de arrendamiento','Bail','Lease'],exp:d(200),vis:'all'}];
let contacts=[
{id:1,name:'Sofía Ramírez',what:['Hija, primera en llamar','Fille, à appeler en premier','Daughter, call first'],phone:'450 555-0142',g:'emergency'},
{id:2,name:'Mme Gagnon',what:['Vecina del 3B','Voisine du 3B','Neighbour in 3B'],phone:'450 555-0177',g:'emergency'},
{id:3,name:'Marc Lavoie',what:['Hijo','Fils','Son'],phone:'418 555-0119',g:'family'},
{id:4,name:'Dre Nadia Roy',what:['Médica de familia','Médecin de famille','Family doctor'],phone:'450 555-0160',g:'pro'},
{id:5,name:['Centro de salud local','Centre de santé local','Local health center'],what:['Soporte a domicilio','Soutien à domicile','Home support'],phone:'450 555-0101',g:'pro'},
{id:6,name:'Farmacia del barrio',what:['Entrega los jueves','Livraison le jeudi','Delivers on Thursdays'],phone:'450 555-0133',g:'pro'}];
const practical=[
['Llave de repuesto: con Mme Gagnon, 3B','Clé de secours : chez Mme Gagnon, 3B','Spare key: with Mme Gagnon, 3B'],
['Basura: martes por la mañana','Ordures : mardi matin','Garbage: Tuesday morning'],
['Mejor hora para visitas: después de las 14:00','Meilleur moment pour les visites : après 14 h','Best time to visit: after 2 p.m.']];
let voices=[
{id:1,cat:'need',date:d(-1),by:'p',vis:'family',st:'new',text:['Necesito que alguien me ayude a bajar del armario las cajas de la ropa de invierno.','J\'ai besoin qu\'on m\'aide à descendre de la garde-robe les boîtes de vêtements d\'hiver.','I need someone to help me take the winter clothes boxes down from the closet.'],replies:[]},
{id:2,cat:'unhappy',date:d(-2),by:'p',vis:'family',st:'new',text:['Cuando vienen, hablan entre ustedes como si yo no estuviera. Eso me duele.','Quand vous venez, vous parlez entre vous comme si je n\'étais pas là. Ça me blesse.','When you visit, you talk among yourselves as if I were not there. That hurts.'],replies:[]},
{id:3,cat:'wish',date:d(-4),by:'p',vis:'family',st:'progress',text:['Quiero seguir yendo al mercado yo misma, aunque sea despacio.','Je veux continuer d\'aller au marché moi-même, même lentement.','I want to keep going to the market myself, even if slowly.'],replies:[{by:'m',date:d(-3),text:['Mamá, te acompaño y tú eliges todo.','Maman, je t\'accompagne et tu choisis tout.','Mom, I will go with you and you choose everything.']}]},
{id:4,cat:'advice',date:d(-3),by:'p',vis:'s',st:'new',via:'s',text:['La señora del martes me ayuda con más calma. Prefiero que venga ella.','La dame du mardi m\'aide avec plus de calme. Je préfère qu\'elle vienne.','The Tuesday aide is calmer with me. I would rather she came.'],replies:[]},
{id:5,cat:'other',date:d(-1),by:'p',vis:'private',st:'new',text:['Para no olvidar: preguntarle a la doctora si puedo volver a caminar por el parque.','À ne pas oublier : demander à la docteure si je peux retourner marcher au parc.','Not to forget: ask the doctor if I can go back to walking in the park.'],replies:[]}];
let wishes=[['Avísenme antes de venir.','Prévenez-moi avant de venir.','Let me know before you come.'],['Yo decido qué ropa me pongo.','C\'est moi qui choisis mes vêtements.','I choose what I wear.'],['Consúltenme antes de cambiar algo en mi casa.','Consultez-moi avant de changer quoi que ce soit chez moi.','Ask me before changing anything in my home.']];
const C='c1',at=(date,time)=>new Date(date+'T'+(time||'10:00')+':00').toISOString();
const mon0=(()=>{const x=new Date();x.setDate(x.getDate()-((x.getDay()+6)%7));return x})();
const wd=(w,k)=>{const x=new Date(mon0);x.setDate(x.getDate()-7*w+k);return iso(x)};
const T={};
T.circles=[{id:C,person_name:person.name,birth_date:'1944-03-12',city:person.city,region:'qc',capacity_status:'autonomous',rep_member_id:null,rep_basis:null,rep_date:null,rep_note:null,rep_private_access:false,rep_proposed_by:null,family_agreement:null,family_agreement_date:null}];
T.circle_members=[...members.map((m,i)=>({id:m.id,circle_id:C,user_id:'u-'+m.id,display_name:m.name,relation:m.rel,city:m.city,role:m.role,color:i,created_at:'2026-01-0'+(i+1)+'T00:00:00Z'})),{id:'p',circle_id:C,user_id:'u-p',display_name:'Marguerite',relation:'',city:'Laval',role:'person',color:5,created_at:'2026-01-09T00:00:00Z'}];
T.events=events.map(e=>({id:'e'+e.id,circle_id:C,title:e.title,type:e.type,date:e.date,time:e.time+':00',who_member:e.who}));
for(let w=1;w<=8;w++){T.events.push({id:'ve'+w,circle_id:C,title:['Visita de Sofía','Visite de Sofía','Sofía visits'],type:'visit',date:wd(w,5),time:'14:00:00',who_member:'s'});if(w>4||w%2===0)T.events.push({id:'vm'+w,circle_id:C,title:['Visita de Marc','Visite de Marc','Marc visits'],type:'visit',date:wd(w,6),time:'15:00:00',who_member:'m'})}
T.tasks=tasks.map(x=>({id:'t'+x.id,circle_id:C,title:x.title,who_member:x.who,due:x.due,priority:x.pr,done_at:x.done||null,done_by:x.done?x.who:null,relief_member:null,minutes:60}));
const HT={s:[['Compras de la semana','Épicerie de la semaine','Weekly groceries'],['Acompañar a la cita','Accompagner au rendez-vous','Go to the appointment'],['Ordenar el pastillero','Préparer le pilulier','Fill the pill organizer']],m:[['Arreglos en la casa','Réparations à la maison','Home repairs'],['Trámites del banco','Démarches à la banque','Bank errands'],['Cortar el césped','Tondre la pelouse','Mow the lawn']],c:[['Llamada para coordinar servicios','Appel pour coordonner les services','Call to coordinate services']]};
let hid=0;const hpush=(w,k,who,ti,min)=>T.tasks.push({id:'h'+(++hid),circle_id:C,title:ti,who_member:who,due:wd(w,k),priority:'normal',done_at:wd(w,k),done_by:who,relief_member:null,minutes:min});
for(let w=1;w<=8;w++){const heavy=w<=4;
 HT.s.slice(0,heavy?3:1).forEach((ti,i)=>hpush(w,i,'s',ti,60));
 HT.m.slice(0,heavy?1:3).forEach((ti,i)=>hpush(w,i+1,'m',ti,heavy?45:60));
 hpush(w,3,'c',HT.c[0],30);}
T.messages=messages.map(m=>({id:'m'+m.id,circle_id:C,author:m.by,body:m.text,important:!!m.imp,sys_key:null,created_at:at(m.date,m.time)}));
T.journal=journal.map(j=>({id:'j'+j.id,circle_id:C,date:j.date,cat:j.cat,author:j.by,body:j.text,created_at:at(j.date)}));
T.documents=docs.map(x=>({id:'d'+x.id,circle_id:C,name:x.name,exp:x.exp,vis:x.vis,storage_path:null}));
T.contacts=contacts.map(c=>({id:'k'+c.id,circle_id:C,name:c.name,what:c.what,phone:c.phone,grp:c.g}));
T.needs=person.needs.map((b,i)=>({id:'n'+i,circle_id:C,body:b}));
T.practical=practical.map((b,i)=>({id:'q'+i,circle_id:C,body:b}));
T.voices=[];T.voice_replies=[];
voices.forEach(v=>{const vid='v'+v.id;T.voices.push({id:vid,circle_id:C,cat:v.cat,body:v.text,vis:v.vis==='family'||v.vis==='private'?v.vis:'member',vis_member:v.vis==='family'||v.vis==='private'?null:v.vis,status:v.st,via_member:v.via||null,created_at:at(v.date)});(v.replies||[]).forEach((r,i)=>T.voice_replies.push({id:vid+'r'+i,voice_id:vid,circle_id:C,author:r.by,body:r.text,created_at:at(r.date,'12:00')}))});
T.wishes=wishes.map((b,i)=>({id:'w'+i,circle_id:C,body:b}));
const mon=(()=>{const x=new Date();x.setDate(x.getDate()-((x.getDay()+6)%7));return x})();
const wk=n=>{const x=new Date(mon);x.setDate(x.getDate()-7*n);return iso(x)};
T.moods=[[2,2],[1,3]].map(([n,l])=>({user_id:'u-s',circle_id:C,week_start:wk(n),level:l}));
T.invites=[{id:'inv1',circle_id:C,token:'demoinv1',display_name:'Lucía',relation:'',city:'Laval',role:'fam',contact:'lucia@example.com',lang:'es',accepted_at:null,created_at:at(d(-3)),expires_at:new Date(Date.now()+11*864e5).toISOString()},
{id:'inv2',circle_id:C,token:'demoinv2',display_name:'Paul',relation:'',city:'Québec',role:'viewer',contact:'418 555-0144',lang:'fr',accepted_at:null,created_at:at(d(-20)),expires_at:new Date(Date.now()-6*864e5).toISOString()},
{id:'inv3',circle_id:C,token:'demoinv3',display_name:'Camila',relation:'',city:'Gatineau',role:'fam',contact:null,lang:'es',accepted_at:at(d(-40)),created_at:at(d(-41)),expires_at:at(d(-27))}];
T.shifts=[{id:'sh1',circle_id:C,date:d(5),start_time:'10:00:00',end_time:'16:00:00',what:['Quedarme con mamá el sábado para descansar','Rester avec maman samedi pour me reposer','Stay with Mom on Saturday so I can rest'],requested_by:'s',asked_member:null,covered_by:null,status:'open',declined_by:[]},{id:'sh2',circle_id:C,date:d(2),start_time:'09:00:00',end_time:'12:00:00',what:['Acompañarla a la podóloga','L\'accompagner chez la podologue','Take her to the podiatrist'],requested_by:'m',asked_member:'c',covered_by:'c',status:'accepted',declined_by:[]},{id:'sh3',circle_id:C,date:d(-6),start_time:'13:00:00',end_time:'17:00:00',what:['Tarde de compañía','Après-midi de compagnie','Afternoon of company'],requested_by:'s',asked_member:null,covered_by:'m',status:'accepted',declined_by:[]}];
T.audit_log=[];{const acts=[['s','insert','tasks'],['m','update','tasks'],['c','insert','events'],['s','open','documents'],['p','insert','voices'],['s','insert','med_logs'],['m','insert','journal'],['d','open','documents'],['s','update','meds'],['c','delete','tasks'],['s','insert','meeting_points'],['m','insert','med_logs']];let k=0;for(let i=0;i<70;i++){const [w,a,tg]=acts[i%acts.length],x=new Date();x.setHours(9+(i%10),(i*7)%60,0,0);x.setDate(x.getDate()-Math.floor(i/2));T.audit_log.push({id:'al'+(++k),circle_id:C,actor_member:w,action:a,target:tg,target_id:null,created_at:x.toISOString()})}}T.notif_prefs=[];T.circle_private=[{circle_id:C,person_phone:'450 555-0100',person_email:null}];
T.meds=[{id:'md1',circle_id:C,name:['Pastilla de la presión','Comprimé pour la pression','Blood pressure pill'],dose:['1 comprimido','1 comprimé','1 tablet'],times:'08:00',note:['Con el desayuno','Avec le déjeuner','With breakfast'],giver:'p',active:true},
{id:'md2',circle_id:C,name:['Vitamina D','Vitamine D','Vitamin D'],dose:['1 cápsula','1 capsule','1 capsule'],times:'08:00',note:null,giver:'p',active:true},
{id:'md3',circle_id:C,name:['Gotas para los ojos','Gouttes pour les yeux','Eye drops'],dose:['1 gota en cada ojo','1 goutte dans chaque œil','1 drop in each eye'],times:'08:00, 20:00',note:null,giver:'s',active:true}];
T.med_logs=[];let lid=0;
for(let i=1;i<=6;i++){[['md1','08:00'],['md2','08:00'],['md3','08:00'],['md3','20:00']].forEach(([m,tm])=>{if((i===2&&m==='md3'&&tm==='20:00')||(i===4&&m==='md2'))return;T.med_logs.push({id:'l'+(++lid),circle_id:C,med_id:m,date:d(-i),time:tm,status:'given',given_by:tm==='20:00'?'s':'p',given_at:tm==='20:00'?'20:05':'08:10'})})}
T.med_logs.push({id:'l'+(++lid),circle_id:C,med_id:'md1',date:d(0),time:'08:00',status:'given',given_by:'p',given_at:'08:10'});
T.meetings=[{id:'mt1',circle_id:C,date:wd(3,6),time:'19:00:00',status:'done'},{id:'mt2',circle_id:C,date:d(9),time:'19:00:00',status:'planned'}];
T.meeting_points=[{id:'mp1',circle_id:C,meeting_id:'mt1',source:'manual',title:'',decision:['Turnarse las visitas de los domingos entre Sofía y Marc','Alterner les visites du dimanche entre Sofía et Marc','Take turns on Sunday visits between Sofía and Marc'],decision_who:'m'},
{id:'mp2',circle_id:C,meeting_id:'mt1',source:'manual',title:'',decision:['Camila se encarga de las llamadas al centro de salud','Camila s\'occupe des appels au centre de santé','Camila handles calls to the health center'],decision_who:'c'},
{id:'mp3',circle_id:C,meeting_id:null,source:'manual',ref:null,title:['Quiero hablar de quién me acompaña a las citas','Je veux parler de qui m\'accompagne aux rendez-vous','I want to talk about who goes with me to appointments'],added_by:'p',decision:null}];
let uid=0,user='u-s';const nid=()=>'x'+(++uid);
const mine=()=>T.circle_members.find(m=>m.user_id===user),circle=()=>T.circles[0];
const isRep=()=>circle().capacity_status==='represented'&&circle().rep_member_id===mine().id;
const speaks=()=>mine().role==='person'||isRep();
const seeVoice=v=>{const r=mine().role;if(r==='person'||v.vis==='family')return true;if(v.vis==='member')return v.vis_member===mine().id;return circle().rep_private_access&&isRep()};
const VIS={circle_private:()=>mine().role==='coord',notif_prefs:m=>m.user_id===user,voices:seeVoice,voice_replies:r=>seeVoice(T.voices.find(v=>v.id===r.voice_id)),documents:x=>x.vis==='all'||mine().role==='coord'||speaks(),moods:m=>m.user_id===user};
const lang=v=>Array.isArray(v)?v[window.CC_DEMO.li()]:v;
const out=r=>{const o={};for(const k in r)o[k]=lang(r[k]);return o};
const DEF={shifts:{status:'open',covered_by:null,declined_by:[]},meeting_points:{decision:null,decision_who:null,decision_due:null},tasks:{minutes:30,done_at:null,done_by:null,relief_member:null,priority:'normal'},messages:{important:false,sys_key:null},voices:{status:'new',via_member:null},documents:{storage_path:null,exp:null}};
class Q{constructor(t){this.t=t;this.f=[];this.op='select'}
 select(){return this} eq(c,v){this.f.push([c,v]);return this} in(c,vs){this.g=(this.g||[]).concat([r=>vs.includes(r[c])]);return this} gte(c,v){this.g=(this.g||[]).concat([r=>String(r[c])>=v]);return this} lte(c,v){this.g=(this.g||[]).concat([r=>String(r[c])<=v]);return this} order(c,o){this.o=[c,o&&o.ascending];return this} limit(n){this.n=n;return this} single(){this.s=true;return this}
 insert(r){this.op='insert';this.p=r;return this} update(r){this.op='update';this.p=r;return this} delete(){this.op='delete';return this} upsert(r){this.op='upsert';this.p=r;return this}
 match(r){return this.f.every(([c,v])=>r[c]===v)&&(this.g||[]).every(fn=>fn(r))}
 run(){const A=T[this.t];
  if(this.op==='insert'){A.push({id:nid(),created_at:new Date().toISOString(),...(DEF[this.t]||{}),...this.p});return null}
  if(this.op==='upsert'&&this.t==='circle_private'){const e=A.find(m=>m.circle_id===this.p.circle_id);if(e)Object.assign(e,this.p);else A.push({...this.p});return null}
  if(this.op==='upsert'){const e=A.find(m=>m.user_id===this.p.user_id&&m.week_start===this.p.week_start);if(e)e.level=this.p.level;else A.push({...this.p});return null}
  if(this.op==='update'){A.filter(r=>this.match(r)).forEach(r=>Object.assign(r,this.p));return null}
  if(this.op==='delete'){T[this.t]=A.filter(r=>!this.match(r));return null}
  let rows=A.filter(r=>this.match(r)&&(!VIS[this.t]||VIS[this.t](r))).map(out);
  if(this.t==='circle_members')rows=rows.map(r=>({...r,circles:{person_name:person.name}}));
  if(this.o){const [c,asc]=this.o;rows=[...rows].sort((x,y)=>String(x[c]).localeCompare(String(y[c]))*(asc===false?-1:1))}
  if(this.n)rows=rows.slice(0,this.n);
  return this.s?rows[0]:rows}
 then(a,b){let v;try{v={data:this.run(),error:null}}catch(e){v={data:null,error:e}}return Promise.resolve(v).then(a,b)}}
const sys=(k,who,what)=>T.messages.push({id:nid(),circle_id:C,author:mine().id,important:false,sys_key:k,sys_who:who,sys_what:what||null,created_at:new Date().toISOString()});
const nm=id=>T.circle_members.find(m=>m.id===id).display_name;
const clearRep=()=>Object.assign(circle(),{capacity_status:'autonomous',rep_member_id:null,rep_basis:null,rep_date:null,rep_note:null,rep_private_access:false,rep_proposed_by:null});
const E=m=>{throw new Error(m)};
const R={
 accept_shift:a=>{const x=T.shifts.find(q=>q.id===a.p_shift),me=mine();if(!x||x.status!=='open')throw{message:'shift_taken'};if(x.requested_by===me.id)throw{message:'own_shift'};x.status='accepted';x.covered_by=me.id;sys('sysShiftTaken',me.display_name,lang(x.what));return null},
 decline_shift:a=>{const x=T.shifts.find(q=>q.id===a.p_shift),me=mine();x.declined_by=[...(x.declined_by||[]),me.id];if(x.asked_member===me.id)x.asked_member=null;return null},
 cancel_shift:a=>{const x=T.shifts.find(q=>q.id===a.p_shift),me=mine();if(x.requested_by===me.id||me.role==='coord')x.status='cancelled';else if(x.covered_by===me.id){x.status='open';x.covered_by=null;sys('sysShiftReleased',me.display_name,lang(x.what))}return null},
 create_invite:a=>{const token='demo'+nid();T.invites.push({id:nid(),circle_id:C,token,display_name:a.p_name,relation:a.p_relation,city:a.p_city,role:a.p_role,contact:a.p_contact||null,lang:a.p_lang||'fr',accepted_at:null,created_at:new Date().toISOString(),expires_at:new Date(Date.now()+14*864e5).toISOString()});return token},
 set_member_role:a=>{const m=T.circle_members.find(x=>x.id===a.p_member);if(m.role==='coord'&&a.p_role!=='coord'&&T.circle_members.filter(x=>x.role==='coord').length===1)E('last_coord');m.role=a.p_role},
 remove_member:a=>{T.circle_members=T.circle_members.filter(x=>x.id!==a.p_member);T.tasks.forEach(x=>{if(x.who_member===a.p_member)x.who_member=null})},
 set_voice_status:a=>{T.voices.find(v=>v.id===a.p_voice).status=a.p_status},
 set_voice_vis:a=>{Object.assign(T.voices.find(v=>v.id===a.p_voice),{vis:a.p_vis,vis_member:a.p_vis_member})},
 propose_representation:a=>{Object.assign(circle(),{capacity_status:'pending',rep_member_id:a.p_member,rep_basis:a.p_basis,rep_date:a.p_date,rep_note:a.p_note,rep_private_access:a.p_basis==='court_decision'&&!!a.p_private,rep_proposed_by:mine().id});sys('sysRepProposed',mine().display_name,nm(a.p_member))},
 confirm_representation:()=>{const c=circle();if(mine().id===c.rep_proposed_by||mine().id===c.rep_member_id)E('needs_other_member');c.capacity_status='represented';sys('sysRepActive',mine().display_name,nm(c.rep_member_id))},
 end_representation:()=>{clearRep();sys('sysRepEnded',mine().display_name)},
 log_document_open:()=>null,discard_failed_doc:()=>null};
const client={from:t=>new Q(t),rpc:(f,a)=>{let v;try{v={data:R[f](a),error:null}}catch(e){v={data:null,error:e}}return Promise.resolve(v)},
 storage:{from:()=>({upload:async()=>({error:null}),remove:async()=>({data:[],error:null})})},
 auth:{onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}}),getSession:async()=>({data:{session:session()}})}};
const session=()=>({user:{id:user}});
window.CC_DEMO={client,session,setUser:u=>{user=u},li:()=>1};
})();
