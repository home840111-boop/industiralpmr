import { useCallback, useEffect, useMemo } from "react";
import { serverTimestamp } from "firebase/database";
import { auth } from "../Components/firebase";
import { get, update } from "../Components/firebase/api/db";
import dayjs from "../Components/Functions/dayjs";
import store from "../Components/Store";
import { machinesAtom, uidAtom, workSchedulesAtom } from "../Components/Store/atoms";
import Listen from "../Components/Store/hooks/Listen";
import { canWriteOperational, isMasterOwner } from "./rbac";
import { PlannedDowntime } from "../routes/Reports/Viewer/MachineReport/Downtime/types";

export type DayKey = "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat" | "Sun";

export const DAY_KEYS: DayKey[] = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export const DAY_LABELS: Record<DayKey, string> = {
  Mon: "Monday",
  Tue: "Tuesday",
  Wed: "Wednesday",
  Thu: "Thursday",
  Fri: "Friday",
  Sat: "Saturday",
  Sun: "Sunday",
};

export type WeeklyTemplate = Record<DayKey, number>;

export const DEFAULT_WEEKLY_TEMPLATE: WeeklyTemplate = {
  Mon: 24,
  Tue: 24,
  Wed: 24,
  Thu: 24,
  Fri: 24,
  Sat: 24,
  Sun: 24,
};

export interface ScheduleVersion {
  effectiveFrom: string; // YYYY-MM-DD
  template: WeeklyTemplate;
  updatedAt?: number;
  updatedBy?: string;
}

export interface DateOverride {
  hours: number;
  updatedAt?: number;
  updatedBy?: string;
}

export interface MachineWorkSchedule {
  versions?: Record<string, ScheduleVersion>;
  overrides?: Record<string, DateOverride>;
}

export type WorkSchedulesMap = Record<string, MachineWorkSchedule>;

export interface ResolvedDaySchedule {
  date: string;
  dayKey: DayKey;
  plannedWorkingHours: number;
  plannedShifts: number;
  plannedAllowanceHours: number;
  plannedAllowanceSec: number;
  source: "override" | "version" | "default";
  effectiveFrom?: string;
}

const ROOT = "work-schedules";

export const canEditWorkSchedule = (): boolean => {
  return canWriteOperational();
};

export const clampHours = (hours: number, maxHours = 24): number => {
  if (typeof hours !== "number" || isNaN(hours)) return maxHours;
  return Math.min(maxHours, Math.max(0, +hours.toFixed(2)));
};

export const dateToDayKey = (dateStr: string): DayKey => {
  const dow = dayjs(dateStr).day(); // 0 (Sun) to 6 (Sat)
  const map: DayKey[] = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return map[dow] || "Mon";
};

export const getMondayOfWeek = (dateStr?: string): string => {
  const d = dateStr ? dayjs(dateStr) : dayjs();
  const dow = d.day(); // 0 is Sunday
  const diff = dow === 0 ? -6 : 1 - dow;
  return d.add(diff, "day").format("YYYY-MM-DD");
};

/**
 * Resolves the planned working hours and planned downtime allowance for a machine on a specific YYYY-MM-DD date.
 * Uses Option 1: Effective-Date Versioning (finds the latest version with effectiveFrom <= dateStr) + optional single-date overrides.
 */
