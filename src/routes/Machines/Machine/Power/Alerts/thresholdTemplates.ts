/**
 * Pre-configured threshold templates
 * Based on IEEE/IEC standards and industrial best practices
 */

import { ThresholdTemplate, ParameterMeta, ThresholdConfig } from "./types";

// Parameter metadata for UI display and defaults
export const PARAMETER_METADATA: Record<string, ParameterMeta> = {
  // Voltage L-N (230V nominal)
  voltage_ln_SUM: {
    id: "voltage_ln_SUM",
    label: "Voltage L-N (SUM)",
    unit: "V",
    category: "voltage",
    defaultMin: 207,
    defaultMax: 253,
    suggestedHysteresis: 2,
  },
  // Voltage L-L (400V nominal)
  voltage_ll_SUM: {
    id: "voltage_ll_SUM",
    label: "Voltage L-L (SUM)",
    unit: "V",
    category: "voltage",
    defaultMin: 360,
    defaultMax: 440,
    suggestedHysteresis: 2,
  },

  // Current (will be set based on machine capacity)
  current_R: {
    id: "current_R",
    label: "Current L1",
    unit: "A",
    category: "current",
    supportsMin: true,
    supportsMax: true,
    suggestedHysteresis: 3,
  },
  current_S: {
    id: "current_S",
    label: "Current L2",
    unit: "A",
    category: "current",
    supportsMin: true,
    supportsMax: true,
    suggestedHysteresis: 3,
  },
  current_T: {
    id: "current_T",
    label: "Current L3",
    unit: "A",
    category: "current",
    supportsMin: true,
    supportsMax: true,
    suggestedHysteresis: 3,
  },

  // Power Factor SUM
  pf_SUM: {
    id: "pf_SUM",
    label: "Power Factor SUM",
    unit: "",
    category: "quality",
    defaultMin: 0.85,
    supportsMin: true,
    supportsMax: false,
    suggestedHysteresis: 2,
  },

  // THD Voltage (%)
  thd_v_SUM: {
    id: "thd_v_SUM",
    label: "Voltage THD SUM",
    unit: "%",
    category: "quality",
    defaultMax: 5,
    supportsMin: true,
    supportsMax: true,
    suggestedHysteresis: 5,
  },

  // THD Current (%)
  thd_a_SUM: {
    id: "thd_a_SUM",
    label: "Current THD SUM",
    unit: "%",
    category: "quality",
    defaultMax: 15,
    supportsMin: true,
    supportsMax: true,
    suggestedHysteresis: 5,
  },
};

const normalizeThresholdEntry = (
  parameter: ParameterMeta,
  config?: Partial<ThresholdConfig>,
): ThresholdConfig | null => {
  if (!config) {
    return null;
  }

  const normalized: ThresholdConfig = {
    enabled: config.enabled ?? true,
    severity: config.severity ?? "warning",
    hysteresis: config.hysteresis ?? parameter.suggestedHysteresis,
  };

  if (parameter.supportsMin !== false && config.min !== undefined) {
    normalized.min = config.min;
  }

  if (parameter.supportsMax !== false && config.max !== undefined) {
    normalized.max = config.max;
  }

  return normalized;
};

export const normalizeThresholds = (
  thresholds: Record<string, Partial<ThresholdConfig>> = {},
): Record<string, ThresholdConfig> => {
  const normalizedEntries = Object.entries(PARAMETER_METADATA).flatMap(
    ([parameterId, parameter]) => {
      const normalized = normalizeThresholdEntry(
        parameter,
        thresholds[parameterId],
      );
      return normalized ? [[parameterId, normalized] as const] : [];
    },
  );

  return Object.fromEntries(normalizedEntries);
};

// Conservative Template (Tight tolerances for critical applications)
export const CONSERVATIVE_TEMPLATE: ThresholdTemplate = {
  name: "conservative",
  label: "Conservative",
  description:
    "Tight tolerances for critical equipment. Minimizes risk but may generate more alerts.",
  thresholds: {
    // Voltage ±4.3% (220-240V for 230V nominal)
    voltage_ln_SUM: { min: 220, max: 240, severity: "critical", hysteresis: 2 },
    voltage_ll_SUM: { min: 380, max: 420, severity: "critical", hysteresis: 2 },

    // Power Factor > 0.90
    pf_SUM: { min: 0.9, severity: "warning", hysteresis: 2 },

    // THD Voltage < 3%
    thd_v_SUM: { max: 3, severity: "warning", hysteresis: 5 },

    // THD Current < 10%
    thd_a_SUM: { max: 10, severity: "warning", hysteresis: 5 },
  },
};

// Standard Template (IEEE/IEC standards)
export const STANDARD_TEMPLATE: ThresholdTemplate = {
  name: "standard",
  label: "Standard (IEEE/IEC)",
  description:
    "Based on IEEE and IEC standards. Balanced approach for most industrial applications.",
  thresholds: {
    // Voltage ±10% (207-253V for 230V nominal)
    voltage_ln_SUM: { min: 207, max: 253, severity: "critical", hysteresis: 2 },
    voltage_ll_SUM: { min: 360, max: 440, severity: "critical", hysteresis: 2 },

    // Power Factor > 0.85
    pf_SUM: { min: 0.85, severity: "warning", hysteresis: 2 },

    // THD Voltage < 5% (IEEE 519)
    thd_v_SUM: { max: 5, severity: "warning", hysteresis: 5 },

    // THD Current < 15% (IEEE 519)
    thd_a_SUM: { max: 15, severity: "warning", hysteresis: 5 },
  },
};

// Relaxed Template (Wider tolerances)
export const RELAXED_TEMPLATE: ThresholdTemplate = {
  name: "relaxed",
  label: "Relaxed",
  description:
    "Wider tolerances for non-critical applications. Reduces alert fatigue.",
  thresholds: {
    // Voltage ±15% (195-265V for 230V nominal)
    voltage_ln_SUM: { min: 195, max: 265, severity: "critical", hysteresis: 2 },
    voltage_ll_SUM: { min: 340, max: 460, severity: "critical", hysteresis: 2 },

    // Power Factor > 0.8
    pf_SUM: { min: 0.8, severity: "warning", hysteresis: 2 },

    // THD Voltage < 8%
    thd_v_SUM: { max: 8, severity: "warning", hysteresis: 5 },

    // THD Current < 30%
    thd_a_SUM: { max: 30, severity: "warning", hysteresis: 5 },
  },
};

export const TEMPLATES: ThresholdTemplate[] = [
  CONSERVATIVE_TEMPLATE,
  STANDARD_TEMPLATE,
  RELAXED_TEMPLATE,
];

// Helper function to get parameter categories
export const getParametersByCategory = () => {
  const categories: Record<string, ParameterMeta[]> = {
    voltage: [],
    current: [],
    quality: [],
  };

  Object.values(PARAMETER_METADATA).forEach((param) => {
    categories[param.category].push(param);
  });

  return categories;
};
