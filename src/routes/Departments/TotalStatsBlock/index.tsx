import { BsFillGearFill } from "react-icons/bs"
import { FaBoxes, FaCubes } from "react-icons/fa"
import { HiLightningBolt } from "react-icons/hi"
import { DataToSet } from ".."
import NumberFormatter from "../../../Components/micro/NumberFormatter"
import UnitFormatter from "../../../Components/micro/UnitFormatter"
import WeightFormatter from "../../../Components/micro/WeightFormatter"
import StatBlock from "./StatBlock"

const initalState = {
    shots: {
        value: -1,
        change: 0
    },
    production: {
        value: -1,
        change: 0
    },
    electricity: {
        value: -1,
        change: 0
    },
    material: {
        value: -1,
        change: 0
    }
}
const TotalStatsBlock = ({
    stats = initalState
}: {
    stats?: DataToSet["total"]
}) => {
    return <>
        <StatBlock loading={stats.shots.value === -1} title="total shot(s)" value={<NumberFormatter number={stats.shots.value} suffix="shot(s)" />} change={stats.shots.change} icon={BsFillGearFill} />
        <StatBlock loading={stats.production.value === -1} title="total piece(s) produced" value={<NumberFormatter number={stats.production.value} suffix="pc(s)" />} change={stats.production.change} icon={FaBoxes} />
        <StatBlock loading={stats.electricity.value === -1} title="total electricity consumption" value={<UnitFormatter number={stats.electricity.value} />} change={stats.electricity.change} icon={HiLightningBolt} />
        <StatBlock loading={stats.material.value === -1} title="total material consumed" value={<WeightFormatter number={stats.material.value} />} change={stats.material.change} icon={FaCubes} />
    </>
}

export default TotalStatsBlock