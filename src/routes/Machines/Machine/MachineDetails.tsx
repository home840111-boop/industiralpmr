import { Link as ChakraLink, Box, CardBody, CardFooter, CardHeader, Center, CircularProgress, Icon, CircularProgressLabel, HStack, Progress, Skeleton, SkeletonCircle, Text, useColorMode, VStack, Flex, keyframes, Tag, TagLeftIcon, TagLabel } from "@chakra-ui/react"
import { useMemo } from "react";
import minifiedSecFormatter from "../../../Components/Functions/formatters/minifiedSecFormatter";
import MyCard from "../../../Components/micro/Card"
import { returnType } from "./types";
import dayjs from "../../../Components/Functions/dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import secFormatter from "../../../Components/Functions/formatters/secFormatter";
import { BiTimeFive } from "react-icons/bi";
import { BsArrowRightShort } from "react-icons/bs";
import { FaArrowRight, FaBolt } from "react-icons/fa";
import { HiLightningBolt } from "react-icons/hi";
import Get from "../../../Components/Store/hooks/Get";
import { factoryProductionAtom } from "../../../Components/Store/atoms";
import { BsArrowDownShort, BsArrowUpShort } from "react-icons/bs";
import MyTooltip from "../../../Components/micro/MyTooltip";
import UnitDisplay from "../../../Components/micro/UnitDisplay";
import { Link } from "react-router-dom";
dayjs.extend(relativeTime);

