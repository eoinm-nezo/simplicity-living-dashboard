/* Simplicity Living — 3D building model viewer.
 *
 * Replaces the old 3 MB OpenStudio geometry exports. Geometry is pre-converted
 * from the Nezo Energy .osm models into compact JSON (assets/models/*.json),
 * so switching buildings is instant rather than reloading an iframe.
 *
 * The render mode is deliberately fixed to Space — every space gets its own
 * colour. There is no theme / boundary / thermal-zone selector.
 */
(function () {
  'use strict';

  var MODELS = {
    waiatarua: {
      label: 'Waiatarua',
      buildings: [
        { id: 'A', name: 'Block A', file: 'assets/models/ascot-a.json' },
        { id: 'B', name: 'Block B', file: 'assets/models/ascot-b.json' },
        { id: 'C', name: 'Block C', file: 'assets/models/ascot-c.json' },
        { id: 'D', name: 'Block D', file: 'assets/models/ascot-d.json' }
      ]
    },
    lakeroad: {
      label: 'Lake Road',
      buildings: [
        { id: '1', name: 'Lake Road', file: 'assets/models/lakeroad.json' }
      ]
    }
  };

  var host, scene, camera, renderer, root, raf = null;
  var cache = {};
  var current = { project: null, building: 0 };
  var orbit = { az: -0.9, el: 0.42, dist: 100, target: null, dragging: false, lx: 0, ly: 0 };

  // Distinct-but-harmonious colour per space index (golden-angle hue walk)
  function spaceColour(i) {
    var h = (i * 137.508) % 360;
    return new THREE.Color('hsl(' + Math.round(h) + ', 55%, 62%)');
  }

  // Newell normal, so we can pick a projection plane for triangulation
  function normalOf(v) {
    var nx = 0, ny = 0, nz = 0, n = v.length / 3;
    for (var i = 0; i < n; i++) {
      var j = (i + 1) % n;
      var ax = v[i * 3], ay = v[i * 3 + 1], az = v[i * 3 + 2];
      var bx = v[j * 3], by = v[j * 3 + 1], bz = v[j * 3 + 2];
      nx += (ay - by) * (az + bz);
      ny += (az - bz) * (ax + bx);
      nz += (ax - bx) * (ay + by);
    }
    return [nx, ny, nz];
  }

  function signedArea(pts, idx) {
    var a = 0;
    for (var i = 0; i < idx.length; i++) {
      var p = pts[idx[i]], q = pts[idx[(i + 1) % idx.length]];
      a += p[0] * q[1] - q[0] * p[1];
    }
    return a / 2;
  }

  function pointInTri(p, a, b, c) {
    var d1 = (p[0] - b[0]) * (a[1] - b[1]) - (a[0] - b[0]) * (p[1] - b[1]);
    var d2 = (p[0] - c[0]) * (b[1] - c[1]) - (b[0] - c[0]) * (p[1] - c[1]);
    var d3 = (p[0] - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (p[1] - a[1]);
    var neg = (d1 < 0) || (d2 < 0) || (d3 < 0);
    var pos = (d1 > 0) || (d2 > 0) || (d3 > 0);
    return !(neg && pos);
  }

  // Tolerances scale with the polygon so they behave the same on a 0.5 m window
  // and a 60 m floor plate.
  function loopScale(pts) {
    var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (var i = 0; i < pts.length; i++) {
      if (pts[i][0] < minX) minX = pts[i][0];
      if (pts[i][0] > maxX) maxX = pts[i][0];
      if (pts[i][1] < minY) minY = pts[i][1];
      if (pts[i][1] > maxY) maxY = pts[i][1];
    }
    return Math.max(maxX - minX, maxY - minY, 1e-9);
  }

  // Remove repeated and collinear vertices before clipping. A repeated vertex
  // gives a zero-length edge, and a collinear one gives a zero-area "ear";
  // both make every candidate ear look degenerate or blocked, which is what
  // used to end the loop early and silently drop the rest of the polygon.
  // Returns indices into pts, so the caller can still address the 3D vertices.
  function cleanLoop(pts) {
    var s = loopScale(pts);
    var distEps = s * 1e-7, areaEps = s * s * 1e-10;
    var idx = [];
    for (var i = 0; i < pts.length; i++) idx.push(i);

    var changed = true;
    while (changed && idx.length >= 3) {
      changed = false;
      for (var k = 0; k < idx.length && idx.length >= 3; k++) {
        var a = pts[idx[(k - 1 + idx.length) % idx.length]];
        var b = pts[idx[k]];
        var c = pts[idx[(k + 1) % idx.length]];
        var dup = Math.abs(a[0] - b[0]) <= distEps && Math.abs(a[1] - b[1]) <= distEps;
        var cross = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
        if (dup || Math.abs(cross) <= areaEps) {
          idx.splice(k, 1);
          changed = true;
          k--;
        }
      }
    }
    return idx;
  }

  // Ear clipping. Written out rather than pulled from three.js because the UMD
  // build does not expose Earcut on the global. It handles the non-convex floor
  // plates (L-shaped units) and notched walls that a fan would get wrong.
  function earClip(pts) {
    var out = [];
    var idx = cleanLoop(pts);
    if (idx.length < 3) return out;
    if (signedArea(pts, idx) < 0) idx.reverse();

    var s = loopScale(pts);
    var areaEps = s * s * 1e-10, distEps = s * 1e-7;
    function same(p, q) {
      return Math.abs(p[0] - q[0]) <= distEps && Math.abs(p[1] - q[1]) <= distEps;
    }

    var guard = 0, limit = idx.length * idx.length + 8;
    while (idx.length > 3 && guard++ < limit) {
      var clipped = false;
      var fallback = -1, fallbackCross = -Infinity;

      for (var k = 0; k < idx.length; k++) {
        var i0 = idx[(k - 1 + idx.length) % idx.length];
        var i1 = idx[k];
        var i2 = idx[(k + 1) % idx.length];
        var a = pts[i0], b = pts[i1], c = pts[i2];
        var cross = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
        if (cross > fallbackCross) { fallbackCross = cross; fallback = k; }
        if (cross <= areaEps) continue;               // reflex
        var clear = true;
        for (var m = 0; m < idx.length; m++) {
          var j = idx[m];
          if (j === i0 || j === i1 || j === i2) continue;
          var p = pts[j];
          // A vertex sitting exactly on one of the ear's corners (a repeat that
          // survived cleaning, or a touching notch) is not inside it.
          if (same(p, a) || same(p, b) || same(p, c)) continue;
          if (pointInTri(p, a, b, c)) { clear = false; break; }
        }
        if (!clear) continue;
        out.push(i0, i1, i2);
        idx.splice(k, 1);
        clipped = true;
        break;
      }

      // No valid ear, which only happens on self-touching or numerically
      // ugly input. Clip the most convex corner anyway: a slightly imperfect
      // triangle is better than a hole in the wall.
      if (!clipped) {
        var f = fallback;
        out.push(idx[(f - 1 + idx.length) % idx.length], idx[f], idx[(f + 1) % idx.length]);
        idx.splice(f, 1);
      }
    }
    if (idx.length === 3) out.push(idx[0], idx[1], idx[2]);
    return out;
  }

  // Project a planar polygon onto its dominant plane, then ear clip
  function triangulate(v) {
    var n = normalOf(v);
    var ax = Math.abs(n[0]), ay = Math.abs(n[1]), az = Math.abs(n[2]);
    var d0, d1;
    if (az >= ax && az >= ay) { d0 = 0; d1 = 1; }        // drop Z
    else if (ay >= ax) { d0 = 0; d1 = 2; }               // drop Y
    else { d0 = 1; d1 = 2; }                             // drop X
    var pts = [];
    for (var i = 0; i < v.length; i += 3) pts.push([v[i + d0], v[i + d1]]);
    return earClip(pts);
  }

  function buildMesh(model) {
    var group = new THREE.Group();

    var pos = [], col = [], linePos = [];
    var glassPos = [], glassLine = [];

    function addPolygon(v, colour, target, lines) {
      var idx = triangulate(v);
      for (var t = 0; t < idx.length; t++) {
        var k = idx[t] * 3;
        target.push(v[k], v[k + 1], v[k + 2]);
        if (col && target === pos) col.push(colour.r, colour.g, colour.b);
      }
      var n = v.length / 3;
      for (var i = 0; i < n; i++) {
        var j = (i + 1) % n;
        lines.push(v[i * 3], v[i * 3 + 1], v[i * 3 + 2],
                   v[j * 3], v[j * 3 + 1], v[j * 3 + 2]);
      }
    }

    var colours = model.spaces.map(function (_, i) { return spaceColour(i); });

    model.surfaces.forEach(function (s) {
      addPolygon(s.v, colours[s.s] || colours[0], pos, linePos);
    });
    (model.subs || []).forEach(function (s) {
      addPolygon(s.v, colours[s.s] || colours[0], glassPos, glassLine);
    });

    // Opaque surfaces, coloured by space
    var g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.computeVertexNormals();
    group.add(new THREE.Mesh(g, new THREE.MeshLambertMaterial({
      vertexColors: true, side: THREE.DoubleSide,
      transparent: true, opacity: 0.9
    })));

    // Edges
    var lg = new THREE.BufferGeometry();
    lg.setAttribute('position', new THREE.Float32BufferAttribute(linePos, 3));
    group.add(new THREE.LineSegments(lg, new THREE.LineBasicMaterial({
      color: 0x2a3238, transparent: true, opacity: 0.28
    })));

    // Glazing sits proud of the wall so it reads clearly
    if (glassPos.length) {
      var gg = new THREE.BufferGeometry();
      gg.setAttribute('position', new THREE.Float32BufferAttribute(glassPos, 3));
      gg.computeVertexNormals();
      group.add(new THREE.Mesh(gg, new THREE.MeshLambertMaterial({
        color: 0x7fd3ea, side: THREE.DoubleSide,
        transparent: true, opacity: 0.55, depthWrite: false
      })));
      var glg = new THREE.BufferGeometry();
      glg.setAttribute('position', new THREE.Float32BufferAttribute(glassLine, 3));
      group.add(new THREE.LineSegments(glg, new THREE.LineBasicMaterial({
        color: 0x2f7f96, transparent: true, opacity: 0.5
      })));
    }

    return group;
  }

  function frame(model) {
    var b = model.bbox;
    var cx = (b[0] + b[3]) / 2, cy = (b[1] + b[4]) / 2, cz = (b[2] + b[5]) / 2;
    var dx = b[3] - b[0], dy = b[4] - b[1], dz = b[5] - b[2];
    orbit.target = new THREE.Vector3(cx, cz, -cy);   // OSM Z-up -> three Y-up

    // Fit the bounding sphere, then pull in — the viewport is wide and these
    // buildings are wide and low, so a strict sphere fit leaves it tiny.
    var radius = 0.5 * Math.sqrt(dx * dx + dy * dy + dz * dz);
    var fit = radius / Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
    orbit.dist = Math.max(fit * 0.62, dz * 2.2);
  }

  function applyCamera() {
    var t = orbit.target || new THREE.Vector3();
    camera.position.set(
      t.x + orbit.dist * Math.cos(orbit.el) * Math.cos(orbit.az),
      t.y + orbit.dist * Math.sin(orbit.el),
      t.z + orbit.dist * Math.cos(orbit.el) * Math.sin(orbit.az)
    );
    camera.lookAt(t);
  }

  function render() { renderer.render(scene, camera); }

  function loop() {
    raf = requestAnimationFrame(loop);
    render();
  }

  function setStatus(model, building) {
    var el = document.getElementById('mv-readout');
    if (!el) return;
    el.innerHTML =
      '<strong>' + building.name + '</strong>' +
      '<span>' + model.spaces.length + ' spaces &middot; ' +
      model.storeys + ' levels</span>';
  }

  function showModel(model, building) {
    try {
      if (root) { scene.remove(root); }
      root = buildMesh(model);
      scene.add(root);
      frame(model);
      applyCamera();
      setStatus(model, building);
      render();
    } catch (err) {
      console.error('Model viewer failed to build geometry:', err);
      var l = document.getElementById('mv-loading');
      if (l) { l.style.display = 'flex'; l.innerHTML = '<span>Model could not be displayed.</span>'; }
    }
  }

  function load(projectKey, buildingIdx) {
    var project = MODELS[projectKey];
    if (!project) return;
    var building = project.buildings[buildingIdx];
    if (!building) return;
    current.project = projectKey;
    current.building = buildingIdx;
    syncButtons();

    var loading = document.getElementById('mv-loading');
    if (cache[building.file]) {
      showModel(cache[building.file], building);
      return;
    }
    if (loading) loading.style.display = 'flex';
    fetch(building.file)
      .then(function (r) { return r.json(); })
      .then(function (data) {
        cache[building.file] = data;
        if (loading) loading.style.display = 'none';
        if (current.project === projectKey && current.building === buildingIdx) {
          showModel(data, building);
        }
      })
      .catch(function () {
        if (loading) loading.innerHTML =
          '<span>Model could not be loaded.</span>';
      });
  }

  function syncButtons() {
    var wrap = document.getElementById('mv-buildings');
    if (!wrap) return;
    var project = MODELS[current.project];
    wrap.innerHTML = '';
    if (!project || project.buildings.length < 2) { wrap.style.display = 'none'; return; }
    wrap.style.display = 'flex';
    project.buildings.forEach(function (b, i) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'mv-bbtn' + (i === current.building ? ' active' : '');
      btn.textContent = b.id;
      btn.title = b.name;
      btn.setAttribute('aria-label', b.name);
      btn.setAttribute('aria-pressed', i === current.building ? 'true' : 'false');
      btn.onclick = function () { load(current.project, i); };
      wrap.appendChild(btn);
    });
  }

  function bindControls(el) {
    function down(e) {
      orbit.dragging = true;
      var p = e.touches ? e.touches[0] : e;
      orbit.lx = p.clientX; orbit.ly = p.clientY;
    }
    function move(e) {
      if (!orbit.dragging) return;
      var p = e.touches ? e.touches[0] : e;
      orbit.az -= (p.clientX - orbit.lx) * 0.007;
      orbit.el += (p.clientY - orbit.ly) * 0.007;
      orbit.el = Math.max(-1.35, Math.min(1.45, orbit.el));
      orbit.lx = p.clientX; orbit.ly = p.clientY;
      applyCamera(); render();
      if (e.cancelable) e.preventDefault();
    }
    function up() { orbit.dragging = false; }

    el.addEventListener('mousedown', down);
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    el.addEventListener('touchstart', down, { passive: true });
    el.addEventListener('touchmove', move, { passive: false });
    el.addEventListener('touchend', up);
    el.addEventListener('wheel', function (e) {
      orbit.dist *= (e.deltaY > 0 ? 1.1 : 0.9);
      orbit.dist = Math.max(8, Math.min(600, orbit.dist));
      applyCamera(); render();
      e.preventDefault();
    }, { passive: false });
  }

  function resize() {
    if (!host || !renderer) return;
    var w = host.clientWidth, h = host.clientHeight;
    if (!w || !h) return;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
    render();
  }

  function init() {
    host = document.getElementById('mv-canvas');
    if (!host || typeof THREE === 'undefined') return;

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf7f8f9);

    camera = new THREE.PerspectiveCamera(45, 1, 0.5, 4000);
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    host.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 0.72));
    var key = new THREE.DirectionalLight(0xffffff, 0.62);
    key.position.set(0.6, 1, 0.45);
    scene.add(key);
    var fill = new THREE.DirectionalLight(0xffffff, 0.28);
    fill.position.set(-0.5, 0.35, -0.7);
    scene.add(fill);

    // OSM models are Z-up; rotate the whole scene rather than every vertex
    scene.rotation.x = -Math.PI / 2;

    bindControls(host);
    window.addEventListener('resize', resize);
    resize();
    loop();

    document.querySelectorAll('[data-mv-project]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        document.querySelectorAll('[data-mv-project]').forEach(function (b) {
          b.classList.remove('active');
        });
        btn.classList.add('active');
        load(btn.getAttribute('data-mv-project'), 0);
      });
    });

    load('waiatarua', 0);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.SimplicityModelViewer = { load: load, resize: resize };
})();
