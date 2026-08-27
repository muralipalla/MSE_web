// Geometry exported from the standalone Fe–C B-spline tracing editor.
// Pixel coordinates remain in the 1212 × 844 reference-image space; app.js
// maps each named boundary onto the diagram's scientific endpoint values.
export const FE_TRACE_SOURCE = {
  format: "fec-bspline-editor",
  version: 2,
  source: "fe-c-bspline-trace.json",
  reference: "fe-c-bspline-trace.svg",
  image: { width: 1212, height: 844 },
  calibration: {
    x: { pixel0: 121, value0: 0, pixel1: 1132, value1: 6.67 },
    y: { pixel0: 758, value0: 20, pixel1: 61, value1: 1600 }
  },
  segments: [
    {
      id: "liquidus-a-b",
      degree: 3,
      points: [[121, 90], [142.2389605003974, 90.38794622801257], [169.8657635553098, 95.24130352144314], [202, 109.42804022531706]],
      knots: [0, 0, 0, 0, 1, 1, 1, 1]
    },
    {
      id: "delta-liquid-a-h",
      degree: 1,
      points: [[121, 90], [138, 109.42804022531706]],
      knots: [0, 0, 1, 1]
    },
    {
      id: "liquidus-b-c",
      degree: 3,
      points: [[202, 109.42804022531706], [300, 122], [450, 151], [600, 193], [700, 229], [773, 261]],
      knots: [0, 0, 0, 0, 1 / 3, 2 / 3, 1, 1, 1, 1]
    },
    {
      id: "liquidus-c-d",
      degree: 3,
      points: [[773, 261], [850, 234], [950, 208], [1050, 191], [1100, 187], [1132, 186]],
      knots: [0, 0, 0, 0, 1 / 3, 2 / 3, 1, 1, 1, 1]
    },
    {
      id: "delta-h-n",
      degree: 3,
      points: [[138, 109.42804022531706], [132.905581089954, 127.34812869336834], [128.4255589729412, 140.4148598679891], [120.58552026816876, 154.97493174828074]],
      knots: [0, 0, 0, 0, 1, 1, 1, 1]
    },
    {
      id: "gamma-j-n",
      degree: 3,
      points: [[164.26573590904377, 109.42804022531706], [154, 126], [139, 145], [120.58552026816876, 154.97493174828074]],
      knots: [0, 0, 0, 0, 1, 1, 1, 1]
    },
    {
      id: "solidus-j-e",
      degree: 3,
      points: [[164.26573590904377, 109.42804022531706], [220, 148], [300, 192], [400, 243], [440, 261]],
      knots: [0, 0, 0, 0, 0.5, 1, 1, 1, 1]
    },
    {
      id: "a3-g-s",
      degree: 3,
      points: [[122, 365], [135, 390], [170, 410], [220, 433], [256, 448]],
      knots: [0, 0, 0, 0, 0.5, 1, 1, 1, 1]
    },
    {
      id: "alpha-g-p",
      degree: 3,
      points: [[122, 365], [125, 400], [136, 432], [151, 448]],
      knots: [0, 0, 0, 0, 1, 1, 1, 1]
    },
    {
      id: "acm-s-e",
      degree: 3,
      points: [[256, 448], [300, 404], [350, 354], [400, 303], [440, 261]],
      knots: [0, 0, 0, 0, 0.5, 1, 1, 1, 1]
    },
    {
      id: "solvus-p-q",
      degree: 3,
      points: [[151, 448], [139, 478], [130, 560], [125, 660], [123, 758]],
      knots: [0, 0, 0, 0, 0.5, 1, 1, 1, 1]
    },
    {
      id: "peritectic-h-j-b",
      degree: 1,
      constraint: "horizontal",
      points: [[138, 109.42804022531706], [164.26573590904377, 109.42804022531706], [202, 109.42804022531706]],
      knots: [0, 0, 0.5, 1, 1]
    },
    {
      id: "eutectic-e-c-f",
      degree: 1,
      constraint: "horizontal",
      points: [[440, 261], [773, 261], [1132, 261]],
      knots: [0, 0, 0.5, 1, 1]
    },
    {
      id: "eutectoid-p-s-k",
      degree: 1,
      constraint: "horizontal",
      points: [[151, 448], [256, 448], [1132, 448]],
      knots: [0, 0, 0.5, 1, 1]
    },
    {
      id: "cementite-d-f-k-q",
      degree: 1,
      points: [[1132, 186], [1132, 261], [1132, 448], [1132, 758]],
      knots: [0, 0, 1 / 3, 2 / 3, 1, 1]
    }
  ]
};
