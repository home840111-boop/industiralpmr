import { Column, G2, Sankey } from "@ant-design/plots";
import { Box, CardBody, CardHeader, Flex, SimpleGrid, Text, useColorMode } from "@chakra-ui/react";
import { useMemo } from "react";
import MyCard from "../../../../Components/micro/Card";
import MyTooltip from "../../../../Components/micro/MyTooltip";
import WeightFormatter from "../../../../Components/micro/WeightFormatter";
import { NameVal, viewAll } from "../FactoryReport/Machine/MachineBreakdown/PieChart";

const Distribution = ({
    snakey,
    column,
    insights,
    reportType
}: {
    snakey: {
        source: string;
        target: string;
        value: number;
    }[],
    column: {
        day: string;
        item: string;
        value: number;
    }[],
    insights: {
        most: NameVal,
        least: NameVal,
    },
    reportType: "machine" | "material"
}) => {
    const { colorMode } = useColorMode();
    const { border } = useMemo(() => ({
        border: `${colorMode}.border`
    }), [colorMode]);
    const insightsTitle = useMemo(() => reportType === "machine" ? "Consumed" : "Consumer", [reportType]);

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
        data: column,
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
        data: snakey,
        sourceField: 'source',
        targetField: 'target',
        weightField: 'value',
        nodeWidthRatio: 0.008,
        nodePaddingRatio: 0.03,
    };

    return <MyCard p={0}>
        <CardHeader borderBottom={"1px solid"} borderColor={border} display="flex" alignItems="center" justifyContent={"space-between"} px={2} pb={1} pt={3}>
            <Text fontWeight={500} fontSize="lg">Breakdown</Text>
        </CardHeader>
        <CardBody p={0}>
            <Flex
                borderBottom="1px dashed"
                borderColor={border}
                flexDir={"row"}
                justifyContent="space-evenly"
                alignItems="center"
                mb={5}>
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
                        Most {insightsTitle}
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
                        Least {insightsTitle}
                    </Text>
                </Box>
            </Flex>
            <SimpleGrid
                my={5}
                mx={2}
                columns={{
                    base: 1,
                    md: 2
                }}>
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
                    height={350}
                    label={false}
                    tooltip={{
                        formatter: (datum: any) => {
                            return {
                                name: datum.item,
                                value: viewAll(datum.value, "material")
                            }
                        }
                    }}
                    {...cfg} />
                <Sankey
                    height={350}
                    tooltip={{
                        formatter: (datum: any) => {
                            return { name: `${datum.source} -> ${datum.target}`, value: viewAll(datum.value, "material") };
                        }
                    }}
                    {...config} />
            </SimpleGrid>
        </CardBody>
    </MyCard>
}

export default Distribution