import { Radar } from '@ant-design/plots';
import { CardBody, CardHeader, Center, Flex, Text, useColorMode } from "@chakra-ui/react";
import { useMemo, useState } from "react";
import { DataToSet } from ".";
import { SmallFill } from "../../../Components/Loaders";
import MyCard from "../../../Components/micro/Card";
import ShowSelector, { views } from "../../../Components/micro/ShowSelector";
import numberFormatter from "../../../Components/Functions/formatters/numberFormatter";
import unitFormatter from "../../../Components/Functions/formatters/unitFormatter";
import weightFormatter from "../../../Components/Functions/formatters/weightFormatter";

const HourlySpider = ({
    data
}: {
    data?: DataToSet["hourly"]
}) => {
    const [view, setView] = useState<views>("shots");
    const { colorMode } = useColorMode();
    const { border } = useMemo(() => ({
        border: `${colorMode}.border`,
    }), [colorMode]);

    const myData: {
        hour: string;
        machine: string;
        value: number;
    }[] = useMemo(() => {
        const myData: {
            hour: string;
            machine: string;
            value: number;
        }[] = [];
        Object.entries(data || {}).forEach(([hour, value]) => {
            Object.entries(value.machines).forEach(([machine, value]) => {
                myData.push({
                    hour,
                    machine: value.name,
                    value: value[view]
                })
            });
            if (view === "electricity") Object.entries(value.equipments).forEach(([equipment, value]) => {
                myData.push({
                    hour,
                    machine: value.name,
                    value: value[view]
                })
            });
        })
        return myData;
    }, [data, view]);

    const config = {
        data: myData,
        xField: 'hour',
        yField: 'value',
        seriesField: 'machine',
        tooltip: {
            formatter: (datum: any) => {
                return {
                    name: datum.machine,
                    value: view === "shots" ?
                        numberFormatter(datum.value, "shot(s)") :
                        view === "production" ?
                            numberFormatter(datum.value, "pc(s)") :
                            view === "material" ?
                                weightFormatter(datum.value) :
                                unitFormatter(datum.value)
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
                fontWeight={500}>Breakdown</Text>
            <ShowSelector view={view} setView={setView} />
        </CardHeader>
        <CardBody p={0} minH={300}>
            {data === undefined ? <Center h="100%">
                <SmallFill />
            </Center> : <Radar
                animation={false}
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
                {...config} />
            }</CardBody>
    </MyCard>
}

export default HourlySpider