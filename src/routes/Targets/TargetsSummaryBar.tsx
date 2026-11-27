import {
    Box,
    Button,
    Flex,
    HStack,
    Icon,
    Progress,
    SimpleGrid,
    Spinner,
    Tag,
    TagLabel,
    Text,
    useColorMode,
} from "@chakra-ui/react";
import { FiTarget, FiTrendingUp, FiCheckCircle, FiAlertCircle, FiRefreshCw } from "react-icons/fi";
import { HiOutlineDocumentReport } from "react-icons/hi";
import MinifiedNumberFormatter from "../../Components/micro/MinifiedNumberFormatter";
import dayjs from "../../Components/Functions/dayjs";

export interface SummaryStats {
    totalMachines: number;
    totalActiveTargets: number;
    totalSapTargets: number;
    onTrackTargets: number;
    behindTargets: number;
    totalTargetPieces: number;
    totalCurrentPieces: number;
    overallPercent: number;
}

interface TargetsSummaryBarProps {
    stats: SummaryStats;
    isSapEnabled: boolean;
    activeFilter: "ALL" | "ACTIVE" | "SAP";
    onFilterChange: (filter: "ALL" | "ACTIVE" | "SAP") => void;
    isBatchSyncing?: boolean;
    batchLastSynced?: number | null;
    onBatchSync?: () => void;
}

