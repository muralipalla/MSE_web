(function () {
  "use strict";

  const panel = document.querySelector("#mechanism-map");
  const { canvasSurface, refreshOnResize } = window.MSEServiceLife;
  const map = panel.querySelector("[data-mechanism-map]");
  const grains = panel.querySelector("[data-mechanism-grains]");
  const renderGrains = window.createCreepGrainView(grains);
  const temperature = panel.querySelector("#mechanism-temperature");
  const stress = panel.querySelector("#mechanism-stress");
  const grainSize = panel.querySelector("#mechanism-grain-size");
  const temperatureReadout = panel.querySelector('output[for="mechanism-temperature"]');
  const stressReadout = panel.querySelector('output[for="mechanism-stress"]');
  const grainReadout = panel.querySelector('output[for="mechanism-grain-size"]');
  const availability = panel.querySelector("[data-map-availability]");
  const buttons = [...panel.querySelectorAll("[data-mechanism-example]")];
  const title = panel.querySelector("[data-mechanism-name]");
  const description = panel.querySelector("[data-mechanism-description]");
  const crossover = panel.querySelector("[data-mechanism-crossover]");
  const motion = panel.querySelector("[data-mechanism-motion]");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  const fields = [
    {
      id: "coble", name: "Coble creep", label: ["Coble"], labelAt: [.55, -4.77], point: [.55, -5.15],
      fill: "#e6ddf6", ink: "#513582", a: 0, n: 1, q: 4.5, p: 3,
      description: "Atoms diffuse along grain boundaries from the sides to the ends of the grains. The grains elongate along the tensile axis. Follow the orange markers around the grain edge."
    },
    {
      id: "nabarro", name: "Nabarro–Herring creep", label: ["Nabarro–", "Herring"], labelAt: [.79, -4.69], point: [.81, -5.25],
      fill: "#d4ebf6", ink: "#1d5874", a: 0, n: 1, q: 8, p: 2,
      description: "Atoms diffuse through the crystal lattice from the sides to the ends of the grains. Follow the orange markers through the grain interior as the grain elongates under tension."
    },
    {
      id: "sliding", name: "Grain-boundary sliding (GBS)", label: ["Grain-boundary", "sliding"], labelAt: [.555, -3.76], point: [.60, -3.31],
      fill: "#f8e4c7", ink: "#7b490f", a: 4.2, n: 2, q: 4.5, p: 2,
      description: "Adjacent fine grains move past one another along their shared boundary. The bright surface line develops a step where it crosses the boundary. Diffusion or dislocation motion at grain junctions helps the grains stay in contact."
    },
    {
      id: "dislocation", name: "Dislocation creep", label: ["Dislocation", "creep"], labelAt: [.758, -2.88], point: [.82, -3.16],
      fill: "#f3d7e1", ink: "#7d324d", a: 14.2, n: 5, q: 8, p: 0,
      description: "An edge dislocation glides until it meets an obstacle. Vacancy transport lets it climb out of its slip plane and glide again. Repeated glide and climb produce creep strain within grains."
    }
  ];

  const tMin = Number(temperature.min);
  const tMax = Number(temperature.max);
  const sMin = Number(stress.min);
  const sMax = Number(stress.max);
  const referenceDiameter = 5;
  const sizeFormat = new Intl.NumberFormat("en", { maximumSignificantDigits: 2 });
  const thermal = t => 1 / t - 1 / .68;
  const temperatureAt = u => 1 / (u + 1 / .68);
  const rateLog = (field, u, s, logSize) => field.a + field.n * s - field.q * u - field.p * logSize;
  const leads = (field, u, s, logSize) => fields.every(other => rateLog(field, u, s, logSize) >= rateLog(other, u, s, logSize));
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  let currentLogSize;
  let regions;
  let active;
  let bounds;
  let visible = typeof IntersectionObserver !== "function";
  let playing = !reducedMotion.matches;
  let elapsed = playing ? 0 : 3150;
  let previous;
  let frame;

  function clipField(polygon, field, other, logSize) {
    const difference = ([u, s]) => rateLog(field, u, s, logSize) - rateLog(other, u, s, logSize);
    const clipped = [];
    let last = polygon[polygon.length - 1];
    let lastScore = difference(last);
    for (const point of polygon) {
      const score = difference(point);
      if ((score >= 0) !== (lastScore >= 0)) {
        const fraction = lastScore / (lastScore - score);
        clipped.push(last.map((value, i) => value + fraction * (point[i] - value)));
      }
      if (score >= 0) clipped.push(point);
      last = point;
      lastScore = score;
    }
    return clipped;
  }

  // Rate comparisons are linear in inverse homologous temperature and log stress.
  function calculateRegions(logSize) {
    return fields.map(field => {
      let polygon = [[thermal(tMax), sMin], [thermal(tMin), sMin], [thermal(tMin), sMax], [thermal(tMax), sMax]];
      for (const other of fields) {
        if (other !== field && polygon.length) polygon = clipField(polygon, field, other, logSize);
      }
      return { field, polygon };
    });
  }

  const referenceRegions = calculateRegions(0);
  // Trace each shared reference edge once, excluding the outside of the plot.
  const referenceEdges = referenceRegions.flatMap(({ field, polygon }, index) =>
    polygon.map((point, vertex) => [point, polygon[(vertex + 1) % polygon.length]])
      .filter(edge => fields.slice(index + 1).some(other => edge.every(([u, s]) =>
        Math.abs(rateLog(field, u, s, 0) - rateLog(other, u, s, 0)) < 1e-9))));

  function examplePoint(field, polygon, logSize) {
    const available = ([t, s]) => leads(field, thermal(t), s, logSize);
    if (available(field.point)) return field.point;
    if (polygon.length < 3) return null;
    const mean = index => polygon.reduce((sum, point) => sum + point[index], 0) / polygon.length;
    const point = [temperatureAt(mean(0)).toFixed(2), mean(1).toFixed(2)].map(Number);
    return available(point) ? point : null;
  }

  function setGrainSize(logSize) {
    currentLogSize = logSize;
    regions = logSize === 0 ? referenceRegions : calculateRegions(logSize);
    for (const { field, polygon } of regions) {
      field.example = examplePoint(field, polygon, logSize);
      field.button.disabled = !field.example;
    }
    availability.hidden = fields.every(field => field.example);
  }

  for (const field of fields) {
    const button = field.button = buttons.find(button => button.dataset.mechanismExample === field.id);
    button.style.setProperty("--field-fill", field.fill);
    button.style.setProperty("--field-ink", field.ink);
    button.addEventListener("click", () => {
      if (!field.example) return;
      [temperature.value, stress.value] = field.example;
      update();
    });
  }

  const superscript = value => String(value).replace(/[-\d]/g, char => char === "-" ? "⁻" : "⁰¹²³⁴⁵⁶⁷⁸⁹"[Number(char)]);

  function drawMap(t, s) {
    const surface = canvasSurface(map);
    if (!surface) return;
    const { context: c, width, height } = surface;
    c.clearRect(0, 0, width, height);
    const left = 55, right = width - 15, top = 12, bottom = height - 46;
    bounds = { left, right, top, bottom };
    const x = value => left + (value - tMin) / (tMax - tMin) * (right - left);
    const y = value => bottom - (value - sMin) / (sMax - sMin) * (bottom - top);
    const project = ([u, s]) => [x(temperatureAt(u)), y(s)];

    function traceEdge([u, s], [nextU, nextS]) {
      for (let segment = 1; segment <= 24; segment++) {
        const fraction = segment / 24;
        c.lineTo(...project([u + fraction * (nextU - u), s + fraction * (nextS - s)]));
      }
    }

    for (const { field, polygon } of regions) {
      if (!polygon.length) continue;
      c.beginPath();
      c.moveTo(...project(polygon[0]));
      polygon.forEach((point, index) => traceEdge(point, polygon[(index + 1) % polygon.length]));
      c.closePath();
      c.fillStyle = field.fill;
      c.fill();
      c.strokeStyle = "#8d7e9a";
      c.lineWidth = 1;
      c.stroke();
    }

    c.font = "600 11px system-ui";
    c.textBaseline = "middle";
    c.fillStyle = "#3d3456";
    c.strokeStyle = "#57476a30";
    c.textAlign = "right";
    c.beginPath();
    for (const tick of [-6, -5, -4, -3]) {
      c.fillText("10" + superscript(tick), left - 7, y(tick));
      c.moveTo(left, y(tick));
      c.lineTo(right, y(tick));
    }
    c.textAlign = "center";
    for (const tick of [.45, .55, .65, .75, .85, .90]) {
      c.fillText(tick.toFixed(2), x(tick), bottom + 12);
      c.moveTo(x(tick), top);
      c.lineTo(x(tick), bottom);
    }
    c.stroke();
    c.strokeStyle = "#746486";
    c.strokeRect(left, top, right - left, bottom - top);

    if (currentLogSize !== 0) {
      c.strokeStyle = "#4a436e";
      c.lineWidth = 1.4;
      c.setLineDash([5, 4]);
      c.beginPath();
      for (const [from, to] of referenceEdges) {
        c.moveTo(...project(from));
        traceEdge(from, to);
      }
      c.stroke();
      c.setLineDash([]);
    }

    c.font = "700 12px system-ui";
    c.fillText("Homologous temperature, T/Tₘ", (left + right) / 2, height - 12);
    c.save();
    c.translate(13, (top + bottom) / 2);
    c.rotate(-Math.PI / 2);
    c.fillText("Normalized stress, σ/G", 0, 0);
    c.restore();

    const typeSize = clamp(width / 34, 10.5, 14);
    c.font = `750 ${typeSize}px system-ui`;
    for (const { field, polygon } of regions) {
      if (polygon.length < 3) continue;
      c.fillStyle = field.ink;
      const [labelT, labelS] = field.labelAt;
      const halfWidth = Math.max(...field.label.map(label => c.measureText(label).width)) / 2 + 3;
      const halfHeight = field.label.length * (typeSize + 2) / 2 + 2;
      const cornersFit = ([px, py]) => [-halfWidth, halfWidth].every(dx => [-halfHeight, halfHeight].every(dy => {
        const tFraction = (px + dx - left) / (right - left);
        const sFraction = (bottom - py - dy) / (bottom - top);
        return tFraction >= 0 && tFraction <= 1 && sFraction >= 0 && sFraction <= 1 &&
          leads(field, thermal(tMin + tFraction * (tMax - tMin)), sMin + sFraction * (sMax - sMin), currentLogSize);
      }));
      const vertices = polygon.map(project);
      const xs = vertices.map(([px]) => px), ys = vertices.map(([, py]) => py);
      const fieldLeft = Math.min(...xs), fieldTop = Math.min(...ys);
      const fieldWidth = Math.max(...xs) - fieldLeft, fieldHeight = Math.max(...ys) - fieldTop;
      const positions = [.5, .33, .67, .17, .83];
      const candidates = [[x(labelT), y(labelS)], ...positions.flatMap(ry => positions.map(rx =>
        [fieldLeft + rx * fieldWidth, fieldTop + ry * fieldHeight]))];
      const labelPoint = candidates.find(cornersFit);
      if (labelPoint) field.label.forEach((label, i) => c.fillText(label, labelPoint[0],
        labelPoint[1] + (i - (field.label.length - 1) / 2) * (typeSize + 2)));
    }

    const px = x(t), py = y(s);
    c.strokeStyle = "#33274f";
    c.lineWidth = 1.2;
    c.setLineDash([4, 4]);
    c.beginPath();
    c.moveTo(left, py);
    c.lineTo(px, py);
    c.lineTo(px, bottom);
    c.stroke();
    c.setLineDash([]);
    c.beginPath();
    c.arc(px, py, 6, 0, 2 * Math.PI);
    c.fillStyle = "#33274f";
    c.fill();
    c.strokeStyle = "#fff";
    c.lineWidth = 2;
    c.stroke();
  }

  function update() {
    const t = Number(temperature.value);
    const s = Number(stress.value);
    const logSize = Number(grainSize.value);
    if (logSize !== currentLogSize) setGrainSize(logSize);
    const [factor, exponent] = (10 ** s).toExponential(1).split("e");
    const diameter = sizeFormat.format(referenceDiameter * 10 ** logSize);
    temperatureReadout.value = t.toFixed(2);
    stressReadout.value = `${factor} × 10${superscript(Number(exponent))}`;
    grainReadout.value = `${diameter} µm`;
    temperature.setAttribute("aria-valuetext", `${temperatureReadout.value} of the melting temperature in kelvin`);
    stress.setAttribute("aria-valuetext", `${factor} times ten to the power ${Number(exponent)}`);
    grainSize.setAttribute("aria-valuetext", `${diameter} micrometres`);
    const [first, second] = fields.map(field => ({ field, score: rateLog(field, thermal(t), s, logSize) }))
      .sort((a, b) => b.score - a.score);
    if (first.field !== active) {
      active = first.field;
      elapsed = playing ? 0 : 3150;
      title.textContent = active.name;
      description.textContent = active.description;
      grains.setAttribute("aria-label", "Grain-scale view of " + active.name);
      for (const button of buttons) button.toggleAttribute("data-dominant", button.dataset.mechanismExample === active.id);
    }
    crossover.hidden = first.score - second.score > Math.log10(2);
    if (!crossover.hidden) crossover.textContent = `Near a crossover with ${second.field.name}. The two modeled rates are within a factor of two.`;
    drawMap(t, s);
    renderGrains(active.id, elapsed, true);
  }

  function animate(now) {
    frame = undefined;
    if (previous !== undefined) elapsed = (elapsed + Math.min(now - previous, 60)) % 5000;
    previous = now;
    renderGrains(active.id, elapsed);
    scheduleMotion();
  }

  function scheduleMotion() {
    if (playing && visible && frame === undefined) frame = requestAnimationFrame(animate);
    if (!playing || !visible) {
      cancelAnimationFrame(frame);
      frame = previous = undefined;
    }
  }

  function setPlaying(value) {
    playing = value;
    motion.textContent = playing ? "Pause motion" : "Play motion";
    scheduleMotion();
  }

  map.addEventListener("click", event => {
    if (!bounds) return;
    const { left, right, top, bottom } = bounds;
    const rect = map.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    if (x < left || x > right || y < top || y > bottom) return;
    temperature.value = (tMin + (x - left) / (right - left) * (tMax - tMin)).toFixed(2);
    stress.value = (sMin + (bottom - y) / (bottom - top) * (sMax - sMin)).toFixed(2);
    update();
  });
  temperature.addEventListener("input", update);
  stress.addEventListener("input", update);
  grainSize.addEventListener("input", update);
  motion.addEventListener("click", () => setPlaying(!playing));
  reducedMotion.addEventListener("change", event => setPlaying(!event.matches));
  if (typeof IntersectionObserver === "function") {
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; scheduleMotion(); });
    observer.observe(grains);
  }
  refreshOnResize([map, grains], update);
  update();
  setPlaying(playing);
}());
