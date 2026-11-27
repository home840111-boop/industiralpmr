import { G2, Pie, PieConfig } from "@ant-design/plots";
import { Box, SimpleGrid, Text, useColorMode, Center, Icon, Badge, HStack, Checkbox, Flex, Button } from "@chakra-ui/react";
import dayjs from "../../../../Components/Functions/dayjs";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { DataToSet } from "..";
import secFormatter from "../../../../Components/Functions/formatters/secFormatter";
import Table from "../../../../Components/micro/Table";
import { downtimeCategoriesType } from "./categories";
import Categorize, { DowntimeItem } from "./Categorize";
import { FiCheckCircle, FiX } from "react-icons/fi";
import { TbTimelineEventPlus } from "react-icons/tb";
import Primary from "../../../../Components/Buttons/Primary";
import { isMasterAdminAtom, roleAtom, uidAtom } from "../../../../Components/Store/atoms";
import Listen from "../../../../Components/Store/hooks/Listen";
import { canWriteOperational } from "../../../../Services/rbac";

const headings = [
    "Started",
    "Reason",
    "Duration",
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

const Downtime = ({
    data,
    machineId,
    updateLog: parentUpdateLog,
    refetch
}: {
    data: DataToSet["timing"]["downtime"]["logs"];
    machineId?: string;
    updateLog?: (log: any) => void;
    refetch?: () => void;
}) => {
    const G = G2.getEngine('canvas');
    const { colorMode } = useColorMode();
    const uid = Listen(uidAtom);
    Listen(roleAtom);
    Listen(isMasterAdminAtom);
    const canWrite = canWriteOperational(uid);
    const [myData, setMyData] = useState(data);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const lastTicked = useRef<number | null>(null);

    const border = `${colorMode}.border`;

    useEffect(() => {
        setMyData(data);
    }, [data]);

    const activeLogs = useMemo(() => (myData === "NOT_FOUND" || !myData ? [] : myData), [myData]);

    const selectedLogs: DowntimeItem[] = useMemo(
        () => activeLogs.filter(d => selectedIds.includes(d.id)).map(d => ({
            id: d.id,
            start: d.start,
            end: d.end,
            status: d.status,
            reason: d.reason ? {
                category: d.reason.category,
                note: d.reason.note,
                scheduled: d.reason.scheduled
            } : undefined
        })),
        [activeLogs, selectedIds]
    );

    const selectedTotal = useMemo(() => {
        const nowUnix = dayjs().unix();
        return selectedLogs.reduce((acc, d) => {
            const end = d.end && d.end > d.start ? d.end : nowUnix;
            return acc + Math.max(end - d.start, 0);
        }, 0);
    }, [selectedLogs]);

    const uncategorizedLogs = useMemo(
        () => activeLogs.filter(d => !d.reason?.category || d.reason.category.toLowerCase() === "uncategorized"),
        [activeLogs]
    );

    const allUncategorizedSelected = uncategorizedLogs.length > 0 && uncategorizedLogs.every(d => selectedIds.includes(d.id));

    const toggleRow = (index: number, checked: boolean, shiftKey: boolean) => {
        const from = shiftKey && lastTicked.current !== null ? Math.min(lastTicked.current, index) : index;
        const to = shiftKey && lastTicked.current !== null ? Math.max(lastTicked.current, index) : index;
        const ids = activeLogs.slice(from, to + 1).map(d => d.id);
        setSelectedIds(prev => checked
            ? Array.from(new Set([...prev, ...ids]))
            : prev.filter(id => !ids.includes(id)));
        lastTicked.current = index;
    };

    const toggleAllUncategorized = () => {
        const ids = uncategorizedLogs.map(d => d.id);
        setSelectedIds(prev => allUncategorizedSelected
            ? prev.filter(id => !ids.includes(id))
            : Array.from(new Set([...prev, ...ids])));
        lastTicked.current = null;
    };

    const handleBulkSuccess = (updatedList: any[]) => {
        if (myData === "NOT_FOUND" || !myData) return;
        setMyData(prev => {
            if (prev === "NOT_FOUND" || !prev) return prev;
            return prev.map(item => {
                const match = updatedList.find(u => u.id === item.id);
                if (match) {
                    return {
                        ...item,
                        reason: match.reason
                    };
                }
                return item;
            });
        });
        setSelectedIds([]);
        refetch?.();
    };

    const updateLog = (log: {
        start: number;
        end: number;
        reason: {
            category: downtimeCategoriesType;
            note: string;
            scheduled: boolean;
        };
        id: string;
    }) => {
        if (myData === "NOT_FOUND") return;
        const index = myData.findIndex(d => d.id === log.id);
        if (index === -1) return;
        const newData = [...myData];
        newData[index] = log;
        setMyData(newData);
        parentUpdateLog?.(log);
    };

    const tableHeadings = useMemo(() => {
        if (!canWrite) return headings.filter(h => h !== "Action");
        return [
            <Checkbox
                key="select-all"
                colorScheme="orange"
                aria-label="Select all uncategorized downtime"
                isDisabled={uncategorizedLogs.length === 0}
                isChecked={allUncategorizedSelected}
                isIndeterminate={selectedLogs.length > 0 && !allUncategorizedSelected}
                onChange={toggleAllUncategorized}
            />,
            ...headings
        ];
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [uncategorizedLogs.length, allUncategorizedSelected, selectedLogs.length, canWrite]);

    const [rows, notFound, pieData]: [any[][], boolean, {
        name: string;
        value: number;
    }[]] = useMemo(() => {
        const rows: any[][] = [];
        const pieData: {
            name: string;
            value: number;
        }[] = [];
        let notFound = false;
        const pieDistribution: {
            [key: string]: number
        } = {};
        if (myData === "NOT_FOUND" || !myData || myData.length === 0) {
            notFound = true;
        } else for (let i = 0; i < myData.length; i++) {
            const log = myData[i];
            const isActive = !log.end || log.end === 0;
            const duration = isActive ? Math.max(dayjs().unix() - log.start, 0) : Math.max(log.end - log.start, 0);
            const reason = log.reason || {
                category: "UnCategorized",
                note: "None",
                scheduled: false
            };
            if (!pieDistribution[reason.category]) pieDistribution[reason.category] = 0;
            pieDistribution[reason.category] += duration;
            rows.push([
                ...(canWrite ? [{
                    element: SelectCell,
                    props: {
                        checked: selectedIds.includes(log.id),
                        onToggle: (checked: boolean, shiftKey: boolean) => toggleRow(i, checked, shiftKey)
                    }
                }] : []),
                {
                    element: Time,
                    props: {
                        unix: log.start
                    }
                },
                {
                    element: Category,
                    props: {
                        reason
                    }
                },
                {
                    element: Duration,
                    props: {
                        duration,
                        isActive
                    }
                },
                ...(canWrite ? [{
                    element: Categorize,
                    props: {
                        machineId,
                        downtime: log,
                        updateLog
                    }
                }] : [])
            ]);
        }
        for (const key in pieDistribution) {
            pieData.push({
                name: key,
                value: pieDistribution[key]
            });
        }
        return [rows, notFound, pieData];
        // eslint-disable-next-line
    }, [myData, selectedIds, machineId, canWrite]);

    const cfg: PieConfig = {
        appendPadding: 10,
        data: pieData,
        angleField: 'value',
        colorField: 'name',
        animation: false,
        radius: 0.75,
        label: {
            type: 'spider',
            labelHeight: 40,
            formatter: (data: any, mappingData: any) => {
                const group = new G.Group({});
                group.addShape({
                    type: 'circle',
                    attrs: {
                        x: 0,
                        y: 0,
                        width: 40,
                        height: 50,
                        r: 5,
                        fill: mappingData.color,
                    },
                });
                group.addShape({
                    type: 'text',
                    attrs: {
                        x: 10,
                        y: 8,
                        text: `${data.name}`,
                        fill: mappingData.color,
                    },
                });
                group.addShape({
                    type: 'text',
                    attrs: {
                        x: 0,
                        y: 25,
                        text: `${secFormatter(data.value)} (${(data.percent * 100).toFixed(0)}%)`,
                        fill: colorMode === "dark" ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.5)',
                        fontWeight: 700,
                    },
                });
                return group;
            },
        },
        interactions: [
            {
                type: 'element-selected',
            },
            {
                type: 'element-active',
            },
        ],
    };

    if (notFound || pieData.length === 0) {
        return (
            <Center p={8} flexDir="column">
                <Box
                    p={3}
                    borderRadius="full"
                    bg={colorMode === "dark" ? "whiteAlpha.100" : "green.50"}
                    color="green.400"
                    mb={2}
                >
                    <Icon as={FiCheckCircle} fontSize="2xl" />
                </Box>
                <Text fontWeight={700} fontSize="sm">
                    No Downtime Recorded Today
                </Text>
                <Text fontSize="xs" color={colorMode === "dark" ? "gray.400" : "gray.600"}>
                    This machine has experienced zero recorded stops or downtime interruptions.
                </Text>
            </Center>
        );
    }

    return (
        <SimpleGrid
            alignItems={"start"}
            columns={{
                base: 1,
                lg: 2
            }}
            gap={3}
        >
            <Pie
                height={280}
                legend={false}
                tooltip={{
                    formatter: (datum: any) => {
                        return {
                            name: datum.name,
                            value: secFormatter(datum.value)
                        };
                    }
                }}
                {...cfg}
            />
            <Box p={0}>
                {/* Multi-Select Action Banner */}
                {canWrite && <Flex
                    justify="space-between"
                    align="center"
                    px={3}
                    py={2}
                    mb={2}
                    borderRadius="md"
                    border="1px solid"
                    borderColor={border}
                    bg={selectedIds.length > 0 ? (colorMode === "dark" ? "whiteAlpha.100" : "orange.50") : undefined}
                >
                    {selectedIds.length > 0 ? (
                        <>
                            <HStack spacing={2}>
                                <Text fontWeight={600} fontSize="xs" color="orange.400">
                                    {selectedIds.length} selected
                                    <Text as="span" fontWeight={400} opacity={0.7}> | {secFormatter(selectedTotal)}</Text>
                                </Text>
                                {uncategorizedLogs.length > 0 && !allUncategorizedSelected && (
                                    <Button size="xs" variant="link" colorScheme="orange" onClick={toggleAllUncategorized}>
                                        Select all uncategorized ({uncategorizedLogs.length})
                                    </Button>
                                )}
                            </HStack>
                            <HStack spacing={2}>
                                <Button size="xs" variant="ghost" leftIcon={<FiX />} onClick={() => setSelectedIds([])}>
                                    Clear
                                </Button>
                                <Categorize
                                    machineId={machineId}
                                    bulkDowntimes={selectedLogs}
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
                            {uncategorizedLogs.length > 0 && (
                                <Button size="xs" variant="outline" colorScheme="orange" onClick={toggleAllUncategorized}>
                                    Select all uncategorized ({uncategorizedLogs.length})
                                </Button>
                            )}
                        </>
                    )}
                </Flex>}
                <Box maxH="280px" overflow="auto">
                    <Table
                        headings={tableHeadings}
                        notFound={notFound}
                        rows={rows}
                    />
                </Box>
            </Box>
        </SimpleGrid>
    );
};

const Category = ({ reason }: {
    reason: {
        category: string;
        note: string;
        scheduled: boolean;
    }
}) => {
    const { colorMode } = useColorMode();
    const { subText } = useMemo(() => ({
        subText: `${colorMode}.subText`
    }), [colorMode]);

    return (
        <Box fontSize="xs" fontWeight={400} color={subText} py={1}>
            <HStack spacing={1.5} align="center">
                <Text fontWeight={600} fontSize="xs" color={reason.scheduled ? "primary" : "red.400"} textTransform="uppercase">
                    {reason.category}
                </Text>
                {reason.scheduled && (
                    <Badge colorScheme="blue" variant="subtle" fontSize="2xs" px={1.5} py={0.5} borderRadius="sm">
                        Planned (No Loss)
                    </Badge>
                )}
            </HStack>
            {reason.note && reason.note !== "None" && (
                <Text fontSize="2xs" color={subText} mt={0.5}>
                    {reason.note}
                </Text>
            )}
        </Box>
    );
};

const Duration = ({ duration, isActive }: { duration: number; isActive?: boolean }) => {
    return (
        <HStack spacing={1.5} py={1}>
            <Text fontSize="xs" fontWeight={600}>{secFormatter(duration)}</Text>
            {isActive && (
                <Badge colorScheme="red" variant="subtle" fontSize="2xs" px={1.5} py={0.5} borderRadius="sm">
                    ACTIVE
                </Badge>
            )}
        </HStack>
    );
};

const Time = ({ unix }: { unix: number }) => {
    if (!unix || isNaN(unix)) {
        return <Text fontSize="xs" fontWeight={400}>NA</Text>;
    }
    return (
        <Text fontSize="2xs" fontWeight={400}>
            <Text fontWeight={600} fontSize="xs">{dayjs.unix(unix).format("Do MMM, YY")}</Text>
            {dayjs.unix(unix).format("hh:mm A")}
        </Text>
    );
};

export default Downtime;
export { Time, Duration };
