import fetchHasMeter from "../routes/MainElectricity/fetch";
import {
    Box,
    Breadcrumb,
    BreadcrumbItem,
    Flex,
    Popover,
    PopoverBody,
    PopoverContent,
    PopoverTrigger,
    Stack,
    Text,
    useColorMode,
    useDisclosure,
    useToast,
    Icon,
    ToastId
} from "@chakra-ui/react";
import { FC, ReactNode, useEffect, useMemo, useCallback, useState } from "react";
import Navbar from "./Navbar";
import Footer from "./Footer";
import { ChevronRightIcon } from "@chakra-ui/icons";
import { Link, useLocation } from "react-router-dom";
import routes from "./routes";
import type { Route } from "./types";
import { IoIosArrowDown } from "react-icons/io";
import store from "../Components/Store";
import {
    uidAtom,
    dateAtom,
    companyNameAtom,
    departmentsAtom,
    machinesAtom,
    departmentAtom,
    baseDepartmentAtom,
    roleAtom,
    UserRole,
    shiftsAtom,
    factoriesAtom,
    selectedFactoryAtom,
    equipmentsAtom,
    EnvListAtom,
    EnvUnitListAtom,
    hasMainElectricityAtom,
    machinesOrderAtom,
    isWebViewAppAtom,
    offtimeBasedEfficiencyAtom,
    offlineTimeAtom,
    factoryProductionType,
    factoryProductionAtom,
    tokenAtom,
    isMasterAdminAtom,
    impersonatedUidAtom,
    workSchedulesAtom
} from "../Components/Store/atoms";
import { MasterImpersonationBar } from "../Components/micro/MasterImpersonationBar";
import { auth, messaging } from "../Components/firebase";
import { get, listen, rawGet, set, update } from "../Components/firebase/api/db";
import dayjs from "../Components/Functions/dayjs";
import { DataSnapshot, serverTimestamp } from "firebase/database";
import { REST_SERVER_URL } from "../Components/micro/sendDataRest";
import { TbWaveSawTool } from "react-icons/tb";
import { getToken } from "../Components/firebase/api/messaging";
import { onMessage, Unsubscribe } from "firebase/messaging";
import { setUid, setUserProperty } from "../Components/firebase/api/analytics";
import { logout } from "../Components/firebase/api/auth";
import { computeEffectiveAdminDepartments, getAccessibleFactoryIndices, toIdArray } from "../Services/rbac";

type LayoutProps = {
    children: ReactNode
};

