import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

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
let controls;
let model;
let innerAtom;
let contactLines;

function edgePairs(positions) {
  const distances = [];
  for (let i = 0; i < positions.length; i += 1) {
    for (let j = i + 1; j < positions.length; j += 1) {
      distances.push({ i, j, d: new THREE.Vector3(...positions[i]).distanceTo(new THREE.Vector3(...positions[j])) });
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
  const position = configs[current].camera;
  camera.position.set(...position);
  controls.target.set(0, 0, 0);
  controls.update();
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
  buildModel();
  resetCamera();
  if (scroll) document.getElementById("void-explorer").scrollIntoView({ behavior: "smooth", block: "start" });
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

  controls = new OrbitControls(camera, el.canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.minDistance = 4.2;
  controls.maxDistance = 14;
  controls.enablePan = false;
  resetCamera();
  buildModel();

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
    controls.autoRotate = el.autoRotate.checked;
    controls.autoRotateSpeed = 1.25;
    controls.update();
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
  renderer.render(scene, camera);
  const link = document.createElement("a");
  link.download = `${current}-void-radius.png`;
  link.href = renderer.domElement.toDataURL("image/png");
  link.click();
  el.downloadMessage.textContent = `${configs[current].title} image downloaded.`;
});

try {
  initialise();
  selectVoid("tetrahedral");
} catch (error) {
  console.error("Unable to initialise the crystal-void viewer.", error);
  el.fallback.hidden = false;
}
