interface foundType {
  machine: boolean;
  report: boolean;
}

interface HourlyStats {
  best: {
    production_meters: string;
    shots: string;
    production: string;
    material: string;
    electricity: string;
  };
  worst: {
    production_meters: string;
    shots: string;
    production: string;
    material: string;
    electricity: string;
  };
  avgs: {
    production_meters: number | null;
    shots: number | null;
    production: number | null;
    material: number | null;
    electricity: number | null;
  };
}

type Hour = {
  _start: number;
  _end: number;
  start: string;
  end: string;
  electricity: number;
  shots: number;
  production_meters: number;
  production: number;
  material: number;
};

interface HourlyReport {
  hours: Hour[];
  stats: HourlyStats;
  tree: SortedHourTree[];
}

interface TotalReport {
  shots: {
    value: number;
    change: number;
  };
  production_meters: {
    value: number;
    change: number;
  };
  production: {
    value: number;
    change: number;
  };
  material: {
    value: number;
    change: number;
  };
  electricity: {
    value: number;
    change: number;
  };
  ontime: number;
  idle_time: number;
  offtime: number;
  materialBreakdown: MaterialBreakdown;
}

interface MoldReport {
  [key: string]: {
    shots: number;
    production_meters: number;
    production: number;
    material: number;
    electricity: number;
  };
}

interface Report {
  total: TotalReport;
  hourly: HourlyReport;
  molds: MoldReport;
}

type MachineDetails = {
  id: string;
  name: string;
  isPowerAnalyzer: boolean;
  unit: string;
  unitNo?: number;
  mac?: string | null;
  machineType: "standard" | "inverter" | "servo";
  status: string;
  lastStatus: "ON" | "IDLE" | null;
  statusSince: number;
  moldRunning: string;
  upcomingMold: {
    name: string;
    start: number;
  } | null;
  moldRunningSince: number;
  currentProductionSpeed?: {
    speed: number;
    change: number;
  };
  rotaryRPM?: {
    speed: number;
    change: number;
  };
  avgCycleTime: number;
  operator: string;
  shiftTiming: string;
  lastUpdated: number;
  efficiency: number;
  on: number;
  off: number;
  idle: number;
  planned: number;
  unplannedDown: number;
  unplannedIdle: number;
  unplannedOff: number;
  isUpToDate: true | string;
  has_thermocouple?: boolean;
  activeOrder?: import("../../../Services/sap/types").ActiveProductionOrder | null;
  productionTarget?: import("../types").MachineProductionTarget | null;
} | null;

type Insigts = {
  productionPerUnit: number;
  materialPerUnit: number;
  unitsPerPiece: number;
  unitsPerGram: number;
  shotsPerUnit: number;
  unitsPerShot: number;
  // new additions by phantom plastic
  materialPerShot: number;
  consumptionPerKg: number;
  // new additions for BQP length measurement
  meterProductionPerUnit?: number;
  unitsPerMeter?: number;
};

interface MaterialBreakdown {
  [key: string]: {
    weight: number;
    pc_weight: number | null;
  };
}

interface returnType {
  machineFound: boolean;
  reportFound: boolean;
  machineDetails: MachineDetails;
  report: Report;
  insights: Insigts;
}

interface Mold {
  name: string;
  moldLife: number;
  shotAlertThreshold: number;
  cavities: number;
  productName: string;
  productColor: string;
  consumptionAvg?: {
    value: number;
    change: number;
  };
  cycleTimeAvg?: {
    value: number;
    change: number;
  };
  materials: {
    name: string;
    weight: number;
    pc_weight: number | null;
  }[];
  target?: {
    current: number;
    total: number;
  };
  isUniversal: boolean;
  isInstalled: boolean;
}

interface SortedHourTree {
  key: string;
  data: {
    time: string;
    status: string;
    shots: string;
    production_meters: string;
    production: string;
    material: string;
    electricity: string;
    ontime: string;
    offtime: string;
    idletime: string;
    cycleTime: string;
    operator: string;
    mold: string;
    product: string;
    downtimeReason?: string;
    downtimeCategory?: string;
    isPlanned?: boolean;
    downtimeNote?: string;
  };
  children?: SortedHourTree[];
}

export type {
  foundType,
  returnType,
  HourlyReport,
  TotalReport,
  MachineDetails,
  HourlyStats,
  Hour,
  Report,
  Insigts,
  MaterialBreakdown,
  MoldReport,
  Mold,
  SortedHourTree,
};
