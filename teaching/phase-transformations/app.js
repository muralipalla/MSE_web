const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const COLORS = {
  ink: "#2e2a74",
  inkSoft: "#554f82",
  muted: "#69648d",
  coral: "#c93b1f",
  coralBright: "#f05030",
  coralLight: "#fff0ea",
  lavender: "#6757a8",
  lavenderLight: "#eeeaf7",
  blue: "#386694",
  blueLight: "#e7f0f6",
  teal: "#176f67",
  tealDark: "#10564f",
  tealLight: "#e1f3ef",
  gold: "#c47b19",
  goldLight: "#fff1d5",
  grid: "rgba(46, 42, 116, 0.12)",
  paper: "#fffefa",
  white: "#ffffff"
};

const MATERIALS = {
  aluminium: { name: "Aluminium", symbol: "Al", tm: 933, hf: 10.71e3, vm: 10.00e-6 },
  copper: { name: "Copper", symbol: "Cu", tm: 1358, hf: 13.05e3, vm: 7.11e-6 },
  iron: { name: "Iron", symbol: "Fe", tm: 1811, hf: 13.81e3, vm: 7.09e-6 }
};

const KB = 1.380649e-23;
const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));
const lerp = (a, b, amount) => a + (b - a) * amount;
const log10 = (value) => Math.log(value) / Math.LN10;
const number = (selector) => Number($(selector)?.value ?? 0);
const setText = (selector, value) => { const element = $(selector); if (element) element.textContent = value; };
const setHTML = (selector, value) => { const element = $(selector); if (element) element.innerHTML = value; };

function roundedRect(context, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + r, y);
  context.arcTo(x + width, y, x + width, y + height, r);
  context.arcTo(x + width, y + height, x, y + height, r);
  context.arcTo(x, y + height, x, y, r);
  context.arcTo(x, y, x + width, y, r);
  context.closePath();
}

function fitCanvas(canvas, background = COLORS.paper) {
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
  context.fillStyle = background;
  context.fillRect(0, 0, width, height);
  context.lineJoin = "round";
  context.lineCap = "round";
  return { context, width, height, density };
}

function makePlot(context, bounds, xDomain, yDomain) {
  const [xMin, xMax] = xDomain;
  const [yMin, yMax] = yDomain;
  const x = (value) => bounds.left + ((value - xMin) / (xMax - xMin)) * bounds.width;
  const y = (value) => bounds.top + (1 - (value - yMin) / (yMax - yMin)) * bounds.height;
  const valueX = (pixel) => xMin + ((pixel - bounds.left) / bounds.width) * (xMax - xMin);
  const valueY = (pixel) => yMin + (1 - (pixel - bounds.top) / bounds.height) * (yMax - yMin);
  return { context, bounds, xDomain, yDomain, x, y, valueX, valueY };
}

function drawPlotFrame(plot, options = {}) {
  const { context, bounds, x, y } = plot;
  const xTicks = options.xTicks || [];
  const yTicks = options.yTicks || [];
  const xFormat = options.xFormat || ((value) => String(value));
  const yFormat = options.yFormat || ((value) => String(value));
  context.save();
  context.fillStyle = "rgba(255,255,255,0.72)";
  roundedRect(context, bounds.left, bounds.top, bounds.width, bounds.height, 10);
  context.fill();
  context.strokeStyle = COLORS.grid;
  context.lineWidth = 1;
  xTicks.forEach((value) => {
    const px = x(value);
    context.beginPath();
    context.moveTo(px, bounds.top);
    context.lineTo(px, bounds.top + bounds.height);
    context.stroke();
    context.fillStyle = COLORS.muted;
    context.font = "11px system-ui, sans-serif";
    context.textAlign = "center";
    context.textBaseline = "top";
    context.fillText(xFormat(value), px, bounds.top + bounds.height + 7);
  });
  yTicks.forEach((value) => {
    const py = y(value);
    context.beginPath();
    context.moveTo(bounds.left, py);
    context.lineTo(bounds.left + bounds.width, py);
    context.stroke();
    context.fillStyle = COLORS.muted;
    context.font = "11px system-ui, sans-serif";
    context.textAlign = "right";
    context.textBaseline = "middle";
    context.fillText(yFormat(value), bounds.left - 8, py);
  });
  context.strokeStyle = "rgba(46,42,116,0.35)";
  context.strokeRect(bounds.left, bounds.top, bounds.width, bounds.height);
  if (options.xLabel) {
    context.fillStyle = COLORS.inkSoft;
    context.font = "700 12px system-ui, sans-serif";
    context.textAlign = "center";
    context.textBaseline = "bottom";
    context.fillText(options.xLabel, bounds.left + bounds.width / 2, bounds.top + bounds.height + 36);
  }
  if (options.yLabel) {
    context.save();
    context.translate(bounds.left - 46, bounds.top + bounds.height / 2);
    context.rotate(-Math.PI / 2);
    context.fillStyle = COLORS.inkSoft;
    context.font = "700 12px system-ui, sans-serif";
    context.textAlign = "center";
    context.textBaseline = "top";
    context.fillText(options.yLabel, 0, 0);
    context.restore();
  }
  if (options.title) {
    context.fillStyle = COLORS.ink;
    context.font = "800 13px system-ui, sans-serif";
    context.textAlign = "left";
    context.textBaseline = "bottom";
    context.fillText(options.title, bounds.left, bounds.top - 8);
  }
  context.restore();
}

function strokeSeries(plot, samples, color, width = 2.5, dash = []) {
  const { context, x, y } = plot;
  context.save();
  context.strokeStyle = color;
  context.lineWidth = width;
  context.setLineDash(dash);
  context.beginPath();
  samples.forEach(([xValue, yValue], index) => {
    const px = x(xValue);
    const py = y(yValue);
    if (index === 0) context.moveTo(px, py);
    else context.lineTo(px, py);
  });
  context.stroke();
  context.restore();
}

function drawDot(context, x, y, color, radius = 5) {
  context.save();
  context.fillStyle = COLORS.white;
  context.strokeStyle = color;
  context.lineWidth = 3;
  context.beginPath();
  context.arc(x, y, radius, 0, Math.PI * 2);
  context.fill();
  context.stroke();
  context.restore();
}

function drawLabel(context, text, x, y, options = {}) {
  context.save();
  context.font = options.font || "800 12px system-ui, sans-serif";
  const paddingX = 7;
  const width = context.measureText(text).width + paddingX * 2;
  const height = 24;
  const left = options.align === "right" ? x - width : x;
  context.fillStyle = options.background || "rgba(255,255,255,0.93)";
  roundedRect(context, left, y - height / 2, width, height, 7);
  context.fill();
  context.fillStyle = options.color || COLORS.ink;
  context.textAlign = "left";
  context.textBaseline = "middle";
  context.fillText(text, left + paddingX, y);
  context.restore();
}

function scientificHTML(value, digits = 2, unit = "") {
  if (!Number.isFinite(value)) return "&infin;";
  if (value === 0) return `0${unit ? ` ${unit}` : ""}`;
  const exponent = Math.floor(Math.log10(Math.abs(value)));
  const coefficient = value / 10 ** exponent;
  return `${coefficient.toFixed(digits)} &times; 10<sup>${exponent < 0 ? "&minus;" : ""}${Math.abs(exponent)}</sup>${unit ? ` ${unit}` : ""}`;
}

function formatTime(seconds) {
  if (seconds < 0.01) return `${(seconds * 1000).toFixed(2)} ms`;
  if (seconds < 1) return `${seconds.toFixed(2)} s`;
  if (seconds < 100) return `${seconds.toFixed(seconds < 10 ? 1 : 0)} s`;
  if (seconds < 3600) return `${(seconds / 60).toFixed(1)} min`;
  if (seconds < 86400) return `${(seconds / 3600).toFixed(1)} h`;
  return `${(seconds / 86400).toFixed(1)} d`;
}

const redrawers = new Set();
let resizeFrame = 0;
function registerRedraw(canvas, redraw) {
  redrawers.add(redraw);
  if ("ResizeObserver" in window) {
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(resizeFrame);
      resizeFrame = requestAnimationFrame(redraw);
    });
    observer.observe(canvas);
  }
}
if (!("ResizeObserver" in window)) {
  window.addEventListener("resize", () => {
    cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(() => redrawers.forEach((redraw) => redraw()));
  });
}

// ---------------------------------------------------------------------------
// Submodule 1: thermodynamic driving force

const thermoCanvas = $("#thermo-chart");

function thermoState() {
  const material = MATERIALS[$("#material-select")?.value || "copper"];
  const temperature = number("#thermo-temperature");
  const deltaT = material.tm - temperature;
  const deltaGm = -material.hf * deltaT / material.tm;
  const deltaGv = deltaGm / material.vm;
  return { material, temperature, deltaT, deltaGm, deltaGv };
}

function drawThermo() {
  if (!thermoCanvas) return;
  const { context, width, height } = fitCanvas(thermoCanvas);
  const { material, temperature } = thermoState();
  const compact = width < 570;
  const left = compact ? 56 : 72;
  const right = compact ? 18 : 28;
  const topBounds = { left, top: 38, width: width - left - right, height: height * 0.42 };
  const bottomTop = topBounds.top + topBounds.height + (compact ? 83 : 88);
  const bottomBounds = { left, top: bottomTop, width: width - left - right, height: height - bottomTop - 54 };
  const xMin = Math.round(material.tm * 0.75);
  const xMax = Math.round(material.tm * 1.05);
  const xTicks = [0.75, 0.85, 0.95, 1, 1.05].map((ratio) => Math.round(material.tm * ratio));
  const upper = makePlot(context, topBounds, [xMin, xMax], [-0.2, 0.65]);
  const lower = makePlot(context, bottomBounds, [xMin, xMax], [-0.27, 0.08]);
  drawPlotFrame(upper, {
    xTicks,
    yTicks: [0, 0.2, 0.4, 0.6],
    xFormat: (value) => String(Math.round(value)),
    yFormat: (value) => value.toFixed(1),
    title: "Relative Gibbs free energy",
    yLabel: "Relative G / ΔHf"
  });
  drawPlotFrame(lower, {
    xTicks,
    yTicks: [-0.25, -0.15, -0.05, 0.05],
    xFormat: (value) => String(Math.round(value)),
    yFormat: (value) => value.toFixed(2),
    title: "Signed bulk driving force",
    xLabel: "Temperature, T (K)",
    yLabel: "ΔGm / ΔHf"
  });

  const solid = [];
  const liquid = [];
  const driving = [];
  for (let index = 0; index <= 160; index += 1) {
    const t = lerp(xMin, xMax, index / 160);
    const tauOffset = (t - material.tm) / material.tm;
    const baseline = -1.8 * tauOffset;
    solid.push([t, baseline + 0.5 * tauOffset]);
    liquid.push([t, baseline - 0.5 * tauOffset]);
    driving.push([t, tauOffset]);
  }
  strokeSeries(upper, liquid, COLORS.blue, 3);
  strokeSeries(upper, solid, COLORS.coral, 3);
  strokeSeries(lower, driving, COLORS.teal, 3);

  [upper, lower].forEach((plot) => {
    context.save();
    context.strokeStyle = COLORS.gold;
    context.lineWidth = 1.5;
    context.setLineDash([6, 5]);
    context.beginPath();
    context.moveTo(plot.x(material.tm), plot.bounds.top);
    context.lineTo(plot.x(material.tm), plot.bounds.top + plot.bounds.height);
    context.stroke();
    context.restore();
  });
  drawLabel(context, "Tm", upper.x(material.tm) + 5, upper.bounds.top + 16, { color: COLORS.gold });

  const tauOffset = (temperature - material.tm) / material.tm;
  const baseline = -1.8 * tauOffset;
  const gs = baseline + 0.5 * tauOffset;
  const gl = baseline - 0.5 * tauOffset;
  const tx = upper.x(temperature);
  context.save();
  context.strokeStyle = COLORS.ink;
  context.lineWidth = 1.5;
  context.setLineDash([4, 4]);
  context.beginPath();
  context.moveTo(tx, upper.bounds.top);
  context.lineTo(tx, upper.bounds.top + upper.bounds.height);
  context.stroke();
  context.restore();
  drawDot(context, tx, upper.y(gs), COLORS.coral, 4.5);
  drawDot(context, tx, upper.y(gl), COLORS.blue, 4.5);
  drawDot(context, lower.x(temperature), lower.y(tauOffset), COLORS.teal, 5);

  context.save();
  context.strokeStyle = COLORS.coral;
  context.lineWidth = 4;
  context.beginPath();
  context.moveTo(tx, upper.y(gs));
  context.lineTo(tx, upper.y(gl));
  context.stroke();
  context.restore();
  drawLabel(context, "GS", upper.x(xMax) - 5, upper.y(solid.at(-1)[1]) - 13, { align: "right", color: COLORS.coral });
  drawLabel(context, "GL", upper.x(xMax) - 5, upper.y(liquid.at(-1)[1]) + 13, { align: "right", color: COLORS.blue });

  thermoCanvas.setAttribute("aria-label", `${material.name} at ${Math.round(temperature)} kelvin. The signed molar solidification free-energy change is ${(thermoState().deltaGm / 1000).toFixed(2)} kilojoules per mole.`);
}

