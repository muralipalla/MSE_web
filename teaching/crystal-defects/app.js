const SVG_NS = "http://www.w3.org/2000/svg";

const elements = {
  pointButtons: [...document.querySelectorAll("[data-point-defect]")],
  pointLattice: document.querySelector("#point-lattice"),
  pointTitle: document.querySelector("#point-svg-title"),
  pointDesc: document.querySelector("#point-svg-desc"),
  pointName: document.querySelector("#point-defect-name"),
  pointDescription: document.querySelector("#point-defect-description"),
  pointOccupancy: document.querySelector("#point-occupancy"),
  pointStrain: document.querySelector("#point-strain"),
  pointProperty: document.querySelector("#point-property"),
  pointStatus: document.querySelector("#point-status"),
  voidLatticeButtons: [...document.querySelectorAll("[data-void-lattice]")],
  voidModeButtons: [...document.querySelectorAll("[data-void-mode]")],
  voidKind: document.querySelector("#void-kind"),
  voidTitle: document.querySelector("#void-model-title"),
  voidRatioBadge: document.querySelector("#void-ratio-badge"),
  voidHostCount: document.querySelector("#void-host-count"),
  voidSiteCount: document.querySelector("#void-site-count"),
  voidCoordinate: document.querySelector("#void-coordinate"),
  voidCage: document.querySelector("#void-cage"),
  voidCount: document.querySelector("#void-count"),
  voidRadius: document.querySelector("#void-radius"),
  voidNote: document.querySelector("#void-note"),
  voidStatus: document.querySelector("#void-status"),
  voidCanvas: document.querySelector("#void-canvas"),
  voidFrame: document.querySelector("#void-viewer-frame"),
  voidFallback: document.querySelector("#void-fallback"),
  showPolyhedron: document.querySelector("#show-void-polyhedron"),
  atomSize: document.querySelector("#void-atom-size"),
  atomSizeOutput: document.querySelector("#void-atom-size-output"),
  orthographic: document.querySelector("#void-orthographic"),
  resetView: document.querySelector("#void-reset"),
  ionicButtons: [...document.querySelectorAll("[data-ionic-defect]")],
  ionicLattice: document.querySelector("#ionic-lattice"),
  ionicTitle: document.querySelector("#ionic-svg-title"),
  ionicDesc: document.querySelector("#ionic-svg-desc"),
  ionicCaption: document.querySelector("#ionic-caption"),
  ionicVacancies: document.querySelector("#ionic-vacancies"),
  ionicInterstitials: document.querySelector("#ionic-interstitials"),
  ionicCharge: document.querySelector("#ionic-charge"),
  ionicDensity: document.querySelector("#ionic-density"),
  ionicStatus: document.querySelector("#ionic-status"),
  grainAngle: document.querySelector("#grain-angle"),
  grainAngleOutput: document.querySelector("#grain-angle-output"),
  grainClass: document.querySelector("#grain-class"),
  grainSpacing: document.querySelector("#grain-spacing"),
  grainExplanation: document.querySelector("#grain-explanation"),
  grainCanvas: document.querySelector("#grain-canvas"),
  grainStatus: document.querySelector("#grain-status"),
  astmGrainCount: document.querySelector("#astm-grain-count"),
  astmNewField: document.querySelector("#astm-new-field"),
  astmMeasure: document.querySelector("#astm-measure"),
  astmIntersections: document.querySelector("#astm-intersections"),
  astmImageLength: document.querySelector("#astm-image-length"),
  astmSpecimenLength: document.querySelector("#astm-specimen-length"),
  astmIntercept: document.querySelector("#astm-intercept"),
  astmNumber: document.querySelector("#astm-number"),
  astmReferenceDensity: document.querySelector("#astm-reference-density"),
  astmCanvas: document.querySelector("#astm-canvas"),
  astmFigureCaption: document.querySelector("#astm-figure-caption"),
  astmStatus: document.querySelector("#astm-status")
};

const POINT_DEFECTS = {
  perfect: {
    name: "Perfect reference lattice",
    description: "Every displayed lattice site is occupied by a host atom.",
    occupancy: "One host atom per site",
    strain: "Periodic neighbourhood",
    property: "Reference for comparison",
    svgTitle: "Perfect atomic layer",
    svgDescription: "A regular two-dimensional atomic layer with no highlighted defect."
  },
  vacancy: {
    name: "Vacancy",
    description: "One normal lattice site is empty; neighbouring atoms would relax around it.",
    occupancy: "One missing host atom",
    strain: "Local inward relaxation",
    property: "Enables vacancy-mediated diffusion",
    svgTitle: "Atomic layer containing a vacancy",
    svgDescription: "One lattice site is shown as an empty dashed circle among host atoms."
  },
  substitutional: {
    name: "Substitutional solute",
    description: "A chemically different atom occupies a normal host-lattice site; its displayed size and colour are illustrative.",
    occupancy: "Solute replaces one host",
    strain: "Size and modulus mismatch",
    property: "Can strengthen a solid solution",
    svgTitle: "Atomic layer containing a substitutional solute",
    svgDescription: "One normal site contains a larger, differently coloured circular solute atom labelled S."
  },
  interstitial: {
    name: "Interstitial atom",
    description: "An additional smaller atom occupies the centre of a triangular gap between three host atoms.",
    occupancy: "Extra atom off lattice",
    strain: "Local crowding or dilation",
    property: "Enables interstitial diffusion",
    svgTitle: "Atomic layer containing an interstitial atom",
    svgDescription: "A small labelled interstitial atom is centred in a triangular gap and touches the outlines of three surrounding host atoms."
  }
};

const IONIC_DEFECTS = {
  perfect: {
    caption: "Perfect reference: equal numbers of A⁺ and B⁻ occupy their normal sites.",
    vacancies: "0",
    interstitials: "0",
    charge: "0",
    density: "Reference",
    title: "Perfect AB ionic lattice",
    description: "An alternating lattice of positive and negative ions."
  },
  schottky: {
    caption: "Schottky disorder removes a stoichiometric A⁺/B⁻ pair, leaving two oppositely charged vacancies while preserving overall neutrality.",
    vacancies: "2 (one A, one B)",
    interstitials: "0",
    charge: "0",
    density: "Decreases",
    title: "AB ionic lattice containing a Schottky pair",
    description: "One positive ion and one negative ion are missing from their normal lattice sites."
  },
  frenkel: {
    caption: "Frenkel disorder moves one small A⁺ ion from its normal site to an interstitial site, creating a vacancy–interstitial pair.",
    vacancies: "1 (A site)",
    interstitials: "1 A⁺",
    charge: "0",
    density: "Approximately unchanged",
    title: "AB ionic lattice containing a Frenkel pair",
    description: "A positive ion has moved from its normal site to an interstitial position, leaving a vacancy."
  }
};

const VOID_CELL_SIZE = 5.2;
const VOID_EPSILON = 1e-8;
const HCP_C_OVER_A = Math.sqrt(8 / 3);
const ASTM_IMAGE_LINE_LENGTH_MM = 25.4;
const ASTM_MAGNIFICATION = 100;
const ASTM_MASTER_ASPECT = 700 / 430;
const ASTM_FIELD_AREA_IN2 = 2;
const ASTM_ONE_INCH_SIDE = Math.sqrt(ASTM_MASTER_ASPECT / ASTM_FIELD_AREA_IN2);
const ASTM_EDGE_EPSILON = 1e-8;
const ASTM_LINE_GROUP_EPSILON = 1e-7;
const ASTM_MAX_FIELD_RETRIES = 12;

const VOID_LATTICES = {
  fcc: {
    label: "FCC",
    hostVisible: 14,
    hostEffective: 4,
    hostDescription: "All corner and face-centre atom images are shown as complete spheres.",
    sites: {
      octahedral: {
        label: "octahedral",
        visible: 13,
        effective: 4,
        perHost: 1,
        coordinate: "(½, ½, ½)",
        cage: "6; regular octahedron",
        ratio: Math.SQRT2 - 1,
        note: "One body-centre marker and 12 shared edge-centre images represent four effective octahedral sites."
      },
      tetrahedral: {
        label: "tetrahedral",
        visible: 8,
        effective: 8,
        perHost: 2,
        coordinate: "(¼, ¼, ¼)",
        cage: "4; regular tetrahedron",
        ratio: Math.sqrt(3 / 2) - 1,
        note: "All eight tetrahedral sites lie inside the FCC conventional cell, so the visible and effective counts are both eight."
      }
    }
  },
  bcc: {
    label: "BCC",
    hostVisible: 9,
    hostEffective: 2,
    hostDescription: "All eight corner atom images and the body-centre atom are shown as complete spheres.",
    sites: {
      octahedral: {
        label: "octahedral",
        visible: 18,
        effective: 6,
        perHost: 3,
        coordinate: "(½, ½, 0)",
        cage: "6; distorted square bipyramid",
        ratio: 2 / Math.sqrt(3) - 1,
        note: "Six face-centre and 12 edge-centre images represent six effective sites. The limiting probe touches two nearer hosts; four hosts are farther away."
      },
      tetrahedral: {
        label: "tetrahedral",
        visible: 24,
        effective: 12,
        perHost: 6,
        coordinate: "(½, ¼, 0)",
        cage: "4; distorted tetrahedron",
        ratio: Math.sqrt(5 / 3) - 1,
        note: "The closed cube shows 24 face images. Each is shared by two cells, giving 12 effective tetrahedral sites."
      }
    }
  },
  hcp: {
    label: "HCP",
    hostVisible: 17,
    hostEffective: 6,
    hostDescription: "The closed conventional hexagonal prism shows basal-plane boundary images and three atoms in the middle layer.",
    sites: {
      octahedral: {
        label: "octahedral",
        visible: 6,
        effective: 6,
        perHost: 1,
        coordinate: "primitive (⅓, ⅔, ¼)",
        cage: "6; regular octahedron for ideal c/a",
        ratio: Math.SQRT2 - 1,
        note: "The ideal HCP prism contains six interior octahedral markers. A non-ideal c/a ratio changes the exact clearance."
      },
      tetrahedral: {
        label: "tetrahedral",
        visible: 20,
        effective: 12,
        perHost: 2,
        coordinate: "primitive (⅔, ⅓, ⅛)",
        cage: "4; regular tetrahedron for ideal c/a",
        ratio: Math.sqrt(3 / 2) - 1,
        note: "Twenty visible markers include eight interior images and 12 prism-corner images shared by three prisms, giving 12 effective sites."
      }
    }
  }
};

const state = {
  pointDefect: "perfect",
  ionicDefect: "perfect",
  voidLattice: "fcc",
  voidMode: "host",
  showPolyhedron: false,
  atomScale: 1,
  projection: "perspective",
  rendererReady: false,
  rendererFailed: false,
  modelRadius: 2.5,
  modelCenter: null
};

let THREE;
let OrbitControls;
let renderer;
let scene;
let camera;
let perspectiveCamera;
let orthographicCamera;
let controls;
let modelGroup;
let resizeObserver;
const astmGrainFieldCache = new Map();
const astmState = {
  seed: randomAstmSeed(),
  grainDensity: 128,
  measured: false
};

initialisePage();

function initialisePage() {
  assertVoidGeometry();
  bindPageControls();
  renderPointDefect("perfect");
  renderIonicDefect("perfect");
  updateVoidText(false);
  updateGrainBoundary();
  renderAstmExperiment(false);
  observeTwoDimensionalCanvases();
  initialiseThreeViewer();
}

