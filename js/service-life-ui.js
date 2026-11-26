(function () {
  "use strict";

  const theme = getComputedStyle(document.documentElement);
  const colours = {
    ink: theme.getPropertyValue("--ink").trim(),
    muted: theme.getPropertyValue("--ink-soft").trim(),
    navy: theme.getPropertyValue("--navy").trim(),
    coral: theme.getPropertyValue("--coral").trim(),
    grid: "#e9e5ef", lavender: "#6c56a4", blue: "#386694"
  };
  const charts = new WeakMap();
  const superscripts = { "-": "⁻", 0: "⁰", 1: "¹", 2: "²", 3: "³", 4: "⁴", 5: "⁵", 6: "⁶", 7: "⁷", 8: "⁸", 9: "⁹" };

  function format(value, digits = 0) {
    return value.toLocaleString("en", { maximumFractionDigits: digits });
  }

  function tickLabel(value, log) {
    const exponent = Math.round(Math.log10(value));
    if (log && (exponent < -2 || exponent >= 3) && Math.abs(value / 10 ** exponent - 1) < 1e-8) {
      return "10" + [...String(exponent)].map(digit => superscripts[digit]).join("");
    }
    if (Math.abs(value) >= 1000000) return format(value / 1000000, 1) + "M";
    if (Math.abs(value) >= 10000) return format(value / 1000, 1) + "k";
    if (Math.abs(value) < 1e-9) return "0";
    return format(value, 3);
  }

  function linearTicks([min, max], count) {
    const interval = (max - min) / count;
    const scale = 10 ** Math.floor(Math.log10(interval));
    const step = [1, 2, 2.5, 5, 10].find(value => value >= interval / scale) * scale;
    const ticks = [];
    for (let index = Math.ceil(min / step); index * step <= max + step * 1e-8; index++) {
      ticks.push(index * step);
    }
    return ticks;
  }

  function sample(min, max, count, point) {
    return Array.from({ length: count + 1 }, (_, index) => point(min + (max - min) * index / count));
  }

  function scaleFor({ range, log = false }, start, end) {
    const transform = log ? Math.log10 : value => value;
    const low = transform(range[0]);
    const span = transform(range[1]) - low;
    return {
      at: value => start + (end - start) * (transform(value) - low) / span,
      from: pixel => {
        const value = low + span * (pixel - start) / (end - start);
        return log ? 10 ** value : value;
      }
    };
  }

  function line(context, x1, y1, x2, y2) {
    context.beginPath();
    context.moveTo(x1, y1);
    context.lineTo(x2, y2);
    context.stroke();
  }

  function path(context, [[x, y], ...rest], xScale, yScale) {
    context.moveTo(xScale.at(x), yScale.at(y));
    for (const [nextX, nextY] of rest) context.lineTo(xScale.at(nextX), yScale.at(nextY));
  }

  function drawSeries(context, series, xScale, yScale) {
    for (const { points, colour = colours.navy, dashed = false, dots = 0, marker } of series) {
      if (!points.length) continue;
      context.strokeStyle = colour;
      context.fillStyle = colour;
      context.lineWidth = 2.6;
      context.setLineDash(dashed ? [6, 5] : []);
      context.beginPath();
      if (dots) {
        for (const [xValue, yValue] of points) {
          const px = xScale.at(xValue);
          const py = yScale.at(yValue);
          if (marker === "plus") {
            context.moveTo(px - dots, py);
            context.lineTo(px + dots, py);
            context.moveTo(px, py - dots);
            context.lineTo(px, py + dots);
          } else {
            context.moveTo(px + dots, py);
            context.arc(px, py, dots, 0, 2 * Math.PI);
          }
        }
        if (marker === "plus") {
          context.stroke();
        } else {
          context.fill();
          if (marker !== "solid") {
            context.strokeStyle = "#fff";
            context.lineWidth = 1.2;
            context.stroke();
          }
        }
      } else {
        path(context, points, xScale, yScale);
        context.stroke();
      }
    }
    context.setLineDash([]);
  }

  function drawGuides(context, guides, box, xScale, yScale) {
    const labels = [];
    for (const { axis, value, label, colour = colours.coral, side = "right" } of guides) {
      const xGuide = axis === "x";
      const pixel = (xGuide ? xScale : yScale).at(value);
      if (xGuide ? pixel < box.left || pixel > box.right : pixel < box.top || pixel > box.bottom) continue;
      context.strokeStyle = colour;
      context.lineWidth = 1.35;
      context.setLineDash([5, 4]);
      if (xGuide) line(context, pixel, box.top, pixel, box.bottom);
      else line(context, box.left, pixel, box.right, pixel);
      context.setLineDash([]);

      if (!label) continue;
      context.font = "650 12px system-ui, sans-serif";
      const width = Math.min(context.measureText(label).width + 12, box.right - box.left - 6);
      const left = xGuide ? Math.min(box.right - width - 3, Math.max(box.left + 3, pixel - width / 2))
        : side === "left" ? box.left + 3 : box.right - width - 3;
      const top = xGuide ? box.top + 7 : Math.max(box.top + 7, pixel - 22);
      if (labels.some(item => left < item.left + item.width + 4 && left + width + 4 > item.left && Math.abs(top - item.top) < 19)) continue;
      labels.push({ left, top, width });
      context.fillStyle = "#fff";
      context.fillRect(left, top, width, 19);
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillStyle = colours.ink;
      context.fillText(label, left + width / 2, top + 9, width - 12);
    }
  }

  function draw(chart) {
    const { context, width, height, ratio, box, xScale, yScale } = chart;
    const { x, y, series, bands = [], fills = [], guides = [], brackets = [] } = chart.config;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, width, height);
    context.fillStyle = "#fdfcfe";
    context.fillRect(box.left, box.top, box.right - box.left, box.bottom - box.top);
    for (const band of bands) {
      context.fillStyle = band.colour;
      context.fillRect(xScale.at(band.from), box.top, xScale.at(band.to) - xScale.at(band.from), box.bottom - box.top);
    }

    const compact = width < 360;
    context.font = compact ? "600 12px system-ui, sans-serif" : "600 13px system-ui, sans-serif";
    context.lineWidth = 1;
    context.strokeStyle = colours.grid;
    context.fillStyle = colours.muted;
    context.textAlign = "center";
    context.textBaseline = "top";
    for (const tick of x.ticks || linearTicks(x.range, width < 400 ? 4 : 6)) {
      const px = xScale.at(tick);
      line(context, px, box.top, px, box.bottom + 3);
      context.fillText(tickLabel(tick, x.log), px, box.bottom + 7);
    }
    context.textAlign = "right";
    context.textBaseline = "middle";
    for (const tick of y.ticks || linearTicks(y.range, 5)) {
      const py = yScale.at(tick);
      line(context, box.left - 3, py, box.right, py);
      context.fillText(tickLabel(tick, y.log), box.left - 8, py);
    }
    context.strokeStyle = "#8b829f";
    line(context, box.left, box.top, box.left, box.bottom);
    line(context, box.left, box.bottom, box.right, box.bottom);
    context.fillStyle = colours.ink;
    context.font = compact ? "700 13px system-ui, sans-serif" : "700 14px system-ui, sans-serif";
    context.textAlign = "center";
    context.fillText(x.label + (x.log ? " · log scale" : ""),
      (box.left + box.right) / 2, height - 13, box.right - box.left);
    context.save();
    context.translate(11, (box.top + box.bottom) / 2);
    context.rotate(-Math.PI / 2);
    context.fillText(y.label + (y.log ? " · log scale" : ""), 0, 0, box.bottom - box.top);
    context.restore();

    context.save();
    context.beginPath();
    context.rect(box.left - 1, box.top - 1, box.right - box.left + 2, box.bottom - box.top + 2);
    context.clip();
    for (const { bounds, colour } of fills) {
      const [lower, upper] = bounds;
      if (lower.length === 0 || upper.length === 0) continue;
      context.fillStyle = colour;
      context.beginPath();
      path(context, lower, xScale, yScale);
      // Continue from the end of the lower edge back along the upper edge.
      for (const [xValue, yValue] of [...upper].reverse()) context.lineTo(xScale.at(xValue), yScale.at(yValue));
      context.closePath();
      context.fill();
    }
    drawSeries(context, series, xScale, yScale);
    drawGuides(context, guides, box, xScale, yScale);
    for (const { low, high, label, offset, colour } of brackets) {
      const px = box.right - offset;
      const top = yScale.at(high);
      const bottom = yScale.at(low);
      if (bottom - top < 13) continue;
      context.strokeStyle = colour;
      context.lineWidth = 1.65;
      line(context, px, top, px, bottom);
      line(context, px - 4, top, px + 4, top);
      line(context, px - 4, bottom, px + 4, bottom);
      context.font = "700 12px system-ui, sans-serif";
      context.textAlign = "right";
      context.textBaseline = "middle";
      const gap = context.measureText(label).width + 4;
      context.fillStyle = "#fff";
      context.fillRect(px - gap - 6, (top + bottom) / 2 - 9, gap + 1, 18);
      context.fillStyle = colour;
      context.fillText(label, px - 7, (top + bottom) / 2);
    }
    for (const { from, to, label, short } of bands) {
      if (!label) continue;
      const available = xScale.at(to) - xScale.at(from) - 8;
      context.font = "650 12px system-ui, sans-serif";
      const text = context.measureText(label).width <= available ? label : short;
      if (!text || context.measureText(text).width > available) continue;
      context.fillStyle = colours.muted;
      context.textAlign = "center";
      context.textBaseline = "top";
      context.fillText(text, (xScale.at(from) + xScale.at(to)) / 2, box.top + 8);
    }
    if (chart.cursor !== null) {
      const px = xScale.at(chart.cursor);
      context.strokeStyle = "#706580";
      context.lineWidth = 1;
      context.setLineDash([2, 3]);
      line(context, px, box.top, px, box.bottom);
      context.setLineDash([]);
    }
    if (chart.marker) {
      const { point: [markerX], colour } = chart.marker;
      const px = xScale.at(markerX);
      context.strokeStyle = colour;
      context.lineWidth = 1.25;
      context.setLineDash([3, 4]);
      line(context, px, box.top, px, box.bottom);
      context.setLineDash([]);
    }
    context.restore();
    if (chart.marker) {
      const { point: [markerX, markerY], colour } = chart.marker;
      const px = xScale.at(markerX);
      const py = yScale.at(markerY);
      context.fillStyle = colour;
      context.beginPath();
      context.arc(px, py, 6, 0, Math.PI * 2);
      context.fill();
      context.strokeStyle = "#fff";
      context.lineWidth = 2;
      context.stroke();
    }
  }

  function updateLegend(chart, series) {
    const legend = series.filter(item => item.label).map(({ label, colour, dashed, dots, marker }) => ({
      label, colour, dashed, dots, marker
    }));
    const signature = JSON.stringify(legend);
    if (chart.signature === signature) return;
    chart.signature = signature;
    chart.legend.hidden = legend.length === 0;
    chart.legend.replaceChildren(...legend.map(({ label, colour, dashed, dots, marker }) => {
      const item = document.createElement("li");
      const swatch = document.createElement("span");
      swatch.setAttribute("aria-hidden", "true");
      swatch.className = marker === "plus" ? "is-plus" : dots ? "is-dot" : dashed ? "is-dashed" : "";
      swatch.style.setProperty("--series-colour", colour || colours.navy);
      item.append(swatch, label);
      return item;
    }));
  }

  function updateProbe(chart, value, announce = false) {
    if (!chart.config.probe || !chart.box) return;
    const [min, max] = chart.config.x.range;
    chart.cursor = Math.max(min, Math.min(max, value));
    const reading = chart.config.probe(chart.cursor);
    chart.readout.textContent = reading;
    if (announce) chart.announcement.textContent = reading;
    draw(chart);
  }

  function prepareChart(canvas) {
    const legend = document.createElement("ul");
    legend.className = "life-legend";
    legend.setAttribute("aria-label", "Graph legend");
    canvas.before(legend);
    const readout = document.createElement("p");
    readout.className = "life-graph-readout";
    const announcement = document.createElement("p");
    announcement.className = "visually-hidden";
    announcement.setAttribute("role", "status");
    canvas.after(readout, announcement);
    const chart = { legend, readout, announcement, cursor: null };
    canvas.addEventListener("pointermove", event => {
      if (!chart.box) return;
      const px = event.clientX - canvas.getBoundingClientRect().left;
      if (px >= chart.box.left && px <= chart.box.right) updateProbe(chart, chart.xScale.from(px));
    });
    canvas.addEventListener("keydown", event => {
      if (!chart.config.probe || !["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
      event.preventDefault();
      const { box, xScale } = chart;
      const present = chart.cursor === null ? box.left : xScale.at(chart.cursor);
      const step = (box.right - box.left) / (event.shiftKey ? 10 : 40);
      const next = { ArrowLeft: present - step, ArrowRight: present + step, Home: box.left, End: box.right }[event.key];
      updateProbe(chart, xScale.from(next), true);
    });
    return chart;
  }

  function canvasSurface(canvas) {
    const { width, height } = canvas.getBoundingClientRect();
    if (!width || !height) return null;
    const context = canvas.getContext("2d");
    if (!context) return null;
    const ratio = Math.min(window.devicePixelRatio || 1, 2.5);
    const pixelWidth = Math.round(width * ratio);
    const pixelHeight = Math.round(height * ratio);
    if (canvas.width !== pixelWidth) canvas.width = pixelWidth;
    if (canvas.height !== pixelHeight) canvas.height = pixelHeight;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    return { context, width, height, ratio };
  }

  function plot(canvas, config) {
    const surface = canvasSurface(canvas);
    if (!surface) return;
    const { width, height } = surface;
    let chart = charts.get(canvas);
    if (!chart) {
      chart = prepareChart(canvas);
      charts.set(canvas, chart);
    }
    updateLegend(chart, config.series);
    const box = { left: width < 360 ? 59 : 67, right: width - 18, top: 13, bottom: height - 47 };
    Object.assign(chart, surface, { config, box,
      xScale: scaleFor(config.x, box.left, box.right), yScale: scaleFor(config.y, box.bottom, box.top) });
    if (config.description) canvas.setAttribute("aria-label", config.description);
    chart.readout.hidden = !config.probe;
    if (config.probe) {
      canvas.tabIndex = 0;
      canvas.setAttribute("aria-description", "Use the arrow keys to read values along the graph. Home and End jump to the first and last values.");
      if (chart.cursor !== null) {
        updateProbe(chart, chart.cursor);
        return;
      }
      chart.readout.textContent = "Point to the graph or use the arrow keys to read values.";
    } else {
      chart.cursor = null;
      canvas.removeAttribute("tabindex");
      canvas.removeAttribute("aria-description");
    }
    draw(chart);
  }

  function markPlot(canvas, point, colour = colours.coral) {
    const chart = charts.get(canvas);
    if (!chart) return;
    chart.marker = { point, colour };
    draw(chart);
  }

  function controlValues(panel) {
    const values = {};
    for (const input of panel.querySelectorAll("[data-unit]")) {
      const value = Number(input.value);
      values[input.name] = value;
      const readout = panel.querySelector('[data-value="' + input.name + '"]');
      if (readout) {
        const label = format(value, Number(input.dataset.digits || 0)) + input.dataset.unit;
        if (readout.textContent !== label) readout.textContent = label;
        input.setAttribute("aria-valuetext", label);
      }
    }
    return values;
  }

  function showResults(panel, values) {
    for (const field of panel.querySelectorAll("[data-result]")) {
      const key = field.dataset.result;
      if (Object.hasOwn(values, key) && field.textContent !== values[key]) field.textContent = values[key];
    }
  }

  function refreshOnResize(canvases, render) {
    let frame;
    const refresh = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(render);
    };
    if (typeof ResizeObserver === "function") {
      const observer = new ResizeObserver(refresh);
      for (const canvas of canvases) observer.observe(canvas);
    } else {
      window.addEventListener("resize", refresh);
    }
  }

  window.MSEServiceLife = { colours, format, plot, markPlot, canvasSurface, sample, controlValues, showResults, refreshOnResize };
}());
