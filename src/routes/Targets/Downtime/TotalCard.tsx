import { CardBody, Flex, Box, Text, CircularProgress, CircularProgressLabel } from "@chakra-ui/react"
import { useMemo } from "react"
import { DateRange } from "react-day-picker"
import MyCard from "../../../Components/micro/Card"
import dayjs from "../../../Components/Functions/dayjs"

const TotalCard = ({
    date,
    title
}: {
    date: DateRange | undefined,
    title: string
}) => {
    const selectedTitle = useMemo(() => {
        if (date === undefined) return "None";
        if (date.from?.toDateString() === date.to?.toDateString()) return dayjs(date.from).format("DD MMM, YY");
        return `${dayjs(date.from).format("DD MMM, YY")} - ${dayjs(date.to).format("DD MMM, YY")}`;
    }, [date]);

    return <MyCard p={0}>
        <CardBody>
            <Flex justifyContent={"space-between"} alignItems={"center"} flexDir="column">
                <Box w="100%">
                    <Text fontWeight={700} fontSize="2xl">{title}</Text>
                    <Text fontWeight={500} fontSize="sm" opacity={0.7}>{selectedTitle}</Text>
                </Box>
                <CircularProgress
                    thickness={"8px"}
                    rounded={"full"}
                    size={"200px"}
                    value={70}
                    // color={
                    //     details.efficiency >= 75 ? "green" :
                    //         details.efficiency >= 50 ? "orange" :
                    //             "red"
                    // }
                    trackColor={"#cccccc40"}
                    capIsRound>
                    <CircularProgressLabel>
                        <Text fontSize={"xl"} fontWeight={600}>{`${70}%`}</Text>
                    </CircularProgressLabel>
                </CircularProgress>
            </Flex>
        </CardBody>
    </MyCard>
}

export default TotalCard