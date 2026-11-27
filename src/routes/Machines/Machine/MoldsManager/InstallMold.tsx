import { ArrowDownIcon, DeleteIcon } from "@chakra-ui/icons";
import { Box, Button, Checkbox, Flex, FormControl, FormLabel, GridItem, Heading, HStack, IconButton, Progress, SimpleGrid, Text, useColorMode, useToast, VStack } from "@chakra-ui/react";
import dayjs from "../../../../Components/Functions/dayjs";
import { useEffect, useMemo, useState } from "react";
import { FaArrowUp, FaEdit, FaRegBell, FaTimes } from "react-icons/fa";
import { FiSave } from "react-icons/fi";
import { MyRawMaterial } from ".";
import { PrimaryBtn } from "../../../../Components/Buttons";
import { get, remove, update } from "../../../../Components/firebase/api/db";
import weightFormatterFunc from "../../../../Components/Functions/formatters/weightFormatter";
import { PrimaryInput } from "../../../../Components/Inputs";
import SearchableSelector from "../../../../Components/Inputs/SearchableSelector";
import BackdropLoader from "../../../../Components/Loaders/BackdropLoader";
import ConfirmDialog from "../../../../Components/micro/ConfirmDialog";
import logger from "../../../../Components/micro/logger";
import MinifiedNumberFormatter from "../../../../Components/micro/MinifiedNumberFormatter";
import MyPopover from "../../../../Components/micro/MyPopover";
import MyTooltip from "../../../../Components/micro/MyTooltip";
import NotFound from "../../../../Components/micro/NotFound";
import NumberFormatter from "../../../../Components/micro/NumberFormatter";
import sendDataRest from "../../../../Components/micro/sendDataRest";
import UnitFormatter from "../../../../Components/micro/UnitFormatter";
import { factoryProductionType } from "../../../../Components/Store/atoms";
import { Mold } from "../types";
import EditMold from "./EditMold";



