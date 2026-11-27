import React from 'react';
import {
    Box,
    HStack,
    Text,
    useColorMode,
    keyframes,
    Progress,
    Button,
    Badge,
} from '@chakra-ui/react';
import MyTooltip from '../../../../../Components/micro/MyTooltip';

// Define pulsing animation for the "Live" indicator
const pulse = keyframes`
  0% {
    box-shadow: 0 0 0 0 rgba(72, 187, 120, 0.7);
  }
  70% {
    box-shadow: 0 0 0 10px rgba(72, 187, 120, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(72, 187, 120, 0);
  }
`;

interface LiveTelemetryStatusProps {
    macAddress: string | null;
    isVisible?: boolean;
    isConnected: boolean;
    isConnecting: boolean;
    isLiveActive: boolean | "RESTORING";
    formattedTimestamp: string;
    error: Error | null;
    connectionProgress?: number;
    reconnect?: () => Promise<void> | void;
    telemetryValues?: any;
    periodInfo?: { label: string; hoverLabel: string } | null;
    deviceVersion?: string | null;
}

const LiveTelemetryStatus: React.FC<LiveTelemetryStatusProps> = ({
    macAddress,
    isVisible = true,
    isConnected,
    isConnecting,
    isLiveActive,
    formattedTimestamp,
    error,
    connectionProgress = 0,
    reconnect,
    telemetryValues,
    periodInfo,
    deviceVersion: propDeviceVersion,
}) => {
    const { colorMode } = useColorMode();

    // Don't render if not visible
    if (!isVisible) {
        return null;
    }

    const rawVersion = propDeviceVersion ?? telemetryValues?.version ?? null;
    const deviceVersion =
        rawVersion !== null && rawVersion !== undefined && String(rawVersion).trim() !== ""
            ? String(rawVersion).trim()
            : null;
    const displayVersion = deviceVersion
        ? (deviceVersion.toLowerCase().startsWith('v') ? deviceVersion : `v${deviceVersion}`)
        : null;

    const statusLabel = isConnecting
        ? 'Connecting to device...'
        : isLiveActive === 'RESTORING'
            ? 'Restoring connection...'
            : isLiveActive
                ? 'Device connected'
                : isConnected
                    ? 'Device connected'
                    : (!macAddress && !error)
                        ? 'Connecting to device...'
                        : 'Device offline';

    const statusColor = isConnecting
        ? 'orange'
        : (!isConnected && !isLiveActive)
            ? 'red'
            : isLiveActive === 'RESTORING'
                ? 'orange'
                : isLiveActive
                    ? 'whiteAlpha.500'
                    : 'red';

    const dotBg = isLiveActive === 'RESTORING'
        ? '#ED8936'
        : isLiveActive
            ? '#48BB78'
            : isConnecting
                ? '#D69E2E'
                : '#CBD5E0';

    return (
        <Box
            bg={colorMode === 'dark' ? 'whiteAlpha.50' : 'gray.50'}
            border="1px solid"
            borderColor={colorMode === 'dark' ? 'whiteAlpha.200' : 'gray.200'}
            borderRadius="md"
            px={{ base: 2, sm: 3 }}
            py={2}
            mb={3}
            w="100%"
            minW={0}
        >
            <HStack justify="space-between" align="center" gap={3} flexWrap="wrap">
                <HStack spacing={2} minW={0} maxW="100%" align="center" flexWrap="wrap" rowGap={1}>
                    <Box
                        w="10px"
                        h="10px"
                        borderRadius="full"
                        bg={dotBg}
                        animation={(isConnecting || isLiveActive) ? `${pulse} 2s infinite` : 'none'}
                        flexShrink={0}
                    />
                    <Text fontSize={{ base: "xs", sm: "sm" }} fontWeight={600} color={`${statusColor}.500`} noOfLines={2} minW={0}>
                        {statusLabel}
                    </Text>
                    {displayVersion && (
                        <MyTooltip label={`Device Firmware Version: ${deviceVersion}`}>
                            <Badge
                                colorScheme="purple"
                                size="sm"
                                variant="subtle"
                                px={2}
                                py={0.5}
                                borderRadius="full"
                                cursor="help"
                                textTransform="none"
                                fontFamily="monospace"
                                fontSize="xs"
                                flexShrink={0}
                            >
                                {displayVersion}
                            </Badge>
                        </MyTooltip>
                    )}
                </HStack>

                <HStack spacing={{ base: 2, sm: 3 }} rowGap={1} flexWrap="wrap">
                    {periodInfo && (
                        <MyTooltip label={`Min/Max/Avg values accumulated over the ${periodInfo.hoverLabel}`}>
                            <Badge colorScheme="blue" size="sm" variant="subtle" px={2} py={0.5} borderRadius="full" cursor="help">
                                {periodInfo.label}
                            </Badge>
                        </MyTooltip>
                    )}

                    {formattedTimestamp !== '--' && (
                        <Text fontSize="xs" opacity={0.7} fontFamily="monospace" flexShrink={0}>
                            {formattedTimestamp}
                        </Text>
                    )}

                    <Button size="xs" colorScheme="orange" variant="outline" onClick={() => reconnect && reconnect()} isDisabled={isConnecting || isConnected}>
                        Reconnect
                    </Button>
                </HStack>
            </HStack>

            {(isConnecting || (connectionProgress > 0 && connectionProgress < 100)) && (
                <Box mt={2}>
                    <Progress
                        value={connectionProgress}
                        size="sm"
                        colorScheme="orange"
                        borderRadius="md"
                        hasStripe={isConnecting}
                        isAnimated={isConnecting}
                    />
                </Box>
            )}

            {error && (
                <Text mt={2} fontSize="xs" color="red.500" noOfLines={3} wordBreak="break-word">
                    Connection issue: {error.message}
                </Text>
            )}
        </Box>
    );
};

export default React.memo(LiveTelemetryStatus);
