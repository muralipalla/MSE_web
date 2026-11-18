(() => {
  "use strict";

  const get = id => document.getElementById(id);
  const methodInputs = Array.from(document.querySelectorAll('input[name="method"]'));
  const materialInput = get("material");
  const temperatureInput = get("temperature");
  const emptyButton = get("empty-swing");
  const loadButton = get("load-bar");
  const releaseButton = get("release");
  const resetButton = get("reset-apparatus");
  const recordButton = get("record");
  const exportButton = get("export-data");
  const plot = get("result-plot");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  const methods = {
    charpy: {
      name: "Charpy",
      factor: 160,
      emptyLoss: 2,
      plotMax: 160,
      view: "Plan view · simply supported",
      fixture: "Rest the bar against two anvils, center the notch between them, and strike the face opposite the notch.",
      standard: "Metallic Charpy V-notch · ASTM E23-25 / ISO 148-1:2016"
    },
    izod: {
      name: "Izod",
      factor: 90,
      emptyLoss: 1.4,
      plotMax: 100,
      view: "Side elevation · cantilevered",
      fixture: "Clamp the lower end with the notch at the top of the vise. Strike the exposed end above the notch, on the notched side.",
      standard: "Metallic Izod V-notch · ASTM E23-25"
    }
  };

  const materials = {
    ferritic: "Ferritic steel",
    austenitic: "Austenitic stainless steel"
  };
  const releaseAngle = 150;
  const pivot = { x: 280, y: 153, radius: 150 };
  const radians = degrees => degrees * Math.PI / 180;
  const cos = degrees => Math.cos(radians(degrees));
  const formatAngle = angle => `${angle.toFixed(2)}°`;
  const formatEnergy = energy => `${energy.toFixed(1)} J`;
  const dash = "—";
  const calibrations = new Map();
  const recorded = [];
  const repeatOffsets = [0, -1.2, 1.6, -0.8, 2.2];
  let phase = "ready";
  let frameId = null;
  let result = null;
  let completedTests = 0;
  let charpyTemperature = temperatureInput.value;

  function selectedMethod() {
    return methodInputs.find(input => input.checked).value;
  }

  function selectedConditions() {
    return {
      method: selectedMethod(),
      material: materialInput.value,
      temperature: Number(temperatureInput.value)
    };
  }

  // Loss between the release and rebound poses is C(cos(beta) - cos(alpha)).
  function reboundAngle(factor, loss) {
    return Math.acos(cos(releaseAngle) + loss / factor) * 180 / Math.PI;
  }

  function lossFromAngle(factor, angle) {
    return factor * (cos(angle) - cos(releaseAngle));
  }

  function sampleEnergy({ method, material, temperature }) {
    // Synthetic steel families. Only the Charpy experiment varies temperature.
    const scatter = repeatOffsets[completedTests % repeatOffsets.length];
    if (method === "izod") {
      return (material === "ferritic" ? 61 : 84) + scatter;
    }
    if (material === "ferritic") {
      return 11 + 112 / (1 + Math.exp(-(temperature + 33) / 15)) + scatter;
    }
    return 132 + 0.12 * (temperature + 20) + scatter;
  }

  function announce(message) {
    get("machine-status").textContent = message;
  }

  function pointOnSwing(angle) {
    return {
      x: pivot.x + pivot.radius * Math.sin(radians(angle)),
      y: pivot.y + pivot.radius * cos(angle)
    };
  }

  function showAngle(angle) {
    get("pendulum-arm").setAttribute("transform", `rotate(${-angle} ${pivot.x} ${pivot.y})`);
    get("swing-angle").textContent = formatAngle(Math.abs(angle));
  }

  function showRebound(angle) {
    const track = get("rebound-track");
    const dot = get("rebound-dot");
    const point = pointOnSwing(angle);
    track.setAttribute("d", `M${pivot.x} ${pivot.y + pivot.radius}A${pivot.radius} ${pivot.radius} 0 0 0 ${point.x} ${point.y}`);
    dot.setAttribute("cx", point.x);
    dot.setAttribute("cy", point.y);
    track.removeAttribute("hidden");
    dot.removeAttribute("hidden");
  }

  function showSpecimen(pose) {
    get("mounted-bar").toggleAttribute("hidden", pose !== "loaded");
    get("fracture-pieces").toggleAttribute("hidden", pose !== "broken");
  }

  function renderReadings() {
    const method = selectedMethod();
    const baseline = calibrations.get(method);
    get("factor").textContent = `${methods[method].factor} J`;
    get("empty-angle").textContent = baseline ? formatAngle(baseline.angle) : dash;
    get("empty-loss").textContent = baseline ? formatEnergy(baseline.loss) : dash;
    get("specimen-angle").textContent = result ? formatAngle(result.angle) : dash;
    get("gross-energy").textContent = result ? formatEnergy(result.gross) : dash;
    get("absorbed-energy").textContent = result ? formatEnergy(result.absorbed) : dash;
  }

  function renderControls() {
    const busy = phase === "swinging";
    const loaded = phase === "loaded";
    const calibrated = calibrations.has(selectedMethod());
    const canRecord = !!result && !result.recorded;

    methodInputs.forEach(input => { input.disabled = busy || loaded; });
    materialInput.disabled = busy || loaded;
    temperatureInput.disabled = busy || loaded || selectedMethod() === "izod";
    emptyButton.disabled = busy || loaded;
    loadButton.disabled = busy || loaded || !calibrated;
    releaseButton.disabled = !loaded;
    resetButton.disabled = phase === "ready";
    recordButton.disabled = !canRecord;
    exportButton.disabled = recorded.length === 0;

    const next = busy ? null : loaded ? releaseButton : canRecord ? recordButton : calibrated ? loadButton : emptyButton;
    for (const button of [emptyButton, loadButton, releaseButton, recordButton]) {
      button.classList.toggle("primary", button === next);
      button.classList.toggle("secondary", button !== next);
    }
  }

  function resetDisplay() {
    if (frameId !== null) cancelAnimationFrame(frameId);
    frameId = null;
    phase = "ready";
    result = null;
    showAngle(-releaseAngle);
    showSpecimen("empty");
    get("rebound-track").setAttribute("hidden", "");
    get("rebound-dot").setAttribute("hidden", "");
    renderReadings();
    renderControls();
  }

  function updateSetting() {
    const method = selectedMethod();
    const fixture = methods[method];
    const izod = method === "izod";

    temperatureInput.value = izod ? "23" : charpyTemperature;
    get("setup-note").textContent = izod
      ? "The Izod fixture is held at room temperature (23 °C) in this lab."
      : "Vary temperature in Charpy mode to break specimens from the same steel model at different temperatures.";
    get("fixture-title").textContent = `${fixture.name} mounting`;
    get("fixture-view").textContent = fixture.view;
    get("fixture-explanation").textContent = fixture.fixture;
    get("method-standard").textContent = fixture.standard;
    get("charpy-fixture").toggleAttribute("hidden", izod);
    get("izod-fixture").toggleAttribute("hidden", !izod);
    get("charpy-supports").toggleAttribute("hidden", izod);
    get("izod-vise").toggleAttribute("hidden", !izod);
    get("second-fragment").toggleAttribute("hidden", izod);
    get("clamped-fragment").toggleAttribute("hidden", !izod);
    get("mounted-bar").setAttribute("d", izod ? "M267 295H293V345H267Z" : "M267 299H293V321H267Z");

    resetDisplay();
    announce(calibrations.has(method)
      ? "The empty-swing correction is ready. Load a specimen."
      : "Run an empty swing to measure the pendulum’s energy loss with no specimen.");
    drawPlot();
  }

  function runSwing(withSpecimen) {
    const conditions = selectedConditions();
    const machine = methods[conditions.method];
    const baseline = withSpecimen ? calibrations.get(conditions.method) : null;
    const grossLoss = withSpecimen ? baseline.loss + sampleEnergy(conditions) : machine.emptyLoss;
    const angle = reboundAngle(machine.factor, grossLoss);
    const gross = lossFromAngle(machine.factor, angle);
    const fallTime = 950;
    const riseTime = 1050;

    phase = "swinging";
    result = null;
    showAngle(-releaseAngle);
    showSpecimen(withSpecimen ? "loaded" : "empty");
    get("rebound-track").setAttribute("hidden", "");
    get("rebound-dot").setAttribute("hidden", "");
    renderReadings();
    renderControls();
    announce(withSpecimen ? "The pendulum is swinging toward the specimen." : "Measuring the empty swing.");

    function finish() {
      frameId = null;
      phase = "finished";
      showAngle(angle);
      showRebound(angle);
      if (withSpecimen) {
        showSpecimen("broken");
        completedTests += 1;
        result = {
          ...conditions, trial: completedTests, factor: machine.factor,
          emptyAngle: baseline.angle, emptyLoss: baseline.loss, angle, gross,
          absorbed: gross - baseline.loss, recorded: false
        };
        announce(`Specimen fractured. Absorbed energy: ${formatEnergy(result.absorbed)}. Record the result to add it to the plot.`);
      } else {
        calibrations.set(conditions.method, { angle, loss: gross });
        announce(`Empty-swing loss: ${formatEnergy(gross)}. Load a specimen to proceed.`);
      }
      renderReadings();
      renderControls();
    }

    if (reducedMotion.matches) {
      finish();
      return;
    }

    const start = performance.now();
    function animate(time) {
      const elapsed = Math.max(0, time - start);
      if (elapsed < fallTime) {
        showAngle(-releaseAngle * Math.cos(Math.PI / 2 * elapsed / fallTime));
      } else if (elapsed < fallTime + riseTime) {
        showAngle(angle * Math.sin(Math.PI / 2 * (elapsed - fallTime) / riseTime));
        if (withSpecimen) showSpecimen("broken");
      } else {
        finish();
        return;
      }
      frameId = requestAnimationFrame(animate);
    }
    frameId = requestAnimationFrame(animate);
  }

  function svg(name, attributes, label) {
    const element = document.createElementNS("http://www.w3.org/2000/svg", name);
    for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, value);
    if (label !== undefined) element.textContent = label;
    return element;
  }

  function drawPlot() {
    const { method, material } = selectedConditions();
    const machine = methods[method];
    const charpy = method === "charpy";
    const runs = recorded.filter(run => run.method === method && run.material === material);
    const maxTrial = Math.max(1, runs.length);
    const left = 64;
    const right = 610;
    const top = 35;
    const bottom = 215;
    const xTemperature = value => left + (value + 100) * (right - left) / 160;
    const xTrial = index => left + (index - 0.5) * (right - left) / maxTrial;
    const yFor = value => bottom - value / machine.plotMax * (bottom - top);
    const axisName = charpy ? "Temperature (°C)" : "Trial within selection";

    plot.replaceChildren();
    get("plot-caption").textContent = `${machine.name} · ${materials[material]} · ${charpy ? "Absorbed energy against temperature" : "Room-temperature repeat trials"}`;
    plot.setAttribute("aria-label", runs.length
      ? `${runs.length} recorded ${machine.name} ${runs.length === 1 ? "result" : "results"} for ${materials[material]}. Values are listed in the table below.`
      : "No recorded results for the selected method and steel model");

    const maximum = machine.plotMax;
    for (let value = 0; value <= maximum; value += maximum / 4) {
      const y = yFor(value);
      plot.append(
        svg("line", { x1: left, x2: right, y1: y, y2: y, class: "plot-grid" }),
        svg("text", { x: left - 9, y: y + 5, "text-anchor": "end", class: "plot-label" }, value)
      );
    }
    plot.append(
      svg("path", { d: `M${left} ${top}V${bottom}H${right}`, fill: "none", class: "plot-axis" }),
      svg("text", { x: left, y: 24, class: "plot-title" }, "Absorbed energy (J)"),
      svg("text", { x: (left + right) / 2, y: 263, "text-anchor": "middle", class: "plot-title" }, axisName)
    );
    const ticks = charpy ? [-100, -60, -20, 20, 60] : [];
    if (!charpy) {
      const step = Math.ceil(maxTrial / 5);
      for (let index = 1; index <= maxTrial; index += step) ticks.push(index);
    }
    for (const tick of ticks) {
      const x = charpy ? xTemperature(tick) : xTrial(tick);
      plot.append(
        svg("line", { x1: x, x2: x, y1: bottom, y2: bottom + 5, class: "plot-axis" }),
        svg("text", { x, y: bottom + 24, "text-anchor": "middle", class: "plot-label" }, String(tick).replace("-", "−"))
      );
    }
    if (!runs.length) {
      plot.append(svg("text", { x: 336, y: 126, "text-anchor": "middle", class: "plot-empty" }, "Record a result to plot it here"));
    }
    runs.forEach((run, index) => {
      const dot = svg("circle", {
        cx: charpy ? xTemperature(run.temperature) : xTrial(index + 1), cy: yFor(run.absorbed), r: 6, class: "plot-point"
      });
      dot.append(svg("title", {}, `Trial ${run.trial}: ${run.temperature} °C, ${formatEnergy(run.absorbed)}`));
      plot.append(dot);
    });
  }

  function recordResult() {
    result.recorded = true;
    recorded.push(result);
    const row = document.createElement("tr");
    const values = [
      result.trial, methods[result.method].name, materials[result.material], result.temperature,
      result.emptyAngle.toFixed(2), result.angle.toFixed(2), result.absorbed.toFixed(1)
    ];
    for (const value of values) {
      const cell = document.createElement("td");
      cell.textContent = value;
      row.append(cell);
    }
    get("recorded-runs").append(row);
    get("table-empty").hidden = true;
    get("table-wrap").hidden = false;
    announce(`Trial ${result.trial} recorded. Load a fresh specimen to repeat the test.`);
    renderControls();
    drawPlot();
  }

  function downloadCsv() {
    const headings = [
      "Trial", "Method", "Steel model", "Temperature (C)", "Pendulum factor (J)", "Release angle (deg)",
      "Empty rebound (deg)", "Specimen rebound (deg)", "Gross energy loss (J)", "Empty-swing loss (J)", "Absorbed energy (J)"
    ];
    const rows = recorded.map(run => [
      run.trial, methods[run.method].name, materials[run.material], run.temperature, run.factor, releaseAngle,
      run.emptyAngle.toFixed(2), run.angle.toFixed(2), run.gross.toFixed(2), run.emptyLoss.toFixed(2), run.absorbed.toFixed(2)
    ]);
    const csv = [headings, ...rows].map(row => row.join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "charpy-izod-results.csv";
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  methodInputs.forEach(input => input.addEventListener("change", updateSetting));
  materialInput.addEventListener("change", updateSetting);
  temperatureInput.addEventListener("change", () => {
    charpyTemperature = temperatureInput.value;
    updateSetting();
  });
  emptyButton.addEventListener("click", () => runSwing(false));
  loadButton.addEventListener("click", () => {
    resetDisplay();
    phase = "loaded";
    showSpecimen("loaded");
    announce("Specimen mounted. Release the pendulum.");
    renderControls();
  });
  releaseButton.addEventListener("click", () => runSwing(true));
  resetButton.addEventListener("click", updateSetting);
  recordButton.addEventListener("click", recordResult);
  exportButton.addEventListener("click", downloadCsv);

  updateSetting();
})();
