import { IconType } from "react-icons";

interface OptionProps {
  value: string;
  label: string;
  icon: IconType;
}

interface ViewCompProps {
  icon: IconType;
  label: string;
  borderRadius: string;
}

interface SelectViewProps {
  view: "list" | "grid";
  setView: (view: "list" | "grid") => void;
}

type MachineStatusTypes = "ALL" | "ON" | "OFF" | "IDLE" | "NA";

type option = "DEPARTMENTS" | "STATUS";
interface HeaderProps extends SelectViewProps {
  options?: option[];
  department?: string;
  setDepartment?: (department: string) => void;
  departments?: departmentsType;
  type?: MachineStatusTypes;
  setType?: (type: MachineStatusTypes) => void;
  search: (search: string) => void;
  total: number;
  viewing: number;
  viewingName?: string;
  hideLayoutSelector?: boolean;
  extraChildren?: JSX.Element;
}

interface departmentsType {
  [key: string]: {
    machines?: {
      [key: string]: string;
    };
    equipments?: {
      [key: string]: string;
    };
    envs?: {
      [key: string]: string;
    };
    supervisors: {
      A: string;
      B: string | null;
      C: string | null;
    };
  };
}

type MachineStatusType = "ON" | "OFF" | "IDLE" | "NA";
interface MachineType {
  id: string;
  name: string;
  status: MachineStatusType;
  statusSince: number;
  shots: number;
  production: number;
  production_meters: number;
  material: number;
  electricity: number;
  idle: number;
  off: number;
  on: number;
  planned: number;
  unplannedDown: number;
  unplannedIdle: number;
  unplannedOff: number;
  currentProductionSpeed?: {
    speed: number;
    change: number;
  };
  rotaryRPM?: {
    speed: number;
    change: number;
  };
  realtimeKW: {
    current: number;
    change: number;
  };
  cycleTime: number;
  lastShot: string;
  operator: string;
  shiftTiming: string;
  mold: string;
  moldSince: number;
  efficiency: number;
  updated: number;
  unit: number;
  isUpToDate: true | string;
  activeOrder?: import("../../Services/sap/types").ActiveProductionOrder | null;
  productionTarget?: MachineProductionTarget | null;
}

export interface MachineProductionTarget {
  name: string;
  target: number;
  current: number;
  due: string | null;
  started?: number;
  sapOrder?: {
    orderNumber: string;
    materialNumber?: string;
    materialDesc?: string;
    target?: number;
    confirmed?: number;
  } | null;
}

interface fetchReturnProps {
  departments: departmentsType;
  machines: {
    [key: string]: MachineType;
  };
}

export type {
  OptionProps,
  ViewCompProps,
  HeaderProps,
  SelectViewProps,
  MachineStatusTypes,
  fetchReturnProps,
  departmentsType,
  MachineType,
  MachineStatusType,
};
