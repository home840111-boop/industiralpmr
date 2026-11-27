/**
 * Type definitions for Power Alert System
 */

export type AlertSeverity = "warning" | "critical";
export type AlertStatus = "active" | "snoozed" | "acknowledged" | "resolved";
export type TemplateType = "conservative" | "standard" | "relaxed" | "custom";
export type CorrelationType = "cause" | "effect" | "concurrent";

// Parameter identifiers (parameter_phase format)
export type ParameterId =
  // Voltage
  | "voltage_ln_SUM"
  | "voltage_ll_SUM"
  // Current
  | "current_R"
  | "current_S"
  | "current_T"
  // Power Factor
  | "pf_SUM"
  // THD Voltage
  | "thd_v_SUM"
  // THD Current
  | "thd_a_SUM";

export interface ThresholdConfig {
  enabled: boolean;
  min?: number; // Lower limit
  max?: number; // Upper limit
  severity: AlertSeverity;
  hysteresis: number; // Percentage (default 2%)
}

export interface MachineThresholds {
  machineId: string;
  templateType: TemplateType;
  thresholds: Record<string, ThresholdConfig>;
  updatedBy: string;
  updatedAt: number; // timestamp
}

export interface AlertIncident {
  id: string;
  machineId: string;
  parameter: string;
  parameterId: ParameterId;
  phase: string;
  thresholdType: "min" | "max"; // which threshold was breached
  thresholdValue: number;
  actualValue: number;
  peakValue: number; // worst value during incident
  severity: AlertSeverity;
  startTime: number;
  endTime: number | null;
  duration: number; // seconds
  status: AlertStatus;

  // Snooze tracking
  snoozedBy?: string;
  snoozedAt?: number;
  snoozedUntil?: number;
  snoozeReason?: string;

  // Acknowledgment
  acknowledgedBy?: string;
  acknowledgedAt?: number;
  notes?: string;

  // Correlation
  relatedIncidents?: string[];
  correlationType?: CorrelationType;

  // Repeat offender tracking
  occurrenceCount: number;
}

export interface SnoozeLog {
  id: string;
  machineId: string;
  parameters: ParameterId[];
  snoozedBy: string;
  snoozedAt: number;
  snoozedUntil: number; // timestamp when snooze expires
  duration: number; // seconds
  reason: string;
  resumed: boolean;
  resumedAt?: number; // timestamp when alert resumed (or snooze expired)
}

export interface AlertStats {
  id?: string;
  machineId: string;
  parameter: string;
  parameterId: ParameterId;
  phase: string;
  date: string; // YYYY-MM-DD
  occurrences: number; // number of incidents
  totalDuration: number; // total seconds in violation
  avgDuration: number; // average duration per incident
  maxDuration: number; // longest single incident
}

// Parameter metadata for UI display
export interface ParameterMeta {
  id: ParameterId;
  label: string;
  unit: string;
  category: "voltage" | "current" | "quality";
  defaultMin?: number;
  defaultMax?: number;
  supportsMin?: boolean;
  supportsMax?: boolean;
  suggestedHysteresis: number;
}

// Threshold templates
export interface ThresholdTemplate {
  name: TemplateType;
  label: string;
  description: string;
  thresholds: Record<string, Omit<ThresholdConfig, "enabled">>;
}
