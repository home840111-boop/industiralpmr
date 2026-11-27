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
    Button
} from "@chakra-ui/react";
import { useMemo, useRef, useState } from "react";
import { FiAlertTriangle, FiCheckCircle, FiX } from "react-icons/fi";
import { TbTimelineEventPlus } from "react-icons/tb";
import dayjs from "../../../../Components/Functions/dayjs";
import secFormatter from "../../../../Components/Functions/formatters/secFormatter";
import MyCard from "../../../../Components/micro/Card";
import Table from "../../../../Components/micro/Table";
import Categorize from "../../../Targets/Target/Downtime/Categorize";
import Primary from "../../../../Components/Buttons/Primary";

export interface TargetDowntimeEvent {
    id: string;
    start: number;
    end: number;
    duration: number;
    status: "IDLE" | "OFF";
    category: string;
    note: string;
    scheduled: boolean;
    isActive?: boolean;
}

export interface TargetDowntimeData {
    total: number;
    planned: number;
    unplanned: number;
    events: TargetDowntimeEvent[];
    categoryBreakdown: {
        name: string;
        value: number;
    }[];
}

const headings = [
    "Started",
    "Status",
    "Duration",
    "Category",
    "Type",
    "Notes",
    "Action"
];

const SelectCell: React.FC<{ checked: boolean; onToggle: (checked: boolean, shiftKey: boolean) => void }> = ({ checked, onToggle }) => {
    return (
        <Checkbox
            colorScheme="orange"
            isChecked={checked}
            aria-label="Select downtime"
            onChange={e => onToggle(e.target.checked, !!(e.nativeEvent as MouseEvent).shiftKey)}
        />
    );
};

