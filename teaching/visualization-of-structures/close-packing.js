let THREE;
let OrbitControls;

const SPHERE_RADIUS = 0.5;
const NEAREST_DISTANCE = 2 * SPHERE_RADIUS;
const LAYER_SPACING = NEAREST_DISTANCE * Math.sqrt(2 / 3);
const HCP_C_OVER_A = Math.sqrt(8 / 3);
const PATCH_RADIUS = 3;
const REGISTRY_OFFSET = [NEAREST_DISTANCE / 2, NEAREST_DISTANCE * Math.sqrt(3) / 6];
const COLORS = { a: 0xe05a3f, b: 0x56a6d1, c: 0xe0a92f };
const CAMERA_NEAR = 0.05;
const CAMERA_FAR = 100;

const elements = {
  structureButtons: [...document.querySelectorAll("[data-packing-structure]")],
  focusButtons: [...document.querySelectorAll("[data-layer-focus]")],
  representationButtons: [...document.querySelectorAll("[data-packing-representation]")],
  layers: document.querySelector("#packing-layers"),
  layersOutput: document.querySelector("#packing-layers-output"),
  showCell: document.querySelector("#packing-show-cell"),
  showPlane: document.querySelector("#packing-show-plane"),
  orthographic: document.querySelector("#packing-orthographic"),
  reset: document.querySelector("#packing-reset"),
  kind: document.querySelector("#packing-kind"),
  modelTitle: document.querySelector("#packing-model-title"),
  layerCount: document.querySelector("#packing-layer-count"),
  sequence: document.querySelector("#packing-sequence"),
  frame: document.querySelector("#packing-viewer-frame"),
  canvas: document.querySelector("#packing-canvas"),
  fallback: document.querySelector("#packing-fallback"),
  factsTitle: document.querySelector("#packing-facts-title"),
  factSequence: document.querySelector("#packing-fact-sequence"),
  factPlane: document.querySelector("#packing-fact-plane"),
  factCell: document.querySelector("#packing-fact-cell"),
  factCoordination: document.querySelector("#packing-fact-coordination"),
  factApf: document.querySelector("#packing-fact-apf"),
  factNote: document.querySelector("#packing-fact-note"),
  status: document.querySelector("#packing-status")
};

const state = {
  structure: "hcp",
  layers: 1,
  focus: "all",
  representation: "balls",
  showCell: true,
  showPlane: true,
  projection: "perspective",
  rendererReady: false,
  viewIsStackingNormal: true,
  modelCenter: null,
  viewHalfWidth: 4,
  viewHalfHeight: 4,
  viewHalfDepth: 1
};

let scene;
let renderer;
let perspectiveCamera;
let orthographicCamera;
let camera;
let controls;
let modelGroup;
let resizeObserver;

const STRUCTURES = {
  hcp: {
    motif: ["a", "b"],
    kind: "Hexagonal close-packed",
    factsTitle: "HCP from ABAB stacking",
    plane: "Basal plane (0001)",
    cell: "Hexagonal-prism representation (6 effective atoms)",
    note: "The ideal HCP ratio is c/a = √(8/3) ≈ 1.633. The familiar prism spans three primitive cells; the HCP structure itself is a primitive hexagonal lattice with a two-atom basis. Boundary spheres in the finite patch have fewer displayed neighbours."
  },
  fcc: {
    motif: ["a", "b", "c"],
    kind: "Cubic close-packed / FCC",
    factsTitle: "FCC from ABCABC stacking",
    plane: "Cubic close-packed plane {111}",
    cell: "FCC conventional cube (4 effective atoms)",
    note: "The cube edges meet at sphere centres and its translucent faces complete the conventional FCC cell. Its [111] direction is the stacking axis; boundary spheres in the finite patch have fewer displayed neighbours."
  }
};

initialisePage();

function initialisePage() {
  bindControls();
  assertGeometry();
  updateInterface(false);
  initialiseThreeViewer();
}

