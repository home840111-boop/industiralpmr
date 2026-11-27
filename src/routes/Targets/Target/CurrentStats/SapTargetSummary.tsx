import {
    Box,
    Button,
    Flex,
    HStack,
    Icon,
    SimpleGrid,
    Tag,
    TagLabel,
    Text,
    useColorMode,
    useToast,
    Badge,
    Alert,
    AlertIcon,
    AlertTitle,
    AlertDescription,
    Spinner,
} from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { FiRefreshCw, FiCheckCircle } from "react-icons/fi";
import { HiOutlineDocumentReport } from "react-icons/hi";
import { MdOutlineSensors } from "react-icons/md";
import { BsArrowRepeat } from "react-icons/bs";
import dayjs from "../../../../Components/Functions/dayjs";
import NumberFormatter from "../../../../Components/micro/NumberFormatter";
import ConfirmDialog from "../../../../Components/micro/ConfirmDialog";
import { update } from "../../../../Components/firebase/api/db";
import { SapTargetOrder, syncTargetSapOrder } from "../../../../Services/sap";

interface SapTargetSummaryProps {
    machineID: string;
    moldName: string;
    sapOrder: SapTargetOrder;
    iotCurrent: number;
    onSyncComplete: () => void;
}

const formatLastSynced = (lastSynced?: number | string | null) => {
    if (!lastSynced) return "Never";
    const diffSec = Math.abs(dayjs().diff(dayjs(lastSynced), "second"));
    if (diffSec < 45) return "just now";
    return dayjs(lastSynced).fromNow();
};

