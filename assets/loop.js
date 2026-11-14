/*
 * Alpha Tester live scenes: a small, dependency-free engine that plays a
 * terminal-styled "session" from data. Node cards are HTML, edges and the
 * packets travelling on them are SVG, the clock is requestAnimationFrame.
 *
 * Usage: <div data-scene="hero"></div> and window.AlphaScenes.hero = {...}
 * (assets/scenes.js holds every scene, so the story is edited in one place).
 *
 * Behaviour:
 * - pauses when the tab is hidden or the scene is off screen;
 * - a "pausar / continuar" button per scene;
 * - prefers-reduced-motion: reduce -> no motion, the final state of the
 *   timeline is drawn once (every event applied, no packets);
 * - colours come only from CSS classes (r-<role>) and variables in site.css.
 *
 * Scene data (see assets/scenes.js for full examples):
 *   title, summary, duration (s), cols, wideMin (px), legend [{role,label}],
 *   stats {id: {value, fmt}}, rail {role,title,sub,items[{id,text}],notes[]},
 *   nodes [{id, role, title, sub, at:[col,row,span], order, half, status,
 *           meters:[{kind:'bar'|'stat'|'text', id, label, value, stat, text}]}],
 *   edges [{id, from, to, route:'side', label, wideOnly}],
 *   events [{t, status:{node:'rodando'}, bar:{'node.meter':100}, dur,
 *            add:{stat:1}, packet:'edgeId', back, rail:'itemId', pulse:'node',
 *            log:[role, who, text]}],
 *   status {cwd, cmd, chips:[{label, value:'{stat}', role}]}, logLines.
 */
