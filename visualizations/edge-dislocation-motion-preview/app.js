let THREE;
let OrbitControls;

const LATTICE_SPACING = 0.72;
const CORE_START = -3.6;
const CORE_END = 3.6;
const CORE_WIDTH = LATTICE_SPACING * 0.34;
const PLAY_DURATION = 8.4;
const SITE_STEP_COUNT = Math.round((CORE_END - CORE_START) / LATTICE_SPACING);
const ORTHOGRAPHIC_VIEW_HEIGHT = 8;
const ORTHOGRAPHIC_MIN_ZOOM = 0.83;
const ORTHOGRAPHIC_MAX_ZOOM = 2.2;
const PEIERLS_PLOT = {
  left: 56,
  width: 376,
  energyBottom: 140,
  energyHeight: 100,
  stressCenter: 220,
  stressAmplitude: 40
};
const X_INDICES = [-4, -3, -2, -1, 0, 1, 2, 3, 4];
const Y_INDICES = [-3.5, -2.5, -1.5, -0.5, 0.5, 1.5, 2.5, 3.5];
const Z_INDICES = [-2, -1, 0, 1, 2];
const COLORS = {
  atom: 0x76a6d2,
  bond: 0x9db6d2,
  halfPlane: 0xf4bb54,
  screwPlane: 0x3fd8c4,
  line: 0xc58cff,
  burgers: 0xff735b,
  stress: 0x73e39f,
  boundary: 0x8596bc,
  slipPlane: 0x7ed7e8,
  slipped: 0xff735b,
  unslipped: 0x6bb7e6
};

const elements = {
  frame: document.querySelector("#edge-motion-frame"),
  canvas: document.querySelector("#edge-motion-canvas"),
  fallback: document.querySelector("#edge-motion-fallback"),
  legend: document.querySelector("#motion-viewer-legend"),
  phaseChip: document.querySelector("#motion-phase-chip"),
  stageLabel: document.querySelector("#motion-stage-label"),
  coreReadout: document.querySelector("#motion-core-readout"),
  viewerNote: document.querySelector("#motion-viewer-note"),
  viewerTitle: document.querySelector("#motion-viewer-title"),
  defectLegend: document.querySelector("#motion-defect-legend"),
  progress: document.querySelector("#motion-progress"),
  progressOutput: document.querySelector("#motion-progress-output"),
  play: document.querySelector("#motion-play"),
  stepBack: document.querySelector("#motion-step-back"),
  stepForward: document.querySelector("#motion-step-forward"),
  reset: document.querySelector("#motion-reset"),
  speed: document.querySelector("#motion-speed"),
  view: document.querySelector("#motion-view"),
  rotateLeft: document.querySelector("#motion-rotate-left"),
  rotateRight: document.querySelector("#motion-rotate-right"),
  zoomIn: document.querySelector("#motion-zoom-in"),
  zoomOut: document.querySelector("#motion-zoom-out"),
  edgeMode: document.querySelector("#motion-edge-mode"),
  screwMode: document.querySelector("#motion-screw-mode"),
  projection: document.querySelector("#motion-projection"),
  showPlane: document.querySelector("#motion-show-plane"),
  showRegions: document.querySelector("#motion-show-regions"),
  showBonds: document.querySelector("#motion-show-bonds"),
  showStress: document.querySelector("#motion-show-stress"),
  planeControlLabel: document.querySelector("#motion-plane-control-label"),
  planeControlNote: document.querySelector("#motion-plane-control-note"),
  corePosition: document.querySelector("#motion-core-position"),
  slipValue: document.querySelector("#motion-slip-value"),
  characterValue: document.querySelector("#motion-character-value"),
  slipDirection: document.querySelector("#motion-slip-direction"),
  projectionValue: document.querySelector("#motion-projection-value"),
  localExplanation: document.querySelector("#motion-local-explanation"),
  graphModeLabel: document.querySelector("#peierls-mode-label"),
  graphStepOutput: document.querySelector("#peierls-step-output"),
  graphDescription: document.querySelector("#peierls-graph-desc"),
  graphEnergyPath: document.querySelector("#peierls-energy-path"),
  graphStressPath: document.querySelector("#peierls-stress-path"),
  graphCoreGuide: document.querySelector("#peierls-core-guide"),
  graphEnergyMarker: document.querySelector("#peierls-energy-marker"),
  graphStressMarker: document.querySelector("#peierls-stress-marker"),
  graphSlippedRegion: document.querySelector("#peierls-slipped-region"),
  graphUnslippedRegion: document.querySelector("#peierls-unslipped-region"),
  liveStatus: document.querySelector("#motion-live-status")
};

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const state = {
  mode: "edge",
  projection: "perspective",
  progress: 0,
  playing: false,
  speed: 1,
  showPlane: true,
  showRegions: true,
  showBonds: true,
  showStress: true,
  autoPlayed: false
};

let scene;
let camera;
let perspectiveCamera;
let orthographicCamera;
let renderer;
let controls;
let modelGroup;
let atomMesh;
let bondLines;
let bondPositionAttribute;
let coreGroup;
let corePlaneMaterial;
let corePlaneOutlineMaterial;
let edgeGuideGroup;
let screwGuideGroup;
let screwSurfaceMaterial;
let screwRimMaterial;
let stressGroup;
let edgeStressGroup;
let screwStressGroup;
let edgeBurgersGroup;
let screwBurgersGroup;
let regionGroup;
let slippedRegion;
let unslippedRegion;
let referenceAtoms = [];
let currentPositions = [];
let bondPairs = [];
let crossPlaneBonds = [];
let resizeObserver;
let intersectionObserver;
let animationFrame = 0;
let lastAnimationTime = 0;
let rendererReady = false;
let contextLost = false;
let autoPlayTimer = 0;

start();

async function start() {
  setInterfaceEnabled(false);
  createPeierlsGraph();
  updatePeierlsGraph();

  try {
    THREE = await import("three");
    ({ OrbitControls } = await import("three/addons/controls/OrbitControls.js"));
    createScene();
    createModel();
    bindInterface();
    rendererReady = true;
    setInterfaceEnabled(true);
    updateModel(0);
    resizeRenderer();
    showViewer();
    updateReducedMotionControl();
    announce("The edge dislocation is at the left surface. Play the glide or move it one lattice valley at a time.");

    if (!reducedMotion.matches) {
      autoPlayTimer = window.setTimeout(() => {
        if (!state.autoPlayed && document.visibilityState === "visible") {
          state.autoPlayed = true;
          playMotion(false);
        }
      }, 700);
    }
  } catch (error) {
    console.error("Unable to start the dislocation motion preview.", error);
    showFallback("The interactive 3D model is unavailable. The explanation below still describes how dislocation glide produces permanent slip.");
  }
}

