import { get } from "../../Components/firebase/api/db";
import secToTime from "../../Components/Functions/converters/secondsToHourMin";
import dayjs from "../../Components/Functions/dayjs";
import store from "../../Components/Store";
import {
  factoryProductionAtom,
  machinesAtom,
  offlineTimeAtom,
  offtimeBasedEfficiencyAtom,
} from "../../Components/Store/atoms";
import { computeTimingBreakdown } from "../../Services/workSchedule";
import {
  fetchReturnProps,
  departmentsType,
  MachineType,
  MachineStatusType,
} from "./types";
import minifiedSecFormatter from "../../Components/Functions/formatters/minifiedSecFormatter";
import { setCachedUnitMac } from "../../Services/telemetry/useUnitMac";

interface selectedFactoryType {
  name: string;
  value: number;
  only: boolean;
}

const fetch = (
  date: string | undefined = dayjs().format("YYYY-MM-DD"),
  shifts: {
    shifts: 1 | 2 | 3;
    A: number;
    B: number;
    C: number;
  },
  factories: any[],
  selectedFactory: selectedFactoryType,
): Promise<fetchReturnProps> => {
  return new Promise((resolve, reject) => {
    const mySelectedFactory: any = factories[selectedFactory.value];
    try {
      const fetch = async () => {
        const machinesSnap = await get(`machines`);
        const machinesAllowed = store.get(machinesAtom);
        const offlineTime = store.get(offlineTimeAtom);
        const productionType = store.get(factoryProductionAtom);
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
        const myMachines = {} as fetchReturnProps["machines"];
        const [
          departmentsSnap,
          unitsSnap,
          powerOffsSnap,
          activeTargetsSnap,
          todayMachinesSnap,
          todayReasonsSnap,
        ] = await Promise.all([
          get(`departments`),
          get(`units`),
          get(`reports/factory/daily/${date}/unit_power`),
          get(`production-targets/active`),
          Promise.all(
            machinesKeys.map((machineKey) =>
              get(`reports/machines/${machineKey}/daily/${date}/total`),
            ),
          ),
          Promise.all(
            machinesKeys.map((machineKey) =>
              get(`downtime-reasons/${machineKey}/${date}`).catch(
                () => ({ val: () => null }) as any,
              ),
            ),
          ),
        ]);
        const departments: departmentsType =
          departmentsSnap.val() || ({} as departmentsType);
        const units = unitsSnap.val() || {};
        if (units && typeof units === "object") {
          Object.entries(units).forEach(([uKey, uVal]: [string, any]) => {
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
        const powerOffs = (powerOffsSnap.val() || {}) as any;
        const activeTargets = activeTargetsSnap.val() || {};
        for (let mIdx = 0; mIdx < machinesKeys.length; mIdx++) {
          const machineKey = machinesKeys[mIdx];
          const machine = machines[machineKey] as any;
          machine.unit ||= 1;
          if (units[machine.unit] === undefined) continue;
          const {
            cleanDisconnect,
            last_seen,
            lastContact,
            uploadedTil,
          }: {
            connected: boolean;
            cleanDisconnect: boolean;
            last_seen: number;
            lastContact: number;
            uploadedTil: string | undefined;
          } = units[machine.unit] as any;
          const diff = dayjs().diff(dayjs.unix(lastContact || 0), "minute");
          const connected = diff <= offlineTime;
          const todayMachineSnap = todayMachinesSnap[mIdx];
          if (!todayMachineSnap) continue;
          const todayReasons = (todayReasonsSnap[mIdx]?.val() || {}) as Record<string, any>;
          const isUpToDate = (() => {
            if (uploadedTil === undefined) return true;
            const uploadedTilDate = dayjs(uploadedTil);
            const now = dayjs();
            // how far behind the data is
            const diff = now.diff(uploadedTilDate, "second");
            return minifiedSecFormatter(diff) + " behind";
          })();
          const todayMachine = (todayMachineSnap.val() || {}) as any;
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
                return secToTime(shifts.A) + " - " + secToTime(shifts.A);
              else return secToTime(shifts.A) + " - " + secToTime(shifts.B);
            } else if (shift === "B") {
              if (isNaN(shifts.C))
                return secToTime(shifts.B) + " - " + secToTime(shifts.A);
              else return secToTime(shifts.B) + " - " + secToTime(shifts.C);
            } else if (shift === "C")
              return secToTime(shifts.C) + " - " + secToTime(shifts.A);
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
          const offtimeBasedEfficiency =
            store.get(offtimeBasedEfficiencyAtom) || false;
          const off = powerOffs[machine.unit]?.total || 0;
          const rawOn = todayMachine.ontime || 0;
          const rawIdle = todayMachine.offtime || 0;
          let claimedIdle = 0;
          let claimedOff = 0;
          for (const r of Object.values(todayReasons)) {
            if (!r?.scheduled) continue;
            const dur = Math.max(0, +(r.duration || 0));
            if (r.type === "OFF") claimedOff += dur;
            else claimedIdle += dur;
          }
          const timing = computeTimingBreakdown(
            rawOn,
            rawIdle,
            off,
            claimedIdle,
            claimedOff,
            offtimeBasedEfficiency,
          );
          const machineObj: MachineType = {
            id: machineKey,
            name: machine.machine_model,
            status,
            statusSince,
            lastShot: machine.last_shot
              ? Math.abs(dayjs.unix(machine.last_shot).diff(dayjs(), "s")) +
                "s ago"
              : "NA",
            shots: todayMachine.shots || 0,
            production_meters: todayMachine.production_meters || 0,
            production: todayMachine.production || 0,
            material: todayMachine.material_usage || 0,
            electricity: todayMachine.electricity_usage || 0,
            idle: rawIdle,
            off,
            on: rawOn,
            planned: timing.plannedTotal,
            unplannedDown: timing.unplannedDown,
            unplannedIdle: timing.unplannedIdle,
            unplannedOff: timing.unplannedOff,
            cycleTime: +(
              productionType === "meter"
                ? todayMachine.ontime && todayMachine.production_meters
                  ? todayMachine.ontime / todayMachine.production_meters
                  : 0
                : todayMachine.ontime && todayMachine.shots
                ? todayMachine.ontime / todayMachine.shots
                : 0
            ).toFixed(0),
            realtimeKW: {
              current: 0,
              change: 0,
            },
            operator,
            shiftTiming,
            mold: machine.installedMold
              ? machine.installedMold.name
              : machine.mold_name,
            moldSince: machine.mold_start_time,
            unit: machine.unit || 1,
            efficiency: timing.efficiency,
            updated,
            isUpToDate,
          };
          const realtimeKW: {
            current: number;
            previous: number;
          } = machine.realtime_kw || {
            current: 0,
            previous: 0,
          };
          machineObj.realtimeKW = {
            current: +realtimeKW.current.toFixed(2),
            change: +(
              ((realtimeKW.current - realtimeKW.previous) /
                realtimeKW.previous) *
                100 || 0
            ).toFixed(0),
          };
          if (productionType === "meter") {
            const production_meters_speed: {
              current: number;
              previous: number;
            } = machine.production_meters_speed || {
              current: 0,
              target: 0,
            };
            const rotary_rpm: {
              current: number;
              previous: number;
            } = machine.rotary_rpm || {
              current: 0,
              target: 0,
            };
            machineObj.rotaryRPM = {
              speed: +rotary_rpm.current.toFixed(2),
              change: +(
                ((rotary_rpm.current - rotary_rpm.previous) /
                  rotary_rpm.previous) *
                100
              ).toFixed(0),
            };
            machineObj.currentProductionSpeed = {
              speed: +production_meters_speed.current.toFixed(0),
              change: +(
                ((production_meters_speed.current -
                  production_meters_speed.previous) /
                  production_meters_speed.previous) *
                100
              ).toFixed(0),
            };
          }
          machineObj.activeOrder = machine.activeOrder || null;
          const moldName = machine.installedMold
            ? machine.installedMold.name
            : machine.mold_name;
          const targetData =
            moldName && moldName !== "UNSET"
              ? activeTargets?.[machineKey]?.[moldName] || null
              : null;
          if (targetData && (targetData as any).target) {
            const t = targetData as any;
            machineObj.productionTarget = {
              name: t.name || "",
              target: t.target?.total || 0,
              current: t.target?.current || 0,
              due: t.target?.due || null,
              started: t.startedAt ? +(t.startedAt / 1000).toFixed(0) : undefined,
              sapOrder: t.sapOrder || null,
            };
          } else {
            machineObj.productionTarget = null;
          }
          myMachines[machineKey] = machineObj;
        }
        return {
          departments,
          machines: myMachines,
        };
      };
      resolve(fetch());
    } catch (error) {
      reject(error);
    }
  });
};

export default fetch;
