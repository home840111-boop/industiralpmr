import { Box, Center, CircularProgress, CircularProgressLabel, Flex, SimpleGrid, Stack, Text, useToast, VStack, Icon } from "@chakra-ui/react"
import dayjs from "../../../../Components/Functions/dayjs";
import { useEffect, useMemo, useState } from "react"
import { BsArrowDownShort, BsArrowUpShort, BsFillDropletFill } from "react-icons/bs"
import { FaFileExcel, FaFilePdf, FaThermometerHalf, FaWaveSquare } from "react-icons/fa"
import { FiDownload } from "react-icons/fi"
import { RiDeleteBin7Line } from "react-icons/ri"
import { get } from "../../../../Components/firebase/api/db"
import { SmallFill } from "../../../../Components/Loaders"
import MyCard from "../../../../Components/micro/Card"
import ConfirmDialog from "../../../../Components/micro/ConfirmDialog"
import MyPopover from "../../../../Components/micro/MyPopover"
import MyTooltip from "../../../../Components/micro/MyTooltip"
import NotFound from "../../../../Components/micro/NotFound"
import { Line } from "@ant-design/plots"
import { Option, ReportParametrsType } from "../../Selector/types"
import { endAt, orderByKey, query, ref, startAt, get as firebaseGet } from "firebase/database"
import { db } from "../../../../Components/firebase"
import Get from "../../../../Components/Store/hooks/Get"
import { uidAtom } from "../../../../Components/Store/atoms"
import landscapePDF from "../../../../Components/Exporters/landscapePDF"
import excelDownload, { ExcelSectionType } from "../../../../Components/Exporters/excelDownload"