function createScene() {
  renderer = new THREE.WebGLRenderer({
    canvas: elements.canvas,
    antialias: true,
    alpha: true,
    powerPreference: "high-performance"
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;

  scene = new THREE.Scene();
  perspectiveCamera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  perspectiveCamera.position.set(7.3, 5.2, 7.6);
  orthographicCamera = new THREE.OrthographicCamera(-4, 4, 4, -4, 0.1, 100);
  orthographicCamera.position.copy(perspectiveCamera.position);
  camera = perspectiveCamera;

  controls = new OrbitControls(camera, elements.canvas);
  elements.canvas.style.touchAction = "pan-y pinch-zoom";
  controls.enableDamping = false;
  controls.minDistance = 5.2;
  controls.maxDistance = 14;
  controls.minZoom = ORTHOGRAPHIC_MIN_ZOOM;
  controls.maxZoom = ORTHOGRAPHIC_MAX_ZOOM;
  controls.target.set(0, 0, 0);
  controls.update();
  controls.addEventListener("start", () => {
    elements.view.value = "custom";
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

  if (typeof IntersectionObserver === "function") {
    intersectionObserver = new IntersectionObserver((entries) => {
      if (!entries[0].isIntersecting && state.playing) pauseMotion(false);
    }, { threshold: 0.08 });
    intersectionObserver.observe(elements.frame);
  }
}

function createModel() {
  modelGroup = new THREE.Group();
  modelGroup.name = "Animated dislocation glide model";
  scene.add(modelGroup);

  buildReferenceLattice();
  modelGroup.add(createAtoms());
  modelGroup.add(createBonds());
  modelGroup.add(createSlipPlane());
  regionGroup = createRegionOverlays();
  modelGroup.add(regionGroup);
  modelGroup.add(createBoundary());

  coreGroup = createCoreMarker();
  modelGroup.add(coreGroup);

  stressGroup = createStressArrows();
  modelGroup.add(stressGroup);
  modelGroup.add(createBurgersVectors());
}

function buildReferenceLattice() {
  const atomIndex = new Map();

  X_INDICES.forEach((xIndex) => {
    Y_INDICES.forEach((yIndex) => {
      Z_INDICES.forEach((zIndex) => {
        const atom = {
          xIndex,
          yIndex,
          zIndex,
          reference: new THREE.Vector3(
            xIndex * LATTICE_SPACING,
            yIndex * LATTICE_SPACING,
            zIndex * LATTICE_SPACING
          )
        };
        atomIndex.set(atomKey(xIndex, yIndex, zIndex), referenceAtoms.length);
        referenceAtoms.push(atom);
        currentPositions.push(atom.reference.clone());
      });
    });
  });

  referenceAtoms.forEach((atom, index) => {
    const staticNeighbors = [
      [atom.xIndex + 1, atom.yIndex, atom.zIndex],
      [atom.xIndex, atom.yIndex, atom.zIndex + 1]
    ];
    if (atom.yIndex !== -0.5) {
      staticNeighbors.push([atom.xIndex, atom.yIndex + 1, atom.zIndex]);
    }

    staticNeighbors.forEach(([xIndex, yIndex, zIndex]) => {
      const neighbor = atomIndex.get(atomKey(xIndex, yIndex, zIndex));
      if (neighbor !== undefined) bondPairs.push([index, neighbor]);
    });

    if (atom.yIndex === -0.5) {
      const upperIndex = atomIndex.get(atomKey(atom.xIndex, 0.5, atom.zIndex));
      const shiftedLowerXIndex = atomIndex.get(atomKey(atom.xIndex + 1, -0.5, atom.zIndex));
      const shiftedLowerZIndex = atomIndex.get(atomKey(atom.xIndex, -0.5, atom.zIndex + 1));
      if (upperIndex !== undefined) {
        crossPlaneBonds.push({
          upperIndex,
          originalLowerIndex: index,
          shiftedLowerXIndex,
          shiftedLowerZIndex
        });
      }
    }
  });
}

function atomKey(xIndex, yIndex, zIndex) {
  return `${xIndex}:${yIndex}:${zIndex}`;
}

function createAtoms() {
  const geometry = new THREE.SphereGeometry(0.105, 18, 12);
  const material = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    roughness: 0.34,
    metalness: 0.04,
    clearcoat: 0.42,
    clearcoatRoughness: 0.3
  });
  atomMesh = new THREE.InstancedMesh(geometry, material, referenceAtoms.length);
  atomMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

  const baseColor = new THREE.Color(COLORS.atom);
  referenceAtoms.forEach((atom, index) => {
    atomMesh.setColorAt(index, baseColor);
  });
  atomMesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
  atomMesh.name = "Animated atomic lattice";
  return atomMesh;
}

function createBonds() {
  const positions = new Float32Array((bondPairs.length + crossPlaneBonds.length) * 6);
  const geometry = new THREE.BufferGeometry();
  bondPositionAttribute = new THREE.BufferAttribute(positions, 3);
  bondPositionAttribute.setUsage(THREE.DynamicDrawUsage);
  geometry.setAttribute("position", bondPositionAttribute);

  const material = new THREE.LineBasicMaterial({
    color: COLORS.bond,
    transparent: true,
    opacity: 0.27,
    depthWrite: false
  });
  bondLines = new THREE.LineSegments(geometry, material);
  bondLines.name = "Animated atomic connections";
  return bondLines;
}

function createSlipPlane() {
  const geometry = new THREE.PlaneGeometry(7.2, 3.35);
  const material = new THREE.MeshBasicMaterial({
    color: COLORS.slipPlane,
    transparent: true,
    opacity: 0.065,
    side: THREE.DoubleSide,
    depthWrite: false
  });
  const plane = new THREE.Mesh(geometry, material);
  plane.rotation.x = -Math.PI / 2;
  plane.position.y = 0;
  plane.name = "Horizontal glide plane";
  return plane;
}

function createRegionOverlays() {
  const group = new THREE.Group();
  group.name = "Slipped and unslipped glide-plane regions";
  const geometry = new THREE.PlaneGeometry(1, 3.34);

  slippedRegion = new THREE.Mesh(
    geometry,
    new THREE.MeshBasicMaterial({
      color: COLORS.slipped,
      transparent: true,
      opacity: 0.18,
      side: THREE.DoubleSide,
      depthWrite: false
    })
  );
  slippedRegion.rotation.x = -Math.PI / 2;
  slippedRegion.position.y = 0.018;
  slippedRegion.renderOrder = 1;
  group.add(slippedRegion);

  unslippedRegion = new THREE.Mesh(
    geometry,
    new THREE.MeshBasicMaterial({
      color: COLORS.unslipped,
      transparent: true,
      opacity: 0.15,
      side: THREE.DoubleSide,
      depthWrite: false
    })
  );
  unslippedRegion.rotation.x = -Math.PI / 2;
  unslippedRegion.position.y = 0.016;
  unslippedRegion.renderOrder = 1;
  group.add(unslippedRegion);
  return group;
}

function createBoundary() {
  const geometry = new THREE.EdgesGeometry(new THREE.BoxGeometry(7.2, 5.75, 3.45));
  const material = new THREE.LineBasicMaterial({
    color: COLORS.boundary,
    transparent: true,
    opacity: 0.2,
    depthWrite: false
  });
  const boundary = new THREE.LineSegments(geometry, material);
  boundary.name = "Crystal boundary";
  return boundary;
}

function createCoreMarker() {
  const group = new THREE.Group();
  group.name = "Moving dislocation core";

  edgeGuideGroup = createEdgeGuide();
  group.add(edgeGuideGroup);
  screwGuideGroup = createScrewGuide();
  screwGuideGroup.visible = false;
  group.add(screwGuideGroup);

  const line = createVectorArrow(
    new THREE.Vector3(0, 0, -1.72),
    new THREE.Vector3(0, 0, 1.72),
    COLORS.line,
    { shaftRadius: 0.035, headRadius: 0.115, headLength: 0.24, tail: false }
  );
  line.name = "Dislocation line direction xi";
  group.add(line);

  const haloMaterial = new THREE.MeshBasicMaterial({
    color: COLORS.line,
    transparent: true,
    opacity: 0.72,
    depthTest: false
  });
  const halo = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.026, 10, 36), haloMaterial);
  halo.position.z = 1.74;
  halo.renderOrder = 8;
  group.add(halo);

  const label = makeLabelSprite("ξ", "#281041", "rgba(224, 197, 255, 0.96)", 150);
  label.position.set(0.15, 0.16, 1.9);
  group.add(label);
  return group;
}