function bindControls() {
  elements.structureButtons.forEach(button => button.addEventListener("click", () => {
    state.structure = button.dataset.packingStructure;
    if (state.structure === "hcp" && state.focus === "c") state.focus = "all";
    updateInterface(true);
  }));

  elements.focusButtons.forEach(button => button.addEventListener("click", () => {
    if (button.disabled) return;
    state.focus = button.dataset.layerFocus;
    updateInterface(true);
  }));

  elements.representationButtons.forEach(button => button.addEventListener("click", () => {
    if (button.disabled) return;
    state.representation = button.dataset.packingRepresentation;
    updateInterface(true, "preserve");
  }));

  elements.layers.addEventListener("input", () => {
    state.layers = Number(elements.layers.value);
    updateInterface(false);
  });
  elements.layers.addEventListener("change", () => announceCurrentState());

  elements.showCell.addEventListener("change", () => {
    state.showCell = elements.showCell.checked;
    rebuildModel();
    announceCurrentState();
  });
  elements.showPlane.addEventListener("change", () => {
    state.showPlane = elements.showPlane.checked;
    rebuildModel("preserve");
    announceCurrentState();
  });
  elements.orthographic.addEventListener("change", () => {
    state.projection = elements.orthographic.checked ? "orthographic" : "perspective";
    resetView(false);
    announceCurrentState();
  });
  elements.reset.addEventListener("click", () => resetView(true));
}

function currentSequence() {
  const motif = STRUCTURES[state.structure].motif;
  return Array.from({ length: state.layers }, (_, index) => motif[index % motif.length]);
}

function updateInterface(announce, viewMode = "normal") {
  const definition = STRUCTURES[state.structure];
  const sequence = currentSequence();
  const layerWord = sequence.length === 1 ? "layer" : "layers";
  const sequenceText = sequence.map(letter => letter.toUpperCase()).join("");
  if (state.focus !== "all" && !sequence.includes(state.focus)) state.focus = "all";

  elements.structureButtons.forEach(button => {
    button.setAttribute("aria-pressed", String(button.dataset.packingStructure === state.structure));
  });
  elements.focusButtons.forEach(button => {
    const focus = button.dataset.layerFocus;
    button.disabled = focus !== "all" && !sequence.includes(focus);
    button.setAttribute("aria-pressed", String(button.dataset.layerFocus === state.focus));
  });
  elements.representationButtons.forEach(button => {
    button.setAttribute("aria-pressed", String(button.dataset.packingRepresentation === state.representation));
  });

  elements.layers.value = String(state.layers);
  elements.layersOutput.textContent = `${sequence.length} ${layerWord} · ${sequenceText}`;
  elements.layers.setAttribute("aria-valuetext", `${sequence.length} ${layerWord}, sequence ${sequence.map(letter => letter.toUpperCase()).join(" ")}`);
  elements.kind.textContent = definition.kind;
  elements.modelTitle.textContent = sequence.length === 1 ? `${sequenceText} layer` : `${sequenceText} stacking`;
  elements.layerCount.textContent = `${sequence.length} ${layerWord}`;
  elements.factsTitle.textContent = definition.factsTitle;
  elements.factSequence.textContent = sequenceText;
  elements.factPlane.textContent = definition.plane;
  elements.factCell.textContent = !cellCanRender(sequence)
    ? `${definition.cell} (needs ${minimumCellLayers()} layers)`
    : state.focus !== "all"
      ? `${definition.cell} (select All registries)`
      : definition.cell;
  elements.factCoordination.textContent = "12 nearest neighbours";
  elements.factApf.textContent = "0.740";
  elements.factNote.textContent = definition.note;
  updateSequenceStrip(sequence);
  setRendererControls(state.rendererReady);

  if (state.rendererReady) rebuildModel(viewMode);
  if (announce) announceCurrentState();
}

function updateSequenceStrip(sequence) {
  elements.sequence.replaceChildren(...sequence.map((letter, index) => {
    const item = document.createElement("span");
    item.className = `is-${letter}`;
    const registry = document.createElement("b");
    registry.textContent = letter.toUpperCase();
    const number = document.createElement("small");
    number.textContent = String(index + 1);
    item.append(registry, number);
    return item;
  }));
  elements.sequence.setAttribute("aria-label", `Layer sequence ${sequence.map(letter => letter.toUpperCase()).join(" ")}`);
}

function announceCurrentState() {
  const sequence = currentSequence();
  const focusText = state.focus === "all" ? "all registries" : `registry ${state.focus.toUpperCase()}`;
  const overlays = [state.showCell && cellCanDisplay(sequence) ? "unit-cell overlay" : "", state.showPlane ? "close-packed plane" : ""].filter(Boolean).join(" and ") || "no overlays";
  const representation = state.representation === "balls" ? "ball model" : "lattice model";
  elements.status.textContent = `${STRUCTURES[state.structure].kind}: ${sequence.map(letter => letter.toUpperCase()).join("")} with ${focusText}; ${representation}; ${overlays}; ${state.projection} projection. Layer changes and Reset use the stacking-normal view.`;
}

