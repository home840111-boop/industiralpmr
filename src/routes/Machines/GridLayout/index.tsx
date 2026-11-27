import { CardBody, CardFooter, CardHeader, Center, HStack, SimpleGrid, Skeleton, SkeletonCircle, useColorMode, VStack } from "@chakra-ui/react";
import MachineCard from "./MachineCard";
import type { MachineType } from "../types";
import MyCard from "../../../Components/micro/Card";
import NotFound from "../../../Components/micro/NotFound";
import { factoryProductionType } from "../../../Components/Store/atoms";

const GridLayout = ({
  machines,
  notFound = false,
  productionType,
  minifyCharts
}: {
  machines: MachineType[],
  productionType: factoryProductionType | null,
  notFound?: boolean,
  minifyCharts: boolean
}) => {
  const isLoading = machines.length === 0;

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
          : machines.map(machine => <MachineCard productionType={productionType} minifyCharts={minifyCharts} key={machine.id} machine={machine} />)
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
      <Center flexDir={"column"} mt={3}>
        <SkeletonCircle size={"250px"} />
        <Skeleton h="10px" w="50%" mt={3} />
      </Center>
      <HStack
        w="100%"
        px={3}
        borderTop="1px solid"
        borderTopColor={border}>
        <VStack alignItems={"flex-start"} py={3} w="100%">
          <Skeleton h="10px" w="100%" mt={3} />
          <Skeleton h="10px" w="100%" mt={3} />
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
          <Skeleton h="10px" w="100%" mt={3} />
          <Skeleton h="10px" w="100%" mt={3} />
        </VStack>
      </HStack>
    </CardBody>
    <CardFooter
      borderTop={`1px solid`}
      borderTopColor={border}
      display="flex"
      justifyContent="space-between"
      alignItems="center"
      p={2}
      px={4}>
      <Skeleton h="10px" w="30%" />
      <Skeleton h="10px" w="30%" />
    </CardFooter>
  </MyCard>
}
export default GridLayout