const pulse = keyframes`
0% {
    -webkit-transform: scale(1);
    transform: scale(1);
    box-shadow: 0 0 0 0 rgba(16,201,121,.9);
}
70% {
    -webkit-transform: scale(1.2);
    transform: scale(1.2);
    box-shadow: 0 0 0 15px rgba(16,201,121,0);
}
100% {
    -webkit-transform: scale(1);
    transform: scale(1);
    box-shadow: 0 0 0 0 rgba(16,201,121,0);
}
`;
const MachineDetails = ({
    details
}: {
    details: returnType["machineDetails"];
}) => {
    const { colorMode } = useColorMode();
    const productionType = Get(factoryProductionAtom);
    const { border, subText, text } = useMemo(() => {
        return {
            border: `${colorMode}.border`,
            subText: `${colorMode}.subText`,
            text: `${colorMode}.text`
        }
    }, [colorMode]);

    if (!details) return <LoadingCard />;
    return <MyCard
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
                fontWeight={500}>Machines Details</Text>
            {details.isPowerAnalyzer && (
                <ChakraLink
                    to={`/machines/${details.id}/power`}
                    as={Link}
                    cursor={"pointer"}
                    transition="all ease 0.2s"
                    _hover={{
                        textDecoration: "none",
                        transform: "translateY(-1px)",
                    }}
                    display="flex"
                    alignItems={"center"}>
                    <Tag size="sm" colorScheme="yellow" variant="subtle" borderRadius="full">
                        <TagLeftIcon as={HiLightningBolt} boxSize="11px" mr={1} />
                        <TagLabel fontWeight={600}>Power</TagLabel>
                        <Icon as={BsArrowRightShort} fontSize="lg" ml={0.5} />
                    </Tag>
                </ChakraLink>
            )}
        </CardHeader>
        <CardBody as={VStack} px={0} pb={0} h={"100%"}>
            <Center flexDir={"column"}>
                <MyTooltip label={details.planned > 0 ? `Machine Efficiency: ${details.efficiency}% (Planned ${secFormatter(details.planned)} excluded)` : `Machine Efficiency: ${details.efficiency}%`}>
                    <Center>
                        <Box
                            position={"absolute"}
                            animation={details.status === "ON" ? `${pulse} 2s infinite` : undefined}
                            w="170px"
                            h="170px"
                            borderRadius={"full"}></Box>
                        <CircularProgress
                            thickness={"8px"}
                            rounded={"full"}
                            size={"200px"}
                            value={details.efficiency}
                            color={
                                details.efficiency >= 75 ? "green" :
                                    details.efficiency >= 50 ? "orange" :
                                        "red"
                            }
                            trackColor={"#cccccc40"}
                            capIsRound>
                            <CircularProgressLabel>
                                <Text fontSize={"xl"} fontWeight={600}>{`${details.efficiency}%`}</Text>
                            </CircularProgressLabel>
                        </CircularProgress>
                    </Center>
                </MyTooltip>
            </Center>
            <VStack w="100%" alignItems={"flex-start"} borderBottom={"1px solid"} borderColor={border} px={5} py={2} m={0}>
                <Text fontSize={"xl"} fontWeight={600} as={Flex} gap={3} w="100%" justifyContent={"space-between"}>
                    {details.name}
                    <Tag size={"sm"} variant='subtle' colorScheme={
                        details.machineType === "standard" ? undefined
                            : details.machineType === "inverter" ? "orange"
                                : details.machineType === "servo" ? "green"
                                    : undefined
                    }>
                        <TagLeftIcon boxSize='12px' as={FaBolt} />
                        <TagLabel textTransform={"uppercase"}>{details.machineType}</TagLabel>
                    </Tag>
                </Text>
                <Flex
                    w="100%"
                    justifyContent={"space-between"}>
                    <Text fontSize={"md"} fontWeight={500} color={
                        details.status === "NA" ? "gray" :
                            details.status === "OFF" ? "red" :
                                details.isUpToDate !== true ? "cadetblue" :
                                    details.status === "ON" ? "green" :
                                        details.status === "IDLE" ? "orange" :
                                            undefined
                    }>
                        <MyTooltip label={dayjs.unix(details.statusSince).format("DD-MM-YYYY HH:mm:ss")}>
                            {`${details.status}${(details.isUpToDate === true || details.status === "OFF") ? "" : `(${details.isUpToDate})`} • ${minifiedSecFormatter(dayjs().unix() - details.statusSince)}${details.status === "NA" ? ` (LS: ${details.lastStatus})` : ""}`}
                        </MyTooltip>
                    </Text>
                </Flex>
            </VStack>
            <VStack w="100%" alignItems={"flex-start"} borderBottom={"1px solid"} borderColor={border} px={5} py={2} m={0}>
                <Text fontSize={"md"} fontWeight={500} mb={2} textDecor="underline">Current Operations</Text>
                <VStack
                    fontWeight={600}
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
                            <MyTooltip label={`${dayjs.unix(details.moldRunningSince).fromNow()} | ${dayjs.unix(details.moldRunningSince).format("DD-MM-YYYY HH:mm:ss")}`}>
                                {details.moldRunning || "N/A"}
                            </MyTooltip> {details.upcomingMold && <>
                                <Icon
                                    ml={1}
                                    as={FaArrowRight} />
                                <Text
                                    as={"span"}
                                    ml={2}
                                    fontWeight={"bold"}
                                    color={text}>
                                    <MyTooltip label={`Next mold in ${dayjs.unix(details.upcomingMold.start).isBefore(dayjs()) ? "Anytime" : dayjs.unix(details.upcomingMold.start).fromNow(true)}`}>
                                        {details.upcomingMold.name || "N/A"}
                                    </MyTooltip>
                                </Text>
                            </>}
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
                            <MyTooltip label={`Shift Timing: ${details.shiftTiming}`}>
                                {details.operator}
                            </MyTooltip>
                        </Text>
                    </Text>
                    {details.rotaryRPM && <Text
                        textTransform={"uppercase"}
                        color={subText}
                        fontSize={"sm"}>
                        {"CURRENT RPM: "}<MyTooltip label={details.rotaryRPM.change === 0 ? "unchanged speed" : `speed ${details.rotaryRPM.change > 0 ? "incresed" : "decreased"} by ${Math.abs(details.rotaryRPM.change)}%`}>
                            <Text
                                // textTransform={"lowercase"}
                                as={"span"}
                                ml={2}
                                fontWeight={"bold"}
                                color={details.rotaryRPM.change === 0 ? text : details.rotaryRPM.change > 0 ? "green" : "red"}>
                                {details.rotaryRPM.change === 0 ? null : <Icon as={details.rotaryRPM.change > 0 ? BsArrowUpShort : BsArrowDownShort} />}
                                {details.rotaryRPM.speed + " "}RPM
                            </Text>
                        </MyTooltip>
                    </Text>}
                    {details.currentProductionSpeed && <Text
                        textTransform={"uppercase"}
                        color={subText}
                        fontSize={"sm"}>
                        {"CURRENT Sec per Meter: "}<MyTooltip label={details.currentProductionSpeed.change === 0 ? "unchanged speed" : `speed ${details.currentProductionSpeed.change > 0 ? "decreased" : "incresed"} by ${Math.abs(details.currentProductionSpeed.change)}%`}>
                            <Text
                                textTransform={"lowercase"}
                                as={"span"}
                                ml={2}
                                fontWeight={"bold"}
                                color={details.currentProductionSpeed.change === 0 ? text : details.currentProductionSpeed.change > 0 ? "red" : "green"}>
                                {details.currentProductionSpeed.change === 0 ? null : <Icon as={details.currentProductionSpeed.change > 0 ? BsArrowUpShort : BsArrowDownShort} />}
                                {details.currentProductionSpeed.speed}s
                            </Text>
                        </MyTooltip>
                    </Text>}
                    <Text
                        textTransform={"uppercase"}
                        color={subText}
                        fontSize={"sm"}>
                        {productionType === "meter" ? "AVG. sec per Meter" : "AVG. Cycle Time: "}<Text
                            textTransform={"lowercase"}
                            as={"span"}
                            ml={2}
                            fontWeight={"bold"}
                            color={text}>
                            {details.avgCycleTime}s
                        </Text>
                    </Text>
                    <Text
                        textTransform={"uppercase"}
                        color={subText}
                        fontSize={"sm"}>
                        {"TARGET: "}<Text
                            as={"span"}
                            ml={2}
                            fontWeight={"bold"}
                            color={text}>
                            {details.productionTarget ? (
                                <MyTooltip label={`${details.productionTarget.name} (${details.productionTarget.current} / ${details.productionTarget.target} pcs)`}>
                                    <ChakraLink
                                        as={Link}
                                        to={`/targets/${details.id}`}
                                        color={details.productionTarget.current >= details.productionTarget.target ? "green.400" : "orange.400"}
                                        _hover={{ textDecoration: "underline" }}
                                    >
                                        {details.productionTarget.sapOrder ? `PO #${details.productionTarget.sapOrder.orderNumber}` : details.productionTarget.name}{" "}
                                        ({details.productionTarget.target > 0 ? ((details.productionTarget.current / details.productionTarget.target) * 100).toFixed(0) : 0}%)
                                    </ChakraLink>
                                </MyTooltip>
                            ) : (
                                <ChakraLink
                                    as={Link}
                                    to={`/targets/${details.id}`}
                                    color={text}
                                    opacity={0.65}
                                    fontStyle="italic"
                                    _hover={{ opacity: 1, textDecoration: "underline", color: "orange.400" }}
                                >
                                    None Set
                                </ChakraLink>
                            )}
                        </Text>
                    </Text>
                </VStack>
            </VStack>
            <VStack w="100%" alignItems={"flex-start"} borderBottom={"1px solid"} borderColor={border} px={5} py={2} m={0} h="100%">
                <Text fontSize={"md"} fontWeight={500} mb={2} textDecor="underline">Timings</Text>
                <HStack h="100%">
                    <VStack
                        h="100%"
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
                    <VStack h="100%">
                        <Box
                            gap={3}
                            display="flex"
                            alignItems={"center"}
                            justifyContent="center"
                            textTransform={"uppercase"}
                            color={subText}
                            fontSize={"sm"}>
                            <Progress
                                w={{
                                    base: "150px",
                                    md: "250px",
                                    lg: "100px",
                                    xl: "150px",
                                }}
                                size="sm"
                                borderRightRadius={'md'}
                                colorScheme="green"
                                value={
                                    (details.on / (details.on + details.idle + details.off) * 100) || 0
                                }
                            />
                            <Text
                                textTransform={"lowercase"}
                                as={"span"}
                                ml={2}
                                fontWeight={"bold"}
                                color={text}>
                                <MyTooltip label={secFormatter(details.on)}>
                                    {minifiedSecFormatter(details.on)}
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
                                w={{
                                    base: "150px",
                                    md: "250px",
                                    lg: "100px",
                                    xl: "150px",
                                }}
                                size="sm"
                                borderRightRadius={'md'}
                                colorScheme="orange"
                                value={
                                    ((details.unplannedIdle + details.unplannedOff) / (details.on + details.idle + details.off) * 100) || 0
                                }
                            />
                            <Text
                                textTransform={"lowercase"}
                                as={"span"}
                                ml={2}
                                fontWeight={"bold"}
                                color={text}>
                                <MyTooltip label={`Unplanned Idle: ${secFormatter(details.unplannedIdle)} · Unplanned Off: ${secFormatter(details.unplannedOff)} (Raw Idle: ${secFormatter(details.idle)}, Raw Off: ${secFormatter(details.off)})`}>
                                    <Text as="span">{minifiedSecFormatter(details.unplannedDown)}</Text>
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
                                w={{
                                    base: "150px",
                                    md: "250px",
                                    lg: "100px",
                                    xl: "150px",
                                }}
                                size="sm"
                                borderRightRadius={'md'}
                                colorScheme="blue"
                                value={
                                    (details.planned / (details.on + details.idle + details.off) * 100) || 0
                                }
                            />
                            <Text
                                textTransform={"lowercase"}
                                as={"span"}
                                ml={2}
                                fontWeight={"bold"}
                                color={text}>
                                <MyTooltip label={secFormatter(details.planned)}>
                                    <Text as="span">{minifiedSecFormatter(details.planned)}</Text>
                                </MyTooltip>
                            </Text>
                        </Box>
                    </VStack>
                </HStack>
            </VStack>
        </CardBody>
        <CardFooter
            display={"flex"}
            flexDir={"row"}
            justifyContent={"space-between"}
            p={2}
            px={4}>
            <UnitDisplay
                unit={details.unit}
                mac={details.mac}
                opacity={0.9}
                fontSize="xs"
            />
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
                <MyTooltip label={dayjs.unix(details.lastUpdated).format("DD-MM-YYYY HH:mm:ss")}>
                    {dayjs.unix(details.lastUpdated).fromNow()}
                </MyTooltip>
            </Text>
        </CardFooter>
    </MyCard>
}

