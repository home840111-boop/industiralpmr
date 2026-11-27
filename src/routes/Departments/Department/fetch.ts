import { DataSnapshot } from "firebase/database";
import { DataToSet } from ".";
import { get } from "../../../Components/firebase/api/db";
import store from "../../../Components/Store";
import { dateAtom, offlineTimeAtom, shiftsAtom } from "../../../Components/Store/atoms";
import { selectedFactoryType } from "../../Dashboard";
import { departmentsType } from "../../Machines/types";
import dayjs from "../../../Components/Functions/dayjs";
import secondsToHourMin from "../../../Components/Functions/converters/secondsToHourMin";
import { toIdArray } from "../../../Services/rbac";

const stat = {
  value: 0,
  change: 0,
};
const fetch = async (
  departmentName: string,
  department: departmentsType[0],
  factories: any[],
  selectedFactory: selectedFactoryType,
): Promise<DataToSet> => {
  const mySelectedFactory: any = factories[selectedFactory.value];
  const date = store.get(dateAtom);
  const offlineTime = store.get(offlineTimeAtom);
  const machinesAllowed = toIdArray(department.machines);
  const equipmentsAllowed = toIdArray(department.equipments);
  const factoryMachines = mySelectedFactory?.machines ? new Set(toIdArray(mySelectedFactory.machines)) : null;
  const factoryEquipments = mySelectedFactory?.equipments ? new Set(toIdArray(mySelectedFactory.equipments)) : null;
  const isMachineAllowed = (id: string) => machinesAllowed.includes(id) && (!factoryMachines || factoryMachines.has(id));
  const isEquipmentAllowed = (id: string) => equipmentsAllowed.includes(id) && (!factoryEquipments || factoryEquipments.has(id));
  const stats: DataToSet = {
    total: {
      shots: { ...stat },
      production: { ...stat },
      material: { ...stat },
      electricity: { ...stat },
    },
    overview: {
      status: "NOT IN PRODUCTION",
      supervisor: "",
      machines: {
        total: 0,
        on: 0,
      },
      equipments: {
        total: 0,
        on: 0,
      },
      name: departmentName,
    },
    hourly: {},
    machines: {},
    equipments: {},
  };
  const shiftSnap = store.get(shiftsAtom);
  const shift_start_minutes = ((shiftSnap?.A || 0) % 3600) / 60;
  const min = dayjs().minute();
  const thisHourpastMin =
    min < shift_start_minutes
      ? min + shift_start_minutes
      : min - shift_start_minutes;
  const promises: Promise<DataSnapshot>[] = [];
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
    if (mySelectedFactory?.units) {
      for await (const unit of Object.keys(units)) {
        if (!mySelectedFactory.units.includes(+unit)) {
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
  const machinesData = machineSnap.val();
  const equipmentsData = equipmentsSnap.val();
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

  const machineEQsData = stats.hourly;
  const hourlyData = hourlySnap.val();
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
    if (!isMachineAllowed(machineID)) continue;
    const machine = _machine as any;
    secondLastHourTotal.shots += machine.shots || 0;
    secondLastHourTotal.production += machine.production || 0;
    secondLastHourTotal.material += machine.material_usage || 0;
    secondLastHourTotal.electricity += machine.electricity_usage || 0;
  }
  for await (const [equipmentID, _equipment] of Object.entries(
    secondLastHour.equipments || {},
  )) {
    if (!isEquipmentAllowed(equipmentID)) continue;
    const equipment = _equipment as any;
    secondLastHourTotal.electricity += equipment.electricity_usage || 0;
  }
  for await (const [machineID, _machine] of Object.entries(
    lastHour.machines || {},
  )) {
    if (!isMachineAllowed(machineID)) continue;
    const machine = _machine as any;
    lastHourTotal.shots += machine.shots || 0;
    lastHourTotal.production += machine.production || 0;
    lastHourTotal.material += machine.material_usage || 0;
    lastHourTotal.electricity += machine.electricity_usage || 0;
  }
  for await (const [equipmentID, _equipment] of Object.entries(
    lastHour.equipments || {},
  )) {
    if (!isEquipmentAllowed(equipmentID)) continue;
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
  let machineOns = 0;
  let totalMachines = 0;
  const myMachines = Object.fromEntries(
    Object.entries(machineSnap.val() || {}).sort(
      (a: any, b: any) => a[1].sort - b[1].sort,
    ),
  );
  for await (const m of Object.keys(myMachines)) {
    if (!isMachineAllowed(m)) continue;
    const machine: any = myMachines[m];
    const { machine_status, unit: unitTemp, machine_model } = machine || {};
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
    if (status === "ON") machineOns++;
    totalMachines++;
    stats.machines[m] = {
      status,
      name: machine_model || "NA",
      shots: 0,
      production: 0,
      material: 0,
      electricity: 0,
      mold: machine.installedMold
        ? machine.installedMold.name
        : machine.mold_name,
    };
  }
  const myEquipments = equipmentsSnap.val() || {};
  let equipmentOns = 0;
  let totalEQs = 0;
  for await (const e of Object.keys(myEquipments)) {
    if (!isEquipmentAllowed(e)) continue;
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
    if (_status === "ON") equipmentOns++;
    totalEQs++;
    stats.equipments[e] = {
      status: _status,
      name: equipment.name || "NA",
      electricity: 0,
    };
  }
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
  stats.overview.supervisor = `${shift} - ${
    department.supervisors[shift] || "NA"
  }`;
  stats.overview.machines.total = totalMachines;
  stats.overview.machines.on = machineOns;
  stats.overview.equipments.total = totalEQs;
  stats.overview.equipments.on = equipmentOns;
  if (machineOns > 0) stats.overview.status = "IN PRODUCTION";

  for await (const [hourKey, _hour] of Object.entries(hourlyData)) {
    const hour = _hour as any;
    if (data.shift_a_start === undefined) continue;
    const time = secondsToHourMin(+data.shift_a_start + (+hourKey - 1) * 3600);
    machineEQsData[time] = {
      machines: {},
      equipments: {},
      total: {
        shots: 0,
        production: 0,
        material: 0,
        electricity: 0,
      },
    };
    const total = {
      shots: 0,
      production: 0,
      material: 0,
      electricity: 0,
    };
    for await (const _machine of Object.keys(hour.machines || {})) {
      if (!isMachineAllowed(_machine) || !stats.machines[_machine]) {
        delete hour.machines[_machine];
        continue;
      }
      const machine: any = hour.machines[_machine];
      hour.machines[_machine].name =
        machinesData[_machine]?.machine_model || "NA";
      if (machineEQsData[time].machines[_machine] === undefined)
        machineEQsData[time].machines[_machine] = {
          shots: 0,
          production: 0,
          material: 0,
          electricity: 0,
          name: hour.machines[_machine].name,
        };
      stats.machines[_machine].shots += machine.shots || 0;
      stats.machines[_machine].production += machine.production || 0;
      stats.machines[_machine].material += machine.material_usage || 0;
      stats.machines[_machine].electricity += machine.electricity_usage || 0;
      machineEQsData[time].machines[_machine].shots += machine.shots || 0;
      machineEQsData[time].machines[_machine].production +=
        machine.production || 0;
      machineEQsData[time].machines[_machine].material +=
        machine.material_usage || 0;
      machineEQsData[time].machines[_machine].electricity +=
        machine.electricity_usage || 0;
      total.shots += machine.shots || 0;
      total.production += machine.production || 0;
      total.material += machine.material_usage || 0;
      total.electricity += machine.electricity_usage || 0;
    }
    for await (const _equipment of Object.keys(hour.equipments || {})) {
      if (!isEquipmentAllowed(_equipment) || !stats.equipments[_equipment]) {
        delete hour.equipments[_equipment];
        continue;
      }
      const equipment: any = hour.equipments[_equipment];
      hour.equipments[_equipment].name =
        equipmentsData[_equipment]?.name || "NA";
      if (machineEQsData[time].equipments[_equipment] === undefined)
        machineEQsData[time].equipments[_equipment] = {
          electricity: 0,
          name: hour.equipments[_equipment].name,
        };
      stats.equipments[_equipment].electricity +=
        equipment.electricity_usage || 0;
      machineEQsData[time].equipments[_equipment].electricity +=
        equipment.electricity_usage || 0;
      total.electricity += equipment.electricity_usage || 0;
    }
    machineEQsData[time].total = total;
    stats.total.shots.value += total.shots;
    stats.total.production.value += total.production;
    stats.total.material.value += total.material;
    stats.total.electricity.value += total.electricity;
  }

  return stats;
};

export default fetch;
