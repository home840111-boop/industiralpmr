import { Box, Flex, Progress, Text, useColorMode } from "@chakra-ui/react"
import dayjs from "../../../../Components/Functions/dayjs";
import { useMemo } from "react"
import { EnvironmentData } from ".."

const Temperature = ({
    date,
    temperature
}: {
    date: string,
    temperature: EnvironmentData["today"]["temperature"]
}) => {
    const { colorMode } = useColorMode();
    const { BG } = useMemo(() => ({
        BG: `${colorMode}.bg`
    }), [colorMode]);
    const color: "red" | "green" | "orange" = useMemo(() => {
        return temperature.avg > 45 ? "red" : temperature.avg < 35 ? "green" : "orange";
    }, [temperature]);

    return <Flex bgColor={BG} my={5} p={3} borderRadius={"5px"} flexDir={"column"} gap={2}>
        <Flex alignItems={"center"} justifyContent="space-between">
            <Box>
                <Text fontWeight={500}>
                    {/* if date is today or yesterday, show today/yesterday else show week day */}
                    {dayjs(date).isSame(dayjs(), "day") ? "Today" :
                        dayjs(date).isSame(dayjs().subtract(1, "day"), "day") ? "Yesterday" :
                            dayjs(date).format("dddd")}
                </Text>
                <Text fontSize="sm" opacity={0.8}>{dayjs(date).format("DD MMM")}</Text>
            </Box>
            <Text fontWeight={400} fontSize="2xl">
                {temperature.avg?.toFixed(2)}°
            </Text>
            <Box>
                <Text fontSize="sm" opacity={0.8}>Max: <span style={{
                    fontWeight: 500,
                    opacity: 1
                }}>{temperature.max.toFixed(2)}°</span></Text>
                <Text fontSize="sm" opacity={0.8}>Min: <span style={{
                    fontWeight: 500,
                    opacity: 1
                }}>{temperature.min.toFixed(2)}°</span></Text>
            </Box>
        </Flex>
        <Progress colorScheme={color} h="5px" value={temperature.avg} />
    </Flex>
}

export default Temperature