import { Box, CardBody, CardHeader, Flex, Text, useColorMode } from "@chakra-ui/react"
import { Suspense, useEffect, useMemo, useState } from "react";
import { SmallFill } from "../../../../Components/Loaders";
import MyCard from "../../../../Components/micro/Card"
import NotFound from "../../../../Components/micro/NotFound";
import NumberFormatter from "../../../../Components/micro/NumberFormatter";
import ShowSelector from "../../../../Components/micro/ShowSelector";
import UnitFormatter from "../../../../Components/micro/UnitFormatter";
import WeightFormatter from "../../../../Components/micro/WeightFormatter";
import Chart from "./Chart";
import { HourlyReport } from "../types";
import Get from "../../../../Components/Store/hooks/Get";
import { factoryProductionAtom } from "../../../../Components/Store/atoms";
import LengthFormatter from "../../../../Components/micro/LengthFormatter";

type views = "shots" | "production" | "material" | "electricity" | "production_meters";

const HourlyCard = ({
    notFound,
    hourlyData,
    efficiency = 0,
}: {
    notFound: boolean;
    hourlyData: HourlyReport | null;
    efficiency?: number;
}) => {
    const isLoading = hourlyData === null || hourlyData?.hours.length === 0;
    const { colorMode } = useColorMode();
    const { border } = useMemo(() => {
        return {
            border: `${colorMode}.border`,
        }
    }, [colorMode]);
    const productionType = Get(factoryProductionAtom);
    const [view, _setView] = useState<views>("shots");

    const setView = (view: views) => {
        if (productionType === null) return;
        if (productionType === "meter" && view === "production") view = "production_meters";
        _setView(view);
    }

    useEffect(() => {
        if (productionType === null) return;
        if (productionType === "meter") _setView("production_meters");
    }, [productionType]);

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
            <ShowSelector view={view === "production_meters" ? "production" : view} setView={setView} />
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
                                {hourlyData?.stats.best[view]}
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
                                {hourlyData?.stats.worst[view]}
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
                                <FormatAll number={hourlyData?.stats.avgs[view] || 0} view={view} />
                            </Text>
                            <Text
                                letterSpacing={1}
                                opacity={0.7}
                                fontSize="xs">Hourly Avg.</Text>
                        </Box>
                    </Flex>
                    <Box p={5}>
                        <Chart hours={hourlyData?.hours || []} view={view} efficiency={efficiency} />
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
    return view === "shots" ? <NumberFormatter
        number={+number.toFixed(0)}
        suffix=" shot(s)" />
        : view === "production" ? <NumberFormatter
            number={+number.toFixed(0)}
            suffix=" pc(s)" />
            : view === "material" ? <WeightFormatter
                number={number} />
                : view === "production_meters" ? <LengthFormatter
                    number={number} />
                    : view === "electricity" ? <UnitFormatter
                        number={number} />
                        : <NumberFormatter
                            number={number} />
}

export default HourlyCard