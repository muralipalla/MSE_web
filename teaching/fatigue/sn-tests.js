(function () {
  "use strict";

  const { colours, format, plot, controlValues, refreshOnResize } = window.MSEServiceLife;
  const builder = document.querySelector("#fatigue-coupons");
  const canvas = builder.querySelector("canvas");
  const amplitudeInput = builder.querySelector("#coupon-amplitude");
  const status = builder.querySelector(".life-status");
  const results = builder.querySelector("[data-coupon-results]");
  const table = results.querySelector("tbody");
  const headings = Array.from(results.querySelectorAll("thead th"), heading => heading.textContent);
  const fit = builder.querySelector("[data-coupon-fit]");
  const reset = builder.querySelector("[data-coupon-reset]");
  const levels = [340, 300, 260, 220, 190, 170];
  const stop = 5e6;
  const records = [];
  let regression;

  function medianLogLife(amplitude) {
    return 5 + Math.log10(280 / amplitude) / .105;
  }

  function drawResults() {
    const fractures = records.filter(test => !test.runout);
    const runoutLevels = new Set(records.filter(test => test.runout).map(test => test.amplitude));
    const series = [
      { points: fractures.map(test => [test.cycles, test.amplitude]), dots: 6, marker: "solid", colour: colours.coral, label: "Fracture" },
      { points: [...runoutLevels].map(amplitude => [stop, amplitude]), dots: 6, marker: "plus", colour: colours.navy, label: "Runout" }
    ];
    if (regression) series.unshift({ points: regression, label: "Fracture-data regression" });
    for (const amplitude of runoutLevels) {
      const tip = [stop * 1.65, amplitude];
      series.push({ points: [[stop, amplitude], tip, [stop * 1.4, amplitude + 3], tip,
        [stop * 1.4, amplitude - 3]], colour: colours.navy });
    }
    plot(canvas, {
      x: { label: "Cycles", range: [1e3, 2e7], ticks: [1e3, 1e4, 1e5, 1e6, 1e7], log: true },
      y: { label: "Stress amplitude (MPa)", range: [155, 370], ticks: [170, 200, 250, 300, 340], log: true },
      series,
      description: "Simulated S–N plot for smooth normalized SAE 1045 steel. "
        + format(fractures.length) + " fractures and " + format(records.length - fractures.length)
        + " runouts." + (regression ? " A fitted regression line is shown." : "")
        + " See specimen results for individual cycle counts."
    });
  }

  function testSpecimen(amplitude) {
    // Box–Muller draw for normal scatter in log10(cycles).
    const scatter = Math.sqrt(-2 * Math.log(1 - Math.random())) * Math.cos(2 * Math.PI * Math.random());
    const predicted = Math.max(1, Math.round(10 ** (medianLogLife(amplitude) + .08 * scatter)));
    const runout = predicted > stop;
    const cycles = Math.min(predicted, stop);
    const outcome = runout ? "Runout" : "Fracture";
    records.push({ amplitude, cycles, runout });
    const row = table.insertRow();
    const values = [records.length, amplitude, cycles, outcome];
    for (const [index, value] of values.entries()) {
      const cell = row.insertCell();
      cell.textContent = typeof value === "number" ? format(value) : value;
      cell.dataset.label = headings[index];
    }
    return outcome + " at " + format(cycles) + " cycles and " + format(amplitude) + " MPa.";
  }

  function update() {
    regression = undefined;
    const fractureLevels = new Set(records.filter(test => !test.runout).map(test => test.amplitude));
    fit.disabled = fractureLevels.size < 2;
    reset.disabled = records.length === 0;
    results.hidden = records.length === 0;
    drawResults();
  }

  builder.querySelector("[data-coupon-run]").addEventListener("click", () => {
    status.textContent = testSpecimen(Number(amplitudeInput.value));
    update();
  });
  builder.querySelector("[data-coupon-series]").addEventListener("click", () => {
    for (const level of levels) {
      for (let repeat = 0; repeat < 4; repeat++) testSpecimen(level);
    }
    status.textContent = "Added 24 specimens. " + format(records.length) + " tests plotted.";
    update();
  });
  fit.addEventListener("click", () => {
    // Regress log life on log stress because stress amplitude is the controlled input.
    const points = records.filter(test => !test.runout)
      .map(test => [Math.log10(test.amplitude / 280), Math.log10(test.cycles)]);
    const meanStress = points.reduce((sum, [stress]) => sum + stress, 0) / points.length;
    const meanLife = points.reduce((sum, [, life]) => sum + life, 0) / points.length;
    let covariance = 0;
    let stressVariance = 0;
    let lowest = Infinity;
    let highest = -Infinity;
    for (const [stress, life] of points) {
      const centredStress = stress - meanStress;
      covariance += centredStress * (life - meanLife);
      stressVariance += centredStress ** 2;
      lowest = Math.min(lowest, stress);
      highest = Math.max(highest, stress);
    }
    const slope = covariance / stressVariance;
    const intercept = meanLife - slope * meanStress;
    regression = [lowest, highest].map(stress => [10 ** (intercept + slope * stress), 280 * 10 ** stress]);
    const sign = slope < 0 ? " − " : " + ";
    status.textContent = "Fit from " + format(points.length) + " fractures. log₁₀(Nf) = "
      + format(intercept, 3) + sign + format(Math.abs(slope), 3) + " log₁₀(σa / 280 MPa).";
    drawResults();
  });
  reset.addEventListener("click", () => {
    records.length = 0;
    table.replaceChildren();
    results.removeAttribute("open");
    status.textContent = "Results cleared. Select an amplitude or run a full series.";
    update();
  });
  amplitudeInput.addEventListener("input", () => controlValues(builder));
  controlValues(builder);
  refreshOnResize([canvas], drawResults);
  update();
}());
