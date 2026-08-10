let THREE;
let OrbitControls;

const LATTICE_SPACING = 0.72;
const BURGERS_MAGNITUDE = LATTICE_SPACING;
const COLORS = {
  atom: 0x76a6d2,
  bond: 0x9db6d2,
  edgePlane: 0xf4bb54,
  screwPlane: 0x3fd8c4,
  circuit: 0x73e39f,
  burgers: 0xff735b,
  line: 0xc58cff,
  boundary: 0x8596bc
};

const elements = {
  frame: document.querySelector("#viewer-frame"),
  canvas: document.querySelector("#dislocation-canvas"),
  fallback: document.querySelector("#viewer-fallback"),
  legend: document.querySelector(".viewer-legend"),
  viewerTitle: document.querySelector("#viewer-title"),
  viewOrientation: document.querySelector("#view-orientation"),
  defectLegend: document.querySelector("#defect-legend"),
  defectLegendItem: document.querySelector("#defect-legend-item"),
  circuitLegendItem: document.querySelector("#circuit-legend-item"),
  burgersLegendItem: document.querySelector("#burgers-legend-item"),
  summary: document.querySelector("#selection-summary"),
  edgeMode: document.querySelector("#edge-mode"),
  screwMode: document.querySelector("#screw-mode"),
  modeDescription: document.querySelector("#mode-description"),
  showCircuit: document.querySelector("#show-circuit"),
  showDefectSurface: document.querySelector("#show-defect-surface"),
  showBonds: document.querySelector("#show-bonds"),
  surfaceControlLabel: document.querySelector("#surface-control-label"),
  surfaceControlNote: document.querySelector("#surface-control-note"),
  relationshipSymbol: document.querySelector("#relationship-symbol"),
  relationshipIndices: document.querySelector("#relationship-indices"),
  relationshipExplanation: document.querySelector("#relationship-explanation")
};

const state = {
  mode: "edge",
  showCircuit: true,
  showDefectSurface: true,
  showBonds: true
};

let scene;
let camera;
let renderer;
let controls;
let defectGroup;
let resizeObserver;
let rendererReady = false;
let contextLost = false;
let restoreTimer;

start();

async function start() {
  setExplorerControls(false);

  try {
    THREE = await import("three");
    ({ OrbitControls } = await import("three/addons/controls/OrbitControls.js"));
    createScene();
    rendererReady = true;
    bindControls();
    rebuildModel();
    updateInterface();
    resizeRenderer();
    showViewer();
    renderScene();
  } catch (error) {
    console.error(error);
    showFallback("The interactive 3D model is unavailable. Use the Edge/Screw explanation and Burgers-vector relationship to continue.");
  }
}

