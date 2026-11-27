import {
    CardBody,
    CardFooter,
    CardHeader,
    Center,
    CircularProgress,
    CircularProgressLabel,
    Heading,
    HStack,
    Text,
    useColorMode,
    VStack,
    Icon,
    Box,
    Progress,
    Badge,
    Flex,
} from "@chakra-ui/react";
import dayjs from "../../../Components/Functions/dayjs";
import MyCard from "../../../Components/micro/Card";
import type { MachineType } from "../types";
import relativeTime from "dayjs/plugin/relativeTime";
import NumberFormatter from "../../../Components/micro/NumberFormatter";
import WeightFormatter from "../../../Components/micro/WeightFormatter";
import UnitFormatter from "../../../Components/micro/UnitFormatter";
import secFormatter from "../../../Components/Functions/formatters/secFormatter";
import { Link } from "react-router-dom";
import minifiedSecFormatter from "../../../Components/Functions/formatters/minifiedSecFormatter";
import { BiTimeFive, BiUser } from "react-icons/bi";
import { factoryProductionType } from "../../../Components/Store/atoms";
import LengthFormatter from "../../../Components/micro/LengthFormatter";
import MyTooltip from "../../../Components/micro/MyTooltip";
import { BsArrowDownShort, BsArrowUpShort } from "react-icons/bs";
import { FiTarget } from "react-icons/fi";
import { useIsSapEnabled } from "../../../Services/sap";
dayjs.extend(relativeTime);

