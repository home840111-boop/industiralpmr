import {
    CardFooter,
    CardHeader,
    Text,
    useColorMode,
    Icon,
    Box,
    HStack,
    CardBody,
    Tabs,
    TabList,
    Tab,
    TabPanels,
    TabPanel,
    Tag,
    Badge,
    Button,
    Link as ChakraLink,
    Alert,
    AlertIcon,
    AlertTitle,
    AlertDescription,
} from "@chakra-ui/react";
import { useEffect, useMemo, useState } from "react";
import { BiTimeFive, BiUser } from "react-icons/bi";
import { useParams, Link } from "react-router-dom";
import {
    FiArrowLeft,
    FiEdit3,
    FiPlus,
    FiActivity,
    FiClock,
    FiAlertTriangle,
    FiBarChart2,
    FiLayers,
    FiCpu,
    FiRefreshCw,
} from "react-icons/fi";
import MyCard from "../../../Components/micro/Card";
import MyTooltip from "../../../Components/micro/MyTooltip";
import dayjs from "../../../Components/Functions/dayjs";
import Get from "../../../Components/Store/hooks/Get";
import { dateAtom } from "../../../Components/Store/atoms";
import fetch from "./fetch";
import { MachineStatusType } from "../../Machines/types";
import secFormatter from "../../../Components/Functions/formatters/secFormatter";
import MinifiedNumberFormatter from "../../../Components/micro/MinifiedNumberFormatter";
import LoadingCard from "./LoadingCard";
import CurrentStats from "./CurrentStats";
import Ontime from "./Ontime";
import Downtime from "./Downtime";
import { downtimeCategoriesType } from "./Downtime/categories";
import AddUpdateTarget from "./AddUpdateTarget";
import { TbTimelineEventPlus } from "react-icons/tb";
import Categorize from "./Downtime/Categorize";
import HourlyStats from "./HourlyStats";
import { Helmet } from "react-helmet";
import ProductionQueue from "./ProductionQueue";
import { SapTargetOrder, useIsSapEnabled } from "../../../Services/sap";

