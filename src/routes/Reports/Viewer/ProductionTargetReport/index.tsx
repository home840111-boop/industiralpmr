import { Box, Center, Flex, Stack, Text, useToast, VStack } from "@chakra-ui/react"
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
import { Option, ReportParametrsType } from "../../Selector/types"
import dayjs from "../../../../Components/Functions/dayjs"
import TotalStats from "./TotalStats"
import Charts from "./Charts"
import TargetDowntimeSection, { TargetDowntimeData, TargetDowntimeEvent } from "./TargetDowntimeSection"
import { viewAll } from "../FactoryReport/Machine/MachineBreakdown/PieChart"
import secFormatter from "../../../../Components/Functions/formatters/secFormatter"
import landscapePDF from "../../../../Components/Exporters/landscapePDF"
import excelDownload, { ExcelSectionType } from "../../../../Components/Exporters/excelDownload"

interface DataToSet {
    name: string;
    target: {
        total: number;
        completed: number;
    },
    stats: {
        ontime: number;
        downtime: number;
        efficiency: number;
    },
    hourly: {
        datetime: string;
        downtime: number;
        ontime: number;
        efficiency: number;
        production: number;
        targetProduction: number;
        downtimeReason?: string;
        downtimeCategory?: string;
        isPlanned?: boolean;
        plannedDowntime?: number;
    }[],
    timeline: {
        start: number;
        end: number;
        due: number;
    },
    downtime?: TargetDowntimeData
}
const ProductionTargetReport = ({
    parameters
}: {
    parameters: ReportParametrsType["production-targets"]
}) => {
    const toast = useToast();
    const [data, setData] = useState<null | DataToSet | "NOT_FOUND">(null);
    const [isBusy, setIsBusy] = useState(false);
    const [machineName, moldsName, targetName] = useMemo(() => {
        return [
            (parameters.option as Option)?.label || "",
            (parameters.secondaryOption as Option)?.label || "",
            (parameters.thirdOption as Option)?.label || "",
        ]
    }, [parameters]);
    const selectedTitle = useMemo(() => {
        return `${machineName} | ${moldsName} | ${targetName}`
    }, [machineName, moldsName, targetName]);

    useEffect(() => {
        const func = async () => {
            const dataToSet: DataToSet = {
                name: "",
                target: {
                    total: 0,
                    completed: 0
                },
                stats: {
                    ontime: 0,
                    downtime: 0,
                    efficiency: 0
                },
                hourly: [],
                timeline: {
                    start: 0,
                    end: 0,
                    due: 0
                },
                downtime: {
                    total: 0,
                    planned: 0,
                    unplanned: 0,
                    events: [],
                    categoryBreakdown: []
                }
            }
            setData(null);
            const snap = await get(`production-targets/completed/${(parameters.option as Option)?.value}/${(parameters.secondaryOption as Option)?.value}/${(parameters.thirdOption as Option)?.value}`);
            if (!snap.exists()) {
                setData("NOT_FOUND");
                return;
            }
            const data = snap.val();
            const parseTimestampToUnix = (val: any): number => {
                if (!val) return 0;
                if (typeof val === "number") {
                    if (isNaN(val)) return 0;
                    return val > 100_000_000_000 ? Math.floor(val / 1000) : Math.floor(val);
                }
                const d = dayjs(val);
                return d.isValid() ? d.unix() : 0;
            };

            dataToSet.name = data.name || "";
            dataToSet.timeline.start = parseTimestampToUnix(data.startedAt);
            dataToSet.timeline.end = parseTimestampToUnix(data.completedAt);
            dataToSet.timeline.due = parseTimestampToUnix(data.target?.due || data.due);
            dataToSet.target.total = data.target?.total || 0;
            dataToSet.target.completed = data.target?.current || 0;
            dataToSet.stats.efficiency = (data.efficiency || 0) * 100;
            for (const key in (data.hours || {})) {
                // format: 2021-09-01-01
                const hour = data.hours[key] || {};
                const keyParts = key.split("-");
                const datePart = keyParts.slice(0, 3).join("-");
                const hourPart = keyParts[3] || "00";
                const parsedDate = dayjs(datePart).isValid() ? dayjs(datePart).format("YYYY-MM-DD") : datePart;

                let startTime = `${hourPart.padStart(2, "0")}:00`;
                if (hour.time && typeof hour.time === "string") {
                    const firstPart = hour.time.split("-")[0]?.trim();
                    if (firstPart) {
                        startTime = firstPart;
                    }
                }
                const dt = dayjs(`${parsedDate} ${startTime}`);
                const cleanDatetime = dt.isValid() ? dt.format("YYYY-MM-DD HH:mm") : `${parsedDate} ${startTime}`;
                const ontime = Number(hour.ontime) || 0;
                const downtime = Number(hour.downtime) || 0;
                const totalTime = ontime + downtime;
                const efficiency = totalTime > 0 ? +((ontime / totalTime) * 100).toFixed(2) : 0;

                dataToSet.stats.ontime += ontime;
                dataToSet.stats.downtime += downtime;
                dataToSet.hourly.push({
                    datetime: cleanDatetime,
                    downtime,
                    ontime,
                    efficiency,
                    production: Number(hour.production) || 0,
                    targetProduction: Number(data.target?.hourlyTarget) || 0
                });
            }
            if (!dataToSet.stats.efficiency) {
                const totalLogged = dataToSet.stats.ontime + dataToSet.stats.downtime;
                dataToSet.stats.efficiency = totalLogged > 0 ? (dataToSet.stats.ontime / totalLogged) * 100 : 0;
            }

            // Fetch target downtime monitoring with robust edge-case handling
            try {
                const machineId = (parameters.option as Option)?.value;
                const targetStart = dataToSet.timeline.start;
                const nowUnix = dayjs().unix();
                const isTargetCompleted = Boolean(dataToSet.timeline.end && dataToSet.timeline.end > 0);
                const targetEnd = isTargetCompleted ? dataToSet.timeline.end : nowUnix;

                if (machineId && targetStart > 0) {
                    const startDayStr = dayjs.unix(targetStart).format("YYYY-MM-DD");
                    const endDayStr = dayjs.unix(targetEnd).format("YYYY-MM-DD");
                    let curDay = dayjs(startDayStr, "YYYY-MM-DD");
                    const lastDay = dayjs(endDayStr, "YYYY-MM-DD");
                    const targetDates: string[] = [];
                    while (!curDay.isAfter(lastDay, "day")) {
                        targetDates.push(curDay.format("YYYY-MM-DD"));
                        curDay = curDay.add(1, "day");
                    }

                    const hourlySnaps = await Promise.all(
                        targetDates.map((d) => get(`reports/machines/${machineId}/hourly/${d}`).catch(() => null))
                    );

                    const rawEvents: Record<string, any> = {};
                    hourlySnaps.forEach((hSnap, dIdx) => {
                        if (!hSnap || !hSnap.exists()) return;
                        const dStr = targetDates[dIdx];
                        const dayStartUnix = dayjs(`${dStr} 00:00:00`).unix();
                        const hData = hSnap.val() || {};
                        for (const [chunkId, chunk] of Object.entries(hData as Record<string, any>)) {
                            if (!chunk) continue;
                            const isShutdown = Boolean(chunk.isShutdown || (chunk.shutdown_time && chunk.shutdown_time > 0));
                            const isIdle = Boolean(!chunk.status && (chunk.offtime > 0 || isShutdown));
                            if (!isIdle && !isShutdown) continue;

                            const fromSec = typeof chunk.from === "number" ? chunk.from : 0;
                            const timeSec = typeof chunk.time === "number" ? chunk.time : fromSec;
                            const cStart = dayStartUnix + fromSec;
                            const cEnd = dayStartUnix + timeSec;

                            if (cEnd >= targetStart && cStart <= targetEnd) {
                                rawEvents[`${dStr}_${chunkId}`] = {
                                    start: cStart,
                                    end: cEnd,
                                    status: isShutdown ? "OFF" : "IDLE",
                                    reason: chunk.reason || "uncategorized",
                                };
                            }
                        }
                    });

                    if (Object.keys(rawEvents).length > 0) {

                        // Edge case 7: Device clock drift / UTC timezone skew
                        const tzOffset = (dayjs().tz("Asia/Karachi").utcOffset() || 300) * 60;
                        const isDeviceShifted = Boolean(
                            Object.values(rawEvents).some(
                                (d: any) => d && typeof d.start === "number" && d.start > nowUnix + 300
                            )
                        );

                        const catMap: { [cat: string]: number } = {};
                        const parsedEvents: TargetDowntimeEvent[] = [];
                        let dtTotal = 0;
                        let dtPlanned = 0;

                        const rawList: Array<{
                            id: string;
                            start: number;
                            end: number;
                            rawEnd: number;
                            isEventActive: boolean;
                            ev: any;
                        }> = [];

                        for (const [id, ev] of Object.entries(rawEvents || {})) {
                            if (!ev || typeof ev.start !== "number" || isNaN(ev.start)) continue;

                            const normalizedStart = isDeviceShifted ? ev.start - tzOffset : ev.start;
                            const isEventActive = !ev.end || ev.end === 0 || isNaN(ev.end);
                            const rawEnd = isEventActive ? (isTargetCompleted ? targetEnd : nowUnix) : (isDeviceShifted ? ev.end! - tzOffset : ev.end!);

                            if (rawEnd < targetStart || normalizedStart > targetEnd) continue;

                            rawList.push({
                                id,
                                start: normalizedStart,
                                end: ev.end && !isNaN(ev.end) ? (isDeviceShifted ? ev.end - tzOffset : ev.end) : 0,
                                rawEnd,
                                isEventActive,
                                ev
                            });
                        }

                        // Sort chronologically. If start is identical, place closed records before open ones
                        rawList.sort((a, b) => {
                            if (a.start !== b.start) return a.start - b.start;
                            return (b.end || 0) - (a.end || 0);
                        });

                        // Deduplicate ghost unclosed duplicates
                        const cleanList: typeof rawList = [];
                        for (let i = 0; i < rawList.length; i++) {
                            const cur = rawList[i];
                            const next = rawList[i + 1];

                            if (next && Math.abs(next.start - cur.start) <= 60) {
                                if (cur.end > 0 && (!next.end || next.end === 0)) {
                                    i++; // Skip next ghost
                                    cleanList.push(cur);
                                    continue;
                                } else if ((!cur.end || cur.end === 0) && next.end > 0) {
                                    cleanList.push(next);
                                    i++;
                                    continue;
                                }
                            }
                            cleanList.push(cur);
                        }

                        for (let i = 0; i < cleanList.length; i++) {
                            const item = cleanList[i];
                            const isLast = i === cleanList.length - 1;

                            let effectiveEnd = item.rawEnd;
                            let isActuallyActive = item.isEventActive && !isTargetCompleted;

                            if (item.isEventActive) {
                                if (!isLast) {
                                    // A non-last event cannot remain open past the start of the next event
                                    effectiveEnd = Math.max(cleanList[i + 1].start, item.start);
                                    isActuallyActive = false;
                                }
                            } else if (!isLast && cleanList[i + 1].start > item.start && effectiveEnd > cleanList[i + 1].start) {
                                effectiveEnd = cleanList[i + 1].start;
                            }

                            const trueStart = Math.max(item.start, targetStart);
                            const trueEnd = Math.min(effectiveEnd, targetEnd);
                            const duration = Math.max(trueEnd - trueStart, 0);

                            const reasonObj = typeof item.ev.reason === "object" && item.ev.reason !== null
                                ? item.ev.reason
                                : { category: typeof item.ev.reason === "string" ? item.ev.reason : "uncategorized", note: "", scheduled: false };

                            const category = (reasonObj.category || "uncategorized").toLowerCase();
                            const scheduled = !!reasonObj.scheduled;
                            const note = reasonObj.note || "";

                            dtTotal += duration;
                            if (scheduled) dtPlanned += duration;
                            catMap[category] = (catMap[category] || 0) + duration;

                            parsedEvents.push({
                                id: item.id,
                                start: trueStart,
                                end: trueEnd,
                                duration,
                                status: item.ev.status === "OFF" ? "OFF" : "IDLE",
                                category,
                                note,
                                scheduled,
                                isActive: isActuallyActive
                            });
                        }

                        parsedEvents.sort((a, b) => a.start - b.start);
                        const categoryBreakdown = Object.entries(catMap).map(([name, value]) => ({ name, value }));

                        dataToSet.downtime = {
                            total: dtTotal,
                            planned: dtPlanned,
                            unplanned: Math.max(dtTotal - dtPlanned, 0),
                            events: parsedEvents,
                            categoryBreakdown
                        };

                        // Edge case 4: Planned downtime exclusion from efficiency
                        const effectiveDowntime = Math.max(dataToSet.stats.downtime - dtPlanned, 0);
                        const totalEffective = dataToSet.stats.ontime + effectiveDowntime;
                        if (totalEffective > 0) {
                            dataToSet.stats.efficiency = (dataToSet.stats.ontime / totalEffective) * 100;
                        }

                        // Overlay downtime reasons onto each hour in dataToSet.hourly
                        if (parsedEvents.length > 0) {
                            for (const h of dataToSet.hourly) {
                                const dt = dayjs(h.datetime);
                                const hStart = dt.isValid() ? dt.unix() : 0;
                                const hEnd = hStart + 3600;
                                if (hStart === 0 || (h.downtime || 0) <= 0) continue;

                                const matching = parsedEvents.filter(ev => ev.start < hEnd && ev.end > hStart);
                                if (matching.length > 0) {
                                    const catMap = new Map<string, { category: string; scheduled: boolean; note?: string }>();
                                    let plannedInHour = 0;
                                    for (const m of matching) {
                                        const overlapStart = Math.max(m.start, hStart);
                                        const overlapEnd = Math.min(m.end, hEnd);
                                        const overlapDur = Math.max(overlapEnd - overlapStart, 0);
                                        if (m.scheduled) plannedInHour += overlapDur;
                                        const key = m.category.toLowerCase();
                                        if (!catMap.has(key)) {
                                            catMap.set(key, { category: m.category, scheduled: m.scheduled, note: m.note });
                                        } else if (m.scheduled) {
                                            catMap.get(key)!.scheduled = true;
                                        }
                                    }
                                    const items = Array.from(catMap.values());
                                    h.downtimeReason = items.map(it => `${it.category.toUpperCase()}${it.scheduled ? " (Planned)" : ""}`).join(", ");
                                    h.downtimeCategory = items.map(it => it.category.toUpperCase()).join(", ");
                                    h.isPlanned = items.some(it => it.scheduled);
                                    h.plannedDowntime = plannedInHour;

                                    const effectiveDt = Math.max((h.downtime || 0) - plannedInHour, 0);
                                    const totalH = (h.ontime || 0) + effectiveDt;
                                    h.efficiency = totalH > 0 ? +(((h.ontime || 0) / totalH) * 100).toFixed(2) : 0;
                                }
                            }
                        }
                    }
                }
            } catch (err) {
                console.warn("Failed to load target downtime monitoring:", err);
            }

            setData(dataToSet);
        }
        func();
    }, [parameters]);

    const handleUpdateDowntime = (updated: any) => {
        setData(prev => {
            if (!prev || prev === "NOT_FOUND" || !prev.downtime) return prev;
            const newEvents = prev.downtime.events.map(e => e.id === updated.id ? {
                ...e,
                category: (updated.reason?.category || e.category).toLowerCase(),
                note: updated.reason?.note !== undefined ? updated.reason.note : e.note,
                scheduled: updated.reason?.scheduled !== undefined ? !!updated.reason.scheduled : e.scheduled
            } : e);

            let newTotal = 0;
            let newPlanned = 0;
            const catMap: { [cat: string]: number } = {};
            for (const ev of newEvents) {
                newTotal += ev.duration;
                if (ev.scheduled) newPlanned += ev.duration;
                catMap[ev.category] = (catMap[ev.category] || 0) + ev.duration;
            }
            const newBreakdown = Object.entries(catMap).map(([name, value]) => ({ name, value }));

            // Recalculate efficiency excluding planned downtime
            const effectiveDt = Math.max(prev.stats.downtime - newPlanned, 0);
            const totalEff = prev.stats.ontime + effectiveDt;
            const newEfficiency = totalEff > 0 ? (prev.stats.ontime / totalEff) * 100 : 0;

            return {
                ...prev,
                stats: {
                    ...prev.stats,
                    efficiency: newEfficiency
                },
                downtime: {
                    total: newTotal,
                    planned: newPlanned,
                    unplanned: Math.max(newTotal - newPlanned, 0),
                    events: newEvents,
                    categoryBreakdown: newBreakdown
                }
            };
        });
    };

    const downloadPDF = async () => {
        if (data === null || data === "NOT_FOUND") return;
        setIsBusy(true);
        const tables = {} as {
            [key: string]: string[][]
        };
        const hourlyStatsTable = [[
            "Time",
            "Act Prod",
            "Exp Prod",
            "Ontime",
            "Downtime",
            "Reason",
            "Efficiency"
        ]];
        for (const hour of data.hourly) {
            const time = hour.datetime;
            const d = dayjs(time);
            hourlyStatsTable.push([
                d.isValid() ? d.format("YYYY-MM-DD HH:mm") : time,
                viewAll(hour.production, "production"),
                viewAll(hour.targetProduction, "production"),
                secFormatter(hour.ontime),
                secFormatter(hour.downtime),
                hour.downtimeReason || (hour.downtime > 0 ? "UNCATEGORIZED" : "-"),
                hour.efficiency + "%"
            ]);
        }
        tables["Hourly Stats"] = hourlyStatsTable;
        if (data.downtime && data.downtime.events.length > 0) {
            tables["Downtime Events"] = [
                ["Started", "Status", "Duration", "Category", "Type", "Notes"],
                ...data.downtime.events.map(ev => [
                    dayjs.unix(ev.start).format("YYYY-MM-DD HH:mm"),
                    ev.status,
                    secFormatter(ev.duration),
                    ev.category.toUpperCase(),
                    ev.scheduled ? "Planned" : "Unplanned",
                    ev.note || "-"
                ])
            ];
        }
        await landscapePDF({
            filename: `production-report(${data.name}).pdf`,
            headings: {
                left: "Production Target Report",
                middle: data.name,
                right: `${data.timeline.start ? dayjs.unix(data.timeline.start).format("YYYY-MM-DD HH:mm") : "NA"} - ${data.timeline.end ? dayjs.unix(data.timeline.end).format("YYYY-MM-DD HH:mm") : "NA"}`
            },
            stats: {
                "Target Set": viewAll(data.target.total, "production"),
                "Target Achieved": viewAll(data.target.completed, "production"),
                "Ontime": secFormatter(data.stats.ontime),
                "Downtime": secFormatter(data.stats.downtime),
                "Efficiency": data.stats.efficiency.toFixed(2) + "%",
                "Due Time": data.timeline.due ? dayjs.unix(data.timeline.due).format("YYYY-MM-DD HH:mm") : "No Due Set"
            },
            tables
        });
        setIsBusy(false);
    }
    const downloadExcel = async () => {
        try {
            if (data === null || data === "NOT_FOUND") return;
            setIsBusy(true);
            const sections = [] as ExcelSectionType[];
            const totalStatsSection: ExcelSectionType = {
                mainHeading: `Production Target Report (${data.name})`,
                subHeadings: [
                    "Time",
                    "Act Prod",
                    "Exp Prod",
                    "Ontime",
                    "Downtime",
                    "Efficiency"
                ],
                data: [] as ExcelSectionType['data'],
                footer: ["Total", 0, "", 0, 0, ""] as ExcelSectionType['footer']
            };
            for (const hour of data.hourly) {
                const time = hour.datetime;
                const d = dayjs(time);
                totalStatsSection.data.push([
                    d.isValid() ? d.format("YYYY-MM-DD HH:mm") : time,
                    viewAll(hour.production, "production"),
                    viewAll(hour.targetProduction, "production"),
                    secFormatter(hour.ontime),
                    secFormatter(hour.downtime),
                    hour.efficiency + "%"
                ]);
                (totalStatsSection.footer[1] as number) += hour.production;
                (totalStatsSection.footer[3] as number) += hour.ontime;
                (totalStatsSection.footer[4] as number) += hour.downtime;
            };
            totalStatsSection.footer[1] = viewAll(totalStatsSection.footer[1] as number, "production");
            totalStatsSection.footer[3] = secFormatter(totalStatsSection.footer[3] as number);
            totalStatsSection.footer[4] = secFormatter(totalStatsSection.footer[4] as number);
            totalStatsSection.footer[5] = data.stats.efficiency.toFixed(2) + "%";
            sections.push(totalStatsSection);
            if (data.downtime && data.downtime.events.length > 0) {
                const downtimeSection: ExcelSectionType = {
                    mainHeading: `Downtime Events (${data.name})`,
                    subHeadings: ["Started", "Status", "Duration", "Category", "Type", "Notes"],
                    data: data.downtime.events.map(ev => [
                        dayjs.unix(ev.start).format("YYYY-MM-DD HH:mm"),
                        ev.status,
                        secFormatter(ev.duration),
                        ev.category.toUpperCase(),
                        ev.scheduled ? "Planned" : "Unplanned",
                        ev.note || "-"
                    ]),
                    footer: ["Total Downtime", "", secFormatter(data.downtime.total), "", "", ""]
                };
                sections.push(downtimeSection);
            }
            await excelDownload({
                filename: `production-report(${data.name}).xlsx`,
                heading: "Production Target Report",
                sections,
            });
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
    }

    return <Flex gap={5} flexDir={"column"}>
        <Box display="flex" alignItems={"center"} justifyContent="space-between">
            <Text fontWeight={600}>Production Target Report: <span style={{
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
                    <TotalStats data={data} />
                    <Charts data={data} />
                    <TargetDowntimeSection downtime={data.downtime} machineId={(parameters.option as Option)?.value} onUpdateDowntime={handleUpdateDowntime} />
                </Flex>
        }
    </Flex>
}

export default ProductionTargetReport;
export type {
    DataToSet
}