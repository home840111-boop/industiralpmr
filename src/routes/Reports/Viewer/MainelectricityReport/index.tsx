import { Box, Center, Flex, GridItem, SimpleGrid, Stack, Text, useToast, VStack } from "@chakra-ui/react"
import dayjs from "../../../../Components/Functions/dayjs"
import { useEffect, useMemo, useState } from "react"
import { FaFileExcel, FaFilePdf } from "react-icons/fa"
import { FiDownload } from "react-icons/fi"
import { RiDeleteBin7Line } from "react-icons/ri"
import { SmallFill } from "../../../../Components/Loaders"
import MyCard from "../../../../Components/micro/Card"
import ConfirmDialog from "../../../../Components/micro/ConfirmDialog"
import MyPopover from "../../../../Components/micro/MyPopover"
import NotFound from "../../../../Components/micro/NotFound"
import { companyNameAtom, equipmentsAtom, machinesAtom, uidAtom } from "../../../../Components/Store/atoms"
import Get from "../../../../Components/Store/hooks/Get"
import { endAt, orderByKey, query, ref, startAt, get as firebaseGet } from "firebase/database"
import { ReportSubmitType } from "../../Selector/types"
import { db } from "../../../../Components/firebase"
import Spiral from "./Spiral"
import Graph from "./Graph"
import Distribute from "./Distribute"
import unitFormatter from "../../../../Components/Functions/formatters/unitFormatter"
import landscapePDF from "../../../../Components/Exporters/landscapePDF"
import excelDownload, { ExcelSectionType } from "../../../../Components/Exporters/excelDownload"

interface SpiralType {
    time: string,
    day: string,
    value: number,
}
interface LineType extends Omit<SpiralType, "time"> { }
interface DataToSet {
    spiral: {
        [title: string]: SpiralType[]
    },
    lineGraph: {
        [title: string]: LineType[]
    },
    distribution: {
        [date: string]: {
            [item: string]: {
                name: string,
                value: number,
            }
        }
    }
}

