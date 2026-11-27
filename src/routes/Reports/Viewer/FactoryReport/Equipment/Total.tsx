import { Button, CardHeader, Text, useColorMode } from "@chakra-ui/react";
import { useMemo } from "react";
import { FiDownload } from "react-icons/fi";
import { DataToSet } from ".."
import MyCard from "../../../../../Components/micro/Card";
import downloadCSV from "../../../../../Components/Exporters/csvDownload";
import unitFormatter from "../../../../../Components/Functions/formatters/unitFormatter";
import EquipmentBreakdown from "./EquipmentBreakdown";

const EquipmentTotal = ({
    data
}: {
    data: DataToSet
}) => {
    const { colorMode } = useColorMode();
    const { border } = useMemo(() => ({
        border: `${colorMode}.border`
    }), [colorMode]);

    const handleDownloadCSV = () => {
        const headers = ["Equipment", "Status", "Electricity"];
        const rows = Object.values(data.equipments).map((equipment) => [
            equipment.name,
            equipment.electricity > 0 ? "ON" : "OFF",
            unitFormatter(equipment.electricity),
        ]);
        downloadCSV("equipment-total.csv", headers, rows);
    };

    return <MyCard p={0}>
        <CardHeader borderBottom={"1px solid"} borderColor={border} display="flex" alignItems="center" justifyContent={"space-between"} px={2} pb={1} pt={3}>
            <Text fontWeight={500} fontSize="lg">Equipment Total</Text>
            <Button
                size="sm"
                variant="outline"
                colorScheme="orange"
                leftIcon={<FiDownload />}
                onClick={handleDownloadCSV}
                isDisabled={Object.keys(data.equipments).length === 0}
                ml="auto"
                mr={{ base: 0, md: "40%" }}
            >
                CSV
            </Button>
        </CardHeader>
        <EquipmentBreakdown equipments={data.equipments} />
    </MyCard>
}

export default EquipmentTotal