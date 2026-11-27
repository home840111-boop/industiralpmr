import { endAt, orderByKey, orderByChild, serverTimestamp, startAt } from "firebase/database";
import dayjs from "../../../../../Components/Functions/dayjs";
import { shiftsAtom } from "../../../../../Components/Store/atoms";
import { ShiftKey } from "./types";
import { downtimeCategoriesType } from "../../../../Targets/Target/Downtime/categories";
import { auth } from "../../../../../Components/firebase";
import { query as dbQuery, update } from "../../../../../Components/firebase/api/db";
import store from "../../../../../Components/Store";
import { uidAtom } from "../../../../../Components/Store/atoms";
import { canWriteOperational } from "../../../../../Services/rbac";
import {
  DowntimeReasonEntry,
  DowntimeSegment,
  ReasonInput,
} from "./types";

/**
 * All downtime reasons live under their own node:
 *   users/{uid}/downtime-reasons/{machineId}/{YYYY-MM-DD}/{segmentKey}
 * Existing nodes (reports, downtime, machines, ...) are never read-modified-written here.
 * Nothing is ever removed: edits update the entry and append a revision to `history`.
 */
const ROOT = "downtime-reasons";

const canCategorizeDowntime = (): boolean => {
  return canWriteOperational();
};

const fetchDowntimeReasons = async (
  machineIds: string[],
  fromDate: string,
  toDate: string,
): Promise<DowntimeReasonEntry[]> => {
  const shiftsInfo = store.get(shiftsAtom);
  const shiftAStartSec = shiftsInfo?.A ? +shiftsInfo.A : 25200;
  const fromUnix = dayjs(`${fromDate} 00:00:00`).unix() + shiftAStartSec;
  const toUnix = dayjs(`${toDate} 00:00:00`).unix() + 86400 + shiftAStartSec;

  const [reasonSnaps, ...downtimeSnaps] = await Promise.all([
    Promise.all(
      machineIds.map((machineId) =>
        dbQuery(
          `${ROOT}/${machineId}`,
          orderByKey(),
          startAt(fromDate),
          endAt(toDate),
        ),
      ),
    ),
    ...machineIds.map((machineId) =>
      dbQuery(
        `downtime/${machineId}`,
        orderByChild("start"),
        startAt(fromUnix - 86400 * 2),
      ).catch(() => null),
    ),
  ]);

  const entries: DowntimeReasonEntry[] = [];
  const seenKeys = new Set<string>();
  const seenEventIds = new Set<string>();

  // 1. Process explicit downtime-reasons
  reasonSnaps.forEach((snap, index) => {
    const machineId = machineIds[index];
    const days = (snap.val() || {}) as {
      [date: string]: { [key: string]: Partial<DowntimeReasonEntry> };
    };
    for (const [date, items] of Object.entries(days)) {
      for (const [key, item] of Object.entries(items || {})) {
        if (!item || typeof item !== "object") continue;
        entries.push({
          machineId,
          date,
          key,
          type: item.type === "OFF" ? "OFF" : "IDLE",
          from: +(item.from || 0),
          to: +(item.to || 0),
          start: +(item.start || 0),
          end: +(item.end || 0),
          duration: +(item.duration || 0),
          shift: item.shift || "A",
          category: item.category || "uncategorized",
          scheduled: !!item.scheduled,
          note: item.note || "",
          createdAt: item.createdAt,
          createdBy: item.createdBy,
          updatedAt: item.updatedAt,
          updatedBy: item.updatedBy,
          history: item.history,
        });
        seenKeys.add(`${machineId}|${date}|${key}`);
        if (key.startsWith("target_")) {
          seenEventIds.add(`${machineId}|${key.replace("target_", "")}`);
        }
      }
    }
  });

  // 2. Process real-time/target downtime from users/{uid}/downtime/{machineId}
  const nowUnix = dayjs().unix();
  downtimeSnaps.forEach((snap: any, index: number) => {
    if (!snap || !snap.exists()) return;
    const machineId = machineIds[index];
    const rawEvents = snap.val() as {
      [id: string]: {
        start: number;
        end?: number;
        status?: "IDLE" | "OFF";
        reason?: string | { category: downtimeCategoriesType; note: string; scheduled: boolean };
      };
    };

    const tzOffset = (dayjs().tz("Asia/Karachi").utcOffset() || 300) * 60;
    const isDeviceShifted = Boolean(
      Object.values(rawEvents).some(
        (d: any) => d && typeof d.start === "number" && d.start > nowUnix + 300,
      ),
    );

    for (const [id, event] of Object.entries(rawEvents || {})) {
      if (!event || typeof event.start !== "number" || isNaN(event.start)) continue;
      const trueStart = isDeviceShifted ? event.start - tzOffset : event.start;
      let trueEnd: number;
      if (event.end && typeof event.end === "number" && !isNaN(event.end)) {
        trueEnd = isDeviceShifted ? event.end - tzOffset : event.end;
      } else if (typeof (event as any).duration === "number" && !isNaN((event as any).duration) && (event as any).duration > 0) {
        trueEnd = trueStart + (event as any).duration;
      } else {
        trueEnd = Math.min(trueStart + 3600, toUnix);
      }

      if (trueEnd < fromUnix || trueStart > toUnix) continue;

      const clampedStart = Math.max(trueStart, fromUnix);
      const clampedEnd = Math.min(trueEnd, toUnix);
      const duration = Math.max(clampedEnd - clampedStart, 0);

      const dStart = dayjs.unix(clampedStart);
      const dEnd = dayjs.unix(clampedEnd);
      const date = dStart.format("YYYY-MM-DD");
      const key = `target_${id}`;
      const entryKey = `${machineId}|${date}|${key}`;
      const eventKey = `${machineId}|${id}`;

      if (seenEventIds.has(eventKey) || seenKeys.has(entryKey)) continue;
      seenEventIds.add(eventKey);

      const fromSec = dStart.hour() * 3600 + dStart.minute() * 60 + dStart.second();
      const toSec = dEnd.hour() * 3600 + dEnd.minute() * 60 + dEnd.second();

      let shift: ShiftKey = "A";
      if (shiftsInfo && shiftsInfo.shifts > 1) {
        if (shiftsInfo.shifts === 2 && fromSec >= +(shiftsInfo.B || 0)) shift = "B";
        else if (shiftsInfo.shifts === 3) {
          if (fromSec >= +(shiftsInfo.C || 0)) shift = "C";
          else if (fromSec >= +(shiftsInfo.B || 0)) shift = "B";
        }
      }

      let category: downtimeCategoriesType = "uncategorized";
      let note = "";
      let scheduled = false;

      if (event.reason) {
        if (typeof event.reason === "string") {
          note = event.reason;
        } else if (typeof event.reason === "object") {
          category = event.reason.category || "uncategorized";
          note = event.reason.note || "";
          scheduled = !!event.reason.scheduled;
        }
      }

      entries.push({
        machineId,
        date,
        key,
        type: event.status === "OFF" ? "OFF" : "IDLE",
        from: fromSec,
        to: toSec,
        start: clampedStart,
        end: clampedEnd,
        duration,
        shift,
        category,
        scheduled,
        note,
        createdAt: trueStart * 1000,
        updatedAt: trueStart * 1000,
      });
      seenKeys.add(entryKey);
    }
  });

  return entries;
};