function bindPageControls() {
  elements.pointButtons.forEach(button => {
    button.addEventListener("click", () => renderPointDefect(button.dataset.pointDefect));
  });

  elements.ionicButtons.forEach(button => {
    button.addEventListener("click", () => renderIonicDefect(button.dataset.ionicDefect));
  });
  elements.voidLatticeButtons.forEach(button => button.addEventListener("click", () => {
    state.voidLattice = button.dataset.voidLattice;
    updateVoidSelection(true);
  }));
  elements.voidModeButtons.forEach(button => button.addEventListener("click", () => {
    state.voidMode = button.dataset.voidMode;
    if (state.voidMode === "host") {
      state.showPolyhedron = false;
      elements.showPolyhedron.checked = false;
    }
    updateVoidSelection(true);
  }));
  elements.showPolyhedron.addEventListener("change", () => {
    state.showPolyhedron = elements.showPolyhedron.checked;
    updateVoidSelection(true);
  });
  elements.atomSize.addEventListener("input", () => {
    state.atomScale = Number(elements.atomSize.value) / 100;
    elements.atomSizeOutput.value = `${elements.atomSize.value}%`;
    elements.atomSize.setAttribute("aria-valuetext", `${elements.atomSize.value}% of default display size`);
    if (state.rendererReady) buildVoidScene();
  });
  elements.atomSize.addEventListener("change", () => {
    setVoidStatus(`Host atoms shown at ${elements.atomSize.value}% of the default display size.`);
  });
  elements.orthographic.addEventListener("change", () => switchVoidProjection(elements.orthographic.checked, true));
  elements.resetView.addEventListener("click", () => resetVoidView(true));

  elements.grainAngle.addEventListener("input", updateGrainBoundary);
  elements.grainAngle.addEventListener("change", announceGrainBoundary);
  elements.astmGrainCount.addEventListener("change", () => {
    astmState.grainDensity = Number(elements.astmGrainCount.value);
    astmGrainFieldCache.clear();
    renderAstmExperiment(true, "preserved");
  });
  elements.astmNewField.addEventListener("click", () => {
    generateRandomAstmField(true);
  });
  elements.astmMeasure.addEventListener("click", () => {
    const willShow = !astmState.measured;
    setAstmMeasurementVisible(willShow);
    renderAstmExperiment(true, willShow ? "measurement" : "hidden");
  });
}

function renderPointDefect(type) {
  const definition = POINT_DEFECTS[type];
  if (!definition) return;
  state.pointDefect = type;
  setPressedButton(elements.pointButtons, "pointDefect", type);
  elements.pointLattice.replaceChildren();

  const rows = 5;
  const columns = 8;
  const latticePitch = 70;
  const rowPitch = Math.sqrt(3) * latticePitch / 2;
  const originX = 65;
  const originY = 45;
  const hostOuterRadius = 22;
  const hostStrokeWidth = 2;
  const hostRadius = hostOuterRadius - hostStrokeWidth / 2;
  const centreRow = 2;
  const centreColumn = 4;

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const x = originX + column * latticePitch + (row % 2) * latticePitch / 2;
      const y = originY + row * rowPitch;
      const isCentre = row === centreRow && column === centreColumn;

      if (isCentre && type === "vacancy") {
        const vacancy = svgElement("circle", { cx: x, cy: y, r: hostRadius, fill: "none", stroke: "#c93b1f", "stroke-width": 3, "stroke-dasharray": "7 6" });
        elements.pointLattice.append(vacancy, svgText(x, y + 5, "V", "#c93b1f", 16, 900));
        continue;
      }

      if (isCentre && type === "substitutional") {
        const solute = svgElement("circle", { cx: x, cy: y, r: 26, fill: "#f05030", stroke: "#18375f", "stroke-width": 2 });
        elements.pointLattice.append(solute, svgText(x, y + 5, "S", "#ffffff", 16, 900));
        continue;
      }

      const host = svgElement("circle", { cx: x, cy: y, r: hostRadius, fill: "#8fb6d7", stroke: "#18375f", "stroke-width": hostStrokeWidth });
      elements.pointLattice.append(host);
    }
  }

  if (type === "interstitial") {
    const topLeftX = originX + centreColumn * latticePitch;
    const topY = originY + centreRow * rowPitch;
    const x = topLeftX + latticePitch / 2;
    const y = topY + rowPitch / 3;
    const interstitialOuterRadius = latticePitch / Math.sqrt(3) - hostOuterRadius;
    const interstitialRadius = interstitialOuterRadius - hostStrokeWidth / 2;
    elements.pointLattice.append(
      svgElement("circle", { cx: x, cy: y, r: interstitialRadius, fill: "#ffd23f", stroke: "#18375f", "stroke-width": hostStrokeWidth }),
      svgText(x, y + 5, "I", "#18375f", 13, 900)
    );
  }

  elements.pointTitle.textContent = definition.svgTitle;
  elements.pointDesc.textContent = definition.svgDescription;
  elements.pointName.textContent = definition.name;
  elements.pointDescription.textContent = definition.description;
  elements.pointOccupancy.textContent = definition.occupancy;
  elements.pointStrain.textContent = definition.strain;
  elements.pointProperty.textContent = definition.property;
  updateLiveText(elements.pointStatus, `${definition.name} selected. ${definition.description}`);
}

function renderIonicDefect(type) {
  const definition = IONIC_DEFECTS[type];
  if (!definition) return;
  state.ionicDefect = type;
  setPressedButton(elements.ionicButtons, "ionicDefect", type);
  elements.ionicLattice.replaceChildren();

  const rows = 4;
  const columns = 7;
  const missingCation = "1-3";
  const missingAnion = "2-3";

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const key = `${row}-${column}`;
      const isCation = (row + column) % 2 === 0;
      const x = 78 + column * 82;
      const y = 58 + row * 74;
      const missing = (type === "schottky" && (key === missingCation || key === missingAnion)) ||
        (type === "frenkel" && key === missingCation);

      if (missing) {
        const outline = isCation
          ? svgElement("circle", { cx: x, cy: y, r: 23, fill: "none", stroke: "#c93b1f", "stroke-width": 4, "stroke-dasharray": "7 6" })
          : svgElement("rect", { x: x - 23, y: y - 23, width: 46, height: 46, rx: 10, fill: "none", stroke: "#c93b1f", "stroke-width": 4, "stroke-dasharray": "7 6" });
        elements.ionicLattice.append(outline, svgText(x, y + 5, "V", "#c93b1f", 15, 900));
      } else if (isCation) {
        elements.ionicLattice.append(
          svgElement("circle", { cx: x, cy: y, r: 23, fill: "#f05b4f", stroke: "#18375f", "stroke-width": 3 }),
          svgText(x, y + 6, "+", "#ffffff", 22, 900)
        );
      } else {
        elements.ionicLattice.append(
          svgElement("rect", { x: x - 23, y: y - 23, width: 46, height: 46, rx: 10, fill: "#43b978", stroke: "#18375f", "stroke-width": 3 }),
          svgText(x, y + 5, "−", "#ffffff", 22, 900)
        );
      }
    }
  }

  if (type === "frenkel") {
    const originX = 78 + 3 * 82;
    const originY = 58 + 1 * 74;
    const interstitialX = originX + 41;
    const interstitialY = originY + 37;
    elements.ionicLattice.append(
      svgElement("path", { d: `M${originX + 15} ${originY + 12} Q${originX + 34} ${originY + 3} ${interstitialX - 7} ${interstitialY - 18}`, fill: "none", stroke: "#c93b1f", "stroke-width": 4, "marker-end": "url(#ionic-arrow)" }),
      svgElement("circle", { cx: interstitialX, cy: interstitialY, r: 16, fill: "#ffd23f", stroke: "#18375f", "stroke-width": 3 }),
      svgText(interstitialX, interstitialY + 5, "+", "#18375f", 18, 900)
    );
  }

  elements.ionicTitle.textContent = definition.title;
  elements.ionicDesc.textContent = definition.description;
  elements.ionicCaption.textContent = definition.caption;
  elements.ionicVacancies.textContent = definition.vacancies;
  elements.ionicInterstitials.textContent = definition.interstitials;
  elements.ionicCharge.textContent = definition.charge;
  elements.ionicDensity.textContent = definition.density;
  updateLiveText(elements.ionicStatus, `${type === "perfect" ? "Perfect AB reference" : type === "schottky" ? "Schottky pair" : "Frenkel pair"} selected. ${definition.caption}`);
}

function setPressedButton(buttons, dataKey, selected) {
  buttons.forEach(button => button.setAttribute("aria-pressed", String(button.dataset[dataKey] === selected)));
}

function svgElement(name, attributes) {
  const node = document.createElementNS(SVG_NS, name);
  Object.entries(attributes).forEach(([key, value]) => node.setAttribute(key, String(value)));
  return node;
}

function svgText(x, y, content, fill, size, weight) {
  const node = svgElement("text", { x, y, fill, "font-size": size, "font-weight": weight, "text-anchor": "middle", "font-family": "system-ui, sans-serif" });
  node.textContent = content;
  return node;
}

function updateVoidSelection(announce) {
  updateVoidText(announce);
  if (state.rendererReady) {
    buildVoidScene();
    resetVoidView(false);
  }
}

function updateVoidText(announce) {
  const lattice = VOID_LATTICES[state.voidLattice];
  const site = state.voidMode === "host" ? null : lattice.sites[state.voidMode];

  elements.voidLatticeButtons.forEach(button => {
    button.setAttribute("aria-pressed", String(button.dataset.voidLattice === state.voidLattice));
  });
  elements.voidModeButtons.forEach(button => {
    button.setAttribute("aria-pressed", String(button.dataset.voidMode === state.voidMode));
  });
  elements.showPolyhedron.disabled = !state.rendererReady || !site;
  elements.atomSize.disabled = !state.rendererReady;
  elements.orthographic.disabled = !state.rendererReady;
  elements.resetView.disabled = !state.rendererReady;
  elements.showPolyhedron.checked = Boolean(site && state.showPolyhedron);
  elements.atomSizeOutput.value = `${Math.round(state.atomScale * 100)}%`;
  elements.atomSize.setAttribute("aria-valuetext", `${Math.round(state.atomScale * 100)}% of default display size`);
  elements.orthographic.checked = state.projection === "orthographic";

  elements.voidHostCount.textContent = `${lattice.hostVisible} visible images → ${lattice.hostEffective} effective atoms`;
  if (!site) {
    elements.voidKind.textContent = "Complete conventional cell";
    elements.voidTitle.textContent = `${lattice.label} host atoms`;
    elements.voidRatioBadge.textContent = `${lattice.hostEffective} effective atoms`;
    elements.voidSiteCount.textContent = "Not shown";
    elements.voidCount.textContent = "—";
    elements.voidCoordinate.textContent = "—";
    elements.voidCage.textContent = "—";
    elements.voidRadius.textContent = "—";
    elements.voidNote.textContent = `${lattice.hostDescription} Effective counts apply the usual sharing fractions.`;
  } else {
    const ratio = site.ratio.toFixed(3);
    elements.voidKind.textContent = `${site.label} interstitial sites`;
    elements.voidTitle.textContent = `${lattice.label}: all ${site.label} voids`;
    elements.voidRatioBadge.textContent = `r/R = ${ratio}`;
    elements.voidSiteCount.textContent = `${site.visible} visible markers → ${site.effective} effective sites`;
    elements.voidCount.textContent = String(site.perHost);
    elements.voidCoordinate.textContent = site.coordinate;
    elements.voidCage.textContent = site.cage;
    elements.voidRadius.textContent = `r/R = ${ratio}`;
    elements.voidNote.textContent = site.note;
  }

  const projectionLabel = state.projection === "orthographic" ? "orthographic" : "perspective";
  const cellLabel = state.voidLattice === "hcp" ? "conventional hexagonal prism" : "conventional cubic cell";
  const description = site
    ? `${lattice.label} ${cellLabel} with ${lattice.hostVisible} host-atom images and ${site.visible} visible ${site.label} void-centre markers, representing ${site.effective} effective sites. ${state.showPolyhedron ? "One translucent coordination polyhedron is shown for the representative marker." : "The coordination cage is hidden."} Host atoms are shown at ${Math.round(state.atomScale * 100)} percent display size. ${projectionLabel} projection.`
    : `${lattice.label} ${cellLabel} with all ${lattice.hostVisible} host-atom images and no void markers. Host atoms are shown at ${Math.round(state.atomScale * 100)} percent display size. ${projectionLabel} projection.`;
  elements.voidFrame.setAttribute("aria-label", description);
  if (state.rendererReady) elements.voidCanvas.setAttribute("aria-label", description);

  if (announce) {
    const prefix = state.rendererFailed ? "Facts updated for" : "Showing";
    setVoidStatus(site
      ? `${prefix} ${lattice.label} ${site.label} sites: ${site.visible} visible markers represent ${site.effective} effective sites.${state.showPolyhedron ? " One coordination polyhedron is shown." : ""}`
      : `${prefix} the complete ${lattice.label} host cell.`);
  }
}

