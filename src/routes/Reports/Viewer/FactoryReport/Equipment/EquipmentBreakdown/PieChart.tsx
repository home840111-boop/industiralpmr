import { G2, Pie } from '@ant-design/plots'
import { Box, CardHeader, Flex, Text, useColorMode } from '@chakra-ui/react'
import { useMemo } from 'react'
import { EquipmentStats } from '../..'
import MyTooltip from '../../../../../../Components/micro/MyTooltip'
import { NameVal } from '../../Machine/MachineBreakdown/PieChart'
import unitFormatter from "../../../../../../Components/Functions/formatters/unitFormatter";
import UnitFormatter from '../../../../../../Components/micro/UnitFormatter'

const PieChart = ({
    equipments
}: {
    equipments: {
        [key: string]: EquipmentStats
    }
}) => {
    const G = G2.getEngine('canvas');
    const { colorMode } = useColorMode();
    const { border } = useMemo(() => ({
        border: `${colorMode}.border`
    }), [colorMode]);
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
        for (const value of Object.values(equipments)) {
            const { name, electricity: val } = value;
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
    }, [equipments]);

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
                        text: `${unitFormatter(data.value)}个 ${(data.percent * 100).toFixed(0)}%`,
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
                        label={<UnitFormatter number={best.value} />}
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
                        label={<UnitFormatter number={worst.value} />}
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
                            value: unitFormatter(datum.value)
                        }
                    }
                }}
                {...cfg} />
        </Box>
    </Box>
}

export default PieChart