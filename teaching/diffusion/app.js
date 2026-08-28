(() => {
  "use strict";

  const elements = {
    steps: document.querySelector("#walk-steps"),
    stepsValue: document.querySelector("#walk-steps-value"),
    population: document.querySelector("#walk-population"),
    speed: document.querySelector("#walk-speed"),
    play: document.querySelector("#walk-play"),
    step: document.querySelector("#walk-step"),
    reset: document.querySelector("#walk-reset"),
    resample: document.querySelector("#walk-resample"),
    pathCanvas: document.querySelector("#walk-path-canvas"),
    cloudCanvas: document.querySelector("#walk-cloud-canvas"),
    stepChip: document.querySelector("#walk-step-chip"),
    positionChip: document.querySelector("#walk-position-chip"),
    currentStep: document.querySelector("#walk-current-step"),
    meanPosition: document.querySelector("#walk-mean-position"),
    meanRadius: document.querySelector("#walk-mean-radius"),
    rmsRadius: document.querySelector("#walk-rms-radius"),
    theoryRadius: document.querySelector("#walk-theory-radius"),
    status: document.querySelector("#walk-status")
  };

  if (!elements.pathCanvas || !elements.cloudCanvas) return;

  const SINGLE_GRID_SIZE = 20;
  const SINGLE_GRID_MIN = -10;
  const SINGLE_GRID_MAX = 9;
  const state = {
    seed: 1837,
    currentStep: 0,
    targetSteps: Number(elements.steps.value),
    population: Number(elements.population.value),
    viewMinX: SINGLE_GRID_MIN,
    viewMaxX: SINGLE_GRID_MAX,
    viewMinY: SINGLE_GRID_MIN,
    viewMaxY: SINGLE_GRID_MAX,
    pathX: new Int32Array(0),
    pathY: new Int32Array(0),
    cloudX: new Int32Array(0),
    cloudY: new Int32Array(0),
    trails: [],
    random: null,
    running: false,
    frame: 0,
    runToken: 0
  };

  function createRandom(seed) {
    let value = seed >>> 0;
    return () => {
      value += 0x6d2b79f5;
      let result = value;
      result = Math.imul(result ^ (result >>> 15), result | 1);
      result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
      return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
    };
  }

  function initialiseWalk(announcement = "Ready. The atom and every ensemble walker are at (0, 0).") {
    pauseWalk(false);
    state.targetSteps = Number(elements.steps.value);
    state.population = Number(elements.population.value);
    state.currentStep = 0;
    state.viewMinX = SINGLE_GRID_MIN;
    state.viewMaxX = SINGLE_GRID_MAX;
    state.viewMinY = SINGLE_GRID_MIN;
    state.viewMaxY = SINGLE_GRID_MAX;
    state.pathX = new Int32Array(1);
    state.pathY = new Int32Array(1);
    state.cloudX = new Int32Array(state.population);
    state.cloudY = new Int32Array(state.population);
    state.trails = [[[0, 0]]];
    state.random = createRandom(state.seed);
    elements.stepsValue.value = state.targetSteps.toLocaleString();
    elements.status.textContent = announcement;
    updateWalkReadout();
    renderWalk();
    updateCanvasLabels();
  }

  function takeOneStep() {
    if (state.currentStep >= state.targetSteps) return false;
    for (let index = 0; index < state.pathX.length; index += 1) {
      moveWalker(state.pathX, state.pathY, index);
      panSingleViewport();
      state.trails[index].push([state.pathX[index], state.pathY[index]]);
    }
    for (let index = 0; index < state.cloudX.length; index += 1) {
      moveWalker(state.cloudX, state.cloudY, index);
    }
    state.currentStep += 1;
    return true;
  }

  function moveWalker(xPositions, yPositions, index) {
    const direction = Math.floor(state.random() * 4);
    if (direction === 0) xPositions[index] += 1;
    else if (direction === 1) xPositions[index] -= 1;
    else if (direction === 2) yPositions[index] += 1;
    else yPositions[index] -= 1;
  }

  function panSingleViewport() {
    const panDistance = SINGLE_GRID_SIZE / 2;
    const atomX = state.pathX[0];
    const atomY = state.pathY[0];
    if (atomX <= state.viewMinX) {
      state.viewMinX -= panDistance;
      state.viewMaxX -= panDistance;
    } else if (atomX >= state.viewMaxX) {
      state.viewMinX += panDistance;
      state.viewMaxX += panDistance;
    }
    if (atomY <= state.viewMinY) {
      state.viewMinY -= panDistance;
      state.viewMaxY -= panDistance;
    } else if (atomY >= state.viewMaxY) {
      state.viewMinY += panDistance;
      state.viewMaxY += panDistance;
    }
  }

  function startWalk() {
    if (state.running) {
      pauseWalk(true);
      return;
    }
    if (state.currentStep >= state.targetSteps) initialiseWalk("Trial restarted from the origin.");
    state.running = true;
    state.runToken += 1;
    const token = state.runToken;
    elements.play.textContent = "Pause";
    elements.step.disabled = true;
    elements.speed.disabled = true;
    const startingStep = state.currentStep;
    const remainingSteps = state.targetSteps - startingStep;
    const fullRunDuration = Number(elements.speed.value);
    const remainingDuration = fullRunDuration * remainingSteps / state.targetSteps;
    elements.status.textContent = `The atom is taking random nearest-neighbour steps; this playback targets about ${(remainingDuration / 1000).toFixed(1)} seconds.`;

    let runStartTime = null;
    const animate = (timestamp) => {
      if (!state.running || token !== state.runToken) return;
      if (runStartTime === null) runStartTime = timestamp;
      const elapsed = timestamp - runStartTime;
      const progress = Math.min(1, elapsed / Math.max(1, remainingDuration));
      const desiredStep = progress >= 1
        ? state.targetSteps
        : startingStep + Math.floor(progress * remainingSteps);
      if (state.currentStep < desiredStep) {
        while (state.currentStep < desiredStep) takeOneStep();
        updateWalkReadout();
        renderWalk();
        updateCanvasLabels();
      }
      if (state.currentStep >= state.targetSteps) {
        finishWalk();
      } else {
        state.frame = window.requestAnimationFrame(animate);
      }
    };
    state.frame = window.requestAnimationFrame(animate);
  }

  function pauseWalk(announce) {
    state.running = false;
    state.runToken += 1;
    if (state.frame) window.cancelAnimationFrame(state.frame);
    state.frame = 0;
    elements.play.textContent = "Animate";
    elements.speed.disabled = false;
    elements.step.disabled = state.currentStep >= state.targetSteps;
    if (announce) {
      elements.status.textContent = `Paused after ${state.currentStep.toLocaleString()} steps.`;
      updateCanvasLabels();
    }
  }

  function finishWalk() {
    pauseWalk(false);
    elements.status.textContent = `Trial complete: the atom and ${state.population.toLocaleString()} ensemble walkers each took ${state.targetSteps.toLocaleString()} steps.`;
    updateCanvasLabels();
  }

  function singleStep() {
    pauseWalk(false);
    if (takeOneStep()) {
      updateWalkReadout();
      renderWalk();
      updateCanvasLabels();
      elements.status.textContent = `Advanced to step ${state.currentStep.toLocaleString()}; the atom is at (${state.pathX[0]}, ${state.pathY[0]}).`;
    }
    if (state.currentStep >= state.targetSteps) finishWalk();
  }

  function walkStatistics() {
    let sumX = 0;
    let sumY = 0;
    let sumRadius = 0;
    let sumRadiusSquared = 0;
    for (let index = 0; index < state.cloudX.length; index += 1) {
      const x = state.cloudX[index];
      const y = state.cloudY[index];
      const radiusSquared = x * x + y * y;
      sumX += x;
      sumY += y;
      sumRadius += Math.sqrt(radiusSquared);
      sumRadiusSquared += radiusSquared;
    }
    const count = Math.max(1, state.cloudX.length);
    return {
      meanX: sumX / count,
      meanY: sumY / count,
      meanRadius: sumRadius / count,
      rmsRadius: Math.sqrt(sumRadiusSquared / count),
      theoryRadius: Math.sqrt(state.currentStep)
    };
  }

  function updateWalkReadout() {
    const stats = walkStatistics();
    elements.stepChip.textContent = `${state.currentStep.toLocaleString()} / ${state.targetSteps.toLocaleString()} steps`;
    elements.positionChip.textContent = `Atom (${state.pathX[0]}, ${state.pathY[0]})`;
    elements.currentStep.textContent = state.currentStep.toLocaleString();
    elements.meanPosition.textContent = `(${stats.meanX.toFixed(2)}, ${stats.meanY.toFixed(2)})`;
    elements.meanRadius.textContent = `${stats.meanRadius.toFixed(2)} a`;
    elements.rmsRadius.textContent = `${stats.rmsRadius.toFixed(2)} a`;
    elements.theoryRadius.textContent = `${stats.theoryRadius.toFixed(2)} a`;
    elements.step.disabled = state.currentStep >= state.targetSteps;
  }

  function fitCanvas(canvas) {
    const bounds = canvas.getBoundingClientRect();
    const width = Math.max(1, Math.round(bounds.width));
    const height = Math.max(1, Math.round(bounds.height));
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const pixelWidth = Math.round(width * dpr);
    const pixelHeight = Math.round(height * dpr);
    if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
      canvas.width = pixelWidth;
      canvas.height = pixelHeight;
    }
    const context = canvas.getContext("2d");
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { context, width, height };
  }

  function viewTransform(width, height) {
    const padding = 40;
    const plotWidth = Math.max(1, width - padding * 2);
    const plotHeight = Math.max(1, height - padding * 2);
    const radius = Math.max(6, Math.ceil(4 * Math.sqrt(state.targetSteps)));
    const scale = Math.min(plotWidth, plotHeight) / (radius * 2);
    return { centreX: width / 2, centreY: height / 2, scale, radius, padding };
  }

  function drawAxes(context, width, height, transform) {
    context.clearRect(0, 0, width, height);
    context.fillStyle = "#dfe8ee";
    context.fillRect(0, 0, width, height);
    const { centreX, centreY, scale, radius } = transform;
    const halfSpan = radius * scale;
    const left = centreX - halfSpan;
    const right = centreX + halfSpan;
    const top = centreY - halfSpan;
    const bottom = centreY + halfSpan;

    context.fillStyle = "#ffffff";
    context.fillRect(left, top, halfSpan * 2, halfSpan * 2);

    context.beginPath();
    context.strokeStyle = "rgba(46, 42, 116, 0.13)";
    context.lineWidth = 1;
    [0.25, 0.75].forEach((fraction) => {
      const x = left + fraction * halfSpan * 2;
      const y = top + fraction * halfSpan * 2;
      context.moveTo(x, top);
      context.lineTo(x, bottom);
      context.moveTo(left, y);
      context.lineTo(right, y);
    });
    context.stroke();

    context.strokeStyle = "rgba(46, 42, 116, 0.55)";
    context.lineWidth = 1.5;
    context.strokeRect(left, top, halfSpan * 2, halfSpan * 2);

    context.beginPath();
    context.strokeStyle = "rgba(46, 42, 116, 0.78)";
    context.lineWidth = 1.6;
    context.moveTo(left, centreY);
    context.lineTo(right, centreY);
    context.moveTo(centreX, top);
    context.lineTo(centreX, bottom);
    context.stroke();

    context.beginPath();
    [left, centreX, right].forEach((x) => {
      context.moveTo(x, centreY - 4);
      context.lineTo(x, centreY + 4);
    });
    [top, centreY, bottom].forEach((y) => {
      context.moveTo(centreX - 4, y);
      context.lineTo(centreX + 4, y);
    });
    context.stroke();

    const negativeLimit = `−${radius}`;
    const positiveLimit = `+${radius}`;
    context.fillStyle = "#211d58";
    context.font = "700 11px system-ui, sans-serif";
    context.textBaseline = "middle";
    context.textAlign = "center";
    context.fillText(negativeLimit, left, bottom + 14);
    context.fillText("0", centreX, bottom + 14);
    context.fillText(positiveLimit, right, bottom + 14);
    context.font = "700 11px system-ui, sans-serif";
    context.fillText("x / a", centreX, bottom + 29);

    context.font = "600 11px system-ui, sans-serif";
    context.textAlign = "right";
    context.fillText(positiveLimit, left - 8, top);
    context.fillText("0", left - 8, centreY);
    context.fillText(negativeLimit, left - 8, bottom);
    context.save();
    context.translate(left - 29, centreY);
    context.rotate(-Math.PI / 2);
    context.font = "700 11px system-ui, sans-serif";
    context.textAlign = "center";
    context.fillText("y / a", 0, 0);
    context.restore();

    context.fillStyle = "#a83c14";
    context.strokeStyle = "#ffffff";
    context.lineWidth = 1.5;
    context.beginPath();
    context.arc(centreX, centreY, 4, 0, Math.PI * 2);
    context.fill();
    context.stroke();
  }

  function drawPathCanvas() {
    const { context, width, height } = fitCanvas(elements.pathCanvas);
    context.clearRect(0, 0, width, height);
    context.fillStyle = "#e9f0f4";
    context.fillRect(0, 0, width, height);

    const outerPadding = 36;
    const side = Math.max(1, Math.min(width - outerPadding * 2, height - outerPadding * 2));
    const cell = side / SINGLE_GRID_SIZE;
    const left = (width - side) / 2;
    const top = (height - side) / 2;
    const xAt = (coordinate) => left + (coordinate - state.viewMinX + 0.5) * cell;
    const yAt = (coordinate) => top + (state.viewMaxY - coordinate + 0.5) * cell;

    for (let row = 0; row < SINGLE_GRID_SIZE; row += 1) {
      for (let column = 0; column < SINGLE_GRID_SIZE; column += 1) {
        context.fillStyle = (row + column) % 2 === 0 ? "#ffffff" : "#e1edf2";
        context.fillRect(left + column * cell, top + row * cell, cell, cell);
      }
    }

    const originVisible = state.viewMinX <= 0 && state.viewMaxX >= 0
      && state.viewMinY <= 0 && state.viewMaxY >= 0;
    if (originVisible) {
      const originColumn = -state.viewMinX;
      const originRow = state.viewMaxY;
      context.fillStyle = "rgba(23, 107, 135, 0.32)";
      context.fillRect(left + originColumn * cell, top + originRow * cell, cell, cell);
    }

    const currentColumn = state.pathX[0] - state.viewMinX;
    const currentRow = state.viewMaxY - state.pathY[0];
    context.fillStyle = "rgba(232, 91, 31, 0.27)";
    context.fillRect(left + currentColumn * cell, top + currentRow * cell, cell, cell);

    context.beginPath();
    context.strokeStyle = "rgba(32, 39, 57, 0.38)";
    context.lineWidth = 1;
    for (let index = 0; index <= SINGLE_GRID_SIZE; index += 1) {
      const offset = index * cell;
      context.moveTo(left + offset, top);
      context.lineTo(left + offset, top + side);
      context.moveTo(left, top + offset);
      context.lineTo(left + side, top + offset);
    }
    context.stroke();
    context.strokeStyle = "rgba(32, 39, 57, 0.88)";
    context.lineWidth = 2;
    context.strokeRect(left, top, side, side);

    const trail = state.trails[0];
    context.save();
    context.beginPath();
    context.rect(left, top, side, side);
    context.clip();
    if (trail.length > 1) {
      context.beginPath();
      context.lineCap = "round";
      context.lineJoin = "round";
      context.strokeStyle = "rgba(143, 48, 14, 0.88)";
      context.lineWidth = Math.max(2.5, cell * 0.16);
      trail.forEach(([x, y], pointIndex) => {
        const px = xAt(x);
        const py = yAt(y);
        if (pointIndex === 0) context.moveTo(px, py);
        else context.lineTo(px, py);
      });
      context.stroke();
    }
    context.restore();

    if (originVisible) {
      const originX = xAt(0);
      const originY = yAt(0);
      context.fillStyle = "#075b76";
      context.strokeStyle = "#ffffff";
      context.lineWidth = 1.5;
      context.beginPath();
      context.arc(originX, originY, Math.max(3.2, cell * 0.18), 0, Math.PI * 2);
      context.fill();
      context.stroke();
    }

    const atomX = xAt(state.pathX[0]);
    const atomY = yAt(state.pathY[0]);
    const atomRadius = Math.max(6, Math.min(10, cell * 0.44));
    context.fillStyle = "rgba(187, 59, 16, 0.3)";
    context.beginPath();
    context.arc(atomX, atomY, atomRadius * 1.65, 0, Math.PI * 2);
    context.fill();
    const atomGradient = context.createRadialGradient(
      atomX - atomRadius * 0.28,
      atomY - atomRadius * 0.32,
      atomRadius * 0.08,
      atomX,
      atomY,
      atomRadius
    );
    atomGradient.addColorStop(0, "#fff3b5");
    atomGradient.addColorStop(0.32, "#ff922f");
    atomGradient.addColorStop(1, "#b3310c");
    context.fillStyle = atomGradient;
    context.strokeStyle = "#681d08";
    context.lineWidth = 2.3;
    context.beginPath();
    context.arc(atomX, atomY, atomRadius, 0, Math.PI * 2);
    context.fill();
    context.stroke();

    context.fillStyle = "rgba(255, 255, 255, 0.9)";
    context.beginPath();
    context.arc(atomX - atomRadius * 0.28, atomY - atomRadius * 0.3, Math.max(1.4, atomRadius * 0.16), 0, Math.PI * 2);
    context.fill();

    context.fillStyle = "#2e2a74";
    context.font = "600 11px system-ui, sans-serif";
    context.textBaseline = "middle";
    const middleX = state.viewMinX + SINGLE_GRID_SIZE / 2;
    [state.viewMinX, middleX, state.viewMaxX].forEach((coordinate) => {
      context.textAlign = "center";
      context.fillText(String(coordinate), xAt(coordinate), top + side + 16);
    });
    const middleY = state.viewMinY + SINGLE_GRID_SIZE / 2;
    [state.viewMinY, middleY, state.viewMaxY].forEach((coordinate) => {
      context.textAlign = "right";
      context.fillText(String(coordinate), left - 8, yAt(coordinate));
    });
    context.fillStyle = "#393747";
    context.font = "700 11px system-ui, sans-serif";
    context.textAlign = "center";
    context.fillText("x / a", left + side / 2, top + side + 30);
    context.save();
    context.translate(left - 27, top + side / 2);
    context.rotate(-Math.PI / 2);
    context.fillText("y / a", 0, 0);
    context.restore();
  }

  function drawCloudCanvas() {
    const { context, width, height } = fitCanvas(elements.cloudCanvas);
    const transform = viewTransform(width, height);
    drawAxes(context, width, height, transform);
    const { centreX, centreY, scale } = transform;
    const stats = walkStatistics();

    if (state.currentStep > 0) {
      context.save();
      context.translate(centreX, centreY);
      context.beginPath();
      context.arc(0, 0, stats.meanRadius * scale, 0, Math.PI * 2);
      context.strokeStyle = "#bd4715";
      context.lineWidth = 3;
      context.stroke();

      context.beginPath();
      context.setLineDash([7, 5]);
      context.arc(0, 0, stats.theoryRadius * scale, 0, Math.PI * 2);
      context.strokeStyle = "#075b76";
      context.lineWidth = 3;
      context.stroke();
      context.restore();
    }

    context.fillStyle = "rgba(38, 32, 99, 0.84)";
    for (let index = 0; index < state.cloudX.length; index += 1) {
      const x = centreX + state.cloudX[index] * scale;
      const y = centreY - state.cloudY[index] * scale;
      context.fillRect(Math.round(x) - 2, Math.round(y) - 2, 4, 4);
    }
  }

  function renderWalk() {
    drawPathCanvas();
    drawCloudCanvas();
  }

  function updateCanvasLabels() {
    const stats = walkStatistics();
    elements.pathCanvas.setAttribute("aria-label", `One atom at coordinate ${state.pathX[0]}, ${state.pathY[0]} after ${state.currentStep} of ${state.targetSteps} random steps. The 20 by 20 viewing window spans x from ${state.viewMinX} to ${state.viewMaxX} and y from ${state.viewMinY} to ${state.viewMaxY}. The unbounded walk began at the origin.`);
    const axisLimit = Math.max(6, Math.ceil(4 * Math.sqrt(state.targetSteps)));
    elements.cloudCanvas.setAttribute("aria-label", `${state.population} random-walker endpoints after ${state.currentStep} steps on x and y axes spanning minus ${axisLimit} to plus ${axisLimit} lattice spacings. Measured mean radius ${stats.meanRadius.toFixed(2)} and root-mean-square radius ${stats.rmsRadius.toFixed(2)} lattice spacings.`);
  }

  elements.steps.addEventListener("input", () => {
    elements.stepsValue.value = Number(elements.steps.value).toLocaleString();
  });
  elements.steps.addEventListener("change", () => initialiseWalk("Step count changed. The trial returned to the origin."));
  elements.population.addEventListener("change", () => initialiseWalk("Endpoint population changed. The trial returned to the origin."));
  elements.play.addEventListener("click", startWalk);
  elements.step.addEventListener("click", singleStep);
  elements.reset.addEventListener("click", () => initialiseWalk("Trial reset. The atom and every ensemble walker are at (0, 0)."));
  elements.resample.addEventListener("click", () => {
    state.seed = (state.seed + 0x9e3779b9) >>> 0;
    initialiseWalk("A new deterministic trial is ready at the origin.");
  });
  const resizeObserver = typeof ResizeObserver === "function"
    ? new ResizeObserver(() => window.requestAnimationFrame(renderWalk))
    : null;
  if (resizeObserver) {
    resizeObserver.observe(elements.pathCanvas);
    resizeObserver.observe(elements.cloudCanvas);
  } else {
    window.addEventListener("resize", renderWalk);
  }

  document.addEventListener("visibilitychange", () => {
    if (document.hidden && state.running) pauseWalk(true);
  });

  initialiseWalk();
})();

