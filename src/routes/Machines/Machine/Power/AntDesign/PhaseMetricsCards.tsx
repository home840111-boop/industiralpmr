import { Box, SimpleGrid, Text, HStack, VStack, Progress, useColorMode, CardBody } from "@chakra-ui/react";
import { TinyArea } from "@ant-design/plots";
import { useMemo } from "react";
import { dbSchemaRecord, dbSchemaHourlyRecord, dbSchemaNow } from "../types";
import unitFormatter from "../../../../../Components/Functions/formatters/unitFormatter";
import MyCard from "../../../../../Components/micro/Card";

interface PhaseMetricsCardsProps {
    daily?: dbSchemaRecord;
    hourly?: dbSchemaHourlyRecord;
    now?: dbSchemaNow;
}

const PhaseMetricsCards = ({ daily, hourly, now }: PhaseMetricsCardsProps) => {
    const { colorMode } = useColorMode();
    const { border } = useMemo(() => {
        return {
            border: `${colorMode}.border`,
        }
    }, [colorMode]);
    const accentColor = '#ED8936';

    // Helper function to convert power data from watts to kilowatts
    const toPowerKilo = (powerData: { min: number; max: number; avg: number; consumption?: number }) => ({
        min: powerData.min / 1000,
        max: powerData.max / 1000,
        avg: powerData.avg / 1000,
        ...(powerData.consumption !== undefined && { consumption: powerData.consumption }),
    });

    // Generate sparkline data from hourly records
    const getSparklineData = (metric: 'volt' | 'amp' | 'power' | 'powerFactor', phase: 'R' | 'S' | 'T' | 'SUM') => {
        if (!hourly) return [];
        const data = [];
        for (let i = 0; i < 24; i++) {
            if (hourly[i]) {
                const targetMetric = (metric === 'volt' && phase === 'SUM') ? 'lineVoltage' : metric;
                const value = hourly[i][phase]?.[targetMetric]?.avg;
                data.push(typeof value === 'number' && isFinite(value) ? value : 0);
            }
        }
        return data;
    };

    const MetricCard = ({
        title,
        phase,
        data,
        sparklineData,
        unit,
        showConsumption = false,
        realTimeValue,
        decimals = 2,
    }: {
        title: string;
        phase: string;
        data: any;
        sparklineData: number[];
        unit: string;
        showConsumption?: boolean;
        realTimeValue?: number;
        decimals?: number;
    }) => {
        // Use real-time value for progress bar if available, otherwise use average
        const currentValue = realTimeValue !== undefined ? realTimeValue : data?.avg || 0;
        
        let normalizedCurrent = 50;
        if (title === "Power Factor") {
            normalizedCurrent = Math.abs(currentValue) * 100;
        } else if (data) {
            const range = data.max - data.min;
            normalizedCurrent = range > 0 ? ((currentValue - data.min) / range) * 100 : 50;
        }

        const tinyAreaConfig = {
            data: sparklineData,
            smooth: true,
            autoFit: false,
            height: 50,
            line: {
                color: accentColor,
                size: 2,
            },
            areaStyle: {
                fill: `l(90) 0:${accentColor}00 1:${accentColor}`,
                fillOpacity: 0.3,
            },
            tooltip: {
                formatter: (datum: any) => ({
                    name: 'Value',
                    value: `${datum.y.toFixed(decimals)} ${unit}`,
                }),
            },
            animation: {
                appear: {
                    animation: 'wave-in',
                    duration: 1200,
                },
            },
        };

        const isPF = title === "Power Factor";
        const pfDirectionLabel = isPF ? (Math.abs(currentValue) >= 0.99 ? "Unity" : currentValue > 0 ? "IND" : "CAP") : "";

        return (
            <MyCard>
                <VStack align="stretch" spacing={3}>
                    <HStack justify="space-between">
                        <Text fontSize="xs" fontWeight="500" opacity={0.7} textTransform="uppercase" letterSpacing="wide">
                            {title}
                        </Text>
                        <Text fontSize="xs" fontWeight="600" color={accentColor}>
                            {phase}
                        </Text>
                    </HStack>

                    <Text fontSize="2xl" fontWeight="700">
                        {isPF 
                            ? `${Math.abs(currentValue).toFixed(decimals)} ${pfDirectionLabel ? `(${pfDirectionLabel})` : ""}`
                            : `${currentValue.toFixed(decimals)} ${unit}`}
                    </Text>

                    {/* Sparkline */}
                    {sparklineData.length > 0 && (
                        <Box height="50px">
                            <TinyArea {...tinyAreaConfig} />
                        </Box>
                    )}

                    {/* Min/Max Range */}
                    <HStack justify="space-between" fontSize="xs" opacity={0.7}>
                        {isPF ? (
                            <>
                                <Text>CAP Min: {data?.lead_min !== undefined ? Math.abs(data.lead_min).toFixed(decimals) : "--"}</Text>
                                <Text>IND Min: {data?.lag_min !== undefined ? Math.abs(data.lag_min).toFixed(decimals) : "--"}</Text>
                            </>
                        ) : (
                            <>
                                <Text>Min: {data?.min !== undefined ? data.min.toFixed(decimals) : "--"}</Text>
                                <Text>Max: {data?.max !== undefined ? data.max.toFixed(decimals) : "--"}</Text>
                            </>
                        )}
                    </HStack>

                    {/* Progress Bar */}
                    <Progress
                        value={normalizedCurrent}
                        size="sm"
                        colorScheme="orange"
                        borderRadius="full"
                    />

                    {/* Consumption if available */}
                    {showConsumption && data?.consumption !== undefined && (
                        <Box pt={2} borderTop="1px dashed" borderColor={border}>
                            <Text fontSize="xs" opacity={0.7} mb={1} textTransform="uppercase" letterSpacing="wide">
                                Total Consumption
                            </Text>
                            <Text fontSize="lg" fontWeight="600">
                                {unitFormatter(data.consumption)}
                            </Text>
                        </Box>
                    )}
                </VStack>
            </MyCard>
        );
    };

    if (!daily) {
        return (
            <MyCard>
                <CardBody py={8} textAlign="center">
                    <Text opacity={0.7}>No daily data available</Text>
                </CardBody>
            </MyCard>
        );
    }

    return (
        <VStack gap={5} w="100%">
            {/* Total (SUM) Section */}
            <Box w="100%">
                <Text fontSize="md" fontWeight={500} mb={3} textTransform="uppercase" letterSpacing="wide" opacity={0.8}>
                    Total System
                </Text>
                <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={4}>
                    <MetricCard
                        title="Voltage"
                        phase="SUM"
                        data={daily.SUM.lineVoltage}
                        sparklineData={getSparklineData('volt', 'SUM')}
                        unit="V"
                        decimals={1}
                        realTimeValue={now?.SUM?.volt}
                    />
                    <MetricCard
                        title="Current"
                        phase="SUM"
                        data={daily.SUM.amp}
                        sparklineData={getSparklineData('amp', 'SUM')}
                        unit="A"
                        decimals={3}
                        realTimeValue={now?.SUM?.amp}
                    />
                    <MetricCard
                        title="Active Power"
                        phase="SUM"
                        data={toPowerKilo(daily.SUM.power)}
                        sparklineData={getSparklineData('power', 'SUM')}
                        unit="kW"
                        decimals={3}
                        showConsumption
                        realTimeValue={now?.SUM?.power !== undefined ? now.SUM.power / 1000 : undefined}
                    />
                    <MetricCard
                        title="Power Factor"
                        phase="SUM"
                        data={daily.SUM.powerFactor}
                        sparklineData={getSparklineData('powerFactor', 'SUM')}
                        unit=""
                        decimals={2}
                        realTimeValue={now?.SUM?.powerFactor}
                    />
                </SimpleGrid>
            </Box>

            {/* Phase R (L1) */}
            <Box w="100%">
                <Text fontSize="md" fontWeight={500} mb={3} textTransform="uppercase" letterSpacing="wide" opacity={0.8}>
                    Phase L1 (R)
                </Text>
                <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={4}>
                    <MetricCard
                        title="Voltage"
                        phase="L1"
                        data={daily.R.volt}
                        sparklineData={getSparklineData('volt', 'R')}
                        unit="V"
                        decimals={1}
                        realTimeValue={now?.R?.volt}
                    />
                    <MetricCard
                        title="Current"
                        phase="L1"
                        data={daily.R.amp}
                        sparklineData={getSparklineData('amp', 'R')}
                        unit="A"
                        decimals={3}
                        realTimeValue={now?.R?.amp}
                    />
                    <MetricCard
                        title="Active Power"
                        phase="L1"
                        data={toPowerKilo(daily.R.power)}
                        sparklineData={getSparklineData('power', 'R')}
                        unit="kW"
                        decimals={3}
                        showConsumption
                        realTimeValue={now?.R?.power !== undefined ? now.R.power / 1000 : undefined}
                    />
                    <MetricCard
                        title="Power Factor"
                        phase="L1"
                        data={daily.R.powerFactor}
                        sparklineData={getSparklineData('powerFactor', 'R')}
                        unit=""
                        decimals={2}
                        realTimeValue={now?.R?.powerFactor}
                    />
                </SimpleGrid>
            </Box>

            {/* Phase S (L2) */}
            <Box w="100%">
                <Text fontSize="md" fontWeight={500} mb={3} textTransform="uppercase" letterSpacing="wide" opacity={0.8}>
                    Phase L2 (S)
                </Text>
                <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={4}>
                    <MetricCard
                        title="Voltage"
                        phase="L2"
                        data={daily.S.volt}
                        sparklineData={getSparklineData('volt', 'S')}
                        unit="V"
                        decimals={1}
                        realTimeValue={now?.S?.volt}
                    />
                    <MetricCard
                        title="Current"
                        phase="L2"
                        data={daily.S.amp}
                        sparklineData={getSparklineData('amp', 'S')}
                        unit="A"
                        decimals={3}
                        realTimeValue={now?.S?.amp}
                    />
                    <MetricCard
                        title="Active Power"
                        phase="L2"
                        data={toPowerKilo(daily.S.power)}
                        sparklineData={getSparklineData('power', 'S')}
                        unit="kW"
                        decimals={3}
                        showConsumption
                        realTimeValue={now?.S?.power !== undefined ? now.S.power / 1000 : undefined}
                    />
                    <MetricCard
                        title="Power Factor"
                        phase="L2"
                        data={daily.S.powerFactor}
                        sparklineData={getSparklineData('powerFactor', 'S')}
                        unit=""
                        decimals={2}
                        realTimeValue={now?.S?.powerFactor}
                    />
                </SimpleGrid>
            </Box>

            {/* Phase T (L3) */}
            <Box w="100%">
                <Text fontSize="md" fontWeight={500} mb={3} textTransform="uppercase" letterSpacing="wide" opacity={0.8}>
                    Phase L3 (T)
                </Text>
                <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={4}>
                    <MetricCard
                        title="Voltage"
                        phase="L3"
                        data={daily.T.volt}
                        sparklineData={getSparklineData('volt', 'T')}
                        unit="V"
                        decimals={1}
                        realTimeValue={now?.T?.volt}
                    />
                    <MetricCard
                        title="Current"
                        phase="L3"
                        data={daily.T.amp}
                        sparklineData={getSparklineData('amp', 'T')}
                        unit="A"
                        decimals={3}
                        realTimeValue={now?.T?.amp}
                    />
                    <MetricCard
                        title="Active Power"
                        phase="L3"
                        data={toPowerKilo(daily.T.power)}
                        sparklineData={getSparklineData('power', 'T')}
                        unit="kW"
                        decimals={3}
                        showConsumption
                        realTimeValue={now?.T?.power !== undefined ? now.T.power / 1000 : undefined}
                    />
                    <MetricCard
                        title="Power Factor"
                        phase="L3"
                        data={daily.T.powerFactor}
                        sparklineData={getSparklineData('powerFactor', 'T')}
                        unit=""
                        decimals={2}
                        realTimeValue={now?.T?.powerFactor}
                    />
                </SimpleGrid>
            </Box>
        </VStack>
    );
};

export default PhaseMetricsCards;
