/* Simplicity Living — Waiatarua 4D construction view.
 *
 * Adapted from the Nezo 4D Optimiser's own renderer (26. 4D / app/js/view_mesh.js).
 * The geometry format, the cell state machine, the slewing tower cranes and the boom
 * pumps are that tool's; what is left behind is the optimiser, the editor, the Gantt
 * and the resource histograms, none of which belong on a public dashboard.
 *
 * The schedule is not solved here. tools/build_4d_plan.mjs runs the planner's own
 * generator and optimiser offline and writes assets/4d/plan.json, so what plays back is
 * the planner's sequence — 1,426 activities with the buildings genuinely overlapping.
 *
 * Deviation from the source, by request: a cell being worked on takes a Simplicity
 * colour rather than the planner's trade palette. Completed work keeps the model's own
 * SketchUp vertex colours and black edges.
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

const ASSET = 'assets/4d/';

/* meta.json carries byte offsets into geom.bin, so the two are only meaningful as a
 * matched pair — a stale cached meta against a fresh binary decodes later groups as
 * garbage geometry rather than failing outright. Bump this whenever either is rebuilt. */
const AV = '?v=2026021';
const asset = (f) => ASSET + f + AV;

// Work in progress, in Simplicity's colours. Keys are the planner's activity groups, so
// the legend still reads by trade.
const WIP = {
  site:          '#8d6e63',
  structure:     '#ff6600',
  facade:        '#2196F3',
  services:      '#f5a623',
  fitout:        '#4CAF50',
  commissioning: '#607D8B'
};
// Held states: formwork standing before the pour, decking down before the slab.
const HOLD = { stackcell: '#eef0f2', deck: '#8fa3b8' };

function label(text, cls = '') {
  const el = document.createElement('div');
  el.className = `label3d ${cls}`;
  el.textContent = text;
  return new CSS2DObject(el);
}

// Cylinder between two points (boom sections).
function strut(a, b, r, mat) {
  const d = new THREE.Vector3().subVectors(b, a);
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 1, 8), mat);
  m.scale.y = d.length();
  m.position.copy(a).addScaledVector(d, 0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
  m.castShadow = true;
  return m;
}

class SiteView {
  constructor(container) {
    this.container = container;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#eef2f4');
    this.scene.fog = new THREE.Fog('#eef2f4', 450, 1200);
    this.camera = new THREE.PerspectiveCamera(32, 1, 1, 4000);
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);
    this.labels = new CSS2DRenderer();
    this.labels.domElement.className = 'labels3d';
    container.appendChild(this.labels.domElement);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.maxPolarAngle = Math.PI * 0.49;
    this.controls.minDistance = 20;
    this.controls.maxDistance = 900;

