import { SimpleGrid } from "@chakra-ui/react"
import { BsFillGearFill } from "react-icons/bs";
import { FaBoxes, FaCubes } from "react-icons/fa";
import { HiLightningBolt } from "react-icons/hi";
import { factoryProductionAtom } from "../../../Components/Store/atoms";
import Get from "../../../Components/Store/hooks/Get";
import Stat from "./StatsCard/Stat";
import { Insigts } from "./types";

const InsightsCard = ({
    insights,
    notFound
}: {
    insights: Insigts | null,
    notFound: boolean
}) => {
    const productionType = Get(factoryProductionAtom);

    return <SimpleGrid w="100%" gap={5} columns={{
        base: 1,
        md: 2,
    }}>
        {productionType === "meter" ? <>
            <Stat
                title={"Prod. Per kWhr"}
                value={insights?.meterProductionPerUnit}
                icon={FaBoxes}
                format="meter"
                notFound={notFound}
            />
            <Stat
                title={"kWhr Per Meter"}
                value={insights?.unitsPerMeter}
                icon={HiLightningBolt}
                format="units"
                notFound={notFound}
            />
        </> : <>
            <Stat
                title={"Shots Per kWhr"}
                value={insights?.shotsPerUnit}
                icon={BsFillGearFill}
                format="shots"
                notFound={notFound}
            />
            <Stat
                title={"kWhr Per shot"}
                value={insights?.unitsPerShot}
                icon={HiLightningBolt}
                format="units"
                notFound={notFound}
            />
            <Stat
                title={"Prod. Per kWhr"}
                value={insights?.productionPerUnit}
                icon={FaBoxes}
                format="pieces"
                notFound={notFound}
            />
            <Stat
                title={"kWhr Per Piece"}
                value={insights?.unitsPerPiece}
                icon={HiLightningBolt}
                format="units"
                notFound={notFound}
            />
        </>}
        <Stat
            title={"Mat. Per kWhr"}
            value={insights?.materialPerUnit}
            icon={FaCubes}
            format="weight"
            notFound={notFound}
        />
        <Stat
            title={"kWhr Per gram"}
            value={insights?.unitsPerGram}
            icon={HiLightningBolt}
            format="units"
            notFound={notFound}
        />
        <Stat
            title={"Mat. Per shot"}
            value={insights?.materialPerShot}
            icon={BsFillGearFill}
            format="weight"
            notFound={notFound}
        />
        <Stat
            title={"kWhr per KG"}
            value={insights?.consumptionPerKg}
            icon={HiLightningBolt}
            format="units"
            notFound={notFound}
        />
    </SimpleGrid>
}

export default InsightsCard;