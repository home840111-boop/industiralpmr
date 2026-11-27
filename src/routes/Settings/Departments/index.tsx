import { DeleteIcon } from "@chakra-ui/icons";
import { Box, Button, Center, Flex, FormControl, FormLabel, SimpleGrid, Text, useColorMode, useToast, VStack } from "@chakra-ui/react";
import { useEffect, useMemo, useState } from "react";
import { FaExclamation } from "react-icons/fa";
import { FiSave, FiUsers } from "react-icons/fi";
import { PrimaryBtn } from "../../../Components/Buttons";
import SearchableSelector from "../../../Components/Inputs/SearchableSelector";
import { SmallFill } from "../../../Components/Loaders";
import BackdropLoader from "../../../Components/Loaders/BackdropLoader";
import MyCard from "../../../Components/micro/Card";
import ConfirmDialog from "../../../Components/micro/ConfirmDialog";
import NotFound from "../../../Components/micro/NotFound";
import {
    baseDepartmentAtom,
    departmentAtom,
    departmentsAtom,
    EnvListAtom,
    equipmentsAtom,
    isMasterAdminAtom,
    machinesAtom,
    roleAtom,
    shiftsAtom,
    uidAtom,
} from "../../../Components/Store/atoms";
import Get from "../../../Components/Store/hooks/Get";
import Listen from "../../../Components/Store/hooks/Listen";
import { departmentsType } from "../../Machines/types"
import { Option } from "../../Reports/Selector/types";
import { remove, update } from "../../../Components/firebase/api/db";
import store from "../../../Components/Store";
import {
    getManageableDepartmentNames,
    isAdminUser,
    isMasterOwner,
    toIdArray,
    validateNoSelfLockout,
} from "../../../Services/rbac";
import AddDepartment from "./AddDepartment";
import logger from "../../../Components/micro/logger";
import { PrimaryInput } from "../../../Components/Inputs";

