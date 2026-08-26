const elements = {
  realCanvas: document.getElementById("real-canvas"),
  reciprocalCanvas: document.getElementById("reciprocal-canvas"),
  reflection: document.getElementById("reflection-select"),
  lattice: document.getElementById("lattice-parameter"),
  wavelength: document.getElementById("wavelength"),
  orientation: document.getElementById("orientation"),
  latticeOutput: document.getElementById("lattice-output"),
  wavelengthOutput: document.getElementById("wavelength-output"),
  orientationOutput: document.getElementById("orientation-output"),
  spacingChip: document.getElementById("spacing-chip"),
  angleChip: document.getElementById("angle-chip"),
  gResult: document.getElementById("g-result"),
  kResult: document.getElementById("k-result"),
  errorResult: document.getElementById("error-result"),
  status: document.getElementById("reflection-status"),
  resultStrip: document.querySelector(".result-strip"),
  setBragg: document.getElementById("set-bragg"),
  reset: document.getElementById("reset-module")
};

const realContext = elements.realCanvas.getContext("2d");
const reciprocalContext = elements.reciprocalCanvas.getContext("2d");
const palette = {
  backgroundTop: "#173b62",
  backgroundBottom: "#091b31",
  grid: "rgba(190,213,237,0.22)",
  lattice: "#75c9f5",
  plane: "#ff8068",
  text: "#eef6ff",
  muted: "#bdd0e3",
  ewald: "#bcaef5",
  incident: "#63b8ea",
  diffracted: "#ff755e",
  transfer: "#ffd34e",
  point: "#d7e7f5",
  selected: "#ffd34e",
  success: "#65d6a3"
};

let state = { h: 1, k: 1, a: 3.6, wavelength: 1.54, angle: 0 };
let dragging = false;
let previousX = 0;

function radians(degrees) { return degrees * Math.PI / 180; }
function degrees(angle) { return angle * 180 / Math.PI; }
function rotate([x, y], angle) {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return [x * c - y * s, x * s + y * c];
}
function distance(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }

function resizeCanvas(canvas, context) {
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  return { width, height };
}

function paintBackground(context, width, height) {
  const gradient = context.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, palette.backgroundTop);
  gradient.addColorStop(1, palette.backgroundBottom);
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);
}

function drawArrow(context, from, to, colour, label, labelOffset = { x: 0, y: 0 }) {
  const angle = Math.atan2(to.y - from.y, to.x - from.x);
  context.strokeStyle = colour;
  context.fillStyle = colour;
  context.lineWidth = 3;
  context.beginPath();
  context.moveTo(from.x, from.y);
  context.lineTo(to.x, to.y);
  context.stroke();
  context.beginPath();
  context.moveTo(to.x, to.y);
  context.lineTo(to.x - 12 * Math.cos(angle - 0.45), to.y - 12 * Math.sin(angle - 0.45));
  context.lineTo(to.x - 12 * Math.cos(angle + 0.45), to.y - 12 * Math.sin(angle + 0.45));
  context.closePath();
  context.fill();
  context.font = "700 15px system-ui";
  context.fillText(label, (from.x + to.x) / 2 + labelOffset.x, (from.y + to.y) / 2 + labelOffset.y);
}

function drawRealLattice() {
  const { width, height } = resizeCanvas(elements.realCanvas, realContext);
  paintBackground(realContext, width, height);
  const centre = { x: width / 2, y: height / 2 };
  const step = Math.min(width, height) / 6.6;
  const angle = radians(state.angle);

  realContext.strokeStyle = palette.grid;
  realContext.lineWidth = 1;
  for (let i = -7; i <= 7; i += 1) {
    const a = rotate([i * step, -8 * step], angle);
    const b = rotate([i * step, 8 * step], angle);
    realContext.beginPath();
    realContext.moveTo(centre.x + a[0], centre.y - a[1]);
    realContext.lineTo(centre.x + b[0], centre.y - b[1]);
    realContext.stroke();
    const c = rotate([-8 * step, i * step], angle);
    const d = rotate([8 * step, i * step], angle);
    realContext.beginPath();
    realContext.moveTo(centre.x + c[0], centre.y - c[1]);
    realContext.lineTo(centre.x + d[0], centre.y - d[1]);
    realContext.stroke();
  }

  const normalBase = [state.h, state.k];
  const normalLength = Math.hypot(...normalBase);
  const normal = rotate([normalBase[0] / normalLength, normalBase[1] / normalLength], angle);
  const tangent = [-normal[1], normal[0]];
  const spacing = step / normalLength;
  realContext.strokeStyle = palette.plane;
  realContext.lineWidth = 2.4;
  for (let n = -8; n <= 8; n += 1) {
    const offset = n * spacing;
    const p1 = [normal[0] * offset - tangent[0] * 12 * step, normal[1] * offset - tangent[1] * 12 * step];
    const p2 = [normal[0] * offset + tangent[0] * 12 * step, normal[1] * offset + tangent[1] * 12 * step];
    realContext.beginPath();
    realContext.moveTo(centre.x + p1[0], centre.y - p1[1]);
    realContext.lineTo(centre.x + p2[0], centre.y - p2[1]);
    realContext.stroke();
  }

  for (let i = -7; i <= 7; i += 1) {
    for (let j = -7; j <= 7; j += 1) {
      const point = rotate([i * step, j * step], angle);
      const x = centre.x + point[0];
      const y = centre.y - point[1];
      if (x < -8 || x > width + 8 || y < -8 || y > height + 8) continue;
      const gradient = realContext.createRadialGradient(x - 2.5, y - 3, 1, x, y, 7);
      gradient.addColorStop(0, "#ffffff");
      gradient.addColorStop(0.28, palette.lattice);
      gradient.addColorStop(1, "#1e759f");
      realContext.fillStyle = gradient;
      realContext.beginPath();
      realContext.arc(x, y, 6.5, 0, Math.PI * 2);
      realContext.fill();
    }
  }

  const arrowEnd = { x: centre.x + normal[0] * 82, y: centre.y - normal[1] * 82 };
  drawArrow(realContext, centre, arrowEnd, palette.transfer, `G${state.h}${state.k}`, { x: 7, y: -8 });
  realContext.fillStyle = palette.text;
  realContext.font = "700 14px system-ui";
  realContext.fillText(`(${state.h}${state.k}) planes`, 18, 28);
}

