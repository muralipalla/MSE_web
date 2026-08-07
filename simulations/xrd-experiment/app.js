const WAVELENGTH = 1.540593;
const DATA_STEP = 0.05;
const BASE_SCAN_SPEED = 8;

const SAMPLES = {
  ferrite: {
    name: "α-iron powder",
    shortName: "α-Fe",
    structure: "Body-centred cubic",
    lattice: "a = 2.8664 Å",
    rule: "h + k + l is even",
    note: "The BCC fingerprint begins with (110). Cu radiation can raise the background of real iron patterns through Fe fluorescence.",
    fingerprint: "BCC α-Fe allows reflections only when h + k + l is even. Look for the strong (110) line followed by (200) and (211).",
    seed: 11,
    background: 8,
    noise: 1.5,
    colors: ["#d8dde2", "#707e89"],
    phases: [
      {
        id: "alpha-fe",
        name: "α-Fe",
        structure: "BCC",
        color: "#e45236",
        weight: 1,
        cell: { type: "cubic", a: 2.8664 },
        reflections: [
          [1, 1, 0, 100], [2, 0, 0, 19], [2, 1, 1, 30],
          [2, 2, 0, 9], [3, 1, 0, 12], [2, 2, 2, 6]
        ]
      }
    ]
  },
  copper: {
    name: "Copper powder",
    shortName: "Cu",
    structure: "Face-centred cubic",
    lattice: "a = 3.6150 Å",
    rule: "h, k, l are all odd or all even",
    note: "The FCC sequence begins (111), (200), (220), (311), and (222); mixed parity reflections are absent.",
    fingerprint: "FCC Cu permits reflections when h, k, and l are all odd or all even. The first five lines follow the sequence 111, 200, 220, 311, 222.",
    seed: 23,
    background: 4.5,
    noise: 1.05,
    colors: ["#e6b264", "#9f5c26"],
    phases: [
      {
        id: "copper",
        name: "Cu",
        structure: "FCC",
        color: "#c9872a",
        weight: 1,
        cell: { type: "cubic", a: 3.6150 },
        reflections: [
          [1, 1, 1, 100], [2, 0, 0, 46], [2, 2, 0, 20],
          [3, 1, 1, 17], [2, 2, 2, 5], [4, 0, 0, 9]
        ]
      }
    ]
  },
  magnesium: {
    name: "Magnesium powder",
    shortName: "Mg",
    structure: "Hexagonal close-packed",
    lattice: "a = 3.2094 Å, c = 5.2103 Å",
    rule: "P6₃/mmc basis controls absences",
    note: "HCP Mg has separate a and c spacings. Its close group of (100), (002), and (101) peaks is a useful fingerprint.",
    fingerprint: "HCP Mg uses the hexagonal d-spacing equation. The three nearby low-angle peaks (100), (002), and (101) distinguish it from the cubic samples.",
    seed: 37,
    background: 5.5,
    noise: 1.25,
    colors: ["#bcd7cf", "#527d70"],
    phases: [
      {
        id: "magnesium",
        name: "Mg",
        structure: "HCP",
        color: "#278f83",
        weight: 1,
        cell: { type: "hexagonal", a: 3.2094, c: 5.2103 },
        reflections: [
          [1, 0, 0, 35], [0, 0, 2, 41], [1, 0, 1, 100],
          [1, 0, 2, 20], [1, 1, 0, 18], [1, 0, 3, 18],
          [2, 0, 0, 2], [1, 1, 2, 16], [2, 0, 1, 9], [0, 0, 4, 2]
        ]
      }
    ]
  },
  silicon: {
    name: "Silicon powder",
    shortName: "Si",
    structure: "Diamond cubic",
    lattice: "a = 5.431109 Å",
    rule: "FCC rule + even sums must equal 4n",
    note: "The diamond basis extinguishes reflections such as (200) and (222), which would be allowed in a conventional FCC lattice.",
    fingerprint: "Diamond-cubic Si follows the FCC parity rule, but the two-atom basis removes even reflections whose index sum is not 4n. The ideal (200) and (222) peaks are absent.",
    seed: 51,
    background: 3.8,
    noise: 0.9,
    colors: ["#aaa5c8", "#5c5686"],
    phases: [
      {
        id: "silicon",
        name: "Si",
        structure: "Diamond cubic",
        color: "#6757a8",
        weight: 1,
        cell: { type: "cubic", a: 5.431109 },
        reflections: [
          [1, 1, 1, 100], [2, 2, 0, 55], [3, 1, 1, 30],
          [4, 0, 0, 6], [3, 3, 1, 11], [4, 2, 2, 12],
          [5, 1, 1, 6, "511/333"], [4, 4, 0, 3]
        ]
      }
    ]
  },
  mixture: {
    name: "α-Fe + Cu powder mixture",
    shortName: "α-Fe + Cu",
    structure: "BCC + FCC mixture",
    lattice: "Fe a = 2.8664 Å; Cu a = 3.6150 Å",
    rule: "Superposition of BCC and FCC rules",
    note: "This mechanical mixture overlays equal pattern contributions from α-Fe and Cu. It is a phase-identification exercise, not a quantitative mass-fraction model.",
    fingerprint: "The mixed pattern superposes both phase fingerprints. Cu (111) at about 43.3° and Fe (110) at about 44.7° form a close double feature; later peaks separate the phases clearly.",
    seed: 67,
    background: 8.5,
    noise: 1.45,
    colors: ["#c5a98a", "#765b4d"],
    phases: [
      {
        id: "alpha-fe",
        name: "α-Fe",
        structure: "BCC",
        color: "#e45236",
        weight: 0.5,
        cell: { type: "cubic", a: 2.8664 },
        reflections: [
          [1, 1, 0, 100], [2, 0, 0, 19], [2, 1, 1, 30],
          [2, 2, 0, 9], [3, 1, 0, 12], [2, 2, 2, 6]
        ]
      },
      {
        id: "copper",
        name: "Cu",
        structure: "FCC",
        color: "#c9872a",
        weight: 0.5,
        cell: { type: "cubic", a: 3.6150 },
        reflections: [
          [1, 1, 1, 100], [2, 0, 0, 46], [2, 2, 0, 20],
          [3, 1, 1, 17], [2, 2, 2, 5], [4, 0, 0, 9]
        ]
      }
    ]
  }
};

