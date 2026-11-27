import React, { useEffect, useMemo, useRef, useState } from "react";
import {
    Box,
    CardHeader,
    Center,
    Checkbox,
    Flex,
    HStack,
    Icon,
    Progress,
    SimpleGrid,
    Text,
    useColorMode,
    VStack,
    Badge,
    Button,
    Tooltip,
    Spinner,
} from "@chakra-ui/react";
import { FiAlertTriangle, FiCheckCircle, FiClock, FiRefreshCw, FiX } from "react-icons/fi";
import { TbTimelineEventPlus } from "react-icons/tb";
import Primary from "../../../../Components/Buttons/Primary";
import dayjs from "../../../../Components/Functions/dayjs";
import secFormatter from "../../../../Components/Functions/formatters/secFormatter";
import MyCard from "../../../../Components/micro/Card";
import Table from "../../../../Components/micro/Table";
import Categorize from "../../../Targets/Target/Downtime/Categorize";
import store from "../../../../Components/Store";
import { dateAtom, isMasterAdminAtom, roleAtom, shiftsAtom, uidAtom } from "../../../../Components/Store/atoms";
import Listen from "../../../../Components/Store/hooks/Listen";
import Get from "../../../../Components/Store/hooks/Get";
import { canWriteOperational } from "../../../../Services/rbac";
import { auth, db } from "../../../../Components/firebase";
import { update } from "../../../../Components/firebase/api/db";
import { ref, onValue, serverTimestamp } from "firebase/database";
import { useWorkSchedules } from "../../../../Services/workSchedule";
import { useToast } from "@chakra-ui/react";

export interface MachineDowntimeEvent {
    id: string;
    rawChunkId?: string;
    start: number;
    end: number;
    duration: number;
    status: "IDLE" | "OFF";
    category: string;
    note: string;
    scheduled: boolean;
    isActive?: boolean;
    plannedSplitSec?: number;
}

interface Props {
    machineId: string;
    machineName?: string;
    date?: string;
    machineStatus?: "ON" | "IDLE" | "OFF" | string;
    onUpdateLog?: () => void;
}

const headings = [
    "Time",
    "Status",
    "Duration",
    "Category",
    "Type",
    "Notes",
    "Action"
];

const SelectCell: React.FC<{ checked: boolean; disabled?: boolean; onToggle: (checked: boolean, shiftKey: boolean) => void }> = ({ checked, disabled, onToggle }) => {
    return (
        <Checkbox
            colorScheme="orange"
            isChecked={checked}
            isDisabled={disabled}
            aria-label="Select downtime"
            onChange={e => onToggle(e.target.checked, !!(e.nativeEvent as MouseEvent).shiftKey)}
        />
    );
};

const TimeCell: React.FC<{ start: number; end: number }> = ({ start, end }) => {
    const timeLabel = `${dayjs.unix(start).format("hh:mm A")} - ${dayjs.unix(end).format("hh:mm A")}`;
    const dateLabel = dayjs.unix(start).format("DD MMM, YYYY");
    return (
        <VStack align="start" spacing={0} py={1}>
            <Text fontSize="xs" fontWeight={600}>{timeLabel}</Text>
            <Text fontSize="2xs" color="gray.500">{dateLabel}</Text>
        </VStack>
    );
};

const DurationCell: React.FC<{ duration: number; isActive?: boolean }> = ({ duration, isActive }) => {
    return (
        <HStack spacing={1.5} py={1}>
            <Text fontSize="xs" fontWeight={600}>{secFormatter(duration)}</Text>
            {isActive && (
                <Badge colorScheme="red" variant="solid" fontSize="3xs" px={1} borderRadius="sm">
                    ACTIVE
                </Badge>
            )}
        </HStack>
    );
};

