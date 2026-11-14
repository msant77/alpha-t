/*
 * Alpha Tester hero: the loop in real 3D (three.js r169, vendored).
 *
 * A ThreeView for the story engine in assets/loop.js. Node cards are raised
 * slabs with a canvas-drawn face, standing on a ring; edges are curved tubes
 * through space; packets are lit points with a trail and a moving light. The
 * camera drifts slowly, follows a little parallax from the pointer and eases
 * to whatever the visitor selects (the rest dims). On narrow screens the
 * camera follows the step that is running, close enough to read the card.
 *
 * Colours are read from the CSS variables in site.css (and re-read when the
 * theme changes); nothing here defines a colour of its own.
 */
import * as THREE from './vendor/three.module.js';

const loop = window.AlphaLoop;
const ease = loop ? loop.ease : (p) => p;
const SPIN = ['◐', '◓', '◑', '◒'];
const GLYPH = { aguardando: '◌', rodando: '◐', 'concluído': '✓' };

const CARD_W = 2.7;          // world units
const PX = 640;              // canvas pixels across a card
const UNIT = PX / CARD_W;

function css(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || '#888888';
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function roundedShape(w, h, r) {
  const s = new THREE.Shape();
  const x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

/* soft white glow, tinted by the material colour */
function glowTexture(rounded) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  if (rounded) {
    g.filter = 'blur(14px)';
    g.fillStyle = 'rgba(255,255,255,0.9)';
    roundRect(g, 30, 30, 68, 68, 14);
    g.fill();
  } else {
    const r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    r.addColorStop(0, 'rgba(255,255,255,1)');
    r.addColorStop(0.25, 'rgba(255,255,255,0.55)');
    r.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = r;
    g.fillRect(0, 0, 128, 128);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function shadowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  r.addColorStop(0, 'rgba(0,0,0,0.55)');
  r.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = r;
  g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}

class ThreeView {
  init(story) {
    this.s = story;
    this.host = story.stageEl;
    this.host.classList.add('is-3d');
    this.cards = {};
    this.edges = {};
    this.packets = [];
    this.dirty = new Set();
    this.hoverId = null;
    this.sel = null;
    this.focusNode = null;
    this.actor = null;
    this.pointer = new THREE.Vector2(0, 0);
    this.parallax = new THREE.Vector2(0, 0);
    this.pointerIn = false;
    this.spinFrame = -1;
    this.fontsReady = false;

    const narrowDevice = window.matchMedia && window.matchMedia('(hover: none)').matches;
    const renderer = this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, narrowDevice ? 1.5 : 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.setAttribute('aria-hidden', 'true');
    renderer.domElement.className = 'hero-canvas';
    this.host.appendChild(renderer.domElement);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(34, 1, 0.1, 120);
    this.camTarget = new THREE.Vector3();
    this.camPos = new THREE.Vector3(0, 4, 14);
    this.camera.position.copy(this.camPos);

    this.ambient = new THREE.AmbientLight(0xffffff, 1.1);
    this.key = new THREE.DirectionalLight(0xffffff, 1.7);
    this.key.position.set(-5, 9, 8);
    this.packetLight = new THREE.PointLight(0xffffff, 0, 4.5, 1.6);
    this.scene.add(this.ambient, this.key, this.packetLight);

    this.world = new THREE.Group();
    this.scene.add(this.world);
    this.glowTex = glowTexture(false);
    this.cardGlowTex = glowTexture(true);
    this.shadowTex = shadowTexture();

    this.readColors();
    this.buildFloor();
    for (const n of story.d.nodes) this.buildCard(n);
    for (const e of story.d.edges) this.buildEdge(e);

    this.raycaster = new THREE.Raycaster();
    this.bindEvents();
    this.resize();
    if (window.ResizeObserver) new ResizeObserver(() => this.resize()).observe(this.host);
    else window.addEventListener('resize', () => this.resize());

    const recolor = () => { this.readColors(); this.applyColors(); };
    new MutationObserver(recolor).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    if (window.matchMedia) {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      if (mq.addEventListener) mq.addEventListener('change', recolor);
    }
    if (document.fonts && document.fonts.load) {
      Promise.all([
        document.fonts.load('600 40px "Cormorant Garamond"'),
        document.fonts.load('400 24px "JetBrains Mono"'),
        document.fonts.load('700 24px "JetBrains Mono"')
      ]).then(() => { this.fontsReady = true; this.markAll(); }, () => {});
    }
  }

  /* ---------- colours ---------- */
  readColors() {
    this.c = {
      panel: css('--term-panel'), bg: css('--term-bg'), text: css('--term-text'),
      muted: css('--term-muted'), line: css('--term-line'), gold: css('--scene-gold'),
      role: {
        client: css('--role-client'), core: css('--role-core'), agent: css('--role-agent'),
        github: css('--role-github'), human: css('--role-human')
      }
    };
  }

  applyColors() {
    for (const id in this.cards) {
      const k = this.cards[id];
      k.slab.material.color.set(this.c.panel);
      k.glow.material.color.set(this.c.gold);
    }
    for (const id in this.edges) {
      const e = this.edges[id];
      e.base.material.color.set(this.c.line);
    }
    this.track.material.color.set(this.c.gold);
    this.packetLight.color.set(this.c.gold);
    this.markAll();
  }

  /* ---------- floor: the loop's track and soft shadows ---------- */
  buildFloor() {
    const pts = new THREE.EllipseCurve(0, 0, 1, 1, 0, Math.PI * 2).getPoints(160);
    const geo = new THREE.BufferGeometry().setFromPoints(pts.map((p) => new THREE.Vector3(p.x, 0, p.y)));
    this.track = new THREE.LineLoop(geo, new THREE.LineDashedMaterial({
      color: this.c.gold, dashSize: 0.02, gapSize: 0.025, transparent: true, opacity: 0.55
    }));
    this.track.computeLineDistances();
    this.world.add(this.track);
  }

  /* ---------- cards ---------- */
  rows(n) {
    return 2 + (n.meters ? n.meters.length : 0) + 1;
  }

  buildCard(n) {
    const rows = this.rows(n);
    const hpx = 36 + 60 + (rows - 1) * 46 + 28;
    const h = hpx / UNIT;
    const canvas = document.createElement('canvas');
    canvas.width = PX;
    canvas.height = hpx;
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;

    const group = new THREE.Group();
    const geo = new THREE.ExtrudeGeometry(roundedShape(CARD_W, h, 0.12), {
      depth: 0.08, bevelEnabled: true, bevelThickness: 0.025, bevelSize: 0.025, bevelSegments: 2, curveSegments: 6
    });
    geo.center();
    const slab = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
      color: this.c.panel, roughness: 0.62, metalness: 0.12, transparent: true, opacity: 1
    }));
    slab.userData = { kind: 'node', id: n.id };
    const face = new THREE.Mesh(new THREE.PlaneGeometry(CARD_W, h), new THREE.MeshBasicMaterial({
      map: tex, transparent: true, toneMapped: false
    }));
    face.position.z = 0.068;
    face.userData = { kind: 'node', id: n.id };
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(CARD_W + 1.4, h + 1.4), new THREE.MeshBasicMaterial({
      map: this.cardGlowTex, color: this.c.gold, transparent: true, opacity: 0,
      blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false
    }));
    glow.position.z = -0.12;
    group.add(glow, slab, face);

    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(CARD_W * 1.3, 1.1), new THREE.MeshBasicMaterial({
      map: this.shadowTex, transparent: true, opacity: 0.35, depthWrite: false
    }));
    shadow.rotation.x = -Math.PI / 2;
    this.world.add(group, shadow);

    this.cards[n.id] = {
      d: n, group, slab, face, glow, shadow, canvas, ctx: canvas.getContext('2d'), tex, h,
      status: n.status || 'aguardando', bars: {}, lift: 0, liftTo: 0, glowNow: 0, dim: 1, dimTo: 1,
      home: new THREE.Vector3(), pulseUntil: 0
    };
    this.dirty.add(n.id);
  }

  markAll() { for (const id in this.cards) this.dirty.add(id); }

  draw(id) {
    const k = this.cards[id];
    if (!k) return;
    const n = k.d, g = k.ctx, W = k.canvas.width, H = k.canvas.height, c = this.c;
    const role = c.role[n.role] || c.gold;
    const s = this.s;
    g.clearRect(0, 0, W, H);
    roundRect(g, 3, 3, W - 6, H - 6, 26);
    g.fillStyle = c.panel;
    g.fill();
    g.lineWidth = 4;
    g.strokeStyle = role;
    g.stroke();
    // inner hairline for the raised, stitched-leather edge
    roundRect(g, 13, 13, W - 26, H - 26, 18);
    g.lineWidth = 1;
    g.globalAlpha = 0.35;
    g.strokeStyle = c.gold;
    g.stroke();
    g.globalAlpha = 1;

    const x = 34;
    let y = 36 + 44;
    g.textBaseline = 'alphabetic';
    g.fillStyle = role;
    g.font = '600 48px "Cormorant Garamond", Georgia, serif';
    g.fillText(n.title, x, y);
    const mono = '"JetBrains Mono", ui-monospace, Menlo, Consolas, monospace';
    g.font = '400 27px ' + mono;
    if (n.sub) {
      y += 42;
      g.fillStyle = c.muted;
      g.fillText(s.fill(n.sub), x, y);
    }
    for (const m of (n.meters || [])) {
      y += 46;
      if (m.kind === 'bar') {
        const v = k.bars[m.id] || 0;
        g.fillStyle = c.text;
        g.fillText(m.label, x, y);
        const bx = W * 0.5, bw = W * 0.28, bh = 18;
        g.strokeStyle = c.line;
        g.lineWidth = 2;
        g.strokeRect(bx, y - 17, bw, bh);
        g.fillStyle = role;
        g.fillRect(bx + 2, y - 15, (bw - 4) * Math.max(0, Math.min(1, v / 100)), bh - 4);
        g.font = '700 27px ' + mono;
        g.textAlign = 'right';
        g.fillText(Math.round(v) + '%', W - x, y);
        g.textAlign = 'left';
        g.font = '400 27px ' + mono;
      } else if (m.kind === 'stat') {
        g.fillStyle = c.text;
        g.fillText(m.label, x, y);
        g.font = '700 27px ' + mono;
        g.fillStyle = role;
        g.textAlign = 'right';
        g.fillText(s.fill('{' + m.stat + '}'), W - x, y);
        g.textAlign = 'left';
        g.font = '400 27px ' + mono;
      } else {
        g.fillStyle = c.text;
        g.fillText(s.fill(m.text || ''), x, y);
      }
    }
    y += 46;
    const st = k.status;
    const glyph = st === 'rodando' ? SPIN[Math.max(0, this.spinFrame) % 4] : (GLYPH[st] || '•');
    g.fillStyle = st === 'aguardando' ? c.muted : role;
    g.fillText(glyph + ' ' + st, x, y);
    k.tex.needsUpdate = true;
  }

  /* ---------- edges ---------- */
  buildEdge(e) {
    const mat = new THREE.MeshBasicMaterial({ color: this.c.line, transparent: true, opacity: 0.55, toneMapped: false });
    const hot = new THREE.MeshBasicMaterial({ color: this.c.gold, transparent: true, opacity: 0, toneMapped: false });
    const hitMat = new THREE.MeshBasicMaterial({ visible: false });
    const base = new THREE.Mesh(new THREE.BufferGeometry(), mat);
    const glow = new THREE.Mesh(new THREE.BufferGeometry(), hot);
    const hit = new THREE.Mesh(new THREE.BufferGeometry(), hitMat);
    hit.userData = { kind: 'edge', id: e.id };
    this.world.add(base, glow, hit);
    this.edges[e.id] = { d: e, base, glow, hit, curve: null, hot: 0, heat: 0, role: 'core', dim: 1, dimTo: 1 };
  }

  curveFor(e) {
    const a = this.cards[e.from].home, b = this.cards[e.to].home;
    const mid = a.clone().add(b).multiplyScalar(0.5);
    const ctrl = mid.clone();
    if (this.narrow) {
      const out = new THREE.Vector3(mid.x, 0, 0).normalize().multiplyScalar(e.across ? 0 : 0.9);
      ctrl.add(out).add(new THREE.Vector3(0, 0, e.across ? 2.2 : 1.1));
    } else if (e.across) {
      ctrl.y += 2.2;
    } else if (e.float) {
      ctrl.z += 0.8;
    } else {
      const out = new THREE.Vector3(mid.x, 0, mid.z);
      if (out.lengthSq() > 0.01) out.normalize().multiplyScalar(1.1);
      ctrl.add(out);
      ctrl.y += 0.9;
    }
    return new THREE.QuadraticBezierCurve3(a.clone(), ctrl, b.clone());
  }

  rebuildEdges() {
    for (const id in this.edges) {
      const e = this.edges[id];
      e.curve = this.curveFor(e.d);
      for (const [mesh, r] of [[e.base, 0.011], [e.glow, 0.024], [e.hit, 0.2]]) {
        mesh.geometry.dispose();
        mesh.geometry = new THREE.TubeGeometry(e.curve, 72, r, 6, false);
      }
    }
  }

  /* ---------- layout ---------- */
  layout() {
    const d = this.s.d;
    const ring = d.ring || [];
    const narrow = this.narrow;
    const rx = narrow ? 1.25 : 4.9, ry = narrow ? 4.4 : 0, rz = narrow ? 0 : 3.5;
    ring.forEach((id, i) => {
      const k = this.cards[id];
      if (!k) return;
      const a = Math.PI / 2 - (i * Math.PI * 2) / ring.length;
      if (narrow) k.home.set(rx * Math.cos(a), ry * Math.sin(a), 0.9 * Math.cos(a));
      else k.home.set(rx * Math.cos(a), 0, -rz * Math.sin(a));
    });
    for (const f of (d.floating || [])) {
      const k = this.cards[f.id];
      if (!k) continue;
      const p = narrow ? f.narrow : f.wide;
      k.home.set(p[0], p[1], p[2]);
    }
    const scale = narrow ? 0.86 : 1.3;
    for (const id in this.cards) {
      const k = this.cards[id];
      k.group.scale.setScalar(scale * (k.d.small ? 0.82 : 1));
      k.group.position.copy(k.home);
      k.shadow.visible = !narrow;
      k.shadow.position.set(k.home.x, -1.32, k.home.z + 0.2);
    }
    this.track.visible = !narrow;
    this.track.scale.set(rx, 1, rz || 1);
    this.track.position.y = -1.3;
    this.rebuildEdges();
  }

  resize() {
    const w = this.host.clientWidth, h = this.host.clientHeight;
    if (!w || !h) return;
    this.w = w; this.h = h;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    const narrow = w < 700 || w / h < 0.95;
    if (narrow !== this.narrow) { this.narrow = narrow; this.layout(); }
    // distance that fits the whole ring (wide) on this aspect
    const t = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
    // the ring gets the area right of the title and above the dock
    const availW = narrow ? 1 : 0.7, availH = narrow ? 1 : 0.64;
    const fitW = 2 * 4.9 + CARD_W * 1.3 + 1.0, fitH = 7.4;
    this.fitDist = Math.max(fitH / 2 / (t * availH), fitW / 2 / (t * this.camera.aspect * availW));
    this.offTo = narrow ? { x: 0, y: 0.03 } : { x: -0.12, y: 0.075 };
    if (!this.off) this.off = { x: this.offTo.x, y: this.offTo.y };
    this.snap = true;
  }

  /* ---------- interaction ---------- */
  bindEvents() {
    const el = this.renderer.domElement;
    let down = null;
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      this.pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      this.pointerIn = e.pointerType === 'mouse';
    });
    el.addEventListener('pointerleave', () => {
      this.pointerIn = false;
      if (this.hoverId) { this.hoverId = null; this.s.hover(null); el.style.cursor = ''; }
    });
    el.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY }; });
    el.addEventListener('pointerup', (e) => {
      if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 8) { down = null; return; }
      down = null;
      const r = el.getBoundingClientRect();
      this.pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      const hit = this.pick();
      if (hit) this.s.pick(hit.kind, hit.id);
      else if (this.s.selection) this.s.clear();
    });
  }

  pick() {
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const targets = [];
    for (const id in this.cards) targets.push(this.cards[id].slab, this.cards[id].face);
    for (const p of this.packets) targets.push(p.hit);
    for (const id in this.edges) targets.push(this.edges[id].hit);
    const hits = this.raycaster.intersectObjects(targets, false);
    return hits.length ? hits[0].object.userData : null;
  }

  hover(h) {
    this.hoverId = h && h.kind === 'node' ? h.id : null;
    this.hoverEdge = h && h.kind === 'edge' ? h.id : null;
  }

  select(sel, focusNode) {
    this.sel = sel;
    this.focusNode = focusNode && this.cards[focusNode] ? focusNode : null;
  }

  anchorRect(kind, id) {
    const root = this.s.root.getBoundingClientRect();
    const cv = this.renderer.domElement.getBoundingClientRect();
    const project = (v) => {
      const p = v.clone().project(this.camera);
      return { x: cv.left - root.left + (p.x + 1) / 2 * cv.width, y: cv.top - root.top + (1 - p.y) / 2 * cv.height };
    };
    let pts = [];
    if (kind === 'node' && this.cards[id]) {
      const k = this.cards[id];
      const hw = CARD_W / 2 * k.group.scale.x, hh = k.h / 2 * k.group.scale.y;
      for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
        pts.push(project(new THREE.Vector3(sx * hw, sy * hh, 0).applyMatrix4(k.group.matrixWorld)));
      }
    } else if (kind === 'edge' && this.edges[id] && this.edges[id].curve) {
      const live = this.packets.find((p) => p.edge === this.edges[id]);
      const at = live ? live.core.position : this.edges[id].curve.getPointAt(0.5);
      const p = project(at);
      pts = [{ x: p.x - 10, y: p.y - 10 }, { x: p.x + 10, y: p.y + 10 }];
    }
    if (!pts.length) return null;
    const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
    const l = Math.min(...xs), r = Math.max(...xs), t = Math.min(...ys), b = Math.max(...ys);
    return { left: l, top: t, right: r, bottom: b, width: r - l, height: b - t };
  }
  get tracksEdges() { return true; }

  /* ---------- story hooks ---------- */
  setStatus(id, s) {
    const k = this.cards[id];
    if (!k) return;
    k.status = s;
    k.liftTo = s === 'rodando' ? 0.32 : 0;
    if (s === 'rodando') this.actor = id;
    this.dirty.add(id);
  }

  setBar(id, m, v) {
    const k = this.cards[id];
    if (!k) return;
    k.bars[m] = v;
    this.dirty.add(id);
  }

  statsChanged() { this.markAll(); }

  pulse(id) {
    const k = this.cards[id];
    if (k) k.pulseUntil = this.s.elapsed + 1.4;
    this.actor = id;
  }

  reset() {
    for (const p of this.packets) this.disposePacket(p);
    this.packets = [];
    for (const id in this.edges) this.edges[id].hot = 0;
  }

  launch(edgeId, o) {
    const e = this.edges[edgeId];
    if (!e || !e.curve) return;
    const color = new THREE.Color(this.c.role[o.role] || this.c.gold);
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.085, 16, 12), new THREE.MeshBasicMaterial({ color, toneMapped: false }));
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({
      map: this.glowTex, color: this.c.gold, transparent: true, opacity: 0.9,
      blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false
    }));
    halo.scale.setScalar(0.75);
    const trail = [0.42, 0.3, 0.2].map((s, i) => {
      const t = new THREE.Sprite(new THREE.SpriteMaterial({
        map: this.glowTex, color, transparent: true, opacity: 0.55 - i * 0.15,
        blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false
      }));
      t.scale.setScalar(s);
      return t;
    });
    const hit = new THREE.Mesh(new THREE.SphereGeometry(0.38, 8, 6), new THREE.MeshBasicMaterial({ visible: false }));
    hit.userData = { kind: 'edge', id: edgeId };
    this.world.add(core, halo, hit, ...trail);
    e.hot++;
    e.role = o.role;
    e.glow.material.color.copy(color);
    this.packets.push({ edge: e, core, halo, trail, hit, start: this.s.t, dur: o.dur, back: o.back });
    this.actor = e.d.to;
  }

  disposePacket(p) {
    for (const m of [p.core, p.halo, p.hit, ...p.trail]) {
      this.world.remove(m);
      if (m.geometry) m.geometry.dispose();
      m.material.dispose();
    }
    p.edge.hot = Math.max(0, p.edge.hot - 1);
  }

  /* ---------- frame ---------- */
  frame(dt, t, elapsed) {
    if (!this.w) this.resize();
    const k1 = 1 - Math.exp(-dt * 2.4);      // camera
    const k2 = 1 - Math.exp(-dt * 6);        // fades and lifts

    // packets
    let newest = null;
    this.packets = this.packets.filter((p) => {
      const q = (t - p.start) / p.dur;
      if (q >= 1 || q < 0) { this.disposePacket(p); return false; }
      const at = (x) => p.edge.curve.getPointAt(Math.max(0, Math.min(1, p.back ? 1 - ease(x) : ease(x))));
      const pos = at(q);
      p.core.position.copy(pos);
      p.halo.position.copy(pos);
      p.hit.position.copy(pos);
      p.halo.material.opacity = 0.65 + 0.3 * Math.sin(elapsed * 14);
      p.trail.forEach((s, i) => s.position.copy(at(q - 0.035 * (i + 1))));
      newest = p;
      return true;
    });
    if (newest) {
      this.packetLight.position.copy(newest.core.position);
      this.packetLight.intensity += (3.2 - this.packetLight.intensity) * k2;
    } else {
      this.packetLight.intensity += (0 - this.packetLight.intensity) * k2;
    }

    // hover via raycast (mouse only, nothing selected)
    if (this.pointerIn && !this.s.selection) {
      const hit = this.pick();
      const key = hit ? hit.kind + ':' + hit.id : null;
      if (key !== this.hoverKey) {
        this.hoverKey = key;
        this.renderer.domElement.style.cursor = hit ? 'pointer' : '';
        this.s.hover(hit ? hit.kind : null, hit ? hit.id : null);
      }
    } else if (!this.pointerIn && this.hoverKey && !this.s.selection) {
      this.hoverKey = null;
    }

    // camera rig
    this.parallax.lerp(this.pointerIn ? this.pointer : new THREE.Vector2(0, 0), k1);
    const focus = this.focusNode || (this.narrow ? this.actor : null);
    let target, dist, elev, az;
    if (focus && this.cards[focus]) {
      const kf = this.cards[focus];
      target = kf.group.position.clone();
      const fov = THREE.MathUtils.degToRad(this.camera.fov / 2);
      const want = (CARD_W * kf.group.scale.x) / (this.narrow ? 0.78 : 0.42);
      dist = want / 2 / (Math.tan(fov) * this.camera.aspect);
      elev = this.narrow ? 0.06 : 0.16;
      az = Math.atan2(target.x, Math.max(1, target.z + 6)) * 0.35;
    } else {
      // wide: the ring sits right of centre so the title keeps the left
      target = new THREE.Vector3(0, this.narrow ? 0 : 0.6, 0);
      dist = this.fitDist || 15;
      elev = this.narrow ? 0.05 : 0.5;
      az = 0;
    }
    az += Math.sin(elapsed * 0.09) * (this.narrow ? 0.05 : 0.12) + this.parallax.x * 0.14;
    elev += Math.sin(elapsed * 0.065) * 0.03 - this.parallax.y * 0.07;
    const pos = new THREE.Vector3(
      target.x + Math.sin(az) * Math.cos(elev) * dist,
      target.y + Math.sin(elev) * dist,
      target.z + Math.cos(az) * Math.cos(elev) * dist
    );
    if (this.snap) { this.camTarget.copy(target); this.camPos.copy(pos); this.snap = false; }
    this.camTarget.lerp(target, k1);
    this.camPos.lerp(pos, k1);
    this.camera.position.copy(this.camPos);
    this.camera.lookAt(this.camTarget);
    // frame the ring off-centre in the overview, centre the focused card
    const offTo = this.focusNode ? { x: this.narrow ? 0 : -0.05, y: 0.03 } : this.offTo;
    this.off.x += (offTo.x - this.off.x) * k1;
    this.off.y += (offTo.y - this.off.y) * k1;
    this.camera.setViewOffset(this.w, this.h, this.off.x * this.w, this.off.y * this.h, this.w, this.h);

    // cards: billboard (yaw only), lift, glow, dim
    const sel = this.s.selection;
    const toCam = new THREE.Vector3();
    const spin = Math.floor(elapsed * 6) % 4;
    const spinChanged = spin !== this.spinFrame;
    this.spinFrame = spin;
    for (const id in this.cards) {
      const k = this.cards[id];
      const focused = this.focusNode === id;
      k.dimTo = sel && !focused ? 0.28 : 1;
      k.dim += (k.dimTo - k.dim) * k2;
      k.lift += ((focused ? 0.45 : k.liftTo) - k.lift) * k2;
      // the focused card also comes forward, so nothing in front can hide it
      k.pull = (k.pull || 0) + ((focused ? 1.6 : 0) - (k.pull || 0)) * k2;
      toCam.copy(this.camera.position).sub(k.home).normalize().multiplyScalar(k.pull);
      k.group.position.set(k.home.x + toCam.x, k.home.y + k.lift + toCam.y, k.home.z + toCam.z);
      k.group.lookAt(this.camera.position.x, k.group.position.y, this.camera.position.z);
      k.face.material.opacity = k.dim;
      k.slab.material.opacity = 0.35 + 0.65 * k.dim;
      const pulsing = elapsed < k.pulseUntil;
      const glowTo = focused ? 0.85 : k.status === 'rodando' ? 0.5 + 0.15 * Math.sin(elapsed * 4) :
        (this.hoverId === id || pulsing) ? 0.45 : 0;
      k.glowNow += (glowTo - k.glowNow) * k2;
      k.glow.material.opacity = k.glowNow * k.dim;
      k.shadow.material.opacity = 0.32 * k.dim;
      if (spinChanged && k.status === 'rodando') this.dirty.add(id);
    }
    // edges: heat while a packet runs, dim with selection
    for (const id in this.edges) {
      const e = this.edges[id];
      const chosen = sel && sel.kind === 'edge' && sel.id === id;
      const near = sel && this.focusNode && (e.d.from === this.focusNode || e.d.to === this.focusNode);
      e.dimTo = !sel || chosen || near ? 1 : 0.2;
      e.dim += (e.dimTo - e.dim) * k2;
      const heatTo = e.hot > 0 || chosen || this.hoverEdge === id ? 1 : 0;
      e.heat += (heatTo - e.heat) * k2;
      e.base.material.opacity = 0.55 * e.dim;
      e.glow.material.opacity = 0.9 * e.heat * e.dim;
    }

    // redraw the faces that changed (fonts may arrive late)
    let budget = 4;
    for (const id of this.dirty) {
      if (budget-- <= 0) break;
      this.dirty.delete(id);
      this.draw(id);
    }
    this.renderer.render(this.scene, this.camera);
  }
}

if (loop) loop.registerView(ThreeView);
