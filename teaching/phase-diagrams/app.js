import { FE_TRACE_SOURCE } from "./fe-c-trace.js?v=1";
import { CU_NI_TRACE_SOURCE, PB_SN_TRACE_SOURCE } from "./binary-phase-traces.js?v=1";

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const COLORS = {
  ink: "#2e2a74",
  inkSoft: "#554f82",
  muted: "#69648d",
  coral: "#c93b1f",
  coralBright: "#f05030",
  lavender: "#6757a8",
  lavenderLight: "#eeeaf7",
  blue: "#386694",
  blueLight: "#e7f0f6",
  teal: "#1f735e",
  tealLight: "#e4f2ed",
  amber: "#d59018",
  amberLight: "#fff2d2",
  charcoal: "#39404b",
  paper: "#fffefa",
  grid: "rgba(46, 42, 116, 0.11)"
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const between = (value, a, b, tolerance = 0) => value >= Math.min(a, b) - tolerance && value <= Math.max(a, b) + tolerance;
const percent = (value) => `${(value * 100).toFixed(1)}%`;
const formatComposition = (value, unit) => `${value.toFixed(value < 10 ? 2 : 1)} ${unit}`;
const phaseSymbol = (name) => name === "Liquid" ? "L" : name;
const phaseVariableMarkup = (prefix, phase) => `${prefix}<sub>${phaseSymbol(phase)}</sub>`;

function interpolateY(points, x) {
  if (x <= points[0][0]) return points[0][1];
  if (x >= points.at(-1)[0]) return points.at(-1)[1];
  for (let index = 0; index < points.length - 1; index += 1) {
    const [x1, y1] = points[index];
    const [x2, y2] = points[index + 1];
    if (between(x, x1, x2)) {
      const ratio = (x - x1) / (x2 - x1 || 1);
      return y1 + ratio * (y2 - y1);
    }
  }
  return points.at(-1)[1];
}

function interpolateX(points, y) {
  for (let index = 0; index < points.length - 1; index += 1) {
    const [x1, y1] = points[index];
    const [x2, y2] = points[index + 1];
    if (between(y, y1, y2, 1e-8)) {
      const ratio = (y - y1) / (y2 - y1 || 1);
      return x1 + ratio * (x2 - x1);
    }
  }
  return null;
}

function leverFractions(overall, leftComposition, rightComposition) {
  const span = rightComposition - leftComposition;
  if (Math.abs(span) < 1e-9) return { left: null, right: null, indeterminate: true };
  return {
    left: clamp((rightComposition - overall) / span, 0, 1),
    right: clamp((overall - leftComposition) / span, 0, 1)
  };
}

function fitCanvas(canvas) {
  const rect = canvas.getBoundingClientRect();
  const width = Math.max(280, rect.width || Number(canvas.getAttribute("width")) || 800);
  const height = Math.max(180, rect.height || Number(canvas.getAttribute("height")) || 500);
  const density = Math.min(2, window.devicePixelRatio || 1);
  const pixelWidth = Math.round(width * density);
  const pixelHeight = Math.round(height * density);
  if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
    canvas.width = pixelWidth;
    canvas.height = pixelHeight;
  }
  const context = canvas.getContext("2d");
  context.setTransform(density, 0, 0, density, 0, 0);
  context.clearRect(0, 0, width, height);
  context.lineJoin = "round";
  context.lineCap = "round";
  return { context, width, height, density };
}

function makePlot(canvas, xDomain, yDomain, options = {}) {
  const { context, width, height } = fitCanvas(canvas);
  const compact = width < 520;
  const margins = options.margins || {
    left: compact ? 52 : 68,
    right: compact ? 16 : 28,
    top: compact ? 25 : 30,
    bottom: compact ? 52 : 58
  };
  const plotWidth = Math.max(10, width - margins.left - margins.right);
  const plotHeight = Math.max(10, height - margins.top - margins.bottom);
  const x = (value) => margins.left + ((value - xDomain[0]) / (xDomain[1] - xDomain[0])) * plotWidth;
  const y = (value) => margins.top + (1 - (value - yDomain[0]) / (yDomain[1] - yDomain[0])) * plotHeight;
  const valueX = (pixel) => xDomain[0] + ((pixel - margins.left) / plotWidth) * (xDomain[1] - xDomain[0]);
  const valueY = (pixel) => yDomain[0] + (1 - (pixel - margins.top) / plotHeight) * (yDomain[1] - yDomain[0]);
  return { canvas, context, width, height, compact, margins, plotWidth, plotHeight, x, y, valueX, valueY, xDomain, yDomain };
}

function drawAxes(plot, options) {
  const { context, margins, plotWidth, plotHeight, x, y, compact } = plot;
  const fontSize = compact ? 10 : 11;
  context.save();
  if (options.background !== false) {
    context.fillStyle = COLORS.paper;
    context.fillRect(margins.left, margins.top, plotWidth, plotHeight);
  }
  context.font = `${fontSize}px system-ui, sans-serif`;
  context.textAlign = "center";
  context.textBaseline = "top";

  options.xTicks.forEach((tick) => {
    const px = x(tick);
    context.strokeStyle = COLORS.grid;
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(px, margins.top);
    context.lineTo(px, margins.top + plotHeight);
    context.stroke();
    context.fillStyle = COLORS.muted;
    context.fillText(options.xFormat ? options.xFormat(tick) : String(tick), px, margins.top + plotHeight + 9);
  });

  context.textAlign = "right";
  context.textBaseline = "middle";
  options.yTicks.forEach((tick) => {
    const py = y(tick);
    context.strokeStyle = COLORS.grid;
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(margins.left, py);
    context.lineTo(margins.left + plotWidth, py);
    context.stroke();
    context.fillStyle = COLORS.muted;
    context.fillText(options.yFormat ? options.yFormat(tick) : String(tick), margins.left - 8, py);
  });

  context.strokeStyle = COLORS.ink;
  context.lineWidth = 1.6;
  context.strokeRect(margins.left, margins.top, plotWidth, plotHeight);

  context.fillStyle = COLORS.ink;
  context.textAlign = "center";
  context.textBaseline = "bottom";
  context.font = `700 ${compact ? 11 : 12}px system-ui, sans-serif`;
  context.fillText(options.xLabel, margins.left + plotWidth / 2, plot.height - 4);
  context.save();
  context.translate(compact ? 12 : 15, margins.top + plotHeight / 2);
  context.rotate(-Math.PI / 2);
  context.fillText(options.yLabel, 0, 0);
  context.restore();
  context.restore();
}

function pathLine(plot, points, style = {}) {
  const { context, x, y } = plot;
  context.save();
  context.beginPath();
  points.forEach(([pointX, pointY], index) => {
    if (index === 0) context.moveTo(x(pointX), y(pointY));
    else context.lineTo(x(pointX), y(pointY));
  });
  context.strokeStyle = style.color || COLORS.ink;
  context.lineWidth = style.width || 2.5;
  context.setLineDash(style.dash || []);
  context.stroke();
  context.restore();
}

function drawCurveLabel(plot, text, curve, atX, color, screenOffset = 0) {
  const { context, x, y, compact } = plot;
  const span = curve.at(-1)[0] - curve[0][0];
  const delta = Math.max(span * 0.012, 0.001);
  const beforeX = clamp(atX - delta, curve[0][0], curve.at(-1)[0]);
  const afterX = clamp(atX + delta, curve[0][0], curve.at(-1)[0]);
  const beforeY = interpolateY(curve, beforeX);
  const afterY = interpolateY(curve, afterX);
  let angle = Math.atan2(y(afterY) - y(beforeY), x(afterX) - x(beforeX));
  if (angle > Math.PI / 2) angle -= Math.PI;
  if (angle < -Math.PI / 2) angle += Math.PI;
  context.save();
  context.translate(x(atX), y(interpolateY(curve, atX)) + screenOffset);
  context.rotate(angle);
  context.font = `750 ${compact ? 9 : 11}px system-ui, sans-serif`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillStyle = color;
  context.fillText(text, 0, 0);
  context.restore();
}

function fillPolygon(plot, points, color) {
  const { context, x, y } = plot;
  context.save();
  context.beginPath();
  points.forEach(([pointX, pointY], index) => {
    if (index === 0) context.moveTo(x(pointX), y(pointY));
    else context.lineTo(x(pointX), y(pointY));
  });
  context.closePath();
  context.fillStyle = color;
  context.fill();
  context.restore();
}

function drawPoint(plot, pointX, pointY, options = {}) {
  const { context, x, y } = plot;
  const px = x(pointX);
  const py = y(pointY);
  context.save();
  context.beginPath();
  context.arc(px, py, options.radius || 5, 0, Math.PI * 2);
  context.fillStyle = options.fill || COLORS.coral;
  context.fill();
  context.lineWidth = options.strokeWidth || 2;
  context.strokeStyle = options.stroke || "white";
  context.stroke();
  context.restore();
}

function drawSelection(plot, pointX, pointY, options = {}) {
  const { context, x, y, margins, plotWidth, plotHeight } = plot;
  const px = x(pointX);
  const py = y(pointY);
  context.save();
  context.strokeStyle = options.guideColor || COLORS.inkSoft;
  context.globalAlpha = 0.42;
  context.lineWidth = 1;
  context.setLineDash([3, 5]);
  context.beginPath();
  context.moveTo(px, margins.top);
  context.lineTo(px, margins.top + plotHeight);
  context.moveTo(margins.left, py);
  context.lineTo(margins.left + plotWidth, py);
  context.stroke();
  context.globalAlpha = 1;
  drawPoint(plot, pointX, pointY, { radius: 6, fill: options.pointColor || COLORS.coral, strokeWidth: 2.5 });
  context.restore();
}

function canvasPosition(event, canvas) {
  const rect = canvas.getBoundingClientRect();
  return { x: event.clientX - rect.left, y: event.clientY - rect.top };
}

function installCanvasPicker(canvas, draw, update, xLimits, yLimits) {
  canvas.addEventListener("pointerdown", (event) => {
    draw();
    const plot = canvas._plot;
    if (!plot) return;
    const point = canvasPosition(event, canvas);
    const x = clamp(plot.valueX(point.x), xLimits[0], xLimits[1]);
    const y = clamp(plot.valueY(point.y), yLimits[0], yLimits[1]);
    if (point.x < plot.margins.left || point.x > plot.margins.left + plot.plotWidth || point.y < plot.margins.top || point.y > plot.margins.top + plot.plotHeight) return;
    update(x, y);
  });
}

const redrawers = new Set();
let resizeFrame = null;
function registerRedraw(canvas, redraw) {
  redrawers.add(redraw);
  if ("ResizeObserver" in window) {
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(resizeFrame);
      resizeFrame = requestAnimationFrame(() => redrawers.forEach((render) => render()));
    });
    observer.observe(canvas);
  }
}

// ---------------------------------------------------------------------------
// Section 1: water

const WATER_POINTS = {
  triple: {
    label: "Triple point",
    temperature: 0.01,
    pressure: 0.00611657,
    temperatureText: "0.01 °C",
    pressureText: "0.006116 bar",
    phases: "Ice + liquid + vapour",
    copy: "Ice, liquid water, and vapour coexist in equilibrium."
  },
  "normal-melt": {
    label: "Normal melting point",
    temperature: 0,
    pressure: 1.01325,
    temperatureText: "≈ 0 °C",
    pressureText: "1.01325 bar",
    phases: "Ice + liquid",
    copy: "At standard atmospheric pressure, ice and liquid water coexist near 0 °C."
  },
  "normal-boil": {
    label: "Normal boiling point",
    temperature: 100,
    pressure: 1.01325,
    temperatureText: "100 °C",
    pressureText: "1.01325 bar",
    phases: "Liquid + vapour",
    copy: "At standard atmospheric pressure, liquid water and vapour coexist at 100 °C."
  },
  critical: {
    label: "Critical point",
    temperature: 373.946,
    pressure: 220.64,
    temperatureText: "373.946 °C",
    pressureText: "220.64 bar",
    phases: "Critical fluid state",
    copy: "The liquid–vapour boundary ends here; above both the critical temperature and pressure lies one supercritical fluid."
  }
};

const WATER_SUBLIMATION = [[-60, 0.00001], [-45, 0.00006], [-30, 0.00038], [-15, 0.0019], [0.01, 0.00611657]];
const WATER_VAPORIZATION = [[0.01, 0.00611657], [25, 0.0317], [50, 0.1235], [75, 0.3856], [100, 1.01325], [150, 4.76], [200, 15.55], [250, 39.76], [300, 85.88], [350, 165.3], [373.946, 220.64]];
const WATER_FUSION = [[0.01, 0.00611657], [0, 1.01325], [-0.74, 100], [-1.1, 150], [-2.2, 300]];
let waterSelection = "triple";

function drawWaterChart() {
  const canvas = $("#water-chart");
  const { context, width, height } = fitCanvas(canvas);
  const compact = width < 520;
  const margins = { left: compact ? 58 : 72, right: compact ? 14 : 26, top: 24, bottom: compact ? 50 : 58 };
  const plotWidth = width - margins.left - margins.right;
  const plotHeight = height - margins.top - margins.bottom;
  const xDomain = [-60, 430];
  const logDomain = [-5, Math.log10(300)];
  const x = (value) => margins.left + ((value - xDomain[0]) / (xDomain[1] - xDomain[0])) * plotWidth;
  const y = (pressure) => margins.top + (1 - (Math.log10(pressure) - logDomain[0]) / (logDomain[1] - logDomain[0])) * plotHeight;

  context.fillStyle = "#f9f7ff";
  context.fillRect(margins.left, margins.top, plotWidth, plotHeight);

  const vaporCurve = WATER_VAPORIZATION.map(([temperature, pressure]) => [x(temperature), y(pressure)]);
  context.save();
  context.beginPath();
  context.moveTo(margins.left, margins.top + plotHeight);
  context.lineTo(margins.left, y(WATER_SUBLIMATION[0][1]));
  WATER_SUBLIMATION.forEach(([temperature, pressure]) => context.lineTo(x(temperature), y(pressure)));
  vaporCurve.slice(1).forEach(([px, py]) => context.lineTo(px, py));
  context.lineTo(x(430), margins.top + plotHeight);
  context.closePath();
  context.fillStyle = "rgba(240, 80, 48, 0.09)";
  context.fill();
  context.restore();

  context.save();
  context.beginPath();
  context.moveTo(x(0.01), y(0.00611657));
  WATER_FUSION.slice(1).forEach(([temperature, pressure]) => context.lineTo(x(temperature), y(pressure)));
  context.lineTo(margins.left, margins.top);
  context.lineTo(margins.left, y(WATER_SUBLIMATION[0][1]));
  WATER_SUBLIMATION.forEach(([temperature, pressure]) => context.lineTo(x(temperature), y(pressure)));
  context.closePath();
  context.fillStyle = "rgba(56, 102, 148, 0.13)";
  context.fill();
  context.restore();

  context.save();
  context.beginPath();
  context.moveTo(x(0.01), y(0.00611657));
  WATER_VAPORIZATION.slice(1).forEach(([temperature, pressure]) => context.lineTo(x(temperature), y(pressure)));
  context.lineTo(x(430), margins.top);
  context.lineTo(x(-11.5), margins.top);
  [...WATER_FUSION].reverse().forEach(([temperature, pressure]) => context.lineTo(x(temperature), y(pressure)));
  context.closePath();
  context.fillStyle = "rgba(31, 115, 94, 0.12)";
  context.fill();
  context.restore();

  const xTicks = compact ? [-50, 0, 100, 200, 300, 400] : [-50, 0, 50, 100, 200, 300, 400];
  const pressureTicks = [0.00001, 0.001, 0.01, 0.1, 1, 10, 100];
  context.font = `${compact ? 9 : 11}px system-ui, sans-serif`;
  context.textBaseline = "top";
  context.textAlign = "center";
  xTicks.forEach((tick) => {
    const px = x(tick);
    context.strokeStyle = COLORS.grid;
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(px, margins.top);
    context.lineTo(px, margins.top + plotHeight);
    context.stroke();
    context.fillStyle = COLORS.muted;
    context.fillText(String(tick), px, margins.top + plotHeight + 8);
  });
  context.textAlign = "right";
  context.textBaseline = "middle";
  pressureTicks.forEach((tick) => {
    const py = y(tick);
    context.strokeStyle = COLORS.grid;
    context.beginPath();
    context.moveTo(margins.left, py);
    context.lineTo(margins.left + plotWidth, py);
    context.stroke();
    context.fillStyle = COLORS.muted;
    context.fillText(tick < 0.01 ? tick.toExponential(0) : String(tick), margins.left - 7, py);
  });
  context.strokeStyle = COLORS.ink;
  context.lineWidth = 1.6;
  context.strokeRect(margins.left, margins.top, plotWidth, plotHeight);

  const drawWaterBoundary = (points, color) => {
    context.save();
    context.beginPath();
    points.forEach(([temperature, pressure], index) => {
      if (index === 0) context.moveTo(x(temperature), y(pressure));
      else context.lineTo(x(temperature), y(pressure));
    });
    context.strokeStyle = color;
    context.lineWidth = 3;
    context.stroke();
    context.restore();
  };
  drawWaterBoundary(WATER_SUBLIMATION, COLORS.blue);
  drawWaterBoundary(WATER_VAPORIZATION, COLORS.coral);
  drawWaterBoundary(WATER_FUSION, COLORS.teal);

  context.font = `800 ${compact ? 13 : 16}px system-ui, sans-serif`;
  context.fillStyle = COLORS.blue;
  context.textAlign = "center";
  context.fillText("ICE", x(-35), y(2));
  context.fillStyle = COLORS.teal;
  context.fillText("LIQUID", x(90), y(18));
  context.fillStyle = COLORS.coral;
  context.fillText("VAPOUR", x(235), y(0.08));
  context.fillStyle = COLORS.lavender;
  context.font = `750 ${compact ? 9 : 11}px system-ui, sans-serif`;
  context.fillText("SUPERCRITICAL", x(395), y(250));

  context.fillStyle = COLORS.ink;
  context.textAlign = "center";
  context.textBaseline = "bottom";
  context.font = `700 ${compact ? 10 : 12}px system-ui, sans-serif`;
  context.fillText("Temperature (°C)", margins.left + plotWidth / 2, height - 3);
  context.save();
  context.translate(compact ? 10 : 14, margins.top + plotHeight / 2);
  context.rotate(-Math.PI / 2);
  context.fillText("Pressure (bar, logarithmic)", 0, 0);
  context.restore();

  const selected = WATER_POINTS[waterSelection];
  Object.entries(WATER_POINTS).forEach(([key, point]) => {
    const active = key === waterSelection;
    context.beginPath();
    context.arc(x(point.temperature), y(point.pressure), active ? 6 : 4, 0, Math.PI * 2);
    context.fillStyle = active ? COLORS.coral : COLORS.ink;
    context.fill();
    context.lineWidth = 2;
    context.strokeStyle = "white";
    context.stroke();
  });
  context.strokeStyle = COLORS.inkSoft;
  context.globalAlpha = 0.42;
  context.lineWidth = 1.2;
  context.setLineDash([4, 4]);
  context.beginPath();
  context.moveTo(x(selected.temperature), margins.top);
  context.lineTo(x(selected.temperature), margins.top + plotHeight);
  context.moveTo(margins.left, y(selected.pressure));
  context.lineTo(margins.left + plotWidth, y(selected.pressure));
  context.stroke();
  context.globalAlpha = 1;
}

