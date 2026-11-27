import { Sankey } from '@ant-design/plots';
import { Box, CardBody, CardHeader, Flex, GridItem, SimpleGrid, Text, useColorMode } from '@chakra-ui/react'
import { useMemo } from 'react';
import { MaterialData } from '..';
import MyCard from '../../../../../Components/micro/Card'
import MyTooltip from '../../../../../Components/micro/MyTooltip';
import weightFormatter from "../../../../../Components/Functions/formatters/weightFormatter";
import { Pie, G2 } from '@ant-design/plots';
import WeightFormatter from '../../../../../Components/micro/WeightFormatter';

interface Insight {
    highest: {
        name: string,
        value: number
    },
    lowest: {
        name: string,
        value: number
    },
};

const MaterialBreakdown = ({
    data,
}: {
    data: MaterialData,
}) => {
    const G = G2.getEngine('canvas');
    const { colorMode } = useColorMode();
    const { border } = useMemo(() => ({
        border: `${colorMode}.border`
    }), [colorMode]);
    const [machineBreakdown, materialBreakdown, insights]: [{
        source: string,
        target: string,
        value: number
    }[], {
        name: string,
        value: number
    }[], {
        machine: Insight,
        material: Insight
    }] = useMemo(() => {
        const machineBreakdown = [] as {
            source: string,
            target: string,
            value: number
        }[];
        const materialBreakdown = [] as {
            name: string,
            value: number
        }[];
        const machineInsights: Insight = {
            highest: {
                name: "",
                value: -Infinity
            },
            lowest: {
                name: "",
                value: Infinity
            },
        };
        const materialInsights: Insight = {
            highest: {
                name: "",
                value: -Infinity
            },
            lowest: {
                name: "",
                value: Infinity
            },
        };
        for (const [n, value] of Object.entries(data.materialBreakdown)) {
            const name = n.toUpperCase();
            const val = value;
            materialBreakdown.push({
                name,
                value
            });
            if (val > materialInsights.highest.value) {
                materialInsights.highest.name = name;
                materialInsights.highest.value = val;
            }
            if (val < materialInsights.lowest.value) {
                materialInsights.lowest.name = name;
                materialInsights.lowest.value = val;
            }
        }
        for (const machine of Object.values(data.machineBreakdown)) {
            for (const [_materialName, val] of Object.entries(machine)) {
                const materialName = _materialName.toUpperCase();
                const { value, name } = val;
                if (!name) continue;
                machineBreakdown.push({
                    source: materialName,
                    target: name,
                    value
                });
                if (value > machineInsights.highest.value) {
                    machineInsights.highest.name = name;
                    machineInsights.highest.value = value;
                }
                if (value < machineInsights.lowest.value) {
                    machineInsights.lowest.name = name;
                    machineInsights.lowest.value = value;
                }
            }
        }
        if (!isFinite(machineInsights.highest.value)) {
            machineInsights.highest = { name: "-", value: 0 };
        }
        if (!isFinite(machineInsights.lowest.value)) {
            machineInsights.lowest = { name: "-", value: 0 };
        }
        if (!isFinite(materialInsights.highest.value)) {
            materialInsights.highest = { name: "-", value: 0 };
        }
        if (!isFinite(materialInsights.lowest.value)) {
            materialInsights.lowest = { name: "-", value: 0 };
        }
        return [machineBreakdown, materialBreakdown, {
            machine: machineInsights,
            material: materialInsights
        }];
    }, [data]);

    const config = {
        data: machineBreakdown,
        sourceField: 'source',
        targetField: 'target',
        weightField: 'value',
        nodeWidthRatio: 0.008,
        nodePaddingRatio: 0.03,
    };

    const cfg = {
        appendPadding: 10,
        data: materialBreakdown,
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
                        text: `${weightFormatter(data.value)}个 ${(data.percent * 100).toFixed(0)}%`,
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
            <Text fontWeight={500} fontSize="lg">Material Consumption Breakdown</Text>
        </CardHeader>
        <CardBody p={0}>
            <SimpleGrid my={5} columns={{
                base: 1,
                md: 5
            }}>
                <GridItem colSpan={{
                    base: 1,
                    md: 3
                }}><Flex flexDir="row">
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
                                <WeightFormatter number={data.total * 1000} />
                            </Text>
                            <Text
                                textTransform={"capitalize"}
                                letterSpacing={1}
                                opacity={0.7}
                                fontSize="xs">
                                Total Consumed
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
                                    label={<WeightFormatter number={insights.machine.highest.value * 1000} />}
                                    placement="top">
                                    {insights.machine.highest.name}
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
                                    label={<WeightFormatter number={insights.machine.lowest.value * 1000} />}
                                    placement="top">
                                    {insights.machine.lowest.name}
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
                    <Sankey
                        height={350}
                        tooltip={{
                            formatter: (datum: any) => {
                                return { name: `${datum.source} -> ${datum.target}`, value: weightFormatter(datum.value * 1000) };
                            }
                        }}
                        {...config} />
                </GridItem>
                <GridItem colSpan={{
                    base: 1,
                    md: 2
                }}><Flex flexDir="row">
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
                                    label={<WeightFormatter number={insights.material.highest.value * 1000} />}
                                    placement="top">
                                    {insights.material.highest.name}
                                </MyTooltip>
                            </Text>
                            <Text
                                textTransform={"capitalize"}
                                letterSpacing={1}
                                opacity={0.7}
                                fontSize="xs">
                                Highest Consumed
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
                                    label={<WeightFormatter number={insights.material.lowest.value * 1000} />}
                                    placement="top">
                                    {insights.material.lowest.name}
                                </MyTooltip>
                            </Text>
                            <Text
                                textTransform={"capitalize"}
                                letterSpacing={1}
                                opacity={0.7}
                                fontSize="xs">
                                Lowest Consumed
                            </Text>
                        </Box>
                    </Flex>
                    <Pie
                        height={350}
                        legend={false}
                        tooltip={{
                            formatter: (datum: any) => {
                                return {
                                    name: datum.name,
                                    value: weightFormatter(datum.value)
                                }
                            }
                        }}
                        {...cfg} />
                </GridItem>
            </SimpleGrid>
        </CardBody>
    </MyCard>
}

export default MaterialBreakdown;