const elements = {
  canvas: document.querySelector("#line-canvas"),
  frame: document.querySelector("#line-viewer-frame"),
  fallback: document.querySelector("#line-viewer-fallback"),
  modelKicker: document.querySelector("#line-model-kicker"),
  viewerTitle: document.querySelector("#line-viewer-title"),
  phaseChip: document.querySelector("#line-phase-chip"),
  viewerNote: document.querySelector("#line-viewer-note"),
  dataBadge: document.querySelector("#line-data-badge"),
  frameCounter: document.querySelector("#line-frame-counter"),
  readoutLabel: document.querySelector("#line-readout-label"),
  readoutValue: document.querySelector("#line-readout-value"),
  characterLegend: document.querySelector(".line-character-legend"),
  characterItems: [...document.querySelectorAll(".line-character-item")],
  characterNote: document.querySelector("#line-character-note"),
  accessibleStatus: document.querySelector("#line-accessible-status"),
  markerLabel: document.querySelector("#line-marker-label"),
  modelNote: document.querySelector("#line-model-note"),
  modeTugraz: document.querySelector("#line-mode-tugraz"),
  modeFrank: document.querySelector("#line-mode-frank"),
  projection: document.querySelector("#line-projection"),
  playbackTitle: document.querySelector("#line-playback-title"),
  progress: document.querySelector("#line-progress"),
  progressOutput: document.querySelector("#line-progress-output"),
  rangeTitle: document.querySelector("#line-range-title"),
  rangeStart: document.querySelector("#line-range-start"),
  rangeMiddle: document.querySelector("#line-range-middle"),
  rangeEnd: document.querySelector("#line-range-end"),
  play: document.querySelector("#line-play"),
  stepBack: document.querySelector("#line-step-back"),
  stepForward: document.querySelector("#line-step-forward"),
  reset: document.querySelector("#line-reset"),
  configuration: document.querySelector("#line-configuration"),
  speed: document.querySelector("#line-speed"),
  showCell: document.querySelector("#line-show-cell"),
  showNodes: document.querySelector("#line-show-nodes"),
  showMarkers: document.querySelector("#line-show-markers"),
  showMarkersLabel: document.querySelector("#line-show-markers-label"),
  showLoading: document.querySelector("#line-show-loading"),
  autoRotate: document.querySelector("#line-auto-rotate"),
  colorMode: document.querySelector("#line-color-mode"),
  cameraButtons: [...document.querySelectorAll("[data-view]")],
  rotateLeft: document.querySelector("#line-rotate-left"),
  rotateRight: document.querySelector("#line-rotate-right"),
  zoomIn: document.querySelector("#line-zoom-in"),
  zoomOut: document.querySelector("#line-zoom-out"),
  metricNodes: document.querySelector("#line-metric-nodes"),
  metricSegments: document.querySelector("#line-metric-segments"),
  metricMarkersLabel: document.querySelector("#line-metric-markers-label"),
  metricMarkers: document.querySelector("#line-metric-markers"),
  metricLength: document.querySelector("#line-metric-length"),
  stressReadout: document.querySelector("#line-stress-readout"),
  chartKicker: document.querySelector("#line-chart-kicker"),
  chartTitle: document.querySelector("#line-chart-title"),
  chartOutput: document.querySelector("#line-chart-output"),
  chartDescription: document.querySelector("#line-chart-svg-desc"),
  chartCaption: document.querySelector("#line-chart-caption"),
  chartXTitle: document.querySelector("#line-chart-x-title"),
  chartXStart: document.querySelector("#line-chart-x-start"),
  chartXEnd: document.querySelector("#line-chart-x-end"),
  chartLengthMax: document.querySelector("#line-chart-length-max"),
  chartLengthMin: document.querySelector("#line-chart-length-min"),
  chartCountMax: document.querySelector("#line-chart-count-max"),
  chartCountMin: document.querySelector("#line-chart-count-min"),
  chartArea: document.querySelector("#line-chart-area"),
  lengthPath: document.querySelector("#line-length-path"),
  countPath: document.querySelector("#line-count-path"),
  chartGuide: document.querySelector("#line-chart-guide"),
  lengthMarker: document.querySelector("#line-length-marker"),
  countMarker: document.querySelector("#line-count-marker"),
};

const state = {
  data: null,
  mode: "tugraz",
  progress: 1,
  playing: false,
  speed: 1,
  tourElapsed: 0,
  lastTime: performance.now(),
  visible: true,
  pageVisible: !document.hidden,
  dirty: true,
  modelDirty: true,
  disposed: false,
  reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  nodeFrameKey: "",
  lastAnnouncementKey: "",
  currentView: "isometric",
};

let THREE;
let OrbitControls;
let renderer;
let scene;
let perspectiveCamera;
let orthographicCamera;
let activeCamera;
let controls;
let networkGeometry;
let networkMaterial;
let networkLines;
let networkPositionArray;
let networkColorArray;
let networkCapacity = 0;
let cellGroup;
let loadingGroup;
let nodeMesh;
let markerMesh;
let resizeObserver;
let intersectionObserver;
let animationFrame;

const CHART = { left: 58, right: 438, top: 30, bottom: 266 };
const CAMERA_POSITIONS = {
  isometric: [3.35, 2.6, 3.7],
  front: [0, 0.1, 4.65],
  top: [0.1, 4.65, 0.01],
};

start();

