import dayjs, { Dayjs } from "../../Components/Functions/dayjs";
import { db } from "../../Components/firebase";
import {
  get as firebaseGet,
  orderByKey,
  query,
  ref,
  startAt,
  endAt,
} from "firebase/database";
import store from "../../Components/Store";
import { machinesAtom, uidAtom } from "../../Components/Store/atoms";
import { get } from "../../Components/firebase/api/db";
import { getScopedAssetMap } from "../../Services/rbac";
import { Data, EachDay } from ".";

const fetch = async (
  start: Dayjs,
  end: Dayjs,
  depart: string,
  setData: (any: any) => void,
  factories: any[] = [],
  selectedFactory: { value: number } | null = null,
  allowedDepartments: string[] = [],
  hasAllDepartments: boolean = true,
) => {
  depart = depart.toLowerCase();
  const mySelectedFactory: any =
    selectedFactory && factories ? factories[selectedFactory.value] : undefined;
  const data: Data = {
    report: {
      total: 0,
      days: [],
    },
    inventory: {
      available: 0,
      materials: 0,
      consumption: 0,
    },
    distribution: [],
    insights: {
      mostConsumingMachine: {
        name: "NA",
        percentage: 0,
        total: 0,
      },
      mostConsumingMaterial: {
        name: "NA",
        percentage: 0,
        total: 0,
      },
      mostConsumingDay: {
        name: "NA",
        percentage: 0,
        total: 0,
      },
    },
  };
  const uid = store.get(uidAtom);
  const machineNames = store.get(machinesAtom) || {};
  const scopedMachines = getScopedAssetMap(machineNames, mySelectedFactory, "machines");
  const allowedDeptLower = new Set(allowedDepartments.map((d) => d.toLowerCase()));
  const dates = [start.format("YYYY-MM-DD"), end.format("YYYY-MM-DD")];
  const reportSnap = await firebaseGet(
    query(
      ref(db, `users/${uid}/materials/stats`),
      orderByKey(),
      startAt(dates[0]),
      endAt(dates[1]),
    ),
  );
  const report = reportSnap.val() || {};
  const inventorySnap = await get("materials/inventory");
  const inventory = Object.fromEntries(
    Object.entries(inventorySnap.val() || {}).filter(
      ([id]: [string, any]) => {
        const itemDept = id.match(/\(([^)]+)\)$/)?.[1]?.toLowerCase() || "";
        if (depart !== "all") return itemDept === depart;
        if (!hasAllDepartments || mySelectedFactory !== undefined) {
          return itemDept !== "" && allowedDeptLower.has(itemDept);
        }
        return true;
      },
    ),
  );
  const temporaryDistributionMap: {
    [key: string]: {
      [key: string]: number;
    };
  } = {};
  for await (const _materialData of Object.values(inventory)) {
    const materialData = _materialData as any;
    data.inventory.materials += 1;
    data.inventory.available += Math.max(materialData.remaining, 0);
    data.inventory.consumption += materialData.consumed || 0;
  }
  for await (const [_date, _reportData] of Object.entries(report)) {
    const reportData = _reportData as any;
    const date = dayjs(_date).format("MMM DD, YYYY");
    const day: EachDay = {
      date,
      total: 0,
      materials: {},
    };
    for await (const [_material, _materialData] of Object.entries(
      reportData || {},
    )) {
      const material = _material as any;
      const matDept = String(material).match(/\(([^)]+)\)$/)?.[1]?.toLowerCase() || "";
      if (depart !== "all" && matDept !== depart) continue;
      if (depart === "all" && !hasAllDepartments && matDept && !allowedDeptLower.has(matDept)) continue;
      const materialData = _materialData as any;
      day.materials[material] = {
        total: 0,
        machines: {},
      };
      for await (const [_machine, _machineConsumption] of Object.entries(
        materialData || {},
      )) {
        const machine = _machine as any;
        if (!scopedMachines[machine]) continue;
        const qty = _machineConsumption as any;
        const machineName = scopedMachines[machine];
        day.total += qty;
        data.report.total += qty;
        day.materials[material].total += qty;
        day.materials[material].machines[machine] = {
          name: machineName,
          total: qty,
        };
        if (temporaryDistributionMap[material] === undefined)
          temporaryDistributionMap[material] = {};
        if (temporaryDistributionMap[material][machine] === undefined)
          temporaryDistributionMap[material][machine] = 0;
        temporaryDistributionMap[material][machine] += qty;
      }
      if (day.materials[material].total === 0) {
        delete day.materials[material];
      }
    }
    data.report.days.push(day);
  }

  const { mostConsumingMaterial, mostConsumingMachine, mostConsumingDay } =
    await findMostConsuming(data.report.days, data.report.total, scopedMachines);
  data.insights.mostConsumingMaterial = mostConsumingMaterial;
  data.insights.mostConsumingMachine = mostConsumingMachine;
  data.insights.mostConsumingDay = mostConsumingDay;

  for await (const [material, materialData] of Object.entries(
    temporaryDistributionMap,
  )) {
    for await (const [machine, qty] of Object.entries(materialData)) {
      data.distribution.push({
        source: material.toUpperCase(),
        target: scopedMachines[machine] || "NA",
        value: qty,
      });
    }
  }
  setData(data);
};

async function findMostConsuming(
  data: {
    date: string;
    total: number;
    materials: {
      [key: string]: {
        total: number;
        machines: {
          [key: string]: {
            total: number;
            name: string;
          };
        };
      };
    };
  }[],
  total: number,
  machineNames: {
    [key: string]: string;
  },
): Promise<{
  mostConsumingMaterial: { name: string; total: number; percentage: number };
  mostConsumingMachine: { name: string; total: number; percentage: number };
  mostConsumingDay: { name: string; total: number; percentage: number };
}> {
  const machines: {
    [key: string]: number;
  } = {};
  const materials: {
    [key: string]: number;
  } = {};

  for await (const day of data) {
    for await (const [name, material] of Object.entries(day.materials)) {
      materials[name] = (materials[name] || 0) + material.total;
      for await (const [machineId, machine] of Object.entries(material.machines)) {
        machines[machineId] = (machines[machineId] || 0) + machine.total;
      }
    }
  }

  const mostConsumingMaterial = Object.entries(materials).reduce(
    (prev, curr) => {
      if (prev[1] > curr[1]) return prev;
      return curr;
    },
    ["NA", 0],
  );
  const mostConsumingMachine = Object.entries(machines).reduce(
    (prev, curr) => {
      if (prev[1] > curr[1]) return prev;
      return curr;
    },
    ["NA", 0],
  );
  const mostConsumingDay =
    data.length > 0
      ? data.reduce((prev, curr) => {
          if (prev.total > curr.total) return prev;
          return curr;
        })
      : { date: "NA", total: 0 };

  return {
    mostConsumingMaterial: {
      name: mostConsumingMaterial[0],
      total: mostConsumingMaterial[1],
      percentage: total > 0 ? (mostConsumingMaterial[1] / total) * 100 : 0,
    },
    mostConsumingMachine: {
      name: machineNames[mostConsumingMachine[0]] || "NA",
      total: mostConsumingMachine[1],
      percentage: total > 0 ? (mostConsumingMachine[1] / total) * 100 : 0,
    },
    mostConsumingDay: {
      name: mostConsumingDay.date,
      total: mostConsumingDay.total,
      percentage: total > 0 ? (mostConsumingDay.total / total) * 100 : 0,
    },
  };
}

export default fetch;
