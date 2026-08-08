import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const elements = {
  frame: document.querySelector("#viewer-frame"),
  canvas: document.querySelector("#fcc-bct-canvas"),
  fallback: document.querySelector("#viewer-fallback"),
  summary: document.querySelector("#selection-summary"),
  downloadMessage: document.querySelector("#download-message"),
  downloadPng: document.querySelector("#download-png"),
  showFccFrames: document.querySelector("#show-fcc-frames"),
  showAtoms: document.querySelector("#show-atoms"),
  showBct: document.querySelector("#show-bct"),
  showBctHighlights: document.querySelector("#show-bct-highlights"),
  showAxes: document.querySelector("#show-axes"),
  autoRotate: document.querySelector("#auto-rotate"),
  fccOpacity: document.querySelector("#fcc-opacity"),
  fccOpacityValue: document.querySelector("#fcc-opacity-value"),
  bctOpacity: document.querySelector("#bct-opacity"),
  bctOpacityValue: document.querySelector("#bct-opacity-value"),
  atomSize: document.querySelector("#atom-size"),
  atomSizeValue: document.querySelector("#atom-size-value"),
  viewIsometric: document.querySelector("#view-isometric"),
  viewTop: document.querySelector("#view-top"),
  viewFront: document.querySelector("#view-front"),
  focusBct: document.querySelector("#focus-bct"),
  resetView: document.querySelector("#reset-view")
};

const LATTICE_PARAMETER = 2;
const COLORS = {
  fcc: 0x6aaeff,
  bct: 0xff755b,
  bodyCentre: 0x43d8b6,
  secondAxis: 0xb897ff,
  atom: 0xf0efff,
  atomEdge: 0x8b96d6,
  scene: 0x141844,
  ground: 0x20275c
};

let renderer;
let scene;
let camera;
let controls;
let resizeObserver;
let fccGroup;
let atomGroup;
let bctGroup;
let bctHighlightGroup;
let axesGroup;
let leftFill;
let rightFill;
let bctFaceMaterial;
let animationFrameId = null;

const rotationAnchor = new THREE.Vector3(0, 0, 0);

try {
  initializeScene();
  buildModel();
  bindControls();
  resetModel(false);
  updateSummary();
  startAnimation();
} catch (error) {
  console.error(error);
  elements.canvas.hidden = true;
  elements.fallback.hidden = false;
  document.querySelectorAll(".controls-panel input, .controls-panel button, #download-png")
    .forEach((control) => { control.disabled = true; });
  elements.summary.textContent = "The interactive 3D view is unavailable in this browser.";
}

function initializeScene() {
  renderer = new THREE.WebGLRenderer({
    canvas: elements.canvas,
    antialias: true,
    powerPreference: "high-performance"
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(COLORS.scene);

  camera = new THREE.PerspectiveCamera(38, 1, 0.05, 100);
  camera.position.set(5.4, 4.3, 6.6);

  controls = new OrbitControls(camera, elements.canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.target.copy(rotationAnchor);
  controls.minDistance = 3.2;
  controls.maxDistance = 18;
  controls.enablePan = true;
  controls.update();

  scene.add(new THREE.HemisphereLight(0xffffff, 0x26315f, 2.6));

  const keyLight = new THREE.DirectionalLight(0xffffff, 3.2);
  keyLight.position.set(5, 8, 7);
  keyLight.castShadow = true;
  scene.add(keyLight);

  const fillLight = new THREE.DirectionalLight(0x8cbcff, 1.5);
  fillLight.position.set(-6, 2, -4);
  scene.add(fillLight);

  resizeObserver = new ResizeObserver(resizeRenderer);
  resizeObserver.observe(elements.frame);
  resizeRenderer();

  elements.canvas.addEventListener("webglcontextlost", (event) => {
    event.preventDefault();
    elements.fallback.hidden = false;
    elements.fallback.textContent = "The 3D context was lost. Reload this page to restart the view.";
  });

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) startAnimation();
  });
}

