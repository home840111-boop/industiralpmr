import { get } from "../../../Components/firebase/api/db";
import { HourlyStats, returnType } from "./types";
import dayjs from "../../../Components/Functions/dayjs";
import secToTime from "../../../Components/Functions/converters/secondsToHourMin";
import insertUnitOffSessions from "../../../Components/Functions/formatters/insertUnitOffSessions";
import sortHourlyTree from "../../../Components/Functions/formatters/hourlyTree";
import store from "../../../Components/Store";
import {
  factoryProductionAtom,
  machinesAtom,
  offlineTimeAtom,
  offtimeBasedEfficiencyAtom,
} from "../../../Components/Store/atoms";
import minifiedSecFormatter from "../../../Components/Functions/formatters/minifiedSecFormatter";
import hourlyTimeFixer from "../../../Components/Functions/formatters/hourlyTimeFixer";
import { setCachedUnitMac } from "../../../Services/telemetry/useUnitMac";
import { computeTimingBreakdown } from "../../../Services/workSchedule";

const fetch = (
  date: string,
  machine: string,
  shifts: {
    shifts: 1 | 2 | 3;
    A: number;
    B: number;
    C: number;
  },
): Promise<returnType> => {
  return new Promise((resolve, reject) => {
    const func = async () => {
      try {
        const data: returnType = {
          machineFound: true,
          reportFound: true,
          machineDetails: null,
          report: {
            total: {
              shots: {
                value: 0,
                change: 0,
              },
              production_meters: {
                value: 0,
                change: 0,
              },
              production: {
                value: 0,
                change: 0,
              },
              material: {
                value: 0,
                change: 0,
              },
              electricity: {
                value: 0,
                change: 0,
              },
              ontime: 0,
              idle_time: 0,
              offtime: 0,
              materialBreakdown: {},
            },
            hourly: {
              hours: [],
              stats: {
                avgs: {
                  shots: null,
                  production_meters: null,
                  production: null,
                  material: null,
                  electricity: null,
                },
                best: {
                  shots: "00:00",
                  production_meters: "00:00",
                  production: "00:00",
                  material: "00:00",
                  electricity: "00:00",
                },
                worst: {
                  shots: "00:00",
                  production_meters: "00:00",
                  production: "00:00",
                  material: "00:00",
                  electricity: "00:00",
                },
              },
              tree: [],
            },
            molds: {},
          },
          insights: {
            productionPerUnit: 0,
            materialPerUnit: 0,
            unitsPerPiece: 0,
            unitsPerGram: 0,
            shotsPerUnit: 0,
            unitsPerShot: 0,
            consumptionPerKg: 0,
            materialPerShot: 0,
            meterProductionPerUnit: 0,
            unitsPerMeter: 0,
          },
        };
        const allowedMachine = store.get(machinesAtom) || {};
        const offlineTime = store.get(offlineTimeAtom);
        const productionType = store.get(factoryProductionAtom);
        if (allowedMachine[machine] === undefined) {
          data.machineFound = false;
          resolve(data);
          return;
        }
        const snaps = [
          get(`machines/${machine}`),
          get(`reports/machines/${machine}/daily/${date}`),
          get(`reports/machines/${machine}/hourly/${date}`),
          get(`downtime-reasons/${machine}/${date}`).catch(
            () => ({ exists: () => false, val: () => null }) as any,
          ),
        ];
        const [machineSnap, dailySnap, hourlySnap, reasonsSnap] = await Promise.all(snaps);
        if (!machineSnap.exists()) {
          data.machineFound = false;
          resolve(data);
          return;
        }
        if (!dailySnap.exists() || !hourlySnap.exists())
          data.reportFound = false;
        const machineData = machineSnap.val();
        const isPowerAnalyzer = machineData.isPowerAnalyzer || false;
        machineData.unit = machineData.unit || 1;
        const [unitSnap, powerOffsSnap, targetSnap] = await Promise.all([
          get(`units/${machineData.unit}`),
          get(`reports/factory/daily/${date}/unit_power`),
          get(`production-targets/active/${machine}`),
        ] as const);
        const powerOffs = (powerOffsSnap.val() || {}) as any;
        if (!unitSnap.exists()) {
          data.machineFound = false;
          resolve(data);
          return;
        }
        const unitData = unitSnap.val();
        const unitMac =
          typeof unitData?.mac === "string" && unitData.mac.trim()
            ? unitData.mac.trim()
            : typeof unitData?.device?.mac === "string" && unitData.device.mac.trim()
              ? unitData.device.mac.trim()
              : null;
        if (unitMac) {
          setCachedUnitMac(machineData.unit, unitMac);
        }
        const { lastContact, uploadedTil } = unitData;
        const diff = dayjs().diff(dayjs.unix(lastContact || 0), "minute");
        const connected = diff <= offlineTime;
        const isUpToDate = (() => {
          if (uploadedTil === undefined) return true;
          const uploadedTilDate = dayjs(uploadedTil);
          const now = dayjs();
          // how far behind the data is
          const diff = now.diff(uploadedTilDate, "second");
          return minifiedSecFormatter(diff) + " behind";
        })();
        unitData.connected = connected;
        unitData.last_seen = lastContact || unitData.last_seen;
        const dailyData = dailySnap.val() || {};
        let hourlyData = hourlySnap.val() || {};
        hourlyData = hourlyTimeFixer(hourlyData);
        if (powerOffs[machineData.unit || 1]?.sessions)
          hourlyData = await insertUnitOffSessions(
            hourlyData,
            powerOffs[machineData.unit || 1]?.sessions,
            shifts.A,
            date,
          );
        const hourlyTreeData = await sortHourlyTree(shifts, hourlyData, date, hourlyData);
        data.report.hourly.tree = hourlyTreeData;
        data.machineDetails = {
          id: machine,
          isPowerAnalyzer,
          lastStatus: null,
          machineType: machineData.machine_type || "standard",
          name: "",
          unit: "",
          status: "active",
          statusSince: 0,
          moldRunning: "",
          moldRunningSince: 0,
          avgCycleTime: 0,
          operator: "",
          shiftTiming: "",
          lastUpdated: 0,
          efficiency: 0,
          on: 0,
          off: 0,
          idle: 0,
          planned: 0,
          unplannedDown: 0,
          unplannedIdle: 0,
          unplannedOff: 0,
          isUpToDate,
          upcomingMold: null,
          has_thermocouple: machineData.has_thermocouple || false,
        };
        if (dailyData === null || hourlyData === null) {
          data.reportFound = false;
        } else {
          const materials: {
            [key: string]: {
              weight: number;
              pc_weight: number | null;
            };
          } = {};
          for await (const [mold, _moldData] of Object.entries(
            dailyData?.molds || {},
          )) {
            const moldData = _moldData as any;
            for (const material in moldData.details.materials)
              materials[moldData.details.materials[material].name] = {
                weight: moldData.details.materials[material].weight,
                pc_weight: moldData.details.materials[material].pc_weight,
              };
            data.report.molds[mold] = {
              shots: moldData.stats.shots,
              production_meters: moldData.stats.production_meters || 0,
              production: moldData.stats.ontime,
              material: moldData.stats.material_usage,
              electricity: moldData.stats.electricity_usage,
            };
          }
          data.report.total.materialBreakdown = Object.fromEntries(
            Object.entries(
              dailyData?.total?.material_usage_breakdown || {},
            ).map(([material, value]) => {
              return [
                material as string,
                {
                  weight: value as number,
                  pc_weight: materials[material]?.pc_weight || null,
                },
              ];
            }),
          );
          data.report.total.shots.value = dailyData?.total?.shots || 0;
          data.report.total.production_meters.value =
            dailyData?.total?.production_meters || 0;
          data.report.total.production.value =
            dailyData?.total?.production || 0;
          data.report.total.material.value =
            dailyData?.total?.material_usage || 0;
          data.report.total.electricity.value =
            dailyData?.total?.electricity_usage || 0;
          data.report.total.ontime = Math.max(0, dailyData?.total?.ontime || 0);
          data.report.total.idle_time = Math.max(0, dailyData?.total?.offtime || 0);
          data.report.total.offtime = Math.max(
            0,
            powerOffs[machineData.unit || 1]?.total || 0,
          );
          const offtimeBasedEfficiency =
            store.get(offtimeBasedEfficiencyAtom) || false;
          if (productionType === "meter") {
            const production_meters_speed: {
              current: number;
              previous: number;
            } = machineData.production_meters_speed || {
              current: 0,
              target: 0,
            };
            const rotary_rpm: {
              current: number;
              previous: number;
            } = machineData.rotary_rpm || {
              current: 0,
              target: 0,
            };
            data.machineDetails.rotaryRPM = {
              speed: +rotary_rpm.current.toFixed(2),
              change: +(
                ((rotary_rpm.current - rotary_rpm.previous) /
                  rotary_rpm.previous) *
                100
              ).toFixed(0),
            };
            data.machineDetails.currentProductionSpeed = {
              speed: +production_meters_speed.current.toFixed(0),
              change: +(
                ((production_meters_speed.current -
                  production_meters_speed.previous) /
                  production_meters_speed.previous) *
                100
              ).toFixed(0),
            };
          }
          // Calculate planned downtime for the production day (reconciled with cached work schedule allowance)
          let plannedIdle = 0;
          let plannedOff = 0;
          const countedChunkKeys = new Set<string>();
          for (const [chunkKey, chunk] of Object.entries(hourlyData || {})) {
            const c = chunk as any;
            const isOffChunk = Boolean(c?.isShutdown || (c?.shutdown_time && c.shutdown_time > 0));
            const chunkDur = c?.shutdown_time || c?.offtime || 0;
            if (c?.reason?.scheduled) {
              countedChunkKeys.add(chunkKey);
              if (isOffChunk) plannedOff += chunkDur;
              else plannedIdle += chunkDur;
            } else if (+(c?.reason?.plannedSplitSec || 0) > 0) {
              countedChunkKeys.add(chunkKey);
              const splitSec = Math.min(+(c.reason.plannedSplitSec || 0), chunkDur || +(c.reason.plannedSplitSec || 0));
              if (isOffChunk) plannedOff += splitSec;
              else plannedIdle += splitSec;
            }
          }

          const rawReasons = (reasonsSnap?.val() || {}) as Record<string, any>;
          for (const [rKey, rVal] of Object.entries(rawReasons)) {
            if (!rVal?.scheduled) continue;
            const baseKey = rKey.endsWith("_planned") ? rKey.slice(0, -"_planned".length) : rKey;
            if (countedChunkKeys.has(baseKey) || countedChunkKeys.has(rKey)) continue;
            countedChunkKeys.add(baseKey);
            const dur = Math.max(0, +(rVal.duration || 0));
            if (rVal.type === "OFF") plannedOff += dur;
            else plannedIdle += dur;
          }

          const ontime = dailyData?.total?.ontime || 0;
          const rawIdle = dailyData?.total?.offtime || 0;
          const rawOff = data.report.total.offtime || 0;
          const timing = computeTimingBreakdown(
            ontime,
            rawIdle,
            rawOff,
            plannedIdle,
            plannedOff,
            offtimeBasedEfficiency,
          );

          data.machineDetails.efficiency = timing.efficiency;
          data.machineDetails.planned = timing.plannedTotal;
          data.machineDetails.unplannedDown = timing.unplannedDown;
          data.machineDetails.unplannedIdle = timing.unplannedIdle;
          data.machineDetails.unplannedOff = timing.unplannedOff;
          data.machineDetails.upcomingMold = machineData?.pending_mold
            ?.installedMold?.name
            ? {
                name: machineData.pending_mold.installedMold.name,
                start: machineData.pending_mold.mold_start_time,
              }
            : null;
          machineData.mold_name = machineData.installedMold
            ? machineData.installedMold.name
            : machineData.mold_name;
          data.machineDetails.avgCycleTime = +(
            productionType === "molding"
              ? dailyData?.molds?.[machineData.mold_name || ""]?.stats.ontime +
                dailyData?.molds?.[machineData.mold_name || ""]?.stats.shots
                ? dailyData?.molds?.[machineData.mold_name || ""].stats.ontime /
                  dailyData?.molds?.[machineData.mold_name || ""].stats.shots
                : 0
              : dailyData?.molds?.[machineData.mold_name || ""]?.stats.ontime +
                  dailyData?.molds?.[machineData.mold_name || ""]?.stats
                    .production_meters
                ? dailyData?.molds?.[machineData.mold_name || ""].stats.ontime /
                  dailyData?.molds?.[machineData.mold_name || ""].stats
                    .production_meters
                : 0
          ).toFixed(0);
          data.machineDetails.on = data.report.total.ontime;
          data.machineDetails.off = data.report.total.offtime;
          data.machineDetails.idle = data.report.total.idle_time;
          data.insights.productionPerUnit = +(
            dailyData?.total?.production / dailyData?.total?.electricity_usage
          ).toFixed(0);
          data.insights.materialPerUnit = +(
            dailyData?.total?.material_usage /
            dailyData?.total?.electricity_usage
          ).toFixed(2);
          data.insights.unitsPerPiece = +(
            dailyData?.total?.electricity_usage / dailyData?.total?.production
          ).toFixed(3);
          data.insights.unitsPerGram = +(
            dailyData?.total?.electricity_usage /
            dailyData?.total?.material_usage
          ).toFixed(3);
          data.insights.shotsPerUnit = +(
            dailyData?.total?.shots / dailyData?.total?.electricity_usage
          ).toFixed(0);
          data.insights.unitsPerShot = +(
            dailyData?.total?.electricity_usage / dailyData?.total?.shots
          ).toFixed(3);
          data.insights.consumptionPerKg = +(
            dailyData?.total?.electricity_usage /
            (dailyData?.total?.material_usage / 1000)
          ).toFixed(3);
          data.insights.materialPerShot = +(
            dailyData?.total?.material_usage / dailyData?.total?.shots
          ).toFixed(3);
          data.insights.meterProductionPerUnit = +(
            dailyData?.total?.production_meters /
            dailyData?.total?.electricity_usage
          ).toFixed(2);
          data.insights.unitsPerMeter = +(
            dailyData?.total?.electricity_usage /
            dailyData?.total?.production_meters
          ).toFixed(3);
        }
        data.machineDetails.name = machineData.machine_model;
        data.machineDetails.unit =
          "Unit#" + String(machineData.unit).padStart(2, "0");
        data.machineDetails.unitNo = machineData.unit || 1;
        data.machineDetails.mac = unitMac;
        data.machineDetails.status = unitData.connected
          ? machineData.machine_status
            ? "ON"
            : "IDLE"
          : unitData.cleanDisconnect
            ? "OFF"
            : "NA";
        data.machineDetails.lastStatus =
          data.machineDetails.status === "NA"
            ? machineData.machine_status
              ? "ON"
              : "IDLE"
            : null;
        data.machineDetails.statusSince =
          data.machineDetails.status === "NA"
            ? unitData.last_seen
            : dayjs(machineData.at).unix();

        data.machineDetails.moldRunning = machineData.installedMold
          ? machineData.installedMold.name
          : machineData.mold_name || "";
        data.machineDetails.moldRunningSince = machineData.installedMold
          ? machineData.mold_start_time
          : machineData.mold_start_time || 0;
        data.machineDetails.lastUpdated = dayjs(machineData.updated).unix();
        data.machineDetails.activeOrder = machineData.activeOrder || null;
        const runningMold = machineData.installedMold
          ? machineData.installedMold.name
          : machineData.mold_name || "";
        const targetMap = targetSnap.val() || {};
        const targetData =
          runningMold && runningMold !== "UNSET"
            ? targetMap[runningMold] || null
            : null;
        if (targetData && (targetData as any).target) {
          const t = targetData as any;
          data.machineDetails.productionTarget = {
            name: t.name || "",
            target: t.target?.total || 0,
            current: t.target?.current || 0,
            due: t.target?.due || null,
            started: t.startedAt ? +(t.startedAt / 1000).toFixed(0) : undefined,
            sapOrder: t.sapOrder || null,
          };
        } else {
          data.machineDetails.productionTarget = null;
        }
        const rn = dayjs();
        const rnSecs = rn.hour() * 3600 + rn.minute() * 60 + rn.second();
        const operator = (() => {
          let operator = "A - " + machineData.operator_a;
          if (isNaN(shifts.B)) operator = "A - " + machineData.operator_a;
          else if (rnSecs > +shifts.A && rnSecs < +shifts.B)
            operator = "A - " + machineData.operator_a;
          else if (isNaN(shifts.C)) operator = "B - " + machineData.operator_b;
          else if (rnSecs > +shifts.B && rnSecs < +shifts.C)
            operator = "B - " + machineData.operator_b;
          else if (rnSecs > +shifts.C && rnSecs < +shifts.A)
            operator = "C - " + machineData.operator_c;
          return operator;
        })();
        const shiftTiming = (() => {
          const shift = operator.split(" - ")[0];
          if (shift === "A")
            if (isNaN(shifts.B))
              return secToTime(shifts.A) + " - " + secToTime(shifts.A);
            else return secToTime(shifts.A) + " - " + secToTime(shifts.B);
          else if (shift === "B") {
            if (isNaN(shifts.C))
              return secToTime(shifts.B) + " - " + secToTime(shifts.A);
            else return secToTime(shifts.B) + " - " + secToTime(shifts.C);
          } else if (shift === "C")
            return secToTime(shifts.C) + " - " + secToTime(shifts.A);
          else return "NA";
        })();
        data.machineDetails.shiftTiming = shiftTiming;
        data.machineDetails.operator = operator;
        const rawHours = Object.values(hourlyData || {});
        const lastHour = rawHours.at(-1) as any;
        const secondLastHour = rawHours.at(-2) as any;
        const hours: {
          start: string;
          end: string;
          _start: number;
          _end: number;
          shots: number;
          production_meters: number;
          production: number;
          material: number;
          electricity: number;
          found: boolean;
        }[] = [];
        for (let i = 0; i < 24; i++) {
          const start = new Date((shifts.A + 3600 * i) * 1000);
          const end = new Date((shifts.A + 3600 * (i + 1) + 59) * 1000);
          const _start = start.getTime() / 1000;
          const _end = end.getTime() / 1000;
          hours.push({
            _start,
            _end,
            start: secToTime(_start),
            end: secToTime(_end),
            shots: 0,
            production_meters: 0,
            production: 0,
            material: 0,
            electricity: 0,
            found: false,
          });
        }
        const hoursMiniStats: {
          best: {
            shots: number;
            production_meters: number;
            production: number;
            material: number;
            electricity: number;
          };
          worst: {
            shots: number;
            production_meters: number;
            production: number;
            material: number;
            electricity: number;
          };
          bestIndex: [number, number, number, number, number];
          worstIndex: [number, number, number, number, number];
        } = {
          best: {
            shots: -Infinity,
            production_meters: -Infinity,
            production: -Infinity,
            material: -Infinity,
            electricity: -Infinity,
          },
          worst: {
            shots: Infinity,
            production_meters: Infinity,
            production: Infinity,
            material: Infinity,
            electricity: Infinity,
          },
          bestIndex: [0, 0, 0, 0, 0],
          worstIndex: [0, 0, 0, 0, 0],
        };
        const hourlyStats: HourlyStats = data.report.hourly.stats;
        for await (const [index, _hour] of Object.entries(rawHours)) {
          const hour = _hour as any;
          const start = new Date(hour.from * 1000).getTime() / 1000;
          const end = new Date(hour.time * 1000).getTime() / 1000;
          // check which hour it belongs to
          const hourIndex = hours.findIndex(
            (hour) => start >= hour._start && end <= hour._end,
          );
          if (hourIndex === -1) continue;
          const foundHour = hours[hourIndex];
          foundHour.found = true;
          foundHour.shots += hour.shots;
          foundHour.production_meters += hour.production_meters;
          foundHour.production += hour.production;
          foundHour.material += hour.material_usage;
          foundHour.electricity += hour.electricity_usage;
          if (+index === rawHours.length - 1) continue;
          if (hour.production_meters > hoursMiniStats.best.production_meters) {
            hoursMiniStats.best.production_meters = hour.production_meters;
            hoursMiniStats.bestIndex[4] = hourIndex;
          }
          if (hour.production_meters < hoursMiniStats.worst.production_meters) {
            hoursMiniStats.worst.production_meters = hour.production_meters;
            hoursMiniStats.worstIndex[4] = hourIndex;
          }
          if (hour.shots > hoursMiniStats.best.shots) {
            hoursMiniStats.best.shots = hour.shots;
            hoursMiniStats.bestIndex[0] = hourIndex;
          }
          if (hour.shots < hoursMiniStats.worst.shots) {
            hoursMiniStats.worst.shots = hour.shots;
            hoursMiniStats.worstIndex[0] = hourIndex;
          }
          if (hour.production > hoursMiniStats.best.production) {
            hoursMiniStats.best.production = hour.production;
            hoursMiniStats.bestIndex[1] = hourIndex;
          }
          if (hour.production < hoursMiniStats.worst.production) {
            hoursMiniStats.worst.production = hour.production;
            hoursMiniStats.worstIndex[1] = hourIndex;
          }
          if (hour.material_usage > hoursMiniStats.best.material) {
            hoursMiniStats.best.material = hour.material_usage;
            hoursMiniStats.bestIndex[2] = hourIndex;
          }
          if (hour.material_usage < hoursMiniStats.worst.material) {
            hoursMiniStats.worst.material = hour.material_usage;
            hoursMiniStats.worstIndex[2] = hourIndex;
          }
          if (hour.electricity_usage > hoursMiniStats.best.electricity) {
            hoursMiniStats.best.electricity = hour.electricity_usage;
            hoursMiniStats.bestIndex[3] = hourIndex;
          }
          if (hour.electricity_usage < hoursMiniStats.worst.electricity) {
            hoursMiniStats.worst.electricity = hour.electricity_usage;
            hoursMiniStats.worstIndex[3] = hourIndex;
          }
        }
        const hoursLength = hours.filter((hour) => hour.found).length;
        hourlyStats.avgs.production_meters = +(
          data.report.total.production_meters.value /
            ((hoursLength || 1) - 1) || 0
        ).toFixed(0);
        hourlyStats.avgs.shots = +(
          data.report.total.shots.value / ((hoursLength || 1) - 1) || 0
        ).toFixed(0);
        hourlyStats.avgs.production = +(
          data.report.total.production.value / ((hoursLength || 1) - 1) || 0
        ).toFixed(0);
        hourlyStats.avgs.material = +(
          data.report.total.material.value / ((hoursLength || 1) - 1) || 0
        ).toFixed(2);
        hourlyStats.avgs.electricity = +(
          data.report.total.electricity.value / ((hoursLength || 1) - 1) || 0
        ).toFixed(2);
        if (lastHour && secondLastHour) {
          data.report.total.production_meters.change = +(
            ((lastHour.production_meters - secondLastHour.production_meters) /
              secondLastHour.production_meters) *
            100
          ).toFixed(2);
          data.report.total.shots.change = +(
            ((lastHour.shots - secondLastHour.shots) / secondLastHour.shots) *
            100
          ).toFixed(2);
          data.report.total.production.change = +(
            ((lastHour.production - secondLastHour.production) /
              secondLastHour.production) *
            100
          ).toFixed(2);
          data.report.total.material.change = +(
            ((lastHour.material_usage - secondLastHour.material_usage) /
              secondLastHour.material_usage) *
            100
          ).toFixed(2);
          data.report.total.electricity.change = +(
            ((lastHour.electricity_usage - secondLastHour.electricity_usage) /
              secondLastHour.electricity_usage) *
            100
          ).toFixed(2);
        }
        hourlyStats.best.shots =
          hours[hoursMiniStats.bestIndex[0]].start +
          " - " +
          hours[hoursMiniStats.bestIndex[0]].end;
        hourlyStats.best.production =
          hours[hoursMiniStats.bestIndex[1]].start +
          " - " +
          hours[hoursMiniStats.bestIndex[1]].end;
        hourlyStats.best.material =
          hours[hoursMiniStats.bestIndex[2]].start +
          " - " +
          hours[hoursMiniStats.bestIndex[2]].end;
        hourlyStats.best.electricity =
          hours[hoursMiniStats.bestIndex[3]].start +
          " - " +
          hours[hoursMiniStats.bestIndex[3]].end;
        hourlyStats.worst.shots =
          hours[hoursMiniStats.worstIndex[0]].start +
          " - " +
          hours[hoursMiniStats.worstIndex[0]].end;
        hourlyStats.worst.production =
          hours[hoursMiniStats.worstIndex[1]].start +
          " - " +
          hours[hoursMiniStats.worstIndex[1]].end;
        hourlyStats.worst.material =
          hours[hoursMiniStats.worstIndex[2]].start +
          " - " +
          hours[hoursMiniStats.worstIndex[2]].end;
        hourlyStats.worst.electricity =
          hours[hoursMiniStats.worstIndex[3]].start +
          " - " +
          hours[hoursMiniStats.worstIndex[3]].end;
        hourlyStats.best.production_meters =
          hours[hoursMiniStats.bestIndex[4]].start +
          " - " +
          hours[hoursMiniStats.bestIndex[4]].end;
        hourlyStats.worst.production_meters =
          hours[hoursMiniStats.worstIndex[4]].start +
          " - " +
          hours[hoursMiniStats.worstIndex[4]].end;
        data.report.hourly.hours = hours.filter((hour) => hour.found);
        resolve(data);
      } catch (error) {
        reject(error);
      }
    };
    func();
  });
};

export default fetch;
