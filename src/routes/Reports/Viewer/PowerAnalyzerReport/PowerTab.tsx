import React, { useMemo, useState } from "react";
import {
    Box,
    Text,
    useColorMode,
    Flex,
    Divider,
    Select,
    Center,
} from "@chakra-ui/react";
import { Line } from "@ant-design/plots";
import dayjs from "../../../../Components/Functions/dayjs";
import secToTime from "../../../../Components/Functions/converters/secondsToHourMin";
import MyCard from "../../../../Components/micro/Card";
import PhaseSummaryTable from "./PhaseSummaryTable";
import HourlyBreakdownTable from "./HourlyBreakdownTable";
import { POWER_METRICS } from "../../../../Components/Functions/powerTransformers";

interface PowerTabProps {
    data: any;
    isSingleDay: boolean;
}

const PowerTab = ({ data, isSingleDay }: PowerTabProps) => {
    const { colorMode } = useColorMode();
    const border = `${colorMode}.border`;
    const [chartMetric, setChartMetric] = useState<"power" | "voltage" | "current" | "pf">("power");
    const [selectedDay, setSelectedDay] = useState<number>(0);

    const dayRecord = useMemo(() => {
        if (isSingleDay) return data.phase_values;
        return data.allDays[selectedDay]?.phase_values || null;
    }, [data, isSingleDay, selectedDay]);

    const hourlyChartData = useMemo(() => {
        const voltage: any[] = [];
        const current: any[] = [];
        const power: any[] = [];
        const pf: any[] = [];

        [...data.allHours]
            .filter((h) => h && h.from !== undefined)
            .sort((a, b) => a.from - b.from)
            .forEach((hour) => {
                const time = secToTime(hour.from);
                const phases = ["SUM", "R", "S", "T"] as const;

                phases.forEach((phase) => {
                    const phaseData = hour.phase_values?.[phase];
                    if (!phaseData) return;

                    const label = phase === "SUM" ? "Total" : `Phase ${phase}`;

                    if (phaseData.volt) {
                        voltage.push({ time, value: phaseData.volt.avg, phase: label });
                    }
                    if (phaseData.amp) {
                        current.push({ time, value: phaseData.amp.avg, phase: label });
                    }
                    if (phaseData.power) {
                        power.push({ time, value: phaseData.power.avg / 1000, phase: label });
                    }
                    if (phaseData.powerFactor) {
                        pf.push({ time, value: phaseData.powerFactor.avg, phase: label });
                    }
                });
            });

        return { voltage, current, power, pf };
    }, [data.allHours]);

    const dailyChartData = useMemo(() => {
        const voltage: any[] = [];
        const current: any[] = [];
        const power: any[] = [];
        const pf: any[] = [];

        [...data.allDays]
            .sort((a, b) => dayjs(a.date).unix() - dayjs(b.date).unix())
            .forEach((day) => {
                const label = dayjs(day.date).format("D MMM");
                const phaseData = day.phase_values?.SUM;
                if (!phaseData) return;

                if (phaseData.volt) {
                    voltage.push({ date: label, value: phaseData.volt.avg, category: "Voltage Avg" });
                    voltage.push({ date: label, value: phaseData.volt.max, category: "Voltage Max" });
                }
                if (phaseData.amp) {
                    current.push({ date: label, value: phaseData.amp.avg, category: "Current Avg" });
                    current.push({ date: label, value: phaseData.amp.max, category: "Current Max" });
                }
                if (phaseData.power) {
                    power.push({ date: label, value: phaseData.power.avg / 1000, category: "Power Avg" });
                    power.push({ date: label, value: phaseData.power.max / 1000, category: "Power Max" });
                }
                if (phaseData.powerFactor) {
                    pf.push({ date: label, value: phaseData.powerFactor.avg, category: "PF Avg" });
                }
            });

        return { voltage, current, power, pf };
    }, [data.allDays]);

    const activeChartConfig = useMemo(() => {
        const cData = isSingleDay ? hourlyChartData[chartMetric] : dailyChartData[chartMetric];
        const xF = isSingleDay ? "time" : "date";
        const seriesF = isSingleDay ? "phase" : "category";

        let yLabel = "";
        switch (chartMetric) {
            case "voltage": yLabel = "V"; break;
            case "current": yLabel = "A"; break;
            case "power": yLabel = "kW"; break;
            case "pf": yLabel = ""; break;
        }

        return {
            data: cData,
            xField: xF,
            yField: "value",
            seriesField: seriesF,
            smooth: true,
            animation: false,
            legend: { position: "bottom" as const },
            xAxis: { label: { autoRotate: true, autoHide: true } },
            point: { size: 3, shape: "circle" },
            lineStyle: { lineWidth: 2 },
            yAxis: {
                label: {
                    formatter: (v: string) => `${parseFloat(v).toFixed(1)} ${yLabel}`
                }
            },
            tooltip: {
                formatter: (datum: any) => ({
                    name: datum[seriesF],
                    value: `${parseFloat(datum.value).toFixed(2)} ${yLabel}`
                })
            }
        };
    }, [chartMetric, isSingleDay, hourlyChartData, dailyChartData]);

    if (!dayRecord) {
        return (
            <Box p={5} textAlign="center">
                <Text opacity={0.7}>No power telemetry data found for the selected device.</Text>
            </Box>
        );
    }

    return (
        <Flex flexDir="column" gap={6}>
            {isSingleDay ? (
                <>
                    <PhaseSummaryTable
                        metrics={POWER_METRICS}
                        phaseData={dayRecord}
                        title="Daily Power Summary"
                    />

                    <MyCard border="1px solid" borderColor={border} p={4}>
                        <Flex justify="space-between" align="center" mb={4} flexWrap="wrap" gap={3}>
                            <Text fontWeight="600" fontSize="sm">Hourly Parameters Trend</Text>
                            <Select
                                size="sm"
                                w={{ base: "100%", sm: "180px" }}
                                value={chartMetric}
                                onChange={(e) => setChartMetric(e.target.value as any)}
                                focusBorderColor="primary"
                            >
                                <option value="power">Active Power (kW)</option>
                                <option value="voltage">Voltage LN (V)</option>
                                <option value="current">Current (A)</option>
                                <option value="pf">Power Factor</option>
                            </Select>
                        </Flex>
                        <Divider mb={4} />
                        <Box h="280px" w="100%">
                            {activeChartConfig.data.length > 0 ? (
                                <Line {...activeChartConfig} />
                            ) : (
                                <Center h="100%">
                                    <Text opacity={0.6} fontSize="xs">No trend data available.</Text>
                                </Center>
                            )}
                        </Box>
                    </MyCard>

                    <HourlyBreakdownTable
                        allHours={data.allHours}
                        title="Hourly Power Details"
                        metrics={POWER_METRICS}
                    />
                </>
            ) : (
                <>
                    <MyCard border="1px solid" borderColor={border} p={4}>
                        <Flex justify="space-between" align="center" mb={4} flexWrap="wrap" gap={3}>
                            <Text fontWeight="600" fontSize="sm">Daily Trend Analysis</Text>
                            <Select
                                size="sm"
                                w={{ base: "100%", sm: "180px" }}
                                value={chartMetric}
                                onChange={(e) => setChartMetric(e.target.value as any)}
                                focusBorderColor="primary"
                            >
                                <option value="power">Active Power (kW)</option>
                                <option value="voltage">Voltage LN (V)</option>
                                <option value="current">Current (A)</option>
                                <option value="pf">Power Factor</option>
                            </Select>
                        </Flex>
                        <Divider mb={4} />
                        <Box h="280px" w="100%">
                            {activeChartConfig.data.length > 0 ? (
                                <Line {...activeChartConfig} />
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
                        metrics={POWER_METRICS}
                        phaseData={dayRecord}
                        title={`Power Summary - ${dayjs(data.allDays[selectedDay]?.date).format("DD MMM, YYYY")}`}
                    />
                </>
            )}
        </Flex>
    );
};

export default PowerTab;