interface SaveItem {
  segment: DowntimeSegment;
  existing?: DowntimeReasonEntry;
}

/**
 * Creates (or edits) the reason of one or many downtime segments with ONE database
 * write, so either every segment is saved or none of them are.
 * Returns the entries as they should now look locally.
 */
const saveDowntimeReasons = async (
  items: SaveItem[],
  reason: ReasonInput,
): Promise<DowntimeReasonEntry[]> => {
  if (!canCategorizeDowntime()) throw new Error("Permission Denied");
  if (items.length === 0) return [];
  const by = auth.currentUser?.uid || store.get(uidAtom) || "unknown";
  const now = Date.now();
  const revisionId = `${now}`;
  const note = reason.note.trim();

  const payload: { [path: string]: unknown } = {};
  for (const { segment, existing } of items) {
    const base = `${segment.machineId}/${segment.date}/${segment.key}`;
    payload[`${base}/type`] = segment.type;
    payload[`${base}/from`] = segment.from;
    payload[`${base}/to`] = segment.to;
    payload[`${base}/start`] = segment.start;
    payload[`${base}/end`] = segment.end;
    payload[`${base}/duration`] = segment.duration;
    payload[`${base}/shift`] = segment.shift;
    payload[`${base}/category`] = reason.category;
    payload[`${base}/scheduled`] = reason.scheduled;
    payload[`${base}/note`] = note;
    payload[`${base}/updatedAt`] = serverTimestamp();
    payload[`${base}/updatedBy`] = by;
    payload[`${base}/history/${revisionId}`] = {
      category: reason.category,
      scheduled: reason.scheduled,
      note,
      by,
      at: serverTimestamp(),
    };
    if (!existing) {
      payload[`${base}/createdAt`] = serverTimestamp();
      payload[`${base}/createdBy`] = by;
    }
  }
  await update(ROOT, payload);

  // Two-way sync: also update matching records in downtime/${segment.machineId}
  for (const { segment } of items) {
    try {
      if (segment.key.startsWith("target_")) {
        const targetId = segment.key.replace("target_", "");
        await update(`downtime/${segment.machineId}/${targetId}/reason`, {
          category: reason.category,
          note,
          scheduled: reason.scheduled,
        });
      } else {
        const snap = await dbQuery(
          `downtime/${segment.machineId}`,
          orderByChild("start"),
          startAt(segment.start - 3600),
          endAt(segment.end + 3600),
        ).catch(() => null);
        if (snap && snap.exists()) {
          const events = snap.val();
          for (const [id, ev] of Object.entries(events || {})) {
            const evStart = (ev as any)?.start;
            const evEnd = (ev as any)?.end || segment.end;
            if (typeof evStart === "number" && Math.max(segment.start, evStart) < Math.min(segment.end, evEnd)) {
              await update(`downtime/${segment.machineId}/${id}/reason`, {
                category: reason.category,
                note,
                scheduled: reason.scheduled,
              });
            }
          }
        }
      }
    } catch (e) {
      console.warn("Failed to sync downtime reason to target events:", e);
    }
  }

  return items.map(({ segment, existing }) => ({
    ...(existing || {}),
    machineId: segment.machineId,
    date: segment.date,
    key: segment.key,
    type: segment.type,
    from: segment.from,
    to: segment.to,
    start: segment.start,
    end: segment.end,
    duration: segment.duration,
    shift: segment.shift,
    category: reason.category,
    scheduled: reason.scheduled,
    note,
    createdAt: existing?.createdAt ?? now,
    createdBy: existing?.createdBy ?? by,
    updatedAt: now,
    updatedBy: by,
    history: {
      ...(existing?.history || {}),
      [revisionId]: {
        category: reason.category,
        scheduled: reason.scheduled,
        note,
        by,
        at: now,
      },
    },
  }));
};

