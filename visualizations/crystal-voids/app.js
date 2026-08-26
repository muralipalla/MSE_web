const ROOT_TWO = Math.sqrt(2);
const configs = {
  tetrahedral: {
    title: "Tetrahedral void",
    coordination: 4,
    limit: Math.sqrt(6) / 2 - 1,
    distance: "d = √6 R / 2",
    equation: ["R + r = (√6 / 2)R", "r/R = √6 / 2 − 1 = 0.225"],
    positions: [[1,1,1],[1,-1,-1],[-1,1,-1],[-1,-1,1]].map(p => p.map(v => v / ROOT_TWO)),
    camera: [5.1, 3.7, 5.3]
  },
  octahedral: {
    title: "Octahedral void",
    coordination: 6,
    limit: Math.sqrt(2) - 1,
    distance: "d = √2 R",
    equation: ["R + r = √2 R", "r/R = √2 − 1 = 0.414"],
    positions: [[ROOT_TWO,0,0],[-ROOT_TWO,0,0],[0,ROOT_TWO,0],[0,-ROOT_TWO,0],[0,0,ROOT_TWO],[0,0,-ROOT_TWO]],
    camera: [5.0, 4.0, 5.4]
  },
  cubic: {
    title: "Cube-centre void",
    coordination: 8,
    limit: Math.sqrt(3) - 1,
    distance: "d = √3 R",
    equation: ["R + r = √3 R", "r/R = √3 − 1 = 0.732"],
    positions: [-1,1].flatMap(x => [-1,1].flatMap(y => [-1,1].map(z => [x,y,z]))),
    camera: [5.4, 4.1, 5.8]
  }
};

const el = {
  canvas: document.getElementById("void-canvas"),
  frame: document.getElementById("viewer-frame"),
  fallback: document.getElementById("viewer-fallback"),
  tabs: [...document.querySelectorAll("[data-void]")],
  cards: [...document.querySelectorAll("[data-card]")],
  loadButtons: [...document.querySelectorAll("[data-load]")],
  kicker: document.getElementById("viewer-kicker"),
  title: document.getElementById("viewer-title"),
  slider: document.getElementById("radius-slider"),
  output: document.getElementById("radius-output"),
  status: document.getElementById("fit-status"),
  coordination: document.getElementById("fact-coordination"),
  distance: document.getElementById("fact-distance"),
  ratio: document.getElementById("fact-ratio"),
  equation: document.getElementById("equation"),
  autoRotate: document.getElementById("auto-rotate"),
  showContact: document.getElementById("show-contact"),
  reset: document.getElementById("reset-view"),
  download: document.getElementById("download-png"),
  downloadMessage: document.getElementById("download-message"),
  presets: [...document.querySelectorAll("[data-preset]")]
};

let current = "tetrahedral";
let scene;
let camera;
let renderer;
let model;
let innerAtom;
let contactLines;
let dragging = false;
let previousPointer = { x: 0, y: 0 };
let compatibilityMode = false;
let canvasContext;
const fallbackView = { yaw: 0.42, pitch: -0.18, zoom: 1 };

function edgePairs(positions) {
  const distances = [];
  for (let i = 0; i < positions.length; i += 1) {
    for (let j = i + 1; j < positions.length; j += 1) {
      const d = Math.hypot(
        positions[i][0] - positions[j][0],
        positions[i][1] - positions[j][1],
        positions[i][2] - positions[j][2]
      );
      distances.push({ i, j, d });
    }
  }
  const shortest = Math.min(...distances.map(item => item.d));
  return distances.filter(item => Math.abs(item.d - shortest) < 0.01);
}

function makeLines(points, color, opacity = 1) {
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({ color, transparent: opacity < 1, opacity });
  return new THREE.LineSegments(geometry, material);
}

function disposeObject(object) {
  object.traverse(child => {
    child.geometry?.dispose();
    if (Array.isArray(child.material)) child.material.forEach(material => material.dispose());
    else child.material?.dispose();
  });
}

