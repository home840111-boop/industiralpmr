import { IconType } from "react-icons";
import { get, remove } from "../../../Components/firebase/api/db";
import { BiUnlink } from "react-icons/bi";
import { BsBattery } from "react-icons/bs";
import store from "../../../Components/Store";
import {
  baseDepartmentAtom,
  EnvListAtom,
  EnvUnitListAtom,
  equipmentsAtom,
  factoriesAtom,
  machinesAtom,
  selectedFactoryAtom,
  tokenAtom,
  uidAtom,
} from "../../../Components/Store/atoms";
import { getScopedAssetMap, isMasterOwner, toIdArray } from "../../../Services/rbac";
import { RiDonutChartFill, RiPulseLine } from "react-icons/ri";
import { FiPieChart } from "react-icons/fi";
import { IoMdAlert, IoMdNotificationsOutline } from "react-icons/io";
import unitFormatter from "../../../Components/Functions/formatters/unitFormatter";

interface NotificationProp {
  id: number | string;
  title: string;
  description: string;
  icon: IconType;
  time?: number;
  loader?: boolean;
  loaderVal?: number;
  ack?: () => void;
}
const fetchExtErrors = (allowedUnits: Set<number> | null): Promise<NotificationProp[]> => {
  return new Promise((resolve, reject) => {
    get("errors/extention-error")
      .then(async (snap) => {
        if (!snap.exists()) resolve([]);
        else {
          const data = snap.val();
          const errors = [];
          for await (const [unit, addressParent] of Object.entries(
            data || {},
          )) {
            if (allowedUnits !== null && !allowedUnits.has(+unit)) continue;
            for await (const [address, timestamp] of Object.entries(
              addressParent || {},
            )) {
              errors.push({
                id: timestamp,
                title: `Hardware error on UNIT#${String(unit).padStart(
                  2,
                  "0",
                )}`,
                description: `CPU unit ${String(unit).padStart(
                  2,
                  "0",
                )} is unable to communicate with address ${address}.\nPlease contact support.`,
                icon: BiUnlink,
                time: timestamp,
              });
            }
          }
          resolve(errors);
        }
      })
      .catch((err) => {
        reject(err);
      });
  });
};
const fetchRTCErrors = (allowedUnits: Set<number> | null): Promise<NotificationProp[]> => {
  return new Promise((resolve, reject) => {
    get("errors/rtc_error")
      .then(async (snap) => {
        if (!snap.exists()) resolve([]);
        else {
          const data = snap.val();
          const errors = Object.entries(data)
            .filter(([unit]) => allowedUnits === null || allowedUnits.has(+unit))
            .map(([unit, timestamp]) => {
            return {
              id: timestamp as number,
              title: `RTC Battery low on UNIT#${String(unit).padStart(2, "0")}`,
              description: `RTC Battery on CPU unit ${String(unit).padStart(
                2,
                "0",
              )} is low.\nPlease contact support for replacement.`,
              icon: BsBattery,
              time: timestamp as number,
              ack: () => {
                remove(`errors/rtc_error/${unit}`);
              },
            };
          });
          resolve(errors);
        }
      })
      .catch((err) => {
        reject(err);
      });
  });
};
const fetchMoldConsumptionErrors = (scopedMachines: Record<string, string>): Promise<NotificationProp[]> => {
  return new Promise((resolve, reject) => {
    get("errors/mold-consumption-alert")
      .then(async (snap) => {
        if (!snap.exists()) resolve([]);
        else {
          const data: {
            [machine: string]: {
              [mold: string]: {
                beforeConsumption: number;
                afterConsumption: number;
                percentageDifference: number;
              };
            };
          } = snap.val();
          const errors: NotificationProp[] = [];
          for (const machine in data) {
            if (!scopedMachines[machine]) continue;
            for (const mold in data[machine]) {
              const {
                beforeConsumption,
                afterConsumption,
                percentageDifference,
              } = data[machine][mold];
              errors.push({
                id: `${machine}-${mold}`,
                title: `Mold consumption alert on ${scopedMachines[machine]}`,
                description: `Mold ${mold} on ${
                  scopedMachines[machine]
                } has a consumption difference of ${percentageDifference.toFixed(
                  2,
                )}%.\nBefore: ${unitFormatter(
                  beforeConsumption,
                )}, After: ${unitFormatter(afterConsumption)}.`,
                icon: RiPulseLine,
                ack: () => {
                  remove(`errors/mold-consumption-alert/${machine}/${mold}`);
                },
              });
            }
          }
          resolve(errors);
        }
      })
      .catch((err) => {
        reject(err);
      });
  });
};

