import { Badge, Box, CardBody, CardHeader, Center, CircularProgress, CircularProgressLabel, Flex, HStack, IconButton, SimpleGrid, Text, useColorMode } from "@chakra-ui/react";
import { useMemo, useState } from "react";
import { FaChevronRight } from "react-icons/fa";
import { Link } from "react-router-dom";
import { DataToSet } from ".";
import { SmallFill } from "../../Components/Loaders";
import MyCard from "../../Components/micro/Card";
import ShowSelector, { views } from "../../Components/micro/ShowSelector";
import { viewAll } from "../Reports/Viewer/FactoryReport/Machine/MachineBreakdown/PieChart";

const TopPerformers = ({
    data
}: {
    data?: DataToSet["topPerformers"]
}) => {
    const [view, setView] = useState<views>("shots");

    return <MyCard noPadding>
        <CardHeader
            alignItems="center"
            justifyContent="space-between"
            as={Flex}
            p={2}>
            <Text
                fontSize="md"
                fontWeight={500}>Top Performers</Text>
            <ShowSelector view={view} setView={setView} />
        </CardHeader>
        <CardBody p={0} minH={150}>
            {data === undefined ? <Center h="100%">
                <SmallFill />
            </Center> : <SimpleGrid h={"100%"} columns={{
                base: 1,
                sm: 3
            }}>{data[view].map((item, i) => <Section key={i} data={item} view={view} />)}
            </SimpleGrid>}
        </CardBody>
    </MyCard>
}

const Section = ({
    data,
    view
}: {
    data: DataToSet["topPerformers"][keyof DataToSet["topPerformers"]][0],
    view: views
}) => {
    const { colorMode } = useColorMode();
    const { border } = useMemo(() => ({
        border: `${colorMode}.border`
    }), [colorMode]);
    return <Flex flexDir="column" alignItems={"center"} h="100%" gap={7} p={5} border={"1px dashed"} borderColor={border}>
        <Flex justifyContent={"space-between"} w="100%" alignItems={"center"}>
            <HStack gap={3}>
                <CircularProgress
                    trackColor={"#cccccc40"}
                    rounded={"full"}
                    capIsRound
                    value={data.share}
                    size="50px"
                    color={
                        data.share >= 75 ? "green" :
                            data.share >= 50 ? "orange" :
                                "red"
                    }>
                    <CircularProgressLabel fontWeight={600}>{data.share.toFixed(0)}%</CircularProgressLabel>
                </CircularProgress>
                <Box>
                    <Text fontWeight={600}>{data.name}</Text>
                    <Text fontWeight={500} fontSize="xs" opacity={0.8}>{data.department}</Text>
                </Box>
            </HStack>
            <IconButton as={Link} to={data.link} size="sm" aria-label="goto page" icon={<FaChevronRight />} />
        </Flex>
        <SimpleGrid columns={2} w="100%" gap={5}>
            <Text fontWeight={500} fontSize="xs" opacity={0.8}>Performace</Text>
            <Text fontWeight={600} fontSize="sm" textAlign={"right"}>{viewAll(data.value, view)}</Text>
            <Text fontWeight={500} fontSize="xs" opacity={0.8}>Share</Text>
            <Flex justifyContent={"flex-end"}>
                <Badge textAlign="center" borderRadius="3px" w="40px" size="xs" colorScheme={
                    data.share >= 75 ? "green" :
                        data.share >= 50 ? "orange" :
                            "red"
                }>{data.share.toFixed(0)}%</Badge>
            </Flex>
        </SimpleGrid>
    </Flex>
}

export default TopPerformers