function updateThermo({ announce = true } = {}) {
  if (!thermoCanvas) return;
  const { material, temperature, deltaT, deltaGm, deltaGv } = thermoState();
  setText("#thermo-temperature-value", `${Math.round(temperature)} K`);
  setText("#thermo-tm", `${material.tm} K`);
  setText("#thermo-undercooling", deltaT > 0 ? `${Math.round(deltaT)} K` : deltaT < 0 ? `${Math.round(Math.abs(deltaT))} K superheat` : "0 K");
  setHTML("#thermo-dgm", `${deltaGm < 0 ? "&minus;" : deltaGm > 0 ? "+" : ""}${Math.abs(deltaGm / 1000).toFixed(2)} kJ mol<sup>&minus;1</sup>`);
  setHTML("#thermo-dgv", `${Math.abs(deltaGv / 1e6).toFixed(1)} MJ m<sup>&minus;3</sup>`);
  const card = $("#thermo-state-card");
  card.classList.remove("favourable", "unfavourable", "equilibrium");
  let status;
  if (Math.abs(deltaT) < 0.5) {
    card.classList.add("equilibrium");
    setText("#thermo-state-label", "Liquid and solid are in equilibrium");
    setHTML("#thermo-state-symbol", "G<sub>S</sub> = G<sub>L</sub>");
    status = `${material.name} is at its equilibrium melting point.`;
  } else if (deltaT > 0) {
    card.classList.add("favourable");
    setText("#thermo-state-label", "Solidification is favourable");
    setHTML("#thermo-state-symbol", "G<sub>S</sub> &lt; G<sub>L</sub>");
    status = `${material.name} is ${Math.round(deltaT)} kelvin below its equilibrium melting point.`;
  } else {
    card.classList.add("unfavourable");
    setText("#thermo-state-label", "Melting is favourable");
    setHTML("#thermo-state-symbol", "G<sub>L</sub> &lt; G<sub>S</sub>");
    status = `${material.name} is ${Math.round(Math.abs(deltaT))} kelvin above its equilibrium melting point.`;
  }
  if (announce) setText("#thermo-status", status);
  $("#thermo-temperature").setAttribute("aria-valuetext", `${Math.round(temperature)} kelvin; ${status}`);
  drawThermo();
}

if (thermoCanvas) {
  $("#material-select").addEventListener("change", () => {
    const material = MATERIALS[$("#material-select").value];
    const slider = $("#thermo-temperature");
    slider.min = String(Math.round(material.tm * 0.75));
    slider.max = String(Math.round(material.tm * 1.05));
    slider.value = String(material.tm - Math.min(100, Math.round(material.tm * 0.08)));
    updateThermo();
  });
  $("#thermo-temperature").addEventListener("input", () => updateThermo({ announce: false }));
  $("#thermo-temperature").addEventListener("change", () => updateThermo());
  registerRedraw(thermoCanvas, drawThermo);
  updateThermo();
}

// ---------------------------------------------------------------------------
// Submodule 2: homogeneous and heterogeneous nucleation

const nucleationCanvas = $("#nucleation-chart");
let latestCnt = null;

function cntState() {
  const material = MATERIALS[$("#cnt-material-select")?.value || "copper"];
  const deltaT = Math.max(0.001, number("#cnt-undercooling"));
  const gamma = Math.max(0.001, number("#cnt-gamma"));
  const relativeRadius = number("#cnt-radius");
  const deltaGvMagnitude = (material.hf / material.vm) * (deltaT / material.tm);
  const rStar = 2 * gamma / deltaGvMagnitude;
  const barrier = (16 * Math.PI * gamma ** 3) / (3 * deltaGvMagnitude ** 2);
  const temperature = Math.max(1, material.tm - deltaT);
  return { material, deltaT, gamma, relativeRadius, deltaGvMagnitude, rStar, barrier, temperature };
}

function drawNucleation() {
  if (!nucleationCanvas) return;
  const { context, width, height } = fitCanvas(nucleationCanvas);
  const compact = width < 570;
  const bounds = { left: compact ? 58 : 72, top: 34, width: width - (compact ? 76 : 100), height: height - 90 };
  const plot = makePlot(context, bounds, [0, 2.5], [-32, 20]);
  drawPlotFrame(plot, {
    xTicks: [0, 0.5, 1, 1.5, 2, 2.5],
    yTicks: [-30, -20, -10, 0, 10, 20],
    xFormat: (value) => value.toFixed(value % 1 ? 1 : 0),
    yFormat: (value) => String(value),
    xLabel: "Relative radius, r / r*",
    yLabel: "Normalised energy, ΔG / ΔG*"
  });
  const surface = [];
  const volume = [];
  const total = [];
  for (let index = 0; index <= 180; index += 1) {
    const xValue = 2.5 * index / 180;
    surface.push([xValue, 3 * xValue ** 2]);
    volume.push([xValue, -2 * xValue ** 3]);
    total.push([xValue, 3 * xValue ** 2 - 2 * xValue ** 3]);
  }
  strokeSeries(plot, surface, COLORS.gold, 2.7);
  strokeSeries(plot, volume, COLORS.blue, 2.7);
  strokeSeries(plot, total, COLORS.coral, 3.4);
  context.save();
  context.strokeStyle = COLORS.ink;
  context.lineWidth = 1.5;
  context.setLineDash([5, 5]);
  context.beginPath();
  context.moveTo(plot.x(1), plot.y(0));
  context.lineTo(plot.x(1), plot.y(1));
  context.stroke();
  context.restore();
  drawDot(context, plot.x(1), plot.y(1), COLORS.coral, 5.5);
  drawLabel(context, "r* · ΔG*", plot.x(1) + 8, plot.y(1) - 15, { color: COLORS.coral });
  const xSelected = latestCnt?.relativeRadius ?? number("#cnt-radius");
  const ySelected = 3 * xSelected ** 2 - 2 * xSelected ** 3;
  context.save();
  context.strokeStyle = COLORS.teal;
  context.lineWidth = 1.4;
  context.setLineDash([3, 4]);
  context.beginPath();
  context.moveTo(plot.x(xSelected), plot.y(0));
  context.lineTo(plot.x(xSelected), plot.y(clamp(ySelected, -32, 20)));
  context.stroke();
  context.restore();
  drawDot(context, plot.x(xSelected), plot.y(clamp(ySelected, -32, 20)), COLORS.teal, 5);
  drawLabel(context, "selected r", clamp(plot.x(xSelected) + 7, bounds.left + 5, bounds.left + bounds.width - 78), clamp(plot.y(clamp(ySelected, -32, 20)) - 15, bounds.top + 14, bounds.top + bounds.height - 14), { color: COLORS.teal });
  nucleationCanvas.setAttribute("aria-label", `Normalised classical nucleation curves. Selected radius is ${xSelected.toFixed(2)} times the critical radius.`);
}

function hashNoise(seed) {
  const value = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return value - Math.floor(value);
}

function drawArrow(context, x1, y1, x2, y2, color, label = "") {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  context.save();
  context.strokeStyle = color;
  context.fillStyle = color;
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(x1, y1);
  context.lineTo(x2, y2);
  context.stroke();
  context.beginPath();
  context.moveTo(x2, y2);
  context.lineTo(x2 - 8 * Math.cos(angle - 0.5), y2 - 8 * Math.sin(angle - 0.5));
  context.lineTo(x2 - 8 * Math.cos(angle + 0.5), y2 - 8 * Math.sin(angle + 0.5));
  context.closePath();
  context.fill();
  if (label) {
    context.font = "700 11px system-ui, sans-serif";
    context.textAlign = "center";
    context.textBaseline = "bottom";
    context.fillText(label, (x1 + x2) / 2, Math.min(y1, y2) - 4);
  }
  context.restore();
}