function createEdgeGuide() {
  const group = new THREE.Group();
  group.name = "Edge half-plane guide";

  const planeGeometry = new THREE.PlaneGeometry(3.35, 2.9);
  corePlaneMaterial = new THREE.MeshStandardMaterial({
    color: COLORS.halfPlane,
    transparent: true,
    opacity: 0.2,
    side: THREE.DoubleSide,
    depthWrite: false,
    roughness: 0.45,
    metalness: 0.02
  });
  const plane = new THREE.Mesh(planeGeometry, corePlaneMaterial);
  plane.rotation.y = Math.PI / 2;
  plane.position.y = 1.45;
  plane.renderOrder = 1;
  group.add(plane);

  corePlaneOutlineMaterial = new THREE.LineBasicMaterial({
    color: 0xffdc91,
    transparent: true,
    opacity: 0.95
  });
  const outline = new THREE.LineSegments(new THREE.EdgesGeometry(planeGeometry), corePlaneOutlineMaterial);
  outline.rotation.copy(plane.rotation);
  outline.position.copy(plane.position);
  outline.renderOrder = 3;
  group.add(outline);

  return group;
}

function createScrewGuide() {
  const group = new THREE.Group();
  group.name = "Screw helicoidal guide";
  const radialSegments = 10;
  const angularSegments = 56;
  const innerRadius = 0.2;
  const outerRadius = 1.58;
  const positions = [];
  const indices = [];

  for (let angleIndex = 0; angleIndex <= angularSegments; angleIndex += 1) {
    const theta = -Math.PI + (2 * Math.PI * angleIndex) / angularSegments;
    const z = LATTICE_SPACING * theta / (2 * Math.PI);
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
  screwSurfaceMaterial = new THREE.MeshStandardMaterial({
    color: COLORS.screwPlane,
    transparent: true,
    opacity: 0.2,
    side: THREE.DoubleSide,
    depthWrite: false,
    roughness: 0.42,
    metalness: 0.02
  });
  const surface = new THREE.Mesh(geometry, screwSurfaceMaterial);
  surface.renderOrder = 1;
  group.add(surface);

  const rimPoints = [];
  for (let index = 0; index <= angularSegments; index += 1) {
    const theta = -Math.PI + (2 * Math.PI * index) / angularSegments;
    rimPoints.push(new THREE.Vector3(
      outerRadius * Math.cos(theta),
      outerRadius * Math.sin(theta),
      LATTICE_SPACING * theta / (2 * Math.PI)
    ));
  }
  screwRimMaterial = new THREE.LineBasicMaterial({
    color: 0xa0fff2,
    transparent: true,
    opacity: 0.92
  });
  const rim = new THREE.Line(new THREE.BufferGeometry().setFromPoints(rimPoints), screwRimMaterial);
  rim.renderOrder = 3;
  group.add(rim);

  const label = makeLabelSprite("helicoidal guide", "#073c3a", "rgba(160, 255, 242, 0.96)", 520);
  label.position.set(1.12, 1.3, 0.35);
  group.add(label);
  return group;
}

function createStressArrows() {
  const group = new THREE.Group();
  group.name = "Applied shear tractions";

  edgeStressGroup = new THREE.Group();
  [-1.25, 1.25].forEach((z) => {
    edgeStressGroup.add(createVectorArrow(
      new THREE.Vector3(-1.15, 3.02, z),
      new THREE.Vector3(1.15, 3.02, z),
      COLORS.stress,
      { shaftRadius: 0.032, headRadius: 0.105, headLength: 0.22 }
    ));
    edgeStressGroup.add(createVectorArrow(
      new THREE.Vector3(1.15, -3.02, z),
      new THREE.Vector3(-1.15, -3.02, z),
      COLORS.stress,
      { shaftRadius: 0.032, headRadius: 0.105, headLength: 0.22 }
    ));
  });
  const edgeLabel = makeLabelSprite("τ", "#073725", "rgba(178, 255, 205, 0.96)", 150);
  edgeLabel.position.set(1.4, 3.05, 1.25);
  edgeStressGroup.add(edgeLabel);
  group.add(edgeStressGroup);

  screwStressGroup = new THREE.Group();
  [-1.25, 1.25].forEach((x) => {
    screwStressGroup.add(createVectorArrow(
      new THREE.Vector3(x, 3.02, -0.9),
      new THREE.Vector3(x, 3.02, 0.9),
      COLORS.stress,
      { shaftRadius: 0.032, headRadius: 0.105, headLength: 0.22 }
    ));
    screwStressGroup.add(createVectorArrow(
      new THREE.Vector3(x, -3.02, 0.9),
      new THREE.Vector3(x, -3.02, -0.9),
      COLORS.stress,
      { shaftRadius: 0.032, headRadius: 0.105, headLength: 0.22 }
    ));
  });
  const screwLabel = makeLabelSprite("τ", "#073725", "rgba(178, 255, 205, 0.96)", 150);
  screwLabel.position.set(1.42, 3.05, 1.1);
  screwStressGroup.add(screwLabel);
  screwStressGroup.visible = false;
  group.add(screwStressGroup);
  return group;
}

function createBurgersVectors() {
  const group = new THREE.Group();
  group.name = "Edge and screw Burgers vectors";

  edgeBurgersGroup = new THREE.Group();
  const edgeStart = new THREE.Vector3(-0.36, -2.78, 1.62);
  const edgeEnd = new THREE.Vector3(0.36, -2.78, 1.62);
  edgeBurgersGroup.add(createVectorArrow(edgeStart, edgeEnd, COLORS.burgers, {
    shaftRadius: 0.04,
    headRadius: 0.13,
    headLength: 0.2
  }));
  const edgeLabel = makeLabelSprite("b", "#4b1208", "rgba(255, 182, 166, 0.97)", 150);
  edgeLabel.position.copy(edgeStart).lerp(edgeEnd, 0.5).add(new THREE.Vector3(0, -0.2, 0.03));
  edgeBurgersGroup.add(edgeLabel);
  group.add(edgeBurgersGroup);

  screwBurgersGroup = new THREE.Group();
  const screwStart = new THREE.Vector3(0.92, -2.78, -0.36);
  const screwEnd = new THREE.Vector3(0.92, -2.78, 0.36);
  screwBurgersGroup.add(createVectorArrow(screwStart, screwEnd, COLORS.burgers, {
    shaftRadius: 0.04,
    headRadius: 0.13,
    headLength: 0.2
  }));
  const screwLabel = makeLabelSprite("b", "#4b1208", "rgba(255, 182, 166, 0.97)", 150);
  screwLabel.position.copy(screwStart).lerp(screwEnd, 0.5).add(new THREE.Vector3(0.16, -0.18, 0));
  screwBurgersGroup.add(screwLabel);
  screwBurgersGroup.visible = false;
  group.add(screwBurgersGroup);
  return group;
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

  group.add(createCylinderBetween(
    start,
    start.clone().addScaledVector(unit, shaftLength),
    shaftRadius,
    material
  ));

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
  if (typeof context.roundRect === "function") {
    context.beginPath();
    context.roundRect(7, 7, canvas.width - 14, canvas.height - 14, 30);
    context.fill();
  } else {
    context.fillRect(7, 7, canvas.width - 14, canvas.height - 14);
  }
  context.fillStyle = textColor;
  context.font = "700 52px system-ui, sans-serif";
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
  sprite.scale.set(0.28 * (canvas.width / canvas.height), 0.28, 1);
  sprite.renderOrder = 10;
  return sprite;
}

function createPeierlsGraph() {
  const energyPoints = [];
  const stressPoints = [];
  const sampleCount = 160;

  for (let index = 0; index <= sampleCount; index += 1) {
    const q = index / sampleCount;
    const x = PEIERLS_PLOT.left + q * PEIERLS_PLOT.width;
    const energy = 0.5 * (1 - Math.cos(2 * Math.PI * q));
    const stress = Math.sin(2 * Math.PI * q);
    energyPoints.push([x, PEIERLS_PLOT.energyBottom - energy * PEIERLS_PLOT.energyHeight]);
    stressPoints.push([x, PEIERLS_PLOT.stressCenter - stress * PEIERLS_PLOT.stressAmplitude]);
  }

  elements.graphEnergyPath.setAttribute("d", pointsToPath(energyPoints));
  elements.graphStressPath.setAttribute("d", pointsToPath(stressPoints));
}

function pointsToPath(points) {
  return points.map(([x, y], index) => `${index === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`).join(" ");
}

function bindInterface() {
  elements.play.addEventListener("click", () => {
    state.autoPlayed = true;
    if (state.playing) {
      pauseMotion(true);
    } else {
      playMotion(true);
    }
  });

  elements.stepBack.addEventListener("click", () => stepBySite(-1));
  elements.stepForward.addEventListener("click", () => stepBySite(1));
  elements.reset.addEventListener("click", resetMotion);

  elements.progress.addEventListener("input", () => {
    state.autoPlayed = true;
    pauseMotion(false);
    updateModel(Number(elements.progress.value) / 1000);
  });

  elements.progress.addEventListener("change", () => {
    const stage = getStage(state.progress);
    announce(`${stage.title}. ${stage.description}`);
  });

  elements.speed.addEventListener("change", () => {
    state.speed = Number(elements.speed.value) || 1;
  });

  elements.view.addEventListener("change", () => {
    if (elements.view.value !== "custom") setViewOrientation(elements.view.value);
  });

  elements.rotateLeft.addEventListener("click", () => rotateCamera(Math.PI / 12));
  elements.rotateRight.addEventListener("click", () => rotateCamera(-Math.PI / 12));
  elements.zoomIn.addEventListener("click", () => zoomCamera(0.86));
  elements.zoomOut.addEventListener("click", () => zoomCamera(1.16));

  elements.edgeMode.addEventListener("click", () => setDislocationMode("edge"));
  elements.screwMode.addEventListener("click", () => setDislocationMode("screw"));
  elements.projection.addEventListener("change", () => {
    setProjection(elements.projection.checked ? "orthographic" : "perspective");
  });

  elements.showPlane.addEventListener("change", () => {
    state.showPlane = elements.showPlane.checked;
    updateModel(state.progress);
  });

  elements.showRegions.addEventListener("change", () => {
    state.showRegions = elements.showRegions.checked;
    updateModel(state.progress);
  });

  elements.showBonds.addEventListener("change", () => {
    state.showBonds = elements.showBonds.checked;
    updateModel(state.progress);
  });

  elements.showStress.addEventListener("change", () => {
    state.showStress = elements.showStress.checked;
    updateModel(state.progress);
  });

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState !== "visible" && state.playing) pauseMotion(false);
  });

  reducedMotion.addEventListener?.("change", updateReducedMotionControl);
}

