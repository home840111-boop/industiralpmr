import dayjs from "../../../../../Components/Functions/dayjs";
import { get } from "../../../../../Components/firebase/api/db";
import hourlyArtificialOfftimeFixer from "../../../../../Components/Functions/formatters/hourlyArtificialOfftimeFixer";
import hourlyTimeFixer from "../../../../../Components/Functions/formatters/hourlyTimeFixer";
import insertUnitOffSessions from "../../../../../Components/Functions/formatters/insertUnitOffSessions";
import isAllowedShiftHour from "../../../../../Components/Functions/isAllowedShiftHour";
import unitPowerOffAllowedShifts from "../../../../../Components/Functions/unitPowerOffAllowedShifts";
import store from "../../../../../Components/Store";
import { factoriesAtom, selectedFactoryAtom, shiftsAtom } from "../../../../../Components/Store/atoms";
import { buildDowntimeSegments, DowntimeSegment, ShiftKey } from "./types";

const MAX_DAYS = 31;

/**
 * Finds the idle / off stretches of ONE machine on ONE day, using the same steps
 * the single day machine report uses (shift filter, unit power-off sessions,
 * artificial off time for completed days), so numbers match that report.
 * Read only.
 */
const loadDaySegments = async (
  machineId: string,
  date: string,
  allowedShifts: ShiftKey[],
  knownUnit?: number,
): Promise<DowntimeSegment[]> => {
  const shiftsInfo = store.get(shiftsAtom);
  const factories = store.get(factoriesAtom) as any;
  const selectedFactory = store.get(selectedFactoryAtom);
  if (!shiftsInfo) return [];
  const allowed = allowedShifts.map((s) => s.toLowerCase()) as ("a" | "b" | "c")[];

  const [unitSnap, shiftSnap, dailySnap, hourlySnap] = await Promise.all([
    knownUnit !== undefined ? Promise.resolve({ val: () => knownUnit, exists: () => true } as any) : get(`machines/${machineId}/unit`),
    get(`reports/factory/daily/${date}`),
    get(`reports/machines/${machineId}/daily/${date}`),
    get(`reports/machines/${machineId}/hourly/${date}`),
  ]);
  if (!shiftSnap.exists() || !dailySnap.exists() || !hourlySnap.exists()) return [];

  let shiftData = shiftSnap.val();
  if (shiftData?.factories) {
    const mySelected = selectedFactory && factories ? factories[selectedFactory.value as any] : undefined;
    const factory = mySelected ? shiftData.factories[(selectedFactory as any).value] : shiftData.factories[0];
    shiftData = { ...shiftData, ...(factory || {}) };
  }
  const unit = unitSnap.val() || 1;
  const completed = !!dailySnap.val()?.completed;
  const allShifts =
    shiftsInfo.shifts === 1
      ? allowed.includes("a")
      : shiftsInfo.shifts === 2
        ? allowed.includes("a") && allowed.includes("b")
        : allowed.includes("a") && allowed.includes("b") && allowed.includes("c");

  let hourlyData = Object.fromEntries(
    Object.entries(hourlySnap.val() || {}).filter(([, val]) => {
      const start = (val as any).from as number;
      // isAllowedShiftHour changes the array it is given, so pass a copy
      return isAllowedShiftHour(shiftData, start - 60, [...allowed]);
    }),
  ) as any;

  const shifts = {
    A: +shiftData.shift_a_start,
    B: +shiftData.shift_b_start,
    C: +shiftData.shift_c_start,
    shifts: shiftData.shifts,
  };

  if (allShifts) {
    const unitSessions = shiftData?.unit_power?.[unit]?.sessions;
    const hasUnitPowerSessions = !!(unitSessions && Object.keys(unitSessions).length > 0);
    let ontime = 0;
    let idletime = 0;
    for (const hour of Object.values(hourlyData) as any[]) {
      ontime += +hour.ontime || 0;
      idletime += +hour.offtime || 0;
    }
    const offtime = unitPowerOffAllowedShifts(date, shiftData, unitSessions || {}, [...allowed]);
    hourlyData = await insertUnitOffSessions(hourlyData, unitSessions || [], +shiftData.shift_a_start, date);
    if (!hasUnitPowerSessions && completed && ontime + idletime + offtime < 86400 - 10 * 60) {
      hourlyData = await hourlyArtificialOfftimeFixer(shifts, hourlyData, date);
    }
  }
  hourlyData = hourlyTimeFixer(hourlyData);

  return buildDowntimeSegments(hourlyData, {
    machineId,
    date,
    shiftStarts: shifts,
    allowedShifts,
  });
};

/** Every date (YYYY-MM-DD) from `from` to `to`, inclusive. */
const datesBetween = (from: string, to: string): string[] => {
  const dates: string[] = [];
  let current = dayjs(`${from} 00:00:00`);
  const end = dayjs(`${to} 00:00:00`);
  while (!current.isAfter(end, "day")) {
    dates.push(current.format("YYYY-MM-DD"));
    current = current.add(1, "day");
  }
  return dates;
};

const loadRangeSegments = async (
  machineId: string,
  from: string,
  to: string,
  allowedShifts: ShiftKey[],
): Promise<DowntimeSegment[]> => {
  const dates = datesBetween(from, to);
  const result: DowntimeSegment[] = [];
  let knownUnit: number | undefined;
  try {
    const snap = await get(`machines/${machineId}/unit`);
    if (snap.exists()) knownUnit = snap.val();
  } catch (e) {
    // ignore
  }
  // a few days at a time to stay gentle on the database
  for (let i = 0; i < dates.length; i += 4) {
    const chunk = dates.slice(i, i + 4);
    const parts = await Promise.all(
      chunk.map((date) => loadDaySegments(machineId, date, allowedShifts, knownUnit).catch(() => [] as DowntimeSegment[])),
    );
    parts.forEach((part) => result.push(...part));
  }
  return result;
};

export { MAX_DAYS, datesBetween, loadDaySegments, loadRangeSegments };
