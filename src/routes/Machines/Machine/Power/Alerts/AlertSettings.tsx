import React, { useState, useMemo, useCallback } from "react";
import {
    Modal,
    ModalOverlay,
    ModalContent,
    ModalHeader,
    ModalFooter,
    ModalBody,
    ModalCloseButton,
    Tabs,
    TabList,
    TabPanels,
    Tab,
    TabPanel,
    Button,
    HStack,
    VStack,
    Select,
    Alert,
    AlertIcon,
    AlertTitle,
    AlertDescription,
    Divider,
    Text,
    useDisclosure,
    Icon,
    Box,
    useToast,
    useColorMode,
    Badge,
} from "@chakra-ui/react";
import { InfoIcon } from "@chakra-ui/icons";
import { MdFlashOn, MdClose, MdSave } from "react-icons/md";
import { MachineThresholds, TemplateType, ThresholdConfig } from "./types";
import {
    TEMPLATES,
    CONSERVATIVE_TEMPLATE,
    STANDARD_TEMPLATE,
    RELAXED_TEMPLATE,
    getParametersByCategory,
    normalizeThresholds,
} from "./thresholdTemplates";
import ParameterConfig from "./ParameterConfig";
import MyTooltip from "../../../../../Components/micro/MyTooltip";
import MyModal from "../../../../../Components/micro/MyModal";

interface AlertSettingsProps {
    machineId: string;
    machineName: string;
    open: boolean;
    initialThresholds?: MachineThresholds;
    onSave: (thresholds: MachineThresholds) => Promise<void>;
    onCancel: () => void;
}