async function start() {
  try {
    const [threeModule, controlsModule, response] = await Promise.all([
      import("three"),
      import("three/addons/controls/OrbitControls.js"),
      fetch(new URL("./data/dislocation-data.json?v=2", import.meta.url), { cache: "no-store" }),
    ]);
    if (!response.ok) {
      throw new Error(`Data request failed with ${response.status}`);
    }
    THREE = threeModule;
    OrbitControls = controlsModule.OrbitControls;
    state.data = await response.json();
    setupScene();
    setupInterface();
    setMode("tugraz", true);
    elements.fallback.hidden = true;
    elements.characterLegend.hidden = false;
    for (const control of document.querySelectorAll("[data-requires-ready]")) {
      control.disabled = false;
    }
    configureModeControls();
    resizeRenderer();
    state.modelDirty = true;
    state.dirty = true;
    animationFrame = requestAnimationFrame(animate);
  } catch (error) {
    console.error(error);
    elements.fallback.textContent = "The line-dynamics preview could not start. Check the local server, network access, and WebGL support, then reload.";
    elements.phaseChip.textContent = "Preview unavailable";
  }
}

function setupScene() {
  renderer = new THREE.WebGLRenderer({
    canvas: elements.canvas,
    antialias: true,
    alpha: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.7));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.localClippingEnabled = true;
  renderer.setClearColor(0x071527, 0.06);

  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x0a1b30, 0.07);

  perspectiveCamera = new THREE.PerspectiveCamera(38, 1, 0.01, 50);
  orthographicCamera = new THREE.OrthographicCamera(-2, 2, 2, -2, 0.01, 50);
  activeCamera = perspectiveCamera;
  setCameraPosition(CAMERA_POSITIONS.isometric);

  controls = new OrbitControls(activeCamera, elements.canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.07;
  controls.rotateSpeed = 0.65;
  controls.zoomSpeed = 0.75;
  controls.minDistance = 2.25;
  controls.maxDistance = 9;
  controls.minZoom = 0.65;
  controls.maxZoom = 3;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.38;
  controls.target.set(0, 0, 0);
  controls.addEventListener("change", requestRender);

  scene.add(new THREE.HemisphereLight(0xbce8f0, 0x102238, 1.8));
  const keyLight = new THREE.DirectionalLight(0xffffff, 2.5);
  keyLight.position.set(3.5, 4.2, 5.2);
  scene.add(keyLight);
  const rimLight = new THREE.DirectionalLight(0x54d9ce, 1.4);
  rimLight.position.set(-4, -1, -2);
  scene.add(rimLight);

  const clippingPlanes = [
    new THREE.Plane(new THREE.Vector3(1, 0, 0), 1.001),
    new THREE.Plane(new THREE.Vector3(-1, 0, 0), 1.001),
    new THREE.Plane(new THREE.Vector3(0, 1, 0), 1.001),
    new THREE.Plane(new THREE.Vector3(0, -1, 0), 1.001),
    new THREE.Plane(new THREE.Vector3(0, 0, 1), 1.001),
    new THREE.Plane(new THREE.Vector3(0, 0, -1), 1.001),
  ];

  networkGeometry = new THREE.BufferGeometry();
  networkMaterial = new THREE.LineBasicMaterial({
    color: 0xffffff,
    vertexColors: true,
    transparent: true,
    opacity: 0.94,
    clippingPlanes,
    fog: true,
  });
  networkLines = new THREE.LineSegments(networkGeometry, networkMaterial);
  networkLines.frustumCulled = false;
  networkLines.renderOrder = 2;
  scene.add(networkLines);

  buildNodeMeshes();

  cellGroup = buildCell();
  scene.add(cellGroup);
  loadingGroup = buildLoadingCues();
  scene.add(loadingGroup);

  elements.canvas.addEventListener("webglcontextlost", handleContextLost);
  elements.canvas.addEventListener("webglcontextrestored", handleContextRestored);

  resizeObserver = new ResizeObserver(resizeRenderer);
  resizeObserver.observe(elements.frame);
  intersectionObserver = new IntersectionObserver(([entry]) => {
    state.visible = entry.isIntersecting;
    if (entry.isIntersecting) requestRender();
  }, { threshold: 0.05 });
  intersectionObserver.observe(elements.frame);
}

function buildCell() {
  const group = new THREE.Group();
  const box = new THREE.BoxGeometry(2, 2, 2);
  const edges = new THREE.EdgesGeometry(box);
  box.dispose();
  const material = new THREE.LineBasicMaterial({ color: 0xbdeae6, transparent: true, opacity: 0.42 });
  const outline = new THREE.LineSegments(edges, material);
  group.add(outline);

  const cornerGeometry = new THREE.IcosahedronGeometry(0.018, 0);
  const cornerMaterial = new THREE.MeshBasicMaterial({ color: 0xd6f5f1, transparent: true, opacity: 0.52 });
  const corners = new THREE.InstancedMesh(cornerGeometry, cornerMaterial, 8);
  const dummy = new THREE.Object3D();
  let index = 0;
  for (const x of [-1, 1]) {
    for (const y of [-1, 1]) {
      for (const z of [-1, 1]) {
        dummy.position.set(x, y, z);
        dummy.updateMatrix();
        corners.setMatrixAt(index++, dummy.matrix);
      }
    }
  }
  corners.instanceMatrix.needsUpdate = true;
  group.add(corners);
  return group;
}

