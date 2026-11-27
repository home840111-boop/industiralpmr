import { Area } from '@ant-design/plots';
import { useEffect, useMemo, useState } from 'react';
import lengthFormatter from '../../../../Components/Functions/formatters/lengthFormatter';
import format from "../../../../Components/Functions/formatters/numberFormatter";
import unitFormat from "../../../../Components/Functions/formatters/unitFormatter";
import weightFormat from "../../../../Components/Functions/formatters/weightFormatter";
import { Hour } from '../types';

const Chart = ({
    hours,
    view,
    efficiency
}: {
    hours: Hour[];
    view: "shots" | "production" | "material" | "electricity" | "production_meters";
    efficiency: number;
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
                time: hour.start + " - " + hour.end,
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
                    value: view === "shots" ? format(datum.value, "shot(s)")
                        : view === "production" ? format(datum.value, "pc(s)")
                            : view === "production_meters" ? lengthFormatter(datum.value)
                                : view === "electricity" ? unitFormat(datum.value)
                                    : view === "material" ? weightFormat(datum.value)
                                        : datum.value
                };
            }
        },
        smooth: true
    };

    return <Area
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
        legend={{
            position: 'bottom',
        }}
        animation={animation}
        {...config}
    />
}

export default Chart;