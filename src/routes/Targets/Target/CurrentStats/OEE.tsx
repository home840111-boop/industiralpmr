import { Area, AreaConfig } from "@ant-design/plots";
import { HStack, Progress, Text, useColorMode, VStack } from "@chakra-ui/react";
import { useMemo } from "react";
import { DataToSet } from "..";
import { viewAll } from "../../../Reports/Viewer/FactoryReport/Machine/MachineBreakdown/PieChart";


const OEE = ({
    data,
    hours
}: {
    data: DataToSet["OEE"],
    hours: DataToSet["hours"]
}) => {
    const { colorMode } = useColorMode();
    const { subText } = useMemo(() => ({
        subText: `${colorMode}.subText`,
    }), [colorMode]);
    const hourlyData: {
        time: string,
        value: number,
    }[] = useMemo(() => {
        const _data: {
            time: string,
            value: number,
        }[] = [];
        for (const key in hours) {
            const hour = hours[key];
            _data.push({
                time: `${hour.date}|${hour.time}`,
                value: hour.production,
            });
        }
        return _data;
    }, [hours]);

    const color = useMemo(() => data >= 75 ? "#0d9f8b" :
        data >= 50 ? "#FDD36A" :
            "#e95e44", [data]);

    const config: AreaConfig = {
        data: hourlyData,
        xField: 'time',
        yField: 'value',
        xAxis: {
            label: null,
            range: [0, 1],
        },
        yAxis: {
            label: null,
            tickCount: 0
        },
        height: 85,
        label: false,
        animation: false,
        smooth: true,
        legend: false,
        line: {
            color,
            style: {
                lineWidth: 2,
            }
        },
        areaStyle: {
            fill: `l(270) 0:${color}00 1:${color}60`,
        },
        tooltip: {
            formatter: datum => {
                return {
                    name: datum.time.split("|")[1],
                    value: viewAll(datum.value, "production")
                }
            },
            title: v => v.split("|")[0]
        }
    };

    return <VStack justifyContent={"space-between"} alignItems="center" w="100%" spacing={1}>
        <Text
            textAlign="center"
            fontSize="xs"
            textTransform={"uppercase"}
            opacity={0.8}
            mb={1}
            fontWeight={700}>Performance & OEE</Text>
        <VStack gap={2} justifyContent={"flex-end"} alignItems="center" w="100%">
            <Area {...config} />
            <HStack w="100%" justifyContent={"center"} alignItems="center" spacing={2} pt={2}>
                <Text fontSize="xs" color={subText} fontWeight={700}>OEE: </Text>
                <Progress w="65%" borderRadius="full" size="sm" value={data} colorScheme={
                    data >= 75 ? "green" :
                        data >= 50 ? "yellow" :
                            "red"
                } />
                <Text fontSize="xs" color={subText} fontWeight={700}>{data}%</Text>
            </HStack>
        </VStack>
    </VStack>
}

export default OEE