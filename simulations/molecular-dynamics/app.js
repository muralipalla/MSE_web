const PARTICLE_COUNT = 100;
const LATTICE_COLUMNS = 10;
const LATTICE_ROWS = 10;
const REFERENCE_NUMBER_DENSITY = 0.8;
const LATTICE_SPACING = Math.sqrt(2 / (Math.sqrt(3) * REFERENCE_NUMBER_DENSITY));
const BOX = {
  x: LATTICE_COLUMNS * LATTICE_SPACING,
  y: LATTICE_ROWS * Math.sqrt(3) * 0.5 * LATTICE_SPACING
};
const THERMAL_DEGREES_OF_FREEDOM = 2 * PARTICLE_COUNT - 2;
const POW_TWO_ONE_SIXTH = Math.pow(2, 1 / 6);
const CUTOFF_RATIO = 2.5;
const FORCE_SHIFT_MINIMUM_RATIO = findForceShiftedMinimumRatio();
const FORCE_SHIFT_WELL_FACTOR = -shiftedPotentialShape(FORCE_SHIFT_MINIMUM_RATIO);
const RANDOM_MINIMUM_DISTANCE_FACTOR = 0.92;
const OVERLAP_STOP_RATIO = 0.72;
const HISTORY_INTERVAL = 10;
const HISTORY_LIMIT = 2000;
const STEPS_PER_FRAME = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 1 : 5;

const COLORS = {
  ink: "#2e2a74",
  inkSoft: "#655f82",
  grid: "#e6e0d8",
  paper: "#fffdfa",
  coral: "#c93b1f",
  orange: "#c9872a",
  blue: "#386694",
  lavender: "#6757a8",
  wall: "#aeb8d1"
};

const elements = {
  rMinSlider: document.querySelector("#rmin-slider"),
  rMinValue: document.querySelector("#rmin-value"),
  epsilonSlider: document.querySelector("#epsilon-slider"),
  epsilonValue: document.querySelector("#epsilon-value"),
  timestepSlider: document.querySelector("#timestep-slider"),
  timestepValue: document.querySelector("#timestep-value"),
  timestepGuidance: document.querySelector("#timestep-guidance"),
  densityValue: document.querySelector("#density-value"),
  temperatureSlider: document.querySelector("#temperature-slider"),
  temperatureTarget: document.querySelector("#temperature-target"),
  pbcToggle: document.querySelector("#pbc-toggle"),
  latticeConfig: document.querySelector("#lattice-config"),
  randomConfig: document.querySelector("#random-config"),
  initializeVelocities: document.querySelector("#initialize-velocities"),
  runSimulation: document.querySelector("#run-simulation"),
  singleStep: document.querySelector("#single-step"),
  resetSimulation: document.querySelector("#reset-simulation"),
  downloadResults: document.querySelector("#download-results"),
  runState: document.querySelector("#run-state"),
  velocityMessage: document.querySelector("#velocity-message"),
  boundaryNote: document.querySelector("#boundary-note"),
  potentialNote: document.querySelector("#potential-note"),
  resultsNote: document.querySelector("#results-note"),
  stepValue: document.querySelector("#step-value"),
  timeValue: document.querySelector("#time-value"),
  temperatureValue: document.querySelector("#temperature-value"),
  energyValue: document.querySelector("#energy-value"),
  driftValue: document.querySelector("#drift-value"),
  ljChart: document.querySelector("#lj-chart"),
  atomCanvas: document.querySelector("#atom-canvas"),
  energyChart: document.querySelector("#energy-chart"),
  temperatureChart: document.querySelector("#temperature-chart")
};

const state = {
  atoms: [],
  configuration: "lattice",
  periodic: true,
  velocitiesReady: false,
  running: false,
  unstable: false,
  step: 0,
  time: 0,
  rMin: 1.12,
  epsilon: 1,
  dt: 0.003,
  targetTemperature: 0.75,
  potentialEnergy: 0,
  kineticEnergy: 0,
  thermalKineticEnergy: 0,
  temperature: 0,
  totalEnergy: 0,
  referenceEnergy: null,
  history: [],
  exportHistory: [],
  animationFrame: null,
  forceError: "",
  seed: 20260808
};

initialize();

function initialize() {
  bindEvents();
  buildConfiguration("lattice", false);
  updateParameterLabels();
  updateBoundaryCopy();
  updateControls();
  updateReadings();
  resizeAndDrawAll();

  const observer = new ResizeObserver(resizeAndDrawAll);
  [elements.ljChart, elements.atomCanvas, elements.energyChart, elements.temperatureChart]
    .forEach((canvas) => observer.observe(canvas.parentElement));
}

function bindEvents() {
  elements.rMinSlider.addEventListener("input", handlePotentialChange);
  elements.epsilonSlider.addEventListener("input", handlePotentialChange);
  elements.timestepSlider.addEventListener("input", handleTimestepChange);
  elements.temperatureSlider.addEventListener("input", handleTemperatureChange);
  elements.pbcToggle.addEventListener("change", handleBoundaryChange);
  elements.latticeConfig.addEventListener("click", () => buildConfiguration("lattice"));
  elements.randomConfig.addEventListener("click", () => buildConfiguration("random"));
  elements.initializeVelocities.addEventListener("click", initializeRandomVelocities);
  elements.runSimulation.addEventListener("click", toggleRun);
  elements.singleStep.addEventListener("click", takeSingleStep);
  elements.resetSimulation.addEventListener("click", resetSimulation);
  elements.downloadResults.addEventListener("click", downloadResultsCsv);
}

function handlePotentialChange() {
  stopAnimation();
  state.rMin = Number(elements.rMinSlider.value);
  state.epsilon = Number(elements.epsilonSlider.value);
  updateParameterLabels();

  const interaction = interactionParameters();
  if (state.configuration === "random"
    && minimumPairDistance(state.atoms) < 0.995 * interaction.sigma) {
    buildConfiguration("random", false);
    setRunState("Random positions rebuilt");
    setResultsNote("The random positions were rebuilt to remain overlap-free at the new interaction size.");
    drawPotentialChart();
    updateControls();
    return;
  }

  const forcesReady = computeForces();
  if (forcesReady) updateMeasurements();

  if (!forcesReady) {
    markTrajectoryUnstable(state.forceError);
  } else if (state.velocitiesReady && !state.unstable) {
    beginNewMeasurementSegment("The interaction changed; a fresh trajectory segment has started.");
    setRunState("Interaction changed");
  } else if (state.unstable) {
    setResultsNote("The stopped trajectory cannot be resumed safely. Rebuild the positions and initialize velocities again.");
  } else {
    setResultsNote("The interaction is ready. Initialize velocities to start a trajectory.");
  }

  drawPotentialChart();
  drawAtomCanvas();
  drawResultsCharts();
  updateReadings();
  updateCanvasDescriptions();
  updateControls();
}

