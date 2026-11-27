import { Flex, Icon, Skeleton, Text } from "@chakra-ui/react";
import { IconType } from "react-icons";
import MyCard from "../../../Components/micro/Card";

const StatBlock = ({
    title,
    value,
    change,
    icon,
    loading
}: {
    title: string;
    value: JSX.Element;
    change: number;
    icon: IconType;
    loading: boolean;
}) => {
    if (loading) return <LoadingState icon={icon} />
    return <MyCard p={4}>
        <Flex gap={5} alignItems="center">
            <Icon
                fontSize={"3xl"}
                opacity={0.8}
                as={icon} />
            <Flex flexDir={"column"} w="100%">
                <Flex justifyContent={"space-between"}>
                    <Text fontSize="2xl" fontWeight={600}>{value}</Text>
                    {change >= 0 ? <Text fontSize="sm" fontWeight={700} color="green.400">+{change}%</Text>
                        : <Text fontSize="sm" fontWeight={700} color="red.400">{change}%</Text>}
                </Flex>
                <Text opacity={0.8} textTransform="uppercase" fontWeight={600} fontSize="xs">{title}</Text>
            </Flex>
        </Flex>
    </MyCard>
}

const LoadingState = ({
    icon
}: {
    icon: IconType;
}) => {

    return <MyCard p={4}>
        <Flex gap={5} alignItems="center">
            <Icon
                fontSize={"3xl"}
                opacity={0.8}
                as={icon} />
            <Flex flexDir={"column"} w="100%" gap={3}>
                <Flex justifyContent={"space-between"}>
                    <Skeleton height={8} width={20} />
                    <Skeleton height={5} width={10} />
                </Flex>
                <Skeleton height={5} width={20} />
            </Flex>
        </Flex>
    </MyCard>
}

export default StatBlock