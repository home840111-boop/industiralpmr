import {
    Box,
    VStack,
    HStack,
    SimpleGrid,
    Skeleton,
    SkeletonText,
    useToast,
    useColorMode,
    Text,
    Tabs,
    TabList,
    TabPanels,
    Tab,
    TabPanel,
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    Badge,
    Button,
    Icon,
} from "@chakra-ui/react";
import { useEffect, useState, useMemo } from "react";
import { useParams, Link as RouterLink } from "react-router-dom";
import { MdSettings } from "react-icons/md";
import { Pie, Column } from "@ant-design/plots";
import dayjs from "../../../../../Components/Functions/dayjs";
import { get, listen, update } from "../../../../../Components/firebase/api/db";
import store from "../../../../../Components/Store";
import { dateAtom, shiftsAtom, machinesAtom, uidAtom, roleAtom, isMasterAdminAtom } from "../../../../../Components/Store/atoms";
import Get from "../../../../../Components/Store/hooks/Get";
import Listen from "../../../../../Components/Store/hooks/Listen";
import NotFoundAlert from "../../../../../Components/micro/NotFoundAlert";
import { canWriteOperational } from "../../../../../Services/rbac";
import { dbSchemaHourlyRecord, dbSchemaNow, dbSchemaRecord, AccumulatorsData } from "../types";
import LiveTelemetryStatus from "./LiveTelemetryStatus";
import { useDeviceTelemetry } from "../../../../../Services/telemetry";
import { setCachedUnitMac } from "../../../../../Services/telemetry/useUnitMac";
import DataGrid from "./DataGrid";
import HourlyTrendChart from "./HourlyTrendChart";

import RealTimeGauges from "./RealTimeGauges";
import CustomDatePicker from "../../../../../Components/micro/CustomDatePicker";
import MyCard from "../../../../../Components/micro/Card";
import MyTooltip from "../../../../../Components/micro/MyTooltip";
import { DateRange } from "react-day-picker";
import AlertSettings from "../Alerts/AlertSettings";
import AlertPanel from "../Alerts/AlertPanel";
import { MachineThresholds, AlertIncident } from "../Alerts/types";
import { loadMachineThresholds, saveMachineThresholds } from "../Alerts/firebaseUtils";
import { pickMetric, pickPFMetric } from "../../../../../Components/Functions/powerTransformers";

// Set to true to use dummy data for testing
const DUMMY_DATA = false;

// Generate random value within range
const randomInRange = (min: number, max: number, decimals: number = 0): number => {
    const value = Math.random() * (max - min) + min;
    return parseFloat(value.toFixed(decimals));
};

const toBinaryState = (value: any): 0 | 1 => {
    if (typeof value === "boolean") return value ? 1 : 0;
    const normalized = Number(value);
    return normalized === 1 ? 1 : 0;
};

const getOptionLabelFromInputs = (rawInputs: any, key: "X1" | "X2" | "X3"): string => {
    const entry = rawInputs?.[key];
    if (typeof entry === "string") return entry;
    if (entry && typeof entry.label === "string" && entry.label.trim()) return entry.label.trim();
    return key;
};

// Generate dummy data for testing
const generateDummyData = () => {
    // Generate phase data with realistic values
    const generatePhaseData = () => ({
        volt: randomInRange(200, 250, 1),
        amp: randomInRange(10, 80, 3),
        power: randomInRange(5000, 45000, 3),
        apparentPower: randomInRange(6000, 50000, 3),
        powerFactor: randomInRange(0.75, 0.98, 2),
        reactivePower: randomInRange(-15000, 15000, 3),
        voltTHD: randomInRange(1, 8, 2),
        ampTHD: randomInRange(3, 25, 2),
        lineVoltage: randomInRange(380, 440, 1),
        lineVoltageTHD: randomInRange(1, 8, 2),
    });

    const R = generatePhaseData();
    const S = generatePhaseData();
    const T = generatePhaseData();

    // Real-time data (now)
    const now: dbSchemaNow = {
        isOnline: Math.random() > 0.1 ? true : "RESTORING",
        updated: Date.now() / 1000,
        version: "3.15.6",
        R,
        S,
        T,
        optionStates: {
            X1: Math.random() > 0.5 ? 1 : 0,
            X2: Math.random() > 0.5 ? 1 : 0,
            X3: Math.random() > 0.5 ? 1 : 0,
        },
        rawTelemetry: {
            X1_last_shot: Math.floor(Date.now() / 1000) - Math.floor(randomInRange(5, 15, 0)),
            X2_last_shot: Math.floor(Date.now() / 1000) - Math.floor(randomInRange(5, 15, 0)),
            X3_last_shot: Math.floor(Date.now() / 1000) - Math.floor(randomInRange(5, 15, 0)),
            X1_cycle_time: randomInRange(12, 18, 2),
            X2_cycle_time: randomInRange(12, 18, 2),
            X3_cycle_time: randomInRange(12, 18, 2),
            timestamp: Math.floor(Date.now() / 1000),
        },
        SUM: {
            volt: randomInRange(200, 250, 1),
            amp: R.amp + S.amp + T.amp + randomInRange(-5, 5, 3),
            power: R.power + S.power + T.power + randomInRange(-1000, 1000, 3),
            apparentPower: R.apparentPower + S.apparentPower + T.apparentPower + randomInRange(-1000, 1000, 3),
            powerFactor: randomInRange(0.8, 0.95, 2),
            reactivePower: R.reactivePower + S.reactivePower + T.reactivePower + randomInRange(-1000, 1000, 3),
            frequency: randomInRange(49.8, 50.2, 1),
            energyWhTotal: randomInRange(100000, 2000000, 0),
            voltTHD: randomInRange(1, 8, 2),
            ampTHD: randomInRange(3, 25, 2),
            lineVoltage: 0,
            lineVoltageTHD: 0,
        },
    };

    // Generate min/max/avg for a metric
    const generateMinMaxAvg = (baseValue: number, variation: number) => ({
        min: randomInRange(baseValue - variation, baseValue, 3),
        max: randomInRange(baseValue, baseValue + variation, 3),
        avg: baseValue,
    });

    // Daily aggregate data
    const generateDailyPhaseData = (phaseNow: any) => ({
        volt: generateMinMaxAvg(phaseNow.volt, 10),
        lineVoltage: generateMinMaxAvg(phaseNow.lineVoltage, 20),
        amp: generateMinMaxAvg(phaseNow.amp, 15),
        power: generateMinMaxAvg(phaseNow.power, 8000),
        apparentPower: generateMinMaxAvg(phaseNow.apparentPower, 9000),
        powerFactor: {
            lag_min: randomInRange(0.8, 0.9, 3),
            lead_min: -randomInRange(0.8, 0.9, 3),
            avg: phaseNow.powerFactor,
            avg_sum: phaseNow.powerFactor * 4,
            avg_count: 4
        },
        reactivePower: generateMinMaxAvg(phaseNow.reactivePower, 5000),
        consumption: randomInRange(100, 1000, 3),
        voltTHD: generateMinMaxAvg(phaseNow.voltTHD, 2),
        ampTHD: generateMinMaxAvg(phaseNow.ampTHD, 5),
    });

    const daily: dbSchemaRecord = {
        R: generateDailyPhaseData(R),
        S: generateDailyPhaseData(S),
        T: generateDailyPhaseData(T),
        SUM: {
            ...generateDailyPhaseData(now.SUM),
            frequency: generateMinMaxAvg(now.SUM.frequency, 0.3),
        },
    };

    // Hourly data (24 hours)
    const hourly: dbSchemaHourlyRecord = {};
    for (let hour = 0; hour < 24; hour++) {
        const hourR = generatePhaseData();
        const hourS = generatePhaseData();
        const hourT = generatePhaseData();

        hourly[hour] = {
            R: generateDailyPhaseData(hourR),
            S: generateDailyPhaseData(hourS),
            T: generateDailyPhaseData(hourT),
            SUM: {
                ...generateDailyPhaseData({
                    volt: randomInRange(200, 250, 1),
                    amp: hourR.amp + hourS.amp + hourT.amp,
                    power: hourR.power + hourS.power + hourT.power,
                    apparentPower: hourR.apparentPower + hourS.apparentPower + hourT.apparentPower,
                    powerFactor: randomInRange(0.8, 0.95, 2),
                    reactivePower: hourR.reactivePower + hourS.reactivePower + hourT.reactivePower,
                    voltTHD: randomInRange(1, 8, 2),
                    ampTHD: randomInRange(3, 25, 2),
                }),
                frequency: generateMinMaxAvg(randomInRange(49.8, 50.2, 1), 0.2),
            },
        };
    }

    const dailyTotal = {
        ontime: randomInRange(10000, 50000, 0),
        shots: randomInRange(500, 3000, 0),
        production_meters: randomInRange(500, 3000, 0),
    };

    return { now, daily, hourly, dailyTotal };
};