(() => {
  "use strict";

  const elements = {
    profile: document.querySelector("#kmc-profile"),
    size: document.querySelector("#kmc-size"),
    steps: document.querySelector("#kmc-steps"),
    stepsValue: document.querySelector("#kmc-steps-value"),
    speed: document.querySelector("#kmc-speed"),
    play: document.querySelector("#kmc-play"),
    step: document.querySelector("#kmc-step"),
    reset: document.querySelector("#kmc-reset"),
    resample: document.querySelector("#kmc-resample"),
    gridCanvas: document.querySelector("#kmc-grid-canvas"),
    profileCanvas: document.querySelector("#kmc-profile-canvas"),
    sweep: document.querySelector("#kmc-sweep"),
    time: document.querySelector("#kmc-time"),
    events: document.querySelector("#kmc-events"),
    exchanges: document.querySelector("#kmc-exchanges"),
    bFraction: document.querySelector("#kmc-b-fraction"),
    status: document.querySelector("#kmc-status")
  };

  if (!elements.gridCanvas || !elements.profileCanvas) return;

  const pixelCanvas = document.createElement("canvas");
  const pixelContext = pixelCanvas.getContext("2d");
  const state = {
    seed: 4217,
    size: 40,
    grid: new Uint8Array(0),
    initialColumns: new Float64Array(0),
    bondA: new Int32Array(0),
    bondB: new Int32Array(0),
    random: null,
    events: 0,
    exchanges: 0,
    time: 0,
    initialB: 0,
    targetSweeps: 120,
    running: false,
    frame: 0,
    runToken: 0
  };

  function createRandom(seed) {
    let value = seed >>> 0;
    return () => {
      value += 0x6d2b79f5;
      let result = value;
      result = Math.imul(result ^ (result >>> 15), result | 1);
      result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
      return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
    };
  }

  function profileName(value = elements.profile.value) {
    if (value === "pulse") return "Middle-layer pulse";
    if (value === "linear") return "Linear-gradient";
    return "Step";
  }

  function initialiseKmc(announcement) {
    pauseKmc(false);
    state.size = Number(elements.size.value);
    state.targetSweeps = Number(elements.steps.value);
    state.events = 0;
    state.exchanges = 0;
    state.time = 0;
    state.grid = new Uint8Array(state.size * state.size);
    buildInitialLattice();
    buildBonds();
    state.random = createRandom(state.seed ^ 0xa53c9e71);
    state.initialColumns = concentrationColumns();
    state.initialB = countB();
    elements.stepsValue.value = state.targetSweeps.toLocaleString();
    elements.status.textContent = announcement || `${profileName()} profile ready. The B fraction will remain constant.`;
    updateKmcReadout();
    renderKmc();
    updateKmcLabels();
  }

  function buildInitialLattice() {
    const n = state.size;
    const profile = elements.profile.value;
    if (profile === "pulse") {
      const centre = Math.floor(n / 2);
      for (let y = 0; y < n; y += 1) state.grid[y * n + centre] = 1;
      return;
    }
    if (profile === "step") {
      const interfaceColumn = Math.floor(n / 2);
      for (let y = 0; y < n; y += 1) {
        for (let x = interfaceColumn; x < n; x += 1) state.grid[y * n + x] = 1;
      }
      return;
    }

    const initialRandom = createRandom(state.seed ^ 0x6d7f3a21);
    const rows = new Int32Array(n);
    for (let x = 0; x < n; x += 1) {
      for (let y = 0; y < n; y += 1) rows[y] = y;
      for (let y = n - 1; y > 0; y -= 1) {
        const target = Math.floor(initialRandom() * (y + 1));
        const temporary = rows[y];
        rows[y] = rows[target];
        rows[target] = temporary;
      }
      const bCount = Math.round(n * x / (n - 1));
      for (let index = 0; index < bCount; index += 1) state.grid[rows[index] * n + x] = 1;
    }
  }

  function buildBonds() {
    const n = state.size;
    const bondCount = (n - 1) * n + n * n;
    state.bondA = new Int32Array(bondCount);
    state.bondB = new Int32Array(bondCount);
    let bond = 0;
    for (let y = 0; y < n; y += 1) {
      for (let x = 0; x < n - 1; x += 1) {
        state.bondA[bond] = y * n + x;
        state.bondB[bond] = y * n + x + 1;
        bond += 1;
      }
    }
    for (let x = 0; x < n; x += 1) {
      for (let y = 0; y < n; y += 1) {
        state.bondA[bond] = y * n + x;
        state.bondB[bond] = ((y + 1) % n) * n + x;
        bond += 1;
      }
    }
  }

  function performKmcEvent() {
    const bond = Math.floor(state.random() * state.bondA.length);
    const a = state.bondA[bond];
    const b = state.bondB[bond];
    if (state.grid[a] !== state.grid[b]) {
      const temporary = state.grid[a];
      state.grid[a] = state.grid[b];
      state.grid[b] = temporary;
      state.exchanges += 1;
    }
    state.time += -Math.log(Math.max(state.random(), Number.MIN_VALUE)) / state.bondA.length;
    state.events += 1;
  }

  function targetEvents() {
    return state.targetSweeps * state.grid.length;
  }

  function processKmcEvents(count) {
    const stopAt = Math.min(targetEvents(), state.events + Math.max(0, count));
    while (state.events < stopAt) performKmcEvent();
  }

  function startKmc() {
    if (state.running) {
      pauseKmc(true);
      return;
    }
    if (state.events >= targetEvents()) initialiseKmc("KMC trial restarted from its initial profile.");
    state.running = true;
    state.runToken += 1;
    const token = state.runToken;
    elements.play.textContent = "Pause";
    elements.step.disabled = true;
    elements.speed.disabled = true;
    const finalEvent = targetEvents();
    const startingEvent = state.events;
    const remainingEvents = finalEvent - startingEvent;
    const fullRunDuration = Number(elements.speed.value);
    const remainingDuration = fullRunDuration * remainingEvents / finalEvent;
    elements.status.textContent = `Kinetic Monte Carlo exchanges are running; this playback targets about ${(remainingDuration / 1000).toFixed(1)} seconds.`;

    let runStartTime = null;
    const animate = (timestamp) => {
      if (!state.running || token !== state.runToken) return;
      if (runStartTime === null) runStartTime = timestamp;
      const elapsed = timestamp - runStartTime;
      const progress = Math.min(1, elapsed / Math.max(1, remainingDuration));
      const desiredEvent = progress >= 1
        ? finalEvent
        : startingEvent + Math.floor(progress * remainingEvents);
      const frameStart = performance.now();
      while (state.events < desiredEvent && performance.now() - frameStart < 10) {
        performKmcEvent();
      }
      updateKmcReadout();
      renderKmc();
      if (state.events >= targetEvents()) finishKmc();
      else state.frame = window.requestAnimationFrame(animate);
    };
    state.frame = window.requestAnimationFrame(animate);
  }

  function pauseKmc(announce) {
    state.running = false;
    state.runToken += 1;
    if (state.frame) window.cancelAnimationFrame(state.frame);
    state.frame = 0;
    elements.play.textContent = "Animate";
    elements.speed.disabled = false;
    elements.step.disabled = state.events >= targetEvents();
    if (announce) {
      elements.status.textContent = `Paused at ${(state.events / state.grid.length).toFixed(2)} sweeps.`;
      updateKmcLabels();
    }
  }

  function finishKmc() {
    pauseKmc(false);
    elements.status.textContent = `Run complete after ${state.targetSweeps.toLocaleString()} sweeps; ${state.initialB.toLocaleString()} B atoms were conserved.`;
    updateKmcLabels();
  }

  function oneKmcSweep() {
    pauseKmc(false);
    if (state.events < targetEvents()) {
      processKmcEvents(state.grid.length);
      updateKmcReadout();
      renderKmc();
      elements.status.textContent = `Advanced to ${(state.events / state.grid.length).toFixed(2)} sweeps.`;
    }
    if (state.events >= targetEvents()) finishKmc();
  }

  function countB() {
    let count = 0;
    for (let index = 0; index < state.grid.length; index += 1) count += state.grid[index];
    return count;
  }

  function concentrationColumns() {
    const columns = new Float64Array(state.size);
    for (let y = 0; y < state.size; y += 1) {
      for (let x = 0; x < state.size; x += 1) columns[x] += state.grid[y * state.size + x];
    }
    for (let x = 0; x < state.size; x += 1) columns[x] /= state.size;
    return columns;
  }

  function updateKmcReadout() {
    const sweeps = state.grid.length ? state.events / state.grid.length : 0;
    elements.sweep.textContent = `${sweeps.toFixed(2)} / ${state.targetSweeps.toLocaleString()} sweeps`;
    elements.time.textContent = state.time.toFixed(3);
    elements.events.textContent = state.events.toLocaleString();
    elements.exchanges.textContent = state.exchanges.toLocaleString();
    elements.bFraction.textContent = (countB() / Math.max(1, state.grid.length)).toFixed(4);
    elements.step.disabled = state.events >= targetEvents();
  }

  function fitCanvas(canvas) {
    const bounds = canvas.getBoundingClientRect();
    const width = Math.max(1, Math.round(bounds.width));
    const height = Math.max(1, Math.round(bounds.height));
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
    }
    const context = canvas.getContext("2d");
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { context, width, height };
  }

  function drawLattice() {
    const { context, width, height } = fitCanvas(elements.gridCanvas);
    context.clearRect(0, 0, width, height);
    context.fillStyle = "#fffefb";
    context.fillRect(0, 0, width, height);

    const n = state.size;
    if (pixelCanvas.width !== n || pixelCanvas.height !== n) {
      pixelCanvas.width = n;
      pixelCanvas.height = n;
    }
    const image = pixelContext.createImageData(n, n);
    for (let index = 0; index < state.grid.length; index += 1) {
      const offset = index * 4;
      const isB = state.grid[index] === 1;
      image.data[offset] = isB ? 232 : 40;
      image.data[offset + 1] = isB ? 117 : 123;
      image.data[offset + 2] = isB ? 46 : 181;
      image.data[offset + 3] = 255;
    }
    pixelContext.putImageData(image, 0, 0);

    const side = Math.max(1, Math.min(width, height) - 28);
    const left = (width - side) / 2;
    const top = (height - side) / 2;
    context.imageSmoothingEnabled = false;
    context.drawImage(pixelCanvas, left, top, side, side);
    context.strokeStyle = "rgba(46, 42, 116, 0.35)";
    context.lineWidth = 1;
    context.strokeRect(left - 0.5, top - 0.5, side + 1, side + 1);
  }

  function drawProfile() {
    const { context, width, height } = fitCanvas(elements.profileCanvas);
    const margin = { left: 55, right: 18, top: 24, bottom: 47 };
    const plotWidth = Math.max(1, width - margin.left - margin.right);
    const plotHeight = Math.max(1, height - margin.top - margin.bottom);
    const xAt = (index) => margin.left + index * plotWidth / Math.max(1, state.size - 1);
    const yAt = (value) => margin.top + (1 - value) * plotHeight;

    context.clearRect(0, 0, width, height);
    context.fillStyle = "#fffefb";
    context.fillRect(0, 0, width, height);
    context.font = "12px system-ui, sans-serif";
    context.textBaseline = "middle";

    [0, 0.25, 0.5, 0.75, 1].forEach((value) => {
      const y = yAt(value);
      context.beginPath();
      context.strokeStyle = value === 0 ? "rgba(46, 42, 116, 0.35)" : "rgba(46, 42, 116, 0.09)";
      context.moveTo(margin.left, y);
      context.lineTo(width - margin.right, y);
      context.stroke();
      context.fillStyle = "#737082";
      context.textAlign = "right";
      context.fillText(value.toFixed(2), margin.left - 8, y);
    });

    [0, 0.5, 1].forEach((value) => {
      const x = margin.left + value * plotWidth;
      context.fillStyle = "#737082";
      context.textAlign = "center";
      context.fillText(value.toFixed(1), x, height - 24);
    });
    context.fillStyle = "#393747";
    context.font = "600 12px system-ui, sans-serif";
    context.fillText("Normalized column position, x/L", margin.left + plotWidth / 2, height - 8);
    context.save();
    context.translate(14, margin.top + plotHeight / 2);
    context.rotate(-Math.PI / 2);
    context.fillText("B concentration, cB", 0, 0);
    context.restore();

    const current = concentrationColumns();
    context.beginPath();
    current.forEach((value, index) => {
      const x = xAt(index);
      const y = yAt(value);
      if (index === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    });
    context.lineTo(xAt(state.size - 1), yAt(0));
    context.lineTo(xAt(0), yAt(0));
    context.closePath();
    context.fillStyle = "rgba(217, 104, 43, 0.10)";
    context.fill();

    context.beginPath();
    state.initialColumns.forEach((value, index) => {
      const x = xAt(index);
      const y = yAt(value);
      if (index === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    });
    context.setLineDash([7, 5]);
    context.strokeStyle = "rgba(23, 107, 135, 0.9)";
    context.lineWidth = 2;
    context.stroke();

    context.beginPath();
    current.forEach((value, index) => {
      const x = xAt(index);
      const y = yAt(value);
      if (index === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    });
    context.setLineDash([]);
    context.strokeStyle = "#d9682b";
    context.lineWidth = 2.5;
    context.stroke();
  }

  function renderKmc() {
    drawLattice();
    drawProfile();
  }

  function updateKmcLabels() {
    const sweeps = state.events / Math.max(1, state.grid.length);
    const bFraction = countB() / Math.max(1, state.grid.length);
    elements.gridCanvas.setAttribute("aria-label", `${state.size} by ${state.size} lattice after ${sweeps.toFixed(2)} sweeps, with A atoms blue and B atoms orange. B fraction ${bFraction.toFixed(4)}.`);
    elements.profileCanvas.setAttribute("aria-label", `${profileName()} B-concentration profile after ${sweeps.toFixed(2)} kinetic Monte Carlo sweeps.`);
  }

  elements.profile.addEventListener("change", () => initialiseKmc(`${profileName()} profile selected and reset.`));
  elements.size.addEventListener("change", () => initialiseKmc(`Grid changed to ${elements.size.value} by ${elements.size.value} and reset.`));
  elements.steps.addEventListener("input", () => {
    elements.stepsValue.value = Number(elements.steps.value).toLocaleString();
  });
  elements.steps.addEventListener("change", () => initialiseKmc("Target sweeps changed; the KMC profile was reset."));
  elements.play.addEventListener("click", startKmc);
  elements.step.addEventListener("click", oneKmcSweep);
  elements.reset.addEventListener("click", () => initialiseKmc(`${profileName()} profile reset to time zero.`));
  elements.resample.addEventListener("click", () => {
    state.seed = (state.seed + 0x9e3779b9) >>> 0;
    initialiseKmc("A new seeded event sequence is ready at time zero.");
  });

  const resizeObserver = typeof ResizeObserver === "function"
    ? new ResizeObserver(() => window.requestAnimationFrame(renderKmc))
    : null;
  if (resizeObserver) {
    resizeObserver.observe(elements.gridCanvas);
    resizeObserver.observe(elements.profileCanvas);
  } else {
    window.addEventListener("resize", renderKmc);
  }
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && state.running) pauseKmc(true);
  });

  initialiseKmc();
})();