    this.scene.add(new THREE.HemisphereLight('#ffffff', '#b9b4a6', 1.9));
    const sun = new THREE.DirectionalLight('#fffaf0', 2.0);
    sun.position.set(-160, 220, 120);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, { left: -140, right: 140, top: 140, bottom: -140, near: 10, far: 700 });
    sun.shadow.bias = -0.0004;
    this.scene.add(sun);

    this.cells = new Map();
    this.edgeMat = new THREE.LineBasicMaterial({ color: '#1b1b1b', transparent: true, opacity: 0.55 });
    this.finalMat = new THREE.MeshLambertMaterial({
      vertexColors: true, flatShading: true, side: THREE.DoubleSide,
      polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1
    });
    this.stateMats = new Map();
    new ResizeObserver(() => this.resize()).observe(container);
    this.resize();
    const loop = () => {
      this.controls.update();
      this.renderer.render(this.scene, this.camera);
      this.labels.render(this.scene, this.camera);
      requestAnimationFrame(loop);
    };
    loop();
  }

  resize() {
    const { clientWidth: w, clientHeight: h } = this.container;
    if (!w || !h) return;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.labels.setSize(w, h);
  }

  mat(color) {
    if (!this.stateMats.has(color)) {
      this.stateMats.set(color, new THREE.MeshLambertMaterial({
        color, flatShading: true, side: THREE.DoubleSide,
        polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1
      }));
    }
    return this.stateMats.get(color);
  }

  // ------------------------------------------------------------------ geometry
  async load(onProgress) {
    const [meta, buf] = await Promise.all([
      fetch(asset('meta.json')).then((r) => r.json()),
      fetch(asset('geom.bin')).then((r) => { if (!r.ok) throw new Error(`geometry ${r.status}`); return r.arrayBuffer(); })
    ]);
    this.meta = meta;
    const root = new THREE.Group();
    root.scale.setScalar(meta.scale);
    this.scene.add(root);
    let n = 0;
    const bldgOf = Object.fromEntries(meta.zones.map((z) => [z.id, z.bldg]));
    for (const g of meta.groups) {
      const pos = new Int16Array(buf, g.pos[0], g.pos[1]);
      const col = new Uint8Array(buf, g.col[0], g.col[1]);
      const idx = g.idx[2] === 'uint32' ? new Uint32Array(buf, g.idx[0], g.idx[1]) : new Uint16Array(buf, g.idx[0], g.idx[1]);
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      geo.setAttribute('color', new THREE.BufferAttribute(col, 3, true));
      geo.setIndex(new THREE.BufferAttribute(idx, 1));
      geo.computeBoundingSphere();
      const mesh = new THREE.Mesh(geo, this.finalMat);
      mesh.castShadow = true; mesh.receiveShadow = true;
      const grp = new THREE.Group();
      grp.add(mesh);
      let lines = null;
      if (g.edge[1]) {
        const eg = new THREE.BufferGeometry();
        eg.setAttribute('position', new THREE.BufferAttribute(new Int16Array(buf, g.edge[0], g.edge[1]), 3));
        lines = new THREE.LineSegments(eg, this.edgeMat);
        grp.add(lines);
      }
      root.add(grp);
      const [zone, level, cat] = g.key.split('|');
      this.cells.set(g.key, { key: g.key, zone, bldg: bldgOf[zone], level: +level, cat, grp, mesh, lines, acts: [] });
      if (++n % 50 === 0 && onProgress) onProgress(n / meta.groups.length);
    }
    this.zones = Object.fromEntries(meta.zones.map((z) => [z.id, z]));
    this.buildContext();
    if (onProgress) onProgress(1);
    return meta;
  }

  buildContext() {
    const zs = Object.values(this.zones);
    const lo = new THREE.Vector3(Infinity, Infinity, Infinity);
    const hi = new THREE.Vector3(-Infinity, -Infinity, -Infinity);
    for (const z of zs) { lo.min(new THREE.Vector3(...z.box3[0])); hi.max(new THREE.Vector3(...z.box3[1])); }
    this.bounds = { lo, hi, centre: lo.clone().add(hi).multiplyScalar(0.5) };
    const [cx, cy, cz] = this.meta.centre_su;
    const gnd = this.meta.ground;
    const groundY = gnd ? gnd.z - cz - 0.05 : -cz - 1.6;
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(2400, 2400),
      new THREE.MeshLambertMaterial({ color: '#dcdcd4' }));
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = groundY - 0.05;
    ground.receiveShadow = true;
    this.scene.add(ground);
    if (gnd && gnd.image) {
      // Site plan underlay at its true size (SketchUp x,y -> three x,-z).
      const w = gnd.x[1] - gnd.x[0], d = gnd.y[1] - gnd.y[0];
      const tex = new THREE.TextureLoader().load(asset(gnd.image));
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
      const plane = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshLambertMaterial({ map: tex }));
      plane.rotation.x = -Math.PI / 2;
      plane.position.set((gnd.x[0] + gnd.x[1]) / 2 - cx, groundY, -((gnd.y[0] + gnd.y[1]) / 2 - cy));
      plane.receiveShadow = true;
      this.scene.add(plane);
    }
    this.groundY = groundY;

    this.buildings = {};
    for (const z of zs) {
      const b = (this.buildings[z.bldg] ||= {
        lo: new THREE.Vector3(Infinity, Infinity, Infinity),
        hi: new THREE.Vector3(-Infinity, -Infinity, -Infinity)
      });
      b.lo.min(new THREE.Vector3(...z.box3[0]));
      b.hi.max(new THREE.Vector3(...z.box3[1]));
    }
    for (const [id, b] of Object.entries(this.buildings)) {
      b.centre = b.lo.clone().add(b.hi).multiplyScalar(0.5);
      b.label = label(`Building ${id}`);
      b.label.position.set(b.lo.x - 2, b.hi.y + 4, b.centre.z);
      this.scene.add(b.label);
    }
    this.setView('site', true);
  }

  // ------------------------------------------------------------------ plan
  setPlan(plan, scenario) {
    this.plan = plan;
    this.acts = plan.activities;
    this.sc = plan[scenario] || plan.simplicity;
    for (const c of this.cells.values()) c.acts = [];
    this.acts.forEach((a, id) => {
      for (const k of a.c || []) { const c = this.cells.get(k); if (c) c.acts.push(id); }
    });
    const start = this.sc.start;
    for (const c of this.cells.values()) {
      c.acts.sort((p, q) => start[p] - start[q] || this.acts[p].d - this.acts[q].d);
    }

    if (!this.cranes) {
      this.cranes = (plan.cranes || []).map((c) => this.makeCrane(c));
      this.craneUsers = Object.fromEntries(this.cranes.map((c) =>
        [c.id, this.acts.map((a, i) => (a.cr === c.id ? i : -1)).filter((i) => i >= 0)]));
      this.pumps = [0, 1].map((i) => this.makePump(i));
    }
    this.lastDay = null;
  }

  cellState(c, t) {
    if (!c.acts.length) return { vis: true, mat: this.finalMat };
    const { start } = this.sc;
    const first = c.acts[0];
    if (t < start[first]) return { vis: false };
    let lastDone = null, pending = false;
    for (const id of c.acts) {
      const a = this.acts[id], s = start[id], f = s + a.d;
      if (s <= t && t < f) {
        const col = (a.ph === 'deck' && HOLD.deck) ? HOLD.deck : (WIP[a.g] || WIP.structure);
        return { vis: true, mat: this.mat(col) };
      }
      if (f <= t) lastDone = id; else pending = true;
    }
    if (pending && lastDone != null && HOLD[this.acts[lastDone].ph]) {
      return { vis: true, mat: this.mat(HOLD[this.acts[lastDone].ph]) };
    }
    if (pending && lastDone == null) return { vis: false };
    return { vis: true, mat: this.finalMat };
  }

  setDay(t) {
    this.day = t;
    if (!this.sc) return;
    const { start } = this.sc;
    for (const c of this.cells.values()) {
      const st = this.cellState(c, t);
      c.grp.visible = st.vis;
      if (c.lines) c.lines.visible = true;
      if (st.vis) c.mesh.material = st.mat;
    }
    // Cranes slew to whatever zone they are lifting for today.
    for (const cr of this.cranes) {
      let target = null;
      for (const id of this.craneUsers[cr.id]) {
        const a = this.acts[id];
        if (start[id] <= t && t < start[id] + a.d && a.zi) { target = this.zones[a.zi]; break; }
      }
      if (target) {
        const tx = (target.box3[0][0] + target.box3[1][0]) / 2;
        const tz = (target.box3[0][2] + target.box3[1][2]) / 2;
        cr.angle = Math.atan2(-(tz - cr.pos.z), tx - cr.pos.x);
        cr.trolley = Math.max(6, Math.min(cr.jib - 3, Math.hypot(tx - cr.pos.x, tz - cr.pos.z)));
      }
      cr.slew.rotation.y = cr.angle;
      cr.hook.position.x = cr.trolley;
      cr.hookBlock.position.x = cr.trolley;
    }
    // One pump per pour happening today, parked beside its zone.
    const pours = [];
    for (let id = 0; id < this.acts.length; id++) {
      const a = this.acts[id];
      if (start[id] <= t && t < start[id] + a.d && a.pu && a.zi) pours.push(a);
    }
    this.pumps.forEach((p, i) => {
      const a = pours[i];
      p.group.visible = !!a;
      if (p.world) p.world.visible = !!a;
      if (a) this.placePump(p, this.zones[a.zi], a);
    });
    this.lastDay = t;
  }

  // ------------------------------------------------------------------ equipment
  makeCrane(cfg) {
    const group = new THREE.Group();
    const yellow = new THREE.MeshLambertMaterial({ color: '#e6b422' });
    const h = cfg.height;
    const mast = new THREE.Mesh(new THREE.BoxGeometry(1.8, h, 1.8), yellow);
    mast.position.y = h / 2; mast.castShadow = true;
    const lines = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(1.9, h, 1.9)),
      new THREE.LineBasicMaterial({ color: '#7a5c0a' }));
    lines.position.y = h / 2;
    const slew = new THREE.Group(); slew.position.y = h;
    const jib = new THREE.Mesh(new THREE.BoxGeometry(cfg.jib, 1.3, 1.3), yellow);
    jib.position.x = cfg.jib / 2 - 2;
    const counter = new THREE.Mesh(new THREE.BoxGeometry(14, 1.3, 1.5), yellow); counter.position.x = -9;
    const weight = new THREE.Mesh(new THREE.BoxGeometry(3.5, 2.8, 2.6), new THREE.MeshLambertMaterial({ color: '#666' }));
    weight.position.set(-14, -1, 0);
    const apex = new THREE.Mesh(new THREE.ConeGeometry(1.1, 6, 4), yellow); apex.position.y = 3.5;
    const cab = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.4, 2.4), new THREE.MeshLambertMaterial({ color: '#f5f5f0' }));
    cab.position.set(2, -1.6, 1.8);
    const hookLen = h - 12;
    const hook = new THREE.Mesh(new THREE.BoxGeometry(0.12, hookLen, 0.12), new THREE.MeshBasicMaterial({ color: '#333' }));
    hook.position.y = -hookLen / 2;
    const hookBlock = new THREE.Mesh(new THREE.BoxGeometry(1, 1.2, 1), new THREE.MeshLambertMaterial({ color: '#333' }));
    hookBlock.position.y = -hookLen;
    slew.add(jib, counter, weight, apex, cab, hook, hookBlock);
    for (const m of [jib, counter, weight, cab]) m.castShadow = true;
    group.add(mast, lines, slew);
    const tag = label(cfg.id, 'crane'); tag.position.y = h + 8; group.add(tag);
    group.position.set(cfg.x, this.groundY, cfg.z);
    this.scene.add(group);
    return { ...cfg, group, slew, hook, hookBlock, tag, angle: cfg.angle ?? 0,
             trolley: cfg.jib * 0.6, pos: new THREE.Vector3(cfg.x, 0, cfg.z) };
  }

  makePump(i) {
    const group = new THREE.Group();
    const white = new THREE.MeshLambertMaterial({ color: '#f2f2ee' });
    const orange = new THREE.MeshLambertMaterial({ color: '#e8742a' });
    const dark = new THREE.MeshLambertMaterial({ color: '#2b2b2b' });
    const body = new THREE.Mesh(new THREE.BoxGeometry(10, 1.6, 2.5), orange); body.position.set(0, 1.9, 0);
    const cab = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.2, 2.5), white); cab.position.set(5.4, 2.2, 0);
    const chassis = new THREE.Mesh(new THREE.BoxGeometry(12, 0.5, 2.3), dark); chassis.position.y = 0.9;
    for (const m of [body, cab]) m.castShadow = true;
    const hopper = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.2, 2), dark); hopper.position.set(-5.6, 1.6, 0);
    const outr = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 8), orange); outr.position.set(2.5, 0.5, 0);
    const outr2 = outr.clone(); outr2.position.x = -3;
    const turret = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.9, 1.2, 12), orange); turret.position.set(2.2, 3.3, 0);
    group.add(body, cab, chassis, hopper, outr, outr2, turret);
    const tag = label(`Pump ${i + 1}`, 'crane'); group.add(tag);
    group.visible = false;
    this.scene.add(group);
    return { group, tag, orange };
  }

  // World height of a floor level in a building's own frame.
  floorY(bldg, lvl) {
    const floors = this.meta.floors[bldg];
    const zOff = this.meta.zOffset?.[bldg] ?? 0;
    return floors[Math.max(0, Math.min(lvl, floors.length - 1))] + zOff - this.meta.centre_su[2];
  }

  placePump(p, zone, act) {
    if (!zone) return;
    const cz = (zone.box3[0][2] + zone.box3[1][2]) / 2;
    const cx = (zone.box3[0][0] + zone.box3[1][0]) / 2;
    const side = this.plan.pumpSide?.[zone.bldg] ?? -1;
    const onC = side > 0;
    const px = onC ? zone.box3[1][0] + 7 : zone.box3[0][0] - 9;
    p.group.position.set(px, this.groundY, cz);
    p.group.rotation.y = Math.PI / 2;
    const key = `${zone.id}|${act.pl}`;
    if (p.key === key) return;
    p.key = key;
    // Boom in world coords: turret -> knuckle -> over the pour, hose down to the deck.
    if (!p.world) { p.world = new THREE.Group(); this.scene.add(p.world); }
    p.world.visible = true;
    while (p.world.children.length) p.world.remove(p.world.children[0]);
    const deckY = this.floorY(zone.bldg, act.pl ?? 1) + 0.2;
    const base = new THREE.Vector3(px, this.groundY + 3.9, cz);
    const tip = new THREE.Vector3(cx + (onC ? 3 : -3), deckY + 4, cz);
    const knuckle = new THREE.Vector3(px + (tip.x - px) * 0.4, Math.max(deckY + 11, this.groundY + 18), cz);
    p.world.add(
      strut(base, knuckle, 0.35, p.orange),
      strut(knuckle, tip, 0.28, p.orange),
      strut(tip, new THREE.Vector3(tip.x, deckY, tip.z), 0.12, new THREE.MeshLambertMaterial({ color: '#222' })));
    p.tag.position.set(0, knuckle.y - this.groundY + 3, 0);
  }

  setView(v, instant = false) {
    if (!this.bounds) return;
    const [dx, dz] = this.plan?.cameraDir || [-0.85, 0.8];
    // The planner's own framing assumed its wide desktop viewport. This panel is
    // narrower and shorter, so pull back by whatever the tighter of the two field-of-view
    // axes actually needs, rather than by a fixed factor.
    const vFov = THREE.MathUtils.degToRad(this.camera.fov);
    const hFov = 2 * Math.atan(Math.tan(vFov / 2) * (this.camera.aspect || 1.6));
    const frame = (lo, hi, k) => {
      const ctr = lo.clone().add(hi).multiplyScalar(0.5);
      const S = Math.max(hi.x - lo.x, hi.z - lo.z, (hi.y - lo.y) * 1.6, 40);
      const need = Math.max((S / 2) / Math.sin(vFov / 2), (S / 2) / Math.sin(hFov / 2));
      const len = Math.hypot(dx, 0.5, dz);
      const g = (need * k) / len;
      return { pos: [ctr.x + dx * g, ctr.y + 0.5 * g, ctr.z + dz * g],
               target: [ctr.x, ctr.y - 0.15 * (hi.y - lo.y), ctr.z] };
    };
    const b = this.buildings?.[v];
    const { pos, target } = b ? frame(b.lo, b.hi, 0.95) : frame(this.bounds.lo, this.bounds.hi, 0.78);
    if (instant) { this.camera.position.set(...pos); this.controls.target.set(...target); return; }
    const p0 = this.camera.position.clone(), t0 = this.controls.target.clone();
    const p1 = new THREE.Vector3(...pos), t1 = new THREE.Vector3(...target);
    const ts = performance.now();
    const step = () => {
      const k = Math.min(1, (performance.now() - ts) / 700), e = k * k * (3 - 2 * k);
      this.camera.position.lerpVectors(p0, p1, e);
      this.controls.target.lerpVectors(t0, t1, e);
      if (k < 1) requestAnimationFrame(step);
    };
    step();
  }
}

