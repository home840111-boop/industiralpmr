import { Area } from '@ant-design/plots';
import { useEffect, useMemo, useState } from 'react';
import { Hour, Status } from '.';
import secFormatter from '../../../Components/Functions/formatters/secFormatter';
import unitFormat from "../../../Components/Functions/formatters/unitFormatter";

const Chart = ({
    hours,
    view,
    status
}: {
    hours: Hour[];
    view: "ontime" | "electricity";
    status: Status;
}) => {
    const [animation, setAnimation] = useState(true);
    useEffect(() => {
        const timeout = setTimeout(() => {
            setAnimation(false);
        }, 5000);

        return () => {
            clearTimeout(timeout);
        }
    }, []);
    const values = useMemo(() => {
        const values: any[] = [];
        for (const hour of hours) {
            values.push({
                time: hour.time,
                value: hour[view]
            });
        }
        return values;
    }, [hours, view]) || [];

    const config = {
        data: values,
        xField: 'time',
        yField: 'value',
        xAxis: {
            range: [0, 1],
        },
        tooltip: {
            formatter: (datum: any) => {
                return {
                    name: datum.name,
                    value: view === "ontime" ? secFormatter(datum.value)
                        : view === "electricity" ? unitFormat(datum.value)
                            : datum.value
                };
            }
        },
        smooth: true
    };

    return <Area
        height={300}
        color={status === "ON" ? "green" :
            status === "OFF" ? "red" :
                status === "IDLE" ? "orange" :
                    "gray"}
        line={{
            color: status === "ON" ? "green" :
                status === "OFF" ? "red" :
                    status === "IDLE" ? "orange" :
                        "gray"
        }}
        areaStyle={{
            fillOpacity: 0.1,
            fill: status === "ON" ? "green" :
                status === "OFF" ? "red" :
                    status === "IDLE" ? "orange" :
                        "gray",
        }}
        legend={{
            position: 'bottom',
        }}
        animation={animation}
        {...config}
    />
}

export default Chart;