interface DataToSet {
    name: string;
    target: {
        defaultMonitorDowntime: boolean;
        machineMonitorDowntime: boolean;
        name: string,
        due?: string,
        target: number,
        hourlyTarget: number,
        started: number;
        notifications: ("milestone" | "due-missed")[],
        notificationCategories: string[],
        sapOrder?: SapTargetOrder | null;
    },
    mold: {
        name: string;
        since: number;
        cycleTime: number;
        cavities: number;
    };
    status: {
        status: MachineStatusType;
        since: number;
    };
    progress: {
        total: number;
        current: number;
        track: number;
        shouldbe: number;
    };
    hours: {
        production: number;
        downtime: number;
        ontime: number;
        time: string;
        date: string;
        unix?: number;
        rawDate?: string;
        isOffShift?: boolean;
        downtimeReason?: string;
        downtimeCategory?: string;
        isPlanned?: boolean;
        plannedDowntime?: number;
    }[];
    OEE: number;
    timing: {
        ontime: number;
        downtime: {
            total: number;
            scheduled?: number;
            logs: {
                start: number;
                end: number;
                reason?: {
                    category: downtimeCategoriesType;
                    note: string;
                    scheduled: boolean;
                };
                id: string;
                status?: "IDLE" | "OFF";
            }[] | "NOT_FOUND"
        }
        projectedEndTime: number; //unix
    };
    lastCompletedTarget: {
        id: string;
        name: string;
        started: number;
        completed: number;
        efficiency: number;
        hours: {
            production: number;
            efficiency: number;
            time: string;
            date: string;
        }[];
        target: number;
    } | null;
    operator: {
        name: string;
        shift: string;
    };
    productionQueues: {
        totalOccupancy: number;
        targets: {
            id: string;
            started: boolean;
            name: string;
            target: number;
            mold: string;
            duration: number;
            cycleTime: number;
        }[]
    },
    notificationCategories: string[],
    updated: number;
};
const Target = () => {
    const { machineID } = useParams();
    const isSapEnabled = useIsSapEnabled();
    const { colorMode } = useColorMode();
    const { text, subText, border } = useMemo(() => ({
        text: `${colorMode}.text`,
        subText: `${colorMode}.subText`,
        border: `${colorMode}.border`,
    }), [colorMode]);
    const [tabIndex, setTabIndex] = useState<number>(0);
    const [refresh, setRefresh] = useState<boolean>(false);
    const [data, setData] = useState<DataToSet | "NOT_FOUND" | null>(null);
    const date = Get(dateAtom);
    const refetch = () => setRefresh(prev => !prev);
    const [isManualRefreshing, setIsManualRefreshing] = useState<boolean>(false);
    const handleManualRefresh = () => {
        setIsManualRefreshing(true);
        refetch();
        setTimeout(() => setIsManualRefreshing(false), 700);
    };

    useEffect(() => {
        setData(null);
    }, [machineID]);

    useEffect(() => {
        if (!machineID || !date) return;
        try {
            fetch(machineID).then(setData);
        } catch (err) {
            console.error(err);
            setData("NOT_FOUND");
        }
    }, [date, refresh, machineID]);

    useEffect(() => {
        const interval = setInterval(() => {
            refetch();
        }, 1000 * 30);

        return () => clearInterval(interval);
    }, []);

    const hasTarget = useMemo(() => {
        if (!data || data === "NOT_FOUND") return false;
        return data.target.target > 0;
    }, [data]);

    const updateLog = (log: {
        start: number;
        end: number;
        reason: {
            category: downtimeCategoriesType;
            note: string;
            scheduled: boolean;
        };
        id: string;
    }) => {
        if (data === "NOT_FOUND" || data === null) return;
        if (data.timing.downtime.logs === "NOT_FOUND") return;
        const index = data.timing.downtime.logs.findIndex(d => d.id === log.id);
        if (index === -1) return;
        const newData = [...data.timing.downtime.logs];
        newData[index] = log;
        setData({
            ...data,
            timing: {
                ...data.timing,
                downtime: {
                    ...data.timing.downtime,
                    logs: newData
                }
            }
        });
    }

    const viewCategorizeTarget = useMemo(() => {
        // if status is ON 
        if (!data || data === "NOT_FOUND") return false;
        if (data.status.status === "ON") return false;
        if (data.target.started === 0) return false;
        if (data.target.machineMonitorDowntime === false) return false;
        if (data.timing.downtime.logs === "NOT_FOUND" || data.timing.downtime.logs.length === 0) return false;
        return true;
    }, [data]);

    return !data ? (
        <LoadingCard />
    ) : data === "NOT_FOUND" ? (
        <Box py={12} px={4} maxW="600px" mx="auto">
            <Alert
                status="warning"
                variant="subtle"
                flexDirection="column"
                alignItems="center"
                justifyContent="center"
                textAlign="center"
                borderRadius="xl"
                p={8}
            >
                <AlertIcon boxSize="40px" mr={0} />
                <AlertTitle mt={4} mb={2} fontSize="lg">
                    Machine Not Found
                </AlertTitle>
                <AlertDescription maxWidth="sm" mb={5} fontSize="sm">
                    No machine found with ID "{machineID}". It may have been renamed or removed.
                </AlertDescription>
                <Button
                    as={Link}
                    to="/targets"
                    colorScheme="orange"
                    size="sm"
                    leftIcon={<Icon as={FiArrowLeft} />}
                >
                    Back to Production Targets
                </Button>
            </Alert>
        </Box>
    ) : (
        <>
            <Helmet>
                <title>{data.name} | Production Targets | industrialpmr</title>
            </Helmet>
            <HStack mb={2} gap={1.5} fontSize="xs" alignItems="center">
                <ChakraLink
                    as={Link}
                    to="/targets"
                    display="inline-flex"
                    alignItems="center"
                    gap={1}
                    color={subText}
                    fontWeight={600}
                    _hover={{ color: "orange.400", textDecoration: "none" }}
                >
                    <Icon as={FiArrowLeft} boxSize="3" />
                    <Text>Production Targets</Text>
                </ChakraLink>
                <Text color={border}>/</Text>
                <Text color={text} fontWeight={700}>
                    {data.name}
                </Text>
                {data.target.name && (
                    <>
                        <Text color={border}>•</Text>
                        <Text color={subText} fontSize="2xs" fontWeight={500} isTruncated maxW="180px">
                            {data.target.name}
                        </Text>
                    </>
                )}
            </HStack>

            <MyCard p={0} w="100%">
                <CardHeader
                    py={2.5}
                    px={4}
                    display="flex"
                    flexWrap="wrap"
                    alignItems="center"
                    justifyContent="space-between"
                    gap={2.5}
                    borderBottom="1px solid"
                    borderColor={border}
                >
                    <Box>
                        <HStack gap={2} alignItems="center" flexWrap="wrap">
                            <Text fontWeight={700} fontSize={{ base: "md", md: "lg" }}>
                                {data.name}
                            </Text>
                            <Badge
                                px={2}
                                py={0.2}
                                borderRadius="full"
                                variant="subtle"
                                colorScheme={
                                    data.status.status === "ON"
                                        ? "green"
                                        : data.status.status === "IDLE"
                                        ? "orange"
                                        : data.status.status === "OFF"
                                        ? "red"
                                        : "gray"
                                }
                            >
                                <HStack spacing={1} alignItems="center">
                                    <Box
                                        w="5px"
                                        h="5px"
                                        borderRadius="full"
                                        className={data.status.status === "ON" ? "blink" : undefined}
                                        bgColor={
                                            data.status.status === "ON"
                                                ? "green.400"
                                                : data.status.status === "IDLE"
                                                ? "orange.400"
                                                : data.status.status === "OFF"
                                                ? "red.400"
                                                : "gray.400"
                                        }
                                    />
                                    <Text fontSize="2xs" fontWeight={700}>
                                        {data.status.status} ({dayjs.unix(data.status.since).fromNow(true)})
                                    </Text>
                                </HStack>
                            </Badge>
                            {data.target.sapOrder && isSapEnabled && (
                                <HStack spacing={1} flexWrap="wrap">
                                    <Tag size="sm" colorScheme="blue" variant="solid" borderRadius="md" fontWeight={700} py={0} px={1.5}>
                                        <Text fontSize="3xs">SAP #{data.target.sapOrder.orderNumber}</Text>
                                    </Tag>
                                    <Badge colorScheme="purple" variant="subtle" fontSize="3xs" px={1.5} py={0.5} borderRadius="sm">
                                        Manual End Required
                                    </Badge>
                                    {data.progress.total > 0 && data.progress.current >= data.progress.total && (
                                        <Badge colorScheme="green" variant="solid" fontSize="3xs" px={1.5} py={0.5} borderRadius="sm">
                                            Target Reached
                                        </Badge>
                                    )}
                                </HStack>
                            )}
                        </HStack>
                        <HStack gap={2} mt={0.5} color={subText} fontSize="2xs">
                            <Text fontWeight={600}>Mold: {data.mold.name || "N/A"}</Text>
                            <Text>•</Text>
                            <Text>Cycle: {Math.round(data.mold.cycleTime)}s</Text>
                            <Text>•</Text>
                            <Text>Cavities: {data.mold.cavities}</Text>
                        </HStack>
                    </Box>

                    <HStack gap={1.5} flexWrap="wrap">
                        <MyTooltip label="View live machine telemetry, sensor trends, and hydraulic logs">
                            <Button
                                as={Link}
                                to={`/machines/${machineID}`}
                                size="xs"
                                variant="outline"
                                colorScheme="gray"
                                leftIcon={<Icon as={FiCpu} />}
                            >
                                Machine Details
                            </Button>
                        </MyTooltip>
                        <MyTooltip label="Refresh live target and production data">
                            <Button
                                size="xs"
                                variant="ghost"
                                onClick={handleManualRefresh}
                                isLoading={isManualRefreshing}
                                leftIcon={<Icon as={FiRefreshCw} className={isManualRefreshing ? "spin" : undefined} />}
                                px={2}
                            >
                                Refresh
                            </Button>
                        </MyTooltip>
                        {viewCategorizeTarget && (
                            <Categorize downtime={data.timing.downtime.logs.at(-1) || ""} updateLog={updateLog}>
                                <Button
                                    size="xs"
                                    colorScheme="red"
                                    variant="outline"
                                    leftIcon={<Icon as={TbTimelineEventPlus} />}
                                >
                                    Categorize Downtime
                                </Button>
                            </Categorize>
                        )}
                        <AddUpdateTarget
                            refetch={refetch}
                            target={data.target}
                            mold={data.mold}
                            machineID={machineID}
                            notificationCategories={data.notificationCategories}
                        >
                            <Button
                                size="xs"
                                colorScheme="orange"
                                leftIcon={<Icon as={hasTarget ? FiEdit3 : FiPlus} />}
                            >
                                {hasTarget ? "Update Target" : "Add Target"}
                            </Button>
                        </AddUpdateTarget>
                    </HStack>
                </CardHeader>
                <Tabs onChange={setTabIndex} colorScheme="orange">
                    <TabList
                        overflowX="auto"
                        overflowY="hidden"
                        borderBottom="1px solid"
                        borderColor={border}
                    >
                        <Tab py={2} px={3} flex={1} minW="120px">
                            <HStack spacing={1.5} textAlign="left" w="100%">
                                <Icon as={FiActivity} fontSize="sm" color="orange.400" />
                                <Box overflow="hidden">
                                    <Text fontSize="3xs" fontWeight={700} textTransform="uppercase" color={subText} letterSpacing="wider">
                                        Current Stats
                                    </Text>
                                    <Text fontSize="xs" fontWeight={600} isTruncated>
                                        {data.target.target ? (
                                            <>
                                                {data.target.name?.toUpperCase()} (
                                                <MinifiedNumberFormatter suffixOnlyInTooltip number={data.target.target} suffix="pc(s)" />
                                                )
                                            </>
                                        ) : (
                                            "No Target"
                                        )}
                                    </Text>
                                </Box>
                            </HStack>
                        </Tab>
                        <Tab py={2} px={3} flex={1} minW="110px">
                            <HStack spacing={1.5} textAlign="left" w="100%">
                                <Icon as={FiClock} fontSize="sm" color="green.400" />
                                <Box>
                                    <Text fontSize="3xs" fontWeight={700} textTransform="uppercase" color={subText} letterSpacing="wider">
                                        Ontime
                                    </Text>
                                    <Text fontSize="xs" fontWeight={600}>
                                        {secFormatter(data.timing.ontime)}
                                    </Text>
                                </Box>
                            </HStack>
                        </Tab>
                        <Tab py={2} px={3} flex={1} minW="110px">
                            <HStack spacing={1.5} textAlign="left" w="100%">
                                <Icon as={FiAlertTriangle} fontSize="sm" color="red.400" />
                                <Box>
                                    <HStack spacing={1} align="center">
                                        <Text fontSize="3xs" fontWeight={700} textTransform="uppercase" color={subText} letterSpacing="wider">
                                            Downtime
                                        </Text>
                                        {Boolean(data.timing.downtime.scheduled && data.timing.downtime.scheduled > 0) && (
                                            <Badge colorScheme="blue" variant="subtle" fontSize="3xs" px={1} borderRadius="sm">
                                                Planned: {secFormatter(data.timing.downtime.scheduled!)}
                                            </Badge>
                                        )}
                                    </HStack>
                                    <Text fontSize="xs" fontWeight={600}>
                                        {secFormatter(data.timing.downtime.total)}
                                    </Text>
                                </Box>
                            </HStack>
                        </Tab>
                        <Tab py={2} px={3} flex={1} minW="120px">
                            <HStack spacing={1.5} textAlign="left" w="100%">
                                <Icon as={FiBarChart2} fontSize="sm" color="blue.400" />
                                <Box>
                                    <Text fontSize="3xs" fontWeight={700} textTransform="uppercase" color={subText} letterSpacing="wider">
                                        Hourly Stats
                                    </Text>
                                    <Text fontSize="xs" fontWeight={600}>
                                        {String(data.hours.length).padStart(2, "0")}h Recorded
                                    </Text>
                                </Box>
                            </HStack>
                        </Tab>
                        <Tab py={2} px={3} flex={1} minW="120px">
                            <HStack spacing={1.5} textAlign="left" w="100%">
                                <Icon as={FiLayers} fontSize="sm" color="purple.400" />
                                <Box>
                                    <Text fontSize="3xs" fontWeight={700} textTransform="uppercase" color={subText} letterSpacing="wider">
                                        Queue
                                    </Text>
                                    <Text fontSize="xs" fontWeight={600}>
                                        {String(data.productionQueues.totalOccupancy).padStart(2, "0")}h Occupied
                                    </Text>
                                </Box>
                            </HStack>
                        </Tab>
                    </TabList>
                    <CardBody py={3} px={3}>
                        <TabPanels>
                            <TabPanel p={0}>
                                {tabIndex === 0 && <CurrentStats data={data} refetch={refetch} />}
                            </TabPanel>
                            <TabPanel p={0}>
                                {tabIndex === 1 && <Ontime hours={data.hours} />}
                            </TabPanel>
                            <TabPanel p={0}>
                                {tabIndex === 2 && (
                                    <Downtime
                                        data={data.timing.downtime.logs}
                                        machineId={machineID}
                                        updateLog={updateLog}
                                        refetch={refetch}
                                    />
                                )}
                            </TabPanel>
                            <TabPanel p={0}>
                                {tabIndex === 3 && <HourlyStats hourlyTarget={data.target.hourlyTarget} data={data.hours} />}
                            </TabPanel>
                            <TabPanel p={0}>
                                {tabIndex === 4 && <ProductionQueue currentMold={data.mold} refetch={refetch} monitorDowntime={data.target.defaultMonitorDowntime} productionQueues={data.productionQueues} notificationCategories={data.notificationCategories} />}
                            </TabPanel>
                        </TabPanels>
                    </CardBody>
                </Tabs>
                <CardFooter
                    borderTop={`1px solid`}
                    borderTopColor={border}
                    display="flex"
                    justifyContent="space-between"
                    alignItems="center"
                    p={2}
                    px={4}>
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
                                as={BiUser} />
                            <MyTooltip label={`Shift Timing: ${data.operator.shift}`}>
                                {data.operator.name}
                            </MyTooltip>
                        </Text>
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
                            <MyTooltip label={dayjs.unix(data.updated).format("DD-MM-YYYY HH:mm:ss")}>
                                {dayjs.unix(data.updated).fromNow()}
                            </MyTooltip>
                        </Text>
                    </CardFooter>
                </MyCard>
            </>
    );
};

export type { DataToSet };
export default Target;