import { Box, Flex, Text, useColorMode } from "@chakra-ui/react"
import { FormatAll } from "../../../../../Dashboard/HourlyChart";
import MyTooltip from "../../../../../../Components/micro/MyTooltip";
import { useMemo } from "react";
import { NameVal, viewAll } from "../MachineBreakdown/PieChart";
import { MachineHours } from "../..";
import { Line } from '@ant-design/plots';
import { viewType } from ".";

interface Data extends NameVal {
    machine: string;
}
const HourlyGraph = ({
    hours,
    view
}: {
    hours: MachineHours[],
    view: viewType
}) => {
    const { colorMode } = useColorMode();
    const { border } = useMemo(() => ({
        border: `${colorMode}.border`
    }), [colorMode]);

    const [data, best, worst, avg]: [Data[], NameVal, NameVal, number] = useMemo(() => {
        const data = [] as Data[];
        const best: NameVal = {
            name: "",
            value: -Infinity
        };
        let sum = 0;
        const worst: NameVal = {
            name: "",
            value: Infinity
        };
        for (const value of hours) {
            const machine = value.name;
            const time = value.time.split(" - ")[0];
            const val = value[view];
            sum += val;
            data.push({
                machine,
                name: time,
                value: val
            });
            if (val > best.value) {
                best.name = `${machine} (${time})`;
                best.value = val;
            }
            if (val < worst.value) {
                worst.name = `${machine} (${time})`;
                worst.value = val;
            }
        }
        const avg = sum / hours.length;
        return [data, best, worst, avg];
    }, [hours, view]);

    const config = {
        data,
        xField: 'name',
        yField: 'value',
        seriesField: 'machine',
        smooth: true,
        xAxis: {
            range: [0, 1],
        }
    };

    return <Box>
        <Flex flexDir="row">
            <Box
                border="1px dashed"
                borderColor={border}
                w='100%'
                h='100%'
                py={5}
                textAlign={"center"}>
                <Text
                    fontSize="md"
                    fontWeight={600}>
                    <MyTooltip
                        label={<FormatAll number={best.value} view={view} />}
                        placement="top">
                        {best.name}
                    </MyTooltip>
                </Text>
                <Text
                    textTransform={"capitalize"}
                    letterSpacing={1}
                    opacity={0.7}
                    fontSize="xs">
                    Highest Performer
                </Text>
            </Box>
            <Box
                border="1px dashed"
                borderColor={border}
                w='100%'
                h='100%'
                py={5}
                textAlign={"center"}>
                <Text
                    fontSize="md"
                    fontWeight={600}>
                    <MyTooltip
                        label={<FormatAll number={worst.value} view={view} />}
                        placement="top">
                        {worst.name}
                    </MyTooltip>
                </Text>
                <Text
                    textTransform={"capitalize"}
                    letterSpacing={1}
                    opacity={0.7}
                    fontSize="xs">
                    Lowest Performer
                </Text>
            </Box>
            <Box
                border="1px dashed"
                borderColor={border}
                w='100%'
                h='100%'
                py={5}
                textAlign={"center"}>
                <Text
                    fontSize="md"
                    fontWeight={600}>
                    <FormatAll number={avg} view={view} />
                </Text>
                <Text
                    textTransform={"capitalize"}
                    letterSpacing={1}
                    opacity={0.7}
                    fontSize="xs">
                    Hourly AVG.
                </Text>
            </Box>
        </Flex>
        <Box my={5}>
            <Line
                height={300}
                yAxis={{
                    title: {
                        text: view.toUpperCase(),
                        style: {
                            fontSize: 14,
                            fontWeight: 600,
                        }
                    }
                }}
                tooltip={{
                    formatter: (datum: any) => {
                        return {
                            name: datum.machine,
                            value: viewAll(datum.value, view)
                        }
                    }
                }}
                legend={{
                    position: 'bottom',
                }}
                {...config} />
        </Box>
    </Box>
}

export default HourlyGraph