const MainelectricityReport = ({
    parameters
}: {
    parameters: ReportSubmitType["main-electricity"]
}) => {
    const toast = useToast();
    const [data, setData] = useState<null | DataToSet | "NOT_FOUND">(null);
    const [isBusy, setIsBusy] = useState(false);
    const uid = Get(uidAtom);
    const machines = Get(machinesAtom);
    const equipments = Get(equipmentsAtom);
    const companyName = Get(companyNameAtom);

    const dates = useMemo(() => {
        if (parameters?.type === "day") {
            if (typeof parameters.date === "object") {
                parameters.date = `${dayjs((parameters.date as any)?.from).format("YYYY-MM-DD")}|${dayjs((parameters.date as any)?.to).format("YYYY-MM-DD")}`;
            }
            const date = (parameters?.date || "")?.split("|");
            if (date[1] === undefined) date[1] = date[0];
            return {
                from: dayjs(date[0]).format("YYYY-MM-DD"),
                to: dayjs(date[1]).format("YYYY-MM-DD")
            };
        } else if (parameters?.type === "year") {
            const years = (parameters?.date || "")?.split("|");
            const date = [years[0], years[1] || years[0]];
            return {
                from: date[0],
                to: date[1]
            };
        } else {
            const months = (parameters?.date || "")?.split("|");
            const date = [months[0], months[1] || months[0]];
            return {
                from: date[0],
                to: date[1]
            };
        }
    }, [parameters]);
    const selectedTitle = useMemo(() => {
        let datesToShow;
        const isSingle = dates.from === dates.to;
        if (parameters.type === "day") {
            if (isSingle) datesToShow = dayjs(dates.from).format("DD MMM, YY");
            else datesToShow = `${dayjs(dates.from).format("DD MMM, YY")} - ${dayjs(dates.to).format("DD MMM, YY")}`;
        } else if (parameters.type === "year") {
            if (isSingle) datesToShow = dates.from;
            else datesToShow = `${dates.from} - ${dates.to}`;
        } else {
            if (isSingle) datesToShow = dayjs(dates.from, "YYYY-MM").format("MMM, YY");
            else datesToShow = `${dayjs(dates.from, "YYYY-MM").format("MMM, YY")} - ${dayjs(dates.to, "YYYY-MM").format("MMM, YY")}`;
        }
        return `Main Electricity | ${datesToShow}`;
    }, [dates, parameters]);

    useEffect(() => {
        if (!uid || !machines || !equipments) return;
        const func = async () => {
            setData(null);
            const dataToSet: DataToSet = {
                spiral: {},
                lineGraph: {},
                distribution: {}
            };
            if (parameters.type === "day") {
                const isSingleDay = dates.from === dates.to;
                const promises = [];
                promises.push(firebaseGet(query(ref(db, `users/${uid}/simple_meter/daily`),
                    orderByKey(),
                    startAt(dates.from),
                    endAt(dates.to))));
                promises.push(firebaseGet(query(ref(db, `users/${uid}/reports/factory/daily`),
                    orderByKey(),
                    startAt(dates.from),
                    endAt(dates.to))));
                promises.push(firebaseGet(query(ref(db, `users/${uid}/reports/factory/hourly`),
                    orderByKey(),
                    startAt(dates.from),
                    endAt(dates.to))));
                const [daysSnap, factoryDailySnap, factoryHoursSnap] = await Promise.all(promises);
                if (!daysSnap.exists()) {
                    setData("NOT_FOUND");
                    return;
                }
                const factoryHours = factoryHoursSnap.val() || {};
                const factoryData = factoryDailySnap.val() || {};
                if (isSingleDay) dataToSet.lineGraph["Hours Breakdown"] = [];
                else dataToSet.lineGraph["Days Breakdown"] = [];
                dataToSet.spiral["Hours Breakdown"] = [];
                for (const [_date, _data] of Object.entries(daysSnap.val() || {})) {
                    const date = _date as string;
                    const data = _data as {
                        hours: {
                            [key: string]: {
                                time: string,
                                value: number
                            }
                        },
                    };
                    let total = 0;
                    for await (const _hour of Object.values(data?.hours || {})) {
                        const hour = _hour as any;
                        total += hour.value;
                        dataToSet.spiral["Hours Breakdown"].push({
                            time: dayjs("1970-01-01 " + hour.time.split(" - ")[0]).format("ha"),
                            day: dayjs(date).format("D MMM"),
                            value: hour.value
                        });
                        if (isSingleDay) dataToSet.lineGraph["Hours Breakdown"].push({
                            day: dayjs("1970-01-01 " + hour.time.split(" - ")[0]).format("ha"),
                            value: hour.value
                        });
                    }
                    if (!isSingleDay) dataToSet.lineGraph["Days Breakdown"].push({
                        day: dayjs(date).format("D MMM"),
                        value: total
                    });

                    const factory = factoryData[date] || {};
                    const hours = factoryHours[date] || {};
                    if (!factory || !hours) continue;
                    let distTotal = 0;
                    for (let i = 1; i <= 24; i++) {
                        const hourData = hours[i] as any;
                        if (!hourData) continue;
                        for await (const [key, val] of Object.entries(hourData?.machines || {})) {
                            const value = val as any;
                            if (!dataToSet.distribution[date]) dataToSet.distribution[date] = {};
                            if (dataToSet.distribution[date][key]) dataToSet.distribution[date][key].value += value.electricity_usage;
                            else dataToSet.distribution[date][key] = {
                                name: machines[key],
                                value: value.electricity_usage,
                            };
                            distTotal += value.electricity_usage;
                        }
                        for await (const [key, val] of Object.entries(hourData?.equipments || {})) {
                            const value = val as any;
                            if (!dataToSet.distribution[date]) dataToSet.distribution[date] = {};
                            if (dataToSet.distribution[date][key]) dataToSet.distribution[date][key].value += value.electricity_usage;
                            else dataToSet.distribution[date][key] = {
                                name: equipments[key],
                                value: value.electricity_usage,
                            };
                            distTotal += value.electricity_usage;
                        }
                        const misc = Math.max(total - distTotal, 0);
                        dataToSet.distribution[date].misc = {
                            name: "Miscellaneous",
                            value: misc,
                        };
                    }
                }
            } else if (parameters.type === "month") {
                const isSingleMonth = dates.from === dates.to;
                const promises = [];
                promises.push(firebaseGet(query(ref(db, `users/${uid}/simple_meter/monthly`),
                    orderByKey(),
                    startAt(dates.from),
                    endAt(dates.to))));
                const [daysSnap] = await Promise.all(promises);
                if (!daysSnap.exists()) {
                    setData("NOT_FOUND");
                    return;
                }
                if (isSingleMonth) dataToSet.lineGraph["Days Breakdown"] = [];
                else dataToSet.lineGraph["Months Breakdown"] = [];
                dataToSet.spiral["Days Breakdown"] = [];
                for (const [_month, _data] of Object.entries(daysSnap.val() || {})) {
                    const month = _month as string;
                    const data = _data as {
                        days: {
                            [key: number]: number
                        },
                        total: number
                    };
                    let total = data.total;
                    for await (const [date, value] of Object.entries(data?.days || {})) {
                        dataToSet.spiral["Days Breakdown"].push({
                            time: dayjs(month + "-" + String(date).padStart(2, "0")).format("DD"),
                            day: dayjs(month).format("MMM, YY"),
                            value
                        });
                        if (isSingleMonth) dataToSet.lineGraph["Days Breakdown"].push({
                            day: dayjs(month + "-" + String(date).padStart(2, "0")).format("DD MMM, YY"),
                            value
                        });
                    }
                    if (!isSingleMonth) dataToSet.lineGraph["Months Breakdown"].push({
                        day: dayjs(month).format("MMM, YY"),
                        value: total
                    });
                }
            } else {
                const isSingleYear = dates.from === dates.to;
                const promises = [];
                promises.push(firebaseGet(query(ref(db, `users/${uid}/simple_meter/yearly`),
                    orderByKey(),
                    startAt(dates.from),
                    endAt(dates.to))));
                const [daysSnap] = await Promise.all(promises);
                if (!daysSnap.exists()) {
                    setData("NOT_FOUND");
                    return;
                }
                if (isSingleYear) dataToSet.lineGraph["Months Breakdown"] = [];
                else dataToSet.lineGraph["Years Breakdown"] = [];
                dataToSet.spiral["Months Breakdown"] = [];
                for (const [_year, _data] of Object.entries(daysSnap.val() || {})) {
                    const year = _year as string;
                    const data = _data as {
                        months: {
                            [key: string]: number
                        },
                        total: number
                    };
                    const months = Object.keys(data?.months || {}).sort((a, b) => +a - +b);
                    let total = data.total;
                    for await (const _month of months) {
                        const month = String(_month).padStart(2, "0");
                        const value = data.months[month];
                        dataToSet.spiral["Months Breakdown"].push({
                            time: dayjs(String(year) + "-" + month, "MM-YYYY").format("MMM, YY"),
                            day: year,
                            value
                        });
                        if (isSingleYear) dataToSet.lineGraph["Months Breakdown"].push({
                            day: dayjs(String(year) + "-" + month, "MM-YYYY").format("MMM, YY"),
                            value
                        });
                    }
                    if (!isSingleYear) dataToSet.lineGraph["Years Breakdown"].push({
                        day: year,
                        value: total
                    });
                }
            }
            setData(dataToSet);
        };
        func();
    }, [parameters, dates, uid, machines, equipments])

    const downloadPDF = async () => {
        if (data === null || data === "NOT_FOUND") return;
        setIsBusy(true);
        if (parameters.type === "day") {
            const tables = {} as {
                [key: string]: string[][]
            };
            const isSingleDay = dates.from === dates.to;
            const daysTable = [[isSingleDay ? "Time" : "Date", "Electricity Consumption"]];
            const breakdownTable = [["Utility", "Electricity Consumption"]];
            const {
                lineGraph,
                distribution
            } = data;
            const key = Object.keys(lineGraph)[0];
            const value = lineGraph[key];
            const highest = {
                name: "",
                value: -Infinity
            };
            const lowest = {
                name: "",
                value: Infinity
            };
            const highestConsumer = {
                name: "",
                value: -Infinity
            };
            const lowestConsumer = {
                name: "",
                value: Infinity
            };
            let total = 0;
            for (const val of value) {
                const { day, value } = val;
                if (value > highest.value) {
                    highest.name = day;
                    highest.value = value;
                }
                if (value < lowest.value) {
                    lowest.name = day;
                    lowest.value = value;
                }
                total += value;
                daysTable.push([
                    val.day,
                    unitFormatter(val.value)
                ]);
            }
            const map: { [key: string]: { name: string, value: number } } = {};
            for (const date of Object.keys(distribution)) {
                const val = distribution[date];
                for (const value of Object.values(val)) {
                    const { name, value: val } = value;
                    if (!map[name]) map[name] = {
                        name,
                        value: 0
                    };
                    map[name].value += val;
                }
            }
            for (const val of Object.values(map)) {
                const { name, value } = val;
                if (value > highestConsumer.value) {
                    highestConsumer.name = name;
                    highestConsumer.value = value;
                }
                if (value < lowestConsumer.value) {
                    lowestConsumer.name = name;
                    lowestConsumer.value = value;
                }
                breakdownTable.push([
                    name,
                    unitFormatter(value)
                ]);
            }
            tables[key] = daysTable;
            tables["Breakdown"] = breakdownTable;
            const avg = total / value.length;
            await landscapePDF({
                filename: `electricity-report(${dayjs(dates.from).format("DD-MM-YYYY")}${isSingleDay ? "" : ` - ${dayjs(dates.to).format("DD-MM-YYYY")}`}).pdf`,
                headings: {
                    left: "Electricity Report",
                    middle: companyName || "Unkown",
                    right: dayjs(dates.from).format("D MMM YYYY") + isSingleDay ? "" : " - " + dayjs(dates.to).format("D MMM YYYY")
                },
                stats: {
                    "TOTAL CONSUMPTION:": unitFormatter(total),
                    "HIGHEST PERFORMANCE:": `${highest.name}\n(${unitFormatter(highest.value)})`,
                    "LOWEST PERFORMANCE:": `${lowest.name}\n(${unitFormatter(lowest.value)})`,
                    "AVERAGE: ": unitFormatter(avg),
                    "HIGHEST CONSUMER": `${highestConsumer.name}\n(${unitFormatter(highestConsumer.value)})`,
                    "LOWEST CONSUMER": `${lowestConsumer.name}\n(${unitFormatter(lowestConsumer.value)})`,
                },
                tables
            });
        } else if (parameters.type === "month") {
            const tables = {} as {
                [key: string]: string[][]
            };
            const isSingleMonth = dates.from === dates.to;
            const daysTable = [[isSingleMonth ? "Date" : "Month", "Electricity Consumption"]];
            const {
                lineGraph,
            } = data;
            const key = Object.keys(lineGraph)[0];
            const value = lineGraph[key];
            const highest = {
                name: "",
                value: -Infinity
            };
            const lowest = {
                name: "",
                value: Infinity
            };
            let total = 0;
            for (const val of value) {
                const { day, value } = val;
                if (value > highest.value) {
                    highest.name = day;
                    highest.value = value;
                }
                if (value < lowest.value) {
                    lowest.name = day;
                    lowest.value = value;
                }
                total += value;
                daysTable.push([
                    val.day,
                    unitFormatter(val.value)
                ]);
            }
            tables[key] = daysTable;
            const avg = total / value.length;
            await landscapePDF({
                filename: `electricity-report(${dates.from}${isSingleMonth ? "" : ` - ${dates.to}`}).pdf`,
                headings: {
                    left: "Electricity Report",
                    middle: companyName || "Unkown",
                    right: dayjs(dates.from, "MM-YYYY").format("MMM YYYY") + isSingleMonth ? "" : " - " + dayjs(dates.to, "MM-YYYY").format("MMM YYYY")
                },
                stats: {
                    "TOTAL CONSUMPTION:": unitFormatter(total),
                    "HIGHEST PERFORMANCE:": `${highest.name}\n(${unitFormatter(highest.value)})`,
                    "LOWEST PERFORMANCE:": `${lowest.name}\n(${unitFormatter(lowest.value)})`,
                    "AVERAGE: ": unitFormatter(avg),
                },
                tables
            });

        } else if (parameters.type === "year") {
            const tables = {} as {
                [key: string]: string[][]
            };
            const isSingleYear = dates.from === dates.to;
            const daysTable = [[isSingleYear ? "Month" : "Year", "Electricity Consumption"]];
            const {
                lineGraph,
            } = data;
            const key = Object.keys(lineGraph)[0];
            const value = lineGraph[key];
            const highest = {
                name: "",
                value: -Infinity
            };
            const lowest = {
                name: "",
                value: Infinity
            };
            let total = 0;
            for (const val of value) {
                const { day, value } = val;
                if (value > highest.value) {
                    highest.name = day;
                    highest.value = value;
                }
                if (value < lowest.value) {
                    lowest.name = day;
                    lowest.value = value;
                }
                total += value;
                daysTable.push([
                    val.day,
                    unitFormatter(val.value)
                ]);
            }
            tables[key] = daysTable;
            const avg = total / value.length;
            await landscapePDF({
                filename: `electricity-report(${dates.from}${isSingleYear ? "" : ` - ${dates.to}`}).pdf`,
                headings: {
                    left: "Electricity Report",
                    middle: companyName || "Unkown",
                    right: dates.from + isSingleYear ? "" : " - " + dates.to
                },
                stats: {
                    "TOTAL CONSUMPTION:": unitFormatter(total),
                    "HIGHEST PERFORMANCE:": `${highest.name}\n(${unitFormatter(highest.value)})`,
                    "LOWEST PERFORMANCE:": `${lowest.name}\n(${unitFormatter(lowest.value)})`,
                    "AVERAGE: ": unitFormatter(avg),
                },
                tables
            });

        }
        setIsBusy(false);
    };

    const downloadExcel = async () => {
        try {
            if (data === null || data === "NOT_FOUND") return;
            setIsBusy(true);
            if (parameters.type === "day") {
                const isSingleDay = dates.from === dates.to;
                const {
                    lineGraph,
                    distribution
                } = data;
                const key = Object.keys(lineGraph)[0];
                const value = lineGraph[key];
                const sections = [] as ExcelSectionType[];
                const daysSection: ExcelSectionType = {
                    mainHeading: key,
                    subHeadings: [isSingleDay ? "Time" : "Date", "Electricity Consumption (kWhr)"],
                    data: [] as ExcelSectionType['data'],
                    footer: ["Total", 0] as ExcelSectionType['footer']
                }
                const breakdownSection: ExcelSectionType = {
                    mainHeading: key,
                    subHeadings: ["Utility", "Electricity Consumption (kWhr)"],
                    data: [] as ExcelSectionType['data'],
                    footer: [] as ExcelSectionType['footer']
                }
                let total = 0;
                for (const val of value) {
                    const { day, value } = val;
                    total += value;
                    daysSection.data.push([
                        day,
                        +(value).toFixed(3)
                    ]);
                }
                daysSection.footer[1] = +(total).toFixed(3);
                const map: { [key: string]: { name: string, value: number } } = {};
                for (const date of Object.keys(distribution)) {
                    const val = distribution[date];
                    for (const value of Object.values(val)) {
                        const { name, value: val } = value;
                        if (!map[name]) map[name] = {
                            name,
                            value: 0
                        };
                        map[name].value += val;
                    }
                }
                for (const val of Object.values(map)) {
                    const { name, value } = val;
                    breakdownSection.data.push([
                        name,
                        +(value).toFixed(3)
                    ]);
                }
                sections.push(daysSection);
                sections.push(breakdownSection);
                await excelDownload({
                    filename: `electricity-report(${dayjs(dates.from).format("DD-MM-YYYY")}${isSingleDay ? "" : ` - ${dayjs(dates.to).format("DD-MM-YYYY")}`}).xlsx`,
                    heading: `Electricity Report (${dayjs(dates.from).format("DD-MM-YYYY")}${isSingleDay ? "" : ` - ${dayjs(dates.to).format("DD-MM-YYYY")}`})`,
                    sections,
                });
            } else if (parameters.type === "month") {
                const isSingleMonth = dates.from === dates.to;
                const {
                    lineGraph,
                } = data;
                const key = Object.keys(lineGraph)[0];
                const value = lineGraph[key];
                const sections = [] as ExcelSectionType[];
                const daysSection: ExcelSectionType = {
                    mainHeading: key,
                    subHeadings: [isSingleMonth ? "Date" : "Month", "Electricity Consumption"],
                    data: [] as ExcelSectionType['data'],
                    footer: ["Total", 0] as ExcelSectionType['footer']
                }
                let total = 0;
                for (const val of value) {
                    const { day, value } = val;
                    total += value;
                    daysSection.data.push([
                        day,
                        unitFormatter(value)
                    ]);
                }
                daysSection.footer[1] = unitFormatter(total);
                sections.push(daysSection);
                await excelDownload({
                    filename: `electricity-report(${dates.from}${isSingleMonth ? "" : ` - ${dates.to}`}).xlsx`,
                    heading: `Electricity Report (${dates.from}${isSingleMonth ? "" : ` - ${dates.to}`})`,
                    sections,
                });
            } else {
                const isSingleYear = dates.from === dates.to;
                const {
                    lineGraph,
                } = data;
                const key = Object.keys(lineGraph)[0];
                const value = lineGraph[key];
                const sections = [] as ExcelSectionType[];
                const daysSection: ExcelSectionType = {
                    mainHeading: key,
                    subHeadings: [isSingleYear ? "Month" : "Year", "Electricity Consumption"],
                    data: [] as ExcelSectionType['data'],
                    footer: ["Total", 0] as ExcelSectionType['footer']
                }
                let total = 0;
                for (const val of value) {
                    const { day, value } = val;
                    total += value;
                    daysSection.data.push([
                        day,
                        unitFormatter(value)
                    ]);
                }
                daysSection.footer[1] = unitFormatter(total);
                sections.push(daysSection);
                await excelDownload({
                    filename: `electricity-report(${dates.from}${isSingleYear ? "" : ` - ${dates.to}`}).xlsx`,
                    heading: `Electricity Report (${dates.from}${isSingleYear ? "" : ` - ${dates.to}`})`,
                    sections,
                });
            }
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
            <Text fontWeight={600}>Electricity Report: <span style={{
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
                    <SimpleGrid
                        w="100%"
                        gap={5}
                        columns={{
                            base: 1,
                            md: 3
                        }}>
                        <GridItem
                            colSpan={{
                                base: 1,
                                md: 2
                            }}>
                            <Graph line={data.lineGraph} />
                        </GridItem>
                        <GridItem>
                            <Spiral data={data.spiral} />
                        </GridItem>
                    </SimpleGrid>
                    {parameters.type === "day" && <Distribute data={data.distribution} />}
                </Flex>
        }
    </Flex>
}

export type { DataToSet }
export default MainelectricityReport