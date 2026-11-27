import React from "react";
import {
  Box,
  Flex,
  HStack,
  VStack,
  Text,
  Badge,
  Button,
  Progress,
  SimpleGrid,
  Icon,
  useColorMode,
} from "@chakra-ui/react";
import { Link } from "react-router-dom";
import { FiTarget, FiArrowRight, FiCheckCircle, FiClock, FiActivity } from "react-icons/fi";
import dayjs from "../../../Components/Functions/dayjs";
import NumberFormatter from "../../../Components/micro/NumberFormatter";
import MyCard from "../../../Components/micro/Card";
import MyTooltip from "../../../Components/micro/MyTooltip";
import type { MachineProductionTarget } from "../types";

interface Props {
  machineID: string;
  machineName?: string;
  target: MachineProductionTarget;
}

const ProductionTargetCard: React.FC<Props> = ({
  machineID,
  machineName,
  target,
}) => {
  const { colorMode } = useColorMode();
  const isDark = colorMode === "dark";

  const percent = target.target > 0
    ? Math.min(100, Math.max(0, (target.current / target.target) * 100))
    : 0;

  const isCompleted = target.target > 0 && target.current >= target.target;
  const remaining = Math.max(0, target.target - target.current);

  const isBehind = target.due
    ? dayjs(target.due).isBefore(dayjs()) && !isCompleted
    : false;

  const borderColor = isDark ? "whiteAlpha.200" : "gray.200";
  const subTextColor = isDark ? "gray.400" : "gray.600";
  const cardBg = isDark ? "gray.800" : "white";

  return (
    <MyCard
      w="100%"
      p={0}
      overflow="hidden"
      border="1px solid"
      borderColor={borderColor}
      boxShadow="sm"
    >
      <Box p={{ base: 4, md: 5 }} bg={cardBg}>
        {/* Header */}
        <Flex
          justify="space-between"
          align={{ base: "flex-start", sm: "center" }}
          direction={{ base: "column", sm: "row" }}
          gap={3}
          mb={4}
        >
          <HStack spacing={3} align="center">
            <Flex
              w={10}
              h={10}
              borderRadius="lg"
              bg={isDark ? "orange.950" : "orange.50"}
              color="orange.400"
              align="center"
              justify="center"
              flexShrink={0}
              border="1px solid"
              borderColor={isDark ? "orange.800" : "orange.200"}
            >
              <Icon as={FiTarget} boxSize={5} />
            </Flex>
            <VStack align="flex-start" spacing={0.5}>
              <HStack spacing={2} flexWrap="wrap">
                <Text fontWeight={700} fontSize={{ base: "md", md: "lg" }}>
                  {target.name || "Active Production Target"}
                </Text>
                {target.sapOrder && (
                  <Badge colorScheme="blue" variant="solid" fontSize="2xs" px={2} py={0.5} borderRadius="sm">
                    SAP PO #{target.sapOrder.orderNumber}
                  </Badge>
                )}
                {isCompleted ? (
                  <Badge colorScheme="green" variant="subtle" fontSize="2xs" px={2} py={0.5} borderRadius="full">
                    <HStack spacing={1}>
                      <Icon as={FiCheckCircle} />
                      <Text>Target Reached</Text>
                    </HStack>
                  </Badge>
                ) : isBehind ? (
                  <Badge colorScheme="red" variant="subtle" fontSize="2xs" px={2} py={0.5} borderRadius="full">
                    Behind Schedule
                  </Badge>
                ) : (
                  <Badge colorScheme="teal" variant="subtle" fontSize="2xs" px={2} py={0.5} borderRadius="full">
                    <HStack spacing={1}>
                      <Icon as={FiActivity} />
                      <Text>In Progress</Text>
                    </HStack>
                  </Badge>
                )}
              </HStack>
              <Text fontSize="xs" color={subTextColor}>
                {machineName ? `${machineName} • ` : ""}Target tracking powered by iPMR live sensor telemetry
              </Text>
            </VStack>
          </HStack>

          <Button
            as={Link}
            to={`/targets/${machineID}`}
            size="sm"
            colorScheme="orange"
            variant="outline"
            rightIcon={<Icon as={FiArrowRight} />}
            fontWeight={600}
            flexShrink={0}
          >
            Manage Target
          </Button>
        </Flex>

        {/* Progress Bar & Percentage */}
        <VStack spacing={2} align="stretch" mb={4}>
          <Flex justify="space-between" align="center" fontSize="xs">
            <HStack spacing={1.5}>
              <Text fontWeight={600}>Target Completion:</Text>
              <Text fontWeight={700} color={isCompleted ? "green.500" : isBehind ? "red.400" : "orange.500"}>
                {percent.toFixed(1)}%
              </Text>
            </HStack>
            {target.due && (
              <HStack spacing={1} color={subTextColor} fontSize="xs">
                <Icon as={FiClock} />
                <MyTooltip label={dayjs(target.due).format("DD MMM YYYY, HH:mm")}>
                  <Text>
                    Due: {dayjs(target.due).format("D MMM, HH:mm")} ({dayjs(target.due).fromNow()})
                  </Text>
                </MyTooltip>
              </HStack>
            )}
          </Flex>
          <Progress
            value={percent}
            size="md"
            borderRadius="full"
            colorScheme={isCompleted ? "green" : isBehind ? "red" : "orange"}
            hasStripe={!isCompleted}
            isAnimated={!isCompleted}
          />
        </VStack>

        {/* Key Metrics Grid */}
        <SimpleGrid columns={{ base: 2, sm: 4 }} gap={3} pt={2} borderTop="1px solid" borderColor={borderColor}>
          <Box p={2.5} borderRadius="md" bg={isDark ? "whiteAlpha.50" : "gray.50"}>
            <Text fontSize="2xs" textTransform="uppercase" fontWeight={600} color={subTextColor}>
              Live iPMR Count
            </Text>
            <Text fontSize={{ base: "md", md: "lg" }} fontWeight={700} color={isCompleted ? "green.400" : undefined}>
              <NumberFormatter number={target.current} suffix=" pcs" />
            </Text>
          </Box>

          <Box p={2.5} borderRadius="md" bg={isDark ? "whiteAlpha.50" : "gray.50"}>
            <Text fontSize="2xs" textTransform="uppercase" fontWeight={600} color={subTextColor}>
              Target Goal
            </Text>
            <Text fontSize={{ base: "md", md: "lg" }} fontWeight={700}>
              <NumberFormatter number={target.target} suffix=" pcs" />
            </Text>
          </Box>

          <Box p={2.5} borderRadius="md" bg={isDark ? "whiteAlpha.50" : "gray.50"}>
            <Text fontSize="2xs" textTransform="uppercase" fontWeight={600} color={subTextColor}>
              Remaining
            </Text>
            <Text fontSize={{ base: "md", md: "lg" }} fontWeight={700} color={remaining === 0 ? "green.500" : undefined}>
              <NumberFormatter number={remaining} suffix=" pcs" />
            </Text>
          </Box>

          <Box p={2.5} borderRadius="md" bg={isDark ? "whiteAlpha.50" : "gray.50"}>
            <Text fontSize="2xs" textTransform="uppercase" fontWeight={600} color={subTextColor}>
              Target Status
            </Text>
            <Text
              fontSize={{ base: "md", md: "lg" }}
              fontWeight={700}
              color={isCompleted ? "green.500" : isBehind ? "red.400" : "teal.500"}
            >
              {isCompleted ? "Reached" : isBehind ? "Behind" : "On Track"}
            </Text>
          </Box>
        </SimpleGrid>

        {/* Optional SAP Part Summary banner if SAP order is linked */}
        {target.sapOrder && (
          <Flex
            mt={3}
            p={2.5}
            borderRadius="md"
            bg={isDark ? "blue.950" : "blue.50"}
            border="1px solid"
            borderColor={isDark ? "blue.900" : "blue.200"}
            justify="space-between"
            align="center"
            fontSize="xs"
            flexWrap="wrap"
            gap={2}
          >
            <HStack spacing={2} minW={0} flex={1}>
              <Text fontWeight={600} color={isDark ? "blue.300" : "blue.700"}>
                SAP Material:
              </Text>
              <Text isTruncated title={target.sapOrder.materialDesc || target.sapOrder.materialNumber}>
                {target.sapOrder.materialDesc || target.sapOrder.materialNumber || "N/A"}
              </Text>
            </HStack>
            {target.sapOrder.confirmed !== undefined && (
              <HStack spacing={1}>
                <Text color={subTextColor}>SAP Confirmed:</Text>
                <Text fontWeight={700}>
                  {target.sapOrder.confirmed} / {target.sapOrder.target || target.target} pcs
                </Text>
              </HStack>
            )}
          </Flex>
        )}
      </Box>
    </MyCard>
  );
};

export default ProductionTargetCard;