function handleTimestepChange() {
  stopAnimation();
  state.dt = Number(elements.timestepSlider.value);
  updateParameterLabels();
  if (state.unstable) {
    setRunState("Rebuild required");
    setResultsNote("The smaller time step will apply after you rebuild the positions and initialize velocities again.");
  } else if (state.velocitiesReady) {
    beginNewMeasurementSegment("The time step changed; a fresh trajectory segment has started.");
    setRunState("Time step changed");
    renderDynamicViews();
  } else {
    setResultsNote("The time step is ready. Initialize velocities to start a trajectory.");
  }
  updateControls();
}

function handleTemperatureChange() {
  stopAnimation();
  state.targetTemperature = Number(elements.temperatureSlider.value);
  updateParameterLabels();

  if (state.unstable) {
    elements.velocityMessage.textContent = "Rebuild the positions before initializing a new temperature.";
    setRunState("Rebuild required");
    setResultsNote("The new target temperature will apply after the positions are rebuilt.");
    updateControls();
    return;
  }

  if (!state.velocitiesReady) {
    elements.velocityMessage.textContent = `Random velocities will be scaled to T* = ${state.targetTemperature.toFixed(2)}.`;
    drawTemperatureChart();
    return;
  }

  rescaleVelocities(state.targetTemperature);
  updateMeasurements();
  beginNewMeasurementSegment(`Velocities were rescaled once to T* = ${state.targetTemperature.toFixed(2)}; a fresh NVE segment has started.`);
  setRunState("Velocities rescaled");
  elements.velocityMessage.textContent = `Current velocities rescaled to T* = ${state.targetTemperature.toFixed(2)}.`;
  renderDynamicViews();
}

function handleBoundaryChange() {
  stopAnimation();
  state.periodic = elements.pbcToggle.checked;
  applyAllBoundaries();

  if (state.periodic
    && minimumPairDistance(state.atoms) < 0.995 * interactionParameters().sigma) {
    const configurationName = state.configuration === "random" ? "Random" : "Triangular";
    buildConfiguration(state.configuration, false);
    updateBoundaryCopy();
    setRunState(`${configurationName} positions rebuilt for PBC`);
    setResultsNote("The positions were rebuilt because opposite edges become neighbours under PBC.");
    return;
  }

  if (state.velocitiesReady && state.periodic) removeCenterOfMassVelocity();
  const forcesReady = computeForces();
  if (forcesReady) updateMeasurements();
  updateBoundaryCopy();

  if (!forcesReady) {
    markTrajectoryUnstable(state.forceError);
  } else if (state.velocitiesReady && !state.unstable) {
    beginNewMeasurementSegment(`${state.periodic ? "Periodic boundaries" : "Reflecting walls"} applied; a fresh trajectory segment has started.`);
    setRunState(state.periodic ? "PBC applied" : "Reflecting walls applied");
  } else if (state.unstable) {
    setResultsNote("The boundary setting is ready, but the stopped trajectory must be rebuilt before it can run again.");
  }

  drawAtomCanvas();
  drawResultsCharts();
  updateReadings();
  updateCanvasDescriptions();
  updateControls();
}

function buildConfiguration(type, announce = true) {
  stopAnimation();
  state.configuration = type;
  state.unstable = false;
  state.step = 0;
  state.time = 0;
  state.velocitiesReady = false;
  state.referenceEnergy = null;
  state.history = [];
  state.exportHistory = [];
  state.forceError = "";

  state.atoms = type === "lattice" ? createTriangularLattice() : createRandomConfiguration();
  zeroVelocities();
  computeForces();
  updateMeasurements();
  updateConfigurationButtons();
  updateControls();
  updateReadings();
  drawAtomCanvas();
  drawResultsCharts();
  updateCanvasDescriptions();

  elements.velocityMessage.textContent = "Velocities are zero. Initialize them before running.";
  setResultsNote("Initialize velocities to establish the starting energy and temperature.");
  if (announce) setRunState(type === "lattice" ? "Triangular positions ready" : "Random positions ready");
}

function createTriangularLattice() {
  const atoms = [];
  const rowSpacing = Math.sqrt(3) * 0.5 * LATTICE_SPACING;
  for (let row = 0; row < LATTICE_ROWS; row += 1) {
    for (let column = 0; column < LATTICE_COLUMNS; column += 1) {
      atoms.push({
        x: (column + 0.5 + 0.5 * (row % 2)) * LATTICE_SPACING % BOX.x,
        y: (row + 0.5) * rowSpacing,
        vx: 0,
        vy: 0,
        fx: 0,
        fy: 0
      });
    }
  }
  return atoms;
}

function createRandomConfiguration() {
  const rng = mulberry32(state.seed += 97);
  const atoms = createTriangularLattice();
  const minimumDistance = RANDOM_MINIMUM_DISTANCE_FACTOR * state.rMin;
  const margin = state.periodic ? 0 : 0.12 * minimumDistance;
  const attempts = 40000;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const atomIndex = Math.floor(rng() * atoms.length);
    const atom = atoms[atomIndex];
    const useGlobalMove = rng() < 0.18;
    const candidate = {
      x: useGlobalMove
        ? margin + rng() * (BOX.x - 2 * margin)
        : atom.x + (rng() - 0.5) * 1.5 * LATTICE_SPACING,
      y: useGlobalMove
        ? margin + rng() * (BOX.y - 2 * margin)
        : atom.y + (rng() - 0.5) * 1.5 * LATTICE_SPACING
    };

    if (state.periodic) {
      candidate.x = positiveModulo(candidate.x, BOX.x);
      candidate.y = positiveModulo(candidate.y, BOX.y);
    } else {
      candidate.x = clamp(candidate.x, margin, BOX.x - margin);
      candidate.y = clamp(candidate.y, margin, BOX.y - margin);
    }

    if (!candidateIsSeparated(candidate, atomIndex, atoms, minimumDistance)) continue;
    atom.x = candidate.x;
    atom.y = candidate.y;
  }

  return atoms;
}

