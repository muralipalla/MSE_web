import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const CUBE_VERTICES = [
  [0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0],
  [0, 0, 1], [1, 0, 1], [0, 1, 1], [1, 1, 1]
];

const CUBE_EDGES = [
  [0, 1], [0, 2], [0, 4],
  [1, 3], [1, 5],
  [2, 3], [2, 6],
  [3, 7],
  [4, 5], [4, 6],
  [5, 7], [6, 7]
];

const HEX_RADIUS = 0.62;
const HEX_HEIGHT = 1.15;
const HEX_CENTER = new THREE.Vector3(0.5, HEX_HEIGHT / 2, 0.5);
const HEX_VERTICES = Array.from({ length: 12 }, (_, index) => {
  const ringIndex = index % 6;
  const angle = ringIndex * Math.PI / 3;
  return [
    0.5 + HEX_RADIUS * Math.cos(angle),
    index < 6 ? 0 : HEX_HEIGHT,
    0.5 + HEX_RADIUS * Math.sin(angle)
  ];
});
const HEX_EDGES = [
  ...Array.from({ length: 6 }, (_, index) => [index, (index + 1) % 6]),
  ...Array.from({ length: 6 }, (_, index) => [index + 6, ((index + 1) % 6) + 6]),
  ...Array.from({ length: 6 }, (_, index) => [index, index + 6])
];

const EPSILON = 1e-7;
const DIRECTION_COLOR = 0xff7258;
const PLANE_COLOR = 0x46dfcd;

const elements = {
  frame: document.querySelector("#viewer-frame"),
  canvas: document.querySelector("#miller-canvas"),
  fallback: document.querySelector("#viewer-fallback"),
  crystalSystem: document.querySelector("#crystal-system"),
  cellKicker: document.querySelector("#cell-kicker"),
  viewOrientation: document.querySelector("#view-orientation"),
  downloadPng: document.querySelector("#download-png"),
  downloadMessage: document.querySelector("#download-message"),
  summary: document.querySelector("#selection-summary"),
  directionForm: document.querySelector("#direction-form"),
  directionInputs: [
    document.querySelector("#direction-u"),
    document.querySelector("#direction-v"),
    document.querySelector("#direction-t"),
    document.querySelector("#direction-w")
  ],
  directionTitle: document.querySelector("#direction-title"),
  directionNote: document.querySelector("#direction-note"),
  directionConversion: document.querySelector("#direction-conversion"),
  directionPreset: document.querySelector("#direction-preset"),
  directionMessage: document.querySelector("#direction-message"),
  clearDirection: document.querySelector("#clear-direction"),
  showDirectionFamily: document.querySelector("#show-direction-family"),
  directionFamilyLabel: document.querySelector("#direction-family-label"),
  showParallelDirections: document.querySelector("#show-parallel-directions"),
  planeForm: document.querySelector("#plane-form"),
  planeInputs: [
    document.querySelector("#plane-h"),
    document.querySelector("#plane-k"),
    document.querySelector("#plane-i"),
    document.querySelector("#plane-l")
  ],
  planeTitle: document.querySelector("#plane-title"),
  planeNote: document.querySelector("#plane-note"),
  planeConversion: document.querySelector("#plane-conversion"),
  planePreset: document.querySelector("#plane-preset"),
  planeMessage: document.querySelector("#plane-message"),
  clearPlane: document.querySelector("#clear-plane"),
  showPlaneFamily: document.querySelector("#show-plane-family"),
  planeFamilyLabel: document.querySelector("#plane-family-label"),
  showParallelPlanes: document.querySelector("#show-parallel-planes"),
  crystalNoteTitle: document.querySelector("#crystal-note-title"),
  crystalNote: document.querySelector("#crystal-note")
};

const state = {
  crystalSystem: "cubic",
  direction: [1, 1, 0],
  plane: [1, 1, 1],
  directionVisible: true,
  planeVisible: true,
  showDirectionFamily: false,
  showParallelDirections: false,
  showPlaneFamily: false,
  showParallelPlanes: false,
  planeOffset: 1
};

let scene;
let camera;
let renderer;
let controls;
let unitCellGraphic;
let directionGraphic;
let planeGraphic;
let resizeObserver;

bindControls();

try {
  initializeScene();
  plotDirection(state.direction);
  plotPlane(state.plane);
  updateSummary();
  animate();
} catch (error) {
  console.error(error);
  elements.canvas.hidden = true;
  elements.fallback.hidden = false;
  elements.downloadPng.disabled = true;
  elements.summary.textContent = "The interactive 3D view is unavailable in this browser.";
}

function initializeScene() {
  renderer = new THREE.WebGLRenderer({
    canvas: elements.canvas,
    antialias: true,
    alpha: true,
    preserveDrawingBuffer: true,
    powerPreference: "high-performance"
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  scene = new THREE.Scene();
  camera = createPerspectiveCamera(1);
  resetCamera();

  controls = createOrbitControls(camera, new THREE.Vector3(0.5, 0.5, 0.5));

  scene.add(new THREE.HemisphereLight(0xffffff, 0x1a255f, 2.2));

  const keyLight = new THREE.DirectionalLight(0xffffff, 3.4);
  keyLight.position.set(3, 4, 4);
  scene.add(keyLight);

  const fillLight = new THREE.DirectionalLight(0x78d8ff, 1.5);
  fillLight.position.set(-3, 1, -2);
  scene.add(fillLight);

  unitCellGraphic = createUnitCell();
  scene.add(unitCellGraphic);

  resizeObserver = new ResizeObserver(resizeRenderer);
  resizeObserver.observe(elements.frame);
  resizeRenderer();

  elements.canvas.addEventListener("webglcontextlost", (event) => {
    event.preventDefault();
    elements.fallback.hidden = false;
    elements.fallback.textContent = "The 3D context was lost. Reload this page to restart the view.";
  });
}

function createUnitCell() {
  return state.crystalSystem === "hexagonal" ? createHexagonalUnitCell() : createCubicUnitCell();
}

function createCubicUnitCell() {
  const group = new THREE.Group();
  group.name = "Cubic unit cell";

  const cellFill = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshPhongMaterial({
      color: 0x8e96d9,
      transparent: true,
      opacity: 0.055,
      side: THREE.DoubleSide,
      depthWrite: false
    })
  );
  cellFill.position.set(0.5, 0.5, 0.5);
  cellFill.userData.printRole = "cell-fill";
  group.add(cellFill);

  const edgeGeometry = new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1));
  edgeGeometry.translate(0.5, 0.5, 0.5);
  const edges = new THREE.LineSegments(
    edgeGeometry,
    new THREE.LineBasicMaterial({ color: 0xf3f1ff, transparent: true, opacity: 0.92 })
  );
  edges.renderOrder = 5;
  edges.userData.printRole = "cell-edges";
  group.add(edges);

  const atomGeometry = new THREE.SphereGeometry(0.055, 22, 16);
  const atomMaterial = new THREE.MeshStandardMaterial({
    color: 0xdad6ff,
    roughness: 0.28,
    metalness: 0.08,
    emissive: 0x29255f,
    emissiveIntensity: 0.18
  });

  CUBE_VERTICES.forEach((point) => {
    const atom = new THREE.Mesh(atomGeometry, atomMaterial);
    atom.position.copy(toWorld(point));
    atom.userData.printRole = "corner-atom";
    group.add(atom);
  });

  addAxis(group, new THREE.Vector3(1, 0, 0), 0xff9a85, "a", [1.27, 0, 0]);
  addAxis(group, new THREE.Vector3(0, 0, 1), 0x8dd7ff, "b", [0, 0, 1.27]);
  addAxis(group, new THREE.Vector3(0, 1, 0), 0xb9f09e, "c", [0, 1.27, 0]);

  const originLabel = makeLabelSprite("O", "#ffffff", "rgba(18, 23, 67, 0.78)");
  originLabel.position.set(-0.1, -0.08, -0.09);
  group.add(originLabel);

  return group;
}

