import { Box, HStack, SimpleGrid, Text, VStack, Badge, useColorMode, Button } from "@chakra-ui/react";
import { useMemo, useState } from "react";
import dayjs from "../../../../../Components/Functions/dayjs";
import MyCard from "../../../../../Components/micro/Card";
import MyTooltip from "../../../../../Components/micro/MyTooltip";

type DigitalInterval = {
    high: number;
    low: number;
};

type DigitalValuesMap = Record<string, DigitalInterval[]>;

type InputsConfig = Record<string, any> & {
    production?: string;
};

type ProductionSectionProps = {
    selectedDate: string;
    border: string;
    digitalValues: DigitalValuesMap;
    digitalTotal?: number | null;
    inputsConfig?: InputsConfig;
};

type ClampedInterval = {
    start: number;
    end: number;
};

type OverlapEvent = {
    start: number;
    end: number;
};

type CountBucket = {
    start: number;
    end: number;
    count: number;
};

const clampIntervalsToDay = (intervals: DigitalInterval[], dayStartUnix: number, dayEndUnix: number): ClampedInterval[] => {
    return intervals
        .map((interval) => ({
            start: Math.max(dayStartUnix, Number(interval.high || 0)),
            end: Math.min(dayEndUnix, Number(interval.low || 0)),
        }))
        .filter((interval) => interval.end > interval.start)
        .sort((a, b) => a.start - b.start);
};

const findOverlapEvents = (primary: ClampedInterval[], secondary: ClampedInterval[]): OverlapEvent[] => {
    const overlaps: OverlapEvent[] = [];
    let i = 0;
    let j = 0;

    while (i < primary.length && j < secondary.length) {
        const p = primary[i];
        const s = secondary[j];

        const start = Math.max(p.start, s.start);
        const end = Math.min(p.end, s.end);

        if (end > start) {
            overlaps.push({ start, end });
        }

        if (p.end < s.end) {
            i += 1;
        } else {
            j += 1;
        }
    }

    return overlaps;
};

const formatUnix = (unix: number): string => dayjs.unix(unix).format("HH:mm:ss");

const formatDurationLabel = (seconds: number): string => {
    const safe = Math.max(0, Math.floor(seconds));
    if (safe < 60) return `${safe}s`;
    const minutes = Math.floor(safe / 60);
    const remSeconds = safe % 60;
    return `${minutes}m ${remSeconds}s`;
};

const timelineColorByKey = (key: string): string => {
    if (key === "X1") return "#3182CE";
    if (key === "X2") return "#38A169";
    if (key === "X3") return "#DD6B20";
    return "#805AD5";
};

const buildCountBuckets = (
    events: OverlapEvent[],
    startUnix: number,
    endUnix: number,
    bucketSec: number
): CountBucket[] => {
    const safeBucketSec = Math.max(60, bucketSec);
    const totalBuckets = Math.max(1, Math.ceil((endUnix - startUnix) / safeBucketSec));
    const buckets: CountBucket[] = Array.from({ length: totalBuckets }, (_, index) => {
        const bucketStart = startUnix + index * safeBucketSec;
        const bucketEnd = Math.min(endUnix, bucketStart + safeBucketSec);
        return {
            start: bucketStart,
            end: bucketEnd,
            count: 0,
        };
    });

    events.forEach((event) => {
        const midpoint = Math.floor((event.start + event.end) / 2);
        if (midpoint < startUnix || midpoint >= endUnix) return;
        const bucketIndex = Math.min(
            buckets.length - 1,
            Math.max(0, Math.floor((midpoint - startUnix) / safeBucketSec))
        );
        buckets[bucketIndex].count += 1;
    });

    return buckets;
};