function drawCluster() {
  const canvas = $("#cluster-canvas");
  if (!canvas || !latestCnt) return;
  const { context, width, height } = fitCanvas(canvas, "#f2f7f6");
  const center = { x: width * 0.49, y: height * 0.5 };
  const relative = latestCnt.relativeRadius;
  const radius = 4 + relative * Math.min(38, width * 0.07);
  for (let index = 0; index < 105; index += 1) {
    const x = 10 + hashNoise(index * 2 + 1) * (width - 20);
    const y = 10 + hashNoise(index * 2 + 2) * (height - 20);
    if (Math.hypot(x - center.x, y - center.y) < radius + 8) continue;
    context.fillStyle = index % 3 ? "rgba(56,102,148,0.32)" : "rgba(103,87,168,0.26)";
    context.beginPath();
    context.arc(x, y, 3.2, 0, Math.PI * 2);
    context.fill();
  }
  context.fillStyle = relative < 1 ? "rgba(196,123,25,0.10)" : "rgba(23,111,103,0.12)";
  context.strokeStyle = relative < 1 ? COLORS.gold : COLORS.teal;
  context.lineWidth = 2;
  context.beginPath();
  context.arc(center.x, center.y, radius + 7, 0, Math.PI * 2);
  context.fill();
  context.stroke();
  const spacing = 12;
  for (let row = -8; row <= 8; row += 1) {
    for (let column = -8; column <= 8; column += 1) {
      const x = center.x + column * spacing + (row % 2) * spacing / 2;
      const y = center.y + row * spacing * 0.86;
      if (Math.hypot(x - center.x, y - center.y) > radius) continue;
      context.fillStyle = relative < 1 ? COLORS.gold : COLORS.teal;
      context.strokeStyle = COLORS.white;
      context.lineWidth = 1;
      context.beginPath();
      context.arc(x, y, 4.2, 0, Math.PI * 2);
      context.fill();
      context.stroke();
    }
  }
  const direction = relative < 0.98 ? 1 : relative > 1.02 ? -1 : 0;
  for (let index = 0; index < 8; index += 1) {
    const angle = index * Math.PI / 4;
    const inner = radius + (direction < 0 ? 30 : 8);
    const outer = radius + (direction < 0 ? 8 : 30);
    if (direction !== 0) drawArrow(context, center.x + Math.cos(angle) * inner, center.y + Math.sin(angle) * inner, center.x + Math.cos(angle) * outer, center.y + Math.sin(angle) * outer, direction > 0 ? COLORS.gold : COLORS.teal);
  }
  drawLabel(context, relative < 0.98 ? "shrinkage favoured" : relative > 1.02 ? "growth favoured" : "critical fluctuation", 12, 20, { color: relative < 0.98 ? COLORS.gold : relative > 1.02 ? COLORS.teal : COLORS.coral });
}

function updateNucleation({ announce = true } = {}) {
  if (!nucleationCanvas) return;
  latestCnt = cntState();
  const { material, deltaT, gamma, relativeRadius, rStar, barrier, temperature } = latestCnt;
  const selectedRadius = rStar * relativeRadius;
  const barrierKT = barrier / (KB * temperature);
  setText("#cnt-undercooling-value", `${Math.round(deltaT)} K`);
  setHTML("#cnt-gamma-value", `${gamma.toFixed(2)} J m<sup>&minus;2</sup>`);
  setText("#cnt-radius-value", relativeRadius.toFixed(2));
  setText("#cnt-rstar", `${(rStar * 1e9).toFixed(2)} nm`);
  setText("#cnt-selected-radius", `${(selectedRadius * 1e9).toFixed(2)} nm`);
  setHTML("#cnt-barrier", scientificHTML(barrier, 2, "J"));
  setText("#cnt-barrier-kt", barrierKT > 9999 ? barrierKT.toExponential(2) : Math.round(barrierKT).toLocaleString());
  let state;
  let caption;
  let status;
  if (relativeRadius < 0.98) {
    state = "Subcritical · shrinkage favoured";
    caption = "The selected embryo is subcritical and tends to dissolve.";
    status = `At ${relativeRadius.toFixed(2)} r*, reducing the radius lowers total free energy.`;
  } else if (relativeRadius > 1.02) {
    state = "Supercritical · growth favoured";
    caption = "The selected embryo is supercritical; growth lowers total free energy.";
    status = `At ${relativeRadius.toFixed(2)} r*, growth is thermodynamically favoured, although attachment can still be kinetically slow.`;
  } else {
    state = "Critical · unstable maximum";
    caption = "The selected embryo is at the unstable critical size.";
    status = "At r*, an infinitesimal size fluctuation can favour either growth or shrinkage.";
  }
  setText("#cnt-embryo-state", state);
  setText("#cluster-caption", caption);
  if (announce) setText("#cnt-status", status);
  $("#cnt-radius").setAttribute("aria-valuetext", `${relativeRadius.toFixed(2)} times the critical radius; ${state}`);
  nucleationCanvas.dataset.material = material.symbol;
  drawNucleation();
  drawCluster();
  updateHeterogeneous({ announce: false });
}

function shapeFactor(angleDegrees) {
  const cosine = Math.cos(angleDegrees * Math.PI / 180);
  return ((2 + cosine) * (1 - cosine) ** 2) / 4;
}

function drawHeterogeneous() {
  const canvas = $("#heterogeneous-canvas");
  if (!canvas) return;
  const { context, width, height } = fitCanvas(canvas, "#f7f8fb");
  const thetaDegrees = number("#contact-angle");
  const theta = thetaDegrees * Math.PI / 180;
  const substrateY = height * 0.72;
  const centerX = width * 0.5;
  const radius = Math.min(width * 0.23, height * 0.47);
  const centerY = substrateY + radius * Math.cos(theta);
  const halfWidth = radius * Math.sin(theta);
  const left = centerX - halfWidth;
  const right = centerX + halfWidth;

  const liquidGradient = context.createLinearGradient(0, 0, 0, substrateY);
  liquidGradient.addColorStop(0, "#eaf3fa");
  liquidGradient.addColorStop(1, "#f9fcfd");
  context.fillStyle = liquidGradient;
  context.fillRect(0, 0, width, substrateY);
  context.fillStyle = "#ddd6ca";
  context.fillRect(0, substrateY, width, height - substrateY);
  context.strokeStyle = COLORS.inkSoft;
  context.lineWidth = 3;
  context.beginPath();
  context.moveTo(0, substrateY);
  context.lineTo(width, substrateY);
  context.stroke();

  if (thetaDegrees > 0) {
    const fill = context.createLinearGradient(centerX, centerY - radius, centerX, substrateY);
    fill.addColorStop(0, "rgba(23,111,103,0.9)");
    fill.addColorStop(1, "rgba(23,111,103,0.6)");
    context.beginPath();
    context.moveTo(left, substrateY);
    const steps = 100;
    for (let index = 0; index <= steps; index += 1) {
      const phi = lerp(-theta, theta, index / steps);
      const x = centerX + radius * Math.sin(phi);
      const y = centerY - radius * Math.cos(phi);
      context.lineTo(x, y);
    }
    context.lineTo(right, substrateY);
    context.closePath();
    context.fillStyle = fill;
    context.fill();
    context.strokeStyle = COLORS.tealDark;
    context.lineWidth = 3;
    context.stroke();
  } else {
    context.strokeStyle = COLORS.teal;
    context.lineWidth = 5;
    context.beginPath();
    context.moveTo(centerX - 36, substrateY - 3);
    context.lineTo(centerX + 36, substrateY - 3);
    context.stroke();
  }

  context.fillStyle = COLORS.inkSoft;
  context.font = "800 12px system-ui, sans-serif";
  context.textAlign = "left";
  context.fillText("liquid, L", 16, 25);
  context.fillText("substrate, W", 16, substrateY + 25);
  if (thetaDegrees > 8) {
    context.fillStyle = COLORS.white;
    context.textAlign = "center";
    context.fillText("solid nucleus, S", centerX, Math.min(substrateY - 18, centerY - radius + 42));
  }

  const contactX = right;
  const vectorScale = Math.min(64, width * 0.1);
  const gammaWS = vectorScale;
  const gammaSL = vectorScale;
  const gammaWL = gammaWS + gammaSL * Math.cos(theta);
  drawArrow(context, contactX, substrateY + 4, contactX + gammaWL, substrateY + 4, COLORS.blue, "γWL");
  drawArrow(context, contactX, substrateY + 4, contactX - gammaWS, substrateY + 4, COLORS.gold, "γWS");
  if (thetaDegrees > 0) drawArrow(context, contactX, substrateY, contactX - gammaSL * Math.cos(theta), substrateY - gammaSL * Math.sin(theta), COLORS.teal, "γSL");

  if (thetaDegrees > 4 && thetaDegrees < 176) {
    const arcRadius = 32;
    context.save();
    context.strokeStyle = COLORS.coral;
    context.lineWidth = 2;
    context.beginPath();
    const steps = 40;
    context.moveTo(contactX - arcRadius, substrateY - 1);
    for (let index = 0; index <= steps; index += 1) {
      const phi = Math.PI - theta * index / steps;
      context.lineTo(contactX + arcRadius * Math.cos(phi), substrateY - arcRadius * Math.sin(phi));
    }
    context.stroke();
    context.fillStyle = COLORS.coral;
    context.font = "900 13px system-ui, sans-serif";
    context.textAlign = "center";
    context.fillText(`θ = ${thetaDegrees}°`, contactX - 44, substrateY - 38);
    context.restore();
  }
  canvas.setAttribute("aria-label", `Spherical-cap nucleus at a contact angle of ${thetaDegrees} degrees. The ideal heterogeneous barrier is ${(shapeFactor(thetaDegrees) * 100).toFixed(1)} percent of the homogeneous barrier.`);
}

function updateHeterogeneous({ announce = true } = {}) {
  const canvas = $("#heterogeneous-canvas");
  if (!canvas) return;
  const angle = number("#contact-angle");
  const factor = shapeFactor(angle);
  const barrier = (latestCnt || cntState()).barrier * factor;
  const percent = factor * 100;
  setText("#contact-angle-value", `${Math.round(angle)}°`);
  setText("#shape-factor", factor.toFixed(3));
  setHTML("#heterogeneous-barrier", scientificHTML(barrier, 2, "J"));
  setText("#heterogeneous-percent", `${percent < 0.1 && percent > 0 ? "<0.1" : percent.toFixed(percent < 10 ? 1 : 0)}%`);
  $("#heterogeneous-bar").style.width = `${clamp(percent, 0, 100)}%`;
  const description = angle === 0 ? "The ideal complete-wetting limit makes f(θ) = 0; real sites still have structural and kinetic constraints." : angle === 180 ? "The non-wetting limit gives the full homogeneous barrier." : angle < 45 ? "Very good wetting produces a small ideal barrier." : angle < 90 ? "Good wetting substantially lowers the ideal barrier." : angle === 90 ? "At 90 degrees, the ideal barrier is exactly half the homogeneous value." : angle < 145 ? "Poor wetting gives only a modest barrier reduction." : "Very poor wetting approaches homogeneous nucleation.";
  if (announce) setText("#heterogeneous-status", description);
  $("#contact-angle").setAttribute("aria-valuetext", `${angle} degrees; shape factor ${factor.toFixed(3)}`);
  drawHeterogeneous();
}

if (nucleationCanvas) {
  ["#cnt-undercooling", "#cnt-gamma", "#cnt-radius"].forEach((selector) => {
    $(selector).addEventListener("input", () => updateNucleation({ announce: false }));
    $(selector).addEventListener("change", () => updateNucleation());
  });
  $("#cnt-material-select").addEventListener("change", () => {
    const material = MATERIALS[$("#cnt-material-select").value];
    const slider = $("#cnt-undercooling");
    slider.max = String(Math.round(material.tm * 0.25));
    slider.value = String(Math.min(Number(slider.value), Number(slider.max)));
    updateNucleation();
  });
  $("#contact-angle").addEventListener("input", () => updateHeterogeneous({ announce: false }));
  $("#contact-angle").addEventListener("change", () => updateHeterogeneous());
  registerRedraw(nucleationCanvas, drawNucleation);
  registerRedraw($("#cluster-canvas"), drawCluster);
  registerRedraw($("#heterogeneous-canvas"), drawHeterogeneous);
  updateNucleation();
}

// ---------------------------------------------------------------------------
// Submodule 3: nucleation-rate competition and JMAK kinetics

