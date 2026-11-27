/**
 * Voltage Helper Utilities
 * Functions for voltage color mapping and range checking
 */

// Special voltage color mapping: 200-250 green, <200 red, >250 orange->red
export const getVoltageColors = (value: number): string[] => {
  if (value >= 200 && value <= 250) {
    return ["#48BB78", "#48BB78", "#48BB78"]; // All green - Optimal range
  } else if (value < 200) {
    return ["#F56565", "#F56565", "#F56565"]; // All red - Low voltage
  } else if (value > 250 && value <= 300) {
    return ["#ED8936", "#ED8936", "#ED8936"]; // Orange - High voltage
  } else {
    return ["#F56565", "#F56565", "#F56565"]; // Red - Extreme high voltage
  }
};

// Line-to-Line voltage color mapping: 380-440 green, <380 red, >440 orange->red
export const getLineVoltageColors = (value: number): string[] => {
  if (value >= 380 && value <= 440) {
    return ["#48BB78", "#48BB78", "#48BB78"]; // All green - Optimal range
  } else if (value < 380) {
    return ["#F56565", "#F56565", "#F56565"]; // All red - Low voltage
  } else if (value > 440 && value <= 500) {
    return ["#ED8936", "#ED8936", "#ED8936"]; // Orange - High voltage
  } else {
    return ["#F56565", "#F56565", "#F56565"]; // Red - Extreme high voltage
  }
};

// Generate sine wave data points for frequency visualization
// Memoized in the component to prevent regeneration on every render
export interface SineWavePoint {
  x: number;
  y: number;
}

export const generateSineWaveData = (
  frequency: number,
  points: number = 100,
): SineWavePoint[] => {
  const data: SineWavePoint[] = [];

  for (let i = 0; i < points; i++) {
    const x = i / points;
    const y = Math.sin((x * 2 * Math.PI * frequency) / 50);
    data.push({ x, y });
  }

  return data;
};

// Check if frequency is within stable range
export const isFrequencyStable = (frequency: number): boolean => {
  return frequency >= 49.8 && frequency <= 50.2;
};

// Get frequency status badge info
export interface FrequencyStatus {
  isStable: boolean;
  color: string;
  colorScheme: "green" | "orange";
  label: string;
}

export const getFrequencyStatus = (frequency: number): FrequencyStatus => {
  const isStable = isFrequencyStable(frequency);

  return {
    isStable,
    color: isStable ? "#48BB78" : "#ED8936",
    colorScheme: isStable ? "green" : "orange",
    label: isStable ? "STABLE (49.8-50.2)" : "UNSTABLE",
  };
};

// Generate voltage and current sine waves with phase shift based on power factor
// Power factor determines the phase angle between voltage and current
export interface PowerFactorWaveData {
  x: number;
  voltage: number;
  current: number;
}

export const generatePowerFactorWaves = (
  powerFactor: number,
  frequency: number = 50,
  points: number = 100,
): PowerFactorWaveData[] => {
  const data: PowerFactorWaveData[] = [];

  // Calculate phase angle in radians from power factor
  // arccos gives the angle, positive PF = inductive, negative PF = capacitive
  const phaseAngle = Math.acos(Math.abs(powerFactor));
  const phaseShift = powerFactor < 0 ? phaseAngle : -phaseAngle; // Capacitive: positive shift, Inductive: negative shift

  for (let i = 0; i < points; i++) {
    const x = i / points;
    const angle = (x * 2 * Math.PI * frequency) / 50;

    // Voltage is the reference (phase = 0)
    const voltage = Math.sin(angle);

    // Current is shifted by phase angle
    // If PF is negative (capacitive): current leads voltage (positive phase shift)
    // If PF is positive (inductive): current lags voltage (negative phase shift)
    const current = Math.sin(angle + phaseShift);

    data.push({ x, voltage, current });
  }

  return data;
};