const saveDowntimeReason = async (
  segment: DowntimeSegment,
  reason: ReasonInput,
  existing?: DowntimeReasonEntry,
): Promise<DowntimeReasonEntry> => {
  const [entry] = await saveDowntimeReasons([{ segment, existing }], reason);
  return entry;
};

/**
 * 1-Click claims a downtime segment against the daily planned downtime allowance.
 * If the segment duration exceeds `remainingAllowanceSec`, automatically splits the segment:
 *  - Part 1 (`${segment.key}_planned`, duration = remainingAllowanceSec): marked as "planned stoppage" (scheduled: true)
 *  - Part 2 (`${segment.key}`, duration = excess): kept as "uncategorized" (scheduled: false) for supervisor categorization
 */
const claimPlannedDowntimeWithSplit = async (
  segment: DowntimeSegment,
  remainingAllowanceSec: number,
  existing?: DowntimeReasonEntry,
  priorSplitSec = 0,
): Promise<DowntimeReasonEntry[]> => {
  if (!canCategorizeDowntime()) throw new Error("Permission Denied");
  const claimSec = Math.min(segment.duration, Math.max(0, Math.round(remainingAllowanceSec)));
  if (claimSec <= 0) return [];

  const plannedReason: ReasonInput = {
    category: "planned stoppage",
    scheduled: true,
    note:
      claimSec < segment.duration
        ? "Planned schedule allowance (auto-split)"
        : "Planned schedule allowance",
  };

  if (claimSec >= segment.duration) {
    const saved = await saveDowntimeReason(segment, plannedReason, existing);
    try {
      await update(
        `reports/machines/${segment.machineId}/hourly/${segment.date}/${segment.key}/reason`,
        {
          category: plannedReason.category,
          note: plannedReason.note,
          scheduled: true,
        },
      );
    } catch (e) {
      console.warn("Could not sync hourly chunk reason:", e);
    }
    return [saved];
  }

  // Split into planned portion + uncategorized remainder
  const safePrior = Math.max(0, Math.round(priorSplitSec || 0));
  const totalSplitSec = safePrior + claimSec;
  const origStart = segment.start - safePrior;
  const origFrom = Math.max(0, segment.from - safePrior);
  const plannedSegment: DowntimeSegment = {
    ...segment,
    key: `${segment.key}_planned`,
    from: origFrom,
    to: origFrom + totalSplitSec,
    start: origStart,
    end: origStart + totalSplitSec,
    duration: totalSplitSec,
  };

  const remainderSegment: DowntimeSegment = {
    ...segment,
    from: segment.from + claimSec,
    start: segment.start + claimSec,
    duration: Math.max(0, segment.duration - claimSec),
  };

  const [savedPlanned] = await saveDowntimeReasons(
    [{ segment: plannedSegment }],
    plannedReason,
  );
  const [savedRemainder] = await saveDowntimeReasons(
    [{ segment: remainderSegment, existing }],
    {
      category: "uncategorized",
      scheduled: false,
      note: "",
    },
  );

  try {
    await update(
      `reports/machines/${segment.machineId}/hourly/${segment.date}/${segment.key}/reason`,
      {
        category: "uncategorized",
        note: "",
        scheduled: false,
        plannedSplitSec: totalSplitSec,
      },
    );
  } catch (e) {
    console.warn("Could not sync split hourly chunk reason:", e);
  }

  return [savedPlanned, savedRemainder];
};

export {
  canCategorizeDowntime,
  claimPlannedDowntimeWithSplit,
  fetchDowntimeReasons,
  saveDowntimeReason,
  saveDowntimeReasons,
};