function setWaterSelection(key) {
  waterSelection = key;
  const selected = WATER_POINTS[key];
  $$("[data-water-point]").forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.waterPoint === key)));
  $("#water-reading-title").textContent = selected.label;
  $("#water-reading-copy").textContent = selected.copy;
  $("#water-temperature").textContent = selected.temperatureText;
  $("#water-pressure").textContent = selected.pressureText;
  $("#water-phases").textContent = selected.phases;
  drawWaterChart();
}

$$("[data-water-point]").forEach((button) => button.addEventListener("click", () => setWaterSelection(button.dataset.waterPoint)));

// ---------------------------------------------------------------------------
// Section 2: isomorphous system

const CU_NI_TRACE_SEGMENTS = new Map(CU_NI_TRACE_SOURCE.segments.map((segment) => [segment.id, segment]));
const ISO_LIQUIDUS = sampleTraceSourceSegment(CU_NI_TRACE_SEGMENTS, "liquidus", 240);
const ISO_SOLIDUS = sampleTraceSourceSegment(CU_NI_TRACE_SEGMENTS, "solidus", 240);
const ISO_COPPER_MELTING = 1084.6;
const ISO_NICKEL_MELTING = 1454.85;
const isoState = { composition: 35, temperature: 1250 };
let currentIsoResult = null;

function classifyIso(composition, temperature) {
  if (composition <= 0.05) {
    return temperature > ISO_COPPER_MELTING
      ? { region: "Liquid", badge: "Single phase", summary: "Pure copper is above its melting point.", fractions: { liquid: 1, solid: 0 } }
      : { region: "α solid solution", badge: "Single phase", summary: "Pure copper is below its melting point.", fractions: { liquid: 0, solid: 1 } };
  }
  if (composition >= 99.95) {
    return temperature > ISO_NICKEL_MELTING
      ? { region: "Liquid", badge: "Single phase", summary: "Pure nickel is above its melting point.", fractions: { liquid: 1, solid: 0 } }
      : { region: "α solid solution", badge: "Single phase", summary: "Pure nickel is below its melting point.", fractions: { liquid: 0, solid: 1 } };
  }
  const liquidus = interpolateY(ISO_LIQUIDUS, composition);
  const solidus = interpolateY(ISO_SOLIDUS, composition);
  const tolerance = 0.75;
  if (temperature > liquidus + tolerance) {
    return { region: "Liquid", badge: "Single phase", summary: "The alloy is entirely liquid.", fractions: { liquid: 1, solid: 0 } };
  }
  if (temperature < solidus - tolerance) {
    return { region: "α solid solution", badge: "Single phase", summary: "The alloy is entirely α solid solution.", fractions: { liquid: 0, solid: 1 } };
  }
  const liquidComposition = interpolateX(ISO_LIQUIDUS, temperature);
  const solidComposition = interpolateX(ISO_SOLIDUS, temperature);
  if (liquidComposition === null || solidComposition === null) {
    return temperature >= ISO_NICKEL_MELTING
      ? { region: "Liquid", badge: "Single phase", summary: "The alloy is entirely liquid.", fractions: { liquid: 1, solid: 0 } }
      : { region: "α solid solution", badge: "Single phase", summary: "The alloy is entirely α solid solution.", fractions: { liquid: 0, solid: 1 } };
  }
  const fractions = leverFractions(composition, liquidComposition, solidComposition);
  const onBoundary = Math.abs(temperature - liquidus) <= tolerance ? "On liquidus" : Math.abs(temperature - solidus) <= tolerance ? "On solidus" : "Two phases";
  return {
    region: "Liquid + α",
    badge: onBoundary,
    summary: "The tie line meets the liquidus at C_L and the solidus at C_α.",
    liquidComposition,
    solidComposition,
    fractions: { liquid: fractions.left, solid: fractions.right, indeterminate: fractions.indeterminate }
  };
}

function drawIsoChart() {
  const canvas = $("#iso-chart");
  const plot = makePlot(canvas, [0, 100], [1050, 1500]);
  canvas._plot = plot;
  drawAxes(plot, {
    xTicks: plot.compact ? [0, 25, 50, 75, 100] : [0, 20, 40, 60, 80, 100],
    yTicks: [1085, 1200, 1300, 1400, 1455, 1500],
    xLabel: "Composition (wt% Ni)",
    yLabel: "Temperature (°C)"
  });

  const lens = [...ISO_LIQUIDUS, ...[...ISO_SOLIDUS].reverse()];
  fillPolygon(plot, lens, "rgba(213, 144, 24, 0.13)");
  fillPolygon(plot, [[0, 1500], [100, 1500], ...[...ISO_LIQUIDUS].reverse()], "rgba(240, 80, 48, 0.07)");
  fillPolygon(plot, [[0, 1050], ...ISO_SOLIDUS, [100, 1050]], "rgba(56, 102, 148, 0.08)");
  pathLine(plot, ISO_LIQUIDUS, { color: COLORS.coral, width: 3 });
  pathLine(plot, ISO_SOLIDUS, { color: COLORS.blue, width: 3 });
  [[0, ISO_COPPER_MELTING], [100, ISO_NICKEL_MELTING]].forEach(([composition, temperature]) => {
    drawPoint(plot, composition, temperature, { radius: 3.2, fill: COLORS.paper, stroke: COLORS.ink, strokeWidth: 1.5 });
  });

  const { context, x, y, compact } = plot;
  context.font = `800 ${compact ? 11 : 14}px system-ui, sans-serif`;
  context.textAlign = "center";
  context.fillStyle = COLORS.coral;
  context.fillText("LIQUID", x(45), y(1430));
  context.fillStyle = COLORS.amber;
  context.fillText("L + α", x(49), y(1305));
  context.fillStyle = COLORS.blue;
  context.fillText("FCC α SOLID SOLUTION", x(52), y(1135));
  drawCurveLabel(plot, "LIQUIDUS", ISO_LIQUIDUS, 25, COLORS.coral, -11);
  drawCurveLabel(plot, "SOLIDUS", ISO_SOLIDUS, 67, COLORS.blue, 13);

  currentIsoResult = classifyIso(isoState.composition, isoState.temperature);
  if (currentIsoResult.liquidComposition !== undefined) {
    const left = currentIsoResult.liquidComposition;
    const right = currentIsoResult.solidComposition;
    context.strokeStyle = COLORS.coral;
    context.lineWidth = 2.4;
    context.setLineDash([7, 5]);
    context.beginPath();
    context.moveTo(x(left), y(isoState.temperature));
    context.lineTo(x(right), y(isoState.temperature));
    context.stroke();
    context.setLineDash([]);
    drawPoint(plot, left, isoState.temperature, { fill: COLORS.coral, radius: 5 });
    drawPoint(plot, right, isoState.temperature, { fill: COLORS.blue, radius: 5 });
    context.font = `800 ${compact ? 9 : 11}px system-ui, sans-serif`;
    context.textAlign = "center";
    context.fillStyle = COLORS.coral;
    context.fillText("Cₗ", x(left), y(isoState.temperature) - 12);
    context.fillStyle = COLORS.blue;
    context.fillText("Cα", x(right), y(isoState.temperature) - 12);
  }
  drawSelection(plot, isoState.composition, isoState.temperature);
}

function updateIso({ announce = true } = {}) {
  isoState.composition = Number($("#iso-composition").value);
  isoState.temperature = Number($("#iso-temperature").value);
  const result = classifyIso(isoState.composition, isoState.temperature);
  currentIsoResult = result;
  $("#iso-composition-value").textContent = `${isoState.composition.toFixed(1)} wt% Ni`;
  $("#iso-temperature-value").textContent = `${isoState.temperature.toFixed(0)} °C`;
  $("#iso-state-badge").textContent = result.badge;
  $("#iso-region").textContent = result.region;
  $("#iso-guidance").textContent = result.summary;

  if (result.liquidComposition !== undefined) {
    $("#iso-liquid-composition").textContent = `${result.liquidComposition.toFixed(1)} wt% Ni`;
    $("#iso-solid-composition").textContent = `${result.solidComposition.toFixed(1)} wt% Ni`;
    $("#iso-liquid-fraction").textContent = result.fractions.indeterminate ? "Indeterminate at transition" : percent(result.fractions.liquid);
    $("#iso-solid-fraction").textContent = result.fractions.indeterminate ? "Indeterminate at transition" : percent(result.fractions.solid);
    if (result.fractions.indeterminate) $("#iso-guidance").textContent = "At a pure-component melting point, composition alone cannot determine the amounts; heat added or removed controls reaction progress.";
    const leverPosition = ((isoState.composition - result.liquidComposition) / (result.solidComposition - result.liquidComposition)) * 100;
    $("#iso-lever-point").style.left = `${clamp(leverPosition, 0, 100)}%`;
  } else {
    const liquid = result.fractions.liquid === 1;
    $("#iso-liquid-composition").textContent = liquid ? `${isoState.composition.toFixed(1)} wt% Ni` : "Not present";
    $("#iso-solid-composition").textContent = liquid ? "Not present" : `${isoState.composition.toFixed(1)} wt% Ni`;
    $("#iso-liquid-fraction").textContent = percent(result.fractions.liquid);
    $("#iso-solid-fraction").textContent = percent(result.fractions.solid);
    $("#iso-lever-point").style.left = liquid ? "0%" : "100%";
  }
  if (announce) $("#iso-status").textContent = `${result.region} at ${isoState.composition.toFixed(1)} wt% Ni and ${isoState.temperature.toFixed(0)} °C.`;
  drawIsoChart();
}

function setIsoFromChart(composition, temperature) {
  $("#iso-composition").value = composition.toFixed(1);
  $("#iso-temperature").value = temperature.toFixed(0);
  updateIso();
}

$("#iso-composition").addEventListener("input", () => updateIso({ announce: false }));
$("#iso-composition").addEventListener("change", () => updateIso());
$("#iso-temperature").addEventListener("input", () => updateIso({ announce: false }));
$("#iso-temperature").addEventListener("change", () => updateIso());
$("#iso-reset").addEventListener("click", () => {
  $("#iso-composition").value = "35";
  $("#iso-temperature").value = "1250";
  updateIso();
});
installCanvasPicker($("#iso-chart"), drawIsoChart, setIsoFromChart, [0, 100], [1050, 1500]);

// Fraction conversion quiz

const QUIZ_PROBLEMS = [
  { direction: "volume-to-weight", input: 35, densityA: 8.9, densityB: 2.7 },
  { direction: "weight-to-volume", input: 62, densityA: 7.8, densityB: 2.5 },
  { direction: "volume-to-weight", input: 40, densityA: 2.7, densityB: 7.8 },
  { direction: "weight-to-volume", input: 28, densityA: 4.5, densityB: 8.2 },
  { direction: "volume-to-weight", input: 55, densityA: 6.4, densityB: 3.2 },
  { direction: "weight-to-volume", input: 48, densityA: 1.8, densityB: 7.1 }
];
let quizIndex = 0;
let quizAttempts = 0;
let quizCorrect = 0;
let quizAnswered = false;

function quizSolution(problem) {
  const fractionA = problem.input / 100;
  if (problem.direction === "volume-to-weight") {
    return (fractionA * problem.densityA) / (fractionA * problem.densityA + (1 - fractionA) * problem.densityB);
  }
  const specificA = fractionA / problem.densityA;
  const specificB = (1 - fractionA) / problem.densityB;
  return specificA / (specificA + specificB);
}

function renderQuizProblem() {
  const problem = QUIZ_PROBLEMS[quizIndex];
  const volumeToWeight = problem.direction === "volume-to-weight";
  $("#quiz-direction").textContent = volumeToWeight ? "Volume → weight" : "Weight → volume";
  $("#quiz-question").innerHTML = `Phase A is <strong>${problem.input.toFixed(1)} ${volumeToWeight ? "vol%" : "wt%"}</strong>. Given &rho;<sub>A</sub> = ${problem.densityA.toFixed(2)} g/cm<sup>3</sup> and &rho;<sub>B</sub> = ${problem.densityB.toFixed(2)} g/cm<sup>3</sup>, find the ${volumeToWeight ? "weight" : "volume"} fraction of A.`;
  $("#quiz-answer").value = "";
  $("#quiz-answer").removeAttribute("aria-invalid");
  $("#quiz-feedback").className = "quiz-feedback";
  $("#quiz-feedback").textContent = "Enter your answer to the nearest 0.1%.";
  quizAnswered = false;
}

