import timeToSec from "../../../Components/Functions/converters/hourMinToSeconds";
import logger from "../../../Components/micro/logger";
import sendDataRest from "../../../Components/micro/sendDataRest";
import store from "../../../Components/Store";
import {
  companyNameAtom,
  offlineTimeAtom,
  offtimeBasedEfficiencyAtom,
  selectedFactoryType,
  shiftsAtom,
} from "../../../Components/Store/atoms";
import { GeneralDataProps } from "./types";

interface dbschema {
  company_name: string;
  shifts: number;
  off_time_based_efficiency: boolean;
  offline_time: number;
  shiftRotation: {
    frequency: "weekly" | "monthly";
    day: number; // 0-6 for weekly, 1-31 for monthly
    rotate: "supervisors-only" | "operators-only" | "all";
    nextRotation: number;
  } | null;
  shift_a_start: number;
  shift_a_hours: number;
  shift_b_start: number | "NULL";
  shift_b_hours: number | "NULL";
  shift_c_start: number | "NULL";
  shift_c_hours: number | "NULL";
  supervisor_a: string;
  supervisor_b: string | "NULL";
  supervisor_c: string | "NULL";
}

const save = async (
  data: GeneralDataProps,
  selectedFactory: selectedFactoryType | null,
) => {
  const { factoryName, shiftCount, shifts, shiftRotation } = data;
  const { A, B, C } = shifts;
  const dataToSave: dbschema = {
    company_name: factoryName,
    shifts: +shiftCount,
    shiftRotation,
    supervisor_a: A.name,
    off_time_based_efficiency: !!data.offTimeBasedEfficiency,
    shift_a_start: timeToSec(A.start),
    shift_a_hours: A.hours * 3600,
    supervisor_b: shiftCount > 1 ? B.name || "UNKOWN" : "NULL",
    shift_b_start: shiftCount > 1 ? timeToSec(B.start || A.start) : "NULL",
    shift_b_hours: shiftCount > 1 ? (B.hours || 0) * 3600 : "NULL",
    supervisor_c: shiftCount > 2 ? C.name || "UNKOWN" : "NULL",
    shift_c_start:
      shiftCount > 2 ? timeToSec(C.start || B.start || A.start) : "NULL",
    shift_c_hours: shiftCount > 2 ? (C.hours || 0) * 3600 : "NULL",
    offline_time: data.offlineTime,
  };
  const _shifts = {
    shifts: dataToSave.shifts as 1 | 2 | 3,
    A: dataToSave.shift_a_start,
    B:
      typeof dataToSave.shift_b_start === "string"
        ? 0
        : dataToSave.shift_b_start,
    C:
      typeof dataToSave.shift_c_start === "string"
        ? 0
        : dataToSave.shift_c_start,
  };
  logger("update-info", {
    data: dataToSave,
    factory: selectedFactory?.value,
  });
  const response = await sendDataRest(1, [
    "info",
    "info",
    dataToSave,
    selectedFactory?.value,
  ]);
  if (response === 403) {
    throw new Error(
      "Safe Mode is ON. Switch to Read-Write in the top bar to save changes.",
    );
  }
  if (response === 401) throw new Error("Permission Denied");
  if (response === 200) {
    store.set(shiftsAtom, _shifts);
    store.set(offtimeBasedEfficiencyAtom, dataToSave.off_time_based_efficiency);
    store.set(offlineTimeAtom, dataToSave.offline_time);
    if (!selectedFactory || selectedFactory.value === -1 || selectedFactory.only) {
      store.set(companyNameAtom, dataToSave.company_name);
    }
  }
  return response;
};

export default save;