export const resolveDaySchedule = (
  machineSchedule: MachineWorkSchedule | undefined,
  dateStr: string,
  maxHours = 24,
): ResolvedDaySchedule => {
  const dayKey = dateToDayKey(dateStr);

  // 1. Check explicit single-date override first
  const override = machineSchedule?.overrides?.[dateStr];
  if (override && typeof override.hours === "number" && !isNaN(override.hours)) {
    const plannedWorkingHours = clampHours(override.hours, maxHours);
    const plannedAllowanceHours = Math.max(0, +(maxHours - plannedWorkingHours).toFixed(2));
    return {
      date: dateStr,
      dayKey,
      plannedWorkingHours,
      plannedShifts: +(plannedWorkingHours / 8).toFixed(2),
      plannedAllowanceHours,
      plannedAllowanceSec: Math.round(plannedAllowanceHours * 3600),
      source: "override",
      effectiveFrom: dateStr,
    };
  }

  // 2. Find latest version where effectiveFrom <= dateStr
  const versions = machineSchedule?.versions || {};
  const matchingKeys = Object.keys(versions)
    .filter((k) => k <= dateStr && versions[k]?.template)
    .sort();

  if (matchingKeys.length > 0) {
    const latestKey = matchingKeys[matchingKeys.length - 1];
    const ver = versions[latestKey];
    const rawHours = ver.template?.[dayKey];
    const plannedWorkingHours = clampHours(
      typeof rawHours === "number" ? rawHours : maxHours,
      maxHours,
    );
    const plannedAllowanceHours = Math.max(0, +(maxHours - plannedWorkingHours).toFixed(2));
    return {
      date: dateStr,
      dayKey,
      plannedWorkingHours,
      plannedShifts: +(plannedWorkingHours / 8).toFixed(2),
      plannedAllowanceHours,
      plannedAllowanceSec: Math.round(plannedAllowanceHours * 3600),
      source: "version",
      effectiveFrom: ver.effectiveFrom || latestKey,
    };
  }

  // 3. Default: full 24h (3 shifts), 0 planned downtime allowance
  return {
    date: dateStr,
    dayKey,
    plannedWorkingHours: maxHours,
    plannedShifts: +(maxHours / 8).toFixed(2),
    plannedAllowanceHours: 0,
    plannedAllowanceSec: 0,
    source: "default",
  };
};

/**
 * Computes total planned downtime allowance in seconds for a machine across a date range [fromDate, toDate].
 */
export const resolveRangeAllowanceSec = (
  machineSchedule: MachineWorkSchedule | undefined,
  fromDate: string | null,
  toDate: string | null,
  shiftRatio = 1,
  maxHours = 24,
): number => {
  if (!fromDate) return 0;
  const start = dayjs(fromDate).startOf("day");
  const end = dayjs(toDate || fromDate).startOf("day");
  const days = Math.min(62, Math.max(0, end.diff(start, "day")) + 1);
  let totalSec = 0;
  for (let i = 0; i < days; i++) {
    const dStr = start.add(i, "day").format("YYYY-MM-DD");
    totalSec += resolveDaySchedule(machineSchedule, dStr, maxHours).plannedAllowanceSec;
  }
  return Math.round(totalSec * Math.min(1, Math.max(0, shiftRatio)));
};

/**
 * Reconciles claimed planned downtime from logs with the schedule's planned downtime allowance.
 * Layer 1 Auto-Reconciliation: If the user set a schedule (e.g. 2.5 shifts -> 4h allowance)
 * but hasn't manually tagged the logs yet, reports automatically credit up to the allowance
 * (absorbing OFF time first, then IDLE time) so efficiency is never falsely penalized.
 */
export const reconcilePlannedDowntime = (
  claimed: PlannedDowntime,
  totalIdleSec: number,
  totalOffSec: number,
  scheduleAllowanceSec: number,
): PlannedDowntime & { autoCreditedSec: number; unclaimedAllowanceSec: number } => {
  const claimedIdle = Math.min(Math.max(0, claimed.idle || 0), Math.max(0, totalIdleSec));
  const claimedOff = Math.min(Math.max(0, claimed.off || 0), Math.max(0, totalOffSec));
  const claimedTotal = claimedIdle + claimedOff;

  const unclaimedAllowanceSec = Math.max(0, scheduleAllowanceSec - claimedTotal);
  if (unclaimedAllowanceSec <= 0) {
    return {
      idle: claimedIdle,
      off: claimedOff,
      autoCreditedSec: 0,
      unclaimedAllowanceSec: 0,
    };
  }

  const availableUnplannedOff = Math.max(0, totalOffSec - claimedOff);
  const availableUnplannedIdle = Math.max(0, totalIdleSec - claimedIdle);

  const autoOff = Math.min(unclaimedAllowanceSec, availableUnplannedOff);
  const remAfterOff = unclaimedAllowanceSec - autoOff;
  const autoIdle = Math.min(remAfterOff, availableUnplannedIdle);

  return {
    idle: claimedIdle + autoIdle,
    off: claimedOff + autoOff,
    autoCreditedSec: autoOff + autoIdle,
    unclaimedAllowanceSec,
  };
};

