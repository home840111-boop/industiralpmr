import { Gauge, Liquid, Bullet, RadialBar, Line, Bar } from "@ant-design/plots";
import {
    Box,
    SimpleGrid,
    Text,
    HStack,
    Badge,
    useColorMode,
    CardHeader,
    CardBody,
    VStack,
    Icon,
    Grid,
    GridItem,
    Flex,
    Button,
    useDisclosure,
    AlertDialog,
    AlertDialogOverlay,
    AlertDialogContent,
    AlertDialogHeader,
    AlertDialogBody,
    AlertDialogFooter,
    Select,
} from "@chakra-ui/react";
import { InfoOutlineIcon } from "@chakra-ui/icons";
import React, { useMemo, useState, useEffect, useRef } from "react";
import { dbSchemaNow, dbSchemaRecord, AccumulatorsData } from "../types";
import dayjs from "../../../../../Components/Functions/dayjs";
import MyCard from "../../../../../Components/micro/Card";
import MyTooltip from "../../../../../Components/micro/MyTooltip";
import { PrimaryInput } from "../../../../../Components/Inputs";
import { MdTrendingUp, MdTrendingDown, MdRestartAlt } from "react-icons/md";
import { FiAlertTriangle, FiAlertOctagon } from "react-icons/fi";
import NumberFormatter from "../../../../../Components/micro/NumberFormatter";
// Performance-optimized helper utilities (extracted to prevent recreation on every render)
import { generateSineWaveData, generatePowerFactorWaves } from "./utils/voltageHelpers";
import { calculateTHDQuality, findWorstPhase } from "./utils/thdHelpers";
import { calculateAllMetrics } from "./utils/metricsCalculators";
// Memoized sub-components for better render performance
import { VoltTHDBar, AmpTHDBar } from "./components/THDBars";
import { MetricBar } from "./components/MetricBar";
import { MeterBox, getCurrentColor } from "./components/MeterBox";
import { TbCircuitCapacitor, TbCircuitInductor } from "react-icons/tb";

interface RealTimeGaugesProps {
    now: dbSchemaNow;
    daily: dbSchemaRecord | null;
    selectedDate: string;
    updated: number;
    isOnline: boolean | "RESTORING";
    optionLabels?: {
        X1: string;
        X2: string;
        X3: string;
    };
    accumulators?: AccumulatorsData | null;
    onChangeResetEvery?: (payload: { resetEveryDays?: number; lastReset?: string }) => Promise<void> | void;
    onResetAccumulators?: () => Promise<void> | void;
    onChangeExpectedCycleTime?: (expected: number) => Promise<void> | void;
    periodInfo?: { label: string; hoverLabel: string } | null;
    inputsConfig?: any;
    dailyTotal?: any;
    cycleTimeStats?: any;
    currentMoldName?: string;
    availableMolds?: string[];
    onSelectMold?: (mold: string) => void;
}

const getPfDirectionLabel = (value: number): string => {
    if (Math.abs(value) >= 0.99) return "";
    return value > 0 ? "Inductive" : "Capacitive";
};

const getPfDirectionIcon = (value: number) => (value > 0 ? TbCircuitInductor : TbCircuitCapacitor);

const getOptionStateColor = (state: 0 | 1) => (state === 1 ? "green" : "gray");
const getOptionStateLabel = (state: 0 | 1) => (state === 1 ? "ON" : "OFF");

const formatMetricValue = (value: number | undefined, decimals: number = 2) => {
    if (typeof value !== "number" || Number.isNaN(value)) return "--";
    return value.toFixed(decimals);
};

// Stacked metric row (label + value on top, progress bar, Avg/Max below).
// Works at any card width, including ~200px phone-in-narrow-window layouts.
const PowerMetricRow = ({
    color,
    label,
    valueText,
    ratioPct,
    avgText,
    maxText,
    trackBg,
}: {
    color: string;
    label: string;
    valueText: string;
    ratioPct: number;
    avgText: string;
    maxText: string;
    trackBg: string;
}) => (
    <Box w="100%" minW={0} fontSize="xs">
        <Flex justify="space-between" align="baseline" columnGap={2} flexWrap="wrap">
            <HStack spacing={1}>
                <Box w={2} h={2} borderRadius="full" bg={color} flexShrink={0} />
                <Text opacity={0.7}>{label}:</Text>
            </HStack>
            <Text fontWeight={600}>{valueText}</Text>
        </Flex>
        <Box mt={1} h="4px" bg={trackBg} borderRadius="full" overflow="hidden">
            <Box w={`${ratioPct}%`} h="100%" bg={color} borderRadius="full" transition="width 0.3s ease" />
        </Box>
        <Flex justify="space-between" mt={1} columnGap={3} flexWrap="wrap" fontSize="2xs" opacity={0.75}>
            <Text>Avg {avgText}</Text>
            <Text>Max {maxText}</Text>
        </Flex>
    </Box>
);

const PeriodInfoContext = React.createContext<{ label: string; hoverLabel: string } | null | undefined>(null);

