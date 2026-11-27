import { Line, Area } from "@ant-design/plots";
import { Box, Text, Tabs, TabList, TabPanels, Tab, TabPanel, SimpleGrid, Badge, HStack, VStack, Code, useColorMode, CardHeader, CardBody, Icon } from "@chakra-ui/react";
import { WarningIcon } from "@chakra-ui/icons";
import { useMemo, useCallback } from "react";
import { dbSchemaHourlyRecord, dbSchemaRecord } from "../types";
import secondsToHourMin from "../../../../../Components/Functions/converters/secondsToHourMin";
import MyCard from "../../../../../Components/micro/Card";
import { MachineThresholds } from "../Alerts/types";

import Get from "../../../../../Components/Store/hooks/Get";
import { shiftsAtom } from "../../../../../Components/Store/atoms";

interface HourlyTrendChartProps {
    hourly: dbSchemaHourlyRecord;
    shiftStart?: number;
    thresholds?: MachineThresholds | null;
}

// Constants
const PHASE_COLORS_3 = ['#F56565', '#48BB78', '#4299E1'] as const; // R, S, T
const PHASE_COLORS_4 = ['#F56565', '#48BB78', '#4299E1', '#9F7AEA'] as const; // R, S, T, Total

const THEME_COLORS = {
    dark: {
        text: 'whiteAlpha.700',
        grid: '#32383e',
        axis: '#32383e',
        legend: '#E2E8F0',
    },
    light: {
        text: 'gray.600',
        grid: '#f0f0f0',
        axis: '#E2E8F0',
        legend: '#2d3748',
    },
} as const;

