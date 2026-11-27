import { DeleteIcon } from "@chakra-ui/icons";
import { Box, Flex, HStack, Text, useColorMode, VStack, Icon, useToast, Button, Checkbox, FormControl, FormLabel, Center, SimpleGrid, GridItem } from "@chakra-ui/react"
import { useEffect, useMemo, useState } from "react";
import { BiPulse } from "react-icons/bi";
import { FaCogs, FaExclamation } from "react-icons/fa";
import { FiActivity, FiBarChart2, FiSave, FiUsers } from "react-icons/fi";
import { RiWindowsLine } from "react-icons/ri";
import { TbBrandAndroid, TbBrandApple, TbBrowser } from "react-icons/tb";
import { PrimaryBtn } from "../../../Components/Buttons";
import { get, remove, update } from "../../../Components/firebase/api/db";
import { getToken, sendNotification } from "../../../Components/firebase/api/messaging";
import SearchableSelector from "../../../Components/Inputs/SearchableSelector";
import { SmallFill } from "../../../Components/Loaders";
import BackdropLoader from "../../../Components/Loaders/BackdropLoader";
import MyCard from "../../../Components/micro/Card";
import ConfirmDialog from "../../../Components/micro/ConfirmDialog";
import NotFound from "../../../Components/micro/NotFound";
import {
    baseDepartmentAtom,
    departmentsAtom,
    EnvListAtom,
    equipmentsAtom,
    isMasterAdminAtom,
    machinesAtom,
    roleAtom,
    uidAtom,
} from "../../../Components/Store/atoms";
import Get from "../../../Components/Store/hooks/Get";
import Listen from "../../../Components/Store/hooks/Listen";
import { getManageableDepartmentNames, isMasterOwner } from "../../../Services/rbac";
import { Option } from "../../Reports/Selector/types";
import AddCategory from "./AddCategory";

interface Device {
    token: string;
    platform: string;
    model: string;
    isCurrent: boolean;
    status: boolean;
}

interface NotificationCategories {
    [name: string]: {
        devices: Device[]
    }
}

interface DepartmentSettings {
    [name: string]: {
        machineStatusChange: string[];
        equipmentStatusChange: string[];
        dailyMachineStats: string[];
    }
}

interface notificationSetting {
    dailyFactoryInsights: string[];
}