async function initialiseThreeViewer() {
  setRendererControls(false);
  try {
    THREE = await import("three");
    ({ OrbitControls } = await import("three/addons/controls/OrbitControls.js"));
    createScene();
    state.rendererReady = true;
    setRendererControls(true);
    rebuildModel();
    showViewer();
    resetView(false);
    announceCurrentState();
  } catch (error) {
    console.error("Unable to start the close-packing viewer.", error);
    showFailure("The interactive 3D model is unavailable. The stacking controls and structure facts remain usable.");
  }
}

function createScene() {
  scene = new THREE.Scene();
  renderer = new THREE.WebGLRenderer({ canvas: elements.canvas, antialias: true, alpha: true, powerPreference: "low-power" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.setClearColor(0x102b4d, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  perspectiveCamera = new THREE.PerspectiveCamera(38, 1, CAMERA_NEAR, CAMERA_FAR);
  orthographicCamera = new THREE.OrthographicCamera(-5, 5, 5, -5, CAMERA_NEAR, CAMERA_FAR);
  camera = perspectiveCamera;

  controls = new OrbitControls(camera, elements.canvas);
  controls.enableDamping = false;
  controls.enablePan = false;
  controls.minDistance = 3;
  controls.maxDistance = 35;
  // Orthographic dolly changes zoom rather than camera distance.
  controls.minZoom = 0.25;
  controls.maxZoom = 4;
  controls.addEventListener("start", () => state.viewIsStackingNormal = false);
  controls.addEventListener("change", renderScene);

  scene.add(new THREE.HemisphereLight(0xddefff, 0x15233c, 2.4));
  const keyLight = new THREE.DirectionalLight(0xffffff, 3.2);
  keyLight.position.set(5, 8, 6);
  scene.add(keyLight);
  const fillLight = new THREE.DirectionalLight(0x87bce0, 1.4);
  fillLight.position.set(-6, 2, -4);
  scene.add(fillLight);

  elements.canvas.addEventListener("webglcontextlost", event => {
    event.preventDefault();
    showFailure("The 3D context was interrupted. Reload the page to restart the interactive model.");
  });

  if (typeof ResizeObserver === "function") {
    resizeObserver = new ResizeObserver(resizeRenderer);
    resizeObserver.observe(elements.frame);
  } else {
    window.addEventListener("resize", resizeRenderer);
  }
}

function setRendererControls(enabled) {
  elements.showCell.disabled = !enabled || !cellCanDisplay();
  [elements.showPlane, elements.orthographic, elements.reset].forEach(control => control.disabled = !enabled);
  elements.representationButtons.forEach(button => button.disabled = !enabled);
}

function minimumCellLayers() {
  return state.structure === "hcp" ? 3 : 4;
}

function cellCanRender(sequence = currentSequence()) {
  return sequence.length >= minimumCellLayers();
}

function cellCanDisplay(sequence = currentSequence()) {
  return cellCanRender(sequence) && state.focus === "all";
}

function showViewer() {
  elements.fallback.hidden = true;
  elements.canvas.hidden = false;
  elements.canvas.setAttribute("role", "img");
  elements.canvas.setAttribute("aria-hidden", "false");
}

function showFailure(message) {
  state.rendererReady = false;
  setRendererControls(false);
  elements.canvas.hidden = true;
  elements.canvas.setAttribute("aria-hidden", "true");
  elements.canvas.removeAttribute("role");
  elements.fallback.hidden = false;
  const paragraph = elements.fallback.querySelector("p");
  if (paragraph) paragraph.textContent = message;
  elements.status.textContent = message;
}

function triangularPatch() {
  const points = [];
  for (let q = -PATCH_RADIUS; q <= PATCH_RADIUS; q += 1) {
    for (let r = -PATCH_RADIUS; r <= PATCH_RADIUS; r += 1) {
      if (Math.max(Math.abs(q), Math.abs(r), Math.abs(q + r)) > PATCH_RADIUS) continue;
      points.push({
        q,
        r,
        x: q * NEAREST_DISTANCE + r * NEAREST_DISTANCE / 2,
        z: r * NEAREST_DISTANCE * Math.sqrt(3) / 2
      });
    }
  }
  return points;
}

function registryOffset(letter) {
  const multiplier = letter === "a" ? 0 : letter === "b" ? 1 : -1;
  return [REGISTRY_OFFSET[0] * multiplier, REGISTRY_OFFSET[1] * multiplier];
}

function rebuildModel(viewMode = "normal") {
  if (!state.rendererReady || !scene) return;
  const previousCenter = state.modelCenter?.clone();
  const preservedCameraOffset = viewMode === "preserve" && previousCenter && camera
    ? camera.position.clone().sub(previousCenter)
    : null;
  const preservedTargetOffset = viewMode === "preserve" && previousCenter && controls
    ? controls.target.clone().sub(previousCenter)
    : null;
  disposeObject(modelGroup);
  modelGroup = new THREE.Group();
  scene.add(modelGroup);

  const sequence = currentSequence();
  const points = triangularPatch();
  const visibleLetters = [...new Set(sequence.filter(letter => state.focus === "all" || state.focus === letter))];
  const layerBottom = -(sequence.length - 1) * LAYER_SPACING / 2;
  const cellSpan = state.structure === "hcp" ? 2 : 3;
  const cellBaseIndex = cellCanRender(sequence) ? chooseCellBaseLayer(sequence, cellSpan) : -1;
  const focusFccCell = state.structure === "fcc" && state.showCell && cellBaseIndex >= 0 && state.focus === "all";
  const atoms = createVisibleAtoms(sequence, points, layerBottom);

  if (state.representation === "lattice") {
    modelGroup.add(createLatticeModel(atoms, visibleLetters));
  } else {
    addBallModel(atoms, visibleLetters, focusFccCell, cellBaseIndex);
  }

  const referenceLayer = chooseReferenceLayer(sequence);
  const referenceY = layerBottom + referenceLayer.index * LAYER_SPACING;
  if (state.showPlane) modelGroup.add(createPlaneGuide(referenceY, referenceLayer.letter));
  if (state.showCell && cellCanDisplay(sequence)) {
    const cellBaseY = layerBottom + cellBaseIndex * LAYER_SPACING;
    modelGroup.add(state.structure === "hcp" ? createHcpFrame(cellBaseY) : createFccFrame(cellBaseY));
  }

  if (focusFccCell) {
    state.modelCenter = new THREE.Vector3(0, layerBottom + (cellBaseIndex + 1.5) * LAYER_SPACING, 0);
    state.viewHalfWidth = 1.8 * NEAREST_DISTANCE;
    state.viewHalfHeight = 1.8 * NEAREST_DISTANCE;
    state.viewHalfDepth = 1.8 * NEAREST_DISTANCE;
  } else if (!atoms.length) {
    state.modelCenter = new THREE.Vector3();
    state.viewHalfWidth = 4;
    state.viewHalfHeight = 4;
    state.viewHalfDepth = 1;
  } else {
    const atomBox = new THREE.Box3().setFromPoints(atoms.map(atom => atom.position));
    const size = atomBox.getSize(new THREE.Vector3());
    state.modelCenter = atomBox.getCenter(new THREE.Vector3());
    state.viewHalfWidth = Math.max(1, size.x / 2 + SPHERE_RADIUS);
    state.viewHalfHeight = Math.max(1, size.z / 2 + SPHERE_RADIUS);
    state.viewHalfDepth = Math.max(0.5, size.y / 2 + SPHERE_RADIUS);
  }
  updateCanvasDescription(sequence);
  if (preservedCameraOffset && preservedTargetOffset) {
    camera.position.copy(state.modelCenter).add(preservedCameraOffset);
    controls.target.copy(state.modelCenter).add(preservedTargetOffset);
    camera.updateProjectionMatrix();
    controls.update();
    resizeRenderer();
  } else {
    resetView(false);
  }
}

function createVisibleAtoms(sequence, points, layerBottom) {
  const atoms = [];
  sequence.forEach((letter, layerIndex) => {
    if (state.focus !== "all" && state.focus !== letter) return;
    const [offsetX, offsetZ] = registryOffset(letter);
    const y = layerBottom + layerIndex * LAYER_SPACING;
    points.forEach(point => atoms.push({
      letter,
      layerIndex,
      key: `${layerIndex}:${point.q}:${point.r}`,
      position: new THREE.Vector3(point.x + offsetX, y, point.z + offsetZ)
    }));
  });
  return atoms;
}

function addBallModel(atoms, visibleLetters, emphasiseFccCell, cellBaseIndex) {
  const geometry = new THREE.SphereGeometry(SPHERE_RADIUS, 28, 20);
  const materials = Object.fromEntries(visibleLetters.map(letter => [letter, new THREE.MeshStandardMaterial({
    color: COLORS[letter], roughness: 0.28, metalness: 0.04
  })]));
  const dimMaterials = emphasiseFccCell
    ? Object.fromEntries(visibleLetters.map(letter => [letter, new THREE.MeshStandardMaterial({
      color: COLORS[letter], roughness: 0.34, metalness: 0.02, transparent: true, opacity: 0.09, depthWrite: false
    })]))
    : {};
  const cellSites = emphasiseFccCell ? createFccCellSiteKeys(cellBaseIndex) : new Set();
  visibleLetters.forEach(letter => {
    const letterAtoms = atoms.filter(atom => atom.letter === letter);
    const cellAtoms = emphasiseFccCell ? letterAtoms.filter(atom => cellSites.has(atom.key)) : [];
    const backgroundAtoms = emphasiseFccCell ? letterAtoms.filter(atom => !cellSites.has(atom.key)) : letterAtoms;
    addAtomInstances(backgroundAtoms, geometry, emphasiseFccCell ? dimMaterials[letter] : materials[letter]);
    addAtomInstances(cellAtoms, geometry, materials[letter]);
  });
}

function createLatticeModel(atoms, visibleLetters) {
  const group = new THREE.Group();
  const nodeGeometry = new THREE.SphereGeometry(0.12 * NEAREST_DISTANCE, 14, 10);
  const nodeMaterials = Object.fromEntries(visibleLetters.map(letter => [letter, new THREE.MeshStandardMaterial({
    color: COLORS[letter], roughness: 0.32, metalness: 0.06
  })]));
  visibleLetters.forEach(letter => {
    const letterAtoms = atoms.filter(atom => atom.letter === letter);
    const mesh = createAtomInstances(letterAtoms, nodeGeometry, nodeMaterials[letter]);
    if (mesh) group.add(mesh);
  });

  const edgePositions = [];
  const targetDistanceSquared = NEAREST_DISTANCE ** 2;
  const tolerance = 1e-8;
  for (let first = 0; first < atoms.length; first += 1) {
    for (let second = first + 1; second < atoms.length; second += 1) {
      if (Math.abs(atoms[first].position.distanceToSquared(atoms[second].position) - targetDistanceSquared) > tolerance) continue;
      edgePositions.push(...atoms[first].position.toArray(), ...atoms[second].position.toArray());
    }
  }
  const edgeGeometry = new THREE.BufferGeometry();
  edgeGeometry.setAttribute("position", new THREE.Float32BufferAttribute(edgePositions, 3));
  const edges = new THREE.LineSegments(edgeGeometry, new THREE.LineBasicMaterial({
    color: 0xdcecf6, transparent: true, opacity: 0.58, depthTest: true
  }));
  group.add(edges);
  return group;
}

function addAtomInstances(atoms, geometry, material) {
  const mesh = createAtomInstances(atoms, geometry, material);
  if (mesh) modelGroup.add(mesh);
}

function createAtomInstances(atoms, geometry, material) {
  if (!atoms.length) return null;
  const mesh = new THREE.InstancedMesh(geometry, material, atoms.length);
  const dummy = new THREE.Object3D();
  atoms.forEach((atom, atomIndex) => {
    dummy.position.copy(atom.position);
    dummy.updateMatrix();
    mesh.setMatrixAt(atomIndex, dummy.matrix);
  });
  mesh.instanceMatrix.needsUpdate = true;
  return mesh;
}

function createFccCellSiteKeys(baseLayer) {
  const sites = [
    [baseLayer, 0, 0],
    [baseLayer + 1, -1, 1], [baseLayer + 1, -1, -1], [baseLayer + 1, 1, -1],
    [baseLayer + 1, 0, -1], [baseLayer + 1, 0, 0], [baseLayer + 1, -1, 0],
    [baseLayer + 2, -1, 1], [baseLayer + 2, 1, 1], [baseLayer + 2, 1, -1],
    [baseLayer + 2, 0, 1], [baseLayer + 2, 0, 0], [baseLayer + 2, 1, 0],
    [baseLayer + 3, 0, 0]
  ];
  return new Set(sites.map(site => site.join(":")));
}

function chooseReferenceLayer(sequence) {
  const candidates = sequence.map((letter, index) => ({ letter, index }))
    .filter(layer => state.focus === "all" || layer.letter === state.focus);
  return candidates[Math.floor(candidates.length / 2)] || { letter: sequence[0], index: 0 };
}

function chooseCellBaseLayer(sequence, span) {
  const stackCentre = (sequence.length - 1) / 2;
  return sequence
    .map((letter, index) => ({ letter, index, distance: Math.abs(index + span / 2 - stackCentre) }))
    .filter(layer => layer.letter === "a" && layer.index + span < sequence.length)
    .sort((first, second) => first.distance - second.distance)[0]?.index ?? 0;
}

function createPlaneGuide(y, letter) {
  const radius = PATCH_RADIUS * NEAREST_DISTANCE + SPHERE_RADIUS;
  const [centreX, centreZ] = registryOffset(letter);
  const vertices = [];
  for (let index = 0; index < 6; index += 1) {
    const angle = index * Math.PI / 3;
    vertices.push(new THREE.Vector3(centreX + radius * Math.cos(angle), y, centreZ + radius * Math.sin(angle)));
  }
  const positions = [];
  for (let index = 1; index < 5; index += 1) {
    positions.push(...vertices[0].toArray(), ...vertices[index].toArray(), ...vertices[index + 1].toArray());
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  const group = new THREE.Group();
  const plane = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({
    color: COLORS[letter], transparent: true, opacity: 0.11, side: THREE.DoubleSide, depthWrite: false
  }));
  plane.renderOrder = 1;
  group.add(plane);
  const edgePositions = [];
  vertices.forEach((vertex, index) => edgePositions.push(...vertex.toArray(), ...vertices[(index + 1) % vertices.length].toArray()));
  const edgeGeometry = new THREE.BufferGeometry();
  edgeGeometry.setAttribute("position", new THREE.Float32BufferAttribute(edgePositions, 3));
  const outline = new THREE.LineSegments(edgeGeometry, new THREE.LineBasicMaterial({ color: COLORS[letter], transparent: true, opacity: 0.9, depthTest: false }));
  outline.renderOrder = 2;
  group.add(outline);
  return group;
}

function createHcpFrame(baseY) {
  const radius = NEAREST_DISTANCE;
  const bottom = [];
  const top = [];
  for (let index = 0; index < 6; index += 1) {
    const angle = index * Math.PI / 3;
    bottom.push(new THREE.Vector3(radius * Math.cos(angle), baseY, radius * Math.sin(angle)));
    top.push(new THREE.Vector3(radius * Math.cos(angle), baseY + 2 * LAYER_SPACING, radius * Math.sin(angle)));
  }
  const positions = [];
  for (let index = 0; index < 6; index += 1) {
    const next = (index + 1) % 6;
    positions.push(...bottom[index].toArray(), ...bottom[next].toArray());
    positions.push(...top[index].toArray(), ...top[next].toArray());
    positions.push(...bottom[index].toArray(), ...top[index].toArray());
  }
  return createFrameLines(positions, 0xaedaff);
}

function createFccFrame(baseY) {
  const cubeSide = Math.sqrt(2) * NEAREST_DISTANCE;
  const edgeDirections = [
    new THREE.Vector3(0, 1 / Math.sqrt(3), Math.sqrt(2 / 3)),
    new THREE.Vector3(-1 / Math.sqrt(2), 1 / Math.sqrt(3), -1 / Math.sqrt(6)),
    new THREE.Vector3(1 / Math.sqrt(2), 1 / Math.sqrt(3), -1 / Math.sqrt(6))
  ];
  const base = new THREE.Vector3(0, baseY, 0);
  const vertices = [];
  [0, 1].forEach(first => [0, 1].forEach(second => [0, 1].forEach(third => {
    const vertex = base.clone();
    [first, second, third].forEach((multiplier, axis) => vertex.addScaledVector(edgeDirections[axis], multiplier * cubeSide));
    vertices.push(vertex);
  })));
  const vertexIndex = (x, y, z) => x * 4 + y * 2 + z;
  const edges = [];
  for (let axis = 0; axis < 3; axis += 1) {
    [0, 1].forEach(first => [0, 1].forEach(second => {
      const start = [0, 0, 0];
      const end = [0, 0, 0];
      const others = [0, 1, 2].filter(value => value !== axis);
      start[others[0]] = first;
      start[others[1]] = second;
      end[others[0]] = first;
      end[others[1]] = second;
      end[axis] = 1;
      edges.push([vertices[vertexIndex(...start)], vertices[vertexIndex(...end)]]);
    }));
  }
  const facePositions = [];
  for (let axis = 0; axis < 3; axis += 1) {
    const others = [0, 1, 2].filter(value => value !== axis);
    [0, 1].forEach(side => {
      const coordinates = [[0, 0], [1, 0], [1, 1], [0, 1]].map(([first, second]) => {
        const vertex = [0, 0, 0];
        vertex[axis] = side;
        vertex[others[0]] = first;
        vertex[others[1]] = second;
        return vertices[vertexIndex(...vertex)];
      });
      facePositions.push(
        ...coordinates[0].toArray(), ...coordinates[1].toArray(), ...coordinates[2].toArray(),
        ...coordinates[0].toArray(), ...coordinates[2].toArray(), ...coordinates[3].toArray()
      );
    });
  }

  const faceGeometry = new THREE.BufferGeometry();
  faceGeometry.setAttribute("position", new THREE.Float32BufferAttribute(facePositions, 3));
  const faces = new THREE.Mesh(faceGeometry, new THREE.MeshBasicMaterial({
    color: 0x7fc4e8,
    transparent: true,
    opacity: 0.1,
    side: THREE.DoubleSide,
    depthWrite: false,
    depthTest: false
  }));
  faces.renderOrder = 1;

  const group = new THREE.Group();
  group.add(faces, createFrameTubes(edges, 0xeaf7ff));
  return group;
}

function createFrameTubes(edges, color) {
  const group = new THREE.Group();
  const geometry = new THREE.CylinderGeometry(0.045, 0.045, 1, 10);
  const material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.98, depthTest: false });
  const up = new THREE.Vector3(0, 1, 0);
  edges.forEach(([start, end]) => {
    const direction = end.clone().sub(start);
    const length = direction.length();
    const tube = new THREE.Mesh(geometry, material);
    tube.position.copy(start).add(end).multiplyScalar(0.5);
    tube.quaternion.setFromUnitVectors(up, direction.normalize());
    tube.scale.set(1, length, 1);
    tube.renderOrder = 3;
    group.add(tube);
  });
  return group;
}

function createFrameLines(positions, color) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  const lines = new THREE.LineSegments(geometry, new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.95, depthTest: true }));
  lines.renderOrder = 3;
  return lines;
}