function candidateIsSeparated(candidate, ignoredIndex, atoms, minimumDistance) {
  const minimumSquared = minimumDistance * minimumDistance;
  for (let index = 0; index < atoms.length; index += 1) {
    if (index === ignoredIndex) continue;
    let dx = candidate.x - atoms[index].x;
    let dy = candidate.y - atoms[index].y;
    if (state.periodic) {
      dx -= BOX.x * Math.round(dx / BOX.x);
      dy -= BOX.y * Math.round(dy / BOX.y);
    }
    if (dx * dx + dy * dy < minimumSquared) return false;
  }
  return true;
}

function minimumPairDistance(atoms) {
  if (atoms.length < 2) return Number.POSITIVE_INFINITY;
  let minimumSquared = Number.POSITIVE_INFINITY;
  for (let first = 0; first < atoms.length - 1; first += 1) {
    for (let second = first + 1; second < atoms.length; second += 1) {
      let dx = atoms[first].x - atoms[second].x;
      let dy = atoms[first].y - atoms[second].y;
      if (state.periodic) {
        dx -= BOX.x * Math.round(dx / BOX.x);
        dy -= BOX.y * Math.round(dy / BOX.y);
      }
      minimumSquared = Math.min(minimumSquared, dx * dx + dy * dy);
    }
  }
  return Math.sqrt(minimumSquared);
}

function zeroVelocities() {
  state.atoms.forEach((atom) => {
    atom.vx = 0;
    atom.vy = 0;
  });
}

function initializeRandomVelocities() {
  stopAnimation();
  const rng = mulberry32(state.seed += 131);
  let meanX = 0;
  let meanY = 0;

  state.atoms.forEach((atom) => {
    atom.vx = gaussianRandom(rng);
    atom.vy = gaussianRandom(rng);
    meanX += atom.vx;
    meanY += atom.vy;
  });

  meanX /= PARTICLE_COUNT;
  meanY /= PARTICLE_COUNT;
  state.atoms.forEach((atom) => {
    atom.vx -= meanX;
    atom.vy -= meanY;
  });

  state.step = 0;
  state.time = 0;
  state.velocitiesReady = true;
  state.unstable = false;
  state.forceError = "";
  rescaleVelocities(state.targetTemperature);
  if (!computeForces()) {
    markTrajectoryUnstable(state.forceError);
    return;
  }
  updateMeasurements();
  state.referenceEnergy = state.totalEnergy;
  state.history = [];
  state.exportHistory = [];
  recordHistory(true);

  elements.velocityMessage.textContent = `Gaussian velocities initialized at T* = ${state.temperature.toFixed(3)} with centre-of-mass motion removed.`;
  setRunState("Velocities initialized");
  setResultsNote("The NVE trajectory is ready. Total energy should remain nearly constant for a sufficiently small time step.");
  updateControls();
  renderDynamicViews();
}

function rescaleVelocities(targetTemperature) {
  removeCenterOfMassVelocity();
  let kinetic = calculateKineticEnergy();
  if (kinetic <= 1e-14) return;
  const currentTemperature = 2 * kinetic / THERMAL_DEGREES_OF_FREEDOM;
  const scale = Math.sqrt(targetTemperature / currentTemperature);
  state.atoms.forEach((atom) => {
    atom.vx *= scale;
    atom.vy *= scale;
  });
}

function removeCenterOfMassVelocity() {
  let meanX = 0;
  let meanY = 0;
  state.atoms.forEach((atom) => {
    meanX += atom.vx;
    meanY += atom.vy;
  });
  meanX /= PARTICLE_COUNT;
  meanY /= PARTICLE_COUNT;
  state.atoms.forEach((atom) => {
    atom.vx -= meanX;
    atom.vy -= meanY;
  });
}

function toggleRun() {
  if (!state.velocitiesReady || state.unstable) return;
  if (state.running) {
    stopAnimation();
    setRunState("Paused");
    setResultsNote("Run paused; the current energy and temperature histories are retained.");
    updateControls();
    return;
  }

  state.running = true;
  setRunState("Running NVE");
  setResultsNote("Velocity-Verlet is advancing the isolated system without continuous temperature rescaling.");
  updateControls();
  state.animationFrame = requestAnimationFrame(advanceAnimation);
}

function advanceAnimation() {
  if (!state.running) return;
  for (let index = 0; index < STEPS_PER_FRAME; index += 1) {
    velocityVerletStep();
    if (state.unstable) break;
  }

  renderDynamicViews();
  if (state.running) state.animationFrame = requestAnimationFrame(advanceAnimation);
}

function takeSingleStep() {
  if (!state.velocitiesReady || state.running || state.unstable) return;
  velocityVerletStep();
  if (!state.unstable) setRunState(`Advanced to step ${state.step.toLocaleString()}`);
  renderDynamicViews();
}

function velocityVerletStep() {
  const acceptedState = captureDynamicsState();
  const halfDt = 0.5 * state.dt;

  state.atoms.forEach((atom) => {
    atom.vx += halfDt * atom.fx;
    atom.vy += halfDt * atom.fy;
    atom.x += state.dt * atom.vx;
    atom.y += state.dt * atom.vy;
    applyBoundary(atom);
  });

  if (!computeForces()) {
    const reason = state.forceError;
    restoreDynamicsState(acceptedState);
    markTrajectoryUnstable(reason);
    return;
  }

  state.atoms.forEach((atom) => {
    atom.vx += halfDt * atom.fx;
    atom.vy += halfDt * atom.fy;
  });

  state.step += 1;
  state.time += state.dt;
  updateMeasurements();

  if (!trajectoryIsFinite()) {
    restoreDynamicsState(acceptedState);
    markTrajectoryUnstable("A numerical value exceeded the safe classroom range.");
    return;
  }

  recordHistory();
}

function captureDynamicsState() {
  const atomValues = new Float64Array(PARTICLE_COUNT * 6);
  state.atoms.forEach((atom, index) => {
    const offset = index * 6;
    atomValues[offset] = atom.x;
    atomValues[offset + 1] = atom.y;
    atomValues[offset + 2] = atom.vx;
    atomValues[offset + 3] = atom.vy;
    atomValues[offset + 4] = atom.fx;
    atomValues[offset + 5] = atom.fy;
  });
  return {
    atomValues,
    step: state.step,
    time: state.time,
    potentialEnergy: state.potentialEnergy,
    kineticEnergy: state.kineticEnergy,
    thermalKineticEnergy: state.thermalKineticEnergy,
    temperature: state.temperature,
    totalEnergy: state.totalEnergy
  };
}

