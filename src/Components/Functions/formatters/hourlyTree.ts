import secToTime from "../converters/secondsToHourMin";
import numberFormatter from "../formatters/numberFormatter";
import weightFormatter from "../formatters/weightFormatter";
import unitFormatter from "../formatters/unitFormatter";
import secFormatter from "./secFormatter";
import { SortedHourTree } from "../../../routes/Machines/Machine/types";
import lengthFormatter from "./lengthFormatter";
import dayjs from "../dayjs";

interface RawHours {
  start: number;
  end: number;
  shots: number;
  production_meters: number;
  production: number;
  material: number;
  electricity: number;
  ontime: number;
  offtime: number;
  idletime: number;
  cycleTime: number;
  operator: string[];
  mold: string[];
  product: string[];
  children?: RawHours[];
  reason?: any;
}
type ShiftKeys = "A" | "B" | "C";

const sortHourlyTree = async (
  shifts: {
    A: number;
    B: number;
    C: number;
    shifts: number;
  },
  records: any[],
  date?: string,
  downtimes?: any[] | Record<string, any>,
): Promise<SortedHourTree[]> => {
  if (!records) return [];
  records = Object.values(records).sort((a, b) => a.time - b.time);

  const rawList = Array.isArray(downtimes) ? downtimes : (downtimes ? Object.values(downtimes) : []);
  const dayStartUnix = date ? dayjs(`${date} 00:00:00`).unix() : 0;

  interface NormalizedDowntime {
    start: number;
    end: number;
    category: string;
    note: string;
    scheduled: boolean;
  }
  const normalizedDowntimes: NormalizedDowntime[] = [];
  for (const d of rawList as any[]) {
    if (!d) continue;

    // Check if d represents an actual downtime/stoppage event
    const hasDowntime = Boolean(
      (typeof d.offtime === "number" && d.offtime > 0) ||
      (typeof d.shutdown_time === "number" && d.shutdown_time > 0) ||
      (typeof d.idletime === "number" && d.idletime > 0) ||
      d.status === "IDLE" ||
      d.status === "OFF" ||
      d.isShutdown ||
      d.reason
    );
    // If it's a pure running/production chunk without stoppage or reason, skip it!
    if (!hasDowntime && typeof d.ontime === "number" && d.ontime > 0) {
      continue;
    }

    const reason = typeof d.reason === "object" ? d.reason : null;
    const category = (d.category || reason?.category || (typeof d.reason === "string" ? d.reason : "uncategorized")).toString();
    const note = (d.note || reason?.note || "").toString();
    const scheduled = Boolean(d.scheduled ?? reason?.scheduled);

    let startSec = typeof d.from === "number"
      ? d.from
      : (typeof d.start === "number"
        ? (d.start > 1000000 && dayStartUnix > 0 ? d.start - dayStartUnix : d.start)
        : 0);

    let endSec = typeof d.time === "number"
      ? d.time
      : (typeof d.to === "number"
        ? d.to
        : (typeof d.end === "number" && d.end > 0
          ? (d.end > 1000000 && dayStartUnix > 0 ? d.end - dayStartUnix : d.end)
          : startSec + (d.duration || (typeof d.offtime === "number" && d.offtime > 0 ? d.offtime : (typeof d.shutdown_time === "number" && d.shutdown_time > 0 ? d.shutdown_time : 3600)))));

    normalizedDowntimes.push({
      start: startSec,
      end: endSec,
      category,
      note,
      scheduled,
    });
  }

  const getDowntimeForRange = (rangeStart: number, rangeEnd: number, hasDowntime: boolean) => {
    if (!hasDowntime) {
      return {
        downtimeReason: "-",
        downtimeCategory: "-",
        isPlanned: false,
        downtimeNote: ""
      };
    }

    if (normalizedDowntimes.length === 0) {
      return {
        downtimeReason: "UNCATEGORIZED",
        downtimeCategory: "UNCATEGORIZED",
        isPlanned: false,
        downtimeNote: ""
      };
    }

    const matches = normalizedDowntimes.filter((d: any) => {
      const overlapsDirect = d.start < rangeEnd && d.end > rangeStart;
      const overlapsWrapped = (d.start + 86400) < rangeEnd && (d.end + 86400) > rangeStart;
      const overlapsUnwrapped = (d.start - 86400) < rangeEnd && (d.end - 86400) > rangeStart;
      return overlapsDirect || overlapsWrapped || overlapsUnwrapped;
    });

    if (matches.length === 0) {
      return {
        downtimeReason: "UNCATEGORIZED",
        downtimeCategory: "UNCATEGORIZED",
        isPlanned: false,
        downtimeNote: ""
      };
    }

    const categoryMap = new Map<string, { category: string; scheduled: boolean; notes: string[] }>();
    for (const m of matches) {
      const rawCat = (m.category || "uncategorized").trim();
      const key = rawCat.toLowerCase();
      const existing = categoryMap.get(key);
      if (!existing) {
        categoryMap.set(key, {
          category: rawCat,
          scheduled: !!m.scheduled,
          notes: m.note && m.note !== "None" ? [m.note] : []
        });
      } else {
        if (m.scheduled) existing.scheduled = true;
        if (m.note && m.note !== "None" && !existing.notes.includes(m.note)) {
          existing.notes.push(m.note);
        }
      }
    }

    let items = Array.from(categoryMap.values());
    if (items.length > 1 && items.some(it => it.category.toLowerCase() !== "uncategorized")) {
      items = items.filter(it => it.category.toLowerCase() !== "uncategorized");
    }
    const isPlanned = items.some(it => it.scheduled);
    const categoriesList = items.map(it => it.category.toUpperCase());
    const downtimeReason = items.map(it => `${it.category.toUpperCase()}${it.scheduled ? " (Planned)" : ""}`).join(", ");
    const downtimeNote = items.flatMap(it => it.notes).join("; ");

    return {
      downtimeReason,
      downtimeCategory: categoriesList.join(", "),
      isPlanned,
      downtimeNote
    };
  };

  //   set raw hours
  const hours: RawHours[] = [];
  const shiftsKeys: ShiftKeys[] = ["A", "B", "C"];
  for (let i = 0; i < shifts.shifts; i++) {
    const next = i + 1 === shifts.shifts ? 0 : i + 1;
    let start = shifts[shiftsKeys[i]];
    let end =
      shifts.shifts === 1
        ? shifts[shiftsKeys[i]] - 1
        : shifts[shiftsKeys[next]];
    if (start > end) {
      end += 86400;
    }
    hours.push({
      start,
      end,
      shots: 0,
      production_meters: 0,
      production: 0,
      material: 0,
      electricity: 0,
      ontime: 0,
      offtime: 0,
      idletime: 0,
      cycleTime: 0,
      operator: [],
      mold: [],
      children: [],
      product: [],
    });
  }
  for (let i = 0; i < 24; i++) {
    const start = shifts.A + i * 3600;
    const end = shifts.A + (i + 1) * 3600 + 59;
    const shiftIndex = hours.findIndex(
      (hour) => start >= hour.start && end <= hour.end + 60,
    );
    if (shiftIndex === -1) continue;
    const hour = hours[shiftIndex];
    hour.children?.push({
      start,
      end,
      shots: 0,
      production_meters: 0,
      production: 0,
      material: 0,
      electricity: 0,
      ontime: 0,
      offtime: 0,
      idletime: 0,
      cycleTime: 0,
      operator: [],
      mold: [],
      children: [],
      product: [],
    });
  }

  for await (const _hour of records) {
    const hour = _hour as any;
    const start = new Date(hour.from * 1000).getTime() / 1000;
    const end = new Date(hour.time * 1000).getTime() / 1000;

    // shift
    const shiftIndex = hours.findIndex(
      (hour) => start >= hour.start && end <= hour.end + 60,
    );
    if (shiftIndex === -1) continue;
    const shiftHour = hours[shiftIndex];
    const product = `${hour.product}(${hour.product_color})`;
    const cycleTime = hour.production_meters
      ? hour.ontime && hour.production_meters
        ? hour.ontime / hour.production_meters
        : 0
      : hour.ontime === 0 || hour.shots === 0
      ? 0
      : hour.ontime / hour.shots;
    shiftHour.shots += hour.shots;
    shiftHour.production_meters += hour.production_meters || 0;
    shiftHour.production += hour.production;
    shiftHour.material += hour.material_usage;
    shiftHour.electricity += hour.electricity_usage;
    shiftHour.ontime += hour.ontime;
    shiftHour.offtime += hour.shutdown_time || 0;
    shiftHour.idletime += hour.offtime;
    shiftHour.cycleTime = shiftHour.production_meters
      ? shiftHour.ontime && shiftHour.production_meters
        ? shiftHour.ontime / shiftHour.production_meters
        : 0
      : shiftHour.shots && shiftHour.ontime
      ? shiftHour.ontime / shiftHour.shots
      : 0;
    if (!shiftHour.operator.includes(hour.operator))
      shiftHour.operator.push(hour.operator);
    if (!shiftHour.mold.includes(hour.mold_name))
      shiftHour.mold.push(hour.mold_name);
    if (!shiftHour.product.includes(product)) shiftHour.product.push(product);

    //hour
    const hourIndex = shiftHour.children?.findIndex(
      (hour) => start >= hour.start && end <= hour.end,
    );
    if (hourIndex === undefined || hourIndex === -1) {
      continue;
    }
    if (!shiftHour.children?.[hourIndex]) continue;
    const hourChild = shiftHour.children[hourIndex];
    hourChild.shots += hour.shots;
    hourChild.production_meters += hour.production_meters || 0;
    hourChild.production += hour.production;
    hourChild.material += hour.material_usage;
    hourChild.electricity += hour.electricity_usage;
    hourChild.ontime += hour.ontime;
    hourChild.offtime += hour.shutdown_time || 0;
    hourChild.idletime += hour.offtime;
    hourChild.cycleTime = hour.production_meters
      ? hourChild.production_meters && hourChild.ontime
        ? hourChild.ontime / hourChild.production_meters
        : 0
      : hourChild.shots && hourChild.ontime
      ? hourChild.ontime / hourChild.shots
      : 0;
    if (!hourChild.operator.includes(hour.operator))
      hourChild.operator.push(hour.operator);
    if (!hourChild.mold.includes(hour.mold_name))
      hourChild.mold.push(hour.mold_name);
    if (!hourChild.product.includes(product)) hourChild.product.push(product);

    // last record
    hourChild.children = hourChild.children || [];
    hourChild.children.push({
      start,
      end,
      shots: hour.shots,
      production_meters: hour.production_meters || 0,
      production: hour.production,
      material: hour.material_usage,
      electricity: hour.electricity_usage,
      ontime: hour.ontime,
      offtime: hour.shutdown_time || 0,
      idletime: hour.offtime,
      cycleTime: cycleTime,
      operator: hour.operator,
      mold: hour.mold_name,
      product: product as any,
      reason: hour.reason,
    });
    shiftHour.children[hourIndex] = hourChild;
  }

  //   sort
  const sortedHours: SortedHourTree[] = [];
  for (const [shiftIndex, shift] of Object.entries(hours)) {
    const shiftDuration = shift.end - shift.start;
    if (shift.offtime > shiftDuration) {
      shift.offtime = shiftDuration;
    }
    if (shift.ontime + shift.idletime + shift.offtime > shiftDuration) {
      let extra = (shift.ontime + shift.idletime + shift.offtime) - shiftDuration;
      if (shift.offtime >= extra) {
        shift.offtime -= extra;
      } else {
        extra -= shift.offtime;
        shift.offtime = 0;
        if (shift.idletime >= extra) {
          shift.idletime -= extra;
        } else {
          shift.idletime = 0;
          shift.ontime = Math.max(0, shift.ontime - extra);
        }
      }
    }
    const ontime = shift.ontime > 0;
    const offtime = shift.offtime > 0;
    const idletime = shift.idletime > 0;
    let _status: any = {};
    if (ontime) _status["ON"] = true;
    if (offtime) _status["OFF"] = true;
    if (idletime) _status["IDLE"] = true;
    const status = Object.keys(_status).join(", ");
    const shiftHasDowntime = (shift.offtime > 0 || shift.idletime >= 60);
    const shiftDt = getDowntimeForRange(shift.start, shift.end, shiftHasDowntime);

    const sortedShift: SortedHourTree = {
      key: shiftIndex.toString(),
      data: {
        time: secToTime(shift.start) + " - " + secToTime(shift.end),
        status,
        shots: numberFormatter(shift.shots, "shot(s)"),
        production_meters: lengthFormatter(shift.production_meters),
        production: numberFormatter(shift.production, "pc(s)"),
        material: weightFormatter(shift.material),
        electricity: unitFormatter(shift.electricity),
        ontime: secFormatter(shift.ontime),
        offtime: secFormatter(shift.offtime),
        idletime: secFormatter(shift.idletime),
        cycleTime: shift.cycleTime.toFixed(0) + "s",
        operator: shift.operator.join(", "),
        mold: shift.mold.join(", "),
        product: shift.product.join(", "),
        downtimeReason: shiftDt.downtimeReason,
        downtimeCategory: shiftDt.downtimeCategory,
        isPlanned: shiftDt.isPlanned,
        downtimeNote: shiftDt.downtimeNote,
      },
      children: [],
    };
    for await (const [hourIndex, hour] of Object.entries(
      shift.children || [],
    )) {
      const hourDuration = hour.end - hour.start;
      if (hour.offtime > hourDuration) {
        hour.offtime = hourDuration;
      }
      if (hour.ontime + hour.idletime + hour.offtime > hourDuration) {
        let extra = (hour.ontime + hour.idletime + hour.offtime) - hourDuration;
        if (hour.offtime >= extra) {
          hour.offtime -= extra;
        } else {
          extra -= hour.offtime;
          hour.offtime = 0;
          if (hour.idletime >= extra) {
            hour.idletime -= extra;
          } else {
            hour.idletime = 0;
            hour.ontime = Math.max(0, hour.ontime - extra);
          }
        }
      }
      const ontime = hour.ontime > 0;
      const offtime = hour.offtime > 0;
      const idletime = hour.idletime > 0;
      let _status: any = {};
      if (ontime) _status["ON"] = true;
      if (offtime) _status["OFF"] = true;
      if (idletime) _status["IDLE"] = true;
      const status = Object.keys(_status).join(", ");
      const hourHasDowntime = (hour.offtime > 0 || hour.idletime >= 60);
      const hourDt = getDowntimeForRange(hour.start, hour.end, hourHasDowntime);

      const sortedHour: SortedHourTree = {
        key: `${shiftIndex.toString()}-${hourIndex.toString()}`,
        data: {
          time: secToTime(hour.start) + " - " + secToTime(hour.end),
          status,
          shots: numberFormatter(hour.shots, "shot(s)"),
          production_meters: lengthFormatter(hour.production_meters),
          production: numberFormatter(hour.production, "pc(s)"),
          material: weightFormatter(hour.material),
          electricity: unitFormatter(hour.electricity),
          ontime: secFormatter(hour.ontime),
          offtime: secFormatter(hour.offtime),
          idletime: secFormatter(hour.idletime),
          cycleTime: hour.cycleTime.toFixed(0) + "s",
          operator: hour.operator.join(", "),
          mold: hour.mold.join(", "),
          product: hour.product.join(", "),
          downtimeReason: hourDt.downtimeReason,
          downtimeCategory: hourDt.downtimeCategory,
          isPlanned: hourDt.isPlanned,
          downtimeNote: hourDt.downtimeNote,
        },
        children: [],
      };
      for await (const [recordIndex, record] of Object.entries(
        hour.children || [],
      )) {
        const ontime = record.ontime > 0;
        const offtime = record.offtime > 0;
        const idletime = record.idletime > 0;
        let _status: any = {};
        if (ontime) _status["ON"] = true;
        if (offtime) _status["OFF"] = true;
        if (idletime) _status["IDLE"] = true;
        const status = Object.keys(_status).join(", ");
        const recordHasDowntime = (record.offtime > 0 || record.idletime >= 60);
        let recordDt = getDowntimeForRange(record.start, record.end, recordHasDowntime);
        if (record.reason && recordHasDowntime) {
          const r = typeof record.reason === "object" ? record.reason : null;
          const cat = (r?.category || (typeof record.reason === "string" ? record.reason : "uncategorized")).toString();
          const note = (r?.note || "").toString();
          const scheduled = Boolean(r?.scheduled);
          recordDt = {
            downtimeReason: `${cat.toUpperCase()}${scheduled ? " (Planned)" : ""}`,
            downtimeCategory: cat.toUpperCase(),
            isPlanned: scheduled,
            downtimeNote: note
          };
        }

        const sortedRecord: SortedHourTree = {
          key: `${shiftIndex.toString()}-${hourIndex.toString()}-${recordIndex.toString()}`,
          data: {
            time: secToTime(record.start) + " - " + secToTime(record.end),
            status,
            shots: numberFormatter(record.shots, "shot(s)"),
            production_meters: lengthFormatter(record.production_meters),
            production: numberFormatter(record.production, "pc(s)"),
            material: weightFormatter(record.material),
            electricity: unitFormatter(record.electricity),
            ontime: secFormatter(record.ontime),
            offtime: secFormatter(record.offtime),
            idletime: secFormatter(record.idletime),
            cycleTime: record.cycleTime.toFixed(0) + "s",
            operator: record.operator.toString(),
            mold: record.mold.toString(),
            product: record.product.toString(),
            downtimeReason: recordDt.downtimeReason,
            downtimeCategory: recordDt.downtimeCategory,
            isPlanned: recordDt.isPlanned,
            downtimeNote: recordDt.downtimeNote,
          },
        };
        sortedHour.children?.push(sortedRecord);
      }
      sortedShift.children?.push(sortedHour);
    }
    sortedHours.push(sortedShift);
  }
  return sortedHours;
};

export default sortHourlyTree;