function updateCanvasDescription(sequence) {
  const visibleCount = state.focus === "all" ? sequence.length : sequence.filter(letter => letter === state.focus).length;
  const overlayText = [state.showCell && cellCanDisplay(sequence) ? STRUCTURES[state.structure].cell : "", state.showPlane ? STRUCTURES[state.structure].plane : ""].filter(Boolean).join(" and ");
  const visibleGrammar = visibleCount === 1 && sequence.length === 1 ? "1 layer is visible" : `${visibleCount} of ${sequence.length} layers are visible`;
  const representation = state.representation === "balls" ? "ball representation" : "lattice representation whose vertices coincide with the sphere centres";
  elements.canvas.setAttribute("aria-label", `Interactive Three.js model of ${STRUCTURES[state.structure].kind} with sequence ${sequence.map(letter => letter.toUpperCase()).join(" ")}. ${visibleGrammar}, shown as a ${representation}${overlayText ? `, with ${overlayText}` : ""}. Layer changes and Reset use a view normal to the stacking planes; drag to orbit and zoom.`);
}

function resetView(announce) {
  if (!state.rendererReady || !state.modelCenter) return;
  const aspect = Math.max(0.2, elements.frame.clientWidth / Math.max(1, elements.frame.clientHeight));
  controls.target.copy(state.modelCenter);
  fitStackingNormalCamera(aspect);
  state.viewIsStackingNormal = true;
  controls.update();
  resizeRenderer();
  if (announce) elements.status.textContent = `${state.projection === "orthographic" ? "Orthographic" : "Perspective"} view reset normal to the stacking planes.`;
}

