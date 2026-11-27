import { Radar } from '@ant-design/plots';
import { useEffect, useMemo, useState } from 'react';
import unitFormatter from "../../../Components/Functions/formatters/unitFormatter";


interface equipmentHour {
    hour: string;
    equipment: string;
    value: number;
}
const Chart = ({
    equipments,
}: {
    equipments: equipmentHour[],
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
    const data = useMemo(() => {
        return equipments.map(machine => {
            return {
                hour: machine.hour,
                machine: machine.equipment,
                value: machine.value
            }
        })
    }, [equipments]);

    const config = {
        data,
        animation,
        xField: 'hour',
        yField: 'value',
        seriesField: 'machine',
        tooltip: {
            formatter: (datum: any) => {
                return {
                    name: datum.machine,
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

    return <Radar
        legend={{
            position: 'right',
            marker: {
                symbol: 'diamond',
                style: {
                    fill: 'transparent',
                    r: 5,
                },
            },
        }}
        {...config} />;
}

export default Chart