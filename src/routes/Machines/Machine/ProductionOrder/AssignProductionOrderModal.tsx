import React, { useState, useEffect, useCallback } from "react";
import {
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
  VStack,
  HStack,
  Box,
  Text,
  Button,
  Input,
  InputGroup,
  InputRightElement,
  IconButton,
  Badge,
  Radio,
  RadioGroup,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Spinner,
  Divider,
  Tag,
  Flex,
  useColorMode,
  useToast,
  Progress,
  Collapse,
} from "@chakra-ui/react";
import MyTooltip from "../../../../Components/micro/MyTooltip";
import {
  FiSearch,
  FiCheckCircle,
  FiLayers,
  FiAlertTriangle,
  FiX,
  FiCalendar,
  FiRefreshCw,
  FiCheck,
} from "react-icons/fi";
import MyModal from "../../../../Components/micro/MyModal";
import Primary from "../../../../Components/Buttons/Primary";
import NumberFormatter from "../../../../Components/micro/NumberFormatter";
import {
  searchProductionOrders,
  saveActiveProductionOrder,
  calculateOrderStatus,
} from "../../../../Services/sap";
import {
  ActiveProductionOrder,
  SapGroupedOrder,
} from "../../../../Services/sap/types";
import dayjs from "../../../../Components/Functions/dayjs";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  machineID: string;
  machineName?: string;
  currentOrder: ActiveProductionOrder | null;
  onOrderAssigned: (order: ActiveProductionOrder) => void;
}



