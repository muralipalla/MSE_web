(function () {
  "use strict";

  const { colours, format, plot, markPlot, canvasSurface, sample, controlValues, showResults, refreshOnResize } = window.MSEServiceLife;

  function signed(value) {
    if (Math.abs(value) < 0.05) return "0";
    return (value > 0 ? "+" : "−") + format(Math.abs(value), 1);
  }

  function plotWaveform(canvas, { x, y }, minimum, maximum, stressAt, probe) {
    const mean = (maximum + minimum) / 2;
    const [start, end] = x.range;
    const wave = sample(start, end, 320, position => [position, stressAt(position)]);
    const zero = [[start, 0], [end, 0]];
    plot(canvas, {
      x,
      y: { label: "Stress (MPa)", ...y },
      fills: [
        { bounds: [zero, wave.map(([position, stress]) => [position, Math.max(stress, 0)])], colour: "#ffe1d6" },
        { bounds: [zero, wave.map(([position, stress]) => [position, Math.min(stress, 0)])], colour: "#e0e8fb" }
      ],
      series: [{ points: wave, colour: colours.ink, label: "Stress" }],
      guides: [
        { axis: "y", value: 0, colour: "#8b829f" },
        { axis: "y", value: maximum, label: "Max " + signed(maximum), side: "left", colour: colours.coral },
        { axis: "y", value: minimum, label: "Min " + signed(minimum), side: "left", colour: colours.blue },
        { axis: "y", value: mean, label: "Mean " + signed(mean), side: "left", colour: colours.lavender }
      ],
      brackets: [
        { low: minimum, high: maximum, label: "Δσ", offset: 13, colour: colours.navy },
        { low: mean, high: maximum, label: "σₐ", offset: 50, colour: colours.coral }
      ],
      probe,
      description: "The maximum is " + signed(maximum) + " MPa, minimum " + signed(minimum)
        + " MPa, and mean " + signed(mean) + " MPa."
    });
  }

  function drawMachine(canvas, force, diameter, rotation) {
    const surface = canvasSurface(canvas);
    if (!surface) return;
    const { context: c, width, height } = surface;
    const scale = Math.min(width / 510, height / 300);
    const outline = "#3b3950";
    c.clearRect(0, 0, width, height);
    c.save();
    c.translate((width - 510 * scale) / 2, (height - 300 * scale) / 2);
    c.scale(scale, scale);
    c.lineWidth = 1.6;
    c.lineJoin = "round";
    c.lineCap = "round";

    function line(points, colour = outline) {
      c.strokeStyle = colour;
      c.beginPath();
      c.moveTo(...points[0]);
      for (const point of points.slice(1)) c.lineTo(...point);
      c.stroke();
    }

    function shape(points, colour) {
      c.beginPath();
      c.moveTo(...points[0]);
      for (const point of points.slice(1)) c.lineTo(...point);
      c.closePath();
      c.fillStyle = colour;
      c.fill();
      c.strokeStyle = outline;
      c.stroke();
    }

    function box(x, y, w, h, colour, radius = 2) {
      c.beginPath();
      c.roundRect(x, y, w, h, radius);
      c.fillStyle = colour;
      c.fill();
      c.strokeStyle = outline;
      c.stroke();
    }

    function circle(x, y, radius, fill) {
      c.beginPath();
      c.arc(x, y, radius, 0, 2 * Math.PI);
      c.fillStyle = fill;
      c.fill();
      c.strokeStyle = outline;
      c.stroke();
    }

    function label(text, x, y, colour = outline) {
      c.font = "650 " + Math.max(13, 8.5 / scale) + "px system-ui";
      c.textAlign = "center";
      c.textBaseline = "middle";
      c.fillStyle = colour;
      c.fillText(text, x, y);
    }

    function arrow(x, from, to, colour) {
      const head = to - Math.sign(to - from) * 6;
      line([[x, from], [x, to]], colour);
      line([[x - 3.5, head], [x, to], [x + 3.5, head]], colour);
    }

    function specimen(x, y, length, shoulder, gauge) {
      c.beginPath();
      c.moveTo(x, y - shoulder);
      c.lineTo(x + length * .31, y - shoulder);
      c.bezierCurveTo(x + length * .39, y - shoulder, x + length * .40, y - gauge, x + length * .46, y - gauge);
      c.lineTo(x + length * .54, y - gauge);
      c.bezierCurveTo(x + length * .60, y - gauge, x + length * .61, y - shoulder, x + length * .69, y - shoulder);
      c.lineTo(x + length, y - shoulder);
      c.lineTo(x + length, y + shoulder);
      c.lineTo(x + length * .69, y + shoulder);
      c.bezierCurveTo(x + length * .61, y + shoulder, x + length * .60, y + gauge, x + length * .54, y + gauge);
      c.lineTo(x + length * .46, y + gauge);
      c.bezierCurveTo(x + length * .40, y + gauge, x + length * .39, y + shoulder, x + length * .31, y + shoulder);
      c.lineTo(x, y + shoulder);
      c.closePath();
      const steel = c.createLinearGradient(0, y - shoulder, 0, y + shoulder);
      steel.addColorStop(0, "#dceafb");
      steel.addColorStop(.5, "#b3c9e4");
      steel.addColorStop(1, "#7592bd");
      c.fillStyle = steel;
      c.fill();
      c.strokeStyle = outline;
      c.stroke();
    }

    // The symmetric yoke transfers the hanging load to the two inner collars.
    shape([[16, 82], [79, 82], [92, 119], [103, 119], [103, 148], [16, 148]], "#c1d2e9");
    shape([[219, 119], [239, 119], [250, 82], [273, 82], [286, 117], [489, 117], [489, 148], [219, 148]], "#c1d2e9");
    specimen(53, 77, 213, 10, diameter * .61);
    box(48, 62, 32, 31, "#f5dbb1");
    box(240, 62, 32, 31, "#f5dbb1");
    for (const x of [64, 256]) circle(x, 77, 4, "#dd826e");
    for (const x of [112, 208]) box(x - 6, 67, 12, 21, "#f3c995");
    line([[112, 84], [112, 128], [208, 128], [208, 84]], outline);
    line([[112, 85], [112, 128], [208, 128], [208, 85]], "#ae7748");
    line([[160, 128], [160, 177]], "#9b6843");
    box(142, 168, 36, 10, "#f6d3af");
    box(137, 178, 46, 11, "#eab590");
    box(131, 188, 58, 5, "#d28662");
    arrow(160, 199, 215, colours.coral);
    label("F = " + format(force) + " N", 160, 230, colours.coral);

    box(272, 74, 173, 6, "#abc2df");
    box(287, 68, 23, 18, "#7b91a9", 3);
    for (const x of [293, 299, 305]) line([[x, 70], [x, 84]], "#dce8f3");
    box(327, 104, 78, 13, "#cc8065");
    box(333, 53, 66, 52, "#d5a05d", 6);
    for (let y = 60; y < 102; y += 5) line([[341, y], [391, y]], "#8f663c");
    box(429, 105, 51, 12, "#cc8065");
    box(433, 62, 43, 45, "#f4c49e", 7);
    box(437, 72, 35, 19, "#faf8ef");
    label(format(Math.floor(rotation / 360)), 454, 82);
    label("Specimen", 160, 24);
    line([[160, 34], [174, 65]]);
    label("Coupling", 295, 29);
    line([[295, 39], [298, 66]]);
    label("Motor", 365, 22);
    line([[365, 33], [365, 50]]);
    label("Rev. counter", 452, 25);
    line([[452, 36], [452, 59]]);
    label("Bearing", 52, 171);
    line([[53, 159], [62, 93]]);
    label("Bearing", 260, 165);
    line([[260, 153], [252, 94]]);

    specimen(242, 220, 145, 11, diameter * .7);
    arrow(315, 192, 218 - diameter * .7, outline);
    arrow(315, 248, 222 + diameter * .7, outline);
    label("d = " + format(diameter, 1) + " mm", 315, 265);

    const x = 448;
    const y = 220;
    const radius = 34;
    const section = c.createLinearGradient(0, y - radius, 0, y + radius);
    section.addColorStop(0, "#698bd4");
    section.addColorStop(.5, "#e5deea");
    section.addColorStop(1, "#eb8b73");
    circle(x, y, radius, section);
    c.setLineDash([3, 4]);
    line([[x - radius, y], [x + radius, y]]);
    c.setLineDash([]);
    const phase = (rotation % 360) * Math.PI / 180;
    const marker = [x + radius * Math.sin(phase), y - radius * Math.cos(phase)];
    line([[x, y], marker], "#605374");
    circle(...marker, 5, "#ffdc72");
    label("Gauge section", x, 270);
    c.restore();
  }

  const experiment = document.querySelector("#rotating-beam");
  const machine = experiment.querySelector("[data-beam-machine]");
  const model = experiment.querySelector("[data-beam-3d]");
  const viewButton = experiment.querySelector("[data-beam-view]");
  const viewGuide = experiment.querySelector("[data-beam-guide]");
  const renderModel = window.createFatigueBeamView?.(model);
  const waveform = experiment.querySelector("[data-beam-waveform]");
  const play = experiment.querySelector("[data-beam-play]");
  const live = experiment.querySelector(".life-live-state");
  const leverArm = 40;
  let beam;
  let rotation = 0;
  let frame;
  let lastTime;
  let running = false;

  function beamStress(degrees) {
    return -beam.amplitude * Math.cos(degrees * Math.PI / 180);
  }

  function renderMotion() {
    const angle = rotation % 360;
    const stress = beamStress(angle);
    const sign = stress > 0.05 ? "tension" : stress < -0.05 ? "compression" : "neutral";
    live.querySelector("[data-result='sign']").dataset.sign = sign;
    const turns = Math.floor(rotation / 360);
    showResults(live, {
      angle: Math.floor(angle) + "°",
      stress: signed(stress) + " MPa",
      sign: { tension: "Tension", compression: "Compression", neutral: "Zero stress" }[sign],
      turns: format(turns) + (turns === 1 ? " revolution" : " revolutions")
    });
    if (model.hidden) drawMachine(machine, beam.force, beam.diameter, rotation);
    else renderModel(beam.force, beam.diameter, rotation);
    markPlot(waveform, [angle, stress], sign === "tension" ? colours.coral : colours.navy);
  }

  function renderBeam() {
    const { force, diameter } = controlValues(experiment);
    const amplitude = 16 * force * leverArm / (Math.PI * diameter ** 3);
    beam = { force, diameter, amplitude };
    showResults(experiment, { amplitude: format(amplitude, 1) + " MPa" });
    plotWaveform(waveform, {
      x: { label: "Beam angle (°)", range: [0, 360], ticks: [0, 90, 180, 270, 360] },
      y: { range: [-350, 350], ticks: [-300, -200, -100, 0, 100, 200, 300] }
    }, -amplitude, amplitude, beamStress);
    renderMotion();
  }

  function animate(time) {
    if (!running) return;
    if (lastTime === undefined) lastTime = time;
    if (time - lastTime >= 28) {
      rotation += Math.min(time - lastTime, 70) * 0.075;
      lastTime = time;
      renderMotion();
    }
    frame = requestAnimationFrame(animate);
  }

  function setPlaying(playing) {
    if (running === playing) return;
    running = playing;
    play.textContent = playing ? "Pause rotation" : "Play slow motion";
    lastTime = undefined;
    if (playing) frame = requestAnimationFrame(animate);
    else cancelAnimationFrame(frame);
  }

  function showModel(show) {
    model.hidden = !show;
    machine.hidden = show;
    viewButton.textContent = show ? "Show schematic" : "Show 3D view";
    viewGuide.textContent = show ? "Drag or use the arrow keys to orbit the rig. The yellow marker turns with the specimen."
      : "The lower detail shows the gauge diameter and the point tracked on the graph.";
  }

  if (renderModel) {
    showModel(true);
    viewButton.hidden = false;
    viewButton.addEventListener("click", () => {
      showModel(model.hidden);
      renderMotion();
    });
    model.addEventListener("webglcontextlost", () => {
      showModel(false);
      viewButton.hidden = true;
      renderMotion();
    });
  }
  play.addEventListener("click", () => setPlaying(!running));
  experiment.querySelector("[data-beam-step]").addEventListener("click", () => {
    setPlaying(false);
    rotation += 90;
    renderMotion();
  });
  experiment.querySelector("[data-beam-reset]").addEventListener("click", () => {
    setPlaying(false);
    rotation = 0;
    renderMotion();
  });
  experiment.querySelector(".life-experiment-inputs").addEventListener("input", renderBeam);
  refreshOnResize([machine, model, waveform], renderBeam);
  renderBeam();

  const cycle = document.querySelector("#stress-cycle");
  const cycleWaveform = cycle.querySelector("[data-cycle-waveform]");
  const cycleInputs = cycle.querySelector(".life-cycle-inputs");
  const controls = Object.fromEntries([...cycleInputs.querySelectorAll("input")].map(input => [input.name, input]));
  const maximumLimit = Number(controls.maximum.max);
  const positivePeak = Number(controls.maximum.min);
  const minimumLimit = Number(controls.minimum.min);
  let maximum = Number(controls.maximum.value);
  let minimum = Number(controls.minimum.value);

  function setSlider(input, value, low, high) {
    // Include the current value at a calculated limit despite floating-point rounding.
    input.min = Math.min(low, value);
    input.max = Math.max(high, value);
    input.value = value;
    input.disabled = high - low < 1e-9;
  }

  function renderCycle() {
    const amplitude = (maximum - minimum) / 2;
    const mean = (maximum + minimum) / 2;
    const ratio = minimum / maximum;
    const upperPeakAtRatio = ratio < 0 ? Math.min(maximumLimit, minimumLimit / ratio) : maximumLimit;
    const lowerPeakAtAmplitude = Math.max(positivePeak, minimumLimit + 2 * amplitude);
    setSlider(controls.maximum, maximum, Math.max(minimum, positivePeak), maximumLimit);
    setSlider(controls.minimum, minimum, minimumLimit, maximum);
    // At fixed R, amplitude grows with the peak. At fixed amplitude, R grows with the peak.
    setSlider(controls.amplitude, amplitude, positivePeak * (1 - ratio) / 2, upperPeakAtRatio * (1 - ratio) / 2);
    setSlider(controls.ratio, ratio, 1 - 2 * amplitude / lowerPeakAtAmplitude, 1 - 2 * amplitude / maximumLimit);
    const { frequency } = controlValues(cycleInputs);
    showResults(cycle, {
      mean: signed(mean) + " MPa",
      range: format(2 * amplitude, 1) + " MPa",
      period: format(1 / frequency, 3) + " s"
    });
    const stressAt = seconds => mean - amplitude * Math.cos(2 * Math.PI * frequency * seconds);
    plotWaveform(cycleWaveform, {
      x: { label: "Time (s)", range: [0, 2], ticks: [0, .5, 1, 1.5, 2] },
      y: { range: [-450, 450], ticks: [-400, -200, 0, 200, 400] }
    }, minimum, maximum, stressAt, seconds => format(seconds, 3) + " s · " + signed(stressAt(seconds)) + " MPa");
  }

  cycleInputs.addEventListener("input", event => {
    const { name } = event.target;
    const value = Number(event.target.value);
    if (name === "maximum") maximum = value;
    if (name === "minimum") minimum = value;
    if (name === "amplitude" || name === "ratio") {
      const amplitude = name === "amplitude" ? value : (maximum - minimum) / 2;
      const ratio = name === "ratio" ? value : minimum / maximum;
      if (ratio < 1) {
        maximum = Math.min(maximumLimit, Math.max(positivePeak, 2 * amplitude / (1 - ratio)));
        minimum = Math.max(minimumLimit, maximum - 2 * amplitude);
      }
    }
    renderCycle();
  });
  refreshOnResize([cycleWaveform], renderCycle);
  renderCycle();
}());
