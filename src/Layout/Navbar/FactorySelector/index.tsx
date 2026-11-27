import { Popover, PopoverTrigger, PopoverContent, PopoverBody, Stack, Text, useDisclosure, useColorMode, Flex } from "@chakra-ui/react";
import { useEffect, useMemo, useState } from "react";
import { IoIosArrowDown } from "react-icons/io";
import store from "../../../Components/Store";
import {
    baseDepartmentAtom,
    EnvListAtom,
    equipmentsAtom,
    factoriesAtom,
    isMasterAdminAtom,
    machinesAtom,
    selectedFactoryAtom,
    uidAtom,
} from "../../../Components/Store/atoms";
import Listen from "../../../Components/Store/hooks/Listen";
import { getAccessibleFactoryIndices, isMasterOwner } from "../../../Services/rbac";

interface selectedFactoryType {
    name: string;
    value: number;
    only: boolean;
}

const FactorySelector = () => {
    const { isOpen, onOpen, onClose } = useDisclosure();
    const { colorMode } = useColorMode();
    const { popoverContentBgColor, hoverColor } = useMemo(() => {
        return {
            popoverContentBgColor: `${colorMode}.popoverContentBgColor`,
            hoverColor: `${colorMode}.popOverHoverColor`
        }
    }, [colorMode]);
    const [factory, setFactory] = useState<selectedFactoryType | null>(null);
    const [factories, setFactories] = useState<selectedFactoryType[] | null>(null);
    const selectedFactory: selectedFactoryType = Listen(selectedFactoryAtom);
    const _factories = Listen(factoriesAtom);
    const machines = Listen(machinesAtom);
    const equipments = Listen(equipmentsAtom);
    const envs = Listen(EnvListAtom);
    const baseDepts = Listen(baseDepartmentAtom) as string[] | null;
    Listen(isMasterAdminAtom);
    const uid = Listen(uidAtom);

    const changeFactory = (id: number) => {
        if (!factories) return;
        const factory = factories.find(factory => factory.value === id);
        if (!factory) return;
        store.set(selectedFactoryAtom, factory);
        localStorage.setItem('selectedFactory', JSON.stringify(factory));
        setFactory(factory);
    };

    useEffect(() => {
        if (!selectedFactory || !_factories || selectedFactory.only) {
            setFactory(null);
            setFactories(null);
            return;
        }
        const hasAllScope = isMasterOwner(uid) || (baseDepts || []).includes("all");
        const accessibleIndices = getAccessibleFactoryIndices(_factories, machines, equipments, envs, hasAllScope);
        if (accessibleIndices.length <= 1) {
            setFactory(null);
            setFactories(null);
            return;
        }
        setFactory(selectedFactory);
        const list: selectedFactoryType[] = [
            { name: "Total", value: -1, only: false },
            ...accessibleIndices.map((idx) => ({
                name: ((_factories as any)[idx]?.info?.company_name as string) || `Factory ${idx + 1}`,
                value: idx,
                only: false
            }))
        ];
        setFactories(list);
    }, [selectedFactory, _factories, machines, equipments, envs, baseDepts, uid]);

    return <>
        {(factory && factories) && <Flex
            gap={1}
            alignItems={"center"}>
            <Text
                opacity={0.9}
                fontWeight="bold"
                letterSpacing={"wider"}
                fontSize="xs">Factory:</Text>
            <Popover
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
                        cursor="pointer">{factory.name} <IoIosArrowDown /></Text>
                </PopoverTrigger>
                <PopoverContent
                    border={0}
                    boxShadow={'xl'}
                    bg={popoverContentBgColor}
                    p={1.5}
                    rounded={'md'}
                    maxW={'max-content'}>
                    <PopoverBody>
                        {(factories).map((item) => <Stack key={item.value}>
                            <Text
                                onClick={() => {
                                    onClose();
                                    changeFactory(item.value);
                                }}
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
                                letterSpacing={"wider"}>{item.name}</Text>
                        </Stack>
                        )}
                    </PopoverBody>
                </PopoverContent>
            </Popover>
        </Flex>}
    </>
}

export default FactorySelector