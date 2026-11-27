import { HStack, Skeleton, Table, Tbody, Td, Th, Thead, Tr, useColorMode, VStack } from "@chakra-ui/react";
import { useMemo } from "react";
import { Environment } from "..";
import MyCard from "../../../Components/micro/Card";
import NotFound from "../../../Components/micro/NotFound";
import EnvironmentRow from "./EnvironmentRow";

const ListLayout = ({
    environments,
    notFound
}: {
    environments: Environment[],
    notFound: boolean
}) => {
    const isLoading = environments.length === 0;
    const { colorMode } = useColorMode();
    const { headBG, headColor } = useMemo(() => {
        return {
            headBG: `${colorMode}.tableHeaderBG`,
            headColor: `${colorMode}.tableHeaderColor`
        }
    }, [colorMode]);

    const headings: string[] = [
        "Environment",
        "Current Stats",
        "Today Temp Stats",
        "Today Humid Stats",
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
                                : environments.map(environment => <EnvironmentRow key={environment.id} environment={environment} />)
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
                <Skeleton h="40px" w="40px" />
            </VStack>
        </Td>
    </Tr>
};

export default ListLayout