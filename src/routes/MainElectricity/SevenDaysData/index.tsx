import { CardBody, CardHeader, Center, Flex, Heading, Text, useColorMode, VStack } from "@chakra-ui/react"
import { useEffect, useMemo, useState } from "react";
import MyCard from "../../../Components/micro/Card"
import Chart from "./Chart";
import dayjs from "../../../Components/Functions/dayjs";
import { get } from "../../../Components/firebase/api/db";
import Get from "../../../Components/Store/hooks/Get";
import { dateAtom } from "../../../Components/Store/atoms";
import unitFormatter from "../../../Components/Functions/formatters/unitFormatter";
import { SmallFill } from "../../../Components/Loaders";

interface Data {
    time: string,
    day: string,
    value: number,
}

const SevenDaysData = ({
    hasMeter
}: {
    hasMeter: boolean | null;
}) => {
    const { colorMode } = useColorMode();
    const { border } = useMemo(() => ({
        border: `${colorMode}.border`
    }), [colorMode]);
    const [data, setData] = useState<Data[] | null>(null);
    const _ = Get(dateAtom);

    useEffect(() => {
        if (!_ || hasMeter === null) return;
        const func = async () => {
            const _data: Data[] = [];
            const promises = [];
            if (hasMeter) for (let i = 0; i < 7; i++) {
                const date = dayjs().subtract(i, "day").format("YYYY-MM-DD");
                promises.push(get(`simple_meter/daily/${date}`));
            }
            const results = await Promise.all(promises);
            if (hasMeter) for await (const result of results) {
                const data = result.val() || {};
                for await (const _hour of Object.values(data?.hours || {})) {
                    const hour = _hour as any;
                    _data.push({
                        time: dayjs("1970-01-01 " + hour.time.split(" - ")[0]).format("ha"),
                        day: dayjs(result.key).format("D MMM"),
                        value: hour.value
                    });
                }
            }
            else {
                for (let i = 0; i < 7; i++) {
                    const date = dayjs().subtract(i, "day").format("YYYY-MM-DD");
                    for (let j = 0; j < 24; j++) {
                        _data.push({
                            time: dayjs("1970-01-01 " + j + ":00").format("ha"),
                            day: dayjs(date).format("D MMM"),
                            value: Math.random() * 1000
                        });
                    }
                }
            }
            setData(_data);
        };

        func();
    }, [_, hasMeter]);

    const total = useMemo(() => {
        if (!data) return 0;
        return data.reduce((acc, cur) => acc + cur.value, 0);
    }, [data])

    return <MyCard
        h="100%"
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
                size="sm">Last Seven Days</Heading>
        </CardHeader>
        <CardBody px={0}>
            {data === null ? <Center h="100%">
                <SmallFill />
            </Center> : <VStack w="100%" gap={5}>
                <Text fontSize="lg" fontWeight={500} textDecor={"underline"}>Total: <span style={{
                    fontWeight: 700,
                }}>{unitFormatter(total)}</span></Text>
                <Chart data={data} />
            </VStack>}
        </CardBody>
    </MyCard>
}

export type { Data }
export default SevenDaysData