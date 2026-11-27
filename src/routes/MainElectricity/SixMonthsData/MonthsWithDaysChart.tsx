import { MonthsWithDaysChartData } from ".";
import { Area } from '@ant-design/plots';
import unitFormatter from "../../../Components/Functions/formatters/unitFormatter";

const MonthsWithDaysChart = ({
    data,
}: {
    data: MonthsWithDaysChartData[],
}) => {

    const config = {
        smooth: true,
        data,
        xField: 'day',
        yField: 'value',
        seriesField: 'month',
    };

    return <Area
        tooltip={{
            formatter: (datum: any) => {
                return {
                    name: datum.month,
                    value: unitFormatter(datum.value),
                }
            }
        }}
        {...config} />
}

export default MonthsWithDaysChart