function fitStackingNormalCamera(aspect) {
  const paddedHalfWidth = state.viewHalfWidth * 1.08;
  const paddedHalfHeight = state.viewHalfHeight * 1.08;

  if (state.projection === "orthographic") {
    camera = orthographicCamera;
    const halfHeight = Math.max(paddedHalfHeight, paddedHalfWidth / aspect);
    camera.left = -halfHeight * aspect;
    camera.right = halfHeight * aspect;
    camera.top = halfHeight;
    camera.bottom = -halfHeight;
    camera.zoom = 1;
    camera.position.copy(state.modelCenter).add(new THREE.Vector3(0, Math.max(6, state.viewHalfDepth * 4), 0));
  } else {
    camera = perspectiveCamera;
    camera.aspect = aspect;
    const verticalTangent = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const horizontalTangent = verticalTangent * aspect;
    const distance = Math.max(paddedHalfHeight / verticalTangent, paddedHalfWidth / horizontalTangent) + state.viewHalfDepth * 1.35;
    camera.position.copy(state.modelCenter).add(new THREE.Vector3(0, distance, 0));
  }
  // OrbitControls can move across the full 3-35 distance range after fitting.
  // Keep the whole intended zoom range inside the camera frustum.
  camera.near = CAMERA_NEAR;
  camera.far = CAMERA_FAR;
  camera.up.set(0, 0, -1);
  camera.updateProjectionMatrix();
  controls.object = camera;
}