const DowntimeCard: React.FC<Props> = ({
    machineId,
    machineName,
    date: propDate,
    machineStatus,
    onUpdateLog
}) => {
    const { colorMode } = useColorMode();
    const toast = useToast();
    const isDark = colorMode === "dark";
    const selectedDate = Listen(dateAtom);
    const uid = Listen(uidAtom);
    Listen(roleAtom);
    Listen(isMasterAdminAtom);
    const canWrite = canWriteOperational(uid);
    const shiftsInfo = Get(shiftsAtom);
    const date = propDate || selectedDate || dayjs().format("YYYY-MM-DD");
    const { getDaySchedule } = useWorkSchedules();
    const daySchedule = useMemo(() => getDaySchedule(machineId, date), [getDaySchedule, machineId, date]);
    const plannedAllowanceSec = daySchedule.plannedAllowanceSec;

    const [events, setEvents] = useState<MachineDowntimeEvent[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [claimingId, setClaimingId] = useState<string | null>(null);
    const [refreshTrigger, setRefreshTrigger] = useState<number>(0);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const lastTicked = useRef<number | null>(null);

    const { border, subText } = useMemo(() => ({
        border: `${colorMode}.border`,
        subText: `${colorMode}.subText`
    }), [colorMode]);

    const selectedEvents = useMemo(
        () => events.filter(ev => selectedIds.includes(ev.id)),
        [events, selectedIds]
    );
    const selectedTotal = useMemo(
        () => selectedEvents.reduce((acc, ev) => acc + ev.duration, 0),
        [selectedEvents]
    );
    const uncategorizedEvents = useMemo(
        () => events.filter(ev => !ev.category || ev.category.toLowerCase() === "uncategorized"),
        [events]
    );
    const allUncategorizedSelected = uncategorizedEvents.length > 0 && uncategorizedEvents.every(ev => selectedIds.includes(ev.id));

    const toggleRow = (index: number, checked: boolean, shiftKey: boolean) => {
        const from = shiftKey && lastTicked.current !== null ? Math.min(lastTicked.current, index) : index;
        const to = shiftKey && lastTicked.current !== null ? Math.max(lastTicked.current, index) : index;
        const ids = events.slice(from, to + 1).filter(ev => !ev.id.endsWith("_planned")).map(ev => ev.id);
        setSelectedIds(prev => checked
            ? Array.from(new Set([...prev, ...ids]))
            : prev.filter(id => !ids.includes(id)));
        lastTicked.current = index;
    };

    const toggleAllUncategorized = () => {
        const ids = uncategorizedEvents.map(ev => ev.id);
        setSelectedIds(prev => allUncategorizedSelected
            ? prev.filter(id => !ids.includes(id))
            : Array.from(new Set([...prev, ...ids])));
        lastTicked.current = null;
    };

    const handleBulkSuccess = (updatedList: any[]) => {
        setEvents(prev => prev.map(ev => {
            const match = updatedList.find(u => u.id === ev.id);
            if (match) {
                return {
                    ...ev,
                    category: match.reason?.category || ev.category,
                    note: match.reason?.note || "",
                    scheduled: !!match.reason?.scheduled
                };
            }
            return ev;
        }));
        setSelectedIds([]);
        onUpdateLog?.();
    };

    const tableHeadings = useMemo(() => {
        if (!canWrite) return headings.filter(h => h !== "Action");
        return [
            <Checkbox
                key="select-all"
                colorScheme="orange"
                aria-label="Select all uncategorized downtime"
                isDisabled={uncategorizedEvents.length === 0}
                isChecked={allUncategorizedSelected}
                isIndeterminate={selectedEvents.length > 0 && !allUncategorizedSelected}
                onChange={toggleAllUncategorized}
            />,
            ...headings
        ];
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [uncategorizedEvents.length, allUncategorizedSelected, selectedEvents.length, canWrite]);

    useEffect(() => {
        if (!machineId) {
            setEvents([]);
            setLoading(false);
            return;
        }

        const uid = store.get(uidAtom);
        if (!uid) {
            setLoading(false);
            return;
        }

        setLoading(true);

        // Production day window: starts at shift A start (if configured) or midnight
        const dayStartUnix = dayjs(`${date} 00:00:00`).unix();
        const hourlyRef = ref(db, `users/${uid}/reports/machines/${machineId}/hourly/${date}`);

        const unsubscribe = onValue(hourlyRef, (snapshot) => {
            if (!snapshot.exists()) {
                setEvents([]);
                setLoading(false);
                return;
            }

            const rawData = (snapshot.val() || {}) as Record<string, any>;
            const nowUnix = dayjs().unix();
            const list: MachineDowntimeEvent[] = [];
            const isToday = date === dayjs().format("YYYY-MM-DD");
            const entries = Object.entries(rawData);

            for (let idx = 0; idx < entries.length; idx++) {
                const [id, item] = entries[idx];
                if (!item) continue;

                const isShutdown = Boolean(item.isShutdown || (item.shutdown_time && item.shutdown_time > 0));
                const isIdle = Boolean(!item.status && (item.offtime > 0 || isShutdown));
                if (!isIdle && !isShutdown) continue;

                const fromSec = typeof item.from === "number" ? item.from : 0;
                const timeSec = typeof item.time === "number" ? item.time : fromSec;
                const startUnix = dayStartUnix + fromSec;
                const endUnix = dayStartUnix + timeSec;

                const isLastChunk = idx === entries.length - 1;
                const isActive = isToday && isLastChunk && (machineStatus !== "ON");
                const rawEnd = isActive ? nowUnix : endUnix;

                const duration = isActive 
                    ? Math.max(0, nowUnix - startUnix)
                    : (item.shutdown_time || item.offtime || Math.max(0, endUnix - startUnix));

                // Extract categorization reason
                let category = "uncategorized";
                let note = "";
                let scheduled = false;
                let plannedSplitSec = 0;

                if (item.reason) {
                    if (typeof item.reason === "string") {
                        note = item.reason;
                    } else if (typeof item.reason === "object") {
                        category = item.reason.category || "uncategorized";
                        note = item.reason.note || "";
                        scheduled = !!item.reason.scheduled;
                        plannedSplitSec = +(item.reason.plannedSplitSec || 0);
                    }
                }

                if (plannedSplitSec > 0 && plannedSplitSec < duration) {
                    list.push({
                        id: `${id}_planned`,
                        rawChunkId: id,
                        start: startUnix,
                        end: startUnix + plannedSplitSec,
                        duration: plannedSplitSec,
                        status: isShutdown ? "OFF" : "IDLE",
                        category: "planned stoppage",
                        note: "Planned schedule allowance (auto-split)",
                        scheduled: true,
                        isActive: false,
                        plannedSplitSec
                    });
                    list.push({
                        id,
                        rawChunkId: id,
                        start: startUnix + plannedSplitSec,
                        end: rawEnd,
                        duration: Math.max(0, duration - plannedSplitSec),
                        status: isShutdown ? "OFF" : "IDLE",
                        category,
                        note,
                        scheduled,
                        isActive,
                        plannedSplitSec
                    });
                } else {
                    list.push({
                        id,
                        rawChunkId: id,
                        start: startUnix,
                        end: rawEnd,
                        duration,
                        status: isShutdown ? "OFF" : "IDLE",
                        category,
                        note,
                        scheduled,
                        isActive
                    });
                }
            }

            // Sort chronologically
            list.sort((a, b) => a.start - b.start);
            setEvents(list);
            setLoading(false);
        }, (err) => {
            console.error("Failed to load machine downtimes:", err);
            setLoading(false);
        });

        return () => {
            unsubscribe();
        };
    }, [machineId, date, shiftsInfo, machineStatus, refreshTrigger]);

    // KPI Metrics
    const metrics = useMemo(() => {
        let total = 0;
        let planned = 0;
        let unplanned = 0;
        let uncategorized = 0;
        const categoryMap: Record<string, number> = {};

        for (const ev of events) {
            total += ev.duration;
            const cat = ev.category.trim().toLowerCase();
            const isUncat = !cat || cat === "uncategorized" || cat === "none";

            if (isUncat) {
                uncategorized += ev.duration;
                categoryMap["uncategorized"] = (categoryMap["uncategorized"] || 0) + ev.duration;
            } else {
                if (ev.scheduled) {
                    planned += ev.duration;
                } else {
                    unplanned += ev.duration;
                }
                categoryMap[cat] = (categoryMap[cat] || 0) + ev.duration;
            }
        }

        const breakdown = Object.entries(categoryMap).map(([name, value]) => ({
            name,
            value
        })).sort((a, b) => b.value - a.value);

        const categorizedDuration = total - uncategorized;
        const categorizedPercent = total > 0 ? Math.min(100, Math.round((categorizedDuration / total) * 100)) : 100;
        const remainingAllowanceSec = Math.max(0, plannedAllowanceSec - planned);
        const unclaimedApplicableSec = Math.min(remainingAllowanceSec, uncategorized);
        const effectivePlanned = Math.min(total, Math.max(planned, Math.min(plannedAllowanceSec, planned + uncategorized)));
        const uncategorizedOutsideAllowanceSec = Math.max(0, uncategorized - remainingAllowanceSec);
        const allowanceClaimedPct = plannedAllowanceSec > 0
            ? Math.min(100, Math.round((planned / plannedAllowanceSec) * 100))
            : 100;

        return {
            total,
            planned,
            effectivePlanned,
            unplanned,
            uncategorized,
            remainingAllowanceSec,
            unclaimedApplicableSec,
            uncategorizedOutsideAllowanceSec,
            allowanceClaimedPct,
            breakdown,
            categorizedDuration,
            categorizedPercent
        };
    }, [events, plannedAllowanceSec]);

    const getShiftForSec = (secOfDay: number): "A" | "B" | "C" => {
        if (!shiftsInfo || shiftsInfo.shifts <= 1) return "A";
        const norm = (s: number) => (((s - (+(shiftsInfo.A || 0))) % 86400) + 86400) % 86400;
        const t = norm(secOfDay);
        if (shiftsInfo.shifts === 2) {
            return t >= norm(+(shiftsInfo.B || 0)) ? "B" : "A";
        }
        const normB = norm(+(shiftsInfo.B || 0));
        const normC = norm(+(shiftsInfo.C || 0));
        if (t >= normC) return "C";
        if (t >= normB) return "B";
        return "A";
    };

    const handleClaimPlanned = async (ev: MachineDowntimeEvent) => {
        if (!canWriteOperational(uid)) return;
        if (metrics.remainingAllowanceSec <= 0) return;
        const chunkId = ev.rawChunkId || ev.id;
        const claimSec = Math.min(ev.duration, metrics.remainingAllowanceSec);
        if (claimSec <= 0) return;

        setClaimingId(ev.id);
        try {
            const by = auth.currentUser?.uid || store.get(uidAtom) || "unknown";
            const now = Date.now();
            const revisionId = `${now}`;
            const dStart = dayjs.unix(ev.start);
            const fromSec = dStart.hour() * 3600 + dStart.minute() * 60 + dStart.second();
            const shift = getShiftForSec(fromSec);

            if (claimSec >= ev.duration) {
                const payload = {
                    category: "planned stoppage",
                    note: "Planned schedule allowance",
                    scheduled: true,
                    ...(ev.plannedSplitSec ? { plannedSplitSec: ev.plannedSplitSec } : {})
                };
                await update(`reports/machines/${machineId}/hourly/${date}/${chunkId}/reason`, payload);
                await update(`downtime-reasons/${machineId}/${date}/${chunkId}`, {
                    machineId,
                    date,
                    key: chunkId,
                    type: ev.status,
                    from: fromSec,
                    to: fromSec + ev.duration,
                    start: ev.start,
                    end: ev.end,
                    duration: ev.duration,
                    shift,
                    category: "planned stoppage",
                    scheduled: true,
                    note: "Planned schedule allowance",
                    updatedAt: serverTimestamp(),
                    updatedBy: by,
                    history: {
                        [revisionId]: {
                            category: "planned stoppage",
                            scheduled: true,
                            note: "Planned schedule allowance",
                            by,
                            at: serverTimestamp()
                        }
                    }
                });
                toast({
                    title: "Claimed as Planned Stoppage",
                    description: `${secFormatter(ev.duration)} marked as Planned Stoppage.`,
                    status: "success",
                    isClosable: true
                });
            } else {
                const priorSplit = ev.plannedSplitSec || 0;
                const origStart = ev.start - priorSplit;
                const origFrom = ((fromSec - priorSplit) % 86400 + 86400) % 86400;
                const totalSplitSec = priorSplit + claimSec;
                const remSec = Math.max(0, ev.duration - claimSec);
                await update(`reports/machines/${machineId}/hourly/${date}/${chunkId}/reason`, {
                    category: "uncategorized",
                    note: "",
                    scheduled: false,
                    plannedSplitSec: totalSplitSec
                });
                await update(`downtime-reasons/${machineId}/${date}/${chunkId}_planned`, {
                    machineId,
                    date,
                    key: `${chunkId}_planned`,
                    type: ev.status,
                    from: origFrom,
                    to: origFrom + totalSplitSec,
                    start: origStart,
                    end: origStart + totalSplitSec,
                    duration: totalSplitSec,
                    shift: getShiftForSec(origFrom),
                    category: "planned stoppage",
                    scheduled: true,
                    note: "Planned schedule allowance (auto-split)",
                    updatedAt: serverTimestamp(),
                    updatedBy: by
                });
                await update(`downtime-reasons/${machineId}/${date}/${chunkId}`, {
                    machineId,
                    date,
                    key: chunkId,
                    type: ev.status,
                    from: (fromSec + claimSec) % 86400,
                    to: (fromSec + ev.duration) % 86400,
                    start: ev.start + claimSec,
                    end: ev.end,
                    duration: remSec,
                    shift: getShiftForSec((fromSec + claimSec) % 86400),
                    category: "uncategorized",
                    scheduled: false,
                    note: "",
                    updatedAt: serverTimestamp(),
                    updatedBy: by
                });
                toast({
                    title: "Planned Allowance Claimed & Event Split",
                    description: `${secFormatter(claimSec)} marked as Planned Stoppage; remaining ${secFormatter(remSec)} requires categorization.`,
                    status: "success",
                    isClosable: true
                });
            }
            onUpdateLog?.();
        } catch (err: any) {
            console.error(err);
            toast({
                title: "Failed to claim planned stoppage",
                description: err?.message || "Could not update downtime record",
                status: "error",
                isClosable: true
            });
        } finally {
            setClaimingId(null);
        }
    };

    const handleAutoClaimLongest = async () => {
        const candidates = events
            .filter(e => !e.category || e.category.toLowerCase() === "uncategorized")
            .sort((a, b) => {
                if (a.status !== b.status) return a.status === "OFF" ? -1 : 1;
                return b.duration - a.duration;
            });
        if (candidates.length === 0 || metrics.remainingAllowanceSec <= 0) return;
        await handleClaimPlanned(candidates[0]);
    };

    const handleUpdateLog = (updated: any) => {
        setEvents(prev => prev.map(ev => {
            if (ev.id === updated.id) {
                return {
                    ...ev,
                    category: updated.reason?.category || ev.category,
                    note: updated.reason?.note || "",
                    scheduled: !!updated.reason?.scheduled
                };
            }
            return ev;
        }));
        onUpdateLog?.();
    };

    const tableRows = useMemo(() => {
        return events.map((ev, index) => {
            const isUncat = !ev.category || ev.category.toLowerCase() === "uncategorized";
            const isSyntheticPlanned = ev.id.endsWith("_planned");

            return [
                ...(canWrite ? [{
                    element: SelectCell,
                    props: {
                        checked: !isSyntheticPlanned && selectedIds.includes(ev.id),
                        disabled: isSyntheticPlanned,
                        onToggle: (checked: boolean, shiftKey: boolean) => toggleRow(index, checked, shiftKey)
                    }
                }] : []),
                {
                    element: TimeCell,
                    props: {
                        start: ev.start,
                        end: ev.end
                    }
                },
                {
                    element: Badge,
                    props: {
                        colorScheme: ev.status === "OFF" ? "red" : "orange",
                        variant: "subtle",
                        fontSize: "2xs",
                        borderRadius: "sm"
                    },
                    children: ev.status
                },
                {
                    element: DurationCell,
                    props: {
                        duration: ev.duration,
                        isActive: ev.isActive
                    }
                },
                {
                    element: Text,
                    props: {
                        fontSize: "xs",
                        fontWeight: 600,
                        color: isUncat ? "red.400" : (ev.scheduled ? "primary" : undefined),
                        textTransform: "uppercase"
                    },
                    children: ev.category
                },
                {
                    element: Badge,
                    props: {
                        colorScheme: ev.scheduled ? "blue" : "gray",
                        variant: "subtle",
                        fontSize: "2xs",
                        borderRadius: "sm"
                    },
                    children: ev.scheduled ? "Planned (No Loss)" : "Unplanned"
                },
                {
                    element: Text,
                    props: { fontSize: "2xs", color: subText },
                    children: ev.note && ev.note !== "None" ? ev.note : "-"
                },
                ...(canWrite ? [{
                    element: HStack,
                    props: { spacing: 1.5 },
                    children: isSyntheticPlanned ? (
                        <Badge colorScheme="blue" variant="subtle" fontSize="2xs">
                            Auto-split
                        </Badge>
                    ) : (
                        <>
                            {isUncat && metrics.remainingAllowanceSec > 0 && (
                                <Button
                                    size="xs"
                                    colorScheme="orange"
                                    variant="subtle"
                                    py={3}
                                    isLoading={claimingId === ev.id}
                                    onClick={() => handleClaimPlanned(ev)}
                                    title={
                                        ev.duration > metrics.remainingAllowanceSec
                                            ? `Claims ${secFormatter(metrics.remainingAllowanceSec)} as Planned and splits remaining ${secFormatter(ev.duration - metrics.remainingAllowanceSec)}`
                                            : "1-Click claim as Planned Stoppage"
                                    }
                                >
                                    {ev.duration > metrics.remainingAllowanceSec
                                        ? `Claim ${secFormatter(metrics.remainingAllowanceSec)} Planned`
                                        : "Claim Planned"}
                                </Button>
                            )}
                            <Categorize
                                machineId={machineId}
                                date={date}
                                downtime={{
                                    id: ev.rawChunkId || ev.id,
                                    start: ev.start,
                                    end: ev.end,
                                    status: ev.status,
                                    reason: {
                                        category: ev.category,
                                        note: ev.note,
                                        scheduled: ev.scheduled
                                    }
                                }}
                                updateLog={handleUpdateLog}
                            />
                        </>
                    )
                }] : [])
            ];
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [events, selectedIds, machineId, subText, metrics.remainingAllowanceSec, claimingId, canWrite]);

    return (
        <MyCard w="100%" noPadding>
            <CardHeader
                display="flex"
                justifyContent="space-between"
                alignItems="center"
                py={3}
                px={4}
                borderBottom="1px solid"
                borderColor={border}
            >
                <HStack spacing={2}>
                    <Icon as={FiClock} color="primary" fontSize="md" />
                    <Text fontWeight={700} fontSize="md">Downtime Monitoring</Text>
                    <Badge colorScheme={events.length > 0 ? "orange" : "green"} variant="subtle" fontSize="xs" borderRadius="md" px={2}>
                        {events.length} Stoppage{events.length === 1 ? "" : "s"}
                    </Badge>
                    {metrics.uncategorized > 0 && (
                        <Badge colorScheme="red" variant="solid" fontSize="2xs" borderRadius="md" px={1.5}>
                            {events.filter(e => !e.category || e.category.toLowerCase() === "uncategorized").length} Uncategorized
                        </Badge>
                    )}
                </HStack>
                <HStack spacing={2}>
                    <Tooltip label="Refresh downtime logs">
                        <Button
                            size="xs"
                            variant="ghost"
                            onClick={() => setRefreshTrigger(prev => prev + 1)}
                            isLoading={loading}
                            leftIcon={<FiRefreshCw />}
                        >
                            Refresh
                        </Button>
                    </Tooltip>
                </HStack>
            </CardHeader>

            <Box p={4}>
                {loading && events.length === 0 ? (
                    <Center py={10}>
                        <Spinner color="primary" size="md" mr={3} />
                        <Text fontSize="sm" color={subText}>Loading downtime records...</Text>
                    </Center>
                ) : events.length === 0 ? (
                    <Center p={8} flexDir="column">
                        <Box
                            p={3}
                            borderRadius="full"
                            bg={isDark ? "whiteAlpha.100" : "green.50"}
                            color="green.400"
                            mb={2}
                        >
                            <Icon as={FiCheckCircle} fontSize="2xl" />
                        </Box>
                        <Text fontWeight={700} fontSize="sm">
                            Zero Stoppages Recorded Today
                        </Text>
                        <Text fontSize="xs" color={subText}>
                            This machine has operated with zero recorded stoppage interruptions for this production day.
                        </Text>
                    </Center>
                ) : (
                    <VStack spacing={4} align="stretch">
                        {/* KPI Summary Cards */}
                        <SimpleGrid columns={{ base: 2, md: 4 }} gap={3}>
                            <MyCard p={3}>
                                <HStack justify="space-between" align="center">
                                    <Text fontSize="3xs" textTransform="uppercase" fontWeight={700} color={subText}>Total Downtime</Text>
                                    <Icon as={FiAlertTriangle} color="red.400" />
                                </HStack>
                                <Text fontSize="lg" fontWeight={700} mt={1}>{secFormatter(metrics.total)}</Text>
                                <Text fontSize="3xs" color={subText}>{events.length} Stoppage Chunk(s)</Text>
                            </MyCard>

                            <MyCard p={3}>
                                <HStack justify="space-between" align="center">
                                    <Text fontSize="3xs" textTransform="uppercase" fontWeight={700} color={subText}>Planned Downtime</Text>
                                    <Badge colorScheme="blue" variant="subtle" fontSize="3xs">No Loss</Badge>
                                </HStack>
                                <Text fontSize="lg" fontWeight={700} mt={1} color="blue.400">{secFormatter(metrics.planned)}</Text>
                                <Text fontSize="3xs" color={subText}>
                                    {plannedAllowanceSec > 0
                                        ? `${secFormatter(metrics.remainingAllowanceSec)} of ${secFormatter(plannedAllowanceSec)} schedule allowance unclaimed`
                                        : "Off-shift & scheduled maintenance"}
                                </Text>
                            </MyCard>

                            <MyCard p={3}>
                                <HStack justify="space-between" align="center">
                                    <Text fontSize="3xs" textTransform="uppercase" fontWeight={700} color={subText}>Unplanned Downtime</Text>
                                    <Badge colorScheme="red" variant="subtle" fontSize="3xs">Loss</Badge>
                                </HStack>
                                <Text fontSize="lg" fontWeight={700} mt={1} color="red.400">
                                    {secFormatter(metrics.unplanned + metrics.uncategorized)}
                                </Text>
                                <Text fontSize="3xs" color={subText}>
                                    {metrics.uncategorized > 0
                                        ? `Includes ${secFormatter(metrics.uncategorized)} uncategorized (claim planned below)`
                                        : "Penalizes operational efficiency"}
                                </Text>
                            </MyCard>

                            <MyCard p={3}>
                                <HStack justify="space-between" align="center">
                                    <Text fontSize="3xs" textTransform="uppercase" fontWeight={700} color={subText}>Categorized</Text>
                                    <Text fontSize="3xs" fontWeight={700} color={metrics.categorizedPercent >= 80 ? "green.400" : "orange.400"}>
                                        {metrics.categorizedPercent}%
                                    </Text>
                                </HStack>
                                <Progress
                                    mt={2}
                                    size="xs"
                                    borderRadius="full"
                                    value={metrics.categorizedPercent}
                                    colorScheme={metrics.categorizedPercent >= 80 ? "green" : "orange"}
                                />
                                <Text fontSize="3xs" color={subText} mt={1.5}>
                                    {secFormatter(metrics.categorizedDuration)} of {secFormatter(metrics.total)}
                                </Text>
                            </MyCard>
                        </SimpleGrid>

                        {/* Planned Allowance Progress Bar & Audit Alert */}
                        {plannedAllowanceSec > 0 && (
                            <MyCard p={3}>
                                <Flex justify="space-between" align="center" flexWrap="wrap" gap={2} mb={1.5}>
                                    <HStack spacing={2}>
                                        <Icon as={FiClock} color="primary" />
                                        <Text fontSize="xs" fontWeight={700}>
                                            Planned Allowance ({daySchedule.plannedShifts} shifts / {daySchedule.plannedWorkingHours}h schedule):{" "}
                                            {secFormatter(metrics.planned)} claimed / {secFormatter(plannedAllowanceSec)} planned
                                        </Text>
                                        <Badge colorScheme={metrics.remainingAllowanceSec === 0 ? "green" : "orange"} variant="subtle" fontSize="2xs">
                                            {metrics.remainingAllowanceSec > 0
                                                ? `${secFormatter(metrics.remainingAllowanceSec)} remaining`
                                                : "Fully Claimed"}
                                        </Badge>
                                    </HStack>
                                    {metrics.uncategorizedOutsideAllowanceSec > 0 && (
                                        <Badge colorScheme="red" variant="solid" fontSize="2xs" px={2} py={0.5} borderRadius="sm">
                                            {secFormatter(metrics.uncategorizedOutsideAllowanceSec)} Uncategorized Downtime Remaining
                                        </Badge>
                                    )}
                                </Flex>
                                <Progress size="xs" borderRadius="full" colorScheme="orange" value={metrics.allowanceClaimedPct} />
                                {metrics.unclaimedApplicableSec > 0 && (
                                    <Flex mt={2} pt={2} borderTop="1px dashed" borderColor={border} justify="space-between" align="center" flexWrap="wrap" gap={2}>
                                        <HStack spacing={1.5}>
                                            <Icon as={FiAlertTriangle} color="orange.400" />
                                            <Text fontSize="xs" color={subText} fontWeight={600}>
                                                {secFormatter(metrics.unclaimedApplicableSec)} schedule allowance available — claim below to exclude from today&apos;s live efficiency (auto-applied in Reports).
                                            </Text>
                                        </HStack>
                                        {canWrite && (
                                            <Primary
                                                size="xs"
                                                isLoading={!!claimingId}
                                                onClick={handleAutoClaimLongest}
                                            >
                                                Auto-Claim Longest Stoppage
                                            </Primary>
                                        )}
                                    </Flex>
                                )}
                            </MyCard>
                        )}

                        {/* Breakdown & Table */}
                        <SimpleGrid columns={{ base: 1, lg: 3 }} gap={3}>
                            {/* Category Breakdown (1 col) */}
                            <MyCard p={4}>
                                <Text fontWeight={700} fontSize="sm" mb={3}>Category Distribution</Text>
                                <VStack spacing={2.5} align="stretch" maxH="320px" overflowY="auto">
                                    {metrics.breakdown.map(cat => {
                                        const pct = metrics.total > 0 ? Math.round((cat.value / metrics.total) * 100) : 0;
                                        const isUncat = cat.name.toLowerCase() === "uncategorized";
                                        return (
                                            <Box key={cat.name} p={2} borderRadius="md" bg={isDark ? "whiteAlpha.50" : "gray.50"}>
                                                <HStack justify="space-between" align="baseline">
                                                    <Text fontSize="xs" fontWeight={600} color={isUncat ? "red.400" : undefined}>
                                                        {cat.name.toUpperCase()}
                                                    </Text>
                                                    <HStack spacing={1.5}>
                                                        <Text fontSize="xs" fontWeight={700}>{secFormatter(cat.value)}</Text>
                                                        <Text fontSize="3xs" color={subText}>({pct}%)</Text>
                                                    </HStack>
                                                </HStack>
                                                <Progress
                                                    mt={1.5}
                                                    size="xs"
                                                    borderRadius="full"
                                                    value={pct}
                                                    colorScheme={isUncat ? "red" : (cat.name === "off-shift" ? "blue" : "orange")}
                                                />
                                            </Box>
                                        );
                                    })}
                                </VStack>
                            </MyCard>

                            {/* Stoppages Log Table (2 cols) */}
                            <Box gridColumn={{ base: "span 1", lg: "span 2" }}>
                                <MyCard p={0} overflow="hidden">
                                    <CardHeader py={3} px={4} borderBottom="1px solid" borderColor={border}>
                                        <HStack justify="space-between">
                                            <Text fontWeight={700} fontSize="sm">Hourly Stoppage Chunks & Reasons</Text>
                                            <Badge colorScheme="orange" variant="outline" fontSize="2xs">
                                                {events.length} Records
                                            </Badge>
                                        </HStack>
                                    </CardHeader>
                                    {/* Multi-Select Action Banner */}
                                    {canWrite && <Flex
                                        justify="space-between"
                                        align="center"
                                        px={4}
                                        py={2}
                                        borderBottom="1px solid"
                                        borderColor={border}
                                        bg={selectedEvents.length > 0 ? (isDark ? "whiteAlpha.100" : "orange.50") : undefined}
                                    >
                                        {selectedEvents.length > 0 ? (
                                            <>
                                                <HStack spacing={2}>
                                                    <Text fontWeight={600} fontSize="xs" color="orange.400">
                                                        {selectedEvents.length} selected
                                                        <Text as="span" fontWeight={400} opacity={0.7}> | {secFormatter(selectedTotal)}</Text>
                                                    </Text>
                                                    {uncategorizedEvents.length > 0 && !allUncategorizedSelected && (
                                                        <Button size="xs" variant="link" colorScheme="orange" onClick={toggleAllUncategorized}>
                                                            Select all uncategorized ({uncategorizedEvents.length})
                                                        </Button>
                                                    )}
                                                </HStack>
                                                <HStack spacing={2}>
                                                    <Button size="xs" variant="ghost" leftIcon={<FiX />} onClick={() => setSelectedIds([])}>
                                                        Clear
                                                    </Button>
                                                    <Categorize
                                                        machineId={machineId}
                                                        date={date}
                                                        bulkDowntimes={selectedEvents.map(ev => ({
                                                            id: ev.rawChunkId || ev.id,
                                                            start: ev.start,
                                                            end: ev.end,
                                                            status: ev.status,
                                                            reason: {
                                                                category: ev.category,
                                                                note: ev.note,
                                                                scheduled: ev.scheduled
                                                            }
                                                        }))}
                                                        onBulkSuccess={handleBulkSuccess}
                                                    >
                                                        <Primary size="xs" leftIcon={<TbTimelineEventPlus />}>
                                                            Categorize selected
                                                        </Primary>
                                                    </Categorize>
                                                </HStack>
                                            </>
                                        ) : (
                                            <>
                                                <Text fontSize="xs" opacity={0.7}>
                                                    Tick rows to categorize several at once (shift + click selects a range).
                                                </Text>
                                                {uncategorizedEvents.length > 0 && (
                                                    <Button size="xs" variant="outline" colorScheme="orange" onClick={toggleAllUncategorized}>
                                                        Select all uncategorized ({uncategorizedEvents.length})
                                                    </Button>
                                                )}
                                            </>
                                        )}
                                    </Flex>}
                                    <Box maxH="320px" overflow="auto">
                                        <Table
                                            headings={tableHeadings}
                                            notFound={events.length === 0}
                                            rows={tableRows}
                                        />
                                    </Box>
                                </MyCard>
                            </Box>
                        </SimpleGrid>
                    </VStack>
                )}
            </Box>
        </MyCard>
    );
};

export default DowntimeCard;