function restoreDynamicsState(snapshot) {
  state.atoms.forEach((atom, index) => {
    const offset = index * 6;
    atom.x = snapshot.atomValues[offset];
    atom.y = snapshot.atomValues[offset + 1];
    atom.vx = snapshot.atomValues[offset + 2];
    atom.vy = snapshot.atomValues[offset + 3];
    atom.fx = snapshot.atomValues[offset + 4];
    atom.fy = snapshot.atomValues[offset + 5];
  });
  state.step = snapshot.step;
  state.time = snapshot.time;
  state.potentialEnergy = snapshot.potentialEnergy;
  state.kineticEnergy = snapshot.kineticEnergy;
  state.thermalKineticEnergy = snapshot.thermalKineticEnergy;
  state.temperature = snapshot.temperature;
  state.totalEnergy = snapshot.totalEnergy;
}

function computeForces() {
  state.atoms.forEach((atom) => {
    atom.fx = 0;
    atom.fy = 0;
  });

  const interaction = interactionParameters();
  const { sigma, bareEpsilon, cutoff, cutoffPotential, cutoffForce } = interaction;
  const cutoffSquared = cutoff * cutoff;
  const overlapStop = OVERLAP_STOP_RATIO * sigma;
  const overlapStopSquared = overlapStop * overlapStop;
  let potential = 0;
  state.forceError = "";

  for (let first = 0; first < PARTICLE_COUNT - 1; first += 1) {
    const atomA = state.atoms[first];
    for (let second = first + 1; second < PARTICLE_COUNT; second += 1) {
      const atomB = state.atoms[second];
      let dx = atomA.x - atomB.x;
      let dy = atomA.y - atomB.y;

      if (state.periodic) {
        dx -= BOX.x * Math.round(dx / BOX.x);
        dy -= BOX.y * Math.round(dy / BOX.y);
      }

      const actualSquared = dx * dx + dy * dy;
      if (actualSquared >= cutoffSquared) continue;
      if (actualSquared < overlapStopSquared) {
        state.forceError = `Two atoms approached closer than ${OVERLAP_STOP_RATIO.toFixed(2)}σ.`;
        return false;
      }

      const actualRadius = Math.sqrt(actualSquared);
      const inverseRadius = 1 / actualRadius;
      const ratio = sigma * inverseRadius;
      const ratio6 = Math.pow(ratio, 6);
      const radialForce = 24 * bareEpsilon * inverseRadius * ratio6 * (2 * ratio6 - 1) - cutoffForce;
      const vectorScale = radialForce / actualRadius;
      const fx = vectorScale * dx;
      const fy = vectorScale * dy;

      atomA.fx += fx;
      atomA.fy += fy;
      atomB.fx -= fx;
      atomB.fy -= fy;
      potential += 4 * bareEpsilon * ratio6 * (ratio6 - 1)
        - cutoffPotential
        + (actualRadius - cutoff) * cutoffForce;
    }
  }

  state.potentialEnergy = potential;
  return true;
}

function reducedLJPotential(distanceInSigma) {
  const inverse6 = Math.pow(1 / distanceInSigma, 6);
  return 4 * inverse6 * (inverse6 - 1);
}

function reducedLJForce(distanceInSigma) {
  const inverse6 = Math.pow(1 / distanceInSigma, 6);
  return 24 / distanceInSigma * inverse6 * (2 * inverse6 - 1);
}

function shiftedPotentialShape(distanceInSigma) {
  if (distanceInSigma >= CUTOFF_RATIO) return 0;
  const cutoffForce = reducedLJForce(CUTOFF_RATIO);
  return reducedLJPotential(distanceInSigma)
    - reducedLJPotential(CUTOFF_RATIO)
    + (distanceInSigma - CUTOFF_RATIO) * cutoffForce;
}

function findForceShiftedMinimumRatio() {
  const cutoffForce = reducedLJForce(CUTOFF_RATIO);
  let lower = POW_TWO_ONE_SIXTH;
  let upper = 1.3;
  for (let iteration = 0; iteration < 80; iteration += 1) {
    const middle = 0.5 * (lower + upper);
    if (reducedLJForce(middle) > cutoffForce) lower = middle;
    else upper = middle;
  }
  return 0.5 * (lower + upper);
}

function interactionParameters() {
  const sigma = state.rMin / FORCE_SHIFT_MINIMUM_RATIO;
  const bareEpsilon = state.epsilon / FORCE_SHIFT_WELL_FACTOR;
  const cutoff = CUTOFF_RATIO * sigma;
  const cutoffRatio6 = Math.pow(sigma / cutoff, 6);
  return {
    sigma,
    bareEpsilon,
    cutoff,
    cutoffPotential: 4 * bareEpsilon * cutoffRatio6 * (cutoffRatio6 - 1),
    cutoffForce: 24 * bareEpsilon / cutoff * cutoffRatio6 * (2 * cutoffRatio6 - 1)
  };
}

function markTrajectoryUnstable(reason) {
  state.unstable = true;
  stopAnimation();
  setRunState("Trajectory stopped");
  setResultsNote(`${reason} Reduce Δt* or T*, then rebuild the positions and initialize velocities again.`);
  elements.velocityMessage.textContent = "The safety check stopped the trajectory before the LJ core was modified.";
  updateControls();
}

function applyBoundary(atom) {
  if (state.periodic) {
    atom.x = positiveModulo(atom.x, BOX.x);
    atom.y = positiveModulo(atom.y, BOX.y);
    return;
  }

  reflectCoordinate(atom, "x", "vx", BOX.x);
  reflectCoordinate(atom, "y", "vy", BOX.y);
}

function reflectCoordinate(atom, positionKey, velocityKey, limit) {
  while (atom[positionKey] < 0 || atom[positionKey] > limit) {
    if (atom[positionKey] < 0) {
      atom[positionKey] = -atom[positionKey];
      atom[velocityKey] *= -1;
    }
    if (atom[positionKey] > limit) {
      atom[positionKey] = 2 * limit - atom[positionKey];
      atom[velocityKey] *= -1;
    }
  }
}

function applyAllBoundaries() {
  state.atoms.forEach(applyBoundary);
}

function updateMeasurements() {
  state.kineticEnergy = calculateKineticEnergy();
  state.thermalKineticEnergy = calculateThermalKineticEnergy();
  state.temperature = state.velocitiesReady
    ? 2 * state.thermalKineticEnergy / THERMAL_DEGREES_OF_FREEDOM
    : 0;
  state.totalEnergy = state.kineticEnergy + state.potentialEnergy;
}

