import { SimpleGrid } from "@chakra-ui/react"
import { FaCogs, FaCubes, FaMinusCircle, FaWeightHanging } from "react-icons/fa"
import { StatsType } from ".."
import Stat from "./Stat"

const Stats = ({
    loading,
    stats
}: {
    loading: boolean,
    stats: StatsType | null
}) => {
    return <SimpleGrid
        gap={5}
        columns={{
            base: 1,
            md: 2,
            lg: 4
        }}>
        <Stat
            loading={loading}
            title="Total Materials"
            value={stats?.total || 0}
            color="gray.400"
            icon={FaCubes}
        />
        <Stat
            loading={loading}
            title="Available Material"
            value={stats?.available || 0}
            type="weight"
            color="green.500"
            icon={FaWeightHanging}
        />
        <Stat
            loading={loading}
            title="Consumed Material"
            value={stats?.consumed || 0}
            type="weight"
            icon={FaCogs}
        />
        <Stat
            loading={loading}
            title="Negative Materials"
            value={stats?.negatives || 0}
            color="red.400"
            icon={FaMinusCircle}
        />
    </SimpleGrid>
}

export default Stats