function createHexagonalUnitCell() {
  const group = new THREE.Group();
  group.name = "Hexagonal unit cell";

  const fill = new THREE.Mesh(
    new THREE.CylinderGeometry(HEX_RADIUS, HEX_RADIUS, HEX_HEIGHT, 6),
    new THREE.MeshPhongMaterial({
      color: 0x8e96d9,
      transparent: true,
      opacity: 0.055,
      side: THREE.DoubleSide,
      depthWrite: false
    })
  );
  fill.position.copy(HEX_CENTER);
  fill.rotation.y = Math.PI / 2;
  fill.userData.printRole = "cell-fill";
  group.add(fill);

  const edgePoints = [];
  HEX_EDGES.forEach(([start, end]) => {
    edgePoints.push(new THREE.Vector3(...HEX_VERTICES[start]), new THREE.Vector3(...HEX_VERTICES[end]));
  });
  const edges = new THREE.LineSegments(
    new THREE.BufferGeometry().setFromPoints(edgePoints),
    new THREE.LineBasicMaterial({ color: 0xf3f1ff, transparent: true, opacity: 0.92 })
  );
  edges.renderOrder = 5;
  edges.userData.printRole = "cell-edges";
  group.add(edges);

  const atomGeometry = new THREE.SphereGeometry(0.05, 22, 16);
  const atomMaterial = new THREE.MeshStandardMaterial({
    color: 0xdad6ff,
    roughness: 0.28,
    metalness: 0.08,
    emissive: 0x29255f,
    emissiveIntensity: 0.18
  });
  HEX_VERTICES.forEach((point) => {
    const atom = new THREE.Mesh(atomGeometry, atomMaterial);
    atom.position.set(...point);
    atom.userData.printRole = "corner-atom";
    group.add(atom);
  });

  const origin = new THREE.Vector3(0.5, 0, 0.5);
  addAxis(group, new THREE.Vector3(1, 0, 0), 0xff9a85, "a₁", [1.25, 0, 0.5], origin, 0.68);
  addAxis(group, new THREE.Vector3(-0.5, 0, Math.sqrt(3) / 2), 0x8dd7ff, "a₂", [0.12, 0, 1.16], origin, 0.68);
  addAxis(group, new THREE.Vector3(-0.5, 0, -Math.sqrt(3) / 2), 0xd9a7ff, "a₃", [-0.02, -0.1, -0.4], origin, 0.68);
  addAxis(group, new THREE.Vector3(0, 1, 0), 0xb9f09e, "c", [0.5, 1.35, 0.5], origin, 1.25);

  const originLabel = makeLabelSprite("O", "#ffffff", "rgba(18, 23, 67, 0.78)");
  originLabel.position.set(0.42, -0.08, 0.42);
  group.add(originLabel);
  return group;
}

function addAxis(group, direction, color, label, labelPosition, origin = new THREE.Vector3(0, 0, 0), length = 1.18) {
  const arrow = new THREE.ArrowHelper(direction.clone().normalize(), origin, length, color, 0.08, 0.045);
  arrow.traverse((part) => {
    if (part.material) part.userData.printRole = `axis-${label}`;
  });
  group.add(arrow);

  const sprite = makeLabelSprite(label, "#ffffff", "rgba(18, 23, 67, 0.78)");
  sprite.position.set(...labelPosition);
  group.add(sprite);
}

function bindControls() {
  [elements.directionInputs[0], elements.directionInputs[1], elements.directionInputs[3], elements.planeInputs[0], elements.planeInputs[1], elements.planeInputs[3]].forEach((input) => {
    input.addEventListener("input", updateCalculatedHexIndices);
  });

  elements.crystalSystem.addEventListener("change", () => {
    setCrystalSystem(elements.crystalSystem.value);
  });

  elements.directionForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (state.crystalSystem === "hexagonal") updateCalculatedHexIndices();
    const indices = readIndices(activeDirectionInputs(), elements.directionMessage, "direction");
    if (!indices) return;
    if (state.crystalSystem === "hexagonal" && indices[0] + indices[1] + indices[2] !== 0) {
      setMessage(elements.directionMessage, "Hexagonal direction indices must satisfy u + v + t = 0.", true);
      return;
    }
    if (indices.every((value) => value === 0)) {
      setMessage(elements.directionMessage, `${formatIndices(indices, "[")} does not define a direction.`, true);
      return;
    }

    const reduced = reduceDirection(indices);
    state.direction = reduced;
    state.directionVisible = true;
    plotDirection(reduced);

    if (!indices.every((value, index) => value === reduced[index])) {
      setMessage(elements.directionMessage, `Plotted the equivalent reduced direction ${formatIndices(reduced, "[")} for the entered ${formatIndices(indices, "[")}.`);
    } else {
      updateDirectionMessage();
    }
    updateSummary();
  });

  elements.planeForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (state.crystalSystem === "hexagonal") updateCalculatedHexIndices();
    const indices = readIndices(activePlaneInputs(), elements.planeMessage, "plane");
    if (!indices) return;
    if (state.crystalSystem === "hexagonal" && indices[2] !== -(indices[0] + indices[1])) {
      setMessage(elements.planeMessage, "For Miller–Bravais planes, i must equal −(h + k).", true);
      return;
    }
    if (indices.every((value) => value === 0)) {
      setMessage(elements.planeMessage, `${formatIndices(indices, "(")} does not define a plane.`, true);
      return;
    }

    state.plane = indices;
    state.planeVisible = true;
    plotPlane(indices);
    updatePlaneMessage(indices, state.planeOffset);
    updateSummary();
  });

  elements.directionPreset.addEventListener("change", () => {
    applyPreset(elements.directionPreset, activeDirectionInputs(), elements.directionForm);
  });

  elements.planePreset.addEventListener("change", () => {
    applyPreset(elements.planePreset, activePlaneInputs(), elements.planeForm);
  });

  elements.clearDirection.addEventListener("click", () => {
    state.directionVisible = false;
    if (directionGraphic) directionGraphic.visible = false;
    setMessage(elements.directionMessage, "Direction hidden.");
    updateSummary();
  });

  elements.clearPlane.addEventListener("click", () => {
    state.planeVisible = false;
    if (planeGraphic) planeGraphic.visible = false;
    setMessage(elements.planeMessage, "Plane hidden.");
    updateSummary();
  });

  elements.showDirectionFamily.addEventListener("change", () => {
    state.showDirectionFamily = elements.showDirectionFamily.checked;
    state.directionVisible = true;
    plotDirection(state.direction);
    updateDirectionMessage();
    updateSummary();
  });

  elements.showParallelDirections.addEventListener("change", () => {
    state.showParallelDirections = elements.showParallelDirections.checked;
    state.directionVisible = true;
    plotDirection(state.direction);
    updateDirectionMessage();
    updateSummary();
  });

  elements.showPlaneFamily.addEventListener("change", () => {
    state.showPlaneFamily = elements.showPlaneFamily.checked;
    state.planeVisible = true;
    plotPlane(state.plane);
    updatePlaneMessage(state.plane, state.planeOffset);
    updateSummary();
  });

  elements.showParallelPlanes.addEventListener("change", () => {
    state.showParallelPlanes = elements.showParallelPlanes.checked;
    state.planeVisible = true;
    plotPlane(state.plane);
    updatePlaneMessage(state.plane, state.planeOffset);
    updateSummary();
  });

  elements.viewOrientation.addEventListener("change", () => {
    if (!camera || !controls) return;
    const view = elements.viewOrientation.value;
    if (view === "reset") {
      setProjection("perspective");
      resetCamera();
      controls.target.copy(currentCellCenter());
      camera.lookAt(controls.target);
      controls.update();
      elements.viewOrientation.value = "perspective";
      return;
    }
    setProjection(view);
  });

  elements.downloadPng.addEventListener("click", downloadCurrentFigure);
}