function calculateKineticEnergy() {
  return state.atoms.reduce((sum, atom) => sum + 0.5 * (atom.vx * atom.vx + atom.vy * atom.vy), 0);
}

function calculateThermalKineticEnergy() {
  if (state.atoms.length === 0) return 0;
  const centerVelocity = state.atoms.reduce(
    (sum, atom) => ({ x: sum.x + atom.vx, y: sum.y + atom.vy }),
    { x: 0, y: 0 }
  );
  centerVelocity.x /= state.atoms.length;
  centerVelocity.y /= state.atoms.length;
  return state.atoms.reduce((sum, atom) => {
    const vx = atom.vx - centerVelocity.x;
    const vy = atom.vy - centerVelocity.y;
    return sum + 0.5 * (vx * vx + vy * vy);
  }, 0);
}

function trajectoryIsFinite() {
  if (![state.potentialEnergy, state.kineticEnergy, state.thermalKineticEnergy, state.totalEnergy, state.temperature].every(Number.isFinite)) return false;
  if (Math.abs(state.totalEnergy) > 1e7 || state.temperature > 1e5) return false;
  return state.atoms.every((atom) => [atom.x, atom.y, atom.vx, atom.vy, atom.fx, atom.fy].every(Number.isFinite));
}

function beginNewMeasurementSegment(message) {
  state.step = 0;
  state.time = 0;
  state.history = [];
  state.exportHistory = [];
  state.referenceEnergy = state.totalEnergy;
  recordHistory(true);
  setResultsNote(message);
}

function recordHistory(force = false) {
  if (!state.velocitiesReady || (!force && state.step % HISTORY_INTERVAL !== 0)) return;
  const sample = {
    step: state.step,
    time: state.time,
    kinetic: state.kineticEnergy / PARTICLE_COUNT,
    kineticPeculiar: state.thermalKineticEnergy / PARTICLE_COUNT,
    potential: state.potentialEnergy / PARTICLE_COUNT,
    total: state.totalEnergy / PARTICLE_COUNT,
    temperature: state.temperature,
    target: state.targetTemperature
  };
  state.history.push(sample);
  state.exportHistory.push(sample);
  if (state.history.length > HISTORY_LIMIT) state.history.shift();
  elements.downloadResults.disabled = state.exportHistory.length < 2;
}

function resetSimulation() {
  buildConfiguration(state.configuration);
}

function stopAnimation() {
  state.running = false;
  if (state.animationFrame) cancelAnimationFrame(state.animationFrame);
  state.animationFrame = null;
}

function updateParameterLabels() {
  const interaction = interactionParameters();
  const scaledTimestep = state.dt * Math.sqrt(interaction.bareEpsilon) / interaction.sigma;
  const ljDensity = REFERENCE_NUMBER_DENSITY * interaction.sigma * interaction.sigma;
  elements.rMinValue.textContent = state.rMin.toFixed(2);
  elements.epsilonValue.textContent = state.epsilon.toFixed(2);
  elements.timestepValue.textContent = state.dt.toFixed(4);
  elements.temperatureTarget.textContent = state.targetTemperature.toFixed(2);
  elements.densityValue.textContent = `Nσ²/A = ${ljDensity.toFixed(3)}`;
  elements.timestepGuidance.textContent = scaledTimestep > 0.005
    ? `Scaled LJ step = ${scaledTimestep.toFixed(4)}: expect stronger drift; reduce it if the safety check stops the run.`
    : `Scaled LJ step = ${scaledTimestep.toFixed(4)}; always judge accuracy from total-energy drift.`;
  elements.timestepGuidance.classList.toggle("is-caution", scaledTimestep > 0.005);
  elements.potentialNote.innerHTML = `Minimum: r<sub>min</sub>* = ${state.rMin.toFixed(2)}, U<sub>min</sub>* = &minus;${state.epsilon.toFixed(2)}. Cutoff: r<sub>c</sub>* = ${interaction.cutoff.toFixed(2)}; U and force are zero there.`;
  elements.ljChart.setAttribute(
    "aria-label",
    `Force-shifted Lennard-Jones pair potential with a minimum at ${state.rMin.toFixed(2)}, depth minus ${state.epsilon.toFixed(2)}, and cutoff at ${interaction.cutoff.toFixed(2)} in classroom reference units.`
  );
}

function updateConfigurationButtons() {
  const latticeSelected = state.configuration === "lattice";
  elements.latticeConfig.classList.toggle("is-selected", latticeSelected);
  elements.randomConfig.classList.toggle("is-selected", !latticeSelected);
  elements.latticeConfig.setAttribute("aria-pressed", String(latticeSelected));
  elements.randomConfig.setAttribute("aria-pressed", String(!latticeSelected));
}

function updateBoundaryCopy() {
  elements.boundaryNote.textContent = state.periodic
    ? "Periodic copies cross one edge and re-enter through the opposite edge."
    : "Atoms reflect elastically from the four visible walls.";
}

function updateControls() {
  elements.runSimulation.disabled = !state.velocitiesReady || state.unstable;
  elements.runSimulation.textContent = state.running ? "Pause" : "Run";
  elements.singleStep.disabled = !state.velocitiesReady || state.running || state.unstable;
  elements.downloadResults.disabled = state.exportHistory.length < 2;
}

function updateReadings() {
  elements.stepValue.textContent = state.step.toLocaleString();
  elements.timeValue.textContent = state.time.toFixed(3);
  elements.temperatureValue.textContent = state.temperature.toFixed(3);
  elements.energyValue.textContent = state.velocitiesReady ? (state.totalEnergy / PARTICLE_COUNT).toFixed(4) : "—";

  if (!state.velocitiesReady || state.referenceEnergy === null || Math.abs(state.referenceEnergy) < 1e-12) {
    elements.driftValue.textContent = "—";
  } else {
    const drift = 100 * (state.totalEnergy - state.referenceEnergy) / Math.abs(state.referenceEnergy);
    elements.driftValue.textContent = `${drift >= 0 ? "+" : ""}${drift.toFixed(3)}%`;
  }
}

function setRunState(message) {
  if (elements.runState.textContent !== message) elements.runState.textContent = message;
}

function setResultsNote(message) {
  if (elements.resultsNote.textContent !== message) elements.resultsNote.textContent = message;
}

