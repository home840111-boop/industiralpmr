import { Area, Radar } from '@ant-design/plots';
import { Box, CardBody, CardHeader, Flex, GridItem, SimpleGrid, Text, useColorMode, VStack } from '@chakra-ui/react'
import { useMemo } from 'react';
import { MainData } from '..';
import MyCard from '../../../../../Components/micro/Card'
import MyTooltip from '../../../../../Components/micro/MyTooltip';
import unitFormatter from "../../../../../Components/Functions/formatters/unitFormatter";
import UnitFormatter from '../../../../../Components/micro/UnitFormatter';
import Chart from '../../../../MainElectricity/SevenDaysData/Chart';

const MainElectricity = ({
    data,
    isSingleDay
}: {
    data: MainData,
    isSingleDay: boolean
}) => {
    const { colorMode } = useColorMode();
    const { border } = useMemo(() => ({
        border: `${colorMode}.border`
    }), [colorMode]);
    const [efficiency, daysData] = useMemo(() => {
        const avg = data.insights.average;
        const best = data.insights.highest;
        const daysData = Object.values(data.hours).map(hour => {
            return {
                time: hour.name,
                value: hour.value,
                day: hour.subName || "Today"
            }
        });
        return [avg / best.value * 100, daysData];
    }, [data]);

    const config = {
        data: isSingleDay ? data.hours : data.days || [],
        xField: 'name',
        yField: 'value',
        smooth: true,
        xAxis: {
            range: [0, 1],
        }
    };

    const radarConfig = {
        data: data.hours,
        animation: true,
        xField: 'name',
        yField: 'value',
        tooltip: {
            formatter: (datum: any) => {
                return {
                    name: "Consumption",
                    value: unitFormatter(datum.value)
                }
            }
        },
        xAxis: {
            line: null,
            tickLine: null,
            grid: {
                line: {
                    style: {
                        lineDash: null,
                    },
                },
            },
        },
        yAxis: {
            line: null,
            tickLine: null,
            grid: {
                line: {
                    type: 'line',
                    style: {
                        lineDash: null,
                    },
                },
            },
        },
        area: {},
        point: {
            size: 0,
        },
    }

    return <MyCard p={0}>
        <CardHeader borderBottom={"1px solid"} borderColor={border} display="flex" alignItems="center" justifyContent={"space-between"} px={2} pb={1} pt={3}>
            <Text fontWeight={500} fontSize="lg">{isSingleDay ? "Main Electricity Hours" : "Main Electricity Days"}</Text>
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
                            label={<UnitFormatter number={data.insights.highest.value} />}
                            placement="top">
                            {data.insights.highest.time}
                        </MyTooltip>
                    </Text>
                    <Text
                        textTransform={"capitalize"}
                        letterSpacing={1}
                        opacity={0.7}
                        fontSize="xs">
                        Highest Performance
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
                            label={<UnitFormatter number={data.insights.lowest.value} />}
                            placement="top">
                            {data.insights.lowest.time}
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
                    border="1px dashed"
                    borderColor={border}
                    w='100%'
                    h='100%'
                    py={5}
                    textAlign={"center"}>
                    <Text
                        fontSize="md"
                        fontWeight={600}>
                        <UnitFormatter number={data.insights.average} />
                    </Text>
                    <Text
                        textTransform={"capitalize"}
                        letterSpacing={1}
                        opacity={0.7}
                        fontSize="xs">
                        {isSingleDay ? "Hourly" : "Daily"} AVG.
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
                }}><VStack w="100%" gap={5}>
                        <Text fontSize="lg" fontWeight={500} textDecor={"underline"}>Total: <span style={{
                            fontWeight: 700,
                        }}>{unitFormatter(data.total)}</span></Text>
                        {isSingleDay ? <Radar
                            height={300}
                            color={efficiency >= 75 ? "green" :
                                efficiency >= 50 ? "orange" :
                                    "red"}
                            legend={{
                                position: 'bottom',
                                marker: {
                                    symbol: 'diamond',
                                    style: {
                                        fill: 'transparent',
                                        r: 5,
                                    },
                                },
                            }}
                            {...radarConfig} />
                            : <Chart data={daysData} />}
                    </VStack>
                </GridItem>
                <GridItem colSpan={{
                    base: 1,
                    md: 3
                }}>
                    <Area
                        height={300}
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
                                    name: "Consumption",
                                    value: unitFormatter(datum.value)
                                }
                            }
                        }}
                        legend={{
                            position: 'bottom',
                        }}
                        {...config} />
                </GridItem>
            </SimpleGrid>
        </CardBody>
    </MyCard>
}

export default MainElectricity