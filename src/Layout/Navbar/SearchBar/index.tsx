import { SearchIcon } from '@chakra-ui/icons';
import { Button, Divider, Flex, Input, Kbd, Icon, List, Text, useColorMode, useDisclosure, VStack, useColorModeValue } from '@chakra-ui/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import MyModal from '../../../Components/micro/MyModal';
import {
    baseDepartmentAtom,
    EnvListAtom,
    equipmentsAtom,
    factoriesAtom,
    isMasterAdminAtom,
    machinesAtom,
    roleAtom,
    selectedFactoryAtom,
    uidAtom,
} from '../../../Components/Store/atoms';
import Listen from '../../../Components/Store/hooks/Listen';
import { getScopedAssetMap, isAdminUser, isMasterOwner } from '../../../Services/rbac';
import routes from '../../routes';
import { BsArrowReturnLeft } from 'react-icons/bs';
import { FaCogs, FaFile, FaCog, FaTemperatureHigh } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import search from './searchResults';
import { RiDonutChartFill } from 'react-icons/ri';

interface SearchResult {
    title: string;
    path: string;
    type: "route" | "machine" | "equipment" | "environment" | "production";
}

const SearchBar = () => {
    const inputRef = useRef(null);
    const navigate = useNavigate();
    const { onClose, isOpen, onOpen } = useDisclosure();
    const { colorMode } = useColorMode();
    const linkBgColor = useColorModeValue("gray.100", "whiteAlpha.200");
    const { iconColor } = useMemo(() => {
        return {
            iconColor: `${colorMode}.navIcon`,
        };
    }, [colorMode]);
    const [activeIndex, setActiveIndex] = useState(0);
    const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const machines = Listen(machinesAtom);
    const equipments = Listen(equipmentsAtom);
    const envs = Listen(EnvListAtom);
    const factories = Listen(factoriesAtom);
    const selectedFactory = Listen(selectedFactoryAtom);
    Listen(roleAtom);
    Listen(isMasterAdminAtom);
    const baseDeptsRaw = Listen(baseDepartmentAtom) as string[] | null;
    const baseDepts = useMemo(() => baseDeptsRaw || [], [baseDeptsRaw]);
    const uid = Listen(uidAtom);
    const mySearchDirectory: SearchResult[] = useMemo(() => {
        if (!machines || !equipments || !envs) return [];
        const mySelectedFactory = selectedFactory && factories ? (factories as any)[selectedFactory.value] : undefined;
        const scopedMachines = getScopedAssetMap(machines, mySelectedFactory, "machines");
        const scopedEquipments = getScopedAssetMap(equipments, mySelectedFactory, "equipments");
        const scopedEnvs = getScopedAssetMap(envs, mySelectedFactory, "envs");
        const canOpenSettings = isAdminUser(uid);
        const canOpenCostIntelligence = isMasterOwner(uid) || (isAdminUser(uid) && baseDepts.includes("all"));
        const results: SearchResult[] = [];
        Object.entries(routes).forEach(([path, route]) => {
            if (route.invisible) return;
            if (path === "/settings" && !canOpenSettings) return;
            if (path === "/reports/cost-intelligence" && !canOpenCostIntelligence) return;
            results.push({
                title: route.title,
                path,
                type: "route"
            });
        });
        Object.entries(scopedMachines).forEach(([id, name]) => {
            results.push({
                title: name as string,
                path: `/machines/${id}`,
                type: "machine"
            });
            results.push({
                title: name as string + " (Production)",
                path: `/targets/target/${id}`,
                type: "production"
            });
        });
        Object.entries(scopedEquipments).forEach(([id, name]) => {
            results.push({
                title: name as string,
                path: `/equipments/${id}`,
                type: "equipment"
            });
        });
        Object.entries(scopedEnvs).forEach(([id, name]) => {
            results.push({
                title: name as string,
                path: `/environments/${id}`,
                type: "environment"
            });
        });
        return results;
    }, [machines, equipments, envs, factories, selectedFactory, baseDepts, uid]);

    const open = useCallback(() => {
        setSearchTerm("");
        onOpen();
    }, [onOpen]);


    useEffect(() => {
        const listener = (e: KeyboardEvent) => {
            if (e.ctrlKey && e.key === "k") {
                e.preventDefault();
                open();
            }
        }
        window.addEventListener("keydown", listener);

        return () => {
            window.removeEventListener("keydown", listener);
        }
    }, [open]);

    useEffect(() => {
        if (mySearchDirectory?.length === 0) return;
        let results: SearchResult[] = [];
        if (searchTerm.length >= 2) {
            results = search(mySearchDirectory, searchTerm);
        }
        setActiveIndex(0);
        setSearchResults(results);
    }, [searchTerm, mySearchDirectory]);

    const handleKeyDownOnSearchBar = (e: any) => {
        if (e.key === "ArrowDown") {
            e.preventDefault();
            if (activeIndex < searchResults.length - 1) {
                setActiveIndex(activeIndex + 1);
            }
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            if (activeIndex > 0) {
                setActiveIndex(activeIndex - 1);
            }
        } else if (e.key === "Enter") {
            navigate(searchResults[activeIndex].path);
            onClose();
        }
    }

    const _goto = (path: string) => {
        navigate(path);
        onClose();
    }

    return <>
        <Button
            gap={3}
            color={iconColor}
            onClick={open}
            ml={{ md: 3, lg: 5, xl: 7 }}
            px={{ md: 3, lg: 4 }}
            display={{ base: 'none', md: 'flex' }}
            w={{ md: "auto", lg: "220px", xl: "300px" }}
            minW={0}
            flexShrink={1}
            aria-label="Search">
            <SearchIcon />
            <Flex w="100%" justifyContent={"space-between"} display={{ base: "none", lg: "flex" }}>
                <Text fontWeight={400}>Search...</Text>
                <Flex gap={1}>
                    <Kbd>Ctrl</Kbd><Kbd>K</Kbd>
                </Flex>
            </Flex>
        </Button>
        <MyModal
            initialFocusRef={inputRef}
            size="xl"
            isOpen={isOpen}
            onClose={onClose}>
            <VStack
                w="100%"
                p={5}
                divider={
                    <Divider orientation="horizontal" />
                }>
                <Flex
                    w="100%"
                    gap={6}
                    py={2}>
                    <SearchIcon fontSize="xl" color="primary" />
                    <Input
                        onKeyDown={handleKeyDownOnSearchBar}
                        onChange={(e) => {
                            setSearchTerm(e.target.value);
                        }}
                        value={searchTerm}
                        focusBorderColor={"primary"}
                        ref={inputRef}
                        placeholder='Search...'
                        variant={"unstyled"}
                    />
                </Flex>
                {searchResults.length > 0 && <List
                    overflowY="auto"
                    maxH="70vh"
                    w="100%">
                    {searchResults.map((result, index) => <Flex
                        cursor={"pointer"}
                        onMouseEnter={() => {
                            setActiveIndex(index);
                        }}
                        gap={5}
                        bgColor={activeIndex === index ? "primary" : linkBgColor}
                        color={activeIndex === index ? "white" : undefined}
                        my={3}
                        p={5}
                        borderRadius={10}
                        key={index}
                        onClick={() => {
                            _goto(result.path);
                        }}
                        justifyContent="space-between"
                        alignItems="center">
                        <Icon
                            opacity={0.7}
                            fontSize="xl"
                            as={
                                result.type === "route" ? FaFile
                                    : result.type === "machine" ? FaCogs
                                    : result.type === "environment" ? FaTemperatureHigh
                                    : result.type === "production" ? RiDonutChartFill
                                        : FaCog
                            } />
                        <VStack
                            spacing={0}
                            w="100%"
                            alignItems={"flex-start"}>
                            <Text
                                fontSize="sm" opacity={0.5} dangerouslySetInnerHTML={{
                                    __html: result.path.replace(new RegExp(searchTerm, "gi"), (match) => `<span style="text-decoration: underline;">${match}</span>`)
                                }} />
                            <Text
                                pl={1} fontWeight={600} dangerouslySetInnerHTML={{
                                    __html: result.title.replace(new RegExp(searchTerm, "gi"), (match) => `<span style="text-decoration: underline;">${match}</span>`)
                                }} />
                        </VStack>
                        <Icon
                            opacity={0.7}
                            fontSize="xl"
                            as={BsArrowReturnLeft} />
                    </Flex>)}
                </List>}
            </VStack>
        </MyModal>
    </>
}
export type { SearchResult };
export default SearchBar;