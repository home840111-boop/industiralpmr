import { Line } from "@ant-design/plots";
import { Box, Flex, Text, useColorMode } from "@chakra-ui/react";
import { useMemo } from "react";
import { EquipmentHours } from "../..";
import MyTooltip from "../../../../../../Components/micro/MyTooltip";
import UnitFormatter from "../../../../../../Components/micro/UnitFormatter";
import { NameVal } from "../../Machine/MachineBreakdown/PieChart";
import unitFormatter from "../../../../../../Components/Functions/formatters/unitFormatter";

interface Data extends NameVal {
    equipment: string;
}
const HourlyGraph = ({
    hours,
}: {
    hours: EquipmentHours[],
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
            const equipment = value.name;
            const electricity = value.electricity;
            const time = value.time.split(" - ")[0];
            const val = electricity;
            sum += val;
            data.push({
                equipment,
                name: time,
                value: val
            });
            if (val > best.value) {
                best.name = `${equipment} (${time})`;
                best.value = val;
            }
            if (val < worst.value) {
                worst.name = `${equipment} (${time})`;
                worst.value = val;
            }
        }
        const avg = sum / hours.length;
        return [data, best, worst, avg];
    }, [hours]);

    const config = {
        data,
        xField: 'name',
        yField: 'value',
        seriesField: 'equipment',
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
                        label={<UnitFormatter number={best.value} />}
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
                        label={<UnitFormatter number={worst.value} />}
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
                    <UnitFormatter number={avg} />
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
                        text: "Electricity Consumption(Kwhr)",
                        style: {
                            fontSize: 14,
                            fontWeight: 600,
                        }
                    }
                }}
                tooltip={{
                    formatter: (datum: any) => {
                        return {
                            name: datum.equipment,
                            value: unitFormatter(datum.value)
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