export const fetchWorkSchedules = async (forceRefresh = false): Promise<WorkSchedulesMap> => {
  const cached = store.get(workSchedulesAtom);
  if (!forceRefresh && cached !== null) return cached;
  try {
    const snap = await get(ROOT);
    const data = (snap.val() || {}) as WorkSchedulesMap;
    store.set(workSchedulesAtom, data);
    return data;
  } catch (err) {
    console.warn("Failed to fetch work schedules:", err);
    return cached || {};
  }
};

const assertWorkScheduleWriteScope = (machineIds: string[]) => {
  if (!canEditWorkSchedule()) throw new Error("Permission Denied");
  if (!isMasterOwner()) {
    const allowed = store.get(machinesAtom);
    if (machineIds.some((id) => !allowed?.[id])) {
      throw new Error("Permission Denied: machine outside scope");
    }
  }
};

export const saveWorkScheduleVersion = async (
  machineIds: string[],
  effectiveFrom: string,
  template: WeeklyTemplate,
): Promise<void> => {
  assertWorkScheduleWriteScope(machineIds);
  if (machineIds.length === 0) return;
  const by = auth.currentUser?.uid || store.get(uidAtom) || "unknown";
  const cleanTemplate: WeeklyTemplate = {
    Mon: clampHours(template.Mon),
    Tue: clampHours(template.Tue),
    Wed: clampHours(template.Wed),
    Thu: clampHours(template.Thu),
    Fri: clampHours(template.Fri),
    Sat: clampHours(template.Sat),
    Sun: clampHours(template.Sun),
  };

  const payload: Record<string, unknown> = {};
  for (const mId of machineIds) {
    const base = `${mId}/versions/${effectiveFrom}`;
    payload[`${base}/effectiveFrom`] = effectiveFrom;
    payload[`${base}/template`] = cleanTemplate;
    payload[`${base}/updatedAt`] = serverTimestamp();
    payload[`${base}/updatedBy`] = by;
  }
  await update(ROOT, payload);

  const next: WorkSchedulesMap = { ...(store.get(workSchedulesAtom) || {}) };
  const now = Date.now();
  for (const mId of machineIds) {
    const prevMachine = next[mId] || {};
    next[mId] = {
      ...prevMachine,
      versions: {
        ...(prevMachine.versions || {}),
        [effectiveFrom]: {
          effectiveFrom,
          template: cleanTemplate,
          updatedAt: now,
          updatedBy: by,
        },
      },
    };
  }
  store.set(workSchedulesAtom, next);
};

export const saveWorkScheduleOverrides = async (
  machineIds: string[],
  overrides: Record<string, number | null>,
): Promise<void> => {
  assertWorkScheduleWriteScope(machineIds);
  if (machineIds.length === 0) return;
  const by = auth.currentUser?.uid || store.get(uidAtom) || "unknown";
  const payload: Record<string, unknown> = {};

  for (const mId of machineIds) {
    for (const [dateStr, hours] of Object.entries(overrides)) {
      const base = `${mId}/overrides/${dateStr}`;
      if (hours === null) {
        payload[base] = null;
      } else {
        payload[base] = {
          hours: clampHours(hours),
          updatedAt: serverTimestamp(),
          updatedBy: by,
        };
      }
    }
  }
  await update(ROOT, payload);

  const next: WorkSchedulesMap = { ...(store.get(workSchedulesAtom) || {}) };
  const now = Date.now();
  for (const mId of machineIds) {
    const prevMachine = next[mId] || {};
    const nextOverrides: Record<string, DateOverride> = { ...(prevMachine.overrides || {}) };
    for (const [dateStr, hours] of Object.entries(overrides)) {
      if (hours === null) {
        delete nextOverrides[dateStr];
      } else {
        nextOverrides[dateStr] = {
          hours: clampHours(hours),
          updatedAt: now,
          updatedBy: by,
        };
      }
    }
    next[mId] = {
      ...prevMachine,
      overrides: nextOverrides,
    };
  }
  store.set(workSchedulesAtom, next);
};