const fetchMoldLifeError = (scopedMachines: Record<string, string>): Promise<{
  errors: NotificationProp[];
  alerts: NotificationProp[];
}> => {
  return new Promise((resolve, reject) => {
    let i = 0;
    get("errors/mold-life")
      .then(async (snap) => {
        if (!snap.exists())
          resolve({
            alerts: [],
            errors: [],
          });
        else {
          const data: {
            [machineID: string]: {
              [moldID: string]: {
                consumed: number;
                life: number;
              };
            };
          } = snap.val();
          const toReturn = {
            errors: [] as NotificationProp[],
            alerts: [] as NotificationProp[],
          };
          for (const mID in data) {
            if (!scopedMachines[mID]) continue;
            const machineName = scopedMachines[mID];
            for (const moldID in data[mID]) {
              const { consumed, life } = data[mID][moldID];
              const usage = Math.round((consumed / life) * 100);
              if (usage > 100)
                toReturn.errors.push({
                  id: i,
                  title: `Mold life exceeded on ${machineName}`,
                  description: `Mold ${moldID} on ${machineName} has exceeded its life (${usage.toFixed(
                    0,
                  )}% used).\nPlease replace mold or reset usage.`,
                  icon: RiDonutChartFill,
                });
              else
                toReturn.alerts.push({
                  id: i,
                  title: `Mold life warning ${machineName}`,
                  description: `Mold ${moldID} on ${machineName} is nearing its life (${usage.toFixed(
                    0,
                  )}% used).\nPlease replace mold or reset usage.`,
                  icon: RiDonutChartFill,
                });
              i++;
            }
          }
          resolve(toReturn);
        }
      })
      .catch((err) => {
        reject(err);
      });
  });
};
const fetchTargetReachAlert = (scopedMachines: Record<string, string>): Promise<{
  errors: NotificationProp[];
  alerts: NotificationProp[];
}> => {
  return new Promise((resolve, reject) => {
    let i = 0;
    get("errors/target-alerts")
      .then(async (snap) => {
        if (!snap.exists())
          resolve({
            alerts: [],
            errors: [],
          });
        else {
          const data: {
            [machineID: string]: {
              [moldID: string]: {
                milestone: 50 | 75 | 100;
                "h-target-missed":
                  | {
                      [hours: string]: boolean;
                    }
                  | undefined;
              };
            };
          } = snap.val();
          const toReturn = {
            errors: [] as NotificationProp[],
            alerts: [] as NotificationProp[],
          };
          for (const mID in data) {
            if (!scopedMachines[mID]) continue;
            const machineName = scopedMachines[mID];
            for (const moldID in data[mID]) {
              const { milestone, "h-target-missed": hourlyTargetMissed } =
                data[mID][moldID];
              for (const key in hourlyTargetMissed || {}) {
                toReturn.errors.push({
                  id: i + "Taregt" + key,
                  title: `Target missed by ${machineName} on ${key}`,
                  description: `Mold ${moldID} on ${machineName} missed its target at ${key}.`,
                  icon: IoMdAlert,
                  ack: () => {
                    remove(
                      `errors/target-alerts/${mID}/${moldID}/h-target-missed/${key}`,
                    );
                  },
                });
                i++;
              }
              toReturn.alerts.push({
                id: i + "Reach" + machineName + moldID,
                title: `Production target milestone reached on ${machineName}`,
                description: `Mold ${moldID} on ${machineName} reached ${milestone}% of its target.`,
                icon: milestone === 100 ? RiDonutChartFill : FiPieChart,
                ack: () => {
                  remove(`errors/target-alerts/${mID}/${moldID}`);
                },
              });
              i++;
            }
          }
          resolve(toReturn);
        }
      })
      .catch((err) => {
        reject(err);
      });
  });
};

