(function () {
  "use strict";

  const demo = document.querySelector("[data-lmp-demo]");
  const chart = demo.querySelector("[data-lmp-plot]");
  const stressInput = demo.querySelector("#lmp-stress");
  const temperatureInput = demo.querySelector("#lmp-temperature");
  const { colours, format, plot, controlValues, showResults, refreshOnResize } = window.MSEServiceLife;
  const constant = 20;
  const kelvin = celsius => celsius + 273.15;
  const scaledParameter = (temperature, hours) => kelvin(temperature) * (constant + Math.log10(hours)) / 1000;

  // NCF718-B heat iGB. Measured rupture times from Sawada et al. (2024), Figure 10.
  const fittingTests = [
    { temperature: 550, stress: 700, hours: 120825.9 },
    { temperature: 600, stress: 500, hours: 39015.3 },
    { temperature: 650, stress: 300, hours: 14610.2 }
  ];
  const heldOut = { temperature: 750, stress: 100, hours: 1595.2 };
  const measuredPoint = ({ temperature, stress, hours }) => [scaledParameter(temperature, hours), stress];
  const mean = values => values.reduce((total, value) => total + value, 0) / values.length;
  const testLogStress = fittingTests.map(test => Math.log10(test.stress));
  const testParameters = fittingTests.map(test => scaledParameter(test.temperature, test.hours));
  const meanStress = mean(testLogStress);
  const meanParameter = mean(testParameters);
  const stressVariance = testLogStress.reduce((sum, stress) => sum + (stress - meanStress) ** 2, 0);
  const covariance = testLogStress.reduce((sum, stress, index) =>
    sum + (stress - meanStress) * (testParameters[index] - meanParameter), 0);
  const slope = covariance / stressVariance;
  const intercept = meanParameter - slope * meanStress;
  const fitAtStress = stress => [intercept + slope * Math.log10(stress), stress];

  const minFitStress = Math.min(...fittingTests.map(test => test.stress));
  const maxFitStress = Math.max(...fittingTests.map(test => test.stress));
  const minFitTemperature = Math.min(...fittingTests.map(test => test.temperature));
  const maxFitTemperature = Math.max(...fittingTests.map(test => test.temperature));
  const minFitTime = Math.min(...fittingTests.map(test => test.hours));
  const maxFitTime = Math.max(...fittingTests.map(test => test.hours));
  const holdoutPoint = measuredPoint(heldOut);
  const baseSeries = [
    { points: [fitAtStress(maxFitStress), fitAtStress(minFitStress)], label: "Fit across test stresses" },
    { points: [fitAtStress(minFitStress), fitAtStress(Number(stressInput.min))], dashed: true, label: "Extrapolation" },
    { points: fittingTests.map(measuredPoint), colour: colours.blue, dots: 5, marker: "solid", label: "Measured tests" },
    { points: [holdoutPoint], colour: colours.lavender, dots: 5, marker: "plus", label: "Held-out test" }
  ];

  const table = demo.querySelector("[data-lmp-tests]");
  for (const test of [...fittingTests, heldOut]) {
    const row = table.insertRow();
    const values = [test.temperature, test.stress, format(test.hours, 1),
      measuredPoint(test)[0].toFixed(3), test === heldOut ? "Held out" : "Fit"];
    for (const value of values) row.insertCell().textContent = value;
  }

  function closestCalibrationTest(stress, temperature) {
    return fittingTests.reduce((closest, test) => {
      const stressGap = Math.abs(test.stress - stress) - Math.abs(closest.stress - stress);
      if (stressGap !== 0) return stressGap < 0 ? test : closest;
      return Math.abs(test.temperature - temperature) < Math.abs(closest.temperature - temperature) ? test : closest;
    });
  }

  function render() {
    const { lmpTemperature: temperature, lmpStress: stress } = controlValues(demo);
    const prediction = fitAtStress(stress);
    const parameter = prediction[0];
    const hours = 10 ** (parameter * 1000 / kelvin(temperature) - constant);
    const hoursText = hours >= 1e7 ? hours.toExponential(2) : format(Number(hours.toPrecision(3)), 2);
    const scope = [stress < minFitStress ? "Stress extrapolation below 300 MPa." : "Stress is within the 300–700 MPa fit range."];
    if (temperature < minFitTemperature || temperature > maxFitTemperature) {
      scope.push("Temperature is outside the 550–650 °C calibration range.");
    }
    if (hours < minFitTime) {
      scope.push("Predicted life is shorter than the shortest calibration test (" + format(minFitTime, 1) + " h).");
    } else if (hours > maxFitTime) {
      scope.push("Predicted life is longer than the longest calibration test (" + format(maxFitTime, 1) + " h).");
    }
    const closest = closestCalibrationTest(stress, temperature);
    const isCalibrationTest = stress === closest.stress && temperature === closest.temperature;
    const isHeldOut = stress === heldOut.stress && temperature === heldOut.temperature;
    if (!isCalibrationTest && !isHeldOut) {
      scope.push("The three calibration tests used other stress–temperature pairs.");
    }
    const measurement = isHeldOut ? heldOut : closest;
    const label = isHeldOut ? "Held-out test at this condition" : isCalibrationTest
      ? "Calibration test at this condition" : "Closest calibration test by stress";
    showResults(demo, {
      lmpLife: hoursText + " h",
      lmpValue: parameter.toFixed(3),
      lmpRange: scope.join(" "),
      lmpTest: label + " · " + measurement.stress + " MPa at " + measurement.temperature + " °C · measured rupture at "
        + format(measurement.hours, 1) + " h."
    });
    plot(chart, {
      x: { label: "Larson–Miller parameter (10³ K)", range: [20, 25], ticks: [20, 21, 22, 23, 24, 25] },
      y: { label: "Stress (MPa)", range: [80, 840], log: true, ticks: [100, 200, 300, 500, 700] },
      series: [...baseSeries, { points: [prediction], colour: colours.coral, dots: 6, label: "Selected prediction" }],
      guides: [
        { axis: "y", value: stress, colour: "#aa553899" },
        { axis: "x", value: parameter, colour: "#aa553899" }
      ],
      description: "Logarithmic rupture stress versus Larson–Miller parameter. The line fits three measured points from 300 to 700 MPa and is dashed below 300 MPa. A separate test at 100 MPa was held out."
    });
  }

  demo.addEventListener("input", render);
  for (const button of demo.querySelectorAll("[data-lmp-stress]")) {
    button.addEventListener("click", () => {
      stressInput.value = button.dataset.lmpStress;
      temperatureInput.value = button.dataset.lmpTemperature;
      render();
    });
  }
  refreshOnResize([chart], render);
  render();
}());
