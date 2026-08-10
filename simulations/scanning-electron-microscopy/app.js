const elements = {
  signalButtons: [...document.querySelectorAll("[data-sem-signal]")],
  signalGroups: [...document.querySelectorAll("[data-sem-group]")],
  detectors: [...document.querySelectorAll("[data-detector]")],
  figure: document.querySelector("#sem-figure"),
  diagram: document.querySelector("#sem-diagram"),
  diagramDescription: document.querySelector("#sem-diagram-desc"),
  figureCaption: document.querySelector("#sem-figure-caption"),
  replayButton: document.querySelector("#replay-electrons"),
  movingElectrons: [...document.querySelectorAll("[data-motion-path]")],
  selectedTitle: document.querySelector("#selected-signal-title"),
  selectedDescription: document.querySelector("#selected-signal-description"),
  selectedEnergy: document.querySelector("#selected-signal-energy"),
  selectedOrigin: document.querySelector("#selected-signal-origin"),
  selectedInformation: document.querySelector("#selected-signal-information"),
  selectedDetector: document.querySelector("#selected-signal-detector"),
  status: document.querySelector("#sem-status")
};

const SIGNALS = {
  se1: {
    title: "SE1 — direct secondary-electron contribution",
    description: "SE1 is excited directly by the incident primary electrons. Only electrons generated close enough to the surface can escape efficiently.",
    energy: "Conventionally below 50 eV",
    origin: "A shallow region close to the primary-beam impact point",
    information: "Fine surface morphology and local surface-angle contrast",
    detector: "Representative Everhart–Thornley or in-lens SE detector",
    caption: "SE1 originates close to the primary trajectory and escapes from the top few nanometres of many materials.",
    diagramDescription: "The primary beam reaches the specimen and shallow SE1 electrons leave close to the impact point toward a side secondary-electron detector.",
    status: "SE1 selected. Low-energy secondary electrons are shown leaving close to the primary impact point."
  },
  se2: {
    title: "SE2 — BSE-generated secondary-electron contribution",
    description: "A backscattered primary electron first travels away from the incident point, then excites a low-energy secondary electron near a laterally displaced surface exit.",
    energy: "SE2 below 50 eV; its BSE precursor has a broad energy distribution up to E<sub>0</sub>",
    origin: "A shallow surface location displaced from the primary-beam impact point",
    information: "Broader, lower-resolution SE background with possible BSE-like contrast",
    detector: "The same representative SE detector that can collect SE1",
    caption: "The purple precursor is a returning BSE; the orange path is the SE2 electron born near its displaced surface exit.",
    diagramDescription: "A backscattered electron travels through the specimen to a surface location away from the beam, where it creates an SE2 electron that reaches the secondary-electron detector.",
    status: "SE2 selected. Its required BSE precursor and laterally displaced secondary-electron origin are shown."
  },
  bse: {
    title: "Backscattered electrons",
    description: "BSE are incident primary electrons that return from the specimen after elastic and inelastic scattering. They do not all retain one fixed energy.",
    energy: "Broad distribution: about 50 eV &lt; E<sub>BSE</sub> ≤ E<sub>0</sub>; many retain a substantial fraction of E<sub>0</sub>",
    origin: "A larger, deeper, and laterally broader region than escaping secondary electrons",
    information: "Mean-atomic-number contrast, with additional topographic, detector-geometry, and orientation effects",
    detector: "Representative annular solid-state BSE detector",
    caption: "Returning primary electrons emerge from a broader volume and are collected above the specimen.",
    diagramDescription: "Several primary electrons scatter within the broad interaction volume and return upward to an annular backscattered-electron detector.",
    status: "BSE selected. Returning primaries from the broader interaction volume are visible."
  },
  xray: {
    title: "Characteristic and continuum X-rays",
    description: "Inner-shell ionization can produce discrete characteristic X-rays, while electron deceleration produces a continuous bremsstrahlung background. Both reach the EDS detector.",
    energy: "Characteristic hν = ΔE; continuum 0 &lt; hν ≤ E<sub>0</sub>",
    origin: "Much of the electron-scattering volume, modified by absorption and secondary fluorescence",
    information: "Elemental identification and qualitative spatial distribution; quantitative work requires corrections",
    detector: "Energy-dispersive X-ray spectrometer (EDS/EDX)",
    caption: "Solid waves represent discrete characteristic photons; the dashed wave represents the continuum beneath those peaks.",
    diagramDescription: "Characteristic and continuum X-ray photons emerge from the interaction volume toward an energy-dispersive X-ray detector.",
    status: "X-rays selected. Characteristic photons and continuum background are shown reaching one EDS detector."
  },
  auger: {
    title: "Auger electrons",
    description: "After an inner-shell vacancy forms, non-radiative relaxation can transfer energy to an Auger electron instead of emitting a characteristic X-ray.",
    energy: "Discrete, element- and transition-specific kinetic energy; commonly eV to keV",
    origin: "An ultrashallow escape depth, roughly fractions of a nanometre to several nanometres",
    information: "Surface elemental and chemical-state information on clean, controlled surfaces",
    detector: "Dedicated electron-energy analyser used for Auger electron spectroscopy",
    caption: "The short green path emphasizes that Auger electrons are strongly surface localized and require specialist analysis.",
    diagramDescription: "A surface-localized Auger electron leaves near the beam impact point and travels toward a dedicated energy analyser.",
    status: "Auger selected. The ultrashallow alternative atomic-relaxation channel is highlighted."
  },
  cl: {
    title: "Cathodoluminescence",
    description: "Electron-beam excitation can produce UV, visible, or infrared photons through radiative recombination in suitable materials.",
    energy: "Material-dependent photon energy, commonly described by wavelength or hν",
    origin: "Excited regions within and sometimes beyond the electron-scattering volume because carriers can diffuse",
    information: "Band-gap, defect, impurity, and growth-zone behaviour in suitable semiconductors, insulators, and minerals",
    detector: "Optical mirror plus spectrometer or photodetector",
    caption: "Magenta waves travel to optical collection hardware; many specimens luminesce weakly or not at all.",
    diagramDescription: "Cathodoluminescence photons leave the excited specimen region and travel toward representative optical collection hardware.",
    status: "Cathodoluminescence selected. Material-dependent UV, visible, and infrared emission paths are visible."
  },
  current: {
    title: "Absorbed or specimen current",
    description: "Specimen current is an electrical balance, not an outgoing particle. A grounded conductor carries net charge through the stage to a meter.",
    energy: "Electrical current; not a particle-energy spectrum",
    origin: "Net electron flow remaining after emitted and transmitted electron currents are accounted for",
    information: "Beam-current balance, conductivity, charging, and current-based imaging modes",
    detector: "Ground lead and ammeter or current amplifier",
    caption: "The downward path and meter represent net specimen current. Photon channels are not subtracted as electron-number currents.",
    diagramDescription: "An arrow runs through the specimen to a grounded current meter, representing net absorbed specimen current rather than an emitted particle.",
    status: "Specimen current selected. The grounded electrical-current path is highlighted."
  }
};

