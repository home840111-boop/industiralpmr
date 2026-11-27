/**
 * THD (Total Harmonic Distortion) Helper Utilities
 * Pure functions for calculating THD colors and thresholds
 * These functions are extracted outside the component to avoid recreation on every render
 */

// Voltage THD color thresholds: Green <5%, Orange 5-8%, Red >8%
export const getVoltTHDColor = (thd: number): string => {
  if (thd < 5) return "#48BB78"; // Green - Good
  if (thd < 8) return "#ED8936"; // Orange - Warning
  return "#F56565"; // Red - Bad
};

// Current THD color thresholds: Green <15%, Orange 15-30%, Red >30%
export const getAmpTHDColor = (thd: number): string => {
  if (thd < 15) return "#48BB78"; // Green - Good
  if (thd < 30) return "#ED8936"; // Orange - Warning
  return "#F56565"; // Red - Bad
};

// THD Quality Assessment
export interface THDQuality {
  status: "EXCELLENT" | "ACCEPTABLE" | "POOR";
  colorScheme: "green" | "orange" | "red";
  avgVoltTHD: number;
  avgAmpTHD: number;
}

export const calculateTHDQuality = (
  sumVoltTHD: number,
  rVoltTHD: number,
  sVoltTHD: number,
  tVoltTHD: number,
  sumAmpTHD: number,
  rAmpTHD: number,
  sAmpTHD: number,
  tAmpTHD: number,
): THDQuality => {
  const avgVoltTHD = (sumVoltTHD + rVoltTHD + sVoltTHD + tVoltTHD) / 4;
  const avgAmpTHD = (sumAmpTHD + rAmpTHD + sAmpTHD + tAmpTHD) / 4;

  const isGood = avgVoltTHD < 5 && avgAmpTHD < 15;
  const isWarning = avgVoltTHD < 8 && avgAmpTHD < 30;

  const status = isGood ? "EXCELLENT" : isWarning ? "ACCEPTABLE" : "POOR";
  const colorScheme = isGood ? "green" : isWarning ? "orange" : "red";

  return { status, colorScheme, avgVoltTHD, avgAmpTHD };
};

// Find the worst performing phase based on combined THD
export interface PhaseInfo {
  name: "L1" | "L2" | "L3";
  vthd: number;
  ithd: number;
}

export const findWorstPhase = (
  rVoltTHD: number,
  rAmpTHD: number,
  sVoltTHD: number,
  sAmpTHD: number,
  tVoltTHD: number,
  tAmpTHD: number,
): PhaseInfo => {
  const phases: PhaseInfo[] = [
    { name: "L1", vthd: rVoltTHD, ithd: rAmpTHD },
    { name: "L2", vthd: sVoltTHD, ithd: sAmpTHD },
    { name: "L3", vthd: tVoltTHD, ithd: tAmpTHD },
  ];

  return phases.reduce((prev, curr) =>
    curr.vthd + curr.ithd > prev.vthd + prev.ithd ? curr : prev,
  );
};
