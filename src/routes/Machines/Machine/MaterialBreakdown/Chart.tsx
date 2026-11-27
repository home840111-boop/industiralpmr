import { measureTextWidth, Pie } from "@ant-design/plots";
import { useColorModeValue } from "@chakra-ui/react";
import { useEffect, useMemo, useState } from "react";
import weightFormatter from "../../../../Components/Functions/formatters/weightFormatter";
import { MaterialBreakdown } from "../types";


const Chart = ({
    breakdown
}: {
    breakdown?: MaterialBreakdown;
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
    const { textColor } = useColorModeValue(
        { textColor: "#4A5568" },
        { textColor: "RGBA(255, 255, 255, 0.60)" }
    ) || {};
    function renderStatistic(containerWidth: any, text: any, style: any) {
        const { width: textWidth, height: textHeight } = measureTextWidth(text, style);
        const R = containerWidth / 2; // r^2 = (w / 2)^2 + (h - offsetY)^2

        let scale = 0.7;

        if (containerWidth < textWidth) {
            scale = Math.min(Math.sqrt(Math.abs(Math.pow(R, 2) / (Math.pow(textWidth / 2, 2) + Math.pow(textHeight, 2)))), 1);
        }

        const textStyleStr = `width:${containerWidth}px;`;
        return `<div style="color: ${textColor};${textStyleStr};font-size:${scale}em;line-height:${scale < 1 ? 1 : 'inherit'};">${text}</div>`;
    }

    const data = useMemo(() => {
        const data = Object.entries((breakdown || {})).map(([key, value]) => ({
            type: key,
            value: value.weight
        }));
        return data;
    }, [breakdown]);

    const config = {
        animation,
        appendPadding: 10,
        data,
        angleField: 'value',
        colorField: 'type',
        radius: 1,
        innerRadius: 0.7,
        // color: ["#ED8936e3"],
        meta: {
            value: {
                formatter: (v: any) => weightFormatter(v as number),
            },
        },
        tooltip: {
            showTitle: false,
            showMarkers: false,
            fields: ['type', 'value'],
            formatter: (datum: any) => {
                return {
                    name: datum.type,
                    value: weightFormatter(datum.value, breakdown?.[datum.type]?.pc_weight || null)
                }
            }
        },
        label: {
            type: 'inner',
            offset: '-50%',
            style: {
                textAlign: 'center',
            },
            autoRotate: false,
            formatter: (text: any, item: any) => {
                return weightFormatter(item._origin.value);
            }
        },
        statistic: {
            title: {
                offsetY: -4,
                customHtml: (container: any, view: any, datum: any) => {
                    const { width, height } = container.getBoundingClientRect();
                    const d = Math.sqrt(Math.pow(width / 2, 2) + Math.pow(height / 2, 2));
                    const text = datum ? datum.type : 'Total';
                    return renderStatistic(d, text, {
                        fontSize: 28,
                    });
                },
            },
            content: {
                offsetY: 4,
                style: {
                    fontSize: '25px',
                },
                customHtml: (container: any, view: any, datum: any, data: any) => {
                    const { width } = container.getBoundingClientRect();
                    const text = datum ? weightFormatter(datum.value) : weightFormatter(data.reduce((r: any, d: any) => r + d.value, 0));
                    return renderStatistic(width, text, {
                        fontSize: 25,
                    });
                },
            },
        },
        interactions: [
            {
                type: 'element-selected',
            },
            {
                type: 'element-active',
            },
        ],
    };

    return <Pie
        legend={{
            position: 'bottom',
        }}
        width={300}
        {...config} />
}

export default Chart;