const Index: FC<LayoutProps> = ({
    children
}) => {
    const user = auth.currentUser;
    const [isMasterAdmin, setIsMasterAdmin] = useState(false);
    const { onClose, onOpen, isOpen } = useDisclosure();
    const { colorMode } = useColorMode();
    const bgColor = `${colorMode}.bg`;
    const location = useLocation();
    const toast = useToast();
    const { pathname } = location;
    const headerInfo: Route = useMemo(() => {
        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });
        const splitted = pathname.split("/");
        let route = routes[pathname];
        if (!route && splitted.length > 1 && splitted.at(3) !== "power") route = routes[`/${splitted[1]}`];
        if (!route) return {} as Route;
        return { ...route };
    }, [pathname]);
    const { popoverContentBgColor, hoverColor } = useMemo(() => {
        return {
            popoverContentBgColor: `${colorMode}.popoverContentBgColor`,
            hoverColor: `${colorMode}.popOverHoverColor`
        }
    }, [colorMode]);

    const setDate = async (info: any = undefined) => {
        let shift_a_start: undefined | number;
        if (info) {
            shift_a_start = +info.shift_a_start;
        } else {
            const selectedFactory = store.get(selectedFactoryAtom);
            if (selectedFactory === null || selectedFactory.value === -1) {
                const shift_a_start_ref = await get('info/shift_a_start');
                shift_a_start = +shift_a_start_ref.val();
            } else {
                const shift_a_start_ref = await get(`factories/${selectedFactory.value}/info/shift_a_start`);
                shift_a_start = +shift_a_start_ref.val();
            }
        }
        const rn = dayjs();
        const rn_time = rn.hour() * 60 * 60 + rn.minute() * 60;
        const date = (shift_a_start > rn_time ? rn.subtract(1, "days") : rn).format("YYYY-MM-DD");
        store.set(dateAtom, date);
    };

    const registerDevice = async (token: string | null, platform: string | null, model: string | null, uid: string) => {
        if (process.env.NODE_ENV === "development") return;
        if (!token || !platform) {
            // fetch this device's FCM token and info
            const permission = await Notification.requestPermission();
            if (permission !== "granted") return;
            const newToken = await getToken();
            if (!newToken) return;
            const agentData = (navigator as any).userAgentData;
            platform = agentData.platform;
            token = newToken;
            model = (agentData.brands?.at(-1)?.brand === "Not.A/Brand" ? agentData.brands?.at(0)?.brand : agentData.brands?.at(-1)?.brand) || "NA";
        }
        if (token) store.set(tokenAtom, token);

        await update(`devices/${token}`, {
            platform,
            model,
            status: true
        });
        onMessage(messaging, async (payload) => {
            if (!payload.notification) return;
            const { title, body } = payload.notification;
            toast({
                title,
                description: body,
                status: "info",
                position: "bottom-right",
                duration: null,
                isClosable: true,
            });
        });
    };

    const loadUserData = useCallback(async (activeUid: string, isMasterUser: boolean, isSubUser: boolean) => {
        store.set(uidAtom, activeUid);
        setUid(activeUid);

        let subUserData: { role?: UserRole; department?: string[] | Record<string, string>; disabled?: boolean } | null = null;
        let refsResults: DataSnapshot[];
        try {
            if (isSubUser && user?.uid) {
                const subUserRef = await get(`sub-users/${user.uid}`);
                subUserData = subUserRef.val() as { role?: UserRole; department?: string[] | Record<string, string>; disabled?: boolean } | null;
                if (!subUserRef.exists() || subUserData?.disabled === true) {
                    toast({
                        title: "Account Disabled",
                        description: "Your account has been disabled. Please contact your administrator.",
                        status: "error",
                        duration: 5000,
                        position: "bottom"
                    });
                    await logout();
                    return;
                }
            }

            const refs = [
                get(`info`),
                get(`factories`),
                get(`departments`),
                get(`machines`),
                get(`equipments`),
                isMasterUser || !isSubUser ? Promise.resolve({ val: () => "admin", exists: () => true } as any) : rawGet(`users/${user?.uid}/role`),
                isMasterUser || !isSubUser ? Promise.resolve({ val: () => ["all"], exists: () => true } as any) : rawGet(`users/${user?.uid}/department`),
                get("env_list"),
                get(`address`),
                get("work-schedules").catch(() => ({ val: () => ({}), exists: () => false } as any)),
            ];
            refsResults = await Promise.all(refs);
        } catch (err) {
            console.error("Failed to load user data:", err);
            if (!isMasterUser) {
                toast({
                    title: "Access Denied",
                    description: "Your account is disabled or you no longer have access. Please contact your administrator.",
                    status: "error",
                    duration: 5000,
                    position: "bottom"
                });
                await logout();
            }
            return;
        }

        const [infoRef, factoriesRef, departmentsRef, machinesRef, equipmentsRef, roleRef, departmentRef, envRef, addressRef, workSchedulesRef] = refsResults;
        if (!infoRef.exists()) {
            if (!isMasterUser) {
                toast({
                    title: "Error!",
                    description: "User Data Not Found",
                    status: "error",
                    duration: 3000,
                    position: "bottom"
                });
                await logout();
                return;
            } else {
                toast({
                    title: "Master Admin Mode",
                    description: `Active as Master Admin. Click 'Switch Client' in the top bar to choose a client to view.`,
                    status: "info",
                    duration: 5000,
                    position: "bottom"
                });
                store.set(companyNameAtom, "No Client Selected");
                store.set(machinesAtom, {});
                store.set(equipmentsAtom, {});
                store.set(departmentsAtom, {});
                store.set(factoriesAtom, []);
                store.set(machinesOrderAtom, []);
                store.set(workSchedulesAtom, {});
                return;
            }
        }
        if (!isMasterUser) {
            if (isSubUser) {
                set(`users/${activeUid}/sub-users/${user?.uid}/lastLogin`, serverTimestamp());
            } else {
                set(`users/${activeUid}/info/lastLogin`, serverTimestamp());
            }
        }

        const address = addressRef.val() || {};
        const factories = factoriesRef.val() || {} as object;
        const actualInfo = infoRef.val();
        const offlineTime = actualInfo?.offline_time || 3;
        const offtimeBasedEfficiency = !!actualInfo.off_time_based_efficiency;
        const company_name = actualInfo.company_name;
        setUserProperty("company_name", company_name);
        if (isMasterUser && activeUid && company_name) {
            try {
                const storedRaw = localStorage.getItem("ipmr_master_recent_clients");
                const list = storedRaw ? JSON.parse(storedRaw) : [];
                const updated = [
                    { uid: activeUid, companyName: company_name },
                    ...list.filter((c: any) => c.uid !== activeUid)
                ].slice(0, 20);
                localStorage.setItem("ipmr_master_recent_clients", JSON.stringify(updated));
            } catch (e) {
                // Ignore storage error
            }
        }
        const factoryProduction: factoryProductionType = actualInfo.production_type || "molding";
        const departments = departmentsRef.val() || {} as any;
        const sortedMachineEntries = Object.entries(machinesRef.val() as object || {}).sort((a, b) => {
            const aOrder = a[1].sort as string;
            const bOrder = b[1].sort as string;
            if (aOrder === bOrder) return 0;
            return aOrder > bOrder ? 1 : -1;
        });
        const machinesOrder = sortedMachineEntries.map(([key, value]) => key);
        const rawMachines = Object.fromEntries(sortedMachineEntries);
        const rawEquipments = equipmentsRef.val() || {} as object;
        const baseDepartment = isMasterUser || !isSubUser
            ? ["all"]
            : toIdArray(subUserData?.department ?? departmentRef.val());
        const equipments: {
            [key: string]: string
        } = {};
        for (const [post, equipment] of Object.entries(rawEquipments)) {
            if (isSubUser) {
                let found = false;
                for (const depart of baseDepartment) {
                    if (depart === "all") found = true;
                    if (toIdArray(departments[depart]?.equipments).includes(post)) found = true;
                    if (found) break;
                }
                if (!found) continue;
            }
            const { name } = equipment as any;
            equipments[post] = name;
        }
        const role: UserRole = isMasterUser || !isSubUser
            ? "admin"
            : ((subUserData?.role || roleRef.val() || "viewer") as UserRole);
        const machines: {
            [key: string]: string
        } = {};
        for (const [post, machine] of Object.entries(rawMachines)) {
            if (isSubUser) {
                let found = false;
                for (const depart of baseDepartment) {
                    if (depart === "all") found = true;
                    if (toIdArray(departments[depart]?.machines).includes(post)) found = true;
                    if (found) break;
                }
                if (!found) continue;
            }
            const { machine_model } = machine as any;
            machines[post] = machine_model;
        }
        const envList: {
            [key: string]: string
        } = {};
        for (const [key, value] of Object.entries(envRef.val() || {})) {
            if (isSubUser) {
                let found = false;
                for (const depart of baseDepartment) {
                    if (depart === "all") found = true;
                    if (toIdArray(departments[depart]?.envs).includes(key)) found = true;
                    if (found) break;
                }
                if (!found) continue;
            }
            envList[key as string] = value as string;
        }
        const department = isSubUser && role === "admin"
            ? computeEffectiveAdminDepartments(baseDepartment, departments, machines, equipments, envList)
            : baseDepartment;
        const envUnitList: {
            [key: string]: number
        } = {};
        for (const unit in address) {
            const data = address?.[unit].extras;
            if (data === undefined) continue;
            const env = data?.dht_humid;
            if (env === undefined) continue;
            envUnitList[env] = +unit;
        }

        const hasAllFactoryScope = isMasterUser || !isSubUser || baseDepartment.includes("all");
        const accessibleFactoryIndices = factoriesRef.exists()
            ? getAccessibleFactoryIndices(factories, machines, equipments, envList, hasAllFactoryScope)
            : [];

        let selectedFactory: { name: string; value: number; only: boolean };
        if (!factoriesRef.exists()) {
            selectedFactory = {
                name: "Total",
                value: -1,
                only: true,
            };
        } else if (accessibleFactoryIndices.length === 0) {
            selectedFactory = {
                name: "Total",
                value: -1,
                only: false,
            };
        } else if (accessibleFactoryIndices.length === 1) {
            const onlyIdx = accessibleFactoryIndices[0];
            selectedFactory = {
                name: ((factories as any)[onlyIdx]?.info?.company_name as string) || "Main",
                value: onlyIdx,
                only: true,
            };
            try {
                localStorage.setItem("selectedFactory", JSON.stringify(selectedFactory));
            } catch (e) {
                // Ignore storage error
            }
        } else {
            let parsedLS: any = {};
            try {
                parsedLS = JSON.parse(localStorage.getItem("selectedFactory") || "{}");
            } catch (e) {
                parsedLS = {};
            }
            const selectedFactoryLS = typeof parsedLS?.value === "number" ? parsedLS.value : accessibleFactoryIndices[0];
            if (selectedFactoryLS === -1) {
                selectedFactory = {
                    name: "Total",
                    value: -1,
                    only: false,
                };
            } else if (accessibleFactoryIndices.includes(selectedFactoryLS)) {
                selectedFactory = {
                    name: ((factories as any)[selectedFactoryLS]?.info?.company_name as string) || "Main",
                    value: selectedFactoryLS,
                    only: false,
                };
            } else {
                const firstIdx = accessibleFactoryIndices[0];
                selectedFactory = {
                    name: ((factories as any)[firstIdx]?.info?.company_name as string) || "Main",
                    value: firstIdx,
                    only: false,
                };
                try {
                    localStorage.setItem("selectedFactory", JSON.stringify(selectedFactory));
                } catch (e) {
                    // Ignore storage error
                }
            }
        }

        const infoFactoryIdx = selectedFactory.value === -1 ? (accessibleFactoryIndices[0] ?? 0) : selectedFactory.value;
        const _infoData = factoriesRef.exists() ? (factories as any)[infoFactoryIdx]?.info || actualInfo : actualInfo;
        setDate(_infoData);
        interface infoType {
            company_name: string,
            shifts: number,
            shift_a_start: number,
            shift_b_start: number,
            shift_c_start: number
        }
        const info: infoType = _infoData as infoType || {
            company_name: "",
            shifts: 1,
            shift_a_start: 0,
            shift_b_start: 0,
            shift_c_start: 0
        };
        const shifts = {
            shifts: +info.shifts as 1 | 2 | 3,
            A: +info.shift_a_start,
            B: +info.shift_b_start,
            C: +info.shift_c_start
        };

        store.set(machinesOrderAtom, machinesOrder);
        store.set(EnvUnitListAtom, envUnitList);
        store.set(EnvListAtom, envList);
        store.set(companyNameAtom, company_name);
        store.set(departmentsAtom, departments);
        store.set(machinesAtom, machines);
        store.set(equipmentsAtom, equipments);
        store.set(roleAtom, role);
        store.set(departmentAtom, department);
        store.set(baseDepartmentAtom, baseDepartment);
        store.set(shiftsAtom, shifts);
        store.set(factoriesAtom, factories);
        store.set(selectedFactoryAtom, selectedFactory);
        store.set(offtimeBasedEfficiencyAtom, offtimeBasedEfficiency);
        store.set(offlineTimeAtom, offlineTime);
        store.set(factoryProductionAtom, factoryProduction);
        store.set(workSchedulesAtom, workSchedulesRef.val() || {});
        fetchHasMeter()
            .then((has) => store.set(hasMainElectricityAtom, has))
            .catch(() => store.set(hasMainElectricityAtom, null));
    }, [user, toast]);

    const handleSwitchClient = useCallback(async (targetUid: string, companyName?: string) => {
        localStorage.setItem("ipmr_impersonated_uid", targetUid);
        store.set(impersonatedUidAtom, targetUid);
        window.location.reload();
    }, []);

    const handleExitImpersonation = useCallback(async () => {
        localStorage.removeItem("ipmr_impersonated_uid");
        store.set(impersonatedUidAtom, null);
        window.location.reload();
    }, []);

    // fetch all details and set in store
    useEffect(() => {
        let intervalId: NodeJS.Timeout;
        const func = async () => {
            if (!user) return;

            // 1. Check if user is Master Admin
            let isMaster = false;
            try {
                const adminRef = await rawGet(`admin/admins/${user.uid}/read`);
                if (adminRef.exists() && adminRef.val() === true) {
                    isMaster = true;
                }
            } catch (e) {
                console.warn("Admin check:", e);
            }
            setIsMasterAdmin(isMaster);
            store.set(isMasterAdminAtom, isMaster);

            // 2. Determine active UID
            let myUid = user.uid;
            let isSubUser = false;
            if (isMaster) {
                const storedImpersonatedUid = localStorage.getItem("ipmr_impersonated_uid");
                if (storedImpersonatedUid) {
                    myUid = storedImpersonatedUid;
                    store.set(impersonatedUidAtom, storedImpersonatedUid);
                }
            } else {
                const ref = await rawGet(`users/${myUid}/masterUid`);
                isSubUser = ref.exists();
                if (isSubUser) {
                    myUid = ref.val() as string;
                }
            }

            // 4. Load user data
            await loadUserData(myUid, isMaster, isSubUser);

            intervalId = setInterval(() => setDate(), 60000);

            // 5. Register device FCM token
            const url = new URL(window.location.href);
            const searchParams = url.searchParams;
            const token = searchParams.get("token") || searchParams.get("?token");
            const platform = searchParams.get("platform");
            const model = searchParams.get("model");
            const device = searchParams.get("device") + "-" + model;
            const isWebViewApp = !!(token || platform || model);
            store.set(isWebViewAppAtom, isWebViewApp);
            try {
                registerDevice(token, platform, device, myUid);
            } catch (e) {
                console.error(e);
            }
        };

        func();

        return () => {
            if (intervalId) clearInterval(intervalId);
            setIsMasterAdmin(false);
            store.set(isMasterAdminAtom, false);
            store.set(impersonatedUidAtom, null);
            store.set(offtimeBasedEfficiencyAtom, null);
            store.set(isWebViewAppAtom, null);
            store.set(EnvListAtom, null);
            store.set(uidAtom, null);
            store.set(dateAtom, null);
            store.set(companyNameAtom, null);
            store.set(departmentsAtom, null);
            store.set(machinesAtom, null);
            store.set(equipmentsAtom, null);
            store.set(roleAtom, null);
            store.set(departmentAtom, null);
            store.set(baseDepartmentAtom, null);
            store.set(shiftsAtom, null);
            store.set(factoriesAtom, null);
            store.set(selectedFactoryAtom, null);
            store.set(factoryProductionAtom, null);
            store.set(offlineTimeAtom, 3);
            store.set(tokenAtom, null);
            store.set(workSchedulesAtom, null);
            store.set(hasMainElectricityAtom, null);
        };
        // eslint-disable-next-line
    }, [user, loadUserData]);

    useEffect(() => {
        if (!user) return;
        let maintenanceToastId: ToastId | undefined;
        let unsub: Unsubscribe;
        const func = async () => {
            const headers = {
                "Content-Type": "application/json",
                uid: "PC-TIME-CHECK",
                unit: "1",
            };
            const callback = (snap: DataSnapshot) => {
                const isUnderMaintenance = !!snap.val();
                if (isUnderMaintenance) maintenanceToastId = toast({
                    title: "Under Maintenance",
                    description: "industrialpmr services are currently undergoing maintenance to enhance your experience. Please check back shortly. Thank you for your patience!",
                    status: "info",
                    position: "bottom-right",
                    duration: null,
                    isClosable: true,
                    icon: <Icon as={TbWaveSawTool} fontSize="2xl" />
                });
                else if (maintenanceToastId) toast.close(maintenanceToastId);
            };
            unsub = listen(`admin/alerts/is-under-maintenance`, callback);
            // rawGet(`admin/alerts/is-under-maintenance`),
            const isDemoUser = auth.currentUser?.uid === process.env.REACT_APP_DEMO_USER;
            if (isDemoUser) return;
            try {
                const res = await fetch(REST_SERVER_URL + "/time", {
                    method: "GET",
                    headers: headers,
                });
                const data = await res.json();
                const now = dayjs();
                const pad = (n: number) => String(n).padStart(2, "0");
                const then = dayjs(`${data.year}-${pad(data.month)}-${pad(data.date)} ${pad(data.hour)}:${pad(data.minute)}:${pad(data.second)}`);
                const diff = Math.abs(now.diff(then, "seconds"));
                if (diff > 60) toast({
                    title: "System time incorrect",
                    description: "Please set the system time correctly with proper timezone",
                    status: "error",
                    position: "bottom-right",
                    duration: null,
                    isClosable: false,
                });
            } catch (e) {
                // REST server is optional or offline in local dev
            }
        }
        func();

        return () => {
            unsub();
            if (maintenanceToastId) toast.close(maintenanceToastId);
        }
    }, [user, toast]);

    return <Box
        minH="100vh"
        bgColor={bgColor}
        w="100%">
        <MasterImpersonationBar
            isMasterAdmin={isMasterAdmin}
            onSwitchClient={handleSwitchClient}
            onExitImpersonation={handleExitImpersonation}
        />
        <Navbar />
        <Box
            minH="100vh"
            px={"5%"}
            py={"1%"}>
            <Flex
                mb={5}
                justifyContent={{
                    base: "center",
                    lg: "space-between"
                }}
                flexDir={{
                    base: "column",
                    lg: "row"
                }}>
                <Text
                    my="5px"
                    fontSize={16}
                    textAlign={{
                        base: "center",
                        lg: "left"
                    }}
                    fontWeight={600}
                    textTransform={"uppercase"}>{headerInfo.title}</Text>
                <Breadcrumb
                    display="flex"
                    fontSize={12}
                    spacing='8px'
                    separator={<ChevronRightIcon color='gray.500' />}>
                    {
                        headerInfo.breadcumbs?.map((breadcrumb, index) => {
                            return breadcrumb.children ? <Popover
                                key={index}
                                trigger="hover"
                                isOpen={isOpen}
                                onOpen={onOpen}
                                onClose={onClose}>
                                <PopoverTrigger>
                                    <Text
                                        gap={1}
                                        alignItems={"center"}
                                        display={"flex"}
                                        textTransform={"capitalize"}
                                        opacity={0.8}
                                        fontSize="xs"
                                        fontWeight="medium"
                                        letterSpacing={"wider"}
                                        cursor="pointer">
                                        <Link to={breadcrumb.link}>{breadcrumb.title}</Link>
                                        <IoIosArrowDown />
                                    </Text>
                                </PopoverTrigger>
                                <PopoverContent
                                    border={0}
                                    boxShadow={'xl'}
                                    bg={popoverContentBgColor}
                                    p={1.5}
                                    rounded={'md'}
                                    maxW={'max-content'}>
                                    <PopoverBody>
                                        {breadcrumb.children.map((child, secondIndex) => <Stack key={secondIndex}>
                                            <Text
                                                as={Link}
                                                to={child.link}
                                                cursor="pointer"
                                                _hover={{
                                                    bg: hoverColor,
                                                    color: "orange.400"
                                                }}
                                                p={1}
                                                textTransform={"capitalize"}
                                                rounded={'md'}
                                                fontSize="xs"
                                                fontWeight="medium"
                                                letterSpacing={"wider"}>{child.title}</Text>
                                        </Stack>
                                        )}
                                    </PopoverBody>
                                </PopoverContent>
                            </Popover>
                                : <BreadcrumbItem key={index}>
                                    <Link to={breadcrumb.link}>{breadcrumb.title}</Link>
                                </BreadcrumbItem>
                        })
                    }
                </Breadcrumb>
            </Flex>
            {children}
        </Box>
        <Footer />
    </Box>
}

export default Index;