const AssignProductionOrderModal: React.FC<Props> = ({
  isOpen,
  onClose,
  machineID,
  machineName,
  currentOrder,
  onOrderAssigned,
}) => {
  const { colorMode } = useColorMode();
  const toast = useToast();

  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SapGroupedOrder[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [lastFetched, setLastFetched] = useState<number | null>(null);
  const [fromCache, setFromCache] = useState<boolean>(false);

  const [selectedOrder, setSelectedOrder] = useState<SapGroupedOrder | null>(null);
  const [selectedMaterial, setSelectedMaterial] = useState<string>("ALL");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Date Range filter state for SAP API (default: current month)
  const [startDate, setStartDate] = useState(
    dayjs().startOf("month").format("YYYY-MM-DD"),
  );
  const [endDate, setEndDate] = useState(
    dayjs().endOf("month").format("YYYY-MM-DD"),
  );
  const [showDateFilter, setShowDateFilter] = useState(false);

  // Border & subtle text colors
  const borderColor = colorMode === "dark" ? "gray.700" : "gray.200";
  const itemBg = colorMode === "dark" ? "whiteAlpha.50" : "blackAlpha.50";
  const selectedItemBg = colorMode === "dark" ? "whiteAlpha.100" : "orange.50";
  const subTextColor = `${colorMode}.subText`;

  const performSearch = useCallback(
    async (
      queryToSearch: string,
      start: string = startDate,
      end: string = endDate,
      forceRefresh: boolean = false,
    ) => {
      setLoading(true);
      setHasSearched(true);
      try {
        // SAP Fiori format: YYYYMMDD
        const formattedStart = dayjs(start).format("YYYYMMDD");
        const formattedEnd = dayjs(end).format("YYYYMMDD");
        const result = await searchProductionOrders(queryToSearch, formattedStart, formattedEnd, forceRefresh);
        setResults(result.orders);
        setLastFetched(result.lastFetched);
        setFromCache(result.fromCache);
        if (result.orders.length > 0) {
          setSelectedOrder(result.orders[0]);
          setSelectedMaterial("ALL");
        } else {
          setSelectedOrder(null);
        }
        if (forceRefresh) {
          toast({
            title: "SAP Sync Complete",
            description: `Retrieved ${result.orders.length} orders from SAP ERP (Cache updated).`,
            status: "success",
            duration: 2500,
            isClosable: true,
          });
        }
      } catch (err) {
        toast({
          title: "Search Error",
          description: "Failed to connect to SAP ERP service.",
          status: "error",
          duration: 3000,
          isClosable: true,
        });
      } finally {
        setLoading(false);
      }
    },
    [startDate, endDate, toast]
  );

  // Auto-load available orders from RTDB when modal opens
  useEffect(() => {
    if (isOpen) {
      if (currentOrder) {
        setSearchQuery(currentOrder.orderNumber);
        performSearch(currentOrder.orderNumber, startDate, endDate, false);
      } else {
        setSearchQuery("");
        setSelectedOrder(null);
        setSelectedMaterial("ALL");
        performSearch("", startDate, endDate, false);
      }
    }
  }, [isOpen, currentOrder, startDate, endDate, performSearch]);

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    performSearch(searchQuery, startDate, endDate);
  };

  const handleConfirmAssignment = async () => {
    if (!selectedOrder) return;
    setIsSubmitting(true);

    try {
      let target = selectedOrder.totalTarget;
      let actualSap = selectedOrder.totalActual;
      let goodsReceipt = selectedOrder.totalGoodsReceipt;

      if (selectedMaterial !== "ALL") {
        const item = selectedOrder.items.find(
          (i) => i.materialNumber === selectedMaterial,
        );
        if (item) {
          target = item.targetQuantity;
          actualSap = item.actualQuantity;
          goodsReceipt = item.goodsReceiptQuantity;
        }
      }

      const status = calculateOrderStatus(
        actualSap,
        target,
        selectedOrder.endDate,
      );

      const activeOrderPayload: ActiveProductionOrder = {
        orderNumber: selectedOrder.orderNumber,
        orderType: selectedOrder.orderType,
        startDate: selectedOrder.startDate,
        endDate: selectedOrder.endDate,
        selectedMaterialNumber: selectedMaterial,
        assignedAt: Date.now(),
        lastSyncedAt: Date.now(),
        items: selectedOrder.items,
        target,
        actualSap,
        goodsReceipt,
        status,
      };

      await saveActiveProductionOrder(machineID, activeOrderPayload);
      onOrderAssigned(activeOrderPayload);

      toast({
        title: "Production Order Linked",
        description: `Order #${selectedOrder.orderNumber} successfully assigned to ${
          machineName || machineID
        }.`,
        status: "success",
        duration: 3500,
        isClosable: true,
      });

      onClose();
    } catch (err) {
      toast({
        title: "Assignment Failed",
        description: "Could not save production order link.",
        status: "error",
        duration: 3500,
        isClosable: true,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <MyModal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalHeader borderBottom="1px solid" borderColor={borderColor} py={3} px={4}>
        <HStack spacing={2.5}>
          <Box p={1.5} borderRadius="md" bg="orange.400" color="white">
            <FiLayers fontSize="16px" />
          </Box>
          <Box>
            <Text fontSize="sm" fontWeight={600}>
              Assign Production Order
            </Text>
            <Text fontSize="11px" fontWeight={400} color={subTextColor}>
              Search SAP Fiori by Order Number (AUFNR) or Part Description
            </Text>
          </Box>
        </HStack>
      </ModalHeader>
      <ModalCloseButton top={3} right={3} size="sm" />

      <ModalBody py={3} px={4}>
        <VStack spacing={2.5} align="stretch">


          {/* Search Box */}
          <form onSubmit={handleSearchSubmit}>
            <HStack spacing={2}>
              <InputGroup size="xs">
                <Input
                  size="xs"
                  h="30px"
                  borderRadius="md"
                  placeholder="Filter by Order # or Part Description (Leave empty to see all)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  focusBorderColor="primary"
                />
                {searchQuery && (
                  <InputRightElement h="30px">
                    <IconButton
                      aria-label="Clear search"
                      icon={<FiX />}
                      size="xs"
                      variant="ghost"
                      onClick={() => {
                        setSearchQuery("");
                        performSearch("", startDate, endDate);
                      }}
                    />
                  </InputRightElement>
                )}
              </InputGroup>
              <Button
                type="submit"
                size="xs"
                h="30px"
                colorScheme="orange"
                isLoading={loading}
                leftIcon={<FiSearch />}
                px={3.5}
              >
                Lookup
              </Button>
            </HStack>
          </form>

          {/* Date Window Summary & Expandable Selector */}
          <Box>
            <HStack justify="space-between" align="center" fontSize="xs" px={1} wrap="wrap" gap={1.5}>
              <HStack spacing={1.5} color={subTextColor}>
                <FiCalendar fontSize="12px" />
                <Text>SAP Date Window:</Text>
                <Text fontWeight={600} color={colorMode === "dark" ? "orange.300" : "orange.600"}>
                  {dayjs(startDate).format("DD MMM")} &rarr; {dayjs(endDate).format("DD MMM YYYY")}
                </Text>
              </HStack>
              <HStack spacing={2}>
                {lastFetched && (
                  <HStack spacing={1} fontSize="10px" color={subTextColor}>
                    <Box
                      w="6px"
                      h="6px"
                      borderRadius="full"
                      bg={fromCache ? "blue.400" : "green.400"}
                    />
                    <Text>
                      {fromCache ? "Cached" : "Live"}: {dayjs(lastFetched).format("HH:mm:ss")}
                    </Text>
                  </HStack>
                )}
                <MyTooltip label="Fetch fresh orders directly from SAP ERP server and update RTDB cache">
                  <Button
                    size="xs"
                    variant="outline"
                    colorScheme="orange"
                    leftIcon={<FiRefreshCw />}
                    isLoading={loading}
                    onClick={() => performSearch(searchQuery, startDate, endDate, true)}
                    py={1}
                    px={2}
                  >
                    Sync SAP
                  </Button>
                </MyTooltip>
                <Button
                  size="xs"
                  variant="link"
                  colorScheme="orange"
                  onClick={() => setShowDateFilter(!showDateFilter)}
                >
                  {showDateFilter ? "Hide Date Range" : "Adjust Date Range"}
                </Button>
              </HStack>
            </HStack>

            <Collapse in={showDateFilter} animateOpacity>
              <Box
                mt={2}
                p={2.5}
                borderRadius="md"
                border="1px solid"
                borderColor={borderColor}
                bg={itemBg}
              >
                <HStack spacing={1.5} mb={2} wrap="wrap">
                  <Text fontSize="10px" textTransform="uppercase" fontWeight={600} color={subTextColor}>
                    Presets:
                  </Text>
                  <Tag
                    size="sm"
                    cursor="pointer"
                    variant="subtle"
                    onClick={() => {
                      const s = dayjs().startOf("month").format("YYYY-MM-DD");
                      const e = dayjs().endOf("month").format("YYYY-MM-DD");
                      setStartDate(s);
                      setEndDate(e);
                      performSearch(searchQuery, s, e);
                    }}
                  >
                    This Month
                  </Tag>
                  <Tag
                    size="sm"
                    cursor="pointer"
                    variant="subtle"
                    onClick={() => {
                      const s = dayjs().subtract(1, "month").startOf("month").format("YYYY-MM-DD");
                      const e = dayjs().subtract(1, "month").endOf("month").format("YYYY-MM-DD");
                      setStartDate(s);
                      setEndDate(e);
                      performSearch(searchQuery, s, e);
                    }}
                  >
                    Last Month
                  </Tag>
                  <Tag
                    size="sm"
                    cursor="pointer"
                    variant="subtle"
                    onClick={() => {
                      const s = dayjs().subtract(30, "day").format("YYYY-MM-DD");
                      const e = dayjs().format("YYYY-MM-DD");
                      setStartDate(s);
                      setEndDate(e);
                      performSearch(searchQuery, s, e);
                    }}
                  >
                    Last 30 Days
                  </Tag>
                  <Tag
                    size="sm"
                    cursor="pointer"
                    variant="subtle"
                    onClick={() => {
                      const s = dayjs().format("YYYY-MM-DD");
                      const e = dayjs().add(30, "day").format("YYYY-MM-DD");
                      setStartDate(s);
                      setEndDate(e);
                      performSearch(searchQuery, s, e);
                    }}
                  >
                    Next 30 Days
                  </Tag>
                </HStack>

                <HStack spacing={2} align="flex-end">
                  <Box flex={1}>
                    <Text fontSize="10px" color={subTextColor} mb={0.5}>
                      Start Date (startdate):
                    </Text>
                    <Input
                      size="xs"
                      type="date"
                      borderRadius="md"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </Box>
                  <Box flex={1}>
                    <Text fontSize="10px" color={subTextColor} mb={0.5}>
                      End Date (enddate):
                    </Text>
                    <Input
                      size="xs"
                      type="date"
                      borderRadius="md"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </Box>
                  <Button
                    size="xs"
                    colorScheme="orange"
                    onClick={() => performSearch(searchQuery, startDate, endDate)}
                  >
                    Apply
                  </Button>
                </HStack>
              </Box>
            </Collapse>
          </Box>

          {/* Results State */}
          {loading && (
            <Flex py={8} justify="center" align="center" direction="column" gap={3}>
              <Spinner size="md" color="orange.400" />
              <Text fontSize="sm" color={subTextColor}>
                Querying SAP Fiori gateway...
              </Text>
            </Flex>
          )}

          {!loading && hasSearched && results.length === 0 && (
            <Alert status="warning" borderRadius="md">
              <AlertIcon as={FiAlertTriangle} />
              <Box flex={1}>
                <AlertTitle fontSize="sm">Order Not Found in Local Database</AlertTitle>
                <AlertDescription fontSize="xs">
                  No orders matching &ldquo;{searchQuery}&rdquo; were found in RTDB. Click below to query the live SAP ERP gateway.
                </AlertDescription>
                <Button
                  mt={2}
                  size="xs"
                  colorScheme="orange"
                  leftIcon={<FiRefreshCw />}
                  onClick={() => performSearch(searchQuery, startDate, endDate, true)}
                >
                  Sync &amp; Query SAP ERP
                </Button>
              </Box>
            </Alert>
          )}

          {/* Multiple Orders Selector List */}
          {!loading && results.length > 1 && (
            <Box>
              <HStack justify="space-between" mb={1.5} align="center">
                <HStack spacing={1.5}>
                  <Text fontSize="11px" fontWeight={600} textTransform="uppercase" color={subTextColor}>
                    Orders Found in SAP Window:
                  </Text>
                  <Badge colorScheme="orange" variant="subtle" fontSize="10px">
                    {results.length} Orders
                  </Badge>
                </HStack>
                {searchQuery && (
                  <Button
                    size="xs"
                    variant="link"
                    colorScheme="orange"
                    onClick={() => {
                      setSearchQuery("");
                      performSearch("", startDate, endDate);
                    }}
                  >
                    Clear Filter
                  </Button>
                )}
              </HStack>
              <VStack spacing={1.5} align="stretch" maxH="170px" overflowY="auto" pr={1}>
                {results.map((order) => {
                  const isSelected = selectedOrder?.orderNumber === order.orderNumber;
                  const progress =
                    order.totalTarget > 0
                      ? +((order.totalActual / order.totalTarget) * 100).toFixed(1)
                      : 0;
                  return (
                    <Box
                      key={order.orderNumber}
                      p={2}
                      borderRadius="md"
                      border="1px solid"
                      borderColor={isSelected ? "orange.400" : borderColor}
                      bg={isSelected ? selectedItemBg : itemBg}
                      cursor="pointer"
                      onClick={() => {
                        setSelectedOrder(order);
                        setSelectedMaterial("ALL");
                      }}
                      _hover={{ borderColor: "orange.300" }}
                      transition="all 0.15s"
                    >
                      <HStack justify="space-between" align="center">
                        <HStack spacing={2}>
                          {isSelected && (
                            <Box color="orange.400">
                              <FiCheck fontSize="12px" />
                            </Box>
                          )}
                          <Text fontSize="xs" fontWeight={700}>
                            PO #{order.orderNumber}
                          </Text>
                          <Badge
                            size="sm"
                            colorScheme="orange"
                            variant={isSelected ? "solid" : "subtle"}
                            fontSize="9px"
                          >
                            {order.orderType}
                          </Badge>
                          {order.items.length > 1 && (
                            <Badge size="sm" colorScheme="blue" variant="subtle" fontSize="9px">
                              {order.items.length} Parts
                            </Badge>
                          )}
                        </HStack>
                        <HStack spacing={2} fontSize="11px" color={subTextColor}>
                          <Text>
                            Target: <NumberFormatter number={order.totalTarget} />
                          </Text>
                          <Text>•</Text>
                          <Text>
                            Actual: <NumberFormatter number={order.totalActual} /> ({progress}%)
                          </Text>
                        </HStack>
                      </HStack>
                      <Text fontSize="11px" color={subTextColor} noOfLines={1} mt={0.5}>
                        {order.items.map((i) => i.materialDescription).join(" • ")}
                      </Text>
                    </Box>
                  );
                })}
              </VStack>
            </Box>
          )}

          {/* Order Details Preview Card */}
          {!loading && selectedOrder && (
            <Box
              border="1px solid"
              borderColor={borderColor}
              borderRadius="md"
              p={3}
              bg={itemBg}
            >
              <HStack justify="space-between" mb={1.5}>
                <HStack spacing={2}>
                  <Text fontSize="sm" fontWeight={700}>
                    PO #{selectedOrder.orderNumber}
                  </Text>
                  <Badge colorScheme="orange" variant="subtle" fontSize="2xs">
                    {selectedOrder.orderType}
                  </Badge>
                </HStack>
                <HStack fontSize="2xs" color={subTextColor} spacing={2.5}>
                  <Text>
                    Start: {dayjs(selectedOrder.startDate).format("DD MMM YYYY")}
                  </Text>
                  <Text>•</Text>
                  <Text>
                    Due: {dayjs(selectedOrder.endDate).format("DD MMM YYYY")}
                  </Text>
                </HStack>
              </HStack>

              <Divider my={2} borderColor={borderColor} />

              {/* Multi-material selector or single item display */}
              {selectedOrder.items.length > 1 ? (
                <Box mb={3}>
                  <HStack justify="space-between" mb={2}>
                    <Text fontSize="xs" fontWeight={600} textTransform="uppercase" color={subTextColor}>
                      Multiple Materials in Order ({selectedOrder.items.length} Parts):
                    </Text>
                    <Badge colorScheme="blue" fontSize="10px">
                      Select Running Material
                    </Badge>
                  </HStack>
                  <RadioGroup
                    value={selectedMaterial}
                    onChange={(val) => setSelectedMaterial(val)}
                  >
                    <VStack align="stretch" spacing={2}>
                      <Box
                        p={2}
                        borderRadius="md"
                        border="1px solid"
                        borderColor={
                          selectedMaterial === "ALL" ? "orange.400" : borderColor
                        }
                        bg={selectedMaterial === "ALL" ? selectedItemBg : "transparent"}
                        cursor="pointer"
                        onClick={() => setSelectedMaterial("ALL")}
                      >
                        <Radio size="sm" value="ALL" colorScheme="orange">
                          <HStack justify="space-between" w="100%">
                            <Text fontSize="xs" fontWeight={600}>
                              All Materials Combined (Order Aggregate)
                            </Text>
                            <Text fontSize="11px" color={subTextColor}>
                              Target: {selectedOrder.totalTarget} pcs | Actual:{" "}
                              {selectedOrder.totalActual} pcs
                            </Text>
                          </HStack>
                        </Radio>
                      </Box>

                      {selectedOrder.items.map((item) => (
                        <Box
                          key={item.materialNumber}
                          p={2}
                          borderRadius="md"
                          border="1px solid"
                          borderColor={
                            selectedMaterial === item.materialNumber
                              ? "orange.400"
                              : borderColor
                          }
                          bg={
                            selectedMaterial === item.materialNumber
                              ? selectedItemBg
                              : "transparent"
                          }
                          cursor="pointer"
                          onClick={() => setSelectedMaterial(item.materialNumber)}
                        >
                          <Radio size="sm" value={item.materialNumber} colorScheme="orange">
                            <Box ml={1}>
                              <Text fontSize="xs" fontWeight={600}>
                                {item.materialDescription}
                              </Text>
                              <HStack spacing={2.5} mt={0.5} fontSize="11px" color={subTextColor}>
                                <Text>Part #{item.materialNumber.replace(/^0+/, "")}</Text>
                                <Text>•</Text>
                                <Text>
                                  Target:{" "}
                                  <NumberFormatter number={item.targetQuantity} />
                                </Text>
                                <Text>•</Text>
                                <Text>
                                  Actual:{" "}
                                  <NumberFormatter number={item.actualQuantity} /> (
                                  {item.progressPercent}%)
                                </Text>
                              </HStack>
                            </Box>
                          </Radio>
                        </Box>
                      ))}
                    </VStack>
                  </RadioGroup>
                </Box>
              ) : (
                /* Single Material View */
                <Box mb={3}>
                  <Text fontSize="xs" color={subTextColor} textTransform="uppercase" fontWeight={600}>
                    Material / Part:
                  </Text>
                  <Text fontSize="sm" fontWeight={600} mt={0.5}>
                    {selectedOrder.items[0]?.materialDescription}
                  </Text>
                  <Text fontSize="xs" color={subTextColor} mt={0.5}>
                    Part #{selectedOrder.items[0]?.materialNumber.replace(/^0+/, "")}
                  </Text>
                </Box>
              )}

              {/* Target vs Actual Summary Bar */}
              {(() => {
                const target =
                  selectedMaterial === "ALL"
                    ? selectedOrder.totalTarget
                    : selectedOrder.items.find(
                        (i) => i.materialNumber === selectedMaterial,
                      )?.targetQuantity || 0;
                const actual =
                  selectedMaterial === "ALL"
                    ? selectedOrder.totalActual
                    : selectedOrder.items.find(
                        (i) => i.materialNumber === selectedMaterial,
                      )?.actualQuantity || 0;
                const pct = target > 0 ? +((actual / target) * 100).toFixed(1) : 0;

                return (
                  <Box
                    p={2.5}
                    borderRadius="md"
                    border="1px solid"
                    borderColor={borderColor}
                    bg={colorMode === "dark" ? "blackAlpha.300" : "white"}
                  >
                    <HStack justify="space-between" mb={1.5}>
                      <Text fontSize="xs" fontWeight={600} color={subTextColor}>
                        Target vs Actual Yield
                      </Text>
                      <Badge
                        colorScheme={
                          pct >= 100 ? "green" : pct >= 75 ? "orange" : "blue"
                        }
                        fontSize="2xs"
                      >
                        {pct}% Complete
                      </Badge>
                    </HStack>
                    <Progress
                      value={Math.min(100, pct)}
                      size="xs"
                      borderRadius="full"
                      colorScheme={
                        pct >= 100 ? "green" : pct >= 75 ? "orange" : "blue"
                      }
                      mb={2}
                    />
                    <HStack justify="space-between" fontSize="xs">
                      <Box>
                        <Text color={subTextColor} fontSize="2xs">Target (PSMNG)</Text>
                        <Text fontWeight={700} fontSize="xs">
                          <NumberFormatter number={target} /> pcs
                        </Text>
                      </Box>
                      <Box textAlign="center">
                        <Text color={subTextColor} fontSize="2xs">Actual Confirmed (LMNGA)</Text>
                        <Text fontWeight={700} color="green.500" fontSize="xs">
                          <NumberFormatter number={actual} /> pcs
                        </Text>
                      </Box>
                      <Box textAlign="right">
                        <Text color={subTextColor} fontSize="2xs">Remaining</Text>
                        <Text fontWeight={700} fontSize="xs">
                          <NumberFormatter number={Math.max(0, target - actual)} /> pcs
                        </Text>
                      </Box>
                    </HStack>
                  </Box>
                );
              })()}

              {/* Active Order Overwrite Warning */}
              {currentOrder && currentOrder.orderNumber !== selectedOrder.orderNumber && (
                <HStack mt={2.5} p={2} bg="orange.50" color="orange.800" borderRadius="md" spacing={2}>
                  <FiAlertTriangle fontSize="14px" />
                  <Text fontSize="xs">
                    Assigning this order will replace existing active Order #
                    {currentOrder.orderNumber}.
                  </Text>
                </HStack>
              )}
            </Box>
          )}
        </VStack>
      </ModalBody>

      <ModalFooter borderTop="1px solid" borderColor={borderColor} py={2.5} px={4}>
        <HStack spacing={2.5}>
          <Button variant="ghost" onClick={onClose} size="xs" h="30px">
            Cancel
          </Button>
          <Primary
            size="xs"
            h="30px"
            isDisabled={!selectedOrder}
            isLoading={isSubmitting}
            onClick={handleConfirmAssignment}
            leftIcon={<FiCheckCircle />}
          >
            Link Order to Machine
          </Primary>
        </HStack>
      </ModalFooter>
    </MyModal>
  );
};

export default AssignProductionOrderModal;
