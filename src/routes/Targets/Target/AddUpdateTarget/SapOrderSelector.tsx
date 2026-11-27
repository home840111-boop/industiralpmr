import {
    Box,
    Button,
    Flex,
    HStack,
    Icon,
    Radio,
    RadioGroup,
    Stack,
    Text,
    useColorMode,
    useToast,
    VStack,
    Spinner,
    Badge,
    Input,
    Collapse,
    Tag,
} from "@chakra-ui/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FiLink, FiX, FiRefreshCw, FiLayers, FiCalendar } from "react-icons/fi";
import { HiOutlineDocumentReport } from "react-icons/hi";
import SearchableSelector from "../../../../Components/Inputs/SearchableSelector";
import MyTooltip from "../../../../Components/micro/MyTooltip";
import {
    fetchOrdersByRange,
    fetchOrderByPoNumber,
    SapGroupedOrder,
    SapOrderItem,
    SapTargetOrder,
} from "../../../../Services/sap";
import MinifiedNumberFormatter from "../../../../Components/micro/MinifiedNumberFormatter";
import dayjs from "dayjs";

export const formatSapDueDate = (endDate?: string) => {
    if (!endDate) return null;
    const endValid = dayjs(endDate).isValid();
    if (endValid) {
        return dayjs(endDate).format("DD MMM YYYY");
    }
    return endDate;
};

export const formatSapDateRange = (startDate?: string, endDate?: string) => {
    if (!startDate && !endDate) return null;
    const startValid = startDate && dayjs(startDate).isValid();
    const endValid = endDate && dayjs(endDate).isValid();
    if (startValid && endValid) {
        const s = dayjs(startDate);
        const e = dayjs(endDate);
        if (s.isSame(e, "day")) {
            return s.format("DD MMM YYYY");
        }
        if (s.year() === e.year()) {
            return `${s.format("DD MMM")} – ${e.format("DD MMM YYYY")}`;
        }
        return `${s.format("DD MMM YYYY")} – ${e.format("DD MMM YYYY")}`;
    }
    if (endValid) {
        return `Due: ${dayjs(endDate).format("DD MMM YYYY")}`;
    }
    if (startValid) {
        return `Start: ${dayjs(startDate).format("DD MMM YYYY")}`;
    }
    return `${startDate || ""} – ${endDate || ""}`.trim();
};

interface SapOrderSelectorProps {
    selectedSapOrder: SapTargetOrder | null;
    onSelect: (
        sapOrder: SapTargetOrder,
        autoValues: { name: string; target: number; due?: string }
    ) => void;
    onClear: () => void;
}