function reciprocalGeometry() {
  const K = 1 / state.wavelength;
  const g = Math.hypot(state.h, state.k) / state.a;
  const baseAngle = Math.atan2(state.k, state.h);
  const qAngle = baseAngle + radians(state.angle);
  const q = { x: g * Math.cos(qAngle), y: g * Math.sin(qAngle) };
  const centre = { x: -K, y: 0 };
  const radialDistance = Math.hypot(q.x - centre.x, q.y - centre.y);
  return { K, g, q, centre, excitation: radialDistance - K };
}

function drawReciprocalLattice() {
  const { width, height } = resizeCanvas(elements.reciprocalCanvas, reciprocalContext);
  paintBackground(reciprocalContext, width, height);
  const geometry = reciprocalGeometry();
  const radiusPx = Math.min(width * 0.31, height * 0.38);
  const scale = radiusPx / geometry.K;
  const origin = { x: width * 0.69, y: height * 0.52 };
  const toScreen = point => ({ x: origin.x + point.x * scale, y: origin.y - point.y * scale });
  const sphereCentre = toScreen(geometry.centre);
  const selected = toScreen(geometry.q);

  reciprocalContext.strokeStyle = palette.ewald;
  reciprocalContext.lineWidth = 2.2;
  reciprocalContext.beginPath();
  reciprocalContext.arc(sphereCentre.x, sphereCentre.y, radiusPx, 0, Math.PI * 2);
  reciprocalContext.stroke();
  reciprocalContext.fillStyle = palette.ewald;
  reciprocalContext.font = "700 14px system-ui";
  reciprocalContext.fillText("Ewald circle, radius 1/λ", Math.max(12, sphereCentre.x - radiusPx + 14), Math.max(24, sphereCentre.y - radiusPx + 22));

  const angle = radians(state.angle);
  for (let h = -4; h <= 4; h += 1) {
    for (let k = -4; k <= 4; k += 1) {
      const vector = rotate([h / state.a, k / state.a], angle);
      const point = toScreen({ x: vector[0], y: vector[1] });
      if (point.x < 5 || point.x > width - 5 || point.y < 5 || point.y > height - 5) continue;
      const isSelected = h === state.h && k === state.k;
      reciprocalContext.fillStyle = isSelected ? palette.selected : palette.point;
      reciprocalContext.beginPath();
      reciprocalContext.arc(point.x, point.y, isSelected ? 7 : 3.5, 0, Math.PI * 2);
      reciprocalContext.fill();
      if (isSelected) {
        reciprocalContext.fillStyle = palette.text;
        reciprocalContext.font = "700 13px system-ui";
        reciprocalContext.fillText(`${h}${k}`, point.x + 9, point.y - 8);
      }
    }
  }

  reciprocalContext.fillStyle = palette.text;
  reciprocalContext.beginPath();
  reciprocalContext.arc(origin.x, origin.y, 5, 0, Math.PI * 2);
  reciprocalContext.fill();
  reciprocalContext.font = "700 13px system-ui";
  reciprocalContext.fillText("O", origin.x + 8, origin.y + 18);
  reciprocalContext.fillText("C", sphereCentre.x - 16, sphereCentre.y + 19);

  drawArrow(reciprocalContext, sphereCentre, origin, palette.incident, "kᵢ", { x: 0, y: -10 });
  drawArrow(reciprocalContext, sphereCentre, selected, palette.diffracted, "k_f", { x: 7, y: -7 });
  drawArrow(reciprocalContext, origin, selected, palette.transfer, "q = G", { x: 7, y: -7 });

  const pointRadius = distance(selected, sphereCentre);
  const onCircle = Math.abs(pointRadius - radiusPx) < Math.max(3, scale * 0.012);
  reciprocalContext.strokeStyle = onCircle ? palette.success : palette.plane;
  reciprocalContext.lineWidth = 2;
  reciprocalContext.beginPath();
  reciprocalContext.arc(selected.x, selected.y, 11, 0, Math.PI * 2);
  reciprocalContext.stroke();
}

