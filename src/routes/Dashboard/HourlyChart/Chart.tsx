import { DualAxes } from '@ant-design/plots';
import { useEffect, useState } from 'react';
import lengthFormatter from '../../../Components/Functions/formatters/lengthFormatter';
import format from "../../../Components/Functions/formatters/numberFormatter";
import unitFormat from "../../../Components/Functions/formatters/unitFormatter";
import weightFormat from "../../../Components/Functions/formatters/weightFormatter";

const Chart = ({
    hours,
    view
}: {
    hours: {
        total: any[],
        others: any[]
    };
    view: "shots" | "production" | "material" | "electricity" | "production_meters";
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
                                : view === "production_meters" ? lengthFormatter(datum.value)
                                    : view === "material" ? weightFormat(datum.value)
                                        : datum.value
                };
            }
        }
    };

    return <DualAxes
        legend={{
            position: 'bottom',
        }}
        animation={animation}
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
}

export default Chart;