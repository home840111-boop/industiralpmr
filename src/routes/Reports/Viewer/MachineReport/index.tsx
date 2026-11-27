import {
    useToast,
    Box,
    Text,
    VStack,
    useDisclosure,
    Center,
    Flex,
    Stack,
    Badge
} from "@chakra-ui/react";
import dayjs from "../../../../Components/Functions/dayjs";
import { useEffect, useMemo, useState } from "react"
import { FaFileExcel, FaFilePdf } from "react-icons/fa"
import { FiDownload } from "react-icons/fi"
import { RiDeleteBin7Line } from "react-icons/ri"
import { get } from "../../../../Components/firebase/api/db"
import { SmallFill } from "../../../../Components/Loaders"
import MyCard from "../../../../Components/micro/Card"
import ConfirmDialog from "../../../../Components/micro/ConfirmDialog"
import MyPopover from "../../../../Components/micro/MyPopover"
import NotFound from "../../../../Components/micro/NotFound"
import { factoriesAtom, factoryProductionAtom, offtimeBasedEfficiencyAtom, selectedFactoryAtom, shiftsAtom, uidAtom } from "../../../../Components/Store/atoms"
import Get from "../../../../Components/Store/hooks/Get"
import { Option, ReportSubmitType } from "../../Selector/types"
import { Hours, shifts, SimpleStats } from "../FactoryReport"
import MachineTotal from "./MachineTotal"
import secondsToHourMin from "../../../../Components/Functions/converters/secondsToHourMin"
import insertUnitOffSessions from "../../../../Components/Functions/formatters/insertUnitOffSessions"
import secToTime from "../../../../Components/Functions/converters/secondsToHourMin"
import { Insigts, SortedHourTree } from "../../../Machines/Machine/types"
import sortHourlyTree from "../../../../Components/Functions/formatters/hourlyTree"
import HourlyBreakdown from "../../../Machines/Machine/HourlyBreakdown"
import InsightsAndMold from "./InsightsAndMold"
import { endAt, orderByKey, query, ref, startAt, get as firebaseGet } from "firebase/database"
import { MaterialBreakdown as MaterialBreakdownType } from "../../../Machines/Machine/types"
import store from "../../../../Components/Store"
import { db } from "../../../../Components/firebase"
import numberFormatter from "../../../../Components/Functions/formatters/numberFormatter"
import weightFormatter from "../../../../Components/Functions/formatters/weightFormatter"
import unitFormatter from "../../../../Components/Functions/formatters/unitFormatter"
import secFormatter from "../../../../Components/Functions/formatters/secFormatter"
import landscapePDF from "../../../../Components/Exporters/landscapePDF"
import excelDownload, { ExcelSectionType } from "../../../../Components/Exporters/excelDownload"
import isAllowedShiftHour from "../../../../Components/Functions/isAllowedShiftHour"
import unitPowerOffAllowedShifts from "../../../../Components/Functions/unitPowerOffAllowedShifts"
import lengthFormatter from "../../../../Components/Functions/formatters/lengthFormatter"
import { MdOutlineBrokenImage } from "react-icons/md";
import hourlyTimeFixer from "../../../../Components/Functions/formatters/hourlyTimeFixer";
import DowntimeReport from "./Downtime";
import useDowntimeReasons from "./Downtime/useDowntimeReasons";
import { buildDowntimeSegments, DowntimeSegment, plannedTotals, ShiftKey } from "./Downtime/types";
import { allocateShiftPlannedDowntime, computeTimingBreakdown, reconcilePlannedDowntime, useWorkSchedules } from "../../../../Services/workSchedule";
import UpdateRejectedPiecesModal from './UpdateRejectedPiecesModal';

import { TbBug } from "react-icons/tb";
import hourlyArtificialOfftimeFixer from "../../../../Components/Functions/formatters/hourlyArtificialOfftimeFixer";
import { dbSchemaRecord } from "../../../Machines/Machine/Power/types";
import PhaseReportSection from "./PhaseReportSection";
import { transformDailyData } from "../../../../Components/Functions/powerTransformers";

const adjustPF = (pf: any) => {
    if (!pf) return null;
    if (pf.lag_min !== undefined || pf.lead_min !== undefined) {
        return {
            min: pf.lead_min !== undefined ? Math.abs(pf.lead_min) : 0,
            max: pf.lag_min !== undefined ? Math.abs(pf.lag_min) : 0,
            avg: pf.avg !== undefined ? Math.abs(pf.avg) : 0,
        };
    }
    return pf;
};

interface Stats extends SimpleStats {
    ontime: number;
    idletime: number;
    offtime: number;
    idle_electricity: number,
};
type MoldStats = Omit<Stats, "offtime">;
interface Mold {
    stats: MoldStats,
    details: {
        cavities: number,
        material: string,
        material2: string,
        multiComponent: boolean,
        product: string,
        productColor: string,
        productWeight: number,
        productWeight2: number,
        materials?: {
            name: string,
            weight: number,
            pc_weight: number | null
        }[]
    },
    rejected?: {
        pieces: number;
        reason: string;
    }
};
interface MyHour extends Hours {
    ontime: number;
    idletime: number;
}
interface AllHour {
    status: boolean;
    electricity_usage: number;
    production_meters: number;
    from: number;
    time: number;
    material_usage: number;
    mold_name: string;
    operator: string;
    production: number;
    shots: number;
    offtime: number;
    ontime: number;
    shutdown_time: number;
    phase_values?: dbSchemaRecord | null;
}
interface ShiftStats extends shifts {
    ontime: number;
    idletime: number;
    offtime?: number;
};
interface AllDay {
    date: string,
    shots: number,
    production_meters: number,
    production: number,
    material: number,
    electricity: number,
    idle_electricity: number,
    ontime: number,
    idletime: number,
    offtime: number,
    operators: string,
    molds: string,
    phase_values?: dbSchemaRecord | null;
}
interface DataToSet {
    total: Stats,
    shifts: {
        A: ShiftStats | null,
        B: ShiftStats | null,
        C: ShiftStats | null
    },
    molds: {
        [moldName: string]: Mold
    }
    hours: MyHour[],
    allHours: AllHour[],
    tree: SortedHourTree[],
    allDays: AllDay[],
    insights: Insigts,
    materialBreakdown: MaterialBreakdownType
    rejectedPieces?: {
        pieces: number;
        reason: string;
    } | null;
    completed?: boolean;
    moldsByShift?: {
        A: Record<string, number>;
        B: Record<string, number>;
        C: Record<string, number>;
    };
    phase_values?: dbSchemaRecord | null;
    downtimeSegments?: DowntimeSegment[];
}

interface RawDataType {
    [path: string]: any
}