const MachineCard = ({
    machine,
    productionType,
    minifyCharts
}: {
    machine: MachineType,
    productionType: factoryProductionType | null,
    minifyCharts: boolean
}) => {
    const isSapEnabled = useIsSapEnabled();
    const { colorMode } = useColorMode();
    const { text, subText, border } = {
        text: `${colorMode}.text`,
        subText: `${colorMode}.subText`,
        border: `${colorMode}.border`
    }
    const headingText = "whiteAlpha.900";

    return <Box
        maxW={{
            base: "100%",
            sm: 350
        }}
        as={Link}
        to={`/machines/${machine.id}`}>
        <MyCard
            _hover={{
                transform: "translateY(-3px)",
                boxShadow: "xl"
            }}
            transition={"all 0.2s ease-in-out"}
            p={0}>
            <CardHeader
                h="70px"
                borderTopRadius={"md"}
                bgColor={
                    machine.status === "NA" ? "gray" :
                        machine.status === "OFF" ? "red" :
                            machine.isUpToDate !== true ? "cadetblue" :
                                machine.status === "ON" ? "green" :
                                    machine.status === "IDLE" ? "orange" :
                                        undefined
                }
                borderBottom={`1px solid`}
                borderBottomColor={border}
                display={"flex"}
                flexDir={"column"}
                justifyContent={"center"}
                py={3}>
                <Heading textAlign={"center"} color={headingText} size={"md"}>{machine.name}</Heading>
                <Text textAlign={"center"} fontSize={"xs"} color={headingText} fontWeight={600}>
                    <MyTooltip label={dayjs.unix(machine.statusSince).format("DD-MM-YYYY HH:mm:ss")}>
                        {minifiedSecFormatter(dayjs().unix() - machine.statusSince)}
                    </MyTooltip>
                    {(machine.isUpToDate === true || machine.status === "OFF") ? "" : `(${machine.isUpToDate})`}
                    {` - ${machine.status}`}
                </Text>
            </CardHeader>
            <CardBody
                p={0}
                as={VStack}>
                {machine.productionTarget ? (
                    <Box
                        w="100%"
                        px={3}
                        py={2}
                        bg={colorMode === "dark" ? "whiteAlpha.100" : "orange.50"}
                        borderBottom="1px solid"
                        borderBottomColor={border}
                    >
                        <Flex justify="space-between" align="center" mb={1.5}>
                            <HStack spacing={1.5} minW={0} flex={1}>
                                <Icon as={FiTarget} color="orange.400" boxSize={3.5} />
                                {isSapEnabled && machine.productionTarget.sapOrder && (
                                    <Badge colorScheme="blue" variant="solid" fontSize="3xs" px={1} borderRadius="sm">
                                        SAP
                                    </Badge>
                                )}
                                <Text
                                    fontWeight={600}
                                    fontSize="xs"
                                    color={colorMode === "dark" ? "orange.300" : "orange.700"}
                                    isTruncated
                                    title={machine.productionTarget.name}
                                >
                                    {isSapEnabled && machine.productionTarget.sapOrder
                                        ? `#${machine.productionTarget.sapOrder.orderNumber}`
                                        : machine.productionTarget.name || "Target"}
                                </Text>
                            </HStack>
                            <HStack spacing={1} flexShrink={0}>
                                <Text fontSize="2xs" color={subText}>
                                    {machine.productionTarget.current} / {machine.productionTarget.target}
                                </Text>
                                <Badge
                                    colorScheme={
                                        machine.productionTarget.current >= machine.productionTarget.target
                                            ? "green"
                                            : "orange"
                                    }
                                    fontSize="3xs"
                                    variant="subtle"
                                >
                                    {((machine.productionTarget.current / (machine.productionTarget.target || 1)) * 100).toFixed(0)}%
                                </Badge>
                            </HStack>
                        </Flex>
                        <Progress
                            size="xs"
                            borderRadius="full"
                            value={Math.min(100, (machine.productionTarget.current / (machine.productionTarget.target || 1)) * 100)}
                            colorScheme={
                                machine.productionTarget.current >= machine.productionTarget.target
                                    ? "green"
                                    : "orange"
                            }
                        />
                    </Box>
                ) : null}
                <Center flexDir={"column"} w="100%">
                    {minifyCharts && <VStack py={4} w="100%" gap={3} borderBottom="1px solid" borderColor={border}>
                        <HStack w="100%" justifyContent={"space-around"}>
                            <Text fontSize={"2xl"} fontWeight={700}>{productionType === "meter" ?
                                <LengthFormatter number={machine.production_meters} />
                                : <NumberFormatter number={machine.shots} suffix={"shot(s)"} />}</Text>
                            <Text fontSize={"2xl"} fontWeight={700}><UnitFormatter number={machine.electricity} /></Text>
                        </HStack>
                    </VStack>}
                    <MyTooltip label={machine.planned > 0 ? `Machine Efficiency: ${machine.efficiency}% (Planned ${secFormatter(machine.planned)} excluded)` : `Machine Efficiency: ${machine.efficiency}%`}>
                        {minifyCharts ? <Box
                            gap={3}
                            w="100%"
                            p={2}
                            display="flex"
                            alignItems={"center"}
                            justifyContent="center"
                            textTransform={"uppercase"}
                            color={subText}
                            fontSize={"sm"}>
                            <Text fontWeight={500} opacity={0.9}>
                                OEE:
                            </Text>
                            <Box w="80%">
                                <Progress
                                    w="100%"
                                    size="lg"
                                    borderRightRadius={'md'}
                                    colorScheme={
                                        machine.efficiency >= 75 ? "green" :
                                            machine.efficiency >= 50 ? "orange" :
                                                "red"
                                    }
                                    value={
                                        (machine.efficiency) || 0
                                    }
                                />
                            </Box>
                            <Text
                                textTransform={"lowercase"}
                                as={"span"}
                                ml={2}
                                fontWeight={"bold"}
                                color={text}>
                                {machine.efficiency.toFixed(0)}%
                            </Text>
                        </Box> : <CircularProgress
                            thickness={"5px"}
                            rounded={"full"}
                            size={"250px"}
                            value={machine.efficiency}
                            color={
                                machine.efficiency >= 75 ? "green" :
                                    machine.efficiency >= 50 ? "orange" :
                                        "red"
                            }
                            trackColor={"#cccccc40"}
                            capIsRound>
                            <CircularProgressLabel>
                                <VStack>
                                    <Text fontSize={"xl"} fontWeight={600}>{productionType === "meter" ?
                                        <LengthFormatter number={machine.production_meters} />
                                        : <NumberFormatter number={machine.shots} suffix={"shot(s)"} />}</Text>
                                    <Text fontSize={"xl"} fontWeight={600}><UnitFormatter number={machine.electricity} /></Text>
                                </VStack>
                            </CircularProgressLabel>
                        </CircularProgress>}
                    </MyTooltip>
                    <Text fontSize={"sm"} fontWeight={600} textTransform="uppercase">
                        <MyTooltip label={`${dayjs.unix(machine.moldSince).fromNow()} | ${dayjs.unix(machine.moldSince).format("DD-MM-YYYY HH:mm:ss")}`}>
                            {`mold: ${machine.mold}`}
                        </MyTooltip>
                    </Text>
                </Center>
                <HStack
                    w="100%"
                    px={3}
                    borderTop="1px solid"
                    borderTopColor={border}>
                    <VStack alignItems={"flex-start"} py={3}>
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
                        {productionType === "meter" && machine.currentProductionSpeed ? <Text
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
                        </Text> : <Text
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
                        </Text>}
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
                        {productionType === "molding" && <Text
                            textTransform={"uppercase"}
                            color={subText}
                            fontSize={"sm"}>
                            avg cycle t.: <Text
                                textTransform={"lowercase"}
                                as={"span"}
                                ml={2}
                                fontWeight={"bold"}
                                color={text}>
                                {machine.cycleTime}s
                            </Text>
                        </Text>}
                        <Text
                            textTransform={"uppercase"}
                            color={subText}
                            fontSize={"sm"}>
                            KW: <MyTooltip label={machine.realtimeKW.change === 0 ? "unchanged load" : `load ${machine.realtimeKW.change < 0 ? "decreased" : "incresed"} by ${Math.abs(machine.realtimeKW.change)}%`}>
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
                    </VStack>
                    <VStack
                        borderLeft={`1px solid`}
                        borderLeftColor={border}
                        pl={3}
                        alignItems={"flex-start"}
                        py={3}>
                        <Text
                            textTransform={"uppercase"}
                            color={subText}
                            fontSize={"sm"}>
                            on time: <Text
                                textTransform={"lowercase"}
                                as={"span"}
                                ml={2}
                                fontWeight={"bold"}
                                color={text}>
                                <MyTooltip label={secFormatter(machine.on)}>
                                    {minifiedSecFormatter(machine.on)}
                                </MyTooltip>
                            </Text>
                        </Text>
                        <Text
                            textTransform={"uppercase"}
                            color={subText}
                            fontSize={"sm"}>
                            unplanned: <Text
                                textTransform={"lowercase"}
                                as={"span"}
                                ml={2}
                                fontWeight={"bold"}
                                color={text}>
                                <MyTooltip label={`Unplanned Idle: ${secFormatter(machine.unplannedIdle)} · Unplanned Off: ${secFormatter(machine.unplannedOff)} (Raw Idle: ${secFormatter(machine.idle)}, Raw Off: ${secFormatter(machine.off)})`}>
                                    <Text as="span">{minifiedSecFormatter(machine.unplannedDown)}</Text>
                                </MyTooltip>
                            </Text>
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
                                <MyTooltip label={secFormatter(machine.planned)}>
                                    <Text as="span">{minifiedSecFormatter(machine.planned)}</Text>
                                </MyTooltip>
                            </Text>
                        </Text>
                        <Text
                            textTransform={"uppercase"}
                            color={subText}
                            fontSize={"sm"}>
                            l. shot: <Text
                                textTransform={"none"}
                                as={"span"}
                                ml={2}
                                fontWeight={"bold"}
                                color={text}>
                                {machine.lastShot}
                            </Text>
                        </Text>
                    </VStack>
                </HStack>
            </CardBody>
            <CardFooter
                borderTop={`1px solid`}
                borderTopColor={border}
                display="flex"
                justifyContent="space-between"
                alignItems="center"
                p={2}
                px={4}>
                <Text
                    display={"flex"}
                    alignItems={"center"}
                    textAlign={"center"}
                    fontSize={"xs"}
                    color={text}
                    fontWeight={600}>
                    <Icon
                        fontSize={"md"}
                        color={text}
                        mr={1}
                        as={BiUser} />
                    <MyTooltip label={`Shift Timing: ${machine.shiftTiming}`}>
                        {machine.operator}
                    </MyTooltip>
                </Text>
                <Text
                    display={"flex"}
                    alignItems={"center"}
                    textAlign={"center"}
                    fontSize={"xs"}
                    color={text}
                    fontWeight={600}>
                    <Icon
                        fontSize={"md"}
                        color={text}
                        mr={1}
                        as={BiTimeFive} />
                    <MyTooltip label={dayjs.unix(machine.updated).format("DD-MM-YYYY HH:mm:ss")}>
                        {dayjs.unix(machine.updated).fromNow()}
                    </MyTooltip>
                </Text>
            </CardFooter>
        </MyCard>
    </Box>
}

export default MachineCard