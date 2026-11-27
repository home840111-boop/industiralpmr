import React, { useMemo, useState } from "react";
import {
    Box,
    Text,
    useColorMode,
    Flex,
    Divider,
    Select,
    Center,
    Badge,
    SimpleGrid,
    HStack,
    VStack,
} from "@chakra-ui/react";
import { Line } from "@ant-design/plots";
import dayjs from "../../../../Components/Functions/dayjs";
import secToTime from "../../../../Components/Functions/converters/secondsToHourMin";
import MyCard from "../../../../Components/micro/Card";
import PhaseSummaryTable from "./PhaseSummaryTable";
import HourlyBreakdownTable from "./HourlyBreakdownTable";
import { HARMONICS_METRICS } from "../../../../Components/Functions/powerTransformers";

interface PowerQualityTabProps {
    data: any;
    isSingleDay: boolean;
}

const PowerQualityStatusCard = ({ thdQuality, worstPhase, border, colorMode }: any) => {
    if (!thdQuality) return null;

    const voltColor = thdQuality.avgVoltTHD < 5 ? '#48BB78' : thdQuality.avgVoltTHD < 8 ? '#ED8936' : '#F56565';
    const ampColor = thdQuality.avgAmpTHD < 15 ? '#48BB78' : thdQuality.avgAmpTHD < 30 ? '#ED8936' : '#F56565';

    return (
        <MyCard p={4} border="1px solid" borderColor={border} bg={colorMode === 'dark' ? 'whiteAlpha.50' : 'gray.50'}>
            <VStack spacing={3} align="stretch">
                <Flex justify="space-between" align="center" flexWrap="wrap" gap={2}>
                    <HStack spacing={2}>
                        <Text fontSize="md" fontWeight="700">Power Quality Status Assessment</Text>
                    </HStack>
                    <Badge colorScheme={thdQuality.colorScheme} p={1} px={3} borderRadius="full" fontSize="xs" fontWeight="700">
                        {thdQuality.status}
                    </Badge>
                </Flex>
                <Divider />
                <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4} pt={1}>
                    <Box p={3} borderRadius="md" borderWidth="1px" borderColor={border} bg={colorMode === 'dark' ? 'whiteAlpha.50' : 'white'}>
                        <VStack align="start" spacing={1}>
                            <Text fontSize="xx-small" fontWeight="600" opacity={0.6} textTransform="uppercase">Average Voltage THD</Text>
                            <HStack align="baseline" spacing={1} flexWrap="wrap">
                                <Text fontSize="xl" fontWeight="700" color={voltColor}>
                                    {thdQuality.avgVoltTHD.toFixed(2)}%
                                </Text>
                                <Text fontSize="xx-small" color={voltColor} fontWeight="600">
                                    {thdQuality.avgVoltTHD < 5 ? '✓ Good' : thdQuality.avgVoltTHD < 8 ? '⚠️ Acceptable' : '✗ Poor'}
                                </Text>
                            </HStack>
                        </VStack>
                    </Box>
                    <Box p={3} borderRadius="md" borderWidth="1px" borderColor={border} bg={colorMode === 'dark' ? 'whiteAlpha.50' : 'white'}>
                        <VStack align="start" spacing={1}>
                            <Text fontSize="xx-small" fontWeight="600" opacity={0.6} textTransform="uppercase">Average Current THD</Text>
                            <HStack align="baseline" spacing={1} flexWrap="wrap">
                                <Text fontSize="xl" fontWeight="700" color={ampColor}>
                                    {thdQuality.avgAmpTHD.toFixed(2)}%
                                </Text>
                                <Text fontSize="xx-small" color={ampColor} fontWeight="600">
                                    {thdQuality.avgAmpTHD < 15 ? '✓ Good' : thdQuality.avgAmpTHD < 30 ? '⚠️ Acceptable' : '✗ Poor'}
                                </Text>
                            </HStack>
                        </VStack>
                    </Box>
                    <Box p={3} borderRadius="md" borderWidth="1px" borderColor={border} bg={colorMode === 'dark' ? 'whiteAlpha.50' : 'white'}>
                        <VStack align="start" spacing={1}>
                            <Text fontSize="xx-small" fontWeight="600" opacity={0.6} textTransform="uppercase">Worst Phase</Text>
                            <Text fontSize="xl" fontWeight="700" color="orange.400">
                                {worstPhase ? worstPhase.name : "N/A"}
                            </Text>
                            {worstPhase && (
                                <Text fontSize="xx-small" opacity={0.7} fontWeight="500">
                                    Combined THD: {(worstPhase.vthd + worstPhase.ithd).toFixed(2)}%
                                </Text>
                            )}
                        </VStack>
                    </Box>
                </SimpleGrid>
            </VStack>
        </MyCard>
    );
};