const elements = {
  sampleSelect: document.querySelector("#sample-select"),
  startAngle: document.querySelector("#start-angle"),
  endAngle: document.querySelector("#end-angle"),
  playback: document.querySelector("#playback-select"),
  structureSummary: document.querySelector("#structure-summary"),
  latticeSummary: document.querySelector("#lattice-summary"),
  ruleSummary: document.querySelector("#rule-summary"),
  sampleNote: document.querySelector("#sample-note"),
  setupMessage: document.querySelector("#setup-message"),
  loadSample: document.querySelector("#load-sample"),
  startScan: document.querySelector("#start-scan"),
  pauseScan: document.querySelector("#pause-scan"),
  reset: document.querySelector("#reset-experiment"),
  machineState: document.querySelector("#machine-state"),
  statusCopy: document.querySelector("#status-copy"),
  scanProgress: document.querySelector("#scan-progress"),
  instrumentDescription: document.querySelector("#instrument-svg-description"),
  powderSample: document.querySelector("#powder-sample"),
  sampleStage: document.querySelector("#sample-stage"),
  sampleLabel: document.querySelector("#sample-label"),
  sampleStopLight: document.querySelector("#sample-stop-light"),
  sampleStopDark: document.querySelector("#sample-stop-dark"),
  detectorGroup: document.querySelector("#detector-group"),
  detectorArm: document.querySelector("#detector-arm-line"),
  detectorIndicator: document.querySelector("#detector-indicator"),
  sourceIndicator: document.querySelector("#source-indicator"),
  incidentBeam: document.querySelector("#incident-beam"),
  incidentBeamGlow: document.querySelector("#incident-beam-glow"),
  diffractedBeam: document.querySelector("#diffracted-beam"),
  diffractedBeamGlow: document.querySelector("#diffracted-beam-glow"),
  angleArc: document.querySelector("#angle-arc"),
  angleLabel: document.querySelector("#angle-label"),
  stageExplanation: document.querySelector("#stage-explanation"),
  mobileDetectorAngle: document.querySelector("#mobile-detector-angle"),
  mobileSampleState: document.querySelector("#mobile-sample-state"),
  graphFrame: document.querySelector("#graph-frame"),
  chart: document.querySelector("#xrd-chart"),
  showLabels: document.querySelector("#show-labels"),
  phaseLegend: document.querySelector("#phase-legend"),
  peakInspector: document.querySelector("#peak-inspector"),
  downloadCsv: document.querySelector("#download-csv"),
  twoThetaValue: document.querySelector("#two-theta-value"),
  thetaValue: document.querySelector("#theta-value"),
  intensityValue: document.querySelector("#intensity-value"),
  spacingValue: document.querySelector("#spacing-value"),
  reflectionValue: document.querySelector("#reflection-value"),
  progressValue: document.querySelector("#progress-value"),
  fingerprintCopy: document.querySelector("#fingerprint-copy"),
  peakCount: document.querySelector("#peak-count"),
  peakTableBody: document.querySelector("#peak-table-body")
};

const state = {
  status: "unloaded",
  sampleKey: "ferrite",
  startAngle: 20,
  endAngle: 100,
  currentAngle: 20,
  progress: 0,
  peaks: [],
  data: [],
  yMaximum: 110,
  selectedPeakId: null,
  hoverAngle: null,
  animationFrame: null,
  lastTimestamp: null,
  renderedPeakCount: -1
};

