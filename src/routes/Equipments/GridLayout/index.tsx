import { CardBody, CardFooter, CardHeader, Center, HStack, SimpleGrid, Skeleton, useColorMode, VStack } from "@chakra-ui/react";
import { Equipment } from ".."
import MyCard from "../../../Components/micro/Card";
import NotFound from "../../../Components/micro/NotFound";
import EquipmentCard from "./EquipmentCard";

const GridLayout = ({
    equipments,
    notFound
}: {
    equipments: Equipment[],
    notFound: boolean
}) => {
    const isLoading = equipments.length === 0;

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
                    : equipments.map(equipment => <EquipmentCard key={equipment.id} equipment={equipment} />)
        }
    </SimpleGrid>
}

const LoadingCard = () => {
    const { colorMode } = useColorMode();
    const { border } = {
        border: `${colorMode}.border`
    }

    return <MyCard p={0}>
        <CardHeader
            h="70px"
            borderTopRadius={"md"}
            borderBottom={`1px solid`}
            borderBottomColor={border}
            display={"flex"}
            flexDir={"column"}
            justifyContent={"center"}
            py={3}>
            <VStack gap={1} w="100%">
                <Skeleton h="20px" w="50%" />
                <Skeleton h="10px" w="30%" />
            </VStack>
        </CardHeader>
        <CardBody
            p={0}
            as={VStack}>
            <Center flexDir={"column"} mt={3} px={5} w="100%">
                <Skeleton h="100px" w="100%" />
            </Center>
            <HStack
                w="100%"
                px={3}
                borderTop="1px solid"
                borderTopColor={border}>
                <VStack alignItems={"flex-start"} py={3} w="100%">
                    <Skeleton h="10px" w="100%" mt={3} />
                </VStack>
                <VStack
                    borderLeft={`1px solid`}
                    borderLeftColor={border}
                    pl={3}
                    alignItems={"flex-start"}
                    w="100%"
                    py={3}>
                    <Skeleton h="10px" w="100%" mt={3} />
                </VStack>
            </HStack>
        </CardBody>
        <CardFooter
            borderTop={`1px solid`}
            borderTopColor={border}
            display="flex"
            justifyContent="flex-end"
            alignItems="center"
            p={2}
            px={4}>
            <Skeleton h="10px" w="30%" />
        </CardFooter>
    </MyCard>
}

export default GridLayout