function buildLoadingCues() {
  const group = new THREE.Group();
  const planeMaterial = new THREE.MeshBasicMaterial({
    color: 0x46c6ba,
    transparent: true,
    opacity: 0.075,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), planeMaterial);
  plane.position.z = 0;
  group.add(plane);

  const grid = new THREE.GridHelper(2, 10, 0x63d7ce, 0x2b7b83);
  grid.rotation.x = Math.PI / 2;
  grid.material.transparent = true;
  grid.material.opacity = 0.13;
  grid.position.z = 0.002;
  group.add(grid);

  const arrowColor = 0xf0b551;
  for (const y of [-0.58, 0.58]) {
    group.add(new THREE.ArrowHelper(new THREE.Vector3(-1, 0, 0), new THREE.Vector3(1.15, y, 1.16), 0.72, arrowColor, 0.14, 0.075));
    group.add(new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(-1.15, y, -1.16), 0.72, arrowColor, 0.14, 0.075));
  }
  group.visible = false;
  return group;
}

function setupInterface() {
  populateConfigurationOptions();

  elements.modeTugraz.addEventListener("click", () => setMode("tugraz"));
  elements.modeFrank.addEventListener("click", () => setMode("frankRead"));
  elements.projection.addEventListener("change", switchProjection);
  elements.progress.addEventListener("input", () => {
    stopPlayback();
    setProgress(Number(elements.progress.value) / 1000);
  });
  elements.play.addEventListener("click", togglePlayback);
  elements.stepBack.addEventListener("click", () => stepState(-1));
  elements.stepForward.addEventListener("click", () => stepState(1));
  elements.reset.addEventListener("click", resetState);
  elements.configuration.addEventListener("change", () => {
    const count = state.data.tugraz.configurations.length;
    stopPlayback();
    setProgress(Number(elements.configuration.value) / Math.max(1, count - 1));
  });
  elements.speed.addEventListener("change", () => {
    state.speed = Number(elements.speed.value);
  });

  elements.showCell.addEventListener("change", () => {
    cellGroup.visible = elements.showCell.checked;
    requestRender();
  });
  elements.showNodes.addEventListener("change", updateLayerVisibility);
  elements.showMarkers.addEventListener("change", updateLayerVisibility);
  elements.showLoading.addEventListener("change", updateLayerVisibility);
  elements.autoRotate.addEventListener("change", () => {
    controls.autoRotate = elements.autoRotate.checked && !state.reducedMotion;
    requestRender();
  });
  elements.colorMode.addEventListener("change", () => {
    updateColorExplanation();
    state.modelDirty = true;
    requestRender();
  });

  for (const button of elements.cameraButtons) {
    button.addEventListener("click", () => setCameraView(button.dataset.view));
  }
  elements.rotateLeft.addEventListener("click", () => rotateCamera(0.16));
  elements.rotateRight.addEventListener("click", () => rotateCamera(-0.16));
  elements.zoomIn.addEventListener("click", () => zoomCamera(0.86));
  elements.zoomOut.addEventListener("click", () => zoomCamera(1.16));

  document.addEventListener("visibilitychange", () => {
    state.pageVisible = !document.hidden;
    state.lastTime = performance.now();
    if (!document.hidden) requestRender();
  });
  window.addEventListener("beforeunload", dispose);
}

function populateConfigurationOptions() {
  elements.configuration.replaceChildren();
  state.data.tugraz.configurations.forEach((configuration, index) => {
    const option = document.createElement("option");
    option.value = String(index);
    option.textContent = `${configuration.id} · ${configuration.label.replace(" sample", "")}`;
    elements.configuration.append(option);
  });
  elements.configuration.value = String(state.data.tugraz.configurations.length - 1);
}

function setMode(mode, initial = false) {
  if (!initial && state.mode === mode) return;
  stopPlayback();
  state.mode = mode;
  state.tourElapsed = 0;
  state.nodeFrameKey = "";
  state.progress = mode === "tugraz" ? 1 : 0;
  elements.modeTugraz.classList.toggle("is-active", mode === "tugraz");
  elements.modeFrank.classList.toggle("is-active", mode === "frankRead");
  elements.modeTugraz.setAttribute("aria-pressed", String(mode === "tugraz"));
  elements.modeFrank.setAttribute("aria-pressed", String(mode === "frankRead"));
  configureModeControls();
  state.modelDirty = true;
  setProgress(state.progress, true);
}

