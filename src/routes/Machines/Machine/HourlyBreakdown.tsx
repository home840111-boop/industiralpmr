import { Button, CardBody, CardHeader, Text, useColorMode } from "@chakra-ui/react";
import { useMemo } from "react";
import { FiDownload } from "react-icons/fi";
import MyCard from "../../../Components/micro/Card";
import MachineHourlyTree from "../../../Components/micro/MachineHourlyTree";
import downloadCSV from "../../../Components/Exporters/csvDownload";
import Get from "../../../Components/Store/hooks/Get";
import { factoryProductionAtom } from "../../../Components/Store/atoms";
import { SortedHourTree } from "./types";

const HourlyBreakdown = ({
    notFound,
    data
}: {
    notFound: boolean,
    data: SortedHourTree[]
}) => {
    const { colorMode } = useColorMode();
    const productionType = Get(factoryProductionAtom);
    const { border } = useMemo(() => {
        return {
            border: `${colorMode}.border`,
        };
    }, [colorMode]);

    const handleDownloadCSV = () => {
        const isMeter = productionType === "meter";

        const headers = [
            "Row Type",
            "Time",
            "Status",
            ...(isMeter ? [] : ["Shot(s)"]),
            isMeter ? "Production (m)" : "Production",
            "Mat. Consumption",
            "Elec. Consumption",
            "On Time",
            "IDLE Time",
            "Off Time",
            "Downtime Reason",
            isMeter ? "Avg. Sec/Meter" : "Avg. Cycle Time",
            "Operator",
            "Mold",
            "Product",
        ];

        const rows: (string | number | undefined | null)[][] = [];

        const walk = (nodes: SortedHourTree[], level: number) => {
            nodes.forEach((node) => {
                const d = node.data;
                rows.push([
                    level === 0 ? "Shift" : level === 1 ? "Hour" : "Detail",
                    d.time,
                    d.status,
                    ...(isMeter ? [] : [d.shots]),
                    isMeter ? d.production_meters : d.production,
                    d.material,
                    d.electricity,
                    d.ontime,
                    d.idletime,
                    d.offtime,
                    d.downtimeReason || "-",
                    d.cycleTime,
                    d.operator,
                    d.mold,
                    d.product,
                ]);
                if (node.children?.length) walk(node.children, level + 1);
            });
        };
        walk(data || [], 0);

        downloadCSV("hourly-details.csv", headers, rows);
    };

    return (
        <MyCard
            w="100%"
            h="100%"
            noPadding
        >
            <CardHeader
                display={"flex"}
                justifyContent={"space-between"}
                alignItems={"center"}
                borderBottom="1px solid"
                borderColor={border}
                py={4}
            >
                <Text
                    fontSize="md"
                    fontWeight={500}
                >
                    Hourly Details
                </Text>
                <Button
                    size="sm"
                    variant="outline"
                    colorScheme="orange"
                    leftIcon={<FiDownload />}
                    onClick={handleDownloadCSV}
                    isDisabled={!data?.length}
                >
                    CSV
                </Button>
            </CardHeader>
            <CardBody px={0} py={2}>
                <MachineHourlyTree data={data} notFound={notFound} />
            </CardBody>
        </MyCard>
    );
};

export default HourlyBreakdown;