const rateCanvas = $("#rate-chart");
const jmakCanvas = $("#jmak-chart");
let rateCache = null;

function rateLog(tau, barrierScale, mobilityPenalty) {
  const safeTau = clamp(tau, 0.5001, 0.999);
  return -barrierScale / (safeTau * (1 - safeTau) ** 2) - mobilityPenalty / safeTau;
}

function buildRateData() {
  const barrierScale = number("#barrier-scale") || 0.3;
  const mobilityPenalty = number("#mobility-penalty") || 14;
  const raw = [];
  for (let index = 0; index <= 260; index += 1) {
    const tau = lerp(0.5, 0.995, index / 260);
    const thermodynamicLog = -barrierScale / (tau * (1 - tau) ** 2);
    const mobilityLog = -mobilityPenalty / tau;
    raw.push({ tau, thermodynamicLog, mobilityLog, totalLog: thermodynamicLog + mobilityLog });
  }
  const thermoMax = Math.max(...raw.map((point) => point.thermodynamicLog));
  const mobilityMax = Math.max(...raw.map((point) => point.mobilityLog));
  const totalMax = Math.max(...raw.map((point) => point.totalLog));
  const points = raw.map((point) => ({
    ...point,
    thermodynamic: Math.exp(clamp(point.thermodynamicLog - thermoMax, -18, 0)),
    mobility: Math.exp(clamp(point.mobilityLog - mobilityMax, -18, 0)),
    total: Math.exp(clamp(point.totalLog - totalMax, -18, 0))
  }));
  const peak = points.reduce((best, point) => point.total > best.total ? point : best, points[0]);
  return { barrierScale, mobilityPenalty, points, peak, totalMax };
}

function drawRate() {
  if (!rateCanvas) return;
  const { context, width, height } = fitCanvas(rateCanvas);
  const compact = width < 520;
  const bounds = { left: compact ? 52 : 62, top: 34, width: width - (compact ? 68 : 84), height: height - 88 };
  const plot = makePlot(context, bounds, [0.5, 1], [0, 1.05]);
  drawPlotFrame(plot, {
    xTicks: [0.5, 0.6, 0.7, 0.8, 0.9, 1],
    yTicks: [0, 0.25, 0.5, 0.75, 1],
    xFormat: (value) => value.toFixed(1),
    yFormat: (value) => value.toFixed(value === 0 || value === 1 ? 0 : 2),
    xLabel: "Homologous temperature, T / Tm",
    yLabel: "Normalised factor"
  });
  const data = rateCache || buildRateData();

  context.save();
  context.fillStyle = "rgba(23,111,103,0.10)";
  context.beginPath();
  context.moveTo(plot.x(data.points[0].tau), plot.y(0));
  data.points.forEach((point) => context.lineTo(plot.x(point.tau), plot.y(point.total)));
  context.lineTo(plot.x(data.points.at(-1).tau), plot.y(0));
  context.closePath();
  context.fill();
  context.restore();
  strokeSeries(plot, data.points.map((point) => [point.tau, point.thermodynamic]), COLORS.coral, 2.4, [6, 4]);
  strokeSeries(plot, data.points.map((point) => [point.tau, point.mobility]), COLORS.blue, 2.4, [6, 4]);
  strokeSeries(plot, data.points.map((point) => [point.tau, point.total]), COLORS.teal, 3.2);
  drawDot(context, plot.x(data.peak.tau), plot.y(data.peak.total), COLORS.teal, 5);
  drawLabel(context, `peak ${data.peak.tau.toFixed(2)} Tm`, plot.x(data.peak.tau) + 8, plot.y(0.88), { color: COLORS.teal });
  drawLabel(context, "mobility", plot.x(0.90), plot.y(0.63), { color: COLORS.blue, align: "right" });
  drawLabel(context, "barrier probability", plot.x(0.69), plot.y(0.83), { color: COLORS.coral });
  rateCanvas.setAttribute("aria-label", `Normalised nucleation factors. The combined rate peaks at ${data.peak.tau.toFixed(2)} times the melting temperature.`);
}

function updateRate({ announce = true } = {}) {
  if (!rateCanvas) return;
  rateCache = buildRateData();
  setText("#mobility-penalty-value", String(rateCache.mobilityPenalty));
  setText("#barrier-scale-value", rateCache.barrierScale.toFixed(2));
  setHTML("#rate-peak-temperature", `${rateCache.peak.tau.toFixed(2)} T<sub>m</sub>`);
  const note = rateCache.peak.tau > 0.82 ? "A small mobility penalty keeps the optimum close to Tm." : rateCache.peak.tau < 0.62 ? "A large barrier scale pushes the optimum to deeper undercooling." : "Intermediate temperature balances barrier crossing and atomic attachment.";
  setText("#rate-peak-note", note);
  if (announce) setText("#rate-status", `The normalised steady-state rate peaks at ${rateCache.peak.tau.toFixed(2)} Tm. This bell-shaped rate is not a TTT C-curve.`);
  drawRate();
  updateJmak({ announce: false });
}

function jmakState() {
  const tau = number("#jmak-temperature") || 0.72;
  const exponent = number("#jmak-exponent") || 2.5;
  const time = 10 ** number("#jmak-time");
  const data = rateCache || buildRateData();
  const selectedLog = rateLog(tau, data.barrierScale, data.mobilityPenalty);
  const relativePenalty = clamp(data.totalMax - selectedLog, 0, 11.5);
  const t50 = Math.min(1e6, 10 * Math.exp(relativePenalty));
  const fraction = 1 - Math.exp(-Math.LN2 * (time / t50) ** exponent);
  const t90 = t50 * (Math.log(10) / Math.LN2) ** (1 / exponent);
  return { tau, exponent, time, t50, t90, fraction };
}

function drawJmak() {
  if (!jmakCanvas) return;
  const { context, width, height } = fitCanvas(jmakCanvas);
  const compact = width < 520;
  const bounds = { left: compact ? 52 : 62, top: 34, width: width - (compact ? 68 : 84), height: height - 88 };
  const plot = makePlot(context, bounds, [-3, 6], [0, 1.05]);
  drawPlotFrame(plot, {
    xTicks: [-3, -1, 1, 3, 5, 6],
    yTicks: [0, 0.25, 0.5, 0.75, 1],
    xFormat: (value) => `10${value < 0 ? "⁻" : ""}${Math.abs(value)}`,
    yFormat: (value) => `${Math.round(value * 100)}%`,
    xLabel: "Elapsed time, t (s) · logarithmic",
    yLabel: "Fraction transformed, X"
  });
  const state = jmakState();
  const samples = [];
  for (let index = 0; index <= 220; index += 1) {
    const logTime = lerp(-3, 6, index / 220);
    const fraction = 1 - Math.exp(-Math.LN2 * (10 ** logTime / state.t50) ** state.exponent);
    samples.push([logTime, fraction]);
  }
  context.save();
  const gradient = context.createLinearGradient(0, plot.y(1), 0, plot.y(0));
  gradient.addColorStop(0, "rgba(103,87,168,0.20)");
  gradient.addColorStop(1, "rgba(103,87,168,0.02)");
  context.fillStyle = gradient;
  context.beginPath();
  context.moveTo(plot.x(-3), plot.y(0));
  samples.forEach(([xValue, yValue]) => context.lineTo(plot.x(xValue), plot.y(yValue)));
  context.lineTo(plot.x(6), plot.y(0));
  context.closePath();
  context.fill();
  context.restore();
  strokeSeries(plot, samples, COLORS.lavender, 3.2);
  context.save();
  context.strokeStyle = COLORS.coral;
  context.lineWidth = 1.4;
  context.setLineDash([4, 4]);
  context.beginPath();
  context.moveTo(plot.x(log10(state.time)), plot.y(0));
  context.lineTo(plot.x(log10(state.time)), plot.y(state.fraction));
  context.stroke();
  context.restore();
  drawDot(context, plot.x(log10(state.time)), plot.y(state.fraction), COLORS.coral, 5);
  drawLabel(context, `${Math.round(state.fraction * 100)}%`, clamp(plot.x(log10(state.time)) + 8, bounds.left + 4, bounds.left + bounds.width - 50), clamp(plot.y(state.fraction) - 15, bounds.top + 14, bounds.top + bounds.height - 14), { color: COLORS.coral });
  jmakCanvas.setAttribute("aria-label", `JMAK curve at ${state.tau.toFixed(2)} Tm with Avrami exponent ${state.exponent.toFixed(1)}. At ${formatTime(state.time)}, ${Math.round(state.fraction * 100)} percent is transformed.`);
}

function updateJmak({ announce = true } = {}) {
  if (!jmakCanvas) return;
  const state = jmakState();
  setHTML("#jmak-temperature-value", `${state.tau.toFixed(2)} T<sub>m</sub>`);
  setText("#jmak-exponent-value", state.exponent.toFixed(1));
  setText("#jmak-time-value", formatTime(state.time));
  setText("#jmak-fraction", `${Math.round(state.fraction * 100)}%`);
  setText("#jmak-t50", formatTime(state.t50));
  setText("#jmak-t90", formatTime(state.t90));
  let stage;
  let status;
  if (state.fraction < 0.05) {
    stage = "Incubation";
    status = "Very little material has transformed; nuclei and early growth occupy little volume.";
  } else if (state.fraction < 0.4) {
    stage = "Acceleration";
    status = "New transformed volume is appearing rapidly as nuclei grow.";
  } else if (state.fraction < 0.8) {
    stage = "Rapid growth";
    status = "Growth is rapid and transformed regions increasingly impinge.";
  } else if (state.fraction < 0.98) {
    stage = "Impingement";
    status = "Untransformed space is becoming isolated, so the transformation slows.";
  } else {
    stage = "Nearly complete";
    status = "The idealised transformation is approaching completion asymptotically.";
  }
  setText("#jmak-stage", stage);
  if (announce) setText("#jmak-status", status);
  $("#jmak-time").setAttribute("aria-valuetext", `${formatTime(state.time)}; ${Math.round(state.fraction * 100)} percent transformed`);
  drawJmak();
}

if (rateCanvas && jmakCanvas) {
  ["#mobility-penalty", "#barrier-scale"].forEach((selector) => {
    $(selector).addEventListener("input", () => updateRate({ announce: false }));
    $(selector).addEventListener("change", () => updateRate());
  });
  ["#jmak-temperature", "#jmak-exponent", "#jmak-time"].forEach((selector) => {
    $(selector).addEventListener("input", () => updateJmak({ announce: false }));
    $(selector).addEventListener("change", () => updateJmak());
  });
  registerRedraw(rateCanvas, drawRate);
  registerRedraw(jmakCanvas, drawJmak);
  updateRate();
  updateJmak();
}

// ---------------------------------------------------------------------------
// Submodule 4: constitutional supercooling

const stabilityCanvas = $("#stability-chart");
const frontCanvas = $("#front-canvas");
let stabilityCache = null;

