import { Button, CardBody, CardHeader, Table, Tbody, Text, Th, Thead, Tr, useColorMode } from "@chakra-ui/react"
import { useMemo } from "react";
import { FiDownload } from "react-icons/fi";
import { DataToSet } from "..";
import MyCard from "../../../../../Components/micro/Card";
import MoldRow from "./MoldRow";
import downloadCSV from "../../../../../Components/Exporters/csvDownload";
import Get from "../../../../../Components/Store/hooks/Get";
import { factoryProductionAtom } from "../../../../../Components/Store/atoms";
import lengthFormatter from "../../../../../Components/Functions/formatters/lengthFormatter";
import numberFormatter from "../../../../../Components/Functions/formatters/numberFormatter";
import weightFormatter from "../../../../../Components/Functions/formatters/weightFormatter";
import unitFormatter from "../../../../../Components/Functions/formatters/unitFormatter";
import secFormatter from "../../../../../Components/Functions/formatters/secFormatter";

const MoldsWorked = ({
    isSingleDay,
    molds,
    rejectedPieces = 0
}: {
    isSingleDay: boolean,
    molds: DataToSet["molds"],
    rejectedPieces?: number
}) => {
    const { colorMode } = useColorMode();
    const productionType = Get(factoryProductionAtom);
    const { border, headBG, headColor } = useMemo(() => {
        return {
            border: `${colorMode}.border`,
            headBG: `${colorMode}.tableHeaderBG`,
            headColor: `${colorMode}.tableHeaderColor`
        }
    }, [colorMode]);

    const headings: string[] = [
        "Mold",
        "Production Stats",
        "Consumption Stats",
        "Timings",
        "Operation"
    ];

    const handleDownloadCSV = () => {
        const isMeter = productionType === "meter";

        const csvHeaders = [
            "Mold",
            "Efficiency",
            "Avg Cycle Time",
            ...(isMeter ? ["Production"] : ["Shots", "Production"]),
            "Electricity",
            "Material",
            "On Time",
            "Idle Time",
            "Product Name",
            "Product Color",
            "Product T. Weight",
            "Materials",
        ];

        const rows = Object.entries(molds).map(([moldName, mold]) => {
            const { stats, details } = mold;

            let totalWeight = 0;
            const materials: { name: string, weight: number, pc_weight: number | null }[] = [];
            if (details.materials === undefined) {
                materials.push({
                    name: details.material.toUpperCase(),
                    weight: details.productWeight,
                    pc_weight: null
                });
                totalWeight += details.productWeight;
                if (details.multiComponent) {
                    materials.push({
                        name: details.material2.toUpperCase(),
                        weight: details.productWeight2,
                        pc_weight: null
                    });
                    totalWeight += details.productWeight2;
                }
            } else {
                details.materials.forEach(material => {
                    materials.push({
                        name: material.name.toUpperCase(),
                        weight: material.weight,
                        pc_weight: material.pc_weight || null
                    });
                    totalWeight += material.weight;
                });
            }

            const efficiency = +(
                stats.ontime && stats.ontime + stats.idletime
                    ? (stats.ontime / (stats.ontime + stats.idletime)) * 100
                    : 0
            ).toFixed(2);
            const cycleTime = +((stats.ontime / stats.shots) || 0).toFixed(0);

            return [
                moldName.toUpperCase(),
                `${efficiency}%`,
                `${cycleTime}s`,
                ...(isMeter
                    ? [lengthFormatter(stats.production_meters)]
                    : [
                        numberFormatter(stats.shots, "shot(s)"),
                        numberFormatter(stats.production, "pc(s)"),
                    ]),
                unitFormatter(stats.electricity),
                weightFormatter(stats.material),
                secFormatter(stats.ontime),
                secFormatter(stats.idletime),
                details.product.toUpperCase(),
                details.productColor,
                weightFormatter(totalWeight),
                materials
                    .map((m) => `${m.name} - ${weightFormatter(m.weight, m.pc_weight)}`)
                    .join(" | "),
            ];
        });

        downloadCSV("molds-worked.csv", csvHeaders, rows);
    };

    return <MyCard
        w="100%"
        h="100%"
        noPadding>
        <CardHeader
            display={"flex"}
            justifyContent={"space-between"}
            alignItems={"center"}
            borderBottom="1px solid"
            borderColor={border}
            py={4}>
            <Text
                fontSize="md"
                fontWeight={500}>Molds Worked</Text>
            <Button
                size="sm"
                variant="outline"
                colorScheme="orange"
                leftIcon={<FiDownload />}
                onClick={handleDownloadCSV}
                isDisabled={Object.keys(molds).length === 0}
            >
                CSV
            </Button>
        </CardHeader>
        <CardBody p={0}>
            <Table variant='simple' overflowX={{
                base: "scroll",
                midLgXl: "hidden"
            }} display={{
                base: "block",
                midLgXl: "table"
            }}>
                <Thead
                    color={headColor}
                    bgColor={headBG}>
                    <Tr>
                        {headings.map((heading, i) => <Th
                            key={i}
                            color={headColor}>{heading}</Th>)}
                    </Tr>
                </Thead>
                <Tbody fontSize={14}>
                    {Object.entries(molds).map(([moldName, mold]) => <MoldRow moldName={moldName} key={moldName} mold={mold} />)}
                </Tbody>
            </Table>
        </CardBody>
    </MyCard>
}

export default MoldsWorked;