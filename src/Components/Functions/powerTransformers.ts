export interface MinMax {
    min: number;
    max: number;
    avg: number;
}

export interface TransformedPhaseData {
    volt: MinMax;
    lineVoltage: MinMax;
    amp: MinMax;
    power: MinMax;
    apparentPower: MinMax;
    powerFactor: MinMax | { lag_min: number; lead_min: number; avg: number; avg_sum?: number; avg_count?: number };
    reactivePower: MinMax;
    consumption: number;
    voltTHD: MinMax;
    ampTHD: MinMax;
}

export interface TransformedSumPhaseData extends TransformedPhaseData {
    frequency: MinMax;
    neutralCurrent?: MinMax;
}

export interface TransformedPhaseRecord {
    SUM: TransformedSumPhaseData;
    R: TransformedPhaseData | null;
    S: TransformedPhaseData | null;
    T: TransformedPhaseData | null;
}

export interface MetricDef {
    key: string;
    label: string;
    unit: string;
    hasMin: boolean;
    decimals: number;
    isKilo?: boolean;
    sumOnly?: boolean;
}

export const pickMetric = (rawPhase: any, keys: string[]): MinMax => {
    for (const key of keys) {
        const metric = rawPhase?.[key];
        if (metric && typeof metric === "object") {
            return {
                min: Number(metric.min ?? 0),
                max: Number(metric.max ?? 0),
                avg: Number(metric.avg ?? 0),
            };
        }
    }
    return { min: 0, max: 0, avg: 0 };
};

export const pickPFMetric = (rawPhase: any, keys: string[]): any => {
    for (const key of keys) {
        const metric = rawPhase?.[key];
        if (metric && typeof metric === "object") {
            if (metric.lag_min !== undefined || metric.lead_min !== undefined) {
                return {
                    lag_min: Number(metric.lag_min ?? 1),
                    lead_min: Number(metric.lead_min ?? 1),
                    avg: Number(metric.avg ?? 0),
                    avg_sum: Number(metric.avg_sum ?? 0),
                    avg_count: Number(metric.avg_count ?? 0),
                };
            }
            return {
                min: Number(metric.min ?? 0),
                max: Number(metric.max ?? 0),
                avg: Number(metric.avg ?? 0),
            };
        }
    }
    return { min: 0, max: 0, avg: 0 };
};

export const transformPhaseData = (rawPhase: any): TransformedPhaseData | null => {
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
        voltTHD: pickMetric(rawPhase, ["vthd", "VOLTAGE_THD", "VOLT_THD", "V_THD"]),
        ampTHD: pickMetric(rawPhase, ["cthd", "CURRENT_THD", "AMPERE_THD", "I_THD", "A_THD"]),
    };
};

export const transformDailyData = (rawDaily: any, strict: boolean = false): TransformedPhaseRecord | null => {
    if (!rawDaily) return null;
    if (strict && (!rawDaily?.R || !rawDaily?.S || !rawDaily?.T)) return null;

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
            neutralCurrent: pickMetric(rawDaily.SUM || {}, ["NEUTRAL_AMPERE", "NEUTRAL_CURRENT", "SUM_An"]),
        } as TransformedSumPhaseData,
    };
};

export const toKilo = (val: number | undefined): number => {
    if (val === undefined || val === null) return 0;
    return val / 1000;
};

export const formatVal = (val: number | undefined, decimals: number = 2): string => {
    if (val === undefined || val === null || isNaN(val)) return "-";
    return val.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
};

export const POWER_METRICS: MetricDef[] = [
    { key: "volt", label: "Voltage L-N", unit: "V", hasMin: true, decimals: 1 },
    { key: "lineVoltage", label: "Line Voltage L-L", unit: "V", hasMin: true, decimals: 1 },
    { key: "amp", label: "Current", unit: "A", hasMin: true, decimals: 3 },
    { key: "power", label: "Active Power", unit: "kW", hasMin: true, decimals: 3, isKilo: true },
    { key: "apparentPower", label: "Apparent Power", unit: "kVA", hasMin: true, decimals: 3, isKilo: true },
    { key: "reactivePower", label: "Reactive Power", unit: "kVAR", hasMin: true, decimals: 3, isKilo: true },
    { key: "powerFactor", label: "Power Factor", unit: "PF", hasMin: true, decimals: 2 },
    { key: "frequency", label: "Frequency", unit: "Hz", hasMin: true, decimals: 1, sumOnly: true },
    { key: "neutralCurrent", label: "Neutral Current", unit: "A", hasMin: true, decimals: 3, sumOnly: true },
];

export const HARMONICS_METRICS: MetricDef[] = [
    { key: "voltTHD", label: "Voltage THD", unit: "%", hasMin: true, decimals: 1 },
    { key: "ampTHD", label: "Current THD", unit: "%", hasMin: true, decimals: 1 },
];

export const METRIC_HAS_MIN: Record<string, boolean> = Object.fromEntries(
    [...POWER_METRICS, ...HARMONICS_METRICS].map(m => [m.key, m.hasMin])
);