function renderDynamicViews() {
  updateReadings();
  updateControls();
  drawAtomCanvas();
  drawResultsCharts();
  updateCanvasDescriptions();
}

function resizeAndDrawAll() {
  drawPotentialChart();
  drawAtomCanvas();
  drawResultsCharts();
}

function drawPotentialChart() {
  const surface = prepareCanvas(elements.ljChart);
  if (!surface) return;
  const { context, width, height } = surface;
  const margins = chartMargins(width);
  const plot = makePlot(width, height, margins);
  const xMin = 0.72;
  const xMax = 3.15;
  const yMin = -1.3 * state.epsilon;
  const yMax = 3.2 * state.epsilon;

  fillChartBackground(context, width, height);
  drawCartesianGrid(context, plot, xMin, xMax, yMin, yMax, {
    xTicks: width < 430 ? 4 : 6,
    yTicks: 5,
    xLabel: "Separation, r / ℓ₀",
    yLabel: "Potential, U / E₀"
  });

  const interaction = interactionParameters();
  const { sigma, bareEpsilon, cutoff, cutoffPotential, cutoffForce } = interaction;
  const pointCount = Math.max(180, Math.floor(plot.width));
  context.save();
  clipPlot(context, plot);
  context.strokeStyle = COLORS.blue;
  context.lineWidth = 2.4;
  context.lineJoin = "round";
  context.beginPath();
  let started = false;

  for (let index = 0; index <= pointCount; index += 1) {
    const r = xMin + (xMax - xMin) * index / pointCount;
    const ratio6 = Math.pow(sigma / r, 6);
    const value = r < cutoff
      ? 4 * bareEpsilon * ratio6 * (ratio6 - 1)
        - cutoffPotential
        + (r - cutoff) * cutoffForce
      : 0;
    if (value > yMax * 1.08) {
      started = false;
      continue;
    }
    const x = mapLinear(r, xMin, xMax, plot.left, plot.right);
    const y = mapLinear(clamp(value, yMin, yMax), yMin, yMax, plot.bottom, plot.top);
    if (!started) {
      context.moveTo(x, y);
      started = true;
    } else {
      context.lineTo(x, y);
    }
  }
  context.stroke();

  const zeroY = mapLinear(0, yMin, yMax, plot.bottom, plot.top);
  context.strokeStyle = "rgba(46, 42, 116, 0.35)";
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(plot.left, zeroY);
  context.lineTo(plot.right, zeroY);
  context.stroke();

  if (cutoff <= xMax) {
    const cutoffX = mapLinear(cutoff, xMin, xMax, plot.left, plot.right);
    context.strokeStyle = COLORS.lavender;
    context.setLineDash([5, 4]);
    context.beginPath();
    context.moveTo(cutoffX, plot.top);
    context.lineTo(cutoffX, plot.bottom);
    context.stroke();
    context.setLineDash([]);
  }
  context.restore();

  const minimumX = mapLinear(state.rMin, xMin, xMax, plot.left, plot.right);
  const minimumY = mapLinear(-state.epsilon, yMin, yMax, plot.bottom, plot.top);
  context.fillStyle = COLORS.coral;
  context.beginPath();
  context.arc(minimumX, minimumY, 5, 0, Math.PI * 2);
  context.fill();
  context.font = "700 12px system-ui, sans-serif";
  context.fillStyle = COLORS.ink;
  context.textAlign = minimumX > plot.right - 100 ? "right" : "left";
  context.fillText(`(${state.rMin.toFixed(2)}, −${state.epsilon.toFixed(2)})`, minimumX + (minimumX > plot.right - 100 ? -8 : 8), minimumY - 10);
}

function drawAtomCanvas() {
  const surface = prepareCanvas(elements.atomCanvas);
  if (!surface) return;
  const { context, width, height } = surface;
  context.clearRect(0, 0, width, height);
  context.fillStyle = "#11153d";
  context.fillRect(0, 0, width, height);

  const padding = width < 430 ? 22 : 30;
  const scale = Math.min((width - 2 * padding) / BOX.x, (height - 2 * padding) / BOX.y);
  const boxWidth = BOX.x * scale;
  const boxHeight = BOX.y * scale;
  const left = (width - boxWidth) / 2;
  const top = (height - boxHeight) / 2;
  const visualRadiusUnits = 0.14;
  const visualRadius = Math.max(3.2, visualRadiusUnits * scale);

  context.strokeStyle = "rgba(255, 255, 255, 0.08)";
  context.lineWidth = 1;
  for (let column = 1; column < 5; column += 1) {
    const x = left + boxWidth * column / 5;
    context.beginPath();
    context.moveTo(x, top);
    context.lineTo(x, top + boxHeight);
    context.stroke();
  }
  for (let row = 1; row < 5; row += 1) {
    const y = top + boxHeight * row / 5;
    context.beginPath();
    context.moveTo(left, y);
    context.lineTo(left + boxWidth, y);
    context.stroke();
  }

  context.strokeStyle = state.periodic ? "#9ee9df" : COLORS.wall;
  context.lineWidth = state.periodic ? 1.5 : 4;
  context.setLineDash(state.periodic ? [7, 6] : []);
  context.strokeRect(left, top, boxWidth, boxHeight);
  context.setLineDash([]);

  const speedReference = Math.sqrt(Math.max(0.1, 2 * Math.max(state.targetTemperature, state.temperature)));
  state.atoms.forEach((atom) => {
    const speed = Math.hypot(atom.vx, atom.vy);
    const fraction = clamp(speed / (2.4 * speedReference), 0, 1);
    const color = speedColor(fraction);
    const shiftsX = state.periodic ? [-BOX.x, 0, BOX.x] : [0];
    const shiftsY = state.periodic ? [-BOX.y, 0, BOX.y] : [0];

    shiftsX.forEach((shiftX) => {
      shiftsY.forEach((shiftY) => {
        const x = left + (atom.x + shiftX) * scale;
        const y = top + (atom.y + shiftY) * scale;
        if (x < left - visualRadius || x > left + boxWidth + visualRadius) return;
        if (y < top - visualRadius || y > top + boxHeight + visualRadius) return;
        drawAtom(context, x, y, visualRadius, color);
      });
    });
  });

  context.fillStyle = "rgba(255, 255, 255, 0.8)";
  context.font = "700 12px system-ui, sans-serif";
  context.textAlign = "left";
  context.fillText(state.periodic ? "PBC" : "Reflecting walls", left + 8, top + 17);
  context.textAlign = "right";
  context.fillText(`${PARTICLE_COUNT} atoms`, left + boxWidth - 8, top + 17);
}

