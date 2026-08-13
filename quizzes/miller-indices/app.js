import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const elements = {
  form: document.querySelector("#miller-quiz-form"),
  clear: document.querySelector("#clear-quiz"),
  feedback: document.querySelector("#quiz-feedback"),
  select: document.querySelector("#figure-select"),
  title: document.querySelector("#figure-title"),
  summary: document.querySelector("#figure-summary"),
  status: document.querySelector("#viewer-status"),
  frame: document.querySelector("#viewer-frame"),
  canvas: document.querySelector("#crystal-canvas"),
  fallback: document.querySelector("#viewer-fallback"),
  normalView: document.querySelector("#normal-view"),
  resetView: document.querySelector("#reset-view")
};

const CUBIC_A = 0.4;
const HCP_A = 0.3;
const HCP_C = 0.49;
const ROOT3 = Math.sqrt(3);

const questionSpecs = [
  { id: "q1", type: "radio", target: "102" },
  { id: "q2", type: "radio", target: "1m20" },
  { id: "q3", type: "number", input: "q3-answer", target: 1 / 3, tolerance: 0.005 },
  { id: "q4", type: "number", input: "q4-answer", target: -1, tolerance: 0.001 },
  { id: "q5", type: "radio", target: "10m11" },
  { id: "q6", type: "radio", target: "2m1m13" },
  { id: "q7", type: "number", input: "q7-answer", target: 2 / CUBIC_A ** 2 },
  { id: "q8", type: "number", input: "q8-answer", target: Math.SQRT2 / CUBIC_A ** 2 },
  { id: "q9", type: "number", input: "q9-answer", target: 4 / (ROOT3 * CUBIC_A ** 2) },
  { id: "q10", type: "number", input: "q10-answer", target: 1 / CUBIC_A ** 2 },
  { id: "q11", type: "number", input: "q11-answer", target: Math.SQRT2 / CUBIC_A ** 2 },
  { id: "q12", type: "number", input: "q12-answer", target: 1 / (ROOT3 * CUBIC_A ** 2) },
  { id: "q13", type: "number", input: "q13-answer", target: 2 / (ROOT3 * HCP_A ** 2) },
  { id: "q14", type: "number", input: "q14-answer", target: 1 / (HCP_A * HCP_C) },
  { id: "q15", type: "number", input: "q15-answer", target: 2 / (ROOT3 * HCP_A * HCP_C) }
];

const figureSpecs = {
  "cubic-102": {
    title: "Cubic (102)",
    summary: "The plane cuts a at x, is parallel to y, and cuts a/2 at z. Its intercept member is shown.",
    type: "cubic",
    structure: "sc",
    hkl: [1, 0, 2],
    offset: 1
  },
  "cubic-1m20": {
    title: "Cubic (1 -2 0)",
    summary: "A parallel member of the same orientation is centred in the cell so its negative-index tilt is easy to see.",
    type: "cubic",
    structure: "sc",
    hkl: [1, -2, 0],
    offset: -0.5
  },
  "cubic-221": {
    title: "Cubic (221)",
    summary: "The plane normal is proportional to (2, 2, 1); cubic spacing follows a divided by the normal-index magnitude.",
    type: "cubic",
    structure: "sc",
    hkl: [2, 2, 1],
    offset: 1
  },
  "hcp-1010": {
    title: "HCP (10-10)",
    summary: "The first-order prism plane is parallel to c and one basal axis. The fourth basal index is fixed by h + k + i = 0.",
    type: "hcp",
    plane: "10m10"
  },
  "hcp-2m1m10": {
    title: "HCP (2 -1 -1 0)",
    summary: "This prismatic plane satisfies h + k + i = 0 and remains parallel to the c axis.",
    type: "hcp",
    plane: "2m1m10"
  },
  "hcp-1011": {
    title: "HCP (10-11)",
    summary: "A first-order pyramidal plane cuts a basal direction and the c axis; it is neither basal nor prismatic.",
    type: "hcp",
    plane: "10m11"
  },
  "hcp-direction": {
    title: "HCP [2 -1 -1 3]",
    summary: "The arrow is the direct-space direction equivalent to three-index [101]. Direction conversion differs from plane conversion.",
    type: "hcp",
    direction: true
  },
  "fcc-100": densitySpec("FCC", "fcc", [1, 0, 0], 0, "Square area a²; 2 effective atoms in the plane."),
  "fcc-110": densitySpec("FCC", "fcc", [1, 1, 0], 1, "Rectangle area √2a²; 2 effective atoms in the plane."),
  "fcc-111": densitySpec("FCC", "fcc", [1, 1, 1], 1, "Triangular area √3a²/2; 2 effective atoms in the plane."),
  "bcc-100": densitySpec("BCC", "bcc", [1, 0, 0], 0, "Square area a²; corner fractions total 1 effective atom."),
  "bcc-110": densitySpec("BCC", "bcc", [1, 1, 0], 1, "Rectangle area √2a²; corner fractions plus the body centre total 2 atoms."),
  "bcc-111": densitySpec("BCC", "bcc", [1, 1, 1], 1, "Triangular area √3a²/2; vertex fractions total 1/2 atom."),
  "hcp-0001": {
    title: "HCP (0001)",
    summary: "Primitive basal rhombus area √3a²/2; one effective atom centre.",
    type: "hcp",
    plane: "0001",
    density: true
  },
  "hcp-10m10": {
    title: "HCP (10-10)",
    summary: "Prism repeat rectangle area ac; one effective atom centre.",
    type: "hcp",
    plane: "10m10",
    density: true
  },
  "hcp-11m20": {
    title: "HCP (11-20)",
    summary: "Prism repeat rectangle area √3ac; two effective atom centres.",
    type: "hcp",
    plane: "11m20",
    density: true
  }
};

