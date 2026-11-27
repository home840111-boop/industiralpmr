import { CardBody, CardHeader, Flex, Heading, Text, useColorMode, VStack } from "@chakra-ui/react"
import { useMemo } from "react"
import { DataToSet } from "."
import MyCard from "../../../../Components/micro/Card"
import Chart from "../../../MainElectricity/SevenDaysData/Chart"
import unitFormatter from "../../../../Components/Functions/formatters/unitFormatter";

const Spiral = ({
    data
}: {
    data: DataToSet["spiral"]
}) => {
    const { colorMode } = useColorMode();
    const { border } = useMemo(() => ({
        border: `${colorMode}.border`
    }), [colorMode]);
    const [key, value] = useMemo(() => {
        const key = Object.keys(data)[0];
        const value = data[key];
        return [key, value];
    }, [data]);

    const total = useMemo(() => {
        if (!value) return 0;
        return value.reduce((acc, cur) => acc + cur.value, 0);
    }, [value]);

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
                size="sm">{key}</Heading>
        </CardHeader>
        <CardBody px={0}>
            <VStack w="100%" gap={5}>
                <Text fontSize="lg" fontWeight={500} textDecor={"underline"}>Total: <span style={{
                    fontWeight: 700,
                }}>{unitFormatter(total)}</span></Text>
                <Chart data={value} />
            </VStack>
        </CardBody>
    </MyCard>
}

export default Spiral