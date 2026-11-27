import { useDisclosure, Icon, ModalHeader, ModalCloseButton, ModalBody, ModalFooter, Button, VStack, FormControl, FormLabel, useToast, HStack } from "@chakra-ui/react";
import { useMemo, useState } from "react";
import { FiPlus } from "react-icons/fi";
import Primary from "../../../Components/Buttons/Primary";
import { update } from "../../../Components/firebase/api/db";
import { PrimaryInput } from "../../../Components/Inputs";
import SearchableSelector from "../../../Components/Inputs/SearchableSelector";
import BackdropLoader from "../../../Components/Loaders/BackdropLoader";
import logger from "../../../Components/micro/logger";
import MyModal from "../../../Components/micro/MyModal";
import store from "../../../Components/Store";
import { baseDepartmentAtom, departmentAtom, departmentsAtom, EnvListAtom, equipmentsAtom, machinesAtom, shiftsAtom } from "../../../Components/Store/atoms";
import Get from "../../../Components/Store/hooks/Get";
import Listen from "../../../Components/Store/hooks/Listen";
import { isAdminUser } from "../../../Services/rbac";
import { Option } from "../../Reports/Selector/types";

const AddDepartment = ({
    disabled,
    refetch
}: {
    disabled: boolean;
    refetch: any;
}) => {
    const toast = useToast();
    const { isOpen, onOpen, onClose } = useDisclosure();
    const [loading, setLoading] = useState<string | null>(null);
    const [data, setData] = useState<{
        name: string;
        machines: Option[];
        equipments: Option[];
        envs: Option[];
        supervisors: {
            A: string;
            B: string;
            C: string;
        }
    }>({
        name: "",
        machines: [],
        equipments: [],
        envs: [],
        supervisors: {
            A: "",
            B: "",
            C: ""
        }
    });
    const machines = Get(machinesAtom);
    const equipments = Get(equipmentsAtom);
    const envs = Get(EnvListAtom);
    const currentDeparts = Listen(departmentsAtom);
    const jotaiShifts = Get(shiftsAtom);
    const shifts = useMemo(() => {
        if (jotaiShifts === null) return 1;
        return jotaiShifts.shifts;
    }, [jotaiShifts]);

    const handleSubmit = async () => {
        if (!isAdminUser()) return;
        if (jotaiShifts === null || currentDeparts === null) return;
        const myCurrentDeparts = currentDeparts;
        const deptName = data.name.trim();
        if (!deptName.length) {
            toast({
                title: "Error",
                description: "Department name is required",
                status: "error",
                duration: 3000,
                isClosable: true,
            });
            return;
        } else if ([".", "#", "$", "[", "]", "/"].some(ch => deptName.includes(ch))) {
            toast({
                title: "Error",
                description: "Department name cannot contain . # $ [ ] /",
                status: "error",
                duration: 3000,
                isClosable: true,
            });
            return;
        } else if (data.envs.length === 0 && data.machines.length === 0 && data.equipments.length === 0) {
            toast({
                title: "Error",
                description: "Atleast one machine, equipment or environment is required",
                status: "error",
                duration: 3000,
                isClosable: true,
            });
            return;
        } else if (
            !data.machines.every(e => Boolean(machines?.[e.value])) ||
            !data.equipments.every(e => Boolean(equipments?.[e.value])) ||
            !data.envs.every(e => Boolean(envs?.[e.value]))
        ) {
            toast({
                title: "Unauthorized Asset",
                description: "You can only assign machines, equipments, and environments within your access scope.",
                status: "error",
                duration: 4000,
                isClosable: true,
            });
            return;
        } else if (
            data.supervisors.A.replaceAll(" ", "").length === 0 ||
            (jotaiShifts.shifts > 1 && data.supervisors.B.replaceAll(" ", "").length === 0) ||
            (jotaiShifts.shifts > 2 && data.supervisors.C.replaceAll(" ", "").length === 0)
        ) {
            toast({
                title: "Error",
                description: "Supervisor names are required",
                status: "error",
                duration: 3000,
                isClosable: true,
            });
            return;
        } else if (Object.keys(myCurrentDeparts).some(k => k.toLowerCase() === deptName.toLowerCase())) {
            toast({
                title: "Error",
                description: "Department already exists",
                status: "error",
                duration: 3000,
                isClosable: true,
            });
            return;
        }
        try {
            setLoading("Adding Department");
            const payload = {
                machines: data.machines.map(e => e.value),
                equipments: data.equipments.map(e => e.value),
                envs: data.envs.map(e => e.value),
                supervisors: {
                    A: data.supervisors.A,
                    B: shifts > 1 ? data.supervisors.B : null,
                    C: shifts > 2 ? data.supervisors.C : null,
                }
            };
            logger("add-department", {
                name: deptName,
                payload
            });
            await update(`departments/${deptName}`, payload);
            store.set(departmentsAtom, {
                ...currentDeparts,
                [deptName]: payload as any
            });
            const baseDepts = store.get(baseDepartmentAtom) || [];
            const activeDepts = store.get(departmentAtom) || [];
            if (!baseDepts.includes("all") && !activeDepts.includes(deptName)) {
                store.set(departmentAtom, [...activeDepts, deptName]);
            }
            setLoading(null);
            onClose();
            refetch((prev: boolean) => !prev);
            toast({
                title: "Success",
                description: "Department added successfully",
                status: "success",
                duration: 3000,
                isClosable: true,
            });
            setData({
                name: "",
                machines: [],
                equipments: [],
                envs: [],
                supervisors: {
                    A: "",
                    B: "",
                    C: ""
                }
            });
        } catch (e) {
            setLoading(null);
            console.error(e);
            toast({
                title: "Error",
                description: "Something went wrong",
                status: "error",
                duration: 3000,
                isClosable: true,
            });
        }
    };

    return <>
        {loading && <BackdropLoader text={loading} />}
        <Primary size="sm" mt={5} onClick={onOpen} isDisabled={disabled}>Add Department<Icon ml={2} as={FiPlus} /></Primary>
        <MyModal
            size={"xl"}
            isOpen={isOpen}
            onClose={onClose}
            closeOnOverlayClick={false}>
            <ModalHeader>Add Department</ModalHeader>
            <ModalCloseButton />
            <ModalBody pb={6}>
                <VStack gap={4}>
                    <FormControl>
                        <FormLabel>Department Name</FormLabel>
                        <PrimaryInput placeholder="eg: Injection Depart" onChange={e => setData(prev => {
                            return {
                                ...prev,
                                name: e.target.value
                            }
                        })} />
                    </FormControl>
                    <FormControl>
                        <FormLabel>Machines</FormLabel>
                        <SearchableSelector closeMenuOnSelect={false} isMulti onChange={e => setData(prev => {
                            return {
                                ...prev,
                                machines: e || []
                            }
                        })} options={Object.entries(machines || {}).map(([key, value]) => ({ label: value as string, value: key as string }))} />
                    </FormControl>
                    <FormControl>
                        <FormLabel>Equipments</FormLabel>
                        <SearchableSelector closeMenuOnSelect={false} isMulti onChange={e => setData(prev => {
                            return {
                                ...prev,
                                equipments: e || []
                            }
                        })} options={Object.entries(equipments || {}).map(([key, value]) => ({ label: value as string, value: key as string }))} />
                    </FormControl>
                    <FormControl>
                        <FormLabel>Environments</FormLabel>
                        <SearchableSelector closeMenuOnSelect={false} isMulti onChange={e => setData(prev => {
                            return {
                                ...prev,
                                envs: e || []
                            }
                        })} options={Object.entries(envs || {}).map(([key, value]) => ({ label: value as string, value: key as string }))} />
                    </FormControl>
                    <HStack w="100%">
                        <FormControl>
                            <FormLabel>Supervisor A</FormLabel>
                            <PrimaryInput placeholder="Supervisor A" size="sm" onChange={e => setData(prev => {
                                return {
                                    ...prev,
                                    supervisors: {
                                        ...prev.supervisors,
                                        A: e.target.value
                                    }
                                }
                            })} value={data.supervisors.A} />
                        </FormControl>
                        {shifts > 1 && <FormControl>
                            <FormLabel>Supervisor B</FormLabel>
                            <PrimaryInput placeholder="Supervisor B" size="sm" onChange={e => setData(prev => {
                                return {
                                    ...prev,
                                    supervisors: {
                                        ...prev.supervisors,
                                        B: e.target.value
                                    }
                                }
                            })} value={data.supervisors.B} />
                        </FormControl>}
                        {shifts > 2 && <FormControl>
                            <FormLabel>Supervisor C</FormLabel>
                            <PrimaryInput placeholder="Supervisor C" size="sm" onChange={e => setData(prev => {
                                return {
                                    ...prev,
                                    supervisors: {
                                        ...prev.supervisors,
                                        C: e.target.value
                                    }
                                }
                            })} value={data.supervisors.C} />
                        </FormControl>}
                    </HStack>
                </VStack>
            </ModalBody>
            <ModalFooter>
                <Primary onClick={handleSubmit} mr={3}>Save</Primary>
                <Button onClick={onClose}>Cancel</Button>
            </ModalFooter>
        </MyModal>
    </>
}

export default AddDepartment