function updateModel(progress) {
  state.progress = clamp(progress, 0, 1);
  const coreX = lerp(CORE_START, CORE_END, state.progress);
  const entryFade = smoothstep(CORE_START - 0.18, CORE_START + 0.18, coreX);
  const exitFade = 1 - smoothstep(CORE_END - 0.35, CORE_END, coreX);
  const coreVisible = clamp(entryFade * exitFade, 0, 1);
  const matrix = new THREE.Matrix4();
  const baseColor = new THREE.Color(COLORS.atom);
  const highlightColor = new THREE.Color(state.mode === "edge" ? COLORS.halfPlane : COLORS.screwPlane);

  referenceAtoms.forEach((atom, index) => {
    const coreDistance = (atom.reference.x - coreX) / (LATTICE_SPACING * 0.92);
    const verticalDecay = Math.exp(-Math.abs(atom.reference.y) / (LATTICE_SPACING * 2.45));
    const position = currentPositions[index];

    if (state.mode === "edge") {
      const slip = normalizedDisregistry(atom.reference.x, coreX);
      const side = atom.reference.y > 0 ? 0.5 : -0.5;
      const opening = 0.025 * Math.sign(atom.reference.y) * Math.exp(-(coreDistance * coreDistance)) * verticalDecay * coreVisible;
      position.set(
        atom.reference.x + side * slip,
        atom.reference.y + opening,
        atom.reference.z
      );
    } else {
      position.set(
        atom.reference.x,
        atom.reference.y,
        atom.reference.z + normalizedScrewDisplacement(atom.reference.x, atom.reference.y, coreX)
      );
    }

    matrix.makeTranslation(position.x, position.y, position.z);
    atomMesh.setMatrixAt(index, matrix);

    let highlightWeight = 0;
    if (state.showPlane && coreVisible > 0.01) {
      const distanceToCore = (atom.reference.x - coreX) / (LATTICE_SPACING * 0.48);
      if (state.mode === "edge" && atom.reference.y > 0) {
        highlightWeight = Math.exp(-(distanceToCore * distanceToCore)) * coreVisible;
      } else if (state.mode === "screw") {
        const transverseDistance = atom.reference.y / (LATTICE_SPACING * 1.35);
        highlightWeight = Math.exp(-(distanceToCore * distanceToCore + transverseDistance * transverseDistance)) * coreVisible;
      }
    }
    atomMesh.setColorAt(index, baseColor.clone().lerp(highlightColor, clamp(highlightWeight, 0, 0.95)));
  });

  atomMesh.instanceMatrix.needsUpdate = true;
  atomMesh.instanceColor.needsUpdate = true;
  updateBondPositions();

  bondLines.visible = state.showBonds;
  coreGroup.visible = coreVisible > 0.025;
  coreGroup.position.x = coreX;
  edgeGuideGroup.visible = state.mode === "edge" && state.showPlane;
  screwGuideGroup.visible = state.mode === "screw" && state.showPlane;
  corePlaneMaterial.opacity = 0.2 * coreVisible;
  corePlaneOutlineMaterial.opacity = 0.95 * coreVisible;
  screwSurfaceMaterial.opacity = 0.2 * coreVisible;
  screwRimMaterial.opacity = 0.92 * coreVisible;
  stressGroup.visible = state.showStress;
  edgeStressGroup.visible = state.mode === "edge";
  screwStressGroup.visible = state.mode === "screw";
  edgeBurgersGroup.visible = state.mode === "edge";
  screwBurgersGroup.visible = state.mode === "screw";
  updateRegionOverlays(coreX);

  updateInterface(coreX);
  renderScene();
}

