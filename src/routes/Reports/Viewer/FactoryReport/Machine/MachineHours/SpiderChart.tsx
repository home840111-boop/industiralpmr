import { GridItem } from "@chakra-ui/react"
import { useMemo } from "react";
import { MachineHours } from "../..";
import { Radar } from '@ant-design/plots';
import { NameVal, viewAll } from "../MachineBreakdown/PieChart";
import { viewType } from ".";

interface Data extends NameVal {
    machine: string;
}
const SpiderChart = ({
    hours,
    view
}: {
    hours: MachineHours[],
    view: viewType
}) => {
    const data: Data[] = useMemo(() => {
        const data = [] as Data[];
        for (const value of hours) {
            const machine = value.name;
            const time = value.time.split(" - ")[0];
            const val = value[view];
            data.push({
                machine,
                name: time,
                value: val
            });
        }
        return data;
    }, [hours, view]);

    const config = {
        data,
        animation: true,
        xField: 'name',
        yField: 'value',
        seriesField: 'machine',
        tooltip: {
            formatter: (datum: any) => {
                return {
                    name: datum.machine,
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

    return <>
        <GridItem colSpan={{
            base: 1,
            md: 2
        }}>
            <Radar
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
        </GridItem>
    </>
}

export default SpiderChart