import { Button, FormControl, FormErrorMessage, FormLabel, GridItem, HStack, ModalBody, ModalCloseButton, ModalFooter, ModalHeader, SimpleGrid, Text, useDisclosure, useToast, VStack } from "@chakra-ui/react";
import { useEffect, useRef, useState } from "react";
import { BiMinus } from "react-icons/bi";
import { BsPlus } from "react-icons/bs";
import { FaEdit } from "react-icons/fa";
import { useParams } from "react-router-dom";
import { z, ZodIssueBase } from "zod";
import { MyRawMaterial } from ".";
import { PrimaryBtn, SecondaryBtn } from "../../../../Components/Buttons";
import Primary from "../../../../Components/Buttons/Primary";
import { update } from "../../../../Components/firebase/api/db";
import { PrimaryInput } from "../../../../Components/Inputs";
import SearchableSelector from "../../../../Components/Inputs/SearchableSelector";
import BackdropLoader from "../../../../Components/Loaders/BackdropLoader"
import ConfirmDialog from "../../../../Components/micro/ConfirmDialog";
import logger from "../../../../Components/micro/logger";
import MyModal from "../../../../Components/micro/MyModal";
import WeightFormatter from "../../../../Components/micro/WeightFormatter";
import weightFormatter from "../../../../Components/Functions/formatters/weightFormatter";
import { Mold } from "../types";

