import { Machine } from ".";
import { get } from "../../Components/firebase/api/db";
import store from "../../Components/Store";
import {
  dateAtom,
  machinesAtom,
  offlineTimeAtom,
  shiftsAtom,
} from "../../Components/Store/atoms";
import { selectedFactoryType } from "../Dashboard";
import dayjs from "../../Components/Functions/dayjs";
import secondsToHourMin from "../../Components/Functions/converters/secondsToHourMin";
import { MachineStatusType } from "../Machines/types";
import { isSapFeatureEnabled } from "../../Services/sap";

const fetch = async (
  factories: any[],
  selectedFactory: selectedFactoryType,
): Promise<Machine[]> => {
  const data: Machine[] = [];
  const mySelectedFactory: any = factories[selectedFactory.value];
  const date = store.get(dateAtom);
  const machinesSnap = await get(`machines`);
  const machinesAllowed = store.get(machinesAtom);
  const shifts = store.get(shiftsAtom);
  const offlineTime = store.get(offlineTimeAtom);
  if (!shifts || !date || !machinesAllowed) return data;
  const machines = Object.fromEntries(
    Object.entries(machinesSnap.val() || {}).sort(
      (a: any, b: any) => a[1].sort - b[1].sort,
    ),
  );
  const machinesKeys = Object.keys(machines).filter(
    (key) =>
      (mySelectedFactory === undefined ||
        mySelectedFactory?.machines?.includes(key)) &&
      (!machinesAllowed || machinesAllowed[key]),
  );
  const promises = [];
  for await (const machineKey of machinesKeys) {
    promises.push(get(`machines/${machineKey}/installedMold/name`));
  }
  const moldNamesSnap = await Promise.all(promises);
  promises.length = 0;
  promises.push(get(`units`));
  promises.push(get(`production-targets/active`));
  let index = 0;
  for await (const machineKey of machinesKeys) {
    const moldName = moldNamesSnap[index].val() || "UNSET";
    promises.push(get(`molds/${machineKey}/${moldName}/cycleTimeAvg`));
    index++;
  }
  const [unitsSnap, productionTargetSnap, ...cycleTimeSnaps] =
    await Promise.all(promises);
  const units = unitsSnap.val();
  const productionTargets = productionTargetSnap.val() || {};
  index = 0;
  for await (const machineKey of machinesKeys) {
    const machine = machines[machineKey] as any;
    machine.unit ||= 1;
    if (units[machine.unit] === undefined) continue;
    const {
      cleanDisconnect,
      last_seen,
      lastContact,
    }: {
      connected: boolean;
      cleanDisconnect: boolean;
      last_seen: number;
      lastContact: number;
    } = units[machine.unit] as any;
    const diff = dayjs().diff(dayjs.unix(lastContact || 0), "minute");
    const connected = diff <= offlineTime;
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
          return (
            secondsToHourMin(shifts.A) + " - " + secondsToHourMin(shifts.A)
          );
        else
          return (
            secondsToHourMin(shifts.A) + " - " + secondsToHourMin(shifts.B)
          );
      } else if (shift === "B") {
        if (isNaN(shifts.C))
          return (
            secondsToHourMin(shifts.B) + " - " + secondsToHourMin(shifts.A)
          );
        else
          return (
            secondsToHourMin(shifts.B) + " - " + secondsToHourMin(shifts.C)
          );
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
    const moldName = machine.installedMold
      ? machine.installedMold.name
      : machine.mold_name;
    const cycleTime = +(cycleTimeSnaps[index].val() || 0).toFixed(0);
    index++;
    const projectedEndTime = (() => {
      const shots =
        ((productionTargets?.[machineKey]?.[moldName]?.target?.total || 0) -
          (productionTargets?.[machineKey]?.[moldName]?.target?.current || 0)) /
        (machine.installedMold
          ? +machine.installedMold.cavities
          : +machine.cavities);
      const time = cycleTime * shots;
      return dayjs().unix() + time;
    })();
    const hours: Machine["hours"] = [];
    const timings = {
      ontime: 0,
      downtime: 0,
    };
    const rawHours = Object.entries(
      productionTargets?.[machineKey]?.[moldName]?.hours || {},
    );
    rawHours.sort(([a], [b]) => a.localeCompare(b));

    for (const [dateHour, _data] of rawHours) {
      const data = _data as any;
      const dateHourSplit = (dateHour as string).split("-"); // 2024-01-01-01
      const date = dateHourSplit.slice(0, 3).join("-");
      const rawStartTime = (data.time || "").split("-")[0]?.trim() || "00:00";
      const startTime = rawStartTime.length === 4 ? `0${rawStartTime}` : rawStartTime;
      const startUnix = dayjs(`${date} ${startTime}`).unix();

      const startedVal = +(
        (productionTargets?.[machineKey]?.[moldName]?.startedAt || 0) / 1000
      ).toFixed(0);
      if (!isNaN(startUnix) && startedVal > 0 && startUnix + 3600 <= startedVal) {
        continue;
      }

      timings.ontime += data.ontime || 0;
      timings.downtime += data.downtime || 0;
      hours.push({
        downtime: data.downtime || 0,
        ontime: data.ontime || 0,
        production: data.production || 0,
        time: data.time || "NA",
        date: dayjs(date).format("D MMM, YY"),
        rawDate: date,
        unix: isNaN(startUnix) ? undefined : startUnix,
      });
    }
    const due: string | undefined =
      productionTargets?.[machineKey]?.[moldName]?.target?.due;
    // if expected end time is after due time, then red, else if it's within 30 minutes, then orange, else green
    const track: number = (() => {
      if (!due) return 0;
      const dueTime = dayjs(due).unix();
      const diff = dueTime - projectedEndTime;
      return diff;
    })();
    const shouldbe: number = (() => {
      let pcs =
        productionTargets?.[machineKey]?.[moldName]?.target?.current || 0;
      if (!track || !due) return pcs;
      if (track > 0 || !cycleTime) return pcs;
      if (dayjs(due).isBefore(dayjs()))
        return productionTargets?.[machineKey]?.[moldName]?.target?.total || 0;
      pcs += Math.abs(track) / cycleTime;
      return +pcs.toFixed(0);
    })();
    const started = +(
      (productionTargets?.[machineKey]?.[moldName]?.startedAt || 0) / 1000
    ).toFixed(0);
    const machineObj: Machine = {
      id: machineKey,
      target: {
        name: productionTargets?.[machineKey]?.[moldName]?.name || "",
        due: productionTargets?.[machineKey]?.[moldName]?.target?.due,
        target: productionTargets?.[machineKey]?.[moldName]?.target?.total || 0,
        started,
        sapOrder: isSapFeatureEnabled()
          ? productionTargets?.[machineKey]?.[moldName]?.sapOrder || null
          : null,
      },
      hasTarget: productionTargets?.[machineKey]?.[moldName] !== undefined,
      name: machine.machine_model,
      status: {
        status,
        since: statusSince,
      },
      progress: {
        total: productionTargets?.[machineKey]?.[moldName]?.target?.total || 0,
        current:
          productionTargets?.[machineKey]?.[moldName]?.target?.current || 0,
        track,
        shouldbe,
      },
      mold: {
        name: moldName,
        since: machine.mold_start_time,
        cycleTime,
      },
      hours,
      OEE: +(
        // ratio between ontime and ontime + idle time
        (
          timings.ontime && timings.ontime + timings.downtime
            ? (timings.ontime / (timings.ontime + timings.downtime)) * 100
            : 0
        ).toFixed(2)
      ),
      timing: {
        ontime: timings.ontime || 0,
        downtime: timings.downtime || 0,
        projectedEndTime,
      },
      operator: {
        name: operator,
        shift: shiftTiming,
      },
      updated,
    };
    data.push(machineObj);
  }

  // console.log("🚀 ~ data:", data);
  return data;
};

export default fetch;
