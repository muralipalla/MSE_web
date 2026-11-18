(() => {
  "use strict";

  const size = document.getElementById("crack-size");
  const sizeValue = document.getElementById("crack-size-value");
  const intensityValue = document.getElementById("intensity-value");
  const bar = document.getElementById("intensity-bar");
  const status = document.getElementById("crack-status");
  const stress = 180;
  const toughness = 24;
  const scaleMaximum = 36;

  function describeCrack() {
    const millimetres = Number(size.value);
    const intensity = stress * Math.sqrt(Math.PI * millimetres / 1000);
    const critical = intensity >= toughness;

    sizeValue.textContent = `${millimetres.toFixed(1)} mm`;
    intensityValue.textContent = intensity.toFixed(1);
    bar.style.width = `${Math.min(100, 100 * intensity / scaleMaximum)}%`;
    bar.classList.toggle("is-critical", critical);
    status.textContent = critical ? "Crack growth predicted." : "Below the fracture threshold.";
  }

  size.addEventListener("input", describeCrack);
  describeCrack();
})();