$("#fraction-quiz-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const input = $("#quiz-answer");
  const answer = Number(input.value);
  if (!Number.isFinite(answer) || input.value.trim() === "") {
    input.setAttribute("aria-invalid", "true");
    $("#quiz-feedback").className = "quiz-feedback incorrect";
    $("#quiz-feedback").textContent = "Enter a percentage from 0 to 100.";
    input.focus();
    return;
  }
  const problem = QUIZ_PROBLEMS[quizIndex];
  const solution = quizSolution(problem) * 100;
  const isCorrect = Math.abs(answer - solution) <= 0.5;
  if (!quizAnswered) {
    quizAttempts += 1;
    if (isCorrect) quizCorrect += 1;
    quizAnswered = true;
  }
  input.setAttribute("aria-invalid", String(!isCorrect));
  $("#quiz-score").textContent = `${quizCorrect} / ${quizAttempts} correct`;
  $("#quiz-feedback").className = `quiz-feedback ${isCorrect ? "correct" : "incorrect"}`;
  const fraction = problem.input / 100;
  const worked = problem.direction === "volume-to-weight"
    ? `(${fraction.toFixed(3)} × ${problem.densityA.toFixed(2)}) ÷ [(${fraction.toFixed(3)} × ${problem.densityA.toFixed(2)}) + (${(1 - fraction).toFixed(3)} × ${problem.densityB.toFixed(2)})]`
    : `(${fraction.toFixed(3)} ÷ ${problem.densityA.toFixed(2)}) ÷ [(${fraction.toFixed(3)} ÷ ${problem.densityA.toFixed(2)}) + (${(1 - fraction).toFixed(3)} ÷ ${problem.densityB.toFixed(2)})]`;
  $("#quiz-feedback").textContent = `${isCorrect ? "Correct." : "Not quite."} ${worked} = ${solution.toFixed(1)}%.`;
});

$("#quiz-new").addEventListener("click", () => {
  quizIndex = (quizIndex + 1) % QUIZ_PROBLEMS.length;
  renderQuizProblem();
  $("#quiz-answer").focus();
});

// ---------------------------------------------------------------------------
// Shared schematic microstructure drawing

function pseudoRandom(seed) {
  const value = Math.sin(seed * 91.733 + 17.17) * 43758.5453;
  return value - Math.floor(value);
}

function prepareMicrostructure(canvas, background = "#f3eee2") {
  const surface = fitCanvas(canvas);
  surface.context.fillStyle = background;
  surface.context.fillRect(0, 0, surface.width, surface.height);
  return surface;
}

function drawGrains(context, width, height, palette, seed = 1) {
  const columns = width < 340 ? 4 : 5;
  const rows = 3;
  const cellWidth = width / columns;
  const cellHeight = height / rows;
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const index = row * columns + column;
      const left = column * cellWidth;
      const top = row * cellHeight;
      const jitterX = cellWidth * 0.14;
      const jitterY = cellHeight * 0.14;
      const points = [
        [left + (pseudoRandom(seed + index * 7) - 0.5) * jitterX, top + (pseudoRandom(seed + index * 11) - 0.5) * jitterY],
        [left + cellWidth + (pseudoRandom(seed + index * 13) - 0.5) * jitterX, top + (pseudoRandom(seed + index * 17) - 0.5) * jitterY],
        [left + cellWidth + (pseudoRandom(seed + index * 19) - 0.5) * jitterX, top + cellHeight + (pseudoRandom(seed + index * 23) - 0.5) * jitterY],
        [left + (pseudoRandom(seed + index * 29) - 0.5) * jitterX, top + cellHeight + (pseudoRandom(seed + index * 31) - 0.5) * jitterY]
      ];
      context.beginPath();
      points.forEach(([pointX, pointY], pointIndex) => {
        if (pointIndex === 0) context.moveTo(pointX, pointY);
        else context.lineTo(pointX, pointY);
      });
      context.closePath();
      context.fillStyle = palette[index % palette.length];
      context.fill();
      context.strokeStyle = "rgba(46, 42, 116, 0.45)";
      context.lineWidth = 1.4;
      context.stroke();
    }
  }
}

function drawLamellae(context, width, height, colors, spacing = 14) {
  context.fillStyle = colors[0];
  context.fillRect(0, 0, width, height);
  context.save();
  context.strokeStyle = colors[1];
  context.lineWidth = Math.max(4, spacing * 0.46);
  for (let offset = -height; offset < width + height; offset += spacing) {
    context.beginPath();
    context.moveTo(offset, height);
    context.lineTo(offset + height, 0);
    context.stroke();
  }
  context.restore();
  context.strokeStyle = "rgba(46, 42, 116, 0.18)";
  context.lineWidth = 1;
  for (let offset = 0; offset < width; offset += width / 5) {
    context.beginPath();
    context.moveTo(offset, 0);
    context.bezierCurveTo(offset + 18, height * 0.35, offset - 15, height * 0.65, offset + 8, height);
    context.stroke();
  }
}

function drawDendrites(context, width, height, color, count = 6) {
  context.save();
  context.strokeStyle = color;
  context.lineCap = "round";
  for (let index = 0; index < count; index += 1) {
    const originX = ((index + 0.5) / count) * width;
    const originY = height * (0.18 + pseudoRandom(index + 8) * 0.64);
    const length = height * (0.22 + pseudoRandom(index + 19) * 0.16);
    context.lineWidth = Math.max(5, width / 75);
    context.beginPath();
    context.moveTo(originX - length * 0.65, originY + length * 0.45);
    context.lineTo(originX + length * 0.65, originY - length * 0.45);
    context.stroke();
    context.lineWidth = Math.max(2.5, width / 155);
    for (let arm = -2; arm <= 2; arm += 1) {
      const t = (arm + 2.5) / 5;
      const x = originX - length * 0.65 + t * length * 1.3;
      const y = originY + length * 0.45 - t * length * 0.9;
      context.beginPath();
      context.moveTo(x, y);
      context.lineTo(x - length * 0.3, y - length * 0.25);
      context.moveTo(x, y);
      context.lineTo(x + length * 0.3, y + length * 0.25);
      context.stroke();
    }
  }
  context.restore();
}

