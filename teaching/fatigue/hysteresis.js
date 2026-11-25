(function () {
  "use strict";

  const { colours, format, plot, controlValues, showResults, refreshOnResize } = window.MSEServiceLife;
  const demo = document.querySelector("#hysteresis-demo");
  const canvas = demo.querySelector("#cyclic-response");
  const settings = demo.querySelector("fieldset");
  const modelSelect = demo.querySelector("#hysteresis-model");
  const compareToggle = demo.querySelector("[data-hysteresis-compare]");
  const compareResults = demo.querySelector("[data-hysteresis-comparison]");
  const singleReadouts = demo.querySelectorAll("[data-hysteresis-single], [data-result='stress']");
  const play = demo.querySelector("[data-hysteresis-play]");
  const step = demo.querySelector("[data-hysteresis-step]");
  const reset = demo.querySelector("[data-hysteresis-reset]");
  const elasticModulus = 200000;
  const initialYield = 250;
  const flowStressScale = 85;
  const integrationStep = 0.00002;
  const samplesPerBranch = 128;
  const branchDurationMs = 1230;
  const models = {
    perfect: { isotropic: 0, kinematic: 0, note: "Plastic flow leaves the centre and width of the yield interval fixed." },
    isotropic: { isotropic: 120, kinematic: 0, note: "Accumulated plastic strain widens the yield interval equally in tension and compression." },
    kinematic: { isotropic: 0, kinematic: 120, note: "Tensile prestrain shifts the yield interval toward tension. Compression yields at a smaller stress magnitude. This is the Bauschinger effect." },
    combined: { isotropic: 40, kinematic: 80, note: "Plastic strain both shifts and widens the yield interval. The two changes compete at the first reversal." }
  };
  const overlayStyles = [
    { model: "kinematic", label: "Kinematic", colour: colours.coral, dashed: false },
    { model: "isotropic", label: "Isotropic", colour: colours.navy, dashed: true }
  ];
  let runs;
  let yieldReadout;
  let stressAxis;
  let index = 0;
  let frame = null;

  function hardening(strain) {
    return (1 + strain / 0.002) ** 0.4 - 1;
  }

  function stateAt(material, strain, plastic, accumulated) {
    const stress = elasticModulus * (strain - plastic);
    const centre = material.kinematic * Math.sign(plastic) * hardening(Math.abs(plastic));
    const radius = initialYield + material.isotropic * hardening(accumulated);
    const effectiveStress = stress - centre;
    // Perzyna flow with reference rate equal to the prescribed absolute total-strain rate.
    const overstress = Math.max(0, Math.abs(effectiveStress) - radius);
    const flow = Math.sign(effectiveStress) * (overstress / flowStressScale) ** 3;
    return { strain, stress, plastic, accumulated, centre, radius, flow };
  }

  function advance(material, state, target) {
    const start = state.strain;
    const substeps = Math.max(1, Math.ceil(Math.abs(target - start) / integrationStep));
    const increment = (target - start) / substeps;
    const pathStep = Math.abs(increment);
    for (let i = 1; i <= substeps; i++) {
      const strain = i === substeps ? target : start + i * increment;
      // Explicit trapezoidal integration along the imposed strain path.
      const prediction = stateAt(material, strain, state.plastic + pathStep * state.flow,
        state.accumulated + pathStep * Math.abs(state.flow));
      state = stateAt(material, strain, state.plastic + pathStep * (state.flow + prediction.flow) / 2,
        state.accumulated + pathStep * (Math.abs(state.flow) + Math.abs(prediction.flow)) / 2);
    }
    return state;
  }

  function buildBranches(material, amplitude, cycles) {
    let current = stateAt(material, 0, 0, 0);
    return Array.from({ length: 2 * cycles + 1 }, (_, number) => {
      const target = number % 2 ? -amplitude : amplitude;
      const start = current.strain;
      const states = [current];
      for (let i = 1; i <= samplesPerBranch; i++) {
        const strain = i === samplesPerBranch ? target : start + (target - start) * i / samplesPerBranch;
        current = advance(material, current, strain);
        states.push(current);
      }
      return { states, points: states.map(state => [100 * state.strain, state.stress]), increasing: target > start };
    });
  }

  function findReverseYield(states) {
    // A prior tensile plastic excursion is necessary for a meaningful reversal comparison.
    if (states[0].plastic <= 1e-8) return null;
    const sample = states.findIndex(state => state.stress <= state.centre - state.radius);
    if (sample < 1) return null;
    const before = states[sample - 1];
    const after = states[sample];
    const clearance = before.stress - (before.centre - before.radius);
    const excess = after.centre - after.radius - after.stress;
    const fraction = clearance / (clearance + excess);
    const centre = before.centre + (after.centre - before.centre) * fraction;
    const radius = before.radius + (after.radius - before.radius) * fraction;
    const strain = before.strain + (after.strain - before.strain) * fraction;
    return { sample, centre, radius, point: [100 * strain, centre - radius] };
  }

  function asStress(value, explicitSign = false) {
    const rounded = Math.abs(value) < .05 ? 0 : value;
    return (explicitSign && rounded > 0 ? "+" : "") + format(rounded, 1).replace("-", "−") + " MPa";
  }

  function summarizeYieldLimits({ branches, firstReverse }) {
    const state = firstReverse || branches[1].states.at(-1);
    const compressionLimit = state.centre - state.radius;
    const tensionLimit = state.centre + state.radius;
    const difference = initialYield - Math.abs(compressionLimit);
    let note = "The first reversal has the same yield limits as the virgin material (±250 MPa).";
    if (!firstReverse) {
      note = "The first reversal stays inside the compression yield limit at this strain amplitude.";
    } else if (difference > .05) {
      note = "After tensile prestrain, compression starts to yield " + asStress(difference)
        + " closer to zero than the virgin limit of −250 MPa.";
    } else if (difference < -.05) {
      note = "After tensile prestrain, compression requires " + asStress(-difference)
        + " more stress magnitude than the virgin limit of −250 MPa.";
    }
    return { compressionLimit: asStress(compressionLimit), tensionLimit: asStress(tensionLimit, true), reverse: note };
  }

  function summarizeComparison([kinematic, isotropic]) {
    const kinematicYield = kinematic.firstReverse;
    const isotropicYield = isotropic.firstReverse;
    return {
      kinematicLimit: kinematicYield ? asStress(kinematicYield.point[1]) : "Not reached",
      isotropicLimit: isotropicYield ? asStress(isotropicYield.point[1]) : "Not reached",
      reverse: kinematicYield || isotropicYield
        ? "The circles mark the first compressive yield for each model after the same tensile prestrain. Virgin compression yields at −250 MPa."
        : "Both runs stay inside their compressive yield limits on the first reversal."
    };
  }

  function updateButtons() {
    const complete = index === runs[0].branches.length * samplesPerBranch;
    play.textContent = frame !== null ? "Pause cycles" : complete ? "Replay cycles" : "Play cycles";
    step.disabled = complete;
  }

  function draw() {
    const { branches, model } = runs[0];
    const comparing = runs.length > 1;
    const activeBranch = Math.max(0, Math.ceil(index / samplesPerBranch) - 1);
    const activeSample = index - activeBranch * samplesPerBranch;
    const current = branches[activeBranch].states[activeSample];
    const series = runs.flatMap(run => run.branches.map((branch, number) => ({
      points: number < activeBranch ? branch.points : number === activeBranch ? branch.points.slice(0, activeSample + 1) : [],
      colour: run.colour || (branch.increasing ? colours.navy : colours.coral),
      dashed: run.dashed,
      label: comparing ? (number === 0 ? run.label : undefined) : ["Strain increasing", "Strain decreasing"][number]
    })));
    for (const run of runs) {
      const { firstReverse } = run;
      const reached = firstReverse && index >= samplesPerBranch + firstReverse.sample;
      series.push(
        { points: reached ? [firstReverse.point] : [], colour: run.colour || colours.lavender,
          dots: comparing ? 6 : 5, label: comparing ? undefined : "First reverse yield" },
        { points: [run.branches[activeBranch].points[activeSample]], colour: run.colour || colours.ink, dots: 4 }
      );
    }
    const phase = index === 0 ? "Ready to load" : activeBranch === 0 ? "Initial tensile loading"
      : branches[activeBranch].increasing ? "Strain increasing" : "Strain decreasing";
    const requestedCycles = (branches.length - 1) / 2;
    const completedCycles = Math.max(0, Math.floor((index - samplesPerBranch) / (2 * samplesPerBranch)));
    showResults(demo, {
      ...yieldReadout,
      phase: index === 0 || comparing ? phase : phase + (Math.abs(current.flow) > 1e-8 ? " · Plastic flow" : " · Elastic"),
      strain: format(100 * current.strain, 3).replace("-", "−") + "%",
      stress: asStress(current.stress), centre: asStress(current.centre), radius: asStress(current.radius),
      cycleCount: "Cycles " + completedCycles + " / " + requestedCycles,
      modelNote: comparing
        ? "Both models use the same strain history. Isotropic hardening widens the yield interval. Kinematic hardening shifts it."
        : models[model].note
    });
    plot(canvas, {
      x: { label: "Total strain (%)", range: [-1.1, 1.1], ticks: [-1, -.5, 0, .5, 1] },
      y: stressAxis,
      guides: [
        { axis: "y", value: -initialYield, label: "Virgin compression yield", side: "left", colour: colours.muted },
        { axis: "y", value: initialYield, colour: colours.muted }
      ],
      series,
      description: comparing
        ? "Kinematic and isotropic power-law hardening under identical strain cycles. Circles matching each curve mark first reverse compression yield."
        : "Power-law stress–strain response for " + modelSelect.selectedOptions[0].textContent
          + ". The purple marker shows the first reverse compression yield following tensile prestrain."
    });
    updateButtons();
  }

  function pause() {
    if (frame !== null) cancelAnimationFrame(frame);
    frame = null;
  }

  play.addEventListener("click", () => {
    if (frame !== null) {
      pause();
      updateButtons();
      return;
    }
    const end = runs[0].branches.length * samplesPerBranch;
    if (index === end) index = 0;
    const from = index;
    let startTime;
    function animate(time) {
      startTime ??= time;
      const next = Math.min(end, from + Math.floor((time - startTime) * samplesPerBranch / branchDurationMs));
      frame = next < end ? requestAnimationFrame(animate) : null;
      if (index !== next) {
        index = next;
        draw();
      }
    }
    frame = requestAnimationFrame(animate);
    draw();
  });
  step.addEventListener("click", () => {
    pause();
    index = (Math.floor(index / samplesPerBranch) + 1) * samplesPerBranch;
    draw();
  });
  reset.addEventListener("click", () => {
    pause();
    index = 0;
    draw();
  });
  settings.addEventListener("input", setConditions);
  compareToggle.addEventListener("change", setConditions);
  refreshOnResize([canvas], draw);

  function setConditions() {
    pause();
    const { amplitude, cycles } = controlValues(demo);
    const comparing = compareToggle.checked;
    const styles = comparing ? overlayStyles : [{ model: modelSelect.value }];
    runs = styles.map(style => {
      const branches = buildBranches(models[style.model], amplitude / 100, cycles);
      return { ...style, branches, firstReverse: findReverseYield(branches[1].states) };
    });
    yieldReadout = comparing ? summarizeComparison(runs) : summarizeYieldLimits(runs[0]);
    compareResults.hidden = !comparing;
    for (const readout of singleReadouts) readout.hidden = comparing;
    modelSelect.disabled = comparing;
    // Frame the full run up front, including the higher stresses of long isotropic tests.
    let peak = 0;
    for (const run of runs) {
      for (const branch of run.branches) {
        for (const state of branch.states) peak = Math.max(peak, Math.abs(state.stress));
      }
    }
    const limit = peak <= 550 ? 600 : Math.ceil((peak + 50) / 250) * 250;
    const spacing = limit > 1100 ? 500 : limit > 600 ? 250 : 200;
    const intervals = Math.floor(limit / spacing);
    stressAxis = {
      label: "Stress (MPa)", range: [-limit, limit],
      ticks: Array.from({ length: 2 * intervals + 1 }, (_, number) => (number - intervals) * spacing)
    };
    // Open the comparison at one complete cycle so the two first-reversal markers are in view.
    index = comparing ? 3 * samplesPerBranch : 0;
    draw();
  }

  setConditions();
}());
