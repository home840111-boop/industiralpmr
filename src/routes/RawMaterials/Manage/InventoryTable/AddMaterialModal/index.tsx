import { FormControl, FormErrorMessage, FormLabel, ModalBody, ModalCloseButton, ModalHeader, useDisclosure, VStack, Select, ModalFooter, Button, useToast, HStack, SimpleGrid, GridItem, Text, Flex } from "@chakra-ui/react";
import { Children, cloneElement, useMemo, useRef, useState } from "react";
import Primary from "../../../../../Components/Buttons/Primary";
import { PrimaryInput } from "../../../../../Components/Inputs";
import PrimaryNumberInput from "../../../../../Components/Inputs/PrimaryNumberInput";
import SearchableSelector from "../../../../../Components/Inputs/SearchableSelector";
import BackdropLoader from "../../../../../Components/Loaders/BackdropLoader"
import ConfirmDialog from "../../../../../Components/micro/ConfirmDialog";
import MyModal from "../../../../../Components/micro/MyModal";
import weightFormatter from "../../../../../Components/Functions/formatters/weightFormatter";
import formatter from "../../../../../Components/Functions/formatters/numberFormatter";

interface ErrorsType {
    name: string | null,
    quantityAmount: string | null,
    pc_weight: string | null,
    quantity: string | null,
}

const AddMaterialModal = ({
    refetch,
    allowedDepartments,
    hasAllDepartments,
    children
}: {
    refetch: () => void,
    allowedDepartments: string[],
    hasAllDepartments: boolean,
    children: JSX.Element
}) => {
    const toast = useToast();
    const formRef = useRef<HTMLFormElement>(null);
    const [loading, setLoading] = useState<string | null>(null);
    const [qtyType, setQtyType] = useState<"weight" | "custom">("weight");
    const { isOpen, onOpen, onClose } = useDisclosure();
    const [errors, setErrors] = useState<ErrorsType>({
        name: null,
        quantityAmount: null,
        pc_weight: null,
        quantity: null,
    });
    const [params, setParams] = useState<{
        quantity: number,
        pc_weight: number,
        qtyAmount: "bag" | "kg"
    }>({ quantity: 0, pc_weight: 0, qtyAmount: "bag" });
    const myDeparts = allowedDepartments;

    const childWithOnClick = () => {
        return Children.map(children, child => {
            return cloneElement(child, { onClick: onOpen });
        });
    };

    const result = useMemo(() => {
        if (qtyType === "weight") {
            return `${weightFormatter((params.qtyAmount === "bag" ? params.quantity * 25 : params.quantity) * 1000)}`
        }
        return `${formatter(params.quantity, "pc(s)")} x ${weightFormatter(params.pc_weight)} = ${weightFormatter(params.quantity * params.pc_weight)}`
    }, [params, qtyType]);


    const handleSubmit = () => {
        import("./handler").then(async resp => {
            if (formRef.current === null) return;
            const formData = new FormData(formRef.current);
            const success = await resp.default(formData, setErrors, setLoading, toast);
            if (success) {
                refetch();
                onClose();
                formRef.current.reset();
                setParams({
                    quantity: 0,
                    pc_weight: 0,
                    qtyAmount: "bag"
                });
                setQtyType("weight");
            }
        });
    }

    return <>
        {loading && <BackdropLoader text={loading} />}
        {childWithOnClick()}
        <MyModal
            size={"xl"}
            isOpen={isOpen}
            onClose={onClose}>
            <form onSubmit={e => {
                e.preventDefault();
            }} ref={formRef}>
                <ModalHeader>Add Raw-Material</ModalHeader>
                <ModalCloseButton />
                <ModalBody pb={6}>
                    <VStack gap={4}>
                        <HStack w="100%" gap={4}>
                            <FormControl isRequired isInvalid={errors.name !== null}>
                                <FormLabel>Name</FormLabel>
                                <PrimaryInput name="name" placeholder='Material Name' />
                                <FormErrorMessage>{errors.name}</FormErrorMessage>
                            </FormControl>
                            <FormControl isRequired={!hasAllDepartments}>
                                <FormLabel>Department</FormLabel>
                                <SearchableSelector name="department" options={myDeparts.map(depart => ({
                                    value: depart,
                                    label: depart.toUpperCase()
                                }))} />
                            </FormControl>
                        </HStack>
                        <SimpleGrid columns={3} w="100%" justifyContent={"space-between"} gap={4}>
                            <FormControl isRequired>
                                <FormLabel>Quantity Type</FormLabel>
                                <Select name="quantity-type" value={qtyType} onChange={e => setQtyType(e.target.value as "custom")} focusBorderColor="primary">
                                    <option value="weight">Weight</option>
                                    <option value="custom">Pieces</option>
                                </Select>
                            </FormControl>
                            <FormControl isDisabled={qtyType === "weight"} isInvalid={errors.pc_weight !== null}>
                                <FormLabel>Piece weight(g)</FormLabel>
                                <PrimaryNumberInput onChange={e => setParams(prev => ({
                                    ...prev,
                                    pc_weight: +e
                                }))} name="pc_weight" placeholder='eg: 5' />
                            </FormControl>
                            <FormControl isDisabled={qtyType === "custom"} isRequired isInvalid={errors.quantityAmount !== null}>
                                <FormLabel>Quantity Amount</FormLabel>
                                <Select name="quantity-amount" onChange={e => setParams(prev => ({
                                    ...prev,
                                    qtyAmount: e.target.value as "bag" | "kg"
                                }))} focusBorderColor="primary">
                                    <option value="bag">Bags(25KGs)</option>
                                    <option value="kg">KGs</option>
                                </Select>
                                <FormErrorMessage>{errors.quantityAmount}</FormErrorMessage>
                            </FormControl>
                        </SimpleGrid>
                        <FormControl as={GridItem} colSpan={2} isRequired isInvalid={errors.quantity !== null}>
                            <FormLabel>Quantity</FormLabel>
                            <PrimaryNumberInput onChange={e => setParams(prev => ({
                                ...prev,
                                quantity: +e
                            }))} name="quantity" placeholder='Quantity' />
                            <FormErrorMessage>{errors.quantity}</FormErrorMessage>
                        </FormControl>
                    </VStack>
                </ModalBody>
                <ModalFooter>
                    <VStack w="100%" justifyContent={"center"}>
                        <VStack opacity={0.8} fontSize="sm" w="100%" alignItems={"flex-start"}>
                            <Text>Resulting Quantity: <strong style={{
                                opacity: 1
                            }}>{result}</strong></Text>
                        </VStack>
                        <Flex alignItems={"center"} justifyContent="flex-end" w="100%">
                            <ConfirmDialog onConfirm={handleSubmit}>
                                <Primary mr={3}>Add</Primary>
                            </ConfirmDialog>
                            <Button onClick={onClose}>Cancel</Button>
                        </Flex>
                    </VStack>
                </ModalFooter>
            </form>
        </MyModal>
    </>
}

export default AddMaterialModal