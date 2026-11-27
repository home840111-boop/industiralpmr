import { Box, BoxProps, Flex, Heading, Text, Icon, IconButton } from "@chakra-ui/react";
import { IconType } from "react-icons";
import { FaCheck } from "react-icons/fa";
import ConfirmDialog from "../../../Components/micro/ConfirmDialog";
import SinceTime from "../../../Components/micro/SinceTime";

interface NotificationProp {
    id: number | string,
    title: string,
    description: string,
    icon: IconType,
    time?: number,
    loader?: boolean,
    loaderVal?: number,
    ack?: () => void
}
interface Prop extends BoxProps {
    notification: NotificationProp,
    color: string,
    update: () => void
}
const Notification = ({
    notification,
    color,
    update,
    ...props
}: Prop) => {
    return <Box
        _notLast={{
            borderBottom: '1px solid',
            borderColor: color
        }}
        p={2}
        {...props}>
        <Flex gap={3} alignItems={"flex-start"}>
            <Icon
                as={notification.icon}
                mt={2}
                mr={2}
                fontSize="20px" />
            <Box>
                <Heading
                    size="xs"
                    mb={1}>{notification.title}</Heading>
                <Text fontSize="sm">{notification.description}</Text>
                {notification.time && <SinceTime
                    mt={1}
                    opacity={0.8}
                    fontSize="sm"
                    since={notification.time}
                    textPrefix={"since: "}
                    textSuffix={""}
                    tooltipPrefix={"Time: "} />}
            </Box>
            {notification.ack && <Box display="block" my="auto">
                <ConfirmDialog scope="normal" onConfirm={() => {
                    notification.ack?.();
                    update();
                }}>
                    <IconButton size="sm" aria-label="ack" icon={<FaCheck />} />
                </ConfirmDialog>
            </Box>
            }
        </Flex >
    </Box >
};

export default Notification;