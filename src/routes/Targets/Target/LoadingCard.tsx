import { Box, CardBody, CardHeader, GridItem, HStack, SimpleGrid, Skeleton, VStack, Center, useColorMode, SkeletonCircle, CardFooter } from "@chakra-ui/react";
import { useMemo } from "react";
import { SmallFill } from "../../../Components/Loaders";
import MyCard from "../../../Components/micro/Card";
import IsScreenSmall from "../../../Components/Store/hooks/IsScreenSmall";

const LoadingCard = () => {
    const { colorMode } = useColorMode();
    const { border } = useMemo(() => ({
        border: `${colorMode}.border`,
    }), [colorMode]);
    const isSmall = IsScreenSmall(1200);

    return <MyCard p={0}>
        <CardHeader py={3} px={3} display={"flex"} alignItems="center" justifyContent={"space-between"} borderBottom={`1px solid`} borderColor={border}>
            <Box lineHeight={1.5}>
                <Skeleton height={10} width={100} />
                <Skeleton height={5} mt={3} width={100} />
            </Box>
            <HStack>
                <Skeleton height={5} width={100} />
            </HStack>
        </CardHeader>
        <CardBody py={10} px={4}>
            <SimpleGrid columns={isSmall ? 1 : 7} gap={3}>
                {
                    isSmall ? <>
                        <GridItem colSpan={isSmall ? 1 : 3} as={Center} py={10}>
                            <SkeletonCircle size={"360px"} />
                        </GridItem>
                        <GridItem colSpan={isSmall ? 1 : 2} as={Center}>
                            <Left />
                        </GridItem>
                        <GridItem colSpan={isSmall ? 1 : 2} as={Center}>
                            <Right />
                        </GridItem>
                    </> : <>
                        <GridItem colSpan={isSmall ? 1 : 2} as={Center}>
                            <Left />
                        </GridItem>
                        <GridItem colSpan={isSmall ? 1 : 3} as={Center} py={10}>
                            <SkeletonCircle size={"360px"} />
                        </GridItem>
                        <GridItem colSpan={isSmall ? 1 : 2} as={Center}>
                            <Right />
                        </GridItem>
                    </>
                }
            </SimpleGrid>
        </CardBody>
        <CardFooter
            borderTop={`1px solid`}
            borderTopColor={border}
            display="flex"
            justifyContent="space-between"
            alignItems="center"
            p={2}
            px={4}>
            <Skeleton height={5} width={100} />
            <Skeleton height={5} width={100} />
        </CardFooter>
    </MyCard>
};

const Left = () => {
    return <>
        <VStack justifyContent={"space-between"} alignItems="flex-start" h="90%" pb={10} w="100%">
            <Skeleton height={10} mt={3} width={120} />
            <VStack gap={3} minH="250px" justifyContent={"flex-end"} alignItems="center" w="100%">
                <Center height={100}>
                    <SmallFill />
                </Center>
                <Skeleton height={5} mt={3} width={200} />
            </VStack>
        </VStack>
    </>
}

const Right = () => {
    return <>
        <Box flexDir="column" display="flex" alignItems="flex-end">
            <Skeleton height={10} width={120} />
            <Center>
                <SkeletonCircle size={"300px"} />
            </Center>
        </Box>
    </>
}

export default LoadingCard;