function stabilityState() {
  const composition = number("#alloy-composition");
  const rateMicrons = number("#growth-rate");
  const gradientKPerMm = number("#thermal-gradient");
  const partition = number("#partition-coefficient");
  const diffusivity = number("#liquid-diffusivity") * 1e-9;
  const slope = number("#liquidus-slope");
  const rate = rateMicrons * 1e-6;
  const gradient = gradientKPerMm * 1e3;
  const critical = slope * composition * (1 - partition) / (partition * diffusivity);
  const actual = rate > 0 ? gradient / rate : Infinity;
  const index = critical > 0 ? actual / critical : Infinity;
  const stable = !Number.isFinite(critical) || critical === 0 || index >= 1;
  const boundaryLength = rate > 0 ? diffusivity / rate : 200e-6;
  const zMax = 5 * boundaryLength;
  return { composition, rateMicrons, gradientKPerMm, partition, diffusivity, slope, rate, gradient, critical, actual, index, stable, boundaryLength, zMax };
}

function stabilityProfiles(state, count = 181) {
  const points = [];
  const interfaceComposition = state.partition > 0 ? state.composition / state.partition : state.composition;
  for (let index = 0; index < count; index += 1) {
    const z = state.zMax * index / (count - 1);
    const concentration = state.rate > 0
      ? state.composition * (1 + (1 - state.partition) / state.partition * Math.exp(-state.rate * z / state.diffusivity))
      : state.composition;
    const thermal = state.gradient * z;
    const liquidus = state.slope * (interfaceComposition - concentration);
    points.push({ z, concentration, thermal, liquidus, supercooled: thermal < liquidus - 1e-9 });
  }
  return points;
}

function drawStability() {
  if (!stabilityCanvas) return;
  const state = stabilityCache || stabilityState();
  const profiles = stabilityProfiles(state);
  const { context, width, height } = fitCanvas(stabilityCanvas);
  const compact = width < 570;
  const left = compact ? 59 : 74;
  const right = compact ? 20 : 30;
  const topBounds = { left, top: 38, width: width - left - right, height: height * 0.43 };
  const lowerTop = topBounds.top + topBounds.height + 83;
  const lowerBounds = { left, top: lowerTop, width: width - left - right, height: height - lowerTop - 54 };
  const zMicronsMax = state.zMax * 1e6;
  const xTicks = [0, 0.25, 0.5, 0.75, 1].map((fraction) => zMicronsMax * fraction);
  const tempMax = Math.max(2, ...profiles.map((point) => Math.max(point.thermal, point.liquidus))) * 1.08;
  const compositionMax = Math.max(1, ...profiles.map((point) => point.concentration)) * 1.08;
  const top = makePlot(context, topBounds, [0, zMicronsMax], [0, tempMax]);
  const lower = makePlot(context, lowerBounds, [0, zMicronsMax], [0, compositionMax]);
  const xFormat = (value) => value >= 10000 ? `${(value / 1000).toFixed(0)}k` : value >= 1000 ? `${(value / 1000).toFixed(1)}k` : String(Math.round(value));
  drawPlotFrame(top, {
    xTicks,
    yTicks: [0, tempMax / 2, tempMax],
    xFormat,
    yFormat: (value) => value.toFixed(value > 20 ? 0 : 1),
    title: "Temperature rise from the interface",
    yLabel: "ΔT (K)"
  });
  drawPlotFrame(lower, {
    xTicks,
    yTicks: [0, compositionMax / 2, compositionMax],
    xFormat,
    yFormat: (value) => value.toFixed(1),
    title: "Solute boundary layer",
    xLabel: "Distance into liquid, z (μm)",
    yLabel: "CL (wt%)"
  });

  context.save();
  context.beginPath();
  let shadingStarted = false;
  profiles.forEach((point) => {
    if (!point.supercooled) return;
    const x = top.x(point.z * 1e6);
    const y = top.y(point.liquidus);
    if (!shadingStarted) { context.moveTo(x, y); shadingStarted = true; }
    else context.lineTo(x, y);
  });
  [...profiles].reverse().forEach((point) => {
    if (!point.supercooled) return;
    context.lineTo(top.x(point.z * 1e6), top.y(point.thermal));
  });
  if (shadingStarted) {
    context.closePath();
    context.fillStyle = "rgba(240,80,48,0.17)";
    context.fill();
  }
  context.restore();
  strokeSeries(top, profiles.map((point) => [point.z * 1e6, point.thermal]), COLORS.gold, 3);
  strokeSeries(top, profiles.map((point) => [point.z * 1e6, point.liquidus]), COLORS.coral, 3);
  strokeSeries(lower, profiles.map((point) => [point.z * 1e6, point.concentration]), COLORS.blue, 3);
  context.save();
  context.strokeStyle = COLORS.ink;
  context.lineWidth = 2;
  [top, lower].forEach((plot) => {
    context.beginPath();
    context.moveTo(plot.x(0), plot.bounds.top);
    context.lineTo(plot.x(0), plot.bounds.top + plot.bounds.height);
    context.stroke();
  });
  context.restore();
  drawLabel(context, "actual T", top.x(zMicronsMax * 0.7), top.y(profiles[Math.floor(profiles.length * 0.7)].thermal) - 13, { color: COLORS.gold });
  drawLabel(context, "local TL", top.x(zMicronsMax * 0.55), top.y(profiles[Math.floor(profiles.length * 0.55)].liquidus) + 15, { color: COLORS.coral });
  drawLabel(context, "CL", lower.x(zMicronsMax * 0.42), lower.y(profiles[Math.floor(profiles.length * 0.42)].concentration) - 15, { color: COLORS.blue });
  const supercooledPoints = profiles.filter((point) => point.supercooled);
  const widthMicrons = supercooledPoints.length ? supercooledPoints.at(-1).z * 1e6 : 0;
  stabilityCanvas.dataset.supercooledWidthMicrons = widthMicrons.toFixed(2);
  stabilityCanvas.setAttribute("aria-label", state.stable ? "Temperature and solute profiles with no constitutional-supercooling zone in the simple boundary-layer model." : `Temperature and solute profiles with a constitutionally supercooled zone extending about ${widthMicrons.toFixed(1)} micrometres ahead of the interface.`);
}

function drawFrontCue() {
  if (!frontCanvas) return;
  const state = stabilityCache || stabilityState();
  const { context, width, height } = fitCanvas(frontCanvas, "#eaf3fa");
  const baseX = width * 0.33;
  const severity = state.stable ? 0 : clamp(1 / Math.max(state.index, 0.04) - 1, 0, 8);
  const amplitude = state.stable ? 0 : clamp(width * (0.018 + severity * 0.018), 8, width * 0.17);
  const frequency = state.stable ? 1 : severity < 0.8 ? 2.2 : 3.2;
  const liquidGradient = context.createLinearGradient(baseX, 0, width, 0);
  liquidGradient.addColorStop(0, "rgba(240,80,48,0.22)");
  liquidGradient.addColorStop(0.25, "rgba(196,123,25,0.12)");
  liquidGradient.addColorStop(1, "rgba(56,102,148,0.03)");
  context.fillStyle = liquidGradient;
  context.fillRect(baseX, 0, width - baseX, height);

  const interfacePoints = [];
  for (let index = 0; index <= 120; index += 1) {
    const y = height * index / 120;
    const wave = Math.sin(index / 120 * Math.PI * 2 * frequency);
    const sharpened = Math.sign(wave) * Math.abs(wave) ** (severity > 1 ? 0.45 : 1);
    interfacePoints.push({ x: baseX + amplitude * sharpened, y });
  }
  context.beginPath();
  context.moveTo(0, 0);
  context.lineTo(interfacePoints[0].x, 0);
  interfacePoints.forEach((point) => context.lineTo(point.x, point.y));
  context.lineTo(0, height);
  context.closePath();
  const solidGradient = context.createLinearGradient(0, 0, baseX + amplitude, 0);
  solidGradient.addColorStop(0, "#6c928c");
  solidGradient.addColorStop(1, "#acd1c9");
  context.fillStyle = solidGradient;
  context.fill();
  context.strokeStyle = COLORS.tealDark;
  context.lineWidth = 3;
  context.beginPath();
  interfacePoints.forEach((point, index) => index ? context.lineTo(point.x, point.y) : context.moveTo(point.x, point.y));
  context.stroke();

  if (!state.stable && severity > 1.2) {
    context.strokeStyle = "rgba(16,86,79,0.76)";
    context.lineWidth = 2;
    interfacePoints.forEach((point, index) => {
      if (index % 20 !== 10 || point.x < baseX) return;
      for (const direction of [-1, 1]) {
        context.beginPath();
        context.moveTo(point.x - 4, point.y);
        context.lineTo(point.x - 20, point.y + direction * 13);
        context.stroke();
      }
    });
  }
  context.fillStyle = COLORS.white;
  context.font = "900 12px system-ui, sans-serif";
  context.textAlign = "left";
  context.fillText("solid", 14, 22);
  context.fillStyle = COLORS.ink;
  context.textAlign = "right";
  context.fillText("solute-enriched liquid", width - 14, 22);
  const cue = state.stable ? "planar cue" : state.index >= 0.6 ? "cellular cue" : "dendrite-like cue";
  drawLabel(context, cue, width - 14, height - 21, { align: "right", color: state.stable ? COLORS.teal : COLORS.coral });
  frontCanvas.setAttribute("aria-label", `${cue}. This is an illustrative morphology cue, not a Mullins-Sekerka prediction.`);
}

function updateStability({ announce = true } = {}) {
  if (!stabilityCanvas) return;
  stabilityCache = stabilityState();
  const state = stabilityCache;
  setText("#alloy-composition-value", `${state.composition.toFixed(1)} wt%`);
  setHTML("#growth-rate-value", `${Math.round(state.rateMicrons)} &micro;m s<sup>&minus;1</sup>`);
  setHTML("#thermal-gradient-value", `${Math.round(state.gradientKPerMm)} K mm<sup>&minus;1</sup>`);
  setText("#partition-coefficient-value", state.partition.toFixed(2));
  setHTML("#liquid-diffusivity-value", `${(state.diffusivity / 1e-9).toFixed(1)} &times; 10<sup>&minus;9</sup> m<sup>2</sup> s<sup>&minus;1</sup>`);
  setHTML("#liquidus-slope-value", `${state.slope.toFixed(1)} K (wt%)<sup>&minus;1</sup>`);
  setHTML("#actual-gr", Number.isFinite(state.actual) ? scientificHTML(state.actual, 2, "K s m<sup>&minus;2</sup>") : "&infin; &middot; stationary front");
  setHTML("#critical-gr", scientificHTML(state.critical, 2, "K s m<sup>&minus;2</sup>"));
  setText("#stability-index", Number.isFinite(state.index) ? state.index.toFixed(state.index < 10 ? 2 : 1) : "∞");
  const chip = $("#stability-chip");
  let caption;
  let status;
  if (state.stable) {
    setText("#front-label", "No CS predicted");
    setText("#stability-chip", "No supercooled zone");
    chip.classList.remove("warning-chip");
    caption = "A planar cue is consistent with this constitutional-supercooling test.";
    status = state.rate === 0 ? "The stationary interface has no solute boundary layer in this steady-growth model." : "The imposed thermal gradient meets or exceeds the local liquidus gradient at the interface.";
  } else {
    setText("#front-label", "CS likely");
    setText("#stability-chip", "Supercooled zone present");
    chip.classList.add("warning-chip");
    caption = state.index >= 0.6 ? "A cellular cue illustrates the onset of constitutional supercooling; it is not a morphology prediction." : "A dendrite-like cue illustrates strong constitutional supercooling; it is not a morphology prediction.";
    status = "The imposed thermal gradient is too shallow for this velocity and solute boundary layer.";
  }
  setText("#front-caption", caption);
  if (announce) setText("#stability-status", status);
  $("#growth-rate").setAttribute("aria-valuetext", `${state.rateMicrons} micrometres per second; ${state.stable ? "no constitutional supercooling predicted" : "constitutional supercooling likely"}`);
  drawStability();
  drawFrontCue();
}

