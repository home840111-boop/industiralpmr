import React, { useState, useMemo } from "react";
import {
    Box,
    Table,
    Thead,
    Tbody,
    Tr,
    Th,
    Td,
    Text,
    useColorMode,
    Select,
    Tabs,
    TabList,
    TabPanels,
    Tab,
    TabPanel,
    Flex,
    CardHeader,
    CardBody,
    Button,
} from "@chakra-ui/react";
import { FiDownload } from "react-icons/fi";
import MyCard from "../../../../Components/micro/Card";
import secToTime from "../../../../Components/Functions/converters/secondsToHourMin";
import downloadCSV from "../../../../Components/Exporters/csvDownload";
import { DataToSet } from "./index";
import { dbSchemaRecord } from "../../../Machines/Machine/Power/types";
import { formatVal, toKilo } from "../../../../Components/Functions/powerTransformers";

const adjustPF = (pf: any) => {
    if (!pf) return null;
    if (pf.lag_min !== undefined || pf.lead_min !== undefined) {
        return {
            min: pf.lead_min !== undefined ? Math.abs(pf.lead_min) : 0,
            max: pf.lag_min !== undefined ? Math.abs(pf.lag_min) : 0,
            avg: pf.avg !== undefined ? Math.abs(pf.avg) : 0,
        };
    }
    return pf;
};

interface PhaseReportSectionProps {
    data: DataToSet;
    isSingleDay: boolean;
}

