export interface MinMax {
  min: number;
  max: number;
  avg: number;
}
interface PhaseData {
  volt: number;
  amp: number;
  power: number;
  apparentPower: number;
  powerFactor: number;
  reactivePower: number;
  voltTHD: number;
  ampTHD: number;
  lineVoltage: number;
  lineVoltageTHD: number;
}
interface SumPhaseData extends PhaseData {
  frequency: number;
  energyWhTotal?: number;
  neutralCurrent?: number;
}
export interface dbSchemaNow {
  isOnline: boolean | "RESTORING";
  updated: number;
  version?: string;
  SUM: SumPhaseData;
  R: PhaseData;
  S: PhaseData;
  T: PhaseData;
  optionStates?: {
    X1: 0 | 1;
    X2: 0 | 1;
    X3: 0 | 1;
  };
  rawTelemetry?: {
    X1_last_shot?: number;
    X2_last_shot?: number;
    X3_last_shot?: number;
    X1_cycle_time?: number;
    X2_cycle_time?: number;
    X3_cycle_time?: number;
    timestamp?: number;
  };
}
interface PhaseDataRecord {
  volt: MinMax;
  lineVoltage: MinMax;
  amp: MinMax;
  power: MinMax;
  apparentPower: MinMax;
  powerFactor: MinMax | {
    lag_min: number;
    lead_min: number;
    avg: number;
    avg_sum?: number;
    avg_count?: number;
  };
  reactivePower: MinMax;
  consumption: number;
  voltTHD: MinMax;
  ampTHD: MinMax;
}
interface SumPhaseDataRecord extends PhaseDataRecord {
  frequency: MinMax;
  neutralCurrent?: MinMax;
}
export interface dbSchemaRecord {
  SUM: SumPhaseDataRecord;
  R: PhaseDataRecord;
  S: PhaseDataRecord;
  T: PhaseDataRecord;
}
export interface dbSchemaHourlyRecord {
  [key: number]: dbSchemaRecord;
}

export interface AccumulatorsData {
  SUM_VAH?: number;
  SUM_VarH_Cap?: number;
  SUM_VarH_Ind?: number;
  SUM_VarH_Total?: number;
  SUM_WH_Export?: number;
  SUM_WH_Import?: number;
  SUM_WH_Total?: number;
  last_reset?: string;
  reset_every?: number;
  expected_cycle_time?: number;
}

export interface PhaseProps {
  isOnline: boolean | "RESTORING";
  phase: string;
  data: PowerDataMinMax;
}
