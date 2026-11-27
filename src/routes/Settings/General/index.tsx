import { Box, Center, Flex, FormControl, FormLabel, HStack, Text, useColorMode, useToast, VStack, Icon, Switch, SimpleGrid, GridItem } from "@chakra-ui/react";
import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { PrimaryInput } from "../../../Components/Inputs";
import PrimaryNumberInput from "../../../Components/Inputs/PrimaryNumberInput";
import PrimarySelect from "../../../Components/Inputs/PrimarySelect";
import { SmallFill } from "../../../Components/Loaders";
import MyCard from "../../../Components/micro/Card";
import { frequencyType, GeneralDataProps } from "./types";
import fetch from "./fetch";
import { PrimaryBtn } from "../../../Components/Buttons";
import { FiPercent, FiSave } from "react-icons/fi";
import BackdropLoader from "../../../Components/Loaders/BackdropLoader";
import Get from "../../../Components/Store/hooks/Get";
import { selectedFactoryAtom, uidAtom } from "../../../Components/Store/atoms";
import Listen from "../../../Components/Store/hooks/Listen";
import ConfirmDialog from "../../../Components/micro/ConfirmDialog";
import { selectedFactoryType } from "../../Dashboard";
import NotFound from "../../../Components/micro/NotFound";
import { BsFillExclamationTriangleFill } from "react-icons/bs";
import { Tb360, TbLinkOff } from "react-icons/tb";
import MyTooltip from "../../../Components/micro/MyTooltip";
import dayjs from "../../../Components/Functions/dayjs";

