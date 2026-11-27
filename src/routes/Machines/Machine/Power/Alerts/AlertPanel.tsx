import React, { useMemo, useCallback } from "react";
import {
    Box,
    VStack,
    HStack,
    Text,
    Badge,
    Icon,
    Button,
    useColorMode,
    Collapse,
    useDisclosure,
} from "@chakra-ui/react";
import { WarningIcon, ChevronDownIcon, ChevronUpIcon } from "@chakra-ui/icons";
import { MdNotifications, MdSnooze } from "react-icons/md";
import { AlertIncident } from "./types";
import { PARAMETER_METADATA } from "./thresholdTemplates";
import dayjs from "../../../../../Components/Functions/dayjs";

// Constants
const SEVERITY_COLORS = {
    critical: "red",
    warning: "orange",
} as const;

// Pure utility functions (defined outside component to prevent recreation)
const getAlertColor = (severity: "warning" | "critical"): string => {
    return SEVERITY_COLORS[severity];
};

const toMilliseconds = (timestamp: number): number => {
    // Backend may send unix seconds while frontend timers use ms.
    return timestamp < 1e12 ? timestamp * 1000 : timestamp;
};

const formatDuration = (startTime: number): string => {
    const normalizedStartTime = toMilliseconds(startTime);
    const duration = Math.max(0, Date.now() - normalizedStartTime);
    const minutes = Math.floor(duration / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    return `${minutes}m`;
};

interface AlertPanelProps {
    alerts: AlertIncident[];
    machineName: string;
    onSnooze?: (alertId: string) => void;
    onAcknowledge?: (alertId: string) => void;
}

const AlertPanel: React.FC<AlertPanelProps> = ({
    alerts,
    machineName,
    onSnooze,
    onAcknowledge,
}) => {
    const { colorMode } = useColorMode();
    const { isOpen, onToggle } = useDisclosure({ defaultIsOpen: true });

    const { border, bgColor } = useMemo(() => {
        return {
            border: `${colorMode}.border`,
            bgColor: `${colorMode}.bg`,
        };
    }, [colorMode]);

    const activeAlerts = useMemo(() => {
        return alerts.filter((a) => a.status === "active");
    }, [alerts]);

    const criticalCount = useMemo(() => {
        return activeAlerts.filter((a) => a.severity === "critical").length;
    }, [activeAlerts]);

    const warningCount = useMemo(() => {
        return activeAlerts.filter((a) => a.severity === "warning").length;
    }, [activeAlerts]);

    // Memoize snooze handler
    const handleSnooze = useCallback(
        (alertId: string) => {
            if (onSnooze) {
                onSnooze(alertId);
            }
        },
        [onSnooze]
    );

    if (activeAlerts.length === 0) {
        return null;
    }

    return (
        <Box
            border="1px dashed"
            borderColor={border}
            borderRadius="5px"
            bg={bgColor}
            overflow="hidden"
        >
            {/* Header */}
            <HStack
                justify="space-between"
                p={3}
                borderBottom={isOpen ? "1px dashed" : "none"}
                borderColor={border}
                cursor="pointer"
                onClick={onToggle}
                _hover={{ opacity: 0.8 }}
            >
                <HStack spacing={2}>
                    <Icon as={MdNotifications} color="orange.500" boxSize={5} />
                    <Text fontSize="sm" fontWeight="600">
                        Active Alerts - {machineName}
                    </Text>
                    <HStack spacing={1}>
                        {criticalCount > 0 && (
                            <Badge colorScheme="red" fontSize="2xs">
                                {criticalCount} Critical
                            </Badge>
                        )}
                        {warningCount > 0 && (
                            <Badge colorScheme="orange" fontSize="2xs">
                                {warningCount} Warning
                            </Badge>
                        )}
                    </HStack>
                </HStack>
                <Icon as={isOpen ? ChevronUpIcon : ChevronDownIcon} boxSize={4} />
            </HStack>

            {/* Alerts List */}
            <Collapse in={isOpen} animateOpacity>
                <VStack spacing={0} align="stretch" maxH="300px" overflowY="auto">
                    {activeAlerts.map((alert, index) => (
                        <Box
                            key={alert.id || index}
                            p={3}
                            borderBottom={index < activeAlerts.length - 1 ? "1px dashed" : "none"}
                            borderColor={border}
                            bg={bgColor}
                        >
                            <HStack justify="space-between" align="start">
                                <VStack align="start" spacing={1} flex={1}>
                                    <HStack spacing={2}>
                                        <WarningIcon
                                            color={`${getAlertColor(alert.severity)}.500`}
                                            boxSize={3}
                                        />
                                        <Text fontSize="sm" fontWeight="600">
                                            {alert.parameter}
                                        </Text>
                                        <Badge
                                            colorScheme={getAlertColor(alert.severity)}
                                            fontSize="2xs"
                                        >
                                            {alert.severity.toUpperCase()}
                                        </Badge>
                                    </HStack>
                                    <HStack spacing={3} fontSize="xs" color="gray.500">
                                        <Text>
                                            Value: <strong>{alert.actualValue.toFixed(2)}</strong>{" "}
                                            {PARAMETER_METADATA[alert.parameterId]?.unit || ""}
                                        </Text>
                                        <Text>•</Text>
                                        <Text>
                                            Threshold:{" "}
                                            {alert.thresholdType === "min" ? "< " : "> "}
                                            <strong>{alert.thresholdValue.toFixed(2)}</strong>{" "}
                                            {PARAMETER_METADATA[alert.parameterId]?.unit || ""}
                                        </Text>
                                        <Text>•</Text>
                                        <Text>
                                            Duration: <strong>{formatDuration(alert.startTime)}</strong>
                                        </Text>
                                    </HStack>
                                    <Text fontSize="2xs" color="gray.500">
                                        Started: {dayjs(toMilliseconds(alert.startTime)).format("MMM D, HH:mm:ss")}
                                    </Text>
                                </VStack>
                                <HStack spacing={1}>
                                    {onSnooze && (
                                        <Button
                                            size="xs"
                                            variant="ghost"
                                            leftIcon={<Icon as={MdSnooze} />}
                                            onClick={() => handleSnooze(alert.id!)}
                                        >
                                            Snooze
                                        </Button>
                                    )}
                                </HStack>
                            </HStack>
                        </Box>
                    ))}
                </VStack>
            </Collapse>
        </Box>
    );
};

export default AlertPanel;
