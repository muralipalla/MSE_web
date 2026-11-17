(function () {
  "use strict";
  const ns = "http://www.w3.org/2000/svg";
  const elastic = document.getElementById("elastic-atoms");
  const plastic = document.getElementById("plastic-atoms");
  const elasticSlider = document.getElementById("elastic-slider");
  const plasticSlider = document.getElementById("plastic-slider");
  const toggle = document.getElementById("load-toggle");
  let loaded = true;

  function element(svg, name, attributes, text) {
    const node = document.createElementNS(ns, name);
    Object.entries(attributes).forEach(([key, value]) => node.setAttribute(key, value));
    if (text !== undefined) node.textContent = text;
    svg.appendChild(node);
    return node;
  }

  function drawBlock(svg, stretch, slip, showPlane, showForce) {
    svg.replaceChildren();
    const points = [];
    for (let row = 0; row < 7; row += 1) {
      points[row] = [];
      for (let col = 0; col < 7; col += 1) {
        const x = 92 + col * 26;
        const y = 65 + row * 26;
        // The two groups shear in opposite directions along x + y = constant.
        const side = x + y < 313 ? 1 : -1;
        points[row][col] = { x: 170 + (x - 170) * (1 - stretch * 0.3) + side * slip,
          y: 143 + (y - 143) * (1 + stretch) - side * slip, side };
      }
    }
    if (showPlane) {
      element(svg, "line", { x1: 77, y1: 236, x2: 263, y2: 50, stroke: "#c93b1f", "stroke-width": 2, "stroke-dasharray": "6 5", opacity: ".65" });
      element(svg, "text", { x: 248, y: 42, fill: "#a12e1a", "font-size": 12 }, "45° slip plane");
    }
    for (let row = 0; row < 7; row += 1) {
      for (let col = 0; col < 7; col += 1) {
        const p = points[row][col];
        [[row, col + 1], [row + 1, col]].forEach(([r, c]) => {
          if (r >= 7 || c >= 7) return;
          const q = points[r][c];
          if (showPlane && p.side !== q.side) return;
          element(svg, "line", { x1: p.x, y1: p.y, x2: q.x, y2: q.y, stroke: "#a5a0c9", "stroke-width": 2 });
        });
      }
    }
    points.flat().forEach(p => element(svg, "circle", { cx: p.x, cy: p.y, r: 6, fill: p.side === 1 && showPlane ? "#cf563d" : "#6554a5", stroke: "white", "stroke-width": 1.3 }));
    if (showForce) {
      element(svg, "path", { d: "M170 45 V16 M164 23 L170 16 L176 23 M170 242 V282 M164 275 L170 282 L176 275", fill: "none", stroke: "#c93b1f", "stroke-width": 3, "stroke-linecap": "round", "stroke-linejoin": "round" });
      element(svg, "text", { x: 181, y: 26 }, "F");
      element(svg, "text", { x: 181, y: 280 }, "F");
    } else {
      element(svg, "text", { x: 170, y: 288, "text-anchor": "middle" }, "No applied load");
    }
  }

  function renderElastic() {
    const value = Number(elasticSlider.value);
    document.getElementById("elastic-output").textContent = value + "%";
    drawBlock(elastic, value / 100 * 0.16, 0, false, value > 0);
  }
  function renderPlastic() {
    const value = Number(plasticSlider.value);
    document.getElementById("plastic-output").textContent = value + "%";
    toggle.textContent = loaded ? "Unload block" : "Reload block";
    toggle.setAttribute("aria-pressed", String(loaded));
    document.getElementById("plastic-status").textContent = loaded
      ? "Loaded: bond stretching and accumulated slip are shown."
      : "Unloaded: elastic stretch is recovered; the accumulated slip remains.";
    drawBlock(plastic, loaded ? 0.06 : 0, value / 100 * 12, true, loaded);
  }
  elasticSlider.addEventListener("input", renderElastic);
  plasticSlider.addEventListener("input", renderPlastic);
  toggle.addEventListener("click", () => { loaded = !loaded; renderPlastic(); });
  document.getElementById("reset-slip").addEventListener("click", () => { plasticSlider.value = 0; loaded = true; renderPlastic(); });

  const areaButtons = document.querySelectorAll("[data-area]");
  areaButtons.forEach(button => button.addEventListener("click", () => {
    const toughness = button.dataset.area === "toughness";
    areaButtons.forEach(item => item.setAttribute("aria-pressed", String(item === button)));
    document.getElementById("toughness-area").style.display = toughness ? "block" : "none";
    document.getElementById("resilience-area").style.display = toughness ? "none" : "block";
    document.getElementById("area-explanation").innerHTML = toughness
      ? "<strong>Modulus of toughness:</strong> the total area under the engineering stress–strain curve up to fracture, representing energy absorbed per unit original volume."
      : "<strong>Modulus of resilience:</strong> elastic energy absorbed per unit volume up to the elastic limit. For linear elasticity, U<sub>r</sub> ≈ σ<sub>y</sub><sup>2</sup> / (2E).";
    document.getElementById("graph-desc").textContent = "The curve rises elastically to an upper yield point, drops to a lower yield point, hardens to a maximum, then falls to fracture. " + (toughness ? "The entire area to fracture is highlighted." : "The elastic area is highlighted.");
  }));
  renderElastic();
  renderPlastic();
}());