function updateReadout() {
  const geometry = reciprocalGeometry();
  const d = state.a / Math.hypot(state.h, state.k);
  const braggArgument = state.wavelength / (2 * d);
  const accessible = braggArgument <= 1;
  const twoTheta = accessible ? 2 * degrees(Math.asin(braggArgument)) : NaN;
  const tolerance = 0.012;
  const diffracting = Math.abs(geometry.excitation) <= tolerance;

  elements.latticeOutput.value = `a = ${state.a.toFixed(2)} Å`;
  elements.latticeOutput.textContent = `a = ${state.a.toFixed(2)} Å`;
  elements.wavelengthOutput.value = `λ = ${state.wavelength.toFixed(2)} Å`;
  elements.wavelengthOutput.textContent = `λ = ${state.wavelength.toFixed(2)} Å`;
  elements.orientationOutput.value = `φ = ${state.angle.toFixed(1)}°`;
  elements.orientationOutput.textContent = `φ = ${state.angle.toFixed(1)}°`;
  elements.spacingChip.innerHTML = `d<sub>${state.h}${state.k}</sub> = ${d.toFixed(3)} Å`;
  elements.angleChip.textContent = accessible ? `2θ = ${twoTheta.toFixed(1)}°` : "No elastic solution";
  elements.gResult.innerHTML = `|G<sub>${state.h}${state.k}</sub>| = ${geometry.g.toFixed(3)} Å<sup>−1</sup>`;
  elements.kResult.innerHTML = `|k<sub>i</sub>| = |k<sub>f</sub>| = ${geometry.K.toFixed(3)} Å<sup>−1</sup>`;
  elements.errorResult.innerHTML = `${Math.abs(geometry.excitation).toFixed(3)} Å<sup>−1</sup>`;
  elements.resultStrip.classList.toggle("is-diffracting", diffracting);
  elements.resultStrip.classList.toggle("is-forbidden", !accessible);
  if (!accessible) {
    elements.status.innerHTML = `G<sub>${state.h}${state.k}</sub> is longer than the Ewald-circle diameter. This wavelength cannot access the reflection.`;
  } else if (diffracting) {
    elements.status.innerHTML = `Diffraction condition met: G<sub>${state.h}${state.k}</sub> lies on the Ewald circle, so q = G<sub>${state.h}${state.k}</sub>.`;
  } else {
    elements.status.innerHTML = `Rotate the crystal or set the Bragg condition to bring G<sub>${state.h}${state.k}</sub> onto the Ewald circle.`;
  }
}

function draw() {
  drawRealLattice();
  drawReciprocalLattice();
  updateReadout();
}

function readControls() {
  [state.h, state.k] = elements.reflection.value.split(",").map(Number);
  state.a = Number(elements.lattice.value);
  state.wavelength = Number(elements.wavelength.value);
  state.angle = Number(elements.orientation.value);
  draw();
}

function setBraggCondition() {
  const geometry = reciprocalGeometry();
  if (geometry.g > 2 * geometry.K) {
    updateReadout();
    return;
  }
  const baseAngle = Math.atan2(state.k, state.h);
  const qAngle = Math.acos(-geometry.g / (2 * geometry.K));
  let orientation = degrees(qAngle - baseAngle);
  while (orientation > 180) orientation -= 360;
  while (orientation < -180) orientation += 360;
  state.angle = orientation;
  elements.orientation.value = orientation.toFixed(1);
  draw();
}

[elements.reflection, elements.lattice, elements.wavelength, elements.orientation].forEach(control => control.addEventListener("input", readControls));
elements.setBragg.addEventListener("click", setBraggCondition);
elements.reset.addEventListener("click", () => {
  elements.reflection.value = "1,1";
  elements.lattice.value = "3.60";
  elements.wavelength.value = "1.54";
  elements.orientation.value = "0";
  readControls();
});

elements.realCanvas.addEventListener("pointerdown", event => { dragging = true; previousX = event.clientX; elements.realCanvas.setPointerCapture(event.pointerId); });
elements.reciprocalCanvas.addEventListener("pointerdown", event => { dragging = true; previousX = event.clientX; elements.reciprocalCanvas.setPointerCapture(event.pointerId); });
[elements.realCanvas, elements.reciprocalCanvas].forEach(canvas => {
  canvas.addEventListener("pointermove", event => {
    if (!dragging) return;
    state.angle = Math.max(-180, Math.min(180, state.angle + (event.clientX - previousX) * 0.35));
    previousX = event.clientX;
    elements.orientation.value = state.angle.toFixed(1);
    draw();
  });
  const endDrag = event => { dragging = false; if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId); };
  canvas.addEventListener("pointerup", endDrag);
  canvas.addEventListener("pointercancel", endDrag);
});

new ResizeObserver(draw).observe(elements.realCanvas.parentElement);
new ResizeObserver(draw).observe(elements.reciprocalCanvas.parentElement);
readControls();
