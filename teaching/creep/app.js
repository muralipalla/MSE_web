(function () {
  "use strict";

  const { colours, format, plot, markPlot, canvasSurface, sample, controlValues, showResults, refreshOnResize } = window.MSEServiceLife;
  const lab = document.querySelector("#creep-lab");
  const transitionHours = 0.25;

  // Sawada et al. (2024), NCF718-B. Orr–Sherby–Dorn regressions in Tables 6 and 8.
  // The source uses log10, hours, MPa, percent strain per hour, and 2.3 R T.
  function materialAt(stress, temperature) {
    const logStress = Math.log10(stress);
    const thermal = 2.3 * 8.314 * (temperature + 273.15);
    const logRupture = 408807.29 / thermal + 0.27875471 - 0.010264377 * stress
      - 16.558838 * logStress + 4.0583919 * logStress ** 2;
    const logRate = -465583.01 / thermal - 10.414533 + 0.015770086 * stress
      + 30.352219 * logStress - 7.7331365 * logStress ** 2;
    return { rate: 10 ** logRate, rupture: 10 ** logRupture };
  }

  function dutyCycle({ temperature, stress, runHours, excursionMinutes }) {
    const excursionHours = excursionMinutes / 60;
    const phases = [
      { time: transitionHours, temperature: temperature + 20, stress: stress + 50 },
      { time: runHours - transitionHours - excursionHours, temperature, stress },
      { time: excursionHours, temperature: temperature + 35, stress }
    ].filter(phase => phase.time > 0).map(phase => {
      const { rate, rupture } = materialAt(phase.stress, phase.temperature);
      return { ...phase, rate, rupture };
    });
    return {
      phases,
      runHours,
      strainPerRun: phases.reduce((total, phase) => total + phase.time * phase.rate, 0),
      fractionPerRun: phases.reduce((total, phase) => total + phase.time / phase.rupture, 0)
    };
  }

  function exposureAt(duty, hours) {
    const fullRuns = Math.floor(hours / duty.runHours);
    let remaining = hours - fullRuns * duty.runHours;
    let strain = fullRuns * duty.strainPerRun;
    let fraction = fullRuns * duty.fractionPerRun;
    for (const phase of duty.phases) {
      const time = Math.min(remaining, phase.time);
      strain += time * phase.rate;
      fraction += time / phase.rupture;
      remaining -= time;
    }
    return { strain, fraction };
  }

  function timeTo(duty, target, perRun, rateOf) {
    const fullRuns = Math.floor(target / perRun);
    let hours = fullRuns * duty.runHours;
    let remaining = target - fullRuns * perRun;
    for (const phase of duty.phases) {
      const rate = rateOf(phase);
      const time = Math.min(phase.time, remaining / rate);
      hours += time;
      remaining = Math.max(0, remaining - time * rate);
    }
    return hours;
  }

  function renderTable(duty) {
    const rows = lab.querySelectorAll("[data-phase]");
    rows.forEach((row, index) => {
      const phase = duty.phases[index];
      row.hidden = !phase;
      if (!phase) return;
      showResults(row, {
        time: format(phase.time, 2),
        temperature: format(phase.temperature),
        stress: format(phase.stress),
        rate: phase.rate.toExponential(2),
        rupture: format(phase.rupture),
        strain: format(phase.rate * phase.time, 5),
        fraction: (phase.time / phase.rupture).toExponential(2)
      });
    });
  }

  function renderDutyPlot(duty) {
    let elapsed = 0;
    const temperatures = duty.phases.flatMap(phase => {
      const start = elapsed;
      elapsed += phase.time;
      return [[start, phase.temperature], [elapsed, phase.temperature]];
    });
    plot(lab.querySelector("[data-duty]"), {
      x: { label: "Hot hours in one run", range: [0, duty.runHours] },
      y: { label: "Metal temperature (°C)", range: [615, 705] },
      series: [{ points: temperatures, colour: colours.coral, label: "Local metal temperature" }],
      description: "Metal temperature in the hot transition, the rated dwell and any overtemperature period. Values are listed in the model table."
    });
  }

  function renderHistory(duty, hours, strainLimit, strainTime, ruptureTime) {
    const firstLimit = Math.min(strainTime, ruptureTime);
    const loggedEnd = Math.min(hours, ruptureTime);
    const forecastEnd = Math.min(ruptureTime, Math.max(loggedEnd, firstLimit * 1.035));
    const chartEnd = forecastEnd * 1.06;
    const project = (start, end) => sample(start, end, 110, hour => [hour, exposureAt(duty, hour)]);
    const logged = project(0, loggedEnd);
    const future = forecastEnd > loggedEnd ? project(loggedEnd, forecastEnd) : [];
    const strain = ([hour, value]) => [hour, 100 * value.strain / strainLimit];
    const fraction = ([hour, value]) => [hour, 100 * Math.min(value.fraction, 1)];
    const last = exposureAt(duty, forecastEnd);
    plot(lab.querySelector("[data-creep-forecast]"), {
      x: { label: "Hot operating hours since new", range: [0, chartEnd] },
      y: { label: "Share of limit (%)", range: [0, Math.max(119, 112 * last.strain / strainLimit)] },
      series: [
        { points: logged.map(strain), label: "Creep strain / allowance" },
        { points: logged.map(fraction), colour: colours.lavender, label: "Rupture fraction" },
        { points: future.map(strain), dashed: true },
        { points: future.map(fraction), colour: colours.lavender, dashed: true },
        { points: [[firstLimit, 100]], colour: colours.coral, dots: 6 }
      ],
      guides: [
        { axis: "y", value: 100, label: "100% of limit", side: "left" },
        { axis: "x", value: firstLimit, label: "First limit · " + format(firstLimit) + " h" },
        { axis: "x", value: loggedEnd, label: "Log · " + format(loggedEnd) + " h", colour: colours.lavender }
      ],
      probe: hour => {
        if (hour > forecastEnd) return format(hour) + " hot hours · past the plotted prediction";
        const value = exposureAt(duty, hour);
        return format(hour) + " hot hours · " + format(value.strain, 3) + "% creep strain · "
          + format(100 * Math.min(value.fraction, 1), 1) + "% of rupture life consumed";
      },
      description: "The two cumulative histories are shown as percentages of their own limits. The first reaches 100 percent at "
        + format(firstLimit) + " hot hours."
    });
  }

  function renderLab() {
    const { loggedHours, limit, ...settings } = controlValues(lab);
    const duty = dutyCycle(settings);
    const strainTime = timeTo(duty, limit, duty.strainPerRun, phase => phase.rate);
    const ruptureTime = timeTo(duty, 1, duty.fractionPerRun, phase => 1 / phase.rupture);
    const strainFirst = strainTime <= ruptureTime;
    const firstLimit = Math.min(strainTime, ruptureTime);
    const elapsed = Math.min(loggedHours, ruptureTime);
    const current = exposureAt(duty, elapsed);
    const starts = Math.ceil(elapsed / duty.runHours);
    const ratedDwell = duty.phases[1].time;
    showResults(lab.querySelector(".life-stage"), {
      remaining: format(Math.max(0, firstLimit - loggedHours), 1) + " h",
      strainLife: strainFirst ? format(strainTime, 1) + " h" : "After rupture",
      ruptureLife: format(ruptureTime, 1) + " h",
      activeLimit: strainFirst ? "Strain limit" : "Rupture estimate",
      strain: format(current.strain, 3) + "%",
      fraction: format(Math.min(1, current.fraction) * 100, 1) + "%",
      schedule: `${format(ratedDwell, 2)} h rated dwell per run · ${format(starts)} starts in ${format(elapsed, 1)} displayed hot hours.`
    });
    lab.querySelector(".life-status").textContent = loggedHours >= ruptureTime
      ? "The selected record reaches modelled rupture. Accumulation curves end at that point."
      : `From new, the first limit occurs at ${format(firstLimit, 1)} hot hours. Remaining time is measured from the end of the selected log.`;
    for (const button of lab.querySelectorAll("[data-run-hours]")) {
      button.setAttribute("aria-pressed", Number(button.dataset.runHours) === duty.runHours);
    }
    renderTable(duty);
    renderDutyPlot(duty);
    renderHistory(duty, loggedHours, limit, strainTime, ruptureTime);
  }

  // An illustrative linear relaxation model for comparing two closed teaching loops.
  function relaxationLoop(dwell) {
    const relaxationTime = 4;
    const modulus = 160000;
    const phases = [
      { start: -0.002, end: 0.002, duration: 1 },
      { start: 0.002, end: 0.002, duration: dwell },
      { start: 0.002, end: -0.002, duration: 1 }
    ].filter(phase => phase.duration).map(phase => ({ ...phase, ramp: (phase.end - phase.start) / phase.duration }));
    function stressAt(initial, ramp, time) {
      const equilibrium = modulus * ramp * relaxationTime;
      return equilibrium + (initial - equilibrium) * Math.exp(-time / relaxationTime);
    }
    const drivenStress = phases.reduce((initial, phase) => stressAt(initial, phase.ramp, phase.duration), 0);
    let stress = drivenStress / (1 - Math.exp(-(2 + dwell) / relaxationTime));
    return phases.flatMap(phase => {
      const curve = sample(0, phase.duration, 30, time => [
        100 * (phase.start + phase.ramp * time),
        stressAt(stress, phase.ramp, time)
      ]);
      stress = curve[curve.length - 1][1];
      return curve;
    });
  }

  function renderDwellLoops() {
    plot(document.querySelector("#dwell-loops"), {
      x: { label: "Mechanical strain (%)", range: [-0.25, 0.25] },
      y: { label: "Stress (MPa)", range: [-550, 450] },
      series: [
        { points: relaxationLoop(0), dashed: true, label: "Continuous cycle" },
        { points: relaxationLoop(2), colour: colours.coral, label: "Tensile hold" }
      ],
      guides: [{ axis: "x", value: 0.2, label: "Fixed strain" }]
    });
  }

  const test = document.querySelector("#furnace");
  const testRig = test.querySelector("[data-creep-rig]");
  const furnaceCanvas = test.querySelector("[data-creep-3d]");
  const furnaceHint = test.querySelector("#furnace-orbit");
  const toggleView = test.querySelector("[data-creep-view]");
  const renderFurnace = window.createCreepFurnaceView?.(furnaceCanvas);
  const testCurve = test.querySelector("[data-creep-curve]");
  const playTest = test.querySelector("[data-creep-play]");
  const playbackSpeed = test.querySelector("#furnace-speed");
  let specimen;
  let progress = 0;
  let testRunning = false;
  let testFrame;
  let previousFrame;

  function showFurnace(show3D) {
    furnaceCanvas.hidden = !show3D;
    testRig.hidden = show3D;
    furnaceHint.hidden = !show3D;
    toggleView.textContent = show3D ? "Show schematic" : "Show 3D view";
  }

  if (renderFurnace) {
    showFurnace(true);
    toggleView.hidden = false;
    toggleView.addEventListener("click", () => {
      showFurnace(furnaceCanvas.hidden);
      renderTestMotion();
    });
    furnaceCanvas.addEventListener("webglcontextlost", () => {
      showFurnace(false);
      toggleView.hidden = true;
      renderTestMotion();
    });
  }

  function testModel(temperature, stress) {
    const { rate, rupture } = materialAt(stress, temperature);
    const elastic = 100 * stress / 165000;
    const primaryEnd = 0.24;
    const tertiaryStart = 0.69;
    const strainAt = time => {
      const fraction = time / rupture;
      const early = 0.17 * (1 - Math.max(0, 1 - fraction / primaryEnd) ** 3);
      const late = 0.78 * (Math.max(0, fraction - tertiaryStart) / (1 - tertiaryStart)) ** 3;
      return elastic + rate * rupture * (early + fraction + late);
    };
    return { temperature, stress, rupture, rate, elastic, primaryEnd, tertiaryStart, strainAt };
  }

  function drawFurnace(strain) {
    const surface = canvasSurface(testRig);
    if (!surface) return;
    const { context: c, width, height } = surface;
    const background = c.createLinearGradient(0, 0, width, height);
    background.addColorStop(0, "#311b48");
    background.addColorStop(1, "#171831");
    c.fillStyle = background;
    c.fillRect(0, 0, width, height);
    const scale = Math.min(width / 440, height / 302);
    c.save();
    c.translate((width - 440 * scale) / 2, (height - 302 * scale) / 2);
    c.scale(scale, scale);
    const extension = Math.min(25, strain * 16);
    const glow = c.createRadialGradient(189, 143, 5, 189, 143, 107);
    glow.addColorStop(0, specimen.temperature >= 647 ? "#ef6a3a" : "#d84f35");
    glow.addColorStop(.66, "#8e3445");
    glow.addColorStop(1, "#492a4f");
    c.fillStyle = "#715276";
    c.fillRect(101, 63, 177, 154);
    c.fillStyle = glow;
    c.fillRect(109, 70, 162, 140);
    for (const x of [121, 259]) {
      c.strokeStyle = "#f9ad6c";
      c.lineWidth = 3;
      c.beginPath();
      for (let i = 0; i <= 9; i++) {
        const nextX = x + (i % 2 ? 8 : -3);
        const nextY = 91 + i * 11.5;
        if (i === 0) c.moveTo(nextX, nextY);
        else c.lineTo(nextX, nextY);
      }
      c.stroke();
    }
    c.fillStyle = "#857bb3";
    c.fillRect(147, 26, 85, 8);
    c.fillRect(182, 34, 18, 47);
    const metal = c.createLinearGradient(173, 0, 205, 0);
    metal.addColorStop(0, "#8885b0");
    metal.addColorStop(.55, "#f7edff");
    metal.addColorStop(1, "#81789e");
    c.fillStyle = metal;
    c.beginPath();
    c.moveTo(175, 77);
    c.lineTo(206, 77);
    c.lineTo(206, 98);
    c.lineTo(197, 107);
    c.lineTo(197, 164 + extension);
    c.lineTo(206, 174 + extension);
    c.lineTo(206, 196 + extension);
    c.lineTo(175, 196 + extension);
    c.lineTo(175, 174 + extension);
    c.lineTo(184, 164 + extension);
    c.lineTo(184, 107);
    c.lineTo(175, 98);
    c.closePath();
    c.fill();
    if (progress >= 1) {
      c.fillStyle = glow;
      c.beginPath();
      c.moveTo(183, 138);
      c.lineTo(190, 140);
      c.lineTo(198, 137);
      c.lineTo(198, 144);
      c.lineTo(191, 146);
      c.lineTo(183, 144);
      c.fill();
    }
    c.fillStyle = "#9287b9";
    c.fillRect(186, 196 + extension, 9, 25);
    c.fillStyle = "#676088";
    c.fillRect(162, 221 + extension, 57, 21);
    c.fillStyle = "#aa9dd7";
    c.fillRect(163, 222 + extension, 55, 4);
    c.strokeStyle = "#ffe092";
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(197, 110);
    c.lineTo(220, 110);
    c.lineTo(220, 162 + extension);
    c.lineTo(197, 162 + extension);
    c.stroke();
    c.font = "700 15px system-ui";
    c.fillStyle = "#ffc797";
    c.fillText(specimen.temperature + " °C", 295, 106);
    c.fillStyle = "#e7deff";
    c.font = "650 14px system-ui";
    c.fillText("Furnace", 295, 128);
    c.fillText("Gauge length", 295, 161);
    c.fillText("Fixed load", 232, 238 + extension);
    c.restore();
  }

  function renderTestMotion() {
    const hour = progress * specimen.rupture;
    const strain = specimen.strainAt(hour);
    const ruptured = progress >= 1;
    const phase = ruptured ? "Rupture" : progress >= specimen.tertiaryStart ? "Tertiary creep"
      : progress >= specimen.primaryEnd ? "Minimum-rate interval" : progress > 0 ? "Primary creep" : "Elastic extension";
    showResults(test.querySelector(".life-live-state"), {
      time: format(hour) + " h",
      strain: format(strain, 3) + "%",
      phase
    });
    if (furnaceCanvas.hidden) drawFurnace(strain);
    else renderFurnace(strain, specimen.temperature, specimen.stress, ruptured);
    markPlot(testCurve, [hour, strain], "#a56100");
  }

  function renderTest() {
    const { testTemperature, testStress } = controlValues(test);
    specimen = testModel(testTemperature, testStress);
    const { rupture, strainAt, elastic, rate, primaryEnd, tertiaryStart } = specimen;
    const alternate = test.querySelector("[data-hotter]").checked ? testModel(testTemperature + 15, testStress) : null;
    const target = elastic + 0.5;
    const stages = [
      { from: 0, to: primaryEnd, label: "Primary", short: "I", colour: "#eee8fa" },
      { from: primaryEnd, to: tertiaryStart, label: "Minimum-rate interval", short: "Min. rate", colour: "#e6effa" },
      { from: tertiaryStart, to: 1, label: "Tertiary", short: "III", colour: "#ffeadc" }
    ];
    const series = [{
      points: [[0, 0], ...sample(0, rupture, 126, hour => [hour, strainAt(hour)])], label: testTemperature + " °C reference specimen"
    }];
    if (alternate) {
      series.push({
        points: [[0, 0], ...sample(0, alternate.rupture, 105, hour => [hour, alternate.strainAt(hour)])],
        colour: colours.coral, dashed: true, label: alternate.temperature + " °C · same stress"
      });
    }
    series.push({ points: [[rupture, strainAt(rupture)]], colour: colours.coral, dots: 5, label: "Reference rupture" });
    plot(testCurve, {
      x: { label: "Hours since loading", range: [0, rupture * 1.06] },
      y: { label: "Total strain (%)", range: [0, 1.15 * Math.max(strainAt(rupture), alternate?.strainAt(alternate.rupture) || 0, target)] },
      series,
      bands: stages.map(stage => ({ ...stage, from: stage.from * rupture, to: stage.to * rupture })),
      guides: [
        { axis: "y", value: target, label: "0.5% creep + elastic", side: "left" },
        { axis: "y", value: elastic, label: "Elastic jump", side: "left", colour: colours.lavender }
      ],
      probe: hour => format(hour) + " h · " + (hour <= rupture
        ? "reference strain " + format(strainAt(hour), 3) + "%" : "past reference rupture"),
      description: "Illustrative creep stages at " + testTemperature + " degrees Celsius. The immediate elastic strain is "
        + format(elastic, 3) + " percent. The minimum rate and rupture time use a fit to Alloy 718 tests."
    });
    showResults(test.querySelector(".life-cycle-values"), {
      elastic: format(elastic, 3) + "%",
      rate: rate.toExponential(2) + " %/h",
      rupture: format(rupture, 1) + " h"
    });
    renderTestMotion();
  }

  function animateTest(time) {
    if (!testRunning) return;
    if (previousFrame === undefined) previousFrame = time;
    if (time - previousFrame >= 26) {
      const elapsed = Math.min(time - previousFrame, 64);
      progress = Math.min(1, progress + elapsed * Number(playbackSpeed.value) / 5900);
      previousFrame = time;
      renderTestMotion();
      if (progress === 1) {
        stopTest();
        return;
      }
    }
    testFrame = requestAnimationFrame(animateTest);
  }

  function stopTest() {
    testRunning = false;
    cancelAnimationFrame(testFrame);
    playTest.textContent = progress >= 1 ? "Replay test" : progress > 0 ? "Resume test" : "Start test";
  }

  playTest.addEventListener("click", () => {
    if (testRunning) {
      stopTest();
      return;
    }
    if (progress >= 1) progress = 0;
    testRunning = true;
    previousFrame = undefined;
    playTest.textContent = "Pause test";
    testFrame = requestAnimationFrame(animateTest);
  });
  test.querySelector("[data-creep-step]").addEventListener("click", () => {
    const checkpoints = [0.12, 0.45, 0.83, 1];
    progress = checkpoints.find(checkpoint => checkpoint > progress) ?? 1;
    stopTest();
    renderTestMotion();
  });
  test.querySelector("[data-creep-reset]").addEventListener("click", () => {
    progress = 0;
    stopTest();
    renderTestMotion();
  });
  test.addEventListener("input", event => {
    if (event.target === playbackSpeed) return;
    if (!event.target.matches("[data-hotter]")) {
      progress = 0;
      stopTest();
    }
    renderTest();
  });

  for (const button of lab.querySelectorAll("[data-run-hours]")) {
    button.addEventListener("click", () => {
      lab.elements.runHours.value = button.dataset.runHours;
      renderLab();
    });
  }
  lab.addEventListener("submit", event => event.preventDefault());
  lab.addEventListener("input", renderLab);
  lab.addEventListener("reset", () => window.requestAnimationFrame(renderLab));
  refreshOnResize(document.querySelectorAll("canvas"), () => {
    renderDwellLoops();
    renderTest();
    renderLab();
  });
  renderDwellLoops();
  renderTest();
  renderLab();
}());
