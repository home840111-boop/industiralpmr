import { Box, CardHeader, Flex, Text, useColorMode } from "@chakra-ui/react"
import { useEffect, useMemo, useState } from "react";
import { MachineStats } from "../..";
import MyTooltip from "../../../../../../Components/micro/MyTooltip";
import ShowSelector from "../../../../../../Components/micro/ShowSelector"
import { FormatAll } from "../../../../../Dashboard/HourlyChart";
import { Pie, G2 } from '@ant-design/plots';
import numberFormatter from "../../../../../../Components/Functions/formatters/numberFormatter";
import unitFormatter from "../../../../../../Components/Functions/formatters/unitFormatter";
import weightFormatter from "../../../../../../Components/Functions/formatters/weightFormatter";
import lengthFormatter from "../../../../../../Components/Functions/formatters/lengthFormatter";
import { factoryProductionAtom } from "../../../../../../Components/Store/atoms";
import Get from "../../../../../../Components/Store/hooks/Get";

type NameVal = {
    name: string,
    value: number
}
type views = "shots" | "production" | "material" | "electricity" | "production_meters";
const PieChart = ({
    machines
}: {
    machines: {
        [key: string]: MachineStats
    }
}) => {
    const G = G2.getEngine('canvas');
    const { colorMode } = useColorMode();
    const { border } = useMemo(() => ({
        border: `${colorMode}.border`
    }), [colorMode]);
    const [view, _setView] = useState<views>("shots");
    const productionType = Get(factoryProductionAtom);

    const setView = (view: views) => {
        if (productionType === null) return;
        if (productionType === "meter" && view === "production") view = "production_meters";
        _setView(view);
    }

    useEffect(() => {
        if (productionType === null) return;
        if (productionType === "meter") _setView("production_meters");
    }, [productionType]);

    const [data, best, worst]: [NameVal[], NameVal, NameVal] = useMemo(() => {
        const data = [] as NameVal[];
        const best: NameVal = {
            name: "",
            value: -Infinity
        };
        const worst: NameVal = {
            name: "",
            value: Infinity
        };
        for (const value of Object.values(machines)) {
            const { name } = value;
            const val = value[view];
            data.push({
                name,
                value: val
            });
            if (val > best.value) {
                best.name = name;
                best.value = val;
            }
            if (val < worst.value) {
                worst.name = name;
                worst.value = val;
            }
        }

        return [data, best, worst];
    }, [machines, view]);

    const cfg = {
        appendPadding: 10,
        data,
        angleField: 'value',
        colorField: 'name',
        radius: 0.75,
        label: {
            type: 'spider',
            labelHeight: 40,
            formatter: (data: any, mappingData: any) => {
                const group = new G.Group({});
                group.addShape({
                    type: 'circle',
                    attrs: {
                        x: 0,
                        y: 0,
                        width: 40,
                        height: 50,
                        r: 5,
                        fill: mappingData.color,
                    },
                });
                group.addShape({
                    type: 'text',
                    attrs: {
                        x: 10,
                        y: 8,
                        text: `${data.name}`,
                        fill: mappingData.color,
                    },
                });
                group.addShape({
                    type: 'text',
                    attrs: {
                        x: 0,
                        y: 25,
                        text: `${viewAll(data.value, view)}个 ${(data.percent * 100).toFixed(0)}%`,
                        fill: colorMode === "dark" ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.5)',
                        fontWeight: 700,
                    },
                });
                return group;
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

    return <Box>
        <CardHeader
            borderLeftWidth={{
                base: "0px",
                md: "1px"
            }}
            borderLeftStyle="dashed"
            borderLeftColor={border}
            display="flex" alignItems="center" justifyContent={"space-between"} px={2} pb={1} pt={5}>
            <Text fontWeight={500} fontSize="lg">Breakdown</Text>
            <ShowSelector view={view === "production_meters" ? "production" : view} setView={setView} />
        </CardHeader>
        <Flex flexDir="row">
            <Box
                border="1px dashed"
                borderColor={border}
                w='100%'
                h='100%'
                py={5}
                textAlign={"center"}>
                <Text
                    fontSize="md"
                    fontWeight={600}>
                    <MyTooltip
                        label={<FormatAll number={best.value} view={view} />}
                        placement="top">
                        {best.name}
                    </MyTooltip>
                </Text>
                <Text
                    textTransform={"capitalize"}
                    letterSpacing={1}
                    opacity={0.7}
                    fontSize="xs">
                    Highest Performer
                </Text>
            </Box>
            <Box
                border="1px dashed"
                borderColor={border}
                w='100%'
                h='100%'
                py={5}
                textAlign={"center"}>
                <Text
                    fontSize="md"
                    fontWeight={600}>
                    <MyTooltip
                        label={<FormatAll number={worst.value} view={view} />}
                        placement="top">
                        {worst.name}
                    </MyTooltip>
                </Text>
                <Text
                    textTransform={"capitalize"}
                    letterSpacing={1}
                    opacity={0.7}
                    fontSize="xs">
                    Lowest Performer
                </Text>
            </Box>
        </Flex>
        <Box borderRightWidth={{
            base: "0px",
            md: "1px"
        }}
            my={5}
            borderRightStyle="dashed"
            borderRightColor={border}>
            <Pie
                height={300}
                legend={false}
                tooltip={{
                    formatter: (datum: any) => {
                        return {
                            name: datum.name,
                            value: viewAll(datum.value, view)
                        }
                    }
                }}
                {...cfg} />
        </Box>
    </Box>
}

const viewAll = (number: number, view: views) => {
    switch (view) {
        case "shots":
            return numberFormatter(number, "shot(s)");
        case "production":
            return numberFormatter(number, "pc(s)");
        case "material":
            return weightFormatter(number)
        case "electricity":
            return unitFormatter(number);
        case "production_meters":
            return lengthFormatter(number);
    }
}

export { viewAll };
export type { NameVal }
export default PieChart