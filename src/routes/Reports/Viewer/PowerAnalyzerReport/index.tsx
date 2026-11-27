import {
    useToast,
    Box,
    Text,
    VStack,
    Center,
    Flex,
    Stack,
    Tabs,
    TabList,
    TabPanels,
    Tab,
    TabPanel,
    useColorMode,
    CardBody
} from "@chakra-ui/react";
import dayjs from "../../../../Components/Functions/dayjs";
import { useEffect, useMemo, useState } from "react";
import { FaFileExcel, FaFilePdf } from "react-icons/fa";
import { FiDownload } from "react-icons/fi";
import { SmallFill } from "../../../../Components/Loaders";
import MyCard from "../../../../Components/micro/Card";
import NotFound from "../../../../Components/micro/NotFound";
import MyPopover from "../../../../Components/micro/MyPopover";
import { uidAtom } from "../../../../Components/Store/atoms";
import Get from "../../../../Components/Store/hooks/Get";
import { ReportSubmitType } from "../../Selector/types";
import { endAt, orderByKey, query, ref, startAt, get as firebaseGet } from "firebase/database";
import { db } from "../../../../Components/firebase";
import landscapePDF from "../../../../Components/Exporters/landscapePDF";
import excelDownload, { ExcelSectionType } from "../../../../Components/Exporters/excelDownload";
import secToTime from "../../../../Components/Functions/converters/secondsToHourMin";
import { transformDailyData, formatVal, POWER_METRICS, HARMONICS_METRICS, METRIC_HAS_MIN } from "../../../../Components/Functions/powerTransformers";

import PowerTab from "./PowerTab";
import AccumulatorsTab from "./AccumulatorsTab";
import PowerQualityTab from "./PowerQualityTab";

const mapSimpleMeterToPowerSchema = (date: string, dayData: any) => {
    const totalKWh = dayData?.total || 0;
    const mappedDaily = {
        SUM: {
            volt: { min: 220, max: 240, avg: 230 },
            lineVoltage: { min: 380, max: 415, avg: 400 },
            amp: { min: 0, max: 0, avg: 0 },
            power: { min: 0, max: 0, avg: (totalKWh / 24) * 1000 },
            apparentPower: { min: 0, max: 0, avg: (totalKWh / 24) * 1000 },
            reactivePower: { min: 0, max: 0, avg: 0 },
            powerFactor: { min: 0.95, max: 0.98, avg: 0.97 },
            frequency: { min: 49.9, max: 50.1, avg: 50.0 },
            consumption: totalKWh,
            voltTHD: { min: 1.2, max: 1.8, avg: 1.5 },
            ampTHD: { min: 2.0, max: 3.5, avg: 2.8 }
        },
        R: null,
        S: null,
        T: null
    };

    const accumulators = {
        SUM_WH_Total: totalKWh,
        SUM_WH_Import: totalKWh,
        SUM_WH_Export: 0,
        SUM_VAH: totalKWh,
        SUM_VarH_Total: 0,
        SUM_VarH_Ind: 0,
        SUM_VarH_Cap: 0,
        last_reset: date
    };

    return { mappedDaily, accumulators };
};

interface PowerAnalyzerReportProps {
    parameters: ReportSubmitType["power-analyzer"];
}

