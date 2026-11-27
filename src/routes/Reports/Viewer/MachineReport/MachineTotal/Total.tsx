import { CardHeader, Flex, GridItem, SimpleGrid, Text, useColorMode, CircularProgress, CircularProgressLabel, Icon, Box, VStack, Progress } from '@chakra-ui/react';
import { useMemo } from 'react'
import { BsFillGearFill } from 'react-icons/bs';
import { FaBoxes, FaCubes } from 'react-icons/fa';
import { FiUser } from 'react-icons/fi';
import { HiLightningBolt, HiOutlineLightningBolt } from 'react-icons/hi';
import { DataToSet } from '..';
import minifiedSecFormatter from '../../../../../Components/Functions/formatters/minifiedSecFormatter';
import secFormatter from '../../../../../Components/Functions/formatters/secFormatter';
import MyCard from '../../../../../Components/micro/Card';
import LengthFormatter from '../../../../../Components/micro/LengthFormatter';
import MyTooltip from '../../../../../Components/micro/MyTooltip';
import NumberFormatter from '../../../../../Components/micro/NumberFormatter';
import UnitFormatter from '../../../../../Components/micro/UnitFormatter';
import WeightFormatter from '../../../../../Components/micro/WeightFormatter';
import { factoryProductionAtom, factoryProductionType, offtimeBasedEfficiencyAtom } from '../../../../../Components/Store/atoms';
import Get from '../../../../../Components/Store/hooks/Get';
import { computeTimingBreakdown } from '../../../../../Services/workSchedule';
import StatsBlock from '../../StatsBlock';
import TimingSummary from '../../TimingSummary';
import { PlannedDowntime } from '../Downtime/types';

