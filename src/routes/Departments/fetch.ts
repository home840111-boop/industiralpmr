import { DataToSet } from ".";
import { get } from "../../Components/firebase/api/db";
import store from "../../Components/Store";
import {
  dateAtom,
  equipmentsAtom,
  machinesAtom,
  offlineTimeAtom,
  shiftsAtom,
} from "../../Components/Store/atoms";
import { getScopedAssetMap, toIdArray } from "../../Services/rbac";
import { selectedFactoryType } from "../Dashboard";
import { departmentsType } from "../Machines/types";
import dayjs from "../../Components/Functions/dayjs";
import secondsToHourMin from "../../Components/Functions/converters/secondsToHourMin";

const stat = {
  value: 0,
  change: 0,
};
const fetch = async (
  department: string[],
  departments: departmentsType,
  factories: any[],
  selectedFactory: selectedFactoryType,
): Promise<DataToSet> => {
  const stats: DataToSet = {
    total: {
      shots: { ...stat },
      production: { ...stat },
      material: { ...stat },
      electricity: { ...stat },
    },
    departmentsList: [],
    departmentBreakdown: {},
    topPerformers: {
      shots: [],
      production: [],
      material: [],
      electricity: [],
    },
    hourlyData: {},
  };
  const mySelectedFactory: any = factories[selectedFactory.value];
  const date = store.get(dateAtom);
  const offlineTime = store.get(offlineTimeAtom);
  const machinesAllowed = store.get(machinesAtom);
  const equipmentsAllowed = store.get(equipmentsAtom);
  const scopedMachines = getScopedAssetMap(machinesAllowed, mySelectedFactory, "machines");
  const scopedEquipments = getScopedAssetMap(equipmentsAllowed, mySelectedFactory, "equipments");
  const selectedFactoryUnits = mySelectedFactory?.units
    ? toIdArray(mySelectedFactory.units).map(Number)
    : null;
  const shiftSnap = store.get(shiftsAtom);
  const shift_start_minutes = ((shiftSnap?.A || 0) % 3600) / 60;
  const min = dayjs().minute();
  const thisHourpastMin =
    min < shift_start_minutes
      ? min + shift_start_minutes
      : min - shift_start_minutes;
  const promises = [];
  promises.push(get(`/reports/factory/daily/${date}`));
  promises.push(get(`/reports/factory/hourly/${date}`));
  promises.push(get(`machines`));
  promises.push(get(`equipments`));
  promises.push(get(`units`));
  const [snap, hourlySnap, machineSnap, equipmentsSnap, unitSnap] =
    await Promise.all(promises);
  let cacheUnit: any = unitSnap.val();
  let units = cacheUnit;
  if (!unitSnap.exists()) {
    units = {
      "1": {
        cleanDisconnect: false,
        connected: false,
        last_seen: 0,
      },
    };
  } else {
    if (selectedFactoryUnits) {
      for await (const unit of Object.keys(units)) {
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
  if (!snap.exists() || !hourlySnap.exists() || !machineSnap.exists())
    throw new Error("No data");
  let data = snap.val();
  if (data?.factories && mySelectedFactory) {
    data = {
      ...data,
      ...data.factories[selectedFactory.value],
    };
  } else if (mySelectedFactory === undefined && data?.factories) {
    const factory = { ...data.factories[0] };
    factory.supervisor_a = [];
    factory.supervisor_b = [];
    factory.supervisor_c = [];
    for await (const f of Object.values(data.factories) as any) {
      factory.supervisor_a.push(f.supervisor_a);
      factory.supervisor_b.push(f.supervisor_b);
      factory.supervisor_c.push(f.supervisor_c);
    }
    factory.supervisor_a = factory.supervisor_a.join(", ");
    factory.supervisor_b = factory.supervisor_b.join(", ");
    factory.supervisor_c = factory.supervisor_c.join(", ");
    data = {
      ...data,
      ...factory,
    };
  }
  const machines: {
    [key: string]: {
      name: string;
      shots: number;
      production: number;
      material: number;
      electricity: number;
      department: string[];
      link: string;
    };
  } = {};
  const myMachines = Object.fromEntries(
    Object.entries(machineSnap.val() || {}).sort(
      (a: any, b: any) => a[1].sort - b[1].sort,
    ),
  );
  const machineOns: string[] = [];
  for await (const m of Object.keys(myMachines)) {
    if (!scopedMachines[m]) continue;
    const machine: any = myMachines[m];
    const { machine_status, unit: unitTemp } = machine || {};
    const unit = unitTemp || 1;
    if (cacheUnit[unit] === undefined) continue;
    const { cleanDisconnect, connected } = cacheUnit[unit];
    const status = connected
      ? machine_status
        ? "ON"
        : "IDLE"
      : cleanDisconnect
      ? "OFF"
      : "NA";
    if (status === "ON") machineOns.push(m);
  }
  const equipments: {
    [key: string]: {
      name: string;
      electricity: number;
      department: string[];
      link: string;
    };
  } = {};
  const myEquipments = equipmentsSnap.val() || {};
  const equipmentOns: string[] = [];
  for await (const e of Object.keys(myEquipments)) {
    if (!scopedEquipments[e]) continue;
    const equipment: any = myEquipments[e];
    const { unit, status } = equipment;
    if (cacheUnit[unit] === undefined) continue;
    const { cleanDisconnect, connected } = cacheUnit[unit];
    const _status = connected
      ? status
        ? "ON"
        : "IDLE"
      : cleanDisconnect
      ? "OFF"
      : "NA";
    if (_status === "ON") equipmentOns.push(e);
  }
  interface HourlyData {
    [time: string]: {
      machines: {
        [machine: string]: {
          shots: number;
          production: number;
          material_usage: number;
          electricity_usage: number;
        };
      };
      equipments: {
        [equipment: string]: {
          electricity_usage: number;
        };
      };
    };
  }
  const machineEQsData: HourlyData = {};
  const hourlyData = hourlySnap.val();
  for await (const [hourKey, _hour] of Object.entries(hourlyData)) {
    const hour = _hour as any;
    if (data.shift_a_start === undefined) continue;
    const time = secondsToHourMin(+data.shift_a_start + (+hourKey - 1) * 3600);
    machineEQsData[time] = {
      machines: {},
      equipments: {},
    };
    const total = {
      shots: 0,
      production: 0,
      material: 0,
      electricity: 0,
    };
    for await (const _machine of Object.keys(hour.machines || {})) {
      if (!scopedMachines[_machine]) {
        delete hour.machines[_machine];
        continue;
      }
      const machine: any = hour.machines[_machine];
      if (machineEQsData[time].machines[_machine] === undefined)
        machineEQsData[time].machines[_machine] = {
          shots: 0,
          production: 0,
          material_usage: 0,
          electricity_usage: 0,
        };
      machineEQsData[time].machines[_machine].shots += machine.shots || 0;
      machineEQsData[time].machines[_machine].production +=
        machine.production || 0;
      machineEQsData[time].machines[_machine].material_usage +=
        machine.material_usage || 0;
      machineEQsData[time].machines[_machine].electricity_usage +=
        machine.electricity_usage || 0;
      hour.machines[_machine].name = scopedMachines[_machine];
      if (machines[_machine] === undefined)
        machines[_machine] = {
          name: scopedMachines[_machine],
          shots: 0,
          production: 0,
          material: 0,
          electricity: 0,
          department: [],
          link: `/machines/${_machine}`,
        };
      machines[_machine].shots += machine.shots || 0;
      machines[_machine].production += machine.production || 0;
      machines[_machine].material += machine.material_usage || 0;
      machines[_machine].electricity += machine.electricity_usage || 0;
      total.shots += machine.shots || 0;
      total.production += machine.production || 0;
      total.material += machine.material_usage || 0;
      total.electricity += machine.electricity_usage || 0;
    }
    for await (const _equipment of Object.keys(hour.equipments || {})) {
      if (!scopedEquipments[_equipment]) {
        delete hour.equipments[_equipment];
        continue;
      }
      const equipment: any = hour.equipments[_equipment];
      hour.equipments[_equipment].name = scopedEquipments[_equipment];
      if (equipments[_equipment] === undefined)
        equipments[_equipment] = {
          name: scopedEquipments[_equipment],
          electricity: 0,
          department: [],
          link: `/equipments/${_equipment}`,
        };
      if (machineEQsData[time].equipments[_equipment] === undefined)
        machineEQsData[time].equipments[_equipment] = {
          electricity_usage: 0,
        };
      machineEQsData[time].equipments[_equipment].electricity_usage +=
        equipment.electricity_usage || 0;
      equipments[_equipment].electricity += equipment.electricity_usage || 0;
      total.electricity += equipment.electricity_usage || 0;
    }
    stats.total.shots.value += total.shots;
    stats.total.production.value += total.production;
    stats.total.material.value += total.material;
    stats.total.electricity.value += total.electricity;
  }
  const hour: DataToSet["hourlyData"] = {};
  for (const [time, data] of Object.entries(machineEQsData)) {
    if (Object.keys(departments).length !== 0)
      for (const [name, value] of Object.entries(departments)) {
        if (!department.includes("all") && !department.includes(name)) continue;
        const deptMachineIds = toIdArray(value.machines).filter((mID) =>
          Boolean(scopedMachines[mID]),
        );
        const deptEquipmentIds = toIdArray(value.equipments).filter((eID) =>
          Boolean(scopedEquipments[eID]),
        );
        if (mySelectedFactory && deptMachineIds.length + deptEquipmentIds.length === 0)
          continue;
        if (hour[name] === undefined) hour[name] = [];
        const departHour: DataToSet["hourlyData"][0][0] = {
          time,
          shots: 0,
          production: 0,
          material: 0,
          electricity: 0,
        };
        for (const mID of deptMachineIds) {
          if (data.machines[mID] === undefined) continue;
          departHour.shots += data.machines[mID].shots;
          departHour.production += data.machines[mID].production;
          departHour.material += data.machines[mID].material_usage;
          departHour.electricity += data.machines[mID].electricity_usage;
        }
        for (const eID of deptEquipmentIds) {
          if (data.equipments[eID] === undefined) continue;
          departHour.electricity += data.equipments[eID].electricity_usage;
        }
        hour[name].push(departHour);
      }
    else {
      const name = "All";
      if (hour[name] === undefined) hour[name] = [];
      const departHour: DataToSet["hourlyData"][0][0] = {
        time,
        shots: 0,
        production: 0,
        material: 0,
        electricity: 0,
      };
      for (const mID of Object.keys(data.machines || {})) {
        departHour.shots += data.machines[mID].shots;
        departHour.production += data.machines[mID].production;
        departHour.material += data.machines[mID].material_usage;
        departHour.electricity += data.machines[mID].electricity_usage;
      }
      for (const eID of Object.keys(data.equipments || {})) {
        departHour.electricity += data.equipments[eID].electricity_usage;
      }
      hour[name].push(departHour);
    }
  }
  stats.hourlyData = hour;
  const hours = Object.values(hourlyData);
  const lastHour: any = hours.at(-1);
  const secondLastHour: any = hours.at(-2);
  if (!lastHour || !secondLastHour) throw new Error("No data");
  const secondLastHourTotal = {
    shots: 0,
    production: 0,
    material: 0,
    electricity: 0,
  };
  const lastHourTotal = {
    shots: 0,
    production: 0,
    material: 0,
    electricity: 0,
  };

  for await (const [machineID, _machine] of Object.entries(
    secondLastHour.machines || {},
  )) {
    if (!scopedMachines[machineID]) continue;
    const machine = _machine as any;
    secondLastHourTotal.shots += machine.shots || 0;
    secondLastHourTotal.production += machine.production || 0;
    secondLastHourTotal.material += machine.material_usage || 0;
    secondLastHourTotal.electricity += machine.electricity_usage || 0;
  }
  for await (const [equipmentID, _equipment] of Object.entries(
    secondLastHour.equipments || {},
  )) {
    if (!scopedEquipments[equipmentID]) continue;
    const equipment = _equipment as any;
    secondLastHourTotal.electricity += equipment.electricity_usage || 0;
  }
  for await (const [machineID, _machine] of Object.entries(
    lastHour.machines || {},
  )) {
    if (!scopedMachines[machineID]) continue;
    const machine = _machine as any;
    lastHourTotal.shots += machine.shots || 0;
    lastHourTotal.production += machine.production || 0;
    lastHourTotal.material += machine.material_usage || 0;
    lastHourTotal.electricity += machine.electricity_usage || 0;
  }
  for await (const [equipmentID, _equipment] of Object.entries(
    lastHour.equipments || {},
  )) {
    if (!scopedEquipments[equipmentID]) continue;
    const equipment = _equipment as any;
    lastHourTotal.electricity += equipment.electricity_usage || 0;
  }
  secondLastHourTotal.shots = secondLastHourTotal.shots / 60;
  secondLastHourTotal.production = secondLastHourTotal.production / 60;
  secondLastHourTotal.material = secondLastHourTotal.material / 60;
  secondLastHourTotal.electricity = secondLastHourTotal.electricity / 60;
  lastHourTotal.shots = lastHourTotal.shots / thisHourpastMin;
  lastHourTotal.production = lastHourTotal.production / thisHourpastMin;
  lastHourTotal.material = lastHourTotal.material / thisHourpastMin;
  lastHourTotal.electricity = lastHourTotal.electricity / thisHourpastMin;
  // percent change
  stats.total.shots.change = Math.round(
    ((lastHourTotal.shots - secondLastHourTotal.shots) /
      secondLastHourTotal.shots) *
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
  const rn = dayjs();
  const rnSecs = rn.hour() * 3600 + rn.minute() * 60 + rn.second();
  const supervisor = (() => {
    let supervisor = "A - " + data.supervisor_a;
    if (isNaN(data.shift_b_start)) supervisor = "A - " + data.supervisor_a;
    else if (rnSecs > +data.shift_a_start && rnSecs < +data.shift_b_start)
      supervisor = "A - " + data.supervisor_a;
    else if (isNaN(data.shift_c_start)) supervisor = "B - " + data.supervisor_b;
    else if (rnSecs > +data.shift_b_start && rnSecs < +data.shift_c_start)
      supervisor = "B - " + data.supervisor_b;
    else if (rnSecs > +data.shift_c_start && rnSecs < +data.shift_a_start)
      supervisor = "C - " + data.supervisor_c;
    return supervisor;
  })();
  let shift = supervisor.split(" - ")[0] as "A" | "B" | "C";
  for (const [name, value] of Object.entries(departments)) {
    if (!department.includes("all") && !department.includes(name)) continue;
    const deptMachineIds = toIdArray(value.machines).filter((mID) =>
      Boolean(scopedMachines[mID]),
    );
    const deptEquipmentIds = toIdArray(value.equipments).filter((eID) =>
      Boolean(scopedEquipments[eID]),
    );
    if (mySelectedFactory && deptMachineIds.length + deptEquipmentIds.length === 0)
      continue;

    stats.departmentBreakdown[name] = {
      shots: 0,
      production: 0,
      electricity: 0,
      material: 0,
      supervisor: `${shift} - ${value.supervisors[shift] || "NA"}`,
    };
    let mOns = 0;
    let eOns = 0;
    for (const mID of deptMachineIds) {
      if (machines[mID] === undefined)
        machines[mID] = {
          name: scopedMachines[mID],
          shots: 0,
          production: 0,
          material: 0,
          electricity: 0,
          department: [],
          link: `/machines/${mID}`,
        };
      if (!machines[mID].department.includes(name))
        machines[mID].department.push(name);

      if (machineOns.includes(mID)) mOns++;
      stats.departmentBreakdown[name].shots += machines[mID].shots;
      stats.departmentBreakdown[name].production += machines[mID].production;
      stats.departmentBreakdown[name].electricity += machines[mID].electricity;
      stats.departmentBreakdown[name].material += machines[mID].material;
    }
    for (const eID of deptEquipmentIds) {
      if (equipments[eID] === undefined)
        equipments[eID] = {
          name: scopedEquipments[eID],
          electricity: 0,
          department: [],
          link: `/equipments/${eID}`,
        };
      if (equipmentOns.includes(eID)) eOns++;
      if (!equipments[eID].department.includes(name))
        equipments[eID].department.push(name);
      stats.departmentBreakdown[name].electricity +=
        equipments[eID].electricity;
    }

    stats.departmentsList.push({
      name,
      supervisor: `${shift} - ${value.supervisors[shift] || "NA"}`,
      machineOns: {
        on: mOns,
        total: deptMachineIds.length,
      },
      equipmentOns: {
        on: eOns,
        total: deptEquipmentIds.length,
      },
    });
  }
  if (Object.keys(departments).length === 0)
    stats.departmentBreakdown["All"] = {
      shots: stats.total.shots.value,
      production: stats.total.production.value,
      electricity: stats.total.electricity.value,
      material: stats.total.material.value,
      supervisor,
    };

  // top 3 performers for each shot, production, electricity, material
  const machineVals = Object.values(machines);
  const equipmentVals = Object.values(equipments);
  const shots = machineVals.sort((a, b) => b.shots - a.shots).slice(0, 3);
  const production = machineVals
    .sort((a, b) => b.production - a.production)
    .slice(0, 3);
  const electricity = machineVals
    .sort((a, b) => b.electricity - a.electricity)
    .slice(0, 3);
  const material = machineVals
    .sort((a, b) => b.material - a.material)
    .slice(0, 3);
  const equipmentsElectricity = equipmentVals
    .sort((a, b) => b.electricity - a.electricity)
    .slice(0, 3);
  const combinedElectricity = [...electricity, ...equipmentsElectricity]
    .sort((a, b) => b.electricity - a.electricity)
    .slice(0, 3);
  stats.topPerformers.shots = shots.map((s) => ({
    department: s.department.join(", "),
    name: s.name,
    share: Math.round((s.shots / stats.total.shots.value) * 100),
    value: s.shots,
    link: s.link,
  }));
  stats.topPerformers.production = production.map((s) => ({
    department: s.department.join(", "),
    name: s.name,
    share: Math.round((s.production / stats.total.production.value) * 100),
    value: s.production,
    link: s.link,
  }));
  stats.topPerformers.material = material.map((s) => ({
    department: s.department.join(", "),
    name: s.name,
    share: Math.round((s.material / stats.total.material.value) * 100),
    value: s.material,
    link: s.link,
  }));
  stats.topPerformers.electricity = combinedElectricity.map((s) => ({
    department: s.department.join(", "),
    name: s.name,
    share: Math.round((s.electricity / stats.total.electricity.value) * 100),
    value: s.electricity,
    link: s.link,
  }));

  return stats;
};

export default fetch;