const PhaseComparisonTable = ({ daily, fileName = "phase-comparison" }: { daily: dbSchemaRecord, fileName?: string }) => {
    const { colorMode } = useColorMode();
    const border = `${colorMode}.border`;
    const headerBg = `${colorMode}.tableHeaderBG`;
    const headerColor = `${colorMode}.tableHeaderColor`;
    const hoverBg = `${colorMode}.hoverBG`;

    const rows = [
        { metric: "Voltage LN", unit: "V", decimals: 1, sum: daily.SUM.volt, r: daily.R.volt, s: daily.S.volt, t: daily.T.volt },
        { metric: "Line Voltage LL", unit: "V", decimals: 1, sum: daily.SUM.lineVoltage, r: daily.R.lineVoltage, s: daily.S.lineVoltage, t: daily.T.lineVoltage },
        { metric: "Current", unit: "A", decimals: 3, sum: daily.SUM.amp, r: daily.R.amp, s: daily.S.amp, t: daily.T.amp },
        { metric: "Active Power", unit: "kW", decimals: 3, 
          sum: { min: toKilo(daily.SUM.power.min), avg: toKilo(daily.SUM.power.avg), max: toKilo(daily.SUM.power.max) },
          r: { min: toKilo(daily.R.power.min), avg: toKilo(daily.R.power.avg), max: toKilo(daily.R.power.max) },
          s: { min: toKilo(daily.S.power.min), avg: toKilo(daily.S.power.avg), max: toKilo(daily.S.power.max) },
          t: { min: toKilo(daily.T.power.min), avg: toKilo(daily.T.power.avg), max: toKilo(daily.T.power.max) }
        },
        { metric: "Apparent Power", unit: "kVA", decimals: 3,
          sum: { min: toKilo(daily.SUM.apparentPower.min), avg: toKilo(daily.SUM.apparentPower.avg), max: toKilo(daily.SUM.apparentPower.max) },
          r: { min: toKilo(daily.R.apparentPower.min), avg: toKilo(daily.R.apparentPower.avg), max: toKilo(daily.R.apparentPower.max) },
          s: { min: toKilo(daily.S.apparentPower.min), avg: toKilo(daily.S.apparentPower.avg), max: toKilo(daily.S.apparentPower.max) },
          t: { min: toKilo(daily.T.apparentPower.min), avg: toKilo(daily.T.apparentPower.avg), max: toKilo(daily.T.apparentPower.max) }
        },
        { metric: "Reactive Power", unit: "kVAR", decimals: 3,
          sum: { min: toKilo(daily.SUM.reactivePower.min), avg: toKilo(daily.SUM.reactivePower.avg), max: toKilo(daily.SUM.reactivePower.max) },
          r: { min: toKilo(daily.R.reactivePower.min), avg: toKilo(daily.R.reactivePower.avg), max: toKilo(daily.R.reactivePower.max) },
          s: { min: toKilo(daily.S.reactivePower.min), avg: toKilo(daily.S.reactivePower.avg), max: toKilo(daily.S.reactivePower.max) },
          t: { min: toKilo(daily.T.reactivePower.min), avg: toKilo(daily.T.reactivePower.avg), max: toKilo(daily.T.reactivePower.max) }
        },
        { metric: "Power Factor", unit: "", decimals: 2, sum: adjustPF(daily.SUM.powerFactor), r: adjustPF(daily.R.powerFactor), s: adjustPF(daily.S.powerFactor), t: adjustPF(daily.T.powerFactor) },
        { metric: "Frequency", unit: "Hz", decimals: 1, sum: daily.SUM.frequency, r: null, s: null, t: null },
        { metric: "Neutral Current", unit: "A", decimals: 3, sum: daily.SUM.neutralCurrent || null, r: null, s: null, t: null },
        { metric: "Voltage THD", unit: "%", decimals: 1, sum: daily.SUM.voltTHD, r: daily.R.voltTHD, s: daily.S.voltTHD, t: daily.T.voltTHD },
        { metric: "Current THD", unit: "%", decimals: 1, sum: daily.SUM.ampTHD, r: daily.R.ampTHD, s: daily.S.ampTHD, t: daily.T.ampTHD },
    ];

    const handleDownloadCSV = () => {
        const headers = [
            "Metric",
            "SUM Min", "SUM Avg", "SUM Max",
            "L1 (R) Min", "L1 (R) Avg", "L1 (R) Max",
            "L2 (S) Min", "L2 (S) Avg", "L2 (S) Max",
            "L3 (T) Min", "L3 (T) Avg", "L3 (T) Max",
        ];

        const stats = (v: any, decimals: number) =>
            v
                ? [formatVal(v.min, decimals), formatVal(v.avg, decimals), formatVal(v.max, decimals)]
                : ["-", "-", "-"];

        const csvRows = rows.map((row) => [
            `${row.metric}${row.unit ? ` (${row.unit})` : ""}`,
            ...stats(row.sum, row.decimals),
            ...stats(row.r, row.decimals),
            ...stats(row.s, row.decimals),
            ...stats(row.t, row.decimals),
        ]);

        downloadCSV(`${fileName}.csv`, headers, csvRows);
    };

    return (
        <Box>
            <Flex justify="flex-end" mb={3}>
                <Button
                    size="sm"
                    variant="outline"
                    colorScheme="orange"
                    leftIcon={<FiDownload />}
                    onClick={handleDownloadCSV}
                >
                    CSV
                </Button>
            </Flex>
        <Box overflowX="auto" maxW="100%">
            <Table variant="simple" size="sm" sx={{ "th, td": { whiteSpace: "nowrap" } }}>
                <Thead bg={headerBg}>
                    <Tr>
                        <Th color={headerColor} textTransform="uppercase" fontSize="xx-small" rowSpan={2} py={3}>
                            Metric
                        </Th>
                        <Th color={headerColor} textTransform="uppercase" fontSize="xx-small" colSpan={3} textAlign="center" py={1} borderBottom="1px solid" borderColor={border}>
                            Total (SUM)
                        </Th>
                        <Th color={headerColor} textTransform="uppercase" fontSize="xx-small" colSpan={3} textAlign="center" py={1} borderBottom="1px solid" borderColor={border}>
                            Phase L1 (R)
                        </Th>
                        <Th color={headerColor} textTransform="uppercase" fontSize="xx-small" colSpan={3} textAlign="center" py={1} borderBottom="1px solid" borderColor={border}>
                            Phase L2 (S)
                        </Th>
                        <Th color={headerColor} textTransform="uppercase" fontSize="xx-small" colSpan={3} textAlign="center" py={1} borderBottom="1px solid" borderColor={border}>
                            Phase L3 (T)
                        </Th>
                    </Tr>
                    <Tr>
                        <Th color={headerColor} fontSize="xx-small" py={1}>Min</Th>
                        <Th color={headerColor} fontSize="xx-small" py={1}>Avg</Th>
                        <Th color={headerColor} fontSize="xx-small" py={1}>Max</Th>
                        <Th color={headerColor} fontSize="xx-small" py={1}>Min</Th>
                        <Th color={headerColor} fontSize="xx-small" py={1}>Avg</Th>
                        <Th color={headerColor} fontSize="xx-small" py={1}>Max</Th>
                        <Th color={headerColor} fontSize="xx-small" py={1}>Min</Th>
                        <Th color={headerColor} fontSize="xx-small" py={1}>Avg</Th>
                        <Th color={headerColor} fontSize="xx-small" py={1}>Max</Th>
                        <Th color={headerColor} fontSize="xx-small" py={1}>Min</Th>
                        <Th color={headerColor} fontSize="xx-small" py={1}>Avg</Th>
                        <Th color={headerColor} fontSize="xx-small" py={1}>Max</Th>
                    </Tr>
                </Thead>
                <Tbody>
                    {rows.map((row, index) => (
                        <Tr key={index} _hover={{ bg: hoverBg }} transition="all 0.2s">
                            <Td fontWeight="600" fontSize="xs">
                                {row.metric} {row.unit ? `(${row.unit})` : ""}
                            </Td>
                            {/* SUM */}
                            <Td fontSize="xs">{row.sum ? formatVal(row.sum.min, row.decimals) : "-"}</Td>
                            <Td fontSize="xs" fontWeight="500">{row.sum ? formatVal(row.sum.avg, row.decimals) : "-"}</Td>
                            <Td fontSize="xs">{row.sum ? formatVal(row.sum.max, row.decimals) : "-"}</Td>
                            {/* R */}
                            {row.r ? (
                                <>
                                    <Td fontSize="xs">{formatVal(row.r.min, row.decimals)}</Td>
                                    <Td fontSize="xs" fontWeight="500">{formatVal(row.r.avg, row.decimals)}</Td>
                                    <Td fontSize="xs">{formatVal(row.r.max, row.decimals)}</Td>
                                </>
                            ) : (
                                <Td colSpan={3} textAlign="center" fontSize="xs">-</Td>
                            )}
                            {/* S */}
                            {row.s ? (
                                <>
                                    <Td fontSize="xs">{formatVal(row.s.min, row.decimals)}</Td>
                                    <Td fontSize="xs" fontWeight="500">{formatVal(row.s.avg, row.decimals)}</Td>
                                    <Td fontSize="xs">{formatVal(row.s.max, row.decimals)}</Td>
                                </>
                            ) : (
                                <Td colSpan={3} textAlign="center" fontSize="xs">-</Td>
                            )}
                            {/* T */}
                            {row.t ? (
                                <>
                                    <Td fontSize="xs">{formatVal(row.t.min, row.decimals)}</Td>
                                    <Td fontSize="xs" fontWeight="500">{formatVal(row.t.avg, row.decimals)}</Td>
                                    <Td fontSize="xs">{formatVal(row.t.max, row.decimals)}</Td>
                                </>
                            ) : (
                                <Td colSpan={3} textAlign="center" fontSize="xs">-</Td>
                            )}
                        </Tr>
                    ))}
                </Tbody>
            </Table>
        </Box>
        </Box>
    );
};

