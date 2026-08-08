let THREE;
let OrbitControls;

const elements = {
  viewerFrame: document.querySelector("#structures-viewer-frame"),
  canvas: document.querySelector("#structures-canvas"),
  fallback: document.querySelector("#structures-fallback"),
  family: document.querySelector("#structure-family"),
  model: document.querySelector("#structure-model"),
  showCell: document.querySelector("#show-cell"),
  showLinks: document.querySelector("#show-links"),
  viewIsometric: document.querySelector("#view-isometric"),
  viewA: document.querySelector("#view-a"),
  viewC: document.querySelector("#view-c"),
  zoomIn: document.querySelector("#zoom-in"),
  zoomOut: document.querySelector("#zoom-out"),
  resetView: document.querySelector("#reset-view"),
  downloadPng: document.querySelector("#download-png"),
  title: document.querySelector("#explorer-title"),
  kind: document.querySelector("#model-kind"),
  subtitle: document.querySelector("#model-subtitle"),
  legend: document.querySelector("#species-legend"),
  status: document.querySelector("#structures-status"),
  factPrototype: document.querySelector("#fact-prototype"),
  factSystem: document.querySelector("#fact-system"),
  factLattice: document.querySelector("#fact-lattice"),
  factCell: document.querySelector("#fact-cell"),
  factCoordination: document.querySelector("#fact-coordination"),
  notice: document.querySelector("#model-notice")
};

const requiredElements = Object.values(elements);

const SPECIES = {
  Po: { label: "Po — polonium", color: 0xb9c8ff, radius: 1.02 },
  Fe: { label: "Fe — iron", color: 0xff8a72, radius: 1.02 },
  Cu: { label: "Cu — copper", color: 0xff806b, radius: 1.02 },
  Mg: { label: "Mg — magnesium", color: 0x88d8c0, radius: 1.04 },
  C: { label: "C — carbon", color: 0xe7e9ff, radius: 0.82 },
  C_A: { label: "C — A-layer viewing colour", color: 0x8fb9ff, radius: 0.82 },
  C_B: { label: "C — B-layer viewing colour", color: 0xff947d, radius: 0.82 },
  Na: { label: "Na — sodium", color: 0xff5a52, radius: 0.88 },
  Cl: { label: "Cl — chlorine", color: 0x43e07b, radius: 1.12 },
  Cs: { label: "Cs — caesium", color: 0xff5a52, radius: 1.16 },
  Zn: { label: "Zn — zinc", color: 0xff5a52, radius: 0.9 },
  S: { label: "S — sulfur", color: 0xffd23f, radius: 1.02 },
  Ca: { label: "Ca — calcium", color: 0x8ab8ff, radius: 1.06 },
  F: { label: "F — fluorine", color: 0x7fe4b6, radius: 0.76 },
  Ti: { label: "Ti — titanium", color: 0x7fa8ff, radius: 0.92 },
  O: { label: "O — oxygen", color: 0xff6f73, radius: 0.74 },
  Al: { label: "Al — aluminium", color: 0xf4b05f, radius: 0.91 },
  Sr: { label: "Sr — strontium", color: 0x8fd2b0, radius: 1.13 },
  Y: { label: "Y — yttrium", color: 0xb08cff, radius: 1.04 },
  Ba: { label: "Ba — barium", color: 0x63c4e8, radius: 1.18 },
  Si: { label: "Si — silicon", color: 0x74b8ff, radius: 0.88 },
  OH: { label: "OH — hydroxyl site", color: 0xffb1b4, radius: 0.68 },
  Water: { label: "H₂O — interlayer water (schematic)", color: 0x78d6ee, radius: 0.72 },
  Cation: { label: "M⁺/M²⁺ — exchangeable cation", color: 0xc6a2ff, radius: 0.86 },
  Segment: { label: "Polymer repeat segment", color: 0x91b8ff, radius: 0.84 },
  Branch: { label: "Branch segment", color: 0xff9b82, radius: 0.84 },
  Amorphous: { label: "Amorphous chain segment", color: 0xff9b82, radius: 0.84 },
  Crosslink: { label: "Cross-link", color: 0xf7cd57, radius: 0.72 }
};

const FAMILIES = [
  { id: "elemental", label: "Elements and common lattices", models: ["simple-cubic", "bcc", "fcc", "hcp", "diamond"] },
  { id: "binary", label: "Binary compounds", models: ["nacl", "cscl", "zinc-blende", "wurtzite"] },
  { id: "complex", label: "Complex ceramics", models: ["fluorite", "rutile", "corundum", "perovskite", "ybco"] },
  { id: "layered", label: "Layered and clay structures", models: ["graphite", "kaolinite", "smectite"] },
  { id: "polymer", label: "Polymer conformation and architecture", models: ["polymer-linear", "polymer-coil", "polymer-branched", "polymer-crosslinked", "polymer-lamella"] }
];

