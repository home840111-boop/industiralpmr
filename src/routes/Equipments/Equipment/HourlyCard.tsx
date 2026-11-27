import { Box, CardBody, CardHeader, Flex, Text, useColorMode } from "@chakra-ui/react"
import { Suspense, useMemo, useState } from "react";
import { Hour, Report, Status } from ".";
import secFormatter from "../../../Components/Functions/formatters/secFormatter";
import { SmallFill } from "../../../Components/Loaders";
import MyCard from "../../../Components/micro/Card";
import NotFound from "../../../Components/micro/NotFound";
import NumberFormatter from "../../../Components/micro/NumberFormatter";
import UnitFormatter from "../../../Components/micro/UnitFormatter";
import Chart from "./Chart";
import Selector from "./Selector";


type views = "ontime" | "electricity";
const HourlyCard = ({
    notFound,
    hours,
    hourlyStats,
    status = "NA",
}: {
    notFound: boolean;
    hours: Hour[] | null;
    hourlyStats: Report["hourlyStats"] | null;
    status?: Status;
}) => {
    const isLoading = !hourlyStats || hours === null || hours?.length === 0;
    const { colorMode } = useColorMode();
    const { border } = useMemo(() => {
        return {
            border: `${colorMode}.border`,
        }
    }, [colorMode]);
    const [view, setView] = useState<views>("electricity");

    return <MyCard
        w="100%"
        h="100%"
        noPadding>
        <CardHeader
            display={"flex"}
            justifyContent={"space-between"}
            alignItems={"center"}
            py={4}
            borderBottom="1px solid"
            borderColor={border}>
            <Text
                fontSize="md"
                fontWeight={500}>Hourly Graph</Text>
            <Selector view={view} setView={setView} />
        </CardHeader>
        <CardBody h="100%" p={0}>
            {
                notFound ? <Suspense fallback={<SmallFill />}>
                    <NotFound />
                </Suspense> : isLoading ? <SmallFill /> : <Flex
                    flexDir={"column"}>
                    <Flex
                        borderBottom="1px dashed"
                        borderColor={border}
                        flexDir={"row"}
                        justifyContent="space-evenly"
                        alignItems="center"
                        mb={5}>
                        <Box
                            w='100%'
                            h='100%'
                            py={5}
                            textAlign={"center"}>
                            <Text
                                fontSize="md"
                                fontWeight={600}>
                                {hourlyStats?.best[view]}
                            </Text>
                            <Text
                                textTransform={"capitalize"}
                                letterSpacing={1}
                                opacity={0.7}
                                fontSize="xs">
                                Highest Performance Hour
                            </Text>
                        </Box>
                        <Box
                            borderRight="1px dashed"
                            borderLeft="1px dashed"
                            w='100%'
                            h='100%'
                            py={5}
                            borderColor={border}
                            textAlign={"center"}>
                            <Text
                                fontSize="md"
                                fontWeight={600}>
                                {hourlyStats?.worst[view]}
                            </Text>
                            <Text
                                letterSpacing={1}
                                opacity={0.7}
                                fontSize="xs">
                                Lowest Performance Hour
                            </Text>
                        </Box>
                        <Box
                            w='100%'
                            h='100%'
                            py={5}
                            textAlign={"center"}>
                            <Text
                                fontSize="xl"
                                fontWeight={600}>
                                <FormatAll number={hourlyStats?.average[view] || 0} view={view} />
                            </Text>
                            <Text
                                letterSpacing={1}
                                opacity={0.7}
                                fontSize="xs">Hourly Avg.</Text>
                        </Box>
                    </Flex>
                    <Box p={5}>
                        <Chart hours={hours || []} view={view} status={status} />
                    </Box>
                </Flex>}
        </CardBody>
    </MyCard>
}

const FormatAll = ({
    number,
    view
}: {
    number: number;
    view: views;
}) => {
    return view === "ontime" ? <>{secFormatter(number)}</>
        : view === "electricity" ? <UnitFormatter
            number={number} />
            : <NumberFormatter
                number={number} />
}

export default HourlyCard;