function buildModel() {
  const root = new THREE.Group();
  root.position.set(-LATTICE_PARAMETER, -LATTICE_PARAMETER / 2, -LATTICE_PARAMETER / 2);
  scene.add(root);

  fccGroup = new THREE.Group();
  atomGroup = new THREE.Group();
  bctGroup = new THREE.Group();
  bctHighlightGroup = new THREE.Group();
  axesGroup = new THREE.Group();
  root.add(fccGroup, atomGroup, bctGroup, bctHighlightGroup, axesGroup);

  const leftOrigin = new THREE.Vector3(0, 0, 0);
  const rightOrigin = new THREE.Vector3(LATTICE_PARAMETER, 0, 0);
  const cubeSize = new THREE.Vector3(LATTICE_PARAMETER, LATTICE_PARAMETER, LATTICE_PARAMETER);

  leftFill = makeTransparentBox(leftOrigin, cubeSize, COLORS.fcc, 0.12);
  rightFill = makeTransparentBox(rightOrigin, cubeSize, COLORS.fcc, 0.12);
  fccGroup.add(
    leftFill,
    rightFill,
    makeEdgeBox(leftOrigin, cubeSize, COLORS.fcc),
    makeEdgeBox(rightOrigin, cubeSize, COLORS.fcc)
  );

  buildFccAtoms(leftOrigin, rightOrigin);
  buildBctCell();
  buildGround(root);
}

function makeEdgeBox(origin, size, color) {
  const geometry = new THREE.EdgesGeometry(new THREE.BoxGeometry(size.x, size.y, size.z));
  const material = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.96 });
  const lines = new THREE.LineSegments(geometry, material);
  lines.position.copy(origin).addScaledVector(size, 0.5);
  lines.renderOrder = 5;
  return lines;
}

function makeTransparentBox(origin, size, color, opacity) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(size.x, size.y, size.z),
    new THREE.MeshPhongMaterial({
      color,
      transparent: true,
      opacity,
      side: THREE.DoubleSide,
      depthWrite: false,
      shininess: 25
    })
  );
  mesh.position.copy(origin).addScaledVector(size, 0.5);
  return mesh;
}

function buildFccAtoms(leftOrigin, rightOrigin) {
  const pointMap = new Map();
  addFccCellPoints(pointMap, leftOrigin);
  addFccCellPoints(pointMap, rightOrigin);

  const atomGeometry = new THREE.SphereGeometry(0.13, 32, 22);
  const haloGeometry = new THREE.SphereGeometry(0.137, 24, 16);
  const atomMaterial = new THREE.MeshStandardMaterial({
    color: COLORS.atom,
    emissive: 0x252a65,
    emissiveIntensity: 0.12,
    metalness: 0.06,
    roughness: 0.3
  });
  const haloMaterial = new THREE.MeshBasicMaterial({
    color: COLORS.atomEdge,
    transparent: true,
    opacity: 0.36,
    side: THREE.BackSide
  });

  pointMap.forEach((point) => {
    const atom = new THREE.Mesh(atomGeometry, atomMaterial);
    atom.position.copy(point);
    atom.castShadow = true;
    atomGroup.add(atom);

    const halo = new THREE.Mesh(haloGeometry, haloMaterial);
    halo.position.copy(point);
    atomGroup.add(halo);
  });
}

function addFccCellPoints(pointMap, origin) {
  const a = LATTICE_PARAMETER;
  const addPoint = (point) => {
    const key = `${point.x.toFixed(4)},${point.y.toFixed(4)},${point.z.toFixed(4)}`;
    if (!pointMap.has(key)) pointMap.set(key, point.clone());
  };

  for (const dx of [0, a]) {
    for (const dy of [0, a]) {
      for (const dz of [0, a]) addPoint(origin.clone().add(new THREE.Vector3(dx, dy, dz)));
    }
  }

  [
    [0, a / 2, a / 2], [a, a / 2, a / 2],
    [a / 2, 0, a / 2], [a / 2, a, a / 2],
    [a / 2, a / 2, 0], [a / 2, a / 2, a]
  ].forEach((offset) => addPoint(origin.clone().add(new THREE.Vector3(...offset))));
}