async function initialiseThreeViewer() {
  try {
    THREE = await import("three");
    ({ OrbitControls } = await import("three/addons/controls/OrbitControls.js"));
    scene = new THREE.Scene();
    perspectiveCamera = new THREE.PerspectiveCamera(38, 1, 0.02, 120);
    orthographicCamera = new THREE.OrthographicCamera(-4, 4, 4, -4, 0.02, 120);
    camera = perspectiveCamera;
    renderer = new THREE.WebGLRenderer({
      canvas: elements.voidCanvas,
      alpha: true,
      antialias: true,
      powerPreference: "low-power"
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;

    controls = new OrbitControls(camera, elements.voidCanvas);
    elements.voidCanvas.style.touchAction = "pan-y pinch-zoom";
    controls.enablePan = false;
    controls.enableDamping = false;
    controls.minDistance = 4;
    controls.maxDistance = 40;
    controls.minZoom = 0.45;
    controls.maxZoom = 5;
    controls.addEventListener("change", renderThree);

    scene.add(new THREE.HemisphereLight(0xeaf2ff, 0x263858, 2.15));
    const keyLight = new THREE.DirectionalLight(0xffffff, 3.1);
    keyLight.position.set(4, 5, 6);
    scene.add(keyLight);
    const rimLight = new THREE.DirectionalLight(0xff9f7b, 1.35);
    rimLight.position.set(-5, 1, -4);
    scene.add(rimLight);

    state.rendererReady = true;
    state.rendererFailed = false;
    enableThreeControls(true);
    elements.voidCanvas.setAttribute("role", "img");
    elements.voidCanvas.setAttribute("aria-hidden", "false");
    elements.voidFallback.hidden = true;
    resizeThree();
    buildVoidScene();
    resetVoidView(false);
    updateVoidText(false);
    setVoidStatus(`Interactive ${VOID_LATTICES[state.voidLattice].label} host cell ready. Choose a void type to reveal every site marker.`);

    if (typeof ResizeObserver === "function") {
      resizeObserver = new ResizeObserver(resizeThree);
      resizeObserver.observe(elements.voidFrame);
    } else {
      window.addEventListener("resize", resizeThree);
    }

    elements.voidCanvas.addEventListener("webglcontextlost", handleContextLoss, { once: true });
  } catch (error) {
    console.error("Unable to initialise the interstitial-void viewer.", error);
    showThreeFailure("The 3D viewer could not load. Use the selector and numerical facts to continue the lesson.");
  }
}

function buildVoidScene() {
  disposeGroup(modelGroup);
  modelGroup = new THREE.Group();
  modelGroup.name = "void-model";
  scene.add(modelGroup);
  modelGroup.add(makeVoidCellFrame(state.voidLattice));

  const hostGeometry = new THREE.SphereGeometry(1, 34, 24);
  const voidGeometry = new THREE.SphereGeometry(1, 28, 20);
  const haloGeometry = new THREE.SphereGeometry(1, 12, 8);
  const hostMaterial = new THREE.MeshStandardMaterial({ color: 0x75c9f5, roughness: 0.24, metalness: 0.06 });
  const markerMaterial = new THREE.MeshStandardMaterial({ color: 0xffd23f, roughness: 0.32, metalness: 0.02 });
  const selectedMaterial = new THREE.MeshStandardMaterial({ color: 0xf06445, roughness: 0.25, metalness: 0.02 });
  const selectedHaloMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true, transparent: true, opacity: 0.9 });

  hostVoidCoordinates(state.voidLattice).forEach(coordinate => {
    addVoidSphere(modelGroup, coordinate, 0.34 * state.atomScale, hostMaterial, hostGeometry);
  });

  if (state.voidMode !== "host") {
    const representative = representativeVoidCoordinate(state.voidLattice, state.voidMode);
    closedVoidCoordinates(state.voidLattice, state.voidMode).forEach(coordinate => {
      const selected = state.showPolyhedron && voidCoordinateKey(coordinate) === voidCoordinateKey(representative);
      addVoidSphere(modelGroup, coordinate, selected ? 0.19 : 0.135, selected ? selectedMaterial : markerMaterial, voidGeometry);
      if (selected) addVoidSphere(modelGroup, coordinate, 0.255, selectedHaloMaterial, haloGeometry);
    });
    if (state.showPolyhedron) buildVoidCage(modelGroup, voidCageDefinition(state.voidLattice, state.voidMode), hostGeometry);
  }

  const box = new THREE.Box3().setFromObject(modelGroup);
  const sphere = box.getBoundingSphere(new THREE.Sphere());
  state.modelCenter = sphere.center.clone();
  state.modelRadius = Math.max(sphere.radius, 1);
  updateVoidText(false);
  renderThree();
}

function voidCoordinateKey(coordinate) {
  return coordinate.map(value => value.toFixed(8)).join(",");
}

function uniqueVoidCoordinates(coordinates) {
  const unique = new Map();
  coordinates.forEach(coordinate => unique.set(voidCoordinateKey(coordinate), coordinate));
  return [...unique.values()];
}

function voidCornerCoordinates() {
  const coordinates = [];
  [0, 1].forEach(x => [0, 1].forEach(y => [0, 1].forEach(z => coordinates.push([x, y, z]))));
  return coordinates;
}

function hcpAPlaneCoordinates() {
  const halfRootThree = Math.sqrt(3) / 2;
  return [
    [0, 0],
    [1, 0], [0.5, halfRootThree], [-0.5, halfRootThree],
    [-1, 0], [-0.5, -halfRootThree], [0.5, -halfRootThree]
  ];
}

function hcpBPlaneCoordinates() {
  const rootThreeSixth = Math.sqrt(3) / 6;
  return [[0.5, rootThreeSixth], [-0.5, rootThreeSixth], [0, -2 * rootThreeSixth]];
}

function hcpOctahedralPlaneCoordinates() {
  const rootThreeSixth = Math.sqrt(3) / 6;
  return [[0, 2 * rootThreeSixth], [0.5, -rootThreeSixth], [-0.5, -rootThreeSixth]];
}

function addHcpLayer(planarCoordinates, height) {
  return planarCoordinates.map(([x, y]) => [x, y, height]);
}

function hcpHostCoordinates() {
  return [
    ...addHcpLayer(hcpAPlaneCoordinates(), 0),
    ...addHcpLayer(hcpBPlaneCoordinates(), 0.5),
    ...addHcpLayer(hcpAPlaneCoordinates(), 1)
  ];
}

function hcpOctahedralCoordinates() {
  const plane = hcpOctahedralPlaneCoordinates();
  return [...addHcpLayer(plane, 0.25), ...addHcpLayer(plane, 0.75)];
}

function hcpTetrahedralCoordinates() {
  const aPlane = hcpAPlaneCoordinates();
  const bPlane = hcpBPlaneCoordinates();
  return [
    ...addHcpLayer(bPlane, 0.125),
    ...addHcpLayer(aPlane, 0.375),
    ...addHcpLayer(aPlane, 0.625),
    ...addHcpLayer(bPlane, 0.875)
  ];
}

function hostVoidCoordinates(lattice) {
  if (lattice === "hcp") return hcpHostCoordinates();
  const coordinates = voidCornerCoordinates();
  if (lattice === "bcc") {
    coordinates.push([0.5, 0.5, 0.5]);
    return coordinates;
  }
  for (let axis = 0; axis < 3; axis += 1) {
    [0, 1].forEach(side => {
      const coordinate = [0.5, 0.5, 0.5];
      coordinate[axis] = side;
      coordinates.push(coordinate);
    });
  }
  return coordinates;
}

function fccOctahedralCoordinates() {
  const coordinates = [[0.5, 0.5, 0.5]];
  for (let middleAxis = 0; middleAxis < 3; middleAxis += 1) {
    const otherAxes = [0, 1, 2].filter(axis => axis !== middleAxis);
    [0, 1].forEach(firstSide => [0, 1].forEach(secondSide => {
      const coordinate = [0, 0, 0];
      coordinate[middleAxis] = 0.5;
      coordinate[otherAxes[0]] = firstSide;
      coordinate[otherAxes[1]] = secondSide;
      coordinates.push(coordinate);
    }));
  }
  return uniqueVoidCoordinates(coordinates);
}

function fccTetrahedralCoordinates() {
  const coordinates = [];
  [0.25, 0.75].forEach(x => [0.25, 0.75].forEach(y => [0.25, 0.75].forEach(z => coordinates.push([x, y, z]))));
  return coordinates;
}

function bccOctahedralCoordinates() {
  const coordinates = [];
  for (let boundaryAxis = 0; boundaryAxis < 3; boundaryAxis += 1) {
    [0, 1].forEach(side => {
      const face = [0.5, 0.5, 0.5];
      face[boundaryAxis] = side;
      coordinates.push(face);
    });
  }
  for (let middleAxis = 0; middleAxis < 3; middleAxis += 1) {
    const otherAxes = [0, 1, 2].filter(axis => axis !== middleAxis);
    [0, 1].forEach(firstSide => [0, 1].forEach(secondSide => {
      const edge = [0, 0, 0];
      edge[middleAxis] = 0.5;
      edge[otherAxes[0]] = firstSide;
      edge[otherAxes[1]] = secondSide;
      coordinates.push(edge);
    }));
  }
  return uniqueVoidCoordinates(coordinates);
}

function bccTetrahedralCoordinates() {
  const coordinates = [];
  for (let boundaryAxis = 0; boundaryAxis < 3; boundaryAxis += 1) {
    [0, 1].forEach(side => {
      const remainingAxes = [0, 1, 2].filter(axis => axis !== boundaryAxis);
      remainingAxes.forEach(halfAxis => {
        const quarterAxis = remainingAxes.find(axis => axis !== halfAxis);
        [0.25, 0.75].forEach(quarter => {
          const coordinate = [0, 0, 0];
          coordinate[boundaryAxis] = side;
          coordinate[halfAxis] = 0.5;
          coordinate[quarterAxis] = quarter;
          coordinates.push(coordinate);
        });
      });
    });
  }
  return uniqueVoidCoordinates(coordinates);
}

function closedVoidCoordinates(lattice, mode) {
  if (mode === "host") return [];
  if (lattice === "hcp" && mode === "octahedral") return hcpOctahedralCoordinates();
  if (lattice === "hcp" && mode === "tetrahedral") return hcpTetrahedralCoordinates();
  if (lattice === "fcc" && mode === "octahedral") return fccOctahedralCoordinates();
  if (lattice === "fcc" && mode === "tetrahedral") return fccTetrahedralCoordinates();
  if (lattice === "bcc" && mode === "octahedral") return bccOctahedralCoordinates();
  return bccTetrahedralCoordinates();
}

function representativeVoidCoordinate(lattice, mode) {
  if (lattice === "hcp" && mode === "octahedral") return [0, Math.sqrt(3) / 3, 0.25];
  if (lattice === "hcp" && mode === "tetrahedral") return [0.5, Math.sqrt(3) / 6, 0.125];
  if (lattice === "fcc" && mode === "octahedral") return [0.5, 0.5, 0.5];
  if (lattice === "fcc" && mode === "tetrahedral") return [0.25, 0.25, 0.25];
  if (lattice === "bcc" && mode === "octahedral") return [0.5, 0.5, 0];
  return [0.5, 0.25, 0];
}

function tetrahedronFaces() {
  return [[0, 1, 2], [0, 1, 3], [0, 2, 3], [1, 2, 3]];
}

function tetrahedronEdges() {
  return [[0, 1], [0, 2], [0, 3], [1, 2], [1, 3], [2, 3]];
}

function bipyramidFaces() {
  const faces = [];
  for (let index = 0; index < 4; index += 1) {
    const first = 2 + index;
    const second = 2 + ((index + 1) % 4);
    faces.push([0, first, second], [1, second, first]);
  }
  return faces;
}

function bipyramidEdges() {
  const edges = [];
  for (let index = 0; index < 4; index += 1) {
    const first = 2 + index;
    const second = 2 + ((index + 1) % 4);
    edges.push([first, second], [0, first], [1, first]);
  }
  return edges;
}

function hcpFractionalToCoordinate([u, v, w]) {
  return [u - v / 2, v * Math.sqrt(3) / 2, w];
}

function hcpMetricCoordinate([x, y, w]) {
  return [x, y, w * HCP_C_OVER_A];
}

function subtractCoordinates(first, second) {
  return [first[0] - second[0], first[1] - second[1], first[2] - second[2]];
}

function crossCoordinates(first, second) {
  return [
    first[1] * second[2] - first[2] * second[1],
    first[2] * second[0] - first[0] * second[2],
    first[0] * second[1] - first[1] * second[0]
  ];
}

function dotCoordinates(first, second) {
  return first[0] * second[0] + first[1] * second[1] + first[2] * second[2];
}