let chartContext;
let chartMetrics;

initialize();

function initialize() {
  chartContext = elements.chart.getContext("2d");
  bindEvents();
  updatePreview();
  updateControls();
  updateStatus();
  updateInstrument();
  updateReadings();
  renderPeakTable(true);
  resizeChart();

  const observer = new ResizeObserver(resizeChart);
  observer.observe(elements.graphFrame);
}

function bindEvents() {
  elements.sampleSelect.addEventListener("change", updatePreview);
  elements.startAngle.addEventListener("input", updateIdleRange);
  elements.endAngle.addEventListener("input", updateIdleRange);
  elements.loadSample.addEventListener("click", loadSelectedSample);
  elements.startScan.addEventListener("click", startScan);
  elements.pauseScan.addEventListener("click", togglePause);
  elements.reset.addEventListener("click", resetExperiment);
  elements.showLabels.addEventListener("change", drawChart);
  elements.downloadCsv.addEventListener("click", downloadScanCsv);
  elements.peakTableBody.addEventListener("click", handlePeakTableClick);
  elements.chart.addEventListener("pointermove", handleChartPointer);
  elements.chart.addEventListener("pointerleave", () => {
    state.hoverAngle = null;
    updatePeakInspector();
    drawChart();
  });
  elements.chart.addEventListener("click", selectChartPeak);
}

function updatePreview() {
  const sample = SAMPLES[elements.sampleSelect.value];
  elements.structureSummary.textContent = sample.structure;
  elements.latticeSummary.textContent = sample.lattice;
  elements.ruleSummary.textContent = sample.rule;
  elements.sampleNote.textContent = sample.note;

  if (state.status === "unloaded") {
    state.sampleKey = elements.sampleSelect.value;
    updatePhaseLegend(sample);
    elements.fingerprintCopy.textContent = "Load this sample to generate its allowed powder reflections.";
  }
}

function updateIdleRange() {
  if (state.status !== "unloaded") return;
  const start = Number(elements.startAngle.value);
  const end = Number(elements.endAngle.value);
  if (Number.isFinite(start)) state.currentAngle = start;
  state.startAngle = Number.isFinite(start) ? start : 20;
  state.endAngle = Number.isFinite(end) ? end : 100;
  updateInstrument();
  updateReadings();
  drawChart();
}

function loadSelectedSample() {
  const range = readScanRange();
  if (!range) return;

  state.sampleKey = elements.sampleSelect.value;
  state.startAngle = range.start;
  state.endAngle = range.end;
  state.currentAngle = range.start;
  state.progress = 0;
  state.selectedPeakId = null;
  state.hoverAngle = null;
  state.peaks = buildPeakList(SAMPLES[state.sampleKey]);
  state.data = buildPatternData(SAMPLES[state.sampleKey], state.peaks);
  state.yMaximum = calculateYMaximum(state.data);
  state.status = "loaded";
  state.renderedPeakCount = -1;

  const sample = SAMPLES[state.sampleKey];
  elements.powderSample.hidden = false;
  elements.sampleStopLight.setAttribute("stop-color", sample.colors[0]);
  elements.sampleStopDark.setAttribute("stop-color", sample.colors[1]);
  elements.sampleLabel.textContent = `${sample.shortName} powder loaded`;
  elements.fingerprintCopy.textContent = sample.fingerprint;
  updatePhaseLegend(sample);
  setSetupMessage("");
  renderAll(true);
}

function readScanRange() {
  const start = Number(elements.startAngle.value);
  const end = Number(elements.endAngle.value);

  if (!Number.isFinite(start) || !Number.isFinite(end)) {
    setSetupMessage("Enter both scan angles.");
    return null;
  }
  if (start < 10 || start > 80 || end < 40 || end > 130) {
    setSetupMessage("Use a start angle from 10° to 80° and an end angle from 40° to 130°.");
    return null;
  }
  if (end - start < 10) {
    setSetupMessage("The end angle must be at least 10° greater than the start angle.");
    return null;
  }
  return { start, end };
}

function startScan() {
  if (state.status !== "loaded") return;
  state.status = "running";
  state.lastTimestamp = null;
  renderAll(true);
  state.animationFrame = requestAnimationFrame(advanceScan);
}

function togglePause() {
  if (state.status === "running") {
    state.status = "paused";
    state.lastTimestamp = null;
    if (state.animationFrame) cancelAnimationFrame(state.animationFrame);
    state.animationFrame = null;
    renderAll();
    return;
  }

  if (state.status === "paused") {
    state.status = "running";
    state.lastTimestamp = null;
    renderAll();
    state.animationFrame = requestAnimationFrame(advanceScan);
  }
}

