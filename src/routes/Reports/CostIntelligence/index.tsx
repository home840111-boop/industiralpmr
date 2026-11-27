import {
    Badge,
    Box,
    Button,
    Divider,
    Flex,
    FormControl,
    FormLabel,
    GridItem,
    HStack,
    Input,
    Progress,
    SimpleGrid,
    Stack,
    Text,
    Textarea,
    useColorMode,
    useToast,
} from "@chakra-ui/react";
import { Column, Pie, RadialBar } from "@ant-design/plots";
import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet";
import dayjs from "../../../Components/Functions/dayjs";
import { get, push, update } from "../../../Components/firebase/api/db";
import { PrimaryInput } from "../../../Components/Inputs";
import PrimaryNumberInput from "../../../Components/Inputs/PrimaryNumberInput";
import MyCard from "../../../Components/micro/Card";
import NotFoundAlert from "../../../Components/micro/NotFoundAlert";
import {
    baseDepartmentAtom,
    isMasterAdminAtom,
    roleAtom,
    uidAtom,
} from "../../../Components/Store/atoms";
import Listen from "../../../Components/Store/hooks/Listen";
import { isAdminUser, isMasterOwner } from "../../../Services/rbac";
import {
    calculateDailyProductionCost,
    costIntelligencePaths,
    DailyProductionInput,
    defaultDailyProductionInput,
    defaultMasterSettings,
    DailyProductionLog,
    MasterSettingsDraft,
} from "../../../Components/firebase/api/costIntelligence";

type MasterSettingsRecord = MasterSettingsDraft & {
    id: string;
    createdAt: number;
    updatedAt: number;
};

const currency = new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    maximumFractionDigits: 2,
});

const formatCurrency = (value: number) => currency.format(Number.isFinite(value) ? value : 0);

const formatCompactCurrency = (value: number) => {
    if (!Number.isFinite(value)) return "PKR 0";
    return `PKR ${new Intl.NumberFormat("en-PK", {
        maximumFractionDigits: 1,
        notation: "compact",
    }).format(value)}`;
};

const NumberField = ({
    label,
    value,
    onChange,
    helper,
    step = 1,
    min = 0,
}: {
    label: string;
    value: number;
    onChange: (value: number) => void;
    helper?: string;
    step?: number;
    min?: number;
}) => {
    return <FormControl>
        <FormLabel fontSize="sm" fontWeight={600}>{label}</FormLabel>
        <PrimaryNumberInput
            placeholder=""
            min={min}
            step={step}
            value={Number.isFinite(value) ? value : 0}
            onChange={(_, nextValue) => onChange(Number.isFinite(nextValue) ? nextValue : 0)}
        />
        {helper ? <Text mt={1} fontSize="xs" color="gray.500">{helper}</Text> : null}
    </FormControl>;
};

