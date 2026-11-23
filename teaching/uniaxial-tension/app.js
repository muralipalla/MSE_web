(function () {
  "use strict";
  const ns = "http://www.w3.org/2000/svg";
  const elastic = document.getElementById("elastic-atoms");
  const plastic = document.getElementById("plastic-atoms");
  const elasticSlider = document.getElementById("elastic-slider");
  const plasticSlider = document.getElementById("plastic-slider");
  const toggle = document.getElementById("load-toggle");
  const elasticModulus = 200000; // MPa
  const poissonRatio = 0.30;
  const magnification = 100;
  const flowStress = 200; // MPa, illustrative perfectly plastic response
  const spacing = 20;
  const columns = 7;
  const rows = 9;
  const left = 100;
  const top = 66;
  const right = left + columns * spacing;
  const bottom = top + rows * spacing;
  const centerX = (left + right) / 2;
  const centerY = (top + bottom) / 2;
  const planeSum = centerX + centerY - spacing / 2;
  const planeLeft = [left, planeSum - left];
  const planeRight = [right, planeSum - right];
  let loaded = true;

  function element(svg, name, attributes, text) {
    const node = document.createElementNS(ns, name);
    Object.entries(attributes).forEach(([key, value]) => node.setAttribute(key, value));
    if (text !== undefined) node.textContent = text;
    svg.appendChild(node);
    return node;
  }

  function drawBlock(svg, stress, slipEvents, showPlane) {
    svg.replaceChildren();
    const stretch = magnification * stress / elasticModulus;
    const halfSlip = slipEvents * spacing / 2;
    const reference = [[left, top], [right, top], [right, bottom], [left, bottom]];

    function deform([x, y], side = 0) {
      // First apply slip along the plane, then apply the elastic strain to both sides.
      return [
        centerX + (x + side * halfSlip - centerX) * (1 - poissonRatio * stretch),
        centerY + (y - side * halfSlip - centerY) * (1 + stretch)
      ];
    }

    function outline(vertices, side, fill) {
      element(svg, "polygon", {
        points: vertices.map(vertex => deform(vertex, side).join(",")).join(" "),
        fill, stroke: "#625b84", "stroke-width": 1.25
      });
    }

    if (showPlane) {
      outline([reference[0], reference[1], planeRight, planeLeft], 1, "#fae9e2");
      outline([planeRight, reference[2], reference[3], planeLeft], -1, "#ece8f8");
    } else {
      outline(reference, 0, "#ece8f8");
    }
    element(svg, "rect", {
      x: left, y: top, width: right - left, height: bottom - top,
      fill: "none", stroke: "#6d6788", "stroke-width": 1.5, "stroke-dasharray": "4 4"
    });

    const sites = new Map();
    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        const x = left + (column + 0.5) * spacing;
        const y = top + (row + 0.5) * spacing;
        const side = x + y < planeSum ? 1 : -1;
        // Use a half-spacing grid so completed slip preserves lattice registry.
        const gridX = 2 * column + side * slipEvents;
        const gridY = 2 * row - side * slipEvents;
        const [cx, cy] = deform([x, y], side);
        sites.set(`${gridX},${gridY}`, { gridX, gridY, cx, cy, side });
      }
    }

    // Reconnect nearest neighbors across the plane after each completed pass.
    for (const site of sites.values()) {
      const neighbors = [sites.get(`${site.gridX},${site.gridY + 2}`), sites.get(`${site.gridX + 2},${site.gridY}`)];
      for (const neighbor of neighbors) {
        if (!neighbor) continue;
        element(svg, "line", {
          x1: site.cx, y1: site.cy, x2: neighbor.cx, y2: neighbor.cy,
          stroke: "#9188b1", "stroke-width": 1.5
        });
      }
    }
    if (showPlane) {
      const [x1, y1] = deform(planeLeft, 1);
      const [x2, y2] = deform(planeRight, -1);
      element(svg, "line", { x1, y1, x2, y2, stroke: "#b53a20", "stroke-width": 2.5, "stroke-dasharray": "6 4" });
    }
    for (const { cx, cy, side } of sites.values()) {
      element(svg, "circle", {
        cx, cy, r: 5.5, fill: showPlane && side === 1 ? "#bf492f" : "#6554a5",
        stroke: "white", "stroke-width": 1
      });
    }

    if (stress > 0) {
      drawForce(deform([centerX, top], 1)[1], -1);
      drawForce(deform([centerX, bottom], -1)[1], 1);
    }

    function drawForce(edge, direction) {
      const base = edge + direction * 5;
      const tip = edge + direction * 25;
      const arrowhead = tip - direction * 6;
      element(svg, "path", {
        d: `M${centerX} ${base} V${tip} M${centerX - 5} ${arrowhead} L${centerX} ${tip} L${centerX + 5} ${arrowhead}`,
        fill: "none", stroke: "#b53a20", "stroke-width": 2.5,
        "stroke-linecap": "round", "stroke-linejoin": "round"
      });
      element(svg, "text", { class: "math-symbol", x: centerX + 10, y: base + direction * 9 + 4 }, "F");
    }
  }

  function renderElastic() {
    const stress = Number(elasticSlider.value);
    const axialStrainPercent = 100 * stress / elasticModulus;
    document.getElementById("elastic-output").textContent = `${stress} MPa`;
    document.getElementById("elastic-strain").textContent = `${axialStrainPercent.toFixed(3)}%`;
    elastic.setAttribute("aria-label", stress > 0
      ? "Lattice stretched vertically and narrowed horizontally under tension"
      : "Unloaded rectangular lattice at its original size");
    drawBlock(elastic, stress, 0, false);
  }

  function renderPlastic() {
    const slipEvents = Number(plasticSlider.value);
    const eventLabel = slipEvents === 1 ? "1 pass" : `${slipEvents} passes`;
    document.getElementById("plastic-output").textContent = eventLabel;
    plasticSlider.disabled = !loaded;
    toggle.textContent = loaded ? "Unload block" : "Reload block";
    const stress = loaded ? flowStress : 0;
    const state = loaded ? `Under tension at ${stress} MPa.` : "Unloaded. Elastic strain has recovered.";
    const shape = slipEvents > 0 ? "The slip offset remains visible." : "No slip has occurred.";
    document.getElementById("plastic-status").textContent = `${state} ${shape}`;
    plastic.setAttribute("aria-label", `${state} Inclined slip plane, ${eventLabel}. ${shape}`);
    drawBlock(plastic, stress, slipEvents, true);
  }

  elasticSlider.addEventListener("input", renderElastic);
  plasticSlider.addEventListener("input", renderPlastic);
  toggle.addEventListener("click", () => {
    loaded = !loaded;
    renderPlastic();
  });
  document.getElementById("reset-slip").addEventListener("click", () => {
    plasticSlider.value = 0;
    loaded = true;
    renderPlastic();
  });

  const energyPanel = document.getElementById("energy-panel");
  const areaCaption = document.getElementById("area-caption");
  const areaButtons = energyPanel.querySelectorAll("[data-area]");
  const areaCaptions = {
    resilience: "Resilience: the shaded triangle ends at the elastic limit in the yield detail.",
    toughness: "Toughness: the full plot shades the area from zero strain to fracture."
  };
  for (const button of areaButtons) {
    button.addEventListener("click", () => {
      const area = button.dataset.area;
      energyPanel.dataset.highlight = area;
      for (const item of areaButtons) {
        item.setAttribute("aria-pressed", String(item === button));
      }
      areaCaption.textContent = areaCaptions[area];
    });
  }

  renderElastic();
  renderPlastic();
}());
