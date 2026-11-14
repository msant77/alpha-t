/*
 * Alpha Tester live scenes: the story engine.
 *
 * A Story plays one scene declared as data (window.AlphaScenes[name], in
 * assets/scenes.js): a timeline of events that changes node status, bars and
 * counters, sends packets along edges, moves the progress rail and writes the
 * session log. A View draws it: ThreeView (assets/hero3d.js, three.js, depth)
 * or DomView (below: HTML cards and SVG edges, the fallback without WebGL and
 * the static picture under prefers-reduced-motion).
 *
 * Interaction is the page: hovering or focusing an object previews its
 * caption, clicking / tapping / Enter pins it (the view focuses that part and
 * dims the rest, the log pins that node's lines), clicking again, clicking the
 * background or Esc returns to the overview. Captions are also in the DOM for
 * screen readers (each keyboard proxy is described by its caption).
 *
 * The clock is requestAnimationFrame; it stops when the tab is hidden, the
 * scene is off screen or the visitor presses "pausar". Every movement eases.
 *
 * Exposes window.AlphaLoop = { Story, DomView, Captions, registerView, ease }.
 */
(function () {
  'use strict';

  var SVGNS = 'http://www.w3.org/2000/svg';
  var SPIN = ['◐', '◓', '◑', '◒'];
  var GLYPH = { aguardando: '◌', rodando: '◐', 'concluído': '✓' };
  var reduced = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var coarse = !!(window.matchMedia && window.matchMedia('(hover: none)').matches);

  /* ---------- helpers ---------- */
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function svgEl(tag, attrs) {
    var e = document.createElementNS(SVGNS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function clock(ms) {
    var d = new Date(ms);
    return pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
  }
  /* easeInOutCubic: nothing in the scenes moves linearly */
  function ease(p) { return p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2; }
  function format(v, kind) {
    if (kind === 'brl') return 'R$ ' + v.toFixed(2).replace('.', ',');
    return Math.round(v).toLocaleString('pt-BR');
  }
  var uid = 0;
  function nextId(prefix) { uid += 1; return prefix + '-' + uid; }

  /* ---------- caption panel (shared by every scene) ---------- */
  function Captions(root, panel) {
    this.root = root;
    this.panel = panel;
    panel.classList.add('cap');
    panel.setAttribute('aria-live', 'polite');
    panel.hidden = true;
    this.kicker = el('div', 'cap-kicker');
    this.title = el('div', 'cap-title');
    this.body = el('div', 'cap-body');
    this.close = el('button', 'cap-close', '×');
    this.close.type = 'button';
    this.close.setAttribute('aria-label', 'Fechar legenda');
    panel.appendChild(this.close);
    panel.appendChild(this.kicker);
    panel.appendChild(this.title);
    panel.appendChild(this.body);
    this.pinned = false;
    this.onClose = null;
    var self = this;
    this.close.addEventListener('click', function (e) {
      e.stopPropagation();
      if (self.onClose) self.onClose();
    });
  }
  Captions.prototype.show = function (cap, rect, pinned) {
    if (!cap) { this.hide(); return; }
    this.kicker.textContent = cap.kicker || '';
    this.kicker.hidden = !cap.kicker;
    this.title.textContent = cap.title || '';
    this.body.textContent = '';
    (cap.lines || []).forEach(function (line) { this.body.appendChild(el('p', '', line)); }, this);
    this.pinned = !!pinned;
    this.panel.classList.toggle('is-pinned', this.pinned);
    this.panel.hidden = false;
    this.place(rect);
  };
  Captions.prototype.place = function (rect) {
    var p = this.panel, box = this.root.getBoundingClientRect();
    var sheet = box.width < 640;
    p.classList.toggle('is-sheet', sheet);
    if (sheet || !rect) { p.style.left = ''; p.style.top = ''; return; }
    var pw = p.offsetWidth || 300, ph = p.offsetHeight || 120, gap = 14;
    var x = rect.right + gap;
    if (x + pw > box.width - 8) x = rect.left - gap - pw;
    if (x < 8) x = Math.max(8, Math.min(box.width - pw - 8, rect.left + rect.width / 2 - pw / 2));
    var y = rect.top + rect.height / 2 - ph / 2;
    y = Math.max(8, Math.min(box.height - ph - 8, y));
    p.style.left = Math.round(x) + 'px';
    p.style.top = Math.round(y) + 'px';
  };
  Captions.prototype.hide = function () {
    this.panel.hidden = true;
    this.pinned = false;
  };

  /* Wire plain HTML objects (como-funciona cards) to a caption panel.
     objects: [data-cap="id"] inside root; caps: {id: {title, lines}}. */
  Captions.wire = function (root, panel, caps, hooks) {
    var cap = new Captions(root, panel);
    var current = null;
    hooks = hooks || {};
    var nodes = root.querySelectorAll('[data-cap]');
    var descHost = el('div', 'sr-only');
    root.appendChild(descHost);
    function rectOf(node) {
      var r = node.getBoundingClientRect(), b = root.getBoundingClientRect();
      return { left: r.left - b.left, top: r.top - b.top, right: r.right - b.left,
               bottom: r.bottom - b.top, width: r.width, height: r.height };
    }
    function clear() {
      if (current) { current.classList.remove('is-sel'); current.setAttribute('aria-expanded', 'false'); }
      current = null;
      root.classList.remove('has-sel');
      cap.hide();
      if (hooks.select) hooks.select(null);
    }
    function pin(node) {
      if (current === node) { clear(); return; }
      if (current) { current.classList.remove('is-sel'); current.setAttribute('aria-expanded', 'false'); }
      current = node;
      node.classList.add('is-sel');
      node.setAttribute('aria-expanded', 'true');
      root.classList.add('has-sel');
      cap.show(caps[node.getAttribute('data-cap')], rectOf(node), true);
      if (hooks.select) hooks.select(node.getAttribute('data-cap'));
    }
    cap.onClose = clear;
    Array.prototype.forEach.call(nodes, function (node) {
      var id = node.getAttribute('data-cap');
      var c = caps[id];
      if (!c) return;
      var d = el('div', '', (c.title || '') + '. ' + (c.lines || []).join(' '));
      d.id = nextId('cap');
      descHost.appendChild(d);
      node.setAttribute('tabindex', '0');
      node.setAttribute('role', 'button');
      node.setAttribute('aria-expanded', 'false');
      node.setAttribute('aria-describedby', d.id);
      if (!node.getAttribute('aria-label')) node.setAttribute('aria-label', c.title || id);
      node.addEventListener('click', function (e) { e.stopPropagation(); pin(node); });
      node.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pin(node); }
      });
      if (!coarse) {
        node.addEventListener('mouseenter', function () { if (!current) cap.show(c, rectOf(node), false); });
        node.addEventListener('mouseleave', function () { if (!current) cap.hide(); });
      }
      node.addEventListener('focus', function () { if (!current) cap.show(c, rectOf(node), false); });
      node.addEventListener('blur', function () { if (!current) cap.hide(); });
    });
    root.addEventListener('click', function () { if (current) clear(); });
    root.addEventListener('keydown', function (e) { if (e.key === 'Escape' && current) { var n = current; clear(); n.focus(); } });
    return { clear: clear, captions: cap };
  };

  /* ---------- the story ---------- */
  function Story(root, data) {
    this.root = root;
    this.d = data;
    this.duration = data.duration || 30;
    this.events = (data.events || []).slice().sort(function (a, b) { return a.t - b.t; });
    this.nodeById = {};
    this.edgeById = {};
    this.stepById = {};
    (data.nodes || []).forEach(function (n) { this.nodeById[n.id] = n; }, this);
    (data.edges || []).forEach(function (e) { this.edgeById[e.id] = e; }, this);
    (data.steps || []).forEach(function (s) { this.stepById[s.id] = s; }, this);
    this.stats = {};
    for (var k in (data.stats || {})) {
      var s = data.stats[k];
      this.stats[k] = { value: s.value || 0, initial: s.value || 0, fmt: s.fmt, reset: !!s.reset };
    }
    this.state = {};
    this.tweens = [];
    this.bindings = [];
    this.logAll = [];
    this.logByNode = {};
    this.t = 0;
    this.next = 0;
    this.elapsed = 0;
    this.clock0 = Date.now();
    this.paused = false;
    this.visible = !document.hidden;
    this.inView = true;
    this.running = false;
    this.last = 0;
    this.selection = null;
    this.hovered = null;
    this.activeStep = null;
    var self = this;
    this.frame = function (ts) { self.tick(ts); };
    this.build();
  }

  Story.prototype.fill = function (str) {
    var stats = this.stats;
    return String(str).replace(/\{(\w+)\}/g, function (m, k) {
      return stats[k] ? format(stats[k].value, stats[k].fmt) : m;
    });
  };
  Story.prototype.bind = function (node, str) {
    node.textContent = this.fill(str);
    if (String(str).indexOf('{') >= 0) this.bindings.push({ node: node, str: str });
  };
  Story.prototype.statsChanged = function () {
    for (var i = 0; i < this.bindings.length; i++) {
      var b = this.bindings[i], v = this.fill(b.str);
      if (b.node.textContent !== v) b.node.textContent = v;
    }
    if (this.view && this.view.statsChanged) this.view.statsChanged();
  };

  /* Root markup: [data-stage], [data-log], [data-rail], [data-ctl],
     [data-caption], [data-proxies]; whichever is missing is created. */
  Story.prototype.part = function (name, tag, cls) {
    var e = this.root.querySelector('[data-' + name + ']');
    if (!e) { e = el(tag, cls); e.setAttribute('data-' + name, ''); this.root.appendChild(e); }
    return e;
  };

  Story.prototype.build = function () {
    var self = this, d = this.d;
    this.root.classList.add('story');
    this.stageEl = this.part('stage', 'div', 'story-stage');
    this.logEl = this.part('log', 'div', 'story-log');
    this.railEl = d.steps ? this.part('rail', 'nav', 'rail') : null;
    this.ctl = this.part('ctl', 'button', 'scene-ctl');
    this.capEl = this.part('caption', 'div', 'cap');
    this.proxiesEl = this.part('proxies', 'ul', 'proxies');

    // session log
    this.logEl.setAttribute('aria-hidden', 'true');
    this.logHead = el('div', 'log-head', 'registro da sessão');
    this.logList = el('ul', 'log-list');
    this.logEl.appendChild(this.logHead);
    this.logEl.appendChild(this.logList);

    // progress rail
    if (this.railEl) {
      this.railEl.setAttribute('aria-label', d.railLabel || 'Etapas do ciclo');
      var list = el('ol', 'rail-steps');
      this.stepEls = {};
      d.steps.forEach(function (s, i) {
        var li = el('li', 'rail-step');
        var b = el('button', 'rail-btn');
        b.type = 'button';
        b.appendChild(el('span', 'rail-n', pad(i + 1)));
        b.appendChild(el('span', 'rail-label', s.label));
        b.setAttribute('aria-expanded', 'false');
        b.addEventListener('click', function (e) { e.stopPropagation(); self.pick('step', s.id); });
        if (!coarse) {
          b.addEventListener('mouseenter', function () { self.hover('step', s.id); });
          b.addEventListener('mouseleave', function () { self.hover(null); });
        }
        b.addEventListener('focus', function () { self.hover('step', s.id); });
        b.addEventListener('blur', function () { self.hover(null); });
        li.appendChild(b);
        list.appendChild(li);
        self.stepEls[s.id] = b;
      });
      this.railEl.appendChild(list);
      this.bot = makeBot();
      this.railEl.appendChild(this.bot);
    }

    // pause control
    this.ctl.type = 'button';
    this.ctl.textContent = 'pausar';
    this.ctl.setAttribute('aria-pressed', 'false');
    this.ctl.addEventListener('click', function (e) { e.stopPropagation(); self.toggle(); });
    if (reduced) this.ctl.hidden = true;

    // captions and keyboard proxies (one button per node, described by its caption)
    this.captions = new Captions(this.root, this.capEl);
    this.captions.onClose = function () { self.clear(); };
    this.proxiesEl.classList.add('proxies');
    this.proxies = {};
    var desc = el('div', 'sr-only');
    this.root.appendChild(desc);
    (d.nodes || []).forEach(function (n) {
      var cap = n.cap || [];
      var dd = el('div', '', cap.join(' '));
      dd.id = nextId('cap');
      desc.appendChild(dd);
      var li = el('li');
      var b = el('button', 'proxy', n.title);
      b.type = 'button';
      b.setAttribute('aria-describedby', dd.id);
      b.setAttribute('aria-expanded', 'false');
      b.addEventListener('focus', function () { self.hover('node', n.id); });
      b.addEventListener('blur', function () { self.hover(null); });
      b.addEventListener('click', function (e) { e.stopPropagation(); self.pick('node', n.id); });
      li.appendChild(b);
      self.proxiesEl.appendChild(li);
      self.proxies[n.id] = b;
    });

    this.root.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && self.selection) {
        var back = self.selection.kind === 'node' ? self.proxies[self.selection.id] : null;
        self.clear();
        if (back) back.focus();
      }
    });
  };

  /* ---------- selection and captions ---------- */
  Story.prototype.capFor = function (kind, id) {
    if (kind === 'node') {
      var n = this.nodeById[id];
      return n && { kicker: n.kicker || '', title: n.title, lines: (n.cap || []).map(this.fill, this) };
    }
    if (kind === 'edge') {
      var e = this.edgeById[id];
      return e && { kicker: 'conexão', title: e.title || e.label || '', lines: (e.cap || []).map(this.fill, this) };
    }
    if (kind === 'step') {
      var s = this.stepById[id];
      return s && { kicker: 'etapa', title: s.label, lines: s.cap || [] };
    }
    return null;
  };

  Story.prototype.anchor = function (kind, id) {
    if (kind === 'step' && this.stepEls && this.stepEls[id]) {
      var r = this.stepEls[id].getBoundingClientRect(), b = this.root.getBoundingClientRect();
      return { left: r.left - b.left, top: r.top - b.top - 8, right: r.right - b.left,
               bottom: r.bottom - b.top, width: r.width, height: r.height };
    }
    return this.view && this.view.anchorRect ? this.view.anchorRect(kind, id) : null;
  };

  Story.prototype.hover = function (kind, id) {
    if (this.selection) return;
    this.hovered = kind ? { kind: kind, id: id } : null;
    if (this.view && this.view.hover) this.view.hover(this.hovered);
    if (!kind) { this.captions.hide(); return; }
    this.captions.show(this.capFor(kind, id), this.anchor(kind, id), false);
  };

  Story.prototype.pick = function (kind, id) {
    if (this.selection && this.selection.kind === kind && this.selection.id === id) { this.clear(); return; }
    this.setExpanded(false);
    this.selection = { kind: kind, id: id };
    this.setExpanded(true);
    this.root.classList.add('has-sel');
    var focusNode = kind === 'node' ? id
      : kind === 'step' ? (this.stepById[id] || {}).focus
      : kind === 'edge' ? (this.edgeById[id] || {}).to : null;
    if (this.view && this.view.select) this.view.select(this.selection, focusNode);
    this.renderLog();
    var self = this;
    // the view moves the camera first; place the caption once it has settled a little
    this.captions.show(this.capFor(kind, id), this.anchor(kind, id), true);
    setTimeout(function () {
      if (self.selection && self.selection.id === id) self.captions.place(self.anchor(kind, id));
    }, reduced ? 0 : 700);
  };

  Story.prototype.setExpanded = function (on) {
    var s = this.selection;
    if (!s) return;
    var b = s.kind === 'node' ? this.proxies[s.id] : s.kind === 'step' && this.stepEls ? this.stepEls[s.id] : null;
    if (b) b.setAttribute('aria-expanded', on ? 'true' : 'false');
  };

  Story.prototype.clear = function () {
    this.setExpanded(false);
    this.selection = null;
    this.root.classList.remove('has-sel');
    this.captions.hide();
    if (this.view && this.view.select) this.view.select(null, null);
    this.renderLog();
  };

  /* ---------- state ---------- */
  Story.prototype.setStatus = function (id, s) {
    if (!this.state[id]) return;
    this.state[id].status = s;
    if (this.view) this.view.setStatus(id, s);
  };
  Story.prototype.setBar = function (id, m, v) {
    if (!this.state[id]) return;
    this.state[id].bars[m] = v;
    if (this.view) this.view.setBar(id, m, v);
  };

  Story.prototype.resetLoop = function () {
    var self = this;
    (this.d.nodes || []).forEach(function (n) {
      self.state[n.id] = self.state[n.id] || { status: null, bars: {} };
      (n.meters || []).forEach(function (m) { if (m.kind === 'bar') self.setBar(n.id, m.id, m.value || 0); });
      self.setStatus(n.id, n.status || 'aguardando');
    });
    for (var k in this.stats) if (this.stats[k].reset) this.stats[k].value = this.stats[k].initial;
    this.tweens = [];
    this.setStep(null);
    if (this.view && this.view.reset) this.view.reset();
    this.statsChanged();
  };

  Story.prototype.setStep = function (id) {
    if (!this.stepEls) return;
    this.activeStep = id;
    var seen = id ? false : true, steps = this.d.steps;
    for (var i = 0; i < steps.length; i++) {
      var b = this.stepEls[steps[i].id];
      var on = steps[i].id === id;
      b.classList.toggle('is-on', on);
      b.classList.toggle('is-past', !seen && !on && !!id);
      if (on) seen = true;
      if (on) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current');
    }
    if (this.bot) moveBot(this.bot, this.railEl, id ? this.stepEls[id] : null);
  };

  Story.prototype.log = function (entry) {
    var n = this.nodeById[entry.n] || {};
    var line = { time: clock(this.clock0 + this.elapsed * 1000), n: entry.n,
                 who: entry.who || n.short || n.title || entry.n, role: n.role || 'core',
                 text: this.fill(entry.text) };
    this.logAll.push(line);
    if (this.logAll.length > 40) this.logAll.shift();
    var list = this.logByNode[entry.n] = this.logByNode[entry.n] || [];
    list.push(line);
    if (list.length > 6) list.shift();
    this.renderLog(line);
  };

  Story.prototype.renderLog = function (fresh) {
    var max = this.d.logLines || 4;
    var sel = this.selection && this.selection.kind === 'node' ? this.selection.id : null;
    var lines = sel ? (this.logByNode[sel] || []) : this.logAll;
    this.logHead.textContent = sel
      ? 'registro · ' + (this.nodeById[sel].short || this.nodeById[sel].title) + ' · fixado'
      : 'registro da sessão';
    this.logEl.classList.toggle('is-pinned', !!sel);
    var view = lines.slice(-max);
    this.logList.textContent = '';
    if (!view.length) this.logList.appendChild(el('li', 'log-empty', 'nada ainda nesta volta; a próxima linha aparece aqui.'));
    for (var i = 0; i < view.length; i++) {
      var l = view[i];
      var li = el('li', fresh && l === fresh ? 'is-new' : '');
      li.appendChild(el('span', 'log-t', l.time));
      li.appendChild(el('span', 'log-who r-' + l.role, l.who));
      li.appendChild(el('span', 'log-x', l.text));
      this.logList.appendChild(li);
    }
  };

  Story.prototype.tween = function (from, to, dur, set) {
    this.tweens.push({ from: from, to: to, start: this.t, dur: dur, set: set });
  };

  Story.prototype.apply = function (ev, instant) {
    var self = this, k;
    if (ev.status) for (k in ev.status) this.setStatus(k, ev.status[k]);
    if (ev.bar) {
      for (k in ev.bar) {
        var p = k.split('.'), id = p[0], m = p[1];
        if (!this.state[id]) continue;
        var from = this.state[id].bars[m] || 0;
        if (instant) this.setBar(id, m, ev.bar[k]);
        else this.tween(from, ev.bar[k], ev.dur || 1.2, (function (ii, mm) {
          return function (v) { self.setBar(ii, mm, v); };
        })(id, m));
      }
    }
    if (ev.add) {
      for (k in ev.add) {
        var s = this.stats[k];
        if (!s) continue;
        var to = s.value + ev.add[k];
        if (instant) { s.value = to; this.statsChanged(); }
        else this.tween(s.value, to, 0.7, (function (ss) {
          return function (v) { ss.value = v; self.statsChanged(); };
        })(s));
      }
    }
    if (ev.step !== undefined) this.setStep(ev.step);
    if (ev.pulse && !instant && this.view && this.view.pulse) this.view.pulse(ev.pulse);
    if (ev.packet && !instant && this.view) {
      var e = this.edgeById[ev.packet];
      if (e) this.view.launch(ev.packet, { dur: ev.dur || 1.4, back: !!ev.back,
                                           role: ev.role || (this.nodeById[e.from] || {}).role || 'core' });
    }
    if (ev.log) this.log(ev.log);
  };

  Story.prototype.advance = function (dt) {
    this.t += dt;
    this.elapsed += dt;
    while (this.next < this.events.length && this.events[this.next].t <= this.t) {
      this.apply(this.events[this.next], false);
      this.next++;
    }
    var keep = [];
    for (var i = 0; i < this.tweens.length; i++) {
      var tw = this.tweens[i];
      var p = Math.min(1, (this.t - tw.start) / tw.dur);
      tw.set(tw.from + (tw.to - tw.from) * ease(p));
      if (p < 1) keep.push(tw);
    }
    this.tweens = keep;
    if (this.view) this.view.frame(dt, this.t, this.elapsed);
    if (this.selection && this.selection.kind === 'edge' && this.captions.pinned && this.view.tracksEdges) {
      this.captions.place(this.anchor('edge', this.selection.id));
    }
    if (this.t >= this.duration) {
      for (i = 0; i < this.tweens.length; i++) this.tweens[i].set(this.tweens[i].to);
      this.t -= this.duration;
      this.next = 0;
      this.resetLoop();
    }
  };

  Story.prototype.tick = function (ts) {
    if (!this.running) return;
    var dt = this.last ? Math.min((ts - this.last) / 1000, 0.1) : 0;
    this.last = ts;
    // paused: the story's clock stops, the view keeps easing its camera
    if (this.paused) { if (this.view) this.view.frame(dt, this.t, this.elapsed, true); }
    else this.advance(dt);
    this.raf = requestAnimationFrame(this.frame);
  };

  Story.prototype.sync = function () {
    var go = this.visible && this.inView && !reduced;
    if (go && !this.running) {
      this.running = true;
      this.last = 0;
      this.raf = requestAnimationFrame(this.frame);
    } else if (!go && this.running) {
      this.running = false;
      cancelAnimationFrame(this.raf);
    }
  };

  Story.prototype.toggle = function () {
    this.paused = !this.paused;
    this.ctl.textContent = this.paused ? 'continuar' : 'pausar';
    this.ctl.setAttribute('aria-pressed', this.paused ? 'true' : 'false');
    this.root.classList.toggle('is-paused', this.paused);
    this.sync();
  };

  Story.prototype.attach = function (view) {
    var self = this;
    this.view = view;
    view.init(this);
    this.resetLoop();
    if (reduced) {
      for (var i = 0; i < this.events.length; i++) this.apply(this.events[i], true);
      this.root.classList.add('is-static');
      if (view.frame) view.frame(0, this.t, 0);
      return;
    }
    document.addEventListener('visibilitychange', function () {
      self.visible = !document.hidden;
      self.sync();
    });
    if (window.IntersectionObserver) {
      new IntersectionObserver(function (entries) {
        self.inView = entries[entries.length - 1].isIntersecting;
        self.sync();
      }, { rootMargin: '60px' }).observe(this.root);
    }
    this.sync();
  };

  /* ---------- the tester bot on the rail ---------- */
  function makeBot() {
    var wrap = el('span', 'bot');
    wrap.setAttribute('aria-hidden', 'true');
    wrap.innerHTML =
      '<svg viewBox="0 0 32 34" width="26" height="28">' +
      '<line class="bot-ant" x1="16" y1="2" x2="16" y2="7"/><circle class="bot-tip" cx="16" cy="2.5" r="2"/>' +
      '<rect class="bot-head" x="5" y="7" width="22" height="16" rx="5"/>' +
      '<rect class="bot-face" x="8.5" y="10.5" width="15" height="9" rx="3"/>' +
      '<circle class="bot-eye" cx="13" cy="15" r="1.6"/><circle class="bot-eye" cx="19" cy="15" r="1.6"/>' +
      '<rect class="bot-body" x="9" y="24" width="14" height="6" rx="2"/>' +
      '<rect class="bot-leg l" x="10" y="30" width="3" height="4" rx="1"/><rect class="bot-leg r" x="19" y="30" width="3" height="4" rx="1"/>' +
      '</svg>';
    return wrap;
  }
  function moveBot(bot, rail, target) {
    if (!target) { bot.classList.remove('is-shown'); return; }
    var r = target.getBoundingClientRect(), b = rail.getBoundingClientRect();
    bot.style.transform = 'translateX(' + Math.round(r.left - b.left + r.width / 2 - 13) + 'px)';
    bot.classList.add('is-shown');
    bot.classList.remove('is-walking');
    void bot.offsetWidth;
    bot.classList.add('is-walking');
  }

  /* ---------- DomView: HTML cards + SVG edges (fallback and static) ---------- */
  function DomView() {}

  DomView.prototype.init = function (story) {
    var self = this, d = story.d;
    this.s = story;
    this.cards = {};
    this.edges = {};
    this.packets = [];
    this.wide = null;
    var stage = this.stage = el('div', 'dom-stage');
    story.stageEl.classList.add('is-dom');
    story.stageEl.appendChild(stage);
    if (d.legend) {
      var legend = el('div', 'dom-legend');
      legend.setAttribute('aria-hidden', 'true');
      d.legend.forEach(function (l) {
        var k = el('span', 'term-key r-' + l.role);
        k.appendChild(el('i'));
        k.appendChild(document.createTextNode(l.label));
        legend.appendChild(k);
      });
      story.stageEl.insertBefore(legend, stage);
    }
    this.svg = svgEl('svg', { 'class': 'term-edges', focusable: 'false', 'aria-hidden': 'true' });
    var defs = svgEl('defs', {});
    this.markerId = nextId('tm');
    var marker = svgEl('marker', { id: this.markerId, viewBox: '0 0 8 8', refX: '7', refY: '4',
                                   markerWidth: '6', markerHeight: '6', orient: 'auto-start-reverse' });
    marker.appendChild(svgEl('path', { d: 'M0 0L8 4L0 8z', 'class': 'edge-head' }));
    defs.appendChild(marker);
    this.svg.appendChild(defs);
    this.edgeLayer = svgEl('g', {});
    this.packetLayer = svgEl('g', {});
    this.svg.appendChild(this.edgeLayer);
    this.svg.appendChild(this.packetLayer);
    stage.appendChild(this.svg);

    (d.nodes || []).forEach(function (n, i) { self.card(n, i); });
    (d.edges || []).forEach(function (e) { self.edge(e); });
    stage.addEventListener('click', function () { if (story.selection) story.clear(); });

    var relayout = function () { self.layout(); };
    if (window.ResizeObserver) new ResizeObserver(relayout).observe(stage);
    else window.addEventListener('resize', relayout);
    this.layout();
  };

  DomView.prototype.card = function (n, index) {
    var s = this.s;
    var c = el('div', 'node r-' + n.role);
    c.setAttribute('aria-hidden', 'true');
    c.dataset.anchor = n.id;
    c.appendChild(el('div', 'node-title', n.title));
    if (n.sub) { var sub = el('div', 'node-sub'); s.bind(sub, n.sub); c.appendChild(sub); }
    var meters = {};
    (n.meters || []).forEach(function (m) {
      var row = el('div', 'm-row m-' + (m.kind || 'text'));
      if (m.kind === 'bar') {
        row.appendChild(el('span', 'm-label', m.label || ''));
        var track = el('span', 'm-bar'), fill = el('i');
        track.appendChild(fill);
        row.appendChild(track);
        var val = el('span', 'm-val');
        row.appendChild(val);
        meters[m.id] = { fill: fill, val: val };
      } else if (m.kind === 'stat') {
        row.appendChild(el('span', 'm-label', m.label || ''));
        var v = el('span', 'm-val');
        s.bind(v, '{' + m.stat + '}');
        row.appendChild(v);
      } else {
        var tx = el('span', 'm-text');
        s.bind(tx, m.text || '');
        row.appendChild(tx);
      }
      c.appendChild(row);
    });
    var status = el('div', 'node-status');
    var glyph = el('span', 'st-glyph'), label = el('span', 'st-label');
    status.appendChild(glyph);
    status.appendChild(label);
    c.appendChild(status);
    c.addEventListener('click', function (e) { e.stopPropagation(); s.pick('node', n.id); });
    if (!coarse) {
      c.addEventListener('mouseenter', function () { s.hover('node', n.id); });
      c.addEventListener('mouseleave', function () { s.hover(null); });
    }
    this.stage.appendChild(c);
    this.cards[n.id] = { d: n, el: c, glyph: glyph, label: label, meters: meters,
                         order: n.order != null ? n.order : index, status: null };
  };

  DomView.prototype.edge = function (e) {
    var s = this.s;
    var path = svgEl('path', { 'class': 'edge', 'marker-end': 'url(#' + this.markerId + ')' });
    var hit = svgEl('path', { 'class': 'edge-hit' });
    hit.addEventListener('click', function (ev) { ev.stopPropagation(); s.pick('edge', e.id); });
    if (!coarse) {
      hit.addEventListener('mouseenter', function () { s.hover('edge', e.id); });
      hit.addEventListener('mouseleave', function () { s.hover(null); });
    }
    this.edgeLayer.appendChild(path);
    this.edgeLayer.appendChild(hit);
    this.edges[e.id] = { d: e, path: path, hit: hit, hot: 0 };
  };

  DomView.prototype.setMode = function (wide) {
    if (this.wide === wide) return;
    this.wide = wide;
    var d = this.s.d, cols = d.cols || 3;
    this.stage.classList.toggle('is-wide', wide);
    this.stage.style.gridTemplateColumns = wide ? 'repeat(' + cols + ', minmax(0, 1fr))' : 'repeat(2, minmax(0, 1fr))';
    for (var id in this.cards) {
      var n = this.cards[id], st = n.el.style, at = n.d.at || [1, 1];
      if (wide) {
        st.gridColumn = at[0] + (at[2] ? ' / span ' + at[2] : '');
        st.gridRow = String(at[1]);
        st.order = '';
      } else {
        st.gridColumn = n.d.half ? 'span 1' : '1 / -1';
        st.gridRow = '';
        st.order = String(n.order);
      }
    }
  };

  DomView.prototype.box = function (id, origin) {
    var c = this.cards[id];
    if (!c) return null;
    var r = c.el.getBoundingClientRect();
    var l = r.left - origin.left, t = r.top - origin.top;
    return { l: l, t: t, r: l + r.width, b: t + r.height, cx: l + r.width / 2, cy: t + r.height / 2 };
  };

  DomView.prototype.route = function (e, a, b, width) {
    if (e.route === 'side') {
      var gx = width - 7;
      return 'M' + a.r + ' ' + a.cy + 'H' + gx + 'V' + b.cy + 'H' + (b.r + 2);
    }
    var ox = Math.min(a.r, b.r) - Math.max(a.l, b.l);
    if (ox > 16) {
      var cx = (Math.max(a.l, b.l) + Math.min(a.r, b.r)) / 2;
      return b.t >= a.b ? 'M' + cx + ' ' + a.b + 'V' + (b.t - 2) : 'M' + cx + ' ' + a.t + 'V' + (b.b + 2);
    }
    var oy = Math.min(a.b, b.b) - Math.max(a.t, b.t);
    if (oy > 16) {
      var cy = (Math.max(a.t, b.t) + Math.min(a.b, b.b)) / 2;
      return b.l >= a.r ? 'M' + a.r + ' ' + cy + 'H' + (b.l - 2) : 'M' + a.l + ' ' + cy + 'H' + (b.r + 2);
    }
    if (b.t >= a.b) {
      var my = (a.b + b.t) / 2;
      return 'M' + a.cx + ' ' + a.b + 'V' + my + 'H' + b.cx + 'V' + (b.t - 2);
    }
    var my2 = (b.b + a.t) / 2;
    return 'M' + a.cx + ' ' + a.t + 'V' + my2 + 'H' + b.cx + 'V' + (b.b + 2);
  };

  DomView.prototype.layout = function () {
    var width = this.stage.clientWidth;
    if (!width) return;
    this.setMode(width >= (this.s.d.wideMin || 640));
    var origin = this.stage.getBoundingClientRect();
    var w = Math.round(origin.width), h = Math.round(origin.height);
    this.svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
    this.svg.setAttribute('width', w);
    this.svg.setAttribute('height', h);
    for (var k in this.edges) {
      var e = this.edges[k];
      var a = this.box(e.d.from, origin), b = this.box(e.d.to, origin);
      if (!a || !b) continue;
      var dd = this.route(e.d, a, b, w);
      e.path.setAttribute('d', dd);
      e.hit.setAttribute('d', dd);
    }
  };

  DomView.prototype.setStatus = function (id, s) {
    var n = this.cards[id];
    if (!n) return;
    n.status = s;
    n.el.classList.remove('st-run', 'st-done', 'st-wait', 'st-other');
    n.el.classList.add(s === 'rodando' ? 'st-run' : s === 'concluído' ? 'st-done' : s === 'aguardando' ? 'st-wait' : 'st-other');
    n.el.classList.toggle('is-active', s === 'rodando');
    n.glyph.textContent = GLYPH[s] || '•';
    n.label.textContent = s;
  };

  DomView.prototype.setBar = function (id, m, v) {
    var n = this.cards[id];
    if (!n || !n.meters[m]) return;
    n.meters[m].fill.style.width = Math.max(0, Math.min(100, v)) + '%';
    n.meters[m].val.textContent = Math.round(v) + '%';
  };

  DomView.prototype.reset = function () {
    this.packets.forEach(function (p) { p.g.remove(); });
    this.packets = [];
    for (var e in this.edges) { this.edges[e].hot = 0; this.edges[e].path.setAttribute('class', 'edge'); }
  };

  DomView.prototype.pulse = function (id) {
    var c = this.cards[id];
    if (!c) return;
    c.el.classList.remove('is-pulse');
    void c.el.offsetWidth;
    c.el.classList.add('is-pulse');
  };

  DomView.prototype.launch = function (edgeId, o) {
    var e = this.edges[edgeId];
    if (!e) return;
    var g = svgEl('g', { 'class': 'packet r-' + o.role });
    g.appendChild(svgEl('circle', { r: '1.6', 'class': 'trail' }));
    g.appendChild(svgEl('circle', { r: '2.2', 'class': 'trail' }));
    g.appendChild(svgEl('circle', { r: '3.6' }));
    this.packetLayer.appendChild(g);
    e.hot++;
    e.path.setAttribute('class', 'edge is-hot r-' + o.role);
    this.packets.push({ e: e, g: g, start: this.s.t, dur: o.dur, back: o.back });
  };

  DomView.prototype.frame = function (dt, t, elapsed) {
    var keep = [];
    for (var i = 0; i < this.packets.length; i++) {
      var pk = this.packets[i];
      var q = (t - pk.start) / pk.dur;
      if (q >= 1 || q < 0) {
        pk.g.remove();
        if (--pk.e.hot <= 0) { pk.e.hot = 0; pk.e.path.setAttribute('class', 'edge'); }
        continue;
      }
      var L = pk.e.path.getTotalLength();
      var s = ease(q) * L;
      if (pk.back) s = L - s;
      var dir = pk.back ? 1 : -1, c = pk.g.childNodes;
      for (var j = 0; j < 3; j++) {
        var pt = pk.e.path.getPointAtLength(Math.max(0, Math.min(L, s + dir * (2 - j) * 7)));
        c[j].setAttribute('cx', pt.x.toFixed(1));
        c[j].setAttribute('cy', pt.y.toFixed(1));
      }
      keep.push(pk);
    }
    this.packets = keep;
    var frame = SPIN[Math.floor(elapsed * 6) % SPIN.length];
    for (var id in this.cards) if (this.cards[id].status === 'rodando') this.cards[id].glyph.textContent = frame;
  };

  DomView.prototype.hover = function (h) {
    for (var id in this.cards) this.cards[id].el.classList.toggle('is-hover', !!h && h.kind === 'node' && h.id === id);
  };

  DomView.prototype.select = function (sel, focusNode) {
    this.stage.classList.toggle('has-sel', !!sel);
    for (var id in this.cards) this.cards[id].el.classList.toggle('is-sel', id === focusNode);
    for (var k in this.edges) {
      var on = !!sel && sel.kind === 'edge' && sel.id === k;
      this.edges[k].path.classList.toggle('is-sel', on);
    }
  };

  DomView.prototype.anchorRect = function (kind, id) {
    var root = this.s.root.getBoundingClientRect(), r;
    if (kind === 'node' && this.cards[id]) r = this.cards[id].el.getBoundingClientRect();
    else if (kind === 'edge' && this.edges[id]) r = this.edges[id].path.getBoundingClientRect();
    if (!r) return null;
    return { left: r.left - root.left, top: r.top - root.top, right: r.right - root.left,
             bottom: r.bottom - root.top, width: r.width, height: r.height };
  };

  /* ---------- mounting ---------- */
  var pending = [];
  var ThreeViewCtor = null;

  function webgl() {
    try {
      var c = document.createElement('canvas');
      return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
    } catch (e) { return false; }
  }

  function mount() {
    var scenes = window.AlphaScenes || {};
    var roots = document.querySelectorAll('[data-story]');
    Array.prototype.forEach.call(roots, function (root) {
      if (root.classList.contains('story')) return;
      var data = scenes[root.getAttribute('data-story')];
      if (!data) return;
      var story = new Story(root, data);
      var want3d = root.getAttribute('data-view') === '3d' && !reduced && webgl();
      if (!want3d) { story.attach(new DomView()); return; }
      root.classList.add('is-3d');
      if (ThreeViewCtor) { attach3d(story); return; }
      pending.push(story);
      // the module did not arrive (blocked, old browser): fall back to HTML
      setTimeout(function () {
        var i = pending.indexOf(story);
        if (i >= 0) { pending.splice(i, 1); root.classList.remove('is-3d'); story.attach(new DomView()); }
      }, 5000);
    });
  }

  function attach3d(story) {
    try { story.attach(new ThreeViewCtor()); }
    catch (err) {
      story.root.classList.remove('is-3d');
      story.stageEl.textContent = '';
      story.attach(new DomView());
    }
  }

  window.AlphaLoop = {
    Story: Story,
    DomView: DomView,
    Captions: Captions,
    ease: ease,
    reduced: reduced,
    coarse: coarse,
    registerView: function (Ctor) {
      ThreeViewCtor = Ctor;
      var list = pending.splice(0);
      list.forEach(attach3d);
    }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();