const MODELS = {
  "simple-cubic": {
    family: "elemental",
    title: "Simple cubic (SC)",
    subtitle: "α-Po prototype · cubic conventional cell",
    kind: "Exact crystallographic prototype",
    prototype: "α-Po · Pm3̅m (no. 221) · cP1",
    system: "Cubic",
    lattice: "Primitive cubic",
    cell: "1 effective atom",
    coordination: "6",
    notice: "Each atom has six nearest neighbours along ±a, ±b, and ±c. Corner spheres are shared images of one lattice site.",
    legend: ["Po"],
    builder: buildSimpleCubic
  },
  bcc: {
    family: "elemental",
    title: "Body-centred cubic (BCC)",
    subtitle: "α-Fe prototype · cubic conventional cell",
    kind: "Exact crystallographic prototype",
    prototype: "α-Fe / W (A2) · Im3̅m (no. 229) · cI2",
    system: "Cubic",
    lattice: "Body-centred cubic",
    cell: "2 effective atoms",
    coordination: "8",
    notice: "The body-centre and every corner are the same species and are related by a valid lattice translation.",
    legend: ["Fe"],
    builder: buildBcc
  },
  fcc: {
    family: "elemental",
    title: "Face-centred cubic (FCC)",
    subtitle: "Cu prototype · cubic conventional cell",
    kind: "Exact crystallographic prototype",
    prototype: "Cu (A1) · Fm3̅m (no. 225) · cF4",
    system: "Cubic",
    lattice: "Face-centred cubic",
    cell: "4 effective atoms",
    coordination: "12",
    notice: "Corner and face-centred sites belong to one translation-equivalent lattice. The close-packed planes follow ABC stacking.",
    legend: ["Cu"],
    builder: buildFcc
  },
  hcp: {
    family: "elemental",
    title: "Hexagonal close-packed (HCP)",
    subtitle: "Ideal Mg-type close packing · hexagonal conventional cell",
    kind: "Exact crystallographic prototype",
    prototype: "Mg (A3) · P6₃/mmc (no. 194) · hP2",
    system: "Hexagonal",
    lattice: "Primitive hexagonal + 2-atom basis",
    cell: "6 atoms in the conventional prism; 2 per primitive cell",
    coordination: "12 at ideal c/a = √(8/3)",
    notice: "HCP is a crystal structure on a primitive hexagonal Bravais lattice. Its close-packed planes follow ABAB stacking.",
    legend: ["Mg"],
    builder: buildHcp
  },
  diamond: {
    family: "elemental",
    title: "Diamond cubic",
    subtitle: "Carbon prototype · FCC lattice with a 2-site basis",
    kind: "Exact crystallographic prototype",
    prototype: "C (A4) · Fd3̅m (no. 227) · cF8",
    system: "Cubic",
    lattice: "Face-centred cubic + (0,0,0)/(¼,¼,¼) basis",
    cell: "8 effective C atoms",
    coordination: "4; tetrahedral angle 109.47°",
    notice: "The nearest-neighbour distance is √3a/4. The 12 FCC neighbours at a/√2 are second neighbours here and are not bonded.",
    legend: ["C"],
    builder: buildDiamond
  },
  graphite: {
    family: "layered",
    title: "Hexagonal graphite (2H)",
    subtitle: "Four-sheet ABAB fragment · frame marks one hexagonal repeat",
    kind: "Exact prototype · finite fragment",
    viewScale: 0.68,
    prototype: "Graphite (A9) · P6₃/mmc (no. 194) · hP4",
    system: "Hexagonal",
    lattice: "Primitive hexagonal + 4-atom basis",
    cell: "4 C atoms per 2H cell",
    coordination: "3 in-plane; 120°",
    notice: "Strong covalent links lie within each honeycomb sheet. No cylinders cross the 3.35 Å interlayer gap; colours only reveal AB stacking.",
    legend: ["C_A", "C_B"],
    builder: buildGraphite
  },
  nacl: {
    family: "binary",
    title: "Rock salt (NaCl)",
    subtitle: "B1 prototype · two interpenetrating FCC sublattices",
    kind: "Exact crystallographic prototype",
    prototype: "NaCl (B1) · Fm3̅m (no. 225) · cF8",
    system: "Cubic",
    lattice: "Face-centred cubic + 2-species basis",
    cell: "4 Na + 4 Cl",
    coordination: "6:6 octahedral",
    notice: "Every Na is surrounded octahedrally by six Cl and vice versa. The guides show coordination contacts, not isolated NaCl molecules.",
    legend: ["Na", "Cl"],
    builder: buildNacl
  },
  cscl: {
    family: "binary",
    title: "Caesium chloride (CsCl)",
    subtitle: "B2 prototype · primitive cubic lattice with a 2-species basis",
    kind: "Exact crystallographic prototype",
    prototype: "CsCl (B2) · Pm3̅m (no. 221) · cP2",
    system: "Cubic",
    lattice: "Primitive cubic + Cl/Cs basis",
    cell: "1 Cs + 1 Cl",
    coordination: "8:8 cubic",
    notice: "CsCl looks body-centred, but (½,½,½) swaps unlike species. That vector is not a lattice translation, so the Bravais lattice is not BCC.",
    legend: ["Cs", "Cl"],
    builder: buildCscl
  },
  "zinc-blende": {
    family: "binary",
    title: "Zinc blende ZnS",
    subtitle: "B3 sphalerite prototype · cubic tetrahedral network",
    kind: "Exact crystallographic prototype",
    prototype: "ZnS (B3) · F4̅3m (no. 216) · cF8",
    system: "Cubic",
    lattice: "Face-centred cubic + Zn/S basis",
    cell: "4 Zn + 4 S",
    coordination: "4:4 tetrahedral",
    notice: "This shares diamond's network topology, but alternating Zn and S make the basis and symmetry different.",
    legend: ["Zn", "S"],
    builder: buildZincBlende
  },
  wurtzite: {
    family: "binary",
    title: "Wurtzite ZnS",
    subtitle: "B4 prototype · hexagonal tetrahedral network",
    kind: "Exact ideal prototype · repeated fragment",
    viewScale: 0.76,
    prototype: "ZnS (B4) · P6₃mc (no. 186) · hP4",
    system: "Hexagonal",
    lattice: "Primitive hexagonal + 4-atom basis",
    cell: "2 Zn + 2 S",
    coordination: "4:4 tetrahedral",
    notice: "Wurtzite and zinc blende have similar local Zn–S tetrahedra but different long-range stacking: hexagonal versus cubic.",
    legend: ["Zn", "S"],
    builder: buildWurtzite
  },
  fluorite: {
    family: "complex",
    title: "Fluorite CaF₂",
    subtitle: "One representative AB₂ structure",
    kind: "Exact crystallographic prototype",
    prototype: "CaF₂ (C1) · Fm3̅m (no. 225) · cF12",
    system: "Cubic",
    lattice: "Face-centred cubic Ca lattice + F basis",
    cell: "4 Ca + 8 F",
    coordination: "Ca: 8; F: 4",
    notice: "All eight tetrahedral sites of the Ca FCC lattice are occupied by F. AB₂ is a composition, not a unique structure type.",
    legend: ["Ca", "F"],
    builder: buildFluorite
  },
  rutile: {
    family: "complex",
    title: "Rutile TiO₂",
    subtitle: "A second important AB₂ structure",
    kind: "Exact crystallographic prototype",
    prototype: "TiO₂ (C4) · P4₂/mnm (no. 136) · tP6",
    system: "Tetragonal",
    lattice: "Primitive tetragonal + Ti/O basis",
    cell: "2 Ti + 4 O",
    coordination: "Ti: distorted O₆ octahedron; O: 3 Ti",
    notice: "The same AB₂ ratio forms a very different network from fluorite. Rutile contains chains of edge-sharing TiO₆ octahedra.",
    legend: ["Ti", "O"],
    builder: buildRutile
  },
  corundum: {
    family: "complex",
    title: "Corundum α-Al₂O₃",
    subtitle: "Representative A₂B₃ structure · hexagonal setting",
    kind: "Exact crystallographic prototype",
    viewScale: 0.66,
    prototype: "α-Al₂O₃ · R3̅c (no. 167) · hR10",
    system: "Trigonal, shown in the hexagonal setting",
    lattice: "Rhombohedral R lattice",
    cell: "12 Al + 18 O in the hexagonal cell",
    coordination: "Al: distorted O₆; O: 4 Al",
    notice: "Al fills two-thirds of the octahedral sites in an approximately close-packed oxygen array. Other Al₂O₃ polymorphs also exist.",
    legend: ["Al", "O"],
    builder: buildCorundum
  },
  perovskite: {
    family: "complex",
    title: "Ideal cubic perovskite SrTiO₃",
    subtitle: "ABO₃ prototype · undistorted reference structure",
    kind: "Exact ideal crystallographic prototype",
    prototype: "SrTiO₃ · Pm3̅m (no. 221) · cP5",
    system: "Cubic",
    lattice: "Primitive cubic + A/B/O basis",
    cell: "1 Sr + 1 Ti + 3 O",
    coordination: "Ti: O₆; Sr: O₁₂",
    notice: "Real perovskites often tilt or distort their BO₆ octahedra. This ideal cubic cell is the reference from which those variants are described.",
    legend: ["Sr", "Ti", "O"],
    builder: buildPerovskite
  },
  ybco: {
    family: "complex",
    title: "Layered YBCO",
    subtitle: "YBa₂Cu₃O₇, the fully oxygenated orthorhombic representative",
    kind: "Exact selected crystallographic phase",
    viewScale: 0.7,
    prototype: "YBa₂Cu₃O₇−δ · Pmmm (no. 47) · oP13",
    system: "Orthorhombic (Pmmm)",
    lattice: "Primitive orthorhombic",
    cell: "1 Y + 2 Ba + 3 Cu + 7 O",
    coordination: "Site-dependent Cu–O planes, pyramids, and chains",
    notice: "The long c axis stacks CuO₂ planes, Ba/Y layers, and Cu–O chains. Oxygen deficiency δ changes chain order, symmetry, and properties.",
    legend: ["Y", "Ba", "Cu", "O"],
    builder: buildYbco
  },
  kaolinite: {
    family: "layered",
    title: "Kaolinite 1:1 layer",
    subtitle: "Shared-oxygen 1:1 layer connectivity",
    kind: "Schematic teaching model",
    prototype: "Kaolinite, Al₂Si₂O₅(OH)₄",
    system: "Layer-silicate motif",
    lattice: "One T sheet + one O sheet (connectivity schematic)",
    cell: "Finite layer fragment; not an exact unit cell",
    coordination: "Si has 4 O connections; Al has 6 O/OH connections",
    notice: "The shared-ligand topology and 1:1 layer sequence are meaningful; distances and angles are diagrammatic, not a refined tetrahedral/octahedral geometry. There are no direct Si–Al links.",
    legend: ["Si", "Al", "O", "OH"],
    builder: buildKaolinite
  },
  smectite: {
    family: "layered",
    title: "Smectite 2:1 layer",
    subtitle: "Shared-ligand T–O–T connectivity with an interlayer gallery",
    kind: "Schematic teaching model",
    prototype: "Smectite / montmorillonite family motif",
    system: "Layer-silicate motif",
    lattice: "T–O–T connectivity schematic + interlayer species",
    cell: "Finite layer fragment; composition and spacing vary",
    coordination: "Si has 4 O connections; octahedral sites have 6 O/OH connections",
    notice: "Connectivity and layer sequence are emphasized; distances and angles are diagrammatic. One Al→Mg substitution symbolically creates layer charge balanced by interlayer cations; OH, water, and spacing are illustrative.",
    legend: ["Si", "Al", "Mg", "O", "OH", "Water", "Cation"],
    builder: buildSmectite
  },
  "polymer-linear": {
    family: "polymer",
    title: "Linear polymer chain",
    subtitle: "Extended bead–spring chain",
    kind: "Schematic coarse-grained model",
    prototype: "Linear architecture; extended conformation",
    system: "Non-crystallographic teaching model",
    lattice: "No unit cell implied",
    cell: "One finite chain",
    coordination: "Two backbone neighbours away from the ends",
    notice: "Linear describes architecture; extended describes conformation. A flexible linear chain can coil without changing its connectivity.",
    legend: ["Segment"],
    builder: buildLinearPolymer
  },
  "polymer-coil": {
    family: "polymer",
    title: "Random-coil conformation",
    subtitle: "One flexible linear chain in a disordered conformation",
    kind: "Schematic coarse-grained model",
    prototype: "Linear architecture; random-coil conformation",
    system: "Non-crystallographic teaching model",
    lattice: "No unit cell implied",
    cell: "One deterministic random-walk chain",
    coordination: "Backbone connectivity remains unchanged",
    notice: "Coiling is a conformational change caused by bond rotations; it does not turn a linear chain into a branched polymer.",
    legend: ["Segment"],
    builder: buildCoilPolymer
  },
  "polymer-branched": {
    family: "polymer",
    title: "Branched polymer architecture",
    subtitle: "Backbone with covalently attached side chains",
    kind: "Schematic coarse-grained model",
    prototype: "Branched architecture",
    system: "Non-crystallographic teaching model",
    lattice: "No unit cell implied",
    cell: "Finite chain fragment",
    coordination: "Branch points have more than two covalent neighbours",
    notice: "Branches are part of the molecule, unlike temporary chain entanglements. Branching can hinder regular packing and crystallization.",
    legend: ["Segment", "Branch"],
    builder: buildBranchedPolymer
  },
  "polymer-crosslinked": {
    family: "polymer",
    title: "Cross-linked polymer network",
    subtitle: "Several chains joined by permanent cross-links",
    kind: "Schematic coarse-grained model",
    prototype: "Network architecture",
    system: "Non-crystallographic teaching model",
    lattice: "No unit cell implied",
    cell: "Finite network fragment",
    coordination: "Cross-links connect otherwise separate backbones",
    notice: "Permanent cross-links restrict chain motion and can create an elastic network. They are distinct from uncrossed entanglements.",
    legend: ["Segment", "Crosslink"],
    builder: buildCrosslinkedPolymer
  },
  "polymer-lamella": {
    family: "polymer",
    title: "Folded-chain polymer lamella",
    subtitle: "Semicrystalline stems, folds, and a nearby amorphous chain",
    kind: "Schematic coarse-grained model",
    prototype: "Semicrystalline lamellar morphology",
    system: "Mesoscale teaching model",
    lattice: "Local chain order; not one universal unit cell",
    cell: "Finite lamellar fragment",
    coordination: "Ordered stems connected by folds beside a disordered chain",
    notice: "The ordered stems and surface folds form one lamellar fragment. The separate loose chain represents nearby amorphous material, not a tie chain between two lamellae.",
    legend: ["Segment", "Amorphous"],
    builder: buildLamellarPolymer
  }
};