function drawAtom(context, x, y, radius, color) {
  const gradient = context.createRadialGradient(x - 0.35 * radius, y - 0.4 * radius, 0.15 * radius, x, y, radius);
  gradient.addColorStop(0, "rgba(255, 255, 255, 0.95)");
  gradient.addColorStop(0.24, color);
  gradient.addColorStop(1, darkenColor(color));
  context.fillStyle = gradient;
  context.beginPath();
  context.arc(x, y, radius, 0, Math.PI * 2);
  context.fill();
  context.strokeStyle = "rgba(255, 255, 255, 0.42)";
  context.lineWidth = 0.8;
  context.stroke();
}

function drawResultsCharts() {
  drawEnergyChart();
  drawTemperatureChart();
}

function drawEnergyChart() {
  const surface = prepareCanvas(elements.energyChart);
  if (!surface) return;
  const { context, width, height } = surface;
  const margins = chartMargins(width);
  const plot = makePlot(width, height, margins);
  fillChartBackground(context, width, height);

  const values = state.history.flatMap((point) => [point.kinetic, point.potential, point.total]);
  let yMin = values.length ? Math.min(...values) : -1;
  let yMax = values.length ? Math.max(...values) : 1;
  const padding = Math.max(0.2, 0.12 * Math.max(1e-6, yMax - yMin));
  yMin -= padding;
  yMax += padding;
  const xMin = state.history.length ? state.history[0].time : 0;
  const xMax = state.history.length ? Math.max(xMin + 0.25, state.history.at(-1).time) : 1;

  drawCartesianGrid(context, plot, xMin, xMax, yMin, yMax, {
    xTicks: width < 430 ? 4 : 6,
    yTicks: 5,
    xLabel: "Time, t*",
    yLabel: "Energy / atom"
  });

  if (state.history.length === 0) return;
  drawHistorySeries(context, plot, state.history, "kinetic", COLORS.orange, xMin, xMax, yMin, yMax, 1.7);
  drawHistorySeries(context, plot, state.history, "potential", COLORS.blue, xMin, xMax, yMin, yMax, 1.7);
  drawHistorySeries(context, plot, state.history, "total", COLORS.ink, xMin, xMax, yMin, yMax, 2.3);
}

function drawTemperatureChart() {
  const surface = prepareCanvas(elements.temperatureChart);
  if (!surface) return;
  const { context, width, height } = surface;
  const margins = chartMargins(width);
  const plot = makePlot(width, height, margins);
  fillChartBackground(context, width, height);

  const observedMaximum = state.history.length ? Math.max(...state.history.map((point) => Math.max(point.temperature, point.target))) : state.targetTemperature;
  const yMin = 0;
  const yMax = Math.max(0.5, observedMaximum * 1.32);
  const xMin = state.history.length ? state.history[0].time : 0;
  const xMax = state.history.length ? Math.max(xMin + 0.25, state.history.at(-1).time) : 1;

  drawCartesianGrid(context, plot, xMin, xMax, yMin, yMax, {
    xTicks: width < 430 ? 4 : 6,
    yTicks: 5,
    xLabel: "Time, t*",
    yLabel: "Temperature, T*"
  });

  if (state.history.length === 0) return;
  drawHistorySeries(context, plot, state.history, "target", COLORS.lavender, xMin, xMax, yMin, yMax, 1.4, [6, 5]);
  drawHistorySeries(context, plot, state.history, "temperature", COLORS.coral, xMin, xMax, yMin, yMax, 2.2);
}

