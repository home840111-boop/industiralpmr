import {
    Box,
    CardBody,
    CardHeader,
    Flex,
    GridItem,
    Heading,
    HStack,
    SimpleGrid,
    Text,
    useColorMode,
    VStack,
    Icon,
    Skeleton,
    SkeletonText,
    Center,
    CardFooter,
} from '@chakra-ui/react';
import MyTooltip from '../../../Components/micro/MyTooltip';
import { useEffect, useMemo, useState } from 'react';
import { HiLightningBolt } from 'react-icons/hi';
import MyCard from '../../../Components/micro/Card';
import UnitFormatter from '../../../Components/micro/UnitFormatter';
import UnitDisplay from '../../../Components/micro/UnitDisplay';
import unitFormatter from "../../../Components/Functions/formatters/unitFormatter";
import HourlyChart from './Chart';
import Table from "../../../Components/micro/Table";
import { SmallFill } from '../../../Components/Loaders';
import { dateAtom } from '../../../Components/Store/atoms';
import fetch from './fetch';
import { BiTimeFive } from 'react-icons/bi';
import dayjs from "../../../Components/Functions/dayjs";
import Listen from '../../../Components/Store/hooks/Listen';
import NumberFormatter from '../../../Components/micro/NumberFormatter';
import { BsArrowDownShort, BsArrowUpShort } from 'react-icons/bs';


interface Breakdown {
    names: string[];
    values: number[];
}
interface EachDay {
    total: number;
    average: number;
    max: {
        name: string;
        value: number;
    };
    min: {
        name: string;
        value: number;
    };
    breakdown: Breakdown;
}
interface DailyElectricityData {
    today: EachDay;
    yesterday: EachDay;
    unit: string;
    lastUpdated: number;
    realtimeKW: {
        current: number;
        change: number;
    }
};

