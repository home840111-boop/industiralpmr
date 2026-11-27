import dayjs from "../../../../../Components/Functions/dayjs";
import { downtimeCategoriesType } from "../../../../Targets/Target/Downtime/categories";

type DowntimeType = "IDLE" | "OFF";
type ShiftKey = "A" | "B" | "C";

/**
 * A stretch of idle/off time found in a machine report (derived, never stored as-is).
 * `from`/`to` are seconds-of-day exactly like the hourly report records,
 * `start`/`end` are absolute unix seconds.
 */
interface DowntimeSegment {
  key: string;
  machineId: string;
  date: string;
  type: DowntimeType;
  from: number;
  to: number;
  start: number;
  end: number;
  duration: number;
  shift: ShiftKey;
}

interface DowntimeRevision {
  category: downtimeCategoriesType;
  scheduled: boolean;
  note: string;
  by: string;
  at: number | object;
}

/**
 * What is stored under users/{uid}/downtime-reasons/{machineId}/{date}/{key}.
 * This node is new and append-only: nothing in the existing database is changed.
 */
interface DowntimeReasonEntry {
  machineId: string;
  date: string;
  key: string;
  type: DowntimeType;
  from: number;
  to: number;
  start: number;
  end: number;
  duration: number;
  shift: ShiftKey;
  category: downtimeCategoriesType;
  scheduled: boolean;
  note: string;
  createdAt?: number;
  createdBy?: string;
  updatedAt?: number;
  updatedBy?: string;
  history?: { [id: string]: DowntimeRevision };
}

interface PlannedDowntime {
  idle: number;
  off: number;
}

interface ReasonInput {
  category: downtimeCategoriesType;
  scheduled: boolean;
  note: string;
}

const entryId = (machineId: string, date: string, key: string) =>
  `${machineId}|${date}|${key}`;

const segmentToEntryId = (segment: DowntimeSegment) =>
  entryId(segment.machineId, segment.date, segment.key);

const entryToSegment = (entry: DowntimeReasonEntry): DowntimeSegment => ({
  key: entry.key,
  machineId: entry.machineId,
  date: entry.date,
  type: entry.type,
  from: entry.from,
  to: entry.to,
  start: entry.start,
  end: entry.end,
  duration: entry.duration,
  shift: entry.shift,
});

/**
 * Builds the list of idle / off stretches from the final hourly records
 * (the same records the "Hourly Details" tree is built from), so the numbers
 * here always agree with the rest of the report.
 */
const buildDowntimeSegments = (
  hourlyData: any,
  options: {
    machineId: string;
    date: string;
    shiftStarts: { A: number; B: number; C: number; shifts: number };
    allowedShifts: ShiftKey[];
  },
): DowntimeSegment[] => {
  const { machineId, date, shiftStarts, allowedShifts } = options;
  const dayStart = dayjs(`${date} 00:00:00`).unix();
  const records = Object.values(hourlyData || {}) as any[];
  records.sort((a, b) => (a?.from || 0) - (b?.from || 0));
  const used: { [key: string]: number } = {};
  const segments: DowntimeSegment[] = [];

  for (const record of records) {
    if (!record || typeof record.from !== "number") continue;
    const from = record.from as number;
    const to = typeof record.time === "number" ? (record.time as number) : from;

    let shift: ShiftKey = "A";
    if (shiftStarts.shifts === 2) {
      if (from >= +shiftStarts.B) shift = "B";
    } else if (shiftStarts.shifts === 3) {
      if (from >= +shiftStarts.C) shift = "C";
      else if (from >= +shiftStarts.B) shift = "B";
    }
    if (!allowedShifts.includes(shift)) continue;

    const parts: [DowntimeType, number][] = [
      ["IDLE", Math.max(+record.offtime || 0, 0)],
      ["OFF", Math.max(+record.shutdown_time || 0, 0)],
    ];
    for (const [type, duration] of parts) {
      if (duration < 1) continue;
      const base = `${from}_${type}`;
      used[base] = (used[base] || 0) + 1;
      const key = used[base] === 1 ? base : `${base}-${used[base]}`;
      const shiftAStart = shiftStarts.A ?? 25200;
      const isPastMidnight = from < shiftAStart;
      const startUnix = dayStart + from + (isPastMidnight ? 86400 : 0);
      const endUnix = dayStart + to + (isPastMidnight ? 86400 : 0);
      segments.push({
        key,
        machineId,
        date,
        type,
        from,
        to,
        start: startUnix,
        end: endUnix,
        duration,
        shift,
      });
    }
  }
  return segments;
};

/**
 * Total planned (scheduled) idle / off seconds. When the live segments of the
 * report are known their current duration is used, otherwise the duration that
 * was stored with the entry.
 */
const plannedTotals = (
  entries: DowntimeReasonEntry[],
  segments: DowntimeSegment[] | undefined,
  allowedShifts: ShiftKey[],
): PlannedDowntime => {
  const live = new Map<string, number>();
  for (const segment of segments || []) {
    live.set(segmentToEntryId(segment), segment.duration);
  }
  const splitSecondsByBase = new Map<string, number>();
  for (const entry of entries) {
    if (!entry.key.endsWith("_planned") || !entry.duration || entry.duration < 0) continue;
    const baseKey = entry.key.slice(0, -"_planned".length);
    const baseId = entryId(entry.machineId, entry.date, baseKey);
    splitSecondsByBase.set(baseId, (splitSecondsByBase.get(baseId) || 0) + entry.duration);
  }
  const total: PlannedDowntime = { idle: 0, off: 0 };
  for (const entry of entries) {
    if (!entry.scheduled) continue;
    if (!allowedShifts.includes(entry.shift)) continue;
    const id = entryId(entry.machineId, entry.date, entry.key);
    let duration = live.get(id) ?? entry.duration;
    if (!entry.key.endsWith("_planned") && live.has(id)) {
      duration = Math.max(0, duration - (splitSecondsByBase.get(id) || 0));
    }
    if (!duration || duration < 0) continue;
    if (entry.type === "IDLE") total.idle += duration;
    else total.off += duration;
  }
  return total;
};

export type {
  DowntimeType,
  ShiftKey,
  DowntimeSegment,
  DowntimeRevision,
  DowntimeReasonEntry,
  PlannedDowntime,
  ReasonInput,
};
export {
  entryId,
  segmentToEntryId,
  entryToSegment,
  buildDowntimeSegments,
  plannedTotals,
};
