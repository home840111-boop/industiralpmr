import { Flex, GridItem, SimpleGrid, Text, useColorMode, Icon, Box, VStack, CardHeader } from "@chakra-ui/react"
import MyCard from "../../../../../Components/micro/Card"
import StatsBlock from "../../StatsBlock"
import NumberFormatter from "../../../../../Components/micro/NumberFormatter"
import UnitFormatter from "../../../../../Components/micro/UnitFormatter"
import WeightFormatter from "../../../../../Components/micro/WeightFormatter"
import { BsFillGearFill } from "react-icons/bs"
import { HiLightningBolt } from "react-icons/hi"
import { FiUser } from "react-icons/fi"
import { FaBoxes, FaCubes } from "react-icons/fa"
import { DataToSet } from ".."
import { useMemo } from "react"
import Get from "../../../../../Components/Store/hooks/Get"
import { factoryProductionAtom, factoryProductionType, offtimeBasedEfficiencyAtom } from "../../../../../Components/Store/atoms"
import LengthFormatter from "../../../../../Components/micro/LengthFormatter"
import TimingSummary from "../../TimingSummary"

const FactoryTotal = ({
    data
}: {
    data: DataToSet
}) => {
    const { colorMode } = useColorMode();
    const { border } = useMemo(() => ({
        border: `${colorMode}.border`
    }), [colorMode]);
    const shifts = useMemo(() => {
        let count = 0;
        if (data.shifts.A) count++;
        if (data.shifts.B) count++;
        if (data.shifts.C) count++;
        return count;
    }, [data.shifts]);
    const productionType = Get(factoryProductionAtom);
    const offtimeBasedEfficiency = !!Get(offtimeBasedEfficiencyAtom);

    return <MyCard p={0}>
        <CardHeader borderBottom={"1px solid"} borderColor={border} display="flex" alignItems="center" justifyContent={"space-between"} px={2} pb={1} pt={3}>
            <Text fontWeight={500} fontSize="lg">Factory Total</Text>
        </CardHeader>
        <SimpleGrid
            columns={{
                base: 1,
                lg: 5
            }}>
            <GridItem colSpan={{
                base: 1,
                lg: 2
            }}>
                <SimpleGrid
                    h="100%"
                    columns={{
                        base: 1,
                        sm: 2,
                    }}>
                    {productionType === "meter" ? <>
                        <StatsBlock icon={FaBoxes} span={2} title="Production" value={<LengthFormatter number={data.total.production_meters} />} />
                    </> : <>
                        <StatsBlock icon={BsFillGearFill} title="Shots" value={<NumberFormatter number={data.total.shots} suffix="shot(s)" />} />
                        <StatsBlock icon={FaBoxes} title="Production" value={<NumberFormatter number={data.total.production} suffix="pc(s)" />} />
                    </>}
                    <StatsBlock icon={HiLightningBolt} title="Electricity Usage" value={<UnitFormatter number={data.total.electricity} />} />
                    <StatsBlock icon={FaCubes} title="Material Consumption" value={<WeightFormatter number={data.total.material} />} />
                    <TimingSummary timing={data.fleetTiming} offtimeBasedEfficiency={offtimeBasedEfficiency} />
                </SimpleGrid>
            </GridItem>
            <GridItem h="100%" colSpan={{
                base: 1,
                lg: 3
            }}>
                <SimpleGrid h="100%" columns={{
                    base: 1,
                    lg: shifts
                }}>
                    {data.shifts.A && <ShiftBlock productionType={productionType} shift="A" name={data.shifts.A.supervisor} production_meters={data.shifts.A.production_meters} shots={data.shifts.A.shots} production={data.shifts.A.production} material={data.shifts.A.material} electricity={data.shifts.A.electricity} timing={data.shifts.A.timing} />}
                    {data.shifts.B && <ShiftBlock productionType={productionType} shift="B" name={data.shifts.B.supervisor} production_meters={data.shifts.B.production_meters} shots={data.shifts.B.shots} production={data.shifts.B.production} material={data.shifts.B.material} electricity={data.shifts.B.electricity} timing={data.shifts.B.timing} />}
                    {data.shifts.C && <ShiftBlock productionType={productionType} shift="C" name={data.shifts.C.supervisor} production_meters={data.shifts.C.production_meters} shots={data.shifts.C.shots} production={data.shifts.C.production} material={data.shifts.C.material} electricity={data.shifts.C.electricity} timing={data.shifts.C.timing} />}
                </SimpleGrid>
            </GridItem>
        </SimpleGrid>
    </MyCard>
}

