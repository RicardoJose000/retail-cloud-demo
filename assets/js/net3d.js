// 3D network of locations around the cloud core.
// Used by the landing hero and by the Overview page of the portal.
import * as THREE from 'three';

export const DEFAULT_NODES = [
  { id: 'WH-NJ',    label: 'Newark DC',        kind: 'warehouse', angle: 200 },
  { id: 'ST-SOHO',  label: 'SoHo - Square',    kind: 'store-pos', angle: 270 },
  { id: 'ST-BKLYN', label: 'Brooklyn - Clover', kind: 'store-pos', angle: 330 },
  { id: 'ST-JC',    label: 'Jersey City',      kind: 'store',     angle: 30 },
  { id: 'WEB',      label: 'Web + Apps',       kind: 'channel',   angle: 95 },
  { id: 'DRV',      label: 'Driver App',       kind: 'driver',    angle: 145 },
];

const COLORS = { sale: 0x2dd4bf, reserve: 0xf59e0b, transfer: 0x60a5fa, sync: 0xe2e8f0 };

export function mountNetwork(el, opts = {}) {
  const nodesDef = opts.nodes || DEFAULT_NODES;
  const dark = opts.dark !== false;
  const radius = opts.radius || 6.2;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  el.appendChild(renderer.domElement);
  renderer.domElement.style.display = 'block';

  const labelLayer = document.createElement('div');
  labelLayer.className = 'net-labels';
  el.appendChild(labelLayer);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 200);
  const camBase = new THREE.Vector3(0, opts.camY || 8.5, opts.camZ || 17);
  camera.position.copy(camBase);

  scene.add(new THREE.AmbientLight(0xffffff, dark ? 0.5 : 0.9));
  const key = new THREE.DirectionalLight(0xffffff, dark ? 1.2 : 1.0);
  key.position.set(6, 14, 9);
  scene.add(key);
  const glow = new THREE.PointLight(0x2dd4bf, dark ? 40 : 18, 24);
  glow.position.set(0, 2.2, 0);
  scene.add(glow);

  const root = new THREE.Group();
  scene.add(root);

  const lineCol = dark ? 0x7dd3c8 : 0x0d9488;
  const faint = dark ? 0x334155 : 0xcbd5e1;

  // floor rings
  for (let r = 2; r <= 9; r += 1.75) {
    const g = new THREE.RingGeometry(r, r + 0.012, 128);
    const m = new THREE.MeshBasicMaterial({ color: faint, transparent: true, opacity: dark ? 0.55 : 0.8, side: THREE.DoubleSide });
    const ring = new THREE.Mesh(g, m);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = -0.01;
    root.add(ring);
  }
  // radial ticks
  const tickGeo = new THREE.BufferGeometry();
  const ticks = [];
  for (let a = 0; a < 360; a += 15) {
    const t = (a * Math.PI) / 180;
    ticks.push(Math.cos(t) * 8.6, 0, Math.sin(t) * 8.6, Math.cos(t) * 9.1, 0, Math.sin(t) * 9.1);
  }
  tickGeo.setAttribute('position', new THREE.Float32BufferAttribute(ticks, 3));
  root.add(new THREE.LineSegments(tickGeo, new THREE.LineBasicMaterial({ color: faint, transparent: true, opacity: 0.9 })));

  // core
  const core = new THREE.Group();
  core.position.y = 1.5;
  root.add(core);
  const ico = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1.15, 1),
    new THREE.MeshStandardMaterial({ color: dark ? 0x0b2530 : 0xe6f7f5, metalness: 0.3, roughness: 0.35, emissive: 0x0d9488, emissiveIntensity: dark ? 0.35 : 0.08, flatShading: true })
  );
  core.add(ico);
  const icoEdges = new THREE.LineSegments(new THREE.EdgesGeometry(ico.geometry), new THREE.LineBasicMaterial({ color: 0x5eead4 }));
  core.add(icoEdges);
  const halo1 = new THREE.Mesh(new THREE.TorusGeometry(1.9, 0.012, 8, 128), new THREE.MeshBasicMaterial({ color: 0x5eead4, transparent: true, opacity: 0.7 }));
  halo1.rotation.x = Math.PI / 2.2;
  core.add(halo1);
  const halo2 = new THREE.Mesh(new THREE.TorusGeometry(2.25, 0.008, 8, 128), new THREE.MeshBasicMaterial({ color: 0x93c5fd, transparent: true, opacity: 0.45 }));
  halo2.rotation.x = Math.PI / 1.7;
  halo2.rotation.y = 0.5;
  core.add(halo2);
  const corePillar = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.5, 12), new THREE.MeshBasicMaterial({ color: 0x5eead4, transparent: true, opacity: 0.5 }));
  corePillar.position.y = -0.75;
  core.add(corePillar);

  // nodes
  const nodes = {};
  const bodyMat = new THREE.MeshStandardMaterial({ color: dark ? 0x0f1d2e : 0xffffff, metalness: 0.15, roughness: 0.55 });
  const edgeMat = new THREE.LineBasicMaterial({ color: lineCol });
  const accentMat = new THREE.MeshStandardMaterial({ color: 0x2dd4bf, emissive: 0x2dd4bf, emissiveIntensity: 0.6 });

  nodesDef.forEach((n) => {
    const a = (n.angle * Math.PI) / 180;
    const g = new THREE.Group();
    g.position.set(Math.cos(a) * radius, 0, Math.sin(a) * radius);
    let w = 1.1, h = 0.7, d = 0.9;
    if (n.kind === 'warehouse') { w = 1.9; h = 0.95; d = 1.3; }
    if (n.kind === 'channel') { w = 0.9; h = 1.25; d = 0.12; }
    if (n.kind === 'driver') { w = 1.2; h = 0.55; d = 0.7; }
    const box = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), bodyMat);
    box.position.y = h / 2;
    g.add(box);
    const e = new THREE.LineSegments(new THREE.EdgesGeometry(box.geometry), edgeMat);
    e.position.copy(box.position);
    g.add(e);
    if (n.kind === 'warehouse') {
      const roof = new THREE.Mesh(new THREE.BoxGeometry(w * 0.92, 0.06, d * 0.92), accentMat);
      roof.position.y = h + 0.03;
      g.add(roof);
    }
    if (n.kind === 'store-pos') {
      const pos = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.22, 0.26), accentMat);
      pos.position.set(w / 2 + 0.3, 0.11, 0);
      g.add(pos);
    }
    if (n.kind === 'channel') {
      const scr = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.82, h * 0.82), new THREE.MeshBasicMaterial({ color: 0x2dd4bf, transparent: true, opacity: 0.35 }));
      scr.position.set(0, h / 2, d / 2 + 0.005);
      g.add(scr);
    }
    if (n.kind === 'driver') {
      [-0.35, 0.35].forEach((x) => {
        const wh = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.1, 18), accentMat);
        wh.rotation.x = Math.PI / 2;
        wh.position.set(x, 0.05, d / 2 + 0.02);
        g.add(wh);
      });
    }
    g.lookAt(0, 0, 0);
    root.add(g);

    // connection curve
    const start = new THREE.Vector3(g.position.x, 0.25, g.position.z);
    const end = new THREE.Vector3(0, 1.5, 0);
    const mid = start.clone().lerp(end, 0.5);
    mid.y += 1.6;
    const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
    const pts = curve.getPoints(48);
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: lineCol, transparent: true, opacity: dark ? 0.35 : 0.45 }));
    root.add(line);

    const lab = document.createElement('div');
    lab.className = 'net-label';
    lab.innerHTML = `<i></i>${n.label}`;
    labelLayer.appendChild(lab);

    nodes[n.id] = { def: n, group: g, curve, label: lab, line, top: h + 0.5 };
  });

  // packets
  const packets = [];
  const pGeo = new THREE.SphereGeometry(0.085, 12, 12);
  function spawn(nodeId, type = 'sale', inbound = true) {
    const n = nodes[nodeId];
    if (!n) return;
    const m = new THREE.Mesh(pGeo, new THREE.MeshBasicMaterial({ color: COLORS[type] || COLORS.sync }));
    root.add(m);
    packets.push({ mesh: m, curve: n.curve, t: 0, speed: 0.45 + Math.random() * 0.25, inbound });
    n.line.material.opacity = 0.95;
    setTimeout(() => { n.line.material.opacity = dark ? 0.35 : 0.45; }, 600);
  }

  const ids = Object.keys(nodes);
  let auto = opts.autoPackets !== false;
  let lastSpawn = 0;

  // pointer parallax
  const mouse = { x: 0, y: 0 };
  function onMove(e) {
    const r = el.getBoundingClientRect();
    mouse.x = ((e.clientX - r.left) / r.width - 0.5) * 2;
    mouse.y = ((e.clientY - r.top) / r.height - 0.5) * 2;
  }
  window.addEventListener('pointermove', onMove, { passive: true });

  function resize() {
    const w = el.clientWidth || 1, h = el.clientHeight || 1;
    renderer.setSize(w, h, false);
    renderer.domElement.style.width = w + 'px';
    renderer.domElement.style.height = h + 'px';
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  const ro = new ResizeObserver(resize);
  ro.observe(el);
  resize();

  const clock = new THREE.Clock();
  const tmp = new THREE.Vector3();
  let raf, visible = true;
  const io = new IntersectionObserver((en) => { visible = en[0].isIntersecting; });
  io.observe(el);

  function tick() {
    raf = requestAnimationFrame(tick);
    if (!visible) return;
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;
    const sp = reduce ? 0.25 : 1;

    root.rotation.y += dt * 0.06 * sp;
    ico.rotation.y += dt * 0.35 * sp;
    ico.rotation.x += dt * 0.12 * sp;
    icoEdges.rotation.copy(ico.rotation);
    halo1.rotation.z += dt * 0.4 * sp;
    halo2.rotation.z -= dt * 0.25 * sp;
    core.position.y = 1.5 + Math.sin(t * 1.2) * 0.08;

    camera.position.x += (camBase.x + mouse.x * 1.6 - camera.position.x) * 0.04;
    camera.position.y += (camBase.y - mouse.y * 0.9 - camera.position.y) * 0.04;
    camera.lookAt(0, 0.9, 0);

    if (auto && t - lastSpawn > 0.55) {
      lastSpawn = t;
      const id = ids[Math.floor(Math.random() * ids.length)];
      const r = Math.random();
      spawn(id, r < 0.55 ? 'sale' : r < 0.8 ? 'reserve' : 'transfer', Math.random() < 0.7);
    }

    for (let i = packets.length - 1; i >= 0; i--) {
      const p = packets[i];
      p.t += dt * p.speed * sp * 1.4;
      if (p.t >= 1) { root.remove(p.mesh); p.mesh.material.dispose(); packets.splice(i, 1); continue; }
      p.curve.getPoint(p.inbound ? p.t : 1 - p.t, tmp);
      p.mesh.position.copy(tmp);
    }

    renderer.render(scene, camera);

    // labels
    const w = el.clientWidth, h = el.clientHeight;
    ids.forEach((id) => {
      const n = nodes[id];
      tmp.set(0, n.top, 0);
      n.group.localToWorld(tmp);
      tmp.project(camera);
      const x = (tmp.x * 0.5 + 0.5) * w, y = (-tmp.y * 0.5 + 0.5) * h;
      n.label.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -100%)`;
      n.label.style.opacity = tmp.z < 1 ? 1 : 0;
    });
  }
  tick();

  return {
    pulse: spawn,
    setAuto(v) { auto = v; },
    destroy() {
      cancelAnimationFrame(raf);
      ro.disconnect(); io.disconnect();
      window.removeEventListener('pointermove', onMove);
      renderer.dispose();
      el.innerHTML = '';
    },
  };
}
