import { Area, Radar } from '@ant-design/plots';
import { Box, CardBody, CardHeader, Flex, GridItem, SimpleGrid, Text, useColorMode } from '@chakra-ui/react'
import { useEffect, useMemo, useState } from 'react';
import { Hours } from '..';
import MyCard from '../../../../../Components/micro/Card'
import MyTooltip from '../../../../../Components/micro/MyTooltip';
import ShowSelector from '../../../../../Components/micro/ShowSelector';
import { FormatAll } from '../../../../Dashboard/HourlyChart';
import { NameVal, viewAll } from '../Machine/MachineBreakdown/PieChart';
import { viewType } from '../Machine/MachineHours';
import { factoryProductionAtom } from '../../../../../Components/Store/atoms';
import Get from '../../../../../Components/Store/hooks/Get';

const FactoryHourly = ({
    hours,
    isSingleDay
}: {
    hours: Hours[],
    isSingleDay: boolean
}) => {
    const { colorMode } = useColorMode();
    const [view, _setView] = useState<viewType>("shots");
    const { border } = useMemo(() => ({
        border: `${colorMode}.border`
    }), [colorMode]);
    const productionType = Get(factoryProductionAtom);

    const setView = (view: viewType) => {
        if (productionType === null) return;
        if (productionType === "meter" && view === "production") view = "production_meters";
        _setView(view);
    }

    useEffect(() => {
        if (productionType === null) return;
        if (productionType === "meter") _setView("production_meters");
    }, [productionType]);

    const [data, best, worst, avg, efficiency]: [NameVal[], NameVal, NameVal, number, number] = useMemo(() => {
        const data = [] as NameVal[];
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
            const time = value.time.split(" - ")[0];
            const val = value[view];
            sum += val;
            data.push({
                name: time,
                value: val
            });
            if (val > best.value) {
                best.name = value.time;
                best.value = val;
            }
            if (val < worst.value) {
                worst.name = value.time;
                worst.value = val;
            }
        }
        const avg = sum / hours.length;
        const efficiency = avg / best.value * 100;
        return [data, best, worst, avg, efficiency];
    }, [hours, view])

    const config = {
        data,
        xField: 'name',
        yField: 'value',
        smooth: true,
        xAxis: {
            range: [0, 1],
        }
    };

    const radarConfig = {
        data,
        animation: true,
        xField: 'name',
        yField: 'value',
        tooltip: {
            formatter: (datum: any) => {
                return {
                    name: view.toLocaleUpperCase(),
                    value: viewAll(datum.value, view)
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
            <Text fontWeight={500} fontSize="lg">{isSingleDay ? "Factory Hours" : "Factory Days"}</Text>
            <ShowSelector view={view === "production_meters" ? "production" : view} setView={setView} />
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
            <SimpleGrid my={5} columns={{
                base: 1,
                md: 5
            }}>
                <GridItem colSpan={{
                    base: 1,
                    md: 2
                }}>
                    <Radar
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
                                    name: view.toLocaleUpperCase(),
                                    value: viewAll(datum.value, view)
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

export default FactoryHourly