const PhaseHourlyTable = ({ allHours }: { allHours: any[] }) => {
    const [selectedPhase, setSelectedPhase] = useState<"SUM" | "R" | "S" | "T">("SUM");
    const { colorMode } = useColorMode();
    const border = `${colorMode}.border`;
    const headerBg = `${colorMode}.tableHeaderBG`;
    const headerColor = `${colorMode}.tableHeaderColor`;
    const hoverBg = `${colorMode}.hoverBG`;

    const formatVal = (val: number | undefined, decimals: number = 2) => {
        if (val === undefined || isNaN(val)) return "-";
        return val.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
    };

    const toKilo = (val: number | undefined) => {
        if (val === undefined) return undefined;
        return val / 1000;
    };

    const filteredHours = useMemo(() => {
        return allHours
            .filter((h) => h && h.from !== undefined && !!h.phase_values)
            .sort((a, b) => a.from - b.from);
    }, [allHours]);

    const formatHourRange = (from: number, to: number) => {
        return `${secToTime(from)} - ${secToTime(to)}`;
    };

    const handleDownloadCSV = () => {
        const headers = [
            "Hour",
            "Volt Min (V)", "Volt Avg (V)", "Volt Max (V)",
            "Current Min (A)", "Current Avg (A)", "Current Max (A)",
            "Active Power Min (kW)", "Active Power Avg (kW)", "Active Power Max (kW)",
            "PF Min", "PF Avg", "PF Max",
            ...(selectedPhase === "SUM" ? ["Freq Min (Hz)", "Freq Avg (Hz)", "Freq Max (Hz)"] : [])
        ];

        const rows = filteredHours.map((hour) => {
            const phaseData = hour.phase_values?.[selectedPhase];
            if (!phaseData) return null;

            return [
                formatHourRange(hour.from, hour.time),
                formatVal(phaseData.volt?.min, 1), formatVal(phaseData.volt?.avg, 1), formatVal(phaseData.volt?.max, 1),
                formatVal(phaseData.amp?.min, 3), formatVal(phaseData.amp?.avg, 3), formatVal(phaseData.amp?.max, 3),
                formatVal(toKilo(phaseData.power?.min), 3), formatVal(toKilo(phaseData.power?.avg), 3), formatVal(toKilo(phaseData.power?.max), 3),
                formatVal(phaseData.powerFactor?.min, 2), formatVal(phaseData.powerFactor?.avg, 2), formatVal(phaseData.powerFactor?.max, 2),
                ...(selectedPhase === "SUM" ? [formatVal(phaseData.frequency?.min, 1), formatVal(phaseData.frequency?.avg, 1), formatVal(phaseData.frequency?.max, 1)] : [])
            ];
        }).filter(Boolean);

        downloadCSV(`phase-hourly-${selectedPhase}.csv`, headers, rows as any);
    };

    return (
        <Box>
            <Flex justify="space-between" align={{ base: "stretch", sm: "center" }} direction={{ base: "column", sm: "row" }} mb={4} gap={{ base: 2, sm: 4 }}>
                <Text fontSize="sm" fontWeight="500" color={`${colorMode}.subText`}>
                    Select phase to inspect hourly records:
                </Text>
                <Flex gap={2} align="center" w={{ base: "100%", sm: "auto" }}>
                    <Select
                        focusBorderColor="primary"
                        w={{ base: "100%", sm: "150px" }}
                        flex={{ base: 1, sm: "none" }}
                        minW={0}
                        size="sm"
                        value={selectedPhase}
                        onChange={(e) => setSelectedPhase(e.target.value as any)}
                    >
                        <option value="SUM">Total (SUM)</option>
                        <option value="R">Phase L1 (R)</option>
                        <option value="S">Phase L2 (S)</option>
                        <option value="T">Phase L3 (T)</option>
                    </Select>
                    <Button
                        size="sm"
                        variant="outline"
                        colorScheme="orange"
                        leftIcon={<FiDownload />}
                        onClick={handleDownloadCSV}
                    >
                        CSV
                    </Button>
                </Flex>
            </Flex>

            <Box overflowX="auto" maxW="100%">
                <Table variant="simple" size="sm" sx={{ "th, td": { whiteSpace: "nowrap" } }}>
                    <Thead bg={headerBg}>
                        <Tr>
                            <Th color={headerColor} textTransform="uppercase" fontSize="xx-small" rowSpan={2} py={3}>
                                Hour
                            </Th>
                            <Th color={headerColor} textTransform="uppercase" fontSize="xx-small" colSpan={3} textAlign="center" py={1} borderBottom="1px solid" borderColor={border}>
                                Voltage LN (V)
                            </Th>
                            <Th color={headerColor} textTransform="uppercase" fontSize="xx-small" colSpan={3} textAlign="center" py={1} borderBottom="1px solid" borderColor={border}>
                                Current (A)
                            </Th>
                            <Th color={headerColor} textTransform="uppercase" fontSize="xx-small" colSpan={3} textAlign="center" py={1} borderBottom="1px solid" borderColor={border}>
                                Active Power (kW)
                            </Th>
                            <Th color={headerColor} textTransform="uppercase" fontSize="xx-small" colSpan={3} textAlign="center" py={1} borderBottom="1px solid" borderColor={border}>
                                Power Factor
                            </Th>
                            {selectedPhase === "SUM" && (
                                <Th color={headerColor} textTransform="uppercase" fontSize="xx-small" colSpan={3} textAlign="center" py={1} borderBottom="1px solid" borderColor={border}>
                                    Frequency (Hz)
                                </Th>
                            )}
                        </Tr>
                        <Tr>
                            <Th color={headerColor} fontSize="xx-small" py={1}>Min</Th>
                            <Th color={headerColor} fontSize="xx-small" py={1}>Avg</Th>
                            <Th color={headerColor} fontSize="xx-small" py={1}>Max</Th>
                            <Th color={headerColor} fontSize="xx-small" py={1}>Min</Th>
                            <Th color={headerColor} fontSize="xx-small" py={1}>Avg</Th>
                            <Th color={headerColor} fontSize="xx-small" py={1}>Max</Th>
                            <Th color={headerColor} fontSize="xx-small" py={1}>Min</Th>
                            <Th color={headerColor} fontSize="xx-small" py={1}>Avg</Th>
                            <Th color={headerColor} fontSize="xx-small" py={1}>Max</Th>
                            <Th color={headerColor} fontSize="xx-small" py={1}>Min</Th>
                            <Th color={headerColor} fontSize="xx-small" py={1}>Avg</Th>
                            <Th color={headerColor} fontSize="xx-small" py={1}>Max</Th>
                            {selectedPhase === "SUM" && (
                                <>
                                    <Th color={headerColor} fontSize="xx-small" py={1}>Min</Th>
                                    <Th color={headerColor} fontSize="xx-small" py={1}>Avg</Th>
                                    <Th color={headerColor} fontSize="xx-small" py={1}>Max</Th>
                                </>
                            )}
                        </Tr>
                    </Thead>
                    <Tbody>
                        {filteredHours.map((hour, index) => {
                            const phaseData = hour.phase_values?.[selectedPhase];
                            if (!phaseData) return null;
                            return (
                                <Tr key={index} _hover={{ bg: hoverBg }} transition="all 0.2s">
                                    <Td fontWeight="600" fontSize="xs">
                                        {formatHourRange(hour.from, hour.time)}
                                    </Td>
                                    {/* Voltage */}
                                    <Td fontSize="xs">{formatVal(phaseData.volt?.min, 1)}</Td>
                                    <Td fontSize="xs" fontWeight="500">{formatVal(phaseData.volt?.avg, 1)}</Td>
                                    <Td fontSize="xs">{formatVal(phaseData.volt?.max, 1)}</Td>
                                    {/* Current */}
                                    <Td fontSize="xs">{formatVal(phaseData.amp?.min, 3)}</Td>
                                    <Td fontSize="xs" fontWeight="500">{formatVal(phaseData.amp?.avg, 3)}</Td>
                                    <Td fontSize="xs">{formatVal(phaseData.amp?.max, 3)}</Td>
                                    {/* Power */}
                                    <Td fontSize="xs">{formatVal(toKilo(phaseData.power?.min), 3)}</Td>
                                    <Td fontSize="xs" fontWeight="500">{formatVal(toKilo(phaseData.power?.avg), 3)}</Td>
                                    <Td fontSize="xs">{formatVal(toKilo(phaseData.power?.max), 3)}</Td>
                                    {/* Power Factor */}
                                    <Td fontSize="xs">{formatVal(phaseData.powerFactor?.min, 2)}</Td>
                                    <Td fontSize="xs" fontWeight="500">{formatVal(phaseData.powerFactor?.avg, 2)}</Td>
                                    <Td fontSize="xs">{formatVal(phaseData.powerFactor?.max, 2)}</Td>
                                    {/* Frequency */}
                                    {selectedPhase === "SUM" && (
                                        <>
                                            <Td fontSize="xs">{formatVal(phaseData.frequency?.min, 1)}</Td>
                                            <Td fontSize="xs" fontWeight="500">{formatVal(phaseData.frequency?.avg, 1)}</Td>
                                            <Td fontSize="xs">{formatVal(phaseData.frequency?.max, 1)}</Td>
                                        </>
                                    )}
                                </Tr>
                            );
                        })}
                    </Tbody>
                </Table>
            </Box>
        </Box>
    );
};

