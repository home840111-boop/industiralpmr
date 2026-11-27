/**
 * Threshold Checker Utilities
 * Evaluates real-time data against configured thresholds
 */

import { ThresholdConfig, AlertSeverity, ParameterId } from "./types";

export interface ThresholdViolation {
  parameterId: ParameterId;
  parameter: string;
  phase?: string;
  thresholdType: "min" | "max";
  thresholdValue: number;
  actualValue: number;
  severity: AlertSeverity;
  exceeded: boolean; // True if currently violating, false if within hysteresis recovery zone
}

/**
 * Check if a value violates a threshold
 * Includes hysteresis to prevent alert flickering
 */
export const checkThreshold = (
  value: number,
  config: ThresholdConfig | undefined,
  previouslyViolated: boolean = false,
): ThresholdViolation | null => {
  if (!config || config.enabled === false) {
    return null;
  }

  const { min, max, severity = "warning", hysteresis = 2 } = config;

  // Check minimum threshold
  if (min !== undefined) {
    const hysteresisOffset = min * (hysteresis / 100);
    const recoveryThreshold = min + hysteresisOffset;

    if (previouslyViolated) {
      // Currently in violation - check if recovered beyond hysteresis
      if (value < recoveryThreshold) {
        return {
          parameterId: "" as ParameterId, // Will be set by caller
          parameter: "",
          thresholdType: "min",
          thresholdValue: min,
          actualValue: value,
          severity,
          exceeded: true, // Still violated
        };
      }
      // Recovered
      return null;
    } else {
      // Not currently violated - check if entering violation
      if (value < min) {
        return {
          parameterId: "" as ParameterId,
          parameter: "",
          thresholdType: "min",
          thresholdValue: min,
          actualValue: value,
          severity,
          exceeded: true, // New violation
        };
      }
    }
  }

  // Check maximum threshold
  if (max !== undefined) {
    const hysteresisOffset = max * (hysteresis / 100);
    const recoveryThreshold = max - hysteresisOffset;

    if (previouslyViolated) {
      // Currently in violation - check if recovered beyond hysteresis
      if (value > recoveryThreshold) {
        return {
          parameterId: "" as ParameterId,
          parameter: "",
          thresholdType: "max",
          thresholdValue: max,
          actualValue: value,
          severity,
          exceeded: true, // Still violated
        };
      }
      // Recovered
      return null;
    } else {
      // Not currently violated - check if entering violation
      if (value > max) {
        return {
          parameterId: "" as ParameterId,
          parameter: "",
          thresholdType: "max",
          thresholdValue: max,
          actualValue: value,
          severity,
          exceeded: true, // New violation
        };
      }
    }
  }

  return null;
};

/**
 * Helper to extract phase name from parameter ID
 */
export const getPhaseFromParameterId = (
  parameterId: ParameterId,
): string | undefined => {
  if (parameterId.includes("_R")) return "R";
  if (parameterId.includes("_S")) return "S";
  if (parameterId.includes("_T")) return "T";
  if (parameterId.includes("_RS")) return "RS";
  if (parameterId.includes("_ST")) return "ST";
  if (parameterId.includes("_TR")) return "TR";
  if (parameterId.includes("_SUM")) return "SUM";
  return undefined;
};

/**
 * Helper to get parameter display name
 */
export const getParameterDisplayName = (parameterId: ParameterId): string => {
  if (parameterId.startsWith("voltage_ln_")) {
    return "Voltage L-N";
  }
  if (parameterId.startsWith("voltage_ll_")) {
    return "Voltage L-L";
  }
  if (parameterId.startsWith("current_")) {
    return "Current";
  }
  if (parameterId.startsWith("thd_v_")) {
    return "Voltage THD";
  }
  if (parameterId.startsWith("thd_a_")) {
    return "Current THD";
  }

  return parameterId;
};

/**
 * Check all thresholds for a machine's real-time data
 * Returns array of violations
 */
