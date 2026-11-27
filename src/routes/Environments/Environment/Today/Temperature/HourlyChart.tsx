import { Line } from "@ant-design/plots"
import { Box, Center } from "@chakra-ui/react"
import { useEffect, useMemo, useState } from "react"
import { Hours } from "../.."
import NotFound from "../../../../../Components/micro/NotFound"

const HourlyChart = ({
    data,
    notFound,
}: {
    data: Hours[],
    notFound: boolean,
}) => {
    const [animation, setAnimation] = useState<boolean>(true);
    useEffect(() => {
        const timeout = setTimeout(() => {
            setAnimation(false);
        }, 5000);
        return () => {
            clearTimeout(timeout);
        }
    }, []);
    const alteredData = useMemo(() => {
        const _data: any[] = [];
        for (const value of data) {
            const time = value.time;
            _data.push({
                time,
                value: value.temperature.avg,
                type: 'Average',
            });
            _data.push({
                time,
                value: value.temperature.min,
                type: 'Minimum',
            });
            _data.push({
                time,
                value: value.temperature.max,
                type: 'Maximum',
            });
        }
        return _data;
    }, [data]);

    const config = {
        animation,
        data: alteredData,
        yAxis: {
            min: 0,
            max: 80,
            // hide all text
            label: {
                formatter: () => "",
            }
        },
        xAxis: {
            range: [0, 1],
        },
        smooth: true,
        xField: 'time',
        yField: 'value',
        seriesField: 'type',
    };

    return <Box>
        {notFound ? <Center h={"100%"}>
            <NotFound />
        </Center> : <Line
            legend={false}
            lineStyle={{
                lineWidth: 3,
            }}
            tooltip={{
                formatter: (datum: any) => {
                    return {
                        name: datum.type,
                        value: datum.value.toFixed(2) + "°",
                    };
                }
            }}
            {...config} />}
    </Box>
}

export default HourlyChart