function convexTriangularFaces(coordinates) {
  const metric = coordinates.map(hcpMetricCoordinate);
  const faces = [];
  for (let first = 0; first < metric.length - 2; first += 1) {
    for (let second = first + 1; second < metric.length - 1; second += 1) {
      for (let third = second + 1; third < metric.length; third += 1) {
        const normal = crossCoordinates(
          subtractCoordinates(metric[second], metric[first]),
          subtractCoordinates(metric[third], metric[first])
        );
        if (dotCoordinates(normal, normal) < 1e-12) continue;
        let positive = false;
        let negative = false;
        metric.forEach((point, index) => {
          if (index === first || index === second || index === third) return;
          const side = dotCoordinates(normal, subtractCoordinates(point, metric[first]));
          if (side > 1e-8) positive = true;
          if (side < -1e-8) negative = true;
        });
        if (!(positive && negative)) faces.push([first, second, third]);
      }
    }
  }
  return faces;
}

function edgesFromFaces(faces) {
  const edges = new Map();
  faces.forEach(face => {
    for (let index = 0; index < face.length; index += 1) {
      const first = face[index];
      const second = face[(index + 1) % face.length];
      const key = [Math.min(first, second), Math.max(first, second)].join("-");
      edges.set(key, [Math.min(first, second), Math.max(first, second)]);
    }
  });
  return [...edges.values()];
}

function hcpCageDefinition(mode) {
  const siteFractional = mode === "octahedral" ? [1 / 3, 2 / 3, 0.25] : [2 / 3, 1 / 3, 0.125];
  const siteMetric = hcpMetricCoordinate(hcpFractionalToCoordinate(siteFractional));
  const hostBasis = [[0, 0, 0], [2 / 3, 1 / 3, 0.5]];
  const candidates = [];
  for (let uShift = -2; uShift <= 2; uShift += 1) {
    for (let vShift = -2; vShift <= 2; vShift += 1) {
      for (let wShift = -1; wShift <= 1; wShift += 1) {
        hostBasis.forEach(([u, v, w]) => {
          const coordinate = hcpFractionalToCoordinate([u + uShift, v + vShift, w + wShift]);
          const metric = hcpMetricCoordinate(coordinate);
          const offset = subtractCoordinates(metric, siteMetric);
          candidates.push({ coordinate, distanceSquared: dotCoordinates(offset, offset) });
        });
      }
    }
  }
  candidates.sort((first, second) => first.distanceSquared - second.distanceSquared);
  const count = mode === "octahedral" ? 6 : 4;
  const vertices = candidates.slice(0, count).map(candidate => candidate.coordinate);
  const faces = convexTriangularFaces(vertices);
  return { vertices, faces, edges: edgesFromFaces(faces) };
}

function voidCageDefinition(lattice, mode) {
  if (lattice === "hcp") return hcpCageDefinition(mode);
  if (lattice === "fcc" && mode === "octahedral") {
    return {
      vertices: [[0.5, 0.5, 0], [0.5, 0.5, 1], [0, 0.5, 0.5], [0.5, 0, 0.5], [1, 0.5, 0.5], [0.5, 1, 0.5]],
      faces: bipyramidFaces(), edges: bipyramidEdges()
    };
  }
  if (lattice === "fcc" && mode === "tetrahedral") {
    return {
      vertices: [[0, 0, 0], [0, 0.5, 0.5], [0.5, 0, 0.5], [0.5, 0.5, 0]],
      faces: tetrahedronFaces(), edges: tetrahedronEdges()
    };
  }
  if (lattice === "bcc" && mode === "octahedral") {
    return {
      vertices: [[0.5, 0.5, -0.5], [0.5, 0.5, 0.5], [0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0]],
      faces: bipyramidFaces(), edges: bipyramidEdges()
    };
  }
  return {
    vertices: [[0, 0, 0], [1, 0, 0], [0.5, 0.5, -0.5], [0.5, 0.5, 0.5]],
    faces: tetrahedronFaces(), edges: tetrahedronEdges()
  };
}

function assertVoidGeometry() {
  const countChecks = [
    ["FCC host images", hostVoidCoordinates("fcc").length, 14],
    ["BCC host images", hostVoidCoordinates("bcc").length, 9],
    ["HCP host images", hostVoidCoordinates("hcp").length, 17],
    ["FCC octahedral markers", closedVoidCoordinates("fcc", "octahedral").length, 13],
    ["FCC tetrahedral markers", closedVoidCoordinates("fcc", "tetrahedral").length, 8],
    ["BCC octahedral markers", closedVoidCoordinates("bcc", "octahedral").length, 18],
    ["BCC tetrahedral markers", closedVoidCoordinates("bcc", "tetrahedral").length, 24],
    ["HCP octahedral markers", closedVoidCoordinates("hcp", "octahedral").length, 6],
    ["HCP tetrahedral markers", closedVoidCoordinates("hcp", "tetrahedral").length, 20]
  ];
  countChecks.forEach(([label, actual, expected]) => {
    console.assert(actual === expected, `${label}: expected ${expected}, received ${actual}.`);
  });

  [
    ["fcc", "octahedral", 6, 12, 8],
    ["fcc", "tetrahedral", 4, 6, 4],
    ["bcc", "octahedral", 6, 12, 8],
    ["bcc", "tetrahedral", 4, 6, 4],
    ["hcp", "octahedral", 6, 12, 8],
    ["hcp", "tetrahedral", 4, 6, 4]
  ].forEach(([lattice, mode, vertexCount, edgeCount, faceCount]) => {
    const cage = voidCageDefinition(lattice, mode);
    const edgeKeys = new Set(cage.edges.map(([first, second]) => [Math.min(first, second), Math.max(first, second)].join("-")));
    console.assert(cage.vertices.length === vertexCount, `${lattice} ${mode} cage vertex count is incorrect.`);
    console.assert(edgeKeys.size === edgeCount, `${lattice} ${mode} cage edge count is incorrect.`);
    console.assert(cage.faces.length === faceCount, `${lattice} ${mode} cage face count is incorrect.`);
    console.assert(vertexCount - edgeKeys.size + cage.faces.length === 2, `${lattice} ${mode} cage fails Euler's relation.`);
    if (mode === "octahedral" && lattice !== "hcp") {
      console.assert(!edgeKeys.has("0-1"), `${lattice} octahedral cage must not connect opposite poles.`);
      console.assert(!edgeKeys.has("2-4") && !edgeKeys.has("3-5"), `${lattice} octahedral cage must not contain equatorial diagonals.`);
    }
  });
}

function voidCoordinateToScene(coordinate, lattice = state.voidLattice) {
  if (lattice === "hcp") {
    const basalScale = VOID_CELL_SIZE / 2;
    return new THREE.Vector3(
      coordinate[0] * basalScale,
      (coordinate[2] - 0.5) * HCP_C_OVER_A * basalScale,
      coordinate[1] * basalScale
    );
  }
  return new THREE.Vector3(
    (coordinate[0] - 0.5) * VOID_CELL_SIZE,
    (coordinate[1] - 0.5) * VOID_CELL_SIZE,
    (coordinate[2] - 0.5) * VOID_CELL_SIZE
  );
}

function addVoidSphere(group, coordinate, radius, material, geometry) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.copy(voidCoordinateToScene(coordinate));
  mesh.scale.setScalar(radius);
  group.add(mesh);
  return mesh;
}

function makeVoidCellFrame(lattice) {
  const segments = [];
  if (lattice === "hcp") {
    const ring = hcpAPlaneCoordinates().slice(1);
    const bottom = ring.map(([x, y]) => voidCoordinateToScene([x, y, 0], lattice));
    const top = ring.map(([x, y]) => voidCoordinateToScene([x, y, 1], lattice));
    for (let index = 0; index < ring.length; index += 1) {
      const next = (index + 1) % ring.length;
      segments.push([bottom[index], bottom[next]], [top[index], top[next]], [bottom[index], top[index]]);
    }
  } else {
    const corners = voidCornerCoordinates().map(coordinate => voidCoordinateToScene(coordinate, lattice));
    const cornerIndex = (x, y, z) => x * 4 + y * 2 + z;
    for (let axis = 0; axis < 3; axis += 1) {
      [0, 1].forEach(first => [0, 1].forEach(second => {
        const start = [0, 0, 0];
        const end = [0, 0, 0];
        const otherAxes = [0, 1, 2].filter(value => value !== axis);
        start[otherAxes[0]] = first;
        start[otherAxes[1]] = second;
        end[otherAxes[0]] = first;
        end[otherAxes[1]] = second;
        end[axis] = 1;
        segments.push([corners[cornerIndex(...start)], corners[cornerIndex(...end)]]);
      }));
    }
  }
  const positions = [];
  segments.forEach(([start, end]) => positions.push(...start.toArray(), ...end.toArray()));
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  return new THREE.LineSegments(geometry, new THREE.LineBasicMaterial({ color: 0xe9f4ff, transparent: true, opacity: 0.78 }));
}

function buildVoidCage(group, definition, sphereGeometry) {
  const vertices = definition.vertices.map(coordinate => voidCoordinateToScene(coordinate));
  const facePositions = [];
  definition.faces.forEach(face => face.forEach(index => facePositions.push(...vertices[index].toArray())));
  const faceGeometry = new THREE.BufferGeometry();
  faceGeometry.setAttribute("position", new THREE.Float32BufferAttribute(facePositions, 3));
  faceGeometry.computeVertexNormals();
  group.add(new THREE.Mesh(faceGeometry, new THREE.MeshBasicMaterial({
    color: 0x64f1d0, transparent: true, opacity: 0.17, side: THREE.DoubleSide, depthWrite: false
  })));

  const edgePositions = [];
  definition.edges.forEach(([startIndex, endIndex]) => edgePositions.push(...vertices[startIndex].toArray(), ...vertices[endIndex].toArray()));
  const edgeGeometry = new THREE.BufferGeometry();
  edgeGeometry.setAttribute("position", new THREE.Float32BufferAttribute(edgePositions, 3));
  group.add(new THREE.LineSegments(edgeGeometry, new THREE.LineBasicMaterial({ color: 0xbaffef, transparent: true, opacity: 0.95 })));

  const ghostMaterial = new THREE.MeshStandardMaterial({ color: 0x75c9f5, transparent: true, opacity: 0.28, depthWrite: false, roughness: 0.3 });
  const visibleHostKeys = new Set(hostVoidCoordinates(state.voidLattice).map(voidCoordinateKey));
  definition.vertices.filter(coordinate => !visibleHostKeys.has(voidCoordinateKey(coordinate)))
    .forEach(coordinate => addVoidSphere(group, coordinate, 0.31 * state.atomScale, ghostMaterial, sphereGeometry));
}

function resetVoidView(announce) {
  if (!state.rendererReady || !state.modelCenter) return;
  const aspect = Math.max(0.1, elements.voidFrame.clientWidth / Math.max(1, elements.voidFrame.clientHeight));
  const direction = new THREE.Vector3(1, 1, 1).normalize();
  const radius = state.modelRadius;
  controls.target.copy(state.modelCenter);

  if (state.projection === "orthographic") {
    camera = orthographicCamera;
    configureOrthographicCamera(aspect, radius * 1.22 / Math.min(1, aspect));
    camera.zoom = 1;
    camera.position.copy(state.modelCenter).add(direction.multiplyScalar(radius * 3.4));
  } else {
    camera = perspectiveCamera;
    const verticalTangent = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const limitingTangent = Math.max(0.12, Math.min(verticalTangent, verticalTangent * aspect));
    const distance = radius / limitingTangent * 1.2;
    camera.position.copy(state.modelCenter).add(direction.multiplyScalar(distance));
    camera.aspect = aspect;
    camera.near = Math.max(0.02, distance - radius * 2.2);
    camera.far = distance + radius * 4.5;
  }
  camera.up.set(0, 1, 0);
  camera.updateProjectionMatrix();
  controls.object = camera;
  controls.update();
  renderThree();
  if (announce) setVoidStatus(`${state.projection === "orthographic" ? "Orthographic" : "Perspective"} view reset.`);
}

function configureOrthographicCamera(aspect, halfHeight) {
  orthographicCamera.left = -halfHeight * aspect;
  orthographicCamera.right = halfHeight * aspect;
  orthographicCamera.top = halfHeight;
  orthographicCamera.bottom = -halfHeight;
  orthographicCamera.near = 0.02;
  orthographicCamera.far = Math.max(60, state.modelRadius * 12);
  orthographicCamera.updateProjectionMatrix();
}

