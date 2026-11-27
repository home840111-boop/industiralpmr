import {
    Box,
    Button,
    Center,
    HStack,
    Icon,
    SimpleGrid,
    Text,
    Progress,
    useColorMode,
    VStack,
} from "@chakra-ui/react";
import { DataToSet } from "..";
import IsScreenSmall from "../../../../Components/Store/hooks/IsScreenSmall";
import OEE from "./OEE";
import ProgressSection from "./ProgressSection";
import ProjectedCompletion from "./ProjectedCompletion";
import SapTargetSummary from "./SapTargetSummary";
import { useParams } from "react-router-dom";
import { FiPlus, FiTarget } from "react-icons/fi";
import AddUpdateTarget from "../AddUpdateTarget";
import secFormatter from "../../../../Components/Functions/formatters/secFormatter";
import { useIsSapEnabled } from "../../../../Services/sap";

const CurrentStats = ({
    data,
    refetch,
}: {
    data: DataToSet;
    refetch?: () => void;
}) => {
    const { machineID } = useParams();
    const isSapEnabled = useIsSapEnabled();
    const { colorMode } = useColorMode();
    const isDark = colorMode === "dark";
    const isSmall = IsScreenSmall(1200);

    const hasTarget = data.target.target > 0;

    return (
        <Box w="100%">
            {hasTarget ? (
                /* Active Target Layout */
                <>
                    <SimpleGrid alignItems="center" columns={isSmall ? 1 : 3} gap={isSmall ? 4 : 2}>
                        {isSmall ? (
                            <>
                                <ProgressSection data={data.progress} status={data.status} />
                                <OEE data={data.OEE} hours={data.hours} />
                                <ProjectedCompletion data={data} />
                            </>
                        ) : (
                            <>
                                <OEE data={data.OEE} hours={data.hours} />
                                <ProgressSection data={data.progress} status={data.status} />
                                <ProjectedCompletion data={data} />
                            </>
                        )}
                    </SimpleGrid>

                    {data.target.sapOrder && isSapEnabled ? (
                        <SapTargetSummary
                            machineID={machineID || ""}
                            moldName={data.mold.name}
                            sapOrder={data.target.sapOrder}
                            iotCurrent={data.progress.current}
                            onSyncComplete={() => refetch?.()}
                        />
                    ) : (
                        <Box
                            w="100%"
                            mt={3}
                            p={2.5}
                            borderRadius="md"
                            border="1px solid"
                            borderColor={isDark ? "whiteAlpha.200" : "gray.200"}
                            bg={isDark ? "whiteAlpha.50" : "gray.50"}
                        >
                            <SimpleGrid columns={{ base: 2, md: 4 }} gap={2}>
                                <Box
                                    p={2.5}
                                    borderRadius="sm"
                                    bg={isDark ? "whiteAlpha.100" : "white"}
                                    border="1px solid"
                                    borderColor={isDark ? "whiteAlpha.200" : "gray.200"}
                                >
                                    <Text fontSize="3xs" color="gray.500" textTransform="uppercase" fontWeight={600}>
                                        Produced / Target
                                    </Text>
                                    <HStack justify="space-between" align="baseline" mt={0.5}>
                                        <Text fontSize="sm" fontWeight={700}>
                                            {data.progress.current} / {data.progress.total}
                                        </Text>
                                        <Text fontSize="3xs" fontWeight={700} color={data.progress.current >= data.progress.total ? "green.400" : "orange.400"}>
                                            {data.progress.total > 0 ? `${((data.progress.current / data.progress.total) * 100).toFixed(0)}%` : "0%"}
                                        </Text>
                                    </HStack>
                                    <Progress
                                        mt={1.5}
                                        size="xs"
                                        borderRadius="full"
                                        colorScheme={data.progress.current >= data.progress.total ? "green" : "orange"}
                                        value={data.progress.total > 0 ? (data.progress.current / data.progress.total) * 100 : 0}
                                    />
                                </Box>

                                <Box
                                    p={2.5}
                                    borderRadius="sm"
                                    bg={isDark ? "whiteAlpha.100" : "white"}
                                    border="1px solid"
                                    borderColor={isDark ? "whiteAlpha.200" : "gray.200"}
                                >
                                    <Text fontSize="3xs" color="gray.500" textTransform="uppercase" fontWeight={600}>
                                        Hourly Target
                                    </Text>
                                    <Text fontSize="sm" fontWeight={700} mt={0.5}>
                                        {data.target.hourlyTarget ? `${data.target.hourlyTarget} pcs/h` : "Dynamic"}
                                    </Text>
                                    <Text fontSize="3xs" color="gray.400">
                                        Pacing: {data.mold.cycleTime ? `${Math.round(3600 / data.mold.cycleTime * (data.mold.cavities || 1))} max` : "Standard"}
                                    </Text>
                                </Box>

                                <Box
                                    p={2.5}
                                    borderRadius="sm"
                                    bg={isDark ? "whiteAlpha.100" : "white"}
                                    border="1px solid"
                                    borderColor={isDark ? "whiteAlpha.200" : "gray.200"}
                                >
                                    <Text fontSize="3xs" color="gray.500" textTransform="uppercase" fontWeight={600}>
                                        Ontime Run
                                    </Text>
                                    <Text fontSize="sm" fontWeight={700} color="green.400" mt={0.5}>
                                        {secFormatter(data.timing.ontime)}
                                    </Text>
                                    <Text fontSize="3xs" color="gray.400">
                                        Live production time
                                    </Text>
                                </Box>

                                <Box
                                    p={2.5}
                                    borderRadius="sm"
                                    bg={isDark ? "whiteAlpha.100" : "white"}
                                    border="1px solid"
                                    borderColor={isDark ? "whiteAlpha.200" : "gray.200"}
                                >
                                    <Text fontSize="3xs" color="gray.500" textTransform="uppercase" fontWeight={600}>
                                        Downtime Recorded
                                    </Text>
                                    <Text fontSize="sm" fontWeight={700} color={data.timing.downtime.total > 1800 ? "red.400" : "gray.300"} mt={0.5}>
                                        {secFormatter(data.timing.downtime.total)}
                                    </Text>
                                    <Text fontSize="3xs" color="gray.400">
                                        Idle / stops logged
                                    </Text>
                                </Box>
                            </SimpleGrid>
                        </Box>
                    )}
                </>
            ) : (
                /* Compact Hero Empty State when No Target is Configured */
                <VStack spacing={3} w="100%" py={1}>
                    <Box
                        w="100%"
                        p={{ base: 4, md: 5 }}
                        borderRadius="md"
                        border="1px dashed"
                        borderColor={isDark ? "orange.600" : "orange.300"}
                        bg={isDark ? "whiteAlpha.50" : "orange.50"}
                        textAlign="center"
                    >
                        <Center mb={2}>
                            <Box
                                p={2.5}
                                borderRadius="full"
                                bg={isDark ? "whiteAlpha.100" : "white"}
                                boxShadow="sm"
                                color="orange.400"
                            >
                                <Icon as={FiTarget} fontSize="2xl" />
                            </Box>
                        </Center>
                        <Text fontSize="sm" fontWeight={700} mb={1}>
                            No Active Production Target
                        </Text>
                        <Text
                            fontSize="xs"
                            color={isDark ? "gray.400" : "gray.600"}
                            maxW="540px"
                            mx="auto"
                            mb={3}
                        >
                            {isSapEnabled
                                ? "Assign a SAP Production Order or manual target to monitor live piece counters, OEE, downtime classification, and completion tracking."
                                : "Assign a target to monitor live piece counters, OEE, downtime classification, and completion tracking."}
                        </Text>

                        <HStack justify="center" gap={2} flexWrap="wrap">
                            <AddUpdateTarget
                                refetch={refetch || (() => {})}
                                target={data.target}
                                mold={data.mold}
                                machineID={machineID}
                                notificationCategories={data.notificationCategories}
                            >
                                <Button
                                    size="xs"
                                    colorScheme="orange"
                                    leftIcon={<Icon as={FiPlus} />}
                                    boxShadow="sm"
                                    px={3}
                                    py={1.5}
                                >
                                    {isSapEnabled ? "Set Target / Import SAP Order" : "Set Target"}
                                </Button>
                            </AddUpdateTarget>
                        </HStack>
                    </Box>

                    {/* Operational Summary Strip for Machine while target is unset */}
                    <SimpleGrid columns={{ base: 2, md: 4 }} gap={2} w="100%">
                        <Box
                            p={2.5}
                            borderRadius="md"
                            bg={isDark ? "whiteAlpha.50" : "white"}
                            border="1px solid"
                            borderColor={isDark ? "whiteAlpha.100" : "gray.200"}
                        >
                            <Text fontSize="3xs" fontWeight={600} textTransform="uppercase" color="gray.500">
                                Installed Mold
                            </Text>
                            <Text fontSize="sm" fontWeight={700} mt={0.5}>
                                {data.mold.name || "None"}
                            </Text>
                            <Text fontSize="3xs" color="gray.400">
                                {data.mold.cavities} cav | {data.mold.cycleTime}s avg cycle
                            </Text>
                        </Box>
                        <Box
                            p={2.5}
                            borderRadius="md"
                            bg={isDark ? "whiteAlpha.50" : "white"}
                            border="1px solid"
                            borderColor={isDark ? "whiteAlpha.100" : "gray.200"}
                        >
                            <Text fontSize="3xs" fontWeight={600} textTransform="uppercase" color="gray.500">
                                Current OEE
                            </Text>
                            <Text fontSize="sm" fontWeight={700} color={data.OEE >= 75 ? "green.400" : "orange.400"} mt={0.5}>
                                {data.OEE}%
                            </Text>
                            <Text fontSize="3xs" color="gray.400">
                                Operational efficiency
                            </Text>
                        </Box>
                        <Box
                            p={2.5}
                            borderRadius="md"
                            bg={isDark ? "whiteAlpha.50" : "white"}
                            border="1px solid"
                            borderColor={isDark ? "whiteAlpha.100" : "gray.200"}
                        >
                            <Text fontSize="3xs" fontWeight={600} textTransform="uppercase" color="gray.500">
                                Ontime Run
                            </Text>
                            <Text fontSize="sm" fontWeight={700} mt={0.5}>
                                {secFormatter(data.timing.ontime)}
                            </Text>
                            <Text fontSize="3xs" color="gray.400">
                                Recorded runtime today
                            </Text>
                        </Box>
                        <Box
                            p={2.5}
                            borderRadius="md"
                            bg={isDark ? "whiteAlpha.50" : "white"}
                            border="1px solid"
                            borderColor={isDark ? "whiteAlpha.100" : "gray.200"}
                        >
                            <Text fontSize="3xs" fontWeight={600} textTransform="uppercase" color="gray.500">
                                Downtime Recorded
                            </Text>
                            <Text fontSize="sm" fontWeight={700} color={data.timing.downtime.total > 1800 ? "red.400" : "gray.300"} mt={0.5}>
                                {secFormatter(data.timing.downtime.total)}
                            </Text>
                            <Text fontSize="3xs" color="gray.400">
                                Total idle / stops logged
                            </Text>
                        </Box>
                    </SimpleGrid>
                </VStack>
            )}
        </Box>
    );
};

export default CurrentStats;