let renderer;
let scene;
let camera;
let controls;
let resizeObserver;
let modelRoot;
let cellGroup;
let linkGroup;
let currentModelId = "fcc";
let currentExtent = 5;
let ready = false;
let failureMessage = "";

async function initialise() {
  bindControls();
  populateFamilySelect();
  populateModelSelect("elemental", "fcc");
  enableCatalogueControls();
  updateText(MODELS.fcc);

  try {
    const [threeModule, orbitModule] = await Promise.all([
      import("three"),
      import("three/addons/controls/OrbitControls.js")
    ]);
    THREE = threeModule;
    OrbitControls = orbitModule.OrbitControls;

    renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      canvas: elements.canvas,
      powerPreference: "low-power",
      preserveDrawingBuffer: true
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.setClearColor(0x000000, 0);

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(38, 1, 0.05, 200);
    scene.add(new THREE.HemisphereLight(0xdcecff, 0x15163a, 2.35));

    const keyLight = new THREE.DirectionalLight(0xffffff, 3.3);
    keyLight.position.set(6, 8, 9);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x8faeff, 1.9);
    rimLight.position.set(-7, -2, -5);
    scene.add(rimLight);

    controls = new OrbitControls(camera, elements.canvas);
    controls.enableDamping = false;
    controls.enablePan = false;
    controls.minDistance = 2;
    controls.maxDistance = 80;
    controls.target.set(0, 0, 0);
    controls.addEventListener("change", render);

    ready = true;
    enableRendererControls();
    showModel(elements.model.value || "fcc", false);
    resize();

    if (typeof ResizeObserver === "function") {
      resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(elements.viewerFrame);
    } else {
      window.addEventListener("resize", resize);
    }

    elements.canvas.addEventListener("webglcontextlost", handleContextLoss);
    elements.fallback.hidden = true;
    elements.canvas.removeAttribute("aria-hidden");
    elements.canvas.setAttribute("role", "img");
    render();
  } catch (error) {
    console.error(error);
    showFailure("The interactive 3D atlas is unavailable in this browser. The structure catalogue and explanations remain readable.");
  }
}

function bindControls() {
  elements.family.addEventListener("change", () => {
    populateModelSelect(elements.family.value);
    showModel(elements.model.value);
  });

  elements.model.addEventListener("change", () => showModel(elements.model.value));
  elements.showCell.addEventListener("change", () => {
    if (cellGroup) cellGroup.visible = elements.showCell.checked;
    render();
  });
  elements.showLinks.addEventListener("change", () => {
    if (linkGroup) linkGroup.visible = elements.showLinks.checked;
    render();
  });

  elements.viewIsometric.addEventListener("click", () => setView("isometric", true));
  elements.viewA.addEventListener("click", () => setView("a", true));
  elements.viewC.addEventListener("click", () => setView("c", true));
  elements.zoomIn.addEventListener("click", () => zoomView(0.78));
  elements.zoomOut.addEventListener("click", () => zoomView(1.28));
  elements.resetView.addEventListener("click", () => setView("isometric", true));
  elements.downloadPng.addEventListener("click", downloadImage);
}

function populateFamilySelect() {
  elements.family.replaceChildren();
  FAMILIES.forEach((family) => {
    const option = document.createElement("option");
    option.value = family.id;
    option.textContent = family.label;
    elements.family.append(option);
  });
  elements.family.value = "elemental";
}

function populateModelSelect(familyId, selectedId) {
  const family = FAMILIES.find((item) => item.id === familyId) || FAMILIES[0];
  elements.model.replaceChildren();
  family.models.forEach((id) => {
    const option = document.createElement("option");
    option.value = id;
    option.textContent = MODELS[id].title;
    elements.model.append(option);
  });
  elements.model.value = selectedId && family.models.includes(selectedId) ? selectedId : family.models[0];
}

function enableCatalogueControls() {
  elements.family.disabled = false;
  elements.model.disabled = false;
}

function enableRendererControls() {
  [
    elements.showCell,
    elements.showLinks,
    elements.viewIsometric,
    elements.viewA,
    elements.viewC,
    elements.zoomIn,
    elements.zoomOut,
    elements.resetView,
    elements.downloadPng
  ].forEach((control) => { control.disabled = false; });
}

function showModel(id, announce = true) {
  const definition = MODELS[id] || MODELS.fcc;
  currentModelId = id in MODELS ? id : "fcc";
  updateText(definition);

  if (!ready || !scene || !THREE) {
    elements.status.textContent = failureMessage
      ? `${definition.title} facts selected. ${failureMessage}`
      : `${definition.title} facts selected. Preparing its 3D view.`;
    return;
  }

  if (modelRoot) {
    scene.remove(modelRoot);
    disposeObject(modelRoot);
  }

  const data = definition.builder();
  elements.canvas.dataset.atomCount = String(data.atoms.length);
  elements.canvas.dataset.guideCount = String(data.links.length + (data.extraLinks?.length || 0));
  const built = buildThreeModel(data);
  modelRoot = built.root;
  cellGroup = built.cellGroup;
  linkGroup = built.linkGroup;
  currentExtent = built.extent;
  scene.add(modelRoot);

  elements.showCell.checked = data.hasCell !== false;
  elements.showCell.disabled = data.hasCell === false;
  cellGroup.visible = elements.showCell.checked;
  elements.showLinks.checked = data.links.length > 0;
  elements.showLinks.disabled = data.links.length === 0;
  linkGroup.visible = elements.showLinks.checked;

  setView("isometric", false);
  render();

  if (announce) {
    elements.status.textContent = `${definition.title} loaded. ${definition.coordination}.`;
  } else {
    elements.status.textContent = `${definition.title} ready. Rotate the model or choose another structure.`;
  }
}