const CostIntelligence = () => {
    const toast = useToast();
    const { colorMode } = useColorMode();
    const uid = Listen(uidAtom);
    const role = Listen(roleAtom);
    Listen(isMasterAdminAtom);
    const baseDepts = Listen(baseDepartmentAtom);
    const isAuthLoaded = uid !== null && role !== null;
    const hasAccess = isMasterOwner(uid) || (isAdminUser(uid) && (baseDepts || []).includes("all"));
    const [settingsMeta, setSettingsMeta] = useState<MasterSettingsRecord>({
        ...defaultMasterSettings,
        id: "",
        createdAt: 0,
        updatedAt: 0,
    });
    const [masterSettings, setMasterSettings] = useState<MasterSettingsDraft>(defaultMasterSettings);
    const [dailyInput, setDailyInput] = useState<DailyProductionInput>(defaultDailyProductionInput);
    const [productionDate, setProductionDate] = useState(dayjs().format("YYYY-MM-DD"));
    const [notes, setNotes] = useState("");
    const [isLoadingSettings, setIsLoadingSettings] = useState(true);
    const [isSavingSettings, setIsSavingSettings] = useState(false);
    const [isSavingLog, setIsSavingLog] = useState(false);

    useEffect(() => {
        if (!isAuthLoaded || !hasAccess) return;
        const load = async () => {
            try {
                const snap = await get(`${costIntelligencePaths.masterSettings}/active`);
                if (snap.exists()) {
                    const value = snap.val() as Partial<MasterSettingsRecord>;
                    const id = value.id || crypto.randomUUID();
                    const createdAt = value.createdAt || Date.now();
                    const updatedAt = value.updatedAt || createdAt;
                    const mergedSettings = {
                        ...defaultMasterSettings,
                        ...value,
                    } as MasterSettingsRecord;
                    const { id: _loadedId, createdAt: _loadedCreatedAt, updatedAt: _loadedUpdatedAt, ...nextSettings } = mergedSettings;
                    setMasterSettings(nextSettings);
                    setSettingsMeta({
                        ...nextSettings,
                        id,
                        createdAt,
                        updatedAt,
                    });
                } else {
                    const id = crypto.randomUUID();
                    const now = Date.now();
                    setSettingsMeta({
                        ...defaultMasterSettings,
                        id,
                        createdAt: now,
                        updatedAt: now,
                    });
                }
            } catch (error) {
                toast({
                    title: "Settings load failed",
                    description: "Using default master settings until the connection is restored.",
                    status: "warning",
                    position: "bottom-right",
                    duration: 4000,
                    isClosable: true,
                });
            } finally {
                setIsLoadingSettings(false);
            }
        };

        load();
    }, [toast, isAuthLoaded, hasAccess]);

    const breakdown = useMemo(() => calculateDailyProductionCost(masterSettings, dailyInput), [masterSettings, dailyInput]);
    const profitable = breakdown.netProfit >= 0;
    const totalCost = breakdown.totalRealCost;
    const totalRevenue = breakdown.totalRevenue;

    const costSeries = useMemo(() => ([
        { name: "Material", value: breakdown.materialCostPerPiece },
        { name: "Electricity", value: breakdown.electricityCostPerPiece },
        { name: "Labor", value: breakdown.laborCostPerPiece },
        { name: "Depreciation", value: breakdown.depreciationPerPiece },
        { name: "Mold", value: breakdown.moldAmortizationPerPiece },
    ]), [breakdown]);

    const totalCostSeries = useMemo(() => ([
        { name: "Material", value: breakdown.materialCostPerPiece * breakdown.goodPieces },
        { name: "Electricity", value: breakdown.electricityCostPerPiece * breakdown.goodPieces },
        { name: "Labor", value: breakdown.laborCostPerPiece * breakdown.goodPieces },
        { name: "Depreciation", value: breakdown.depreciationPerPiece * breakdown.goodPieces },
        { name: "Mold", value: breakdown.moldAmortizationPerPiece * breakdown.goodPieces },
        { name: "Waste", value: breakdown.wasteCost },
    ]).filter((entry) => entry.value > 0), [breakdown]);

    const productionMix = useMemo(() => ([
        { name: "Good", value: breakdown.goodPieces },
        { name: "Rejected", value: dailyInput.totalRejectedPieces },
    ]).filter((entry) => entry.value > 0), [breakdown.goodPieces, dailyInput.totalRejectedPieces]);

    const saveMasterSettings = async () => {
        if (!hasAccess) return;
        setIsSavingSettings(true);
        try {
            const now = Date.now();
            const id = settingsMeta.id || crypto.randomUUID();
            const payload: MasterSettingsRecord = {
                ...masterSettings,
                id,
                createdAt: settingsMeta.createdAt || now,
                updatedAt: now,
            };
            await update(`${costIntelligencePaths.masterSettings}/active`, payload);
            setSettingsMeta(payload);
            toast({
                title: "Master settings saved",
                description: "The active cost assumptions have been updated.",
                status: "success",
                position: "bottom-right",
                duration: 3000,
                isClosable: true,
            });
        } catch (error) {
            toast({
                title: "Unable to save settings",
                description: "Check your connection and try again.",
                status: "error",
                position: "bottom-right",
                duration: 4000,
                isClosable: true,
            });
        } finally {
            setIsSavingSettings(false);
        }
    };

    const saveDailyLog = async () => {
        if (!hasAccess) return;
        setIsSavingLog(true);
        try {
            const now = Date.now();
            const payload: DailyProductionLog = {
                id: crypto.randomUUID(),
                masterSettingsId: settingsMeta.id || crypto.randomUUID(),
                productionDate,
                totalProducedPieces: dailyInput.totalProducedPieces,
                totalRejectedPieces: dailyInput.totalRejectedPieces,
                actualMaterialUsedKg: dailyInput.actualMaterialUsedKg,
                totalKwhConsumed: dailyInput.totalKwhConsumed,
                totalMachineOnTimeHours: dailyInput.totalMachineOnTimeHours,
                sellingPricePerPiece: dailyInput.sellingPricePerPiece,
                notes: notes || undefined,
                calculated: breakdown,
                createdAt: now,
                updatedAt: now,
            };
            await push(costIntelligencePaths.dailyProductionLogs, payload);
            toast({
                title: "Daily log saved",
                description: "The production snapshot is stored with its profitability breakdown.",
                status: "success",
                position: "bottom-right",
                duration: 3000,
                isClosable: true,
            });
        } catch (error) {
            toast({
                title: "Unable to save log",
                description: "Check your connection and try again.",
                status: "error",
                position: "bottom-right",
                duration: 4000,
                isClosable: true,
            });
        } finally {
            setIsSavingLog(false);
        }
    };

    const pieConfig = useMemo(() => ({
        data: totalCostSeries.length > 0 ? totalCostSeries : [{ name: "No data", value: 1 }],
        angleField: "value",
        colorField: "name",
        radius: 0.95,
        innerRadius: 0.68,
        legend: { position: "bottom" as const },
        tooltip: {
            formatter: (datum: any) => ({
                name: datum.name,
                value: formatCurrency(datum.value),
            }),
        },
        label: {
            type: "inner" as const,
            offset: "-50%" as const,
            autoRotate: false,
            formatter: (_text: string, item: any) => formatCompactCurrency(item._origin.value),
            style: {
                textAlign: "center" as const,
            },
        },
        interactions: [{ type: "element-selected" }, { type: "element-active" }],
    }), [totalCostSeries]);

    const columnConfig = useMemo(() => ({
        data: costSeries,
        xField: "name",
        yField: "value",
        legend: false,
        columnStyle: {
            radius: [8, 8, 0, 0],
        },
        tooltip: {
            formatter: (datum: any) => ({
                name: datum.name,
                value: formatCurrency(datum.value),
            }),
        },
        color: ({ name }: { name: string }) => {
            const palette: Record<string, string> = {
                Material: "#ED8936",
                Electricity: "#3182CE",
                Labor: "#0F766E",
                Depreciation: "#7C3AED",
                Mold: "#059669",
            };
            return palette[name] || "#ED8936";
        },
        label: {
            position: "top" as const,
            formatter: (datum: any) => formatCompactCurrency(datum.value),
            style: {
                fill: colorMode === "dark" ? "RGBA(255,255,255,0.72)" : "#4A5568",
            },
        },
    }), [costSeries, colorMode]);

    const radialConfig = useMemo(() => ({
        data: productionMix,
        xField: "name",
        yField: "value",
        colorField: "name",
        maxAngle: 280,
        radius: 0.92,
        innerRadius: 0.64,
        barStyle: { lineCap: "round" as const },
        color: ({ name }: { name: string }) => (name === "Good" ? "#16A34A" : "#DC2626"),
        tooltip: {
            formatter: (datum: any) => ({
                name: datum.name,
                value: `${datum.value} pcs`,
            }),
        },
    }), [productionMix]);

    const marginProgress = Math.max(Math.min(breakdown.marginPercent, 100), 0);
    const netMarginProgress = Math.max(Math.min(breakdown.netMarginPercent, 100), 0);

    if (isAuthLoaded && !hasAccess) {
        return <NotFoundAlert
            title="Access Denied"
            description="Only administrators with full factory access can view or manage Cost Intelligence."
        />;
    }

    return <Box position="relative" overflow="hidden">
        <Helmet>
            <title>Cost Intelligence | industrialpmr</title>
        </Helmet>
        <Box
            position="absolute"
            inset={0}
            pointerEvents="none"
            opacity={0.12}
            bgGradient={colorMode === "dark" ? "radial-gradient(circle at top right, #ED8936 0%, transparent 32%), radial-gradient(circle at bottom left, #16A34A 0%, transparent 28%)" : "radial-gradient(circle at top right, #ED8936 0%, transparent 30%), radial-gradient(circle at bottom left, #38BDF8 0%, transparent 26%)"}
        />
        <Stack position="relative" gap={4}>
            <MyCard py={4} px={4}>
                <Flex direction={{ base: "column", xl: "row" }} justify="space-between" gap={4} align={{ base: "stretch", xl: "center" }}>
                    <Box>
                        <Badge colorScheme={profitable ? "green" : "red"} mb={2} px={2} py={0.5} borderRadius="full" fontSize="xs">
                            {profitable ? "Profitable" : "Loss making"}
                        </Badge>
                        <Text fontSize={{ base: "xl", md: "2xl" }} fontWeight={700} lineHeight={1.1}>
                            Cost Intelligence Engine
                        </Text>
                        <Text mt={1} maxW="2xl" fontSize="sm" color="gray.500">
                            Compare real production cost against your selling price using live factory inputs and master settings.
                            Every saved log keeps its own profit snapshot for auditability.
                        </Text>
                    </Box>
                    <SimpleGrid columns={{ base: 2, md: 4 }} gap={3} minW={{ xl: "40rem" }}>
                        <Box borderRadius="lg" p={3} bg="blackAlpha.50">
                            <Text fontSize="xs" textTransform="uppercase" color="gray.500">Good pieces</Text>
                            <Text fontSize="lg" fontWeight={700}>{breakdown.goodPieces}</Text>
                        </Box>
                        <Box borderRadius="lg" p={3} bg="blackAlpha.50">
                            <Text fontSize="xs" textTransform="uppercase" color="gray.500">Real cost / pc</Text>
                            <Text fontSize="lg" fontWeight={700}>{formatCurrency(breakdown.totalRealCostPerPiece)}</Text>
                        </Box>
                        <Box borderRadius="lg" p={3} bg="blackAlpha.50">
                            <Text fontSize="xs" textTransform="uppercase" color="gray.500">Net profit</Text>
                            <Text fontSize="lg" fontWeight={700} color={profitable ? "green.500" : "red.500"}>{formatCurrency(breakdown.netProfit)}</Text>
                        </Box>
                        <Box borderRadius="lg" p={3} bg="blackAlpha.50">
                            <Text fontSize="xs" textTransform="uppercase" color="gray.500">Net margin</Text>
                            <Text fontSize="lg" fontWeight={700}>{breakdown.netMarginPercent}%</Text>
                        </Box>
                    </SimpleGrid>
                </Flex>
            </MyCard>

            <SimpleGrid columns={{ base: 1, xl: 2 }} gap={4}>
                <MyCard py={4} px={4}>
                    <Stack gap={3}>
                        <HStack justify="space-between" align="start" flexWrap="wrap">
                            <Box>
                                <Text fontSize="md" fontWeight={700}>Daily Production Log</Text>
                                <Text fontSize="xs" color="gray.500">Input the actual shop floor snapshot for one day.</Text>
                            </Box>
                            <HStack>
                                <Badge colorScheme="orange" fontSize="xs">RTDB</Badge>
                                <Badge colorScheme="blue" fontSize="xs">Daily snapshot</Badge>
                            </HStack>
                        </HStack>
                        <SimpleGrid columns={{ base: 1, md: 2 }} gap={3}>
                            <FormControl>
                                <FormLabel fontSize="xs" fontWeight={600}>Production date</FormLabel>
                                <Input type="date" value={productionDate} onChange={(event) => setProductionDate(event.target.value)} focusBorderColor="primary" />
                            </FormControl>
                            <NumberField label="Total produced pieces" value={dailyInput.totalProducedPieces} onChange={(value) => setDailyInput((prev) => ({ ...prev, totalProducedPieces: value }))} />
                            <NumberField label="Total rejected pieces" value={dailyInput.totalRejectedPieces} onChange={(value) => setDailyInput((prev) => ({ ...prev, totalRejectedPieces: value }))} />
                            <NumberField label="Total kWh consumed" step={0.1} value={dailyInput.totalKwhConsumed} onChange={(value) => setDailyInput((prev) => ({ ...prev, totalKwhConsumed: value }))} />
                            <NumberField label="Actual material used (kg)" step={0.1} value={dailyInput.actualMaterialUsedKg} onChange={(value) => setDailyInput((prev) => ({ ...prev, actualMaterialUsedKg: value }))} />
                            <NumberField label="Machine on-time (hours)" step={0.1} value={dailyInput.totalMachineOnTimeHours} onChange={(value) => setDailyInput((prev) => ({ ...prev, totalMachineOnTimeHours: value }))} />
                            <NumberField label="Selling price / piece" step={0.1} value={dailyInput.sellingPricePerPiece} onChange={(value) => setDailyInput((prev) => ({ ...prev, sellingPricePerPiece: value }))} />
                        </SimpleGrid>
                        <FormControl>
                            <FormLabel fontSize="xs" fontWeight={600}>Notes</FormLabel>
                            <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Optional production notes, machine issues, or shift comments." />
                        </FormControl>
                        <HStack justify="end">
                            <Button size="sm" colorScheme="orange" variant="outline" onClick={saveDailyLog} isLoading={isSavingLog}>
                                Save production log
                            </Button>
                        </HStack>
                    </Stack>
                </MyCard>

                <MyCard py={4} px={4}>
                    <Stack gap={3}>
                        <HStack justify="space-between" align="start" flexWrap="wrap">
                            <Box>
                                <Text fontSize="md" fontWeight={700}>Master Settings</Text>
                                <Text fontSize="xs" color="gray.500">These values define the reference cost model for every log.</Text>
                            </Box>
                            <Badge colorScheme="purple" fontSize="xs">Active model</Badge>
                        </HStack>
                        {isLoadingSettings ? <Text color="gray.500" fontSize="sm">Loading master settings...</Text> : <SimpleGrid columns={{ base: 1, md: 2 }} gap={3}>
                            <FormControl>
                                <FormLabel fontSize="xs" fontWeight={600}>Setting name</FormLabel>
                                <PrimaryInput placeholder="" value={masterSettings.name} onChange={(event) => setMasterSettings((prev) => ({ ...prev, name: event.target.value }))} />
                            </FormControl>
                            <NumberField label="Version" min={1} step={1} value={masterSettings.version} onChange={(value) => setMasterSettings((prev) => ({ ...prev, version: Math.max(1, Math.floor(value)) }))} />
                            <NumberField label="Electricity rate / kWh (PKR)" step={0.1} value={masterSettings.electricityRatePerKwh} onChange={(value) => setMasterSettings((prev) => ({ ...prev, electricityRatePerKwh: value }))} />
                            <NumberField label="Material cost / kg (PKR)" step={0.1} value={masterSettings.materialCostPerKg} onChange={(value) => setMasterSettings((prev) => ({ ...prev, materialCostPerKg: value }))} />
                            <NumberField label="Labor cost / hour (PKR)" step={0.1} value={masterSettings.laborCostPerHour} onChange={(value) => setMasterSettings((prev) => ({ ...prev, laborCostPerHour: value }))} />
                            <NumberField label="Labor pieces / hour" step={0.1} value={masterSettings.laborPiecesPerHour} onChange={(value) => setMasterSettings((prev) => ({ ...prev, laborPiecesPerHour: value }))} />
                            <NumberField label="Machine purchase price (PKR)" step={1} value={masterSettings.machinePurchasePrice} onChange={(value) => setMasterSettings((prev) => ({ ...prev, machinePurchasePrice: value }))} />
                            <NumberField label="Useful life (hours)" min={1} step={1} value={masterSettings.machineUsefulLifeHours} onChange={(value) => setMasterSettings((prev) => ({ ...prev, machineUsefulLifeHours: Math.max(1, Math.floor(value)) }))} />
                            <NumberField label="Mold cost (PKR)" step={1} value={masterSettings.moldCost} onChange={(value) => setMasterSettings((prev) => ({ ...prev, moldCost: value }))} />
                            <NumberField label="Expected life cycles" min={1} step={1} value={masterSettings.moldExpectedLifeCycles} onChange={(value) => setMasterSettings((prev) => ({ ...prev, moldExpectedLifeCycles: Math.max(1, Math.floor(value)) }))} />
                        </SimpleGrid>}
                        <HStack justify="end">
                            <Button size="sm" colorScheme="orange" onClick={saveMasterSettings} isLoading={isSavingSettings || isLoadingSettings}>
                                Save master settings
                            </Button>
                        </HStack>
                    </Stack>
                </MyCard>
            </SimpleGrid>

            <SimpleGrid columns={{ base: 1, xl: 3 }} gap={4}>
                <GridItem>
                    <MyCard py={4} px={4}>
                        <Stack gap={3}>
                            <Box>
                                <Text fontSize="md" fontWeight={700}>Cost composition</Text>
                                <Text fontSize="xs" color="gray.500">Per-piece cost structure used by the engine.</Text>
                            </Box>
                            <Box>
                                <Pie {...pieConfig as any} height={240} />
                            </Box>
                        </Stack>
                    </MyCard>
                </GridItem>
                <GridItem>
                    <MyCard py={4} px={4}>
                        <Stack gap={3}>
                            <Box>
                                <Text fontSize="md" fontWeight={700}>Unit cost bridge</Text>
                                <Text fontSize="xs" color="gray.500">Compare the cost stack against your selling price.</Text>
                            </Box>
                            <Box>
                                <Column {...columnConfig as any} height={240} />
                            </Box>
                        </Stack>
                    </MyCard>
                </GridItem>
                <GridItem>
                    <MyCard py={4} px={4}>
                        <Stack gap={3}>
                            <Box>
                                <Text fontSize="md" fontWeight={700}>Production health</Text>
                                <Text fontSize="xs" color="gray.500">Good vs rejected output and profit status.</Text>
                            </Box>
                            <Box>
                                <RadialBar {...radialConfig as any} height={240} />
                            </Box>
                            <Stack gap={2}>
                                <Box>
                                    <HStack justify="space-between" mb={1}>
                                        <Text fontSize="xs" fontWeight={600}>Gross margin</Text>
                                        <Text fontSize="xs">{breakdown.marginPercent}%</Text>
                                    </HStack>
                                    <Progress value={marginProgress} colorScheme={profitable ? "green" : "red"} borderRadius="full" />
                                </Box>
                                <Box>
                                    <HStack justify="space-between" mb={1}>
                                        <Text fontSize="xs" fontWeight={600}>Net margin</Text>
                                        <Text fontSize="xs">{breakdown.netMarginPercent}%</Text>
                                    </HStack>
                                    <Progress value={netMarginProgress} colorScheme={profitable ? "green" : "red"} borderRadius="full" />
                                </Box>
                                <Divider />
                                <HStack justify="space-between">
                                    <Text fontSize="xs" color="gray.500">Total real cost</Text>
                                    <Text fontSize="sm" fontWeight={700}>{formatCurrency(totalCost)}</Text>
                                </HStack>
                                <HStack justify="space-between">
                                    <Text fontSize="xs" color="gray.500">Total revenue</Text>
                                    <Text fontSize="sm" fontWeight={700}>{formatCurrency(totalRevenue)}</Text>
                                </HStack>
                                <HStack justify="space-between">
                                    <Text fontSize="xs" color="gray.500">Waste cost</Text>
                                    <Text fontSize="sm" fontWeight={700}>{formatCurrency(breakdown.wasteCost)}</Text>
                                </HStack>
                                <HStack justify="space-between">
                                    <Text fontSize="xs" color="gray.500">Saved snapshot</Text>
                                    <Text fontSize="xs" fontWeight={600}>{settingsMeta.id ? `ID ${settingsMeta.id.slice(0, 8)}` : "Not saved yet"}</Text>
                                </HStack>
                            </Stack>
                        </Stack>
                    </MyCard>
                </GridItem>
            </SimpleGrid>
        </Stack>
    </Box>;
};

export default CostIntelligence;