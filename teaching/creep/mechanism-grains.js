(function () {
  "use strict";

  const glow = "#ffbf75";
  const paper = "#ebe6fa";
  const faint = "#a89ac2";

  function path(c, points) {
    c.beginPath();
    points.forEach(([x, y], i) => {
      if (i === 0) c.moveTo(x, y);
      else c.lineTo(x, y);
    });
  }

  function stroke(c, points, color, width = 1) {
    path(c, points);
    c.strokeStyle = color;
    c.lineWidth = width;
    c.stroke();
  }

  function shape(c, points, fill, edge) {
    path(c, points);
    c.closePath();
    c.fillStyle = fill;
    c.fill();
    c.strokeStyle = edge;
    c.lineWidth = 1.5;
    c.stroke();
  }

  function arrow(c, from, to, color) {
    const [x, y] = to;
    const angle = Math.atan2(y - from[1], x - from[0]);
    stroke(c, [from, to], color, 1.8);
    const wings = [-.52, .52].map(offset => [x - 8 * Math.cos(angle + offset), y - 8 * Math.sin(angle + offset)]);
    stroke(c, [wings[0], to, wings[1]], color, 1.8);
  }

  function text(c, label, x, y, color = paper) {
    c.font = "680 14px system-ui";
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillStyle = color;
    c.fillText(label, x, y);
  }

  function tension(c) {
    arrow(c, [43, 100], [43, 53], faint);
    arrow(c, [43, 150], [43, 197], faint);
    text(c, "Tension", 43, 126, paper);
  }

  function particle(c, x, y, radius, color) {
    c.beginPath();
    c.arc(x, y, radius, 0, Math.PI * 2);
    c.fillStyle = color;
    c.fill();
  }

  function diffusion(c, boundary, stretch, elapsed) {
    const grain = [[-49, -58], [49, -58], [73, -34], [73, 34], [49, 58], [-49, 58], [-73, 34], [-73, -34]];
    const grow = 1 + .32 * stretch;
    const transform = ([x, y]) => [226 + x / grow, 121 + y * grow];
    const outline = grain.map(transform);
    c.fillStyle = "#282744";
    c.fillRect(94, 35, 264, 173);
    c.strokeStyle = "#5b5276";
    c.strokeRect(94, 35, 264, 173);
    for (const [index, target] of [[0, [149, 35]], [1, [300, 35]], [2, [358, 69]], [3, [358, 170]],
      [4, [300, 208]], [5, [150, 208]], [6, [94, 171]], [7, [94, 71]]]) {
      stroke(c, [outline[index], target], "#776691");
    }
    shape(c, outline, boundary ? "#483c68" : "#2c4a69", boundary ? "#b6a6dc" : "#91c7e7");
    c.setLineDash([4, 4]);
    stroke(c, [...grain, grain[0]].map(([x, y]) => [226 + x, 121 + y]), "#d8c9e68c");
    c.setLineDash([]);

    if (!boundary) {
      c.save();
      path(c, outline);
      c.closePath();
      c.clip();
      for (let x = -72; x <= 72; x += 12) {
        for (let y = -55; y <= 55; y += 11) particle(c, ...transform([x, y]), 1.1, "#b0dcf071");
      }
      c.restore();
    }

    for (const xSign of [-1, 1]) {
      for (const ySign of [-1, 1]) {
        const points = boundary ? [[73, 0], [73, 34], [49, 58], [16, 58]]
          : [[69, 0], [50, 12], [34, 30], [16, 57]];
        const route = points.map(([x, y]) => transform([x * xSign, y * ySign]));
        stroke(c, route, boundary ? glow : "#e2ae7b99", boundary ? 2 : 1.5);
        for (let atom = 0; atom < 3; atom++) {
          const phase = ((elapsed / 1700 + atom / 3) % 1) * (route.length - 1);
          const segment = Math.floor(phase);
          const fraction = phase - segment;
          const [x, y] = route[segment].map((value, i) => value + fraction * (route[segment + 1][i] - value));
          particle(c, x, y, 3, glow);
        }
      }
    }
    tension(c);
    text(c, boundary ? "Atom flow along the boundary" : "Atom flow through the lattice", 226, 229, glow);
  }

  function sliding(c, stretch) {
    const left = [[98, 53], [250, 53], [186, 193], [98, 193]];
    const right = [[250, 53], [346, 53], [346, 193], [186, 193]];
    const shear = .15 * stretch;
    const yMark = 123;
    const boundaryX = 218;
    const grains = [
      { polygon: left, sign: 1, fill: "#514979", marker: [[121, yMark], [boundaryX, yMark]] },
      { polygon: right, sign: -1, fill: "#315674", marker: [[boundaryX, yMark], [323, yMark]] }
    ];
    for (const { polygon, sign, fill } of grains) {
      c.save();
      c.translate(-64 * shear * sign, 140 * shear * sign);
      shape(c, polygon, fill, "#a29bc7");
      c.clip();
      for (let x = 105; x < 349; x += 14) {
        for (let y = 60; y < 193; y += 14) {
          stroke(c, [[x, y], [x + sign * 4, y + 3]], "#eadbff40");
        }
      }
      c.restore();
    }
    c.setLineDash([4, 4]);
    stroke(c, [[116, yMark], [327, yMark]], "#d8d3ec9c", 1.3);
    c.setLineDash([]);
    for (const { sign, marker } of grains) {
      c.save();
      c.translate(-64 * shear * sign, 140 * shear * sign);
      stroke(c, marker, glow, 3);
      c.restore();
    }
    arrow(c, [203, 146], [188, 179], paper);
    arrow(c, [239, 101], [254, 68], paper);
    tension(c);
    text(c, "Surface marker offsets at the boundary", 226, 231, glow);
  }

  function dislocation(c, elapsed) {
    const pathPoints = [[77, 147], [173, 147], [173, 94], [326, 94]];
    c.fillStyle = "#282744";
    c.fillRect(60, 56, 285, 139);
    c.strokeStyle = "#625578";
    c.strokeRect(60, 56, 285, 139);
    for (let x = 72; x < 343; x += 12) {
      for (let y = 65; y < 195; y += 12) particle(c, x, y, 1.15, "#b9afd658");
    }
    c.setLineDash([4, 4]);
    stroke(c, [[71, 147], [333, 147]], "#a39abf", 1.25);
    stroke(c, [[71, 94], [333, 94]], "#a39abf", 1.25);
    c.setLineDash([]);
    particle(c, 207, 147, 22, "#b07b92");
    particle(c, 207, 147, 17, "#8b546f");
    for (let i = 0; i < pathPoints.length - 1; i++) arrow(c, pathPoints[i], pathPoints[i + 1], "#d8a365");
    const phase = Math.min(elapsed / 4300, .999) * 3;
    const step = Math.floor(phase);
    const fraction = phase - step;
    const [x, y] = pathPoints[step].map((value, i) => value + fraction * (pathPoints[step + 1][i] - value));
    particle(c, x, y, 11, "#f8c27b");
    stroke(c, [[x - 5, y + 4], [x + 5, y + 4]], "#2e2339", 2);
    stroke(c, [[x, y + 4], [x, y - 6]], "#2e2339", 2);
    text(c, "Glide", 111, 170, paper);
    text(c, "Climb", 146, 119, paper);
    text(c, "Glide", 275, 77, paper);
    text(c, "Obstacle", 211, 177, paper);
    text(c, "Edge dislocation bypasses an obstacle", 200, 228, glow);
  }

  window.createCreepGrainView = function (canvas) {
    let surface;
    return (id, elapsed, resize = false) => {
      if (resize || !surface) surface = window.MSEServiceLife.canvasSurface(canvas);
      if (!surface) return;
      const { context: c, width, height } = surface;
      const scale = Math.min(width / 400, height / 252);
      c.clearRect(0, 0, width, height);
      c.save();
      c.translate((width - 400 * scale) / 2, (height - 252 * scale) / 2);
      c.scale(scale, scale);
      c.lineJoin = "round";
      c.lineCap = "round";
      const progress = Math.min(elapsed / 4100, 1);
      const stretch = (1 - Math.cos(progress * Math.PI)) / 2;
      if (id === "coble" || id === "nabarro") diffusion(c, id === "coble", stretch, elapsed);
      else if (id === "sliding") sliding(c, stretch);
      else dislocation(c, elapsed);
      c.restore();
    };
  };
}());