export const useWorkSchedules = () => {
  const uid = Listen(uidAtom);
  const cached = Listen(workSchedulesAtom);

  useEffect(() => {
    if (uid && cached === null) {
      fetchWorkSchedules();
    }
  }, [uid, cached]);

  const schedules = useMemo(() => cached || {}, [cached]);
  const loading = Boolean(uid) && cached === null;

  const getDaySchedule = useCallback(
    (machineId: string, dateStr: string, maxHours = 24): ResolvedDaySchedule =>
      resolveDaySchedule(schedules[machineId], dateStr, maxHours),
    [schedules],
  );

  const getRangeAllowanceSec = useCallback(
    (
      machineIds: string[],
      fromDate: string | null,
      toDate: string | null,
      shiftRatio = 1,
      maxHours = 24,
    ): number => {
      return machineIds.reduce(
        (sum, mId) =>
          sum + resolveRangeAllowanceSec(schedules[mId], fromDate, toDate, shiftRatio, maxHours),
        0,
      );
    },
    [schedules],
  );

  return {
    schedules,
    loading,
    getDaySchedule,
    getRangeAllowanceSec,
  };
};

export interface TimingBreakdown {
  ontime: number;
  idletime: number;
  offtime: number;
  plannedIdle: number;
  plannedOff: number;
  plannedTotal: number;
  unplannedIdle: number;
  unplannedOff: number;
  unplannedDown: number;
  operatingTime: number;
  totalTime: number;
  efficiency: number;
}

export const computeTimingBreakdown = (
  ontime: number,
  idletime: number,
  offtime: number,
  plannedIdle: number,
  plannedOff: number,
  offtimeBasedEfficiency: boolean,
): TimingBreakdown => {
  const safeOn = Math.max(0, ontime || 0);
  const safeIdle = Math.max(0, idletime || 0);
  const safeOff = Math.max(0, offtime || 0);
  const pIdle = Math.min(Math.max(0, plannedIdle || 0), safeIdle);
  const pOff = Math.min(Math.max(0, plannedOff || 0), safeOff);
  const unplannedIdle = Math.max(0, safeIdle - pIdle);
  const unplannedOff = Math.max(0, safeOff - pOff);
  const unplannedDown = offtimeBasedEfficiency ? unplannedIdle + unplannedOff : unplannedIdle;
  const operatingTime = safeOn + unplannedDown;
  const totalTime = safeOn + safeIdle + safeOff;
  const efficiency = operatingTime > 0 ? +((safeOn / operatingTime) * 100).toFixed(2) : 0;

  return {
    ontime: safeOn,
    idletime: safeIdle,
    offtime: safeOff,
    plannedIdle: pIdle,
    plannedOff: pOff,
    plannedTotal: pIdle + pOff,
    unplannedIdle,
    unplannedOff,
    unplannedDown,
    operatingTime,
    totalTime,
    efficiency,
  };
};

