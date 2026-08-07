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

const EPSILON = 1e-7;
const DIRECTION_COLOR = 0xff7258;
const PLANE_COLOR = 0x46dfcd;

const elements = {
  frame: document.querySelector("#viewer-frame"),
  canvas: document.querySelector("#miller-canvas"),
  fallback: document.querySelector("#viewer-fallback"),
  viewOrientation: document.querySelector("#view-orientation"),
  downloadPng: document.querySelector("#download-png"),
  downloadMessage: document.querySelector("#download-message"),
  summary: document.querySelector("#selection-summary"),
  directionForm: document.querySelector("#direction-form"),
  directionInputs: [
    document.querySelector("#direction-u"),
    document.querySelector("#direction-v"),
    document.querySelector("#direction-w")
  ],
  directionPreset: document.querySelector("#direction-preset"),
  directionMessage: document.querySelector("#direction-message"),
  clearDirection: document.querySelector("#clear-direction"),
  planeForm: document.querySelector("#plane-form"),
  planeInputs: [
    document.querySelector("#plane-h"),
    document.querySelector("#plane-k"),
    document.querySelector("#plane-l")
  ],
  planePreset: document.querySelector("#plane-preset"),
  planeMessage: document.querySelector("#plane-message"),
  clearPlane: document.querySelector("#clear-plane")
};

const state = {
  direction: [1, 1, 0],
  plane: [1, 1, 1],
  directionVisible: true,
  planeVisible: true,
  planeOffset: 1
};

let scene;
let camera;
let renderer;
let controls;
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
  camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  resetCamera();

  controls = new OrbitControls(camera, elements.canvas);
  controls.target.set(0.5, 0.5, 0.5);
  controls.enableDamping = true;
  controls.dampingFactor = 0.07;
  controls.minDistance = 1.8;
  controls.maxDistance = 7;
  controls.enablePan = true;
  controls.addEventListener("start", () => {
    elements.viewOrientation.value = "custom";
  });
  controls.update();

  scene.add(new THREE.HemisphereLight(0xffffff, 0x1a255f, 2.2));

  const keyLight = new THREE.DirectionalLight(0xffffff, 3.4);
  keyLight.position.set(3, 4, 4);
  scene.add(keyLight);

  const fillLight = new THREE.DirectionalLight(0x78d8ff, 1.5);
  fillLight.position.set(-3, 1, -2);
  scene.add(fillLight);

  scene.add(createUnitCell());

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

function addAxis(group, direction, color, label, labelPosition) {
  const arrow = new THREE.ArrowHelper(direction, new THREE.Vector3(0, 0, 0), 1.18, color, 0.08, 0.045);
  arrow.traverse((part) => {
    if (part.material) part.userData.printRole = `axis-${label}`;
  });
  group.add(arrow);

  const sprite = makeLabelSprite(label, "#ffffff", "rgba(18, 23, 67, 0.78)");
  sprite.position.set(...labelPosition);
  group.add(sprite);
}

