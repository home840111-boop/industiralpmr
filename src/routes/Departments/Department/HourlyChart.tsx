import { DualAxes } from '@ant-design/plots';
import { Box, CardBody, CardHeader, Center, Flex, Text, useColorMode } from '@chakra-ui/react'
import MyTooltip from '../../../Components/micro/MyTooltip';
import React, { useMemo, useState } from 'react'
import { DataToSet } from '.';
import { SmallFill } from '../../../Components/Loaders';
import MyCard from '../../../Components/micro/Card'
import ShowSelector, { views } from '../../../Components/micro/ShowSelector';
import { FormatAll } from '../../Dashboard/HourlyChart';
import format from "../../../Components/Functions/formatters/numberFormatter";
import unitFormat from "../../../Components/Functions/formatters/unitFormatter";
import weightFormat from "../../../Components/Functions/formatters/weightFormatter";

interface ChartType {
    name: string;
    time: string;
    value: number;
};
const HourlyChart = ({
    data
}: {
    data?: DataToSet["hourly"]
}) => {
    const [view, setView] = useState<views>("shots");
    const { colorMode } = useColorMode();
    const { border } = useMemo(() => ({
        border: `${colorMode}.border`,
    }), [colorMode]);
    const [hours, high, low, avg]: [
        {
            total: ChartType[];
            others: ChartType[];
        },
        {
            name: string;
            value: number;
        },
        {
            name: string;
            value: number;
        },
        number
    ] = useMemo(() => {
        const high = {
            name: "",
            value: -Infinity
        };
        const low = {
            name: "",
            value: Infinity
        };
        const hours = {
            total: [] as ChartType[],
            others: [] as ChartType[]
        };
        let total = 0;
        Object.entries(data || {}).forEach(([time, value]) => {
            if (value.total[view] > high.value) {
                high.name = time;
                high.value = value.total[view];
            }
            if (value.total[view] < low.value) {
                low.name = time;
                low.value = value.total[view];
            }
            for (const machine of Object.values(value.machines)) {
                hours.others.push({
                    time,
                    name: machine.name,
                    value: machine[view]
                });
            }
            if (view === "electricity") for (const equipment of Object.values(value.equipments)) {
                hours.others.push({
                    time,
                    name: equipment.name,
                    value: equipment[view]
                });
            }
            total += value.total[view];
            hours.total.push({
                time,
                name: "Total",
                value: value.total[view]
            });
        });
        const avg = total / hours.total.length;
        return [hours, high, low, avg]
    }, [data, view]);

    const config = {
        data: [hours.total, hours.others],
        xField: 'time',
        yField: ['value', 'value'],
        xAxis: {
            range: [0, 1],
        },
        tooltip: {
            formatter: (datum: any) => {
                return {
                    name: datum.name,
                    value: view === "shots" ? format(datum.value, "shot(s)")
                        : view === "production" ? format(datum.value, "pc(s)")
                            : view === "electricity" ? unitFormat(datum.value)
                                : view === "material" ? weightFormat(datum.value)
                                    : datum.value
                };
            }
        }
    };

    return <MyCard noPadding>
        <CardHeader
            alignItems="center"
            justifyContent="space-between"
            as={Flex}
            p={2}
            borderBottom="1px solid"
            borderColor={border}>
            <Text
                fontSize="md"
                fontWeight={500}>Hours</Text>
            <ShowSelector view={view} setView={setView} />
        </CardHeader>
        <CardBody p={0} minH={300}>
            {data === undefined ? <Center h="100%">
                <SmallFill />
            </Center> : <Flex flexDir="column">
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
                            <MyTooltip label={<FormatAll number={high.value} view={view} />}>
                                {high.name}
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
                            <MyTooltip label={<FormatAll number={low.value} view={view} />}>
                                {low.name}
                            </MyTooltip>
                        </Text>
                        <Text
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
                            <FormatAll number={avg} view={view} />
                        </Text>
                        <Text
                            letterSpacing={1}
                            opacity={0.7}
                            fontSize="xs">
                            Hourly AVG.
                        </Text>
                    </Box>
                </Flex>
                <Box pt={2}>
                    <DualAxes
                        height={300}
                        legend={{
                            position: 'bottom',
                        }}
                        animation={false}
                        geometryOptions={
                            [
                                {
                                    geometry: 'column',
                                    columnWidthRatio: 0.2,
                                    columnStyle: {
                                        radius: [5, 5, 0, 0],
                                        fill: "#5B8FF9",
                                    },
                                    label: {
                                        position: 'middle',
                                        content: "",
                                    },
                                    seriesField: "name",
                                },
                                {
                                    geometry: 'line',
                                    seriesField: 'name',
                                    smooth: true,
                                    lineStyle: {
                                    }
                                },
                            ]}
                        {...config}
                    />
                </Box>
            </Flex>}
        </CardBody>
    </MyCard>
}

export default HourlyChart