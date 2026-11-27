import {
    Center,
    CenterProps,
    Heading,
    Icon
} from "@chakra-ui/react";
import { IconType } from "react-icons";
import { FiDatabase } from "react-icons/fi";

interface Props extends CenterProps {
    text?: string,
    icon?: IconType
}

const NotFound = ({
    text = "Data not found",
    icon = FiDatabase,
    ...props
}: Props) => {
    return <Center h={"100%"} opacity={0.7} {...props}>
        <Icon as={icon} fontSize={"2xl"} />
        <Heading
            textTransform={"uppercase"}
            ml={2}
            size={"sm"}>{text}</Heading>
    </Center>
}

export default NotFound