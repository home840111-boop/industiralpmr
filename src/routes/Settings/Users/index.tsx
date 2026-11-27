import { Avatar, Badge, Box, Button, Center, Flex, Text, useColorMode, VStack } from "@chakra-ui/react";
import { useEffect, useMemo, useState } from "react";
import { FiActivity, FiUsers } from "react-icons/fi";
import MyCard from "../../../Components/micro/Card";
import NotFound from "../../../Components/micro/NotFound";
import AddUserModal from "./AddUser";
import { userType } from "./types";
import fetch from "./fetch";
import { SmallFill } from "../../../Components/Loaders";
// import { auth } from "../../../Components/firebase";
// import Get from "../../../Components/Store/hooks/Get";
// import { uidAtom } from "../../../Components/Store/atoms";
import EditUser from "./EditUser";
import Listen from "../../../Components/Store/hooks/Listen";
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
import {
    canManageSubUser,
    getManageableDepartmentNames,
    isAdminUser,
    isMasterOwner,
} from "../../../Services/rbac";
import ActivityModal from "./ActivityModal";

const Users = () => {
    const { colorMode } = useColorMode();
    const { text, subText, border } = useMemo(() => ({
        text: `${colorMode}.text`,
        subText: `${colorMode}.subText`,
        border: `${colorMode}.border`
    }), [colorMode]);
    const masterUid = Listen(uidAtom);
    Listen(roleAtom);
    Listen(isMasterAdminAtom);
    const departments = Listen(departmentsAtom);
    const baseDepts = Listen(baseDepartmentAtom);
    Listen(machinesAtom);
    Listen(equipmentsAtom);
    Listen(EnvListAtom);

    const [users, setUsers] = useState<userType[] | null>(null);
    const [fetchAgain, setFetchAgain] = useState<boolean>(false);
    const hasAccess = isAdminUser(masterUid);
    const callerIsMaster = isMasterOwner(masterUid);
    const callerHasAll = callerIsMaster || (baseDepts || []).includes("all");
    const manageableDepts = getManageableDepartmentNames(departments);
    const visibleUsers = users === null
        ? null
        : users.filter(u =>
            canManageSubUser(u, manageableDepts, callerIsMaster, callerHasAll)
        );

    useEffect(() => {
        if (!hasAccess) return;
        const func = async () => {
            await fetch(setUsers);
        };
        func();

    }, [hasAccess, fetchAgain])


    return <>
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
                <Text fontSize="lg" fontWeight={500} color={text}>Users</Text>
                <Text fontSize="sm" color={subText} mt={3}>
                    Manage user accounts and access privileges. Customize roles, permissions, and restrictions. Improve security with custom access rules.
                </Text>
                <Flex gap={3}>
                    <AddUserModal disabled={!hasAccess} refetch={setFetchAgain} />
                    <ActivityModal uid="all" allowedUids={callerIsMaster ? undefined : (visibleUsers || []).map(u => u.uid)}>
                        <Button mt={5} isDisabled={!hasAccess} size="sm" colorScheme="orange" variant="outline" rightIcon={<FiActivity />}>All Activity</Button>
                    </ActivityModal>
                </Flex>
            </Box>
            <MyCard
                h="fit-content"
                w={"100%"}
                p={0}>
                {hasAccess ?
                    visibleUsers === null ?
                        <Center h="200px">
                            <SmallFill />
                        </Center>
                        : visibleUsers.length ? visibleUsers.map((user, index) => <Flex
                            key={index}
                            w={"100%"}
                            py={5}
                            px={7}
                            _notLast={{
                                borderBottom: "1px solid",
                                borderColor: border
                            }}>
                            <Flex
                                flexDir={{
                                    base: "column",
                                    md: "row"
                                }}
                                gap={{
                                    base: 5,
                                    md: 10
                                }}
                                w={"100%"}
                                justifyContent="space-between">
                                <Flex gap={5} alignItems="center">
                                    <Avatar />
                                    <Flex
                                        direction="column"
                                        gap={1}>
                                        <Text fontSize="sm" fontWeight={500} color={text}>{user.name}
                                            <Badge ml='2' colorScheme={
                                                user.disabled ? "red" : "green"
                                            } textTransform={"capitalize"}>
                                                {user.disabled ? "disabled" : "active"}
                                            </Badge>
                                        </Text>
                                        <Text fontSize="xs" color={subText}>{user.email}</Text>
                                        <Text fontSize="xs" color={subText}>
                                            <strong>last login: </strong>
                                            {user.lastLogin}
                                        </Text>
                                    </Flex>
                                </Flex>
                                <Flex gap={10} alignItems="center">
                                    <VStack alignItems={"flex-start"}>
                                        <Text fontSize="sm" textTransform={"capitalize"}>
                                            Role: <strong>{user.role}</strong>
                                        </Text>
                                        <Text fontSize="sm" textTransform={"capitalize"}>
                                            Department: <strong>{user.department.join(", ")}</strong>
                                        </Text>
                                    </VStack>
                                    <VStack>
                                        <EditUser user={user} refetch={setFetchAgain} />
                                        <ActivityModal uid={user.uid}>
                                            <Button size="xs" colorScheme={"orange"} variant={"outline"} rightIcon={<FiActivity />}>Activity</Button>
                                        </ActivityModal>
                                    </VStack>
                                </Flex>
                            </Flex>
                        </Flex>
                        ) : <NotFound h="150px" text={"No Users Found"} icon={FiUsers} />
                    : <NotFound h="150px" text={"Unauthorized access"} icon={FiUsers} />}
            </MyCard>
        </Flex>
    </>
}

export default Users