function switchVoidProjection(useOrthographic, announce) {
  if (!state.rendererReady || !state.modelCenter) return;
  const previousCamera = camera;
  const target = controls.target.clone();
  const direction = previousCamera.position.clone().sub(target).normalize();
  const aspect = Math.max(0.1, elements.voidFrame.clientWidth / Math.max(1, elements.voidFrame.clientHeight));
  let visibleHalfHeight;

  if (previousCamera.isOrthographicCamera) {
    visibleHalfHeight = (previousCamera.top - previousCamera.bottom) / (2 * previousCamera.zoom);
  } else {
    visibleHalfHeight = previousCamera.position.distanceTo(target) * Math.tan(THREE.MathUtils.degToRad(previousCamera.fov / 2));
  }

  state.projection = useOrthographic ? "orthographic" : "perspective";
  if (useOrthographic) {
    camera = orthographicCamera;
    configureOrthographicCamera(aspect, visibleHalfHeight);
    camera.zoom = 1;
    camera.position.copy(target).add(direction.multiplyScalar(state.modelRadius * 3.4));
  } else {
    camera = perspectiveCamera;
    const distance = visibleHalfHeight / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    camera.position.copy(target).add(direction.multiplyScalar(distance));
    camera.aspect = aspect;
    camera.near = Math.max(0.02, distance - state.modelRadius * 2.2);
    camera.far = distance + state.modelRadius * 4.5;
  }
  camera.up.copy(previousCamera.up);
  camera.updateProjectionMatrix();
  controls.object = camera;
  controls.target.copy(target);
  controls.update();
  elements.orthographic.checked = useOrthographic;
  updateVoidText(false);
  renderThree();
  if (announce) setVoidStatus(`${useOrthographic ? "Orthographic" : "Perspective"} projection selected.`);
}

function resizeThree() {
  if (!state.rendererReady || !renderer || !camera) return;
  const width = Math.max(1, elements.voidFrame.clientWidth);
  const height = Math.max(1, elements.voidFrame.clientHeight);
  const aspect = width / height;
  renderer.setSize(width, height, false);
  perspectiveCamera.aspect = aspect;
  perspectiveCamera.updateProjectionMatrix();
  if (state.projection === "orthographic") {
    const baseHalfHeight = (orthographicCamera.top - orthographicCamera.bottom) / 2;
    configureOrthographicCamera(aspect, baseHalfHeight);
  }
  renderThree();
}

function renderThree() {
  if (state.rendererReady && renderer && scene && camera) renderer.render(scene, camera);
}

function disposeGroup(group) {
  if (!group || !scene) return;
  scene.remove(group);
  const geometries = new Set();
  const materials = new Set();
  group.traverse(object => {
    if (object.geometry) geometries.add(object.geometry);
    if (Array.isArray(object.material)) object.material.forEach(material => materials.add(material));
    else if (object.material) materials.add(object.material);
  });
  geometries.forEach(geometry => geometry.dispose());
  materials.forEach(material => material.dispose());
}

function handleContextLoss(event) {
  event.preventDefault();
  state.rendererReady = false;
  showThreeFailure("The 3D context was lost. Reload this page to restore the model; the facts remain available.");
}

function showThreeFailure(message) {
  state.rendererReady = false;
  state.rendererFailed = true;
  enableThreeControls(false);
  elements.voidCanvas.setAttribute("aria-hidden", "true");
  elements.voidCanvas.removeAttribute("role");
  const fallbackGraphic = elements.voidFallback.querySelector("svg");
  if (fallbackGraphic) fallbackGraphic.hidden = true;
  elements.voidFallback.hidden = false;
  const strong = elements.voidFallback.querySelector("strong");
  const detail = elements.voidFallback.querySelector("span");
  if (strong) strong.textContent = "Three-dimensional view unavailable";
  if (detail) detail.textContent = message;
  setVoidStatus(message);
}

function enableThreeControls(enabled) {
  elements.orthographic.disabled = !enabled;
  elements.resetView.disabled = !enabled;
  elements.atomSize.disabled = !enabled;
  elements.showPolyhedron.disabled = !enabled || state.voidMode === "host";
}

function setVoidStatus(message) {
  if (elements.voidStatus.textContent !== message) elements.voidStatus.textContent = message;
}

function updateGrainBoundary() {
  const angle = Number(elements.grainAngle.value);
  elements.grainAngleOutput.textContent = `${angle}°`;

  if (angle === 0) {
    elements.grainClass.textContent = "Single crystal reference";
    elements.grainSpacing.textContent = "Not applicable";
    elements.grainExplanation.textContent = "With no misorientation, the two regions share one continuous lattice orientation.";
  } else if (angle <= 15) {
    const spacing = 1 / (2 * Math.sin((angle * Math.PI / 180) / 2));
    elements.grainClass.textContent = "Low-angle tilt boundary";
    elements.grainSpacing.textContent = `D/b ≈ ${spacing.toFixed(2)}`;
    elements.grainExplanation.textContent = "At small angles, an ideal tilt boundary can be approximated as a spaced array of edge dislocations.";
  } else {
    elements.grainClass.textContent = "High-angle boundary";
    elements.grainSpacing.textContent = "Discrete-array model not used";
    elements.grainExplanation.textContent = "Dislocation cores overlap and the simple isolated-array description is no longer adequate.";
  }

  const canvasLabel = angle === 0
    ? "A continuous single-crystal lattice with zero misorientation"
    : `Two grains separated by a ${angle} degree symmetric tilt boundary`;
  elements.grainCanvas.setAttribute("aria-label", canvasLabel);

  if (!drawGrainBoundary(angle)) {
    elements.grainAngle.disabled = true;
    elements.grainClass.textContent = "Visualization unavailable";
    elements.grainSpacing.textContent = "Not available";
    elements.grainExplanation.textContent = "The grain-boundary drawing could not be created in this browser. The misorientation explanation above remains available.";
    elements.grainCanvas.setAttribute("aria-label", "Grain-boundary visualization unavailable because the two-dimensional drawing context could not be created.");
    updateLiveText(elements.grainStatus, "The grain-boundary visualization is unavailable in this browser.");
  }
}

function announceGrainBoundary() {
  const angle = Number(elements.grainAngle.value);
  updateLiveText(elements.grainStatus, `Misorientation is ${angle} degrees; ${elements.grainClass.textContent.toLowerCase()}. ${elements.grainSpacing.textContent}.`);
}

function drawGrainBoundary(angle) {
  const { context, width, height } = prepareCanvas(elements.grainCanvas);
  if (!context) return false;
  const colors = canvasColors();
  context.clearRect(0, 0, width, height);
  context.fillStyle = "#f8f7fc";
  context.fillRect(0, 0, width, height);

  if (angle === 0) {
    context.fillStyle = "rgba(56, 102, 148, 0.08)";
    context.fillRect(0, 0, width, height);
    drawRotatedLattice(context, 0, width, height, 0, colors.navy);
    drawOrientationArrow(context, width / 2, 34, 0, "Single orientation", colors.blue);
    return true;
  }

  context.fillStyle = "rgba(56, 102, 148, 0.08)";
  context.fillRect(0, 0, width / 2, height);
  context.fillStyle = "rgba(103, 87, 168, 0.09)";
  context.fillRect(width / 2, 0, width / 2, height);

  drawRotatedLattice(context, 0, width / 2, height, -angle / 2, colors.navy);
  drawRotatedLattice(context, width / 2, width, height, angle / 2, colors.navy);

  context.strokeStyle = colors.coral;
  context.lineWidth = Math.max(2, width / 300);
  context.beginPath();
  context.moveTo(width / 2, 0);
  context.lineTo(width / 2, height);
  context.stroke();

  if (angle > 0 && angle <= 15) {
    const normalizedSpacing = 1 / (2 * Math.sin((angle * Math.PI / 180) / 2));
    const pixelSpacing = Math.max(24, Math.min(height * 0.72, normalizedSpacing * 8));
    for (let y = pixelSpacing / 2; y < height; y += pixelSpacing) drawDislocationSymbol(context, width / 2, y, colors.coral);
  }

  drawOrientationArrow(context, width * 0.23, 34, -angle / 2, "Grain A", colors.blue);
  drawOrientationArrow(context, width * 0.77, 34, angle / 2, "Grain B", colors.lavender);
  return true;
}

function drawRotatedLattice(context, clipLeft, clipRight, height, angleDegrees, color) {
  const centreX = (clipLeft + clipRight) / 2;
  const centreY = height / 2;
  const angle = angleDegrees * Math.PI / 180;
  const cosine = Math.cos(angle);
  const sine = Math.sin(angle);
  const spacing = Math.max(19, Math.min(30, (clipRight - clipLeft) / 12));

  context.save();
  context.beginPath();
  context.rect(clipLeft + 2, 0, clipRight - clipLeft - 4, height);
  context.clip();
  context.fillStyle = color;

  const span = Math.hypot(clipRight - clipLeft, height) + spacing * 3;
  for (let row = -Math.ceil(span / spacing); row <= Math.ceil(span / spacing); row += 1) {
    for (let column = -Math.ceil(span / spacing); column <= Math.ceil(span / spacing); column += 1) {
      const baseX = column * spacing + (row % 2) * spacing / 2;
      const baseY = row * spacing * Math.sqrt(3) / 2;
      const x = centreX + baseX * cosine - baseY * sine;
      const y = centreY + baseX * sine + baseY * cosine;
      if (x > clipLeft - spacing && x < clipRight + spacing && y > -spacing && y < height + spacing) {
        context.beginPath();
        context.arc(x, y, Math.max(2.5, spacing * 0.13), 0, Math.PI * 2);
        context.fill();
      }
    }
  }
  context.restore();
}

function drawDislocationSymbol(context, x, y, color) {
  context.save();
  context.translate(x, y);
  context.strokeStyle = color;
  context.fillStyle = "#ffffff";
  context.lineWidth = 2.5;
  context.beginPath();
  context.arc(0, 0, 8, 0, Math.PI * 2);
  context.fill();
  context.stroke();
  context.beginPath();
  context.moveTo(-5, 0);
  context.lineTo(5, 0);
  context.moveTo(0, -5);
  context.lineTo(0, 5);
  context.stroke();
  context.restore();
}

function drawOrientationArrow(context, x, y, angleDegrees, label, color) {
  const angle = angleDegrees * Math.PI / 180;
  const length = 34;
  context.save();
  context.translate(x, y);
  context.rotate(angle);
  context.strokeStyle = color;
  context.fillStyle = color;
  context.lineWidth = 3;
  context.beginPath();
  context.moveTo(-length / 2, 0);
  context.lineTo(length / 2, 0);
  context.lineTo(length / 2 - 8, -5);
  context.moveTo(length / 2, 0);
  context.lineTo(length / 2 - 8, 5);
  context.stroke();
  context.restore();
  context.fillStyle = color;
  context.font = "700 14px system-ui, sans-serif";
  context.textAlign = "center";
  context.fillText(label, x, y + 25);
}

function randomAstmSeed(previousSeed) {
  let nextSeed;
  if (globalThis.crypto?.getRandomValues) {
    const values = new Uint32Array(1);
    globalThis.crypto.getRandomValues(values);
    nextSeed = values[0];
  } else {
    nextSeed = Math.floor(Math.random() * 0x100000000) >>> 0;
  }
  if (previousSeed !== undefined && nextSeed === previousSeed) nextSeed = (nextSeed + 1) >>> 0;
  return nextSeed;
}

function generateRandomAstmField(announce) {
  astmState.seed = randomAstmSeed(astmState.seed);
  astmState.grainDensity = Number(elements.astmGrainCount.value);
  astmGrainFieldCache.clear();
  renderAstmExperiment(announce);
}

function astmViewport() {
  return {
    x: 0,
    y: 0,
    width: ASTM_MASTER_ASPECT,
    height: 1
  };
}

function astmOneInchSquare() {
  return {
    x: (ASTM_MASTER_ASPECT - ASTM_ONE_INCH_SIDE) / 2,
    y: (1 - ASTM_ONE_INCH_SIDE) / 2,
    size: ASTM_ONE_INCH_SIDE
  };
}

function astmTestLine() {
  const box = astmOneInchSquare();
  return {
    start: { x: box.x, y: box.y + box.size / 2 },
    end: { x: box.x + box.size, y: box.y + box.size / 2 }
  };
}

function setAstmMeasurementVisible(visible) {
  astmState.measured = Boolean(visible);
  elements.astmMeasure.setAttribute("aria-pressed", String(astmState.measured));
  elements.astmCanvas.dataset.measurementVisible = String(astmState.measured);
}

function clearAstmResults() {
  elements.astmImageLength.textContent = "Not placed";
  elements.astmIntersections.textContent = "Not measured";
  elements.astmSpecimenLength.textContent = "—";
  elements.astmIntercept.textContent = "—";
  elements.astmNumber.textContent = "—";
  elements.astmReferenceDensity.textContent = "—";
}

