import { CardBody, CardFooter, CardHeader, SimpleGrid, Skeleton, SkeletonCircle, useColorMode, VStack } from "@chakra-ui/react";
import { Environment } from ".."
import MyCard from "../../../Components/micro/Card";
import NotFound from "../../../Components/micro/NotFound";
import EnvironmentCard from "./EnvironmentCard";

const GridLayout = ({
    environments,
    notFound
}: {
    environments: Environment[],
    notFound: boolean
}) => {
    const isLoading = environments.length === 0;

    return <SimpleGrid
        spacing={5}
        minChildWidth={{
            base: '100%',
            sm: 300
        }}
        mt="10px">
        {
            notFound ?
                <MyCard>
                    <NotFound />
                </MyCard>
                : isLoading ?
                    [...Array(10)].map((_, i) => <LoadingCard key={i} />)
                    : environments.map(environment => <EnvironmentCard key={environment.id} environment={environment} />)
        }
    </SimpleGrid>
}

const LoadingCard = () => {
    const { colorMode } = useColorMode();
    const { border } = {
        border: `${colorMode}.border`,
    }

    return <MyCard
        _hover={{
            transform: "translateY(-3px)",
            boxShadow: "xl"
        }}
        transition={"all 0.2s ease-in-out"}
        p={0}>
        <CardHeader
            h="70px"
            borderTopRadius={"md"}
            borderBottom={`1px solid`}
            borderBottomColor={border}
            display={"flex"}
            flexDir={"column"}
            justifyContent={"center"}
            alignItems={"center"}
            py={3}>
            <Skeleton h="20px" w="50%" />
        </CardHeader>
        <CardBody
            p={0}
            as={VStack}>
            <SkeletonCircle size={"200px"} />
            <Skeleton h="30px" w="70%" />
            <SimpleGrid
                columns={2}
                w="100%"
                p={3}
                borderTop="1px solid"
                borderTopColor={border}>
                <VStack alignItems={"center"}>
                    <Skeleton h="15px" w="70%" />
                    <Skeleton h="15px" w="70%" />
                    <Skeleton h="15px" w="70%" />
                </VStack>
                <VStack
                    borderLeft={`1px solid`}
                    borderLeftColor={border}
                    pl={3}
                    alignItems={"center"}>
                    <Skeleton h="15px" w="70%" />
                    <Skeleton h="15px" w="70%" />
                    <Skeleton h="15px" w="70%" />
                </VStack>
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
            <Skeleton h="15px" w="40%" />
            <Skeleton h="15px" w="40%" />
        </CardFooter>
    </MyCard>
}

export default GridLayout