import { shiftsAtom } from "../../../../../Components/Store/atoms";
import store from "../../../../../Components/Store";
import { Pie, PieConfig } from "@ant-design/plots";
import { Badge, Box, Button, CardBody, CardHeader, Center, Checkbox, Flex, HStack, Icon, Progress, SimpleGrid, Text, useColorMode, useDisclosure, useToast } from "@chakra-ui/react";
import { useMemo, useRef, useState } from "react";
import { FiAlertTriangle, FiCheckCircle, FiClock, FiEdit2, FiX } from "react-icons/fi";
import { TbTimelineEventPlus } from "react-icons/tb";
import Primary from "../../../../../Components/Buttons/Primary";
import dayjs from "../../../../../Components/Functions/dayjs";
import secToTime from "../../../../../Components/Functions/converters/secondsToHourMin";
import secFormatter from "../../../../../Components/Functions/formatters/secFormatter";
import BackdropLoader from "../../../../../Components/Loaders/BackdropLoader";
import { SmallFill } from "../../../../../Components/Loaders";
import MyCard from "../../../../../Components/micro/Card";
import Table from "../../../../../Components/micro/Table";
import { canCategorizeDowntime, claimPlannedDowntimeWithSplit, saveDowntimeReasons } from "./api";
import { MAX_DAYS } from "./loadDaySegments";
import useRangeSegments from "./useRangeSegments";
import CategorizeModal from "./CategorizeModal";
import {
    DowntimeReasonEntry,
    DowntimeSegment,
    entryId,
    entryToSegment,
    ReasonInput,
    segmentToEntryId,
    ShiftKey
} from "./types";

const baseHeadings = [
    "Time",
    "Type",
    "Duration",
    "Reason",
    "Action"
];

const isUncategorizedEntry = (entry?: DowntimeReasonEntry): boolean => {
    if (!entry) return true;
    if (!entry.category) return true;
    const cat = entry.category.trim().toLowerCase();
    return cat === "uncategorized" || cat === "none" || cat === "";
};

interface Row {
    segment: DowntimeSegment;
    entry?: DowntimeReasonEntry;
}

