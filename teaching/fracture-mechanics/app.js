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

  function preparePlot(canvas) {
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
    return { context, width, height };
  }

  function drawPlot(canvas, { xTicks, yTicks, xLabel, yLabel, curve, reference, point }) {
    const plot = preparePlot(canvas);
    if (!plot) return;
    const { context, width, height } = plot;
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

  function drawPlasticZone(canvas, contours, radiusScale) {
    const plot = preparePlot(canvas);
    if (!plot) return;
    const { context, width, height } = plot;
    const xLimit = 3.2;
    const yLimit = 2.32;
    const leftMargin = 35;
    const rightMargin = 8;
    const top = 8;
    const availableWidth = width - leftMargin - rightMargin;
    const scale = Math.min(availableWidth / (2 * xLimit), (height - top - 37) / (2 * yLimit));
    if (scale <= 0) return;
    const plotWidth = 2 * xLimit * scale;
    const plotHeight = 2 * yLimit * scale;
    const left = leftMargin + (availableWidth - plotWidth) / 2;
    const right = left + plotWidth;
    const bottom = top + plotHeight;
    const x = value => left + (value + xLimit) * scale;
    const y = value => top + (yLimit - value) * scale;

    context.strokeStyle = grid;
    context.lineWidth = 1;
    context.fillStyle = muted;
    context.font = "12px system-ui, sans-serif";
    context.textAlign = "center";
    context.textBaseline = "top";
    context.beginPath();
    for (let tick = -3; tick <= 3; tick += 1) {
      context.moveTo(x(tick), top);
      context.lineTo(x(tick), bottom);
      context.fillText(String(tick).replace("-", "−"), x(tick), bottom + 4);
    }
    context.textAlign = "right";
    context.textBaseline = "middle";
    for (let tick = -2; tick <= 2; tick += 1) {
      context.moveTo(left, y(tick));
      context.lineTo(right, y(tick));
      context.fillText(String(tick).replace("-", "−"), left - 5, y(tick));
    }
    context.stroke();
    context.strokeStyle = "#a49db4";
    context.strokeRect(left, top, plotWidth, plotHeight);
    context.beginPath();
    context.moveTo(left, y(0));
    context.lineTo(right, y(0));
    context.moveTo(x(0), top);
    context.lineTo(x(0), bottom);
    context.stroke();

    context.textAlign = "center";
    context.fillText("x (mm)", x(0), bottom + 28);
    context.save();
    context.translate(8, y(0));
    context.rotate(-Math.PI / 2);
    context.fillText("y (mm)", 0, 0);
    context.restore();

    if (radiusScale > 0) {
      for (const { points, planeStrain } of contours) {
        context.beginPath();
        for (const [horizontal, vertical] of points) {
          context.lineTo(x(horizontal * radiusScale), y(vertical * radiusScale));
        }
        context.closePath();
        context.fillStyle = planeStrain ? "#cfeae6cc" : "#ece5f5bb";
        context.fill();
        context.strokeStyle = planeStrain ? "#086e6c" : "#544183";
        context.lineWidth = planeStrain ? 1.8 : 2.5;
        context.setLineDash(planeStrain ? [5, 3] : []);
        context.stroke();
      }
    }

    context.setLineDash([]);
    context.strokeStyle = "#221d30";
    context.lineWidth = 2.5;
    context.beginPath();
    context.moveTo(left, y(0));
    context.lineTo(x(0), y(0));
    context.stroke();
    context.beginPath();
    context.arc(x(0), y(0), 3, 0, 2 * Math.PI);
    context.fillStyle = "#221d30";
    context.fill();
  }

  function setupPlasticZones() {
    const slider = document.getElementById("plastic-zone-k");
    if (!slider) return;
    const controls = document.getElementById("plastic-zone-control");
    const intensityReadout = document.getElementById("plastic-zone-k-value");
    const figures = Array.from(document.querySelectorAll("[data-plastic-zone-mode]"));
    const canvases = figures.map(figure => figure.querySelector("canvas"));
    if (!canvases.length || canvases.some(canvas => !canvas?.getContext("2d"))) return;

    const yieldStrength = 450;
    const poissonRatio = 0.30;
    const planeStrainFactor = (1 - 2 * poissonRatio) ** 2;
    // The von Mises first-yield radii are these angular factors times (K/sigma_ys)^2 / (2*pi).
    const radiusFactors = {
      i: (angle, constraint) => Math.cos(angle / 2) ** 2 * (constraint + 3 * Math.sin(angle / 2) ** 2),
      ii: (angle, constraint) => 3 + constraint * Math.sin(angle / 2) ** 2 - 2.25 * Math.sin(angle) ** 2,
      iii: () => 3,
    };
    const plots = figures.map((figure, index) => {
      const mode = figure.dataset.plasticZoneMode;
      const constraints = mode === "iii" ? [1] : [1, planeStrainFactor];
      const contours = constraints.map((constraint, contourIndex) => ({
        planeStrain: contourIndex === 1,
        points: Array.from({ length: 360 }, (_, degree) => {
          const angle = degree * Math.PI / 180;
          const radiusFactor = radiusFactors[mode](angle, constraint);
          return [radiusFactor * Math.cos(angle), radiusFactor * Math.sin(angle)];
        }),
      }));

      figure.querySelector(".plastic-zone-original").hidden = true;
      figure.querySelector(".plastic-zone-chart").hidden = false;
      return {
        canvas: canvases[index],
        contours,
        ahead: figure.querySelector("[data-zone-ahead]"),
        strain: figure.querySelector("[data-zone-strain]"),
      };
    });
    controls.hidden = false;
    document.getElementById("plastic-zone-original-links").hidden = false;

    function formatRadius(millimetres) {
      return millimetres > 0 && millimetres < 0.01 ? "<0.01 mm" : `${millimetres.toFixed(2)} mm`;
    }

    function redrawPlasticZones() {
      const intensity = slider.valueAsNumber;
      const radiusScale = 1000 * (intensity / yieldStrength) ** 2 / (2 * Math.PI);
      intensityReadout.value = `${intensity} MPa√m`;
      slider.setAttribute("aria-valuetext", `${intensity} megapascal square root metres`);
      for (const { canvas, contours, ahead, strain } of plots) {
        drawPlasticZone(canvas, contours, radiusScale);
        ahead.textContent = formatRadius(radiusScale * contours[0].points[0][0]);
        if (strain) strain.textContent = formatRadius(radiusScale * contours[1].points[0][0]);
      }
    }

    slider.addEventListener("input", redrawPlasticZones);
    return { canvases, redraw: redrawPlasticZones };
  }

  const plasticZones = setupPlasticZones();

  function redraw() {
    describeCrack();
    if (rate) describeTransition();
    plasticZones?.redraw();
  }

  size.addEventListener("input", describeCrack);
  rate?.addEventListener("input", describeTransition);
  if ("ResizeObserver" in window) {
    const observer = new ResizeObserver(redraw);
    for (const plot of [crackPlot, transitionPlot, ...(plasticZones?.canvases ?? [])].filter(Boolean)) observer.observe(plot);
  } else {
    window.addEventListener("resize", redraw);
  }
  redraw();
})();
