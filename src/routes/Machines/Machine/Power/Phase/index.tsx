import { Box, CardBody, CardHeader, Center, Divider, SimpleGrid, GridItem, Td, Text, useColorMode, VStack } from "@chakra-ui/react";
import { useMemo } from "react";
import MyCard from "../../../../../Components/micro/Card";
import MeterBox from "../MeterBox";
import Table from "../../../../../Components/micro/Table";
import PowerFactorGuage from "./PowerFactorGuage";
import { dbSchemaHourlyRecord, dbSchemaNow, dbSchemaRecord } from "../types";
import unitFormatter from "../../../../../Components/Functions/formatters/unitFormatter";
// import PowerProgress from "./PowerProgress";
import MyTooltip from "../../../../../Components/micro/MyTooltip";
import dayjs from "../../../../../Components/Functions/dayjs";
import Voltage from "./Charts/Voltage";
import Ampere from "./Charts/Ampere";
import ActivePower from "./Charts/ActivePower";
// import ReactivePower from "./Charts/ReactivePower";
import ApparentPower from "./Charts/ApparentPower";
import PowerFactor from "./Charts/PowerFactor";
import secondsToHourMin from "../../../../../Components/Functions/converters/secondsToHourMin";

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

const Phase = ({
    isOnline,
    phase,
    now,
    data,
    hourly,
    updated,
    shiftStart
}: {
    isOnline: boolean | "RESTORING",
    phase: string,
    now: dbSchemaNow["R"],
    data?: dbSchemaRecord["R"],
    hourly?: dbSchemaHourlyRecord,
    updated: number,
    shiftStart?: number
}) => {
    const { colorMode } = useColorMode();
    const { border } = useMemo(() => ({
        border: `${colorMode}.border`
    }), [colorMode]);
    const rows = useMemo(() => {
        if (!data) return [];
        return [
            [{
                element: Text,
                props: {
                    fontWeight: 500
                },
                children: "Voltage"
            }, data.volt.min.toFixed(2) + " V", data.volt.max.toFixed(2) + " V", data.volt.avg.toFixed(2) + " V"],
            [{
                element: Text,
                props: {
                    fontWeight: 500
                },
                children: "Ampere"
            }, data.amp.min.toFixed(2) + " A", data.amp.max.toFixed(2) + " A", data.amp.avg.toFixed(2) + " A"],
            [{
                element: Text,
                props: {
                    fontWeight: 500
                },
                children: "Active Power"
            }, data.power.min.toFixed(2) + " KW", data.power.max.toFixed(2) + " KW", data.power.avg.toFixed(2) + " KW"],
            [{
                element: Text,
                props: {
                    fontWeight: 500
                },
                children: "Apparent Power"
            }, data.apparentPower.min.toFixed(2) + " KVA", data.apparentPower.max.toFixed(2) + " KVA", data.apparentPower.avg.toFixed(2) + " KVA"],
            // [{
            //     element: Text,
            //     props: {
            //         fontWeight: 500
            //     },
            //     children: "Reactive Power"
            // }, data.reactivePower.min.toFixed(2) + " KVAR", data.reactivePower.max.toFixed(2) + " KVAR", data.reactivePower.avg.toFixed(2) + " KVAR"],
            [{
                element: Text,
                props: {
                    fontWeight: 500
                },
                children: "Power Factor"
            }, adjustPF(data.powerFactor)?.min?.toFixed(2) || "-", adjustPF(data.powerFactor)?.max?.toFixed(2) || "-", adjustPF(data.powerFactor)?.avg?.toFixed(2) || "-"],
            [{
                element: Text,
                props: {
                    fontWeight: 500
                },
                children: "Power Consumption"
            }, {
                element: Td,
                props: {
                    colSpan: 3,
                    textAlign: "right"
                },
                children: unitFormatter(data.consumption)
            }]
        ]
    }, [data]);

    const [voltageData, ampereData, activePowerData, apparentPowerData, powerFactorData] = useMemo(() => {
        if (!hourly || !shiftStart) return [[], [], [], [], []];
        const voltageData = [];
        const ampereData = [];
        const activePowerData = [];
        const reactivePowerData = [];
        const apparentPowerData = [];
        const powerFactorData = [];
        const start = shiftStart;

        for (let i = 0; i < 24; i++) {
            const time = secondsToHourMin(
                +start + (+i - 1) * 3600,
            );
            const hour = hourly[i] || {
                [phase]: {
                    volt: {
                        avg: 0,
                        min: 0,
                        max: 0
                    },
                    amp: {
                        avg: 0,
                        min: 0,
                        max: 0
                    },
                    power: {
                        avg: 0,
                        min: 0,
                        max: 0
                    },
                    apparentPower: {
                        avg: 0,
                        min: 0,
                        max: 0
                    },
                    reactivePower: {
                        avg: 0,
                        min: 0,
                        max: 0
                    },
                    powerFactor: {
                        avg: 0,
                        min: 0,
                        max: 0
                    },
                }
            };
            voltageData.push({
                time,
                value: hour[phase as "R" | "S" | "T"].volt.avg,
                type: "Average"
            });
            voltageData.push({
                time,
                value: hour[phase as "R" | "S" | "T"].volt.min,
                type: "Minimum"
            });
            voltageData.push({
                time,
                value: hour[phase as "R" | "S" | "T"].volt.min,
                type: "Maximum"
            });
            ampereData.push({
                time,
                value: hour[phase as "R" | "S" | "T"].amp.avg,
                type: "Average"
            });
            ampereData.push({
                time,
                value: hour[phase as "R" | "S" | "T"].amp.min,
                type: "Minimum"
            });
            ampereData.push({
                time,
                value: hour[phase as "R" | "S" | "T"].amp.min,
                type: "Maximum"
            });
            activePowerData.push({
                time,
                value: hour[phase as "R" | "S" | "T"].power.avg,
                type: "Average"
            });
            activePowerData.push({
                time,
                value: hour[phase as "R" | "S" | "T"].power.min,
                type: "Minimum"
            });
            activePowerData.push({
                time,
                value: hour[phase as "R" | "S" | "T"].power.min,
                type: "Maximum"
            });
            reactivePowerData.push({
                time,
                value: hour[phase as "R" | "S" | "T"].reactivePower.avg,
                type: "Average"
            });
            reactivePowerData.push({
                time,
                value: hour[phase as "R" | "S" | "T"].reactivePower.min,
                type: "Minimum"
            });
            reactivePowerData.push({
                time,
                value: hour[phase as "R" | "S" | "T"].reactivePower.min,
                type: "Maximum"
            });
            apparentPowerData.push({
                time,
                value: hour[phase as "R" | "S" | "T"].apparentPower.avg,
                type: "Average"
            });
            apparentPowerData.push({
                time,
                value: hour[phase as "R" | "S" | "T"].apparentPower.min,
                type: "Minimum"
            });
            apparentPowerData.push({
                time,
                value: hour[phase as "R" | "S" | "T"].apparentPower.min,
                type: "Maximum"
            });
            const pfVal = adjustPF(hour[phase as "R" | "S" | "T"].powerFactor);
            if (pfVal) {
                powerFactorData.push({
                    time,
                    value: pfVal.avg,
                    type: "Average"
                });
                powerFactorData.push({
                    time,
                    value: pfVal.min,
                    type: "Minimum"
                });
                powerFactorData.push({
                    time,
                    value: pfVal.max,
                    type: "Maximum"
                });
            }
        }

        return [voltageData, ampereData, activePowerData, apparentPowerData, powerFactorData];
    }, [hourly, shiftStart, phase]);

    return <MyCard noPadding>
        <CardHeader py={4} borderBottom="1px solid" borderColor={border} display="flex" flexDir="row" justifyContent={"space-between"}>
            <Box w="max-content">
                <Text fontWeight={500} fontSize="md">Phase {phase}</Text>
                <MyTooltip label={"last updated: " + dayjs.unix(updated).format("DD-MM-YYYY HH:mm:ss")}>
                    <Text fontWeight={500} opacity={0.7} fontSize="xs" alignItems="center" display="flex" gap={1}>
                        <Box w="7px" h="7px" borderRadius="full" className={isOnline ? "blink" : undefined} bgColor={isOnline ? "green" : "gray"}></Box>
                        {isOnline ? isOnline === "RESTORING" ? "Restoring" : "Connected" : "Disconnected"}
                    </Text>
                </MyTooltip>
            </Box>
            <Text fontWeight={500} fontSize="sm" alignItems="center" display="flex" gap={1} opacity={0.8}>
                {
                    // print Today, Yesterday, or the date
                    dayjs.unix(updated).isSame(dayjs(), "day") ? "Today"
                        : dayjs.unix(updated).isSame(dayjs().subtract(1, "day"), "day") ? "Yesterday"
                            : dayjs.unix(updated).format("DD MMM")
                }
                {dayjs.unix(updated).format(" hh:mm A")}
            </Text>
        </CardHeader>
        <CardBody p={0}>
            <SimpleGrid gap={2} columns={{
                base: 1,
                lg: 2
            }}>
                <SimpleGrid columns={{
                    base: 1,
                    md: 2
                }} gap={2}>
                    <SimpleGrid columns={2} gap={2} p={4}>
                        <MeterBox suffix="V" heading="Current Voltage" value={+now.volt.toFixed(0)} />
                        <MeterBox suffix="A" heading="Current Ampere" value={+now.amp.toFixed(2)} />
                        <MeterBox suffix="KW" heading="Active Power" value={+now.power.toFixed(3)} />
                        {/* <MeterBox suffix="KVAR" heading="Reactive Power" value={+now.reactivePower.toFixed(2)} /> */}
                        {/* <GridItem colSpan={2}> */}
                        <MeterBox suffix="KVA" heading="Apparent Power" value={+now.apparentPower.toFixed(3)} />
                        {/* </GridItem> */}
                    </SimpleGrid>
                    <Center p={2}>
                        <VStack gap={2} w="100%" justifyContent={"space-between"}>
                            <PowerFactorGuage PF={now.powerFactor} />
                            {/* <PowerProgress activePower={now.power} apparentPower={now.apparentPower} reactivePower={now.reactivePower} /> */}
                        </VStack>
                    </Center>
                </SimpleGrid>
                <VStack w={"100%"}>
                    <Text textAlign="center" fontWeight={500} mt={2}>Today's Statistics</Text>
                    <Table
                        variant={"striped"}
                        size="sm"
                        rows={rows}
                        headings={["", "min", "max", "avg"]} />
                </VStack>
            </SimpleGrid>
            <Divider />
            <SimpleGrid gap={2} columns={{
                base: 1,
                lg: 2
            }}>
                <Voltage data={voltageData} today={data?.volt || {
                    min: 0,
                    max: 0,
                    avg: 0
                }} />
                <Ampere data={ampereData} today={data?.amp || {
                    min: 0,
                    max: 0,
                    avg: 0
                }} />
                <ActivePower data={activePowerData} today={data?.power || {
                    min: 0,
                    max: 0,
                    avg: 0
                }} />
                {/* <ReactivePower data={reactivePowerData} today={data?.reactivePower || {
                    min: 0,
                    max: 0,
                    avg: 0
                }} /> */}
                <ApparentPower data={apparentPowerData} today={data?.apparentPower || {
                    min: 0,
                    max: 0,
                    avg: 0
                }} />
                <GridItem colSpan={{
                    base: 1,
                    lg: 2
                }}>
                    <PowerFactor data={powerFactorData} today={adjustPF(data?.powerFactor) || {
                        min: 0,
                        max: 0,
                        avg: 0
                    }} />
                </GridItem>
            </SimpleGrid>
        </CardBody>
    </MyCard>
}

export default Phase;