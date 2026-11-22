// First-party, approximate unique browsers. No IP, URL, referrer or fingerprint.
(function () {
  'use strict';
  if (location.hostname !== 'abubakr-english.pages.dev' ||
      /^\/admin(?:\.html)?\/?$/.test(location.pathname) ||
      navigator.globalPrivacyControl === true || navigator.doNotTrack === '1') return;
  var KEY = 'ab-visitor-v1';
  var PERIOD = 7 * 86400000;
  var sending = false;
  async function heartbeat() {
    if (document.visibilityState !== 'visible' || sending) return;
    sending = true;
    try {
      var now = Date.now();
      var state;
      try { state = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) {}
      if (!state || typeof state.id !== 'string' || !Number.isFinite(state.expires) || state.expires <= now) {
        state = { id: crypto.randomUUID(), expires: now + PERIOD, sent: 0 };
      }
      // Shared across tabs and pages, at most one heartbeat per minute normally.
      if (now - (state.sent || 0) < 60000) return;
      state.sent = now;
      localStorage.setItem(KEY, JSON.stringify(state));
      await fetch('/api/visitors', { method: 'POST', credentials: 'omit',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visitorId: state.id }) });
    } catch (e) { /* Storage blocked or offline: no tracking; never block the site. */ }
    finally { sending = false; }
  }
  heartbeat();
  setInterval(heartbeat, 60000);
  document.addEventListener('visibilitychange', heartbeat);
})();
