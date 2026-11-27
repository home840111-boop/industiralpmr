import { Flex, Text, Icon } from "@chakra-ui/react";
import { BiBellOff } from "react-icons/bi";

const None = ({
    noWhat = "Notifications"
}: {
    noWhat?: string
}) => {
    return <Flex
        p={2}
        gap={2}
        flexDir={"column"}
        justifyContent={"center"}
        alignItems={"center"}>
        <Icon
            fontSize="40px"
            as={BiBellOff} />
        <Text fontSize={"xl"} ml={2} fontWeight={600}>No {noWhat}</Text>
    </Flex>
};

export default None;