const Notifications = () => {
    const uid = Get(uidAtom);
    const toast = useToast();
    const { colorMode } = useColorMode();
    const { text, subText, border } = useMemo(() => ({
        text: `${colorMode}.text`,
        subText: `${colorMode}.subText`,
        border: `${colorMode}.border`
    }), [colorMode]);
    const [fetch, setFetch] = useState(false);
    const [devices, setDevices] = useState<null | Device[]>(null);
    const [loading, setLoading] = useState<string | null>(null);
    const [categories, setCategories] = useState<null | NotificationCategories>(null);
    const [departmentsSettings, setDepartmentsSettings] = useState<null | DepartmentSettings>(null);
    const [totalNotificationSettings, setTotalNotificationSettings] = useState<null | notificationSetting>(null);
    const [selectedDepart, setSelectedDepart] = useState<string | null>(null);
    const [hasChanged, setHasChanged] = useState(false);
    const [hasSettingsChanged, setHasSettingsChanged] = useState(false);
    const departments = Listen(departmentsAtom);
    Listen(isMasterAdminAtom);
    Listen(roleAtom);
    const baseDepts = Listen(baseDepartmentAtom) || [];
    Listen(machinesAtom);
    Listen(equipmentsAtom);
    Listen(EnvListAtom);
    const canManageFactoryInsights = isMasterOwner(uid) || baseDepts.includes("all");
    const manageableDepts = getManageableDepartmentNames(departments);

    const refetch = () => {
        setFetch(prev => !prev);
    }

    useEffect(() => {
        if (!uid) return;
        const func = async () => {
            const [snap, categorySnaps, departmentsSnap, totalNotificationSettingsSnap, myToken] = await Promise.all([
                get("devices"),
                get("device-categories"),
                get("departments"),
                get("total-notification-settings"),
                getToken()
            ]);
            const departments: {
                [name: string]: {
                    notificationSetting?: {
                        machineStatusChange?: string[];
                        equipmentStatusChange?: string[];
                        dailyMachineStats?: string[];
                    }
                }
            } = departmentsSnap.val() || {};
            const totalNotificationSettings: {
                dailyFactoryInsights?: string[]
            } = await totalNotificationSettingsSnap.val() || {};
            const notificationSettings: notificationSetting = {
                dailyFactoryInsights: totalNotificationSettings.dailyFactoryInsights || []
            };
            const myDepartSettings: DepartmentSettings = {};
            Object.entries(departments).forEach(([depart, { notificationSetting }]) => {
                if (!myDepartSettings[depart]) myDepartSettings[depart] = { machineStatusChange: [], equipmentStatusChange: [], dailyMachineStats: [] };
                myDepartSettings[depart].machineStatusChange = notificationSetting?.machineStatusChange || [];
                myDepartSettings[depart].equipmentStatusChange = notificationSetting?.equipmentStatusChange || [];
                myDepartSettings[depart].dailyMachineStats = notificationSetting?.dailyMachineStats || [];
            });
            const data: {
                [token: string]: {
                    platform: string;
                    model: string;
                    status?: boolean;
                }
            } = snap.val() || {};
            const Categories: {
                [cat: string]: {
                    devices: string[]
                }
            } = categorySnaps.val() || {};
            const tempDevices: {
                [key: string]: Device
            } = {};
            const devices: Device[] = Object.entries(data).map(([token, { platform, model, status }]) => {
                tempDevices[token] = {
                    token,
                    platform,
                    model,
                    isCurrent: token === myToken,
                    status: !!status
                };
                return {
                    token,
                    platform,
                    model,
                    isCurrent: token === myToken,
                    status: !!status
                }
            });
            const myCategories: NotificationCategories = {};
            Object.entries(Categories).forEach(([cat, catData]) => {
                if (!myCategories[cat]) myCategories[cat] = myCategories[cat] = { devices: [] };
                myCategories[cat].devices = catData.devices.map(device => tempDevices[device] || "Deleted");
            });
            setTotalNotificationSettings(notificationSettings);
            setDepartmentsSettings(myDepartSettings);
            setCategories(myCategories)
            setDevices(devices);
        };
        func();
    }, [uid, fetch]);

    const iconChooser = (platform: string) => {
        platform = platform.toLowerCase();
        if (platform.includes("android")) return TbBrandAndroid;
        if (platform.includes("windows")) return RiWindowsLine;
        if (platform.includes("ios")) return TbBrandApple;
        return TbBrowser;
    }

    const deleteToken = async (token: string) => {
        if (!canManageFactoryInsights || !devices || !categories) return;
        try {
            setLoading("Deleting Token");
            // update categories
            const myCategories = categories;
            Object.entries(categories).forEach(([cat, { devices }]) => {
                myCategories[cat].devices = devices.filter(({ token: t }) => t !== token);
            });
            const categoryPayload: {
                [cat: string]: {
                    devices: string[]
                }
            } = {};
            Object.entries(myCategories).forEach(([cat, { devices }]) => {
                categoryPayload[cat] = {
                    devices: devices.map(device => device.token)
                }
            });
            await Promise.all([
                remove(`devices/${token}`),
                update("device-categories", categoryPayload)
            ]);
            setCategories(myCategories);
            setDevices(devices.filter(({ token: t }) => t !== token));
            toast({
                title: "Token deleted",
                description: "The token has been deleted",
                status: "success",
                duration: 3000,
                isClosable: true,
            });
        } catch (err) {
            console.error(err);
            toast({
                title: "Error",
                description: 'Something went wrong.',
                status: "error",
                duration: 5000,
            });
        } finally {
            setLoading(null);
        }
    };

    const sendTestNotification = async (token: string) => {
        if (!canManageFactoryInsights) return;
        try {
            setLoading("Sending notification");
            await sendNotification(token, "Test Notification", "This is a test notification");
            toast({
                title: "Notification sent",
                description: "The notification has been sent",
                status: "success",
                duration: 3000,
                isClosable: true,
            });
        } catch (err) {
            console.error(err);
            toast({
                title: "Error",
                description: 'Something went wrong.',
                status: "error",
                duration: 5000,
            });
        } finally {
            setLoading(null);
        }
    };

    const updateStatus = async (token: string, status: boolean) => {
        if (!canManageFactoryInsights || !devices) return;
        try {
            setLoading("Updating Status");
            await update(`devices/${token}`, { status });
            setDevices(devices.map(device => {
                if (device.token === token) {
                    device.status = status;
                }
                return device;
            }));
            toast({
                title: "Status updated",
                description: "The status has been updated",
                status: "success",
                duration: 3000,
                isClosable: true,
            });
        } catch (err) {
            console.error(err);
            toast({
                title: "Error",
                description: 'Something went wrong.',
                status: "error",
                duration: 5000,
            });
        } finally {
            setLoading(null);
        }
    }

    const updateField = (e: Option[], category: string) => {
        if (categories === null || devices === null) return;
        setHasChanged(true);
        const myCategories = categories;
        myCategories[category].devices = e.map(({ value }) => devices.find(device => device.token === value) as Device);
        setCategories(JSON.parse(JSON.stringify(myCategories)));
    };

    const deleteCategory = async (category: string) => {
        if (!canManageFactoryInsights || categories === null) return;
        setLoading("Deleting category...");
        const myCategories = categories;
        delete categories[category];
        setCategories(myCategories);
        // logger("delete-department", {
        //     department: myDepartment
        // });
        await remove(`device-categories/${category}`);
        setLoading(null);
    }

    const save = async () => {
        if (!canManageFactoryInsights || categories === null) return;
        setLoading("Saving changes...");
        try {
            const myCategories: {
                [cat: string]: {
                    devices: string[]
                }
            } = {};
            Object.entries(categories).forEach(([cat, { devices }]) => {
                myCategories[cat] = {
                    devices: devices.map(device => device.token)
                }
            });
            await update("device-categories", myCategories);
            setHasChanged(false);
            toast({
                title: "Success",
                description: "Changes saved successfully",
                status: "success",
                duration: 3000,
                isClosable: true,
            });
        } catch (e) {
            console.error(e);
            toast({
                title: "Error",
                description: "Error saving changes",
                status: "error",
                duration: 3000,
                isClosable: true,
            });
        }
        setLoading(null);
    }

    const saveSettings = async () => {
        setLoading("Saving changes...");
        try {
            const promises: Promise<any>[] = [];
            if (canManageFactoryInsights) {
                promises.push(update(`total-notification-settings`, totalNotificationSettings));
            }
            if (departmentsSettings !== null && selectedDepart !== null && manageableDepts.includes(selectedDepart)) {
                promises.push(update(`departments/${selectedDepart}/notificationSetting`, departmentsSettings[selectedDepart]));
            }
            await Promise.all(promises);
            setHasSettingsChanged(false);
            toast({
                title: "Success",
                description: "Changes saved successfully",
                status: "success",
                duration: 3000,
                isClosable: true,
            });
        } catch (e) {
            console.error(e);
            toast({
                title: "Error",
                description: "Error saving changes",
                status: "error",
                duration: 3000,
                isClosable: true,
            });
        }
        setLoading(null);
    }

    const changeDepart = (e: Option) => {
        if (departmentsSettings === null) return;
        setSelectedDepart(e.value);
    }

    const updateSettings = (e: Option[], field: "machineStatusChange" | "equipmentStatusChange" | "dailyMachineStats") => {
        if (departmentsSettings === null || selectedDepart === null) return;
        setHasSettingsChanged(true);
        const myDepartSettings = departmentsSettings;
        myDepartSettings[selectedDepart][field] = e.map(({ value }) => value);
        setDepartmentsSettings(JSON.parse(JSON.stringify(myDepartSettings)));
    };

    const updateTotalSettings = (e: Option[], field: "dailyFactoryInsights") => {
        if (totalNotificationSettings === null) return;
        setHasSettingsChanged(true);
        const myTotalNotificationSettings = totalNotificationSettings;
        myTotalNotificationSettings.dailyFactoryInsights = e.map(({ value }) => value);
        setTotalNotificationSettings(JSON.parse(JSON.stringify(myTotalNotificationSettings)));
    };


    return <>
        {loading && <BackdropLoader text={loading} />}
        <Flex
            py={5}
            flexDir={{
                base: "column",
                xl: "row"
            }}
            gap={5}
            px={{
                base: 4,
                sm: 8
            }}>
            <Box w={{
                base: "100%",
                sm: "30%"
            }}>
                <Text fontSize="lg" fontWeight={500} color={text}>Notification Preferences</Text>
                <Text fontSize="sm" color={subText} mt={3}>
                    Manage your notification settings here. You can choose to receive notifications for production updates, factory insights, and more.
                </Text>
            </Box>
            <VStack w="100%" gap={5} alignItems="flex-end">
                <MyCard w="100%" px={4} py={4}>
                    {totalNotificationSettings === null ? <Center h="200px">
                        <SmallFill />
                    </Center>
                        : <VStack w="100%" gap={5}>
                            {canManageFactoryInsights && <HStack
                                pt={3}
                                w="100%"
                                justifyContent={"space-between"}>
                                <HStack gap={2}>
                                    <Icon fontSize="3xl" as={FiBarChart2} />
                                    <VStack alignItems={"flex-start"} lineHeight={1}>
                                        <Text fontWeight={700}>Factory Insights</Text>
                                        <Text maxW={{
                                            base: "100%",
                                            lg: "70%"
                                        }} fontSize="xs" fontWeight={500} opacity={0.8}>
                                            Receive daily insights about the factory.
                                        </Text>
                                    </VStack>
                                </HStack>
                                <FormControl maxW="250px">
                                    <FormLabel fontSize="xs">Notify</FormLabel>
                                    <SearchableSelector
                                        onChange={e => updateTotalSettings(e, "dailyFactoryInsights")}
                                        value={totalNotificationSettings?.dailyFactoryInsights.map(category => ({
                                            label: category,
                                            value: category
                                        }))}
                                        isMulti closeMenuOnSelect={false} size="sm" options={Object.keys(categories || {}).map(category => ({
                                            label: category,
                                            value: category
                                        }))} />
                                </FormControl>
                            </HStack>}
                            <FormControl
                                borderTop={canManageFactoryInsights ? "1px dashed" : undefined}
                                borderBottom="1px solid"
                                borderColor={border}
                                pt={3}
                                pb={5}>
                                <FormLabel color={text}>Select Department</FormLabel>
                                <Box
                                    w="100%">
                                    <SearchableSelector
                                        options={manageableDepts.map(department => ({
                                            label: department,
                                            value: department
                                        }))}
                                        onChange={changeDepart}
                                        value={{
                                            label: (selectedDepart && manageableDepts.includes(selectedDepart)) ? selectedDepart : "Select Department",
                                            value: (selectedDepart && manageableDepts.includes(selectedDepart)) ? selectedDepart : null
                                        }}
                                    />
                                </Box>
                            </FormControl>
                        </VStack>}
                    {selectedDepart && manageableDepts.includes(selectedDepart) && departmentsSettings && departmentsSettings[selectedDepart] ? <>
                        <HStack
                            py={3}
                            w="100%"
                            justifyContent={"space-between"}>
                            <HStack gap={2}>
                                <Icon fontSize="3xl" as={BiPulse} />
                                <VStack alignItems={"flex-start"} lineHeight={1}>
                                    <Text fontWeight={700}>Machine Status Change</Text>
                                    <Text maxW={{
                                        base: "100%",
                                        lg: "70%"
                                    }} fontSize="xs" fontWeight={500} opacity={0.8}>
                                        Receive notifications when the status of a machine changes.
                                    </Text>
                                </VStack>
                            </HStack>
                            <FormControl maxW="250px">
                                <FormLabel fontSize="xs">Notify</FormLabel>
                                <SearchableSelector
                                    onChange={e => updateSettings(e, "machineStatusChange")}
                                    value={departmentsSettings[selectedDepart].machineStatusChange.map(category => ({
                                        label: category,
                                        value: category
                                    }))}
                                    isMulti closeMenuOnSelect={false} size="sm" name={"machine-status-change-notify"} options={Object.keys(categories || {}).map(category => ({
                                        label: category,
                                        value: category
                                    }))} />
                            </FormControl>
                        </HStack>
                        <HStack
                            borderTop="1px dashed"
                            borderColor={border}
                            py={3}
                            w="100%"
                            justifyContent={"space-between"}>
                            <HStack gap={2}>
                                <Icon fontSize="3xl" as={FaCogs} />
                                <VStack alignItems={"flex-start"} lineHeight={1}>
                                    <Text fontWeight={700}>Equipment Status Change</Text>
                                    <Text maxW={{
                                        base: "100%",
                                        lg: "70%"
                                    }} fontSize="xs" fontWeight={500} opacity={0.8}>
                                        Receive notifications when the status of an equipment changes.
                                    </Text>
                                </VStack>
                            </HStack>
                            <FormControl maxW="250px">
                                <FormLabel fontSize="xs">Notify</FormLabel>
                                <SearchableSelector
                                    onChange={e => updateSettings(e, "equipmentStatusChange")}
                                    value={departmentsSettings[selectedDepart].equipmentStatusChange.map(category => ({
                                        label: category,
                                        value: category
                                    }))}
                                    isMulti closeMenuOnSelect={false} size="sm" name={"machine-status-change-notify"} options={Object.keys(categories || {}).map(category => ({
                                        label: category,
                                        value: category
                                    }))} />
                            </FormControl>
                        </HStack>
                        <HStack
                            borderTop="1px dashed"
                            borderColor={border}
                            py={3}
                            w="100%"
                            justifyContent={"space-between"}>
                            <HStack gap={2}>
                                <Icon fontSize="3xl" as={FiBarChart2} />
                                <VStack alignItems={"flex-start"} lineHeight={1}>
                                    <Text fontWeight={700}>Daily Machines Stats</Text>
                                    <Text maxW={{
                                        base: "100%",
                                        lg: "70%"
                                    }} fontSize="xs" fontWeight={500} opacity={0.8}>
                                        Recieve machine stats everyday.
                                    </Text>
                                </VStack>
                            </HStack>
                            <FormControl maxW="250px">
                                <FormLabel fontSize="xs">Notify</FormLabel>
                                <SearchableSelector
                                    onChange={e => updateSettings(e, "dailyMachineStats")}
                                    value={departmentsSettings[selectedDepart].dailyMachineStats.map(category => ({
                                        label: category,
                                        value: category
                                    }))}
                                    isMulti closeMenuOnSelect={false} size="sm" name={"machine-status-change-notify"} options={Object.keys(categories || {}).map(category => ({
                                        label: category,
                                        value: category
                                    }))} />
                            </FormControl>
                        </HStack>
                    </> : <NotFound h="150px" text={"No department selected"} icon={FaExclamation} />}
                </MyCard>
                <ConfirmDialog onConfirm={saveSettings}>
                    <PrimaryBtn
                        isDisabled={!hasSettingsChanged}
                        rightIcon={
                            <FiSave />
                        }>Save Changes</PrimaryBtn>
                </ConfirmDialog>
            </VStack>
        </Flex>
        {canManageFactoryInsights && <Flex
            borderTop="1px solid"
            borderColor={border}
            py={5}
            flexDir={{
                base: "column",
                xl: "row"
            }}
            gap={5}
            px={{
                base: 4,
                sm: 8
            }}>
            <Box w={{
                base: "100%",
                sm: "30%"
            }}>
                <Text fontSize="lg" fontWeight={500} color={text}>Device Categories</Text>
                <Text fontSize="sm" color={subText} mt={3}>
                    Manage and create categories for devices, You can assign notifications to only be sent to those categories.
                </Text>
                <AddCategory disabled={false} devices={devices ? Object.fromEntries(devices.map(device => { return [device.token, `${device.platform} (${device.model})`] })) : {}} currentCategories={Object.keys(categories || {})} refetch={refetch} />
            </Box>
            <VStack w="100%" gap={5} alignItems="flex-end">
                <MyCard
                    h="fit-content"
                    w={"100%"}
                    p={0}>
                    {categories === null ?
                        <Center h="200px">
                            <SmallFill />
                        </Center>
                        : Object.keys(categories).length ? Object.entries(categories).map(([category, data]) => <Flex
                            key={category}
                            w={"100%"}
                            py={5}
                            px={7}
                            _notLast={{
                                borderBottom: "1px solid",
                                borderColor: border
                            }}>
                            <SimpleGrid
                                columns={{
                                    base: 1,
                                    md: 5,
                                }}
                                gap={{
                                    base: 5,
                                    md: 10
                                }}
                                w={"100%"}
                                justifyContent="space-between">
                                <Flex
                                    direction="column"
                                    gap={1}>
                                    <Text fontSize="xl" fontWeight={700} color={text} textDecor="underline">{category}</Text>
                                    <Box>
                                        <Text fontSize="xs" color={subText}>
                                            <span style={{
                                                fontWeight: 600
                                            }}>T. Devices: </span>
                                            {data.devices.length}
                                        </Text>
                                    </Box>
                                    <ConfirmDialog
                                        heading="Are you sure?"
                                        text="Are you sure you want to delete this category?"
                                        onConfirm={() => deleteCategory(category)}>
                                        <Button mt={2} w="fit-content" size="xs" colorScheme={"red"} variant="outline" leftIcon={<DeleteIcon />}>Delete</Button>
                                    </ConfirmDialog>
                                </Flex>
                                <GridItem colSpan={{
                                    base: 1,
                                    md: 4
                                }}>
                                    <FormControl w="100%">
                                        <FormLabel fontSize="sm" opacity={0.9}>Devices</FormLabel>
                                        <SearchableSelector closeMenuOnSelect={false} size={"sm"} isMulti
                                            onChange={e => updateField(e, category)}
                                            options={devices ? devices.map(device => ({ label: `${device.platform} (${device.model})`, value: device.token })) : []}
                                            value={data.devices.map(device => ({
                                                label: `${device.platform} (${device.model})`,
                                                value: device.token
                                            }))} />
                                    </FormControl>
                                </GridItem>
                            </SimpleGrid>
                        </Flex>
                        ) : <NotFound h="150px" text={"No Departments Found"} icon={FiUsers} />}
                </MyCard>
                <ConfirmDialog onConfirm={save}>
                    <PrimaryBtn
                        isDisabled={!hasChanged}
                        rightIcon={
                            <FiSave />
                        }>Save Changes</PrimaryBtn>
                </ConfirmDialog>
            </VStack>
        </Flex>}
        {canManageFactoryInsights && <Flex
            borderTop="1px solid"
            borderColor={border}
            py={5}
            flexDir={{
                base: "column",
                xl: "row"
            }}
            gap={5}
            px={{
                base: 4,
                sm: 8
            }}>
            <Box w={{
                base: "100%",
                sm: "30%"
            }}>
                <Text fontSize="lg" fontWeight={500} color={text}>All logged-in Devices</Text>
                <Text fontSize="sm" color={subText} mt={3}>
                    Manage your notification settings here. You can choose to receive notifications for production updates, factory insights, and more.
                </Text>
            </Box>
            <MyCard w="100%" px={4}>
                <VStack w="100%">
                    {devices === null ? <SmallFill /> : devices.length ? devices.map(({ platform, model, token, isCurrent, status }) => <HStack
                        w="100%"
                        key={token}
                        py={4}
                        _notLast={{
                            borderBottom: "1px solid",
                            borderColor: border
                        }}
                        gap={3}
                        justifyContent={"space-between"}>
                        <HStack gap={2}>
                            <Icon fontSize="3xl" color={
                                isCurrent ? "teal.300" : undefined
                            } as={iconChooser(platform)} />
                            <VStack alignItems={"flex-start"} lineHeight={1}>
                                <Text textTransform={"capitalize"} fontWeight={700}>{`${platform} (${model})`}</Text>
                                <ConfirmDialog
                                    scope="normal"
                                    text={`Are you sure you want to ${status ? "disable" : "enable"} notifications for this device?`}
                                    onConfirm={() => updateStatus(token, !status)}>
                                    <Box>
                                        <Checkbox fontSize="2xs" size="sm" opacity={0.9} fontWeight={400} textTransform="uppercase" colorScheme="green" isChecked={status}>Receive Notifications</Checkbox>
                                    </Box>
                                </ConfirmDialog>
                            </VStack>
                        </HStack>
                        <VStack alignItems={"flex-end"}>
                            <ConfirmDialog
                                text="Are you sure you want to send a test notification to this device?"
                                onConfirm={() => { sendTestNotification(token) }}>
                                <Button size="xs" colorScheme={"orange"} rightIcon={<FiActivity />}>Send Alert</Button>
                            </ConfirmDialog>
                            <ConfirmDialog
                                text="Are you sure you want to delete this token? You won't receive any notifications on this device."
                                onConfirm={() => { deleteToken(token) }}>
                                <Button size="xs" colorScheme={"red"} variant={"outline"} rightIcon={<DeleteIcon />}>Delete</Button>
                            </ConfirmDialog>
                        </VStack>
                    </HStack>) : <NotFound text="No Devices found!" />}
                </VStack>
            </MyCard>
        </Flex>}
    </>
}

export default Notifications;
export type { NotificationCategories };