const DailyData = ({
    hasMeter
}: {
    hasMeter: boolean | null;
}) => {
    const [refresh, setRefresh] = useState<boolean>(false);
    const { colorMode } = useColorMode();
    const { border, text } = useMemo(() => ({
        border: `${colorMode}.border`,
        text: `${colorMode}.text`
    }), [colorMode]);
    const [data, setData] = useState<DailyElectricityData | null>(null);
    const date = Listen(dateAtom);

    useEffect(() => {
        const interval = setInterval(() => {
            setRefresh(prev => !prev);
        }, 30000);

        if (hasMeter === false) clearInterval(interval);

        return () => hasMeter ? clearInterval(interval) : undefined;
    }, [hasMeter]);

    useEffect(() => {
        if (!date || hasMeter === null) return;
        fetch(date, data, hasMeter).then(data => {
            setData(data);
        }).catch((err: any) => {
            console.log(err);
        })
        // eslint-disable-next-line
    }, [refresh, date, hasMeter]);

    if (data === null) return <LoadingCard />;

    return <MyCard
        p={0}>
        <CardHeader
            borderBottom="1px solid"
            borderColor={border}
            as={Flex}
            justifyContent="space-between"
            alignItems={"center"}
            p={4}>
            <Heading
                fontWeight={500}
                size="sm">Today's Statistics</Heading>
        </CardHeader>
        <CardBody p={0}>
            <SimpleGrid
                columns={{
                    base: 1,
                    md: 5
                }}>
                <GridItem
                    borderRight={{
                        base: "none",
                        md: "1px solid"
                    }}
                    borderColor={{
                        base: "none",
                        md: border
                    }}
                    colSpan={{
                        base: 1,
                        md: 3
                    }}>
                    <Flex
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
                                    <MyTooltip label={<UnitFormatter number={data.today.min.value} />}>
                                        {data.today.min.name}
                                    </MyTooltip>
                                </Text>
                                <Text
                                    textTransform={"capitalize"}
                                    letterSpacing={1}
                                    opacity={0.7}
                                    fontSize="xs">
                                    Lowest Performance
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
                                    <MyTooltip label={<UnitFormatter number={data.today.max.value} />}>
                                        {data.today.max.name}
                                    </MyTooltip>
                                </Text>
                                <Text
                                    letterSpacing={1}
                                    opacity={0.7}
                                    fontSize="xs">
                                    Highest Performance
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
                                    <UnitFormatter number={data.today.average} />
                                </Text>
                                <Text
                                    letterSpacing={1}
                                    opacity={0.7}
                                    fontSize="xs">Hourly Avg.</Text>
                            </Box>
                        </Flex>
                        <Box p={2}>
                            <HourlyChart
                                today={data.today.breakdown}
                                yesterday={data.yesterday.breakdown} />
                        </Box>
                    </Flex>
                </GridItem>
                <GridItem colSpan={2}>
                    <VStack
                        justifyContent={"space-between"}
                        gap={5}
                        mt={5}
                        alignItems={"flex-start"}>
                        <VStack justifyContent={"space-between"} mx={3} w="100%">
                            <HStack w="100%" justifyContent={"flex-start"} gap={1}>
                                <Box>
                                    <Text fontSize="lg" fontWeight={500} textDecor="underline">Total Consumption</Text>
                                </Box>
                            </HStack>
                            <Box w="100%">
                                <HStack justifyContent={"flex-start"} gap={1}>
                                    <Icon as={HiLightningBolt} fontSize="2xl" />
                                    <Text fontWeight={700} fontSize={"3xl"}>
                                        <UnitFormatter
                                            number={data.today.total} />
                                    </Text>
                                </HStack>
                                <MyTooltip label={data.realtimeKW.change === 0 ? "unchanged load" : `load ${data.realtimeKW.change < 0 ? "decreased" : "incresed"} by ${Math.abs(data.realtimeKW.change)}%`}>
                                    <Text
                                        w="fit-content"
                                        fontSize="md"
                                        fontWeight={500}
                                        color={data.realtimeKW.change === 0 ? text : data.realtimeKW.change > 0 ? "red" : "green"}>
                                        {data.realtimeKW.change === 0 ? null : <Icon as={data.realtimeKW.change > 0 ? BsArrowUpShort : BsArrowDownShort} />}
                                        <NumberFormatter number={data.realtimeKW.current} suffix={"KW"} />
                                    </Text>
                                </MyTooltip>
                            </Box>
                            <Box w="100%">
                                <Text opacity={0.9} fontSize="sm">
                                    Track and analyze factories' energy usage with interactive graphs. Monitor daily, monthly, and yearly trends to optimize efficiency and reduce costs.
                                </Text>
                            </Box>
                        </VStack>
                        <Table
                            alignLastToLeft={false}
                            height="100%"
                            headings={["", "Today", "Yesterday"]}
                            rows={[
                                [{
                                    element: Text,
                                    children: "Total",
                                    props: {
                                        fontWeight: 600
                                    }
                                }, unitFormatter(data.today.total), unitFormatter(data.yesterday.total)],
                                [{
                                    element: Text,
                                    children: "Hr Avg.",
                                    props: {
                                        fontWeight: 600
                                    }
                                }, unitFormatter(data.today.average), unitFormatter(data.yesterday.average)],
                                [{
                                    element: Text,
                                    children: "Best",
                                    props: {
                                        fontWeight: 600
                                    }
                                }, {
                                    element: Text,
                                    props: {
                                        fontWeight: 500,
                                        whiteSpace: "nowrap",
                                        m: -1
                                    },
                                    children: {
                                        element: MyTooltip,
                                        children: data.today.max.name,
                                        props: {
                                            label: <UnitFormatter number={data.today.max.value} />,
                                        }
                                    }
                                }, {
                                    element: Text,
                                    props: {
                                        fontWeight: 500,
                                        whiteSpace: "nowrap",
                                        m: -1
                                    },
                                    children: {
                                        element: MyTooltip,
                                        children: data.yesterday.max.name,
                                        props: {
                                            label: <UnitFormatter number={data.yesterday.max.value} />,
                                        }
                                    }
                                }],
                                [{
                                    element: Text,
                                    children: "Worst",
                                    props: {
                                        fontWeight: 600
                                    }
                                }, {
                                    element: Text,
                                    props: {
                                        fontWeight: 500,
                                        whiteSpace: "nowrap",
                                        m: -1
                                    },
                                    children: {
                                        element: MyTooltip,
                                        children: data.today.min.name,
                                        props: {
                                            label: <UnitFormatter number={data.today.min.value} />,
                                        }
                                    }
                                }, {
                                    element: Text,
                                    props: {
                                        fontWeight: 500,
                                        whiteSpace: "nowrap",
                                        m: -1
                                    },
                                    children: {
                                        element: MyTooltip,
                                        children: data.yesterday.min.name,
                                        props: {
                                            label: <UnitFormatter number={data.yesterday.min.value} />,
                                        }
                                    }
                                }]
                            ]}
                        />
                    </VStack>
                </GridItem>
            </SimpleGrid>
        </CardBody>
        <CardFooter
            borderTop={"1px solid"}
            borderColor={border}
            display={"flex"}
            flexDir={"row"}
            justifyContent={"space-between"}
            p={2}
            px={4}>
            <UnitDisplay
                unit={data.unit}
                opacity={0.9}
                fontSize="xs"
            />
            <Text
                display={"flex"}
                alignItems={"center"}
                textAlign={"center"}
                fontSize={"xs"}
                color={text}
                fontWeight={600}>
                <Icon
                    fontSize={"md"}
                    color={text}
                    mr={1}
                    as={BiTimeFive} />
                <MyTooltip label={dayjs.unix(data.lastUpdated).format("DD-MM-YYYY HH:mm:ss")}>
                    {dayjs.unix(data.lastUpdated).fromNow()}
                </MyTooltip>
            </Text>
        </CardFooter>
    </MyCard>
}

