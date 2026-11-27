import { Badge, GridItem, SimpleGrid, Text } from "@chakra-ui/react"
import { useMemo } from "react";
import { Link } from "react-router-dom";
import { DataToSet } from ".."
import UnitFormatter from "../../../../Components/micro/UnitFormatter";
import Breakdown from "./Breakdown";
import EquipmentsTable from "./EquipmentsTable";

const Equipments = ({
    data
}: {
    data?: DataToSet["equipments"]
}) => {
    const [rows, breakdown]: [(string | object)[][], {
        name: string;
        electricity: number;
    }[]] = useMemo(() => {
        const rows: (string | object)[][] = [];
        const breakdown: {
            name: string;
            electricity: number;
        }[] = [];
        Object.entries(data || {}).forEach(([name, value]) => {
            breakdown.push({
                name: value.name,
                electricity: value.electricity
            })
            rows.push([
                {
                    element: Link,
                    props: {
                        to: `/equipments/${name}`
                    },
                    children: {
                        element: Text,
                        props: {
                            fontWeight: 600
                        },
                        children: value.name
                    }
                },
                {
                    element: Badge,
                    props: {
                        colorScheme: value.status === "ON" ? "green"
                            : value.status === "OFF" ? "red"
                                : value.status === "IDLE" ? "yellow"
                                    : "gray",
                        size: "md"
                    },
                    children: value.status
                }, {
                    element: UnitFormatter,
                    props: {
                        number: value.electricity,
                    }
                }
            ])
        });
        return [rows, breakdown];
    }, [data])

    return data !== undefined && Object.keys(data).length === 0 ? <></> : <SimpleGrid gap={5} columns={{
        base: 1,
        midLgXl: 3
    }}>
        <GridItem h="100%" colSpan={{
            base: 1,
            midLgXl: 2
        }}>
            <EquipmentsTable rows={rows} />
        </GridItem>
        <Breakdown data={breakdown} />
    </SimpleGrid>
}

export default Equipments