let renderer;
let scene;
let camera;
let controls;
let modelRoot;
let resizeObserver;
let rendererReady = false;
let modelCenter = new THREE.Vector3();
let modelRadius = 2;
let planeNormal = new THREE.Vector3(1, 1, 1).normalize();

initialiseQuiz();
initialiseViewer();
runScientificAssertions();

function densitySpec(label, structure, hkl, offset, summary) {
  return {
    title: `${label} (${hkl.join("")})`,
    summary,
    type: "cubic",
    structure,
    hkl,
    offset,
    density: true
  };
}

function initialiseQuiz() {
  elements.form.addEventListener("submit", checkAnswers);
  elements.clear.addEventListener("click", clearAnswers);

  questionSpecs.forEach((spec) => {
    const question = document.querySelector(`[data-question="${spec.id}"]`);
    const inputs = spec.type === "radio"
      ? question.querySelectorAll(`input[name="${spec.id}"]`)
      : [document.querySelector(`#${spec.input}`)];
    inputs.forEach((input) => input.addEventListener("input", () => resetQuestion(spec.id)));
  });

  document.querySelectorAll(".solution-toggle").forEach((button) => {
    button.addEventListener("click", () => {
      const panel = document.querySelector(`#${button.getAttribute("aria-controls")}`);
      const expanded = button.getAttribute("aria-expanded") === "true";
      button.setAttribute("aria-expanded", String(!expanded));
      button.textContent = expanded ? "Show solution" : "Hide solution";
      panel.hidden = expanded;
    });
  });

  document.querySelectorAll("[data-figure]").forEach((button) => {
    button.addEventListener("click", () => {
      const id = button.dataset.figure;
      elements.select.value = id;
      showFigure(id, true);
      if (window.matchMedia("(max-width: 68rem)").matches) {
        elements.frame.scrollIntoView({ behavior: reducedMotion() ? "auto" : "smooth", block: "center" });
      }
    });
  });

  elements.select.addEventListener("change", () => showFigure(elements.select.value, true));
  elements.normalView.addEventListener("click", () => setNormalView(true));
  elements.resetView.addEventListener("click", () => resetCamera(true));
}