const PhaseDailyTrendTable = ({ allDays }: { allDays: any[] }) => {
    const { colorMode } = useColorMode();
    const border = `${colorMode}.border`;
    const headerBg = `${colorMode}.tableHeaderBG`;
    const headerColor = `${colorMode}.tableHeaderColor`;
    const hoverBg = `${colorMode}.hoverBG`;

    const formatVal = (val: number | undefined, decimals: number = 2) => {
        if (val === undefined || isNaN(val)) return "-";
        return val.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
    };

    const toKilo = (val: number | undefined) => {
        if (val === undefined) return undefined;
        return val / 1000;
    };

    const filteredDays = useMemo(() => {
        return allDays.filter((d) => !!d.phase_values);
    }, [allDays]);

    return (
        <Box overflowX="auto" maxW="100%">
            <Table variant="simple" size="sm" sx={{ "th, td": { whiteSpace: "nowrap" } }}>
                <Thead bg={headerBg}>
                    <Tr>
                        <Th color={headerColor} textTransform="uppercase" fontSize="xx-small" rowSpan={2} py={3}>
                            Date
                        </Th>
                        <Th color={headerColor} textTransform="uppercase" fontSize="xx-small" colSpan={3} textAlign="center" py={1} borderBottom="1px solid" borderColor={border}>
                            Voltage LN (V)
                        </Th>
                        <Th color={headerColor} textTransform="uppercase" fontSize="xx-small" colSpan={3} textAlign="center" py={1} borderBottom="1px solid" borderColor={border}>
                            Current (A)
                        </Th>
                        <Th color={headerColor} textTransform="uppercase" fontSize="xx-small" colSpan={3} textAlign="center" py={1} borderBottom="1px solid" borderColor={border}>
                            Active Power (kW)
                        </Th>
                        <Th color={headerColor} textTransform="uppercase" fontSize="xx-small" colSpan={3} textAlign="center" py={1} borderBottom="1px solid" borderColor={border}>
                            Power Factor
                        </Th>
                    </Tr>
                    <Tr>
                        <Th color={headerColor} fontSize="xx-small" py={1}>Min</Th>
                        <Th color={headerColor} fontSize="xx-small" py={1}>Avg</Th>
                        <Th color={headerColor} fontSize="xx-small" py={1}>Max</Th>
                        <Th color={headerColor} fontSize="xx-small" py={1}>Min</Th>
                        <Th color={headerColor} fontSize="xx-small" py={1}>Avg</Th>
                        <Th color={headerColor} fontSize="xx-small" py={1}>Max</Th>
                        <Th color={headerColor} fontSize="xx-small" py={1}>Min</Th>
                        <Th color={headerColor} fontSize="xx-small" py={1}>Avg</Th>
                        <Th color={headerColor} fontSize="xx-small" py={1}>Max</Th>
                        <Th color={headerColor} fontSize="xx-small" py={1}>Min</Th>
                        <Th color={headerColor} fontSize="xx-small" py={1}>Avg</Th>
                        <Th color={headerColor} fontSize="xx-small" py={1}>Max</Th>
                    </Tr>
                </Thead>
                <Tbody>
                    {filteredDays.map((day, index) => {
                        const phaseData = day.phase_values.SUM;
                        return (
                            <Tr key={index} _hover={{ bg: hoverBg }} transition="all 0.2s">
                                <Td fontWeight="600" fontSize="xs">
                                    {day.date}
                                </Td>
                                {/* Voltage */}
                                <Td fontSize="xs">{formatVal(phaseData.volt?.min, 1)}</Td>
                                <Td fontSize="xs" fontWeight="500">{formatVal(phaseData.volt?.avg, 1)}</Td>
                                <Td fontSize="xs">{formatVal(phaseData.volt?.max, 1)}</Td>
                                {/* Current */}
                                <Td fontSize="xs">{formatVal(phaseData.amp?.min, 3)}</Td>
                                <Td fontSize="xs" fontWeight="500">{formatVal(phaseData.amp?.avg, 3)}</Td>
                                <Td fontSize="xs">{formatVal(phaseData.amp?.max, 3)}</Td>
                                {/* Power */}
                                <Td fontSize="xs">{formatVal(toKilo(phaseData.power?.min), 3)}</Td>
                                <Td fontSize="xs" fontWeight="500">{formatVal(toKilo(phaseData.power?.avg), 3)}</Td>
                                <Td fontSize="xs">{formatVal(toKilo(phaseData.power?.max), 3)}</Td>
                                {/* Power Factor */}
                                <Td fontSize="xs">{formatVal(phaseData.powerFactor?.min, 2)}</Td>
                                <Td fontSize="xs" fontWeight="500">{formatVal(phaseData.powerFactor?.avg, 2)}</Td>
                                <Td fontSize="xs">{formatVal(phaseData.powerFactor?.max, 2)}</Td>
                            </Tr>
                        );
                    })}
                </Tbody>
            </Table>
        </Box>
    );
};