const AlertSettings: React.FC<AlertSettingsProps> = ({
    machineId,
    machineName,
    open,
    initialThresholds,
    onSave,
    onCancel,
}) => {
    const [selectedTemplate, setSelectedTemplate] = useState<TemplateType>(
        initialThresholds?.templateType ?? "standard"
    );
    const [thresholds, setThresholds] = useState<Record<string, ThresholdConfig>>(
        normalizeThresholds(
            initialThresholds?.thresholds ??
            (STANDARD_TEMPLATE.thresholds as Record<string, ThresholdConfig>)
        )
    );
    const [saving, setSaving] = useState(false);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const {
        isOpen: isConfirmOpen,
        onOpen: onConfirmOpen,
        onClose: onConfirmClose,
    } = useDisclosure();
    const toast = useToast();
    const { colorMode } = useColorMode();

    const { border, bgColor } = useMemo(() => {
        return {
            border: `${colorMode}.border`,
            bgColor: `${colorMode}.bg`,
        };
    }, [colorMode]);

    const parametersByCategory = useMemo(() => getParametersByCategory(), []);

    // Memoized threshold change handler to prevent unnecessary re-renders
    const handleThresholdChange = useCallback(
        (parameterId: string, config: Partial<ThresholdConfig>) => {
            setThresholds((prev) => ({
                ...normalizeThresholds({
                    ...prev,
                    [parameterId]: {
                        ...prev[parameterId],
                        ...config,
                    },
                }),
            }));
            setHasUnsavedChanges(true);

            // If they modify a template threshold, switch to custom
            if (selectedTemplate !== "custom") {
                setSelectedTemplate("custom");
            }
        },
        [selectedTemplate]
    );
    // Handle template selection
    const handleTemplateChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
        const template = e.target.value as TemplateType;
        setSelectedTemplate(template);

        let templateThresholds: Record<string, ThresholdConfig> = {};
        switch (template) {
            case "conservative":
                templateThresholds = CONSERVATIVE_TEMPLATE.thresholds as Record<
                    string,
                    ThresholdConfig
                >;
                break;
            case "standard":
                templateThresholds = STANDARD_TEMPLATE.thresholds as Record<
                    string,
                    ThresholdConfig
                >;
                break;
            case "relaxed":
                templateThresholds = RELAXED_TEMPLATE.thresholds as Record<
                    string,
                    ThresholdConfig
                >;
                break;
            default:
                // Custom - keep current thresholds
                templateThresholds = {};
        }

        if (template !== "custom") {
            setThresholds(normalizeThresholds(templateThresholds));
            setHasUnsavedChanges(true);
        }
    }, []);

    // Handle save
    const handleSave = async () => {
        setSaving(true);
        try {
            const machineThresholds: MachineThresholds = {
                machineId,
                templateType: selectedTemplate,
                thresholds: normalizeThresholds(thresholds),
                updatedAt: Date.now(),
                updatedBy: "current-user", // TODO: Get from auth context
            };

            await onSave(machineThresholds);
            setHasUnsavedChanges(false);
            toast({
                title: "Configuration saved",
                description: "Alert thresholds have been updated successfully.",
                status: "success",
                duration: 3000,
                isClosable: true,
            });
        } catch (error) {
            console.error("Failed to save thresholds:", error);
            toast({
                title: "Save failed",
                description: "Failed to save alert configuration. Please try again.",
                status: "error",
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setSaving(false);
        }
    };

    // Handle cancel
    const handleCancel = () => {
        if (hasUnsavedChanges) {
            onConfirmOpen();
        } else {
            onCancel();
        }
    };

    const handleConfirmDiscard = () => {
        onConfirmClose();
        onCancel();
    };

    // Count active alerts
    const activeAlertCount = useMemo(() => {
        return Object.values(thresholds).filter((t) => t.enabled !== false).length;
    }, [thresholds]);

    return (
        <>
            <Modal isOpen={open} onClose={handleCancel} size="6xl" scrollBehavior="inside">
                <ModalOverlay backdropFilter="blur(4px)" />
                <ModalContent bg={bgColor} border="1px dashed" borderColor={border}>
                    <ModalHeader px={4} py={3}>
                        <HStack spacing={2}>
                            <Icon as={MdFlashOn} color="orange.400" boxSize={4} />
                            <Text fontSize="md" fontWeight="600">Alert Configuration - {machineName}</Text>
                        </HStack>
                    </ModalHeader>
                    <ModalCloseButton size="sm" />

                    <ModalBody px={4} py={3}>
                        <VStack spacing={3} align="stretch">
                            {/* Template Selector */}
                            <Box
                                p={3}
                                border="1px dashed"
                                borderColor={border}
                                borderRadius="5px"
                            >
                                <HStack mb={2} spacing={2}>
                                    <Text fontSize="sm" fontWeight="600">Template:</Text>
                                    <MyTooltip label="Choose a pre-configured template or customize individual parameters" fontSize="xs">
                                        <InfoIcon boxSize={3} />
                                    </MyTooltip>
                                </HStack>

                                <Select focusBorderColor={"primary"} value={selectedTemplate} onChange={handleTemplateChange} size="sm">
                                    {TEMPLATES.map((template) => (
                                        <option key={template.name} value={template.name}>
                                            {template.label} - {template.description}
                                        </option>
                                    ))}
                                    <option value="custom">Custom - Manually configure each parameter</option>
                                </Select>

                                {selectedTemplate === "custom" && (
                                    <Alert status="info" mt={2} py={2} fontSize="sm">
                                        <AlertIcon boxSize={4} />
                                        <Box>
                                            <AlertTitle fontSize="sm">Custom template</AlertTitle>
                                            <AlertDescription fontSize="xs">
                                                You are using custom thresholds. Modify parameters below to fine-tune settings.
                                            </AlertDescription>
                                        </Box>
                                    </Alert>
                                )}
                            </Box>

                            <Divider borderColor={border} />

                            {/* Active Alerts Summary */}
                            <Alert
                                status={activeAlertCount > 0 ? "success" : "warning"}
                                variant="left-accent"
                                py={2}
                                fontSize="sm"
                            >
                                <AlertIcon boxSize={4} />
                                <HStack spacing={2}>
                                    <Badge colorScheme={activeAlertCount > 0 ? "green" : "orange"} fontSize="xs">
                                        {activeAlertCount}
                                    </Badge>
                                    <Text fontSize="sm" fontWeight="600">active alert parameter(s)</Text>
                                </HStack>
                            </Alert>

                            {/* Parameter Configuration Tabs */}
                            <Tabs colorScheme="orange" variant="enclosed" size="sm" isLazy lazyBehavior="unmount">
                                <TabList>
                                    <Tab fontSize="xs" py={2}>Voltage</Tab>
                                    <Tab fontSize="xs" py={2}>Current</Tab>
                                    <Tab fontSize="xs" py={2}>Power Quality</Tab>
                                </TabList>

                                <TabPanels>
                                    {/* Voltage Tab */}
                                    <TabPanel px={0} py={3}>
                                        <VStack spacing={2} align="stretch">
                                            <Text fontSize="xs" fontWeight="600" color="gray.500" textTransform="uppercase" mb={1}>Line-to-Neutral Voltage</Text>
                                            {parametersByCategory.voltage.filter((param) => param.id === "voltage_ln_SUM").map((param) => (
                                                <ParameterConfig
                                                    key={param.id}
                                                    parameter={param}
                                                    config={thresholds[param.id]}
                                                    onChange={(config: Partial<ThresholdConfig>) =>
                                                        handleThresholdChange(param.id, config)
                                                    }
                                                />
                                            ))}

                                            <Divider borderColor={border} my={2} />

                                            <Text fontSize="xs" fontWeight="600" color="gray.500" textTransform="uppercase" mb={1}>Line-to-Line Voltage</Text>
                                            {parametersByCategory.voltage.filter((param) => param.id === "voltage_ll_SUM").map((param) => (
                                                <ParameterConfig
                                                    key={param.id}
                                                    parameter={param}
                                                    config={thresholds[param.id]}
                                                    onChange={(config: Partial<ThresholdConfig>) =>
                                                        handleThresholdChange(param.id, config)
                                                    }
                                                />
                                            ))}
                                        </VStack>
                                    </TabPanel>

                                    {/* Current Tab */}
                                    <TabPanel px={0} py={3}>
                                        <VStack spacing={2} align="stretch">
                                            {parametersByCategory.current.length > 0 ? (
                                                parametersByCategory.current.map((param) => (
                                                    <ParameterConfig
                                                        key={param.id}
                                                        parameter={param}
                                                        config={thresholds[param.id]}
                                                        onChange={(config: Partial<ThresholdConfig>) =>
                                                            handleThresholdChange(param.id, config)
                                                        }
                                                    />
                                                ))
                                            ) : (
                                                <Alert status="info">
                                                    <AlertIcon />
                                                    Configure machine capacity first to enable current monitoring
                                                </Alert>
                                            )}
                                        </VStack>
                                    </TabPanel>

                                    {/* Power Quality Tab */}
                                    <TabPanel px={0} py={3}>
                                        <VStack spacing={2} align="stretch">
                                            <Text fontSize="xs" fontWeight="600" color="gray.500" textTransform="uppercase" mb={1}>Power Factor</Text>
                                            {parametersByCategory.quality.filter((param) => param.id.startsWith("pf_")).map((param) => (
                                                <ParameterConfig
                                                    key={param.id}
                                                    parameter={param}
                                                    config={thresholds[param.id]}
                                                    onChange={(config: Partial<ThresholdConfig>) =>
                                                        handleThresholdChange(param.id, config)
                                                    }
                                                />
                                            ))}

                                            <Divider borderColor={border} my={2} />

                                            <Text fontSize="xs" fontWeight="600" color="gray.500" textTransform="uppercase" mb={1}>Voltage THD (%)</Text>
                                            {parametersByCategory.quality.filter((param) => param.id.startsWith("thd_v_")).map((param) => (
                                                <ParameterConfig
                                                    key={param.id}
                                                    parameter={param}
                                                    config={thresholds[param.id]}
                                                    onChange={(config: Partial<ThresholdConfig>) =>
                                                        handleThresholdChange(param.id, config)
                                                    }
                                                />
                                            ))}

                                            <Divider borderColor={border} my={2} />

                                            <Text fontSize="xs" fontWeight="600" color="gray.500" textTransform="uppercase" mb={1}>Current THD (%)</Text>
                                            {parametersByCategory.quality.filter((param) => param.id.startsWith("thd_a_")).map((param) => (
                                                <ParameterConfig
                                                    key={param.id}
                                                    parameter={param}
                                                    config={thresholds[param.id]}
                                                    onChange={(config: Partial<ThresholdConfig>) =>
                                                        handleThresholdChange(param.id, config)
                                                    }
                                                />
                                            ))}
                                        </VStack>
                                    </TabPanel>

                                </TabPanels>
                            </Tabs>
                        </VStack>
                    </ModalBody>

                    <ModalFooter px={4} py={3} borderTop="1px dashed" borderColor={border}>
                        <HStack spacing={2}>
                            <Button leftIcon={<MdClose />} onClick={handleCancel} size="xs" colorScheme={"red"} variant="outline">
                                Cancel
                            </Button>
                            <Button
                                leftIcon={<MdSave />}
                                colorScheme="orange"
                                isLoading={saving}
                                isDisabled={!hasUnsavedChanges}
                                onClick={handleSave}
                                size="xs"
                            >
                                Save Configuration
                            </Button>
                        </HStack>
                    </ModalFooter>
                </ModalContent>
            </Modal>

            {/* Confirmation Dialog */}
            <MyModal isOpen={isConfirmOpen} onClose={onConfirmClose} size="md">
                <ModalHeader>Unsaved Changes</ModalHeader>
                <ModalCloseButton />
                <ModalBody>
                    <Text>You have unsaved changes. Are you sure you want to close?</Text>
                </ModalBody>
                <ModalFooter>
                    <HStack spacing={3}>
                        <Button size="sm" variant="ghost" onClick={onConfirmClose}>
                            Continue Editing
                        </Button>
                        <Button size="sm" colorScheme="red" onClick={handleConfirmDiscard}>
                            Discard Changes
                        </Button>
                    </HStack>
                </ModalFooter>
            </MyModal>
        </>
    );
};

export default AlertSettings;