const SystemMetricsVisualizer = ({ dayRecord, border, colorMode }: any) => {
    if (!dayRecord?.SUM || !dayRecord?.R || !dayRecord?.S || !dayRecord?.T) return null;

    // 1. Efficiency
    const active = dayRecord.SUM.power?.avg || 0;
    const apparent = dayRecord.SUM.apparentPower?.avg || 0;
    const efficiency = apparent > 0 ? (active / apparent) * 100 : 0;
    const efficiencyColor = efficiency > 85 ? '#48BB78' : efficiency > 70 ? '#ED8936' : '#F56565';

    // 2. Imbalance
    const rAmp = dayRecord.R.amp?.avg || 0;
    const sAmp = dayRecord.S.amp?.avg || 0;
    const tAmp = dayRecord.T.amp?.avg || 0;
    const currents = [rAmp, sAmp, tAmp];
    const maxCurr = Math.max(...currents);
    const minCurr = Math.min(...currents);
    const avgCurr = currents.reduce((a, b) => a + b, 0) / 3;
    const imbalance = avgCurr > 0 ? ((maxCurr - minCurr) / avgCurr) * 100 : 0;
    const imbalanceColor = imbalance < 10 ? '#48BB78' : imbalance < 20 ? '#ED8936' : '#F56565';

    // 3. Deviation
    const volt = dayRecord.SUM.volt?.avg || 0;
    const nominal = 230;
    const deviation = Math.abs((volt - nominal) / nominal) * 100;
    const deviationColor = deviation < 3 ? '#48BB78' : deviation < 6 ? '#ED8936' : '#F56565';

    // 4. Reactive Waste
    const reactive = dayRecord.SUM.reactivePower?.avg || 0;
    const wasteRatio = apparent > 0 ? (Math.abs(reactive) / apparent) * 100 : 0;
    const wasteColor = wasteRatio < 15 ? '#48BB78' : wasteRatio < 30 ? '#ED8936' : '#F56565';

    const MetricProgressBarCard = ({ title, value, displayVal, statusText, color, desc }: any) => {
        return (
            <MyCard p={4} border="1px solid" borderColor={border} bg={colorMode === 'dark' ? 'whiteAlpha.50' : 'white'}>
                <VStack align="stretch" spacing={2}>
                    <Text fontSize="xx-small" fontWeight="700" opacity={0.6} textTransform="uppercase">
                        {title}
                    </Text>
                    <HStack justify="space-between" align="baseline" flexWrap="wrap">
                        <Text fontSize="lg" fontWeight="700">
                            {displayVal}
                        </Text>
                        <Badge colorScheme={color === '#48BB78' ? 'green' : color === '#ED8936' ? 'orange' : 'red'} variant="subtle" fontSize="9px">
                            {statusText}
                        </Badge>
                    </HStack>
                    <Box h="6px" w="100%" bg={colorMode === 'dark' ? 'whiteAlpha.100' : 'gray.100'} borderRadius="full" overflow="hidden">
                        <Box h="100%" w={`${Math.min(Math.max(value, 0), 100)}%`} bg={color} borderRadius="full" />
                    </Box>
                    <Text fontSize="10px" opacity={0.7} fontWeight="500">
                        {desc}
                    </Text>
                </VStack>
            </MyCard>
        );
    };

    return (
        <VStack align="stretch" spacing={3}>
            <Text fontSize="sm" fontWeight="700" mt={2}>System Audits & Efficiency Metrics</Text>
            <SimpleGrid columns={{ base: 1, sm: 2, xl: 4 }} spacing={4}>
                <MetricProgressBarCard
                    title="System Efficiency"
                    value={efficiency}
                    displayVal={`${efficiency.toFixed(1)}%`}
                    statusText={efficiency > 85 ? "Optimal" : efficiency > 70 ? "Acceptable" : "Poor"}
                    color={efficiencyColor}
                    desc="Ratio of active power (kW) to apparent power (kVA). Measures real work delivery efficiency."
                />
                <MetricProgressBarCard
                    title="Current Imbalance"
                    value={100 - imbalance * 3.33}
                    displayVal={`${imbalance.toFixed(1)}%`}
                    statusText={imbalance < 10 ? "Balanced" : imbalance < 20 ? "Mild Imbalance" : "Unbalanced"}
                    color={imbalanceColor}
                    desc="Current deviation between phases (L1, L2, L3). High imbalance increases system wear."
                />
                <MetricProgressBarCard
                    title="Voltage Deviation"
                    value={100 - deviation * 10}
                    displayVal={`±${deviation.toFixed(2)}%`}
                    statusText={deviation < 3 ? "Stable" : deviation < 6 ? "Moderate Dev" : "Unstable"}
                    color={deviationColor}
                    desc="Distortion from nominal 230V mains voltage. Higher values risk load degradation."
                />
                <MetricProgressBarCard
                    title="Reactive Power Load"
                    value={100 - wasteRatio}
                    displayVal={`${wasteRatio.toFixed(1)}%`}
                    statusText={wasteRatio < 15 ? "Low" : wasteRatio < 30 ? "Moderate" : "Excessive"}
                    color={wasteColor}
                    desc="Percentage of total capacity consumed as reactive power (kVAR). Passive loading overhead."
                />
            </SimpleGrid>
        </VStack>
    );
};