function createScene() {
  renderer = new THREE.WebGLRenderer({
    canvas: elements.canvas,
    antialias: true,
    alpha: true
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  camera.position.set(5.8, 4.5, 6.6);

  controls = new OrbitControls(camera, elements.canvas);
  elements.canvas.style.touchAction = "pan-y pinch-zoom";
  controls.enableDamping = false;
  controls.minDistance = 4.6;
  controls.maxDistance = 12;
  controls.target.set(0, 0.05, 0);
  controls.update();
  controls.addEventListener("start", () => {
    elements.viewOrientation.value = "custom";
  });
  controls.addEventListener("change", renderScene);

  scene.add(new THREE.HemisphereLight(0xd9edff, 0x171536, 2.25));

  const keyLight = new THREE.DirectionalLight(0xffffff, 2.75);
  keyLight.position.set(5, 7, 8);
  scene.add(keyLight);

  const fillLight = new THREE.DirectionalLight(0xa8c9ff, 1.35);
  fillLight.position.set(-6, 1, -5);
  scene.add(fillLight);

  elements.canvas.addEventListener("webglcontextlost", handleContextLost);
  elements.canvas.addEventListener("webglcontextrestored", handleContextRestored);

  if (typeof ResizeObserver === "function") {
    resizeObserver = new ResizeObserver(resizeRenderer);
    resizeObserver.observe(elements.frame);
  } else {
    window.addEventListener("resize", resizeRenderer);
  }
}

function setExplorerControls(enabled) {
  [
    elements.viewOrientation,
    elements.edgeMode,
    elements.screwMode,
    elements.showCircuit,
    elements.showDefectSurface,
    elements.showBonds
  ].forEach(control => {
    if (control) control.disabled = !enabled;
  });
}

function bindControls() {
  elements.edgeMode.addEventListener("click", () => setMode("edge"));
  elements.screwMode.addEventListener("click", () => setMode("screw"));

  elements.showCircuit.addEventListener("change", () => {
    state.showCircuit = elements.showCircuit.checked;
    rebuildModel();
    updateLayerInterface();
  });

  elements.showDefectSurface.addEventListener("change", () => {
    state.showDefectSurface = elements.showDefectSurface.checked;
    rebuildModel();
    updateLayerInterface();
  });

  elements.showBonds.addEventListener("change", () => {
    state.showBonds = elements.showBonds.checked;
    rebuildModel();
    updateLayerInterface();
  });

  elements.viewOrientation.addEventListener("change", () => {
    if (!camera || !controls || elements.viewOrientation.value === "custom") return;
    setViewOrientation(elements.viewOrientation.value);
  });
}

function setMode(mode) {
  if (mode === state.mode) return;
  state.mode = mode;
  rebuildModel();
  updateInterface();
}

function rebuildModel() {
  if (!rendererReady || !scene) return;
  disposeObject(defectGroup);
  defectGroup = state.mode === "edge" ? createEdgeModel() : createScrewModel();
  scene.add(defectGroup);
  renderScene();
}

function createEdgeModel() {
  const group = new THREE.Group();
  group.name = "Edge dislocation model";

  const lattice = createEdgeLatticeData();
  addLattice(group, lattice, COLORS.edgePlane);

  if (state.showDefectSurface) {
    group.add(createEdgeHalfPlane());
  }

  group.add(createBoundary());
  group.add(createDislocationLine());

  if (state.showCircuit) {
    group.add(createEdgeReferenceCircuit());
  }

  return group;
}

function createScrewModel() {
  const group = new THREE.Group();
  group.name = "Screw dislocation model";

  const lattice = createScrewLatticeData();
  addLattice(group, lattice, COLORS.screwPlane);

  if (state.showDefectSurface) {
    group.add(createHelicoidalPlane());
  }

  group.add(createBoundary());
  group.add(createDislocationLine());

  if (state.showCircuit) {
    group.add(createScrewReferenceCircuit());
  }

  return group;
}

function createEdgeLatticeData() {
  const atoms = [];
  const highlightedAtoms = [];
  const positions = new Map();
  const halfIndices = [-2.5, -1.5, -0.5, 0.5, 1.5, 2.5];
  const layerIndices = [-2, -1, 0, 1, 2];

  halfIndices.forEach((xIndex, xPosition) => {
    halfIndices.forEach((yIndex, yPosition) => {
      layerIndices.forEach((zIndex) => {
        const referenceX = xIndex * LATTICE_SPACING;
        const referenceY = yIndex * LATTICE_SPACING;
        const radiusSquared = referenceX * referenceX + referenceY * referenceY;
        const influence = Math.exp(-radiusSquared / 1.75);
        const outwardShift = referenceY > 0 ? 0.18 * Math.sign(referenceX) * influence : 0;
        const lowerTension = referenceY < 0 ? 0.085 * Math.sign(referenceX) * influence : 0;
        const position = new THREE.Vector3(
          referenceX + outwardShift + lowerTension,
          referenceY + 0.035 * Math.sign(referenceY) * influence,
          zIndex * LATTICE_SPACING
        );

        atoms.push(position);
        positions.set(`b-${xPosition}-${yPosition}-${zIndex}`, position);
      });
    });
  });

  const extraYIndices = [0.5, 1.5, 2.5];
  extraYIndices.forEach((yIndex, yPosition) => {
    layerIndices.forEach((zIndex) => {
      const position = new THREE.Vector3(0, yIndex * LATTICE_SPACING, zIndex * LATTICE_SPACING);
      highlightedAtoms.push(position);
      positions.set(`e-${yPosition}-${zIndex}`, position);
    });
  });

  const bonds = [];
  halfIndices.forEach((xIndex, xPosition) => {
    halfIndices.forEach((yIndex, yPosition) => {
      layerIndices.forEach((zIndex) => {
        const current = positions.get(`b-${xPosition}-${yPosition}-${zIndex}`);
        addBondIfPresent(bonds, current, positions.get(`b-${xPosition + 1}-${yPosition}-${zIndex}`));
        addBondIfPresent(bonds, current, positions.get(`b-${xPosition}-${yPosition + 1}-${zIndex}`));
        addBondIfPresent(bonds, current, positions.get(`b-${xPosition}-${yPosition}-${zIndex + 1}`));
      });
    });
  });

  extraYIndices.forEach((yIndex, yPosition) => {
    layerIndices.forEach((zIndex) => {
      const current = positions.get(`e-${yPosition}-${zIndex}`);
      addBondIfPresent(bonds, current, positions.get(`e-${yPosition + 1}-${zIndex}`));
      addBondIfPresent(bonds, current, positions.get(`e-${yPosition}-${zIndex + 1}`));

      const baseYPosition = halfIndices.indexOf(yIndex);
      if (baseYPosition >= 0) {
        addBondIfPresent(bonds, current, positions.get(`b-2-${baseYPosition}-${zIndex}`));
        addBondIfPresent(bonds, current, positions.get(`b-3-${baseYPosition}-${zIndex}`));
      }
    });
  });

  return { atoms, highlightedAtoms, bonds };
}

function createScrewLatticeData() {
  const atoms = [];
  const highlightedAtoms = [];
  const positions = new Map();
  const angles = new Map();
  const halfIndices = [-2.5, -1.5, -0.5, 0.5, 1.5, 2.5];
  const sourceLayers = [-3, -2, -1, 0, 1, 2, 3];
  const zLimit = 1.8;

  halfIndices.forEach((xIndex, xPosition) => {
    halfIndices.forEach((yIndex, yPosition) => {
      const x = xIndex * LATTICE_SPACING;
      const y = yIndex * LATTICE_SPACING;
      const theta = Math.atan2(y, x);
      const displacement = BURGERS_MAGNITUDE * theta / (2 * Math.PI);
      angles.set(`${xPosition}-${yPosition}`, theta);

      sourceLayers.forEach((zIndex) => {
        const z = zIndex * LATTICE_SPACING + displacement;
        if (z < -zLimit || z > zLimit) return;

        const position = new THREE.Vector3(x, y, z);
        if (zIndex === 0) {
          highlightedAtoms.push(position);
        } else {
          atoms.push(position);
        }
        positions.set(`${xPosition}-${yPosition}-${zIndex}`, position);
      });
    });
  });

  const bonds = [];
  halfIndices.forEach((xIndex, xPosition) => {
    halfIndices.forEach((yIndex, yPosition) => {
      sourceLayers.forEach((zIndex) => {
        const current = positions.get(`${xPosition}-${yPosition}-${zIndex}`);
        if (!current) return;
        addScrewPlanarBond(bonds, positions, angles, xPosition, yPosition, zIndex, xPosition + 1, yPosition);
        addScrewPlanarBond(bonds, positions, angles, xPosition, yPosition, zIndex, xPosition, yPosition + 1);
        addBondIfPresent(bonds, current, positions.get(`${xPosition}-${yPosition}-${zIndex + 1}`));
      });
    });
  });

  return { atoms, highlightedAtoms, bonds };
}

function addScrewPlanarBond(bonds, positions, angles, xPosition, yPosition, zIndex, nextX, nextY) {
  const start = positions.get(`${xPosition}-${yPosition}-${zIndex}`);
  const startAngle = angles.get(`${xPosition}-${yPosition}`);
  const endAngle = angles.get(`${nextX}-${nextY}`);
  if (!start || startAngle === undefined || endAngle === undefined) return;

  const angleJump = endAngle - startAngle;
  let endLayer = zIndex;
  if (angleJump > Math.PI) endLayer -= 1;
  if (angleJump < -Math.PI) endLayer += 1;

  addBondIfPresent(bonds, start, positions.get(`${nextX}-${nextY}-${endLayer}`));
}

function addBondIfPresent(bonds, start, end) {
  if (start && end) bonds.push([start, end]);
}

function addLattice(group, lattice, highlightColor) {
  const ordinaryPositions = state.showDefectSurface
    ? lattice.atoms
    : lattice.atoms.concat(lattice.highlightedAtoms);

  if (ordinaryPositions.length > 0) {
    group.add(createAtoms(ordinaryPositions, COLORS.atom, 0.105));
  }

  if (state.showDefectSurface && lattice.highlightedAtoms.length > 0) {
    group.add(createAtoms(lattice.highlightedAtoms, highlightColor, 0.125));
  }

  if (state.showBonds) {
    group.add(createBonds(lattice.bonds));
  }
}

function createAtoms(positions, color, radius) {
  const geometry = new THREE.SphereGeometry(radius, 18, 12);
  const material = new THREE.MeshPhysicalMaterial({
    color,
    roughness: 0.34,
    metalness: 0.04,
    clearcoat: 0.42,
    clearcoatRoughness: 0.3
  });
  const atoms = new THREE.InstancedMesh(geometry, material, positions.length);
  const matrix = new THREE.Matrix4();

  positions.forEach((position, index) => {
    matrix.makeTranslation(position.x, position.y, position.z);
    atoms.setMatrixAt(index, matrix);
  });
  atoms.instanceMatrix.needsUpdate = true;
  atoms.name = "Atomic lattice";
  return atoms;
}

function createBonds(bonds) {
  const coordinates = [];
  bonds.forEach(([start, end]) => {
    coordinates.push(start.x, start.y, start.z, end.x, end.y, end.z);
  });

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(coordinates, 3));
  const material = new THREE.LineBasicMaterial({
    color: COLORS.bond,
    transparent: true,
    opacity: 0.3,
    depthWrite: false
  });
  const lines = new THREE.LineSegments(geometry, material);
  lines.name = "Atomic connections";
  return lines;
}

function createEdgeHalfPlane() {
  const group = new THREE.Group();
  group.name = "Extra half-plane";

  const geometry = new THREE.PlaneGeometry(3.35, 2.2);
  const material = new THREE.MeshStandardMaterial({
    color: COLORS.edgePlane,
    transparent: true,
    opacity: 0.2,
    side: THREE.DoubleSide,
    depthWrite: false,
    roughness: 0.45,
    metalness: 0.02
  });
  const plane = new THREE.Mesh(geometry, material);
  plane.rotation.y = Math.PI / 2;
  plane.position.y = 1.1;
  plane.renderOrder = 1;
  group.add(plane);

  const outline = new THREE.LineSegments(
    new THREE.EdgesGeometry(geometry),
    new THREE.LineBasicMaterial({ color: 0xffdc91, transparent: true, opacity: 0.95 })
  );
  outline.rotation.copy(plane.rotation);
  outline.position.copy(plane.position);
  outline.renderOrder = 3;
  group.add(outline);

  const label = makeLabelSprite("extra half-plane", "#3d2a08", "rgba(255, 220, 145, 0.96)", 520);
  label.position.set(0.08, 2.1, 1.15);
  group.add(label);

  return group;
}

function createHelicoidalPlane() {
  const group = new THREE.Group();
  group.name = "Helicoidal atomic plane";
  const radialSegments = 14;
  const angularSegments = 72;
  const innerRadius = 0.22;
  const outerRadius = 2.25;
  const positions = [];
  const indices = [];

  for (let angleIndex = 0; angleIndex <= angularSegments; angleIndex += 1) {
    const theta = -Math.PI + (2 * Math.PI * angleIndex) / angularSegments;
    const z = BURGERS_MAGNITUDE * theta / (2 * Math.PI);

    for (let radiusIndex = 0; radiusIndex <= radialSegments; radiusIndex += 1) {
      const radius = innerRadius + ((outerRadius - innerRadius) * radiusIndex) / radialSegments;
      positions.push(radius * Math.cos(theta), radius * Math.sin(theta), z);
    }
  }

  const rowLength = radialSegments + 1;
  for (let angleIndex = 0; angleIndex < angularSegments; angleIndex += 1) {
    for (let radiusIndex = 0; radiusIndex < radialSegments; radiusIndex += 1) {
      const first = angleIndex * rowLength + radiusIndex;
      const second = first + rowLength;
      indices.push(first, second, first + 1, second, second + 1, first + 1);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  const surface = new THREE.Mesh(
    geometry,
    new THREE.MeshStandardMaterial({
      color: COLORS.screwPlane,
      transparent: true,
      opacity: 0.2,
      side: THREE.DoubleSide,
      depthWrite: false,
      roughness: 0.42,
      metalness: 0.02
    })
  );
  surface.renderOrder = 1;
  group.add(surface);

  const outerPoints = [];
  for (let index = 0; index <= angularSegments; index += 1) {
    const theta = -Math.PI + (2 * Math.PI * index) / angularSegments;
    outerPoints.push(new THREE.Vector3(
      outerRadius * Math.cos(theta),
      outerRadius * Math.sin(theta),
      BURGERS_MAGNITUDE * theta / (2 * Math.PI)
    ));
  }
  const rim = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(outerPoints),
    new THREE.LineBasicMaterial({ color: 0xa0fff2, transparent: true, opacity: 0.92 })
  );
  rim.renderOrder = 3;
  group.add(rim);

  const label = makeLabelSprite("helicoidal atomic plane", "#073c3a", "rgba(160, 255, 242, 0.96)", 610);
  label.position.set(1.42, 1.62, 0.28);
  group.add(label);

  return group;
}

function createBoundary() {
  const geometry = new THREE.EdgesGeometry(new THREE.BoxGeometry(4.55, 4.55, 3.65));
  const material = new THREE.LineBasicMaterial({
    color: COLORS.boundary,
    transparent: true,
    opacity: 0.18,
    depthWrite: false
  });
  const boundary = new THREE.LineSegments(geometry, material);
  boundary.name = "Crystal boundary";
  return boundary;
}

function createDislocationLine() {
  const group = createVectorArrow(
    new THREE.Vector3(0, 0, -1.95),
    new THREE.Vector3(0, 0, 1.95),
    COLORS.line,
    { shaftRadius: 0.032, headRadius: 0.11, headLength: 0.24, tail: false }
  );
  group.name = "Dislocation line direction xi";

  const label = makeLabelSprite("ξ", "#281041", "rgba(224, 197, 255, 0.96)", 150);
  label.position.set(0.13, 0.16, 2.03);
  group.add(label);
  return group;
}

function createEdgeReferenceCircuit() {
  const group = new THREE.Group();
  group.name = "Mapped reference Burgers circuit for edge dislocation";
  const z = 1.62;
  const minimum = -2.5 * LATTICE_SPACING;
  const maximum = 2.5 * LATTICE_SPACING;
  const start = new THREE.Vector3(minimum, minimum, z);
  const end = new THREE.Vector3(minimum + BURGERS_MAGNITUDE, minimum, z);
  const points = expandLatticePath([
    start,
    new THREE.Vector3(maximum, minimum, z),
    new THREE.Vector3(maximum, maximum, z),
    new THREE.Vector3(minimum + BURGERS_MAGNITUDE, maximum, z),
    end
  ]);

  group.add(createSegmentedTube(points, COLORS.circuit, 0.025));
  group.add(createPathDirectionMarker(points[6], points[7], COLORS.circuit));

  const burgersArrow = createVectorArrow(start, end, COLORS.burgers, {
    shaftRadius: 0.04,
    headRadius: 0.13,
    headLength: 0.2,
    tail: true
  });
  group.add(burgersArrow);

  const label = makeLabelSprite("b", "#4b1208", "rgba(255, 182, 166, 0.97)", 150);
  label.position.copy(start).lerp(end, 0.5).add(new THREE.Vector3(0, -0.18, 0.06));
  group.add(label);
  return group;
}

function createScrewReferenceCircuit() {
  const group = new THREE.Group();
  group.name = "Mapped reference Burgers circuit for screw dislocation";
  const minimum = -2.5 * LATTICE_SPACING;
  const maximum = 2.5 * LATTICE_SPACING;
  const planarPoints = expandLatticePath([
    new THREE.Vector3(minimum, minimum, 0),
    new THREE.Vector3(maximum, minimum, 0),
    new THREE.Vector3(maximum, maximum, 0),
    new THREE.Vector3(minimum, maximum, 0),
    new THREE.Vector3(minimum, minimum, 0)
  ]);
  let previousAngle;
  const points = planarPoints.map((point) => {
    let angle = Math.atan2(point.y, point.x);
    if (previousAngle !== undefined) {
      while (angle - previousAngle > Math.PI) angle -= 2 * Math.PI;
      while (angle - previousAngle < -Math.PI) angle += 2 * Math.PI;
    }
    previousAngle = angle;
    return new THREE.Vector3(point.x, point.y, BURGERS_MAGNITUDE * angle / (2 * Math.PI));
  });
  const verticalCenter = (points[0].z + points[points.length - 1].z) / 2;
  points.forEach((point) => {
    point.z -= verticalCenter;
  });

  group.add(createSegmentedTube(points, COLORS.circuit, 0.025));
  group.add(createPathDirectionMarker(points[6], points[7], COLORS.circuit));

  const start = points[0];
  const end = points[points.length - 1];
  const burgersArrow = createVectorArrow(start, end, COLORS.burgers, {
    shaftRadius: 0.04,
    headRadius: 0.13,
    headLength: 0.2,
    tail: true
  });
  group.add(burgersArrow);

  const label = makeLabelSprite("b", "#4b1208", "rgba(255, 182, 166, 0.97)", 150);
  label.position.copy(start).lerp(end, 0.5).add(new THREE.Vector3(-0.18, 0.05, 0));
  group.add(label);
  return group;
}

function expandLatticePath(waypoints) {
  const points = [waypoints[0].clone()];

  for (let index = 0; index < waypoints.length - 1; index += 1) {
    const start = waypoints[index];
    const end = waypoints[index + 1];
    const stepCount = Math.max(1, Math.round(start.distanceTo(end) / LATTICE_SPACING));
    for (let step = 1; step <= stepCount; step += 1) {
      points.push(start.clone().lerp(end, step / stepCount));
    }
  }

  return points;
}

function createSegmentedTube(points, color, radius) {
  const group = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({ color, roughness: 0.35, metalness: 0.03 });

  for (let index = 0; index < points.length - 1; index += 1) {
    group.add(createCylinderBetween(points[index], points[index + 1], radius, material));
  }

  const jointGeometry = new THREE.SphereGeometry(radius * 1.15, 12, 8);
  points.slice(1, -1).forEach((point) => {
    const joint = new THREE.Mesh(jointGeometry, material);
    joint.position.copy(point);
    group.add(joint);
  });

  return group;
}

function createPathDirectionMarker(start, end, color) {
  const direction = end.clone().sub(start).normalize();
  const midpoint = start.clone().lerp(end, 0.56);
  const material = new THREE.MeshStandardMaterial({ color, roughness: 0.35, metalness: 0.03 });
  const cone = new THREE.Mesh(new THREE.ConeGeometry(0.085, 0.19, 16), material);
  cone.position.copy(midpoint);
  cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
  return cone;
}

function createVectorArrow(start, end, color, options = {}) {
  const group = new THREE.Group();
  const direction = end.clone().sub(start);
  const length = direction.length();
  const unit = direction.clone().normalize();
  const headLength = Math.min(options.headLength ?? 0.22, length * 0.34);
  const shaftLength = Math.max(length - headLength, length * 0.5);
  const shaftRadius = options.shaftRadius ?? 0.04;
  const headRadius = options.headRadius ?? shaftRadius * 3;
  const material = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.28,
    metalness: 0.04,
    emissive: new THREE.Color(color).multiplyScalar(0.08)
  });

  const shaft = createCylinderBetween(
    start,
    start.clone().addScaledVector(unit, shaftLength),
    shaftRadius,
    material
  );
  group.add(shaft);

  const head = new THREE.Mesh(new THREE.ConeGeometry(headRadius, headLength, 20), material);
  head.position.copy(start).addScaledVector(unit, shaftLength + headLength / 2);
  head.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), unit);
  group.add(head);

  if (options.tail !== false) {
    const tail = new THREE.Mesh(new THREE.SphereGeometry(shaftRadius * 1.2, 14, 9), material);
    tail.position.copy(start);
    group.add(tail);
  }

  return group;
}