const MinAvgMaxInline = ({
    nowValue: _nowValue,
    minmax,
    decimals = 2,
    unit = "",
    hideMin = false,
    isPF = false,
}: {
    nowValue: number;
    minmax?: any;
    decimals?: number;
    unit?: string;
    hideMin?: boolean;
    isPF?: boolean;
}) => {
    const periodInfo = React.useContext(PeriodInfoContext);
    const containerRef = React.useRef<HTMLDivElement>(null);
    const [width, setWidth] = React.useState(0);

    React.useEffect(() => {
        if (!containerRef.current) return;
        const observer = new ResizeObserver((entries) => {
            if (entries[0]) {
                setWidth(entries[0].contentRect.width);
            }
        });
        observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, []);

    const isNarrow = width > 0 && width < 290;
    // Below ~230px the badges can't sit side by side, so stack them full-width
    const isTiny = width > 0 && width < 230;
    let badgesContent: React.ReactNode;

    if (isPF) {
        const leadText = formatMetricValue(minmax?.lead_min !== undefined ? Math.abs(minmax.lead_min) : undefined, decimals);
        const lagText = formatMetricValue(minmax?.lag_min !== undefined ? Math.abs(minmax.lag_min) : undefined, decimals);
        const avgVal = minmax?.avg;
        let avgText = formatMetricValue(avgVal !== undefined ? Math.abs(avgVal) : undefined, decimals);
        if (avgVal !== undefined && !Number.isNaN(avgVal)) {
            avgText += avgVal >= 0 ? " (IND)" : " (CAP)";
        }

        const getPFBadgeColorScheme = (val: number | undefined) => {
            if (val === undefined || val === null || Number.isNaN(val)) return "gray";
            const absVal = Math.abs(val);
            if (absVal >= 0.90) return "green";
            if (absVal >= 0.75) return "orange";
            return "red";
        };

        if (isTiny) {
            badgesContent = (
                <VStack spacing={1} border="1px dashed" borderColor="whiteAlpha.300" borderRadius="md" p={2} align="stretch" cursor={periodInfo ? "help" : "default"}>
                    <Badge w="100%" textAlign="center" variant="subtle" colorScheme={getPFBadgeColorScheme(minmax?.lead_min)} whiteSpace="normal" fontSize="2xs">
                        CAP Min {leadText}
                    </Badge>
                    <Badge w="100%" textAlign="center" variant="subtle" colorScheme={getPFBadgeColorScheme(minmax?.lag_min)} whiteSpace="normal" fontSize="2xs">
                        IND Min {lagText}
                    </Badge>
                    <Badge w="100%" textAlign="center" variant="subtle" colorScheme={getPFBadgeColorScheme(avgVal)} whiteSpace="normal" fontSize="2xs">
                        Avg {avgText}
                    </Badge>
                </VStack>
            );
        } else if (isNarrow) {
            badgesContent = (
                <VStack spacing={1.5} border="1px dashed" borderColor="whiteAlpha.300" borderRadius="md" p={2} align="stretch" cursor={periodInfo ? "help" : "default"}>
                    <Flex gap={1.5} fontSize="2xs">
                        <Badge flex="1" textAlign="center" variant="subtle" colorScheme={getPFBadgeColorScheme(minmax?.lead_min)} whiteSpace="nowrap">
                            CAP Min {leadText}
                        </Badge>
                        <Badge flex="1" textAlign="center" variant="subtle" colorScheme={getPFBadgeColorScheme(minmax?.lag_min)} whiteSpace="nowrap">
                            IND Min {lagText}
                        </Badge>
                    </Flex>
                    <Badge w="100%" textAlign="center" variant="subtle" colorScheme={getPFBadgeColorScheme(avgVal)} whiteSpace="nowrap" fontSize="2xs">
                        Avg {avgText}
                    </Badge>
                </VStack>
            );
        } else {
            badgesContent = (
                <VStack spacing={1} border="1px dashed" borderColor="whiteAlpha.300" borderRadius="md" p={2} align="stretch" cursor={periodInfo ? "help" : "default"}>
                    <Flex gap={1.5} fontSize="2xs" justify="center">
                        <Badge flex="1 1 auto" minW="85px" textAlign="center" variant="subtle" colorScheme={getPFBadgeColorScheme(minmax?.lead_min)} whiteSpace="nowrap">
                            CAP Min {leadText}
                        </Badge>
                        <Badge flex="1 1 auto" minW="85px" textAlign="center" variant="subtle" colorScheme={getPFBadgeColorScheme(avgVal)} whiteSpace="nowrap">
                            Avg {avgText}
                        </Badge>
                        <Badge flex="1 1 auto" minW="85px" textAlign="center" variant="subtle" colorScheme={getPFBadgeColorScheme(minmax?.lag_min)} whiteSpace="nowrap">
                            IND Min {lagText}
                        </Badge>
                    </Flex>
                </VStack>
            );
        }
    } else {
        const avgValue = formatMetricValue(minmax?.avg, decimals);
        const minText = hideMin ? "--" : formatMetricValue(minmax?.min, decimals);
        const maxText = formatMetricValue(minmax?.max, decimals);

        if (isNarrow) {
            badgesContent = (
                <VStack spacing={1} border="1px dashed" borderColor="whiteAlpha.300" borderRadius="md" p={2} align="stretch" cursor={periodInfo ? "help" : "default"}>
                    {periodInfo && (
                        <Text fontSize="2xs" opacity={0.5} textTransform="uppercase" letterSpacing="wider" fontWeight="semibold" textAlign="center">
                            {isPF ? "Min/Avg" : "Min / Max / Avg"} · {periodInfo.label}
                        </Text>
                    )}
                    <Flex gap={1.5}>
                        <VStack flex="1" spacing={0} align="center">
                            <Text fontSize="2xs" opacity={0.5} fontWeight="medium">{hideMin ? "—" : "MIN"}</Text>
                            <Text fontSize="xs" fontWeight="bold">{minText}</Text>
                        </VStack>
                        <VStack flex="1" spacing={0} align="center">
                            <Text fontSize="2xs" opacity={0.5} fontWeight="medium">MAX</Text>
                            <Text fontSize="xs" fontWeight="bold">{maxText}</Text>
                        </VStack>
                    </Flex>
                    <VStack spacing={0} align="center">
                        <Text fontSize="2xs" opacity={0.5} fontWeight="medium">AVG</Text>
                        <Text fontSize="xs" fontWeight="bold">{avgValue}</Text>
                    </VStack>
                </VStack>
            );
        } else {
            badgesContent = (
                <VStack spacing={1} border="1px dashed" borderColor="whiteAlpha.300" borderRadius="md" p={2} align="stretch" cursor={periodInfo ? "help" : "default"}>
                    {periodInfo && (
                        <Text fontSize="2xs" opacity={0.5} textTransform="uppercase" letterSpacing="wider" fontWeight="semibold" textAlign="center">
                            {isPF ? "Min / Avg" : "Min / Max / Avg"} · {periodInfo.label}
                        </Text>
                    )}
                    <Flex gap={2} justify="center">
                        <VStack spacing={0} align="center" flex="1">
                            <Text fontSize="2xs" opacity={0.5} fontWeight="medium">{hideMin ? "—" : "MIN"}</Text>
                            <Text fontSize="xs" fontWeight="bold">{minText}</Text>
                        </VStack>
                        <VStack spacing={0} align="center" flex="1">
                            <Text fontSize="2xs" opacity={0.5} fontWeight="medium">AVG</Text>
                            <Text fontSize="xs" fontWeight="bold">{avgValue}</Text>
                        </VStack>
                        <VStack spacing={0} align="center" flex="1">
                            <Text fontSize="2xs" opacity={0.5} fontWeight="medium">MAX</Text>
                            <Text fontSize="xs" fontWeight="bold">{maxText}</Text>
                        </VStack>
                    </Flex>
                </VStack>
            );
        }
    }

    const content = periodInfo ? (
        <MyTooltip label={isPF ? `Min/Avg values accumulated over the ${periodInfo.hoverLabel}` : `Min/Max/Avg values accumulated over the ${periodInfo.hoverLabel}`}>
            {badgesContent}
        </MyTooltip>
    ) : (
        badgesContent
    );

    return (
        <Box ref={containerRef} w="100%" minW={0}>
            {content}
        </Box>
    );
};

const RealTimeGauges = ({
    now,
    daily,
    selectedDate,
    updated,
    isOnline,
    optionLabels,
    accumulators,
    onChangeResetEvery,
    onResetAccumulators,
    onChangeExpectedCycleTime,
    periodInfo,
    inputsConfig,
    dailyTotal,
    cycleTimeStats,
    currentMoldName,
    availableMolds,
    onSelectMold,
}: RealTimeGaugesProps) => {
    const { colorMode } = useColorMode();
    const { isOpen: isResetOpen, onOpen: onOpenReset, onClose: onCloseReset } = useDisclosure();
    const cancelRef = useRef<HTMLButtonElement>(null);
    const [confirmText, setConfirmText] = useState("");
    const [isResetting, setIsResetting] = useState(false);
    const hideNowValues = isOnline === false;

    const expectedVal = accumulators?.expected_cycle_time !== undefined ? accumulators.expected_cycle_time : 15.0;
    const [expectedInput, setExpectedInput] = useState(expectedVal.toString());
    const [isEditingExpected, setIsEditingExpected] = useState(false);

    useEffect(() => {
        setExpectedInput(expectedVal.toString());
    }, [expectedVal]);

    const handleSaveExpected = () => {
        const val = parseFloat(expectedInput);
        if (!isNaN(val) && val > 0) {
            onChangeExpectedCycleTime?.(val);
        }
        setIsEditingExpected(false);
    };

    // Cycle Time Metrics
    const productionPin = typeof inputsConfig?.production === "string" ? inputsConfig.production : "X1";

    const lastShotKey = `${productionPin}_last_shot` as keyof typeof now.rawTelemetry;
    const lastShot = now.rawTelemetry?.[lastShotKey];
    
    // Calculate current cycle time (seconds) purely from packet data
    const CURRENT_CYCLE_MAX_SEC = 300; // 5 minutes — beyond this treat as idle/stale
    const rawCurrentCycleSec = lastShot ? Math.max(0, Math.floor(now.updated - lastShot)) : 0;
    const currentCycleSec = rawCurrentCycleSec > CURRENT_CYCLE_MAX_SEC ? 0 : rawCurrentCycleSec;

    // Last cycle time (seconds)
    const lastCycleKey = `${productionPin}_cycle_time` as keyof typeof now.rawTelemetry;
    const lastCycleSec = now.rawTelemetry?.[lastCycleKey] !== undefined ? now.rawTelemetry[lastCycleKey] : 0;

    // Daily average cycle time (seconds) from molds cycletime stats path, falling back to overall daily totals
    const dailyShots = dailyTotal?.shots || 0;
    const dailyOntime = dailyTotal?.ontime || 0;
    const fallbackAverage = dailyShots > 0 ? (dailyOntime / dailyShots) : 0;
    const averageCycleSec = (cycleTimeStats?.count > 0) ? (cycleTimeStats.total / cycleTimeStats.count) : fallbackAverage;

    // Last few (10) shots normalization and metrics
    const rawLast10 = cycleTimeStats?.last_10;
    const lastFewArray: number[] = useMemo(() => {
        if (!rawLast10) return [];
        const arr = Array.isArray(rawLast10)
            ? rawLast10
            : (typeof rawLast10 === "object" ? Object.values(rawLast10) : []);
        return arr
            .map((item: any) => {
                if (typeof item === "number") return item;
                if (item && typeof item === "object" && typeof item.value === "number") return item.value;
                if (typeof item === "string" && !isNaN(Number(item))) return Number(item);
                return 0;
            })
            .filter((val: number) => typeof val === "number" && !isNaN(val) && val > 0);
    }, [rawLast10]);

    const lastFewAvg = lastFewArray.length > 0
        ? (lastFewArray.reduce((sum: number, val: number) => sum + val, 0) / lastFewArray.length)
        : 0;
    const lastFewMin = lastFewArray.length > 0 ? Math.min(...lastFewArray) : 0;
    const lastFewMax = lastFewArray.length > 0 ? Math.max(...lastFewArray) : 0;

    const maxVal = Math.max(expectedVal, averageCycleSec, lastCycleSec, currentCycleSec, lastFewAvg, 10);

    // CSS overlay threshold line — measure chart container to calculate exact pixel position
    const cycleChartContainerRef = useRef<HTMLDivElement>(null);
    const [cycleChartWidth, setCycleChartWidth] = useState(0);
    useEffect(() => {
        const el = cycleChartContainerRef.current;
        if (!el) return;
        const ro = new ResizeObserver(entries => {
            for (const entry of entries) setCycleChartWidth(entry.contentRect.width);
        });
        ro.observe(el);
        return () => ro.disconnect();
    }, []);
    // Below this container width the AntV bar chart has no room for its axis labels,
    // so a lightweight CSS bar list is rendered instead.
    const isCompactCycleChart = cycleChartWidth > 0 && cycleChartWidth < 300;
    // These must match the `padding` prop on the Bar chart below
    const CHART_PAD_LEFT = 90;
    const CHART_PAD_RIGHT = 60;
    const plotWidth = Math.max(0, cycleChartWidth - CHART_PAD_LEFT - CHART_PAD_RIGHT);
    // Round up to nearest 5 to match chart's auto nice-scale (e.g. 17.3 → 20)
    const chartMax = Math.ceil(maxVal / 5) * 5;
    const thresholdLineLeft = plotWidth > 0 ? CHART_PAD_LEFT + (expectedVal / chartMax) * plotWidth : -1;

    const chartData = [
        { type: "Expected", value: expectedVal },
        { type: "Current", value: currentCycleSec },
        { type: "Last Shot", value: lastCycleSec },
        { type: "Last 10 Avg", value: lastFewAvg },
        { type: "Today's Avg", value: averageCycleSec },
    ];

    // Pre-compute colors per bar — callback form is unreliable with seriesField
    const chartColors = chartData.map(({ type, value }) => {
        if (type === "Expected") return "#DD6B20";          // Darker orange baseline
        if (value > expectedVal) return "#E53E3E";          // Red when exceeding expected
        return "#ED8936";                                   // Normal orange
    });

    const counterOrDefault = (value?: number) => {
        if (typeof value === "number" && Number.isFinite(value)) return value;
        return 0;
    };

    const cumulativeKWh = useMemo(() => {
        const wh = counterOrDefault(accumulators?.SUM_WH_Total);
        return wh / 1000;
    }, [accumulators]);

    const cumulativeKVAh = useMemo(() => {
        const vah = counterOrDefault(accumulators?.SUM_VAH);
        return vah / 1000;
    }, [accumulators]);

    const cumulativeKVARh = useMemo(() => {
        const varh = counterOrDefault(accumulators?.SUM_VarH_Total);
        return varh / 1000;
    }, [accumulators]);

    const handleOpenReset = () => {
        setConfirmText("");
        onOpenReset();
    };

    const handleCloseReset = () => {
        if (isResetting) return;
        setConfirmText("");
        onCloseReset();
    };

    const handleConfirmReset = async () => {
        if (confirmText.trim().toUpperCase() !== "RESET" || !onResetAccumulators) return;
        setIsResetting(true);
        try {
            await onResetAccumulators();
            handleCloseReset();
        } finally {
            setIsResetting(false);
        }
    };
    const formatNowText = (value: number, decimals: number, unit?: string) => {
        if (hideNowValues) return "--";
        const txt = Number.isFinite(value) ? value.toFixed(decimals) : "--";
        return unit ? `${txt} ${unit}` : txt;
    };
    const { border } = useMemo(() => {
        return {
            border: `${colorMode}.border`,
        }
    }, [colorMode]);

    // Calculate max values dynamically - must be before early return
    const maxVoltage = 450;
    const maxCurrent = useMemo(() => {
        if (!now?.R || !now?.S || !now?.T) return 100 * 1.2;
        return Math.max(now.R.amp, now.S.amp, now.T.amp, 100) * 1.2;
    }, [now.R, now.S, now.T]);
    const maxPower = useMemo(() => {
        if (!now?.R || !now?.S || !now?.T) return (50 / 1000) * 1.2;
        return Math.max(now.R.power / 1000, now.S.power / 1000, now.T.power / 1000, 50 / 1000) * 1.2;
    }, [now.R, now.S, now.T]);
    const maxApparentPower = useMemo(() => {
        if (!now?.R || !now?.S || !now?.T) return (50 / 1000) * 1.2;
        return Math.max(now.R.apparentPower / 1000, now.S.apparentPower / 1000, now.T.apparentPower / 1000, 50 / 1000) * 1.2;
    }, [now.R, now.S, now.T]);
    const maxReactivePower = useMemo(() => {
        if (!now?.R || !now?.S || !now?.T) return (50 / 1000) * 1.2;
        return Math.max(Math.abs(now.R.reactivePower) / 1000, Math.abs(now.S.reactivePower) / 1000, Math.abs(now.T.reactivePower) / 1000, 50 / 1000) * 1.2;
    }, [now.R, now.S, now.T]);


    // Special voltage color mapping: 200-250 green, <200 red, >250 orange->red
    const getVoltageColors = (value: number): string[] => {
        if (value >= 200 && value <= 250) {
            return ['#48BB78', '#48BB78', '#48BB78']; // All green
        } else if (value < 200) {
            return ['#F56565', '#F56565', '#F56565']; // All red
        } else if (value > 250 && value <= 300) {
            return ['#ED8936', '#ED8936', '#ED8936']; // Orange
        } else {
            return ['#F56565', '#F56565', '#F56565']; // Red for extreme high
        }
    };

    // Line-to-Line voltage color mapping: 380-440 green, <380 red, >440 orange->red
    const getLineVoltageColors = (value: number): string[] => {
        if (value >= 380 && value <= 440) {
            return ['#48BB78', '#48BB78', '#48BB78']; // All green
        } else if (value < 380) {
            return ['#F56565', '#F56565', '#F56565']; // All red
        } else if (value > 440 && value <= 500) {
            return ['#ED8936', '#ED8936', '#ED8936']; // Orange
        } else {
            return ['#F56565', '#F56565', '#F56565']; // Red for extreme high
        }
    };

    // Memoize all gauge configs to prevent chart flickering on every 3s tick
    // Must be before the early return to satisfy the Rules of Hooks
    const gaugeConfigs = useMemo(() => {
        // Color gradients for different metrics - using primary orange theme
        const currentColors = ['#4299E1', '#48BB78', '#ED8936', '#F56565'];
        const powerColors = ['#9F7AEA', '#4299E1', '#ED8936', '#F6AD55'];
        const vaColors = ['#4299E1', '#48BB78', '#ED8936', '#F6AD55'];
        const varColors = ['#9F7AEA', '#4299E1', '#ED8936', '#F56565'];
        const voltTHDColors = ['#48BB78', '#48BB78', '#ED8936', '#F56565']; // Green < 5%, Orange 5-10%, Red > 10%
        const ampTHDColors = ['#48BB78', '#48BB78', '#ED8936', '#F56565']; // Green < 15%, Orange 15-30%, Red > 30%

        const makeConfig = (value: number, max: number, title: string, unit: string, color: string[], decimals: number) => ({
            percent: value / max,
            range: { color },
            animation: false,
            indicator: {
                pointer: { style: { stroke: colorMode === 'dark' ? '#E2E8F0' : '#2c3034' } },
                pin: { style: { stroke: colorMode === 'dark' ? '#E2E8F0' : '#2c3034' } },
            },
            axis: {
                label: {
                    formatter: (v: string) => (Number(v) * max).toFixed(0),
                },
                subTickLine: { count: 3 },
            },
            statistic: {
                content: {
                    formatter: () => `${value.toFixed(decimals)} ${unit}`,
                    style: {
                        fontSize: '18px',
                        fontWeight: 'bold',
                        color: colorMode === 'dark' ? '#E2E8F0' : '#2d3748',
                    },
                    offsetY: 20,
                },
                title: {
                    formatter: () => title,
                    style: {
                        fontSize: '12px',
                        color: colorMode === 'dark' ? '#A0AEC0' : '#718096',
                    },
                    offsetY: -30,
                },
            },
        });

        // Custom Power Factor gauge (-1 to 1 range)
        // Special mapping where ±1 both map to factor 50 (unity PF on gauge extremes)
        // PF from -1 to 0: factor from 50 to 0 (leading/capacitive)
        // PF from 0 to 1: factor from 100 to 50 (lagging/inductive)
        const makePFConfig = (value: number, title: string) => {
            let factor: number;
            if (value < 0) {
                // Negative PF (leading/capacitive): -1 to 0 maps to 50 to 0
                // Example: PF = -0.9 → factor = 0.9 * 50 = 45
                factor = Math.abs(value) * 50;
            } else {
                // Positive PF (lagging/inductive): 0 to 1 maps to 100 to 50
                // Example: PF = 0.9 → factor = 50 - (0.9 * 50) + 50 = 55
                factor = 50 - (value * 50) + 50;
            }

            const normalizedPercent = factor / 100;

            return {
                percent: Math.abs(normalizedPercent),
                range: {
                    ticks: [0, 0.35, 0.45, 0.55, 0.65, 1],
                    color: ['#F4664A', '#FAAD14', '#30BF78', '#FAAD14', '#F4664A'],
                    width: 10,
                },
                animation: false,
                indicator: {
                    pointer: {
                        style: {
                            stroke: '#D0D0D0',
                            width: 2,
                        }
                    },
                    pin: {
                        style: {
                            stroke: '#D0D0D0',
                            width: 2,
                        }
                    },
                },
                axis: {
                    label: {
                        formatter: (v: string) => {
                            // Convert back from 0-100 factor to -1 to 1 PF
                            const factorVal = Number(v) * 100;
                            let pfVal: number;
                            if (factorVal <= 50) {
                                // 0-50 maps to -1 to 0
                                pfVal = -(factorVal / 50);
                            } else {
                                // 50-100 maps to 0 to 1 (reversed)
                                pfVal = (100 - factorVal) / 50;
                            }
                            return pfVal.toFixed(1);
                        },
                    },
                    subTickLine: { count: 3 },
                },
                statistic: {
                    title: {
                        style: {
                            fontSize: '20px',
                            fontWeight: 600,
                            color: Math.abs(value) > 0.9 ? '#30BF78' : Math.abs(value) > 0.75 ? '#FAAD14' : '#F4664A',
                        },
                        formatter: () => Math.abs(value).toFixed(2),
                    },
                    content: false as const,
                },
            };
        };

        if (!now?.R || !now?.S || !now?.T) return null;

        // THD gauge maker with specific ranges
        const makeVoltTHDConfig = (value: number, title: string) => ({
            percent: value / 15, // Max scale 15%
            range: {
                ticks: [0, 0.33, 0.67, 1], // 0%, 5%, 10%, 15%
                color: voltTHDColors,
            },
            animation: false,
            indicator: {
                pointer: { style: { stroke: colorMode === 'dark' ? '#E2E8F0' : '#2c3034' } },
                pin: { style: { stroke: colorMode === 'dark' ? '#E2E8F0' : '#2c3034' } },
            },
            axis: {
                label: {
                    formatter: (v: string) => `${(Number(v) * 15).toFixed(1)}%`,
                },
                subTickLine: { count: 3 },
            },
            statistic: {
                content: {
                    formatter: () => `${value.toFixed(2)}%`,
                    style: {
                        fontSize: '18px',
                        fontWeight: 'bold',
                        color: value < 5 ? '#48BB78' : value < 10 ? '#ED8936' : '#F56565',
                    },
                    offsetY: 20,
                },
                title: {
                    formatter: () => title,
                    style: {
                        fontSize: '12px',
                        color: colorMode === 'dark' ? '#A0AEC0' : '#718096',
                    },
                    offsetY: -30,
                },
            },
        });

        const makeAmpTHDConfig = (value: number, title: string) => ({
            percent: value / 40, // Max scale 40%
            range: {
                ticks: [0, 0.375, 0.75, 1], // 0%, 15%, 30%, 40%
                color: ampTHDColors,
            },
            animation: false,
            indicator: {
                pointer: { style: { stroke: colorMode === 'dark' ? '#E2E8F0' : '#2c3034' } },
                pin: { style: { stroke: colorMode === 'dark' ? '#E2E8F0' : '#2c3034' } },
            },
            axis: {
                label: {
                    formatter: (v: string) => `${(Number(v) * 40).toFixed(0)}%`,
                },
                subTickLine: { count: 3 },
            },
            statistic: {
                content: {
                    formatter: () => `${value.toFixed(2)}%`,
                    style: {
                        fontSize: '18px',
                        fontWeight: 'bold',
                        color: value < 15 ? '#48BB78' : value < 30 ? '#ED8936' : '#F56565',
                    },
                    offsetY: 20,
                },
                title: {
                    formatter: () => title,
                    style: {
                        fontSize: '12px',
                        color: colorMode === 'dark' ? '#A0AEC0' : '#718096',
                    },
                    offsetY: -30,
                },
            },
        });

        return {
            SUM: {
                volt: makeConfig(now.SUM.volt, maxVoltage, "SUM", "V", getVoltageColors(now.SUM.volt), 1),
                amp: makeConfig(now.SUM.amp, maxCurrent, "SUM", "A", currentColors, 3),
                power: makeConfig(now.SUM.power / 1000, maxPower, "SUM", "kW", powerColors, 3),
                apparentPower: makeConfig(now.SUM.apparentPower / 1000, maxApparentPower, "SUM", "kVA", vaColors, 3),
                reactivePower: makeConfig(now.SUM.reactivePower / 1000, maxReactivePower, "SUM", "kVAR", varColors, 3),
                powerFactor: makePFConfig(now.SUM.powerFactor, "PF"),
                voltTHD: makeVoltTHDConfig(now.SUM.voltTHD, "SUM Voltage THD"),
                ampTHD: makeAmpTHDConfig(now.SUM.ampTHD, "SUM Current THD"),
            },
            R: {
                volt: makeConfig(now.R.volt, maxVoltage, "L1", "V", getVoltageColors(now.R.volt), 1),
                amp: makeConfig(now.R.amp, maxCurrent, "L1", "A", currentColors, 3),
                power: makeConfig(now.R.power / 1000, maxPower, "L1", "kW", powerColors, 3),
                apparentPower: makeConfig(now.R.apparentPower / 1000, maxApparentPower, "L1", "kVA", vaColors, 3),
                reactivePower: makeConfig(now.R.reactivePower / 1000, maxReactivePower, "L1", "kVAR", varColors, 3),
                powerFactor: makePFConfig(now.R.powerFactor, "L1"),
                voltTHD: makeVoltTHDConfig(now.R.voltTHD, "L1 Voltage THD"),
                ampTHD: makeAmpTHDConfig(now.R.ampTHD, "L1 Current THD"),
            },
            S: {
                volt: makeConfig(now.S.volt, maxVoltage, "L2", "V", getVoltageColors(now.S.volt), 1),
                amp: makeConfig(now.S.amp, maxCurrent, "L2", "A", currentColors, 3),
                power: makeConfig(now.S.power / 1000, maxPower, "L2", "kW", powerColors, 3),
                apparentPower: makeConfig(now.S.apparentPower / 1000, maxApparentPower, "L2", "kVA", vaColors, 3),
                reactivePower: makeConfig(now.S.reactivePower / 1000, maxReactivePower, "L2", "kVAR", varColors, 3),
                powerFactor: makePFConfig(now.S.powerFactor, "L2"),
                voltTHD: makeVoltTHDConfig(now.S.voltTHD, "L2 Voltage THD"),
                ampTHD: makeAmpTHDConfig(now.S.ampTHD, "L2 Current THD"),
            },
            T: {
                volt: makeConfig(now.T.volt, maxVoltage, "L3", "V", getVoltageColors(now.T.volt), 1),
                amp: makeConfig(now.T.amp, maxCurrent, "L3", "A", currentColors, 3),
                power: makeConfig(now.T.power / 1000, maxPower, "L3", "kW", powerColors, 3),
                apparentPower: makeConfig(now.T.apparentPower / 1000, maxApparentPower, "L3", "kVA", vaColors, 3),
                reactivePower: makeConfig(now.T.reactivePower / 1000, maxReactivePower, "L3", "kVAR", varColors, 3),
                powerFactor: makePFConfig(now.T.powerFactor, "L3"),
                voltTHD: makeVoltTHDConfig(now.T.voltTHD, "L3 Voltage THD"),
                ampTHD: makeAmpTHDConfig(now.T.ampTHD, "L3 Current THD"),
            },
        };
    }, [
        now.R, now.S, now.T, now.SUM,
        maxVoltage, maxCurrent, maxPower, maxApparentPower, maxReactivePower, colorMode,
    ]);

    // Memoize THD quality calculations to prevent recalculation on every render
    // Must be before early return to satisfy Rules of Hooks
    const thdQuality = useMemo(() => {
        if (!now?.R || !now?.S || !now?.T || !now?.SUM) return null;
        return calculateTHDQuality(
            now.SUM.voltTHD, now.R.voltTHD, now.S.voltTHD, now.T.voltTHD,
            now.SUM.ampTHD, now.R.ampTHD, now.S.ampTHD, now.T.ampTHD
        );
    }, [now.R, now.S, now.T, now.SUM]);

    // Memoize worst phase calculation
    const worstPhase = useMemo(() => {
        if (!now?.R || !now?.S || !now?.T) return null;
        return findWorstPhase(
            now.R.voltTHD, now.R.ampTHD,
            now.S.voltTHD, now.S.ampTHD,
            now.T.voltTHD, now.T.ampTHD
        );
    }, [now.R, now.S, now.T]);

    // Memoize all system metrics calculations (prevents expensive recalculations)
    const systemMetrics = useMemo(() => {
        if (!now?.R || !now?.S || !now?.T || !now?.SUM) return null;
        return calculateAllMetrics(
            now.SUM.power,
            now.SUM.apparentPower,
            now.SUM.amp,
            now.R.amp,
            now.S.amp,
            now.T.amp,
            now.SUM.volt,
            now.SUM.powerFactor,
            maxCurrent
        );
    }, [now.R, now.S, now.T, now.SUM, maxCurrent]);

    // Check if all phases have 0 voltage, if so, set frequency to 0
    const displayFrequency = useMemo(() => {
        if (!now?.R || !now?.S || !now?.T) return 0;
        const allPhasesZero = now.R.volt === 0 && now.S.volt === 0 && now.T.volt === 0;
        return allPhasesZero ? 0 : now.SUM?.frequency || 0;
    }, [now.R, now.S, now.T, now.SUM]);

    // Memoize sine wave data generation (expensive operation with 100 data points)
    const sineWaveData = useMemo(() => {
        if (!now?.SUM) return [];
        return generateSineWaveData(displayFrequency);
    }, [displayFrequency, now?.SUM]);

    // Memoize power factor wave data for each phase (shows voltage/current phase relationship)
    const powerFactorWaves = useMemo(() => {
        if (!now?.R || !now?.S || !now?.T || !now?.SUM) return null;

        // Transform data into format suitable for Line chart with multiple series
        const transformWaveData = (waveData: any[]) => {
            const transformed: any[] = [];
            waveData.forEach(point => {
                transformed.push(
                    { x: point.x, value: point.voltage, type: 'Voltage' },
                    { x: point.x, value: point.current, type: 'Current' }
                );
            });
            return transformed;
        };

        return {
            L1: transformWaveData(generatePowerFactorWaves(now.R.powerFactor, now.SUM.frequency)),
            L2: transformWaveData(generatePowerFactorWaves(now.S.powerFactor, now.SUM.frequency)),
            L3: transformWaveData(generatePowerFactorWaves(now.T.powerFactor, now.SUM.frequency)),
        };
    }, [now.R, now.S, now.T, now.SUM]);

    // Safety check: ensure phase data exists
    if (!now?.R || !now?.S || !now?.T || !gaugeConfigs || !thdQuality || !worstPhase || !systemMetrics) {
        return (
            <MyCard>
                <CardBody py={8} textAlign="center">
                    <Text fontSize="lg" opacity={0.7}>
                        Waiting for real-time data...
                    </Text>
                </CardBody>
            </MyCard>
        );
    }

    const optionStates = now.optionStates || { X1: 0 as 0 | 1, X2: 0 as 0 | 1, X3: 0 as 0 | 1 };
    const optionStateCards = [
        { key: "X1", label: optionLabels?.X1 || "X1", value: optionStates.X1 },
        { key: "X2", label: optionLabels?.X2 || "X2", value: optionStates.X2 },
        { key: "X3", label: optionLabels?.X3 || "X3", value: optionStates.X3 },
    ];

    // Get status color - using useCallback would add overhead, these are simple functions
    const getStatusColor = () => {
        if (isOnline === "RESTORING") return "orange";
        if (isOnline) return "green";
        return "red";
    };

    const getStatusText = () => {
        if (isOnline === "RESTORING") return "RESTORING";
        if (isOnline) return "ONLINE";
        return "OFFLINE";
    };

    const renderExpectedHeaderInput = () => {
        if (isEditingExpected && onChangeExpectedCycleTime) {
            return (
                <HStack spacing={2} flexWrap="wrap" rowGap={1}>
                    <PrimaryInput
                        size="xs"
                        w="80px"
                        type="number"
                        step="0.1"
                        value={expectedInput}
                        placeholder="Expected"
                        onChange={(e) => setExpectedInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") handleSaveExpected();
                            if (e.key === "Escape") setIsEditingExpected(false);
                        }}
                        autoFocus
                    />
                    <Button size="xs" colorScheme="green" onClick={handleSaveExpected}>
                        Save
                    </Button>
                    <Button size="xs" variant="ghost" onClick={() => setIsEditingExpected(false)}>
                        Cancel
                    </Button>
                </HStack>
            );
        }

        return (
            <HStack spacing={1}>
                <Text fontSize="xs" opacity={0.8}>
                    Expected: <strong>{expectedVal.toFixed(1)}s</strong>
                </Text>
                {onChangeExpectedCycleTime && (
                    <Button size="xs" variant="ghost" colorScheme="orange" onClick={() => setIsEditingExpected(true)} h="20px" px={1.5}>
                        Edit
                    </Button>
                )}
            </HStack>
        );
    };

    return (
        <PeriodInfoContext.Provider value={periodInfo}>
            <VStack gap={5} w="100%" minW={0}>
                {/* SUM Card - Total System */}
                <MyCard w="100%" noPadding>
                    <CardHeader
                        px={{ base: 3, md: 5 }}
                        py={{ base: 3, md: 4 }}
                        borderBottom="1px dashed"
                        borderColor={border}>
                        <HStack justify="space-between" flexWrap="wrap" spacing={2}>
                            <Text fontSize="md" fontWeight={500}>
                                Total System (SUM)
                            </Text>
                            <HStack flexWrap="wrap" rowGap={1} minW={0} maxW="100%">
                                {periodInfo && (
                                    <MyTooltip label={`Min/Max/Avg values accumulated over the ${periodInfo.hoverLabel}`}>
                                        <HStack
                                            spacing={1.5}
                                            px={2.5}
                                            py={1}
                                            flexWrap="wrap"
                                            justify="center"
                                            maxW="100%"
                                            borderRadius={{ base: "lg", sm: "full" }}
                                            border="1px solid"
                                            borderColor="blue.400"
                                            opacity={0.75}
                                            cursor="help"
                                            _hover={{ opacity: 1 }}
                                            transition="opacity 0.15s"
                                        >
                                            <Text fontSize="xs" color="blue.300" fontWeight="semibold" letterSpacing="wide">
                                                Min · Max · Avg
                                            </Text>
                                            <Text fontSize="2xs" color="blue.400" opacity={0.8}>|</Text>
                                            <Text fontSize="xs" color="blue.300" fontWeight="bold">
                                                {periodInfo.label}
                                            </Text>
                                        </HStack>
                                    </MyTooltip>
                                )}
                                <Badge colorScheme={getStatusColor()} size="sm">
                                    {getStatusText()}
                                </Badge>
                                <Text fontSize="xs" opacity={0.7} textTransform="uppercase" letterSpacing="wide">
                                    {dayjs.unix(updated).utc().format("HH:mm:ss")}
                                </Text>
                            </HStack>
                        </HStack>
                    </CardHeader>
                <CardBody p={{ base: 3, md: 5 }}>
                    <Grid
                        templateColumns={{ base: "minmax(0, 1fr)", xl: "repeat(4, minmax(0, 1fr))" }}
                        gap={4}
                        alignItems="stretch"
                        sx={{ "& > *": { minWidth: 0 } }}
                    >
                        <GridItem colStart={{ xl: 1 }} rowStart={{ xl: 1 }}>
                            <VStack spacing={1} align="stretch">
                                <MeterBox
                                    label="Voltage"
                                    value={now.SUM.volt}
                                    suffix="V"
                                    maxValue={maxVoltage}
                                    color={getVoltageColors(now.SUM.volt)[0]}
                                    decimals={1}
                                    hideNowValue={hideNowValues}
                                />
                                <MinAvgMaxInline nowValue={now.SUM.volt} minmax={daily?.SUM?.lineVoltage} decimals={1} unit="V" />
                            </VStack>
                        </GridItem>
                        <GridItem colStart={{ xl: 2 }} rowStart={{ xl: 1 }}>
                            <VStack spacing={1} align="stretch">
                                <MeterBox
                                    label="Current"
                                    value={now.SUM.amp}
                                    suffix="A"
                                    maxValue={maxCurrent}
                                    getColor={getCurrentColor}
                                    decimals={3}
                                    hideNowValue={hideNowValues}
                                />
                                <MinAvgMaxInline nowValue={now.SUM.amp} minmax={daily?.SUM?.amp} decimals={3} unit="A" />
                            </VStack>
                        </GridItem>
                        <GridItem colStart={{ xl: 3 }} rowStart={{ xl: 1 }}>
                            <VStack spacing={1} align="stretch">
                                <MeterBox
                                    label="Active Power"
                                    value={now.SUM.power / 1000}
                                    suffix="kW"
                                    maxValue={maxPower}
                                    color="#4299E1"
                                    decimals={3}
                                    hideNowValue={hideNowValues}
                                />
                                <MinAvgMaxInline
                                    nowValue={now.SUM.power / 1000}
                                    minmax={daily?.SUM?.power ? {
                                        min: daily.SUM.power.min / 1000,
                                        avg: daily.SUM.power.avg / 1000,
                                        max: daily.SUM.power.max / 1000,
                                    } : undefined}
                                    decimals={3}
                                    unit="kW"
                                />
                            </VStack>
                        </GridItem>
                        <GridItem colStart={{ xl: 4 }} rowStart={{ xl: 1 }} rowSpan={{ xl: 2 }}>
                            <VStack spacing={1} align="stretch" h="100%">
                                <Text fontSize="xs" fontWeight={500} textAlign="center">Power Factor</Text>
                                <Box borderRadius={5} py={1} w="100%" h="100%" bg="transparent" minW={0} overflow="hidden">
                                    <Gauge {...gaugeConfigs.SUM.powerFactor} height={240} />
                                </Box>
                                <HStack justify="center" spacing={2} pt={1}>
                                    {hideNowValues ? null : (
                                        <>
                                            <Icon as={getPfDirectionIcon(now.SUM.powerFactor)} color={now.SUM.powerFactor > 0 ? "green.400" : "orange.400"} />
                                            <Text fontSize="xs" fontWeight={600} opacity={0.8}>
                                                {getPfDirectionLabel(now.SUM.powerFactor) || "Unity"}
                                            </Text>
                                        </>
                                    )}
                                </HStack>
                                <MinAvgMaxInline nowValue={now.SUM.powerFactor} minmax={daily?.SUM?.powerFactor} decimals={3} isPF />
                            </VStack>
                        </GridItem>

                        <GridItem colStart={{ xl: 1 }} rowStart={{ xl: 2 }}>
                            <VStack spacing={1} align="stretch">
                                <MeterBox
                                    label="Apparent Power"
                                    value={now.SUM.apparentPower / 1000}
                                    suffix="kVA"
                                    maxValue={maxApparentPower}
                                    color="#9F7AEA"
                                    decimals={3}
                                    hideNowValue={hideNowValues}
                                />
                                <MinAvgMaxInline
                                    nowValue={now.SUM.apparentPower / 1000}
                                    minmax={daily?.SUM?.apparentPower ? {
                                        min: daily.SUM.apparentPower.min / 1000,
                                        avg: daily.SUM.apparentPower.avg / 1000,
                                        max: daily.SUM.apparentPower.max / 1000,
                                    } : undefined}
                                    decimals={3}
                                    unit="kVA"
                                />
                            </VStack>
                        </GridItem>
                        <GridItem colStart={{ xl: 2 }} rowStart={{ xl: 2 }}>
                            <VStack spacing={1} align="stretch">
                                <MeterBox
                                    label="Reactive Power"
                                    value={now.SUM.reactivePower / 1000}
                                    suffix="kVAR"
                                    maxValue={maxReactivePower}
                                    color="#ED8936"
                                    decimals={3}
                                    hideNowValue={hideNowValues}
                                />
                                <MinAvgMaxInline
                                    nowValue={now.SUM.reactivePower / 1000}
                                    minmax={daily?.SUM?.reactivePower ? {
                                        min: daily.SUM.reactivePower.min / 1000,
                                        avg: daily.SUM.reactivePower.avg / 1000,
                                        max: daily.SUM.reactivePower.max / 1000,
                                    } : undefined}
                                    decimals={3}
                                    unit="kVAR"
                                />
                            </VStack>
                        </GridItem>
                        <GridItem colStart={{ xl: 3 }} rowStart={{ xl: 2 }}>
                            <VStack spacing={1} align="stretch">
                                <MeterBox
                                    label="N-Phase Current"
                                    value={now.SUM.neutralCurrent ?? now.SUM.amp}
                                    suffix="A"
                                    maxValue={maxCurrent}
                                    getColor={getCurrentColor}
                                    decimals={3}
                                    hideNowValue={hideNowValues}
                                />
                                <MinAvgMaxInline nowValue={now.SUM.neutralCurrent ?? now.SUM.amp} minmax={daily?.SUM?.neutralCurrent ?? daily?.SUM?.amp} decimals={3} unit="A" />
                            </VStack>
                        </GridItem>
                    </Grid>

                    <SimpleGrid columns={{ base: 1, xl: 2 }} spacing={4} mt={4} pt={4} borderTop="1px dashed" borderColor={border}>
                        <Box
                            p={3}
                            border="1px dashed"
                            borderColor={border}
                            borderRadius="md"
                            bg={colorMode === "dark" ? "whiteAlpha.50" : "blackAlpha.50"}
                        >
                            <HStack justify="space-between" mb={2}>
                                <Text fontSize="xs" opacity={0.7} textTransform="uppercase" letterSpacing="wide">
                                    Cumulatives
                                </Text>
                            </HStack>

                            <SimpleGrid columns={{ base: 1, md: 3 }} spacing={2}>
                                <Box p={2} border="1px dashed" borderColor={border} borderRadius="md">
                                    <Text fontSize="2xs" opacity={0.7} textTransform="uppercase">Active</Text>
                                    <Text fontSize="lg" fontWeight={700}>
                                        {hideNowValues ? "--" : (
                                            <NumberFormatter number={Number(cumulativeKWh.toFixed(3))} suffix="kWh" sideSize="small" />
                                        )}
                                    </Text>
                                </Box>
                                <Box p={2} border="1px dashed" borderColor={border} borderRadius="md">
                                    <Text fontSize="2xs" opacity={0.7} textTransform="uppercase">Apparent</Text>
                                    <Text fontSize="lg" fontWeight={700}>
                                        {hideNowValues ? "--" : (
                                            <NumberFormatter number={Number(cumulativeKVAh.toFixed(3))} suffix="kVAh" sideSize="small" />
                                        )}
                                    </Text>
                                </Box>
                                <Box p={2} border="1px dashed" borderColor={border} borderRadius="md">
                                    <Text fontSize="2xs" opacity={0.7} textTransform="uppercase">Reactive</Text>
                                    <Text fontSize="lg" fontWeight={700}>
                                        {hideNowValues ? "--" : (
                                            <NumberFormatter number={Number(cumulativeKVARh.toFixed(3))} suffix="kVArh" sideSize="small" />
                                        )}
                                    </Text>
                                </Box>
                            </SimpleGrid>

                            {onResetAccumulators && (
                                <HStack mt={3} justify="flex-end" align="center">
                                    <Button
                                        size="xs"
                                        colorScheme="red"
                                        variant="outline"
                                        leftIcon={<Icon as={MdRestartAlt} />}
                                        onClick={handleOpenReset}
                                    >
                                        Reset Accumulators
                                    </Button>
                                </HStack>
                            )}
                        </Box>

                        <Box
                            p={3}
                            h="100%"
                            border="1px dashed"
                            borderColor={border}
                            borderRadius="md"
                            bg={colorMode === "dark" ? "whiteAlpha.50" : "blackAlpha.50"}
                        >
                            <HStack justify="space-between" mb={2} flexWrap="wrap" rowGap={0}>
                                <Text fontSize="xs" opacity={0.7} textTransform="uppercase" letterSpacing="wide">
                                    Machine Option States
                                </Text>
                                <Text fontSize="xs" opacity={0.6}>Binary telemetry (X1/X2/X3)</Text>
                            </HStack>
                            <SimpleGrid columns={{ base: 1, md: 3 }} spacing={3}>
                                {optionStateCards.map((item) => {
                                    const isOn = item.value === 1;
                                    return (
                                        <HStack
                                            key={item.key}
                                            p={3}
                                            border="1px dashed"
                                            borderColor={isOn ? "green.300" : border}
                                            borderRadius="md"
                                            bg={isOn ? (colorMode === "dark" ? "green.900" : "green.50") : "transparent"}
                                            justify="space-between"
                                        >
                                            <VStack align="start" spacing={0}>
                                                <Text fontSize="sm" fontWeight={700}>{item.label}</Text>
                                                <Text fontSize="2xs" opacity={0.7}>Binary control state</Text>
                                            </VStack>
                                            <VStack spacing={0} align="end">
                                                <Badge colorScheme={hideNowValues ? "gray" : getOptionStateColor(item.value)}>{hideNowValues ? "--" : getOptionStateLabel(item.value)}</Badge>
                                                <Text fontSize="2xs" opacity={0.7}>Value: {hideNowValues ? "--" : item.value}</Text>
                                            </VStack>
                                        </HStack>
                                    );
                                })}
                            </SimpleGrid>
                        </Box>
                    </SimpleGrid>

                    {/* Vigorous Warning Alert Dialog for Resetting Accumulators */}
                    <AlertDialog
                        isOpen={isResetOpen}
                        leastDestructiveRef={cancelRef}
                        onClose={handleCloseReset}
                        isCentered
                        size="lg"
                    >
                        <AlertDialogOverlay bg="blackAlpha.700" backdropFilter="blur(2px)">
                            <AlertDialogContent
                                bg={colorMode === "dark" ? "gray.800" : "white"}
                                border="2px solid"
                                borderColor="red.500"
                                boxShadow="0 0 25px rgba(229, 62, 62, 0.4)"
                                borderRadius="lg"
                            >
                                <AlertDialogHeader pb={2} borderBottom="1px solid" borderColor={border}>
                                    <HStack spacing={2} color="red.500">
                                        <Icon as={FiAlertTriangle} boxSize={6} />
                                        <Text fontSize="md" fontWeight="bold">
                                            DANGER: Reset Energy Accumulators
                                        </Text>
                                    </HStack>
                                </AlertDialogHeader>

                                <AlertDialogBody py={4}>
                                    <VStack spacing={4} align="stretch">
                                        {/* Vigorous Warning Banner */}
                                        <Box
                                            p={3}
                                            bg="red.50"
                                            _dark={{ bg: "red.900", borderColor: "red.600" }}
                                            border="1px solid"
                                            borderColor="red.300"
                                            borderRadius="md"
                                        >
                                            <HStack align="start" spacing={3}>
                                                <Icon as={FiAlertOctagon} color="red.500" _dark={{ color: "red.300" }} boxSize={6} mt={0.5} flexShrink={0} />
                                                <VStack align="start" spacing={1}>
                                                    <Text fontSize="sm" fontWeight="bold" color="red.700" _dark={{ color: "red.200" }}>
                                                        CRITICAL &amp; IRREVERSIBLE OPERATION
                                                    </Text>
                                                    <Text fontSize="xs" color="red.800" _dark={{ color: "red.100" }} lineHeight="tall">
                                                        This will permanently reset all cumulative energy counters (Active kWh, Apparent kVAh, Reactive kVArh) to <strong>ZERO</strong>. 
                                                        All accumulation records will be cleared. This action <strong>CANNOT</strong> be undone.
                                                    </Text>
                                                </VStack>
                                            </HStack>
                                        </Box>

                                        {/* Values that will be wiped */}
                                        <Box p={3} border="1px dashed" borderColor={border} borderRadius="md" bg={colorMode === "dark" ? "whiteAlpha.50" : "gray.50"}>
                                            <Text fontSize="xs" fontWeight="semibold" mb={2} opacity={0.8} textTransform="uppercase">
                                                Counters to be wiped to zero:
                                            </Text>
                                            <SimpleGrid columns={3} spacing={2} textAlign="center">
                                                <Box p={2} bg={colorMode === "dark" ? "whiteAlpha.100" : "white"} border="1px solid" borderColor={border} borderRadius="sm">
                                                    <Text fontSize="2xs" opacity={0.7} textTransform="uppercase">Active (kWh)</Text>
                                                    <Text fontSize="md" fontWeight="bold" color="orange.400">{cumulativeKWh.toFixed(3)}</Text>
                                                </Box>
                                                <Box p={2} bg={colorMode === "dark" ? "whiteAlpha.100" : "white"} border="1px solid" borderColor={border} borderRadius="sm">
                                                    <Text fontSize="2xs" opacity={0.7} textTransform="uppercase">Apparent (kVAh)</Text>
                                                    <Text fontSize="md" fontWeight="bold" color="blue.400">{cumulativeKVAh.toFixed(3)}</Text>
                                                </Box>
                                                <Box p={2} bg={colorMode === "dark" ? "whiteAlpha.100" : "white"} border="1px solid" borderColor={border} borderRadius="sm">
                                                    <Text fontSize="2xs" opacity={0.7} textTransform="uppercase">Reactive (kVArh)</Text>
                                                    <Text fontSize="md" fontWeight="bold" color="purple.400">{cumulativeKVARh.toFixed(3)}</Text>
                                                </Box>
                                            </SimpleGrid>
                                        </Box>

                                        {/* Confirmation safety safeguard */}
                                        <VStack align="stretch" spacing={2} pt={1}>
                                            <Text fontSize="xs" fontWeight="600" color={colorMode === "dark" ? "gray.200" : "gray.700"}>
                                                To confirm, please type <Text as="span" fontFamily="monospace" fontWeight="bold" color="red.500" px={1.5} py={0.5} bg="red.100" _dark={{ bg: "red.800", color: "red.100" }} borderRadius="sm">RESET</Text> in the field below:
                                            </Text>
                                            <PrimaryInput
                                                placeholder="Type RESET to confirm"
                                                value={confirmText}
                                                onChange={(e) => setConfirmText(e.target.value)}
                                                autoFocus
                                            />
                                        </VStack>
                                    </VStack>
                                </AlertDialogBody>

                                <AlertDialogFooter borderTop="1px solid" borderColor={border}>
                                    <HStack spacing={3}>
                                        <Button ref={cancelRef} size="sm" variant="ghost" onClick={handleCloseReset} isDisabled={isResetting}>
                                            Cancel, Keep Data
                                        </Button>
                                        <Button
                                            size="sm"
                                            colorScheme="red"
                                            onClick={handleConfirmReset}
                                            isLoading={isResetting}
                                            loadingText="Resetting..."
                                            isDisabled={confirmText.trim().toUpperCase() !== "RESET"}
                                            leftIcon={<Icon as={MdRestartAlt} />}
                                        >
                                            I Understand, Reset to 0
                                        </Button>
                                    </HStack>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialogOverlay>
                    </AlertDialog>
                    {/* THD Section for SUM - Using memoized components */}
                    <VStack spacing={3} mt={4} pt={4} borderTop="1px dashed" borderColor={border}>
                        <Text fontSize="xs" fontWeight={600} opacity={0.7} textTransform="uppercase" letterSpacing="wide">Total Harmonic Distortion</Text>
                        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4} w="100%">
                            <VoltTHDBar thd={hideNowValues ? 0 : now.SUM.voltTHD} label="Voltage" />
                            <AmpTHDBar thd={hideNowValues ? 0 : now.SUM.ampTHD} label="Current" />
                        </SimpleGrid>
                    </VStack>
                    <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4} mt={4} pt={4} borderTop="1px dashed" borderColor={border}>
                        {/* Frequency with Sine Wave - Using memoized data */}
                        <VStack align="stretch" spacing={3}>
                            <VStack w="100%" alignItems="center" spacing={2}>
                                <Text fontSize="xs" fontWeight={500}>Frequency</Text>
                                <Box
                                    borderRadius={5}
                                    py={1}
                                    w="100%"
                                    bgColor={colorMode === 'dark' ? 'whiteAlpha.200' : 'gray.200'}>
                                    <Text textAlign="center" fontFamily="Orbitron" fontSize="4xl" fontWeight={600} color={colorMode === 'dark' ? '#E2E8F0' : '#2D3748'}>
                                        {hideNowValues ? "--" : (
                                            <NumberFormatter number={Number(displayFrequency.toFixed(1))} suffix="Hz" sideSize="extra-small" />
                                        )}
                                    </Text>
                                </Box>
                                <Box w="100%">
                                    <MinAvgMaxInline
                                        nowValue={displayFrequency}
                                        minmax={daily?.SUM?.frequency}
                                        decimals={1}
                                        unit="Hz"
                                    />
                                </Box>
                            </VStack>
                            <Box mt={6} mb={4} h={200}>
                                {/* Using pre-generated sine wave data - prevents recalculation on every tick */}
                                <Line
                                    data={sineWaveData}
                                    xField="x"
                                    yField="y"
                                    smooth={true}
                                    color={colorMode === 'dark' ? '#4299E1' : '#3182CE'}
                                    lineStyle={{ lineWidth: 2 }}
                                    xAxis={{ label: null, line: null, grid: null }}
                                    yAxis={{ label: null, line: null, grid: null }}
                                    animation={false}
                                    tooltip={false}
                                />
                            </Box>
                        </VStack>

                        {/* Power Quality & System Metrics - Using memoized calculations */}
                        <VStack align="stretch" spacing={3}>
                            {/* THD Quick Summary - Using pre-calculated values */}
                            <Box
                                p={3}
                                borderRadius="md"
                                bg={colorMode === 'dark' ? 'whiteAlpha.100' : 'gray.50'}
                                borderWidth="1px"
                                borderColor={border}>
                                <VStack spacing={2} align="stretch">
                                    <HStack justify="space-between">
                                        <HStack spacing={1}>
                                            <Text fontSize="xs" fontWeight={600} opacity={0.7}>Power Quality Status</Text>
                                            <MyTooltip label={
                                                <VStack align="start" spacing={1} fontSize="xs">
                                                    <Text fontWeight="bold">Power Quality Status:</Text>
                                                    <Text>• <strong>Excellent:</strong> Voltage THD &lt;3%, Current THD &lt;10%</Text>
                                                    <Text>• <strong>Good:</strong> Voltage THD &lt;5%, Current THD &lt;15%</Text>
                                                    <Text>• <strong>Fair:</strong> Voltage THD &lt;8%, Current THD &lt;30%</Text>
                                                    <Text>• <strong>Poor:</strong> Exceeds fair thresholds</Text>
                                                </VStack>
                                            }>
                                                <InfoOutlineIcon boxSize={3} opacity={0.5} cursor="help" />
                                            </MyTooltip>
                                        </HStack>
                                        <Badge colorScheme={hideNowValues ? "gray" : thdQuality.colorScheme} size="sm">
                                            {hideNowValues ? "--" : thdQuality.status}
                                        </Badge>
                                    </HStack>
                                    <VStack spacing={1} align="stretch" fontSize="xs">
                                        <HStack justify="space-between">
                                            <HStack spacing={1}>
                                                <Text opacity={0.7}>Avg Voltage THD:</Text>
                                                <MyTooltip label={
                                                    <VStack align="start" spacing={1} fontSize="xs">
                                                        <Text fontWeight="bold">Voltage THD (Total Harmonic Distortion):</Text>
                                                        <Text>Measures voltage waveform distortion from harmonics.</Text>
                                                        <Text>• <strong>&lt;5%:</strong> Good ✓</Text>
                                                        <Text>• <strong>5-8%:</strong> Acceptable ⚠️</Text>
                                                        <Text>• <strong>&gt;8%:</strong> Poor ✗</Text>
                                                    </VStack>
                                                }>
                                                    <InfoOutlineIcon boxSize={2.5} opacity={0.4} cursor="help" />
                                                </MyTooltip>
                                            </HStack>
                                            <HStack spacing={1}>
                                                <Text fontWeight={600} color={thdQuality.avgVoltTHD < 5 ? '#48BB78' : thdQuality.avgVoltTHD < 8 ? '#ED8936' : '#F56565'}>
                                                    {hideNowValues ? "--" : `${thdQuality.avgVoltTHD.toFixed(2)}%`}
                                                </Text>
                                                {!hideNowValues && (thdQuality.avgVoltTHD < 5 ? '✓' : '⚠️')}
                                            </HStack>
                                        </HStack>
                                        <HStack justify="space-between">
                                            <HStack spacing={1}>
                                                <Text opacity={0.7}>Avg Current THD:</Text>
                                                <MyTooltip label={
                                                    <VStack align="start" spacing={1} fontSize="xs">
                                                        <Text fontWeight="bold">Current THD (Total Harmonic Distortion):</Text>
                                                        <Text>Measures current waveform distortion from harmonics.</Text>
                                                        <Text>• <strong>&lt;15%:</strong> Good ✓</Text>
                                                        <Text>• <strong>15-30%:</strong> Acceptable ⚠️</Text>
                                                        <Text>• <strong>&gt;30%:</strong> Poor ✗</Text>
                                                    </VStack>
                                                }>
                                                    <InfoOutlineIcon boxSize={2.5} opacity={0.4} cursor="help" />
                                                </MyTooltip>
                                            </HStack>
                                            <HStack spacing={1}>
                                                <Text fontWeight={600} color={thdQuality.avgAmpTHD < 15 ? '#48BB78' : thdQuality.avgAmpTHD < 30 ? '#ED8936' : '#F56565'}>
                                                    {hideNowValues ? "--" : `${thdQuality.avgAmpTHD.toFixed(2)}%`}
                                                </Text>
                                                {!hideNowValues && (thdQuality.avgAmpTHD < 15 ? '✓' : '⚠️')}
                                            </HStack>
                                        </HStack>
                                        <HStack justify="space-between" pt={1} borderTop="1px dashed" borderColor={border}>
                                            <Text opacity={0.7}>Worst Phase:</Text>
                                            <Text fontWeight={600}>{hideNowValues ? "--" : worstPhase.name}</Text>
                                        </HStack>
                                    </VStack>
                                </VStack>
                            </Box>

                            {/* System Metrics - Using memoized MetricBar components */}
                            <MetricBar
                                label="System Efficiency"
                                value={systemMetrics.efficiency.value}
                                displayValue={systemMetrics.efficiency.displayValue}
                                color={systemMetrics.efficiency.color}
                                tooltip={
                                    <VStack align="start" spacing={1} fontSize="xs">
                                        <Text fontWeight="bold">System Efficiency:</Text>
                                        <Text>Ratio of active power (kW) to apparent power (kVA).</Text>
                                        <Text>Higher is better - indicates less reactive power waste.</Text>
                                        <Text>• <strong>&gt;90%:</strong> Excellent</Text>
                                        <Text>• <strong>80-90%:</strong> Good</Text>
                                        <Text>• <strong>&lt;80%:</strong> Needs improvement</Text>
                                    </VStack>
                                }
                            />
                            <MetricBar
                                label="Phase Imbalance"
                                value={systemMetrics.imbalance.value}
                                displayValue={systemMetrics.imbalance.displayValue}
                                color={systemMetrics.imbalance.color}
                                tooltip={
                                    <VStack align="start" spacing={1} fontSize="xs">
                                        <Text fontWeight="bold">Phase Imbalance:</Text>
                                        <Text>Current difference between phases (L1, L2, L3).</Text>
                                        <Text>Lower is better - balanced load across phases.</Text>
                                        <Text>• <strong>&lt;5%:</strong> Good balance</Text>
                                        <Text>• <strong>5-10%:</strong> Acceptable</Text>
                                        <Text>• <strong>&gt;10%:</strong> High imbalance</Text>
                                    </VStack>
                                }
                            />
                            <MetricBar
                                label="Load Factor"
                                value={systemMetrics.loadFactor.value}
                                displayValue={systemMetrics.loadFactor.displayValue}
                                color={systemMetrics.loadFactor.color}
                                tooltip={
                                    <VStack align="start" spacing={1} fontSize="xs">
                                        <Text fontWeight="bold">Load Factor:</Text>
                                        <Text>Current load as percentage of maximum capacity.</Text>
                                        <Text>Indicates how much of available capacity is used.</Text>
                                        <Text>• <strong>&lt;70%:</strong> Good headroom</Text>
                                        <Text>• <strong>70-85%:</strong> Moderate load</Text>
                                        <Text>• <strong>&gt;85%:</strong> High load</Text>
                                    </VStack>
                                }
                            />
                            <MetricBar
                                label="Voltage Deviation"
                                value={systemMetrics.voltageDeviation.value}
                                displayValue={systemMetrics.voltageDeviation.displayValue}
                                color={systemMetrics.voltageDeviation.color}
                                tooltip={
                                    <VStack align="start" spacing={1} fontSize="xs">
                                        <Text fontWeight="bold">Voltage Deviation:</Text>
                                        <Text>How far voltage differs from nominal (230V).</Text>
                                        <Text>Lower is better - stable voltage supply.</Text>
                                        <Text>• <strong>&lt;3%:</strong> Excellent stability</Text>
                                        <Text>• <strong>3-5%:</strong> Good</Text>
                                        <Text>• <strong>&gt;5%:</strong> Poor regulation</Text>
                                    </VStack>
                                }
                            />
                            <MetricBar
                                label="Displacement PF"
                                value={systemMetrics.displacementPF.value}
                                displayValue={systemMetrics.displacementPF.displayValue}
                                color={systemMetrics.displacementPF.color}
                                suffix={systemMetrics.displacementPF.pfType}
                                tooltip={
                                    <VStack align="start" spacing={1} fontSize="xs">
                                        <Text fontWeight="bold">Displacement Power Factor:</Text>
                                        <Text>Phase angle between voltage and current.</Text>
                                        <Text>• <strong>Inductive (positive):</strong> Current lags voltage</Text>
                                        <Text>• <strong>Capacitive (negative):</strong> Current leads voltage</Text>
                                        <Text>• <strong>Close to 1.0:</strong> Best efficiency</Text>
                                        <Text>• <strong>&lt;0.85:</strong> May need correction</Text>
                                    </VStack>
                                }
                            />
                        </VStack>
                    </SimpleGrid>
                </CardBody>
            </MyCard>

            {/* Cycle Time Analysis Card */}
            <MyCard w="100%" noPadding>
                <CardHeader
                    px={{ base: 3, md: 5 }}
                    py={{ base: 3, md: 4 }}
                    borderBottom="1px dashed"
                    borderColor={border}>
                    <HStack justify="space-between" align="center" flexWrap="wrap" gap={2}>
                        <HStack spacing={2} align="center" flexWrap="wrap" rowGap={1} minW={0}>
                            <Text fontSize="md" fontWeight={500}>
                                Cycle Time Analysis
                            </Text>
                            <Badge colorScheme="blue" size="xs">
                                Real-Time
                            </Badge>
                            {currentMoldName && (
                                <Badge colorScheme="purple" size="xs" variant="outline">
                                    Mold: {currentMoldName}
                                </Badge>
                            )}
                        </HStack>
                        <HStack spacing={3} rowGap={1} flexWrap="wrap" minW={0}>
                            {availableMolds && availableMolds.length > 1 && (
                                <HStack spacing={1}>
                                    <Text fontSize="xs" opacity={0.7}>Mold:</Text>
                                    <Select
                                        size="xs"
                                        w="130px"
                                        borderRadius="md"
                                        value={currentMoldName}
                                        onChange={(e) => onSelectMold?.(e.target.value)}
                                    >
                                        {availableMolds.map((m) => (
                                            <option key={m} value={m}>{m}</option>
                                        ))}
                                    </Select>
                                </HStack>
                            )}
                            {renderExpectedHeaderInput()}
                        </HStack>
                    </HStack>
                </CardHeader>
                <CardBody p={{ base: 3, md: 5 }}>
                    <Box ref={cycleChartContainerRef} position="relative" w="100%" minW={0} h={isCompactCycleChart ? "auto" : "220px"}>
                        {isCompactCycleChart ? (
                            <VStack spacing={3} align="stretch" pt={1}>
                                {chartData.map(({ type, value }, idx) => {
                                    const pct = chartMax > 0 ? Math.min(100, (value / chartMax) * 100) : 0;
                                    const expectedPct = chartMax > 0 ? Math.min(100, (expectedVal / chartMax) * 100) : 0;
                                    return (
                                        <Box key={type}>
                                            <HStack justify="space-between" fontSize="xs" mb={1}>
                                                <Text opacity={0.8} fontWeight={500}>{type}</Text>
                                                <Text fontWeight={600}>{value.toFixed(2)}s</Text>
                                            </HStack>
                                            <Box
                                                position="relative"
                                                h="10px"
                                                borderRadius="full"
                                                bg={colorMode === "dark" ? "whiteAlpha.200" : "blackAlpha.100"}
                                            >
                                                <Box h="100%" w={`${pct}%`} bg={chartColors[idx]} borderRadius="full" />
                                                <Box
                                                    position="absolute"
                                                    top="-3px"
                                                    bottom="-3px"
                                                    left={`${expectedPct}%`}
                                                    borderLeft="2px dashed"
                                                    borderColor="#FC8181"
                                                    opacity={0.7}
                                                    pointerEvents="none"
                                                />
                                            </Box>
                                        </Box>
                                    );
                                })}
                                <Text fontSize="2xs" opacity={0.6}>
                                    Dashed line = expected ({expectedVal}s)
                                </Text>
                            </VStack>
                        ) : (<>
                        <Bar
                            data={chartData}
                            xField="value"
                            yField="type"
                            seriesField="type"
                            height={200}
                            animation={false}
                            padding={[10, CHART_PAD_RIGHT, 25, CHART_PAD_LEFT]}
                            barStyle={{
                                radius: 5,
                            }}
                            barWidthRatio={0.45}
                            color={chartColors}
                            xAxis={{
                                max: chartMax,
                                grid: {
                                    line: {
                                        style: { lineWidth: 0 },
                                    },
                                },
                                label: {
                                    style: {
                                        fill: colorMode === "dark" ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)",
                                    },
                                },
                            }}
                            yAxis={{
                                label: {
                                    style: {
                                        fill: colorMode === "dark" ? "rgba(255,255,255,0.8)" : "rgba(0,0,0,0.8)",
                                        fontSize: 11,
                                        fontWeight: 500,
                                    },
                                },
                            }}
                            legend={false}
                            label={{
                                position: 'right' as const,
                                offset: 6,
                                style: {
                                    fill: colorMode === "dark" ? "#FFFFFF" : "#1A202C",
                                    opacity: 0.9,
                                    fontSize: 11,
                                    fontWeight: 600,
                                },
                                formatter: (datum: any) => `${datum.value.toFixed(2)}s`,
                            }}
                            tooltip={{
                                formatter: (datum: any) => ({
                                    name: datum.type,
                                    value: `${datum.value.toFixed(3)}s`,
                                }),
                            }}
                        />
                        {/* CSS overlay threshold line */}
                        {thresholdLineLeft > 0 && (
                            <Box
                                position="absolute"
                                top="10px"
                                bottom="25px"
                                left={`${thresholdLineLeft}px`}
                                w="0"
                                borderLeft="2px dashed"
                                borderColor="#FC8181"
                                opacity={0.35}
                                pointerEvents="none"
                            >
                                <Text
                                    position="absolute"
                                    top="0"
                                    left="4px"
                                    fontSize="9px"
                                    color="#FC8181"
                                    fontWeight="bold"
                                    whiteSpace="nowrap"
                                    lineHeight="1"
                                >
                                    {expectedVal}s
                                </Text>
                            </Box>
                        )}
                        </>)}
                    </Box>

                    {/* Last 10 Shots Breakdown Section */}
                    <Box mt={4} pt={4} borderTop="1px dashed" borderColor={border}>
                        <HStack justify="space-between" align="center" mb={3} flexWrap="wrap" gap={2}>
                            <HStack spacing={2} align="center" flexWrap="wrap" rowGap={1} minW={0}>
                                <Text fontSize="xs" fontWeight={700} textTransform="uppercase" letterSpacing="wide" opacity={0.8}>
                                    Last 10 Shots Cycle Time
                                </Text>
                                <Badge colorScheme={lastFewArray.length > 0 ? "teal" : "gray"} size="xs" variant="subtle">
                                    {lastFewArray.length} {lastFewArray.length === 1 ? "shot" : "shots"} recorded
                                </Badge>
                            </HStack>

                            {lastFewArray.length > 0 && (
                                <HStack spacing={3} rowGap={0} fontSize="xs" flexWrap="wrap">
                                    <HStack spacing={1}>
                                        <Text opacity={0.6}>Avg:</Text>
                                        <Text fontWeight={600} color={lastFewAvg > expectedVal ? "#E53E3E" : undefined}>
                                            {lastFewAvg.toFixed(2)}s
                                        </Text>
                                    </HStack>
                                    <HStack spacing={1}>
                                        <Text opacity={0.6}>Min:</Text>
                                        <Text fontWeight={600} color="#38A169">
                                            {lastFewMin.toFixed(2)}s
                                        </Text>
                                    </HStack>
                                    <HStack spacing={1}>
                                        <Text opacity={0.6}>Max:</Text>
                                        <Text fontWeight={600} color={lastFewMax > expectedVal ? "#E53E3E" : undefined}>
                                            {lastFewMax.toFixed(2)}s
                                        </Text>
                                    </HStack>
                                </HStack>
                            )}
                        </HStack>

                        {lastFewArray.length === 0 ? (
                            <Box
                                p={3}
                                borderRadius="md"
                                bg={colorMode === "dark" ? "whiteAlpha.50" : "blackAlpha.50"}
                                textAlign="center"
                            >
                                <Text fontSize="xs" opacity={0.6}>
                                    No individual shot cycle times recorded yet for mold "{currentMoldName || "UNSET"}".
                                </Text>
                            </Box>
                        ) : (
                            <SimpleGrid columns={{ base: 2, sm: 5, md: 10 }} spacing={2}>
                                {lastFewArray.map((val, idx) => {
                                    const shotNum = idx + 1;
                                    const isLatest = idx === lastFewArray.length - 1;
                                    const isOverExpected = val > expectedVal;
                                    const diff = val - expectedVal;

                                    return (
                                        <Box
                                            key={idx}
                                            p={2}
                                            borderRadius="md"
                                            border="1px solid"
                                            borderColor={
                                                isLatest
                                                    ? (isOverExpected ? "#FEB2B2" : "#90CDF4")
                                                    : (colorMode === "dark" ? "whiteAlpha.200" : "blackAlpha.200")
                                            }
                                            bg={
                                                isLatest
                                                    ? (isOverExpected
                                                        ? (colorMode === "dark" ? "rgba(229, 62, 62, 0.15)" : "red.50")
                                                        : (colorMode === "dark" ? "rgba(49, 130, 206, 0.15)" : "blue.50"))
                                                    : (colorMode === "dark" ? "whiteAlpha.50" : "blackAlpha.50")
                                            }
                                            textAlign="center"
                                            position="relative"
                                            transition="all 0.2s ease"
                                            _hover={{ transform: "translateY(-1px)", shadow: "sm" }}
                                        >
                                            <HStack justify="center" spacing={1} mb={0.5}>
                                                <Text fontSize="9px" fontWeight={600} opacity={0.6}>
                                                    #{shotNum}
                                                </Text>
                                                {isLatest && (
                                                    <Badge colorScheme="blue" fontSize="8px" px={1} py={0} borderRadius="full">
                                                        NEW
                                                    </Badge>
                                                )}
                                            </HStack>
                                            <Text
                                                fontSize="sm"
                                                fontWeight={700}
                                                color={isOverExpected ? "#E53E3E" : (colorMode === "dark" ? "white" : "gray.800")}
                                            >
                                                {val.toFixed(2)}s
                                            </Text>
                                            <Text
                                                fontSize="9px"
                                                fontWeight={500}
                                                color={isOverExpected ? "#E53E3E" : "#38A169"}
                                            >
                                                {diff > 0 ? `+${diff.toFixed(1)}s` : `${diff.toFixed(1)}s`}
                                            </Text>
                                        </Box>
                                    );
                                })}
                            </SimpleGrid>
                        )}
                    </Box>
                </CardBody>
            </MyCard>

            {/* Voltage Card - L-N and L-L Side by Side */}
            <MyCard w="100%" noPadding>
                <CardHeader
                    px={{ base: 3, md: 5 }}
                    py={{ base: 3, md: 4 }}
                    borderBottom="1px dashed"
                    borderColor={border}>
                    <HStack justify="space-between" flexWrap="wrap" gap={2}>
                        <Text fontSize="md" fontWeight={500}>
                            Voltage
                        </Text>
                        <HStack spacing={3} rowGap={1} fontSize="9px" opacity={0.6} flexWrap="wrap">
                            <HStack spacing={1}>
                                <Box w="6px" h="6px" borderRadius="full" bg="#48BB78" />
                                <Text>THD &lt;5%</Text>
                            </HStack>
                            <HStack spacing={1}>
                                <Box w="6px" h="6px" borderRadius="full" bg="#ED8936" />
                                <Text>5-8%</Text>
                            </HStack>
                            <HStack spacing={1}>
                                <Box w="6px" h="6px" borderRadius="full" bg="#F56565" />
                                <Text>&gt;8%</Text>
                            </HStack>
                        </HStack>
                    </HStack>
                </CardHeader>
                <CardBody p={{ base: 3, md: 5 }}>
                    <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6}>
                        {/* L-N Voltages Column */}
                        <VStack align="stretch" spacing={3}>
                            <Text fontSize="xs" fontWeight={700} opacity={0.7} textTransform="uppercase" letterSpacing="wide" mb={1}>
                                Line to Neutral (L-N)
                            </Text>
                            {[
                                { label: 'L1', value: now.R.volt, minmax: daily?.R?.volt },
                                { label: 'L2', value: now.S.volt, minmax: daily?.S?.volt },
                                { label: 'L3', value: now.T.volt, minmax: daily?.T?.volt }
                            ].map((item) => {
                                const baseColor = getVoltageColors(item.value)[0];

                                return (
                                    <HStack key={item.label} spacing={3} align="center" flexWrap="wrap">
                                        <Text minW="50px" fontSize="sm" fontWeight={600} flexShrink={0}>
                                            {item.label}
                                        </Text>
                                        <Box flex={{ base: "1 1 100%", sm: "1 1 220px" }} minW={{ base: 0, sm: "220px" }} w={{ base: "100%", sm: "auto" }}>
                                            <Bullet
                                                data={[{
                                                    title: '',
                                                    ranges: [180, 200, 250, 300],
                                                    measures: [item.value],
                                                    target: 230
                                                }]}
                                                measureField="measures"
                                                rangeField="ranges"
                                                targetField="target"
                                                xField="title"
                                                label={{
                                                    measure: false
                                                }}
                                                color={{
                                                    range: ['#F56565', '#ED8936', '#48BB78', '#F56565'],
                                                    measure: baseColor,
                                                    target: '#2D3748'
                                                }}
                                                xAxis={{ line: null }}
                                                yAxis={false}
                                                size={{
                                                    range: 30,
                                                    measure: 20,
                                                    target: 20
                                                }}
                                                legend={false}
                                                animation={false}
                                                tooltip={false}
                                                height={40}
                                            />
                                        </Box>
                                        <Flex w={{ base: "100%", md: "130px" }} direction={{ base: "row", md: "column" }} flexWrap="wrap" columnGap={3} align={{ base: "baseline", md: "flex-end" }}>
                                            <Text fontSize="md" fontWeight={600} color={baseColor}>
                                                {formatNowText(item.value, 1, "V")}
                                            </Text>
                                            <Text fontSize="2xs" opacity={0.75} whiteSpace="nowrap">Min {formatMetricValue(item.minmax?.min, 1)}</Text>
                                            <Text fontSize="2xs" opacity={0.75} whiteSpace="nowrap">Avg {formatMetricValue(item.minmax?.avg, 1)}</Text>
                                            <Text fontSize="2xs" opacity={0.75} whiteSpace="nowrap">Max {formatMetricValue(item.minmax?.max, 1)}</Text>
                                        </Flex>
                                    </HStack>
                                );
                            })}
                            {/* L-N THD Section */}
                            <VStack spacing={3} mt={4} pt={4} borderTop="1px dashed" borderColor={border}>
                                <Text fontSize="xs" fontWeight={600} opacity={0.7} textTransform="uppercase" letterSpacing="wide">L-N THD</Text>
                                <SimpleGrid minChildWidth="110px" spacing={4} w="100%">
                                    <VoltTHDBar thd={hideNowValues ? 0 : now.R.voltTHD} label="L1" />
                                    <VoltTHDBar thd={hideNowValues ? 0 : now.S.voltTHD} label="L2" />
                                    <VoltTHDBar thd={hideNowValues ? 0 : now.T.voltTHD} label="L3" />
                                </SimpleGrid>
                            </VStack>
                        </VStack>

                        {/* L-L Voltages Column */}
                        <VStack align="stretch" spacing={3}>
                            <Text fontSize="xs" fontWeight={700} opacity={0.7} textTransform="uppercase" letterSpacing="wide" mb={1}>
                                Line to Line (L-L)
                            </Text>
                            {[
                                { label: 'L1-L2', value: now.R.lineVoltage, minmax: daily?.R?.lineVoltage },
                                { label: 'L2-L3', value: now.S.lineVoltage, minmax: daily?.S?.lineVoltage },
                                { label: 'L3-L1', value: now.T.lineVoltage, minmax: daily?.T?.lineVoltage }
                            ].map((item) => {
                                const baseColor = getLineVoltageColors(item.value)[0];

                                return (
                                    <HStack key={item.label} spacing={3} align="center" flexWrap="wrap" minH="72px">
                                        <Text minW="50px" fontSize="sm" fontWeight={600} flexShrink={0}>
                                            {item.label}
                                        </Text>
                                        <Box flex={{ base: "1 1 100%", sm: "1 1 220px" }} minW={{ base: 0, sm: "220px" }} w={{ base: "100%", sm: "auto" }}>
                                            <Bullet
                                                data={[{
                                                    title: '',
                                                    ranges: [320, 380, 440, 500],
                                                    measures: [item.value],
                                                    target: 400
                                                }]}
                                                label={{
                                                    measure: false
                                                }}
                                                measureField="measures"
                                                rangeField="ranges"
                                                targetField="target"
                                                xField="title"
                                                color={{
                                                    range: ['#F56565', '#ED8936', '#48BB78', '#F56565'],
                                                    measure: baseColor,
                                                    target: '#2D3748'
                                                }}
                                                xAxis={{ line: null }}
                                                yAxis={false}
                                                size={{
                                                    range: 30,
                                                    measure: 20,
                                                    target: 20
                                                }}
                                                legend={false}
                                                animation={false}
                                                tooltip={false}
                                                height={40}
                                            />
                                        </Box>
                                        <Flex w={{ base: "100%", md: "130px" }} direction={{ base: "row", md: "column" }} flexWrap="wrap" columnGap={3} align={{ base: "baseline", md: "flex-end" }}>
                                            <Text fontSize="md" fontWeight={600} color={baseColor}>
                                                {formatNowText(item.value, 1, "V")}
                                            </Text>
                                            <Text fontSize="2xs" opacity={0.75} whiteSpace="nowrap">Min {formatMetricValue(item.minmax?.min, 1)}</Text>
                                            <Text fontSize="2xs" opacity={0.75} whiteSpace="nowrap">Avg {formatMetricValue(item.minmax?.avg, 1)}</Text>
                                            <Text fontSize="2xs" opacity={0.75} whiteSpace="nowrap">Max {formatMetricValue(item.minmax?.max, 1)}</Text>
                                        </Flex>
                                    </HStack>
                                );
                            })}
                            {/* L-L THD Section */}
                            <VStack spacing={3} mt={4} pt={4} borderTop="1px dashed" borderColor={border}>
                                <Text fontSize="xs" fontWeight={600} opacity={0.7} textTransform="uppercase" letterSpacing="wide">L-L THD</Text>
                                <SimpleGrid minChildWidth="110px" spacing={4} w="100%">
                                    <VoltTHDBar thd={hideNowValues ? 0 : now.R.lineVoltageTHD} label="L1-L2" />
                                    <VoltTHDBar thd={hideNowValues ? 0 : now.S.lineVoltageTHD} label="L2-L3" />
                                    <VoltTHDBar thd={hideNowValues ? 0 : now.T.lineVoltageTHD} label="L3-L1" />
                                </SimpleGrid>
                            </VStack>
                        </VStack>
                    </SimpleGrid>
                </CardBody>
            </MyCard>

            {/* Current (Ampere) Card */}
            <MyCard w="100%" noPadding>
                <CardHeader
                    px={{ base: 3, md: 5 }}
                    py={{ base: 3, md: 4 }}
                    borderBottom="1px dashed"
                    borderColor={border}>
                    <HStack justify="space-between" flexWrap="wrap" gap={2}>
                        <Text fontSize="md" fontWeight={500}>
                            Current (Ampere)
                        </Text>
                        <HStack spacing={3} rowGap={1} fontSize="9px" opacity={0.6} flexWrap="wrap">
                            <HStack spacing={1}>
                                <Box w="6px" h="6px" borderRadius="full" bg="#48BB78" />
                                <Text>THD &lt;15%</Text>
                            </HStack>
                            <HStack spacing={1}>
                                <Box w="6px" h="6px" borderRadius="full" bg="#ED8936" />
                                <Text>15-30%</Text>
                            </HStack>
                            <HStack spacing={1}>
                                <Box w="6px" h="6px" borderRadius="full" bg="#F56565" />
                                <Text>&gt;30%</Text>
                            </HStack>
                        </HStack>
                    </HStack>
                </CardHeader>
                <CardBody p={{ base: 3, md: 5 }}>
                    <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
                        {[
                            { label: 'L1', value: now.R.amp },
                            { label: 'L2', value: now.S.amp },
                            { label: 'L3', value: now.T.amp }
                        ].map((item, index) => {
                            const percent = item.value / maxCurrent;
                            const phaseKey = index === 0 ? 'R' : index === 1 ? 'S' : 'T';
                            return (
                                <VStack key={item.label} spacing={1} w="100%" minW={0} align="stretch">
                                    <Box w="100%" minW={0} overflow="hidden">
                                    <Liquid
                                        percent={percent}
                                        outline={{
                                            border: 1,
                                            distance: 0,
                                            style: {
                                                stroke: colorMode === 'dark' ? '#4A5568' : '#E2E8F0'
                                            }
                                        }}
                                        wave={{
                                            length: 128
                                        }}
                                        shape="rect"
                                        statistic={{
                                            title: {
                                                formatter: () => item.label,
                                                style: {
                                                    fontSize: '14px',
                                                    fill: colorMode === 'dark' ? '#E2E8F0' : '#2D3748'
                                                }
                                            },
                                            content: {
                                                style: {
                                                    fontSize: '18px',
                                                    fontWeight: 600,
                                                    fill: colorMode === 'dark' ? '#FFFFFF' : '#1A202C'
                                                },
                                                formatter: () => (hideNowValues ? '--' : `${item.value.toFixed(3)} A`)
                                            }
                                        }}
                                        color={percent > 0.8 ? '#F56565' : percent > 0.6 ? '#ED8936' : '#48BB78'}
                                        animation={false}
                                        height={180}
                                    />
                                    </Box>
                                    <MinAvgMaxInline nowValue={item.value} minmax={daily?.[phaseKey as 'R' | 'S' | 'T']?.amp} decimals={3} unit="A" />
                                </VStack>
                            );
                        })}
                    </SimpleGrid>
                    {/* Current THD Section - Using memoized components */}
                    <VStack spacing={3} mt={4} pt={4} borderTop="1px dashed" borderColor={border}>
                        <Text fontSize="xs" fontWeight={600} opacity={0.7} textTransform="uppercase" letterSpacing="wide">Current THD</Text>
                        <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4} w="100%">
                            <AmpTHDBar thd={hideNowValues ? 0 : now.R.ampTHD} label="L1" />
                            <AmpTHDBar thd={hideNowValues ? 0 : now.S.ampTHD} label="L2" />
                            <AmpTHDBar thd={hideNowValues ? 0 : now.T.ampTHD} label="L3" />
                        </SimpleGrid>
                    </VStack>
                </CardBody>
            </MyCard>

            {/* Power Relationship Card - Combined kW/kVA/kVAR */}
            <MyCard w="100%" noPadding>
                <CardHeader
                    px={{ base: 3, md: 5 }}
                    py={{ base: 3, md: 4 }}
                    borderBottom="1px dashed"
                    borderColor={border}>
                    <HStack justify="space-between" flexWrap="wrap" gap={2}>
                        <Text fontSize="md" fontWeight={500}>
                            Power Relationship (kW / kVA / kVAR)
                        </Text>
                        <HStack spacing={{ base: 2, md: 4 }} rowGap={1} fontSize="xs" flexWrap="wrap">
                            <HStack spacing={1}>
                                <Box w={3} h={3} borderRadius="full" bg="#5B8FF9" />
                                <Text>Active (kW)</Text>
                            </HStack>
                            <HStack spacing={1}>
                                <Box w={3} h={3} borderRadius="full" bg="#61DDAA" />
                                <Text>Apparent (kVA)</Text>
                            </HStack>
                            <HStack spacing={1}>
                                <Box w={3} h={3} borderRadius="full" bg="#F6BD16" />
                                <Text>Reactive (kVAR)</Text>
                            </HStack>
                        </HStack>
                    </HStack>
                </CardHeader>
                <CardBody p={{ base: 3, md: 5 }}>
                    <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6}>
                        {[
                            { label: 'L1', phase: 'R' as const, R: now.R.power / 1000, S: now.R.apparentPower / 1000, T: Math.abs(now.R.reactivePower) / 1000 },
                            { label: 'L2', phase: 'S' as const, R: now.S.power / 1000, S: now.S.apparentPower / 1000, T: Math.abs(now.S.reactivePower) / 1000 },
                            { label: 'L3', phase: 'T' as const, R: now.T.power / 1000, S: now.T.apparentPower / 1000, T: Math.abs(now.T.reactivePower) / 1000 }
                        ].map((item) => {
                            const powerFactor = item.R / item.S;

                            return (
                                <VStack key={item.label} spacing={3} w="100%" minW={0} align="stretch">
                                    <Text fontSize="sm" fontWeight={600} textTransform="uppercase" letterSpacing="wide" textAlign="center">
                                        {item.label}
                                    </Text>
                                    <Box w="100%" minW={0} position="relative" overflow="hidden">
                                        <RadialBar
                                            data={[
                                                { name: 'Active', value: item.R },
                                                { name: 'Apparent', value: item.S },
                                                { name: 'Reactive', value: item.T }
                                            ]}
                                            xField="name"
                                            yField="value"
                                            maxAngle={270}
                                            radius={0.85}
                                            innerRadius={0.35}
                                            colorField="name"
                                            color={['#5B8FF9', '#61DDAA', '#F6BD16']}
                                            barStyle={{
                                                lineCap: 'round'
                                            }}
                                            tooltip={{
                                                formatter: (datum: any) => ({
                                                    name: datum.name,
                                                    value: `${datum.value.toFixed(3)} k${datum.name === 'Active' ? 'W' : datum.name === 'Apparent' ? 'VA' : 'VAR'}`
                                                })
                                            }}
                                            legend={false}
                                            animation={false}
                                            height={180}
                                        />
                                    </Box>
                                    <VStack spacing={3} w="100%" align="stretch">
                                        <PowerMetricRow
                                            color="#5B8FF9"
                                            label="Active"
                                            valueText={formatNowText(item.R, 3, "kW")}
                                            ratioPct={Math.min(100, Math.max(0, ((hideNowValues ? 0 : item.R) / maxApparentPower) * 100))}
                                            avgText={formatMetricValue(daily?.[item.phase]?.power ? daily[item.phase].power.avg / 1000 : undefined, 3)}
                                            maxText={formatMetricValue(daily?.[item.phase]?.power ? daily[item.phase].power.max / 1000 : undefined, 3)}
                                            trackBg={colorMode === 'dark' ? 'whiteAlpha.200' : 'blackAlpha.100'}
                                        />
                                        <PowerMetricRow
                                            color="#61DDAA"
                                            label="Apparent"
                                            valueText={formatNowText(item.S, 3, "kVA")}
                                            ratioPct={Math.min(100, Math.max(0, ((hideNowValues ? 0 : item.S) / maxApparentPower) * 100))}
                                            avgText={formatMetricValue(daily?.[item.phase]?.apparentPower ? daily[item.phase].apparentPower.avg / 1000 : undefined, 3)}
                                            maxText={formatMetricValue(daily?.[item.phase]?.apparentPower ? daily[item.phase].apparentPower.max / 1000 : undefined, 3)}
                                            trackBg={colorMode === 'dark' ? 'whiteAlpha.200' : 'blackAlpha.100'}
                                        />
                                        <PowerMetricRow
                                            color="#F6BD16"
                                            label="Reactive"
                                            valueText={formatNowText(item.T, 3, "kVAR")}
                                            ratioPct={Math.min(100, Math.max(0, ((hideNowValues ? 0 : item.T) / maxApparentPower) * 100))}
                                            avgText={formatMetricValue(daily?.[item.phase]?.reactivePower ? daily[item.phase].reactivePower.avg / 1000 : undefined, 3)}
                                            maxText={formatMetricValue(daily?.[item.phase]?.reactivePower ? daily[item.phase].reactivePower.max / 1000 : undefined, 3)}
                                            trackBg={colorMode === 'dark' ? 'whiteAlpha.200' : 'blackAlpha.100'}
                                        />
                                        <Box w="100%" pt={2} borderTop="1px solid" borderColor={colorMode === 'dark' ? 'gray.600' : 'gray.200'}>
                                            <HStack justify="space-between" w="100%" fontSize="xs">
                                                <Text opacity={0.7}>Power Factor:</Text>
                                                <Text fontWeight={700} color={Math.abs(powerFactor) > 0.9 ? '#48BB78' : Math.abs(powerFactor) > 0.75 ? '#ED8936' : '#F56565'}>
                                                    {hideNowValues ? "--" : powerFactor.toFixed(3)}
                                                </Text>
                                            </HStack>
                                        </Box>
                                    </VStack>
                                </VStack>
                            );
                        })}
                    </SimpleGrid>
                </CardBody>
            </MyCard>

            {/* Power Factor (PF) Card with Icons */}
            <MyCard w="100%" noPadding>
                <CardHeader
                    px={{ base: 3, md: 5 }}
                    py={{ base: 3, md: 4 }}
                    borderBottom="1px dashed"
                    borderColor={border}>
                    <HStack justify="space-between" flexWrap="wrap" gap={2}>
                        <Text fontSize="md" fontWeight={500}>
                            Power Factor (Leading/Lagging)
                        </Text>
                        <HStack spacing={{ base: 2, md: 4 }} rowGap={1} fontSize="xs" opacity={0.7} flexWrap="wrap">
                            <HStack spacing={1}>
                                <Icon as={MdTrendingUp} boxSize={4} color="#4299E1" />
                                <Text>-1.0 Leading</Text>
                            </HStack>
                            <HStack spacing={1}>
                                <Icon as={MdTrendingDown} boxSize={4} color="#ED8936" />
                                <Text>+1.0 Lagging</Text>
                            </HStack>
                        </HStack>
                    </HStack>
                </CardHeader>
                <CardBody p={{ base: 3, md: 5 }}>
                    <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
                        <VStack spacing={2} w="100%" minW={0} align="stretch">
                            <Text fontSize="sm" fontWeight={600} textTransform="uppercase" letterSpacing="wide" textAlign="center">
                                L1
                            </Text>
                            {hideNowValues ? (
                                <Flex h="200px" w="100%" align="center" justify="center" border="1px dashed" borderColor={border} borderRadius="md">
                                    <Text fontSize="3xl" fontWeight={700} opacity={0.35}>--</Text>
                                </Flex>
                            ) : (
                                <Box w="100%" minW={0} overflow="hidden"><Gauge {...gaugeConfigs.R.powerFactor} height={200} /></Box>
                            )}
                            <Box mt={2} w="100%">
                                <MinAvgMaxInline nowValue={now.R.powerFactor} minmax={daily?.R?.powerFactor} decimals={3} isPF />
                            </Box>
                        </VStack>
                        <VStack spacing={2} w="100%" minW={0} align="stretch">
                            <Text fontSize="sm" fontWeight={600} textTransform="uppercase" letterSpacing="wide" textAlign="center">
                                L2
                            </Text>
                            {hideNowValues ? (
                                <Flex h="200px" w="100%" align="center" justify="center" border="1px dashed" borderColor={border} borderRadius="md">
                                    <Text fontSize="3xl" fontWeight={700} opacity={0.35}>--</Text>
                                </Flex>
                            ) : (
                                <Box w="100%" minW={0} overflow="hidden"><Gauge {...gaugeConfigs.S.powerFactor} height={200} /></Box>
                            )}
                            <Box mt={2} w="100%">
                                <MinAvgMaxInline nowValue={now.S.powerFactor} minmax={daily?.S?.powerFactor} decimals={3} isPF />
                            </Box>
                        </VStack>
                        <VStack spacing={2} w="100%" minW={0} align="stretch">
                            <Text fontSize="sm" fontWeight={600} textTransform="uppercase" letterSpacing="wide" textAlign="center">
                                L3
                            </Text>
                            {hideNowValues ? (
                                <Flex h="200px" w="100%" align="center" justify="center" border="1px dashed" borderColor={border} borderRadius="md">
                                    <Text fontSize="3xl" fontWeight={700} opacity={0.35}>--</Text>
                                </Flex>
                            ) : (
                                <Box w="100%" minW={0} overflow="hidden"><Gauge {...gaugeConfigs.T.powerFactor} height={200} /></Box>
                            )}
                            <Box mt={2} w="100%">
                                <MinAvgMaxInline nowValue={now.T.powerFactor} minmax={daily?.T?.powerFactor} decimals={3} isPF />
                            </Box>
                        </VStack>
                    </SimpleGrid>

                    {/* Phase Relationship Waveforms */}
                    {powerFactorWaves && (
                        <VStack spacing={4} mt={6} pt={6} borderTop="1px dashed" borderColor={border}>
                            <Text fontSize="xs" fontWeight={600} opacity={0.7} textTransform="uppercase" letterSpacing="wide">
                                Voltage & Current Phase Relationship
                            </Text>
                            <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4} w="100%">
                                {/* L1 Waveform */}
                                <VStack spacing={2} align="stretch">
                                    <HStack justify="space-between" fontSize="xs" px={2} flexWrap="wrap" rowGap={0}>
                                        <Text fontWeight={600} opacity={0.8}>L1</Text>
                                        <HStack spacing={2}>
                                            <HStack spacing={1}>
                                                <Box w="12px" h="2px" bg="#4299E1" />
                                                <Text opacity={0.7}>Voltage</Text>
                                            </HStack>
                                            <HStack spacing={1}>
                                                <Box w="12px" h="2px" bg="#ED8936" />
                                                <Text opacity={0.7}>Current</Text>
                                            </HStack>
                                        </HStack>
                                    </HStack>
                                    <Box border="1px solid" borderColor={border} borderRadius="md" p={2}>
                                        {hideNowValues ? (
                                            <Flex h="120px" align="center" justify="center">
                                                <Text fontSize="2xl" fontWeight={700} opacity={0.35}>--</Text>
                                            </Flex>
                                        ) : (
                                            <Line
                                                data={powerFactorWaves.L1}
                                                xField="x"
                                                yField="value"
                                                seriesField="type"
                                                animation={false}
                                                smooth={true}
                                                height={120}
                                                xAxis={false}
                                                yAxis={false}
                                                legend={false}
                                                tooltip={false}
                                                color={['#4299E1', '#ED8936']}
                                                lineStyle={{ lineWidth: 2 }}
                                            />
                                        )}
                                    </Box>
                                    <Text fontSize="xs" textAlign="center" opacity={0.7}>
                                        {hideNowValues ? 'PF: --' : `${getPfDirectionLabel(now.R.powerFactor) ? `${getPfDirectionLabel(now.R.powerFactor)} • ` : ''}PF: ${Math.abs(now.R.powerFactor).toFixed(3)}`}
                                    </Text>
                                </VStack>

                                {/* L2 Waveform */}
                                <VStack spacing={2} align="stretch">
                                    <HStack justify="space-between" fontSize="xs" px={2} flexWrap="wrap" rowGap={0}>
                                        <Text fontWeight={600} opacity={0.8}>L2</Text>
                                        <HStack spacing={2}>
                                            <HStack spacing={1}>
                                                <Box w="12px" h="2px" bg="#4299E1" />
                                                <Text opacity={0.7}>Voltage</Text>
                                            </HStack>
                                            <HStack spacing={1}>
                                                <Box w="12px" h="2px" bg="#ED8936" />
                                                <Text opacity={0.7}>Current</Text>
                                            </HStack>
                                        </HStack>
                                    </HStack>
                                    <Box border="1px solid" borderColor={border} borderRadius="md" p={2}>
                                        {hideNowValues ? (
                                            <Flex h="120px" align="center" justify="center">
                                                <Text fontSize="2xl" fontWeight={700} opacity={0.35}>--</Text>
                                            </Flex>
                                        ) : (
                                            <Line
                                                data={powerFactorWaves.L2}
                                                xField="x"
                                                yField="value"
                                                seriesField="type"
                                                animation={false}
                                                smooth={true}
                                                height={120}
                                                xAxis={false}
                                                yAxis={false}
                                                legend={false}
                                                tooltip={false}
                                                color={['#4299E1', '#ED8936']}
                                                lineStyle={{ lineWidth: 2 }}
                                            />
                                        )}
                                    </Box>
                                    <Text fontSize="xs" textAlign="center" opacity={0.7}>
                                        {hideNowValues ? 'PF: --' : `${getPfDirectionLabel(now.S.powerFactor) ? `${getPfDirectionLabel(now.S.powerFactor)} • ` : ''}PF: ${Math.abs(now.S.powerFactor).toFixed(3)}`}
                                    </Text>
                                </VStack>

                                {/* L3 Waveform */}
                                <VStack spacing={2} align="stretch">
                                    <HStack justify="space-between" fontSize="xs" px={2} flexWrap="wrap" rowGap={0}>
                                        <Text fontWeight={600} opacity={0.8}>L3</Text>
                                        <HStack spacing={2}>
                                            <HStack spacing={1}>
                                                <Box w="12px" h="2px" bg="#4299E1" />
                                                <Text opacity={0.7}>Voltage</Text>
                                            </HStack>
                                            <HStack spacing={1}>
                                                <Box w="12px" h="2px" bg="#ED8936" />
                                                <Text opacity={0.7}>Current</Text>
                                            </HStack>
                                        </HStack>
                                    </HStack>
                                    <Box border="1px solid" borderColor={border} borderRadius="md" p={2}>
                                        {hideNowValues ? (
                                            <Flex h="120px" align="center" justify="center">
                                                <Text fontSize="2xl" fontWeight={700} opacity={0.35}>--</Text>
                                            </Flex>
                                        ) : (
                                            <Line
                                                data={powerFactorWaves.L3}
                                                xField="x"
                                                yField="value"
                                                seriesField="type"
                                                animation={false}
                                                smooth={true}
                                                height={120}
                                                xAxis={false}
                                                yAxis={false}
                                                legend={false}
                                                tooltip={false}
                                                color={['#4299E1', '#ED8936']}
                                                lineStyle={{ lineWidth: 2 }}
                                            />
                                        )}
                                    </Box>
                                    <Text fontSize="xs" textAlign="center" opacity={0.7}>
                                        {hideNowValues ? 'PF: --' : `${getPfDirectionLabel(now.T.powerFactor) ? `${getPfDirectionLabel(now.T.powerFactor)} • ` : ''}PF: ${Math.abs(now.T.powerFactor).toFixed(3)}`}
                                    </Text>
                                </VStack>
                            </SimpleGrid>
                        </VStack>
                    )}
                </CardBody>
            </MyCard>
        </VStack>
        </PeriodInfoContext.Provider>
    );
};

// Wrap component with React.memo to prevent unnecessary re-renders
// Component only re-renders when 'now', 'updated', or 'isOnline' props change
export default React.memo(RealTimeGauges, (prevProps, nextProps) => {
    // Custom comparison: only re-render if timestamp changes or online status changes
    // This prevents re-renders when parent updates but data hasn't changed
    return (
        prevProps.updated === nextProps.updated &&
        prevProps.isOnline === nextProps.isOnline &&
        prevProps.selectedDate === nextProps.selectedDate &&
        prevProps.daily === nextProps.daily &&
        prevProps.periodInfo === nextProps.periodInfo &&
        prevProps.optionLabels?.X1 === nextProps.optionLabels?.X1 &&
        prevProps.optionLabels?.X2 === nextProps.optionLabels?.X2 &&
        prevProps.optionLabels?.X3 === nextProps.optionLabels?.X3
    );
});