function updateText(definition) {
  elements.title.textContent = definition.title;
  elements.kind.textContent = definition.kind;
  elements.subtitle.textContent = definition.subtitle;
  elements.factPrototype.textContent = definition.prototype;
  elements.factSystem.textContent = definition.system;
  elements.factLattice.textContent = definition.lattice;
  elements.factCell.textContent = definition.cell;
  elements.factCoordination.textContent = definition.coordination;
  elements.notice.textContent = definition.notice;
  const schematic = definition.kind.startsWith("Schematic");
  elements.viewA.textContent = schematic ? "Side view" : "Along a";
  elements.viewC.textContent = schematic ? "Top view" : "Along c";
  elements.legend.replaceChildren();

  definition.legend.forEach((key) => {
    const species = SPECIES[key];
    const item = document.createElement("li");
    const swatch = document.createElement("i");
    const label = document.createElement("span");
    swatch.className = "structures-swatch";
    swatch.style.backgroundColor = `#${species.color.toString(16).padStart(6, "0")}`;
    swatch.setAttribute("aria-hidden", "true");
    label.textContent = species.label;
    item.append(swatch, label);
    elements.legend.append(item);
  });

  elements.canvas.setAttribute(
    "aria-label",
    `Interactive three-dimensional model of ${definition.title}. ${definition.cell}. ${definition.coordination}. Use the camera buttons for keyboard-accessible views.`
  );
}

