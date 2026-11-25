(function () {
  "use strict";

  const { colours, format, plot, sample, controlValues, showResults, refreshOnResize } = window.MSEServiceLife;
  const lab = document.querySelector("#fatigue-lab");
  const stages = [...lab.querySelectorAll("[data-stage]")];

  // Landers and Hardrath, NACA TN 3631, Table II, p. 9. R = −1, W = 4 in, d = 0.5 in.
  // Use the measured 10–20 ksi failures for the log-life fit.
  const stressTests = [
    [10, [1994000, 2296000, 2354000, 4386000]],
    [12, [397000, 416000, 421000]],
    [15, [99000, 145000, 171000]],
    [20, [22000, 25000]]
  ].flatMap(([ksi, lives]) => lives.map(cycles => [cycles, ksi * 6.894757]));
  const stressFit = { lifeAt100MPa: 171607, exponent: -6.72524, tensileStrength: 490 };

  // Log-log fits of elastic stress amplitude and plastic strain amplitude versus
  // reversals from SAE FD&E's normalized 1045 shaft-steel tests (203 HB).
  const steel = { modulus: 203395, strength: 1231, b: -0.113, ductility: 0.423, c: -0.503 };
  const cyclicExponent = steel.b / steel.c;
  const cyclicStrength = steel.strength / steel.ductility ** cyclicExponent;

  // Hudson's Δk uses √a (eqs. 3–5). The lesson uses the equivalent √(πa) convention.
  const inchesToMetres = 0.0254;
  const hudsonIntensityScale = 0.006894757 * Math.sqrt(Math.PI * inchesToMetres);
  // NASA TN D-5390, Fig. 9(b), top-left panel. Legible R = 0 marker centres
  // digitized from the scan on the linear ksi√in and logarithmic in/cycle axes.
  const hudsonCrackRates = [
    [3.1, 1.59e-7], [3.7, 3.23e-7], [4.2, 5.75e-7], [4.3, 7.15e-7],
    [4.5, 1.11e-6], [4.8, 1.72e-6], [5.1, 2.08e-6], [5.3, 2.90e-6],
    [5.7, 3.35e-6], [5.7, 4.32e-6], [6.3, 3.87e-6], [6.4, 4.64e-6],
    [6.9, 5.71e-6], [7.2, 4.99e-6], [7.8, 6.90e-6], [8.2, 1.14e-5],
    [8.8, 1.19e-5], [9.3, 1.35e-5], [9.9, 1.16e-5], [10.0, 1.38e-5],
    [10.5, 1.57e-5], [11.0, 2.11e-5], [11.6, 2.44e-5], [11.7, 1.90e-5],
    [12.1, 2.21e-5], [12.2, 4.28e-5], [12.4, 3.09e-5], [13.1, 4.05e-5],
    [13.2, 2.95e-5], [13.8, 7.09e-5], [13.9, 4.08e-5], [14.8, 5.30e-5],
    [15.5, 9.63e-5], [15.6, 7.27e-5], [16.3, 8.55e-5], [16.7, 8.63e-5],
    [16.9, 1.34e-4], [17.2, 1.10e-4], [18.0, 1.65e-4], [18.4, 1.91e-4],
    [19.5, 2.77e-4], [19.8, 3.11e-4], [20.6, 3.59e-4], [21.8, 4.62e-4],
    [23.9, 6.81e-4], [25.7, 8.60e-4]
  ].map(([rangeKsi, rateInches]) => [rangeKsi * 1000 * hudsonIntensityScale, rateInches * inchesToMetres]);

  // Hudson's Paris coefficient from eq. 9 for 2024-T3 at R = 0.
  const crackModel = {
    coefficient: 2.14e-21 * inchesToMetres / hudsonIntensityScale ** 4,
    minIntensity: 5,
    maxIntensity: 18,
    radiusMetres: 1.8,
    thicknessMm: 1.2
  };

  function stressLife(amplitude) {
    return stressFit.lifeAt100MPa * (amplitude / 100) ** stressFit.exponent;
  }

  function stressSpectrum(amplitude, mean, heavyCycles) {
    const meanFactor = 1 - mean / stressFit.tensileStrength;
    return [
      { amplitude, cycles: 10000 - heavyCycles },
      { amplitude: 1.2 * amplitude, cycles: heavyCycles }
    ].map(bin => {
      const equivalent = bin.amplitude / meanFactor;
      const life = stressLife(equivalent);
      return { ...bin, equivalent, life, damage: bin.cycles / life };
    });
  }

  function renderStress(stage) {
    const { amplitude, mean, heavyCycles } = controlValues(stage);
    const bins = stressSpectrum(amplitude, mean, heavyCycles);
    const damage = bins.reduce((total, bin) => total + bin.damage, 0);
    const zeroMeanDamage = bins.reduce((total, bin) => total + bin.cycles / stressLife(bin.amplitude), 0);
    showResults(stage, {
      life: format(1 / damage, 1) + " shifts",
      damage: format(100 * damage, 2) + "%",
      reference: format(1 / zeroMeanDamage, 1) + " shifts",
      peak: format(mean + Math.max(...bins.filter(bin => bin.cycles).map(bin => bin.amplitude)), 1) + " MPa"
    });
    stage.querySelectorAll("[data-bin]").forEach((row, index) => {
      const bin = bins[index];
      showResults(row, {
        count: format(bin.cycles),
        amplitude: format(bin.amplitude, 1),
        equivalent: format(bin.equivalent, 1),
        life: format(bin.life),
        damage: format(bin.damage * 100, 3) + "%"
      });
    });

    plot(stage.querySelector("canvas"), {
      x: { label: "Cycles to test failure", range: [10000, 10000000], ticks: [1e4, 1e5, 1e6, 1e7], log: true },
      y: { label: "Stress amplitude (MPa)", range: [55, 150], ticks: [60, 80, 100, 120, 140], log: true },
      series: [
        { points: stressTests, colour: colours.lavender, dots: 3.5, label: "Measured failures, R = −1" },
        { points: sample(10 * 6.894757, 20 * 6.894757, 60, stress => [stressLife(stress), stress]), label: "Basquin fit" },
        { points: bins.filter(bin => bin.cycles).map(bin => [bin.life, bin.equivalent]), colour: colours.coral, dots: 6, label: "Corrected service bins" }
      ],
      probe: cycles => {
        const amplitude = 100 * (cycles / stressFit.lifeAt100MPa) ** (1 / stressFit.exponent);
        return format(cycles) + " cycles · " + (amplitude < 68.95 || amplitude > 137.90
          ? "outside the fitted stress range" : "equivalent amplitude " + format(amplitude, 1) + " MPa");
      },
      description: "Stress–life fit and measured failures, with corrected points for the active service bins. See the results table for values."
    });
  }

  function strainAtLife(cycles) {
    const elastic = steel.strength / steel.modulus * (2 * cycles) ** steel.b;
    const plastic = steel.ductility * (2 * cycles) ** steel.c;
    return { elastic, plastic, total: elastic + plastic };
  }

  function strainLife(amplitude) {
    let low = 2;
    let high = 6;
    for (let index = 0; index < 42; index++) {
      const mid = (low + high) / 2;
      if (strainAtLife(10 ** mid).total > amplitude) low = mid;
      else high = mid;
    }
    return 10 ** ((low + high) / 2);
  }

  function hysteresis(amplitude, stress) {
    const rising = sample(-stress, stress, 72, value => {
      const halfStressRange = (value + stress) / 2;
      const halfStrainRange = halfStressRange / steel.modulus + (halfStressRange / cyclicStrength) ** (1 / cyclicExponent);
      return [100 * (2 * halfStrainRange - amplitude), value];
    });
    return [...rising, ...rising.slice(1).map(([strain, value]) => [-strain, -value])];
  }

  function renderStrain(stage) {
    const { strainPercent, starts } = controlValues(stage);
    const amplitude = strainPercent / 100;
    const life = strainLife(amplitude);
    const { elastic, plastic } = strainAtLife(life);
    const stress = steel.modulus * elastic;
    showResults(stage, {
      life: format(life) + " starts",
      weeks: format(life / starts, 1) + " weeks",
      elastic: format(100 * elastic, 3) + "%",
      plastic: format(100 * plastic, 3) + "%",
      stress: format(stress, 1) + " MPa",
      share: format(100 * plastic / amplitude, 1) + "%"
    });
    plot(stage.querySelector("[data-loop]"), {
      x: { label: "Mechanical strain (%)", range: [-1.18 * strainPercent, 1.18 * strainPercent] },
      y: { label: "Stress (MPa)", range: [-1.18 * stress, 1.18 * stress] },
      series: [{ points: hysteresis(amplitude, stress), colour: colours.coral, label: "Stabilised cycle" }],
      guides: [
        { axis: "x", value: strainPercent, label: "εₐ", colour: colours.lavender },
        { axis: "y", value: stress, label: "σₐ", side: "left", colour: colours.navy }
      ],
      description: `Stabilised stress–strain loop, with strain amplitude ${format(strainPercent, 2)} percent and stress amplitude ${format(stress)} MPa.`
    });
    const strains = sample(2.7, 5.6, 85, logCycles => [10 ** logCycles, strainAtLife(10 ** logCycles)]);
    plot(stage.querySelector("[data-strain-life]"), {
      x: { label: "Cycles to test failure", range: [500, 400000], ticks: [1e3, 1e4, 1e5], log: true },
      y: { label: "Strain amplitude (%)", range: [0, 1.65] },
      series: [
        { points: strains.map(([cycles, value]) => [cycles, 100 * value.elastic]), colour: colours.lavender, dashed: true, label: "Elastic" },
        { points: strains.map(([cycles, value]) => [cycles, 100 * value.plastic]), colour: colours.coral, dashed: true, label: "Plastic" },
        { points: strains.map(([cycles, value]) => [cycles, 100 * value.total]), label: "Total strain" },
        { points: [[life, strainPercent]], colour: colours.coral, dots: 5, label: "Selected cycle" }
      ],
      probe: cycles => {
        const value = strainAtLife(cycles);
        return format(cycles) + " cycles · " + format(100 * value.total, 3) + "% total strain · "
          + format(100 * value.elastic, 3) + "% elastic + " + format(100 * value.plastic, 3) + "% plastic";
      },
      description: `Elastic and plastic strain–life terms and their sum. The selected cycle gives ${format(life)} starts to the test endpoint.`
    });
  }

  function crackGrowth(stressRange, startMm, targetMm) {
    const initial = startMm / 1000;
    const target = targetMm / 1000;
    const intensity = stressRange * Math.sqrt(Math.PI * initial);
    const fitEnd = (crackModel.maxIntensity / stressRange) ** 2 / Math.PI;
    if (initial >= target) return { flights: 0, points: [[0, startMm]], status: "reached" };
    if (intensity < crackModel.minIntensity || initial >= fitEnd) {
      return { flights: null, points: [[0, startMm]], status: "outside" };
    }

    const stop = Math.min(target, fitEnd);
    const growth = crackModel.coefficient * Math.PI ** 2 * stressRange ** 4;
    const flights = (1 / initial - 1 / stop) / growth;
    const sizeAt = count => 1000 / (1 / initial - growth * count);
    const points = sample(0, flights, 90, count => [count, sizeAt(count)]);
    return { flights, points, sizeAt, status: stop < target ? "boundary" : "target" };
  }

  function flightText(result) {
    if (result.status === "outside") return "Outside fit";
    if (result.status === "boundary") return format(result.flights) + " to fit limit";
    return format(result.flights) + " flights";
  }

  function renderCrack(stage) {
    const { pressure, initial, target, uncertainty } = controlValues(stage);
    // kPa × m / mm gives MPa; the pressure differential returns to zero each flight.
    const stress = pressure * crackModel.radiusMetres / crackModel.thicknessMm;
    const nominal = crackGrowth(stress, initial, target);
    const smaller = crackGrowth(stress, initial - uncertainty, target);
    const larger = crackGrowth(stress, initial + uncertainty, target);
    showResults(stage, {
      life: flightText(nominal),
      stress: format(stress, 1) + " MPa",
      startK: format(stress * Math.sqrt(Math.PI * initial / 1000), 2) + " MPa√m",
      endK: format(stress * Math.sqrt(Math.PI * target / 1000), 2) + " MPa√m",
      smallSize: format(initial - uncertainty, 2) + " mm",
      largeSize: format(initial + uncertainty, 2) + " mm",
      smallLife: flightText(smaller),
      largeLife: flightText(larger),
      nominalLife: flightText(nominal),
      nominalSize: format(initial, 2) + " mm"
    });
    const status = {
      target: "The nominal crack reaches the chosen assessment size inside the Paris fit window.",
      reached: "The measured flaw already reaches the chosen assessment size.",
      outside: "The starting ΔK is outside the lab’s 5–18 MPa√m fit window. Use crack-growth data for that range to estimate life.",
      boundary: "The nominal curve stops at ΔK = 18 MPa√m. The chosen assessment size requires growth data beyond this fit."
    };
    stage.querySelector(".life-status").textContent = status[nominal.status];
    const lastFlight = Math.max(...[nominal, smaller, larger].map(result => result.flights || 0), 1);
    const lastSize = Math.max(target, initial + uncertainty);
    const end = result => result.points[result.points.length - 1];
    const comparisonEnd = Math.min(smaller.flights || 0, larger.flights || 0);
    const fills = comparisonEnd > 0 && uncertainty > 0 ? [{
      bounds: [smaller, larger].map(result => sample(0, comparisonEnd, 70, count => [count, result.sizeAt(count)])),
      colour: "#e7dcf3"
    }] : [];
    plot(stage.querySelector("[data-flight]"), {
      x: { label: "Time in a flight (min)", range: [0, 120] },
      y: { label: "Cabin Δp (kPa)", range: [0, 70] },
      bands: [
        { from: 12, to: 30, label: "Climb", colour: "#f2edf8" },
        { from: 30, to: 80, label: "Cruise", colour: "#eaf1fc" },
        { from: 80, to: 103, label: "Descent", short: "Descent", colour: "#f2edf8" }
      ],
      series: [{ points: [[0, 0], [12, 0], [30, pressure], [80, pressure], [103, 0], [120, 0]], colour: colours.coral, label: "Cabin pressure differential" }],
      description: `Representative flight pressure rises from zero to ${pressure} kPa, holds in cruise, and returns to zero after descent.`
    });
    plot(stage.querySelector("[data-crack-growth]"), {
      x: { label: "Flights after inspection", range: [0, lastFlight * 1.05] },
      y: { label: "Crack half-length a (mm)", range: [0, lastSize * 1.12] },
      fills,
      guides: [{ axis: "y", value: target, label: format(target, 1) + " mm assessment size" }],
      series: [
        { points: smaller.points, colour: colours.lavender, dashed: true, label: "Inspection sizing bounds" },
        { points: larger.points, colour: colours.lavender, dashed: true },
        { points: nominal.points, label: "Measured starting flaw" },
        { points: [end(nominal)], colour: colours.coral, dots: 5.5 }
      ],
      probe: nominal.sizeAt ? count => {
        const reading = count <= nominal.flights ? "nominal half-length " + format(nominal.sizeAt(count), 2) + " mm"
          : "past the nominal prediction endpoint";
        return format(count) + " flights · " + reading;
      } : undefined,
      description: `Crack growth from the measured and bounding flaw sizes. Nominal result: ${flightText(nominal)}. ${status[nominal.status]}`
    });
  }

  function renderGrowthRegimes() {
    const { coefficient, minIntensity, maxIntensity } = crackModel;
    const low = 3;
    const high = 64;
    const parisRate = intensity => coefficient * intensity ** 4;
    // The schematic corrections and their first derivatives vanish at the joins in log(rate).
    const nearThreshold = intensity => -2 * ((minIntensity - intensity) / (minIntensity - low)) ** 2;
    const nearInstability = intensity => 1.5 * ((intensity - maxIntensity) / (high - maxIntensity)) ** 4;
    plot(document.querySelector("#growth-regimes"), {
      x: { label: "ΔK (MPa√m)", range: [low, high], ticks: [low, 5, 10, 18, 32, high], log: true },
      y: { label: "Growth rate (m/cycle)", range: [1e-12, 4e-3], ticks: [1e-12, 1e-10, 1e-8, 1e-6, 1e-4, 1e-3], log: true },
      bands: [
        { from: low, to: minIntensity, label: "Low ΔK", colour: "#f2ecfa" },
        { from: minIntensity, to: maxIntensity, label: "Paris fit window", short: "Paris fit", colour: "#eaf0fa" },
        { from: maxIntensity, to: high, label: "High ΔK", colour: "#fff0e7" }
      ],
      series: [
        {
          points: sample(low, minIntensity, 80, intensity => [intensity, parisRate(intensity) * 10 ** nearThreshold(intensity)]),
          colour: colours.lavender, dashed: true, label: "Schematic extensions"
        },
        { points: [[minIntensity, parisRate(minIntensity)], [maxIntensity, parisRate(maxIntensity)]], label: "Hudson’s Paris fit" },
        {
          points: sample(maxIntensity, high, 100, intensity => [intensity, parisRate(intensity) * 10 ** nearInstability(intensity)]),
          colour: colours.lavender, dashed: true
        },
        { points: hudsonCrackRates, colour: colours.coral, dots: 3, label: "Hudson’s R = 0 points" }
      ],
      description: "Log–log graph of the Paris fit between 5 and 18 MPa root metres and smoothly joined schematic extensions. "
        + hudsonCrackRates.length + " digitized markers show Hudson’s 2024-T3 aluminium results at R = 0."
    });
  }

  const renderStage = { stress: renderStress, strain: renderStrain, crack: renderCrack };
  function render() {
    const mode = lab.elements.mode.value;
    for (const stage of stages) stage.hidden = stage.dataset.stage !== mode;
    renderStage[mode](stages.find(stage => !stage.hidden));
  }

  for (const link of document.querySelectorAll("[data-fatigue-mode]")) {
    link.addEventListener("click", () => {
      lab.elements.mode.value = link.dataset.fatigueMode;
      render();
    });
  }
  lab.querySelector("[data-reset-crack]").addEventListener("click", event => {
    for (const input of event.currentTarget.closest("[data-stage]").querySelectorAll("input")) {
      input.value = input.defaultValue;
    }
    render();
  });
  lab.addEventListener("submit", event => event.preventDefault());
  lab.addEventListener("input", render);
  refreshOnResize([...lab.querySelectorAll("canvas"), document.querySelector("#growth-regimes")], () => {
    renderGrowthRegimes();
    render();
  });
  renderGrowthRegimes();
  render();
}());