function drawPrimaryIslands(context, width, height, color, count = 7, seed = 1) {
  context.save();
  context.fillStyle = color;
  context.strokeStyle = "rgba(46, 42, 116, 0.48)";
  context.lineWidth = 1.5;
  for (let index = 0; index < count; index += 1) {
    const centerX = width * (0.08 + pseudoRandom(seed + index * 7) * 0.84);
    const centerY = height * (0.1 + pseudoRandom(seed + index * 13) * 0.8);
    const radiusX = width * (0.035 + pseudoRandom(seed + index * 17) * 0.035);
    const radiusY = height * (0.06 + pseudoRandom(seed + index * 23) * 0.05);
    context.beginPath();
    for (let step = 0; step <= 10; step += 1) {
      const angle = (step / 10) * Math.PI * 2;
      const roughness = 0.82 + pseudoRandom(seed + index * 31 + step) * 0.32;
      const x = centerX + Math.cos(angle) * radiusX * roughness;
      const y = centerY + Math.sin(angle) * radiusY * roughness;
      if (step === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    }
    context.closePath();
    context.fill();
    context.stroke();
  }
  context.restore();
}

function drawMicroLegend(context, width, height, items) {
  const fontSize = width < 360 ? 9 : 10;
  context.save();
  context.font = `750 ${fontSize}px system-ui, sans-serif`;
  context.textBaseline = "middle";
  let x = 10;
  const y = height - 15;
  items.forEach((item) => {
    context.fillStyle = "rgba(255, 255, 255, 0.9)";
    const textWidth = context.measureText(item.label).width;
    context.fillRect(x - 4, y - 10, textWidth + 28, 20);
    context.fillStyle = item.color;
    context.fillRect(x, y - 5, 10, 10);
    context.strokeStyle = "rgba(46,42,116,.35)";
    context.strokeRect(x, y - 5, 10, 10);
    context.fillStyle = COLORS.ink;
    context.fillText(item.label, x + 15, y);
    x += textWidth + 32;
  });
  context.restore();
}

function drawMicroLabel(context, text) {
  context.save();
  context.font = "800 10px system-ui, sans-serif";
  context.fillStyle = "rgba(255,255,255,0.88)";
  context.fillRect(8, 8, context.measureText(text).width + 18, 24);
  context.fillStyle = COLORS.ink;
  context.textBaseline = "middle";
  context.fillText(text.toUpperCase(), 17, 20);
  context.restore();
}

function setMicrostructureMedia(system, micrograph, schematicDescription) {
  const image = $(`#${system}-micrograph`);
  const canvas = $(`#${system}-microstructure`);
  const kind = $(`#${system}-micro-kind`);
  const caption = $(`#${system}-micro-caption`);

  const showSchematic = (label = "Procedural schematic · not to scale", state = "schematic") => {
    image.hidden = true;
    canvas.hidden = false;
    kind.textContent = label;
    caption.textContent = schematicDescription;
    image.dataset.mediaState = state;
  };

  if (micrograph) {
    const showMicrograph = () => {
      image.hidden = false;
      canvas.hidden = true;
      kind.textContent = "AI-generated representative micrograph";
      caption.textContent = micrograph.caption;
      image.dataset.mediaState = "micrograph";
    };
    const currentSource = image.getAttribute("src");
    if (currentSource === micrograph.src && image.complete && image.naturalWidth > 0) {
      image.dataset.requestedAsset = micrograph.src;
      image.alt = micrograph.alt;
      showMicrograph();
      return "micrograph";
    }
    if (image.dataset.failedAsset === micrograph.src) {
      showSchematic("Procedural schematic · image unavailable", "unavailable");
      return "unavailable";
    }
    if (image.dataset.requestedAsset !== micrograph.src) {
      image.dataset.requestedAsset = micrograph.src;
      image.dataset.failedAsset = "";
      image.loading = "eager";
      image.alt = micrograph.alt;
      image.onload = () => {
        if (image.dataset.requestedAsset !== micrograph.src) return;
        showMicrograph();
        const status = $(`#${system}-status`);
        status.textContent = "Representative AI micrograph loaded for the selected state.";
      };
      image.onerror = () => {
        if (image.dataset.requestedAsset !== micrograph.src) return;
        image.dataset.failedAsset = micrograph.src;
        showSchematic("Procedural schematic · image unavailable", "unavailable");
        const status = $(`#${system}-status`);
        status.textContent = "Generated image unavailable; the procedural schematic remains visible.";
      };
      image.src = micrograph.src;
    }
    showSchematic("Procedural schematic · loading micrograph", "loading");
    return "loading";
  }

  image.onload = null;
  image.onerror = null;
  image.dataset.requestedAsset = "";
  image.alt = "";
  showSchematic();
  return "schematic";
}

function microstructureStatus(state) {
  if (state === "micrograph") return "Representative AI micrograph displayed.";
  if (state === "loading") return "Procedural schematic displayed while the representative AI micrograph loads.";
  if (state === "unavailable") return "Generated image unavailable; procedural schematic displayed.";
  return "Procedural microstructure schematic displayed.";
}

// ---------------------------------------------------------------------------
// Section 3: Pb-Sn eutectic system

const PB = {
  eutecticTemperature: 183,
  eutecticComposition: 61.9,
  alphaEutectic: 19.2,
  betaEutectic: 97.5
};
const PB_SN_TRACE_SEGMENTS = new Map(PB_SN_TRACE_SOURCE.segments.map((segment) => [segment.id, segment]));
PB.leftLiquidus = sampleTraceSourceSegment(PB_SN_TRACE_SEGMENTS, "left-liquidus", 240);
PB.rightLiquidus = sampleTraceSourceSegment(PB_SN_TRACE_SEGMENTS, "right-liquidus", 180);
PB.leftSolidus = sampleTraceSourceSegment(PB_SN_TRACE_SEGMENTS, "left-solidus", 180);
PB.rightSolidus = sampleTraceSourceSegment(PB_SN_TRACE_SEGMENTS, "right-solidus", 180);
PB.leftSolvus = sampleTraceSourceSegment(PB_SN_TRACE_SEGMENTS, "left-solvus", 180);
PB.rightSolvus = sampleTraceSourceSegment(PB_SN_TRACE_SEGMENTS, "right-solvus", 180);
PB.eutectic = sampleTraceSourceSegment(PB_SN_TRACE_SEGMENTS, "eutectic", 2);
const pbState = { composition: 40, temperature: 150, mode: "micro" };
let currentPbResult = null;

function pbSingle(region, phase, summary) {
  return { region, phases: [phase], summary, single: true };
}

function pbTwoPhase(region, leftName, rightName, leftComposition, rightComposition, composition, summary) {
  const fractions = leverFractions(composition, leftComposition, rightComposition);
  return {
    region,
    phases: [leftName, rightName],
    summary,
    single: false,
    leftName,
    rightName,
    leftComposition,
    rightComposition,
    leftFraction: fractions.left,
    rightFraction: fractions.right,
    indeterminate: fractions.indeterminate
  };
}

function classifyPb(composition, temperature) {
  if (composition <= 0.05) {
    return temperature > 327.5
      ? pbSingle("Liquid", "Liquid", "Pure lead is above its melting point.")
      : pbSingle("α", "α", "Pure lead is below its melting point.");
  }
  if (composition >= 99.95) {
    return temperature > 231.9
      ? pbSingle("Liquid", "Liquid", "Pure tin is above its melting point.")
      : pbSingle("β", "β", "Pure tin is below its melting point.");
  }
  const eutecticTolerance = 0.75;
  if (Math.abs(temperature - PB.eutecticTemperature) <= eutecticTolerance && between(composition, PB.alphaEutectic, PB.betaEutectic)) {
    return {
      region: "Eutectic invariant",
      phases: ["Liquid", "α", "β"],
      summary: "Liquid, α, and β can coexist at the invariant temperature; a single lever equation cannot determine reaction progress.",
      invariant: true,
      leftComposition: PB.alphaEutectic,
      middleComposition: PB.eutecticComposition,
      rightComposition: PB.betaEutectic
    };
  }

  const liquidus = composition <= PB.eutecticComposition
    ? interpolateY(PB.leftLiquidus, composition)
    : interpolateY(PB.rightLiquidus, composition);
  if (temperature > liquidus + 0.8) return pbSingle("Liquid", "Liquid", "A homogeneous liquid solution is stable.");

  if (temperature > PB.eutecticTemperature) {
    if (composition < PB.eutecticComposition) {
      if (composition <= PB.alphaEutectic) {
        const solidus = interpolateY(PB.leftSolidus, composition);
        if (temperature < solidus - 0.8) return pbSingle("α", "α", "Pb-rich α solid solution is stable.");
      }
      const alphaComposition = interpolateX(PB.leftSolidus, temperature);
      const liquidComposition = interpolateX(PB.leftLiquidus, temperature);
      if (alphaComposition !== null && liquidComposition !== null) {
        return pbTwoPhase("α + liquid", "α", "Liquid", alphaComposition, liquidComposition, composition, "Pb-rich α solid coexists with liquid.");
      }
    } else {
      if (composition >= PB.betaEutectic) {
        const solidus = interpolateY(PB.rightSolidus, composition);
        if (temperature < solidus - 0.8) return pbSingle("β", "β", "Sn-rich β solid solution is stable.");
      }
      const liquidComposition = interpolateX(PB.rightLiquidus, temperature);
      const betaComposition = interpolateX(PB.rightSolidus, temperature);
      if (liquidComposition !== null && betaComposition !== null) {
        return pbTwoPhase("Liquid + β", "Liquid", "β", liquidComposition, betaComposition, composition, "Liquid coexists with Sn-rich β solid.");
      }
    }
  }

  if (temperature < PB.eutecticTemperature) {
    const alphaLimit = interpolateX(PB.leftSolvus, temperature);
    const betaLimit = interpolateX(PB.rightSolvus, temperature);
    if (composition < alphaLimit - 0.1) return pbSingle("α", "α", "Pb-rich α solid solution is stable.");
    if (composition > betaLimit + 0.1) return pbSingle("β", "β", "Sn-rich β solid solution is stable.");
    return pbTwoPhase("α + β", "α", "β", alphaLimit, betaLimit, composition, "Pb-rich α and Sn-rich β solid solutions coexist.");
  }

  return composition < PB.eutecticComposition
    ? pbSingle("α", "α", "Pb-rich α solid solution is stable.")
    : pbSingle("β", "β", "Sn-rich β solid solution is stable.");
}

function drawPbChart() {
  const canvas = $("#pb-chart");
  const plot = makePlot(canvas, [0, 100], [20, 350]);
  canvas._plot = plot;
  drawAxes(plot, {
    xTicks: plot.compact ? [0, 25, 50, 75, 100] : [0, 20, 40, 60, 80, 100],
    yTicks: [50, 100, 150, 183, 250, 300, 350],
    xLabel: "Composition (wt% Sn)",
    yLabel: "Temperature (°C)"
  });

  fillPolygon(plot, [...PB.leftLiquidus, [PB.alphaEutectic, 183], ...[...PB.leftSolidus].reverse()], "rgba(56, 102, 148, 0.12)");
  fillPolygon(plot, [...PB.rightLiquidus, ...[...PB.rightSolidus].reverse(), [PB.eutecticComposition, 183]], "rgba(103, 87, 168, 0.13)");
  fillPolygon(plot, [...PB.leftSolvus, [PB.betaEutectic, 183], ...PB.rightSolvus.slice(1)], "rgba(213, 144, 24, 0.11)");
  fillPolygon(plot, [[0, 350], [100, 350], ...[...PB.rightLiquidus].reverse(), ...[...PB.leftLiquidus].reverse()], "rgba(240, 80, 48, 0.07)");

  pathLine(plot, PB.leftLiquidus, { color: COLORS.coral, width: 3 });
  pathLine(plot, PB.rightLiquidus, { color: COLORS.coral, width: 3 });
  pathLine(plot, PB.leftSolidus, { color: COLORS.blue, width: 2.6 });
  pathLine(plot, PB.rightSolidus, { color: COLORS.lavender, width: 2.6 });
  pathLine(plot, PB.leftSolvus, { color: COLORS.blue, width: 2.5 });
  pathLine(plot, PB.rightSolvus, { color: COLORS.lavender, width: 2.5 });
  pathLine(plot, PB.eutectic, { color: COLORS.ink, width: 2.4 });

  const { context, x, y, compact } = plot;
  context.font = `800 ${compact ? 10 : 13}px system-ui, sans-serif`;
  context.textAlign = "center";
  context.fillStyle = COLORS.coral;
  context.fillText("LIQUID", x(52), y(305));
  context.fillStyle = COLORS.blue;
  context.fillText("α", x(6), y(175));
  context.fillText("α + L", x(25), y(230));
  context.fillStyle = COLORS.lavender;
  context.fillText("L + β", x(82), y(195));
  context.fillText("β", x(99.6), y(120));
  context.fillStyle = COLORS.amber;
  context.fillText("α + β", x(55), y(95));

  [[0, 327.5], [PB.alphaEutectic, 183], [PB.betaEutectic, 183], [100, 231.9]].forEach(([composition, temperature]) => {
    drawPoint(plot, composition, temperature, { radius: compact ? 2.6 : 3.2, fill: COLORS.paper, stroke: COLORS.ink, strokeWidth: 1.4 });
  });
  drawPoint(plot, PB.eutecticComposition, PB.eutecticTemperature, { radius: 5.5, fill: COLORS.coral });
  context.font = `800 ${compact ? 9 : 11}px system-ui, sans-serif`;
  context.fillStyle = COLORS.ink;
  context.textAlign = "center";
  context.fillText("EUTECTIC", x(PB.eutecticComposition), y(PB.eutecticTemperature) + 17);

  currentPbResult = classifyPb(pbState.composition, pbState.temperature);
  if (pbState.mode === "tie" && !currentPbResult.single && !currentPbResult.invariant) {
    context.strokeStyle = COLORS.coral;
    context.lineWidth = 2.4;
    context.setLineDash([7, 5]);
    context.beginPath();
    context.moveTo(x(currentPbResult.leftComposition), y(pbState.temperature));
    context.lineTo(x(currentPbResult.rightComposition), y(pbState.temperature));
    context.stroke();
    context.setLineDash([]);
    drawPoint(plot, currentPbResult.leftComposition, pbState.temperature, { fill: COLORS.blue });
    drawPoint(plot, currentPbResult.rightComposition, pbState.temperature, { fill: COLORS.lavender });
  }
  if (currentPbResult.invariant && pbState.mode === "tie") {
    context.strokeStyle = COLORS.coral;
    context.lineWidth = 2.4;
    context.beginPath();
    context.moveTo(x(PB.alphaEutectic), y(183));
    context.lineTo(x(PB.betaEutectic), y(183));
    context.stroke();
  }
  drawSelection(plot, pbState.composition, pbState.temperature);
}

function pbMicroDescription(result) {
  if (result.region === "Liquid") return "Homogeneous liquid; no solid grains are present.";
  if (result.region === "α") return "Equiaxed grains of Pb-rich α solid solution.";
  if (result.region === "β") return "Equiaxed grains of Sn-rich β solid solution.";
  if (result.region === "α + liquid") return "Primary α dendrites growing within the remaining liquid.";
  if (result.region === "Liquid + β") return "Primary β dendrites growing within the remaining liquid.";
  if (result.invariant) return "At 183 °C, the remaining eutectic liquid transforms to lamellar α + β.";
  if (result.region === "α + β") {
    if (Math.abs(pbState.composition - PB.eutecticComposition) <= 1) return "Eutectic alloy: a fully lamellar α + β constituent after solidification.";
    if (between(pbState.composition, PB.alphaEutectic, PB.eutecticComposition)) return "Hypoeutectic alloy: primary α plus a lamellar α + β eutectic constituent.";
    if (between(pbState.composition, PB.eutecticComposition, PB.betaEutectic)) return "Hypereutectic alloy: primary β plus a lamellar α + β eutectic constituent.";
    return pbState.composition < PB.alphaEutectic ? "α matrix with β precipitates as solid solubility decreases." : "β matrix with α precipitates as solid solubility decreases.";
  }
  return "Schematic equilibrium microstructure.";
}

function pbMicrographFor(result) {
  const closeToFortyPercentSn = between(pbState.composition, 35, 45);
  if (pbState.mode !== "micro" || result.region !== "α + β" || result.invariant || pbState.temperature >= PB.eutecticTemperature || !closeToFortyPercentSn) return null;
  return {
    src: "assets/pb-sn-eutectic.png",
    alt: "AI-generated grayscale optical micrograph representative of hypoeutectic lead-tin near 40 weight percent tin, with light primary alpha regions in a darker lamellar alpha-beta eutectic constituent.",
    caption: "Representative hypoeutectic Pb–Sn near 40 wt% Sn after slow solidification: light primary α regions within a darker lamellar α + β eutectic constituent. Synthetic teaching image; qualitative morphology only, no scale."
  };
}

function drawPbMicrostructure() {
  const result = currentPbResult || classifyPb(pbState.composition, pbState.temperature);
  const mediaState = setMicrostructureMedia("pb", pbMicrographFor(result), pbMicroDescription(result));
  if (mediaState === "micrograph") return mediaState;
  const canvas = $("#pb-microstructure");
  const { context, width, height } = prepareMicrostructure(canvas);
  const alpha = "#79a9cc";
  const alphaLight = "#b7d2e6";
  const beta = "#9a88c9";
  const betaLight = "#c9bee5";
  const liquid = "#f5b09b";

  if (result.region === "Liquid") {
    context.fillStyle = liquid;
    context.fillRect(0, 0, width, height);
    for (let index = 0; index < 22; index += 1) {
      context.beginPath();
      context.arc(pseudoRandom(index + 2) * width, pseudoRandom(index + 15) * height, 2 + pseudoRandom(index + 27) * 3, 0, Math.PI * 2);
      context.fillStyle = "rgba(255,255,255,.38)";
      context.fill();
    }
    drawMicroLegend(context, width, height, [{ label: "Liquid", color: liquid }]);
  } else if (result.region === "α") {
    drawGrains(context, width, height, [alpha, alphaLight, "#91bbd7"], 3);
    drawMicroLegend(context, width, height, [{ label: "α", color: alpha }]);
  } else if (result.region === "β") {
    drawGrains(context, width, height, [beta, betaLight, "#ad9bd7"], 5);
    drawMicroLegend(context, width, height, [{ label: "β", color: beta }]);
  } else if (result.region === "α + liquid" || result.region === "Liquid + β") {
    context.fillStyle = liquid;
    context.fillRect(0, 0, width, height);
    const solidColor = result.region === "α + liquid" ? alpha : beta;
    drawDendrites(context, width, height, solidColor, 6);
    drawMicroLegend(context, width, height, [{ label: result.region === "α + liquid" ? "α" : "β", color: solidColor }, { label: "Liquid", color: liquid }]);
  } else if (result.invariant) {
    context.fillStyle = liquid;
    context.fillRect(0, 0, width, height);
    context.save();
    context.beginPath();
    context.rect(width * 0.18, 0, width * 0.52, height);
    context.clip();
    drawLamellae(context, width, height, [alphaLight, beta], width < 360 ? 11 : 14);
    context.restore();
    drawMicroLegend(context, width, height, [{ label: "α", color: alphaLight }, { label: "β", color: beta }, { label: "L", color: liquid }]);
  } else if (result.region === "α + β" && pbState.composition < PB.alphaEutectic) {
    drawGrains(context, width, height, [alpha, alphaLight, "#91bbd7"], 4);
    drawPrimaryIslands(context, width, height, beta, 5, 27);
    drawMicroLegend(context, width, height, [{ label: "α matrix", color: alpha }, { label: "β precipitate", color: beta }]);
  } else if (result.region === "α + β" && pbState.composition > PB.betaEutectic) {
    drawGrains(context, width, height, [beta, betaLight, "#ad9bd7"], 6);
    drawPrimaryIslands(context, width, height, alpha, 5, 33);
    drawMicroLegend(context, width, height, [{ label: "β matrix", color: beta }, { label: "α precipitate", color: alpha }]);
  } else {
    drawLamellae(context, width, height, [alphaLight, beta], width < 360 ? 11 : 14);
    if (result.region === "α + β" && Math.abs(pbState.composition - PB.eutecticComposition) > 1) {
      const primaryAlpha = pbState.composition < PB.eutecticComposition;
      drawPrimaryIslands(context, width, height, primaryAlpha ? alpha : betaLight, 7, primaryAlpha ? 7 : 11);
    }
    drawMicroLegend(context, width, height, [{ label: "α", color: alphaLight }, { label: "β", color: beta }]);
  }
  drawMicroLabel(context, "schematic · not to scale");
  canvas.setAttribute("aria-label", `${pbMicroDescription(result)} Schematic and not to scale.`);
  return mediaState;
}

function updatePb({ announce = true } = {}) {
  pbState.composition = Number($("#pb-composition").value);
  pbState.temperature = Number($("#pb-temperature").value);
  const result = classifyPb(pbState.composition, pbState.temperature);
  currentPbResult = result;
  $("#pb-composition-value").textContent = `${pbState.composition.toFixed(1)} wt% Sn`;
  $("#pb-temperature-value").textContent = `${pbState.temperature.toFixed(0)} °C`;
  $("#pb-region").innerHTML = result.region.replaceAll("α", "&alpha;").replaceAll("β", "&beta;");
  $("#pb-summary").textContent = result.summary;
  $("#pb-overall").textContent = `${pbState.composition.toFixed(1)} wt% Sn`;

  if (result.invariant) {
    $("#pb-phase-a-label").innerHTML = "Invariant compositions";
    $("#pb-phase-a").textContent = `α ${PB.alphaEutectic} · L ${PB.eutecticComposition} · β ${PB.betaEutectic}`;
    $("#pb-phase-b-label").textContent = "Reaction";
    $("#pb-phase-b").textContent = "L → α + β";
    $("#pb-fraction-a-label").textContent = "Phase fractions";
    $("#pb-fraction-a").textContent = "Reaction-path dependent";
    $("#pb-fraction-b-label").textContent = "Lever rule";
    $("#pb-fraction-b").textContent = "Use just above/below";
  } else if (result.single) {
    $("#pb-phase-a-label").innerHTML = `Composition, ${phaseVariableMarkup("C", result.phases[0])}`;
    $("#pb-phase-a").textContent = `${pbState.composition.toFixed(1)} wt% Sn`;
    $("#pb-phase-b-label").textContent = "Second phase";
    $("#pb-phase-b").textContent = "Not present";
    $("#pb-fraction-a-label").innerHTML = `Fraction, ${phaseVariableMarkup("W", result.phases[0])}`;
    $("#pb-fraction-a").textContent = "100.0%";
    $("#pb-fraction-b-label").textContent = "Lever rule";
    $("#pb-fraction-b").textContent = "Not needed";
  } else {
    $("#pb-phase-a-label").innerHTML = phaseVariableMarkup("C", result.leftName);
    $("#pb-phase-a").textContent = `${result.leftComposition.toFixed(1)} wt% Sn`;
    $("#pb-phase-b-label").innerHTML = phaseVariableMarkup("C", result.rightName);
    $("#pb-phase-b").textContent = `${result.rightComposition.toFixed(1)} wt% Sn`;
    $("#pb-fraction-a-label").innerHTML = phaseVariableMarkup("W", result.leftName);
    $("#pb-fraction-a").textContent = result.indeterminate ? "Indeterminate at transition" : percent(result.leftFraction);
    $("#pb-fraction-b-label").innerHTML = phaseVariableMarkup("W", result.rightName);
    $("#pb-fraction-b").textContent = result.indeterminate ? "Indeterminate at transition" : percent(result.rightFraction);
  }
  drawPbChart();
  const mediaState = drawPbMicrostructure();
  if (announce) $("#pb-status").textContent = `${result.region} selected at ${pbState.composition.toFixed(1)} wt% Sn and ${pbState.temperature.toFixed(0)} °C. ${microstructureStatus(mediaState)}`;
}

function setPbFromChart(composition, temperature) {
  $("#pb-composition").value = composition.toFixed(1);
  $("#pb-temperature").value = temperature.toFixed(0);
  updatePb();
}

$("#pb-composition").addEventListener("input", () => updatePb({ announce: false }));
$("#pb-composition").addEventListener("change", () => updatePb());
$("#pb-temperature").addEventListener("input", () => updatePb({ announce: false }));
$("#pb-temperature").addEventListener("change", () => updatePb());
installCanvasPicker($("#pb-chart"), drawPbChart, setPbFromChart, [0, 100], [20, 350]);

$$("[data-pb-mode]").forEach((button) => button.addEventListener("click", () => {
  pbState.mode = button.dataset.pbMode;
  $$("[data-pb-mode]").forEach((candidate) => candidate.setAttribute("aria-pressed", String(candidate === button)));
  $("#pb-mode-help").textContent = pbState.mode === "tie"
    ? "Tie-line mode reports equilibrium phase compositions and fractions."
    : "Microstructure mode shows a matching representative micrograph when available, otherwise a schematic.";
  drawPbChart();
  const mediaState = drawPbMicrostructure();
  $("#pb-status").textContent = `${pbState.mode === "tie" ? "Tie-line" : "Microstructure"} mode active. ${microstructureStatus(mediaState)} Click the diagram to inspect a point.`;
}));

// ---------------------------------------------------------------------------
// Section 4: metastable Fe-Fe₃C system

const FE_TRACE_SEGMENTS = new Map(FE_TRACE_SOURCE.segments.map((segment) => [segment.id, segment]));

function evaluateTraceBSpline(segment, parameter) {
  const points = segment.points;
  const degree = Math.min(segment.degree, points.length - 1);
  const knots = segment.knots;
  const start = knots[degree];
  const end = knots[points.length];
  const value = clamp(parameter, start, end);
  if (value >= end) return [...points.at(-1)];

  let span = degree;
  for (let index = degree; index < points.length; index += 1) {
    if (value >= knots[index] && value < knots[index + 1]) {
      span = index;
      break;
    }
  }

  const working = Array.from({ length: degree + 1 }, (_, index) => [...points[span - degree + index]]);
  for (let level = 1; level <= degree; level += 1) {
    for (let index = degree; index >= level; index -= 1) {
      const knotIndex = span - degree + index;
      const denominator = knots[knotIndex + degree - level + 1] - knots[knotIndex];
      const weight = denominator === 0 ? 0 : (value - knots[knotIndex]) / denominator;
      working[index][0] = (1 - weight) * working[index - 1][0] + weight * working[index][0];
      working[index][1] = (1 - weight) * working[index - 1][1] + weight * working[index][1];
    }
  }
  return working[degree];
}

function sampleTraceSourceSegment(segmentMap, segmentId, samples = 180) {
  const segment = segmentMap.get(segmentId);
  if (!segment) throw new Error(`Missing B-spline trace segment: ${segmentId}`);
  return Array.from({ length: samples + 1 }, (_, index) => evaluateTraceBSpline(segment, index / samples));
}

function remapFeTraceCoordinate(value, sourceStart, sourceEnd, targetStart, targetEnd) {
  if (Math.abs(sourceEnd - sourceStart) < 1e-9) return targetStart;
  const ratio = (value - sourceStart) / (sourceEnd - sourceStart);
  return targetStart + ratio * (targetEnd - targetStart);
}

// The reference deliberately exaggerates the dilute-carbon area, so each
// traced curve is normalized between the site's established thermodynamic
// endpoints. This retains the supplied B-spline shape without treating the
// schematic image's global pixel scale as scientific data.
function sampleFeTraceCurve(segmentId, startPoint, endPoint, { reverse = false, samples = 180 } = {}) {
  const segment = FE_TRACE_SEGMENTS.get(segmentId);
  if (!segment) throw new Error(`Missing Fe–C trace segment: ${segmentId}`);
  const sourceStart = segment.points[0];
  const sourceEnd = segment.points.at(-1);
  const sampled = Array.from({ length: samples + 1 }, (_, index) => {
    const [rawX, rawY] = evaluateTraceBSpline(segment, index / samples);
    return [
      remapFeTraceCoordinate(rawX, sourceStart[0], sourceEnd[0], startPoint[0], endPoint[0]),
      remapFeTraceCoordinate(rawY, sourceStart[1], sourceEnd[1], startPoint[1], endPoint[1])
    ];
  });
  return reverse ? sampled.reverse() : sampled;
}

const FE = {
  cementite: 6.67,
  traceSource: FE_TRACE_SOURCE.source,
  traceSegmentCount: FE_TRACE_SOURCE.segments.length,
  deltaLiquidus: sampleFeTraceCurve("liquidus-a-b", [0, 1538], [0.53, 1493]),
  deltaSolidus: sampleFeTraceCurve("delta-liquid-a-h", [0, 1538], [0.09, 1493]),
  deltaGammaDelta: sampleFeTraceCurve("delta-h-n", [0.09, 1493], [0, 1394], { reverse: true }),
  deltaGammaGamma: sampleFeTraceCurve("gamma-j-n", [0.16, 1493], [0, 1394], { reverse: true }),
  gammaSolidus: sampleFeTraceCurve("solidus-j-e", [0.16, 1493], [2.14, 1147]),
  gammaLiquidus: sampleFeTraceCurve("liquidus-b-c", [0.53, 1493], [4.3, 1147]),
  rightLiquidus: sampleFeTraceCurve("liquidus-c-d", [4.3, 1147], [6.67, 1227]),
  a3: sampleFeTraceCurve("a3-g-s", [0, 912], [0.76, 727]),
  alphaHigh: sampleFeTraceCurve("alpha-g-p", [0, 912], [0.022, 727]),
  acm: sampleFeTraceCurve("acm-s-e", [0.76, 727], [2.14, 1147]),
  alphaLow: sampleFeTraceCurve("solvus-p-q", [0.022, 727], [0.006, 20], { reverse: true }),
  peritectic: [[0.09, 1493], [0.16, 1493], [0.53, 1493]],
  eutectic: [[2.14, 1147], [4.3, 1147], [6.67, 1147]],
  eutectoid: [[0.022, 727], [0.76, 727], [6.67, 727]],
  cementiteBoundary: [[6.67, 20], [6.67, 727], [6.67, 1147], [6.67, 1227]],
  suppliedPoints: [
    { number: 1, x: 0, y: 1538 },
    { number: 2, x: 0.09, y: 1493 },
    { number: 3, x: 0.16, y: 1493 },
    { number: 4, x: 0.53, y: 1493 },
    { number: 5, x: 0, y: 1394 },
    { number: 6, x: 2.14, y: 1147 },
    { number: 7, x: 4.3, y: 1147 },
    { number: 8, x: 0, y: 912 },
    { number: 9, x: 0.022, y: 727 },
    { number: 10, x: 0.76, y: 727 }
  ]
};
FE.liquidus = [...FE.deltaLiquidus, ...FE.gammaLiquidus.slice(1), ...FE.rightLiquidus.slice(1)];

const FE_TRACE_CURVE_KEYS = ["deltaLiquidus", "deltaSolidus", "deltaGammaDelta", "deltaGammaGamma", "gammaSolidus", "gammaLiquidus", "rightLiquidus", "a3", "alphaHigh", "acm", "alphaLow"];
const FE_TRACE_ENDPOINTS = [
  ["deltaLiquidus", [0, 1538], [0.53, 1493]],
  ["deltaSolidus", [0, 1538], [0.09, 1493]],
  ["deltaGammaDelta", [0, 1394], [0.09, 1493]],
  ["deltaGammaGamma", [0, 1394], [0.16, 1493]],
  ["gammaSolidus", [0.16, 1493], [2.14, 1147]],
  ["gammaLiquidus", [0.53, 1493], [4.3, 1147]],
  ["rightLiquidus", [4.3, 1147], [6.67, 1227]],
  ["a3", [0, 912], [0.76, 727]],
  ["alphaHigh", [0, 912], [0.022, 727]],
  ["acm", [0.76, 727], [2.14, 1147]],
  ["alphaLow", [0.006, 20], [0.022, 727]]
];
const fePointsMatch = (first, second) => first.every((value, index) => Math.abs(value - second[index]) < 1e-9);
console.assert(FE.traceSegmentCount === 15 && FE_TRACE_SEGMENTS.size === 15, "The Fe–C trace should contain 15 unique named segments.");
console.assert(FE_TRACE_CURVE_KEYS.every((key) => FE[key].every((point) => point.every(Number.isFinite))), "Every sampled Fe–C B-spline point should be finite.");
console.assert(FE_TRACE_ENDPOINTS.every(([key, start, end]) => fePointsMatch(FE[key][0], start) && fePointsMatch(FE[key].at(-1), end)), "Every Fe–C B-spline should meet its canonical labelled endpoints.");
console.assert(FE_TRACE_CURVE_KEYS.every((key) => FE[key].every((point, index, points) => index === 0 || point[0] >= points[index - 1][0] - 1e-9)), "Sampled Fe–C curves should remain composition-monotone.");
console.assert(FE.peritectic.every((point) => point[1] === 1493) && FE.eutectic.every((point) => point[1] === 1147) && FE.eutectoid.every((point) => point[1] === 727), "Fe–C invariant reaction lines should remain horizontal.");
console.assert(FE.cementiteBoundary.every((point) => point[0] === FE.cementite), "The cementite boundary should remain vertical at 6.67 wt% C.");

const FE_DOMAIN_STYLES = {
  liquid: { region: "Liquid", fill: "#f9ddd3", label: "#8a2d18" },
  delta: { region: "δ ferrite", fill: "#d4ece5", label: "#135748" },
  gamma: { region: "Austenite γ", fill: "#f8e6b6", label: "#6b4700" },
  alpha: { region: "α ferrite", fill: "#d8e8f4", label: "#254f75" },
  deltaLiquid: { region: "δ + liquid", fill: "#e8e2d4", label: "#5b4930" },
  deltaGamma: { region: "δ + γ", fill: "#dde7c9", label: "#42551e" },
  gammaLiquid: { region: "γ + liquid", fill: "#f5d9c1", label: "#77410f" },
  liquidCementite: { region: "Liquid + Fe₃C", fill: "#ead9e3", label: "#6f2f4b" },
  alphaGamma: { region: "α + γ", fill: "#d5e9ea", label: "#205560" },
  gammaCementite: { region: "γ + Fe₃C", fill: "#e5dcee", label: "#4b3268" },
  alphaCementite: { region: "α + Fe₃C", fill: "#dce1ec", label: "#34445f" },
  cementiteBoundary: { region: "Cementite", fill: COLORS.charcoal, label: "#303640", line: true }
};

// Every finite-area field shares the exact sampled boundary arrays used by
// classification and tie-line calculations. This prevents coloured regions
// from drifting away from the B-spline curves.
const FE_DOMAIN_POLYGONS = {
  liquid: [[0, 1600], [FE.cementite, 1600], ...[...FE.liquidus].reverse()],
  deltaLiquid: [...FE.deltaLiquidus, [0.16, 1493], [0.09, 1493], ...[...FE.deltaSolidus].reverse().slice(1)],
  delta: [...FE.deltaSolidus, ...[...FE.deltaGammaDelta].reverse().slice(1)],
  deltaGamma: [...FE.deltaGammaDelta, [0.16, 1493], ...[...FE.deltaGammaGamma].reverse().slice(1)],
  gammaLiquid: [...FE.gammaLiquidus, [2.14, 1147], ...[...FE.gammaSolidus].reverse().slice(1)],
  gamma: [...FE.deltaGammaGamma, ...FE.gammaSolidus.slice(1), ...[...FE.acm].reverse().slice(1), ...[...FE.a3].reverse().slice(1)],
  liquidCementite: [...FE.rightLiquidus, [FE.cementite, 1147]],
  alphaGamma: [...FE.a3, [0.022, 727], ...[...FE.alphaHigh].reverse().slice(1)],
  gammaCementite: [...FE.acm, [4.3, 1147], [FE.cementite, 1147], [FE.cementite, 727], [0.76, 727]],
  alpha: [...FE.alphaHigh, ...[...FE.alphaLow].reverse().slice(1), [0, 20]],
  alphaCementite: [...FE.alphaLow, [0.76, 727], [FE.cementite, 727], [FE.cementite, 20]]
};

console.assert(Object.keys(FE_DOMAIN_POLYGONS).length === 11, "The Fe–C chart should contain 11 finite-area phase fields.");
console.assert(Object.values(FE_DOMAIN_POLYGONS).every((polygon) => polygon.length >= 3 && polygon.every((point) => point.every(Number.isFinite))), "Every Fe–C phase field polygon should be finite.");

const FE_STEEL_DOMAIN_KEYS = new Set(["gamma", "alpha", "alphaGamma", "gammaCementite", "alphaCementite"]);

function renderIronDomainLegend() {
  $$('[data-iron-domain]').forEach((item) => {
    const style = FE_DOMAIN_STYLES[item.dataset.ironDomain];
    if (!style) return;
    item.querySelector(".phase-domain-swatch").style.backgroundColor = style.fill;
  });
}

function updateIronDomainLegend(result) {
  const activeEntry = Object.entries(FE_DOMAIN_STYLES).find(([, style]) => style.region === result.region);
  $$('[data-iron-domain]').forEach((item) => {
    item.hidden = ironState.view === "steel" && !FE_STEEL_DOMAIN_KEYS.has(item.dataset.ironDomain);
    const active = item.dataset.ironDomain === activeEntry?.[0];
    item.classList.toggle("is-active", active);
    if (active) item.setAttribute("aria-current", "true");
    else item.removeAttribute("aria-current");
  });
}

const IRON_MAX_ZOOM_FACTOR = 8;
const IRON_ZOOM_HISTORY_LIMIT = 20;
const ironState = {
  composition: 0.4,
  temperature: 700,
  view: "full",
  domain: null,
  zoomHistory: [],
  interactionMode: "read"
};
let currentIronResult = null;
let ironBoxGesture = null;
const ironIsZoomMode = () => ironState.interactionMode === "zoom";

function ironBaseDomains() {
  return {
    xDomain: [0, ironState.view === "steel" ? 2.14 : FE.cementite],
    yDomain: [500, ironState.view === "steel" ? 1147 : 1600]
  };
}

function cloneIronDomains(domains) {
  return domains ? { xDomain: [...domains.xDomain], yDomain: [...domains.yDomain] } : null;
}

function centredDomain([minimum, maximum], centre, span = maximum - minimum) {
  const boundedSpan = clamp(span, 0, maximum - minimum);
  if (boundedSpan >= maximum - minimum - 1e-9) return [minimum, maximum];
  const start = clamp(centre - boundedSpan / 2, minimum, maximum - boundedSpan);
  return [start, start + boundedSpan];
}

function ironChartDomains() {
  return cloneIronDomains(ironState.domain) || ironBaseDomains();
}

function ironZoomMetrics(domains = ironChartDomains()) {
  const base = ironBaseDomains();
  const xScale = (base.xDomain[1] - base.xDomain[0]) / (domains.xDomain[1] - domains.xDomain[0]);
  const yScale = (base.yDomain[1] - base.yDomain[0]) / (domains.yDomain[1] - domains.yDomain[0]);
  return { xScale, yScale, isBase: xScale <= 1.000001 && yScale <= 1.000001 };
}

function formatIronZoomFactor(value) {
  const rounded = Math.round(value);
  return Math.abs(value - rounded) < 0.05 ? `${rounded}×` : `${value.toFixed(value < 10 ? 1 : 0)}×`;
}

function ironZoomLabel(metrics = ironZoomMetrics()) {
  if (Math.abs(metrics.xScale - metrics.yScale) / Math.max(metrics.xScale, metrics.yScale) < 0.03) {
    return formatIronZoomFactor((metrics.xScale + metrics.yScale) / 2);
  }
  return `X ${formatIronZoomFactor(metrics.xScale)} · Y ${formatIronZoomFactor(metrics.yScale)}`;
}

function ironZoomPhrase(metrics = ironZoomMetrics()) {
  if (metrics.isBase) return "1×";
  if (Math.abs(metrics.xScale - metrics.yScale) / Math.max(metrics.xScale, metrics.yScale) < 0.03) {
    return formatIronZoomFactor((metrics.xScale + metrics.yScale) / 2);
  }
  return `${formatIronZoomFactor(metrics.xScale)} horizontally and ${formatIronZoomFactor(metrics.yScale)} vertically`;
}

function constrainIronDomains(domains) {
  const base = ironBaseDomains();
  const constrainAxis = (selected, baseAxis) => {
    const selectedMinimum = clamp(Math.min(...selected), baseAxis[0], baseAxis[1]);
    const selectedMaximum = clamp(Math.max(...selected), baseAxis[0], baseAxis[1]);
    const baseSpan = baseAxis[1] - baseAxis[0];
    const span = clamp(selectedMaximum - selectedMinimum, baseSpan / IRON_MAX_ZOOM_FACTOR, baseSpan);
    return centredDomain(baseAxis, (selectedMinimum + selectedMaximum) / 2, span);
  };
  return {
    xDomain: constrainAxis(domains.xDomain, base.xDomain),
    yDomain: constrainAxis(domains.yDomain, base.yDomain)
  };
}

function ironDomainsEqual(first, second, tolerance = 1e-7) {
  const firstValues = [...first.xDomain, ...first.yDomain];
  const secondValues = [...second.xDomain, ...second.yDomain];
  return firstValues.every((value, index) => Math.abs(value - secondValues[index]) <= tolerance);
}

function setIronDomains(domains, { remember = true } = {}) {
  const current = ironChartDomains();
  const constrained = constrainIronDomains(domains);
  if (ironDomainsEqual(current, constrained)) return false;
  if (remember) {
    ironState.zoomHistory.push(cloneIronDomains(ironState.domain));
    if (ironState.zoomHistory.length > IRON_ZOOM_HISTORY_LIMIT) ironState.zoomHistory.shift();
  }
  ironState.domain = ironZoomMetrics(constrained).isBase ? null : constrained;
  return true;
}

function resetIronZoom() {
  ironState.domain = null;
  ironState.zoomHistory = [];
}

function restorePreviousIronZoom() {
  const previous = cloneIronDomains(ironState.domain);
  ironState.domain = ironState.zoomHistory.length ? ironState.zoomHistory.pop() : null;
  return !ironDomainsEqual(previous || ironBaseDomains(), ironChartDomains());
}

function zoomIronIn() {
  const current = ironChartDomains();
  const base = ironBaseDomains();
  const xCentre = between(ironState.composition, ...current.xDomain)
    ? ironState.composition
    : (current.xDomain[0] + current.xDomain[1]) / 2;
  const yCentre = between(ironState.temperature, ...current.yDomain)
    ? ironState.temperature
    : (current.yDomain[0] + current.yDomain[1]) / 2;
  setIronDomains({
    xDomain: centredDomain(base.xDomain, xCentre, (current.xDomain[1] - current.xDomain[0]) / 2),
    yDomain: centredDomain(base.yDomain, yCentre, (current.yDomain[1] - current.yDomain[0]) / 2)
  });
}

function keepIronSelectionVisible() {
  if (!ironState.domain) return;
  const current = ironChartDomains();
  const base = ironBaseDomains();
  ironState.domain = {
    xDomain: between(ironState.composition, ...current.xDomain)
      ? current.xDomain
      : centredDomain(base.xDomain, ironState.composition, current.xDomain[1] - current.xDomain[0]),
    yDomain: between(ironState.temperature, ...current.yDomain)
      ? current.yDomain
      : centredDomain(base.yDomain, ironState.temperature, current.yDomain[1] - current.yDomain[0])
  };
}

function niceTicks([minimum, maximum], targetCount = 6) {
  const span = maximum - minimum;
  if (!(span > 0)) return [minimum];
  const roughStep = span / Math.max(2, targetCount);
  const magnitude = 10 ** Math.floor(Math.log10(roughStep));
  const residual = roughStep / magnitude;
  const multiplier = residual <= 1 ? 1 : residual <= 2 ? 2 : residual <= 2.5 ? 2.5 : residual <= 5 ? 5 : 10;
  const step = multiplier * magnitude;
  const first = Math.ceil((minimum - step * 1e-8) / step) * step;
  const ticks = [];
  for (let value = first; value <= maximum + step * 1e-8; value += step) {
    ticks.push(Number(value.toFixed(6)));
  }
  return ticks;
}

function ticksWithin(domain, values) {
  return values.filter((value) => between(value, domain[0] - 1e-6, domain[1] + 1e-6));
}

function mergeTicks(...groups) {
  return [...new Set(groups.flat().map((value) => Number(value.toFixed(6))))].sort((first, second) => first - second);
}

function feSingle(region, phase, summary) {
  return { region, phases: [phase], summary, single: true };
}

function feTwoPhase(region, leftName, rightName, leftComposition, rightComposition, composition, summary) {
  const fractions = leverFractions(composition, leftComposition, rightComposition);
  return {
    region,
    phases: [leftName, rightName],
    summary,
    single: false,
    leftName,
    rightName,
    leftComposition,
    rightComposition,
    leftFraction: fractions.left,
    rightFraction: fractions.right,
    indeterminate: fractions.indeterminate
  };
}

function feInvariant(kind, region, phases, compositions, summary, reaction) {
  return { kind, region, phases, compositions, summary, reaction, invariant: true };
}

function classifyIron(composition, temperature) {
  const invariantTolerance = 0.49;
  if (Math.abs(temperature - 1394) <= invariantTolerance && composition <= 0.002) {
    return feInvariant("δ–γ", "δ ↔ γ boundary", ["δ", "γ"], [0, 0], "Pure iron is at its δ-ferrite to austenite allotropic transition.", "δ ↔ γ");
  }
  if (Math.abs(temperature - 912) <= invariantTolerance && composition <= 0.002) {
    return feInvariant("α–γ", "α ↔ γ boundary", ["α", "γ"], [0, 0], "Pure iron is at its austenite to α-ferrite allotropic transition.", "γ ↔ α");
  }
  if (Math.abs(temperature - 1493) <= invariantTolerance && between(composition, 0.09, 0.53)) {
    return feInvariant("Peritectic", "Peritectic invariant", ["δ", "γ", "Liquid"], [0.09, 0.16, 0.53], "At 1493 °C, liquid and δ ferrite react to form austenite γ.", "L + δ → γ");
  }
  if (Math.abs(temperature - 1147) <= invariantTolerance && between(composition, 2.14, FE.cementite)) {
    return feInvariant("Eutectic", "Eutectic invariant", ["γ", "Liquid", "Fe₃C"], [2.14, 4.3, 6.67], "At 1147 °C, eutectic liquid transforms to austenite γ and cementite.", "L → γ + Fe₃C");
  }
  if (Math.abs(temperature - 727) <= invariantTolerance && between(composition, 0.022, FE.cementite)) {
    return feInvariant("Eutectoid", "Eutectoid invariant", ["α", "γ", "Fe₃C"], [0.022, 0.76, 6.67], "At 727 °C, austenite γ transforms to ferrite α and cementite.", "γ → α + Fe₃C");
  }

  if (composition >= FE.cementite - 0.005 && temperature < 1227) {
    return feSingle("Cementite", "Fe₃C", "Stoichiometric cementite is the single solid phase at 6.67 wt% C.");
  }

  const liquidus = interpolateY(FE.liquidus, composition);
  if (temperature > liquidus + 1) return feSingle("Liquid", "Liquid", "A homogeneous Fe–C liquid is stable.");

  if (temperature >= 1493) {
    const deltaComposition = interpolateX(FE.deltaSolidus, temperature);
    const liquidComposition = interpolateX(FE.deltaLiquidus, temperature);
    if (deltaComposition !== null && composition < deltaComposition - 0.002) return feSingle("δ ferrite", "δ", "High-temperature BCC δ ferrite is stable.");
    if (deltaComposition !== null && liquidComposition !== null && composition <= liquidComposition + 0.002) {
      return feTwoPhase("δ + liquid", "δ", "Liquid", deltaComposition, liquidComposition, composition, "δ ferrite coexists with liquid.");
    }
    return feSingle("Liquid", "Liquid", "A homogeneous Fe–C liquid is stable.");
  }

  if (temperature > 1394) {
    const deltaComposition = interpolateX(FE.deltaGammaDelta, temperature);
    const gammaLeftComposition = interpolateX(FE.deltaGammaGamma, temperature);
    if (composition < deltaComposition - 0.002) return feSingle("δ ferrite", "δ", "High-temperature BCC δ ferrite is stable.");
    if (composition < gammaLeftComposition - 0.002) {
      return feTwoPhase("δ + γ", "δ", "γ", deltaComposition, gammaLeftComposition, composition, "δ ferrite and austenite γ coexist in the allotropic transition wedge.");
    }
    const gammaComposition = interpolateX(FE.gammaSolidus, temperature);
    const liquidComposition = interpolateX(FE.gammaLiquidus, temperature);
    if (gammaComposition !== null && composition <= gammaComposition + 0.002) return feSingle("Austenite γ", "γ", "FCC austenite γ is stable.");
    if (gammaComposition !== null && liquidComposition !== null && composition <= liquidComposition + 0.002) {
      return feTwoPhase("γ + liquid", "γ", "Liquid", gammaComposition, liquidComposition, composition, "Austenite γ coexists with liquid.");
    }
    return feSingle("Liquid", "Liquid", "A homogeneous Fe–C liquid is stable.");
  }

  if (temperature > 1147) {
    if (composition > 4.3) {
      const liquidComposition = interpolateX(FE.rightLiquidus, temperature);
      if (liquidComposition !== null && composition >= liquidComposition - 0.002) {
        return feTwoPhase("Liquid + Fe₃C", "Liquid", "Fe₃C", liquidComposition, FE.cementite, composition, "Liquid coexists with cementite on the hypereutectic side.");
      }
      return feSingle("Liquid", "Liquid", "A homogeneous Fe–C liquid is stable.");
    }
    const gammaComposition = interpolateX(FE.gammaSolidus, temperature);
    const liquidComposition = interpolateX(FE.gammaLiquidus, temperature);
    if (gammaComposition !== null && composition <= gammaComposition + 0.002) return feSingle("Austenite γ", "γ", "FCC austenite γ is stable.");
    if (gammaComposition !== null && liquidComposition !== null && composition <= liquidComposition + 0.002) {
      return feTwoPhase("γ + liquid", "γ", "Liquid", gammaComposition, liquidComposition, composition, "Austenite γ coexists with liquid.");
    }
    return feSingle("Liquid", "Liquid", "A homogeneous Fe–C liquid is stable.");
  }

  if (temperature > 727) {
    if (temperature <= 912) {
      const alphaComposition = interpolateX(FE.alphaHigh, temperature);
      const gammaLeftComposition = interpolateX(FE.a3, temperature);
      if (alphaComposition !== null && composition < alphaComposition - 0.001) return feSingle("α ferrite", "α", "Low-carbon BCC α ferrite is stable.");
      if (alphaComposition !== null && gammaLeftComposition !== null && composition < gammaLeftComposition - 0.002) {
        return feTwoPhase("α + γ", "α", "γ", alphaComposition, gammaLeftComposition, composition, "Ferrite α and austenite γ coexist.");
      }
    }
    const gammaRightComposition = interpolateX(FE.acm, temperature);
    if (gammaRightComposition !== null && composition <= gammaRightComposition + 0.002) return feSingle("Austenite γ", "γ", "FCC austenite γ is stable.");
    return feTwoPhase("γ + Fe₃C", "γ", "Fe₃C", gammaRightComposition ?? 2.14, FE.cementite, composition, "Austenite γ and cementite coexist.");
  }

  const alphaComposition = interpolateX(FE.alphaLow, clamp(temperature, 500, 727));
  if (composition < alphaComposition - 0.001) return feSingle("α ferrite", "α", "Low-carbon BCC α ferrite is stable.");
  return feTwoPhase("α + Fe₃C", "α", "Fe₃C", alphaComposition, FE.cementite, composition, "Ferrite α and cementite are the equilibrium phases below the eutectoid temperature.");
}

function fePointInPolygon([pointX, pointY], polygon) {
  let inside = false;
  for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index, index += 1) {
    const [x1, y1] = polygon[index];
    const [x2, y2] = polygon[previous];
    const crosses = (y1 > pointY) !== (y2 > pointY)
      && pointX < ((x2 - x1) * (pointY - y1)) / (y2 - y1) + x1;
    if (crosses) inside = !inside;
  }
  return inside;
}

