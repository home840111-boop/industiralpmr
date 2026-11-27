import { Box, Center, Flex, FormControl, FormLabel, GridItem, SimpleGrid, Text, useColorMode, useToast, VStack } from '@chakra-ui/react';
import { closestCenter, DndContext, DragEndEvent, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useEffect, useMemo, useState } from 'react'
import { FiSave } from 'react-icons/fi';
import { RiDraggable } from 'react-icons/ri';
import { PrimaryBtn } from '../../../Components/Buttons';
import { update } from '../../../Components/firebase/api/db';
import { PrimaryInput } from '../../../Components/Inputs';
import PrimaryNumberInput from '../../../Components/Inputs/PrimaryNumberInput';
import PrimarySelect from '../../../Components/Inputs/PrimarySelect';
import SearchableSelector from '../../../Components/Inputs/SearchableSelector';
import { SmallFill } from '../../../Components/Loaders';
import BackdropLoader from '../../../Components/Loaders/BackdropLoader';
import MyCard from '../../../Components/micro/Card';
import ConfirmDialog from '../../../Components/micro/ConfirmDialog';
import NotFound from '../../../Components/micro/NotFound';
import { SortableItem } from '../../../Components/micro/SortableItem';
import { baseDepartmentAtom, factoriesAtom, isMasterAdminAtom, selectedFactoryAtom, uidAtom } from '../../../Components/Store/atoms';
import Get from '../../../Components/Store/hooks/Get';
import Listen from '../../../Components/Store/hooks/Listen';
import { isMasterOwner } from '../../../Services/rbac';
import fetch from './fetch';
import save from './save';

interface MachineData {
    id: string,
    name: string,
    machineType: "standard" | "servo" | "inverter",
    idleTime: number,
    monitorDowntime: boolean,
    operatorA: string,
    operatorB: string | null,
    order: number,
    operatorC: string | null,
    unit: number,
}
interface MachinesData {
    [key: string]: MachineData;
}

type MachinesOrder = {
    id: string,
    name: string,
    sort: number
}[]

