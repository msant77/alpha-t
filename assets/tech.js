/*
 * Alpha Tester "Tech Level": a flat architecture diagram played by the same
 * story engine (assets/loop.js) as the 3D loop.
 *
 * Lanes and containers (events, the platform, the agent, two dashed
 * pipelines, results) hold component boxes with a title and a monospace
 * subtitle. Pipeline steps tick with a checkmark as they run, skipped steps
 * say so, labelled edges pulse while a packet travels, and the path of the
 * scenario that is playing glows in the accent while the rest dims.
 *
 * Geometry is data: every group and node has a box [x, y, w, h] on a wide
 * canvas (scene.size) and another on a narrow one (scene.sizeN), so phones
 * get a stacked diagram instead of a shrunken one. Text comes from the
 * locale files (tech.*), colours from the --tech-* variables in site.css.
 */
(function () {
  'use strict';
  var loop = window.AlphaLoop;
  if (!loop) return;
  var T = loop.T;
  var ease = loop.ease;
  var SVGNS = 'http://www.w3.org/2000/svg';
  var SPIN = ['◐', '◓', '◑', '◒'];
  var GLYPH = { aguardando: '', rodando: '◐', 'concluído': '', ignorado: '⊘' };
  var ICONS = {
    send: 'M2 8l12-5-5 12-2-5z',
    check: 'M3 8.5l3 3 7-7',
    play: 'M5 3l8 5-8 5z',
    server: 'M3 3h10v4H3zM3 9h10v4H3zM5.5 5h.01M5.5 11h.01',
    db: 'M3 4c0-1.1 2.2-2 5-2s5 .9 5 2v8c0 1.1-2.2 2-5 2s-5-.9-5-2zM3 4c0 1.1 2.2 2 5 2s5-.9 5-2M3 8c0 1.1 2.2 2 5 2s5-.9 5-2',
    terminal: 'M2 3h12v10H2zM4.5 6l2 2-2 2M8 10h3',
    plug: 'M6 2v3M10 2v3M4 5h8v3a4 4 0 0 1-8 0zM8 12v2',
    key: 'M10 3a3 3 0 1 1 0 6 3 3 0 0 1 0-6zM7.8 8.2L3 13M4.5 11.5l1.5 1.5',
    spark: 'M8 2l1.5 4.5L14 8l-4.5 1.5L8 14l-1.5-4.5L2 8l4.5-1.5z',
    search: 'M7 3a4 4 0 1 1 0 8 4 4 0 0 1 0-8zM10 10l4 4',
    tag: 'M2 2h6l6 6-6 6-6-6zM5 5h.01',
    issue: 'M8 2a6 6 0 1 1 0 12A6 6 0 0 1 8 2zM8 7.5a.5.5 0 1 1 0 1 .5.5 0 0 1 0-1z',
    coin: 'M8 2a6 6 0 1 1 0 12A6 6 0 0 1 8 2zM8 5v6M6 6.5h3a1 1 0 0 1 0 2H7a1 1 0 0 0 0 2h3',
    branch: 'M5 3v10M5 13a1.5 1.5 0 1 0 0-.01M11 3a1.5 1.5 0 1 0 0 .01M11 4.5c0 4-6 3-6 6',
    file: 'M4 2h5l3 3v9H4zM9 2v3h3',
    pen: 'M3 13l1-3 7-7 2 2-7 7zM10 4l2 2',
    shield: 'M8 2l5 2v4c0 3-2.2 5.2-5 6-2.8-.8-5-3-5-6V4zM5.5 8l2 2 3-3.5',
    pr: 'M4 3v10M4 3a1.5 1.5 0 1 0 0 .01M4 13a1.5 1.5 0 1 0 0 .01M12 13a1.5 1.5 0 1 0 0 .01M12 11.5V6a2 2 0 0 0-2-2H7M8.5 2.5L7 4l1.5 1.5',
    comment: 'M2 3h12v8H6l-3 3v-3H2z'
  };
  function icon(name) {
    var s = svg('svg', { viewBox: '0 0 16 16', 'class': 'tn-icon', 'aria-hidden': 'true' });
    s.appendChild(svg('path', { d: ICONS[name] || ICONS.check }));
    return s;
  }
  /* an orthogonal polyline with rounded corners */
  function rounded(pts, r) {
    var d = 'M' + pts[0][0] + ' ' + pts[0][1];
    for (var i = 1; i < pts.length - 1; i++) {
      var p0 = pts[i - 1], p1 = pts[i], p2 = pts[i + 1];
      var l1 = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]), l2 = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
      var rr = Math.min(r, l1 / 2, l2 / 2);
      if (rr < 0.5) { d += 'L' + p1[0] + ' ' + p1[1]; continue; }
      var a = [p1[0] + (p0[0] - p1[0]) * rr / l1, p1[1] + (p0[1] - p1[1]) * rr / l1];
      var b = [p1[0] + (p2[0] - p1[0]) * rr / l2, p1[1] + (p2[1] - p1[1]) * rr / l2];
      d += 'L' + a[0].toFixed(1) + ' ' + a[1].toFixed(1) + 'Q' + p1[0] + ' ' + p1[1] + ' ' + b[0].toFixed(1) + ' ' + b[1].toFixed(1);
    }
    var last = pts[pts.length - 1];
    return d + 'L' + last[0] + ' ' + last[1];
  }

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function svg(tag, attrs) {
    var e = document.createElementNS(SVGNS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  }

  function TechView() {}

  TechView.prototype.init = function (story) {
    var self = this, d = story.d;
    this.s = story;
    this.nodes = {};
    this.groups = {};
    this.edges = {};
    this.packets = [];
    this.lit = {};
    this.narrow = null;
    var host = story.stageEl;
    host.classList.add('is-tech');
    this.canvas = el('div', 'tech-canvas');
    this.svg = svg('svg', { 'class': 'tech-edges', 'aria-hidden': 'true' });
    var defs = svg('defs', {});
    this.mid = 'th-' + Math.random().toString(36).slice(2, 8);
    var m = svg('marker', { id: this.mid, viewBox: '0 0 8 8', refX: '7', refY: '4', markerWidth: '6', markerHeight: '6', orient: 'auto-start-reverse' });
    m.appendChild(svg('path', { d: 'M0 0L8 4L0 8z', 'class': 'tech-head' }));
    defs.appendChild(m);
    this.svg.appendChild(defs);
    this.edgeLayer = svg('g', {});
    this.labelLayer = svg('g', {});
    this.packetLayer = svg('g', {});
    this.svg.appendChild(this.edgeLayer);
    this.svg.appendChild(this.labelLayer);
    this.svg.appendChild(this.packetLayer);

    (d.groups || []).forEach(function (g) {
      var box = el('div', 'tg tg-' + g.kind);
      box.setAttribute('aria-hidden', 'true');
      var label = el('div', 'tg-label');
      story.bind(label, function () { return story.tt('group.' + g.id); });
      box.appendChild(label);
      self.canvas.appendChild(box);
      self.groups[g.id] = { d: g, el: box };
    });
    this.canvas.appendChild(this.svg);
    (d.nodes || []).forEach(function (n) {
      var b = el('div', 'tn r-' + (n.role || 'core') + (n.step ? ' is-step' : ''));
      b.setAttribute('aria-hidden', 'true');
      var head = el('div', 'tn-head');
      head.appendChild(icon(n.icon));
      var title = el('span', 'tn-title');
      story.bind(title, function () { return story.tt('node.' + n.id + '.title'); });
      var glyph = el('span', 'tn-glyph');
      var tick = svg('svg', { viewBox: '0 0 16 16', 'class': 'tn-tick', 'aria-hidden': 'true' });
      tick.appendChild(svg('path', { d: 'M3 8.5l3 3 7-7', pathLength: '1' }));
      head.appendChild(title);
      head.appendChild(glyph);
      head.appendChild(tick);
      b.appendChild(head);
      var sub = el('div', 'tn-sub');
      story.bind(sub, function () { return story.tt('node.' + n.id + '.sub'); });
      b.appendChild(sub);
      var badge = el('div', 'tn-badge');
      b.appendChild(badge);
      b.addEventListener('click', function (e) { e.stopPropagation(); story.pick('node', n.id); });
      if (!loop.coarse) {
        b.addEventListener('mouseenter', function () { story.hover('node', n.id); });
        b.addEventListener('mouseleave', function () { story.hover(null); });
      }
      self.canvas.appendChild(b);
      self.nodes[n.id] = { d: n, el: b, glyph: glyph, badge: badge, status: null };
    });
    (d.edges || []).forEach(function (e) {
      var path = svg('path', { 'class': 'tech-edge', 'marker-end': 'url(#' + self.mid + ')' });
      var hit = svg('path', { 'class': 'tech-hit' });
      var label = svg('text', { 'class': 'tech-label' });
      hit.addEventListener('click', function (ev) { ev.stopPropagation(); story.pick('edge', e.id); });
      if (!loop.coarse) {
        hit.addEventListener('mouseenter', function () { story.hover('edge', e.id); });
        hit.addEventListener('mouseleave', function () { story.hover(null); });
      }
      self.edgeLayer.appendChild(path);
      self.edgeLayer.appendChild(hit);
      self.labelLayer.appendChild(label);
      self.edges[e.id] = { d: e, path: path, hit: hit, label: label, hot: 0 };
    });
    host.appendChild(this.canvas);
    this.card = el('div', 'tech-card');
    this.card.setAttribute('aria-hidden', 'true');
    host.appendChild(this.card);
    host.addEventListener('click', function () { if (story.selection) story.clear(); });
    var relayout = function () { self.layout(); };
    if (window.ResizeObserver) new ResizeObserver(relayout).observe(host);
    else window.addEventListener('resize', relayout);
    this.layout();
  };

  /* box of a node or group in the current layout */
  TechView.prototype.box = function (item) {
    return (this.narrow && item.boxN) ? item.boxN : item.box;
  };

  TechView.prototype.layout = function () {
    var host = this.s.stageEl, d = this.s.d;
    var width = host.clientWidth;
    if (!width) return;
    var narrow = width < (d.narrowBelow || 560);
    this.narrow = narrow;
    var size = narrow ? d.sizeN : d.size;
    var scale = width / size[0];
    this.scale = scale;
    this.canvas.style.width = size[0] + 'px';
    this.canvas.style.height = size[1] + 'px';
    this.canvas.style.transform = 'scale(' + scale + ')';
    host.style.height = Math.round(size[1] * scale) + 'px';
    this.svg.setAttribute('viewBox', '0 0 ' + size[0] + ' ' + size[1]);
    this.svg.setAttribute('width', size[0]);
    this.svg.setAttribute('height', size[1]);
    var place = function (elm, b) {
      elm.style.left = b[0] + 'px'; elm.style.top = b[1] + 'px';
      elm.style.width = b[2] + 'px'; elm.style.height = b[3] + 'px';
    };
    for (var g in this.groups) place(this.groups[g].el, this.box(this.groups[g].d));
    for (var n in this.nodes) place(this.nodes[n].el, this.box(this.nodes[n].d));
    for (var k in this.edges) this.route(this.edges[k]);
  };

  /* orthogonal route between two boxes; sides: r l t b (wide) or rN/... (narrow) */
  TechView.prototype.route = function (e) {
    var d = e.d;
    var a = this.box(this.nodes[d.from] ? this.nodes[d.from].d : this.groups[d.from].d);
    var b = this.box(this.nodes[d.to] ? this.nodes[d.to].d : this.groups[d.to].d);
    var fs = (this.narrow && d.fsN) || d.fs || 'r', ts = (this.narrow && d.tsN) || d.ts || 'l';
    function pt(box, side, off) {
      off = off == null ? 0.5 : off;
      if (side === 'r') return [box[0] + box[2], box[1] + box[3] * off];
      if (side === 'l') return [box[0], box[1] + box[3] * off];
      if (side === 't') return [box[0] + box[2] * off, box[1]];
      return [box[0] + box[2] * off, box[1] + box[3]];
    }
    var p = pt(a, fs, (this.narrow && d.foN) || d.fo), q = pt(b, ts, (this.narrow && d.toN) || d.to2);
    var pts, mx, my, lx, ly;
    if ((fs === 'r' || fs === 'l') && (ts === 'r' || ts === 'l')) {
      mx = (this.narrow && d.viaN != null) ? d.viaN : (d.via != null ? d.via : (p[0] + q[0]) / 2);
      pts = [p, [mx, p[1]], [mx, q[1]], q];
      lx = Math.abs(q[1] - p[1]) < 4 ? (p[0] + q[0]) / 2 : (Math.abs(q[0] - mx) > Math.abs(mx - p[0]) ? (mx + q[0]) / 2 : (p[0] + mx) / 2);
      ly = Math.abs(q[0] - mx) > Math.abs(mx - p[0]) ? q[1] - 6 : p[1] - 6;
    } else if ((fs === 't' || fs === 'b') && (ts === 't' || ts === 'b')) {
      my = (p[1] + q[1]) / 2;
      pts = [p, [p[0], my], [q[0], my], q];
      lx = q[0] + 6; ly = (my + q[1]) / 2 + 4;
    } else if (fs === 'r' || fs === 'l') {
      pts = [p, [q[0], p[1]], q];
      lx = (p[0] + q[0]) / 2; ly = p[1] - 6;
    } else {
      pts = [p, [p[0], q[1]], q];
      lx = (p[0] + q[0]) / 2; ly = q[1] - 6;
    }
    var dd = rounded(pts, 9);
    e.path.setAttribute('d', dd);
    e.hit.setAttribute('d', dd);
    var lp = this.narrow ? d.lpN : d.lp;
    if (lp) { lx = lp[0]; ly = lp[1]; }
    e.label.setAttribute('x', lx.toFixed(1));
    e.label.setAttribute('y', ly.toFixed(1));
    e.label.setAttribute('text-anchor', (this.narrow ? d.laN : d.la) || 'middle');
    e.label.textContent = d.label ? this.s.tt('edge.' + d.id + '.label') : '';
  };

  /* ---------- story hooks ---------- */
  TechView.prototype.light = function (id) {
    if (!id) return;
    this.lit[id] = true;
    var it = this.nodes[id] || this.groups[id];
    if (it) it.el.classList.add('is-lit');
  };

  TechView.prototype.setStatus = function (id, st) {
    var n = this.nodes[id];
    if (!n) return;
    n.status = st;
    var c = n.el.classList;
    c.remove('st-run', 'st-done', 'st-skip');
    if (st === 'rodando') c.add('st-run');
    if (st === 'concluído') c.add('st-done');
    if (st === 'ignorado') c.add('st-skip');
    n.glyph.textContent = GLYPH[st] != null ? GLYPH[st] : '';
    n.badge.textContent = st === 'ignorado' ? loop.statusLabel(st) : '';
    if (st !== 'aguardando') this.light(id);
  };

  TechView.prototype.setBar = function () {};
  TechView.prototype.statsChanged = function () {};
  TechView.prototype.relocale = function () {
    for (var k in this.edges) this.route(this.edges[k]);
    for (var id in this.nodes) this.setStatus(id, this.nodes[id].status || 'aguardando');
  };

  /* a new scenario: everything goes back to idle and dim, then lights up again */
  TechView.prototype.step = function (id) {
    var self = this;
    this.lit = {};
    this.card.textContent = this.s.tt('scenario.' + id);
    var host = this.s.stageEl;
    host.classList.remove('is-switch');
    void host.offsetWidth;
    host.classList.add('is-switch');
    clearTimeout(this.cardTimer);
    this.cardTimer = setTimeout(function () { host.classList.remove('is-switch'); }, 2200);
    void self;
    this.s.stageEl.classList.add('is-live');
    var all = this.s.stageEl.querySelectorAll('.is-lit');
    for (var i = 0; i < all.length; i++) all[i].classList.remove('is-lit');
    for (var k in this.edges) this.edges[k].path.classList.remove('is-lit');
    for (var id in this.nodes) this.setStatus(id, 'aguardando');
  };

  TechView.prototype.reset = function () {
    this.packets.forEach(function (p) { p.dot.remove(); });
    this.packets = [];
    for (var k in this.edges) { this.edges[k].hot = 0; this.edges[k].path.classList.remove('is-hot'); }
  };

  TechView.prototype.launch = function (edgeId, o) {
    var e = this.edges[edgeId];
    if (!e) return;
    var dot = svg('circle', { r: '4.5', 'class': 'tech-packet' });
    this.packetLayer.appendChild(dot);
    e.hot++;
    e.path.classList.add('is-hot', 'is-lit');
    e.label.classList.add('is-lit');
    this.light(e.d.from);
    this.light(e.d.to);
    this.packets.push({ e: e, dot: dot, start: this.s.t, dur: o.dur, back: o.back });
  };

  TechView.prototype.pulse = function (id) { this.light(id); };

  TechView.prototype.frame = function (dt, t, elapsed) {
    var keep = [];
    for (var i = 0; i < this.packets.length; i++) {
      var p = this.packets[i];
      var q = (t - p.start) / p.dur;
      if (q >= 1 || q < 0) {
        p.dot.remove();
        if (--p.e.hot <= 0) { p.e.hot = 0; p.e.path.classList.remove('is-hot'); }
        continue;
      }
      var L = p.e.path.getTotalLength();
      var s = ease(q) * L;
      var pt = p.e.path.getPointAtLength(p.back ? L - s : s);
      p.dot.setAttribute('cx', pt.x.toFixed(1));
      p.dot.setAttribute('cy', pt.y.toFixed(1));
      keep.push(p);
    }
    this.packets = keep;
    var frame = SPIN[Math.floor(elapsed * 6) % 4];
    for (var id in this.nodes) if (this.nodes[id].status === 'rodando') this.nodes[id].glyph.textContent = frame;
  };

  TechView.prototype.hover = function (h) {
    for (var id in this.nodes) this.nodes[id].el.classList.toggle('is-hover', !!h && h.kind === 'node' && h.id === id);
  };

  TechView.prototype.select = function (sel) {
    this.s.stageEl.classList.toggle('has-sel', !!sel);
    for (var id in this.nodes) this.nodes[id].el.classList.toggle('is-sel', !!sel && sel.kind === 'node' && sel.id === id);
    for (var k in this.edges) this.edges[k].path.classList.toggle('is-sel', !!sel && sel.kind === 'edge' && sel.id === k);
  };

  TechView.prototype.anchorRect = function (kind, id) {
    var root = this.s.root.getBoundingClientRect(), r;
    if (kind === 'node' && this.nodes[id]) r = this.nodes[id].el.getBoundingClientRect();
    else if (kind === 'edge' && this.edges[id]) r = this.edges[id].path.getBoundingClientRect();
    if (!r) return null;
    return { left: r.left - root.left, top: r.top - root.top, right: r.right - root.left,
             bottom: r.bottom - root.top, width: r.width, height: r.height };
  };

  window.AlphaViews = window.AlphaViews || {};
  window.AlphaViews.tech = TechView;
})();
