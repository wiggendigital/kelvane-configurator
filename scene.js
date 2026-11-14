// Kelvane 01 configurator: the 3D scene.
// The bottle is built in code from lathe profiles, with canvas-drawn textures and a studio
// environment rendered at start-up. There are no model or image files to download.
// The scene only draws while something is moving, then goes quiet.

const TAU = Math.PI * 2;

/* ---------- Profile helpers (points are [radius, height]) ---------- */

/** Sample a cubic bezier, excluding the start point. */
function bezier(p0, c0, c1, p1, n = 18) {
  const out = [];
  for (let i = 1; i <= n; i++) {
    const t = i / n, u = 1 - t;
    out.push([
      u * u * u * p0[0] + 3 * u * u * t * c0[0] + 3 * u * t * t * c1[0] + t * t * t * p1[0],
      u * u * u * p0[1] + 3 * u * u * t * c0[1] + 3 * u * t * t * c1[1] + t * t * t * p1[1],
    ]);
  }
  return out;
}

/** Arc used to round a hard profile corner. */
function fillet(cx, cy, r, a0, a1, n = 6) {
  const out = [];
  for (let i = 0; i <= n; i++) {
    const a = a0 + (a1 - a0) * (i / n);
    out.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  return out;
}

/** Drop points that repeat their predecessor. */
function clean(pts) {
  return pts.filter((p, i) => i === 0 || Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]) > 1e-5);
}

/** Offset a profile to its left (towards the inside of a bottom-to-top outer wall). */
function offsetProfile(pts, d) {
  const normal = (a, b) => {
    const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
    return [-dy / l, dx / l];
  };
  return pts.map((p, i) => {
    const n0 = i > 0 ? normal(pts[i - 1], p) : null;
    const n1 = i < pts.length - 1 ? normal(p, pts[i + 1]) : null;
    let nx, ny;
    if (!n0) [nx, ny] = n1;
    else if (!n1) [nx, ny] = n0;
    else {
      nx = n0[0] + n1[0]; ny = n0[1] + n1[1];
      const l = Math.hypot(nx, ny) || 1;
      nx /= l; ny /= l;
      const miter = Math.max(0.6, nx * n0[0] + ny * n0[1]);
      nx /= miter; ny /= miter;
    }
    return [Math.max(0, p[0] + nx * d), p[1] + ny * d];
  });
}

/* ---------- Dimensions (one unit is 100 mm) ---------- */

const H0 = 2.767;            // height of the 600 ml bottle, to the top of the carry loop
export const TALL = 0.75;    // the 900 ml body is this much longer
const STRETCH_FROM = 1.0;    // everything above this height moves up with the longer body
const LID_LIFT = 0.62;
const BOOT_DROP = 0.55;
const BOOT_H = 0.08;         // how far the boot raises the steel base off the table
const FRONT = -0.18;         // resting turn: wordmark towards the viewer

// Texture tiling: twelve tiles around the body, square texels on its wall.
const U_TILES = 12;
const V_SCALE = 1 / 0.22;

/* ---------- Profiles ---------- */

const SHELL = clean([
  [0, 0.08], [0.385, 0.08],
  ...fillet(0.385, 0.115, 0.035, -Math.PI / 2, 0),
  [0.42, 0.335], [0.42, 1.9],
  ...bezier([0.42, 1.9], [0.42, 2.1], [0.316, 2.08], [0.316, 2.235]),
  [0.316, 2.25],
]);

const VESSEL = clean([
  [0, 0.19], [0.2, 0.198], [0.3, 0.225], [0.352, 0.29], [0.375, 0.38], [0.375, 1.86],
  ...bezier([0.375, 1.86], [0.375, 2.05], [0.286, 2.04], [0.286, 2.2], 16),
  [0.286, 2.262], [0.286, 2.455],
]);
const LINING = offsetProfile(VESSEL, 0.029);

// The exposed neck carries three rolled thread ridges.
const NECK = [[0.286, 2.262]];
for (let k = 0; k < 3; k++) {
  const y = 2.33 + k * 0.042;
  NECK.push([0.286, y], [0.2955, y + 0.007], [0.2955, y + 0.017], [0.286, y + 0.024]);
}
NECK.push([0.286, 2.455]);
const RIM = [[0.286, 2.455], [0.2835, 2.4655], [0.2715, 2.47], [0.2595, 2.4655], [0.257, 2.455]];

