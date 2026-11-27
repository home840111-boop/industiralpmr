import { CardBody, HStack, Text, VStack, Icon, useColorMode, ColorProps, Skeleton } from "@chakra-ui/react"
import { useMemo } from "react"
import { IconType } from "react-icons"
import MyCard from "../../../../Components/micro/Card"
import NumberFormatter from "../../../../Components/micro/NumberFormatter"
import WeightFormatter from "../../../../Components/micro/WeightFormatter"

const Stat = ({
    loading,
    title,
    value,
    icon,
    type = "number",
    color = "orange.300"
}: {
    loading: boolean,
    title: string,
    value: number,
    icon: IconType,
    type?: "number" | "weight",
    color?: ColorProps["color"]
}) => {
    const { colorMode } = useColorMode();
    const { bgColor } = useMemo(() => {
        return {
            bgColor: `${colorMode}.navBG`,
        }
    }, [colorMode]);

    if (loading) return <MyCard p={0}>
        <CardBody>
            <HStack gap={5}>
                <Icon
                    borderRadius="lg"
                    p={3}
                    color={bgColor}
                    bgColor={color}
                    fontSize={"5xl"}
                    as={icon} />
                <VStack gap={5} alignItems={"flex-start"}>
                    <Skeleton h="10px" w="150px" />
                    <Skeleton h="20px" w="100px" />
                </VStack>
            </HStack>
        </CardBody>
    </MyCard>

    return <MyCard p={0}>
        <CardBody>
            <HStack gap={5}>
                <Icon
                    borderRadius="lg"
                    p={3}
                    color={bgColor}
                    bgColor={color}
                    fontSize={"5xl"}
                    as={icon} />
                <VStack gap={0} alignItems={"flex-start"}>
                    <Text fontSize="lg" fontWeight={500} opacity={0.8}>{title}</Text>
                    <Text fontSize="xl" fontWeight={600}>{
                        type === "number" ?
                            <NumberFormatter number={value} />
                            : <WeightFormatter number={value} />}</Text>
                </VStack>
            </HStack>
        </CardBody>
    </MyCard>
}

export default Stat