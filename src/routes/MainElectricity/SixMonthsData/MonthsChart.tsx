import { Pie } from '@ant-design/plots';
import { MonthsChartData } from '.';
import unitFormatter from "../../../Components/Functions/formatters/unitFormatter";

const MonthsChart = ({
    data,
}: {
    data: MonthsChartData[],
}) => {

    const config = {
        appendPadding: 10,
        data,
        angleField: 'value',
        colorField: 'month',
        radius: 1,
        label: {
            type: 'inner',
            offset: '-8%',
            content: '{name}',
            style: {
                fontSize: 14,
            },
        },
        interactions: [
            {
                type: 'element-active',
            },
        ],
    };

    return <Pie
        tooltip={{
            formatter: (datum: any) => {
                return {
                    name: datum.month,
                    value: unitFormatter(datum.value)
                }
            }
        }}
        legend={{
            position: "left"
        }}
        className="chart-with-full-width"
        {...config} />
}

export default MonthsChart