function buildBctCell() {
  const a = LATTICE_PARAMETER;
  const origin = new THREE.Vector3(a, 0, 0);
  const u = new THREE.Vector3(a / 2, a / 2, 0);
  const v = new THREE.Vector3(-a / 2, a / 2, 0);
  const w = new THREE.Vector3(0, 0, a);
  const corners = [
    origin.clone(),
    origin.clone().add(u),
    origin.clone().add(v),
    origin.clone().add(u).add(v),
    origin.clone().add(w),
    origin.clone().add(u).add(w),
    origin.clone().add(v).add(w),
    origin.clone().add(u).add(v).add(w)
  ];
  const centre = origin.clone()
    .addScaledVector(u, 0.5)
    .addScaledVector(v, 0.5)
    .addScaledVector(w, 0.5);

  const edgeMaterial = new THREE.LineBasicMaterial({ color: COLORS.bct, transparent: true, opacity: 1 });
  [
    [0, 1], [0, 2], [1, 3], [2, 3],
    [4, 5], [4, 6], [5, 7], [6, 7],
    [0, 4], [1, 5], [2, 6], [3, 7]
  ].forEach(([first, second]) => {
    const geometry = new THREE.BufferGeometry().setFromPoints([corners[first], corners[second]]);
    const line = new THREE.Line(geometry, edgeMaterial);
    line.renderOrder = 7;
    bctGroup.add(line);
  });

  bctFaceMaterial = new THREE.MeshPhongMaterial({
    color: COLORS.bct,
    transparent: true,
    opacity: 0.18,
    side: THREE.DoubleSide,
    depthWrite: false,
    shininess: 28
  });
  [
    [0, 1, 3, 2], [4, 6, 7, 5],
    [0, 4, 5, 1], [2, 3, 7, 6],
    [0, 2, 6, 4], [1, 5, 7, 3]
  ].forEach((indices) => bctGroup.add(makeBctFace(corners, indices)));

  const cornerMaterial = new THREE.MeshStandardMaterial({
    color: COLORS.bct,
    emissive: new THREE.Color(COLORS.bct).multiplyScalar(0.2),
    roughness: 0.32,
    metalness: 0.03,
    transparent: true,
    opacity: 0.9
  });
  corners.forEach((point) => {
    const marker = new THREE.Mesh(new THREE.SphereGeometry(0.18, 28, 18), cornerMaterial);
    marker.position.copy(point);
    marker.castShadow = true;
    bctHighlightGroup.add(marker);
  });

  const bodyCentre = new THREE.Mesh(
    new THREE.SphereGeometry(0.24, 32, 22),
    new THREE.MeshStandardMaterial({
      color: COLORS.bodyCentre,
      emissive: new THREE.Color(COLORS.bodyCentre).multiplyScalar(0.22),
      roughness: 0.25,
      metalness: 0.04
    })
  );
  bodyCentre.position.copy(centre);
  bodyCentre.castShadow = true;
  bctHighlightGroup.add(bodyCentre);

  addArrow(axesGroup, origin.clone().add(new THREE.Vector3(0, 0, 0.05)), origin.clone().addScaledVector(u, 0.9).add(new THREE.Vector3(0, 0, 0.05)), COLORS.bct);
  addArrow(axesGroup, origin.clone().add(new THREE.Vector3(0, 0, 0.05)), origin.clone().addScaledVector(v, 0.9).add(new THREE.Vector3(0, 0, 0.05)), COLORS.secondAxis);
  addArrow(axesGroup, origin.clone(), origin.clone().addScaledVector(w, 0.82), COLORS.bodyCentre);

  const sharedFace = new THREE.Mesh(
    new THREE.PlaneGeometry(a, a),
    new THREE.MeshBasicMaterial({
      color: COLORS.bodyCentre,
      transparent: true,
      opacity: 0.08,
      side: THREE.DoubleSide,
      depthWrite: false
    })
  );
  sharedFace.rotation.y = Math.PI / 2;
  sharedFace.position.set(a, a / 2, a / 2);
  fccGroup.add(sharedFace);
}

