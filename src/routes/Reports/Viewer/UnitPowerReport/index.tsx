import { useEffect, useMemo, useState } from "react"
import { uidAtom } from "../../../../Components/Store/atoms"
import Get from "../../../../Components/Store/hooks/Get"
import { endAt, orderByKey, query, ref, startAt, get as firebaseGet } from "firebase/database"
import { Option, ReportParametrsType } from "../../Selector/types"
import { db } from "../../../../Components/firebase"
import dayjs from "../../../../Components/Functions/dayjs";
import { Box, Button, CardBody, CardHeader, Center, Flex, GridItem, SimpleGrid, Stack, Text, useColorMode, useToast, VStack } from "@chakra-ui/react"
import MyPopover from "../../../../Components/micro/MyPopover"
import { FiDownload } from "react-icons/fi"
import { FaFileExcel, FaFilePdf } from "react-icons/fa"
import ConfirmDialog from "../../../../Components/micro/ConfirmDialog"
import { RiDeleteBin7Line } from "react-icons/ri"
import MyCard from "../../../../Components/micro/Card"
import NotFound from "../../../../Components/micro/NotFound"
import { Line, LineConfig } from '@ant-design/plots';
import { SmallFill } from "../../../../Components/Loaders"
import secFormatter from "../../../../Components/Functions/formatters/secFormatter";
import Table from "../../../../Components/micro/Table";
import landscapePDF from "../../../../Components/Exporters/landscapePDF"
import excelDownload, { ExcelSectionType } from "../../../../Components/Exporters/excelDownload"
import downloadCSV from "../../../../Components/Exporters/csvDownload"

