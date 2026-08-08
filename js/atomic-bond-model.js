export const EV_PER_ANGSTROM_CUBED_TO_GPA = 160.21766208;
export const EV_PER_ANGSTROM_SQUARED_TO_J_PER_M2 = 16.021766208;

export function miePrefactor(m, n) {
  if (!Number.isFinite(m) || !Number.isFinite(n) || m <= n || n <= 0) {
    throw new RangeError("The repulsive exponent must be greater than the attractive exponent.");
  }
  return (m / (m - n)) * Math.pow(m / n, n / (m - n));
}

export function calculateBondModel({
  epsilon = 1,
  sigma = 1,
  m = 12,
  n = 6,
  separationRatio = 1.2
} = {}) {
  const prefactor = miePrefactor(m, n);
  const x0 = sigma * Math.pow(m / n, 1 / (m - n));
  const xm = sigma * Math.pow((m * (m + 1)) / (n * (n + 1)), 1 / (m - n));
  const selectedX = separationRatio * sigma;

  const potential = (x) => {
    const ratio = sigma / x;
    return prefactor * epsilon * (Math.pow(ratio, m) - Math.pow(ratio, n));
  };

  const holdingForce = (x) => {
    const ratio = sigma / x;
    return (prefactor * epsilon / x) * (
      n * Math.pow(ratio, n) - m * Math.pow(ratio, m)
    );
  };

  const curvature = (x) => {
    const ratio = sigma / x;
    return (prefactor * epsilon / (x * x)) * (
      m * (m + 1) * Math.pow(ratio, m) -
      n * (n + 1) * Math.pow(ratio, n)
    );
  };

  const fmax = holdingForce(xm);
  const stiffness = curvature(x0);
  const bondDensity = 1 / (x0 * x0);
  const modulus = bondDensity * stiffness * x0;
  const cohesiveStrength = bondDensity * fmax;
  const separationWork = bondDensity * epsilon;
  const surfaceEnergy = separationWork / 2;
  const selectedPotential = potential(selectedX);
  const selectedForce = holdingForce(selectedX);
  const selectedTraction = bondDensity * selectedForce;
  const selectedSeparationEnergy = bondDensity * (selectedPotential + epsilon);
  const alpha = 4 * (xm - x0) / x0;

  return {
    epsilon,
    sigma,
    m,
    n,
    separationRatio,
    prefactor,
    x0,
    xm,
    selectedX,
    potential,
    holdingForce,
    curvature,
    fmax,
    stiffness,
    bondDensity,
    modulus,
    cohesiveStrength,
    separationWork,
    surfaceEnergy,
    selectedPotential,
    selectedForce,
    selectedTraction,
    selectedSeparationEnergy,
    alpha
  };
}

export function calculateShearModel({
  shearModulusGPa = 80,
  burgersNm = 0.25,
  planeSpacingNm = 0.25,
  displacementRatio = 0.25
} = {}) {
  const tauMaxGPa = (shearModulusGPa * burgersNm) / (2 * Math.PI * planeSpacingNm);
  const unstableFaultEnergyJm2 = (
    shearModulusGPa * burgersNm * burgersNm
  ) / (2 * Math.PI * Math.PI * planeSpacingNm);
  const angle = 2 * Math.PI * displacementRatio;
  const tractionGPa = tauMaxGPa * Math.sin(angle);
  const energyJm2 = (unstableFaultEnergyJm2 / 2) * (1 - Math.cos(angle));
  const displacementNm = displacementRatio * burgersNm;
  const shearStrain = displacementNm / planeSpacingNm;

  return {
    shearModulusGPa,
    burgersNm,
    planeSpacingNm,
    displacementRatio,
    displacementNm,
    shearStrain,
    tauMaxGPa,
    tractionGPa,
    unstableFaultEnergyJm2,
    energyJm2
  };
}