function renderAstmExperiment(announce = true, fieldUpdate = "new") {
  const drawing = drawAstmField();
  const grainDensity = astmState.grainDensity;
  const siteCount = drawing?.field.siteCount ?? astmSiteCountForDensity(grainDensity);
  const densityLabel = `${grainDensity} ${grainDensity === 1 ? "site" : "sites"}`;
  elements.astmCanvas.dataset.fieldId = String(astmState.seed);
  elements.astmCanvas.dataset.grainDensity = String(grainDensity);
  elements.astmCanvas.dataset.siteCount = String(siteCount);
  elements.astmCanvas.dataset.fieldAreaIn2 = String(ASTM_FIELD_AREA_IN2);
  elements.astmCanvas.dataset.measurementVisible = String(astmState.measured);
  elements.astmCanvas.dataset.validationRetries = String(drawing?.field.retryCount ?? 0);

  if (!drawing) {
    setAstmMeasurementVisible(false);
    elements.astmMeasure.disabled = true;
    elements.astmImageLength.textContent = "Unavailable";
    elements.astmIntersections.textContent = "Unavailable";
    elements.astmSpecimenLength.textContent = "—";
    elements.astmIntercept.textContent = "—";
    elements.astmNumber.textContent = "—";
    elements.astmReferenceDensity.textContent = "—";
    elements.astmCanvas.setAttribute("aria-label", "Grain field unavailable; no boundary intersections were measured.");
    elements.astmFigureCaption.textContent = "The grain field could not be drawn, so no line intersections were measured.";
    updateLiveText(elements.astmStatus, "The displayed grain field could not be measured.");
    return;
  }

  elements.astmMeasure.disabled = false;
  elements.astmCanvas.dataset.boundaryCount = String(drawing.field.edges.length);
  const fieldWasRetried = drawing.field.retryCount > 0;
  const validationNote = drawing.field.retryCount
    ? ` A numerically ambiguous random draw was replaced after ${drawing.field.retryCount} ${drawing.field.retryCount === 1 ? "retry" : "retries"}.`
    : "";
  if (!astmState.measured) {
    clearAstmResults();
    elements.astmCanvas.setAttribute("aria-label", `Periodic synthetic grain field at 100 times magnification. The target density is ${densityLabel} per square inch, giving ${siteCount} base generator dots across the 2 square inch rectangular repeat box. A centred dashed square marks 1 square inch; no measurement line is present.`);
    elements.astmFigureCaption.innerHTML = `The full rectangle is a <strong>2.00 in&sup2; periodic repeat box</strong>. A target of <strong>${grainDensity} ${grainDensity === 1 ? "site" : "sites"}/in&sup2;</strong> gives ${siteCount} base generator dots. The dashed square is the visible 1 in&sup2; reference, not a grain boundary. Toggle <strong>1-inch measurement line</strong> to measure.`;
    if (announce) {
      let message = `A new periodic field at ${densityLabel} per square inch contains ${siteCount} base generator dots across 2 square inches. The measurement line is hidden.`;
      if (fieldWasRetried) {
        message = `A validated replacement field at ${densityLabel} per square inch contains ${siteCount} base generator dots across 2 square inches. The measurement line is hidden.`;
      } else if (fieldUpdate === "preserved") {
        message = `The same seeded sequence at ${densityLabel} per square inch now contains ${siteCount} base generator dots across 2 square inches. The measurement line is hidden.`;
      } else if (fieldUpdate === "hidden") {
        message = "The one-inch measurement line is hidden. The periodic grain field is unchanged.";
      }
      updateLiveText(elements.astmStatus, `${message}${validationNote}`);
    }
    return;
  }

  const intersectionCount = drawing.measurement.intersections.length;
  const crossingLabel = `${intersectionCount} ${intersectionCount === 1 ? "crossing" : "crossings"}`;
  const specimenLengthMm = ASTM_IMAGE_LINE_LENGTH_MM / ASTM_MAGNIFICATION;
  const measuredFieldSummary = `a target density of ${grainDensity} ${grainDensity === 1 ? "site" : "sites"} per square inch and ${siteCount} base generator dots across 2 square inches`;
  const measuredUpdateLead = fieldWasRetried
    ? `A validated replacement distribution uses ${measuredFieldSummary}.`
    : fieldUpdate === "new"
      ? `A new distribution uses ${measuredFieldSummary}.`
      : fieldUpdate === "preserved"
        ? `The same seeded sequence now uses ${measuredFieldSummary}.`
        : `The current field uses ${measuredFieldSummary}.`;
  elements.astmImageLength.textContent = "1.00 in (25.4 mm)";
  elements.astmIntersections.textContent = String(intersectionCount);
  elements.astmSpecimenLength.textContent = `${formatNumber(specimenLengthMm, 3)} mm`;

  if (intersectionCount === 0) {
    elements.astmIntercept.textContent = "Not estimable";
    elements.astmNumber.textContent = "Not estimable";
    elements.astmReferenceDensity.textContent = "Not estimable";
    elements.astmCanvas.setAttribute("aria-label", `Periodic 2 square inch grain field at a target density of ${densityLabel} per square inch with ${siteCount} base generator dots. The one-inch image line has no boundary crossings between different base grains.`);
    elements.astmFigureCaption.innerHTML = `At <strong>${grainDensity} ${grainDensity === 1 ? "site" : "sites"}/in&sup2;</strong>, this 2.00 in&sup2; field contains ${siteCount} base generator dots. The one-inch image line has <strong>no boundary crossings</strong> between different base grains. The outer frame and dashed reference square are not grain boundaries.`;
    if (announce) updateLiveText(elements.astmStatus, `${measuredUpdateLead} No grain boundary crosses the line. Choose a higher generator density or create a new distribution.${validationNote}`);
    return;
  }

  const meanInterceptMm = specimenLengthMm / intersectionCount;
  const grainNumber = -6.643856 * Math.log10(meanInterceptMm) - 3.288;
  const n100 = 2 ** (grainNumber - 1);
  elements.astmIntercept.textContent = `${formatNumber(meanInterceptMm * 1000, 2)} µm`;
  elements.astmNumber.textContent = `G = ${formatNumber(grainNumber, 2)}`;
  elements.astmReferenceDensity.textContent = `${formatScientific(n100)} grains/in² at 100×`;
  elements.astmCanvas.setAttribute("aria-label", `Periodic 2 square inch grain field at a target density of ${densityLabel} per square inch with ${siteCount} base generator dots. A one-inch image line has ${crossingLabel} with boundaries between different base grains; every crossing is circled. The estimated ASTM grain size number is ${grainNumber.toFixed(2)}.`);
  elements.astmFigureCaption.innerHTML = `At <strong>${grainDensity} ${grainDensity === 1 ? "site" : "sites"}/in&sup2;</strong>, this 2.00 in&sup2; field contains ${siteCount} base generator dots. The coral one-inch segment has <strong>${intersectionCount}</strong> circled ${intersectionCount === 1 ? "boundary" : "boundaries"} between different base grains; these are the P<sub>T</sub> used in the estimate. The rectangle repeats periodically at all four edges.`;
  if (announce) updateLiveText(elements.astmStatus, `${measuredUpdateLead} The one-inch line has ${crossingLabel} highlighted, giving ASTM grain size number ${grainNumber.toFixed(2)} and mean lineal intercept ${formatNumber(meanInterceptMm * 1000, 2)} micrometres.${validationNote}`);
}

function seededRandom(seed) {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let result = value;
    result = Math.imul(result ^ (result >>> 15), result | 1);
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}

function clipGrainCell(polygon, site, other) {
  if (!polygon.length) return polygon;
  const normalX = other.x - site.x;
  const normalY = other.y - site.y;
  const squaredDistance = normalX * normalX + normalY * normalY;
  if (squaredDistance < 1e-14) return polygon;
  const limit = (other.x * other.x + other.y * other.y - site.x * site.x - site.y * site.y) / 2;
  const signedDistance = point => normalX * point.x + normalY * point.y - limit;
  const clipped = [];
  let previous = polygon[polygon.length - 1];
  let previousDistance = signedDistance(previous);
  let previousInside = previousDistance <= 1e-10;

  polygon.forEach(current => {
    const currentDistance = signedDistance(current);
    const currentInside = currentDistance <= 1e-10;
    if (currentInside !== previousInside) {
      const denominator = previousDistance - currentDistance;
      const interpolation = Math.abs(denominator) < 1e-14 ? 0.5 : previousDistance / denominator;
      clipped.push({
        x: previous.x + (current.x - previous.x) * interpolation,
        y: previous.y + (current.y - previous.y) * interpolation
      });
    }
    if (currentInside) clipped.push(current);
    previous = current;
    previousDistance = currentDistance;
    previousInside = currentInside;
  });
  return clipped;
}

function astmSiteCountForDensity(grainDensity) {
  return Math.max(1, Math.round(Number(grainDensity) * ASTM_FIELD_AREA_IN2));
}

function clipPolygonAtAxis(polygon, axis, limit, keepGreater) {
  if (!polygon.length) return polygon;
  const clipped = [];
  let previous = polygon[polygon.length - 1];
  let previousValue = previous[axis];
  let previousInside = keepGreater ? previousValue >= limit - 1e-10 : previousValue <= limit + 1e-10;

  polygon.forEach(current => {
    const currentValue = current[axis];
    const currentInside = keepGreater ? currentValue >= limit - 1e-10 : currentValue <= limit + 1e-10;
    if (currentInside !== previousInside) {
      const denominator = currentValue - previousValue;
      const fraction = Math.abs(denominator) < 1e-14 ? 0.5 : (limit - previousValue) / denominator;
      clipped.push({
        x: previous.x + (current.x - previous.x) * fraction,
        y: previous.y + (current.y - previous.y) * fraction
      });
    }
    if (currentInside) clipped.push(current);
    previous = current;
    previousValue = currentValue;
    previousInside = currentInside;
  });
  return clipped;
}

function clipPolygonToAstmFrame(polygon) {
  let clipped = clipPolygonAtAxis(polygon, "x", 0, true);
  clipped = clipPolygonAtAxis(clipped, "x", ASTM_MASTER_ASPECT, false);
  clipped = clipPolygonAtAxis(clipped, "y", 0, true);
  return clipPolygonAtAxis(clipped, "y", 1, false);
}

function astmPolygonArea(polygon) {
  let twiceArea = 0;
  polygon.forEach((point, index) => {
    const next = polygon[(index + 1) % polygon.length];
    twiceArea += point.x * next.y - next.x * point.y;
  });
  return Math.abs(twiceArea) / 2;
}

function buildAstmGrainFieldAttempt(seed, grainDensity) {
  const aspect = ASTM_MASTER_ASPECT;
  const siteCount = astmSiteCountForDensity(grainDensity);
  const random = seededRandom(seed);
  const sites = Array.from({ length: siteCount }, (_, owner) => ({
    x: random() * aspect,
    y: random(),
    owner
  }));
  const offsets = [-1, 0, 1];
  const canonicalCells = sites.map(site => {
    let polygon = [
      { x: site.x - aspect / 2, y: site.y - 0.5 },
      { x: site.x + aspect / 2, y: site.y - 0.5 },
      { x: site.x + aspect / 2, y: site.y + 0.5 },
      { x: site.x - aspect / 2, y: site.y + 0.5 }
    ];

    for (let otherIndex = 0; otherIndex < sites.length && polygon.length; otherIndex += 1) {
      if (otherIndex === site.owner) continue;
      const other = sites[otherIndex];
      for (const offsetX of offsets) {
        for (const offsetY of offsets) {
          polygon = clipGrainCell(polygon, site, {
            x: other.x + offsetX * aspect,
            y: other.y + offsetY
          });
          if (!polygon.length) break;
        }
        if (!polygon.length) break;
      }
    }
    return { owner: site.owner, polygon };
  });

  const fragments = [];
  canonicalCells.forEach(cell => {
    offsets.forEach(offsetX => {
      offsets.forEach(offsetY => {
        const shifted = cell.polygon.map(point => ({
          x: point.x + offsetX * aspect,
          y: point.y + offsetY
        }));
        const polygon = clipPolygonToAstmFrame(shifted);
        if (polygon.length >= 3 && astmPolygonArea(polygon) > 1e-10) {
          fragments.push({ owner: cell.owner, polygon });
        }
      });
    });
  });

  const result = {
    grainDensity: Number(grainDensity),
    siteCount,
    sites,
    fragments,
    aspect,
    seed
  };
  const edgeAssembly = collectPeriodicGrainEdges(fragments, sites, aspect);
  result.edges = edgeAssembly.edges;
  result.edgeDiagnostics = edgeAssembly.diagnostics;
  return result;
}