const COLLAR = clean([
  [0.286, 2.25], [0.3185, 2.25], [0.3185, 2.288],
  ...fillet(0.3105, 2.288, 0.008, 0, Math.PI / 2, 4),
  [0.286, 2.296], [0.286, 2.25],
]);

const BOOT = clean([
  [0, 0], [0.397, 0],
  ...fillet(0.397, 0.04, 0.04, -Math.PI / 2, 0),
  [0.437, 0.325],
  ...fillet(0.427, 0.325, 0.01, 0, Math.PI / 2, 4),
  ...offsetProfile(SHELL.filter((p) => p[1] <= 0.3351), -0.0008).reverse(),
]);

// Two lids share the steel band and the gasket underneath.
const LID_LOOP = clean([
  [0.292, 2.335], [0.326, 2.335], [0.332, 2.342], [0.332, 2.57],
  ...fillet(0.302, 2.57, 0.03, 0, Math.PI / 2, 8),
  [0.16, 2.606], [0, 2.61],
]);
const LID_FLAT = clean([
  [0.292, 2.335], [0.326, 2.335], [0.332, 2.342], [0.332, 2.474],
  ...fillet(0.312, 2.474, 0.02, 0, Math.PI / 2, 8),
  [0.262, 2.494],
  ...bezier([0.262, 2.494], [0.25, 2.494], [0.25, 2.476], [0.236, 2.474], 8),
  [0, 2.474],
]);
const LID_BAND = [[0.292, 2.306], [0.329, 2.306], [0.334, 2.312], [0.334, 2.33], [0.329, 2.336], [0.292, 2.336]];
const LID_UNDER = [[0, 2.35], [0.25, 2.35], [0.25, 2.34], [0.292, 2.34]];
const LID_TOP = { loop: 2.767, flat: 2.494 };

/** Hand the main thread back between slices of set-up work, so no single task runs long. */
const breathe = () => new Promise((resolve) => setTimeout(resolve, 0));

/* ---------- Textures ---------- */

function canvasTexture(THREE, w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

/** Tileable value noise in 0..1: white noise, box-blurred with wrap-around. */
function noiseField(n, passes) {
  let a = new Float32Array(n * n);
  for (let i = 0; i < a.length; i++) a[i] = Math.random();
  for (let p = 0; p < passes; p++) {
    const b = new Float32Array(n * n);
    for (let y = 0; y < n; y++) {
      const y0 = ((y - 1 + n) % n) * n, y1 = y * n, y2 = ((y + 1) % n) * n;
      for (let x = 0; x < n; x++) {
        const x0 = (x - 1 + n) % n, x2 = (x + 1) % n;
        b[y1 + x] = (a[y0 + x0] + a[y0 + x] + a[y0 + x2] + a[y1 + x0] + a[y1 + x] + a[y1 + x2] + a[y2 + x0] + a[y2 + x] + a[y2 + x2]) / 9;
      }
    }
    a = b;
  }
  let lo = Infinity, hi = -Infinity;
  for (const v of a) { if (v < lo) lo = v; if (v > hi) hi = v; }
  for (let i = 0; i < a.length; i++) a[i] = (a[i] - lo) / (hi - lo);
  return a;
}

/** Powder coat: a fine-grained normal map and a matching roughness map. */
async function coatTextures(THREE) {
  const n = 256;
  const fine = noiseField(n, 1);
  await breathe();
  const broad = noiseField(n, 4);
  await breathe();
  const normal = canvasTexture(THREE, n, n, (g) => {
    const img = g.createImageData(n, n);
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        const at = (xx, yy) => fine[((yy + n) % n) * n + ((xx + n) % n)];
        const nx = at(x - 1, y) - at(x + 1, y);
        const ny = at(x, y - 1) - at(x, y + 1);
        const l = Math.hypot(nx, ny, 1);
        const i = (y * n + x) * 4;
        img.data[i] = (nx / l * 0.5 + 0.5) * 255;
        img.data[i + 1] = (ny / l * 0.5 + 0.5) * 255;
        img.data[i + 2] = (1 / l * 0.5 + 0.5) * 255;
        img.data[i + 3] = 255;
      }
    }
    g.putImageData(img, 0, 0);
  });
  await breathe();
  const rough = canvasTexture(THREE, n, n, (g) => {
    const img = g.createImageData(n, n);
    for (let i = 0; i < n * n; i++) {
      const v = (0.86 + 0.08 * fine[i] + 0.06 * broad[i]) * 255;
      img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v;
      img.data[i * 4 + 3] = 255;
    }
    g.putImageData(img, 0, 0);
  });
  return { normal, rough };
}

