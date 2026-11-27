import React, { useState, useEffect, useMemo } from "react";
import {
  Box,
  Flex,
  HStack,
  VStack,
  Text,
  Badge,
  Button,
  IconButton,
  Progress,
  SimpleGrid,
  useColorMode,
  useToast,
  Tag,
  TagLabel,
  CardHeader,
  CardBody,
  Collapse,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
} from "@chakra-ui/react";
import MyTooltip from "../../../../Components/micro/MyTooltip";
import {
  FiLayers,
  FiRefreshCw,
  FiEdit2,
  FiTrash2,
  FiCheckCircle,
  FiAlertTriangle,
  FiClock,
  FiChevronDown,
  FiChevronUp,
  FiPlus,
  FiPackage,
  FiTrendingUp,
} from "react-icons/fi";
import MyCard from "../../../../Components/micro/Card";
import NumberFormatter from "../../../../Components/micro/NumberFormatter";
import dayjs from "../../../../Components/Functions/dayjs";
import {
  fetchActiveProductionOrder,
  removeActiveProductionOrder,
  saveActiveProductionOrder,
  syncProductionOrder,
} from "../../../../Services/sap";
import { ActiveProductionOrder, OrderProgressStatus } from "../../../../Services/sap/types";
import AssignProductionOrderModal from "./AssignProductionOrderModal";

interface Props {
  machineID: string;
  machineName?: string;
  machineStatus?: string;
  liveMachineProduction?: number;
  liveMachineShots?: number;
}

const getStatusBadgeConfig = (
  status: OrderProgressStatus,
  pct: number,
  isOverdue: boolean,
) => {
  if (isOverdue && pct < 100) {
    return { label: "OVERDUE", colorScheme: "red", icon: FiAlertTriangle };
  }
  switch (status) {
    case "OVERPRODUCED":
      return { label: "OVERPRODUCED", colorScheme: "purple", icon: FiTrendingUp };
    case "COMPLETED":
      return { label: "COMPLETED", colorScheme: "green", icon: FiCheckCircle };
    case "NEAR_COMPLETION":
      return { label: "NEAR COMPLETION", colorScheme: "teal", icon: FiCheckCircle };
    case "ON_TRACK":
      return { label: "IN PROGRESS", colorScheme: "blue", icon: FiClock };
    case "NEW":
    default:
      return { label: "NOT STARTED", colorScheme: "gray", icon: FiClock };
  }
};

