import React, { useMemo, useState } from "react";
import {
    Box,
    Table,
    Thead,
    Tbody,
    Tr,
    Th,
    Td,
    Text,
    useColorMode,
    Flex,
    Divider,
    Select,
    Center,
    Button,
} from "@chakra-ui/react";
import { FiDownload } from "react-icons/fi";
import secToTime from "../../../../Components/Functions/converters/secondsToHourMin";
import MyCard from "../../../../Components/micro/Card";
import { MetricDef, formatVal, toKilo } from "../../../../Components/Functions/powerTransformers";
import downloadCSV from "../../../../Components/Exporters/csvDownload";

interface HourlyRecord {
    from: number;
    time: number;
    phase_values: any;
}

interface HourlyBreakdownTableProps {
    allHours: HourlyRecord[];
    title: string;
    metrics: MetricDef[];
}

const HourlyBreakdownTable = ({ allHours, title, metrics }: HourlyBreakdownTableProps) => {
    const { colorMode } = useColorMode();
    const headerBg = `${colorMode}.tableHeaderBG`;
    const headerColor = `${colorMode}.tableHeaderColor`;
    const hoverBg = `${colorMode}.hoverBG`;
    const border = `${colorMode}.border`;

    const [selectedPhase, setSelectedPhase] = useState<"SUM" | "R" | "S" | "T">("SUM");
    const [selectedMetric, setSelectedMetric] = useState<string>(metrics[0]?.key || "");

    const sortedHours = useMemo(() => {
        return [...allHours]
            .filter((h) => h && h.from !== undefined)
            .sort((a, b) => a.from - b.from);
    }, [allHours]);

    const hasMultiPhase = useMemo(() => {
        if (sortedHours.length === 0) return false;
        const first = sortedHours[0].phase_values;
        return first?.R !== null && first?.R !== undefined;
    }, [sortedHours]);

    const activeMetric = metrics.find(m => m.key === selectedMetric) || metrics[0];

    const handleDownloadCSV = () => {
        const headers = ["Hour", ...(activeMetric.hasMin ? ["Min"] : []), "Avg", "Max"];
        const rows = sortedHours.map((hour) => {
            const timeStr = secToTime(hour.from) + " - " + secToTime(hour.time);
            const phaseObj = hour.phase_values?.[selectedPhase];
            const metricData = phaseObj?.[activeMetric.key];

            const avg = metricData ? (activeMetric.isKilo ? toKilo(metricData.avg) : metricData.avg) : undefined;
            const max = metricData ? (activeMetric.isKilo ? toKilo(metricData.max) : metricData.max) : undefined;
            const min = metricData ? (activeMetric.isKilo ? toKilo(metricData.min) : metricData.min) : undefined;

            return [
                timeStr,
                ...(activeMetric.hasMin ? [formatVal(min, activeMetric.decimals)] : []),
                formatVal(avg, activeMetric.decimals),
                formatVal(max, activeMetric.decimals)
            ];
        });

        downloadCSV(`${title.toLowerCase().replace(/\s+/g, "-")}-${selectedPhase}-${activeMetric.key}.csv`, headers, rows);
    };

    return (
        <MyCard p={4} border="1px solid" borderColor={border}>
            <Flex justify="space-between" align="center" mb={3} flexWrap="wrap" gap={2}>
                <Text fontWeight="600" fontSize="sm">{title}</Text>
                <Flex gap={2} align="center" flexWrap="wrap" w={{ base: "100%", md: "auto" }}>
                    <Select
                        size="sm"
                        w={{ base: "100%", sm: "160px" }}
                        value={selectedMetric}
                        onChange={(e) => setSelectedMetric(e.target.value)}
                        focusBorderColor="primary"
                    >
                        {metrics.map(m => (
                            <option key={m.key} value={m.key}>{m.label} ({m.unit})</option>
                        ))}
                    </Select>
                    {hasMultiPhase && (
                        <Select
                            size="sm"
                            w={{ base: "100%", sm: "130px" }}
                            value={selectedPhase}
                            onChange={(e) => setSelectedPhase(e.target.value as any)}
                            focusBorderColor="primary"
                        >
                            <option value="SUM">Total (SUM)</option>
                            <option value="R">Phase R</option>
                            <option value="S">Phase S</option>
                            <option value="T">Phase T</option>
                        </Select>
                    )}
                    <Button
                        size="sm"
                        variant="outline"
                        colorScheme="orange"
                        leftIcon={<FiDownload />}
                        onClick={handleDownloadCSV}
                    >
                        CSV
                    </Button>
                </Flex>
            </Flex>
            <Divider mb={3} />
            <Box overflowX="auto">
                {sortedHours.length === 0 ? (
                    <Center py={6}>
                        <Text opacity={0.6} fontSize="xs">No hourly data available.</Text>
                    </Center>
                ) : (
                    <Table variant="simple" size="sm">
                        <Thead>
                            <Tr>
                                <Th bg={headerBg} color={headerColor} fontSize="xx-small" py={2}>
                                    Hour
                                </Th>
                                {activeMetric.hasMin && (
                                    <Th bg={headerBg} color={headerColor} fontSize="xx-small" py={2} isNumeric>
                                        Min
                                    </Th>
                                )}
                                <Th bg={headerBg} color={headerColor} fontSize="xx-small" py={2} isNumeric>
                                    Avg
                                </Th>
                                <Th bg={headerBg} color={headerColor} fontSize="xx-small" py={2} isNumeric>
                                    Max
                                </Th>
                            </Tr>
                        </Thead>
                        <Tbody>
                            {sortedHours.map((hour, idx) => {
                                const timeStr = secToTime(hour.from) + " - " + secToTime(hour.time);
                                const phaseObj = hour.phase_values?.[selectedPhase];
                                const metricData = phaseObj?.[activeMetric.key];

                                const avg = metricData ? (activeMetric.isKilo ? toKilo(metricData.avg) : metricData.avg) : undefined;
                                const max = metricData ? (activeMetric.isKilo ? toKilo(metricData.max) : metricData.max) : undefined;
                                const min = metricData ? (activeMetric.isKilo ? toKilo(metricData.min) : metricData.min) : undefined;

                                return (
                                    <Tr key={idx} _hover={{ bg: hoverBg }} transition="all 0.15s">
                                        <Td fontSize="xs" py={2} fontWeight="500" whiteSpace="nowrap">
                                            {timeStr}
                                        </Td>
                                        {activeMetric.hasMin && (
                                            <Td fontSize="xs" py={2} isNumeric>
                                                {formatVal(min, activeMetric.decimals)}
                                            </Td>
                                        )}
                                        <Td fontSize="xs" py={2} isNumeric fontWeight="600" color="orange.500">
                                            {formatVal(avg, activeMetric.decimals)}
                                        </Td>
                                        <Td fontSize="xs" py={2} isNumeric>
                                            {formatVal(max, activeMetric.decimals)}
                                        </Td>
                                    </Tr>
                                );
                            })}
                        </Tbody>
                    </Table>
                )}
            </Box>
        </MyCard>
    );
};

export default HourlyBreakdownTable;