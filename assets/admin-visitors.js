(function () {
  'use strict';
  var timer;
  var active = false;
  var demo = location.hostname !== 'abubakr-english.pages.dev' &&
    new URLSearchParams(location.search).get('stats-demo') === '1';
  var el = function (id) { return document.getElementById(id); };
  function counts(data) {
    ['today', 'week', 'online'].forEach(function (key) {
      el('visitors-' + key).textContent = new Intl.NumberFormat().format(data[key]);
    });
  }
  async function refresh() {
    if (!active || document.visibilityState !== 'visible') return;
    el('visitors-refresh').disabled = true;
    try {
      var r = await fetch('/api/visitors', { credentials: 'same-origin', cache: 'no-store' });
      var data = await r.json();
      if (!active) return;
      if (r.status === 401) { window.VisitorStats.stop(); return; }
      if (!r.ok) throw new Error(data.preview ? 'Preview only. Tracking starts after production approval.' : 'Counts unavailable. Try refreshing.');
      counts(data);
      el('visitors-status').textContent = 'Updated ' + new Date(data.updatedAt).toLocaleTimeString() + ' · refreshes every 60 seconds';
    } catch (err) {
      if (active) {
        ['today', 'week', 'online'].forEach(function (key) { el('visitors-' + key).textContent = '—'; });
        el('visitors-status').textContent = err.message || 'Counts unavailable. Try refreshing.';
      }
    } finally { el('visitors-refresh').disabled = false; }
  }
  window.VisitorStats = {
    demo: demo,
    start: function () {
      this.stop(); active = true;
      el('visitorStats').classList.remove('hidden');
      if (demo) {
        counts({ today: 128, week: 642, online: 4 });
        el('visitors-status').textContent = 'DEMO: sample numbers only, not real visitors. Preview tracking is off.';
        el('visitors-refresh').disabled = true;
        return;
      }
      refresh(); timer = setInterval(refresh, 60000);
    },
    stop: function () {
      active = false; clearInterval(timer);
      el('visitorStats').classList.add('hidden');
      ['today', 'week', 'online'].forEach(function (key) { el('visitors-' + key).textContent = '—'; });
    }
  };
  document.addEventListener('DOMContentLoaded', function () {
    el('visitors-refresh').addEventListener('click', refresh);
    document.addEventListener('visibilitychange', function () { if (!demo) refresh(); });
  });
})();
