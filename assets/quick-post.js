/* =========================================================================
   Quick Post widget — lets the teacher write & publish an article from any
   page of the site (with a password login). The session lasts 7 days, so
   after the first login the button opens straight into the composer.
   ========================================================================= */
(function () {
  'use strict';

  var API = '/api/posts';
  var LOGIN = '/api/login';

  var STYLE = `
  .qp-fab{
    position:fixed;right:22px;bottom:22px;z-index:9998;
    display:inline-flex;align-items:center;gap:9px;
    padding:12px 20px;border-radius:999px;border:0;cursor:pointer;
    background:var(--navy,#0F1B2E);color:#fff;font-family:'Inter',sans-serif;
    font-size:.88rem;font-weight:600;letter-spacing:.01em;
    box-shadow:0 14px 30px -12px rgba(15,27,46,.55);
    transition:transform .25s cubic-bezier(.25,.8,.35,1),opacity .25s,box-shadow .25s;
  }
  .qp-fab:hover{transform:translateY(-2px);box-shadow:0 18px 36px -14px rgba(15,27,46,.6);}
  .qp-fab svg{width:16px;height:16px;flex:0 0 16px;}
  .qp-fab[hidden]{display:none;}
  .qp-backdrop{
    position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;
    background:rgba(10,16,26,.62);backdrop-filter:blur(4px);padding:20px;
  }
  .qp-backdrop[hidden]{display:none;}
  .qp-modal{
    width:100%;max-width:720px;max-height:92vh;overflow:auto;
    background:var(--paper,#FBF9F5);color:var(--ink,#17212F);
    border:1px solid var(--line,#E4E0D6);border-radius:22px;
    padding:30px 32px;box-shadow:0 30px 70px -25px rgba(0,0,0,.5);
    font-family:'Inter',sans-serif;
  }
  .qp-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:18px;}
  .qp-head h3{font-family:'Fraunces',serif;font-size:1.5rem;color:var(--navy,#0F1B2E);font-weight:500;margin:0;}
  html.dark .qp-head h3{color:#fff;}
  .qp-close{background:none;border:0;font-size:1.6rem;line-height:1;cursor:pointer;color:var(--muted,#5B6472);padding:0 4px;}
  .qp-close:hover{color:var(--gold,#B8873F);}
  .qp-modal label{display:block;font-size:.8rem;font-weight:700;margin:14px 0 6px;color:var(--ink,#17212F);letter-spacing:.02em;}
  .qp-modal input[type=text],.qp-modal input[type=password],.qp-modal input[type=url],.qp-modal textarea{
    width:100%;padding:11px 13px;border:1px solid var(--line,#E4E0D6);border-radius:10px;
    background:var(--white,#fff);color:var(--ink,#17212F);font-family:inherit;font-size:.95rem;
  }
  .qp-modal textarea{min-height:210px;resize:vertical;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;line-height:1.6;}
  .qp-modal input:focus,.qp-modal textarea:focus{outline:2px solid var(--gold,#B8873F);outline-offset:1px;}
  .qp-row{display:flex;gap:10px;flex-wrap:wrap;align-items:center;}
  .qp-file{
    display:inline-flex;align-items:center;gap:8px;padding:9px 14px;cursor:pointer;
    border:1px dashed var(--line,#E4E0D6);border-radius:10px;
    font-size:.85rem;font-weight:600;color:var(--ink,#17212F);background:var(--white,#fff);
  }
  .qp-file:hover{border-color:var(--gold,#B8873F);color:var(--gold,#B8873F);}
  .qp-file input{display:none;}
  .qp-preview{margin-top:10px;display:flex;gap:12px;align-items:center;flex-wrap:wrap;}
  .qp-preview img{max-width:150px;max-height:100px;border-radius:10px;border:1px solid var(--line,#E4E0D6);object-fit:cover;}
  .qp-preview span{font-size:.78rem;color:var(--muted,#5B6472);}
  .qp-btn{
    display:inline-flex;align-items:center;gap:8px;padding:11px 22px;border-radius:999px;
    border:0;cursor:pointer;font-family:inherit;font-size:.9rem;font-weight:600;
  }
  .qp-btn-primary{background:var(--navy,#0F1B2E);color:#fff;}
  .qp-btn-ghost{background:transparent;border:1px solid var(--line,#E4E0D6);color:var(--ink,#17212F);text-decoration:none;}
  .qp-btn-ghost:hover{border-color:var(--gold,#B8873F);color:var(--gold,#B8873F);}
  .qp-check{display:flex;align-items:center;gap:8px;margin-top:14px;font-size:.9rem;}
  .qp-check input{width:auto;}
  .qp-check label{margin:0;font-size:.9rem;}
  .qp-msg{margin-top:14px;padding:11px 14px;border-radius:10px;font-size:.88rem;}
  .qp-msg.ok{background:#dcfce7;color:#166534;}
  .qp-msg.err{background:#fee2e2;color:#991b1b;}
  .qp-hint{font-size:.8rem;color:var(--muted,#5B6472);margin-top:6px;}
  .qp-hidden{display:none !important;}
  .qp-toolbar{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:6px;}
  .qp-toolbar button{
    border:1px solid var(--line,#E4E0D6);background:var(--white,#fff);color:var(--ink,#17212F);
    border-radius:7px;padding:4px 10px;font-size:.78rem;cursor:pointer;font-family:inherit;
  }
  .qp-toolbar button:hover{border-color:var(--gold,#B8873F);color:var(--gold,#B8873F);}
  @media (max-width:640px){
    .qp-fab{right:14px;bottom:14px;padding:13px 18px;font-size:.86rem;}
    .qp-fab span{display:none;}
    .qp-fab svg{width:18px;height:18px;flex:0 0 18px;}
    .qp-modal{padding:22px 16px;border-radius:18px;}
    .qp-modal input[type=text],.qp-modal input[type=url],.qp-modal input[type=password]{font-size:16px;padding:12px 13px;}
    .qp-modal textarea{font-size:16px;min-height:180px;}
    .qp-btn{width:100%;justify-content:center;padding:13px 18px;}
    .qp-row .qp-btn{width:100%;}
    .qp-file{width:100%;justify-content:center;padding:12px 14px;}
    .qp-toolbar button{padding:9px 13px;font-size:.85rem;}
    .qp-backdrop{padding:10px;align-items:flex-end;}
    .qp-modal{max-height:94vh;}
  }
  `;

  var DICT = {
    'Write an article': 'اكتب مقالاً',
    'Title': 'العنوان',
    'Short summary': 'ملخص قصير',
    'Cover image URL': 'رابط صورة الغلاف',
    'Content (Markdown)': 'المحتوى (Markdown)',
    'Published': 'منشور',
    'Save & publish': 'احفظ وانشر',
    'Open full editor': 'افتح المحرر الكامل',
    'Saved! The post is live.': 'تم الحفظ! المقال منشور الآن.',
    'Wrong password.': 'كلمة السر غير صحيحة.',
    'Login': 'تسجيل الدخول',
    'Password': 'كلمة السر',
    'Unlock': 'فتح',
    'Add another': 'أضف مقالاً آخر',
    'Write': 'اكتب',
    'Upload image': 'ارفع صورة',
    'Clear': 'مسح',
    'Image': 'صورة',
    'Cover image ready': 'صورة الغلاف جاهزة',
    'Image uploaded and resized': 'تم رفع الصورة وتصغيرها',
    'Image added to the text': 'تمت إضافة الصورة داخل المقال',
    'Image is too large (max 12MB)': 'الصورة كبيرة أوي (الحد 12 ميجابايت)',
    'Image is still too large — please use a smaller one': 'الصورة لسه كبيرة — جرّب صورة أصغر',
    'Could not read that image': 'مش قادر أقرا الصورة',
    'Could not sign in. Please try again.': 'تعذّر تسجيل الدخول. جرّب تاني.',
    'Please add a title.': 'من فضلك اكتب عنواناً.',
    'Please write some content.': 'من فضلك اكتب محتوى المقال.',
    'Could not save the post.': 'تعذّر حفظ المقال.',
    'Network error — please try again.': 'خطأ في الشبكة — جرّب تاني.'
  };

  var authed = false;
  var root, fab, backdrop, modal;

  function esc(s) {
    return String(s || '').replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function api(path, opts) {
    opts = opts || {};
    opts.credentials = 'same-origin';
    opts.headers = Object.assign({ 'Content-Type': 'application/json' }, opts.headers || {});
    if (opts.body && typeof opts.body !== 'string') opts.body = JSON.stringify(opts.body);
    return fetch(path, opts).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (data) {
        return { ok: r.ok, status: r.status, data: data };
      });
    });
  }

  /* resize + compress an image before it goes into the database */
  function compressImage(file, maxW, quality) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function (e) {
        var img = new Image();
        img.onload = function () {
          var w = img.width, h = img.height;
          if (w > maxW) { h = Math.round(h * maxW / w); w = maxW; }
          var c = document.createElement('canvas');
          c.width = w; c.height = h;
          c.getContext('2d').drawImage(img, 0, 0, w, h);
          resolve(c.toDataURL('image/jpeg', quality));
        };
        img.onerror = reject;
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function showCoverPreview(value) {
    var box = root.querySelector('#qpCoverPreview');
    if (!box) return;
    if (!value) { box.innerHTML = ''; return; }
    box.innerHTML = '<img src="' + esc(value) + '" alt="cover preview"><span>Cover image ready</span>';
  }

  function build() {
    var style = document.createElement('style');
    style.textContent = STYLE;
    document.head.appendChild(style);

    root = document.createElement('div');
    root.id = 'qp-root';
    root.innerHTML =
      '<button class="qp-fab" type="button" id="qpFab" aria-haspopup="dialog">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>' +
        '<span>Write</span>' +
      '</button>' +
      '<div class="qp-backdrop" id="qpBackdrop" hidden>' +
        '<div class="qp-modal" role="dialog" aria-modal="true" aria-label="Write an article" id="qpModal">' +
          '<div class="qp-head">' +
            '<h3>Write an article</h3>' +
            '<button class="qp-close" type="button" id="qpClose" aria-label="Close">&times;</button>' +
          '</div>' +
          '<div id="qpLogin">' +
            '<label>Password</label>' +
            '<input type="password" id="qpPassword" placeholder="Admin password" autocomplete="current-password">' +
            '<div class="qp-row" style="margin-top:14px;">' +
              '<button class="qp-btn qp-btn-primary" type="button" id="qpUnlock">Unlock</button>' +
            '</div>' +
            '<div id="qpLoginMsg"></div>' +
          '</div>' +
          '<form id="qpForm" class="qp-hidden">' +
            '<label>Title</label>' +
            '<input type="text" id="qpTitle" placeholder="Post title" required>' +
            '<label>Short summary</label>' +
            '<input type="text" id="qpExcerpt" placeholder="One or two lines for the card">' +
            '<label>Cover image URL</label>' +
            '<input type="url" id="qpCover" placeholder="https://…">' +
            '<div class="qp-row" style="margin-top:8px;">' +
              '<label class="qp-file" for="qpCoverFile">' +
                '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>' +
                'Upload image' +
                '<input type="file" id="qpCoverFile" accept="image/*">' +
              '</label>' +
              '<button type="button" class="qp-btn qp-btn-ghost" id="qpClearCover">Clear</button>' +
            '</div>' +
            '<div class="qp-preview" id="qpCoverPreview"></div>' +
            '<label>Content (Markdown)</label>' +
            '<div class="qp-toolbar">' +
              '<button type="button" data-md="## ">H2</button>' +
              '<button type="button" data-md="**bold**"><b>B</b></button>' +
              '<button type="button" data-md="*italic*"><i>I</i></button>' +
              '<button type="button" data-md="- ">&bull;</button>' +
              '<button type="button" data-md="1. ">1.</button>' +
              '<button type="button" data-md="[text](https://)">Link</button>' +
              '<button type="button" id="qpImageBtn" title="Upload an image into the text">Image</button>' +
            '</div>' +
            '<input type="file" id="qpImageFile" accept="image/*" style="display:none;">' +
            '<textarea id="qpContent" placeholder="# Heading&#10;&#10;Write your article here…"></textarea>' +
            '<div class="qp-check">' +
              '<input type="checkbox" id="qpPublished" checked>' +
              '<label for="qpPublished">Published</label>' +
            '</div>' +
            '<div class="qp-row" style="margin-top:18px;">' +
              '<button class="qp-btn qp-btn-primary" type="submit">Save &amp; publish</button>' +
              '<a class="qp-btn qp-btn-ghost" href="/admin">Open full editor</a>' +
            '</div>' +
            '<div id="qpMsg"></div>' +
          '</form>' +
        '</div>' +
      '</div>';
    document.body.appendChild(root);

    fab = root.querySelector('#qpFab');
    backdrop = root.querySelector('#qpBackdrop');
    modal = root.querySelector('#qpModal');

    fab.addEventListener('click', open);
    root.querySelector('#qpClose').addEventListener('click', close);
    backdrop.addEventListener('click', function (e) { if (e.target === backdrop) close(); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !backdrop.hidden) close();
    });

    root.querySelector('#qpUnlock').addEventListener('click', unlock);
    root.querySelector('#qpPassword').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); unlock(); }
    });

    root.querySelector('#qpForm').addEventListener('submit', save);

    root.querySelectorAll('.qp-toolbar button[data-md]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var ta = root.querySelector('#qpContent');
        var md = btn.dataset.md;
        var start = ta.selectionStart || 0;
        var end = ta.selectionEnd || 0;
        var sel = ta.value.slice(start, end);
        ta.value = ta.value.slice(0, start) + md + sel + ta.value.slice(end);
        ta.focus();
        var pos = start + md.length;
        ta.setSelectionRange(pos, pos + sel.length);
      });
    });

    /* upload a cover image */
    root.querySelector('#qpCoverFile').addEventListener('change', function (e) {
      var file = e.target.files && e.target.files[0];
      if (!file) return;
      if (file.size > 12 * 1024 * 1024) { msgIn('Image is too large (max 12MB)', true); return; }
      compressImage(file, 1400, 0.82).then(function (dataUrl) {
        if (dataUrl.length > 900000) { msgIn('Image is still too large — please use a smaller one', true); return; }
        root.querySelector('#qpCover').value = dataUrl;
        showCoverPreview(dataUrl);
        msgIn('Image uploaded and resized', false);
      }).catch(function () { msgIn('Could not read that image', true); });
    });

    root.querySelector('#qpClearCover').addEventListener('click', function () {
      root.querySelector('#qpCover').value = '';
      root.querySelector('#qpCoverFile').value = '';
      showCoverPreview('');
    });

    root.querySelector('#qpCover').addEventListener('input', function () {
      showCoverPreview(this.value.trim());
    });

    /* upload an image straight into the article text */
    root.querySelector('#qpImageBtn').addEventListener('click', function () {
      root.querySelector('#qpImageFile').click();
    });
    root.querySelector('#qpImageFile').addEventListener('change', function (e) {
      var file = e.target.files && e.target.files[0];
      if (!file) return;
      if (file.size > 12 * 1024 * 1024) { msgIn('Image is too large (max 12MB)', true); return; }
      var ta = root.querySelector('#qpContent');
      var start = ta.selectionStart || ta.value.length;
      compressImage(file, 1400, 0.82).then(function (dataUrl) {
        if (dataUrl.length > 900000) { msgIn('Image is still too large — please use a smaller one', true); return; }
        var snippet = '\n![' + (file.name.replace(/\.[^.]+$/, '') || 'image') + '](' + dataUrl + ')\n';
        ta.value = ta.value.slice(0, start) + snippet + ta.value.slice(start);
        ta.focus();
        ta.setSelectionRange(start + snippet.length, start + snippet.length);
        e.target.value = '';
        msgIn('Image added to the text', false);
      }).catch(function () { msgIn('Could not read that image', true); });
    });
  }

  function msgIn(text, isError) {
    var box = root.querySelector('#qpMsg');
    if (!box) return;
    box.innerHTML = '<div class="qp-msg ' + (isError ? 'err' : 'ok') + '">' + esc(text) + '</div>';
  }

  function showFab() {
    fab.hidden = false;
  }

  function open() {
    backdrop.hidden = false;
    document.body.style.overflow = 'hidden';
    if (authed) {
      showForm();
    } else {
      root.querySelector('#qpLogin').classList.remove('qp-hidden');
      root.querySelector('#qpForm').classList.add('qp-hidden');
      setTimeout(function () { root.querySelector('#qpPassword').focus(); }, 60);
    }
  }

  function close() {
    backdrop.hidden = true;
    document.body.style.overflow = '';
  }

  function showForm() {
    root.querySelector('#qpLogin').classList.add('qp-hidden');
    root.querySelector('#qpForm').classList.remove('qp-hidden');
    setTimeout(function () { root.querySelector('#qpTitle').focus(); }, 60);
  }

  function unlock() {
    var pw = root.querySelector('#qpPassword').value;
    var msg = root.querySelector('#qpLoginMsg');
    api(LOGIN, { method: 'POST', body: { password: pw } }).then(function (r) {
      if (r.ok) {
        authed = true;
        msg.innerHTML = '';
        showFab();
        showForm();
      } else {
        msg.innerHTML = '<div class="qp-msg err">Wrong password.</div>';
      }
    }).catch(function () {
      msg.innerHTML = '<div class="qp-msg err">Could not sign in. Please try again.</div>';
    });
  }

  function save(e) {
    e.preventDefault();
    var body = {
      title: root.querySelector('#qpTitle').value.trim(),
      excerpt: root.querySelector('#qpExcerpt').value.trim(),
      cover_image: root.querySelector('#qpCover').value.trim(),
      content: root.querySelector('#qpContent').value.trim(),
      published: root.querySelector('#qpPublished').checked
    };
    var msg = root.querySelector('#qpMsg');
    if (!body.title) { msg.innerHTML = '<div class="qp-msg err">Please add a title.</div>'; return; }
    if (!body.content) { msg.innerHTML = '<div class="qp-msg err">Please write some content.</div>'; return; }
    msg.innerHTML = '';
    api(API, { method: 'POST', body: body }).then(function (r) {
      if (!r.ok) {
        msg.innerHTML = '<div class="qp-msg err">' + esc((r.data && r.data.error) || 'Could not save the post.') + '</div>';
        return;
      }
      var post = r.data.post || {};
      msg.innerHTML = '<div class="qp-msg ok">Saved! The post is live.' +
        (post.slug ? ' <a href="/post.html?slug=' + encodeURIComponent(post.slug) + '" target="_blank" rel="noopener">View it</a>' : '') +
        '</div>' +
        '<div class="qp-row" style="margin-top:12px;"><button class="qp-btn qp-btn-ghost" type="button" id="qpAgain">Add another</button></div>';
      root.querySelector('#qpTitle').value = '';
      root.querySelector('#qpExcerpt').value = '';
      root.querySelector('#qpCover').value = '';
      root.querySelector('#qpContent').value = '';
      var again = root.querySelector('#qpAgain');
      if (again) again.addEventListener('click', function () { msg.innerHTML = ''; root.querySelector('#qpTitle').focus(); });
    }).catch(function () {
      msg.innerHTML = '<div class="qp-msg err">Network error — please try again.</div>';
    });
  }

  /* translate the widget chrome when the site is in Arabic */
  var PLACEHOLDER = {
    'qpPassword': ['Admin password', 'كلمة سر الأدمن'],
    'qpTitle': ['Post title', 'عنوان المقال'],
    'qpExcerpt': ['One or two lines for the card', 'سطر أو اتنين للكارت'],
    'qpCover': ['https://…', 'https://…'],
    'qpContent': ['# Heading\n\nWrite your article here…', '# عنوان\n\nاكتب مقالك هنا…']
  };

  function translate(l) {
    if (!root) return;
    var nodes = [];
    var w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    var n;
    while ((n = w.nextNode())) {
      if (!n.parentElement || ['SCRIPT', 'STYLE'].includes(n.parentElement.tagName)) continue;
      nodes.push(n);
    }
    nodes.forEach(function (x) {
      var en = x.nodeValue.trim();
      if (!en) return;
      if (l === 'ar' && DICT[en]) x.nodeValue = x.nodeValue.replace(en, DICT[en]);
    });
    if (l === 'ar') {
      Object.keys(PLACEHOLDER).forEach(function (id) {
        var el = root.querySelector('#' + id);
        if (el) el.setAttribute('placeholder', PLACEHOLDER[id][1]);
      });
    } else {
      Object.keys(PLACEHOLDER).forEach(function (id) {
        var el = root.querySelector('#' + id);
        if (el) el.setAttribute('placeholder', PLACEHOLDER[id][0]);
      });
    }
  }

  function init() {
    build();
    // The button is for admins only: it stays hidden for visitors and shows
    // up as soon as an admin session is active (7 days).
    fab.hidden = true;
    api(LOGIN).then(function (r) {
      authed = !!(r.ok && r.data && r.data.authed);
      if (authed) showFab();
    }).catch(function () {});

    // Shortcut for admins: Alt+W opens the composer anywhere on the site.
    document.addEventListener('keydown', function (e) {
      if (e.altKey && !e.ctrlKey && !e.metaKey && (e.key === 'w' || e.key === 'W')) {
        e.preventDefault();
        open();
      }
    });

    document.addEventListener('siteLanguageChanged', function (e) { translate(e.detail); });
    var l = document.documentElement.lang === 'ar' ? 'ar' : 'en';
    if (l === 'ar') setTimeout(function () { translate('ar'); }, 50);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
