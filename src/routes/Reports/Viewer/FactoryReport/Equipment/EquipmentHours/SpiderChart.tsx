import { Radar } from "@ant-design/plots"
import { GridItem } from "@chakra-ui/react"
import { useMemo } from "react";
import { EquipmentHours } from "../..";
import { NameVal } from "../../Machine/MachineBreakdown/PieChart";
import unitFormatter from "../../../../../../Components/Functions/formatters/unitFormatter";

interface Data extends NameVal {
    equipment: string;
}
const SpiderChart = ({
    hours,
}: {
    hours: EquipmentHours[],
}) => {
    const data: Data[] = useMemo(() => {
        const data = [] as Data[];
        for (const value of hours) {
            const equipment = value.name;
            const electricity = value.electricity;
            const time = value.time.split(" - ")[0];
            const val = electricity;
            data.push({
                equipment,
                name: time,
                value: val
            });
        }
        return data;
    }, [hours]);

    const config = {
        data,
        animation: true,
        xField: 'name',
        yField: 'value',
        seriesField: 'equipment',
        tooltip: {
            formatter: (datum: any) => {
                return {
                    name: datum.equipment,
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

    return <GridItem colSpan={{
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
}

export default SpiderChart