const PhaseDetailedDaySection = ({ allDays }: { allDays: any[] }) => {
    const { colorMode } = useColorMode();
    const filteredDays = useMemo(() => {
        return allDays.filter((d) => !!d.phase_values);
    }, [allDays]);

    const [selectedDate, setSelectedDate] = useState<string>(filteredDays[0]?.date || "");

    const selectedDayRecord = useMemo(() => {
        return filteredDays.find((d) => d.date === selectedDate)?.phase_values || null;
    }, [filteredDays, selectedDate]);

    if (filteredDays.length === 0) return null;

    return (
        <Box>
            <Flex justify="space-between" align={{ base: "stretch", sm: "center" }} direction={{ base: "column", sm: "row" }} mb={4} gap={{ base: 2, sm: 4 }}>
                <Text fontSize="sm" fontWeight="500" color={`${colorMode}.subText`}>
                    Select a date to view full phase comparison:
                </Text>
                <Select
                    focusBorderColor="primary"
                    w={{ base: "100%", sm: "180px" }}
                    size="sm"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                >
                    {filteredDays.map((d, index) => (
                        <option key={index} value={d.date}>
                            {d.date}
                        </option>
                    ))}
                </Select>
            </Flex>
            {selectedDayRecord && <PhaseComparisonTable daily={selectedDayRecord} fileName={`phase-comparison-${selectedDate}`} />}
        </Box>
    );
};