function normalizedDisregistry(x, coreX) {
  const current = rawDisregistry(x, coreX);
  const start = rawDisregistry(x, CORE_START);
  const end = rawDisregistry(x, CORE_END);
  if (Math.abs(end - start) < 1e-8) return state.progress * LATTICE_SPACING;
  return LATTICE_SPACING * clamp((current - start) / (end - start), 0, 1);
}

function rawDisregistry(x, coreX) {
  return LATTICE_SPACING * (0.5 - Math.atan((x - coreX) / CORE_WIDTH) / Math.PI);
}

function normalizedScrewDisplacement(x, y, coreX) {
  const current = rawScrewDisplacement(x, y, coreX);
  const start = rawScrewDisplacement(x, y, CORE_START);
  const end = rawScrewDisplacement(x, y, CORE_END);
  if (Math.abs(end - start) < 1e-8) return Math.sign(y) * state.progress * LATTICE_SPACING * 0.5;
  const fraction = clamp((current - start) / (end - start), 0, 1);
  return Math.sign(y) * LATTICE_SPACING * 0.5 * fraction;
}

function rawScrewDisplacement(x, y, coreX) {
  return LATTICE_SPACING * Math.atan2(y, x - coreX) / (2 * Math.PI);
}

function updateRegionOverlays(coreX) {
  const totalWidth = CORE_END - CORE_START;
  const slippedWidth = clamp(coreX - CORE_START, 0, totalWidth);
  const unslippedWidth = totalWidth - slippedWidth;

  slippedRegion.visible = state.showRegions && slippedWidth > 0.002;
  slippedRegion.scale.x = Math.max(slippedWidth, 0.002);
  slippedRegion.position.x = CORE_START + slippedWidth / 2;

  unslippedRegion.visible = state.showRegions && unslippedWidth > 0.002;
  unslippedRegion.scale.x = Math.max(unslippedWidth, 0.002);
  unslippedRegion.position.x = coreX + unslippedWidth / 2;
  regionGroup.visible = state.showRegions;
}