const LoadingCard = () => {
    const { colorMode } = useColorMode();
    const { border } = useMemo(() => ({
        border: `${colorMode}.border`
    }), [colorMode]);

    return <MyCard
        p={0}>
        <CardHeader
            borderBottom="1px solid"
            borderColor={border}
            as={Flex}
            justifyContent="space-between"
            alignItems={"center"}
            p={4}>
            <Skeleton w='150px' h="20px" />
        </CardHeader>
        <CardBody p={0}>
            <SimpleGrid
                columns={{
                    base: 1,
                    md: 5
                }}>
                <GridItem
                    borderRight={{
                        base: "none",
                        md: "1px solid"
                    }}
                    borderColor={{
                        base: "none",
                        md: border
                    }}
                    colSpan={{
                        base: 1,
                        md: 3
                    }}>
                    <Flex
                        flexDir={"column"}>
                        <Flex
                            h="100%"
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
                                <Skeleton display="block" m="auto" w='50%' h="20px" />
                                <Text
                                    textTransform={"capitalize"}
                                    letterSpacing={1}
                                    opacity={0.7}
                                    fontSize="xs">
                                    Lowest Performance
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
                                <Skeleton display="block" m="auto" w='50%' h="20px" />
                                <Text
                                    letterSpacing={1}
                                    opacity={0.7}
                                    fontSize="xs">
                                    Highest Performance
                                </Text>
                            </Box>
                            <Box
                                w='100%'
                                h='100%'
                                py={5}
                                textAlign={"center"}>
                                <Skeleton display="block" m="auto" w='50%' h="20px" />
                                <Text
                                    letterSpacing={1}
                                    opacity={0.7}
                                    fontSize="xs">Hourly Avg.</Text>
                            </Box>
                        </Flex>
                        <Center h={350} p={2}>
                            <SmallFill />
                        </Center>
                    </Flex>
                </GridItem>
                <GridItem colSpan={2}>
                    <VStack
                        justifyContent={"space-between"}
                        gap={3}
                        mt={5}
                        alignItems={"flex-start"}>
                        <VStack justifyContent={"space-between"} mx={3} w="100%">
                            <HStack w="100%" justifyContent={"flex-start"} gap={1}>
                                <Box>
                                    <Skeleton w='100px' h="20px" />
                                </Box>
                            </HStack>
                            <VStack alignItems={"flex-start"} w="100%" gap={2}>
                                <HStack justifyContent={"flex-start"} gap={1} w="100%">
                                    <Skeleton w='200px' h="15px" />
                                </HStack>
                                <Skeleton w='100px' h="10px" />
                            </VStack>
                            <Box w="100%">
                                <SkeletonText w="90%" noOfLines={3} />
                            </Box>
                        </VStack>
                        <Table
                            height="100%"
                            headings={["", "Today", "Yesterday"]}
                            rows={[]}
                        />
                    </VStack>
                </GridItem>
            </SimpleGrid>
        </CardBody>
    </MyCard>
}

export type { DailyElectricityData, EachDay, Breakdown }
export default DailyData;