import {
    Box,
    CardBody,
    CardFooter,
    CardHeader,
    Center,
    Heading,
    Icon,
    Progress,
    SimpleGrid,
    Text,
    useColorMode,
    HStack,
    Tag,
    Badge,
    Flex,
} from "@chakra-ui/react";
import { Link } from "react-router-dom";
import { Machine } from "..";
import MyCard from "../../../Components/micro/Card";
import MyTooltip from "../../../Components/micro/MyTooltip";
import dayjs from "../../../Components/Functions/dayjs";
import minifiedSecFormatter from "../../../Components/Functions/formatters/minifiedSecFormatter";
import { BiTimeFive, BiUser } from "react-icons/bi";
import { FiTarget, FiArrowRight } from "react-icons/fi";
import { useMemo } from "react";
import secFormatter from "../../../Components/Functions/formatters/secFormatter";
import { RadialBar, RadialBarConfig } from "@ant-design/plots";
import { viewAll } from "../../Reports/Viewer/FactoryReport/Machine/MachineBreakdown/PieChart";
import { InnerLabel } from "../Target/CurrentStats/ProgressSection";
import { useIsSapEnabled } from "../../../Services/sap";

const ProductionCard = ({ machine }: { machine: Machine }) => {
    const { colorMode } = useColorMode();
    const isDark = colorMode === "dark";
    const isSapEnabled = useIsSapEnabled();

    const { text, subText, border } = useMemo(
        () => ({
            text: `${colorMode}.text`,
            subText: `${colorMode}.subText`,
            border: `${colorMode}.border`,
        }),
        [colorMode]
    );

    const headingText = "whiteAlpha.900";

    const efficiency = useMemo(() => {
        if (!machine.hasTarget || machine.progress.total === 0) return 0;
        if (machine.target.due === null) return 100;
        const start = machine.target.started;
        const now = dayjs().unix() - start;
        const dueTime =
            machine.target.due === null
                ? dayjs(machine.target.due).unix()
                : machine.timing.projectedEndTime - start;
        if (dueTime <= 0) return 0;
        return Math.min(100, Math.max(0, (now / dueTime) * 100));
    }, [machine]);

    const radialConfig: RadialBarConfig = {
        data: [
            {
                name: "Actual",
                count: machine.progress.current,
            },
            {
                name: "Should be",
                count: machine.progress.shouldbe,
            },
            {
                name: "Target",
                count: machine.progress.total,
            },
        ],
        animation: false,
        height: 180,
        xField: "name",
        yField: "count",
        maxAngle: 300,
        radius: 0.85,
        innerRadius: 0.65,
        tooltip: {
            formatter: (datum) => {
                return {
                    name:
                        datum.name === "Actual"
                            ? "Actual pc(s)"
                            : datum.name === "Target"
                            ? "Target pc(s)"
                            : "Should be pc(s)",
                    value: viewAll(datum.count, "production"),
                };
            },
        },
        colorField: "name",
        color: ({ name }) => {
            if (name === "Actual") {
                return machine.progress.track > 0
                    ? "#0d9f8b"
                    : machine.progress.track < -1800
                    ? "#e95e44"
                    : "#FDD36A";
            } else if (name === "Should be") {
                return "#FDD36A40";
            }
            return machine.status.status === "ON" ? "#0d9f8b" : "#e95e44";
        },
        barStyle: {
            lineCap: "round",
        },
    };

    const sapOrder = machine.target?.sapOrder;
    const showSap = isSapEnabled && !!sapOrder;

    return (
        <Box
            maxW={{
                base: "100%",
                sm: 350,
            }}
            w="100%"
            h="100%"
            display="flex"
            flexDirection="column"
            as={Link}
            to={`/targets/${machine.id}`}
        >
            <MyCard
                h="100%"
                w="100%"
                display="flex"
                flexDirection="column"
                flex={1}
                _hover={{
                    transform: "translateY(-3px)",
                    boxShadow: "xl",
                }}
                transition="all 0.2s ease-in-out"
                p={0}
                overflow="hidden"
            >
                {/* Visual parity with Machines CardHeader */}
                <CardHeader
                    h="70px"
                    flexShrink={0}
                    borderTopRadius="md"
                    bgColor={
                        machine.status.status === "NA"
                            ? "gray"
                            : machine.status.status === "OFF"
                            ? "red"
                            : machine.status.status === "ON"
                            ? "green"
                            : machine.status.status === "IDLE"
                            ? "orange"
                            : undefined
                    }
                    borderBottom="1px solid"
                    borderBottomColor={border}
                    display="flex"
                    flexDir="column"
                    justifyContent="center"
                    py={3}
                    px={3}
                    pos="relative"
                >
                    <Heading textAlign="center" color={headingText} size="md">
                        {machine.name}
                    </Heading>
                    <Text textAlign="center" fontSize="xs" color={headingText} fontWeight={600}>
                        <MyTooltip label={dayjs.unix(machine.status.since).format("DD-MM-YYYY HH:mm:ss")}>
                            {minifiedSecFormatter(dayjs().unix() - machine.status.since)}
                        </MyTooltip>
                        {` - ${machine.status.status}`}
                    </Text>
                </CardHeader>

                <CardBody p={0} display="flex" flexDir="column" flex={1}>
                    {/* Dedicated SAP Header Strip matching MachineCard */}
                    {showSap && (
                        <Flex
                            w="100%"
                            h="28px"
                            flexShrink={0}
                            justify="space-between"
                            align="center"
                            px={3}
                            py={1.5}
                            bg={isDark ? "blue.950" : "blue.50"}
                            borderBottom="1px solid"
                            borderBottomColor={isDark ? "blue.900" : "blue.200"}
                            fontSize="xs"
                        >
                            <HStack spacing={1.5} minW={0} flex={1}>
                                <Badge colorScheme="blue" variant="solid" fontSize="3xs" px={1.5} borderRadius="sm">
                                    SAP
                                </Badge>
                                <Text fontWeight={700} color={isDark ? "blue.200" : "blue.800"} isTruncated>
                                    #{sapOrder.orderNumber}
                                </Text>
                                <Text fontSize="3xs" color={subText} isTruncated maxW="110px" title={sapOrder.materialDesc}>
                                    {sapOrder.materialDesc}
                                </Text>
                            </HStack>
                            <HStack spacing={1.5} flexShrink={0}>
                                {machine.progress.current >= machine.progress.total ? (
                                    <Badge colorScheme="green" variant="solid" fontSize="3xs" px={1.5} borderRadius="sm">
                                        Manual End
                                    </Badge>
                                ) : (
                                    <Text fontSize="2xs" fontWeight={700} color={isDark ? "blue.200" : "blue.700"}>
                                        {sapOrder.confirmed} / {sapOrder.target} pcs
                                    </Text>
                                )}
                            </HStack>
                        </Flex>
                    )}

                    {machine.hasTarget ? (
                        <>
                            {/* Center Visual Area */}
                            <Center flex={1} flexDir="column" pt={2} pb={2} pos="relative" minH="210px" justifyContent="center">
                                <Center pos="relative">
                                    <RadialBar {...radialConfig} />
                                    <InnerLabel data={machine.progress} isSmall={false} />
                                </Center>
                                <Text fontSize="xs" fontWeight={600} textTransform="uppercase" color={text} mt={1}>
                                    <MyTooltip
                                        label={`${dayjs.unix(machine.mold.since).fromNow()} | ${dayjs
                                            .unix(machine.mold.since)
                                            .format("DD-MM-YYYY HH:mm:ss")}`}
                                    >
                                        {`mold: ${machine.mold.name || "None"} (${machine.mold.cycleTime || 0}s)`}
                                    </MyTooltip>
                                </Text>
                            </Center>

                            {/* Standardized 4-Row Metrics Section */}
                            <Box w="100%" flexShrink={0}>
                                {/* Row 1: Prog */}
                                <Box
                                    w="100%"
                                    h="36px"
                                    borderTop="1px solid"
                                    borderColor={border}
                                    px={3}
                                    display="flex"
                                    alignItems="center"
                                    justifyContent="space-between"
                                    textTransform="uppercase"
                                    color={subText}
                                    fontSize="xs"
                                >
                                    <Text fontWeight={600} minW="42px">
                                        Prog:
                                    </Text>
                                    <Progress
                                        flex={1}
                                        mx={2}
                                        size="sm"
                                        borderRadius="full"
                                        colorScheme={
                                            machine.progress.track > 0
                                                ? "green"
                                                : machine.progress.track < -1800
                                                ? "red"
                                                : "orange"
                                        }
                                        value={efficiency || 0}
                                    />
                                    <Text fontWeight="bold" color={text} minW="36px" textAlign="right">
                                        {efficiency.toFixed(0)}%
                                    </Text>
                                </Box>

                                {/* Row 2: OEE */}
                                <Box
                                    w="100%"
                                    h="36px"
                                    borderTop="1px solid"
                                    borderColor={border}
                                    px={3}
                                    display="flex"
                                    alignItems="center"
                                    justifyContent="space-between"
                                    textTransform="uppercase"
                                    color={subText}
                                    fontSize="xs"
                                >
                                    <Text fontWeight={600} minW="42px">
                                        OEE:
                                    </Text>
                                    <Progress
                                        flex={1}
                                        mx={2}
                                        size="sm"
                                        borderRadius="full"
                                        colorScheme={
                                            machine.OEE >= 75
                                                ? "green"
                                                : machine.OEE >= 50
                                                ? "orange"
                                                : "red"
                                        }
                                        value={machine.OEE || 0}
                                    />
                                    <Text fontWeight="bold" color={text} minW="36px" textAlign="right">
                                        {machine.OEE}%
                                    </Text>
                                </Box>

                                {/* Row 3: Ontime & Downtime */}
                                <SimpleGrid columns={2} w="100%" h="36px" borderTop="1px solid" borderColor={border}>
                                    <Box
                                        borderRight="1px solid"
                                        borderColor={border}
                                        px={3}
                                        display="flex"
                                        alignItems="center"
                                        justifyContent="flex-start"
                                        textTransform="uppercase"
                                        color={subText}
                                        fontSize="xs"
                                    >
                                        <Text fontWeight={500} opacity={0.9}>
                                            ontime:
                                        </Text>
                                        <Text ml={2} fontWeight="bold" color={text}>
                                            <MyTooltip label={secFormatter(machine.timing.ontime)}>
                                                {minifiedSecFormatter(machine.timing.ontime)}
                                            </MyTooltip>
                                        </Text>
                                    </Box>
                                    <Box
                                        px={3}
                                        display="flex"
                                        alignItems="center"
                                        justifyContent="flex-start"
                                        textTransform="uppercase"
                                        color={subText}
                                        fontSize="xs"
                                    >
                                        <Text fontWeight={500} opacity={0.9}>
                                            downtime:
                                        </Text>
                                        <Text ml={2} fontWeight="bold" color={machine.timing.downtime > 1800 ? "red.400" : text}>
                                            <MyTooltip label={secFormatter(machine.timing.downtime)}>
                                                {minifiedSecFormatter(machine.timing.downtime)}
                                            </MyTooltip>
                                        </Text>
                                    </Box>
                                </SimpleGrid>

                                {/* Row 4: Projected Completion */}
                                <Box
                                    w="100%"
                                    h="36px"
                                    borderTop="1px solid"
                                    borderColor={border}
                                    px={3}
                                    display="flex"
                                    alignItems="center"
                                    justifyContent="center"
                                    textTransform="uppercase"
                                    color={subText}
                                    fontSize="xs"
                                >
                                    <Text fontWeight={500} opacity={0.9}>
                                        projected completion:
                                    </Text>
                                    <Text ml={2} fontWeight="bold" color={text}>
                                        {dayjs.unix(machine.timing.projectedEndTime).isBefore(dayjs()) ? (
                                            "Anytime now"
                                        ) : (
                                            <MyTooltip
                                                label={dayjs
                                                    .unix(machine.timing.projectedEndTime)
                                                    .format("DD-MM-YYYY HH:mm:ss")}
                                            >
                                                {`in ${minifiedSecFormatter(
                                                    Math.abs(
                                                        dayjs().diff(
                                                            dayjs.unix(machine.timing.projectedEndTime),
                                                            "second"
                                                        )
                                                    )
                                                )}`}
                                            </MyTooltip>
                                        )}
                                    </Text>
                                </Box>
                            </Box>
                        </>
                    ) : (
                        <>
                            {/* Empty State Center Visual Area */}
                            <Center flex={1} flexDir="column" py={6} px={4} minH="210px" w="100%" justifyContent="center">
                                <Box
                                    p={3}
                                    borderRadius="full"
                                    bg={isDark ? "whiteAlpha.100" : "orange.50"}
                                    color="orange.400"
                                    mb={2}
                                >
                                    <Icon as={FiTarget} fontSize="3xl" />
                                </Box>
                                <Text fontSize="md" fontWeight={700} color={text}>
                                    No Active Target
                                </Text>
                                <Text fontSize="xs" fontWeight={600} textTransform="uppercase" color={subText} mt={1}>
                                    mold: {machine.mold.name || "None"}
                                </Text>
                                <Tag
                                    size="sm"
                                    colorScheme="orange"
                                    variant="subtle"
                                    borderRadius="full"
                                    px={3}
                                    py={1}
                                    mt={3}
                                >
                                    <HStack gap={1}>
                                        <Text fontSize="xs" fontWeight={600}>
                                            {isSapEnabled ? "Set Target or SAP Order" : "Set Target"}
                                        </Text>
                                        <Icon as={FiArrowRight} fontSize="xs" />
                                    </HStack>
                                </Tag>
                            </Center>

                            {/* Standardized 4-Row Metrics Section for Inactive Card */}
                            <Box w="100%" flexShrink={0}>
                                {/* Row 1: Prog Placeholder */}
                                <Box
                                    w="100%"
                                    h="36px"
                                    borderTop="1px solid"
                                    borderColor={border}
                                    px={3}
                                    display="flex"
                                    alignItems="center"
                                    justifyContent="space-between"
                                    textTransform="uppercase"
                                    color={subText}
                                    fontSize="xs"
                                >
                                    <Text fontWeight={600} minW="42px">
                                        Prog:
                                    </Text>
                                    <Progress
                                        flex={1}
                                        mx={2}
                                        size="sm"
                                        borderRadius="full"
                                        value={0}
                                        bg={isDark ? "whiteAlpha.100" : "gray.100"}
                                    />
                                    <Text fontWeight="semibold" color={subText} minW="36px" textAlign="right">
                                        —
                                    </Text>
                                </Box>

                                {/* Row 2: OEE */}
                                <Box
                                    w="100%"
                                    h="36px"
                                    borderTop="1px solid"
                                    borderColor={border}
                                    px={3}
                                    display="flex"
                                    alignItems="center"
                                    justifyContent="space-between"
                                    textTransform="uppercase"
                                    color={subText}
                                    fontSize="xs"
                                >
                                    <Text fontWeight={600} minW="42px">
                                        OEE:
                                    </Text>
                                    <Progress
                                        flex={1}
                                        mx={2}
                                        size="sm"
                                        borderRadius="full"
                                        colorScheme={
                                            machine.OEE >= 75
                                                ? "green"
                                                : machine.OEE >= 50
                                                ? "orange"
                                                : "red"
                                        }
                                        value={machine.OEE || 0}
                                    />
                                    <Text fontWeight="bold" color={text} minW="36px" textAlign="right">
                                        {machine.OEE}%
                                    </Text>
                                </Box>

                                {/* Row 3: Ontime & Downtime */}
                                <SimpleGrid columns={2} w="100%" h="36px" borderTop="1px solid" borderColor={border}>
                                    <Box
                                        borderRight="1px solid"
                                        borderColor={border}
                                        px={3}
                                        display="flex"
                                        alignItems="center"
                                        justifyContent="flex-start"
                                        textTransform="uppercase"
                                        color={subText}
                                        fontSize="xs"
                                    >
                                        <Text fontWeight={500} opacity={0.9}>
                                            ontime:
                                        </Text>
                                        <Text ml={2} fontWeight="bold" color={text}>
                                            <MyTooltip label={secFormatter(machine.timing.ontime)}>
                                                {minifiedSecFormatter(machine.timing.ontime)}
                                            </MyTooltip>
                                        </Text>
                                    </Box>
                                    <Box
                                        px={3}
                                        display="flex"
                                        alignItems="center"
                                        justifyContent="flex-start"
                                        textTransform="uppercase"
                                        color={subText}
                                        fontSize="xs"
                                    >
                                        <Text fontWeight={500} opacity={0.9}>
                                            downtime:
                                        </Text>
                                        <Text ml={2} fontWeight="bold" color={machine.timing.downtime > 1800 ? "red.400" : text}>
                                            <MyTooltip label={secFormatter(machine.timing.downtime)}>
                                                {minifiedSecFormatter(machine.timing.downtime)}
                                            </MyTooltip>
                                        </Text>
                                    </Box>
                                </SimpleGrid>

                                {/* Row 4: Status / Projected */}
                                <Box
                                    w="100%"
                                    h="36px"
                                    borderTop="1px solid"
                                    borderColor={border}
                                    px={3}
                                    display="flex"
                                    alignItems="center"
                                    justifyContent="center"
                                    textTransform="uppercase"
                                    color={subText}
                                    fontSize="xs"
                                >
                                    <Text fontWeight={500} opacity={0.8}>
                                        target:
                                    </Text>
                                    <Text ml={2} fontWeight="semibold" color={subText}>
                                        Awaiting Setup
                                    </Text>
                                </Box>
                            </Box>
                        </>
                    )}
                </CardBody>

                {/* Footer matching Machines CardFooter */}
                <CardFooter
                    mt="auto"
                    flexShrink={0}
                    borderTop="1px solid"
                    borderTopColor={border}
                    display="flex"
                    justifyContent="space-between"
                    alignItems="center"
                    p={2}
                    px={4}
                >
                    <Text
                        display="flex"
                        alignItems="center"
                        textAlign="center"
                        fontSize="xs"
                        color={text}
                        fontWeight={600}
                    >
                        <Icon fontSize="md" color={text} mr={1} as={BiUser} />
                        <MyTooltip label={`Shift Timing: ${machine.operator.shift}`}>
                            {machine.operator.name}
                        </MyTooltip>
                    </Text>
                    <Text
                        display="flex"
                        alignItems="center"
                        textAlign="center"
                        fontSize="xs"
                        color={text}
                        fontWeight={600}
                    >
                        <Icon fontSize="md" color={text} mr={1} as={BiTimeFive} />
                        <MyTooltip label={dayjs.unix(machine.updated).format("DD-MM-YYYY HH:mm:ss")}>
                            {dayjs.unix(machine.updated).fromNow()}
                        </MyTooltip>
                    </Text>
                </CardFooter>
            </MyCard>
        </Box>
    );
};

export default ProductionCard;