function updateBondPositions() {
  const positions = bondPositionAttribute.array;
  bondPairs.forEach(([startIndex, endIndex], bondIndex) => {
    writeBondCoordinates(positions, bondIndex, currentPositions[startIndex], currentPositions[endIndex]);
  });

  crossPlaneBonds.forEach((bond, crossIndex) => {
    const upper = currentPositions[bond.upperIndex];
    const originalLower = currentPositions[bond.originalLowerIndex];
    const shiftedIndex = state.mode === "edge" ? bond.shiftedLowerXIndex : bond.shiftedLowerZIndex;
    const shiftedLower = shiftedIndex === undefined
      ? null
      : currentPositions[shiftedIndex];
    const useShiftedNeighbor = shiftedLower
      && upper.distanceToSquared(shiftedLower) < upper.distanceToSquared(originalLower);
    const lower = useShiftedNeighbor ? shiftedLower : originalLower;
    const slipSeparation = state.mode === "edge"
      ? Math.abs(upper.x - originalLower.x)
      : Math.abs(upper.z - originalLower.z);
    const missingShiftedNeighbor = !shiftedLower
      && slipSeparation > LATTICE_SPACING * 0.5;
    const segmentIndex = bondPairs.length + crossIndex;

    if (!lower || missingShiftedNeighbor) {
      writeBondCoordinates(positions, segmentIndex, upper, upper);
    } else {
      writeBondCoordinates(positions, segmentIndex, upper, lower);
    }
  });
  bondPositionAttribute.needsUpdate = true;
  bondLines.geometry.computeBoundingSphere();
}

function writeBondCoordinates(positions, bondIndex, start, end) {
  const offset = bondIndex * 6;
  positions[offset] = start.x;
  positions[offset + 1] = start.y;
  positions[offset + 2] = start.z;
  positions[offset + 3] = end.x;
  positions[offset + 4] = end.y;
  positions[offset + 5] = end.z;
}

function updateInterface(coreX) {
  const stage = getStage(state.progress);
  const progressPercent = Math.round(state.progress * 100);
  const coreAdvance = state.progress * (CORE_END - CORE_START) / LATTICE_SPACING;
  const centralSlip = getCentralSlip(coreX);
  const insideCrystal = coreX >= -3.52 && coreX <= 3.52;
  const isEdge = state.mode === "edge";

  elements.progress.value = String(Math.round(state.progress * 1000));
  elements.progressOutput.value = `${progressPercent}%`;
  elements.progressOutput.textContent = `${progressPercent}%`;
  elements.progress.setAttribute("aria-valuetext", `${progressPercent} percent. ${stage.title}.`);
  elements.phaseChip.textContent = stage.shortTitle;
  elements.stageLabel.textContent = stage.title;
  elements.coreReadout.innerHTML = `Core advance ${coreAdvance.toFixed(1)}&lambda;`;
  elements.viewerNote.textContent = stage.description;
  elements.corePosition.textContent = insideCrystal
    ? `${(coreX / LATTICE_SPACING).toFixed(1)}λ from centre`
    : coreX < 0 ? "Left surface" : "Outside right surface";
  elements.slipValue.innerHTML = `${centralSlip.toFixed(2)}<i>b</i>`;
  elements.viewerTitle.textContent = `${isEdge ? "Edge" : "Screw"} dislocation glide`;
  elements.frame.dataset.mode = state.mode;
  elements.defectLegend.textContent = isEdge ? "Half-plane guide" : "Helicoidal guide";
  elements.planeControlLabel.textContent = isEdge ? "Half-plane guide" : "Helicoidal guide";
  elements.planeControlNote.textContent = isEdge
    ? "Mark the compressed upper column associated with the core."
    : "Show the local helical shear around the line direction."
  elements.characterValue.innerHTML = isEdge ? "<i>b</i> &perp; &xi;" : "<i>b</i> &parallel; &xi;";
  elements.slipDirection.textContent = isEdge ? "[100]" : "[001]";
  elements.projectionValue.textContent = state.projection === "orthographic" ? "Orthographic" : "Perspective";
  elements.localExplanation.textContent = isEdge
    ? "For edge character, compressed and stretched rows exchange nearest neighbors near the core."
    : "For screw character, atoms shear parallel to the line and exchange cross-plane neighbors as the core passes."
  elements.graphModeLabel.textContent = `${isEdge ? "Edge" : "Screw"} core · one normalized lattice period`;
  elements.edgeMode.classList.toggle("is-active", isEdge);
  elements.screwMode.classList.toggle("is-active", !isEdge);
  elements.edgeMode.setAttribute("aria-pressed", String(isEdge));
  elements.screwMode.setAttribute("aria-pressed", String(!isEdge));
  elements.projection.checked = state.projection === "orthographic";
  updatePeierlsGraph();

  elements.stepBack.disabled = !rendererReady || state.progress <= 0;
  elements.stepForward.disabled = !rendererReady || state.progress >= 1;
  elements.reset.disabled = !rendererReady || (state.progress <= 0 && !state.playing);
  updatePlayButton();
  updateCanvasDescription(stage);
}

function getCentralSlip(coreX) {
  if (state.mode === "edge") return normalizedDisregistry(0, coreX) / LATTICE_SPACING;
  const probeY = LATTICE_SPACING * 0.5;
  const upper = normalizedScrewDisplacement(0, probeY, coreX);
  const lower = normalizedScrewDisplacement(0, -probeY, coreX);
  return Math.abs(upper - lower) / LATTICE_SPACING;
}

function updatePeierlsGraph() {
  const totalAdvance = state.progress * SITE_STEP_COUNT;
  const q = state.progress >= 0.999999 ? 1 : totalAdvance - Math.floor(totalAdvance);
  const period = state.progress >= 0.999999
    ? SITE_STEP_COUNT
    : Math.min(Math.floor(totalAdvance) + 1, SITE_STEP_COUNT);
  const x = PEIERLS_PLOT.left + q * PEIERLS_PLOT.width;
  const energy = 0.5 * (1 - Math.cos(2 * Math.PI * q));
  const stress = Math.sin(2 * Math.PI * q);
  const energyY = PEIERLS_PLOT.energyBottom - energy * PEIERLS_PLOT.energyHeight;
  const stressY = PEIERLS_PLOT.stressCenter - stress * PEIERLS_PLOT.stressAmplitude;
  const slippedWidth = state.progress * PEIERLS_PLOT.width;

  elements.graphCoreGuide.setAttribute("x1", x.toFixed(2));
  elements.graphCoreGuide.setAttribute("x2", x.toFixed(2));
  elements.graphEnergyMarker.setAttribute("cx", x.toFixed(2));
  elements.graphEnergyMarker.setAttribute("cy", energyY.toFixed(2));
  elements.graphStressMarker.setAttribute("cx", x.toFixed(2));
  elements.graphStressMarker.setAttribute("cy", stressY.toFixed(2));
  elements.graphSlippedRegion.setAttribute("width", slippedWidth.toFixed(2));
  elements.graphUnslippedRegion.setAttribute("x", (PEIERLS_PLOT.left + slippedWidth).toFixed(2));
  elements.graphUnslippedRegion.setAttribute("width", (PEIERLS_PLOT.width - slippedWidth).toFixed(2));
  elements.graphSlippedRegion.style.display = state.showRegions ? "" : "none";
  elements.graphUnslippedRegion.style.display = state.showRegions ? "" : "none";
  elements.graphStepOutput.textContent = `Period ${period} / ${SITE_STEP_COUNT} · q=${q.toFixed(2)}`;
  elements.graphDescription.textContent = `${state.mode === "edge" ? "Edge" : "Screw"} core at q ${q.toFixed(2)} within the current lattice period. Normalized Peierls energy ${energy.toFixed(2)}; normalized lattice-resistance stress ${stress.toFixed(2)}.`;
}