function advanceScan(timestamp) {
  if (state.status !== "running") return;
  if (state.lastTimestamp === null) state.lastTimestamp = timestamp;
  const elapsed = Math.min((timestamp - state.lastTimestamp) / 1000, 0.08);
  state.lastTimestamp = timestamp;
  const playback = Number(elements.playback.value) || 1;
  state.currentAngle = Math.min(
    state.endAngle,
    state.currentAngle + BASE_SCAN_SPEED * playback * elapsed
  );
  state.progress = (state.currentAngle - state.startAngle) / (state.endAngle - state.startAngle);

  if (state.currentAngle >= state.endAngle - 1e-6) {
    state.currentAngle = state.endAngle;
    state.progress = 1;
    state.status = "complete";
    state.animationFrame = null;
    renderAll(true);
    return;
  }

  renderAll();
  state.animationFrame = requestAnimationFrame(advanceScan);
}

function resetExperiment() {
  if (state.animationFrame) cancelAnimationFrame(state.animationFrame);
  state.animationFrame = null;
  state.status = "unloaded";
  state.sampleKey = elements.sampleSelect.value;
  state.startAngle = Number(elements.startAngle.value) || 20;
  state.endAngle = Number(elements.endAngle.value) || 100;
  state.currentAngle = state.startAngle;
  state.progress = 0;
  state.peaks = [];
  state.data = [];
  state.yMaximum = 110;
  state.selectedPeakId = null;
  state.hoverAngle = null;
  state.lastTimestamp = null;
  state.renderedPeakCount = -1;
  elements.powderSample.hidden = true;
  elements.sampleLabel.textContent = "No sample loaded";
  elements.fingerprintCopy.textContent = "Load a sample to generate its allowed powder reflections.";
  setSetupMessage("");
  updatePreview();
  renderAll(true);
}

function renderAll(forceTable = false) {
  updateControls();
  updateStatus();
  updateInstrument();
  updateReadings();
  renderPeakTable(forceTable);
  updatePeakInspector();
  updateChartDescription();
  drawChart();
}

function updateControls() {
  const unloaded = state.status === "unloaded";
  const running = state.status === "running";
  const paused = state.status === "paused";
  const complete = state.status === "complete";

  elements.sampleSelect.disabled = !unloaded;
  elements.startAngle.disabled = !unloaded;
  elements.endAngle.disabled = !unloaded;
  elements.loadSample.disabled = !unloaded;
  elements.startScan.disabled = state.status !== "loaded";
  elements.pauseScan.disabled = !running && !paused;
  elements.pauseScan.textContent = paused ? "Resume scan" : "Pause scan";
  elements.reset.disabled = unloaded;
  elements.downloadCsv.disabled = !complete;
}

function updateStatus() {
  const sample = SAMPLES[state.sampleKey];
  const messages = {
    unloaded: ["Waiting for sample", "Choose a specimen and scan range, then load the powder holder."],
    loaded: ["Sample mounted", `${sample.shortName} is aligned. Start the coupled θ–2θ scan.`],
    running: ["Scanning", `Detector collecting from ${state.startAngle.toFixed(0)}° to ${state.endAngle.toFixed(0)}° 2θ.`],
    paused: ["Scan paused", `Detector held at ${state.currentAngle.toFixed(2)}° 2θ.`],
    complete: ["Scan complete", `${sample.shortName} pattern collected. Inspect the peak table or download the CSV.`]
  };
  const [title, copy] = messages[state.status];
  if (elements.machineState.textContent !== title) elements.machineState.textContent = title;
  if (elements.statusCopy.textContent !== copy) elements.statusCopy.textContent = copy;
  elements.scanProgress.style.width = `${Math.max(0, Math.min(100, state.progress * 100))}%`;
}