const PowerQualityTab = ({ data, isSingleDay }: PowerQualityTabProps) => {
    const { colorMode } = useColorMode();
    const border = `${colorMode}.border`;
    const [selectedDay, setSelectedDay] = useState<number>(0);

    const dayRecord = useMemo(() => {
        if (isSingleDay) return data.phase_values;
        return data.allDays[selectedDay]?.phase_values || null;
    }, [data, isSingleDay, selectedDay]);

    // Calculate THD Quality metrics for the currently selected/active day
    const thdQuality = useMemo(() => {
        if (!dayRecord?.R?.voltTHD || !dayRecord?.S?.voltTHD || !dayRecord?.T?.voltTHD || !dayRecord?.SUM?.voltTHD) return null;

        const sumVolt = dayRecord.SUM.voltTHD.avg;
        const rVolt = dayRecord.R.voltTHD.avg;
        const sVolt = dayRecord.S.voltTHD.avg;
        const tVolt = dayRecord.T.voltTHD.avg;

        const sumAmp = dayRecord.SUM.ampTHD.avg;
        const rAmp = dayRecord.R.ampTHD.avg;
        const sAmp = dayRecord.S.ampTHD.avg;
        const tAmp = dayRecord.T.ampTHD.avg;

        const avgVoltTHD = (sumVolt + rVolt + sVolt + tVolt) / 4;
        const avgAmpTHD = (sumAmp + rAmp + sAmp + tAmp) / 4;

        const isGood = avgVoltTHD < 5 && avgAmpTHD < 15;
        const isWarning = avgVoltTHD < 8 && avgAmpTHD < 30;

        const status = isGood ? "EXCELLENT" : isWarning ? "ACCEPTABLE" : "POOR";
        const colorScheme = isGood ? "green" : isWarning ? "orange" : "red";

        return { status, colorScheme, avgVoltTHD, avgAmpTHD };
    }, [dayRecord]);

    // Determine the worst performing phase based on combined THD
    const worstPhase = useMemo(() => {
        if (!dayRecord?.R?.voltTHD || !dayRecord?.S?.voltTHD || !dayRecord?.T?.voltTHD) return null;

        const rVolt = dayRecord.R.voltTHD.avg;
        const rAmp = dayRecord.R.ampTHD.avg;
        const sVolt = dayRecord.S.voltTHD.avg;
        const sAmp = dayRecord.S.ampTHD.avg;
        const tVolt = dayRecord.T.voltTHD.avg;
        const tAmp = dayRecord.T.ampTHD.avg;

        const phases = [
            { name: "L1 (R)", vthd: rVolt, ithd: rAmp },
            { name: "L2 (S)", vthd: sVolt, ithd: sAmp },
            { name: "L3 (T)", vthd: tVolt, ithd: tAmp },
        ];

        return phases.reduce((prev, curr) =>
            curr.vthd + curr.ithd > prev.vthd + prev.ithd ? curr : prev
        );
    }, [dayRecord]);

    const hourlyTHDData = useMemo(() => {
        const list: any[] = [];

        [...data.allHours]
            .filter((h) => h && h.from !== undefined)
            .sort((a, b) => a.from - b.from)
            .forEach((hour) => {
                const time = secToTime(hour.from);
                const phaseData = hour.phase_values?.SUM;
                if (!phaseData) return;

                if (phaseData.voltTHD) {
                    list.push({ time, value: phaseData.voltTHD.avg, category: "Voltage THD (%)" });
                }
                if (phaseData.ampTHD) {
                    list.push({ time, value: phaseData.ampTHD.avg, category: "Current THD (%)" });
                }
            });

        return list;
    }, [data.allHours]);

    const dailyTHDData = useMemo(() => {
        const list: any[] = [];

        [...data.allDays]
            .sort((a, b) => dayjs(a.date).unix() - dayjs(b.date).unix())
            .forEach((day) => {
                const label = dayjs(day.date).format("D MMM");
                const phaseData = day.phase_values?.SUM;
                if (!phaseData) return;

                if (phaseData.voltTHD) {
                    list.push({ date: label, value: phaseData.voltTHD.avg, category: "Avg Voltage THD" });
                    list.push({ date: label, value: phaseData.voltTHD.max, category: "Max Voltage THD" });
                }
                if (phaseData.ampTHD) {
                    list.push({ date: label, value: phaseData.ampTHD.avg, category: "Avg Current THD" });
                    list.push({ date: label, value: day.phase_values.SUM.ampTHD.max, category: "Max Current THD" });
                }
            });

        return list;
    }, [data.allDays]);

    const trendChartConfig = useMemo(() => {
        const cData = isSingleDay ? hourlyTHDData : dailyTHDData;
        const xF = isSingleDay ? "time" : "date";

        return {
            data: cData,
            xField: xF,
            yField: "value",
            seriesField: "category",
            smooth: true,
            animation: false,
            legend: { position: "bottom" as const },
            xAxis: { label: { autoRotate: true, autoHide: true } },
            point: { size: 3, shape: "circle" },
            lineStyle: { lineWidth: 2 },
            yAxis: {
                label: {
                    formatter: (v: string) => `${parseFloat(v).toFixed(1)}%`
                }
            },
            tooltip: {
                formatter: (datum: any) => ({
                    name: datum.category,
                    value: `${parseFloat(datum.value).toFixed(2)}%`
                })
            }
        };
    }, [isSingleDay, hourlyTHDData, dailyTHDData]);

    if (!dayRecord) {
        return (
            <Box p={5} textAlign="center">
                <Text opacity={0.7}>No harmonics telemetry recorded for this device.</Text>
            </Box>
        );
    }

    return (
        <Flex flexDir="column" gap={6}>
            {/* Power Quality Status Card */}
            <PowerQualityStatusCard
                thdQuality={thdQuality}
                worstPhase={worstPhase}
                border={border}
                colorMode={colorMode}
            />

            {/* System Audits & Efficiency Metrics */}
            <SystemMetricsVisualizer
                dayRecord={dayRecord}
                border={border}
                colorMode={colorMode}
            />

            {isSingleDay ? (
                <>
                    <PhaseSummaryTable
                        metrics={HARMONICS_METRICS}
                        phaseData={dayRecord}
                        title="Daily Harmonics Summary"
                    />

                    <MyCard border="1px solid" borderColor={border} p={4}>
                        <Flex justify="space-between" align="center" mb={4}>
                            <Text fontWeight="600" fontSize="sm">Hourly Harmonic Distortion Trend</Text>
                        </Flex>
                        <Divider mb={4} />
                        <Box h="280px" w="100%">
                            {trendChartConfig.data.length > 0 ? (
                                <Line {...trendChartConfig} />
                            ) : (
                                <Center h="100%">
                                    <Text opacity={0.6} fontSize="xs">No harmonics trend data available.</Text>
                                </Center>
                            )}
                        </Box>
                    </MyCard>

                    <HourlyBreakdownTable
                        allHours={data.allHours}
                        title="Hourly Harmonics Details"
                        metrics={HARMONICS_METRICS}
                    />
                </>
            ) : (
                <>
                    <MyCard border="1px solid" borderColor={border} p={4}>
                        <Flex justify="space-between" align="center" mb={4}>
                            <Text fontWeight="600" fontSize="sm">Daily Harmonics Trend</Text>
                        </Flex>
                        <Divider mb={4} />
                        <Box h="280px" w="100%">
                            {trendChartConfig.data.length > 0 ? (
                                <Line {...trendChartConfig} />
                            ) : (
                                <Center h="100%">
                                    <Text opacity={0.6} fontSize="xs">No trend data available.</Text>
                                </Center>
                            )}
                        </Box>
                    </MyCard>

                    <Flex align="center" gap={3} flexWrap="wrap">
                        <Text fontWeight="600" fontSize="sm">View Details for:</Text>
                        <Select
                            size="sm"
                            w={{ base: "100%", sm: "200px" }}
                            value={selectedDay}
                            onChange={(e) => setSelectedDay(Number(e.target.value))}
                            focusBorderColor="primary"
                        >
                            {data.allDays.map((day: any, idx: number) => (
                                <option key={idx} value={idx}>
                                    {dayjs(day.date).format("DD MMM, YYYY")}
                                </option>
                            ))}
                        </Select>
                    </Flex>

                    <PhaseSummaryTable
                        metrics={HARMONICS_METRICS}
                        phaseData={dayRecord}
                        title={`Harmonics Summary - ${dayjs(data.allDays[selectedDay]?.date).format("DD MMM, YYYY")}`}
                    />
                </>
            )}
        </Flex>
    );
};

export default PowerQualityTab;