(function () {
  'use strict';

  var SVGNS = 'http://www.w3.org/2000/svg';
  var SPIN = ['◐', '◓', '◑', '◒'];
  var GLYPH = { aguardando: '◌', rodando: '◐', 'concluído': '✓' };
  var reduced = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

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
  function ease(p) { return p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2; }
  function format(v, kind) {
    if (kind === 'brl') return 'R$ ' + v.toFixed(2).replace('.', ',');
    if (kind === 'pct') return Math.round(v) + '%';
    return Math.round(v).toLocaleString('pt-BR');
  }
  function statusClass(s) {
    if (s === 'rodando') return 'st-run';
    if (s === 'concluído') return 'st-done';
    if (s === 'aguardando') return 'st-wait';
    return 'st-other';
  }

  function Scene(host, data) {
    this.host = host;
    this.d = data;
    this.duration = data.duration || 30;
    this.events = (data.events || []).slice().sort(function (a, b) { return a.t - b.t; });
    this.stats = {};
    this.nodes = {};
    this.edges = {};
    this.bindings = [];
    this.tweens = [];
    this.packets = [];
    this.pulses = [];
    this.t = 0;
    this.next = 0;
    this.elapsed = 0;
    this.clock0 = Date.now();
    this.paused = false;
    this.visible = !document.hidden;
    this.inView = true;
    this.running = false;
    this.wide = null;
    this.last = 0;
    var self = this;
    this.frame = function (ts) { self.tick(ts); };

    for (var k in (data.stats || {})) {
      this.stats[k] = { value: data.stats[k].value || 0, initial: data.stats[k].value || 0,
                        fmt: data.stats[k].fmt, reset: !!data.stats[k].reset };
    }
    this.build();
    this.resetLoop();
    if (reduced) this.drawFinal();
    else this.watch();
  }

  /* ---------- templates bound to stats ---------- */
  Scene.prototype.fill = function (str) {
    var stats = this.stats;
    return String(str).replace(/\{(\w+)\}/g, function (m, k) {
      return stats[k] ? format(stats[k].value, stats[k].fmt) : m;
    });
  };
  Scene.prototype.bind = function (node, str) {
    node.textContent = this.fill(str);
    if (String(str).indexOf('{') >= 0) this.bindings.push({ node: node, str: str });
  };
  Scene.prototype.refresh = function () {
    for (var i = 0; i < this.bindings.length; i++) {
      var b = this.bindings[i];
      var v = this.fill(b.str);
      if (b.node.textContent !== v) b.node.textContent = v;
    }
  };

  /* ---------- DOM ---------- */
  Scene.prototype.build = function () {
    var d = this.d, self = this;
    this.host.classList.add('scene');
    if (d.summary) this.host.appendChild(el('p', 'sr-only', d.summary));

    var term = el('div', 'term');
    var bar = el('div', 'term-bar');
    var dots = el('span', 'term-dots');
    dots.appendChild(el('i')); dots.appendChild(el('i')); dots.appendChild(el('i'));
    bar.appendChild(dots);
    bar.appendChild(el('span', 'term-title', d.title || ''));
    if (!reduced) {
      var ctl = el('button', 'term-ctl', 'pausar');
      ctl.type = 'button';
      ctl.setAttribute('aria-pressed', 'false');
      ctl.setAttribute('aria-label', 'Pausar a animação: ' + (d.title || 'cena'));
      ctl.addEventListener('click', function () { self.toggle(); });
      this.ctl = ctl;
      bar.appendChild(ctl);
    }
    term.appendChild(bar);

    var body = el('div', 'term-body');
    body.setAttribute('aria-hidden', 'true');

    if (d.legend) {
      var legend = el('div', 'term-legend');
      d.legend.forEach(function (l) {
        var k = el('span', 'term-key r-' + l.role);
        k.appendChild(el('i'));
        k.appendChild(document.createTextNode(l.label));
        legend.appendChild(k);
      });
      body.appendChild(legend);
    }

    var stage = el('div', 'term-stage');
    this.stage = stage;
    this.svg = svgEl('svg', { 'class': 'term-edges', focusable: 'false' });
    var defs = svgEl('defs', {});
    this.markerId = 'tm-' + Math.random().toString(36).slice(2, 8);
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

    if (d.rail) this.buildRail(d.rail);
    (d.nodes || []).forEach(function (n, i) { self.buildNode(n, i); });
    (d.edges || []).forEach(function (e) { self.buildEdge(e); });
    body.appendChild(stage);

    var log = el('div', 'term-log');
    log.appendChild(el('div', 'term-log-head', 'registro da sessão'));
    this.logList = el('ul', 'term-log-list');
    log.appendChild(this.logList);
    body.appendChild(log);

    if (d.status) {
      var st = el('div', 'term-status');
      var prompt = el('div', 'term-prompt');
      prompt.appendChild(el('span', 'term-ps', '~/' + (d.status.cwd || 'app') + ' $ '));
      prompt.appendChild(el('span', 'term-cmd', d.status.cmd || ''));
      prompt.appendChild(el('span', 'term-caret', ' '));
      st.appendChild(prompt);
      var chips = el('div', 'term-chips');
      (d.status.chips || []).forEach(function (c) {
        var chip = el('span', 'term-chip');
        chip.appendChild(document.createTextNode(c.label + ' '));
        var v = el('b', 'r-' + (c.role || 'core'));
        self.bind(v, '[' + c.value + ']');
        chip.appendChild(v);
        chips.appendChild(chip);
      });
      st.appendChild(chips);
      body.appendChild(st);
    }

    term.appendChild(body);
    this.host.appendChild(term);
  };

  Scene.prototype.buildRail = function (r) {
    var self = this;
    var rail = el('aside', 'term-rail r-' + (r.role || 'human'));
    rail.appendChild(el('div', 'rail-title', r.title || ''));
    if (r.sub) rail.appendChild(el('div', 'rail-sub', r.sub));
    this.railItems = {};
    (r.items || []).forEach(function (it) {
      var row = el('div', 'rail-item');
      row.dataset.anchor = 'rail:' + it.id;
      row.appendChild(el('span', 'rail-glyph', '◇'));
      row.appendChild(el('span', '', it.text));
      rail.appendChild(row);
      self.railItems[it.id] = row;
    });
    (r.notes || []).forEach(function (t) {
      var p = el('div', 'rail-note');
      self.bind(p, t);
      rail.appendChild(p);
    });
    this.rail = rail;
    this.stage.appendChild(rail);
  };

  Scene.prototype.buildNode = function (n, index) {
    var self = this;
    var card = el('div', 'node r-' + n.role);
    card.dataset.anchor = n.id;
    card.appendChild(el('div', 'node-title', n.title));
    if (n.sub) { var sub = el('div', 'node-sub'); this.bind(sub, n.sub); card.appendChild(sub); }
    var meters = {};
    (n.meters || []).forEach(function (m) {
      var row = el('div', 'm-row m-' + (m.kind || 'text'));
      if (m.kind === 'bar') {
        row.appendChild(el('span', 'm-label', m.label || ''));
        var track = el('span', 'm-bar');
        var fill = el('i');
        track.appendChild(fill);
        row.appendChild(track);
        var val = el('span', 'm-val');
        row.appendChild(val);
        meters[m.id] = { fill: fill, val: val, value: m.value || 0, initial: m.value || 0, suffix: m.suffix };
      } else if (m.kind === 'stat') {
        row.appendChild(el('span', 'm-label', m.label || ''));
        var v = el('span', 'm-val');
        self.bind(v, '{' + m.stat + '}');
        row.appendChild(v);
      } else {
        var tx = el('span', 'm-text');
        self.bind(tx, m.text || '');
        row.appendChild(tx);
      }
      card.appendChild(row);
    });
    var status = el('div', 'node-status');
    var glyph = el('span', 'st-glyph');
    var label = el('span', 'st-label');
    status.appendChild(glyph);
    status.appendChild(label);
    card.appendChild(status);
    this.stage.appendChild(card);
    this.nodes[n.id] = { d: n, el: card, glyph: glyph, label: label, meters: meters,
                         order: n.order != null ? n.order : index, status: null };
  };

  Scene.prototype.buildEdge = function (e) {
    var path = svgEl('path', { 'class': 'edge', 'marker-end': 'url(#' + this.markerId + ')' });
    this.edgeLayer.appendChild(path);
    var label = null;
    if (e.label) {
      label = svgEl('text', { 'class': 'edge-label' });
      label.textContent = e.label;
      this.edgeLayer.appendChild(label);
    }
    var from = this.nodes[e.from];
    this.edges[e.id] = { d: e, path: path, label: label, hot: 0,
                         role: from ? from.d.role : (this.d.rail && this.d.rail.role) || 'core' };
  };

  /* ---------- layout ---------- */
  Scene.prototype.setMode = function (wide) {
    if (this.wide === wide) return;
    this.wide = wide;
    var d = this.d, cols = d.cols || 3, railCol = d.rail ? 1 : 0;
    this.stage.classList.toggle('is-wide', wide);
    this.stage.style.gridTemplateColumns = wide
      ? (d.rail ? 'minmax(150px, 0.85fr) ' : '') + 'repeat(' + cols + ', minmax(0, 1fr))'
      : 'repeat(2, minmax(0, 1fr))';
    for (var id in this.nodes) {
      var n = this.nodes[id], s = n.el.style, at = n.d.at || [1, 1];
      if (wide) {
        s.gridColumn = (at[0] + railCol) + (at[2] ? ' / span ' + at[2] : '');
        s.gridRow = String(at[1]);
        s.order = '';
      } else {
        s.gridColumn = n.d.half ? 'span 1' : '1 / -1';
        s.gridRow = '';
        s.order = String(n.order);
      }
    }
    if (this.rail) {
      this.rail.style.gridColumn = wide ? '1' : '1 / -1';
      this.rail.style.gridRow = wide ? '1 / span ' + (d.rows || 5) : '';
      this.rail.style.order = wide ? '' : '999';
    }
    for (var k in this.edges) {
      var e = this.edges[k];
      var hide = !wide && e.d.wideOnly;
      e.path.style.display = hide ? 'none' : '';
      if (e.label) e.label.style.display = hide ? 'none' : '';
    }
  };

  Scene.prototype.box = function (anchor, origin) {
    var node = this.stage.querySelector('[data-anchor="' + anchor + '"]');
    if (!node) return null;
    var r = node.getBoundingClientRect();
    var l = r.left - origin.left, t = r.top - origin.top;
    return { l: l, t: t, r: l + r.width, b: t + r.height, cx: l + r.width / 2, cy: t + r.height / 2 };
  };

  Scene.prototype.route = function (e, a, b, width) {
    if (e.route === 'side') {
      var gx = width - 7;
      return 'M' + a.r + ' ' + a.cy + 'H' + gx + 'V' + b.cy + 'H' + (b.r + 2);
    }
    if (e.route === 'rail') {
      var x = b.l - 14;
      return 'M' + a.r + ' ' + a.cy + 'H' + x + 'V' + b.cy + 'H' + (b.l - 2);
    }
    var ox = Math.min(a.r, b.r) - Math.max(a.l, b.l);
    if (ox > 16) {
      var cx = (Math.max(a.l, b.l) + Math.min(a.r, b.r)) / 2;
      if (b.t >= a.b) return 'M' + cx + ' ' + a.b + 'V' + (b.t - 2);
      return 'M' + cx + ' ' + a.t + 'V' + (b.b + 2);
    }
    var oy = Math.min(a.b, b.b) - Math.max(a.t, b.t);
    if (oy > 16) {
      var cy = (Math.max(a.t, b.t) + Math.min(a.b, b.b)) / 2;
      if (b.l >= a.r) return 'M' + a.r + ' ' + cy + 'H' + (b.l - 2);
      return 'M' + a.l + ' ' + cy + 'H' + (b.r + 2);
    }
    if (b.t >= a.b) {
      var my = (a.b + b.t) / 2;
      return 'M' + a.cx + ' ' + a.b + 'V' + my + 'H' + b.cx + 'V' + (b.t - 2);
    }
    var my2 = (b.b + a.t) / 2;
    return 'M' + a.cx + ' ' + a.t + 'V' + my2 + 'H' + b.cx + 'V' + (b.b + 2);
  };

  Scene.prototype.layout = function () {
    var width = this.stage.clientWidth;
    if (!width) return;
    this.setMode(width >= (this.d.wideMin || 640));
    var origin = this.stage.getBoundingClientRect();
    var w = Math.round(origin.width), h = Math.round(origin.height);
    this.svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
    this.svg.setAttribute('width', w);
    this.svg.setAttribute('height', h);
    for (var k in this.edges) {
      var e = this.edges[k];
      if (e.path.style.display === 'none') continue;
      var a = this.box(e.d.from, origin), b = this.box(e.d.to, origin);
      if (!a || !b) continue;
      e.path.setAttribute('d', this.route(e.d, a, b, w));
      if (e.label) this.placeLabel(e);
    }
  };

  Scene.prototype.placeLabel = function (e) {
    var len = e.path.getTotalLength();
    var mid = e.path.getPointAtLength(len / 2);
    var before = e.path.getPointAtLength(Math.max(0, len / 2 - 4));
    var vertical = Math.abs(before.x - mid.x) < Math.abs(before.y - mid.y);
    var room = e.d.label.length * 6.8;
    if (!vertical && len < room + 24) { e.label.style.visibility = 'hidden'; return; }
    e.label.style.visibility = '';
    e.label.setAttribute('x', vertical ? mid.x + 8 : mid.x);
    e.label.setAttribute('y', vertical ? mid.y + 4 : mid.y - 7);
    e.label.setAttribute('text-anchor', vertical ? 'start' : 'middle');
  };

  /* ---------- state ---------- */
  Scene.prototype.setStatus = function (id, s) {
    var n = this.nodes[id];
    if (!n) return;
    n.status = s;
    n.el.classList.remove('st-run', 'st-done', 'st-wait', 'st-other');
    n.el.classList.add(statusClass(s));
    n.el.classList.toggle('is-active', s === 'rodando');
    n.glyph.textContent = GLYPH[s] || '•';
    n.label.textContent = s;
  };

  Scene.prototype.setBar = function (m, v) {
    m.value = v;
    m.fill.style.width = Math.max(0, Math.min(100, v)) + '%';
    m.val.textContent = Math.round(v) + (m.suffix != null ? m.suffix : '%');
  };

  Scene.prototype.meter = function (key) {
    var p = key.split('.');
    var n = this.nodes[p[0]];
    return n ? n.meters[p[1]] : null;
  };

  Scene.prototype.resetLoop = function () {
    for (var id in this.nodes) {
      var n = this.nodes[id];
      this.setStatus(id, n.d.status || 'aguardando');
      for (var m in n.meters) this.setBar(n.meters[m], n.meters[m].initial);
      n.el.classList.remove('is-pulse');
    }
    for (var k in this.stats) if (this.stats[k].reset) this.stats[k].value = this.stats[k].initial;
    this.setRail(null);
    this.packets.forEach(function (p) { p.g.remove(); });
    this.packets = [];
    for (var e in this.edges) { this.edges[e].hot = 0; this.edges[e].path.setAttribute('class', 'edge'); }
    this.tweens = [];
    this.pulses = [];
    this.refresh();
  };

  Scene.prototype.setRail = function (id) {
    if (!this.railItems) return;
    for (var k in this.railItems) {
      var on = k === id;
      this.railItems[k].classList.toggle('is-on', on);
      this.railItems[k].firstChild.textContent = on ? '◆' : '◇';
    }
  };

  Scene.prototype.addLog = function (entry) {
    var li = el('li');
    li.appendChild(el('span', 'log-t', clock(this.clock0 + this.elapsed * 1000)));
    li.appendChild(el('span', 'log-who r-' + entry[0], entry[1]));
    li.appendChild(el('span', 'log-x', this.fill(entry[2])));
    this.logList.appendChild(li);
    var max = this.d.logLines || 4;
    while (this.logList.children.length > max) this.logList.removeChild(this.logList.firstChild);
  };

  Scene.prototype.apply = function (ev, instant) {
    var self = this, k;
    if (ev.status) for (k in ev.status) this.setStatus(k, ev.status[k]);
    if (ev.bar) {
      for (k in ev.bar) {
        var m = this.meter(k);
        if (!m) continue;
        if (instant) this.setBar(m, ev.bar[k]);
        else this.tween(m.value, ev.bar[k], ev.dur || 1.2, (function (mm) {
          return function (v) { self.setBar(mm, v); };
        })(m));
      }
    }
    if (ev.add) {
      for (k in ev.add) {
        var s = this.stats[k];
        if (!s) continue;
        var to = s.value + ev.add[k];
        if (instant) { s.value = to; this.refresh(); }
        else this.tween(s.value, to, 0.6, (function (ss) {
          return function (v) { ss.value = v; self.refresh(); };
        })(s));
      }
    }
    if (ev.rail !== undefined) this.setRail(ev.rail);
    if (ev.pulse && this.nodes[ev.pulse] && !instant) {
      this.nodes[ev.pulse].el.classList.add('is-pulse');
      this.pulses.push({ id: ev.pulse, until: this.t + 1.2 });
    }
    if (ev.packet && !instant) this.launch(ev);
    if (ev.log) this.addLog(ev.log);
  };

  Scene.prototype.tween = function (from, to, dur, set) {
    this.tweens.push({ from: from, to: to, start: this.t, dur: dur, set: set });
  };

  Scene.prototype.launch = function (ev) {
    var e = this.edges[ev.packet];
    if (!e || e.path.style.display === 'none') return;
    var role = ev.role || e.role;
    var g = svgEl('g', { 'class': 'packet r-' + role });
    g.appendChild(svgEl('circle', { r: '1.6', 'class': 'trail' }));
    g.appendChild(svgEl('circle', { r: '2.2', 'class': 'trail' }));
    g.appendChild(svgEl('circle', { r: '3.6' }));
    this.packetLayer.appendChild(g);
    e.hot++;
    e.path.setAttribute('class', 'edge is-hot r-' + role);
    this.packets.push({ e: e, g: g, start: this.t, dur: ev.dur || 1.4, back: !!ev.back });
  };

  /* ---------- clock ---------- */
  Scene.prototype.advance = function (dt) {
    this.t += dt;
    this.elapsed += dt;
    while (this.next < this.events.length && this.events[this.next].t <= this.t) {
      this.apply(this.events[this.next], false);
      this.next++;
    }
    var i, keep = [];
    for (i = 0; i < this.tweens.length; i++) {
      var tw = this.tweens[i];
      var p = Math.min(1, (this.t - tw.start) / tw.dur);
      tw.set(tw.from + (tw.to - tw.from) * ease(p));
      if (p < 1) keep.push(tw);
    }
    this.tweens = keep;

    keep = [];
    for (i = 0; i < this.packets.length; i++) {
      var pk = this.packets[i];
      var q = (this.t - pk.start) / pk.dur;
      if (q >= 1) {
        pk.g.remove();
        if (--pk.e.hot <= 0) { pk.e.hot = 0; pk.e.path.setAttribute('class', 'edge'); }
        continue;
      }
      var L = pk.e.path.getTotalLength();
      var s = ease(Math.max(0, q)) * L;
      if (pk.back) s = L - s;
      var dir = pk.back ? 1 : -1;
      var c = pk.g.childNodes;
      for (var j = 0; j < 3; j++) {
        var at = Math.max(0, Math.min(L, s + dir * (2 - j) * 7));
        var pt = pk.e.path.getPointAtLength(at);
        c[j].setAttribute('cx', pt.x.toFixed(1));
        c[j].setAttribute('cy', pt.y.toFixed(1));
      }
      keep.push(pk);
    }
    this.packets = keep;

    keep = [];
    for (i = 0; i < this.pulses.length; i++) {
      if (this.t >= this.pulses[i].until) this.nodes[this.pulses[i].id].el.classList.remove('is-pulse');
      else keep.push(this.pulses[i]);
    }
    this.pulses = keep;

    var frame = SPIN[Math.floor(this.elapsed * 6) % SPIN.length];
    for (var id in this.nodes) if (this.nodes[id].status === 'rodando') this.nodes[id].glyph.textContent = frame;

    if (this.t >= this.duration) {
      for (i = 0; i < this.tweens.length; i++) this.tweens[i].set(this.tweens[i].to);
      this.t -= this.duration;
      this.next = 0;
      this.resetLoop();
    }
  };

  Scene.prototype.tick = function (ts) {
    if (!this.running) return;
    var dt = this.last ? Math.min((ts - this.last) / 1000, 0.1) : 0;
    this.last = ts;
    this.advance(dt);
    this.raf = requestAnimationFrame(this.frame);
  };

  Scene.prototype.sync = function () {
    var go = !this.paused && this.visible && this.inView;
    if (go && !this.running) {
      this.running = true;
      this.last = 0;
      this.raf = requestAnimationFrame(this.frame);
    } else if (!go && this.running) {
      this.running = false;
      cancelAnimationFrame(this.raf);
    }
  };

  Scene.prototype.toggle = function () {
    this.paused = !this.paused;
    this.ctl.textContent = this.paused ? 'continuar' : 'pausar';
    this.ctl.setAttribute('aria-pressed', this.paused ? 'true' : 'false');
    this.ctl.setAttribute('aria-label', (this.paused ? 'Continuar' : 'Pausar') + ' a animação: ' + (this.d.title || 'cena'));
    this.host.classList.toggle('is-paused', this.paused);
    this.sync();
  };

  Scene.prototype.watch = function () {
    var self = this;
    var relayout = function () { self.layout(); };
    if (window.ResizeObserver) new ResizeObserver(relayout).observe(this.stage);
    else window.addEventListener('resize', relayout);
    document.addEventListener('visibilitychange', function () {
      self.visible = !document.hidden;
      self.sync();
    });
    if (window.IntersectionObserver) {
      new IntersectionObserver(function (entries) {
        self.inView = entries[entries.length - 1].isIntersecting;
        self.sync();
      }, { rootMargin: '80px' }).observe(this.host);
    }
    this.layout();
    this.sync();
  };

  /* Reduced motion: every event applied once, no packets, no loop. */
  Scene.prototype.drawFinal = function () {
    for (var i = 0; i < this.events.length; i++) this.apply(this.events[i], true);
    this.host.classList.add('is-static');
    var self = this;
    var relayout = function () { self.layout(); };
    if (window.ResizeObserver) new ResizeObserver(relayout).observe(this.stage);
    else window.addEventListener('resize', relayout);
    this.layout();
  };

  function mount() {
    var scenes = window.AlphaScenes || {};
    var hosts = document.querySelectorAll('[data-scene]');
    for (var i = 0; i < hosts.length; i++) {
      var data = scenes[hosts[i].getAttribute('data-scene')];
      if (data && !hosts[i].classList.contains('scene')) new Scene(hosts[i], data);
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();