function updateInstrument() {
  const angle = clamp(state.currentAngle, 0, 170);
  const theta = angle / 2;
  const centerX = 340;
  const centerY = 253;
  const radius = 200;
  const radians = -angle * Math.PI / 180;
  const detectorX = centerX + radius * Math.cos(radians);
  const detectorY = centerY + radius * Math.sin(radians);
  const active = state.status === "running";

  elements.detectorGroup.setAttribute("transform", `translate(${detectorX.toFixed(2)} ${detectorY.toFixed(2)}) rotate(${(-angle).toFixed(2)})`);
  setLine(elements.detectorArm, centerX, centerY, detectorX, detectorY);
  setLine(elements.diffractedBeam, centerX, centerY, detectorX - 34 * Math.cos(radians), detectorY - 34 * Math.sin(radians));
  setLine(elements.diffractedBeamGlow, centerX, centerY, detectorX - 34 * Math.cos(radians), detectorY - 34 * Math.sin(radians));
  elements.sampleStage.setAttribute("transform", `rotate(${(-theta).toFixed(2)} ${centerX} ${centerY})`);

  const arcRadius = 50;
  const arcX = centerX + arcRadius * Math.cos(radians);
  const arcY = centerY + arcRadius * Math.sin(radians);
  elements.angleArc.setAttribute("d", `M ${centerX + arcRadius} ${centerY} A ${arcRadius} ${arcRadius} 0 0 0 ${arcX.toFixed(2)} ${arcY.toFixed(2)}`);
  elements.angleLabel.textContent = `2θ = ${angle.toFixed(1)}°`;
  elements.mobileDetectorAngle.textContent = `2θ = ${angle.toFixed(1)}°`;
  elements.mobileSampleState.textContent = state.status === "unloaded"
    ? "No sample loaded"
    : `${SAMPLES[state.sampleKey].shortName} powder loaded`;

  [elements.sourceIndicator, elements.detectorIndicator].forEach((item) => item.classList.toggle("is-active", active));
  [elements.incidentBeam, elements.incidentBeamGlow, elements.diffractedBeam, elements.diffractedBeamGlow]
    .forEach((item) => item.classList.toggle("is-active", active));

  if (state.status === "unloaded") {
    elements.stageExplanation.textContent = "The source is fixed. During a coupled scan, the specimen turns through θ while the detector moves through 2θ.";
    elements.instrumentDescription.textContent = `The sample holder is empty and the detector is parked at ${angle.toFixed(1)} degrees two-theta.`;
  } else {
    elements.stageExplanation.textContent = `The specimen is at θ = ${theta.toFixed(2)}° and the detector is at 2θ = ${angle.toFixed(2)}°.`;
    elements.instrumentDescription.textContent = `${SAMPLES[state.sampleKey].name} is mounted. The specimen is at ${theta.toFixed(2)} degrees and the detector is at ${angle.toFixed(2)} degrees two-theta.`;
  }
}

function updateReadings() {
  const angle = state.currentAngle;
  const point = dataPointAt(angle);
  const spacing = braggSpacing(angle);
  const nearest = nearestPeak(angle, 0.38);
  const encountered = nearest && nearest.twoTheta <= state.currentAngle + DATA_STEP ? nearest : null;

  elements.twoThetaValue.textContent = `${angle.toFixed(2)}°`;
  elements.thetaValue.textContent = `${(angle / 2).toFixed(2)}°`;
  elements.intensityValue.textContent = state.status === "unloaded" ? "0.0 a.u." : `${(point?.intensity || 0).toFixed(1)} a.u.`;
  elements.spacingValue.textContent = state.status !== "unloaded" && Number.isFinite(spacing) ? `${spacing.toFixed(3)} Å` : "—";
  elements.reflectionValue.textContent = encountered ? `${encountered.phaseName} (${encountered.label})` : "—";
  elements.progressValue.textContent = `${Math.round(state.progress * 100)}%`;
}

function buildPeakList(sample) {
  const peaks = [];
  sample.phases.forEach((phase) => {
    phase.reflections.forEach((reflection) => {
      const [h, k, l, relativeIntensity, customLabel] = reflection;
      const spacing = dSpacing(phase.cell, h, k, l);
      const twoTheta = twoThetaFromSpacing(spacing);
      if (!Number.isFinite(twoTheta)) return;
      const label = customLabel || `${h}${k}${l}`;
      peaks.push({
        id: `${phase.id}-${label.replace("/", "-")}`,
        phaseId: phase.id,
        phaseName: phase.name,
        structure: phase.structure,
        color: phase.color,
        h,
        k,
        l,
        label,
        spacing,
        twoTheta,
        rawIntensity: relativeIntensity * phase.weight,
        width: 0.25 + 0.00115 * Math.max(0, twoTheta - 20)
      });
    });
  });

  const maximum = Math.max(...peaks.map((peak) => peak.rawIntensity), 1);
  peaks.forEach((peak) => {
    peak.intensity = 100 * peak.rawIntensity / maximum;
  });
  return peaks.sort((first, second) => first.twoTheta - second.twoTheta);
}

function buildPatternData(sample, peaks) {
  const data = [];
  const count = Math.floor((state.endAngle - state.startAngle) / DATA_STEP) + 1;

  for (let index = 0; index < count; index += 1) {
    const angle = state.startAngle + index * DATA_STEP;
    const background = sample.background + 3.6 * Math.exp(-(angle - state.startAngle) / 32);
    let signal = 0;
    peaks.forEach((peak) => {
      const sigma = peak.width / 2.35482;
      const distance = (angle - peak.twoTheta) / sigma;
      signal += peak.intensity * Math.exp(-0.5 * distance * distance);
    });
    const noiseAmplitude = sample.noise * (1 + Math.sqrt(Math.max(signal, 0)) / 28);
    const noise = (seededNoise(index, sample.seed) - 0.5) * 2 * noiseAmplitude;
    data.push({ angle, intensity: Math.max(0, background + signal + noise) });
  }

  return data;
}

