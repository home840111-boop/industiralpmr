import { Badge, GridItem, SimpleGrid, Text } from "@chakra-ui/react"
import { useMemo } from "react";
import { Link } from "react-router-dom";
import { DataToSet } from ".."
import NumberFormatter from "../../../../Components/micro/NumberFormatter";
import UnitFormatter from "../../../../Components/micro/UnitFormatter";
import WeightFormatter from "../../../../Components/micro/WeightFormatter";
import Breakdown from "./Breakdown";
import MachinesTable from "./MachinesTable";

const Machines = ({
    data
}: {
    data?: DataToSet["machines"]
}) => {
    const [rows, breakdown]: [(string | object)[][], {
        name: string;
        shots: number;
        production: number;
        material: number;
        electricity: number;
    }[]] = useMemo(() => {
        const rows: (string | object)[][] = [];
        const breakdown: {
            name: string;
            shots: number;
            production: number;
            material: number;
            electricity: number;
        }[] = [];
        Object.entries(data || {}).forEach(([name, value]) => {
            breakdown.push({
                name: value.name,
                shots: value.shots,
                production: value.production,
                material: value.material,
                electricity: value.electricity
            })
            rows.push([
                {
                    element: Link,
                    props: {
                        to: `/machines/${name}`
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
                },
                {
                    element: NumberFormatter,
                    props: {
                        number: value.shots,
                        suffix: "shot(s)"
                    }
                },
                {
                    element: NumberFormatter,
                    props: {
                        number: value.production,
                        suffix: "pc(s)"
                    }
                }, {
                    element: WeightFormatter,
                    props: {
                        number: value.material,
                    }
                }, {
                    element: UnitFormatter,
                    props: {
                        number: value.electricity,
                    }
                }, {
                    element: Text,
                    props: {
                        py: 1,
                        textTransform: "uppercase"
                    },
                    children: value.mold
                }
            ])
        });
        return [rows, breakdown];
    }, [data])

    return <SimpleGrid gap={5} columns={{
        base: 1,
        midLgXl: 3
    }}>
        <Breakdown data={breakdown} />
        <GridItem h="100%" colSpan={{
            base: 1,
            midLgXl: 2
        }}>
            <MachinesTable rows={rows} />
        </GridItem>
    </SimpleGrid>
}

export default Machines