function buildModel() {
  if (model) {
    scene.remove(model);
    disposeObject(model);
  }
  const config = configs[current];
  model = new THREE.Group();

  const hostGeometry = new THREE.SphereGeometry(1, 48, 32);
  const hostMaterial = new THREE.MeshPhysicalMaterial({ color: 0x62b8e8, roughness: 0.28, metalness: 0.03, transparent: true, opacity: 0.78, clearcoat: 0.3 });
  config.positions.forEach(position => {
    const atom = new THREE.Mesh(hostGeometry, hostMaterial);
    atom.position.set(...position);
    model.add(atom);
  });

  const cagePoints = [];
  edgePairs(config.positions).forEach(({ i, j }) => cagePoints.push(new THREE.Vector3(...config.positions[i]), new THREE.Vector3(...config.positions[j])));
  model.add(makeLines(cagePoints, 0xc8d7ff, 0.92));

  const centrePoints = [];
  config.positions.forEach(position => centrePoints.push(new THREE.Vector3(0,0,0), new THREE.Vector3(...position)));
  contactLines = makeLines(centrePoints, 0xffd34e, 0.48);
  contactLines.visible = el.showContact.checked;
  model.add(contactLines);

  innerAtom = new THREE.Mesh(
    new THREE.SphereGeometry(1, 56, 36),
    new THREE.MeshPhysicalMaterial({ color: 0xffd34e, roughness: 0.24, metalness: 0.04, clearcoat: 0.45, emissive: 0x2b1900, emissiveIntensity: 0.12 })
  );
  model.add(innerAtom);
  scene.add(model);
  updateRadius();
}

function setRadius(value) {
  el.slider.value = Number(value).toFixed(3);
  updateRadius();
}

function updateRadius() {
  const value = Number(el.slider.value);
  const limit = configs[current].limit;
  innerAtom?.scale.setScalar(value);
  el.output.value = `r/R = ${value.toFixed(3)}`;
  el.output.textContent = `r/R = ${value.toFixed(3)}`;
  el.status.className = "fit-status";

  if (value < limit - 0.004) {
    el.status.classList.add("is-fitting");
    el.status.innerHTML = "<strong>Fits with clearance</strong><span>The inner atom does not yet touch the host atoms.</span>";
    innerAtom?.material.color.setHex(0x65d6a3);
  } else if (value <= limit + 0.004) {
    el.status.classList.add("is-touching");
    el.status.innerHTML = "<strong>Just touching</strong><span>The inner atom is at the maximum rigid-sphere radius.</span>";
    innerAtom?.material.color.setHex(0xffd34e);
  } else {
    el.status.classList.add("is-overlap");
    el.status.innerHTML = "<strong>Overlap</strong><span>This radius is too large for an unrelaxed rigid-sphere cage.</span>";
    innerAtom?.material.color.setHex(0xff725e);
  }
}

function resetCamera() {
  if (compatibilityMode) {
    fallbackView.yaw = 0.42;
    fallbackView.pitch = -0.18;
    fallbackView.zoom = 1;
    return;
  }
  const position = configs[current].camera;
  camera.position.set(...position);
  camera.lookAt(0, 0, 0);
  if (model) model.rotation.set(-0.12, 0.28, 0);
}

function selectVoid(type, scroll = false) {
  if (!configs[type]) return;
  current = type;
  const config = configs[type];
  el.tabs.forEach(tab => {
    const selected = tab.dataset.void === type;
    tab.setAttribute("aria-selected", String(selected));
    tab.tabIndex = selected ? 0 : -1;
  });
  el.cards.forEach(card => card.classList.toggle("active", card.dataset.card === type));
  el.kicker.textContent = `Coordination number ${config.coordination}`;
  el.title.textContent = config.title;
  el.canvas.setAttribute("aria-label", `Interactive hard-sphere model of a ${config.title.toLowerCase()}. Drag to rotate and scroll to zoom.`);
  el.coordination.textContent = String(config.coordination);
  el.distance.textContent = config.distance;
  el.ratio.textContent = config.limit.toFixed(3);
  el.equation.setAttribute("aria-label", `${config.title} radius derivation`);
  el.equation.innerHTML = `<span>${config.equation[0]}</span><strong>${config.equation[1]}</strong>`;
  setRadius(config.limit);
  if (!compatibilityMode) buildModel();
  resetCamera();
  if (scroll) document.getElementById("void-explorer").scrollIntoView({ behavior: "smooth", block: "start" });
}

function rotatePoint([x, y, z]) {
  const cy = Math.cos(fallbackView.yaw);
  const sy = Math.sin(fallbackView.yaw);
  const cx = Math.cos(fallbackView.pitch);
  const sx = Math.sin(fallbackView.pitch);
  const x1 = x * cy + z * sy;
  const z1 = -x * sy + z * cy;
  return [x1, y * cx - z1 * sx, y * sx + z1 * cx];
}