interface Errors {
    name: string | null;
    moldLife: string | null;
    cavities: string | null;
    productName: string | null;
    productColor: string | null;
    materials: {
        name: string | null;
        weight: string | null;
    }[];
}
interface MaterialWithPCWeight extends Material {
    pc_weight: number | null;
}
interface Material {
    name: string;
    weight: number;
}
const EditMold = ({
    isInstalledMold,
    installMold,
    mold,
    matrials,
    setMounted
}: {
    isInstalledMold: boolean;
    installMold: (mold?: Mold) => Promise<void>;
    mold: Mold | null,
    matrials: MyRawMaterial[],
    setMounted: (mounted: boolean) => void;
}) => {
    const { machineID } = useParams() || {};
    const rawMaterials = matrials;
    const toast = useToast();
    const { isOpen, onOpen, onClose } = useDisclosure();
    const formRef = useRef<HTMLFormElement>(null);
    const [loading, setLoading] = useState<string | null>(null);
    const [materials, setMaterials] = useState<MaterialWithPCWeight[]>([{ name: "", weight: 0, pc_weight: null }]);
    const [data, setData] = useState<Mold>({
        name: "",
        moldLife: 0,
        shotAlertThreshold: 0,
        cavities: 0,
        productName: "",
        productColor: "",
        materials: [{
            name: "",
            weight: 0,
            pc_weight: null
        }],
        isUniversal: false,
        isInstalled: false
    });
    const [errors, setErrors] = useState<Errors>({
        name: null,
        moldLife: null,
        cavities: null,
        productName: null,
        productColor: null,
        materials: [{
            name: null,
            weight: null,
        }],
    });

    useEffect(() => {
        if (!mold) return;
        setData({
            name: mold.name,
            moldLife: mold.moldLife,
            cavities: mold.cavities,
            shotAlertThreshold: mold.shotAlertThreshold,
            productName: mold.productName,
            productColor: mold.productColor,
            materials: mold.materials.map(material => ({
                name: material.name,
                pc_weight: material.pc_weight || null,
                weight: material.pc_weight ? material.weight / material.pc_weight : material.weight
            })),
            isUniversal: mold.isUniversal,
            isInstalled: mold.isInstalled
        });
        setMaterials(mold.materials.map(material => ({
            name: material.name,
            pc_weight: material.pc_weight || null,
            weight: material.pc_weight ? material.weight / material.pc_weight : material.weight
        })));
        setErrors({
            name: null,
            moldLife: null,
            cavities: null,
            productName: null,
            productColor: null,
            materials: mold.materials.map(() => ({
                name: null,
                weight: null,
            })),
        });
    }, [mold]);

    const validate = async () => {
        try {
            const moldSchema = z.object({
                name: z.string(),
                moldLife: z.number().min(-1),
                cavities: z.number().positive(),
                productName: z.string().min(1).max(50),
                productColor: z.string().min(1).max(20),
                materials: z.array(z.object({
                    name: z.string().min(1).max(50),
                    weight: z.number().positive(),
                    pc_weight: z.number().min(1).nullable()
                })),
            });
            data.materials = materials.map(material => ({
                name: material.name,
                weight: material.weight * (material.pc_weight || 1),
                pc_weight: material.pc_weight || null
            }));
            const results = moldSchema.safeParse(data);
            const myErrors: Errors = {
                name: null,
                moldLife: null,
                cavities: null,
                productName: null,
                productColor: null,
                materials: materials.map(() => ({
                    name: null,
                    weight: null,
                })),
            };
            if (!results.success) {
                for await (const _issue of results.error.issues) {
                    const issue = _issue as ZodIssueBase;
                    const path = issue.path[0] as "cavities" | "productName" | "productColor" | "materials";
                    if (path === "materials") {
                        const index = issue.path[1] as number;
                        const subPath = issue.path[2] as "name" | "weight";
                        myErrors.materials[index][subPath] = issue.message || "";
                    } else {
                        myErrors[path] = issue.message || "";
                    }
                }
                setErrors(myErrors);
            } else {
                updateMold(results.data as Mold);
                setErrors(myErrors);
            }
        }
        catch (e: any) {
            toast({
                title: "Error",
                description: e.message,
                status: "error",
                duration: 5000,
                isClosable: true,
            })
        }
    }

    const updateMold = async (data: Mold) => {
        if (!data || !machineID || !mold) return;
        try {
            setLoading("Updating mold");
            logger("add-mold", {
                machineID,
                data
            });
            await update(`molds/${machineID}/${mold.name}`, {
                ...data,
                mold: null
            });
            setLoading(null);
            if (isInstalledMold) await installMold(data);
            else toast({
                title: "Success",
                description: "Mold updated successfully.",
                status: "success",
                duration: 5000,
                isClosable: true,
            });
            setMounted(false);
            onClose();
        } catch (e: any) {
            setLoading(null);
            toast({
                title: "Error",
                description: e.message,
                status: "error",
                duration: 5000,
                isClosable: true,
            })
        }
    }

    const addMaterial = () => {
        setMaterials(prev => [...prev, { name: "", weight: 0, pc_weight: null }]);
        setErrors(prev => ({
            ...prev,
            materials: [...prev.materials, { name: null, weight: null }]
        }));
    }
    const removeMaterial = () => {
        if (materials.length === 1) return;
        setMaterials(prev => prev.slice(0, prev.length - 1));
        setErrors(prev => ({
            ...prev,
            materials: prev.materials.slice(0, prev.materials.length - 1)
        }));
    }

    return <>
        {loading && <BackdropLoader text={loading} />}
        <Button colorScheme={"orange"} onClick={onOpen} isDisabled={mold === null} size="xs" variant="outline" leftIcon={<FaEdit />}>Edit Mold</Button>
        <MyModal
            size={"xl"}
            isOpen={isOpen}
            onClose={onClose}
            closeOnOverlayClick={false}>
            <ModalHeader>Edit Mold</ModalHeader>
            <ModalCloseButton />
            <ModalBody pb={6}>
                <form ref={formRef} id={"form"} onSubmit={e => e.preventDefault()}>
                    <SimpleGrid
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
                                <FormLabel opacity={0.9} fontSize="sm">Mold Name</FormLabel>
                                <PrimaryInput name='mold' placeholder="eg: 4099 Bottle" isDisabled value={data.name} />
                            </FormControl>
                        </GridItem>
                        <GridItem colSpan={{
                            base: 1,
                            lg: 3
                        }}>
                            <FormControl isInvalid={errors.moldLife !== null} size={"sm"}>
                                <FormLabel opacity={0.9} fontSize="sm">Mold Life(shots)</FormLabel>
                                <PrimaryInput name='moldLife' placeholder="eg: 200,000" value={data.moldLife} onChange={e => setData(prev => ({ ...prev, moldLife: +e.target.value }))} />
                                <FormErrorMessage>{errors.moldLife}</FormErrorMessage>
                            </FormControl>
                        </GridItem>
                        <GridItem colSpan={{
                            base: 1,
                            lg: 2
                        }}>
                            <FormControl isInvalid={errors.cavities !== null} size={"sm"}>
                                <FormLabel opacity={0.9} fontSize="sm">Cavities</FormLabel>
                                <PrimaryInput name='cavities' placeholder="eg: 2" value={data.cavities} onChange={e => setData(prev => ({ ...prev, cavities: +e.target.value }))} />
                                <FormErrorMessage>{errors.cavities}</FormErrorMessage>
                            </FormControl>
                        </GridItem>
                        <GridItem colSpan={{
                            base: 1,
                            lg: 3
                        }}>
                            <FormControl isInvalid={errors.productName !== null} size={"sm"}>
                                <FormLabel opacity={0.9} fontSize="sm">Product Name</FormLabel>
                                <PrimaryInput name="product-name" placeholder="eg: bottle cap" value={data.productName} onChange={e => setData(prev => ({ ...prev, productName: e.target.value }))} />
                                <FormErrorMessage>{errors.productName}</FormErrorMessage>
                            </FormControl>
                        </GridItem>
                        <GridItem colSpan={{
                            base: 1,
                            lg: 3
                        }}>
                            <FormControl isInvalid={errors.productColor !== null} size={"sm"}>
                                <FormLabel opacity={0.9} fontSize="sm">Product Color</FormLabel>
                                <PrimaryInput name="product-color" placeholder="eg: black" value={data.productColor} onChange={e => setData(prev => ({ ...prev, productColor: e.target.value }))} />
                                <FormErrorMessage>{errors.productColor}</FormErrorMessage>
                            </FormControl>
                        </GridItem>
                    </SimpleGrid>
                    {/* MATERIALS */}
                    <VStack
                        py={5}
                        w="100%"
                        spacing={5}>
                        {materials.map((material, index) => <SimpleGrid key={index}
                            gap={5}
                            columns={{
                                base: 1,
                                lg: 8
                            }}>
                            <GridItem colSpan={{
                                base: 1,
                                lg: 5
                            }}>
                                <FormControl isInvalid={errors.materials[index].name !== null} size={"sm"}>
                                    <FormLabel opacity={0.9} fontSize="sm">Material {index + 1}</FormLabel>
                                    <SearchableSelector
                                        value={{
                                            label: material.name.toUpperCase(),
                                            value: material.name.toLowerCase()
                                        }}
                                        placeholder="eg: PP"
                                        name="material"
                                        isOptionDisabled={(option: any) => {
                                            const disabled = materials.find(_material => _material.name === option.value);
                                            return disabled !== undefined;
                                        }}
                                        options={rawMaterials.map(material => ({
                                            label: material.name.toUpperCase(),
                                            value: material.name.toLowerCase(),
                                        }))}
                                        onChange={e => setMaterials(prev => {
                                            const newMaterials = [...prev];
                                            newMaterials[index].name = e.value;
                                            newMaterials[index].pc_weight = rawMaterials.find(material => material.name === e.value)?.pc_weight || null;
                                            return newMaterials;
                                        })}
                                        noOptionsMessage="No Materials" />
                                    <FormErrorMessage>{errors.materials[index].name}</FormErrorMessage>
                                </FormControl>
                            </GridItem>
                            <GridItem mr={2} colSpan={{
                                base: 1,
                                lg: 3
                            }}>
                                <FormControl isInvalid={errors.materials[index].weight !== null} size={"sm"}>
                                    <FormLabel opacity={0.9} fontSize="sm">{`${material.pc_weight ? "PCs" : "Weight"} (${material.pc_weight ? weightFormatter(material.pc_weight) : "g"})`}</FormLabel>
                                    <PrimaryInput name="weight" placeholder="eg: 250" type="number" value={material.weight} onChange={e => setMaterials(prev => {
                                        const newMaterials = [...prev];
                                        newMaterials[index].weight = material.pc_weight ? parseInt(e.target.value) : parseFloat(e.target.value);
                                        return newMaterials;
                                    })} />
                                    <FormErrorMessage>{errors.materials[index].weight}</FormErrorMessage>
                                </FormControl>
                            </GridItem>
                        </SimpleGrid>)}
                    </VStack>
                </form>
                <HStack w="100%" justifyContent={"center"} pt={2}>
                    <VStack opacity={0.8} fontSize="sm" w="100%" alignItems={"flex-start"}>
                        <Text>No. of materials: <strong style={{
                            opacity: 1
                        }}>{String(materials.length).padStart(2, "0")}</strong></Text>
                        <Text>Product Weight: <strong style={{
                            opacity: 1
                        }}><WeightFormatter number={materials.reduce((prev, current) => prev + current.weight * (current.pc_weight || 1), 0)} /></strong></Text>
                    </VStack>
                    <VStack fontSize="sm" w="100%" alignItems={"flex-end"}>
                        <PrimaryBtn
                            size="xs"
                            leftIcon={<BsPlus />}
                            onClick={addMaterial}>Add Material</PrimaryBtn>
                        <SecondaryBtn
                            isDisabled={materials.length === 1}
                            size="xs"
                            leftIcon={<BiMinus />}
                            onClick={removeMaterial}>Remove Material</SecondaryBtn>
                    </VStack>
                </HStack>
            </ModalBody>
            <ModalFooter>
                <ConfirmDialog
                    heading="Are you sure?"
                    text={"Are you sure you want to update this mold?" + (isInstalledMold && mold ? ` This will re-install the mold ${mold.name}.` : "")}
                    onConfirm={validate}>
                    <Primary type="submit" mr={3}>Update</Primary>
                </ConfirmDialog>
                <Button onClick={onClose}>Cancel</Button>
            </ModalFooter>
        </MyModal>
    </>
}

export default EditMold