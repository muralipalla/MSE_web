(() => {
  "use strict";

  const size = document.getElementById("crack-size");
  const sizeValue = document.getElementById("crack-size-value");
  const intensityValue = document.getElementById("intensity-value");
  const status = document.getElementById("crack-status");
  const crackPlot = document.getElementById("crack-plot");
  const rate = document.getElementById("transition-rate");
  const transitionPlot = document.getElementById("transition-plot");
  const rateMantissa = document.getElementById("transition-rate-mantissa");
  const rateExponent = document.getElementById("transition-rate-exponent");
  const kelvinValue = document.getElementById("transition-kelvin");
  const celsiusValue = document.getElementById("transition-celsius");

  const appliedStress = 180;
  const toughness = 24;
  const youngsModulus = 350e9;
  const surfaceEnergy = 2;
  const flawHalfLength = 2e-6;
  const fractureStress = Math.sqrt(2 * youngsModulus * surfaceEnergy / (Math.PI * flawHalfLength)) / 1e6;
  const theme = getComputedStyle(document.documentElement);
  const ink = theme.getPropertyValue("--ink").trim();
  const muted = theme.getPropertyValue("--ink-soft").trim();
  const referenceColour = theme.getPropertyValue("--coral").trim();
  const grid = theme.getPropertyValue("--line").trim();

  function drawPlot(canvas, { xTicks, yTicks, xLabel, yLabel, curve, reference, point }) {
    if (!canvas) return;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const context = canvas.getContext("2d");
    if (!context || width === 0 || height === 0) return;

    const density = Math.min(window.devicePixelRatio || 1, 2);
    const pixelWidth = Math.round(width * density);
    const pixelHeight = Math.round(height * density);
    if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
      canvas.width = pixelWidth;
      canvas.height = pixelHeight;
    }
    context.setTransform(pixelWidth / width, 0, 0, pixelHeight / height, 0, 0);
    context.clearRect(0, 0, width, height);

    const left = 42;
    const right = width - 16;
    const top = 32;
    const bottom = height - 45;
    const xMin = xTicks[0];
    const xMax = xTicks.at(-1);
    const yMin = yTicks[0];
    const yMax = yTicks.at(-1);
    const x = value => left + (right - left) * (value - xMin) / (xMax - xMin);
    const y = value => bottom - (bottom - top) * (value - yMin) / (yMax - yMin);

    context.fillStyle = "#ffffff";
    context.fillRect(left, top, right - left, bottom - top);
    context.strokeStyle = grid;
    context.lineWidth = 1;
    context.fillStyle = muted;
    context.font = "12px system-ui, sans-serif";

    context.beginPath();
    context.textAlign = "center";
    context.textBaseline = "top";
    for (const tick of xTicks) {
      context.moveTo(x(tick), top);
      context.lineTo(x(tick), bottom);
      context.fillText(String(tick), x(tick), bottom + 7);
    }
    context.textAlign = "right";
    context.textBaseline = "middle";
    for (const tick of yTicks) {
      context.moveTo(left, y(tick));
      context.lineTo(right, y(tick));
      context.fillText(String(tick), left - 7, y(tick));
    }
    context.stroke();

    context.font = "650 13px system-ui, sans-serif";
    context.textAlign = "left";
    context.textBaseline = "top";
    context.fillText(yLabel, left, 9);
    context.textAlign = "center";
    context.fillText(xLabel, (left + right) / 2, height - 21);

    context.strokeStyle = referenceColour;
    context.lineWidth = 2;
    context.setLineDash([6, 4]);
    context.beginPath();
    context.moveTo(left, y(reference));
    context.lineTo(right, y(reference));
    context.stroke();

    context.strokeStyle = muted;
    context.lineWidth = 1;
    context.setLineDash([3, 4]);
    context.beginPath();
    context.moveTo(x(point[0]), y(point[1]));
    context.lineTo(x(point[0]), bottom);
    context.stroke();

    context.setLineDash([]);
    context.strokeStyle = ink;
    context.lineWidth = 2.5;
    context.beginPath();
    context.moveTo(left, y(curve(xMin)));
    for (let step = 1; step <= 100; step += 1) {
      const value = xMin + (xMax - xMin) * step / 100;
      context.lineTo(x(value), y(curve(value)));
    }
    context.stroke();

    context.beginPath();
    context.arc(x(point[0]), y(point[1]), 5.5, 0, 2 * Math.PI);
    context.fillStyle = ink;
    context.fill();
    context.strokeStyle = "#ffffff";
    context.lineWidth = 2;
    context.stroke();
  }

  function crackIntensity(millimetres) {
    return appliedStress * Math.sqrt(Math.PI * millimetres / 1000);
  }

  function describeCrack() {
    const millimetres = Number(size.value);
    const intensity = crackIntensity(millimetres);
    const critical = intensity >= toughness;

    sizeValue.textContent = `${millimetres.toFixed(1)} mm`;
    intensityValue.textContent = intensity.toFixed(1);
    status.textContent = critical ? "Mode I fracture criterion reached." : "Below the Mode I fracture threshold.";
    size.setAttribute("aria-valuetext", `${millimetres.toFixed(1)} millimetres`);

    drawPlot(crackPlot, {
      xTicks: [0, 3, 6, 9, 12],
      yTicks: [0, 12, 24, 36],
      xLabel: "Crack half-length (mm)",
      yLabel: "Stress intensity (MPa√m)",
      curve: crackIntensity,
      reference: toughness,
      point: [millimetres, intensity],
    });
  }

  function describeTransition() {
    const logRate = Number(rate.value);
    const [mantissa, exponent] = (10 ** logRate).toExponential(1).split("e");
    const rateTerm = 20.6 + 61.3 * logRate;
    const temperature = 173600 / (fractureStress - rateTerm);

    rateMantissa.textContent = mantissa;
    rateExponent.textContent = exponent.replace("-", "−");
    rate.setAttribute("aria-valuetext", `${mantissa} times ten to the power ${exponent} per second`);
    kelvinValue.textContent = `${temperature.toFixed(1)} K`;
    celsiusValue.textContent = `${(temperature - 273.15).toFixed(1).replace("-", "−")}\u00a0°C`;

    drawPlot(transitionPlot, {
      xTicks: [150, 200, 250, 300, 350, 400],
      yTicks: [0, 300, 600, 900, 1200],
      xLabel: "Temperature (K)",
      yLabel: "Stress (MPa)",
      curve: kelvin => rateTerm + 173600 / kelvin,
      reference: fractureStress,
      point: [temperature, fractureStress],
    });
  }

  function redraw() {
    describeCrack();
    if (rate) describeTransition();
  }

  size.addEventListener("input", describeCrack);
  rate?.addEventListener("input", describeTransition);
  if ("ResizeObserver" in window) {
    const observer = new ResizeObserver(redraw);
    for (const plot of [crackPlot, transitionPlot].filter(Boolean)) observer.observe(plot);
  } else {
    window.addEventListener("resize", redraw);
  }
  redraw();
})();
