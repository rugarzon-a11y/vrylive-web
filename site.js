(function(){
var LANGS=['fr','es','en'];
function pick(){try{var q=new URLSearchParams(location.search).get('lang');if(LANGS.indexOf(q)>=0)return q;var s=localStorage.getItem('vl-lang');if(LANGS.indexOf(s)>=0)return s}catch(e){}var n=(navigator.language||'fr').slice(0,2);return LANGS.indexOf(n)>=0?n:'fr'}
var L=pick(),T=window.VL_T||{};
function apply(){var i=LANGS.indexOf(L);document.documentElement.lang=L;
 document.querySelectorAll('[data-t]').forEach(function(el){var v=T[el.getAttribute('data-t')];if(v)el.innerHTML=v[i]});
 document.querySelectorAll('[data-ta]').forEach(function(el){var p=el.getAttribute('data-ta').split(':'),v=T[p[1]];if(v)el.setAttribute(p[0],v[i])});
 document.querySelectorAll('[data-href-lang]').forEach(function(el){el.setAttribute('href',el.getAttribute('data-href-lang')+'?lang='+L)});
 if(T._title)document.title=T._title[i];
 document.querySelectorAll('.langs button').forEach(function(b){b.setAttribute('aria-pressed',String(b.getAttribute('data-l')===L))});
 try{localStorage.setItem('vl-lang',L)}catch(e){}}
document.addEventListener('click',function(e){var b=e.target.closest('.langs button');if(b){L=b.getAttribute('data-l');apply()}});
apply();
})();