function configureModeControls() {
  if (!state.data) return;
  const tugraz = state.mode === "tugraz";
  elements.configuration.disabled = !tugraz;
  elements.showLoading.disabled = tugraz;
  elements.showLoading.closest("label").classList.toggle("is-disabled", tugraz);

  elements.playbackTitle.textContent = tugraz ? "Tour the ensemble" : "Play multiplication";
  elements.rangeTitle.textContent = tugraz ? "Selected configuration" : "Simulation progress";
  elements.rangeStart.textContent = tugraz ? "Shorter network" : "Step 0";
  elements.rangeMiddle.textContent = tugraz ? "Independent ensemble" : "Bow-out and emission";
  elements.rangeEnd.textContent = tugraz ? "Longer network" : "Step 190";
  elements.play.innerHTML = tugraz
    ? '<span aria-hidden="true">&#9654;</span> Tour samples'
    : '<span aria-hidden="true">&#9654;</span> Play trajectory';

  elements.modelKicker.textContent = tugraz ? "Authentic ParaDiS configuration" : "Solver-derived PyDiS trajectory";
  elements.viewerTitle.textContent = tugraz ? "TU Graz single-slip network" : "Frank–Read source multiplication";
  elements.viewerNote.textContent = tugraz
    ? "Six representative configurations span the total-line-length distribution of a 300-member ensemble. Their order is not simulation time."
    : "Twenty saved states from a 200-step PyDiS run show a pinned source bowing, multiplying, colliding, and remeshing under fixed applied stress.";
  elements.dataBadge.textContent = tugraz ? "TU Graz · CC BY 4.0" : "OpenDiS · BSD-3-Clause";
  elements.markerLabel.textContent = tugraz ? "Junction nodes" : "Pinned nodes";
  elements.showMarkersLabel.textContent = tugraz ? "Junction nodes (none)" : "Pinned source nodes";
  elements.metricMarkersLabel.textContent = tugraz ? "Junctions" : "Pinned nodes";
  elements.modelNote.innerHTML = tugraz
    ? "<strong>Dataset view:</strong> authentic ParaDiS configurations, displayed as an ensemble rather than a movie. The archive omits control-file boundary flags, so the converter explicitly treats the cubic cells as fully periodic."
    : "<strong>Solver-derived playback:</strong> saved PyDiS states are browser-interpolated for smooth motion. Topology changes collapse or grow between outputs for readability; those in-between shapes are not extra solver steps.";
  elements.stressReadout.textContent = tugraz
    ? "Loading history is not supplied for these relaxed ensemble members."
    : "Saved run: fixed σxz = −0.40 GPa; changing the stress would require a new simulation.";

  elements.chartKicker.textContent = tugraz ? "Six selected ensemble members" : "Twenty solver snapshots";
  elements.chartTitle.textContent = tugraz ? "Network size across configurations" : "Line multiplication through time";
  elements.chartCaption.textContent = tugraz
    ? "Each point is a different relaxed realization. The graph compares network size; it does not imply evolution between samples."
    : "Points are successive PyDiS outputs every ten integration steps. Browser interpolation smooths the line positions between them; counts and markers stay tied to the nearest saved state.";
  elements.chartXTitle.textContent = tugraz ? "Selected configuration rank (not time)" : "PyDiS integration step";
  elements.chartDescription.textContent = tugraz
    ? "The graph compares total line length and segment count across six independent ParaDiS configurations."
    : "The graph follows total line length and segment count over a Frank–Read source trajectory.";
  updateColorExplanation();
  updateLayerVisibility();
  updatePlayButton();
}

function setProgress(value, force = false) {
  let next = Math.min(1, Math.max(0, value));
  if (state.mode === "tugraz") {
    const count = state.data.tugraz.configurations.length;
    next = Math.round(next * (count - 1)) / Math.max(1, count - 1);
  }
  if (!force && Math.abs(next - state.progress) < 1e-7) return;
  state.progress = next;
  elements.progress.value = String(Math.round(next * 1000));
  state.modelDirty = true;
  requestRender();
}

function togglePlayback() {
  if (state.reducedMotion) {
    stepState(1);
    return;
  }
  if (state.mode === "frankRead" && state.progress >= 0.999) {
    setProgress(0, true);
  }
  state.playing = !state.playing;
  state.lastTime = performance.now();
  updatePlayButton();
  requestRender();
}

function stopPlayback() {
  if (!state.playing) return;
  state.playing = false;
  updatePlayButton();
}

function updatePlayButton() {
  if (!elements.play) return;
  if (state.playing) {
    elements.play.innerHTML = '<span aria-hidden="true">&#10074;&#10074;</span> Pause';
    return;
  }
  elements.play.innerHTML = state.mode === "tugraz"
    ? '<span aria-hidden="true">&#9654;</span> Tour samples'
    : '<span aria-hidden="true">&#9654;</span> Play trajectory';
}

function stepState(direction) {
  stopPlayback();
  const count = state.mode === "tugraz"
    ? state.data.tugraz.configurations.length
    : state.data.frankRead.frames.length;
  const index = Math.round(state.progress * (count - 1));
  const nextIndex = Math.min(count - 1, Math.max(0, index + direction));
  setProgress(nextIndex / Math.max(1, count - 1), true);
}

function resetState() {
  stopPlayback();
  setProgress(state.mode === "tugraz" ? 1 : 0, true);
  setCameraView("isometric");
}

function animate(time) {
  if (state.disposed) return;
  const delta = Math.min(0.05, Math.max(0, (time - state.lastTime) / 1000));
  state.lastTime = time;

  if (state.visible && state.pageVisible) {
    if (state.playing) advancePlayback(delta);
    if (state.modelDirty) updateModel();
    controls.autoRotate = elements.autoRotate.checked && !state.reducedMotion;
    const controlsChanged = controls.update(delta);
    if (state.dirty || state.playing || controls.autoRotate || controlsChanged) {
      renderer.render(scene, activeCamera);
      state.dirty = false;
    }
  }
  animationFrame = requestAnimationFrame(animate);
}

function advancePlayback(delta) {
  if (state.mode === "tugraz") {
    state.tourElapsed += delta * state.speed;
    if (state.tourElapsed >= 1.8) {
      state.tourElapsed %= 1.8;
      const count = state.data.tugraz.configurations.length;
      const current = Math.round(state.progress * (count - 1));
      const next = (current + 1) % count;
      setProgress(next / Math.max(1, count - 1), true);
    }
    return;
  }

  const duration = 13.5 / state.speed;
  const next = state.progress + delta / duration;
  if (next >= 1) {
    setProgress(1, true);
    stopPlayback();
  } else {
    setProgress(next, true);
  }
}