function nextAstmRetrySeed(seed, attempt) {
  let value = (Number(seed) + Math.imul(attempt + 1, 0x9e3779b9)) >>> 0;
  value = Math.imul(value ^ (value >>> 16), 0x21f0aaad);
  value = Math.imul(value ^ (value >>> 15), 0x735a2d97);
  value = (value ^ (value >>> 15)) >>> 0;
  return value === (seed >>> 0) ? (value + 1) >>> 0 : value;
}

function buildAstmGrainField(seed = astmState.seed, grainDensity = astmState.grainDensity) {
  const requestedSeed = Number(seed) >>> 0;
  const siteCount = astmSiteCountForDensity(grainDensity);
  const requestedKey = `periodic-rectangle:v2:${requestedSeed}:${grainDensity}:${siteCount}`;
  if (astmGrainFieldCache.has(requestedKey)) return astmGrainFieldCache.get(requestedKey);

  let candidateSeed = requestedSeed;
  const failures = [];
  for (let attempt = 0; attempt <= ASTM_MAX_FIELD_RETRIES; attempt += 1) {
    const result = buildAstmGrainFieldAttempt(candidateSeed, grainDensity);
    const validation = validateAstmGrainField(result);
    if (validation.valid) {
      result.requestedSeed = requestedSeed;
      result.retryCount = attempt;
      result.retryReasons = failures;
      const actualKey = `periodic-rectangle:v2:${candidateSeed}:${grainDensity}:${siteCount}`;
      astmGrainFieldCache.set(actualKey, result);
      astmGrainFieldCache.set(requestedKey, result);
      return result;
    }
    failures.push(validation.reason);
    candidateSeed = nextAstmRetrySeed(candidateSeed, attempt);
  }
  throw new Error(`Unable to construct a valid periodic grain field after ${ASTM_MAX_FIELD_RETRIES + 1} attempts: ${failures.join("; ")}`);
}

function snapAstmFrameCoordinate(value, maximum) {
  if (Math.abs(value) <= ASTM_EDGE_EPSILON) return 0;
  if (Math.abs(value - maximum) <= ASTM_EDGE_EPSILON) return maximum;
  return value;
}

function snapAstmFramePoint(point, aspect) {
  return {
    x: snapAstmFrameCoordinate(point.x, aspect),
    y: snapAstmFrameCoordinate(point.y, 1)
  };
}

function astmLineGroupNumber(value) {
  const quantized = Math.round(value / ASTM_LINE_GROUP_EPSILON);
  return Object.is(quantized, -0) ? 0 : quantized;
}

function canonicalAstmSegment(first, second) {
  let deltaX = second.x - first.x;
  let deltaY = second.y - first.y;
  const length = Math.hypot(deltaX, deltaY);
  if (!Number.isFinite(length) || length < ASTM_EDGE_EPSILON) return null;
  deltaX /= length;
  deltaY /= length;
  if (deltaX < -ASTM_EDGE_EPSILON || (Math.abs(deltaX) <= ASTM_EDGE_EPSILON && deltaY < 0)) {
    deltaX *= -1;
    deltaY *= -1;
  }
  const normalX = -deltaY;
  const normalY = deltaX;
  const offset = normalX * first.x + normalY * first.y;
  const firstProjection = deltaX * first.x + deltaY * first.y;
  const secondProjection = deltaX * second.x + deltaY * second.y;
  return {
    directionX: deltaX,
    directionY: deltaY,
    normalX,
    normalY,
    offset: Math.abs(offset) <= ASTM_EDGE_EPSILON ? 0 : offset,
    start: Math.min(firstProjection, secondProjection),
    end: Math.max(firstProjection, secondProjection)
  };
}

function collectPeriodicGrainEdges(fragments, sites, aspect) {
  const lineGroups = new Map();
  const diagnostics = {
    unmatchedIntervals: 0,
    overOwnedIntervals: 0,
    sameOwnerSeams: 0,
    invalidSegments: 0
  };

  fragments.forEach(({ owner, polygon }) => {
    for (let index = 0; index < polygon.length; index += 1) {
      const first = snapAstmFramePoint(polygon[index], aspect);
      const second = snapAstmFramePoint(polygon[(index + 1) % polygon.length], aspect);
      if (Math.hypot(second.x - first.x, second.y - first.y) < ASTM_EDGE_EPSILON) continue;
      const onOuterFrame =
        (first.x === 0 && second.x === 0) ||
        (first.x === aspect && second.x === aspect) ||
        (first.y === 0 && second.y === 0) ||
        (first.y === 1 && second.y === 1);
      if (onOuterFrame) continue;

      const segment = canonicalAstmSegment(first, second);
      if (!segment) {
        diagnostics.invalidSegments += 1;
        continue;
      }
      const key = [
        astmLineGroupNumber(segment.directionX),
        astmLineGroupNumber(segment.directionY),
        astmLineGroupNumber(segment.offset)
      ].join(":");
      if (!lineGroups.has(key)) {
        lineGroups.set(key, {
          directionX: segment.directionX,
          directionY: segment.directionY,
          normalX: segment.normalX,
          normalY: segment.normalY,
          offset: segment.offset,
          intervals: []
        });
      }
      const group = lineGroups.get(key);
      const start = group.directionX * first.x + group.directionY * first.y;
      const end = group.directionX * second.x + group.directionY * second.y;
      group.intervals.push({
        start: Math.min(start, end),
        end: Math.max(start, end),
        owner
      });
    }
  });

  const edges = [];
  lineGroups.forEach(group => {
    const rawBreakpoints = group.intervals
      .flatMap(interval => [interval.start, interval.end])
      .sort((first, second) => first - second);
    const breakpoints = [];
    rawBreakpoints.forEach(value => {
      const previous = breakpoints[breakpoints.length - 1];
      if (previous === undefined || Math.abs(value - previous) > ASTM_LINE_GROUP_EPSILON) {
        breakpoints.push(value);
      } else {
        breakpoints[breakpoints.length - 1] = (previous + value) / 2;
      }
    });

    const emitted = [];
    for (let index = 0; index < breakpoints.length - 1; index += 1) {
      const start = breakpoints[index];
      const end = breakpoints[index + 1];
      if (end - start <= ASTM_EDGE_EPSILON) continue;
      const midpoint = (start + end) / 2;
      const covering = group.intervals.filter(interval =>
        midpoint >= interval.start - ASTM_LINE_GROUP_EPSILON &&
        midpoint <= interval.end + ASTM_LINE_GROUP_EPSILON
      );
      const owners = [...new Set(covering.map(interval => interval.owner))].sort((first, second) => first - second);
      if (owners.length === 0) continue;
      if (owners.length === 1) {
        if (covering.length > 1) diagnostics.sameOwnerSeams += 1;
        else diagnostics.unmatchedIntervals += 1;
        continue;
      }
      if (owners.length > 2) {
        diagnostics.overOwnedIntervals += 1;
        continue;
      }
      const previous = emitted[emitted.length - 1];
      if (previous && previous.owners[0] === owners[0] && previous.owners[1] === owners[1] && Math.abs(previous.end - start) <= ASTM_LINE_GROUP_EPSILON) {
        previous.end = end;
      } else {
        emitted.push({ start, end, owners });
      }
    }

    emitted.forEach(interval => {
      const makePoint = projection => snapAstmFramePoint({
        x: group.directionX * projection + group.normalX * group.offset,
        y: group.directionY * projection + group.normalY * group.offset
      }, aspect);
      const first = makePoint(interval.start);
      const second = makePoint(interval.end);
      if (Math.hypot(second.x - first.x, second.y - first.y) >= ASTM_EDGE_EPSILON) {
        edges.push({ first, second, owners: interval.owners });
      }
    });
  });

  diagnostics.lineGroups = lineGroups.size;
  diagnostics.retainedEdges = edges.length;
  diagnostics.siteCount = sites.length;
  return { edges, diagnostics };
}

function astmPeriodicDistanceSquared(first, second, aspect = ASTM_MASTER_ASPECT) {
  let deltaX = Math.abs(first.x - second.x);
  let deltaY = Math.abs(first.y - second.y);
  deltaX = Math.min(deltaX, aspect - deltaX);
  deltaY = Math.min(deltaY, 1 - deltaY);
  return deltaX * deltaX + deltaY * deltaY;
}

function astmOwnerAtPoint(sites, point, aspect = ASTM_MASTER_ASPECT) {
  const wrapped = {
    x: ((point.x % aspect) + aspect) % aspect,
    y: ((point.y % 1) + 1) % 1
  };
  let owner = -1;
  let distance = Number.POSITIVE_INFINITY;
  sites.forEach(site => {
    const candidate = astmPeriodicDistanceSquared(site, wrapped, aspect);
    if (candidate < distance) {
      distance = candidate;
      owner = site.owner;
    }
  });
  return { owner, distance };
}

function expectedAstmLineIntersections(sites, aspect = ASTM_MASTER_ASPECT) {
  const line = astmTestLine();
  const offsets = [-1, 0, 1];
  const candidates = [];
  sites.forEach(site => {
    offsets.forEach(offsetX => {
      offsets.forEach(offsetY => {
        const siteX = site.x + offsetX * aspect;
        const siteY = site.y + offsetY;
        candidates.push({
          owner: site.owner,
          slope: -2 * siteX,
          intercept: siteX * siteX + (line.start.y - siteY) ** 2
        });
      });
    });
  });
  candidates.sort((first, second) => second.slope - first.slope || first.intercept - second.intercept);

  let ambiguous = false;
  const unique = [];
  candidates.forEach(candidate => {
    const previous = unique[unique.length - 1];
    if (!previous || Math.abs(candidate.slope - previous.slope) > 1e-12) {
      unique.push(candidate);
      return;
    }
    if (candidate.intercept < previous.intercept - 1e-12) {
      unique[unique.length - 1] = candidate;
    } else if (Math.abs(candidate.intercept - previous.intercept) <= 1e-12 && candidate.owner !== previous.owner) {
      ambiguous = true;
    }
  });

  const hull = [];
  unique.forEach(candidate => {
    let start = Number.NEGATIVE_INFINITY;
    while (hull.length) {
      const previous = hull[hull.length - 1];
      start = (candidate.intercept - previous.intercept) / (previous.slope - candidate.slope);
      if (start > previous.start + 1e-10) break;
      hull.pop();
    }
    hull.push({ ...candidate, start: hull.length ? start : Number.NEGATIVE_INFINITY });
  });

  const intersections = [];
  for (let index = 1; index < hull.length; index += 1) {
    const x = hull[index].start;
    if (x <= line.start.x + 1e-8 || x >= line.end.x - 1e-8) continue;
    if (hull[index - 1].owner === hull[index].owner) continue;
    const point = { x, y: line.start.y };
    const distances = sites.map(site => ({
      owner: site.owner,
      distance: astmPeriodicDistanceSquared(site, point, aspect)
    })).sort((first, second) => first.distance - second.distance);
    const tiedOwners = distances.filter(entry => Math.abs(entry.distance - distances[0].distance) <= 1e-8).length;
    if (tiedOwners > 2) ambiguous = true;
    const previous = intersections[intersections.length - 1];
    if (previous && Math.abs(previous.x - x) <= 1e-7) {
      ambiguous = true;
      continue;
    }
    intersections.push(point);
  }
  return { line, intersections, ambiguous };
}

