import { CardHeader, Center, CircularProgress, CircularProgressLabel, GridItem, SimpleGrid, Text, useColorMode, VStack } from '@chakra-ui/react';
import { useMemo, useState } from 'react';
import { DataToSet } from '.';
import MyCard from '../../../../Components/micro/Card';
import { DualAxes, DualAxesConfig, Line, LineConfig } from '@ant-design/plots';
import { viewAll } from '../FactoryReport/Machine/MachineBreakdown/PieChart';
import CustomSelector from '../../../../Components/micro/CustomSelector';
import secFormatter from '../../../../Components/Functions/formatters/secFormatter';
import IsScreenSmall from '../../../../Components/Store/hooks/IsScreenSmall';
import dayjs from '../../../../Components/Functions/dayjs';

const Charts = ({
    data
}: {
    data: DataToSet
}) => {
    const [show, setShow] = useState<"Production" | "Efficiency">("Production");
    const { colorMode } = useColorMode();
    const { border, subText } = useMemo(() => ({
        border: `${colorMode}.border`,
        subText: `${colorMode}.subText`
    }), [colorMode]);
    const isBelow1400 = IsScreenSmall(1400);

    const [productionChart, timingData, efficiencyData, efficiency] = useMemo(() => {
        const productionChart: {
            time: string;
            value: number;
            type: 'Act' | 'Exp';
        }[] = [];
        const timingData: {
            time: string;
            count: number;
            name: string;
        }[] = [];
        const efficiencyData: {
            time: string;
            name: "Efficiency";
            value: number;
        }[] = [];
        for (const hour of data.hourly) {
            const time = `${hour.datetime}`;
            efficiencyData.push({
                time,
                name: "Efficiency",
                value: hour.efficiency,
            });
            timingData.push({
                time,
                count: hour.ontime,
                name: 'On Time'
            });
            timingData.push({
                time,
                count: hour.downtime,
                name: 'Down Time'
            });
            productionChart.push({
                time,
                value: hour.production,
                type: 'Act'
            });
            productionChart.push({
                time,
                value: hour.targetProduction,
                type: 'Exp'
            });
        }
        const start = data.timeline.start || 0;
        const end = data.timeline.end || 0;
        const due = data.timeline.due || 0;
        let efficiency = data.stats.efficiency || 0;
        if (start > 0 && end > start && due > start) {
            const actualDuration = end - start;
            const targetDuration = due - start;
            if (actualDuration > 0 && targetDuration > 0) {
                efficiency = Math.min(100, Math.max(0, (Math.min(actualDuration, targetDuration) / Math.max(actualDuration, targetDuration)) * 100));
            }
        }
        return [productionChart, timingData, efficiencyData, efficiency];
    }, [data]);

    const config: LineConfig = {
        animation: true,
        data: productionChart,
        height: 350,
        xAxis: {
            range: [0, 1],
        },
        yAxis: {
            label: {
                formatter: (v: string) => {
                    return `${v} pc(s)`;
                },
            },
            grid: {
                line: {
                    style: {
                        stroke: 'transparent',
                    },
                },
            },
        },
        slider: {
            start: 0,
            end: 1,
        },
        smooth: true,
        xField: 'time',
        yField: 'value',
        seriesField: 'type',
    };

    const dualConfig: DualAxesConfig = {
        data: [efficiencyData, timingData],
        xField: 'time',
        yAxis: [{
            label: null,
        }, {
            label: null,
        }],
        xAxis: {
            label: null,
        },
        height: 350,
        yField: ['value', 'count'],
        slider: {
            start: 0,
            end: 1,
        },
        tooltip: {
            formatter: (datum) => {
                return {
                    name: datum.name,
                    value: datum.name === "Efficiency" ? datum.value + "%" : secFormatter(datum.count),
                }
            }
        },
        geometryOptions: [
            {
                geometry: 'line',
                seriesField: 'name',
                lineStyle: {
                    lineWidth: 3,
                    lineDash: [5, 5],
                },
                smooth: true,
            },
            {
                stepType: 'hvh',
                geometry: 'line',
                seriesField: 'name',
                color: ['#0d9f8b', '#e95e44'],
                lineStyle: {
                    lineWidth: 0.5,
                }
            },
        ],
    };

    return <SimpleGrid
        h="100%"
        gap={5}
        columns={{
            base: 1,
            lg: 3,
        }}>
        <MyCard
            p={0}>
            <CardHeader borderBottom={"1px solid"} borderColor={border} display="flex" alignItems="center" justifyContent={"flex-between"} px={2} py={2}>
                <Text fontWeight={500} fontSize="lg">Timeline</Text>
            </CardHeader>
            <Center>
                <CircularProgress
                    thickness={"5px"}
                    rounded={"full"}
                    size={
                        isBelow1400 ? "300px"
                            : "350px"
                    }
                    value={efficiency}
                    color={data.timeline.due && data.timeline.end ? (data.timeline.due >= data.timeline.end ? "green" : "red") : "green"}
                    trackColor={"#cccccc40"}
                    capIsRound>
                    <CircularProgressLabel>
                        <VStack>
                            <Text fontSize={"md"} fontWeight={600}>
                                {data.timeline.start ? dayjs.unix(data.timeline.start).format("Do MMM HH:mm A") : "NA"}
                                <Text color={subText} textTransform="uppercase" fontSize="sm">Started</Text>
                            </Text>
                            <Text fontSize={"2xl"} fontWeight={600}>
                                {data.timeline.end ? dayjs.unix(data.timeline.end).format("Do MMM HH:mm A") : "NA"}
                                <Text color={subText} textTransform="uppercase" fontSize="sm">Completed</Text>
                            </Text>
                            <Text fontSize={"md"} fontWeight={600}>
                                {data.timeline.due ? dayjs.unix(data.timeline.due).format("Do MMM HH:mm A") : "No Due Set"}
                                <Text color={subText} textTransform="uppercase" fontSize="sm">Due Set</Text>
                            </Text>
                        </VStack>
                    </CircularProgressLabel>
                </CircularProgress>
            </Center>
        </MyCard>
        <GridItem colSpan={2}>
            <MyCard
                p={0}>
                <CardHeader borderBottom={"1px solid"} borderColor={border} display="flex" alignItems="center" justifyContent={"flex-end"} px={2} py={2}>
                    <CustomSelector options={[
                        "Production",
                        "Efficiency",
                    ]} text="SHOW" selected={show} setOption={setShow} />
                </CardHeader>
                {show === "Production" ? <Line
                    legend={{
                        position: 'bottom',
                    }}
                    lineStyle={{
                        lineWidth: 3,
                    }}
                    color={['#ED8936', '#8080805e']}
                    tooltip={{
                        formatter: (datum: any) => {
                            return {
                                name: datum.type,
                                value: viewAll(datum.value, "production"),
                            };
                        }
                    }}
                    {...config} /> : <DualAxes {...dualConfig} />}
            </MyCard>
        </GridItem>
    </SimpleGrid>
}

export default Charts