function activeDirectionInputs() {
  return state.crystalSystem === "hexagonal"
    ? elements.directionInputs
    : [elements.directionInputs[0], elements.directionInputs[1], elements.directionInputs[3]];
}

function activePlaneInputs() {
  return state.crystalSystem === "hexagonal"
    ? elements.planeInputs
    : [elements.planeInputs[0], elements.planeInputs[1], elements.planeInputs[3]];
}

function setCrystalSystem(system) {
  state.crystalSystem = system === "hexagonal" ? "hexagonal" : "cubic";
  const isHexagonal = state.crystalSystem === "hexagonal";

  document.querySelectorAll(".hex-index").forEach((label) => {
    label.hidden = !isHexagonal;
    const input = label.querySelector("input");
    input.required = isHexagonal;
  });

  elements.directionForm.querySelector(".index-fields").classList.toggle("has-four-indices", isHexagonal);
  elements.planeForm.querySelector(".index-fields").classList.toggle("has-four-indices", isHexagonal);
  document.querySelectorAll(".hex-conversion").forEach((output) => { output.hidden = !isHexagonal; });

  elements.cellKicker.textContent = isHexagonal ? "Hexagonal unit cell" : "Cubic unit cell";
  elements.canvas.setAttribute(
    "aria-label",
    `Interactive ${state.crystalSystem} unit cell showing the selected crystallographic direction and Miller plane. Drag to rotate, scroll to zoom, and right-drag to pan.`
  );
  elements.directionTitle.textContent = isHexagonal ? "Plot [u v t w]" : "Plot [u v w]";
  elements.directionFamilyLabel.textContent = isHexagonal
    ? "Show symmetry-equivalent family ⟨u v t w⟩"
    : "Show symmetry-equivalent family ⟨u v w⟩";
  elements.planeTitle.textContent = isHexagonal ? "Plot (h k i l)" : "Plot (h k l)";
  elements.planeFamilyLabel.textContent = isHexagonal
    ? "Show symmetry-equivalent family {h k i l}"
    : "Show symmetry-equivalent family {h k l}";
  elements.directionNote.innerHTML = isHexagonal
    ? "Enter <b>u</b>, <b>v</b>, and <b>w</b>. The read-only <b>t = −(u + v)</b>. Conversion uses <b>U = u − t</b>, <b>V = v − t</b>, and <b>W = w</b>; the plotted vector is <b>U·a₁ + V·a₂ + W·c</b>."
    : "The three integers give relative steps along the <b>a</b>, <b>b</b>, and <b>c</b> axes.";
  elements.planeNote.innerHTML = isHexagonal
    ? "Enter <b>h</b>, <b>k</b>, and <b>l</b>. The read-only <b>i = −(h + k)</b>. The converted three-index plane is <b>(H K L) = (h k l)</b>."
    : "A zero index means the plane is parallel to that axis. A negative index places its intercept on the negative axis.";
  elements.crystalNoteTitle.textContent = isHexagonal ? "Hexagonal indexing" : "Cubic-crystal shortcut";
  elements.crystalNote.textContent = isHexagonal
    ? "Hexagonal crystals use four indices so the three equivalent basal axes are represented symmetrically."
    : "The normal to plane (h k l) is parallel to direction [h k l] in a cubic crystal.";

  if (isHexagonal) {
    state.direction = [1, 0, -1, 0];
    state.plane = [1, 0, -1, 0];
    setInputValues(elements.directionInputs, state.direction);
    setInputValues(elements.planeInputs, state.plane);
    updateCalculatedHexIndices();
    setPresetOptions(elements.directionPreset, [
      ["", "Choose an example"],
      ["1,0,-1,0", "[1 0 1̄ 0] a₁ direction"],
      ["0,1,-1,0", "[0 1 1̄ 0] a₂ direction"],
      ["0,0,0,1", "[0 0 0 1] c-axis direction"],
      ["1,0,-1,1", "[1 0 1̄ 1] a₁ + c direction"]
    ]);
    setPresetOptions(elements.planePreset, [
      ["", "Choose an example"],
      ["1,0,-1,0", "(1 0 1̄ 0) prism plane"],
      ["0,0,0,1", "(0 0 0 1) basal plane"],
      ["1,0,-1,1", "(1 0 1̄ 1) pyramidal plane"]
    ]);
  } else {
    state.direction = [1, 1, 0];
    state.plane = [1, 1, 1];
    setInputValues(activeDirectionInputs(), state.direction);
    setInputValues(activePlaneInputs(), state.plane);
    setPresetOptions(elements.directionPreset, [
      ["", "Choose an example"], ["1,0,0", "[1 0 0] cube edge"],
      ["1,1,0", "[1 1 0] face diagonal"], ["1,1,1", "[1 1 1] body diagonal"],
      ["1,-1,0", "[1 1̄ 0] negative index"]
    ]);
    setPresetOptions(elements.planePreset, [
      ["", "Choose an example"], ["1,0,0", "(1 0 0) cube face"],
      ["1,1,0", "(1 1 0) diagonal plane"], ["1,1,1", "(1 1 1) triangular plane"],
      ["1,-1,0", "(1 1̄ 0) negative index"]
    ]);
  }

  if (scene) {
    disposeGraphic(unitCellGraphic);
    unitCellGraphic = createUnitCell();
    scene.add(unitCellGraphic);
    plotDirection(state.direction);
    plotPlane(state.plane);
    resetCamera();
    controls.target.copy(isHexagonal ? HEX_CENTER : new THREE.Vector3(0.5, 0.5, 0.5));
    controls.update();
  }
  state.directionVisible = true;
  state.planeVisible = true;
  elements.directionMessage.textContent = "";
  elements.planeMessage.textContent = "";
  if (state.showDirectionFamily || state.showParallelDirections) updateDirectionMessage();
  if (state.showPlaneFamily || state.showParallelPlanes) updatePlaneMessage(state.plane, state.planeOffset);
  updateSummary();
}

function setInputValues(inputs, values) {
  inputs.forEach((input, index) => { input.value = values[index]; });
}

