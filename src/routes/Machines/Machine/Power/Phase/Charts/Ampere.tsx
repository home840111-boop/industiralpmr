import { Line } from "@ant-design/plots"
import { Box, Flex, Text, VStack } from "@chakra-ui/react";
import StatBox from "./StatBox";

const Ampere = ({
    data,
    today
}: {
    data: {
        time: string;
        value: number;
        type: string;
    }[],
    today: {
        min: number,
        max: number,
        avg: number
    }
}) => {
    const config = {
        range: [0, 1],
        data,
        xField: 'time',
        yField: 'value',
        seriesField: 'type',
    };

    return <Box px={4}>
        <Text fontWeight={500} fontSize="md" opacity={0.9} textAlign="center" py={2} textDecor="underline">Ampere</Text>
            
        <Flex w="100%" alignItems={"flex-start"} justifyContent="space-between" gap={4}>
            <Box w="100%">
                <Line
                    tooltip={{
                        title: 'time',
                        formatter: (datum) => ({ name: datum.type, value: `${datum.value.toFixed(2)} A` }),
                    }}
                    animation={false}
                    yAxis={{
                        label: {
                            formatter: (v) => `${v} A`
                        }
                    }}
                    legend={{
                        position: "bottom"
                    }}
                    height={260}
                    color="lightblue"
                    {...config} />
            </Box>
            <VStack h="100%">
                <StatBox title="Max" value={`${today.max.toFixed(2)}A`} />
                <StatBox title="Avg" value={`${today.avg.toFixed(2)}A`} />
                <StatBox title="Min" value={`${today.min.toFixed(2)}A`} />
            </VStack>
        </Flex>
    </Box>
}

export default Ampere