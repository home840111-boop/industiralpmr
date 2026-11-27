import { Center, CircularProgress, CircularProgressLabel, Text } from "@chakra-ui/react";

const HumidityChart = ({
    humidity
}: {
    humidity: number;
}) => {

    return <Center>
        <CircularProgress
            my={2}
            thickness={"8px"}
            rounded={"full"}
            size={"200px"}
            value={humidity}
            color={"blue.200"}
            trackColor={"#cccccc40"}
            capIsRound>
            <CircularProgressLabel>
                <Text fontSize={"xl"} fontWeight={700}>
                    {humidity.toFixed(2)}%
                </Text>
                <Text opacity={0.8} fontSize={"xs"} fontWeight={600}>
                    Humidity
                </Text>
            </CircularProgressLabel>
        </CircularProgress>
    </Center>
}

export default HumidityChart