const FE_DOMAIN_PROBES = [
  ["liquid", [3, 1500]],
  ["delta", [0.02, 1450]],
  ["deltaLiquid", [0.2, 1510]],
  ["deltaGamma", [0.08, 1450]],
  ["gamma", [1, 1000]],
  ["gammaLiquid", [2.5, 1250]],
  ["liquidCementite", [6.2, 1180]],
  ["alpha", [0.005, 700]],
  ["alphaGamma", [0.15, 800]],
  ["gammaCementite", [1.5, 800]],
  ["alphaCementite", [0.4, 700]]
];
console.assert(FE_DOMAIN_PROBES.every(([expectedKey, point]) => {
  const containingKeys = Object.entries(FE_DOMAIN_POLYGONS)
    .filter(([, polygon]) => fePointInPolygon(point, polygon))
    .map(([key]) => key);
  return containingKeys.length === 1
    && containingKeys[0] === expectedKey
    && classifyIron(...point).region === FE_DOMAIN_STYLES[expectedKey].region;
}), "Every sampled Fe–C teaching state should occupy exactly one matching coloured phase field.");

function drawIronChart() {
  const canvas = $("#iron-chart");
  const { xDomain, yDomain } = ironChartDomains();
  const plot = makePlot(canvas, xDomain, yDomain, {
    margins: { left: canvas.getBoundingClientRect().width < 520 ? 54 : 68, right: canvas.getBoundingClientRect().width < 520 ? 16 : 28, top: 28, bottom: canvas.getBoundingClientRect().width < 520 ? 54 : 60 }
  });
  canvas._plot = plot;
  const zoomMetrics = ironZoomMetrics({ xDomain, yDomain });
  const xTicks = zoomMetrics.xScale <= 1.000001
    ? (ironState.view === "steel"
        ? [0, 0.5, 1, 1.5, 2, 2.14]
        : plot.compact ? [0, 1, 2, 3, 4.3, 5.5, 6.67] : [0, 1, 2, 3, 4, 5, 6, 6.67])
    : niceTicks(xDomain, plot.compact ? 5 : 7);
  const teachingYTicks = ticksWithin(yDomain, [500, 600, 727, 912, 1147, 1394, 1493, 1600]);
  const generatedYTicks = niceTicks(yDomain, plot.compact ? 4 : 6)
    .filter((tick) => teachingYTicks.every((teachingTick) => Math.abs(tick - teachingTick) > (yDomain[1] - yDomain[0]) * 0.035));
  const yTicks = zoomMetrics.yScale < 4
    ? teachingYTicks
    : mergeTicks(generatedYTicks, teachingYTicks);
  canvas.dataset.zoomScale = ironZoomLabel(zoomMetrics);
  canvas.dataset.zoomScaleX = zoomMetrics.xScale.toFixed(3);
  canvas.dataset.zoomScaleY = zoomMetrics.yScale.toFixed(3);
  canvas.dataset.zoomMode = zoomMetrics.isBase ? "base" : "custom";
  canvas.dataset.xDomain = xDomain.map((value) => value.toFixed(3)).join(",");
  canvas.dataset.yDomain = yDomain.map((value) => value.toFixed(1)).join(",");
  canvas.dataset.traceSource = FE.traceSource;
  canvas.dataset.traceSegmentCount = String(FE.traceSegmentCount);
  canvas.dataset.phaseDomainCount = String(Object.keys(FE_DOMAIN_POLYGONS).length);
  canvas.dataset.interactionMode = ironState.interactionMode;
  canvas.classList.toggle("is-box-zoom", ironState.interactionMode === "zoom");
  canvas.setAttribute(
    "aria-label",
    `Interactive colour-coded iron-cementite phase diagram drawn from the supplied B-spline trace and normalized to the labelled critical points. ${ironState.view === "steel" ? "Steel-region range" : "Full-composition range"}, ${ironZoomPhrase(zoomMetrics)} zoom. Displayed composition ${xDomain[0].toFixed(2)} to ${xDomain[1].toFixed(2)} weight percent carbon and temperature ${yDomain[0].toFixed(0)} to ${yDomain[1].toFixed(0)} degrees Celsius. ${ironState.interactionMode === "zoom" ? "Box zoom mode is active; drag from the plot, axes, or surrounding canvas margin to enlarge the part crossing the plotted data, then Read phases mode resumes." : "Read phases mode is active; click or tap a phase field to report composition, temperature, and phases."}`
  );

  const { context, x, y, margins, plotWidth, plotHeight, compact } = plot;
  context.save();
  context.beginPath();
  context.rect(margins.left, margins.top, plotWidth, plotHeight);
  context.clip();
  context.fillStyle = COLORS.paper;
  context.fillRect(margins.left, margins.top, plotWidth, plotHeight);
  Object.entries(FE_DOMAIN_POLYGONS).forEach(([key, polygon]) => {
    fillPolygon(plot, polygon, FE_DOMAIN_STYLES[key].fill);
  });
  context.restore();

  drawAxes(plot, {
    xTicks,
    yTicks,
    xLabel: "Composition (wt% C)",
    yLabel: "Temperature (°C)",
    xFormat: (value) => String(Number(value.toFixed(2))),
    background: false
  });

  context.save();
  context.beginPath();
  context.rect(margins.left, margins.top, plotWidth, plotHeight);
  context.clip();
  pathLine(plot, FE.liquidus, { color: COLORS.coral, width: 3 });
  pathLine(plot, FE.deltaSolidus, { color: COLORS.teal, width: 2.5 });
  pathLine(plot, FE.deltaGammaDelta, { color: COLORS.teal, width: 2.5 });
  pathLine(plot, FE.deltaGammaGamma, { color: COLORS.amber, width: 2.5 });
  pathLine(plot, FE.gammaSolidus, { color: COLORS.amber, width: 2.8 });
  pathLine(plot, FE.a3, { color: COLORS.blue, width: 2.8 });
  pathLine(plot, FE.alphaHigh, { color: COLORS.teal, width: 2.5 });
  pathLine(plot, FE.acm, { color: COLORS.charcoal, width: 2.8 });
  pathLine(plot, FE.alphaLow, { color: COLORS.teal, width: 2.3 });
  pathLine(plot, FE.peritectic, { color: COLORS.ink, width: 2.3 });
  pathLine(plot, FE.eutectic, { color: COLORS.ink, width: 2.3 });
  pathLine(plot, FE.eutectoid, { color: COLORS.ink, width: 2.3 });
  pathLine(plot, FE.cementiteBoundary, { color: COLORS.charcoal, width: 3 });
  context.restore();

  context.save();
  context.beginPath();
  context.rect(margins.left, margins.top, plotWidth, plotHeight);
  context.clip();
  context.font = `800 ${compact ? 9 : 12}px system-ui, sans-serif`;
  context.textAlign = "center";
  const labels = ironState.view === "steel"
    ? [
        [0.82, 1030, "γ", FE_DOMAIN_STYLES.gamma.label], [0.18, 805, "α + γ", FE_DOMAIN_STYLES.alphaGamma.label], [1.35, 830, "γ + Fe₃C", FE_DOMAIN_STYLES.gammaCementite.label],
        [0.8, 625, "α + Fe₃C", FE_DOMAIN_STYLES.alphaCementite.label]
      ]
    : [
        [3.2, 1525, "LIQUID", FE_DOMAIN_STYLES.liquid.label], [0.07, 1450, "δ + γ", FE_DOMAIN_STYLES.deltaGamma.label], [0.82, 1280, "γ", FE_DOMAIN_STYLES.gamma.label],
        [1.3, 1350, "γ + L", FE_DOMAIN_STYLES.gammaLiquid.label], [6.0, 1180, "L + Fe₃C", FE_DOMAIN_STYLES.liquidCementite.label], [0.2, 780, "α + γ", FE_DOMAIN_STYLES.alphaGamma.label],
        [2.45, 880, "γ + Fe₃C", FE_DOMAIN_STYLES.gammaCementite.label], [3.1, 625, "α + Fe₃C", FE_DOMAIN_STYLES.alphaCementite.label]
      ];
  labels
    .filter(([labelX, labelY]) => between(labelX, xDomain[0], xDomain[1]) && between(labelY, yDomain[0], yDomain[1]))
    .forEach(([labelX, labelY, text, color]) => {
      context.fillStyle = color;
      context.fillText(text, x(labelX), y(labelY));
    });
  if (ironState.view === "full" && between(FE.cementite, xDomain[0] - 1e-6, xDomain[1] + 1e-6) && between(930, yDomain[0], yDomain[1])) {
    context.save();
    context.translate(x(6.64), y(930));
    context.rotate(-Math.PI / 2);
    context.fillStyle = COLORS.charcoal;
    context.textAlign = "center";
    context.fillText("Fe₃C · 6.67 wt% C", 0, 0);
    context.restore();
  }

  FE.suppliedPoints
    .filter((point) => between(point.x, xDomain[0] - 1e-6, xDomain[1] + 1e-6) && between(point.y, yDomain[0] - 1e-6, yDomain[1] + 1e-6))
    .forEach((point) => {
      drawPoint(plot, point.x, point.y, { radius: compact ? 3.2 : 4, fill: COLORS.ink, strokeWidth: 1.5 });
      const pointX = x(point.x);
      const pointY = y(point.y);
      const nearRightEdge = pointX > margins.left + plotWidth - 16;
      const nearTopEdge = pointY < margins.top + 16;
      context.fillStyle = COLORS.ink;
      context.font = `800 ${compact ? 8 : 10}px system-ui, sans-serif`;
      context.textAlign = nearRightEdge ? "right" : "left";
      context.textBaseline = nearTopEdge ? "top" : "alphabetic";
      context.fillText(String(point.number), pointX + (nearRightEdge ? -6 : 6), pointY + (nearTopEdge ? 6 : -6));
    });
  context.restore();

  currentIronResult = classifyIron(ironState.composition, ironState.temperature);
  context.save();
  context.beginPath();
  context.rect(margins.left, margins.top, plotWidth, plotHeight);
  context.clip();
  if (!currentIronResult.single && !currentIronResult.invariant) {
    const lineRight = Math.min(currentIronResult.rightComposition, xDomain[1]);
    context.strokeStyle = COLORS.coral;
    context.lineWidth = 2.4;
    context.setLineDash([7, 5]);
    context.beginPath();
    context.moveTo(x(currentIronResult.leftComposition), y(ironState.temperature));
    context.lineTo(x(lineRight), y(ironState.temperature));
    context.stroke();
    context.setLineDash([]);
    drawPoint(plot, currentIronResult.leftComposition, ironState.temperature, { fill: COLORS.blue });
    if (currentIronResult.rightComposition <= xDomain[1]) {
      drawPoint(plot, currentIronResult.rightComposition, ironState.temperature, { fill: COLORS.charcoal });
    } else {
      context.fillStyle = COLORS.charcoal;
      context.font = `800 ${compact ? 8 : 10}px system-ui, sans-serif`;
      context.textAlign = "right";
      context.fillText(
        `→ ${ironPhaseSymbol(currentIronResult.rightName)} at ${currentIronResult.rightComposition.toFixed(2)} wt% C`,
        x(xDomain[1]) - 4,
        y(ironState.temperature) - 7
      );
    }
  }
  if (currentIronResult.invariant) {
    const endpoints = currentIronResult.compositions;
    context.strokeStyle = COLORS.coral;
    context.lineWidth = 2.4;
    context.beginPath();
    context.moveTo(x(endpoints[0]), y(ironState.temperature));
    context.lineTo(x(Math.min(endpoints.at(-1), xDomain[1])), y(ironState.temperature));
    context.stroke();
  }
  drawSelection(plot, ironState.composition, ironState.temperature);
  context.restore();
}