const ProductionSection = ({ selectedDate, border, digitalValues, digitalTotal, inputsConfig }: ProductionSectionProps) => {
    const { colorMode } = useColorMode();
    const [zoomHours, setZoomHours] = useState(24);
    const [panPercent, setPanPercent] = useState(0);

    const dayStart = dayjs(selectedDate, "YYYYMMDD").startOf("day");
    const dayEnd = dayjs(selectedDate, "YYYYMMDD").endOf("day");
    const dayStartUnix = dayStart.unix();
    const dayEndUnix = dayEnd.unix();
    const dayDuration = Math.max(1, dayEndUnix - dayStartUnix);

    const ioKeys = Object.keys(digitalValues)
        .filter((key) => key.startsWith("X") && Array.isArray(digitalValues[key]))
        .sort();

    const configuredIoKeys = Object.keys(inputsConfig || {})
        .filter((key) => key.startsWith("X"))
        .sort();

    const displayIoKeys = ioKeys.length > 0 ? ioKeys : configuredIoKeys;

    const clampedByIo: Record<string, ClampedInterval[]> = displayIoKeys.reduce((acc, key) => {
        acc[key] = clampIntervalsToDay(digitalValues[key] || [], dayStartUnix, dayEndUnix);
        return acc;
    }, {} as Record<string, ClampedInterval[]>);

    const productionKey = typeof inputsConfig?.production === "string" ? inputsConfig.production : undefined;
    const seriesKey = productionKey && typeof inputsConfig?.[productionKey]?.series === "string"
        ? inputsConfig[productionKey].series
        : undefined;

    const productionIntervals = productionKey ? (clampedByIo[productionKey] || []) : [];
    const seriesIntervals = seriesKey ? (clampedByIo[seriesKey] || []) : [];

    const productionEvents = seriesKey
        ? findOverlapEvents(productionIntervals, seriesIntervals)
        : productionIntervals.map((i) => ({ start: i.start, end: i.end }));

    const productionCount = productionEvents.length;
    const rawPulseCount = productionIntervals.length;

    const visibleDurationSec = Math.max(3600, zoomHours * 3600);
    const maxPanSeconds = Math.max(0, dayDuration - visibleDurationSec);
    const visibleStartUnix = Math.floor(dayStartUnix + maxPanSeconds * panPercent);
    const visibleEndUnix = Math.min(dayEndUnix, visibleStartUnix + visibleDurationSec);
    const visibleRangeSec = Math.max(1, visibleEndUnix - visibleStartUnix);

    const tickStepHours = zoomHours <= 4 ? 1 : zoomHours <= 8 ? 2 : zoomHours <= 16 ? 4 : 6;
    const tickStepSec = tickStepHours * 3600;

    const windowTicks = useMemo(() => {
        const firstTick = Math.ceil(visibleStartUnix / tickStepSec) * tickStepSec;
        const ticks: number[] = [];
        for (let ts = firstTick; ts <= visibleEndUnix; ts += tickStepSec) {
            ticks.push(ts);
        }
        return ticks;
    }, [visibleStartUnix, visibleEndUnix, tickStepSec]);

    const toWindowPercent = (unix: number) => ((unix - visibleStartUnix) / visibleRangeSec) * 100;

    const visibleIntervals = (intervals: ClampedInterval[]) =>
        intervals
            .map((interval) => ({
                start: Math.max(interval.start, visibleStartUnix),
                end: Math.min(interval.end, visibleEndUnix),
                rawStart: interval.start,
                rawEnd: interval.end,
            }))
            .filter((interval) => interval.end > interval.start);

    const visibleProductionEvents = productionEvents.filter(
        (event) => event.end > visibleStartUnix && event.start < visibleEndUnix
    );

    const countBuckets = useMemo(
        () => buildCountBuckets(visibleProductionEvents, visibleStartUnix, visibleEndUnix, tickStepSec),
        [visibleProductionEvents, visibleStartUnix, visibleEndUnix, tickStepSec]
    );

    const maxBucketCount = Math.max(1, ...countBuckets.map((bucket) => bucket.count));

    return (
        <VStack align="stretch" spacing={4}>
            <MyCard noPadding>
                <Box p={4}>
                    <HStack justify="space-between" flexWrap="wrap" gap={3} mb={4}>
                        <VStack align="start" spacing={0}>
                            <Text fontSize="md" fontWeight={700}>Production Timeline</Text>
                            <Text fontSize="xs" opacity={0.65}>
                                IO activity timeline and shot count derived from machine IO mapping
                            </Text>
                        </VStack>
                        <Badge colorScheme="blue" variant="subtle" fontSize="xs">
                            {dayStart.format("DD MMM YYYY")}
                        </Badge>
                    </HStack>

                    <Box border="1px dashed" borderColor={border} borderRadius="md" p={3} mb={4}>
                        <HStack justify="space-between" flexWrap="wrap" gap={3} mb={2}>
                            <Text fontSize="xs" fontWeight={700} textTransform="uppercase" letterSpacing="wide" opacity={0.75}>
                                Timeline Controls
                            </Text>
                            <Badge variant="subtle" colorScheme="purple">
                                Window: {zoomHours}h ({formatUnix(visibleStartUnix)} - {formatUnix(visibleEndUnix)})
                            </Badge>
                        </HStack>

                        <HStack spacing={2} mb={2}>
                            <Button size="xs" onClick={() => {
                                const next = Math.min(24, zoomHours + 2);
                                setZoomHours(next);
                                setPanPercent((prev) => (next === 24 ? 0 : prev));
                            }}>
                                Zoom Out
                            </Button>
                            <Button size="xs" onClick={() => setZoomHours((prev) => Math.max(2, prev - 2))}>
                                Zoom In
                            </Button>
                            <Button size="xs" variant="outline" onClick={() => {
                                setZoomHours(24);
                                setPanPercent(0);
                            }}>
                                Reset View
                            </Button>
                        </HStack>

                        <VStack align="stretch" spacing={1}>
                            <Text fontSize="2xs" opacity={0.7}>Pan</Text>
                            <Box
                                as="input"
                                type="range"
                                w="100%"
                                min={0}
                                max={100}
                                step={1}
                                value={Math.round(panPercent * 100)}
                                onChange={(event: any) => setPanPercent(Number(event.target.value) / 100)}
                                disabled={zoomHours >= 24}
                            />
                        </VStack>
                    </Box>

                    <SimpleGrid columns={{ base: 1, md: 3 }} spacing={3} mb={4}>
                        <Box border="1px dashed" borderColor={border} borderRadius="md" p={3}>
                            <Text fontSize="xs" opacity={0.7} mb={1}>Computed Production</Text>
                            <Text fontSize="2xl" fontWeight={700}>{productionCount}</Text>
                            <Text fontSize="2xs" opacity={0.6}>
                                {seriesKey
                                    ? `${productionKey || "-"} AND ${seriesKey} overlap events`
                                    : `${productionKey || "N/A"} pulse windows`}
                            </Text>
                        </Box>
                        <Box border="1px dashed" borderColor={border} borderRadius="md" p={3}>
                            <Text fontSize="xs" opacity={0.7} mb={1}>Primary Pulses</Text>
                            <Text fontSize="2xl" fontWeight={700}>{rawPulseCount}</Text>
                            <Text fontSize="2xs" opacity={0.6}>Raw count from {productionKey || "production input"}</Text>
                        </Box>
                        <Box border="1px dashed" borderColor={border} borderRadius="md" p={3}>
                            <Text fontSize="xs" opacity={0.7} mb={1}>Reported Total</Text>
                            <Text fontSize="2xl" fontWeight={700}>{digitalTotal ?? 0}</Text>
                            <Text fontSize="2xs" opacity={0.6}>From daily digital_values.total</Text>
                        </Box>
                    </SimpleGrid>

                    <Box border="1px dashed" borderColor={border} borderRadius="md" p={3} mb={4}>
                        <HStack justify="space-between" flexWrap="wrap" mb={2}>
                            <VStack align="start" spacing={0}>
                                <Text fontSize="xs" fontWeight={700} textTransform="uppercase" letterSpacing="wide" opacity={0.75}>
                                    Series Count Visualization
                                </Text>
                                <Text fontSize="2xs" opacity={0.65}>
                                    {seriesKey
                                        ? `Counted only when ${productionKey} overlaps ${seriesKey}`
                                        : `Counted from ${productionKey || "production input"} pulses`}
                                </Text>
                            </VStack>
                            <Badge colorScheme="green" variant="subtle">
                                {visibleProductionEvents.length} shots in window
                            </Badge>
                        </HStack>

                        <HStack align="end" spacing={1} h="92px" border="1px solid" borderColor={border} borderRadius="md" p={2}>
                            {countBuckets.map((bucket, idx) => {
                                const barHeight = bucket.count === 0 ? 4 : Math.max(10, (bucket.count / maxBucketCount) * 74);
                                return (
                                    <MyTooltip
                                        key={`bucket-${idx}`}
                                        label={`${dayjs.unix(bucket.start).format("HH:mm")} - ${dayjs.unix(bucket.end).format("HH:mm")}\nSeries shots: ${bucket.count}`}
                                    >
                                        <Box
                                            flex={1}
                                            h={`${barHeight}px`}
                                            borderRadius="sm"
                                            bg={bucket.count > 0 ? "green.400" : (colorMode === "dark" ? "whiteAlpha.200" : "blackAlpha.200")}
                                            cursor="pointer"
                                            opacity={bucket.count > 0 ? 0.95 : 0.6}
                                        />
                                    </MyTooltip>
                                );
                            })}
                        </HStack>
                    </Box>

                    <VStack align="stretch" spacing={3}>
                        {displayIoKeys.length === 0 && (
                            <Box border="1px dashed" borderColor={border} borderRadius="md" p={6} textAlign="center">
                                <Text opacity={0.7}>No digital IO timeline available for selected date.</Text>
                            </Box>
                        )}

                        {displayIoKeys.map((ioKey) => {
                            const label = typeof inputsConfig?.[ioKey]?.label === "string"
                                ? inputsConfig[ioKey].label
                                : ioKey;
                            const rowColor = timelineColorByKey(ioKey);
                            const events = clampedByIo[ioKey] || [];
                            const visibleEvents = visibleIntervals(events);

                            return (
                                <VStack key={ioKey} align="stretch" spacing={1}>
                                    <HStack justify="space-between">
                                        <Text fontSize="sm" fontWeight={600}>{label}</Text>
                                        <HStack spacing={2}>
                                            <Badge variant="outline" colorScheme="gray">{ioKey}</Badge>
                                            <Badge variant="subtle" colorScheme="blue">{events.length} pulses</Badge>
                                        </HStack>
                                    </HStack>

                                    <Box
                                        position="relative"
                                        h="34px"
                                        border="1px solid"
                                        borderColor={border}
                                        borderRadius="md"
                                        bg={colorMode === "dark" ? "whiteAlpha.50" : "blackAlpha.50"}
                                        overflow="hidden"
                                    >
                                        {windowTicks.map((tickTs) => {
                                            const left = toWindowPercent(tickTs);
                                            return (
                                                <Box
                                                    key={`${ioKey}-tick-${tickTs}`}
                                                    position="absolute"
                                                    left={`${left}%`}
                                                    top={0}
                                                    bottom={0}
                                                    w="1px"
                                                    bg={colorMode === "dark" ? "whiteAlpha.300" : "blackAlpha.300"}
                                                />
                                            );
                                        })}

                                        {visibleEvents.map((interval, index) => {
                                            const left = toWindowPercent(interval.start);
                                            const width = Math.max(((interval.end - interval.start) / visibleRangeSec) * 100, 0.2);

                                            return (
                                                <MyTooltip
                                                    key={`${ioKey}-${index}`}
                                                    label={`${label} (${ioKey})\n${formatUnix(interval.rawStart)} - ${formatUnix(interval.rawEnd)}\nDuration: ${formatDurationLabel(interval.rawEnd - interval.rawStart)}`}
                                                >
                                                    <Box
                                                        position="absolute"
                                                        left={`${left}%`}
                                                        top="6px"
                                                        h="22px"
                                                        width={`${width}%`}
                                                        minW="2px"
                                                        borderRadius="sm"
                                                        bg={rowColor}
                                                        opacity={0.85}
                                                        cursor="pointer"
                                                    />
                                                </MyTooltip>
                                            );
                                        })}
                                    </Box>
                                </VStack>
                            );
                        })}

                        {productionCount > 0 && (
                            <VStack align="stretch" spacing={1} pt={1}>
                                <HStack justify="space-between">
                                    <Text fontSize="sm" fontWeight={700}>Production Shots</Text>
                                    <Badge colorScheme="green" variant="subtle">{productionCount} shots</Badge>
                                </HStack>
                                <Box
                                    position="relative"
                                    h="28px"
                                    border="1px solid"
                                    borderColor={border}
                                    borderRadius="md"
                                    bg={colorMode === "dark" ? "green.900" : "green.50"}
                                    overflow="hidden"
                                >
                                    {visibleProductionEvents.map((event, index) => {
                                        const midpoint = (event.start + event.end) / 2;
                                        const left = toWindowPercent(Math.max(visibleStartUnix, Math.min(visibleEndUnix, midpoint)));

                                        return (
                                            <MyTooltip
                                                key={`shot-${index}`}
                                                label={`Shot ${index + 1}\n${formatUnix(event.start)} - ${formatUnix(event.end)}\nDuration: ${formatDurationLabel(event.end - event.start)}`}
                                            >
                                                <Box
                                                    position="absolute"
                                                    left={`calc(${left}% - 3px)`}
                                                    top="9px"
                                                    w="6px"
                                                    h="10px"
                                                    borderRadius="full"
                                                    bg="green.500"
                                                    cursor="pointer"
                                                />
                                            </MyTooltip>
                                        );
                                    })}
                                </Box>
                            </VStack>
                        )}

                        <HStack justify="space-between" fontSize="2xs" opacity={0.65} pt={1}>
                            {windowTicks.map((tickTs) => (
                                <Text key={`axis-${tickTs}`}>{dayjs.unix(tickTs).format("HH:mm")}</Text>
                            ))}
                        </HStack>
                    </VStack>
                </Box>
            </MyCard>
        </VStack>
    );
};

export default ProductionSection;
