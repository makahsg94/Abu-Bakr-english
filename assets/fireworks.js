(function () {
  if (window.__fwCanvas) return;

  var cv = document.createElement('canvas');
  cv.id = 'fw-canvas';
  cv.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:2147483000;opacity:.95;transition:opacity 1.2s ease';
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

  function hue() { return (hueBase + Math.random() * 100 - 50 + 360) % 360; }

  function burst(x, y) {
    var h = hue();
    var n = 90 + Math.floor(Math.random() * 60);
    for (var i = 0; i < n; i++) {
      var a = Math.random() * Math.PI * 2;
      var v = 1.8 + Math.random() * 3.4;
      P.push({
        x: x, y: y,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v,
        g: 0.028 + Math.random() * 0.03,
        life: 1,
        decay: 0.010 + Math.random() * 0.014,
        s: 1.5 + Math.random() * 2.8,
        c: i % 4 === 0 ? '#fff' : 'hsla(' + h + ',' + Math.floor(85 + Math.random() * 15) + '%,' + Math.floor(58 + Math.random() * 15) + '%,.95)'
      });
    }
  }

  function fire(x) {
    var startY = H + 8;
    var apexY = H * (0.05 + Math.random() * 0.20);
    var g = 0.09 + Math.random() * 0.05;
    R.push({
      x: x != null ? x : 70 + Math.random() * (W - 140),
      y: startY,
      vy: -Math.sqrt(2 * g * (startY - apexY)),
      g: g,
      apexY: apexY,
      h: hue(),
      trail: []
    });
  }

  function step() {
    ctx.clearRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'lighter';

    var i;
    for (i = R.length - 1; i >= 0; i--) {
      var rk = R[i];
      rk.y += rk.vy;
      rk.vy += rk.g;
      rk.trail.push([rk.x, rk.y]);
      if (rk.trail.length > 14) rk.trail.shift();
      for (var t = 0; t < rk.trail.length - 1; t++) {
        ctx.strokeStyle = 'hsla(' + rk.h + ',90%,70%,' + (t / rk.trail.length) + ')';
        ctx.lineWidth = 2.6;
        ctx.beginPath();
        ctx.moveTo(rk.trail[t][0], rk.trail[t][1]);
        ctx.lineTo(rk.trail[t + 1][0], rk.trail[t + 1][1]);
        ctx.stroke();
      }
      if (rk.vy >= 0 || rk.y <= rk.apexY) {
        burst(rk.x, rk.y);
        R.splice(i, 1);
      } else {
        ctx.fillStyle = 'hsl(' + rk.h + ',95%,74%)';
        ctx.beginPath();
        ctx.arc(rk.x, rk.y, 3.6, 0, Math.PI * 2);
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

    if (window.__fwDone && !R.length && !P.length) {
      cv.style.opacity = '0';
      setTimeout(function () { cv.parentNode && cv.parentNode.removeChild(cv); }, 1300);
    }
  }

  function loop() { step(); requestAnimationFrame(loop); }

  window.__fwCanvas = true;
  window.__fwDone = false;

  function welcome() {
    burst(W * 0.5, H * 0.16);
    burst(W * 0.30, H * 0.24);
    burst(W * 0.70, H * 0.22);
    setTimeout(function () { fire(W * 0.24); }, 450);
    setTimeout(function () { fire(W * 0.52); }, 700);
    setTimeout(function () { fire(W * 0.76); }, 950);
    setTimeout(function () { fire(W * 0.40); }, 1350);
    setTimeout(function () { fire(W * 0.64); }, 1600);
    setTimeout(function () { fire(W * 0.15); }, 1900);
    setTimeout(function () { fire(W * 0.85); }, 2150);
    setTimeout(function () { burst(W * 0.5, H * 0.13); }, 2400);
    setTimeout(function () { window.__fwDone = true; }, 3400);
  }
  if (document.readyState === 'complete') welcome();
  else window.addEventListener('load', welcome, { once: true });

  loop();
})();