function updateModel() {
  let geometryPayload;
  let markerFrame;
  let markerFrameKey;
  let metrics;

  if (state.mode === "tugraz") {
    const configurations = state.data.tugraz.configurations;
    const index = Math.round(state.progress * (configurations.length - 1));
    const configuration = configurations[index];
    geometryPayload = geometryForStaticFrame(configuration);
    markerFrame = configuration;
    markerFrameKey = `tugraz:${configuration.id}`;
    metrics = configuration.stats;
    updateTugrazText(configuration, index, configurations.length);
  } else {
    const frames = state.data.frankRead.frames;
    const framePosition = state.progress * (frames.length - 1);
    const firstIndex = Math.floor(framePosition);
    const secondIndex = Math.min(frames.length - 1, firstIndex + 1);
    const mix = framePosition - firstIndex;
    const first = frames[firstIndex];
    const second = frames[secondIndex];
    geometryPayload = geometryForInterpolatedFrames(first, second, mix);
    const nearestIndex = Math.round(framePosition);
    markerFrame = frames[nearestIndex];
    markerFrameKey = `frank:${markerFrame.step}`;
    metrics = markerFrame.stats;
    markerFrame = interpolatedNodeFrame(first, second, mix);
    updateFrankText(first, second, mix, nearestIndex, frames.length);
  }

  updateNetworkBuffers(geometryPayload);
  state.nodeFrameKey = markerFrameKey;
  updateNodeMeshes(markerFrame);
  updateMetrics(metrics, markerFrame);
  updateChart();
  updateLayerVisibility();
  state.modelDirty = false;
  state.dirty = true;
}

function geometryForStaticFrame(frame) {
  const positions = [];
  const colors = [];
  for (const segment of frame.segments) {
    const endpoints = segmentEndpoints(frame, segment);
    pushSegment(positions, colors, endpoints.a, endpoints.b, segment.slice(2, 5));
    if (endpoints.hasPeriodicCopy) {
      pushSegment(positions, colors, endpoints.copyA, endpoints.copyB, segment.slice(2, 5));
    }
  }
  return { positions, colors };
}

function updateNetworkBuffers(payload) {
  const vertexCount = payload.positions.length / 3;
  if (vertexCount > networkCapacity) {
    let nextCapacity = Math.max(256, networkCapacity || 0);
    while (nextCapacity < vertexCount) nextCapacity *= 2;

    const nextGeometry = new THREE.BufferGeometry();
    networkPositionArray = new Float32Array(nextCapacity * 3);
    networkColorArray = new Float32Array(nextCapacity * 3);
    const positionAttribute = new THREE.BufferAttribute(networkPositionArray, 3);
    const colorAttribute = new THREE.BufferAttribute(networkColorArray, 3);
    positionAttribute.setUsage(THREE.DynamicDrawUsage);
    colorAttribute.setUsage(THREE.DynamicDrawUsage);
    nextGeometry.setAttribute("position", positionAttribute);
    nextGeometry.setAttribute("color", colorAttribute);
    nextGeometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), 3.6);
    nextGeometry.setDrawRange(0, vertexCount);

    const previousGeometry = networkGeometry;
    networkGeometry = nextGeometry;
    networkLines.geometry = nextGeometry;
    previousGeometry.dispose();
    networkCapacity = nextCapacity;
  }

  networkPositionArray.set(payload.positions, 0);
  networkColorArray.set(payload.colors, 0);
  networkGeometry.attributes.position.needsUpdate = true;
  networkGeometry.attributes.color.needsUpdate = true;
  networkGeometry.setDrawRange(0, vertexCount);
}

function geometryForInterpolatedFrames(first, second, mix) {
  if (first === second || mix <= 0.00001) return geometryForStaticFrame(first);
  const firstMap = segmentMap(first);
  const secondMap = segmentMap(second);
  const keys = new Set([...firstMap.keys(), ...secondMap.keys()]);
  const positions = [];
  const colors = [];

  for (const key of keys) {
    const firstEntry = firstMap.get(key);
    const secondEntry = secondMap.get(key);
    if (firstEntry && secondEntry) {
      const aligned = alignPair(firstEntry, secondEntry);
      const a = lerpVector(firstEntry.a, aligned.a, mix);
      const b = lerpVector(firstEntry.b, aligned.b, mix);
      const burgers = lerpVector(firstEntry.burgers, secondEntry.burgers, mix);
      pushSegment(positions, colors, a, b, burgers);
    } else if (firstEntry) {
      const midpoint = midpointVector(firstEntry.a, firstEntry.b);
      const scale = Math.max(0, 1 - mix);
      pushSegment(
        positions,
        colors,
        lerpVector(midpoint, firstEntry.a, scale),
        lerpVector(midpoint, firstEntry.b, scale),
        firstEntry.burgers,
      );
    } else if (secondEntry) {
      const midpoint = midpointVector(secondEntry.a, secondEntry.b);
      const scale = Math.min(1, mix);
      pushSegment(
        positions,
        colors,
        lerpVector(midpoint, secondEntry.a, scale),
        lerpVector(midpoint, secondEntry.b, scale),
        secondEntry.burgers,
      );
    }
  }
  return { positions, colors };
}

function segmentMap(frame) {
  const map = new Map();
  for (const segment of frame.segments) {
    const nodeA = frame.nodes[segment[0]];
    const nodeB = frame.nodes[segment[1]];
    const key = `${nodeA[0]}:${nodeA[1]}|${nodeB[0]}:${nodeB[1]}`;
    const endpoints = segmentEndpoints(frame, segment);
    map.set(key, { a: endpoints.a, b: endpoints.b, burgers: segment.slice(2, 5) });
    if (endpoints.hasPeriodicCopy) {
      map.set(`${key}|periodic-image`, {
        a: endpoints.copyA,
        b: endpoints.copyB,
        burgers: segment.slice(2, 5),
      });
    }
  }
  return map;
}

