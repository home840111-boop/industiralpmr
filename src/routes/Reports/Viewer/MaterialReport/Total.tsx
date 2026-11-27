import { Area, G2, Pie } from '@ant-design/plots';
import { Box, CardBody, CardHeader, Flex, GridItem, SimpleGrid, Text, useColorMode } from "@chakra-ui/react";
import { useMemo } from "react";
import MyCard from "../../../../Components/micro/Card";
import MyTooltip from "../../../../Components/micro/MyTooltip";
import WeightFormatter from "../../../../Components/micro/WeightFormatter";
import { NameVal, viewAll } from "../FactoryReport/Machine/MachineBreakdown/PieChart"

const Total = ({
    total,
    line,
    insights,
    breakdown
}: {
    total: number,
    line: NameVal[],
    insights: {
        most: NameVal;
        least: NameVal;
        dailyAvg: number;
    },
    breakdown: NameVal[]
}) => {
    const G = G2.getEngine('canvas');
    const { colorMode } = useColorMode();
    const { border } = useMemo(() => ({
        border: `${colorMode}.border`
    }), [colorMode]);
    const efficiency = useMemo(() => {
        return total / insights.most.value * 100;
    }, [total, insights]);

    const config = {
        data: line,
        xField: 'name',
        yField: 'value',
        smooth: true,
        xAxis: {
            range: [0, 1],
        }
    };

    const cfg = {
        appendPadding: 10,
        data: breakdown,
        angleField: 'value',
        colorField: 'name',
        radius: 0.75,
        label: {
            type: 'spider',
            labelHeight: 40,
            formatter: (data: any, mappingData: any) => {
                const group = new G.Group({});
                group.addShape({
                    type: 'circle',
                    attrs: {
                        x: 0,
                        y: 0,
                        width: 40,
                        height: 50,
                        r: 5,
                        fill: mappingData.color,
                    },
                });
                group.addShape({
                    type: 'text',
                    attrs: {
                        x: 10,
                        y: 8,
                        text: `${data.name}`,
                        fill: mappingData.color,
                    },
                });
                group.addShape({
                    type: 'text',
                    attrs: {
                        x: 0,
                        y: 25,
                        text: `${viewAll(data.value, "material")}个 ${(data.percent * 100).toFixed(0)}%`,
                        fill: colorMode === "dark" ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.5)',
                        fontWeight: 700,
                    },
                });
                return group;
            },
        },
        interactions: [
            {
                type: 'element-selected',
            },
            {
                type: 'element-active',
            },
        ],
    };

    return <MyCard p={0}>
        <CardHeader borderBottom={"1px solid"} borderColor={border} display="flex" alignItems="center" justifyContent={"space-between"} px={2} pb={1} pt={3}>
            <Text fontWeight={500} fontSize="lg">Consumption Total</Text>
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
                            <WeightFormatter number={total} />
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
                            <MyTooltip
                                label={<WeightFormatter number={insights.most.value} />}>
                                {insights.most.name}
                            </MyTooltip>
                        </Text>
                        <Text
                            textTransform={"capitalize"}
                            letterSpacing={1}
                            opacity={0.7}
                            fontSize="xs">
                            Highest Consumption
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
                            <MyTooltip
                                label={<WeightFormatter number={insights.least.value} />}>
                                {insights.least.name}
                            </MyTooltip>
                        </Text>
                        <Text
                            textTransform={"capitalize"}
                            letterSpacing={1}
                            opacity={0.7}
                            fontSize="xs">
                            Lowest Consumption
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
                            <WeightFormatter number={insights.dailyAvg} />
                        </Text>
                        <Text
                            textTransform={"capitalize"}
                            letterSpacing={1}
                            opacity={0.7}
                            fontSize="xs">
                            Daily Average
                        </Text>
                    </Box>
                </Flex>
                <SimpleGrid my={5} columns={{
                    base: 1,
                    md: 5
                }}>
                    <GridItem colSpan={{
                        base: 1,
                        md: 2
                    }}>
                        <Pie
                            height={350}
                            legend={false}
                            tooltip={{
                                formatter: (datum: any) => {
                                    return {
                                        name: datum.name,
                                        value: viewAll(datum.value, "material")
                                    }
                                }
                            }}
                            {...cfg} />
                    </GridItem>
                    <GridItem colSpan={{
                        base: 1,
                        md: 3
                    }}>
                        <Area
                            height={350}
                            color={efficiency >= 75 ? "green" :
                                efficiency >= 50 ? "orange" :
                                    "red"}
                            line={{
                                color: efficiency >= 75 ? "green" :
                                    efficiency >= 50 ? "orange" :
                                        "red"
                            }}
                            areaStyle={{
                                fillOpacity: 0.1,
                                fill: efficiency >= 75 ? "green" :
                                    efficiency >= 50 ? "orange" :
                                        "red",
                            }}
                            tooltip={{
                                formatter: (datum: any) => {
                                    return {
                                        name: datum.name,
                                        value: viewAll(datum.value, "material")
                                    }
                                }
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
                            legend={{
                                position: 'bottom',
                            }}
                            {...config} />
                    </GridItem>
                </SimpleGrid>
            </Flex>
        </CardBody>
    </MyCard>
}

export default Total