function dSpacing(cell, h, k, l) {
  if (cell.type === "hexagonal") {
    const reciprocalSquared = (4 / 3) * (h * h + h * k + k * k) / (cell.a * cell.a) + (l * l) / (cell.c * cell.c);
    return 1 / Math.sqrt(reciprocalSquared);
  }
  return cell.a / Math.sqrt(h * h + k * k + l * l);
}

function twoThetaFromSpacing(spacing) {
  const argument = WAVELENGTH / (2 * spacing);
  if (argument <= 0 || argument > 1) return NaN;
  return 2 * Math.asin(argument) * 180 / Math.PI;
}

function braggSpacing(twoTheta) {
  const sine = Math.sin(twoTheta * Math.PI / 360);
  return sine > 0 ? WAVELENGTH / (2 * sine) : NaN;
}

function seededNoise(index, seed) {
  const value = Math.sin((index + 1) * 12.9898 + seed * 78.233) * 43758.5453;
  return value - Math.floor(value);
}

function calculateYMaximum(data) {
  const maximum = Math.max(...data.map((point) => point.intensity), 100);
  return Math.ceil((maximum + 5) / 10) * 10;
}

function dataPointAt(angle) {
  if (state.data.length === 0) return null;
  const index = clamp(Math.round((angle - state.startAngle) / DATA_STEP), 0, state.data.length - 1);
  return state.data[index];
}

function nearestPeak(angle, tolerance = Infinity) {
  let closest = null;
  let distance = Infinity;
  state.peaks.forEach((peak) => {
    if (peak.twoTheta < state.startAngle || peak.twoTheta > state.endAngle) return;
    const difference = Math.abs(peak.twoTheta - angle);
    if (difference < distance) {
      distance = difference;
      closest = peak;
    }
  });
  return distance <= tolerance ? closest : null;
}

function encounteredPeaks() {
  if (state.status === "unloaded") return [];
  return state.peaks.filter((peak) =>
    peak.twoTheta >= state.startAngle &&
    peak.twoTheta <= state.endAngle &&
    peak.twoTheta <= state.currentAngle + DATA_STEP
  );
}

function renderPeakTable(force = false) {
  const peaks = encounteredPeaks();
  if (!force && peaks.length === state.renderedPeakCount) return;
  const focusedPeakId = document.activeElement?.dataset?.peakId || null;
  state.renderedPeakCount = peaks.length;

  if (peaks.length === 0) {
    elements.peakTableBody.innerHTML = '<tr class="empty-row"><td colspan="8">No reflections encountered yet.</td></tr>';
  } else {
    elements.peakTableBody.innerHTML = peaks.map((peak, index) => `
      <tr class="${peak.id === state.selectedPeakId ? "is-selected" : ""}">
        <td>${index + 1}</td>
        <td class="phase-cell"><i class="phase-dot" style="--phase-color: ${peak.color}" aria-hidden="true"></i>${escapeHtml(peak.phaseName)}</td>
        <td>${escapeHtml(peak.structure)}</td>
        <td>(${escapeHtml(peak.label)})</td>
        <td>${peak.twoTheta.toFixed(3)}</td>
        <td>${peak.spacing.toFixed(4)}</td>
        <td>${peak.intensity.toFixed(0)}</td>
        <td><button class="peak-inspect" type="button" data-peak-id="${escapeHtml(peak.id)}" aria-label="Inspect ${escapeHtml(peak.phaseName)} reflection ${escapeHtml(peak.label)}">Inspect</button></td>
      </tr>
    `).join("");
  }

  const totalInRange = state.peaks.filter((peak) => peak.twoTheta >= state.startAngle && peak.twoTheta <= state.endAngle).length;
  elements.peakCount.textContent = state.status === "unloaded"
    ? "No reflections encountered"
    : `${peaks.length} of ${totalInRange} reflections encountered`;

  if (focusedPeakId) {
    const replacement = [...elements.peakTableBody.querySelectorAll("[data-peak-id]")]
      .find((button) => button.dataset.peakId === focusedPeakId);
    replacement?.focus();
  }
}

function handlePeakTableClick(event) {
  const button = event.target.closest("[data-peak-id]");
  if (!button) return;
  selectPeak(button.dataset.peakId);
}

function selectPeak(peakId) {
  state.selectedPeakId = peakId;
  state.renderedPeakCount = -1;
  renderPeakTable(true);
  updatePeakInspector();
  drawChart();
}

function handleChartPointer(event) {
  if (!chartMetrics || state.status === "unloaded") return;
  const rectangle = elements.chart.getBoundingClientRect();
  const localX = event.clientX - rectangle.left;
  if (localX < chartMetrics.left || localX > chartMetrics.right) {
    state.hoverAngle = null;
  } else {
    state.hoverAngle = xToAngle(localX);
  }
  updatePeakInspector();
  drawChart();
}