const DowntimeReport = ({
    machineId,
    machineName,
    isSingleDay,
    segments: singleDaySegments,
    entries,
    loading: entriesLoading,
    upsert,
    allowedShifts,
    fromDate,
    toDate,
    scheduleAllowanceSec = 0
}: {
    machineId: string,
    machineName: string,
    isSingleDay: boolean,
    segments: DowntimeSegment[],
    entries: DowntimeReasonEntry[],
    loading: boolean,
    upsert: (entry: DowntimeReasonEntry) => void,
    allowedShifts: ShiftKey[],
    fromDate: string | null,
    toDate: string | null,
    scheduleAllowanceSec?: number
}) => {
    const toast = useToast();
    const { colorMode } = useColorMode();
    const { border } = useMemo(() => ({
        border: `${colorMode}.border`
    }), [colorMode]);
    const { isOpen, onOpen, onClose } = useDisclosure();
    const [selected, setSelected] = useState<Row | null>(null);
    const [saving, setSaving] = useState<string | null>(null);
    // rows ticked for "categorize selected"
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [bulkMode, setBulkMode] = useState(false);
    const lastTicked = useRef<number | null>(null);
    const canEdit = useMemo(() => canCategorizeDowntime(), []);
    // date range reports: find the idle / off time of every day in the range
    const range = useRangeSegments(!isSingleDay, machineId, fromDate, toDate, allowedShifts);
    const segments = isSingleDay ? singleDaySegments : range.segments;
    const loading = entriesLoading || (!isSingleDay && range.loading);

    const rows: Row[] = useMemo(() => {
        const mine = entries.filter(e => e.machineId === machineId && allowedShifts.includes(e.shift));
        const entryMap = new Map(mine.map(e => [entryId(e.machineId, e.date, e.key), e]));
        const result: Row[] = [];
        const seen = new Set<string>();

        // 1. Live segments of the opened report (single day / date range)
        for (const segment of segments) {
            const id = segmentToEntryId(segment);
            const plannedSplitId = entryId(segment.machineId, segment.date, `${segment.key}_planned`);
            const plannedSplitEntry = entryMap.get(plannedSplitId);

            if (plannedSplitEntry && plannedSplitEntry.duration > 0 && plannedSplitEntry.duration < segment.duration) {
                seen.add(plannedSplitId);
                seen.add(id);
                const splitSec = plannedSplitEntry.duration;
                const plannedSeg: DowntimeSegment = {
                    ...segment,
                    key: `${segment.key}_planned`,
                    to: segment.from + splitSec,
                    end: segment.start + splitSec,
                    duration: splitSec,
                };
                const remSeg: DowntimeSegment = {
                    ...segment,
                    from: segment.from + splitSec,
                    start: segment.start + splitSec,
                    duration: Math.max(0, segment.duration - splitSec),
                };
                result.push({ segment: plannedSeg, entry: plannedSplitEntry });
                result.push({ segment: remSeg, entry: entryMap.get(id) });
                continue;
            }

            seen.add(id);
            let entry = entryMap.get(id);
            if (!entry) {
                // If segment has no direct entry, match overlapping target entry by absolute Unix time
                // (ignoring date string equality so midnight-crossing events match correctly)
                entry = mine.find(e =>
                    e.key.startsWith("target_") &&
                    Math.max(segment.start, e.start) < Math.min(segment.end, e.end)
                );
                if (entry) {
                    seen.add(entryId(entry.machineId, entry.date, entry.key));
                    seen.add(entry.key);
                }
            }
            result.push({ segment, entry });
        }

        // 2. Saved entries that have no live segment (multi day reports / discrete target events)
        const shiftsInfo = store.get(shiftsAtom);
        const shiftAStartSec = shiftsInfo?.A ? +shiftsInfo.A : 25200;
        const boundStart = fromDate ? dayjs(`${fromDate} 00:00:00`).unix() + shiftAStartSec : 0;
        const boundEnd = toDate ? dayjs(`${toDate} 00:00:00`).unix() + 86400 + shiftAStartSec : Infinity;

        entryMap.forEach((entry, id) => {
            if (seen.has(id) || seen.has(entry.key)) return;

            // Only add if it didn't overlap with any live segment in time
            const overlapsLive = segments.some(seg =>
                Math.max(seg.start, entry.start) < Math.min(seg.end, entry.end)
            );
            if (overlapsLive) return;

            // Clamp standalone entries to the report's date boundaries
            if (entry.end <= boundStart || entry.start >= boundEnd) return;

            const clampedStart = Math.max(entry.start, boundStart);
            const clampedEnd = Math.min(entry.end, boundEnd);
            const clampedDuration = Math.max(clampedEnd - clampedStart, 0);
            if (clampedDuration < 60) return;

            const seg = entryToSegment(entry);
            seg.start = clampedStart;
            seg.end = clampedEnd;
            seg.duration = clampedDuration;

            result.push({ segment: seg, entry });
        });

        result.sort((a, b) => a.segment.start - b.segment.start);
        return result;
    }, [segments, entries, machineId, allowedShifts, fromDate, toDate]);

    const summary = useMemo(() => {
        let planned = 0;
        let unplanned = 0;
        let uncategorized = 0;
        let total = 0;
        const distribution: { [category: string]: number } = {};
        for (const { segment, entry } of rows) {
            total += segment.duration;
            if (isUncategorizedEntry(entry)) {
                uncategorized += segment.duration;
                distribution["uncategorized"] = (distribution["uncategorized"] || 0) + segment.duration;
                continue;
            }
            if (entry!.scheduled) planned += segment.duration;
            else unplanned += segment.duration;
            const cat = entry!.category.toLowerCase();
            distribution[cat] = (distribution[cat] || 0) + segment.duration;
        }
        const remainingAllowanceSec = Math.max(0, scheduleAllowanceSec - planned);
        const unclaimedApplicableSec = Math.min(remainingAllowanceSec, uncategorized);
        const uncategorizedOutsideAllowanceSec = Math.max(0, uncategorized - remainingAllowanceSec);
        const allowanceClaimedPct = scheduleAllowanceSec > 0
            ? Math.min(100, Math.round((planned / scheduleAllowanceSec) * 100))
            : 100;
        const pie = Object.entries(distribution).map(([name, value]) => ({ name, value }));
        return {
            total,
            planned,
            unplanned,
            uncategorized,
            remainingAllowanceSec,
            unclaimedApplicableSec,
            uncategorizedOutsideAllowanceSec,
            allowanceClaimedPct,
            pie
        };
    }, [rows, scheduleAllowanceSec]);

    const handleClaimPlanned = async (row: Row) => {
        if (summary.remainingAllowanceSec <= 0) return;
        setSaving("Claiming Planned Stoppage...");
        try {
            const existingPlanned = entries.find(
                e =>
                    e.machineId === row.segment.machineId &&
                    e.date === row.segment.date &&
                    e.key === `${row.segment.key}_planned`
            );
            const savedList = await claimPlannedDowntimeWithSplit(
                row.segment,
                summary.remainingAllowanceSec,
                row.entry,
                existingPlanned?.duration || 0
            );
            savedList.forEach(upsert);
            const wasSplit = savedList.length > 1;
            toast({
                title: wasSplit ? "Planned Allowance Claimed & Event Split" : "Claimed as Planned Stoppage",
                description: wasSplit
                    ? `${secFormatter(savedList[0].duration)} marked as Planned Stoppage; remaining ${secFormatter(savedList[1].duration)} requires categorization.`
                    : `${secFormatter(row.segment.duration)} marked as Planned Stoppage.`,
                status: "success",
                isClosable: true
            });
        } catch (err) {
            console.error(err);
            toast({
                title: "Failed to claim planned stoppage",
                description: (err as Error)?.message || "Could not update downtime record",
                status: "error",
                isClosable: true
            });
        } finally {
            setSaving(null);
        }
    };

    const handleAutoClaimLongest = async () => {
        const candidates = rows
            .filter(r => isUncategorizedEntry(r.entry))
            .sort((a, b) => {
                if (a.segment.type !== b.segment.type) return a.segment.type === "OFF" ? -1 : 1;
                return b.segment.duration - a.segment.duration;
            });
        if (candidates.length === 0 || summary.remainingAllowanceSec <= 0) return;
        await handleClaimPlanned(candidates[0]);
    };

    const rowId = (row: Row) => segmentToEntryId(row.segment);
    // only rows that still exist in the list stay selected
    const selectedRows = useMemo(
        () => rows.filter(row => selectedIds.includes(rowId(row))),
        [rows, selectedIds]
    );
    const selectedTotal = selectedRows.reduce((sum, row) => sum + row.segment.duration, 0);
    const uncategorizedRows = useMemo(() => rows.filter(row => isUncategorizedEntry(row.entry)), [rows]);
    const allUncategorizedSelected = uncategorizedRows.length > 0 && uncategorizedRows.every(row => selectedIds.includes(rowId(row)));

    const toggleRow = (index: number, checked: boolean, shiftKey: boolean) => {
        // shift + click ticks / unticks every row between the last clicked one and this one
        const from = shiftKey && lastTicked.current !== null ? Math.min(lastTicked.current, index) : index;
        const to = shiftKey && lastTicked.current !== null ? Math.max(lastTicked.current, index) : index;
        const ids = rows.slice(from, to + 1).map(rowId);
        setSelectedIds(prev => checked
            ? Array.from(new Set([...prev, ...ids]))
            : prev.filter(id => !ids.includes(id)));
        lastTicked.current = index;
    };

    const toggleAllUncategorized = () => {
        const ids = uncategorizedRows.map(rowId);
        setSelectedIds(prev => allUncategorizedSelected
            ? prev.filter(id => !ids.includes(id))
            : Array.from(new Set([...prev, ...ids])));
        lastTicked.current = null;
    };

    // header checkbox: selects / clears every uncategorized row
    const tableHeadings = useMemo(() => [
        canEdit ? <Checkbox
            key="select-all"
            colorScheme="orange"
            aria-label="Select all uncategorized downtime"
            isDisabled={uncategorizedRows.length === 0}
            isChecked={allUncategorizedSelected}
            isIndeterminate={selectedRows.length > 0 && !allUncategorizedSelected}
            onChange={toggleAllUncategorized} /> : "",
        ...baseHeadings
        // eslint-disable-next-line
    ], [canEdit, uncategorizedRows, allUncategorizedSelected, selectedRows.length]);

    const open = (row: Row) => {
        setBulkMode(false);
        setSelected(row);
        onOpen();
    };

    const openBulk = () => {
        setBulkMode(true);
        onOpen();
    };

    const save = async (reason: ReasonInput) => {
        const targets = bulkMode ? selectedRows : selected ? [selected] : [];
        if (targets.length === 0) return;
        setSaving("Saving");
        try {
            const results = await saveDowntimeReasons(
                targets.map(row => ({ segment: row.segment, existing: row.entry })),
                reason
            );
            results.forEach(upsert);
            if (bulkMode) setSelectedIds([]);
            onClose();
            toast({
                title: bulkMode
                    ? `${results.length} downtimes categorized`
                    : targets[0].entry ? "Downtime updated" : "Downtime categorized",
                description: "The downtime has been saved successfully",
                status: "success",
                isClosable: true
            });
        } catch (err) {
            console.error(err);
            toast({
                title: "Failed to save downtime",
                description: (err as Error)?.message === "Permission Denied"
                    ? "You do not have permission to categorize downtime"
                    : "An error occurred while trying to save downtime",
                status: "error",
                isClosable: true
            });
        } finally {
            setSaving(null);
        }
    };

    const tableRows = useMemo(() => rows.map((row, index) => [
        {
            element: SelectCell,
            props: {
                canEdit,
                checked: selectedIds.includes(rowId(row)),
                onToggle: (checked: boolean, shiftKey: boolean) => toggleRow(index, checked, shiftKey)
            }
        },
        {
            element: TimeCell,
            props: {
                segment: row.segment,
                showDate: !isSingleDay
            }
        },
        {
            element: TypeCell,
            props: {
                type: row.segment.type
            }
        },
        {
            element: DurationCell,
            props: {
                duration: row.segment.duration
            }
        },
        {
            element: ReasonCell,
            props: {
                entry: row.entry
            }
        },
        {
            element: ActionCell,
            props: {
                canEdit,
                isEdit: !isUncategorizedEntry(row.entry),
                canClaimPlanned: canEdit && isUncategorizedEntry(row.entry) && summary.remainingAllowanceSec > 0,
                remainingAllowanceSec: summary.remainingAllowanceSec,
                segmentDuration: row.segment.duration,
                onClaimPlanned: () => handleClaimPlanned(row),
                onClick: () => open(row)
            }
        }
        // eslint-disable-next-line
    ]), [rows, isSingleDay, canEdit, selectedIds, summary.remainingAllowanceSec]);

    const pieConfig: PieConfig = {
        appendPadding: 10,
        data: summary.pie,
        angleField: "value",
        colorField: "name",
        animation: false,
        radius: 0.75,
        legend: false,
        label: {
            type: "spider",
            labelHeight: 40,
            content: (datum: any) => `${String(datum.name).toUpperCase()}\n${secFormatter(datum.value)} (${(datum.percent * 100).toFixed(0)}%)`
        },
        tooltip: {
            formatter: (datum: any) => ({
                name: String(datum.name).toUpperCase(),
                value: secFormatter(datum.value)
            })
        }
    };

    return <MyCard p={0}>
        {saving && <BackdropLoader text={saving} />}
        <CardHeader borderBottom={"1px solid"} borderColor={border} display="flex" alignItems="center" justifyContent={"space-between"} flexWrap="wrap" gap={2} px={2} pb={1} pt={3}>
            <Text fontWeight={500} fontSize="lg">Downtime</Text>
            <Flex gap={2} flexWrap="wrap">
                <Badge colorScheme="orange" variant="subtle">
                    Planned: {secFormatter(Math.max(summary.planned, Math.min(scheduleAllowanceSec, summary.total)))}
                    {scheduleAllowanceSec > 0 ? ` (${secFormatter(summary.planned)} claimed / ${secFormatter(scheduleAllowanceSec)} allowed)` : ""}
                </Badge>
                <Badge colorScheme="red" variant="subtle">Unplanned: {secFormatter(summary.unplanned)}</Badge>
                <Badge colorScheme="gray" variant="subtle">
                    Uncategorized: {secFormatter(summary.uncategorizedOutsideAllowanceSec)}
                </Badge>
            </Flex>
        </CardHeader>
        {scheduleAllowanceSec > 0 && (
            <Box px={4} py={2.5} borderBottom="1px solid" borderColor={border}>
                <Flex justify="space-between" align="center" flexWrap="wrap" gap={2} mb={1.5}>
                    <HStack spacing={2}>
                        <Icon as={FiClock} color="primary" />
                        <Text fontSize="xs" fontWeight={600}>
                            Planned Allowance: {secFormatter(summary.planned)} claimed / {secFormatter(scheduleAllowanceSec)} planned
                        </Text>
                        <Badge colorScheme={summary.remainingAllowanceSec === 0 ? "green" : "orange"} variant="subtle" fontSize="2xs">
                            {summary.remainingAllowanceSec > 0 ? `${secFormatter(summary.remainingAllowanceSec)} remaining` : "Fully Claimed"}
                        </Badge>
                    </HStack>
                    {summary.uncategorizedOutsideAllowanceSec > 0 && (
                        <Badge colorScheme="red" variant="subtle" fontSize="2xs">
                            {secFormatter(summary.uncategorizedOutsideAllowanceSec)} Uncategorized Outside Allowance
                        </Badge>
                    )}
                </Flex>
                <Progress size="xs" borderRadius="full" colorScheme="orange" value={summary.allowanceClaimedPct} />
                {summary.unclaimedApplicableSec > 0 && (
                    <Flex mt={2} pt={2} borderTop="1px dashed" borderColor={border} justify="space-between" align="center" flexWrap="wrap" gap={2}>
                        <HStack spacing={1.5}>
                            <Icon as={FiAlertTriangle} color="orange.400" />
                            <Text fontSize="xs" opacity={0.85} fontWeight={500}>
                                {secFormatter(summary.unclaimedApplicableSec)} planned allowance is auto-credited in report efficiency, but not yet mapped to specific downtime logs.
                            </Text>
                        </HStack>
                        {canEdit && (
                            <Primary size="xs" onClick={handleAutoClaimLongest}>
                                Auto-Claim Longest Stoppage
                            </Primary>
                        )}
                    </Flex>
                )}
            </Box>
        )}
        <CardBody p={0}>
            {loading ? <Center minH="150px"><SmallFill /></Center>
                : rows.length === 0 ? <Center p={8} flexDir="column">
                    <Box
                        p={3}
                        borderRadius="full"
                        bg={colorMode === "dark" ? "whiteAlpha.100" : "green.50"}
                        color="green.400"
                        mb={2}>
                        <Icon as={FiCheckCircle} fontSize="2xl" />
                    </Box>
                    <Text fontWeight={700} fontSize="sm">
                        {!isSingleDay && range.tooLong ? "Date range too long" : "No Downtime Found"}
                    </Text>
                    <Text fontSize="xs" textAlign="center" opacity={0.7}>
                        {!isSingleDay && range.tooLong
                            ? `Select ${MAX_DAYS} days or fewer to categorize idle and off time.`
                            : "This machine has no idle or off time in the selected report."}
                    </Text>
                </Center>
                    : <>
                        {!isSingleDay && range.tooLong && <Text px={4} pt={3} fontSize="xs" opacity={0.7}>
                            Select {MAX_DAYS} days or fewer to categorize more idle and off time. Showing categorized downtime only.
                        </Text>}
                        {canEdit && <Flex
                            px={4}
                            py={2}
                            gap={3}
                            flexWrap="wrap"
                            alignItems="center"
                            justifyContent="space-between"
                            borderBottom="1px solid"
                            borderColor={border}
                            bg={selectedRows.length > 0 ? (colorMode === "dark" ? "whiteAlpha.100" : "orange.50") : undefined}>
                            {selectedRows.length > 0 ? <>
                                <Flex gap={3} alignItems="center" flexWrap="wrap">
                                    <Text fontSize="sm" fontWeight={600}>
                                        {selectedRows.length} selected
                                        <Text as="span" fontWeight={400} opacity={0.7}> | {secFormatter(selectedTotal)}</Text>
                                    </Text>
                                    {uncategorizedRows.length > 0 && !allUncategorizedSelected && <Button size="xs" variant="link" colorScheme="orange" onClick={toggleAllUncategorized}>
                                        Select all uncategorized ({uncategorizedRows.length})
                                    </Button>}
                                </Flex>
                                <Flex gap={2}>
                                    <Button size="xs" variant="ghost" leftIcon={<FiX />} onClick={() => setSelectedIds([])}>Clear</Button>
                                    <Primary size="xs" leftIcon={<TbTimelineEventPlus />} onClick={openBulk}>Categorize selected</Primary>
                                </Flex>
                            </> : <>
                                <Text fontSize="xs" opacity={0.7}>Tick rows to categorize several at once (shift + click selects a range).</Text>
                                {uncategorizedRows.length > 0 && <Button size="xs" variant="outline" colorScheme="orange" onClick={toggleAllUncategorized}>
                                    Select all uncategorized ({uncategorizedRows.length})
                                </Button>}
                            </>}
                        </Flex>}
                        <SimpleGrid
                            alignItems={"center"}
                            columns={{
                                base: 1,
                                lg: 2
                            }} gap={3}>
                            <Pie height={280} {...pieConfig} />
                            <Box p={0} maxH="340px" overflow={"auto"}>
                                <Table
                                    headings={tableHeadings}
                                    rows={tableRows}
                                    alignLastToLeft={false}
                                />
                            </Box>
                        </SimpleGrid>
                    </>}
        </CardBody>
        <CategorizeModal
            isOpen={isOpen}
            onClose={onClose}
            segment={bulkMode ? null : selected?.segment || null}
            entry={bulkMode ? undefined : selected?.entry}
            bulk={bulkMode ? { rows: selectedRows } : undefined}
            machineName={machineName}
            onSave={save} />
    </MyCard>
}

