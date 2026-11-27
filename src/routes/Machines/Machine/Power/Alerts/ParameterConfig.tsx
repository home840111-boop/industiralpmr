import React, { useMemo, useCallback, useState, useRef, useEffect } from "react";
import {
    Box,
    HStack,
    VStack,
    Switch,
    NumberInput,
    NumberInputField,
    Select,
    Slider,
    SliderTrack,
    SliderFilledTrack,
    SliderThumb,
    SliderMark,
    Text,
    Badge,
    Grid,
    GridItem,
    useColorMode,
} from "@chakra-ui/react";
import { WarningIcon, InfoIcon } from "@chakra-ui/icons";
import { ThresholdConfig, ParameterMeta } from "./types";
import MyTooltip from "../../../../../Components/micro/MyTooltip";

interface ParameterConfigProps {
    parameter: ParameterMeta;
    config?: ThresholdConfig;
    onChange: (config: Partial<ThresholdConfig>) => void;
}

const ParameterConfig: React.FC<ParameterConfigProps> = React.memo((
    {
        parameter,
        config = {},
        onChange,
    }
) => {
    const enabled = config.enabled ?? (config.min !== undefined || config.max !== undefined);
    const min = config.min;
    const max = config.max;
    const severity = config.severity || "warning";
    const hysteresis = config.hysteresis || parameter.suggestedHysteresis || 2;
    const supportsMin = parameter.supportsMin !== false;
    const supportsMax = parameter.supportsMax !== false;
    const thresholdColumnCount = (supportsMin ? 1 : 0) + (supportsMax ? 1 : 0) + 2;
    const { colorMode } = useColorMode();

    // Local state for inputs to prevent lag
    const [localMin, setLocalMin] = useState<string>(min?.toString() ?? "");
    const [localMax, setLocalMax] = useState<string>(max?.toString() ?? "");
    const debounceTimeout = useRef<NodeJS.Timeout | null>(null);

    // Sync local state when props change (e.g., template change)
    useEffect(() => {
        setLocalMin(min?.toString() ?? "");
        setLocalMax(max?.toString() ?? "");
    }, [min, max]);

    const { border, bgColor } = useMemo(() => {
        return {
            border: `${colorMode}.border`,
            bgColor: `${colorMode}.bg`,
        };
    }, [colorMode]);

    // Debounced number input change
    const handleNumberChange = useCallback(
        (field: "min" | "max", value: string) => {
            if (field === "min") setLocalMin(value);
            if (field === "max") setLocalMax(value);

            if (debounceTimeout.current) {
                clearTimeout(debounceTimeout.current);
            }

            debounceTimeout.current = setTimeout(() => {
                const numValue = parseFloat(value);
                onChange({ [field]: isNaN(numValue) ? undefined : numValue });
            }, 300);
        },
        [onChange]
    );

    // Memoized handlers
    const handleEnabledChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            onChange({ enabled: e.target.checked });
        },
        [onChange]
    );

    const handleSeverityChange = useCallback(
        (e: React.ChangeEvent<HTMLSelectElement>) => {
            onChange({ severity: e.target.value as "warning" | "critical" });
        },
        [onChange]
    );

    const handleHysteresisChange = useCallback(
        (value: number) => {
            onChange({ hysteresis: value });
        },
        [onChange]
    );

    // Validation: at least one limit should be set
    const hasValidThresholds =
        (supportsMin && min !== undefined) ||
        (supportsMax && max !== undefined);

    return (
        <Box
            p={2}
            border="1px dashed"
            borderColor={border}
            borderRadius="5px"
            bg={enabled ? bgColor : undefined}
            opacity={enabled ? 1 : 0.5}
        >
            <Grid templateColumns="auto 1fr" gap={2} alignItems="center">
                {/* Enable/Disable Switch */}
                <GridItem>
                    <Switch
                        isChecked={enabled}
                        onChange={handleEnabledChange}
                        colorScheme="orange"
                    />
                </GridItem>

                {/* Parameter Label */}
                <GridItem>
                    <VStack align="start" spacing={0}>
                        <Text fontSize="sm" fontWeight="600">{parameter.label}</Text>
                        {parameter.unit && (
                            <Text fontSize="xs" color="gray.500">
                                {parameter.unit}
                            </Text>
                        )}
                    </VStack>
                </GridItem>

                {/* Min Threshold */}
                <GridItem colSpan={2}>
                    <Grid templateColumns={`repeat(${thresholdColumnCount}, 1fr)`} gap={2}>
                        {supportsMin && (
                            <GridItem>
                                <VStack align="start" spacing={0.5}>
                                    <Text fontSize="2xs" color="gray.500" textTransform="uppercase">
                                        Min
                                    </Text>
                                    <NumberInput
                                        focusBorderColor={"primary"}
                                        value={localMin}
                                        onChange={(value) => handleNumberChange("min", value)}
                                        isDisabled={!enabled}
                                        size="xs"
                                    >
                                        <NumberInputField placeholder="-" fontSize="xs" />
                                    </NumberInput>
                                </VStack>
                            </GridItem>
                        )}

                        {/* Max Threshold */}
                        {supportsMax && (
                            <GridItem>
                                <VStack align="start" spacing={0.5}>
                                    <Text fontSize="2xs" color="gray.500" textTransform="uppercase">
                                        Max
                                    </Text>
                                    <NumberInput
                                        focusBorderColor={"primary"}
                                        value={localMax}
                                        onChange={(value) => handleNumberChange("max", value)}
                                        isDisabled={!enabled}
                                        size="xs"
                                    >
                                        <NumberInputField placeholder="-" fontSize="xs" />
                                    </NumberInput>
                                </VStack>
                            </GridItem>
                        )}

                        {/* Severity */}
                        <GridItem>
                            <VStack align="start" spacing={0.5}>
                                <Text fontSize="2xs" color="gray.500" textTransform="uppercase">
                                    Severity
                                </Text>
                                <Select
                                    value={severity}
                                    focusBorderColor={"primary"}
                                    onChange={handleSeverityChange}
                                    isDisabled={!enabled}
                                    size="xs"
                                    fontSize="xs"
                                >
                                    <option value="warning">⚠️ Warning</option>
                                    <option value="critical">🔴 Critical</option>
                                </Select>
                            </VStack>
                        </GridItem>

                        {/* Hysteresis */}
                        <GridItem>
                            <VStack align="start" spacing={0.5}>
                                <HStack spacing={1}>
                                    <Text fontSize="2xs" color="gray.500" textTransform="uppercase">
                                        Hysteresis
                                    </Text>
                                    <MyTooltip
                                        label="Prevents alert flickering. Alert will only clear when value returns beyond this percentage of the threshold."
                                        fontSize="xs"
                                    >
                                        <InfoIcon boxSize={2.5} color="gray.400" />
                                    </MyTooltip>
                                </HStack>
                                <Box w="100%" pt={1}>
                                    <Slider
                                        value={hysteresis}
                                        onChange={handleHysteresisChange}
                                        isDisabled={!enabled}
                                        min={0}
                                        max={10}
                                        step={0.5}
                                        colorScheme="orange"
                                        size="sm"
                                    >
                                        <SliderMark value={0} mt={1.5} ml={-1.5} fontSize="2xs">
                                            0%
                                        </SliderMark>
                                        <SliderMark value={5} mt={1.5} ml={-1.5} fontSize="2xs">
                                            5%
                                        </SliderMark>
                                        <SliderMark value={10} mt={1.5} ml={-2} fontSize="2xs">
                                            10%
                                        </SliderMark>
                                        <SliderTrack>
                                            <SliderFilledTrack />
                                        </SliderTrack>
                                        <MyTooltip label={`${hysteresis}%`} fontSize="xs">
                                            <SliderThumb boxSize={3} />
                                        </MyTooltip>
                                    </Slider>
                                </Box>
                            </VStack>
                        </GridItem>
                    </Grid>
                </GridItem>
            </Grid>

            {/* Validation Warning */}
            {enabled && !hasValidThresholds && (
                <Box mt={1.5}>
                    <Badge colorScheme="yellow" fontSize="2xs" display="flex" alignItems="center" gap={1} py={0.5} px={1.5}>
                        <WarningIcon boxSize={2.5} />
                        Set at least one threshold
                    </Badge>
                </Box>
            )}

            {/* Current Range Display */}
            {enabled && hasValidThresholds && (
                <Box mt={1.5}>
                    <Text fontSize="2xs" color="gray.500">
                        Alert triggers when:{" "}
                        {supportsMin && supportsMax && min !== undefined && max !== undefined && (
                            <>
                                value &lt; {min} or value &gt; {max}
                            </>
                        )}
                        {supportsMin && min !== undefined && (!supportsMax || max === undefined) && <>value &lt; {min}</>}
                        {supportsMax && max !== undefined && (!supportsMin || min === undefined) && <>value &gt; {max}</>} {parameter.unit}
                    </Text>
                </Box>
            )}
        </Box>
    );
}, (prevProps, nextProps) => {
    // Custom comparison function for React.memo
    return (
        prevProps.parameter.id === nextProps.parameter.id &&
        prevProps.config?.enabled === nextProps.config?.enabled &&
        prevProps.config?.min === nextProps.config?.min &&
        prevProps.config?.max === nextProps.config?.max &&
        prevProps.config?.severity === nextProps.config?.severity &&
        prevProps.config?.hysteresis === nextProps.config?.hysteresis
    );
});

ParameterConfig.displayName = "ParameterConfig";

export default ParameterConfig;