function segmentEndpoints(frame, segment) {
  const nodeA = frame.nodes[segment[0]];
  const nodeB = frame.nodes[segment[1]];
  const shift = segment.slice(5, 8);
  const a = nodeA.slice(2, 5);
  const b = [nodeB[2] + shift[0], nodeB[3] + shift[1], nodeB[4] + shift[2]];
  const hasPeriodicCopy = shift.some((value) => Math.abs(value) > 0.1);
  return {
    a,
    b,
    hasPeriodicCopy,
    copyA: hasPeriodicCopy ? a.map((value, axis) => value - shift[axis]) : null,
    copyB: hasPeriodicCopy ? b.map((value, axis) => value - shift[axis]) : null,
  };
}

function alignPair(reference, candidate) {
  const referenceMidpoint = midpointVector(reference.a, reference.b);
  const candidateMidpoint = midpointVector(candidate.a, candidate.b);
  const shift = candidateMidpoint.map((value, axis) => -2 * Math.round((value - referenceMidpoint[axis]) / 2));
  return {
    a: candidate.a.map((value, axis) => value + shift[axis]),
    b: candidate.b.map((value, axis) => value + shift[axis]),
  };
}

function interpolatedNodeFrame(first, second, mix) {
  if (first === second || mix <= 0.00001) return first;
  const firstNodes = new Map(first.nodes.map((node) => [`${node[0]}:${node[1]}`, node]));
  const secondNodes = new Map(second.nodes.map((node) => [`${node[0]}:${node[1]}`, node]));
  const keys = new Set([...firstNodes.keys(), ...secondNodes.keys()]);
  const nodes = [];

  for (const key of keys) {
    const firstNode = firstNodes.get(key);
    const secondNode = secondNodes.get(key);
    if (firstNode && secondNode) {
      const firstPosition = firstNode.slice(2, 5);
      const secondPosition = secondNode.slice(2, 5).map((value, axis) => {
        const imageShift = -2 * Math.round((value - firstPosition[axis]) / 2);
        return value + imageShift;
      });
      const position = lerpVector(firstPosition, secondPosition, mix).map(wrapCoordinate);
      const discreteNode = mix < 0.5 ? firstNode : secondNode;
      nodes.push([discreteNode[0], discreteNode[1], ...position, discreteNode[5], discreteNode[6]]);
    } else if (firstNode && mix < 0.5) {
      nodes.push([...firstNode.slice(0, 2), ...firstNode.slice(2, 5).map(wrapCoordinate), firstNode[5], firstNode[6]]);
    } else if (secondNode && mix >= 0.5) {
      nodes.push([...secondNode.slice(0, 2), ...secondNode.slice(2, 5).map(wrapCoordinate), secondNode[5], secondNode[6]]);
    }
  }
  return { nodes };
}

function wrapCoordinate(value) {
  return ((value + 1) % 2 + 2) % 2 - 1;
}

function pushSegment(positionArray, colorArray, a, b, burgers) {
  positionArray.push(...a, ...b);
  const color = characterColor(a, b, burgers);
  colorArray.push(color.r, color.g, color.b, color.r, color.g, color.b);
}

function characterColor(a, b, burgers) {
  if (elements.colorMode.value === "uniform") return new THREE.Color(0x6fd8ce);
  const tangent = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  const burgersVector = new THREE.Vector3(...burgers);
  if (tangent.lengthSq() < 1e-12 || burgersVector.lengthSq() < 1e-12) return new THREE.Color(0xf4bd55);
  tangent.normalize();
  burgersVector.normalize();
  const character = Math.min(1, Math.abs(tangent.dot(burgersVector)));
  const edge = new THREE.Color(0xef6b59);
  const mixed = new THREE.Color(0xf4bd55);
  const screw = new THREE.Color(0x45c4ba);
  return character < 0.5
    ? edge.lerp(mixed, character * 2)
    : mixed.lerp(screw, (character - 0.5) * 2);
}

function updateColorExplanation() {
  const uniform = elements.colorMode.value === "uniform";
  for (const item of elements.characterItems) item.hidden = uniform;
  elements.characterLegend.setAttribute("aria-label", uniform ? "Network marker legend" : "Line-character color legend");
  elements.characterNote.innerHTML = uniform
    ? "Drag to orbit, use the wheel to zoom, or use the camera buttons. A single color emphasizes network geometry."
    : "Drag to orbit, use the wheel to zoom, or use the camera buttons. Lines are colored by |<i>t</i>·<i>b&#770;</i>|.";
}

function buildNodeMeshes() {
  const maxNodes = Math.max(
    ...state.data.tugraz.configurations.map((frame) => frame.nodes.length),
    ...state.data.frankRead.frames.map((frame) => frame.nodes.length),
  );
  const nodeGeometry = new THREE.IcosahedronGeometry(0.012, 0);
  const nodeMaterial = new THREE.MeshBasicMaterial({ color: 0xb8ede7, transparent: true, opacity: 0.48 });
  nodeMesh = new THREE.InstancedMesh(nodeGeometry, nodeMaterial, maxNodes);
  nodeMesh.count = 0;
  nodeMesh.frustumCulled = false;
  scene.add(nodeMesh);

  const markerGeometry = new THREE.IcosahedronGeometry(0.036, 1);
  const markerMaterial = new THREE.MeshStandardMaterial({
    color: 0xffe3a0,
    emissive: 0x80520e,
    emissiveIntensity: 0.45,
    roughness: 0.4,
  });
  markerMesh = new THREE.InstancedMesh(markerGeometry, markerMaterial, maxNodes);
  markerMesh.count = 0;
  markerMesh.frustumCulled = false;
  scene.add(markerMesh);
}