function selectChartPeak() {
  if (state.hoverAngle === null) return;
  const peak = nearestPeak(state.hoverAngle, 1.1);
  if (peak && peak.twoTheta <= state.currentAngle + DATA_STEP) selectPeak(peak.id);
}

function updatePeakInspector() {
  const selected = state.peaks.find((peak) => peak.id === state.selectedPeakId);
  if (selected) {
    elements.peakInspector.textContent = `${selected.phaseName} (${selected.label}) · 2θ ${selected.twoTheta.toFixed(3)}° · d ${selected.spacing.toFixed(4)} Å · I/Imax ${selected.intensity.toFixed(0)}%`;
    return;
  }

  if (state.hoverAngle !== null) {
    if (state.status !== "complete" && state.hoverAngle > state.currentAngle + DATA_STEP) {
      elements.peakInspector.textContent = `2θ ${state.hoverAngle.toFixed(2)}° · not yet scanned`;
      return;
    }
    const point = dataPointAt(state.hoverAngle);
    const peak = nearestPeak(state.hoverAngle, 1.1);
    const peakText = peak && peak.twoTheta <= state.currentAngle + DATA_STEP ? ` · nearest ${peak.phaseName} (${peak.label})` : "";
    elements.peakInspector.textContent = `2θ ${state.hoverAngle.toFixed(2)}° · intensity ${(point?.intensity || 0).toFixed(1)} a.u.${peakText}`;
    return;
  }

  elements.peakInspector.textContent = state.status === "unloaded"
    ? "Load a sample to inspect its diffraction pattern."
    : "Move over the graph or inspect a peak in the table.";
}

function updatePhaseLegend(sample) {
  const items = [
    '<span><i style="--phase-color: #2e2a74" aria-hidden="true"></i>Total pattern</span>',
    ...sample.phases.map((phase) => `<span><i style="--phase-color: ${phase.color}" aria-hidden="true"></i>${escapeHtml(phase.name)} peak positions</span>`)
  ];
  elements.phaseLegend.innerHTML = items.join("");
}

function resizeChart() {
  const width = elements.graphFrame.clientWidth;
  const height = elements.graphFrame.clientHeight;
  if (width < 1 || height < 1 || !chartContext) return;
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  elements.chart.width = Math.round(width * ratio);
  elements.chart.height = Math.round(height * ratio);
  elements.chart.style.width = `${width}px`;
  elements.chart.style.height = `${height}px`;
  chartContext.setTransform(ratio, 0, 0, ratio, 0, 0);
  chartMetrics = {
    width,
    height,
    left: 58,
    right: width - 18,
    top: 58,
    bottom: height - 46
  };
  drawChart();
}