const state = {
  signal: "se1",
  animationFrame: 0,
  animationStart: 0,
  animationRunning: false
};

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const animationDuration = 4200;
const electronTravelTime = 1800;

function setSignalButtonState(signal) {
  elements.signalButtons.forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.semSignal === signal));
  });
}

function setDetectorState(signal) {
  elements.detectors.forEach((detector) => {
    const supportedSignals = detector.dataset.detector.split(/\s+/);
    detector.classList.toggle("is-active", supportedSignals.includes(signal));
  });
}

function setSignalGroupVisibility(signal) {
  elements.signalGroups.forEach((group) => {
    const visible = group.dataset.semGroup === signal;
    group.toggleAttribute("hidden", !visible);
  });
}

function updateSignalDetails(definition) {
  elements.selectedTitle.textContent = definition.title;
  elements.selectedDescription.textContent = definition.description;
  elements.selectedEnergy.innerHTML = definition.energy;
  elements.selectedOrigin.textContent = definition.origin;
  elements.selectedInformation.textContent = definition.information;
  elements.selectedDetector.textContent = definition.detector;
  elements.figureCaption.textContent = definition.caption;
  elements.diagramDescription.textContent = definition.diagramDescription;
}

function renderSignal(signal, announce = true) {
  const definition = SIGNALS[signal];
  if (!definition) return;

  state.signal = signal;
  setSignalButtonState(signal);
  setSignalGroupVisibility(signal);
  setDetectorState(signal);
  updateSignalDetails(definition);

  if (announce) {
    elements.status.textContent = definition.status;
    replayElectronPaths(false);
  }
}

