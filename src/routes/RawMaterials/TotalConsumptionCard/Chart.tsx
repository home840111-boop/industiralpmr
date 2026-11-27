import { Area } from "@ant-design/plots"
import { ChartData } from ".";
import weightFormatter from "../../../Components/Functions/formatters/weightFormatter";

const Chart = ({
    data
}: {
    data: ChartData[]
}) => {

    const config = {
        data,
        xField: 'day',
        yField: 'value',
        color: '#ED8936',
        smooth: true,
        yAxis: {
            tickCount: 0,
        },
    };

    return <Area
        tooltip={{
            formatter: (datum: any) => {
                return {
                    name: datum.day,
                    value: weightFormatter(datum.value * 1000)
                }
            }
        }}
        xAxis={{
            label: {
                formatter: (text: string) => {
                    return text.split(",")[0]
                }
            }
        }}
        style={{
            height: "120px"
        }}
        {...config} />
}

export default Chart