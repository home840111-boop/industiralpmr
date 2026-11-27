import { Flex, Text, useColorMode, Icon, GridItem } from "@chakra-ui/react";
import { useMemo } from "react";
import { IconType } from "react-icons";

const StatsBlock = ({
    title,
    value,
    icon,
    span
}: {
    title: string;
    value: JSX.Element | string | number;
    icon: IconType,
    span?: number
}) => {
    const { colorMode } = useColorMode();
    const { border } = useMemo(() => ({
        border: `${colorMode}.border`
    }), [colorMode]);

    return <Flex h="100%" as={GridItem} colSpan={span} px={3} py={4} border="1px solid" borderColor={border} justifyContent="space-between" flexDirection="column">
        <Flex w="100%" alignItems="center" justifyContent="space-between">
            <Text fontSize="md" fontWeight={500} opacity={0.8}>{title}</Text>
            <Icon
                fontSize={"2xl"}
                opacity={0.8}
                as={icon} />
        </Flex>
        <Text fontSize="2xl" fontWeight={600}>
            {value}
        </Text>
    </Flex>
}

export default StatsBlock;