const InstallMold = ({
    molds,
    installedMold,
    productionType,
    machineID,
    materials,
    setMounted
}: {
    molds: Mold[],
    installedMold: Mold | null,
    materials: MyRawMaterial[],
    machineID?: string,
    productionType: factoryProductionType | null,
    setMounted: (mounted: boolean) => void
}) => {
    const { colorMode } = useColorMode();
    const { border, subText, text } = useMemo(() => ({
        border: `${colorMode}.border`,
        subText: `${colorMode}.subText`,
        text: `${colorMode}.text`,
    }), [colorMode]);
    const toast = useToast();
    const [selectedMold, setSelectedMold] = useState<Mold | null>(installedMold);
    useEffect(() => {
        if (!installedMold) return;
        if (selectedMold === null || selectedMold.name === installedMold.name) setSelectedMold(installedMold);
        else for (let mold of molds) if (mold.name === selectedMold.name) setSelectedMold(mold);
    }, [installedMold, selectedMold, molds]);
    const [loading, setLoading] = useState<string | null>(null);
    const allowInstallAndDelete = useMemo(() => {
        if (!selectedMold) return false;
        return selectedMold.name !== installedMold?.name && selectedMold.isInstalled === false;
    }, [selectedMold, installedMold]);
    const allowMoldUninstall = useMemo(() => {
        if (!selectedMold) return false;
        return selectedMold.name === installedMold?.name;
    }, [selectedMold, installedMold]);
    const [installNow, setInstallNow] = useState<boolean>(true);
    const [installationTime, setInstallationTime] = useState<Date>(new Date());
    const [unit, setUnit] = useState<number | null>(null);
    const [moldLife, setMoldLife] = useState<number>(0);
    const [shotAlertThreshold, setShotAlertThreshold] = useState<number>(0);
    useEffect(() => {
        if (!selectedMold) return;
        setMoldLife(selectedMold.moldLife);
        setShotAlertThreshold(selectedMold.shotAlertThreshold);
    }, [selectedMold]);
    const now = useMemo(() => new Date(), []);

    const deleteMold = async () => {
        if (!machineID || !selectedMold) return;
        setLoading("Deleting mold");
        try {
            logger("delete-mold", {
                machineID,
                moldName: selectedMold.name
            });
            await remove(`molds/${machineID}/${selectedMold.name}`);
            setSelectedMold(null);
            setMounted(false);
            toast({
                title: "Success",
                description: "Mold deleted successfully",
                status: "success",
                duration: 5000,
                isClosable: true,
                position: "bottom"
            });
        } catch (err: any) {
            toast({
                title: "Error",
                description: err.message,
                status: "error",
                duration: 5000,
                isClosable: true,
                position: "bottom"
            })
        }
        setLoading(null);
    };

    const verifyMoldParams = (mold: Mold) => {
        // verify mold has all the required params
        if (!mold) throw new Error("Mold not found");
        if (!mold.name) throw new Error("Mold name not found");
        if (mold.cavities === undefined) throw new Error("Mold cavities not found");
        if (mold.productName === undefined) throw new Error("Mold product name not found");
        if (mold.productColor === undefined) throw new Error("Mold product color not found");
        if (!mold.materials) throw new Error("Mold materials not found");
        if (!mold.materials.length) throw new Error("Mold materials not found");
        for (let material of mold.materials) {
            if (!material.name) throw new Error("Material name not found");
            if (material.weight === undefined) throw new Error("Material weight not found");
        }
    };

    const installMold = async (mold?: Mold) => {
        if (!machineID || !selectedMold) return;
        setLoading("Installing mold");
        try {
            verifyMoldParams(mold || selectedMold);
            const payload = {
                installedMold: mold ? {
                    ...mold,
                    name: mold.name,
                } : {
                    ...selectedMold,
                    name: selectedMold.name,
                },
                mold_start_time: mold ? dayjs(now).unix() : dayjs(installNow ? now : installationTime).unix()
            };
            let _unit;
            if (unit === null) {
                const snap = await get(`machines/${machineID}/unit`);
                _unit = +snap.val() || 1;
                setUnit(_unit);
            } else _unit = unit;
            logger("install-mold", {
                machineID,
                data: payload
            });
            const resp = await sendDataRest(_unit, [
                "machine",
                machineID,
                payload,
                undefined,
            ]);
            if (resp === 401) throw new Error("Permission Denied");
            else if (resp !== 200) throw new Error("Something went wrong");
            const promises = [update(`molds/${selectedMold.isUniversal ? "UNIVERSAL_MOLDS" : machineID}/${selectedMold.name}`, {
                isInstalled: true
            })];
            if (installedMold !== null) promises.push(update(`molds/${installedMold.isUniversal ? "UNIVERSAL_MOLDS" : machineID}/${installedMold.name}`, {
                isInstalled: false
            }));
            await Promise.all(promises);
            setSelectedMold(null);
            setMounted(false);
            toast({
                title: "Success",
                description: "Mold installed successfully",
                status: "success",
                duration: 5000,
                isClosable: true,
                position: "bottom"
            });
        } catch (err: any) {
            toast({
                title: "Error",
                description: err.message,
                status: "error",
                duration: 5000,
                isClosable: true,
                position: "bottom"
            })
        }
        setLoading(null);
    };

    const resetConsumption = async () => {
        if (!machineID || !selectedMold) return;
        setLoading("Resetting consumption");
        try {
            await remove(`molds/${machineID}/${selectedMold.name}/stats/avgShotConsumption`);
            setSelectedMold({
                ...selectedMold,
                consumptionAvg: {
                    value: 0,
                    change: 0
                }
            });
            setMounted(false);
            toast({
                title: "Success",
                description: "Consumption resetted successfully",
                status: "success",
                duration: 5000,
                isClosable: true,
                position: "bottom"
            });
        } catch (err: any) {
            toast({
                title: "Error",
                description: err.message,
                status: "error",
                duration: 5000,
                isClosable: true,
                position: "bottom"
            })
        }
        setLoading(null);
    };

    const resetCycleTime = async () => {
        if (!machineID || !selectedMold) return;
        setLoading("Resetting Cycle Time");
        try {
            await remove(`molds/${machineID}/${selectedMold.name}/stats.avgCycleTime`);
            setSelectedMold({
                ...selectedMold,
                cycleTimeAvg: {
                    value: 0,
                    change: 0
                }
            });
            setMounted(false);
            toast({
                title: "Success",
                description: "Cycle Time resetted successfully",
                status: "success",
                duration: 5000,
                isClosable: true,
                position: "bottom"
            });
        } catch (err: any) {
            toast({
                title: "Error",
                description: err.message,
                status: "error",
                duration: 5000,
                isClosable: true,
                position: "bottom"
            })
        }
        setLoading(null);
    };

    const updateAlertThreshold = async () => {
        if (!machineID || !selectedMold) return;
        setLoading("Updating Alert Threshold");
        try {
            await update(`molds/${machineID}/${selectedMold.name}`, {
                shotAlertThreshold
            });
            setSelectedMold({
                ...selectedMold,
                shotAlertThreshold
            });
            setMounted(false);
            toast({
                title: "Success",
                description: "Alert Threshold updated successfully",
                status: "success",
                duration: 5000,
                isClosable: true,
                position: "bottom"
            });
        } catch (err: any) {
            toast({
                title: "Error",
                description: err.message,
                status: "error",
                duration: 5000,
                isClosable: true,
                position: "bottom"
            })
        }
        setLoading(null);
    }
    const updateMoldLife = async () => {
        if (!machineID || !selectedMold) return;
        setLoading("Updating mold life");
        try {
            await update(`molds/${machineID}/${selectedMold.name}`, {
                moldLife
            });
            setSelectedMold({
                ...selectedMold,
                moldLife
            });
            setMounted(false);
            toast({
                title: "Success",
                description: "Mold Life updated successfully",
                status: "success",
                duration: 5000,
                isClosable: true,
                position: "bottom"
            });
        } catch (err: any) {
            toast({
                title: "Error",
                description: err.message,
                status: "error",
                duration: 5000,
                isClosable: true,
                position: "bottom"
            })
        }
        setLoading(null);
    };

    const unInstallMold = async () => {
        if (!machineID || !selectedMold) return;
        setLoading("Uninstalling mold");
        try {
            const payload = {
                installedMold: {
                    name: "NA",
                    moldLife: 0,
                    cavities: 1,
                    productName: "NA",
                    productColor: "NA",
                    materials: [{
                        name: "NA",
                        weight: 0
                    }]
                },
                mold_start_time: dayjs(now).unix()
            };
            let _unit;
            if (unit === null) {
                const snap = await get(`machines/${machineID}/unit`);
                _unit = +snap.val() || 1;
                setUnit(_unit);
            } else _unit = unit;
            logger("install-mold", {
                machineID,
                data: payload
            });
            const resp = await sendDataRest(_unit, [
                "machine",
                machineID,
                payload,
                undefined,
            ]);
            if (resp === 401) throw new Error("Permission Denied");
            else if (resp !== 200) throw new Error("Something went wrong");
            const promises = [update(`molds/${selectedMold.isUniversal ? "UNIVERSAL_MOLDS" : machineID}/${selectedMold.name}`, {
                isInstalled: false
            })];
            await Promise.all(promises);
            setSelectedMold(null);
            setMounted(false);
            toast({
                title: "Success",
                description: "Mold uninstalled successfully",
                status: "success",
                duration: 5000,
                isClosable: true,
                position: "bottom"
            });
        } catch (err: any) {
            toast({
                title: "Error",
                description: err.message,
                status: "error",
                duration: 5000,
                isClosable: true,
                position: "bottom"
            })
        }
        setLoading(null);
    };

    const progress = useMemo(() => {
        if (!selectedMold || !selectedMold.target) return 0;
        return Math.min(100, (selectedMold.target.current / selectedMold.target.total) * 100);
    }, [selectedMold])

    return <VStack gap={5} w="100%">
        {loading && <BackdropLoader text={loading} />}
        <Box
            py={5}
            w="100%">
            <Flex gap={2} w="100%">
                <Box w="100%">
                    <SearchableSelector
                        options={molds.map(mold => ({
                            label: (mold.isUniversal ? "U - " : "") + (mold.cycleTimeAvg ? (mold.name + ` (${mold.cycleTimeAvg.value}s)`) : mold.name),
                            value: mold.name
                        }))}
                        onChange={e => {
                            const mold = molds.find(mold => mold.name === e.value);
                            setSelectedMold(mold || null);
                        }}
                        value={{
                            label: (selectedMold?.name) || "",
                            // label: selectedMold?.cycleTimeAvg ? (selectedMold.name + ` (${selectedMold.cycleTimeAvg}s)`) : selectedMold?.name || "",
                            value: selectedMold?.name || ""
                        }}
                        noOptionsMessage="No Molds" />
                </Box>
                <MyTooltip label="Uninstall Mold">
                    <ConfirmDialog
                        heading="Are you sure?"
                        text="Are you sure you want to uninstall this mold?"
                        onConfirm={unInstallMold}>
                        <IconButton borderWidth={"2px"} fontSize="0.9em" icon={<FaArrowUp />} aria-label="uninstall mold" isDisabled={!allowMoldUninstall} colorScheme="red" variant="outline" />
                    </ConfirmDialog>
                </MyTooltip>
            </Flex>
        </Box>
        {selectedMold === null ? <NotFound text={"No Mold Selected"} /> : <SimpleGrid
            w="100%"
            gap={5}
            columns={{
                base: 1,
                lg: 8
            }}>
            <GridItem colSpan={{
                base: 1,
                lg: 8
            }}>
                <FormControl size={"sm"}>
                    <FormLabel opacity={0.9} fontSize="sm">Current Target</FormLabel>
                    <Box
                        gap={3}
                        display="flex"
                        alignItems={"center"}
                        justifyContent="center"
                        textTransform={"uppercase"}
                        color={subText}
                        fontSize={"sm"}>
                        <Text fontWeight={500} opacity={0.9}>
                            Prog:
                        </Text>
                        <Progress
                            w="100%"
                            size="lg"
                            borderRightRadius={'md'}
                            colorScheme={progress > 75 ? "green" : progress > 50 ? "orange" : "red"}
                            value={
                                (progress) || 0
                            }
                        />
                        <Text
                            textTransform={"lowercase"}
                            as={"span"}
                            ml={2}
                            fontWeight={"bold"}
                            color={text}>
                            <MinifiedNumberFormatter number={selectedMold.target?.current || 0} />/
                            <MinifiedNumberFormatter number={selectedMold.target?.total || 0} />
                        </Text>
                    </Box>
                </FormControl>
            </GridItem>
            <GridItem colSpan={{
                base: 1,
                lg: 4
            }}>
                <FormControl size={"sm"}>
                    <FormLabel opacity={0.9} fontSize="sm">Name</FormLabel>
                    <Heading
                        fontSize="md"
                        wordBreak={'break-word'}
                        textTransform="uppercase">
                        {(selectedMold.isUniversal ? "U - " : "") + selectedMold.name}
                    </Heading>
                </FormControl>
            </GridItem>
            <GridItem colSpan={{
                base: 1,
                lg: 4
            }}>
                <FormControl size={"sm"}>
                    <FormLabel opacity={0.9} fontSize="sm">Mold Life</FormLabel>
                    <Heading
                        as={Flex}
                        w="80%"
                        justifyContent="space-between"
                        alignItems="center"
                        fontSize="md"
                        wordBreak={'break-word'}
                        textTransform="uppercase">
                        <Box>
                            <MinifiedNumberFormatter number={selectedMold.moldLife} suffix="shot(s)" />
                        </Box>
                        <MyPopover placement="top-start">
                            <IconButton aria-label="edit-mold-life" icon={<FaEdit />} size="xs" p={0} variant="outline" colorScheme="orange" />
                            <VStack w="100%">
                                <FormControl size={"sm"}>
                                    <FormLabel opacity={0.9} fontSize="sm" textTransform={"none"}>Mold Life(shots)</FormLabel>
                                    <PrimaryInput value={moldLife} onChange={e => !isNaN(+e.target.value) && setMoldLife(+e.target.value)} defaultValue={selectedMold.moldLife} name='moldLife' size="sm" placeholder="eg: 200,000" />
                                </FormControl>
                                <Flex w="100%" justifyContent={"flex-end"}>
                                    <ConfirmDialog onConfirm={updateMoldLife}>
                                        <PrimaryBtn size="xs" rightIcon={<FiSave />}>
                                            Save
                                        </PrimaryBtn>
                                    </ConfirmDialog>
                                </Flex>
                            </VStack>
                        </MyPopover>
                    </Heading>
                </FormControl>
            </GridItem>
            <GridItem colSpan={{
                base: 1,
                lg: 2
            }}>
                <FormControl size={"sm"}>
                    <FormLabel opacity={0.9} fontSize="sm">Cavities</FormLabel>
                    <Heading
                        fontSize="md"
                        wordBreak={'break-word'}
                        textTransform="uppercase">
                        {selectedMold.cavities}
                    </Heading>
                </FormControl>
            </GridItem>
            <GridItem colSpan={{
                base: 1,
                lg: 3
            }}>
                <FormControl size={"sm"}>
                    <FormLabel opacity={0.9} fontSize="sm">Product Name</FormLabel>
                    <Heading
                        fontSize="md"
                        wordBreak={'break-word'}
                        textTransform="uppercase">
                        {selectedMold.productName}
                    </Heading>
                </FormControl>
            </GridItem>
            <GridItem colSpan={{
                base: 1,
                lg: 3
            }}>
                <FormControl size={"sm"}>
                    <FormLabel opacity={0.9} fontSize="sm">Product Color</FormLabel>
                    <Heading
                        as={Flex}
                        w="80%"
                        justifyContent="space-between"
                        alignItems="center"
                        fontSize="md"
                        wordBreak={'break-word'}
                        textTransform="uppercase">
                        <Box>{selectedMold.productColor}</Box>
                    </Heading>
                </FormControl>
            </GridItem>
            <GridItem colSpan={{
                base: 1,
                lg: 4
            }}>
                <FormControl size={"sm"}>
                    <FormLabel opacity={0.9} fontSize="sm">AVG Cycle Time</FormLabel>
                    <Heading
                        as={Flex}
                        w="80%"
                        justifyContent="space-between"
                        alignItems="center"
                        fontSize="md"
                        wordBreak={'break-word'}
                        textTransform="uppercase">
                        <Box display="flex" alignItems={"flex-end"} gap={2}>
                            <NumberFormatter suffix="s" number={selectedMold?.cycleTimeAvg?.value || 0} />
                            <Text fontSize="xs" color={
                                (selectedMold?.cycleTimeAvg?.change || 0) < 0 ? "green.500" : (selectedMold?.cycleTimeAvg?.change || 0) > 0 ? "red.500" : subText
                            }>{(selectedMold?.cycleTimeAvg?.change || 0)}%</Text>
                        </Box>
                        <MyTooltip label="Reset Cycle Time" placement="bottom-end">
                            <ConfirmDialog onConfirm={resetCycleTime}>
                                <IconButton aria-label="reset-cycle-time" icon={<FaTimes />} size="xs" p={0} variant="outline" colorScheme="red" />
                            </ConfirmDialog>
                        </MyTooltip>
                    </Heading>
                </FormControl>
            </GridItem>
            <GridItem colSpan={{
                base: 1,
                lg: 4
            }}>
                <FormControl size={"sm"}>
                    <FormLabel opacity={0.9} fontSize="sm">AVG Shot Consumption</FormLabel>
                    <Heading
                        as={Flex}
                        w="80%"
                        justifyContent="space-between"
                        alignItems="center"
                        fontSize="md"
                        wordBreak={'break-word'}
                        textTransform="uppercase">
                        <Box display="flex" alignItems={"flex-end"} gap={2} color={
                            (Math.abs(selectedMold?.consumptionAvg?.change || 0) > selectedMold?.shotAlertThreshold) ? "red.500" : text
                        }>
                            <UnitFormatter number={selectedMold?.consumptionAvg?.value || 0} />
                            <Text fontSize="xs" color={
                                (selectedMold?.consumptionAvg?.change || 0) < 0 ? "green.500" : (selectedMold?.consumptionAvg?.change || 0) > 0 ? "red.500" : subText
                            }>{(selectedMold?.consumptionAvg?.change || 0)}%</Text>
                        </Box>
                        <HStack>
                            <MyPopover placement="top-start">
                                <IconButton aria-label="set-alert" icon={<FaRegBell />} size="xs" p={0} variant="outline" colorScheme="orange" />
                                <VStack w="100%">
                                    <FormControl size={"sm"}>
                                        <FormLabel opacity={0.9} fontSize="sm" textTransform={"none"}>Alert Threshold(%)</FormLabel>
                                        <PrimaryInput value={shotAlertThreshold} onChange={e => !isNaN(+e.target.value) && setShotAlertThreshold(+e.target.value)} defaultValue={selectedMold.shotAlertThreshold} name='shotAlertThreshold' size="sm" placeholder="eg: 20" />
                                    </FormControl>
                                    <Flex w="100%" justifyContent={"flex-end"}>
                                        <ConfirmDialog onConfirm={updateAlertThreshold}>
                                            <PrimaryBtn size="xs" rightIcon={<FiSave />}>
                                                Save
                                            </PrimaryBtn>
                                        </ConfirmDialog>
                                    </Flex>
                                </VStack>
                            </MyPopover>
                            <MyTooltip label="Reset Consumption" placement="bottom-end">
                                <ConfirmDialog onConfirm={resetConsumption}>
                                    <IconButton aria-label="reset-consumption" icon={<FaTimes />} size="xs" p={0} variant="outline" colorScheme="red" />
                                </ConfirmDialog>
                            </MyTooltip>
                        </HStack>
                    </Heading>
                </FormControl>
            </GridItem>
            <VStack
                as={GridItem}
                colSpan={{
                    base: 1,
                    lg: 8
                }}
                pt={5}
                borderTop="1px solid"
                borderColor={border}
                overflow={"auto"}
                height="250px"
                w="100%"
                spacing={5}>
                {selectedMold.materials.map((material, index) => <SimpleGrid key={index} w="100%"
                    gap={5}
                    columns={{
                        base: 1,
                        lg: 8
                    }}>
                    <GridItem colSpan={{
                        base: 1,
                        lg: 5
                    }}>
                        <FormControl size={"sm"}>
                            <FormLabel opacity={0.9} fontSize="sm">Material {index + 1}</FormLabel>
                            <Heading
                                fontSize="md"
                                wordBreak={'break-word'}
                                textTransform="uppercase">
                                {material.name}
                            </Heading>
                        </FormControl>
                    </GridItem>
                    <GridItem colSpan={{
                        base: 1,
                        lg: 3
                    }}>
                        <FormControl size={"sm"}>
                            <FormLabel opacity={0.9} fontSize="sm">{`${material.pc_weight ? "PCs" : "Weight"} (${material.pc_weight ? weightFormatterFunc(material.pc_weight) : "g"})`}</FormLabel>
                            <Heading
                                fontSize="sm"
                                wordBreak={'break-word'}>
                                {weightFormatterFunc(material.weight, material.pc_weight)}
                            </Heading>
                        </FormControl>
                    </GridItem>
                </SimpleGrid>)}
            </VStack>
        </SimpleGrid>}
        <HStack w="100%" justifyContent={"space-between"} pt={5}>
            <Box>
                <FormControl>
                    <FormLabel>
                        <Checkbox size='sm' colorScheme='orange' isChecked={installNow} onChange={e => {
                            setInstallNow(e.target.checked);
                        }}>
                            Install Immediately
                        </Checkbox>
                    </FormLabel>
                    <PrimaryInput borderRadius={"md"} w="fit-content" placeholder="Installation time" type="datetime-local" isDisabled={installNow} fontWeight={400} size="sm" value={
                        dayjs(installationTime).format("YYYY-MM-DDTHH:mm")
                    } onChange={e => {
                        const date = new Date(e.target.value);
                        setInstallationTime(date);
                    }} min={
                        now.toISOString().slice(0, 16)
                    } />
                </FormControl>
            </Box>
            <FormControl w="fit-content">
                <FormLabel>&nbsp;</FormLabel>
                <ConfirmDialog text="Are you sure you want to install this mold?" onConfirm={installMold}>
                    <PrimaryBtn isDisabled={!allowInstallAndDelete} size="sm" leftIcon={<ArrowDownIcon />}>Install</PrimaryBtn>
                </ConfirmDialog>
            </FormControl>
        </HStack>
        <Flex w="100%" pt={10} justifyContent={"space-between"} alignItems="center">
            <ConfirmDialog
                heading="Are you sure?"
                text="Are you sure you want to delete this mold?"
                onConfirm={deleteMold}>
                <Button isDisabled={!allowInstallAndDelete} size="xs" colorScheme={"red"} variant="outline" leftIcon={<DeleteIcon />}>Delete Mold</Button>
            </ConfirmDialog>
            <EditMold isInstalledMold={allowMoldUninstall} installMold={installMold} setMounted={setMounted} matrials={materials} mold={selectedMold} />
        </Flex>
    </VStack>
}

export default InstallMold;