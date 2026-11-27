import { Badge, Box, Button, Flex, FormControl, FormErrorMessage, FormLabel, HStack, ModalBody, ModalCloseButton, ModalFooter, ModalHeader, Select, Switch, useDisclosure, useToast, VStack } from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { FiEdit } from "react-icons/fi";
import { HiOutlineKey } from "react-icons/hi";
import PasswordReauthModal from "../../../../Components/Auth/PasswordReauthModal";
import Primary from "../../../../Components/Buttons/Primary";
import { PrimaryInput } from "../../../../Components/Inputs";
import SearchableSelector from "../../../../Components/Inputs/SearchableSelector";
import BackdropLoader from "../../../../Components/Loaders/BackdropLoader"
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
import { ErrorsType, userType } from "../types";
import DeleteUser from "./DeleteUser";

// remove passwordd and confirm password from ErrorsType type
type myErrorsType = Omit<ErrorsType, "password" | "confirmPassword">;

const EditUser = ({
    user,
    refetch
}: {
    user: userType,
    refetch: Function
}) => {
    const toast = useToast();
    const { isOpen, onOpen, onClose } = useDisclosure();
    const reauth = useDisclosure();
    const [pendingFormData, setPendingFormData] = useState<FormData | null>(null);
    const [loading, setLoading] = useState<string | null>(null);
    const [errors, setErrors] = useState<myErrorsType>({
        name: null,
        email: null,
        department: null,
        role: null
    });
    const departments = Listen(departmentsAtom) || {};
    const masterUid = Listen(uidAtom);
    Listen(isMasterAdminAtom);
    Listen(roleAtom);
    const baseDepts = Listen(baseDepartmentAtom);
    Listen(machinesAtom);
    Listen(equipmentsAtom);
    Listen(EnvListAtom);
    const [myUser, setMyUser] = useState<userType>(user);

    useEffect(() => {
        if (isOpen) {
            setMyUser(user);
            setPendingFormData(null);
        }
    }, [isOpen, user]);

    const callerIsMaster = isMasterOwner(masterUid);
    const callerHasAll = callerIsMaster || (baseDepts || []).includes("all");
    const manageableDepts = getManageableDepartmentNames(departments);
    const departmentOptions = (callerHasAll ? ["all", ...Object.keys(departments)] : manageableDepts)
        .map((department) => ({ label: department.toUpperCase(), value: department }));

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formEl = e.target as HTMLFormElement;
        import("./handlers").then(resp => {
            const formData = new FormData(formEl);
            formData.set("department", myUser.department.join("||"));
            if (resp.validateEditUser(formData, setErrors)) {
                setPendingFormData(formData);
                reauth.onOpen();
            }
        });
    };

    const confirmEditUser = () => {
        if (!pendingFormData) return;
        const formData = pendingFormData;
        setPendingFormData(null);
        import("./handlers").then(resp => {
            resp.editUser(formData, onClose, setErrors, setLoading, toast, refetch, user.uid);
        });
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | any>) => {
        const { name, value, checked } = e.target;
        if (name === 'disabled') setMyUser(prev => ({
            ...prev,
            disabled: !checked
        }));
        else if (name === 'department') setMyUser(prev => ({
            ...prev,
            department: value
        }));
        else setMyUser(prev => ({
            ...prev,
            [name]: value
        }));
    }

    const resetPassword = async () => {
        setLoading("Sending reset password email...");
        try {
            import("./handlers").then(async resp => {
                try {
                    await resp.sendResetEmail(user.email);
                    toast({
                        title: "Reset Password Email Sent.",
                        description: `We've sent a reset password email to ${user.email}.`,
                        status: "success",
                        duration: 5000,
                        isClosable: true
                    })
                    setLoading(null);
                    onClose();
                } catch (err: any) {
                    console.error(err.message);
                    toast({
                        title: "Error",
                        description: err.message,
                        status: "error",
                        duration: 5000,
                        isClosable: true
                    });
                    setLoading(null);
                }
            });
        } catch (err) {
            console.error(err);
            toast({
                title: "Error",
                description: `An unexpected error occurred, contact support.`,
                status: "error",
                duration: 5000,
                isClosable: true
            });
            setLoading(null);
        }
    }

    return <>
        {loading && <BackdropLoader text={loading} />}
        <Button w="100%" size="xs" rightIcon={<FiEdit />} onClick={onOpen}>Edit</Button>
        <MyModal
            size={"xl"}
            isOpen={isOpen}
            onClose={onClose}
            closeOnOverlayClick={false}>
            <form onSubmit={handleSubmit} autoComplete="false">
                <ModalHeader>Edit Sub-user</ModalHeader>
                <ModalCloseButton />
                <ModalBody pb={6}>
                    <VStack gap={4}>
                        <FormControl isRequired isInvalid={errors.name !== null}>
                            <FormLabel>Name</FormLabel>
                            <PrimaryInput onChange={handleChange} value={myUser.name} name="name" placeholder='User Name' />
                            <FormErrorMessage>{errors.name}</FormErrorMessage>
                        </FormControl>
                        <FormControl isRequired isInvalid={errors.email !== null}>
                            <FormLabel>Email</FormLabel>
                            <PrimaryInput onChange={handleChange} value={myUser.email} name="email" placeholder='your-email@example.com' />
                            <FormErrorMessage>{errors.email}</FormErrorMessage>
                        </FormControl>
                        <HStack w='100%'>
                            <FormControl isInvalid={errors.department !== null}>
                                <FormLabel>Department</FormLabel>
                                <SearchableSelector closeMenuOnSelect={false} value={myUser.department.map((department) => ({ label: department.toUpperCase(), value: department }))} onChange={e => handleChange({
                                    target: {
                                        name: "department",
                                        value: (e || []).map((item: any) => item.value)
                                    }
                                } as React.ChangeEvent<HTMLInputElement | HTMLSelectElement | any>)} isMulti placeholder="Select Departments" options={departmentOptions} />
                                <FormErrorMessage>{errors.department}</FormErrorMessage>
                            </FormControl>
                            <FormControl isInvalid={errors.role !== null}>
                                <FormLabel>Role</FormLabel>
                                <Select onChange={handleChange} value={myUser.role} name="role" focusBorderColor="primary">
                                    <option value="viewer">Viewer</option>
                                    <option value="editor">Editor</option>
                                    {callerIsMaster && <option value="admin">Admin</option>}
                                </Select>
                                <FormErrorMessage>{errors.role}</FormErrorMessage>
                            </FormControl>
                        </HStack>
                        <HStack w='100%'>
                            <FormControl isInvalid={errors.department !== null}>
                                <FormLabel htmlFor='disabled' mb="5">Account Status</FormLabel>
                                <HStack justifyContent={"space-between"}>
                                    <Badge
                                        fontSize="sm"
                                        colorScheme={
                                            myUser.disabled ? "red" : "green"
                                        }>{
                                            myUser.disabled ? "Disabled" : "Active"
                                        }</Badge>
                                    <Switch onChange={handleChange} colorScheme={'orange'} id='disabled' name="disabled" isChecked={!myUser.disabled} pr="30px" />
                                </HStack>
                                <FormErrorMessage>{errors.department}</FormErrorMessage>
                            </FormControl>
                            <FormControl isInvalid={errors.role !== null}>
                                <FormLabel>Password Action</FormLabel>
                                <Button variant={"outline"} colorScheme="orange" size="sm" rightIcon={<HiOutlineKey />} onClick={resetPassword}>
                                    Reset Password
                                </Button>
                                <FormErrorMessage>{errors.role}</FormErrorMessage>
                            </FormControl>
                        </HStack>
                    </VStack>
                </ModalBody>
                <ModalFooter>
                    <Flex alignItems={"center"} justifyContent="space-between" w="100%">
                        <DeleteUser user={user} refetch={refetch} close={onClose} />
                        <Box>
                            <Primary type="submit" mr={3}>Save</Primary>
                            <Button onClick={onClose}>Cancel</Button>
                        </Box>
                    </Flex>
                </ModalFooter>
            </form>
        </MyModal>
        <PasswordReauthModal
            isOpen={reauth.isOpen}
            onClose={reauth.onClose}
            callback={confirmEditUser}
            description={`For security, enter your account password to update ${user.name}.`}
        />
    </>
}

export default EditUser