const toMilliseconds = (timestamp: number): number => {
    return timestamp < 1e12 ? timestamp * 1000 : timestamp;
};

const formatDurationFromSeconds = (seconds: number): string => {
    const safeSeconds = Math.max(0, Math.floor(seconds));
    const minutes = Math.floor(safeSeconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${safeSeconds % 60}s`;
    return `${safeSeconds}s`;
};

// Transform flat Firebase structure to nested dbSchemaNow structure
const transformFirebaseData = (rawData: any): dbSchemaNow => {
    return {
        isOnline: rawData.isOnline || false,
        updated: rawData.timestamp || rawData.updated || rawData.packetID || Date.now() / 1000,
        version: rawData.version !== undefined && rawData.version !== null ? String(rawData.version) : undefined,
        optionStates: {
            X1: toBinaryState(rawData.X1),
            X2: toBinaryState(rawData.X2),
            X3: toBinaryState(rawData.X3),
        },
        rawTelemetry: {
            X1_last_shot: rawData.X1_last_shot,
            X2_last_shot: rawData.X2_last_shot,
            X3_last_shot: rawData.X3_last_shot,
            X1_cycle_time: rawData.X1_cycle_time,
            X2_cycle_time: rawData.X2_cycle_time,
            X3_cycle_time: rawData.X3_cycle_time,
            timestamp: rawData.timestamp,
        },
        R: {
            volt: rawData.V_RN || 0,
            amp: rawData.I_R || 0,
            power: rawData.W_R || 0,
            apparentPower: rawData.VA_R || 0,
            powerFactor: rawData.PF_R || 0,
            reactivePower: rawData.Var_R || 0,
            voltTHD: rawData.V_RN_THD || 0,
            ampTHD: rawData.I_R_THD || 0,
            lineVoltage: rawData.V_RS || 0,
            lineVoltageTHD: rawData.V_RS_THD || 0,
        },
        S: {
            volt: rawData.V_SN || 0,
            amp: rawData.I_S || 0,
            power: rawData.W_S || 0,
            apparentPower: rawData.VA_S || 0,
            powerFactor: rawData.PF_S || 0,
            reactivePower: rawData.Var_S || 0,
            voltTHD: rawData.V_SN_THD || 0,
            ampTHD: rawData.I_S_THD || 0,
            lineVoltage: rawData.V_ST || 0,
            lineVoltageTHD: rawData.V_ST_THD || 0,
        },
        T: {
            volt: rawData.V_TN || 0,
            amp: rawData.I_T || 0,
            power: rawData.W_T || 0,
            apparentPower: rawData.VA_T || 0,
            powerFactor: rawData.PF_T || 0,
            reactivePower: rawData.Var_T || 0,
            voltTHD: rawData.V_TN_THD || 0,
            ampTHD: rawData.I_T_THD || 0,
            lineVoltage: rawData.V_TR || 0,
            lineVoltageTHD: rawData.V_TR_THD || 0,
        },
        SUM: {
            volt: rawData.SUM_VL || 0,
            amp: rawData.SUM_A || 0,
            neutralCurrent: rawData.SUM_An || rawData.SUM_A || 0,
            power: rawData.SUM_W || 0,
            apparentPower: rawData.SUM_VA || 0,
            powerFactor: rawData.SUM_PF || 0,
            reactivePower: rawData.SUM_Var || 0,
            frequency: rawData.SUM_HZ || 0,
            energyWhTotal: rawData.SUM_WH_Total || 0,
            voltTHD: rawData.SUM_V_THD || 0,
            ampTHD: rawData.SUM_A_THD || 0,
            lineVoltage: 0,
            lineVoltageTHD: 0,
        },
    };
};

// Transform Firebase daily/hourly data structure to match TypeScript types
const transformPhaseData = (rawPhase: any): any => {
    if (!rawPhase) return null;

    return {
        volt: pickMetric(rawPhase, ["VOLTAGE", "VOLT", "LN_VOLTAGE", "V_LN"]),
        lineVoltage: pickMetric(rawPhase, ["L_L_VOLTAGE", "LL_VOLTAGE", "L-L_VOLTAGE", "LINE_TO_LINE_VOLTAGE", "LINE_VOLTAGE", "V_LL"]),
        amp: pickMetric(rawPhase, ["AMPERE", "CURRENT", "AMP", "I"]),
        power: pickMetric(rawPhase, ["POWER", "ACTIVE_POWER", "W", "KW"]),
        apparentPower: pickMetric(rawPhase, ["APPARENT_POWER", "VA", "KVA"]),
        powerFactor: pickPFMetric(rawPhase, ["POWER_FACTOR", "PF", "SUM_PF", "PF_R", "PF_S", "PF_T", "power_factor", "powerFactor", "pf"]),
        reactivePower: pickMetric(rawPhase, ["REACTIVE_POWER", "VAR", "KVAR"]),
        consumption: Number(rawPhase.CONSUMPTION || rawPhase.ENERGY || 0),
        voltTHD: pickMetric(rawPhase, ["VOLTAGE_THD", "VOLT_THD", "V_THD"]),
        ampTHD: pickMetric(rawPhase, ["CURRENT_THD", "AMPERE_THD", "I_THD", "A_THD"]),
    };
};

const transformDailyData = (rawDaily: any): dbSchemaRecord | null => {
    if (!rawDaily?.R || !rawDaily?.S || !rawDaily?.T) return null;

    const R = transformPhaseData(rawDaily.R);
    const S = transformPhaseData(rawDaily.S);
    const T = transformPhaseData(rawDaily.T);
    const SUM = transformPhaseData(rawDaily.SUM || {});

    return {
        R,
        S,
        T,
        SUM: {
            ...SUM,
            frequency: pickMetric(rawDaily.SUM || {}, ["FREQUENCY", "HZ"]),
        },
    };
};

const transformHourlyData = (rawHourly: any): dbSchemaHourlyRecord => {
    if (!rawHourly) return {};

    const transformed: dbSchemaHourlyRecord = {};

    Object.keys(rawHourly).forEach((hourKey) => {
        const hourData = rawHourly[hourKey];
        if (!hourData) return;
        const phaseValues = hourData?.phase_values || (hourData?.R ? hourData : null);
        if (phaseValues) {
            const hourIndex = parseInt(hourKey, 10);

            if (!isNaN(hourIndex)) {
                const transformedData = transformDailyData(phaseValues);
                if (transformedData) {
                    transformed[hourIndex] = {
                        ...transformedData,
                        from: hourData.from ?? (hourIndex > 86400 ? hourIndex : undefined),
                        time: hourData.time,
                    } as any;
                }
            }
        }
    });

    return transformed;
};

const PowerDashboard = () => {
    const { machineID } = useParams<{ machineID: string }>();
    const dateFromStore = Listen(dateAtom);
    const shifts = Get(shiftsAtom);
    const machinesRaw = Listen(machinesAtom);
    const uid = Listen(uidAtom);
    Listen(roleAtom);
    Listen(isMasterAdminAtom);
    const isMachinesLoaded = machinesRaw !== null;
    const isAuthorizedMachine = Boolean(machineID && machinesRaw && machinesRaw[machineID]);
    const canWrite = canWriteOperational(uid);
    const toast = useToast();
    const { colorMode } = useColorMode();

    const [selectedDate, setSelectedDate] = useState<string>(dateFromStore || dayjs().format("YYYY-MM-DD"));
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<null | {
        now: dbSchemaNow;
        daily: dbSchemaRecord | null;
        hourly: dbSchemaHourlyRecord;
        dailyTotal?: any;
    }>(null);
    const [macAddress, setMacAddress] = useState<string | null>(null);
    const [optionInputLabels, setOptionInputLabels] = useState<{ X1: string; X2: string; X3: string }>({
        X1: "X1",
        X2: "X2",
        X3: "X3",
    });
    const [accumulators, setAccumulators] = useState<AccumulatorsData | null>(null);
    const [inputsConfig, setInputsConfig] = useState<any>(null);
    const [moldName, setMoldName] = useState<string>("UNSET");
    const [dailyMolds, setDailyMolds] = useState<Record<string, any> | null>(null);
    const [selectedMoldName, setSelectedMoldName] = useState<string | null>(null);
    const [cycleTimeStats, setCycleTimeStats] = useState<any>(null);
    const [currentTime, setCurrentTime] = useState(dayjs());

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentTime(dayjs());
        }, 30000); // Tick every 30 seconds to update relative time elapsed badge
        return () => clearInterval(interval);
    }, []);

    const periodInfo = useMemo(() => {
        if (!shifts || typeof shifts.A !== "number" || !selectedDate) return null;

        try {
            const tz = "Asia/Karachi";
            const rn = currentTime.tz(tz);

            const shiftAStartSec = shifts.A;
            const hours = Math.floor(shiftAStartSec / 3600);
            const minutes = Math.floor((shiftAStartSec % 3600) / 60);

            const startStr = `${selectedDate} ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`;
            const startTime = dayjs.tz(startStr, tz);
            const endTime = startTime.add(24, "hours");

            const isCurrentReportDay = rn.isAfter(startTime) && rn.isBefore(endTime);

            const formatShiftTime = () => {
                const ampm = hours >= 12 ? 'PM' : 'AM';
                const dispHours = hours % 12 || 12;
                return `${dispHours}:${String(minutes).padStart(2, '0')} ${ampm}`;
            };

            if (isCurrentReportDay) {
                const diffMs = rn.diff(startTime);
                const diffSeconds = Math.floor(diffMs / 1000);
                const diffMinutes = Math.floor(diffSeconds / 60);
                const diffHours = Math.floor(diffMinutes / 60);

                const displayHours = diffHours;
                const displayMinutes = diffMinutes % 60;

                const label = displayHours > 0 ? `past ${displayHours}h` : `past ${displayMinutes}m`;
                const hoverLabel = displayHours > 0 ? `${displayHours}h ${displayMinutes}m` : `${displayMinutes}m`;

                return {
                    label,
                    hoverLabel: `${hoverLabel} elapsed since shift start at ${formatShiftTime()}`,
                    rawDuration: hoverLabel,
                    startTimeStr: formatShiftTime()
                };
            } else {
                return {
                    label: "24h cycle",
                    hoverLabel: `Full 24-hour shift cycle starting from ${formatShiftTime()}`,
                    rawDuration: "24h",
                    startTimeStr: formatShiftTime()
                };
            }
        } catch (err) {
            console.error("Error calculating min/max period:", err);
            return null;
        }
    }, [selectedDate, shifts, currentTime]);

    // Alert system state
    const [alertSettingsOpen, setAlertSettingsOpen] = useState(false);
    const [machineThresholds, setMachineThresholds] = useState<MachineThresholds | null>(null);
    const [alertIncidents, setAlertIncidents] = useState<AlertIncident[]>([]);
    const [historyFilter, setHistoryFilter] = useState<"all" | "active" | "resolved">("all");

    const {
        isConnected: isMqttConnected,
        isConnecting: isMqttConnecting,
        isLiveActive,
        telemetryValues,
        formattedTimestamp,
        error: mqttError,
        connectionProgress,
        reconnect,
        deviceVersion,
    } = useDeviceTelemetry(macAddress);

    const machineName = useMemo(() => {
        if (!machineID || !machinesRaw) return "";
        return machinesRaw[machineID] || "";
    }, [machineID, machinesRaw]);

    const { bgColor, border } = useMemo(() => {
        return {
            bgColor: `${colorMode}.bg`,
            border: `${colorMode}.border`,
        }
    }, [colorMode]);

    const sortedIncidents = useMemo(() => {
        return [...alertIncidents].sort((a, b) => b.startTime - a.startTime);
    }, [alertIncidents]);

    const activeAlerts = useMemo(() => {
        return sortedIncidents.filter((i) => i.status === "active" || i.status === "snoozed");
    }, [sortedIncidents]);

    const filteredHistory = useMemo(() => {
        if (historyFilter === "active") {
            return sortedIncidents.filter((i) => i.status === "active" || i.status === "snoozed");
        }
        if (historyFilter === "resolved") {
            return sortedIncidents.filter((i) => i.status === "resolved");
        }
        return sortedIncidents;
    }, [historyFilter, sortedIncidents]);

    const incidentStatusChartData = useMemo(() => {
        const activeCount = sortedIncidents.filter((i) => i.status === "active" || i.status === "snoozed").length;
        const resolvedCount = sortedIncidents.filter((i) => i.status === "resolved").length;
        return [
            { type: "Active", value: activeCount },
            { type: "Resolved", value: resolvedCount },
        ].filter((item) => item.value > 0);
    }, [sortedIncidents]);

    const incidentSeverityChartData = useMemo(() => {
        const criticalCount = sortedIncidents.filter((i) => i.severity === "critical").length;
        const warningCount = sortedIncidents.filter((i) => i.severity === "warning").length;
        return [
            { type: "Critical", value: criticalCount },
            { type: "Warning", value: warningCount },
        ].filter((item) => item.value > 0);
    }, [sortedIncidents]);

    const incidentDailyTrendData = useMemo(() => {
        const grouped = sortedIncidents.reduce((acc, incident) => {
            const dateKey = dayjs(toMilliseconds(incident.startTime)).format("DD MMM");
            acc[dateKey] = (acc[dateKey] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        return Object.entries(grouped)
            .map(([date, count]) => ({ date, count }))
            .sort((a, b) => dayjs(a.date, "DD MMM").valueOf() - dayjs(b.date, "DD MMM").valueOf())
            .slice(-10);
    }, [sortedIncidents]);

    const incidentStatusChartConfig = useMemo(() => ({
        data: incidentStatusChartData,
        angleField: "value",
        colorField: "type",
        radius: 0.9,
        innerRadius: 0.6,
        color: ["#E53E3E", "#38A169"],
        label: {
            type: "inner",
            offset: "-30%",
            content: "{value}",
            style: {
                textAlign: "center",
                fontSize: 11,
            },
        },
        legend: {
            position: "bottom",
        },
        interactions: [{ type: "element-active" }],
    }), [incidentStatusChartData]);

    const incidentSeverityChartConfig = useMemo(() => ({
        data: incidentSeverityChartData,
        angleField: "value",
        colorField: "type",
        radius: 0.9,
        innerRadius: 0.6,
        color: ["#E53E3E", "#ED8936"],
        label: {
            type: "inner",
            offset: "-30%",
            content: "{value}",
            style: {
                textAlign: "center",
                fontSize: 11,
            },
        },
        legend: {
            position: "bottom",
        },
        interactions: [{ type: "element-active" }],
    }), [incidentSeverityChartData]);

    const incidentTrendChartConfig = useMemo(() => ({
        data: incidentDailyTrendData,
        xField: "date",
        yField: "count",
        color: "#ED8936",
        columnWidthRatio: 0.55,
        yAxis: {
            nice: true,
        },
        tooltip: {
            formatter: (datum: { count: number }) => ({
                name: "Incidents",
                value: datum.count,
            }),
        },
        label: {
            position: "top",
            style: {
                fontSize: 10,
            },
        },
    }), [incidentDailyTrendData]);

    // Sync with store date
    useEffect(() => {
        if (dateFromStore) {
            setSelectedDate(dateFromStore);
        }
    }, [dateFromStore]);

    // Load initial alert thresholds on mount
    useEffect(() => {
        if (!machineID || !uid || !isAuthorizedMachine) return;

        const loadThresholds = async () => {
            try {
                const thresholds = await loadMachineThresholds(machineID);
                setMachineThresholds(thresholds);
            } catch (error) {
                console.error('[PowerDashboard] Error loading alert thresholds:', error);
            }
        };

        loadThresholds();
    }, [machineID, uid, isAuthorizedMachine]);

    useEffect(() => {
        if (!machineID || !uid || !isAuthorizedMachine) return;

        let isMounted = true;
        let unsubscribeInputs: (() => void) | null = null;

        const setupInputsListener = async () => {
            try {
                const unitSnap = await get(`machines/${machineID}/unit`);
                if (!isMounted) return;

                const unitNo = unitSnap.val() || 1;
                unsubscribeInputs = listen(`/users/${uid}/units/${unitNo}/connection/inputs`, (snapshot) => {
                    const rawInputs = snapshot.val() || {};
                    setInputsConfig(rawInputs);
                    setOptionInputLabels({
                        X1: getOptionLabelFromInputs(rawInputs, "X1"),
                        X2: getOptionLabelFromInputs(rawInputs, "X2"),
                        X3: getOptionLabelFromInputs(rawInputs, "X3"),
                    });
                });
            } catch (error) {
                console.error('[PowerDashboard] Error loading input labels:', error);
            }
        };

        setupInputsListener();

        return () => {
            isMounted = false;
            if (unsubscribeInputs) unsubscribeInputs();
        };
    }, [machineID, uid, isAuthorizedMachine]);

    useEffect(() => {
        if (!machineID || !uid || !isAuthorizedMachine) {
            setMacAddress(null);
            return;
        }

        let isMounted = true;

        const resolveMacAddress = async () => {
            try {
                const unitSnap = await get(`machines/${machineID}/unit`);
                if (!isMounted) return;

                const unitNo = unitSnap.val() || 1;
                const deviceSnap = await get(`units/${unitNo}/device`);
                if (!isMounted) return;

                const deviceValue = deviceSnap.val() || {};
                const mac = typeof deviceValue.mac === "string" ? deviceValue.mac.trim() : "";

                if (mac) {
                    setCachedUnitMac(unitNo, mac);
                    setMacAddress(mac);
                    return;
                }

                const macSnap = await get(`units/${unitNo}/mac`);
                if (!isMounted) return;

                const fallbackMac = typeof macSnap.val() === "string" ? macSnap.val().trim() : "";

                if (fallbackMac) {
                    setCachedUnitMac(unitNo, fallbackMac);
                    setMacAddress(fallbackMac);
                    return;
                }

                setMacAddress(null);
            } catch (error) {
                console.error('[PowerDashboard] Error resolving MAC address:', error);
                if (isMounted) {
                    setMacAddress(null);
                }
            }
        };

        resolveMacAddress();

        return () => {
            isMounted = false;
        };
    }, [machineID, uid, isAuthorizedMachine]);

    // Real-time listener for alert incidents (active + resolved history)
    useEffect(() => {
        if (!machineID || !uid || !isAuthorizedMachine) return;

        const unsubscribe = listen(`/users/${uid}/alertIncidents/${machineID}`, (snapshot) => {
            if (!snapshot.exists()) {
                setAlertIncidents([]);
                return;
            }
            const raw = snapshot.val();
            const incidents: AlertIncident[] = Object.entries(raw)
                .map(([id, incident]: [string, any]) => ({ id, ...incident } as AlertIncident))
                .sort((a, b) => b.startTime - a.startTime);
            setAlertIncidents(incidents);
        });

        return () => unsubscribe();
    }, [machineID, uid, isAuthorizedMachine]);

    // Accumulators listener (energy counters and reset schedule)
    useEffect(() => {
        if (!machineID || !uid || !isAuthorizedMachine) return;

        const unsubscribe = listen(`/users/${uid}/reports/machines/${machineID}/accumulators`, (snapshot) => {
            const raw = snapshot.val();
            setAccumulators(raw || null);
        });

        return () => unsubscribe();
    }, [machineID, uid, isAuthorizedMachine]);

    // Active mold name listener & initial fetch
    useEffect(() => {
        if (!machineID || !uid || !isAuthorizedMachine) return;

        // Immediate fetch for initial render
        get(`machines/${machineID}`).then((snap) => {
            if (snap.exists()) {
                const data = snap.val() || {};
                const activeMold = data.installedMold?.name
                    || (data.upcomingMold === null ? data.moldRunning : data.upcomingMold?.name)
                    || data.moldRunning
                    || data.mold_name
                    || "UNSET";
                setMoldName(activeMold && activeMold !== "NA" ? activeMold : "UNSET");
            }
        }).catch(() => {});

        // Real-time listener for machine configuration updates
        const unsubscribe = listen(`/users/${uid}/machines/${machineID}`, (snapshot) => {
            const data = snapshot.val() || {};
            const activeMold = data.installedMold?.name
                || (data.upcomingMold === null ? data.moldRunning : data.upcomingMold?.name)
                || data.moldRunning
                || data.mold_name
                || "UNSET";
            setMoldName(activeMold && activeMold !== "NA" ? activeMold : "UNSET");
        });
        return () => unsubscribe();
    }, [machineID, uid, isAuthorizedMachine]);

    // Real-time daily molds listener (includes cycle time stats & last_10 shots)
    useEffect(() => {
        if (!machineID || !uid || !isAuthorizedMachine) return;

        const formattedDate = dayjs(selectedDate).format("YYYY-MM-DD");
        const path = `/users/${uid}/reports/machines/${machineID}/daily/${formattedDate}/molds`;

        const unsubscribe = listen(path, (snapshot) => {
            const moldsData = snapshot.val() || {};
            setDailyMolds(moldsData);
        });

        return () => unsubscribe();
    }, [machineID, uid, selectedDate, isAuthorizedMachine]);

    // Available molds list for the current day
    const availableMolds = useMemo(() => {
        if (!dailyMolds) return [];
        return Object.keys(dailyMolds);
    }, [dailyMolds]);

    // Dynamically resolve target mold (selected, active, UNSET, or first with cycle time stats)
    const activeMoldKey = useMemo(() => {
        if (!dailyMolds || Object.keys(dailyMolds).length === 0) {
            return moldName || "UNSET";
        }
        if (selectedMoldName && dailyMolds[selectedMoldName]) {
            return selectedMoldName;
        }
        // 1. If currently installed/active mold exists in today's molds, use it
        if (moldName && dailyMolds[moldName]?.stats?.cycletime) {
            return moldName;
        }
        // 2. If UNSET exists with cycletime stats, use UNSET
        if (dailyMolds["UNSET"]?.stats?.cycletime) {
            return "UNSET";
        }
        // 3. Any mold with cycletime stats
        const moldWithStats = Object.keys(dailyMolds).find(
            (m) => dailyMolds[m]?.stats?.cycletime?.last_10 || dailyMolds[m]?.stats?.cycletime?.count
        );
        if (moldWithStats) {
            return moldWithStats;
        }
        // 4. Default to installed mold or UNSET
        return moldName || "UNSET";
    }, [dailyMolds, moldName, selectedMoldName]);

    // Keep cycleTimeStats in sync when active mold or dailyMolds changes
    useEffect(() => {
        if (!dailyMolds || Object.keys(dailyMolds).length === 0) {
            setCycleTimeStats(null);
            return;
        }
        const stats = dailyMolds[activeMoldKey]?.stats?.cycletime || null;
        setCycleTimeStats(stats);
    }, [dailyMolds, activeMoldKey]);

    // Dedicated real-time listener for the active mold's cycletime node (direct leaf node fallback)
    useEffect(() => {
        if (!machineID || !uid || !activeMoldKey || !isAuthorizedMachine) return;

        const formattedDate = dayjs(selectedDate).format("YYYY-MM-DD");
        const path = `/users/${uid}/reports/machines/${machineID}/daily/${formattedDate}/molds/${activeMoldKey}/stats/cycletime`;

        const unsubscribe = listen(path, (snapshot) => {
            const val = snapshot.val();
            if (val) {
                setCycleTimeStats((prev: any) => ({
                    ...(prev || {}),
                    ...val,
                }));
            }
        });

        return () => unsubscribe();
    }, [machineID, uid, selectedDate, activeMoldKey, isAuthorizedMachine]);

    const handleResetConfigUpdate = async (payload: { resetEveryDays?: number; lastReset?: string }) => {
        if (!machineID || !isAuthorizedMachine || !canWrite) return;

        const updatePayload: Record<string, any> = {};
        if (payload.resetEveryDays !== undefined) {
            updatePayload.reset_every = Math.max(1, Math.floor(payload.resetEveryDays));
        }
        if (payload.lastReset) {
            updatePayload.last_reset = payload.lastReset;
        }

        if (Object.keys(updatePayload).length === 0) return;

        try {
            await update(`reports/machines/${machineID}/accumulators`, {
                ...updatePayload,
            });
            toast({
                title: "Reset schedule updated",
                description: payload.resetEveryDays !== undefined
                    ? `Reset interval is now every ${updatePayload.reset_every} day${updatePayload.reset_every > 1 ? "s" : ""}.`
                    : `Reset date updated to ${payload.lastReset}.`,
                status: "success",
                duration: 3000,
                isClosable: true,
            });
        } catch (error) {
            console.error('[PowerDashboard] Error updating reset config:', error);
            toast({
                title: "Error",
                description: "Failed to update reset config",
                status: "error",
                duration: 5000,
                isClosable: true,
            });
        }
    };

    const handleResetAccumulators = async () => {
        if (!machineID || !isAuthorizedMachine || !canWrite) return;
        try {
            await update(`reports/machines/${machineID}/accumulators`, {
                SUM_WH_Total: 0,
                SUM_WH_Import: 0,
                SUM_WH_Export: 0,
                SUM_VAH: 0,
                SUM_VarH_Total: 0,
                SUM_VarH_Ind: 0,
                SUM_VarH_Cap: 0,
                last_reset: new Date().toISOString(),
                reset_requested: true,
                reset_requested_at: Date.now(),
            });
            setAccumulators((prev) => prev ? ({
                ...prev,
                SUM_WH_Total: 0,
                SUM_WH_Import: 0,
                SUM_WH_Export: 0,
                SUM_VAH: 0,
                SUM_VarH_Total: 0,
                SUM_VarH_Ind: 0,
                SUM_VarH_Cap: 0,
                last_reset: new Date().toISOString(),
            }) : null);
            toast({
                title: "Accumulators Reset Successfully",
                description: `All energy counters (Active, Apparent, Reactive) for ${machineName || machineID} have been reset to zero.`,
                status: "success",
                duration: 5000,
                isClosable: true,
            });
        } catch (error) {
            console.error('[PowerDashboard] Error resetting accumulators:', error);
            toast({
                title: "Error Resetting Accumulators",
                description: "Failed to reset accumulators in the database. Please try again.",
                status: "error",
                duration: 5000,
                isClosable: true,
            });
            throw error;
        }
    };

    const handleExpectedCycleTimeUpdate = async (expected: number) => {
        if (!machineID || !isAuthorizedMachine || !canWrite) return;
        try {
            await update(`reports/machines/${machineID}/accumulators`, {
                expected_cycle_time: expected,
            });
            toast({
                title: "Expected cycle time updated",
                description: `Expected cycle time set to ${expected}s.`,
                status: "success",
                duration: 3000,
                isClosable: true,
            });
        } catch (error) {
            console.error('[PowerDashboard] Error updating expected cycle time:', error);
            toast({
                title: "Error",
                description: "Failed to update expected cycle time",
                status: "error",
                duration: 5000,
                isClosable: true,
            });
        }
    };

    // Handle alert configuration save
    const handleAlertSave = async (thresholds: MachineThresholds) => {
        if (!isAuthorizedMachine || !canWrite) return;
        try {
            await saveMachineThresholds(thresholds);
            setMachineThresholds(thresholds);
            setAlertSettingsOpen(false);
        } catch (error) {
            console.error('[PowerDashboard] Error saving alert thresholds:', error);
            throw error;
        }
    };


    // Real-time values come only from MQTT payloads (not Firebase /now)
    useEffect(() => {
        if (!telemetryValues) {
            return;
        }

        const nowData = transformFirebaseData(telemetryValues);
        nowData.isOnline = isLiveActive;

        setData((prevData) => {
            if (!prevData) return prevData;
            return {
                ...prevData,
                now: nowData,
            };
        });
    }, [telemetryValues, isLiveActive]);

    // Keep the online badge aligned with MQTT connection state between messages.
    useEffect(() => {
        setData((prevData) => {
            if (!prevData?.now) {
                return prevData;
            }
            return {
                ...prevData,
                now: {
                    ...prevData.now,
                    isOnline: isLiveActive,
                },
            };
        });
    }, [isLiveActive, uid]);

    // Fetch historical data (daily/hourly) - only when date or uid changes
    useEffect(() => {
        if (!machineID || !selectedDate || !uid || !isAuthorizedMachine) return;

        const fetchHistoricalData = async () => {
            setLoading(true);
            try {
                // Use dummy data if enabled
                if (DUMMY_DATA) {
                    // Simulate loading delay
                    await new Promise(resolve => setTimeout(resolve, 500));

                    const dummyData = generateDummyData();
                    setData((prevData) => ({
                        now: prevData?.now || dummyData.now,
                        daily: dummyData.daily,
                        hourly: dummyData.hourly,
                        dailyTotal: dummyData.dailyTotal,
                    }));
                    setCycleTimeStats({
                        count: 10,
                        last_10: [18.234, 18.21, 18.22, 18.06, 25.035, 18.315, 31.576, 18.41, 18.394, 18.356],
                        total: 202.81,
                    });
                    setLoading(false);
                    return;
                }

                const formattedDate = dayjs(selectedDate).format("YYYY-MM-DD");

                const [dailySnap, hourlySnap, totalSnap, moldsSnap] = await Promise.all([
                    get(`reports/machines/${machineID}/daily/${formattedDate}/phase_values`),
                    get(`reports/machines/${machineID}/hourly/${formattedDate}`),
                    get(`reports/machines/${machineID}/daily/${formattedDate}/total`),
                    get(`reports/machines/${machineID}/daily/${formattedDate}/molds`).catch(() => null),
                ]);

                const rawDaily = dailySnap.val();
                const rawHourly = hourlySnap.val() || {};
                const rawTotal = totalSnap.val() || {};
                const rawMolds = moldsSnap?.val() || {};
                setDailyMolds(rawMolds);

                // Transform Firebase data to match TypeScript types
                const daily = transformDailyData(rawDaily);
                const hourly = transformHourlyData(rawHourly);

                setData((prevData) => ({
                    now: prevData?.now || transformFirebaseData({ isOnline: false }),
                    daily,
                    hourly,
                    dailyTotal: rawTotal,
                }));
            } catch (error) {
                console.error('[PowerDashboard] Error fetching historical data:', error);
                toast({
                    title: "Error",
                    description: "Failed to fetch historical data",
                    status: "error",
                    duration: 5000,
                    isClosable: true,
                });
            } finally {
                setLoading(false);
            }
        };

        fetchHistoricalData();
    }, [machineID, selectedDate, toast, uid, isAuthorizedMachine]);

    const handleDateChange = (dateRange: DateRange | undefined) => {
        if (!dateRange?.from) return;
        const newDate = dayjs(dateRange.from).format("YYYY-MM-DD");
        setSelectedDate(newDate);
        store.set(dateAtom, newDate);
    };

    //     const today = dayjs().format("YYYY-MM-DD");
    //     setSelectedDate(today);
    //     store.set(dateAtom, today);

    if (!isMachinesLoaded) {
        return (
            <Box minH="100vh" bg={bgColor} p={6}>
                <VStack spacing={6} align="stretch">
                    <Skeleton height="60px" borderRadius="lg" />
                    <Skeleton height="400px" borderRadius="lg" />
                    <Skeleton height="500px" borderRadius="lg" />
                    <SkeletonText mt="4" noOfLines={8} spacing="4" />
                </VStack>
            </Box>
        );
    }

    if (!isAuthorizedMachine) {
        return (
            <NotFoundAlert
                title="No Machine found!"
                description="No Machine found with this ID, please go back to homepage and try again or contact support if issue persists."
            />
        );
    }

    if (loading && !data) {
        return (
            <Box minH="100vh" bg={bgColor} p={6}>
                <VStack spacing={6} align="stretch">
                    <Skeleton height="60px" borderRadius="lg" />
                    <Skeleton height="400px" borderRadius="lg" />
                    <Skeleton height="500px" borderRadius="lg" />
                    <SkeletonText mt="4" noOfLines={8} spacing="4" />
                </VStack>
            </Box>
        );
    }

    if (!data) {
        return (
            <Box minH="100vh" bg={bgColor} p={6}>
                <Box
                    border="1px dashed"
                    borderColor={border}
                    borderRadius="5px"
                    p={8}
                    textAlign="center"
                >
                    <Text fontSize="lg" opacity={0.7}>
                        No data available for this machine
                    </Text>
                </Box>
            </Box>
        );
    }

    return (
        <VStack w="100%" minW={0} gap={5}>
            <VStack w="100%" minW={0} gap={4} align="stretch">
                {/* Compact Header with Breadcrumb and Live Status */}
                <Box
                    border="1px dashed"
                    borderColor={border}
                    borderRadius="5px"
                    px={{ base: 2, md: 4 }}
                    py={2}
                    minW={0}
                >
                    <HStack justify="space-between" flexWrap="wrap" gap={{ base: 2, md: 4 }} align="center">
                        <HStack spacing={{ base: 2, md: 4 }} rowGap={1} align="center" flexWrap="wrap" minW={0} maxW="100%">
                            <Breadcrumb fontSize="sm" sx={{ ol: { flexWrap: "wrap", rowGap: "2px" }, a: { wordBreak: "break-word" } }}>
                                <BreadcrumbItem>
                                    <BreadcrumbLink as={RouterLink} to="/machines">Machines</BreadcrumbLink>
                                </BreadcrumbItem>
                                <BreadcrumbItem>
                                    <BreadcrumbLink as={RouterLink} to={`/machines/${machineID}`}>{machineName || machineID}</BreadcrumbLink>
                                </BreadcrumbItem>
                                <BreadcrumbItem isCurrentPage>
                                    <BreadcrumbLink fontWeight="600">Power Analytics</BreadcrumbLink>
                                </BreadcrumbItem>
                            </Breadcrumb>
                            {data?.now && (
                                <Badge
                                    colorScheme={data.now.isOnline === "RESTORING" ? "orange" : data.now.isOnline ? "green" : "red"}
                                    size="xs"
                                >
                                    {data.now.isOnline === "RESTORING" ? "● RESTORING" : data.now.isOnline ? "● LIVE" : "● OFFLINE"}
                                </Badge>
                            )}
                            {(deviceVersion || data?.now?.version) && (
                                <MyTooltip label={`Device Firmware Version: ${deviceVersion || data?.now?.version}`}>
                                    <Badge
                                        colorScheme="purple"
                                        size="xs"
                                        variant="subtle"
                                        borderRadius="full"
                                        px={2}
                                        fontFamily="monospace"
                                        textTransform="none"
                                        cursor="help"
                                    >
                                        {String(deviceVersion || data?.now?.version).toLowerCase().startsWith("v")
                                            ? String(deviceVersion || data?.now?.version)
                                            : `v${deviceVersion || data?.now?.version}`}
                                    </Badge>
                                </MyTooltip>
                            )}
                        </HStack>
                        <HStack
                            w={{ base: "100%", md: "auto" }}
                            spacing={2}
                            flexWrap="wrap"
                            align="stretch"
                            minW={0}
                        >
                            {canWrite && (
                                <Button
                                    leftIcon={<Icon as={MdSettings} />}
                                    size="sm"
                                    colorScheme="orange"
                                    variant="outline"
                                    onClick={() => setAlertSettingsOpen(true)}
                                    flex={{ base: "1 1 100%", sm: "0 0 auto" }}
                                    whiteSpace="normal"
                                    h="auto"
                                    minH="32px"
                                    py={1.5}
                                >
                                    Alert Configuration
                                </Button>
                            )}
                            <Box flex={{ base: "1 1 100%", sm: "0 1 auto" }} minW={0}>
                                <CustomDatePicker
                                    set={handleDateChange}
                                    singleMonth={true}
                                    singleDate={true}
                                />
                            </Box>
                        </HStack>
                    </HStack>
                </Box>

                {/* Active Alerts Panel */}
                {activeAlerts.length > 0 && (
                    <AlertPanel
                        alerts={activeAlerts}
                        machineName={machineName || machineID || ""}
                    />
                )}

                {/* Dashboard Tabs */}
                <Tabs variant="enclosed" colorScheme="orange" isLazy size="sm" w="100%" minW={0}>
                    <TabList overflowX="auto" overflowY="hidden" maxW="100%" sx={{ scrollbarWidth: "thin" }}>
                        <Tab fontWeight="600" flexShrink={0} whiteSpace="nowrap" px={{ base: 2.5, md: 4 }} fontSize={{ base: "xs", md: "sm" }}>Real-Time Monitoring</Tab>
                        <Tab fontWeight="600" flexShrink={0} whiteSpace="nowrap" px={{ base: 2.5, md: 4 }} fontSize={{ base: "xs", md: "sm" }}>Trend Analysis</Tab>
                        <Tab fontWeight="600" flexShrink={0} whiteSpace="nowrap" px={{ base: 2.5, md: 4 }} fontSize={{ base: "xs", md: "sm" }}>Data Grid</Tab>
                        <Tab fontWeight="600" flexShrink={0} whiteSpace="nowrap" px={{ base: 2.5, md: 4 }} fontSize={{ base: "xs", md: "sm" }}>Alert History</Tab>
                    </TabList>

                    <TabPanels>
                        {/* Real-Time Monitoring */}
                        <TabPanel p={0} pt={6}>
                            <LiveTelemetryStatus
                                macAddress={macAddress}
                                isVisible={true}
                                isConnected={isMqttConnected}
                                isConnecting={isMqttConnecting}
                                isLiveActive={isLiveActive}
                                formattedTimestamp={formattedTimestamp}
                                error={mqttError}
                                connectionProgress={connectionProgress}
                                reconnect={reconnect}
                                telemetryValues={telemetryValues}
                                periodInfo={periodInfo}
                                deviceVersion={deviceVersion || data.now?.version}
                            />

                            {data.now?.R && data.now?.S && data.now?.T ? (
                                <RealTimeGauges
                                    now={data.now}
                                    daily={data.daily}
                                    selectedDate={selectedDate}
                                    updated={data.now.updated}
                                    isOnline={data.now.isOnline}
                                    optionLabels={optionInputLabels}
                                    accumulators={accumulators}
                                    onChangeResetEvery={canWrite ? handleResetConfigUpdate : undefined}
                                    onResetAccumulators={canWrite ? handleResetAccumulators : undefined}
                                    onChangeExpectedCycleTime={canWrite ? handleExpectedCycleTimeUpdate : undefined}
                                    periodInfo={periodInfo}
                                    inputsConfig={inputsConfig}
                                    dailyTotal={data.dailyTotal}
                                    cycleTimeStats={cycleTimeStats}
                                    currentMoldName={activeMoldKey}
                                    availableMolds={availableMolds}
                                    onSelectMold={setSelectedMoldName}
                                />
                            ) : (
                                <Box
                                    border="1px dashed"
                                    borderColor={border}
                                    borderRadius="5px"
                                    p={8}
                                    textAlign="center"
                                >
                                    <Text opacity={0.7}>Loading real-time data...</Text>
                                </Box>
                            )}
                        </TabPanel>

                        {/* Trend Analysis */}
                        <TabPanel p={0} pt={6}>
                            {data.hourly && Object.keys(data.hourly).length > 0 ? (
                                <HourlyTrendChart
                                    hourly={data.hourly}
                                    shiftStart={shifts?.A}
                                    thresholds={machineThresholds}
                                />
                            ) : (
                                <Box
                                    border="1px dashed"
                                    borderColor={border}
                                    borderRadius="5px"
                                    p={8}
                                    textAlign="center"
                                >
                                    <Text opacity={0.7}>No hourly data available for selected date</Text>
                                </Box>
                            )}
                        </TabPanel>



                        {/* Data Grid */}
                        <TabPanel p={0} pt={6}>
                            <DataGrid daily={data.daily || undefined} />
                        </TabPanel>


                        {/* Alert History */}
                        <TabPanel p={0} pt={6}>
                            <VStack align="stretch" spacing={4}>
                                <MyCard noPadding>
                                    <Box p={4}>
                                        <SimpleGrid columns={{ base: 1, md: 2, xl: 3 }} spacing={4}>
                                            <Box border="1px dashed" borderColor={border} borderRadius="5px" p={3}>
                                                <Text fontSize="xs" mb={2} opacity={0.8}>Status Split</Text>
                                                {incidentStatusChartData.length > 0 ? (
                                                    <Pie {...incidentStatusChartConfig as any} height={200} />
                                                ) : (
                                                    <Text fontSize="sm" opacity={0.7}>No status data</Text>
                                                )}
                                            </Box>
                                            <Box border="1px dashed" borderColor={border} borderRadius="5px" p={3}>
                                                <Text fontSize="xs" mb={2} opacity={0.8}>Severity Mix</Text>
                                                {incidentSeverityChartData.length > 0 ? (
                                                    <Pie {...incidentSeverityChartConfig as any} height={200} />
                                                ) : (
                                                    <Text fontSize="sm" opacity={0.7}>No severity data</Text>
                                                )}
                                            </Box>
                                            <Box border="1px dashed" borderColor={border} borderRadius="5px" p={3}>
                                                <Text fontSize="xs" mb={2} opacity={0.8}>Recent Incident Trend</Text>
                                                {incidentDailyTrendData.length > 0 ? (
                                                    <Column {...incidentTrendChartConfig as any} height={200} />
                                                ) : (
                                                    <Text fontSize="sm" opacity={0.7}>Not enough data points</Text>
                                                )}
                                            </Box>
                                        </SimpleGrid>
                                    </Box>
                                </MyCard>

                                <MyCard noPadding>
                                    <Box p={4}>
                                        <HStack justify="space-between" flexWrap="wrap" gap={3} mb={4}>
                                            <Text fontWeight="600">Alert Incidents ({filteredHistory.length})</Text>
                                            <HStack spacing={2}>
                                                <Button
                                                    size="xs"
                                                    variant={historyFilter === "all" ? "solid" : "outline"}
                                                    colorScheme="orange"
                                                    onClick={() => setHistoryFilter("all")}
                                                >
                                                    All
                                                </Button>
                                                <Button
                                                    size="xs"
                                                    variant={historyFilter === "active" ? "solid" : "outline"}
                                                    colorScheme="orange"
                                                    onClick={() => setHistoryFilter("active")}
                                                >
                                                    Active
                                                </Button>
                                                <Button
                                                    size="xs"
                                                    variant={historyFilter === "resolved" ? "solid" : "outline"}
                                                    colorScheme="orange"
                                                    onClick={() => setHistoryFilter("resolved")}
                                                >
                                                    Resolved
                                                </Button>
                                            </HStack>
                                        </HStack>

                                        {filteredHistory.length === 0 ? (
                                            <Text opacity={0.7}>No incidents found for selected filter.</Text>
                                        ) : (
                                            <VStack align="stretch" spacing={3} maxH="520px" overflowY="auto">
                                                {filteredHistory.map((incident, index) => {
                                                    const isResolved = incident.status === "resolved";
                                                    const startMs = toMilliseconds(incident.startTime);
                                                    const endMs = incident.endTime ? toMilliseconds(incident.endTime) : null;
                                                    const liveSeconds = (Date.now() - startMs) / 1000;
                                                    const durationSeconds = isResolved
                                                        ? incident.duration || (endMs ? (endMs - startMs) / 1000 : 0)
                                                        : liveSeconds;

                                                    return (
                                                        <Box
                                                            key={incident.id || index}
                                                            p={3}
                                                            borderRadius="md"
                                                            bg={bgColor}
                                                            border="1px solid"
                                                            borderColor={border}
                                                        >
                                                            <HStack justify="space-between" align="start" gap={3}>
                                                                <VStack align="start" spacing={1} flex={1}>
                                                                    <HStack spacing={2} flexWrap="wrap">
                                                                        <Text fontSize="sm" fontWeight="600">
                                                                            {incident.parameter}
                                                                            {incident.phase ? ` (${incident.phase})` : ""}
                                                                        </Text>
                                                                        <Badge
                                                                            colorScheme={incident.severity === "critical" ? "red" : "orange"}
                                                                            fontSize="2xs"
                                                                        >
                                                                            {(incident.severity || "warning").toUpperCase()}
                                                                        </Badge>
                                                                        <Badge
                                                                            colorScheme={isResolved ? "green" : "red"}
                                                                            fontSize="2xs"
                                                                            sx={
                                                                                isResolved
                                                                                    ? undefined
                                                                                    : {
                                                                                        "@keyframes alertPulse": {
                                                                                            "0%": { opacity: 1 },
                                                                                            "50%": { opacity: 0.45 },
                                                                                            "100%": { opacity: 1 },
                                                                                        },
                                                                                        animation: "alertPulse 1.8s infinite",
                                                                                    }
                                                                            }
                                                                        >
                                                                            {(incident.status || "active").toUpperCase()}
                                                                        </Badge>
                                                                    </HStack>

                                                                    <Text fontSize="xs" color="gray.500">
                                                                        Value reached <strong>{typeof incident.peakValue === "number" ? incident.peakValue.toFixed(2) : (incident.peakValue ?? "--")}</strong>
                                                                        {" "}({incident.thresholdType === "min" ? "Threshold: < " : "Threshold: > "}
                                                                        <strong>{typeof incident.thresholdValue === "number" ? incident.thresholdValue.toFixed(2) : (incident.thresholdValue ?? "--")}</strong>)
                                                                    </Text>

                                                                    <HStack spacing={3} fontSize="xs" color="gray.500" flexWrap="wrap">
                                                                        <Text>
                                                                            Started: {dayjs(startMs).format("DD MMM YYYY, HH:mm:ss")}
                                                                        </Text>
                                                                        <Text>•</Text>
                                                                        <Text>
                                                                            Ended: {endMs ? dayjs(endMs).format("DD MMM YYYY, HH:mm:ss") : "-"}
                                                                        </Text>
                                                                        <Text>•</Text>
                                                                        <Text>
                                                                            Duration: <strong>{formatDurationFromSeconds(durationSeconds)}</strong>
                                                                        </Text>
                                                                    </HStack>
                                                                </VStack>
                                                            </HStack>
                                                        </Box>
                                                    );
                                                })}
                                            </VStack>
                                        )}
                                    </Box>
                                </MyCard>
                            </VStack>
                        </TabPanel>
                    </TabPanels>
                </Tabs>

                {/* Footer Info */}
                <Box
                    border="1px dashed"
                    borderColor={border}
                    borderRadius="5px"
                    p={4}
                >
                    <HStack justify="space-between" fontSize="sm" opacity={0.7}>
                        <Text>Machine: {machineName || machineID}</Text>
                        <Text>Date: {dayjs(selectedDate).format("DD MMM YYYY")}</Text>
                        <Text>Last Updated: {dayjs.unix(data.now.updated).utc().format("HH:mm:ss")}</Text>
                    </HStack>
                </Box>
            </VStack>

            {/* Alert Configuration Modal */}
            {canWrite && machineID && (
                <AlertSettings
                    machineId={machineID}
                    machineName={machineName || machineID}
                    open={alertSettingsOpen}
                    initialThresholds={machineThresholds ?? undefined}
                    onSave={handleAlertSave}
                    onCancel={() => setAlertSettingsOpen(false)}
                />
            )}
        </VStack>
    );
};

export default PowerDashboard;