export const checkAllThresholds = (
  thresholds: Record<string, ThresholdConfig>,
  data: any, // Real-time power data
  activeViolations: Map<string, ThresholdViolation> = new Map(),
): ThresholdViolation[] => {
  const violations: ThresholdViolation[] = [];

  // Check voltage L-N (single SUM threshold)
  if (data.SUM?.volt !== undefined) {
    const violation = checkThreshold(
      data.SUM.volt,
      thresholds["voltage_ln_SUM"],
      activeViolations.has("voltage_ln_SUM"),
    );
    if (violation) {
      violations.push({
        ...violation,
        parameterId: "voltage_ln_SUM",
        parameter: "Voltage L-N",
        phase: "SUM",
      });
    }
  }

  // Check voltage L-L (single SUM threshold using average of available line voltages)
  const lineVoltages = [
    data.R?.lineVoltage,
    data.S?.lineVoltage,
    data.T?.lineVoltage,
  ].filter(
    (value): value is number => value !== undefined && Number.isFinite(value),
  );
  if (lineVoltages.length > 0) {
    const voltageLlSum =
      lineVoltages.reduce((acc, value) => acc + value, 0) / lineVoltages.length;
    const violation = checkThreshold(
      voltageLlSum,
      thresholds["voltage_ll_SUM"],
      activeViolations.has("voltage_ll_SUM"),
    );
    if (violation) {
      violations.push({
        ...violation,
        parameterId: "voltage_ll_SUM",
        parameter: "Voltage L-L",
        phase: "SUM",
      });
    }
  }

  // Check current (field name is amp, not current)
  if (data.R?.amp !== undefined) {
    const violation = checkThreshold(
      data.R.amp,
      thresholds["current_R"],
      activeViolations.has("current_R"),
    );
    if (violation) {
      violations.push({
        ...violation,
        parameterId: "current_R",
        parameter: "Current",
        phase: "R",
      });
    }
  }

  if (data.S?.amp !== undefined) {
    const violation = checkThreshold(
      data.S.amp,
      thresholds["current_S"],
      activeViolations.has("current_S"),
    );
    if (violation) {
      violations.push({
        ...violation,
        parameterId: "current_S",
        parameter: "Current",
        phase: "S",
      });
    }
  }

  if (data.T?.amp !== undefined) {
    const violation = checkThreshold(
      data.T.amp,
      thresholds["current_T"],
      activeViolations.has("current_T"),
    );
    if (violation) {
      violations.push({
        ...violation,
        parameterId: "current_T",
        parameter: "Current",
        phase: "T",
      });
    }
  }

  // Check power factor SUM
  if (data.SUM?.powerFactor !== undefined) {
    const violation = checkThreshold(
      data.SUM.powerFactor,
      thresholds["pf_SUM"],
      activeViolations.has("pf_SUM"),
    );
    if (violation) {
      violations.push({
        ...violation,
        parameterId: "pf_SUM",
        parameter: "Power Factor",
        phase: "SUM",
      });
    }
  }

  // Check THD voltage (field name is voltTHD)
  if (data.SUM?.voltTHD !== undefined) {
    const violation = checkThreshold(
      data.SUM.voltTHD,
      thresholds["thd_v_SUM"],
      activeViolations.has("thd_v_SUM"),
    );
    if (violation) {
      violations.push({
        ...violation,
        parameterId: "thd_v_SUM",
        parameter: "Voltage THD",
        phase: "SUM",
      });
    }
  }

  // Check THD current (field name is ampTHD)
  if (data.SUM?.ampTHD !== undefined) {
    const violation = checkThreshold(
      data.SUM.ampTHD,
      thresholds["thd_a_SUM"],
      activeViolations.has("thd_a_SUM"),
    );
    if (violation) {
      violations.push({
        ...violation,
        parameterId: "thd_a_SUM",
        parameter: "Current THD",
        phase: "SUM",
      });
    }
  }

  return violations;
};
