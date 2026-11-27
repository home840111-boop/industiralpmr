import { Box, CircularProgress, CircularProgressLabel, Flex, HStack, Progress, Td, Text, Tr, useColorMode, VStack } from "@chakra-ui/react";
import { useMemo } from "react";
import { DataToSet } from "..";
import minifiedSecFormatter from "../../../../../Components/Functions/formatters/minifiedSecFormatter";
import secFormatter from "../../../../../Components/Functions/formatters/secFormatter";
import LengthFormatter from "../../../../../Components/micro/LengthFormatter";
import MyTooltip from "../../../../../Components/micro/MyTooltip";
import NumberFormatter from "../../../../../Components/micro/NumberFormatter";
import UnitFormatter from "../../../../../Components/micro/UnitFormatter";
import WeightFormatter from "../../../../../Components/micro/WeightFormatter";
import { factoryProductionAtom } from "../../../../../Components/Store/atoms";
import Get from "../../../../../Components/Store/hooks/Get";

const MoldRow = ({
    mold,
    moldName
}: {
    mold: DataToSet["molds"][0],
    moldName: string
}) => {
    const { colorMode } = useColorMode();
    const productionType = Get(factoryProductionAtom);
    const { border, subText, text } = useMemo(() => ({
        border: `${colorMode}.border`,
        subText: `${colorMode}.subText`,
        text: `${colorMode}.text`,
    }), [colorMode]);
    const data = useMemo(() => {
        const { stats, details } = mold;
        let totalWeight = 0;
        const materials: {
            name: string,
            weight: number,
            pc_weight: number | null
        }[] = [];
        if (details.materials === undefined) {
            materials.push({
                name: details.material.toUpperCase(),
                weight: details.productWeight,
                pc_weight: null
            });
            totalWeight += details.productWeight;
            if (details.multiComponent) {
                materials.push({
                    name: details.material2.toUpperCase(),
                    weight: details.productWeight2,
                    pc_weight: null
                });
                totalWeight += details.productWeight2;
            }
        } else {
            details.materials.forEach(material => {
                materials.push({
                    name: material.name.toUpperCase(),
                    weight: material.weight,
                    pc_weight: material.pc_weight || null
                });
                totalWeight += material.weight;
            })
        }
        const data = {
            name: moldName.toUpperCase(),
            cavities: details.cavities,
            productName: details.product.toUpperCase(),
            productColor: details.productColor,
            totalWeight,
            materials,
            efficiency: +(
                stats.ontime &&
                    stats.ontime + stats.idletime
                    ? (stats.ontime /
                        (stats.ontime + stats.idletime)) *
                    100
                    : 0
            ).toFixed(2),
            cycleTime: +(
                (stats.ontime / stats.shots) || 0
            ).toFixed(0),
            shots: stats.shots,
            production_meters: stats.production_meters,
            production: stats.production,
            electricity: stats.electricity,
            material: stats.material,
            on: stats.ontime,
            idle: stats.idletime,
            rejected: mold.rejected
        }
        return data;
    }, [mold, moldName]);

    return <Tr
        fontWeight={600}
        p="0">
        <Td
            borderRight={"1px solid"}
            borderColor={border}>
            <HStack gap={3}>
                <MyTooltip
                    label={`Mold Efficiency: ${data.efficiency}%`}>
                    <CircularProgress
                        trackColor={"#cccccc40"}
                        capIsRound
                        value={data.efficiency}
                        color={
                            data.efficiency >= 75 ? "green" :
                                data.efficiency >= 50 ? "orange" :
                                    "red"
                        }>
                        <CircularProgressLabel fontSize="xx-small">
                            {data.efficiency}%
                        </CircularProgressLabel>
                    </CircularProgress>
                </MyTooltip>
                <VStack alignItems={"flex-start"}>
                    <Text fontWeight={700} fontSize={"lg"}>
                        {data.name}
                    </Text>
                    <Text
                        textTransform={"uppercase"}
                        color={subText}
                        fontSize={"xs"}
                        fontWeight={700}>
                        AVG. Cycle Time: <Text
                            textTransform={"lowercase"}
                            as={"span"}
                            ml={2}
                            fontWeight={"bold"}
                            color={text}>
                            {data.cycleTime}s
                        </Text>
                    </Text>
                </VStack>
            </HStack>
        </Td>
        <Td>
            <VStack alignItems={"flex-start"}>
                {productionType === "meter" ? <Text
                    textTransform={"uppercase"}
                    color={subText}
                    fontSize={"sm"}>
                    production: <Text
                        textTransform={"lowercase"}
                        as={"span"}
                        ml={2}
                        fontWeight={"bold"}
                        color={text}>
                        <LengthFormatter number={data.production_meters} />
                    </Text>
                </Text> : <>
                    <Text
                        textTransform={"uppercase"}
                        color={subText}
                        fontSize={"sm"}>
                        shots: <Text
                            textTransform={"lowercase"}
                            as={"span"}
                            ml={2}
                            fontWeight={"bold"}
                            color={text}>
                            <NumberFormatter number={data.shots} suffix={"shot(s)"} />
                        </Text>
                    </Text>
                    <Text
                        textTransform={"uppercase"}
                        color={subText}
                        fontSize={"sm"}>
                        production: <Text
                            textTransform={"lowercase"}
                            as={"span"}
                            ml={2}
                            fontWeight={"bold"}
                            color={text}>
                            <NumberFormatter number={data.production} suffix={"pc(s)"} />
                        </Text>
                    </Text>
                </>}
            </VStack>
        </Td>
        <Td>
            <VStack alignItems={"flex-start"}>
                <Text
                    textTransform={"uppercase"}
                    color={subText}
                    fontSize={"sm"}>
                    electricity: <Text
                        textTransform={"lowercase"}
                        as={"span"}
                        ml={2}
                        fontWeight={"bold"}
                        color={text}>
                        <UnitFormatter number={data.electricity} />
                    </Text>
                </Text>
                <Text
                    textTransform={"uppercase"}
                    color={subText}
                    fontSize={"sm"}>
                    material: <Text
                        textTransform={"lowercase"}
                        as={"span"}
                        ml={2}
                        fontWeight={"bold"}
                        color={text}>
                        <WeightFormatter number={data.material} />
                    </Text>
                </Text>
            </VStack>
        </Td>
        <Td>
            <HStack>
                <VStack
                    alignItems={"flex-start"}>
                    <Box
                        gap={3}
                        display="flex"
                        alignItems={"center"}
                        justifyContent="center"
                        textTransform={"uppercase"}
                        color={subText}
                        fontSize={"sm"}>
                        on time:
                    </Box>
                    <Box
                        gap={3}
                        display="flex"
                        alignItems={"center"}
                        justifyContent="center"
                        textTransform={"uppercase"}
                        color={subText}
                        fontSize={"sm"}>
                        idle time:
                    </Box>
                </VStack>
                <VStack>
                    <Box
                        gap={3}
                        display="flex"
                        alignItems={"center"}
                        justifyContent="center"
                        textTransform={"uppercase"}
                        color={subText}
                        fontSize={"sm"}>
                        <Progress
                            w="100px"
                            size="sm"
                            borderRightRadius={'md'}
                            colorScheme="green"
                            value={
                                (data.on / (data.on + data.idle) * 100) || 0
                            }
                        />
                        <Text
                            textTransform={"lowercase"}
                            as={"span"}
                            ml={2}
                            fontWeight={"bold"}
                            color={text}>
                            <MyTooltip
                                label={secFormatter(data.on)}
                                hasArrow={true}
                                placement={"top"}
                                bg={"gray.700"}
                                color={"white"}
                                fontSize={"xs"}
                                fontWeight={400}
                                borderRadius={"md"}
                                boxShadow={"md"}
                                p={2}
                                m={0}>
                                {minifiedSecFormatter(data.on)}
                            </MyTooltip>
                        </Text>
                    </Box>
                    <Box
                        gap={3}
                        display="flex"
                        alignItems={"center"}
                        justifyContent="center"
                        textTransform={"uppercase"}
                        color={subText}
                        fontSize={"sm"}>
                        <Progress
                            w="100px"
                            size="sm"
                            borderRightRadius={'md'}
                            colorScheme="orange"
                            value={
                                (data.idle / (data.on + data.idle) * 100) || 0
                            }
                        />
                        <Text
                            textTransform={"lowercase"}
                            as={"span"}
                            ml={2}
                            fontWeight={"bold"}
                            color={text}>
                            <MyTooltip
                                label={secFormatter(data.idle)}
                                hasArrow={true}
                                placement={"top"}
                                bg={"gray.700"}
                                color={"white"}
                                fontSize={"xs"}
                                fontWeight={400}
                                borderRadius={"md"}
                                boxShadow={"md"}
                                p={2}
                                m={0}>
                                {minifiedSecFormatter(data.idle)}
                            </MyTooltip>
                        </Text>
                    </Box>
                </VStack>
            </HStack>
        </Td>
        <Td>
            <VStack
                alignItems={"flex-start"}>
                <Text
                    textTransform={"uppercase"}
                    color={subText}
                    fontSize={"sm"}>
                    Product Name: <Text
                        textTransform={"uppercase"}
                        as={"span"}
                        ml={2}
                        fontWeight={"bold"}
                        color={text}>
                        {data.productName} - ({data.productColor})
                    </Text>
                </Text>
                <Text
                    textTransform={"uppercase"}
                    color={subText}
                    fontSize={"sm"}>
                    Product T. Weight: <Text
                        textTransform={"lowercase"}
                        as={"span"}
                        ml={2}
                        fontWeight={"bold"}
                        color={text}>
                        <WeightFormatter number={data.totalWeight} />
                    </Text>
                </Text>
                <Text
                    textTransform={"uppercase"}
                    color={subText}
                    fontSize={"sm"}>
                    Materials:
                    <Flex flexDir={"column"} ml={3}>
                        {data.materials.map((material, i) => <Text
                            key={i}
                            as={"span"}
                            m={0}
                            fontWeight={"bold"}
                            color={text}>
                            {material.name} - <WeightFormatter number={material.weight} pc_weight={material.pc_weight} />
                        </Text>)}
                    </Flex>
                </Text>
            </VStack>
        </Td>
    </Tr>
}

export default MoldRow