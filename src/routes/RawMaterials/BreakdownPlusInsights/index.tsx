import { GridItem, SimpleGrid } from '@chakra-ui/react'
import Chart from './Chart'
import Insights from './Insights'

interface ChartData {
    source: string,
    target: string,
    value: number
}

interface InsightsData {
    mostConsumingMachine: {
        name: string,
        total: number,
        percentage: number
    },
    mostConsumingMaterial: {
        name: string,
        total: number,
        percentage: number
    },
    mostConsumingDay: {
        name: string,
        total: number,
        percentage: number
    }
};

const BreakdownPlusInsights = ({
    loading,
    chartData,
    insights
}: {
    loading: boolean,
    chartData: ChartData[],
    insights: InsightsData | null
}) => {
    return <SimpleGrid
        gap={5}
        columns={{
            base: 1,
            xl: 3
        }}>
        <GridItem colSpan={{
            base: 1,
            xl: 2
        }}>
            <Chart
                loading={loading}
                data={chartData} />
        </GridItem>
        <Insights
            insights={insights}
        />
    </SimpleGrid>
}

export type { ChartData, InsightsData }
export default BreakdownPlusInsights