const Total = ({
    data,
    rejectedPieces = 0,
    rejectedReason = "",
    plannedDowntime,
    shiftPlannedDowntime
}: {
    data: DataToSet
    rejectedPieces?: number
    rejectedReason?: string
    plannedDowntime?: PlannedDowntime
    shiftPlannedDowntime?: Record<"A" | "B" | "C", PlannedDowntime>
}) => {
    const { colorMode } = useColorMode();
    const { border } = useMemo(() => ({
        border: `${colorMode}.border`
    }), [colorMode]);
    const offtimeBasedEfficiency = !!Get(offtimeBasedEfficiencyAtom);
    // planned downtime was already planned, so it is taken out of the efficiency calculation
    const timing = useMemo(
        () =>
            computeTimingBreakdown(
                data.total.ontime,
                data.total.idletime,
                data.total.offtime,
                plannedDowntime?.idle || 0,
                plannedDowntime?.off || 0,
                offtimeBasedEfficiency,
            ),
        [data, plannedDowntime, offtimeBasedEfficiency],
    );
    const shifts = useMemo(() => {
        let count = 0;
        if (data.shifts.A) count++;
        if (data.shifts.B) count++;
        if (data.shifts.C) count++;
        return count;
    }, [data.shifts]);
    const productionType = Get(factoryProductionAtom);
    const goodPieces = data.total.production - rejectedPieces;

    return <MyCard p={0}>
        <CardHeader borderBottom={"1px solid"} borderColor={border} display="flex" alignItems="center" justifyContent={"space-between"} px={2} pb={1} pt={3}>
            <Text fontWeight={500} fontSize="lg">Machine Total</Text>
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
                        <StatsBlock 
                            icon={FaBoxes} 
                            title="Production" 
                            value={
                                <Flex direction="row" alignItems="baseline" gap={2}>
                                    <NumberFormatter number={goodPieces} suffix="pc(s)" />
                                    {rejectedPieces > 0 && (
                                        <MyTooltip
                                        label={
                                          <Box>
                                            {rejectedReason && rejectedReason !== "No reason provided" ? (
                                              rejectedReason.split('; ').map((reason, index) => {
                                                const isSingleDay = rejectedReason.split('; ').length === 1;
                                                
                                                const colonIndex = reason.indexOf(':');
                                                
                                                const datePart = reason.substring(0, colonIndex).trim();
                                                const reasonText = reason.substring(colonIndex + 1).trim();
                                                
                                                if (isSingleDay) {
                                                  return (
                                                    <Box key={index}>
                                                      <Text>Rejected Pieces: {rejectedPieces}</Text>
                                                      <Text>Reason: {reasonText}</Text>
                                                    </Box>
                                                  );
                                                }
                                                return (
                                                  <Text key={index}>• {datePart}: {reasonText} </Text>
                                                );
                                              })
                                            ) : (
                                              <Text>No reason provided</Text>
                                            )}
                                          </Box>
                                        }
                                      >
                                        <Text fontSize="sm" color="red.500" cursor="pointer">
                                          +{rejectedPieces} rejected
                                        </Text>
                                      </MyTooltip>
                                    )}
                                </Flex>
                            } 
                        />
                    </>}
                    <StatsBlock icon={HiLightningBolt} title="Electricity Usage" value={<UnitFormatter number={data.total.electricity} />} />
                    <StatsBlock icon={FaCubes} title="Material Consumption" value={<WeightFormatter number={data.total.material} />} />
                    <GridItem colSpan={{
                        base: 1,
                        sm: 2
                    }}>
                        <Box
                            borderX="1px solid"
                            borderY="1px dashed"
                            borderColor={border}>
                            <Text my={1} textAlign={"center"} fontSize="xs" fontWeight={600} opacity={0.8} textTransform="uppercase">Elec Breakdown</Text>
                        </Box>
                    </GridItem>
                    <StatsBlock icon={HiOutlineLightningBolt} title="IDLE Elec Cons" value={<UnitFormatter number={data.total.idle_electricity} />} />
                    <StatsBlock icon={HiLightningBolt} title="ON Elec Cons" value={<UnitFormatter number={data.total.electricity - data.total.idle_electricity} />} />
                    <TimingSummary timing={timing} offtimeBasedEfficiency={offtimeBasedEfficiency} />
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
                        lg: shifts
                    }}>
                    {data.shifts.A && <ShiftBlock productionType={productionType} title={"Operator"} shift="A" name={data.shifts.A.supervisor} production_meters={data.shifts.A.production_meters} shots={data.shifts.A.shots} production={data.shifts.A.production} material={data.shifts.A.material} electricity={data.shifts.A.electricity} timing={data.shifts.A.timing} ontime={data.shifts.A.ontime} idletime={data.shifts.A.idletime} offtime={data.shifts.A.offtime} planned={shiftPlannedDowntime?.A} offtimeBasedEfficiency={offtimeBasedEfficiency} />}
                    {data.shifts.B && <ShiftBlock productionType={productionType} title={"Operator"} shift="B" name={data.shifts.B.supervisor} production_meters={data.shifts.B.production_meters} shots={data.shifts.B.shots} production={data.shifts.B.production} material={data.shifts.B.material} electricity={data.shifts.B.electricity} timing={data.shifts.B.timing} ontime={data.shifts.B.ontime} idletime={data.shifts.B.idletime} offtime={data.shifts.B.offtime} planned={shiftPlannedDowntime?.B} offtimeBasedEfficiency={offtimeBasedEfficiency} />}
                    {data.shifts.C && <ShiftBlock productionType={productionType} title={"Operator"} shift="C" name={data.shifts.C.supervisor} production_meters={data.shifts.C.production_meters} shots={data.shifts.C.shots} production={data.shifts.C.production} material={data.shifts.C.material} electricity={data.shifts.C.electricity} timing={data.shifts.C.timing} ontime={data.shifts.C.ontime} idletime={data.shifts.C.idletime} offtime={data.shifts.C.offtime} planned={shiftPlannedDowntime?.C} offtimeBasedEfficiency={offtimeBasedEfficiency} />}
                </SimpleGrid>
            </GridItem>
        </SimpleGrid>
    </MyCard>
}

const TimingBlock = ({
    title,
    value,
    total,
    minified = false
}: {
    title: "ON Time" | "OFF Time" | "IDLE Time" | "DOWN Time";
    value: number;
    total: number;
    minified?: boolean;
}) => {
    const { colorMode } = useColorMode();
    const { border } = useMemo(() => ({
        border: `${colorMode}.border`
    }), [colorMode]);
    const percent = useMemo(() => {
        return (value / total) * 100;
    }, [value, total]);

    return <Flex px={3} py={4} border="1px solid" borderColor={border} justifyContent="space-between" alignItems="center">
        <Flex alignItems="flex-start" flexDir="column" justifyContent="space-between">
            <Text fontSize="md" fontWeight={500} opacity={0.8}>{title}</Text>
            <Text fontSize="2xl" fontWeight={600}>
                {minified ? <MyTooltip cursor={"copy"} label={secFormatter(value)}>
                    {minifiedSecFormatter(value)}
                </MyTooltip>
                    : secFormatter(value)}
            </Text>
        </Flex>
        <CircularProgress
            trackColor={"#cccccc40"}
            color={
                title === "ON Time" ? "green"
                    : ["OFF Time", "DOWN Time"].includes(title) ? "red"
                        : "orange"
            }
            capIsRound
            value={percent}>
            <CircularProgressLabel fontSize="xx-small" fontWeight={500}>
                {minifiedSecFormatter(value)}
            </CircularProgressLabel>
        </CircularProgress>
    </Flex>
}