function ironFinalConstituent(composition) {
  if (composition < 0.022) return "Very-low-carbon alloy: primarily ferrite after slow cooling.";
  if (composition < 0.75) return "Hypoeutectoid steel after slow cooling: proeutectoid ferrite + pearlite.";
  if (composition <= 0.77) return "Near-eutectoid steel after slow cooling: approximately 100% pearlite.";
  if (composition <= 2.14) return "Hypereutectoid steel after slow cooling: pearlite + proeutectoid cementite.";
  if (composition < 4.28) return "Hypoeutectic white cast iron: primary austenite + ledeburite; the austenite later transforms on slow cooling.";
  if (composition <= 4.32) return "Eutectic white cast iron: ledeburite, transformed further as austenite crosses the eutectoid.";
  return "Hypereutectic white cast iron: primary cementite + ledeburite under the metastable diagram.";
}

function ironMicroDescription(result) {
  if (result.invariant) return `${result.kind} reaction at the selected invariant temperature.`;
  const descriptions = {
    "Liquid": "Homogeneous Fe–C liquid.",
    "δ ferrite": "Equiaxed grains of high-temperature BCC δ ferrite.",
    "Austenite γ": "Equiaxed grains of FCC austenite γ.",
    "α ferrite": "Equiaxed grains of low-carbon BCC α ferrite.",
    "Cementite": "Single-phase cementite at its stoichiometric composition.",
    "δ + liquid": "δ ferrite dendrites surrounded by liquid.",
    "γ + liquid": "Austenite γ dendrites surrounded by liquid.",
    "Liquid + Fe₃C": "Primary cementite plates within liquid.",
    "δ + γ": "Mixed δ-ferrite and austenite grains.",
    "α + γ": "Mixed ferrite α and austenite γ grains.",
    "γ + Fe₃C": "Austenite γ with cementite at equilibrium.",
    "α + Fe₃C": ironFinalConstituent(ironState.composition)
  };
  return descriptions[result.region] || "Schematic equilibrium microstructure.";
}