if (stabilityCanvas && frontCanvas) {
  ["#alloy-composition", "#growth-rate", "#thermal-gradient", "#partition-coefficient", "#liquid-diffusivity", "#liquidus-slope"].forEach((selector) => {
    $(selector).addEventListener("input", () => updateStability({ announce: false }));
    $(selector).addEventListener("change", () => updateStability());
  });
  registerRedraw(stabilityCanvas, drawStability);
  registerRedraw(frontCanvas, drawFrontCue);
  updateStability();
}

// ---------------------------------------------------------------------------
// Submodule 5A: dendrite growth and SDAS measurement

const dendriteCanvas = $("#dendrite-canvas");
const dendriteState = {
  running: false,
  progress: 0.06,
  lastTimestamp: null,
  frame: 0,
  measureMode: false,
  points: []
};

function coolingRate() {
  return 10 ** number("#cooling-rate");
}

function predictedSdas() {
  return 50 * coolingRate() ** -0.33;
}

function dendritePath(context, xOrigin, baseY, tipY, phase, width) {
  const steps = Math.max(2, Math.ceil((baseY - tipY) / 5));
  context.beginPath();
  for (let index = 0; index <= steps; index += 1) {
    const fraction = index / steps;
    const y = lerp(baseY, tipY, fraction);
    const x = xOrigin + Math.sin(fraction * Math.PI * 2.3 + phase) * Math.min(4, width * 0.005) * fraction;
    if (index === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  }
}

function drawDendrite() {
  if (!dendriteCanvas) return;
  const { context, width, height } = fitCanvas(dendriteCanvas, "#0d1a28");
  const fieldWidth = 400;
  const spacingMicrons = predictedSdas();
  const spacingPixels = spacingMicrons / fieldWidth * width;
  const progress = dendriteState.progress;
  const topMargin = 24;
  const baseY = height - 42;
  const tipY = lerp(baseY, topMargin, progress);
  const background = context.createLinearGradient(0, 0, width, height);
  background.addColorStop(0, "#0d1a28");
  background.addColorStop(0.55, "#172d3c");
  background.addColorStop(1, "#0f2432");
  context.fillStyle = background;
  context.fillRect(0, 0, width, height);

  for (let index = 0; index < 360; index += 1) {
    const x = hashNoise(index * 3 + 5) * width;
    const y = hashNoise(index * 3 + 6) * height;
    const radius = 0.4 + hashNoise(index * 3 + 7) * 1.4;
    context.fillStyle = index % 4 ? "rgba(117,165,183,0.11)" : "rgba(238,179,83,0.09)";
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();
  }

  const origins = [0.20, 0.50, 0.80].map((fraction) => fraction * width);
  origins.forEach((xOrigin, treeIndex) => {
    const phase = treeIndex * 1.71;
    context.save();
    context.shadowColor = "rgba(239,151,60,0.42)";
    context.shadowBlur = 17;
    context.strokeStyle = "rgba(219,127,42,0.22)";
    context.lineWidth = 17;
    dendritePath(context, xOrigin, baseY, tipY, phase, width);
    context.stroke();
    context.restore();

    context.strokeStyle = "#6e918d";
    context.lineWidth = Math.max(7, width * 0.008);
    dendritePath(context, xOrigin, baseY, tipY, phase, width);
    context.stroke();
    context.strokeStyle = "#c4ded5";
    context.lineWidth = Math.max(2.5, width * 0.003);
    dendritePath(context, xOrigin, baseY, tipY, phase, width);
    context.stroke();

    const grownLength = baseY - tipY;
    const armCount = Math.floor((height - 90) / Math.max(10, spacingPixels));
    for (let armIndex = 1; armIndex <= armCount; armIndex += 1) {
      const armY = baseY - armIndex * spacingPixels;
      if (armY < tipY + 7) continue;
      const age = clamp((armY - tipY) / Math.max(14, spacingPixels * 1.7), 0, 1);
      const trunkFraction = (baseY - armY) / Math.max(1, grownLength);
      const trunkX = xOrigin + Math.sin(trunkFraction * Math.PI * 2.3 + phase) * Math.min(4, width * 0.005) * trunkFraction;
      const maximumLength = Math.min(width * 0.115, spacingPixels * 2.35, width * 0.125);
      const length = maximumLength * (0.35 + 0.65 * age) * (0.86 + 0.14 * hashNoise(armIndex + treeIndex * 19));
      for (const direction of [-1, 1]) {
        const endX = trunkX + direction * length;
        const endY = armY - length * 0.15 * (0.7 + 0.3 * hashNoise(armIndex * 7 + treeIndex));
        context.save();
        context.strokeStyle = "rgba(224,135,47,0.20)";
        context.lineWidth = 12;
        context.shadowColor = "rgba(238,163,61,0.35)";
        context.shadowBlur = 12;
        context.beginPath();
        context.moveTo(trunkX, armY);
        context.quadraticCurveTo(lerp(trunkX, endX, 0.55), armY - direction * 2, endX, endY);
        context.stroke();
        context.restore();
        context.strokeStyle = "#789c96";
        context.lineWidth = Math.max(4.5, width * 0.005);
        context.beginPath();
        context.moveTo(trunkX, armY);
        context.quadraticCurveTo(lerp(trunkX, endX, 0.55), armY - direction * 2, endX, endY);
        context.stroke();
        context.strokeStyle = "#d1e6df";
        context.lineWidth = Math.max(1.5, width * 0.002);
        context.stroke();

        if (age > 0.7 && spacingPixels > 19) {
          const tertiaryCount = Math.min(3, Math.floor(length / 28));
          for (let tertiary = 1; tertiary <= tertiaryCount; tertiary += 1) {
            const local = tertiary / (tertiaryCount + 1);
            const tx = lerp(trunkX, endX, local);
            const ty = lerp(armY, endY, local);
            const tertiaryLength = Math.min(spacingPixels * 0.42, 18) * age;
            context.strokeStyle = "#9abbb3";
            context.lineWidth = 2;
            context.beginPath();
            context.moveTo(tx, ty);
            context.lineTo(tx, ty - tertiaryLength);
            context.stroke();
          }
        }
      }
    }

    context.save();
    context.fillStyle = "#e0eee8";
    context.shadowColor = "rgba(238,158,57,0.75)";
    context.shadowBlur = 18;
    context.beginPath();
    context.arc(xOrigin + Math.sin(phase + Math.PI * 2.3) * Math.min(4, width * 0.005), tipY, Math.max(4, width * 0.005), 0, Math.PI * 2);
    context.fill();
    context.restore();
  });

  const scaleLength = width * 0.25;
  const scaleY = height - 18;
  context.strokeStyle = COLORS.white;
  context.lineWidth = 4;
  context.beginPath();
  context.moveTo(18, scaleY);
  context.lineTo(18 + scaleLength, scaleY);
  context.stroke();
  context.fillStyle = COLORS.white;
  context.font = "800 11px system-ui, sans-serif";
  context.textAlign = "center";
  context.fillText("100 μm", 18 + scaleLength / 2, scaleY - 7);

  if (dendriteState.points.length) {
    dendriteState.points.forEach((point, index) => {
      context.fillStyle = COLORS.white;
      context.strokeStyle = index === 0 ? COLORS.coralBright : COLORS.gold;
      context.lineWidth = 3;
      context.beginPath();
      context.arc(point.x, point.y, 6, 0, Math.PI * 2);
      context.fill();
      context.stroke();
    });
    if (dendriteState.points.length === 2) {
      const [first, second] = dendriteState.points;
      context.strokeStyle = COLORS.white;
      context.lineWidth = 2;
      context.setLineDash([5, 4]);
      context.beginPath();
      context.moveTo(first.x, first.y);
      context.lineTo(second.x, second.y);
      context.stroke();
      context.setLineDash([]);
      const distance = Math.hypot(second.x - first.x, second.y - first.y) * fieldWidth / width;
      drawLabel(context, `${distance.toFixed(1)} μm`, (first.x + second.x) / 2 + 7, (first.y + second.y) / 2 - 14, { color: COLORS.coral });
    }
  }

  const mode = dendriteState.running ? "running" : dendriteState.progress >= 1 ? "complete" : "paused";
  dendriteCanvas.setAttribute("aria-label", `${mode} synthetic dendrite growth at ${coolingRate().toFixed(2)} kelvin per second, with a model secondary-arm spacing of ${spacingMicrons.toFixed(1)} micrometres.`);
}

function updateDendriteReadout({ announce = true } = {}) {
  if (!dendriteCanvas) return;
  const rate = coolingRate();
  const spacing = predictedSdas();
  setHTML("#cooling-rate-value", `${rate < 1 ? rate.toFixed(2) : rate < 10 ? rate.toFixed(1) : rate.toFixed(0)} K s<sup>&minus;1</sup>`);
  setHTML("#predicted-sdas", `${spacing.toFixed(1)} &micro;m`);
  const coolingClass = rate < 0.2 ? "Very slow" : rate < 2 ? "Slow" : rate < 25 ? "Moderate" : "Rapid";
  setText("#cooling-class", coolingClass);
  $("#cooling-rate").setAttribute("aria-valuetext", `${rate.toFixed(2)} kelvin per second; model SDAS ${spacing.toFixed(1)} micrometres`);
  if (announce) setText("#dendrite-status", `${coolingClass} cooling gives a model SDAS of ${spacing.toFixed(1)} micrometres. Start growth to compare the branch density.`);
  drawDendrite();
}

function setDendriteRunning(running, message = "") {
  if (!dendriteCanvas) return;
  dendriteState.running = running;
  const button = $("#dendrite-toggle");
  button.textContent = running ? "Pause growth" : dendriteState.progress >= 1 ? "Replay growth" : "Resume growth";
  button.classList.toggle("primary-action", !running);
  if (message) setText("#dendrite-status", message);
  if (running && !dendriteState.frame) {
    dendriteState.lastTimestamp = null;
    dendriteState.frame = requestAnimationFrame(advanceDendrites);
  }
}

function advanceDendrites(timestamp) {
  dendriteState.frame = 0;
  if (!dendriteState.running || document.hidden) return;
  if (dendriteState.lastTimestamp === null) dendriteState.lastTimestamp = timestamp;
  const delta = Math.min(50, timestamp - dendriteState.lastTimestamp);
  dendriteState.lastTimestamp = timestamp;
  const rateFactor = 0.85 + 0.15 * (number("#cooling-rate") + 2) / 4;
  dendriteState.progress = clamp(dendriteState.progress + delta / 6500 * rateFactor, 0, 1);
  if (dendriteState.progress >= 1) {
    setDendriteRunning(false, "Growth complete. Select Measure, then choose two neighbouring secondary arms.");
  } else {
    dendriteState.frame = requestAnimationFrame(advanceDendrites);
  }
  drawDendrite();
}

function resetDendrites(message = "Simulation reset. Start growth when ready.") {
  cancelAnimationFrame(dendriteState.frame);
  dendriteState.frame = 0;
  dendriteState.running = false;
  dendriteState.progress = 0.06;
  dendriteState.lastTimestamp = null;
  dendriteState.points = [];
  $("#dendrite-toggle").textContent = "Start growth";
  $("#dendrite-toggle").classList.add("primary-action");
  setText("#measured-sdas", "Choose two points");
  setText("#inferred-cooling", "—");
  if (message) setText("#dendrite-status", message);
  drawDendrite();
}

function toggleMeasurement(force) {
  const next = typeof force === "boolean" ? force : !dendriteState.measureMode;
  dendriteState.measureMode = next;
  const button = $("#measure-toggle");
  button.setAttribute("aria-pressed", String(next));
  button.textContent = next ? "Measuring" : "Measure";
  dendriteCanvas.style.cursor = next ? "crosshair" : "default";
  if (next && dendriteState.running) setDendriteRunning(false, "Growth paused. Choose two neighbouring secondary arms.");
  else setText("#dendrite-status", next ? "Measurement mode active. Choose the first arm." : "Measurement mode off.");
}

if (dendriteCanvas) {
  $("#dendrite-toggle").addEventListener("click", () => {
    if (dendriteState.running) {
      setDendriteRunning(false, "Growth paused. Resume it or measure the current microstructure.");
      drawDendrite();
      return;
    }
    if (dendriteState.progress >= 1) {
      dendriteState.progress = 0.06;
      dendriteState.points = [];
    }
    toggleMeasurement(false);
    setDendriteRunning(true, "Dendrites are growing. Pause whenever you want to inspect the structure.");
  });
  $("#dendrite-reset").addEventListener("click", () => resetDendrites());
  $("#cooling-rate").addEventListener("input", () => {
    resetDendrites("");
    updateDendriteReadout({ announce: false });
  });
  $("#cooling-rate").addEventListener("change", () => updateDendriteReadout());
  $("#measure-toggle").addEventListener("click", () => toggleMeasurement());
  $("#measure-example").addEventListener("click", () => {
    if (dendriteState.running) setDendriteRunning(false);
    dendriteState.progress = Math.max(dendriteState.progress, 0.82);
    toggleMeasurement(true);
    const rect = dendriteCanvas.getBoundingClientRect();
    const targetPixels = predictedSdas() / 400 * rect.width;
    const half = Math.min(targetPixels / 2, rect.height / 2 - 18);
    dendriteState.points = [
      { x: rect.width * 0.56, y: rect.height / 2 - half },
      { x: rect.width * 0.56, y: rect.height / 2 + half }
    ];
    const distance = Math.hypot(
      dendriteState.points[1].x - dendriteState.points[0].x,
      dendriteState.points[1].y - dendriteState.points[0].y
    ) * 400 / rect.width;
    const inferred = (50 / Math.max(distance, 0.1)) ** (1 / 0.33);
    setHTML("#measured-sdas", `${distance.toFixed(1)} &micro;m`);
    setHTML("#inferred-cooling", `${inferred < 1 ? inferred.toFixed(2) : inferred < 10 ? inferred.toFixed(1) : inferred.toFixed(0)} K s<sup>&minus;1</sup>`);
    setText("#dendrite-status", `Example points placed one model arm spacing apart: ${distance.toFixed(1)} micrometres.`);
    drawDendrite();
  });
  $("#measure-clear").addEventListener("click", () => {
    dendriteState.points = [];
    setText("#measured-sdas", "Choose two points");
    setText("#inferred-cooling", "—");
    setText("#dendrite-status", dendriteState.measureMode ? "Points cleared. Choose the first arm." : "Measurement points cleared.");
    drawDendrite();
  });
  dendriteCanvas.addEventListener("pointerdown", (event) => {
    if (!dendriteState.measureMode) return;
    event.preventDefault();
    const rect = dendriteCanvas.getBoundingClientRect();
    const point = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    if (dendriteState.points.length >= 2) dendriteState.points = [];
    dendriteState.points.push(point);
    if (dendriteState.points.length === 1) {
      setText("#dendrite-status", "First arm selected. Choose the neighbouring arm.");
    } else {
      const [first, second] = dendriteState.points;
      const distance = Math.hypot(second.x - first.x, second.y - first.y) * 400 / rect.width;
      const inferred = (50 / Math.max(distance, 0.1)) ** (1 / 0.33);
      setHTML("#measured-sdas", `${distance.toFixed(1)} &micro;m`);
      setHTML("#inferred-cooling", `${inferred < 1 ? inferred.toFixed(2) : inferred < 10 ? inferred.toFixed(1) : inferred.toFixed(0)} K s<sup>&minus;1</sup>`);
      setText("#dendrite-status", `Measured spacing ${distance.toFixed(1)} micrometres; the teaching calibration implies ${inferred.toFixed(2)} kelvin per second.`);
    }
    drawDendrite();
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      cancelAnimationFrame(dendriteState.frame);
      dendriteState.frame = 0;
      dendriteState.lastTimestamp = null;
    } else if (dendriteState.running && !dendriteState.frame) {
      dendriteState.lastTimestamp = null;
      dendriteState.frame = requestAnimationFrame(advanceDendrites);
    }
  });
  registerRedraw(dendriteCanvas, drawDendrite);
  updateDendriteReadout();
}

