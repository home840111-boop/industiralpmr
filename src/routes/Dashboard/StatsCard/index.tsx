import {
    GridItem,
    SimpleGrid,
} from "@chakra-ui/react";
import Stat from "./Stats";
import { FaBoxes, FaCubes } from "react-icons/fa";
import { BsFillGearFill } from "react-icons/bs";
import { HiLightningBolt } from "react-icons/hi";
import Overview from "./Overview";
import Get from "../../../Components/Store/hooks/Get";
import { factoryProductionAtom } from "../../../Components/Store/atoms";

interface stat {
    value: number
    change: number
    chart: number[]
}
interface StatsCardProps {
    total: {
        shots: stat,
        production_meters: stat,
        production: stat,
        electricity: stat,
        realtimeKW: {
            current: number,
            change: number,
        },
        material: stat
    },
    overview: {
        machines: {
            on: number,
            total: number
        },
        equipments: {
            on: number,
            total: number
        },
        units: {
            on: number,
            total: number
        },
        supervisor: string
    },
    notFound?: boolean
}
const StatsCard = ({
    total,
    overview,
    notFound = false
}: StatsCardProps): JSX.Element => {
    const productionType = Get(factoryProductionAtom);

    return <>
        <Overview notFound={notFound} overview={overview} />
        <SimpleGrid
            mt={5}
            columns={{ base: 1, lg: 2 }}
            flexDir={"row"}
            alignItems={"center"}
            spacing={5}>
            {productionType === "meter" ? <GridItem colSpan={2}>
                <Stat
                    title={"Production"}
                    value={total.production_meters.value}
                    icon={FaBoxes}
                    change={total.production_meters.change}
                    chart={total.production_meters.chart}
                    format="meter"
                    notFound={notFound}
                />
            </GridItem> : <>
                <Stat
                    title={"Shots"}
                    value={total.shots.value}
                    icon={BsFillGearFill}
                    change={total.shots.change}
                    chart={total.shots.chart}
                    format="shots"
                    notFound={notFound}
                />
                <Stat
                    title={"Production"}
                    value={total.production.value}
                    icon={FaBoxes}
                    change={total.production.change}
                    chart={total.production.chart}
                    format="pieces"
                    notFound={notFound}
                />
            </>}
            <Stat
                format={"units"}
                // realtimeKW={total.realtimeKW}
                title={"Electricity usage"}
                value={total.electricity.value}
                icon={HiLightningBolt}
                change={total.electricity.change}
                chart={total.electricity.chart}
                changeInverse={true}
                notFound={notFound}
            />
            <Stat
                format={"weight"}
                title={"material consumption"}
                value={total.material.value}
                icon={FaCubes}
                change={total.material.change}
                chart={total.material.chart}
                notFound={notFound}
            />
        </SimpleGrid>
    </>
}

export default StatsCard