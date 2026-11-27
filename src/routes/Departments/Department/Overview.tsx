import { Box, Flex, Heading, HStack, Progress, SimpleGrid, Skeleton, Text, VStack } from '@chakra-ui/react'
import { DataToSet } from '.'
import MyCard from '../../../Components/micro/Card'

const Overview = ({
    data
}: {
    data?: DataToSet["overview"]
}) => {

    return <MyCard
        minH={{
            base: "max-content",
            lg: "100%"
        }}
        as={Flex}
        flexDir="column"
        justifyContent="space-between"
        h="fit-content"
        px={5}
        pb={10}
        pt={5}
        noPadding>
        <Text
            mb={5}
            textTransform={"uppercase"}
            fontWeight='medium'
            opacity={0.8}
            letterSpacing={"wide"}
            fontSize={14}>department Overview</Text>
        {<SimpleGrid h="100%" columns={{
            base: 1,
            lg: 2
        }} gap={{
            base: 5,
            lg: 10
        }}>
            {
                data === undefined ? <Box>
                    <Skeleton height="25px" mb="5" w="100%" />
                    <Skeleton height="25px" mb="5" w="100%" />
                    <Skeleton height="25px" w="100%" />
                </Box>
                    : <SimpleGrid columns={2} h="100%" gap={4}>
                        <Heading my="auto" size="xs" opacity="0.9" fontWeight="600" textTransform={"capitalize"}>Department name</Heading>
                        <Heading my="auto"
                            wordBreak={"break-all"}
                            size="sm" fontWeight="600" textTransform={"uppercase"}>
                            {data.name}
                        </Heading>
                        <Heading my="auto" size="xs" opacity="0.9" fontWeight="600" textTransform={"capitalize"}>production status</Heading>
                        <Heading my="auto"
                            wordBreak={"break-all"}
                            size="sm" fontWeight="600" textTransform={"uppercase"}>
                            {data.status}
                        </Heading>
                        <Heading my="auto" size="xs" opacity="0.9" fontWeight="600" textTransform={"capitalize"}>supervisor</Heading>
                        <Heading my="auto" size="sm" fontWeight="600" textTransform={"uppercase"}>{data.supervisor}</Heading>
                    </SimpleGrid>
            }
            {
                data === undefined ? <Box>
                    <Skeleton height="15px" mb="4" w="100%" />
                    <Skeleton height="15px" mb="4" w="100%" />
                    <Skeleton height="15px" w="100%" />
                </Box>
                    : <HStack>
                        <VStack alignItems="flex-start" w="50%">
                            <Text fontSize="xs" opacity="0.8" fontWeight="500">Machines ON</Text>
                            <Text fontSize="xs" opacity="0.8" fontWeight="500">Equipments ON</Text>
                        </VStack>
                        <VStack w="40%" spacing={5}>
                            <Progress
                                w="100%"
                                size="sm"
                                borderRightRadius={'md'}
                                colorScheme="green"
                                value={data.machines.total ? data.machines.on / data.machines.total * 100 : 0}
                            />
                            <Progress
                                w="100%"
                                size="sm"
                                borderRightRadius={'md'}
                                colorScheme="orange"
                                value={data.equipments.total ? data.equipments.on / data.equipments.total * 100 : 0}
                            />
                        </VStack>
                        <VStack w="10%">
                            <Text fontSize="xs" fontWeight="bold">{`${data.machines.on}/${data.machines.total}`}</Text>
                            <Text fontSize="xs" fontWeight="bold">{`${data.equipments.on}/${data.equipments.total}`}</Text>
                        </VStack>
                    </HStack>
            }
        </SimpleGrid>
        }
    </MyCard >
}

export default Overview