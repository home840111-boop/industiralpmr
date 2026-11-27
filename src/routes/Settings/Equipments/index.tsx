import { Box, Center, Flex, FormControl, FormLabel, Text, useColorMode, useToast, VStack } from '@chakra-ui/react';
import { useEffect, useMemo, useState } from 'react'
import { FiSave } from 'react-icons/fi';
import { PrimaryBtn } from '../../../Components/Buttons';
import { PrimaryInput } from '../../../Components/Inputs';
import SearchableSelector from '../../../Components/Inputs/SearchableSelector';
import { SmallFill } from '../../../Components/Loaders';
import BackdropLoader from '../../../Components/Loaders/BackdropLoader';
import MyCard from '../../../Components/micro/Card';
import ConfirmDialog from '../../../Components/micro/ConfirmDialog';
import NotFound from '../../../Components/micro/NotFound';
import { factoriesAtom, selectedFactoryAtom } from '../../../Components/Store/atoms';
import Get from '../../../Components/Store/hooks/Get';
import Listen from '../../../Components/Store/hooks/Listen';
import fetch from './fetch';
import save from './save';

interface EquipmentData {
    id: string,
    name: string,
    unit: number
}
interface EquipmentsData {
    [key: string]: EquipmentData;
}

const Equipments = () => {
    const toast = useToast();
    const { colorMode } = useColorMode();
    const { text, subText, border } = useMemo(() => ({
        text: `${colorMode}.text`,
        subText: `${colorMode}.subText`,
        border: `${colorMode}.border`
    }), [colorMode]);
    const [loading, setLoading] = useState<string | null>(null);
    const [equipment, setEquipment] = useState<EquipmentData | null>(null);
    const [equipments, setEquipments] = useState<EquipmentsData | null>(null);
    const factories = Get(factoriesAtom);
    const selectedFactory = Listen(selectedFactoryAtom);

    useEffect(() => {
        if (!selectedFactory || !factories) return;
        const factory = factories?.[selectedFactory.value];
        fetch(factory).then(data => {
            setEquipments(data);
            const firstEquipment = Object.keys(data)[0];
            setEquipment(data[firstEquipment]);
        }).catch(err => {
            console.log(err);
        })
    }, [selectedFactory, factories]);

    const changeEquipment = ({ label, value }: { label: string, value: string }) => {
        if (!equipments) return;
        const selectedEquipment = equipments[value];
        setEquipment(selectedEquipment);
    }

    const mySave = async () => {
        if (!equipment) return;
        setLoading("Updating");
        try {
            const response = await save(equipment);
            if (response !== 200) throw new Error("something went wrong");
            toast({
                title: "Success",
                description: "Equipment updated successfully",
                status: "success",
                duration: 5000,
                isClosable: true,
                position: "bottom"
            });
            setEquipments(prev => {
                if (!prev) return prev;
                return {
                    ...prev,
                    [equipment.id]: equipment
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
                <Text fontSize="lg" fontWeight={500} color={text}>Equipments</Text>
                <Text fontSize="sm" color={subText} mt={3}>
                    Effortlessly update equipment names to keep your dashboard organized and up-to-date.
                </Text>
            </Box>
            <VStack w="100%" gap={5} alignItems="flex-end">
                <MyCard w="100%" px={4} py={4}>
                    {
                        equipments === null || equipment === null ?
                            <Center h="100px">
                                <SmallFill />
                            </Center>
                            : Object.keys(equipments).length === 0 ?
                                <Center h="100px">
                                    <NotFound text='No Equipments Found' />
                                </Center> : <VStack w="100%" gap={5}>
                                    <FormControl pb={5} borderBottom="1px solid" borderColor={border}>
                                        <FormLabel color={text}>Select Equipment</FormLabel>
                                        <Box
                                            w="100%">
                                            <SearchableSelector
                                                options={Object.values(equipments).map(equipment => ({
                                                    label: equipment.name,
                                                    value: equipment.id
                                                }))}
                                                onChange={changeEquipment}
                                                value={{
                                                    label: equipments[equipment.id].name,
                                                    value: equipment.id
                                                }}
                                            />
                                        </Box>
                                    </FormControl>
                                    <FormControl>
                                        <FormLabel fontSize="sm" color={text}>Equipment Name</FormLabel>
                                        <PrimaryInput size="sm" value={equipment.name} placeholder="Equipment Name" onChange={e => setEquipment(prev => {
                                            if (!prev) return prev;
                                            return {
                                                ...prev,
                                                name: e.target.value
                                            }
                                        })} />
                                    </FormControl>
                                </VStack>
                    }
                </MyCard>
                <ConfirmDialog onConfirm={mySave}>
                    <PrimaryBtn
                        rightIcon={
                            <FiSave />
                        }>Save Changes</PrimaryBtn>
                </ConfirmDialog>
            </VStack>
        </Flex>
    </>
}


export type { EquipmentData, EquipmentsData };
export default Equipments;