interface DataToSet {
    powerOffs: number;
    totalDuration: number;
    logs: {
        time: string;
        duration: number;
        status: "ON" | "OFF";
    }[]
}
const UnitPowerReport = ({
    parameters
}: {
    parameters: ReportParametrsType["unit-power"]
}) => {
    const taost = useToast();
    const { colorMode } = useColorMode();
    const { border } = useMemo(() => ({
        border: `${colorMode}.border`
    }), [colorMode]);
    const selectedTitle = useMemo(() => {
        if (parameters.date.from?.toDateString() === parameters.date.to?.toDateString()) return dayjs(parameters.date.from).format("DD MMM, YY");
        return `UNIT#${((parameters.option as Option)?.value).padStart(2, "0")} | ${dayjs(parameters.date.from).format("DD MMM, YY")} - ${dayjs(parameters.date.to).format("DD MMM, YY")}`;
    }, [parameters]);
    const [isBusy, setIsBusy] = useState(false);
    const [data, setData] = useState<DataToSet | null | "NOT_FOUND">(null);
    const uid = Get(uidAtom);

    useEffect(() => {
        if (!uid) return;
        const func = async () => {
            setData(null);
            const datatoSet: DataToSet = {
                powerOffs: 0,
                totalDuration: 0,
                logs: [] as DataToSet["logs"]
            };
            const dates = [
                dayjs(parameters.date.from).format("YYYY-MM-DD"),
                dayjs(parameters.date.to).format("YYYY-MM-DD")
            ];
            const promises = [];
            promises.push(
                firebaseGet(
                    query(
                        ref(db, `users/${uid}/electricity_report_new/${(parameters.option as Option)?.value}`),
                        orderByKey(),
                        startAt(dates[0]),
                        endAt(dates[1]),
                    ),
                ),
            );
            const [snap] = await Promise.all(promises);
            if (!snap.exists()) {
                setData("NOT_FOUND");
                return;
            }
            const data = snap.val();
            for await (const [date, __data] of Object.entries(data)) {
                for await (const [time, _data] of Object.entries(__data || {})) {
                    const __data = _data as any;
                    datatoSet.logs.push({
                        time: dayjs(`${date} ${time}`).format("hh:mm:ss A DD MMM, YYYY"),
                        duration: __data.offtime,
                        status: __data.activity === "on" ? "ON" : "OFF"
                    });
                    if (__data.activity === "off") datatoSet.powerOffs++;
                    datatoSet.totalDuration += __data.offtime;
                }
            }
            setData(datatoSet);
        };
        func();
    }, [parameters, uid]);

    const handleDownloadCSV = () => {
        if (data === null || data === "NOT_FOUND") return;
        const rows = data.logs.map((log) => [
            log.time,
            secFormatter(log.duration),
            log.status,
        ]);
        downloadCSV("power-on-off-logs.csv", ["Time", "Duration", "Status"], rows);
    };

    const downloadPDF = async () => {
        if (data === null || data === "NOT_FOUND") return;
        setIsBusy(true);
        const tables = {} as {
            [key: string]: string[][]
        };
        const powerOnOffTable = [["Time", "Off Duration", "Status"]];
        for await (const log of data.logs) {
            powerOnOffTable.push([
                log.time,
                secFormatter(log.duration),
                log.status
            ]);
        }
        tables["Power ON/OFF"] = powerOnOffTable;
        await landscapePDF({
            filename: `unit-power-report(${dayjs(parameters.date.from).format("DD-MM-YYYY")}${parameters.date.from?.toDateString() === parameters.date.to?.toDateString() ? "" : `-${dayjs(parameters.date.to).format("DD-MM-YYYY")}`
                }).pdf`,
            headings: {
                left: "Daily Production Report",
                middle: `UNIT#${((parameters.option as Option)?.value).padStart(2, "0")}`,
                right: dayjs(parameters.date.from).format("D MMM YYYY")
            },
            stats: {
                "Total Power Offs": String(data.powerOffs),
                "Total Off Duration": secFormatter(data.totalDuration)
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
            const machineSection: ExcelSectionType = {
                mainHeading: "Unit Power ON/OFF Report",
                subHeadings: ["Time", "Off Duration", "Status"],
                data: [] as ExcelSectionType['data'],
                footer: ["Total", 0, 0] as ExcelSectionType['footer']
            }
            for await (const log of data.logs) {
                (machineSection.footer[1] as number) += log.duration;
                if (log.status === "OFF") (machineSection.footer[2] as number) += 1;
                machineSection.data.push([
                    log.time,
                    secFormatter(log.duration),
                    log.status
                ]);
            }
            machineSection.footer[1] = secFormatter(+machineSection.footer[1]);
            machineSection.footer[2] = machineSection.footer[2] + " OFFs";
            sections.push(machineSection);
            await excelDownload({
                filename: `unit-power-report(${dayjs(parameters.date.from).format("DD-MM-YYYY")}${parameters.date.from?.toDateString() === parameters.date.to?.toDateString() ? "" : `-${dayjs(parameters.date.to).format("DD-MM-YYYY")}`
                    }).xlsx`,
                heading: `UNIT#${(parameters.option as Option).value.padStart(2, "0")} Report (${dayjs(parameters.date.from).format("DD-MM-YYYY")})`,
                sections,
            });
        } catch (err) {
            console.log(err);
            taost({
                title: "Error",
                description: "Something went wrong",
                status: "error",
                duration: 5000,
                isClosable: true,
            })
        }
        setIsBusy(false);
    };

    const config: LineConfig = {
        data: data && data !== "NOT_FOUND" ? data.logs.map(log => {
            return {
                time: log.time,
                value: log.status === "ON" ? 1 : 0
            }
        }) : [],
        xField: 'time',
        yField: 'value',
        yAxis: {
            min: -0.5,
            max: 1.5
        },
        xAxis: {
            range: [0, 1],
        },
        tooltip: false,
        stepType: 'vh',
        lineStyle: {
            lineWidth: 4,
        }
    };

    return <Flex gap={5} flexDir={"column"}>
        <Box display="flex" alignItems={"center"} justifyContent="space-between">
            <Text fontWeight={600}>Unit Power Report: <span style={{
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
                    taost({
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
            data === "NOT_FOUND" ? <MyCard as={Center} minH="50vh">
                <NotFound />
            </MyCard> : <MyCard p={0}>
                <CardHeader borderBottom={"1px solid"} borderColor={border} display="flex" alignItems="center" justifyContent={"space-between"} px={2} pb={1} pt={3}>
                    <Text fontWeight={500} fontSize="lg">Power ON/OFF Logs</Text>
                    <Button
                        size="sm"
                        variant="outline"
                        colorScheme="orange"
                        leftIcon={<FiDownload />}
                        onClick={handleDownloadCSV}
                        isDisabled={data.logs.length === 0}
                        ml="auto"
                        mr={{ base: 0, md: "60%" }}
                    >
                        CSV
                    </Button>
                </CardHeader>
                <CardBody p={0}>
                    <Flex flexDir="row">
                        <Box
                            border="1px dashed"
                            borderColor={border}
                            w='100%'
                            h='100%'
                            py={5}
                            textAlign={"center"}>
                            <Text
                                fontSize="lg"
                                fontWeight={600}>
                                {data.powerOffs}
                            </Text>
                            <Text
                                textTransform={"capitalize"}
                                letterSpacing={1}
                                opacity={0.7}
                                fontSize="xs">
                                Total Power Offs
                            </Text>
                        </Box>
                        <Box
                            border="1px dashed"
                            borderColor={border}
                            w='100%'
                            h='100%'
                            py={5}
                            textAlign={"center"}>
                            <Text
                                fontSize="md"
                                fontWeight={600}>
                                {secFormatter(data.totalDuration)}
                            </Text>
                            <Text
                                textTransform={"capitalize"}
                                letterSpacing={1}
                                opacity={0.7}
                                fontSize="xs">
                                Total Off Duration
                            </Text>
                        </Box>
                    </Flex>
                    <SimpleGrid my={5} columns={{
                        base: 1,
                        md: 5
                    }}>
                        <GridItem maxH={350} overflow="auto" colSpan={{
                            base: 1,
                            md: 2
                        }}>
                            <Table
                                headings={[
                                    "Time",
                                    "Duration",
                                    "Status"
                                ]} rows={data.logs.map(log => {
                                    return [
                                        log.time,
                                        secFormatter(log.duration),
                                        {
                                            element: Text,
                                            props: {
                                                textTransform: "capitalize",
                                                color: log.status === "ON" ? "green.500" : "red.500",
                                                fontWeight: 600,
                                                fontSize: "sm"
                                            },
                                            children: log.status
                                        }
                                    ]
                                })} />
                        </GridItem>
                        <GridItem colSpan={{
                            base: 1,
                            md: 3
                        }}>
                            <Line
                                height={300}
                                {...config} />
                        </GridItem>
                    </SimpleGrid>
                </CardBody>
            </MyCard>}
    </Flex>
}

export default UnitPowerReport