const ShiftBlock = ({
    name,
    shift,
    shots,
    production,
    production_meters,
    productionType,
    material,
    electricity,
    ontime,
    idletime,
    offtime,
    planned,
    offtimeBasedEfficiency,
    timing,
    title = "Supervisor"
}: {
    name: string;
    shift: "A" | "B" | "C";
    shots: number;
    production: number;
    production_meters: number;
    material: number;
    electricity: number;
    ontime: number;
    productionType: factoryProductionType | null
    idletime: number;
    offtime?: number;
    planned?: PlannedDowntime;
    offtimeBasedEfficiency?: boolean;
    timing: string;
    title?: string;
}) => {
    const { colorMode } = useColorMode();
    const { border, subText, text } = useMemo(() => ({
        border: `${colorMode}.border`,
        subText: `${colorMode}.subText`,
        text: `${colorMode}.text`,
    }), [colorMode]);
    const shiftTiming = useMemo(
        () =>
            computeTimingBreakdown(
                ontime,
                idletime,
                offtime || 0,
                planned?.idle || 0,
                planned?.off || 0,
                !!offtimeBasedEfficiency,
            ),
        [ontime, idletime, offtime, planned, offtimeBasedEfficiency],
    );
    const efficiency = shiftTiming.efficiency;

    return <Flex h="100%" pt={4} border="1px solid" borderColor={border} justifyContent="space-between" flexDirection="column">
        <Flex flexDir="column" gap={5} px={3} h="100%" justifyContent={"space-between"}>
            <Flex w="100%" alignItems="center" justifyContent="space-between">
                <Text fontSize="md" fontWeight={500} opacity={0.8}>{`${title} ${shift}`}</Text>
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
            <VStack alignItems={"flex-start"} py={3} gap={2}>
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
                        {secFormatter(shiftTiming.ontime)}
                    </Text>
                </Text>
            </VStack>
            <VStack alignItems={"flex-start"} py={3} gap={2}>
                <Text
                    textTransform={"uppercase"}
                    color={subText}
                    fontSize={"sm"}>
                    mat: <Text
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
                    elec: <Text
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
                    unplanned: <MyTooltip
                        label={`Unplanned Idle: ${secFormatter(shiftTiming.unplannedIdle)} · Unplanned Off: ${secFormatter(shiftTiming.unplannedOff)} · Raw Idle: ${secFormatter(idletime)} · Raw Off: ${secFormatter(offtime || 0)}`}
                    >
                        <Text
                            textTransform={"lowercase"}
                            as={"span"}
                            ml={2}
                            fontWeight={"bold"}
                            color={text}
                            textDecoration={shiftTiming.unplannedDown > 0 ? "underline dotted" : undefined}
                            textUnderlineOffset="3px"
                            cursor="help">
                            {secFormatter(shiftTiming.unplannedDown)}
                        </Text>
                    </MyTooltip>
                </Text>
                <Text
                    textTransform={"uppercase"}
                    color={subText}
                    fontSize={"sm"}>
                    planned: <Text
                        textTransform={"lowercase"}
                        as={"span"}
                        ml={2}
                        fontWeight={"bold"}
                        color={text}>
                        {secFormatter(shiftTiming.plannedTotal)}
                    </Text>
                </Text>
            </VStack>
        </SimpleGrid>
        <GridItem
            borderTop="1px dashed"
            borderColor={border}
            colSpan={2}
            w="100%"
            as={Flex}
            alignItems={"center"}
            justifyContent={"space-around"}
            py={3}
            px={2}>
            <Text fontSize="xs" fontWeight={500}>Efficiency:</Text>
            <Progress
                borderRightRadius={"full"}
                w="60%"
                colorScheme={
                    efficiency >= 75 ? "green" :
                        efficiency >= 50 ? "orange" :
                            "red"
                } h="10px" value={efficiency} />
            <Text fontSize="sm" fontWeight={600}>{efficiency.toFixed(0)}%</Text>
        </GridItem>
    </Flex>
}

export { TimingBlock };
export default Total