const HourlyTrendChart = ({ hourly, shiftStart, thresholds }: HourlyTrendChartProps) => {
    const { colorMode } = useColorMode();
    const storeShifts = Get(shiftsAtom);

    const effectiveShiftStart = useMemo(() => {
        if (typeof shiftStart === "number" && !isNaN(shiftStart) && shiftStart >= 0) {
            return shiftStart;
        }
        if (typeof storeShifts?.A === "number" && !isNaN(storeShifts.A) && storeShifts.A >= 0) {
            return storeShifts.A;
        }
        return 28800; // Default 08:00 AM (8 * 3600)
    }, [shiftStart, storeShifts]);

    const themeColors = useMemo(
        () => THEME_COLORS[colorMode as keyof typeof THEME_COLORS],
        [colorMode]
    );

    const { border } = useMemo(() => {
        return {
            border: `${colorMode}.border`,
        }
    }, [colorMode]);

    // Transform hourly data into chart format aligned with the 24-hour shift cycle
    const chartData = useMemo(() => {
        if (!hourly || Object.keys(hourly).length === 0) {
            return {
                voltageData: [],
                currentData: [],
                powerData: [],
                powerFactorData: [],
            };
        }

        const voltageData: any[] = [];
        const currentData: any[] = [];
        const powerData: any[] = [];
        const powerFactorData: any[] = [];

        // Helper to extract seconds since midnight from a timestamp or seconds value
        const getSecondsInDay = (fromVal: any): number | null => {
            if (typeof fromVal !== 'number' || isNaN(fromVal)) return null;
            if (fromVal > 1e11) {
                const d = new Date(fromVal);
                return d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds();
            }
            if (fromVal > 86400) {
                const d = new Date(fromVal * 1000);
                return d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds();
            }
            return Math.floor(fromVal) % 86400;
        };

        const getVal = (metric: any): number => {
            if (typeof metric === 'number') return metric;
            if (metric && typeof metric.avg === 'number') return metric.avg;
            if (metric && typeof metric.value === 'number') return metric.value;
            return 0;
        };

        // Prepare 24 chronological shift slots starting from effectiveShiftStart (e.g. 08:00 -> 07:00 next day)
        const slots: { slotIndex: number; time: string; hourData: dbSchemaRecord | null }[] = [];
        for (let i = 0; i < 24; i++) {
            const slotSec = effectiveShiftStart + i * 3600;
            const time = secondsToHourMin(slotSec);
            slots.push({ slotIndex: i, time, hourData: null });
        }

        const keys = Object.keys(hourly);
        const has24Key = keys.some(k => Number(k) === 24);

        // Map each hourly record to the correct shift slot
        Object.entries(hourly).forEach(([key, val]) => {
            const hourData = val as dbSchemaRecord;
            if (!hourData || typeof hourData !== 'object') return;

            let slotIndex: number | null = null;

            // 1. Match by hourData.from if available
            const fromSec = getSecondsInDay((hourData as any).from);
            if (fromSec !== null) {
                const shiftStartSec = Math.floor(effectiveShiftStart) % 86400;
                let diff = (fromSec - shiftStartSec) % 86400;
                if (diff < 0) diff += 86400;
                slotIndex = Math.floor(diff / 3600);
            } else {
                // 2. Fall back to numeric key analysis
                const numKey = Number(key);
                if (!isNaN(numKey)) {
                    if (numKey >= 1 && numKey <= 24 && has24Key) {
                        // 1-based shift hour index (1..24, where 1 is Shift A start)
                        slotIndex = numKey - 1;
                    } else if (numKey >= 0 && numKey < 24) {
                        // 0-based shift hour index (0..23)
                        slotIndex = numKey;
                    } else if (numKey > 24) {
                        // Timestamp key
                        const keySec = getSecondsInDay(numKey);
                        if (keySec !== null) {
                            const shiftStartSec = Math.floor(effectiveShiftStart) % 86400;
                            let diff = (keySec - shiftStartSec) % 86400;
                            if (diff < 0) diff += 86400;
                            slotIndex = Math.floor(diff / 3600);
                        }
                    }
                }
            }

            if (slotIndex !== null && slotIndex >= 0 && slotIndex < 24) {
                slots[slotIndex].hourData = hourData;
            }
        });

        // Populate datasets strictly in chronological shift order (slot 0 -> slot 23)
        slots.forEach((slot) => {
            if (!slot.hourData) return;
            const time = slot.time;
            const hourData = slot.hourData;

            // Voltage data
            if (hourData.R?.volt) {
                voltageData.push({ time, value: getVal(hourData.R.volt), phase: "L1 (R)" });
            }
            if (hourData.S?.volt) {
                voltageData.push({ time, value: getVal(hourData.S.volt), phase: "L2 (S)" });
            }
            if (hourData.T?.volt) {
                voltageData.push({ time, value: getVal(hourData.T.volt), phase: "L3 (T)" });
            }

            // Current data
            if (hourData.R?.amp) {
                currentData.push({ time, value: getVal(hourData.R.amp), phase: "L1 (R)" });
            }
            if (hourData.S?.amp) {
                currentData.push({ time, value: getVal(hourData.S.amp), phase: "L2 (S)" });
            }
            if (hourData.T?.amp) {
                currentData.push({ time, value: getVal(hourData.T.amp), phase: "L3 (T)" });
            }

            // Active Power data (converted to kW)
            if (hourData.R?.power) {
                powerData.push({ time, value: getVal(hourData.R.power) / 1000, phase: "L1 (R)" });
            }
            if (hourData.S?.power) {
                powerData.push({ time, value: getVal(hourData.S.power) / 1000, phase: "L2 (S)" });
            }
            if (hourData.T?.power) {
                powerData.push({ time, value: getVal(hourData.T.power) / 1000, phase: "L3 (T)" });
            }
            if (hourData.SUM?.power) {
                powerData.push({ time, value: getVal(hourData.SUM.power) / 1000, phase: "Total" });
            }

            // Power Factor data
            if (hourData.R?.powerFactor) {
                powerFactorData.push({ time, value: getVal(hourData.R.powerFactor), phase: "L1 (R)" });
            }
            if (hourData.S?.powerFactor) {
                powerFactorData.push({ time, value: getVal(hourData.S.powerFactor), phase: "L2 (S)" });
            }
            if (hourData.T?.powerFactor) {
                powerFactorData.push({ time, value: getVal(hourData.T.powerFactor), phase: "L3 (T)" });
            }
        });

        return { voltageData, currentData, powerData, powerFactorData };
    }, [hourly, effectiveShiftStart]);


    // Helper to create threshold annotations
    const createThresholdAnnotations = useCallback((parameterId: string, unit: string) => {
        if (!thresholds?.thresholds[parameterId] || !thresholds.thresholds[parameterId].enabled) {
            return [];
        }

        const config = thresholds.thresholds[parameterId];
        const annotations: any[] = [];

        // Add min threshold line (critical/warning zone below this)
        if (config.min !== undefined) {
            annotations.push({
                type: 'line',
                start: ['min', config.min],
                end: ['max', config.min],
                style: {
                    stroke: config.severity === 'critical' ? '#F56565' : '#ED8936',
                    lineWidth: 2,
                    lineDash: [4, 4],
                },
                text: {
                    content: `Min ${config.min}${unit}`,
                    position: 'end',
                    offsetY: -8,
                    style: {
                        fill: config.severity === 'critical' ? '#F56565' : '#ED8936',
                        fontSize: 11,
                        fontWeight: 600,
                    },
                },
            });

            // Add danger region below min
            annotations.push({
                type: 'region',
                start: ['min', 'min'],
                end: ['max', config.min],
                style: {
                    fill: config.severity === 'critical' ? '#F56565' : '#ED8936',
                    fillOpacity: 0.08,
                },
            });
        }

        // Add max threshold line (critical/warning zone above this)
        if (config.max !== undefined) {
            annotations.push({
                type: 'line',
                start: ['min', config.max],
                end: ['max', config.max],
                style: {
                    stroke: config.severity === 'critical' ? '#F56565' : '#ED8936',
                    lineWidth: 2,
                    lineDash: [4, 4],
                },
                text: {
                    content: `Max ${config.max}${unit}`,
                    position: 'end',
                    offsetY: 8,
                    style: {
                        fill: config.severity === 'critical' ? '#F56565' : '#ED8936',
                        fontSize: 11,
                        fontWeight: 600,
                    },
                },
            });

            // Add danger region above max
            annotations.push({
                type: 'region',
                start: ['min', config.max],
                end: ['max', 'max'],
                style: {
                    fill: config.severity === 'critical' ? '#F56565' : '#ED8936',
                    fillOpacity: 0.08,
                },
            });
        }

        return annotations;
    }, [thresholds]);

    // Memoize chart configs to prevent recreation on every parent re-render
    const lineConfigs = useMemo(() => {
        const makeLineConfig = (data: any[], yLabel: string, colors: readonly string[], decimals: number, annotations: any[] = []) => ({
            data,
            xField: 'time',
            yField: 'value',
            seriesField: 'phase',
            smooth: true,
            animation: false,
            color: [...colors],
            lineStyle: { lineWidth: 2 },
            point: { size: 3, shape: 'circle' },
            yAxis: {
                label: {
                    formatter: (v: string) => `${parseFloat(v).toFixed(decimals)} ${yLabel}`,
                    style: { fill: themeColors.text },
                },
                grid: { line: { style: { stroke: themeColors.grid, lineWidth: 1, lineDash: [3, 3] } } },
            },
            xAxis: {
                label: { style: { fill: themeColors.text } },
                line: { style: { stroke: themeColors.axis } },
                range: [0, 1],
            },
            meta: {
                time: {
                    range: [0, 1],
                },
            },
            tooltip: {
                shared: true,
                showCrosshairs: true,
                crosshairs: { type: 'xy' as const, line: { style: { stroke: '#1890ff', lineWidth: 1 } } },
                formatter: (datum: any) => ({ name: datum.phase, value: `${datum.value.toFixed(decimals)} ${yLabel}` }),
            },
            legend: {
                position: 'bottom' as const,
                itemName: { style: { fill: themeColors.legend } },
            }, annotations,
        });

        const makeAreaConfig = (data: any[], yLabel: string, colors: readonly string[], decimals: number, annotations: any[] = []) => ({
            data,
            xField: 'time',
            yField: 'value',
            seriesField: 'phase',
            smooth: true,
            animation: false,
            color: [...colors],
            areaStyle: { fillOpacity: 0.2 },
            line: { size: 2 },
            point: { size: 3, shape: 'circle' },
            yAxis: {
                label: {
                    formatter: (v: string) => `${parseFloat(v).toFixed(decimals)} ${yLabel}`,
                    style: { fill: themeColors.text },
                },
                grid: { line: { style: { stroke: themeColors.grid, lineWidth: 1, lineDash: [3, 3] } } },
            },
            xAxis: {
                label: { style: { fill: themeColors.text } },
                line: { style: { stroke: themeColors.axis } },
                range: [0, 1],
            },
            meta: {
                time: {
                    range: [0, 1],
                },
            },
            tooltip: {
                shared: true,
                showCrosshairs: true,
                crosshairs: { type: 'xy' as const },
                formatter: (datum: any) => ({ name: datum.phase, value: `${datum.value.toFixed(decimals)} ${yLabel}` }),
            },
            legend: {
                position: 'bottom' as const,
                itemName: { style: { fill: themeColors.legend } },
            },
            annotations,
        });

        // Get threshold annotations for each metric
        const voltageAnnotations = createThresholdAnnotations('voltage_ln_SUM', 'V');
        const currentAnnotations = createThresholdAnnotations('current_R', 'A');
        const powerAnnotations = createThresholdAnnotations('power_R', 'kW');
        const pfAnnotations = createThresholdAnnotations('pf_SUM', '');

        return {
            voltage: makeLineConfig(chartData.voltageData, "V", PHASE_COLORS_3, 1, voltageAnnotations),
            current: makeLineConfig(chartData.currentData, "A", PHASE_COLORS_3, 3, currentAnnotations),
            power: makeAreaConfig(chartData.powerData, "kW", PHASE_COLORS_4, 3, powerAnnotations),
            powerFactor: makeLineConfig(chartData.powerFactorData, "", PHASE_COLORS_3, 2, pfAnnotations),
        };
    }, [chartData, themeColors, createThresholdAnnotations]);

    // Calculate statistics
    const statistics = useMemo(() => {
        const calcStats = (data: any[]) => {
            if (!data.length) return { max: 0, min: 0, avg: 0 };
            const values = data.map(d => d.value);
            return {
                max: Math.max(...values),
                min: Math.min(...values),
                avg: values.reduce((a, b) => a + b, 0) / values.length,
            };
        };

        return {
            voltage: calcStats(chartData.voltageData),
            current: calcStats(chartData.currentData),
            power: calcStats(chartData.powerData),
            powerFactor: calcStats(chartData.powerFactorData),
        };
    }, [chartData]);

    return (
        <MyCard noPadding>
            <CardHeader
                px={5}
                py={4}
                borderBottom="1px dashed"
                borderColor={border}>
                <HStack justify="space-between">
                    <Text fontSize="md" fontWeight={500}>
                        Hourly Load Trend Analysis
                    </Text>
                    {thresholds && (
                        <HStack spacing={2}>
                            <Icon as={WarningIcon} color="orange.500" boxSize={3} />
                            <Text fontSize="xs" color="orange.500" fontWeight={600}>
                                Alert Thresholds Active
                            </Text>
                        </HStack>
                    )}
                </HStack>
            </CardHeader>
            <CardBody p={5}>
                {chartData.voltageData.length === 0 && chartData.currentData.length === 0 && chartData.powerData.length === 0 ? (
                    <VStack py={8} spacing={4}>
                        <Text fontSize="lg" opacity={0.7}>No hourly data available</Text>
                        <Code colorScheme="orange" p={3}>
                            Found {Object.keys(hourly || {}).length} keys in hourly data.
                            {Object.keys(hourly || {}).length > 0 && ` First key: ${Object.keys(hourly || {})[0]}`}
                        </Code>
                    </VStack>
                ) : (
                    <Tabs variant="enclosed" colorScheme="orange" size="sm">
                        <TabList>
                            <Tab>Voltage</Tab>
                            <Tab>Current</Tab>
                            <Tab>Active Power</Tab>
                            <Tab>Power Factor</Tab>
                        </TabList>

                        <TabPanels>
                            <TabPanel>
                                <HStack justify="space-between" mb={3}>
                                    <SimpleGrid columns={3} spacing={4}>
                                        <Box>
                                            <Text fontSize="xs" opacity={0.7} textTransform="uppercase" letterSpacing="wide">Max</Text>
                                            <Badge colorScheme="orange" fontSize="md">{statistics.voltage.max.toFixed(1)} V</Badge>
                                        </Box>
                                        <Box>
                                            <Text fontSize="xs" opacity={0.7} textTransform="uppercase" letterSpacing="wide">Avg</Text>
                                            <Badge colorScheme="orange" fontSize="md" variant="outline">{statistics.voltage.avg.toFixed(1)} V</Badge>
                                        </Box>
                                        <Box>
                                            <Text fontSize="xs" opacity={0.7} textTransform="uppercase" letterSpacing="wide">Min</Text>
                                            <Badge colorScheme="orange" fontSize="md" variant="subtle">{statistics.voltage.min.toFixed(1)} V</Badge>
                                        </Box>
                                    </SimpleGrid>
                                </HStack>
                                <Line
                                    {...lineConfigs.voltage}
                                    height={350}
                                />
                            </TabPanel>

                            <TabPanel>
                                <HStack justify="space-between" mb={3}>
                                    <SimpleGrid columns={3} spacing={4}>
                                        <Box>
                                            <Text fontSize="xs" opacity={0.7} textTransform="uppercase" letterSpacing="wide">Max</Text>
                                            <Badge colorScheme="orange" fontSize="md">{statistics.current.max.toFixed(3)} A</Badge>
                                        </Box>
                                        <Box>
                                            <Text fontSize="xs" opacity={0.7} textTransform="uppercase" letterSpacing="wide">Avg</Text>
                                            <Badge colorScheme="orange" fontSize="md" variant="outline">{statistics.current.avg.toFixed(3)} A</Badge>
                                        </Box>
                                        <Box>
                                            <Text fontSize="xs" opacity={0.7} textTransform="uppercase" letterSpacing="wide">Min</Text>
                                            <Badge colorScheme="orange" fontSize="md" variant="subtle">{statistics.current.min.toFixed(3)} A</Badge>
                                        </Box>
                                    </SimpleGrid>
                                </HStack>
                                <Line
                                    {...lineConfigs.current}
                                    height={350}
                                />
                            </TabPanel>

                            <TabPanel>
                                <HStack justify="space-between" mb={3}>
                                    <SimpleGrid columns={3} spacing={4}>
                                        <Box>
                                            <Text fontSize="xs" opacity={0.7} textTransform="uppercase" letterSpacing="wide">Max</Text>
                                            <Badge colorScheme="orange" fontSize="md">{statistics.power.max.toFixed(3)} W</Badge>
                                        </Box>
                                        <Box>
                                            <Text fontSize="xs" opacity={0.7} textTransform="uppercase" letterSpacing="wide">Avg</Text>
                                            <Badge colorScheme="orange" fontSize="md" variant="outline">{statistics.power.avg.toFixed(3)} W</Badge>
                                        </Box>
                                        <Box>
                                            <Text fontSize="xs" opacity={0.7} textTransform="uppercase" letterSpacing="wide">Min</Text>
                                            <Badge colorScheme="orange" fontSize="md" variant="subtle">{statistics.power.min.toFixed(3)} W</Badge>
                                        </Box>
                                    </SimpleGrid>
                                </HStack>
                                <Area
                                    {...lineConfigs.power}
                                    height={350}
                                />
                            </TabPanel>

                            <TabPanel>
                                <HStack justify="space-between" mb={3}>
                                    <SimpleGrid columns={3} spacing={4}>
                                        <Box>
                                            <Text fontSize="xs" opacity={0.7} textTransform="uppercase" letterSpacing="wide">Max</Text>
                                            <Badge colorScheme="orange" fontSize="md">{statistics.powerFactor.max.toFixed(2)}</Badge>
                                        </Box>
                                        <Box>
                                            <Text fontSize="xs" opacity={0.7} textTransform="uppercase" letterSpacing="wide">Avg</Text>
                                            <Badge colorScheme="orange" fontSize="md" variant="outline">{statistics.powerFactor.avg.toFixed(2)}</Badge>
                                        </Box>
                                        <Box>
                                            <Text fontSize="xs" opacity={0.7} textTransform="uppercase" letterSpacing="wide">Min</Text>
                                            <Badge colorScheme="orange" fontSize="md" variant="subtle">{statistics.powerFactor.min.toFixed(2)}</Badge>
                                        </Box>
                                    </SimpleGrid>
                                </HStack>
                                <Line
                                    {...lineConfigs.powerFactor}
                                    height={350}
                                />
                            </TabPanel>
                        </TabPanels>
                    </Tabs>
                )}
            </CardBody>
        </MyCard>
    );
};

export default HourlyTrendChart;
