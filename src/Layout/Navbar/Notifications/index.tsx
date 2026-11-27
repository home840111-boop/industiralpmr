import {
    PopoverTrigger,
    Popover,
    PopoverContent,
    Stack,
    IconButton,
    Flex,
    Tabs,
    TabList,
    Tab,
    TabPanels,
    TabPanel,
    Heading,
    Tag,
    useBreakpointValue,
    AvatarBadge,
    Avatar,
    useColorMode
} from "@chakra-ui/react"
import { useMemo, useState, Suspense, useEffect } from "react";
import { IconType } from "react-icons";
import { BiBell } from "react-icons/bi";
import { selectedFactoryAtom, uidAtom } from "../../../Components/Store/atoms";
import Listen from "../../../Components/Store/hooks/Listen";
import fetch from "./fetch";
import Notification from "./Notification";
import None from "./None";

interface NotificationProp {
    id: number | string,
    title: string,
    description: string,
    icon: IconType,
    time?: number,
    loader?: boolean,
    loaderVal?: number
}
const Notifications = () => {
    const { colorMode } = useColorMode();
    const { color, hoverBG, hoverColor, popoverContentBgColor, border, navBG } = useMemo(() => {
        return {
            color: `${colorMode}.navText`,
            hoverBG: `${colorMode}.hoverBG`,
            hoverColor: `${colorMode}.hoverColor`,
            popoverContentBgColor: `${colorMode}.popoverContentBgColor`,
            navBG: `${colorMode}.navBG`,
            border: `${colorMode}.border`
        }
    }, [colorMode]);
    const [errors, setErrors] = useState<NotificationProp[]>([]);
    const [alerts, setAlerts] = useState<NotificationProp[]>([]);
    const [notifications, setNotifications] = useState<NotificationProp[]>([]);
    const [refresh, setRefresh] = useState(false);
    const uid = Listen(uidAtom);
    const selectedFactory = Listen(selectedFactoryAtom);

    const update = () => {
        setRefresh(prev => !prev);
    }

    useEffect(() => {
        if (!uid) return;
        fetch().then(({ errors, alerts, notifications }) => {
            setErrors(errors);
            setAlerts(alerts);
            setNotifications(notifications);
        }).catch(err => {
            console.log(err);
        });
    }, [uid, selectedFactory, refresh]);

    useEffect(() => {
        if (!uid) return;
        const interval = setInterval(update, 10000);
        const timeout = setTimeout(update, 1000);

        return () => {
            clearTimeout(timeout);
            clearInterval(interval);
        }
    }, [uid]);

    const total = useMemo(() => {
        return errors.length + alerts.length;
    }, [errors, alerts]);

    return <Popover trigger={"click"}>
        <PopoverTrigger>
            <Avatar
                borderRadius="md"
                bgColor={navBG}
                as={IconButton}
                size="15px"
                fontSize="lg"
                variant="ghost"
                color={color}
                _hover={{
                    bg: hoverBG,
                    color: hoverColor
                }}
                aria-label="Notifications"
                icon={<BiBell />}>
                {total ? <AvatarBadge
                    position="absolute"
                    top={-2}
                    right={0}
                    fontSize={12}
                    boxSize="5px"
                    bg={errors.length ? "red.500" : "yellow.500"}
                    color={"#fff"}
                    p={2.5}>{total}</AvatarBadge> : null}
            </Avatar>
        </PopoverTrigger>
        <PopoverContent
            borderColor={border}
            boxShadow={'lg'}
            bg={popoverContentBgColor}
            p={2}
            w={useBreakpointValue(
                { base: '90vw', md: '450px' }
            )}
            rounded={'md'}>
            <Flex
                color={color}
                py={2}
                px={2}
                justifyContent={"space-between"}
                alignItems={"center"}>
                <Heading size="sm">Notifications</Heading>
                <Tag>{total} Total</Tag>
            </Flex>
            <Tabs
                color={color}
                mt={2}
                size='sm'
                variant='soft-rounded'
                colorScheme={"orange"}>
                <TabList fontSize={"sm"} borderColor={border} gap={2}>
                    <Tab>All ({total})</Tab>
                    <Tab>Errors ({errors.length})</Tab>
                    <Tab>Alerts ({alerts.length})</Tab>
                    <Tab>N. Alerts ({notifications.length})</Tab>
                </TabList>
                <TabPanels>
                    <TabPanel pr={0}>
                        <Stack spacing={4} maxH="450px" overflow={"auto"}>
                            {total === 0 && <Suspense fallback={<div>loading...</div>}>
                                <None />
                            </Suspense>}
                            <Suspense fallback={<div>loading...</div>}>
                                {errors.map(error => <Notification update={update} color={border} key={error.id} notification={error} />)}
                                {alerts.map(alert => <Notification update={update} color={border} key={alert.id} notification={alert} />)}
                            </Suspense>
                        </Stack>
                    </TabPanel>
                    <TabPanel pr={0}>
                        {errors.length === 0 && <Suspense fallback={<div>loading...</div>}>
                            <None noWhat="Errors" />
                        </Suspense>}
                        <Suspense fallback={<div>loading...</div>}>
                            <Stack spacing={4} maxH="450px" overflow={"auto"}>
                                {errors.map(error => <Notification update={update} color={border} key={error.id} notification={error} />)}
                            </Stack>
                        </Suspense>
                    </TabPanel>
                    <TabPanel pr={0}>
                        {alerts.length === 0 && <Suspense fallback={<div>loading...</div>}>
                            <None noWhat="Alerts" />
                        </Suspense>}
                        <Suspense fallback={<div>loading...</div>}>
                            <Stack spacing={4} maxH="450px" overflow={"auto"}>
                                {alerts.map(alert => <Notification update={update} color={border} key={alert.id} notification={alert} />)}
                            </Stack>
                        </Suspense>
                    </TabPanel>
                    <TabPanel pr={0}>
                        {notifications.length === 0 && <Suspense fallback={<div>loading...</div>}>
                            <None noWhat="Notification Alerts" />
                        </Suspense>}
                        <Suspense fallback={<div>loading...</div>}>
                            <Stack spacing={4} maxH="450px" overflow={"auto"}>
                                {notifications.map(alert => <Notification update={update} color={border} key={alert.id} notification={alert} />)}
                            </Stack>
                        </Suspense>
                    </TabPanel>
                </TabPanels>
            </Tabs>
        </PopoverContent>
    </Popover>
}

export default Notifications;