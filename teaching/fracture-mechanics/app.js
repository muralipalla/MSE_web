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
  const criticalHalfLength = 1000 * (toughness / appliedStress) ** 2 / Math.PI;
  const youngsModulus = 350e9;
  const surfaceEnergy = 2;
  const flawHalfLength = 2e-6;
  const fractureStress = Math.sqrt(2 * youngsModulus * surfaceEnergy / (Math.PI * flawHalfLength)) / 1e6;
  const theme = getComputedStyle(document.documentElement);
  const ink = theme.getPropertyValue("--ink").trim();
  const muted = theme.getPropertyValue("--ink-soft").trim();
  const referenceColour = theme.getPropertyValue("--coral").trim();
  const grid = theme.getPropertyValue("--line").trim();
  const plotTickFont = "600 13px system-ui, sans-serif";
  const plotLabelFont = "700 14px system-ui, sans-serif";

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

  function drawPlot(canvas, {
    xTicks, yTicks, xLabel, yLabel, curve, reference, point, thresholdX, pointLabel, sampleExponent = 1,
  }) {
    const plot = preparePlot(canvas);
    if (!plot) return;
    const { context, width, height } = plot;
    const left = 46;
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
    context.font = plotTickFont;

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

    context.font = plotLabelFont;
    context.fillStyle = ink;
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
    function drawCurve(from, to) {
      context.beginPath();
      context.moveTo(x(from), y(curve(from)));
      for (let step = 1; step <= 100; step += 1) {
        const value = from + (to - from) * (step / 100) ** sampleExponent;
        context.lineTo(x(value), y(curve(value)));
      }
      context.stroke();
    }
    drawCurve(xMin, thresholdX ?? xMax);
    if (thresholdX !== undefined) {
      context.setLineDash([6, 4]);
      drawCurve(thresholdX, xMax);
      context.setLineDash([]);
    }

    context.beginPath();
    context.arc(x(point[0]), y(point[1]), 5.5, 0, 2 * Math.PI);
    context.fillStyle = ink;
    context.fill();
    context.strokeStyle = "#ffffff";
    context.lineWidth = 2;
    context.stroke();

    if (pointLabel) {
      context.font = plotLabelFont;
      context.textAlign = "left";
      context.textBaseline = "bottom";
      context.fillText(pointLabel, x(point[0]) + 10, y(point[1]) - 4);
    }

    if (thresholdX !== undefined) {
      const markerX = x(thresholdX);
      const markerY = y(reference);
      context.strokeStyle = referenceColour;
      context.beginPath();
      context.arc(markerX, markerY, 7, 0, 2 * Math.PI);
      context.stroke();
      context.font = plotLabelFont;
      context.textAlign = "right";
      context.textBaseline = "bottom";
      context.fillStyle = ink;
      context.fillText(thresholdX.toFixed(2) + " mm", markerX - 9, markerY - 12);
    }
  }

  function makeInglisStress(a, b) {
    const scale = (a + b) / 2;
    const shape = (a - b) / (a + b);
    const shapePlusOne = 1 + shape;
    const shapeComplement = 1 - shape * shape;

    // Invert the ellipse mapping z/scale = w + shape/w in the first quadrant.
    // The outer root represents material outside the traction-free hole.
    return function normalizedStress(x, y) {
      const scaledX = Math.abs(x) / scale;
      const scaledY = Math.abs(y) / scale;
      const discriminantReal = scaledX * scaledX - scaledY * scaledY - 4 * shape;
      const discriminantImag = 2 * scaledX * scaledY;
      const magnitude = Math.hypot(discriminantReal, discriminantImag);
      const wReal = (scaledX + Math.sqrt((magnitude + discriminantReal) / 2)) / 2;
      const wImag = (scaledY + Math.sqrt((magnitude - discriminantReal) / 2)) / 2;
      const wNormSquared = wReal * wReal + wImag * wImag;

      // q = 1/(w² - shape) expresses the two elastic stress potentials.
      const denominatorReal = wReal * wReal - wImag * wImag - shape;
      const denominatorImag = 2 * wReal * wImag;
      const denominatorSquared = denominatorReal * denominatorReal + denominatorImag * denominatorImag;
      const qReal = denominatorReal / denominatorSquared;
      const qImag = -denominatorImag / denominatorSquared;
      const sumHalf = 0.5 + shapePlusOne * qReal;
      const differenceHalf = (1 + shapeComplement * (qReal + shapePlusOne * (qReal * qReal - qImag * qImag))) / 2;

      const productReal = wReal * qReal - wImag * qImag;
      const productImag = wReal * qImag + wImag * qReal;
      const cubeReal = productReal * (productReal * productReal - 3 * productImag * productImag);
      const cubeImag = productImag * (3 * productReal * productReal - productImag * productImag);
      const boundaryCorrection = shapePlusOne * (1 - 1 / wNormSquared) * (
        (1 - shape) * wReal * cubeReal + shapePlusOne * wImag * cubeImag
      );
      return sumHalf + differenceHalf - boundaryCorrection;
    };
  }

  const stressColors = [
    [52, 107, 153],
    [238, 232, 246],
    [241, 161, 67],
    [163, 43, 40],
  ];
  const stressPalette = Array.from({ length: 256 }, (_, index) => {
    const position = 3 * index / 255;
    const segment = Math.min(2, Math.floor(position));
    const color = stressColors[segment].map((channel, index) =>
      Math.round(channel + (stressColors[segment + 1][index] - channel) * (position - segment))
    );
    return [...color, 255];
  });

  function drawInglisMap(canvas, raster, stress, a, b, concentration) {
    const plot = preparePlot(canvas);
    if (!plot) return;
    const { context, width, height } = plot;
    const halfWidth = 12;
    const halfHeight = 9;
    const scale = Math.min((width - 20) / (2 * halfWidth), (height - 56) / (2 * halfHeight));
    const fieldWidth = 2 * halfWidth * scale;
    const fieldHeight = 2 * halfHeight * scale;
    const cx = width / 2;
    const cy = height / 2;
    const left = cx - fieldWidth / 2;
    const top = cy - fieldHeight / 2;
    const radiusX = a * scale;
    const radiusY = b * scale;

    const pixels = raster.createImageData(raster.canvas.width, raster.canvas.height);
    // The stress component is symmetric across both axes of the hole.
    for (let row = 0; row < pixels.height / 2; row += 1) {
      const y = halfHeight * (1 - (2 * row + 1) / pixels.height);
      const upper = 4 * row * pixels.width;
      const lower = 4 * (pixels.height - 1 - row) * pixels.width;
      for (let column = 0; column < pixels.width / 2; column += 1) {
        const x = halfWidth * (1 - (2 * column + 1) / pixels.width);
        if ((x / a) ** 2 + (y / b) ** 2 <= 1) continue;
        const value = stress(x, y);
        const colorPosition = value <= 1
          ? Math.max(0, value) / 3
          : (1 + 2 * Math.sqrt(Math.min(1, (value - 1) / (concentration - 1)))) / 3;
        const color = stressPalette[Math.round(255 * colorPosition)];
        const near = 4 * column;
        const far = 4 * (pixels.width - 1 - column);
        pixels.data.set(color, upper + near);
        pixels.data.set(color, upper + far);
        pixels.data.set(color, lower + near);
        pixels.data.set(color, lower + far);
      }
    }
    raster.putImageData(pixels, 0, 0);
    context.drawImage(raster.canvas, left, top, fieldWidth, fieldHeight);
    context.lineWidth = 1;
    context.strokeStyle = muted;
    context.strokeRect(left, top, fieldWidth, fieldHeight);

    context.strokeStyle = referenceColour;
    context.lineWidth = 2;
    context.beginPath();
    for (const offset of [-1 / 3, 0, 1 / 3]) {
      const x = cx + fieldWidth * offset;
      for (const direction of [-1, 1]) {
        const edge = cy + direction * fieldHeight / 2;
        const arrow = edge + direction * 19;
        context.moveTo(x, edge + direction * 3);
        context.lineTo(x, arrow);
        context.moveTo(x - 4.5, arrow - direction * 5);
        context.lineTo(x, arrow);
        context.lineTo(x + 4.5, arrow - direction * 5);
      }
    }
    context.stroke();

    context.beginPath();
    context.ellipse(cx, cy, radiusX, radiusY, 0, 0, Math.PI * 2);
    context.fillStyle = "#ffffff";
    context.fill();
    context.strokeStyle = ink;
    context.lineWidth = 1.5;
    context.stroke();

    context.setLineDash([4, 4]);
    context.beginPath();
    context.moveTo(cx, cy - radiusY);
    context.lineTo(cx, cy);
    context.lineTo(left + fieldWidth, cy);
    context.stroke();
    context.setLineDash([]);

    for (const x of [cx - radiusX, cx + radiusX]) {
      context.beginPath();
      context.arc(x, cy, 4, 0, 2 * Math.PI);
      context.fillStyle = referenceColour;
      context.fill();
      context.strokeStyle = "#ffffff";
      context.stroke();
    }

    context.font = "italic 700 14px system-ui, sans-serif";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.lineWidth = 3;
    context.fillStyle = ink;
    for (const [label, x, y] of [["a", cx + radiusX / 2, cy + 12], ["b", cx - 10, cy - radiusY / 2]]) {
      context.strokeText(label, x, y);
      context.fillText(label, x, y);
    }
  }

  function setupInglisDemo() {
    const demo = document.getElementById("inglis-demo");
    if (!demo) return;

    const aInput = document.getElementById("inglis-a");
    const bInput = document.getElementById("inglis-b");
    const aReadout = document.getElementById("inglis-a-value");
    const bReadout = document.getElementById("inglis-b-value");
    const radiusReadout = document.getElementById("inglis-radius");
    const factorReadout = document.getElementById("inglis-factor");
    const peakReadout = document.getElementById("inglis-peak");
    const scalePeak = document.getElementById("inglis-scale-peak");
    const map = document.getElementById("inglis-map");
    const profile = document.getElementById("inglis-profile");
    const raster = document.createElement("canvas").getContext("2d");
    if (!raster || !map.getContext("2d") || !profile.getContext("2d")) return;

    raster.canvas.width = 480;
    raster.canvas.height = 360;
    const gradient = stressColors.map(color => "rgb(" + color.join(", ") + ")");
    demo.querySelector(".inglis-scale-bar").style.backgroundImage = "linear-gradient(to right, " + gradient.join(", ") + ")";
    const formatNumber = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });
    const formatRadius = new Intl.NumberFormat("en-US", { maximumFractionDigits: 3 });
    const remoteStress = 50;
    let frame;

    function redraw() {
      frame = undefined;
      const a = aInput.valueAsNumber;
      const b = bInput.valueAsNumber;
      const radius = b * b / a;
      const concentration = 1 + 2 * a / b;
      const peak = remoteStress * concentration;
      const peakText = formatNumber.format(peak);
      aReadout.textContent = formatNumber.format(a) + " mm";
      bReadout.textContent = formatNumber.format(b) + " mm";
      radiusReadout.textContent = formatRadius.format(radius) + " mm";
      factorReadout.textContent = formatNumber.format(concentration);
      peakReadout.textContent = peakText + " MPa";
      scalePeak.textContent = peakText + " peak";
      aInput.setAttribute("aria-valuetext", a + " millimetres");
      bInput.setAttribute("aria-valuetext", b + " millimetres");

      const stress = makeInglisStress(a, b);
      drawInglisMap(map, raster, stress, a, b, concentration);
      const distance = Math.min(2 * a, Math.max(a / 4, 8 * radius));
      const distanceStep = Math.ceil(distance) / 4;
      const tickStep = 25 * Math.ceil(peak / (3.4 * 25));
      drawPlot(profile, {
        xTicks: [0, distanceStep, 2 * distanceStep, 3 * distanceStep, 4 * distanceStep],
        yTicks: [0, tickStep, 2 * tickStep, 3 * tickStep, 4 * tickStep],
        xLabel: "Distance from tip (mm)",
        yLabel: "Vertical stress σyy (MPa)",
        curve: distance => remoteStress * stress(a + distance, 0),
        reference: remoteStress,
        point: [0, peak],
        pointLabel: "σmax = " + peakText + " MPa",
        sampleExponent: 2,
      });
    }

    function scheduleRedraw() {
      if (frame === undefined) frame = window.requestAnimationFrame(redraw);
    }

    function updateAxisLimit() {
      bInput.max = aInput.value;
      if (bInput.valueAsNumber > aInput.valueAsNumber) bInput.value = aInput.value;
      scheduleRedraw();
    }

    aInput.addEventListener("input", updateAxisLimit);
    bInput.addEventListener("input", scheduleRedraw);
    demo.hidden = false;
    updateAxisLimit();
    return { canvases: [map, profile], redraw: scheduleRedraw };
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
    status.textContent = critical
      ? "This assumed flaw meets the criterion for unstable extension."
      : "Below the Mode I fracture threshold.";
    size.setAttribute("aria-valuetext", `${millimetres.toFixed(1)} millimetres`);

    drawPlot(crackPlot, {
      xTicks: [0, 3, 6, 9, 12],
      yTicks: [0, 12, 24, 36],
      xLabel: "Crack half-length (mm)",
      yLabel: "Stress intensity (MPa√m)",
      curve: crackIntensity,
      reference: toughness,
      point: [millimetres, intensity],
      thresholdX: criticalHalfLength,
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
    context.font = plotTickFont;
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

    context.font = plotLabelFont;
    context.fillStyle = ink;
    context.textAlign = "center";
    context.fillText("x (mm)", x(0), bottom + 28);
    context.save();
    context.translate(9, y(0));
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
  const inglisDemo = setupInglisDemo();

  function redraw() {
    describeCrack();
    if (rate) describeTransition();
    plasticZones?.redraw();
    inglisDemo?.redraw();
  }

  size.addEventListener("input", describeCrack);
  rate?.addEventListener("input", describeTransition);
  if ("ResizeObserver" in window) {
    const observer = new ResizeObserver(redraw);
    const plots = [crackPlot, transitionPlot, ...(plasticZones?.canvases ?? []), ...(inglisDemo?.canvases ?? [])];
    for (const plot of plots.filter(Boolean)) observer.observe(plot);
  } else {
    window.addEventListener("resize", redraw);
  }
  redraw();
})();
