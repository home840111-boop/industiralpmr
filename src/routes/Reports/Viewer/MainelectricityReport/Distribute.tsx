import { Column, G2, Sankey } from "@ant-design/plots";
import { Box, CardBody, CardHeader, Flex, SimpleGrid, Text, useColorMode } from "@chakra-ui/react"
import { useMemo } from "react";
import { DataToSet } from ".";
import unitFormatter from "../../../../Components/Functions/formatters/unitFormatter";
import MyCard from "../../../../Components/micro/Card";
import MyTooltip from "../../../../Components/micro/MyTooltip";
import UnitFormatter from "../../../../Components/micro/UnitFormatter";
import { NameVal } from "../FactoryReport/Machine/MachineBreakdown/PieChart";

const Distribute = ({
    data
}: {
    data: DataToSet["distribution"]
}) => {
    const { colorMode } = useColorMode();
    const { border } = useMemo(() => ({
        border: `${colorMode}.border`
    }), [colorMode]);
    const [columnChart, snakeyChart, best, worst]: [{
        day: string;
        item: string;
        value: number;
    }[], {
        source: string;
        target: string;
        value: number;
    }[], NameVal, NameVal] = useMemo(() => {
        const columnChart = [] as {
            day: string;
            item: string;
            value: number;
        }[];
        const snakeyChart = [] as {
            source: string;
            target: string;
            value: number;
        }[];
        const best: NameVal = {
            name: "",
            value: -Infinity
        };
        const worst: NameVal = {
            name: "",
            value: Infinity
        };
        const map: { [key: string]: { name: string, value: number } } = {};
        for (const date of Object.keys(data)) {
            const val = data[date];
            for (const value of Object.values(val)) {
                const { name, value: val } = value;
                if (!map[name]) map[name] = {
                    name,
                    value: 0
                };
                map[name].value += val;
                columnChart.push({
                    day: date,
                    item: name,
                    value: val
                });
            }
        }
        for (const value of Object.values(map)) {
            const { name, value: val } = value;
            if (val > best.value) {
                best.name = name;
                best.value = val;
            }
            if (val < worst.value) {
                worst.name = name;
                worst.value = val;
            }
            snakeyChart.push({
                source: "Main Electricity",
                target: name,
                value: val
            });
        }
        return [columnChart, snakeyChart, best, worst];
    }, [data]);

    G2.registerInteraction('element-link', {
        start: [
            {
                trigger: 'interval:mouseenter',
                action: 'element-link-by-color:link',
            },
        ],
        end: [
            {
                trigger: 'interval:mouseleave',
                action: 'element-link-by-color:unlink',
            },
        ],
    });

    const cfg = {
        data: columnChart,
        xField: 'day',
        yField: 'value',
        seriesField: 'item',
        isStack: true,
        interactions: [
            {
                type: 'element-highlight-by-color',
            },
            {
                type: 'element-link',
            },
        ],
    };

    const config = {
        data: snakeyChart,
        sourceField: 'source',
        targetField: 'target',
        weightField: 'value',
        nodeWidthRatio: 0.008,
        nodePaddingRatio: 0.03,
    };

    return <MyCard p={0}>
        <CardHeader borderBottom={"1px solid"} borderColor={border} display="flex" alignItems="center" justifyContent={"space-between"} px={2} pb={1} pt={3}>
            <Text fontWeight={500} fontSize="lg">Consumption Breakdown</Text>
        </CardHeader>
        <CardBody p={0}>
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
                        Highest Consumer
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
                        Lowest Consumer
                    </Text>
                </Box>
            </Flex>
            <SimpleGrid my={5} columns={{
                base: 1,
                md: 2
            }}>
                <Box>
                    <Column
                        yAxis={{
                            title: {
                                text: "CONSUMPTION",
                                style: {
                                    fontSize: 12,
                                    fontWeight: 500
                                }
                            },
                            label: {
                                formatter: () => ""
                            }
                        }}
                        label={false}
                        tooltip={{
                            formatter: (datum: any) => {
                                return {
                                    name: datum.item,
                                    value: unitFormatter(datum.value)
                                }
                            }
                        }}
                        {...cfg} />
                </Box>
                <Box borderRightWidth={{
                    base: "0px",
                    md: "1px"
                }}
                    borderRightStyle="dashed"
                    borderRightColor={border}>
                    <Sankey
                        height={350}
                        tooltip={{
                            formatter: (datum: any) => {
                                return { name: `${datum.source} -> ${datum.target}`, value: unitFormatter(datum.value) };
                            }
                        }}
                        {...config} />
                </Box>
            </SimpleGrid>
        </CardBody>
    </MyCard>
}

export default Distribute