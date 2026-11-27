import { G2, Pie } from "@ant-design/plots";
import { CardBody, CardHeader, Text, useColorMode } from "@chakra-ui/react";
import { useMemo } from "react";
import MyCard from "../../../../../Components/micro/Card";
import { MaterialBreakdown as MaterialBreakdownType } from "../../../../Machines/Machine/types"
import weightFormatter from "../../../../../Components/Functions/formatters/weightFormatter";

const MaterialBreakdown = ({
    materialBreakdown
}: {
    materialBreakdown: MaterialBreakdownType
}) => {
    const G = G2.getEngine('canvas');
    const { colorMode } = useColorMode();
    const { border } = useMemo(() => {
        return {
            border: `${colorMode}.border`,
        }
    }, [colorMode]);
    const data = useMemo(() => {
        const data = Object.entries((materialBreakdown || {})).map(([key, value]) => ({
            name: key.toUpperCase(),
            value: value.weight
        }));
        return data;
    }, [materialBreakdown]);

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
                        text: `${weightFormatter(data.value, materialBreakdown?.[data?.name?.toLowerCase()]?.pc_weight || null)}个 ${(data.percent * 100).toFixed(0)}%`,
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
                fontWeight={500}>Material Breakdown</Text>
        </CardHeader>
        <CardBody h="100%" p={0}>
            <Pie
                height={300}
                legend={false}
                tooltip={{
                    formatter: (datum: any) => {
                        return {
                            name: datum.name,
                            value: weightFormatter(datum.value, materialBreakdown?.[datum?.name?.toLowerCase()]?.pc_weight || null),
                        }
                    }
                }}
                {...cfg} />
        </CardBody>
    </MyCard>
}

export default MaterialBreakdown