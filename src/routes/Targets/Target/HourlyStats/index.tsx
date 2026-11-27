import { Box, SimpleGrid, Text, Center, Icon, Badge, Button, ButtonGroup, Flex, HStack, VStack } from "@chakra-ui/react"
import { useEffect, useMemo, useState } from "react";
import { DataToSet } from ".."
import Table from "../../../../Components/micro/Table";
import { Duration, Time } from "../Downtime";
import dayjs from "../../../../Components/Functions/dayjs";
import NumberFormatter from "../../../../Components/micro/NumberFormatter";
import { Line, LineConfig } from '@ant-design/plots';
import { viewAll } from "../../../Reports/Viewer/FactoryReport/Machine/MachineBreakdown/PieChart";
import { FiBarChart2 } from "react-icons/fi";
import secFormatter from "../../../../Components/Functions/formatters/secFormatter";

const headings = [
    "Time",
    "Act Production",
    "Exp Production",
    "Ontime",
    "Downtime",
    "Efficiency"
];

const OffShiftBadge = () => (
    <Badge colorScheme="purple" variant="subtle" fontSize="10px" px={2} py={0.5} borderRadius="md">
        Off Shift
    </Badge>
);

const DowntimeCell: React.FC<{ duration: number; reason?: string; isPlanned?: boolean }> = ({ duration, reason, isPlanned }) => {
    return (
        <VStack align="start" spacing={0.5} py={1}>
            <Text fontSize="xs" fontWeight={600}>{secFormatter(duration)}</Text>
            {reason && reason !== "-" && (
                <HStack spacing={1}>
                    <Badge colorScheme={isPlanned ? "blue" : (reason.toLowerCase().includes("uncategorized") ? "red" : "gray")} variant="subtle" fontSize="3xs" px={1} borderRadius="sm">
                        {isPlanned ? `Planned: ${reason}` : reason}
                    </Badge>
                </HStack>
            )}
        </VStack>
    );
};

