import { Box, CardBody, CardHeader, Center, Flex, Text, useColorMode } from "@chakra-ui/react";
import { useMemo, useState } from "react";
import { DataToSet } from "."
import { SmallFill } from "../../Components/Loaders";
import MyCard from "../../Components/micro/Card";
import ShowSelector, { views } from "../../Components/micro/ShowSelector";
import { Line } from '@ant-design/plots';
import { viewAll } from "../Reports/Viewer/FactoryReport/Machine/MachineBreakdown/PieChart";

const HourlyChart = ({
    data
}: {
    data?: DataToSet["hourlyData"]
}) => {
    const [view, setView] = useState<views>("shots");
    const { colorMode } = useColorMode();
    const { border } = useMemo(() => ({
        border: `${colorMode}.border`
    }), [colorMode]);
    const myData: {
        name: string,
        value: number,
        depart: string
    }[] = useMemo(() => {
        if (data === undefined) return [];
        const chart: {
            name: string,
            value: number,
            depart: string
        }[] = [];
        Object.entries(data).forEach(([name, value]) => {
            value.forEach(val => {
                chart.push({
                    name: val.time,
                    value: val[view],
                    depart: name
                });
            });
        });
        return chart;
    }, [data, view]);

    const config = {
        animation: false,
        data: myData,
        xField: 'name',
        yField: 'value',
        seriesField: 'depart',
        smooth: true,
        xAxis: {
            range: [0, 1],
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
                fontWeight={500}>Hourly </Text>
            <ShowSelector view={view} setView={setView} />
        </CardHeader>
        <CardBody p={0} minH={290}>
            {data === undefined ? <Center>
                <SmallFill />
            </Center> : <Box p={3}>
                <Line tooltip={{
                    formatter: (datum: any) => {
                        return {
                            name: datum.depart,
                            value: viewAll(datum.value, view)
                        }
                    }
                }} height={330} {...config} />
            </Box>}
        </CardBody>
    </MyCard>
}

export default HourlyChart