const DAYS = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday"
];
const General = () => {
    const toast = useToast();
    const { colorMode } = useColorMode();
    const { text, subText, border } = useMemo(() => ({
        text: `${colorMode}.text`,
        subText: `${colorMode}.subText`,
        border: `${colorMode}.border`
    }), [colorMode]);
    const [myData, setMyData] = useState<GeneralDataProps | "NO_FACTORY" | null>(null);
    const [loading, setLoading] = useState<string | null>(null);
    const uid = Get(uidAtom);
    const selectedFactory: null | selectedFactoryType = Listen(selectedFactoryAtom);
    const isFactorySelected = useMemo(() => {
        return selectedFactory !== null && (selectedFactory.value !== -1 || selectedFactory.only);
    }, [selectedFactory]);

    const rotation: {
        A: string | null;
        B: string | null;
        C: string | null;
    } = useMemo(() => {
        // if shifts === 1 then only A
        // if shifts === 2 then supervisor a will move to supervisor b and supervisor b will move to supervisor a
        // if shifts === 3 then supervisor a will move to supervisor b, supervisor b will move to supervisor c and supervisor c will move to supervisor a
        if (myData === null || myData === "NO_FACTORY") return { A: null, B: null, C: null };
        if (myData.shiftCount === 1) return { A: myData.shifts.A.name, B: null, C: null };
        if (myData.shiftCount === 2) return { A: myData.shifts.B.name, B: myData.shifts.A.name, C: null };
        return { A: myData.shifts.C.name, B: myData.shifts.A.name, C: myData.shifts.B.name };
    }, [myData]);

    useEffect(() => {
        if (!uid || !selectedFactory) return;
        if (!isFactorySelected) setMyData("NO_FACTORY");
        else {
            setMyData(null);
            fetch(selectedFactory)
                .then(resp => {
                    setMyData(resp);
                    return resp;
                })
                .catch(err => {
                    console.log(err);
                });
        }
    }, [uid, isFactorySelected, selectedFactory]);

    const save = async () => {
        if ((myData === null || myData === "NO_FACTORY") || !isFactorySelected) return;
        try {
            import("./save").then(async resp => {
                try {
                    setLoading("Saving");
                    const response = await resp.default(myData, selectedFactory);
                    if (response === 200) toast({
                        title: "Success",
                        description: "General settings has been updated.",
                        status: "success",
                        duration: 5000,
                        isClosable: true
                    });
                    else toast({
                        title: "Error",
                        description: "Something went wrong.",
                        status: "error",
                        duration: 5000,
                        isClosable: true
                    });
                    setLoading(null);
                } catch (err: any) {
                    console.error(err);
                    toast({
                        title: "Error",
                        description: err?.message || 'Something went wrong.',
                        status: "error",
                        duration: 5000,
                        isClosable: true
                    });
                    setLoading(null);
                }
            }).catch(err => {
                console.error(err);
            });
        } catch (err) {
            console.error(err);
        }
    }

    const updateMyData = (e: ChangeEvent<HTMLSelectElement>) => {
        if (myData === null || myData === "NO_FACTORY") return;
        const { name, value } = e.target;
        if (name === "rotate") {
            setMyData(prev => {
                if (prev === null || prev === "NO_FACTORY" || prev.shiftRotation === null) return prev;
                return {
                    ...prev,
                    shiftRotation: {
                        ...prev.shiftRotation,
                        rotate: value as "supervisors-only" | "operators-only" | "all"
                    }
                }
            });
        } else if (name === "day") {
            setMyData(prev => {
                if (prev === null || prev === "NO_FACTORY" || prev.shiftRotation === null) return prev;
                return {
                    ...prev,
                    shiftRotation: {
                        ...prev.shiftRotation,
                        day: parseInt(value),
                        nextRotation: calculateNextRotation(prev.shiftRotation.frequency, parseInt(value), prev.shifts.A.start)
                    }
                }
            });
        } else if (name === "frequency") {
            setMyData(prev => {
                if (prev === null || prev === "NO_FACTORY" || prev.shiftRotation === null) return prev;
                return {
                    ...prev,
                    shiftRotation: {
                        ...prev.shiftRotation,
                        frequency: value as "weekly" | "monthly",
                        nextRotation: calculateNextRotation(value as "weekly" | "monthly", prev.shiftRotation.day, prev.shifts.A.start)
                    }
                }
            });
        }
    }

    const calculateNextRotation = (frequency: frequencyType, day: number, start: string) => {
        let nextRotation, date;
        if (frequency === "weekly") {
            date = dayjs().startOf("week").add(day, "day").startOf("day");
            if (date.isBefore(dayjs())) date = date.add(1, "week");
            nextRotation = date.add(+start.split(":")?.[0], "hour").add(+start.split(":")?.[1], "minute").unix();
        }
        else {
            date = dayjs().startOf("month").add(day - 1, "day").startOf("day");
            if (date.isBefore(dayjs())) date = date.add(1, "month");
            nextRotation = date.add(+start.split(":")?.[0], "hour").add(+start.split(":")?.[1], "minute").unix();
        }
        return nextRotation + 59;
    }

    const toggleShiftRotation = (e: ChangeEvent<HTMLInputElement>) => {
        if (myData === null || myData === "NO_FACTORY") return;
        const checked = e.target.checked;
        if (checked) {
            setMyData(prev => {
                if (prev === null || prev === "NO_FACTORY") return prev;
                return {
                    ...prev,
                    shiftRotation: {
                        frequency: "weekly",
                        day: 1,
                        rotate: "supervisors-only",
                        nextRotation: calculateNextRotation("weekly", 1, prev.shifts.A.start),
                    }
                }
            });
        } else setMyData(prev => {
            if (prev === null || prev === "NO_FACTORY") return prev;
            return {
                ...prev,
                shiftRotation: null
            }
        });
    };

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
                <Text fontSize="lg" fontWeight={500} color={text}>Factory Info</Text>
                <Text fontSize="sm" color={subText} mt={3}>
                    Update your factory name.
                </Text>
            </Box>
            <MyCard w="100%" px={4} py={4}>
                {
                    myData === null ?
                        <Center h="100px">
                            <SmallFill />
                        </Center>
                        : myData === "NO_FACTORY" ?
                            <NotFound h="150px" text={"Select factory to edit"} icon={BsFillExclamationTriangleFill} />
                            : <VStack w="100%">
                                <FormControl>
                                    <FormLabel color={text}>Factory Name</FormLabel>
                                    <PrimaryInput value={myData.factoryName} placeholder="Factory Name" onChange={e => setMyData(prev => {
                                        if (prev === null || prev === "NO_FACTORY") return prev;
                                        return {
                                            ...prev,
                                            factoryName: e.target.value
                                        }
                                    })} />
                                </FormControl>
                            </VStack>
                }
            </MyCard>
        </Flex>
        <Flex
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
                <Text fontSize="lg" fontWeight={500} color={text}>Shifts Details</Text>
                <Text fontSize="sm" color={subText} mt={3}>
                    Get all the details about your supervisor's shift on our website. Easy access to shift timings of all shifts.
                </Text>
            </Box>
            <Box w="100%">
                <MyCard w="100%" px={4} py={4}>
                    {
                        myData === null ?
                            <Center h="200px">
                                <SmallFill />
                            </Center>
                            : myData === "NO_FACTORY" ?
                                <NotFound h="150px" text={"Select factory to edit"} icon={BsFillExclamationTriangleFill} />
                                : <VStack w="100%" gap={5}>
                                    <FormControl>
                                        <FormLabel color={text}>Total Shifts</FormLabel>
                                        <PrimarySelect value={myData.shiftCount} onChange={e => setMyData(prev => {
                                            if (prev === null || prev === "NO_FACTORY") return prev;
                                            return {
                                                ...prev,
                                                shiftCount: parseInt(e.target.value)
                                            }
                                        })}>
                                            <option>1</option>
                                            <option>2</option>
                                            <option>3</option>
                                        </PrimarySelect>
                                    </FormControl>
                                    <HStack w="100%" gap={5} flexDir={{
                                        base: "column",
                                        lg: "row"
                                    }}>
                                        <FormControl>
                                            <FormLabel color={text}>Supervisor A</FormLabel>
                                            <PrimaryInput value={myData.shifts.A.name} onChange={e => setMyData(prev => {
                                                if (prev === null || prev === "NO_FACTORY") return prev;
                                                return {
                                                    ...prev,
                                                    shifts: {
                                                        ...prev.shifts,
                                                        A: {
                                                            ...prev.shifts.A,
                                                            name: e.target.value
                                                        }
                                                    }
                                                }
                                            })} placeholder="Supervisor A name" />
                                        </FormControl>
                                        <HStack w="100%" gap={5} flexDir={{
                                            base: "column",
                                            sm: "row"
                                        }}>
                                            <FormControl>
                                                <FormLabel color={text}>Shift A Start</FormLabel>
                                                <PrimaryInput value={myData.shifts.A.start} type="time" placeholder="Shift A Start" onChange={e => setMyData(prev => {
                                                    if (prev === null || prev === "NO_FACTORY") return prev;
                                                    return {
                                                        ...prev,
                                                        shifts: {
                                                            ...prev.shifts,
                                                            A: {
                                                                ...prev.shifts.A,
                                                                start: e.target.value
                                                            }
                                                        },
                                                        shiftRotation: prev.shiftRotation === null ? null : {
                                                            ...prev.shiftRotation,
                                                            nextRotation: calculateNextRotation(prev.shiftRotation.frequency, prev.shiftRotation.day, e.target.value)
                                                        }
                                                    }
                                                })} />
                                            </FormControl>
                                            <FormControl>
                                                <FormLabel color={text}>Shift A Hours</FormLabel>
                                                <PrimaryNumberInput value={myData.shifts.A.hours} placeholder="Working Hours" onChange={e => setMyData(prev => {
                                                    if (prev === null || prev === "NO_FACTORY") return prev;
                                                    return {
                                                        ...prev,
                                                        shifts: {
                                                            ...prev.shifts,
                                                            A: {
                                                                ...prev.shifts.A,
                                                                hours: parseInt(e)
                                                            }
                                                        }
                                                    }
                                                })} />
                                            </FormControl>
                                        </HStack>
                                    </HStack>
                                    {
                                        myData.shiftCount > 1 && <>
                                            <HStack w="100%" gap={5} flexDir={{
                                                base: "column",
                                                lg: "row"
                                            }}>
                                                <FormControl>
                                                    <FormLabel color={text}>Supervisor B</FormLabel>
                                                    <PrimaryInput value={myData.shifts.B.name || ''} placeholder="Supervisor B name" onChange={e => setMyData(prev => {
                                                        if (prev === null || prev === "NO_FACTORY") return prev;
                                                        return {
                                                            ...prev,
                                                            shifts: {
                                                                ...prev.shifts,
                                                                B: {
                                                                    ...prev.shifts.B,
                                                                    name: e.target.value
                                                                }
                                                            }
                                                        }
                                                    })} />
                                                </FormControl>
                                                <HStack w="100%" gap={5} flexDir={{
                                                    base: "column",
                                                    sm: "row"
                                                }}>
                                                    <FormControl>
                                                        <FormLabel color={text}>Shift B Start</FormLabel>
                                                        <PrimaryInput value={myData.shifts.B.start || ''} type="time" placeholder="Shift B Start" onChange={e => setMyData(prev => {
                                                            if (prev === null || prev === "NO_FACTORY") return prev;
                                                            return {
                                                                ...prev,
                                                                shifts: {
                                                                    ...prev.shifts,
                                                                    B: {
                                                                        ...prev.shifts.B,
                                                                        start: e.target.value
                                                                    }
                                                                }
                                                            }
                                                        })} />
                                                    </FormControl>
                                                    <FormControl>
                                                        <FormLabel color={text}>Shift B Hours</FormLabel>
                                                        <PrimaryNumberInput value={myData.shifts.B.hours || ''} placeholder="Working Hours" onChange={e => setMyData(prev => {
                                                            if (prev === null || prev === "NO_FACTORY") return prev;
                                                            return {
                                                                ...prev,
                                                                shifts: {
                                                                    ...prev.shifts,
                                                                    B: {
                                                                        ...prev.shifts.B,
                                                                        hours: parseInt(e)
                                                                    }
                                                                }
                                                            }
                                                        })} />
                                                    </FormControl>
                                                </HStack>
                                            </HStack>
                                        </>
                                    }
                                    {
                                        myData.shiftCount > 2 && <>
                                            <HStack w="100%" gap={5} flexDir={{
                                                base: "column",
                                                lg: "row"
                                            }}>
                                                <FormControl>
                                                    <FormLabel color={text}>Supervisor C</FormLabel>
                                                    <PrimaryInput value={myData.shifts.C.name || ''} placeholder="Supervisor C name" onChange={e => setMyData(prev => {
                                                        if (prev === null || prev === "NO_FACTORY") return prev;
                                                        return {
                                                            ...prev,
                                                            shifts: {
                                                                ...prev.shifts,
                                                                C: {
                                                                    ...prev.shifts.C,
                                                                    name: e.target.value
                                                                }
                                                            }
                                                        }
                                                    })} />
                                                </FormControl>
                                                <HStack w="100%" gap={5} flexDir={{
                                                    base: "column",
                                                    sm: "row"
                                                }}>
                                                    <FormControl>
                                                        <FormLabel color={text}>Shift C Start</FormLabel>
                                                        <PrimaryInput value={myData.shifts.C.start || ''} type="time" placeholder="Shift C Start" onChange={e => setMyData(prev => {
                                                            if (prev === null || prev === "NO_FACTORY") return prev;
                                                            return {
                                                                ...prev,
                                                                shifts: {
                                                                    ...prev.shifts,
                                                                    C: {
                                                                        ...prev.shifts.C,
                                                                        start: e.target.value
                                                                    }
                                                                }
                                                            }
                                                        })} />
                                                    </FormControl>
                                                    <FormControl>
                                                        <FormLabel color={text}>Shift C Hours</FormLabel>
                                                        <PrimaryNumberInput value={myData.shifts.C.hours || ''} placeholder="Working Hours" onChange={e => setMyData(prev => {
                                                            if (prev === null || prev === "NO_FACTORY") return prev;
                                                            return {
                                                                ...prev,
                                                                shifts: {
                                                                    ...prev.shifts,
                                                                    C: {
                                                                        ...prev.shifts.C,
                                                                        hours: parseInt(e)
                                                                    }
                                                                }
                                                            }
                                                        })} />
                                                    </FormControl>
                                                </HStack>
                                            </HStack>
                                        </>
                                    }
                                    <VStack
                                        py={7}
                                        px={2}
                                        gap={5}
                                        borderTop="1px dashed"
                                        borderColor={border}
                                        w="100%">
                                        <HStack
                                            w="100%"
                                            justifyContent={"space-between"}>
                                            <HStack gap={2}>
                                                <Icon fontSize="3xl" as={Tb360} />
                                                <VStack alignItems={"flex-start"} lineHeight={1}>
                                                    <Text fontWeight={700}>Shift Rotation</Text>
                                                    <Text maxW={{
                                                        base: "100%",
                                                        lg: "70%"
                                                    }} fontSize="xs" fontWeight={500} opacity={0.8}>Specify rotation frequency (weekly or monthly) and day, automatically rotating shifts to ensure seamless scheduling and accountability.</Text>
                                                </VStack>
                                            </HStack>
                                            <Switch size="lg" colorScheme={"orange"} isChecked={myData.shiftRotation !== null} onChange={toggleShiftRotation} />
                                        </HStack>
                                        {myData.shiftRotation !== null && <SimpleGrid w="100%" gap={5} columns={{
                                            base: 1,
                                            sm: 4
                                        }}>
                                            <GridItem
                                                as={HStack}
                                                w="100%"
                                                gap={5}
                                                colSpan={{
                                                    base: 1,
                                                    sm: 3
                                                }}>
                                                <FormControl>
                                                    <FormLabel color={text}>Frequency</FormLabel>
                                                    <PrimarySelect size="sm" value={myData.shiftRotation.frequency} name="frequency" onChange={updateMyData}>
                                                        <option value="weekly">Weekly</option>
                                                        <option value="monthly">Monthly</option>
                                                    </PrimarySelect>
                                                </FormControl>
                                                <FormControl>
                                                    <FormLabel color={text}>Day</FormLabel>
                                                    <PrimarySelect size="sm" value={myData.shiftRotation.day} name="day" onChange={updateMyData}>
                                                        {myData.shiftRotation.frequency === "weekly" ?
                                                            DAYS.map((day, index) => <option key={index} value={index}>{day}</option>)
                                                            : Array.from({ length: 31 }, (_, i) => i + 1).map((day, index) => <option key={index} value={day}>{day}</option>)}
                                                    </PrimarySelect>
                                                </FormControl>
                                                <FormControl>
                                                    <FormLabel color={text}>Rotate</FormLabel>
                                                    <PrimarySelect size="sm" value={myData.shiftRotation.rotate} name="rotate" onChange={updateMyData}>
                                                        <option value="supervisors-only">Supervisors Only</option>
                                                        <option value="operators-only">Operators Only</option>
                                                        <option value="all">All</option>
                                                    </PrimarySelect>
                                                </FormControl>
                                            </GridItem>
                                            <VStack opacity={0.8} fontSize="md" w="100%" alignItems={"flex-end"} justifyContent="flex-end">
                                                <SimpleGrid columns={2} w="100%" gap={1}>
                                                    <Text fontSize={"sm"}>Next Rotation: </Text>
                                                    <Text fontSize={"sm"} fontWeight="bold"><MyTooltip label={dayjs.unix(myData.shiftRotation.nextRotation).format("hh:mm A | dddd, MMMM D")}>{dayjs.unix(myData.shiftRotation.nextRotation).fromNow()}</MyTooltip></Text>
                                                    {rotation.A && <>
                                                        <Text fontSize={"sm"}>Supervisor A: </Text>
                                                        <Text fontSize={"sm"} fontWeight="bold">{rotation.A}</Text>
                                                    </>}
                                                    {rotation.B && <>
                                                        <Text fontSize={"sm"}>Supervisor B: </Text>
                                                        <Text fontSize={"sm"} fontWeight="bold">{rotation.B}</Text>
                                                    </>}
                                                    {rotation.C && <>
                                                        <Text fontSize={"sm"}>Supervisor C: </Text>
                                                        <Text fontSize={"sm"} fontWeight="bold">{rotation.C}</Text>
                                                    </>}
                                                </SimpleGrid>
                                            </VStack>
                                        </SimpleGrid>}
                                    </VStack>
                                    <VStack
                                        py={7}
                                        px={2}
                                        gap={5}
                                        borderTop="1px dashed"
                                        borderColor={border}
                                        w="100%">
                                        <HStack
                                            w="100%"
                                            justifyContent={"space-between"}>
                                            <HStack gap={2}>
                                                <Icon fontSize="3xl" as={FiPercent} />
                                                <VStack alignItems={"flex-start"} lineHeight={1}>
                                                    <Text fontWeight={700}>OFF TIME based efficiency</Text>
                                                    <Text maxW={"100%"} fontSize="xs" fontWeight={500} opacity={0.8}>
                                                        When calculating machine's efficiency, OFF.T will also be taken into consideration.
                                                        <br />
                                                        <br />
                                                        <strong>Normal Formula: </strong>ON.T ÷ (ON.T + IDLE.T)
                                                        <br />
                                                        <strong>Updated Formula: </strong>ON.T ÷ (ON.T + IDLE.T + OFF.T)
                                                    </Text>
                                                </VStack>
                                            </HStack>
                                            <Switch size="lg" colorScheme={"orange"} isChecked={myData.offTimeBasedEfficiency} onChange={e => {
                                                setMyData(prev => {
                                                    if (prev === null || prev === "NO_FACTORY") return prev;
                                                    return {
                                                        ...prev,
                                                        offTimeBasedEfficiency: e.target.checked
                                                    }
                                                });
                                            }} />
                                        </HStack>
                                    </VStack>
                                    <VStack
                                        py={7}
                                        px={2}
                                        gap={5}
                                        borderTop="1px dashed"
                                        borderColor={border}
                                        w="100%">
                                        <HStack
                                            w="100%"
                                            justifyContent={"space-between"}>
                                            <HStack gap={2}>
                                                <Icon fontSize="3xl" as={TbLinkOff} />
                                                <VStack alignItems={"flex-start"} lineHeight={1}>
                                                    <Text fontWeight={700}>OFFLINE Time</Text>
                                                    <Text maxW={"100%"} fontSize="xs" fontWeight={500} opacity={0.8}>
                                                        Unit's status will be considered OFFLINE if it's not connected to our server for more than selected time.
                                                        <br />
                                                        <br />
                                                        <strong>NOTE: </strong>Only select 3 minutes if all units have a stable internet connection.
                                                    </Text>
                                                </VStack>
                                            </HStack>
                                            <PrimarySelect size="sm" maxW="150px" value={myData.offlineTime} onChange={e => {
                                                setMyData(prev => {
                                                    if (prev === null || prev === "NO_FACTORY") return prev;
                                                    return {
                                                        ...prev,
                                                        offlineTime: +e.target.value
                                                    }
                                                });
                                            }}>
                                                <option value={3}>3 Minutes</option>
                                                <option value={10}>10 Minutes</option>
                                                <option value={15}>15 Minutes</option>
                                                <option value={20}>20 Minutes</option>
                                            </PrimarySelect>
                                        </HStack>
                                    </VStack>
                                </VStack>
                    }
                </MyCard>
                <ConfirmDialog onConfirm={save}>
                    <PrimaryBtn display={"block"} ml="auto" mt='30px' rightIcon={<FiSave />}>Save Changes</PrimaryBtn>
                </ConfirmDialog>
            </Box>
        </Flex>
    </>
}

export default General