/** Brushed steel: circumferential streaks of several widths. */
function brushedTexture(THREE) {
  return canvasTexture(THREE, 32, 1024, (g, w, h) => {
    g.fillStyle = 'rgb(190,190,190)';
    g.fillRect(0, 0, w, h);
    for (let y = 0; y < h;) {
      const band = Math.random() < 0.7 ? 1 : 1 + Math.floor(Math.random() * 5);
      const v = 150 + Math.random() * 100;
      g.fillStyle = `rgb(${v},${v},${v})`;
      g.fillRect(0, y, w, band);
      y += band;
    }
  });
}

/* ---------- Scene ---------- */

export async function createScene(THREE, canvas, { reducedMotion = false, maxDpr = 2 } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setClearColor(0x000000, 0);
  // Khronos PBR Neutral keeps the finish colours true to their swatches.
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 0.92;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.VSMShadowMap;

  const scene = new THREE.Scene();
  const FOV = 24;
  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 200);
  const maxAniso = renderer.capabilities.getMaxAnisotropy();

  /* ----- Studio environment: a pale room with softboxes and two dark flags ----- */
  {
    const env = new THREE.Scene();
    env.add(new THREE.Mesh(
      new THREE.BoxGeometry(40, 24, 40),
      new THREE.MeshBasicMaterial({ color: 0x1d1f23, side: THREE.BackSide })
    ));
    const panel = (w, h, pos, look, intensity, tint = 0xffffff) => {
      const m = new THREE.Mesh(
        new THREE.PlaneGeometry(w, h),
        new THREE.MeshBasicMaterial({ color: new THREE.Color(tint).multiplyScalar(intensity), side: THREE.DoubleSide })
      );
      m.position.set(...pos);
      m.lookAt(...look);
      env.add(m);
    };
    panel(16, 12, [0, 11.5, 2], [0, 0, 0], 2.1);                 // overhead softbox
    panel(4.5, 16, [-12, 3, 6], [0, 2, 0], 9, 0xfff6ec);         // key strip, camera left
    panel(2, 16, [11, 3, -6], [0, 2, 0], 12, 0xeef4ff);          // rim strip, back right
    panel(1.6, 14, [-9, 3, -10], [0, 2, 0], 8, 0xeef4ff);        // rim strip, back left
    panel(24, 9, [-1, 2.5, 14], [0, 2, 0], 0.8);                 // front fill, wide enough to light the whole front
    panel(30, 30, [0, -6, 0], [0, 0, 0], 0.4, 0xf2efe9);         // pale floor
    panel(3, 16, [14, 3, 4], [0, 2, 0], 0.02);                   // dark flag, right: gives the body an edge
    await breathe();
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(env, 0.035).texture;
    pmrem.dispose();
    env.traverse((o) => { if (o.isMesh) { o.geometry.dispose(); o.material.dispose(); } });
  }

  await breathe();

  /* ----- Lights ----- */
  const key = new THREE.DirectionalLight(0xfff4e6, 1.15);
  key.position.set(-2.4, 9.5, 3.4);
  key.target.position.set(0, 1.4, 0);
  key.castShadow = true;
  key.shadow.mapSize.set(512, 512);
  key.shadow.camera.left = -2.8; key.shadow.camera.right = 2.8;
  key.shadow.camera.top = 4.2; key.shadow.camera.bottom = -2.8;
  key.shadow.camera.near = 1; key.shadow.camera.far = 22;
  key.shadow.bias = -0.0003;
  key.shadow.normalBias = 0.012;
  key.shadow.radius = 14;
  key.shadow.blurSamples = 12;
  scene.add(key, key.target);

  const rim = new THREE.DirectionalLight(0xdbe7ff, 1.4);
  rim.position.set(4, 3, -5);
  scene.add(rim);

  /* ----- Materials ----- */
  const coat = await coatTextures(THREE);
  coat.normal.anisotropy = coat.rough.anisotropy = maxAniso;
  await breathe();
  const brushed = brushedTexture(THREE);
  brushed.anisotropy = maxAniso;
  brushed.repeat.set(1, 0.22);

  const coatSpec = {
    color: 0xa9bcc6, metalness: 0.12, roughness: 0.5,
    clearcoat: 0.22, clearcoatRoughness: 0.5,
    normalMap: coat.normal, normalScale: new THREE.Vector2(0.2, 0.2),
    roughnessMap: coat.rough, dithering: true, side: THREE.DoubleSide,
  };
  const bodyCoatMat = new THREE.MeshPhysicalMaterial(coatSpec);
  const lidCoatMat = new THREE.MeshPhysicalMaterial(coatSpec);
  const brushedSpec = { color: 0xdfe3e6, metalness: 1, roughness: 0.36, roughnessMap: brushed, bumpMap: brushed, bumpScale: 0.25 };
  const bodySteelMat = new THREE.MeshStandardMaterial({ ...brushedSpec, side: THREE.DoubleSide });
  const brushedMat = new THREE.MeshStandardMaterial({ ...brushedSpec, side: THREE.DoubleSide });
  const polishedMat = new THREE.MeshStandardMaterial({ color: 0xe8ebee, metalness: 1, roughness: 0.15, side: THREE.DoubleSide });
  const ceramicMat = new THREE.MeshStandardMaterial({ color: 0xf6f3ec, metalness: 0, roughness: 0.82, envMapIntensity: 0.35, side: THREE.DoubleSide });
  const gasketMat = new THREE.MeshStandardMaterial({ color: 0x121317, metalness: 0, roughness: 0.82, side: THREE.DoubleSide });
  const bootMat = new THREE.MeshStandardMaterial({ color: 0x17181c, metalness: 0, roughness: 0.84, envMapIntensity: 0.8, side: THREE.DoubleSide });

  await breathe();

  /* ----- Geometry ----- */
  const SEG = 128;
  const product = new THREE.Group();   // turns around Y, and sinks by the boot's height when the boot is off
  scene.add(product);
  const body = new THREE.Group();
  const top = new THREE.Group();       // neck, rim and collar: rides up with the longer body
  const bootGroup = new THREE.Group();
  const lid = new THREE.Group();
  product.add(body, top, bootGroup, lid);

  const stretchable = [];              // geometries whose upper part moves with the body length

  /** Revolve a profile, with UVs laid out by arc length so textures keep their scale. */
  function latheGeometry(pts, { stretch = false } = {}) {
    const geo = new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(Math.max(r, 1e-4), y)), SEG, 0, TAU);
    const run = [0];
    for (let j = 1; j < pts.length; j++) run[j] = run[j - 1] + Math.hypot(pts[j][0] - pts[j - 1][0], pts[j][1] - pts[j - 1][1]);
    const uv = geo.attributes.uv, n = pts.length;
    for (let i = 0; i <= SEG; i++) {
      const u = (i / SEG) * U_TILES;
      for (let j = 0; j < n; j++) uv.setXY(i * n + j, u, run[j] * V_SCALE);
    }
    if (stretch) {
      const pos = geo.attributes.position;
      const moved = [];
      for (let k = 0; k < pos.count; k++) if (pos.getY(k) > STRETCH_FROM) moved.push(k);
      stretchable.push({ geo, moved, y: moved.map((k) => pos.getY(k)), v: moved.map((k) => uv.getY(k)) });
    }
    return geo;
  }

  function mesh(geo, mat, { cast = true, receive = false } = {}) {
    const m = new THREE.Mesh(geo, mat);
    m.castShadow = cast; m.receiveShadow = receive;
    return m;
  }
  const revolve = (parent, pts, mat, opts = {}) => {
    const m = mesh(latheGeometry(pts, opts), mat, opts);
    parent.add(m);
    return m;
  };

  // Outer shell, twice over the same geometry: bare steel underneath, powder coat on top.
  // The coat fades out to show the steel when "bare steel" is chosen.
  const shellGeo = latheGeometry(SHELL, { stretch: true });
  const steelShell = mesh(shellGeo, bodySteelMat);
  const coatShell = mesh(shellGeo, bodyCoatMat);
  coatShell.renderOrder = 1;
  body.add(steelShell, coatShell);
  await breathe();

  // What you see through the mouth while the lid is off.
  revolve(body, LINING, ceramicMat, { stretch: true, cast: false });
  revolve(top, NECK, brushedMat);
  revolve(top, RIM, polishedMat);
  revolve(top, COLLAR, polishedMat);
  await breathe();

  // Silicone boot.
  revolve(bootGroup, BOOT, bootMat);
  await breathe();

  // Lids. Both are built; one is shown.
  const lidShells = {
    loop: revolve(lid, LID_LOOP, lidCoatMat),
    flat: revolve(lid, LID_FLAT, lidCoatMat),
  };
  revolve(lid, LID_BAND, polishedMat);
  revolve(lid, LID_UNDER, gasketMat, { cast: false });
  const loopParts = new THREE.Group();
  const loop = mesh(new THREE.TorusGeometry(0.15, 0.019, 20, 96, Math.PI), polishedMat);
  loop.position.y = 2.598;
  loopParts.add(loop);
  for (const sx of [-1, 1]) {
    const foot = mesh(new THREE.CylinderGeometry(0.03, 0.034, 0.016, 32), polishedMat);
    foot.position.set(sx * 0.15, 2.61, 0);
    loopParts.add(foot);
  }
  lid.add(loopParts);
  lidShells.flat.visible = false;

  await breathe();

  /* ----- Printed wordmark and the engraving, both drawn to canvases ----- */
  function decal(canvasW, canvasH, height, y) {
    const tex = canvasTexture(THREE, canvasW, canvasH, () => {});
    tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.anisotropy = maxAniso;
    const arc = (height * canvasW / canvasH) / 0.4206;
    const normal = coat.normal.clone();
    normal.repeat.set(arc / TAU * U_TILES, height * V_SCALE);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x5a6469, metalness: 0, roughness: 0.62,
      alphaMap: tex, transparent: true, depthWrite: false,
      normalMap: normal, normalScale: new THREE.Vector2(0.14, 0.14),
      polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
    });
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.4206, 0.4206, height, 64, 1, true, -arc / 2, arc), mat);
    m.position.y = y;
    m.renderOrder = 2;
    body.add(m);
    return { tex, mat, mesh: m, baseY: y };
  }

  function drawSpaced(tex, word, font, gap, maxWidth) {
    const c = tex.image, g = c.getContext('2d');
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.fillStyle = '#000'; g.fillRect(0, 0, c.width, c.height);
    if (!word) { tex.needsUpdate = true; return; }
    g.fillStyle = '#fff';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = font;
    const chars = [...word];
    let total = gap * (chars.length - 1);
    const widths = chars.map((ch) => { const w = g.measureText(ch).width; total += w; return w; });
    // Long text is narrowed to fit rather than cut off.
    const squeeze = Math.min(1, maxWidth / total);
    g.translate(c.width / 2, c.height / 2 + 3);
    g.scale(squeeze, squeeze);
    let x = -total / 2;
    chars.forEach((ch, i) => { g.fillText(ch, x + widths[i] / 2, 0); x += widths[i] + gap; });
    tex.needsUpdate = true;
  }

  const LOGO_H = 0.4215 * 1.5 / 4;
  const logo = decal(1024, 256, LOGO_H, 0.98);
  const drawLogo = () => drawSpaced(logo.tex, 'KELVANE', '600 92px Geist, "Helvetica Neue", Arial, sans-serif', 44, 960);
  drawLogo();

  // The engraving cuts through the coat to the steel below, so it is lit as metal.
  const engraving = decal(1024, 128, 0.079, 0.775);
  engraving.mat.metalness = 1;
  engraving.mat.roughness = 0.42;
  engraving.mat.color.set(0xe3e6e8);
  engraving.mat.normalMap = null;
  engraving.mat.opacity = 0;
  let engravingText = '';
  const drawEngraving = () => drawSpaced(engraving.tex, engravingText, '500 60px Geist, "Helvetica Neue", Arial, sans-serif', 9, 980);
  if (document.fonts && document.fonts.load) {
    Promise.all([document.fonts.load('600 92px Geist'), document.fonts.load('500 60px Geist')])
      .then(() => { drawLogo(); drawEngraving(); wake(); }).catch(() => {});
  }

  await breathe();

  /* ----- Floor: a cast shadow and a soft contact shadow, on whatever the page shows behind ----- */
  const shadowMat = new THREE.ShadowMaterial({ opacity: 0.16, transparent: true, depthWrite: false });
  const shadowPlane = new THREE.Mesh(new THREE.PlaneGeometry(12, 12), shadowMat);
  shadowPlane.rotation.x = -Math.PI / 2;
  shadowPlane.position.y = -0.002;
  shadowPlane.receiveShadow = true;
  shadowPlane.renderOrder = -2;
  scene.add(shadowPlane);

  const contactTex = canvasTexture(THREE, 256, 256, (g, w, h) => {
    const grd = g.createRadialGradient(w / 2, h / 2, w * 0.16, w / 2, h / 2, w / 2);
    grd.addColorStop(0, 'rgba(0,0,0,.6)');
    grd.addColorStop(0.3, 'rgba(0,0,0,.34)');
    grd.addColorStop(0.62, 'rgba(0,0,0,.09)');
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grd; g.fillRect(0, 0, w, h);
  });
  const contactMat = new THREE.MeshBasicMaterial({ map: contactTex, transparent: true, depthWrite: false, toneMapped: false });
  const contact = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 1.9), contactMat);
  contact.rotation.x = -Math.PI / 2;
  contact.position.y = -0.001;
  contact.renderOrder = -1;
  scene.add(contact);

  /* ----- State ----- */
  // `pose` is what is drawn; `target` is where it is heading. Each frame closes part of the gap.
  const blank = () => ({
    yaw: FRONT, pitch: 0.1, cy: H0 / 2, viewH: (H0 + TALL) * 1.24,
    stretch: 0, lidLift: 0, coat: 1, bootOff: 0, engrave: 0,
  });
  const pose = blank();
  const target = blank();
  const bodyColor = new THREE.Color(0xa9bcc6);
  const lidColor = new THREE.Color(0xa9bcc6);
  const bootColor = new THREE.Color(0x17181c);
  const printColor = new THREE.Color(0x5a6469);
  const white = new THREE.Color(0xffffff);
  const STEEL_PRINT = new THREE.Color(0x4c5055);

  let view = 'full';
  let bodyIsSteel = false;
  let lidStyle = 'loop';
  let lidIsSteel = false;
  let pendingLid = null;         // a lid waiting to be swapped in at the top of its lift
  let appliedStretch = -1;
  let cssH = 1;
  const inset = { top: 0, bottom: 0 };
  let running = false, raf = 0, last = 0, drawn = false, firstFrame = null, visible = true;
  let ready = false;             // nothing is drawn until the shaders have been compiled
  const tanHalf = Math.tan((FOV * Math.PI) / 360);

  function applyStretch(d) {
    if (Math.abs(d - appliedStretch) < 1e-5) return;
    appliedStretch = d;
    for (const s of stretchable) {
      const pos = s.geo.attributes.position, uv = s.geo.attributes.uv;
      for (let i = 0; i < s.moved.length; i++) {
        pos.setY(s.moved[i], s.y[i] + d);
        uv.setY(s.moved[i], s.v[i] + d * V_SCALE);
      }
      pos.needsUpdate = true; uv.needsUpdate = true;
      s.geo.computeBoundingSphere();
    }
    top.position.y = d;
    logo.mesh.position.y = logo.baseY + d / 2;
    engraving.mesh.position.y = engraving.baseY + d / 2;
  }

  /** Where the camera looks for each named view, given the current choices. */
  function aim() {
    const s = target.stretch;
    const lidTop = LID_TOP[pendingLid ? pendingLid.style : lidStyle] + s;
    // The page keeps controls over the top and bottom of the canvas. `clear` is the share of
    // the height left between them, and `mid` is where its middle sits (0 = top, 1 = bottom).
    const clear = Math.max(0.5, 1 - (inset.top + inset.bottom) / cssH);
    const mid = (inset.top + (cssH - inset.top - inset.bottom) / 2) / cssH;
    let centre, show;
    if (view === 'lid') { centre = lidTop - 0.3; show = 1.25; target.pitch = 0.3; }
    else if (view === 'base') { centre = 0.4; show = 1.2; target.pitch = 0.07; }
    else if (view === 'mark') { centre = 0.88 + s / 2; show = 1.5; target.pitch = 0.05; }
    // The whole bottle is framed for the tall size, so the two sizes can be compared by eye.
    else { centre = (H0 + s) / 2; show = (H0 + TALL) * 1.03; target.pitch = 0.1; }
    target.viewH = show / clear;
    target.cy = centre - (0.5 - mid) * target.viewH;
  }

  function swapLid() {
    lidStyle = pendingLid.style;
    lidIsSteel = pendingLid.steel;
    pendingLid = null;
    lidShells.loop.visible = lidStyle === 'loop';
    lidShells.flat.visible = lidStyle === 'flat';
    loopParts.visible = lidStyle === 'loop';
    const mat = lidIsSteel ? brushedMat : lidCoatMat;
    lidShells.loop.material = mat;
    lidShells.flat.material = mat;
    lidCoatMat.color.copy(lidColor);
  }

  function resize(w, h) {
    w = Math.max(1, Math.round(w)); h = Math.max(1, Math.round(h));
    let ratio = Math.min(window.devicePixelRatio || 1, maxDpr);
    const budget = 5.5e6; // rendered pixels
    if (w * h * ratio * ratio > budget) ratio = Math.max(1, Math.sqrt(budget / (w * h)));
    renderer.setPixelRatio(ratio);
    renderer.setSize(w, h, false);
    cssH = h;
    aim();
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    wake();
  }

  /** One frame. Returns true while anything is still moving. */
  function draw(dt) {
    let moving = false;
    const ease = (rate) => (reducedMotion ? 1 : 1 - Math.exp(-dt * rate));
    const k = ease(7);
    for (const name in pose) {
      const gap = target[name] - pose[name];
      if (Math.abs(gap) > 4e-4) { pose[name] += gap * k; moving = true; } else pose[name] = target[name];
    }

    // A waiting lid goes on once the old one has lifted clear.
    if (pendingLid && pose.lidLift > 0.96) { swapLid(); target.lidLift = 0; aim(); moving = true; }

    // Colours wash in rather than switch.
    const ck = ease(4.5);
    const tint = (color, goal) => {
      if (Math.abs(color.r - goal.r) + Math.abs(color.g - goal.g) + Math.abs(color.b - goal.b) > 2e-3) { color.lerp(goal, ck); moving = true; } else color.copy(goal);
    };
    tint(bodyCoatMat.color, bodyColor);
    if (!pendingLid) tint(lidCoatMat.color, lidColor);
    tint(bootMat.color, bootColor);
    tint(logo.mat.color, printColor);

    applyStretch(pose.stretch);

    // Powder coat over steel.
    const coatOn = pose.coat;
    coatShell.visible = coatOn > 0.004;
    steelShell.visible = coatOn < 0.996;
    bodyCoatMat.transparent = coatOn < 0.996;
    bodyCoatMat.opacity = coatOn;

    // Lid: lifts straight up, with the quarter turn that seals it.
    lid.position.y = pose.stretch + pose.lidLift * LID_LIFT;
    lid.rotation.y = pose.lidLift * 1.4;

    // Boot: drops away and fades; the bottle then stands on its steel base.
    const off = pose.bootOff;
    bootGroup.visible = off < 0.996;
    bootGroup.position.y = -off * BOOT_DROP;
    bootMat.transparent = off > 0.004;
    bootMat.opacity = 1 - off;
    bootGroup.children[0].castShadow = off < 0.5;
    const sink = off > 0.5 ? (off - 0.5) * 2 * BOOT_H : 0;
    product.position.y = -sink;

    engraving.mat.opacity = pose.engrave;
    engraving.mesh.visible = pose.engrave > 0.004;

    product.rotation.y = pose.yaw;

    // Camera: a fixed lens, moved back until the requested height fills the canvas.
    // On a narrow canvas it moves back further, so the bottle is never cropped at the sides.
    const minW = view === 'full' ? 1.5 : 1.15;
    const visH = Math.max(pose.viewH, minW / camera.aspect);
    const dist = visH / (2 * tanHalf);
    const p = pose.pitch;
    camera.position.set(0, pose.cy + Math.sin(p) * dist, Math.cos(p) * dist);
    camera.rotation.set(-p, 0, 0);

    renderer.render(scene, camera);
    if (!drawn) { drawn = true; if (firstFrame) firstFrame(); }
    return moving;
  }

  function frame(now) {
    if (!running) return;
    const dt = Math.min((now - last) / 1000, 0.05) || 0.016;
    last = now;
    const moving = draw(dt);
    if (moving && visible) raf = requestAnimationFrame(frame);
    else running = false;
  }

  /** Start drawing again after a change. Stops by itself when everything has settled. */
  function wake() {
    if (running || !visible || !ready) return;
    running = true; last = performance.now();
    raf = requestAnimationFrame(frame);
  }

  const api = {
    get running() { return running; },
    get view() { return view; },
    get yaw() { return target.yaw; },
    resize, wake,

    /** Jump straight to the target state, without animation. */
    snap() {
      if (pendingLid) swapLid();
      target.lidLift = 0;
      aim();
      Object.assign(pose, target);
      bodyCoatMat.color.copy(bodyColor);
      lidCoatMat.color.copy(lidColor);
      bootMat.color.copy(bootColor);
      logo.mat.color.copy(printColor);
      wake();
    },

    setSize(tall) { target.stretch = tall ? TALL : 0; aim(); wake(); },

    /** `hex` is a powder-coat colour, or null for bare brushed steel. */
    setBody(hex) {
      bodyIsSteel = hex === null;
      target.coat = bodyIsSteel ? 0 : 1;
      if (!bodyIsSteel) {
        // Coming back from bare steel, the coat fades in already in its new colour.
        bodyColor.set(hex);
        if (pose.coat < 0.01) bodyCoatMat.color.copy(bodyColor);
        // Print: darker than the coat on light finishes, lighter on dark ones.
        const lum = 0.2126 * bodyColor.r + 0.7152 * bodyColor.g + 0.0722 * bodyColor.b;
        if (lum > 0.14) printColor.copy(bodyColor).multiplyScalar(0.42);
        else printColor.copy(bodyColor).lerp(white, 0.25);
        // The engraving shows the steel under the coat: bright against a dark coat,
        // and a darker grey against a pale one, so it can be read on both.
        engraving.mat.color.set(lum > 0.3 ? 0x777d83 : 0xe3e6e8);
        engraving.mat.roughness = lum > 0.3 ? 0.5 : 0.42;
      } else {
        printColor.copy(STEEL_PRINT);
        // On bare steel the engraving reads as a darker, frosted mark.
        engraving.mat.color.set(0x70757a);
        engraving.mat.roughness = 0.85;
      }
      wake();
    },

    /** The lid lifts off, is exchanged, and comes back down. `hex` null means brushed steel. */
    setLid(style, hex) {
      const steel = hex === null;
      if (!steel) lidColor.set(hex);
      const current = pendingLid || { style: lidStyle, steel: lidIsSteel };
      if (current.style === style && current.steel === steel) { wake(); return; }
      pendingLid = { style, steel };
      target.lidLift = 1;
      aim();
      wake();
    },

    /** `hex` null takes the boot off. */
    setBoot(hex) {
      if (hex === null) target.bootOff = 1;
      else {
        target.bootOff = 0;
        bootColor.set(hex);
        if (pose.bootOff > 0.99) bootMat.color.copy(bootColor);
      }
      wake();
    },

    setEngraving(text) {
      const next = text.trim();
      if (next) { engravingText = next; drawEngraving(); }
      target.engrave = next ? 1 : 0;
      wake();
    },

    /** 'full', 'lid', 'base' or 'mark' (the wordmark and engraving, turned to the front). */
    setView(name) {
      view = name;
      if (name === 'mark') target.yaw = FRONT + Math.round((target.yaw - FRONT) / TAU) * TAU;
      aim();
      wake();
    },

    turn(dYaw, dPitch = 0) {
      target.yaw += dYaw;
      target.pitch = Math.min(0.62, Math.max(-0.12, target.pitch + dPitch));
      wake();
    },

    /** One full turn, to show a new colour from every side. */
    spin() { if (!reducedMotion) { target.yaw += TAU; wake(); } },

    /** Space, in CSS pixels, that the page's own controls take at the top and bottom of the canvas. */
    setInsets(topPx, bottomPx) { inset.top = topPx; inset.bottom = bottomPx; aim(); wake(); },

    setVisible(v) { visible = v; if (v) wake(); },

    /** Compile the shaders off the main thread where the browser allows it. */
    prepare() {
      const done = renderer.compileAsync ? renderer.compileAsync(scene, camera) : Promise.resolve();
      return done.catch(() => {}).then(() => { ready = true; wake(); });
    },
    onFirstFrame(fn) { if (drawn) fn(); else firstFrame = fn; },
    dispose() { running = false; cancelAnimationFrame(raf); renderer.dispose(); },
  };
  return api;
}