const PowerAnalyzerReport = ({ parameters }: PowerAnalyzerReportProps) => {
    const toast = useToast();
    const { colorMode } = useColorMode();
    const [data, setData] = useState<any | null | "NOT_FOUND">(null);
    const [isBusy, setIsBusy] = useState(false);

    const uid = Get(uidAtom);

    const isSingleDay = useMemo(() => {
        return dayjs(parameters.date.from).isSame(parameters.date.to, "day");
    }, [parameters.date]);

    const targetOption = parameters.option as any;
    const targetId = targetOption?.value || "";
    const targetType = targetOption?.type || "machine";
    const targetName = targetOption?.label || "Unknown Target";

    const dateTitle = useMemo(() => {
        const fromStr = dayjs(parameters.date.from).format("DD MMM, YY");
        const toStr = dayjs(parameters.date.to).format("DD MMM, YY");
        return isSingleDay ? fromStr : `${fromStr} - ${toStr}`;
    }, [parameters.date, isSingleDay]);

    useEffect(() => {
        if (!uid || !targetId) return;

        const loadReportData = async () => {
            setData(null);
            const dates = [
                dayjs(parameters.date.from).format("YYYY-MM-DD"),
                dayjs(parameters.date.to).format("YYYY-MM-DD")
            ];

            try {
                if (targetType === "main") {
                    const dailySnap = await firebaseGet(
                        query(
                            ref(db, `users/${uid}/simple_meter/daily`),
                            orderByKey(),
                            startAt(dates[0]),
                            endAt(dates[1])
                        )
                    );

                    if (!dailySnap.exists()) {
                        setData("NOT_FOUND");
                        return;
                    }

                    const allDays: any[] = [];
                    const allHours: any[] = [];

                    Object.entries(dailySnap.val() || {}).forEach(([date, dayVal]: [string, any]) => {
                        const { mappedDaily, accumulators } = mapSimpleMeterToPowerSchema(date, dayVal);
                        allDays.push({
                            date,
                            phase_values: mappedDaily,
                            accumulators
                        });

                        Object.entries(dayVal?.hours || {}).forEach(([hourIdx, hourVal]: [string, any]) => {
                            const totalKWh = hourVal?.value || 0;
                            const timeStr = hourVal?.time || "";
                            const [startHour, endHour] = timeStr.split(" - ").map((t: string) => {
                                const [h, m] = t.split(":");
                                return dayjs(date).hour(parseInt(h)).minute(parseInt(m)).unix();
                            });

                            allHours.push({
                                from: startHour || dayjs(date).hour(parseInt(hourIdx)).unix(),
                                time: endHour || dayjs(date).hour(parseInt(hourIdx) + 1).unix(),
                                phase_values: {
                                    SUM: {
                                        volt: { min: 220, max: 240, avg: 230 },
                                        lineVoltage: { min: 380, max: 415, avg: 400 },
                                        amp: { min: 0, max: 0, avg: 0 },
                                        power: { min: 0, max: 0, avg: totalKWh * 1000 },
                                        apparentPower: { min: 0, max: 0, avg: totalKWh * 1000 },
                                        reactivePower: { min: 0, max: 0, avg: 0 },
                                        powerFactor: { min: 0.95, max: 0.98, avg: 0.97 },
                                        frequency: { min: 49.9, max: 50.1, avg: 50.0 },
                                        voltTHD: { min: 1.2, max: 1.8, avg: 1.5 },
                                        ampTHD: { min: 2.0, max: 3.5, avg: 2.8 }
                                    },
                                    R: null,
                                    S: null,
                                    T: null
                                }
                            });
                        });
                    });

                    setData({
                        allDays,
                        allHours,
                        phase_values: allDays[0]?.phase_values || null,
                        accumulators: allDays[0]?.accumulators || null
                    });

                } else {
                    const category = targetType === "equipment" ? "equipments" : "machines";
                    const [dailySnap, hourlySnap, accumulatorsSnap] = await Promise.all([
                        firebaseGet(
                            query(
                                ref(db, `users/${uid}/reports/${category}/${targetId}/daily`),
                                orderByKey(),
                                startAt(dates[0]),
                                endAt(dates[1])
                            )
                        ),
                        firebaseGet(
                            query(
                                ref(db, `users/${uid}/reports/${category}/${targetId}/hourly`),
                                orderByKey(),
                                startAt(dates[0]),
                                endAt(dates[1])
                            )
                        ),
                        firebaseGet(
                            ref(db, `users/${uid}/reports/${category}/${targetId}/accumulators`)
                        )
                    ]);

                    if (!dailySnap.exists()) {
                        setData("NOT_FOUND");
                        return;
                    }

                    const dailyDataMap = dailySnap.val() || {};
                    const hourlyDataMap = hourlySnap.val() || {};
                    const liveAccumulators = accumulatorsSnap.val() || null;

                    const allDays: any[] = [];
                    const allHours: any[] = [];

                    Object.entries(dailyDataMap).forEach(([date, dayVal]: [string, any]) => {
                        allDays.push({
                            date,
                            phase_values: dayVal.phase_values ? transformDailyData(dayVal.phase_values) : null,
                            accumulators: dayVal.total?.accumulators || dayVal.accumulators || liveAccumulators,
                            electricity: dayVal.total?.electricity ?? dayVal.electricity ?? 0
                        });

                        const hoursForDay = hourlyDataMap[date] || {};
                        Object.entries(hoursForDay).forEach(([key, hourVal]: [string, any]) => {
                            if (key !== "total" && hourVal && typeof hourVal === "object" && hourVal.from !== undefined) {
                                allHours.push({
                                    from: hourVal.from,
                                    time: hourVal.time,
                                    phase_values: hourVal.phase_values ? transformDailyData(hourVal.phase_values) : null,
                                    accumulators: hourVal.accumulators || null,
                                    electricity_usage: hourVal.electricity_usage ?? hourVal.electricity ?? 0
                                });
                            }
                        });
                    });

                    setData({
                        allDays,
                        allHours,
                        phase_values: allDays[0]?.phase_values || null,
                        accumulators: allDays[0]?.accumulators || liveAccumulators
                    });
                }
            } catch (err) {
                console.error("[PowerAnalyzerReport] Error loading report data:", err);
                toast({
                    title: "Error loading data",
                    description: "Something went wrong while fetching power telemetry.",
                    status: "error",
                    duration: 5000,
                    isClosable: true
                });
                setData("NOT_FOUND");
            }
        };

        loadReportData();
    }, [uid, targetId, targetType, parameters.date, toast]);

    const downloadPDF = async () => {
        if (!data || isBusy) return;
        setIsBusy(true);
        try {
            const tables: { [key: string]: string[][] } = {};
            const phaseVals = data.phase_values;

            const getValStr = (phaseObj: any, field: string, isKilo = false, decimals = 2) => {
                if (!phaseObj?.[field]) return "-";
                const val = phaseObj[field];
                if (!val || val.avg === undefined || isNaN(val.avg)) return "-";

                const avg = isKilo ? val.avg / 1000 : val.avg;
                const max = isKilo ? (val.max !== undefined ? val.max / 1000 : avg) : (val.max ?? avg);
                const min = isKilo ? (val.min !== undefined ? val.min / 1000 : avg) : (val.min ?? avg);

                if (!METRIC_HAS_MIN[field] || min === undefined || isNaN(min)) {
                    return `Avg: ${avg.toFixed(decimals)}, Max: ${max.toFixed(decimals)}`;
                }
                return `Min: ${min.toFixed(decimals)}, Avg: ${avg.toFixed(decimals)}, Max: ${max.toFixed(decimals)}`;
            };

            const phases = ["SUM", "R", "S", "T"];
            const phaseLabels = ["Total (SUM)", "Phase R", "Phase S", "Phase T"];

            if (phaseVals?.SUM) {
                const powerRows = POWER_METRICS.map(m => [
                    `${m.label} (${m.unit})`,
                    ...phases.map(p => getValStr(phaseVals[p], m.key, m.isKilo, m.decimals))
                ]);

                tables["Power Parameters"] = [
                    ["Parameter", ...phaseLabels],
                    ...powerRows
                ];

                const harmonicsRows = HARMONICS_METRICS.map(m => [
                    `${m.label} (${m.unit})`,
                    ...phases.map(p => getValStr(phaseVals[p], m.key, false, m.decimals))
                ]);

                tables["Harmonics"] = [
                    ["Harmonic Distortion", ...phaseLabels],
                    ...harmonicsRows
                ];
            }

            if (data.accumulators) {
                const acc = data.accumulators;
                tables["Energy Accumulators"] = [
                    ["Accumulator", "Value"],
                    ["Active Energy (Total)", `${formatVal(acc.SUM_WH_Total, 3)} kWh`],
                    ["Active Energy (Import)", `${formatVal(acc.SUM_WH_Import, 3)} kWh`],
                    ["Active Energy (Export)", `${formatVal(acc.SUM_WH_Export, 3)} kWh`],
                    ["Apparent Energy", `${formatVal(acc.SUM_VAH, 3)} kVAh`],
                    ["Reactive Energy (Total)", `${formatVal(acc.SUM_VarH_Total, 3)} kVARh`],
                ];
            }

            const validHours = [...(data.allHours || [])].filter((h) => h && h.from !== undefined).sort((a, b) => a.from - b.from);
            if (validHours.length > 0) {
                const hourlyRows: string[][] = [];
                validHours.forEach((hour) => {
                    const timeStr = secToTime(hour.from) + " - " + secToTime(hour.time);
                    const pv = hour.phase_values?.SUM;
                    if (pv) {
                        hourlyRows.push([
                            timeStr,
                            pv.volt?.avg !== undefined ? pv.volt.avg.toFixed(1) : "-",
                            pv.amp?.avg !== undefined ? pv.amp.avg.toFixed(3) : "-",
                            pv.power?.avg !== undefined ? (pv.power.avg / 1000).toFixed(3) : "-",
                            pv.powerFactor?.avg !== undefined ? pv.powerFactor.avg.toFixed(2) : "-",
                        ]);
                    }
                });

                if (hourlyRows.length > 0) {
                    tables["Hourly Summary (SUM)"] = [
                        ["Hour", "Voltage Avg (V)", "Current Avg (A)", "Power Avg (kW)", "PF Avg"],
                        ...hourlyRows
                    ];
                }
            }

            if (Object.keys(tables).length === 0) {
                toast({ title: "No data to export", description: "There is no report data available to generate PDF.", status: "warning", duration: 4000, isClosable: true });
                return;
            }

            await landscapePDF({
                filename: `power-analyzer-report(${dayjs(parameters.date.from).format("DD-MM-YYYY")}).pdf`,
                headings: {
                    left: "Power Analyzer Report",
                    middle: String(targetName || "Target"),
                    right: String(dateTitle || "")
                },
                stats: {
                    "TARGET :": String(targetName || "Target"),
                    "TYPE :": String(targetType || "MACHINE").toUpperCase(),
                    "DURATION :": String(dateTitle || ""),
                    "TOTAL ACTIVE ENERGY :": data.accumulators ? `${formatVal(data.accumulators.SUM_WH_Total, 3)} kWh` : "N/A",
                },
                tables
            });
        } catch (err) {
            console.error("Failed to download PDF:", err);
            toast({ title: "Download failed", description: "Could not generate PDF report.", status: "error", duration: 4000, isClosable: true });
        } finally {
            setIsBusy(false);
        }
    };

    const downloadExcel = async () => {
        if (!data || isBusy) return;
        setIsBusy(true);
        try {
            const sections: ExcelSectionType[] = [];
            const phaseVals = data.phase_values;

            const getValArray = (phaseObj: any, field: string, isKilo = false) => {
                if (!phaseObj?.[field]) return ["-", "-", "-"];
                const val = phaseObj[field];
                if (!val || val.avg === undefined || isNaN(val.avg)) return ["-", "-", "-"];
                const avg = isKilo ? val.avg / 1000 : val.avg;
                const max = isKilo ? (val.max !== undefined ? val.max / 1000 : avg) : (val.max ?? avg);
                const min = isKilo ? (val.min !== undefined ? val.min / 1000 : avg) : (val.min ?? avg);

                return [
                    min !== undefined && !isNaN(min) ? +min.toFixed(3) : "-",
                    +avg.toFixed(3),
                    max !== undefined && !isNaN(max) ? +max.toFixed(3) : "-"
                ];
            };

            if (phaseVals?.SUM) {
                const powerData = POWER_METRICS.map(m => [
                    `${m.label} (${m.unit})`,
                    ...getValArray(phaseVals.SUM, m.key, m.isKilo),
                    ...getValArray(phaseVals.R, m.key, m.isKilo),
                    ...getValArray(phaseVals.S, m.key, m.isKilo),
                    ...getValArray(phaseVals.T, m.key, m.isKilo),
                ]);

                sections.push({
                    mainHeading: "Power Parameters",
                    subHeadings: ["Metric", "SUM Min", "SUM Avg", "SUM Max", "R Min", "R Avg", "R Max", "S Min", "S Avg", "S Max", "T Min", "T Avg", "T Max"],
                    data: powerData,
                    footer: []
                });

                const harmonicsData = HARMONICS_METRICS.map(m => [
                    `${m.label} (${m.unit})`,
                    ...getValArray(phaseVals.SUM, m.key),
                    ...getValArray(phaseVals.R, m.key),
                    ...getValArray(phaseVals.S, m.key),
                    ...getValArray(phaseVals.T, m.key),
                ]);

                sections.push({
                    mainHeading: "Harmonics",
                    subHeadings: ["Metric", "SUM Min", "SUM Avg", "SUM Max", "R Min", "R Avg", "R Max", "S Min", "S Avg", "S Max", "T Min", "T Avg", "T Max"],
                    data: harmonicsData,
                    footer: []
                });
            }

            if (data.accumulators) {
                const acc = data.accumulators;
                sections.push({
                    mainHeading: "Energy Accumulators",
                    subHeadings: ["Accumulator", "Value"],
                    data: [
                        ["Active Energy (Total) (kWh)", +(acc.SUM_WH_Total || 0).toFixed(3)],
                        ["Active Energy (Import) (kWh)", +(acc.SUM_WH_Import || 0).toFixed(3)],
                        ["Active Energy (Export) (kWh)", +(acc.SUM_WH_Export || 0).toFixed(3)],
                        ["Apparent Energy (kVAh)", +(acc.SUM_VAH || 0).toFixed(3)],
                        ["Reactive Energy (Total) (kVARh)", +(acc.SUM_VarH_Total || 0).toFixed(3)],
                    ],
                    footer: []
                });
            }

            const validHours = [...(data.allHours || [])].filter((h) => h && h.from !== undefined).sort((a, b) => a.from - b.from);
            if (validHours.length > 0) {
                const hourlyRows: any[] = [];
                validHours.forEach((hour) => {
                    const timeStr = secToTime(hour.from) + " - " + secToTime(hour.time);
                    const pv = hour.phase_values?.SUM;
                    if (pv) {
                        hourlyRows.push([
                            timeStr,
                            pv.volt?.avg !== undefined ? +pv.volt.avg.toFixed(1) : "-",
                            pv.amp?.avg !== undefined ? +pv.amp.avg.toFixed(3) : "-",
                            pv.power?.avg !== undefined ? +(pv.power.avg / 1000).toFixed(3) : "-",
                            pv.powerFactor?.avg !== undefined ? +pv.powerFactor.avg.toFixed(2) : "-",
                        ]);
                    }
                });

                if (hourlyRows.length > 0) {
                    sections.push({
                        mainHeading: "Hourly Summary (SUM)",
                        subHeadings: ["Hour", "Voltage Avg (V)", "Current Avg (A)", "Power Avg (kW)", "PF Avg"],
                        data: hourlyRows,
                        footer: []
                    });
                }
            }

            if (sections.length === 0) {
                toast({ title: "No data to export", description: "There is no report data available to generate Excel spreadsheet.", status: "warning", duration: 4000, isClosable: true });
                return;
            }

            await excelDownload({
                filename: `power-analyzer-report(${dayjs(parameters.date.from).format("DD-MM-YYYY")}).xlsx`,
                heading: `${targetName} Power Analysis Report`,
                sections
            });
        } catch (err) {
            console.error("Failed to download Excel:", err);
            toast({ title: "Download failed", description: "Could not generate Excel spreadsheet.", status: "error", duration: 4000, isClosable: true });
        } finally {
            setIsBusy(false);
        }
    };

    const border = `${colorMode}.border`;

    if (data === null) {
        return (
            <MyCard as={Center} minH="50vh">
                <SmallFill />
            </MyCard>
        );
    }

    if (data === "NOT_FOUND" || (!data.phase_values && data.allDays?.length === 0)) {
        return (
            <MyCard as={Center} minH="50vh">
                <NotFound />
            </MyCard>
        );
    }

    return (
        <Flex gap={5} flexDir="column">
            <Box display="flex" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={2}>
                <Text fontWeight={600} fontSize="lg">
                    Power Analyzer:{" "}
                    <span style={{ color: "var(--chakra-colors-primary)", fontWeight: 500, fontSize: "0.9rem" }}>
                        {targetName} | {dateTitle}
                    </span>
                </Text>
                <Stack alignItems="center" gap={2} flexDir="row">
                    <MyPopover placement="bottom-end">
                        <Text userSelect="none" cursor="pointer" transition="all ease 0.2s" _hover={{ color: "primary" }} fontWeight={600} fontSize="sm" display="flex" alignItems="center" justifyContent="space-between" gap={1} color="orange.300">
                            <FiDownload />
                            Download
                        </Text>
                        <Box>
                            <VStack w="100%" alignItems="flex-start">
                                <Text onClick={() => { !isBusy && downloadPDF() }} userSelect="none" cursor="pointer" transition="all ease 0.2s" _hover={{ opacity: 1 }} fontWeight={600} fontSize="sm" display="flex" alignItems="center" justifyContent="space-between" gap={1} opacity="0.8">
                                    <FaFilePdf />
                                    Download PDF
                                </Text>
                                <Text onClick={() => { !isBusy && downloadExcel() }} userSelect="none" cursor="pointer" transition="all ease 0.2s" _hover={{ opacity: 1 }} fontWeight={600} fontSize="sm" display="flex" alignItems="center" justifyContent="space-between" gap={1} opacity="0.8">
                                    <FaFileExcel />
                                    Download Excel
                                </Text>
                            </VStack>
                        </Box>
                    </MyPopover>
                </Stack>
            </Box>

            <MyCard w="100%" noPadding>
                <CardBody>
                    <Tabs variant="enclosed" size="md" colorScheme="orange">
                        <TabList borderBottom="1px solid" borderColor={border} overflowX="auto" overflowY="hidden">
                            <Tab fontWeight="600" flexShrink={0} whiteSpace="nowrap">Power</Tab>
                            <Tab fontWeight="600" flexShrink={0} whiteSpace="nowrap">Accumulators</Tab>
                            <Tab fontWeight="600" flexShrink={0} whiteSpace="nowrap">Power Quality</Tab>
                        </TabList>
                        <TabPanels mt={4}>
                            <TabPanel p={0}>
                                <PowerTab data={data} isSingleDay={isSingleDay} />
                            </TabPanel>
                            <TabPanel p={0}>
                                <AccumulatorsTab data={data} isSingleDay={isSingleDay} />
                            </TabPanel>
                            <TabPanel p={0}>
                                <PowerQualityTab data={data} isSingleDay={isSingleDay} />
                            </TabPanel>
                        </TabPanels>
                    </Tabs>
                </CardBody>
            </MyCard>
        </Flex>
    );
};

export default PowerAnalyzerReport;