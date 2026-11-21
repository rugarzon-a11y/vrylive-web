// Pages légales : remplit les noms et contacts, et affiche une seule langue à la fois.
(function(){
  var C=window.CC_CONFIG||{};
  document.querySelectorAll('[data-c]').forEach(function(el){el.textContent=C[el.dataset.c]||''});
  var codes=['es','fr','en'],T={back:['Volver a la aplicación','Retour à l’application','Back to the app'],
    rights:['Todos los derechos reservados.','Tous droits réservés.','All rights reserved.']};
  function pick(){var q=new URLSearchParams(location.search).get('lang');if(codes.indexOf(q)>-1)return codes.indexOf(q);
    try{var s=localStorage.getItem('cc-lang');if(s!==null&&codes[+s])return +s}catch(e){}
    var n=(navigator.language||'fr').slice(0,2);return n==='es'?0:n==='en'?2:1}
  function show(i){var code=codes[i];document.documentElement.lang=code;
    document.querySelectorAll('article[lang]').forEach(function(a){a.hidden=a.getAttribute('lang')!==code});
    document.querySelectorAll('.langs button').forEach(function(b){b.setAttribute('aria-pressed',b.dataset.l===code?'true':'false')});
    document.querySelectorAll('[data-org]').forEach(function(el){el.textContent=(code==='en'?C.orgNameEn:C.orgName)||''});
    document.querySelectorAll('[data-lt]').forEach(function(el){el.textContent=T[el.dataset.lt][i]});
    var h=document.querySelector('article[lang="'+code+'"] h1');if(h)document.title='Vrylive - '+h.textContent;
    try{localStorage.setItem('cc-lang',String(i))}catch(e){}}
  document.querySelectorAll('.langs button').forEach(function(b){b.addEventListener('click',function(){show(codes.indexOf(b.dataset.l))})});
  show(pick());
})();
