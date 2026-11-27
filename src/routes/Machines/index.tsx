import {
    Box, BoxProps, Button, ButtonGroup, Checkbox, Divider, FormControl, FormLabel, IconButton, Kbd, Text, useColorModeValue, VStack, Badge
} from "@chakra-ui/react"
import { useEffect, useState, Suspense, useMemo, useId } from "react";
import { SmallFill } from "../../Components/Loaders";
import { dateAtom, departmentAtom, factoriesAtom, factoryProductionAtom, isMasterAdminAtom, selectedFactoryAtom, shiftsAtom, uidAtom } from "../../Components/Store/atoms";
import Get from "../../Components/Store/hooks/Get";
import fetch from "./fetch";
import Header from "../../Components/Header";
import { departmentsType, MachineStatusTypes, fetchReturnProps, MachineType } from "./types";
import Listen from "../../Components/Store/hooks/Listen";
import { filterDepartmentsForView, isMasterOwner } from "../../Services/rbac";
import GridLayout from "./GridLayout";
import ListLayout from "./ListLayout";
import { LuPause, LuPlay } from "react-icons/lu";
import MyPopover from "../../Components/micro/MyPopover";
import PrimaryNumberInput from "../../Components/Inputs/PrimaryNumberInput";
import Helmet from "react-helmet";

type shifts = {
    shifts: 1 | 2 | 3,
    A: number,
    B: number,
    C: number
}
interface selectedFactoryType {
    name: string;
    value: number;
    only: boolean;
}

interface MonitorViewSettings {
    autoScroll: number;
    minifyCharts: boolean;
    cycleStatus: boolean;
}

const STATUSES: MachineStatusTypes[] = [
    "ON",
    "OFF",
    "IDLE",
    "NA"
];

