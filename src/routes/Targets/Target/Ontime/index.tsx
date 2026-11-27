import { Box, Center, Icon, SimpleGrid, Text, useColorMode } from "@chakra-ui/react"
import { Line, LineConfig, Pie, PieConfig } from '@ant-design/plots'
import { DataToSet } from "..";
import { useMemo } from "react";
import secFormatter from "../../../../Components/Functions/formatters/secFormatter";
import { FiClock } from "react-icons/fi";

const Ontime = ({
    hours
}: {
    hours: DataToSet["hours"]
}) => {
    const { colorMode } = useColorMode();
    const { subText } = useMemo(() => ({
        subText: `${colorMode}.subText`
    }), [colorMode]);

    const [data, distribution]: [{
        time: string;
        value: number;
        series: string;
    }[], {
        type: string;
        value: number;
    }[]] = useMemo(() => {
        const data: [{
            time: string;
            value: number;
            series: string;
        }] = [] as any;
        let ontime = 0;
        let downtime = 0;
        hours.forEach(hour => {
            const time = `${hour.date} | ${hour.time}`;
            ontime += hour.ontime;
            downtime += hour.downtime;
            data.push({
                time,
                value: hour.ontime,
                series: "Ontime"
            });
            data.push({
                time,
                value: hour.downtime,
                series: "Downtime"
            });
        });
        const distribution = [{
            type: "Ontime",
            value: ontime
        }, {
            type: "Downtime",
            value: downtime
        }];
        return [data, distribution];
    }, [hours]);

    const config: LineConfig = {
        data,
        color: ["#0d9f8b", "#e95e44"],
        xField: 'time',
        height: 280,
        animation: false,
        lineStyle: {
            lineWidth: 2,
        },
        yAxis: {
            label: {
                formatter: (v: any) => {
                    return secFormatter(v)
                }
            }
        },
        xAxis: {
            range: [0, 1],
        },
        tooltip: {
            formatter: (v: any) => {
                return {
                    name: v.series,
                    value: secFormatter(v.value)
                }
            }
        },
        slider: {
          start: 0,
          end: 1,
        },
        yField: 'value',
        seriesField: 'series',
        stepType: 'hvh',
    };

    const pieConfig: PieConfig = {
        appendPadding: 10,
        data: distribution,
        color: ["#0d9f8b", "#e95e44"],
        height: 280,
        angleField: 'value',
        colorField: 'type',
        radius: 1,
        innerRadius: 0.6,
        animation: false,
        tooltip: {
            formatter: (v: any) => {
                return {
                    name: v.type,
                    value: secFormatter(v.value)
                }
            }
        },
        label: {
            type: 'inner',
            offset: '-30%',
            content: ({ percent }) => `${(percent * 100).toFixed(0)}%`,
            style: {
                fontSize: 14,
                textAlign: 'center',
            },
        },
        interactions: [
            {
                type: 'element-active',
            },
        ],
        statistic: {
            title: false,
            content: {
                style: {
                    whiteSpace: 'pre-wrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    fontSize: '14px',
                    fontWeight: 600,
                    color: subText
                },
                content: 'Timings',
            },
        },
    };

    if (hours.length === 0) {
        return (
            <Center p={8} flexDir="column">
                <Box
                    p={3}
                    borderRadius="full"
                    bg={colorMode === "dark" ? "whiteAlpha.100" : "gray.100"}
                    color="gray.400"
                    mb={2}
                >
                    <Icon as={FiClock} fontSize="2xl" />
                </Box>
                <Text fontWeight={700} fontSize="sm">
                    No Runtime Logged Today
                </Text>
                <Text fontSize="xs" color={subText}>
                    Waiting for telemetry data from machine sensors.
                </Text>
            </Center>
        );
    }

    return <SimpleGrid
        alignItems={"center"}
        columns={{
            base: 1,
            lg: 2
        }} gap={3}>
        <Pie {...pieConfig} />
        <Line {...config} />
    </SimpleGrid>
}

export default Ontime