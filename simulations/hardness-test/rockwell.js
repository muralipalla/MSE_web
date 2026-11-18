(() => {
  'use strict';

  const panel = document.getElementById('rockwell-lab');
  if (!panel) return;

  const get = (id) => panel.querySelector('#rw-' + id);
  const preliminaryForce = 98.0665;
  const depthScale = 300;
  const referenceY = 240;
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
    },
    {
      action: 'Remove additional force and read',
      explanation: 'The total force is applied. The penetration includes deformation that will recover when the additional force is removed.',
    },
    {
      action: 'Reading complete',
      explanation: 'The additional force has been removed while the preliminary force is maintained. Elastic recovery reduces the penetration. The difference from the initial reference is the measured depth increase h.',
    },
  ];
  let stage = 0;

  function selectedTest() {
    const scale = scales[get('scale').value];
    const specimen = scale.specimens[Number(get('specimen').value)];
    const permanentDepth = (scale.intercept - specimen.hardness) * 0.002;
    const totalForce = scale.totalKgf * 9.80665;
    return { scale, specimen, permanentDepth, totalForce };
  }

  function render() {
    const { scale, specimen, permanentDepth, totalForce } = selectedTest();
    const hasReference = stage >= 1;
    const hasPeak = stage >= 2;
    const complete = stage === 3;
    const measuredDepth = complete ? permanentDepth : stage === 2 ? permanentDepth + specimen.recovery : 0;
    const currentForce = stage === 0 ? 0 : stage === 2 ? totalForce : preliminaryForce;
    const tipY = stage === 0 ? 220 : referenceY + measuredDepth * depthScale;
    const finalY = referenceY + permanentDepth * depthScale;
    const peakY = referenceY + (permanentDepth + specimen.recovery) * depthScale;
    const ballIndenter = get('scale').value === 'B';
    let surfacePath = 'M92 230H322V365H92Z';

    if (stage > 0) {
      const penetration = tipY - 230;
      let cavity;
      let halfWidth;
      if (ballIndenter) {
        const radius = 80;
        halfWidth = Math.sqrt(2 * radius * penetration - penetration ** 2);
        cavity = 'A80 80 0 0 0 ' + (210 + halfWidth).toFixed(2) + ' 230';
      } else {
        // Match the 120-degree flanks and rounded tip in the specimen SVG.
        halfWidth = 6 + (penetration - 1.608) * Math.sqrt(3);
        cavity = 'L204 ' + (tipY - 1.608).toFixed(2)
          + 'Q210 ' + (tipY + 1.608).toFixed(2)
          + ' 216 ' + (tipY - 1.608).toFixed(2)
          + 'L' + (210 + halfWidth).toFixed(2) + ' 230';
      }
      surfacePath = 'M92 230H' + (210 - halfWidth).toFixed(2) + cavity + 'H322V365H92Z';
    }

    get('indenter').textContent = scale.indenter;
    get('total-force').textContent = totalForce.toFixed(1) + ' N (' + scale.totalKgf + ' kgf)';
    get('additional-force').textContent = (totalForce - preliminaryForce).toFixed(1) + ' N (' + (scale.totalKgf - 10) + ' kgf)';
    get('current-force').textContent = currentForce.toFixed(2) + ' N';
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
    get('ball').toggleAttribute('hidden', !ballIndenter);
    get('indenter-position').setAttribute('transform', 'translate(0 ' + tipY.toFixed(1) + ')');
    get('surface').setAttribute('d', surfacePath);
    get('initial-reference').toggleAttribute('hidden', !hasReference);
    get('peak-reference').toggleAttribute('hidden', !hasPeak);
    get('peak-line').setAttribute('y1', peakY.toFixed(1));
    get('peak-line').setAttribute('y2', peakY.toFixed(1));
    get('peak-label').setAttribute('y', (peakY + 5).toFixed(1));
    get('final-reference').toggleAttribute('hidden', !complete);
    get('final-line').setAttribute('y1', finalY.toFixed(1));
    get('final-line').setAttribute('y2', finalY.toFixed(1));
    get('final-label').setAttribute('y', (finalY - 8).toFixed(1));
    get('depth-bracket').setAttribute('d', 'M351 240h12M357 240V' + finalY.toFixed(1) + 'M351 ' + finalY.toFixed(1) + 'h12');
    get('depth-symbol').setAttribute('y', ((referenceY + finalY) / 2 + 6).toFixed(1));
    get('force-arrow').toggleAttribute('hidden', currentForce === 0);
    const forceArrowEnd = tipY - (ballIndenter ? 220 : 145) + 3;
    const forceArrowLength = 70 * currentForce / totalForce;
    get('force-arrow').querySelector('path').setAttribute('d', 'M210 ' + (forceArrowEnd - forceArrowLength).toFixed(1) + 'V' + forceArrowEnd.toFixed(1));
    get('force-arrow').querySelector('text').setAttribute('y', (forceArrowEnd - forceArrowLength / 2 + 6).toFixed(1));
    get('diagram-description').textContent = stages[stage].explanation + ' Current force is ' + currentForce.toFixed(2) + ' newtons.';
    get('depth-reading').textContent = complete ? permanentDepth.toFixed(3) + ' mm' : stage === 2 ? 'Read after return to F₀' : hasReference ? '0.000 mm initially' : 'Reference pending';
    get('result').textContent = complete ? specimen.hardness.toFixed(0) + ' ' + scale.notation : 'Complete the loading cycle';
    get('calculation').textContent = complete
      ? scale.notation + ' = ' + scale.intercept + ' − ' + permanentDepth.toFixed(3) + '/0.002 = ' + specimen.hardness.toFixed(0)
      : 'H = N − h/0.002, with h in mm. N is 100 for A and C, and 130 for B.';
  }

  function reset() {
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
  get('advance').addEventListener('click', () => {
    stage += 1;
    render();
  });
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