interface DepartmentType {
    name: string;
    machines: {
        [key: string]: string
    },
    equipments: {
        [key: string]: string
    },
    envs: {
        [key: string]: string
    },
    supervisors: {
        A: string,
        B: string | null,
        C: string | null
    }
}
const Departments = () => {
    const toast = useToast();
    const [loading, setLoading] = useState<string | null>(null);
    const [departments, setDepartments] = useState<null | DepartmentType[]>(null);
    const [hasChanged, setHasChanged] = useState(false);
    const [refetch, setRefetch] = useState(false);
    const { colorMode } = useColorMode();
    const { text, subText, border } = useMemo(() => ({
        text: `${colorMode}.text`,
        subText: `${colorMode}.subText`,
        border: `${colorMode}.border`
    }), [colorMode]);
    const masterUid = Listen(uidAtom);
    const role = Listen(roleAtom);
    const isMaster = Listen(isMasterAdminAtom);
    const baseDepts = Listen(baseDepartmentAtom) || [];
    const hasAccess = isAdminUser(masterUid);
    const callerIsMaster = isMasterOwner(masterUid);
    const machines = Get(machinesAtom);
    const equipments = Get(equipmentsAtom);
    const envs = Get(EnvListAtom);
    const jotaiShifts = Get(shiftsAtom);
    const allDepartmentsAtom = Listen(departmentsAtom);
    const shifts = useMemo(() => {
        if (jotaiShifts === null) return 1;
        return jotaiShifts.shifts;
    }, [jotaiShifts]);

    const manageableDepts = getManageableDepartmentNames(allDepartmentsAtom);

    useEffect(() => {
        if (machines === null || equipments === null || envs === null || jotaiShifts === null) return;
        const func = async () => {
            const atom = store.get(departmentsAtom) || {};
            const allowedNames = getManageableDepartmentNames(atom);
            const data: DepartmentType[] = Object.entries(atom)
                .filter(([name]) => allowedNames.includes(name))
                .map(([_name, _department]) => {
                    const name = _name as string;
                    const department = _department as departmentsType[0];
                    return {
                        name,
                        machines: Object.fromEntries(
                            toIdArray(department.machines)
                                .filter(id => Boolean(machines[id]))
                                .map(id => [id, machines[id]])
                        ),
                        equipments: Object.fromEntries(
                            toIdArray(department.equipments)
                                .filter(id => Boolean(equipments[id]))
                                .map(id => [id, equipments[id]])
                        ),
                        envs: Object.fromEntries(
                            toIdArray(department.envs)
                                .filter(id => Boolean(envs[id]))
                                .map(id => [id, envs[id]])
                        ),
                        supervisors: department.supervisors || {
                            A: "",
                            B: jotaiShifts.shifts > 1 ? "" : null,
                            C: jotaiShifts.shifts > 2 ? "" : null
                        }
                    };
                });
            setDepartments(data);
        };
        func();
    }, [machines, equipments, envs, refetch, jotaiShifts, allDepartmentsAtom, role, isMaster]);

    const updateField = (e: Option[], depart: string, key: "machines" | "equipments" | "envs" | "superA" | "superB" | "superC") => {
        if (departments === null) return;
        setHasChanged(true);
        const myDeparts = [...departments];
        const index = myDeparts.findIndex(department => department.name === depart);
        if (index === -1) return;
        const myDepartment = myDeparts[index];
        if (key === "superA") myDepartment.supervisors.A = e?.[0]?.value ?? "";
        else if (key === "superB") myDepartment.supervisors.B = e?.[0]?.value ?? "";
        else if (key === "superC") myDepartment.supervisors.C = e?.[0]?.value ?? "";
        else myDepartment[key] = Object.fromEntries((e || []).map(({ value, label }) => [value, label]));
        setDepartments([...myDeparts]);
    };

    const deleteDepart = async (depart: string) => {
        if (departments === null || !hasAccess) return;
        if (!manageableDepts.includes(depart)) {
            toast({
                title: "Unauthorized",
                description: "You do not have permission to delete this department.",
                status: "error",
                duration: 3000,
                isClosable: true,
            });
            return;
        }
        const currentAll = { ...(store.get(departmentsAtom) || {}) };
        delete currentAll[depart];

        if (!callerIsMaster) {
            const lockoutCheck = validateNoSelfLockout(
                currentAll,
                baseDepts,
                machines || {},
                equipments || {},
                envs || {}
            );
            if (!lockoutCheck.ok) {
                toast({
                    title: "Cannot Delete Department",
                    description: `Deleting "${depart}" would remove your access to: ${lockoutCheck.missing.join(", ")}`,
                    status: "error",
                    duration: 5000,
                    isClosable: true,
                });
                return;
            }
        }

        setLoading("Deleting department...");
        try {
            const myDeparts = [...departments];
            const index = myDeparts.findIndex(department => department.name === depart);
            const myDepartment = myDeparts[index].name;
            myDeparts.splice(index, 1);
            logger("delete-department", {
                department: myDepartment
            });
            await remove(`departments/${myDepartment}`);
            setDepartments([...myDeparts]);
            store.set(departmentsAtom, currentAll);
            const currentAssigned = store.get(departmentAtom) || [];
            if (!currentAssigned.includes("all")) {
                store.set(departmentAtom, currentAssigned.filter(d => d !== myDepartment));
            }
        } catch (e) {
            console.error(e);
            toast({
                title: "Error",
                description: "Failed to delete department",
                status: "error",
                duration: 3000,
                isClosable: true,
            });
        } finally {
            setLoading(null);
        }
    };

    const save = async () => {
        if (!hasAccess || !departments) return;
        for (const department of departments) {
            const mKeys = Object.keys(department.machines);
            const eKeys = Object.keys(department.equipments);
            const envKeys = Object.keys(department.envs);
            if (mKeys.length + eKeys.length + envKeys.length === 0) {
                toast({
                    title: "Validation Error",
                    description: `Department "${department.name}" must contain at least one machine, equipment, or environment.`,
                    status: "error",
                    duration: 4000,
                    isClosable: true,
                });
                return;
            }
            if (
                !mKeys.every(id => Boolean(machines?.[id])) ||
                !eKeys.every(id => Boolean(equipments?.[id])) ||
                !envKeys.every(id => Boolean(envs?.[id]))
            ) {
                toast({
                    title: "Unauthorized Asset",
                    description: `Department "${department.name}" contains assets outside your access scope.`,
                    status: "error",
                    duration: 4000,
                    isClosable: true,
                });
                return;
            }
        }

        const existingAll = store.get(departmentsAtom) || {};
        const nextAllDepartments: departmentsType = { ...existingAll };
        departments.forEach(department => {
            const existingEntry = (existingAll[department.name] || {}) as any;
            nextAllDepartments[department.name] = {
                ...existingEntry,
                machines: Object.fromEntries(Object.keys(department.machines).map((key, index) => [index, key])),
                equipments: Object.fromEntries(Object.keys(department.equipments).map((key, index) => [index, key])),
                envs: Object.fromEntries(Object.keys(department.envs).map((key, index) => [index, key])),
                supervisors: department.supervisors
            };
        });

        if (!callerIsMaster) {
            const lockoutCheck = validateNoSelfLockout(
                nextAllDepartments,
                baseDepts,
                machines || {},
                equipments || {},
                envs || {}
            );
            if (!lockoutCheck.ok) {
                toast({
                    title: "Self-Lockout Prevented",
                    description: `Your base departments must retain access to all your assigned assets. Missing: ${lockoutCheck.missing.join(", ")}`,
                    status: "error",
                    duration: 5000,
                    isClosable: true,
                });
                return;
            }
        }

        setLoading("Saving changes...");
        try {
            const scopedPayload = Object.fromEntries(
                departments.map(d => [d.name, nextAllDepartments[d.name]])
            );
            logger("update-department", {
                departments: scopedPayload
            });
            await Promise.all(
                departments.map(department =>
                    update(`departments/${department.name}`, {
                        machines: Object.keys(department.machines),
                        equipments: Object.keys(department.equipments),
                        envs: Object.keys(department.envs),
                        supervisors: department.supervisors
                    })
                )
            );
            store.set(departmentsAtom, nextAllDepartments);
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
    };

    return <>
        {loading && <BackdropLoader text={loading} />}
        <Flex
            pt={5}
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
                base: "90%",
                sm: "30%"
            }}>
                <Text fontSize="lg" fontWeight={500} color={text}>Departments</Text>
                <Text fontSize="sm" color={subText} mt={3}>
                    Efficiently organize your factory with our Department Management. Add departments, assign machines, and gain real-time insights for streamlined monitoring and decision-making.
                </Text>
                <AddDepartment disabled={!hasAccess} refetch={setRefetch} />
            </Box>
            <VStack w="100%" gap={5} alignItems="flex-end">
                <MyCard
                    h="fit-content"
                    w={"100%"}
                    p={0}>
                    {hasAccess ?
                        departments === null ?
                            <Center h="200px">
                                <SmallFill />
                            </Center>
                            : departments.length ? departments.map((department, index) => <Flex
                                key={index}
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
                                        <Text fontSize="xl" fontWeight={700} color={text} textDecor="underline">{department.name}</Text>
                                        <Box>
                                            <Text fontSize="xs" color={subText}>
                                                <span style={{
                                                    fontWeight: 600
                                                }}>T. Machines: </span>
                                                {Object.keys(department.machines).length}
                                            </Text>
                                            <Text fontSize="xs" color={subText}>
                                                <span style={{
                                                    fontWeight: 600
                                                }}>T. Equipments: </span>
                                                {Object.keys(department.equipments).length}
                                            </Text>
                                            <Text fontSize="xs" color={subText}>
                                                <span style={{
                                                    fontWeight: 600
                                                }}>T. Environments: </span>
                                                {Object.keys(department.envs).length}
                                            </Text>
                                        </Box>
                                        <ConfirmDialog
                                            heading="Are you sure?"
                                            text="Are you sure you want to delete this department?"
                                            onConfirm={() => deleteDepart(department.name)}>
                                            <Button mt={2} w="fit-content" size="xs" colorScheme={"red"} variant="outline" leftIcon={<DeleteIcon />}>Delete</Button>
                                        </ConfirmDialog>
                                    </Flex>
                                    <VStack w="100%">
                                        <FormControl>
                                            <FormLabel fontSize="xs">Supervisor A</FormLabel>
                                            <PrimaryInput placeholder="Supervisor A" size="sm" onChange={e => updateField([{
                                                value: e.target.value,
                                                label: e.target.value
                                            }], department.name, "superA")} value={department.supervisors.A} />
                                        </FormControl>
                                        {shifts > 1 && <FormControl>
                                            <FormLabel fontSize="xs">Supervisor B</FormLabel>
                                            <PrimaryInput placeholder="Supervisor B" size="sm" onChange={e => updateField([{
                                                value: e.target.value,
                                                label: e.target.value
                                            }], department.name, "superB")} value={department.supervisors.B || ""} />
                                        </FormControl>}
                                        {shifts > 2 && <FormControl>
                                            <FormLabel fontSize="xs">Supervisor C</FormLabel>
                                            <PrimaryInput placeholder="Supervisor C" size="sm" onChange={e => updateField([{
                                                value: e.target.value,
                                                label: e.target.value
                                            }], department.name, "superC")} value={department.supervisors.C || ""} />
                                        </FormControl>}
                                    </VStack>
                                    <FormControl w="100%">
                                        <FormLabel fontSize="sm" opacity={0.9}>Machines</FormLabel>
                                        <SearchableSelector closeMenuOnSelect={false} size={"sm"} isMulti onChange={e => updateField(e, department.name, "machines")} options={Object.entries(machines || {}).map(([key, value]) => ({ label: value as string, value: key as string }))} value={Object.entries(department.machines || {}).map(([key, value]) => ({
                                            label: value,
                                            value: key
                                        }))} />
                                    </FormControl>
                                    <FormControl w="100%">
                                        <FormLabel fontSize="sm" opacity={0.9}>Equipments</FormLabel>
                                        <SearchableSelector closeMenuOnSelect={false} size={"sm"} isMulti onChange={e => updateField(e, department.name, "equipments")} options={Object.entries(equipments || {}).map(([key, value]) => ({ label: value as string, value: key as string }))} value={Object.entries(department.equipments || {}).map(([key, value]) => ({
                                            label: value,
                                            value: key
                                        }))} />
                                    </FormControl>
                                    <FormControl w="100%">
                                        <FormLabel fontSize="sm" opacity={0.9}>Environments</FormLabel>
                                        <SearchableSelector closeMenuOnSelect={false} size={"sm"} isMulti onChange={e => updateField(e, department.name, "envs")} options={Object.entries(envs || {}).map(([key, value]) => ({ label: value as string, value: key as string }))} value={Object.entries(department.envs || {}).map(([key, value]) => ({
                                            label: value,
                                            value: key
                                        }))} />
                                    </FormControl>
                                </SimpleGrid>
                            </Flex>
                            ) : <NotFound h="150px" text={"No Departments Found"} icon={FiUsers} />
                        : <NotFound h="150px" text={"Unauthorized access"} icon={FaExclamation} />}
                </MyCard>
                <ConfirmDialog onConfirm={save}>
                    <PrimaryBtn
                        isDisabled={!hasChanged}
                        rightIcon={
                            <FiSave />
                        }>Save Changes</PrimaryBtn>
                </ConfirmDialog>
            </VStack>
        </Flex>
    </>
}

export default Departments