function createCylinderBetween(start, end, radius, material) {
  const direction = end.clone().sub(start);
  const length = direction.length();
  const cylinder = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, length, 12), material);
  cylinder.position.copy(start).lerp(end, 0.5);
  cylinder.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
  return cylinder;
}

function makeLabelSprite(text, textColor, backgroundColor, width = 360) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = 128;
  const context = canvas.getContext("2d");
  if (!context) return new THREE.Sprite();

  context.fillStyle = backgroundColor;
  context.beginPath();
  context.roundRect(7, 7, canvas.width - 14, canvas.height - 14, 30);
  context.fill();

  context.fillStyle = textColor;
  context.font = text.length <= 2 ? "700 52px system-ui, sans-serif" : "700 38px system-ui, sans-serif";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(text, canvas.width / 2, canvas.height / 2 + 1);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;

  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: false
  }));
  const height = text.length <= 2 ? 0.28 : 0.25;
  sprite.scale.set(height * (canvas.width / canvas.height), height, 1);
  sprite.renderOrder = 10;
  return sprite;
}

function updateInterface() {
  const edge = state.mode === "edge";
  elements.edgeMode.classList.toggle("is-active", edge);
  elements.screwMode.classList.toggle("is-active", !edge);
  elements.edgeMode.setAttribute("aria-pressed", String(edge));
  elements.screwMode.setAttribute("aria-pressed", String(!edge));
  elements.frame.dataset.mode = state.mode;

  if (edge) {
    elements.viewerTitle.textContent = "Edge dislocation";
    elements.defectLegend.textContent = "Extra half-plane";
    elements.modeDescription.textContent = "An extra half-plane ends at the core. Rows above it are compressed, while the region below is stretched.";
    elements.surfaceControlLabel.textContent = "Highlight extra half-plane";
    elements.surfaceControlNote.textContent = "Color the inserted atomic plane.";
    elements.relationshipSymbol.innerHTML = "<i>b</i> &perp; <i>&xi;</i>";
    elements.relationshipIndices.innerHTML = "<i>b</i> = a[100] &middot; &xi; = [001]";
    elements.relationshipExplanation.textContent = "The edge-dislocation line runs along the end of the extra half-plane, while b points across that plane.";
    elements.summary.innerHTML = "For an edge dislocation, the Burgers vector <i>b</i> is perpendicular to the dislocation line &xi;.";
  } else {
    elements.viewerTitle.textContent = "Screw dislocation";
    elements.defectLegend.textContent = "Helicoidal plane";
    elements.modeDescription.textContent = "Atoms are displaced parallel to the dislocation line. One turn around the core raises the lattice by one Burgers vector.";
    elements.surfaceControlLabel.textContent = "Highlight helicoidal plane";
    elements.surfaceControlNote.textContent = "Color one distorted lattice plane.";
    elements.relationshipSymbol.innerHTML = "<i>b</i> &parallel; <i>&xi;</i>";
    elements.relationshipIndices.innerHTML = "<i>b</i> = a[001] &middot; &xi; = [001]";
    elements.relationshipExplanation.textContent = "For a pure screw dislocation, the Burgers vector and the directed dislocation line are parallel.";
    elements.summary.innerHTML = "For a screw dislocation, the Burgers vector <i>b</i> is parallel to the dislocation line &xi;.";
  }

  updateLayerInterface();
}

