/*
 * "Como funciona": one live card per step, in the spirit of a studio map.
 * Each card runs its own small GSAP timeline (vendored, assets/vendor/
 * gsap.min.js) on a loop, types its task log with a blinking cursor, and
 * explains itself only when someone points at an object: the captions come
 * from window.AlphaScenes.como (assets/scenes.js) and are wired by
 * AlphaLoop.Captions (assets/loop.js).
 *
 * Timelines play only while their card is on screen, stop with the tab, can
 * be paused per card, and under prefers-reduced-motion jump to their final
 * frame (captions still work). A fixed progress rail follows the step in
 * view and scrolls to a step on click.
 */
(function () {
  'use strict';
  var gsap = window.gsap;
  var loop = window.AlphaLoop;
  var data = (window.AlphaScenes || {}).como || {};
  var reduced = loop ? loop.reduced : false;
  if (!gsap || !loop) return;

  function $(root, sel) { return root.querySelector(sel); }
  function $$(root, sel) { return Array.prototype.slice.call(root.querySelectorAll(sel)); }

  /* typing helper: writes text into el over dur seconds, inside the timeline */
  function type(tl, el, text, at, dur) {
    var o = { n: 0 };
    tl.fromTo(o, { n: 0 }, {
      n: text.length, duration: dur || Math.max(0.5, text.length * 0.035), ease: 'none',
      onUpdate: function () { el.textContent = text.slice(0, Math.round(o.n)); }
    }, at);
  }
  /* run a function at a time and again at the start of every loop */
  function at(tl, t, fn) { tl.call(fn, null, t); }

  /* the task log: one line per entry, typed, with the cursor on the newest */
  function taskLog(card, lines, times) {
    var ul = $(card, '.tasklog ul');
    var lis = lines.map(function (text) {
      var li = document.createElement('li');
      var tx = document.createElement('span');
      var cur = document.createElement('span');
      cur.className = 'tl-cur';
      li.appendChild(tx);
      li.appendChild(cur);
      ul.appendChild(li);
      return { li: li, tx: tx, text: text };
    });
    return function (tl) {
      tl.set(lis.map(function (l) { return l.li; }), { autoAlpha: 0, attr: { 'data-cur': '0' } }, 0);
      lis.forEach(function (l, i) {
        var t = times[i];
        tl.set(l.li, { autoAlpha: 1, attr: { 'data-cur': '1' } }, t);
        if (i > 0) tl.set(lis[i - 1].li, { attr: { 'data-cur': '0' } }, t);
        type(tl, l.tx, l.text, t, Math.min(1.1, 0.06 * l.text.length + 0.3));
      });
    };
  }

  var pop = { scale: 1, autoAlpha: 1, duration: 0.45, ease: 'back.out(2.2)' };
  var rise = { y: 0, autoAlpha: 1, duration: 0.55, ease: 'power3.out' };

  var builders = {
    widget: function (c, tl) {
      var cur = $(c, '.w-cursor'), fab = $(c, '.fab'), form = $(c, '.wform');
      var sel = $(c, '.sel'), n = $(c, '.sel-n'), lines = $$(c, '.c-line'), chips = $$(c, '.chips span');
      var q = $(c, '.qchip'), qt = $(c, '.q-txt');
      tl.set(cur, { left: '12%', top: '84%' }, 0)
        .set(form, { autoAlpha: 0, y: 8 }, 0)
        .set(sel, { autoAlpha: 0, scaleX: 0, scaleY: 0, transformOrigin: '0 0' }, 0)
        .set(n, { autoAlpha: 0, scale: 0.4 }, 0)
        .set(lines, { autoAlpha: 0, x: -8 }, 0)
        .set(chips, { autoAlpha: 0, y: 6 }, 0);
      at(tl, 0, function () { qt.textContent = 'online · fila 0'; q.classList.remove('is-off'); });
      tl.to(cur, { left: '84%', top: '80%', duration: 1.1, ease: 'power2.inOut' }, 0.3)
        .to(fab, { scale: 0.9, duration: 0.15, yoyo: true, repeat: 1, ease: 'power1.inOut' }, 1.4)
        .to(form, rise, 1.7)
        .to(cur, { left: '17%', top: '56%', duration: 1, ease: 'power2.inOut' }, 2.3)
        .to(sel, { autoAlpha: 1, duration: 0.2 }, 3.3)
        .to(sel, { scaleX: 1, scaleY: 1, duration: 1, ease: 'power2.inOut' }, 3.3)
        .to(cur, { left: '61%', top: '72%', duration: 1, ease: 'power2.inOut' }, 3.3)
        .to(n, pop, 4.4)
        .to(lines, { autoAlpha: 1, x: 0, duration: 0.45, stagger: 0.35, ease: 'power3.out' }, 5)
        .to(chips, { autoAlpha: 1, y: 0, duration: 0.4, stagger: 0.15, ease: 'power3.out' }, 6.1);
      at(tl, 7.4, function () { qt.textContent = 'sem conexão · fila 1'; q.classList.add('is-off'); });
      at(tl, 9.0, function () { qt.textContent = 'conexão voltou · enviado'; q.classList.remove('is-off'); });
      tl.to(q, { scale: 1.06, duration: 0.2, yoyo: true, repeat: 1 }, 9.0)
        .to([sel, n, form], { autoAlpha: 0, duration: 0.6, ease: 'power2.in' }, 11.2);
      return [0.3, 3.3, 5.0, 9.0];
    },

    painel: function (c, tl) {
      var rows = $$(c, '.row'), pill = $(c, '[data-pill]'), drawer = $(c, '.app-drawer');
      var steps = $$(c, '.tracker span'), key = $(c, '.app-key'), hist = $(c, '.hist b');
      tl.set(rows, { autoAlpha: 0, y: -14 }, 0)
        .set(drawer, { autoAlpha: 0, x: 18 }, 0);
      at(tl, 0, function () {
        pill.textContent = 'novo'; hist.textContent = 'triado';
        steps.forEach(function (s) { s.classList.remove('is-on'); });
      });
      tl.to(rows.slice().reverse(), { autoAlpha: 1, y: 0, duration: 0.55, stagger: 0.45, ease: 'power3.out' }, 0.4);
      at(tl, 1.4, function () { steps[0].classList.add('is-on'); });
      tl.to(pill, { scale: 1.18, duration: 0.2, yoyo: true, repeat: 1 }, 2.2)
        .to(drawer, { autoAlpha: 1, x: 0, duration: 0.6, ease: 'power3.out' }, 3.2);
      at(tl, 4.6, function () { pill.textContent = 'triado'; steps[1].classList.add('is-on'); });
      tl.to(pill, { scale: 1.18, duration: 0.2, yoyo: true, repeat: 1 }, 4.6)
        .to(key, { x: 3, duration: 0.08, yoyo: true, repeat: 3 }, 6.6);
      at(tl, 8.0, function () { pill.textContent = 'aceito'; steps[2].classList.add('is-on'); });
      tl.to(pill, { scale: 1.18, duration: 0.2, yoyo: true, repeat: 1 }, 8.0)
        .to([drawer], { autoAlpha: 0, duration: 0.5 }, 11);
      return [0.4, 3.2, 4.6, 7.2];
    },

    triagem: function (c, tl) {
      var lines = $$(c, '.fb-lines i'), bar = $(c, '.scan-bar'), stamp = $(c, '.stamp');
      var cells = $$(c, '.dups-grid i'), res = $(c, '.dups-res'), labs = $$(c, '.labels .lab');
      var fill = $(c, '.budget .b-track i'), priv = $(c, '.privacy');
      tl.set(lines, { scaleX: 0, transformOrigin: '0 50%' }, 0)
        .set(bar, { left: '0%', autoAlpha: 0 }, 0)
        .set(stamp, { autoAlpha: 0, scale: 0.6 }, 0)
        .set(cells, { opacity: 0.25 }, 0)
        .set(res, { autoAlpha: 0 }, 0)
        .set(labs, { autoAlpha: 0, scale: 1.7 }, 0)
        .set(fill, { width: '0%' }, 0)
        .to(lines, { scaleX: 1, duration: 0.6, stagger: 0.15, ease: 'power2.out' }, 0.3)
        .to(bar, { autoAlpha: 1, duration: 0.2 }, 1.1)
        .to(bar, { left: '100%', duration: 1.3, ease: 'power2.inOut' }, 1.1)
        .to(bar, { autoAlpha: 0, duration: 0.2 }, 2.4)
        .to(stamp, pop, 2.5)
        .to(cells, { opacity: 1, duration: 0.12, stagger: 0.07, ease: 'power1.out' }, 3.2)
        .to(cells, { opacity: 0.25, duration: 0.3, stagger: 0.07, ease: 'power1.in' }, 3.45)
        .to(res, rise, 5.0)
        .to(labs, { autoAlpha: 1, scale: 1, duration: 0.42, stagger: 0.22, ease: 'back.out(2.4)' }, 5.6)
        .to(fill, { width: '7%', duration: 1.2, ease: 'power2.out' }, 7.4)
        .to(priv, { scale: 1.04, duration: 0.25, yoyo: true, repeat: 1 }, 8.6)
        .to([stamp, res], { autoAlpha: 0, duration: 0.5 }, 11.2);
      return [1.1, 3.2, 5.6, 7.4];
    },

    github: function (c, tl) {
      var title = $(c, '.is-title'), kv = $$(c, '.kv'), labs = $$(c, '.issue .labels .lab');
      var num = $(c, '.is-n'), state = $(c, '.is-state'), shackle = $(c, '.shackle');
      var btn = $(c, '.ghbtn'), knob = $(c, '.toggle .sw i'), sw = $(c, '.toggle');
      var text = title.getAttribute('data-type');
      tl.set(kv, { autoAlpha: 0, x: -8 }, 0)
        .set(labs, { autoAlpha: 0, scale: 1.6 }, 0)
        .set([num, state], { autoAlpha: 0, scale: 0.6 }, 0)
        .set(shackle, { y: -4 }, 0)
        .set(knob, { x: 0 }, 0);
      at(tl, 0, function () { title.textContent = ''; sw.classList.remove('is-on'); });
      tl.to(shackle, { y: 0, duration: 0.5, ease: 'bounce.out' }, 0.3)
        .to(btn, { scale: 0.94, duration: 0.15, yoyo: true, repeat: 1 }, 1.2);
      type(tl, title, text, 1.6, 1.6);
      tl.to(kv, { autoAlpha: 1, x: 0, duration: 0.4, stagger: 0.2, ease: 'power3.out' }, 3.3)
        .to(labs, { autoAlpha: 1, scale: 1, duration: 0.42, stagger: 0.2, ease: 'back.out(2.4)' }, 4.6)
        .to([state, num], pop, 5.7)
        .to(knob, { x: 14, duration: 0.35, ease: 'power2.inOut' }, 8.0);
      at(tl, 8.0, function () { sw.classList.add('is-on'); });
      return [0.3, 1.6, 4.6, 5.7];
    },

    implementador: function (c, tl) {
      var ap = $(c, '.approve'), btn = $(c, '.ap-btn'), term = $$(c, '.mterm .tl'), pb = $(c, '.pb i');
      var dl = $$(c, '.d-l'), cks = $$(c, '.ck'), cost = $(c, '.cost .b-track i');
      tl.set(term, { autoAlpha: 0 }, 0)
        .set(pb, { width: '0%' }, 0)
        .set(dl, { autoAlpha: 0, x: -10 }, 0)
        .set(cks, { autoAlpha: 0, y: 6 }, 0)
        .set(cost, { width: '0%' }, 0);
      at(tl, 0, function () { ap.classList.remove('is-ok'); });
      tl.to(btn, { scale: 0.92, duration: 0.15, yoyo: true, repeat: 1 }, 0.5);
      at(tl, 0.8, function () { ap.classList.add('is-ok'); });
      tl.to(term, { autoAlpha: 1, duration: 0.3, stagger: 0.3 }, 1.4)
        .to(pb, { width: '100%', duration: 1.4, ease: 'power2.inOut' }, 1.7)
        .to(dl, { autoAlpha: 1, x: 0, duration: 0.45, stagger: 0.6, ease: 'power3.out' }, 3.4)
        .to(cks, { autoAlpha: 1, y: 0, duration: 0.4, stagger: 0.35, ease: 'back.out(2)' }, 5.2)
        .to(cost, { width: '19%', duration: 1.4, ease: 'power2.out' }, 6.6);
      return [0.5, 1.4, 3.4, 5.2];
    },

    revisao: function (c, tl) {
      var pr = $(c, '.prcard'), st = $(c, '.pr-state'), checks = $(c, '.pr-checks'), btn = $(c, '.rv-btn');
      var done = $(c, '.rv-done'), fail = $(c, '.fail'), steps = $$(c, '.tracker span');
      tl.set(pr, { autoAlpha: 0, y: 12 }, 0)
        .set(checks, { autoAlpha: 0 }, 0)
        .set(done, { autoAlpha: 0, y: 6 }, 0);
      at(tl, 0, function () {
        st.textContent = 'Draft'; st.classList.remove('is-merged');
        steps.forEach(function (s, i) { s.classList.toggle('is-on', i < 3); });
      });
      tl.to(pr, rise, 0.4)
        .to(checks, { autoAlpha: 1, duration: 0.4 }, 1.6)
        .to(btn, { scale: 0.92, duration: 0.15, yoyo: true, repeat: 1 }, 3.6)
        .to(done, rise, 4.1);
      at(tl, 4.1, function () { st.textContent = 'Merged'; st.classList.add('is-merged'); });
      tl.to(fail, { opacity: 1, duration: 0.3, yoyo: true, repeat: 1 }, 5.4);
      at(tl, 6.4, function () { steps[3].classList.add('is-on'); });
      at(tl, 7.2, function () { steps[4].classList.add('is-on'); });
      tl.to(steps[4], { scale: 1.12, duration: 0.25, yoyo: true, repeat: 1 }, 7.2);
      return [0.4, 1.6, 3.6, 7.2];
    },

    terminal: function (c, tl) {
      var typed = $$(c, '.typed'), outs = $$(c, '.mterm .out'), calls = $$(c, '.call');
      var audit = $(c, '.audit'), key = $(c, '.kchip'), manage = $(c, '.sc.on');
      var t1 = typed[0].getAttribute('data-type'), t2 = typed[1].getAttribute('data-type');
      var auditText = audit.textContent;
      tl.set(outs, { autoAlpha: 0 }, 0)
        .set(calls, { autoAlpha: 0, x: -8 }, 0);
      at(tl, 0, function () { typed[0].textContent = ''; typed[1].textContent = ''; audit.textContent = ''; });
      tl.to(key, { scale: 1.08, duration: 0.2, yoyo: true, repeat: 1 }, 0.2)
        .to(manage, { scale: 1.12, duration: 0.2, yoyo: true, repeat: 1 }, 0.6);
      type(tl, typed[0], t1, 0.9, 1.4);
      tl.to(outs.slice(0, 2), { autoAlpha: 1, duration: 0.25, stagger: 0.2 }, 2.4);
      type(tl, typed[1], t2, 3.0, 1.6);
      tl.to(outs[2], { autoAlpha: 1, duration: 0.25 }, 4.7)
        .to(calls, { autoAlpha: 1, x: 0, duration: 0.35, stagger: 0.45, ease: 'power3.out' }, 5.4)
        .to(calls[3], { x: 4, duration: 0.07, yoyo: true, repeat: 5 }, 7.0);
      type(tl, audit, auditText, 7.6, 1.2);
      return [0.2, 0.9, 5.4, 7.6];
    },

    seguranca: function (c, tl) {
      var probe = $(c, '.probe'), shackles = $$(c, '.vault .shackle'), deny = $(c, '.deny');
      var bars = $$(c, '.redact .bar'), lim = $(c, '.limits'), wall = $(c, '.wall');
      tl.set(probe, { left: '8%', top: '30%', autoAlpha: 0 }, 0)
        .set(shackles, { y: -4 }, 0)
        .set(deny, { autoAlpha: 0, scale: 0.6 }, 0)
        .set(bars, { scaleX: 0, transformOrigin: '0 50%' }, 0)
        .to(probe, { autoAlpha: 1, duration: 0.2 }, 0.4)
        .to(probe, { left: '42%', top: '34%', duration: 1.1, ease: 'power2.inOut' }, 0.4)
        .to(shackles, { y: 0, duration: 0.45, stagger: 0.3, ease: 'bounce.out' }, 1.4)
        .to(probe, { left: '47%', top: '58%', duration: 0.9, ease: 'power2.inOut' }, 2.8)
        .to(probe, { left: '44%', duration: 0.25, ease: 'power2.out' }, 3.7)
        .to(wall, { scaleY: 1.15, duration: 0.15, yoyo: true, repeat: 1 }, 3.7)
        .to(deny, pop, 3.75)
        .to(probe, { autoAlpha: 0, duration: 0.3 }, 4.3)
        .to(bars, { scaleX: 1, duration: 0.6, stagger: 0.25, ease: 'power2.inOut' }, 4.6)
        .to(lim, { scale: 1.05, duration: 0.22, yoyo: true, repeat: 1 }, 6.2)
        .to(deny, { autoAlpha: 0, duration: 0.4 }, 9.5);
      return [0.4, 1.4, 3.0, 4.6];
    }
  };

  function setupCard(card) {
    var id = card.getAttribute('data-card');
    var d = data[id] || {};
    var panel = $(card, '[data-caption]');
    loop.Captions.wire(card, panel, d.caps || {});

    var build = builders[id];
    if (!build) return;
    var tl = gsap.timeline({ repeat: -1, repeatDelay: 1.6, paused: true, defaults: { overwrite: 'auto' } });
    var times = build(card, tl);
    taskLog(card, d.log || [], times || [0, 1, 2, 3])(tl);
    tl.to({}, { duration: 0.01 }, 12.5); // every card loops on the same ~14 s beat

    var ctl = $(card, '[data-ctl]');
    if (reduced) {
      tl.progress(1).pause();
      if (ctl) ctl.hidden = true;
      return;
    }
    var userPaused = false, inView = false;
    function sync() { if (inView && !userPaused) tl.play(); else tl.pause(); }
    if (ctl) {
      ctl.setAttribute('aria-pressed', 'false');
      ctl.setAttribute('aria-label', 'Pausar a cena: ' + ($(card, 'h2') || {}).textContent);
      ctl.addEventListener('click', function (e) {
        e.stopPropagation();
        userPaused = !userPaused;
        ctl.textContent = userPaused ? 'continuar' : 'pausar';
        ctl.setAttribute('aria-pressed', userPaused ? 'true' : 'false');
        card.classList.toggle('is-paused', userPaused);
        sync();
      });
    }
    if (window.IntersectionObserver) {
      new IntersectionObserver(function (es) {
        inView = es[es.length - 1].isIntersecting;
        sync();
      }, { threshold: 0.2 }).observe(card);
    } else { inView = true; sync(); }
  }

  /* fixed progress rail: highlights the step in view, scrolls on click */
  function setupRail() {
    var rail = document.querySelector('.prog');
    if (!rail) return;
    var links = Array.prototype.slice.call(rail.querySelectorAll('[data-step-link]'));
    var order = links.map(function (a) { return a.getAttribute('data-step-link'); });
    var bot = loop.makeBot();
    rail.appendChild(bot);
    var current = null;
    function mark(step, done) {
      if (step === current && !done) return;
      current = step;
      var idx = order.indexOf(step);
      links.forEach(function (a, i) {
        var on = i === idx;
        a.classList.toggle('is-on', on);
        a.classList.toggle('is-past', done ? true : idx > -1 && i < idx);
        if (on) a.setAttribute('aria-current', 'step'); else a.removeAttribute('aria-current');
      });
      loop.moveBot(bot, rail, idx > -1 ? links[idx] : null);
    }
    var secs = Array.prototype.slice.call(document.querySelectorAll('.sc-sec'));
    var visible = {};
    function pick() {
      var best = null, bestRatio = 0;
      secs.forEach(function (s) { if ((visible[s.id] || 0) > bestRatio) { bestRatio = visible[s.id]; best = s; } });
      if (!best) return;
      var step = best.getAttribute('data-step');
      if (step) mark(step, false); else mark(null, true);
    }
    if (window.IntersectionObserver) {
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (e) { visible[e.target.id] = e.isIntersecting ? e.intersectionRatio : 0; });
        pick();
      }, { threshold: [0, 0.25, 0.5, 0.75, 1] });
      secs.forEach(function (s) { io.observe(s); });
    }
    links.forEach(function (a) {
      a.addEventListener('click', function (e) {
        var target = document.querySelector(a.getAttribute('href'));
        if (!target) return;
        e.preventDefault();
        target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
        if (history.replaceState) history.replaceState(null, '', a.getAttribute('href'));
        mark(a.getAttribute('data-step-link'), false);
      });
    });
  }

  function init() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-card]'), setupCard);
    setupRail();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
