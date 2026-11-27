import { Tr, Td, useColorMode, Icon, CircularProgress, CircularProgressLabel, HStack, VStack, Text, Progress, Box } from '@chakra-ui/react';
import dayjs from "../../../Components/Functions/dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { MachineType } from '../types'
import NumberFormatter from '../../../Components/micro/NumberFormatter';
import WeightFormatter from '../../../Components/micro/WeightFormatter';
import UnitFormatter from '../../../Components/micro/UnitFormatter';
import secFormatter from '../../../Components/Functions/formatters/secFormatter';
import minifiedSecFormatter from '../../../Components/Functions/formatters/minifiedSecFormatter';
import { factoryProductionType } from '../../../Components/Store/atoms';
import LengthFormatter from '../../../Components/micro/LengthFormatter';
import MyTooltip from '../../../Components/micro/MyTooltip';
import { BsArrowDownShort, BsArrowUpShort } from 'react-icons/bs';
dayjs.extend(relativeTime);

const MachineRow = ({
    productionType,
    machine
}: {
    productionType: factoryProductionType | null,
    machine: MachineType
}) => {
    const { colorMode } = useColorMode();
    const { hoverBG, hoverColor, border, subText, text } = useMemo(() => ({
        hoverBG: `${colorMode}.hoverBG`,
        hoverColor: `${colorMode}.hoverColor`,
        border: `${colorMode}.border`,
        subText: `${colorMode}.subText`,
        text: `${colorMode}.text`,
    }), [colorMode]);

    return <Tr
        fontWeight={600}
        _hover={{
            bg: hoverBG,
            color: hoverColor
        }}
        transition="all 0.2s ease"
        minH="100px"
        p="0 20px">
        <Td
            borderRight={"1px solid"}
            borderColor={border}>
            <HStack gap={3}>
                <MyTooltip label={machine.planned > 0 ? `Machine Efficiency: ${machine.efficiency}% (Planned ${secFormatter(machine.planned)} excluded)` : `Machine Efficiency: ${machine.efficiency}%`}>
                    <CircularProgress
                        trackColor={"#cccccc40"}
                        capIsRound
                        value={machine.efficiency}
                        color={
                            machine.efficiency >= 75 ? "green" :
                                machine.efficiency >= 50 ? "orange" :
                                    "red"
                        }>
                        <CircularProgressLabel fontSize="xx-small">
                            {machine.efficiency}%
                        </CircularProgressLabel>
                    </CircularProgress>
                </MyTooltip>
                <VStack alignItems={"flex-start"}>
                    <Text fontWeight={700} fontSize={"lg"}>
                        <Link to={`/machines/${machine.id}`}>{machine.name}</Link>
                    </Text>
                    <Text fontSize={"xs"} fontWeight={700} color={
                        machine.status === "NA" ? "gray" :
                            machine.status === "OFF" ? "red" :
                                machine.isUpToDate !== true ? "cadetblue" :
                                    machine.status === "ON" ? "green" :
                                        machine.status === "IDLE" ? "orange" :
                                            undefined
                    }>
                        <MyTooltip label={dayjs.unix(machine.statusSince).format("DD-MM-YYYY HH:mm:ss")}>
                            {`${minifiedSecFormatter(dayjs().unix() - machine.statusSince)}${(machine.isUpToDate === true || machine.status === "OFF") ? "" : `(${machine.isUpToDate})`} • ${machine.status}`}
                        </MyTooltip>
                    </Text>
                </VStack>
            </HStack>
        </Td>
        <Td>
            <VStack alignItems={"flex-start"}>
                {productionType === "meter" ? <>
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
                            <LengthFormatter number={machine.production_meters} />
                        </Text>
                    </Text>
                    {productionType === "meter" && machine.rotaryRPM ? <Text
                        textTransform={"uppercase"}
                        color={subText}
                        fontSize={"sm"}>
                        current RPM: <MyTooltip label={machine.rotaryRPM.change === 0 ? "unchanged speed" : `speed ${machine.rotaryRPM.change > 0 ? "incresed" : "decreased"} by ${Math.abs(machine.rotaryRPM.change)}%`}>
                            <Text
                                // textTransform={"lowercase"}
                                as={"span"}
                                ml={2}
                                fontWeight={"bold"}
                                color={machine.rotaryRPM.change === 0 ? text : machine.rotaryRPM.change > 0 ? "green" : "red"}>
                                {machine.rotaryRPM.change === 0 ? null : <Icon as={machine.rotaryRPM.change > 0 ? BsArrowUpShort : BsArrowDownShort} />}
                                {machine.rotaryRPM.speed + " "}RPM
                            </Text>
                        </MyTooltip>
                    </Text> : null}
                    {machine.currentProductionSpeed && <Text
                        textTransform={"uppercase"}
                        color={subText}
                        fontSize={"sm"}>
                        current sec/meter: <MyTooltip label={machine.currentProductionSpeed.change === 0 ? "unchanged speed" : `speed ${machine.currentProductionSpeed.change > 0 ? "decreased" : "incresed"} by ${Math.abs(machine.currentProductionSpeed.change)}%`}>
                            <Text
                                textTransform={"lowercase"}
                                as={"span"}
                                ml={2}
                                fontWeight={"bold"}
                                color={machine.currentProductionSpeed.change === 0 ? text : machine.currentProductionSpeed.change > 0 ? "red" : "green"}>
                                {machine.currentProductionSpeed.change === 0 ? null : <Icon as={machine.currentProductionSpeed.change > 0 ? BsArrowUpShort : BsArrowDownShort} />}
                                {machine.currentProductionSpeed.speed}s
                            </Text>
                        </MyTooltip>
                    </Text>}
                </> : <>
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
                            <NumberFormatter number={machine.shots} suffix={"shot(s)"} />
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
                            <NumberFormatter number={machine.production} suffix={"pc(s)"} />
                        </Text>
                    </Text>
                    <Text
                        textTransform={"uppercase"}
                        color={subText}
                        fontSize={"sm"}>
                        L. Shot: <Text
                            textTransform={"none"}
                            as={"span"}
                            ml={2}
                            fontWeight={"bold"}
                            color={text}>
                            {machine.lastShot}
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
                    Curr KW: <MyTooltip label={machine.realtimeKW.change === 0 ? "unchanged speed" : `speed ${machine.realtimeKW.change > 0 ? "decreased" : "incresed"} by ${Math.abs(machine.realtimeKW.change)}%`}>
                        <Text
                            textTransform={"uppercase"}
                            as={"span"}
                            ml={2}
                            fontWeight={"bold"}
                            color={machine.realtimeKW.change === 0 ? text : machine.realtimeKW.change > 0 ? "red" : "green"}>
                            {machine.realtimeKW.change === 0 ? null : <Icon as={machine.realtimeKW.change > 0 ? BsArrowUpShort : BsArrowDownShort} />}
                            <NumberFormatter number={machine.realtimeKW.current} suffix={"KW"} />
                        </Text>
                    </MyTooltip>
                </Text>
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
                        <UnitFormatter number={machine.electricity} />
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
                        <WeightFormatter number={machine.material} />
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
                        unplanned:
                    </Box>
                    <Box
                        gap={3}
                        display="flex"
                        alignItems={"center"}
                        justifyContent="center"
                        textTransform={"uppercase"}
                        color={subText}
                        fontSize={"sm"}>
                        planned:
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
                                (machine.on / (machine.on + machine.idle + machine.off) * 100) || 0
                            }
                        />
                        <Text
                            textTransform={"lowercase"}
                            as={"span"}
                            ml={2}
                            fontWeight={"bold"}
                            color={text}>
                            <MyTooltip label={secFormatter(machine.on)}>
                                {minifiedSecFormatter(machine.on)}
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
                                ((machine.unplannedIdle + machine.unplannedOff) / (machine.on + machine.idle + machine.off) * 100) || 0
                            }
                        />
                        <Text
                            textTransform={"lowercase"}
                            as={"span"}
                            ml={2}
                            fontWeight={"bold"}
                            color={text}>
                            <MyTooltip label={`Unplanned Idle: ${secFormatter(machine.unplannedIdle)} · Unplanned Off: ${secFormatter(machine.unplannedOff)} (Raw Idle: ${secFormatter(machine.idle)}, Raw Off: ${secFormatter(machine.off)})`}>
                                <Text as="span">{minifiedSecFormatter(machine.unplannedDown)}</Text>
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
                            colorScheme="blue"
                            value={
                                (machine.planned / (machine.on + machine.idle + machine.off) * 100) || 0
                            }
                        />
                        <Text
                            textTransform={"lowercase"}
                            as={"span"}
                            ml={2}
                            fontWeight={"bold"}
                            color={text}>
                            <MyTooltip label={secFormatter(machine.planned)}>
                                <Text as="span">{minifiedSecFormatter(machine.planned)}</Text>
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
                    mold: <Text
                        as={"span"}
                        ml={2}
                        fontWeight={"bold"}
                        color={text}>
                        <MyTooltip label={`${dayjs.unix(machine.moldSince).fromNow()} | ${dayjs.unix(machine.moldSince).format("DD-MM-YYYY HH:mm:ss")}`}>
                            {machine.mold || "N/A"}
                        </MyTooltip>
                    </Text>
                </Text>
                <Text
                    textTransform={"uppercase"}
                    color={subText}
                    fontSize={"sm"}>
                    operator: <Text
                        as={"span"}
                        ml={2}
                        fontWeight={"bold"}
                        color={text}>
                        <MyTooltip label={`Shift Timing: ${machine.shiftTiming}`}>
                            {machine.operator}
                        </MyTooltip>
                    </Text>
                </Text>
                <Text
                    textTransform={"uppercase"}
                    color={subText}
                    fontSize={"sm"}>
                    AVG. {productionType === "meter" ? "Sec/meter" : "Cycle Time"}: <Text
                        textTransform={"lowercase"}
                        as={"span"}
                        ml={2}
                        fontWeight={"bold"}
                        color={text}>
                        {machine.cycleTime}s
                    </Text>
                </Text>
            </VStack>
        </Td>
    </Tr>
}

export default MachineRow