/**
 * Metric Bar Component
 * Memoized component for rendering performance metric progress bars
 * Prevents re-rendering when parent updates
 */

import React from 'react';
import { VStack, HStack, Box, Text, useColorMode } from '@chakra-ui/react';
import { InfoOutlineIcon } from '@chakra-ui/icons';
import MyTooltip from '../../../../../../Components/micro/MyTooltip';

interface MetricBarProps {
    label: string;
    value: number; // 0-100 percentage for progress bar
    displayValue: string; // Formatted display value (e.g., "85.2%", "±2.34%")
    color: string;
    suffix?: string; // Optional suffix (e.g., "Capacitive", "Inductive")
    tooltip?: React.ReactNode; // Optional tooltip content to display next to label
}

// Generic Metric Bar Component
export const MetricBar = React.memo<MetricBarProps>(({
    label,
    value,
    displayValue,
    color,
    suffix,
    tooltip
}) => {
    const { colorMode } = useColorMode();

    return (
        <VStack spacing={1} align="stretch" w="100%">
            <HStack justify="space-between">
                <HStack spacing={1}>
                    <Text fontSize="xs" opacity={0.7}>{label}</Text>
                    {tooltip && (
                        <MyTooltip label={tooltip}>
                            <InfoOutlineIcon boxSize={3} opacity={0.5} cursor="help" />
                        </MyTooltip>
                    )}
                </HStack>
                <HStack spacing={1}>
                    <Text fontSize="xs" fontWeight={600} color={color}>
                        {displayValue}
                    </Text>
                    {suffix && (
                        <Text fontSize="9px" opacity={0.6}>
                            {suffix}
                        </Text>
                    )}
                </HStack>
            </HStack>

            <Box
                w="100%"
                h="8px"
                bg={colorMode === 'dark' ? 'whiteAlpha.100' : 'gray.100'}
                borderRadius="full"
                overflow="hidden"
            >
                <Box
                    h="100%"
                    w={`${Math.min(Math.max(value, 0), 100)}%`} // Clamp between 0-100
                    bg={color}
                    transition="width 0.3s"
                />
            </Box>
        </VStack>
    );
}, (prevProps, nextProps) => {
    // Only re-render if value changes by more than 0.1% or color/label changes
    return (
        Math.abs(prevProps.value - nextProps.value) < 0.1 &&
        prevProps.color === nextProps.color &&
        prevProps.label === nextProps.label &&
        prevProps.displayValue === nextProps.displayValue &&
        prevProps.suffix === nextProps.suffix &&
        prevProps.tooltip === nextProps.tooltip
    );
});

MetricBar.displayName = 'MetricBar';
