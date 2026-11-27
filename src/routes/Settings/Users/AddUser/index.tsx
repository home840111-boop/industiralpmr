import { Button, FormControl, FormErrorMessage, FormLabel, HStack, Icon, ModalBody, ModalCloseButton, ModalFooter, ModalHeader, Select, useDisclosure, useToast, VStack } from "@chakra-ui/react";
import { FormEvent, useState } from "react";
import { FiUserPlus } from "react-icons/fi";
import PasswordReauthModal from "../../../../Components/Auth/PasswordReauthModal";
import Primary from "../../../../Components/Buttons/Primary";
import { PrimaryInput } from "../../../../Components/Inputs";
import SearchableSelector from "../../../../Components/Inputs/SearchableSelector";
import BackdropLoader from "../../../../Components/Loaders/BackdropLoader";
import MyModal from "../../../../Components/micro/MyModal";
import {
    baseDepartmentAtom,
    departmentsAtom,
    EnvListAtom,
    equipmentsAtom,
    isMasterAdminAtom,
    machinesAtom,
    roleAtom,
    uidAtom,
} from "../../../../Components/Store/atoms";
import Listen from "../../../../Components/Store/hooks/Listen";
import { getManageableDepartmentNames, isMasterOwner } from "../../../../Services/rbac";
import { ErrorsType } from "../types";

const AddUserModal = ({
    disabled = false,
    refetch
}: {
    disabled?: boolean,
    refetch: any
}) => {
    const toast = useToast();
    const { isOpen, onOpen, onClose } = useDisclosure();
    const disClosure2 = useDisclosure();
    const is2Open = disClosure2.isOpen;
    const on2Open = disClosure2.onOpen;
    const on2Close = disClosure2.onClose;
    const [loading, setLoading] = useState<string | null>(null);
    const [errors, setErrors] = useState<ErrorsType>({
        name: null,
        email: null,
        department: null,
        role: null,
        password: null,
        confirmPassword: null
    });
    const [departmentsSelected, setDepartmentsSelected] = useState<string[]>([]);
    const [form, setForm] = useState<FormData | null>(null);
    const departments = Listen(departmentsAtom) || {};
    const masterUid = Listen(uidAtom);
    Listen(isMasterAdminAtom);
    Listen(roleAtom);
    const baseDepts = Listen(baseDepartmentAtom);
    Listen(machinesAtom);
    Listen(equipmentsAtom);
    Listen(EnvListAtom);

    const callerIsMaster = isMasterOwner(masterUid);
    const callerHasAll = callerIsMaster || (baseDepts || []).includes("all");
    const manageableDepts = getManageableDepartmentNames(departments);
    const departmentOptions = (callerHasAll ? ["all", ...Object.keys(departments)] : manageableDepts)
        .map((department) => ({ label: department.toUpperCase(), value: department }));

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        import("./handlers").then(resp => {
            const formData = new FormData(e.target as HTMLFormElement);
            formData.set("department", departmentsSelected.join("||"));
            setForm(formData);
            resp.verify(formData, onClose, on2Open, setErrors, setLoading);
        });
    };

    const createUser = () => {
        if (!form) return;
        import("./handlers").then(async resp => {
            try {
                await resp.createUser(setLoading, form);
                setDepartmentsSelected([]);
                setForm(null);
                toast({
                    title: "Success",
                    description: "User has been created.",
                    status: "success",
                    duration: 5000,
                    isClosable: true
                });
                refetch((prev: boolean) => !prev);
            } catch (err: any) {
                console.error(err);
                toast({
                    title: "Error",
                    description: err?.message || String(err),
                    status: "error",
                    duration: 5000,
                    isClosable: true
                });
            }
        });
    };

    return <>
        {loading && <BackdropLoader text={loading} />}
        <Primary size="sm" mt={5} onClick={onOpen} isDisabled={disabled}>Add User<Icon ml={2} as={FiUserPlus} /></Primary>
        <MyModal
            size={"xl"}
            isOpen={isOpen}
            onClose={onClose}
            closeOnOverlayClick={false}>
            <form onSubmit={handleSubmit} autoComplete="false">
                <ModalHeader>Add Sub-user</ModalHeader>
                <ModalCloseButton />
                <ModalBody pb={6}>
                    <VStack gap={4}>
                        <FormControl isRequired isInvalid={errors.name !== null}>
                            <FormLabel>Name</FormLabel>
                            <PrimaryInput name="name" placeholder='User Name' />
                            <FormErrorMessage>{errors.name}</FormErrorMessage>
                        </FormControl>
                        <FormControl isRequired isInvalid={errors.email !== null}>
                            <FormLabel>Email</FormLabel>
                            <PrimaryInput name="email" placeholder='your-email@example.com' />
                            <FormErrorMessage>{errors.email}</FormErrorMessage>
                        </FormControl>
                        <HStack w='100%'>
                            <FormControl isInvalid={errors.department !== null}>
                                <FormLabel>Department</FormLabel>
                                <SearchableSelector
                                    closeMenuOnSelect={false}
                                    value={departmentsSelected.map((d) => ({ label: d.toUpperCase(), value: d }))}
                                    onChange={e => setDepartmentsSelected((e || []).map((item: any) => item.value))}
                                    isMulti
                                    placeholder="Select Departments"
                                    options={departmentOptions}
                                />
                                <FormErrorMessage>{errors.department}</FormErrorMessage>
                            </FormControl>
                            <FormControl isInvalid={errors.role !== null}>
                                <FormLabel>Role</FormLabel>
                                <Select name="role" focusBorderColor="primary">
                                    <option value="viewer">Viewer</option>
                                    <option value="editor">Editor</option>
                                    {callerIsMaster && <option value="admin">Admin</option>}
                                </Select>
                                <FormErrorMessage>{errors.role}</FormErrorMessage>
                            </FormControl>
                        </HStack>
                        <FormControl isRequired isInvalid={errors.password !== null}>
                            <FormLabel>Password</FormLabel>
                            <PrimaryInput type="password" name="password" placeholder='Password' />
                            <FormErrorMessage>{errors.password}</FormErrorMessage>
                        </FormControl>
                        <FormControl isRequired isInvalid={errors.confirmPassword !== null}>
                            <FormLabel>Confirm Password</FormLabel>
                            <PrimaryInput type="password" name="confirmPassword" placeholder='Password' />
                            <FormErrorMessage>{errors.confirmPassword}</FormErrorMessage>
                        </FormControl>
                    </VStack>
                </ModalBody>
                <ModalFooter>
                    <Primary type="submit" mr={3}>Save</Primary>
                    <Button onClick={onClose}>Cancel</Button>
                </ModalFooter>
            </form>
        </MyModal>
        <PasswordReauthModal isOpen={is2Open} onClose={on2Close} callback={createUser} />
    </>
}

export default AddUserModal