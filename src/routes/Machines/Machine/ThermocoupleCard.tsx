import {
    Box,
    CardBody,
    CardHeader,
    HStack,
    VStack,
    Text,
    useColorMode,
    Icon,
    useToast,
    Button,
    FormControl,
    FormLabel,
    SimpleGrid,
    Center,
    CircularProgress,
    CircularProgressLabel,
    Badge,
    Table,
    Thead,
    Tbody,
    Tr,
    Th,
    Td,
    IconButton,
    useDisclosure,
    Switch,
    Modal,
    ModalOverlay,
    ModalContent,
    ModalHeader,
    ModalCloseButton,
    ModalBody,
    ModalFooter,
    Divider,
    Heading
} from "@chakra-ui/react";
import { useEffect, useState, useMemo } from "react";
import { FaTemperatureHigh, FaCog, FaTrash, FaCheckCircle, FaExclamationTriangle } from "react-icons/fa";
import { get, remove, listen } from "../../../Components/firebase/api/db";
import SearchableSelector from "../../../Components/Inputs/SearchableSelector";
import { PrimaryInput } from "../../../Components/Inputs";
import MyCard from "../../../Components/micro/Card";
import { REST_SERVER_URL } from "../../../Components/micro/sendDataRest";
import { uidAtom, roleAtom, isMasterAdminAtom, isImpersonationReadOnlyAtom } from "../../../Components/Store/atoms";
import Listen from "../../../Components/Store/hooks/Listen";
import store from "../../../Components/Store";
import { canWriteOperational } from "../../../Services/rbac";
import dayjs from "../../../Components/Functions/dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { Option } from "../../Reports/Selector/types";

dayjs.extend(relativeTime);

interface AlertHistoryItem {
    id: string;
    type: "min" | "max";
    value: number;
    threshold: number;
    timestamp: number;
    active: boolean;
    resolvedAt?: number;
}

interface ThermocoupleConfig {
    name: string;
    minEnabled: boolean;
    minThreshold: number;
    maxEnabled: boolean;
    maxThreshold: number;
    notificationCategories: string[];
}

interface ThermocoupleCardProps {
    machineID: string;
    machineName?: string;
    unit?: string;
}

