(function () {
  function getTheme() {
    var t = null;
    try { t = localStorage.getItem('siteTheme'); } catch (e) {}
    if (!t) {
      try { t = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'; } catch (e) { t = 'light'; }
    }
    return t === 'dark' ? 'dark' : 'light';
  }
  function apply(t) {
    document.documentElement.classList.toggle('dark', t === 'dark');
    try { localStorage.setItem('siteTheme', t); } catch (e) {}
    var mc = document.querySelector('meta[name="theme-color"]');
    if (mc) mc.setAttribute('content', t === 'dark' ? '#0D1117' : '#0F1B2E');
  }
  apply(getTheme());
  var toggles = document.querySelectorAll('.theme-toggle');
  for (var i = 0; i < toggles.length; i++) {
    toggles[i].addEventListener('click', function () {
      apply(document.documentElement.classList.contains('dark') ? 'light' : 'dark');
    });
  }
})();