const Machines = () => {
    const toast = useToast();
    const { colorMode } = useColorMode();
    const { text, subText, border } = useMemo(() => ({
        text: `${colorMode}.text`,
        subText: `${colorMode}.subText`,
        border: `${colorMode}.border`
    }), [colorMode]);
    const [loading, setLoading] = useState<string | null>(null);
    const [machine, setMachine] = useState<MachineData | null>(null);
    const [machines, setMachines] = useState<MachinesData | null>(null);
    const [machinesOrder, setMachinesOrder] = useState<MachinesOrder>([]);
    const [unchangedOrder, setUnchangedOrder] = useState(true);
    const factories = Get(factoriesAtom);
    const selectedFactory = Listen(selectedFactoryAtom);
    const masterUid = Listen(uidAtom);
    Listen(isMasterAdminAtom);
    const baseDepts = Listen(baseDepartmentAtom) || [];
    const canReorderMachines = isMasterOwner(masterUid) || baseDepts.includes("all");

    useEffect(() => {
        if (!selectedFactory || !factories) return;
        const factory = factories?.[selectedFactory.value];
        fetch(factory).then(data => {
            setMachinesOrder(Object.entries(data).map(([id, machine]) => ({
                id,
                name: machine.name,
                sort: machine.order
            })));
            setMachines(data);
            const firstMachine = Object.keys(data)[0];
            setMachine(firstMachine ? data[firstMachine] : null);
        }).catch(err => {
            console.log(err);
        })
    }, [selectedFactory, factories]);

    const changeMachine = ({ label, value }: { label: string, value: string }) => {
        if (!machines) return;
        const selectedMachine = machines[value];
        setMachine(selectedMachine);
    }

    const mySave = async () => {
        if (!machine) return;
        setLoading("Updating");
        try {
            const response = await save(machine);
            if (response !== 200) throw new Error("Something went wrong");
            toast({
                title: "Success",
                description: "Machine updated successfully",
                status: "success",
                duration: 5000,
                isClosable: true,
                position: "bottom"
            });
            setMachines(prev => {
                if (!prev) return prev;
                return {
                    ...prev,
                    [machine.id]: machine
                }
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

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    function handleDragEnd(event: DragEndEvent) {
        const { active, over } = event;
        if (!over?.data.current) return;
        if (!active?.data.current) return;

        if (active.id !== over.id) {
            setMachinesOrder((machine) => {
                const oldIndex = (active.data.current?.sortable?.index as any);
                const newIndex = (over.data.current?.sortable?.index as any);

                return arrayMove(machine, oldIndex, newIndex);
            });
            setUnchangedOrder(false);
        }
    }

    const saveOrder = async () => {
        setLoading("Updating Order");
        const promises = [];

        for (let i = 0; i < machinesOrder.length; i++) {
            const machine = machinesOrder[i];
            promises.push(update(`machines/${machine.id}`, {
                sort: i
            }));
        }

        try {
            await Promise.all(promises);
            toast({
                title: "Success",
                description: "Order updated successfully",
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
            });
        } finally {
            setLoading(null);
            setUnchangedOrder(true);
        }
    }


    return <>
        {loading && <BackdropLoader text={loading} />}
        <Flex
            py={5}
            flexDir={{
                base: "column",
                xl: "row"
            }}
            gap={3}
            px={{
                base: 4,
                sm: 8
            }}>
            <Box w={{
                base: "100%",
                sm: "30%"
            }}>
                <Text fontSize="lg" fontWeight={500} color={text}>Machines</Text>
                <Text fontSize="sm" color={subText} mt={3}>
                    Customize machine details, change idle time, and manage operators with ease.
                </Text>
            </Box>
            <VStack w="100%" gap={5} alignItems="flex-end">
                <MyCard w="100%" px={4} py={4}>
                    {
                        machines === null ?
                            <Center h="100px">
                                <SmallFill />
                            </Center>
                            : Object.keys(machines).length === 0 || machine === null ?
                                <Center h="100px">
                                    <NotFound text='No Machines Found' />
                                </Center>
                            : <VStack w="100%" gap={5}>
                                <FormControl pb={5} borderBottom="1px solid" borderColor={border}>
                                    <FormLabel color={text}>Select Machine</FormLabel>
                                    <Box
                                        w="100%">
                                        <SearchableSelector
                                            options={Object.values(machines).map(machine => ({
                                                label: machine.name,
                                                value: machine.id
                                            }))}
                                            onChange={changeMachine}
                                            value={{
                                                label: machines[machine.id].name,
                                                value: machine.id
                                            }}
                                        />
                                    </Box>
                                </FormControl>
                                <SimpleGrid
                                    gap={5}
                                    w="100%"
                                    columns={{
                                        base: 1,
                                        md: 7
                                    }}>
                                    <GridItem colSpan={{
                                        base: 1,
                                        md: 3
                                    }}>
                                        <FormControl>
                                            <FormLabel fontSize="sm" color={text}>Machine Name</FormLabel>
                                            <PrimaryInput size="sm" value={machine.name} placeholder="Machine Name" onChange={e => setMachine(prev => {
                                                if (!prev) return prev;
                                                return {
                                                    ...prev,
                                                    name: e.target.value
                                                }
                                            })} />
                                        </FormControl>
                                    </GridItem>
                                    <GridItem colSpan={{
                                        base: 1,
                                        md: 1
                                    }}>
                                        <FormControl>
                                            <FormLabel fontSize="sm" color={text}>Machine Type</FormLabel>
                                            <PrimarySelect size="sm" value={machine.machineType} onChange={e => setMachine(prev => {
                                                if (!prev) return prev;
                                                return {
                                                    ...prev,
                                                    machineType: e.target.value as "standard" | "servo" | "inverter"
                                                }
                                            })}>
                                                <option value="standard">Standard</option>
                                                <option value="inverter">Inverter</option>
                                                <option value="servo">Servo</option>
                                            </PrimarySelect>
                                        </FormControl>
                                    </GridItem>
                                    <GridItem colSpan={{
                                        base: 1,
                                        md: 3
                                    }}>
                                        <FormControl>
                                            <FormLabel fontSize="sm" color={text}>IDLE Time</FormLabel>
                                            <PrimaryNumberInput size="sm" value={machine.idleTime} placeholder="IDLE Time" min={1} onChange={e => setMachine(prev => {
                                                if (!prev) return prev;
                                                return {
                                                    ...prev,
                                                    idleTime: parseInt(e)
                                                }
                                            })} />
                                        </FormControl>
                                    </GridItem>
                                </SimpleGrid>
                                <SimpleGrid
                                    gap={5}
                                    w="100%"
                                    columns={{
                                        base: 1,
                                        md: 3
                                    }}>
                                    <FormControl>
                                        <FormLabel fontSize="sm" color={text}>Operator A</FormLabel>
                                        <PrimaryInput size="sm" value={machine.operatorA} placeholder="Operator A" onChange={e => setMachine(prev => {
                                            if (!prev) return prev;
                                            return {
                                                ...prev,
                                                operatorA: e.target.value
                                            }
                                        })} />
                                    </FormControl>
                                    <FormControl isDisabled={machine.operatorB === null}>
                                        <FormLabel fontSize="sm" color={text}>Operator B</FormLabel>
                                        <PrimaryInput size="sm" value={machine.operatorB || ""} placeholder="Operator B" onChange={e => setMachine(prev => {
                                            if (!prev) return prev;
                                            return {
                                                ...prev,
                                                operatorB: e.target.value
                                            }
                                        })} />
                                    </FormControl>
                                    <FormControl isDisabled={machine.operatorC === null}>
                                        <FormLabel fontSize="sm" color={text}>Operator C</FormLabel>
                                        <PrimaryInput size="sm" value={machine.operatorC || ""} placeholder="Operator C" onChange={e => setMachine(prev => {
                                            if (!prev) return prev;
                                            return {
                                                ...prev,
                                                operatorC: e.target.value
                                            }
                                        })} />
                                    </FormControl>
                                </SimpleGrid>
                            </VStack>
                    }
                </MyCard>
                <ConfirmDialog onConfirm={mySave}>
                    <PrimaryBtn
                        onClick={mySave}
                        rightIcon={
                            <FiSave />
                        }>Save Changes</PrimaryBtn>
                </ConfirmDialog>
            </VStack>
        </Flex>
        {canReorderMachines && <Flex
            borderTop="1px solid"
            borderColor={border}
            py={5}
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
                base: "100%",
                sm: "30%"
            }}>
                <Text fontSize="lg" fontWeight={500} color={text}>Machines Order</Text>
                <Text fontSize="sm" color={subText} mt={3}>
                    Change the order of machines to match the physical layout of your factory.
                    Drag and drop machines to reorder them.
                </Text>
            </Box>
            <Box w="100%">
                <VStack w="100%" gap={5} alignItems="flex-end">
                    <MyCard w="100%" px={4} py={4}>
                        <Flex flexDir="column" gap={5}>
                            <DndContext
                                sensors={sensors}
                                collisionDetection={closestCenter}
                                onDragEnd={handleDragEnd}
                            >
                                <SortableContext
                                    items={machinesOrder}
                                    strategy={verticalListSortingStrategy}
                                >
                                    {Object.values(machinesOrder || {}).map(machine => <SortableItem key={machine.id} id={machine.id}>
                                        <Flex px={2} py={2} gap={2} alignItems="center" rounded={"md"} key={machine.id} border="2px solid" borderColor={border}>
                                            <RiDraggable />{machine.name}
                                        </Flex>
                                    </SortableItem>)}
                                </SortableContext>
                            </DndContext>
                        </Flex>
                    </MyCard>
                    <ConfirmDialog onConfirm={saveOrder}>
                        <PrimaryBtn
                            isDisabled={unchangedOrder}
                            rightIcon={
                                <FiSave />
                            }>Save Order</PrimaryBtn>
                    </ConfirmDialog>
                </VStack>
            </Box>
        </Flex>}
    </>
}

export type { MachineData, MachinesData };
export default Machines;