const SapOrderSelector = ({
    selectedSapOrder,
    onSelect,
    onClear,
}: SapOrderSelectorProps) => {
    const { colorMode } = useColorMode();
    const toast = useToast();
    const isDark = colorMode === "dark";

    const [orders, setOrders] = useState<SapGroupedOrder[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [syncing, setSyncing] = useState<boolean>(false);
    const [lastSynced, setLastSynced] = useState<number | null>(null);
    const [activeGroupedOrder, setActiveGroupedOrder] = useState<SapGroupedOrder | null>(null);

    // Date range filter for querying SAP Gateway
    const [fetchStartDate, setFetchStartDate] = useState<string>(() => {
        if (selectedSapOrder?.startDate && dayjs(selectedSapOrder.startDate).isValid()) {
            return dayjs(selectedSapOrder.startDate).format("YYYY-MM-DD");
        }
        return dayjs().startOf("month").format("YYYY-MM-DD");
    });
    const [fetchEndDate, setFetchEndDate] = useState<string>(() => {
        if (selectedSapOrder?.endDate && dayjs(selectedSapOrder.endDate).isValid()) {
            return dayjs(selectedSapOrder.endDate).format("YYYY-MM-DD");
        }
        return dayjs().endOf("month").format("YYYY-MM-DD");
    });
    const [showDateFilter, setShowDateFilter] = useState<boolean>(false);

    // Fetch orders by date range
    const loadOrdersForRange = useCallback(async (start: string, end: string, force: boolean) => {
        if (force) setSyncing(true);
        else setLoading(true);
        try {
            const result = await fetchOrdersByRange(start, end, force);
            setOrders(result.orders);
            setLastSynced(result.lastFetched);
            if (force) {
                toast({
                    title: "SAP Orders Synced",
                    description: `Successfully retrieved ${result.orders.length} orders for ${dayjs(start).format("DD MMM")} – ${dayjs(end).format("DD MMM YYYY")}.`,
                    status: "success",
                    duration: 3500,
                    isClosable: true,
                });
            }
        } catch (err: any) {
            if (force) {
                toast({
                    title: "Sync Failed",
                    description: err?.message || "Could not connect to SAP proxy.",
                    status: "error",
                    duration: 5000,
                    isClosable: true,
                });
            }
        } finally {
            setLoading(false);
            setSyncing(false);
        }
    }, [toast]);

    // 1. Initial load of orders based on fetchStartDate & fetchEndDate
    useEffect(() => {
        let isMounted = true;
        const load = async () => {
            setLoading(true);
            try {
                const rangeResult = await fetchOrdersByRange(fetchStartDate, fetchEndDate, false);
                if (isMounted) {
                    setLastSynced(rangeResult.lastFetched);
                    setOrders(rangeResult.orders);
                }
            } catch (e) {
                console.error("[SapOrderSelector] Error loading orders:", e);
            } finally {
                if (isMounted) setLoading(false);
            }
        };
        load();
        return () => {
            isMounted = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // 2. Synchronize activeGroupedOrder or resolve external PO if missing from month list
    useEffect(() => {
        if (!selectedSapOrder?.orderNumber) {
            setActiveGroupedOrder(null);
            return;
        }

        if (activeGroupedOrder?.orderNumber === selectedSapOrder.orderNumber) {
            return;
        }

        const found = orders.find((o) => o.orderNumber === selectedSapOrder.orderNumber);
        if (found) {
            setActiveGroupedOrder(found);
            return;
        }

        // If not in current month list and not loading, fetch by PO number
        if (!loading) {
            let isMounted = true;
            fetchOrderByPoNumber(selectedSapOrder.orderNumber, false)
                .then((singleRes) => {
                    if (isMounted && singleRes.order) {
                        setOrders((prev) => {
                            if (prev.some((o) => o.orderNumber === singleRes.order!.orderNumber)) return prev;
                            return [...prev, singleRes.order!];
                        });
                        setActiveGroupedOrder(singleRes.order);
                    }
                })
                .catch((searchErr) => {
                    console.warn("[SapOrderSelector] Could not find order via search:", searchErr);
                });
            return () => {
                isMounted = false;
            };
        }
    }, [selectedSapOrder?.orderNumber, selectedSapOrder?.materialNumber, orders, loading, activeGroupedOrder?.orderNumber]);

    // 3. Format options for SearchableSelector
    const selectOptions = useMemo(() => {
        return orders.map((order) => {
            const firstItemDesc = order.items[0]?.materialDescription || "Order";
            const itemCount = order.items.length;
            const subtitle = itemCount > 1 ? ` (${itemCount} parts)` : "";
            return {
                label: `PO #${order.orderNumber} - ${firstItemDesc}${subtitle} [Target: ${order.totalTarget.toLocaleString()}]`,
                value: order.orderNumber,
            };
        });
    }, [orders]);

    // 4. Handle picking an order from the dropdown
    const handleOrderPicked = (option: { label: string; value: string } | null) => {
        if (!option) {
            setActiveGroupedOrder(null);
            return;
        }

        const found = orders.find((o) => o.orderNumber === option.value);
        if (!found) return;

        setActiveGroupedOrder(found);

        if (found.items.length > 0) {
            applySelection(found, found.items[0]);
        }
    };

    // 5. Apply selection and notify parent modal
    const applySelection = (order: SapGroupedOrder, item?: SapOrderItem) => {
        const selectedItem = item || order.items[0];
        const targetQty = Number(
            selectedItem?.targetQuantity ??
            (selectedItem as any)?.PSMNG ??
            order.totalTarget
        ) || 0;
        const actualQty = Number(
            selectedItem?.actualQuantity ??
            (selectedItem as any)?.confirmedQuantity ??
            (selectedItem as any)?.confirmedYield ??
            (selectedItem as any)?.LMNGA ??
            order.totalActual ??
            (order as any)?.confirmedYield ??
            (order as any)?.confirmedQuantity ??
            (order as any)?.LMNGA
        ) || 0;
        const parsedDue = order.endDate
            ? dayjs(order.endDate).isValid()
                ? dayjs(order.endDate).format("YYYY-MM-DD")
                : undefined
            : undefined;

        const sapPayload: SapTargetOrder = {
            orderNumber: order.orderNumber,
            materialNumber: selectedItem?.materialNumber || "",
            materialDesc: selectedItem?.materialDescription || "Order",
            target: targetQty,
            confirmed: actualQty,
            actual: actualQty,
            lastSynced: Date.now(),
            status: order.orderType,
            startDate: order.startDate,
            endDate: order.endDate,
        };

        onSelect(sapPayload, {
            name: `${order.orderNumber} - ${selectedItem?.materialDescription || "Order"}`,
            target: targetQty,
            due: parsedDue,
        });
    };

    // 6. Manual force-sync with SAP via Cloud Function for active date range
    const handleForceSync = () => {
        loadOrdersForRange(fetchStartDate, fetchEndDate, true);
    };

    const linkedGroupedOrder = activeGroupedOrder || (selectedSapOrder ? orders.find((o) => o.orderNumber === selectedSapOrder.orderNumber) || null : null);
    const currentPartIndex = linkedGroupedOrder && selectedSapOrder
        ? linkedGroupedOrder.items.findIndex((i) => i.materialNumber === selectedSapOrder.materialNumber)
        : -1;

    return (
        <Box
            w="100%"
            p={2.5}
            borderRadius="md"
            border="1px solid"
            borderColor={isDark ? "blue.700" : "blue.200"}
            bg={isDark ? "blue.950" : "blue.50"}
            transition="all 0.2s"
        >
            <Flex justifyContent="space-between" alignItems="center" mb={2} flexWrap="nowrap" gap={2} w="100%">
                <HStack gap={2} minW="fit-content" whiteSpace="nowrap">
                    <Icon as={FiLink} color="blue.500" boxSize={4} />
                    <Text fontWeight={600} fontSize="sm" whiteSpace="nowrap">
                        Import from SAP Production Order
                    </Text>
                    {selectedSapOrder && (
                        <Badge colorScheme="teal" variant="solid" fontSize="3xs" px={1.5} py={0.5} borderRadius="full">
                            LINKED
                        </Badge>
                    )}
                </HStack>
                <HStack gap={2} align="center" ml="auto" whiteSpace="nowrap" flexShrink={0}>
                    {syncing ? (
                        <HStack spacing={1.5} color="blue.400">
                            <Spinner size="xs" speed="0.7s" thickness="2px" />
                            <Text fontSize="xs" fontWeight={600}>
                                Syncing with SAP...
                            </Text>
                        </HStack>
                    ) : lastSynced ? (
                        <Text fontSize="xs" color={isDark ? "gray.300" : "gray.600"}>
                            {dayjs(lastSynced).format("YYYY-MM-DD") === dayjs().format("YYYY-MM-DD")
                                ? "Synced today"
                                : "Last synced"}
                            :{" "}
                            <strong style={{ fontWeight: 600 }}>
                                {Math.abs(dayjs().diff(dayjs(lastSynced), "second")) < 45
                                    ? "just now"
                                    : dayjs(lastSynced).fromNow()}
                            </strong>
                        </Text>
                    ) : null}
                    <MyTooltip label="Sync latest orders directly from SAP Gateway for the active date range">
                        <Button
                            size="xs"
                            h="24px"
                            fontSize="xs"
                            variant="ghost"
                            colorScheme="blue"
                            leftIcon={<Icon as={FiRefreshCw} className={syncing ? "spin" : undefined} />}
                            onClick={handleForceSync}
                            isLoading={syncing}
                            loadingText="Syncing..."
                            title="Sync latest orders from SAP Gateway"
                        >
                            Sync SAP
                        </Button>
                    </MyTooltip>
                </HStack>
            </Flex>

            {/* Date Window Summary & Range Adjuster */}
            <Box mb={2.5}>
                <Flex
                    w="100%"
                    justifyContent="space-between"
                    alignItems="center"
                    px={2.5}
                    py={1.5}
                    borderRadius="md"
                    bg={isDark ? "whiteAlpha.100" : "white"}
                    border="1px solid"
                    borderColor={isDark ? "whiteAlpha.200" : "gray.200"}
                    fontSize="xs"
                    flexWrap="wrap"
                    gap={2}
                >
                    <HStack spacing={2} align="center" wrap="wrap">
                        <HStack spacing={1.5} color={isDark ? "gray.300" : "gray.600"}>
                            <Icon as={FiCalendar} fontSize="12px" color="blue.400" />
                            <Text fontWeight={600}>SAP Query Date Range:</Text>
                        </HStack>
                        <Badge colorScheme="blue" variant="subtle" fontSize="xs" px={2} py={0.5} borderRadius="sm">
                            {dayjs(fetchStartDate).format("DD MMM YYYY")} &rarr; {dayjs(fetchEndDate).format("DD MMM YYYY")}
                        </Badge>
                        <Badge colorScheme="purple" variant="outline" fontSize="3xs" px={1.5}>
                            {orders.length} in range
                        </Badge>
                    </HStack>
                    <Button
                        size="xs"
                        h="22px"
                        fontSize="xs"
                        variant="link"
                        colorScheme="blue"
                        onClick={() => setShowDateFilter((prev) => !prev)}
                    >
                        {showDateFilter ? "Hide Date Filter" : "Adjust Date Range"}
                    </Button>
                </Flex>

                <Collapse in={showDateFilter} animateOpacity>
                    <Box
                        mt={2}
                        p={2.5}
                        borderRadius="md"
                        bg={isDark ? "blackAlpha.400" : "gray.50"}
                        border="1px solid"
                        borderColor={isDark ? "whiteAlpha.200" : "gray.300"}
                    >
                        <HStack spacing={1.5} mb={2} wrap="wrap">
                            <Text fontSize="10px" textTransform="uppercase" fontWeight={600} color={isDark ? "gray.400" : "gray.600"}>
                                Presets:
                            </Text>
                            <Tag
                                size="sm"
                                cursor="pointer"
                                variant="subtle"
                                colorScheme="blue"
                                onClick={() => {
                                    const s = dayjs().startOf("month").format("YYYY-MM-DD");
                                    const e = dayjs().endOf("month").format("YYYY-MM-DD");
                                    setFetchStartDate(s);
                                    setFetchEndDate(e);
                                    loadOrdersForRange(s, e, true);
                                }}
                            >
                                This Month
                            </Tag>
                            <Tag
                                size="sm"
                                cursor="pointer"
                                variant="subtle"
                                colorScheme="blue"
                                onClick={() => {
                                    const s = dayjs().subtract(1, "month").startOf("month").format("YYYY-MM-DD");
                                    const e = dayjs().subtract(1, "month").endOf("month").format("YYYY-MM-DD");
                                    setFetchStartDate(s);
                                    setFetchEndDate(e);
                                    loadOrdersForRange(s, e, true);
                                }}
                            >
                                Last Month
                            </Tag>
                            <Tag
                                size="sm"
                                cursor="pointer"
                                variant="subtle"
                                colorScheme="blue"
                                onClick={() => {
                                    const s = dayjs().subtract(30, "day").format("YYYY-MM-DD");
                                    const e = dayjs().format("YYYY-MM-DD");
                                    setFetchStartDate(s);
                                    setFetchEndDate(e);
                                    loadOrdersForRange(s, e, true);
                                }}
                            >
                                Last 30 Days
                            </Tag>
                            <Tag
                                size="sm"
                                cursor="pointer"
                                variant="subtle"
                                colorScheme="blue"
                                onClick={() => {
                                    const s = dayjs().format("YYYY-MM-DD");
                                    const e = dayjs().add(30, "day").format("YYYY-MM-DD");
                                    setFetchStartDate(s);
                                    setFetchEndDate(e);
                                    loadOrdersForRange(s, e, true);
                                }}
                            >
                                Next 30 Days
                            </Tag>
                        </HStack>

                        <HStack spacing={2} align="flex-end" wrap="wrap">
                            <Box minW="130px" flex={1}>
                                <Text fontSize="10px" color={isDark ? "gray.300" : "gray.600"} mb={0.5} fontWeight={600}>
                                    Start Date (startdate):
                                </Text>
                                <Input
                                    size="xs"
                                    h="28px"
                                    type="date"
                                    borderRadius="md"
                                    bg={isDark ? "gray.800" : "white"}
                                    value={fetchStartDate}
                                    onChange={(e) => setFetchStartDate(e.target.value)}
                                />
                            </Box>
                            <Box minW="130px" flex={1}>
                                <Text fontSize="10px" color={isDark ? "gray.300" : "gray.600"} mb={0.5} fontWeight={600}>
                                    End Date (enddate):
                                </Text>
                                <Input
                                    size="xs"
                                    h="28px"
                                    type="date"
                                    borderRadius="md"
                                    bg={isDark ? "gray.800" : "white"}
                                    value={fetchEndDate}
                                    onChange={(e) => setFetchEndDate(e.target.value)}
                                />
                            </Box>
                            <Button
                                size="xs"
                                h="28px"
                                colorScheme="blue"
                                isLoading={syncing || loading}
                                loadingText="Fetching..."
                                leftIcon={<Icon as={FiRefreshCw} />}
                                onClick={() => loadOrdersForRange(fetchStartDate, fetchEndDate, true)}
                                px={3}
                            >
                                Fetch Range
                            </Button>
                        </HStack>
                    </Box>
                </Collapse>
            </Box>

            {/* If an order is already linked */}
            {selectedSapOrder ? (
                <Box
                    p={3}
                    borderRadius="md"
                    bg={isDark ? "whiteAlpha.100" : "white"}
                    border="1px solid"
                    borderColor={isDark ? "whiteAlpha.200" : "gray.200"}
                    overflow="hidden"
                >
                    {/* Top Header Row: PO # and Unlink action */}
                    <Flex w="100%" justifyContent="space-between" alignItems="center" mb={2.5} flexWrap="wrap" gap={2}>
                        <HStack spacing={2} align="center" flexWrap="wrap">
                            <Icon as={HiOutlineDocumentReport} color="teal.400" boxSize={4.5} flexShrink={0} />
                            <Text fontWeight={700} fontSize="md" whiteSpace="nowrap">
                                PO #{selectedSapOrder.orderNumber}
                            </Text>
                            {linkedGroupedOrder?.orderType && (
                                <Badge colorScheme="blue" variant="subtle" fontSize="xs" px={1.5}>
                                    {linkedGroupedOrder.orderType}
                                </Badge>
                            )}
                            {linkedGroupedOrder && linkedGroupedOrder.items.length > 1 && (
                                <Badge colorScheme="purple" variant="solid" fontSize="2xs" px={2} py={0.5} borderRadius="full" whiteSpace="nowrap">
                                    {linkedGroupedOrder.items.length} PARTS (FAMILY MOLD)
                                </Badge>
                            )}
                            {(() => {
                                const eDate = selectedSapOrder.endDate || linkedGroupedOrder?.endDate;
                                const formattedEnd = formatSapDueDate(eDate);
                                if (!formattedEnd) return null;
                                return (
                                    <Badge
                                        colorScheme="blue"
                                        variant="subtle"
                                        fontSize="xs"
                                        px={1.5}
                                    >
                                        Due: {formattedEnd}
                                    </Badge>
                                );
                            })()}
                        </HStack>
                        <HStack spacing={1.5} ml="auto">
                            <Button
                                size="xs"
                                h="24px"
                                fontSize="xs"
                                colorScheme="gray"
                                variant="ghost"
                                onClick={() => {
                                    setActiveGroupedOrder(null);
                                    onClear();
                                }}
                            >
                                Change PO
                            </Button>
                            <Button
                                size="xs"
                                h="24px"
                                fontSize="xs"
                                colorScheme="red"
                                variant="outline"
                                leftIcon={<Icon as={FiX} />}
                                onClick={() => {
                                    setActiveGroupedOrder(null);
                                    onClear();
                                }}
                            >
                                Unlink SAP
                            </Button>
                        </HStack>
                    </Flex>

                    {/* Active Selected Part Details Box */}
                    <Box
                        p={2.5}
                        borderRadius="md"
                        bg={isDark ? "whiteAlpha.100" : "teal.50"}
                        border="1px solid"
                        borderColor={isDark ? "teal.600" : "teal.200"}
                        mb={linkedGroupedOrder && linkedGroupedOrder.items.length > 1 ? 2.5 : 1.5}
                    >
                        <Flex justify="space-between" align="flex-start" gap={2} mb={1}>
                            <VStack align="start" spacing={0.5} flex={1}>
                                <Text fontSize="xs" color={isDark ? "teal.300" : "teal.700"} fontWeight={700} textTransform="uppercase" letterSpacing="0.6px">
                                    Selected Running Part
                                </Text>
                                <Text fontWeight={700} fontSize="md" color={isDark ? "white" : "gray.800"}>
                                    {selectedSapOrder.materialDesc}
                                </Text>
                            </VStack>
                            <Badge colorScheme="teal" variant="solid" fontSize="xs" px={2.5} py={0.5} borderRadius="full" whiteSpace="nowrap">
                                ACTIVE RUN
                            </Badge>
                        </Flex>
                        <HStack spacing={4} flexWrap="wrap" color={isDark ? "gray.200" : "gray.700"} fontSize="sm" mt={1.5}>
                            <Text>
                                Part No: <strong style={{ letterSpacing: "0.5px" }}>{selectedSapOrder.materialNumber}</strong>
                            </Text>
                            <Text>
                                SAP Target:{" "}
                                <strong>
                                    <MinifiedNumberFormatter number={selectedSapOrder.target} suffix=" pcs" />
                                </strong>
                            </Text>
                            <Text>
                                SAP Confirmed:{" "}
                                <strong>
                                    <MinifiedNumberFormatter number={selectedSapOrder.confirmed} suffix=" pcs" />
                                </strong>
                            </Text>
                        </HStack>
                    </Box>

                    {/* Multi-Material Part Switcher (If Order has Multiple Items) */}
                    {linkedGroupedOrder && linkedGroupedOrder.items.length > 1 && (
                        <Box
                            p={2.5}
                            borderRadius="md"
                            bg={isDark ? "blackAlpha.400" : "blue.50"}
                            border="1px dashed"
                            borderColor={isDark ? "blue.400" : "blue.300"}
                            mb={2}
                        >
                            <Flex justify="space-between" align="center" mb={2} flexWrap="wrap" gap={2}>
                                <HStack spacing={2} align="center" flexWrap="wrap">
                                    <Icon as={FiLayers} color="blue.400" boxSize={4} flexShrink={0} />
                                    <Text fontSize="sm" fontWeight={700} color={isDark ? "blue.300" : "blue.700"} whiteSpace="nowrap">
                                        Select Part to Run
                                    </Text>
                                    <Text fontSize="xs" color={isDark ? "gray.400" : "gray.600"} whiteSpace="nowrap">
                                        (Family Mold: {linkedGroupedOrder.items.length} Discrete Parts)
                                    </Text>
                                </HStack>
                                <Badge colorScheme="blue" fontSize="2xs" px={2} py={0.5} borderRadius="full" whiteSpace="nowrap" ml="auto">
                                    Click Part to Switch
                                </Badge>
                            </Flex>
                            <RadioGroup
                                value={String(currentPartIndex >= 0 ? currentPartIndex : 0)}
                                onChange={(val) => {
                                    const idx = parseInt(val, 10);
                                    const item = linkedGroupedOrder.items[idx];
                                    if (item) {
                                        applySelection(linkedGroupedOrder, item);
                                    }
                                }}
                            >
                                <Stack spacing={2}>
                                    {linkedGroupedOrder.items.map((item: SapOrderItem, idx: number) => {
                                        const isPartSelected = item.materialNumber === selectedSapOrder.materialNumber;
                                        return (
                                            <Box
                                                key={item.materialNumber}
                                                p={2.5}
                                                borderRadius="md"
                                                border="1px solid"
                                                borderColor={
                                                    isPartSelected
                                                        ? isDark
                                                            ? "teal.400"
                                                               : "teal.500"
                                                        : isDark
                                                        ? "whiteAlpha.200"
                                                        : "gray.200"
                                                }
                                                bg={
                                                    isPartSelected
                                                        ? isDark
                                                            ? "teal.950"
                                                            : "teal.50"
                                                        : isDark
                                                        ? "whiteAlpha.50"
                                                        : "white"
                                                }
                                                cursor="pointer"
                                                onClick={() => {
                                                    applySelection(linkedGroupedOrder, item);
                                                }}
                                                _hover={{
                                                    borderColor: isDark ? "teal.300" : "teal.400",
                                                    shadow: "sm",
                                                }}
                                                transition="all 0.15s"
                                            >
                                                <Radio
                                                    value={String(idx)}
                                                    colorScheme="teal"
                                                    size="md"
                                                    isChecked={isPartSelected}
                                                >
                                                    <VStack align="start" spacing={1} ml={1}>
                                                        <HStack spacing={2} wrap="wrap">
                                                            <Text fontWeight={700} fontSize="sm">
                                                                Part {idx + 1}: {item.materialDescription}
                                                            </Text>
                                                            {isPartSelected && (
                                                                <Badge colorScheme="teal" fontSize="xs" px={2} py={0.5}>
                                                                    SELECTED
                                                                </Badge>
                                                            )}
                                                        </HStack>
                                                        <HStack
                                                            spacing={4}
                                                            fontSize="sm"
                                                            color={isDark ? "gray.200" : "gray.600"}
                                                            flexWrap="wrap"
                                                        >
                                                            <Text>
                                                                Part #: <strong>{item.materialNumber}</strong>
                                                            </Text>
                                                            <Text>
                                                                Target:{" "}
                                                                <strong>
                                                                    <MinifiedNumberFormatter
                                                                        number={item.targetQuantity}
                                                                        suffix=" pcs"
                                                                    />
                                                                </strong>
                                                            </Text>
                                                            <Text>
                                                                Confirmed:{" "}
                                                                <strong>
                                                                    <MinifiedNumberFormatter
                                                                        number={item.actualQuantity ?? (item as any)?.confirmedQuantity ?? (item as any)?.LMNGA ?? 0}
                                                                        suffix=" pcs"
                                                                    />
                                                                </strong>
                                                            </Text>
                                                        </HStack>
                                                    </VStack>
                                                </Radio>
                                            </Box>
                                        );
                                    })}
                                </Stack>
                            </RadioGroup>
                        </Box>
                    )}

                    <Flex
                        p={2.5}
                        px={3}
                        borderRadius="md"
                        bg={isDark ? "purple.950" : "purple.50"}
                        border="1px solid"
                        borderColor={isDark ? "purple.800" : "purple.200"}
                        align="center"
                        gap={2}
                        mt={2.5}
                    >
                        <Text fontSize="sm" lineHeight="1.5" color={isDark ? "purple.200" : "purple.800"}>
                            <strong>Manual Completion:</strong> SAP targets will not auto-complete upon reaching the piece count. Floor production continues to accumulate until manually completed.
                        </Text>
                    </Flex>
                </Box>
            ) : (
                /* Searchable Selector to pick an order */
                <VStack align="stretch" gap={2}>
                    {loading ? (
                        <HStack py={1} justify="center">
                            <Spinner size="xs" color="blue.500" />
                            <Text fontSize="xs" color="gray.500">
                                Loading SAP orders...
                            </Text>
                        </HStack>
                    ) : (
                        <SearchableSelector
                            placeholder="Select or search SAP Production Order..."
                            options={selectOptions}
                            isClearable
                            onChange={handleOrderPicked}
                            noOptionsMessage={`No SAP orders found for ${dayjs(fetchStartDate).format("DD MMM")} – ${dayjs(fetchEndDate).format("DD MMM YYYY")}. Click 'Sync SAP' or adjust the fetch date range above.`}
                        />
                    )}
                </VStack>
            )}
        </Box>
    );
};

export default SapOrderSelector;