function resizeRenderer() {
  if (!state.rendererReady || !renderer || !camera) return;
  const width = elements.frame.clientWidth;
  const height = elements.frame.clientHeight;
  if (width < 1 || height < 1) return;
  renderer.setSize(width, height, false);
  const aspect = width / height;
  if (state.viewIsStackingNormal && state.modelCenter) {
    controls.target.copy(state.modelCenter);
    fitStackingNormalCamera(aspect);
    controls.update();
  } else {
    perspectiveCamera.aspect = aspect;
    perspectiveCamera.updateProjectionMatrix();
  }
  if (!state.viewIsStackingNormal && camera === orthographicCamera) {
    const halfHeight = (orthographicCamera.top - orthographicCamera.bottom) / 2;
    orthographicCamera.left = -halfHeight * aspect;
    orthographicCamera.right = halfHeight * aspect;
    orthographicCamera.updateProjectionMatrix();
  }
  renderScene();
}

function renderScene() {
  if (!state.rendererReady || !renderer || !scene || !camera) return;
  renderer.render(scene, camera);
}

function disposeObject(object) {
  if (!object) return;
  scene?.remove(object);
  const geometries = new Set();
  const materials = new Set();
  object.traverse(child => {
    if (child.geometry) geometries.add(child.geometry);
    const childMaterials = Array.isArray(child.material) ? child.material : child.material ? [child.material] : [];
    childMaterials.forEach(material => materials.add(material));
  });
  geometries.forEach(geometry => geometry.dispose());
  materials.forEach(material => material.dispose());
}

