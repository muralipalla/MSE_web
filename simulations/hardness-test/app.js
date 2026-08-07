(function initializeHardnessLab(globalObject) {
  "use strict";

  const KG_FORCE_TO_NEWTONS = 9.80665;
  const BALL_DIAMETER_MM = 10;
  const ANIMATION_SPEED = 0.2;
  const T_CRITICAL_95 = {
    2: 12.706,
    3: 4.303,
    4: 3.182,
    5: 2.776,
    6: 2.571
  };

  const MATERIALS = {
    "aluminium-6061": {
      id: "aluminium-6061",
      name: "Aluminium 6061-T6",
      shortName: "6061-T6 aluminium",
      colors: ["#dce4e7", "#7d8c96"],
      variation: 0.012,
      note: "A precipitation-hardened aluminium alloy. The Brinell preset is anchored at 95 HBW; its Vickers value is a representative native-scale teaching preset, not a universal hardness conversion.",
      methods: {
        brinell: { nominalHardness: 95, defaultLoad: 500, loads: [500, 1000] },
        vickers: { nominalHardness: 107, defaultLoad: 10, loads: [1, 10, 30] }
      }
    },
    "bronze-c93600": {
      id: "bronze-c93600",
      name: "C93600 leaded-tin bronze",
      shortName: "C93600 bronze",
      colors: ["#c89863", "#785335"],
      variation: 0.02,
      note: "A relatively soft cast copper alloy. Its slightly larger local variation represents casting-scale heterogeneity without changing the selected average condition.",
      methods: {
        brinell: { nominalHardness: 65, defaultLoad: 500, loads: [500, 1000] },
        vickers: { nominalHardness: 75, defaultLoad: 10, loads: [1, 10, 30] }
      }
    },
    "formax-steel": {
      id: "formax-steel",
      name: "Uddeholm Formax low-carbon steel",
      shortName: "Formax steel",
      colors: ["#b8c2c9", "#586a76"],
      variation: 0.01,
      note: "A low-carbon mould steel supplied near 170 HBW. The Vickers preset is representative and remains separate from the source Brinell value.",
      methods: {
        brinell: { nominalHardness: 170, defaultLoad: 3000, loads: [1500, 3000] },
        vickers: { nominalHardness: 180, defaultLoad: 10, loads: [1, 10, 30] }
      }
    },
    "nist-nickel": {
      id: "nist-nickel",
      name: "Hard nickel reference",
      shortName: "Hard nickel reference",
      colors: ["#c5ccd2", "#59636c"],
      variation: 0.008,
      note: "A high-hardness Vickers reference inspired by NIST microhardness blocks. The smaller HV0.5 indentation requires careful focus and micrometre-scale placement.",
      methods: {
        vickers: { nominalHardness: 600, defaultLoad: 0.5, loads: [0.1, 0.5, 1] }
      }
    },
    "nist-hardmetal": {
      id: "nist-hardmetal",
      name: "Ceramic / hardmetal reference",
      shortName: "Hardmetal reference",
      colors: ["#ece9e2", "#807b72"],
      variation: 0.015,
      note: "A very hard Vickers reference near 1530 HV. Brinell is not offered because a diamond microindentation method is more appropriate for this teaching specimen.",
      methods: {
        vickers: { nominalHardness: 1530, defaultLoad: 1, loads: [0.5, 1] }
      }
    }
  };

  function clamp(value, minimum, maximum) {
    return Math.min(maximum, Math.max(minimum, value));
  }

  function mean(values) {
    return values.reduce((total, value) => total + value, 0) / values.length;
  }

  function brinellHardness(loadKgf, ballDiameterMm, indentationDiameterMm) {
    if (!(loadKgf > 0) || !(ballDiameterMm > 0) || !(indentationDiameterMm > 0) || indentationDiameterMm >= ballDiameterMm) {
      return NaN;
    }
    const root = Math.sqrt(ballDiameterMm * ballDiameterMm - indentationDiameterMm * indentationDiameterMm);
    return (2 * loadKgf) / (Math.PI * ballDiameterMm * (ballDiameterMm - root));
  }

  function vickersHardness(loadKgf, averageDiagonalMm) {
    if (!(loadKgf > 0) || !(averageDiagonalMm > 0)) {
      return NaN;
    }
    return 1.8544 * loadKgf / (averageDiagonalMm * averageDiagonalMm);
  }

  function brinellDiameterFromHardness(loadKgf, ballDiameterMm, hardness) {
    if (!(loadKgf > 0) || !(ballDiameterMm > 0) || !(hardness > 0)) {
      return NaN;
    }
    const capTerm = 2 * loadKgf / (Math.PI * ballDiameterMm * hardness);
    const squaredDiameter = 2 * ballDiameterMm * capTerm - capTerm * capTerm;
    return Math.sqrt(Math.max(0, squaredDiameter));
  }

  function vickersDiagonalFromHardness(loadKgf, hardness) {
    if (!(loadKgf > 0) || !(hardness > 0)) {
      return NaN;
    }
    return Math.sqrt(1.8544 * loadKgf / hardness);
  }

  function indentationDepth(method, dimensionMm, ballDiameterMm) {
    if (method === "vickers") {
      return dimensionMm / 7;
    }
    const root = Math.sqrt(Math.max(0, ballDiameterMm * ballDiameterMm - dimensionMm * dimensionMm));
    return (ballDiameterMm - root) / 2;
  }

  function hardnessFromDimensions(method, loadKgf, ballDiameterMm, diameterOne, diameterTwo) {
    const averageDimension = (diameterOne + diameterTwo) / 2;
    return method === "brinell"
      ? brinellHardness(loadKgf, ballDiameterMm, averageDimension)
      : vickersHardness(loadKgf, averageDimension);
  }

  function summaryStatistics(values) {
    if (!Array.isArray(values) || values.length < 2 || values.some((value) => !Number.isFinite(value))) {
      return null;
    }
    const average = mean(values);
    const variance = values.reduce((total, value) => total + (value - average) ** 2, 0) / (values.length - 1);
    const sampleStandardDeviation = Math.sqrt(variance);
    const standardUncertainty = sampleStandardDeviation / Math.sqrt(values.length);
    const tMultiplier = T_CRITICAL_95[values.length] || 1.96;
    const expandedUncertainty = tMultiplier * standardUncertainty;
    return {
      n: values.length,
      mean: average,
      sampleStandardDeviation,
      standardUncertainty,
      tMultiplier,
      expandedUncertainty,
      relativeExpandedPercent: average === 0 ? NaN : expandedUncertainty / average * 100
    };
  }

  function quantize(value, increment) {
    return Math.round(value / increment) * increment;
  }

  function mulberry32(seed) {
    let state = seed >>> 0;
    return function random() {
      state += 0x6D2B79F5;
      let value = state;
      value = Math.imul(value ^ value >>> 15, value | 1);
      value ^= value + Math.imul(value ^ value >>> 7, value | 61);
      return ((value ^ value >>> 14) >>> 0) / 4294967296;
    };
  }

  function gaussianFromSeed(seed, salt) {
    const random = mulberry32((seed ^ Math.imul(salt + 1, 0x9E3779B1)) >>> 0);
    const first = Math.max(random(), 1e-12);
    const second = random();
    return Math.sqrt(-2 * Math.log(first)) * Math.cos(2 * Math.PI * second);
  }

  function randomFromSeed(seed, salt) {
    return mulberry32((seed ^ Math.imul(salt + 7, 0x85EBCA6B)) >>> 0)();
  }

  function createTrial(parameters) {
    const {
      method,
      nominalHardness,
      loadKgf,
      ballDiameterMm = BALL_DIAMETER_MM,
      specimenBias = 0,
      localVariation = 0.01,
      seed,
      trialIndex,
      location
    } = parameters;
    const localBias = clamp(gaussianFromSeed(seed, 50 + trialIndex) * localVariation, -0.05, 0.05);
    const hiddenHardness = nominalHardness * (1 + specimenBias) * (1 + localBias);
    const meanDimension = method === "brinell"
      ? brinellDiameterFromHardness(loadKgf, ballDiameterMm, hiddenHardness)
      : vickersDiagonalFromHardness(loadKgf, hiddenHardness);
    const asymmetrySigma = method === "brinell" ? 0.0025 : 0.0035;
    const asymmetry = clamp(gaussianFromSeed(seed, 100 + trialIndex) * asymmetrySigma, -0.012, 0.012);
    const trueDiameterOne = meanDimension * (1 + asymmetry);
    const trueDiameterTwo = meanDimension * (1 - asymmetry);
    const increment = method === "brinell" ? 0.01 : 0.001;
    const initialDiameterOne = quantize(trueDiameterOne * (0.91 + randomFromSeed(seed, 150 + trialIndex) * 0.05), increment);
    const initialDiameterTwo = quantize(trueDiameterTwo * (1.04 + randomFromSeed(seed, 180 + trialIndex) * 0.04), increment);
    return {
      trialIndex,
      location,
      hiddenHardness,
      meanDimension,
      trueDiameterOne,
      trueDiameterTwo,
      initialDiameterOne,
      initialDiameterTwo,
      focusTarget: Math.round(58 + randomFromSeed(seed, 220 + trialIndex) * 30),
      pixelsPerMm: 180 / meanDimension,
      depthMm: indentationDepth(method, meanDimension, ballDiameterMm)
    };
  }

  const publicModel = {
    BALL_DIAMETER_MM,
    KG_FORCE_TO_NEWTONS,
    MATERIALS,
    T_CRITICAL_95,
    brinellDiameterFromHardness,
    brinellHardness,
    createTrial,
    hardnessFromDimensions,
    indentationDepth,
    summaryStatistics,
    vickersDiagonalFromHardness,
    vickersHardness
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = publicModel;
  }
  globalObject.HardnessLabModel = publicModel;

  if (typeof document === "undefined") {
    return;
  }

  const elements = {
    methodSelect: document.querySelector("#method-select"),
    materialSelect: document.querySelector("#material-select"),
    loadSelect: document.querySelector("#load-select"),
    dwellSelect: document.querySelector("#dwell-select"),
    readingCountSelect: document.querySelector("#reading-count-select"),
    indenterSummary: document.querySelector("#indenter-summary"),
    notationSummary: document.querySelector("#notation-summary"),
    forceSummary: document.querySelector("#force-summary"),
    resolutionSummary: document.querySelector("#resolution-summary"),
    materialNote: document.querySelector("#material-note"),
    specimenMap: document.querySelector("#specimen-map"),
    locationPoints: Array.from(document.querySelectorAll(".location-point")),
    mountSpecimen: document.querySelector("#mount-specimen"),
    startIndentation: document.querySelector("#start-indentation"),
    pauseAnimation: document.querySelector("#pause-animation"),
    resetExperiment: document.querySelector("#reset-experiment"),
    machineState: document.querySelector("#machine-state"),
    statusCopy: document.querySelector("#status-copy"),
    testerSvg: document.querySelector("#tester-svg"),
    testerDescription: document.querySelector("#tester-svg-description"),
    movingHeadGroup: document.querySelector("#moving-head-group"),
    ballIndenter: document.querySelector("#ball-indenter"),
    vickersIndenter: document.querySelector("#vickers-indenter"),
    sampleSurface: document.querySelector("#sample-surface"),
    sampleStopLight: document.querySelector("#sample-stop-light"),
    sampleStopDark: document.querySelector("#sample-stop-dark"),
    plasticZone: document.querySelector("#plastic-zone"),
    residualIndent: document.querySelector("#residual-indent"),
    forceFill: document.querySelector("#force-fill"),
    testerMethodLabel: document.querySelector("#tester-method-label"),
    dwellCounter: document.querySelector("#dwell-counter"),
    stageExplanation: document.querySelector("#stage-explanation"),
    microscopeSvg: document.querySelector("#microscope-svg"),
    microscopeDescription: document.querySelector("#microscope-svg-description"),
    lensSurface: document.querySelector("#lens-surface"),
    focusBlurNode: document.querySelector("#focus-blur-node"),
    brinellImpression: document.querySelector("#brinell-impression"),
    vickersImpression: document.querySelector("#vickers-impression"),
    pileupRing: document.querySelector("#pileup-ring"),
    measurementOverlay: document.querySelector("#measurement-overlay"),
    horizontalScaleBand: document.querySelector("#horizontal-scale-band"),
    verticalScaleBand: document.querySelector("#vertical-scale-band"),
    horizontalGradations: document.querySelector("#horizontal-gradations"),
    verticalGradations: document.querySelector("#vertical-gradations"),
    measureHorizontal: document.querySelector("#measure-horizontal"),
    measureVertical: document.querySelector("#measure-vertical"),
    handleLeft: document.querySelector("#handle-left"),
    handleRight: document.querySelector("#handle-right"),
    handleTop: document.querySelector("#handle-top"),
    handleBottom: document.querySelector("#handle-bottom"),
    horizontalToolLabel: document.querySelector("#horizontal-tool-label"),
    verticalToolLabel: document.querySelector("#vertical-tool-label"),
    microscopePlaceholder: document.querySelector("#microscope-placeholder"),
    focusRange: document.querySelector("#focus-range"),
    focusOutput: document.querySelector("#focus-output"),
    autofocus: document.querySelector("#autofocus"),
    diameterOneLabel: document.querySelector("#diameter-one-label"),
    diameterTwoLabel: document.querySelector("#diameter-two-label"),
    diameterOneRange: document.querySelector("#diameter-one-range"),
    diameterTwoRange: document.querySelector("#diameter-two-range"),
    diameterOneOutput: document.querySelector("#diameter-one-output"),
    diameterTwoOutput: document.querySelector("#diameter-two-output"),
    resetCalipers: document.querySelector("#reset-calipers"),
    recordDimensions: document.querySelector("#record-dimensions"),
    measurementMessage: document.querySelector("#measurement-message"),
    phaseValue: document.querySelector("#phase-value"),
    liveForceValue: document.querySelector("#live-force-value"),
    depthValue: document.querySelector("#depth-value"),
    liveD1Label: document.querySelector("#live-d1-label"),
    liveD2Label: document.querySelector("#live-d2-label"),
    liveD1Value: document.querySelector("#live-d1-value"),
    liveD2Value: document.querySelector("#live-d2-value"),
    meanDiameterValue: document.querySelector("#mean-diameter-value"),
    formulaDisplay: document.querySelector("#formula-display"),
    formulaSubstitution: document.querySelector("#formula-substitution"),
    hardnessForm: document.querySelector("#hardness-form"),
    hardnessAnswerLabel: document.querySelector("#hardness-answer-label"),
    hardnessAnswer: document.querySelector("#hardness-answer"),
    hardnessUnit: document.querySelector("#hardness-unit"),
    checkHardness: document.querySelector("#check-hardness"),
    showWorkedResult: document.querySelector("#show-worked-result"),
    hardnessFeedback: document.querySelector("#hardness-feedback"),
    newLocation: document.querySelector("#new-location"),
    downloadCsv: document.querySelector("#download-csv"),
    recordProgress: document.querySelector("#record-progress"),
    recordsBody: document.querySelector("#records-body"),
    quizPanel: document.querySelector("#quiz-panel"),
    quizLockMessage: document.querySelector("#quiz-lock-message"),
    quizForm: document.querySelector("#quiz-form"),
    firstHardnessHint: document.querySelector("#first-hardness-hint"),
    expandedHint: document.querySelector("#expanded-hint"),
    checkQuiz: document.querySelector("#check-quiz"),
    quizResult: document.querySelector("#quiz-result"),
    resultsVisual: document.querySelector("#results-visual"),
    resultsPlot: document.querySelector("#results-plot"),
    reportedResult: document.querySelector("#reported-result")
  };

  const missingElement = Object.entries(elements).find(([, value]) => value === null);
  if (missingElement) {
    console.warn(`Hardness simulation could not initialize: missing ${missingElement[0]}.`);
    return;
  }

  const motionPreference = globalObject.matchMedia("(prefers-reduced-motion: reduce)");
  const LOCATION_NAMES = elements.locationPoints.map((button) => button.dataset.location);
  const state = {
    method: elements.methodSelect.value,
    materialId: "",
    loadKgf: 0,
    dwellSeconds: Number(elements.dwellSelect.value),
    targetReadings: Number(elements.readingCountSelect.value),
    status: "setup",
    phase: "Not mounted",
    selectedLocation: "A",
    usedLocations: [],
    readings: [],
    currentTrial: null,
    seed: 0,
    specimenBias: 0,
    animationFrame: 0,
    animationProgress: 0,
    animationLastTime: 0,
    animationPaused: false,
    focus: 50,
    measuredDiameterOne: 0,
    measuredDiameterTwo: 0,
    caliperAdjusted: { one: false, two: false },
    dragHandle: null,
    pendingReadingIndex: -1,
    hardnessAttempts: 0,
    lastAnnouncedPhase: ""
  };

  function currentMaterial() {
    return MATERIALS[state.materialId];
  }

  function currentMethodData() {
    return currentMaterial().methods[state.method];
  }

  function dimensionIncrement() {
    return state.method === "brinell" ? 0.01 : 0.001;
  }

  function dimensionDigits() {
    return state.method === "brinell" ? 2 : 3;
  }

  function hardnessUnit() {
    return state.method === "brinell" ? "HBW" : "HV";
  }

  function loadNotation() {
    if (state.method === "brinell") {
      return `HBW ${BALL_DIAMETER_MM}/${formatCompactNumber(state.loadKgf)}`;
    }
    return `HV${formatCompactNumber(state.loadKgf)}`;
  }

  function formatCompactNumber(value) {
    return Number.isInteger(value) ? String(value) : String(value).replace(/0+$/, "").replace(/\.$/, "");
  }

  function formatNumber(value, digits) {
    if (!Number.isFinite(value)) {
      return "—";
    }
    return value.toLocaleString(undefined, {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits
    });
  }

  function formatForce(loadKgf, includeKgf) {
    const newtons = loadKgf * KG_FORCE_TO_NEWTONS;
    const forceText = newtons >= 1000
      ? `${formatNumber(newtons / 1000, 3)} kN`
      : `${formatNumber(newtons, newtons < 10 ? 3 : 1)} N`;
    return includeKgf ? `${forceText} (${formatCompactNumber(loadKgf)} kgf)` : forceText;
  }

  function availableMaterials() {
    return Object.values(MATERIALS).filter((material) => material.methods[state.method]);
  }

  function populateMaterialOptions(preferredId) {
    const options = availableMaterials();
    elements.materialSelect.replaceChildren();
    options.forEach((material) => {
      const option = document.createElement("option");
      option.value = material.id;
      option.textContent = material.name;
      elements.materialSelect.append(option);
    });
    const selected = options.some((material) => material.id === preferredId) ? preferredId : options[0].id;
    elements.materialSelect.value = selected;
    state.materialId = selected;
  }

  function populateLoadOptions(preferredLoad) {
    const methodData = currentMethodData();
    elements.loadSelect.replaceChildren();
    methodData.loads.forEach((load) => {
      const option = document.createElement("option");
      option.value = String(load);
      option.textContent = `${formatCompactNumber(load)} kgf (${formatForce(load, false)})`;
      elements.loadSelect.append(option);
    });
    const selected = methodData.loads.includes(preferredLoad) ? preferredLoad : methodData.defaultLoad;
    elements.loadSelect.value = String(selected);
    state.loadKgf = selected;
  }

  function updateSetupSummary() {
    const material = currentMaterial();
    elements.indenterSummary.textContent = state.method === "brinell"
      ? `${BALL_DIAMETER_MM} mm tungsten-carbide ball`
      : "136° square-based diamond pyramid";
    elements.notationSummary.textContent = loadNotation();
    elements.forceSummary.textContent = formatForce(state.loadKgf, true);
    elements.resolutionSummary.textContent = state.method === "brinell" ? "0.01 mm" : "0.001 mm (1 µm)";
    elements.materialNote.textContent = material.note;
    elements.hardnessUnit.textContent = hardnessUnit();
    elements.hardnessAnswerLabel.textContent = `Your calculated ${hardnessUnit()} value`;
    elements.liveD1Label.textContent = state.method === "brinell" ? "Diameter d1" : "Diagonal d1";
    elements.liveD2Label.textContent = state.method === "brinell" ? "Diameter d2" : "Diagonal d2";
    elements.diameterOneLabel.firstChild.textContent = state.method === "brinell" ? "Horizontal scale, diameter d1 " : "Horizontal scale, diagonal d1 ";
    elements.diameterTwoLabel.firstChild.textContent = state.method === "brinell" ? "Vertical scale, diameter d2 " : "Vertical scale, diagonal d2 ";
    document.querySelectorAll(".quiz-unit").forEach((unit) => {
      unit.textContent = hardnessUnit();
    });

    if (state.method === "brinell") {
      const predicted = brinellDiameterFromHardness(state.loadKgf, BALL_DIAMETER_MM, currentMethodData().nominalHardness);
      const ratio = predicted / BALL_DIAMETER_MM;
      if (ratio < 0.24 || ratio > 0.6) {
        elements.materialNote.textContent += ` The selected load predicts d/D ≈ ${formatNumber(ratio, 2)}, outside the commonly preferred 0.24–0.60 teaching range; use the recommended load for a clearer impression.`;
      }
    }
  }

  function setupEditable(editable) {
    elements.methodSelect.disabled = !editable;
    elements.materialSelect.disabled = !editable;
    elements.loadSelect.disabled = !editable;
    elements.dwellSelect.disabled = !editable;
    elements.readingCountSelect.disabled = !editable;
  }

  function updateLocationButtons() {
    const locationSelectionAllowed = state.status === "setup" || state.status === "mounted";
    elements.locationPoints.forEach((button) => {
      const location = button.dataset.location;
      const used = state.usedLocations.includes(location);
      const selected = location === state.selectedLocation && !used;
      button.classList.toggle("is-used", used);
      button.classList.toggle("is-selected", selected);
      button.disabled = used || !locationSelectionAllowed;
      button.setAttribute("aria-pressed", String(selected));
      button.setAttribute("aria-label", used ? `Location ${location}, used` : `Location ${location}${selected ? ", selected" : ""}`);
    });
  }

  function setStatus(machineState, copy) {
    elements.machineState.textContent = machineState;
    elements.statusCopy.textContent = copy;
  }

  function resetMicroscopeView() {
    elements.brinellImpression.hidden = true;
    elements.brinellImpression.style.display = "none";
    elements.vickersImpression.hidden = true;
    elements.vickersImpression.style.display = "none";
    elements.pileupRing.hidden = true;
    elements.pileupRing.style.display = "none";
    elements.measurementOverlay.hidden = true;
    elements.measurementOverlay.style.display = "none";
    elements.microscopePlaceholder.hidden = false;
    elements.microscopePlaceholder.style.display = "";
    elements.microscopePlaceholder.textContent = "Indentation not available";
    elements.focusRange.disabled = true;
    elements.autofocus.disabled = true;
    elements.diameterOneRange.disabled = true;
    elements.diameterTwoRange.disabled = true;
    elements.resetCalipers.disabled = true;
    elements.recordDimensions.disabled = true;
    elements.focusOutput.textContent = "Not available";
    elements.diameterOneOutput.textContent = "—";
    elements.diameterTwoOutput.textContent = "—";
    elements.liveD1Value.textContent = "—";
    elements.liveD2Value.textContent = "—";
    elements.meanDiameterValue.textContent = "—";
    elements.focusBlurNode.setAttribute("stdDeviation", "0");
    elements.microscopeDescription.textContent = "Make an indentation to activate the microscope.";
  }

  function renderTester() {
    const mounted = state.status !== "setup";
    const material = currentMaterial();
    const progress = state.animationProgress;
    const phaseData = animationPhase(progress);
    elements.ballIndenter.hidden = state.method !== "brinell";
    elements.ballIndenter.style.display = state.method === "brinell" ? "" : "none";
    elements.vickersIndenter.hidden = state.method !== "vickers";
    elements.vickersIndenter.style.display = state.method === "vickers" ? "" : "none";
    elements.sampleStopLight.setAttribute("stop-color", material.colors[0]);
    elements.sampleStopDark.setAttribute("stop-color", material.colors[1]);
    elements.sampleSurface.style.opacity = mounted ? "1" : "0.28";
    elements.testerMethodLabel.textContent = mounted
      ? `${material.shortName} · ${loadNotation()} · location ${state.selectedLocation}`
      : "No specimen mounted";

    let translation = 0;
    let loadFraction = 0;
    let depthFraction = 0;
    if (state.status === "animating") {
      translation = phaseData.translation;
      loadFraction = phaseData.loadFraction;
      depthFraction = phaseData.depthFraction;
    } else if (["microscope", "pending-calculation", "ready-next", "analysis"].includes(state.status)) {
      translation = 58;
      depthFraction = 0.72;
    }
    elements.movingHeadGroup.setAttribute("transform", `translate(0 ${translation})`);
    elements.forceFill.setAttribute("y", String(274 - 140 * loadFraction));
    elements.forceFill.setAttribute("height", String(140 * loadFraction));
    elements.plasticZone.style.opacity = String(state.currentTrial ? Math.max(0, Math.min(0.82, depthFraction * 0.82)) : 0);
    elements.plasticZone.setAttribute("rx", String(45 + depthFraction * 42));
    elements.plasticZone.setAttribute("ry", String(18 + depthFraction * 26));
    elements.residualIndent.hidden = !state.currentTrial || progress < 0.42 && state.status === "animating";
    elements.residualIndent.style.display = !elements.residualIndent.hidden ? "" : "none";
    if (state.method === "brinell") {
      elements.residualIndent.setAttribute("d", "M265 318 Q300 344 335 318");
    } else {
      elements.residualIndent.setAttribute("d", "M270 318 L300 338 L330 318");
    }
    elements.dwellCounter.textContent = state.status === "animating" && phaseData.phase === "Dwell"
      ? `${Math.max(0, Math.ceil(state.dwellSeconds * phaseData.dwellRemaining))} s`
      : "";
    const liveForce = state.loadKgf * KG_FORCE_TO_NEWTONS * loadFraction;
    elements.liveForceValue.textContent = liveForce >= 1000
      ? `${formatNumber(liveForce / 1000, 3)} kN`
      : `${formatNumber(liveForce, liveForce < 10 ? 3 : 1)} N`;
    const depth = state.currentTrial ? state.currentTrial.depthMm * depthFraction : 0;
    elements.depthValue.textContent = `${formatNumber(depth, state.method === "brinell" ? 3 : 4)} mm`;
    elements.phaseValue.textContent = state.phase;
    elements.testerDescription.textContent = mounted
      ? `${loadNotation()} test on ${material.shortName}. Current phase: ${state.phase}.`
      : "The specimen is not mounted.";
  }

  function animationPhase(progress) {
    const bounded = clamp(progress, 0, 1);
    if (bounded < 0.22) {
      const fraction = bounded / 0.22;
      return {
        phase: "Approach",
        translation: 67 * smoothStep(fraction),
        loadFraction: 0,
        depthFraction: 0,
        dwellRemaining: 1
      };
    }
    if (bounded < 0.54) {
      const fraction = (bounded - 0.22) / 0.32;
      return {
        phase: "Loading",
        translation: 67 + 17 * smoothStep(fraction),
        loadFraction: smoothStep(fraction),
        depthFraction: smoothStep(fraction),
        dwellRemaining: 1
      };
    }
    if (bounded < 0.78) {
      const fraction = (bounded - 0.54) / 0.24;
      return {
        phase: "Dwell",
        translation: 84,
        loadFraction: 1,
        depthFraction: 1,
        dwellRemaining: 1 - fraction
      };
    }
    const fraction = (bounded - 0.78) / 0.22;
    return {
      phase: "Unloading and elastic recovery",
      translation: 84 - 26 * smoothStep(fraction),
      loadFraction: 1 - smoothStep(fraction),
      depthFraction: 1 - 0.28 * smoothStep(fraction),
      dwellRemaining: 0
    };
  }

  function smoothStep(value) {
    const bounded = clamp(value, 0, 1);
    return bounded * bounded * (3 - 2 * bounded);
  }

  function announceAnimationPhase(phase) {
    if (phase === state.lastAnnouncedPhase) {
      return;
    }
    state.lastAnnouncedPhase = phase;
    state.phase = phase;
    if (phase === "Approach") {
      setStatus("Crosshead approaching", "The crosshead carries the load cell and indenter toward the polished specimen surface.");
      elements.stageExplanation.textContent = "The crosshead, load cell, and indenter descend together without applying measurable force.";
    } else if (phase === "Loading") {
      setStatus("Applying test force", `The force rises smoothly toward ${formatForce(state.loadKgf, true)}.`);
      elements.stageExplanation.textContent = "Elastic and plastic deformation grow beneath the contact as the selected force is applied.";
    } else if (phase === "Dwell") {
      setStatus("Holding at full force", `The virtual machine compresses the selected ${state.dwellSeconds} s dwell into the classroom animation.`);
      elements.stageExplanation.textContent = "The full force is held while plastic flow settles around the indentation.";
    } else {
      setStatus("Unloading", "The force is removed and a residual impression remains after partial elastic recovery.");
      elements.stageExplanation.textContent = "The indenter retracts. The recovered residual impression is the dimension measured optically.";
    }
  }

  function animateIndentation(timestamp) {
    state.animationFrame = 0;
    if (state.status !== "animating" || state.animationPaused) {
      return;
    }
    if (!state.animationLastTime) {
      state.animationLastTime = timestamp;
    }
    const elapsed = Math.min(timestamp - state.animationLastTime, 80);
    state.animationLastTime = timestamp;
    const duration = 5200 / ANIMATION_SPEED;
    state.animationProgress = clamp(state.animationProgress + elapsed / duration, 0, 1);
    const phaseData = animationPhase(state.animationProgress);
    announceAnimationPhase(phaseData.phase);
    renderTester();
    if (state.animationProgress >= 1) {
      completeIndentation();
      return;
    }
    state.animationFrame = globalObject.requestAnimationFrame(animateIndentation);
  }

  function completeIndentation() {
    if (state.animationFrame) {
      globalObject.cancelAnimationFrame(state.animationFrame);
      state.animationFrame = 0;
    }
    state.status = "microscope";
    state.phase = "Microscope measurement";
    state.animationPaused = false;
    state.animationProgress = 1;
    elements.pauseAnimation.disabled = true;
    elements.pauseAnimation.textContent = "Pause animation";
    if (!state.usedLocations.includes(state.selectedLocation)) {
      state.usedLocations.push(state.selectedLocation);
    }
    state.focus = 50;
    state.measuredDiameterOne = state.currentTrial.initialDiameterOne;
    state.measuredDiameterTwo = state.currentTrial.initialDiameterTwo;
    state.caliperAdjusted = { one: false, two: false };
    configureMeasurementControls();
    setStatus("Inspect the indentation", "Adjust focus, then slide the triangular pins on both graduated scales to the impression boundary.");
    elements.stageExplanation.textContent = "The residual indentation is now ready for optical measurement.";
    elements.measurementMessage.textContent = "Slide the d1 and d2 triangular pins to the visible boundary. The controls below provide a keyboard-accessible alternative to dragging.";
    renderAll();
  }

  function configureMeasurementControls() {
    const trial = state.currentTrial;
    const increment = dimensionIncrement();
    const lower = quantize(trial.meanDimension * 0.72, increment);
    const upper = quantize(trial.meanDimension * 1.28, increment);
    [elements.diameterOneRange, elements.diameterTwoRange].forEach((range) => {
      range.min = String(lower);
      range.max = String(upper);
      range.step = String(increment);
      range.disabled = false;
    });
    elements.diameterOneRange.value = String(state.measuredDiameterOne);
    elements.diameterTwoRange.value = String(state.measuredDiameterTwo);
    elements.focusRange.value = String(state.focus);
    elements.focusRange.disabled = false;
    elements.autofocus.disabled = false;
    elements.resetCalipers.disabled = false;
    elements.recordDimensions.disabled = false;
  }

  function niceGraduationLength(dimensionMm) {
    const candidates = [0.001, 0.002, 0.005, 0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1, 2];
    const desired = dimensionMm / 14;
    return candidates.reduce((best, candidate) => Math.abs(candidate - desired) < Math.abs(best - desired) ? candidate : best, candidates[0]);
  }

  function graduationLabel(divisionMm) {
    if (divisionMm < 0.1) {
      return `${formatNumber(divisionMm * 1000, 0)} µm/div`;
    }
    return `${formatNumber(divisionMm, divisionMm < 1 ? 2 : 1)} mm/div`;
  }

  function renderGradations(group, axis, halfExtent, pixelsPerMm, divisionMm) {
    const spacing = divisionMm * pixelsPerMm;
    if (!(spacing > 0)) {
      group.replaceChildren();
      return;
    }
    const count = Math.min(40, Math.floor(halfExtent / spacing));
    const fragment = document.createDocumentFragment();
    for (let index = -count; index <= count; index += 1) {
      const coordinate = (axis === "horizontal" ? 300 : 206) + index * spacing;
      const isMajor = index % 5 === 0;
      const attributes = axis === "horizontal"
        ? {
            x1: coordinate,
            y1: isMajor ? 198 : 201,
            x2: coordinate,
            y2: isMajor ? 214 : 211,
            class: `scale-gradation${isMajor ? " is-major" : ""}`
          }
        : {
            x1: isMajor ? 292 : 295,
            y1: coordinate,
            x2: isMajor ? 308 : 305,
            y2: coordinate,
            class: `scale-gradation${isMajor ? " is-major" : ""}`
          };
      fragment.append(svgElement("line", attributes));
    }
    group.replaceChildren(fragment);
  }

  function renderMicroscope() {
    const trial = state.currentTrial;
    const active = trial && ["microscope", "pending-calculation", "ready-next", "analysis"].includes(state.status);
    elements.microscopePlaceholder.hidden = Boolean(active);
    elements.microscopePlaceholder.style.display = active ? "none" : "";
    elements.measurementOverlay.hidden = !active;
    elements.measurementOverlay.style.display = active ? "" : "none";
    elements.brinellImpression.hidden = !active || state.method !== "brinell";
    elements.brinellImpression.style.display = active && state.method === "brinell" ? "" : "none";
    elements.vickersImpression.hidden = !active || state.method !== "vickers";
    elements.vickersImpression.style.display = active && state.method === "vickers" ? "" : "none";
    elements.pileupRing.hidden = !active;
    elements.pileupRing.style.display = active ? "" : "none";
    if (!active) {
      return;
    }

    const ppm = trial.pixelsPerMm;
    const trueWidth = trial.trueDiameterOne * ppm;
    const trueHeight = trial.trueDiameterTwo * ppm;
    if (state.method === "brinell") {
      elements.brinellImpression.setAttribute("rx", String(trueWidth / 2));
      elements.brinellImpression.setAttribute("ry", String(trueHeight / 2));
      elements.pileupRing.setAttribute("rx", String(trueWidth / 2 + 8));
      elements.pileupRing.setAttribute("ry", String(trueHeight / 2 + 8));
    } else {
      elements.vickersImpression.setAttribute(
        "d",
        `M300 ${206 - trueHeight / 2} L${300 + trueWidth / 2} 206 L300 ${206 + trueHeight / 2} L${300 - trueWidth / 2} 206 Z`
      );
      elements.pileupRing.setAttribute("rx", String(trueWidth / 2 + 7));
      elements.pileupRing.setAttribute("ry", String(trueHeight / 2 + 7));
    }

    const blur = clamp(Math.abs(state.focus - trial.focusTarget) * 0.075, 0, 4.5);
    elements.focusBlurNode.setAttribute("stdDeviation", formatNumber(blur, 2));
    const focusDifference = Math.abs(state.focus - trial.focusTarget);
    elements.focusOutput.textContent = focusDifference <= 4 ? "Sharp" : focusDifference <= 12 ? "Nearly focused" : "Soft focus";
    elements.focusRange.value = String(state.focus);

    const halfWidth = state.measuredDiameterOne * ppm / 2;
    const halfHeight = state.measuredDiameterTwo * ppm / 2;
    elements.horizontalScaleBand.setAttribute("x", String(300 - halfWidth));
    elements.horizontalScaleBand.setAttribute("width", String(halfWidth * 2));
    elements.verticalScaleBand.setAttribute("y", String(206 - halfHeight));
    elements.verticalScaleBand.setAttribute("height", String(halfHeight * 2));
    elements.measureHorizontal.setAttribute("x1", String(300 - halfWidth));
    elements.measureHorizontal.setAttribute("x2", String(300 + halfWidth));
    elements.handleLeft.setAttribute("transform", `translate(${300 - halfWidth} 206)`);
    elements.handleRight.setAttribute("transform", `translate(${300 + halfWidth} 206)`);
    elements.measureVertical.setAttribute("y1", String(206 - halfHeight));
    elements.measureVertical.setAttribute("y2", String(206 + halfHeight));
    elements.handleTop.setAttribute("transform", `translate(300 ${206 - halfHeight}) rotate(90)`);
    elements.handleBottom.setAttribute("transform", `translate(300 ${206 + halfHeight}) rotate(90)`);

    const graduation = niceGraduationLength(trial.meanDimension);
    renderGradations(elements.horizontalGradations, "horizontal", halfWidth, ppm, graduation);
    renderGradations(elements.verticalGradations, "vertical", halfHeight, ppm, graduation);
    const divisionText = graduationLabel(graduation);
    elements.horizontalToolLabel.textContent = `d1 · ${divisionText}`;
    elements.verticalToolLabel.textContent = `d2 · ${divisionText}`;

    const digits = dimensionDigits();
    const suffix = " mm";
    elements.diameterOneRange.value = String(state.measuredDiameterOne);
    elements.diameterTwoRange.value = String(state.measuredDiameterTwo);
    elements.diameterOneOutput.textContent = `${formatNumber(state.measuredDiameterOne, digits)}${suffix}`;
    elements.diameterTwoOutput.textContent = `${formatNumber(state.measuredDiameterTwo, digits)}${suffix}`;
    elements.liveD1Value.textContent = `${formatNumber(state.measuredDiameterOne, digits)} mm`;
    elements.liveD2Value.textContent = `${formatNumber(state.measuredDiameterTwo, digits)} mm`;
    elements.meanDiameterValue.textContent = `${formatNumber((state.measuredDiameterOne + state.measuredDiameterTwo) / 2, digits)} mm`;

    elements.microscopeDescription.textContent = `${state.method === "brinell" ? "Circular Brinell impression" : "Diamond-shaped Vickers impression"} at location ${trial.location}. Horizontal measurement ${formatNumber(state.measuredDiameterOne, digits)} millimetres; vertical measurement ${formatNumber(state.measuredDiameterTwo, digits)} millimetres.`;
  }

  function renderControlStates() {
    const isSetup = state.status === "setup";
    const isMounted = state.status === "mounted";
    const isAnimating = state.status === "animating";
    const isMeasuring = state.status === "microscope";
    const pending = state.status === "pending-calculation";
    const readyNext = state.status === "ready-next" || state.status === "analysis";
    setupEditable(isSetup);
    elements.mountSpecimen.disabled = !isSetup;
    elements.startIndentation.disabled = !isMounted;
    elements.pauseAnimation.disabled = !isAnimating;
    elements.resetExperiment.disabled = isSetup && state.readings.length === 0;
    elements.newLocation.disabled = !readyNext || state.readings.filter((reading) => reading.verified).length >= LOCATION_NAMES.length;
    elements.downloadCsv.disabled = state.readings.filter((reading) => reading.verified).length === 0;
    elements.focusRange.disabled = !isMeasuring;
    elements.autofocus.disabled = !isMeasuring;
    elements.diameterOneRange.disabled = !isMeasuring;
    elements.diameterTwoRange.disabled = !isMeasuring;
    elements.resetCalipers.disabled = !isMeasuring;
    elements.recordDimensions.disabled = !isMeasuring;
    elements.hardnessAnswer.disabled = !pending;
    elements.checkHardness.disabled = !pending;
    elements.showWorkedResult.disabled = !pending;
    updateLocationButtons();
  }

  function renderRecords() {
    elements.recordsBody.replaceChildren();
    if (state.readings.length === 0) {
      const row = document.createElement("tr");
      row.className = "empty-row";
      const cell = document.createElement("td");
      cell.colSpan = 7;
      cell.textContent = "No dimensions recorded yet.";
      row.append(cell);
      elements.recordsBody.append(row);
    } else {
      state.readings.forEach((reading, index) => {
        const row = document.createElement("tr");
        const hardnessText = reading.verified
          ? `${formatNumber(reading.reportedHardness, 1)} ${reading.unit}`
          : "Awaiting calculation";
        const values = [
          String(index + 1),
          reading.location,
          reading.notation,
          formatNumber(reading.diameterOne, reading.digits),
          formatNumber(reading.diameterTwo, reading.digits),
          formatNumber(reading.averageDimension, reading.digits),
          hardnessText
        ];
        values.forEach((value, cellIndex) => {
          const cell = document.createElement("td");
          cell.textContent = value;
          if (cellIndex === 6) {
            cell.className = reading.verified ? "hardness-verified" : "hardness-pending";
          }
          row.append(cell);
        });
        elements.recordsBody.append(row);
      });
    }
    const verifiedCount = state.readings.filter((reading) => reading.verified).length;
    elements.recordProgress.textContent = `${verifiedCount} of ${state.targetReadings} target readings complete.${verifiedCount >= state.targetReadings ? " Analysis unlocked; extra readings are optional." : ""}`;
  }

  function renderAll() {
    renderTester();
    renderMicroscope();
    renderRecords();
    renderControlStates();
  }

  function mountSpecimen() {
    state.seed = (Date.now() ^ Math.floor(Math.random() * 0xFFFFFFFF)) >>> 0;
    state.specimenBias = clamp(gaussianFromSeed(state.seed, 1) * 0.007, -0.02, 0.02);
    state.status = "mounted";
    state.phase = "Specimen mounted";
    state.animationProgress = 0;
    state.currentTrial = null;
    elements.resetExperiment.disabled = false;
    setStatus("Specimen mounted", `Location ${state.selectedLocation} is aligned below the ${state.method === "brinell" ? "ball" : "diamond"} indenter.`);
    elements.stageExplanation.textContent = "Start the test to approach, load, dwell, and unload the indenter.";
    elements.microscopePlaceholder.textContent = "Run the indentation first";
    renderAll();
  }

  function startIndentation() {
    if (state.status !== "mounted" || state.usedLocations.includes(state.selectedLocation)) {
      return;
    }
    const material = currentMaterial();
    const methodData = currentMethodData();
    state.currentTrial = createTrial({
      method: state.method,
      nominalHardness: methodData.nominalHardness,
      loadKgf: state.loadKgf,
      ballDiameterMm: BALL_DIAMETER_MM,
      specimenBias: state.specimenBias,
      localVariation: material.variation,
      seed: state.seed,
      trialIndex: state.readings.length,
      location: state.selectedLocation
    });
    state.status = "animating";
    state.phase = "Approach";
    state.animationProgress = 0;
    state.animationLastTime = 0;
    state.animationPaused = false;
    state.lastAnnouncedPhase = "";
    resetMicroscopeView();
    renderControlStates();
    if (motionPreference.matches) {
      state.animationProgress = 1;
      announceAnimationPhase("Unloading and elastic recovery");
      completeIndentation();
      return;
    }
    state.animationFrame = globalObject.requestAnimationFrame(animateIndentation);
  }

  function togglePauseAnimation() {
    if (state.status !== "animating") {
      return;
    }
    state.animationPaused = !state.animationPaused;
    elements.pauseAnimation.textContent = state.animationPaused ? "Resume animation" : "Pause animation";
    if (state.animationPaused) {
      if (state.animationFrame) {
        globalObject.cancelAnimationFrame(state.animationFrame);
        state.animationFrame = 0;
      }
      setStatus("Animation paused", "Resume when you are ready to continue the indentation cycle.");
    } else {
      state.animationLastTime = 0;
      state.lastAnnouncedPhase = "";
      state.animationFrame = globalObject.requestAnimationFrame(animateIndentation);
    }
  }

  function resetExperiment() {
    if (state.animationFrame) {
      globalObject.cancelAnimationFrame(state.animationFrame);
    }
    state.status = "setup";
    state.phase = "Not mounted";
    state.selectedLocation = "A";
    state.usedLocations = [];
    state.readings = [];
    state.currentTrial = null;
    state.seed = 0;
    state.specimenBias = 0;
    state.animationFrame = 0;
    state.animationProgress = 0;
    state.animationLastTime = 0;
    state.animationPaused = false;
    state.pendingReadingIndex = -1;
    state.hardnessAttempts = 0;
    state.lastAnnouncedPhase = "";
    elements.hardnessForm.reset();
    elements.hardnessFeedback.textContent = "";
    elements.hardnessFeedback.className = "answer-feedback";
    elements.showWorkedResult.hidden = true;
    elements.formulaDisplay.textContent = "Record an indentation to begin the hardness calculation.";
    elements.formulaSubstitution.textContent = "";
    elements.measurementMessage.textContent = "";
    elements.stageExplanation.textContent = "The moving crosshead carries the load cell and indenter toward the polished surface, applies the selected force, dwells, and unloads.";
    setStatus("Waiting for specimen", "Choose a method, specimen, and test location, then mount the specimen.");
    resetMicroscopeView();
    resetQuiz();
    renderAll();
  }

  function updateMeasuredDiameter(which, value, markAdjusted) {
    const range = which === "one" ? elements.diameterOneRange : elements.diameterTwoRange;
    const bounded = clamp(value, Number(range.min), Number(range.max));
    const quantized = quantize(bounded, dimensionIncrement());
    if (which === "one") {
      state.measuredDiameterOne = quantized;
      state.caliperAdjusted.one = state.caliperAdjusted.one || markAdjusted;
    } else {
      state.measuredDiameterTwo = quantized;
      state.caliperAdjusted.two = state.caliperAdjusted.two || markAdjusted;
    }
    renderMicroscope();
  }

  function pointerPositionInMicroscope(event) {
    const point = elements.microscopeSvg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    const matrix = elements.microscopeSvg.getScreenCTM();
    return matrix ? point.matrixTransform(matrix.inverse()) : { x: 300, y: 206 };
  }

  function beginHandleDrag(event) {
    if (state.status !== "microscope") {
      return;
    }
    state.dragHandle = event.currentTarget.dataset.handle;
    event.currentTarget.classList.add("is-dragging");
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
  }

  function moveHandle(event) {
    if (!state.dragHandle || state.status !== "microscope") {
      return;
    }
    const point = pointerPositionInMicroscope(event);
    if (state.dragHandle === "left" || state.dragHandle === "right") {
      updateMeasuredDiameter("one", 2 * Math.abs(point.x - 300) / state.currentTrial.pixelsPerMm, true);
    } else {
      updateMeasuredDiameter("two", 2 * Math.abs(point.y - 206) / state.currentTrial.pixelsPerMm, true);
    }
  }

  function finishHandleDrag(event) {
    if (!state.dragHandle) {
      return;
    }
    const handle = {
      left: elements.handleLeft,
      right: elements.handleRight,
      top: elements.handleTop,
      bottom: elements.handleBottom
    }[state.dragHandle];
    if (handle) {
      handle.classList.remove("is-dragging");
      if (handle.hasPointerCapture(event.pointerId)) {
        handle.releasePointerCapture(event.pointerId);
      }
    }
    state.dragHandle = null;
  }

  function autofocusMicroscope() {
    if (!state.currentTrial || state.status !== "microscope") {
      return;
    }
    state.focus = state.currentTrial.focusTarget;
    elements.measurementMessage.textContent = "Image focused. Align each triangular pin with the indentation boundary.";
    renderMicroscope();
  }

  function resetCalipers() {
    if (!state.currentTrial || state.status !== "microscope") {
      return;
    }
    state.measuredDiameterOne = state.currentTrial.initialDiameterOne;
    state.measuredDiameterTwo = state.currentTrial.initialDiameterTwo;
    state.caliperAdjusted = { one: false, two: false };
    elements.measurementMessage.textContent = "Graduated scales reset. Move both pairs of triangular pins before recording.";
    renderMicroscope();
  }

  function recordDimensions() {
    if (state.status !== "microscope" || !state.currentTrial) {
      return;
    }
    if (Math.abs(state.focus - state.currentTrial.focusTarget) > 12) {
      elements.measurementMessage.textContent = "The boundary is too blurred. Adjust the focus or use Auto focus before recording.";
      return;
    }
    if (!state.caliperAdjusted.one || !state.caliperAdjusted.two) {
      elements.measurementMessage.textContent = "Move the pins on both graduated scales before recording d1 and d2.";
      return;
    }
    const d1 = quantize(state.measuredDiameterOne, dimensionIncrement());
    const d2 = quantize(state.measuredDiameterTwo, dimensionIncrement());
    const averageDimension = (d1 + d2) / 2;
    const disagreement = Math.abs(d1 - d2) / averageDimension;
    if (disagreement > 0.05) {
      elements.measurementMessage.textContent = "d1 and d2 differ by more than 5%. Recheck the impression boundary before recording.";
      return;
    }
    const expectedHardness = hardnessFromDimensions(state.method, state.loadKgf, BALL_DIAMETER_MM, d1, d2);
    if (!Number.isFinite(expectedHardness)) {
      elements.measurementMessage.textContent = "The recorded dimensions are not physically valid for this test. Reposition the scale pins.";
      return;
    }
    const reading = {
      location: state.currentTrial.location,
      method: state.method,
      material: currentMaterial().name,
      loadKgf: state.loadKgf,
      ballDiameterMm: BALL_DIAMETER_MM,
      notation: loadNotation(),
      unit: hardnessUnit(),
      digits: dimensionDigits(),
      diameterOne: d1,
      diameterTwo: d2,
      averageDimension,
      expectedHardness,
      reportedHardness: Number(expectedHardness.toFixed(1)),
      verified: false
    };
    state.readings.push(reading);
    state.pendingReadingIndex = state.readings.length - 1;
    state.status = "pending-calculation";
    state.phase = "Calculate hardness";
    state.hardnessAttempts = 0;
    elements.measurementMessage.textContent = "Dimensions recorded. Calculate the hardness below before moving to another location.";
    elements.hardnessAnswer.value = "";
    elements.hardnessFeedback.textContent = "";
    elements.hardnessFeedback.className = "answer-feedback";
    elements.showWorkedResult.hidden = true;
    updateCalculationWorkspace(reading);
    setStatus("Calculate hardness", `Use the recorded d1 and d2 values to calculate reading ${state.readings.length} in ${hardnessUnit()}.`);
    renderAll();
    elements.hardnessAnswer.focus();
  }

  function updateCalculationWorkspace(reading) {
    if (reading.method === "brinell") {
      elements.formulaDisplay.textContent = "HBW = 2P / [πD(D − √(D² − d²))]";
      elements.formulaSubstitution.textContent = `Use P = ${formatCompactNumber(reading.loadKgf)} kgf, D = ${formatNumber(reading.ballDiameterMm, 0)} mm, and d = (${formatNumber(reading.diameterOne, reading.digits)} + ${formatNumber(reading.diameterTwo, reading.digits)}) / 2 mm.`;
    } else {
      elements.formulaDisplay.textContent = "HV = 1.8544P / d²";
      elements.formulaSubstitution.textContent = `Use P = ${formatCompactNumber(reading.loadKgf)} kgf and d = (${formatNumber(reading.diameterOne, reading.digits)} + ${formatNumber(reading.diameterTwo, reading.digits)}) / 2 mm.`;
    }
  }

  function submitHardness(event) {
    event.preventDefault();
    if (state.status !== "pending-calculation" || state.pendingReadingIndex < 0) {
      return;
    }
    const value = Number(elements.hardnessAnswer.value);
    const reading = state.readings[state.pendingReadingIndex];
    if (!Number.isFinite(value) || value <= 0) {
      elements.hardnessFeedback.textContent = "Enter a positive numerical hardness value.";
      elements.hardnessFeedback.className = "answer-feedback is-incorrect";
      return;
    }
    state.hardnessAttempts += 1;
    const tolerance = Math.max(reading.expectedHardness * 0.015, 0.5);
    if (Math.abs(value - reading.expectedHardness) <= tolerance) {
      verifyPendingReading(false);
      return;
    }
    elements.hardnessFeedback.textContent = reading.method === "brinell"
      ? "Not yet. Average d1 and d2 first, keep every length in millimetres, and check the entire denominator."
      : "Not yet. Average the diagonals first, square that mean in millimetres, and use the load in kgf.";
    elements.hardnessFeedback.className = "answer-feedback is-incorrect";
    if (state.hardnessAttempts >= 2) {
      elements.showWorkedResult.hidden = false;
    }
  }

  function verifyPendingReading(usedWorkedResult) {
    const reading = state.readings[state.pendingReadingIndex];
    reading.verified = true;
    state.status = state.readings.filter((entry) => entry.verified).length >= state.targetReadings ? "analysis" : "ready-next";
    state.phase = "Reading complete";
    elements.hardnessAnswer.value = formatNumber(reading.reportedHardness, 1).replace(/,/g, "");
    elements.hardnessFeedback.textContent = `${usedWorkedResult ? "Worked result saved" : "Correct"}: ${formatNumber(reading.reportedHardness, 1)} ${reading.unit}. This value is calculated from your recorded dimensions.`;
    elements.hardnessFeedback.className = "answer-feedback is-correct";
    elements.showWorkedResult.hidden = true;
    setStatus("Reading saved", state.status === "analysis"
      ? "The repeatability analysis is unlocked. You may calculate now or add another indentation."
      : "Move to a new unused location for the next repeat reading.");
    updateQuizLock();
    renderAll();
  }

  function useWorkedResult() {
    if (state.status !== "pending-calculation") {
      return;
    }
    verifyPendingReading(true);
  }

  function moveToNewLocation() {
    if (!["ready-next", "analysis"].includes(state.status)) {
      return;
    }
    const nextLocation = LOCATION_NAMES.find((location) => !state.usedLocations.includes(location));
    if (!nextLocation) {
      return;
    }
    state.selectedLocation = nextLocation;
    state.currentTrial = null;
    state.pendingReadingIndex = -1;
    state.status = "mounted";
    state.phase = "Ready at new location";
    state.animationProgress = 0;
    elements.hardnessAnswer.value = "";
    elements.hardnessFeedback.textContent = "";
    elements.hardnessFeedback.className = "answer-feedback";
    elements.formulaDisplay.textContent = "Record an indentation to begin the next hardness calculation.";
    elements.formulaSubstitution.textContent = "";
    elements.measurementMessage.textContent = "";
    resetMicroscopeView();
    setStatus("New location selected", `Location ${nextLocation} is aligned. Make the next indentation when ready.`);
    renderAll();
  }

  function verifiedReadings() {
    return state.readings.filter((reading) => reading.verified);
  }

  function resetQuiz() {
    elements.quizPanel.classList.add("is-locked");
    elements.quizLockMessage.textContent = `Complete ${state.targetReadings} verified readings to unlock the numerical analysis.`;
    elements.quizForm.reset();
    elements.quizForm.querySelectorAll("fieldset").forEach((fieldset) => {
      fieldset.disabled = true;
      fieldset.classList.remove("is-correct", "is-incorrect");
      const input = fieldset.querySelector("input");
      input?.removeAttribute("aria-invalid");
      const feedback = fieldset.querySelector(".answer-feedback");
      if (feedback) {
        feedback.textContent = "";
      }
    });
    elements.checkQuiz.disabled = true;
    elements.quizResult.textContent = "";
    elements.resultsVisual.hidden = true;
  }

  function updateQuizLock() {
    const readings = verifiedReadings();
    if (readings.length < state.targetReadings) {
      resetQuiz();
      return;
    }
    const statistics = summaryStatistics(readings.map((reading) => reading.reportedHardness));
    elements.quizPanel.classList.remove("is-locked");
    elements.quizLockMessage.textContent = `${readings.length} readings are available. Use the table above and report repeatability-only uncertainty; additional calibration terms are outside this exercise.`;
    elements.quizForm.reset();
    elements.quizForm.querySelectorAll("fieldset").forEach((fieldset) => {
      fieldset.disabled = false;
      fieldset.classList.remove("is-correct", "is-incorrect");
      fieldset.querySelector("input")?.removeAttribute("aria-invalid");
      const feedback = fieldset.querySelector(".answer-feedback");
      if (feedback) {
        feedback.textContent = "";
      }
    });
    elements.checkQuiz.disabled = false;
    elements.firstHardnessHint.textContent = `Reading 1 used ${readings[0].notation}; use the mean of its two recorded dimensions.`;
    elements.expandedHint.innerHTML = `U<sub>95</sub> = t u<sub>A</sub>, using t = ${formatNumber(statistics.tMultiplier, 3)} for n = ${statistics.n}.`;
    elements.quizResult.textContent = "";
    elements.resultsVisual.hidden = true;
  }

  function quizDefinitions() {
    const readings = verifiedReadings();
    const values = readings.map((reading) => reading.reportedHardness);
    const statistics = summaryStatistics(values);
    return {
      "first-hardness": {
        target: values[0],
        tolerance: 0.015,
        hint: "Recalculate the mean indentation dimension, then apply the displayed method equation."
      },
      mean: {
        target: statistics.mean,
        tolerance: 0.015,
        hint: "Add every saved hardness value and divide by the number of readings."
      },
      "standard-deviation": {
        target: statistics.sampleStandardDeviation,
        tolerance: 0.06,
        hint: "Use the sample formula with n − 1 in the denominator."
      },
      "standard-uncertainty": {
        target: statistics.standardUncertainty,
        tolerance: 0.06,
        hint: "Divide the sample standard deviation by the square root of n."
      },
      "expanded-uncertainty": {
        target: statistics.expandedUncertainty,
        tolerance: 0.06,
        hint: `Multiply the standard uncertainty by t = ${formatNumber(statistics.tMultiplier, 3)}.`
      }
    };
  }

  function checkQuiz(event) {
    event.preventDefault();
    if (verifiedReadings().length < state.targetReadings) {
      return;
    }
    const definitions = quizDefinitions();
    let score = 0;
    let answered = 0;
    const fieldsets = Array.from(elements.quizForm.querySelectorAll("fieldset"));
    fieldsets.forEach((fieldset) => {
      const definition = definitions[fieldset.dataset.metric];
      const input = fieldset.querySelector("input[type=number]");
      const value = Number(input.value);
      const hasAnswer = input.value.trim() !== "" && Number.isFinite(value) && value >= 0;
      const tolerance = Math.max(Math.abs(definition.target) * definition.tolerance, 0.02);
      const correct = hasAnswer && Math.abs(value - definition.target) <= tolerance;
      fieldset.classList.toggle("is-correct", correct);
      fieldset.classList.toggle("is-incorrect", !correct);
      input.setAttribute("aria-invalid", String(!correct));
      const feedback = fieldset.querySelector(".answer-feedback");
      if (!hasAnswer) {
        feedback.textContent = "Enter a non-negative numerical answer.";
      } else if (correct) {
        feedback.textContent = `Correct within rounding tolerance: ${formatNumber(definition.target, definition.target < 10 ? 3 : 2)} ${hardnessUnit()}.`;
        score += 1;
      } else {
        feedback.textContent = definition.hint;
      }
      if (hasAnswer) {
        answered += 1;
      }
    });
    elements.quizResult.textContent = answered < fieldsets.length
      ? `${score} of 5 correct so far; answer every question.`
      : `${score} of 5 correct.`;
    if (score === fieldsets.length) {
      renderResultsPlot();
    } else {
      elements.resultsVisual.hidden = true;
    }
  }

  function svgElement(name, attributes, text) {
    const node = document.createElementNS("http://www.w3.org/2000/svg", name);
    Object.entries(attributes || {}).forEach(([key, value]) => node.setAttribute(key, String(value)));
    if (text !== undefined) {
      node.textContent = text;
    }
    return node;
  }

  function renderResultsPlot() {
    const readings = verifiedReadings();
    const values = readings.map((reading) => reading.reportedHardness);
    const statistics = summaryStatistics(values);
    const lowerInterval = statistics.mean - statistics.expandedUncertainty;
    const upperInterval = statistics.mean + statistics.expandedUncertainty;
    let minimum = Math.min(...values, lowerInterval);
    let maximum = Math.max(...values, upperInterval);
    const spread = Math.max(maximum - minimum, statistics.mean * 0.02, 1);
    minimum -= spread * 0.18;
    maximum += spread * 0.18;
    const xFor = (value) => 64 + (value - minimum) / (maximum - minimum) * 552;
    const plot = elements.resultsPlot;
    plot.replaceChildren();
    plot.append(
      svgElement("title", { id: "results-plot-title" }, "Hardness repeatability plot"),
      svgElement("desc", { id: "results-plot-description" }, `${values.length} readings with mean ${formatNumber(statistics.mean, 2)} and 95 percent repeatability interval plus or minus ${formatNumber(statistics.expandedUncertainty, 2)} ${hardnessUnit()}.`)
    );
    plot.append(svgElement("rect", {
      x: xFor(lowerInterval),
      y: 54,
      width: Math.max(2, xFor(upperInterval) - xFor(lowerInterval)),
      height: 66,
      rx: 10,
      fill: "rgba(38,113,95,0.2)"
    }));
    plot.append(svgElement("line", { x1: 64, y1: 137, x2: 616, y2: 137, stroke: "#554f82", "stroke-width": 2 }));
    plot.append(svgElement("line", { x1: xFor(statistics.mean), y1: 42, x2: xFor(statistics.mean), y2: 137, stroke: "#c93b1f", "stroke-width": 4 }));
    values.forEach((value, index) => {
      plot.append(svgElement("circle", {
        cx: xFor(value),
        cy: 86 + (index % 2) * 22,
        r: 9,
        fill: "#2e2a74",
        stroke: "white",
        "stroke-width": 3
      }));
      plot.append(svgElement("text", {
        x: xFor(value),
        y: 70 + (index % 2) * 54,
        "text-anchor": "middle",
        fill: "#2e2a74",
        "font-family": "system-ui, sans-serif",
        "font-size": 12,
        "font-weight": 800
      }, `R${index + 1}`));
    });
    [minimum, statistics.mean, maximum].forEach((value) => {
      plot.append(svgElement("text", {
        x: xFor(value),
        y: 164,
        "text-anchor": "middle",
        fill: "#554f82",
        "font-family": "system-ui, sans-serif",
        "font-size": 12,
        "font-weight": 700
      }, formatNumber(value, 1)));
    });
    plot.append(svgElement("text", {
      x: xFor(statistics.mean),
      y: 30,
      "text-anchor": "middle",
      fill: "#c93b1f",
      "font-family": "system-ui, sans-serif",
      "font-size": 13,
      "font-weight": 900
    }, "Mean"));
    elements.reportedResult.textContent = `Report: ${formatNumber(statistics.mean, 2)} ± ${formatNumber(statistics.expandedUncertainty, 2)} ${hardnessUnit()} (95% repeatability interval; ${formatNumber(statistics.relativeExpandedPercent, 2)}%).`;
    elements.resultsVisual.hidden = false;
  }

  function downloadCsv() {
    const readings = verifiedReadings();
    if (readings.length === 0) {
      return;
    }
    const header = ["Reading", "Location", "Method", "Specimen", "Scale", "Load (kgf)", "d1 (mm)", "d2 (mm)", "Mean d (mm)", "Calculated hardness", "Hardness unit"];
    const rows = readings.map((reading, index) => [
      index + 1,
      reading.location,
      reading.method,
      reading.material,
      reading.notation,
      reading.loadKgf,
      reading.diameterOne.toFixed(reading.digits),
      reading.diameterTwo.toFixed(reading.digits),
      reading.averageDimension.toFixed(reading.digits + 1),
      reading.reportedHardness.toFixed(1),
      reading.unit
    ]);
    const quote = (value) => `"${String(value).replace(/"/g, "\"\"")}"`;
    const csv = [header, ...rows].map((row) => row.map(quote).join(",")).join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${state.method}-${currentMaterial().id}-hardness-readings.csv`;
    document.body.append(link);
    link.click();
    link.remove();
    globalObject.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  elements.methodSelect.addEventListener("change", () => {
    state.method = elements.methodSelect.value;
    const previousMaterial = state.materialId;
    populateMaterialOptions(previousMaterial);
    populateLoadOptions(currentMethodData().defaultLoad);
    updateSetupSummary();
    resetQuiz();
    renderAll();
  });
  elements.materialSelect.addEventListener("change", () => {
    state.materialId = elements.materialSelect.value;
    populateLoadOptions(currentMethodData().defaultLoad);
    updateSetupSummary();
    renderAll();
  });
  elements.loadSelect.addEventListener("change", () => {
    state.loadKgf = Number(elements.loadSelect.value);
    updateSetupSummary();
  });
  elements.dwellSelect.addEventListener("change", () => {
    state.dwellSeconds = Number(elements.dwellSelect.value);
  });
  elements.readingCountSelect.addEventListener("change", () => {
    state.targetReadings = Number(elements.readingCountSelect.value);
    resetQuiz();
    renderRecords();
  });
  elements.locationPoints.forEach((button) => {
    button.addEventListener("click", () => {
      if (button.disabled) {
        return;
      }
      state.selectedLocation = button.dataset.location;
      updateLocationButtons();
      if (state.status === "mounted") {
        setStatus("Location selected", `Location ${state.selectedLocation} is aligned below the indenter.`);
        renderTester();
      }
    });
  });
  elements.mountSpecimen.addEventListener("click", mountSpecimen);
  elements.startIndentation.addEventListener("click", startIndentation);
  elements.pauseAnimation.addEventListener("click", togglePauseAnimation);
  elements.resetExperiment.addEventListener("click", resetExperiment);
  elements.focusRange.addEventListener("input", () => {
    state.focus = Number(elements.focusRange.value);
    renderMicroscope();
  });
  elements.autofocus.addEventListener("click", autofocusMicroscope);
  elements.diameterOneRange.addEventListener("input", () => updateMeasuredDiameter("one", Number(elements.diameterOneRange.value), true));
  elements.diameterTwoRange.addEventListener("input", () => updateMeasuredDiameter("two", Number(elements.diameterTwoRange.value), true));
  elements.resetCalipers.addEventListener("click", resetCalipers);
  elements.recordDimensions.addEventListener("click", recordDimensions);
  elements.hardnessForm.addEventListener("submit", submitHardness);
  elements.showWorkedResult.addEventListener("click", useWorkedResult);
  elements.newLocation.addEventListener("click", moveToNewLocation);
  elements.downloadCsv.addEventListener("click", downloadCsv);
  elements.quizForm.addEventListener("submit", checkQuiz);

  [elements.handleLeft, elements.handleRight, elements.handleTop, elements.handleBottom].forEach((handle) => {
    handle.addEventListener("pointerdown", beginHandleDrag);
  });
  elements.microscopeSvg.addEventListener("pointermove", moveHandle);
  elements.microscopeSvg.addEventListener("pointerup", finishHandleDrag);
  elements.microscopeSvg.addEventListener("pointercancel", finishHandleDrag);

  populateMaterialOptions("aluminium-6061");
  populateLoadOptions(currentMethodData().defaultLoad);
  updateSetupSummary();
  resetMicroscopeView();
  resetQuiz();
  renderAll();
})(typeof window !== "undefined" ? window : globalThis);