interface Stat {
    high: number;
    low: number;
    avg: number;
}
interface StatWithTime extends Stat {
    time: string;
}
interface DataToSet {
    humidity: {
        today: Stat;
        logs: StatWithTime[];
    };
    temperature: {
        today: Stat;
        logs: StatWithTime[];
    };
}
const EnvironmentReport = ({
    parameters
}: {
    parameters: ReportParametrsType["environment"]
}) => {
    const toast = useToast();
    const [data, setData] = useState<null | DataToSet | "NOT_FOUND">(null);
    const [isBusy, setIsBusy] = useState(false);
    const uid = Get(uidAtom);
    const envName = useMemo(() => {
        return (parameters.option as Option)?.label;
    }, [parameters]);
    const selectedTitle = useMemo(() => {
        if (parameters.date.from?.toDateString() === parameters.date.to?.toDateString()) return `${envName} | ` + dayjs(parameters.date.from).format("DD MMM, YY");
        return `${envName} | ${dayjs(parameters.date.from).format("DD MMM, YY")} - ${dayjs(parameters.date.to).format("DD MMM, YY")}`;
    }, [parameters, envName]);
    const isSingleDay = useMemo(() => {
        return parameters.date.from?.toDateString() === parameters.date.to?.toDateString();
    }, [parameters]);

    useEffect(() => {
        if (!uid) return;
        const func = async () => {
            setData(null);
            const dataToSet: DataToSet = {
                humidity: {
                    today: {
                        high: -Infinity,
                        low: Infinity,
                        avg: 0
                    },
                    logs: []
                },
                temperature: {
                    today: {
                        high: -Infinity,
                        low: Infinity,
                        avg: 0
                    },
                    logs: []
                },
            };
            if (isSingleDay) {
                const date = dayjs(parameters.date.from).format("YYYY-MM-DD");
                const promises = [
                    get(`reports/env/${(parameters.option as Option)?.value}/daily/${date}`),
                    get(`reports/env/${(parameters.option as Option)?.value}/hourly/${date}`)
                ];
                const [dailySnap, hourlySnap] = await Promise.all(promises);
                if (!dailySnap.exists() || !hourlySnap.exists()) {
                    setData("NOT_FOUND");
                    return;
                }
                const dailyData = dailySnap.val();
                const hourlyData = hourlySnap.val();
                for (const key in hourlyData) {
                    const element = hourlyData[key];
                    const time = `${element.humidity.start}-${element.humidity.end}`;
                    dataToSet.humidity.logs.push({
                        time,
                        high: element.humidity.hourlyMax,
                        low: element.humidity.hourlyMin,
                        avg: element.humidity.hourlyAvg
                    });
                    dataToSet.temperature.logs.push({
                        time,
                        high: element.temperature.hourlyMax,
                        low: element.temperature.hourlyMin,
                        avg: element.temperature.hourlyAvg
                    });
                }
                dataToSet.humidity.today = {
                    high: dailyData.humidity.max,
                    low: dailyData.humidity.min,
                    avg: dailyData.humidity.avg
                };
                dataToSet.temperature.today = {
                    high: dailyData.temperature.max,
                    low: dailyData.temperature.min,
                    avg: dailyData.temperature.avg
                };
            } else {
                const dates = [
                    dayjs(parameters.date.from).format("YYYY-MM-DD"),
                    dayjs(parameters.date.to).format("YYYY-MM-DD")
                ];
                const promises = [];
                promises.push(
                    firebaseGet(
                        query(
                            ref(db, `users/${uid}/reports/env/${(parameters.option as Option)?.value}/daily`),
                            orderByKey(),
                            startAt(dates[0]),
                            endAt(dates[1]),
                        ),
                    ),
                );
                const [dailySnap] = await Promise.all(promises);
                if (!dailySnap.exists()) {
                    setData("NOT_FOUND");
                    return;
                }
                const dailyData = dailySnap.val();
                let total: {
                    temperature: Stat;
                    humidity: Stat;
                } = {
                    temperature: {
                        high: -Infinity,
                        low: Infinity,
                        avg: 0,
                    },
                    humidity: {
                        high: -Infinity,
                        low: Infinity,
                        avg: 0,
                    },
                };
                for await (const [date, __data] of Object.entries(dailyData)) {
                    const data = __data as any;
                    dataToSet.humidity.logs.push({
                        time: date as string,
                        high: data.humidity.max,
                        low: data.humidity.min,
                        avg: data.humidity.avg
                    });
                    total.humidity.high = Math.max(total.humidity.high, data.humidity.max);
                    total.humidity.low = Math.min(total.humidity.low, data.humidity.min);
                    total.humidity.avg += data.humidity.avg;
                    dataToSet.temperature.logs.push({
                        time: date as string,
                        high: data.temperature.max,
                        low: data.temperature.min,
                        avg: data.temperature.avg
                    });
                    total.temperature.high = Math.max(total.temperature.high, data.temperature.max);
                    total.temperature.low = Math.min(total.temperature.low, data.temperature.min);
                    total.temperature.avg += data.temperature.avg;
                }
                total.humidity.avg /= Object.keys(dailyData).length;
                total.temperature.avg /= Object.keys(dailyData).length;
                dataToSet.humidity.today = total.humidity;
                dataToSet.temperature.today = total.temperature;
            }
            setData(dataToSet);
        }
        func();
    }, [isSingleDay, parameters, uid]);

    const downloadPDF = async () => {
        if (data === null || data === "NOT_FOUND") return;
        setIsBusy(true);
        const tables = {} as {
            [key: string]: string[][]
        };
        const temperatureTable = [["Time", "Average", "Minimum", "Maximum"]];
        const humidityTable = [["Time", "Average", "Minimum", "Maximum"]];
        for (const value of data.temperature.logs) {
            temperatureTable.push([value.time, value.avg.toFixed(2), value.low.toFixed(2), value.high.toFixed(2)]);
        }
        for (const value of data.humidity.logs) {
            humidityTable.push([value.time, value.avg.toFixed(2), value.low.toFixed(2), value.high.toFixed(2)]);
        }
        tables["Temperature"] = temperatureTable;
        tables["Humidity"] = humidityTable;
        await landscapePDF({
            filename: `environment-report(${dayjs(parameters.date.from).format("DD-MM-YYYY")}${!isSingleDay ? `-${dayjs(parameters.date.to).format("DD-MM-YYYY")}` : ""}).pdf`,
            headings: {
                left: "Environment Report",
                middle: (parameters.option as Option)?.label,
                right: dayjs(parameters.date.from).format("D MMM YYYY")
            },
            stats: {
                "Temperature": `AVG: ${data.temperature.today.avg.toFixed(2)}°\nMIN: ${data.temperature.today.low.toFixed(2)}°\nMAX: ${data.temperature.today.high.toFixed(2)}°`,
                "Humidity": `AVG: ${data.humidity.today.avg.toFixed(2)}%\nMIN: ${data.humidity.today.low.toFixed(2)}%\nMAX: ${data.humidity.today.high.toFixed(2)}%`,
            },
            tables
        });
        setIsBusy(false);
    };
    const downloadExcel = async () => {
        try {
            if (data === null || data === "NOT_FOUND") return;
            setIsBusy(true);
            const sections = [] as ExcelSectionType[];
            const temperatureSection: ExcelSectionType = {
                mainHeading: "Temperature (°C)",
                subHeadings: ["Time", "Average", "Minimum", "Maximum"],
                data: [] as ExcelSectionType['data'],
                footer: ["Total", 0, 0, 0] as ExcelSectionType['footer']
            };
            const humiditySection: ExcelSectionType = {
                mainHeading: "Humidity (%)",
                subHeadings: ["Time", "Average", "Minimum", "Maximum"],
                data: [] as ExcelSectionType['data'],
                footer: ["Total", 0, 0, 0] as ExcelSectionType['footer']
            };
            for (const value of data.temperature.logs) {
                temperatureSection.data.push([value.time, +value.avg.toFixed(2), +value.low.toFixed(2), +value.high.toFixed(2)]);
            }
            for (const value of data.humidity.logs) {
                humiditySection.data.push([value.time, +value.avg.toFixed(2), +value.low.toFixed(2), +value.high.toFixed(2)]);
            }
            temperatureSection.footer[1] = +data.temperature.today.avg.toFixed(2);
            temperatureSection.footer[2] = +data.temperature.today.low.toFixed(2);
            temperatureSection.footer[3] = +data.temperature.today.high.toFixed(2);
            humiditySection.footer[1] = +data.humidity.today.avg.toFixed(2);
            humiditySection.footer[2] = +data.humidity.today.low.toFixed(2);
            humiditySection.footer[3] = +data.humidity.today.high.toFixed(2);
            sections.push(temperatureSection);
            sections.push(humiditySection);
            await excelDownload({
                filename: `environment-report(${dayjs(parameters.date.from).format("DD-MM-YYYY")}${isSingleDay ? "" : `-${dayjs(parameters.date.to).format("DD-MM-YYYY")}`}).xlsx`,
                heading: `${(parameters.option as Option)?.label} | ${dayjs(parameters.date.from).format("DD MMM, YY")}${isSingleDay ? "" : ` - ${dayjs(parameters.date.to).format("DD MMM, YY")}`}`,
                sections,
            });
        } catch (err) {
            console.log(err);
            toast({
                title: "Error",
                description: "Something went wrong",
                status: "error",
                duration: 5000,
                isClosable: true,
            })
        }
        setIsBusy(false);
    };

    return <Flex gap={5} flexDir={"column"}>
        <Box display="flex" alignItems={"center"} justifyContent="space-between">
            <Text fontWeight={600}>Environment Report: <span style={{
                color: "var(--chakra-colors-primary)",
                fontWeight: 500,
                fontSize: "0.8rem"
            }}>{selectedTitle}</span></Text>
            <Stack
                alignItems={{
                    base: "flex-start",
                    sm: "center"
                }}
                gap={2}
                flexDir={{
                    base: "column",
                    sm: "row"
                }}>
                <MyPopover placement="bottom-end">
                    <Text userSelect={"none"} cursor={"pointer"} transition="all ease 0.2s" _hover={{
                        color: "primary"
                    }} fontWeight={600} fontSize="sm" display="flex" alignItems={"center"} justifyContent="space-between" gap={1} color="orange.300">
                        <FiDownload />
                        Download
                    </Text>
                    <Box>
                        <VStack w="100%" alignItems={"flex-start"}>
                            <Text onClick={() => { !isBusy && downloadPDF() }} userSelect={"none"} cursor={"pointer"} transition="all ease 0.2s" _hover={{
                                opacity: 1
                            }} fontWeight={600} fontSize="sm" display="flex" alignItems={"center"} justifyContent="space-between" gap={1} opacity="0.8">
                                <FaFilePdf />
                                Download PDF
                            </Text>
                            <Text onClick={() => { !isBusy && downloadExcel() }} userSelect={"none"} cursor={"pointer"} transition="all ease 0.2s" _hover={{
                                opacity: 1
                            }} fontWeight={600} fontSize="sm" display="flex" alignItems={"center"} justifyContent="space-between" gap={1} opacity="0.8">
                                <FaFileExcel />
                                Download Excel
                            </Text>
                        </VStack>
                    </Box>
                </MyPopover>
                <ConfirmDialog scope="danger" text="Are you sure you want to delete this report, All data related to this report will be deleted." onConfirm={() => {
                    toast({
                        title: "Unauthorized",
                        description: "You are not authorized to delete this report",
                        status: "error",
                        duration: 5000,
                        isClosable: true,
                    })
                }}>
                    <Text userSelect={"none"} cursor={"pointer"} transition="all ease 0.2s" _hover={{
                        color: "red"
                    }} fontWeight={600} fontSize="sm" display="flex" alignItems={"center"} justifyContent="space-between" gap={1} color="red.400">
                        <RiDeleteBin7Line />
                        Delete
                    </Text>
                </ConfirmDialog>
            </Stack>
        </Box>
        {data === null ?
            <MyCard as={Center} minH="50vh">
                <SmallFill />
            </MyCard> :
            data === "NOT_FOUND" ?
                <MyCard as={Center} minH="50vh">
                    <NotFound />
                </MyCard> :
                <Flex gap={5} flexDir="column">
                    <Temperature data={data.temperature} />
                    <Humidity data={data.humidity} />
                </Flex>
        }
    </Flex>
}

