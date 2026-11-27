/**
 * THD Bar Components
 * Memoized components for rendering THD threshold bars
 * These are extracted as separate components to prevent re-rendering when parent updates
 */

import React from 'react';
import { VStack, HStack, Box, Text, useColorMode } from '@chakra-ui/react';
import { getVoltTHDColor, getAmpTHDColor } from '../utils/thdHelpers';

interface THDBarProps {
    thd: number;
    label: string;
}

// Voltage THD Bar Component (0-15% scale)
// Thresholds: Green <5%, Orange 5-8%, Red >8%
export const VoltTHDBar = React.memo<THDBarProps>(({ thd, label }) => {
    const { colorMode } = useColorMode();
    const color = getVoltTHDColor(thd);
    const widthPercent = Math.min((thd / 15) * 100, 100);
    
    return (
        <VStack w="100%" minW={0} spacing={2}>
            <HStack w="100%" justify="space-between" flexWrap="wrap" columnGap={2} rowGap={0}>
                <Text fontSize="xs" opacity={0.8}>{label} THD</Text>
                <Text fontSize="xs" fontWeight={600} color={color}>
                    {thd.toFixed(2)}%
                </Text>
            </HStack>
            
            <Box
                w="100%"
                h="20px"
                position="relative"
                borderRadius="md"
                overflow="hidden"
                bg={colorMode === 'dark' ? 'whiteAlpha.100' : 'gray.100'}
            >
                {/* Color zones background */}
                <HStack spacing={0} h="100%" w="100%" position="absolute">
                    <Box w="33.33%" h="100%" bg="#48BB78" opacity={0.2} />
                    <Box w="20%" h="100%" bg="#ED8936" opacity={0.2} />
                    <Box w="46.67%" h="100%" bg="#F56565" opacity={0.2} />
                </HStack>
                
                {/* Threshold markers at 5% (33.33%) and 8% (53.33%) */}
                <Box
                    position="absolute"
                    left="33.33%"
                    top="0"
                    bottom="0"
                    w="1px"
                    bg={colorMode === 'dark' ? 'whiteAlpha.400' : 'gray.400'}
                />
                <Box
                    position="absolute"
                    left="53.33%"
                    top="0"
                    bottom="0"
                    w="1px"
                    bg={colorMode === 'dark' ? 'whiteAlpha.400' : 'gray.400'}
                />
                
                {/* Value bar */}
                <Box
                    h="100%"
                    w={`${widthPercent}%`}
                    bg={color}
                    transition="width 0.3s"
                    position="relative"
                />
            </Box>
            
            {/* Scale labels */}
            <HStack w="100%" justify="space-between" fontSize="9px" opacity={0.6}>
                <Text>0%</Text>
                <Text>5%</Text>
                <Text>8%</Text>
                <Text>15%</Text>
            </HStack>
        </VStack>
    );
}, (prevProps, nextProps) => {
    // Custom comparison: only re-render if thd value changes significantly (>0.01%)
    return Math.abs(prevProps.thd - nextProps.thd) < 0.01 && prevProps.label === nextProps.label;
});

VoltTHDBar.displayName = 'VoltTHDBar';

// Current THD Bar Component (0-40% scale)
// Thresholds: Green <15%, Orange 15-30%, Red >30%
export const AmpTHDBar = React.memo<THDBarProps>(({ thd, label }) => {
    const { colorMode } = useColorMode();
    const color = getAmpTHDColor(thd);
    const widthPercent = Math.min((thd / 40) * 100, 100);
    
    return (
        <VStack w="100%" minW={0} spacing={2}>
            <HStack w="100%" justify="space-between" flexWrap="wrap" columnGap={2} rowGap={0}>
                <Text fontSize="xs" opacity={0.8}>{label} THD</Text>
                <Text fontSize="xs" fontWeight={600} color={color}>
                    {thd.toFixed(2)}%
                </Text>
            </HStack>
            
            <Box
                w="100%"
                h="20px"
                position="relative"
                borderRadius="md"
                overflow="hidden"
                bg={colorMode === 'dark' ? 'whiteAlpha.100' : 'gray.100'}
            >
                {/* Color zones background */}
                <HStack spacing={0} h="100%" w="100%" position="absolute">
                    <Box w="37.5%" h="100%" bg="#48BB78" opacity={0.2} />
                    <Box w="37.5%" h="100%" bg="#ED8936" opacity={0.2} />
                    <Box w="25%" h="100%" bg="#F56565" opacity={0.2} />
                </HStack>
                
                {/* Threshold markers at 15% (37.5%) and 30% (75%) */}
                <Box
                    position="absolute"
                    left="37.5%"
                    top="0"
                    bottom="0"
                    w="1px"
                    bg={colorMode === 'dark' ? 'whiteAlpha.400' : 'gray.400'}
                />
                <Box
                    position="absolute"
                    left="75%"
                    top="0"
                    bottom="0"
                    w="1px"
                    bg={colorMode === 'dark' ? 'whiteAlpha.400' : 'gray.400'}
                />
                
                {/* Value bar */}
                <Box
                    h="100%"
                    w={`${widthPercent}%`}
                    bg={color}
                    transition="width 0.3s"
                    position="relative"
                />
            </Box>
            
            {/* Scale labels */}
            <HStack w="100%" justify="space-between" fontSize="9px" opacity={0.6}>
                <Text>0%</Text>
                <Text>15%</Text>
                <Text>30%</Text>
                <Text>40%</Text>
            </HStack>
        </VStack>
    );
}, (prevProps, nextProps) => {
    // Custom comparison: only re-render if thd value changes significantly (>0.01%)
    return Math.abs(prevProps.thd - nextProps.thd) < 0.01 && prevProps.label === nextProps.label;
});

AmpTHDBar.displayName = 'AmpTHDBar';
