import { DataToSet } from ".";
import { get } from "../../../Components/firebase/api/db";
import store from "../../../Components/Store";
import {
  dateAtom,
  machinesAtom,
  shiftsAtom,
  uidAtom,
} from "../../../Components/Store/atoms";
import dayjs from "../../../Components/Functions/dayjs";
import secondsToHourMin from "../../../Components/Functions/converters/secondsToHourMin";
import { MachineStatusType } from "../../Machines/types";
import {
  ref,
  get as firebaseGet,
  limitToLast,
  query,
} from "firebase/database";
import { db } from "../../../Components/firebase";
import { downtimeCategoriesType } from "./Downtime/categories";
import { isSapFeatureEnabled } from "../../../Services/sap";

const fetch = async (machineID: string): Promise<DataToSet | "NOT_FOUND"> => {
  const machinesAllowed = store.get(machinesAtom) || {};
  const date = store.get(dateAtom);
  const shifts = store.get(shiftsAtom);
  if (machinesAllowed[machineID] === undefined || !shifts || !date)
    return "NOT_FOUND";
  const machinesSnap = await get(`machines/${machineID}`);
  const machine = machinesSnap.val() || { unit: 1 };
  const moldName = machine.installedMold
    ? machine.installedMold.name
    : machine.mold_name;
  const promises = [];
  const uid = store.get(uidAtom);
  promises.push(get(`units/${machine.unit}`));
  promises.push(get(`production-targets/active/${machineID}`));
  promises.push(get(`molds/${machineID}/${moldName}/cycleTimeAvg`));
  promises.push(
    firebaseGet(
      query(
        ref(
          db,
          `users/${uid}/production-targets/completed/${machineID}/${moldName}`,
        ),
        limitToLast(1),
      ),
    ),
  );
  promises.push(get(`machines/${machineID}/monitor-downtime`));
  promises.push(get("device-categories"));
  promises.push(get(`production-targets/queue/${machineID}`));
  const [
    unitSnap,
    productionTargetSnap,
    cycleTimeSnap,
    latestTargetReportSnap,
    monitorDowntimeSnap,
    deviceCategorySnap,
    productionQueuesSnap,
  ] = await Promise.all(promises);
  const unit = unitSnap.val();
  const productionQueues: {
    moldName: string;
    id: string;
    cycleTime: number;
    order: number;
    duration: number;
    target: {
      name: string;
      target: {
        total: number;
      };
    };
  }[] = Object.entries(productionQueuesSnap.val() || {}).map(([id, item]) => ({
    ...(item as any),
    id,
  }));
  productionQueues.sort((a, b) => a.order - b.order);
  const deviceCategories = deviceCategorySnap.val() || {};
  const monitorDowntime = !!monitorDowntimeSnap.val();
  const latestTargetReport = Object.entries(latestTargetReportSnap.val() || {});
  const completedTarget: DataToSet["lastCompletedTarget"] =
    latestTargetReport.length === 0
      ? null
      : {
          id: latestTargetReport[0][0],
          name: (latestTargetReport[0][1] as any).name,
          target: (latestTargetReport[0][1] as any).target.total,
          completed: (latestTargetReport[0][1] as any).completedAt,
          started: (latestTargetReport[0][1] as any).startedAt,
          efficiency: (latestTargetReport[0][1] as any).efficiency * 100 || 0,
          hours: [],
        };
  if (completedTarget) {
    for (const [dateHour, _data] of Object.entries(
      (latestTargetReport[0][1] as any)?.hours || {},
    )) {
      const data = _data as any;
      const dateHourSplit = (dateHour as string).split("-"); // 2024-01-01-01
      const date = dateHourSplit.slice(0, 3).join("-");
      const efficiency =
        data.ontime && data.ontime + data.downtime
          ? (data.ontime / (data.ontime + data.downtime)) * 100
          : 0;
      completedTarget.hours.push({
        efficiency: efficiency,
        production: data.production || 0,
        time: data.time || "NA",
        date: dayjs(date).format("D MMM, YY"),
      });
    }
  }
  const productionTargets = productionTargetSnap.val() || {};
  const cycleTime = cycleTimeSnap.val() || 0;
  const {
    cleanDisconnect,
    last_seen,
    lastContact,
  }: {
    connected: boolean;
    cleanDisconnect: boolean;
    last_seen: number;
    lastContact: number;
  } = unit as any;
  const diff = dayjs().diff(dayjs.unix(lastContact || 0), "minute");
  const connected = diff < 1;
  const rn = dayjs();
  const rnSecs = rn.hour() * 3600 + rn.minute() * 60 + rn.second();
  const operator = (() => {
    let operator = "A - " + machine.operator_a;
    if (isNaN(shifts.B)) operator = "A - " + machine.operator_a;
    else if (rnSecs > shifts.A && rnSecs < shifts.B)
      operator = "A - " + machine.operator_a;
    else if (isNaN(shifts.C)) operator = "B - " + machine.operator_b;
    else if (rnSecs > shifts.B && rnSecs < shifts.C)
      operator = "B - " + machine.operator_b;
    else if (rnSecs > shifts.C && rnSecs < shifts.A)
      operator = "C - " + machine.operator_c;
    return operator;
  })();
  const shiftTiming = (() => {
    const shift = operator.split(" - ")[0];
    if (shift === "A") {
      if (isNaN(shifts.B))
        return secondsToHourMin(shifts.A) + " - " + secondsToHourMin(shifts.A);
      else
        return secondsToHourMin(shifts.A) + " - " + secondsToHourMin(shifts.B);
    } else if (shift === "B") {
      if (isNaN(shifts.C))
        return secondsToHourMin(shifts.B) + " - " + secondsToHourMin(shifts.A);
      else
        return secondsToHourMin(shifts.B) + " - " + secondsToHourMin(shifts.C);
    } else if (shift === "C")
      return secondsToHourMin(shifts.C) + " - " + secondsToHourMin(shifts.A);
    else return "NA";
  })();
  const status = (() => {
    if (connected) {
      if (machine.machine_status) return "ON";
      else return "IDLE";
    } else {
      if (cleanDisconnect) return "OFF";
      else return "NA";
    }
  })() as MachineStatusType;
  machine.at = status === "NA" ? lastContact || last_seen : machine.at;
  const statusSince = (() => {
    if (isNaN(machine.at)) return dayjs(machine.at).unix();
    else return +machine.at;
  })();
  const updated = (() => {
    if (isNaN(machine.updated)) return dayjs(machine.updated).unix();
    else return +machine.updated;
  })();
  const started = Math.max(
    +((productionTargets?.[moldName]?.startedAt || 0) / 1000).toFixed(0) - 60,
    0,
  );
  let logs: DataToSet["timing"]["downtime"]["logs"] = [];
  let scheduledDowntime = 0;
  if (started) {
    const downtime: Record<string, any> = {};
    const startDay = dayjs.unix(started).format("YYYY-MM-DD");
    const endDay = dayjs().format("YYYY-MM-DD");
    let curDay = dayjs(startDay, "YYYY-MM-DD");
    const lastDay = dayjs(endDay, "YYYY-MM-DD");
    const targetDates: string[] = [];
    while (!curDay.isAfter(lastDay, "day")) {
      targetDates.push(curDay.format("YYYY-MM-DD"));
      curDay = curDay.add(1, "day");
    }

    const hourlySnaps = await Promise.all(
      targetDates.map((d) => firebaseGet(ref(db, `users/${uid}/reports/machines/${machineID}/hourly/${d}`)).catch(() => null))
    );

    hourlySnaps.forEach((hSnap, dIdx) => {
      if (!hSnap || !hSnap.exists()) return;
      const dStr = targetDates[dIdx];
      const dayStartUnix = dayjs(`${dStr} 00:00:00`).unix();
      const hData = hSnap.val() || {};
      for (const [chunkId, chunk] of Object.entries(hData as Record<string, any>)) {
        if (!chunk) continue;
        const isShutdown = Boolean(chunk.isShutdown || (chunk.shutdown_time && chunk.shutdown_time > 0));
        const isIdle = Boolean(!chunk.status && (chunk.offtime > 0 || isShutdown));
        if (!isIdle && !isShutdown) continue;

        const fromSec = typeof chunk.from === "number" ? chunk.from : 0;
        const timeSec = typeof chunk.time === "number" ? chunk.time : fromSec;
        const cStart = dayStartUnix + fromSec;
        const cEnd = dayStartUnix + timeSec;

        if (cEnd > started) {
          downtime[`${dStr}_${chunkId}`] = {
            start: cStart,
            end: cEnd,
            status: isShutdown ? "OFF" : "IDLE",
            reason: chunk.reason || "uncategorized",
          };
        }
      }
    });
    const nowUtc = dayjs().unix();
    const tzOffset = (dayjs().tz("Asia/Karachi").utcOffset() || 300) * 60;
    const isDeviceShifted = Boolean(
      (unit?.packetID &&
        unit?.lastContact &&
        unit.packetID - unit.lastContact > 3600 * 3) ||
        Object.values(downtime).some(
          (d: any) => d && typeof d.start === "number" && d.start > nowUtc + 300,
        ),
    );

    const rawLogs: Array<{
      start: number;
      end: number;
      reason: {
        category: downtimeCategoriesType;
        note: string;
        scheduled: boolean;
      };
      id: string;
      status: "IDLE" | "OFF";
    }> = [];

    for (const [id, { start, end, reason, status: dtStatus }] of Object.entries(downtime)) {
      if (typeof start !== "number" || isNaN(start)) continue;

      const trueStart = isDeviceShifted ? start - tzOffset : start;
      const trueEnd =
        end && typeof end === "number" && !isNaN(end)
          ? isDeviceShifted
            ? end - tzOffset
            : end
          : 0;

      // Filter out any historical downtime that began prior to the target's start time
      if (trueStart < started) continue;

      const myReason: {
        category: downtimeCategoriesType;
        note: string;
        scheduled: boolean;
      } =
        typeof reason === "string"
          ? {
              category: "uncategorized",
              note: reason,
              scheduled: false,
            }
          : reason || {
              category: "uncategorized",
              note: "None",
              scheduled: false,
            };

      rawLogs.push({
        start: trueStart,
        end: trueEnd,
        reason: myReason,
        id,
        status: dtStatus === "OFF" ? "OFF" : "IDLE",
      });
    }

    // Sort chronologically. If start is identical, place closed records (end > 0) before open ones (end === 0)
    rawLogs.sort((a, b) => {
      if (a.start !== b.start) return a.start - b.start;
      return (b.end || 0) - (a.end || 0);
    });

    // Deduplicate / Merge ghost duplicates with identical or nearly identical starts
    const cleanLogs: typeof rawLogs = [];
    for (let i = 0; i < rawLogs.length; i++) {
      const cur = rawLogs[i];
      const next = rawLogs[i + 1];

      // If next exists and has identical or overlapping start (within 60s)
      if (next && Math.abs(next.start - cur.start) <= 60) {
        // If cur has a valid closed end and next has no end (ghost duplicate), keep cur and discard next ghost
        if (cur.end > 0 && (!next.end || next.end === 0)) {
          i++; // Skip next ghost
          cleanLogs.push(cur);
          continue;
        } else if ((!cur.end || cur.end === 0) && next.end > 0) {
          // If cur is ghost and next has closed end, keep next
          cleanLogs.push(next);
          i++;
          continue;
        }
      }

      cleanLogs.push(cur);
    }

    // Clamp non-last unclosed events and handle active state against machine status
    const isMachineOn = status === "ON";
    const effectiveStatusSince = Math.max(statusSince, started);

    for (let i = 0; i < cleanLogs.length; i++) {
      const log = cleanLogs[i];
      const isLast = i === cleanLogs.length - 1;

      if (!log.end || log.end === 0) {
        if (!isLast) {
          // A non-last unclosed event cannot be active past the start of the next event
          log.end = Math.max(cleanLogs[i + 1].start, log.start);
        } else {
          // This is the last event
          if (isMachineOn) {
            // Machine is currently ON; this stoppage was orphaned when production resumed
            log.end = Math.max(effectiveStatusSince, log.start);
          } else {
            // Machine is currently IDLE or OFF; this stoppage is truly active
            log.end = 0;
          }
        }
      } else {
        // If log.end was set, ensure it doesn't spill over into next event start
        if (!isLast && cleanLogs[i + 1].start > log.start && log.end > cleanLogs[i + 1].start) {
          log.end = cleanLogs[i + 1].start;
        }
      }

      if (log.reason?.scheduled) {
        const segDuration = log.end ? log.end - log.start : Math.max(nowUtc - log.start, 0);
        scheduledDowntime += Math.max(segDuration, 0);
      }

      logs.push(log);
    }
  }
  if (logs.length === 0) logs = "NOT_FOUND";
  const [projectedEndTime, currentOccupancy] = (() => {
    const shots =
      ((productionTargets?.[moldName]?.target?.total || 0) -
        (productionTargets?.[moldName]?.target?.current || 0)) /
      (machine.installedMold
        ? +machine.installedMold.cavities
        : +machine.cavities);
    const time = cycleTime * Math.ceil(shots);
    if (time === 0) return [0, 0];
    return [dayjs().unix() + time, time];
  })();
  let totalOccupancy = 0;
  const targetQueues: DataToSet["productionQueues"]["targets"] = [];
  if (productionTargets?.[moldName]?.target?.total) {
    totalOccupancy += (currentOccupancy || 0) / 3600;
    targetQueues.push({
      started: true,
      id: "current",
      duration: currentOccupancy || 0,
      name: productionTargets[moldName].name,
      target:
        productionTargets[moldName].target.total -
        productionTargets[moldName].target.current,
      mold: moldName,
      cycleTime,
    });
  }
  for (const queue of productionQueues) {
    totalOccupancy += queue.duration / 3600;
    targetQueues.push({
      started: false,
      id: queue.id,
      duration: queue.duration,
      name: queue.target.name,
      target: queue.target.target.total,
      mold: queue.moldName,
      cycleTime: queue.cycleTime,
    });
  }
  const hours: DataToSet["hours"] = [];
  const timings = {
    ontime: 0,
    downtime: 0,
  };
  const rawHours = Object.entries(
    productionTargets?.[moldName]?.hours || {},
  );
  rawHours.sort(([a], [b]) => a.localeCompare(b));

  const recordedHoursMap = new Map<number, DataToSet["hours"][0]>();
  let minHourUnix = Infinity;
  let maxHourUnix = -Infinity;

  for (const [dateHour, _data] of rawHours) {
    const data = _data as any;
    const dateHourSplit = (dateHour as string).split("-"); // 2024-01-01-01
    const date = dateHourSplit.slice(0, 3).join("-");
    const rawStartTime = (data.time || "").split("-")[0]?.trim() || "00:00";
    const startTime = rawStartTime.length === 4 ? `0${rawStartTime}` : rawStartTime;
    const startUnix = dayjs(`${date} ${startTime}`).unix();

    if (!isNaN(startUnix) && started > 0 && startUnix + 3600 <= started) {
      continue;
    }

    if (!isNaN(startUnix)) {
      const normUnix = Math.floor(startUnix / 3600) * 3600;
      const hourEntry: DataToSet["hours"][0] = {
        downtime: data.downtime || 0,
        ontime: data.ontime || 0,
        production: data.production || 0,
        time: data.time || "NA",
        date: dayjs(date).format("D MMM, YY"),
        rawDate: date,
        unix: normUnix,
        isOffShift: false,
      };
      recordedHoursMap.set(normUnix, hourEntry);
      minHourUnix = Math.min(minHourUnix, normUnix);
      maxHourUnix = Math.max(maxHourUnix, normUnix);
    }
  }

  // Generate continuous uniform hourly timeline between start and current/max hour
  if (minHourUnix !== Infinity && maxHourUnix !== -Infinity && minHourUnix <= maxHourUnix) {
    const shiftCount = shifts.shifts || 2;
    const shiftA = +(shifts.A || 25200);
    const shiftB = +(shifts.B || 54000);

    const nowHourUnix = Math.floor(dayjs().unix() / 3600) * 3600;
    const effectiveMaxUnix = Math.min(Math.max(maxHourUnix, minHourUnix), nowHourUnix);

    for (let u = minHourUnix; u <= effectiveMaxUnix; u += 3600) {
      const existing = recordedHoursMap.get(u);
      if (existing) {
        timings.ontime += existing.ontime || 0;
        timings.downtime += existing.downtime || 0;
        hours.push(existing);
      } else {
        const d = dayjs.unix(u);
        const secOfDay = d.hour() * 3600 + d.minute() * 60;

        let isOffShift = false;
        if (shiftCount === 1) {
          isOffShift = secOfDay < shiftA || secOfDay >= shiftA + 8 * 3600;
        } else if (shiftCount === 2) {
          const shiftBEnd = !isNaN(shiftB) ? shiftB + 8 * 3600 : shiftA + 16 * 3600;
          isOffShift = secOfDay < shiftA || secOfDay >= shiftBEnd;
        } else if (shiftCount === 3) {
          isOffShift = false;
        }

        hours.push({
          downtime: isOffShift ? 0 : 3600,
          ontime: 0,
          production: 0,
          time: `${d.format("HH:mm")} - ${d.add(1, "hour").format("HH:mm")}`,
          date: d.format("D MMM, YY"),
          rawDate: d.format("YYYY-MM-DD"),
          unix: u,
          isOffShift,
        });
      }
    }
  }

  // Overlay downtime categorization onto each hour
  if (Array.isArray(logs) && logs.length > 0) {
    for (const h of hours) {
      const hStart = h.unix || dayjs(`${h.rawDate || h.date} ${(h.time || "").split("-")[0]?.trim()}`).unix();
      const hEnd = hStart + 3600;
      if (isNaN(hStart) || (h.downtime || 0) <= 0) continue;

      const matchingLogs = logs.filter(l => {
        const lEnd = l.end && l.end > l.start ? l.end : dayjs().unix();
        return l.start < hEnd && lEnd > hStart;
      });

      if (matchingLogs.length > 0) {
        const catMap = new Map<string, { category: string; scheduled: boolean; note?: string }>();
        let plannedInHour = 0;

        for (const l of matchingLogs) {
          const cat = l.reason?.category || "uncategorized";
          const scheduled = !!l.reason?.scheduled;
          const overlapStart = Math.max(l.start, hStart);
          const lEnd = l.end && l.end > l.start ? l.end : dayjs().unix();
          const overlapEnd = Math.min(lEnd, hEnd);
          const overlapDur = Math.max(overlapEnd - overlapStart, 0);

          if (scheduled) {
            plannedInHour += overlapDur;
          }
          const key = cat.toLowerCase();
          if (!catMap.has(key)) {
            catMap.set(key, { category: cat, scheduled, note: l.reason?.note });
          } else if (scheduled) {
            catMap.get(key)!.scheduled = true;
          }
        }

        const items = Array.from(catMap.values());
        h.downtimeReason = items.map(it => `${it.category.toUpperCase()}${it.scheduled ? " (Planned)" : ""}`).join(", ");
        h.downtimeCategory = items.map(it => it.category.toUpperCase()).join(", ");
        h.isPlanned = items.some(it => it.scheduled);
        h.plannedDowntime = Math.min(plannedInHour, h.downtime || 3600);
      }
    }
  }
  const due = productionTargets?.[moldName]?.target?.due;
  const track: number = (() => {
    if (!due) return 0;
    const dueTime = dayjs(due).unix();
    const diff = dueTime - projectedEndTime;
    return diff;
  })();
  const shouldbe: number = (() => {
    let pcs = productionTargets?.[moldName]?.target?.current || 0;
    if (!track || !due) return pcs;
    if (track > 0 || !cycleTime) return pcs;
    if (dayjs(due).isBefore(dayjs()))
      return productionTargets?.[moldName]?.target?.total || 0;
    pcs += Math.abs(track) / cycleTime;
    return +pcs.toFixed(0);
  })();
  const data: DataToSet = {
    notificationCategories: Object.keys(deviceCategories) as string[],
    productionQueues: {
      targets: targetQueues,
      totalOccupancy: Math.ceil(totalOccupancy),
    },
    name: machinesAllowed[machineID],
    status: {
      status,
      since: statusSince,
    },
    target: {
      defaultMonitorDowntime: monitorDowntime,
      machineMonitorDowntime:
        !!productionTargets?.[moldName]?.target?.monitorDowntime,
      name: productionTargets?.[moldName]?.name || "",
      due: productionTargets?.[moldName]?.target?.due,
      target: productionTargets?.[moldName]?.target?.total || 0,
      hourlyTarget: productionTargets?.[moldName]?.target?.hourlyTarget || 0,
      notifications:
        productionTargets?.[moldName]?.notifications ||
        ([] as DataToSet["target"]["notifications"]),
      notificationCategories:
        productionTargets?.[moldName]?.notificationCategories || [],
      started,
      sapOrder: isSapFeatureEnabled()
        ? productionTargets?.[moldName]?.sapOrder || null
        : null,
    },
    progress: {
      total: productionTargets?.[moldName]?.target?.total || 0,
      current: productionTargets?.[moldName]?.target?.current || 0,
      track,
      shouldbe,
    },
    mold: {
      name: moldName,
      since: machine.mold_start_time,
      cavities: machine.installedMold
        ? +machine.installedMold.cavities
        : +machine.cavities,
      cycleTime,
    },
    lastCompletedTarget: completedTarget,
    hours,
    OEE: +(
      // ratio between ontime and effective total time (planned downtime does not penalize efficiency)
      (() => {
        const effectiveDowntime = Math.max((timings.downtime || 0) - (scheduledDowntime || 0), 0);
        const totalEffective = (timings.ontime || 0) + effectiveDowntime;
        return totalEffective > 0
          ? ((timings.ontime || 0) / totalEffective) * 100
          : 0;
      })().toFixed(2)
    ),
    timing: {
      ontime: timings.ontime || 0,
      downtime: {
        total: timings.downtime || 0,
        scheduled: scheduledDowntime || 0,
        logs,
      },
      projectedEndTime,
    },
    operator: {
      name: operator,
      shift: shiftTiming,
    },
    updated,
  };
  return data;
};

export default fetch;
