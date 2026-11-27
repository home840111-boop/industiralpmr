import { Heatmap } from "@ant-design/plots"
import { useColorMode } from "@chakra-ui/react";
import { Data } from ".";
import unitFormatter from "../../../Components/Functions/formatters/unitFormatter";

const Chart = ({
    data
}: {
    data: Data[]
}) => {
    const { colorMode } = useColorMode();
    const color = colorMode === "light" ?
        "#f5d6bc-#f5ad73-#ED8936" :
        "#63350e-#a15b22-#ED8936";

    const config = {
        data,
        xField: 'time',
        yField: 'day',
        colorField: 'value',
        color,
        heatmapStyle: {
            stroke: colorMode === "light" ? '#f5f5f5' : "#5c5a5a",
            opacity: 0.8,
        },
        meta: {
            time: {
                type: 'cat',
            },
            value: {
                min: 0,
                max: Math.ceil(data.reduce((acc, cur) => Math.max(acc, cur.value), 0)),
            },
        },
        tooltip: {
            showMarkers: false,
            formatter: (v: any) => {
                return {
                    name: v.day,
                    value: unitFormatter(v.value)
                }
            }
        },
        interactions: [
            {
                type: 'element-active',
            },
        ],
    };

    return <Heatmap
        coordinate={{
            type: 'polar',
            cfg: {
                innerRadius: 0.2,
            }
        }}
        xAxis={{
            line: null,
            grid: null,
            tickLine: null,
            label: {
                offset: 2,
                style: {
                    fill: '#666',
                    fontSize: 12,
                    textBaseline: 'top',
                },
            },
        }}
        yAxis={{
            top: true,
            line: null,
            grid: null,
            tickLine: null,
            label: {
                offset: 0,
                style: {
                    fill: colorMode === "light" ? '#5c5a5a' : "#f5f5f5",
                    textAlign: 'center',
                    shadowBlur: 2,
                    shadowColor: 'rgba(0, 0, 0, .10)',
                },
            },
        }}
        legend={{
            position: "right"
        }}
        className="chart-with-full-width"
        {...config} />
}

export default Chart