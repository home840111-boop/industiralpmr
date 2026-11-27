import { HStack, Skeleton, SkeletonCircle, Table, Tbody, Td, Th, Thead, Tr, useColorMode, VStack } from "@chakra-ui/react";
import { useMemo } from "react";
import { Equipment } from "..";
import MyCard from "../../../Components/micro/Card";
import NotFound from "../../../Components/micro/NotFound";
import EquipmentRow from "./EquipmentRow";

const ListLayout = ({
    equipments,
    notFound = false
}: {
    equipments: Equipment[],
    notFound?: boolean
}) => {
    const isLoading = equipments.length === 0;
    const { colorMode } = useColorMode();
    const { headBG, headColor } = useMemo(() => {
        return {
            headBG: `${colorMode}.tableHeaderBG`,
            headColor: `${colorMode}.tableHeaderColor`
        }
    }, [colorMode]);

    const headings: string[] = [
        "Equipment",
        "Current Operation",
        "Consumption Stats",
        ""
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
                                : equipments.map(equipment => <EquipmentRow key={equipment.id} equipment={equipment} />)
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
            </VStack>
        </Td>
        <Td>
            <VStack gap={1} w="100%" alignItems={"flex-start"}>
                <Skeleton h="40px" w="40px" />
            </VStack>
        </Td>
    </Tr>
};

export default ListLayout