import { measureTextWidth, Pie } from "@ant-design/plots";
import { CardBody, CardHeader, Center, Text, useColorMode, useColorModeValue } from "@chakra-ui/react";
import { Suspense, useEffect, useMemo, useState } from "react";
import { SmallFill } from "../../../Components/Loaders";
import MyCard from "../../../Components/micro/Card";
import NotFound from "../../../Components/micro/NotFound";
import ShowSelector from "../../../Components/micro/ShowSelector";
import weightFormatter from "../../../Components/Functions/formatters/weightFormatter";
import unitFormatter from "../../../Components/Functions/formatters/unitFormatter";
import numberFormatter from "../../../Components/Functions/formatters/numberFormatter";
import { MoldReport } from "./types";
import { factoryProductionAtom } from "../../../Components/Store/atoms";
import Get from "../../../Components/Store/hooks/Get";
import lengthFormatter from "../../../Components/Functions/formatters/lengthFormatter";

type views = "shots" | "production" | "material" | "electricity" | "production_meters";
const MoldBreakdown = ({
    notFound,
    moldBreakdown
}: {
    notFound: boolean;
    moldBreakdown?: MoldReport;
}) => {
    const isLoading = moldBreakdown === undefined || Object.keys(moldBreakdown).length === 0;
    const { colorMode } = useColorMode();
    const { border } = useMemo(() => {
        return {
            border: `${colorMode}.border`,
        }
    }, [colorMode]);
    const productionType = Get(factoryProductionAtom);
    const [view, _setView] = useState<views>("shots");

    const setView = (view: views) => {
        if (productionType === null) return;
        if (productionType === "meter" && view === "production") view = "production_meters";
        _setView(view);
    }

    useEffect(() => {
        if (productionType === null) return;
        if (productionType === "meter") _setView("production_meters");
    }, [productionType])

    return <MyCard
        w="100%"
        h="100%"
        noPadding>
        <CardHeader
            display={"flex"}
            justifyContent={"space-between"}
            alignItems={"center"}
            py={4}
            borderBottom="1px solid"
            borderColor={border}>
            <Text
                fontSize="md"
                fontWeight={500}>Mold Breakdown</Text>
            <ShowSelector view={view === "production_meters" ? "production" : view} setView={setView} />
        </CardHeader>
        <CardBody h="100%" p={0}>
            {
                notFound ? <Suspense fallback={<SmallFill />}>
                    <NotFound />
                </Suspense> : isLoading ? <SmallFill /> : <Center>
                    <Chart breakdown={moldBreakdown} view={view} />
                </Center>
            }
        </CardBody>
    </MyCard>

}

const Chart = ({
    breakdown,
    view
}: {
    breakdown?: MoldReport;
    view: views;
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
            value: value[view]
        }));
        return data;
    }, [breakdown, view]);

    const config = {
        animation,
        appendPadding: 10,
        data,
        angleField: 'value',
        colorField: 'type',
        radius: 1,
        innerRadius: 0.7,
        color: ["#ED8936e3"],
        pieStyle: {
            lineWidth: 1,
            stroke: textColor
        },
        tooltip: {
            showTitle: false,
            showMarkers: false,
            fields: ['type', 'value'],
            formatter: (datum: any) => {
                return {
                    name: datum.type,
                    value: view === "electricity" ? unitFormatter(datum.value)
                        : view === "material" ? weightFormatter(datum.value)
                            : view === "production_meters" ? lengthFormatter(datum.value)
                                : view === "shots" ? numberFormatter(datum.value, "shot(s)")
                                    : numberFormatter(datum.value, "piece(s)")
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
                return view === "electricity" ? unitFormatter(item._origin.value)
                    : view === "material" ? weightFormatter(item._origin.value)
                        : view === "production_meters" ? lengthFormatter(item._origin.value)
                            : view === "shots" ? numberFormatter(item._origin.value, "shot(s)")
                                : numberFormatter(item._origin.value, "piece(s)")
            }
        },
        statistic: {
            title: {
                color: textColor,
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
                customHtml: (container: any, _view: any, datum: any, data: any) => {
                    const { width } = container.getBoundingClientRect();
                    const val = datum ? datum.value : data.reduce((r: any, d: any) => r + d.value, 0);
                    const text = view === "electricity" ? unitFormatter(val)
                        : view === "material" ? weightFormatter(val)
                        : view === "production_meters" ? lengthFormatter(val)
                            : view === "shots" ? numberFormatter(val, "shot(s)")
                                : numberFormatter(val, "piece(s)")
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

export default MoldBreakdown