import { fetchDowntimeReasons } from "../MachineReport/Downtime/api";
import { DowntimeReasonEntry, plannedTotals, ShiftKey } from "../MachineReport/Downtime/types";
import { computeTimingBreakdown, fetchWorkSchedules, reconcilePlannedDowntime, resolveRangeAllowanceSec, TimingBreakdown } from "../../../../Services/workSchedule";
import { Box, Center, Flex, Stack, Text, useToast, VStack } from "@chakra-ui/react"
import { useEffect, useMemo, useRef, useState } from "react"
import { RiDeleteBin7Line } from "react-icons/ri"
import MyCard from "../../../../Components/micro/Card"
import { ReportSubmitType } from "../../Selector/types"
import MyPopover from "../../../../Components/micro/MyPopover"
import { FiDownload } from "react-icons/fi"
import { FaFileExcel, FaFilePdf } from "react-icons/fa"
import ConfirmDialog from "../../../../Components/micro/ConfirmDialog"
import dayjs from "../../../../Components/Functions/dayjs";
import { get } from "../../../../Components/firebase/api/db"
import { SmallFill } from "../../../../Components/Loaders"
import NotFound from "../../../../Components/micro/NotFound"
import secondsToHourMin from "../../../../Components/Functions/converters/secondsToHourMin"
import Get from "../../../../Components/Store/hooks/Get"
import { equipmentsAtom, factoriesAtom, machinesAtom, selectedFactoryAtom, uidAtom, companyNameAtom, machinesOrderAtom, offtimeBasedEfficiencyAtom, shiftsAtom, factoryProductionAtom } from "../../../../Components/Store/atoms"
import store from "../../../../Components/Store"
import Machine from "./Machine"
import Factory from "./Factory"
import Equipment from "./Equipment"
import { endAt, orderByKey, query, ref, startAt, get as firebaseGet } from "firebase/database"
import { db } from "../../../../Components/firebase"
import Listen from "../../../../Components/Store/hooks/Listen"
import MainElectricity from "./MainElectricity"
import MaterialBreakdown from "./MaterialBreakdown"
import landscapePDF from "../../../../Components/Exporters/landscapePDF";
import numberFormatter from "../../../../Components/Functions/formatters/numberFormatter";
import weightFromatter from "../../../../Components/Functions/formatters/weightFormatter";
import unitFormatter from "../../../../Components/Functions/formatters/unitFormatter";
import excelDownload, { ExcelSectionType } from "../../../../Components/Exporters/excelDownload"
import secFormatter from "../../../../Components/Functions/formatters/secFormatter"
import isAllowedShiftHour from "../../../../Components/Functions/isAllowedShiftHour"
import timeToSec from "../../../../Components/Functions/converters/hourMinToSeconds"
import unitPowerOffAllowedShifts from "../../../../Components/Functions/unitPowerOffAllowedShifts"
import lengthFormatter from "../../../../Components/Functions/formatters/lengthFormatter"

type ShiftOption = ReportSubmitType["factory"]["secondaryOption"][number]

interface SimpleStats {
    shots: number,
    production_meters: number,
    production: number,
    electricity: number,
    material: number,
};
interface shifts extends SimpleStats {
    timing: string,
    supervisor: string
};
interface MachineStats extends SimpleStats {
    name: string,
    avgCycletime: string,
    ontime: number,
    offtime: number,
    idletime: number,
    plannedIdle: number,
    plannedOff: number,
    plannedDown: number,
    unplannedIdle: number,
    unplannedOff: number,
    unplannedDown: number,
    efficiency: number,
    moldName: string,
}
interface Hours extends SimpleStats {
    time: string,
}
interface MachineHours extends Hours {
    name: string,
}
interface MaterialData {
    total: number,
    materialBreakdown: {
        [key: string]: number
    },
    machineBreakdown: {
        [key: string]: {
            [key: string]: {
                name: string,
                value: number
            }
        }
    }
}
interface MainData {
    total: number,
    hours: {
        name: string,
        subName?: string,
        value: number,
    }[],
    days?: {
        name: string,
        value: number,
    }[],
    insights: {
        highest: {
            time: string,
            value: number
        },
        lowest: {
            time: string,
            value: number
        },
        average: number
    }
};
interface EquipmentStats extends Omit<SimpleStats, "shots" | "production" | "material" | "production_meters"> {
    name: string,
};
interface EquipmentHours extends Omit<MachineHours, "shots" | "production" | "material" | "production_meters"> { };
interface DataToSet {
    total: SimpleStats,
    fleetTiming: TimingBreakdown,
    shifts: {
        A: shifts | null,
        B: shifts | null,
        C: shifts | null
    },
    machines: {
        [key: string]: MachineStats
    },
    machineHours: MachineHours[];
    equipments: {
        [key: string]: EquipmentStats
    },
    equipmentHours: EquipmentHours[],
    hours: Hours[],
    mainElectricity: null | MainData,
    materialData: MaterialData | null
}

const summarizeFleetTiming = (
    machinesList: MachineStats[],
    offtimeBasedEfficiency: boolean,
): TimingBreakdown => {
    let on = 0;
    let idle = 0;
    let off = 0;
    let pIdle = 0;
    let pOff = 0;
    for (const m of machinesList) {
        on += m.ontime;
        idle += m.idletime;
        off += m.offtime;
        pIdle += m.plannedIdle;
        pOff += m.plannedOff;
    }
    return computeTimingBreakdown(on, idle, off, pIdle, pOff, offtimeBasedEfficiency);
};

const normalizeHourStart = (hour: any, shiftData: any, hourKey?: string): number => {
    let startSec = 0;
    if (hour?.from !== undefined && hour?.from !== null && !isNaN(Number(hour.from))) {
        const fromNum = Number(hour.from);
        if (fromNum > 1e11) {
            const d = dayjs(fromNum);
            startSec = d.hour() * 3600 + d.minute() * 60 + d.second();
        } else if (fromNum > 1e9) {
            const d = dayjs.unix(fromNum);
            startSec = d.hour() * 3600 + d.minute() * 60 + d.second();
        } else {
            startSec = fromNum % 86400;
        }
    } else if (hour?.time !== undefined && typeof hour.time === "string") {
        startSec = timeToSec(hour.time.split(" - ")?.[0] || "00:00");
    } else if (hourKey) {
        const hIdx = parseInt(hourKey, 10);
        if (!isNaN(hIdx) && hIdx >= 1 && hIdx <= 24) {
            startSec = (+shiftData.shift_a_start + (hIdx - 1) * 3600) % 86400;
        }
    }
    if (shiftData?.shift_a_start && startSec < +shiftData.shift_a_start) {
        startSec += 86400;
    }
    return startSec;
};