function drawChart() {
  if (!chartContext || !chartMetrics) return;
  const context = chartContext;
  const { width, height, left, right, top, bottom } = chartMetrics;
  const plotWidth = Math.max(1, right - left);
  const plotHeight = Math.max(1, bottom - top);
  context.clearRect(0, 0, width, height);
  context.fillStyle = "#fffdfa";
  context.fillRect(0, 0, width, height);

  context.font = "12px system-ui, sans-serif";
  context.textBaseline = "middle";
  context.lineWidth = 1;

  const xTicks = chooseXTicks(state.startAngle, state.endAngle);
  context.strokeStyle = "#e6e0d8";
  context.fillStyle = "#655f82";
  xTicks.forEach((tick) => {
    const x = angleToX(tick);
    context.beginPath();
    context.moveTo(x, top);
    context.lineTo(x, bottom);
    context.stroke();
    context.textAlign = "center";
    context.fillText(tick.toFixed(0), x, bottom + 18);
  });

  const yTicks = 5;
  for (let index = 0; index <= yTicks; index += 1) {
    const value = state.yMaximum * index / yTicks;
    const y = bottom - plotHeight * index / yTicks;
    context.beginPath();
    context.moveTo(left, y);
    context.lineTo(right, y);
    context.stroke();
    context.textAlign = "right";
    context.fillText(value.toFixed(0), left - 8, y);
  }

  context.strokeStyle = "#2e2a74";
  context.lineWidth = 1.4;
  context.beginPath();
  context.moveTo(left, top);
  context.lineTo(left, bottom);
  context.lineTo(right, bottom);
  context.stroke();

  context.fillStyle = "#2e2a74";
  context.font = "700 12px system-ui, sans-serif";
  context.textAlign = "center";
  context.fillText("2θ (degrees)", left + plotWidth / 2, height - 14);
  context.save();
  context.translate(15, top + plotHeight / 2);
  context.rotate(-Math.PI / 2);
  context.fillText("Intensity (a.u.)", 0, 0);
  context.restore();

  if (state.status !== "unloaded" && state.data.length > 0) {
    const visibleIndex = clamp(Math.floor((state.currentAngle - state.startAngle) / DATA_STEP), 0, state.data.length - 1);
    context.strokeStyle = "#2e2a74";
    context.lineWidth = 2.2;
    context.lineJoin = "round";
    context.beginPath();
    state.data.slice(0, visibleIndex + 1).forEach((point, index) => {
      const x = angleToX(point.angle);
      const y = bottom - plotHeight * point.intensity / state.yMaximum;
      if (index === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    });
    context.stroke();

    drawPeakMarkers(context, encounteredPeaks());
  }

  const selected = state.peaks.find((peak) => peak.id === state.selectedPeakId);
  if (selected && selected.twoTheta <= state.currentAngle + DATA_STEP) {
    drawVerticalSelection(context, selected.twoTheta, selected.color, 2);
  }

  if (state.hoverAngle !== null) {
    drawVerticalSelection(context, state.hoverAngle, "#8c86a9", 1);
  }
}

function drawPeakMarkers(context, peaks) {
  if (!chartMetrics) return;
  const { top } = chartMetrics;
  const laneLastX = [-Infinity, -Infinity, -Infinity];

  peaks.forEach((peak) => {
    const x = angleToX(peak.twoTheta);
    context.strokeStyle = peak.color;
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(x, top);
    context.lineTo(x, top + 9);
    context.stroke();

    if (!elements.showLabels.checked) return;
    let lane = laneLastX.findIndex((lastX) => x - lastX > 43);
    if (lane < 0) lane = laneLastX.indexOf(Math.min(...laneLastX));
    laneLastX[lane] = x;
    context.fillStyle = peak.color;
    context.font = "700 10px system-ui, sans-serif";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(`${peak.phaseName} ${peak.label}`, x, top - 35 + lane * 13);
  });
}

function drawVerticalSelection(context, angle, color, width) {
  if (!chartMetrics || angle < state.startAngle || angle > state.endAngle) return;
  const x = angleToX(angle);
  context.save();
  context.strokeStyle = color;
  context.globalAlpha = 0.78;
  context.lineWidth = width;
  context.setLineDash([5, 4]);
  context.beginPath();
  context.moveTo(x, chartMetrics.top);
  context.lineTo(x, chartMetrics.bottom);
  context.stroke();
  context.restore();
}

function updateChartDescription() {
  if (state.status === "unloaded") {
    elements.chart.setAttribute("aria-label", "Powder X-ray diffraction pattern. The graph is empty until a sample is loaded and scanned.");
    return;
  }
  const peakNumber = encounteredPeaks().length;
  elements.chart.setAttribute(
    "aria-label",
    `Live powder X-ray diffraction pattern for ${SAMPLES[state.sampleKey].name}. The scan has reached ${state.currentAngle.toFixed(2)} degrees two-theta and ${peakNumber} reflections have been encountered.`
  );
}

function angleToX(angle) {
  const fraction = (angle - state.startAngle) / Math.max(1e-6, state.endAngle - state.startAngle);
  return chartMetrics.left + fraction * (chartMetrics.right - chartMetrics.left);
}

function xToAngle(x) {
  const fraction = (x - chartMetrics.left) / Math.max(1, chartMetrics.right - chartMetrics.left);
  return state.startAngle + clamp(fraction, 0, 1) * (state.endAngle - state.startAngle);
}

function chooseXTicks(start, end) {
  const range = end - start;
  const rough = range / 6;
  const candidates = [1, 2, 5, 10, 20, 25, 50];
  const step = candidates.find((value) => value >= rough) || 50;
  const ticks = [];
  let value = Math.ceil(start / step) * step;
  while (value <= end + 1e-8) {
    ticks.push(value);
    value += step;
  }
  return ticks;
}

function downloadScanCsv() {
  if (state.status !== "complete" || state.data.length === 0) return;
  const sample = SAMPLES[state.sampleKey];
  const rows = [
    ["sample", sample.name],
    ["radiation", "Cu Kalpha1"],
    ["wavelength_angstrom", WAVELENGTH.toFixed(6)],
    ["start_2theta_deg", state.startAngle.toFixed(2)],
    ["end_2theta_deg", state.endAngle.toFixed(2)],
    [],
    ["two_theta_deg", "intensity_au"],
    ...state.data.map((point) => [point.angle.toFixed(3), point.intensity.toFixed(4)])
  ];
  const csv = rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `xrd-${state.sampleKey}-${state.startAngle.toFixed(0)}-${state.endAngle.toFixed(0)}deg.csv`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function csvCell(value) {
  const text = String(value ?? "");
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function setLine(element, x1, y1, x2, y2) {
  element.setAttribute("x1", x1.toFixed(2));
  element.setAttribute("y1", y1.toFixed(2));
  element.setAttribute("x2", x2.toFixed(2));
  element.setAttribute("y2", y2.toFixed(2));
}

function setSetupMessage(message) {
  elements.setupMessage.textContent = message;
}

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