// ------------------------------------------------------------------ public API
let view = null, plan = null, scenario = 'simplicity';

window.Simplicity4D = {
  WIP,
  init(container) { if (!view) view = new SiteView(container); return true; },
  async load(onProgress) {
    const [, p] = await Promise.all([
      view.load(onProgress),
      fetch(asset('plan.json')).then((r) => r.json())
    ]);
    plan = p;
    view.setPlan(plan, scenario);
    view.setDay(0);
    return plan;
  },
  plan() { return plan; },
  isLoaded() { return !!plan; },
  setScenario(s) {
    scenario = (s === 'baseline') ? 'baseline' : 'simplicity';
    if (plan) { view.setPlan(plan, scenario); view.setDay(view.day || 0); }
  },
  setDay(d) { if (plan) view.setDay(d); },
  view(v) { if (view) view.setView(v); },
  resize() { if (view) view.resize(); },
  debug() {
    if (!view) return null;
    const c = view.camera, t = view.controls.target;
    let vis = 0, hid = 0;
    const b = new THREE.Box3();
    for (const cell of view.cells.values()) {
      if (cell.grp.visible) { vis++; b.expandByObject(cell.grp); } else hid++;
    }
    return {
      cam: c.position.toArray().map((v) => +v.toFixed(1)),
      target: t.toArray().map((v) => +v.toFixed(1)),
      dist: +c.position.distanceTo(t).toFixed(1),
      near: c.near, far: c.far, fov: c.fov, aspect: +c.aspect.toFixed(2),
      groundY: +view.groundY.toFixed(2),
      visibleCells: vis, hiddenCells: hid,
      sample: (() => {
        const cell = view.cells.get('A1|0|externals') || view.cells.values().next().value;
        const g = cell.mesh.geometry;
        if (!g.boundingBox) g.computeBoundingBox();
        const ws = new THREE.Vector3();
        cell.mesh.getWorldScale(ws);
        const wb = new THREE.Box3().setFromObject(cell.mesh);
        return {
          key: cell.key,
          localBox: [g.boundingBox.min.toArray().map(Math.round), g.boundingBox.max.toArray().map(Math.round)],
          worldScale: ws.toArray(),
          worldBox: [wb.min.toArray().map((v) => +v.toFixed(1)), wb.max.toArray().map((v) => +v.toFixed(1))],
          posCount: g.attributes.position.count,
          hasLines: !!cell.lines,
          lineCount: cell.lines ? cell.lines.geometry.attributes.position.count : 0
        };
      })(),
      visibleBox: b.isEmpty() ? null : [b.min.toArray().map((v) => +v.toFixed(1)), b.max.toArray().map((v) => +v.toFixed(1))],
      bounds: [view.bounds.lo.toArray().map((v) => +v.toFixed(1)), view.bounds.hi.toArray().map((v) => +v.toFixed(1))]
    };
  }
};
window.dispatchEvent(new Event('simplicity4d-ready'));
