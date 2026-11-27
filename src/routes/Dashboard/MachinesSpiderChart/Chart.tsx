import { Radar } from '@ant-design/plots';
import { useEffect, useMemo, useState } from 'react';
import lengthFormatter from '../../../Components/Functions/formatters/lengthFormatter';
import numberFormatter from "../../../Components/Functions/formatters/numberFormatter";
import unitFormatter from "../../../Components/Functions/formatters/unitFormatter";
import weightFormatter from "../../../Components/Functions/formatters/weightFormatter";


interface machinesHour {
    hour: string;
    machine: string;
    value: {
        shots: number;
        production: number;
        production_meters: number;
        material: number;
        electricity: number;
    };
}
const Chart = ({
    machines,
    view
}: {
    machines: machinesHour[],
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
    const data = useMemo(() => {
        return machines.map(machine => {
            return {
                hour: machine.hour,
                machine: machine.machine,
                value: machine.value[view]
            }
        })
    }, [machines, view]);

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
                    value: view === "shots" ?
                        numberFormatter(datum.value, "shot(s)") :
                        view === "production" ?
                            numberFormatter(datum.value, "pc(s)") :
                            view === "material" ?
                                weightFormatter(datum.value) :
                                view === "production_meters" ?
                                    lengthFormatter(datum.value) :
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

    return <Radar
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
        {...config} />;
}

export default Chart