function buildThreeModel(data) {
  const root = new THREE.Group();
  const atomGroup = new THREE.Group();
  const guides = new THREE.Group();
  const frame = new THREE.Group();
  const planeGroup = new THREE.Group();
  root.add(planeGroup, guides, frame, atomGroup);

  const sphereGeometry = new THREE.SphereGeometry(data.atomRadius || 0.17, 22, 16);
  const materials = new Map();

  data.atoms.forEach((atom) => {
    const style = SPECIES[atom.style || atom.element] || SPECIES.Segment;
    const materialKey = `${atom.style || atom.element}:${atom.opacity ?? 1}`;
    if (!materials.has(materialKey)) {
      materials.set(materialKey, new THREE.MeshStandardMaterial({
        color: style.color,
        emissive: new THREE.Color(style.color).multiplyScalar(0.08),
        emissiveIntensity: 0.18,
        metalness: 0.04,
        roughness: 0.34,
        transparent: (atom.opacity ?? 1) < 1,
        opacity: atom.opacity ?? 1
      }));
    }
    const mesh = new THREE.Mesh(sphereGeometry, materials.get(materialKey));
    mesh.position.fromArray(atom.position);
    const radiusScale = (style.radius || 1) * (atom.radius || 1);
    mesh.scale.setScalar(radiusScale);
    atomGroup.add(mesh);
  });

  const linkMaterial = new THREE.MeshStandardMaterial({
    color: 0xd4dcff,
    emissive: 0x263067,
    emissiveIntensity: 0.18,
    transparent: true,
    opacity: 0.66,
    roughness: 0.5
  });
  data.links.forEach((link) => {
    const a = new THREE.Vector3().fromArray(data.atoms[link[0]].position);
    const b = new THREE.Vector3().fromArray(data.atoms[link[1]].position);
    guides.add(makeCylinder(a, b, data.linkRadius || 0.035, linkMaterial));
  });

  if (data.extraLinks) {
    data.extraLinks.forEach((link) => {
      const material = new THREE.MeshBasicMaterial({
        color: link.color || 0xffd66b,
        transparent: true,
        opacity: link.opacity ?? 0.75
      });
      guides.add(makeCylinder(
        new THREE.Vector3().fromArray(link.start),
        new THREE.Vector3().fromArray(link.end),
        link.radius || 0.028,
        material
      ));
    });
  }

  if (data.cellSegments.length) {
    const points = [];
    data.cellSegments.forEach(([start, end]) => {
      points.push(...start, ...end);
    });
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(points, 3));
    const material = new THREE.LineBasicMaterial({ color: 0x86b4ff, transparent: true, opacity: 0.9 });
    frame.add(new THREE.LineSegments(geometry, material));
  }

  (data.planes || []).forEach((plane) => {
    const geometry = new THREE.PlaneGeometry(plane.width, plane.height);
    const material = new THREE.MeshBasicMaterial({
      color: plane.color,
      transparent: true,
      opacity: plane.opacity ?? 0.1,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.fromArray(plane.position);
    mesh.rotation.set(...(plane.rotation || [Math.PI / 2, 0, 0]));
    planeGroup.add(mesh);
  });

  const bounds = new THREE.Box3();
  data.atoms.forEach((atom) => bounds.expandByPoint(new THREE.Vector3().fromArray(atom.position)));
  data.cellSegments.forEach(([start, end]) => {
    bounds.expandByPoint(new THREE.Vector3().fromArray(start));
    bounds.expandByPoint(new THREE.Vector3().fromArray(end));
  });
  const center = bounds.getCenter(new THREE.Vector3());
  const size = bounds.getSize(new THREE.Vector3());
  root.position.copy(center).multiplyScalar(-1);

  return {
    root,
    cellGroup: frame,
    linkGroup: guides,
    extent: Math.max(size.x, size.y, size.z, 2)
  };
}

function setView(view, announce) {
  if (!camera || !controls) return;
  const viewScale = MODELS[currentModelId].viewScale || 1;
  const distance = Math.max(4.5, currentExtent * 1.8 * viewScale);
  camera.up.set(0, 1, 0);

  if (view === "a") {
    camera.position.set(distance, 0.16 * distance, 0.08 * distance);
  } else if (view === "c") {
    camera.up.set(0, 1, 0);
    camera.position.set(0.08 * distance, 0.1 * distance, distance);
  } else {
    camera.position.set(distance * 0.92, distance * 0.72, distance);
  }

  controls.target.set(0, 0, 0);
  controls.minDistance = Math.max(1.8, currentExtent * 0.55);
  controls.maxDistance = Math.max(18, currentExtent * 7);
  controls.update();
  render();

  if (announce) {
    const schematic = MODELS[currentModelId].kind.startsWith("Schematic");
    const names = schematic
      ? { isometric: "isometric", a: "side", c: "top" }
      : { isometric: "isometric", a: "along the a direction", c: "along the c direction" };
    elements.status.textContent = `${MODELS[currentModelId].title}: ${names[view]} view.`;
  }
}

function zoomView(factor) {
  if (!ready || !camera || !controls) return;
  const offset = camera.position.clone().sub(controls.target);
  const currentDistance = offset.length();
  const nextDistance = THREE.MathUtils.clamp(
    currentDistance * factor,
    controls.minDistance,
    controls.maxDistance
  );
  offset.setLength(nextDistance);
  camera.position.copy(controls.target).add(offset);
  controls.update();
  render();
  elements.status.textContent = `${MODELS[currentModelId].title}: ${factor < 1 ? "zoomed in" : "zoomed out"}.`;
}

function resize() {
  if (!renderer || !camera) return;
  const width = elements.viewerFrame.clientWidth;
  const height = elements.viewerFrame.clientHeight;
  if (width < 2 || height < 2) return;
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  render();
}

function render() {
  if (renderer && scene && camera) renderer.render(scene, camera);
}

function downloadImage() {
  if (!ready) return;
  const originalBackground = scene.background;
  scene.background = new THREE.Color(0xf7f9ff);
  renderer.render(scene, camera);
  const link = document.createElement("a");
  link.download = `${currentModelId}-structure.png`;
  link.href = renderer.domElement.toDataURL("image/png");
  link.click();
  scene.background = originalBackground;
  render();
  elements.status.textContent = `${MODELS[currentModelId].title} image downloaded as a PNG.`;
}

function handleContextLoss(event) {
  event.preventDefault();
  ready = false;
  elements.canvas.setAttribute("aria-hidden", "true");
  elements.canvas.removeAttribute("role");
  elements.canvas.removeAttribute("aria-label");
  showFailure("The 3D context was lost. Reload the page to restart the interactive model.");
}

function showFailure(message) {
  ready = false;
  failureMessage = message;
  elements.fallback.hidden = false;
  const strong = elements.fallback.querySelector("strong");
  const detail = elements.fallback.querySelector("span");
  const illustration = elements.fallback.querySelector("svg");
  if (strong) strong.textContent = "The interactive view is unavailable.";
  if (detail) detail.textContent = message;
  if (illustration) illustration.hidden = true;
  [
    elements.showCell,
    elements.showLinks,
    elements.viewIsometric,
    elements.viewA,
    elements.viewC,
    elements.zoomIn,
    elements.zoomOut,
    elements.resetView,
    elements.downloadPng
  ].forEach((control) => { control.disabled = true; });
  enableCatalogueControls();
  elements.status.textContent = message;
}

function disposeObject(object) {
  object.traverse((child) => {
    if (child.geometry) child.geometry.dispose();
    if (child.material) {
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      materials.forEach((material) => material.dispose());
    }
  });
}

function makeCylinder(start, end, radius, material) {
  const direction = end.clone().sub(start);
  const length = direction.length();
  const geometry = new THREE.CylinderGeometry(radius, radius, length, 10);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.copy(start).add(end).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
  return mesh;
}

const FCC_FRACTIONAL = [
  [0, 0, 0],
  [0, 0.5, 0.5],
  [0.5, 0, 0.5],
  [0.5, 0.5, 0]
];

function buildSimpleCubic() {
  const a = 3;
  return makeBasisCell({
    vectors: [[a, 0, 0], [0, a, 0], [0, 0, a]],
    basis: [{ element: "Po", frac: [0, 0, 0] }],
    linkRule: distanceRule(a, 0.025)
  });
}

function buildBcc() {
  const a = 3;
  return makeBasisCell({
    vectors: [[a, 0, 0], [0, a, 0], [0, 0, a]],
    basis: [
      { element: "Fe", frac: [0, 0, 0] },
      { element: "Fe", frac: [0.5, 0.5, 0.5] }
    ],
    linkRule: distanceRule(Math.sqrt(3) * a / 2, 0.025)
  });
}

function buildFcc() {
  const a = 3;
  return makeBasisCell({
    vectors: [[a, 0, 0], [0, a, 0], [0, 0, a]],
    basis: FCC_FRACTIONAL.map((frac) => ({ element: "Cu", frac })),
    linkRule: distanceRule(a / Math.sqrt(2), 0.018),
    atomRadius: 0.19
  });
}

function buildHcp() {
  const a = 2.35;
  const c = a * Math.sqrt(8 / 3);
  const atoms = [];

  for (const z of [-c / 2, c / 2]) {
    for (let index = 0; index < 6; index += 1) {
      const angle = index * Math.PI / 3;
      atoms.push(makeAtom("Mg", [a * Math.cos(angle), a * Math.sin(angle), z]));
    }
    atoms.push(makeAtom("Mg", [0, 0, z]));
  }

  for (const angle of [Math.PI / 6, 5 * Math.PI / 6, 3 * Math.PI / 2]) {
    atoms.push(makeAtom("Mg", [(a / Math.sqrt(3)) * Math.cos(angle), (a / Math.sqrt(3)) * Math.sin(angle), 0]));
  }

  const links = connectByRule(atoms, distanceRule(a, 0.025));
  return {
    atoms,
    links,
    cellSegments: hexagonalPrismSegments(a, c),
    planes: [],
    atomRadius: 0.18,
    linkRadius: 0.032,
    hasCell: true
  };
}

function buildDiamond() {
  const a = 3.5;
  const shifted = FCC_FRACTIONAL.map((frac) => frac.map((value) => wrap01(value + 0.25)));
  return makeBasisCell({
    vectors: [[a, 0, 0], [0, a, 0], [0, 0, a]],
    basis: [
      ...FCC_FRACTIONAL.map((frac) => ({ element: "C", frac })),
      ...shifted.map((frac) => ({ element: "C", frac }))
    ],
    linkRule: distanceRule(Math.sqrt(3) * a / 4, 0.025),
    atomRadius: 0.17,
    linkRadius: 0.042
  });
}

function buildGraphite() {
  const atoms = [];
  const links = [];
  const bondLength = 0.92;
  const layerSpacing = bondLength * 2.36;
  const a1 = [Math.sqrt(3) * bondLength, 0, 0];
  const a2 = [Math.sqrt(3) * bondLength / 2, 1.5 * bondLength, 0];
  const basis = [[0, 0, 0], [0, bondLength, 0]];

  for (let layer = 0; layer < 4; layer += 1) {
    const startIndex = atoms.length;
    const shift = layer % 2 === 0 ? [0, 0, 0] : [0, bondLength, 0];
    for (let i = -2; i < 3; i += 1) {
      for (let j = -2; j < 3; j += 1) {
        basis.forEach((site) => {
          atoms.push(makeAtom("C", [
            i * a1[0] + j * a2[0] + site[0] + shift[0],
            i * a1[1] + j * a2[1] + site[1] + shift[1],
            layer * layerSpacing
          ], { style: layer % 2 === 0 ? "C_A" : "C_B" }));
        });
      }
    }

    const layerAtoms = atoms.slice(startIndex);
    connectByRule(layerAtoms, distanceRule(bondLength, 0.035)).forEach(([a, b]) => {
      links.push([a + startIndex, b + startIndex]);
    });
  }

  const planes = Array.from({ length: 4 }, (_, layer) => ({
    width: 9.5,
    height: 8,
    position: [0, 0, layer * layerSpacing],
    rotation: [0, 0, 0],
    color: layer % 2 === 0 ? 0x7daeff : 0xff8d78,
    opacity: 0.045
  }));

  return {
    atoms,
    links,
    cellSegments: parallelepipedSegments([a1, a2, [0, 0, 2 * layerSpacing]]),
    planes,
    atomRadius: 0.16,
    linkRadius: 0.032,
    hasCell: true
  };
}

function buildNacl() {
  const a = 3.5;
  const sodium = FCC_FRACTIONAL.map((frac) => frac.map((value) => wrap01(value + 0.5)));
  return makeBasisCell({
    vectors: [[a, 0, 0], [0, a, 0], [0, 0, a]],
    basis: [
      ...FCC_FRACTIONAL.map((frac) => ({ element: "Cl", frac })),
      ...sodium.map((frac) => ({ element: "Na", frac }))
    ],
    linkRule: pairDistanceRule("Na", "Cl", a / 2, 0.025),
    atomRadius: 0.18,
    linkRadius: 0.035
  });
}

function buildCscl() {
  const a = 3.25;
  return makeBasisCell({
    vectors: [[a, 0, 0], [0, a, 0], [0, 0, a]],
    basis: [
      { element: "Cl", frac: [0, 0, 0] },
      { element: "Cs", frac: [0.5, 0.5, 0.5] }
    ],
    linkRule: pairDistanceRule("Cs", "Cl", Math.sqrt(3) * a / 2, 0.025),
    atomRadius: 0.2,
    linkRadius: 0.038
  });
}

function buildZincBlende() {
  const a = 3.5;
  const zinc = FCC_FRACTIONAL.map((frac) => frac.map((value) => wrap01(value + 0.25)));
  return makeBasisCell({
    vectors: [[a, 0, 0], [0, a, 0], [0, 0, a]],
    basis: [
      ...FCC_FRACTIONAL.map((frac) => ({ element: "S", frac })),
      ...zinc.map((frac) => ({ element: "Zn", frac }))
    ],
    linkRule: pairDistanceRule("Zn", "S", Math.sqrt(3) * a / 4, 0.025),
    atomRadius: 0.17,
    linkRadius: 0.042
  });
}

function buildWurtzite() {
  const a = 2.6;
  const c = a * Math.sqrt(8 / 3);
  const vectors = [[a, 0, 0], [-a / 2, Math.sqrt(3) * a / 2, 0], [0, 0, c]];
  const basis = [
    { element: "Zn", frac: [0, 0, 0] },
    { element: "Zn", frac: [2 / 3, 1 / 3, 0.5] },
    { element: "S", frac: [0, 0, 3 / 8] },
    { element: "S", frac: [2 / 3, 1 / 3, 7 / 8] }
  ];
  const atoms = [];

  for (let i = -1; i <= 1; i += 1) {
    for (let j = -1; j <= 1; j += 1) {
      for (let k = -1; k <= 0; k += 1) {
        basis.forEach((site) => {
          atoms.push(makeAtom(site.element, fractionalToCartesian([
            site.frac[0] + i,
            site.frac[1] + j,
            site.frac[2] + k
          ], vectors)));
        });
      }
    }
  }

  const bondLength = a * Math.sqrt(3 / 8);
  return {
    atoms,
    links: connectByRule(atoms, pairDistanceRule("Zn", "S", bondLength, 0.035)),
    cellSegments: translateSegments(parallelepipedSegments(vectors), [0, 0, -c / 2]),
    planes: [],
    atomRadius: 0.16,
    linkRadius: 0.037,
    hasCell: true
  };
}

function buildFluorite() {
  const a = 3.6;
  const fluorine = [];
  [0.25, 0.75].forEach((x) => {
    [0.25, 0.75].forEach((y) => {
      [0.25, 0.75].forEach((z) => fluorine.push([x, y, z]));
    });
  });
  return makeBasisCell({
    vectors: [[a, 0, 0], [0, a, 0], [0, 0, a]],
    basis: [
      ...FCC_FRACTIONAL.map((frac) => ({ element: "Ca", frac })),
      ...fluorine.map((frac) => ({ element: "F", frac }))
    ],
    linkRule: pairDistanceRule("Ca", "F", Math.sqrt(3) * a / 4, 0.025),
    atomRadius: 0.17,
    linkRadius: 0.032
  });
}

function buildRutile() {
  const a = 3.2;
  const c = a * 0.644;
  const u = 0.305;
  const basis = [
    { element: "Ti", frac: [0, 0, 0] },
    { element: "Ti", frac: [0.5, 0.5, 0.5] },
    { element: "O", frac: [u, u, 0] },
    { element: "O", frac: [1 - u, 1 - u, 0] },
    { element: "O", frac: [wrap01(0.5 + u), 0.5 - u, 0.5] },
    { element: "O", frac: [0.5 - u, wrap01(0.5 + u), 0.5] }
  ];
  return makeBasisCell({
    vectors: [[a, 0, 0], [0, a, 0], [0, 0, c]],
    basis,
    linkRule: rangePairRule("Ti", "O", 1.22, 1.44),
    atomRadius: 0.18,
    linkRadius: 0.035
  });
}

function buildCorundum() {
  const a = 2.25;
  const c = a * 2.73;
  const vectors = [[a, 0, 0], [-a / 2, Math.sqrt(3) * a / 2, 0], [0, 0, c]];
  const zAl = 0.3522;
  const xO = 0.3064;
  const centering = [[0, 0, 0], [2 / 3, 1 / 3, 1 / 3], [1 / 3, 2 / 3, 2 / 3]];
  const alBase = [
    [0, 0, zAl],
    [0, 0, 0.5 - zAl],
    [0, 0, wrap01(-zAl)],
    [0, 0, wrap01(0.5 + zAl)]
  ];
  const oBase = [
    [xO, 0, 0.25],
    [0, xO, 0.25],
    [-xO, -xO, 0.25],
    [-xO, 0, 0.75],
    [0, -xO, 0.75],
    [xO, xO, 0.75]
  ];
  const basis = [];

  centering.forEach((shift) => {
    alBase.forEach((frac) => basis.push({ element: "Al", frac: addWrapped(frac, shift) }));
    oBase.forEach((frac) => basis.push({ element: "O", frac: addWrapped(frac, shift) }));
  });

  const uniqueBasis = dedupeBasis(basis);
  const atoms = uniqueBasis.map((site) => makeAtom(site.element, fractionalToCartesian(site.frac, vectors)));
  const links = [];
  const ghostImages = new Map();
  const oxygenSites = uniqueBasis
    .map((site, index) => ({ ...site, index }))
    .filter((site) => site.element === "O");

  uniqueBasis.forEach((site, aluminiumIndex) => {
    if (site.element !== "Al") return;
    const aluminiumPosition = fractionalToCartesian(site.frac, vectors);
    const candidates = [];

    oxygenSites.forEach((oxygen) => {
      for (let i = -1; i <= 1; i += 1) {
        for (let j = -1; j <= 1; j += 1) {
          for (let k = -1; k <= 1; k += 1) {
            const imageFractional = [
              oxygen.frac[0] + i,
              oxygen.frac[1] + j,
              oxygen.frac[2] + k
            ];
            const imagePosition = fractionalToCartesian(imageFractional, vectors);
            candidates.push({
              oxygen,
              shift: [i, j, k],
              position: imagePosition,
              distance: distanceArrays(aluminiumPosition, imagePosition)
            });
          }
        }
      }
    });

    candidates.sort((first, second) => first.distance - second.distance);
    candidates.slice(0, 6).forEach((candidate) => {
      const isCanonical = candidate.shift.every((value) => value === 0);
      let oxygenIndex = candidate.oxygen.index;
      if (!isCanonical) {
        const key = `${candidate.oxygen.index}:${candidate.shift.join(",")}`;
        if (!ghostImages.has(key)) {
          ghostImages.set(key, atoms.length);
          atoms.push(makeAtom("O", candidate.position, { opacity: 0.34, radius: 0.82 }));
        }
        oxygenIndex = ghostImages.get(key);
      }
      links.push([aluminiumIndex, oxygenIndex]);
    });
  });

  return {
    atoms,
    links,
    cellSegments: parallelepipedSegments(vectors),
    planes: [],
    atomRadius: 0.15,
    linkRadius: 0.027,
    hasCell: true
  };
}

function buildPerovskite() {
  const a = 3.35;
  return makeBasisCell({
    vectors: [[a, 0, 0], [0, a, 0], [0, 0, a]],
    basis: [
      { element: "Sr", frac: [0, 0, 0] },
      { element: "Ti", frac: [0.5, 0.5, 0.5] },
      { element: "O", frac: [0.5, 0.5, 0] },
      { element: "O", frac: [0.5, 0, 0.5] },
      { element: "O", frac: [0, 0.5, 0.5] }
    ],
    linkRule: pairDistanceRule("Ti", "O", a / 2, 0.025),
    atomRadius: 0.18,
    linkRadius: 0.035
  });
}

function buildYbco() {
  const scale = 0.62;
  const vectors = [[3.823 * scale, 0, 0], [0, 3.886 * scale, 0], [0, 0, 11.681 * scale]];
  const basis = [
    { element: "Y", frac: [0.5, 0.5, 0.5] },
    { element: "Ba", frac: [0.5, 0.5, 0.184] },
    { element: "Ba", frac: [0.5, 0.5, 0.816] },
    { element: "Cu", frac: [0, 0, 0] },
    { element: "Cu", frac: [0, 0, 0.356] },
    { element: "Cu", frac: [0, 0, 0.644] },
    { element: "O", frac: [0, 0.5, 0] },
    { element: "O", frac: [0, 0, 0.158] },
    { element: "O", frac: [0, 0, 0.842] },
    { element: "O", frac: [0, 0.5, 0.379] },
    { element: "O", frac: [0, 0.5, 0.621] },
    { element: "O", frac: [0.5, 0, 0.377] },
    { element: "O", frac: [0.5, 0, 0.623] }
  ];
  return makeBasisCell({
    vectors,
    basis,
    linkRule: rangePairRule("Cu", "O", 0.9, 1.5),
    atomRadius: 0.16,
    linkRadius: 0.03
  });
}

function buildKaolinite() {
  const atoms = [];
  const links = [];
  addClayFramework(atoms, links, { baseZ: 0, type: "kaolinite" });

  return {
    atoms,
    links,
    cellSegments: [],
    planes: [
      { width: 5.7, height: 4.8, position: [2.7, 1.6, 0.78], rotation: [0, 0, 0], color: 0x6baeff, opacity: 0.055 },
      { width: 5.7, height: 4.8, position: [2.7, 1.6, 0], rotation: [0, 0, 0], color: 0xf1ad5f, opacity: 0.055 }
    ],
    atomRadius: 0.14,
    linkRadius: 0.025,
    hasCell: false
  };
}

function buildSmectite() {
  const atoms = [];
  const links = [];
  for (const baseZ of [-2.2, 2.2]) {
    addClayFramework(atoms, links, { baseZ, type: "smectite", showSubstitution: true });
  }

  const galleryZ = 0;
  [[0.8, 0.7], [1.8, 2.0], [3.0, 0.9], [4.2, 2.2], [2.6, 1.45], [4.7, 0.55]].forEach(([x, y]) => {
    atoms.push(makeAtom("Water", [x, y, galleryZ + 0.18 * Math.sin(x)], { radius: 0.9 }));
  });
  [[1.45, 1.35], [3.8, 1.5]].forEach(([x, y]) => {
    atoms.push(makeAtom("Cation", [x, y, galleryZ], { radius: 1.05 }));
  });

  return {
    atoms,
    links,
    cellSegments: [],
    planes: [
      ...[-2.2, 2.2].flatMap((baseZ) => [
        { width: 5.7, height: 4.8, position: [2.7, 1.6, baseZ + 0.78], rotation: [0, 0, 0], color: 0x6baeff, opacity: 0.04 },
        { width: 5.7, height: 4.8, position: [2.7, 1.6, baseZ], rotation: [0, 0, 0], color: 0xf1ad5f, opacity: 0.04 },
        { width: 5.7, height: 4.8, position: [2.7, 1.6, baseZ - 0.78], rotation: [0, 0, 0], color: 0x6baeff, opacity: 0.04 }
      ]),
      { width: 5.7, height: 4.8, position: [2.7, 1.6, galleryZ], rotation: [0, 0, 0], color: 0x79d4ee, opacity: 0.045 }
    ],
    atomRadius: 0.14,
    linkRadius: 0.025,
    hasCell: false
  };
}

function buildLinearPolymer() {
  const points = [];
  for (let index = 0; index < 24; index += 1) {
    points.push([
      (index - 11.5) * 0.45,
      index % 2 === 0 ? -0.25 : 0.25,
      0.16 * Math.sin(index * 0.55)
    ]);
  }
  return polymerDataFromChains([{ points, style: "Segment" }]);
}

function buildCoilPolymer() {
  const random = seededRandom(94721);
  const points = [[0, 0, 0]];
  let direction = new THREE.Vector3(1, 0, 0);
  for (let index = 1; index < 46; index += 1) {
    const perturbation = new THREE.Vector3(
      random() - 0.5,
      random() - 0.5,
      random() - 0.5
    ).multiplyScalar(1.35);
    direction.multiplyScalar(0.42).add(perturbation).normalize().multiplyScalar(0.48);
    const previous = new THREE.Vector3().fromArray(points[index - 1]);
    points.push(previous.add(direction).toArray());
  }
  return polymerDataFromChains([{ points, style: "Segment" }]);
}

function buildBranchedPolymer() {
  const backbone = [];
  for (let index = 0; index < 20; index += 1) {
    backbone.push([(index - 9.5) * 0.48, index % 2 ? 0.22 : -0.22, 0]);
  }
  const data = polymerDataFromChains([{ points: backbone, style: "Segment" }]);
  [4, 9, 14].forEach((anchorIndex, branchNumber) => {
    const anchor = backbone[anchorIndex];
    const sign = branchNumber % 2 === 0 ? 1 : -1;
    const branch = [];
    for (let step = 1; step <= 6; step += 1) {
      branch.push([
        anchor[0] + 0.12 * step,
        anchor[1] + sign * 0.48 * step,
        0.18 * Math.sin(step)
      ]);
    }
    const firstBranchIndex = data.atoms.length;
    addChainToData(data, branch, "Branch");
    data.links.push([anchorIndex, firstBranchIndex]);
  });
  return data;
}

function buildCrosslinkedPolymer() {
  const chains = [];
  for (let row = -2; row <= 2; row += 1) {
    const points = [];
    for (let index = 0; index < 15; index += 1) {
      points.push([(index - 7) * 0.48, row * 0.95 + (index % 2 ? 0.15 : -0.15), 0.15 * Math.sin(index + row)]);
    }
    chains.push({ points, style: "Segment" });
  }

  const data = polymerDataFromChains(chains);
  const chainLength = 15;
  [3, 7, 11].forEach((column, linkIndex) => {
    for (let row = 0; row < 4; row += 1) {
      const a = row * chainLength + column;
      const b = (row + 1) * chainLength + column + (linkIndex % 2);
      data.extraLinks.push({
        start: data.atoms[a].position,
        end: data.atoms[b].position,
        color: SPECIES.Crosslink.color,
        radius: 0.055,
        opacity: 0.95
      });
    }
  });
  return data;
}

function buildLamellarPolymer() {
  const points = [];
  const stems = 7;
  const stemPoints = 12;
  const spacing = 0.68;

  for (let stem = 0; stem < stems; stem += 1) {
    const x = (stem - (stems - 1) / 2) * spacing;
    const upward = stem % 2 === 0;
    for (let step = 0; step < stemPoints; step += 1) {
      const yIndex = upward ? step : stemPoints - 1 - step;
      points.push([x, (yIndex - (stemPoints - 1) / 2) * 0.42, 0.12 * Math.sin(stem * 0.7)]);
    }
    if (stem < stems - 1) {
      const top = upward ? stemPoints - 1 : 0;
      const y = (top - (stemPoints - 1) / 2) * 0.42;
      points.push([x + spacing * 0.34, y + (upward ? 0.28 : -0.28), 0.25]);
      points.push([x + spacing * 0.66, y + (upward ? 0.28 : -0.28), 0.25]);
    }
  }

  const data = polymerDataFromChains([{ points, style: "Segment" }]);
  const amorphousStart = data.atoms.length;
  const amorphousChain = [];
  for (let index = 0; index < 17; index += 1) {
    amorphousChain.push([
      -2.1 + index * 0.27,
      -3.15 + 0.28 * Math.sin(index * 0.8),
      0.75 + 0.12 * Math.cos(index)
    ]);
  }
  addChainToData(data, amorphousChain, "Amorphous");
  data.atoms.slice(amorphousStart).forEach((atom) => { atom.radius = 0.9; });
  return data;
}

function addClayFramework(atoms, links, { baseZ, type, showSubstitution = false }) {
  const size = 3;
  const spacing = 1.05;
  const a1 = [Math.sqrt(3) * spacing, 0];
  const a2 = [Math.sqrt(3) * spacing / 2, 1.5 * spacing];
  const metal = new Map();
  const topSilicon = new Map();
  const bottomSilicon = new Map();
  const key = (site, i, j) => `${site}:${i}:${j}`;
  const latticePoint = (i, j) => [i * a1[0] + j * a2[0], i * a1[1] + j * a2[1]];

  for (let i = 0; i < size; i += 1) {
    for (let j = 0; j < size; j += 1) {
      const origin = latticePoint(i, j);
      const aElement = showSubstitution && i === 1 && j === 1 ? "Mg" : "Al";
      const aIndex = atoms.length;
      atoms.push(makeAtom(aElement, [origin[0], origin[1], baseZ]));
      metal.set(key("A", i, j), aIndex);
      const bIndex = atoms.length;
      atoms.push(makeAtom("Al", [origin[0], origin[1] + spacing, baseZ]));
      metal.set(key("B", i, j), bIndex);
    }
  }

  for (let i = 0; i < size; i += 1) {
    for (let j = 0; j < size; j += 1) {
      [[i, j - 1], [i + 1, j - 1]].forEach(([paddingI, paddingJ]) => {
        const paddingKey = key("B", paddingI, paddingJ);
        if (metal.has(paddingKey)) return;
        const origin = latticePoint(paddingI, paddingJ);
        const paddingIndex = atoms.length;
        atoms.push(makeAtom("Al", [origin[0], origin[1] + spacing, baseZ], {
          opacity: 0.28,
          radius: 0.86
        }));
        metal.set(paddingKey, paddingIndex);
      });
    }
  }

  for (let i = 0; i < size; i += 1) {
    for (let j = 0; j < size; j += 1) {
      const aKey = key("A", i, j);
      const first = metal.get(aKey);
      const edgeClasses = [
        { edge: 0, bKey: key("B", i, j) },
        { edge: 1, bKey: key("B", i, j - 1) },
        { edge: 2, bKey: key("B", i + 1, j - 1) }
      ];

      edgeClasses.forEach(({ edge, bKey }) => {
        const second = metal.get(bKey);
        if (second === undefined) return;
        let species = "OH";
        let z = baseZ - 0.3;
        if (type === "kaolinite" && edge === 0) {
          species = "O";
          z = baseZ + 0.32;
        } else if (type === "smectite" && edge === 0) {
          species = "O";
          z = baseZ + 0.32;
        } else if (type === "smectite" && edge === 1) {
          species = "O";
          z = baseZ - 0.32;
        } else if (type === "smectite") {
          z = baseZ;
        }

        const ligandPair = addSharedClayLigandPair(atoms, links, first, second, z, species);
        if (edge === 0) {
          addClaySiliconPair(atoms, links, topSilicon, aKey, bKey, ligandPair, 1);
        } else if (type === "smectite" && edge === 1) {
          addClaySiliconPair(atoms, links, bottomSilicon, aKey, bKey, ligandPair, -1);
        }
      });
    }
  }

  connectClaySiliconSheet(atoms, links, topSilicon, size, 1, key);
  if (type === "smectite") connectClaySiliconSheet(atoms, links, bottomSilicon, size, -1, key);
}

function addSharedClayLigandPair(atoms, links, firstIndex, secondIndex, z, species) {
  const first = atoms[firstIndex].position;
  const second = atoms[secondIndex].position;
  const dx = second[0] - first[0];
  const dy = second[1] - first[1];
  const length = Math.hypot(dx, dy) || 1;
  const nx = -dy / length;
  const ny = dx / length;
  const midpoint = [(first[0] + second[0]) / 2, (first[1] + second[1]) / 2];
  const pair = [-1, 1].map((sign) => {
    const index = atoms.length;
    atoms.push(makeAtom(species, [
      midpoint[0] + sign * 0.12 * nx,
      midpoint[1] + sign * 0.12 * ny,
      z
    ]));
    links.push([firstIndex, index], [secondIndex, index]);
    return index;
  });
  return pair;
}

function addClaySiliconPair(atoms, links, siliconMap, aKey, bKey, ligandPair, direction) {
  [[aKey, ligandPair[0]], [bKey, ligandPair[1]]].forEach(([siteKey, ligandIndex]) => {
    if (siliconMap.has(siteKey)) return;
    const ligand = atoms[ligandIndex].position;
    const siliconIndex = atoms.length;
    atoms.push(makeAtom("Si", [ligand[0], ligand[1], ligand[2] + direction * 0.46]));
    links.push([siliconIndex, ligandIndex]);
    siliconMap.set(siteKey, siliconIndex);
  });
}

function connectClaySiliconSheet(atoms, links, siliconMap, size, direction, key) {
  for (let i = 0; i < size; i += 1) {
    for (let j = 0; j < size; j += 1) {
      const aIndex = siliconMap.get(key("A", i, j));
      if (aIndex === undefined) continue;
      const neighbours = [
        key("B", i, j),
        key("B", i, j - 1),
        key("B", i + 1, j - 1)
      ];
      neighbours.forEach((neighbourKey) => {
        const bIndex = siliconMap.get(neighbourKey);
        if (bIndex === undefined) return;
        const first = atoms[aIndex].position;
        const second = atoms[bIndex].position;
        const oxygenIndex = atoms.length;
        atoms.push(makeAtom("O", [
          (first[0] + second[0]) / 2,
          (first[1] + second[1]) / 2,
          (first[2] + second[2]) / 2 + direction * 0.27
        ]));
        links.push([aIndex, oxygenIndex], [bIndex, oxygenIndex]);
      });
    }
  }
}

function polymerDataFromChains(chains) {
  const data = {
    atoms: [],
    links: [],
    extraLinks: [],
    cellSegments: [],
    planes: [],
    atomRadius: 0.16,
    linkRadius: 0.045,
    hasCell: false
  };
  chains.forEach((chain) => addChainToData(data, chain.points, chain.style, chain.skipFirstAtom));
  return data;
}

function addChainToData(data, points, style, skipFirstAtom = false) {
  const startIndex = data.atoms.length;
  points.forEach((position, index) => {
    if (index === 0 && skipFirstAtom) return;
    data.atoms.push(makeAtom(style, position, { style }));
  });
  const offset = skipFirstAtom ? 1 : 0;
  for (let index = 0; index < points.length - 1 - offset; index += 1) {
    data.links.push([startIndex + index, startIndex + index + 1]);
  }
}

function makeBasisCell({ vectors, basis, linkRule, atomRadius = 0.18, linkRadius = 0.035, expandBoundary = true }) {
  const displayBasis = expandBoundary ? expandBoundaryBasis(basis) : dedupeBasis(basis);
  const atoms = displayBasis.map((site) => makeAtom(
    site.element,
    fractionalToCartesian(site.frac, vectors),
    { style: site.style, radius: site.radius, opacity: site.opacity }
  ));
  return {
    atoms,
    links: linkRule ? connectByRule(atoms, linkRule) : [],
    cellSegments: parallelepipedSegments(vectors),
    planes: [],
    atomRadius,
    linkRadius,
    hasCell: true
  };
}

function makeAtom(element, position, options = {}) {
  return {
    element,
    style: options.style || element,
    position: position.map(Number),
    radius: options.radius,
    opacity: options.opacity
  };
}

function findOrAddAtom(atoms, element, position, tolerance) {
  const existing = atoms.findIndex((atom) => atom.element === element && distanceArrays(atom.position, position) < tolerance);
  if (existing >= 0) return existing;
  atoms.push(makeAtom(element, position));
  return atoms.length - 1;
}

function expandBoundaryBasis(basis) {
  const expanded = [];
  basis.forEach((site) => {
    const choices = site.frac.map((value) => Math.abs(value) < 1e-9 ? [0, 1] : [value]);
    choices[0].forEach((x) => choices[1].forEach((y) => choices[2].forEach((z) => {
      expanded.push({ ...site, frac: [x, y, z] });
    })));
  });
  return dedupeBasis(expanded);
}

function dedupeBasis(basis) {
  const unique = new Map();
  basis.forEach((site) => {
    const key = `${site.element}:${site.frac.map((value) => wrap01ForKey(value).toFixed(6)).join(",")}:${site.frac.map((value) => value === 1 ? "1" : "0").join("")}`;
    if (!unique.has(key)) unique.set(key, site);
  });
  return [...unique.values()];
}

function fractionalToCartesian(frac, vectors) {
  return [0, 1, 2].map((axis) =>
    frac[0] * vectors[0][axis] + frac[1] * vectors[1][axis] + frac[2] * vectors[2][axis]
  );
}

function parallelepipedSegments(vectors) {
  const vertices = [];
  for (const i of [0, 1]) {
    for (const j of [0, 1]) {
      for (const k of [0, 1]) vertices.push(fractionalToCartesian([i, j, k], vectors));
    }
  }
  const index = (i, j, k) => i * 4 + j * 2 + k;
  const segments = [];
  for (const i of [0, 1]) {
    for (const j of [0, 1]) segments.push([vertices[index(i, j, 0)], vertices[index(i, j, 1)]]);
  }
  for (const i of [0, 1]) {
    for (const k of [0, 1]) segments.push([vertices[index(i, 0, k)], vertices[index(i, 1, k)]]);
  }
  for (const j of [0, 1]) {
    for (const k of [0, 1]) segments.push([vertices[index(0, j, k)], vertices[index(1, j, k)]]);
  }
  return segments;
}

function translateSegments(segments, offset) {
  return segments.map(([start, end]) => [
    start.map((value, index) => value + offset[index]),
    end.map((value, index) => value + offset[index])
  ]);
}

function hexagonalPrismSegments(radius, height) {
  const bottom = [];
  const top = [];
  for (let index = 0; index < 6; index += 1) {
    const angle = index * Math.PI / 3;
    bottom.push([radius * Math.cos(angle), radius * Math.sin(angle), -height / 2]);
    top.push([radius * Math.cos(angle), radius * Math.sin(angle), height / 2]);
  }
  const segments = [];
  for (let index = 0; index < 6; index += 1) {
    const next = (index + 1) % 6;
    segments.push([bottom[index], bottom[next]], [top[index], top[next]], [bottom[index], top[index]]);
  }
  return segments;
}

function connectByRule(atoms, rule) {
  const links = [];
  for (let first = 0; first < atoms.length; first += 1) {
    for (let second = first + 1; second < atoms.length; second += 1) {
      const distance = distanceArrays(atoms[first].position, atoms[second].position);
      if (rule(atoms[first], atoms[second], distance)) links.push([first, second]);
    }
  }
  return links;
}

function connectNearestUnlike(atoms, firstElement, secondElement, neighboursPerFirst) {
  const links = new Set();
  atoms.forEach((atom, firstIndex) => {
    if (atom.element !== firstElement) return;
    const nearest = atoms
      .map((candidate, secondIndex) => ({
        secondIndex,
        element: candidate.element,
        distance: distanceArrays(atom.position, candidate.position)
      }))
      .filter((candidate) => candidate.element === secondElement)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, neighboursPerFirst);
    nearest.forEach(({ secondIndex }) => links.add(`${Math.min(firstIndex, secondIndex)},${Math.max(firstIndex, secondIndex)}`));
  });
  return [...links].map((key) => key.split(",").map(Number));
}

