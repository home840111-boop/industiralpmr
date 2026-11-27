import React from "react";
import {
    Box,
    Text,
    useColorMode,
    Flex,
    SimpleGrid,
    Badge,
    Button,
} from "@chakra-ui/react";
import { FiDownload } from "react-icons/fi";
import MyCard from "../../../../Components/micro/Card";
import { MetricDef, formatVal, toKilo, TransformedPhaseData, TransformedSumPhaseData } from "../../../../Components/Functions/powerTransformers";
import downloadCSV from "../../../../Components/Exporters/csvDownload";

interface PhaseSummaryTableProps {
    metrics: MetricDef[];
    phaseData: {
        SUM: TransformedSumPhaseData | null;
        R: TransformedPhaseData | null;
        S: TransformedPhaseData | null;
        T: TransformedPhaseData | null;
    };
    title: string;
}

const PhaseMiniTable = ({
    phaseData,
    metricKey,
    metric,
    colorMode,
}: {
    phaseData: { SUM: any; R: any; S: any; T: any };
    metricKey: string;
    metric: MetricDef;
    colorMode: string;
}) => {
    const border = `${colorMode}.border`;
    const subText = `${colorMode}.subText`;

    const phases = [
        { key: "R", label: "R", data: phaseData.R, color: "red.400" },
        { key: "S", label: "S", data: phaseData.S, color: "green.400" },
        { key: "T", label: "T", data: phaseData.T, color: "blue.400" },
    ].filter(p => p.data !== null);

    if (phases.length === 0) return <Box />;

    const getVal = (phaseObj: any, stat: "avg" | "max" | "min") => {
        if (!phaseObj?.[metricKey]) return undefined;
        const raw = phaseObj[metricKey][stat];
        return metric.isKilo ? toKilo(raw) : raw;
    };

    return (
        <Box mt={2} pt={2} borderTop="1px dashed" borderColor={border}>
            <Flex gap={0} w="100%">
                {phases.map((phase, idx) => (
                    <Flex
                        key={phase.key}
                        flex={1}
                        flexDir="column"
                        alignItems="center"
                        borderRight={idx < phases.length - 1 ? "1px solid" : "none"}
                        borderColor={border}
                        py={1}
                    >
                        <Text fontSize="xx-small" fontWeight="700" color={phase.color} mb={0.5}>
                            {phase.label}
                        </Text>
                        <Text fontSize="xs" fontWeight="600">
                            {formatVal(getVal(phase.data, "avg"), metric.decimals)}
                        </Text>
                        <Text fontSize="xx-small" color={subText}>
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
    colorMode,
}: {
    metric: MetricDef;
    phaseData: { SUM: any; R: any; S: any; T: any };
    colorMode: string;
}) => {
    const border = `${colorMode}.border`;
    const subText = `${colorMode}.subText`;

    const sumData = phaseData.SUM?.[metric.key];
    if (!sumData) return <Box />;

    const avg = metric.isKilo ? toKilo(sumData.avg) : sumData.avg;
    const max = metric.isKilo ? toKilo(sumData.max) : sumData.max;
    const min = metric.isKilo ? toKilo(sumData.min) : sumData.min;

    const hasMultiPhase = phaseData.R !== null || phaseData.S !== null || phaseData.T !== null;

    return (
        <MyCard p={3} border="1px solid" borderColor={border}>
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
                <Text fontSize="xx-small" color={subText} fontWeight="500">
                    avg
                </Text>
            </Flex>

            <Flex gap={3} mt={1}>
                {metric.hasMin && (
                    <Text fontSize="xx-small" color={subText}>
                        min: <Text as="span" fontWeight="600">{formatVal(min, metric.decimals)}</Text>
                    </Text>
                )}
                <Text fontSize="xx-small" color={subText}>
                    max: <Text as="span" fontWeight="600">{formatVal(max, metric.decimals)}</Text>
                </Text>
            </Flex>

            {hasMultiPhase && (
                <PhaseMiniTable
                    phaseData={phaseData}
                    metricKey={metric.key}
                    metric={metric}
                    colorMode={colorMode}
                />
            )}
        </MyCard>
    );
};

const PhaseSummaryTable = ({ metrics, phaseData, title }: PhaseSummaryTableProps) => {
    const { colorMode } = useColorMode();

    const handleDownloadCSV = () => {
        const headers = ["Metric", "SUM Avg", "SUM Min", "SUM Max", "R Avg", "R Min", "R Max", "S Avg", "S Min", "S Max", "T Avg", "T Min", "T Max"];
        const rows = metrics.map((m) => {
            const getPhaseVals = (ph: any) => {
                if (!ph?.[m.key]) return ["-", "-", "-"];
                const raw = ph[m.key];
                const avg = m.isKilo ? toKilo(raw.avg) : raw.avg;
                const max = m.isKilo ? toKilo(raw.max) : raw.max;
                const min = m.isKilo ? toKilo(raw.min) : raw.min;
                return [formatVal(avg, m.decimals), formatVal(min, m.decimals), formatVal(max, m.decimals)];
            };

            return [
                `${m.label} (${m.unit})`,
                ...getPhaseVals(phaseData.SUM),
                ...getPhaseVals(phaseData.R),
                ...getPhaseVals(phaseData.S),
                ...getPhaseVals(phaseData.T)
            ];
        });

        downloadCSV(`${title.toLowerCase().replace(/\s+/g, "-")}-summary.csv`, headers, rows);
    };

    return (
        <Box>
            <Flex justify="space-between" align="center" mb={3} flexWrap="wrap" gap={2}>
                <Text fontWeight="600" fontSize="sm">{title}</Text>
                <Flex gap={2} align="center" flexWrap="wrap">
                    {phaseData.R && <Badge fontSize="xx-small" colorScheme="red" variant="solid">R</Badge>}
                    {phaseData.S && <Badge fontSize="xx-small" colorScheme="green" variant="solid">S</Badge>}
                    {phaseData.T && <Badge fontSize="xx-small" colorScheme="blue" variant="solid">T</Badge>}
                    {phaseData.SUM && <Badge fontSize="xx-small" colorScheme="orange" variant="solid">SUM</Badge>}
                    <Button
                        size="xs"
                        variant="outline"
                        colorScheme="orange"
                        leftIcon={<FiDownload />}
                        onClick={handleDownloadCSV}
                    >
                        CSV
                    </Button>
                </Flex>
            </Flex>
            <SimpleGrid columns={{ base: 1, sm: 2, md: 3, xl: 3 }} spacing={3}>
                {metrics.map((metric) => (
                    <MetricCard
                        key={metric.key}
                        metric={metric}
                        phaseData={phaseData}
                        colorMode={colorMode}
                    />
                ))}
            </SimpleGrid>
        </Box>
    );
};

export default PhaseSummaryTable;