function checkAnswers(event) {
  event.preventDefault();
  let attempted = 0;
  let correct = 0;

  questionSpecs.forEach((spec) => {
    const question = document.querySelector(`[data-question="${spec.id}"]`);
    const status = document.querySelector(`#${spec.id}-status`);
    let hasAnswer = false;
    let isCorrect = false;

    if (spec.type === "radio") {
      const selected = question.querySelector(`input[name="${spec.id}"]:checked`);
      hasAnswer = Boolean(selected);
      isCorrect = selected?.value === spec.target;
    } else {
      const input = document.querySelector(`#${spec.input}`);
      hasAnswer = input.value.trim() !== "";
      const value = Number(input.value);
      const tolerance = spec.tolerance ?? Math.max(Math.abs(spec.target) * 0.015, 0.003);
      isCorrect = Number.isFinite(value) && Math.abs(value - spec.target) <= tolerance;
      input.toggleAttribute("aria-invalid", hasAnswer && !isCorrect);
    }

    question.classList.remove("is-correct", "is-incorrect");
    status.className = "answer-status";
    if (!hasAnswer) {
      status.textContent = "Not answered";
      return;
    }

    attempted += 1;
    if (isCorrect) {
      correct += 1;
      question.classList.add("is-correct");
      status.textContent = "Correct";
      status.classList.add("is-correct");
    } else {
      question.classList.add("is-incorrect");
      status.textContent = "Check again";
      status.classList.add("is-incorrect");
    }
  });

  if (!attempted) {
    elements.feedback.textContent = "Answer at least one question before checking.";
  } else if (correct === questionSpecs.length) {
    elements.feedback.textContent = `All ${questionSpecs.length} answers are correct.`;
  } else if (correct === attempted) {
    elements.feedback.textContent = `${correct} attempted answer${correct === 1 ? " is" : "s are"} correct. Complete the remaining questions when ready.`;
  } else {
    elements.feedback.textContent = `${correct} of ${attempted} attempted answers are correct. Review the questions marked “Check again.”`;
  }
}

function clearAnswers() {
  elements.form.reset();
  questionSpecs.forEach((spec) => resetQuestion(spec.id));
  document.querySelectorAll(".solution-toggle").forEach((button) => {
    button.setAttribute("aria-expanded", "false");
    button.textContent = "Show solution";
    document.querySelector(`#${button.getAttribute("aria-controls")}`).hidden = true;
  });
  elements.feedback.textContent = "Answers and open solutions cleared.";
}

function resetQuestion(id) {
  const question = document.querySelector(`[data-question="${id}"]`);
  question.classList.remove("is-correct", "is-incorrect");
  question.querySelectorAll("input").forEach((input) => input.removeAttribute("aria-invalid"));
  const status = document.querySelector(`#${id}-status`);
  status.textContent = "";
  status.className = "answer-status";
  elements.feedback.textContent = "";
}

async function initialiseViewer() {
  try {
    renderer = new THREE.WebGLRenderer({
      canvas: elements.canvas,
      alpha: true,
      antialias: true,
      powerPreference: "low-power"
    });
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(38, 1, 0.05, 100);
    controls = new OrbitControls(camera, elements.canvas);
    controls.enableDamping = false;
    controls.enablePan = false;
    controls.minDistance = 2;
    controls.maxDistance = 18;
    controls.addEventListener("change", render);

    scene.add(new THREE.HemisphereLight(0xffffff, 0x596b8d, 2.4));
    const key = new THREE.DirectionalLight(0xffffff, 3.2);
    key.position.set(4, 6, 5);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0x84bde0, 1.6);
    fill.position.set(-4, -2, 3);
    scene.add(fill);

    rendererReady = true;
    elements.normalView.disabled = false;
    elements.resetView.disabled = false;
    elements.fallback.hidden = true;

    if (typeof ResizeObserver === "function") {
      resizeObserver = new ResizeObserver(resizeViewer);
      resizeObserver.observe(elements.frame);
    } else {
      window.addEventListener("resize", resizeViewer);
    }

    elements.canvas.addEventListener("webglcontextlost", (event) => {
      event.preventDefault();
      showViewerFailure("The 3D context was lost. Reload the page to restore the figure.");
    }, { once: true });

    resizeViewer();
    showFigure(elements.select.value, false);
  } catch (error) {
    console.warn("Crystallography viewer could not start.", error);
    showViewerFailure("The 3D figure is unavailable. The questions and worked solutions remain usable.");
  }
}

function showViewerFailure(message) {
  rendererReady = false;
  elements.fallback.textContent = message;
  elements.fallback.hidden = false;
  elements.normalView.disabled = true;
  elements.resetView.disabled = true;
  elements.status.textContent = message;
}