const Machines = () => {
    const parentID = useId();
    const [view, _setView] = useState<'grid' | 'list'>(localStorage.getItem('machinesLayoutView') as 'grid' | 'list' || 'grid');
    const [department, _setDepartment] = useState<string>(() => {
        const saved = localStorage.getItem('machinesDepartment');
        return saved && saved !== "undefined" && saved !== "null" ? saved : "ALL";
    });
    const [departments, setDepartments] = useState<departmentsType>({});
    const [type, setType] = useState<MachineStatusTypes>("ALL");
    const [rawMachines, setRawMachines] = useState<fetchReturnProps["machines"] | "NOT_FOUND">({});
    const [enableMonitorView, setEnableMonitorView] = useState(false);
    const [monitorViewSettings, setMonitorViewSettings] = useState<MonitorViewSettings>(localStorage.getItem('monitorViewSettings') ? JSON.parse(localStorage.getItem('monitorViewSettings') as string) : {
        autoScroll: 10,
        minifyCharts: false,
        cycleStatus: false
    });
    const [searchQuery, setSearchQuery] = useState<string>("");
    const selectedFactory: selectedFactoryType | null = Listen(selectedFactoryAtom);
    const bgColor = useColorModeValue("light.bg", "dark.bg");
    const factories = Listen(factoriesAtom);
    const userDepts = Listen(departmentAtom) as string[] | null;
    Listen(isMasterAdminAtom);
    const uid = Listen(uidAtom);
    const search = setSearchQuery;
    const date: string | null = Get(dateAtom);
    const shifts: shifts | null = Get(shiftsAtom);
    const productionType = Get(factoryProductionAtom);

    const mySelectedFactory = selectedFactory && factories ? (factories as any)[selectedFactory.value] : undefined;
    const hasAll = isMasterOwner(uid) || (userDepts || []).includes("all");
    const scopedDepartments = useMemo(() => (
        filterDepartmentsForView(departments, userDepts, hasAll, mySelectedFactory, "machines")
    ), [departments, userDepts, hasAll, mySelectedFactory]);

    const setView = (view: 'grid' | 'list') => {
        localStorage.setItem('machinesLayoutView', view);
        _setView(view);
    }

    const setDepartment = (dept: string) => {
        localStorage.setItem('machinesDepartment', dept);
        _setDepartment(dept);
    }

    useEffect(() => {
        if (department !== "ALL" && Object.keys(departments).length > 0 && !scopedDepartments[department]) {
            setDepartment("ALL");
        }
    }, [departments, scopedDepartments, department]);

    useEffect(() => {
        setRawMachines({});
    }, [selectedFactory])

    useEffect(() => {
        if (!date || !shifts || !selectedFactory || !factories) return;
        const getData = async () => {
            const data = await fetch(date, shifts, factories, selectedFactory);
            setDepartments(data.departments);
            setRawMachines(data.machines);
        }
        const interval = setInterval(getData, 30000);
        getData();
        return () => {
            clearInterval(interval);
        }
    }, [date, shifts, selectedFactory, factories]);

    const { machines, totalMachines, viewingMachines }: {
        machines: MachineType[] | "NOT_FOUND",
        totalMachines: number,
        viewingMachines: number
    } = useMemo(() => {
        if (rawMachines === "NOT_FOUND") return {
            machines: "NOT_FOUND",
            totalMachines: 0,
            viewingMachines: 0
        };
        const machines = Object.values(rawMachines);
        const toReturn = (() => {
            if (searchQuery) {
                return machines.filter(machine => machine.name.toLowerCase().includes(searchQuery.toLowerCase()));
            }
            if (department === "ALL" && type === "ALL") return machines;
            if (department === "ALL") return machines.filter(machine => machine.status === type);
            const machineIDsInDepartment = department === "ALL" ? Object.keys(rawMachines) : Object.values(departments[department]?.machines || {});
            return machines.filter(machine => machineIDsInDepartment.includes(machine.id) && (type === "ALL" ? true : machine.status === type));
        })();
        if (toReturn.length === 0 && machines.length > 0) return {
            machines: "NOT_FOUND",
            totalMachines: machines.length,
            viewingMachines: toReturn.length
        };
        return {
            machines: toReturn,
            totalMachines: machines.length,
            viewingMachines: toReturn.length
        };
    }, [rawMachines, department, departments, type, searchQuery]);

    const toggleMonitorView = () => {
        setEnableMonitorView(prev => {
            const now = !prev;
            if (now) {
                document.documentElement.requestFullscreen();
                if (monitorViewSettings.cycleStatus) {
                    setType(STATUSES[0]);
                }
            } else document.exitFullscreen();
            return now;
        });
    };

    useEffect(() => {
        const callback = () => {
            if (!document.fullscreenElement) {
                setEnableMonitorView(false);
                window.scrollTo({
                    top: 0,
                    behavior: 'smooth'
                });
            }
        };

        window.addEventListener('fullscreenchange', callback);
        return () => {
            window.removeEventListener('fullscreenchange', callback);
        }
    }, [])

    useEffect(() => {
        const element = document.getElementById(parentID);
        if (element === null) return;
        let scrollHeight = element.offsetHeight;
        let currentPosition = 0;
        let statusIndex = 1;
        const interval = (enableMonitorView && monitorViewSettings.autoScroll) ? setInterval(() => {
            // Calculate the height to scroll each step
            if (currentPosition >= scrollHeight - window.innerHeight) {
                // If we are at the bottom of the page, scroll back to the top
                window.scrollTo({
                    top: 0,
                    behavior: 'smooth'
                });
                currentPosition = 0;
                if (monitorViewSettings.cycleStatus) {
                    if (statusIndex >= STATUSES.length) statusIndex = 0;
                    const status = STATUSES[statusIndex];
                    setType(status);
                    statusIndex++;
                }
            } else {
                // Scroll the page by one window height
                let step = window.innerHeight;
                window.scrollBy({
                    top: step,
                    behavior: 'smooth'
                });
                currentPosition += step;
            }

        }, monitorViewSettings.autoScroll * 1000) : undefined;

        return () => {
            clearInterval(interval);
        }
    }, [monitorViewSettings, enableMonitorView, parentID]);

    const parentBoxParams: BoxProps = useMemo(() => {
        if (enableMonitorView) return {
            zIndex: 9,
            position: "absolute",
            top: 0,
            left: 0,
            py: 5,
            px: 10,
            w: "100vw",
            bgColor,
            overflowY: "auto",
            overflowX: "hidden",
        } as BoxProps;
        else return {};
    }, [enableMonitorView, bgColor]);

    useEffect(() => {
        // debounce the settings save
        const timeout = setTimeout(() => {
            localStorage.setItem('monitorViewSettings', JSON.stringify(monitorViewSettings));
        }, 1000);
        return () => {
            clearTimeout(timeout);
        }
    }, [monitorViewSettings]);


    return <Box id={parentID} {...parentBoxParams}>
        {enableMonitorView && <Box
            top={0}
            left={0}
            zIndex={10}
            position="fixed">
            <Badge colorScheme={"orange"} fontSize="lg">Press <Kbd>F11</Kbd> to exit.</Badge>
        </Box>}
        <Helmet>
            <title>Machines | industrialpmr</title>
        </Helmet>
        <Header
            search={search}
            department={department}
            setDepartment={setDepartment}
            departments={scopedDepartments}
            type={type}
            hideLayoutSelector={enableMonitorView}
            setType={setType}
            view={view}
            setView={setView}
            total={totalMachines}
            viewing={viewingMachines}
            extraChildren={<Box display={{
                base: "none",
                lg: "block"
            }}>
                <Text fontSize={"xs"} opacity={0.9}>Monitor View</Text>
                <ButtonGroup
                    boxShadow="sm" borderRadius="md" size='sm' isAttached variant='outline' bgColor={useColorModeValue("white", "dark.navBG")}
                    _hover={{
                        bgColor: useColorModeValue("white", "dark.navBG")
                    }}
                    _focus={{
                        borderColor: "primary",
                        boxShadow: "none"
                    }}>
                    <MyPopover placement="bottom-end">
                        <Button isDisabled={enableMonitorView} fontWeight={400}>Settings</Button>
                        <VStack w="100%" alignItems="flex-start" gap={2} divider={<Divider />} py={2}>
                            <FormControl size={"sm"}>
                                <FormLabel opacity={0.9} fontSize="sm" textTransform={"none"}>Auto Scroll(sec)</FormLabel>
                                <PrimaryNumberInput min={0} max={1000} value={monitorViewSettings.autoScroll} onChange={e => setMonitorViewSettings(prev => {
                                    return {
                                        ...prev,
                                        autoScroll: +e
                                    }
                                })} size="sm" placeholder="5" />
                            </FormControl>
                            <Checkbox onChange={e => setMonitorViewSettings(prev => ({ ...prev, minifyCharts: e.target.checked }))} isChecked={monitorViewSettings.minifyCharts} colorScheme="orange">Minify Graph</Checkbox>
                            <Checkbox onChange={e => setMonitorViewSettings(prev => ({ ...prev, cycleStatus: e.target.checked }))} isChecked={monitorViewSettings.cycleStatus} colorScheme="orange">Cycle Statuses</Checkbox>
                        </VStack>
                    </MyPopover>
                    <IconButton onClick={toggleMonitorView} aria-label='Monitor View Start' icon={enableMonitorView ? <LuPause /> : <LuPlay />} />
                </ButtonGroup>
            </Box>}
            viewingName={"Machines"} />
        <Box>
            {view === 'grid' || enableMonitorView ?
                <Suspense fallback={<SmallFill />}>
                    <GridLayout productionType={productionType} minifyCharts={enableMonitorView && monitorViewSettings.minifyCharts} machines={machines === "NOT_FOUND" ? [] : machines} notFound={machines === "NOT_FOUND"} />
                </Suspense> :
                <Suspense fallback={<SmallFill />}>
                    <ListLayout productionType={productionType} machines={machines === "NOT_FOUND" ? [] : machines} notFound={machines === "NOT_FOUND"} />
                </Suspense>
            }
        </Box>
    </Box>
}

export default Machines;
