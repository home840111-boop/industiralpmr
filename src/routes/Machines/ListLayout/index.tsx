import { HStack, Skeleton, SkeletonCircle, Table, Tbody, Td, Th, Thead, Tr, useColorMode, VStack } from "@chakra-ui/react";
import { useMemo } from "react";
import MyCard from "../../../Components/micro/Card";
import NotFound from "../../../Components/micro/NotFound";
import { factoryProductionType } from "../../../Components/Store/atoms";
import { MachineType } from "../types";
import MachineRow from "./MachineRow";

const ListLayout = ({
  machines,
  productionType,
  notFound = false
}: {
  machines: MachineType[],
  productionType: factoryProductionType | null,
  notFound?: boolean
}) => {
  const isLoading = machines.length === 0;
  const { colorMode } = useColorMode();
  const { headBG, headColor } = useMemo(() => {
    return {
      headBG: `${colorMode}.tableHeaderBG`,
      headColor: `${colorMode}.tableHeaderColor`
    }
  }, [colorMode]);

  const headings: string[] = [
    "Machine",
    "Production Stats",
    "Consumption Stats",
    "Timings",
    "Current Operation"
  ];

  return <MyCard mt="10px" p={0}>
    {
      notFound ?
        <MyCard>
          <NotFound />
        </MyCard>
        : <Table variant='simple' overflowX={{
          base: "scroll",
          midLgXl: "hidden"
        }} display={{
          base: "block",
          midLgXl: "table"
        }}>
          <Thead
            color={headColor}
            bgColor={headBG}>
            <Tr>
              {headings.map((heading, i) => <Th
                key={i}
                color={headColor}>{heading}</Th>)}
            </Tr>
          </Thead>
          <Tbody fontSize={14}>
            {
              isLoading ? [...Array(5)].map((_, i) => <LoadingRow key={i} />)
                : machines.map(machine => <MachineRow productionType={productionType} key={machine.id} machine={machine} />)
            }
          </Tbody>
        </Table>
    }
  </MyCard>
}

const LoadingRow = () => {
  const { colorMode } = useColorMode();
  const { border } = useMemo(() => ({
    border: `${colorMode}.border`
  }), [colorMode]);

  return <Tr>
    <Td
      borderRight={"1px solid"}
      borderColor={border}>
      <HStack gap={3}>
        <VStack gap={1} alignItems={"flex-start"}>
          <SkeletonCircle size={"50px"} />
        </VStack>
        <VStack gap={1} w="100%" alignItems={"flex-start"}>
          <Skeleton h="25px" w="100%" />
          <Skeleton h="10px" w="50%" />
        </VStack>
      </HStack>
    </Td>
    <Td>
      <VStack gap={1} w="100%" alignItems={"flex-start"}>
        <Skeleton h="10px" w="50%" />
        <Skeleton h="10px" w="50%" />
      </VStack>
    </Td>
    <Td>
      <VStack gap={1} w="100%" alignItems={"flex-start"}>
        <Skeleton h="10px" w="50%" />
        <Skeleton h="10px" w="50%" />
      </VStack>
    </Td>
    <Td>
      <VStack gap={1} w="100%" alignItems={"flex-start"}>
        <Skeleton h="10px" w="50%" />
        <Skeleton h="10px" w="50%" />
        <Skeleton h="10px" w="50%" />
      </VStack>
    </Td>
    <Td>
      <VStack gap={1} w="100%" alignItems={"flex-start"}>
        <Skeleton h="10px" w="50%" />
        <Skeleton h="10px" w="50%" />
        <Skeleton h="10px" w="50%" />
      </VStack>
    </Td>
  </Tr>
};

export default ListLayout