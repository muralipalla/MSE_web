(() => {
  "use strict";

  const elements = {
    host: document.querySelector("#carburizing-case-study"),
    fieldCanvas: document.querySelector("#carb-field-canvas"),
    profileCanvas: document.querySelector("#carb-profile-canvas"),
    fieldStage: document.querySelector("#carb-field-stage"),
    dataState: document.querySelector("#carb-data-state"),
    temperature: document.querySelector("#carb-temperature-control"),
    temperatureOutput: document.querySelector("#carb-temperature-output"),
    duration: document.querySelector("#carb-duration-control"),
    durationOutput: document.querySelector("#carb-duration-output"),
    play: document.querySelector("#carb-play-control"),
    reset: document.querySelector("#carb-reset-control"),
    mesh: document.querySelector("#carb-mesh-control"),
    probe: document.querySelector("#carb-probe-control"),
    caseDepth: document.querySelector("#carb-case-depth"),
    diffusivity: document.querySelector("#carb-diffusivity-range"),
    interpolation: document.querySelector("#carb-interpolation-state"),
    summary: document.querySelector("#carb-current-summary")
  };

  if (Object.values(elements).some((element) => !element)) return;

  const manifestUrl = new URL("../../assets/data/carburizing-gear/v1/manifest.json?v=2", window.location.href);
  const dataRoot = new URL("./", manifestUrl);
  const chunkCache = new Map();
  const pendingChunks = new Map();
  const maximumCachedChunks = 3;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const formatter = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 });
  let manifest = null;
  let mesh = null;
  let fieldRenderer = null;
  let profileRenderer = null;
  let currentField = null;
  let currentBracket = null;
  let updateToken = 0;
  let scheduledUpdate = 0;
  let animationFrame = 0;
  let animationStart = 0;
  let animationStartHours = 0;
  let playing = false;

  function setStatus(message) {
    elements.dataState.textContent = message;
  }

  function setControlsEnabled(enabled) {
    [elements.temperature, elements.duration, elements.play, elements.reset, elements.mesh, elements.probe]
      .forEach((control) => { control.disabled = !enabled; });
  }

  function compileShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const message = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error(`WebGL shader failed: ${message}`);
    }
    return shader;
  }

  function createProgram(gl, vertexSource, fragmentSource) {
    const program = gl.createProgram();
    gl.attachShader(program, compileShader(gl, gl.VERTEX_SHADER, vertexSource));
    gl.attachShader(program, compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(`WebGL program failed: ${gl.getProgramInfoLog(program)}`);
    }
    return program;
  }

  function createCanvasFieldRenderer(canvas, meshData) {
    const context = canvas.getContext("2d");
    if (!context) throw new Error("This browser cannot draw the FEM field.");
    const positions = new Float32Array(meshData.positions);
    const triangles = new Uint16Array(meshData.triangles);
    const nodeCount = positions.length / 2;
    const concentration = new Float32Array(nodeCount);
    const colourStops = [
      [0, 32, 76], [23, 63, 105], [89, 108, 108],
      [148, 142, 101], [209, 177, 90], [255, 234, 70]
    ];
    let showMesh = true;
    let probePositions = new Float32Array();

    function colour(value) {
      const scaled = Math.max(0, Math.min(1, value)) * (colourStops.length - 1);
      const lower = Math.min(colourStops.length - 2, Math.floor(scaled));
      const mix = scaled - lower;
      const start = colourStops[lower];
      const end = colourStops[lower + 1];
      return `rgb(${Math.round(start[0] + (end[0] - start[0]) * mix)}, ${Math.round(start[1] + (end[1] - start[1]) * mix)}, ${Math.round(start[2] + (end[2] - start[2]) * mix)})`;
    }

    function fitCanvas() {
      const bounds = canvas.getBoundingClientRect();
      const width = Math.max(1, Math.round(bounds.width));
      const height = Math.max(1, Math.round(bounds.height));
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
      }
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      const xMin = Number(meshData.boundsMm.xMin);
      const xMax = Number(meshData.boundsMm.xMax);
      const yMin = Number(meshData.boundsMm.yMin);
      const yMax = Number(meshData.boundsMm.yMax);
      const spanX = xMax - xMin;
      const spanY = yMax - yMin;
      const marginX = Math.max(34, width * 0.075);
      const marginTop = Math.max(78, height * 0.12);
      const marginBottom = Math.max(42, height * 0.07);
      const scale = Math.min(
        (width - 2 * marginX) / spanX,
        (height - marginTop - marginBottom) / spanY
      );
      const originX = marginX + (width - 2 * marginX - spanX * scale) / 2;
      const originY = marginTop + (height - marginTop - marginBottom - spanY * scale) / 2;
      return {
        width,
        height,
        x: (value) => originX + (value - xMin) * scale,
        y: (value) => originY + (yMax - value) * scale
      };
    }

    function drawPolyline(flatPositions, transform, strokeStyle, lineWidth) {
      if (!flatPositions || flatPositions.length < 4) return;
      context.beginPath();
      context.moveTo(transform.x(flatPositions[0]), transform.y(flatPositions[1]));
      for (let index = 2; index < flatPositions.length; index += 2) {
        context.lineTo(transform.x(flatPositions[index]), transform.y(flatPositions[index + 1]));
      }
      context.strokeStyle = strokeStyle;
      context.lineWidth = lineWidth;
      context.stroke();
    }

    function draw() {
      const transform = fitCanvas();
      context.clearRect(0, 0, transform.width, transform.height);
      context.fillStyle = "#fff7e3";
      context.fillRect(0, 0, transform.width, transform.height);

      for (let offset = 0; offset < triangles.length; offset += 3) {
        const a = triangles[offset];
        const b = triangles[offset + 1];
        const c = triangles[offset + 2];
        context.beginPath();
        context.moveTo(transform.x(positions[a * 2]), transform.y(positions[a * 2 + 1]));
        context.lineTo(transform.x(positions[b * 2]), transform.y(positions[b * 2 + 1]));
        context.lineTo(transform.x(positions[c * 2]), transform.y(positions[c * 2 + 1]));
        context.closePath();
        context.fillStyle = colour((concentration[a] + concentration[b] + concentration[c]) / 3);
        context.fill();
      }

      if (showMesh) {
        context.beginPath();
        for (let offset = 0; offset < triangles.length; offset += 3) {
          const a = triangles[offset];
          const b = triangles[offset + 1];
          const c = triangles[offset + 2];
          context.moveTo(transform.x(positions[a * 2]), transform.y(positions[a * 2 + 1]));
          context.lineTo(transform.x(positions[b * 2]), transform.y(positions[b * 2 + 1]));
          context.lineTo(transform.x(positions[c * 2]), transform.y(positions[c * 2 + 1]));
          context.closePath();
        }
        context.strokeStyle = "rgba(26, 56, 74, 0.22)";
        context.lineWidth = 0.55;
        context.stroke();
      }

      drawPolyline(meshData.boundaries.atmosphere?.positions, transform, "#c7350a", 2.2);
      drawPolyline(meshData.boundaries.symmetryLeft?.positions, transform, "#006176", 2);
      drawPolyline(meshData.boundaries.symmetryRight?.positions, transform, "#006176", 2);
      drawPolyline(meshData.boundaries.core?.positions, transform, "#52408c", 2);
      drawPolyline(probePositions, transform, "rgba(255,255,255,0.96)", 2.2);
    }

    return {
      mode: "canvas2d",
      nodeCount,
      setField(values) { concentration.set(values); draw(); },
      setMeshVisibility(value) { showMesh = value; draw(); },
      setProbe(flatPositions) { probePositions = new Float32Array(flatPositions || []); draw(); },
      draw
    };
  }

  function createFieldRenderer(canvas, meshData) {
    const gl = canvas.getContext("webgl", { antialias: true, alpha: false });
    if (!gl) return createCanvasFieldRenderer(canvas, meshData);

    const fieldProgram = createProgram(gl, `
      attribute vec2 a_position;
      attribute float a_concentration;
      uniform vec2 u_scale;
      uniform vec2 u_offset;
      varying float v_concentration;
      void main() {
        gl_Position = vec4(a_position * u_scale + u_offset, 0.0, 1.0);
        v_concentration = clamp(a_concentration, 0.0, 1.0);
      }
    `, `
      precision mediump float;
      varying float v_concentration;
      vec3 cividis(float value) {
        vec3 c0 = vec3(0.000, 0.125, 0.298);
        vec3 c1 = vec3(0.090, 0.247, 0.412);
        vec3 c2 = vec3(0.349, 0.424, 0.424);
        vec3 c3 = vec3(0.580, 0.557, 0.396);
        vec3 c4 = vec3(0.820, 0.694, 0.353);
        vec3 c5 = vec3(1.000, 0.918, 0.275);
        float scaled = clamp(value, 0.0, 1.0) * 5.0;
        if (scaled < 1.0) return mix(c0, c1, scaled);
        if (scaled < 2.0) return mix(c1, c2, scaled - 1.0);
        if (scaled < 3.0) return mix(c2, c3, scaled - 2.0);
        if (scaled < 4.0) return mix(c3, c4, scaled - 3.0);
        return mix(c4, c5, scaled - 4.0);
      }
      void main() {
        gl_FragColor = vec4(cividis(v_concentration), 1.0);
      }
    `);

    const lineProgram = createProgram(gl, `
      attribute vec2 a_position;
      uniform vec2 u_scale;
      uniform vec2 u_offset;
      void main() {
        gl_Position = vec4(a_position * u_scale + u_offset, 0.0, 1.0);
      }
    `, `
      precision mediump float;
      uniform vec4 u_colour;
      void main() { gl_FragColor = u_colour; }
    `);

    const positions = new Float32Array(meshData.positions);
    const triangles = new Uint16Array(meshData.triangles);
    const nodeCount = positions.length / 2;
    const concentration = new Float32Array(nodeCount);
    const meshLines = new Uint16Array((triangles.length / 3) * 6);
    for (let source = 0, target = 0; source < triangles.length; source += 3) {
      const a = triangles[source];
      const b = triangles[source + 1];
      const c = triangles[source + 2];
      meshLines[target++] = a; meshLines[target++] = b;
      meshLines[target++] = b; meshLines[target++] = c;
      meshLines[target++] = c; meshLines[target++] = a;
    }

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
    const concentrationBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, concentrationBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, concentration, gl.DYNAMIC_DRAW);
    const triangleBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, triangleBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, triangles, gl.STATIC_DRAW);
    const meshLineBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, meshLineBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, meshLines, gl.STATIC_DRAW);

    const boundaryBuffers = Object.fromEntries(Object.entries(meshData.boundaries).map(([name, boundary]) => {
      const values = new Float32Array(boundary.positions);
      const buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, values, gl.STATIC_DRAW);
      return [name, { buffer, count: values.length / 2 }];
    }));
    const probeBuffer = gl.createBuffer();
    let probeCount = 0;

    const fieldLocations = {
      position: gl.getAttribLocation(fieldProgram, "a_position"),
      concentration: gl.getAttribLocation(fieldProgram, "a_concentration"),
      scale: gl.getUniformLocation(fieldProgram, "u_scale"),
      offset: gl.getUniformLocation(fieldProgram, "u_offset")
    };
    const lineLocations = {
      position: gl.getAttribLocation(lineProgram, "a_position"),
      scale: gl.getUniformLocation(lineProgram, "u_scale"),
      offset: gl.getUniformLocation(lineProgram, "u_offset"),
      colour: gl.getUniformLocation(lineProgram, "u_colour")
    };

    let showMesh = true;
    let projection = null;

    function resize() {
      const bounds = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.max(1, Math.round(bounds.width * dpr));
      const height = Math.max(1, Math.round(bounds.height * dpr));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      gl.viewport(0, 0, width, height);
      const xMin = Number(meshData.boundsMm.xMin);
      const xMax = Number(meshData.boundsMm.xMax);
      const yMin = Number(meshData.boundsMm.yMin);
      const yMax = Number(meshData.boundsMm.yMax);
      const spanX = xMax - xMin;
      const spanY = yMax - yMin;
      const marginX = Math.max(34 * dpr, width * 0.075);
      const marginTop = Math.max(78 * dpr, height * 0.12);
      const marginBottom = Math.max(42 * dpr, height * 0.07);
      const scalePixels = Math.min(
        (width - 2 * marginX) / spanX,
        (height - marginTop - marginBottom) / spanY
      );
      const plotWidth = spanX * scalePixels;
      const plotHeight = spanY * scalePixels;
      const originX = marginX + (width - 2 * marginX - plotWidth) / 2;
      const originY = marginTop + (height - marginTop - marginBottom - plotHeight) / 2;
      projection = {
        scale: [2 * scalePixels / width, 2 * scalePixels / height],
        offset: [
          2 * (originX - xMin * scalePixels) / width - 1,
          1 - 2 * (originY + yMax * scalePixels) / height
        ]
      };
    }

    function bindPosition(programLocation, buffer = positionBuffer) {
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.enableVertexAttribArray(programLocation);
      gl.vertexAttribPointer(programLocation, 2, gl.FLOAT, false, 0, 0);
    }

    function setProjection(scaleLocation, offsetLocation) {
      gl.uniform2f(scaleLocation, projection.scale[0], projection.scale[1]);
      gl.uniform2f(offsetLocation, projection.offset[0], projection.offset[1]);
    }

    function drawBoundary(name, colour, width = 1) {
      const boundary = boundaryBuffers[name];
      if (!boundary) return;
      gl.lineWidth(width);
      bindPosition(lineLocations.position, boundary.buffer);
      gl.uniform4fv(lineLocations.colour, colour);
      gl.drawArrays(gl.LINE_STRIP, 0, boundary.count);
    }

    function draw() {
      resize();
      gl.disable(gl.DEPTH_TEST);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.clearColor(1.0, 0.965, 0.89, 1.0);
      gl.clear(gl.COLOR_BUFFER_BIT);

      gl.useProgram(fieldProgram);
      bindPosition(fieldLocations.position);
      gl.bindBuffer(gl.ARRAY_BUFFER, concentrationBuffer);
      gl.enableVertexAttribArray(fieldLocations.concentration);
      gl.vertexAttribPointer(fieldLocations.concentration, 1, gl.FLOAT, false, 0, 0);
      setProjection(fieldLocations.scale, fieldLocations.offset);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, triangleBuffer);
      gl.drawElements(gl.TRIANGLES, triangles.length, gl.UNSIGNED_SHORT, 0);

      gl.useProgram(lineProgram);
      setProjection(lineLocations.scale, lineLocations.offset);
      if (showMesh) {
        bindPosition(lineLocations.position);
        gl.uniform4f(lineLocations.colour, 0.10, 0.22, 0.29, 0.26);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, meshLineBuffer);
        gl.drawElements(gl.LINES, meshLines.length, gl.UNSIGNED_SHORT, 0);
      }
      drawBoundary("atmosphere", new Float32Array([0.78, 0.20, 0.04, 1]), 2);
      drawBoundary("symmetryLeft", new Float32Array([0.0, 0.38, 0.48, 1]), 2);
      drawBoundary("symmetryRight", new Float32Array([0.0, 0.38, 0.48, 1]), 2);
      drawBoundary("core", new Float32Array([0.32, 0.25, 0.55, 1]), 2);
      if (probeCount > 1) {
        gl.lineWidth(2);
        bindPosition(lineLocations.position, probeBuffer);
        gl.uniform4f(lineLocations.colour, 1, 1, 1, 0.95);
        gl.drawArrays(gl.LINE_STRIP, 0, probeCount);
      }
    }

    return {
      mode: "webgl",
      nodeCount,
      setField(values) {
        concentration.set(values);
        gl.bindBuffer(gl.ARRAY_BUFFER, concentrationBuffer);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, concentration);
        draw();
      },
      setMeshVisibility(value) { showMesh = value; draw(); },
      setProbe(flatPositions) {
        const values = new Float32Array(flatPositions || []);
        probeCount = values.length / 2;
        gl.bindBuffer(gl.ARRAY_BUFFER, probeBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, values, gl.DYNAMIC_DRAW);
        draw();
      },
      draw
    };
  }

  function createProfileRenderer(canvas) {
    const context = canvas.getContext("2d");
    let latest = null;

    function fitCanvas() {
      const bounds = canvas.getBoundingClientRect();
      const width = Math.max(1, Math.round(bounds.width));
      const height = Math.max(1, Math.round(bounds.height));
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
      }
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      return { width, height };
    }

    function draw() {
      if (!latest) return;
      const { depths, carbon, label } = latest;
      const { width, height } = fitCanvas();
      const margin = { left: 58, right: 18, top: 26, bottom: 48 };
      const plotWidth = Math.max(1, width - margin.left - margin.right);
      const plotHeight = Math.max(1, height - margin.top - margin.bottom);
      const maximumDepth = depths[depths.length - 1];
      const mapX = (value) => margin.left + value / maximumDepth * plotWidth;
      const mapY = (value) => margin.top + (0.82 - value) / 0.64 * plotHeight;

      context.clearRect(0, 0, width, height);
      context.fillStyle = "#fffefb";
      context.fillRect(0, 0, width, height);
      context.strokeStyle = "rgba(35,55,74,0.12)";
      context.lineWidth = 1;
      context.font = "11px system-ui, sans-serif";
      context.fillStyle = "#5d6976";
      context.textAlign = "right";
      context.textBaseline = "middle";
      for (let value = 0.2; value <= 0.8001; value += 0.1) {
        const y = mapY(value);
        context.beginPath();
        context.moveTo(margin.left, y);
        context.lineTo(width - margin.right, y);
        context.stroke();
        context.fillText(value.toFixed(1), margin.left - 8, y);
      }
      context.textAlign = "center";
      context.textBaseline = "top";
      for (let index = 0; index <= 4; index += 1) {
        const value = maximumDepth * index / 4;
        const x = mapX(value);
        context.beginPath();
        context.moveTo(x, margin.top);
        context.lineTo(x, margin.top + plotHeight);
        context.stroke();
        context.fillText(value.toFixed(1), x, margin.top + plotHeight + 7);
      }

      context.save();
      context.setLineDash([6, 5]);
      context.strokeStyle = "#a96922";
      context.beginPath();
      context.moveTo(margin.left, mapY(0.4));
      context.lineTo(width - margin.right, mapY(0.4));
      context.stroke();
      context.restore();
      context.fillStyle = "#8a581d";
      context.textAlign = "right";
      context.textBaseline = "bottom";
      context.fillText("0.40 wt% case criterion", width - margin.right - 4, mapY(0.4) - 4);

      const gradient = context.createLinearGradient(margin.left, 0, width - margin.right, 0);
      gradient.addColorStop(0, "rgba(255,234,70,0.28)");
      gradient.addColorStop(1, "rgba(0,32,76,0.05)");
      context.beginPath();
      depths.forEach((depth, index) => {
        const x = mapX(depth);
        const y = mapY(carbon[index]);
        if (index === 0) context.moveTo(x, y);
        else context.lineTo(x, y);
      });
      context.lineTo(mapX(maximumDepth), mapY(0.18));
      context.lineTo(mapX(0), mapY(0.18));
      context.closePath();
      context.fillStyle = gradient;
      context.fill();

      context.beginPath();
      depths.forEach((depth, index) => {
        const x = mapX(depth);
        const y = mapY(carbon[index]);
        if (index === 0) context.moveTo(x, y);
        else context.lineTo(x, y);
      });
      context.strokeStyle = "#b14418";
      context.lineWidth = 2.5;
      context.lineJoin = "round";
      context.stroke();

      context.strokeStyle = "#263b4c";
      context.lineWidth = 1.25;
      context.strokeRect(margin.left, margin.top, plotWidth, plotHeight);
      context.fillStyle = "#172536";
      context.font = "700 11px system-ui, sans-serif";
      context.textAlign = "center";
      context.fillText("Depth from exposed surface (mm)", margin.left + plotWidth / 2, height - 19);
      context.save();
      context.translate(15, margin.top + plotHeight / 2);
      context.rotate(-Math.PI / 2);
      context.fillText("Carbon concentration (wt%)", 0, 0);
      context.restore();
      context.textAlign = "left";
      context.fillStyle = "#5d6976";
      context.font = "700 10px system-ui, sans-serif";
      context.fillText(label, margin.left + 6, margin.top + 7);
    }

    if (typeof ResizeObserver === "function") new ResizeObserver(draw).observe(canvas);
    else window.addEventListener("resize", draw, { passive: true });

    return {
      update(depths, carbon, label) { latest = { depths, carbon, label }; draw(); }
    };
  }

  async function fetchJson(url) {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) throw new Error(`${url.pathname} returned HTTP ${response.status}`);
    return response.json();
  }

  function readMagic(view) {
    return String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3));
  }

  async function sha256Hex(buffer) {
    if (!window.crypto?.subtle) return null;
    const digest = await window.crypto.subtle.digest("SHA-256", buffer);
    return [...new Uint8Array(digest)]
      .map((value) => value.toString(16).padStart(2, "0"))
      .join("");
  }

  async function fetchChunk(temperatureC) {
    if (chunkCache.has(temperatureC)) {
      const cached = chunkCache.get(temperatureC);
      cached.used = performance.now();
      return cached;
    }
    const descriptor = manifest.chunks.find((item) => Number(item.temperatureC) === Number(temperatureC));
    if (!descriptor) throw new Error(`No FEM field is available at ${temperatureC} °C.`);
    const chunkUrl = new URL(descriptor.url, dataRoot);
    chunkUrl.searchParams.set("v", descriptor.sha256.slice(0, 12));
    const response = await fetch(chunkUrl, { cache: "force-cache" });
    if (!response.ok) throw new Error(`FEM field at ${temperatureC} °C returned HTTP ${response.status}`);
    const buffer = await response.arrayBuffer();
    const view = new DataView(buffer);
    if (buffer.byteLength < 32 || readMagic(view) !== "CGF1") throw new Error("Invalid carburizing field header.");
    const version = view.getUint16(4, true);
    const encoding = view.getUint16(6, true);
    const nodeCount = view.getUint32(8, true);
    const frameCount = view.getUint32(12, true);
    const headerTemperature = view.getFloat32(16, true);
    const headerInitialCarbon = view.getFloat32(20, true);
    const headerSurfaceCarbon = view.getFloat32(24, true);
    if (version !== 1 || encoding !== 1) throw new Error("Unsupported carburizing field schema.");
    if (Math.abs(headerTemperature - Number(descriptor.temperatureC)) > 1e-4) {
      throw new Error("Carburizing field temperature does not match its descriptor.");
    }
    if (Math.abs(headerInitialCarbon - Number(manifest.state.initialCarbonWtPercent)) > 1e-5
      || Math.abs(headerSurfaceCarbon - Number(manifest.state.surfaceCarbonWtPercent)) > 1e-5) {
      throw new Error("Carburizing field concentration limits do not match the manifest.");
    }
    if (nodeCount !== manifest.mesh.renderNodeCount || frameCount !== manifest.times.count) {
      throw new Error(`Field dimensions do not match the dataset manifest at ${temperatureC} °C.`);
    }
    const expectedBytes = 32 + nodeCount * frameCount * 2;
    if (buffer.byteLength !== expectedBytes || buffer.byteLength !== Number(descriptor.byteLength)) {
      throw new Error("Carburizing field has an unexpected byte length.");
    }
    const digest = await sha256Hex(buffer);
    if (digest && digest !== descriptor.sha256) throw new Error("Carburizing field checksum failed.");
    const chunk = {
      temperatureC,
      nodeCount,
      frameCount,
      values: new Uint16Array(buffer, 32),
      used: performance.now()
    };
    chunkCache.set(temperatureC, chunk);
    if (chunkCache.size > maximumCachedChunks) {
      const protectedTemperatures = new Set(currentBracket ? [currentBracket.lower, currentBracket.upper] : []);
      const candidates = [...chunkCache.values()].filter((item) => !protectedTemperatures.has(item.temperatureC));
      candidates.sort((a, b) => a.used - b.used);
      if (candidates.length) chunkCache.delete(candidates[0].temperatureC);
    }
    return chunk;
  }

  async function loadChunk(temperatureC) {
    if (chunkCache.has(temperatureC)) {
      const cached = chunkCache.get(temperatureC);
      cached.used = performance.now();
      return cached;
    }
    if (pendingChunks.has(temperatureC)) return pendingChunks.get(temperatureC);
    const request = fetchChunk(temperatureC);
    pendingChunks.set(temperatureC, request);
    try {
      return await request;
    } finally {
      if (pendingChunks.get(temperatureC) === request) pendingChunks.delete(temperatureC);
    }
  }

  function agrenDiffusivity(temperatureC, normalizedConcentration) {
    const carbonWtPercent = 0.20 + normalizedConcentration * 0.60;
    const massFraction = carbonWtPercent / 100;
    const y = massFraction / (1 - massFraction) * (55.845 / 12.011);
    const temperatureK = temperatureC + 273.15;
    return 4.53e-7
      * (1 + y * (1 - y) * 8339.9 / temperatureK)
      * Math.exp(-(1 / temperatureK - 2.221e-4) * (17767 - 26436 * y));
  }

  function temperatureBracket(value) {
    const temperatures = manifest.solverTemperaturesC.map(Number);
    const coordinates = manifest.temperatureInterpolation.coordinates.map(Number);
    if (value <= temperatures[0]) return { lower: temperatures[0], upper: temperatures[0], weight: 0 };
    if (value >= temperatures[temperatures.length - 1]) {
      const last = temperatures[temperatures.length - 1];
      return { lower: last, upper: last, weight: 0 };
    }
    for (let index = 1; index < temperatures.length; index += 1) {
      if (value <= temperatures[index]) {
        const lower = temperatures[index - 1];
        const upper = temperatures[index];
        if (value === upper) return { lower: upper, upper, weight: 0 };
        const coordinate = Math.log(agrenDiffusivity(value, 0.5));
        const lowerCoordinate = coordinates[index - 1];
        const upperCoordinate = coordinates[index];
        return { lower, upper, weight: (coordinate - lowerCoordinate) / (upperCoordinate - lowerCoordinate) };
      }
    }
    throw new Error("Unable to bracket the selected temperature.");
  }

  function timeBracket(hours) {
    const times = manifest.times.values.map(Number);
    if (hours <= times[0]) return { lower: 0, upper: 0, weight: 0 };
    if (hours >= times[times.length - 1]) {
      const last = times.length - 1;
      return { lower: last, upper: last, weight: 0 };
    }
    let low = 0;
    let high = times.length - 1;
    while (high - low > 1) {
      const middle = Math.floor((low + high) / 2);
      if (times[middle] <= hours) low = middle;
      else high = middle;
    }
    return { lower: low, upper: high, weight: (hours - times[low]) / (times[high] - times[low]) };
  }

  function interpolateFields(lowerChunk, upperChunk, temperatureMix, time) {
    const count = lowerChunk.nodeCount;
    if (!currentField || currentField.length !== count) currentField = new Float32Array(count);
    const lowerOffset0 = time.lower * count;
    const lowerOffset1 = time.upper * count;
    const upperOffset0 = time.lower * count;
    const upperOffset1 = time.upper * count;
    const timeMix = time.weight;
    const inverseTime = 1 - timeMix;
    const inverseTemperature = 1 - temperatureMix;
    for (let index = 0; index < count; index += 1) {
      const lower = (lowerChunk.values[lowerOffset0 + index] * inverseTime
        + lowerChunk.values[lowerOffset1 + index] * timeMix) / 65535;
      const upper = (upperChunk.values[upperOffset0 + index] * inverseTime
        + upperChunk.values[upperOffset1 + index] * timeMix) / 65535;
      currentField[index] = lower * inverseTemperature + upper * temperatureMix;
    }
    return currentField;
  }

  function probeValues(probe) {
    const values = new Float32Array(probe.depthsMm.length);
    for (let sample = 0; sample < values.length; sample += 1) {
      const base = sample * 3;
      values[sample] = currentField[probe.vertexIndices[base]] * probe.weights[base]
        + currentField[probe.vertexIndices[base + 1]] * probe.weights[base + 1]
        + currentField[probe.vertexIndices[base + 2]] * probe.weights[base + 2];
    }
    return values;
  }

  function effectiveCaseDepth(depths, carbon) {
    const threshold = Number(manifest.state.caseDepthCriterionWtPercent);
    if (carbon[0] < threshold) return 0;
    for (let index = 1; index < carbon.length; index += 1) {
      if (carbon[index] <= threshold) {
        const previous = carbon[index - 1];
        const fraction = (threshold - previous) / (carbon[index] - previous || -1e-12);
        return depths[index - 1] + fraction * (depths[index] - depths[index - 1]);
      }
    }
    return null;
  }

  function formatScientific(value) {
    const [mantissa, exponentText] = value.toExponential(2).split("e");
    const superscript = { "-": "⁻", "+": "⁺", "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹" };
    const exponent = [...exponentText].map((character) => superscript[character] || character).join("");
    return `${mantissa}×10${exponent}`;
  }

  function updateAnalysis(temperature, duration, temperatureState, timeState) {
    const probe = mesh.probes[elements.probe.value] || mesh.probes.tip;
    const normalized = probeValues(probe);
    const c0 = Number(manifest.state.initialCarbonWtPercent);
    const cs = Number(manifest.state.surfaceCarbonWtPercent);
    const carbon = Array.from(normalized, (value) => c0 + value * (cs - c0));
    profileRenderer.update(probe.depthsMm, carbon, probe.label);
    fieldRenderer.setProbe(probe.positions);

    const depth = duration <= 0 ? 0 : effectiveCaseDepth(probe.depthsMm, carbon);
    elements.caseDepth.textContent = depth === null ? `>${probe.depthsMm.at(-1).toFixed(2)} mm` : `${depth.toFixed(2)} mm`;
    const diffusivityCore = agrenDiffusivity(temperature, 0);
    const diffusivitySurface = agrenDiffusivity(temperature, 1);
    elements.diffusivity.textContent = `${formatScientific(diffusivityCore)}–${formatScientific(diffusivitySurface)} m²/s`;
    const temperatures = temperatureState.lower === temperatureState.upper
      ? `${temperatureState.lower}°C`
      : `${temperatureState.lower}↔${temperatureState.upper}°C`;
    const times = manifest.times.values;
    const timeLabel = timeState.lower === timeState.upper
      ? `${Number(times[timeState.lower]).toFixed(2)} h`
      : `${Number(times[timeState.lower]).toFixed(2)}↔${Number(times[timeState.upper]).toFixed(2)} h`;
    elements.interpolation.textContent = `${temperatures}; ${timeLabel}`;
    const depthText = depth === null ? `more than ${probe.depthsMm.at(-1).toFixed(1)} mm` : `${depth.toFixed(2)} mm`;
    elements.summary.textContent = duration <= 0
      ? "Before treatment, the steel remains at 0.20 wt% C except for the maintained surface boundary."
      : `At ${temperature}°C after ${duration.toFixed(2)} h, the ${probe.label.toLowerCase()} reaches the 0.40 wt% criterion at ${depthText}.`;
    elements.profileCanvas.setAttribute("aria-label", `${probe.label} carbon profile at ${temperature} degrees Celsius and ${duration.toFixed(2)} hours. Carbon penetration depth is ${depthText}.`);
    elements.fieldCanvas.setAttribute("aria-label", `Carbon concentration map on one gear-tooth sector at ${temperature} degrees Celsius after ${duration.toFixed(2)} hours. Surface carbon is 0.80 weight percent and initial core carbon is 0.20 weight percent.`);
  }

  async function updateVisualization(options = {}) {
    if (!manifest || !mesh || !fieldRenderer) return;
    const token = ++updateToken;
    const temperature = Number(elements.temperature.value);
    const duration = Number(elements.duration.value);
    elements.temperatureOutput.textContent = `${temperature} °C`;
    elements.durationOutput.textContent = `${duration.toFixed(2)} h`;
    elements.temperature.setAttribute("aria-valuetext", `${temperature} degrees Celsius`);
    elements.duration.setAttribute("aria-valuetext", `${duration.toFixed(2)} hours`);
    const temperatureState = temperatureBracket(temperature);
    const timeState = timeBracket(duration);
    currentBracket = temperatureState;
    const missing = !chunkCache.has(temperatureState.lower) || !chunkCache.has(temperatureState.upper);
    if (missing) setStatus(`Loading FEM fields around ${temperature}°C…`);
    const lowerPromise = loadChunk(temperatureState.lower);
    const upperPromise = temperatureState.upper === temperatureState.lower
      ? lowerPromise
      : loadChunk(temperatureState.upper);
    const [lowerChunk, upperChunk] = await Promise.all([lowerPromise, upperPromise]);
    if (token !== updateToken) return;
    const values = interpolateFields(lowerChunk, upperChunk, temperatureState.weight, timeState);
    fieldRenderer.setField(values);
    updateAnalysis(temperature, duration, temperatureState, timeState);
    elements.fieldStage.dataset.state = "ready";
    elements.fieldStage.setAttribute("aria-busy", "false");
    if (options.announce) setStatus(`Showing ${temperature}°C after ${duration.toFixed(2)} h.`);
    else if (missing) setStatus("Validated FEM fields ready.");
  }

  function scheduleVisualization(options = {}) {
    window.cancelAnimationFrame(scheduledUpdate);
    scheduledUpdate = window.requestAnimationFrame(() => {
      updateVisualization(options).catch(showError);
    });
  }

  function pauseAnimation(announce = false) {
    playing = false;
    window.cancelAnimationFrame(animationFrame);
    elements.play.textContent = "Play";
    if (announce) setStatus(`Paused at ${Number(elements.duration.value).toFixed(2)} h.`);
  }

  function animate(timestamp) {
    if (!playing) return;
    if (!animationStart) animationStart = timestamp;
    const maximum = Number(elements.duration.max);
    const elapsed = timestamp - animationStart;
    const value = Math.min(maximum, animationStartHours + elapsed * maximum / 18000);
    elements.duration.value = value.toFixed(3);
    scheduleVisualization();
    if (value >= maximum) {
      pauseAnimation(true);
      return;
    }
    animationFrame = window.requestAnimationFrame(animate);
  }

  function toggleAnimation() {
    if (playing) {
      pauseAnimation(true);
      return;
    }
    if (reducedMotion.matches) {
      elements.duration.value = elements.duration.max;
      scheduleVisualization({ announce: true });
      return;
    }
    if (Number(elements.duration.value) >= Number(elements.duration.max)) elements.duration.value = "0";
    playing = true;
    animationStart = 0;
    animationStartHours = Number(elements.duration.value);
    elements.play.textContent = "Pause";
    setStatus("Animating the carburizing duration.");
    animationFrame = window.requestAnimationFrame(animate);
  }

  function showError(error) {
    pauseAnimation(false);
    setControlsEnabled(false);
    elements.fieldStage.dataset.state = "error";
    elements.fieldStage.setAttribute("aria-busy", "false");
    const loadingText = document.querySelector("#carb-loading-card span:last-child");
    if (loadingText) loadingText.textContent = "FEM data could not be loaded.";
    setStatus("The carburizing FEM dataset could not be loaded.");
    elements.summary.textContent = "The simulation is unavailable because the FEM data could not be loaded.";
    console.error("Carburizing FEM module:", error);
  }

  async function initialize() {
    setControlsEnabled(false);
    manifest = await fetchJson(manifestUrl);
    mesh = await fetchJson(new URL(manifest.mesh.url, dataRoot));
    if (!mesh.probes?.tip) throw new Error("The FEM mesh does not include profile sampling paths.");
    elements.temperature.min = manifest.controls.temperatureC.min;
    elements.temperature.max = manifest.controls.temperatureC.max;
    elements.temperature.step = manifest.controls.temperatureC.step;
    elements.temperature.value = manifest.controls.temperatureC.default;
    elements.duration.min = manifest.controls.durationHours.min;
    elements.duration.max = manifest.controls.durationHours.max;
    elements.duration.step = manifest.controls.durationHours.step;
    elements.duration.value = manifest.controls.durationHours.default;
    fieldRenderer = createFieldRenderer(elements.fieldCanvas, mesh);
    fieldRenderer.setMeshVisibility(elements.mesh.checked);
    profileRenderer = createProfileRenderer(elements.profileCanvas);
    await updateVisualization({ announce: false });
    setControlsEnabled(true);
    setStatus(fieldRenderer.mode === "canvas2d"
      ? "Validated FEM fields ready in compatibility mode."
      : "Validated FEM fields ready.");
  }

  elements.temperature.addEventListener("input", () => scheduleVisualization());
  elements.temperature.addEventListener("change", () => scheduleVisualization({ announce: true }));
  elements.duration.addEventListener("input", () => scheduleVisualization());
  elements.duration.addEventListener("change", () => scheduleVisualization({ announce: true }));
  elements.play.addEventListener("click", toggleAnimation);
  elements.reset.addEventListener("click", () => {
    pauseAnimation(false);
    elements.duration.value = "0";
    scheduleVisualization({ announce: true });
  });
  elements.mesh.addEventListener("change", () => fieldRenderer?.setMeshVisibility(elements.mesh.checked));
  elements.probe.addEventListener("change", () => scheduleVisualization({ announce: true }));
  document.addEventListener("visibilitychange", () => { if (document.hidden && playing) pauseAnimation(false); });
  if (typeof ResizeObserver === "function") new ResizeObserver(() => fieldRenderer?.draw()).observe(elements.fieldCanvas);
  else window.addEventListener("resize", () => fieldRenderer?.draw(), { passive: true });

  let initializationStarted = false;
  function beginInitialization() {
    if (initializationStarted) return;
    initializationStarted = true;
    initialize().catch(showError);
  }

  if (typeof IntersectionObserver === "function") {
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      observer.disconnect();
      beginInitialization();
    }, { rootMargin: "320px 0px" });
    observer.observe(elements.host);
  } else {
    beginInitialization();
  }
})();
