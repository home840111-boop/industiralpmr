import { Button, Checkbox, FormControl, FormErrorMessage, FormLabel, GridItem, HStack, SimpleGrid, Text, useToast, VStack } from "@chakra-ui/react";
import { useRef, useState } from "react";
import { BsPlus } from "react-icons/bs";
import { z, ZodIssueBase } from "zod";
import { PrimaryBtn, SecondaryBtn } from "../../../../Components/Buttons";
import { update } from "../../../../Components/firebase/api/db";
import { PrimaryInput } from "../../../../Components/Inputs";
import SearchableSelector from "../../../../Components/Inputs/SearchableSelector";
import BackdropLoader from "../../../../Components/Loaders/BackdropLoader";
import { Mold } from "../types";
import ConfirmDialog from "../../../../Components/micro/ConfirmDialog";
import { BiMinus } from "react-icons/bi";
import WeightFormatter from "../../../../Components/micro/WeightFormatter";
import weightFormatter from "../../../../Components/Functions/formatters/weightFormatter";
import logger from "../../../../Components/micro/logger";
import { MyRawMaterial } from ".";
import { factoryProductionType } from "../../../../Components/Store/atoms";

interface Errors {
    mold: string | null;
    moldLife: string | null;
    cavities: string | null;
    productName: string | null;
    productColor: string | null;
    materials: {
        name: string | null;
        weight: string | null;
    }[];
}

interface Material {
    name: string;
    weight: number;
}
interface Data {
    mold: string;
    moldLife: number;
    cavities: number;
    productName: string;
    productColor: string;
    materials: Material[];
}
interface MaterialWithPCWeight extends Material {
    pc_weight: number | null;
}