const TargetsSummaryBar = ({
    stats,
    isSapEnabled,
    activeFilter,
    onFilterChange,
    isBatchSyncing = false,
    batchLastSynced = null,
    onBatchSync,
}: TargetsSummaryBarProps) => {
    const { colorMode } = useColorMode();
    const isDark = colorMode === "dark";

    const cardBg = isDark ? "whiteAlpha.50" : "white";
    const borderColor = isDark ? "whiteAlpha.100" : "gray.200";

    return (
        <SimpleGrid
            columns={{
                base: 2,
                md: isSapEnabled ? 4 : 3,
            }}
            gap={2.5}
            mb={3}
            w="100%"
        >
            {/* 1. Active Targets Metric */}
            <Box
                p={2.5}
                borderRadius="md"
                bg={cardBg}
                border="1px solid"
                borderColor={activeFilter === "ACTIVE" ? "orange.400" : borderColor}
                cursor="pointer"
                onClick={() => onFilterChange(activeFilter === "ACTIVE" ? "ALL" : "ACTIVE")}
                _hover={{ borderColor: "orange.400", transform: "translateY(-1px)" }}
                transition="all 0.15s ease-in-out"
                boxShadow="xs"
                display="flex"
                flexDirection="column"
                justifyContent="space-between"
            >
                <Flex justify="space-between" align="center" mb={1}>
                    <Text fontSize="3xs" fontWeight={700} textTransform="uppercase" color="gray.500">
                        Active Targets
                    </Text>
                    <Icon as={FiTarget} color="orange.400" fontSize="xs" />
                </Flex>
                <HStack spacing={1.5} align="baseline">
                    <Text fontSize="lg" fontWeight={700} lineHeight={1}>
                        {stats.totalActiveTargets}
                    </Text>
                    <Text fontSize="3xs" color="gray.500">
                        / {stats.totalMachines} machines
                    </Text>
                    <Tag size="sm" colorScheme="orange" variant="subtle" py={0} px={1} borderRadius="sm" ml="auto">
                        <TagLabel fontSize="3xs" fontWeight={700}>
                            {stats.totalMachines > 0
                                ? Math.round((stats.totalActiveTargets / stats.totalMachines) * 100)
                                : 0}
                            %
                        </TagLabel>
                    </Tag>
                </HStack>
                <Box minH="14px" />
            </Box>

            {/* 2. Total Output Pieces Metric */}
            <Box
                p={2.5}
                borderRadius="md"
                bg={cardBg}
                border="1px solid"
                borderColor={borderColor}
                boxShadow="xs"
                display="flex"
                flexDirection="column"
                justifyContent="space-between"
            >
                <Flex justify="space-between" align="center" mb={1}>
                    <Text fontSize="3xs" fontWeight={700} textTransform="uppercase" color="gray.500">
                        Floor Production
                    </Text>
                    <Icon as={FiTrendingUp} color="teal.400" fontSize="xs" />
                </Flex>
                <HStack spacing={1.5} align="baseline" mb={1.5}>
                    <Text fontSize="lg" fontWeight={700} color="teal.500" lineHeight={1}>
                        <MinifiedNumberFormatter number={stats.totalCurrentPieces} />
                    </Text>
                    <Text fontSize="3xs" color="gray.500">
                        of <MinifiedNumberFormatter number={stats.totalTargetPieces} suffix=" pcs" />
                    </Text>
                    <Text fontSize="2xs" fontWeight={700} color={isDark ? "whiteAlpha.800" : "gray.700"} ml="auto">
                        {stats.overallPercent}%
                    </Text>
                </HStack>
                <Progress
                    value={stats.overallPercent}
                    size="xs"
                    borderRadius="full"
                    colorScheme={stats.overallPercent >= 75 ? "teal" : "orange"}
                />
            </Box>

            {/* 3. Schedule Health Metric */}
            <Box
                p={2.5}
                borderRadius="md"
                bg={cardBg}
                border="1px solid"
                borderColor={borderColor}
                boxShadow="xs"
                display="flex"
                flexDirection="column"
                justifyContent="space-between"
            >
                <Flex justify="space-between" align="center" mb={1}>
                    <Text fontSize="3xs" fontWeight={700} textTransform="uppercase" color="gray.500">
                        Schedule Health
                    </Text>
                    <Icon
                        as={stats.behindTargets > 0 ? FiAlertCircle : FiCheckCircle}
                        color={stats.behindTargets > 0 ? "orange.400" : "green.400"}
                        fontSize="xs"
                    />
                </Flex>
                <HStack spacing={2} align="center" mt={1}>
                    <HStack spacing={1}>
                        <Box w="6px" h="6px" borderRadius="full" bg="green.400" />
                        <Text fontSize="xs" fontWeight={700} color="green.500">
                            {stats.onTrackTargets}
                        </Text>
                        <Text fontSize="3xs" color="gray.500">
                            On Track
                        </Text>
                    </HStack>
                    <Text fontSize="3xs" color="gray.500">
                        •
                    </Text>
                    <HStack spacing={1}>
                        <Box w="6px" h="6px" borderRadius="full" bg={stats.behindTargets > 0 ? "red.400" : "gray.400"} />
                        <Text fontSize="xs" fontWeight={700} color={stats.behindTargets > 0 ? "red.400" : "gray.500"}>
                            {stats.behindTargets}
                        </Text>
                        <Text fontSize="3xs" color="gray.500">
                            Behind
                        </Text>
                    </HStack>
                </HStack>
                <Box minH="14px" />
            </Box>

            {/* 4. SAP Orders Metric (Only if SAP is enabled for this factory) */}
            {isSapEnabled && (
                <Box
                    p={2.5}
                    borderRadius="md"
                    bg={cardBg}
                    border="1px solid"
                    borderColor={activeFilter === "SAP" ? "blue.400" : borderColor}
                    cursor="pointer"
                    onClick={() => onFilterChange(activeFilter === "SAP" ? "ALL" : "SAP")}
                    _hover={{ borderColor: "blue.400", transform: "translateY(-1px)" }}
                    transition="all 0.15s ease-in-out"
                    boxShadow="xs"
                    display="flex"
                    flexDirection="column"
                    justifyContent="space-between"
                >
                    <Flex justify="space-between" align="center" mb={1}>
                        <HStack spacing={1} align="center">
                            <Icon as={HiOutlineDocumentReport} color="blue.400" fontSize="xs" />
                            <Text fontSize="3xs" fontWeight={700} textTransform="uppercase" color="blue.400">
                                SAP Orders
                            </Text>
                        </HStack>
                        {stats.totalSapTargets === 0 ? (
                            <Tag size="sm" colorScheme="gray" variant="subtle" py={0} px={1.5} borderRadius="sm">
                                <TagLabel fontSize="3xs" fontWeight={600}>
                                    No Active SAP Targets
                                </TagLabel>
                            </Tag>
                        ) : (
                            <Button
                                size="xs"
                                h="19px"
                                px={1.5}
                                fontSize="3xs"
                                fontWeight={600}
                                colorScheme="blue"
                                variant="outline"
                                isLoading={isBatchSyncing}
                                loadingText="Syncing..."
                                leftIcon={<FiRefreshCw size={10} />}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onBatchSync?.();
                                }}
                                title="Force refresh SAP data for all active targets"
                            >
                                Sync SAP
                            </Button>
                        )}
                    </Flex>
                    <HStack spacing={1.5} align="baseline" mb={0.5}>
                        <Text fontSize="lg" fontWeight={700} color="blue.400" lineHeight={1}>
                            {stats.totalSapTargets}
                        </Text>
                        <Text fontSize="3xs" color="gray.500">
                            Linked POs
                        </Text>
                        <Tag
                            size="sm"
                            colorScheme="blue"
                            variant={activeFilter === "SAP" ? "solid" : "subtle"}
                            py={0}
                            px={1}
                            borderRadius="sm"
                            ml="auto"
                        >
                            <TagLabel fontSize="3xs" fontWeight={700}>
                                {activeFilter === "SAP" ? "Filtered" : "Filter"}
                            </TagLabel>
                        </Tag>
                    </HStack>
                    <Flex justify="space-between" align="center" fontSize="3xs" color="gray.500" minH="14px">
                        {isBatchSyncing ? (
                            <HStack spacing={1} color="blue.400">
                                <Spinner size="xs" speed="0.8s" w="9px" h="9px" />
                                <Text fontSize="3xs" fontWeight={600}>Syncing with SAP...</Text>
                            </HStack>
                        ) : stats.totalSapTargets === 0 ? (
                            <Text fontSize="3xs" color="gray.400">Assign a PO to track sync</Text>
                        ) : batchLastSynced ? (
                            <Text
                                fontSize="3xs"
                                color="gray.500"
                                isTruncated
                                title={dayjs(batchLastSynced).format("YYYY-MM-DD HH:mm:ss")}
                            >
                                {dayjs(batchLastSynced).format("YYYY-MM-DD") === dayjs().format("YYYY-MM-DD")
                                    ? "Synced today"
                                    : "Last synced"}
                                : {Math.abs(dayjs().diff(dayjs(batchLastSynced), "second")) < 45
                                    ? "just now"
                                    : dayjs(batchLastSynced).fromNow()}
                            </Text>
                        ) : (
                            <Text fontSize="3xs" color="gray.400">Not synced today</Text>
                        )}
                    </Flex>
                </Box>
            )}
        </SimpleGrid>
    );
};

export default TargetsSummaryBar;