const ProductionOrderCard: React.FC<Props> = ({
  machineID,
  machineName,
  machineStatus,
  liveMachineProduction,
  liveMachineShots,
}) => {
  const { colorMode } = useColorMode();
  const toast = useToast();

  const [activeOrder, setActiveOrder] = useState<ActiveProductionOrder | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showMultiItems, setShowMultiItems] = useState(false);

  // Theme styling tokens
  const borderColor = colorMode === "dark" ? "gray.700" : "gray.200";
  const subTextColor = `${colorMode}.subText`;
  const statBoxBg = colorMode === "dark" ? "whiteAlpha.50" : "blackAlpha.50";
  const isInProduction = machineStatus === "ON";

  // Load active order on mount or machineID change
  useEffect(() => {
    let isMounted = true;

    fetchActiveProductionOrder(machineID)
      .then((order) => {
        if (isMounted) {
          setActiveOrder(order);
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [machineID]);

  // Handle manual sync from SAP
  const handleSync = async () => {
    if (!activeOrder) return;
    setIsSyncing(true);

    try {
      const updated = await syncProductionOrder(activeOrder, true);
      await saveActiveProductionOrder(machineID, updated);
      setActiveOrder(updated);
      toast({
        title: "SAP Sync Successful",
        description: `Refreshed confirmed yield for Order #${activeOrder.orderNumber} (${updated.actualSap} / ${updated.target} pcs).`,
        status: "success",
        duration: 2500,
        isClosable: true,
      });
    } catch (e) {
      toast({
        title: "Sync Failed",
        description: "Could not retrieve updated yield from SAP.",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsSyncing(false);
    }
  };

  // Handle unlinking order
  const handleUnlink = async () => {
    if (!window.confirm("Are you sure you want to unlink this production order from the machine?")) {
      return;
    }

    try {
      await removeActiveProductionOrder(machineID);
      setActiveOrder(null);
      toast({
        title: "Order Unlinked",
        description: "The machine has no active production order.",
        status: "info",
        duration: 2500,
        isClosable: true,
      });
    } catch (e) {
      toast({
        title: "Error",
        description: "Could not unlink production order.",
        status: "error",
        duration: 2500,
        isClosable: true,
      });
    }
  };

  // Calculations
  const {
    percentComplete,
    remainingQty,
    isOverdue,
    activeMaterialItem,
    hasMultipleMaterials,
  } = useMemo(() => {
    if (!activeOrder) {
      return {
        percentComplete: 0,
        remainingQty: 0,
        isOverdue: false,
        activeMaterialItem: null,
        hasMultipleMaterials: false,
      };
    }

    const pct =
      activeOrder.target > 0
        ? +((activeOrder.actualSap / activeOrder.target) * 100).toFixed(1)
        : 0;
    const remaining = Math.max(0, activeOrder.target - activeOrder.actualSap);
    const overdue =
      dayjs().isAfter(dayjs(activeOrder.endDate), "day") &&
      activeOrder.actualSap < activeOrder.target;

    const matchedItem =
      activeOrder.selectedMaterialNumber &&
      activeOrder.selectedMaterialNumber !== "ALL"
        ? activeOrder.items.find(
            (i) => i.materialNumber === activeOrder.selectedMaterialNumber,
          ) || activeOrder.items[0]
        : activeOrder.items[0];

    return {
      percentComplete: pct,
      remainingQty: remaining,
      isOverdue: overdue,
      activeMaterialItem: matchedItem,
      hasMultipleMaterials: activeOrder.items.length > 1,
    };
  }, [activeOrder]);

  const badgeConfig = activeOrder
    ? getStatusBadgeConfig(activeOrder.status, percentComplete, isOverdue)
    : null;

  return (
    <>
      <MyCard noPadding w="100%">
        {/* Card Header */}
        <CardHeader
          py={3.5}
          px={5}
          borderBottom="1px solid"
          borderColor={borderColor}
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          flexWrap="wrap"
          gap={2}
        >
          <HStack spacing={3}>
            <Box p={2} borderRadius="md" bg="orange.400" color="white">
              <FiLayers fontSize="18px" />
            </Box>
            <Box>
              <HStack spacing={2}>
                <Text fontSize="md" fontWeight={600}>
                  Production Order
                </Text>
                {activeOrder && (
                  <Tag size="sm" variant="subtle" colorScheme="orange">
                    <TagLabel fontWeight={700}>
                      PO #{activeOrder.orderNumber}
                    </TagLabel>
                  </Tag>
                )}
                {badgeConfig && (
                  <Badge
                    colorScheme={badgeConfig.colorScheme}
                    variant="solid"
                    borderRadius="full"
                    px={2}
                    py={0.5}
                    fontSize="10px"
                    textTransform="uppercase"
                  >
                    {badgeConfig.label}
                  </Badge>
                )}
              </HStack>
              <Text fontSize="xs" color={subTextColor}>
                SAP Fiori Target & Actual Production Tracking
              </Text>
            </Box>
          </HStack>

          {/* Header Action Controls */}
          <HStack spacing={2}>
            {activeOrder ? (
              <>
                <MyTooltip
                  label={
                    isSyncing
                      ? "Syncing with SAP..."
                      : `Sync with SAP (Last synced ${
                          Math.abs(dayjs().diff(dayjs(activeOrder.lastSyncedAt), "second")) < 45
                            ? "just now"
                            : dayjs(activeOrder.lastSyncedAt).fromNow()
                        })`
                  }
                >
                  <IconButton
                    aria-label="Sync SAP Order"
                    icon={<FiRefreshCw />}
                    size="sm"
                    variant="ghost"
                    isLoading={isSyncing}
                    onClick={handleSync}
                  />
                </MyTooltip>

                <MyTooltip label="Change / Update Order">
                  <Button
                    size="sm"
                    variant="outline"
                    leftIcon={<FiEdit2 />}
                    onClick={() => setIsModalOpen(true)}
                  >
                    Change
                  </Button>
                </MyTooltip>

                <MyTooltip label="Unlink Order">
                  <IconButton
                    aria-label="Unlink order"
                    icon={<FiTrash2 />}
                    size="sm"
                    variant="ghost"
                    colorScheme="red"
                    onClick={handleUnlink}
                  />
                </MyTooltip>
              </>
            ) : (
              <Button
                size="sm"
                colorScheme="orange"
                leftIcon={<FiPlus />}
                onClick={() => setIsModalOpen(true)}
              >
                Link Production Order
              </Button>
            )}
          </HStack>
        </CardHeader>

        <CardBody p={5}>
          {/* Machine Production Status Notice */}
          {!isInProduction && (
            <HStack
              mb={4}
              p={2.5}
              borderRadius="md"
              bg={colorMode === "dark" ? "whiteAlpha.50" : "orange.50"}
              color={colorMode === "dark" ? "orange.300" : "orange.800"}
              border="1px solid"
              borderColor={colorMode === "dark" ? "orange.800" : "orange.200"}
              fontSize="xs"
              spacing={2}
            >
              <FiAlertTriangle />
              <Text>
                Machine is currently <strong>{machineStatus || "NOT RUNNING"}</strong>.
                Yield updates are paused while the machine is not in production.
              </Text>
            </HStack>
          )}

          {/* EMPTY STATE */}
          {!activeOrder ? (
            <Flex
              direction="column"
              align="center"
              justify="center"
              py={8}
              px={4}
              textAlign="center"
              border="1px dashed"
              borderColor={borderColor}
              borderRadius="lg"
            >
              <Box
                p={4}
                borderRadius="full"
                bg={colorMode === "dark" ? "whiteAlpha.100" : "orange.50"}
                color="orange.400"
                mb={3}
              >
                <FiPackage fontSize="32px" />
              </Box>
              <Text fontSize="md" fontWeight={600} mb={1}>
                No Production Order Linked
              </Text>
              <Text fontSize="sm" color={subTextColor} maxW="480px" mb={4}>
                Link an SAP Production Order (AUFNR) to display target quantity,
                confirmed yield, and real-time completion progress for this machine.
              </Text>
              <Button
                colorScheme="orange"
                size="sm"
                leftIcon={<FiPlus />}
                onClick={() => setIsModalOpen(true)}
              >
                Assign Production Order
              </Button>
            </Flex>
          ) : (
            /* ACTIVE PRODUCTION ORDER STATE */
            <VStack spacing={4} align="stretch">
              {/* Part Description & Dates Banner */}
              <Flex
                justify="space-between"
                align={{ base: "flex-start", sm: "center" }}
                direction={{ base: "column", sm: "row" }}
                p={3.5}
                borderRadius="md"
                bg={statBoxBg}
                border="1px solid"
                borderColor={borderColor}
                gap={2}
              >
                <Box>
                  <Text
                    fontSize="xs"
                    fontWeight={600}
                    textTransform="uppercase"
                    color={subTextColor}
                  >
                    Active Material / Part
                  </Text>
                  <Text fontSize="sm" fontWeight={700} mt={0.5}>
                    {activeMaterialItem?.materialDescription ||
                      "Multi-Material Production Order"}
                  </Text>
                  <HStack fontSize="xs" color={subTextColor} mt={0.5} spacing={2}>
                    <Text>
                      Part #
                      {activeMaterialItem?.materialNumber.replace(/^0+/, "") || "N/A"}
                    </Text>
                    <Text>•</Text>
                    <Text>Type: {activeOrder.orderType}</Text>
                    {hasMultipleMaterials && (
                      <>
                        <Text>•</Text>
                        <Badge colorScheme="purple" fontSize="10px">
                          {activeOrder.items.length} Parts in Order
                        </Badge>
                      </>
                    )}
                  </HStack>
                </Box>

                <Box textAlign={{ base: "left", sm: "right" }}>
                  <Text
                    fontSize="xs"
                    fontWeight={600}
                    textTransform="uppercase"
                    color={subTextColor}
                  >
                    Production Window
                  </Text>
                  <Text fontSize="xs" fontWeight={600} mt={0.5}>
                    {dayjs(activeOrder.startDate).format("DD MMM YYYY")} &rarr;{" "}
                    {dayjs(activeOrder.endDate).format("DD MMM YYYY")}
                  </Text>
                  {isOverdue && (
                    <Text fontSize="11px" color="red.500" fontWeight={600} mt={0.5}>
                      Due Date Missed
                    </Text>
                  )}
                </Box>
              </Flex>

              {/* Progress Bar & Percentage Gauge */}
              <Box>
                <HStack justify="space-between" mb={1.5}>
                  <HStack spacing={2}>
                    <Text fontSize="xs" fontWeight={600} color={subTextColor} textTransform="uppercase">
                      Actually Made:
                    </Text>
                    <Text fontSize="xs" fontWeight={700}>
                      {activeOrder.actualSap.toLocaleString()} of {activeOrder.target.toLocaleString()} pcs
                    </Text>
                    {percentComplete > 100 && (
                      <Badge colorScheme="purple" fontSize="10px">
                        +{+(percentComplete - 100).toFixed(1)}% Excess
                      </Badge>
                    )}
                  </HStack>
                  <Text fontSize="sm" fontWeight={700}>
                    {percentComplete}% of Target
                  </Text>
                </HStack>
                <Progress
                  value={Math.min(100, percentComplete)}
                  size="sm"
                  borderRadius="full"
                  colorScheme={
                    isOverdue
                      ? "red"
                      : percentComplete >= 100
                      ? "purple"
                      : percentComplete >= 85
                      ? "green"
                      : "blue"
                  }
                  hasStripe={isInProduction}
                  isAnimated={isInProduction}
                />
              </Box>

              {/* Machine iPMR Sensor Telemetry Context Bar */}
              {liveMachineProduction !== undefined && (
                <Flex
                  px={3}
                  py={1.5}
                  borderRadius="md"
                  bg={colorMode === "dark" ? "whiteAlpha.100" : "blue.50"}
                  border="1px solid"
                  borderColor={colorMode === "dark" ? "whiteAlpha.200" : "blue.200"}
                  justify="space-between"
                  align="center"
                  fontSize="xs"
                  wrap="wrap"
                  gap={1}
                >
                  <HStack spacing={2}>
                    <Badge colorScheme="blue" variant="solid" fontSize="10px">
                      MACHINE SENSOR (TODAY)
                    </Badge>
                    <Text fontWeight={600}>
                      Counted by iPMR Hardware: <strong>{liveMachineProduction.toLocaleString()} pcs</strong>
                      {liveMachineShots ? ` (${liveMachineShots.toLocaleString()} shots)` : ""}
                    </Text>
                  </HStack>
                  <Text color={subTextColor} fontSize="11px">
                    SAP ERP Confirmed: {activeOrder.actualSap.toLocaleString()} pcs
                  </Text>
                </Flex>
              )}

              {/* Target & Actual KPI Cards */}
              <SimpleGrid columns={{ base: 1, sm: 2, md: 4 }} spacing={3}>
                {/* 1. Target */}
                <Box
                  p={3}
                  borderRadius="md"
                  bg={statBoxBg}
                  border="1px solid"
                  borderColor={borderColor}
                >
                  <MyTooltip label="SAP Field PSMNG: Total planned production order quantity">
                    <Text fontSize="xs" fontWeight={600} color={subTextColor} textTransform="uppercase">
                      Target (PSMNG)
                    </Text>
                  </MyTooltip>
                  <Text fontSize="xl" fontWeight={700} mt={1}>
                    <NumberFormatter number={activeOrder.target} suffix=" pcs" />
                  </Text>
                  <Text fontSize="11px" color={subTextColor} mt={0.5}>
                    Total order requirement
                  </Text>
                </Box>

                {/* 2. Actual Confirmed (LMNGA) */}
                <Box
                  p={3}
                  borderRadius="md"
                  bg={statBoxBg}
                  border="1px solid"
                  borderColor={borderColor}
                >
                  <HStack justify="space-between">
                    <MyTooltip label="SAP Field LMNGA: Certified good yield produced and officially confirmed in ERP">
                      <Text fontSize="xs" fontWeight={600} color={subTextColor} textTransform="uppercase">
                        Actually Made (LMNGA)
                      </Text>
                    </MyTooltip>
                    <Badge colorScheme="green" fontSize="10px">
                      SAP Confirmed
                    </Badge>
                  </HStack>
                  <Text fontSize="xl" fontWeight={700} color="green.500" mt={1}>
                    <NumberFormatter number={activeOrder.actualSap} suffix=" pcs" />
                  </Text>
                  <Text fontSize="11px" color={subTextColor} mt={0.5}>
                    Official ERP confirmed yield
                  </Text>
                </Box>

                {/* 3. Goods Receipt (WEMNG) */}
                <Box
                  p={3}
                  borderRadius="md"
                  bg={statBoxBg}
                  border="1px solid"
                  borderColor={borderColor}
                >
                  <MyTooltip label="SAP Field WEMNG: Quantity confirmed as received into the storage warehouse">
                    <Text fontSize="xs" fontWeight={600} color={subTextColor} textTransform="uppercase">
                      Goods Receipt (WEMNG)
                    </Text>
                  </MyTooltip>
                  <Text fontSize="xl" fontWeight={700} mt={1}>
                    <NumberFormatter number={activeOrder.goodsReceipt} suffix=" pcs" />
                  </Text>
                  <Text fontSize="11px" color={subTextColor} mt={0.5}>
                    Received in warehouse
                  </Text>
                </Box>

                {/* 4. Variance / Remaining */}
                <Box
                  p={3}
                  borderRadius="md"
                  bg={statBoxBg}
                  border="1px solid"
                  borderColor={borderColor}
                >
                  <Text fontSize="xs" fontWeight={600} color={subTextColor} textTransform="uppercase">
                    {activeOrder.actualSap > activeOrder.target
                      ? "Overproduction"
                      : "Remaining"}
                  </Text>
                  <Text
                    fontSize="xl"
                    fontWeight={700}
                    color={
                      activeOrder.actualSap > activeOrder.target
                        ? "purple.400"
                        : remainingQty === 0
                        ? "green.500"
                        : isOverdue
                        ? "red.500"
                        : "orange.400"
                    }
                    mt={1}
                  >
                    {activeOrder.actualSap > activeOrder.target ? (
                      `+${activeOrder.actualSap - activeOrder.target} pcs`
                    ) : (
                      <NumberFormatter number={remainingQty} suffix=" pcs" />
                    )}
                  </Text>
                  <Text fontSize="11px" color={subTextColor} mt={0.5}>
                    {activeOrder.actualSap >= activeOrder.target
                      ? "Target fulfilled"
                      : `${+(100 - percentComplete).toFixed(1)}% to completion`}
                  </Text>
                </Box>
              </SimpleGrid>

              {/* Multi-material collapsible breakdown table */}
              {hasMultipleMaterials && (
                <Box
                  border="1px solid"
                  borderColor={borderColor}
                  borderRadius="md"
                  overflow="hidden"
                >
                  <Flex
                    justify="space-between"
                    align="center"
                    p={3}
                    bg={statBoxBg}
                    cursor="pointer"
                    onClick={() => setShowMultiItems(!showMultiItems)}
                  >
                    <HStack spacing={2}>
                      <FiPackage fontSize="14px" />
                      <Text fontSize="xs" fontWeight={600}>
                        Detailed Part Breakdown ({activeOrder.items.length} Materials)
                      </Text>
                    </HStack>
                    <HStack spacing={1}>
                      <Text fontSize="xs" color={subTextColor}>
                        {showMultiItems ? "Hide" : "Show"}
                      </Text>
                      {showMultiItems ? <FiChevronUp /> : <FiChevronDown />}
                    </HStack>
                  </Flex>

                  <Collapse in={showMultiItems} animateOpacity>
                    <TableContainer>
                      <Table size="sm" variant="simple">
                        <Thead>
                          <Tr>
                            <Th fontSize="10px">Material</Th>
                            <Th fontSize="10px">Part Number</Th>
                            <Th fontSize="10px" isNumeric>
                              Target
                            </Th>
                            <Th fontSize="10px" isNumeric>
                              Actual
                            </Th>
                            <Th fontSize="10px" isNumeric>
                              Receipt
                            </Th>
                            <Th fontSize="10px" isNumeric>
                              Progress
                            </Th>
                          </Tr>
                        </Thead>
                        <Tbody>
                          {activeOrder.items.map((item) => (
                            <Tr key={item.materialNumber}>
                              <Td fontSize="xs" fontWeight={600}>
                                {item.materialDescription}
                              </Td>
                              <Td fontSize="xs" color={subTextColor}>
                                {item.materialNumber.replace(/^0+/, "")}
                              </Td>
                              <Td fontSize="xs" isNumeric>
                                <NumberFormatter number={item.targetQuantity} />
                              </Td>
                              <Td fontSize="xs" fontWeight={600} color="green.500" isNumeric>
                                <NumberFormatter number={item.actualQuantity} />
                              </Td>
                              <Td fontSize="xs" isNumeric>
                                <NumberFormatter number={item.goodsReceiptQuantity} />
                              </Td>
                              <Td fontSize="xs" isNumeric>
                                <Badge
                                  colorScheme={
                                    item.progressPercent >= 100
                                      ? "green"
                                      : item.progressPercent >= 80
                                      ? "teal"
                                      : "blue"
                                  }
                                >
                                  {item.progressPercent}%
                                </Badge>
                              </Td>
                            </Tr>
                          ))}
                        </Tbody>
                      </Table>
                    </TableContainer>
                  </Collapse>
                </Box>
              )}
            </VStack>
          )}
        </CardBody>
      </MyCard>

      {/* Assignment Modal */}
      <AssignProductionOrderModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        machineID={machineID}
        machineName={machineName}
        currentOrder={activeOrder}
        onOrderAssigned={(newOrder) => setActiveOrder(newOrder)}
      />
    </>
  );
};

export default ProductionOrderCard;