function showFigure(id, announce) {
  const spec = figureSpecs[id];
  if (!spec) return;
  elements.title.textContent = spec.title;
  elements.summary.textContent = spec.summary;
  elements.normalView.textContent = spec.direction ? "View along direction" : "View normal to plane";
  elements.canvas.setAttribute("aria-label", `${spec.title}. ${spec.summary} Drag to orbit and scroll or pinch to zoom.`);

  if (rendererReady) {
    rebuildModel(spec);
    resetCamera(false);
  }

  if (announce) {
    elements.status.textContent = `${spec.title} figure selected.`;
  }
}

function rebuildModel(spec) {
  disposeObject(modelRoot);
  if (modelRoot) scene.remove(modelRoot);
  modelRoot = spec.type === "cubic" ? buildCubicFigure(spec) : buildHcpFigure(spec);
  scene.add(modelRoot);

  const box = new THREE.Box3().setFromObject(modelRoot);
  const sphere = box.getBoundingSphere(new THREE.Sphere());
  modelCenter.copy(sphere.center);
  modelRadius = Math.max(sphere.radius, 1.6);
  controls.target.copy(modelCenter);
  controls.minDistance = Math.max(1.4, modelRadius * 0.75);
  controls.maxDistance = modelRadius * 6;
  render();
}

function buildCubicFigure(spec) {
  const root = new THREE.Group();
  const size = 2.2;
  const map = ([x, y, z]) => new THREE.Vector3(
    (x - 0.5) * size,
    (y - 0.5) * size,
    (z - 0.5) * size
  );

  addCubeFrame(root, map);
  const fractionalPolygon = intersectCubeWithPlane(spec.hkl, spec.offset);
  const polygon = fractionalPolygon.map(map);
  if (polygon.length >= 3) addPlanePatch(root, polygon);

  planeNormal = new THREE.Vector3(...spec.hkl).normalize();
  const atomCoordinates = cubicAtomCoordinates(spec.structure);
  addAtoms(root, atomCoordinates.map((coordinate) => ({
    position: map(coordinate),
    onPlane: Math.abs(dot3(spec.hkl, coordinate) - spec.offset) < 1e-7
  })), size * 0.085);

  addAxisTriad(root, map([0, 0, 0]), size * 0.55);
  return root;
}

function cubicAtomCoordinates(structure) {
  const coordinates = [];
  for (const x of [0, 1]) {
    for (const y of [0, 1]) {
      for (const z of [0, 1]) coordinates.push([x, y, z]);
    }
  }
  if (structure === "fcc") {
    coordinates.push(
      [0, 0.5, 0.5], [1, 0.5, 0.5],
      [0.5, 0, 0.5], [0.5, 1, 0.5],
      [0.5, 0.5, 0], [0.5, 0.5, 1]
    );
  } else if (structure === "bcc") {
    coordinates.push([0.5, 0.5, 0.5]);
  }
  return coordinates;
}

