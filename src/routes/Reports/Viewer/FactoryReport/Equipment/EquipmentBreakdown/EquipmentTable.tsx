import { Box, GridItem, Tag, Text } from "@chakra-ui/react"
import { useMemo } from "react"
import { EquipmentStats } from "../.."
import UnitFormatter from "../../../../../../Components/micro/UnitFormatter"
import Table from "../../../../../../Components/micro/Table"

const headings = [
    "Machine",
    "Status",
    "Electricity"
]

const EquipmentTable = ({
    equipments
}: {
    equipments: {
        [key: string]: EquipmentStats
    }
}) => {
    const data = useMemo(() => {
        return Object.values(equipments).map((equipments) => {
            const { name, electricity } = equipments;
            return [
                {
                    element: Text,
                    props: { fontWeight: 500, fontSize: "md" },
                    children: name,
                }, {
                    element: Tag,
                    props: { colorScheme: electricity > 0 ? "green" : "red" },
                    children: electricity > 0 ? "ON" : "OFF",
                }, {
                    element: UnitFormatter,
                    props: { number: electricity },
                }
            ];
        });
    }, [equipments]);

    return <GridItem colSpan={{
        base: 1,
        md: 3
    }}>
        <Box maxH="500px" overflow={"auto"}>
            <Table headings={headings} rows={data} />
        </Box>
    </GridItem>
}

export default EquipmentTable