function distanceRule(target, relativeTolerance) {
  return (_first, _second, distance) => Math.abs(distance - target) <= target * relativeTolerance;
}

function pairDistanceRule(firstElement, secondElement, target, relativeTolerance) {
  return (first, second, distance) => {
    const correctPair = (first.element === firstElement && second.element === secondElement)
      || (first.element === secondElement && second.element === firstElement);
    return correctPair && Math.abs(distance - target) <= target * relativeTolerance;
  };
}

function rangePairRule(firstElement, secondElement, minimum, maximum) {
  return (first, second, distance) => {
    const correctPair = (first.element === firstElement && second.element === secondElement)
      || (first.element === secondElement && second.element === firstElement);
    return correctPair && distance >= minimum && distance <= maximum;
  };
}

function addWrapped(first, second) {
  return first.map((value, index) => wrap01(value + second[index]));
}

function wrap01(value) {
  return ((value % 1) + 1) % 1;
}

function wrap01ForKey(value) {
  if (Math.abs(value - 1) < 1e-9) return 1;
  return wrap01(value);
}

function distanceArrays(first, second) {
  return Math.hypot(first[0] - second[0], first[1] - second[1], first[2] - second[2]);
}

function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

if (requiredElements.every(Boolean)) {
  void initialise();
}
