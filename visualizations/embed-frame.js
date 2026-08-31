(() => {
  const isEmbedded = document.documentElement.classList.contains("is-embedded");
  if (!isEmbedded || window.parent === window) return;

  let animationFrame = 0;

  const reportHeight = () => {
    animationFrame = 0;
    const bodyHeight = document.body ? document.body.getBoundingClientRect().height : 0;
    const mainHeight = document.querySelector("main")?.getBoundingClientRect().height ?? 0;
    const height = Math.ceil(Math.max(bodyHeight, mainHeight, 1));
    window.parent.postMessage({ type: "mse-visualization-resize", height }, window.location.origin);
  };

  const scheduleReport = () => {
    if (animationFrame) cancelAnimationFrame(animationFrame);
    animationFrame = requestAnimationFrame(reportHeight);
  };

  window.addEventListener("load", scheduleReport);
  window.addEventListener("resize", scheduleReport);
  document.addEventListener("DOMContentLoaded", () => {
    if ("ResizeObserver" in window && document.body) {
      const resizeObserver = new ResizeObserver(scheduleReport);
      resizeObserver.observe(document.body);
    }
    scheduleReport();
  });
})();