function updateCalculatedHexIndices() {
  if (state.crystalSystem !== "hexagonal") return;

  const directionHasBasalInputs = elements.directionInputs[0].value.trim() !== "" && elements.directionInputs[1].value.trim() !== "";
  const u = Number(elements.directionInputs[0].value);
  const v = Number(elements.directionInputs[1].value);
  const w = Number(elements.directionInputs[3].value);
  if (directionHasBasalInputs && [u, v].every(Number.isInteger)) {
    elements.directionInputs[2].value = String(-(u + v));
  } else {
    elements.directionInputs[2].value = "";
  }
  const t = Number(elements.directionInputs[2].value);
  const directionComplete = directionHasBasalInputs && elements.directionInputs[3].value.trim() !== "";
  if (directionComplete && [u, v, t, w].every(Number.isInteger)) {
    const fourIndex = [u, v, t, w];
    const rawThreeIndex = convertHexDirectionToThree(fourIndex, false);
    const reducedThreeIndex = reduceDirection(rawThreeIndex);
    const reduction = rawThreeIndex.every((value, index) => value === reducedThreeIndex[index])
      ? ""
      : ` ≡ ${formatIndices(reducedThreeIndex, "[")}`;
    elements.directionConversion.textContent = `${formatIndices(fourIndex, "[")} → three-index ${formatIndices(rawThreeIndex, "[")}${reduction}`;
  } else {
    elements.directionConversion.textContent = "";
  }

  const planeHasBasalInputs = elements.planeInputs[0].value.trim() !== "" && elements.planeInputs[1].value.trim() !== "";
  const h = Number(elements.planeInputs[0].value);
  const k = Number(elements.planeInputs[1].value);
  const l = Number(elements.planeInputs[3].value);
  if (planeHasBasalInputs && [h, k].every(Number.isInteger)) {
    elements.planeInputs[2].value = String(-(h + k));
  } else {
    elements.planeInputs[2].value = "";
  }
  const i = Number(elements.planeInputs[2].value);
  const planeComplete = planeHasBasalInputs && elements.planeInputs[3].value.trim() !== "";
  if (planeComplete && [h, k, i, l].every(Number.isInteger)) {
    const fourIndex = [h, k, i, l];
    elements.planeConversion.textContent = `${formatIndices(fourIndex, "(")} → three-index ${formatIndices(convertHexPlaneToThree(fourIndex), "(")}`;
  } else {
    elements.planeConversion.textContent = "";
  }
}

function convertHexDirectionToThree([u, v, t, w], reduce = true) {
  const converted = [u - t, v - t, w];
  return reduce ? reduceDirection(converted) : converted;
}

function convertHexPlaneToThree([h, k, _i, l]) {
  return [h, k, l];
}

function setPresetOptions(select, options) {
  select.replaceChildren(...options.map(([value, label]) => new Option(label, value)));
}

function plotDirection(indices) {
  if (!scene) return;
  disposeGraphic(directionGraphic);

  directionGraphic = new THREE.Group();
  const familyIndices = state.showDirectionFamily ? getDirectionFamilyIndices(indices) : [indices];
  familyIndices.forEach((memberIndices, index) => {
    const segment = getDirectionWorldSegment(memberIndices);
    const arrow = createThickArrow(segment.start, segment.end, DIRECTION_COLOR);
    directionGraphic.add(arrow);

    if (index === 0) {
      const opening = state.showDirectionFamily ? "<" : "[";
      const label = makeLabelSprite(formatIndices(indices, opening), "#ffffff", "rgba(166, 45, 24, 0.9)");
      const midpoint = segment.start.clone().lerp(segment.end, 0.55);
      label.position.copy(midpoint.add(new THREE.Vector3(0.08, 0.1, 0.07)));
      directionGraphic.add(label);
    }
  });

  if (state.showParallelDirections) {
    getParallelDirectionSegments(indices).forEach(({ start, end }) => {
      directionGraphic.add(createThickArrow(start, end, DIRECTION_COLOR));
    });
  }

  directionGraphic.visible = true;
  directionGraphic.name = state.showDirectionFamily
    ? `Direction family ${formatIndices(indices, "<")}`
    : `Direction ${formatIndices(indices, "[")}`;
  scene.add(directionGraphic);
}

function getDirectionWorldSegment(indices) {
  const segment = state.crystalSystem === "hexagonal"
    ? hexagonalDirectionSegment(indices)
    : directionSegment(indices);
  return state.crystalSystem === "hexagonal"
    ? segment
    : { start: toWorld(segment.start), end: toWorld(segment.end) };
}

function directionSegment(indices) {
  const maxComponent = Math.max(...indices.map((value) => Math.abs(value)));
  const step = indices.map((value) => value / maxComponent);
  const start = indices.map((value) => (value < 0 ? 1 : 0));
  const end = start.map((value, index) => value + step[index]);
  return { start, end };
}

function hexagonalDirectionSegment(indices) {
  const [U, V, W] = convertHexDirectionToThree(indices);
  const a1 = new THREE.Vector3(HEX_RADIUS, 0, 0);
  const a2 = new THREE.Vector3(-HEX_RADIUS / 2, 0, HEX_RADIUS * Math.sqrt(3) / 2);
  const vector = new THREE.Vector3()
    .addScaledVector(a1, U)
    .addScaledVector(a2, V)
    .add(new THREE.Vector3(0, W * HEX_HEIGHT, 0));
  const maxHorizontal = Math.hypot(vector.x, vector.z);
  const horizontalScale = maxHorizontal > EPSILON ? HEX_RADIUS / maxHorizontal : Infinity;
  const verticalScale = Math.abs(vector.y) > EPSILON ? HEX_HEIGHT / Math.abs(vector.y) : Infinity;
  vector.multiplyScalar(Math.min(horizontalScale, verticalScale));
  const start = new THREE.Vector3(0.5, 0, 0.5);
  const end = start.clone().add(vector);
  return { start, end };
}

function getParallelDirectionSegments(indices) {
  const primary = getDirectionWorldSegment(indices);
  const delta = primary.end.clone().sub(primary.start).multiplyScalar(0.44);
  const anchors = state.crystalSystem === "hexagonal" ? hexagonalVectorAnchors() : cubicVectorAnchors();
  const candidates = anchors
    .map((start) => ({ start, end: start.clone().add(delta) }))
    .filter(({ start, end }) => isPointInsideCurrentCell(start) && isPointInsideCurrentCell(end))
    .filter(({ start }) => start.distanceTo(primary.start) > 0.18);
  const selected = [];
  candidates.forEach((candidate) => {
    if (selected.length < 3 && selected.every(({ start }) => start.distanceTo(candidate.start) > 0.3)) selected.push(candidate);
  });
  return selected;
}

function cubicVectorAnchors() {
  const values = [0.18, 0.5, 0.82];
  const anchors = [];
  values.forEach((x) => values.forEach((y) => values.forEach((z) => anchors.push(new THREE.Vector3(x, y, z)))));
  return anchors;
}

function hexagonalVectorAnchors() {
  const anchors = [new THREE.Vector3(0.5, HEX_HEIGHT * 0.48, 0.5)];
  [HEX_HEIGHT * 0.22, HEX_HEIGHT * 0.58].forEach((y) => {
    for (let index = 0; index < 6; index += 1) {
      const angle = index * Math.PI / 3;
      anchors.push(new THREE.Vector3(0.5 + 0.27 * Math.cos(angle), y, 0.5 + 0.27 * Math.sin(angle)));
    }
  });
  return anchors;
}

function isPointInsideCurrentCell(point) {
  if (state.crystalSystem === "cubic") {
    return point.x >= -EPSILON && point.x <= 1 + EPSILON && point.y >= -EPSILON && point.y <= 1 + EPSILON && point.z >= -EPSILON && point.z <= 1 + EPSILON;
  }
  if (point.y < -EPSILON || point.y > HEX_HEIGHT + EPSILON) return false;
  const x = Math.abs(point.x - 0.5);
  const z = Math.abs(point.z - 0.5);
  return x <= HEX_RADIUS + EPSILON && Math.sqrt(3) * x + z <= Math.sqrt(3) * HEX_RADIUS + EPSILON;
}

