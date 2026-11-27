import { Box, Center, Flex, Stack, Text, useToast, VStack } from "@chakra-ui/react"
import dayjs from "../../../../Components/Functions/dayjs";
import { useEffect, useMemo, useState } from "react"
import { FaFileExcel, FaFilePdf } from "react-icons/fa"
import { FiDownload } from "react-icons/fi"
import { RiDeleteBin7Line } from "react-icons/ri"
import capitalize from "../../../../Components/Functions/formatters/capitalize"
import ConfirmDialog from "../../../../Components/micro/ConfirmDialog"
import MyPopover from "../../../../Components/micro/MyPopover"
import { endAt, orderByKey, query, ref, startAt, get as firebaseGet } from "firebase/database"
import { Option, ReportParametrsType } from "../../Selector/types"
import { db } from "../../../../Components/firebase"
import Get from "../../../../Components/Store/hooks/Get"
import Listen from "../../../../Components/Store/hooks/Listen"
import { factoriesAtom, machinesAtom, selectedFactoryAtom, uidAtom } from "../../../../Components/Store/atoms"
import { getScopedAssetMap } from "../../../../Services/rbac"
import MyCard from "../../../../Components/micro/Card"
import { SmallFill } from "../../../../Components/Loaders"
import NotFound from "../../../../Components/micro/NotFound"
import { NameVal, viewAll } from "../FactoryReport/Machine/MachineBreakdown/PieChart"
import Total from "./Total"
import Distribution from "./Distribution"
import landscapePDF from "../../../../Components/Exporters/landscapePDF"
import excelDownload, { ExcelSectionType } from "../../../../Components/Exporters/excelDownload"

interface DataToSet {
    total: number;
    dailyInsights: {
        most: NameVal;
        least: NameVal;
        dailyAvg: number;
    };
    breakdownInsights: {
        most: NameVal;
        least: NameVal;
    };
    breakdown: NameVal[],
    lineChart: NameVal[],
    column: {
        day: string;
        item: string;
        value: number;
    }[];
    snakey: {
        source: string;
        target: string;
        value: number;
    }[]
}

