import { get } from "../../Components/firebase/api/db";
import dayjs from "../../Components/Functions/dayjs";
import secondsToHourMin from "../../Components/Functions/converters/secondsToHourMin";
import store from "../../Components/Store";
import {
  baseDepartmentAtom,
  EnvListAtom,
  equipmentsAtom,
  machinesAtom,
  offlineTimeAtom,
  uidAtom,
} from "../../Components/Store/atoms";
import {
  getAccessibleFactoryIndices,
  getScopedAssetMap,
  isActivityInScope,
  isMasterOwner,
  toIdArray,
} from "../../Services/rbac";
import { setCachedUnitMac } from "../../Services/telemetry/useUnitMac";

interface statProp {
  value: number;
  change: number;
  chart: number[];
}
interface StatsProps {
  shots: statProp;
  production_meters: statProp;
  production: statProp;
  material: statProp;
  electricity: statProp;
  realtimeKW: {
    current: number;
    change: number;
  };
}
interface machineProps {
  name: string;
  shots: number;
  production_meters: number;
  production: number;
  material: number;
  electricity: number;
  status: string;
  mold: string;
  at: number;
}
interface equipmentProps {
  name: string;
  electricity: number;
  status: string;
  at: number;
}
interface machinesHour {
  hour: string;
  machine: string;
  value: {
    shots: number;
    production_meters: number;
    production: number;
    material: number;
    electricity: number;
  };
}
interface equipmentHour {
  hour: string;
  equipment: string;
  value: number;
}
interface ActivityProps {
  name: string;
  state: string;
  status: "OK" | "WARNING" | "ERROR";
  title: string;
  unix: number;
}
interface returnProps {
  total: StatsProps;
  machines: {
    [key: string]: machineProps;
  };
  equipments:
    | {
        [key: string]: equipmentProps;
      }
    | "NOT_FOUND";
  units: {
    [key: string]: any;
  };
  machineHourly: machinesHour[];
  equipmentHourly: equipmentHour[] | "NOT_FOUND";
  notFound: boolean;
  supervisor: string;
  hours: any[];
  activities: "NOT_FOUND" | ActivityProps[];
}
const stat = {
  value: 0,
  change: 0,
  chart: [] as number[],
};
interface selectedFactoryType {
  name: string;
  value: number;
  only: boolean;
}
const fetch = (
  date: string | undefined = dayjs().format("YYYY-MM-DD"),
  shift_a_start: number | undefined = 28800,
  factories: any[],
  selectedFactory: selectedFactoryType,
): Promise<returnProps> => {
  const mySelectedFactory: any = factories[selectedFactory.value];
  const shift_start_minutes = (shift_a_start % 3600) / 60;
  const min = dayjs().minute();
  const thisHourpastMin =
    min < shift_start_minutes
      ? min + shift_start_minutes
      : min - shift_start_minutes;
  return new Promise(async (resolve, reject) => {
    const stats = {
      total: {
        shots: { ...stat },
        production_meters: { ...stat },
        production: { ...stat },
        material: { ...stat },
        electricity: { ...stat },
        realtimeKW: {
          current: 0,
          change: 0,
        },
      },
      machines: {},
      equipments: "NOT_FOUND" as returnProps["equipments"],
      units: {} as {
        [key: string]: any;
      },
      machineHourly: [] as machinesHour[],
      equipmentHourly: [] as equipmentHour[] | "NOT_FOUND",
      supervisor: "unkown",
      notFound: false,
      hours: [] as string[],
      activities: "NOT_FOUND" as returnProps["activities"],
    };
    const promises = [];
    const machinesAllowed = store.get(machinesAtom);
    const equipmentsAllowed = store.get(equipmentsAtom);
    const envsAllowed = store.get(EnvListAtom);
    const uid = store.get(uidAtom);
    const offlineTime = store.get(offlineTimeAtom);
    const scopedMachines = getScopedAssetMap(machinesAllowed, mySelectedFactory, "machines");
    const scopedEquipments = getScopedAssetMap(equipmentsAllowed, mySelectedFactory, "equipments");
    const scopedEnvs = getScopedAssetMap(envsAllowed, mySelectedFactory, "envs");
    const baseDepts = (store.get(baseDepartmentAtom) as string[] | null) || [];
    const hasFullScope = isMasterOwner(uid) || baseDepts.includes("all");
    const selectedFactoryUnits = mySelectedFactory?.units
      ? toIdArray(mySelectedFactory.units).map(Number)
      : null;

    const safeGet = (path: string) =>
      get(path).catch((err) => {
        console.warn(`[RTDB Dashboard] Could not read '${path}':`, err?.message || err);
        return {
          exists: () => false,
          val: () => null,
        } as any;
      });

    promises.push(safeGet(`reports/factory/daily/${date}`));
    promises.push(safeGet(`reports/factory/hourly/${date}`));
    promises.push(safeGet(`machines`));
    promises.push(safeGet(`equipments`));
    promises.push(safeGet(`activities`));
    promises.push(safeGet(`units`));
    promises.push(safeGet(`address`));
    const [
      snap,
      hourlySnap,
      machineSnap,
      equipmentsSnap,
      activitySnap,
      unitSnap,
      addressSnap,
    ] = await Promise.all(promises);
    const activities = Object.values(activitySnap.val() || {}).reverse();
    const _activities = [];
    const address = addressSnap.val() || {};
    for await (const activity of activities) {
      const { name, state, status, title, unix } = activity as any;
      if (!isActivityInScope({ name, title }, scopedMachines, scopedEquipments)) continue;
      _activities.push({
        name,
        state,
        status,
        title,
        unix,
      });
    }
    if (_activities.length > 0) stats.activities = _activities;
    let cacheUnit: any = unitSnap.val();
    if (cacheUnit && typeof cacheUnit === "object") {
      Object.entries(cacheUnit).forEach(([uKey, uVal]: [string, any]) => {
        const uMac =
          typeof uVal?.mac === "string" && uVal.mac.trim()
            ? uVal.mac.trim()
            : typeof uVal?.device?.mac === "string" && uVal.device.mac.trim()
              ? uVal.device.mac.trim()
              : null;
        if (uMac) {
          setCachedUnitMac(uKey, uMac);
        }
      });
    }
    const usedUnits = new Set();
    stats.units = cacheUnit;
    if (!unitSnap.exists()) {
      stats.units = {
        "1": {
          cleanDisconnect: false,
          connected: false,
          last_seen: 0,
        },
      };
    } else {
      if (selectedFactoryUnits) {
        for await (const unit of Object.keys(stats.units)) {
          if (!selectedFactoryUnits.includes(+unit)) {
            delete cacheUnit[unit];
          }
        }
      }
    }
    cacheUnit = Object.fromEntries(
      Object.entries(cacheUnit || {}).map(([key, v]) => {
        const value = v as any;
        const { lastContact, last_seen } = value;
        const diff = dayjs().diff(dayjs.unix(lastContact || 0), "minute");
        const connected = diff <= offlineTime;
        value.connected = connected;
        value.last_seen = lastContact || last_seen;
        return [key, value];
      }),
    );
    if (!snap.exists() || !hourlySnap.exists() || !machineSnap.exists()) {
      const rawMachinesEarly = machineSnap.val() || {};
      const rawEquipsEarly = equipmentsSnap.val() || {};
      Object.keys(scopedMachines).forEach((m) => {
        const u = rawMachinesEarly[m]?.unit || 1;
        if (cacheUnit[u]) usedUnits.add(u);
      });
      Object.keys(scopedEquipments).forEach((e) => {
        const u = rawEquipsEarly[e]?.unit;
        if (u !== undefined && cacheUnit[u]) usedUnits.add(u);
      });
      Object.keys(scopedEnvs).forEach((env) => {
        const unitInAddress = Object.keys(address).find(
          (u: any) => address[u]?.extras?.dht_humid === env,
        );
        if (
          unitInAddress !== undefined &&
          (selectedFactoryUnits === null || selectedFactoryUnits.includes(+unitInAddress))
        ) {
          usedUnits.add(unitInAddress);
        }
      });
      if (hasFullScope) {
        Object.keys(address).forEach((unit: any) => {
          if (selectedFactoryUnits && !selectedFactoryUnits.includes(+unit)) return;
          for (const addr of Object.values(address[unit] || {})) {
            for (const pin of Object.values(addr || {})) {
              if (pin?.split("&").at(0)?.includes("factory")) usedUnits.add(unit);
            }
          }
        });
      }
      const earlyFilteredUnits: { [key: string]: any } = {};
      usedUnits.forEach((u) => {
        if (cacheUnit?.[u as string]) earlyFilteredUnits[u as string] = cacheUnit[u as string];
      });
      stats.units = earlyFilteredUnits;
      stats.notFound = true;
      resolve(stats);
      return;
    }
    const myMachines = Object.fromEntries(
      Object.entries(machineSnap.val() || {}).sort(
        (a: any, b: any) => a[1].sort - b[1].sort,
      ),
    );
    let data = snap.val();
    if (data?.factories && mySelectedFactory) {
      data = {
        ...data,
        ...data.factories[selectedFactory.value],
      };
    } else if (mySelectedFactory === undefined && data?.factories) {
      const accessibleIndices = getAccessibleFactoryIndices(
        factories,
        machinesAllowed,
        equipmentsAllowed,
        envsAllowed,
        hasFullScope,
      );
      const factoryEntries =
        accessibleIndices.length > 0
          ? accessibleIndices.map((idx) => (data.factories as any)[idx]).filter(Boolean)
          : (Object.values(data.factories) as any[]);
      const baseFactory = factoryEntries[0] || Object.values(data.factories)[0] || {};
      const factory = { ...baseFactory };
      factory.supervisor_a = [];
      factory.supervisor_b = [];
      factory.supervisor_c = [];
      for await (const f of factoryEntries) {
        if (f?.supervisor_a !== undefined) factory.supervisor_a.push(f.supervisor_a);
        if (f?.supervisor_b !== undefined) factory.supervisor_b.push(f.supervisor_b);
        if (f?.supervisor_c !== undefined) factory.supervisor_c.push(f.supervisor_c);
      }
      factory.supervisor_a = factory.supervisor_a.join(", ");
      factory.supervisor_b = factory.supervisor_b.join(", ");
      factory.supervisor_c = factory.supervisor_c.join(", ");
      data = {
        ...data,
        ...factory,
      };
    }
    const rn = dayjs();
    const rnSecs = rn.hour() * 3600 + rn.minute() * 60 + rn.second();
    const supervisor = (() => {
      let supervisor = "A - " + data.supervisor_a;
      if (isNaN(data.shift_b_start)) supervisor = "A - " + data.supervisor_a;
      else if (rnSecs > +data.shift_a_start && rnSecs < +data.shift_b_start)
        supervisor = "A - " + data.supervisor_a;
      else if (isNaN(data.shift_c_start))
        supervisor = "B - " + data.supervisor_b;
      else if (rnSecs > +data.shift_b_start && rnSecs < +data.shift_c_start)
        supervisor = "B - " + data.supervisor_b;
      else if (rnSecs > +data.shift_c_start && rnSecs < +data.shift_a_start)
        supervisor = "C - " + data.supervisor_c;
      return supervisor;
    })();
    stats.supervisor = supervisor;
    stats.total.shots.value = data.shots || 0;
    stats.total.production_meters.value = data.production_meters || 0;
    stats.total.production.value = data.production || 0;
    stats.total.material.value = data.material_usage || 0;
    stats.total.electricity.value = data.electricity_usage || 0;
    if (uid === "1fC3tw0Ad3RPbD7jxB4s8wJwLTu2" && hasFullScope) usedUnits.add("2");
    const hourlyData = hourlySnap.val();
    const hours = Object.values(hourlyData);
    const machines: {
      [key: string]: machineProps;
    } = {};
    const myEquipments = equipmentsSnap.val() || {};
    const equipments: {
      [key: string]: equipmentProps;
    } = {};
    let realtimeKW = {
      current: 0,
      previous: 0,
    };
    for await (const e of Object.keys(myEquipments)) {
      if (!scopedEquipments[e]) continue;
      const equipment: any = myEquipments[e];
      const { name, unit, status, at, realtime_kw } = equipment;
      if (cacheUnit[unit] === undefined) continue;
      if (realtime_kw) {
        realtimeKW.current += realtime_kw.current || 0;
        realtimeKW.previous += realtime_kw.previous || 0;
      }
      const { cleanDisconnect, connected, last_seen } = cacheUnit[unit];
      usedUnits.add(unit);
      const _status = connected
        ? status
          ? "ON"
          : "IDLE"
        : cleanDisconnect
        ? "OFF"
        : "NA";
      const myAt = status === "NA" ? last_seen : at;
      equipments[e] = {
        name,
        status: _status,
        electricity: 0,
        at: isNaN(myAt) ? dayjs(myAt).unix() : +myAt,
      };
    }
    for await (const m of Object.keys(myMachines)) {
      if (!scopedMachines[m]) continue;
      const machine: any = myMachines[m];
      const {
        machine_status,
        machine_model,
        mold_name: moldName,
        installedMold,
        unit: unitTemp,
        realtime_kw,
        at,
      } = machine || {};
      const mold_name = installedMold ? installedMold.name : moldName;
      const unit = unitTemp || 1;
      if (cacheUnit[unit] === undefined) continue;
      if (realtime_kw) {
        realtimeKW.current += realtime_kw.current || 0;
        realtimeKW.previous += realtime_kw.previous || 0;
      }
      const { cleanDisconnect, last_seen, connected } = cacheUnit[unit];
      usedUnits.add(unit);
      const status = connected
        ? machine_status
          ? "ON"
          : "IDLE"
        : cleanDisconnect
        ? "OFF"
        : "NA";
      const myAt = status === "NA" ? last_seen : at;
      machines[m] = {
        name: machine_model,
        status,
        mold: mold_name,
        shots: 0,
        production_meters: 0,
        production: 0,
        material: 0,
        electricity: 0,
        at: isNaN(myAt) ? dayjs(myAt).unix() : +myAt,
      };
    }
    stats.total.realtimeKW.current = +realtimeKW.current.toFixed(2);
    stats.total.realtimeKW.change = +(
      ((realtimeKW.current - realtimeKW.previous) / realtimeKW.previous) *
        100 || 0
    ).toFixed(0);
    stats.total.shots.chart = [];
    stats.total.production_meters.chart = [];
    stats.total.production.chart = [];
    stats.total.material.chart = [];
    stats.total.electricity.chart = [];
    stats.hours = [];
    for await (const [hourKey, _hour] of Object.entries(hourlyData)) {
      const hour = _hour as any;
      if (data.shift_a_start === undefined) continue;
      const time = secondsToHourMin(
        +data.shift_a_start + (+hourKey - 1) * 3600,
      );
      const total = {
        shots: 0,
        production: 0,
        production_meters: 0,
        material: 0,
        electricity: 0,
      };
      for await (const _machine of Object.keys(hour.machines || {})) {
        if (!machines[_machine]) {
          delete hour.machines[_machine];
          continue;
        }
        const machine: any = hour.machines[_machine];
        hour.machines[_machine].name = machines[_machine].name;
        machines[_machine].shots += machine.shots || 0;
        machines[_machine].production_meters += machine.production_meters || 0;
        machines[_machine].production += machine.production || 0;
        machines[_machine].material += machine.material_usage || 0;
        machines[_machine].electricity += machine.electricity_usage || 0;
        total.shots += machine.shots || 0;
        total.production_meters += machine.production_meters || 0;
        total.production += machine.production || 0;
        total.material += machine.material_usage || 0;
        total.electricity += machine.electricity_usage || 0;
        stats.machineHourly.push({
          hour: time,
          machine: machines[_machine].name,
          value: {
            shots: machine.shots || 0,
            production_meters: machine.production_meters || 0,
            production: machine.production || 0,
            material: machine.material_usage || 0,
            electricity: machine.electricity_usage || 0,
          },
        });
      }
      for (const machine of Object.keys(machines)) {
        if (!hour.machines) hour.machines = {};
        if (!hour.machines[machine]) {
          hour.machines[machine] = {
            shots: 0,
            name: machines[machine]?.name || "NA",
            production_meters: 0,
            production: 0,
            material_usage: 0,
            electricity_usage: 0,
          };
        }
      }
      for await (const _equipment of Object.keys(hour.equipments || {})) {
        if (!equipments[_equipment]) {
          delete hour.equipments[_equipment];
          continue;
        }
        const equipment: any = hour.equipments[_equipment];
        hour.equipments[_equipment].name = equipments[_equipment].name;
        total.electricity += equipment.electricity_usage || 0;
        equipments[_equipment].electricity += equipment.electricity_usage || 0;
        if (typeof stats.equipmentHourly === "object")
          stats.equipmentHourly.push({
            hour: time,
            equipment: equipments[_equipment].name,
            value: equipment.electricity_usage || 0,
          });
      }
      for (const equipment of Object.keys(equipments)) {
        if (!hour.equipments) hour.equipments = {};
        if (!hour.equipments[equipment]) {
          hour.equipments[equipment] = {
            electricity_usage: 0,
            name: equipments[equipment].name,
          };
        }
      }
      stats.hours.push({
        time,
        ...hour,
      });
      stats.total.shots.chart.push(total.shots || 0);
      stats.total.production_meters.chart.push(total.production_meters || 0);
      stats.total.production.chart.push(total.production || 0);
      stats.total.material.chart.push(total.material || 0);
      stats.total.electricity.chart.push(total.electricity || 0);
    }
    stats.total.shots.value = stats.total.shots.chart.reduce(
      (a, b) => a + b,
      0,
    );
    stats.total.production_meters.value =
      stats.total.production_meters.chart.reduce((a, b) => a + b, 0);
    stats.total.production.value = stats.total.production.chart.reduce(
      (a, b) => a + b,
      0,
    );
    stats.total.electricity.value = stats.total.electricity.chart.reduce(
      (a, b) => a + b,
      0,
    );
    stats.total.material.value = stats.total.material.chart.reduce(
      (a, b) => a + b,
      0,
    );
    if (stats.equipmentHourly.length === 0) stats.equipmentHourly = "NOT_FOUND";
    stats.equipments =
      Object.keys(equipments).length > 0 ? equipments : "NOT_FOUND";
    stats.machines = machines;
    const lastHour: any = hours.at(-1);
    const secondLastHour: any = hours.at(-2);
    if (!lastHour || !secondLastHour) {
      const filteredEarlyUnits: { [key: string]: any } = {};
      usedUnits.forEach((unit) => {
        if (stats.units?.[unit as string]) {
          filteredEarlyUnits[unit as string] = stats.units[unit as string];
        }
      });
      stats.units = filteredEarlyUnits;
      resolve(stats);
      return;
    } else {
      const secondLastHourTotal = {
        shots: 0,
        production_meters: 0,
        production: 0,
        material: 0,
        electricity: 0,
      };
      const lastHourTotal = {
        shots: 0,
        production_meters: 0,
        production: 0,
        material: 0,
        electricity: 0,
      };
      for await (const [machineID, _machine] of Object.entries(
        secondLastHour.machines || {},
      )) {
        if (!machines[machineID]) continue;
        const machine = _machine as any;
        secondLastHourTotal.shots += machine.shots || 0;
        secondLastHourTotal.production_meters += machine.production_meters || 0;
        secondLastHourTotal.production += machine.production || 0;
        secondLastHourTotal.material += machine.material_usage || 0;
        secondLastHourTotal.electricity += machine.electricity_usage || 0;
      }
      for await (const [equipmentID, _equipment] of Object.entries(
        secondLastHour.equipments || {},
      )) {
        if (!equipments[equipmentID]) continue;
        const equipment = _equipment as any;
        secondLastHourTotal.electricity += equipment.electricity_usage || 0;
      }
      for await (const [machineID, _machine] of Object.entries(
        lastHour.machines || {},
      )) {
        if (!machines[machineID]) continue;
        const machine = _machine as any;
        lastHourTotal.shots += machine.shots || 0;
        lastHourTotal.production_meters += machine.production_meters || 0;
        lastHourTotal.production += machine.production || 0;
        lastHourTotal.material += machine.material_usage || 0;
        lastHourTotal.electricity += machine.electricity_usage || 0;
      }
      for await (const [equipmentID, _equipment] of Object.entries(
        lastHour.equipments || {},
      )) {
        if (!equipments[equipmentID]) continue;
        const equipment = _equipment as any;
        lastHourTotal.electricity += equipment.electricity_usage || 0;
      }
      secondLastHourTotal.shots = secondLastHourTotal.shots / 60;
      secondLastHourTotal.production_meters =
        secondLastHourTotal.production_meters / 60;
      secondLastHourTotal.production = secondLastHourTotal.production / 60;
      secondLastHourTotal.material = secondLastHourTotal.material / 60;
      secondLastHourTotal.electricity = secondLastHourTotal.electricity / 60;
      lastHourTotal.shots = lastHourTotal.shots / thisHourpastMin;
      lastHourTotal.production_meters =
        lastHourTotal.production_meters / thisHourpastMin;
      lastHourTotal.production = lastHourTotal.production / thisHourpastMin;
      lastHourTotal.material = lastHourTotal.material / thisHourpastMin;
      lastHourTotal.electricity = lastHourTotal.electricity / thisHourpastMin;
      // percent change
      stats.total.shots.change = Math.round(
        ((lastHourTotal.shots - secondLastHourTotal.shots) /
          secondLastHourTotal.shots) *
          100,
      );
      stats.total.production_meters.change = Math.round(
        ((lastHourTotal.production_meters -
          secondLastHourTotal.production_meters) /
          secondLastHourTotal.production_meters) *
          100,
      );
      stats.total.production.change = Math.round(
        ((lastHourTotal.production - secondLastHourTotal.production) /
          secondLastHourTotal.production) *
          100,
      );
      stats.total.material.change = Math.round(
        ((lastHourTotal.material - secondLastHourTotal.material) /
          secondLastHourTotal.material) *
          100,
      );
      stats.total.electricity.change = Math.round(
        ((lastHourTotal.electricity - secondLastHourTotal.electricity) /
          secondLastHourTotal.electricity) *
          100,
      );
    }
    if (uid && hasFullScope)
      Object.keys(address).forEach((unit: any) => {
        if (selectedFactoryUnits && !selectedFactoryUnits.includes(+unit)) return;
        const data = address[unit];
        for (const addr of Object.values(data || {})) {
          for (const pin of Object.values(addr || {})) {
            if (pin?.split("&").at(0)?.includes("factory")) usedUnits.add(unit);
          }
        }
      });
    Object.keys(scopedEnvs).forEach((env) => {
      const unitInAddress = Object.keys(address).find((unit: any) => {
        const data = address[unit];
        return data.extras?.dht_humid === env;
      });
      if (
        unitInAddress !== undefined &&
        (selectedFactoryUnits === null ||
          selectedFactoryUnits.includes(+unitInAddress))
      )
        usedUnits.add(unitInAddress);
    });
    const filteredUnits: {
      [key: string]: any;
    } = {};
    usedUnits.forEach((unit) => {
      if (stats.units?.[unit as string]) {
        filteredUnits[unit as string] = stats.units[unit as string];
      }
    });
    stats.units = filteredUnits;
    resolve(stats);
  });
};
export default fetch;