const Temperature = ({
    data,
}: {
    data: DataToSet["temperature"],
}) => {
    const [color, alteredData] = useMemo(() => {
        const temperature = data.today.avg;
        const color: "red" | "green" | "orange" = temperature > 45 ? "red" : temperature < 35 ? "green" : "orange";
        const alteredData: {
            time: string;
            value: number;
            type: string;
        }[] = [];
        for (const value of data.logs) {
            const time = value.time;
            alteredData.push({
                time,
                value: value.avg,
                type: 'Average',
            });
            alteredData.push({
                time,
                value: value.low,
                type: 'Minimum',
            });
            alteredData.push({
                time,
                value: value.high,
                type: 'Maximum',
            });
        }
        return [color, alteredData];
    }, [data]);


    const config = {
        data: alteredData,
        yAxis: {
            min: 0,
            max: 80,
            // hide all text
            label: {
                formatter: () => "",
            }
        },
        xAxis: {
            range: [0, 1],
        },
        smooth: true,
        xField: 'time',
        yField: 'value',
        seriesField: 'type',
    };

    return <MyCard px={5}>
        <SimpleGrid columns={{
            base: 1,
            md: 2
        }} gap={5}>
            <Flex gap={5} justifyContent={"space-between"} alignItems="center" flexDir="column">
                <Flex w="100%" flexDir="row" justifyContent={"space-between"}>
                    <Box>
                        <Text fontWeight={500} fontSize="lg" alignItems="center" display="flex" gap={1}>
                            <Icon as={FaThermometerHalf} />
                            Temperature
                        </Text>
                    </Box>
                </Flex>
                <Center>
                    <CircularProgress
                        thickness={"8px"}
                        rounded={"full"}
                        size={"250px"}
                        value={data.today.avg || 0}
                        color={color}
                        trackColor={"#cccccc40"}
                        capIsRound>
                        <CircularProgressLabel>
                            <Flex flexDir="column" alignItems="center" justifyContent={"center"}>
                                <Text color={color} display="flex" alignItems={"flex-start"} fontSize="4xl" fontWeight={400}>{data.today.avg?.toFixed(2)}<span style={{
                                    fontSize: "1.5rem",
                                }}>°</span></Text>
                                <Text fontWeight={500} fontSize="xs" alignItems="center" display="flex" gap={1} opacity={0.8}>
                                    <Icon as={FaThermometerHalf} />
                                    Temperature</Text>
                            </Flex>
                        </CircularProgressLabel>
                    </CircularProgress>
                </Center>
                <Flex mt={5} w="100%" justifyContent={"space-between"} alignItems="center">
                    <MyTooltip label="Highest">
                        <Text fontWeight={500} fontSize="md" alignItems="center" display="flex" gap={1}>
                            <Icon as={BsArrowUpShort} />
                            {data.today.high.toFixed(2)}°
                        </Text>
                    </MyTooltip>
                    <MyTooltip label="Average">
                        <Text fontWeight={500} fontSize="md" alignItems="center" display="flex" gap={1}>
                            <Icon as={FaWaveSquare} />
                            {data.today.avg.toFixed(2)}°
                        </Text>
                    </MyTooltip>
                    <MyTooltip label="Lowest">
                        <Text fontWeight={500} fontSize="md" alignItems="center" display="flex" gap={1}>
                            <Icon as={BsArrowDownShort} />
                            {data.today.low.toFixed(2)}°
                        </Text>
                    </MyTooltip>
                </Flex>
            </Flex>
            <Box>
                <Line
                    legend={false}
                    lineStyle={{
                        lineWidth: 3,
                    }}
                    tooltip={{
                        formatter: (datum: any) => {
                            return {
                                name: datum.type,
                                value: datum.value.toFixed(2),
                            };
                        }
                    }}
                    {...config} />
            </Box>
        </SimpleGrid>
    </MyCard>
}