const SapTargetSummary = ({
    machineID,
    moldName,
    sapOrder,
    iotCurrent,
    onSyncComplete,
}: SapTargetSummaryProps) => {
    const { colorMode } = useColorMode();
    const toast = useToast();
    const isDark = colorMode === "dark";
    const [syncing, setSyncing] = useState<boolean>(false);
    const [ending, setEnding] = useState<boolean>(false);
    const [currentOrder, setCurrentOrder] = useState<SapTargetOrder>(sapOrder);

    // Keep local state in sync when parent prop changes
    useEffect(() => {
        setCurrentOrder(sapOrder);
    }, [sapOrder]);

    const isTargetReached = currentOrder.target > 0 && iotCurrent >= currentOrder.target;

    // 1. Automatic Daily Sync: If last fetched/synced day is not today, auto-sync once on mount
    useEffect(() => {
        const lastSynced = currentOrder.lastSynced;
        const isNotToday =
            !lastSynced ||
            dayjs(lastSynced).format("YYYY-MM-DD") !== dayjs().format("YYYY-MM-DD");

        if (isNotToday && !syncing) {
            console.log("[SAP Daily Auto-Sync] Order last synced date is before today. Triggering automatic sync...");
            handleSync(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentOrder.orderNumber, currentOrder.materialNumber]);

    // 2. Perform Sync with Cloud Function and RTDB
    const handleSync = async (isManual: boolean = true) => {
        setSyncing(true);
        try {
            const updated = await syncTargetSapOrder(machineID, moldName, currentOrder, isManual);
            if (updated) {
                setCurrentOrder(updated);
            }
            if (isManual) {
                toast({
                    title: "SAP Synced",
                    description: `Refreshed ERP confirmations for Order #${currentOrder.orderNumber}.`,
                    status: "success",
                    duration: 3000,
                    isClosable: true,
                });
            }
            onSyncComplete();
        } catch (err: any) {
            if (isManual) {
                toast({
                    title: "Sync Failed",
                    description: err?.message || "Could not refresh order from SAP proxy.",
                    status: "error",
                    duration: 4000,
                    isClosable: true,
                });
            }
        } finally {
            setSyncing(false);
        }
    };

    // 3. Manual Completion for SAP Targets (SAP targets NEVER auto-complete)
    const handleEndTarget = async () => {
        setEnding(true);
        try {
            await update(`production-targets/active/${machineID}/${moldName}/target`, {
                completed: true,
                manualCompletion: true,
            });
            toast({
                title: "Target Completed",
                description: `Target for SAP Order #${currentOrder.orderNumber} ended manually.`,
                status: "success",
                duration: 4000,
                isClosable: true,
            });
            onSyncComplete();
        } catch (err: any) {
            toast({
                title: "Failed to End Target",
                description: err?.message || "Something went wrong.",
                status: "error",
                duration: 4000,
                isClosable: true,
            });
        } finally {
            setEnding(false);
        }
    };

    const variance = iotCurrent - currentOrder.confirmed;
    const isSyncedToday =
        dayjs(currentOrder.lastSynced).format("YYYY-MM-DD") === dayjs().format("YYYY-MM-DD");

    return (
        <Box
            w="100%"
            mt={3}
            p={2.5}
            borderRadius="md"
            border="1px solid"
            borderColor={isDark ? "blue.800" : "blue.100"}
            bg={isDark ? "blue.950" : "blue.50"}
            boxShadow="sm"
        >
            {/* Target Reached Banner with Manual Completion Action */}
            {isTargetReached && (
                <Alert
                    status="success"
                    variant="subtle"
                    borderRadius="md"
                    py={2}
                    px={3}
                    mb={2}
                    display="flex"
                    justifyContent="space-between"
                    alignItems="center"
                    flexWrap="wrap"
                    gap={2}
                >
                    <HStack spacing={2}>
                        <AlertIcon boxSize="16px" />
                        <Box>
                            <AlertTitle fontSize="xs" fontWeight={700}>
                                Target Reached ({iotCurrent} / {currentOrder.target} pcs)
                            </AlertTitle>
                            <AlertDescription fontSize="2xs">
                                SAP targets do not auto-complete. Production continues to accumulate until manually completed.
                            </AlertDescription>
                        </Box>
                    </HStack>
                    <ConfirmDialog
                        heading="Complete SAP Target?"
                        text={`Are you sure you want to manually complete the target for SAP Order #${currentOrder.orderNumber}? It will be archived and removed from active targets.`}
                        onConfirm={handleEndTarget}
                        scope="danger"
                    >
                        <Button
                            size="xs"
                            colorScheme="red"
                            variant="solid"
                            isLoading={ending}
                            leftIcon={<Icon as={FiCheckCircle} />}
                        >
                            Complete Target
                        </Button>
                    </ConfirmDialog>
                </Alert>
            )}

            {/* Compact Header row */}
            <Flex
                justifyContent="space-between"
                alignItems="center"
                flexWrap="wrap"
                gap={1.5}
                borderBottom="1px solid"
                borderColor={isDark ? "blue.900" : "blue.200"}
                pb={2}
                mb={2}
            >
                <HStack gap={1.5} flexWrap="wrap">
                    <Badge colorScheme="blue" variant="solid" px={1.5} py={0.2} borderRadius="sm" fontSize="3xs">
                        SAP ORDER
                    </Badge>
                    <Badge
                        colorScheme="purple"
                        variant="subtle"
                        px={1.5}
                        py={0.2}
                        borderRadius="sm"
                        fontSize="3xs"
                        title="SAP targets require manual completion and will not auto-complete on reaching target"
                    >
                        MANUAL END REQUIRED
                    </Badge>
                    {isTargetReached && (
                        <Badge colorScheme="green" variant="solid" px={1.5} py={0.2} borderRadius="sm" fontSize="3xs">
                            TARGET REACHED
                        </Badge>
                    )}
                    <HStack gap={1}>
                        <Icon as={HiOutlineDocumentReport} color="blue.400" fontSize="xs" />
                        <Text fontWeight={700} fontSize="sm">
                            PO #{currentOrder.orderNumber}
                        </Text>
                    </HStack>
                    <Tag size="sm" colorScheme="teal" borderRadius="full" py={0} px={2}>
                        <TagLabel fontSize="2xs" fontWeight={600}>{currentOrder.materialDesc}</TagLabel>
                    </Tag>
                    <Text fontSize="2xs" color={isDark ? "gray.400" : "gray.600"}>
                        ({currentOrder.materialNumber})
                    </Text>
                </HStack>

                <HStack gap={2} align="center">
                    {syncing ? (
                        <HStack spacing={1.5} color="blue.400">
                            <Spinner size="xs" speed="0.7s" thickness="2px" />
                            <Text fontSize="3xs" fontWeight={600}>
                                Syncing with SAP...
                            </Text>
                        </HStack>
                    ) : (
                        <Text fontSize="3xs" color={isDark ? "gray.400" : "gray.600"}>
                            {isSyncedToday ? "Synced today" : "Last synced"}:{" "}
                            <strong>{formatLastSynced(currentOrder.lastSynced)}</strong>
                        </Text>
                    )}
                    <Button
                        size="xs"
                        colorScheme="blue"
                        variant="outline"
                        leftIcon={<Icon as={FiRefreshCw} className={syncing ? "spin" : undefined} fontSize="3xs" />}
                        onClick={() => handleSync(true)}
                        isLoading={syncing}
                        loadingText="Syncing..."
                        title="Pull latest actual and confirmed pieces from SAP"
                    >
                        Sync SAP
                    </Button>
                </HStack>
            </Flex>

            {/* Metrics cards grid */}
            <SimpleGrid columns={{ base: 2, md: 4 }} gap={2}>
                {/* 1. Target from SAP */}
                <Box
                    p={2}
                    borderRadius="sm"
                    bg={isDark ? "whiteAlpha.100" : "white"}
                    border="1px solid"
                    borderColor={isDark ? "whiteAlpha.200" : "gray.200"}
                >
                    <Text fontSize="2xs" color="gray.500" textTransform="uppercase" fontWeight={600}>
                        SAP Target
                    </Text>
                    <Text fontSize="lg" fontWeight={700} color={isDark ? "white" : "gray.800"}>
                        <NumberFormatter number={currentOrder.target} />
                    </Text>
                    <Text fontSize="3xs" color="blue.400" fontWeight={600}>
                        🔒 PSMNG
                    </Text>
                </Box>

                {/* 2. Confirmed in SAP */}
                <Box
                    p={2}
                    borderRadius="sm"
                    bg={isDark ? "whiteAlpha.100" : "white"}
                    border="1px solid"
                    borderColor={isDark ? "whiteAlpha.200" : "gray.200"}
                >
                    <HStack justify="space-between">
                        <Text fontSize="2xs" color="gray.500" textTransform="uppercase" fontWeight={600}>
                            SAP Confirmed
                        </Text>
                        <Icon as={FiCheckCircle} color="teal.400" fontSize="3xs" />
                    </HStack>
                    <Text fontSize="lg" fontWeight={700} color="teal.500">
                        <NumberFormatter number={currentOrder.confirmed} />
                    </Text>
                    <Text fontSize="3xs" color="gray.500">
                        LMNGA (Yield)
                    </Text>
                </Box>

                {/* 3. Live iPMR sensor count */}
                <Box
                    p={2}
                    borderRadius="sm"
                    bg={isDark ? "whiteAlpha.100" : "white"}
                    border="1px solid"
                    borderColor={isDark ? "whiteAlpha.200" : "gray.200"}
                >
                    <HStack justify="space-between">
                        <Text fontSize="2xs" color="gray.500" textTransform="uppercase" fontWeight={600}>
                            Live iPMR Count
                        </Text>
                        <Icon as={MdOutlineSensors} color="orange.400" fontSize="3xs" />
                    </HStack>
                    <Text fontSize="lg" fontWeight={700} color="orange.500">
                        <NumberFormatter number={iotCurrent} />
                    </Text>
                    <Text fontSize="3xs" color="gray.500">
                        iPMR Sensor
                    </Text>
                </Box>

                {/* 4. Variance / Confirmation Pending */}
                <Box
                    p={2}
                    borderRadius="sm"
                    bg={isDark ? "whiteAlpha.100" : "white"}
                    border="1px solid"
                    borderColor={isDark ? "whiteAlpha.200" : "gray.200"}
                >
                    <HStack justify="space-between">
                        <Text fontSize="2xs" color="gray.500" textTransform="uppercase" fontWeight={600}>
                            Pending Conf.
                        </Text>
                        <Icon as={BsArrowRepeat} color="purple.400" fontSize="3xs" />
                    </HStack>
                    <Text
                        fontSize="lg"
                        fontWeight={700}
                        color={variance > 0 ? "purple.400" : variance === 0 ? "teal.400" : "orange.400"}
                    >
                        {variance > 0 ? `+${variance}` : variance}
                    </Text>
                    <Text fontSize="3xs" color="gray.500">
                        {variance > 0
                            ? "iPMR ahead"
                            : variance === 0
                            ? "Aligned"
                            : "Behind SAP"}
                    </Text>
                </Box>
            </SimpleGrid>
        </Box>
    );
};

export default SapTargetSummary;
