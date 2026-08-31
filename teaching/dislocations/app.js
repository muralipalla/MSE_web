(() => {
  const frames = Array.from(document.querySelectorAll(".dislocations-embed"));
  const allowedOrigin = window.location.origin;

  if (!frames.length) return;

  const setReady = (frame) => {
    const status = frame.nextElementSibling;
    if (!status?.matches("[data-embed-status]")) return;
    status.dataset.state = "ready";
    status.textContent = "Interactive loaded. Use the controls inside the panel, or open the standalone view for maximum space.";
  };

  frames.forEach((frame) => {
    frame.addEventListener("load", () => setReady(frame), { once: true });
  });

  window.addEventListener("message", (event) => {
    if (event.origin !== allowedOrigin || event.data?.type !== "mse-visualization-resize") return;

    const frame = frames.find((candidate) => candidate.contentWindow === event.source);
    const reportedHeight = Number(event.data.height);
    if (!frame || !Number.isFinite(reportedHeight)) return;

    const safeHeight = Math.min(Math.max(Math.ceil(reportedHeight) + 4, 520), 5000);
    frame.style.height = `${safeHeight}px`;
    setReady(frame);
  });
})();