function createThickArrow(start, end, color) {
  const group = new THREE.Group();
  const direction = end.clone().sub(start);
  const length = direction.length();
  const unit = direction.clone().normalize();
  const headLength = Math.min(0.17, length * 0.26);
  const shaftLength = Math.max(length - headLength, length * 0.55);
  const rotation = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), unit);

  const material = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.3,
    metalness: 0.05,
    emissive: 0x54150b,
    emissiveIntensity: 0.12
  });

  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, shaftLength, 18), material);
  shaft.position.copy(start).addScaledVector(unit, shaftLength / 2);
  shaft.quaternion.copy(rotation);
  shaft.userData.printRole = "direction";
  group.add(shaft);

  const head = new THREE.Mesh(new THREE.ConeGeometry(0.065, headLength, 22), material);
  head.position.copy(start).addScaledVector(unit, shaftLength + headLength / 2);
  head.quaternion.copy(rotation);
  head.userData.printRole = "direction";
  group.add(head);

  const tail = new THREE.Mesh(new THREE.SphereGeometry(0.038, 18, 12), material);
  tail.position.copy(start);
  tail.userData.printRole = "direction";
  group.add(tail);

  return group;
}

function plotPlane(indices) {
  if (!scene) return;
  disposeGraphic(planeGraphic);

  planeGraphic = new THREE.Group();
  const familyIndices = state.showPlaneFamily ? getPlaneFamilyIndices(indices) : [indices];
  familyIndices.forEach((memberIndices, index) => {
    const member = createPlaneMember(memberIndices, index === 0, familyIndices.length);
    if (member) planeGraphic.add(member);
  });

  planeGraphic.visible = true;
  planeGraphic.name = state.showPlaneFamily
    ? `Plane family ${formatIndices(indices, "{")}`
    : `Plane ${formatIndices(indices, "(")}`;
  scene.add(planeGraphic);
}

function createPlaneMember(indices, isPrimary, familySize) {
  const member = new THREE.Group();
  const clippings = state.showParallelPlanes
    ? getParallelPlaneClippings(indices)
    : [state.crystalSystem === "hexagonal" ? chooseVisibleHexagonalPlane(indices) : chooseVisiblePlane(indices)];
  if (isPrimary) state.planeOffset = clippings[0].offset;
  clippings.forEach((clipped, clippingIndex) => {
    member.add(createPlaneSurface(indices, clipped, isPrimary && clippingIndex === 0, familySize, clippings.length));
  });
  return member;
}

function createPlaneSurface(indices, clipped, showLabel, familySize, parallelCount) {
  const surface = new THREE.Group();
  const worldPoints = state.crystalSystem === "hexagonal"
    ? clipped.points.map((point) => new THREE.Vector3(...point))
    : clipped.points.map(toWorld);
  const positions = [];
  worldPoints.forEach((point) => positions.push(point.x, point.y, point.z));

  const triangles = [];
  for (let index = 1; index < worldPoints.length - 1; index += 1) {
    triangles.push(0, index, index + 1);
  }

  const fillGeometry = new THREE.BufferGeometry();
  fillGeometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  fillGeometry.setIndex(triangles);
  fillGeometry.computeVertexNormals();

  const fill = new THREE.Mesh(
    fillGeometry,
    new THREE.MeshPhongMaterial({
      color: PLANE_COLOR,
      transparent: true,
      opacity: familySize > 1 || parallelCount > 1 ? 0.18 : 0.42,
      side: THREE.DoubleSide,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
      shininess: 70
    })
  );
  fill.renderOrder = 2;
  fill.userData.printRole = "plane-fill";
  surface.add(fill);

  const outlineGeometry = new THREE.BufferGeometry().setFromPoints(worldPoints);
  const outline = new THREE.LineLoop(
    outlineGeometry,
    new THREE.LineBasicMaterial({ color: 0xb8fff5, transparent: true, opacity: familySize > 1 || parallelCount > 1 ? 0.65 : 0.95 })
  );
  outline.renderOrder = 4;
  outline.userData.printRole = "plane-outline";
  surface.add(outline);

  if (showLabel) {
    const centroid = worldPoints.reduce((sum, point) => sum.add(point), new THREE.Vector3()).multiplyScalar(1 / worldPoints.length);
    const normal = state.crystalSystem === "hexagonal"
      ? hexagonalPlaneNormal(indices)
      : toWorldVector(indices).normalize();
    const opening = state.showPlaneFamily ? "{" : "(";
    const planeLabel = makeLabelSprite(formatIndices(indices, opening), "#082f35", "rgba(184, 255, 245, 0.94)");
    planeLabel.position.copy(centroid.addScaledVector(normal, 0.035));
    surface.add(planeLabel);
  }

  return surface;
}

function getParallelPlaneClippings(indices) {
  if (state.crystalSystem === "hexagonal") {
    const normal = hexagonalPlaneNormal(indices);
    const dots = HEX_VERTICES.map((point) => normal.dot(new THREE.Vector3(...point)));
    const minimum = Math.min(...dots);
    const maximum = Math.max(...dots);
    const offsets = [0.5, 0.24, 0.76].map((fraction) => minimum + fraction * (maximum - minimum));
    return offsets
      .map((offset) => clipWorldPlaneToCell(normal, offset, HEX_VERTICES, HEX_EDGES))
      .filter(Boolean)
      .map((clipped) => ({ ...clipped, offset: 1 }));
  }

  const primary = chooseVisiblePlane(indices);
  const minDot = indices.reduce((sum, value) => sum + Math.min(0, value), 0);
  const maxDot = indices.reduce((sum, value) => sum + Math.max(0, value), 0);
  const clippings = [primary];
  for (let offset = Math.ceil(minDot); offset <= Math.floor(maxDot); offset += 1) {
    if (Math.abs(offset - primary.offset) < EPSILON) continue;
    const clipped = clipPlaneToCube(indices, offset);
    if (clipped && clipped.area > EPSILON) clippings.push({ ...clipped, offset });
  }
  return clippings;
}

function getDirectionFamilyIndices(indices) {
  return getPlaneFamilyIndices(indices);
}

function getPlaneFamilyIndices(indices) {
  if (state.crystalSystem === "hexagonal") {
    const [h, k, i, l] = indices;
    const basalPermutations = uniquePermutations([h, k, i]);
    const members = [
      ...basalPermutations.map((values) => [...values, l]),
      ...basalPermutations.map((values) => values.map((value) => -value).concat(-l))
    ];
    return uniqueIndexSets(members, indices);
  }

  const permutations = uniquePermutations(indices);
  const members = [];
  permutations.forEach((values) => {
    const nonzeroPositions = values.map((value, index) => value === 0 ? null : index).filter((index) => index !== null);
    const signCount = 2 ** nonzeroPositions.length;
    for (let mask = 0; mask < signCount; mask += 1) {
      const member = [...values];
      nonzeroPositions.forEach((position, signIndex) => {
        member[position] = Math.abs(member[position]) * ((mask >> signIndex) & 1 ? -1 : 1);
      });
      members.push(member);
    }
  });
  return uniqueIndexSets(members, indices);
}

function uniquePermutations(values) {
  const results = [];
  values.forEach((first, firstIndex) => {
    values.forEach((second, secondIndex) => {
      values.forEach((third, thirdIndex) => {
        if (new Set([firstIndex, secondIndex, thirdIndex]).size === 3) results.push([first, second, third]);
      });
    });
  });
  return uniqueIndexSets(results);
}