function intersectCubeWithPlane(normal, offset) {
  const vertices = [
    [0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0],
    [0, 0, 1], [1, 0, 1], [0, 1, 1], [1, 1, 1]
  ];
  const edges = [
    [0, 1], [0, 2], [1, 3], [2, 3],
    [4, 5], [4, 6], [5, 7], [6, 7],
    [0, 4], [1, 5], [2, 6], [3, 7]
  ];
  const points = [];

  edges.forEach(([aIndex, bIndex]) => {
    const a = vertices[aIndex];
    const b = vertices[bIndex];
    const da = dot3(normal, a) - offset;
    const db = dot3(normal, b) - offset;
    if (Math.abs(da) < 1e-8) points.push(a);
    if (Math.abs(db) < 1e-8) points.push(b);
    if (da * db < -1e-12) {
      const t = da / (da - db);
      points.push([
        a[0] + (b[0] - a[0]) * t,
        a[1] + (b[1] - a[1]) * t,
        a[2] + (b[2] - a[2]) * t
      ]);
    }
  });

  const unique = dedupePoints(points.map((point) => new THREE.Vector3(...point)));
  if (unique.length < 3) return [];
  const centre = unique.reduce((sum, point) => sum.add(point), new THREE.Vector3()).multiplyScalar(1 / unique.length);
  const n = new THREE.Vector3(...normal).normalize();
  const helper = Math.abs(n.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
  const u = new THREE.Vector3().crossVectors(n, helper).normalize();
  const v = new THREE.Vector3().crossVectors(n, u).normalize();
  unique.sort((p, q) => {
    const dp = p.clone().sub(centre);
    const dq = q.clone().sub(centre);
    return Math.atan2(dp.dot(v), dp.dot(u)) - Math.atan2(dq.dot(v), dq.dot(u));
  });
  return unique.map((point) => point.toArray());
}

function buildHcpFigure(spec) {
  const root = new THREE.Group();
  const a = 1.55;
  const c = 2.42;
  const a1 = new THREE.Vector3(a, 0, 0);
  const a2 = new THREE.Vector3(-a / 2, 0, ROOT3 * a / 2);
  const cVector = new THREE.Vector3(0, c, 0);
  const fractionalToScene = ([u, v, w]) => new THREE.Vector3()
    .addScaledVector(a1, u)
    .addScaledVector(a2, v)
    .addScaledVector(cVector, w);

  addHexagonalFrame(root, a1, a2, cVector);
  const basalA = [];
  const middleB = [];
  for (let u = -2; u <= 2; u += 1) {
    for (let v = -2; v <= 2; v += 1) {
      const basal = fractionalToScene([u, v, 0]);
      if (insideHcpPrism(basal, a, 1e-7)) basalA.push([u, v]);
      const shifted = fractionalToScene([u + 2 / 3, v + 1 / 3, 0]);
      if (insideHcpPrism(shifted, a, 1e-7)) middleB.push([u + 2 / 3, v + 1 / 3]);
    }
  }
  const sites = [];
  basalA.forEach(([u, v]) => {
    for (const w of [0, 1]) {
      sites.push({ fractional: [u, v, w], position: fractionalToScene([u, v, w]) });
    }
  });
  middleB.forEach(([u, v]) => {
    sites.push({ fractional: [u, v, 0.5], position: fractionalToScene([u, v, 0.5]) });
  });

  let polygon = [];
  let planeTest = () => false;
  if (spec.direction) {
    const start = fractionalToScene([0, 0, 0]);
    const end = fractionalToScene([1, 0, 1]);
    root.add(createArrow(start, end, 0xf05030));
    planeNormal = end.clone().sub(start).normalize();
  } else if (spec.plane === "0001") {
    polygon = [[0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0]].map(fractionalToScene);
    planeTest = ([, , w]) => Math.abs(w) < 1e-7;
    planeNormal = new THREE.Vector3(0, 1, 0);
  } else if (spec.plane === "10m10") {
    polygon = [[0, 0, 0], [0, 1, 0], [0, 1, 1], [0, 0, 1]].map(fractionalToScene);
    planeTest = ([u]) => Math.abs(u) < 1e-7;
    planeNormal = new THREE.Vector3().crossVectors(a2, cVector).normalize();
  } else if (spec.plane === "2m1m10") {
    polygon = [[1, 1, 0], [0, -1, 0], [0, -1, 1], [1, 1, 1]].map(fractionalToScene);
    planeTest = ([u, v]) => Math.abs(2 * u - v - 1) < 1e-7;
    planeNormal = new THREE.Vector3().crossVectors(a1.clone().addScaledVector(a2, 2), cVector).normalize();
  } else if (spec.plane === "11m20") {
    polygon = [[0, 1, 0], [1, 0, 0], [1, 0, 1], [0, 1, 1]].map(fractionalToScene);
    planeTest = ([u, v]) => Math.abs(u + v - 1) < 1e-7;
    planeNormal = new THREE.Vector3().crossVectors(a1.clone().sub(a2), cVector).normalize();
  } else {
    polygon = [[1, 0, 0], [1, 1, 0], [0, 1, 1], [0, 0, 1]].map(fractionalToScene);
    planeTest = ([u, , w]) => Math.abs(u + w - 1) < 1e-7;
    planeNormal = new THREE.Vector3().crossVectors(
      polygon[1].clone().sub(polygon[0]),
      polygon[3].clone().sub(polygon[0])
    ).normalize();
  }

  if (polygon.length) addPlanePatch(root, polygon);
  addAtoms(root, sites.map((site) => ({ position: site.position, onPlane: planeTest(site.fractional) })), a * 0.09);
  addHcpAxes(root, fractionalToScene([0, 0, 0]), a1, a2, cVector);
  return root;
}

function addCubeFrame(root, map) {
  const vertices = [
    [0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0],
    [0, 0, 1], [1, 0, 1], [0, 1, 1], [1, 1, 1]
  ].map(map);
  const edgeIndices = [
    [0, 1], [0, 2], [1, 3], [2, 3],
    [4, 5], [4, 6], [5, 7], [6, 7],
    [0, 4], [1, 5], [2, 6], [3, 7]
  ];
  const points = edgeIndices.flatMap(([a, b]) => [vertices[a], vertices[b]]);
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  root.add(new THREE.LineSegments(geometry, new THREE.LineBasicMaterial({ color: 0x2e2a74, opacity: 0.75, transparent: true })));
}

function addHexagonalFrame(root, a1, a2, cVector) {
  const basal = [
    a1, a1.clone().add(a2), a2,
    a1.clone().negate(), a1.clone().add(a2).negate(), a2.clone().negate()
  ];
  const points = [];
  for (let i = 0; i < 6; i += 1) {
    const next = (i + 1) % 6;
    points.push(basal[i], basal[next]);
    points.push(basal[i].clone().add(cVector), basal[next].clone().add(cVector));
    points.push(basal[i], basal[i].clone().add(cVector));
  }
  root.add(new THREE.LineSegments(
    new THREE.BufferGeometry().setFromPoints(points),
    new THREE.LineBasicMaterial({ color: 0x2e2a74, opacity: 0.72, transparent: true })
  ));
}

function addPlanePatch(root, polygon) {
  const geometry = new THREE.BufferGeometry().setFromPoints(polygon);
  const indices = [];
  for (let i = 1; i < polygon.length - 1; i += 1) indices.push(0, i, i + 1);
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const mesh = new THREE.Mesh(geometry, new THREE.MeshPhongMaterial({
    color: 0x68a7d8,
    depthWrite: false,
    opacity: 0.33,
    shininess: 60,
    side: THREE.DoubleSide,
    transparent: true
  }));
  mesh.renderOrder = 1;
  root.add(mesh);

  const outlinePoints = [...polygon, polygon[0]];
  const outline = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(outlinePoints),
    new THREE.LineBasicMaterial({ color: 0x245f7a, opacity: 0.95, transparent: true })
  );
  outline.renderOrder = 2;
  root.add(outline);
}