// ---------------------------------------------------------------------------
// Submodule 5B: schematic TTT and CCT path explorer

const tttCanvas = $("#ttt-chart");
let tttMode = "isothermal";

function transformationLogTime(temperature, family, edge, mode, carbon) {
  const carbonShift = (carbon - 0.6) * 0.75;
  const continuousShift = mode === "continuous" ? 0.72 : 0;
  if (family === "pearlite") {
    if (temperature < 430 || temperature > 705) return null;
    const start = -0.22 + 1.75 * ((temperature - 550) / 145) ** 2 + carbonShift + continuousShift;
    return start + (edge === "finish" ? 0.76 : 0);
  }
  if (temperature < 250 || temperature > 510) return null;
  const start = 0.38 + 1.5 * ((temperature - 390) / 115) ** 2 + carbonShift * 0.55 + continuousShift + 0.18;
  return start + (edge === "finish" ? 0.82 : 0);
}

function martensiteStart(carbon) {
  return clamp(539 - 423 * carbon, 80, 500);
}

function martensiteFractionAt(temperature, ms) {
  return temperature < ms ? 1 - Math.exp(-0.011 * (ms - temperature)) : 0;
}

function thermalPathState() {
  const carbon = number("#steel-carbon");
  const ms = martensiteStart(carbon);
  if (tttMode === "isothermal") {
    const holdTemperature = number("#hold-temperature");
    const holdTime = 10 ** number("#hold-time");
    let pearlite = 0;
    let bainite = 0;
    const family = holdTemperature >= 500 ? "pearlite" : holdTemperature >= 250 ? "bainite" : null;
    if (family) {
      const start = transformationLogTime(holdTemperature, family, "start", "isothermal", carbon);
      const finish = transformationLogTime(holdTemperature, family, "finish", "isothermal", carbon);
      if (start !== null && finish !== null) {
        const progress = clamp((log10(holdTime) - start) / (finish - start), 0, 1);
        if (family === "pearlite") pearlite = progress;
        else bainite = progress;
      }
    }
    const remaining = clamp(1 - pearlite - bainite, 0, 1);
    const martensite = remaining * martensiteFractionAt(25, ms);
    const other = clamp(remaining - martensite, 0, 1);
    return { mode: tttMode, carbon, ms, holdTemperature, holdTime, pearlite, bainite, martensite, other };
  }

  const rate = 10 ** number("#steel-cooling-rate");
  let pearliteProgress = 0;
  let bainiteProgress = 0;
  for (let index = 0; index <= 1200; index += 1) {
    const logTime = lerp(-1, 5, index / 1200);
    const time = 10 ** logTime;
    const temperature = 850 - rate * time;
    if (temperature < 25) break;
    for (const family of ["pearlite", "bainite"]) {
      const start = transformationLogTime(temperature, family, "start", "continuous", carbon);
      const finish = transformationLogTime(temperature, family, "finish", "continuous", carbon);
      if (start === null || finish === null) continue;
      const progress = clamp((logTime - start) / (finish - start), 0, 1);
      if (family === "pearlite") pearliteProgress = Math.max(pearliteProgress, progress);
      else bainiteProgress = Math.max(bainiteProgress, progress);
    }
  }
  const pearlite = pearliteProgress;
  const bainite = (1 - pearlite) * bainiteProgress;
  const remaining = clamp(1 - pearlite - bainite, 0, 1);
  const martensite = remaining * martensiteFractionAt(25, ms);
  const other = clamp(remaining - martensite, 0, 1);
  return { mode: tttMode, carbon, ms, rate, pearlite, bainite, martensite, other };
}

function buildTransformationCurve(family, edge, mode, carbon) {
  const range = family === "pearlite" ? [430, 705] : [250, 510];
  const points = [];
  for (let index = 0; index <= 120; index += 1) {
    const temperature = lerp(range[0], range[1], index / 120);
    const time = transformationLogTime(temperature, family, edge, mode, carbon);
    if (time !== null) points.push([time, temperature]);
  }
  return points;
}