function drawHistorySeries(context, plot, data, key, color, xMin, xMax, yMin, yMax, width, dash = []) {
  context.save();
  clipPlot(context, plot);
  context.strokeStyle = color;
  context.lineWidth = width;
  context.lineJoin = "round";
  context.setLineDash(dash);
  context.beginPath();
  data.forEach((point, index) => {
    const x = mapLinear(point.time, xMin, xMax, plot.left, plot.right);
    const y = mapLinear(point[key], yMin, yMax, plot.bottom, plot.top);
    if (index === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  });
  if (data.length === 1) {
    const point = data[0];
    const x = mapLinear(point.time, xMin, xMax, plot.left, plot.right);
    const y = mapLinear(point[key], yMin, yMax, plot.bottom, plot.top);
    context.moveTo(x - 1, y);
    context.lineTo(x + 1, y);
  }
  context.stroke();
  context.restore();
}

function drawCartesianGrid(context, plot, xMin, xMax, yMin, yMax, options) {
  context.font = "12px system-ui, sans-serif";
  context.textBaseline = "middle";
  context.lineWidth = 1;
  context.strokeStyle = COLORS.grid;
  context.fillStyle = COLORS.inkSoft;

  for (let index = 0; index <= options.xTicks; index += 1) {
    const value = xMin + (xMax - xMin) * index / options.xTicks;
    const x = mapLinear(value, xMin, xMax, plot.left, plot.right);
    context.beginPath();
    context.moveTo(x, plot.top);
    context.lineTo(x, plot.bottom);
    context.stroke();
    context.textAlign = index === 0 ? "left" : index === options.xTicks ? "right" : "center";
    context.fillText(formatAxisValue(value, xMax - xMin), x, plot.bottom + 17);
  }

  for (let index = 0; index <= options.yTicks; index += 1) {
    const value = yMin + (yMax - yMin) * index / options.yTicks;
    const y = mapLinear(value, yMin, yMax, plot.bottom, plot.top);
    context.beginPath();
    context.moveTo(plot.left, y);
    context.lineTo(plot.right, y);
    context.stroke();
    context.textAlign = "right";
    context.fillText(formatAxisValue(value, yMax - yMin), plot.left - 8, y);
  }

  context.strokeStyle = COLORS.ink;
  context.lineWidth = 1.4;
  context.beginPath();
  context.moveTo(plot.left, plot.top);
  context.lineTo(plot.left, plot.bottom);
  context.lineTo(plot.right, plot.bottom);
  context.stroke();

  context.fillStyle = COLORS.ink;
  context.font = "700 12px system-ui, sans-serif";
  context.textAlign = "center";
  context.fillText(options.xLabel, plot.left + plot.width / 2, plot.height + plot.top + 39);
  context.save();
  context.translate(14, plot.top + plot.height / 2);
  context.rotate(-Math.PI / 2);
  context.fillText(options.yLabel, 0, 0);
  context.restore();
}

function updateCanvasDescriptions() {
  const configurationName = state.configuration === "lattice" ? "triangular lattice" : "random configuration";
  const motion = state.velocitiesReady
    ? `The instantaneous T star is ${state.temperature.toFixed(3)} at step ${state.step}.`
    : "All velocities are zero.";
  elements.atomCanvas.setAttribute(
    "aria-label",
    `One hundred atoms in a two-dimensional ${configurationName} with ${state.periodic ? "periodic boundaries" : "reflecting walls"}. ${motion}`
  );

  if (state.history.length === 0) {
    elements.energyChart.setAttribute("aria-label", "Energy versus time graph awaiting velocity initialization.");
    elements.temperatureChart.setAttribute("aria-label", "Temperature versus time graph awaiting velocity initialization.");
    return;
  }

  const latest = state.history.at(-1);
  elements.energyChart.setAttribute(
    "aria-label",
    `Energy versus time through t star ${latest.time.toFixed(3)}. Latest kinetic, potential, and total energy per atom are ${latest.kinetic.toFixed(3)}, ${latest.potential.toFixed(3)}, and ${latest.total.toFixed(3)}.`
  );
  elements.temperatureChart.setAttribute(
    "aria-label",
    `Temperature versus time through t star ${latest.time.toFixed(3)}. Latest instantaneous temperature is ${latest.temperature.toFixed(3)}.`
  );
}

function downloadResultsCsv() {
  if (state.exportHistory.length < 2) return;
  const interaction = interactionParameters();
  const rows = [
    ["model", "2D Lennard-Jones molecular dynamics"],
    ["units", "fixed classroom reference units: l0=E0=m=kB=1"],
    ["atoms", PARTICLE_COUNT],
    ["configuration", state.configuration],
    ["boundary", state.periodic ? "periodic" : "reflecting"],
    ["force_shifted_r_min", state.rMin.toFixed(4)],
    ["force_shifted_well_depth", state.epsilon.toFixed(4)],
    ["sigma", interaction.sigma.toFixed(6)],
    ["bare_lj_epsilon", interaction.bareEpsilon.toFixed(6)],
    ["cutoff", interaction.cutoff.toFixed(6)],
    ["box_number_density_N_l0_squared_over_A", REFERENCE_NUMBER_DENSITY.toFixed(4)],
    ["lj_scaled_density_N_sigma_squared_over_A", (REFERENCE_NUMBER_DENSITY * interaction.sigma ** 2).toFixed(6)],
    ["time_step_reference", state.dt.toFixed(5)],
    ["temperature_definition", `2 K_peculiar / ${THERMAL_DEGREES_OF_FREEDOM}`],
    ["samples", state.exportHistory.length],
    [],
    ["step", "time_star_reference", "kinetic_total_per_atom", "kinetic_peculiar_per_atom", "potential_per_atom", "total_per_atom", "temperature_star_reference", "temperature_initialization_target"],
    ...state.exportHistory.map((point) => [
      point.step,
      point.time.toFixed(6),
      point.kinetic.toFixed(8),
      point.kineticPeculiar.toFixed(8),
      point.potential.toFixed(8),
      point.total.toFixed(8),
      point.temperature.toFixed(8),
      point.target.toFixed(4)
    ])
  ];
  const csv = rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `md-${state.configuration}-${state.step}-steps.csv`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function prepareCanvas(canvas) {
  const frame = canvas.parentElement;
  const width = frame.clientWidth;
  const height = frame.clientHeight;
  if (width < 2 || height < 2) return null;
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  const pixelWidth = Math.round(width * ratio);
  const pixelHeight = Math.round(height * ratio);
  if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
    canvas.width = pixelWidth;
    canvas.height = pixelHeight;
  }
  const context = canvas.getContext("2d");
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  return { context, width, height };
}

function fillChartBackground(context, width, height) {
  context.clearRect(0, 0, width, height);
  context.fillStyle = COLORS.paper;
  context.fillRect(0, 0, width, height);
}

function chartMargins(width) {
  return width < 430
    ? { left: 58, right: 12, top: 18, bottom: 52 }
    : { left: 66, right: 18, top: 22, bottom: 54 };
}

function makePlot(width, height, margins) {
  const left = margins.left;
  const right = Math.max(left + 20, width - margins.right);
  const top = margins.top;
  const bottom = Math.max(top + 20, height - margins.bottom);
  return { left, right, top, bottom, width: right - left, height: bottom - top };
}

function clipPlot(context, plot) {
  context.beginPath();
  context.rect(plot.left, plot.top, plot.width, plot.height);
  context.clip();
}

function formatAxisValue(value, range) {
  if (Math.abs(value) >= 100) return value.toFixed(0);
  if (range < 1) return value.toFixed(2);
  if (range < 10) return value.toFixed(1);
  return value.toFixed(0);
}

function speedColor(fraction) {
  const hue = 198 - 188 * fraction;
  const saturation = 66 + 12 * fraction;
  const lightness = 62 - 6 * fraction;
  return `hsl(${hue.toFixed(0)} ${saturation.toFixed(0)}% ${lightness.toFixed(0)}%)`;
}

function darkenColor(color) {
  const match = color.match(/hsl\(([-\d.]+) ([-\d.]+)% ([-\d.]+)%\)/);
  if (!match) return color;
  return `hsl(${match[1]} ${match[2]}% ${Math.max(20, Number(match[3]) - 22)}%)`;
}

function gaussianRandom(rng) {
  let first = 0;
  let second = 0;
  while (first <= Number.EPSILON) first = rng();
  while (second <= Number.EPSILON) second = rng();
  return Math.sqrt(-2 * Math.log(first)) * Math.cos(2 * Math.PI * second);
}

function mulberry32(seed) {
  return function random() {
    let value = seed += 0x6D2B79F5;
    value = Math.imul(value ^ value >>> 15, value | 1);
    value ^= value + Math.imul(value ^ value >>> 7, value | 61);
    return ((value ^ value >>> 14) >>> 0) / 4294967296;
  };
}

function positiveModulo(value, modulus) {
  return ((value % modulus) + modulus) % modulus;
}

function mapLinear(value, domainMin, domainMax, rangeMin, rangeMax) {
  const fraction = (value - domainMin) / Math.max(1e-12, domainMax - domainMin);
  return rangeMin + fraction * (rangeMax - rangeMin);
}

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

function csvCell(value) {
  const text = String(value ?? "");
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}
