import { Box, GridItem, Text } from "@chakra-ui/react"
import { useMemo } from "react"
import { Link } from "react-router-dom";
import { MachineStats } from "../..";
import secFormatter from "../../../../../../Components/Functions/formatters/secFormatter";
import LengthFormatter from "../../../../../../Components/micro/LengthFormatter";
import MyTooltip from "../../../../../../Components/micro/MyTooltip";
import NumberFormatter from "../../../../../../Components/micro/NumberFormatter";
import Table from "../../../../../../Components/micro/Table";
import UnitFormatter from "../../../../../../Components/micro/UnitFormatter";
import WeightFormatter from "../../../../../../Components/micro/WeightFormatter";
import { factoryProductionAtom } from "../../../../../../Components/Store/atoms";
import Get from "../../../../../../Components/Store/hooks/Get";

const MachineTable = ({
    machines,
    dateFrom,
    dateTo
}: {
    machines: {
        [key: string]: MachineStats
    },
    dateFrom?: string,
    dateTo?: string
}) => {
    const productionType = Get(factoryProductionAtom);
    const [headings, data] = useMemo(() => {
        const headings = [
            "Machine",
            "Mold",
            ...(productionType === "meter" ? ["Production"] : ["Shots",
                "Production"]),
            "Material",
            "Electricity",
            "Avg Cycletime",
            "On Time",
            "Unplanned Down",
            "Planned",
            "Efficiency",
            ...(dateFrom ? ["Downtime"] : [])
        ];
        return [headings, Object.entries(machines).map(([machineId, machine]) => {
            const { name, shots, electricity, production, production_meters, material, moldName, avgCycletime, efficiency, idletime, offtime, ontime, unplannedIdle, unplannedOff, unplannedDown, plannedDown } = machine;
            return [
                {
                    element: Text,
                    props: { fontWeight: 500, fontSize: "md" },
                    children: name,
                }, moldName.toUpperCase(),
                ...(productionType === "meter" ? [{
                    element: LengthFormatter,
                    props: { number: production_meters },
                }] : [{
                    element: NumberFormatter,
                    props: { number: shots, suffix: "shot(s)" },
                }, {
                    element: NumberFormatter,
                    props: { number: production, suffix: "pc(s)" },
                }]),
                {
                    element: WeightFormatter,
                    props: { number: material },
                }, {
                    element: UnitFormatter,
                    props: { number: electricity },
                },
                avgCycletime,
                secFormatter(ontime),
                {
                    element: MyTooltip,
                    props: {
                        label: `Unplanned Idle: ${secFormatter(unplannedIdle)} · Unplanned Off: ${secFormatter(unplannedOff)} · Planned: ${secFormatter(plannedDown)} (Raw Idle: ${secFormatter(idletime)}, Raw Off: ${secFormatter(offtime)})`,
                    },
                    children: {
                        element: Text,
                        props: {
                            as: "span",
                            fontWeight: 500,
                            textDecoration: unplannedDown > 0 ? "underline dotted" : undefined,
                            textUnderlineOffset: "3px",
                            cursor: "help",
                        },
                        children: secFormatter(unplannedDown),
                    },
                },
                secFormatter(plannedDown),
                efficiency + "%",
                // opens this machine's report for the same dates, where idle / off time can be categorized
                ...(dateFrom ? [{
                    element: Link,
                    props: {
                        to: `/reports?type=machine&option=${encodeURIComponent(machineId)}&date_from=${dateFrom}&date_to=${dateTo || dateFrom}`,
                        color: "orange.300",
                        fontWeight: 600,
                        fontSize: "sm",
                        whiteSpace: "nowrap"
                    },
                    children: "Categorize"
                }] : [])
            ];
        })];
    }, [machines, productionType, dateFrom, dateTo]);

    return <>
        <GridItem colSpan={{
            base: 1,
            md: 3
        }}>
            <Box p={0} maxH="500px" overflow={"auto"}>
                <Table headings={headings} rows={data} alignLastToLeft={!dateFrom} />
            </Box>
        </GridItem>
    </>
}

export default MachineTable