const SelectCell = ({ canEdit, checked, onToggle }: { canEdit: boolean, checked: boolean, onToggle: (checked: boolean, shiftKey: boolean) => void }) => {
    if (!canEdit) return <></>;
    return <Checkbox
        colorScheme="orange"
        isChecked={checked}
        aria-label="Select downtime"
        onChange={e => onToggle(e.target.checked, !!(e.nativeEvent as MouseEvent).shiftKey)} />
}

const TimeCell = ({ segment, showDate }: { segment: DowntimeSegment, showDate: boolean }) => {
    const actualDateLabel = segment.start && segment.start > 1000000
        ? dayjs.unix(segment.start).format("Do MMM, YY")
        : (segment.from < 25200 ? dayjs(segment.date).add(1, "day").format("Do MMM, YY") : dayjs(segment.date).format("Do MMM, YY"));

    return <Text fontSize="2xs" fontWeight={400}>
        <Text fontWeight={600} fontSize="xs">{showDate ? actualDateLabel : `${secToTime(segment.from)} - ${secToTime(segment.to)}`}</Text>
        {showDate ? `${secToTime(segment.from)} - ${secToTime(segment.to)}` : actualDateLabel}
    </Text>
}

const TypeCell = ({ type }: { type: "IDLE" | "OFF" }) => {
    return <Badge colorScheme={type === "OFF" ? "red" : "orange"} variant="subtle">{type}</Badge>
}