function ironMicrographFor(result) {
  if (result.region !== "α + Fe₃C" || result.invariant || ironState.temperature >= 727) return null;
  const composition = ironState.composition;
  if (between(composition, 0.32, 0.48)) {
    return {
      src: "assets/fe-ferrite-pearlite.png",
      alt: "AI-generated grayscale optical micrograph representative of slowly cooled hypoeutectoid steel near 0.40 weight percent carbon, showing light polygonal ferrite and darker pearlite colonies.",
      caption: "Representative hypoeutectoid steel near 0.40 wt% C after slow cooling: light polygonal proeutectoid ferrite with darker pearlite colonies. Synthetic teaching image; qualitative morphology only, no scale."
    };
  }
  if (between(composition, 0.72, 0.80)) {
    return {
      src: "assets/fe-pearlite.png",
      alt: "AI-generated grayscale microscopy image representative of eutectoid steel near 0.76 weight percent carbon, showing pearlite colonies with differently oriented ferrite-cementite lamellae.",
      caption: "Representative eutectoid steel near 0.76 wt% C after slow cooling: pearlite colonies with differently oriented ferrite–cementite lamellae. Synthetic teaching image; qualitative morphology only, no scale."
    };
  }
  if (between(composition, 1.05, 1.35)) {
    return {
      src: "assets/fe-pearlite-cementite.png",
      alt: "AI-generated grayscale optical micrograph representative of slowly cooled hypereutectoid steel near 1.2 weight percent carbon, showing pearlite colonies bounded by a thin proeutectoid cementite network.",
      caption: "Representative hypereutectoid steel near 1.2 wt% C after slow cooling: pearlite colonies with a thin proeutectoid cementite network. Synthetic teaching image; qualitative morphology only, no scale."
    };
  }
  return null;
}

function drawCementiteNetwork(context, width, height, color = "#4c515a") {
  context.save();
  context.strokeStyle = color;
  context.lineWidth = Math.max(3, width / 120);
  for (let index = 0; index < 7; index += 1) {
    const startX = (index / 6) * width;
    context.beginPath();
    context.moveTo(startX, 0);
    context.bezierCurveTo(startX + width * 0.09, height * 0.3, startX - width * 0.08, height * 0.65, startX + width * 0.04, height);
    context.stroke();
  }
  context.restore();
}

function drawIronMicrostructure() {
  const result = currentIronResult || classifyIron(ironState.composition, ironState.temperature);
  const mediaState = setMicrostructureMedia("iron", ironMicrographFor(result), ironMicroDescription(result));
  if (mediaState === "micrograph") return mediaState;
  const canvas = $("#iron-microstructure");
  const { context, width, height } = prepareMicrostructure(canvas);
  const liquid = "#efaa94";
  const delta = "#77b79f";
  const gamma = "#e6b75f";
  const gammaLight = "#f4d89b";
  const alpha = "#91bddb";
  const alphaLight = "#c4ddeb";
  const cementite = "#505660";

  if (result.invariant) {
    if (result.kind === "Eutectoid") {
      drawGrains(context, width, height, [gamma, gammaLight], 41);
      context.save();
      context.beginPath();
      context.rect(width * 0.12, 0, width * 0.55, height);
      context.clip();
      drawLamellae(context, width, height, [alphaLight, cementite], width < 360 ? 10 : 13);
      context.restore();
      drawMicroLegend(context, width, height, [{ label: "α", color: alphaLight }, { label: "Fe₃C", color: cementite }, { label: "γ", color: gamma }]);
    } else if (result.kind === "Eutectic") {
      context.fillStyle = liquid;
      context.fillRect(0, 0, width, height);
      context.save();
      context.beginPath();
      context.rect(width * 0.18, 0, width * 0.52, height);
      context.clip();
      drawLamellae(context, width, height, [gammaLight, cementite], width < 360 ? 11 : 14);
      context.restore();
      drawMicroLegend(context, width, height, [{ label: "γ", color: gammaLight }, { label: "Fe₃C", color: cementite }, { label: "L", color: liquid }]);
    } else if (result.kind === "δ–γ" || result.kind === "α–γ") {
      const first = result.kind === "δ–γ" ? delta : alpha;
      drawGrains(context, width, height, [first, gamma, first, gammaLight], 45);
      drawMicroLegend(context, width, height, [{ label: result.kind === "δ–γ" ? "δ" : "α", color: first }, { label: "γ", color: gamma }]);
    } else {
      context.fillStyle = liquid;
      context.fillRect(0, 0, width, height);
      drawDendrites(context, width, height, delta, 5);
      drawPrimaryIslands(context, width, height, gamma, 5, 21);
      drawMicroLegend(context, width, height, [{ label: "δ", color: delta }, { label: "γ", color: gamma }, { label: "L", color: liquid }]);
    }
  } else if (result.region === "Liquid") {
    context.fillStyle = liquid;
    context.fillRect(0, 0, width, height);
    drawMicroLegend(context, width, height, [{ label: "Liquid", color: liquid }]);
  } else if (["δ ferrite", "Austenite γ", "α ferrite", "Cementite"].includes(result.region)) {
    const palette = result.region === "δ ferrite" ? [delta, "#a8d2c1"]
      : result.region === "Austenite γ" ? [gamma, gammaLight]
        : result.region === "α ferrite" ? [alpha, alphaLight]
          : [cementite, "#777d86"];
    drawGrains(context, width, height, palette, 9);
    drawMicroLegend(context, width, height, [{ label: result.phases[0], color: palette[0] }]);
  } else if (["δ + liquid", "γ + liquid"].includes(result.region)) {
    context.fillStyle = liquid;
    context.fillRect(0, 0, width, height);
    const solid = result.region.startsWith("δ") ? delta : gamma;
    drawDendrites(context, width, height, solid, 6);
    drawMicroLegend(context, width, height, [{ label: result.region.startsWith("δ") ? "δ" : "γ", color: solid }, { label: "L", color: liquid }]);
  } else if (result.region === "Liquid + Fe₃C") {
    context.fillStyle = liquid;
    context.fillRect(0, 0, width, height);
    drawCementiteNetwork(context, width, height, cementite);
    drawMicroLegend(context, width, height, [{ label: "Fe₃C", color: cementite }, { label: "L", color: liquid }]);
  } else if (result.region === "δ + γ" || result.region === "α + γ") {
    const first = result.region.startsWith("δ") ? delta : alpha;
    drawGrains(context, width, height, [first, gamma, first, gammaLight], 14);
    drawMicroLegend(context, width, height, [{ label: result.region.startsWith("δ") ? "δ" : "α", color: first }, { label: "γ", color: gamma }]);
  } else if (result.region === "γ + Fe₃C") {
    drawGrains(context, width, height, [gamma, gammaLight, "#edc97e"], 16);
    drawCementiteNetwork(context, width, height, cementite);
    drawMicroLegend(context, width, height, [{ label: "γ", color: gamma }, { label: "Fe₃C", color: cementite }]);
  } else if (ironState.composition < 0.022) {
    drawGrains(context, width, height, [alpha, alphaLight, "#a8cce1"], 19);
    drawPrimaryIslands(context, width, height, cementite, 4, 53);
    drawMicroLegend(context, width, height, [{ label: "α matrix", color: alpha }, { label: "Fe₃C precipitate", color: cementite }]);
  } else {
    drawLamellae(context, width, height, [alphaLight, cementite], width < 360 ? 10 : 13);
    if (ironState.composition < 0.75) drawPrimaryIslands(context, width, height, alpha, 8, 31);
    else if (ironState.composition > 0.77) drawCementiteNetwork(context, width, height, cementite);
    drawMicroLegend(context, width, height, [{ label: "α", color: alphaLight }, { label: "Fe₃C", color: cementite }]);
  }
  drawMicroLabel(context, "schematic · equilibrium field");
  canvas.setAttribute("aria-label", `${ironMicroDescription(result)} Schematic and not to scale.`);
  return mediaState;
}

function ironPhaseSymbol(name) {
  return phaseSymbol(name);
}

function clearIronBoxGesture() {
  const canvas = $("#iron-chart");
  const gesture = ironBoxGesture;
  ironBoxGesture = null;
  $(".iron-zoom-box").hidden = true;
  if (gesture && canvas.hasPointerCapture?.(gesture.pointerId)) canvas.releasePointerCapture(gesture.pointerId);
}

