/**
 * System Metrics Calculation Utilities
 * Pure functions for calculating performance metrics
 * Extracted to prevent recalculation on every render - memoized in component
 */

export interface MetricResult {
  value: number;
  color: string;
  displayValue: string;
}

// System Efficiency: (Active Power / Apparent Power) × 100
// Good >85%, Warning 70-85%, Bad <70%
export const calculateSystemEfficiency = (
  activePower: number,
  apparentPower: number,
): MetricResult => {
  // Safeguard against division by zero
  if (apparentPower === 0 || !Number.isFinite(apparentPower)) {
    return { value: 0, color: "#F56565", displayValue: "0.0%" };
  }

  const efficiency = (activePower / apparentPower) * 100;
  const color =
    efficiency > 85 ? "#48BB78" : efficiency > 70 ? "#ED8936" : "#F56565";

  return {
    value: Math.min(efficiency, 100),
    color,
    displayValue: `${efficiency.toFixed(1)}%`,
  };
};

// Phase Imbalance: (MaxCurrent - MinCurrent) / AvgCurrent × 100
// Good <10%, Warning 10-20%, Bad >20%
export const calculatePhaseImbalance = (
  rAmp: number,
  sAmp: number,
  tAmp: number,
): MetricResult => {
  const currents = [rAmp, sAmp, tAmp];
  const maxCurr = Math.max(...currents);
  const minCurr = Math.min(...currents);
  const avgCurr = currents.reduce((a, b) => a + b) / 3;

  // Safeguard against division by zero
  if (avgCurr === 0 || !Number.isFinite(avgCurr)) {
    return { value: 0, color: "#48BB78", displayValue: "0.0%" };
  }

  const imbalance = ((maxCurr - minCurr) / avgCurr) * 100;
  const color =
    imbalance < 10 ? "#48BB78" : imbalance < 20 ? "#ED8936" : "#F56565";

  return {
    value: Math.min(imbalance * 3.33, 100), // Scale to 0-100 for progress bar (30% imbalance = 100%)
    color,
    displayValue: `${imbalance.toFixed(1)}%`,
  };
};

// Load Factor: (Current / MaxCurrent) × 100
// Good 60-80%, Warning <60% or 80-90%, Critical >90%
export const calculateLoadFactor = (
  current: number,
  maxCurrent: number,
): MetricResult => {
  // Safeguard against division by zero
  if (maxCurrent === 0 || !Number.isFinite(maxCurrent)) {
    return { value: 0, color: "#4299E1", displayValue: "0.0%" };
  }

  const loadFactor = (current / maxCurrent) * 100;
  const color =
    loadFactor < 60
      ? "#4299E1"
      : loadFactor < 80
        ? "#48BB78"
        : loadFactor < 90
          ? "#ED8936"
          : "#F56565";

  return {
    value: Math.min(loadFactor, 100),
    color,
    displayValue: `${loadFactor.toFixed(1)}%`,
  };
};

// Voltage Deviation: |(Voltage - NominalVoltage) / NominalVoltage| × 100
// Good <3%, Warning 3-6%, Bad >6%
export const calculateVoltageDeviation = (
  voltage: number,
  nominalVoltage: number = 230,
): MetricResult => {
  // Safeguard against division by zero
  if (nominalVoltage === 0 || !Number.isFinite(nominalVoltage)) {
    return { value: 0, color: "#48BB78", displayValue: "±0.00%" };
  }

  const deviation = Math.abs((voltage - nominalVoltage) / nominalVoltage) * 100;
  const color =
    deviation < 3 ? "#48BB78" : deviation < 6 ? "#ED8936" : "#F56565";

  return {
    value: Math.min((deviation / 10) * 100, 100), // Scale to 0-100 for progress bar (10% deviation = 100%)
    color,
    displayValue: `±${deviation.toFixed(2)}%`,
  };
};

// Displacement Power Factor
// Good >0.9, Warning 0.75-0.9, Bad <0.75
export interface DisplacementPFResult extends MetricResult {
  pfType: "Capacitive" | "Inductive";
  absolutePF: number;
}

export const calculateDisplacementPF = (
  powerFactor: number,
): DisplacementPFResult => {
  // Safeguard against invalid power factor
  if (!Number.isFinite(powerFactor)) {
    return {
      value: 0,
      color: "#F56565",
      displayValue: "0.000",
      pfType: "Inductive",
      absolutePF: 0,
    };
  }

  const absolutePF = Math.abs(powerFactor);
  const color =
    absolutePF > 0.9 ? "#48BB78" : absolutePF > 0.75 ? "#ED8936" : "#F56565";
  const pfType = powerFactor < 0 ? "Capacitive" : "Inductive";

  return {
    value: absolutePF * 100,
    color,
    displayValue: absolutePF.toFixed(3),
    pfType,
    absolutePF,
  };
};

// Calculate all system metrics at once for better performance
export interface AllMetrics {
  efficiency: MetricResult;
  imbalance: MetricResult;
  loadFactor: MetricResult;
  voltageDeviation: MetricResult;
  displacementPF: DisplacementPFResult;
}

export const calculateAllMetrics = (
  activePower: number,
  apparentPower: number,
  sumAmp: number,
  rAmp: number,
  sAmp: number,
  tAmp: number,
  sumVolt: number,
  powerFactor: number,
  maxCurrent: number,
): AllMetrics => {
  return {
    efficiency: calculateSystemEfficiency(activePower, apparentPower),
    imbalance: calculatePhaseImbalance(rAmp, sAmp, tAmp),
    loadFactor: calculateLoadFactor(sumAmp, maxCurrent),
    voltageDeviation: calculateVoltageDeviation(sumVolt),
    displacementPF: calculateDisplacementPF(powerFactor),
  };
};
