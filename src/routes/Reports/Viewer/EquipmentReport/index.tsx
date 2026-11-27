import { Box, Center, Flex, Stack, Text, useToast, VStack } from "@chakra-ui/react";
import dayjs from "../../../../Components/Functions/dayjs";
import { useEffect, useMemo, useState } from "react";
import { FaFileExcel, FaFilePdf } from "react-icons/fa";
import { FiDownload } from "react-icons/fi";
import { RiDeleteBin7Line } from "react-icons/ri";
import { get } from "../../../../Components/firebase/api/db";
import { SmallFill } from "../../../../Components/Loaders";
import MyCard from "../../../../Components/micro/Card";
import ConfirmDialog from "../../../../Components/micro/ConfirmDialog";
import MyPopover from "../../../../Components/micro/MyPopover";
import NotFound from "../../../../Components/micro/NotFound";
import secondsToHourMin from "../../../../Components/Functions/converters/secondsToHourMin"
import { endAt, orderByKey, query, ref, startAt, get as firebaseGet } from "firebase/database"
import { factoriesAtom, selectedFactoryAtom, shiftsAtom, uidAtom } from "../../../../Components/Store/atoms";
import Get from "../../../../Components/Store/hooks/Get";
import { ReportSubmitType } from "../../Selector/types"
import secToTime from "../../../../Components/Functions/converters/secondsToHourMin";
import EquipmentTotal from "./EquipmentTotal";
import store from "../../../../Components/Store";
import { db } from "../../../../Components/firebase";
import secFormatter from "../../../../Components/Functions/formatters/secFormatter";
import unitFormatter from "../../../../Components/Functions/formatters/unitFormatter";
import landscapePDF from "../../../../Components/Exporters/landscapePDF";
import excelDownload, { ExcelSectionType } from "../../../../Components/Exporters/excelDownload";

interface Stats {
    electricity: number,
    ontime: number,
    sessions: number,
}
interface TotalStats extends Stats {
    days: number,
}
interface MyHours extends Stats {
    time: string,
}
interface ShiftStats extends Omit<Stats, "sessions"> {
    timing: string,
    operator: string,
    electricity: number,
    ontime: number,
}
interface DataToSet {
    total: TotalStats,
    shifts: {
        A: ShiftStats,
        B: ShiftStats | null,
        C: ShiftStats | null
    },
    hours: MyHours[]
}