function uniqueIndexSets(members, primary = null) {
  const unique = [];
  const seen = new Set();
  const add = (member) => {
    const key = member.join(",");
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(member);
    }
  };
  if (primary) add(primary);
  members.forEach(add);
  return unique;
}

function hexagonalPlaneNormal(indices) {
  const [h, k, l] = convertHexPlaneToThree(indices);
  const reciprocalA1 = new THREE.Vector3(1 / HEX_RADIUS, 0, 1 / (Math.sqrt(3) * HEX_RADIUS));
  const reciprocalA2 = new THREE.Vector3(0, 0, 2 / (Math.sqrt(3) * HEX_RADIUS));
  return new THREE.Vector3()
    .addScaledVector(reciprocalA1, h)
    .addScaledVector(reciprocalA2, k)
    .add(new THREE.Vector3(0, l / HEX_HEIGHT, 0))
    .normalize();
}

function chooseVisibleHexagonalPlane(indices) {
  const normal = hexagonalPlaneNormal(indices);
  const offset = normal.dot(HEX_CENTER);
  const clipped = clipWorldPlaneToCell(normal, offset, HEX_VERTICES, HEX_EDGES);
  if (!clipped) throw new Error("Unable to intersect the selected plane with the hexagonal unit cell.");
  return { ...clipped, offset: 1 };
}

function clipWorldPlaneToCell(normal, offset, vertices, edges) {
  const points = [];
  edges.forEach(([startIndex, endIndex]) => {
    const start = vertices[startIndex];
    const end = vertices[endIndex];
    const startValue = normal.dot(new THREE.Vector3(...start)) - offset;
    const endValue = normal.dot(new THREE.Vector3(...end)) - offset;
    if (Math.abs(startValue) < EPSILON) addUniquePoint(points, start);
    if (Math.abs(endValue) < EPSILON) addUniquePoint(points, end);
    const crosses = (startValue < -EPSILON && endValue > EPSILON) || (startValue > EPSILON && endValue < -EPSILON);
    if (crosses) {
      const amount = startValue / (startValue - endValue);
      addUniquePoint(points, start.map((value, index) => value + amount * (end[index] - value)));
    }
  });
  if (points.length < 3) return null;
  const center = points.reduce((sum, point) => sum.add(new THREE.Vector3(...point)), new THREE.Vector3()).multiplyScalar(1 / points.length);
  const helper = Math.abs(normal.x) < 0.85 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
  const axisU = new THREE.Vector3().crossVectors(normal, helper).normalize();
  const axisV = new THREE.Vector3().crossVectors(normal, axisU).normalize();
  points.sort((first, second) => {
    const firstRelative = new THREE.Vector3(...first).sub(center);
    const secondRelative = new THREE.Vector3(...second).sub(center);
    return Math.atan2(firstRelative.dot(axisV), firstRelative.dot(axisU)) - Math.atan2(secondRelative.dot(axisV), secondRelative.dot(axisU));
  });
  const areaVector = new THREE.Vector3();
  points.forEach((point, index) => {
    const next = points[(index + 1) % points.length];
    areaVector.add(new THREE.Vector3(...point).cross(new THREE.Vector3(...next)));
  });
  return { points, area: Math.abs(areaVector.dot(normal)) / 2 };
}

function chooseVisiblePlane(normal) {
  const minDot = normal.reduce((sum, value) => sum + Math.min(0, value), 0);
  const maxDot = normal.reduce((sum, value) => sum + Math.max(0, value), 0);
  const candidates = [];

  for (let offset = Math.ceil(minDot); offset <= Math.floor(maxDot); offset += 1) {
    const clipped = clipPlaneToCube(normal, offset);
    if (clipped && clipped.area > EPSILON) {
      candidates.push({ ...clipped, offset });
    }
  }

  const conventional = candidates.find((candidate) => candidate.offset === 1);
  if (conventional) return conventional;

  candidates.sort((first, second) => {
    const distanceDifference = Math.abs(first.offset - 1) - Math.abs(second.offset - 1);
    return distanceDifference || second.area - first.area;
  });

  if (candidates.length > 0) return candidates[0];

  const fallbackOffset = (minDot + maxDot) / 2;
  const fallback = clipPlaneToCube(normal, fallbackOffset);
  if (!fallback) throw new Error("Unable to intersect the selected plane with the unit cell.");
  return { ...fallback, offset: fallbackOffset };
}

function clipPlaneToCube(normal, offset) {
  const points = [];

  CUBE_EDGES.forEach(([startIndex, endIndex]) => {
    const start = CUBE_VERTICES[startIndex];
    const end = CUBE_VERTICES[endIndex];
    const startValue = dot(normal, start) - offset;
    const endValue = dot(normal, end) - offset;

    if (Math.abs(startValue) < EPSILON) addUniquePoint(points, start);
    if (Math.abs(endValue) < EPSILON) addUniquePoint(points, end);

    const crossesPlane =
      (startValue < -EPSILON && endValue > EPSILON) ||
      (startValue > EPSILON && endValue < -EPSILON);

    if (crossesPlane) {
      const amount = startValue / (startValue - endValue);
      const intersection = start.map((value, index) => value + amount * (end[index] - value));
      addUniquePoint(points, intersection);
    }
  });

  if (points.length < 3) return null;

  const centroid = [0, 0, 0];
  points.forEach((point) => {
    centroid[0] += point[0];
    centroid[1] += point[1];
    centroid[2] += point[2];
  });
  centroid.forEach((value, index) => {
    centroid[index] = value / points.length;
  });

  const normalVector = new THREE.Vector3(...normal).normalize();
  const helper = Math.abs(normalVector.x) < 0.85
    ? new THREE.Vector3(1, 0, 0)
    : new THREE.Vector3(0, 1, 0);
  const axisU = new THREE.Vector3().crossVectors(normalVector, helper).normalize();
  const axisV = new THREE.Vector3().crossVectors(normalVector, axisU).normalize();
  const centerVector = new THREE.Vector3(...centroid);

  points.sort((first, second) => {
    const firstRelative = new THREE.Vector3(...first).sub(centerVector);
    const secondRelative = new THREE.Vector3(...second).sub(centerVector);
    const firstAngle = Math.atan2(firstRelative.dot(axisV), firstRelative.dot(axisU));
    const secondAngle = Math.atan2(secondRelative.dot(axisV), secondRelative.dot(axisU));
    return firstAngle - secondAngle;
  });

  const areaVector = new THREE.Vector3();
  points.forEach((point, index) => {
    const nextPoint = points[(index + 1) % points.length];
    areaVector.add(new THREE.Vector3(...point).cross(new THREE.Vector3(...nextPoint)));
  });
  const area = Math.abs(areaVector.dot(normalVector)) / 2;

  return { points, area };
}

function addUniquePoint(points, candidate) {
  const duplicate = points.some((point) =>
    Math.abs(point[0] - candidate[0]) < EPSILON &&
    Math.abs(point[1] - candidate[1]) < EPSILON &&
    Math.abs(point[2] - candidate[2]) < EPSILON
  );
  if (!duplicate) points.push([...candidate]);
}

function dot(first, second) {
  return first[0] * second[0] + first[1] * second[1] + first[2] * second[2];
}

function toWorld(point) {
  return new THREE.Vector3(point[0], point[2], point[1]);
}

function toWorldVector(vector) {
  return new THREE.Vector3(vector[0], vector[2], vector[1]);
}