function hideMovingElectrons() {
  elements.movingElectrons.forEach((electron) => {
    electron.style.opacity = "0";
  });
}

function stopElectronAnimation() {
  if (state.animationFrame) cancelAnimationFrame(state.animationFrame);
  state.animationFrame = 0;
  state.animationRunning = false;
  elements.figure.classList.remove("is-replaying");
  hideMovingElectrons();
  elements.replayButton.disabled = reducedMotion.matches;
  elements.replayButton.textContent = reducedMotion.matches ? "Motion reduced" : "Replay electron paths";
}

function drawElectronOnPath(electron, elapsed) {
  const delay = Number(electron.dataset.delay) || 0;
  const localTime = elapsed - delay;
  if (localTime < 0 || localTime > electronTravelTime) {
    electron.style.opacity = "0";
    return;
  }

  const path = document.getElementById(electron.dataset.motionPath);
  if (!path || typeof path.getTotalLength !== "function") return;
  const progress = Math.min(1, Math.max(0, localTime / electronTravelTime));
  const easedProgress = progress < 0.5
    ? 2 * progress * progress
    : 1 - Math.pow(-2 * progress + 2, 2) / 2;
  const point = path.getPointAtLength(path.getTotalLength() * easedProgress);
  electron.setAttribute("cx", point.x.toFixed(2));
  electron.setAttribute("cy", point.y.toFixed(2));
  electron.style.opacity = progress > 0.97 ? String((1 - progress) / 0.03) : "1";
}

function animateElectronPaths(timestamp) {
  if (!state.animationStart) state.animationStart = timestamp;
  const elapsed = timestamp - state.animationStart;
  elements.movingElectrons.forEach((electron) => drawElectronOnPath(electron, elapsed));

  if (elapsed < animationDuration && !document.hidden) {
    state.animationFrame = requestAnimationFrame(animateElectronPaths);
    return;
  }

  stopElectronAnimation();
}

function replayElectronPaths(announce = true) {
  if (reducedMotion.matches) {
    stopElectronAnimation();
    if (announce) elements.status.textContent = "Reduced-motion preference is active. Static beam and signal paths remain visible.";
    return;
  }

  if (state.animationFrame) cancelAnimationFrame(state.animationFrame);
  state.animationFrame = 0;
  state.animationStart = 0;
  state.animationRunning = true;
  hideMovingElectrons();
  elements.figure.classList.remove("is-replaying");
  void elements.figure.offsetWidth;
  elements.figure.classList.add("is-replaying");
  elements.replayButton.disabled = true;
  elements.replayButton.textContent = "Replaying…";
  state.animationFrame = requestAnimationFrame(animateElectronPaths);
  if (announce) elements.status.textContent = "Primary electrons are travelling through the lenses and scattering inside the specimen.";
}

function handleReducedMotionChange() {
  stopElectronAnimation();
  if (!reducedMotion.matches) {
    elements.replayButton.disabled = false;
    elements.replayButton.textContent = "Replay electron paths";
  }
}

function initialiseSemExplorer() {
  if (!elements.diagram || !elements.figure || !elements.replayButton) return;

  elements.signalButtons.forEach((button) => {
    button.addEventListener("click", () => renderSignal(button.dataset.semSignal));
  });
  elements.replayButton.addEventListener("click", () => replayElectronPaths(true));
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stopElectronAnimation();
  });
  if (typeof reducedMotion.addEventListener === "function") {
    reducedMotion.addEventListener("change", handleReducedMotionChange);
  }

  renderSignal("se1", false);
  if (reducedMotion.matches) {
    stopElectronAnimation();
  } else {
    replayElectronPaths(false);
  }
}

initialiseSemExplorer();
