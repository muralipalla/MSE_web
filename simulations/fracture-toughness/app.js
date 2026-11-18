(() => {
  const get = (id) => document.getElementById(id);
  const svgNamespace = 'http://www.w3.org/2000/svg';
  const edges = { left: 66, right: 532, top: 24, bottom: 310 };
  const yieldStrength = 450;
  const geometries = {
    compact: {
      name: 'Compact tension',
      code: 'C(T)',
      caption: 'Two pins pull the specimen apart and open the crack in Mode I.',
      description: 'The width and crack length are measured from the pin load line. The thickness extends into the page.',
      factor: (x) => (2 + x) * (0.886 + 4.64 * x - 13.32 * x ** 2 + 14.72 * x ** 3 - 5.6 * x ** 4) / (1 - x) ** 1.5,
      multiplier: (b, w) => 1 / (b * Math.sqrt(w)),
    },
    bend: {
      name: 'Single-edge bend',
      code: 'SE(B)',
      caption: 'The center roller loads the specimen against two supports. Bending places the crack mouth in tension.',
      description: 'The span is measured between the supports. The crack length extends from the notched surface to the fatigue crack tip.',
      factor: (x) => 3 * Math.sqrt(x) * (1.99 - x * (1 - x) * (2.15 - 3.93 * x + 2.7 * x ** 2)) / (2 * (1 + 2 * x) * (1 - x) ** 1.5),
      multiplier: (b, w, span) => span / (b * w ** 1.5),
    },
  };
  const inputs = ['specimen', 'size', 'response'].map(get);
  let trial;
  let state = 'setup';
  let frame;

  function makeTrial() {
    const method = get('specimen').value;
    const geometry = geometries[method];
    const width = Number(get('size').value);
    const thickness = width / 2;
    const crack = width / 2;
    const ligament = width - crack;
    const span = 4 * width;
    const factor = geometry.factor(crack / width);
    const coefficient = geometry.multiplier(thickness / 1000, width / 1000, span / 1000) * factor;
    // Normalize the traces to the same conditional toughness so the screens can be compared directly.
    const pq = 37.5 * 1e6 / coefficient;
    const kq = pq * coefficient / 1e6;
    const excess = get('response').value === 'small' ? 0.07 : 0.25;
    const pmax = pq * (1 + excess);
    const ratio = pmax / pq;
    const minimumLigament = 2500 * (kq / yieldStrength) ** 2;
    const qOpening = width === 40 ? 0.12 : 0.075;
    const slope = pq / (0.95 * qOpening);
    const endSlope = (1 - 0.1 / 0.6) / 0.95;
    const peak = 1 + 2 * excess / endSlope;
    const end = peak + 0.10;
    const force = (u) => {
      if (u <= 1) {
        const curvature = Math.max(0, u - 0.4) / 0.6;
        return pq * (u - 0.05 * curvature ** 2) / 0.95;
      }
      if (u <= peak) {
        const t = (u - 1) / (peak - 1);
        return pq * (1 + excess * (2 * t - t ** 2));
      }
      return pmax * (end - u) / (end - peak);
    };
    return { method, geometry, width, thickness, crack, ligament, span, factor, pq, kq, pmax, ratio, minimumLigament, qOpening, slope, peak, end, force };
  }

  function svgChild(name, attrs, content) {
    const node = document.createElementNS(svgNamespace, name);
    for (const [attribute, value] of Object.entries(attrs)) node.setAttribute(attribute, value);
    if (content !== undefined) node.textContent = content;
    return node;
  }

  function coordinates() {
    const maxOpening = Math.ceil(trial.end * trial.qOpening / 0.04) * 0.04;
    const stepForce = trial.pmax > 10000 ? 5000 : trial.pmax > 4000 ? 2000 : 1000;
    const maxForce = Math.ceil(trial.pmax * 1.18 / stepForce) * stepForce;
    return {
      maxOpening, maxForce, stepForce,
      x: (opening) => edges.left + (edges.right - edges.left) * opening / maxOpening,
      y: (force) => edges.bottom - (edges.bottom - edges.top) * force / maxForce,
    };
  }

  function drawAxes() {
    const { maxOpening, maxForce, stepForce, x, y } = coordinates();
    const nodes = [];
    const add = (name, attrs, content) => nodes.push(svgChild(name, attrs, content));
    for (let i = 0; i <= Math.round(maxOpening / 0.04); i += 1) {
      const opening = i * 0.04;
      add('line', { x1: x(opening), x2: x(opening), y1: edges.top, y2: edges.bottom, class: 'grid-line' });
      add('text', { x: x(opening), y: edges.bottom + 24, 'text-anchor': 'middle' }, opening.toFixed(2));
    }
    for (let force = 0; force <= maxForce; force += stepForce) {
      add('line', { x1: edges.left, x2: edges.right, y1: y(force), y2: y(force), class: 'grid-line' });
      add('text', { x: edges.left - 10, y: y(force) + 5, 'text-anchor': 'end' }, force / 1000);
    }
    add('path', { d: `M${edges.left} ${edges.top} V${edges.bottom} H${edges.right}`, class: 'plot-axis' });
    add('text', { x: (edges.left + edges.right) / 2, y: 361, 'text-anchor': 'middle', class: 'axis-label' }, 'Crack-mouth opening (mm)');
    add('text', { x: 19, y: (edges.top + edges.bottom) / 2, 'text-anchor': 'middle', transform: 'rotate(-90 19 167)', class: 'axis-label' }, 'Force (kN)');
    get('plot-grid').replaceChildren(...nodes);
  }

  function drawTrace(progress) {
    const { x, y } = coordinates();
    const end = trial.end * progress;
    const points = Array.from({ length: 121 }, (_, i) => end * i / 120);
    // Include the exact secant crossing and peak in the rendered record.
    points.push(...[1, trial.peak].filter((u) => u < end));
    points.sort((a, b) => a - b);
    const path = points.map((u) => `${x(u * trial.qOpening).toFixed(2)} ${y(trial.force(u)).toFixed(2)}`).join(' L');
    get('record-line').setAttribute('d', `M${path}`);
  }

  function annotatePlot() {
    const { maxOpening, maxForce, x, y } = coordinates();
    const drawSlope = (id, slope) => {
      const end = Math.min(maxOpening, maxForce / slope);
      get(id).setAttribute('d', `M${x(0)} ${y(0)} L${x(end)} ${y(end * slope)}`);
      get(id).toggleAttribute('hidden', false);
    };
    drawSlope('elastic-line', trial.slope);
    drawSlope('secant-line', 0.95 * trial.slope);
    const pqX = x(trial.qOpening);
    const pqY = y(trial.pq);
    const peakX = x(trial.peak * trial.qOpening);
    const peakY = y(trial.pmax);
    get('pq-guide').setAttribute('d', `M${edges.left} ${pqY} H${pqX} V${edges.bottom}`);
    get('pq-dot').setAttribute('cx', pqX);
    get('pq-dot').setAttribute('cy', pqY);
    get('pq-label').setAttribute('x', pqX - 13);
    get('pq-label').setAttribute('y', pqY - 10);
    get('max-dot').setAttribute('cx', peakX);
    get('max-dot').setAttribute('cy', peakY);
    get('max-label').setAttribute('x', peakX + 10);
    get('max-label').setAttribute('y', peakY - 12);
    get('plot-markers').toggleAttribute('hidden', false);
    get('curve-desc').textContent = `The 95% secant intersects the force trace at ${trial.qOpening.toFixed(3)} millimetres and ${(trial.pq / 1000).toFixed(2)} kilonewtons. The maximum force is ${(trial.pmax / 1000).toFixed(2)} kilonewtons.`;
  }

  function showReadings() {
    get('reading-pq').textContent = `${(trial.pq / 1000).toFixed(2)} kN`;
    get('reading-max').textContent = `${(trial.pmax / 1000).toFixed(2)} kN`;
    get('reading-factor').textContent = trial.factor.toFixed(3);
    get('reading-kq').textContent = `${trial.kq.toFixed(1)} MPa√m`;
    const forcePass = trial.ratio <= 1.10;
    const sizePass = trial.ligament >= trial.minimumLigament;
    const showScreen = (id, passed, content) => {
      get(id).className = passed ? 'pass' : 'fail';
      get(id).textContent = `${passed ? 'Pass' : 'Fail'} · ${content}`;
    };
    showScreen('ratio-screen', forcePass, `${trial.ratio.toFixed(2)} ${forcePass ? '≤' : '>'} 1.10`);
    showScreen('size-screen', sizePass, `${trial.ligament} mm ${sizePass ? '≥' : '<'} ${trial.minimumLigament.toFixed(2)} mm`);
    get('qualification').textContent = forcePass && sizePass
      ? 'Both illustrated checks pass. Reporting K_Ic from a real test also requires the applicable ASTM E399 checks for specimen proportions, loading rate, and precrack geometry.'
      : 'At least one illustrated check fails. The reported value remains conditional K_Q.';
  }

  function updateControls() {
    for (const input of inputs) input.disabled = state !== 'setup';
    get('mount').disabled = state !== 'setup';
    get('run').disabled = state !== 'mounted';
    get('reset').disabled = state === 'setup';
    for (const id of ['record', 'answer', 'check']) get(id).disabled = state !== 'complete';
  }

  function setup() {
    cancelAnimationFrame(frame);
    state = 'setup';
    trial = makeTrial();
    const { method, geometry, width, thickness, crack, ligament, span } = trial;
    get('fixture-name').textContent = geometry.name;
    get('fixture-code').textContent = geometry.code;
    get('fixture-caption').textContent = geometry.caption;
    get('specimen-title').textContent = `Precracked ${geometry.name.toLowerCase()} specimen`;
    get('specimen-desc').textContent = geometry.description;
    get('compact-fixture').toggleAttribute('hidden', method !== 'compact');
    get('bend-fixture').toggleAttribute('hidden', method !== 'bend');
    for (const code of ['compact', 'bend']) {
      get(`${code}-a`).textContent = `a = ${crack} mm`;
      get(`${code}-w`).textContent = `W = ${width} mm`;
    }
    get('bend-span').textContent = `S = ${span} mm`;
    get('dim-b').textContent = `${thickness} mm`;
    get('dim-a').textContent = `${crack} mm`;
    get('dim-ligament').textContent = `${ligament} mm`;
    drawAxes();
    get('record-line').removeAttribute('d');
    for (const id of ['elastic-line', 'secant-line', 'plot-markers']) get(id).toggleAttribute('hidden', true);
    get('curve-desc').textContent = 'Run the test to show the force–opening record and the 95% secant.';
    for (const id of ['reading-pq', 'reading-max', 'reading-factor', 'reading-kq']) get(id).textContent = '—';
    for (const id of ['ratio-screen', 'size-screen']) {
      get(id).className = '';
      get(id).textContent = 'Run a test to check.';
    }
    get('qualification').textContent = 'Two qualification checks are illustrated here. Reporting K_Ic from a real test also requires the applicable ASTM E399 checks for specimen proportions, loading rate, and precrack geometry.';
    get('lab-status').textContent = 'Choose your settings and mount the precracked specimen.';
    get('check-status').textContent = 'Run a test first.';
    get('answer').value = '';
    updateControls();
  }

  get('mount').addEventListener('click', () => {
    state = 'mounted';
    get('lab-status').textContent = `${trial.geometry.code} specimen mounted. Clip gauge zeroed.`;
    updateControls();
  });

  get('run').addEventListener('click', () => {
    state = 'running';
    get('lab-status').textContent = 'Applying load and measuring crack-mouth opening…';
    updateControls();
    const duration = matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 1600;
    const start = performance.now();
    const animate = (time) => {
      const progress = duration ? Math.max(0, Math.min(1, (time - start) / duration)) : 1;
      drawTrace(progress);
      if (progress < 1) {
        frame = requestAnimationFrame(animate);
        return;
      }
      state = 'complete';
      annotatePlot();
      showReadings();
      updateControls();
      get('lab-status').textContent = 'Test complete. Read the 95% secant intersection and assess the result.';
      get('check-status').textContent = 'Use the conditional force and dimensions to check the result in SI units.';
    };
    frame = requestAnimationFrame(animate);
  });

  get('record').addEventListener('click', () => {
    const row = get('results-body').insertRow();
    const readings = [
      trial.geometry.code, trial.width, (trial.pq / 1000).toFixed(2), trial.kq.toFixed(1),
      trial.ratio <= 1.10 ? 'Pass' : 'Fail', trial.ligament >= trial.minimumLigament ? 'Pass' : 'Fail',
    ];
    for (const reading of readings) row.insertCell().textContent = reading;
    get('results-empty').hidden = true;
    get('results-wrap').hidden = false;
    get('record').disabled = true;
    get('lab-status').textContent = 'Result recorded. Reset the apparatus to run another test.';
  });

  get('calculation-check').addEventListener('submit', (event) => {
    event.preventDefault();
    const answer = get('answer').valueAsNumber;
    get('check-status').textContent = Math.abs(answer - trial.kq) <= 0.4
      ? 'Correct within rounding. Use the force and size checks to interpret this value.'
      : 'Check the geometry factor and convert kN to N and mm to m before calculating.';
  });

  for (const input of inputs) input.addEventListener('change', setup);
  get('reset').addEventListener('click', setup);
  setup();
})();