const DurationCell = ({ duration }: { duration: number }) => {
    return <Text py={1} fontSize="xs" fontWeight={600}>{secFormatter(duration)}</Text>
}

const ReasonCell = ({ entry }: { entry?: DowntimeReasonEntry }) => {
    if (isUncategorizedEntry(entry)) {
        return <Text fontSize="xs" fontWeight={600} color="gray.400" textTransform="uppercase">Uncategorized</Text>;
    }
    return <Text fontSize="xs" fontWeight={400} opacity={0.9}>
        <Text fontWeight={600} fontSize="xs" color={entry!.scheduled ? "primary" : "red.400"} textTransform="uppercase">
            {entry!.scheduled ? "Planned" : "Unplanned"} | {entry!.category}
        </Text>
        {entry!.note}
    </Text>
};

const ActionCell = ({
    canEdit,
    isEdit,
    canClaimPlanned,
    remainingAllowanceSec,
    segmentDuration,
    onClaimPlanned,
    onClick
}: {
    canEdit: boolean,
    isEdit: boolean,
    canClaimPlanned?: boolean,
    remainingAllowanceSec?: number,
    segmentDuration?: number,
    onClaimPlanned?: () => void,
    onClick: () => void
}) => {
    if (!canEdit) return <></>;
    const willSplit = canClaimPlanned && remainingAllowanceSec && segmentDuration && segmentDuration > remainingAllowanceSec;
    return <HStack spacing={1.5} my={1}>
        {canClaimPlanned && (
            <Button
                py={3}
                colorScheme="orange"
                variant="subtle"
                size="xs"
                cursor="pointer"
                title={willSplit ? `Claims ${secFormatter(remainingAllowanceSec!)} as Planned and splits the remaining ${secFormatter(segmentDuration! - remainingAllowanceSec!)} for categorization` : "1-Click claim as Planned Stoppage"}
                onClick={onClaimPlanned}>
                {willSplit ? `Claim ${secFormatter(remainingAllowanceSec!)} Planned` : "Claim Planned"}
            </Button>
        )}
        <Button
            py={3}
            colorScheme="orange"
            variant="outline"
            size="xs"
            leftIcon={isEdit ? <FiEdit2 /> : <TbTimelineEventPlus />}
            cursor="pointer"
            onClick={onClick}>
            {isEdit ? "Edit" : "Categorize"}
        </Button>
    </HStack>
}

export default DowntimeReport;
