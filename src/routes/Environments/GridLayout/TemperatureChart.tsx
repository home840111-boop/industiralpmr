import { Flex, Progress, Text } from "@chakra-ui/react";

const TemperatureChart = ({
    temperature
}: {
    temperature: number;
}) => {
    return <Flex px={5} w="100%" alignItems={"center"} gap={3}>
        <Progress
            w="100%"
            size="lg"
            borderRadius={'md'}
            colorScheme={
                temperature > 40 ? "red"
                    : temperature > 30 ? "orange"
                        : temperature > 20 ? "yellow"
                            : temperature > 10 ? "green"
                                : "blue"
            }
            value={temperature}
        />
        <Text fontSize="md" fontWeight="bold">{temperature.toFixed(2)}℃</Text>
    </Flex>
}

export default TemperatureChart