function drawFallbackSphere(point, radius, fill, stroke, alpha = 1) {
  const width = el.canvas.clientWidth;
  const height = el.canvas.clientHeight;
  const base = Math.min(width, height) * 0.205 * fallbackView.zoom;
  const [x, y, z] = rotatePoint(point);
  const perspective = 4.5 / (4.5 + z * 0.24);
  const px = width / 2 + x * base * perspective;
  const py = height / 2 - y * base * perspective;
  const pr = radius * base * perspective;
  const gradient = canvasContext.createRadialGradient(px - pr * 0.32, py - pr * 0.38, pr * 0.08, px, py, pr);
  gradient.addColorStop(0, "rgba(255,255,255,0.96)");
  gradient.addColorStop(0.18, fill);
  gradient.addColorStop(1, stroke);
  canvasContext.globalAlpha = alpha;
  canvasContext.beginPath();
  canvasContext.arc(px, py, pr, 0, Math.PI * 2);
  canvasContext.fillStyle = gradient;
  canvasContext.fill();
  canvasContext.strokeStyle = "rgba(9,29,53,0.65)";
  canvasContext.lineWidth = Math.max(1.5, pr * 0.025);
  canvasContext.stroke();
  canvasContext.globalAlpha = 1;
}

function projectFallback(point) {
  const width = el.canvas.clientWidth;
  const height = el.canvas.clientHeight;
  const base = Math.min(width, height) * 0.205 * fallbackView.zoom;
  const rotated = rotatePoint(point);
  const perspective = 4.5 / (4.5 + rotated[2] * 0.24);
  return { x: width / 2 + rotated[0] * base * perspective, y: height / 2 - rotated[1] * base * perspective, z: rotated[2] };
}

function drawCanvasFallback() {
  if (!canvasContext) return;
  const width = el.canvas.clientWidth;
  const height = el.canvas.clientHeight;
  canvasContext.clearRect(0, 0, width, height);
  const config = configs[current];
  const projected = config.positions.map(projectFallback);

  canvasContext.lineWidth = 2;
  canvasContext.strokeStyle = "rgba(200,215,255,0.88)";
  edgePairs(config.positions).forEach(({ i, j }) => {
    canvasContext.beginPath();
    canvasContext.moveTo(projected[i].x, projected[i].y);
    canvasContext.lineTo(projected[j].x, projected[j].y);
    canvasContext.stroke();
  });

  if (el.showContact.checked) {
    const centre = projectFallback([0, 0, 0]);
    canvasContext.strokeStyle = "rgba(255,211,78,0.58)";
    projected.forEach(point => {
      canvasContext.beginPath();
      canvasContext.moveTo(centre.x, centre.y);
      canvasContext.lineTo(point.x, point.y);
      canvasContext.stroke();
    });
  }

  const objects = config.positions.map((point, index) => ({ point, z: projected[index].z, host: true }));
  objects.push({ point: [0, 0, 0], z: 0, host: false });
  objects.sort((a, b) => b.z - a.z).forEach(object => {
    if (object.host) {
      drawFallbackSphere(object.point, 1, "rgba(98,184,232,0.88)", "rgba(21,101,145,0.92)", 0.82);
    } else {
      const ratio = Number(el.slider.value);
      const limit = config.limit;
      const colours = ratio < limit - 0.004
        ? ["rgba(101,214,163,0.98)", "rgba(24,118,85,0.98)"]
        : ratio <= limit + 0.004
          ? ["rgba(255,211,78,1)", "rgba(190,116,0,1)"]
          : ["rgba(255,114,94,1)", "rgba(172,39,34,1)"];
      drawFallbackSphere(object.point, ratio, colours[0], colours[1]);
    }
  });
}

function startCanvasFallback() {
  compatibilityMode = true;
  canvasContext = el.canvas.getContext("2d");
  if (!canvasContext) {
    el.fallback.hidden = false;
    return;
  }
  el.fallback.hidden = true;
  el.downloadMessage.textContent = "Compatibility renderer active: the model remains interactive without WebGL.";

  const resizeFallback = () => {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const width = el.frame.clientWidth;
    const height = el.frame.clientHeight;
    el.canvas.width = Math.round(width * ratio);
    el.canvas.height = Math.round(height * ratio);
    canvasContext.setTransform(ratio, 0, 0, ratio, 0, 0);
    drawCanvasFallback();
  };
  new ResizeObserver(resizeFallback).observe(el.frame);
  resizeFallback();

  el.canvas.addEventListener("pointerdown", event => {
    dragging = true;
    previousPointer = { x: event.clientX, y: event.clientY };
    el.canvas.setPointerCapture(event.pointerId);
  });
  el.canvas.addEventListener("pointermove", event => {
    if (!dragging) return;
    fallbackView.yaw += (event.clientX - previousPointer.x) * 0.008;
    fallbackView.pitch += (event.clientY - previousPointer.y) * 0.008;
    previousPointer = { x: event.clientX, y: event.clientY };
  });
  const endFallbackDrag = event => {
    dragging = false;
    if (el.canvas.hasPointerCapture(event.pointerId)) el.canvas.releasePointerCapture(event.pointerId);
  };
  el.canvas.addEventListener("pointerup", endFallbackDrag);
  el.canvas.addEventListener("pointercancel", endFallbackDrag);
  el.canvas.addEventListener("wheel", event => {
    event.preventDefault();
    fallbackView.zoom = Math.min(1.45, Math.max(0.68, fallbackView.zoom * (event.deltaY > 0 ? 0.94 : 1.06)));
  }, { passive: false });

  const animateFallback = () => {
    if (el.autoRotate.checked && !dragging) fallbackView.yaw += 0.004;
    drawCanvasFallback();
    requestAnimationFrame(animateFallback);
  };
  animateFallback();
}

