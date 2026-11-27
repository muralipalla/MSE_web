(() => {
  'use strict';

  const panel = document.getElementById('rockwell-lab');
  if (!panel) return;

  const get = (id) => panel.querySelector('#rw-' + id);
  const preliminaryForce = 98.0665;
  const depthScale = 200;
  const readyY = 220;
  const referenceY = 240;
  const surfaceY = 237;
  const ball = get('ball');
  const ballRadius = ball.querySelector('circle').r.baseVal.value;
  const forceArrow = get('force-arrow');
  const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
  const scales = {
    A: {
      notation: 'HRA',
      totalKgf: 60,
      intercept: 100,
      indenter: '120° diamond cone with a 0.2 mm tip radius',
      specimens: [
        { name: 'Cemented tungsten carbide', hardness: 85, recovery: 0.020 },
        { name: 'Shallow case-hardened steel', hardness: 75, recovery: 0.022 },
      ],
    },
    B: {
      notation: 'HRBW',
      totalKgf: 100,
      intercept: 130,
      indenter: '1/16 in. (1.5875 mm) tungsten-carbide ball',
      specimens: [
        { name: 'Brass, illustrative condition', hardness: 70, recovery: 0.025 },
        { name: 'Low-carbon steel, illustrative condition', hardness: 90, recovery: 0.026 },
        { name: '6061-T6 aluminium, illustrative condition', hardness: 60, recovery: 0.030 },
      ],
    },
    C: {
      notation: 'HRC',
      totalKgf: 150,
      intercept: 100,
      indenter: '120° diamond cone with a 0.2 mm tip radius',
      specimens: [
        { name: 'Hardened steel', hardness: 60, recovery: 0.025 },
        { name: 'Tempered steel', hardness: 45, recovery: 0.030 },
        { name: 'Hardened tool steel', hardness: 62, recovery: 0.026 },
      ],
    },
  };
  const stages = [
    {
      action: 'Apply preliminary force',
      explanation: 'Seat the indenter under the preliminary force. The initial depth reading will establish the measurement reference.',
    },
    {
      action: 'Apply total force',
      explanation: 'The preliminary force is held at 98.07 N. Set this indenter position as the initial depth reference, then apply the additional force.',
      moving: 'Approaching and seating the indenter',
      movement: 'The tip travels to the surface before the preliminary force rises.',
      duration: 900,
    },
    {
      action: 'Remove additional force and read',
      explanation: 'The total force is applied. The penetration includes deformation that will recover when the additional force is removed.',
      moving: 'Increasing to total force',
      movement: 'The indenter penetrates further as the additional force comes on.',
      duration: 800,
    },
    {
      action: 'Reading complete',
      explanation: 'The additional force has been removed while the preliminary force is maintained. Elastic recovery reduces the penetration. The difference from the initial reference is the measured depth increase h.',
      moving: 'Removing additional force',
      movement: 'Elastic recovery raises the indenter as the force returns to F₀.',
      duration: 700,
    },
  ];
  let stage = 0;
  let frame = null;

  function selectedTest() {
    const scale = scales[get('scale').value];
    const specimen = scale.specimens[Number(get('specimen').value)];
    const permanentDepth = (scale.intercept - specimen.hardness) * 0.002;
    const totalForce = scale.totalKgf * 9.80665;
    const finalY = referenceY + permanentDepth * depthScale;
    const peakY = finalY + specimen.recovery * depthScale;
    const ballIndenter = get('scale').value === 'B';
    return {
      scale, specimen, permanentDepth, totalForce, finalY, peakY, ballIndenter,
      positions: [readyY, referenceY, peakY, finalY],
      forces: [0, preliminaryForce, totalForce, preliminaryForce],
    };
  }

  function drawMotion(test, tipY, currentForce) {
    let surfacePath = 'M92 ' + surfaceY + 'H322V365H92Z';
    const penetration = tipY - surfaceY;

    if (penetration > 0) {
      let cavity;
      let halfWidth;
      if (test.ballIndenter) {
        halfWidth = Math.sqrt(2 * ballRadius * penetration - penetration ** 2);
        cavity = `A${ballRadius} ${ballRadius} 0 0 0 ${(210 + halfWidth).toFixed(2)} ${surfaceY}`;
      } else if (penetration < 1.608) {
        // Only part of the rounded end is submerged during initial contact.
        halfWidth = 6 * Math.sqrt(penetration / 1.608);
        cavity = `Q210 ${(tipY + penetration).toFixed(2)} ${(210 + halfWidth).toFixed(2)} ${surfaceY}`;
      } else {
        // Match the 120-degree flanks and rounded tip in the specimen SVG.
        halfWidth = 6 + (penetration - 1.608) * Math.sqrt(3);
        cavity = 'L204 ' + (tipY - 1.608).toFixed(2)
          + 'Q210 ' + (tipY + 1.608).toFixed(2)
          + ' 216 ' + (tipY - 1.608).toFixed(2)
          + 'L' + (210 + halfWidth).toFixed(2) + ' ' + surfaceY;
      }
      surfacePath = 'M92 ' + surfaceY + 'H' + (210 - halfWidth).toFixed(2) + cavity + 'H322V365H92Z';
    }

    get('indenter-position').setAttribute('transform', `translate(0 ${tipY.toFixed(2)})`);
    get('surface').setAttribute('d', surfacePath);
    const forceText = currentForce.toFixed(2) + ' N';
    if (get('current-force').textContent !== forceText) get('current-force').textContent = forceText;
    forceArrow.toggleAttribute('hidden', currentForce === 0);
    const end = tipY - 193;
    const length = 62 * currentForce / test.totalForce;
    forceArrow.querySelector('path').setAttribute('d', `M210 ${(end - length).toFixed(1)}V${end.toFixed(1)}`);
    forceArrow.querySelector('text').setAttribute('y', (end - length / 2 + 6).toFixed(1));
  }

  function render(test = selectedTest()) {
    const { scale, specimen, permanentDepth, totalForce, peakY, finalY, ballIndenter } = test;
    const hasReference = stage >= 1;
    const hasPeak = stage >= 2;
    const complete = stage === 3;
    get('indenter').textContent = scale.indenter;
    get('total-force').textContent = totalForce.toFixed(1) + ' N (' + scale.totalKgf + ' kgf)';
    get('additional-force').textContent = (totalForce - preliminaryForce).toFixed(1) + ' N (' + (scale.totalKgf - 10) + ' kgf)';
    get('stage-name').textContent = ['Ready', 'Initial reference at preliminary force', 'Total force applied', 'Final reading at preliminary force'][stage];
    get('stage-help').textContent = stages[stage].explanation;
    get('advance').textContent = stages[stage].action;
    get('advance').disabled = complete;
    get('reset').disabled = stage === 0;
    get('scale').disabled = stage !== 0;
    get('specimen').disabled = stage !== 0;
    get('answer').disabled = !complete;
    get('check').disabled = !complete;
    get('diamond').toggleAttribute('hidden', ballIndenter);
    ball.toggleAttribute('hidden', !ballIndenter);
    drawMotion(test, test.positions[stage], test.forces[stage]);
    get('initial-reference').toggleAttribute('hidden', !hasReference);
    get('peak-reference').toggleAttribute('hidden', !hasPeak);
    get('peak-line').setAttribute('d', 'M320 ' + peakY.toFixed(1) + 'H374L396 320H405');
    get('final-reference').toggleAttribute('hidden', !complete);
    get('final-line').setAttribute('d', 'M82 ' + finalY.toFixed(1) + 'H374L396 274H405');
    get('depth-bracket').setAttribute('d', 'M351 240h12M357 240V' + finalY.toFixed(1) + 'M351 ' + finalY.toFixed(1) + 'h12');
    get('diagram-description').textContent = stages[stage].explanation + ' Current force is ' + test.forces[stage].toFixed(2) + ' newtons.';
    get('depth-reading').textContent = complete ? permanentDepth.toFixed(3) + ' mm' : stage === 2 ? 'Read after return to F₀' : hasReference ? '0.000 mm initially' : 'Reference pending';
    get('result').textContent = complete ? specimen.hardness.toFixed(0) + ' ' + scale.notation : 'Complete the loading cycle';
    get('calculation').textContent = complete
      ? scale.notation + ' = ' + scale.intercept + ' − ' + permanentDepth.toFixed(3) + '/0.002 = ' + specimen.hardness.toFixed(0)
      : 'H = N − h/0.002, with h in mm. N is 100 for A and C, and 130 for B.';
  }

  function ease(fraction) {
    return fraction * fraction * (3 - 2 * fraction);
  }

  function advance() {
    if (frame !== null || stage === 3) return;
    const test = selectedTest();
    const next = stage + 1;
    if (motionPreference.matches) {
      stage = next;
      render(test);
      return;
    }

    const transition = stages[next];
    get('advance').disabled = true;
    get('reset').disabled = false;
    get('scale').disabled = true;
    get('specimen').disabled = true;
    get('stage-name').textContent = transition.moving;
    get('stage-help').textContent = transition.movement;
    get('diagram-description').textContent = transition.movement;
    const fromY = test.positions[stage];
    const toY = test.positions[next];
    const fromForce = test.forces[stage];
    const toForce = test.forces[next];
    const approach = 0.64;
    let start;

    function move(time) {
      start ??= time;
      const progress = (time - start) / transition.duration;
      if (progress >= 1 || motionPreference.matches) {
        frame = null;
        stage = next;
        render(test);
        return;
      }
      if (next === 1 && progress < approach) {
        drawMotion(test, readyY + (surfaceY - readyY) * ease(progress / approach), 0);
      } else {
        const easing = ease(next === 1 ? (progress - approach) / (1 - approach) : progress);
        const seatedY = next === 1 ? surfaceY : fromY;
        drawMotion(test, seatedY + (toY - seatedY) * easing, fromForce + (toForce - fromForce) * easing);
      }
      frame = requestAnimationFrame(move);
    }

    frame = requestAnimationFrame(move);
  }

  function reset() {
    if (frame !== null) cancelAnimationFrame(frame);
    frame = null;
    stage = 0;
    get('answer').value = '';
    get('feedback').textContent = 'Complete the cycle, then use h to check the hardness calculation.';
    render();
  }

  function chooseScale() {
    const scale = scales[get('scale').value];
    get('specimen').replaceChildren(...scale.specimens.map((specimen, index) => {
      const option = document.createElement('option');
      option.value = String(index);
      option.textContent = specimen.name;
      return option;
    }));
    reset();
  }

  get('scale').addEventListener('change', chooseScale);
  get('specimen').addEventListener('change', reset);
  get('advance').addEventListener('click', advance);
  get('reset').addEventListener('click', reset);
  get('calculation-check').addEventListener('submit', (event) => {
    event.preventDefault();
    const answer = get('answer').valueAsNumber;
    const { scale, specimen } = selectedTest();
    get('feedback').textContent = Math.abs(answer - specimen.hardness) <= 0.1
      ? 'Correct. Report the value with its scale, ' + specimen.hardness + ' ' + scale.notation + '.'
      : 'Use the measured depth increase h in mm and the intercept for this scale.';
  });
  chooseScale();
})();
