import { CardBody, CardHeader, Center, Flex, GridItem, Heading, Text, useColorMode, VStack } from "@chakra-ui/react";
import { useEffect, useMemo, useState } from "react";
import { SmallFill } from "../../../Components/Loaders";
import MyCard from "../../../Components/micro/Card";
import { dateAtom } from "../../../Components/Store/atoms";
import Get from "../../../Components/Store/hooks/Get";
import dayjs from "../../../Components/Functions/dayjs";
import { get } from "../../../Components/firebase/api/db";
import unitFormatter from "../../../Components/Functions/formatters/unitFormatter";
import MonthsChart from "./MonthsChart";
import MonthsWithDaysChart from "./MonthsWithDaysChart";

interface RawData {
    total: number;
    month: string;
    days: {
        [key: number]: number;
    }
}

interface MonthsChartData {
    monthKey: string,
    month: string,
    value: number,
}

interface MonthsWithDaysChartData {
    month: string,
    day: string,
    value: number,
}

const SixMonthsData = ({
    hasMeter
}: {
    hasMeter: boolean | null;
}) => {
    const [rawData, setRawData] = useState<RawData[] | null>(null);
    const { colorMode } = useColorMode();
    const { border } = useMemo(() => ({
        border: `${colorMode}.border`
    }), [colorMode]);
    const _ = Get(dateAtom);
    const loading = rawData === null;

    useEffect(() => {
        if (!_ || hasMeter === null) return;
        const func = async () => {
            const _data: RawData[] = [];
            const promises = [];
            if (hasMeter) for (let i = 0; i < 7; i++) {
                const month = dayjs().subtract(i, "month").format("YYYY-MM");
                promises.push(get(`simple_meter/monthly/${month}`));
            }
            const results = await Promise.all(promises);
            if (hasMeter) for await (const [index, result] of results.entries()) {
                const month = dayjs().subtract(index, "month").format("YYYY-MM");
                const data = result.val() || {};
                _data.push({
                    total: data.total || 0,
                    days: data.days || {},
                    month
                });
            } else {
                for (let i = 0; i < 7; i++) {
                    const month = dayjs().subtract(i, "month").format("YYYY-MM");
                    const days = {} as any;
                    for (let j = 1; j <= dayjs(month).daysInMonth(); j++) days[j] = Math.random() * 100;
                    _data.push({
                        total: Math.random() * 1000,
                        days,
                        month
                    });
                }
            }
            setRawData(_data);
        };

        func();
    }, [_, hasMeter]);

    const monthsChartData: MonthsChartData[] = useMemo(() => {
        if (!rawData) return [];
        const _data: MonthsChartData[] = rawData.map((data) => {
            const { total, month } = data;
            return {
                monthKey: month,
                month: dayjs(month).format("MMM"),
                value: total
            }
        });
        return _data;
    }, [rawData]);

    const monthsWithDaysChartData: MonthsWithDaysChartData[] = useMemo(() => {
        if (!rawData) return [];
        const _data: MonthsWithDaysChartData[] = [];
        rawData.forEach((data) => {
            const { days, month } = data;
            for (let i = 1; i <= 31; i++) {
                const value = days[i] || 0;
                const formattedMonth = dayjs(month).format("MMM");
                _data.push({
                    month: formattedMonth,
                    day: String(i).padStart(2, "0"),
                    value: value
                });
            }
        });
        return _data;
    }, [rawData]);

    const total = useMemo(() => {
        if (!monthsChartData) return 0;
        return monthsChartData.reduce((acc, cur) => acc + cur.value, 0);
    }, [monthsChartData]);

    return <>
        <GridItem>
            <MyCard
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
                        size="sm">Last Six Months</Heading>
                </CardHeader>
                <CardBody h={"100%"} minHeight="500px">
                    {loading ? <Center h="100%">
                        <SmallFill />
                    </Center> : <VStack w="100%">
                        <Text
                            fontSize="lg"
                            fontWeight={500}
                            textDecor={"underline"}>Total: <span style={{
                                fontWeight: 700,
                            }}>{unitFormatter(total)}</span></Text>
                        <MonthsChart data={monthsChartData} />
                    </VStack>}
                </CardBody>
            </MyCard>
        </GridItem>
        <GridItem
            colSpan={{
                base: 1,
                md: 2
            }}>
            <MyCard
                h={"100%"}
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
                        size="sm">Last Six Months Days Breakdown</Heading>
                </CardHeader>
                <CardBody h={"100%"}>
                    {loading ? <Center h="100%">
                        <SmallFill />
                    </Center> : <MonthsWithDaysChart data={monthsWithDaysChartData} />}
                </CardBody>
            </MyCard>
        </GridItem>
    </>
}

export type { MonthsChartData, MonthsWithDaysChartData }
export default SixMonthsData;