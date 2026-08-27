// B-spline traces derived from reusable vector phase-diagram references.
// Coordinates are stored directly in teaching units (wt% solute, degrees C),
// with endpoints snapped to the canonical values used by this lesson.

export const CU_NI_TRACE_SOURCE = {
  format: "phase-diagram-bspline-trace",
  version: 1,
  system: "Cu-Ni",
  source: {
    title: "Diagramme phase Cu Ni",
    author: "Romary",
    pageUrl: "https://commons.wikimedia.org/wiki/File:Diagramme_phase_Cu_Ni.svg",
    assetUrl: "https://upload.wikimedia.org/wikipedia/commons/3/32/Diagramme_phase_Cu_Ni.svg",
    license: "CC BY 2.5",
    licenseUrl: "https://creativecommons.org/licenses/by/2.5/",
    changeNote: "Curves retraced as B-splines, translated, and calibrated to composition and melting-point landmarks."
  },
  axes: {
    x: { quantity: "Nickel composition", unit: "wt% Ni", min: 0, max: 100 },
    y: { quantity: "Temperature", unit: "°C", min: 1050, max: 1500 }
  },
  segments: [
    {
      id: "liquidus",
      name: "Liquidus",
      degree: 3,
      knots: [0, 0, 0, 0, 0.5, 0.5, 0.5, 1, 1, 1, 1],
      points: [
        [0, 1084.6],
        [20.26488, 1228.07145],
        [53.93172, 1333.15134],
        [78.65919, 1405.10226],
        [86.48347, 1427.86903],
        [93.60532, 1440.18656],
        [100, 1454.85]
      ]
    },
    {
      id: "solidus",
      name: "Solidus",
      degree: 3,
      knots: [0, 0, 0, 0, 0.33333333, 0.33333333, 0.33333333, 0.66666667, 0.66666667, 0.66666667, 1, 1, 1, 1],
      points: [
        [0, 1084.6],
        [11.08302, 1135.93596],
        [22.3746, 1171.66264],
        [33.79921, 1212.34421],
        [38.58477, 1229.38494],
        [43.33023, 1247.85536],
        [48.2817, 1265.61594],
        [66.57523, 1331.23346],
        [82.30743, 1399.00167],
        [100, 1454.85]
      ]
    }
  ]
};

export const PB_SN_TRACE_SOURCE = {
  format: "phase-diagram-bspline-trace",
  version: 1,
  system: "Pb-Sn",
  source: {
    title: "Faze-Sn-Pb",
    author: "Serych",
    pageUrl: "https://commons.wikimedia.org/wiki/File:Faze-Sn-Pb.svg",
    assetUrl: "https://upload.wikimedia.org/wikipedia/commons/f/f3/Faze-Sn-Pb.svg",
    license: "Public domain",
    licenseUrl: "https://commons.wikimedia.org/wiki/File:Faze-Sn-Pb.svg#Licensing",
    changeNote: "Curves retraced as B-splines, translated, re-expressed from wt% Pb to wt% Sn by reversing the horizontal axis, and normalized to the lesson's pedagogical landmarks."
  },
  axes: {
    x: { quantity: "Tin composition", unit: "wt% Sn", min: 0, max: 100 },
    y: { quantity: "Temperature", unit: "°C", min: 20, max: 350 }
  },
  segments: [
    {
      id: "left-liquidus",
      name: "Pb-rich liquidus",
      degree: 3,
      knots: [0, 0, 0, 0, 0.33333333, 0.33333333, 0.33333333, 0.66666667, 0.66666667, 0.66666667, 1, 1, 1, 1],
      points: [[0, 327.5], [6.80035, 310.2115], [13.08455, 292.55515], [19.54941, 276.98324], [27.4724, 259.63343], [35.16312, 244.67459], [43.09902, 229.28659], [49.87357, 215.36996], [52.66081, 209.97497], [61.9, 183]]
    },
    {
      id: "right-liquidus",
      name: "Sn-rich liquidus",
      degree: 3,
      knots: [0, 0, 0, 0, 0.5, 0.5, 0.5, 1, 1, 1, 1],
      points: [[61.9, 183], [68.77735, 191.58414], [75.38013, 198.62906], [82.27056, 207.6868], [88.18037, 215.75787], [94.09019, 223.82893], [100, 231.9]]
    },
    {
      id: "left-solidus",
      name: "Pb-rich solidus",
      degree: 3,
      knots: [0, 0, 0, 0, 0.5, 0.5, 0.5, 1, 1, 1, 1],
      points: [[0, 327.5], [4.03794, 314.44166], [7.08619, 298.13407], [9.97608, 278.88375], [13.97443, 249.51782], [16.38928, 217.82223], [19.2, 183]]
    },
    {
      id: "right-solidus",
      name: "Sn-rich solidus",
      degree: 3,
      knots: [0, 0, 0, 0, 0.5, 0.5, 0.5, 1, 1, 1, 1],
      points: [[97.5, 183], [97.58491, 191.64334], [97.79245, 197.68184], [98.03774, 205.25956], [98.35849, 215.20533], [99.11321, 222.96065], [100, 231.9]]
    },
    {
      id: "left-solvus",
      name: "Pb-rich solvus",
      degree: 3,
      knots: [0, 0, 0, 0, 0.5, 0.5, 0.5, 1, 1, 1, 1],
      points: [[2, 20], [2.8731, 56.48175], [3.73372, 91.29512], [7.93706, 122.27124], [11.13009, 146.46264], [13.97389, 166.4275], [19.2, 183]]
    },
    {
      id: "right-solvus",
      name: "Sn-rich solvus",
      degree: 3,
      knots: [0, 0, 0, 0, 0.5, 0.5, 0.5, 1, 1, 1, 1],
      points: [[97.5, 183], [97.76906, 165.48209], [98.54151, 148.29785], [98.68038, 130.44626], [99.19245, 94.18697], [99.20981, 89.73797], [99.8, 20]]
    },
    {
      id: "eutectic",
      name: "Eutectic isotherm",
      degree: 1,
      knots: [0, 0, 1, 1],
      points: [[19.2, 183], [97.5, 183]]
    }
  ]
};
