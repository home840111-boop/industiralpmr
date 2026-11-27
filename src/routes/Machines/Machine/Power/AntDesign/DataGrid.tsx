import React from "react";
import {
    Box,
    Text,
    useColorModeValue,
    SimpleGrid,
    Flex,
    Badge,
    Progress,
} from "@chakra-ui/react";
import MyCard from "../../../../../Components/micro/Card";
import { dbSchemaRecord } from "../types";
import {
    POWER_METRICS,
    formatVal,
    toKilo
} from "../../../../../Components/Functions/powerTransformers";

interface DataGridProps {
    daily?: dbSchemaRecord;
}

const PhaseMiniTable = ({
    phaseData,
    metricKey,
    metric,
    borderColor,
    subTextColor,
}: {
    phaseData: { SUM: any; R: any; S: any; T: any };
    metricKey: string;
    metric: any;
    borderColor: string;
    subTextColor: string;
}) => {
    const phases = [
        { key: "R", label: "R", data: phaseData.R, color: "red.400" },
        { key: "S", label: "S", data: phaseData.S, color: "green.400" },
        { key: "T", label: "T", data: phaseData.T, color: "blue.400" },
    ].filter(p => p.data !== null && p.data !== undefined);

    if (phases.length === 0) return <Box />;

    const getVal = (phaseObj: any, stat: "avg" | "max" | "min") => {
        if (!phaseObj?.[metricKey]) return undefined;
        const raw = phaseObj[metricKey][stat];
        return metric.isKilo ? toKilo(raw) : raw;
    };

    return (
        <Box mt={2} pt={2} borderTop="1px dashed" borderColor={borderColor}>
            <Flex gap={0} w="100%">
                {phases.map((phase, idx) => (
                    <Flex
                        key={phase.key}
                        flex={1}
                        flexDir="column"
                        alignItems="center"
                        borderRight={idx < phases.length - 1 ? "1px solid" : "none"}
                        borderColor={borderColor}
                        py={1}
                    >
                        <Text fontSize="xx-small" fontWeight="700" color={phase.color} mb={0.5}>
                            {phase.label}
                        </Text>
                        <Text fontSize="xs" fontWeight="600">
                            {formatVal(getVal(phase.data, "avg"), metric.decimals)}
                        </Text>
                        <Text fontSize="xx-small" color={subTextColor}>
                            {metric.hasMin
                                ? `${formatVal(getVal(phase.data, "min"), metric.decimals)} / ${formatVal(getVal(phase.data, "max"), metric.decimals)}`
                                : `max: ${formatVal(getVal(phase.data, "max"), metric.decimals)}`
                            }
                        </Text>
                    </Flex>
                ))}
            </Flex>
        </Box>
    );
};

const MetricCard = ({
    metric,
    phaseData,
    borderColor,
    subTextColor,
}: {
    metric: any;
    phaseData: { SUM: any; R: any; S: any; T: any };
    borderColor: string;
    subTextColor: string;
}) => {
    const progressBg = useColorModeValue("gray.100", "whiteAlpha.100");

    const sumData = phaseData.SUM?.[metric.key];
    if (!sumData) return <Box />;

    const avg = metric.isKilo ? toKilo(sumData.avg) : sumData.avg;
    const max = metric.isKilo ? toKilo(sumData.max) : sumData.max;
    const min = metric.isKilo ? toKilo(sumData.min) : sumData.min;

    // Calculate progress bar values
    let progressVal = 0;
    if (metric.hasMin) {
        const range = max - min;
        progressVal = range > 0 ? ((avg - min) / range) * 100 : 50;
    } else {
        progressVal = max > 0 ? (avg / max) * 100 : 0;
    }

    const hasMultiPhase = !metric.sumOnly && (phaseData.R !== null || phaseData.S !== null || phaseData.T !== null);

    return (
        <MyCard p={3} border="1px solid" borderColor={borderColor}>
            <Flex justify="space-between" align="flex-start" mb={1}>
                <Text fontSize="xs" fontWeight="600" noOfLines={1}>{metric.label}</Text>
                <Badge fontSize="xx-small" colorScheme="orange" variant="subtle" flexShrink={0}>
                    {metric.unit}
                </Badge>
            </Flex>

            <Flex align="baseline" gap={2} mt={1}>
                <Text fontSize="2xl" fontWeight="700" color="orange.500" lineHeight={1}>
                    {formatVal(avg, metric.decimals)}
                </Text>
                <Text fontSize="xx-small" color={subTextColor} fontWeight="500">
                    avg
                </Text>
            </Flex>

            <Flex gap={3} mt={1}>
                {metric.hasMin && (
                    <Text fontSize="xx-small" color={subTextColor}>
                        min: <Text as="span" fontWeight="600">{formatVal(min, metric.decimals)}</Text>
                    </Text>
                )}
                <Text fontSize="xx-small" color={subTextColor}>
                    max: <Text as="span" fontWeight="600">{formatVal(max, metric.decimals)}</Text>
                </Text>
            </Flex>

            {/* Range Progress Visualization */}
            <Box my={2}>
                <Progress
                    value={progressVal}
                    size="xs"
                    colorScheme="orange"
                    borderRadius="full"
                    bg={progressBg}
                />
            </Box>

            {hasMultiPhase && (
                <PhaseMiniTable
                    phaseData={phaseData}
                    metricKey={metric.key}
                    metric={metric}
                    borderColor={borderColor}
                    subTextColor={subTextColor}
                />
            )}
        </MyCard>
    );
};

const DataGrid = ({ daily }: DataGridProps) => {
    const borderColor = useColorModeValue("gray.200", "#32383e");
    const bgColor = useColorModeValue("white", "#212529");
    const textColor = useColorModeValue("gray.700", "whiteAlpha.900");
    const subTextColor = useColorModeValue("gray.600", "whiteAlpha.700");

    if (!daily) {
        return (
            <Box
                border="1px"
                borderColor={borderColor}
                borderRadius="lg"
                bg={bgColor}
                p={8}
                textAlign="center"
            >
                <Text color={subTextColor}>No daily data available</Text>
            </Box>
        );
    }

    return (
        <Box>
            <Flex justify="space-between" align="center" mb={4}>
                <Text fontSize="xl" fontWeight="600" color={textColor}>
                    Daily Power Summary - Phase Comparison
                </Text>
                <Flex gap={2}>
                    {daily.R && <Badge fontSize="xx-small" colorScheme="red" variant="solid">R</Badge>}
                    {daily.S && <Badge fontSize="xx-small" colorScheme="green" variant="solid">S</Badge>}
                    {daily.T && <Badge fontSize="xx-small" colorScheme="blue" variant="solid">T</Badge>}
                    {daily.SUM && <Badge fontSize="xx-small" colorScheme="orange" variant="solid">SUM</Badge>}
                </Flex>
            </Flex>

            <SimpleGrid columns={{ base: 1, sm: 2, md: 3, xl: 3 }} spacing={3}>
                {POWER_METRICS.map((metric) => (
                    <MetricCard
                        key={metric.key}
                        metric={metric}
                        phaseData={daily}
                        borderColor={borderColor}
                        subTextColor={subTextColor}
                    />
                ))}
            </SimpleGrid>
        </Box>
    );
};

export default DataGrid;