function makeBctFace(corners, indices) {
  const positions = [];
  [0, 1, 2, 0, 2, 3].forEach((index) => {
    const point = corners[indices[index]];
    positions.push(point.x, point.y, point.z);
  });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  const face = new THREE.Mesh(geometry, bctFaceMaterial);
  face.renderOrder = 2;
  return face;
}

function addArrow(group, start, end, color) {
  const direction = end.clone().sub(start);
  const length = direction.length();
  direction.normalize();
  group.add(new THREE.ArrowHelper(direction, start, length, color, 0.18, 0.1));
}

function buildGround(root) {
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(18, 18),
    new THREE.MeshStandardMaterial({
      color: COLORS.ground,
      roughness: 0.96,
      metalness: 0,
      transparent: true,
      opacity: 0.5
    })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(LATTICE_PARAMETER, -0.08, LATTICE_PARAMETER / 2);
  ground.receiveShadow = true;
  root.add(ground);
}

function bindControls() {
  elements.showFccFrames.addEventListener("change", () => {
    fccGroup.visible = elements.showFccFrames.checked;
    updateSummary();
  });
  elements.showAtoms.addEventListener("change", () => {
    atomGroup.visible = elements.showAtoms.checked;
    updateSummary();
  });
  elements.showBct.addEventListener("change", () => {
    bctGroup.visible = elements.showBct.checked;
    updateSummary();
  });
  elements.showBctHighlights.addEventListener("change", () => {
    bctHighlightGroup.visible = elements.showBctHighlights.checked;
    updateSummary();
  });
  elements.showAxes.addEventListener("change", () => {
    axesGroup.visible = elements.showAxes.checked;
    updateSummary();
  });
  elements.autoRotate.addEventListener("change", () => {
    controls.autoRotate = elements.autoRotate.checked;
    controls.autoRotateSpeed = 1.2;
    updateSummary();
  });

  elements.fccOpacity.addEventListener("input", () => {
    const opacity = Number(elements.fccOpacity.value) / 100;
    leftFill.material.opacity = opacity;
    rightFill.material.opacity = opacity;
    elements.fccOpacityValue.textContent = `${elements.fccOpacity.value}%`;
  });
  elements.bctOpacity.addEventListener("input", () => {
    bctFaceMaterial.opacity = Number(elements.bctOpacity.value) / 100;
    elements.bctOpacityValue.textContent = `${elements.bctOpacity.value}%`;
  });
  elements.atomSize.addEventListener("input", () => {
    const scale = Number(elements.atomSize.value) / 13;
    atomGroup.children.forEach((child) => child.scale.setScalar(scale));
    elements.atomSizeValue.textContent = `${scale.toFixed(2)}\u00d7`;
  });

  elements.viewIsometric.addEventListener("click", () => setView(new THREE.Vector3(5.4, 4.3, 6.6)));
  elements.viewTop.addEventListener("click", () => setView(new THREE.Vector3(0, 8.2, 0.01)));
  elements.viewFront.addEventListener("click", () => setView(new THREE.Vector3(0, 0, 8.5)));
  elements.focusBct.addEventListener("click", () => setView(new THREE.Vector3(4.7, 3.5, 4.8)));
  elements.resetView.addEventListener("click", () => resetModel(true));
  elements.downloadPng.addEventListener("click", downloadPng);
}