export const allocateShiftPlannedDowntime = (
  shifts: Record<"A" | "B" | "C", { idletime?: number; offtime?: number } | null | undefined>,
  claimedByShift: Record<"A" | "B" | "C", PlannedDowntime>,
  totalAllowanceSec: number,
): Record<"A" | "B" | "C", PlannedDowntime> => {
  const result: Record<"A" | "B" | "C", PlannedDowntime> = {
    A: { idle: 0, off: 0 },
    B: { idle: 0, off: 0 },
    C: { idle: 0, off: 0 },
  };
  let claimedSum = 0;

  (["A", "B", "C"] as const).forEach((s) => {
    const sh = shifts[s];
    if (!sh) return;
    const maxIdle = Math.max(0, sh.idletime || 0);
    const maxOff = Math.max(0, sh.offtime || 0);
    const cIdle = Math.min(Math.max(0, claimedByShift[s]?.idle || 0), maxIdle);
    const cOff = Math.min(Math.max(0, claimedByShift[s]?.off || 0), maxOff);
    result[s] = { idle: cIdle, off: cOff };
    claimedSum += cIdle + cOff;
  });

  let remaining = Math.max(0, totalAllowanceSec - claimedSum);
  if (remaining <= 0) return result;

  (["C", "B", "A"] as const).forEach((s) => {
    const sh = shifts[s];
    if (!sh || remaining <= 0) return;
    const remOff = Math.max(0, (sh.offtime || 0) - result[s].off);
    const addOff = Math.min(remaining, remOff);
    result[s].off += addOff;
    remaining -= addOff;

    if (remaining > 0) {
      const remIdle = Math.max(0, (sh.idletime || 0) - result[s].idle);
      const addIdle = Math.min(remaining, remIdle);
      result[s].idle += addIdle;
      remaining -= addIdle;
    }
  });

  return result;
};

// Self-check for temporal effective-date schedule resolution and auto-reconciliation
const runSelfCheck = () => {
  const mockSchedule: MachineWorkSchedule = {
    versions: {
      "2026-11-09": {
        effectiveFrom: "2026-11-09",
        template: { Mon: 24, Tue: 20, Wed: 24, Thu: 24, Fri: 24, Sat: 16, Sun: 0 },
      },
      "2026-11-16": {
        effectiveFrom: "2026-11-16",
        template: { Mon: 24, Tue: 18, Wed: 24, Thu: 24, Fri: 24, Sat: 16, Sun: 0 },
      },
    },
  };
  const nov10 = resolveDaySchedule(mockSchedule, "2026-11-10");
  const nov17 = resolveDaySchedule(mockSchedule, "2026-11-17");
  if (nov10.plannedWorkingHours !== 20 || nov10.plannedAllowanceSec !== 14400) {
    console.error("WorkSchedule self-check failed for 2026-11-10", nov10);
  }
  if (nov17.plannedWorkingHours !== 18 || nov17.plannedAllowanceSec !== 21600) {
    console.error("WorkSchedule self-check failed for 2026-11-17", nov17);
  }
  const rec = reconcilePlannedDowntime({ idle: 0, off: 0 }, 3600, 18000, 14400);
  if (rec.off !== 14400 || rec.idle !== 0 || rec.autoCreditedSec !== 14400) {
    console.error("WorkSchedule reconciliation self-check failed", rec);
  }
  const tbWithOff = computeTimingBreakdown(36000, 7200, 18000, 0, 14400, true);
  if (
    tbWithOff.unplannedDown !== 10800 ||
    tbWithOff.ontime + tbWithOff.unplannedIdle + tbWithOff.unplannedOff + tbWithOff.plannedTotal !== tbWithOff.totalTime
  ) {
    console.error("computeTimingBreakdown (offtime=true) self-check failed", tbWithOff);
  }
  const tbNoOff = computeTimingBreakdown(36000, 7200, 18000, 0, 14400, false);
  if (
    tbNoOff.unplannedDown !== 7200 ||
    tbNoOff.ontime + tbNoOff.unplannedIdle + tbNoOff.unplannedOff + tbNoOff.plannedTotal !== tbNoOff.totalTime
  ) {
    console.error("computeTimingBreakdown (offtime=false) self-check failed", tbNoOff);
  }
  const alloc = allocateShiftPlannedDowntime(
    { A: { idletime: 3600, offtime: 0 }, B: { idletime: 1800, offtime: 3600 }, C: { idletime: 3600, offtime: 10800 } },
    { A: { idle: 1800, off: 0 }, B: { idle: 0, off: 0 }, C: { idle: 0, off: 0 } },
    16200,
  );
  if (alloc.A.idle !== 1800 || alloc.C.off !== 10800 || alloc.C.idle !== 3600 || alloc.B.off !== 0) {
    console.error("allocateShiftPlannedDowntime self-check failed", alloc);
  }
};
runSelfCheck();