function makeLabelSprite(text, textColor, backgroundColor) {
  const isCompactLabel = text.length === 1;
  const canvas = document.createElement("canvas");
  canvas.width = isCompactLabel ? 160 : 384;
  canvas.height = 144;
  const context = canvas.getContext("2d");

  context.fillStyle = backgroundColor;
  context.beginPath();
  context.roundRect(8, 8, canvas.width - 16, canvas.height - 16, 34);
  context.fill();

  context.fillStyle = textColor;
  context.font = "700 48px system-ui, sans-serif";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(text, canvas.width / 2, canvas.height / 2 + 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;

  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: false
  }));
  sprite.userData.exportLabel = true;
  const height = isCompactLabel ? 0.12 : 0.135;
  sprite.scale.set(height * (canvas.width / canvas.height), height, 1);
  sprite.renderOrder = 10;
  return sprite;
}

function readIndices(inputs, messageElement, noun) {
  if (inputs.some((input) => input.value.trim() === "")) {
    setMessage(messageElement, `Enter all three ${noun} indices.`, true);
    return null;
  }

  const values = inputs.map((input) => Number(input.value));
  const invalid = values.some((value, index) => {
    const input = inputs[index];
    const minimum = input.hasAttribute("min") ? Number(input.min) : -Infinity;
    const maximum = input.hasAttribute("max") ? Number(input.max) : Infinity;
    return !Number.isInteger(value) || value < minimum || value > maximum;
  });
  if (invalid) {
    setMessage(messageElement, `Each ${noun} index must be a whole number within the allowed range.`, true);
    return null;
  }
  return values;
}

function reduceDirection(indices) {
  const divisor = indices.reduce((result, value) => greatestCommonDivisor(result, Math.abs(value)), 0) || 1;
  return indices.map((value) => value / divisor);
}

function greatestCommonDivisor(first, second) {
  let a = Math.abs(first);
  let b = Math.abs(second);
  while (b) {
    [a, b] = [b, a % b];
  }
  return a;
}

function updatePlaneMessage(indices, offset) {
  if (state.showPlaneFamily || state.showParallelPlanes) {
    const messages = [];
    if (state.showPlaneFamily) messages.push(`${getPlaneFamilyIndices(indices).length} symmetry-equivalent orientations in ${formatIndices(indices, "{")}`);
    if (state.showParallelPlanes) messages.push(`${getParallelPlaneClippings(indices).length} parallel members${state.showPlaneFamily ? " per orientation" : ""}`);
    setMessage(elements.planeMessage, `Showing ${messages.join(" with ")}.`);
    return;
  }

  if (state.crystalSystem === "hexagonal") {
    const parallelAxes = indices
      .map((value, index) => (value === 0 ? ["a₁", "a₂", "a₃", "c"][index] : null))
      .filter(Boolean);
    setMessage(
      elements.planeMessage,
      parallelAxes.length > 0
        ? `A representative member is shown; it is parallel to the ${parallelAxes.join(" and ")} ${parallelAxes.length > 1 ? "axes" : "axis"}.`
        : "A representative member of this hexagonal plane family is shown."
    );
    return;
  }

  if (Math.abs(offset - 1) > EPSILON) {
    setMessage(
      elements.planeMessage,
      `The conventional intercept plane has no visible area in this cell; a parallel member of the same family is shown at offset ${formatNumber(offset)}.`
    );
    return;
  }

  const parallelAxes = indices
    .map((value, index) => (value === 0 ? ["a", "b", "c"][index] : null))
    .filter(Boolean);
  if (parallelAxes.length > 0) {
    setMessage(elements.planeMessage, `This plane is parallel to the ${parallelAxes.join(" and ")} ${parallelAxes.length > 1 ? "axes" : "axis"}.`);
  } else {
    setMessage(elements.planeMessage, "");
  }
}

function applyPreset(select, inputs, form) {
  if (!select.value) return;
  select.value.split(",").forEach((value, index) => {
    inputs[index].value = value;
  });
  if (state.crystalSystem === "hexagonal") updateCalculatedHexIndices();
  form.requestSubmit();
}

function setMessage(element, text, isError = false) {
  element.textContent = text;
  element.classList.toggle("is-error", isError);
  element.classList.toggle("is-note", Boolean(text) && !isError);
}

function downloadCurrentFigure() {
  if (!renderer || !scene || !camera) {
    setDownloadMessage("The PNG could not be created because the 3D view is unavailable.", true);
    return;
  }

  let restorePalette = () => {};
  let restoreLabels = () => {};
  try {
    restorePalette = applyPrintPalette();
    restoreLabels = hideExportLabels();
    renderer.render(scene, camera);

    const sourceCanvas = renderer.domElement;
    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = sourceCanvas.width;
    exportCanvas.height = sourceCanvas.height;
    const context = exportCanvas.getContext("2d");
    if (!context) throw new Error("A 2D drawing context is unavailable.");

    drawExportBackground(context, exportCanvas.width, exportCanvas.height);
    context.drawImage(sourceCanvas, 0, 0, exportCanvas.width, exportCanvas.height);

    const link = document.createElement("a");
    link.download = buildDownloadFilename();
    link.href = exportCanvas.toDataURL("image/png");
    document.body.append(link);
    link.click();
    link.remove();

    setDownloadMessage("PNG downloaded.");
  } catch (error) {
    console.error(error);
    setDownloadMessage("The PNG could not be created. Please try again.", true);
  } finally {
    restoreLabels();
    restorePalette();
    renderer.render(scene, camera);
  }
}

function drawExportBackground(context, width, height) {
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
}

function applyPrintPalette() {
  const modifiedMaterials = new Set();
  const snapshots = [];

  scene.traverse((object) => {
    const role = object.userData.printRole;
    if (!role || !object.material) return;

    const materials = Array.isArray(object.material) ? object.material : [object.material];
    materials.forEach((material) => {
      if (modifiedMaterials.has(material)) return;
      modifiedMaterials.add(material);
      snapshots.push({ material, values: captureMaterialValues(material) });
      setPrintMaterialValues(material, role);
    });
  });

  return () => {
    snapshots.forEach(({ material, values }) => restoreMaterialValues(material, values));
  };
}

function hideExportLabels() {
  const labels = [];
  scene.traverse((object) => {
    if (!object.userData.exportLabel) return;
    labels.push({ object, visible: object.visible });
    object.visible = false;
  });

  return () => {
    labels.forEach(({ object, visible }) => {
      object.visible = visible;
    });
  };
}

function captureMaterialValues(material) {
  const values = {};
  if (material.color) values.color = material.color.getHex();
  if (material.emissive) values.emissive = material.emissive.getHex();
  ["opacity", "transparent", "roughness", "metalness", "emissiveIntensity", "shininess"].forEach((property) => {
    if (property in material) values[property] = material[property];
  });
  return values;
}

function restoreMaterialValues(material, values) {
  if (material.color && values.color !== undefined) material.color.setHex(values.color);
  if (material.emissive && values.emissive !== undefined) material.emissive.setHex(values.emissive);
  Object.entries(values).forEach(([property, value]) => {
    if (property !== "color" && property !== "emissive") material[property] = value;
  });
  material.needsUpdate = true;
}

