import { Box, FormControl, GridItem, HStack, SimpleGrid, Skeleton, VStack } from "@chakra-ui/react";


const LoadingCard = () => {

    return <VStack gap={7} w="100%">
        <Box w="100%" pt={1}>
            <Skeleton w="100%" h="30px" />
        </Box>
        <SimpleGrid
            w="100%"
            gap={7}
            columns={{
                base: 1,
                lg: 8
            }}>
            <GridItem colSpan={{
                base: 1,
                lg: 2
            }}>
                <FormControl size={"sm"}>
                    <Skeleton w="100%" h="20px" />
                </FormControl>
            </GridItem>
            <GridItem colSpan={{
                base: 1,
                lg: 3
            }}>
                <FormControl size={"sm"}>
                    <Skeleton w="100%" h="20px" />
                </FormControl>
            </GridItem>
            <GridItem colSpan={{
                base: 1,
                lg: 3
            }}>
                <FormControl size={"sm"}>
                    <Skeleton w="100%" h="20px" />
                </FormControl>
            </GridItem>
            <GridItem colSpan={{
                base: 1,
                lg: 8
            }}>
                <FormControl size={"sm"}>
                    <Skeleton w="100%" h="20px" />
                </FormControl>
            </GridItem>
            <GridItem colSpan={{
                base: 1,
                lg: 5
            }}>
                <FormControl size={"sm"}>
                    <Skeleton w="100%" h="20px" />
                </FormControl>
            </GridItem>
            <GridItem colSpan={{
                base: 1,
                lg: 3
            }}>
                <FormControl size={"sm"}>
                    <Skeleton w="100%" h="20px" />
                </FormControl>
            </GridItem>
            <GridItem colSpan={{
                base: 1,
                lg: 5
            }}>
                <FormControl size={"sm"}>
                    <Skeleton w="100%" h="20px" />
                </FormControl>
            </GridItem>
            <GridItem colSpan={{
                base: 1,
                lg: 3
            }}>
                <FormControl size={"sm"}>
                    <Skeleton w="100%" h="20px" />
                </FormControl>
            </GridItem>
        </SimpleGrid>
        <HStack w="100%" justifyContent={"space-between"}>
            <Skeleton w="80px" h="30px" />
            <Skeleton w="80px" h="30px" />
        </HStack>
    </VStack>
}

export default LoadingCard;