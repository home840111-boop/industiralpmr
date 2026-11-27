import { Box, Center, Flex, Stack, Text, useToast, VStack } from "@chakra-ui/react"
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
import { factoriesAtom, selectedFactoryAtom, uidAtom } from "../../../../Components/Store/atoms"
import Get from "../../../../Components/Store/hooks/Get"
import { Option, ReportSubmitType } from "../../Selector/types"
import { Hours, shifts, SimpleStats } from "../FactoryReport"
import secondsToHourMin from "../../../../Components/Functions/converters/secondsToHourMin"
import insertUnitOffSessions from "../../../../Components/Functions/formatters/insertUnitOffSessions"
import secToTime from "../../../../Components/Functions/converters/secondsToHourMin"
import { Insigts, SortedHourTree } from "../../../Machines/Machine/types"
import sortHourlyTree from "../../../../Components/Functions/formatters/hourlyTree"
import HourlyBreakdown from "../../../Machines/Machine/HourlyBreakdown"
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
import MachineTotal from "../MachineReport/MachineTotal"
import InsightsAndMold from "../MachineReport/InsightsAndMold"

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
    idle_electricity: number,
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
}
interface ShiftStats extends shifts {
    ontime: number;
    idletime: number;
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
    molds: string
}
interface DataToSet {
    total: Stats,
    shifts: {
        A: ShiftStats,
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
}

const MoldReport = ({
    parameters
}: {
    parameters: ReportSubmitType["mold"]
}) => {
    const toast = useToast();
    const [data, setData] = useState<null | DataToSet | "NOT_FOUND">(null);
    const [isBusy, setIsBusy] = useState(false);
    const factories = Get(factoriesAtom);
    const selectedFactory = Get(selectedFactoryAtom);
    const isSingleDay = useMemo(() => {
        const isSingleDay = dayjs(parameters.date.from).isSame(parameters.date.to, "day");
        return isSingleDay;
    }, [parameters]);
    const [machineNames, moldsNames] = useMemo(() => {
        const molds = ((parameters.secondaryOption as Option[])?.map((option) => option.label) || []).join(", ");
        if (parameters.option === null) return ["", molds];
        if (!Array.isArray(parameters.option)) return [parameters.option?.label, molds];
        return [parameters.option?.map((option) => option.label).join(", "), molds];
    }, [parameters]);
    const selectedTitle = useMemo(() => {
        if (parameters.date.from?.toDateString() === parameters.date.to?.toDateString()) return `${machineNames} | ${moldsNames} | ` + dayjs(parameters.date.from).format("DD MMM, YY");
        return `${machineNames} | ${dayjs(parameters.date.from).format("DD MMM, YY")} - ${dayjs(parameters.date.to).format("DD MMM, YY")}`;
    }, [parameters, machineNames, moldsNames]);

    useEffect(() => {
        if (!factories || !selectedFactory) return;
        const func = async () => {
            setData(null);
            const mySelectedFactory = factories[selectedFactory.value];
            const isSingleMachine = !Array.isArray(parameters.option);
            const molds = (parameters.secondaryOption as Option[])?.map((option) => option.value) || [];
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
                    A: {
                        shots: 0,
                        production_meters: 0,
                        production: 0,
                        material: 0,
                        electricity: 0,
                        ontime: 0,
                        idletime: 0,
                        supervisor: "",
                        timing: ""
                    },
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
                materialBreakdown: {} as MaterialBreakdownType
            };
            const machine = parameters.option && !Array.isArray(parameters.option) ? parameters.option.value : "";
            if (isSingleDay) {
                const date = dayjs(parameters.date.from).format("YYYY-MM-DD");
                if (isSingleMachine) {
                    const [machineUnitSnap, shiftSnap, dailySnap, hourlySnap] = await Promise.all([
                        get(`machines/${machine}/unit`),
                        get(`reports/factory/daily/${date}`),
                        get(`reports/machines/${machine}/daily/${date}`),
                        get(`reports/machines/${machine}/hourly/${date}`)
                    ]);
                    const dailyData = dailySnap.val();
                    let hasMold = false;
                    const newMolds = Object.fromEntries(Object.entries(dailyData?.molds || {}).map(([key, value]) => [key.toLowerCase(), value]));
                    dailyData.molds = newMolds;
                    for (const mold of molds) if (dailyData?.molds?.[mold]) hasMold = true;
                    if (!shiftSnap.exists() || !dailySnap.exists() || !hourlySnap.exists() || !hasMold) {
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
                    const unit = machineUnitSnap.val() || 1;
                    let hourlyData = Object.fromEntries(Object.entries(hourlySnap.val()).filter(([key, value]) => {
                        const hour = value as any;
                        hour.mold_name = hour.mold_name || "NA";
                        return molds.includes(hour.mold_name?.toLowerCase());
                    })) as any;
                    dataToSet.shifts.A.supervisor = Object.keys(dailyData?.total?.operators?.A || {}).join(", ") || "";
                    if (shiftData.shifts === 1) {
                        dataToSet.shifts.A.timing = `${secondsToHourMin(+shiftData.shift_a_start || 0)} - ${secondsToHourMin(+shiftData.shift_a_start || 0)}`
                    } else if (shiftData.shifts === 2) {
                        dataToSet.shifts.B = {
                            shots: 0,
                            production_meters: 0,
                            production: 0,
                            electricity: 0,
                            material: 0,
                            ontime: 0,
                            idletime: 0,
                            timing: "",
                            supervisor: ""
                        };
                        dataToSet.shifts.B.supervisor = Object.keys(dailyData?.total?.operators?.B || {}).join(", ") || "";
                        dataToSet.shifts.A.timing = `${secondsToHourMin(+shiftData.shift_a_start || 0)} - ${secondsToHourMin(+shiftData.shift_b_start || 0)}`
                        dataToSet.shifts.B.timing = `${secondsToHourMin(+shiftData.shift_b_start || 0)} - ${secondsToHourMin(+shiftData.shift_a_start || 0)}`
                    } else {
                        dataToSet.shifts.B = {
                            shots: 0,
                            production_meters: 0,
                            production: 0,
                            electricity: 0,
                            material: 0,
                            ontime: 0,
                            idletime: 0,
                            timing: "",
                            supervisor: ""
                        };
                        dataToSet.shifts.C = {
                            shots: 0,
                            production_meters: 0,
                            production: 0,
                            electricity: 0,
                            material: 0,
                            ontime: 0,
                            idletime: 0,
                            timing: "",
                            supervisor: ""
                        };
                        dataToSet.shifts.B.supervisor = Object.keys(dailyData?.total?.operators?.B || {}).join(", ") || "";
                        dataToSet.shifts.C.supervisor = Object.keys(dailyData?.total?.operators?.C || {}).join(", ") || "";
                        dataToSet.shifts.A.timing = `${secondsToHourMin(+shiftData.shift_a_start || 0)} - ${secondsToHourMin(+shiftData.shift_b_start || 0)}`
                        dataToSet.shifts.B.timing = `${secondsToHourMin(+shiftData.shift_b_start || 0)} - ${secondsToHourMin(+shiftData.shift_c_start || 0)}`
                        dataToSet.shifts.C.timing = `${secondsToHourMin(+shiftData.shift_c_start || 0)} - ${secondsToHourMin(+shiftData.shift_a_start || 0)}`
                    }
                    const totals = {
                        shots: 0,
                        production: 0,
                        production_meters: 0,
                        electricity: 0,
                        material: 0,
                        ontime: 0,
                        idletime: 0,
                        idle_electricity: 0,
                    }
                    const myMaterialBreakdown: {
                        [key: string]: {
                            weight: number;
                            pc_weight: number | null;
                        }
                    } = {};
                    for (const mold of molds) {
                        if (!dailyData.molds[mold]) continue;
                        const moldData = dailyData.molds[mold].stats;
                        totals.shots += +moldData.shots || 0;
                        totals.production += +moldData.production || 0;
                        totals.production_meters += +moldData.production_meters || 0;
                        totals.electricity += +moldData.electricity_usage || 0;
                        totals.material += +moldData.material_usage || 0;
                        totals.ontime += +moldData.ontime || 0;
                        totals.idletime += +moldData.offtime || 0;
                        const materials = dailyData.molds[mold].details.materials;
                        for (const material of materials) {
                            const { name, weight } = material;
                            if (!myMaterialBreakdown[name]) myMaterialBreakdown[name] = {
                                weight: 0,
                                pc_weight: material.pc_weight || null
                            }
                            myMaterialBreakdown[name].weight += weight * moldData.production;
                        }
                    }
                    dataToSet.total = {
                        ...totals,
                        offtime: shiftData?.unit_power ? shiftData?.unit_power[unit]?.total || 0 : 0,
                    }
                    dataToSet.materialBreakdown = myMaterialBreakdown;
                    for (const moldName of molds) {
                        if (!dailyData.molds[moldName]) continue;
                        const mold = dailyData.molds[moldName];
                        dataToSet.molds[moldName] = {
                            details: {
                                cavities: +mold.details.cavities || 1,
                                material: mold.details.material || "",
                                material2: mold.details.material_2 || "",
                                multiComponent: !!mold.details.multi_component,
                                product: mold.details.product || "",
                                productColor: mold.details.product_color || "",
                                productWeight: +mold.details.product_weight || 1,
                                productWeight2: +mold.details.product_weight_2 || 0,
                                materials: mold.details.materials
                            },
                            stats: {
                                electricity: +mold.stats.electricity_usage || 0,
                                production_meters: +mold.stats.production_meters || 0,
                                idle_electricity: 0,
                                idletime: +mold.stats.offtime || 0,
                                ontime: +mold.stats.ontime || 0,
                                material: +mold.stats.material_usage || 0,
                                production: +mold.stats.production || 0,
                                shots: +mold.stats.shots || 0
                            }
                        };
                    }
                    if (dataToSet.total.offtime) {
                        hourlyData = await insertUnitOffSessions(
                            hourlyData,
                            shiftData?.unit_power[unit]?.sessions,
                            +shiftData.shift_a_start,
                            date,
                        );
                        if ((dataToSet.total.offtime + dataToSet.total.ontime + dataToSet.total.idletime) > 86400) {
                            // find the difference
                            const diff = (dataToSet.total.offtime + dataToSet.total.ontime + dataToSet.total.idletime) - 86400;
                            // add the difference to offtime
                            dataToSet.total.idletime -= diff;
                        }
                    }
                    const shifts = {
                        A: shiftData.shift_a_start,
                        B: shiftData.shift_b_start,
                        C: shiftData.shift_c_start,
                        shifts: shiftData.shifts
                    }
                    const hourlyTreeData = await sortHourlyTree(shifts, hourlyData);
                    dataToSet.tree = hourlyTreeData;
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
                    for await (const _hour of Object.values(rawHours)) {
                        const hour = _hour as any;
                        const start = new Date(hour.from * 1000).getTime() / 1000;
                        const end = new Date(hour.time * 1000).getTime() / 1000;
                        allHours.push({
                            ...hour,
                            operator: hour.operator || "NA",
                            mold: hour.mold_name || "NA"
                        });
                        // check which hour it belongs to
                        const hourIndex = hours.findIndex(
                            (hour) => start >= hour._start && end <= hour._end,
                        );
                        if (hourIndex === -1) continue;
                        const foundHour = hours[hourIndex];
                        foundHour.found = true;
                        foundHour.shots += hour.shots;
                        foundHour.production += hour.production;
                        foundHour.production_meters += hour.production_meters;
                        foundHour.material += hour.material_usage;
                        foundHour.electricity += hour.electricity_usage;
                        if (hour.offtime) dataToSet.total.idle_electricity += hour.electricity_usage;
                        foundHour.ontime += hour.ontime;
                        foundHour.idletime += hour.offtime;
                    }
                    dataToSet.allHours = allHours;
                    for await (const hour of hours) {
                        const { _start } = hour;
                        dataToSet.hours.push({
                            electricity: hour.electricity,
                            production_meters: hour.production_meters,
                            material: hour.material,
                            production: hour.production,
                            shots: hour.shots,
                            ontime: hour.ontime,
                            idletime: hour.idletime,
                            time: `${hour.start} - ${hour.end}`
                        });
                        if (shiftData.shifts === 1) {
                            dataToSet.shifts.A.shots += hour.shots;
                            dataToSet.shifts.A.production_meters += hour.production_meters;
                            dataToSet.shifts.A.production += hour.production;
                            dataToSet.shifts.A.electricity += hour.electricity;
                            dataToSet.shifts.A.material += hour.material;
                            dataToSet.shifts.A.ontime += hour.ontime;
                            dataToSet.shifts.A.idletime += hour.idletime;
                        } else if (shiftData.shifts === 2) {
                            if (_start < +shiftData.shift_b_start) {
                                dataToSet.shifts.A.shots += hour.shots;
                                dataToSet.shifts.A.production_meters += hour.production_meters;
                                dataToSet.shifts.A.production += hour.production;
                                dataToSet.shifts.A.electricity += hour.electricity;
                                dataToSet.shifts.A.material += hour.material;
                                dataToSet.shifts.A.ontime += hour.ontime;
                                dataToSet.shifts.A.idletime += hour.idletime;
                            } else if (dataToSet.shifts.B) {
                                dataToSet.shifts.B.shots += hour.shots;
                                dataToSet.shifts.B.production += hour.production;
                                dataToSet.shifts.B.electricity += hour.electricity;
                                dataToSet.shifts.B.material += hour.material;
                                dataToSet.shifts.B.ontime += hour.ontime;
                                dataToSet.shifts.B.idletime += hour.idletime;
                            }
                        } else {
                            if (_start < +shiftData.shift_b_start) {
                                dataToSet.shifts.A.shots += hour.shots;
                                dataToSet.shifts.A.production_meters += hour.production_meters;
                                dataToSet.shifts.A.production += hour.production;
                                dataToSet.shifts.A.electricity += hour.electricity;
                                dataToSet.shifts.A.material += hour.material;
                                dataToSet.shifts.A.ontime += hour.ontime;
                                dataToSet.shifts.A.idletime += hour.idletime;
                            } else if (_start < +shiftData.shift_c_start && dataToSet.shifts.B) {
                                dataToSet.shifts.B.shots += hour.shots;
                                dataToSet.shifts.B.production_meters += hour.production_meters;
                                dataToSet.shifts.B.production += hour.production;
                                dataToSet.shifts.B.electricity += hour.electricity;
                                dataToSet.shifts.B.material += hour.material;
                                dataToSet.shifts.B.ontime += hour.ontime;
                                dataToSet.shifts.B.idletime += hour.idletime;
                            } else if (dataToSet.shifts.C) {
                                dataToSet.shifts.C.shots += hour.shots;
                                dataToSet.shifts.C.production_meters += hour.production_meters;
                                dataToSet.shifts.C.production += hour.production;
                                dataToSet.shifts.C.electricity += hour.electricity;
                                dataToSet.shifts.C.material += hour.material;
                                dataToSet.shifts.C.ontime += hour.ontime;
                                dataToSet.shifts.C.idletime += hour.idletime;
                            }
                        }
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
                    dataToSet.total.production_meters / dataToSet.total.electricity
                ).toFixed(2);
                dataToSet.insights.unitsPerMeter = +(
                    dataToSet.total.electricity / dataToSet.total.production_meters
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
                for await (const key of Object.keys(shiftDatas)) {
                    const date = key as string;
                    let shiftData = shiftDatas[date];
                    const data = dailyDatas[date];
                    if (!data) continue;
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
                    // data.molds
                    let hasMold = false;
                    const newMolds = Object.fromEntries(Object.entries(data?.molds || {}).map(([key, value]) => [key.toLowerCase(), value]));
                    data.molds = newMolds;
                    for (const mold of molds) if (data?.molds?.[mold]) hasMold = true;
                    if (!hasMold) continue;
                    const day: AllDay = {
                        date: dayjs(date).format("DD MMM, YY"),
                        electricity: 0,
                        production_meters: 0,
                        idle_electricity: 0,
                        idletime: 0,
                        material: 0,
                        molds: "",
                        offtime: shiftData?.unit_power ? shiftData?.unit_power[unit]?.total || 0 : 0,
                        ontime: 0,
                        operators: "",
                        production: 0,
                        shots: 0
                    };
                    const operators = [
                        Object.keys(data?.total?.operators?.A || {}).join(", ") || ""
                    ];
                    const moldsNames = [];
                    supervisors.A.name.add(Object.keys(data?.total?.operators?.A || {}).join(", ") || "");
                    if (shiftData.shifts === 1) {
                        supervisors.A.time.add(`${secondsToHourMin(+shiftData.shift_a_start || 0)} - ${secondsToHourMin(+shiftData.shift_a_start || 0)}`);
                    } else if (shiftData.shifts === 2) {
                        if (dataToSet.shifts.B === null) dataToSet.shifts.B = {
                            shots: 0,
                            production_meters: 0,
                            production: 0,
                            electricity: 0,
                            material: 0,
                            ontime: 0,
                            idletime: 0,
                            timing: "",
                            supervisor: ""
                        };
                        operators.push(Object.keys(data?.total?.operators?.B || {}).join(", ") || "");
                        supervisors.B.name.add(Object.keys(data?.total?.operators?.B || {}).join(", ") || "");
                        supervisors.A.time.add(`${secondsToHourMin(+shiftData.shift_a_start || 0)} - ${secondsToHourMin(+shiftData.shift_b_start || 0)}`);
                        supervisors.B.time.add(`${secondsToHourMin(+shiftData.shift_b_start || 0)} - ${secondsToHourMin(+shiftData.shift_a_start || 0)}`);
                    } else {
                        if (dataToSet.shifts.B === null) dataToSet.shifts.B = {
                            shots: 0,
                            production_meters: 0,
                            production: 0,
                            electricity: 0,
                            material: 0,
                            ontime: 0,
                            idletime: 0,
                            timing: "",
                            supervisor: ""
                        };
                        if (dataToSet.shifts.C === null) dataToSet.shifts.C = {
                            shots: 0,
                            production_meters: 0,
                            production: 0,
                            electricity: 0,
                            material: 0,
                            ontime: 0,
                            idletime: 0,
                            timing: "",
                            supervisor: ""
                        };
                        operators.push(Object.keys(data?.total?.operators?.B || {}).join(", ") || "");
                        operators.push(Object.keys(data?.total?.operators?.C || {}).join(", ") || "");
                        supervisors.B.name.add(Object.keys(data?.total?.operators?.B || {}).join(", ") || "");
                        supervisors.C.name.add(Object.keys(data?.total?.operators?.C || {}).join(", ") || "");
                        supervisors.A.time.add(`${secondsToHourMin(+shiftData.shift_a_start || 0)} - ${secondsToHourMin(+shiftData.shift_b_start || 0)}`);
                        supervisors.B.time.add(`${secondsToHourMin(+shiftData.shift_b_start || 0)} - ${secondsToHourMin(+shiftData.shift_c_start || 0)}`);
                        supervisors.C.time.add(`${secondsToHourMin(+shiftData.shift_c_start || 0)} - ${secondsToHourMin(+shiftData.shift_a_start || 0)}`);
                    }
                    for (const key of Object.keys(data.molds || {})) {
                        const moldName = key as string;
                        if (!molds.includes(moldName)) continue;
                        moldsNames.push(moldName);
                        const mold = data.molds[key];
                        dataToSet.total.shots += mold.stats?.shots || 0;
                        dataToSet.total.production += mold.stats?.production || 0;
                        dataToSet.total.production_meters += mold.stats?.production_meters || 0;
                        dataToSet.total.electricity += mold.stats?.electricity_usage || 0;
                        dataToSet.total.material += mold.stats?.material_usage || 0;
                        dataToSet.total.ontime += mold.stats?.ontime || 0;
                        dataToSet.total.idletime += mold.stats?.offtime || 0;
                        dataToSet.total.offtime += shiftData?.unit_power ? shiftData?.unit_power[unit]?.total || 0 : 0;
                        day.shots += mold.stats?.shots || 0;
                        day.production_meters += mold.stats?.production_meters || 0;
                        day.production += mold.stats?.production || 0;
                        day.electricity += mold.stats?.electricity_usage || 0;
                        day.material += mold.stats?.material_usage || 0;
                        day.ontime += mold.stats?.ontime || 0;
                        day.idletime += mold.stats?.offtime || 0;
                        if (!dataToSet.materialBreakdown) dataToSet.materialBreakdown = {};
                        for (const material of mold?.details?.materials) {
                            const { name } = material;
                            if (!dataToSet.materialBreakdown[name]) dataToSet.materialBreakdown[name] = {
                                weight: 0,
                                pc_weight: material.pc_weight
                            }
                            dataToSet.materialBreakdown[name].weight += material.weight * mold.stats.production;
                        }
                        if (!dataToSet.molds[moldName]) {
                            dataToSet.molds[moldName] = {
                                details: {
                                    cavities: +mold.details.cavities || 1,
                                    material: mold.details.material || "",
                                    material2: mold.details.material_2 || "",
                                    multiComponent: !!mold.details.multi_component,
                                    product: mold.details.product || "",
                                    productColor: mold.details.product_color || "",
                                    productWeight: +mold.details.product_weight || 1,
                                    productWeight2: +mold.details.product_weight_2 || 0,
                                    materials: mold.details.materials
                                },
                                stats: {
                                    electricity: +mold.stats.electricity_usage || 0,
                                    idle_electricity: 0,
                                    idletime: +mold.stats.offtime || 0,
                                    production_meters: +mold.stats.production_meters || 0,
                                    ontime: +mold.stats.ontime || 0,
                                    material: +mold.stats.material_usage || 0,
                                    production: +mold.stats.production || 0,
                                    shots: +mold.stats.shots || 0
                                }
                            };
                        } else {
                            dataToSet.molds[moldName].stats.electricity += +mold.stats.electricity_usage || 0;
                            dataToSet.molds[moldName].stats.idletime += +mold.stats.offtime || 0;
                            dataToSet.molds[moldName].stats.production_meters += +mold.stats.production_meters || 0;
                            dataToSet.molds[moldName].stats.ontime += +mold.stats.ontime || 0;
                            dataToSet.molds[moldName].stats.material += +mold.stats.material_usage || 0;
                            dataToSet.molds[moldName].stats.production += +mold.stats.production || 0;
                            dataToSet.molds[moldName].stats.shots += +mold.stats.shots || 0;
                        }
                    }
                    day.operators = operators.join(", ");
                    day.molds = moldsNames.join(", ");
                    dataToSet.allDays.push(day);
                    const hours = [];
                    for (let i = 0; i < 24; i++) {
                        const start = new Date((+(shiftData.shift_a_start || 0) + 3600 * i) * 1000);
                        const end = new Date((+(shiftData.shift_a_start || 0) + 3600 * (i + 1) + 59) * 1000);
                        const _start = start.getTime() / 1000;
                        const _end = end.getTime() / 1000;
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
                        if (!molds.includes(hour?.mold_name?.toLowerCase())) continue;
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
                        foundHour.production += hour.production;
                        foundHour.production_meters += hour.production_meters;
                        foundHour.material += hour.material_usage;
                        foundHour.electricity += hour.electricity_usage;
                        if (hour.offtime) dataToSet.total.idle_electricity += hour.electricity_usage;
                        foundHour.ontime += hour.ontime;
                        foundHour.idletime += hour.offtime;
                    }
                    for await (const hour of hours) {
                        const { _start } = hour;
                        if (shiftData.shifts === 1) {
                            dataToSet.shifts.A.shots += hour.shots;
                            dataToSet.shifts.A.production_meters += hour.production_meters;
                            dataToSet.shifts.A.production += hour.production;
                            dataToSet.shifts.A.electricity += hour.electricity;
                            dataToSet.shifts.A.material += hour.material;
                            dataToSet.shifts.A.ontime += hour.ontime;
                            dataToSet.shifts.A.idletime += hour.idletime;
                        } else if (shiftData.shifts === 2) {
                            if (_start < +shiftData.shift_b_start) {
                                dataToSet.shifts.A.shots += hour.shots;
                                dataToSet.shifts.A.production_meters += hour.production_meters;
                                dataToSet.shifts.A.production += hour.production;
                                dataToSet.shifts.A.electricity += hour.electricity;
                                dataToSet.shifts.A.material += hour.material;
                                dataToSet.shifts.A.ontime += hour.ontime;
                                dataToSet.shifts.A.idletime += hour.idletime;
                            } else if (dataToSet.shifts.B) {
                                dataToSet.shifts.B.shots += hour.shots;
                                dataToSet.shifts.B.production_meters += hour.production_meters;
                                dataToSet.shifts.B.production += hour.production;
                                dataToSet.shifts.B.electricity += hour.electricity;
                                dataToSet.shifts.B.material += hour.material;
                                dataToSet.shifts.B.ontime += hour.ontime;
                                dataToSet.shifts.B.idletime += hour.idletime;
                            }
                        } else {
                            if (_start < +shiftData.shift_b_start) {
                                dataToSet.shifts.A.shots += hour.shots;
                                dataToSet.shifts.A.production_meters += hour.production_meters;
                                dataToSet.shifts.A.production += hour.production;
                                dataToSet.shifts.A.electricity += hour.electricity;
                                dataToSet.shifts.A.material += hour.material;
                                dataToSet.shifts.A.ontime += hour.ontime;
                                dataToSet.shifts.A.idletime += hour.idletime;
                            } else if (_start < +shiftData.shift_c_start && dataToSet.shifts.B) {
                                dataToSet.shifts.B.shots += hour.shots;
                                dataToSet.shifts.B.production += hour.production;
                                dataToSet.shifts.B.production_meters += hour.production_meters;
                                dataToSet.shifts.B.electricity += hour.electricity;
                                dataToSet.shifts.B.material += hour.material;
                                dataToSet.shifts.B.ontime += hour.ontime;
                                dataToSet.shifts.B.idletime += hour.idletime;
                            } else if (dataToSet.shifts.C) {
                                dataToSet.shifts.C.shots += hour.shots;
                                dataToSet.shifts.C.production += hour.production;
                                dataToSet.shifts.C.production_meters += hour.production_meters;
                                dataToSet.shifts.C.electricity += hour.electricity;
                                dataToSet.shifts.C.material += hour.material;
                                dataToSet.shifts.C.ontime += hour.ontime;
                                dataToSet.shifts.C.idletime += hour.idletime;
                            }
                        }
                    }
                    dataToSet.hours.push({
                        electricity: day.electricity,
                        material: day.material,
                        production: day.production,
                        production_meters: day.production_meters,
                        shots: day.shots,
                        ontime: day.ontime,
                        idletime: day.idletime,
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
                        day.production_meters / day.electricity
                    ).toFixed(2);
                    dataToSet.insights.unitsPerMeter = +(
                        day.electricity / day.production_meters
                    ).toFixed(3);
                }
                dataToSet.shifts.A.supervisor = Array.from(supervisors.A.name).join(", ");
                dataToSet.shifts.A.timing = Array.from(supervisors.A.time).join(", ");
                if (dataToSet.shifts.B) {
                    dataToSet.shifts.B.supervisor = Array.from(supervisors.B.name).join(", ");
                    dataToSet.shifts.B.timing = Array.from(supervisors.B.time).join(", ");
                }
                if (dataToSet.shifts.C) {
                    dataToSet.shifts.C.supervisor = Array.from(supervisors.C.name).join(", ");
                    dataToSet.shifts.C.timing = Array.from(supervisors.C.time).join(", ");
                }
            }
            setData(dataToSet);
        };
        func();
    }, [isSingleDay, parameters, factories, selectedFactory]);

    const downloadPDF = async () => {
        try {
            if (data === null || data === "NOT_FOUND") return;
            setIsBusy(true);
            if (isSingleDay) {
                const tables = {} as {
                    [key: string]: string[][]
                };
                const shiftsTable = [["Shift", "Timing", "Operator", "Shots", "Production", "Material", "Electricity", "On Time", "Idle Time"]];
                const moldsTable = [["Mold", "Avg Cycle T.", "Shots", "Production", "Material", "Electricity", "On Time", "Idle Time", "Product", "Color", "T. Weights", "Materials"]];
                const hoursTable = [["Time", "Status", "Shots", "Production", "Material", "Electricity", "On Time", "Idle Time", "Off Time", "Avg. Cycle T.", "Operator", "Mold"]];

                const {
                    shifts,
                    molds,
                    allHours,
                    materialBreakdown
                } = data;
                const { A, B, C } = shifts;
                const { supervisor: A_supervisor, timing: A_timing } = A;
                const { supervisor: B_supervisor, timing: B_timing } = B || {};
                const { supervisor: C_supervisor, timing: C_timing } = C || {};
                shiftsTable.push(["A", A_timing, A_supervisor, numberFormatter(A.shots, "shot(s)"), numberFormatter(A.production, "pc(s)"), weightFormatter(A.material), unitFormatter(A.electricity), secFormatter(A.ontime), secFormatter(A.idletime)]);
                if (B && B_timing && B_supervisor) shiftsTable.push(["B", B_timing, B_supervisor, numberFormatter(B.shots, "shot(s)"), numberFormatter(B.production, "pc(s)"), weightFormatter(B.material), unitFormatter(B.electricity), secFormatter(B.ontime), secFormatter(B.idletime)]);
                if (C && C_timing && C_supervisor) shiftsTable.push(["C", C_timing, C_supervisor, numberFormatter(C.shots, "shot(s)"), numberFormatter(C.production, "pc(s)"), weightFormatter(C.material), unitFormatter(C.electricity), secFormatter(C.ontime), secFormatter(C.idletime)]);
                moldsTable.push(...Object.entries(molds).map(([moldName, mold]) => {
                    const { details, stats } = mold;
                    const { product, productColor, productWeight, productWeight2, material, material2, multiComponent } = details;
                    const { electricity, idletime, material: _material, ontime, production, shots } = stats;
                    const cycleTime = +(ontime / shots || 0).toFixed(0);
                    return [
                        moldName.toUpperCase(),
                        cycleTime + "s",
                        numberFormatter(shots, "shot(s)"),
                        numberFormatter(production, "pc(s)"),
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
                hoursTable.push(...allHours.map((hour) => {
                    const { from, time, shots, production, material_usage, electricity_usage, ontime, offtime, shutdown_time, operator, mold_name, status } = hour;
                    const avgCycleTime = +(ontime / shots || 0).toFixed(0);
                    return [
                        `${secToTime(from)} - ${secToTime(time)}`,
                        status ? "ON" : shutdown_time ? "OFF" : "IDLE",
                        numberFormatter(shots, "shot(s)"),
                        numberFormatter(production, "pc(s)"),
                        weightFormatter(material_usage),
                        unitFormatter(electricity_usage),
                        secFormatter(ontime),
                        secFormatter(offtime),
                        secFormatter(shutdown_time || 0),
                        `${avgCycleTime}s`,
                        operator,
                        mold_name.toUpperCase()
                    ]
                }));
                tables["Shifts"] = shiftsTable;
                if (moldsTable.length > 2) tables["Molds"] = moldsTable;
                tables["Hours"] = hoursTable;
                await landscapePDF({
                    filename: `mold-report(${dayjs(parameters.date.from).format("DD-MM-YYYY")}).pdf`,
                    headings: {
                        left: "Daily Production Report",
                        middle: `${machineNames} | ${moldsNames}`,
                        right: dayjs(parameters.date.from).format("D MMM YYYY")
                    },
                    stats: {
                        "SHOTS :": numberFormatter(data.total.shots, " shot(s)"),
                        "PRODUCTION :": numberFormatter(data.total.production, " pc(s)"),
                        "MATERIAL USAGE :": weightFormatter(data.total.material),
                        "ELECTRICITY USAGE :": unitFormatter(data.total.electricity),
                        "IDLE ELEC. USAGE :": unitFormatter(data.total.idle_electricity),
                        "ONTIME :": secFormatter(data.total.ontime),
                        "IDLETIME :": secFormatter(data.total.idletime),
                        "OFFTIME :": secFormatter(data.total.offtime),
                        "OPERATORS :": (data.shifts.A.supervisor + (data.shifts.B && "\n" + data.shifts.B.supervisor) + (data.shifts.C && "\n" + data.shifts.C.supervisor)).replaceAll("null", "").trim(),
                        "MATERIAL BREAKDOWN :": Object.entries(materialBreakdown).map(([key, value]) => `${key} : ${weightFormatter(value.weight, value.pc_weight)}`).join("\n"),
                    },
                    tables
                });

            } else {
                const tables = {} as {
                    [key: string]: string[][]
                };
                const shiftsTable = [["Shift", "Timing", "Operator", "Shots", "Production", "Material", "Electricity", "On Time", "Idle Time"]];
                const moldsTable = [["Mold", "Avg Cycle T.", "Shots", "Production", "Material", "Electricity", "On Time", "Idle Time", "Product", "Color", "T. Weights", "Materials"]];
                const hoursTable = [["Date", "Shots", "Production", "Material", "Electricity", "On Time", "Idle Time", "Off Time", "Avg. Cycle T.", "Operators", "Molds"]];

                const {
                    shifts,
                    molds,
                    allDays,
                    materialBreakdown
                } = data;
                const { A, B, C } = shifts;
                const { supervisor: A_supervisor, timing: A_timing } = A;
                const { supervisor: B_supervisor, timing: B_timing } = B || {};
                const { supervisor: C_supervisor, timing: C_timing } = C || {};
                shiftsTable.push(["A", A_timing, A_supervisor, numberFormatter(A.shots, "shot(s)"), numberFormatter(A.production, "pc(s)"), weightFormatter(A.material), unitFormatter(A.electricity), secFormatter(A.ontime), secFormatter(A.idletime)]);
                if (B && B_timing && B_supervisor) shiftsTable.push(["B", B_timing, B_supervisor, numberFormatter(B.shots, "shot(s)"), numberFormatter(B.production, "pc(s)"), weightFormatter(B.material), unitFormatter(B.electricity), secFormatter(B.ontime), secFormatter(B.idletime)]);
                if (C && C_timing && C_supervisor) shiftsTable.push(["C", C_timing, C_supervisor, numberFormatter(C.shots, "shot(s)"), numberFormatter(C.production, "pc(s)"), weightFormatter(C.material), unitFormatter(C.electricity), secFormatter(C.ontime), secFormatter(C.idletime)]);

                moldsTable.push(...Object.entries(molds).map(([moldName, mold]) => {
                    const { details, stats } = mold;
                    const { product, productColor, productWeight, productWeight2, material, material2, multiComponent } = details;
                    const { electricity, idletime, material: _material, ontime, production, shots } = stats;
                    const cycleTime = +(ontime / shots || 0).toFixed(0);
                    return [
                        moldName.toUpperCase(),
                        cycleTime + "s",
                        numberFormatter(shots, "shot(s)"),
                        numberFormatter(production, "pc(s)"),
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
                        numberFormatter(day.shots, "shot(s)"),
                        numberFormatter(day.production, "pc(s)"),
                        weightFormatter(day.material),
                        unitFormatter(day.electricity),
                        secFormatter(day.ontime),
                        secFormatter(day.idletime),
                        secFormatter(day.offtime),
                        cycleTime + "s",
                        day.operators,
                        day.molds.toUpperCase()
                    ]
                }));
                tables["Shifts"] = shiftsTable;
                if (moldsTable.length > 2) tables["Molds"] = moldsTable;
                tables["Days"] = hoursTable;

                await landscapePDF({
                    filename: `mold-report(${dayjs(parameters.date.from).format("DD-MM-YYYY")} - ${dayjs(parameters.date.to).format("DD-MM-YYYY")}).pdf`,
                    headings: {
                        left: "Daily Production Report",
                        middle: `${machineNames} | ${moldsNames}`,
                        right: `${dayjs(parameters.date.from).format("D MMM YYYY")} - ${dayjs(parameters.date.to).format("D MMM YYYY")}`
                    },
                    stats: {
                        "SHOTS :": numberFormatter(data.total.shots, " shot(s)"),
                        "PRODUCTION :": numberFormatter(data.total.production, " pc(s)"),
                        "MATERIAL USAGE :": weightFormatter(data.total.material),
                        "ELECTRICITY USAGE :": unitFormatter(data.total.electricity),
                        "IDLE ELEC. USAGE :": unitFormatter(data.total.idle_electricity),
                        "ONTIME :": secFormatter(data.total.ontime),
                        "IDLETIME :": secFormatter(data.total.idletime),
                        "OFFTIME :": secFormatter(data.total.offtime),
                        "OPERATORS :": (data.shifts.A.supervisor + (data.shifts.B && "\n" + data.shifts.B.supervisor) + (data.shifts.C && "\n" + data.shifts.C.supervisor)).replaceAll("null", "").trim(),
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
            if (isSingleDay) {
                const sections = [] as ExcelSectionType[];
                const shiftsSection: ExcelSectionType = {
                    mainHeading: "Each Shifts's Report",
                    subHeadings: ["Shift", "Timing", "Operator", "Shots (shots)", "Production (pcs)", "Material (KGs)", "Electricity (kWhr)", "On Time", "Idle Time"],
                    data: [] as ExcelSectionType['data'],
                    footer: []
                }
                const moldsSection: ExcelSectionType = {
                    mainHeading: "Each Mold's Report",
                    subHeadings: ["Mold", "Avg Cycle T. (sec)", "Shots (shots)", "Production (pcs)", "Material (KGs)", "Electricity (kWhr)", "On Time", "Idle Time", "Product", "Color", "T. Weights", "Materials"],
                    data: [] as ExcelSectionType['data'],
                    footer: []
                }
                const hoursSection: ExcelSectionType = {
                    mainHeading: "Each Hour's Report",
                    subHeadings: ["Time", "Status", "Shots (shots)", "Production (pcs)", "Material (KGs)", "Electricity (kWhr)", "On Time", "Idle Time", "Off Time", "Avg. Cycle T. (sec)", "Operator", "Mold"],
                    data: [] as ExcelSectionType['data'],
                    footer: ["Total", "", 0, 0, 0, 0, 0, 0, 0, "", "", ""] as ExcelSectionType["footer"]
                }
                const {
                    shifts,
                    molds,
                    allHours,
                } = data;
                const { A, B, C } = shifts;
                const { supervisor: A_supervisor, timing: A_timing } = A;
                const { supervisor: B_supervisor, timing: B_timing } = B || {};
                const { supervisor: C_supervisor, timing: C_timing } = C || {};
                shiftsSection.data.push(["A", A_timing, A_supervisor, A.shots, A.production, +(A.material / 1000).toFixed(2), +(A.electricity).toFixed(3), secFormatter(A.ontime), secFormatter(A.idletime)]);
                if (B && B_timing && B_supervisor) shiftsSection.data.push(["B", B_timing, B_supervisor, B.shots, B.production, +(B.material / 1000).toFixed(2), +(B.electricity).toFixed(3), secFormatter(B.ontime), secFormatter(B.idletime)]);
                if (C && C_timing && C_supervisor) shiftsSection.data.push(["C", C_timing, C_supervisor, C.shots, C.production, +(C.material / 1000).toFixed(2), +(C.electricity).toFixed(3), secFormatter(C.ontime), secFormatter(C.idletime)]);
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
                    const { electricity, idletime, material: _material, ontime, production, shots } = stats;
                    const cycleTime = ontime && shots ? +(ontime / shots || 0).toFixed(0) : 0;
                    return [
                        moldName.toUpperCase(),
                        cycleTime,
                        shots,
                        production,
                        +(_material / 1000).toFixed(2),
                        +(electricity).toFixed(3),
                        secFormatter(ontime),
                        secFormatter(idletime),
                        product,
                        productColor,
                        `${weightFormatter(totalWeight)}`,
                        materials.join(", ")
                    ]
                }));
                sections.push(moldsSection);
                for await (const hour of allHours) {
                    (hoursSection.footer[2] as number) += hour.shots;
                    (hoursSection.footer[3] as number) += hour.production;
                    (hoursSection.footer[4] as number) += hour.material_usage;
                    (hoursSection.footer[5] as number) += hour.electricity_usage;
                    (hoursSection.footer[6] as number) += hour.ontime;
                    (hoursSection.footer[7] as number) += hour.offtime;
                    (hoursSection.footer[8] as number) += hour.shutdown_time || 0;
                    hoursSection.data.push([
                        `${secToTime(hour.from)} - ${secToTime(hour.time)}`,
                        hour.status ? "ON" : hour.shutdown_time ? "OFF" : "IDLE",
                        hour.shots,
                        hour.production,
                        +(hour.material_usage / 1000).toFixed(2),
                        +(hour.electricity_usage).toFixed(3),
                        secFormatter(hour.ontime),
                        secFormatter(hour.offtime),
                        secFormatter(hour.shutdown_time || 0),
                        hour.ontime && hour.shots ? +(hour.ontime / hour.shots || 0).toFixed(0) : 0,
                        hour.operator.toUpperCase(),
                        hour.mold_name.toUpperCase()
                    ]);
                }
                hoursSection.footer[4] = +(+hoursSection.footer[3] / 1000).toFixed(2);
                hoursSection.footer[5] = +(+hoursSection.footer[4]).toFixed(3);
                hoursSection.footer[6] = secFormatter(+hoursSection.footer[5]);
                hoursSection.footer[7] = secFormatter(+hoursSection.footer[6]);
                hoursSection.footer[8] = secFormatter(+hoursSection.footer[7]);
                sections.push(hoursSection);
                await excelDownload({
                    filename: `mold-report(${dayjs(parameters.date.from).format("DD-MM-YYYY")}).xlsx`,
                    heading: `${`${machineNames} | ${moldsNames}`} Report (${dayjs(parameters.date.from).format("DD-MM-YYYY")})`,
                    sections,
                });
            } else {
                const sections = [] as ExcelSectionType[];
                const shiftsSection: ExcelSectionType = {
                    mainHeading: "Each Shifts's Report",
                    subHeadings: ["Shift", "Timing", "Operator", "Shots (shots)", "Production (pcs)", "Material (KGs)", "Electricity (kWhr)", "On Time", "Idle Time"],
                    data: [] as ExcelSectionType['data'],
                    footer: []
                }
                const moldsSection: ExcelSectionType = {
                    mainHeading: "Each Mold's Report",
                    subHeadings: ["Mold", "Avg Cycle T. (sec)", "Shots (shots)", "Production (pcs)", "Material (KGs)", "Electricity (kWhr)", "On Time", "Idle Time", "Product", "Color", "T. Weights", "Materials"],
                    data: [] as ExcelSectionType['data'],
                    footer: []
                }
                const hoursSection: ExcelSectionType = {
                    mainHeading: "Each Day's Report",
                    subHeadings: ["Date", "Shots (shots)", "Production (pcs)", "Material (KGs)", "Electricity (kWhr)", "On Time", "Idle Time", "Off Time", "Avg. Cycle T. (sec)", "Operators", "Molds"],
                    data: [] as ExcelSectionType['data'],
                    footer: ["Total", 0, 0, 0, 0, 0, 0, 0, "", "", ""] as ExcelSectionType["footer"]
                }
                const {
                    shifts,
                    molds,
                    allDays,
                } = data;
                const { A, B, C } = shifts;
                const { supervisor: A_supervisor, timing: A_timing } = A;
                const { supervisor: B_supervisor, timing: B_timing } = B || {};
                const { supervisor: C_supervisor, timing: C_timing } = C || {};
                shiftsSection.data.push(["A", A_timing, A_supervisor, A.shots, A.production, +(A.material / 1000).toFixed(2), +(A.electricity).toFixed(3), secFormatter(A.ontime), secFormatter(A.idletime)]);
                if (B && B_timing && B_supervisor) shiftsSection.data.push(["B", B_timing, B_supervisor, B.shots, B.production, +(B.material / 1000).toFixed(2), +(B.electricity).toFixed(3), secFormatter(B.ontime), secFormatter(B.idletime)]);
                if (C && C_timing && C_supervisor) shiftsSection.data.push(["C", C_timing, C_supervisor, C.shots, C.production, +(C.material / 1000).toFixed(2), +(C.electricity).toFixed(3), secFormatter(C.ontime), secFormatter(C.idletime)]);
                sections.push(shiftsSection);
                moldsSection.data.push(...Object.entries(molds).map(([moldName, mold]) => {
                    const { details, stats } = mold;
                    const { product, productColor, productWeight, productWeight2, material, material2, multiComponent } = details;
                    const { electricity, idletime, material: _material, ontime, production, shots } = stats;
                    const cycleTime = +(ontime / shots || 0).toFixed(0);
                    return [
                        moldName.toUpperCase(),
                        cycleTime,
                        shots,
                        production,
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
                    (hoursSection.footer[2] as number) += day.production;
                    (hoursSection.footer[3] as number) += day.material;
                    (hoursSection.footer[4] as number) += day.electricity;
                    (hoursSection.footer[5] as number) += day.ontime;
                    (hoursSection.footer[6] as number) += day.idletime;
                    (hoursSection.footer[7] as number) += day.offtime;
                    return [
                        day.date,
                        day.shots,
                        day.production,
                        +(day.material / 1000).toFixed(2),
                        +(day.electricity).toFixed(3),
                        secFormatter(day.ontime),
                        secFormatter(day.idletime),
                        secFormatter(day.offtime),
                        cycleTime,
                        day.operators,
                        day.molds
                    ]
                }));
                hoursSection.footer[3] = +(+hoursSection.footer[3] / 1000).toFixed(2);
                hoursSection.footer[4] = +(+hoursSection.footer[4]).toFixed(3);
                hoursSection.footer[5] = secFormatter(+hoursSection.footer[5]);
                hoursSection.footer[6] = secFormatter(+hoursSection.footer[6]);
                hoursSection.footer[7] = secFormatter(+hoursSection.footer[7]);
                sections.push(hoursSection);
                await excelDownload({
                    filename: `mold-report(${dayjs(parameters.date.from).format("DD-MM-YYYY")} - ${dayjs(parameters.date.to).format("DD-MM-YYYY")}).xlsx`,
                    heading: `${`${machineNames} | ${moldsNames}`} Report (${dayjs(parameters.date.from).format("DD-MM-YYYY")} - ${dayjs(parameters.date.to).format("DD-MM-YYYY")})`,
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

    return <Flex gap={5} flexDir={"column"}>
        <Box display="flex" alignItems={"center"} justifyContent="space-between">
            <Text fontWeight={600}>Machine Report: <span style={{
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
        {data === null ?
            <MyCard as={Center} minH="50vh">
                <SmallFill />
            </MyCard> :
            data === "NOT_FOUND" ?
                <MyCard as={Center} minH="50vh">
                    <NotFound />
                </MyCard> :
                <Flex gap={5} flexDir="column">
                    <MachineTotal isSingleDay={isSingleDay} data={data} />

                    {isSingleDay && <HourlyBreakdown data={data.tree} notFound={false} />}
                    <InsightsAndMold insights={data.insights} materialBreakdown={data.materialBreakdown} molds={data.molds} />
                </Flex>
        }
    </Flex>
}

export type { AllDay, AllHour, DataToSet, MaterialBreakdownType, MyHour, SortedHourTree };
export default MoldReport;