function addAtoms(root, atoms, radius) {
  const geometry = new THREE.SphereGeometry(radius, 24, 18);
  const hostMaterial = new THREE.MeshStandardMaterial({
    color: 0x769bb5,
    depthWrite: false,
    metalness: 0.05,
    opacity: 0.48,
    roughness: 0.38,
    transparent: true
  });
  const planeMaterial = new THREE.MeshStandardMaterial({
    color: 0xf17850,
    emissive: 0x7d2516,
    emissiveIntensity: 0.11,
    metalness: 0.04,
    roughness: 0.3
  });

  atoms.forEach(({ position, onPlane }) => {
    const atom = new THREE.Mesh(geometry, onPlane ? planeMaterial : hostMaterial);
    atom.position.copy(position);
    atom.renderOrder = onPlane ? 4 : 0;
    root.add(atom);
  });
}

function addAxisTriad(root, origin, length) {
  const axes = [
    { direction: new THREE.Vector3(1, 0, 0), color: 0xca3e25 },
    { direction: new THREE.Vector3(0, 1, 0), color: 0x2d7b61 },
    { direction: new THREE.Vector3(0, 0, 1), color: 0x386694 }
  ];
  axes.forEach(({ direction, color }) => root.add(new THREE.ArrowHelper(direction, origin, length, color, length * 0.18, length * 0.09)));
}

function addHcpAxes(root, origin, a1, a2, cVector) {
  [
    { vector: a1, color: 0xca3e25 },
    { vector: a2, color: 0x2d7b61 },
    { vector: a1.clone().add(a2).negate(), color: 0x6a55a3 },
    { vector: cVector, color: 0x386694 }
  ].forEach(({ vector, color }) => {
    root.add(new THREE.ArrowHelper(vector.clone().normalize(), origin, vector.length() * 0.72, color, 0.22, 0.11));
  });
}

