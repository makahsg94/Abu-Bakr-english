(function () {
  'use strict';
  // Never register from the admin. Existing service workers also never cache it.
  if (!('serviceWorker' in navigator) || !window.isSecureContext ||
      /^\/admin(?:\.html)?\/?$/i.test(location.pathname)) return;
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' })
      .catch(function () { /* Installation is optional; the website still works. */ });
  });
})();