(() => {
  "use strict";

  const elements = {
    profile: document.querySelector("#fdm-profile"),
    nodes: document.querySelector("#fdm-nodes"),
    diffusivity: document.querySelector("#fdm-diffusivity"),
    fourierControl: document.querySelector("#fdm-fourier-control"),
    fourierValue: document.querySelector("#fdm-fourier-value"),
    time: document.querySelector("#fdm-time"),
    timeValue: document.querySelector("#fdm-time-value"),
    speed: document.querySelector("#fdm-speed"),
    play: document.querySelector("#fdm-play"),
    step: document.querySelector("#fdm-step"),
    reset: document.querySelector("#fdm-reset"),
    canvas: document.querySelector("#fdm-canvas"),
    currentTime: document.querySelector("#fdm-current-time"),
    physicalTime: document.querySelector("#fdm-physical-time"),
    fourier: document.querySelector("#fdm-fourier"),
    mass: document.querySelector("#fdm-mass"),
    range: document.querySelector("#fdm-range"),
    stability: document.querySelector("#fdm-stability"),
    status: document.querySelector("#fdm-status"),
    copy: document.querySelector("#copy-python"),
    code: document.querySelector("#python-code"),
    copyStatus: document.querySelector("#copy-status"),
    codePanel: document.querySelector(".code-panel"),
    summaryHint: document.querySelector(".summary-hint")
  };

  if (!elements.canvas) return;

  const STABILITY_LIMIT = 0.5;
  const UNSTABLE_Y_MIN = -2;
  const UNSTABLE_Y_MAX = 3;
  const DOMAIN_LENGTH = 100e-6;
  const state = {
    nodes: 101,
    diffusivity: 1e-12,
    selectedFourier: 0.45,
    targetTau: 0.08,
    deltaX: 0.01,
    deltaTau: 0.000045,
    tau: 0,
    iteration: 0,
    concentration: new Float64Array(0),
    initial: new Float64Array(0),
    next: new Float64Array(0),
    initialMass: 0,
    diverged: false,
    running: false,
    frame: 0,
    runToken: 0
  };

  function profileName(value = elements.profile.value) {
    if (value === "pulse") return "Narrow-pulse";
    if (value === "linear") return "Linear-gradient";
    return "Step";
  }

  function initialiseFdm(announcement) {
    pauseFdm(false);
    state.nodes = Number(elements.nodes.value);
    state.diffusivity = Number(elements.diffusivity.value);
    state.selectedFourier = Number(elements.fourierControl.value);
    state.targetTau = Number(elements.time.value);
    state.deltaX = 1 / state.nodes;
    state.deltaTau = state.selectedFourier * state.deltaX * state.deltaX;
    state.tau = 0;
    state.iteration = 0;
    state.diverged = false;
    state.concentration = new Float64Array(state.nodes);
    state.next = new Float64Array(state.nodes);
    buildInitialConcentration();
    state.initial = state.concentration.slice();
    state.initialMass = sumConcentration(state.initial);
    elements.fourierValue.value = state.selectedFourier.toFixed(2);
    elements.timeValue.value = state.targetTau.toFixed(3);
    elements.status.textContent = announcement || `${profileName()} profile ready at τ = 0.`;
    updateFdmReadout();
    drawFdm();
    updateStabilityBadge();
    updateFdmLabel();
  }

  function updateStabilityBadge(value = state.selectedFourier, diverged = state.diverged) {
    if (diverged) {
      elements.stability.dataset.state = "diverged";
      elements.stability.textContent = `Diverged · Fo = ${value.toFixed(2)}`;
      return;
    }
    if (Math.abs(value - STABILITY_LIMIT) < 1e-12) {
      elements.stability.dataset.state = "limit";
      elements.stability.textContent = `Stability limit · Fo = ${value.toFixed(2)}`;
      return;
    }
    if (value > STABILITY_LIMIT) {
      elements.stability.dataset.state = "unstable";
      elements.stability.textContent = `Unstable · Fo = ${value.toFixed(2)}`;
      return;
    }
    elements.stability.dataset.state = "stable";
    elements.stability.textContent = `Stable · Fo = ${value.toFixed(2)}`;
  }

  function buildInitialConcentration() {
    const profile = elements.profile.value;
    if (profile === "pulse") {
      const centre = Math.floor(state.nodes / 2);
      const halfWidth = Math.max(0, Math.round(state.nodes * 0.01));
      for (let index = centre - halfWidth; index <= centre + halfWidth; index += 1) {
        if (index >= 0 && index < state.nodes) state.concentration[index] = 1;
      }
      return;
    }
    if (profile === "step") {
      for (let index = 0; index < state.nodes; index += 1) {
        state.concentration[index] = index < Math.floor(state.nodes / 2) ? 0 : 1;
      }
      return;
    }
    for (let index = 0; index < state.nodes; index += 1) {
      state.concentration[index] = index / (state.nodes - 1);
    }
  }

  function advanceFdm() {
    const remainingTau = Math.max(0, state.targetTau - state.tau);
    if (remainingTau <= 1e-15) return false;
    const stepTau = Math.min(state.deltaTau, remainingTau);
    const stepFourier = stepTau / (state.deltaX * state.deltaX);
    const c = state.concentration;
    const next = state.next;
    const last = state.nodes - 1;
    next[0] = c[0] + stepFourier * (c[1] - c[0]);
    for (let index = 1; index < last; index += 1) {
      next[index] = c[index] + stepFourier * (c[index + 1] - 2 * c[index] + c[index - 1]);
    }
    next[last] = c[last] + stepFourier * (c[last - 1] - c[last]);
    state.concentration = next;
    state.next = c;
    state.iteration += 1;
    state.tau = Math.min(state.targetTau, state.tau + stepTau);
    if (concentrationHasDiverged(state.concentration)) {
      state.diverged = true;
      updateStabilityBadge();
    }
    return true;
  }

  function concentrationHasDiverged(values) {
    for (let index = 0; index < values.length; index += 1) {
      const value = values[index];
      if (!Number.isFinite(value)) return true;
      if (state.selectedFourier > STABILITY_LIMIT && (value < UNSTABLE_Y_MIN || value > UNSTABLE_Y_MAX)) return true;
    }
    return false;
  }

  function estimateRemainingFdmIncrements() {
    let concentration = state.concentration.slice();
    let next = new Float64Array(state.nodes);
    let tau = state.tau;
    let increments = 0;
    const maximumIncrements = Math.ceil((state.targetTau - tau) / state.deltaTau) + 1;

    while (tau < state.targetTau - 1e-15 && increments < maximumIncrements) {
      const stepTau = Math.min(state.deltaTau, state.targetTau - tau);
      const stepFourier = stepTau / (state.deltaX * state.deltaX);
      next[0] = concentration[0] + stepFourier * (concentration[1] - concentration[0]);
      for (let index = 1; index < state.nodes - 1; index += 1) {
        next[index] = concentration[index] + stepFourier * (
          concentration[index + 1] - 2 * concentration[index] + concentration[index - 1]
        );
      }
      next[state.nodes - 1] = concentration[state.nodes - 1] + stepFourier * (
        concentration[state.nodes - 2] - concentration[state.nodes - 1]
      );
      const previous = concentration;
      concentration = next;
      next = previous;
      tau = Math.min(state.targetTau, tau + stepTau);
      increments += 1;
      if (concentrationHasDiverged(concentration)) break;
    }

    return increments;
  }

  function reachedFdmTarget() {
    return state.tau >= state.targetTau - 1e-15;
  }

  function fdmComplete() {
    return state.diverged || reachedFdmTarget();
  }

  function startFdm() {
    if (state.running) {
      pauseFdm(true);
      return;
    }
    if (fdmComplete()) initialiseFdm("Finite-difference solution restarted at τ = 0.");
    state.running = true;
    state.runToken += 1;
    const token = state.runToken;
    elements.play.textContent = "Pause";
    elements.fourierControl.disabled = true;
    elements.step.disabled = true;
    elements.speed.disabled = true;
    const startingTau = state.tau;
    const startingIteration = state.iteration;
    const remainingTau = state.targetTau - startingTau;
    const fullRunDuration = Number(elements.speed.value);
    const remainingDuration = fullRunDuration * remainingTau / state.targetTau;
    const paceUnstableRun = state.selectedFourier > STABILITY_LIMIT;
    const remainingIncrements = paceUnstableRun ? estimateRemainingFdmIncrements() : 0;
    elements.status.textContent = paceUnstableRun
      ? `Fo = ${state.selectedFourier.toFixed(2)} exceeds the stability limit. The growing, nonphysical oscillations are paced over about ${(remainingDuration / 1000).toFixed(1)} seconds so you can follow them.`
      : `The continuum concentration field is evolving; this playback targets about ${(remainingDuration / 1000).toFixed(1)} seconds.`;

    let runStartTime = null;
    const animate = (timestamp) => {
      if (!state.running || token !== state.runToken) return;
      if (runStartTime === null) runStartTime = timestamp;
      const elapsed = timestamp - runStartTime;
      const progress = Math.min(1, elapsed / Math.max(1, remainingDuration));
      const desiredTau = progress >= 1
        ? state.targetTau
        : startingTau + progress * remainingTau;
      const desiredIteration = startingIteration + Math.floor(progress * remainingIncrements);
      const frameStart = performance.now();
      while (
        (paceUnstableRun ? state.iteration < desiredIteration : state.tau < desiredTau - 1e-15)
        && !fdmComplete()
        && performance.now() - frameStart < 10
      ) {
        const finalIncrement = state.targetTau - state.tau <= state.deltaTau * (1 + 1e-9);
        if (!paceUnstableRun && progress < 1 && finalIncrement) break;
        advanceFdm();
      }
      updateFdmReadout();
      drawFdm();
      if (state.diverged) finishDivergedFdm();
      else if (reachedFdmTarget()) finishFdm();
      else state.frame = window.requestAnimationFrame(animate);
    };
    state.frame = window.requestAnimationFrame(animate);
  }

  function pauseFdm(announce) {
    state.running = false;
    state.runToken += 1;
    if (state.frame) window.cancelAnimationFrame(state.frame);
    state.frame = 0;
    elements.play.textContent = "Animate";
    elements.fourierControl.disabled = false;
    elements.speed.disabled = false;
    elements.step.disabled = fdmComplete();
    if (announce) {
      elements.status.textContent = `Paused at τ = ${state.tau.toFixed(5)}.`;
      updateFdmLabel();
    }
  }

  function finishFdm() {
    pauseFdm(false);
    elements.status.textContent = state.selectedFourier > STABILITY_LIMIT
      ? `Target τ = ${state.targetTau.toFixed(3)} was reached before the plotted range diverged, but Fo = ${state.selectedFourier.toFixed(2)} is still above the stability limit. Increase the target time or choose One increment to reveal the growing oscillation.`
      : `Solution reached target τ = ${state.targetTau.toFixed(3)} with ${massPercent().toFixed(3)}% of the initial mass retained.`;
    updateFdmLabel();
  }

  function finishDivergedFdm() {
    pauseFdm(false);
    const range = concentrationRange();
    const retainedMass = massPercent();
    const massMessage = Number.isFinite(retainedMass) ? ` Mass is still ${retainedMass.toFixed(3)}%, showing that conservation alone does not guarantee stability.` : "";
    elements.status.textContent = `Numerical instability detected at τ = ${state.tau.toFixed(5)}: Fo = ${state.selectedFourier.toFixed(2)} produced a nonphysical concentration range ${formatConcentrationRange(range)}.${massMessage} Reset and choose Fo ≤ 0.50 to recover a stable solution.`;
    updateFdmLabel();
  }

  function oneFdmIncrement() {
    pauseFdm(false);
    if (!fdmComplete()) {
      advanceFdm();
      updateFdmReadout();
      drawFdm();
      elements.status.textContent = state.selectedFourier > STABILITY_LIMIT
        ? `Advanced one potentially unstable increment to τ = ${state.tau.toFixed(5)}.`
        : `Advanced one stable increment to τ = ${state.tau.toFixed(5)}.`;
    }
    if (state.diverged) finishDivergedFdm();
    else if (reachedFdmTarget()) finishFdm();
  }

  function sumConcentration(values) {
    let total = 0;
    for (let index = 0; index < values.length; index += 1) total += values[index];
    return total;
  }

  function massPercent() {
    return state.initialMass ? 100 * sumConcentration(state.concentration) / state.initialMass : 100;
  }

  function physicalSeconds() {
    return state.tau * DOMAIN_LENGTH * DOMAIN_LENGTH / state.diffusivity;
  }

  function formatTime(seconds) {
    if (seconds < 60) return `${seconds.toFixed(1)} s`;
    if (seconds < 3600) return `${(seconds / 60).toFixed(2)} min`;
    return `${(seconds / 3600).toFixed(2)} h`;
  }

  function concentrationRange() {
    let minimum = Infinity;
    let maximum = -Infinity;
    let finite = true;
    for (let index = 0; index < state.concentration.length; index += 1) {
      const value = state.concentration[index];
      if (!Number.isFinite(value)) {
        finite = false;
        continue;
      }
      minimum = Math.min(minimum, value);
      maximum = Math.max(maximum, value);
    }
    if (minimum === Infinity) return { minimum: UNSTABLE_Y_MIN, maximum: UNSTABLE_Y_MAX, finite: false };
    return { minimum, maximum, finite };
  }

  function formatConcentrationRange(range) {
    const suffix = range.finite ? "" : " (non-finite values present)";
    return `${range.minimum.toFixed(3)} – ${range.maximum.toFixed(3)}${suffix}`;
  }

  function updateFdmReadout() {
    const range = concentrationRange();
    elements.currentTime.textContent = state.tau.toFixed(5);
    elements.physicalTime.textContent = formatTime(physicalSeconds());
    elements.fourier.textContent = state.selectedFourier.toFixed(3);
    const retainedMass = massPercent();
    elements.mass.textContent = Number.isFinite(retainedMass) ? `${retainedMass.toFixed(3)}%` : "not finite";
    elements.range.textContent = formatConcentrationRange(range);
    elements.step.disabled = fdmComplete();
  }

  function fitCanvas(canvas) {
    const bounds = canvas.getBoundingClientRect();
    const width = Math.max(1, Math.round(bounds.width));
    const height = Math.max(1, Math.round(bounds.height));
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
    }
    const context = canvas.getContext("2d");
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { context, width, height };
  }

  function drawFdm() {
    const { context, width, height } = fitCanvas(elements.canvas);
    const margin = { left: 62, right: 22, top: 26, bottom: 52 };
    const plotWidth = Math.max(1, width - margin.left - margin.right);
    const plotHeight = Math.max(1, height - margin.top - margin.bottom);
    const xAt = (index) => margin.left + (index + 0.5) * plotWidth / state.nodes;
    const unstablePlot = state.selectedFourier > STABILITY_LIMIT;
    const yMinimum = unstablePlot ? UNSTABLE_Y_MIN : 0;
    const yMaximum = unstablePlot ? UNSTABLE_Y_MAX : 1;
    const yAt = (value) => {
      const finiteValue = Number.isFinite(value) ? value : 0.5;
      const clippedValue = Math.max(yMinimum, Math.min(yMaximum, finiteValue));
      return margin.top + (yMaximum - clippedValue) / (yMaximum - yMinimum) * plotHeight;
    };
    const yTicks = unstablePlot ? [-2, -1, 0, 1, 2, 3] : [0, 0.25, 0.5, 0.75, 1];

    context.clearRect(0, 0, width, height);
    context.fillStyle = "#fffefb";
    context.fillRect(0, 0, width, height);
    context.font = "12px system-ui, sans-serif";
    context.textBaseline = "middle";

    yTicks.forEach((value) => {
      const y = yAt(value);
      context.beginPath();
      context.strokeStyle = value === 0 || value === 1 ? "rgba(46, 42, 116, 0.35)" : "rgba(46, 42, 116, 0.09)";
      context.moveTo(margin.left, y);
      context.lineTo(width - margin.right, y);
      context.stroke();
      context.fillStyle = "#737082";
      context.textAlign = "right";
      context.fillText(value.toFixed(2), margin.left - 9, y);
    });

    [-50, 0, 50].forEach((micrometres) => {
      const x = margin.left + (micrometres + 50) / 100 * plotWidth;
      context.fillStyle = "#737082";
      context.textAlign = "center";
      context.fillText(`${micrometres}`, x, height - 27);
    });
    context.fillStyle = "#393747";
    context.font = "600 12px system-ui, sans-serif";
    context.fillText("Position, x (µm)", margin.left + plotWidth / 2, height - 9);
    context.save();
    context.translate(15, margin.top + plotHeight / 2);
    context.rotate(-Math.PI / 2);
    context.fillText("Normalized concentration, C", 0, 0);
    context.restore();

    if (unstablePlot) {
      context.fillStyle = "rgba(47, 122, 90, 0.08)";
      context.fillRect(margin.left, yAt(1), plotWidth, yAt(0) - yAt(1));
    }

    context.save();
    context.beginPath();
    context.rect(margin.left, margin.top, plotWidth, plotHeight);
    context.clip();

    if (!unstablePlot) {
      context.beginPath();
      state.concentration.forEach((value, index) => {
        const x = xAt(index);
        const y = yAt(value);
        if (index === 0) context.moveTo(x, y);
        else context.lineTo(x, y);
      });
      context.lineTo(xAt(state.nodes - 1), yAt(0));
      context.lineTo(xAt(0), yAt(0));
      context.closePath();
      context.fillStyle = "rgba(23, 107, 135, 0.11)";
      context.fill();
    }

    context.beginPath();
    state.initial.forEach((value, index) => {
      const x = xAt(index);
      const y = yAt(value);
      if (index === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    });
    context.setLineDash([7, 5]);
    context.strokeStyle = "rgba(217, 104, 43, 0.78)";
    context.lineWidth = 2;
    context.stroke();

    context.beginPath();
    state.concentration.forEach((value, index) => {
      const x = xAt(index);
      const y = yAt(value);
      if (index === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    });
    context.setLineDash([]);
    context.strokeStyle = unstablePlot ? "#b23a2b" : "#176b87";
    context.lineWidth = 2.8;
    context.stroke();
    context.restore();
  }

  function updateFdmLabel() {
    const range = concentrationRange();
    const retainedMass = massPercent();
    const stabilityDescription = state.diverged
      ? "Numerical divergence has been detected."
      : state.selectedFourier > STABILITY_LIMIT
        ? `The selected Fourier number ${state.selectedFourier.toFixed(2)} exceeds the stability limit.`
        : `The selected Fourier number ${state.selectedFourier.toFixed(2)} is stable.`;
    const massDescription = Number.isFinite(retainedMass) ? `${retainedMass.toFixed(3)} percent` : "not finite";
    elements.canvas.setAttribute("aria-label", `${profileName()} finite-difference concentration profile at dimensionless time ${state.tau.toFixed(5)}. ${stabilityDescription} Concentration range: ${formatConcentrationRange(range)}; mass retained ${massDescription}.`);
  }

  async function copyPython() {
    try {
      await navigator.clipboard.writeText(elements.code.textContent);
      elements.copyStatus.textContent = "Python program copied to the clipboard.";
    } catch (error) {
      elements.copyStatus.textContent = "Clipboard access was unavailable. Select the code manually to copy it.";
    }
  }

  elements.profile.addEventListener("change", () => initialiseFdm(`${profileName()} initial condition selected.`));
  elements.nodes.addEventListener("change", () => initialiseFdm(`Grid changed to ${elements.nodes.value} points; the solution was reset.`));
  elements.diffusivity.addEventListener("change", () => initialiseFdm("Diffusivity changed. The normalized profile reset; the physical time scale was updated."));
  elements.fourierControl.addEventListener("input", () => {
    const value = Number(elements.fourierControl.value);
    elements.fourierValue.value = value.toFixed(2);
    updateStabilityBadge(value, false);
  });
  elements.fourierControl.addEventListener("change", () => initialiseFdm(`Fourier number changed to ${Number(elements.fourierControl.value).toFixed(2)}; the solution was reset.`));
  elements.time.addEventListener("input", () => {
    elements.timeValue.value = Number(elements.time.value).toFixed(3);
  });
  elements.time.addEventListener("change", () => initialiseFdm("Target dimensionless time changed; the solution was reset."));
  elements.play.addEventListener("click", startFdm);
  elements.step.addEventListener("click", oneFdmIncrement);
  elements.reset.addEventListener("click", () => initialiseFdm(`${profileName()} profile reset to τ = 0.`));
  elements.copy.addEventListener("click", copyPython);
  elements.codePanel.addEventListener("toggle", () => {
    elements.summaryHint.textContent = elements.codePanel.open ? "Hide code" : "Show code";
  });

  const resizeObserver = typeof ResizeObserver === "function"
    ? new ResizeObserver(() => window.requestAnimationFrame(drawFdm))
    : null;
  if (resizeObserver) resizeObserver.observe(elements.canvas);
  else window.addEventListener("resize", drawFdm);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && state.running) pauseFdm(true);
  });

  initialiseFdm();
})();