function updateNodeMeshes(frame) {
  const dummy = new THREE.Object3D();
  frame.nodes.forEach((node, index) => {
    dummy.position.set(wrapCoordinate(node[2]), wrapCoordinate(node[3]), wrapCoordinate(node[4]));
    dummy.updateMatrix();
    nodeMesh.setMatrixAt(index, dummy.matrix);
  });
  nodeMesh.count = frame.nodes.length;
  nodeMesh.instanceMatrix.needsUpdate = true;

  const markerNodes = frame.nodes.filter((node) => state.mode === "tugraz" ? node[6] >= 3 : node[5] === 7);
  markerMesh.material.color.setHex(state.mode === "tugraz" ? 0xff8a6e : 0xffe3a0);
  markerMesh.material.emissive.setHex(state.mode === "tugraz" ? 0x7a2419 : 0x80520e);
  markerNodes.forEach((node, index) => {
    dummy.position.set(wrapCoordinate(node[2]), wrapCoordinate(node[3]), wrapCoordinate(node[4]));
    dummy.updateMatrix();
    markerMesh.setMatrixAt(index, dummy.matrix);
  });
  markerMesh.count = markerNodes.length;
  markerMesh.instanceMatrix.needsUpdate = true;
}

function updateLayerVisibility() {
  if (!state.data || !cellGroup || !loadingGroup) return;
  cellGroup.visible = elements.showCell.checked;
  if (nodeMesh) nodeMesh.visible = elements.showNodes.checked;
  if (markerMesh) markerMesh.visible = elements.showMarkers.checked;
  loadingGroup.visible = state.mode === "frankRead" && elements.showLoading.checked;
  requestRender();
}

function updateTugrazText(configuration, index, total) {
  elements.phaseChip.textContent = "Ensemble sample · not time";
  elements.frameCounter.textContent = `Configuration ${configuration.id} · ${index + 1}/${total}`;
  elements.readoutLabel.textContent = configuration.label;
  elements.readoutValue.textContent = `${configuration.stats.segments.toLocaleString()} continuous segments`;
  elements.progressOutput.textContent = `${index + 1} / ${total}`;
  elements.configuration.value = String(index);
  announceState(`tugraz:${configuration.id}`, `ParaDiS ensemble configuration ${configuration.id}, ${configuration.stats.segments} segments. This is an independent sample, not a time step.`);
}

function updateFrankText(first, second, mix, nearestIndex, total) {
  const interpolatedStep = Math.round(first.step + (second.step - first.step) * mix);
  const nearest = state.data.frankRead.frames[nearestIndex];
  elements.phaseChip.textContent = frankPhase(nearest.step);
  elements.frameCounter.textContent = first === second || mix <= 0.001
    ? `Saved PyDiS step ${first.step} · ${nearestIndex + 1}/${total}`
    : `Visual interpolation ${first.step}→${second.step} · nearest saved ${nearest.step}`;
  elements.readoutLabel.textContent = "Fixed σxz: −0.40 GPa";
  elements.readoutValue.textContent = frankPhase(nearest.step);
  elements.progressOutput.textContent = `≈ Step ${interpolatedStep}`;
  announceState(`frank:${nearest.step}`, `Nearest saved PyDiS state: step ${nearest.step}, ${nearest.stats.segments} segments. ${frankPhase(nearest.step)}.`);
}

function announceState(key, message) {
  if (state.playing) return;
  if (state.lastAnnouncementKey === key) return;
  state.lastAnnouncementKey = key;
  elements.accessibleStatus.textContent = message;
}

function frankPhase(step) {
  if (step < 35) return "Source begins to bow";
  if (step < 85) return "Curvature grows";
  if (step < 145) return "Loop emission and expansion";
  if (step < 175) return "Multiplication regime";
  return "Collision and remeshing";
}

function updateMetrics(metrics, frame) {
  elements.metricNodes.textContent = metrics.nodes.toLocaleString();
  elements.metricSegments.textContent = metrics.segments.toLocaleString();
  elements.metricMarkers.textContent = state.mode === "tugraz"
    ? metrics.junctions.toLocaleString()
    : (metrics.pinned ?? frame.stats.pinned ?? 0).toLocaleString();
  elements.metricLength.textContent = metrics.lengthOverBox.toFixed(2);
}

