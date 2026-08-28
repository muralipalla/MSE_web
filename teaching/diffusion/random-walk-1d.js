(() => {
  "use strict";

  const ONE_D_STEPS = 100;
  const ONE_D_POPULATION = 1000;
  const DISTRIBUTION_Y_MAX = 150;

  function centralReturnProbability(steps) {
    if (steps % 2 !== 0) return 0;
    let probability = 1;
    for (let index = 1; index <= steps / 2; index += 1) {
      probability *= (2 * index - 1) / (2 * index);
    }
    return probability;
  }

  function setPredictionFeedback(prefix, choiceLabels, correctValue, renderDetails) {
    const radios = Array.from(document.querySelectorAll(`input[name="${prefix}-choice"]`));
    const reveal = document.querySelector(`#${prefix}-reveal`);
    const status = document.querySelector(`#${prefix}-prediction-status`);
    const result = document.querySelector(`#${prefix}-result`);
    const comparison = document.querySelector(`#${prefix}-comparison`);
    const chosenAnswer = document.querySelector(`#${prefix}-chosen-answer`);
    if (!radios.length || !reveal || !status || !result || !comparison || !chosenAnswer) return;

    const reset = () => {
      result.hidden = true;
      status.textContent = "";
      delete status.dataset.state;
    };

    const revealAnswer = () => {
      const selected = radios.find((radio) => radio.checked);
      if (!selected) {
        status.dataset.state = "error";
        status.textContent = "Choose one answer before revealing the result.";
        radios[0].focus();
        return;
      }
      const isCorrect = selected.value === correctValue;
      chosenAnswer.textContent = choiceLabels[selected.value];
      comparison.textContent = isCorrect
        ? "Exactly right. Random motion covers far less net distance than the total path travelled."
        : "The steps cancel more strongly than the path length suggests. Compare your choice with the RMS result below.";
      renderDetails();
      result.hidden = false;
      status.dataset.state = "success";
      status.textContent = "Answer revealed below.";
    };

    radios.forEach((radio) => radio.addEventListener("change", reset));
    reveal.addEventListener("click", revealAnswer);
  }

  const oneDRms = Math.sqrt(ONE_D_STEPS);
  const oneDReturnProbability = centralReturnProbability(ONE_D_STEPS);
  const oneDMeanAbsolute = ONE_D_STEPS * oneDReturnProbability;
  setPredictionFeedback(
    "rw1d",
    { "100": "100a", "50": "50a", "10": "10a" },
    "10",
    () => {
      document.querySelector("#rw1d-theory-answer").textContent = `${oneDRms.toFixed(2)}a`;
      document.querySelector("#rw1d-mean-answer").textContent = `${oneDMeanAbsolute.toFixed(2)}a`;
      document.querySelector("#rw1d-origin-answer").textContent = `≈ ${(ONE_D_POPULATION * oneDReturnProbability).toFixed(1)} of 1,000`;
      document.querySelector("#rw1d-insight").textContent = "Using RMS as the measure of typical distance, xᵣₘₛ = √N a = 10a. The ordinary mean distance ⟨|x|⟩ is slightly smaller, about 7.96a, while the mean signed position remains zero because left and right are equally likely.";
    }
  );

  setPredictionFeedback(
    "rw2d",
    { smaller: "Smaller than 10a", same: "The same: 10a", larger: "Larger than 10a" },
    "same",
    () => {
      document.querySelector("#rw2d-insight").textContent = "The total RMS distance does not depend on dimensionality for independent, unbiased, fixed-length steps: ⟨r²⟩ = Na², so rᵣₘₛ = 10a after 100 steps in both 1D and 2D. In 2D the spread is shared between x and y, giving 7.07a RMS along each axis.";
    }
  );
})();