function bindControls() {
  elements.directionForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const indices = readIndices(elements.directionInputs, elements.directionMessage, "direction");
    if (!indices) return;
    if (indices.every((value) => value === 0)) {
      setMessage(elements.directionMessage, "[0 0 0] does not define a direction.", true);
      return;
    }

    const reduced = reduceDirection(indices);
    state.direction = reduced;
    state.directionVisible = true;
    plotDirection(reduced);

    if (!indices.every((value, index) => value === reduced[index])) {
      setMessage(elements.directionMessage, `Plotted the equivalent reduced direction ${formatIndices(reduced, "[")} for the entered ${formatIndices(indices, "[")}.`);
    } else {
      setMessage(elements.directionMessage, "");
    }
    updateSummary();
  });

  elements.planeForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const indices = readIndices(elements.planeInputs, elements.planeMessage, "plane");
    if (!indices) return;
    if (indices.every((value) => value === 0)) {
      setMessage(elements.planeMessage, "(0 0 0) does not define a plane.", true);
      return;
    }

    state.plane = indices;
    state.planeVisible = true;
    plotPlane(indices);
    updatePlaneMessage(indices, state.planeOffset);
    updateSummary();
  });

  elements.directionPreset.addEventListener("change", () => {
    applyPreset(elements.directionPreset, elements.directionInputs, elements.directionForm);
  });

  elements.planePreset.addEventListener("change", () => {
    applyPreset(elements.planePreset, elements.planeInputs, elements.planeForm);
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

  elements.viewOrientation.addEventListener("change", () => {
    if (!camera || !controls || elements.viewOrientation.value === "custom") return;
    setViewOrientation(elements.viewOrientation.value);
  });

  elements.downloadPng.addEventListener("click", downloadCurrentFigure);
}

function plotDirection(indices) {
  if (!scene) return;
  disposeGraphic(directionGraphic);

  const segment = directionSegment(indices);
  const start = toWorld(segment.start);
  const end = toWorld(segment.end);
  directionGraphic = createThickArrow(start, end, DIRECTION_COLOR);

  const label = makeLabelSprite(formatIndices(indices, "["), "#ffffff", "rgba(166, 45, 24, 0.9)");
  const midpoint = start.clone().lerp(end, 0.55);
  label.position.copy(midpoint.add(new THREE.Vector3(0.08, 0.1, 0.07)));
  directionGraphic.add(label);

  directionGraphic.visible = true;
  directionGraphic.name = `Direction ${formatIndices(indices, "[")}`;
  scene.add(directionGraphic);
}

function directionSegment(indices) {
  const maxComponent = Math.max(...indices.map((value) => Math.abs(value)));
  const step = indices.map((value) => value / maxComponent);
  const start = indices.map((value) => (value < 0 ? 1 : 0));
  const end = start.map((value, index) => value + step[index]);
  return { start, end };
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

  const clipped = chooseVisiblePlane(indices);
  state.planeOffset = clipped.offset;
  planeGraphic = new THREE.Group();

  const worldPoints = clipped.points.map(toWorld);
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
      opacity: 0.42,
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
  planeGraphic.add(fill);

  const outlineGeometry = new THREE.BufferGeometry().setFromPoints(worldPoints);
  const outline = new THREE.LineLoop(
    outlineGeometry,
    new THREE.LineBasicMaterial({ color: 0xb8fff5, transparent: true, opacity: 0.95 })
  );
  outline.renderOrder = 4;
  outline.userData.printRole = "plane-outline";
  planeGraphic.add(outline);

  const centroid = worldPoints.reduce((sum, point) => sum.add(point), new THREE.Vector3()).multiplyScalar(1 / worldPoints.length);
  const normal = toWorldVector(indices).normalize();
  const planeLabel = makeLabelSprite(formatIndices(indices, "("), "#082f35", "rgba(184, 255, 245, 0.94)");
  planeLabel.position.copy(centroid.addScaledVector(normal, 0.035));
  planeGraphic.add(planeLabel);

  planeGraphic.visible = true;
  planeGraphic.name = `Plane ${formatIndices(indices, "(")}`;
  scene.add(planeGraphic);
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
  const invalid = values.some((value) => !Number.isInteger(value) || value < -9 || value > 9);
  if (invalid) {
    setMessage(messageElement, `Each ${noun} index must be a whole number from −9 to 9.`, true);
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
  const parts = ["miller-indices"];
  if (state.directionVisible) parts.push(`dir-${fileSafeIndices(state.direction)}`);
  if (state.planeVisible) parts.push(`plane-${fileSafeIndices(state.plane)}`);
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
  if (state.directionVisible) visibleItems.push(`direction ${formatIndices(state.direction, "[")}`);
  if (state.planeVisible) visibleItems.push(`plane ${formatIndices(state.plane, "(")}`);

  if (visibleItems.length === 0) {
    elements.summary.textContent = "No direction or plane is currently shown.";
  } else if (visibleItems.length === 1) {
    elements.summary.textContent = `Showing ${visibleItems[0]}.`;
  } else {
    elements.summary.textContent = `Showing ${visibleItems[0]} and ${visibleItems[1]}.`;
  }
}

function formatIndices(indices, openingBracket) {
  const closingBracket = openingBracket === "[" ? "]" : ")";
  return `${openingBracket}${indices.map(formatNumber).join(" ")}${closingBracket}`;
}

function formatNumber(value) {
  const rounded = Math.abs(value - Math.round(value)) < EPSILON ? Math.round(value) : Number(value.toFixed(2));
  return String(rounded).replace("-", "−");
}

function resetCamera() {
  camera.up.set(0, 1, 0);
  camera.position.set(3.15, 2.35, 1.85);
  camera.lookAt(0.5, 0.5, 0.5);
}

function setViewOrientation(orientation) {
  const positions = {
    isometric: [3.15, 2.35, 1.85],
    a: [3.4, 0.5, 0.5],
    b: [0.5, 0.5, 3.4],
    c: [0.5, 3.4, 0.5]
  };
  const position = positions[orientation] || positions.isometric;

  camera.up.set(0, 1, 0);
  if (orientation === "c") camera.up.set(0, 0, -1);
  camera.position.set(...position);
  controls.target.set(0.5, 0.5, 0.5);
  camera.lookAt(controls.target);
  controls.update();
}

function resizeRenderer() {
  if (!renderer || !camera) return;
  const width = elements.frame.clientWidth;
  const height = elements.frame.clientHeight;
  if (width < 1 || height < 1) return;
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
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