const PhaseReportSection = ({ data, isSingleDay }: PhaseReportSectionProps) => {
    const { colorMode } = useColorMode();
    const border = `${colorMode}.border`;

    const hasPhaseData = useMemo(() => {
        if (isSingleDay) {
            return !!data.phase_values;
        } else {
            return data.allDays.some((day) => !!day.phase_values);
        }
    }, [data, isSingleDay]);

    if (!hasPhaseData) return null;

    return (
        <MyCard w="100%" h="100%" minW={0} noPadding>
            <CardHeader
                display="flex"
                justifyContent="space-between"
                alignItems="center"
                py={4}
                borderBottom="1px solid"
                borderColor={border}
            >
                <Text fontSize="md" fontWeight={500}>Phase Telemetry Report</Text>
            </CardHeader>
            <CardBody px={{ base: 3, md: 5 }} minW={0}>
                {isSingleDay ? (
                    <Tabs variant="enclosed" size="sm" colorScheme="orange" w="100%" minW={0}>
                        <TabList overflowX="auto" overflowY="hidden" maxW="100%">
                            <Tab fontWeight="500" whiteSpace="nowrap" flexShrink={0} px={{ base: 2.5, md: 4 }}>Phase Comparison</Tab>
                            <Tab fontWeight="500" whiteSpace="nowrap" flexShrink={0} px={{ base: 2.5, md: 4 }}>Hourly Details</Tab>
                        </TabList>
                        <TabPanels mt={3}>
                            <TabPanel p={0}>
                                {data.phase_values && <PhaseComparisonTable daily={data.phase_values} />}
                            </TabPanel>
                            <TabPanel p={0}>
                                <PhaseHourlyTable allHours={data.allHours} />
                            </TabPanel>
                        </TabPanels>
                    </Tabs>
                ) : (
                    <Tabs variant="enclosed" size="sm" colorScheme="orange" w="100%" minW={0}>
                        <TabList overflowX="auto" overflowY="hidden" maxW="100%">
                            <Tab fontWeight="500" whiteSpace="nowrap" flexShrink={0} px={{ base: 2.5, md: 4 }}>Daily SUM Trend</Tab>
                            <Tab fontWeight="500" whiteSpace="nowrap" flexShrink={0} px={{ base: 2.5, md: 4 }}>Detailed Day Comparison</Tab>
                        </TabList>
                        <TabPanels mt={3}>
                            <TabPanel p={0}>
                                <PhaseDailyTrendTable allDays={data.allDays} />
                            </TabPanel>
                            <TabPanel p={0}>
                                <PhaseDetailedDaySection allDays={data.allDays} />
                            </TabPanel>
                        </TabPanels>
                    </Tabs>
                )}
            </CardBody>
        </MyCard>
    );
};

export default PhaseReportSection;