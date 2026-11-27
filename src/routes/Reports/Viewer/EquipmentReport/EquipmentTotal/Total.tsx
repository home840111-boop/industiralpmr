import { Box, CardHeader, Flex, GridItem, SimpleGrid, Text, useColorMode, Icon } from "@chakra-ui/react";
import { useMemo } from "react";
import { BiPulse } from "react-icons/bi";
import { FiUser } from "react-icons/fi";
import { HiLightningBolt } from "react-icons/hi";
import { DataToSet } from ".."
import secFormatter from "../../../../../Components/Functions/formatters/secFormatter";
import MyCard from "../../../../../Components/micro/Card";
import NumberFormatter from "../../../../../Components/micro/NumberFormatter";
import UnitFormatter from "../../../../../Components/micro/UnitFormatter";
import { TimingBlock } from "../../MachineReport/MachineTotal/Total";
import StatsBlock from "../../StatsBlock";


const Total = ({
    data
}: {
    data: DataToSet
}) => {
    const { colorMode } = useColorMode();
    const { border } = useMemo(() => ({
        border: `${colorMode}.border`
    }), [colorMode]);

    return <MyCard p={0}>
        <CardHeader borderBottom={"1px solid"} borderColor={border} display="flex" alignItems="center" justifyContent={"space-between"} px={2} pb={1} pt={3}>
            <Text fontWeight={500} fontSize="lg">Equipment Total</Text>
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
                    <GridItem colSpan={{
                        base: 1,
                        sm: 2
                    }}>
                        <StatsBlock icon={HiLightningBolt} title="Electricity Usage" value={<UnitFormatter number={data.total.electricity} />} />
                    </GridItem>
                    <StatsBlock icon={BiPulse} title="Total Sessions" value={<NumberFormatter number={data.total.sessions} suffix="sessions" />} />
                    <TimingBlock title={"ON Time"} value={data.total.ontime} total={86400 * data.total.days} />
                </SimpleGrid>
            </GridItem>
            <GridItem
                h="100%"
                colSpan={{
                    base: 1,
                    lg: 3
                }}>
                <SimpleGrid
                    h="100%"
                    columns={{
                        base: 1,
                        lg: data.shifts.C ? 3 : data.shifts.B ? 2 : 1
                    }}>
                    {data.shifts.A && <ShiftBlock shift="A" name={data.shifts.A.operator} electricity={data.shifts.A.electricity} timing={data.shifts.A.timing} ontime={data.shifts.A.ontime} />}
                    {data.shifts.B && <ShiftBlock shift="B" name={data.shifts.B.operator} electricity={data.shifts.B.electricity} timing={data.shifts.B.timing} ontime={data.shifts.B.ontime} />}
                    {data.shifts.C && <ShiftBlock shift="C" name={data.shifts.C.operator} electricity={data.shifts.C.electricity} timing={data.shifts.C.timing} ontime={data.shifts.C.ontime} />}
                </SimpleGrid>
            </GridItem>
        </SimpleGrid>
    </MyCard>
}

const ShiftBlock = ({
    name,
    shift,
    ontime,
    electricity,
    timing
}: {
    name: string;
    shift: "A" | "B" | "C";
    ontime: number;
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
        <SimpleGrid p={3} columns={2}>
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
            <Text
                textTransform={"uppercase"}
                color={subText}
                fontSize={"sm"}>
                ontime: <Text
                    textTransform={"lowercase"}
                    as={"span"}
                    ml={2}
                    fontWeight={"bold"}
                    color={text}>
                    {secFormatter(ontime)}
                </Text>
            </Text>
        </SimpleGrid>
    </Flex>
}

export default Total