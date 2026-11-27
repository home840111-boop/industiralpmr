import { GridItem, SimpleGrid } from '@chakra-ui/react'
import { EquipmentStats } from '../..'
import EquipmentTable from './EquipmentTable'
import PieChart from './PieChart'

const EquipmentBreakdown = ({
    equipments
}: {
    equipments: {
        [key: string]: EquipmentStats
    }
}) => {
    return <SimpleGrid
        columns={{
            base: 1,
            md: 5,
        }}>
        <EquipmentTable equipments={equipments} />
        <GridItem colSpan={{
            base: 1,
            md: 2
        }}>
            <PieChart equipments={equipments} />
        </GridItem>
    </SimpleGrid>
}

export default EquipmentBreakdown