function getStage(progress) {
  if (progress < 0.16) {
    return {
      title: "1 · Surface entry",
      shortTitle: "Core entering",
      description: "Nucleation is assumed rather than modeled: the core begins at the left surface and enters under applied shear."
    };
  }
  if (progress < 0.82) {
    return {
      title: "2 · Glide by bond switching",
      shortTitle: "Core gliding",
      description: state.mode === "edge"
        ? "Near the edge core, cross-plane neighbors switch as the line advances through successive lattice valleys."
        : "Near the screw core, atoms shear parallel to the line and cross-plane neighbors switch as the line advances."
    };
  }
  if (progress < 0.94) {
    return {
      title: "3 · Core exits",
      shortTitle: "Core exiting",
      description: "The core reaches the right surface, carrying the final local rearrangement out of the crystal."
    };
  }
  return {
    title: "4 · Permanent slip",
    shortTitle: "Slip complete",
    description: "The dislocation line has left the crystal, but the upper and lower halves remain offset by one Burgers vector."
  };
}

function playMotion(announceChange = true) {
  window.clearTimeout(autoPlayTimer);
  if (!rendererReady || contextLost) return;

  if (reducedMotion.matches) {
    if (state.progress >= 0.999) {
      updateModel(0);
      if (announceChange) announce("Reset. The dislocation is ready at the left surface.");
    } else {
      stepBySite(1);
    }
    return;
  }

  if (state.progress >= 0.999) updateModel(0);
  state.playing = true;
  lastAnimationTime = 0;
  updatePlayButton();
  if (announceChange) announce("Glide animation playing.");
  animationFrame = window.requestAnimationFrame(animateMotion);
}

function animateMotion(timestamp) {
  if (!state.playing || contextLost) return;
  if (!lastAnimationTime) lastAnimationTime = timestamp;
  const elapsed = Math.min((timestamp - lastAnimationTime) / 1000, 0.1);
  lastAnimationTime = timestamp;
  const nextProgress = state.progress + elapsed * state.speed / PLAY_DURATION;

  if (nextProgress >= 1) {
    updateModel(1);
    state.playing = false;
    updatePlayButton();
    announce("Glide complete. The dislocation has exited and left a permanent slip of one Burgers vector.");
    return;
  }

  updateModel(nextProgress);
  animationFrame = window.requestAnimationFrame(animateMotion);
}

function pauseMotion(announceChange = true) {
  if (!state.playing) return;
  state.playing = false;
  window.cancelAnimationFrame(animationFrame);
  lastAnimationTime = 0;
  updatePlayButton();
  if (announceChange) announce(`Paused at ${Math.round(state.progress * 100)} percent.`);
}

function stepBySite(direction) {
  window.clearTimeout(autoPlayTimer);
  state.autoPlayed = true;
  pauseMotion(false);
  const currentStep = direction > 0
    ? Math.floor(state.progress * SITE_STEP_COUNT + 0.001)
    : Math.ceil(state.progress * SITE_STEP_COUNT - 0.001);
  const nextStep = clamp(currentStep + direction, 0, SITE_STEP_COUNT);
  if (nextStep === currentStep) return;
  updateModel(nextStep / SITE_STEP_COUNT);
  const stage = getStage(state.progress);
  announce(`Core moved ${direction > 0 ? "forward" : "back"} by one lattice site. ${stage.shortTitle}.`);
}

function resetMotion() {
  window.clearTimeout(autoPlayTimer);
  state.autoPlayed = true;
  pauseMotion(false);
  updateModel(0);
  announce("Reset. The dislocation is ready to enter from the left surface.");
}

function updatePlayButton() {
  if (!elements.play) return;
  if (reducedMotion.matches) {
    elements.play.innerHTML = state.progress >= 0.999
      ? '<span aria-hidden="true">&#8635;</span> Reset motion'
      : '<span aria-hidden="true">&#9654;</span> Advance one site';
    return;
  }
  if (state.playing) {
    elements.play.innerHTML = '<span aria-hidden="true">&#10074;&#10074;</span> Pause glide';
  } else if (state.progress >= 0.999) {
    elements.play.innerHTML = '<span aria-hidden="true">&#8635;</span> Replay glide';
  } else {
    elements.play.innerHTML = '<span aria-hidden="true">&#9654;</span> Play glide';
  }
}

function updateReducedMotionControl() {
  if (reducedMotion.matches && state.playing) pauseMotion(false);
  updatePlayButton();
}

function updateCanvasDescription(stage) {
  const visibleLayers = ["host atoms", "the moving dislocation line", "the Burgers vector"];
  if (state.showPlane) visibleLayers.push(state.mode === "edge" ? "the highlighted half-plane guide" : "the helicoidal displacement guide");
  if (state.showRegions) visibleLayers.push("slipped and unslipped glide-plane regions");
  if (state.showBonds) visibleLayers.push("atomic connections");
  if (state.showStress) visibleLayers.push("applied shear arrows");
  elements.canvas.setAttribute(
    "aria-label",
    `Interactive ${state.projection} simple-cubic model of ${state.mode}-dislocation glide showing ${joinList(visibleLayers)}. ${stage.shortTitle}. Drag to rotate and scroll to zoom.`
  );
}