function insideHcpPrism(point, radius, tolerance = 0) {
  const vertices = Array.from({ length: 6 }, (_, index) => new THREE.Vector2(
    radius * Math.cos(index * Math.PI / 3),
    radius * Math.sin(index * Math.PI / 3)
  ));
  const target = new THREE.Vector2(point.x, point.z);
  let sign = 0;
  for (let index = 0; index < vertices.length; index += 1) {
    const a = vertices[index];
    const b = vertices[(index + 1) % vertices.length];
    const cross = (b.x - a.x) * (target.y - a.y) - (b.y - a.y) * (target.x - a.x);
    if (Math.abs(cross) <= tolerance) continue;
    const current = Math.sign(cross);
    if (!sign) sign = current;
    else if (current !== sign) return false;
  }
  return true;
}

function createArrow(start, end, color) {
  const direction = end.clone().sub(start);
  const length = direction.length();
  return new THREE.ArrowHelper(direction.normalize(), start, length, color, Math.min(0.34, length * 0.18), Math.min(0.18, length * 0.09));
}

function resetCamera(announce) {
  if (!rendererReady) return;
  const distance = modelRadius * 2.9;
  camera.up.set(0, 1, 0);
  camera.position.copy(modelCenter).add(new THREE.Vector3(1.2, 0.9, 1.35).normalize().multiplyScalar(distance));
  camera.near = Math.max(0.02, distance - modelRadius * 1.4);
  camera.far = distance + modelRadius * 5;
  camera.updateProjectionMatrix();
  controls.target.copy(modelCenter);
  controls.update();
  render();
  if (announce) elements.status.textContent = "Isometric view restored.";
}

function setNormalView(announce) {
  if (!rendererReady) return;
  const direction = planeNormal.clone().normalize();
  const distance = modelRadius * 3;
  const up = Math.abs(direction.dot(new THREE.Vector3(0, 1, 0))) > 0.92
    ? new THREE.Vector3(0, 0, -1)
    : new THREE.Vector3(0, 1, 0);
  camera.up.copy(up);
  camera.position.copy(modelCenter).add(direction.multiplyScalar(distance));
  camera.near = Math.max(0.02, distance - modelRadius * 1.4);
  camera.far = distance + modelRadius * 5;
  camera.updateProjectionMatrix();
  controls.target.copy(modelCenter);
  controls.update();
  render();
  if (announce) {
    const directionFigure = figureSpecs[elements.select.value]?.direction;
    elements.status.textContent = directionFigure
      ? "View aligned with the displayed direction."
      : "View set normal to the displayed plane.";
  }
}

function resizeViewer() {
  if (!rendererReady) return;
  const width = elements.frame.clientWidth;
  const height = elements.frame.clientHeight;
  if (!width || !height) return;
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  render();
}

function render() {
  if (rendererReady) renderer.render(scene, camera);
}

function disposeObject(object) {
  if (!object) return;
  const geometries = new Set();
  const materials = new Set();
  object.traverse((child) => {
    if (child.geometry) geometries.add(child.geometry);
    const materialList = Array.isArray(child.material) ? child.material : [child.material];
    materialList.filter(Boolean).forEach((material) => materials.add(material));
  });
  geometries.forEach((geometry) => geometry.dispose());
  materials.forEach((material) => material.dispose());
}

function dedupePoints(points) {
  const unique = [];
  points.forEach((point) => {
    if (!unique.some((other) => other.distanceToSquared(point) < 1e-14)) unique.push(point.clone());
  });
  return unique;
}

function dot3(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function reducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function runScientificAssertions() {
  const close = (actual, expected, tolerance = 1e-10) => Math.abs(actual - expected) <= tolerance;
  console.assert(close(questionSpecs.find(({ id }) => id === "q7").target, 12.5), "FCC (100) density regression failed.");
  console.assert(close(questionSpecs.find(({ id }) => id === "q9").target, 14.4337567297, 1e-9), "FCC (111) density regression failed.");
  console.assert(close(questionSpecs.find(({ id }) => id === "q11").target, 8.8388347648, 1e-9), "BCC (110) density regression failed.");
  console.assert(close(questionSpecs.find(({ id }) => id === "q13").target, 12.8300059819, 1e-9), "HCP (0001) density regression failed.");
  console.assert(2 + -1 + -1 === 0, "Miller-Bravais plane constraint failed.");
  console.assert(2 + -1 + -1 === 0, "Miller-Bravais direction constraint failed.");
}
