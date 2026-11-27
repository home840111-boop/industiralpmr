import { Area } from "@ant-design/plots";
import { Box, CardBody, CardHeader, Flex, Heading, Text, useColorMode } from "@chakra-ui/react";
import MyTooltip from "../../../../Components/micro/MyTooltip";
import { useMemo } from "react";
import { DataToSet } from ".";
import MyCard from "../../../../Components/micro/Card";
import UnitFormatter from "../../../../Components/micro/UnitFormatter";
import unitFormatter from "../../../../Components/Functions/formatters/unitFormatter";

const Graph = ({
    line
}: {
    line: DataToSet["lineGraph"]
}) => {
    const { colorMode } = useColorMode();
    const { border } = useMemo(() => ({
        border: `${colorMode}.border`,
    }), [colorMode]);
    const [key, value] = useMemo(() => {
        const keys = Object.keys(line);
        const values = Object.values(line);
        return [keys[0], values[0]];
    }, [line]);
    const [stats, data]: [{
        total: number,
        max: {
            name: string,
            value: number
        },
        min: {
            name: string,
            value: number
        },
        average: number,
        efficiency: number
    }, {
        name: string,
        value: number,
    }[]] = useMemo(() => {
        const stats = {
            total: 0,
            max: {
                name: "",
                value: -Infinity
            },
            min: {
                name: "",
                value: Infinity
            },
            average: 0,
            efficiency: 0
        };
        const data: {
            name: string,
            value: number,
        }[] = [];
        value.forEach((v) => {
            stats.total += v.value;
            if (v.value > stats.max.value) {
                stats.max.name = v.day;
                stats.max.value = v.value;
            }
            if (v.value < stats.min.value) {
                stats.min.name = v.day;
                stats.min.value = v.value;
            }
            data.push({
                name: v.day,
                value: v.value
            });
        });
        stats.average = stats.total / value.length;
        stats.efficiency = stats.average / stats.max.value * 100;
        return [stats, data];
    }, [value]);

    const config = {
        data,
        xField: 'name',
        yField: 'value',
        smooth: true,
        xAxis: {
            range: [0, 1],
        }
    };

    return <MyCard
        p={0}>
        <CardHeader
            borderBottom="1px solid"
            borderColor={border}
            as={Flex}
            justifyContent="space-between"
            alignItems={"center"}
            p={4}>
            <Heading
                fontWeight={500}
                size="sm">{key}</Heading>
        </CardHeader>
        <CardBody p={0}>
            <Flex
                flexDir={"column"}>
                <Flex
                    borderBottom="1px dashed"
                    borderColor={border}
                    flexDir={"row"}
                    justifyContent="space-evenly"
                    alignItems="center"
                    mb={5}>
                    <Box
                        w='100%'
                        h='100%'
                        py={5}
                        textAlign={"center"}>
                        <Text
                            fontSize="xl"
                            fontWeight={700}>
                            <UnitFormatter number={stats.total} />
                        </Text>
                        <Text
                            textTransform={"capitalize"}
                            letterSpacing={1}
                            opacity={0.7}
                            fontSize="xs">
                            Total Consumption
                        </Text>
                    </Box>
                    <Box
                        borderRight="1px dashed"
                        borderLeft="1px dashed"
                        w='100%'
                        h='100%'
                        py={5}
                        borderColor={border}
                        textAlign={"center"}>
                        <Text
                            fontSize="md"
                            fontWeight={600}>
                            <MyTooltip label={<UnitFormatter number={stats.min.value} />}>
                                {stats.min.name}
                            </MyTooltip>
                        </Text>
                        <Text
                            textTransform={"capitalize"}
                            letterSpacing={1}
                            opacity={0.7}
                            fontSize="xs">
                            Lowest Performance
                        </Text>
                    </Box>
                    <Box
                        borderRight="1px dashed"
                        borderLeft="1px dashed"
                        w='100%'
                        h='100%'
                        py={5}
                        borderColor={border}
                        textAlign={"center"}>
                        <Text
                            fontSize="md"
                            fontWeight={600}>
                            <MyTooltip label={<UnitFormatter number={stats.max.value} />}>
                                {stats.max.name}
                            </MyTooltip>
                        </Text>
                        <Text
                            letterSpacing={1}
                            opacity={0.7}
                            fontSize="xs">
                            Highest Performance
                        </Text>
                    </Box>
                    <Box
                        w='100%'
                        h='100%'
                        py={5}
                        textAlign={"center"}>
                        <Text
                            fontSize="md"
                            fontWeight={600}>
                            <UnitFormatter number={stats.average} />
                        </Text>
                        <Text
                            letterSpacing={1}
                            opacity={0.7}
                            fontSize="xs">Avg.</Text>
                    </Box>
                </Flex>
                <Box p={2}>
                    <Area
                        height={380}
                        color={stats.efficiency >= 75 ? "green" :
                            stats.efficiency >= 50 ? "orange" :
                                "red"}
                        line={{
                            color: stats.efficiency >= 75 ? "green" :
                                stats.efficiency >= 50 ? "orange" :
                                    "red"
                        }}
                        areaStyle={{
                            fillOpacity: 0.1,
                            fill: stats.efficiency >= 75 ? "green" :
                                stats.efficiency >= 50 ? "orange" :
                                    "red",
                        }}
                        yAxis={{
                            title: {
                                text: "Consumption",
                                style: {
                                    fontSize: 14,
                                    fontWeight: 600,
                                }
                            }
                        }}
                        tooltip={{
                            formatter: (datum: any) => {
                                return {
                                    name: datum.name,
                                    value: unitFormatter(datum.value)
                                }
                            }
                        }}
                        legend={{
                            position: 'bottom',
                        }}
                        {...config} />
                </Box>
            </Flex>
        </CardBody>
    </MyCard>
}

export default Graph