function drawTtt() {
  if (!tttCanvas) return;
  const state = thermalPathState();
  const { context, width, height } = fitCanvas(tttCanvas);
  const compact = width < 570;
  const bounds = { left: compact ? 60 : 74, top: 34, width: width - (compact ? 80 : 102), height: height - 94 };
  const plot = makePlot(context, bounds, [-1, 5], [50, 850]);
  tttCanvas._plot = plot;
  drawPlotFrame(plot, {
    xTicks: [-1, 0, 1, 2, 3, 4, 5],
    yTicks: [100, 200, 300, 400, 500, 600, 700, 800],
    xFormat: (value) => value === -1 ? "0.1" : value === 0 ? "1" : `10${value}`,
    yFormat: (value) => String(value),
    xLabel: "Time (s) · logarithmic",
    yLabel: "Temperature (°C)"
  });

  context.save();
  const austeniteGradient = context.createLinearGradient(0, plot.y(850), 0, plot.y(200));
  austeniteGradient.addColorStop(0, "rgba(240,80,48,0.06)");
  austeniteGradient.addColorStop(1, "rgba(103,87,168,0.03)");
  context.fillStyle = austeniteGradient;
  context.fillRect(bounds.left, bounds.top, bounds.width, bounds.height);
  context.restore();

  const pStart = buildTransformationCurve("pearlite", "start", tttMode, state.carbon);
  const pFinish = buildTransformationCurve("pearlite", "finish", tttMode, state.carbon);
  const bStart = buildTransformationCurve("bainite", "start", tttMode, state.carbon);
  const bFinish = buildTransformationCurve("bainite", "finish", tttMode, state.carbon);
  strokeSeries(plot, pStart, COLORS.coral, 3);
  strokeSeries(plot, pFinish, COLORS.coral, 2.2, [6, 4]);
  strokeSeries(plot, bStart, COLORS.gold, 3);
  strokeSeries(plot, bFinish, COLORS.gold, 2.2, [6, 4]);
  context.save();
  context.strokeStyle = COLORS.blue;
  context.lineWidth = 2.5;
  context.setLineDash([8, 5]);
  context.beginPath();
  context.moveTo(plot.x(-1), plot.y(state.ms));
  context.lineTo(plot.x(5), plot.y(state.ms));
  context.stroke();
  context.restore();
  drawLabel(context, `Ms ${Math.round(state.ms)}°C`, plot.x(4.95), plot.y(state.ms) - 14, { align: "right", color: COLORS.blue });
  drawLabel(context, "pearlite start", plot.x(pStart[Math.floor(pStart.length * 0.46)][0]) + 8, plot.y(pStart[Math.floor(pStart.length * 0.46)][1]) - 16, { color: COLORS.coral });
  drawLabel(context, "bainite start", plot.x(bStart[Math.floor(bStart.length * 0.38)][0]) + 8, plot.y(bStart[Math.floor(bStart.length * 0.38)][1]) + 16, { color: COLORS.gold });
  context.fillStyle = COLORS.inkSoft;
  context.font = "800 12px system-ui, sans-serif";
  context.textAlign = "left";
  context.fillText("austenite", plot.x(-0.82), plot.y(785));
  context.fillText("pearlite", plot.x(2.8), plot.y(605));
  context.fillText("bainite", plot.x(3.0), plot.y(365));
  context.fillText("martensite below Ms", plot.x(2.7), plot.y(Math.max(70, state.ms - 35)));

  const path = [];
  if (tttMode === "isothermal") {
    const arrivalTime = 0.1;
    const finishTime = arrivalTime + state.holdTime;
    path.push([-1, 850], [-1, state.holdTemperature], [log10(finishTime), state.holdTemperature], [Math.min(5, log10(finishTime) + 0.08), 50]);
  } else {
    for (let index = 0; index <= 260; index += 1) {
      const logTime = lerp(-1, 5, index / 260);
      const temperature = 850 - state.rate * 10 ** logTime;
      if (temperature < 50) {
        path.push([logTime, 50]);
        break;
      }
      path.push([logTime, temperature]);
    }
  }
  strokeSeries(plot, path, COLORS.teal, 3.6);
  if (path.length) drawDot(context, plot.x(path.at(-1)[0]), plot.y(clamp(path.at(-1)[1], 50, 850)), COLORS.teal, 5);
  tttCanvas.setAttribute("aria-label", `${tttMode === "isothermal" ? "TTT isothermal" : "CCT continuous-cooling"} schematic for ${state.carbon.toFixed(2)} weight percent carbon steel. Illustrative fractions are ${Math.round(state.pearlite * 100)} percent pearlite, ${Math.round(state.bainite * 100)} percent bainite, and ${Math.round(state.martensite * 100)} percent martensite.`);
}

function fractionPercentages(state) {
  const names = ["pearlite", "bainite", "martensite", "other"];
  const raw = names.map((name) => clamp(state[name], 0, 1) * 100);
  const rounded = raw.map((value) => Math.floor(value));
  let remaining = 100 - rounded.reduce((sum, value) => sum + value, 0);
  raw.map((value, index) => ({ index, remainder: value - rounded[index] }))
    .sort((a, b) => b.remainder - a.remainder)
    .forEach(({ index }) => {
      if (remaining > 0) {
        rounded[index] += 1;
        remaining -= 1;
      }
    });
  return Object.fromEntries(names.map((name, index) => [name, rounded[index]]));
}

function dominantProduct(state) {
  const entries = [
    ["Pearlite", state.pearlite],
    ["Bainite", state.bainite],
    ["Martensite", state.martensite],
    ["Retained austenite / other", state.other]
  ].sort((a, b) => b[1] - a[1]);
  if (entries[0][1] < 0.65 && entries[1][1] > 0.15) return `${entries[0][0]} + ${entries[1][0].toLowerCase()}`;
  if (entries[0][0] === "Pearlite" && state.mode === "isothermal" && state.holdTemperature < 585) return "Fine pearlite";
  return entries[0][0];
}

function updateTtt({ announce = true } = {}) {
  if (!tttCanvas) return;
  const state = thermalPathState();
  const percents = fractionPercentages(state);
  setText("#steel-carbon-value", `${state.carbon.toFixed(2)} wt% C`);
  setText("#ms-temperature", `${Math.round(state.ms)} °C`);
  if (state.mode === "isothermal") {
    setText("#hold-temperature-value", `${Math.round(state.holdTemperature)} °C`);
    setText("#hold-time-value", formatTime(state.holdTime));
  } else {
    setHTML("#steel-cooling-rate-value", `${state.rate < 1 ? state.rate.toFixed(2) : state.rate < 10 ? state.rate.toFixed(1) : state.rate.toFixed(0)} K s<sup>&minus;1</sup>`);
  }
  const product = dominantProduct(state);
  setText("#steel-product", product);
  const hardnessScore = state.pearlite * 1 + state.bainite * 2 + state.martensite * 3 + state.other * 1.3;
  const hardness = hardnessScore < 1.25 ? "Low to moderate" : hardnessScore < 1.9 ? "Moderate" : hardnessScore < 2.55 ? "High" : "Very high";
  setText("#steel-hardness", hardness);
  const copy = product.includes("Pearlite") ? "The path spends sufficient time in the pearlite window before the final quench." : product.includes("Bainite") ? "The path enters the lower-temperature diffusional window before reaching Ms." : product.includes("Martensite") ? "The path largely misses the diffusional curves, so austenite survives to Ms." : "Much of the austenite remains outside the displayed diffusional transformation windows.";
  setText("#steel-product-copy", copy);
  for (const phase of ["pearlite", "bainite", "martensite", "other"]) {
    setText(`#${phase}-fraction`, `${percents[phase]}%`);
    $(`#${phase}-fraction-bar`).style.width = `${percents[phase]}%`;
  }
  let status;
  if (state.mode === "isothermal") status = `At ${Math.round(state.holdTemperature)} degrees Celsius for ${formatTime(state.holdTime)}, then quenching to room temperature, the schematic gives ${product.toLowerCase()} as the dominant product.`;
  else status = `At ${state.rate.toFixed(1)} kelvin per second on the schematic CCT map, ${product.toLowerCase()} is the dominant product.`;
  if (announce) setText("#ttt-status", status);
  drawTtt();
}

function setTttMode(mode) {
  tttMode = mode === "continuous" ? "continuous" : "isothermal";
  $$('[data-ttt-mode]').forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.tttMode === tttMode)));
  $("#isothermal-controls").hidden = tttMode !== "isothermal";
  $("#continuous-controls").hidden = tttMode !== "continuous";
  setText("#transformation-map-title", tttMode === "isothermal" ? "Schematic TTT map" : "Schematic CCT map");
  setText("#ttt-mode-chip", tttMode === "isothermal" ? "Isothermal TTT path" : "Continuous CCT path");
  updateTtt();
}

if (tttCanvas) {
  $$('[data-ttt-mode]').forEach((button) => button.addEventListener("click", () => setTttMode(button.dataset.tttMode)));
  $("#ttt-reset").addEventListener("click", () => {
    $("#steel-carbon").value = "0.6";
    $("#hold-temperature").value = "550";
    $("#hold-time").value = "1";
    $("#steel-cooling-rate").value = "1.48";
    setTttMode("isothermal");
    setText("#ttt-status", "Path reset to a 550 degree Celsius isothermal hold for 10 seconds, followed by a room-temperature quench.");
  });
  ["#steel-carbon", "#hold-temperature", "#hold-time", "#steel-cooling-rate"].forEach((selector) => {
    $(selector).addEventListener("input", () => updateTtt({ announce: false }));
    $(selector).addEventListener("change", () => updateTtt());
  });
  let pathGesture = false;
  const setPathFromPointer = (event, announce = false) => {
    const plot = tttCanvas._plot;
    if (!plot) return;
    const rect = tttCanvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    if (x < plot.bounds.left || x > plot.bounds.left + plot.bounds.width || y < plot.bounds.top || y > plot.bounds.top + plot.bounds.height) return;
    const logTime = clamp(plot.valueX(x), -1, 5);
    const temperature = clamp(plot.valueY(y), 50, 850);
    if (tttMode === "isothermal") {
      $("#hold-temperature").value = String(Math.round(clamp(temperature, 250, 700) / 5) * 5);
      $("#hold-time").value = String(clamp(logTime, -1, 5));
    } else {
      const time = 10 ** logTime;
      const rate = clamp((850 - temperature) / Math.max(time, 0.1), 0.1, 10 ** 2.7);
      $("#steel-cooling-rate").value = String(log10(rate));
    }
    updateTtt({ announce });
  };
  tttCanvas.addEventListener("pointerdown", (event) => {
    if (!event.isPrimary || (event.pointerType === "mouse" && event.button !== 0)) return;
    pathGesture = true;
    tttCanvas.setPointerCapture?.(event.pointerId);
    setPathFromPointer(event, false);
  });
  tttCanvas.addEventListener("pointermove", (event) => {
    if (!pathGesture) return;
    event.preventDefault();
    setPathFromPointer(event, false);
  });
  const finishPathGesture = (event) => {
    if (!pathGesture) return;
    pathGesture = false;
    setPathFromPointer(event, true);
    if (tttCanvas.hasPointerCapture?.(event.pointerId)) tttCanvas.releasePointerCapture(event.pointerId);
  };
  tttCanvas.addEventListener("pointerup", finishPathGesture);
  tttCanvas.addEventListener("pointercancel", () => { pathGesture = false; });
  registerRedraw(tttCanvas, drawTtt);
  setTttMode("isothermal");
}

// Small pure-model surface used by repository smoke checks and future lessons.
globalThis.MSEPhaseTransformationModels = Object.freeze({
  shapeFactor,
  rateLog,
  martensiteStart,
  martensiteFractionAt,
  transformationLogTime,
  fractionPercentages,
  cntEnergy(relativeRadius) {
    return {
      surface: 3 * relativeRadius ** 2,
      volume: -2 * relativeRadius ** 3,
      total: 3 * relativeRadius ** 2 - 2 * relativeRadius ** 3
    };
  },
  jmakFraction(time, t50, exponent) {
    return 1 - Math.exp(-Math.LN2 * (time / t50) ** exponent);
  },
  constitutionalStabilityIndex({ gradient, diffusivity, partition, slope, velocity, composition }) {
    const denominator = slope * velocity * composition * (1 - partition);
    return denominator > 0 ? gradient * diffusivity * partition / denominator : Infinity;
  },
  secondaryArmSpacing(coolingRateValue, referenceSpacing = 50, exponent = 0.33) {
    return referenceSpacing * coolingRateValue ** -exponent;
  }
});