const TargetDowntimeSection = ({
    downtime,
    machineId,
    onUpdateDowntime
}: {
    downtime?: TargetDowntimeData;
    machineId?: string;
    onUpdateDowntime?: (updated: any) => void;
}) => {
    const { colorMode } = useColorMode();
    const { border, subText } = useMemo(() => ({
        border: `${colorMode}.border`,
        subText: `${colorMode}.subText`
    }), [colorMode]);

    const isDark = colorMode === "dark";
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const lastTicked = useRef<number | null>(null);

    const events = useMemo(() => downtime?.events || [], [downtime?.events]);
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
        const ids = events.slice(from, to + 1).map(ev => ev.id);
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
        updatedList.forEach(u => onUpdateDowntime?.(u));
        setSelectedIds([]);
    };

    const tableHeadings = useMemo(() => [
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    ], [uncategorizedEvents.length, allUncategorizedSelected, selectedEvents.length]);

    const categorizedDuration = useMemo(() => {
        if (!downtime) return 0;
        return downtime.categoryBreakdown
            .filter(c => c.name.toLowerCase() !== "uncategorized")
            .reduce((acc, c) => acc + c.value, 0);
    }, [downtime]);

    const categorizedPercent = useMemo(() => {
        if (!downtime || downtime.total === 0) return 0;
        return Math.min(Math.round((categorizedDuration / downtime.total) * 100), 100);
    }, [downtime, categorizedDuration]);

    const tableRows = useMemo(() => {
        if (!downtime || downtime.events.length === 0) return [];
        return downtime.events.map((ev, index) => {
            const isUncat = ev.category.toLowerCase() === "uncategorized";
            return [
                {
                    element: SelectCell,
                    props: {
                        checked: selectedIds.includes(ev.id),
                        onToggle: (checked: boolean, shiftKey: boolean) => toggleRow(index, checked, shiftKey)
                    }
                },
                {
                    element: Text,
                    props: { fontSize: "xs", fontWeight: 500 },
                    children: dayjs.unix(ev.start).format("YYYY-MM-DD hh:mm A")
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
                    element: HStack,
                    props: { spacing: 1.5 },
                    children: (
                        <>
                            <Text fontSize="xs" fontWeight={600}>{secFormatter(ev.duration)}</Text>
                            {ev.isActive && (
                                <Badge colorScheme="red" variant="solid" fontSize="3xs" px={1} borderRadius="sm">
                                    ACTIVE
                                </Badge>
                            )}
                        </>
                    )
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
                {
                    element: Categorize,
                    props: {
                        machineId,
                        downtime: {
                            id: ev.id,
                            start: ev.start,
                            end: ev.end,
                            status: ev.status,
                            reason: {
                                category: ev.category,
                                note: ev.note,
                                scheduled: ev.scheduled
                            }
                        },
                        updateLog: (updated: any) => {
                            onUpdateDowntime?.(updated);
                        }
                    }
                }
            ];
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [downtime, selectedIds, machineId, onUpdateDowntime, subText]);

    if (!downtime || downtime.events.length === 0) {
        return (
            <MyCard p={5}>
                <Center flexDir="column" py={6}>
                    <Icon as={FiCheckCircle} fontSize="3xl" color="green.400" mb={2} />
                    <Text fontWeight={700} fontSize="md">Zero Stoppages Recorded</Text>
                    <Text fontSize="xs" color={subText}>No downtime was recorded during this production target run.</Text>
                </Center>
            </MyCard>
        );
    }

    return (
        <VStack spacing={4} w="100%" align="stretch">
            {/* KPI Summary Cards */}
            <SimpleGrid columns={{ base: 2, md: 4 }} gap={3}>
                <MyCard p={3}>
                    <HStack justify="space-between" align="center">
                        <Text fontSize="3xs" textTransform="uppercase" fontWeight={700} color={subText}>Total Downtime</Text>
                        <Icon as={FiAlertTriangle} color="red.400" />
                    </HStack>
                    <Text fontSize="lg" fontWeight={700} mt={1}>{secFormatter(downtime.total)}</Text>
                    <Text fontSize="3xs" color={subText}>{downtime.events.length} Stoppage(s)</Text>
                </MyCard>

                <MyCard p={3}>
                    <HStack justify="space-between" align="center">
                        <Text fontSize="3xs" textTransform="uppercase" fontWeight={700} color={subText}>Planned Downtime</Text>
                        <Badge colorScheme="blue" variant="subtle" fontSize="3xs">No Loss</Badge>
                    </HStack>
                    <Text fontSize="lg" fontWeight={700} mt={1} color="blue.400">{secFormatter(downtime.planned)}</Text>
                    <Text fontSize="3xs" color={subText}>Excluded from efficiency loss</Text>
                </MyCard>

                <MyCard p={3}>
                    <HStack justify="space-between" align="center">
                        <Text fontSize="3xs" textTransform="uppercase" fontWeight={700} color={subText}>Unplanned Downtime</Text>
                        <Badge colorScheme="red" variant="subtle" fontSize="3xs">Penalty</Badge>
                    </HStack>
                    <Text fontSize="lg" fontWeight={700} mt={1} color="red.400">{secFormatter(downtime.unplanned)}</Text>
                    <Text fontSize="3xs" color={subText}>Penalizes target efficiency</Text>
                </MyCard>

                <MyCard p={3}>
                    <HStack justify="space-between" align="center">
                        <Text fontSize="3xs" textTransform="uppercase" fontWeight={700} color={subText}>Categorized</Text>
                        <Text fontSize="3xs" fontWeight={700} color={categorizedPercent >= 80 ? "green.400" : "orange.400"}>
                            {categorizedPercent}%
                        </Text>
                    </HStack>
                    <Progress mt={2} size="xs" borderRadius="full" value={categorizedPercent} colorScheme={categorizedPercent >= 80 ? "green" : "orange"} />
                    <Text fontSize="3xs" color={subText} mt={1.5}>{secFormatter(categorizedDuration)} of {secFormatter(downtime.total)}</Text>
                </MyCard>
            </SimpleGrid>

            {/* Category Breakdown & Detailed Stoppages */}
            <SimpleGrid columns={{ base: 1, lg: 3 }} gap={3}>
                {/* Category Breakdown (1 col) */}
                <MyCard p={4}>
                    <Text fontWeight={700} fontSize="sm" mb={3}>Downtime Reasons Breakdown</Text>
                    <VStack spacing={2.5} align="stretch">
                        {downtime.categoryBreakdown.map(cat => {
                            const pct = downtime.total > 0 ? Math.round((cat.value / downtime.total) * 100) : 0;
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
                                    <Progress mt={1.5} size="xs" borderRadius="full" value={pct} colorScheme={isUncat ? "red" : "orange"} />
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
                                <Text fontWeight={700} fontSize="sm">Target Downtime Stoppages Log</Text>
                                <Badge colorScheme="orange" variant="outline" fontSize="2xs">
                                    {downtime.events.length} Events
                                </Badge>
                            </HStack>
                        </CardHeader>
                        {/* Multi-Select Action Banner */}
                        <Flex
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
                                            bulkDowntimes={selectedEvents.map(ev => ({
                                                id: ev.id,
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
                        </Flex>
                        <Box maxH="320px" overflow="auto">
                            <Table
                                headings={tableHeadings}
                                notFound={downtime.events.length === 0}
                                rows={tableRows}
                            />
                        </Box>
                    </MyCard>
                </Box>
            </SimpleGrid>
        </VStack>
    );
};

export default TargetDowntimeSection;