(() => {
  "use strict";

  const elements = {
    speed: document.querySelector("#rw1d-speed"),
    play: document.querySelector("#rw1d-play"),
    step: document.querySelector("#rw1d-step"),
    reset: document.querySelector("#rw1d-reset"),
    resample: document.querySelector("#rw1d-resample"),
    atomCanvas: document.querySelector("#rw1d-atom-canvas"),
    ensembleCanvas: document.querySelector("#rw1d-ensemble-canvas"),
    distributionToggle: document.querySelector("#rw1d-distribution-toggle"),
    positionChip: document.querySelector("#rw1d-position-chip"),
    stepChip: document.querySelector("#rw1d-step-chip"),
    currentStep: document.querySelector("#rw1d-current-step"),
    position: document.querySelector("#rw1d-position"),
    meanPosition: document.querySelector("#rw1d-mean-position"),
    meanDistance: document.querySelector("#rw1d-mean-distance"),
    rmsDistance: document.querySelector("#rw1d-rms-distance"),
    theoryDistance: document.querySelector("#rw1d-theory-distance"),
    status: document.querySelector("#rw1d-status")
  };

  if (!elements.atomCanvas || !elements.ensembleCanvas) return;

  const TARGET_STEPS = 100;
  const POPULATION = 1000;
  const VIEW_HALF_WIDTH = 20;
  const state = {
    seed: 9353,
    currentStep: 0,
    atomPosition: 0,
    endpoints: new Int16Array(POPULATION),
    path: [0],
    viewMin: -VIEW_HALF_WIDTH,
    viewMax: VIEW_HALF_WIDTH,
    random: null,
    showDistribution: false,
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

  function initialise(announcement = "Ready. The atom and all 1,000 walkers are at x/a = 0.") {
    pause(false);
    state.currentStep = 0;
    state.atomPosition = 0;
    state.endpoints = new Int16Array(POPULATION);
    state.path = [0];
    state.viewMin = -VIEW_HALF_WIDTH;
    state.viewMax = VIEW_HALF_WIDTH;
    state.random = createRandom(state.seed);
    elements.status.textContent = announcement;
    updateReadout();
    render();
    updateCanvasLabels();
  }

  function takeOneStep() {
    if (state.currentStep >= TARGET_STEPS) return false;
    state.atomPosition += state.random() < 0.5 ? -1 : 1;
    state.path.push(state.atomPosition);
    for (let index = 0; index < state.endpoints.length; index += 1) {
      state.endpoints[index] += state.random() < 0.5 ? -1 : 1;
    }
    state.currentStep += 1;
    panViewport();
    return true;
  }

  function panViewport() {
    if (state.atomPosition <= state.viewMin) {
      state.viewMin -= VIEW_HALF_WIDTH;
      state.viewMax -= VIEW_HALF_WIDTH;
    } else if (state.atomPosition >= state.viewMax) {
      state.viewMin += VIEW_HALF_WIDTH;
      state.viewMax += VIEW_HALF_WIDTH;
    }
  }

  function start() {
    if (state.running) {
      pause(true);
      return;
    }
    if (state.currentStep >= TARGET_STEPS) initialise("The 1D trial restarted at the origin.");
    state.running = true;
    state.runToken += 1;
    const token = state.runToken;
    const startingStep = state.currentStep;
    const remainingSteps = TARGET_STEPS - startingStep;
    const fullDuration = Number(elements.speed.value);
    const remainingDuration = fullDuration * remainingSteps / TARGET_STEPS;
    elements.play.textContent = "Pause";
    elements.step.disabled = true;
    elements.speed.disabled = true;
    elements.status.textContent = `Coin flips are moving the atom and 1,000 walkers; this playback targets about ${(remainingDuration / 1000).toFixed(1)} seconds.`;

    let runStartTime = null;
    const animate = (timestamp) => {
      if (!state.running || token !== state.runToken) return;
      if (runStartTime === null) runStartTime = timestamp;
      const elapsed = timestamp - runStartTime;
      const progress = Math.min(1, elapsed / Math.max(1, remainingDuration));
      const desiredStep = progress >= 1
        ? TARGET_STEPS
        : startingStep + Math.floor(progress * remainingSteps);
      if (state.currentStep < desiredStep) {
        while (state.currentStep < desiredStep) takeOneStep();
        updateReadout();
        render();
        updateCanvasLabels();
      }
      if (state.currentStep >= TARGET_STEPS) finish();
      else state.frame = window.requestAnimationFrame(animate);
    };
    state.frame = window.requestAnimationFrame(animate);
  }

  function pause(announce) {
    state.running = false;
    state.runToken += 1;
    if (state.frame) window.cancelAnimationFrame(state.frame);
    state.frame = 0;
    elements.play.textContent = "Animate";
    elements.speed.disabled = false;
    elements.step.disabled = state.currentStep >= TARGET_STEPS;
    if (announce) {
      elements.status.textContent = `Paused after ${state.currentStep} coin flips.`;
      updateCanvasLabels();
    }
  }

  function finish() {
    pause(false);
    const stats = statistics();
    elements.status.textContent = `Trial complete: 100 coin flips each. The ensemble RMS distance is ${stats.rms.toFixed(2)}a; theory predicts 10.00a.`;
    updateCanvasLabels();
  }

  function advanceOneStep() {
    pause(false);
    if (takeOneStep()) {
      updateReadout();
      render();
      updateCanvasLabels();
      elements.status.textContent = `Flip ${state.currentStep}: the atom is at x/a = ${state.atomPosition}.`;
    }
    if (state.currentStep >= TARGET_STEPS) finish();
  }

  function statistics() {
    let sum = 0;
    let sumAbsolute = 0;
    let sumSquared = 0;
    for (let index = 0; index < state.endpoints.length; index += 1) {
      const position = state.endpoints[index];
      sum += position;
      sumAbsolute += Math.abs(position);
      sumSquared += position * position;
    }
    return {
      mean: sum / POPULATION,
      meanAbsolute: sumAbsolute / POPULATION,
      rms: Math.sqrt(sumSquared / POPULATION),
      theoryRms: Math.sqrt(state.currentStep)
    };
  }

  function updateReadout() {
    const stats = statistics();
    elements.positionChip.textContent = `Atom x/a = ${state.atomPosition}`;
    elements.stepChip.textContent = `${state.currentStep} / ${TARGET_STEPS} steps`;
    elements.currentStep.textContent = state.currentStep.toString();
    elements.position.textContent = state.atomPosition.toString();
    elements.meanPosition.textContent = stats.mean.toFixed(2);
    elements.meanDistance.textContent = `${stats.meanAbsolute.toFixed(2)} a`;
    elements.rmsDistance.textContent = `${stats.rms.toFixed(2)} a`;
    elements.theoryDistance.textContent = `${stats.theoryRms.toFixed(2)} a`;
    elements.step.disabled = state.currentStep >= TARGET_STEPS;
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

  function drawAtomCanvas() {
    const { context, width, height } = fitCanvas(elements.atomCanvas);
    context.clearRect(0, 0, width, height);
    context.fillStyle = "#edf3f6";
    context.fillRect(0, 0, width, height);

    const left = 42;
    const right = width - 24;
    const centreY = height * 0.52;
    const span = state.viewMax - state.viewMin;
    const xAt = (position) => left + (position - state.viewMin) / span * (right - left);

    context.strokeStyle = "rgba(46, 42, 116, 0.12)";
    context.lineWidth = 1;
    for (let position = state.viewMin; position <= state.viewMax; position += 1) {
      const x = xAt(position);
      context.beginPath();
      context.moveTo(x, centreY - (position % 5 === 0 ? 13 : 7));
      context.lineTo(x, centreY + (position % 5 === 0 ? 13 : 7));
      context.stroke();
    }
    context.strokeStyle = "#393747";
    context.lineWidth = 2.2;
    context.beginPath();
    context.moveTo(left, centreY);
    context.lineTo(right, centreY);
    context.stroke();

    const visits = new Map();
    state.path.forEach((position) => visits.set(position, (visits.get(position) || 0) + 1));
    visits.forEach((count, position) => {
      if (position < state.viewMin || position > state.viewMax) return;
      context.fillStyle = "rgba(217, 104, 43, 0.28)";
      context.beginPath();
      context.arc(xAt(position), centreY, Math.min(7, 2 + Math.sqrt(count)), 0, Math.PI * 2);
      context.fill();
    });

    if (state.viewMin <= 0 && state.viewMax >= 0) {
      context.fillStyle = "#075b76";
      context.beginPath();
      context.arc(xAt(0), centreY, 4.5, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = "#075b76";
      context.font = "700 11px system-ui, sans-serif";
      context.textAlign = "center";
      context.fillText("start", xAt(0), centreY + 31);
    }

    const atomX = xAt(state.atomPosition);
    const atomRadius = 10;
    const gradient = context.createRadialGradient(atomX - 3, centreY - 3, 1, atomX, centreY, atomRadius);
    gradient.addColorStop(0, "#fff3b5");
    gradient.addColorStop(0.35, "#ff922f");
    gradient.addColorStop(1, "#b3310c");
    context.fillStyle = gradient;
    context.strokeStyle = "#681d08";
    context.lineWidth = 2.2;
    context.beginPath();
    context.arc(atomX, centreY, atomRadius, 0, Math.PI * 2);
    context.fill();
    context.stroke();

    const midpoint = (state.viewMin + state.viewMax) / 2;
    context.fillStyle = "#2e2a74";
    context.font = "650 11px system-ui, sans-serif";
    context.textAlign = "center";
    [state.viewMin, midpoint, state.viewMax].forEach((position) => {
      context.fillText(String(position), xAt(position), centreY + 52);
    });
    context.font = "750 12px system-ui, sans-serif";
    context.fillText("x / a", (left + right) / 2, height - 22);

    if (state.path.length > 1) {
      const previous = state.path[state.path.length - 2];
      const direction = state.atomPosition > previous ? "HEADS → right" : "TAILS ← left";
      context.fillStyle = "#6a657c";
      context.font = "750 12px system-ui, sans-serif";
      context.textAlign = "left";
      context.fillText(`Last flip: ${direction}`, left, 30);
    }
  }

  function theoreticalEndpointCounts(steps) {
    const values = [];
    let probability = Math.pow(0.5, steps);
    for (let rightSteps = 0; rightSteps <= steps; rightSteps += 1) {
      values.push({
        position: 2 * rightSteps - steps,
        count: POPULATION * probability
      });
      if (rightSteps < steps) probability *= (steps - rightSteps) / (rightSteps + 1);
    }
    return values;
  }

  function verticalJitter(index) {
    let value = Math.imul(index + 1, 0x45d9f3b) >>> 0;
    value ^= value >>> 16;
    value = Math.imul(value, 0x45d9f3b) >>> 0;
    value ^= value >>> 16;
    return (value >>> 0) / 4294967295;
  }

  function drawEnsembleCanvas() {
    const { context, width, height } = fitCanvas(elements.ensembleCanvas);
    context.clearRect(0, 0, width, height);
    context.fillStyle = "#edf3f6";
    context.fillRect(0, 0, width, height);

    const counts = new Map();
    let observedRadius = 0;
    for (let index = 0; index < state.endpoints.length; index += 1) {
      const position = state.endpoints[index];
      counts.set(position, (counts.get(position) || 0) + 1);
      observedRadius = Math.max(observedRadius, Math.abs(position));
    }
    const baseRadius = Math.max(10, Math.ceil(4 * Math.sqrt(TARGET_STEPS) / 5) * 5);
    const radius = Math.max(baseRadius, Math.ceil(observedRadius / 5) * 5);
    const left = 54;
    const right = width - 20;
    const top = 24;
    const bottom = height - 50;
    const plotWidth = right - left;
    const plotHeight = bottom - top;
    const binWidth = plotWidth / (radius * 2 + 1);
    const xAt = (position) => left + (position + radius + 0.5) * binWidth;

    const xTicks = [-radius, -radius / 2, 0, radius / 2, radius];
    context.strokeStyle = "rgba(46, 42, 116, 0.16)";
    context.lineWidth = 1;
    xTicks.forEach((value) => {
      const x = xAt(value);
      context.beginPath();
      context.moveTo(x, top);
      context.lineTo(x, bottom);
      context.stroke();
    });

    let theoretical = [];
    let distributionYAt = null;
    if (state.showDistribution) {
      theoretical = theoreticalEndpointCounts(state.currentStep)
        .filter(({ position }) => Math.abs(position) <= radius);
      distributionYAt = (count) => bottom - Math.min(count, DISTRIBUTION_Y_MAX) / DISTRIBUTION_Y_MAX * plotHeight;
      context.font = "650 10px system-ui, sans-serif";
      context.fillStyle = "#4a465c";
      context.strokeStyle = "rgba(23, 107, 135, 0.2)";
      for (let index = 0; index <= 3; index += 1) {
        const value = DISTRIBUTION_Y_MAX * index / 3;
        const y = distributionYAt(value);
        context.beginPath();
        context.moveTo(left, y);
        context.lineTo(right, y);
        context.stroke();
        context.textAlign = "right";
        context.textBaseline = "middle";
        context.fillText(String(Math.round(value)), left - 7, y);
      }
      for (let position = -radius; position <= radius; position += 1) {
        const count = counts.get(position) || 0;
        if (count === 0) continue;
        const barWidth = Math.max(1, binWidth * 0.76);
        const x = xAt(position) - barWidth / 2;
        const y = distributionYAt(count);
        context.fillStyle = "rgba(23, 107, 135, 0.34)";
        context.strokeStyle = "rgba(4, 74, 98, 0.92)";
        context.lineWidth = 1.2;
        context.fillRect(x, y, barWidth, bottom - y);
        context.strokeRect(x, y, barWidth, bottom - y);
      }
    }

    context.fillStyle = "rgba(31, 27, 91, 0.9)";
    for (let index = 0; index < state.endpoints.length; index += 1) {
      const x = xAt(state.endpoints[index]);
      const y = top + 8 + verticalJitter(index) * Math.max(1, plotHeight - 16);
      context.fillRect(Math.round(x) - 2, Math.round(y) - 2, 4, 4);
    }

    if (state.showDistribution && theoretical.length && distributionYAt) {
      const traceTheoreticalCurve = () => {
        context.beginPath();
        theoretical.forEach(({ position, count }, index) => {
          const x = xAt(position);
          const y = distributionYAt(count);
          if (index === 0) context.moveTo(x, y);
          else context.lineTo(x, y);
        });
        context.stroke();
      };
      context.lineCap = "round";
      context.lineJoin = "round";
      context.strokeStyle = "rgba(255, 255, 255, 0.94)";
      context.lineWidth = 6;
      traceTheoreticalCurve();
      context.strokeStyle = "#b73d0c";
      context.lineWidth = 3.2;
      traceTheoreticalCurve();
      theoretical.forEach(({ position, count }) => {
        const x = xAt(position);
        const y = distributionYAt(count);
        context.fillStyle = "#b73d0c";
        context.strokeStyle = "#ffffff";
        context.lineWidth = 1.4;
        context.beginPath();
        context.arc(x, y, 3.1, 0, Math.PI * 2);
        context.fill();
        context.stroke();
      });
    }

    context.strokeStyle = "#393747";
    context.lineWidth = 1.6;
    context.beginPath();
    context.moveTo(left, top);
    context.lineTo(left, bottom);
    context.lineTo(right, bottom);
    context.stroke();

    context.fillStyle = "#2e2a74";
    context.font = "650 10px system-ui, sans-serif";
    context.textAlign = "center";
    context.textBaseline = "top";
    xTicks.forEach((value) => context.fillText(String(value), xAt(value), bottom + 8));
    context.font = "750 11px system-ui, sans-serif";
    context.fillText("x / a", (left + right) / 2, height - 16);
    context.fillStyle = "#6a657c";
    context.font = "750 11px system-ui, sans-serif";
    context.textAlign = "left";
    context.textBaseline = "top";
    context.fillText(
      state.showDistribution ? "Purple: atoms · blue bars: observed · orange curve: binomial theory" : "Each dot is one atom · vertical position is visual only",
      left,
      7
    );
    if (state.showDistribution) {
      context.save();
      context.translate(14, (top + bottom) / 2);
      context.rotate(-Math.PI / 2);
      context.textAlign = "center";
      context.fillText("Atoms per site", 0, 0);
      context.restore();
    }
  }

  function render() {
    drawAtomCanvas();
    drawEnsembleCanvas();
  }

  function updateCanvasLabels() {
    const stats = statistics();
    const countsAtOrigin = state.endpoints.reduce((count, position) => count + (position === 0 ? 1 : 0), 0);
    elements.atomCanvas.setAttribute("aria-label", `One atom at x over a equals ${state.atomPosition} after ${state.currentStep} of 100 coin-flip steps. The unbounded number-line viewport spans ${state.viewMin} to ${state.viewMax}.`);
    elements.ensembleCanvas.setAttribute(
      "aria-label",
      state.showDistribution
        ? `One thousand atom endpoints after ${state.currentStep} steps with observed count bars and the exact binomial theoretical curve overlaid. The measured mean position is ${stats.mean.toFixed(2)}, the RMS distance is ${stats.rms.toFixed(2)} lattice spacings, and ${countsAtOrigin} atoms are at the origin.`
        : `One thousand atoms shown as moving points after ${state.currentStep} steps on a one-dimensional lattice. The distribution overlay is hidden.`
    );
  }

  elements.play.addEventListener("click", start);
  elements.step.addEventListener("click", advanceOneStep);
  elements.reset.addEventListener("click", () => initialise("The 1D trial was reset to the origin."));
  elements.resample.addEventListener("click", () => {
    state.seed = (state.seed + 0x9e3779b9) >>> 0;
    initialise("A new deterministic 1D trial is ready at the origin.");
  });
  elements.distributionToggle.addEventListener("click", () => {
    state.showDistribution = !state.showDistribution;
    elements.distributionToggle.setAttribute("aria-pressed", String(state.showDistribution));
    elements.distributionToggle.textContent = state.showDistribution ? "Hide distribution" : "Show distribution";
    render();
    updateCanvasLabels();
  });

  const resizeObserver = typeof ResizeObserver === "function"
    ? new ResizeObserver(() => window.requestAnimationFrame(render))
    : null;
  if (resizeObserver) {
    resizeObserver.observe(elements.atomCanvas);
    resizeObserver.observe(elements.ensembleCanvas);
  } else {
    window.addEventListener("resize", render);
  }

  document.addEventListener("visibilitychange", () => {
    if (document.hidden && state.running) pause(true);
  });

  initialise();
})();
