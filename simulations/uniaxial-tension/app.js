(function initializeTensionLab(globalObject) {
  "use strict";

  const MATERIALS = {
    "mild-steel": {
      id: "mild-steel",
      name: "ASTM A36 mild steel",
      shortName: "A36 mild steel",
      family: "ductile-metal",
      model: "mild-steel",
      colors: ["#566776", "#d6dee3", "#384651"],
      geometry: {
        standard: "ASTM E8/E8M subsize, flat",
        overallLength: 100,
        gaugeLength: 25,
        reducedLength: 32,
        gripWidth: 10,
        narrowWidth: 6,
        thickness: 3,
        shape: "flat",
        summary: "100 × 10 × 3 mm; 25 mm gauge; 6 mm reduced width"
      },
      rate: {
        minimum: 0.1,
        maximum: 10,
        step: 0.025,
        defaultValue: 0.375,
        guidance: "Illustrative quasi-static metal rate"
      },
      properties: {
        modulus: 200000,
        yieldStress: 250,
        yieldStrain: 0.00125,
        plateauEnd: 0.018,
        ultimateStress: 475,
        uniformStrain: 0.14,
        fractureStrain: 0.21,
        fractureStress: 330
      },
      sequence: "Elastic → yield → hardening → necking → fracture",
      note: "A36 is a product specification with property ranges. This preset uses the 250 MPa minimum yield strength, a 475 MPa tensile value within the published range, and 21% fracture elongation for a representative teaching curve."
    },
    copper: {
      id: "copper",
      name: "Annealed C11000 copper",
      shortName: "Annealed C11000 copper",
      family: "ductile-metal",
      model: "copper",
      colors: ["#8b4b29", "#e5a477", "#63301b"],
      geometry: {
        standard: "ASTM E8/E8M subsize, flat",
        overallLength: 100,
        gaugeLength: 25,
        reducedLength: 32,
        gripWidth: 10,
        narrowWidth: 6,
        thickness: 3,
        shape: "flat",
        summary: "100 × 10 × 3 mm; 25 mm gauge; 6 mm reduced width"
      },
      rate: {
        minimum: 0.1,
        maximum: 10,
        step: 0.025,
        defaultValue: 0.375,
        guidance: "Illustrative quasi-static metal rate"
      },
      properties: {
        modulus: 117000,
        proportionalStrain: 0.00035,
        yieldStress: 69,
        yieldStrain: 0.005,
        ultimateStress: 221,
        uniformStrain: 0.35,
        fractureStrain: 0.5,
        fractureStress: 165
      },
      sequence: "Elastic → smooth yield → hardening → necking → fracture",
      note: "This preset represents annealed C11000 ETP copper in the OS050 condition. The 69 MPa value is yield strength measured at 0.5% extension, not a 0.2% offset proof stress."
    },
    "high-speed-steel": {
      id: "high-speed-steel",
      name: "M2 high-speed steel — heat-treated",
      shortName: "Heat-treated M2 HSS",
      family: "limited-ductility-metal",
      model: "high-speed-steel",
      colors: ["#48525d", "#c4ccd3", "#2b343d"],
      geometry: {
        standard: "ASTM E8/E8M subsize, flat",
        overallLength: 100,
        gaugeLength: 25,
        reducedLength: 32,
        gripWidth: 10,
        narrowWidth: 6,
        thickness: 3,
        shape: "flat",
        summary: "100 × 10 × 3 mm; 25 mm gauge; 6 mm reduced width"
      },
      rate: {
        minimum: 0.1,
        maximum: 10,
        step: 0.025,
        defaultValue: 0.375,
        guidance: "Illustrative quasi-static metal rate"
      },
      properties: {
        modulus: 219000,
        yieldStress: 1263,
        yieldStrain: 0.005767,
        ultimateStress: 1647,
        uniformStrain: 0.012,
        fractureStrain: 0.015,
        fractureStress: 1510
      },
      sequence: "Elastic → short hardening interval → brief localization → fracture",
      note: "M2 properties vary strongly with processing and heat treatment. This illustrative preset combines Sandvik heat-treated M2 strength and 1.5% elongation with the 219 GPa modulus of M2-equivalent Böhler S600; it is not a generic value for every high-speed steel."
    },
    alumina: {
      id: "alumina",
      name: "AD-995 alumina ceramic",
      shortName: "99.5% alumina",
      family: "brittle-ceramic",
      model: "alumina",
      colors: ["#c8beb4", "#fffdf9", "#978b81"],
      geometry: {
        standard: "ASTM C1273-inspired button-head",
        overallLength: 160,
        gaugeLength: 35,
        reducedLength: 35,
        gripWidth: 18,
        narrowWidth: 6.35,
        diameter: 6.35,
        shape: "round",
        summary: "160 mm overall; 35 mm gauge; 6.35 mm gauge diameter"
      },
      rate: {
        minimum: 0.05,
        maximum: 1,
        step: 0.01,
        defaultValue: 0.35,
        guidance: "Derived illustrative ceramic rate"
      },
      properties: {
        modulus: 370000,
        yieldStress: null,
        yieldStrain: null,
        ultimateStress: 262,
        uniformStrain: 0.0007081,
        fractureStrain: 0.0007081,
        fractureStress: 262
      },
      sequence: "Linear elastic deformation → sudden brittle fracture",
      note: "Ceramic tensile strength depends strongly on flaws, surface finish, stressed volume, alignment, and environment. This sample fractures elastically without a fictitious plastic neck."
    },
    polycarbonate: {
      id: "polycarbonate",
      name: "Makrolon 2405 polycarbonate",
      shortName: "Polycarbonate",
      family: "polymer",
      model: "polycarbonate",
      colors: ["#345f8c", "#8eb9dc", "#244562"],
      geometry: {
        standard: "ASTM D638 Type I",
        overallLength: 165,
        gaugeLength: 50,
        reducedLength: 57,
        gripWidth: 19,
        narrowWidth: 13,
        thickness: 3.2,
        shape: "flat",
        summary: "165 × 19 × 3.2 mm; 50 mm gauge; 13 mm narrow width"
      },
      rate: {
        minimum: 1,
        maximum: 500,
        step: 1,
        defaultValue: 5,
        guidance: "D638 Type I teaching preset; properties are rate-sensitive"
      },
      properties: {
        modulus: 2400,
        yieldStress: 65,
        yieldStrain: 0.06,
        ultimateStress: 65,
        uniformStrain: 0.06,
        fractureStrain: 1.25,
        fractureStress: 65
      },
      sequence: "Nonlinear loading → upper yield → cold drawing → orientation hardening → fracture",
      note: "Polycarbonate is rate- and temperature-sensitive. The reference data were measured at specified datasheet rates; changing the rate here changes calculated elapsed time, not the idealized curve shape."
    }
  };

  function clamp(value, minimum, maximum) {
    return Math.min(maximum, Math.max(minimum, value));
  }

  function interpolate(start, end, fraction) {
    return start + (end - start) * fraction;
  }

  function smoothStep(fraction) {
    const bounded = clamp(fraction, 0, 1);
    return bounded * bounded * (3 - 2 * bounded);
  }

  // These paired quadratic easings make the metal curve C1-continuous at
  // UTS: the hardening slope approaches zero from the left, and the necking
  // slope leaves zero on the right. Published endpoint values stay unchanged.
  function approachPeak(fraction) {
    const bounded = clamp(fraction, 0, 1);
    return bounded * (2 - bounded);
  }

  function leavePeak(fraction) {
    const bounded = clamp(fraction, 0, 1);
    return bounded * bounded;
  }

  function areaFor(material) {
    const geometry = material.geometry;
    if (geometry.shape === "round") {
      return Math.PI * geometry.diameter * geometry.diameter / 4;
    }
    return geometry.narrowWidth * geometry.thickness;
  }

  function stressAt(materialOrId, inputStrain) {
    const material = typeof materialOrId === "string" ? MATERIALS[materialOrId] : materialOrId;
    if (!material) {
      throw new Error("Unknown material preset.");
    }

    const properties = material.properties;
    const strain = clamp(inputStrain, 0, properties.fractureStrain);

    if (material.model === "alumina") {
      return Math.min(properties.ultimateStress, properties.modulus * strain);
    }

    if (material.model === "mild-steel") {
      if (strain <= properties.yieldStrain) {
        return properties.modulus * strain;
      }
      if (strain <= properties.plateauEnd) {
        const fraction = (strain - properties.yieldStrain) / (properties.plateauEnd - properties.yieldStrain);
        return interpolate(properties.yieldStress, 240, smoothStep(fraction));
      }
      if (strain <= properties.uniformStrain) {
        const fraction = (strain - properties.plateauEnd) / (properties.uniformStrain - properties.plateauEnd);
        return interpolate(240, properties.ultimateStress, approachPeak(fraction));
      }
      const fraction = (strain - properties.uniformStrain) / (properties.fractureStrain - properties.uniformStrain);
      return interpolate(properties.ultimateStress, properties.fractureStress, leavePeak(fraction));
    }

    if (material.model === "copper") {
      if (strain <= properties.proportionalStrain) {
        return properties.modulus * strain;
      }
      const proportionalStress = properties.modulus * properties.proportionalStrain;
      if (strain <= properties.yieldStrain) {
        const fraction = (strain - properties.proportionalStrain) / (properties.yieldStrain - properties.proportionalStrain);
        return interpolate(proportionalStress, properties.yieldStress, Math.pow(fraction, 0.68));
      }
      if (strain <= properties.uniformStrain) {
        const fraction = (strain - properties.yieldStrain) / (properties.uniformStrain - properties.yieldStrain);
        return interpolate(properties.yieldStress, properties.ultimateStress, approachPeak(fraction));
      }
      const fraction = (strain - properties.uniformStrain) / (properties.fractureStrain - properties.uniformStrain);
      return interpolate(properties.ultimateStress, properties.fractureStress, leavePeak(fraction));
    }

    if (material.model === "high-speed-steel") {
      if (strain <= properties.yieldStrain) {
        return properties.modulus * strain;
      }
      if (strain <= properties.uniformStrain) {
        const fraction = (strain - properties.yieldStrain) / (properties.uniformStrain - properties.yieldStrain);
        return interpolate(properties.yieldStress, properties.ultimateStress, approachPeak(fraction));
      }
      const fraction = (strain - properties.uniformStrain) / (properties.fractureStrain - properties.uniformStrain);
      return interpolate(properties.ultimateStress, properties.fractureStress, leavePeak(fraction));
    }

    if (material.model === "polycarbonate") {
      if (strain <= 0.012) {
        const fraction = strain / 0.012;
        return properties.modulus * strain * (1 - 0.12 * fraction);
      }
      const firstStress = properties.modulus * 0.012 * 0.88;
      if (strain <= properties.yieldStrain) {
        const fraction = (strain - 0.012) / (properties.yieldStrain - 0.012);
        return interpolate(firstStress, properties.yieldStress, smoothStep(fraction));
      }
      if (strain <= 0.15) {
        const fraction = (strain - properties.yieldStrain) / (0.15 - properties.yieldStrain);
        return interpolate(properties.yieldStress, 50, smoothStep(fraction));
      }
      if (strain <= 0.85) {
        const fraction = (strain - 0.15) / (0.85 - 0.15);
        return interpolate(50, 55, Math.pow(fraction, 0.8));
      }
      const fraction = (strain - 0.85) / (properties.fractureStrain - 0.85);
      return interpolate(55, properties.fractureStress, Math.pow(fraction, 1.35));
    }

    return 0;
  }

  function stageAt(materialOrId, inputStrain, fractured) {
    const material = typeof materialOrId === "string" ? MATERIALS[materialOrId] : materialOrId;
    const strain = Math.max(0, inputStrain);
    if (fractured) {
      return "Fractured";
    }
    if (strain <= 0) {
      return "Loaded";
    }
    if (material.model === "alumina") {
      return "Elastic — brittle";
    }
    if (material.model === "polycarbonate") {
      if (strain < 0.012) {
        return "Viscoelastic loading";
      }
      if (strain < material.properties.yieldStrain) {
        return "Nonlinear — uniform";
      }
      if (strain < 0.15) {
        return "Yield & neck formation";
      }
      if (strain < 0.85) {
        return "Cold drawing";
      }
      return "Orientation hardening";
    }
    if (strain < material.properties.yieldStrain) {
      return "Elastic — uniform";
    }
    if (material.model === "mild-steel" && strain < material.properties.plateauEnd) {
      return "Yielding — uniform";
    }
    if (strain < material.properties.uniformStrain) {
      return "Strain hardening — uniform";
    }
    if (material.model === "high-speed-steel") {
      return "Brief localization";
    }
    return "Necking";
  }

  function readingAt(materialOrId, progress, rateMillimetresPerMinute, fractured) {
    const material = typeof materialOrId === "string" ? MATERIALS[materialOrId] : materialOrId;
    const boundedProgress = clamp(progress, 0, 1);
    const strain = material.properties.fractureStrain * boundedProgress;
    const extension = strain * material.geometry.gaugeLength;
    const stress = stressAt(material, strain);
    const loadKilonewtons = stress * areaFor(material) / 1000;
    const timeSeconds = rateMillimetresPerMinute > 0
      ? extension / rateMillimetresPerMinute * 60
      : 0;
    return {
      progress: boundedProgress,
      strain,
      extension,
      stress,
      loadKilonewtons,
      timeSeconds,
      stage: stageAt(material, strain, Boolean(fractured))
    };
  }

  function playbackSeconds(material, rateMillimetresPerMinute) {
    const ratio = material.rate.defaultValue / rateMillimetresPerMinute;
    return clamp(14 * Math.sqrt(ratio), 8, 24);
  }

  function toughnessFor(materialOrId, intervals) {
    const material = typeof materialOrId === "string" ? MATERIALS[materialOrId] : materialOrId;
    const segmentCount = Math.max(100, Math.floor(intervals || 12000));
    const strainStep = material.properties.fractureStrain / segmentCount;
    let area = 0;
    let previousStress = stressAt(material, 0);
    for (let index = 1; index <= segmentCount; index += 1) {
      const stress = stressAt(material, strainStep * index);
      area += (previousStress + stress) * 0.5 * strainStep;
      previousStress = stress;
    }
    // MPa multiplied by strain is numerically equal to MJ/m^3.
    return area;
  }

  function initialRegionEndStrain(material) {
    if (material.model === "copper") {
      return material.properties.proportionalStrain;
    }
    if (material.model === "polycarbonate") {
      return 0.012;
    }
    return material.properties.yieldStrain === null
      ? material.properties.fractureStrain
      : material.properties.yieldStrain;
  }

  function resilienceLimitStrain(material) {
    if (material.model === "copper") {
      return material.properties.proportionalStrain;
    }
    return material.properties.yieldStrain === null
      ? material.properties.fractureStrain
      : material.properties.yieldStrain;
  }

  function calculationDataset(materialOrId, rateMillimetresPerMinute) {
    const material = typeof materialOrId === "string" ? MATERIALS[materialOrId] : materialOrId;
    const properties = material.properties;
    const rate = rateMillimetresPerMinute || material.rate.defaultValue;
    const initialEnd = initialRegionEndStrain(material);
    const resilienceLimit = resilienceLimitStrain(material);
    const strains = [0, properties.fractureStrain, properties.uniformStrain, resilienceLimit, initialEnd];

    for (let index = 0; index <= 24; index += 1) {
      strains.push(properties.fractureStrain * index / 24);
    }
    [0.1, 0.25, 0.5].forEach((fraction) => strains.push(initialEnd * fraction));

    if (properties.proportionalStrain) {
      strains.push(properties.proportionalStrain);
    }
    if (properties.yieldStrain !== null) {
      strains.push(properties.yieldStrain);
    }
    if (properties.plateauEnd) {
      strains.push(properties.plateauEnd);
    }
    if (material.model === "polycarbonate") {
      strains.push(0.012, 0.15, 0.85);
    }

    const sortedStrains = strains
      .filter((strain) => Number.isFinite(strain) && strain >= 0 && strain <= properties.fractureStrain)
      .sort((first, second) => first - second)
      .filter((strain, index, values) => index === 0 || Math.abs(strain - values[index - 1]) > properties.fractureStrain * 1e-10);

    const closeTo = (first, second) => Math.abs(first - second) <= Math.max(properties.fractureStrain * 1e-9, 1e-12);
    return sortedStrains.map((strain) => {
      const atFracture = closeTo(strain, properties.fractureStrain);
      const reading = readingAt(material, strain / properties.fractureStrain, rate, atFracture);
      let point = "Curve sample";
      if (closeTo(strain, 0)) {
        point = "Zero";
      } else if (atFracture && closeTo(strain, properties.uniformStrain)) {
        point = "UTS / fracture";
      } else if (atFracture) {
        point = "Fracture";
      } else if (closeTo(strain, properties.uniformStrain) && closeTo(strain, resilienceLimit)) {
        point = "UTS / yield";
      } else if (closeTo(strain, properties.uniformStrain)) {
        point = "UTS";
      } else if (closeTo(strain, resilienceLimit)) {
        point = material.model === "copper" ? "Proportional limit" : "Elastic limit / yield";
      } else if (closeTo(strain, initialEnd)) {
        point = "Initial-region limit";
      } else if (strain < initialEnd) {
        point = "Initial-region sample";
      }
      return { ...reading, point };
    });
  }

  function integrateDataset(dataset, maximumStrain) {
    let area = 0;
    for (let index = 1; index < dataset.length; index += 1) {
      const previous = dataset[index - 1];
      const current = dataset[index];
      if (current.strain > maximumStrain + 1e-12) {
        break;
      }
      area += (previous.stress + current.stress) * 0.5 * (current.strain - previous.strain);
    }
    return area;
  }

  function calculationTargets(materialOrId, rateMillimetresPerMinute) {
    const material = typeof materialOrId === "string" ? MATERIALS[materialOrId] : materialOrId;
    const dataset = calculationDataset(material, rateMillimetresPerMinute);
    const first = dataset[0];
    const second = dataset.find((reading) => reading.strain > 0);
    return {
      modulus: (second.stress - first.stress) / (second.strain - first.strain) / 1000,
      ultimate: Math.max(...dataset.map((reading) => reading.stress)),
      resilience: integrateDataset(dataset, resilienceLimitStrain(material)),
      toughness: integrateDataset(dataset, material.properties.fractureStrain)
    };
  }

  const PLAYBACK_SPEEDS = Object.freeze([0.01, 0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10]);

  const publicModel = Object.freeze({
    materials: MATERIALS,
    areaFor,
    stressAt,
    stageAt,
    readingAt,
    playbackSeconds,
    toughnessFor,
    calculationDataset,
    calculationTargets,
    playbackSpeeds: PLAYBACK_SPEEDS
  });

  if (typeof module !== "undefined" && module.exports) {
    module.exports = publicModel;
  }
  globalObject.MSETensionModel = publicModel;

  if (typeof document === "undefined") {
    return;
  }

  const elements = {
    materialSelect: document.getElementById("material-select"),
    rateInput: document.getElementById("rate-input"),
    strainRateValue: document.getElementById("strain-rate-value"),
    rateGuidance: document.getElementById("rate-guidance"),
    loadSpecimen: document.getElementById("load-specimen"),
    startTest: document.getElementById("start-test"),
    pauseTest: document.getElementById("pause-test"),
    resetTest: document.getElementById("reset-test"),
    slowerPlayback: document.getElementById("slower-playback"),
    fasterPlayback: document.getElementById("faster-playback"),
    playbackSpeedValue: document.getElementById("playback-speed-value"),
    playbackSpeedHelp: document.getElementById("playback-speed-help"),
    standardName: document.getElementById("standard-name"),
    dimensionSummary: document.getElementById("dimension-summary"),
    areaValue: document.getElementById("area-value"),
    sequenceValue: document.getElementById("sequence-value"),
    materialNote: document.getElementById("material-note"),
    machineState: document.getElementById("machine-state"),
    playbackNote: document.getElementById("playback-note"),
    utmSvg: document.getElementById("utm-svg"),
    utmDescription: document.getElementById("utm-description"),
    crossheadGroup: document.getElementById("crosshead-group"),
    upperGripGroup: document.getElementById("upper-grip-group"),
    specimenFull: document.getElementById("specimen-full"),
    specimenTop: document.getElementById("specimen-top"),
    specimenBottom: document.getElementById("specimen-bottom"),
    fractureMark: document.getElementById("fracture-mark"),
    gaugeMarkTop: document.getElementById("gauge-mark-top"),
    gaugeMarkBottom: document.getElementById("gauge-mark-bottom"),
    utmMaterialLabel: document.getElementById("utm-material-label"),
    stageExplanation: document.getElementById("stage-explanation"),
    specimenGradientStops: Array.from(document.querySelectorAll("#specimen-gradient stop")),
    chart: document.getElementById("stress-strain-chart"),
    graphFrame: document.getElementById("graph-frame"),
    timeValue: document.getElementById("time-value"),
    extensionValue: document.getElementById("extension-value"),
    loadValue: document.getElementById("load-value"),
    strainValue: document.getElementById("strain-value"),
    stressValue: document.getElementById("stress-value"),
    stageValue: document.getElementById("stage-value"),
    recordReading: document.getElementById("record-reading"),
    downloadCsv: document.getElementById("download-csv"),
    downloadCalculationCsv: document.getElementById("download-calculation-csv"),
    clearReadings: document.getElementById("clear-readings"),
    measurementMessage: document.getElementById("measurement-message"),
    measurementBody: document.getElementById("measurement-body"),
    quizPanel: document.getElementById("quiz-panel"),
    quizLockMessage: document.getElementById("quiz-lock-message"),
    quizForm: document.getElementById("quiz-form"),
    checkQuiz: document.getElementById("check-quiz"),
    quizResult: document.getElementById("quiz-result")
  };

  const requiredElementsMissing = Object.entries(elements)
    .filter(([, value]) => value === null)
    .map(([key]) => key);
  if (requiredElementsMissing.length > 0) {
    throw new Error(`Tension lab markup is missing: ${requiredElementsMissing.join(", ")}`);
  }

  const state = {
    status: "unloaded",
    materialId: elements.materialSelect.value,
    rate: Number(elements.rateInput.value),
    playbackMultiplier: 1,
    progress: 0,
    wallElapsedMilliseconds: 0,
    wallDurationSeconds: 14,
    lastTimestamp: null,
    animationFrame: null,
    readings: [],
    lastAnnouncedStage: "",
    quizUnlocked: false
  };

  const stageDescriptions = {
    Loaded: "The specimen is seated between the grips. Start the test to move the upper crosshead.",
    "Elastic — uniform": "The gauge section elongates uniformly. Removing the load in this region would approximately restore its original length.",
    "Yielding — uniform": "Plastic strain is beginning across the gauge section while deformation remains broadly uniform.",
    "Strain hardening — uniform": "The specimen is plastically elongating throughout the gauge section as work hardening raises the required stress.",
    Necking: "The maximum engineering stress has been passed. Deformation is now concentrating into a narrowing region.",
    "Brief localization": "Limited plastic deformation is localizing quickly before fracture in this heat-treated high-speed steel.",
    "Elastic — brittle": "The ceramic remains essentially linear elastic; it will fracture without a plastic neck.",
    "Viscoelastic loading": "The polymer is loading approximately uniformly, with a response that is already mildly nonlinear.",
    "Nonlinear — uniform": "The polycarbonate gauge section is elongating uniformly as it approaches upper yield.",
    "Yield & neck formation": "An upper-yield event is followed by a local drawn neck, unlike the post-UTS neck of a metal.",
    "Cold drawing": "The narrowed, molecularly oriented region is propagating along the polymer gauge section.",
    "Orientation hardening": "Alignment of polymer chains raises the engineering stress again before fracture.",
    Fractured: "The specimen has separated and the current load has fallen to zero. The final pre-separation curve point is recorded automatically, and the interpretation questions are unlocked."
  };

  function currentMaterial() {
    return MATERIALS[state.materialId];
  }

  function currentReading() {
    return readingAt(currentMaterial(), state.progress, state.rate, state.status === "fractured");
  }

  function formatNumber(value, digits) {
    return Number(value).toLocaleString("en-US", {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits
    });
  }

  function formatDuration(seconds) {
    if (seconds < 60) {
      return `${formatNumber(seconds, seconds < 10 ? 2 : 1)} s`;
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds - minutes * 60;
    if (minutes < 60) {
      return `${minutes} min ${formatNumber(remainingSeconds, 0)} s`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes - hours * 60;
    return `${hours} h ${remainingMinutes} min`;
  }

  function scientificHtml(value) {
    if (!Number.isFinite(value) || value === 0) {
      return "0 s<sup>&minus;1</sup>";
    }
    const exponent = Math.floor(Math.log10(Math.abs(value)));
    const coefficient = value / Math.pow(10, exponent);
    const exponentText = exponent < 0 ? `&minus;${Math.abs(exponent)}` : String(exponent);
    return `${coefficient.toFixed(2)} &times; 10<sup>${exponentText}</sup> s<sup>&minus;1</sup>`;
  }

  function updateMaterialPreview(resetRate) {
    const material = currentMaterial();
    const geometry = material.geometry;

    if (resetRate) {
      state.rate = material.rate.defaultValue;
      elements.rateInput.value = String(state.rate);
    }
    elements.rateInput.min = String(material.rate.minimum);
    elements.rateInput.max = String(material.rate.maximum);
    elements.rateInput.step = String(material.rate.step);

    elements.standardName.textContent = geometry.standard;
    elements.dimensionSummary.textContent = geometry.summary;
    elements.areaValue.innerHTML = `${formatNumber(areaFor(material), 1)} mm<sup>2</sup>`;
    elements.sequenceValue.textContent = material.sequence;
    const properties = material.properties;
    const curveParts = [
      `E = ${formatNumber(properties.modulus / 1000, properties.modulus < 10000 ? 1 : 0)} GPa`
    ];
    if (properties.yieldStress !== null) {
      curveParts.push(`yield = ${formatNumber(properties.yieldStress, 0)} MPa`);
    }
    curveParts.push(`${material.model === "alumina" ? "tensile fracture" : "peak"} = ${formatNumber(properties.ultimateStress, 0)} MPa`);
    curveParts.push(`fracture strain = ${formatNumber(properties.fractureStrain * 100, properties.fractureStrain < 0.01 ? 3 : properties.fractureStrain < 0.1 ? 1 : 0)}%`);
    elements.materialNote.textContent = `Representative curve: ${curveParts.join("; ")}. ${material.note}`;
    elements.rateGuidance.textContent = material.rate.guidance;

    updateRatePreview();
    updateSpecimenColors();
    renderAll();
  }

  function validateRate(showMessage) {
    const material = currentMaterial();
    const proposed = Number(elements.rateInput.value);
    let message = "";
    if (!Number.isFinite(proposed)) {
      message = "Enter a displacement rate.";
    } else if (proposed < material.rate.minimum || proposed > material.rate.maximum) {
      message = `Use ${material.rate.minimum} to ${material.rate.maximum} mm/min for this sample.`;
    }
    elements.rateInput.setCustomValidity(message);
    if (message && showMessage) {
      elements.rateInput.reportValidity();
      return false;
    }
    if (!message) {
      state.rate = proposed;
    }
    return message.length === 0;
  }

  function updateRatePreview() {
    if (!validateRate(false)) {
      elements.strainRateValue.textContent = "Enter a valid rate";
      return;
    }
    const nominalStrainRate = state.rate / currentMaterial().geometry.gaugeLength / 60;
    elements.strainRateValue.innerHTML = scientificHtml(nominalStrainRate);
    if (state.status === "loaded") {
      updatePlaybackMessage("loaded");
    }
  }

  function updateSpecimenColors() {
    const colors = currentMaterial().colors;
    elements.specimenGradientStops.forEach((stop, index) => {
      stop.setAttribute("stop-color", colors[index] || colors[colors.length - 1]);
    });
    [elements.specimenFull, elements.specimenTop, elements.specimenBottom].forEach((path) => {
      path.style.stroke = colors[2];
    });
  }

  function playbackMultiplierText(multiplier) {
    return multiplier < 0.1 ? `${multiplier.toFixed(2)}×` : `${multiplier}×`;
  }

  function updatePlaybackControls() {
    const index = PLAYBACK_SPEEDS.indexOf(state.playbackMultiplier);
    elements.playbackSpeedValue.value = playbackMultiplierText(state.playbackMultiplier);
    elements.playbackSpeedValue.textContent = playbackMultiplierText(state.playbackMultiplier);
    elements.slowerPlayback.disabled = index <= 0;
    elements.fasterPlayback.disabled = index >= PLAYBACK_SPEEDS.length - 1;

    if (state.playbackMultiplier <= 0.1) {
      const slowerBy = Math.round(1 / state.playbackMultiplier);
      elements.playbackSpeedHelp.textContent = `Observation mode: ${slowerBy}× slower than normal animation, giving more time to record readings.`;
    } else if (state.playbackMultiplier < 1) {
      elements.playbackSpeedHelp.textContent = `${playbackMultiplierText(state.playbackMultiplier)} playback slows the animation without changing calculated test time.`;
    } else if (state.playbackMultiplier > 1) {
      elements.playbackSpeedHelp.textContent = `${playbackMultiplierText(state.playbackMultiplier)} playback accelerates the animation without changing the prescribed crosshead rate.`;
    } else {
      elements.playbackSpeedHelp.textContent = "Use 0.01× for initial elastic data or 0.1× for general recording; speed can change during the test.";
    }
  }

  function changePlaybackSpeed(direction) {
    const currentIndex = PLAYBACK_SPEEDS.indexOf(state.playbackMultiplier);
    const nextIndex = clamp(currentIndex + direction, 0, PLAYBACK_SPEEDS.length - 1);
    if (nextIndex === currentIndex) {
      return;
    }
    state.playbackMultiplier = PLAYBACK_SPEEDS[nextIndex];
    updatePlaybackControls();
    if (state.status === "unloaded") {
      elements.playbackNote.textContent = `${playbackMultiplierText(state.playbackMultiplier)} animation speed selected. Choose a sample, set its rate, then load it into the grips.`;
    } else if (state.status === "paused") {
      updatePlaybackMessage("paused");
    } else if (state.status === "fractured") {
      updatePlaybackMessage("finished");
    } else {
      updatePlaybackMessage(state.status);
    }
  }

  function updatePlaybackMessage(context) {
    const material = currentMaterial();
    const finalReading = readingAt(material, 1, state.rate, true);
    state.wallDurationSeconds = playbackSeconds(material, state.rate);
    const effectiveScreenSeconds = state.wallDurationSeconds / state.playbackMultiplier;
    const ratio = finalReading.timeSeconds / effectiveScreenSeconds;
    let scaleText = "approximately real-time";
    if (ratio > 1.05) {
      scaleText = `${formatNumber(ratio, ratio < 10 ? 1 : 0)}× faster than calculated time`;
    } else if (ratio < 0.95 && finalReading.timeSeconds > 0) {
      scaleText = `${formatNumber(1 / ratio, 1)}× slower than calculated time`;
    }
    const base = `At ${formatNumber(state.rate, state.rate < 1 ? 3 : 1)} mm/min, calculated fracture time is ${formatDuration(finalReading.timeSeconds)}. At ${playbackMultiplierText(state.playbackMultiplier)} animation speed, expected screen time is about ${formatDuration(effectiveScreenSeconds)} (${scaleText}).`;
    if (context === "paused") {
      elements.playbackNote.textContent = `Paused at ${formatDuration(currentReading().timeSeconds)}. ${base}`;
    } else if (context === "finished") {
      elements.playbackNote.textContent = `Test complete in ${formatDuration(finalReading.timeSeconds)} calculated test time.`;
    } else {
      elements.playbackNote.textContent = base;
    }
  }

  function loadSpecimen() {
    if (!validateRate(true)) {
      return;
    }
    cancelAnimation();
    state.status = "loaded";
    state.progress = 0;
    state.wallElapsedMilliseconds = 0;
    state.lastTimestamp = null;
    state.lastAnnouncedStage = "";
    resetQuiz();
    clearMeasurements();
    updateControlStates();
    updatePlaybackMessage("loaded");
    renderAll();
  }

  function startTest() {
    if (state.status !== "loaded") {
      return;
    }
    state.status = "running";
    state.lastTimestamp = null;
    updateControlStates();
    updatePlaybackMessage("running");
    announceStage(currentReading().stage, true);
    state.animationFrame = globalObject.requestAnimationFrame(animate);
  }

  function togglePause() {
    if (state.status === "running") {
      state.status = "paused";
      cancelAnimation();
      updateControlStates();
      updatePlaybackMessage("paused");
      announceStage(currentReading().stage, true);
      return;
    }
    if (state.status === "paused") {
      state.status = "running";
      state.lastTimestamp = null;
      updateControlStates();
      updatePlaybackMessage("running");
      announceStage(currentReading().stage, true);
      state.animationFrame = globalObject.requestAnimationFrame(animate);
    }
  }

  function resetTest() {
    cancelAnimation();
    state.status = "unloaded";
    state.progress = 0;
    state.wallElapsedMilliseconds = 0;
    state.lastTimestamp = null;
    state.lastAnnouncedStage = "";
    clearMeasurements();
    resetQuiz();
    updateControlStates();
    elements.playbackNote.textContent = `${playbackMultiplierText(state.playbackMultiplier)} animation speed selected. Choose a sample, set its rate, then load it into the grips.`;
    renderAll();
  }

  function cancelAnimation() {
    if (state.animationFrame !== null) {
      globalObject.cancelAnimationFrame(state.animationFrame);
      state.animationFrame = null;
    }
  }

  function animate(timestamp) {
    if (state.status !== "running") {
      return;
    }
    if (state.lastTimestamp === null) {
      state.lastTimestamp = timestamp;
    }
    const elapsed = clamp(timestamp - state.lastTimestamp, 0, 100);
    state.lastTimestamp = timestamp;
    state.wallElapsedMilliseconds += elapsed * state.playbackMultiplier;
    state.progress = clamp(
      state.wallElapsedMilliseconds / (state.wallDurationSeconds * 1000),
      0,
      1
    );

    renderDynamic();
    const reading = currentReading();
    if (reading.stage !== state.lastAnnouncedStage) {
      announceStage(reading.stage, false);
    }

    if (state.progress >= 1) {
      finishTest();
      return;
    }
    state.animationFrame = globalObject.requestAnimationFrame(animate);
  }

  function finishTest() {
    cancelAnimation();
    state.status = "fractured";
    state.progress = 1;
    state.lastTimestamp = null;
    renderAll();
    announceStage("Fractured", true);
    updatePlaybackMessage("finished");
    updateControlStates();
    recordMeasurement(true);
    unlockQuiz();
  }

  function updateControlStates() {
    const unloaded = state.status === "unloaded";
    const loaded = state.status === "loaded";
    const running = state.status === "running";
    const paused = state.status === "paused";
    const fractured = state.status === "fractured";

    elements.materialSelect.disabled = !unloaded;
    elements.rateInput.disabled = !unloaded;
    elements.loadSpecimen.disabled = !unloaded;
    elements.startTest.disabled = !loaded;
    elements.pauseTest.disabled = !(running || paused);
    elements.pauseTest.textContent = paused ? "Resume" : "Pause";
    elements.resetTest.disabled = unloaded;
    elements.recordReading.disabled = unloaded;
    elements.downloadCsv.disabled = state.readings.length === 0;
    elements.downloadCalculationCsv.disabled = !fractured;
    elements.clearReadings.disabled = state.readings.length === 0;
    updatePlaybackControls();
  }

  function statusLabel(reading) {
    if (state.status === "unloaded") {
      return "Waiting for specimen";
    }
    if (state.status === "paused") {
      return `Paused — ${reading.stage}`;
    }
    if (state.status === "fractured") {
      return "Fractured";
    }
    if (state.status === "loaded") {
      return "Specimen loaded";
    }
    return reading.stage;
  }

  function announceStage(stage, force) {
    if (!force && stage === state.lastAnnouncedStage) {
      return;
    }
    state.lastAnnouncedStage = stage;
    const reading = currentReading();
    elements.machineState.textContent = statusLabel(reading);
    elements.stageExplanation.textContent = stageDescriptions[stage] || "The test is progressing.";
  }

  function renderAll() {
    renderDynamic();
    updateControlStates();
    const reading = currentReading();
    elements.machineState.textContent = statusLabel(reading);
    if (state.status === "unloaded") {
      elements.stageExplanation.textContent = "The upper crosshead will pull the specimen while the lower grip remains fixed.";
    } else {
      elements.stageExplanation.textContent = stageDescriptions[reading.stage] || "The test is progressing.";
    }
  }

  function renderDynamic() {
    const reading = currentReading();
    renderLiveValues(reading);
    renderMachine(reading);
    drawGraph(reading);
  }

  function renderLiveValues(reading) {
    if (state.status === "unloaded") {
      elements.timeValue.textContent = "0.00 s";
      elements.extensionValue.textContent = "0.000 mm";
      elements.loadValue.textContent = "0.000 kN";
      elements.strainValue.textContent = "0.000%";
      elements.stressValue.textContent = "0.0 MPa";
      elements.stageValue.textContent = "Not loaded";
      return;
    }
    elements.timeValue.textContent = formatDuration(reading.timeSeconds);
    elements.extensionValue.textContent = `${formatNumber(reading.extension, reading.extension < 0.1 ? 4 : 3)} mm`;
    elements.loadValue.textContent = state.status === "fractured"
      ? "0.000 kN (released)"
      : `${formatNumber(reading.loadKilonewtons, 3)} kN`;
    const strainPercent = reading.strain * 100;
    const strainDigits = strainPercent < 0.1 ? 4 : strainPercent < 10 ? 3 : 1;
    elements.strainValue.textContent = `${formatNumber(strainPercent, strainDigits)}%`;
    elements.stressValue.textContent = state.status === "fractured"
      ? `${formatNumber(reading.stress, 1)} MPa at fracture`
      : `${formatNumber(reading.stress, 1)} MPa`;
    elements.stageValue.textContent = reading.stage;
  }

  function visualExtensionFor(material, progress) {
    let maximum = 70;
    if (material.family === "polymer") {
      maximum = 86;
    } else if (material.family === "brittle-ceramic") {
      maximum = 28;
    } else if (material.family === "limited-ductility-metal") {
      maximum = 38;
    }
    return maximum * clamp(progress, 0, 1);
  }

  function specimenPointRows(material, strain, visualExtension) {
    const geometry = material.geometry;
    const originalHeight = 186;
    const top = 194 - visualExtension;
    const currentHeight = originalHeight + visualExtension;
    const pixelScale = originalHeight / geometry.overallLength;
    const narrowHalfWidth = geometry.narrowWidth * pixelScale / 2;
    const gripHalfWidth = geometry.gripWidth * pixelScale / 2;
    const reducedHalfFraction = geometry.reducedLength / geometry.overallLength / 2;
    const transitionFraction = material.family === "brittle-ceramic" ? 0.085 : 0.06;
    const rows = [];

    for (let index = 0; index <= 100; index += 1) {
      const fraction = index / 100;
      const distanceFromMiddle = Math.abs(fraction - 0.5);
      let profileFraction = 0;
      if (distanceFromMiddle > reducedHalfFraction) {
        profileFraction = smoothStep(
          (distanceFromMiddle - reducedHalfFraction) / transitionFraction
        );
      }
      let halfWidth = interpolate(narrowHalfWidth, gripHalfWidth, profileFraction);
      const gaugeBlend = 1 - profileFraction;

      let uniformFactor = 1;
      if (material.family === "ductile-metal" || material.family === "limited-ductility-metal") {
        uniformFactor = 1 / Math.sqrt(1 + Math.min(strain, material.properties.uniformStrain));
      } else if (material.family === "polymer") {
        uniformFactor = 1 - 0.12 * Math.min(strain / material.properties.yieldStrain, 1);
      } else {
        uniformFactor = 1 - 0.015 * (strain / material.properties.fractureStrain);
      }
      halfWidth *= interpolate(1, uniformFactor, gaugeBlend);

      if (
        (material.family === "ductile-metal" || material.family === "limited-ductility-metal") &&
        strain > material.properties.uniformStrain
      ) {
        const localizationProgress = clamp(
          (strain - material.properties.uniformStrain) /
            (material.properties.fractureStrain - material.properties.uniformStrain),
          0,
          1
        );
        const maximumSeverity = material.model === "copper"
          ? 0.5
          : material.model === "high-speed-steel"
            ? 0.12
            : 0.42;
        const spread = 0.052 - 0.015 * localizationProgress;
        const localWeight = Math.exp(-Math.pow((fraction - 0.5) / spread, 2));
        halfWidth *= 1 - maximumSeverity * localizationProgress * localWeight * gaugeBlend;
      }

      if (material.family === "polymer" && strain > material.properties.yieldStrain) {
        const drawingProgress = clamp(
          (strain - material.properties.yieldStrain) /
            (material.properties.fractureStrain - material.properties.yieldStrain),
          0,
          1
        );
        const drawnHalfBand = 0.025 + 0.22 * drawingProgress;
        const edge = smoothStep(
          (distanceFromMiddle - drawnHalfBand) / 0.045
        );
        const drawnWeight = 1 - edge;
        halfWidth *= 1 - 0.29 * drawnWeight * gaugeBlend;
      }

      rows.push({
        fraction,
        y: top + currentHeight * fraction,
        left: 240 - halfWidth,
        right: 240 + halfWidth
      });
    }
    return rows;
  }

  function pathFromRows(rows) {
    if (rows.length < 2) {
      return "";
    }
    const rightSide = rows.map((row, index) => `${index === 0 ? "M" : "L"}${row.right.toFixed(2)} ${row.y.toFixed(2)}`);
    const leftSide = rows.slice().reverse().map((row) => `L${row.left.toFixed(2)} ${row.y.toFixed(2)}`);
    return `${rightSide.join(" ")} ${leftSide.join(" ")} Z`;
  }

  function renderMachine(reading) {
    const material = currentMaterial();
    const isEmpty = state.status === "unloaded";
    elements.utmSvg.classList.toggle("is-empty", isEmpty);
    if (isEmpty) {
      elements.specimenFull.style.display = "none";
      elements.specimenTop.style.display = "none";
      elements.specimenBottom.style.display = "none";
      elements.fractureMark.style.display = "none";
      elements.crossheadGroup.setAttribute("transform", "translate(0 0)");
      elements.upperGripGroup.setAttribute("transform", "translate(0 0)");
      elements.utmMaterialLabel.textContent = "No specimen loaded";
      elements.utmDescription.textContent = "The universal testing machine is empty. Choose a material and load a specimen.";
      return;
    }

    const visualExtension = visualExtensionFor(material, reading.progress);
    const rows = specimenPointRows(material, reading.strain, visualExtension);
    const middleIndex = Math.floor(rows.length / 2);
    const fractured = state.status === "fractured";

    elements.crossheadGroup.setAttribute("transform", `translate(0 ${(-visualExtension).toFixed(2)})`);
    elements.upperGripGroup.setAttribute("transform", `translate(0 ${(-visualExtension).toFixed(2)})`);
    elements.utmMaterialLabel.textContent = `${material.shortName} · deformation magnified`;

    if (fractured) {
      const topRows = rows.slice(0, middleIndex + 1);
      const bottomRows = rows.slice(middleIndex);
      elements.specimenFull.style.display = "none";
      elements.specimenTop.style.display = "block";
      elements.specimenBottom.style.display = "block";
      elements.specimenTop.setAttribute("d", pathFromRows(topRows));
      elements.specimenBottom.setAttribute("d", pathFromRows(bottomRows));
      elements.specimenTop.setAttribute("transform", "translate(0 -5)");
      elements.specimenBottom.setAttribute("transform", "translate(0 5)");
      elements.fractureMark.style.display = "block";
      elements.fractureMark.setAttribute("transform", `translate(0 ${(rows[middleIndex].y - 291).toFixed(2)})`);
    } else {
      elements.specimenFull.style.display = "block";
      elements.specimenTop.style.display = "none";
      elements.specimenBottom.style.display = "none";
      elements.fractureMark.style.display = "none";
      elements.specimenFull.setAttribute("d", pathFromRows(rows));
      elements.specimenFull.removeAttribute("transform");
    }

    const gaugeTopFraction = 0.5 - material.geometry.gaugeLength / material.geometry.overallLength / 2;
    const gaugeBottomFraction = 0.5 + material.geometry.gaugeLength / material.geometry.overallLength / 2;
    const gaugeTop = rows[Math.round(gaugeTopFraction * 100)];
    const gaugeBottom = rows[Math.round(gaugeBottomFraction * 100)];
    [
      [elements.gaugeMarkTop, gaugeTop],
      [elements.gaugeMarkBottom, gaugeBottom]
    ].forEach(([line, row]) => {
      line.setAttribute("x1", (row.left - 7).toFixed(2));
      line.setAttribute("x2", (row.right + 7).toFixed(2));
      line.setAttribute("y1", row.y.toFixed(2));
      line.setAttribute("y2", row.y.toFixed(2));
    });

    const stressDescription = fractured
      ? `The final plotted stress immediately before separation was ${formatNumber(reading.stress, 1)} megapascals; current load is zero.`
      : `Engineering stress is ${formatNumber(reading.stress, 1)} megapascals.`;
    const descriptionParts = [
      `${material.name} is loaded in the model universal testing machine.`,
      `Engineering strain is ${formatNumber(reading.strain * 100, reading.strain < 0.001 ? 4 : 2)} percent.`,
      stressDescription,
      `Stage: ${reading.stage}.`
    ];
    elements.utmDescription.textContent = descriptionParts.join(" ");
  }

  function canvasPalette() {
    const style = globalObject.getComputedStyle(document.documentElement);
    const read = (name, fallback) => style.getPropertyValue(name).trim() || fallback;
    return {
      paper: read("--paper", "#ffffff"),
      canvas: read("--canvas", "#fdf6ec"),
      ink: read("--ink", "#2e2a74"),
      muted: read("--muted", "#69648d"),
      coral: read("--coral", "#c93b1f"),
      lavender: read("--lavender", "#6757a8"),
      green: read("--tension-green", "#26715f"),
      grid: read("--tension-grid", "rgba(46, 42, 116, 0.11)")
    };
  }

  function prepareChartCanvas() {
    const bounds = elements.graphFrame.getBoundingClientRect();
    const cssWidth = Math.max(300, Math.round(bounds.width));
    const cssHeight = Math.max(320, Math.round(bounds.height));
    const pixelRatio = Math.min(globalObject.devicePixelRatio || 1, 2);
    const desiredWidth = Math.round(cssWidth * pixelRatio);
    const desiredHeight = Math.round(cssHeight * pixelRatio);
    if (elements.chart.width !== desiredWidth || elements.chart.height !== desiredHeight) {
      elements.chart.width = desiredWidth;
      elements.chart.height = desiredHeight;
    }
    const context = elements.chart.getContext("2d");
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    return { context, width: cssWidth, height: cssHeight };
  }

  function strainTickText(strain, maximumStrain) {
    const percent = strain * 100;
    const maximumPercent = maximumStrain * 100;
    if (maximumPercent < 0.2) {
      return percent.toFixed(3);
    }
    if (maximumPercent < 5) {
      return percent.toFixed(1);
    }
    return percent.toFixed(0);
  }

  function drawGraph(reading) {
    const material = currentMaterial();
    const palette = canvasPalette();
    const { context, width, height } = prepareChartCanvas();
    const margins = { left: width < 420 ? 56 : 66, right: 20, top: 28, bottom: 58 };
    const plotWidth = Math.max(10, width - margins.left - margins.right);
    const plotHeight = Math.max(10, height - margins.top - margins.bottom);
    const maximumStrain = material.properties.fractureStrain * 1.08;
    const maximumStress = material.properties.ultimateStress * 1.16;
    const xFor = (strain) => margins.left + strain / maximumStrain * plotWidth;
    const yFor = (stress) => margins.top + plotHeight - stress / maximumStress * plotHeight;

    context.clearRect(0, 0, width, height);
    context.fillStyle = palette.paper;
    context.fillRect(0, 0, width, height);
    context.font = "12px system-ui, sans-serif";
    context.textBaseline = "middle";

    for (let tick = 0; tick <= 5; tick += 1) {
      const fraction = tick / 5;
      const x = margins.left + fraction * plotWidth;
      const y = margins.top + plotHeight - fraction * plotHeight;
      context.strokeStyle = palette.grid;
      context.lineWidth = 1;
      context.beginPath();
      context.moveTo(x, margins.top);
      context.lineTo(x, margins.top + plotHeight);
      context.stroke();
      context.beginPath();
      context.moveTo(margins.left, y);
      context.lineTo(margins.left + plotWidth, y);
      context.stroke();

      context.fillStyle = palette.muted;
      context.textAlign = "center";
      context.fillText(strainTickText(maximumStrain * fraction, maximumStrain), x, margins.top + plotHeight + 21);
      context.textAlign = "right";
      context.fillText(formatNumber(maximumStress * fraction, 0), margins.left - 9, y);
    }

    context.strokeStyle = palette.ink;
    context.lineWidth = 1.5;
    context.beginPath();
    context.moveTo(margins.left, margins.top);
    context.lineTo(margins.left, margins.top + plotHeight);
    context.lineTo(margins.left + plotWidth, margins.top + plotHeight);
    context.stroke();

    context.fillStyle = palette.ink;
    context.font = "700 12px system-ui, sans-serif";
    context.textAlign = "center";
    context.fillText("Engineering strain (%)", margins.left + plotWidth / 2, height - 13);
    context.save();
    context.translate(15, margins.top + plotHeight / 2);
    context.rotate(-Math.PI / 2);
    context.fillText("Engineering stress (MPa)", 0, 0);
    context.restore();

    if (state.status === "unloaded") {
      context.fillStyle = palette.muted;
      context.font = "700 14px system-ui, sans-serif";
      context.textAlign = "center";
      context.fillText("Load a specimen to begin", margins.left + plotWidth / 2, margins.top + plotHeight / 2);
      elements.chart.setAttribute("aria-label", "Engineering stress versus engineering strain graph. No specimen is loaded.");
      return;
    }

    const pointCount = Math.max(2, Math.ceil(240 * state.progress));
    context.beginPath();
    for (let index = 0; index <= pointCount; index += 1) {
      const fraction = pointCount === 0 ? 0 : index / pointCount;
      const strain = reading.strain * fraction;
      const stress = stressAt(material, strain);
      const x = xFor(strain);
      const y = yFor(stress);
      if (index === 0) {
        context.moveTo(x, y);
      } else {
        context.lineTo(x, y);
      }
    }
    context.strokeStyle = palette.coral;
    context.lineWidth = 3;
    context.lineJoin = "round";
    context.lineCap = "round";
    context.stroke();

    const annotations = [];
    if (material.properties.yieldStress !== null && reading.strain >= material.properties.yieldStrain) {
      annotations.push({
        strain: material.properties.yieldStrain,
        stress: stressAt(material, material.properties.yieldStrain),
        label: material.model === "polycarbonate" ? "Upper yield" : "Yield"
      });
    }
    if (
      reading.strain >= material.properties.uniformStrain &&
      Math.abs(material.properties.uniformStrain - material.properties.yieldStrain) > 1e-10
    ) {
      annotations.push({
        strain: material.properties.uniformStrain,
        stress: material.properties.ultimateStress,
        label: material.model === "alumina"
          ? "Fracture"
          : material.model === "polycarbonate"
            ? "Upper yield"
            : "UTS / localization"
      });
    }

    annotations.forEach((annotation, index) => {
      const x = xFor(annotation.strain);
      const y = yFor(annotation.stress);
      context.fillStyle = palette.lavender;
      context.beginPath();
      context.arc(x, y, 4.5, 0, Math.PI * 2);
      context.fill();
      context.font = "700 11px system-ui, sans-serif";
      context.textAlign = x > margins.left + plotWidth * 0.68 ? "right" : "left";
      context.fillText(annotation.label, x + (context.textAlign === "right" ? -7 : 7), y - 10 - index * 2);
    });

    state.readings.forEach((record, index) => {
      const x = xFor(record.strain);
      const y = yFor(record.stress);
      context.fillStyle = palette.green;
      context.beginPath();
      context.arc(x, y, 7, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = palette.paper;
      context.font = "700 9px system-ui, sans-serif";
      context.textAlign = "center";
      context.fillText(String(index + 1), x, y + 0.5);
    });

    const currentX = xFor(reading.strain);
    const currentY = yFor(reading.stress);
    context.fillStyle = palette.paper;
    context.strokeStyle = palette.coral;
    context.lineWidth = 3;
    context.beginPath();
    context.arc(currentX, currentY, 6, 0, Math.PI * 2);
    context.fill();
    context.stroke();

    const accessibleStrainDigits = reading.strain < 0.001 ? 4 : 2;
    elements.chart.setAttribute(
      "aria-label",
      `${material.name} engineering stress-strain curve. Current strain ${formatNumber(reading.strain * 100, accessibleStrainDigits)} percent, stress ${formatNumber(reading.stress, 1)} megapascals, stage ${reading.stage}.`
    );
  }

  function recordMeasurement(automatic) {
    if (state.status === "unloaded") {
      return;
    }
    const reading = currentReading();
    const previous = state.readings[state.readings.length - 1];
    if (automatic && previous && Math.abs(previous.strain - reading.strain) < 1e-10) {
      return;
    }
    const manualReadingLimit = 60;
    if (!automatic && state.readings.length >= manualReadingLimit) {
      elements.measurementMessage.textContent = "The table allows 60 manual readings and reserves the final slot for the fracture point.";
      return;
    }
    if (automatic && state.readings.length >= manualReadingLimit + 1) {
      state.readings.splice(manualReadingLimit);
    }
    state.readings.push({
      material: currentMaterial().name,
      rate: state.rate,
      timeSeconds: reading.timeSeconds,
      extension: reading.extension,
      loadKilonewtons: reading.loadKilonewtons,
      strain: reading.strain,
      stress: reading.stress,
      stage: automatic ? "Fracture point (pre-separation)" : reading.stage
    });
    elements.measurementMessage.textContent = automatic
      ? "Final fracture reading recorded automatically."
      : `Reading ${state.readings.length} recorded and marked on the graph.`;
    renderMeasurementTable();
    updateControlStates();
    drawGraph(reading);
  }

  function renderMeasurementTable() {
    elements.measurementBody.replaceChildren();
    if (state.readings.length === 0) {
      const row = document.createElement("tr");
      row.className = "empty-row";
      const cell = document.createElement("td");
      cell.colSpan = 7;
      cell.textContent = "No readings recorded yet.";
      row.append(cell);
      elements.measurementBody.append(row);
      return;
    }

    state.readings.forEach((reading, index) => {
      const row = document.createElement("tr");
      const values = [
        String(index + 1),
        formatNumber(reading.timeSeconds, 2),
        formatNumber(reading.extension, 4),
        formatNumber(reading.loadKilonewtons, 3),
        formatNumber(reading.strain * 100, reading.strain < 0.001 ? 4 : 2),
        formatNumber(reading.stress, 1),
        reading.stage
      ];
      values.forEach((value) => {
        const cell = document.createElement("td");
        cell.textContent = value;
        row.append(cell);
      });
      elements.measurementBody.append(row);
    });
  }

  function clearMeasurements() {
    state.readings = [];
    elements.measurementMessage.textContent = "";
    renderMeasurementTable();
    updateControlStates();
    if (elements.chart) {
      drawGraph(currentReading());
    }
  }

  function downloadMeasurements() {
    if (state.readings.length === 0) {
      return;
    }
    const header = ["Sample", "Rate (mm/min)", "Time (s)", "Extension (mm)", "Load (kN)", "Engineering strain", "Engineering stress (MPa)", "Stage"];
    const rows = state.readings.map((reading) => [
      reading.material,
      reading.rate,
      reading.timeSeconds.toFixed(4),
      reading.extension.toFixed(6),
      reading.loadKilonewtons.toFixed(6),
      reading.strain.toFixed(8),
      reading.stress.toFixed(4),
      reading.stage
    ]);
    downloadCsvFile(`${currentMaterial().id}-recorded-readings.csv`, header, rows);
    elements.measurementMessage.textContent = "Recorded-readings CSV downloaded.";
  }

  function downloadCalculationData() {
    if (state.status !== "fractured") {
      return;
    }
    const material = currentMaterial();
    const dataset = calculationDataset(material, state.rate);
    const header = ["Point", "Sample", "Rate (mm/min)", "Time (s)", "Extension (mm)", "Load (kN)", "Engineering strain", "Engineering stress (MPa)", "Stage"];
    const rows = dataset.map((reading) => [
      reading.point,
      material.name,
      state.rate,
      reading.timeSeconds.toFixed(6),
      reading.extension.toFixed(8),
      reading.loadKilonewtons.toFixed(8),
      reading.strain.toFixed(10),
      reading.stress.toFixed(6),
      reading.stage
    ]);
    downloadCsvFile(`${material.id}-calculation-data.csv`, header, rows);
    elements.measurementMessage.textContent = "Calculation CSV downloaded. The numerical quiz is checked against this dataset.";
  }

  function downloadCsvFile(filename, header, rows) {
    const quote = (value) => `"${String(value).replace(/"/g, "\"\"")}"`;
    const csv = [header, ...rows].map((row) => row.map(quote).join(",")).join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.append(link);
    link.click();
    link.remove();
    globalObject.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function resetQuiz() {
    state.quizUnlocked = false;
    elements.quizPanel.classList.add("is-locked");
    elements.quizLockMessage.textContent = "Complete one test to unlock four numerical questions and the calculation CSV used to check them.";
    elements.quizForm.reset();
    elements.quizForm.querySelectorAll("fieldset").forEach((fieldset) => {
      fieldset.disabled = true;
      fieldset.classList.remove("is-correct", "is-incorrect");
      const input = fieldset.querySelector("input");
      if (input) {
        input.removeAttribute("aria-invalid");
      }
      const feedback = fieldset.querySelector(".answer-feedback");
      if (feedback) {
        feedback.textContent = "";
      }
    });
    elements.checkQuiz.disabled = true;
    elements.quizResult.textContent = "";
  }

  function unlockQuiz() {
    state.quizUnlocked = true;
    elements.quizPanel.classList.remove("is-locked");
    elements.quizLockMessage.textContent = `Test complete for ${currentMaterial().shortName}. Download the calculation CSV above and use it for your written calculations; reasonable rounding is accepted.`;
    elements.quizForm.querySelectorAll("fieldset").forEach((fieldset) => {
      fieldset.disabled = false;
    });
    elements.checkQuiz.disabled = false;
  }

  function formatCalculationValue(value) {
    const magnitude = Math.abs(value);
    if (magnitude < 0.1) {
      return formatNumber(value, 4);
    }
    if (magnitude < 10) {
      return formatNumber(value, 3);
    }
    if (magnitude < 100) {
      return formatNumber(value, 2);
    }
    return formatNumber(value, 1);
  }

  function calculationDefinitions() {
    const targets = calculationTargets(currentMaterial());
    return {
      modulus: {
        target: targets.modulus,
        unit: "GPa",
        tolerance: 0.05,
        explanation: "Use the slope Δσ/Δε between the zero row and the first nonzero initial-region row. Convert MPa to GPa by dividing by 1000."
      },
      ultimate: {
        target: targets.ultimate,
        unit: "MPa",
        tolerance: 0.03,
        explanation: "UTS is the greatest engineering stress reached before localization or fracture."
      },
      resilience: {
        target: targets.resilience,
        unit: "MJ/m³",
        tolerance: 0.1,
        explanation: "Apply the trapezoidal rule from zero to the row labelled elastic limit, proportional limit, yield, or fracture. For a linear region, this equals σ²/(2E)."
      },
      toughness: {
        target: targets.toughness,
        unit: "MJ/m³",
        tolerance: 0.15,
        explanation: "Apply the trapezoidal rule to every calculation-CSV row using engineering stress and decimal engineering strain."
      }
    };
  }

  function checkQuiz(event) {
    event.preventDefault();
    if (!state.quizUnlocked) {
      return;
    }
    const definitions = calculationDefinitions();
    let score = 0;
    let answered = 0;
    const fieldsets = Array.from(elements.quizForm.querySelectorAll("fieldset"));
    fieldsets.forEach((fieldset) => {
      const definition = definitions[fieldset.dataset.metric];
      const input = fieldset.querySelector("input[type=number]");
      const hasAnswer = input && input.value.trim() !== "" && Number.isFinite(Number(input.value));
      const submittedValue = hasAnswer ? Number(input.value) : NaN;
      const absoluteTolerance = Math.max(Math.abs(definition.target) * definition.tolerance, 1e-6);
      const correct = hasAnswer && Math.abs(submittedValue - definition.target) <= absoluteTolerance;
      fieldset.classList.toggle("is-correct", Boolean(correct));
      fieldset.classList.toggle("is-incorrect", !correct);
      if (hasAnswer) {
        answered += 1;
      }
      if (correct) {
        score += 1;
      }
      if (input) {
        input.setAttribute("aria-invalid", String(!correct));
      }
      const feedback = fieldset.querySelector(".answer-feedback");
      const reference = `${formatCalculationValue(definition.target)} ${definition.unit}`;
      const tolerancePercent = Math.round(definition.tolerance * 100);
      if (!hasAnswer) {
        feedback.textContent = `Enter a numerical answer. ${definition.explanation}`;
      } else if (correct) {
        feedback.textContent = `Correct within ±${tolerancePercent}%. Calculation-CSV reference: ${reference}.`;
      } else {
        feedback.textContent = `Check the calculation. Calculation-CSV reference: ${reference}. ${definition.explanation}`;
      }
    });
    elements.quizResult.textContent = answered < fieldsets.length
      ? `${score} of 4 correct so far; answer every question.`
      : `${score} of 4 correct.`;
  }

  elements.materialSelect.addEventListener("change", () => {
    state.materialId = elements.materialSelect.value;
    state.progress = 0;
    updateMaterialPreview(true);
  });

  elements.rateInput.addEventListener("input", updateRatePreview);
  elements.rateInput.addEventListener("change", () => {
    if (!validateRate(true)) {
      return;
    }
    elements.rateInput.value = String(state.rate);
    updateRatePreview();
  });
  elements.loadSpecimen.addEventListener("click", loadSpecimen);
  elements.startTest.addEventListener("click", startTest);
  elements.pauseTest.addEventListener("click", togglePause);
  elements.resetTest.addEventListener("click", resetTest);
  elements.slowerPlayback.addEventListener("click", () => changePlaybackSpeed(-1));
  elements.fasterPlayback.addEventListener("click", () => changePlaybackSpeed(1));
  elements.recordReading.addEventListener("click", () => recordMeasurement(false));
  elements.downloadCsv.addEventListener("click", downloadMeasurements);
  elements.downloadCalculationCsv.addEventListener("click", downloadCalculationData);
  elements.clearReadings.addEventListener("click", clearMeasurements);
  elements.quizForm.addEventListener("submit", checkQuiz);

  const resizeGraph = () => drawGraph(currentReading());
  if (typeof globalObject.ResizeObserver === "function") {
    const graphObserver = new globalObject.ResizeObserver(resizeGraph);
    graphObserver.observe(elements.graphFrame);
  } else {
    globalObject.addEventListener("resize", resizeGraph);
  }

  updateMaterialPreview(true);
  resetQuiz();
  updateControlStates();
  globalObject.requestAnimationFrame(() => renderAll());
})(typeof window !== "undefined" ? window : globalThis);
