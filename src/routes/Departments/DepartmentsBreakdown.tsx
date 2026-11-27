import { Pie, measureTextWidth } from '@ant-design/plots';
import { Box, CardBody, CardHeader, Flex, Text, useColorMode } from "@chakra-ui/react"
import MyTooltip from "../../Components/micro/MyTooltip";
import { useMemo, useState } from "react"
import { DataToSet } from "."
import { SmallFill } from "../../Components/Loaders"
import MyCard from "../../Components/micro/Card"
import ShowSelector, { views } from "../../Components/micro/ShowSelector"
import { FormatAll } from "../../routes/Dashboard/HourlyChart";
import { NameVal } from "../Reports/Viewer/FactoryReport/Machine/MachineBreakdown/PieChart";
import { viewAll } from "../../routes/Reports/Viewer/FactoryReport/Machine/MachineBreakdown/PieChart";
const DepartmentsBreakdown = ({
    data
}: {
    data?: DataToSet["departmentBreakdown"]
}) => {
    const [view, setView] = useState<views>("shots");
    const { colorMode } = useColorMode();
    const { border, text } = useMemo(() => ({
        border: `${colorMode}.border`,
        text: colorMode === "light" ? "#4A5568" : "RGBA(255, 255, 255, 0.80)"
    }), [colorMode]);
    const [chart, high, low]: [
        NameVal[],
        NameVal,
        NameVal
    ] = useMemo(() => {
        const high = {
            name: "",
            value: -Infinity
        };
        const low = {
            name: "",
            value: Infinity
        };
        const chart: NameVal[] = [];
        Object.entries(data || {}).forEach(([name, value]) => {
            if (value[view] > high.value) {
                high.name = name;
                high.value = value[view];
            }
            if (value[view] < low.value) {
                low.name = name;
                low.value = value[view];
            }
            chart.push({
                name,
                value: value[view]
            });
        });
        return [chart, high, low]
    }, [data, view]);

    function renderStatistic(containerWidth: any, _text: any, style: any) {
        const { width: textWidth, height: textHeight } = measureTextWidth(_text, style);
        const R = containerWidth / 2; // r^2 = (w / 2)^2 + (h - offsetY)^2

        let scale = 1;

        if (containerWidth < textWidth) {
            scale = Math.min(Math.sqrt(Math.abs(Math.pow(R, 2) / (Math.pow(textWidth / 2, 2) + Math.pow(textHeight, 2)))), 1);
        }

        const textStyleStr = `width:${containerWidth}px;color:${text};`;
        return `<div style="${textStyleStr};font-size:${scale}em;line-height:${scale < 1 ? 1 : 'inherit'};">${_text}</div>`;
    }

    const config = {
        appendPadding: 10,
        data: chart,
        angleField: 'value',
        colorField: 'name',
        radius: 1,
        innerRadius: 0.64,
        meta: {
            value: {
                formatter: (v: any) => viewAll(v, view),
            },
        },
        label: {
            type: 'inner',
            offset: '-50%',
            style: {
                textAlign: 'center',
            },
            autoRotate: false,
            content: '{name}',
        },
        statistic: {
            title: {
                offsetY: -4,
                customHtml: (container: any, view: any, datum: any) => {
                    const { width, height } = container.getBoundingClientRect();
                    const d = Math.sqrt(Math.pow(width / 2, 2) + Math.pow(height / 2, 2));
                    const text = datum ? datum.name : 'Total';
                    return renderStatistic(d, text, {
                        fontSize: 22,
                    });
                },
            },
            content: {
                offsetY: 4,
                style: {
                    fontSize: '16px',
                },
                customHtml: (container: any, _view: any, datum: any) => {
                    const { width } = container.getBoundingClientRect();
                    const text = datum ? viewAll(datum.value, view) : viewAll(chart.reduce((r: any, d: any) => r + d.value, 0), view);
                    return renderStatistic(width, text, {
                        fontSize: 32,
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
            {
                type: 'pie-statistic-active',
            },
        ],
    };

    return <MyCard noPadding>
        <CardHeader
            alignItems="center"
            justifyContent="space-between"
            as={Flex}
            p={2}
            borderBottom="1px solid"
            borderColor={border}>
            <Text
                fontSize="md"
                fontWeight={500}>Breakdown</Text>
            <ShowSelector view={view} setView={setView} />
        </CardHeader>
        <CardBody p={0} minH={300}>
            {data === undefined ? <SmallFill /> : <Flex flexDir="column">
                <Flex
                    borderBottom="1px dashed"
                    borderColor={border}
                    flexDir={"row"}
                    justifyContent="space-evenly"
                    alignItems="center"
                    mb={5}>
                    <Box
                        borderRight="1px dashed"
                        borderLeft="1px dashed"
                        w='100%'
                        h='100%'
                        py={1}
                        borderColor={border}
                        textAlign={"center"}>
                        <Text
                            fontSize="md"
                            fontWeight={600}>
                            <MyTooltip label={<FormatAll number={high.value} view={view} />}>
                                {high.name}
                            </MyTooltip>
                        </Text>
                        <Text
                            letterSpacing={1}
                            opacity={0.7}
                            fontSize="xs">
                            Highest Performance
                        </Text>
                    </Box>
                    <Box
                        borderRight="1px dashed"
                        borderLeft="1px dashed"
                        w='100%'
                        h='100%'
                        py={1}
                        borderColor={border}
                        textAlign={"center"}>
                        <Text
                            fontSize="md"
                            fontWeight={600}>
                            <MyTooltip label={<FormatAll number={low.value} view={view} />}>
                                {low.name}
                            </MyTooltip>
                        </Text>
                        <Text
                            letterSpacing={1}
                            opacity={0.7}
                            fontSize="xs">
                            Lowest Performance
                        </Text>
                    </Box>
                </Flex>
                <Box pt={2}>
                    <Pie
                        height={250}
                        legend={{
                            position: "bottom"
                        }} animation={false} {...config} />
                </Box>
            </Flex>}
        </CardBody>
    </MyCard>
}

export default DepartmentsBreakdown