function setPrintMaterialValues(material, role) {
  const palette = {
    "cell-fill": { color: 0xe4eaf2, opacity: 0.1 },
    "cell-edges": { color: 0x28354f, opacity: 1 },
    "corner-atom": { color: 0x6b82a6, emissive: 0x000000, emissiveIntensity: 0, roughness: 0.42 },
    "axis-a": { color: 0xb83b2a, opacity: 1 },
    "axis-b": { color: 0x2166a5, opacity: 1 },
    "axis-c": { color: 0x2f7a43, opacity: 1 },
    "axis-a₁": { color: 0xb83b2a, opacity: 1 },
    "axis-a₂": { color: 0x2166a5, opacity: 1 },
    "axis-a₃": { color: 0x7a4ca5, opacity: 1 },
    direction: { color: 0xc93b1f, emissive: 0x000000, emissiveIntensity: 0 },
    "plane-fill": { color: 0x66a9c0, opacity: 0.34, shininess: 40 },
    "plane-outline": { color: 0x246879, opacity: 1 }
  };
  const values = palette[role];
  if (!values) return;

  if (material.color && values.color !== undefined) material.color.setHex(values.color);
  if (material.emissive && values.emissive !== undefined) material.emissive.setHex(values.emissive);
  Object.entries(values).forEach(([property, value]) => {
    if (property !== "color" && property !== "emissive" && property in material) material[property] = value;
  });
  material.needsUpdate = true;
}

function buildDownloadFilename() {
  const parts = ["miller-indices", state.crystalSystem];
  if (state.directionVisible) {
    parts.push(`${state.showDirectionFamily ? "direction-family" : "dir"}-${fileSafeIndices(state.direction)}`);
    if (state.showParallelDirections) parts.push("parallel-directions");
  }
  if (state.planeVisible) {
    parts.push(`${state.showPlaneFamily ? "plane-family" : "plane"}-${fileSafeIndices(state.plane)}`);
    if (state.showParallelPlanes) parts.push("parallel-planes");
  }
  return `${parts.join("-")}.png`;
}

function fileSafeIndices(indices) {
  return indices
    .map((value) => (value < 0 ? `m${Math.abs(value)}` : String(value)))
    .join("-");
}

function setDownloadMessage(text, isError = false) {
  elements.downloadMessage.textContent = text;
  elements.downloadMessage.classList.toggle("is-error", isError);
}

function updateSummary() {
  const visibleItems = [];
  if (state.directionVisible) {
    const directionText = state.showDirectionFamily
      ? `direction family ${formatIndices(state.direction, "<")}`
      : state.showParallelDirections
        ? `parallel direction vectors ${formatIndices(state.direction, "[")}`
        : `direction ${formatIndices(state.direction, "[")}`;
    visibleItems.push(state.showDirectionFamily && state.showParallelDirections ? `${directionText} with translated parallels` : directionText);
  }
  if (state.planeVisible) {
    const planeText = state.showPlaneFamily
      ? `plane family ${formatIndices(state.plane, "{")}`
      : state.showParallelPlanes
        ? `parallel plane members ${formatIndices(state.plane, "(")}`
        : `plane ${formatIndices(state.plane, "(")}`;
    visibleItems.push(state.showPlaneFamily && state.showParallelPlanes ? `${planeText} with parallel members` : planeText);
  }

  if (visibleItems.length === 0) {
    elements.summary.textContent = "No direction or plane is currently shown.";
  } else if (visibleItems.length === 1) {
    elements.summary.textContent = `Showing ${visibleItems[0]}.`;
  } else {
    elements.summary.textContent = `Showing ${visibleItems[0]} and ${visibleItems[1]}.`;
  }
}

function formatIndices(indices, openingBracket) {
  const displayOpening = openingBracket === "<" ? "⟨" : openingBracket;
  const closingBracket = openingBracket === "[" ? "]" : openingBracket === "{" ? "}" : openingBracket === "<" ? "⟩" : ")";
  return `${displayOpening}${indices.map(formatIndex).join(" ")}${closingBracket}`;
}

function updateDirectionMessage() {
  const messages = [];
  if (state.showDirectionFamily) messages.push(`${getDirectionFamilyIndices(state.direction).length} symmetry-equivalent directions in ${formatIndices(state.direction, "<")}`);
  if (state.showParallelDirections) messages.push(`${getParallelDirectionSegments(state.direction).length + 1} translated parallel vectors`);
  setMessage(elements.directionMessage, messages.length ? `Showing ${messages.join(" with ")}.` : "");
}

function formatIndex(value) {
  const rounded = Math.abs(value - Math.round(value)) < EPSILON ? Math.round(value) : Number(value.toFixed(2));
  if (rounded >= 0) return String(rounded);
  return `${Math.abs(rounded)}\u0305`;
}

function formatNumber(value) {
  const rounded = Math.abs(value - Math.round(value)) < EPSILON ? Math.round(value) : Number(value.toFixed(2));
  return String(rounded).replace("-", "−");
}

function resetCamera() {
  camera.up.set(0, 1, 0);
  camera.position.set(3.15, 2.35, 1.85);
  camera.zoom = 1;
  camera.lookAt(currentCellCenter());
  camera.updateProjectionMatrix();
}

function currentCellCenter() {
  return state.crystalSystem === "hexagonal" ? HEX_CENTER : new THREE.Vector3(0.5, 0.5, 0.5);
}

function createPerspectiveCamera(aspect) {
  return new THREE.PerspectiveCamera(38, aspect, 0.1, 100);
}

function createOrthographicCamera(aspect) {
  const halfHeight = 1.05;
  return new THREE.OrthographicCamera(-halfHeight * aspect, halfHeight * aspect, halfHeight, -halfHeight, 0.1, 100);
}

function createOrbitControls(controlCamera, target) {
  const orbitControls = new OrbitControls(controlCamera, elements.canvas);
  orbitControls.target.copy(target);
  orbitControls.enableDamping = true;
  orbitControls.dampingFactor = 0.07;
  orbitControls.minDistance = 1.8;
  orbitControls.maxDistance = 7;
  orbitControls.minZoom = 0.55;
  orbitControls.maxZoom = 4;
  orbitControls.enablePan = true;
  orbitControls.update();
  return orbitControls;
}

function setProjection(projection) {
  const width = Math.max(elements.frame.clientWidth, 1);
  const height = Math.max(elements.frame.clientHeight, 1);
  const aspect = width / height;
  const position = camera.position.clone();
  const up = camera.up.clone();
  const target = controls.target.clone();
  controls.dispose();

  camera = projection === "orthographic" ? createOrthographicCamera(aspect) : createPerspectiveCamera(aspect);
  camera.position.copy(position);
  camera.up.copy(up);
  camera.lookAt(target);
  controls = createOrbitControls(camera, target);
  resizeRenderer();
}

function resizeRenderer() {
  if (!renderer || !camera) return;
  const width = elements.frame.clientWidth;
  const height = elements.frame.clientHeight;
  if (width < 1 || height < 1) return;
  renderer.setSize(width, height, false);
  const aspect = width / height;
  if (camera.isPerspectiveCamera) {
    camera.aspect = aspect;
  } else if (camera.isOrthographicCamera) {
    const halfHeight = 1.05;
    camera.left = -halfHeight * aspect;
    camera.right = halfHeight * aspect;
    camera.top = halfHeight;
    camera.bottom = -halfHeight;
  }
  camera.updateProjectionMatrix();
}

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}

function disposeGraphic(graphic) {
  if (!graphic) return;
  scene.remove(graphic);
  graphic.traverse((child) => {
    if (child.geometry) child.geometry.dispose();
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    materials.filter(Boolean).forEach((material) => {
      if (material.map) material.map.dispose();
      material.dispose();
    });
  });
}