const ThermocoupleCard = ({ machineID, machineName = "Machine", unit }: ThermocoupleCardProps) => {
    const { colorMode } = useColorMode();
    const toast = useToast();
    const { isOpen, onOpen, onClose } = useDisclosure();
    const uid = Listen(uidAtom);
    Listen(roleAtom);
    Listen(isMasterAdminAtom);
    const canWrite = canWriteOperational(uid);

    // Color definitions aligned with Poppins theme
    const { border, subText, popoverBg } = useMemo(() => ({
        border: `${colorMode}.border`,
        subText: `${colorMode}.subText`,
        popoverBg: `${colorMode}.popoverContentBgColor`
    }), [colorMode]);

    // State definitions
    const [temperature, setTemperature] = useState<number | null>(null);
    const [lastUpdated, setLastUpdated] = useState<number | null>(null);
    const [deviceCategories, setDeviceCategories] = useState<string[]>([]);
    
    const [config, setConfig] = useState<ThermocoupleConfig>({
        name: "Thermocouple Temperature",
        minEnabled: false,
        minThreshold: 20,
        maxEnabled: false,
        maxThreshold: 80,
        notificationCategories: []
    });


    const [alertHistory, setAlertHistory] = useState<AlertHistoryItem[]>([]);

    // Form settings state (for editing)
    const [formConfig, setFormConfig] = useState<ThermocoupleConfig>({ ...config });
    const [isSaving, setIsSaving] = useState(false);

    // Fetch device categories once
    useEffect(() => {
        if (!uid) return;
        get("device-categories")
            .then((snapshot) => {
                if (snapshot.exists()) {
                    setDeviceCategories(Object.keys(snapshot.val()));
                }
            })
            .catch((err) => console.error("Error fetching device categories:", err));
    }, [uid]);

    const [, setTicker] = useState(0);

    // Set up ticker to force re-render every 30 seconds, keeping fromNow() relative time updated automatically
    useEffect(() => {
        const interval = setInterval(() => {
            setTicker((t) => t + 1);
        }, 30000);
        return () => clearInterval(interval);
    }, []);

    // Listen to real-time temperature node: /users/${uid}/thermocouple/machines/${machineID}/now
    useEffect(() => {
        if (!uid || !machineID) return;
        const nowPath = `/users/${uid}/thermocouple/machines/${machineID}/now`;
        
        const unsubscribe = listen(nowPath, (snapshot) => {
            const val = snapshot.val();
            if (val !== null && val !== undefined) {
                let parsedTemp: number | null = null;
                let parsedTimestamp: number | null = null;

                if (typeof val === "number") {
                    parsedTemp = val;
                } else if (typeof val === "string" && !isNaN(Number(val)) && val.trim() !== "") {
                    parsedTemp = Number(val);
                } else if (typeof val === "object") {
                    const rawVal = val.temperature ?? val.temp ?? val.value ?? val.val ?? val.degree;
                    if (typeof rawVal === "number") {
                        parsedTemp = rawVal;
                    } else if (typeof rawVal === "string" && !isNaN(Number(rawVal)) && rawVal.trim() !== "") {
                        parsedTemp = Number(rawVal);
                    }
                    if (val.timestamp) {
                        parsedTimestamp = typeof val.timestamp === "number" 
                            ? (val.timestamp > 1e11 ? Math.floor(val.timestamp / 1000) : val.timestamp) 
                            : Number(val.timestamp) || null;
                    }
                }

                if (parsedTemp !== null) {
                    setTemperature(parsedTemp);
                    setLastUpdated(parsedTimestamp || Math.floor(Date.now() / 1000));
                }
            } else {
                setTemperature(null);
            }
        });

        return () => unsubscribe();
    }, [uid, machineID]);

    // Listen to configuration: /users/${uid}/thermocouple/machines/${machineID}/config
    useEffect(() => {
        if (!uid || !machineID) return;
        const configPath = `/users/${uid}/thermocouple/machines/${machineID}/config`;

        const unsubscribe = listen(configPath, (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.val();
                const loadedConfig = {
                    name: data.name || "Thermocouple Temperature",
                    minEnabled: !!data.minEnabled,
                    minThreshold: typeof data.minThreshold === "number" ? data.minThreshold : 20,
                    maxEnabled: !!data.maxEnabled,
                    maxThreshold: typeof data.maxThreshold === "number" ? data.maxThreshold : 80,
                    notificationCategories: data.notificationCategories || []
                };
                setConfig(loadedConfig);
                setFormConfig(loadedConfig);
            }
        });

        return () => unsubscribe();
    }, [uid, machineID]);

    // Listen to alert history: /users/${uid}/thermocouple/machines/${machineID}/alert_history
    useEffect(() => {
        if (!uid || !machineID) return;
        const historyPath = `/users/${uid}/thermocouple/machines/${machineID}/alert_history`;

        const unsubscribe = listen(historyPath, (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.val();
                const list: AlertHistoryItem[] = Object.entries(data).map(([key, item]: [string, any]) => ({
                    id: key,
                    type: item.type,
                    value: item.value,
                    threshold: item.threshold,
                    timestamp: item.timestamp,
                    active: !!item.active,
                    resolvedAt: item.resolvedAt
                }));
                // Sort by timestamp descending (newest first)
                list.sort((a, b) => b.timestamp - a.timestamp);
                setAlertHistory(list);
            } else {
                setAlertHistory([]);
            }
        });

        return () => unsubscribe();
    }, [uid, machineID]);



    // Handle saving form settings
    const saveConfig = async () => {
        if (!canWrite) return;
        if (store.get(isMasterAdminAtom) && store.get(isImpersonationReadOnlyAtom)) {
            toast({
                title: "Action Blocked",
                description: "Impersonation Safe Mode is ON.",
                status: "warning",
                duration: 4000,
                isClosable: true
            });
            return;
        }
        setIsSaving(true);
        try {
            const URL = `${REST_SERVER_URL}/thermocouple/config`;
            const headers = {
                "Content-Type": "application/json",
                uid: uid || "",
                unit: String(unit || "")
            };
            const payload = {
                machineID,
                config: formConfig
            };

            const response = await fetch(URL, {
                method: "POST",
                headers: headers,
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error(`Failed to update config. Server responded with status ${response.status}`);
            }

            toast({
                title: "Config Updated",
                description: "Thermocouple monitoring settings updated successfully.",
                status: "success",
                duration: 3000,
                isClosable: true
            });
            onClose();
        } catch (err) {
            console.error(err);
            toast({
                title: "Error",
                description: "Failed to save thermocouple configuration.",
                status: "error",
                duration: 5000,
                isClosable: true
            });
        } finally {
            setIsSaving(false);
        }
    };

    // Handle clearing logs
    const clearHistory = async () => {
        if (!canWrite) return;
        try {
            await remove(`thermocouple/machines/${machineID}/alert_history`);
            toast({
                title: "History Cleared",
                description: "Alert incident history has been cleared.",
                status: "success",
                duration: 3000,
                isClosable: true
            });
        } catch (err) {
            console.error(err);
            toast({
                title: "Error",
                description: "Failed to clear alert history.",
                status: "error",
                duration: 5000,
                isClosable: true
            });
        }
    };

    // Computed alert status values
    const activeAlerts = alertHistory.filter(h => h.active);
    const isAlertActive = activeAlerts.length > 0;
    const isMaxAlert = activeAlerts.some(a => a.type === "max");
    const isMinAlert = activeAlerts.some(a => a.type === "min");

    const statusBadge = useMemo(() => {
        if (temperature === null) return <Badge colorScheme="gray">Offline</Badge>;
        if (isMaxAlert) return <Badge colorScheme="red" variant="solid">ALERT: HIGH TEMP</Badge>;
        if (isMinAlert) return <Badge colorScheme="blue" variant="solid">ALERT: LOW TEMP</Badge>;
        return <Badge colorScheme="green">Normal</Badge>;
    }, [temperature, isMaxAlert, isMinAlert]);

    // Visual dial/circular progress color
    const progressColor = useMemo(() => {
        if (isMaxAlert) return "red.500";
        if (isMinAlert) return "blue.500";
        if (temperature !== null && config.maxEnabled && temperature > config.maxThreshold * 0.85) return "yellow.500";
        return "green.500";
    }, [temperature, isMaxAlert, isMinAlert, config]);

    return (
        <MyCard w="100%">
            <CardHeader
                display="flex"
                justifyContent="space-between"
                alignItems="center"
                borderBottom="1px solid"
                borderColor={border}
                py={2}
                px={4}>
                <HStack gap={3}>
                    <Icon as={FaTemperatureHigh} color={isAlertActive ? "red.500" : "orange.500"} fontSize="xl" />
                    <Heading size="md" fontFamily="Poppins">{config.name}</Heading>
                    {statusBadge}
                </HStack>
                {canWrite && (
                    <IconButton
                        aria-label="Configure thermocouple"
                        icon={<FaCog />}
                        variant="ghost"
                        onClick={onOpen}
                        _hover={{ backgroundColor: popoverBg }}
                    />
                )}
            </CardHeader>
            <CardBody px={4} py={2.5}>
                <SimpleGrid columns={{ base: 1, md: 3 }} gap={4} w="100%">
                    {/* Temperature Gauge Display */}
                    <Center flexDir="column" borderRight={{ base: "none", md: `1px solid` }} borderColor={border} pr={{ base: 0, md: 4 }}>
                        <CircularProgress
                            thickness="8px"
                            size="140px"
                            value={temperature !== null ? Math.min(Math.max(temperature, 0), 120) : 0}
                            max={120}
                            color={progressColor}
                            trackColor="#cccccc40"
                            capIsRound>
                            <CircularProgressLabel>
                                <Text fontSize="xl" fontWeight={600} fontFamily="Poppins">
                                    {typeof temperature === "number" ? `${temperature.toFixed(1)}°C` : "--"}
                                </Text>
                            </CircularProgressLabel>
                        </CircularProgress>
                        <Text fontSize="xs" color={subText} mt={3} fontWeight={500}>
                            {lastUpdated ? `Last updated: ${dayjs.unix(lastUpdated).fromNow()}` : "No live data"}
                        </Text>
                    </Center>

                    {/* Threshold Details Display */}
                    <VStack alignItems="flex-start" justifyContent="center" gap={3} borderRight={{ base: "none", md: `1px solid` }} borderColor={border} pr={{ base: 0, md: 4 }} pl={{ base: 0, md: 4 }}>
                        <Text fontSize="sm" fontWeight={600} textDecor="underline">Alert Config Details</Text>
                        <HStack justifyContent="space-between" w="100%">
                            <Text fontSize="sm" color={subText} fontWeight={500}>Max Alert Limit:</Text>
                            <Badge colorScheme={config.maxEnabled ? "red" : "gray"}>
                                {config.maxEnabled ? `${config.maxThreshold}°C` : "Disabled"}
                            </Badge>
                        </HStack>
                        <HStack justifyContent="space-between" w="100%">
                            <Text fontSize="sm" color={subText} fontWeight={500}>Min Alert Limit:</Text>
                            <Badge colorScheme={config.minEnabled ? "blue" : "gray"}>
                                {config.minEnabled ? `${config.minThreshold}°C` : "Disabled"}
                            </Badge>
                        </HStack>
                        <VStack alignItems="flex-start" w="100%" gap={1} mt={1}>
                            <Text fontSize="sm" color={subText} fontWeight={500}>Device Categories Notified:</Text>
                            {config.notificationCategories && config.notificationCategories.length > 0 ? (
                                <HStack wrap="wrap" gap={1.5}>
                                    {config.notificationCategories.map(cat => (
                                        <Badge key={cat} variant="subtle" colorScheme="orange">
                                            {cat}
                                        </Badge>
                                    ))}
                                </HStack>
                            ) : (
                                <Text fontSize="xs" fontWeight={600} color="red.400">None Configured</Text>
                            )}
                        </VStack>
                    </VStack>

                    {/* Real-time Incident Tracker Quick Insights */}
                    <VStack alignItems="flex-start" justifyContent="center" gap={2} pl={{ base: 0, md: 4 }}>
                        <Text fontSize="sm" fontWeight={600} textDecor="underline">Recent Activity Insights</Text>
                        {isAlertActive ? (
                            <HStack color="red.500" gap={2}>
                                <Icon as={FaExclamationTriangle} />
                                <Text fontSize="sm" fontWeight={700}>Alert currently active!</Text>
                            </HStack>
                        ) : (
                            <HStack color="green.500" gap={2}>
                                <Icon as={FaCheckCircle} />
                                <Text fontSize="sm" fontWeight={700}>System is running normal.</Text>
                            </HStack>
                        )}
                        <Text fontSize="xs" color={subText} fontWeight={500}>
                            Total logged incidents: <strong>{alertHistory.length}</strong>
                        </Text>
                        <Text fontSize="xs" color={subText} fontWeight={500}>
                            Active alerts: <strong>{activeAlerts.length}</strong>
                        </Text>
                    </VStack>
                </SimpleGrid>

                {/* Divider before Incident Table */}
                <Divider my={5} borderColor={border} />

                {/* Incident / Alert History Log */}
                <Box w="100%" overflowX="auto">
                    <HStack justifyContent="space-between" mb={3} px={2}>
                        <Heading size="xs" textTransform="uppercase" letterSpacing="wider" fontFamily="Poppins" color={subText}>
                            Alert Incident History Log
                        </Heading>
                        {canWrite && alertHistory.length > 0 && (
                            <Button size="xs" colorScheme="red" variant="outline" leftIcon={<FaTrash />} onClick={clearHistory}>
                                Clear History
                            </Button>
                        )}
                    </HStack>
                    {alertHistory.length > 0 ? (
                        <Table size="sm" variant="simple">
                            <Thead>
                                <Tr>
                                    <Th borderColor={border} fontFamily="Poppins">Triggered Time</Th>
                                    <Th borderColor={border} fontFamily="Poppins">Alert Incident Type</Th>
                                    <Th borderColor={border} fontFamily="Poppins" isNumeric>Triggered Temp</Th>
                                    <Th borderColor={border} fontFamily="Poppins" isNumeric>Threshold</Th>
                                    <Th borderColor={border} fontFamily="Poppins">Current Status</Th>
                                    <Th borderColor={border} fontFamily="Poppins">Resolved Time</Th>
                                </Tr>
                            </Thead>
                            <Tbody>
                                {alertHistory.map((item) => (
                                    <Tr key={item.id}>
                                        <Td borderColor={border} fontWeight={500} fontFamily="Poppins">
                                            {dayjs.unix(item.timestamp).format("DD-MM-YYYY HH:mm:ss")}
                                        </Td>
                                        <Td borderColor={border} fontWeight={600} fontFamily="Poppins">
                                            {item.type === "max" ? (
                                                <Text color="red.500">Max Temp Exceeded</Text>
                                            ) : (
                                                <Text color="blue.500">Min Temp Dropped Below</Text>
                                            )}
                                        </Td>
                                        <Td borderColor={border} fontWeight={600} isNumeric fontFamily="Poppins">
                                            {typeof item.value === "number" ? `${item.value.toFixed(1)}°C` : "--"}
                                        </Td>
                                        <Td borderColor={border} color={subText} isNumeric fontFamily="Poppins">
                                            {typeof item.threshold === "number" ? `${item.threshold.toFixed(1)}°C` : "--"}
                                        </Td>
                                        <Td borderColor={border} fontFamily="Poppins">
                                            {item.active ? (
                                                <Badge colorScheme="red" variant="solid" className="blink">Active</Badge>
                                            ) : (
                                                <Badge colorScheme="green">Resolved</Badge>
                                            )}
                                        </Td>
                                        <Td borderColor={border} color={subText} fontFamily="Poppins">
                                            {item.resolvedAt
                                                ? dayjs.unix(item.resolvedAt).format("DD-MM-YYYY HH:mm:ss")
                                                : "--"}
                                        </Td>
                                    </Tr>
                                ))}
                            </Tbody>
                        </Table>
                    ) : (
                        <Center py={6} flexDir="column">
                            <Text fontSize="sm" color={subText} fontStyle="italic">
                                No temperature alert incidents logged.
                            </Text>
                        </Center>
                    )}
                </Box>
            </CardBody>

            {/* Modal for Configuration */}
            {canWrite && <Modal isOpen={isOpen} onClose={onClose} size="lg">
                <ModalOverlay />
                <ModalContent backgroundColor={popoverBg} borderRadius="xl" shadow="2xl">
                    <ModalHeader borderBottom="1px solid" borderColor={border} fontFamily="Poppins" fontSize="md" py={3} px={4}>
                        Configure Temperature Monitoring
                    </ModalHeader>
                    <ModalCloseButton top="8px" right="10px" />
                    
                    <ModalBody py={3} px={4} as={VStack} gap={4} alignItems="stretch">
                        {/* Name Input */}
                        <FormControl>
                            <FormLabel fontSize="xs" fontWeight={600} color={subText} mb={1.5}>Sensor Display Name</FormLabel>
                            <PrimaryInput
                                size="sm"
                                borderRadius="md"
                                value={formConfig.name}
                                onChange={(e) => setFormConfig({ ...formConfig, name: e.target.value })}
                                placeholder="Sensor Name (e.g. Oil Temp)"
                            />
                        </FormControl>

                        {/* Max Threshold */}
                        <HStack justifyContent="space-between" py={1.5} borderBottom="1px solid" borderColor={border}>
                            <HStack gap={2}>
                                <Switch
                                    size="sm"
                                    colorScheme="orange"
                                    isChecked={formConfig.maxEnabled}
                                    onChange={(e) => setFormConfig({ ...formConfig, maxEnabled: e.target.checked })}
                                />
                                <Text fontSize="xs" fontWeight={600}>Max Limit Alert</Text>
                            </HStack>
                            {formConfig.maxEnabled && (
                                <HStack maxW="90px" gap={1}>
                                    <PrimaryInput
                                        size="sm"
                                        type="number"
                                        borderRadius="md"
                                        value={formConfig.maxThreshold}
                                        onChange={(e) => setFormConfig({ ...formConfig, maxThreshold: Number(e.target.value) })}
                                        pr={1}
                                        textAlign="right"
                                        placeholder="Max Temp"
                                    />
                                    <Text fontSize="xs" fontWeight={700} color={subText}>°C</Text>
                                </HStack>
                            )}
                        </HStack>

                        {/* Min Threshold */}
                        <HStack justifyContent="space-between" py={1.5} borderBottom="1px solid" borderColor={border}>
                            <HStack gap={2}>
                                <Switch
                                    size="sm"
                                    colorScheme="orange"
                                    isChecked={formConfig.minEnabled}
                                    onChange={(e) => setFormConfig({ ...formConfig, minEnabled: e.target.checked })}
                                />
                                <Text fontSize="xs" fontWeight={600}>Min Limit Alert</Text>
                            </HStack>
                            {formConfig.minEnabled && (
                                <HStack maxW="90px" gap={1}>
                                    <PrimaryInput
                                        size="sm"
                                        type="number"
                                        borderRadius="md"
                                        value={formConfig.minThreshold}
                                        onChange={(e) => setFormConfig({ ...formConfig, minThreshold: Number(e.target.value) })}
                                        pr={1}
                                        textAlign="right"
                                        placeholder="Min Temp"
                                    />
                                    <Text fontSize="xs" fontWeight={700} color={subText}>°C</Text>
                                </HStack>
                            )}
                        </HStack>

                        {/* Device Categories Multi-select */}
                        <FormControl>
                            <FormLabel fontSize="xs" fontWeight={600} color={subText} mb={1.5}>Device Categories to Alert</FormLabel>
                            <SearchableSelector
                                isMulti
                                closeMenuOnSelect={false}
                                size="sm"
                                onChange={(e: Option[] | null) => setFormConfig({ ...formConfig, notificationCategories: e ? e.map(({ value }) => value) : [] })}
                                options={deviceCategories.map(cat => ({
                                    label: cat,
                                    value: cat
                                }))}
                                value={(formConfig.notificationCategories || []).map(cat => ({
                                    label: cat,
                                    value: cat
                                }))}
                                name="categories"
                                noOptionsMessage="No device categories configured"
                            />
                        </FormControl>
                    </ModalBody>

                    <ModalFooter borderTop="1px solid" borderColor={border} py={2.5} px={4}>
                        <HStack gap={2} w="100%" justifyContent="flex-end">
                            <Button size="sm" variant="outline" borderRadius="md" onClick={onClose} isDisabled={isSaving}>
                                Cancel
                            </Button>
                            <Button size="sm" colorScheme="orange" borderRadius="md" onClick={saveConfig} isLoading={isSaving}>
                                Save Settings
                            </Button>
                        </HStack>
                    </ModalFooter>
                </ModalContent>
            </Modal>}
        </MyCard>
    );
};

export default ThermocoupleCard;