function initialise() {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(37, 1, 0.1, 100);
  renderer = new THREE.WebGLRenderer({ canvas: el.canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x000000, 0);

  scene.add(new THREE.HemisphereLight(0xeaf4ff, 0x16253d, 2.5));
  const key = new THREE.DirectionalLight(0xffffff, 3.2);
  key.position.set(5, 7, 6);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x7ca7ff, 2.0);
  rim.position.set(-5, 2, -4);
  scene.add(rim);

  resetCamera();
  buildModel();

  el.canvas.addEventListener("pointerdown", event => {
    dragging = true;
    previousPointer = { x: event.clientX, y: event.clientY };
    el.canvas.setPointerCapture(event.pointerId);
  });
  el.canvas.addEventListener("pointermove", event => {
    if (!dragging || !model) return;
    model.rotation.y += (event.clientX - previousPointer.x) * 0.008;
    model.rotation.x += (event.clientY - previousPointer.y) * 0.008;
    previousPointer = { x: event.clientX, y: event.clientY };
  });
  const endDrag = event => {
    dragging = false;
    if (el.canvas.hasPointerCapture(event.pointerId)) el.canvas.releasePointerCapture(event.pointerId);
  };
  el.canvas.addEventListener("pointerup", endDrag);
  el.canvas.addEventListener("pointercancel", endDrag);
  el.canvas.addEventListener("wheel", event => {
    event.preventDefault();
    camera.position.multiplyScalar(event.deltaY > 0 ? 1.08 : 0.93);
    camera.position.clampLength(4.2, 14);
    camera.lookAt(0, 0, 0);
  }, { passive: false });

  const resize = () => {
    const width = el.frame.clientWidth;
    const height = el.frame.clientHeight;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };
  new ResizeObserver(resize).observe(el.frame);
  resize();

  const animate = () => {
    if (el.autoRotate.checked && !dragging && model) model.rotation.y += 0.004;
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  };
  animate();
}

el.tabs.forEach((tab, index) => {
  tab.addEventListener("click", () => selectVoid(tab.dataset.void));
  tab.addEventListener("keydown", event => {
    if (!["ArrowLeft", "ArrowRight"].includes(event.key)) return;
    event.preventDefault();
    const next = (index + (event.key === "ArrowRight" ? 1 : -1) + el.tabs.length) % el.tabs.length;
    el.tabs[next].focus();
    selectVoid(el.tabs[next].dataset.void);
  });
});
el.loadButtons.forEach(button => button.addEventListener("click", () => selectVoid(button.dataset.load, true)));
el.slider.addEventListener("input", updateRadius);
el.presets.forEach(button => button.addEventListener("click", () => {
  const limit = configs[current].limit;
  const values = { fit: Math.max(0.05, limit * 0.72), touch: limit, overlap: Math.min(0.85, limit * 1.14) };
  setRadius(values[button.dataset.preset]);
}));
el.showContact.addEventListener("change", () => { if (contactLines) contactLines.visible = el.showContact.checked; });
el.reset.addEventListener("click", resetCamera);
el.download.addEventListener("click", () => {
  if (renderer) renderer.render(scene, camera);
  else drawCanvasFallback();
  const link = document.createElement("a");
  link.download = `${current}-void-radius.png`;
  link.href = el.canvas.toDataURL("image/png");
  link.click();
  el.downloadMessage.textContent = `${configs[current].title} image downloaded.`;
});

const forceCanvasRenderer = new URLSearchParams(window.location.search).get("renderer") === "canvas";

if (forceCanvasRenderer) {
  startCanvasFallback();
  selectVoid("tetrahedral");
} else {
  try {
    initialise();
    selectVoid("tetrahedral");
  } catch (error) {
    console.warn("WebGL is unavailable; using the interactive canvas renderer.", error);
    startCanvasFallback();
    selectVoid("tetrahedral");
  }
}