function setIronInteractionMode(mode, { announce = true, redraw = true } = {}) {
  if (!new Set(["zoom", "read"]).has(mode)) return;
  clearIronBoxGesture();
  ironState.interactionMode = mode;
  $$('[data-iron-mode]').forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.ironMode === mode));
  });
  $("#iron-chart").classList.toggle("is-box-zoom", mode === "zoom");
  if (redraw) drawIronChart();
  if (announce) {
    $("#iron-status").textContent = mode === "zoom"
      ? "Box zoom mode active. Drag from the plot, axes, or surrounding canvas margin; only the part crossing the plotted data is enlarged."
      : "Read phases mode active. Click or tap inside the plot to report composition, temperature, and phases.";
  }
}

function updateIronZoomBox(start, current) {
  const canvasRect = $("#iron-chart").getBoundingClientRect();
  const frameRect = $(".iron-chart-frame").getBoundingClientRect();
  const overlay = $(".iron-zoom-box");
  overlay.hidden = false;
  overlay.style.left = `${canvasRect.left - frameRect.left + Math.min(start.x, current.x)}px`;
  overlay.style.top = `${canvasRect.top - frameRect.top + Math.min(start.y, current.y)}px`;
  overlay.style.width = `${Math.abs(current.x - start.x)}px`;
  overlay.style.height = `${Math.abs(current.y - start.y)}px`;
}

function installIronCanvasInteraction(canvas) {
  const clampPointToCanvas = (point) => {
    const { width, height } = canvas.getBoundingClientRect();
    return {
      x: clamp(point.x, 0, width),
      y: clamp(point.y, 0, height)
    };
  };
  const clipRectangleToPlot = (start, current, plot) => {
    const plotLeft = plot.margins.left;
    const plotRight = plotLeft + plot.plotWidth;
    const plotTop = plot.margins.top;
    const plotBottom = plotTop + plot.plotHeight;
    const rawLeft = Math.min(start.x, current.x);
    const rawRight = Math.max(start.x, current.x);
    const rawTop = Math.min(start.y, current.y);
    const rawBottom = Math.max(start.y, current.y);
    const left = clamp(rawLeft, plotLeft, plotRight);
    const right = clamp(rawRight, plotLeft, plotRight);
    const top = clamp(rawTop, plotTop, plotBottom);
    const bottom = clamp(rawBottom, plotTop, plotBottom);
    return {
      left,
      right,
      top,
      bottom,
      width: Math.max(0, right - left),
      height: Math.max(0, bottom - top)
    };
  };
  const pointIsInPlot = (point, plot) => (
    between(point.x, plot.margins.left, plot.margins.left + plot.plotWidth)
    && between(point.y, plot.margins.top, plot.margins.top + plot.plotHeight)
  );
  const cancelGesture = (message = "Box zoom cancelled.") => {
    if (!ironBoxGesture && !ironIsZoomMode()) return;
    clearIronBoxGesture();
    setIronInteractionMode("read", { announce: false, redraw: false });
    drawIronChart();
    $("#iron-status").textContent = `${message} Read phases mode is active.`;
  };

  canvas.addEventListener("pointerdown", (event) => {
    if (ironBoxGesture && ironBoxGesture.pointerId !== event.pointerId) {
      cancelGesture("Box zoom cancelled because a second pointer was detected.");
      return;
    }
    if (!event.isPrimary || (event.pointerType === "mouse" && event.button !== 0)) return;
    drawIronChart();
    const plot = canvas._plot;
    if (!plot) return;
    const rawPoint = canvasPosition(event, canvas);

    if (!ironIsZoomMode()) {
      if (!pointIsInPlot(rawPoint, plot)) return;
      setIronFromChart(plot.valueX(rawPoint.x), plot.valueY(rawPoint.y));
      return;
    }

    event.preventDefault();
    const start = clampPointToCanvas(rawPoint);
    ironBoxGesture = {
      pointerId: event.pointerId,
      pointerType: event.pointerType,
      plot,
      start,
      current: start,
      moved: false
    };
    canvas.setPointerCapture?.(event.pointerId);
  });

  window.addEventListener("pointermove", (event) => {
    const gesture = ironBoxGesture;
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    event.preventDefault();
    gesture.current = clampPointToCanvas(canvasPosition(event, canvas));
    const threshold = gesture.pointerType === "touch" ? 12 : 6;
    gesture.moved = gesture.moved
      || Math.hypot(gesture.current.x - gesture.start.x, gesture.current.y - gesture.start.y) >= threshold;
    if (gesture.moved) updateIronZoomBox(gesture.start, gesture.current);
  }, { passive: false });

  window.addEventListener("pointerup", (event) => {
    const gesture = ironBoxGesture;
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    event.preventDefault();
    gesture.current = clampPointToCanvas(canvasPosition(event, canvas));
    const width = Math.abs(gesture.current.x - gesture.start.x);
    const height = Math.abs(gesture.current.y - gesture.start.y);
    const { plot } = gesture;
    const clippedRectangle = clipRectangleToPlot(gesture.start, gesture.current, plot);
    const moveThreshold = gesture.pointerType === "touch" ? 12 : 6;
    const wasMoved = gesture.moved || Math.hypot(width, height) >= moveThreshold;
    clearIronBoxGesture();

    if (!wasMoved) {
      setIronInteractionMode("read", { announce: false, redraw: false });
      drawIronChart();
      $("#iron-status").textContent = "No box zoom applied. Read phases mode is active; click or tap to inspect a point.";
      return;
    }
    if (clippedRectangle.width === 0 || clippedRectangle.height === 0) {
      setIronInteractionMode("read", { announce: false, redraw: false });
      drawIronChart();
      $("#iron-status").textContent = "Box zoom was not applied because the rectangle did not cross the plotted data. Read phases mode is active.";
      return;
    }
    if (clippedRectangle.width < 24 || clippedRectangle.height < 24) {
      setIronInteractionMode("read", { announce: false, redraw: false });
      drawIronChart();
      $("#iron-status").textContent = "Box zoom was not applied because the part inside the plotted data was too small. Read phases mode is active.";
      return;
    }

    const nextDomains = {
      xDomain: [plot.valueX(clippedRectangle.left), plot.valueX(clippedRectangle.right)],
      yDomain: [plot.valueY(clippedRectangle.bottom), plot.valueY(clippedRectangle.top)]
    };
    const changed = setIronDomains(nextDomains);
    setIronInteractionMode("read", { announce: false, redraw: false });
    drawIronChart();
    updateIronZoomControls();
    const { xDomain, yDomain } = ironChartDomains();
    const selectionIsVisible = between(ironState.composition, ...xDomain) && between(ironState.temperature, ...yDomain);
    $("#iron-status").textContent = changed
      ? `Box zoom applied. Showing ${xDomain[0].toFixed(2)}–${xDomain[1].toFixed(2)} wt% C and ${yDomain[0].toFixed(0)}–${yDomain[1].toFixed(0)} °C.${selectionIsVisible ? "" : " The selected state is outside this view."} Read phases mode is active; click or tap the enlarged field.`
      : "Box zoom not applied because that area matches the current view. Read phases mode is active.";
  });

  window.addEventListener("pointercancel", () => cancelGesture());
  canvas.addEventListener("lostpointercapture", (event) => {
    if (ironBoxGesture?.pointerId === event.pointerId) cancelGesture();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && ironIsZoomMode()) {
      event.preventDefault();
      cancelGesture();
      $('[data-iron-mode="read"]').focus();
    }
  });
  window.addEventListener("blur", () => cancelGesture());
  window.addEventListener("resize", () => cancelGesture("Box zoom cancelled after the chart resized."));
}

function updateIronZoomControls() {
  const metrics = ironZoomMetrics();
  const label = ironZoomLabel(metrics);
  const output = $("#iron-zoom-level");
  output.value = label;
  output.textContent = label;
  output.setAttribute(
    "aria-label",
    metrics.isBase
      ? "Current zoom level: 1 times"
      : `Current zoom level: ${metrics.xScale.toFixed(1)} times horizontally and ${metrics.yScale.toFixed(1)} times vertically`
  );
  const atLimit = metrics.xScale >= IRON_MAX_ZOOM_FACTOR - 1e-6 && metrics.yScale >= IRON_MAX_ZOOM_FACTOR - 1e-6;
  const canRestore = !metrics.isBase || ironState.zoomHistory.length > 0;
  $$('[data-iron-zoom]').forEach((button) => {
    const action = button.dataset.ironZoom;
    button.disabled = action === "in"
      ? atLimit
      : !canRestore;
  });
}

function updateIron({ announce = true, revealSelection = false } = {}) {
  ironState.composition = Number($("#iron-composition").value);
  ironState.temperature = Number($("#iron-temperature").value);
  if (revealSelection) keepIronSelectionVisible();
  const result = classifyIron(ironState.composition, ironState.temperature);
  currentIronResult = result;
  updateIronDomainLegend(result);
  $("#iron-composition-value").textContent = `${ironState.composition.toFixed(2)} wt% C`;
  $("#iron-temperature-value").textContent = `${ironState.temperature.toFixed(0)} °C`;
  $("#iron-region").textContent = result.region;
  $("#iron-summary").textContent = result.summary;
  $("#iron-overall").textContent = `${ironState.composition.toFixed(2)} wt% C`;

  if (result.invariant) {
    $("#iron-phase-a-label").textContent = `${result.kind} compositions`;
    $("#iron-phase-a").textContent = result.phases.map((phase, index) => `${phase} ${result.compositions[index]}`).join(" · ");
    $("#iron-phase-b-label").textContent = "Reaction";
    $("#iron-phase-b").textContent = result.reaction;
    $("#iron-fraction-a-label").textContent = "Phase fractions";
    $("#iron-fraction-a").textContent = "Reaction-path dependent";
    $("#iron-fraction-b-label").textContent = "Lever rule";
    $("#iron-fraction-b").textContent = "Use just above/below";
  } else if (result.single) {
    $("#iron-phase-a-label").innerHTML = `Composition, ${phaseVariableMarkup("C", result.phases[0])}`;
    $("#iron-phase-a").textContent = `${ironState.composition.toFixed(2)} wt% C`;
    $("#iron-phase-b-label").textContent = "Second phase";
    $("#iron-phase-b").textContent = "Not present";
    $("#iron-fraction-a-label").innerHTML = `Fraction, ${phaseVariableMarkup("W", result.phases[0])}`;
    $("#iron-fraction-a").textContent = "100.0%";
    $("#iron-fraction-b-label").textContent = "Lever rule";
    $("#iron-fraction-b").textContent = "Not needed";
  } else {
    $("#iron-phase-a-label").innerHTML = phaseVariableMarkup("C", result.leftName);
    $("#iron-phase-a").textContent = `${result.leftComposition.toFixed(result.leftComposition < 0.1 ? 3 : 2)} wt% C`;
    $("#iron-phase-b-label").innerHTML = phaseVariableMarkup("C", result.rightName);
    $("#iron-phase-b").textContent = `${result.rightComposition.toFixed(2)} wt% C`;
    $("#iron-fraction-a-label").innerHTML = phaseVariableMarkup("W", result.leftName);
    $("#iron-fraction-a").textContent = result.indeterminate ? "Indeterminate at transition" : percent(result.leftFraction);
    $("#iron-fraction-b-label").innerHTML = phaseVariableMarkup("W", result.rightName);
    $("#iron-fraction-b").textContent = result.indeterminate ? "Indeterminate at transition" : percent(result.rightFraction);
  }
  $("#iron-constituent").textContent = ironFinalConstituent(ironState.composition);
  drawIronChart();
  updateIronZoomControls();
  const mediaState = drawIronMicrostructure();
  if (announce) {
    const zoomMetrics = ironZoomMetrics();
    const zoomStatus = zoomMetrics.isBase ? "" : ` ${ironZoomPhrase(zoomMetrics)} chart zoom active.`;
    $("#iron-status").textContent = `${result.region} selected at ${ironState.composition.toFixed(2)} wt% C and ${ironState.temperature.toFixed(0)} °C.${zoomStatus} ${microstructureStatus(mediaState)}`;
  }
}

function setIronFromChart(composition, temperature) {
  $("#iron-composition").value = composition.toFixed(2);
  $("#iron-temperature").value = temperature.toFixed(0);
  updateIron({ announce: false });
  const phaseList = currentIronResult.phases.join(" + ");
  $("#iron-status").textContent = `Read phases: ${ironState.composition.toFixed(2)} wt% C at ${ironState.temperature.toFixed(0)} °C — ${currentIronResult.region}. ${currentIronResult.phases.length === 1 ? "Phase" : "Phases"}: ${phaseList}.`;
}

$("#iron-composition").addEventListener("input", () => updateIron({ announce: false, revealSelection: true }));
$("#iron-composition").addEventListener("change", () => updateIron({ revealSelection: true }));
$("#iron-temperature").addEventListener("input", () => updateIron({ announce: false, revealSelection: true }));
$("#iron-temperature").addEventListener("change", () => updateIron({ revealSelection: true }));
installIronCanvasInteraction($("#iron-chart"));

$$('[data-iron-micro-example]').forEach((button) => button.addEventListener("click", () => {
  $("#iron-composition").value = button.dataset.ironMicroExample;
  $("#iron-temperature").value = "700";
  updateIron({ revealSelection: true });
}));

$$('[data-iron-mode]').forEach((button) => button.addEventListener("click", () => {
  setIronInteractionMode(button.dataset.ironMode);
}));

$$('[data-iron-zoom]').forEach((button) => button.addEventListener("click", () => {
  const action = button.dataset.ironZoom;
  const hadFocus = document.activeElement === button;
  setIronInteractionMode("read", { announce: false, redraw: false });
  if (action === "in") zoomIronIn();
  if (action === "out") {
    restorePreviousIronZoom();
    keepIronSelectionVisible();
  }
  if (action === "reset") resetIronZoom();
  updateIron({ announce: false });
  if (hadFocus && button.disabled) {
    const nextAction = ironZoomMetrics().isBase ? "in" : "out";
    $(`[data-iron-zoom="${nextAction}"]`).focus();
  }
  const { xDomain, yDomain } = ironChartDomains();
  const zoomMetrics = ironZoomMetrics({ xDomain, yDomain });
  $("#iron-status").textContent = zoomMetrics.isBase
    ? `${ironState.view === "steel" ? "Steel-region range" : "Full diagram"} restored at 1× zoom.`
    : `${ironZoomPhrase(zoomMetrics)} chart zoom active. Showing ${xDomain[0].toFixed(2)}–${xDomain[1].toFixed(2)} wt% C and ${yDomain[0].toFixed(0)}–${yDomain[1].toFixed(0)} °C.`;
}));

$$("[data-iron-view]").forEach((button) => button.addEventListener("click", () => {
  setIronInteractionMode("read", { announce: false, redraw: false });
  ironState.view = button.dataset.ironView;
  resetIronZoom();
  $$("[data-iron-view]").forEach((candidate) => candidate.setAttribute("aria-pressed", String(candidate === button)));
  const max = ironState.view === "steel" ? 2.14 : FE.cementite;
  $("#iron-composition").max = String(max);
  if (ironState.composition > max) $("#iron-composition").value = String(max);
  const maxTemperature = ironState.view === "steel" ? 1147 : 1600;
  $("#iron-temperature").max = String(maxTemperature);
  if (ironState.temperature > maxTemperature) $("#iron-temperature").value = String(maxTemperature);
  updateIron();
  $("#iron-status").textContent = `${ironState.view === "steel" ? "Steel-region range" : "Full diagram"} active at 1× zoom. Selected ${ironState.composition.toFixed(2)} wt% C at ${ironState.temperature.toFixed(0)} °C.`;
}));

// ---------------------------------------------------------------------------
// Initial render and responsive redraws

function initialize() {
  setWaterSelection("triple");
  updateIso({ announce: false });
  renderQuizProblem();
  updatePb({ announce: false });
  renderIronDomainLegend();
  setIronInteractionMode("read", { announce: false, redraw: false });
  updateIron({ announce: false });

  registerRedraw($("#water-chart"), drawWaterChart);
  registerRedraw($("#iso-chart"), drawIsoChart);
  registerRedraw($("#pb-chart"), drawPbChart);
  registerRedraw($("#pb-microstructure"), drawPbMicrostructure);
  registerRedraw($("#iron-chart"), drawIronChart);
  registerRedraw($("#iron-microstructure"), drawIronMicrostructure);
}

initialize();