const FactoryReport = ({
    parameters
}: {
    parameters: ReportSubmitType["factory"]
}) => {
    const taost = useToast();
    const factories = Get(factoriesAtom);
    const selectedFactory = Listen(selectedFactoryAtom);
    const [data, setData] = useState<null | DataToSet | "NOT_FOUND">(null);
    const shifts = Get(shiftsAtom);
    // Shifts toggled on in the Machine Total card only. Tied to `parameters` so a new report resets to all its shifts.
    const [shiftOverride, setShiftOverride] = useState<{ params: typeof parameters, shifts: ShiftOption[] } | null>(null);
    const activeShifts: ShiftOption[] = shiftOverride && shiftOverride.params === parameters
        ? shiftOverride.shifts
        : parameters.secondaryOption;
    const toggleShift = (value: string) => {
        const isOn = activeShifts.some((s) => s.value === value);
        // at least one shift must always stay on
        if (isOn && activeShifts.length === 1) return;
        const next = parameters.secondaryOption.filter((s) =>
            s.value === value ? !isOn : activeShifts.some((a) => a.value === s.value)
        );
        setShiftOverride({ params: parameters, shifts: next });
    };
    // Machine Total card data for the toggled shifts (null = card follows the main report data)
    const [machineCard, setMachineCard] = useState<{ params: typeof parameters, key: string, machines: DataToSet["machines"] } | null>(null);
    const [isMachineCardLoading, setIsMachineCardLoading] = useState(false);
    const buildRef = useRef<((shiftOpts: ShiftOption[]) => Promise<DataToSet | "NOT_FOUND">) | null>(null);
    const activeKey = activeShifts.map((s) => s.value).join(",");
    const allKey = parameters.secondaryOption.map((s) => s.value).join(",");
    const shiftsTitle = useMemo(() => {
        if (!shifts) return "";
        if (shifts.shifts === parameters.secondaryOption.length) return "All Shifts";
        return "Shift " + parameters.secondaryOption.map((option) => option.label).join(", ");
    }, [parameters, shifts]);
    const selectedTitle = useMemo(() => {
        if (parameters.date.from?.toDateString() === parameters.date.to?.toDateString()) return `${shiftsTitle} | ${dayjs(parameters.date.from).format("DD MMM, YY")}`;
        return `${shiftsTitle} | ${dayjs(parameters.date.from).format("DD MMM, YY")} - ${dayjs(parameters.date.to).format("DD MMM, YY")}`;
    }, [parameters, shiftsTitle]);
    const [isBusy, setIsBusy] = useState(false);
    const machines = Get(machinesAtom);
    const productionType = Get(factoryProductionAtom);
    const machinesOrder = Get(machinesOrderAtom);
    const equipments = Get(equipmentsAtom);
    const companyName = Get(companyNameAtom);
    const offtimeBasedEfficiency = Get(offtimeBasedEfficiencyAtom);
    const isSingleDay = useMemo(() => parameters.date.from?.toDateString() === parameters.date.to?.toDateString(), [parameters]);

    useEffect(() => {
        if (productionType === null || !machinesOrder || !machines || !equipments || !factories || !selectedFactory || offtimeBasedEfficiency === null || shifts === null) return;
        setData(null);
        const build = async (shiftOpts: ShiftOption[]): Promise<DataToSet | "NOT_FOUND"> => {
            const fetchMachineRejectedPieces = async (machineId: string, date: string, allowedShifts: ("a" | "b" | "c")[]) => {
                const shiftPromises = allowedShifts.map(async (shift) => {
                    const shiftKey = shift.toUpperCase();
                    try {
                        const rejectedSnap = await get(`reports/machines/${machineId}/daily/${date}/total/operators/${shiftKey}/rejected`);
                        if (rejectedSnap.exists()) {
                            return rejectedSnap.val()?.pieces || 0;
                        }
                    } catch (error) {
                        console.error(`Error fetching rejected for ${machineId} shift ${shiftKey}:`, error);
                    }
                    return 0;
                });
                const results = await Promise.all(shiftPromises);
                return results.reduce((acc, curr) => acc + curr, 0);
            };

            const allowedShifts = shiftOpts.map((option) => option.value) as ("a" | "b" | "c")[];

            const allShifts = allowedShifts.length === shifts.shifts;
            const mySelectedFactory: any = factories[selectedFactory.value];
            const dataToSet: DataToSet = {
                total: {
                    shots: 0,
                    production_meters: 0,
                    production: 0,
                    electricity: 0,
                    material: 0
                },
                fleetTiming: computeTimingBreakdown(0, 0, 0, 0, 0, !!offtimeBasedEfficiency),
                shifts: {
                    A: allowedShifts.includes("a") ? {
                        shots: 0,
                        production_meters: 0,
                        production: 0,
                        electricity: 0,
                        material: 0,
                        timing: "",
                        supervisor: ""
                    } : null,
                    B: null,
                    C: null
                },
                machines: {},
                machineHours: [] as MachineHours[],
                equipments: {},
                hours: [] as Hours[],
                equipmentHours: [] as EquipmentHours[],
                mainElectricity: null,
                materialData: null
            };
            if (isSingleDay) {
                const date = dayjs(parameters.date.from).format("YYYY-MM-DD");
                const promises = [
                    get(`reports/factory/daily/${date}`),
                    get(`reports/factory/hourly/${date}`),
                    get(`simple_meter/daily/${date}`),
                    get(`materials/stats/${allShifts ? date : "NON_EXISTANT_DATE_TO_AVOID_DATA"}`),
                    get(`machines`)
                ];
                for (const key in machines) {
                    promises.push(get(`reports/machines/${key}/hourly/${date}`));
                }
                const [shiftSnap, snap, mainSnap, materialSnap, machinesUnitSnap, ...machinesSnap] = await Promise.all(promises);
                const [downtimeEntries, workSchedules] = await Promise.all([
                    fetchDowntimeReasons(Object.keys(machines), date, date).catch(() => []),
                    fetchWorkSchedules().catch(() => ({} as Record<string, any>)),
                ]);
                const machinesData: {
                    [key: string]: object | null
                } = {};
                Object.keys(machines).forEach((key, i) => {
                    machinesData[key] = machinesSnap[i].val();
                });
                if (!snap.exists() || !shiftSnap.exists()) {
                    return "NOT_FOUND";
                }
                const machineUnits = machinesUnitSnap.val() || {};
                const data = snap.val();
                let shiftData = shiftSnap.val();
                const mainData = mainSnap.val();
                const materialData = materialSnap.val();
                if (materialData) {
                    const _data: MaterialData = {
                        total: 0,
                        materialBreakdown: {} as MaterialData["materialBreakdown"],
                        machineBreakdown: {} as MaterialData["machineBreakdown"]
                    };
                    for (const [_materialName, _machine] of Object.entries(materialData || {})) {
                        const materialName = _materialName as string;
                        const machine = _machine as any;
                        for (const [machineName, consumption] of Object.entries(machine || {})) {
                            if (!machines[machineName]) continue;
                            if (mySelectedFactory?.machines && !Object.values(mySelectedFactory?.machines || {}).includes(machineName)) continue;
                            if (_data.materialBreakdown[materialName] === undefined) _data.materialBreakdown[materialName] = 0;
                            _data.materialBreakdown[materialName] += consumption as number;
                            _data.total += consumption as number;
                            if (_data.machineBreakdown[machineName] === undefined) _data.machineBreakdown[machineName] = {};
                            _data.machineBreakdown[machineName][materialName] = {
                                name: machines[machineName],
                                value: consumption as number
                            }
                        }
                    }
                    if (_data.total > 0) dataToSet.materialData = _data;
                }
                if (mainData) {
                    const main: DataToSet["mainElectricity"] = {
                        total: 0,
                        hours: [] as {
                            name: string,
                            value: number
                        }[],
                        insights: {
                            highest: {
                                time: "",
                                value: -Infinity
                            },
                            lowest: {
                                time: "",
                                value: Infinity
                            },
                            average: 0
                        }
                    };
                    for await (const _hour of Object.values(mainData?.hours || {})) {
                        const hour = _hour as any;
                        if (!hour) continue;
                        let start = timeToSec(hour?.time?.split(" - ")?.[0] || "00:00");
                        if (start < +shiftData.shift_a_start) start += 86400;
                        if (!isAllowedShiftHour(shiftData, start, allowedShifts)) continue;
                        main.total += hour.value;
                        main.hours.push({
                            name: hour.time,
                            value: hour.value
                        });
                        if (hour.value > main.insights.highest.value) {
                            main.insights.highest = {
                                time: hour.time,
                                value: hour.value
                            }
                        }
                        if (hour.value < main.insights.lowest.value) {
                            main.insights.lowest = {
                                time: hour.time,
                                value: hour.value
                            }
                        }
                    }
                    main.insights.average = (main.total / main.hours.length) || 0;

                    dataToSet.mainElectricity = main;
                }
                if (shiftData?.factories && mySelectedFactory) {
                    shiftData = {
                        ...shiftData,
                        ...shiftData.factories[selectedFactory.value]
                    }
                } else if (mySelectedFactory === undefined && shiftData?.factories) {
                    const factory = { ...shiftData.factories[0] };
                    factory.supervisor_a = [];
                    factory.supervisor_b = [];
                    factory.supervisor_c = [];
                    for await (const f of Object.values(shiftData.factories) as any) {
                        factory.supervisor_a.push(f.supervisor_a);
                        factory.supervisor_b.push(f.supervisor_b);
                        factory.supervisor_c.push(f.supervisor_c);
                    }
                    factory.supervisor_a = factory.supervisor_a.join(", ");
                    factory.supervisor_b = factory.supervisor_b.join(", ");
                    factory.supervisor_c = factory.supervisor_c.join(", ");
                    shiftData = {
                        ...shiftData,
                        ...factory,
                    };
                }
                if (allowedShifts.includes("a")) {
                    dataToSet.shifts.A = {
                        shots: 0,
                        production_meters: 0,
                        production: 0,
                        electricity: 0,
                        material: 0,
                        timing: "",
                        supervisor: ""
                    };
                    dataToSet.shifts.A.supervisor = shiftData.supervisor_a?.toUpperCase() || "";
                }
                if (shiftData.shifts === 1) {
                    if (allowedShifts.includes("a")) {
                        (dataToSet.shifts.A as shifts).timing = `${secondsToHourMin(+shiftData.shift_a_start || 0)} - ${secondsToHourMin(+shiftData.shift_a_start || 0)}`
                    }
                } else if (shiftData.shifts === 2) {
                    if (allowedShifts.includes("b")) {
                        dataToSet.shifts.B = {
                            shots: 0,
                            production_meters: 0,
                            production: 0,
                            electricity: 0,
                            material: 0,
                            timing: "",
                            supervisor: ""
                        };
                        dataToSet.shifts.B.supervisor = shiftData.supervisor_b?.toUpperCase() || "";
                        dataToSet.shifts.B.timing = `${secondsToHourMin(+shiftData.shift_b_start || 0)} - ${secondsToHourMin(+shiftData.shift_a_start || 0)}`
                    }
                    if (allowedShifts.includes("a")) {
                        (dataToSet.shifts.A as shifts).timing = `${secondsToHourMin(+shiftData.shift_a_start || 0)} - ${secondsToHourMin(+shiftData.shift_b_start || 0)}`;
                    }
                } else {
                    if (allowedShifts.includes("b")) {
                        dataToSet.shifts.B = {
                            shots: 0,
                            production_meters: 0,
                            production: 0,
                            electricity: 0,
                            material: 0,
                            timing: "",
                            supervisor: ""
                        };
                        dataToSet.shifts.B.supervisor = shiftData.supervisor_b?.toUpperCase() || "";
                        dataToSet.shifts.B.timing = `${secondsToHourMin(+shiftData.shift_b_start || 0)} - ${secondsToHourMin(+shiftData.shift_c_start || 0)}`
                    };
                    if (allowedShifts.includes("c")) {
                        dataToSet.shifts.C = {
                            shots: 0,
                            production_meters: 0,
                            production: 0,
                            electricity: 0,
                            material: 0,
                            timing: "",
                            supervisor: ""
                        };
                        dataToSet.shifts.C.supervisor = shiftData.supervisor_c?.toUpperCase() || "";
                        dataToSet.shifts.C.timing = `${secondsToHourMin(+shiftData.shift_c_start || 0)} - ${secondsToHourMin(+shiftData.shift_a_start || 0)}`
                    };
                    if (allowedShifts.includes("a")) {
                        (dataToSet.shifts.A as shifts).timing = `${secondsToHourMin(+shiftData.shift_a_start || 0)} - ${secondsToHourMin(+shiftData.shift_b_start || 0)}`
                    }
                }
                const machinesToSet: {
                    [key: string]: {
                        shots: number,
                        production_meters: number,
                        production: number,
                        electricity: number,
                        material: number,
                        ontime: number,
                        offtime: number,
                        idletime: number,
                        molds: {
                            [key: string]: {
                                ontime: number,
                                production_meters: number,
                                shots: number
                            }
                        }
                    }
                } = {};

                for (const machineID of Object.keys(machines)) {
                    if (mySelectedFactory?.machines && !Object.values(mySelectedFactory?.machines || {}).includes(machineID)) continue;
                    machinesToSet[machineID] = {
                        shots: 0,
                        production_meters: 0,
                        production: 0,
                        electricity: 0,
                        material: 0,
                        ontime: 0,
                        offtime: 0,
                        idletime: 0,
                        molds: {}
                    };
                }

                for (const [machineID, mHourly] of Object.entries(machinesData)) {
                    if (!machinesToSet[machineID]) continue;
                    if (!mHourly || typeof mHourly !== "object") continue;
                    for (const [hourKey, _hour] of Object.entries(mHourly as object)) {
                        const hour = _hour as any;
                        if (!hour) continue;
                        const start = normalizeHourStart(hour, shiftData, hourKey);
                        if (!allShifts && !isAllowedShiftHour(shiftData, start, allowedShifts)) continue;
                        machinesToSet[machineID].shots += (hour.shots || 0);
                        machinesToSet[machineID].production_meters += (hour.production_meters || 0);
                        machinesToSet[machineID].production += (hour.production || 0);
                        machinesToSet[machineID].electricity += (hour.electricity_usage || 0);
                        machinesToSet[machineID].material += (hour.material_usage || 0);
                        machinesToSet[machineID].ontime += (hour.ontime || 0);
                        machinesToSet[machineID].idletime += (hour.offtime || 0);
                        machinesToSet[machineID].offtime += (hour.shutdown_time || 0);
                        const moldName = (hour.mold_name || "UNSET").toString();
                        if (machinesToSet[machineID].molds[moldName] === undefined) {
                            machinesToSet[machineID].molds[moldName] = {
                                ontime: 0,
                                production_meters: 0,
                                shots: 0
                            };
                        }
                        machinesToSet[machineID].molds[moldName].ontime += (hour.ontime || 0);
                        machinesToSet[machineID].molds[moldName].shots += (hour.shots || 0);
                        machinesToSet[machineID].molds[moldName].production_meters += (hour.production_meters || 0);
                    }
                }

                for (const machineID of Object.keys(machinesToSet)) {
                    if (machinesToSet[machineID].offtime === 0) {
                        machinesToSet[machineID].offtime = unitPowerOffAllowedShifts(date, shiftData, shiftData?.unit_power?.[machineUnits?.[machineID]?.unit || 1]?.sessions || [], allowedShifts);
                    }
                }

                const factoryMachineTotals: {
                    [key: string]: {
                        shots: number,
                        production_meters: number,
                        production: number,
                        electricity: number,
                        material: number
                    }
                } = {};

                dataToSet.total.production = 0;
                dataToSet.total.shots = 0;
                dataToSet.total.production_meters = 0;
                dataToSet.total.electricity = 0;
                dataToSet.total.material = 0;

                for (let i = 1; i <= 24; i++) {
                    const hourData = data[i] as any;
                    if (!hourData) continue;
                    const _start = +shiftData.shift_a_start + ((+i - 1) * 3600);
                    const _end = +shiftData.shift_a_start + (+i * 3600);
                    const start = secondsToHourMin(_start);
                    const end = secondsToHourMin(_end);
                    if (!allShifts && !isAllowedShiftHour(shiftData, _start, allowedShifts)) continue;

                    const hour = {
                        shots: 0,
                        production_meters: 0,
                        production: 0,
                        electricity: 0,
                        material: 0,
                        timing: `${start} - ${end}`,
                        supervisor: ""
                    };
                    for await (const [key, val] of Object.entries(hourData?.machines || {})) {
                        if (!machines[key]) continue;
                        if (mySelectedFactory?.machines && !Object.values(mySelectedFactory?.machines || {}).includes(key)) continue;
                        const value = val as any;
                        const vShots = value.shots || 0;
                        const vProdMeters = value.production_meters || 0;
                        const vProd = value.production || 0;
                        const vElec = value.electricity_usage || 0;
                        const vMat = value.material_usage || 0;

                        hour.shots += vShots;
                        hour.production_meters += vProdMeters;
                        hour.production += vProd;
                        hour.electricity += vElec;
                        hour.material += vMat;
                        dataToSet.total.shots += vShots;
                        dataToSet.total.production += vProd;
                        dataToSet.total.production_meters += vProdMeters;
                        dataToSet.total.electricity += vElec;
                        dataToSet.total.material += vMat;
                        dataToSet.machineHours.push({
                            name: machines[key],
                            shots: vShots,
                            production_meters: vProdMeters,
                            production: vProd,
                            electricity: vElec,
                            material: vMat,
                            time: hour.timing
                        });

                        if (!factoryMachineTotals[key]) {
                            factoryMachineTotals[key] = {
                                shots: 0,
                                production_meters: 0,
                                production: 0,
                                electricity: 0,
                                material: 0
                            };
                        }
                        factoryMachineTotals[key].shots += vShots;
                        factoryMachineTotals[key].production_meters += vProdMeters;
                        factoryMachineTotals[key].production += vProd;
                        factoryMachineTotals[key].electricity += vElec;
                        factoryMachineTotals[key].material += vMat;
                    }
                    for await (const [key, val] of Object.entries(hourData?.equipments || {})) {
                        if (!equipments[key]) continue;
                        if (mySelectedFactory?.equipments && !Object.values(mySelectedFactory?.equipments || {}).includes(key)) continue;
                        const value = val as any;
                        const vElec = value.electricity_usage || 0;
                        hour.electricity += vElec;
                        dataToSet.total.electricity += vElec;
                        dataToSet.equipmentHours.push({
                            name: equipments[key],
                            electricity: vElec,
                            time: hour.timing
                        });
                        if (dataToSet.equipments[key] === undefined) {
                            dataToSet.equipments[key] = {
                                name: equipments[key],
                                electricity: vElec,
                            }
                        } else {
                            dataToSet.equipments[key].electricity += vElec;
                        }
                    }
                    dataToSet.hours.push({
                        electricity: hour.electricity,
                        material: hour.material,
                        production: hour.production,
                        shots: hour.shots,
                        production_meters: hour.production_meters,
                        time: hour.timing
                    });
                    if (shiftData.shifts === 1) {
                        if (allowedShifts.includes("a")) {
                            (dataToSet.shifts.A as shifts).shots += hour.shots;
                            (dataToSet.shifts.A as shifts).production_meters += hour.production_meters;
                            (dataToSet.shifts.A as shifts).production += hour.production;
                            (dataToSet.shifts.A as shifts).electricity += hour.electricity;
                            (dataToSet.shifts.A as shifts).material += hour.material;
                        }
                    } else if (shiftData.shifts === 2) {
                        if (_start < +shiftData.shift_b_start) {
                            if (allowedShifts.includes("a")) {
                                (dataToSet.shifts.A as shifts).shots += hour.shots;
                                (dataToSet.shifts.A as shifts).production_meters += hour.production_meters;
                                (dataToSet.shifts.A as shifts).production += hour.production;
                                (dataToSet.shifts.A as shifts).electricity += hour.electricity;
                                (dataToSet.shifts.A as shifts).material += hour.material;
                            }
                        } else if (dataToSet.shifts.B) {
                            if (allowedShifts.includes("b")) {
                                (dataToSet.shifts.B as shifts).shots += hour.shots;
                                (dataToSet.shifts.B as shifts).production_meters += hour.production_meters;
                                (dataToSet.shifts.B as shifts).production += hour.production;
                                (dataToSet.shifts.B as shifts).electricity += hour.electricity;
                                (dataToSet.shifts.B as shifts).material += hour.material;
                            }
                        }
                    } else {
                        if (_start < +shiftData.shift_b_start) {
                            if (allowedShifts.includes("a")) {
                                (dataToSet.shifts.A as shifts).shots += hour.shots;
                                (dataToSet.shifts.A as shifts).production_meters += hour.production_meters;
                                (dataToSet.shifts.A as shifts).production += hour.production;
                                (dataToSet.shifts.A as shifts).electricity += hour.electricity;
                                (dataToSet.shifts.A as shifts).material += hour.material;
                            }
                        } else if (_start < +shiftData.shift_c_start && dataToSet.shifts.B) {
                            if (allowedShifts.includes("b")) {
                                (dataToSet.shifts.B as shifts).shots += hour.shots;
                                (dataToSet.shifts.B as shifts).production_meters += hour.production_meters;
                                (dataToSet.shifts.B as shifts).production += hour.production;
                                (dataToSet.shifts.B as shifts).electricity += hour.electricity;
                                (dataToSet.shifts.B as shifts).material += hour.material;
                            }
                        } else if (dataToSet.shifts.C) {
                            if (allowedShifts.includes("c")) {
                                (dataToSet.shifts.C as shifts).shots += hour.shots;
                                (dataToSet.shifts.C as shifts).production_meters += hour.production_meters;
                                (dataToSet.shifts.C as shifts).production += hour.production;
                                (dataToSet.shifts.C as shifts).electricity += hour.electricity;
                                (dataToSet.shifts.C as shifts).material += hour.material;
                            }
                        }
                    }
                }

                for (const [key, fTotals] of Object.entries(factoryMachineTotals)) {
                    if (!machinesToSet[key]) continue;
                    if (machinesToSet[key].shots === 0 && fTotals.shots > 0) {
                        machinesToSet[key].shots = fTotals.shots;
                        machinesToSet[key].production = fTotals.production;
                        machinesToSet[key].production_meters = fTotals.production_meters;
                    }
                    if (machinesToSet[key].electricity === 0 && fTotals.electricity > 0) {
                        machinesToSet[key].electricity = fTotals.electricity;
                    }
                    if (machinesToSet[key].material === 0 && fTotals.material > 0) {
                        machinesToSet[key].material = fTotals.material;
                    }
                }

                const rejectedPiecesMap: { [key: string]: number } = {};
                await Promise.all(
                    Object.keys(machinesToSet).map(async (key) => {
                        rejectedPiecesMap[key] = await fetchMachineRejectedPieces(key, date, allowedShifts);
                    })
                );
                const allMachinesRejected = Object.values(rejectedPiecesMap).reduce((a, b) => a + b, 0);
                dataToSet.total.production = Math.max(0, dataToSet.total.production - allMachinesRejected);

                for (const [key, machine] of Object.entries(machinesToSet)) {
                    const rejectedPieces = rejectedPiecesMap[key] || 0;
                    const cycleTimes: string[] = [];
                    const moldNames: string[] = [];
                    const moldEntries = Object.entries(machine.molds || {});
                    if (moldEntries.length > 0) {
                        for (const [mold, moldStats] of moldEntries) {
                            moldNames.push(mold.toUpperCase());
                            const mOntime = moldStats.ontime || 0;
                            const mCount = productionType === "meter" ? (moldStats.production_meters || 0) : (moldStats.shots || 0);
                            if (mCount > 0 && mOntime > 0) {
                                cycleTimes.push(`${+(mOntime / mCount).toFixed(0)}s`);
                            } else if (moldEntries.length === 1 && machine.shots > 0 && machine.ontime > 0) {
                                const denom = productionType === "meter" ? machine.production_meters : machine.shots;
                                cycleTimes.push(denom > 0 ? `${+(machine.ontime / denom).toFixed(0)}s` : "0s");
                            } else {
                                cycleTimes.push("0s");
                            }
                        }
                    } else if (machine.shots > 0 && machine.ontime > 0) {
                        const denom = productionType === "meter" ? machine.production_meters : machine.shots;
                        cycleTimes.push(denom > 0 ? `${+(machine.ontime / denom).toFixed(0)}s` : "0s");
                    }

                    const adjustedProduction = Math.max(0, machine.production - rejectedPieces);
                    const ontime = machine.ontime || 0;
                    const idletime = machine.idletime || 0;
                    const offtime = machine.offtime || 0;

                    const rawMachinePlanned = plannedTotals(
                        downtimeEntries.filter((e: DowntimeReasonEntry) => e.machineId === key),
                        undefined,
                        allowedShifts.map(s => s.toUpperCase() as ShiftKey)
                    );
                    const totalShiftCountSingle = +(shiftData?.shifts || 3);
                    const shiftRatioSingle = totalShiftCountSingle > 0 ? Math.min(1, allowedShifts.length / totalShiftCountSingle) : 1;
                    const machineScheduleAllowanceSec = resolveRangeAllowanceSec(
                        workSchedules[key],
                        date,
                        date,
                        shiftRatioSingle
                    );
                    const machinePlanned = reconcilePlannedDowntime(
                        rawMachinePlanned,
                        idletime,
                        offtime,
                        machineScheduleAllowanceSec
                    );
                    const mTiming = computeTimingBreakdown(
                        ontime,
                        idletime,
                        offtime,
                        machinePlanned.idle,
                        machinePlanned.off,
                        !!offtimeBasedEfficiency,
                    );

                    dataToSet.machines[key] = {
                        name: machines[key] || key,
                        shots: machine.shots || 0,
                        production_meters: machine.production_meters || 0,
                        production: adjustedProduction,
                        electricity: machine.electricity || 0,
                        material: machine.material || 0,
                        avgCycletime: cycleTimes.length > 0 ? cycleTimes.join(", ") : "0s",
                        moldName: moldNames.length > 0 ? moldNames.join(", ") : "UNSET",
                        ontime,
                        idletime,
                        offtime,
                        plannedIdle: mTiming.plannedIdle,
                        plannedOff: mTiming.plannedOff,
                        plannedDown: mTiming.plannedTotal,
                        unplannedIdle: mTiming.unplannedIdle,
                        unplannedOff: mTiming.unplannedOff,
                        unplannedDown: mTiming.unplannedDown,
                        efficiency: mTiming.efficiency
                    };
                }
                dataToSet.machines = Object.fromEntries(
                    Object.entries(dataToSet.machines).sort((a, b) => machinesOrder.indexOf(a[0]) - machinesOrder.indexOf(b[0]))
                );
                dataToSet.fleetTiming = summarizeFleetTiming(
                    Object.values(dataToSet.machines),
                    !!offtimeBasedEfficiency,
                );
            } else {
                const uid = store.get(uidAtom);
                const dates = [
                    dayjs(parameters.date.from).format("YYYY-MM-DD"),
                    dayjs(parameters.date.to).format("YYYY-MM-DD")
                ];
                const promises = [];
                promises.push(
                    firebaseGet(
                        query(
                            ref(db, `users/${uid}/reports/factory/daily`),
                            orderByKey(),
                            startAt(dates[0]),
                            endAt(dates[1]),
                        ),
                    ),
                );
                promises.push(
                    firebaseGet(
                        query(
                            ref(db, `users/${uid}/reports/factory/hourly`),
                            orderByKey(),
                            startAt(dates[0]),
                            endAt(dates[1]),
                        ),
                    ),
                );
                promises.push(
                    firebaseGet(
                        query(
                            ref(db, `users/${uid}/simple_meter/daily`),
                            orderByKey(),
                            startAt(dates[0]),
                            endAt(dates[1]),
                        ),
                    ),
                );
                promises.push(
                    firebaseGet(
                        query(
                            ref(db, `users/${uid}/materials/stats`),
                            orderByKey(),
                            startAt(allShifts ? dates[0] : "NON_EXISTANT_DATE_TO_AVOID_DATA"),
                            endAt(allShifts ? dates[1] : "NON_EXISTANT_DATE_TO_AVOID_DATA"),
                        ),
                    ),
                );
                promises.push(get(`machines`));
                for (const key in machines) {
                    promises.push(
                        firebaseGet(
                            query(
                                ref(db, `users/${uid}/reports/machines/${key}/hourly/`),
                                orderByKey(),
                                startAt(dates[0]),
                                endAt(dates[1]),
                            ),
                        ),
                    );
                }
                const [shiftSnaps, snaps, mainSnap, materialSnap, machinesUnitSnap, ...machinesSnap] = await Promise.all(promises);
                const [downtimeEntriesMulti, workSchedulesMulti] = await Promise.all([
                    fetchDowntimeReasons(Object.keys(machines), dates[0], dates[1]).catch(() => [] as DowntimeReasonEntry[]),
                    fetchWorkSchedules().catch(() => ({} as Record<string, any>)),
                ]);
                const machinesData: {
                    [key: string]: object
                } = {};
                Object.keys(machines).forEach((key, i) => {
                    machinesData[key] = machinesSnap[i].val() || {};
                });
                const machineUnits = machinesUnitSnap.val() || {};
                const shiftDatas = shiftSnaps.val() || {};
                const datas = snaps.val() || {};
                const materialData = materialSnap.val();
                if (materialData) {
                    const _data: MaterialData = {
                        total: 0,
                        materialBreakdown: {} as MaterialData["materialBreakdown"],
                        machineBreakdown: {} as MaterialData["machineBreakdown"]
                    };
                    for (const data of Object.values(materialData || {})) {
                        for (const [_materialName, _machine] of Object.entries(data || {})) {
                            const materialName = _materialName as string;
                            const machine = _machine as any;
                            for (const [machineName, consumption] of Object.entries(machine || {})) {
                                if (!machines[machineName]) continue;
                                if (mySelectedFactory?.machines && !Object.values(mySelectedFactory?.machines || {}).includes(machineName)) continue;
                                if (_data.materialBreakdown[materialName] === undefined) _data.materialBreakdown[materialName] = 0;
                                _data.materialBreakdown[materialName] += consumption as number;
                                _data.total += consumption as number;
                                if (_data.machineBreakdown[machineName] === undefined) _data.machineBreakdown[machineName] = {};
                                const prevVal = _data.machineBreakdown[machineName][materialName]?.value || 0;
                                _data.machineBreakdown[machineName][materialName] = {
                                    name: machines[machineName],
                                    value: prevVal + (consumption as number)
                                }
                            }
                        }
                    }
                    if (_data.total > 0) dataToSet.materialData = _data;
                }
                const supervisors = {
                    A: {
                        name: new Set(),
                        time: new Set()
                    },
                    B: {
                        name: new Set(),
                        time: new Set()
                    },
                    C: {
                        name: new Set(),
                        time: new Set()
                    },
                }
                const mainData = mainSnap.val();
                if (mainData) {
                    const _data: DataToSet["mainElectricity"] = {
                        total: 0,
                        hours: [] as {
                            name: string,
                            value: number,
                            subName: string
                        }[],
                        days: [] as {
                            name: string,
                            value: number
                        }[],
                        insights: {
                            highest: {
                                time: "",
                                value: -Infinity
                            },
                            lowest: {
                                time: "",
                                value: Infinity
                            },
                            average: 0
                        }
                    };
                    for (const [date, __data] of Object.entries(mainData)) {
                        const data = __data as any;
                        let shiftData = shiftDatas[date];
                        data.total = 0;
                        for await (const _hour of Object.values(data?.hours || {})) {
                            const hour = _hour as any;
                            let start = timeToSec(hour?.time?.split(" - ")?.[0] || "00:00");
                            if (start < +shiftData.shift_a_start) start += 86400;
                            if (!isAllowedShiftHour(shiftData, start, allowedShifts)) continue;
                            data.total += hour.value;
                            _data.hours.push({
                                name: dayjs("1970-01-01 " + hour.time.split(" - ")[0]).format("ha"),
                                subName: dayjs(date as string).format("D MMM"),
                                value: hour.value
                            });
                        }
                        _data.total += data.total;
                        _data.days?.push({
                            name: dayjs(date).format("DD MMM, YYYY"),
                            value: data.total
                        });
                        if (data.total > _data.insights.highest.value) {
                            _data.insights.highest = {
                                time: dayjs(date).format("DD MMM, YYYY"),
                                value: data.total
                            }
                        }
                        if (data.total < _data.insights.lowest.value) {
                            _data.insights.lowest = {
                                time: dayjs(date).format("DD MMM, YYYY"),
                                value: data.total
                            }
                        }
                    }
                    _data.insights.average = (_data.total / (_data.days?.length || 0)) || 0;
                    dataToSet.mainElectricity = _data;
                }
                const factoryMachineTotals: {
                    [key: string]: {
                        shots: number,
                        production_meters: number,
                        production: number,
                        electricity: number,
                        material: number
                    }
                } = {};
                const machinesToSet: {
                    [key: string]: {
                        shots: number,
                        production_meters: number,
                        production: number,
                        electricity: number,
                        material: number,
                        ontime: number,
                        offtime: number,
                        idletime: number,
                        molds: {
                            [key: string]: {
                                ontime: number,
                                production_meters: number,
                                shots: number
                            }
                        }
                    }
                } = {};
                for (const machineID of Object.keys(machines)) {
                    if (mySelectedFactory?.machines && !Object.values(mySelectedFactory?.machines || {}).includes(machineID)) continue;
                    machinesToSet[machineID] = {
                        shots: 0,
                        production_meters: 0,
                        production: 0,
                        electricity: 0,
                        material: 0,
                        ontime: 0,
                        offtime: 0,
                        idletime: 0,
                        molds: {}
                    };
                }
                for await (const key of Object.keys(shiftDatas)) {
                    const date = key as string;
                    let shiftData = shiftDatas[date];
                    const data = datas[date];
                    if (!data) continue;
                    if (shiftData?.factories && mySelectedFactory) {
                        shiftData = {
                            ...shiftData,
                            ...shiftData.factories[selectedFactory.value]
                        }
                    } else if (mySelectedFactory === undefined && shiftData?.factories) {
                        const factory = { ...shiftData.factories[0] };
                        factory.supervisor_a = [];
                        factory.supervisor_b = [];
                        factory.supervisor_c = [];
                        for await (const f of Object.values(shiftData.factories) as any) {
                            factory.supervisor_a.push(f.supervisor_a);
                            factory.supervisor_b.push(f.supervisor_b);
                            factory.supervisor_c.push(f.supervisor_c);
                        }
                        factory.supervisor_a = factory.supervisor_a.join(", ");
                        factory.supervisor_b = factory.supervisor_b.join(", ");
                        factory.supervisor_c = factory.supervisor_c.join(", ");
                        shiftData = {
                            ...shiftData,
                            ...factory,
                        };
                    }
                    if (allowedShifts.includes("a")) {
                        supervisors.A.name.add(shiftData.supervisor_a?.toUpperCase() || "");
                    }
                    if (shiftData.shifts === 1) {
                        if (allowedShifts.includes("a")) {
                            supervisors.A.time.add(`${secondsToHourMin(+shiftData.shift_a_start || 0)} - ${secondsToHourMin(+shiftData.shift_a_start || 0)}`);
                        }
                    } else if (shiftData.shifts === 2) {
                        if (allowedShifts.includes("b")) {
                            if (dataToSet.shifts.B === null) dataToSet.shifts.B = {
                                shots: 0,
                                production_meters: 0,
                                production: 0,
                                electricity: 0,
                                material: 0,
                                timing: "",
                                supervisor: ""
                            };
                            supervisors.B.name.add(shiftData.supervisor_b?.toUpperCase() || "");
                            supervisors.B.time.add(`${secondsToHourMin(+shiftData.shift_b_start || 0)} - ${secondsToHourMin(+shiftData.shift_a_start || 0)}`);
                        }
                        if (allowedShifts.includes("a")) {
                            supervisors.A.time.add(`${secondsToHourMin(+shiftData.shift_a_start || 0)} - ${secondsToHourMin(+shiftData.shift_b_start || 0)}`);
                        }
                    } else {
                        if (allowedShifts.includes("b")) {
                            if (dataToSet.shifts.B === null) dataToSet.shifts.B = {
                                shots: 0,
                                production_meters: 0,
                                production: 0,
                                electricity: 0,
                                material: 0,
                                timing: "",
                                supervisor: ""
                            };
                            supervisors.B.name.add(shiftData.supervisor_b?.toUpperCase() || "");
                            supervisors.B.time.add(`${secondsToHourMin(+shiftData.shift_b_start || 0)} - ${secondsToHourMin(+shiftData.shift_c_start || 0)}`);
                        };
                        if (allowedShifts.includes("c")) {
                            if (dataToSet.shifts.C === null) dataToSet.shifts.C = {
                                shots: 0,
                                production_meters: 0,
                                production: 0,
                                electricity: 0,
                                material: 0,
                                timing: "",
                                supervisor: ""
                            };
                            supervisors.C.name.add(shiftData.supervisor_c?.toUpperCase() || "");
                            supervisors.C.time.add(`${secondsToHourMin(+shiftData.shift_c_start || 0)} - ${secondsToHourMin(+shiftData.shift_a_start || 0)}`);
                        };
                        if (allowedShifts.includes("a")) {
                            supervisors.A.time.add(`${secondsToHourMin(+shiftData.shift_a_start || 0)} - ${secondsToHourMin(+shiftData.shift_b_start || 0)}`);
                        }
                    }
                    const hour = {
                        shots: 0,
                        production_meters: 0,
                        production: 0,
                        electricity: 0,
                        material: 0,
                        timing: dayjs(date).format("DD MMM, YYYY"),
                    }
                    const _machines: {
                        [key: string]: MachineStats
                    } = {};
                    const _equipments: {
                        [key: string]: EquipmentStats
                    } = {};
                    const dailyShutdownByMachine: { [key: string]: number } = {};
                    for (const [machineID, _data] of Object.entries(machinesData)) {
                        if (!machinesToSet[machineID]) continue;
                        const data = (_data as any)?.[date] as any;
                        if (!data || typeof data !== "object") continue;
                        for (const [hourKey, _hour] of Object.entries(data as object)) {
                            const hour = _hour as any;
                            if (!hour) continue;
                            const start = normalizeHourStart(hour, shiftData, hourKey);
                            if (!allShifts && !isAllowedShiftHour(shiftData, start, allowedShifts)) continue;
                            machinesToSet[machineID].shots += (hour.shots || 0);
                            machinesToSet[machineID].production_meters += (hour.production_meters || 0);
                            machinesToSet[machineID].production += (hour.production || 0);
                            machinesToSet[machineID].electricity += (hour.electricity_usage || 0);
                            machinesToSet[machineID].material += (hour.material_usage || 0);
                            machinesToSet[machineID].ontime += (hour.ontime || 0);
                            machinesToSet[machineID].idletime += (hour.offtime || 0);
                            dailyShutdownByMachine[machineID] = (dailyShutdownByMachine[machineID] || 0) + (hour.shutdown_time || 0);
                            const moldName = (hour.mold_name || "UNSET").toString();
                            if (machinesToSet[machineID].molds[moldName] === undefined) {
                                machinesToSet[machineID].molds[moldName] = {
                                    ontime: 0,
                                    production_meters: 0,
                                    shots: 0
                                };
                            }
                            machinesToSet[machineID].molds[moldName].ontime += (hour.ontime || 0);
                            machinesToSet[machineID].molds[moldName].shots += (hour.shots || 0);
                            machinesToSet[machineID].molds[moldName].production_meters += (hour.production_meters || 0);
                        }
                    }
                    for (const machineID of Object.keys(machinesToSet)) {
                        const hourlyShut = dailyShutdownByMachine[machineID] || 0;
                        if (hourlyShut > 0) {
                            machinesToSet[machineID].offtime += hourlyShut;
                        } else {
                            machinesToSet[machineID].offtime += unitPowerOffAllowedShifts(date, shiftData, shiftData?.unit_power?.[machineUnits?.[machineID]?.unit || 1]?.sessions || [], allowedShifts);
                        }
                    }
                    for (let i = 1; i <= 24; i++) {
                        const hourData = data[i] as any;
                        if (!hourData) continue;
                        const _hour = {
                            shots: 0,
                            production_meters: 0,
                            production: 0,
                            electricity: 0,
                            material: 0,
                        }
                        const _start = +shiftData.shift_a_start + ((+i - 1) * 3600);
                        if (!allShifts && !isAllowedShiftHour(shiftData, _start, allowedShifts)) continue;
                        for await (const [key, val] of Object.entries(hourData?.machines || {})) {
                            if (!machines[key]) continue;
                            if (mySelectedFactory?.machines && !Object.values(mySelectedFactory?.machines || {}).includes(key)) continue;
                            const value = val as any;
                            const vShots = value.shots || 0;
                            const vProdMeters = value.production_meters || 0;
                            const vProd = value.production || 0;
                            const vElec = value.electricity_usage || 0;
                            const vMat = value.material_usage || 0;

                            hour.shots += vShots;
                            hour.production_meters += vProdMeters;
                            hour.production += vProd;
                            hour.electricity += vElec;
                            hour.material += vMat;
                            dataToSet.total.shots += vShots;
                            dataToSet.total.production_meters += vProdMeters;
                            dataToSet.total.production += vProd;
                            dataToSet.total.electricity += vElec;
                            dataToSet.total.material += vMat;
                            _hour.shots += vShots;
                            _hour.production_meters += vProdMeters;
                            _hour.production += vProd;
                            _hour.electricity += vElec;
                            _hour.material += vMat;

                            if (!factoryMachineTotals[key]) {
                                factoryMachineTotals[key] = {
                                    shots: 0,
                                    production_meters: 0,
                                    production: 0,
                                    electricity: 0,
                                    material: 0
                                };
                            }
                            factoryMachineTotals[key].shots += vShots;
                            factoryMachineTotals[key].production_meters += vProdMeters;
                            factoryMachineTotals[key].production += vProd;
                            factoryMachineTotals[key].electricity += vElec;
                            factoryMachineTotals[key].material += vMat;

                            if (_machines[key] === undefined) {
                                _machines[key] = {
                                    name: machines[key] || key,
                                    shots: vShots,
                                    production_meters: vProdMeters,
                                    production: vProd,
                                    electricity: vElec,
                                    material: vMat,
                                    avgCycletime: "",
                                    moldName: "",
                                    ontime: 0,
                                    idletime: 0,
                                    offtime: 0,
                                    plannedIdle: 0,
                                    plannedOff: 0,
                                    plannedDown: 0,
                                    unplannedIdle: 0,
                                    unplannedOff: 0,
                                    unplannedDown: 0,
                                    efficiency: 0
                                };
                            } else {
                                _machines[key].shots += vShots;
                                _machines[key].production_meters += vProdMeters;
                                _machines[key].production += vProd;
                                _machines[key].electricity += vElec;
                                _machines[key].material += vMat;
                            }
                        }
                        for await (const [key, val] of Object.entries(hourData?.equipments || {})) {
                            if (!equipments[key]) continue;
                            if (mySelectedFactory?.equipments && !Object.values(mySelectedFactory?.equipments || {}).includes(key)) continue;
                            const value = val as any;
                            const vElec = value.electricity_usage || 0;
                            hour.electricity += vElec;
                            dataToSet.total.electricity += vElec;
                            _hour.electricity += vElec;
                            if (_equipments[key] === undefined) {
                                _equipments[key] = {
                                    name: equipments[key],
                                    electricity: vElec,
                                }
                            } else {
                                _equipments[key].electricity += vElec;
                            }
                            if (dataToSet.equipments[key] === undefined) {
                                dataToSet.equipments[key] = {
                                    name: equipments[key],
                                    electricity: vElec,
                                }
                            } else {
                                dataToSet.equipments[key].electricity += vElec;
                            }
                        }
                        if (shiftData.shifts === 1) {
                            if (allowedShifts.includes("a")) {
                                (dataToSet.shifts.A as shifts).shots += _hour.shots;
                                (dataToSet.shifts.A as shifts).production += _hour.production;
                                (dataToSet.shifts.A as shifts).electricity += _hour.electricity;
                                (dataToSet.shifts.A as shifts).material += _hour.material;
                            }
                        } else if (shiftData.shifts === 2) {
                            if (_start < +shiftData.shift_b_start) {
                                if (allowedShifts.includes("a")) {
                                    (dataToSet.shifts.A as shifts).shots += _hour.shots;
                                    (dataToSet.shifts.A as shifts).production += _hour.production;
                                    (dataToSet.shifts.A as shifts).electricity += _hour.electricity;
                                    (dataToSet.shifts.A as shifts).material += _hour.material;
                                }
                            } else if (dataToSet.shifts.B) {
                                if (allowedShifts.includes("b")) {
                                    (dataToSet.shifts.B as shifts).shots += _hour.shots;
                                    (dataToSet.shifts.B as shifts).production += _hour.production;
                                    (dataToSet.shifts.B as shifts).electricity += _hour.electricity;
                                    (dataToSet.shifts.B as shifts).material += _hour.material;
                                }
                            }
                        } else {
                            if (_start < +shiftData.shift_b_start) {
                                if (allowedShifts.includes("a")) {
                                    (dataToSet.shifts.A as shifts).shots += _hour.shots;
                                    (dataToSet.shifts.A as shifts).production += _hour.production;
                                    (dataToSet.shifts.A as shifts).electricity += _hour.electricity;
                                    (dataToSet.shifts.A as shifts).material += _hour.material;
                                }
                            } else if (_start < +shiftData.shift_c_start && dataToSet.shifts.B) {
                                if (allowedShifts.includes("b")) {
                                    (dataToSet.shifts.B as shifts).shots += _hour.shots;
                                    (dataToSet.shifts.B as shifts).production += _hour.production;
                                    (dataToSet.shifts.B as shifts).electricity += _hour.electricity;
                                    (dataToSet.shifts.B as shifts).material += _hour.material;
                                }
                            } else if (dataToSet.shifts.C) {
                                if (allowedShifts.includes("c")) {
                                    (dataToSet.shifts.C as shifts).shots += _hour.shots;
                                    (dataToSet.shifts.C as shifts).production += _hour.production;
                                    (dataToSet.shifts.C as shifts).electricity += _hour.electricity;
                                    (dataToSet.shifts.C as shifts).material += _hour.material;
                                }
                            }
                        }
                    }
                    for await (const val of Object.values(_machines)) {
                        dataToSet.machineHours.push({
                            name: val.name,
                            shots: val.shots,
                            production_meters: val.production_meters,
                            production: val.production,
                            electricity: val.electricity,
                            material: val.material,
                            time: hour.timing
                        });
                    }
                    for await (const val of Object.values(_equipments)) {
                        dataToSet.equipmentHours.push({
                            name: val.name,
                            electricity: val.electricity,
                            time: hour.timing
                        });
                    }
                    dataToSet.hours.push({
                        electricity: hour.electricity,
                        material: hour.material,
                        production_meters: hour.production_meters,
                        production: hour.production,
                        shots: hour.shots,
                        time: hour.timing
                    });
                }

                for (const [key, fTotals] of Object.entries(factoryMachineTotals)) {
                    if (!machinesToSet[key]) continue;
                    if (machinesToSet[key].shots === 0 && fTotals.shots > 0) {
                        machinesToSet[key].shots = fTotals.shots;
                        machinesToSet[key].production = fTotals.production;
                        machinesToSet[key].production_meters = fTotals.production_meters;
                    }
                    if (machinesToSet[key].electricity === 0 && fTotals.electricity > 0) {
                        machinesToSet[key].electricity = fTotals.electricity;
                    }
                    if (machinesToSet[key].material === 0 && fTotals.material > 0) {
                        machinesToSet[key].material = fTotals.material;
                    }
                }

                const totalRejectedMap: { [key: string]: number } = {};
                await Promise.all(
                    Object.keys(machinesToSet).map(async (key) => {
                        const dateResults = await Promise.all(
                            Object.keys(shiftDatas).map((d) => fetchMachineRejectedPieces(key, d, allowedShifts))
                        );
                        totalRejectedMap[key] = dateResults.reduce((acc, curr) => acc + curr, 0);
                    })
                );
                const allMachinesRejectedMulti = Object.values(totalRejectedMap).reduce((a, b) => a + b, 0);
                dataToSet.total.production = Math.max(0, dataToSet.total.production - allMachinesRejectedMulti);

                for (const [key, machine] of Object.entries(machinesToSet)) {
                    const totalRejected = totalRejectedMap[key] || 0;
                    const cycleTimes: string[] = [];
                    const moldNames: string[] = [];
                    const moldEntries = Object.entries(machine.molds || {});
                    if (moldEntries.length > 0) {
                        for (const [mold, moldStats] of moldEntries) {
                            moldNames.push(mold.toUpperCase());
                            const mOntime = moldStats.ontime || 0;
                            const mCount = productionType === "meter" ? (moldStats.production_meters || 0) : (moldStats.shots || 0);
                            if (mCount > 0 && mOntime > 0) {
                                cycleTimes.push(`${+(mOntime / mCount).toFixed(0)}s`);
                            } else if (moldEntries.length === 1 && machine.shots > 0 && machine.ontime > 0) {
                                const denom = productionType === "meter" ? machine.production_meters : machine.shots;
                                cycleTimes.push(denom > 0 ? `${+(machine.ontime / denom).toFixed(0)}s` : "0s");
                            } else {
                                cycleTimes.push("0s");
                            }
                        }
                    } else if (machine.shots > 0 && machine.ontime > 0) {
                        const denom = productionType === "meter" ? machine.production_meters : machine.shots;
                        cycleTimes.push(denom > 0 ? `${+(machine.ontime / denom).toFixed(0)}s` : "0s");
                    }

                    const adjustedProduction = Math.max(0, machine.production - totalRejected);
                    const ontime = machine.ontime || 0;
                    const idletime = machine.idletime || 0;
                    const offtime = machine.offtime || 0;

                    const rawMachinePlanned = plannedTotals(
                        downtimeEntriesMulti.filter((e: DowntimeReasonEntry) => e.machineId === key),
                        undefined,
                        allowedShifts.map(s => s.toUpperCase() as ShiftKey)
                    );
                    const totalShiftCountMulti = +(shifts?.shifts || 3);
                    const shiftRatioMulti = totalShiftCountMulti > 0 ? Math.min(1, allowedShifts.length / totalShiftCountMulti) : 1;
                    const machineScheduleAllowanceSecMulti = resolveRangeAllowanceSec(
                        workSchedulesMulti[key],
                        dates[0],
                        dates[1],
                        shiftRatioMulti
                    );
                    const machinePlanned = reconcilePlannedDowntime(
                        rawMachinePlanned,
                        idletime,
                        offtime,
                        machineScheduleAllowanceSecMulti
                    );
                    const mTiming = computeTimingBreakdown(
                        ontime,
                        idletime,
                        offtime,
                        machinePlanned.idle,
                        machinePlanned.off,
                        !!offtimeBasedEfficiency,
                    );

                    dataToSet.machines[key] = {
                        name: machines[key] || key,
                        shots: machine.shots || 0,
                        production_meters: machine.production_meters || 0,
                        production: adjustedProduction,
                        electricity: machine.electricity || 0,
                        material: machine.material || 0,
                        avgCycletime: cycleTimes.length > 0 ? cycleTimes.join(", ") : "0s",
                        moldName: moldNames.length > 0 ? moldNames.join(", ") : "UNSET",
                        ontime,
                        idletime,
                        offtime,
                        plannedIdle: mTiming.plannedIdle,
                        plannedOff: mTiming.plannedOff,
                        plannedDown: mTiming.plannedTotal,
                        unplannedIdle: mTiming.unplannedIdle,
                        unplannedOff: mTiming.unplannedOff,
                        unplannedDown: mTiming.unplannedDown,
                        efficiency: mTiming.efficiency
                    };
                }
                dataToSet.machines = Object.fromEntries(
                    Object.entries(dataToSet.machines).sort((a, b) => machinesOrder.indexOf(a[0]) - machinesOrder.indexOf(b[0]))
                );
                dataToSet.fleetTiming = summarizeFleetTiming(
                    Object.values(dataToSet.machines),
                    !!offtimeBasedEfficiency,
                );

                if (allowedShifts.includes("a")) {
                    (dataToSet.shifts.A as shifts).supervisor = Array.from(supervisors.A.name).join(", ");
                    (dataToSet.shifts.A as shifts).timing = Array.from(supervisors.A.time).join(", ");
                }
                if (dataToSet.shifts.B) {
                    dataToSet.shifts.B.supervisor = Array.from(supervisors.B.name).join(", ");
                    dataToSet.shifts.B.timing = Array.from(supervisors.B.time).join(", ");
                }
                if (dataToSet.shifts.C) {
                    dataToSet.shifts.C.supervisor = Array.from(supervisors.C.name).join(", ");
                    dataToSet.shifts.C.timing = Array.from(supervisors.C.time).join(", ");
                }
            }
            return dataToSet;
        };
        buildRef.current = build;
        let cancelled = false;
        build(parameters.secondaryOption).then((res) => {
            if (!cancelled) setData(res);
        });
        return () => { cancelled = true; };
    }, [parameters, machinesOrder, machines, equipments, factories, selectedFactory, isSingleDay, offtimeBasedEfficiency, shifts, productionType]);

    // Toggling shifts refreshes only the Machine Total card, not the whole report
    useEffect(() => {
        if (activeKey === allKey) {
            setMachineCard(null);
            setIsMachineCardLoading(false);
            return;
        }
        if (!buildRef.current) return;
        let cancelled = false;
        setIsMachineCardLoading(true);
        buildRef.current(activeShifts).then((res) => {
            if (cancelled) return;
            if (res !== "NOT_FOUND") setMachineCard({ params: parameters, key: activeKey, machines: res.machines });
            setIsMachineCardLoading(false);
        }).catch((err) => {
            console.error(err);
            if (!cancelled) setIsMachineCardLoading(false);
        });
        return () => { cancelled = true; };
        // eslint-disable-next-line
    }, [activeKey, allKey, parameters, data]);

    const downloadPDF = async () => {
        if (data === null || data === "NOT_FOUND") return;
        setIsBusy(true);
        if (isSingleDay) {
            const tables = {} as {
                [key: string]: string[][]
            };
            const machineTable = [["Machine", "Mold", ...(productionType === "meter" ? [] : ["Shots"]), "Production", "Material Usage", "Electricity Usage", "Avg Cycletime", "ON Time", "Unplanned Down", "Planned", "Efficiency"]];
            const equipmentTable = [["Equipment", "Electricity Usage"]];
            const hoursTable = [["Time", ...(productionType === "meter" ? [] : ["Shots"]), "Production", "Material Usage", "Electricity Usage"]];
            for await (const stats of Object.values(data.machines)) {
                machineTable.push([
                    stats.name,
                    stats.moldName,
                    ...(productionType === "meter" ? [lengthFormatter(stats.production_meters)] : [numberFormatter(stats.shots, " shot(s)"),
                    numberFormatter(stats.production, " pc(s)")]),
                    weightFromatter(stats.material),
                    unitFormatter(stats.electricity),
                    stats.avgCycletime,
                    secFormatter(stats.ontime),
                    secFormatter(stats.unplannedDown),
                    secFormatter(stats.plannedDown),
                    `${stats.efficiency}%`
                ]);
            }
            for await (const stats of Object.values(data.equipments)) {
                equipmentTable.push([
                    stats.name,
                    unitFormatter(stats.electricity)
                ]);
            }
            for await (const hour of data.hours) {
                hoursTable.push([
                    hour.time,
                    ...(productionType === "meter" ? [lengthFormatter(hour.production_meters)] : [numberFormatter(hour.shots, " shot(s)"),
                    numberFormatter(hour.production, " pc(s)")]),
                    weightFromatter(hour.material),
                    unitFormatter(hour.electricity)
                ]);
            }
            tables["Each Machine's Report"] = machineTable;
            if (Object.keys(data.equipments).length !== 0) tables["Each Equipment's Report"] = equipmentTable;
            tables["Each Hour's Report"] = hoursTable;
            await landscapePDF({
                filename: `factory-report(${dayjs(parameters.date.from).format("DD-MM-YYYY")}).pdf`,
                headings: {
                    left: "Daily Production Report",
                    middle: `${companyName || "Unkown"} | ${shiftsTitle}`,
                    right: dayjs(parameters.date.from).format("D MMM YYYY")
                },
                stats: {
                    ...(productionType !== "meter" && { "SHOTS :": numberFormatter(data.total.shots, " shot(s)") }),
                    "PRODUCTION :": productionType === "meter" ? lengthFormatter(data.total.production_meters) : numberFormatter(data.total.production, " pc(s)"),
                    "MATERIAL USAGE :": weightFromatter(data.total.material),
                    "ELECTRICITY USAGE :": unitFormatter(data.total.electricity),
                    "ON TIME :": secFormatter(data.fleetTiming.ontime),
                    "UNPLANNED DOWN :": secFormatter(data.fleetTiming.unplannedDown),
                    "PLANNED DOWN :": secFormatter(data.fleetTiming.plannedTotal),
                    "EFFICIENCY :": `${data.fleetTiming.efficiency}%`,
                    "SUPERVISORS :": ((data.shifts.A !== null ? data.shifts.A.supervisor : "") + (data.shifts.B && "\n" + data.shifts.B.supervisor) + (data.shifts.C && "\n" + data.shifts.C.supervisor)).replaceAll("null", "").trim(),
                },
                tables
            });
        } else {
            const tables = {} as {
                [key: string]: string[][]
            };
            const machinesTable = [["Machine", "Mold", ...(productionType === "meter" ? [] : ["Shots"]), "Production", "Material Usage", "Electricity Usage", "Avg Cycletime", "ON Time", "Unplanned Down", "Planned", "Efficiency"]];
            const equipmentsTable = [["Equipment", "Electricity Usage"]];
            const daysTable = [["Date", ...(productionType === "meter" ? [] : ["Shots"]), "Production", "Material Usage", "Electricity Usage"]];
            for (const stats of Object.values(data.machines)) {
                machinesTable.push([
                    stats.name,
                    stats.moldName,
                    ...(productionType === "meter" ? [lengthFormatter(stats.production_meters)] : [numberFormatter(stats.shots, " shot(s)"),
                    numberFormatter(stats.production, " pc(s)")]),
                    weightFromatter(stats.material),
                    unitFormatter(stats.electricity),
                    stats.avgCycletime,
                    secFormatter(stats.ontime),
                    secFormatter(stats.unplannedDown),
                    secFormatter(stats.plannedDown),
                    `${stats.efficiency}%`
                ]);
            }
            for (const stats of Object.values(data.equipments)) {
                equipmentsTable.push([
                    stats.name,
                    unitFormatter(stats.electricity)
                ]);
            }
            for (const day of data.hours) {
                daysTable.push([
                    day.time,
                    ...(productionType === "meter" ? [lengthFormatter(day.production_meters)] : [numberFormatter(day.shots, " shot(s)"),
                    numberFormatter(day.production, " pc(s)")]),
                    weightFromatter(day.material),
                    unitFormatter(day.electricity)
                ]);
            }
            tables["Each Machine's Report"] = machinesTable;
            if (Object.keys(data.equipments).length !== 0) tables["Each Equipment's Report"] = equipmentsTable;
            tables["Each Day's Report"] = daysTable;
            await landscapePDF({
                filename: `factory-report(${dayjs(parameters.date.from).format("DD-MM-YYYY")} - ${dayjs(parameters.date.to).format("DD-MM-YYYY")}).pdf`,
                headings: {
                    left: "Production Report",
                    middle: `${companyName || "Unkown"} | ${shiftsTitle}`,
                    right: `${dayjs(parameters.date.from).format("D MMM YYYY")} - ${dayjs(parameters.date.to).format("D MMM YYYY")}`
                },
                stats: {
                    ...(productionType !== "meter" && { "SHOTS :": numberFormatter(data.total.shots, " shot(s)") }),
                    "PRODUCTION :": productionType === "meter" ? lengthFormatter(data.total.production_meters) : numberFormatter(data.total.production, " pc(s)"),
                    "MATERIAL USAGE :": weightFromatter(data.total.material),
                    "ELECTRICITY USAGE :": unitFormatter(data.total.electricity),
                    "ON TIME :": secFormatter(data.fleetTiming.ontime),
                    "UNPLANNED DOWN :": secFormatter(data.fleetTiming.unplannedDown),
                    "PLANNED DOWN :": secFormatter(data.fleetTiming.plannedTotal),
                    "EFFICIENCY :": `${data.fleetTiming.efficiency}%`,
                    "SUPERVISORS :": ((data.shifts.A !== null ? data.shifts.A.supervisor : "") + (data.shifts.B ? "\n" + data.shifts.B.supervisor : "") + (data.shifts.C ? "\n" + data.shifts.C.supervisor : "")).replaceAll("null", "").trim(),
                },
                tables
            });
        }
        setIsBusy(false);
    };
    const downloadExcel = async () => {
        try {
            if (data === null || data === "NOT_FOUND") return;
            setIsBusy(true);
            if (isSingleDay) {
                const sections = [] as ExcelSectionType[];
                const machineSection: ExcelSectionType = {
                    mainHeading: "Each Machine's Report",
                    subHeadings: ["Machine", "Mold", "Shots (shots)", `Production (${productionType === "meter" ? "meter" : "pcs"})`, "Material Usage (KGs)", "Electricity Usage (kWhr)", "Avg Cycletime (sec)", "ON Time", "Unplanned Idle", "Unplanned Off", "Planned", "Efficiency (%)"],
                    data: [] as ExcelSectionType['data'],
                    footer: ["Total", "", 0, 0, 0, 0, "", secFormatter(data.fleetTiming.ontime), secFormatter(data.fleetTiming.unplannedIdle), secFormatter(data.fleetTiming.unplannedOff), secFormatter(data.fleetTiming.plannedTotal), `${data.fleetTiming.efficiency}%`] as ExcelSectionType['footer']
                }
                const equipmentSection: ExcelSectionType = {
                    mainHeading: "Each Equipment's Report",
                    subHeadings: ["Equipment", "Electricity Usage (kWhr)"],
                    data: [] as ExcelSectionType['data'],
                    footer: ["Total", 0] as ExcelSectionType['footer']
                }
                const hoursSection: ExcelSectionType = {
                    mainHeading: "Each Hour's Report",
                    subHeadings: ["Time", "Shots (shots)", `Production (${productionType === "meter" ? "meter" : "pcs"})`, "Material Usage (KGs)", "Electricity Usage (kWhr)"],
                    data: [] as ExcelSectionType['data'],
                    footer: ["Total", 0, 0, 0, 0] as ExcelSectionType['footer']
                }
                for await (const stats of Object.values(data.machines)) {
                    (machineSection.footer[2] as number) += stats.shots;
                    (machineSection.footer[3] as number) += productionType === "meter" ? stats.production_meters : stats.production;
                    (machineSection.footer[4] as number) += stats.material;
                    (machineSection.footer[5] as number) += stats.electricity;
                    machineSection.data.push([
                        stats.name,
                        stats.moldName,
                        stats.shots,
                        productionType === "meter" ? stats.production_meters : stats.production,
                        +(stats.material / 1000).toFixed(2),
                        +(stats.electricity).toFixed(3),
                        stats.avgCycletime,
                        secFormatter(stats.ontime),
                        secFormatter(stats.unplannedIdle),
                        secFormatter(stats.unplannedOff),
                        secFormatter(stats.plannedDown),
                        stats.efficiency
                    ]);
                }
                machineSection.footer[4] = +(+machineSection.footer[4] / 1000).toFixed(2);
                machineSection.footer[5] = +(+machineSection.footer[5]).toFixed(3);
                for await (const stats of Object.values(data.equipments)) {
                    (equipmentSection.footer[1] as number) += stats.electricity;
                    equipmentSection.data.push([
                        stats.name,
                        +(stats.electricity).toFixed(3)
                    ]);
                }
                equipmentSection.footer[1] = unitFormatter(+equipmentSection.footer[1]);
                for await (const hour of data.hours) {
                    (hoursSection.footer[1] as number) += hour.shots;
                    (hoursSection.footer[2] as number) += productionType === "meter" ? hour.production_meters : hour.production;
                    (hoursSection.footer[3] as number) += hour.material;
                    (hoursSection.footer[4] as number) += hour.electricity;
                    hoursSection.data.push([
                        hour.time,
                        hour.shots,
                        productionType === "meter" ? hour.production_meters : hour.production,
                        +(hour.material / 1000).toFixed(2),
                        +(hour.electricity).toFixed(3)
                    ]);
                }
                hoursSection.footer[3] = +(+hoursSection.footer[3] / 1000).toFixed(2);
                hoursSection.footer[4] = +(+hoursSection.footer[4]).toFixed(3);
                sections.push(machineSection);
                if (Object.keys(data.equipments).length !== 0) sections.push(equipmentSection);
                sections.push(hoursSection);
                await excelDownload({
                    filename: `factory-report(${dayjs(parameters.date.from).format("DD-MM-YYYY")}).xlsx`,
                    heading: `Factory Report | ${shiftsTitle} (${dayjs(parameters.date.from).format("DD-MM-YYYY")})`,
                    sections,
                });
            } else {
                const sections = [] as ExcelSectionType[];
                const machinesSection: ExcelSectionType = {
                    mainHeading: "Each Machine's Report",
                    subHeadings: ["Machine", "Mold", "Shots (shots)", `Production (${productionType === "meter" ? "meter" : "pcs"})`, "Material Usage (KGs)", "Electricity Usage (kWhr)", "Avg Cycletime (sec)", "ON Time", "Unplanned Idle", "Unplanned Off", "Planned", "Efficiency (%)"],
                    data: [] as ExcelSectionType['data'],
                    footer: ["Total", "", 0, 0, 0, 0, "", secFormatter(data.fleetTiming.ontime), secFormatter(data.fleetTiming.unplannedIdle), secFormatter(data.fleetTiming.unplannedOff), secFormatter(data.fleetTiming.plannedTotal), `${data.fleetTiming.efficiency}%`] as ExcelSectionType['footer']
                }
                const equipmentsSection: ExcelSectionType = {
                    mainHeading: "Each Equipment's Report",
                    subHeadings: ["Equipment", "Electricity Usage (kWhr)"],
                    data: [] as ExcelSectionType['data'],
                    footer: ["Total", 0] as ExcelSectionType['footer']
                }
                const daysSection: ExcelSectionType = {
                    mainHeading: "Each Day's Report",
                    subHeadings: ["Date", "Shots (shots)", `Production (${productionType === "meter" ? "meter" : "pcs"})`, "Material Usage (KGs)", "Electricity Usage (kWhr)"],
                    data: [] as ExcelSectionType['data'],
                    footer: ["Total", 0, 0, 0, 0] as ExcelSectionType['footer']
                }
                for await (const stats of Object.values(data.machines)) {
                    (machinesSection.footer[2] as number) += stats.shots;
                    (machinesSection.footer[3] as number) += productionType === "meter" ? stats.production_meters : stats.production;
                    (machinesSection.footer[4] as number) += stats.material;
                    (machinesSection.footer[5] as number) += stats.electricity;
                    machinesSection.data.push([
                        stats.name,
                        stats.moldName,
                        stats.shots,
                        productionType === "meter" ? stats.production_meters : stats.production,
                        +(stats.material / 1000).toFixed(2),
                        +(stats.electricity).toFixed(3),
                        stats.avgCycletime,
                        secFormatter(stats.ontime),
                        secFormatter(stats.unplannedIdle),
                        secFormatter(stats.unplannedOff),
                        secFormatter(stats.plannedDown),
                        stats.efficiency
                    ]);
                }
                machinesSection.footer[4] = +(+machinesSection.footer[4] / 1000).toFixed(2);
                machinesSection.footer[5] = +(+machinesSection.footer[5]).toFixed(3);
                for await (const stats of Object.values(data.equipments)) {
                    (equipmentsSection.footer[1] as number) += stats.electricity;
                    equipmentsSection.data.push([
                        stats.name,
                        +(stats.electricity).toFixed(3)
                    ]);
                }
                equipmentsSection.footer[1] = +(+equipmentsSection.footer[1]).toFixed(3);
                for await (const day of data.hours) {
                    (daysSection.footer[1] as number) += day.shots;
                    (daysSection.footer[2] as number) += productionType === "meter" ? day.production_meters : day.production;
                    (daysSection.footer[3] as number) += day.material;
                    (daysSection.footer[4] as number) += day.electricity;
                    daysSection.data.push([
                        day.time,
                        day.shots,
                        productionType === "meter" ? day.production_meters : day.production,
                        +(day.material / 1000).toFixed(2),
                        +(day.electricity).toFixed(3)
                    ]);
                }
                daysSection.footer[3] = +(+daysSection.footer[3]).toFixed(2);
                daysSection.footer[4] = +(+daysSection.footer[4]).toFixed(3);
                sections.push(machinesSection);
                if (Object.keys(data.equipments).length !== 0) sections.push(equipmentsSection);
                sections.push(daysSection);
                await excelDownload({
                    filename: `factory-report(${dayjs(parameters.date.from).format("DD-MM-YYYY")} - ${dayjs(parameters.date.to).format("DD-MM-YYYY")}).xlsx`,
                    heading: `Factory Report | ${shiftsTitle} (${dayjs(parameters.date.from).format("DD-MM-YYYY")} - ${dayjs(parameters.date.to).format("DD-MM-YYYY")})`,
                    sections,
                });
            }
        } catch (err) {
            console.log(err);
            taost({
                title: "Error",
                description: "Something went wrong",
                status: "error",
                duration: 5000,
                isClosable: true,
            })
        }
        setIsBusy(false);
    };

    return <Flex gap={5} flexDir={"column"}>
        <Box display="flex" alignItems={"center"} justifyContent="space-between">
            <Text fontWeight={600}>Factory Report: <span style={{
                color: "var(--chakra-colors-primary)",
                fontWeight: 500,
                fontSize: "0.8rem"
            }}>{selectedTitle}</span></Text>
            <Stack
                alignItems={{
                    base: "flex-start",
                    sm: "center"
                }}
                gap={2}
                flexDir={{
                    base: "column",
                    sm: "row"
                }}>
                <MyPopover placement="bottom-end">
                    <Text userSelect={"none"} cursor={"pointer"} transition="all ease 0.2s" _hover={{
                        color: "primary"
                    }} fontWeight={600} fontSize="sm" display="flex" alignItems={"center"} justifyContent="space-between" gap={1} color="orange.300">
                        <FiDownload />
                        Download
                    </Text>
                    <Box>
                        <VStack w="100%" alignItems={"flex-start"}>
                            <Text onClick={() => { !isBusy && downloadPDF() }} userSelect={"none"} cursor={"pointer"} transition="all ease 0.2s" _hover={{
                                opacity: 1
                            }} fontWeight={600} fontSize="sm" display="flex" alignItems={"center"} justifyContent="space-between" gap={1} opacity="0.8">
                                <FaFilePdf />
                                Download PDF
                            </Text>
                            <Text onClick={() => { !isBusy && downloadExcel() }} userSelect={"none"} cursor={"pointer"} transition="all ease 0.2s" _hover={{
                                opacity: 1
                            }} fontWeight={600} fontSize="sm" display="flex" alignItems={"center"} justifyContent="space-between" gap={1} opacity="0.8">
                                <FaFileExcel />
                                Download Excel
                            </Text>
                        </VStack>
                    </Box>
                </MyPopover>
                <ConfirmDialog scope="danger" text="Are you sure you want to delete this report, All data related to this report will be deleted." onConfirm={() => {
                    taost({
                        title: "Unauthorized",
                        description: "You are not authorized to delete this report",
                        status: "error",
                        duration: 5000,
                        isClosable: true,
                    })
                }}>
                    <Text userSelect={"none"} cursor={"pointer"} transition="all ease 0.2s" _hover={{
                        color: "red"
                    }} fontWeight={600} fontSize="sm" display="flex" alignItems={"center"} justifyContent="space-between" gap={1} color="red.400">
                        <RiDeleteBin7Line />
                        Delete
                    </Text>
                </ConfirmDialog>
            </Stack>
        </Box>
        {data === null ?
            <MyCard as={Center} minH="50vh">
                <SmallFill />
            </MyCard> :
            data === "NOT_FOUND" ?
                <MyCard as={Center} minH="50vh">
                    <NotFound />
                </MyCard> :
                <Flex gap={5} flexDir="column">
                    <Factory isSingleDay={isSingleDay} data={data} />
                    {data.mainElectricity && <MainElectricity isSingleDay={isSingleDay} data={data.mainElectricity} />}
                    {data.materialData && <MaterialBreakdown data={data.materialData} />}
                    <Machine isSingleDay={isSingleDay} data={data} shiftOptions={parameters.secondaryOption} activeShifts={activeShifts} onToggleShift={toggleShift} machinesOverride={machineCard && machineCard.params === parameters && machineCard.key === activeKey ? machineCard.machines : undefined} isUpdating={isMachineCardLoading} dateFrom={parameters.date.from ? dayjs(parameters.date.from).format("YYYY-MM-DD") : undefined} dateTo={parameters.date.to ? dayjs(parameters.date.to).format("YYYY-MM-DD") : (parameters.date.from ? dayjs(parameters.date.from).format("YYYY-MM-DD") : undefined)} />
                    {Object.keys(data.equipments).length !== 0 && <Equipment isSingleDay={isSingleDay} data={data} />}
                </Flex>
        }
    </Flex>
}

export type { DataToSet, MachineStats, EquipmentStats, Hours, MachineHours, shifts, SimpleStats, EquipmentHours, MainData, MaterialData }
export default FactoryReport
