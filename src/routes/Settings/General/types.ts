
type RotationType = "supervisors-only" | "operators-only" | "all";
type frequencyType = "weekly" | "monthly";
interface GeneralDataProps {
  factoryName: string;
  shiftCount: number;
  offTimeBasedEfficiency: boolean;
  shiftRotation: {
    frequency: frequencyType;
    day: number; // 0-6 for weekly, 1-31 for monthly
    rotate: RotationType;
    nextRotation: number;
  } | null;
  shifts: {
    A: {
      name: string;
      start: string;
      hours: number;
    };
    B: {
      name: string | null;
      start: string | null;
      hours: number | null;
    };
    C: {
      name: string | null;
      start: string | null;
      hours: number | null;
    };
  };
  offlineTime: number;
}

export type { GeneralDataProps, RotationType, frequencyType};