function joinList(items) {
  if (items.length < 2) return items[0] || "";
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

function setDislocationMode(mode) {
  if (mode !== "edge" && mode !== "screw") return;
  window.clearTimeout(autoPlayTimer);
  state.autoPlayed = true;
  pauseMotion(false);
  state.mode = mode;
  updateModel(state.progress);
  announce(`${mode === "edge" ? "Edge" : "Screw"} dislocation selected. Glide progress remains at ${Math.round(state.progress * 100)} percent.`);
}

function setProjection(projection) {
  if (projection !== "perspective" && projection !== "orthographic") return;
  if (projection === state.projection) return;

  const previousCamera = camera;
  const offset = previousCamera.position.clone().sub(controls.target);
  const direction = offset.lengthSq() > 1e-8
    ? offset.clone().normalize()
    : new THREE.Vector3(1, 0.7, 1).normalize();
  let nextCamera;

  if (projection === "orthographic") {
    const visibleHeight = 2 * offset.length() * Math.tan(THREE.MathUtils.degToRad(perspectiveCamera.fov / 2));
    orthographicCamera.zoom = clamp(ORTHOGRAPHIC_VIEW_HEIGHT / visibleHeight, ORTHOGRAPHIC_MIN_ZOOM, ORTHOGRAPHIC_MAX_ZOOM);
    orthographicCamera.position.copy(previousCamera.position);
    orthographicCamera.up.copy(previousCamera.up);
    orthographicCamera.quaternion.copy(previousCamera.quaternion);
    orthographicCamera.updateProjectionMatrix();
    nextCamera = orthographicCamera;
  } else {
    const visibleHeight = ORTHOGRAPHIC_VIEW_HEIGHT / orthographicCamera.zoom;
    const distance = visibleHeight / (2 * Math.tan(THREE.MathUtils.degToRad(perspectiveCamera.fov / 2)));
    perspectiveCamera.position.copy(controls.target).addScaledVector(direction, distance);
    perspectiveCamera.up.copy(previousCamera.up);
    perspectiveCamera.lookAt(controls.target);
    nextCamera = perspectiveCamera;
  }

  state.projection = projection;
  camera = nextCamera;
  controls.object = camera;
  controls.update();
  resizeRenderer();
  updateInterface(lerp(CORE_START, CORE_END, state.progress));
  announce(`${projection === "orthographic" ? "Orthographic" : "Perspective"} projection selected.`);
}

function setViewOrientation(orientation) {
  const positions = {
    isometric: [7.3, 5.2, 7.6],
    "along-line": [0.01, 0.02, 10.2],
    "along-glide": [9.8, 1.5, 0.01]
  };
  const position = positions[orientation] || positions.isometric;
  camera.up.set(0, 1, 0);
  camera.position.set(...position);
  controls.target.set(0, 0, 0);
  camera.lookAt(controls.target);
  controls.update();
}

function rotateCamera(angle) {
  const offset = camera.position.clone().sub(controls.target);
  offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), angle);
  camera.position.copy(controls.target).add(offset);
  camera.lookAt(controls.target);
  controls.update();
  elements.view.value = "custom";
}

function zoomCamera(scale) {
  if (camera.isOrthographicCamera) {
    camera.zoom = clamp(camera.zoom / scale, ORTHOGRAPHIC_MIN_ZOOM, ORTHOGRAPHIC_MAX_ZOOM);
    camera.updateProjectionMatrix();
    controls.update();
    renderScene();
    elements.view.value = "custom";
    return;
  }
  const offset = camera.position.clone().sub(controls.target);
  const nextDistance = clamp(offset.length() * scale, controls.minDistance, controls.maxDistance);
  offset.setLength(nextDistance);
  camera.position.copy(controls.target).add(offset);
  camera.lookAt(controls.target);
  controls.update();
  elements.view.value = "custom";
}

function resizeRenderer() {
  if (!rendererReady || contextLost || !renderer || !camera) return;
  const width = elements.frame.clientWidth;
  const height = elements.frame.clientHeight;
  if (width < 1 || height < 1) return;
  renderer.setSize(width, height, false);
  const aspect = width / height;
  perspectiveCamera.aspect = aspect;
  perspectiveCamera.updateProjectionMatrix();
  const halfHeight = ORTHOGRAPHIC_VIEW_HEIGHT / 2;
  orthographicCamera.left = -halfHeight * aspect;
  orthographicCamera.right = halfHeight * aspect;
  orthographicCamera.top = halfHeight;
  orthographicCamera.bottom = -halfHeight;
  orthographicCamera.updateProjectionMatrix();
  renderScene();
}

function renderScene() {
  if (!rendererReady || contextLost || !renderer || !scene || !camera) return;
  renderer.render(scene, camera);
}

function handleContextLost(event) {
  event.preventDefault();
  contextLost = true;
  pauseMotion(false);
  rendererReady = false;
  showFallback("The 3D context was interrupted. Reload the page if the model does not return automatically.");
}

function handleContextRestored() {
  contextLost = false;
  rendererReady = true;
  setInterfaceEnabled(true);
  updateModel(state.progress);
  resizeRenderer();
  showViewer();
  announce("The 3D model has been restored.");
}

function showViewer() {
  elements.fallback.hidden = true;
  elements.legend.hidden = false;
  elements.canvas.hidden = false;
  elements.canvas.setAttribute("role", "img");
  elements.canvas.setAttribute("aria-hidden", "false");
  if (controls) controls.enabled = true;
}

function showFallback(message) {
  rendererReady = false;
  elements.fallback.textContent = message;
  elements.phaseChip.textContent = "3D unavailable";
  elements.stageLabel.textContent = "Model unavailable";
  elements.coreReadout.textContent = "Use the explanation below";
  elements.viewerNote.textContent = "The schematic explanation remains available below.";
  elements.liveStatus.textContent = message;
  elements.fallback.hidden = false;
  elements.legend.hidden = true;
  elements.canvas.hidden = true;
  elements.canvas.setAttribute("aria-hidden", "true");
  elements.canvas.removeAttribute("role");
  if (controls) controls.enabled = false;
  setInterfaceEnabled(false);
}

function setInterfaceEnabled(enabled) {
  [
    elements.progress,
    elements.play,
    elements.stepBack,
    elements.stepForward,
    elements.reset,
    elements.speed,
    elements.view,
    elements.rotateLeft,
    elements.rotateRight,
    elements.zoomIn,
    elements.zoomOut,
    elements.edgeMode,
    elements.screwMode,
    elements.projection,
    elements.showPlane,
    elements.showRegions,
    elements.showBonds,
    elements.showStress
  ].forEach((control) => {
    if (control) control.disabled = !enabled;
  });
}

function announce(message) {
  elements.liveStatus.textContent = message;
}

function smoothstep(edge0, edge1, value) {
  const ratio = clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return ratio * ratio * (3 - 2 * ratio);
}

function lerp(start, end, amount) {
  return start + (end - start) * amount;
}

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}
