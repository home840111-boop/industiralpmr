import { Box, Flex, GridItem, HStack, Progress, SimpleGrid, Text, useColorMode } from "@chakra-ui/react";
import { useMemo } from "react";
import secFormatter from "../../../Components/Functions/formatters/secFormatter";
import MyTooltip from "../../../Components/micro/MyTooltip";
import { TimingBreakdown } from "../../../Services/workSchedule";

const pct = (part: number, whole: number): number =>
  whole > 0 ? +((part / whole) * 100).toFixed(1) : 0;

const compactSec = (rawSec: number): string => {
  const sec = Math.max(0, Math.round(rawSec || 0));
  if (sec < 3600) return secFormatter(sec);
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
};

const TimingSummary = ({
  timing,
  offtimeBasedEfficiency,
}: {
  timing: TimingBreakdown;
  offtimeBasedEfficiency: boolean;
}) => {
  const { colorMode } = useColorMode();
  const { border, subText, text, barTrack } = useMemo(
    () => ({
      border: `${colorMode}.border`,
      subText: `${colorMode}.subText`,
      text: `${colorMode}.text`,
      barTrack: colorMode === "dark" ? "whiteAlpha.200" : "blackAlpha.100",
    }),
    [colorMode],
  );

  const operatingPct = pct(timing.ontime, timing.operatingTime);
  const downPct = pct(timing.unplannedDown, timing.operatingTime);

  const downTooltip = offtimeBasedEfficiency
    ? `Idle: ${secFormatter(timing.unplannedIdle)} · Off: ${secFormatter(timing.unplannedOff)}`
    : `Unplanned Idle: ${secFormatter(timing.unplannedIdle)} (OFF excluded from efficiency)`;

  const segments = [
    { key: "on", label: "ON", value: timing.ontime, color: "green.500" },
    { key: "idle", label: "Unplanned Idle", value: timing.unplannedIdle, color: "orange.400" },
    { key: "off", label: "Unplanned Off", value: timing.unplannedOff, color: "red.500" },
    { key: "planned", label: "Planned", value: timing.plannedTotal, color: "blue.400" },
  ];

  return (
    <GridItem colSpan={{ base: 1, sm: 2 }}>
      <Box borderX="1px solid" borderY="1px dashed" borderColor={border}>
        <Text
          my={1}
          textAlign="center"
          fontSize="xs"
          fontWeight={600}
          opacity={0.8}
          textTransform="uppercase"
        >
          Timing
        </Text>
      </Box>

      <SimpleGrid columns={{ base: 1, sm: 2 }}>
        <Flex
          px={3}
          py={4}
          border="1px solid"
          borderColor={border}
          flexDir="column"
          justifyContent="space-between"
        >
          <Flex w="100%" alignItems="center" justifyContent="space-between">
            <Text fontSize="md" fontWeight={500} opacity={0.8}>
              ON Time
            </Text>
            <Text
              fontSize="sm"
              fontWeight={600}
              color={subText}
              sx={{ fontVariantNumeric: "tabular-nums" }}
            >
              {Math.round(operatingPct)}%
            </Text>
          </Flex>
          <Text
            mt={2}
            fontSize="2xl"
            fontWeight={600}
            sx={{ fontVariantNumeric: "tabular-nums" }}
          >
            {secFormatter(timing.ontime)}
          </Text>
        </Flex>

        <Flex
          px={3}
          py={4}
          border="1px solid"
          borderColor={border}
          flexDir="column"
          justifyContent="space-between"
        >
          <Flex w="100%" alignItems="center" justifyContent="space-between">
            <Text fontSize="md" fontWeight={500} opacity={0.8}>
              Unplanned Down
            </Text>
            <Text
              fontSize="sm"
              fontWeight={600}
              color={subText}
              sx={{ fontVariantNumeric: "tabular-nums" }}
            >
              {Math.round(downPct)}%
            </Text>
          </Flex>
          <MyTooltip label={downTooltip}>
            <Text
              mt={2}
              fontSize="2xl"
              fontWeight={600}
              sx={{ fontVariantNumeric: "tabular-nums" }}
              cursor="help"
            >
              {secFormatter(timing.unplannedDown)}
            </Text>
          </MyTooltip>
        </Flex>
      </SimpleGrid>

      <Box px={3} py={3} borderX="1px solid" borderColor={border}>
        <Flex
          h="5px"
          w="100%"
          borderRadius="2px"
          overflow="hidden"
          bg={barTrack}
          gap="1px"
        >
          {segments
            .filter((s) => s.value > 0)
            .map((s) => {
              const segPct = pct(s.value, timing.totalTime);
              return (
                <MyTooltip
                  key={s.key}
                  label={`${s.label}: ${secFormatter(s.value)} (${segPct}%)`}
                >
                  <Box h="100%" w={`${segPct}%`} bg={s.color} />
                </MyTooltip>
              );
            })}
        </Flex>

        <SimpleGrid columns={{ base: 1, sm: 2 }} spacingX={5} spacingY={1.5} mt={2.5}>
          {segments.map((s) => {
            const segPct = pct(s.value, timing.totalTime);
            return (
              <MyTooltip
                key={s.key}
                label={`${s.label}: ${secFormatter(s.value)} (${segPct}% of ${secFormatter(timing.totalTime)})`}
              >
                <Flex
                  justify="space-between"
                  align="center"
                  fontSize="xs"
                  sx={{ fontVariantNumeric: "tabular-nums" }}
                  cursor="default"
                >
                  <HStack spacing={1.5} minW={0}>
                    <Box w="6px" h="6px" borderRadius="1px" bg={s.color} flexShrink={0} />
                    <Text color={subText} noOfLines={1}>
                      {s.label}
                    </Text>
                  </HStack>
                  <HStack spacing={1.5} flexShrink={0}>
                    <Text fontWeight={600} color={text}>
                      {compactSec(s.value)}
                    </Text>
                    <Text color={subText} w="34px" textAlign="right">
                      {Math.round(segPct)}%
                    </Text>
                  </HStack>
                </Flex>
              </MyTooltip>
            );
          })}
        </SimpleGrid>
      </Box>

      <Flex
        borderTop="1px dashed"
        borderX="1px solid"
        borderBottom="1px solid"
        borderColor={border}
        w="100%"
        alignItems="center"
        justifyContent="space-between"
        gap={3}
        py={3}
        px={3}
      >
        <Text fontSize="xs" fontWeight={500} flexShrink={0}>
          Efficiency:
        </Text>
        <Progress
          flex={1}
          borderRightRadius="full"
          colorScheme={
            timing.efficiency >= 75
              ? "green"
              : timing.efficiency >= 50
                ? "orange"
                : "red"
          }
          h="10px"
          value={timing.efficiency}
        />
        <Text
          fontSize="sm"
          fontWeight={600}
          flexShrink={0}
          sx={{ fontVariantNumeric: "tabular-nums" }}
        >
          {timing.efficiency.toFixed(0)}%
        </Text>
      </Flex>
    </GridItem>
  );
};

export default TimingSummary;
