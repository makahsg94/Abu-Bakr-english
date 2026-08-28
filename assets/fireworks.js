(function () {
  if (window.__fwCanvas) return;

  var cv = document.createElement('canvas');
  cv.id = 'fw-canvas';
  cv.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:2147483000;opacity:.9';
  var ctx = cv.getContext('2d');
  var W = 0, H = 0;

  function size() {
    W = cv.width = window.innerWidth;
    H = cv.height = window.innerHeight;
  }
  size();
  window.addEventListener('resize', size);
  (document.body || document.documentElement).appendChild(cv);

  var P = [];
  var R = [];
  var hueBase = Math.random() * 360;

  function hue() { return (hueBase + Math.random() * 90 - 45 + 360) % 360; }

  function burst(x, y) {
    var h = hue();
    var n = 70 + Math.floor(Math.random() * 50);
    for (var i = 0; i < n; i++) {
      var a = Math.random() * Math.PI * 2;
      var v = 1.6 + Math.random() * 3.2;
      P.push({
        x: x, y: y,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v,
        g: 0.035 + Math.random() * 0.03,
        life: 1,
        decay: 0.010 + Math.random() * 0.014,
        s: 1.4 + Math.random() * 2.6,
        c: i % 4 === 0 ? '#fff' : 'hsla(' + h + ',' + Math.floor(85 + Math.random() * 15) + '%,' + Math.floor(58 + Math.random() * 15) + '%,.95)'
      });
    }
  }

  function fire(seedX) {
    var x = seedX != null ? seedX : 60 + Math.random() * (W - 120);
    var targetY = 30 + Math.random() * (H * 0.45);
    var dy = (targetY - H) / 85;
    R.push({ x: x, y: H + 4, vy: 5.5, targetY: targetY, dy: dy, h: hue(), trail: [] });
  }

  function step() {
    ctx.clearRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'lighter';

    var i;
    for (i = R.length - 1; i >= 0; i--) {
      var rk = R[i];
      rk.vy -= rk.dy;
      rk.y += rk.vy;
      rk.trail.push([rk.x, rk.y]);
      if (rk.trail.length > 12) rk.trail.shift();
      for (var t = 0; t < rk.trail.length - 1; t++) {
        ctx.strokeStyle = 'hsla(' + rk.h + ',90%,68%,' + (t / rk.trail.length) + ')';
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.moveTo(rk.trail[t][0], rk.trail[t][1]);
        ctx.lineTo(rk.trail[t + 1][0], rk.trail[t + 1][1]);
        ctx.stroke();
      }
      if (rk.vy <= 0) {
        burst(rk.x, rk.y);
        R.splice(i, 1);
      } else {
        ctx.fillStyle = 'hsl(' + rk.h + ',95%,72%)';
        ctx.beginPath();
        ctx.arc(rk.x, rk.y, 3.4, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    for (i = P.length - 1; i >= 0; i--) {
      var p = P[i];
      p.vy += p.g;
      p.vx *= 0.984;
      p.vy *= 0.984;
      p.x += p.vx;
      p.y += p.vy;
      p.life -= p.decay;
      if (p.life <= 0 || p.y > H + 8) { P.splice(i, 1); continue; }
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.c;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.s, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';

    if (window.__fwAuto <= 0) return;
    window.__fwAuto -= 1;
    if (window.__fwTick === undefined) window.__fwTick = 0;
    window.__fwTick += 1;
    if (window.__fwTick % 28 === 0) fire();
  }

  function loop() {
    step();
    requestAnimationFrame(loop);
  }

  window.__fwCanvas = true;
  window.__fwAuto = 0;

  document.addEventListener('click', function (e) {
    burst(e.clientX, e.clientY);
    if (Math.random() < 0.45) setTimeout(function () { fire(e.clientX); }, 220);
  }, { passive: true });

  function welcome() {
    window.__fwAuto = 6;
    var t = 0;
    var iv = setInterval(function () {
      fire();
      t += 1;
      if (t >= 5) { clearInterval(iv); window.__fwAuto = 0; }
    }, 900);
  }
  if (document.readyState === 'complete') welcome();
  else window.addEventListener('load', welcome, { once: true });

  loop();
})();