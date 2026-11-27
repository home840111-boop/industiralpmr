import { GridItem, SimpleGrid } from "@chakra-ui/react"
import { MachineStats } from "../.."
import MachineTable from "./MachineTable"
import PieChart from "./PieChart"

const MachineBreakdown = ({
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
    return <SimpleGrid
        columns={{
            base: 1,
            md: 5,
        }}>
        <MachineTable machines={machines} dateFrom={dateFrom} dateTo={dateTo} />
        <GridItem colSpan={{
            base: 1,
            md: 2
        }}>
            <PieChart machines={machines} />
        </GridItem>
    </SimpleGrid>
}

export default MachineBreakdown
