import { Box, HStack, Progress, SimpleGrid, Text, VStack, Skeleton, Heading } from '@chakra-ui/react'
import MyCard from '../../../Components/micro/Card';
import { Suspense, useMemo } from 'react';
import NotFound from '../../../Components/micro/NotFound';

const Overview = ({
    overview,
    notFound = false
}: {
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
}) => {
    const [isLoading, inProduction] = useMemo(() => {
        return [
            overview.units.total === 0,
            overview.machines.on > 0
        ]
    }, [overview]);

    return <MyCard
        minH={{
            base: "max-content",
            lg: "15vh"
        }}
        h="fit-content"
        px={5}
        py={4}
        noPadding>
        <Text
            mb={5}
            textTransform={"uppercase"}
            fontWeight='medium'
            opacity={0.8}
            letterSpacing={"wide"}
            fontSize={14}>factory Overview</Text>
        {
            notFound ? <Suspense fallback={<Box />}>
                <NotFound />
            </Suspense> : <SimpleGrid columns={{
                base: 1,
                lg: 2
            }} gap={{
                base: 5,
                lg: 10
            }}>
                {
                    isLoading ? <Box>
                        <Skeleton height="25px" mb="5" w="100%" />
                        <Skeleton height="25px" w="100%" />
                    </Box>
                        : <SimpleGrid columns={2}>
                            <Heading my="auto" size="xs" opacity="0.9" fontWeight="600" textTransform={"capitalize"}>production status</Heading>
                            <Heading my="auto"
                                wordBreak={"break-all"}
                                size="sm" fontWeight="600" textTransform={"uppercase"}>
                                {inProduction ? "in production" : "not in production"}
                            </Heading>
                            <Heading my="auto" size="xs" opacity="0.9" fontWeight="600" textTransform={"capitalize"}>supervisor - {
                                overview.supervisor.slice(0, 1).toUpperCase()
                            }</Heading>
                            <Heading my="auto" size="sm" fontWeight="600" textTransform={"uppercase"}>{
                                overview.supervisor.slice(3)
                            }</Heading>
                        </SimpleGrid>
                }
                {
                    isLoading ? <Box>
                        <Skeleton height="15px" mb="4" w="100%" />
                        <Skeleton height="15px" mb="4" w="100%" />
                        <Skeleton height="15px" w="100%" />
                    </Box>
                        : <HStack>
                            <VStack alignItems="flex-start" w="40%">
                                <Text fontSize="sm" opacity="0.8" fontWeight="500">Units ON</Text>
                                <Text fontSize="sm" opacity="0.8" fontWeight="500">Machines ON</Text>
                                <Text fontSize="sm" opacity="0.8" fontWeight="500">Equipments ON</Text>
                            </VStack>
                            <VStack w="50%" spacing={5}>
                                <Progress
                                    w="100%"
                                    size="sm"
                                    borderRightRadius={'md'}
                                    colorScheme="blue"
                                    value={overview.units.total ? overview.units.on / overview.units.total * 100 : 0}
                                />
                                <Progress
                                    w="100%"
                                    size="sm"
                                    borderRightRadius={'md'}
                                    colorScheme="green"
                                    value={overview.machines.total ? overview.machines.on / overview.machines.total * 100 : 0}
                                />
                                <Progress
                                    w="100%"
                                    size="sm"
                                    borderRightRadius={'md'}
                                    colorScheme="orange"
                                    value={overview.equipments.total ? overview.equipments.on / overview.equipments.total * 100 : 0}
                                />
                            </VStack>
                            <VStack w="10%">
                                <Text fontSize="xs" fontWeight="bold">{`${overview.units.on}/${overview.units.total}`}</Text>
                                <Text fontSize="xs" fontWeight="bold">{`${overview.machines.on}/${overview.machines.total}`}</Text>
                                <Text fontSize="xs" fontWeight="bold">{`${overview.equipments.on}/${overview.equipments.total}`}</Text>
                            </VStack>
                        </HStack>
                }
            </SimpleGrid>
        }
    </MyCard >
}

export default Overview