function validateAstmGrainField(field) {
  const fail = reason => ({ valid: false, reason });
  if (!field.sites.length || field.sites.length !== field.siteCount) return fail("generator count mismatch");
  if (field.sites.some(site => !Number.isFinite(site.x) || !Number.isFinite(site.y) || site.x < 0 || site.x >= field.aspect || site.y < 0 || site.y >= 1)) {
    return fail("non-finite or out-of-frame generator");
  }
  for (let first = 0; first < field.sites.length; first += 1) {
    for (let second = first + 1; second < field.sites.length; second += 1) {
      if (astmPeriodicDistanceSquared(field.sites[first], field.sites[second], field.aspect) < 1e-12) {
        return fail("near-duplicate periodic generators");
      }
    }
  }

  const ownerAreas = Array(field.siteCount).fill(0);
  let totalArea = 0;
  for (const fragment of field.fragments) {
    const area = astmPolygonArea(fragment.polygon);
    if (!Number.isFinite(area)) return fail("non-finite fragment area");
    totalArea += area;
    ownerAreas[fragment.owner] += area;
  }
  if (Math.abs(totalArea - field.aspect) > Math.max(1e-7, field.aspect * 1e-7)) return fail("periodic fragments do not cover the field exactly");
  if (ownerAreas.some(area => area <= 1e-10)) return fail("a generator produced a zero-area cell");

  const diagnostics = field.edgeDiagnostics;
  if (!diagnostics || diagnostics.unmatchedIntervals || diagnostics.overOwnedIntervals || diagnostics.invalidSegments) {
    return fail("unresolved or redundant periodic boundary intervals");
  }
  if (field.siteCount > 1 && !field.edges.length) return fail("no physical boundaries were retained");

  const adjacency = Array.from({ length: field.siteCount }, () => new Set());
  for (const edge of field.edges) {
    if (!edge.owners || edge.owners.length !== 2 || edge.owners[0] === edge.owners[1]) return fail("invalid boundary ownership");
    const deltaX = edge.second.x - edge.first.x;
    const deltaY = edge.second.y - edge.first.y;
    const length = Math.hypot(deltaX, deltaY);
    if (!Number.isFinite(length) || length < ASTM_EDGE_EPSILON) return fail("invalid boundary length");
    const midpoint = {
      x: (edge.first.x + edge.second.x) / 2,
      y: (edge.first.y + edge.second.y) / 2
    };
    const offset = Math.min(2e-6, Math.max(1e-9, length * 1e-3));
    const normalX = -deltaY / length;
    const normalY = deltaX / length;
    const firstOwner = astmOwnerAtPoint(field.sites, {
      x: midpoint.x + normalX * offset,
      y: midpoint.y + normalY * offset
    }, field.aspect).owner;
    const secondOwner = astmOwnerAtPoint(field.sites, {
      x: midpoint.x - normalX * offset,
      y: midpoint.y - normalY * offset
    }, field.aspect).owner;
    const sampledOwners = [firstOwner, secondOwner].sort((first, second) => first - second);
    if (sampledOwners[0] !== edge.owners[0] || sampledOwners[1] !== edge.owners[1]) return fail("a retained edge does not separate its recorded owners");
    adjacency[edge.owners[0]].add(edge.owners[1]);
    adjacency[edge.owners[1]].add(edge.owners[0]);
  }

  if (field.siteCount > 1) {
    const visited = new Set([0]);
    const pending = [0];
    while (pending.length) {
      const owner = pending.pop();
      adjacency[owner].forEach(neighbour => {
        if (!visited.has(neighbour)) {
          visited.add(neighbour);
          pending.push(neighbour);
        }
      });
    }
    if (visited.size !== field.siteCount) return fail("the periodic owner-adjacency graph is disconnected");
  }

  const expected = expectedAstmLineIntersections(field.sites, field.aspect);
  const assembled = findTestLineIntersections(field.edges);
  if (expected.ambiguous) return fail("the measurement line meets a numerically ambiguous Voronoi vertex");
  if (expected.intersections.length !== assembled.intersections.length) return fail("the assembled boundaries miss a measurement-line transition");
  for (let index = 0; index < expected.intersections.length; index += 1) {
    if (Math.abs(expected.intersections[index].x - assembled.intersections[index].x) > 2e-6) {
      return fail("a measurement-line transition is displaced from its boundary");
    }
  }
  return { valid: true, reason: "" };
}

function findTestLineIntersections(edges) {
  const line = astmTestLine();
  const intersections = [];
  edges.forEach(({ first, second }) => {
    const deltaY = second.y - first.y;
    if (Math.abs(deltaY) < 1e-10) return;
    const edgeFraction = (line.start.y - first.y) / deltaY;
    if (edgeFraction <= 1e-8 || edgeFraction >= 1 - 1e-8) return;
    const x = first.x + (second.x - first.x) * edgeFraction;
    if (x > line.start.x + 1e-8 && x < line.end.x - 1e-8) intersections.push({ x, y: line.start.y });
  });
  intersections.sort((first, second) => first.x - second.x);
  const deduplicated = intersections.filter((point, index) => index === 0 || Math.abs(point.x - intersections[index - 1].x) > 1e-6);
  return { line, intersections: deduplicated };
}

function drawAstmField() {
  const { context, width, height } = prepareCanvas(elements.astmCanvas);
  if (!context) return null;
  const colors = canvasColors();
  context.clearRect(0, 0, width, height);
  context.fillStyle = "#fbfafc";
  context.fillRect(0, 0, width, height);

  let field;
  try {
    field = buildAstmGrainField(astmState.seed, astmState.grainDensity);
  } catch (error) {
    console.error("The periodic grain field did not pass its geometry checks.", error);
    return null;
  }
  if (field.seed !== astmState.seed) astmState.seed = field.seed;
  const viewport = astmViewport();
  const measurement = astmState.measured ? findTestLineIntersections(field.edges) : null;
  const fills = ["rgba(56,102,148,0.13)", "rgba(103,87,168,0.13)", "rgba(240,80,48,0.10)", "rgba(40,132,104,0.11)"];
  const toScreenX = x => (x - viewport.x) / viewport.width * width;
  const toScreenY = y => (y - viewport.y) / viewport.height * height;
  context.lineJoin = "round";
  context.lineCap = "round";
  field.fragments.forEach(({ owner, polygon }) => {
    if (polygon.length < 3) return;
    context.beginPath();
    polygon.forEach((point, pointIndex) => {
      const x = toScreenX(point.x);
      const y = toScreenY(point.y);
      if (pointIndex === 0) context.moveTo(x, y); else context.lineTo(x, y);
    });
    context.closePath();
    context.fillStyle = fills[(owner * 7 + 5) % fills.length];
    context.fill();
  });

  context.beginPath();
  field.edges.forEach(({ first, second }) => {
    context.moveTo(toScreenX(first.x), toScreenY(first.y));
    context.lineTo(toScreenX(second.x), toScreenY(second.y));
  });
  context.lineWidth = 1.15;
  context.strokeStyle = colors.navy;
  context.stroke();

  const siteRadius = Math.max(1.25, Math.min(3, width / (120 + Math.sqrt(field.siteCount) * 8)));
  context.fillStyle = colors.navy;
  context.strokeStyle = "rgba(255,255,255,0.92)";
  context.lineWidth = Math.max(0.7, siteRadius * 0.38);
  field.sites.forEach(site => {
    context.beginPath();
    context.arc(toScreenX(site.x), toScreenY(site.y), siteRadius, 0, Math.PI * 2);
    context.fill();
    context.stroke();
  });

  const referenceSquare = astmOneInchSquare();
  const referenceX = toScreenX(referenceSquare.x);
  const referenceY = toScreenY(referenceSquare.y);
  const referenceSize = toScreenX(referenceSquare.x + referenceSquare.size) - referenceX;
  context.save();
  context.setLineDash([6, 4]);
  context.strokeStyle = colors.blue;
  context.lineWidth = Math.max(1.5, width / 420);
  context.strokeRect(referenceX, referenceY, referenceSize, referenceSize);
  context.setLineDash([]);
  const referenceLabel = "1 in² at 100×";
  context.font = `700 ${Math.max(11, Math.min(14, width / 48))}px system-ui, sans-serif`;
  const referenceLabelWidth = context.measureText(referenceLabel).width;
  context.fillStyle = "rgba(255,255,255,0.9)";
  context.fillRect(referenceX + 5, referenceY + 5, referenceLabelWidth + 10, 20);
  context.fillStyle = colors.blue;
  context.textAlign = "left";
  context.fillText(referenceLabel, referenceX + 10, referenceY + 20);
  context.restore();

  if (!measurement) return { field, viewport, measurement: null };

  const lineStartX = toScreenX(measurement.line.start.x);
  const lineEndX = toScreenX(measurement.line.end.x);
  const lineY = toScreenY(measurement.line.start.y);
  context.save();
  context.strokeStyle = colors.coral;
  context.lineWidth = Math.max(2.5, width / 240);
  context.beginPath();
  context.moveTo(lineStartX, lineY);
  context.lineTo(lineEndX, lineY);
  context.moveTo(lineStartX, lineY - 9);
  context.lineTo(lineStartX, lineY + 9);
  context.moveTo(lineEndX, lineY - 9);
  context.lineTo(lineEndX, lineY + 9);
  context.stroke();
  measurement.intersections.forEach(point => {
    const x = toScreenX(point.x);
    context.beginPath();
    context.arc(x, lineY, Math.max(4, width / 145), 0, Math.PI * 2);
    context.fillStyle = "rgba(255,255,255,0.96)";
    context.fill();
    context.strokeStyle = colors.coral;
    context.lineWidth = 2;
    context.stroke();
    context.beginPath();
    context.moveTo(x - 2.5, lineY);
    context.lineTo(x + 2.5, lineY);
    context.moveTo(x, lineY - 2.5);
    context.lineTo(x, lineY + 2.5);
    context.stroke();
  });

  const markerY = height * 0.91;
  const specimenLengthLabel = `${formatNumber(ASTM_IMAGE_LINE_LENGTH_MM / ASTM_MAGNIFICATION, 3)} mm`;
  const markerLabel = `1.00 in at 100× = ${specimenLengthLabel}`;
  context.font = `700 ${Math.max(12, Math.min(15, width / 44))}px system-ui, sans-serif`;
  const markerLabelWidth = context.measureText(markerLabel).width;
  const markerCenter = (lineStartX + lineEndX) / 2;
  const markerBackgroundWidth = Math.min(width - 12, Math.max(lineEndX - lineStartX + 16, markerLabelWidth + 20));
  const markerBackgroundX = Math.max(6, Math.min(width - markerBackgroundWidth - 6, markerCenter - markerBackgroundWidth / 2));
  context.fillStyle = "rgba(255,255,255,0.88)";
  context.fillRect(markerBackgroundX, markerY - 24, markerBackgroundWidth, 42);
  context.strokeStyle = colors.navy;
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(lineStartX, markerY);
  context.lineTo(lineEndX, markerY);
  context.moveTo(lineStartX, markerY - 7);
  context.lineTo(lineStartX, markerY + 7);
  context.moveTo(lineEndX, markerY - 7);
  context.lineTo(lineEndX, markerY + 7);
  context.stroke();
  context.fillStyle = colors.navy;
  context.textAlign = "center";
  context.fillText(markerLabel, markerCenter, markerY - 7);
  context.textAlign = "left";
  context.fillStyle = colors.coral;
  context.fillText(`Pₜ = ${measurement.intersections.length}`, lineStartX, lineY - 13);
  context.restore();
  return { field, viewport, measurement };
}

function observeTwoDimensionalCanvases() {
  if (typeof ResizeObserver === "function") {
    const observer = new ResizeObserver(entries => {
      entries.forEach(entry => {
        if (entry.target === elements.grainCanvas) updateGrainBoundary();
        if (entry.target === elements.astmCanvas) renderAstmExperiment(false);
      });
    });
    observer.observe(elements.grainCanvas);
    observer.observe(elements.astmCanvas);
    return;
  }

  window.addEventListener("resize", () => {
    updateGrainBoundary();
    renderAstmExperiment(false);
  });
}

function prepareCanvas(canvas) {
  const context = canvas.getContext("2d");
  if (!context) return { context: null, width: 0, height: 0 };
  const cssWidth = Math.max(1, canvas.clientWidth || Number(canvas.getAttribute("width")));
  const aspect = Number(canvas.getAttribute("height")) / Number(canvas.getAttribute("width"));
  const cssHeight = Math.max(1, cssWidth * aspect);
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  const targetWidth = Math.round(cssWidth * pixelRatio);
  const targetHeight = Math.round(cssHeight * pixelRatio);
  if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
    canvas.width = targetWidth;
    canvas.height = targetHeight;
  }
  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  return { context, width: cssWidth, height: cssHeight };
}

function canvasColors() {
  const styles = getComputedStyle(document.documentElement);
  const value = name => styles.getPropertyValue(name).trim();
  return {
    navy: value("--navy") || "#18375f",
    coral: value("--coral") || "#c93b1f",
    blue: value("--blue") || "#386694",
    lavender: value("--lavender") || "#6757a8"
  };
}

function formatNumber(value, digits) {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: digits, minimumFractionDigits: Math.min(digits, 2) }).format(value);
}

function formatScientific(value) {
  if (value >= 1e5 || value < 0.01) return value.toExponential(2);
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: value >= 100 ? 0 : 2 }).format(value);
}

function updateLiveText(element, message) {
  if (element && element.textContent !== message) element.textContent = message;
}
