import { Box, Flex, SimpleGrid, Text, Icon, Center, Skeleton, CircularProgress, CircularProgressLabel, SkeletonCircle, useColorMode, CardFooter, CardBody } from "@chakra-ui/react"
import dayjs from "../../../../../Components/Functions/dayjs";
import { useMemo } from "react"
import { BsArrowDownShort, BsArrowUpShort, BsFillDropletFill } from "react-icons/bs"
import { FaWaveSquare } from "react-icons/fa"
import { HiOutlineLocationMarker } from "react-icons/hi"
import { EnvironmentData } from "../.."
import { SmallFill } from "../../../../../Components/Loaders"
import MyCard from "../../../../../Components/micro/Card"
import MyTooltip from "../../../../../Components/micro/MyTooltip"
import UnitDisplay from "../../../../../Components/micro/UnitDisplay"
import HourlyChart from "./HourlyChart"

const Humidity = ({
    data
}: {
    data: EnvironmentData | null
}) => {
    const color: "red" | "green" | "lightblue" = useMemo(() => {
        if (!data) return "lightblue";
        const { humidity } = data.now;
        return humidity > 60 ? "red" : humidity < 45 ? "green" : "lightblue";
    }, [data]);
    const { colorMode } = useColorMode();
    const { border } = {
        border: `${colorMode}.border`,
    }

    if (!data) return <LoadingCard />;

    return <MyCard p={0}>
        <CardBody px={5}>
            <SimpleGrid columns={{
                base: 1,
                md: 2
            }} gap={5}>
                <Flex gap={5} justifyContent={"space-between"} alignItems="center" flexDir="column">
                    <Flex w="100%" flexDir="row" justifyContent={"space-between"}>
                        <Box>
                            <Text fontWeight={500} fontSize="md" alignItems="center" display="flex" gap={1}>
                                <Icon as={HiOutlineLocationMarker} />
                                {data.name}
                            </Text>
                            <MyTooltip label={"last updated: " + dayjs.unix(data.updated).format("DD-MM-YYYY HH:mm:ss")}>
                                <Text fontWeight={500} opacity={0.7} fontSize="xs" alignItems="center" display="flex" gap={1}>
                                    <Box w="7px" h="7px" borderRadius="full" className={data.isOnline ? "blink" : undefined} bgColor={data.isOnline ? data.isUpToDate === true ? "green" : "cadetblue" : "gray"}></Box>
                                    {data.isOnline ? data.isUpToDate === true ? "Connected" : data.isUpToDate : "Disconnected"}
                                </Text>
                            </MyTooltip>
                        </Box>
                        <Text fontWeight={500} fontSize="sm" alignItems="center" display="flex" gap={1} opacity={0.8}>
                            {
                                // print Today, Yesterday, or the date
                                dayjs.unix(data.updated).isSame(dayjs(), "day") ? "Today"
                                    : dayjs.unix(data.updated).isSame(dayjs().subtract(1, "day"), "day") ? "Yesterday"
                                        : dayjs.unix(data.updated).format("DD MMM")
                            }
                            {dayjs.unix(data.updated).format(" hh:mm A")}
                        </Text>
                    </Flex>
                    <Center>
                        <CircularProgress
                            thickness={"8px"}
                            rounded={"full"}
                            size={"250px"}
                            value={data.now?.humidity || 0}
                            color={color}
                            trackColor={"#cccccc40"}
                            capIsRound>
                            <CircularProgressLabel>
                                <Flex flexDir="column" alignItems="center" justifyContent={"center"}>
                                    <Text color={color} display="flex" alignItems={"flex-start"} fontSize="4xl" fontWeight={400}>{data.now?.humidity?.toFixed(2)}<span style={{
                                        fontSize: "1.5rem",
                                    }}>%</span></Text>
                                    <Text fontWeight={500} fontSize="xs" alignItems="center" display="flex" gap={1} opacity={0.8}>
                                        <Icon as={BsFillDropletFill} />
                                        Humidity</Text>
                                </Flex>
                            </CircularProgressLabel>
                        </CircularProgress>
                    </Center>
                    <Flex mt={5} w="100%" justifyContent={"space-between"} alignItems="center">
                        <MyTooltip label="Highest">
                            <Text fontWeight={500} fontSize="md" alignItems="center" display="flex" gap={1}>
                                <Icon as={BsArrowUpShort} />
                                {data.today.humidity.max.toFixed(2)}%
                            </Text>
                        </MyTooltip>
                        <MyTooltip label="Average">
                            <Text fontWeight={500} fontSize="md" alignItems="center" display="flex" gap={1}>
                                <Icon as={FaWaveSquare} />
                                {data.today.humidity.avg.toFixed(2)}%
                            </Text>
                        </MyTooltip>
                        <MyTooltip label="Lowest">
                            <Text fontWeight={500} fontSize="md" alignItems="center" display="flex" gap={1}>
                                <Icon as={BsArrowDownShort} />
                                {data.today.humidity.min.toFixed(2)}%
                            </Text>
                        </MyTooltip>
                    </Flex>
                </Flex>
                <HourlyChart data={data.hourly || []} notFound={data.hourly === null} />
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
            <UnitDisplay
                unit={data?.unit}
                opacity={0.9}
                fontSize="xs"
            />
        </CardFooter>
    </MyCard>
}

const LoadingCard = () => {

    return <MyCard px={5}>
        <SimpleGrid columns={{
            base: 1,
            md: 2
        }} gap={5}>
            <Flex gap={5} justifyContent={"space-between"} alignItems="center" flexDir="column">
                <Flex w="100%" flexDir="row" justifyContent={"space-between"}>
                    <Box w="30%">
                        <Skeleton w="80%" h="30px" />
                        <Skeleton mt={2} w="50%" h="15px" />
                    </Box>
                    <Skeleton w="30%" h="30px" />
                </Flex>
                <Center minW="50%">
                    <SkeletonCircle size={"250px"} />
                </Center>
                <Flex mt={5} w="100%" justifyContent={"space-between"} alignItems="center">
                    <Skeleton w="20%" h="15px" />
                    <Skeleton w="20%" h="15px" />
                    <Skeleton w="20%" h="15px" />
                </Flex>
            </Flex>
            <Center h={300}>
                <SmallFill />
            </Center>
        </SimpleGrid>
    </MyCard>
}

export default Humidity