const AddMold = ({
    matrials,
    setMounted,
    molds,
    productionType,
    machineID
}: {
    matrials: MyRawMaterial[],
    productionType: factoryProductionType | null,
    setMounted: (mounted: boolean) => void;
    molds: Mold[];
    machineID?: string;
}) => {
    const rawMaterials = matrials;
    const toast = useToast();
    const formRef = useRef<HTMLFormElement>(null);
    const [loading, setLoading] = useState<string | null>(null);
    const [materials, setMaterials] = useState<MaterialWithPCWeight[]>([{ name: "", weight: 0, pc_weight: null }]);
    const [isUniversalMold, setIsUniversalMold] = useState(false);
    const [errors, setErrors] = useState<Errors>({
        mold: null,
        moldLife: null,
        cavities: null,
        productName: null,
        productColor: null,
        materials: [{
            name: null,
            weight: null,
        }],
    });

    const validate = async () => {
        const formElement = formRef.current;
        if (!formElement) return;
        try {
            const moldSchema = z.object({
                mold: z.string().min(1).max(50).refine(mold => {
                    // eslint-disable-next-line
                    const specials = /[!@#$%^&*()+\=\[\]{};':"\\|,.<>\/?]+/;
                    return !specials.test(mold)
                }, "Special characters are not allowed.").refine(mold => {
                    return !molds.find(_mold => _mold.name === mold);
                }, "Mold already exists."),
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
            const form = new FormData(formElement);
            const unfilterefData = Object.fromEntries(form.entries());
            const myMaterials = materials.map(material => ({
                name: material.name,
                weight: material.weight * (material.pc_weight || 1),
                pc_weight: material.pc_weight || null
            }));
            const data = {
                mold: unfilterefData["mold"],
                moldLife: +unfilterefData["moldLife"] || 0,
                cavities: productionType === "meter" ? 1 : +unfilterefData["cavities"],
                productName: unfilterefData["product-name"],
                productColor: unfilterefData["product-color"],
                materials: myMaterials,
            };
            const results = moldSchema.safeParse(data);
            const myErrors: Errors = {
                mold: null,
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
                addMold(results.data as Data);
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

    const addMold = async (data: Data) => {
        if (!data || !machineID) return;
        try {
            setLoading("Adding mold");
            logger("add-mold", {
                machineID,
                data
            });
            await update(`molds/${isUniversalMold ? "UNIVERSAL_MOLDS" : machineID}/${data.mold}`, {
                ...data,
                mold: null
            });
            setLoading(null);
            setMounted(false);
            formRef.current?.reset();
            setIsUniversalMold(false);
            setMaterials([{ name: "", weight: 0, pc_weight: null }]);
            toast({
                title: "Success",
                description: "Mold added successfully.",
                status: "success",
                duration: 5000,
                isClosable: true,
            });
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

    return <form ref={formRef} onSubmit={e => e.preventDefault()}>
        {loading && <BackdropLoader text={loading} />}
        <VStack gap={5} w="100%" mt={2}>
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
                    <FormControl isInvalid={errors.mold !== null} size={"sm"}>
                        <FormLabel opacity={0.9} fontSize="sm">Mold Name</FormLabel>
                        <PrimaryInput name='mold' size="sm" placeholder="eg: 4099 Bottle" />
                        <FormErrorMessage>{errors.mold}</FormErrorMessage>
                    </FormControl>
                </GridItem>
                <GridItem colSpan={{
                    base: 1,
                    lg: 3
                }}>
                    <FormControl isDisabled={productionType === "meter"} isInvalid={errors.moldLife !== null} size={"sm"}>
                        <FormLabel opacity={0.9} fontSize="sm">Mold Life(shots)</FormLabel>
                        <PrimaryInput name='moldLife' size="sm" placeholder="eg: 200,000" />
                        <FormErrorMessage>{errors.moldLife}</FormErrorMessage>
                    </FormControl>
                </GridItem>
                <GridItem colSpan={{
                    base: 1,
                    lg: 2
                }}>
                    <FormControl isDisabled={productionType === "meter"} isInvalid={errors.cavities !== null} size={"sm"}>
                        <FormLabel opacity={0.9} fontSize="sm">Cavities</FormLabel>
                        <PrimaryInput name='cavities' size="sm" placeholder="eg: 2" />
                        <FormErrorMessage>{errors.cavities}</FormErrorMessage>
                    </FormControl>
                </GridItem>
                <GridItem colSpan={{
                    base: 1,
                    lg: 3
                }}>
                    <FormControl isInvalid={errors.productName !== null} size={"sm"}>
                        <FormLabel opacity={0.9} fontSize="sm">Product Name</FormLabel>
                        <PrimaryInput name="product-name" size="sm" placeholder="eg: bottle cap" />
                        <FormErrorMessage>{errors.productName}</FormErrorMessage>
                    </FormControl>
                </GridItem>
                <GridItem colSpan={{
                    base: 1,
                    lg: 3
                }}>
                    <FormControl isInvalid={errors.productColor !== null} size={"sm"}>
                        <FormLabel opacity={0.9} fontSize="sm">Product Color</FormLabel>
                        <PrimaryInput name="product-color" size="sm" placeholder="eg: black" />
                        <FormErrorMessage>{errors.productColor}</FormErrorMessage>
                    </FormControl>
                </GridItem>
            </SimpleGrid>
            {/* MATERIALS */}
            <VStack
                overflow={"auto"}
                height="250px"
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
                                menuPortalTarget={document.body}
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
                                size="sm"
                                noOptionsMessage="No Materials" />
                            <FormErrorMessage>{errors.materials[index].name}</FormErrorMessage>
                        </FormControl>
                    </GridItem>
                    <GridItem mr={2} colSpan={{
                        base: 1,
                        lg: 3
                    }}>
                        <FormControl isInvalid={errors.materials[index].weight !== null} size={"sm"}>
                            <FormLabel opacity={0.9} fontSize="sm">{`${material.pc_weight ? "PCs" : "Weight"} (${material.pc_weight ? weightFormatter(material.pc_weight) : "g"}) / ${productionType === "meter" ? "Meter" : "Piece"}`}</FormLabel>
                            <PrimaryInput name="weight" size="sm" placeholder="eg: 250" type="number" value={material.weight} onChange={e => setMaterials(prev => {
                                const newMaterials = [...prev];
                                newMaterials[index].weight = +e.target.value;
                                return newMaterials;
                            })} />
                            <FormErrorMessage>{errors.materials[index].weight}</FormErrorMessage>
                        </FormControl>
                    </GridItem>
                </SimpleGrid>)}
            </VStack>
            <HStack w="100%" justifyContent={"center"}>
                <VStack opacity={0.8} fontSize="sm" w="100%" alignItems={"flex-start"}>
                    <Text>No. of materials: <strong style={{
                        opacity: 1
                    }}>{String(materials.length).padStart(2, "0")}</strong></Text>
                    <Text>{productionType === "meter" ? "Meter" : "Product"} Weight: <strong style={{
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
            <HStack w="100%" justifyContent={"space-between"} mt={"auto"}>
                <Checkbox size='md' colorScheme='orange' isChecked={isUniversalMold} onChange={() => setIsUniversalMold(prev => !prev)}>
                    Universal mold
                </Checkbox>
                <ConfirmDialog
                    heading="Are you sure?"
                    text="Are you sure you want to add this mold?"
                    onConfirm={validate}>
                    <Button size="sm" leftIcon={<BsPlus />} type="submit" colorScheme={"green"}>Add Mold</Button>
                </ConfirmDialog>
            </HStack>
        </VStack>
    </form>
}

export type { Data as MoldType };
export default AddMold;