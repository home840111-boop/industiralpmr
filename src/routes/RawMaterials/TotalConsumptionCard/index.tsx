import { Box, CardBody, GridItem, Heading, SimpleGrid, Skeleton, Text, VStack } from "@chakra-ui/react"
import { SmallFill } from "../../../Components/Loaders"
import MyCard from "../../../Components/micro/Card"
import WeightFormatter from "../../../Components/micro/WeightFormatter"
import Chart from "./Chart"

interface ChartData {
    day: string,
    value: number
}

const TotalConsumptionCard = ({
    loading,
    time,
    total,
    chartsData
}: {
    loading: boolean,
    time: string,
    total: number,
    chartsData: ChartData[]
}) => {

    if (loading) return <LoadingCard />

    return <MyCard py={0} minH="200px">
        <CardBody>
            <SimpleGrid columns={{
                base: 1,
                lg: 2
            }} h="100%" alignItems="flex-end">
                <VStack w="100%" alignItems={"flex-start"} gap={7} justifyContent="space-between" h="100%">
                    <Box>
                        <Text fontWeight={600} fontSize="md">Total Consumption</Text>
                        <Text fontWeight={500} fontSize="sm" opacity={0.7}>{time}</Text>
                    </Box>
                    <Box w="100%">
                        <Heading fontSize={"2xl"} fontWeight={700}>
                            <WeightFormatter number={total * 1000} />
                        </Heading>
                    </Box>
                </VStack>
                <Chart data={chartsData} />
            </SimpleGrid>
        </CardBody>
    </MyCard>
}

const LoadingCard = () => {

    return <MyCard py={0} minH="200px">
        <CardBody>
            <SimpleGrid columns={3} h="100%">
                <VStack w="100%" alignItems={"flex-start"} gap={7} h="100%" justifyContent={"space-between"}>
                    <Box>
                        <Skeleton h="15px" w="150px" />
                        <Skeleton mt={2} h="12px" w="100px" />
                    </Box>
                    <Box w="100%">
                        <Heading fontWeight={700}>
                            <Skeleton h="40px" w="100px" />
                        </Heading>
                    </Box>
                </VStack>
                <GridItem colSpan={2}>
                    <SmallFill />
                </GridItem>
            </SimpleGrid>
        </CardBody>
    </MyCard>
}

export type { ChartData }
export default TotalConsumptionCard