import { Badge, Flex, Heading, Text } from "@chakra-ui/react"
import MyCard from "../../../Components/micro/Card"
import NumberFormatter from "../../../Components/micro/NumberFormatter"
import { DataToSet } from "./fetch"

const UnitsProduced = ({
    duration,
    unitsProduced
}: {
    duration: string,
    unitsProduced?: DataToSet["unitsProduced"]
}) => {

    return <MyCard p={4}>
        <Heading size="md" fontWeight={600}>
            Units Produced
        </Heading>
        <Text fontSize="xs">{duration}</Text>
        <Flex mt={5} flexDir={"column"} gap={3} alignItems="center" justifyContent={"space-between"}>
            <Flex flexDir={"row"} w="100%" alignItems={"center"} justifyContent="space-between">
                <NumberFormatter number={unitsProduced?.current || 0} suffix="pc(s)" fontSize={"3xl"} fontWeight={600} />
                <NumberFormatter number={unitsProduced?.current || 0} suffix="pc(s)" fontSize={"3xl"} fontWeight={600} />
            </Flex>
            <Flex flexDir={"row"} w="100%" alignItems={"center"} justifyContent="space-between">
                <NumberFormatter number={unitsProduced?.total || 0} suffix="pc(s)" fontSize={"3xl"} fontWeight={600} />
                <Badge colorScheme={unitsProduced?.progress || 0 >= 70 ? "green" : unitsProduced?.progress || 0 >= 50 ? "orange" : "red"}>
                    {(unitsProduced?.progress || 0).toFixed(2)}%
                </Badge>
            </Flex>
        </Flex>
    </MyCard>
}

export default UnitsProduced