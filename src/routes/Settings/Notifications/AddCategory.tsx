import { Button, FormControl, FormLabel, Icon, ModalBody, ModalCloseButton, ModalFooter, ModalHeader, useDisclosure, useToast, VStack } from '@chakra-ui/react';
import { useState } from 'react'
import { FiPlus } from 'react-icons/fi';
import Primary from '../../../Components/Buttons/Primary';
import { update } from '../../../Components/firebase/api/db';
import { PrimaryInput } from '../../../Components/Inputs';
import SearchableSelector from '../../../Components/Inputs/SearchableSelector';
import BackdropLoader from '../../../Components/Loaders/BackdropLoader'
import MyModal from '../../../Components/micro/MyModal';
import { Option } from '../../Reports/Selector/types';

const AddCategory = ({
    disabled,
    devices,
    currentCategories,
    refetch
}: {
    disabled: boolean,
    devices: {
        [key: string]: string
    },
    currentCategories: string[],
    refetch: () => void
}) => {
    const toast = useToast();
    const [loading, setLoading] = useState<null | string>(null);
    const { onClose, onOpen, isOpen } = useDisclosure();
    const [data, setData] = useState<{
        name: string;
        devices: Option[];
    }>({
        name: "",
        devices: [],
    });

    const handleSubmit = async () => {
        if (!data.name.length || data.name.replaceAll(" ", "").length === 0) {
            toast({
                title: "Error",
                description: "Department name is required",
                status: "error",
                duration: 3000,
                isClosable: true,
            });
            return;
        } else if (data.devices.length === 0) {
            toast({
                title: "Error",
                description: "Atleast one device is required",
                status: "error",
                duration: 3000,
                isClosable: true,
            });
            return;
        } else if (currentCategories.includes(data.name)) {
            toast({
                title: "Error",
                description: "Category already exists",
                status: "error",
                duration: 3000,
                isClosable: true,
            });
            return;
        }
        try {
            setLoading("Adding Category");
            const payload = {
                devices: data.devices.map(e => e.value),
            };
            // logger("add-department", {
            //     name: data.name,
            //     payload
            // });
            await update(`device-categories/${data.name}`, payload);
            setLoading(null);
            onClose();
            refetch();
            toast({
                title: "Success",
                description: "Category added successfully",
                status: "success",
                duration: 3000,
                isClosable: true,
            });
            setData({
                name: "",
                devices: []
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
        <Primary size="sm" mt={5} onClick={onOpen} isDisabled={disabled}>Add Category<Icon ml={2} as={FiPlus} /></Primary>
        <MyModal
            size={"xl"}
            isOpen={isOpen}
            onClose={onClose}
            closeOnOverlayClick={false}>
            <ModalHeader>Add Category</ModalHeader>
            <ModalCloseButton />
            <ModalBody pb={6}>
                <VStack gap={4}>
                    <FormControl>
                        <FormLabel>Category Name</FormLabel>
                        <PrimaryInput placeholder="eg: Injection Depart" onChange={e => setData(prev => {
                            return {
                                ...prev,
                                name: e.target.value
                            }
                        })} />
                    </FormControl>
                    <FormControl>
                        <FormLabel>Devices</FormLabel>
                        <SearchableSelector closeMenuOnSelect={false} isMulti onChange={e => setData(prev => {
                            return {
                                ...prev,
                                devices: e
                            }
                        })} options={Object.entries(devices || {}).map(([key, value]) => ({ label: value as string, value: key as string }))} />
                    </FormControl>
                </VStack>
            </ModalBody>
            <ModalFooter>
                <Primary onClick={handleSubmit} mr={3}>Save</Primary>
                <Button onClick={onClose}>Cancel</Button>
            </ModalFooter>
        </MyModal>
    </>
}

export default AddCategory