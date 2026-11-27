import React, { useMemo } from "react";
import {
    Box,
    SimpleGrid,
    Text,
    useColorMode,
    Flex,
    Divider,
    Stat,
    StatLabel,
    StatNumber,
    Center,
} from "@chakra-ui/react";
import { Area, Column } from "@ant-design/plots";
import dayjs from "../../../../Components/Functions/dayjs";
import secToTime from "../../../../Components/Functions/converters/secondsToHourMin";
import MyCard from "../../../../Components/micro/Card";
import { formatVal } from "../../../../Components/Functions/powerTransformers";

interface AccumulatorsTabProps {
    data: any;
    isSingleDay: boolean;
}

const AccumulatorStatCard = ({
    label,
    value,
    unit,
    color = "orange"
}: {
    label: string;
    value: number | undefined;
    unit: string;
    color?: string;
}) => {
    const { colorMode } = useColorMode();
    const border = `${colorMode}.border`;

    return (
        <MyCard p={4} border="1px solid" borderColor={border}>
            <Stat>
                <StatLabel fontSize="xs" fontWeight="600" opacity={0.8} mb={1}>
                    {label}
                </StatLabel>
                <StatNumber fontSize="xl" fontWeight="700" color={`${color}.500`} display="flex" alignItems="baseline" gap={1}>
                    {formatVal(value, 3)}
                    <Text as="span" fontSize="xs" fontWeight="500" color={`${colorMode}.subText`}>
                        {unit}
                    </Text>
                </StatNumber>
            </Stat>
        </MyCard>
    );
};

const AccumulatorsTab = ({ data, isSingleDay }: AccumulatorsTabProps) => {
    const { colorMode } = useColorMode();
    const border = `${colorMode}.border`;

    const accumulators = useMemo(() => {
        if (isSingleDay) return data.accumulators || null;
        const sortedDays = [...data.allDays].sort((a, b) => dayjs(b.date).unix() - dayjs(a.date).unix());
        return sortedDays.find(d => !!d.accumulators)?.accumulators || null;
    }, [data, isSingleDay]);

    const hourlyGrowthData = useMemo(() => {
        const growth: any[] = [];
        let runningSum = 0;

        [...data.allHours]
            .filter((h) => h && h.from !== undefined)
            .sort((a, b) => a.from - b.from)
            .forEach((hour) => {
                const time = secToTime(hour.from);
                const hourlyEnergy = hour.accumulators?.SUM_WH_Total !== undefined
                    ? hour.accumulators.SUM_WH_Total
                    : (hour.phase_values?.SUM?.consumption ||
                       (hour.electricity_usage !== undefined ? hour.electricity_usage : 0));

                runningSum += hourlyEnergy;
                growth.push({
                    time,
                    value: runningSum,
                    category: "Cumulative Active Energy"
                });
            });

        return growth;
    }, [data.allHours]);

    const dailyConsumptionData = useMemo(() => {
        const consumption: any[] = [];

        [...data.allDays]
            .sort((a, b) => dayjs(a.date).unix() - dayjs(b.date).unix())
            .forEach((day) => {
                const label = dayjs(day.date).format("D MMM");
                const dailyEnergy = day.phase_values?.SUM?.consumption ||
                    (day.electricity !== undefined ? day.electricity : 0);

                consumption.push({
                    date: label,
                    value: dailyEnergy,
                });
            });

        return consumption;
    }, [data.allDays]);

    const areaChartConfig = useMemo(() => ({
        data: hourlyGrowthData,
        xField: "time",
        yField: "value",
        seriesField: "category",
        smooth: true,
        animation: false,
        color: "#ED8936",
        areaStyle: { fillOpacity: 0.15 },
        point: { size: 3, shape: "circle" },
        yAxis: {
            label: {
                formatter: (v: string) => `${parseFloat(v).toFixed(2)} kWh`
            }
        },
        tooltip: {
            formatter: (datum: any) => ({
                name: datum.category,
                value: `${parseFloat(datum.value).toFixed(3)} kWh`
            })
        }
    }), [hourlyGrowthData]);

    const columnChartConfig = useMemo(() => ({
        data: dailyConsumptionData,
        xField: "date",
        yField: "value",
        color: "#ED8936",
        columnStyle: {
            radius: [4, 4, 0, 0],
        },
        yAxis: {
            label: {
                formatter: (v: string) => `${parseFloat(v).toFixed(2)} kWh`
            }
        },
        tooltip: {
            formatter: (datum: any) => ({
                name: "Daily Energy",
                value: `${parseFloat(datum.value).toFixed(3)} kWh`
            })
        }
    }), [dailyConsumptionData]);

    if (!accumulators) {
        return (
            <Box p={5} textAlign="center">
                <Text opacity={0.7}>No energy accumulator data found for the selected device.</Text>
            </Box>
        );
    }

    const cards = [
        { label: "Active Energy (Total)", value: accumulators.SUM_WH_Total, unit: "kWh", color: "orange" },
        { label: "Active Energy (Import)", value: accumulators.SUM_WH_Import, unit: "kWh", color: "orange" },
        { label: "Active Energy (Export)", value: accumulators.SUM_WH_Export, unit: "kWh", color: "orange" },
        { label: "Apparent Energy", value: accumulators.SUM_VAH, unit: "kVAh", color: "blue" },
        { label: "Reactive Energy (Total)", value: accumulators.SUM_VarH_Total, unit: "kVARh", color: "purple" },
        { label: "Reactive Energy (Inductive)", value: accumulators.SUM_VarH_Ind, unit: "kVARh", color: "purple" },
        { label: "Reactive Energy (Capacitive)", value: accumulators.SUM_VarH_Cap, unit: "kVARh", color: "purple" }
    ];

    return (
        <Flex flexDir="column" gap={6}>
            <SimpleGrid columns={{ base: 1, sm: 2, md: 3, xl: 4 }} gap={4}>
                {cards.map((c, idx) => {
                    if (c.value === undefined || c.value === null) return null;
                    return (
                        <AccumulatorStatCard
                            key={idx}
                            label={c.label}
                            value={c.value}
                            unit={c.unit}
                            color={c.color}
                        />
                    );
                })}
            </SimpleGrid>

            <MyCard border="1px solid" borderColor={border} p={4}>
                <Flex justify="space-between" align="center" mb={4}>
                    <Text fontWeight="600" fontSize="sm">
                        {isSingleDay ? "Hourly Energy Accumulation Curve" : "Daily Active Energy Consumption"}
                    </Text>
                </Flex>
                <Divider mb={4} />
                <Box h="280px" w="100%">
                    {isSingleDay ? (
                        hourlyGrowthData.length > 0 ? (
                            <Area {...areaChartConfig} />
                        ) : (
                            <Center h="100%">
                                <Text opacity={0.6} fontSize="xs">No active energy data recorded for selected period.</Text>
                            </Center>
                        )
                    ) : (
                        dailyConsumptionData.length > 0 ? (
                            <Column {...columnChartConfig} />
                        ) : (
                            <Center h="100%">
                                <Text opacity={0.6} fontSize="xs">No daily energy data recorded.</Text>
                            </Center>
                        )
                    )}
                </Box>
            </MyCard>
        </Flex>
    );
};

export default AccumulatorsTab;