const Humidity = ({
    data,
}: {
    data: DataToSet["humidity"],
}) => {
    const [color, alteredData] = useMemo(() => {
        const temperature = data.today.avg;
        const color: "red" | "green" | "orange" = temperature > 45 ? "red" : temperature < 35 ? "green" : "orange";
        const alteredData: {
            time: string;
            value: number;
            type: string;
        }[] = [];
        for (const value of data.logs) {
            const time = value.time;
            alteredData.push({
                time,
                value: value.avg,
                type: 'Average',
            });
            alteredData.push({
                time,
                value: value.low,
                type: 'Minimum',
            });
            alteredData.push({
                time,
                value: value.high,
                type: 'Maximum',
            });
        }
        return [color, alteredData];
    }, [data]);


    const config = {
        data: alteredData,
        yAxis: {
            min: 0,
            max: 80,
            // hide all text
            label: {
                formatter: () => "",
            }
        },
        xAxis: {
            range: [0, 1],
        },
        smooth: true,
        xField: 'time',
        yField: 'value',
        seriesField: 'type',
    };

    return <MyCard px={5}>
        <SimpleGrid columns={{
            base: 1,
            md: 2
        }} gap={5}>
            <Flex gap={5} justifyContent={"space-between"} alignItems="center" flexDir="column">
                <Flex w="100%" flexDir="row" justifyContent={"space-between"}>
                    <Box>
                        <Text fontWeight={500} fontSize="lg" alignItems="center" display="flex" gap={1}>
                            <Icon as={BsFillDropletFill} />
                            Humidity
                        </Text>
                    </Box>
                </Flex>
                <Center>
                    <CircularProgress
                        thickness={"8px"}
                        rounded={"full"}
                        size={"250px"}
                        value={data.today.avg || 0}
                        color={color}
                        trackColor={"#cccccc40"}
                        capIsRound>
                        <CircularProgressLabel>
                            <Flex flexDir="column" alignItems="center" justifyContent={"center"}>
                                <Text color={color} display="flex" alignItems={"flex-start"} fontSize="4xl" fontWeight={400}>{data.today.avg?.toFixed(2)}<span style={{
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
                            {data.today.high.toFixed(2)}%
                        </Text>
                    </MyTooltip>
                    <MyTooltip label="Average">
                        <Text fontWeight={500} fontSize="md" alignItems="center" display="flex" gap={1}>
                            <Icon as={FaWaveSquare} />
                            {data.today.avg.toFixed(2)}%
                        </Text>
                    </MyTooltip>
                    <MyTooltip label="Lowest">
                        <Text fontWeight={500} fontSize="md" alignItems="center" display="flex" gap={1}>
                            <Icon as={BsArrowDownShort} />
                            {data.today.low.toFixed(2)}%
                        </Text>
                    </MyTooltip>
                </Flex>
            </Flex>
            <Box>
                <Line
                    legend={false}
                    lineStyle={{
                        lineWidth: 3,
                    }}
                    tooltip={{
                        formatter: (datum: any) => {
                            return {
                                name: datum.type,
                                value: datum.value.toFixed(2),
                            };
                        }
                    }}
                    {...config} />
            </Box>
        </SimpleGrid>
    </MyCard>
}

export default EnvironmentReport