function updateLayerInterface() {
  elements.defectLegendItem.hidden = !state.showDefectSurface;
  elements.circuitLegendItem.hidden = !state.showCircuit;
  elements.burgersLegendItem.hidden = !state.showCircuit;
  updateCanvasDescription();
}

function updateCanvasDescription() {
  const type = state.mode === "edge" ? "edge" : "screw";
  const article = type === "edge" ? "an" : "a";
  const visibleLayers = ["an atomic lattice", "a directed dislocation line"];
  if (state.showDefectSurface) {
    visibleLayers.push(state.mode === "edge" ? "a highlighted extra half-plane" : "a highlighted helicoidal atomic plane");
  }
  if (state.showCircuit) visibleLayers.push("a mapped reference circuit and Burgers vector");
  if (state.showBonds) visibleLayers.push("atomic connections");

  elements.canvas.setAttribute(
    "aria-label",
    `Interactive simple-cubic teaching model of ${article} ${type} dislocation showing ${joinList(visibleLayers)}. Drag to rotate, scroll to zoom, and right-drag to pan.`
  );
}

function joinList(items) {
  if (items.length < 2) return items[0] || "";
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

function setViewOrientation(orientation) {
  const positions = {
    isometric: [5.8, 4.5, 6.6],
    "along-line": [0.01, 0.02, 8.2],
    side: [7.4, 1.3, 0.01]
  };
  const position = positions[orientation] || positions.isometric;

  camera.up.set(0, 1, 0);
  camera.position.set(...position);
  controls.target.set(0, 0.05, 0);
  camera.lookAt(controls.target);
  controls.update();
}

function resizeRenderer() {
  if (!rendererReady || contextLost || !renderer || !camera) return;
  const width = elements.frame.clientWidth;
  const height = elements.frame.clientHeight;
  if (width < 1 || height < 1) return;

  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderScene();
}

function renderScene() {
  if (!rendererReady || contextLost || !renderer || !scene || !camera) return;
  renderer.render(scene, camera);
}

function handleContextLost(event) {
  event.preventDefault();
  contextLost = true;
  rendererReady = false;
  showFallback("The 3D context was interrupted. The viewer is trying to restore it; reload the page if the model does not return.");
  window.clearTimeout(restoreTimer);
  restoreTimer = window.setTimeout(() => {
    if (contextLost) {
      elements.fallback.textContent = "The 3D context could not be restored automatically. Reload the page to try the interactive model again.";
    }
  }, 4000);
}

function handleContextRestored() {
  if (!contextLost || !renderer || !scene || !camera) return;
  window.clearTimeout(restoreTimer);

  try {
    contextLost = false;
    rendererReady = true;
    rebuildModel();
    updateInterface();
    resizeRenderer();
    showViewer();
    renderScene();
  } catch (error) {
    console.error("Unable to restore the dislocation viewer.", error);
    contextLost = true;
    rendererReady = false;
    showFallback("The 3D context could not be restored automatically. Reload the page to try the interactive model again.");
  }
}

function showViewer() {
  elements.fallback.hidden = true;
  elements.legend.hidden = false;
  elements.canvas.hidden = false;
  elements.canvas.setAttribute("role", "img");
  elements.canvas.setAttribute("aria-hidden", "false");
  if (controls) controls.enabled = true;
  setExplorerControls(true);
}

function showFallback(message) {
  rendererReady = false;
  elements.fallback.textContent = message;
  elements.fallback.hidden = false;
  elements.legend.hidden = true;
  elements.canvas.hidden = true;
  elements.canvas.setAttribute("aria-hidden", "true");
  elements.canvas.removeAttribute("role");
  if (controls) controls.enabled = false;
  setExplorerControls(false);
}

function disposeObject(object) {
  if (!object || !scene) return;
  scene.remove(object);
  const geometries = new Set();
  const materials = new Set();
  const textures = new Set();

  object.traverse((child) => {
    if (child.geometry) geometries.add(child.geometry);
    const childMaterials = Array.isArray(child.material) ? child.material : [child.material];
    childMaterials.filter(Boolean).forEach((material) => {
      materials.add(material);
      if (material.map) textures.add(material.map);
    });
  });

  textures.forEach((texture) => texture.dispose());
  materials.forEach((material) => material.dispose());
  geometries.forEach((geometry) => geometry.dispose());
}