function resetModel(announce = true) {
  fccGroup.visible = true;
  atomGroup.visible = true;
  bctGroup.visible = true;
  bctHighlightGroup.visible = true;
  axesGroup.visible = true;
  elements.showFccFrames.checked = true;
  elements.showAtoms.checked = true;
  elements.showBct.checked = true;
  elements.showBctHighlights.checked = true;
  elements.showAxes.checked = true;
  elements.autoRotate.checked = false;
  controls.autoRotate = false;
  elements.fccOpacity.value = "12";
  elements.bctOpacity.value = "18";
  elements.atomSize.value = "13";
  elements.fccOpacity.dispatchEvent(new Event("input"));
  elements.bctOpacity.dispatchEvent(new Event("input"));
  elements.atomSize.dispatchEvent(new Event("input"));
  setView(new THREE.Vector3(5.4, 4.3, 6.6));
  setDownloadMessage("");
  updateSummary();
  if (announce) elements.summary.textContent = "Model reset. Showing both FCC cells and the alternative BCT cell.";
}

function setView(position) {
  camera.position.copy(position);
  controls.target.copy(rotationAnchor);
  controls.update();
}

function updateSummary() {
  const visible = [];
  if (elements.showFccFrames.checked) visible.push("two FCC conventional cells");
  if (elements.showAtoms.checked) visible.push("FCC lattice points");
  if (elements.showBct.checked) visible.push("the alternative BCT cell");
  if (elements.showBctHighlights.checked) visible.push("its corners and body centre");
  if (elements.showAxes.checked) visible.push("the tetragonal axes");

  if (visible.length === 0) {
    elements.summary.textContent = "All model layers are hidden.";
  } else {
    elements.summary.textContent = `Showing ${joinList(visible)}${elements.autoRotate.checked ? " with auto-rotation" : ""}.`;
  }

  elements.canvas.setAttribute(
    "aria-label",
    `Interactive crystallographic model showing ${visible.length ? joinList(visible) : "no visible model layers"}. The common FCC face-centre atom is the BCT body centre. Drag to rotate, scroll to zoom, and right-drag to pan.`
  );
}

function joinList(items) {
  if (items.length <= 1) return items[0] || "";
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items.at(-1)}`;
}

function downloadPng() {
  const oldPixelRatio = renderer.getPixelRatio();
  const oldSize = new THREE.Vector2();
  renderer.getSize(oldSize);
  const oldAspect = camera.aspect;

  try {
    setDownloadMessage("");
    renderer.setPixelRatio(1);
    renderer.setSize(1600, 1200, false);
    camera.aspect = 4 / 3;
    camera.updateProjectionMatrix();
    renderer.render(scene, camera);

    const link = document.createElement("a");
    link.download = "fcc-hidden-bct-cell.png";
    link.href = renderer.domElement.toDataURL("image/png");
    document.body.append(link);
    link.click();
    link.remove();
    setDownloadMessage("PNG downloaded without the page controls.");
  } catch (error) {
    console.error(error);
    setDownloadMessage("The PNG could not be created in this browser.", true);
  } finally {
    renderer.setPixelRatio(oldPixelRatio);
    renderer.setSize(oldSize.x, oldSize.y, false);
    camera.aspect = oldAspect;
    camera.updateProjectionMatrix();
  }
}

function setDownloadMessage(message, isError = false) {
  elements.downloadMessage.textContent = message;
  elements.downloadMessage.classList.toggle("is-error", isError);
}

function resizeRenderer() {
  if (!renderer || !camera) return;
  const width = elements.frame.clientWidth;
  const height = elements.frame.clientHeight;
  if (width < 2 || height < 2) return;
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

function startAnimation() {
  if (animationFrameId === null && !document.hidden) {
    animationFrameId = requestAnimationFrame(animate);
  }
}

function animate() {
  animationFrameId = null;
  if (document.hidden) return;
  controls.update();
  renderer.render(scene, camera);
  animationFrameId = requestAnimationFrame(animate);
}