function updateChart() {
  const frames = state.mode === "tugraz"
    ? state.data.tugraz.configurations
    : state.data.frankRead.frames;
  const lengths = frames.map((frame) => frame.stats.lengthOverBox);
  const counts = frames.map((frame) => frame.stats.segments);
  const lengthScale = chartScale(lengths);
  const countScale = chartScale(counts);
  const xForIndex = (index) => CHART.left + (CHART.right - CHART.left) * index / Math.max(1, frames.length - 1);
  const yForLength = (value) => CHART.bottom - (CHART.bottom - CHART.top) * lengthScale.normalized(value);
  const yForCount = (value) => CHART.bottom - (CHART.bottom - CHART.top) * countScale.normalized(value);
  const lengthPoints = lengths.map((value, index) => [xForIndex(index), yForLength(value)]);
  const countPoints = counts.map((value, index) => [xForIndex(index), yForCount(value)]);

  elements.lengthPath.setAttribute("d", pathFromPoints(lengthPoints));
  elements.countPath.setAttribute("d", pathFromPoints(countPoints));
  elements.chartArea.setAttribute("d", `${pathFromPoints(lengthPoints)} L ${CHART.right} ${CHART.bottom} L ${CHART.left} ${CHART.bottom} Z`);

  const playbackPosition = state.progress * (frames.length - 1);
  const position = state.mode === "tugraz" ? playbackPosition : Math.round(playbackPosition);
  const firstIndex = Math.floor(position);
  const secondIndex = Math.min(frames.length - 1, firstIndex + 1);
  const mix = position - firstIndex;
  const x = xForIndex(position);
  const length = lengths[firstIndex] + (lengths[secondIndex] - lengths[firstIndex]) * mix;
  const count = counts[firstIndex] + (counts[secondIndex] - counts[firstIndex]) * mix;
  const lengthY = yForLength(length);
  const countY = yForCount(count);
  elements.chartGuide.setAttribute("x1", x.toFixed(2));
  elements.chartGuide.setAttribute("x2", x.toFixed(2));
  elements.lengthMarker.setAttribute("cx", x.toFixed(2));
  elements.lengthMarker.setAttribute("cy", lengthY.toFixed(2));
  elements.countMarker.setAttribute("cx", x.toFixed(2));
  elements.countMarker.setAttribute("cy", countY.toFixed(2));

  elements.chartLengthMax.textContent = lengthScale.max.toFixed(1);
  elements.chartLengthMin.textContent = lengthScale.min.toFixed(1);
  elements.chartCountMax.textContent = Math.round(countScale.max).toLocaleString();
  elements.chartCountMin.textContent = Math.round(countScale.min).toLocaleString();

  if (state.mode === "tugraz") {
    const index = Math.round(position);
    const configuration = frames[index];
    elements.chartOutput.textContent = `Config ${configuration.id}`;
    elements.chartXStart.textContent = frames[0].id;
    elements.chartXEnd.textContent = frames.at(-1).id;
  } else {
    const step = frames[Math.round(position)].step;
    elements.chartOutput.textContent = `Saved step ${step}`;
    elements.chartXStart.textContent = String(frames[0].step);
    elements.chartXEnd.textContent = String(frames.at(-1).step);
  }
}

function chartScale(values) {
  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const span = Math.max(1e-6, rawMax - rawMin);
  const min = rawMin - span * 0.08;
  const max = rawMax + span * 0.08;
  return { min, max, normalized: (value) => (value - min) / (max - min) };
}

function pathFromPoints(points) {
  return points.map(([x, y], index) => `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`).join(" ");
}

function switchProjection() {
  const next = elements.projection.checked ? orthographicCamera : perspectiveCamera;
  next.position.copy(activeCamera.position);
  next.quaternion.copy(activeCamera.quaternion);
  if (next === orthographicCamera) next.zoom = 1.1;
  activeCamera = next;
  controls.object = activeCamera;
  controls.update();
  resizeRenderer();
  requestRender();
}

function setCameraView(view) {
  state.currentView = view;
  for (const button of elements.cameraButtons) {
    const active = button.dataset.view === view;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  }
  setCameraPosition(CAMERA_POSITIONS[view]);
  controls.target.set(0, 0, 0);
  controls.update();
  requestRender();
}

function setCameraPosition(position) {
  perspectiveCamera.position.set(...position);
  orthographicCamera.position.set(...position);
  perspectiveCamera.lookAt(0, 0, 0);
  orthographicCamera.lookAt(0, 0, 0);
}

function rotateCamera(angle) {
  const offset = activeCamera.position.clone().sub(controls.target);
  offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), angle);
  activeCamera.position.copy(controls.target).add(offset);
  activeCamera.lookAt(controls.target);
  controls.update();
  requestRender();
}

function zoomCamera(multiplier) {
  if (activeCamera.isOrthographicCamera) {
    activeCamera.zoom = Math.min(3, Math.max(0.65, activeCamera.zoom / multiplier));
    activeCamera.updateProjectionMatrix();
  } else {
    const offset = activeCamera.position.clone().sub(controls.target).multiplyScalar(multiplier);
    const distance = Math.min(controls.maxDistance, Math.max(controls.minDistance, offset.length()));
    offset.setLength(distance);
    activeCamera.position.copy(controls.target).add(offset);
  }
  controls.update();
  requestRender();
}

function resizeRenderer() {
  if (!renderer || !elements.frame) return;
  const width = Math.max(1, elements.frame.clientWidth);
  const height = Math.max(1, elements.frame.clientHeight);
  renderer.setSize(width, height, false);
  perspectiveCamera.aspect = width / height;
  perspectiveCamera.updateProjectionMatrix();
  const orthoHeight = 3.25;
  const orthoWidth = orthoHeight * width / height;
  orthographicCamera.left = -orthoWidth / 2;
  orthographicCamera.right = orthoWidth / 2;
  orthographicCamera.top = orthoHeight / 2;
  orthographicCamera.bottom = -orthoHeight / 2;
  orthographicCamera.updateProjectionMatrix();
  requestRender();
}

function requestRender() {
  state.dirty = true;
}

function handleContextLost(event) {
  event.preventDefault();
  stopPlayback();
  elements.fallback.hidden = false;
  elements.fallback.textContent = "The WebGL context was interrupted. Waiting for the browser to restore it…";
}

function handleContextRestored() {
  elements.fallback.hidden = true;
  state.modelDirty = true;
  requestRender();
}

function lerpVector(first, second, amount) {
  return first.map((value, axis) => value + (second[axis] - value) * amount);
}

function midpointVector(first, second) {
  return first.map((value, axis) => (value + second[axis]) * 0.5);
}

function dispose() {
  state.disposed = true;
  if (animationFrame) cancelAnimationFrame(animationFrame);
  resizeObserver?.disconnect();
  intersectionObserver?.disconnect();
  controls?.dispose();
  networkGeometry?.dispose();
  networkMaterial?.dispose();
  nodeMesh?.geometry.dispose();
  nodeMesh?.material.dispose();
  markerMesh?.geometry.dispose();
  markerMesh?.material.dispose();
  renderer?.dispose();
}