const MaterialReport = ({
    parameters
}: {
    parameters: ReportParametrsType["material"]
}) => {
    const toast = useToast();
    const [isBusy, setIsBusy] = useState(false);
    const [data, setData] = useState<null | DataToSet | "NOT_FOUND">(null);
    const [selectedTitle, reportType] = useMemo(() => {
        const date = parameters.date.from?.toDateString() === parameters.date.to?.toDateString() ? dayjs(parameters.date.from).format("DD MMM, YY") : `${dayjs(parameters.date.from).format("DD MMM, YY")} - ${dayjs(parameters.date.to).format("DD MMM, YY")}`;
        const data = {
            first: capitalize((parameters.option as Option)?.label || ""),
            second: `${(parameters.secondaryOption as Option).label} | ${date}`
        };
        const reportType = (parameters.option as Option)?.value as "machine" | "material";
        return [`By ${data.first} | ${data.second}`, reportType];
    }, [parameters]);
    const uid = Get(uidAtom);
    const machines = Get(machinesAtom);
    const factories = Listen(factoriesAtom);
    const selectedFactory = Listen(selectedFactoryAtom);

    useEffect(() => {
        if (!uid || !machines || !factories || !selectedFactory) return;
        const mySelectedFactory = (factories as any)[selectedFactory.value];
        const scopedMachines = getScopedAssetMap(machines, mySelectedFactory, "machines");
        const func = async () => {
            setData(null);
            const dataToSet: DataToSet = {
                total: 0,
                dailyInsights: {
                    most: {
                        name: "",
                        value: -Infinity
                    },
                    least: {
                        name: "",
                        value: Infinity
                    },
                    dailyAvg: 0
                },
                breakdownInsights: {
                    most: {
                        name: "",
                        value: -Infinity
                    },
                    least: {
                        name: "",
                        value: Infinity
                    }
                },
                breakdown: [],
                lineChart: [],
                column: [],
                snakey: []
            }
            const dates = [
                dayjs(parameters.date.from).format("YYYY-MM-DD"),
                dayjs(parameters.date.to).format("YYYY-MM-DD"),
            ];
            // const isSingleDay = dates[0] === dates[1];
            const reportType = (parameters.option as Option)?.value as "machine" | "material";
            const option = (parameters.secondaryOption as Option)?.value;
            const promises = [];
            promises.push(
                firebaseGet(
                    query(
                        ref(db, `users/${uid}/materials/stats`),
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
            const breakdown: {
                [key: string]: NameVal;
            } = {};
            for (const date in data) {
                let total = 0;
                const dayBreakdown: {
                    [key: string]: NameVal;
                } = {};
                const dateData = data[date] as {
                    [key: string]: {
                        [key: string]: number;
                    }
                };
                for (const materialName in dateData) {
                    const materialData = dateData[materialName];
                    if (reportType === "material") {
                        if (option !== materialName) continue;
                    }
                    for (const [machineID, v] of Object.entries(materialData)) {
                        if (!scopedMachines[machineID]) continue;
                        if (reportType === "machine" && option !== machineID) continue;
                        const value = v * 1000;
                        total += value;
                        if (reportType === "machine") {
                            if (dayBreakdown[materialName] === undefined) dayBreakdown[materialName] = {
                                name: materialName.toUpperCase(),
                                value: 0
                            };
                            dayBreakdown[materialName].value += value;
                            if (breakdown[materialName] === undefined) breakdown[materialName] = {
                                name: materialName.toUpperCase(),
                                value: 0
                            };
                            breakdown[materialName].value += value;
                        } else {
                            if (dayBreakdown[machineID] === undefined) dayBreakdown[machineID] = {
                                name: scopedMachines[machineID],
                                value: 0
                            };
                            dayBreakdown[machineID].value += value;
                            if (breakdown[machineID] === undefined) breakdown[machineID] = {
                                name: scopedMachines[machineID],
                                value: 0
                            };
                            breakdown[machineID].value += value;
                        }
                    }
                }
                dataToSet.lineChart.push({
                    name: dayjs(date).format("DD MMM, YY"),
                    value: total
                });
                dataToSet.dailyInsights.dailyAvg += total;
                if (total > dataToSet.dailyInsights.most.value) {
                    dataToSet.dailyInsights.most.name = dayjs(date).format("DD MMM, YY");
                    dataToSet.dailyInsights.most.value = total;
                }
                if (total < dataToSet.dailyInsights.least.value) {
                    dataToSet.dailyInsights.least.name = dayjs(date).format("DD MMM, YY");
                    dataToSet.dailyInsights.least.value = total;
                }
                for (const data of Object.values(dayBreakdown)) {
                    const { name, value } = data;
                    dataToSet.total += value;
                    dataToSet.column.push({
                        day: dayjs(date).format("DD MMM, YY"),
                        item: name,
                        value
                    });
                }
            }
            if (dataToSet.total === 0) {
                setData("NOT_FOUND");
                return;
            }
            if (dataToSet.lineChart.length > 0) {
                dataToSet.dailyInsights.dailyAvg /= dataToSet.lineChart.length;
            }
            for (const value of Object.values(breakdown)) {
                dataToSet.breakdown.push(value);
                if (value.value > dataToSet.breakdownInsights.most.value)
                    dataToSet.breakdownInsights.most = value;
                if (value.value < dataToSet.breakdownInsights.least.value)
                    dataToSet.breakdownInsights.least = value;
                if (reportType === "material") dataToSet.snakey.push({
                    source: option.toUpperCase(),
                    target: value.name,
                    value: value.value
                });
                else dataToSet.snakey.push({
                    source: value.name,
                    target: scopedMachines[option] || machines[option],
                    value: value.value
                });
            }
            setData(dataToSet);
        }
        func();
    }, [parameters, uid, machines, factories, selectedFactory]);

    const downloadPDF = async () => {
        if (data === null || data === "NOT_FOUND") return;
        setIsBusy(true);
        const tables = {} as {
            [key: string]: string[][]
        };
        const breakdownTable = [[reportType === "machine" ? "Machine" : "Material", "Consumption"]];
        const dailyTable = [["Date", "Consumption"]];
        const {
            breakdown,
            lineChart,
            dailyInsights,
            breakdownInsights,
            total
        } = data;
        for (const { name, value } of breakdown) breakdownTable.push([name, viewAll(value, "material")]);
        for (const { name, value } of lineChart) dailyTable.push([name, viewAll(value, "material")]);
        tables["Breakdown"] = breakdownTable;
        tables["Daily"] = dailyTable;
        const dates = [
            dayjs(parameters.date.from).format("YYYY-MM-DD"),
            dayjs(parameters.date.to).format("YYYY-MM-DD"),
        ];
        const isSingleDay = dates[0] === dates[1];
        // remove the date from the title
        const title = selectedTitle.split(" | ").slice(0, -1).join(" | ");
        const consumer = reportType === "machine" ? "CONSUMED" : "CONSUMER";
        await landscapePDF({
            filename: `material-report(${dayjs(dates[0]).format("DD-MM-YYYY")}${isSingleDay ? "" : ` - ${dayjs(dates[1]).format("DD-MM-YYYY")}`}).pdf`,
            headings: {
                left: "Electricity Report",
                middle: title,
                right: dayjs(dates[0]).format("D MMM YYYY") + (isSingleDay ? "" : " - " + dayjs(dates[1]).format("D MMM YYYY"))
            },
            stats: {
                "TOTAL": viewAll(total, "material"),
                "DAILY AVERAGE": viewAll(dailyInsights.dailyAvg, "material"),
                "MOST CONSUMED DAY": `${dailyInsights.most.name} (${viewAll(dailyInsights.most.value, "material")})`,
                "LEAST CONSUMED DAY": `${dailyInsights.least.name} (${viewAll(dailyInsights.least.value, "material")})`,
                [`MOST ${consumer}` as string]: `${breakdownInsights.most.name} (${viewAll(breakdownInsights.most.value, "material")})`,
                [`LEAST ${consumer}` as string]: `${breakdownInsights.least.name} (${viewAll(breakdownInsights.least.value, "material")})`,
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
            const breakdownSection: ExcelSectionType = {
                mainHeading: "Breakdown",
                subHeadings: [reportType === "machine" ? "Machine" : "Material", "Consumption (KGs)"],
                data: [] as ExcelSectionType['data'],
                footer: ["Total", 0] as ExcelSectionType['footer']
            }
            const daysSection: ExcelSectionType = {
                mainHeading: "Daily",
                subHeadings: ["Date", "Consumption (KGs)"],
                data: [] as ExcelSectionType['data'],
                footer: ["Total", 0] as ExcelSectionType['footer']
            };
            const {
                breakdown,
                lineChart,
                total
            } = data;
            for (const { name, value } of breakdown) breakdownSection.data.push([name, +(value / 1000).toFixed(2)]);
            for (const { name, value } of lineChart) daysSection.data.push([name, +(value / 1000).toFixed(2)]);
            breakdownSection.footer[1] = +(total / 1000).toFixed(2);
            daysSection.footer[1] = +(total / 1000).toFixed(2);
            sections.push(breakdownSection);
            sections.push(daysSection);
            const dates = [
                dayjs(parameters.date.from).format("YYYY-MM-DD"),
                dayjs(parameters.date.to).format("YYYY-MM-DD"),
            ];
            const isSingleDay = dates[0] === dates[1];
            const title = selectedTitle.split(" | ").slice(0, -1).join(" | ") + " | " + dayjs(dates[0]).format("D MMM YYYY") + (isSingleDay ? "" : " - " + dayjs(dates[1]).format("D MMM YYYY"));
            await excelDownload({
                filename: `material-report(${dayjs(dates[0]).format("DD-MM-YYYY")}${isSingleDay ? "" : ` - ${dayjs(dates[1]).format("DD-MM-YYYY")}`}).xlsx`,
                heading: title,
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
            <Text fontWeight={600}>Material Consumption Report: <span style={{
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
                    <Total total={data.total} line={data.lineChart} insights={data.dailyInsights} breakdown={data.breakdown} />
                    <Distribution snakey={data.snakey} column={data.column} insights={data.breakdownInsights} reportType={reportType} />
                </Flex>
        }
    </Flex>
}

export default MaterialReport