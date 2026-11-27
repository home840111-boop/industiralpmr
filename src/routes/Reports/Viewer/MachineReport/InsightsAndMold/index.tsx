import { SimpleGrid } from "@chakra-ui/react"
import { DataToSet } from "..";
import InsightsCard from "../../../../Machines/Machine/InsightsCard"
import { Insigts } from "../../../../Machines/Machine/types"
import { MaterialBreakdown as MaterialBreakdownType } from "../../../../Machines/Machine/types"
import MaterialBreakdown from "./MaterialBreakdown";
import MoldBreakdown from "./MoldBreakdown";

const InsightsAndMold = ({
    insights,
    materialBreakdown,
    molds
}: {
    insights: Insigts,
    materialBreakdown: MaterialBreakdownType,
    molds: DataToSet["molds"]
}) => {
    return <SimpleGrid
        gap={5}
        w="100%"
        columns={{
            base: 1,
            lg: 3
        }}>
        <InsightsCard insights={insights} notFound={false} />
        <MaterialBreakdown materialBreakdown={materialBreakdown} />
        <MoldBreakdown moldBreakdown={molds} />
    </SimpleGrid>
}

export default InsightsAndMold