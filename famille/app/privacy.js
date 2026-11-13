document.querySelectorAll('[data-c]').forEach(function(el){el.textContent=window.CC_CONFIG[el.dataset.c]||'[à compléter]'});
