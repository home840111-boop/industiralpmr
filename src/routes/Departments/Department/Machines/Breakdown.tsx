import { CardBody, CardHeader, Flex, Text, useColorMode } from "@chakra-ui/react"
import { useMemo, useState } from "react";
import MyCard from "../../../../Components/micro/Card"
import ShowSelector, { views } from "../../../../Components/micro/ShowSelector";
import { Pie, G2 } from '@ant-design/plots';
import { viewAll } from "../../../../routes/Reports/Viewer/FactoryReport/Machine/MachineBreakdown/PieChart";
import { SmallFill } from "../../../../Components/Loaders";

const Breakdown = ({
    data
}: {
    data?: {
        name: string,
        shots: number,
        production: number,
        material: number,
        electricity: number,
    }[]
}) => {
    const G = G2.getEngine('canvas');
    const [view, setView] = useState<views>("shots");
    const { colorMode } = useColorMode();
    const { border } = useMemo(() => ({
        border: `${colorMode}.border`,
    }), [colorMode]);

    const cfg = {
        appendPadding: 10,
        data: data || [],
        angleField: view,
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
                        text: `${viewAll(data[view], view)}个 ${(data.percent * 100).toFixed(0)}%`,
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
        <CardBody p={0}>
            {data === undefined ? <SmallFill /> :
                <Pie
                    height={300}
                    legend={false}
                    animation={false}
                    tooltip={{
                        formatter: (datum: any) => {
                            return {
                                name: datum.name,
                                value: viewAll(datum.value || 0, view)
                            }
                        }
                    }}
                    {...cfg} />}
        </CardBody>
    </MyCard>
}

export default Breakdown