const ShiftBlock = ({
    name,
    shift,
    shots,
    production_meters,
    productionType,
    production,
    material,
    electricity,
    timing
}: {
    name: string;
    shift: "A" | "B" | "C";
    shots: number;
    production_meters: number;
    production: number;
    productionType: factoryProductionType | null
    material: number;
    electricity: number;
    timing: string;
}) => {
    const { colorMode } = useColorMode();
    const { border, subText, text } = useMemo(() => ({
        border: `${colorMode}.border`,
        subText: `${colorMode}.subText`,
        text: `${colorMode}.text`,
    }), [colorMode]);

    return <Flex h="100%" pt={4} border="1px solid" borderColor={border} justifyContent="space-between" flexDirection="column">
        <Flex flexDir="column" gap={5} px={3} h="100%" justifyContent={"space-between"}>
            <Flex w="100%" alignItems="center" justifyContent="space-between">
                <Text fontSize="md" fontWeight={500} opacity={0.8}>{`Supervisor ${shift}`}</Text>
                <Icon
                    fontSize={"2xl"}
                    opacity={0.8}
                    as={FiUser} />
            </Flex>
            <Flex w="100%" alignItems="center" justifyContent="space-between" flexDir={{
                base: "column",
                xl: "row"
            }}>
                <Text fontSize="2xl" fontWeight={600}>
                    {name}
                </Text>
                <Text
                    textTransform={"lowercase"}
                    as={"span"}
                    ml={2}
                    fontSize="sm"
                    fontWeight={"medium"}
                    color={text}>
                    {timing}
                </Text>
            </Flex>
        </Flex>
        <Box
            borderY="1px dashed"
            borderColor={border}>
            <Text my={1} textAlign={"center"} fontSize="xs" fontWeight={600} opacity={0.8} textTransform="uppercase">stats</Text>
        </Box>
        <SimpleGrid px={3} columns={2}>
            <VStack alignItems={"flex-start"} py={3}>
                {productionType === "meter" ? <Text
                    textTransform={"uppercase"}
                    color={subText}
                    fontSize={"sm"}>
                    prod.: <Text
                        textTransform={"lowercase"}
                        as={"span"}
                        ml={2}
                        fontWeight={"bold"}
                        color={text}>
                        <LengthFormatter number={production_meters} />
                    </Text>
                </Text>
                    : <>
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
                                <NumberFormatter number={shots} suffix={""} />
                            </Text>
                        </Text>
                        <Text
                            textTransform={"uppercase"}
                            color={subText}
                            fontSize={"sm"}>
                            prod.: <Text
                                textTransform={"lowercase"}
                                as={"span"}
                                ml={2}
                                fontWeight={"bold"}
                                color={text}>
                                <NumberFormatter number={production} suffix={""} />
                            </Text>
                        </Text>
                    </>}
            </VStack>
            <VStack alignItems={"flex-start"} py={3}>
                <Text
                    textTransform={"uppercase"}
                    color={subText}
                    fontSize={"sm"}>
                    mat.: <Text
                        textTransform={"lowercase"}
                        as={"span"}
                        ml={2}
                        fontWeight={"bold"}
                        color={text}>
                        <WeightFormatter number={material} />
                    </Text>
                </Text>
                <Text
                    textTransform={"uppercase"}
                    color={subText}
                    fontSize={"sm"}>
                    elec.: <Text
                        textTransform={"lowercase"}
                        as={"span"}
                        ml={2}
                        fontWeight={"bold"}
                        color={text}>
                        <UnitFormatter number={electricity} />
                    </Text>
                </Text>
            </VStack>
        </SimpleGrid>
    </Flex>
}

export { FactoryTotal, ShiftBlock }