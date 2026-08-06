(() => {
  "use strict";

  const canvas = document.querySelector("#lattice-canvas");
  const frame = document.querySelector("#canvas-frame");

  if (!canvas || !frame) {
    return;
  }

  const context = canvas.getContext("2d");
  const MAX_TYPES = 4;
  const MAX_BASIS_SITES = 16;
  const SYMMETRY_TOLERANCE = 0.025;
  const MIN_VECTOR_LENGTH = 12;
  const TYPE_COLOURS = ["#c93b1f", "#386694", "#6757a8", "#b56a12"];
  const TYPE_SHAPES = ["circle", "square", "diamond", "hexagon"];

  const elements = {
    a1x: document.querySelector("#a1-x"),
    a1y: document.querySelector("#a1-y"),
    a2x: document.querySelector("#a2-x"),
    a2y: document.querySelector("#a2-y"),
    vectorMessage: document.querySelector("#vector-message"),
    typeList: document.querySelector("#type-list"),
    addType: document.querySelector("#add-type"),
    placeMode: document.querySelector("#place-mode"),
    moveMode: document.querySelector("#move-mode"),
    addOriginSite: document.querySelector("#add-origin-site"),
    basisList: document.querySelector("#basis-list"),
    basisCount: document.querySelector("#basis-count"),
    deleteSite: document.querySelector("#delete-site"),
    clearSites: document.querySelector("#clear-sites"),
    repeatA1: document.querySelector("#repeat-a1"),
    repeatA2: document.querySelector("#repeat-a2"),
    repeatA1Value: document.querySelector("#repeat-a1-value"),
    repeatA2Value: document.querySelector("#repeat-a2-value"),
    bravaisResult: document.querySelector("#bravais-result"),
    pointGroupResult: document.querySelector("#point-group-result"),
    symmetryDetail: document.querySelector("#symmetry-detail"),
    fitView: document.querySelector("#fit-view"),
    resetExample: document.querySelector("#reset-example"),
    downloadPng: document.querySelector("#download-png"),
    exportMessage: document.querySelector("#export-message"),
    canvasHelp: document.querySelector("#canvas-help"),
    screenReaderSummary: document.querySelector("#screen-reader-summary")
  };

  const state = {
    a1: { x: 130, y: 0 },
    a2: { x: 0, y: 130 },
    repeatA1: 3,
    repeatA2: 3,
    types: [
      { id: 1, name: "A", colour: TYPE_COLOURS[0], shape: TYPE_SHAPES[0] }
    ],
    basis: [
      { id: 1, typeId: 1, f: { x: 0, y: 0 } }
    ],
    activeTypeId: 1,
    selectedSiteId: 1,
    mode: "place"
  };

  let nextTypeId = 2;
  let nextSiteId = 2;
  let canvasSize = { width: 800, height: 600, dpr: 1 };
  let currentTransform = null;
  let lockedTransform = null;
  let dragState = null;

  const rootStyles = getComputedStyle(document.documentElement);
  const palette = {
    paper: readColour("--paper", "#ffffff"),
    canvas: readColour("--canvas", "#fdf6ec"),
    ink: readColour("--ink", "#2e2a74"),
    inkSoft: readColour("--ink-soft", "#554f82"),
    muted: readColour("--muted", "#69648d"),
    coral: readColour("--coral", "#c93b1f"),
    lavender: readColour("--lavender", "#6757a8"),
    blue: readColour("--blue", "#386694")
  };

  function readColour(variable, fallback) {
    return rootStyles.getPropertyValue(variable).trim() || fallback;
  }

  function resetState() {
    state.a1 = { x: 130, y: 0 };
    state.a2 = { x: 0, y: 130 };
    state.repeatA1 = 3;
    state.repeatA2 = 3;
    state.types = [
      { id: 1, name: "A", colour: TYPE_COLOURS[0], shape: TYPE_SHAPES[0] }
    ];
    state.basis = [
      { id: 1, typeId: 1, f: { x: 0, y: 0 } }
    ];
    state.activeTypeId = 1;
    state.selectedSiteId = 1;
    state.mode = "place";
    nextTypeId = 2;
    nextSiteId = 2;
    lockedTransform = null;
    renderTypeList();
    renderBasisList();
    syncControls();
    setMode("place");
    updateAnalysis();
    renderCanvas();
  }

  function syncControls() {
    elements.a1x.value = formatInputNumber(state.a1.x);
    elements.a1y.value = formatInputNumber(state.a1.y);
    elements.a2x.value = formatInputNumber(state.a2.x);
    elements.a2y.value = formatInputNumber(state.a2.y);
    elements.repeatA1.value = String(state.repeatA1);
    elements.repeatA2.value = String(state.repeatA2);
    elements.repeatA1Value.value = String(state.repeatA1);
    elements.repeatA1Value.textContent = String(state.repeatA1);
    elements.repeatA2Value.value = String(state.repeatA2);
    elements.repeatA2Value.textContent = String(state.repeatA2);
  }

  function formatInputNumber(value) {
    return String(Math.round(value * 10) / 10);
  }

  function renderTypeList() {
    elements.typeList.replaceChildren();

    state.types.forEach((type, index) => {
      const row = document.createElement("div");
      row.className = `type-row${type.id === state.activeTypeId ? " is-active" : ""}`;

      const radio = document.createElement("input");
      radio.type = "radio";
      radio.name = "active-atom-type";
      radio.value = String(type.id);
      radio.checked = type.id === state.activeTypeId;
      radio.setAttribute("aria-label", `Use atom type ${type.name || index + 1}`);
      radio.addEventListener("change", () => {
        state.activeTypeId = type.id;
        renderTypeList();
        renderCanvas();
      });

      const colour = document.createElement("input");
      colour.type = "color";
      colour.className = "type-color";
      colour.value = type.colour;
      colour.setAttribute("aria-label", `Colour for atom type ${type.name || index + 1}`);
      colour.addEventListener("input", () => {
        type.colour = colour.value;
        renderBasisList();
        renderCanvas();
      });

      const name = document.createElement("input");
      name.type = "text";
      name.className = "type-name";
      name.value = type.name;
      name.maxLength = 3;
      name.setAttribute("aria-label", `Name for atom type ${index + 1}`);
      name.addEventListener("input", () => {
        type.name = name.value.slice(0, 3);
        renderBasisList();
        updateAnalysis();
        renderCanvas();
      });
      name.addEventListener("change", () => {
        if (!type.name.trim()) {
          type.name = firstUnusedTypeName();
          name.value = type.name;
          renderBasisList();
          renderCanvas();
        }
      });

      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "remove-type";
      remove.textContent = "×";
      remove.disabled = state.types.length === 1;
      remove.setAttribute("aria-label", `Remove atom type ${type.name || index + 1}`);
      remove.addEventListener("click", () => removeType(type.id));

      row.append(radio, colour, name, remove);
      elements.typeList.append(row);
    });

    elements.addType.disabled = state.types.length >= MAX_TYPES;
    elements.addType.textContent = state.types.length >= MAX_TYPES
      ? "Four atom types added"
      : "Add atom type";
    const activeType = state.types.find((type) => type.id === state.activeTypeId);
    elements.addOriginSite.textContent = `Add ${activeType?.name || "selected type"} at origin`;
  }

  function firstUnusedTypeName() {
    const used = new Set(state.types.map((type) => type.name.toUpperCase()));
    return ["A", "B", "C", "D"].find((name) => !used.has(name)) || `T${state.types.length + 1}`;
  }

  function addType() {
    if (state.types.length >= MAX_TYPES) {
      return;
    }

    const usedColours = new Set(state.types.map((item) => item.colour.toLowerCase()));
    const availableIndex = TYPE_COLOURS.findIndex((colour) => !usedColours.has(colour.toLowerCase()));
    const index = availableIndex >= 0 ? availableIndex : state.types.length;
    const type = {
      id: nextTypeId++,
      name: firstUnusedTypeName(),
      colour: TYPE_COLOURS[index],
      shape: TYPE_SHAPES[index]
    };
    state.types.push(type);
    state.activeTypeId = type.id;
    renderTypeList();
    renderBasisList();
    updateAnalysis();
    renderCanvas();
  }

  function removeType(typeId) {
    if (state.types.length === 1) {
      return;
    }

    const type = state.types.find((item) => item.id === typeId);
    const affectedSites = state.basis.filter((site) => site.typeId === typeId).length;

    if (affectedSites > 0) {
      const confirmed = window.confirm(
        `Remove atom type ${type?.name || ""} and its ${affectedSites} basis ${affectedSites === 1 ? "site" : "sites"}?`
      );
      if (!confirmed) {
        return;
      }
    }

    state.types = state.types.filter((item) => item.id !== typeId);
    state.basis = state.basis.filter((site) => site.typeId !== typeId);
    if (state.activeTypeId === typeId) {
      state.activeTypeId = state.types[0].id;
    }
    if (!state.basis.some((site) => site.id === state.selectedSiteId)) {
      state.selectedSiteId = null;
    }
    renderTypeList();
    renderBasisList();
    updateAnalysis();
    renderCanvas();
  }

  function renderBasisList() {
    elements.basisList.replaceChildren();
    elements.basisCount.textContent = `${state.basis.length} ${state.basis.length === 1 ? "site" : "sites"}`;
    elements.deleteSite.disabled = state.selectedSiteId === null;
    elements.clearSites.disabled = state.basis.length === 0;

    if (state.basis.length === 0) {
      const empty = document.createElement("p");
      empty.className = "basis-empty";
      empty.textContent = "No basis sites yet. Choose a type and click the graphic.";
      elements.basisList.append(empty);
      return;
    }

    state.basis.forEach((site, index) => {
      const type = state.types.find((item) => item.id === site.typeId) || state.types[0];
      const row = document.createElement("div");
      row.className = `site-row${site.id === state.selectedSiteId ? " is-selected" : ""}`;
      row.dataset.siteId = String(site.id);

      const typeSelect = document.createElement("select");
      typeSelect.className = "site-type-select";
      typeSelect.setAttribute("aria-label", `Atom type for basis site ${index + 1}`);
      typeSelect.style.borderColor = type.colour;
      state.types.forEach((candidate) => {
        const option = document.createElement("option");
        option.value = String(candidate.id);
        option.textContent = candidate.name || "?";
        option.selected = candidate.id === site.typeId;
        typeSelect.append(option);
      });
      typeSelect.addEventListener("change", () => {
        site.typeId = Number(typeSelect.value);
        state.selectedSiteId = site.id;
        renderBasisList();
        updateAnalysis();
        renderCanvas();
      });

      const f1 = createSiteCoordinate(site, "x", "u", index);
      const f2 = createSiteCoordinate(site, "y", "v", index);

      const select = document.createElement("button");
      select.type = "button";
      select.className = "select-site";
      select.textContent = "Pick";
      select.setAttribute("aria-label", `Select basis site ${index + 1}`);
      select.addEventListener("click", () => {
        state.selectedSiteId = site.id;
        setMode("move");
        renderBasisList();
        renderCanvas();
      });

      row.append(typeSelect, f1, f2, select);
      elements.basisList.append(row);
    });
  }

  function createSiteCoordinate(site, component, labelText, index) {
    const wrapper = document.createElement("label");
    wrapper.className = "site-field";

    const label = document.createElement("span");
    label.textContent = labelText;

    const input = document.createElement("input");
    input.type = "number";
    input.step = "0.05";
    input.inputMode = "decimal";
    input.className = "site-coordinate";
    input.value = formatFraction(site.f[component]);
    input.setAttribute(
      "aria-label",
      `Fractional ${labelText} coordinate for basis site ${index + 1}`
    );
    input.addEventListener("input", () => {
      const value = Number(input.value);
      if (!Number.isFinite(value)) {
        return;
      }
      site.f[component] = clamp(value, -4, 4);
      state.selectedSiteId = site.id;
      updateAnalysis();
      renderCanvas();
    });
    input.addEventListener("change", () => {
      input.value = formatFraction(site.f[component]);
      renderBasisList();
    });

    wrapper.append(label, input);
    return wrapper;
  }

  function formatFraction(value) {
    return String(Math.round(value * 1000) / 1000);
  }

  function syncBasisInputs() {
    state.basis.forEach((site) => {
      const row = elements.basisList.querySelector(`[data-site-id="${site.id}"]`);
      if (!row) {
        return;
      }
      const inputs = row.querySelectorAll(".site-coordinate");
      if (inputs[0]) {
        inputs[0].value = formatFraction(site.f.x);
      }
      if (inputs[1]) {
        inputs[1].value = formatFraction(site.f.y);
      }
    });
  }

  function setMode(mode) {
    state.mode = mode;
    const placing = mode === "place";
    elements.placeMode.classList.toggle("is-active", placing);
    elements.placeMode.setAttribute("aria-pressed", String(placing));
    elements.moveMode.classList.toggle("is-active", !placing);
    elements.moveMode.setAttribute("aria-pressed", String(!placing));
    canvas.style.cursor = placing ? "crosshair" : "default";
    elements.canvasHelp.textContent = placing
      ? "Click anywhere in the graphic to place the selected atom type. The red and blue vector tips remain draggable."
      : "Drag a central basis atom to move it, or click one to select it. Replicated atoms are display-only.";
  }

  function deleteSelectedSite() {
    if (state.selectedSiteId === null) {
      return;
    }
    state.basis = state.basis.filter((site) => site.id !== state.selectedSiteId);
    state.selectedSiteId = null;
    renderBasisList();
    updateAnalysis();
    renderCanvas();
  }

  function clearBasis() {
    state.basis = [];
    state.selectedSiteId = null;
    renderBasisList();
    updateAnalysis();
    renderCanvas();
  }

  function addBasisSiteAt(fractional) {
    if (!validateCell().valid || state.basis.length >= MAX_BASIS_SITES) {
      elements.canvasHelp.textContent = state.basis.length >= MAX_BASIS_SITES
        ? `The basis is limited to ${MAX_BASIS_SITES} sites for this activity.`
        : "Create a valid two-dimensional unit cell before placing a basis atom.";
      return null;
    }

    const site = {
      id: nextSiteId++,
      typeId: state.activeTypeId,
      f: { x: fractional.x, y: fractional.y }
    };
    state.basis.push(site);
    state.selectedSiteId = site.id;
    renderBasisList();
    updateAnalysis();
    renderCanvas();

    const type = state.types.find((item) => item.id === state.activeTypeId);
    elements.canvasHelp.textContent =
      `Placed ${type?.name || "atom"} at fractional position ` +
      `(${formatFraction(site.f.x)}, ${formatFraction(site.f.y)}).`;
    return site;
  }

  function readVectorInputs() {
    const values = [
      Number(elements.a1x.value),
      Number(elements.a1y.value),
      Number(elements.a2x.value),
      Number(elements.a2y.value)
    ];

    if (!values.every(Number.isFinite)) {
      return;
    }

    state.a1 = { x: clamp(values[0], -300, 300), y: clamp(values[1], -300, 300) };
    state.a2 = { x: clamp(values[2], -300, 300), y: clamp(values[3], -300, 300) };
    lockedTransform = null;
    updateAnalysis();
    renderCanvas();
  }

  function validateCell() {
    const length1 = magnitude(state.a1);
    const length2 = magnitude(state.a2);
    if (length1 < MIN_VECTOR_LENGTH || length2 < MIN_VECTOR_LENGTH) {
      return {
        valid: false,
        message: "Each translation vector needs a visible, non-zero length."
      };
    }

    const areaRatio = Math.abs(cross(state.a1, state.a2)) / (length1 * length2);
    if (areaRatio < 0.015) {
      return {
        valid: false,
        message: "The vectors are nearly parallel. Separate them to form a two-dimensional unit cell."
      };
    }

    return { valid: true, message: "" };
  }

  function updateAnalysis() {
    const validation = validateCell();
    elements.vectorMessage.textContent = validation.message;

    if (!validation.valid) {
      elements.bravaisResult.textContent = "Not defined";
      elements.pointGroupResult.textContent = "Not defined";
      elements.symmetryDetail.textContent = "A valid pair of non-collinear translation vectors is required.";
      elements.screenReaderSummary.textContent = validation.message;
      return;
    }

    const analysis = analyseSymmetry();
    elements.bravaisResult.textContent = analysis.nonPrimitive
      ? `${analysis.bravais} (smaller primitive cell found)`
      : analysis.bravais;
    elements.pointGroupResult.textContent = analysis.pointGroup;
    elements.symmetryDetail.textContent = analysis.detail;

    const atomText = `${state.basis.length} basis ${state.basis.length === 1 ? "site" : "sites"}`;
    elements.screenReaderSummary.textContent =
      `${elements.bravaisResult.textContent} translation lattice with ${atomText}. ` +
      `Decorated point group ${analysis.pointGroup}. ${analysis.detail}`;
  }

  function analyseSymmetry() {
    const enteredReduced = gaussReduce(state.a1, state.a2);
    const enteredTolerance = SYMMETRY_TOLERANCE * Math.min(
      magnitude(enteredReduced.b1),
      magnitude(enteredReduced.b2)
    );
    const patternTranslations = findPatternTranslations(
      state.basis,
      state.a1,
      state.a2,
      enteredTolerance
    );
    const primitive = findPrimitivePatternBasis(patternTranslations, state.a1, state.a2);
    const reduced = gaussReduce(primitive.b1, primitive.b2);
    const operations = enumerateLatticeOperations(reduced.b1, reduced.b2);
    const bravais = classifyBravais(reduced.b1, reduced.b2, operations);
    const reducedBasis = state.basis.map((site) => ({
      typeId: site.typeId,
      f: cartesianToFractional(basisSiteToWorld(site), reduced.b1, reduced.b2)
    }));
    const shortest = Math.min(magnitude(reduced.b1), magnitude(reduced.b2));
    const positionTolerance = SYMMETRY_TOLERANCE * shortest;

    const patternOperations = operations.filter((operation) =>
      operationPreservesBasis(
        operation.matrix,
        reducedBasis,
        reduced.b1,
        reduced.b2,
        positionTolerance
      )
    );

    const pointGroup = pointGroupLabel(patternOperations, reduced.b1, reduced.b2);
    const detail = symmetryDescription(
      patternOperations,
      reduced.b1,
      reduced.b2,
      state.basis.length === 0,
      primitive.nonPrimitive
    );

    return { bravais, pointGroup, detail, nonPrimitive: primitive.nonPrimitive };
  }

  function findPatternTranslations(basis, b1, b2, tolerance) {
    if (basis.length === 0) {
      return [{ x: 0, y: 0 }];
    }

    const counts = new Map();
    basis.forEach((atom) => counts.set(atom.typeId, (counts.get(atom.typeId) || 0) + 1));
    const anchorType = [...counts.entries()].sort((first, second) => first[1] - second[1])[0][0];
    const source = basis.find((atom) => atom.typeId === anchorType);
    const candidateTargets = basis.filter((atom) => atom.typeId === anchorType);
    const translations = [];

    candidateTargets.forEach((target) => {
      const shift = subtract(target.f, source.f);
      const preservesPattern = [...counts.keys()].every((typeId) => {
        const original = basis.filter((atom) => atom.typeId === typeId).map((atom) => atom.f);
        const transformed = original.map((position) => add(position, shift));
        return hasPerfectPeriodicMatch(transformed, original, b1, b2, tolerance);
      });

      if (!preservesPattern) {
        return;
      }

      const wrapped = { x: moduloOne(shift.x), y: moduloOne(shift.y) };
      const duplicate = translations.some((existing) =>
        periodicCartesianDistance(subtract(wrapped, existing), b1, b2) <= tolerance
      );
      if (!duplicate) {
        translations.push(wrapped);
      }
    });

    return translations.length > 0 ? translations : [{ x: 0, y: 0 }];
  }

  function findPrimitivePatternBasis(translations, b1, b2) {
    if (translations.length <= 1) {
      return { b1, b2, nonPrimitive: false };
    }

    const enteredArea = Math.abs(cross(b1, b2));
    const targetArea = enteredArea / translations.length;
    const candidates = [];
    const duplicateTolerance = Math.sqrt(enteredArea) * 1e-5;

    translations.forEach((translation) => {
      for (let i = -1; i <= 1; i += 1) {
        for (let j = -1; j <= 1; j += 1) {
          const fractional = { x: translation.x + i, y: translation.y + j };
          const cartesian = add(scaleVector(b1, fractional.x), scaleVector(b2, fractional.y));
          if (magnitude(cartesian) <= duplicateTolerance) {
            continue;
          }
          if (!candidates.some((candidate) => distance(candidate, cartesian) <= duplicateTolerance)) {
            candidates.push(cartesian);
          }
        }
      }
    });

    let best = null;
    for (let first = 0; first < candidates.length; first += 1) {
      for (let second = first + 1; second < candidates.length; second += 1) {
        const area = Math.abs(cross(candidates[first], candidates[second]));
        if (area <= enteredArea * 1e-7) {
          continue;
        }
        const areaError = Math.abs(area - targetArea) / targetArea;
        const compactness = magnitude(candidates[first]) + magnitude(candidates[second]);
        if (
          best === null ||
          areaError < best.areaError - 1e-8 ||
          (Math.abs(areaError - best.areaError) <= 1e-8 && compactness < best.compactness)
        ) {
          best = {
            b1: candidates[first],
            b2: candidates[second],
            areaError,
            compactness
          };
        }
      }
    }

    if (!best || best.areaError > 0.08) {
      return { b1, b2, nonPrimitive: false };
    }

    return { b1: best.b1, b2: best.b2, nonPrimitive: true };
  }

  function moduloOne(value) {
    return ((value % 1) + 1) % 1;
  }

  function gaussReduce(first, second) {
    let b1 = { ...first };
    let b2 = { ...second };

    for (let iteration = 0; iteration < 30; iteration += 1) {
      if (magnitudeSquared(b2) < magnitudeSquared(b1)) {
        [b1, b2] = [b2, b1];
      }

      const denominator = magnitudeSquared(b1);
      if (denominator < 1e-9) {
        break;
      }

      const multiple = Math.round(dot(b1, b2) / denominator);
      if (multiple === 0) {
        break;
      }
      b2 = subtract(b2, scaleVector(b1, multiple));
    }

    return { b1, b2 };
  }

  function enumerateLatticeOperations(b1, b2) {
    const g11 = dot(b1, b1);
    const g12 = dot(b1, b2);
    const g22 = dot(b2, b2);
    const metricNorm = Math.sqrt(g11 * g11 + 2 * g12 * g12 + g22 * g22);
    const operations = [];

    for (let a = -2; a <= 2; a += 1) {
      for (let b = -2; b <= 2; b += 1) {
        for (let c = -2; c <= 2; c += 1) {
          for (let d = -2; d <= 2; d += 1) {
            const determinant = a * d - b * c;
            if (Math.abs(determinant) !== 1) {
              continue;
            }

            const firstImage = add(scaleVector(b1, a), scaleVector(b2, c));
            const secondImage = add(scaleVector(b1, b), scaleVector(b2, d));
            const h11 = dot(firstImage, firstImage);
            const h12 = dot(firstImage, secondImage);
            const h22 = dot(secondImage, secondImage);
            const error = Math.sqrt(
              (h11 - g11) ** 2 + 2 * (h12 - g12) ** 2 + (h22 - g22) ** 2
            ) / metricNorm;

            if (error <= SYMMETRY_TOLERANCE) {
              operations.push({
                matrix: { a, b, c, d },
                determinant,
                error
              });
            }
          }
        }
      }
    }

    return operations;
  }

  function classifyBravais(b1, b2, operations) {
    const maximumOrder = maximumRotationOrder(operations, b1, b2);
    if (maximumOrder >= 6) {
      return "Hexagonal";
    }
    if (maximumOrder >= 4) {
      return "Square";
    }

    const hasReflection = operations.some((operation) => operation.determinant < 0);
    if (!hasReflection) {
      return "Oblique";
    }

    return hasOrthogonalPrimitiveBasis(b1, b2)
      ? "Rectangular"
      : "Centered rectangular (rhombic cell)";
  }

  function hasOrthogonalPrimitiveBasis(b1, b2) {
    for (let a = -3; a <= 3; a += 1) {
      for (let b = -3; b <= 3; b += 1) {
        for (let c = -3; c <= 3; c += 1) {
          for (let d = -3; d <= 3; d += 1) {
            if (Math.abs(a * d - b * c) !== 1) {
              continue;
            }
            const first = add(scaleVector(b1, a), scaleVector(b2, c));
            const second = add(scaleVector(b1, b), scaleVector(b2, d));
            const denominator = magnitude(first) * magnitude(second);
            if (denominator > 1e-9 && Math.abs(dot(first, second)) / denominator <= SYMMETRY_TOLERANCE) {
              return true;
            }
          }
        }
      }
    }
    return false;
  }

  function operationPreservesBasis(matrix, basis, b1, b2, tolerance) {
    if (basis.length === 0) {
      return true;
    }

    const counts = new Map();
    basis.forEach((atom) => counts.set(atom.typeId, (counts.get(atom.typeId) || 0) + 1));
    const anchorType = [...counts.entries()].sort((first, second) => first[1] - second[1])[0][0];
    const source = basis.find((atom) => atom.typeId === anchorType);
    const transformedSource = applyIntegerMatrix(matrix, source.f);
    const candidateTargets = basis.filter((atom) => atom.typeId === anchorType);

    return candidateTargets.some((target) => {
      const shift = subtract(target.f, transformedSource);
      return [...counts.keys()].every((typeId) => {
        const original = basis.filter((atom) => atom.typeId === typeId).map((atom) => atom.f);
        const transformed = basis
          .filter((atom) => atom.typeId === typeId)
          .map((atom) => add(applyIntegerMatrix(matrix, atom.f), shift));
        return hasPerfectPeriodicMatch(transformed, original, b1, b2, tolerance);
      });
    });
  }

  function hasPerfectPeriodicMatch(transformed, targets, b1, b2, tolerance) {
    const adjacency = transformed.map((position) =>
      targets
        .map((target, index) => ({
          index,
          distance: periodicCartesianDistance(subtract(position, target), b1, b2)
        }))
        .filter((candidate) => candidate.distance <= tolerance)
        .map((candidate) => candidate.index)
    );

    if (adjacency.some((options) => options.length === 0)) {
      return false;
    }

    const order = adjacency
      .map((options, index) => ({ index, count: options.length }))
      .sort((first, second) => first.count - second.count)
      .map((item) => item.index);
    const used = new Set();

    function search(depth) {
      if (depth === order.length) {
        return true;
      }
      const sourceIndex = order[depth];
      return adjacency[sourceIndex].some((targetIndex) => {
        if (used.has(targetIndex)) {
          return false;
        }
        used.add(targetIndex);
        if (search(depth + 1)) {
          return true;
        }
        used.delete(targetIndex);
        return false;
      });
    }

    return search(0);
  }

  function periodicCartesianDistance(difference, b1, b2) {
    const centreX = Math.round(difference.x);
    const centreY = Math.round(difference.y);
    let best = Infinity;

    for (let i = centreX - 1; i <= centreX + 1; i += 1) {
      for (let j = centreY - 1; j <= centreY + 1; j += 1) {
        const cartesian = add(
          scaleVector(b1, difference.x - i),
          scaleVector(b2, difference.y - j)
        );
        best = Math.min(best, magnitude(cartesian));
      }
    }

    return best;
  }

  function pointGroupLabel(operations, b1, b2) {
    const order = maximumRotationOrder(operations, b1, b2);
    const hasReflection = operations.some((operation) => operation.determinant < 0);
    if (order <= 1) {
      return hasReflection ? "m" : "1";
    }
    if (!hasReflection) {
      return String(order);
    }
    return order === 3 ? "3m" : `${order}mm`;
  }

  function symmetryDescription(operations, b1, b2, basisIsEmpty, nonPrimitive) {
    const rotationOrders = new Set();
    let reflectionCount = 0;

    operations.forEach((operation) => {
      if (operation.determinant < 0) {
        reflectionCount += 1;
        return;
      }
      const order = rotationOrder(operation.matrix, b1, b2);
      if (order > 1) {
        rotationOrders.add(order);
      }
    });

    const parts = ["Translations by a₁ and a₂"];
    const sortedOrders = [...rotationOrders].sort((first, second) => second - first);
    if (sortedOrders.length > 0) {
      parts.push(`${joinWords(sortedOrders.map((order) => `${order}-fold`))} rotation${sortedOrders.length > 1 ? "s" : ""}`);
    }
    if (reflectionCount > 0) {
      parts.push(`${reflectionCount} mirror/glide ${reflectionCount === 1 ? "equivalent" : "equivalents"}`);
    }
    if (parts.length === 1) {
      parts.push("no additional point symmetry detected");
    }
    if (basisIsEmpty) {
      parts.push("the basis is empty, so this is the lattice-only result");
    }
    if (nonPrimitive) {
      parts.push("the chosen cell contains an additional basis-induced translation");
    }
    return `${parts.join("; ")}.`;
  }

  function joinWords(words) {
    if (words.length < 2) {
      return words[0] || "";
    }
    if (words.length === 2) {
      return `${words[0]} and ${words[1]}`;
    }
    return `${words.slice(0, -1).join(", ")}, and ${words.at(-1)}`;
  }

  function maximumRotationOrder(operations, b1, b2) {
    return operations.reduce((maximum, operation) => {
      if (operation.determinant < 0) {
        return maximum;
      }
      return Math.max(maximum, rotationOrder(operation.matrix, b1, b2));
    }, 1);
  }

  function rotationOrder(matrix, b1, b2) {
    const cartesian = cartesianMatrix(matrix, b1, b2);
    const angle = Math.atan2(
      cartesian.r10 - cartesian.r01,
      cartesian.r00 + cartesian.r11
    ) * 180 / Math.PI;
    const smallestAngle = Math.min(
      ((Math.abs(angle) % 360) + 360) % 360,
      360 - (((Math.abs(angle) % 360) + 360) % 360)
    );

    if (smallestAngle < 4) {
      return 1;
    }

    const candidates = [
      { order: 2, angle: 180 },
      { order: 3, angle: 120 },
      { order: 4, angle: 90 },
      { order: 6, angle: 60 }
    ];
    return candidates.sort(
      (first, second) => Math.abs(first.angle - smallestAngle) - Math.abs(second.angle - smallestAngle)
    )[0].order;
  }

  function cartesianMatrix(matrix, b1, b2) {
    const determinant = cross(b1, b2);
    const bm00 = b1.x * matrix.a + b2.x * matrix.c;
    const bm01 = b1.x * matrix.b + b2.x * matrix.d;
    const bm10 = b1.y * matrix.a + b2.y * matrix.c;
    const bm11 = b1.y * matrix.b + b2.y * matrix.d;

    return {
      r00: (bm00 * b2.y - bm01 * b1.y) / determinant,
      r01: (-bm00 * b2.x + bm01 * b1.x) / determinant,
      r10: (bm10 * b2.y - bm11 * b1.y) / determinant,
      r11: (-bm10 * b2.x + bm11 * b1.x) / determinant
    };
  }

  function applyIntegerMatrix(matrix, vector) {
    return {
      x: matrix.a * vector.x + matrix.b * vector.y,
      y: matrix.c * vector.x + matrix.d * vector.y
    };
  }

  function resizeCanvas() {
    const bounds = canvas.getBoundingClientRect();
    const width = Math.max(1, Math.round(bounds.width));
    const height = Math.max(1, Math.round(bounds.height));
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);

    if (
      canvas.width !== Math.round(width * dpr) ||
      canvas.height !== Math.round(height * dpr)
    ) {
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
    }

    canvasSize = { width, height, dpr };
    renderCanvas();
  }

  function renderCanvas() {
    context.setTransform(canvasSize.dpr, 0, 0, canvasSize.dpr, 0, 0);
    context.clearRect(0, 0, canvasSize.width, canvasSize.height);
    currentTransform = drawScene(context, canvasSize.width, canvasSize.height, {
      interactive: true,
      transform: lockedTransform
    });
  }

  function drawScene(drawingContext, width, height, options = {}) {
    const interactive = Boolean(options.interactive);
    const view = options.transform || calculateTransform(width, height);
    const uiScale = clamp(Math.min(width / 800, height / 600), 0.78, 2.2);

    drawingContext.save();
    drawingContext.fillStyle = palette.paper;
    drawingContext.fillRect(0, 0, width, height);
    drawingContext.lineCap = "round";
    drawingContext.lineJoin = "round";

    drawAxes(drawingContext, view, width, height, uiScale);
    drawLatticeGrid(drawingContext, view, uiScale);
    drawCentralCell(drawingContext, view, uiScale);
    drawRepeatedAtoms(drawingContext, view, uiScale);
    drawVectors(drawingContext, view, uiScale, interactive);

    if (interactive) {
      drawEditableBasis(drawingContext, view, uiScale);
    }

    drawLegend(drawingContext, width, height, uiScale);
    drawFigureMetrics(drawingContext, width, uiScale);
    drawingContext.restore();
    return view;
  }

  function calculateTransform(width, height) {
    const points = [{ x: 0, y: 0 }, state.a1, state.a2, add(state.a1, state.a2)];

    for (let n = -state.repeatA1; n <= state.repeatA1; n += 1) {
      for (let m = -state.repeatA2; m <= state.repeatA2; m += 1) {
        const origin = latticeTranslation(n, m);
        points.push(origin);
        state.basis.forEach((site) => points.push(add(origin, basisSiteToWorld(site))));
      }
    }

    const xValues = points.map((point) => point.x);
    const yValues = points.map((point) => point.y);
    let minX = Math.min(...xValues);
    let maxX = Math.max(...xValues);
    let minY = Math.min(...yValues);
    let maxY = Math.max(...yValues);

    if (maxX - minX < 10) {
      minX -= 5;
      maxX += 5;
    }
    if (maxY - minY < 10) {
      minY -= 5;
      maxY += 5;
    }

    const padding = clamp(Math.min(width, height) * 0.11, 34, 92);
    const scale = Math.max(
      0.03,
      Math.min(
        (width - 2 * padding) / (maxX - minX),
        (height - 2 * padding) / (maxY - minY)
      )
    );
    const centreX = (minX + maxX) / 2;
    const centreY = (minY + maxY) / 2;

    return {
      scale,
      offsetX: width / 2 - centreX * scale,
      offsetY: height / 2 + centreY * scale
    };
  }

  function drawAxes(drawingContext, view, width, height, uiScale) {
    const origin = worldToScreen({ x: 0, y: 0 }, view);
    drawingContext.save();
    drawingContext.strokeStyle = palette.canvas;
    drawingContext.lineWidth = 1.2 * uiScale;
    drawingContext.setLineDash([4 * uiScale, 7 * uiScale]);
    drawingContext.beginPath();
    drawingContext.moveTo(0, origin.y);
    drawingContext.lineTo(width, origin.y);
    drawingContext.moveTo(origin.x, 0);
    drawingContext.lineTo(origin.x, height);
    drawingContext.stroke();
    drawingContext.restore();
  }

  function drawLatticeGrid(drawingContext, view, uiScale) {
    drawingContext.save();
    drawingContext.strokeStyle = palette.ink;
    drawingContext.globalAlpha = 0.12;
    drawingContext.lineWidth = Math.max(0.8, uiScale);

    for (let m = -state.repeatA2; m <= state.repeatA2; m += 1) {
      const start = worldToScreen(latticeTranslation(-state.repeatA1, m), view);
      const end = worldToScreen(latticeTranslation(state.repeatA1, m), view);
      drawingContext.beginPath();
      drawingContext.moveTo(start.x, start.y);
      drawingContext.lineTo(end.x, end.y);
      drawingContext.stroke();
    }

    for (let n = -state.repeatA1; n <= state.repeatA1; n += 1) {
      const start = worldToScreen(latticeTranslation(n, -state.repeatA2), view);
      const end = worldToScreen(latticeTranslation(n, state.repeatA2), view);
      drawingContext.beginPath();
      drawingContext.moveTo(start.x, start.y);
      drawingContext.lineTo(end.x, end.y);
      drawingContext.stroke();
    }

    drawingContext.fillStyle = palette.ink;
    drawingContext.globalAlpha = 0.28;
    for (let n = -state.repeatA1; n <= state.repeatA1; n += 1) {
      for (let m = -state.repeatA2; m <= state.repeatA2; m += 1) {
        const point = worldToScreen(latticeTranslation(n, m), view);
        drawingContext.beginPath();
        drawingContext.arc(point.x, point.y, 2.2 * uiScale, 0, Math.PI * 2);
        drawingContext.fill();
      }
    }
    drawingContext.restore();
  }

  function drawCentralCell(drawingContext, view, uiScale) {
    const corners = [
      { x: 0, y: 0 },
      state.a1,
      add(state.a1, state.a2),
      state.a2
    ].map((point) => worldToScreen(point, view));

    drawingContext.save();
    drawingContext.beginPath();
    drawingContext.moveTo(corners[0].x, corners[0].y);
    corners.slice(1).forEach((corner) => drawingContext.lineTo(corner.x, corner.y));
    drawingContext.closePath();
    drawingContext.fillStyle = palette.lavender;
    drawingContext.globalAlpha = 0.075;
    drawingContext.fill();
    drawingContext.globalAlpha = 0.7;
    drawingContext.strokeStyle = palette.lavender;
    drawingContext.lineWidth = 2 * uiScale;
    drawingContext.setLineDash([7 * uiScale, 5 * uiScale]);
    drawingContext.stroke();
    drawingContext.restore();
  }

  function drawRepeatedAtoms(drawingContext, view, uiScale) {
    const drawn = new Set();
    const radius = 10.5 * uiScale;

    for (let n = -state.repeatA1; n <= state.repeatA1; n += 1) {
      for (let m = -state.repeatA2; m <= state.repeatA2; m += 1) {
        const translation = latticeTranslation(n, m);
        state.basis.forEach((site) => {
          const type = state.types.find((item) => item.id === site.typeId);
          if (!type) {
            return;
          }
          const world = add(translation, basisSiteToWorld(site));
          const key = `${type.id}:${Math.round(world.x * 1000)}:${Math.round(world.y * 1000)}`;
          if (drawn.has(key)) {
            return;
          }
          drawn.add(key);
          const screen = worldToScreen(world, view);
          drawAtom(drawingContext, screen.x, screen.y, radius, type, 0.83, false);
        });
      }
    }
  }

  function drawEditableBasis(drawingContext, view, uiScale) {
    state.basis.forEach((site) => {
      const type = state.types.find((item) => item.id === site.typeId);
      if (!type) {
        return;
      }
      const screen = worldToScreen(basisSiteToWorld(site), view);
      const selected = site.id === state.selectedSiteId;
      const radius = 11.5 * uiScale;

      drawingContext.save();
      drawingContext.strokeStyle = selected ? palette.coral : palette.ink;
      drawingContext.globalAlpha = selected ? 0.9 : 0.32;
      drawingContext.lineWidth = (selected ? 3 : 1.5) * uiScale;
      drawingContext.setLineDash(selected ? [] : [3 * uiScale, 4 * uiScale]);
      drawingContext.beginPath();
      drawingContext.arc(screen.x, screen.y, radius + 5 * uiScale, 0, Math.PI * 2);
      drawingContext.stroke();
      drawingContext.restore();

      drawAtom(drawingContext, screen.x, screen.y, radius, type, 1, true);
    });
  }

  function drawAtom(drawingContext, x, y, radius, type, alpha, showLabel) {
    drawingContext.save();
    drawingContext.globalAlpha = alpha;
    drawingContext.beginPath();
    atomPath(drawingContext, x, y, radius, type.shape);
    drawingContext.fillStyle = type.colour;
    drawingContext.fill();
    drawingContext.strokeStyle = palette.paper;
    drawingContext.lineWidth = Math.max(1.2, radius * 0.14);
    drawingContext.stroke();

    if (showLabel) {
      drawingContext.globalAlpha = 1;
      drawingContext.fillStyle = readableTextColour(type.colour);
      drawingContext.font = `800 ${Math.max(9, radius * 0.78)}px system-ui, sans-serif`;
      drawingContext.textAlign = "center";
      drawingContext.textBaseline = "middle";
      drawingContext.fillText(type.name || "?", x, y + 0.5);
    }
    drawingContext.restore();
  }

  function atomPath(drawingContext, x, y, radius, shape) {
    if (shape === "circle") {
      drawingContext.arc(x, y, radius, 0, Math.PI * 2);
      return;
    }

    if (shape === "square") {
      drawingContext.rect(x - radius * 0.85, y - radius * 0.85, radius * 1.7, radius * 1.7);
      return;
    }

    if (shape === "diamond") {
      drawingContext.moveTo(x, y - radius);
      drawingContext.lineTo(x + radius, y);
      drawingContext.lineTo(x, y + radius);
      drawingContext.lineTo(x - radius, y);
      drawingContext.closePath();
      return;
    }

    for (let side = 0; side < 6; side += 1) {
      const angle = Math.PI / 3 * side - Math.PI / 2;
      const pointX = x + Math.cos(angle) * radius;
      const pointY = y + Math.sin(angle) * radius;
      if (side === 0) {
        drawingContext.moveTo(pointX, pointY);
      } else {
        drawingContext.lineTo(pointX, pointY);
      }
    }
    drawingContext.closePath();
  }

  function drawVectors(drawingContext, view, uiScale, interactive) {
    const origin = worldToScreen({ x: 0, y: 0 }, view);
    drawArrow(drawingContext, origin, worldToScreen(state.a1, view), palette.coral, "a₁", uiScale, interactive);
    drawArrow(drawingContext, origin, worldToScreen(state.a2, view), palette.blue, "a₂", uiScale, interactive);

    drawingContext.save();
    drawingContext.fillStyle = palette.ink;
    drawingContext.beginPath();
    drawingContext.arc(origin.x, origin.y, 4.3 * uiScale, 0, Math.PI * 2);
    drawingContext.fill();
    drawingContext.font = `800 ${12 * uiScale}px system-ui, sans-serif`;
    drawingContext.fillText("O", origin.x + 8 * uiScale, origin.y - 8 * uiScale);
    drawingContext.restore();
  }

  function drawArrow(drawingContext, start, end, colour, label, uiScale, interactive) {
    const angle = Math.atan2(end.y - start.y, end.x - start.x);
    const headLength = 12 * uiScale;
    drawingContext.save();
    drawingContext.strokeStyle = colour;
    drawingContext.fillStyle = colour;
    drawingContext.lineWidth = 3.2 * uiScale;
    drawingContext.beginPath();
    drawingContext.moveTo(start.x, start.y);
    drawingContext.lineTo(end.x, end.y);
    drawingContext.stroke();
    drawingContext.beginPath();
    drawingContext.moveTo(end.x, end.y);
    drawingContext.lineTo(
      end.x - Math.cos(angle - Math.PI / 6) * headLength,
      end.y - Math.sin(angle - Math.PI / 6) * headLength
    );
    drawingContext.lineTo(
      end.x - Math.cos(angle + Math.PI / 6) * headLength,
      end.y - Math.sin(angle + Math.PI / 6) * headLength
    );
    drawingContext.closePath();
    drawingContext.fill();

    if (interactive) {
      drawingContext.fillStyle = palette.paper;
      drawingContext.strokeStyle = colour;
      drawingContext.lineWidth = 3 * uiScale;
      drawingContext.beginPath();
      drawingContext.arc(end.x, end.y, 8 * uiScale, 0, Math.PI * 2);
      drawingContext.fill();
      drawingContext.stroke();
    }

    drawingContext.fillStyle = colour;
    drawingContext.font = `900 ${14 * uiScale}px system-ui, sans-serif`;
    drawingContext.textAlign = "center";
    drawingContext.textBaseline = "middle";
    drawingContext.fillText(
      label,
      end.x + Math.cos(angle) * 17 * uiScale,
      end.y + Math.sin(angle) * 17 * uiScale
    );
    drawingContext.restore();
  }

  function drawLegend(drawingContext, width, height, uiScale) {
    if (state.types.length === 0) {
      return;
    }

    const itemWidth = 78 * uiScale;
    const legendWidth = Math.min(width - 24 * uiScale, state.types.length * itemWidth + 18 * uiScale);
    const legendHeight = 38 * uiScale;
    const left = 12 * uiScale;
    const top = height - legendHeight - 12 * uiScale;

    drawingContext.save();
    drawingContext.globalAlpha = 0.9;
    drawingContext.fillStyle = palette.paper;
    roundedRectangle(drawingContext, left, top, legendWidth, legendHeight, 10 * uiScale);
    drawingContext.fill();
    drawingContext.globalAlpha = 1;

    state.types.forEach((type, index) => {
      const x = left + 18 * uiScale + index * itemWidth;
      const y = top + legendHeight / 2;
      drawAtom(drawingContext, x, y, 7 * uiScale, type, 1, false);
      drawingContext.fillStyle = palette.ink;
      drawingContext.font = `800 ${11 * uiScale}px system-ui, sans-serif`;
      drawingContext.textAlign = "left";
      drawingContext.textBaseline = "middle";
      drawingContext.fillText(type.name || "?", x + 12 * uiScale, y);
    });
    drawingContext.restore();
  }

  function drawFigureMetrics(drawingContext, width, uiScale) {
    const validation = validateCell();
    const length1 = magnitude(state.a1);
    const length2 = magnitude(state.a2);
    const angle = validation.valid ? angleBetween(state.a1, state.a2) : null;
    const text = validation.valid
      ? `|a₁| ${length1.toFixed(1)}   |a₂| ${length2.toFixed(1)}   θ ${angle.toFixed(1)}°`
      : "Adjust the vectors to form a valid 2D cell";

    drawingContext.save();
    drawingContext.font = `800 ${11 * uiScale}px system-ui, sans-serif`;
    const measured = drawingContext.measureText(text).width;
    const boxWidth = measured + 20 * uiScale;
    const boxHeight = 30 * uiScale;
    const left = width - boxWidth - 12 * uiScale;
    const top = 12 * uiScale;
    drawingContext.globalAlpha = 0.9;
    drawingContext.fillStyle = palette.paper;
    roundedRectangle(drawingContext, left, top, boxWidth, boxHeight, 9 * uiScale);
    drawingContext.fill();
    drawingContext.globalAlpha = 1;
    drawingContext.fillStyle = validation.valid ? palette.ink : palette.coral;
    drawingContext.textAlign = "center";
    drawingContext.textBaseline = "middle";
    drawingContext.fillText(text, left + boxWidth / 2, top + boxHeight / 2);
    drawingContext.restore();
  }

  function roundedRectangle(drawingContext, x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    drawingContext.beginPath();
    drawingContext.moveTo(x + r, y);
    drawingContext.lineTo(x + width - r, y);
    drawingContext.quadraticCurveTo(x + width, y, x + width, y + r);
    drawingContext.lineTo(x + width, y + height - r);
    drawingContext.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
    drawingContext.lineTo(x + r, y + height);
    drawingContext.quadraticCurveTo(x, y + height, x, y + height - r);
    drawingContext.lineTo(x, y + r);
    drawingContext.quadraticCurveTo(x, y, x + r, y);
    drawingContext.closePath();
  }

  function readableTextColour(hexColour) {
    const hex = hexColour.replace("#", "");
    const value = hex.length === 3
      ? hex.split("").map((character) => character + character).join("")
      : hex;
    const red = Number.parseInt(value.slice(0, 2), 16);
    const green = Number.parseInt(value.slice(2, 4), 16);
    const blue = Number.parseInt(value.slice(4, 6), 16);
    const luminance = (0.299 * red + 0.587 * green + 0.114 * blue) / 255;
    return luminance > 0.62 ? palette.ink : palette.paper;
  }

  function pointerPosition(event) {
    const bounds = canvas.getBoundingClientRect();
    return {
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top
    };
  }

  function hitVectorHandle(point) {
    if (!currentTransform) {
      return null;
    }
    const endpoint1 = worldToScreen(state.a1, currentTransform);
    const endpoint2 = worldToScreen(state.a2, currentTransform);
    if (distance(point, endpoint1) <= 18) {
      return 1;
    }
    if (distance(point, endpoint2) <= 18) {
      return 2;
    }
    return null;
  }

  function hitBasisSite(point) {
    if (!currentTransform) {
      return null;
    }
    for (let index = state.basis.length - 1; index >= 0; index -= 1) {
      const site = state.basis[index];
      const screen = worldToScreen(basisSiteToWorld(site), currentTransform);
      if (distance(point, screen) <= 20) {
        return site;
      }
    }
    return null;
  }

  function beginDrag(event, kind, target) {
    dragState = { kind, target, pointerId: event.pointerId };
    lockedTransform = { ...currentTransform };
    canvas.setPointerCapture(event.pointerId);
    event.preventDefault();
  }

  function handlePointerDown(event) {
    const point = pointerPosition(event);
    const vector = hitVectorHandle(point);
    if (vector !== null) {
      beginDrag(event, "vector", vector);
      return;
    }

    if (state.mode === "move") {
      const site = hitBasisSite(point);
      if (site) {
        state.selectedSiteId = site.id;
        renderBasisList();
        beginDrag(event, "site", site.id);
        renderCanvas();
      } else {
        state.selectedSiteId = null;
        renderBasisList();
        renderCanvas();
      }
      return;
    }

    const world = screenToWorld(point, currentTransform);
    const fractional = cartesianToFractional(world, state.a1, state.a2);
    addBasisSiteAt(fractional);
  }

  function handlePointerMove(event) {
    const point = pointerPosition(event);

    if (!dragState) {
      const vector = hitVectorHandle(point);
      const site = state.mode === "move" ? hitBasisSite(point) : null;
      canvas.style.cursor = vector !== null || site ? "grab" : state.mode === "place" ? "crosshair" : "default";
      return;
    }

    if (event.pointerId !== dragState.pointerId) {
      return;
    }

    const world = screenToWorld(point, lockedTransform);
    if (dragState.kind === "vector") {
      if (magnitude(world) >= 4) {
        if (dragState.target === 1) {
          state.a1 = world;
        } else {
          state.a2 = world;
        }
        syncControls();
      }
    } else {
      const site = state.basis.find((item) => item.id === dragState.target);
      if (site && Math.abs(cross(state.a1, state.a2)) > 1e-9) {
        site.f = cartesianToFractional(world, state.a1, state.a2);
        syncBasisInputs();
      }
    }

    updateAnalysis();
    renderCanvas();
    event.preventDefault();
  }

  function handlePointerUp(event) {
    if (!dragState || event.pointerId !== dragState.pointerId) {
      return;
    }

    if (canvas.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId);
    }
    dragState = null;
    lockedTransform = null;
    syncControls();
    syncBasisInputs();
    updateAnalysis();
    renderCanvas();
  }

  function downloadFigure() {
    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = 1800;
    exportCanvas.height = 1350;
    const exportContext = exportCanvas.getContext("2d");
    elements.downloadPng.disabled = true;
    elements.downloadPng.textContent = "Preparing PNG…";
    elements.exportMessage.textContent = "";

    drawScene(exportContext, exportCanvas.width, exportCanvas.height, { interactive: false });

    exportCanvas.toBlob((blob) => {
      if (!blob) {
        elements.exportMessage.textContent = "The PNG could not be created in this browser.";
        elements.downloadPng.disabled = false;
        elements.downloadPng.textContent = "Download current figure as PNG";
        return;
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "mse-2d-lattice.png";
      document.body.append(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      elements.exportMessage.textContent = "PNG downloaded at 1800 × 1350 pixels.";
      elements.downloadPng.disabled = false;
      elements.downloadPng.textContent = "Download current figure as PNG";
    }, "image/png");
  }

  function basisSiteToWorld(site) {
    return add(scaleVector(state.a1, site.f.x), scaleVector(state.a2, site.f.y));
  }

  function latticeTranslation(n, m) {
    return add(scaleVector(state.a1, n), scaleVector(state.a2, m));
  }

  function worldToScreen(point, transform) {
    return {
      x: transform.offsetX + point.x * transform.scale,
      y: transform.offsetY - point.y * transform.scale
    };
  }

  function screenToWorld(point, transform) {
    return {
      x: (point.x - transform.offsetX) / transform.scale,
      y: (transform.offsetY - point.y) / transform.scale
    };
  }

  function cartesianToFractional(point, b1, b2) {
    const determinant = cross(b1, b2);
    return {
      x: (point.x * b2.y - point.y * b2.x) / determinant,
      y: (-point.x * b1.y + point.y * b1.x) / determinant
    };
  }

  function angleBetween(first, second) {
    const cosine = clamp(dot(first, second) / (magnitude(first) * magnitude(second)), -1, 1);
    return Math.acos(cosine) * 180 / Math.PI;
  }

  function add(first, second) {
    return { x: first.x + second.x, y: first.y + second.y };
  }

  function subtract(first, second) {
    return { x: first.x - second.x, y: first.y - second.y };
  }

  function scaleVector(vector, scalar) {
    return { x: vector.x * scalar, y: vector.y * scalar };
  }

  function dot(first, second) {
    return first.x * second.x + first.y * second.y;
  }

  function cross(first, second) {
    return first.x * second.y - first.y * second.x;
  }

  function magnitudeSquared(vector) {
    return dot(vector, vector);
  }

  function magnitude(vector) {
    return Math.sqrt(magnitudeSquared(vector));
  }

  function distance(first, second) {
    return magnitude(subtract(first, second));
  }

  function clamp(value, minimum, maximum) {
    return Math.min(maximum, Math.max(minimum, value));
  }

  [elements.a1x, elements.a1y, elements.a2x, elements.a2y].forEach((input) => {
    input.addEventListener("input", readVectorInputs);
    input.addEventListener("change", () => {
      readVectorInputs();
      syncControls();
    });
  });

  elements.addType.addEventListener("click", addType);
  elements.placeMode.addEventListener("click", () => setMode("place"));
  elements.moveMode.addEventListener("click", () => setMode("move"));
  elements.addOriginSite.addEventListener("click", () => addBasisSiteAt({ x: 0, y: 0 }));
  elements.deleteSite.addEventListener("click", deleteSelectedSite);
  elements.clearSites.addEventListener("click", clearBasis);

  elements.repeatA1.addEventListener("input", () => {
    state.repeatA1 = Number(elements.repeatA1.value);
    elements.repeatA1Value.value = String(state.repeatA1);
    elements.repeatA1Value.textContent = String(state.repeatA1);
    lockedTransform = null;
    renderCanvas();
  });

  elements.repeatA2.addEventListener("input", () => {
    state.repeatA2 = Number(elements.repeatA2.value);
    elements.repeatA2Value.value = String(state.repeatA2);
    elements.repeatA2Value.textContent = String(state.repeatA2);
    lockedTransform = null;
    renderCanvas();
  });

  elements.fitView.addEventListener("click", () => {
    lockedTransform = null;
    renderCanvas();
  });
  elements.resetExample.addEventListener("click", resetState);
  elements.downloadPng.addEventListener("click", downloadFigure);

  canvas.addEventListener("pointerdown", handlePointerDown);
  canvas.addEventListener("pointermove", handlePointerMove);
  canvas.addEventListener("pointerup", handlePointerUp);
  canvas.addEventListener("pointercancel", handlePointerUp);
  canvas.addEventListener("contextmenu", (event) => event.preventDefault());

  const resizeObserver = new ResizeObserver(resizeCanvas);
  resizeObserver.observe(frame);

  renderTypeList();
  renderBasisList();
  syncControls();
  setMode("place");
  updateAnalysis();
  requestAnimationFrame(resizeCanvas);
})();
