import { Box, Button, ButtonGroup, CardHeader, Flex, Text, useColorMode } from "@chakra-ui/react"
import { useMemo } from "react"
import { FiDownload } from "react-icons/fi"
import { DataToSet } from ".."
import type { ReportSubmitType } from "../../../Selector/types"
import MyCard from "../../../../../Components/micro/Card"
import MachineBreakdown from "./MachineBreakdown"
import MachineHours from "./MachineHours"
import downloadCSV from "../../../../../Components/Exporters/csvDownload"
import Get from "../../../../../Components/Store/hooks/Get"
import { factoryProductionAtom } from "../../../../../Components/Store/atoms"
import lengthFormatter from "../../../../../Components/Functions/formatters/lengthFormatter"
import numberFormatter from "../../../../../Components/Functions/formatters/numberFormatter"
import weightFormatter from "../../../../../Components/Functions/formatters/weightFormatter"
import unitFormatter from "../../../../../Components/Functions/formatters/unitFormatter"
import secFormatter from "../../../../../Components/Functions/formatters/secFormatter"

type ShiftOption = ReportSubmitType["factory"]["secondaryOption"][number]

const Machine = ({
    data,
    isSingleDay,
    dateFrom,
    dateTo,
    shiftOptions,
    activeShifts,
    onToggleShift,
    machinesOverride,
    isUpdating
}: {
    data: DataToSet,
    isSingleDay: boolean,
    dateFrom?: string,
    dateTo?: string,
    shiftOptions?: ShiftOption[],
    activeShifts?: ShiftOption[],
    onToggleShift?: (value: string) => void,
    machinesOverride?: DataToSet["machines"],
    isUpdating?: boolean
}) => {

    return <>
        <MachineTotal data={data} machinesOverride={machinesOverride} isUpdating={isUpdating} dateFrom={dateFrom} dateTo={dateTo} shiftOptions={shiftOptions} activeShifts={activeShifts} onToggleShift={onToggleShift} />
        <MachineHours isSingleDay={isSingleDay} hours={data.machineHours} />
    </>
};

const MachineTotal = ({
    data,
    dateFrom,
    dateTo,
    shiftOptions,
    activeShifts,
    onToggleShift,
    machinesOverride,
    isUpdating
}: {
    data: DataToSet,
    dateFrom?: string,
    dateTo?: string,
    shiftOptions?: ShiftOption[],
    activeShifts?: ShiftOption[],
    onToggleShift?: (value: string) => void,
    machinesOverride?: DataToSet["machines"],
    isUpdating?: boolean
}) => {
    const machinesData = machinesOverride ?? data.machines;
    const { colorMode } = useColorMode();
    const productionType = Get(factoryProductionAtom);
    const { border } = useMemo(() => ({
        border: `${colorMode}.border`
    }), [colorMode]);

    const handleDownloadCSV = () => {
        const isMeter = productionType === "meter";

        const headers = [
            "Machine",
            "Mold",
            ...(isMeter ? [] : ["Shots"]),
            "Production",
            "Material",
            "Electricity",
            "Avg Cycletime",
            "On Time",
            "Unplanned Idle",
            "Unplanned Off",
            "Planned",
            "Efficiency",
        ];

        const rows = Object.values(machinesData).map((machine) => [
            machine.name,
            (machine.moldName || "").toUpperCase(),
            ...(isMeter
                ? [lengthFormatter(machine.production_meters)]
                : [
                    numberFormatter(machine.shots, "shot(s)"),
                    numberFormatter(machine.production, "pc(s)"),
                ]),
            weightFormatter(machine.material),
            unitFormatter(machine.electricity),
            machine.avgCycletime,
            secFormatter(machine.ontime),
            secFormatter(machine.unplannedIdle),
            secFormatter(machine.unplannedOff),
            secFormatter(machine.plannedDown),
            `${machine.efficiency}%`,
        ]);

        downloadCSV("machine-total.csv", headers, rows);
    };

    return <MyCard p={0}>
        <CardHeader borderBottom={"1px solid"} borderColor={border} display="flex" alignItems="center" flexWrap="wrap" rowGap={2} px={2} pb={1} pt={3}>
            <Flex w={{ base: "100%", md: shiftOptions && onToggleShift ? "60%" : "100%" }} align="center" justify="space-between" pr={{ base: 0, md: 3 }}>
                <Text fontWeight={500} fontSize="lg">Machine Total</Text>
                <Button
                    size="sm"
                    variant="outline"
                    colorScheme="orange"
                    leftIcon={<FiDownload />}
                    onClick={handleDownloadCSV}
                    isDisabled={Object.keys(machinesData).length === 0}
                >
                    CSV
                </Button>
            </Flex>
            {shiftOptions && activeShifts && onToggleShift && <Flex
                align="center"
                gap={2}
                flex={1}
                justify="flex-end"
                pr={1}>
                <Text fontSize="10px" fontWeight={600} letterSpacing="wider" opacity={0.6} textTransform="uppercase">Shifts</Text>
                <ButtonGroup size="xs" isAttached variant="outline" role="group" aria-label="Shifts included in report">
                    {shiftOptions.map((shift) => {
                        const isOn = activeShifts.some((s) => s.value === shift.value);
                        return <Button
                            key={shift.value}
                            aria-pressed={isOn}
                            colorScheme="orange"
                            variant={isOn ? "solid" : "outline"}
                            onClick={() => onToggleShift(shift.value)}
                            h={6}
                            minW={7}
                            px={2}
                            fontSize="xs"
                            fontWeight={600}
                            borderRadius="md">
                            {shift.label}
                        </Button>;
                    })}
                </ButtonGroup>
            </Flex>}
        </CardHeader>
        <Box opacity={isUpdating ? 0.5 : 1} transition="opacity .2s" pointerEvents={isUpdating ? "none" : undefined}>
            <MachineBreakdown machines={machinesData} dateFrom={dateFrom} dateTo={dateTo} />
        </Box>
    </MyCard>
}

export default Machine;
export { MachineTotal }