const fetchPastNotifications = (): Promise<NotificationProp[]> => {
  return new Promise(async (resolve, reject) => {
    try {
      const myToken = store.get(tokenAtom);
      if (!myToken) {
        resolve([]);
        return;
      }
      const snap = await get(`device-categories`);
      const data = snap.val() || {};
      let notifications: {
        body: string;
        title: string;
        url: string;
      }[] = [];
      for (const category of Object.values(data)) {
        if ((category as any)?.devices?.includes(myToken)) {
          notifications = Object.values((category as any)?.notifications || {});
          break;
        }
      }
      resolve(
        notifications.reverse().map((n, i) => {
          return {
            id: i,
            title: n.title,
            description: n.body,
            icon: IoMdNotificationsOutline,
          };
        }),
      );
    } catch (err) {
      console.error(err);
      resolve([]);
    }
  });
};
interface returnProps {
  errors: NotificationProp[];
  alerts: NotificationProp[];
  notifications: NotificationProp[];
}
const fetch = async (): Promise<returnProps> => {
  const uid = store.get(uidAtom);
  const factories = store.get(factoriesAtom);
  const selectedFactory = store.get(selectedFactoryAtom);
  const mySelectedFactory: any =
    selectedFactory && factories ? (factories as any)[selectedFactory.value] : undefined;
  const baseDepts = (store.get(baseDepartmentAtom) as string[] | null) || [];
  const hasFullScope = isMasterOwner(uid) || baseDepts.includes("all");
  const machinesAllowed = store.get(machinesAtom) || {};
  const equipmentsAllowed = store.get(equipmentsAtom) || {};
  const envsAllowed = store.get(EnvListAtom) || {};
  const envUnits = store.get(EnvUnitListAtom) || {};
  const scopedMachines = getScopedAssetMap(machinesAllowed, mySelectedFactory, "machines");
  const scopedEquipments = getScopedAssetMap(equipmentsAllowed, mySelectedFactory, "equipments");
  const scopedEnvs = getScopedAssetMap(envsAllowed, mySelectedFactory, "envs");

  const factoryUnits: Set<number> | null = mySelectedFactory?.units
    ? new Set(toIdArray(mySelectedFactory.units).map(Number))
    : null;

  let allowedUnits: Set<number> | null = factoryUnits;
  if (!hasFullScope) {
    const [machinesSnap, equipmentsSnap] = await Promise.all([
      get("machines").catch(() => null),
      get("equipments").catch(() => null),
    ]);
    const rawMachines = machinesSnap?.val() || {};
    const rawEquipments = equipmentsSnap?.val() || {};
    const assetUnits = new Set<number>();
    Object.keys(scopedMachines).forEach((mId) => {
      const u = rawMachines[mId]?.unit;
      if (u !== undefined) assetUnits.add(+u);
    });
    Object.keys(scopedEquipments).forEach((eId) => {
      const u = rawEquipments[eId]?.unit;
      if (u !== undefined) assetUnits.add(+u);
    });
    Object.keys(scopedEnvs).forEach((envId) => {
      const u = envUnits[envId];
      if (u !== undefined) assetUnits.add(+u);
    });
    allowedUnits = factoryUnits
      ? new Set(Array.from(assetUnits).filter((u) => factoryUnits.has(u)))
      : assetUnits;
  }

  const [
    errors,
    alerts,
    moldErrors,
    targetAlerts,
    pastNotifications,
    moldConsumptionErrors,
  ] = await Promise.all([
    fetchExtErrors(allowedUnits),
    fetchRTCErrors(allowedUnits),
    fetchMoldLifeError(scopedMachines),
    fetchTargetReachAlert(scopedMachines),
    fetchPastNotifications(),
    fetchMoldConsumptionErrors(scopedMachines),
  ]);
  errors.push(...moldConsumptionErrors);
  errors.push(...moldErrors.errors);
  errors.push(...targetAlerts.errors);
  alerts.push(...moldErrors.alerts);
  alerts.push(...targetAlerts.alerts);
  return { errors, alerts, notifications: pastNotifications };
};

export default fetch;