const EquipmentReport = ({
    parameters
}: {
    parameters: ReportSubmitType["equipment"]
}) => {
    const toast = useToast();
    const [isBusy, setIsBusy] = useState(false);
    const [data, setData] = useState<null | "NOT_FOUND" | DataToSet>(null);
    const factories = Get(factoriesAtom);
    const selectedFactory = Get(selectedFactoryAtom);
    const isSingleDay = useMemo(() => {
        const isSingleDay = dayjs(parameters.date.from).isSame(parameters.date.to, "day");
        return isSingleDay;
    }, [parameters]);
    const equipmentNames = useMemo(() => {
        if (parameters.option === null) return "";
        if (!Array.isArray(parameters.option)) return parameters.option?.label;
        return parameters.option?.map((option) => option.label).join(", ");
    }, [parameters]);
    const shifts = Get(shiftsAtom);
    const shiftsTitle = useMemo(() => {
        if (!shifts) return "";
        if (shifts.shifts === parameters.secondaryOption.length) return "All Shifts";
        return parameters.secondaryOption.map((option) => "Shift " + option.label).join(", ");
    }, [parameters, shifts]);
    const selectedTitle = useMemo(() => {
        if (parameters.date.from?.toDateString() === parameters.date.to?.toDateString()) return `${equipmentNames} | ${shiftsTitle} | ` + dayjs(parameters.date.from).format("DD MMM, YY");
        return `${equipmentNames} | ${shiftsTitle} | ${dayjs(parameters.date.from).format("DD MMM, YY")} - ${dayjs(parameters.date.to).format("DD MMM, YY")}`;
    }, [parameters, equipmentNames, shiftsTitle]);

    useEffect(() => {
        if (!factories || !selectedFactory) return;
        const func = async () => {
            setData(null);
            const mySelectedFactory = factories[selectedFactory.value];
            const isSingleEquipment = !Array.isArray(parameters.option);
            const dataToSet: DataToSet = {
                total: {
                    electricity: 0,
                    ontime: 0,
                    sessions: 0,
                    days: 0
                },
                shifts: {
                    A: {
                        timing: "",
                        operator: "",
                        electricity: 0,
                        ontime: 0,
                    },
                    B: null,
                    C: null
                },
                hours: [] as MyHours[]
            };
            const equipment = parameters.option && !Array.isArray(parameters.option) ? parameters.option.value : "";
            if (isSingleDay) {
                const date = dayjs(parameters.date.from).format("YYYY-MM-DD");
                if (isSingleEquipment) {
                    const [shiftSnap, dailySnap, hourlySnap] = await Promise.all([
                        get(`reports/factory/daily/${date}`),
                        get(`reports/equipments/${equipment}/daily/${date}`),
                        get(`reports/equipments/${equipment}/hourly/${date}`)
                    ]);
                    if (!shiftSnap.exists() || !dailySnap.exists() || !hourlySnap.exists()) {
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
                    const dailyData = dailySnap.val();
                    let hourlyData = hourlySnap.val();
                    dataToSet.shifts.A.operator = shiftData.supervisor_a || "";
                    if (shiftData.shifts === 1) {
                        dataToSet.shifts.A.timing = `${secondsToHourMin(+shiftData.shift_a_start || 0)} - ${secondsToHourMin(+shiftData.shift_a_start || 0)}`
                    } else if (shiftData.shifts === 2) {
                        dataToSet.shifts.B = {
                            electricity: 0,
                            ontime: 0,
                            timing: "",
                            operator: ""
                        };
                        dataToSet.shifts.B.operator = shiftData.supervisor_b || "";
                        dataToSet.shifts.A.timing = `${secondsToHourMin(+shiftData.shift_a_start || 0)} - ${secondsToHourMin(+shiftData.shift_b_start || 0)}`
                        dataToSet.shifts.B.timing = `${secondsToHourMin(+shiftData.shift_b_start || 0)} - ${secondsToHourMin(+shiftData.shift_a_start || 0)}`
                    } else {
                        dataToSet.shifts.B = {
                            electricity: 0,
                            ontime: 0,
                            timing: "",
                            operator: ""
                        };
                        dataToSet.shifts.C = {
                            electricity: 0,
                            ontime: 0,
                            timing: "",
                            operator: ""
                        };
                        dataToSet.shifts.B.operator = shiftData.supervisor_b || "";
                        dataToSet.shifts.C.operator = shiftData.supervisor_c || "";
                        dataToSet.shifts.A.timing = `${secondsToHourMin(+shiftData.shift_a_start || 0)} - ${secondsToHourMin(+shiftData.shift_b_start || 0)}`
                        dataToSet.shifts.B.timing = `${secondsToHourMin(+shiftData.shift_b_start || 0)} - ${secondsToHourMin(+shiftData.shift_c_start || 0)}`
                        dataToSet.shifts.C.timing = `${secondsToHourMin(+shiftData.shift_c_start || 0)} - ${secondsToHourMin(+shiftData.shift_a_start || 0)}`
                    }
                    dataToSet.total = {
                        electricity: dailyData?.electricity_usage || 0,
                        ontime: dailyData?.ontime || 0,
                        sessions: dailyData?.total_sessions || (dailyData?.ontime ? 1 : 0),
                        days: 1
                    }
                    for (const _hour of Object.values(hourlyData || {})) {
                        const hour = _hour as any;
                        // which supervisor was on duty?
                        let supervisor: "A" | "B" | "C" = "A";
                        if (shiftData.shifts === 1) supervisor = "A";
                        else if (shiftData.shifts === 2) {
                            if (hour.time >= +shiftData.shift_b_start) supervisor = "B";
                            else supervisor = "A";
                        } else {
                            if (hour.time >= +shiftData.shift_c_start) supervisor = "C";
                            else if (hour.time >= +shiftData.shift_b_start) supervisor = "B";
                            else supervisor = "A";
                        }
                        if (dataToSet.shifts[supervisor] !== null) {
                            dataToSet.shifts[supervisor as "A"].electricity += hour.electricity_usage;
                            dataToSet.shifts[supervisor as "A"].ontime += hour.ontime;
                        }
                        dataToSet.hours.push({
                            time: `${secToTime(hour.from)} - ${secToTime(hour.time)}`,
                            electricity: hour.electricity_usage,
                            ontime: hour.ontime,
                            sessions: 0
                        })
                    }
                }
            } else {
                if (!isSingleEquipment) return;
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
                            ref(db, `users/${uid}/reports/equipments/${equipment}/daily`),
                            orderByKey(),
                            startAt(dates[0]),
                            endAt(dates[1]),
                        ),
                    ),
                );
                promises.push(
                    firebaseGet(
                        query(
                            ref(db, `users/${uid}/reports/equipments/${equipment}/hourly`),
                            orderByKey(),
                            startAt(dates[0]),
                            endAt(dates[1]),
                        ),
                    ),
                );
                const [shiftSnap, dailySnap, hourlySnap] = await Promise.all(promises);
                if (!shiftSnap.exists() || !dailySnap.exists() || !hourlySnap.exists()) {
                    setData("NOT_FOUND");
                    return;
                }

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
                    supervisors.A.name.add(shiftData.supervisor_a || "");
                    if (shiftData.shifts === 1) {
                        supervisors.A.time.add(`${secondsToHourMin(+shiftData.shift_a_start || 0)} - ${secondsToHourMin(+shiftData.shift_a_start || 0)}`);
                    } else if (shiftData.shifts === 2) {
                        if (dataToSet.shifts.B === null) dataToSet.shifts.B = {
                            electricity: 0,
                            ontime: 0,
                            timing: "",
                            operator: ""
                        };
                        supervisors.B.name.add(shiftData.supervisor_b || "");
                        supervisors.A.time.add(`${secondsToHourMin(+shiftData.shift_a_start || 0)} - ${secondsToHourMin(+shiftData.shift_b_start || 0)}`);
                        supervisors.B.time.add(`${secondsToHourMin(+shiftData.shift_b_start || 0)} - ${secondsToHourMin(+shiftData.shift_a_start || 0)}`);
                    } else {
                        if (dataToSet.shifts.B === null) dataToSet.shifts.B = {
                            electricity: 0,
                            ontime: 0,
                            timing: "",
                            operator: ""
                        };
                        if (dataToSet.shifts.C === null) dataToSet.shifts.C = {
                            electricity: 0,
                            ontime: 0,
                            timing: "",
                            operator: ""
                        };
                        supervisors.B.name.add(shiftData.supervisor_b || "");
                        supervisors.C.name.add(shiftData.supervisor_c || "");
                        supervisors.A.time.add(`${secondsToHourMin(+shiftData.shift_a_start || 0)} - ${secondsToHourMin(+shiftData.shift_b_start || 0)}`);
                        supervisors.B.time.add(`${secondsToHourMin(+shiftData.shift_b_start || 0)} - ${secondsToHourMin(+shiftData.shift_c_start || 0)}`);
                        supervisors.C.time.add(`${secondsToHourMin(+shiftData.shift_c_start || 0)} - ${secondsToHourMin(+shiftData.shift_a_start || 0)}`);
                    }
                    data.total_sessions = data.total_sessions || (data.ontime ? 1 : 0);
                    dataToSet.total.electricity += data.electricity_usage || 0;
                    dataToSet.total.ontime += data.ontime || 0;
                    dataToSet.total.sessions += data.total_sessions || 0;
                    for (const _hour of Object.values(hourlyData[date] || {})) {
                        const hour = _hour as any;
                        // which supervisor was on duty?
                        let supervisor: "A" | "B" | "C" = "A";
                        if (shiftData.shifts === 1) supervisor = "A";
                        else if (shiftData.shifts === 2) {
                            if (hour.time >= +shiftData.shift_b_start) supervisor = "B";
                            else supervisor = "A";
                        } else {
                            if (hour.time >= +shiftData.shift_c_start) supervisor = "C";
                            else if (hour.time >= +shiftData.shift_b_start) supervisor = "B";
                            else supervisor = "A";
                        }
                        if (dataToSet.shifts[supervisor] !== null) {
                            dataToSet.shifts[supervisor as "A"].electricity += hour.electricity_usage;
                            dataToSet.shifts[supervisor as "A"].ontime += hour.ontime;
                        }
                    }
                    dataToSet.hours.push({
                        time: `${dayjs(date).format("DD MMM, YYYY")}`,
                        electricity: data.electricity_usage || 0,
                        ontime: data.ontime || 0,
                        sessions: data.total_sessions || 0
                    })
                    dataToSet.total.days++;
                }
                dataToSet.shifts.A.operator = Array.from(supervisors.A.name).join(", ");
                dataToSet.shifts.A.timing = Array.from(supervisors.A.time).join(", ");
                if (dataToSet.shifts.B !== null) {
                    dataToSet.shifts.B.operator = Array.from(supervisors.B.name).join(", ");
                    dataToSet.shifts.B.timing = Array.from(supervisors.B.time).join(", ");
                }
                if (dataToSet.shifts.C !== null) {
                    dataToSet.shifts.C.operator = Array.from(supervisors.C.name).join(", ");
                    dataToSet.shifts.C.timing = Array.from(supervisors.C.time).join(", ");
                }

            }
            setData(dataToSet);
        }
        func();
    }, [factories, selectedFactory, parameters, isSingleDay]);

    const downloadPDF = async () => {
        try {
            if (data === null || data === "NOT_FOUND") return;
            setIsBusy(true);
            if (isSingleDay) {
                const tables = {} as {
                    [key: string]: string[][]
                };
                const shiftsTable = [["Shift", "Timing", "Operator", "Electricity", "On Time"]];
                const hoursTable = [["Time", "Electricity", "On Time"]];

                const {
                    hours,
                    shifts,
                    total
                } = data;
                const { A, B, C } = shifts;
                const { operator: A_supervisor, timing: A_timing } = A;
                const { operator: B_supervisor, timing: B_timing } = B || {};
                const { operator: C_supervisor, timing: C_timing } = C || {};
                shiftsTable.push(["A", A_timing, A_supervisor, unitFormatter(A.electricity), secFormatter(A.ontime)]);
                if (B && B_timing && B_supervisor) shiftsTable.push(["B", B_timing, B_supervisor, unitFormatter(B.electricity), secFormatter(B.ontime)]);
                if (C && C_timing && C_supervisor) shiftsTable.push(["C", C_timing, C_supervisor, unitFormatter(C.electricity), secFormatter(C.ontime)]);
                hours.forEach((hour) => {
                    hoursTable.push([hour.time, unitFormatter(hour.electricity), secFormatter(hour.ontime)]);
                });
                if (shiftsTable.length > 2) tables["Shifts"] = shiftsTable;
                tables["Hours"] = hoursTable;
                await landscapePDF({
                    filename: `equipment-report(${dayjs(parameters.date.from).format("DD-MM-YYYY")}).pdf`,
                    headings: {
                        left: "Daily Equipment Report",
                        middle: equipmentNames,
                        right: dayjs(parameters.date.from).format("D MMM YYYY")
                    },
                    stats: {
                        "ELECTRICITY USAGE :": unitFormatter(total.electricity),
                        "ONTIME :": secFormatter(total.ontime),
                        "T. Sessions :": total.sessions + " sessions",
                    },
                    tables
                });
            } else {
                const tables = {} as {
                    [key: string]: string[][]
                };
                const shiftsTable = [["Shift", "Timing", "Operator", "Electricity", "On Time"]];
                const hoursTable = [["Date", "Electricity", "On Time", "Sessions"]];

                const {
                    hours,
                    shifts,
                    total
                } = data;
                const { A, B, C } = shifts;
                const { operator: A_supervisor, timing: A_timing } = A;
                const { operator: B_supervisor, timing: B_timing } = B || {};
                const { operator: C_supervisor, timing: C_timing } = C || {};
                shiftsTable.push(["A", A_timing, A_supervisor, unitFormatter(A.electricity), secFormatter(A.ontime)]);
                if (B && B_timing && B_supervisor) shiftsTable.push(["B", B_timing, B_supervisor, unitFormatter(B.electricity), secFormatter(B.ontime)]);
                if (C && C_timing && C_supervisor) shiftsTable.push(["C", C_timing, C_supervisor, unitFormatter(C.electricity), secFormatter(C.ontime)]);
                hours.forEach((hour) => {
                    hoursTable.push([hour.time, unitFormatter(hour.electricity), secFormatter(hour.ontime), hour.sessions + " sessions"]);
                });
                if (shiftsTable.length > 2) tables["Shifts"] = shiftsTable;
                tables["Hours"] = hoursTable;
                await landscapePDF({
                    filename: `equipment-report(${dayjs(parameters.date.from).format("DD-MM-YYYY")} - ${dayjs(parameters.date.to).format("DD-MM-YYYY")}).pdf`,
                    headings: {
                        left: "Daily Equipment Report",
                        middle: equipmentNames,
                        right: dayjs(parameters.date.from).format("D MMM YYYY") + " - " + dayjs(parameters.date.to).format("D MMM YYYY")
                    },
                    stats: {
                        "ELECTRICITY USAGE :": unitFormatter(total.electricity),
                        "ONTIME :": secFormatter(total.ontime),
                        "T. Sessions :": total.sessions + " sessions"
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
                    subHeadings: ["Shift", "Timing", "Operator", "Electricity", "On Time"],
                    data: [] as ExcelSectionType['data'],
                    footer: []
                }
                const hoursSection: ExcelSectionType = {
                    mainHeading: "Each Hour's Report",
                    subHeadings: ["Time", "Electricity", "On Time"],
                    data: [] as ExcelSectionType['data'],
                    footer: ["Total", 0, 0] as ExcelSectionType["footer"]
                }
                const {
                    hours,
                    shifts,
                } = data;
                const { A, B, C } = shifts;
                const { operator: A_supervisor, timing: A_timing } = A;
                const { operator: B_supervisor, timing: B_timing } = B || {};
                const { operator: C_supervisor, timing: C_timing } = C || {};
                shiftsSection.data.push(["A", A_timing, A_supervisor, +(A.electricity).toFixed(3), secFormatter(A.ontime)]);
                if (B && B_timing && B_supervisor) shiftsSection.data.push(["B", B_timing, B_supervisor, +(B.electricity).toFixed(3), secFormatter(B.ontime)]);
                if (C && C_timing && C_supervisor) shiftsSection.data.push(["C", C_timing, C_supervisor, +(C.electricity).toFixed(3), secFormatter(C.ontime)]);
                hours.forEach((hour) => {
                    (hoursSection.footer[1] as number) += hour.electricity;
                    (hoursSection.footer[2] as number) += hour.ontime;
                    hoursSection.data.push([hour.time, +(hour.electricity).toFixed(3), secFormatter(hour.ontime)]);
                });
                hoursSection.footer[1] = +(+hoursSection.footer[1]).toFixed(3);
                hoursSection.footer[2] = secFormatter(+hoursSection.footer[2]);
                if (shiftsSection.data.length > 1) sections.push(shiftsSection);
                sections.push(hoursSection);
                await excelDownload({
                    filename: `equipment-report(${dayjs(parameters.date.from).format("DD-MM-YYYY")}).xlsx`,
                    heading: `${equipmentNames} Report (${dayjs(parameters.date.from).format("DD-MM-YYYY")})`,
                    sections,
                });
            } else {
                const sections = [] as ExcelSectionType[];
                const shiftsSection: ExcelSectionType = {
                    mainHeading: "Each Shifts's Report",
                    subHeadings: ["Shift", "Timing", "Operator", "Electricity", "On Time"],
                    data: [] as ExcelSectionType['data'],
                    footer: []
                }
                const hoursSection: ExcelSectionType = {
                    mainHeading: "Each Day's Report",
                    subHeadings: ["Date", "Electricity", "On Time", "Sessions"],
                    data: [] as ExcelSectionType['data'],
                    footer: ["Total", 0, 0, 0] as ExcelSectionType["footer"]
                }
                const {
                    hours,
                    shifts,
                } = data;
                const { A, B, C } = shifts;
                const { operator: A_supervisor, timing: A_timing } = A;
                const { operator: B_supervisor, timing: B_timing } = B || {};
                const { operator: C_supervisor, timing: C_timing } = C || {};
                shiftsSection.data.push(["A", A_timing, A_supervisor, +(A.electricity).toFixed(3), secFormatter(A.ontime)]);
                if (B && B_timing && B_supervisor) shiftsSection.data.push(["B", B_timing, B_supervisor, +(B.electricity).toFixed(3), secFormatter(B.ontime)]);
                if (C && C_timing && C_supervisor) shiftsSection.data.push(["C", C_timing, C_supervisor, +(C.electricity).toFixed(3), secFormatter(C.ontime)]);
                hours.forEach((hour) => {
                    (hoursSection.footer[1] as number) += hour.electricity;
                    (hoursSection.footer[2] as number) += hour.ontime;
                    (hoursSection.footer[3] as number) += hour.sessions;
                    hoursSection.data.push([hour.time, +(hour.electricity).toFixed(3), secFormatter(hour.ontime), hour.sessions]);
                });
                hoursSection.footer[1] = +(+hoursSection.footer[1]).toFixed(3);
                hoursSection.footer[2] = secFormatter(+hoursSection.footer[2]);
                hoursSection.footer[3] = +hoursSection.footer[3];
                if (shiftsSection.data.length > 1) sections.push(shiftsSection);
                sections.push(hoursSection);
                await excelDownload({
                    filename: `equipment-report(${dayjs(parameters.date.from).format("DD-MM-YYYY")} - ${dayjs(parameters.date.to).format("DD-MM-YYYY")}).xlsx`,
                    heading: `${equipmentNames} Report (${dayjs(parameters.date.from).format("DD-MM-YYYY")} - ${dayjs(parameters.date.to).format("DD-MM-YYYY")})`,
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
            <Text fontWeight={600}>Equipment Report: <span style={{
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
                    <EquipmentTotal isSingleDay={isSingleDay} data={data} />

                    {/* {isSingleDay && <HourlyBreakdown data={data.tree} notFound={false} />}
                <InsightsAndMold insights={data.insights} materialBreakdown={data.materialBreakdown} molds={data.molds} /> */}
                </Flex>
        }
    </Flex>
}

export type { DataToSet };
export default EquipmentReport