function assertGeometry() {
  const horizontalAB = Math.hypot(...REGISTRY_OFFSET);
  const touchingAB = Math.hypot(horizontalAB, LAYER_SPACING);
  const touchingBC = Math.hypot(
    -2 * REGISTRY_OFFSET[0] + 3 * REGISTRY_OFFSET[0],
    -2 * REGISTRY_OFFSET[1] + 3 * REGISTRY_OFFSET[1],
    LAYER_SPACING
  );
  const touchingCA = Math.hypot(...REGISTRY_OFFSET, LAYER_SPACING);
  console.assert(Math.abs(touchingAB - NEAREST_DISTANCE) < 1e-10, "Adjacent A/B spheres must touch.");
  console.assert(Math.abs(touchingBC - NEAREST_DISTANCE) < 1e-10, "Adjacent B/C spheres must touch through a lattice translation.");
  console.assert(Math.abs(touchingCA - NEAREST_DISTANCE) < 1e-10, "Adjacent C/A spheres must touch through a lattice translation.");
  console.assert(Math.abs(3 * REGISTRY_OFFSET[0] - 1.5 * NEAREST_DISTANCE) < 1e-10, "Three registry shifts must close by one basal lattice translation.");
  console.assert(Math.abs(2 * LAYER_SPACING / NEAREST_DISTANCE - HCP_C_OVER_A) < 1e-10, "Ideal HCP c/a ratio is incorrect.");
  console.assert(triangularPatch().length === 37, "The radius-three triangular patch must contain 37 spheres per layer.");
}