const MachineReport = ({
    parameters
}: {
    parameters: ReportSubmitType["machine"]
}) => {
    const toast = useToast();
    const [rawData, setRawData] = useState<null | RawDataType>(null);
    const [data, setData] = useState<null | DataToSet | "NOT_FOUND">(null);
    const [isBusy, setIsBusy] = useState(false);
    const factories = Get(factoriesAtom);
    const selectedFactory = Get(selectedFactoryAtom);
    const isSingleDay = useMemo(() => {
        const isSingleDay = dayjs(parameters.date.from).isSame(parameters.date.to, "day");
        return isSingleDay;
    }, [parameters]);
    const machineNames = useMemo(() => {
        if (parameters.option === null) return "";
        if (!Array.isArray(parameters.option)) return parameters.option?.label;
        return parameters.option?.map((option) => option.label).join(", ");
    }, [parameters]);
    const shifts = Get(shiftsAtom);
    const productionType = Get(factoryProductionAtom);
    const shiftsTitle = useMemo(() => {
        if (!shifts) return "";
        if (shifts.shifts === parameters.secondaryOption.length) return "All Shifts";
        return "Shift " + parameters.secondaryOption.map((option) => option.label).join(", ");
    }, [parameters, shifts]);
    const selectedTitle = useMemo(() => {
        if (parameters.date.from?.toDateString() === parameters.date.to?.toDateString()) return `${machineNames} | ${shiftsTitle} | ` + dayjs(parameters.date.from).format("DD MMM, YY");
        return `${machineNames} | ${shiftsTitle} | ${dayjs(parameters.date.from).format("DD MMM, YY")} - ${dayjs(parameters.date.to).format("DD MMM, YY")}`;
    }, [parameters, machineNames, shiftsTitle]);
    const { isOpen, onOpen, onClose } = useDisclosure();
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const downtimeMachineIds = useMemo(() => {
        if (!parameters.option) return [] as string[];
        if (!Array.isArray(parameters.option)) return [parameters.option.value];
        return parameters.option.map((option) => option.value);
    }, [parameters.option]);
    const downtimeFrom = parameters.date.from ? dayjs(parameters.date.from).format("YYYY-MM-DD") : null;
    const downtimeTo = parameters.date.to ? dayjs(parameters.date.to).format("YYYY-MM-DD") : downtimeFrom;
    const downtimeShifts = useMemo(
        () => parameters.secondaryOption.map((option) => option.value.toUpperCase() as ShiftKey),
        [parameters.secondaryOption]
    );
    const { entries: downtimeEntries, loading: downtimeLoading, upsert: upsertDowntime } = useDowntimeReasons(downtimeMachineIds, downtimeFrom, downtimeTo);
    const offtimeBasedEfficiency = !!Get(offtimeBasedEfficiencyAtom);
    const { getRangeAllowanceSec } = useWorkSchedules();
    const downtimeSegments = data && data !== "NOT_FOUND" ? data.downtimeSegments : undefined;
    const totalShiftCount = shifts?.shifts || 3;
    const shiftRatio = totalShiftCount > 0 ? Math.min(1, downtimeShifts.length / totalShiftCount) : 1;
    const scheduleAllowanceSec = useMemo(
        () => getRangeAllowanceSec(downtimeMachineIds, downtimeFrom, downtimeTo, shiftRatio),
        [getRangeAllowanceSec, downtimeMachineIds, downtimeFrom, downtimeTo, shiftRatio]
    );
    // planned downtime is excluded from the efficiency of the machine (auto-reconciled with weekly work schedule allowance)
    const plannedDowntime = useMemo(() => {
        const rawClaimed = plannedTotals(downtimeEntries, downtimeSegments, downtimeShifts);
        if (!data || data === "NOT_FOUND") return rawClaimed;
        return reconcilePlannedDowntime(
            rawClaimed,
            data.total.idletime || 0,
            data.total.offtime || 0,
            scheduleAllowanceSec
        );
    }, [downtimeEntries, downtimeSegments, downtimeShifts, data, scheduleAllowanceSec]);
    const shiftPlannedDowntime = useMemo(() => {
        const empty = { A: { idle: 0, off: 0 }, B: { idle: 0, off: 0 }, C: { idle: 0, off: 0 } };
        if (!data || data === "NOT_FOUND") return empty;
        const claimedByShift = {
            A: downtimeShifts.includes("A") ? plannedTotals(downtimeEntries, downtimeSegments, ["A"]) : { idle: 0, off: 0 },
            B: downtimeShifts.includes("B") ? plannedTotals(downtimeEntries, downtimeSegments, ["B"]) : { idle: 0, off: 0 },
            C: downtimeShifts.includes("C") ? plannedTotals(downtimeEntries, downtimeSegments, ["C"]) : { idle: 0, off: 0 },
        };
        return allocateShiftPlannedDowntime(data.shifts, claimedByShift, scheduleAllowanceSec);
    }, [downtimeEntries, downtimeSegments, downtimeShifts, data, scheduleAllowanceSec]);
    const machineTiming = useMemo(() => {
        if (!data || data === "NOT_FOUND") {
            return computeTimingBreakdown(0, 0, 0, 0, 0, offtimeBasedEfficiency);
        }
        return computeTimingBreakdown(
            data.total.ontime || 0,
            data.total.idletime || 0,
            data.total.offtime || 0,
            plannedDowntime.idle,
            plannedDowntime.off,
            offtimeBasedEfficiency
        );
    }, [data, plannedDowntime, offtimeBasedEfficiency]);
    const displayTree = useMemo(() => {
        if (!data || data === "NOT_FOUND" || !data.tree) return [];
        if (!downtimeEntries || Object.keys(downtimeEntries).length === 0) return data.tree;

        const entriesList = Object.values(downtimeEntries);
        if (entriesList.length === 0) return data.tree;

        const dateStr = downtimeFrom || dayjs().format("YYYY-MM-DD");
        const dayStartUnix = dayjs(`${dateStr} 00:00:00`).unix();

        const getReasonForRange = (startSec: number, endSec: number) => {
            const matches = entriesList.filter(e => {
                const eStart = typeof e.from === "number" ? e.from : (typeof e.start === "number" ? e.start - dayStartUnix : 0);
                const eEnd = typeof (e as any).time === "number" ? (e as any).time : (typeof e.to === "number" ? e.to : (typeof e.end === "number" ? e.end - dayStartUnix : eStart + (e.duration || 3600)));
                const overlapsDirect = eStart < endSec && eEnd > startSec;
                const overlapsWrapped = (eStart + 86400) < endSec && (eEnd + 86400) > startSec;
                const overlapsUnwrapped = (eStart - 86400) < endSec && (eEnd - 86400) > startSec;
                return overlapsDirect || overlapsWrapped || overlapsUnwrapped;
            });
            if (matches.length === 0) return null;

            const catMap = new Map<string, { category: string; scheduled: boolean; notes: string[] }>();
            for (const m of matches) {
                const cat = (m.category || "uncategorized").trim();
                const key = cat.toLowerCase();
                const existing = catMap.get(key);
                if (!existing) {
                    catMap.set(key, { category: cat, scheduled: !!m.scheduled, notes: m.note ? [m.note] : [] });
                } else {
                    if (m.scheduled) existing.scheduled = true;
                    if (m.note && !existing.notes.includes(m.note)) existing.notes.push(m.note);
                }
            }
            let items = Array.from(catMap.values());
            if (items.length > 1 && items.some(it => it.category.toLowerCase() !== "uncategorized")) {
                items = items.filter(it => it.category.toLowerCase() !== "uncategorized");
            }
            return {
                downtimeReason: items.map(it => `${it.category.toUpperCase()}${it.scheduled ? " (Planned)" : ""}`).join(", "),
                downtimeCategory: items.map(it => it.category.toUpperCase()).join(", "),
                isPlanned: items.some(it => it.scheduled),
                downtimeNote: items.flatMap(it => it.notes).join("; ")
            };
        };

        return data.tree.map(shiftNode => {
            const updatedChildren = shiftNode.children?.map(hourNode => {
                const hTimes = hourNode.data.time.split("-").map(t => t.trim());
                const startM = dayjs(`${dateStr} ${hTimes[0]}`);
                const endM = dayjs(`${dateStr} ${hTimes[1]}`);
                let hStart = startM.isValid() ? startM.hour() * 3600 + startM.minute() * 60 : 0;
                let hEnd = endM.isValid() ? endM.hour() * 3600 + endM.minute() * 60 : 0;
                if (hEnd <= hStart) hEnd += 86400;

                const matched = getReasonForRange(hStart, hEnd);
                const hourHasDowntime = Boolean(
                    (hourNode.data.idletime && hourNode.data.idletime !== "0s") ||
                    (hourNode.data.offtime && hourNode.data.offtime !== "0s")
                );

                const updatedSubChildren = hourNode.children?.map(sub => {
                    const sTimes = sub.data.time.split("-").map(t => t.trim());
                    const sStartM = dayjs(`${dateStr} ${sTimes[0]}`);
                    const sEndM = dayjs(`${dateStr} ${sTimes[1]}`);
                    let sStart = sStartM.isValid() ? sStartM.hour() * 3600 + sStartM.minute() * 60 : 0;
                    let sEnd = sEndM.isValid() ? sEndM.hour() * 3600 + sEndM.minute() * 60 : 0;
                    if (sEnd <= sStart) sEnd += 86400;
                    const subMatched = getReasonForRange(sStart, sEnd);
                    const subHasDt = Boolean(
                        (sub.data.idletime && sub.data.idletime !== "0s") ||
                        (sub.data.offtime && sub.data.offtime !== "0s")
                    );
                    return {
                        ...sub,
                        data: {
                            ...sub.data,
                            downtimeReason: !subHasDt ? "-" : (subMatched?.downtimeReason || "UNCATEGORIZED"),
                            downtimeCategory: !subHasDt ? "-" : (subMatched?.downtimeCategory || "UNCATEGORIZED"),
                            isPlanned: !subHasDt ? false : subMatched?.isPlanned,
                            downtimeNote: !subHasDt ? "" : (subMatched?.downtimeNote || "")
                        }
                    };
                });

                return {
                    ...hourNode,
                    data: {
                        ...hourNode.data,
                        downtimeReason: !hourHasDowntime ? "-" : (matched?.downtimeReason || "UNCATEGORIZED"),
                        downtimeCategory: !hourHasDowntime ? "-" : (matched?.downtimeCategory || "UNCATEGORIZED"),
                        isPlanned: !hourHasDowntime ? false : matched?.isPlanned,
                        downtimeNote: !hourHasDowntime ? "" : (matched?.downtimeNote || "")
                    },
                    children: updatedSubChildren
                };
            });

            const shiftHasDt = Boolean(
                (shiftNode.data.idletime && shiftNode.data.idletime !== "0s") ||
                (shiftNode.data.offtime && shiftNode.data.offtime !== "0s")
            );
            const allHourReasons = updatedChildren?.map(h => h.data.downtimeCategory).filter(c => c && c !== "-" && c !== "UNCATEGORIZED") || [];
            const uniqueShiftCats = Array.from(new Set(allHourReasons));

            return {
                ...shiftNode,
                data: {
                    ...shiftNode.data,
                    downtimeReason: !shiftHasDt ? "-" : (uniqueShiftCats.length > 0 ? uniqueShiftCats.join(", ") : "UNCATEGORIZED"),
                    downtimeCategory: !shiftHasDt ? "-" : (uniqueShiftCats.join(", ") || "UNCATEGORIZED"),
                    isPlanned: !shiftHasDt ? false : updatedChildren?.some(h => h.data.isPlanned)
                },
                children: updatedChildren
            };
        });
    }, [data, downtimeEntries, downtimeFrom]);

    useEffect(() => {
        if (!factories || !selectedFactory || !shifts) return;
        const func = async () => {
            setData(null);
            setRawData(null);
            const allowedShifts = parameters.secondaryOption.map((option) => option.value) as ("a" | "b" | "c")[];
            const allShifts = shifts.shifts === 1 ? allowedShifts.includes("a") : shifts.shifts === 2 ? allowedShifts.includes("a") && allowedShifts.includes("b") : allowedShifts.includes("a") && allowedShifts.includes("b") && allowedShifts.includes("c");
            const mySelectedFactory = factories[selectedFactory.value];
            const isSingleMachine = !Array.isArray(parameters.option);
            const dataToSet: DataToSet = {
                total: {
                    shots: 0,
                    production_meters: 0,
                    production: 0,
                    material: 0,
                    electricity: 0,
                    idle_electricity: 0,
                    idletime: 0,
                    offtime: 0,
                    ontime: 0
                },
                shifts: {
                    A: allowedShifts.includes("a") ? {
                        shots: 0,
                        production_meters: 0,
                        production: 0,
                        material: 0,
                        electricity: 0,
                        ontime: 0,
                        idletime: 0,
                        offtime: 0,
                        supervisor: "",
                        timing: ""
                    } : null,
                    B: null,
                    C: null
                },
                molds: {},
                hours: [] as MyHour[],
                allHours: [] as AllHour[],
                allDays: [] as AllDay[],
                tree: [] as SortedHourTree[],
                insights: {
                    materialPerUnit: 0,
                    productionPerUnit: 0,
                    shotsPerUnit: 0,
                    unitsPerGram: 0,
                    unitsPerPiece: 0,
                    unitsPerShot: 0,
                    consumptionPerKg: 0,
                    materialPerShot: 0,
                },
                materialBreakdown: {} as MaterialBreakdownType,
                rejectedPieces: null,
                completed: false,
                moldsByShift: {
                    A: {},
                    B: {},
                    C: {}
                }
            };

            const machine = parameters.option && !Array.isArray(parameters.option) ? parameters.option.value : "";
            if (isSingleDay) {
                const date = dayjs(parameters.date.from).format("YYYY-MM-DD");
                if (isSingleMachine) {
                    const [machineUnitSnap, shiftSnap, dailySnap, hourlySnap] = await Promise.all([
                        get(`machines/${machine}/unit`),
                        get(`reports/factory/daily/${date}`),
                        get(`reports/machines/${machine}/daily/${date}`),
                        get(`reports/machines/${machine}/hourly/${date}`),
                    ]);
                    const unit = machineUnitSnap.val() || 1;
                    const hasUnitPower = !!(shiftSnap.exists() && shiftSnap.val()?.unit_power?.[unit]);
                    if (!shiftSnap.exists() || (!dailySnap.exists() && !hourlySnap.exists() && !hasUnitPower)) {
                        setData("NOT_FOUND");
                        return;
                    }
                    let shiftData = shiftSnap.val();
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
                    const dailyData = dailySnap.val() || {
                        completed: false,
                        total: {
                            electricity_usage: 0,
                            material_usage: 0,
                            offtime: 0,
                            ontime: 0,
                            production: 0,
                            production_meters: 0,
                            shots: 0,
                            operators: {}
                        },
                        molds: {}
                    };
                    dataToSet.completed = dailyData.completed || false;
                    if (dailyData?.phase_values) {
                        dataToSet.phase_values = transformDailyData(dailyData.phase_values, true) as any;
                    }
                    // if (dailyData.total.rejected) {
                    //     dataToSet.rejectedPieces = dailyData.total.rejected;
                    // }
                    const hourlyDataRaw = hourlySnap.val() || {};
                    setRawData({
                        [`machines/${machine}/unit`]: unit,
                        [`reports/factory/daily/${date}`]: shiftData,
                        [`reports/machines/${machine}/daily/${date}`]: dailyData,
                        [`reports/machines/${machine}/hourly/${date}`]: hourlyDataRaw
                    });
                    let totalRejectedPieces = 0;
                    let rejectedReasons: string[] = [];

                    for (const option of parameters.secondaryOption) {
                        const shiftKey = option.value.toUpperCase();

                        if (dailyData.total?.operators?.[shiftKey]?.rejected) {
                            const rejectedData = dailyData.total.operators[shiftKey].rejected;
                            totalRejectedPieces += rejectedData.pieces || 0;
                            if (rejectedData.molds) {
                                Object.entries(rejectedData.molds).forEach(([moldName, moldData]: [string, any]) => {
                                    if (moldData.pieces > 0) {
                                        rejectedReasons.push(`Shift ${shiftKey}: ${moldName} (${moldData.pieces} pcs): ${moldData.reason}`);
                                    }
                                });
                            } else if (rejectedData.reason && rejectedData.reason !== "No reason provided") {
                                rejectedReasons.push(`Shift ${shiftKey}: ${rejectedData.reason}`);
                            }
                        }
                    }

                    if (totalRejectedPieces > 0) {
                        dataToSet.rejectedPieces = {
                            pieces: totalRejectedPieces,
                            reason: rejectedReasons.length > 0 ? rejectedReasons.join("; ") : "No reason provided"
                        };
                    } else {
                        dataToSet.rejectedPieces = null;
                    }
                    let hourlyData = Object.fromEntries(Object.entries(hourlyDataRaw).filter(([key, val]) => {
                        const start = (val as any).from as number;
                        return isAllowedShiftHour(shiftData, start - 60, allowedShifts);
                    })) as any;

                    if (allowedShifts.includes("a")) {
                        const operatorNames = Object.keys(dailyData?.total?.operators?.A || {})
                            .filter(name => name !== "rejected" && !name.includes("rejected") && name !== "null" && name !== "undefined" && name.trim() !== "")
                            .filter((name, index, arr) => arr.indexOf(name) === index)
                            .join(", ") || "";
                        (dataToSet.shifts.A as ShiftStats).supervisor = operatorNames;
                    }
                    if (shiftData.shifts === 1) {
                        if (allowedShifts.includes("a")) {
                            (dataToSet.shifts.A as ShiftStats).timing = `${secondsToHourMin(+shiftData.shift_a_start || 0)} - ${secondsToHourMin(+shiftData.shift_a_start || 0)}`
                        }
                    } else if (shiftData.shifts === 2) {
                        if (allowedShifts.includes("b")) {
                            dataToSet.shifts.B = {
                                shots: 0,
                                production_meters: 0,
                                production: 0,
                                electricity: 0,
                                material: 0,
                                ontime: 0,
                                idletime: 0,
                                offtime: 0,
                                timing: "",
                                supervisor: ""
                            };
                            const operatorNames = Object.keys(dailyData?.total?.operators?.B || {})
                                .filter(name => name !== "rejected" && !name.includes("rejected") && name !== "null" && name !== "undefined" && name.trim() !== "")
                                .filter((name, index, arr) => arr.indexOf(name) === index)
                                .join(", ") || "";
                            (dataToSet.shifts.B as ShiftStats).supervisor = operatorNames;
                            dataToSet.shifts.B.timing = `${secondsToHourMin(+shiftData.shift_b_start || 0)} - ${secondsToHourMin(+shiftData.shift_a_start || 0)}`
                        }
                        if (allowedShifts.includes("a")) {
                            (dataToSet.shifts.A as ShiftStats).timing = `${secondsToHourMin(+shiftData.shift_a_start || 0)} - ${secondsToHourMin(+shiftData.shift_b_start || 0)}`
                        }
                    } else {
                        if (allowedShifts.includes("b")) {
                            dataToSet.shifts.B = {
                                shots: 0,
                                production: 0,
                                production_meters: 0,
                                electricity: 0,
                                material: 0,
                                ontime: 0,
                                idletime: 0,
                                offtime: 0,
                                timing: "",
                                supervisor: ""
                            };
                            const operatorNames = Object.keys(dailyData?.total?.operators?.B || {})
                                .filter(name => name !== "rejected" && !name.includes("rejected") && name !== "null" && name !== "undefined" && name.trim() !== "")
                                .filter((name, index, arr) => arr.indexOf(name) === index)
                                .join(", ") || "";
                            (dataToSet.shifts.B as ShiftStats).supervisor = operatorNames;
                            dataToSet.shifts.B.timing = `${secondsToHourMin(+shiftData.shift_b_start || 0)} - ${secondsToHourMin(+shiftData.shift_c_start || 0)}`
                        };
                        if (allowedShifts.includes("c")) {
                            dataToSet.shifts.C = {
                                shots: 0,
                                production_meters: 0,
                                production: 0,
                                electricity: 0,
                                material: 0,
                                ontime: 0,
                                idletime: 0,
                                offtime: 0,
                                timing: "",
                                supervisor: ""
                            };
                            const operatorNames = Object.keys(dailyData?.total?.operators?.C || {})
                                .filter(name => name !== "rejected" && !name.includes("rejected") && name !== "null" && name !== "undefined" && name.trim() !== "")
                                .filter((name, index, arr) => arr.indexOf(name) === index)
                                .join(", ") || "";
                            (dataToSet.shifts.C as ShiftStats).supervisor = operatorNames;
                            dataToSet.shifts.C.timing = `${secondsToHourMin(+shiftData.shift_c_start || 0)} - ${secondsToHourMin(+shiftData.shift_a_start || 0)}`
                        };
                        if (allowedShifts.includes("a")) {
                            (dataToSet.shifts.A as ShiftStats).timing = `${secondsToHourMin(+shiftData.shift_a_start || 0)} - ${secondsToHourMin(+shiftData.shift_b_start || 0)}`
                        }
                    }
                    dataToSet.total = {
                        shots: 0,
                        production_meters: 0,
                        production: 0,
                        electricity: 0,
                        idle_electricity: 0,
                        material: 0,
                        ontime: 0,
                        idletime: 0,
                        offtime: unitPowerOffAllowedShifts(date, shiftData, shiftData?.unit_power?.[unit]?.sessions || {}, allowedShifts),
                    }
                    const molds: {
                        [key: string]: {
                            electricity: number;
                            idletime: number;
                            ontime: number;
                            material: number;
                            production: number;
                            production_meters: number;
                            shots: number;
                        }
                    } = {};
                    const moldsByShift: {
                        A: Record<string, number>;
                        B: Record<string, number>;
                        C: Record<string, number>;
                    } = {
                        A: {},
                        B: {},
                        C: {}
                    };
                    const shifts = {
                        A: shiftData.shift_a_start,
                        B: shiftData.shift_b_start,
                        C: shiftData.shift_c_start,
                        shifts: shiftData.shifts
                    }
                    const rawHours = Object.values(hourlyData || {});
                    const hours: {
                        start: string;
                        end: string;
                        _start: number;
                        _end: number;
                        shots: number;
                        production: number;
                        production_meters: number;
                        material: number;
                        electricity: number;
                        ontime: number;
                        idletime: number;
                        found: boolean;
                    }[] = [];
                    const allHours: DataToSet["allHours"] = [];
                    for (let i = 0; i < 24; i++) {
                        const start = new Date((+shiftData.shift_a_start + 3600 * i) * 1000);
                        const end = new Date((+shiftData.shift_a_start + 3600 * (i + 1) + 59) * 1000);
                        const _start = start.getTime() / 1000;
                        const _end = end.getTime() / 1000;
                        if (!isAllowedShiftHour(shiftData, _start, allowedShifts)) continue;
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
                            ontime: 0,
                            idletime: 0,
                            found: false,
                        });
                    }
                    for await (const _hour of Object.values(rawHours)) {
                        const hour = _hour as any;
                        const start = new Date(hour.from * 1000).getTime() / 1000;
                        const end = new Date(hour.time * 1000).getTime() / 1000;
                        if (!isAllowedShiftHour(shiftData, start - 60, allowedShifts)) {
                            console.log("skipping hour", dayjs.unix(start).format("HH:mm"), shiftData, allowedShifts);
                            continue;
                        }
                        allHours.push({
                            ...hour,
                            operator: hour.operator || "NA",
                            mold: hour.mold_name || "NA",
                            phase_values: hour.phase_values ? transformDailyData(hour.phase_values) : undefined
                        });
                        const hourIndex = hours.findIndex(
                            (hour) => start >= hour._start && end <= hour._end,
                        );
                        if (hourIndex === -1) continue;
                        const foundHour = hours[hourIndex];
                        foundHour.found = true;
                        foundHour.shots += hour.shots;
                        foundHour.production_meters += hour.production_meters || 0;
                        foundHour.production += hour.production;
                        foundHour.material += hour.material_usage;
                        foundHour.electricity += hour.electricity_usage;
                        foundHour.ontime += hour.ontime;
                        foundHour.idletime += hour.offtime;
                        dataToSet.total.shots += hour.shots;
                        dataToSet.total.production_meters += hour.production_meters || 0;
                        dataToSet.total.production += hour.production;
                        dataToSet.total.material += hour.material_usage;
                        dataToSet.total.electricity += hour.electricity_usage;
                        if (hour.offtime) dataToSet.total.idle_electricity += hour.electricity_usage;
                        dataToSet.total.ontime += hour.ontime;
                        dataToSet.total.idletime += hour.offtime;

                        let shiftKey = "A";
                        if (shiftData.shifts === 2) {
                            if (start >= +shiftData.shift_b_start) shiftKey = "B";
                        } else if (shiftData.shifts === 3) {
                            if (start >= +shiftData.shift_c_start) shiftKey = "C";
                            else if (start >= +shiftData.shift_b_start) shiftKey = "B";
                        }
                        if (moldsByShift[shiftKey as keyof typeof moldsByShift]) {
                            if (!moldsByShift[shiftKey as keyof typeof moldsByShift][hour.mold_name]) {
                                moldsByShift[shiftKey as keyof typeof moldsByShift][hour.mold_name] = 0;
                            }
                            moldsByShift[shiftKey as keyof typeof moldsByShift][hour.mold_name] += hour.production;
                        }

                        if (molds[hour.mold_name]) {
                            molds[hour.mold_name].electricity += hour.electricity_usage;
                            molds[hour.mold_name].idletime += hour.offtime;
                            molds[hour.mold_name].ontime += hour.ontime;
                            molds[hour.mold_name].production_meters += hour.production_meters || 0;
                            molds[hour.mold_name].material += hour.material_usage;
                            molds[hour.mold_name].production += hour.production;
                            molds[hour.mold_name].shots += hour.shots;
                        } else molds[hour.mold_name] = {
                            electricity: hour.electricity_usage,
                            idletime: hour.offtime,
                            ontime: hour.ontime,
                            material: hour.material_usage,
                            production_meters: hour.production_meters || 0,
                            production: hour.production,
                            shots: hour.shots
                        };
                    }
                    if (allShifts) {
                        const unitSessions = shiftData?.unit_power?.[unit]?.sessions;
                        const hasUnitPowerSessions = !!(unitSessions && Object.keys(unitSessions).length > 0);
                        hourlyData = await insertUnitOffSessions(
                            hourlyData,
                            unitSessions || [],
                            +shiftData.shift_a_start,
                            date,
                        );
                        if ((dataToSet.total.offtime + dataToSet.total.ontime + dataToSet.total.idletime) > 86400) {
                            const availableTime = Math.max(0, 86400 - dataToSet.total.offtime);
                            const sumActive = dataToSet.total.ontime + dataToSet.total.idletime;
                            if (sumActive > availableTime) {
                                if (availableTime <= 0) {
                                    dataToSet.total.ontime = 0;
                                    dataToSet.total.idletime = 0;
                                } else {
                                    const scale = availableTime / sumActive;
                                    dataToSet.total.ontime = Math.round(dataToSet.total.ontime * scale);
                                    dataToSet.total.idletime = availableTime - dataToSet.total.ontime;
                                }
                            }
                        }
                        if (dataToSet.total.offtime < 0) dataToSet.total.offtime = 0;
                        if (dataToSet.total.ontime < 0) dataToSet.total.ontime = 0;
                        if (dataToSet.total.idletime < 0) dataToSet.total.idletime = 0;
                        // 10 min threshhold
                        if (!hasUnitPowerSessions && dataToSet.completed && dataToSet.total.ontime + dataToSet.total.idletime + dataToSet.total.offtime < (86400 - (10 * 60))) {
                            // assuming offtime missing
                            const missingOfftime = 86400 - (dataToSet.total.ontime + dataToSet.total.idletime + dataToSet.total.offtime);
                            dataToSet.total.offtime += missingOfftime;
                            hourlyData = await hourlyArtificialOfftimeFixer(shifts, hourlyData, date);
                        }
                    }
                    if (dataToSet.total.ontime + dataToSet.total.idletime > 86400) {
                        const sumActive = dataToSet.total.ontime + dataToSet.total.idletime;
                        if (sumActive > 86400) {
                            const scale = 86400 / sumActive;
                            dataToSet.total.ontime = Math.round(dataToSet.total.ontime * scale);
                            dataToSet.total.idletime = 86400 - dataToSet.total.ontime;
                        }
                    }
                    hourlyData = hourlyTimeFixer(hourlyData);
                    dataToSet.downtimeSegments = buildDowntimeSegments(hourlyData, {
                        machineId: machine,
                        date,
                        shiftStarts: {
                            A: +shiftData.shift_a_start,
                            B: +shiftData.shift_b_start,
                            C: +shiftData.shift_c_start,
                            shifts: shiftData.shifts
                        },
                        allowedShifts: allowedShifts.map(shift => shift.toUpperCase() as ShiftKey)
                    });
                    const hourlyTreeData = await sortHourlyTree(shifts, hourlyData, date, downtimeEntries);
                    dataToSet.tree = hourlyTreeData;
                    const materials: {
                        [key: string]: {
                            weight: number;
                            pc_weight: number | null;
                        };
                    } = {};
                    for (const key of Object.keys(molds)) {
                        const moldName = key as string;
                        const moldDetails = dailyData?.molds?.[key];
                        if (!moldDetails) continue;
                        const mold = molds[key];
                        for (const material of moldDetails.details.materials) materials[material.name] = {
                            weight: material.weight,
                            pc_weight: material.pc_weight || null
                        };
                        dataToSet.molds[moldName] = {
                            details: {
                                cavities: +moldDetails.details.cavities || 1,
                                material: moldDetails.details.material || "",
                                material2: moldDetails.details.material_2 || "",
                                multiComponent: !!moldDetails.details.multi_component,
                                product: moldDetails.details.product || "",
                                productColor: moldDetails.details.product_color || "",
                                productWeight: +moldDetails.details.product_weight || 1,
                                productWeight2: +moldDetails.details.product_weight_2 || 0,
                                materials: moldDetails.details.materials
                            },
                            stats: {
                                electricity: +mold.electricity,
                                idle_electricity: 0,
                                idletime: +mold.idletime,
                                ontime: +mold.ontime,
                                material: +mold.material,
                                production: +mold.production,
                                production_meters: +mold.production_meters || 0,
                                shots: +mold.shots
                            }
                        };
                    }
                    dataToSet.materialBreakdown = Object.fromEntries(
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
                    dataToSet.moldsByShift = moldsByShift;
                    const finalAllHours: DataToSet["allHours"] = [];
                    for (const _h of Object.values(hourlyData)) {
                        const h = _h as any;
                        const hStart = new Date(h.from * 1000).getTime() / 1000;
                        if (!isAllowedShiftHour(shiftData, hStart - 60, allowedShifts)) {
                            continue;
                        }
                        finalAllHours.push({
                            ...h,
                            shots: h.shots || 0,
                            production: h.production || 0,
                            production_meters: h.production_meters || 0,
                            material_usage: h.material_usage || 0,
                            electricity_usage: h.electricity_usage || 0,
                            ontime: h.ontime || 0,
                            offtime: h.offtime || 0,
                            shutdown_time: h.shutdown_time || 0,
                            operator: h.operator || "NA",
                            mold_name: h.mold_name || h.mold || "NA",
                            status: !!h.status,
                            phase_values: h.phase_values ? transformDailyData(h.phase_values) : undefined
                        });
                    }
                    dataToSet.allHours = finalAllHours;
                    for await (const hour of hours) {
                        const { _start } = hour;
                        dataToSet.hours.push({
                            electricity: hour.electricity,
                            material: hour.material,
                            production: hour.production,
                            production_meters: hour.production_meters || 0,
                            shots: hour.shots,
                            ontime: hour.ontime,
                            idletime: hour.idletime,
                            time: `${hour.start} - ${hour.end}`
                        });
                        if (shiftData.shifts === 1) {
                            if (allowedShifts.includes("a")) {
                                (dataToSet.shifts.A as ShiftStats).shots += hour.shots;
                                (dataToSet.shifts.A as ShiftStats).production += hour.production;
                                (dataToSet.shifts.A as ShiftStats).production_meters += hour.production_meters || 0;
                                (dataToSet.shifts.A as ShiftStats).electricity += hour.electricity;
                                (dataToSet.shifts.A as ShiftStats).material += hour.material;
                                (dataToSet.shifts.A as ShiftStats).ontime += hour.ontime;
                                (dataToSet.shifts.A as ShiftStats).idletime += hour.idletime;
                            }
                        } else if (shiftData.shifts === 2) {
                            if (_start < +shiftData.shift_b_start) {
                                if (allowedShifts.includes("a")) {
                                    (dataToSet.shifts.A as ShiftStats).shots += hour.shots;
                                    (dataToSet.shifts.A as ShiftStats).production += hour.production;
                                    (dataToSet.shifts.A as ShiftStats).production_meters += hour.production_meters || 0;
                                    (dataToSet.shifts.A as ShiftStats).electricity += hour.electricity;
                                    (dataToSet.shifts.A as ShiftStats).material += hour.material;
                                    (dataToSet.shifts.A as ShiftStats).ontime += hour.ontime;
                                    (dataToSet.shifts.A as ShiftStats).idletime += hour.idletime;
                                }
                            } else if (dataToSet.shifts.B) {
                                if (allowedShifts.includes("b")) {
                                    dataToSet.shifts.B.shots += hour.shots;
                                    dataToSet.shifts.B.production += hour.production;
                                    dataToSet.shifts.B.production_meters += hour.production_meters || 0;
                                    dataToSet.shifts.B.electricity += hour.electricity;
                                    dataToSet.shifts.B.material += hour.material;
                                    dataToSet.shifts.B.ontime += hour.ontime;
                                    dataToSet.shifts.B.idletime += hour.idletime;
                                }
                            }
                        } else {
                            if (_start < +shiftData.shift_b_start) {
                                if (allowedShifts.includes("a")) {
                                    (dataToSet.shifts.A as ShiftStats).shots += hour.shots;
                                    (dataToSet.shifts.A as ShiftStats).production += hour.production;
                                    (dataToSet.shifts.A as ShiftStats).production_meters += hour.production_meters || 0;
                                    (dataToSet.shifts.A as ShiftStats).electricity += hour.electricity;
                                    (dataToSet.shifts.A as ShiftStats).material += hour.material;
                                    (dataToSet.shifts.A as ShiftStats).ontime += hour.ontime;
                                    (dataToSet.shifts.A as ShiftStats).idletime += hour.idletime;
                                }
                            } else if (_start < +shiftData.shift_c_start && dataToSet.shifts.B) {
                                if (allowedShifts.includes("b")) {
                                    dataToSet.shifts.B.shots += hour.shots;
                                    dataToSet.shifts.B.production += hour.production;
                                    dataToSet.shifts.B.production_meters += hour.production_meters || 0;
                                    dataToSet.shifts.B.electricity += hour.electricity;
                                    dataToSet.shifts.B.material += hour.material;
                                    dataToSet.shifts.B.ontime += hour.ontime;
                                    dataToSet.shifts.B.idletime += hour.idletime;
                                }
                            } else if (dataToSet.shifts.C) {
                                if (allowedShifts.includes("c")) {
                                    dataToSet.shifts.C.shots += hour.shots;
                                    dataToSet.shifts.C.production += hour.production;
                                    dataToSet.shifts.C.production_meters += hour.production_meters || 0;
                                    dataToSet.shifts.C.electricity += hour.electricity;
                                    dataToSet.shifts.C.material += hour.material;
                                    dataToSet.shifts.C.ontime += hour.ontime;
                                    dataToSet.shifts.C.idletime += hour.idletime;
                                }
                            }
                        }
                    }
                    const getShiftOfftime = (shiftKey: "a" | "b" | "c") => {
                        let off = unitPowerOffAllowedShifts(date, shiftData, shiftData?.unit_power?.[unit]?.sessions || {}, [shiftKey]);
                        if (off === 0 && Object.keys(hourlyData).length > 0) {
                            for (const _h of Object.values(hourlyData) as any[]) {
                                const hStart = new Date(_h.from * 1000).getTime() / 1000;
                                if (shiftData.shifts === 1) {
                                    if (shiftKey === "a") off += _h.shutdown_time || 0;
                                } else if (shiftData.shifts === 2) {
                                    if (hStart < +shiftData.shift_b_start) {
                                        if (shiftKey === "a") off += _h.shutdown_time || 0;
                                    } else {
                                        if (shiftKey === "b") off += _h.shutdown_time || 0;
                                    }
                                } else {
                                    if (hStart < +shiftData.shift_b_start) {
                                        if (shiftKey === "a") off += _h.shutdown_time || 0;
                                    } else if (hStart < +shiftData.shift_c_start) {
                                        if (shiftKey === "b") off += _h.shutdown_time || 0;
                                    } else {
                                        if (shiftKey === "c") off += _h.shutdown_time || 0;
                                    }
                                }
                            }
                        }
                        return off;
                    };
                    if (dataToSet.shifts.A) {
                        dataToSet.shifts.A.offtime = getShiftOfftime("a");
                    }
                    if (dataToSet.shifts.B) {
                        dataToSet.shifts.B.offtime = getShiftOfftime("b");
                    }
                    if (dataToSet.shifts.C) {
                        dataToSet.shifts.C.offtime = getShiftOfftime("c");
                    }
                }
                dataToSet.insights.productionPerUnit = +(
                    dataToSet.total.production / dataToSet.total.electricity
                ).toFixed(0);
                dataToSet.insights.materialPerUnit = +(
                    dataToSet.total.material / dataToSet.total.electricity
                ).toFixed(2);
                dataToSet.insights.unitsPerPiece = +(
                    dataToSet.total.electricity / dataToSet.total.production
                ).toFixed(3);
                dataToSet.insights.unitsPerGram = +(
                    dataToSet.total.electricity / dataToSet.total.material
                ).toFixed(3);
                dataToSet.insights.shotsPerUnit = +(
                    dataToSet.total.shots / dataToSet.total.electricity
                ).toFixed(0);
                dataToSet.insights.unitsPerShot = +(
                    dataToSet.total.electricity / dataToSet.total.shots
                ).toFixed(3);
                dataToSet.insights.consumptionPerKg = +(
                    dataToSet.total.electricity / (dataToSet.total.material / 1000)
                ).toFixed(3);
                dataToSet.insights.materialPerShot = +(
                    dataToSet.total.material / dataToSet.total.shots
                ).toFixed(3);
                dataToSet.insights.meterProductionPerUnit = +(
                    dataToSet.total.production_meters || 0 / dataToSet.total.electricity
                ).toFixed(2);
                dataToSet.insights.unitsPerMeter = +(
                    dataToSet.total.electricity / dataToSet.total.production_meters || 0
                ).toFixed(3);
            } else {
                if (!isSingleMachine) return;
                const uid = store.get(uidAtom);
                const dates = [
                    dayjs(parameters.date.from).format("YYYY-MM-DD"),
                    dayjs(parameters.date.to).format("YYYY-MM-DD")
                ];
                const promises = [
                    get(`machines/${machine}/unit`)
                ];
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
                            ref(db, `users/${uid}/reports/machines/${machine}/daily`),
                            orderByKey(),
                            startAt(dates[0]),
                            endAt(dates[1]),
                        ),
                    ),
                );
                promises.push(
                    firebaseGet(
                        query(
                            ref(db, `users/${uid}/reports/machines/${machine}/hourly`),
                            orderByKey(),
                            startAt(dates[0]),
                            endAt(dates[1]),
                        ),
                    ),
                );
                const [machineUnitSnap, shiftSnap, dailySnap, hourlySnap] = await Promise.all(promises);
                if (!shiftSnap.exists() || !dailySnap.exists() || !hourlySnap.exists()) {
                    setData("NOT_FOUND");
                    return;
                }
                const unit = machineUnitSnap.val() || 1;
                const shiftDatas = shiftSnap.val() || {};
                const dailyDatas = dailySnap.val() || {};
                const hourlyData = hourlySnap.val();
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
                dataToSet.completed = true;
                for await (const key of Object.keys(shiftDatas)) {
                    const date = key as string;
                    let shiftData = shiftDatas[date];
                    const data = dailyDatas[date];
                    if (!data) continue;
                    if (!data.completed) dataToSet.completed = false;
                    if (shiftData?.factories && mySelectedFactory) {
                        shiftData = {
                            ...shiftData,
                            ...shiftData.factories[selectedFactory.value]
                        }
                    } else if (mySelectedFactory === undefined && shiftData?.factories) {
                        shiftData = {
                            ...shiftData,
                            ...shiftData.factories[0]
                        };
                    }
                    const day: AllDay = {
                        date: dayjs(date).format("DD MMM, YY"),
                        electricity: 0,
                        idle_electricity: 0,
                        production_meters: 0,
                        idletime: 0,
                        material: 0,
                        molds: "",
                        offtime: unitPowerOffAllowedShifts(date, shiftData, shiftData?.unit_power?.[unit]?.sessions || {}, allowedShifts),
                        ontime: 0,
                        operators: "",
                        production: 0,
                        shots: 0,
                        phase_values: data?.phase_values ? transformDailyData(data.phase_values, true) as any : undefined
                    };
                    const operators = [];
                    const moldsNames = [];

                    if (allowedShifts.includes("a")) {
                        const operatorNames = Object.keys(data?.total?.operators?.A || {})
                            .filter(name => name !== "rejected" && !name.includes("rejected"))
                            .filter((name, index, arr) => arr.indexOf(name) === index);
                        supervisors.A.name.add(operatorNames.join(", ") || "");
                        operators.push(operatorNames.join(", ") || "");
                    }
                    if (shiftData.shifts === 1) {
                        if (allowedShifts.includes("a")) {
                            supervisors.A.time.add(`${secondsToHourMin(+shiftData.shift_a_start || 0)} - ${secondsToHourMin(+shiftData.shift_a_start || 0)}`);
                        }
                    } else if (shiftData.shifts === 2) {
                        if (allowedShifts.includes("b")) {
                            if (dataToSet.shifts.B === null) dataToSet.shifts.B = {
                                shots: 0,
                                production: 0,
                                production_meters: 0,
                                electricity: 0,
                                material: 0,
                                ontime: 0,
                                idletime: 0,
                                offtime: 0,
                                timing: "",
                                supervisor: ""
                            };
                            const operatorNames = Object.keys(data?.total?.operators?.B || {})
                                .filter(name => name !== "rejected" && !name.includes("rejected"))
                                .filter((name, index, arr) => arr.indexOf(name) === index);
                            supervisors.B.name.add(operatorNames.join(", ") || "");
                            supervisors.B.time.add(`${secondsToHourMin(+shiftData.shift_b_start || 0)} - ${secondsToHourMin(+shiftData.shift_a_start || 0)}`);
                            operators.push(operatorNames.join(", ") || "");
                        }
                        if (allowedShifts.includes("a")) {
                            supervisors.A.time.add(`${secondsToHourMin(+shiftData.shift_a_start || 0)} - ${secondsToHourMin(+shiftData.shift_b_start || 0)}`);
                        }
                    } else {
                        if (allowedShifts.includes("b")) {
                            if (dataToSet.shifts.B === null) dataToSet.shifts.B = {
                                shots: 0,
                                production: 0,
                                production_meters: 0,
                                electricity: 0,
                                material: 0,
                                ontime: 0,
                                idletime: 0,
                                offtime: 0,
                                timing: "",
                                supervisor: ""
                            };
                            const operatorNames = Object.keys(data?.total?.operators?.B || {})
                                .filter(name => name !== "rejected" && !name.includes("rejected"))
                                .filter((name, index, arr) => arr.indexOf(name) === index);
                            supervisors.B.name.add(operatorNames.join(", ") || "");
                            supervisors.B.time.add(`${secondsToHourMin(+shiftData.shift_b_start || 0)} - ${secondsToHourMin(+shiftData.shift_c_start || 0)}`);
                            operators.push(operatorNames.join(", ") || "");
                        }
                        if (allowedShifts.includes("c")) {
                            if (dataToSet.shifts.C === null) dataToSet.shifts.C = {
                                shots: 0,
                                production: 0,
                                production_meters: 0,
                                electricity: 0,
                                material: 0,
                                ontime: 0,
                                idletime: 0,
                                offtime: 0,
                                timing: "",
                                supervisor: ""
                            };
                            const operatorNames = Object.keys(data?.total?.operators?.C || {})
                                .filter(name => name !== "rejected" && !name.includes("rejected"))
                                .filter((name, index, arr) => arr.indexOf(name) === index);
                            supervisors.C.name.add(operatorNames.join(", ") || "");
                            supervisors.C.time.add(`${secondsToHourMin(+shiftData.shift_c_start || 0)} - ${secondsToHourMin(+shiftData.shift_a_start || 0)}`);
                            operators.push(operatorNames.join(", ") || "");
                        }
                        if (allowedShifts.includes("a")) {
                            supervisors.A.time.add(`${secondsToHourMin(+shiftData.shift_a_start || 0)} - ${secondsToHourMin(+shiftData.shift_b_start || 0)}`);
                        }
                    }
                    const molds: {
                        [key: string]: {
                            electricity: number;
                            idletime: number;
                            ontime: number;
                            material: number;
                            production: number;
                            production_meters: number;
                            shots: number;
                        }
                    } = {};
                    if (data.total === undefined) data.total = {
                        shots: 0,
                        production_meters: 0,
                        production: 0,
                        material_usage: 0,
                        electricity_usage: 0,
                        ontime: 0,
                        offtime: 0
                    }
                    data.total.shots = 0;
                    data.total.production = 0;
                    data.total.production_meters = 0;
                    data.total.material_usage = 0;
                    data.total.electricity_usage = 0;
                    data.total.ontime = 0;
                    data.total.offtime = 0;
                    const hours = [];
                    for (let i = 0; i < 24; i++) {
                        const start = new Date((+(shiftData.shift_a_start || 0) + 3600 * i) * 1000);
                        const end = new Date((+(shiftData.shift_a_start || 0) + 3600 * (i + 1) + 59) * 1000);
                        const _start = start.getTime() / 1000;
                        const _end = end.getTime() / 1000;
                        if (!isAllowedShiftHour(shiftData, _start, allowedShifts)) continue;
                        hours.push({
                            _start,
                            _end,
                            start: secToTime(_start),
                            end: secToTime(_end),
                            shots: 0,
                            production: 0,
                            production_meters: 0,
                            material: 0,
                            electricity: 0,
                            ontime: 0,
                            idletime: 0,
                            found: false,
                        });
                    }
                    const rawHours = Object.values(hourlyData?.[date] || {});
                    for await (const _hour of Object.values(rawHours)) {
                        const hour = _hour as any;
                        const start = new Date(hour.from * 1000).getTime() / 1000;
                        if (!isAllowedShiftHour(shiftData, start - 60, allowedShifts)) continue;
                        const end = new Date(hour.time * 1000).getTime() / 1000;
                        const hourIndex = hours.findIndex(
                            (hour) => start >= hour._start && end <= hour._end,
                        );
                        if (hourIndex === -1) continue;
                        const foundHour = hours[hourIndex];
                        foundHour.found = true;
                        foundHour.shots += hour.shots;
                        foundHour.production_meters += hour.production_meters || 0;
                        foundHour.production += hour.production;
                        foundHour.material += hour.material_usage;
                        foundHour.electricity += hour.electricity_usage;
                        foundHour.ontime += hour.ontime;
                        foundHour.idletime += hour.offtime;
                        data.total.shots += hour.shots;
                        data.total.production_meters += hour.production_meters || 0;
                        data.total.production += hour.production;
                        data.total.material_usage += hour.material_usage;
                        data.total.electricity_usage += hour.electricity_usage;
                        day.shots += hour.shots;
                        day.production_meters += hour.production_meters || 0;
                        day.production += hour.production;
                        day.material += hour.material_usage;
                        day.electricity += hour.electricity_usage;
                        day.ontime += hour.ontime;
                        day.idletime += hour.offtime;
                        if (!data.total.idle_electricity) data.total.idle_electricity = 0;
                        if (hour.offtime) data.total.idle_electricity += hour.electricity_usage;
                        data.total.ontime += hour.ontime;
                        data.total.offtime += hour.offtime;
                        if (molds[hour.mold_name]) {
                            molds[hour.mold_name].electricity += hour.electricity_usage;
                            molds[hour.mold_name].production_meters += hour.production_meters || 0;
                            molds[hour.mold_name].idletime += hour.offtime;
                            molds[hour.mold_name].ontime += hour.ontime;
                            molds[hour.mold_name].material += hour.material_usage;
                            molds[hour.mold_name].production += hour.production;
                            molds[hour.mold_name].shots += hour.shots;
                        } else molds[hour.mold_name] = {
                            electricity: hour.electricity_usage,
                            idletime: hour.offtime,
                            production_meters: hour.production_meters || 0,
                            ontime: hour.ontime,
                            material: hour.material_usage,
                            production: hour.production,
                            shots: hour.shots
                        };
                    }
                    for await (const hour of hours) {
                        const { _start } = hour;
                        if (shiftData.shifts === 1) {
                            if (allowedShifts.includes("a")) {
                                (dataToSet.shifts.A as ShiftStats).shots += hour.shots;
                                (dataToSet.shifts.A as ShiftStats).production_meters += hour.production_meters || 0;
                                (dataToSet.shifts.A as ShiftStats).production += hour.production;
                                (dataToSet.shifts.A as ShiftStats).electricity += hour.electricity;
                                (dataToSet.shifts.A as ShiftStats).material += hour.material;
                                (dataToSet.shifts.A as ShiftStats).ontime += hour.ontime;
                                (dataToSet.shifts.A as ShiftStats).idletime += hour.idletime;
                            }
                        } else if (shiftData.shifts === 2) {
                            if (_start < +shiftData.shift_b_start) {
                                if (allowedShifts.includes("a")) {
                                    (dataToSet.shifts.A as ShiftStats).shots += hour.shots;
                                    (dataToSet.shifts.A as ShiftStats).production += hour.production;
                                    (dataToSet.shifts.A as ShiftStats).production_meters += hour.production_meters || 0;
                                    (dataToSet.shifts.A as ShiftStats).electricity += hour.electricity;
                                    (dataToSet.shifts.A as ShiftStats).material += hour.material;
                                    (dataToSet.shifts.A as ShiftStats).ontime += hour.ontime;
                                    (dataToSet.shifts.A as ShiftStats).idletime += hour.idletime;
                                }
                            } else if (dataToSet.shifts.B) {
                                if (allowedShifts.includes("b")) {
                                    dataToSet.shifts.B.shots += hour.shots;
                                    dataToSet.shifts.B.production += hour.production;
                                    dataToSet.shifts.B.production_meters += hour.production_meters || 0;
                                    dataToSet.shifts.B.electricity += hour.electricity;
                                    dataToSet.shifts.B.material += hour.material;
                                    dataToSet.shifts.B.ontime += hour.ontime;
                                    dataToSet.shifts.B.idletime += hour.idletime;
                                }
                            }
                        } else {
                            if (_start < +shiftData.shift_b_start) {
                                if (allowedShifts.includes("a")) {
                                    (dataToSet.shifts.A as ShiftStats).shots += hour.shots;
                                    (dataToSet.shifts.A as ShiftStats).production_meters += hour.production_meters || 0;
                                    (dataToSet.shifts.A as ShiftStats).production += hour.production;
                                    (dataToSet.shifts.A as ShiftStats).electricity += hour.electricity;
                                    (dataToSet.shifts.A as ShiftStats).material += hour.material;
                                    (dataToSet.shifts.A as ShiftStats).ontime += hour.ontime;
                                    (dataToSet.shifts.A as ShiftStats).idletime += hour.idletime;
                                }
                            } else if (_start < +shiftData.shift_c_start && dataToSet.shifts.B) {
                                if (allowedShifts.includes("b")) {
                                    dataToSet.shifts.B.shots += hour.shots;
                                    dataToSet.shifts.B.production_meters += hour.production_meters || 0;
                                    dataToSet.shifts.B.production += hour.production;
                                    dataToSet.shifts.B.electricity += hour.electricity;
                                    dataToSet.shifts.B.material += hour.material;
                                    dataToSet.shifts.B.ontime += hour.ontime;
                                    dataToSet.shifts.B.idletime += hour.idletime;
                                }
                            } else if (dataToSet.shifts.C) {
                                if (allowedShifts.includes("c")) {
                                    dataToSet.shifts.C.shots += hour.shots;
                                    dataToSet.shifts.C.production_meters += hour.production_meters || 0;
                                    dataToSet.shifts.C.production += hour.production;
                                    dataToSet.shifts.C.electricity += hour.electricity;
                                    dataToSet.shifts.C.material += hour.material;
                                    dataToSet.shifts.C.ontime += hour.ontime;
                                    dataToSet.shifts.C.idletime += hour.idletime;
                                }
                            }
                        }
                    }
                    dataToSet.total.shots += data?.total?.shots || 0;
                    dataToSet.total.production_meters += data?.total?.production_meters || 0;
                    dataToSet.total.production += data?.total?.production || 0;
                    dataToSet.total.electricity += data?.total?.electricity_usage || 0;
                    dataToSet.total.idle_electricity += data?.total?.idle_electricity || 0;
                    dataToSet.total.material += data?.total?.material_usage || 0;
                    dataToSet.total.ontime += data?.total?.ontime || 0;
                    dataToSet.total.idletime += data?.total?.offtime || 0;
                    dataToSet.total.offtime += unitPowerOffAllowedShifts(date, shiftData, shiftData?.unit_power?.[unit]?.sessions || {}, allowedShifts);
                    if (dataToSet.shifts.A && allowedShifts.includes("a")) {
                        (dataToSet.shifts.A as ShiftStats).offtime = ((dataToSet.shifts.A as ShiftStats).offtime || 0) + unitPowerOffAllowedShifts(date, shiftData, shiftData?.unit_power?.[unit]?.sessions || {}, ["a"]);
                    }
                    if (dataToSet.shifts.B && allowedShifts.includes("b")) {
                        (dataToSet.shifts.B as ShiftStats).offtime = ((dataToSet.shifts.B as ShiftStats).offtime || 0) + unitPowerOffAllowedShifts(date, shiftData, shiftData?.unit_power?.[unit]?.sessions || {}, ["b"]);
                    }
                    if (dataToSet.shifts.C && allowedShifts.includes("c")) {
                        (dataToSet.shifts.C as ShiftStats).offtime = ((dataToSet.shifts.C as ShiftStats).offtime || 0) + unitPowerOffAllowedShifts(date, shiftData, shiftData?.unit_power?.[unit]?.sessions || {}, ["c"]);
                    }
                    const myMaterialBreakdown: {
                        [key: string]: {
                            weight: number;
                            pc_weight: number | null;
                        }
                    } = {}
                    for (const key of Object.keys(molds)) {
                        const moldName = key as string;
                        moldsNames.push(moldName);
                        const mold = molds[key];
                        const moldDetails = data.molds[key];
                        if (!moldDetails) continue;
                        if (moldDetails?.details?.materials) for (const material of (moldDetails?.details?.materials || {})) {
                            if (myMaterialBreakdown[material.name]) myMaterialBreakdown[material.name].weight += material.weight * mold.production;
                            else myMaterialBreakdown[material.name] = {
                                weight: material.weight * mold.production,
                                pc_weight: material.pc_weight || null
                            }
                        }
                        if (!dataToSet.molds[moldName]) {
                            dataToSet.molds[moldName] = {
                                details: {
                                    cavities: +moldDetails.details.cavities || 1,
                                    material: moldDetails.details.material || "",
                                    material2: moldDetails.details.material_2 || "",
                                    multiComponent: !!moldDetails.details.multi_component,
                                    product: moldDetails.details.product || "",
                                    productColor: moldDetails.details.product_color || "",
                                    productWeight: +moldDetails.details.product_weight || 1,
                                    productWeight2: +moldDetails.details.product_weight_2 || 0,
                                    materials: moldDetails.details.materials
                                },
                                stats: {
                                    electricity: +mold.electricity || 0,
                                    production_meters: +mold.production_meters || 0,
                                    idle_electricity: 0,
                                    idletime: +mold.idletime || 0,
                                    ontime: +mold.ontime || 0,
                                    material: +mold.material || 0,
                                    production: +mold.production || 0,
                                    shots: +mold.shots || 0
                                }
                            };
                        } else {
                            dataToSet.molds[moldName].stats.electricity += +mold.electricity || 0;
                            dataToSet.molds[moldName].stats.production_meters += +mold.production_meters || 0;
                            dataToSet.molds[moldName].stats.idletime += +mold.idletime || 0;
                            dataToSet.molds[moldName].stats.ontime += +mold.ontime || 0;
                            dataToSet.molds[moldName].stats.material += +mold.material || 0;
                            dataToSet.molds[moldName].stats.production += +mold.production || 0;
                            dataToSet.molds[moldName].stats.shots += +mold.shots || 0;
                        }
                    }
                    for (const [mat, cons] of Object.entries(allShifts ? (data?.total?.material_usage_breakdown || {}) as typeof myMaterialBreakdown : myMaterialBreakdown)) {
                        if (dataToSet.materialBreakdown[mat]) dataToSet.materialBreakdown[mat].weight += cons.weight;
                        else dataToSet.materialBreakdown[mat] = {
                            weight: cons.weight,
                            pc_weight: cons.pc_weight
                        }
                    }
                    day.operators = operators.join(", ");
                    day.molds = moldsNames.join(", ");
                    dataToSet.allDays.push(day);
                    dataToSet.hours.push({
                        electricity: data?.total?.electricity_usage || 0,
                        material: data?.total?.material_usage || 0,
                        production_meters: data?.total?.production_meters || 0,
                        production: data?.total?.production || 0,
                        shots: data?.total?.shots || 0,
                        ontime: data?.total?.ontime || 0,
                        idletime: data?.total?.offtime || 0,
                        time: dayjs(date).format("DD MMM, YYYY")
                    });
                    dataToSet.insights.productionPerUnit = +(
                        day.production / day.electricity
                    ).toFixed(0);
                    dataToSet.insights.materialPerUnit = +(
                        day.material / day.electricity
                    ).toFixed(2);
                    dataToSet.insights.unitsPerPiece = +(
                        day.electricity / day.production
                    ).toFixed(3);
                    dataToSet.insights.unitsPerGram = +(
                        day.electricity / day.material
                    ).toFixed(3);
                    dataToSet.insights.shotsPerUnit = +(
                        day.shots / day.electricity
                    ).toFixed(0);
                    dataToSet.insights.unitsPerShot = +(
                        day.electricity / day.shots
                    ).toFixed(3);
                    dataToSet.insights.consumptionPerKg = +(
                        day.electricity / (day.material / 1000)
                    ).toFixed(3);
                    dataToSet.insights.materialPerShot = +(
                        day.material / day.shots
                    ).toFixed(3);
                    dataToSet.insights.meterProductionPerUnit = +(
                        day.production_meters || 0 / day.electricity
                    ).toFixed(2);
                    dataToSet.insights.unitsPerMeter = +(
                        day.electricity / day.production_meters || 0
                    ).toFixed(3);
                }

                let totalRejectedPieces = 0;
                let rejectedReasons: string[] = [];

                for await (const key of Object.keys(dailyDatas)) {
                    const date = key as string;
                    const dailyData = dailyDatas[date];

                    for (const option of parameters.secondaryOption) {
                        const shiftKey = option.value.toUpperCase();

                        if (dailyData?.total?.operators?.[shiftKey]?.rejected) {
                            const rejectedData = dailyData.total.operators[shiftKey].rejected;
                            totalRejectedPieces += rejectedData.pieces || 0;
                            if (rejectedData.molds) {
                                Object.entries(rejectedData.molds).forEach(([moldName, moldData]: [string, any]) => {
                                    const pieces = +moldData.pieces || 0;
                                    if (pieces > 0) {
                                        rejectedReasons.push(`${dayjs(date).format("DD MMM")} (Shift ${shiftKey}): ${moldName} (${pieces} pcs): ${moldData.reason}`);

                                        if (dataToSet.molds[moldName]) {
                                            if (!dataToSet.molds[moldName].rejected) {
                                                dataToSet.molds[moldName].rejected = { pieces: 0, reason: "" };
                                            }
                                            dataToSet.molds[moldName].rejected!.pieces += pieces;
                                            const currentReason = dataToSet.molds[moldName].rejected!.reason;
                                            const newReason = `${dayjs(date).format("DD MMM")} (Shift ${shiftKey}): ${moldData.reason}`;
                                            dataToSet.molds[moldName].rejected!.reason = currentReason ? `${currentReason}; ${newReason}` : newReason;
                                        }
                                    }
                                });
                            } else if (rejectedData.reason && rejectedData.reason !== "No reason provided") {
                                rejectedReasons.push(`${dayjs(date).format("DD MMM")} (Shift ${shiftKey}): ${rejectedData.reason}`);
                            }
                        }
                    }
                }

                dataToSet.rejectedPieces = totalRejectedPieces > 0 ? {
                    pieces: totalRejectedPieces,
                    reason: rejectedReasons.length > 0 ? rejectedReasons.join("; ") : "No reason provided"
                } : null;

                if (allowedShifts.includes("a")) {
                    const allNames = Array.from(supervisors.A.name).join(", ");
                    const uniqueNames = allNames.split(", ")
                        .filter((name, index, arr) => arr.indexOf(name) === index && name !== "null" && name !== "undefined" && name.trim() !== "")
                        .join(", ");
                    (dataToSet.shifts.A as ShiftStats).supervisor = uniqueNames;
                    (dataToSet.shifts.A as ShiftStats).timing = Array.from(supervisors.A.time).join(", ");
                }
                if (dataToSet.shifts.B) {
                    if (allowedShifts.includes("b")) {
                        const allNames = Array.from(supervisors.B.name).join(", ");
                        const uniqueNames = allNames.split(", ")
                            .filter((name, index, arr) => arr.indexOf(name) === index && name !== "null" && name !== "undefined" && name.trim() !== "")
                            .join(", ");
                        dataToSet.shifts.B.supervisor = uniqueNames;
                        dataToSet.shifts.B.timing = Array.from(supervisors.B.time).join(", ");
                    }
                }
                if (dataToSet.shifts.C) {
                    if (allowedShifts.includes("c")) {
                        const allNames = Array.from(supervisors.C.name).join(", ");
                        const uniqueNames = allNames.split(", ")
                            .filter((name, index, arr) => arr.indexOf(name) === index && name !== "null" && name !== "undefined" && name.trim() !== "")
                            .join(", ");
                        dataToSet.shifts.C.supervisor = uniqueNames;
                        dataToSet.shifts.C.timing = Array.from(supervisors.C.time).join(", ");
                    }
                }
            }
            setData(dataToSet);
        };

        func();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isSingleDay, parameters, factories, selectedFactory, shifts, refreshTrigger]);

    const downloadPDF = async () => {
        try {
            if (data === null || data === "NOT_FOUND") return;
            setIsBusy(true);
            const getShiftTiming = (key: "A" | "B" | "C") => {
                const sh = data.shifts[key];
                return computeTimingBreakdown(
                    sh?.ontime || 0,
                    sh?.idletime || 0,
                    sh?.offtime || 0,
                    shiftPlannedDowntime[key].idle,
                    shiftPlannedDowntime[key].off,
                    offtimeBasedEfficiency,
                );
            };
            if (isSingleDay) {
                const tables = {} as {
                    [key: string]: string[][]
                };
                const shiftsTable = [["Shift", "Timing", "Operator", ...(productionType === "meter" ? [] : ["Shots"]), "Production", "Material", "Electricity", "On Time", "Unplanned Down", "Planned"]];
                const moldsTable = [["Mold", "Avg Cycle T.", ...(productionType === "meter" ? [] : ["Shots"]), "Production", "Material", "Electricity", "On Time", "Idle Time", "Product", "Color", "T. Weights", "Materials"]];
                const hoursTable = [["Time", "Status", ...(productionType === "meter" ? [] : ["Shots"]), "Production", "Material", "Electricity", "On Time", "Idle Time", "Off Time", "Avg. Cycle T.", "Operator", "Mold"]];

                const {
                    shifts,
                    molds,
                    allHours,
                    materialBreakdown
                } = data;
                const { A, B, C } = shifts;
                const { supervisor: A_supervisor, timing: A_timing } = A || {};
                const { supervisor: B_supervisor, timing: B_timing } = B || {};
                const { supervisor: C_supervisor, timing: C_timing } = C || {};
                const tA = getShiftTiming("A");
                const tB = getShiftTiming("B");
                const tC = getShiftTiming("C");
                if (A && A_timing && A_supervisor) shiftsTable.push(["A", A_timing, A_supervisor, ...(productionType === "meter" ? [lengthFormatter(A.production_meters)] : [numberFormatter(A.shots, "shot(s)"), numberFormatter(A.production, "pc(s)")]), weightFormatter(A.material), unitFormatter(A.electricity), secFormatter(tA.ontime), secFormatter(tA.unplannedDown), secFormatter(tA.plannedTotal)]);
                if (B && B_timing && B_supervisor) shiftsTable.push(["B", B_timing, B_supervisor, ...(productionType === "meter" ? [lengthFormatter(B.production_meters)] : [numberFormatter(B.shots, "shot(s)"), numberFormatter(B.production, "pc(s)")]), weightFormatter(B.material), unitFormatter(B.electricity), secFormatter(tB.ontime), secFormatter(tB.unplannedDown), secFormatter(tB.plannedTotal)]);
                if (C && C_timing && C_supervisor) shiftsTable.push(["C", C_timing, C_supervisor, ...(productionType === "meter" ? [lengthFormatter(C.production_meters)] : [numberFormatter(C.shots, "shot(s)"), numberFormatter(C.production, "pc(s)")]), weightFormatter(C.material), unitFormatter(C.electricity), secFormatter(tC.ontime), secFormatter(tC.unplannedDown), secFormatter(tC.plannedTotal)]);
                moldsTable.push(...Object.entries(molds).map(([moldName, mold]) => {
                    const { details, stats } = mold;
                    const { product, productColor, productWeight, productWeight2, material, material2, multiComponent } = details;
                    const { electricity, idletime, material: _material, ontime, production, production_meters, shots } = stats;
                    const cycleTime = +(ontime / shots || 0).toFixed(0);
                    return [
                        moldName,
                        cycleTime + "s",
                        ...(productionType === "meter" ? [lengthFormatter(production_meters)] : [numberFormatter(shots, " shot(s)"),
                        numberFormatter(production, " pc(s)")]),
                        weightFormatter(_material),
                        unitFormatter(electricity),
                        secFormatter(ontime),
                        secFormatter(idletime),
                        product,
                        productColor,
                        `${productWeight}g${multiComponent ? ` | ${productWeight2}g` : ""}`,
                        `${material}${multiComponent ? ` | ${material2}` : ""}`
                    ]
                }));
                for (const hour of allHours.sort((a, b) => a.time - b.time)) {
                    const { from, time, shots, production, material_usage, electricity_usage, ontime, offtime, shutdown_time, production_meters, operator, mold_name, status } = hour;
                    if (shots === undefined) continue;
                    const avgCycleTime = +(ontime / shots || 0).toFixed(0);
                    hoursTable.push([
                        `${secToTime(from)} - ${secToTime(time)}`,
                        status ? "ON" : shutdown_time ? "OFF" : "IDLE",
                        ...(productionType === "meter" ? [lengthFormatter(production_meters)] : [numberFormatter(shots, " shot(s)"),
                        numberFormatter(production, " pc(s)")]),
                        weightFormatter(material_usage),
                        unitFormatter(electricity_usage),
                        secFormatter(ontime),
                        secFormatter(offtime),
                        secFormatter(shutdown_time || 0),
                        `${avgCycleTime}s`,
                        operator,
                        mold_name
                    ]);
                }
                tables["Shifts"] = shiftsTable;
                if (moldsTable.length > 2) tables["Molds"] = moldsTable;
                tables["Hours"] = hoursTable;

                if (data.phase_values) {
                    const daily = data.phase_values;
                    const formatVal = (val: number | undefined, decimals: number = 2) => {
                        if (val === undefined || isNaN(val)) return "-";
                        return val.toFixed(decimals);
                    };
                    const toKilo = (val: number | undefined) => {
                        if (val === undefined) return undefined;
                        return val / 1000;
                    };
                    const pDaily = (ph: any, powerKilo: boolean = false) => {
                        if (!ph) return ["-", "-", "-"];
                        if (powerKilo) {
                            return [formatVal(toKilo(ph.min), 3), formatVal(toKilo(ph.avg), 3), formatVal(toKilo(ph.max), 3)];
                        }
                        return [formatVal(ph.min, 1), formatVal(ph.avg, 1), formatVal(ph.max, 1)];
                    };
                    const pAmp = (ph: any) => {
                        if (!ph) return ["-", "-", "-"];
                        return [formatVal(ph.min, 3), formatVal(ph.avg, 3), formatVal(ph.max, 3)];
                    };
                    const pPF = (ph: any) => {
                        if (!ph) return ["-", "-", "-"];
                        return [formatVal(ph.min, 2), formatVal(ph.avg, 2), formatVal(ph.max, 2)];
                    };

                    const phaseSummaryTable = [
                        ["Metric", "SUM Min", "SUM Avg", "SUM Max", "L1 Min", "L1 Avg", "L1 Max", "L2 Min", "L2 Avg", "L2 Max", "L3 Min", "L3 Avg", "L3 Max"],
                        ["Voltage LN (V)", ...pDaily(daily.SUM.volt), ...pDaily(daily.R.volt), ...pDaily(daily.S.volt), ...pDaily(daily.T.volt)],
                        ["Line Voltage LL (V)", ...pDaily(daily.SUM.lineVoltage), ...pDaily(daily.R.lineVoltage), ...pDaily(daily.S.lineVoltage), ...pDaily(daily.T.lineVoltage)],
                        ["Current (A)", ...pAmp(daily.SUM.amp), ...pAmp(daily.R.amp), ...pAmp(daily.S.amp), ...pAmp(daily.T.amp)],
                        ["Active Power (kW)", ...pDaily(daily.SUM.power, true), ...pDaily(daily.R.power, true), ...pDaily(daily.S.power, true), ...pDaily(daily.T.power, true)],
                        ["Apparent Power (kVA)", ...pDaily(daily.SUM.apparentPower, true), ...pDaily(daily.R.apparentPower, true), ...pDaily(daily.S.apparentPower, true), ...pDaily(daily.T.apparentPower, true)],
                        ["Reactive Power (kVAR)", ...pDaily(daily.SUM.reactivePower, true), ...pDaily(daily.R.reactivePower, true), ...pDaily(daily.S.reactivePower, true), ...pDaily(daily.T.reactivePower, true)],
                        ["Power Factor", ...pPF(daily.SUM.powerFactor), ...pPF(daily.R.powerFactor), ...pPF(daily.S.powerFactor), ...pPF(daily.T.powerFactor)],
                        ["Frequency (Hz)", ...pDaily(daily.SUM.frequency), "-", "-", "-", "-", "-", "-", "-", "-", "-", "-", "-"],
                        ["Neutral Current (A)", ...pAmp(daily.SUM.neutralCurrent), "-", "-", "-", "-", "-", "-", "-", "-", "-", "-", "-"],
                        ["Voltage THD (%)", ...pDaily(daily.SUM.voltTHD), ...pDaily(daily.R.voltTHD), ...pDaily(daily.S.voltTHD), ...pDaily(daily.T.voltTHD)],
                        ["Current THD (%)", ...pDaily(daily.SUM.ampTHD), ...pDaily(daily.R.ampTHD), ...pDaily(daily.S.ampTHD), ...pDaily(daily.T.ampTHD)]
                    ];
                    tables["Daily Phase Summary"] = phaseSummaryTable;

                    const hourlyPhaseTable = [
                        ["Time", "Volt Min (V)", "Volt Avg (V)", "Volt Max (V)", "Amp Min (A)", "Amp Avg (A)", "Amp Max (A)", "Act. Power Min (kW)", "Act. Power Avg (kW)", "Act. Power Max (kW)", "PF Min", "PF Avg", "PF Max"]
                    ];
                    for (const hour of allHours.sort((a, b) => a.from - b.from)) {
                        if (hour.phase_values) {
                            const sumPhase = hour.phase_values.SUM;
                            hourlyPhaseTable.push([
                                `${secToTime(hour.from)} - ${secToTime(hour.time)}`,
                                formatVal(sumPhase.volt?.min, 1),
                                formatVal(sumPhase.volt?.avg, 1),
                                formatVal(sumPhase.volt?.max, 1),
                                formatVal(sumPhase.amp?.min, 3),
                                formatVal(sumPhase.amp?.avg, 3),
                                formatVal(sumPhase.amp?.max, 3),
                                formatVal(toKilo(sumPhase.power?.min), 3),
                                formatVal(toKilo(sumPhase.power?.avg), 3),
                                formatVal(toKilo(sumPhase.power?.max), 3),
                                formatVal((sumPhase.powerFactor as any)?.min, 2),
                                formatVal(sumPhase.powerFactor?.avg, 2),
                                formatVal((sumPhase.powerFactor as any)?.max, 2)
                            ]);
                        }
                    }
                    if (hourlyPhaseTable.length > 1) {
                        tables["Hourly Phase Summary (SUM)"] = hourlyPhaseTable;
                    }
                }

                await landscapePDF({
                    filename: `machine-report(${dayjs(parameters.date.from).format("DD-MM-YYYY")}).pdf`,
                    headings: {
                        left: "Daily Production Report",
                        middle: `${machineNames} | ${shiftsTitle}`,
                        right: dayjs(parameters.date.from).format("D MMM YYYY")
                    },
                    stats: {

                        ...(productionType !== "meter" && { "SHOTS :": numberFormatter(data.total.shots, " shot(s)") }),
                        "PRODUCTION :": productionType === "meter" ? lengthFormatter(data.total.production_meters) : `${numberFormatter(data.total.production - (data.rejectedPieces?.pieces || 0), " pc(s)")} ${data.rejectedPieces?.pieces ? `(+${data.rejectedPieces.pieces} rejected)` : ''}`,
                        "MATERIAL USAGE :": weightFormatter(data.total.material),
                        "ELECTRICITY USAGE :": unitFormatter(data.total.electricity),
                        "IDLE ELEC. USAGE :": unitFormatter(data.total.idle_electricity),
                        "ONTIME :": secFormatter(machineTiming.ontime),
                        "UNPLANNED DOWN :": secFormatter(machineTiming.unplannedDown),
                        "PLANNED DOWN :": secFormatter(machineTiming.plannedTotal),
                        "EFFICIENCY :": `${machineTiming.efficiency}%`,
                        "OPERATORS :": (data.shifts.A ? data.shifts.A.supervisor : "" + (data.shifts.B && "\n" + data.shifts.B.supervisor) + (data.shifts.C && "\n" + data.shifts.C.supervisor)).replaceAll("null", "").trim(),
                        "MATERIAL BREAKDOWN :": Object.entries(materialBreakdown).map(([key, value]) => `${key} : ${weightFormatter(value.weight, value.pc_weight)}`).join("\n"),
                    },
                    tables
                });

            } else {
                const tables = {} as {
                    [key: string]: string[][]
                };
                const shiftsTable = [["Shift", "Timing", "Operator", ...(productionType === "meter" ? [] : ["Shots"]), "Production", "Material", "Electricity", "On Time", "Unplanned Down", "Planned"]];
                const moldsTable = [["Mold", "Avg Cycle T.", ...(productionType === "meter" ? [] : ["Shots"]), "Production", "Material", "Electricity", "On Time", "Idle Time", "Product", "Color", "T. Weights", "Materials"]];
                const hoursTable = [["Date", ...(productionType === "meter" ? [] : ["Shots"]), "Production", "Material", "Electricity", "On Time", "Idle Time", "Off Time", "Avg. Cycle T.", "Operators", "Molds"]];

                const {
                    shifts,
                    molds,
                    allDays,
                    materialBreakdown
                } = data;
                const { A, B, C } = shifts;
                const { supervisor: A_supervisor, timing: A_timing } = A || {};
                const { supervisor: B_supervisor, timing: B_timing } = B || {};
                const { supervisor: C_supervisor, timing: C_timing } = C || {};
                const tA = getShiftTiming("A");
                const tB = getShiftTiming("B");
                const tC = getShiftTiming("C");
                if (A && A_timing && A_supervisor) shiftsTable.push(["A", A_timing, A_supervisor, ...(productionType === "meter" ? [lengthFormatter(A.production_meters)] : [numberFormatter(A.shots, "shot(s)")]), weightFormatter(A.material), unitFormatter(A.electricity), secFormatter(tA.ontime), secFormatter(tA.unplannedDown), secFormatter(tA.plannedTotal)]);
                if (B && B_timing && B_supervisor) shiftsTable.push(["B", B_timing, B_supervisor, ...(productionType === "meter" ? [lengthFormatter(B.production_meters)] : [numberFormatter(B.shots, "shot(s)")]), weightFormatter(B.material), unitFormatter(B.electricity), secFormatter(tB.ontime), secFormatter(tB.unplannedDown), secFormatter(tB.plannedTotal)]);
                if (C && C_timing && C_supervisor) shiftsTable.push(["C", C_timing, C_supervisor, ...(productionType === "meter" ? [lengthFormatter(C.production_meters)] : [numberFormatter(C.shots, "shot(s)")]), weightFormatter(C.material), unitFormatter(C.electricity), secFormatter(tC.ontime), secFormatter(tC.unplannedDown), secFormatter(tC.plannedTotal)]);

                moldsTable.push(...Object.entries(molds).map(([moldName, mold]) => {
                    const { details, stats } = mold;
                    const { product, productColor, productWeight, productWeight2, material, material2, multiComponent } = details;
                    const { electricity, idletime, material: _material, ontime, production, production_meters, shots } = stats;
                    const cycleTime: number = +(ontime / shots || 0).toFixed(0);
                    return [
                        moldName,
                        cycleTime + "s",
                        ...(productionType === "meter" ? [lengthFormatter(production_meters)] : [numberFormatter(shots, " shot(s)"),
                        numberFormatter(production, " pc(s)")]),
                        weightFormatter(_material),
                        unitFormatter(electricity),
                        secFormatter(ontime),
                        secFormatter(idletime),
                        product,
                        productColor,
                        `${productWeight}g${multiComponent ? ` | ${productWeight2}g` : ""}`,
                        `${material}${multiComponent ? ` | ${material2}` : ""}`
                    ]
                }));
                hoursTable.push(...allDays.map(day => {
                    const cycleTime = +(day.ontime / day.shots || 0).toFixed(0);
                    return [
                        day.date,
                        ...(productionType === "meter" ? [lengthFormatter(day.production_meters)] : [numberFormatter(day.shots, " shot(s)"),
                        numberFormatter(day.production, " pc(s)")]),
                        weightFormatter(day.material),
                        unitFormatter(day.electricity),
                        secFormatter(day.ontime),
                        secFormatter(day.idletime),
                        secFormatter(day.offtime),
                        cycleTime + "s",
                        day.operators,
                        day.molds
                    ]
                }));
                tables["Shifts"] = shiftsTable;
                if (moldsTable.length > 2) tables["Molds"] = moldsTable;
                tables["Days"] = hoursTable;

                const hasMultiDayPhase = allDays.some(d => !!d.phase_values);
                if (hasMultiDayPhase) {
                    const formatVal = (val: number | undefined, decimals: number = 2) => {
                        if (val === undefined || isNaN(val)) return "-";
                        return val.toFixed(decimals);
                    };
                    const toKilo = (val: number | undefined) => {
                        if (val === undefined) return undefined;
                        return val / 1000;
                    };
                    const dailyPhaseTable = [
                        ["Date", "Volt Min (V)", "Volt Avg (V)", "Volt Max (V)", "Amp Min (A)", "Amp Avg (A)", "Amp Max (A)", "Act. Power Min (kW)", "Act. Power Avg (kW)", "Act. Power Max (kW)", "Power Factor Avg"]
                    ];
                    for (const day of allDays) {
                        if (day.phase_values) {
                            const sumPhase = day.phase_values.SUM;
                            dailyPhaseTable.push([
                                day.date,
                                formatVal(sumPhase.volt?.min, 1),
                                formatVal(sumPhase.volt?.avg, 1),
                                formatVal(sumPhase.volt?.max, 1),
                                formatVal(sumPhase.amp?.min, 3),
                                formatVal(sumPhase.amp?.avg, 3),
                                formatVal(sumPhase.amp?.max, 3),
                                formatVal(toKilo(sumPhase.power?.min), 3),
                                formatVal(toKilo(sumPhase.power?.avg), 3),
                                formatVal(toKilo(sumPhase.power?.max), 3),
                                formatVal(sumPhase.powerFactor?.avg, 2)
                            ]);
                        }
                    }
                    tables["Daily Phase Summary (SUM)"] = dailyPhaseTable;
                }

                await landscapePDF({
                    filename: `machine-report(${dayjs(parameters.date.from).format("DD-MM-YYYY")} - ${dayjs(parameters.date.to).format("DD-MM-YYYY")}).pdf`,
                    headings: {
                        left: "Daily Production Report",
                        middle: `${machineNames} | ${shiftsTitle}`,
                        right: `${dayjs(parameters.date.from).format("D MMM YYYY")} - ${dayjs(parameters.date.to).format("D MMM YYYY")}`
                    },
                    stats: {
                        ...(productionType !== "meter" && { "SHOTS :": numberFormatter(data.total.shots, " shot(s)") }),
                        "PRODUCTION :": productionType === "meter" ? lengthFormatter(data.total.production_meters) : `${numberFormatter(data.total.production - (data.rejectedPieces?.pieces || 0), " pc(s)")}${data.rejectedPieces?.pieces ? `(+${data.rejectedPieces.pieces} rejected)` : ''}`, "MATERIAL USAGE :": weightFormatter(data.total.material),
                        "ELECTRICITY USAGE :": unitFormatter(data.total.electricity),
                        "IDLE ELEC. USAGE :": unitFormatter(data.total.idle_electricity),
                        "ONTIME :": secFormatter(machineTiming.ontime),
                        "UNPLANNED DOWN :": secFormatter(machineTiming.unplannedDown),
                        "PLANNED DOWN :": secFormatter(machineTiming.plannedTotal),
                        "EFFICIENCY :": `${machineTiming.efficiency}%`,
                        "OPERATORS :": (data.shifts.A ? data.shifts.A.supervisor : "" + (data.shifts.B && "\n" + data.shifts.B.supervisor) + (data.shifts.C && "\n" + data.shifts.C.supervisor)).replaceAll("null", "").trim(),
                        "MATERIAL BREAKDOWN :": Object.entries(materialBreakdown).map(([key, value]) => `${key} : ${weightFormatter(value.weight, value.pc_weight)}`).join("\n"),
                    },
                    tables
                });
            }
        } catch (err) {
            console.log(err);
            toast({
                title: "Error",
                description: "Something went wrong",
                status: "error",
                duration: 5000,
                isClosable: true,
            })
        }
        setIsBusy(false);
    };

    const downloadExcel = async () => {
        try {
            if (data === null || data === "NOT_FOUND") return;
            setIsBusy(true);
            const getShiftTiming = (key: "A" | "B" | "C") => {
                const sh = data.shifts[key];
                return computeTimingBreakdown(
                    sh?.ontime || 0,
                    sh?.idletime || 0,
                    sh?.offtime || 0,
                    shiftPlannedDowntime[key].idle,
                    shiftPlannedDowntime[key].off,
                    offtimeBasedEfficiency,
                );
            };
            if (isSingleDay) {
                const sections = [] as ExcelSectionType[];
                const shiftsSection: ExcelSectionType = {
                    mainHeading: "Each Shifts's Report",
                    subHeadings: ["Shift", "Timing", "Operator", "Shots (shots)", `Production (${productionType === "meter" ? "meter" : "pcs"})`, "Material (KGs)", "Electricity (kWhr)", "On Time", "Unplanned Idle", "Unplanned Off", "Planned"],
                    data: [] as ExcelSectionType['data'],
                    footer: []
                }
                const moldsSection: ExcelSectionType = {
                    mainHeading: "Each Mold's Report",
                    subHeadings: ["Mold", "Avg Cycle T.(sec)", "Shots (shots)", `Production (${productionType === "meter" ? "meter" : "pcs"})`, "Material (KGs)", "Electricity (kWhr)", "On Time", "Idle Time", "Product", "Color", "T. Weights", "Materials"],
                    data: [] as ExcelSectionType['data'],
                    footer: []
                }
                const hoursSection: ExcelSectionType = {
                    mainHeading: "Each Hour's Report",
                    subHeadings: ["Time", "Status", "Shots (shots)", `Production (${productionType === "meter" ? "meter" : "pcs"})`, "Material (KGs)", "Electricity (kWhr)", "On Time", "Idle Time", "Off Time", "Avg. Cycle T. (sec)", "Operator", "Mold"],
                    data: [] as ExcelSectionType['data'],
                    footer: ["Total", "", 0, 0, 0, 0, 0, 0, 0, "", "", ""] as ExcelSectionType["footer"] //here in footer next to the tootal pruction it should show the decremented rejected pieces as well
                }
                const {
                    shifts,
                    molds,
                    allHours,
                } = data;
                const { A, B, C } = shifts;
                const { supervisor: A_supervisor, timing: A_timing } = A || {};
                const { supervisor: B_supervisor, timing: B_timing } = B || {};
                const { supervisor: C_supervisor, timing: C_timing } = C || {};
                const tA = getShiftTiming("A");
                const tB = getShiftTiming("B");
                const tC = getShiftTiming("C");
                if (A && A_timing && A_supervisor) shiftsSection.data.push(["A", A_timing, A_supervisor, A.shots, productionType === "meter" ? A.production_meters : A.production, +(A.material / 1000).toFixed(2), +(A.electricity).toFixed(3), secFormatter(tA.ontime), secFormatter(tA.unplannedIdle), secFormatter(tA.unplannedOff), secFormatter(tA.plannedTotal)]);
                if (B && B_timing && B_supervisor) shiftsSection.data.push(["B", B_timing, B_supervisor, B.shots, productionType === "meter" ? B.production_meters : B.production, +(B.material / 1000).toFixed(2), +(B.electricity).toFixed(3), secFormatter(tB.ontime), secFormatter(tB.unplannedIdle), secFormatter(tB.unplannedOff), secFormatter(tB.plannedTotal)]);
                if (C && C_timing && C_supervisor) shiftsSection.data.push(["C", C_timing, C_supervisor, C.shots, productionType === "meter" ? C.production_meters : C.production, +(C.material / 1000).toFixed(2), +(C.electricity).toFixed(3), secFormatter(tC.ontime), secFormatter(tC.unplannedIdle), secFormatter(tC.unplannedOff), secFormatter(tC.plannedTotal)]);
                shiftsSection.footer = ["Total", "", "", data.total.shots, productionType === "meter" ? data.total.production_meters : (data.total.production - (data.rejectedPieces?.pieces || 0)), +(data.total.material / 1000).toFixed(2), +(data.total.electricity).toFixed(3), secFormatter(machineTiming.ontime), secFormatter(machineTiming.unplannedIdle), secFormatter(machineTiming.unplannedOff), secFormatter(machineTiming.plannedTotal)];
                sections.push(shiftsSection);
                let totalWeight = 0;
                const materials: string[] = [];
                moldsSection.data.push(...Object.entries(molds).map(([moldName, mold]) => {
                    const { details, stats } = mold;
                    const { product, productColor, productWeight, productWeight2, material, material2, multiComponent } = details;
                    if (details.materials === undefined) {
                        materials.push(`${material} ${weightFormatter(productWeight)}`);
                        totalWeight += productWeight;
                        if (multiComponent) {
                            materials.push(`${material2} ${weightFormatter(productWeight2)}`);
                            totalWeight += productWeight2;
                        }
                    } else {
                        details.materials.forEach(material => {
                            materials.push(`${material.name} ${weightFormatter(material.weight, material.pc_weight)}`);
                            totalWeight += material.weight;
                        })
                    }
                    const { electricity, idletime, material: _material, ontime, production, production_meters, shots } = stats;
                    const cycleTime = ontime && shots ? +(ontime / shots || 0).toFixed(0) : 0;
                    return [
                        moldName.toUpperCase(),
                        +cycleTime,
                        shots,
                        productionType === "meter" ? production_meters : production,
                        +(_material / 1000).toFixed(2),
                        +electricity.toFixed(3),
                        secFormatter(ontime),
                        secFormatter(idletime),
                        product,
                        productColor,
                        `${weightFormatter(totalWeight)}`,
                        materials.join(", ")
                    ]
                }));
                sections.push(moldsSection);
                for await (const hour of allHours.sort((a, b) => a.time - b.time)) {
                    if (hour.shots === undefined) continue;
                    (hoursSection.footer[2] as number) += hour.shots;
                    (hoursSection.footer[3] as number) += productionType === "meter" ? hour.production_meters : hour.production;
                    (hoursSection.footer[4] as number) += hour.material_usage;
                    (hoursSection.footer[5] as number) += hour.electricity_usage;
                    (hoursSection.footer[6] as number) += hour.ontime;
                    (hoursSection.footer[7] as number) += hour.offtime;
                    (hoursSection.footer[8] as number) += hour.shutdown_time || 0;
                    hoursSection.data.push([
                        `${secToTime(hour.from)} - ${secToTime(hour.time)}`,
                        hour.status ? "ON" : hour.shutdown_time ? "OFF" : "IDLE",
                        hour.shots,
                        productionType === "meter" ? hour.production_meters : hour.production,
                        +(hour.material_usage / 1000).toFixed(2),
                        +(hour.electricity_usage).toFixed(3),
                        secFormatter(hour.ontime),
                        secFormatter(hour.offtime),
                        secFormatter(hour.shutdown_time || 0),
                        hour.ontime && hour.shots ? +(hour.ontime / hour.shots || 0).toFixed(0) : 0,
                        hour.operator?.toUpperCase(),
                        hour.mold_name?.toUpperCase()
                    ]);
                }
                hoursSection.footer[4] = +(+hoursSection.footer[4] / 1000).toFixed(2);
                hoursSection.footer[5] = +(+hoursSection.footer[5]).toFixed(3);
                hoursSection.footer[6] = secFormatter(+hoursSection.footer[6]);
                hoursSection.footer[7] = secFormatter(+hoursSection.footer[7]);
                hoursSection.footer[8] = secFormatter(+hoursSection.footer[8]);

                if (productionType !== "meter") {
                    const totalProduction = hoursSection.footer[3] as number;
                    const rejectedPieces = data.rejectedPieces?.pieces || 0;
                    const goodProduction = totalProduction - rejectedPieces;
                    hoursSection.footer[3] = `${goodProduction} ( +${rejectedPieces} rejected)`;
                }

                sections.push(hoursSection);

                if (data.phase_values) {
                    const daily = data.phase_values;
                    const formatVal = (val: number | undefined, decimals: number = 2) => {
                        if (val === undefined || isNaN(val)) return "";
                        return +val.toFixed(decimals);
                    };
                    const toKilo = (val: number | undefined) => {
                        if (val === undefined) return undefined;
                        return val / 1000;
                    };
                    const pDaily = (ph: any, powerKilo: boolean = false) => {
                        if (!ph) return ["", "", ""];
                        if (powerKilo) {
                            return [formatVal(toKilo(ph.min), 3), formatVal(toKilo(ph.avg), 3), formatVal(toKilo(ph.max), 3)];
                        }
                        return [formatVal(ph.min, 1), formatVal(ph.avg, 1), formatVal(ph.max, 1)];
                    };
                    const pAmp = (ph: any) => {
                        if (!ph) return ["", "", ""];
                        return [formatVal(ph.min, 3), formatVal(ph.avg, 3), formatVal(ph.max, 3)];
                    };
                    const pPF = (ph: any) => {
                        if (!ph) return ["", "", ""];
                        return [formatVal(ph.min, 2), formatVal(ph.avg, 2), formatVal(ph.max, 2)];
                    };

                    const dailyPhaseSection: ExcelSectionType = {
                        mainHeading: "Daily Phase Comparison",
                        subHeadings: ["Metric", "SUM Min", "SUM Avg", "SUM Max", "L1 (R) Min", "L1 (R) Avg", "L1 (R) Max", "L2 (S) Min", "L2 (S) Avg", "L2 (S) Max", "L3 (T) Min", "L3 (T) Avg", "L3 (T) Max"],
                        data: [
                            ["Voltage LN (V)", ...pDaily(daily.SUM.volt), ...pDaily(daily.R.volt), ...pDaily(daily.S.volt), ...pDaily(daily.T.volt)],
                            ["Line Voltage LL (V)", ...pDaily(daily.SUM.lineVoltage), ...pDaily(daily.R.lineVoltage), ...pDaily(daily.S.lineVoltage), ...pDaily(daily.T.lineVoltage)],
                            ["Current (A)", ...pAmp(daily.SUM.amp), ...pAmp(daily.R.amp), ...pAmp(daily.S.amp), ...pAmp(daily.T.amp)],
                            ["Active Power (kW)", ...pDaily(daily.SUM.power, true), ...pDaily(daily.R.power, true), ...pDaily(daily.S.power, true), ...pDaily(daily.T.power, true)],
                            ["Apparent Power (kVA)", ...pDaily(daily.SUM.apparentPower, true), ...pDaily(daily.R.apparentPower, true), ...pDaily(daily.S.apparentPower, true), ...pDaily(daily.T.apparentPower, true)],
                            ["Reactive Power (kVAR)", ...pDaily(daily.SUM.reactivePower, true), ...pDaily(daily.R.reactivePower, true), ...pDaily(daily.S.reactivePower, true), ...pDaily(daily.T.reactivePower, true)],
                            ["Power Factor", ...pPF(daily.SUM.powerFactor), ...pPF(daily.R.powerFactor), ...pPF(daily.S.powerFactor), ...pPF(daily.T.powerFactor)],
                            ["Frequency (Hz)", ...pDaily(daily.SUM.frequency), "", "", "", "", "", "", "", "", "", "", ""],
                            ["Neutral Current (A)", ...pAmp(daily.SUM.neutralCurrent), "", "", "", "", "", "", "", "", "", "", ""],
                            ["Voltage THD (%)", ...pDaily(daily.SUM.voltTHD), ...pDaily(daily.R.voltTHD), ...pDaily(daily.S.voltTHD), ...pDaily(daily.T.voltTHD)],
                            ["Current THD (%)", ...pDaily(daily.SUM.ampTHD), ...pDaily(daily.R.ampTHD), ...pDaily(daily.S.ampTHD), ...pDaily(daily.T.ampTHD)]
                        ] as any,
                        footer: []
                    };
                    sections.push(dailyPhaseSection);

                    const hourlyPhaseSection: ExcelSectionType = {
                        mainHeading: "Hourly Phase Details",
                        subHeadings: ["Hour", "Phase", "Voltage Min (V)", "Voltage Avg (V)", "Voltage Max (V)", "Current Min (A)", "Current Avg (A)", "Current Max (A)", "Active Power Min (kW)", "Active Power Avg (kW)", "Active Power Max (kW)", "Apparent Power Min (kVA)", "Apparent Power Avg (kVA)", "Apparent Power Max (kVA)", "Reactive Power Min (kVAR)", "Reactive Power Avg (kVAR)", "Reactive Power Max (kVAR)", "Power Factor Min", "Power Factor Avg", "Power Factor Max"],
                        data: [] as ExcelSectionType['data'],
                        footer: []
                    };

                    const sortedHours = [...allHours].sort((a, b) => a.from - b.from);
                    for (const hour of sortedHours) {
                        if (hour.phase_values) {
                            const timeRange = `${secToTime(hour.from)} - ${secToTime(hour.time)}`;
                            const phases: ("SUM" | "R" | "S" | "T")[] = ["SUM", "R", "S", "T"];
                            for (const phKey of phases) {
                                const ph = hour.phase_values[phKey];
                                if (!ph) continue;
                                hourlyPhaseSection.data.push([
                                    phKey === "SUM" ? timeRange : "",
                                    phKey,
                                    formatVal(ph.volt?.min, 1),
                                    formatVal(ph.volt?.avg, 1),
                                    formatVal(ph.volt?.max, 1),
                                    formatVal(ph.amp?.min, 3),
                                    formatVal(ph.amp?.avg, 3),
                                    formatVal(ph.amp?.max, 3),
                                    formatVal(toKilo(ph.power?.min), 3),
                                    formatVal(toKilo(ph.power?.avg), 3),
                                    formatVal(toKilo(ph.power?.max), 3),
                                    formatVal(toKilo(ph.apparentPower?.min), 3),
                                    formatVal(toKilo(ph.apparentPower?.avg), 3),
                                    formatVal(toKilo(ph.apparentPower?.max), 3),
                                    formatVal(toKilo(ph.reactivePower?.min), 3),
                                    formatVal(toKilo(ph.reactivePower?.avg), 3),
                                    formatVal(toKilo(ph.reactivePower?.max), 3),
                                    formatVal(adjustPF(ph.powerFactor)?.min, 2),
                                    formatVal(adjustPF(ph.powerFactor)?.avg, 2),
                                    formatVal(adjustPF(ph.powerFactor)?.max, 2)
                                ]);
                            }
                        }
                    }
                    if (hourlyPhaseSection.data.length > 0) {
                        sections.push(hourlyPhaseSection);
                    }
                }

                await excelDownload({
                    filename: `machine-report(${dayjs(parameters.date.from).format("DD-MM-YYYY")}).xlsx`,
                    heading: `${machineNames} Report | ${shiftsTitle} (${dayjs(parameters.date.from).format("DD-MM-YYYY")})`,
                    sections,
                });
            } else {
                const sections = [] as ExcelSectionType[];
                const shiftsSection: ExcelSectionType = {
                    mainHeading: "Each Shifts's Report",
                    subHeadings: ["Shift", "Timing", "Operator", "Shots (shots)", `Production (${productionType === "meter" ? "meter" : "pcs"})`, "Material (KGs)", "Electricity (kWhr)", "On Time", "Unplanned Idle", "Unplanned Off", "Planned"],
                    data: [] as ExcelSectionType['data'],
                    footer: []
                }
                const moldsSection: ExcelSectionType = {
                    mainHeading: "Each Mold's Report",
                    subHeadings: ["Mold", "Avg Cycle T. (sec)", "Shots (shots)", `Production (${productionType === "meter" ? "meter" : "pcs"})`, "Material (KGs)", "Electricity (kWhr)", "On Time", "Idle Time", "Product", "Color", "T. Weights", "Materials"],
                    data: [] as ExcelSectionType['data'],
                    footer: []
                }
                const hoursSection: ExcelSectionType = {
                    mainHeading: "Each Day's Report",
                    subHeadings: ["Date", "Shots (shots)", `Production (${productionType === "meter" ? "meter" : "pcs"})`, "Material (KGs)", "Electricity (kWhr)", "On Time", "Idle Time", "Off Time", "Avg. Cycle T. (sec)", "Operators", "Molds"],
                    data: [] as ExcelSectionType['data'],
                    footer: ["Total", 0, 0, 0, 0, 0, 0, 0, "", "", ""] as ExcelSectionType["footer"]
                }

                const {
                    shifts,
                    molds,
                    allDays,
                } = data;
                const { A, B, C } = shifts;
                const { supervisor: A_supervisor, timing: A_timing } = A || {};
                const { supervisor: B_supervisor, timing: B_timing } = B || {};
                const { supervisor: C_supervisor, timing: C_timing } = C || {};
                const tA = getShiftTiming("A");
                const tB = getShiftTiming("B");
                const tC = getShiftTiming("C");

                if (A && A_timing && A_supervisor) shiftsSection.data.push(["A", A_timing, A_supervisor, A.shots, productionType === "meter" ? A.production_meters : A.production, +(A.material / 1000).toFixed(2), +(A.electricity).toFixed(3), secFormatter(tA.ontime), secFormatter(tA.unplannedIdle), secFormatter(tA.unplannedOff), secFormatter(tA.plannedTotal)]);
                if (B && B_timing && B_supervisor) shiftsSection.data.push(["B", B_timing, B_supervisor, B.shots, productionType === "meter" ? B.production_meters : B.production, +(B.material / 1000).toFixed(2), +(B.electricity).toFixed(3), secFormatter(tB.ontime), secFormatter(tB.unplannedIdle), secFormatter(tB.unplannedOff), secFormatter(tB.plannedTotal)]);
                if (C && C_timing && C_supervisor) shiftsSection.data.push(["C", C_timing, C_supervisor, C.shots, productionType === "meter" ? C.production_meters : C.production, +(C.material / 1000).toFixed(2), +(C.electricity).toFixed(3), secFormatter(tC.ontime), secFormatter(tC.unplannedIdle), secFormatter(tC.unplannedOff), secFormatter(tC.plannedTotal)]);
                shiftsSection.footer = ["Total", "", "", data.total.shots, productionType === "meter" ? data.total.production_meters : (data.total.production - (data.rejectedPieces?.pieces || 0)), +(data.total.material / 1000).toFixed(2), +(data.total.electricity).toFixed(3), secFormatter(machineTiming.ontime), secFormatter(machineTiming.unplannedIdle), secFormatter(machineTiming.unplannedOff), secFormatter(machineTiming.plannedTotal)];
                sections.push(shiftsSection);

                moldsSection.data.push(...Object.entries(molds).map(([moldName, mold]) => {
                    const { details, stats } = mold;
                    const { product, productColor, productWeight, productWeight2, material, material2, multiComponent } = details;
                    const { electricity, idletime, material: _material, ontime, production, production_meters, shots } = stats;
                    const cycleTime = +(ontime / shots || 0).toFixed(0);
                    return [
                        moldName.toUpperCase(),
                        cycleTime,
                        shots,
                        productionType === "meter" ? production_meters : production,
                        +(_material / 1000).toFixed(2),
                        +(electricity).toFixed(3),
                        secFormatter(ontime),
                        secFormatter(idletime),
                        product,
                        productColor,
                        `${productWeight}g${multiComponent ? ` | ${productWeight2}g` : ""}`,
                        `${material}${multiComponent ? ` | ${material2}` : ""}`
                    ]
                }));
                sections.push(moldsSection);

                hoursSection.data.push(...allDays.map(day => {
                    const cycleTime = +(day.ontime / day.shots || 0).toFixed(0);

                    (hoursSection.footer[1] as number) += day.shots;
                    (hoursSection.footer[2] as number) += productionType === "meter" ? day.production_meters : day.production;
                    (hoursSection.footer[3] as number) += day.material;
                    (hoursSection.footer[4] as number) += day.electricity;
                    (hoursSection.footer[5] as number) += day.ontime;
                    (hoursSection.footer[6] as number) += day.idletime;
                    (hoursSection.footer[7] as number) += day.offtime;

                    return [
                        day.date,
                        day.shots,
                        productionType === "meter" ? day.production_meters : day.production,
                        +(day.material / 1000).toFixed(2),
                        +(day.electricity).toFixed(3),
                        secFormatter(day.ontime),
                        secFormatter(day.idletime),
                        secFormatter(day.offtime),
                        +cycleTime,
                        day.operators,
                        day.molds
                    ]
                }));

                hoursSection.footer[1] = numberFormatter(+hoursSection.footer[1], "shot(s)");

                if (productionType !== "meter") {
                    const totalProduction = +hoursSection.footer[2];
                    const rejectedPieces = data.rejectedPieces?.pieces || 0;
                    const goodProduction = totalProduction - rejectedPieces;
                    hoursSection.footer[2] = rejectedPieces > 0 ?
                        `${numberFormatter(goodProduction, "pc(s)")} (+${rejectedPieces} rejected)` :
                        numberFormatter(totalProduction, "pc(s)");
                } else {
                    hoursSection.footer[2] = lengthFormatter(+hoursSection.footer[2]);
                }

                hoursSection.footer[3] = +(+hoursSection.footer[3] / 1000).toFixed(2);
                hoursSection.footer[4] = +(+hoursSection.footer[4]).toFixed(3);
                hoursSection.footer[5] = secFormatter(+hoursSection.footer[5]);
                hoursSection.footer[6] = secFormatter(+hoursSection.footer[6]);
                hoursSection.footer[7] = secFormatter(+hoursSection.footer[7]);

                sections.push(hoursSection);

                const hasMultiDayPhase = allDays.some(d => !!d.phase_values);
                if (hasMultiDayPhase) {
                    const formatVal = (val: number | undefined, decimals: number = 2) => {
                        if (val === undefined || isNaN(val)) return "";
                        return +val.toFixed(decimals);
                    };
                    const toKilo = (val: number | undefined) => {
                        if (val === undefined) return undefined;
                        return val / 1000;
                    };

                    const dailyPhaseSection: ExcelSectionType = {
                        mainHeading: "Daily Phase Comparison (SUM)",
                        subHeadings: ["Date", "Voltage Min (V)", "Voltage Avg (V)", "Voltage Max (V)", "Current Min (A)", "Current Avg (A)", "Current Max (A)", "Active Power Min (kW)", "Active Power Avg (kW)", "Active Power Max (kW)", "Power Factor Avg"],
                        data: [] as ExcelSectionType['data'],
                        footer: []
                    };

                    const dailyDetailsSection: ExcelSectionType = {
                        mainHeading: "Daily Phase Details",
                        subHeadings: ["Date", "Phase", "Voltage Min (V)", "Voltage Avg (V)", "Voltage Max (V)", "Current Min (A)", "Current Avg (A)", "Current Max (A)", "Active Power Min (kW)", "Active Power Avg (kW)", "Active Power Max (kW)", "Apparent Power Min (kVA)", "Apparent Power Avg (kVA)", "Apparent Power Max (kVA)", "Reactive Power Min (kVAR)", "Reactive Power Avg (kVAR)", "Reactive Power Max (kVAR)", "Power Factor Min", "Power Factor Avg", "Power Factor Max"],
                        data: [] as ExcelSectionType['data'],
                        footer: []
                    };

                    for (const day of allDays) {
                        if (day.phase_values) {
                            const sumPhase = day.phase_values.SUM;
                            dailyPhaseSection.data.push([
                                day.date,
                                formatVal(sumPhase.volt?.min, 1),
                                formatVal(sumPhase.volt?.avg, 1),
                                formatVal(sumPhase.volt?.max, 1),
                                formatVal(sumPhase.amp?.min, 3),
                                formatVal(sumPhase.amp?.avg, 3),
                                formatVal(sumPhase.amp?.max, 3),
                                formatVal(toKilo(sumPhase.power?.min), 3),
                                formatVal(toKilo(sumPhase.power?.avg), 3),
                                formatVal(toKilo(sumPhase.power?.max), 3),
                                formatVal(sumPhase.powerFactor?.avg, 2)
                            ]);

                            const phases: ("SUM" | "R" | "S" | "T")[] = ["SUM", "R", "S", "T"];
                            for (const phKey of phases) {
                                const ph = day.phase_values[phKey];
                                if (!ph) continue;
                                dailyDetailsSection.data.push([
                                    phKey === "SUM" ? day.date : "",
                                    phKey,
                                    formatVal(ph.volt?.min, 1),
                                    formatVal(ph.volt?.avg, 1),
                                    formatVal(ph.volt?.max, 1),
                                    formatVal(ph.amp?.min, 3),
                                    formatVal(ph.amp?.avg, 3),
                                    formatVal(ph.amp?.max, 3),
                                    formatVal(toKilo(ph.power?.min), 3),
                                    formatVal(toKilo(ph.power?.avg), 3),
                                    formatVal(toKilo(ph.power?.max), 3),
                                    formatVal(toKilo(ph.apparentPower?.min), 3),
                                    formatVal(toKilo(ph.apparentPower?.avg), 3),
                                    formatVal(toKilo(ph.apparentPower?.max), 3),
                                    formatVal(toKilo(ph.reactivePower?.min), 3),
                                    formatVal(toKilo(ph.reactivePower?.avg), 3),
                                    formatVal(toKilo(ph.reactivePower?.max), 3),
                                    formatVal(adjustPF(ph.powerFactor)?.min, 2),
                                    formatVal(adjustPF(ph.powerFactor)?.avg, 2),
                                    formatVal(adjustPF(ph.powerFactor)?.max, 2)
                                ]);
                            }
                        }
                    }

                    sections.push(dailyPhaseSection);
                    sections.push(dailyDetailsSection);
                }

                await excelDownload({
                    filename: `machine-report(${dayjs(parameters.date.from).format("DD-MM-YYYY")} - ${dayjs(parameters.date.to).format("DD-MM-YYYY")}).xlsx`,
                    heading: `${machineNames} Report | ${shiftsTitle} (${dayjs(parameters.date.from).format("DD-MM-YYYY")} - ${dayjs(parameters.date.to).format("DD-MM-YYYY")})`,
                    sections,
                });
            }
        } catch (err) {
            console.log(err);
            toast({
                title: "Error",
                description: "Something went wrong",
                status: "error",
                duration: 5000,
                isClosable: true,
            })
        }
        setIsBusy(false);
    };

    const debug = async () => {
        setIsBusy(true);
        // create json data and rawData and download as {date}.json
        try {
            const dateStr = dayjs(parameters.date.from).format("YYYY-MM-DD");
            const debugObj = {
                data,
                rawData
            };
            const jsonData = JSON.stringify(debugObj, null, 2);
            const blob = new Blob([jsonData], { type: "application/json" });
            const url = URL.createObjectURL(blob);

            const a = document.createElement("a");
            a.href = url;
            a.download = `${dateStr}-${(parameters.option as Option)?.label || "machine"}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (err) {
            toast({
                title: "Error",
                description: "Failed to download debug JSON",
                status: "error",
                duration: 5000,
                isClosable: true,
            });
        }
        setIsBusy(false);
    }

    const isDebugAllowed = useMemo(() => {
        const uid = store.get(uidAtom);
        return uid === process.env.REACT_APP_DEBUG_USER;
    }, []);

    return (
        <Flex gap={5} flexDir={"column"}>
            <Box display="flex" alignItems={"center"} justifyContent="space-between">
                <Text fontWeight={600}>Machine Report: <span style={{
                    color: "var(--chakra-colors-primary)",
                    fontWeight: 500,
                    fontSize: "0.8rem"
                }}>{selectedTitle}</span>
                    {data && data !== "NOT_FOUND" && !data.completed && (
                        <Badge colorScheme="red" variant="solid" ml={2}>
                            Incomplete
                        </Badge>
                    )}
                </Text>
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
                    {isDebugAllowed && data && data !== "NOT_FOUND" && !Array.isArray(parameters.option) && parameters.option !== null && isSingleDay && (<Text onClick={() => { !isBusy && debug() }} userSelect={"none"} cursor={"pointer"} transition="all ease 0.2s" _hover={{
                        color: "primary"
                    }} fontWeight={600} fontSize="sm" display="flex" alignItems={"center"} justifyContent="space-between" gap={1} color="orange.300">
                        <TbBug />
                        Debug
                    </Text>)}
                    {data && data !== "NOT_FOUND" && !Array.isArray(parameters.option) && parameters.option !== null && isSingleDay && (
                        <Text
                            userSelect={"none"}
                            cursor={"pointer"}
                            transition="all ease 0.2s"
                            _hover={{
                                color: "primary"
                            }}
                            fontWeight={600}
                            fontSize="sm"
                            display="flex"
                            alignItems={"center"}
                            justifyContent="space-between"
                            gap={1}
                            color="orange.300"
                            onClick={onOpen}
                        >
                            <MdOutlineBrokenImage />
                            Add Rejected Pieces
                        </Text>
                    )}

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
                        toast({
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

            {!Array.isArray(parameters.option) && parameters.option !== null && data !== null && data !== "NOT_FOUND" && isSingleDay && (
                <UpdateRejectedPiecesModal
                    isOpen={isOpen}
                    onClose={onClose}
                    machineId={parameters.option.value}
                    date={dayjs(parameters.date.from).format("YYYY-MM-DD")}
                    onUpdate={() => setRefreshTrigger(prev => prev + 1)}
                    totalProduction={data.total.production}
                    rejected={data.rejectedPieces}
                    molds={data.molds}
                    moldsByShift={data.moldsByShift}
                    shifts={data.shifts}
                />
            )}

            {data === null ?
                <MyCard as={Center} minH="50vh">
                    <SmallFill />
                </MyCard> :
                data === "NOT_FOUND" ?
                    <MyCard as={Center} minH="50vh">
                        <NotFound />
                    </MyCard> :
                    <Flex gap={5} flexDir="column">

                        <MachineTotal
                            isSingleDay={isSingleDay}
                            data={data}
                            rejectedPieces={data.rejectedPieces}
                            plannedDowntime={plannedDowntime}
                            shiftPlannedDowntime={shiftPlannedDowntime}
                        />

                        {isSingleDay && <HourlyBreakdown data={displayTree} notFound={false} />}
                        {!Array.isArray(parameters.option) && parameters.option !== null && (
                            <DowntimeReport
                                machineId={parameters.option.value}
                                machineName={parameters.option.label}
                                isSingleDay={isSingleDay}
                                segments={isSingleDay ? data.downtimeSegments || [] : []}
                                fromDate={downtimeFrom}
                                toDate={downtimeTo}
                                entries={downtimeEntries}
                                loading={downtimeLoading}
                                upsert={upsertDowntime}
                                allowedShifts={downtimeShifts}
                                scheduleAllowanceSec={scheduleAllowanceSec}
                            />
                        )}
                        <PhaseReportSection data={data} isSingleDay={isSingleDay} />
                        <InsightsAndMold
                            insights={data.insights}
                            materialBreakdown={data.materialBreakdown}
                            molds={data.molds}
                        />
                    </Flex>
            }
        </Flex>
    )
}

export type { DataToSet };
export default MachineReport;
