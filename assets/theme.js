/* PDFMerger — theme switcher (light / dark / system) + scroll reveal */
(function () {
  'use strict';
  var KEY = 'pdfm-theme';
  var media = window.matchMedia('(prefers-color-scheme: dark)');

  function stored() {
    try { return localStorage.getItem(KEY) || 'system'; } catch (e) { return 'system'; }
  }
  function resolve(pref) {
    return pref === 'system' ? (media.matches ? 'dark' : 'light') : pref;
  }
  function apply(pref, animate) {
    if (animate) {
      document.documentElement.classList.add('theme-anim');
      setTimeout(function () { document.documentElement.classList.remove('theme-anim'); }, 500);
    }
    document.documentElement.setAttribute('data-theme', resolve(pref));
    updateButton(pref);
  }

  var btn;
  var icons = { light: 'fa-sun', dark: 'fa-moon', system: 'fa-circle-half-stroke' };
  var labels = { light: 'Theme: light (click for dark)', dark: 'Theme: dark (click for system)', system: 'Theme: system (click for light)' };
  function updateButton(pref) {
    if (!btn) return;
    btn.innerHTML = '<i class="fas ' + (icons[pref] || icons.system) + '"></i>';
    btn.setAttribute('aria-label', labels[pref] || labels.system);
    btn.title = labels[pref] || labels.system;
  }

  function init() {
    // inject toggle into the topbar
    var bar = document.querySelector('.topbar-inner');
    if (bar) {
      btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'theme-toggle';
      btn.addEventListener('click', function () {
        var order = ['light', 'dark', 'system'];
        var next = order[(order.indexOf(stored()) + 1) % order.length];
        try { localStorage.setItem(KEY, next); } catch (e) {}
        apply(next, true);
      });
      bar.appendChild(btn);
    }
    apply(stored(), false);
    media.addEventListener('change', function () { if (stored() === 'system') apply('system', true); });

    // scroll reveal (progressive enhancement; skipped for reduced motion)
    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!reduced && 'IntersectionObserver' in window) {
      var targets = document.querySelectorAll('.content-card, .value, .contact-card, .feature, .step, .compare-cell');
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
        });
      }, { threshold: 0.12 });
      targets.forEach(function (el) {
        var r = el.getBoundingClientRect();
        if (r.top < window.innerHeight * 0.9) return; // already visible: don't hide it
        el.classList.add('reveal');
        io.observe(el);
      });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();

/* ===== Motion & interface polish ===== */
(function () {
  'use strict';
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var canHover = window.matchMedia('(hover: hover)').matches;

  function ready(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }

  ready(function () {
    /* --- Active nav link --- */
    var path = location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.nav-links a').forEach(function (a) {
      var href = a.getAttribute('href');
      if (href === path) a.classList.add('active');
    });

    /* --- Button ripple --- */
    document.addEventListener('click', function (e) {
      var btn = e.target.closest('.btn');
      if (!btn || btn.disabled || reduced) return;
      var rect = btn.getBoundingClientRect();
      var d = Math.max(rect.width, rect.height);
      var span = document.createElement('span');
      span.className = 'ripple';
      span.style.width = span.style.height = d + 'px';
      span.style.left = (e.clientX - rect.left - d / 2) + 'px';
      span.style.top = (e.clientY - rect.top - d / 2) + 'px';
      btn.appendChild(span);
      setTimeout(function () { span.remove(); }, 600);
    });

    /* --- Cursor glow on cards (desktop pointers only) --- */
    if (canHover && !reduced) {
      document.querySelectorAll('.tool-card, .value, .content-card, .upload-section, .preview-section').forEach(function (el) {
        el.classList.add('glow-track');
        el.addEventListener('pointermove', function (e) {
          var r = el.getBoundingClientRect();
          el.style.setProperty('--mx', (e.clientX - r.left) + 'px');
          el.style.setProperty('--my', (e.clientY - r.top) + 'px');
        });
      });
    }

    /* --- Floating hero decorations --- */
    var hero = document.querySelector('header.hero, .hero');
    if (hero && !reduced) {
      var decos = [
        { icon: 'fa-file-pdf',    size: '2.1rem', top: '8%',  left: '6%',  dur: '11s', delay: '0s',    rot: '-10deg' },
        { icon: 'fa-object-group',size: '1.6rem', top: '18%', right: '9%', dur: '13s', delay: '-4s',   rot: '8deg' },
        { icon: 'fa-file-image',  size: '1.4rem', bottom: '6%', left: '14%', dur: '9s', delay: '-2s',  rot: '6deg' },
        { icon: 'fa-layer-group', size: '1.8rem', bottom: '12%', right: '15%', dur: '12s', delay: '-7s', rot: '-6deg' }
      ];
      decos.forEach(function (d) {
        var el = document.createElement('i');
        el.className = 'fas ' + d.icon + ' float-deco';
        el.setAttribute('aria-hidden', 'true');
        el.style.fontSize = d.size;
        if (d.top) el.style.top = d.top;
        if (d.bottom) el.style.bottom = d.bottom;
        if (d.left) el.style.left = d.left;
        if (d.right) el.style.right = d.right;
        el.style.setProperty('--fd-dur', d.dur);
        el.style.setProperty('--fd-delay', d.delay);
        el.style.setProperty('--fd-rot', d.rot);
        hero.appendChild(el);
      });
    }

    /* --- Scroll progress bar + back-to-top --- */
    var bar = document.createElement('div');
    bar.className = 'scroll-progress';
    bar.setAttribute('aria-hidden', 'true');
    document.body.appendChild(bar);

    var topBtn = document.createElement('button');
    topBtn.type = 'button';
    topBtn.className = 'back-top';
    topBtn.setAttribute('aria-label', 'Back to top');
    topBtn.innerHTML = '<i class="fas fa-arrow-up"></i>';
    topBtn.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
    });
    document.body.appendChild(topBtn);

    var ticking = false;
    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        var max = document.documentElement.scrollHeight - window.innerHeight;
        var pct = max > 0 ? (window.scrollY / max) * 100 : 0;
        bar.style.width = pct + '%';
        topBtn.classList.toggle('show', window.scrollY > 600);
        ticking = false;
      });
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  });
})();