const LoadingCard = () => {
    const { colorMode } = useColorMode();
    const { border } = {
        border: `${colorMode}.border`
    }

    return <MyCard p={0}>
        <CardHeader
            borderTopRadius={"md"}
            borderBottom={`1px solid`}
            borderBottomColor={border}
            display={"flex"}
            flexDir={"row"}
            justifyContent={"space-between"}
            py={3}>
            <Skeleton h="20px" w="50%" />
        </CardHeader>
        <CardBody
            h={"100%"}
            p={0}
            as={VStack}>
            <Center flexDir={"column"} mt={3}>
                <SkeletonCircle size={"220px"} />
            </Center>
            <HStack
                w="100%"
                px={3}
                borderTop="1px solid"
                borderTopColor={border}>
                <VStack alignItems={"flex-start"} py={3} w="50%" gap={2}>
                    <Skeleton h="20px" w="50%" mt={3} />
                    <Skeleton h="15px" w="100%" mt={5} />
                    <Skeleton h="15px" w="100%" mt={3} />
                    <Skeleton h="15px" w="100%" mt={3} />
                </VStack>
            </HStack>
            <HStack
                gap={2}
                w="100%"
                px={3}
                borderTop="1px solid"
                borderTopColor={border}>
                <VStack alignItems={"flex-start"} py={3} w="80%" gap={2}>
                    <Skeleton h="20px" w="50%" mt={3} />
                    <Skeleton h="15px" w="100%" mt={5} />
                    <Skeleton h="15px" w="100%" mt={3} />
                    <Skeleton h="15px" w="100%" mt={3} />
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
            <Skeleton h="15px" w="30%" />
            <Skeleton h="15px" w="30%" />
        </CardFooter>
    </MyCard>
}

export { pulse };
export default MachineDetails