/**
 * MeterBox Component
 * Memoized component for displaying electrical parameters in a meter-box style
 * Includes value display and capacity bar
 */

import React from 'react';
import { VStack, Box, Text, useColorMode } from '@chakra-ui/react';
import NumberFormatter from '../../../../../../Components/micro/NumberFormatter';

interface MeterBoxProps {
    label: string;
    value: number;
    suffix: string;
    maxValue: number;
    color?: string;
    getColor?: (ratio: number) => string; // Function to calculate color based on ratio
    decimals?: number;
    hideNowValue?: boolean;
}

export const MeterBox = React.memo<MeterBoxProps>(({
    label,
    value,
    suffix,
    maxValue,
    color,
    getColor,
    decimals = 1,
    hideNowValue = false
}) => {
    const { colorMode } = useColorMode();

    // Calculate the ratio and color
    const ratio = maxValue > 0 ? value / maxValue : 0;
    const finalColor = color || (getColor ? getColor(ratio) : '#4299E1');

    return (
        <VStack w="100%" minW={0} alignItems="center" h="100%" spacing={2}>
            <Text fontSize="xs" fontWeight={500}>{label}</Text>

            <Box
                borderRadius={5}
                py={1}
                w="100%"
                overflow="hidden"
                bgColor={colorMode === 'dark' ? 'whiteAlpha.200' : 'gray.200'}
            >
                <Text
                    textAlign="center"
                    fontFamily="Orbitron"
                    fontSize={{ base: "xl", sm: "3xl", md: "4xl" }}
                    fontWeight={600}
                    color={finalColor}
                >
                    {hideNowValue ? "--" : (
                        <NumberFormatter
                            number={Number(value.toFixed(decimals))}
                            suffix={suffix}
                            sideSize="extra-small"
                        />
                    )}
                </Text>
            </Box>

            <Box
                w="100%"
                h="4px"
                bg={colorMode === 'dark' ? 'whiteAlpha.200' : 'gray.200'}
                borderRadius="full"
                overflow="hidden"
            >
                <Box
                    h="100%"
                    w={`${Math.min(ratio * 100, 100)}%`}
                    bg={finalColor}
                    transition="width 0.3s"
                />
            </Box>
        </VStack>
    );
}, (prevProps, nextProps) => {
    // Only re-render if value changes significantly (more than 0.01 for voltage, 0.001 for current/power)
    const threshold = nextProps.decimals === 3 ? 0.001 : nextProps.decimals === 1 ? 0.1 : 0.01;
    return (
        Math.abs(prevProps.value - nextProps.value) < threshold &&
        prevProps.label === nextProps.label &&
        prevProps.maxValue === nextProps.maxValue &&
        prevProps.hideNowValue === nextProps.hideNowValue
    );
});

MeterBox.displayName = 'MeterBox';

// Helper function to get current color based on ratio
export const getCurrentColor = (ratio: number): string => {
    if (ratio > 0.8) return '#F56565'; // Red - High load
    if (ratio > 0.6) return '#ED8936'; // Orange - Medium load
    return '#48BB78'; // Green - Low load
};