const HourlyStats = ({
    data,
    hourlyTarget
}: {
    data: DataToSet["hours"],
    hourlyTarget: number
}) => {
    const [animation, setAnimation] = useState<boolean>(true);
    const [viewMode, setViewMode] = useState<"all" | "active">("all");

    useEffect(() => {
        const timeout = setTimeout(() => {
            setAnimation(false);
        }, 5000);
        return () => {
            clearTimeout(timeout);
        }
    }, []);

    const hasOffShiftHours = useMemo(() => data.some(h => h.isOffShift), [data]);

    const displayData = useMemo(() => {
        if (viewMode === "active") {
            return data.filter(h => !h.isOffShift);
        }
        return data;
    }, [data, viewMode]);

    const [rows, notFound, lineData]: [any[][], boolean, {
        time: string;
        value: number;
        type: 'Act' | 'Exp';
    }[]] = useMemo(() => {
        const myRows: any[][] = [];
        const lineData: {
            time: string;
            value: number;
            type: 'Act' | 'Exp';
        }[] = [];
        let notFound = displayData.length === 0;
        for (const hour of displayData) {
            const time =
                hour.unix ||
                (hour.rawDate
                    ? dayjs(`${hour.rawDate} ${(hour.time || "").split("-")[0]?.trim()}`).unix()
                    : dayjs(`${hour.date} ${(hour.time || "").split("-")[0]?.trim()}`).unix());

            const isOff = !!hour.isOffShift;
            const planned = hour.plannedDowntime || 0;
            const effectiveDowntime = Math.max((hour.downtime || 0) - planned, 0);
            const totalTime = (hour.ontime || 0) + effectiveDowntime;
            const efficiency =
                totalTime > 0
                    ? `${Math.round(((hour.ontime || 0) / totalTime) * 100)}%`
                    : "0%";

            myRows.push([
                {
                    element: Time,
                    props: {
                        unix: time
                    }
                },
                isOff
                    ? {
                        element: Text,
                        props: {
                            color: "gray.500",
                            fontSize: "xs"
                        },
                        children: "0 pc(s)"
                    }
                    : {
                        element: NumberFormatter,
                        props: {
                            number: hour.production,
                            suffix: "pc(s)",
                            color: hourlyTarget && hourlyTarget > hour.production ? "red" : "green",
                            fontWeight: 500
                        }
                    },
                isOff
                    ? {
                        element: Text,
                        props: {
                            color: "gray.500",
                            fontSize: "xs"
                        },
                        children: "-"
                    }
                    : {
                        element: NumberFormatter,
                        props: {
                            number: hourlyTarget,
                            suffix: "pc(s)"
                        }
                    },
                isOff
                    ? {
                        element: Text,
                        props: {
                            color: "gray.500",
                            fontSize: "xs"
                        },
                        children: "0s"
                    }
                    : {
                        element: Duration,
                        props: {
                            duration: hour.ontime
                        }
                    },
                isOff
                    ? {
                        element: Text,
                        props: {
                            color: "gray.500",
                            fontSize: "xs"
                        },
                        children: "0s"
                    }
                    : {
                        element: DowntimeCell,
                        props: {
                            duration: hour.downtime,
                            reason: hour.downtimeCategory || hour.downtimeReason,
                            isPlanned: hour.isPlanned
                        }
                    },
                isOff
                    ? {
                        element: OffShiftBadge,
                        props: {}
                    }
                    : {
                        element: Text,
                        props: {
                            py: 1,
                            fontSize: "xs",
                            fontWeight: 600
                        },
                        children: efficiency
                    }
            ]);
            const formattedHour = dayjs.unix(time).format(`Do MMM ha`);
            lineData.push({
                time: formattedHour,
                value: hour.production,
                type: 'Act'
            });
            lineData.push({
                time: formattedHour,
                value: isOff ? 0 : hourlyTarget,
                type: 'Exp'
            });
        }
        return [myRows, notFound, lineData];
    }, [displayData, hourlyTarget]);

    const config: LineConfig = {
        animation,
        data: lineData,
        height: 280,
        xAxis: {
            range: [0, 1],
        },
        yAxis: {
            label: {
                formatter: (v: string) => {
                    return `${v} pc(s)`;
                },
            },
            grid: {
                line: {
                    style: {
                        stroke: 'transparent',
                    },
                },
            },
        },
        smooth: true,
        xField: 'time',
        yField: 'value',
        seriesField: 'type',
    };

    if (notFound) {
        return (
            <Center p={8} flexDir="column">
                <Box
                    p={3}
                    borderRadius="full"
                    bg="whiteAlpha.100"
                    color="gray.400"
                    mb={2}
                >
                    <Icon as={FiBarChart2} fontSize="2xl" />
                </Box>
                <Text fontWeight={700} fontSize="sm">
                    No Hourly Production Data Yet
                </Text>
                <Text fontSize="xs" color="gray.500">
                    Hourly intervals will appear here as the shift progresses.
                </Text>
            </Center>
        );
    }

    return (
        <Box>
            {hasOffShiftHours && (
                <Flex justify="flex-end" mb={2}>
                    <ButtonGroup size="xs" isAttached variant="outline">
                        <Button
                            colorScheme={viewMode === "all" ? "orange" : "gray"}
                            variant={viewMode === "all" ? "solid" : "outline"}
                            onClick={() => setViewMode("all")}
                        >
                            24h Uniform Timeline
                        </Button>
                        <Button
                            colorScheme={viewMode === "active" ? "orange" : "gray"}
                            variant={viewMode === "active" ? "solid" : "outline"}
                            onClick={() => setViewMode("active")}
                        >
                            Active Shifts Only
                        </Button>
                    </ButtonGroup>
                </Flex>
            )}
            <SimpleGrid
                alignItems={"center"}
                justifyContent="flex-end"
                pt={2}
                columns={{
                    base: 1,
                    lg: 2
                }}
                gap={3}
            >
                <Line
                    legend={{
                        position: 'bottom',
                    }}
                    lineStyle={{
                        lineWidth: 2.5,
                    }}
                    color={['#ED8936', '#8080805e']}
                    tooltip={{
                        formatter: (datum: any) => {
                            return {
                                name: datum.type,
                                value: viewAll(datum.value, "production"),
                            };
                        }
                    }}
                    {...config}
                />
                <Box p={0} maxH="300px" overflow="auto">
                    <Table
                        headings={headings}
                        notFound={notFound}
                        rows={rows}
                    />
                </Box>
            </SimpleGrid>
        </Box>
    );
};

export default HourlyStats;
