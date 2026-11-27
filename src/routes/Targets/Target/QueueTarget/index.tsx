import { Button, Checkbox, Flex, FormControl, FormErrorMessage, FormLabel, GridItem, HStack, ModalBody, ModalCloseButton, ModalFooter, ModalHeader, SimpleGrid, Text, useDisclosure, useToast, VStack } from "@chakra-ui/react";
import { cloneElement, isValidElement, useEffect, useMemo, useState } from "react";
import Primary from "../../../../Components/Buttons/Primary";
import { PrimaryInput } from "../../../../Components/Inputs";
import PrimarySelect from "../../../../Components/Inputs/PrimarySelect";
import BackdropLoader from "../../../../Components/Loaders/BackdropLoader"
import MinifiedNumberFormatter from "../../../../Components/micro/MinifiedNumberFormatter";
import MyModal from "../../../../Components/micro/MyModal";
import dayjs from "../../../../Components/Functions/dayjs";
import MyTooltip from "../../../../Components/micro/MyTooltip";
import minifiedSecFormatter from "../../../../Components/Functions/formatters/minifiedSecFormatter";
import { z } from "zod";
import { get, push } from "../../../../Components/firebase/api/db";
import SearchableSelector from "../../../../Components/Inputs/SearchableSelector";
import { Option } from "../../../Reports/Selector/types";
import { useParams } from "react-router-dom";
import { SapTargetOrder, useIsSapEnabled } from "../../../../Services/sap";
import SapOrderSelector from "../AddUpdateTarget/SapOrderSelector";

interface ErrorsType {
    name: string | null;
    target: string | null;
    hourlyTarget: string | null;
    due: string | null;
};
interface DataType {
    name: string;
    target: number;
    hourlyTarget: number;
    due?: string;
    machineMonitorDowntime: boolean;
    notifications: ("milestone" | "due-missed" | "exp-target-missed")[];
    notificationCategories: string[]
};
const NOTIFICATION_OPTIONS = {
    "milestone": "Milestone",
    "due-missed": "Due Missed",
    "exp-target-missed": "Expected Target Missed"
}
const formSchema = z
    .object({
        name: z.string().min(1).max(150),
        target: z.number().min(1),
        hourlyTarget: z.number().min(1),
        due: z.string().optional()
    }).superRefine(({ due }, ctx) => {
        if (dayjs(due).isBefore(dayjs().format("YYYY-MM-DD"))) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Due date cannot be in the past",
                path: ["due"]
            });
        }
    })
const QueueTarget = ({
    children,
    order,
    monitorDowntime,
    refetch,
    notificationCategories
}: {
    children?: JSX.Element,
    order: number,
    refetch: () => void,
    monitorDowntime: boolean,
    queue?: boolean,
    notificationCategories: string[]
}) => {
    const { machineID } = useParams<{ machineID: string }>();
    const toast = useToast();
    const isSapEnabled = useIsSapEnabled();
    const [loading, setLoading] = useState<string | null>(null);
    const [autoDueDate, setAutoDueDate] = useState<boolean>(true);
    const [sapOrder, setSapOrder] = useState<SapTargetOrder | null>(null);
    const { isOpen, onOpen, onClose } = useDisclosure();
    const btn = isValidElement(children) ?
        cloneElement(children as JSX.Element, { onClick: onOpen })
        : <Button onClick={onOpen}>Open</Button>;
    const [mold, setMold] = useState<{
        id: string,
        name: string,
        cycleTime: number,
        cavities: number
    } | null>(null);
    const [molds, setMolds] = useState<{
        name: string,
        id: string,
        cycleTime: number,
        cavities: number
    }[]>([]);
    const [errors, setErrors] = useState<ErrorsType>({
        name: null,
        target: null,
        hourlyTarget: null,
        due: null
    });
    const [myData, setMyData] = useState<DataType>({
        name: "",
        target: 0,
        hourlyTarget: 0,
        machineMonitorDowntime: monitorDowntime,
        notifications: [],
        notificationCategories: []
    });
    const expectedEnd = useMemo(() => {
        let now = dayjs().unix();
        if (!mold || !myData.target || !mold.cycleTime) return now;
        const shots = myData.target / mold.cavities;
        if (shots < 1) return now + mold.cycleTime;
        // round up to the nearest cycle time
        return now + (mold.cycleTime * Math.ceil(shots));
    }, [myData.target, mold]);
    const maxHourlyTarget = useMemo(() => {
        if (!mold) return 0;
        return Math.floor((3600 / mold.cycleTime) * mold.cavities);
    }, [mold]);

    useEffect(() => {
        if (!machineID) return;
        const func = async () => {
            const snap = await get(`molds/${machineID}`);
            const molds: {
                id: string,
                name: string,
                cycleTime: number,
                cavities: number
            }[] = [];
            snap.forEach(s => {
                if (s.key === null) return;
                const cycleTimeAvg = s.child("cycleTimeAvg").val() || 0 as number;
                const cavities = s.child("cavities").val() || 0 as number;
                molds.push({
                    id: s.key,
                    name: cycleTimeAvg ? s.key.toUpperCase() + ` (${cycleTimeAvg.toFixed(0)}s)` : s.key.toUpperCase(),
                    cycleTime: cycleTimeAvg,
                    cavities
                })
            });
            setMolds(molds);
            setMold(molds.at(0) || null);
        };
        func();
    }, [machineID]);

    useEffect(() => {
        if (isOpen && maxHourlyTarget > 0 && !myData.hourlyTarget) {
            setMyData(prev => ({
                ...prev,
                hourlyTarget: prev.hourlyTarget || maxHourlyTarget
            }));
        }
    }, [isOpen, maxHourlyTarget, myData.hourlyTarget]);

    const updateAutoDueDate = () => {
        if (!autoDueDate) return;
        if (myData.hourlyTarget) {
            const hours = myData.target / myData.hourlyTarget;
            setMyData({
                ...myData,
                due: dayjs().add(hours, "hour").format("YYYY-MM-DDTHH:mm")
            });
        } else {
            setMyData({
                ...myData,
                due: dayjs.unix(expectedEnd).add(1, "hour").format("YYYY-MM-DDTHH:mm")
            });
        }
    };

    useEffect(() => {
        updateAutoDueDate();
        // eslint-disable-next-line
    }, [autoDueDate, myData.target, myData.hourlyTarget, expectedEnd]);

    const submit = async () => {
        if (!mold) return;
        setLoading("Adding Target");
        const results = formSchema.safeParse(myData);
        if (!results.success) {
            const errors = results.error.format();
            setErrors({
                name: errors.name?._errors.join(", ") || null,
                target: errors.target?._errors.join(", ") || null,
                hourlyTarget: errors.hourlyTarget?._errors.join(", ") || null,
                due: errors.due?._errors.join(", ") || null
            });
        } else {
            setErrors({
                name: null,
                target: null,
                hourlyTarget: null,
                due: null
            });
            try {
                const shots = myData.target / mold.cavities;
                const duration = Math.ceil(shots) * mold.cycleTime;
                const isSapTarget = Boolean(isSapEnabled && sapOrder);
                const payload = {
                    name: myData.name,
                    sapOrder: isSapTarget ? sapOrder : null,
                    isSap: isSapTarget,
                    noAutoComplete: isSapTarget,
                    target: {
                        total: myData.target,
                        hourlyTarget: myData.hourlyTarget,
                        monitorDowntime: monitorDowntime || myData.machineMonitorDowntime,
                        current: 0,
                        due: myData.due || null,
                        isSap: isSapTarget,
                        noAutoComplete: isSapTarget,
                    },
                    notifications: myData.notifications || null,
                    notificationCategories: myData.notificationCategories || null
                };
                await Promise.all([
                    push(`production-targets/queue/${machineID}`, {
                        moldName: mold.id,
                        cycleTime: mold.cycleTime,
                        order,
                        duration,
                        target: payload,
                    }),
                ]);
                setMyData({
                    name: "",
                    target: 0,
                    hourlyTarget: 0,
                    machineMonitorDowntime: monitorDowntime,
                    notifications: [],
                    notificationCategories: []
                });
                setSapOrder(null);
                refetch();
                onClose();
                toast({
                    title: "Success",
                    description: "Target has been queued.",
                    status: "success",
                    duration: 5000,
                    isClosable: true
                });
            } catch (err) {
                console.error(err);
                toast({
                    title: "Error",
                    description: "something went wrong.",
                    status: "error",
                    duration: 5000,
                    isClosable: true
                });
            }
        }
        setLoading(null);
    };

    return <>
        {loading && <BackdropLoader text={loading} />}
        {btn}
        <MyModal
            size={{ base: "full", sm: "xl", md: "2xl" }}
            isOpen={isOpen}
            onClose={onClose}>
            <ModalHeader>Queue Target</ModalHeader>
            <ModalCloseButton />
            <ModalBody pb={6}>
                <VStack gap={4}>
                    {isSapEnabled && (
                        <SapOrderSelector
                            selectedSapOrder={sapOrder}
                            onSelect={(newSapOrder, autoValues) => {
                                setSapOrder(newSapOrder);
                                setMyData((prev) => ({
                                    ...prev,
                                    name: autoValues.name,
                                    target: autoValues.target,
                                    due: autoValues.due ? dayjs(autoValues.due).format("YYYY-MM-DDTHH:mm") : prev.due,
                                }));
                                setAutoDueDate(false);
                            }}
                            onClear={() => {
                                setSapOrder(null);
                            }}
                        />
                    )}
                    <HStack w="100%" gap={4}>
                        <FormControl isRequired isInvalid={errors.name !== null}>
                            <FormLabel>Name</FormLabel>
                            <PrimaryInput name="name" placeholder='Target Name' value={myData.name} onChange={e => setMyData({ ...myData, name: e.target.value })} />
                            <FormErrorMessage>{errors.name}</FormErrorMessage>
                        </FormControl>
                        <FormControl isRequired>
                            <FormLabel>Mold</FormLabel>
                            <PrimarySelect fontWeight={700} textTransform="uppercase" value={mold?.id} onChange={e => {
                                const selectedMold = molds.find(m => m.id === e.target.value);
                                if (!selectedMold) return;
                                setMold(selectedMold);
                                const newMax = Math.floor((3600 / selectedMold.cycleTime) * selectedMold.cavities);
                                if (newMax > 0 && (!myData.hourlyTarget || myData.hourlyTarget === maxHourlyTarget)) {
                                    setMyData(prev => ({ ...prev, hourlyTarget: newMax }));
                                }
                            }}>
                                {molds.map(mold => {
                                    return <option key={mold.id} value={mold.id}>{mold.name}</option>
                                })}
                            </PrimarySelect>
                        </FormControl>
                    </HStack>
                    <SimpleGrid columns={5} w="100%" gap={4}>
                        <FormControl as={GridItem} colSpan={3} isRequired isInvalid={errors.target !== null}>
                            <Flex justifyContent="space-between" alignItems="center">
                                <FormLabel mb={1}>Target <span style={{ fontSize: "0.7rem", opacity: 0.8 }}>pc(s)</span></FormLabel>
                                {isSapEnabled && sapOrder && (
                                    <Text fontSize="xs" color="blue.500" fontWeight={600}>
                                        Locked to SAP
                                    </Text>
                                )}
                            </Flex>
                            <PrimaryInput
                                isReadOnly={isSapEnabled && !!sapOrder}
                                name="target"
                                placeholder='Target Quantity (pcs)'
                                type="number"
                                value={myData.target === 0 ? "" : myData.target}
                                onChange={e => !(isSapEnabled && sapOrder) && setMyData({ ...myData, target: e.target.value === "" ? 0 : +e.target.value })}
                            />
                            <FormErrorMessage>{errors.target}</FormErrorMessage>
                        </FormControl>
                        <FormControl as={GridItem} colSpan={2} isInvalid={errors.hourlyTarget !== null}>
                            <Flex justifyContent="space-between" alignItems="center">
                                <FormLabel mb={1}>Hourly Target <span style={{ fontSize: "0.7rem", opacity: 0.8 }}>pc(s)</span></FormLabel>
                                {maxHourlyTarget > 0 && myData.hourlyTarget !== maxHourlyTarget && (
                                    <Button
                                        size="2xs"
                                        variant="ghost"
                                        colorScheme="orange"
                                        h="16px"
                                        fontSize="2xs"
                                        px={1}
                                        onClick={() => setMyData(prev => ({ ...prev, hourlyTarget: maxHourlyTarget }))}
                                        title={`Apply Max Hourly Target (${maxHourlyTarget})`}
                                    >
                                        Auto-fill
                                    </Button>
                                )}
                            </Flex>
                            <PrimaryInput
                                name="hourlyTarget"
                                placeholder='Target Quantity (pcs)'
                                type="number"
                                value={myData.hourlyTarget === 0 ? "" : myData.hourlyTarget}
                                onChange={e => setMyData({ ...myData, hourlyTarget: e.target.value === "" ? 0 : +e.target.value })}
                            />
                            <FormErrorMessage>{errors.hourlyTarget}</FormErrorMessage>
                        </FormControl>
                    </SimpleGrid>
                    <SimpleGrid columns={5} w="100%" gap={4}>
                        <FormControl as={GridItem} colSpan={2} isRequired>
                            <FormLabel>Monitor Downtime</FormLabel>
                            <PrimarySelect name={"monitor-downtime"} isDisabled={monitorDowntime} defaultValue={monitorDowntime || myData.machineMonitorDowntime ? "Yes" : "No"} onChange={e => setMyData({ ...myData, machineMonitorDowntime: e.target.value === "Yes" })}>
                                <option>Yes</option>
                                <option>No</option>
                            </PrimarySelect>
                        </FormControl>
                        <FormControl as={GridItem} colSpan={3} isInvalid={errors.due !== null}>
                            <Flex p={1} w="100%" justifyContent={"space-between"} flexDir="row">
                                <Text w="fit-content">Due Date</Text>
                                <Checkbox
                                    w="fit-content"
                                    size="sm"
                                    colorScheme="orange"
                                    isChecked={autoDueDate}
                                    onChange={e => setAutoDueDate(e.target.checked)}>
                                    Auto
                                </Checkbox>
                            </Flex>
                            <PrimaryInput isDisabled={autoDueDate} name="due" placeholder='Due Date' type="datetime-local" value={myData.due} onChange={e => setMyData({ ...myData, due: e.target.value })} />
                            {isSapEnabled && sapOrder && sapOrder.endDate && (
                                <Text fontSize="2xs" color="blue.500" mt={1} fontWeight={600}>
                                    SAP Due Date: {dayjs(sapOrder.endDate).isValid() ? dayjs(sapOrder.endDate).format("DD MMM YYYY") : sapOrder.endDate}
                                </Text>
                            )}
                            <FormErrorMessage>{errors.due}</FormErrorMessage>
                        </FormControl>
                    </SimpleGrid>
                    <SimpleGrid columns={2} w="100%" gap={4}>
                        <FormControl>
                            <FormLabel fontSize="xs">Notifications</FormLabel>
                            <SearchableSelector
                                isMulti
                                closeMenuOnSelect={false}
                                size="sm"
                                options={Object.entries(NOTIFICATION_OPTIONS).map(([key, value]) => ({
                                    label: value,
                                    value: key
                                }))}
                                onChange={(e: Option[]) => setMyData({ ...myData, notifications: e.map(({ value }) => value) as DataType["notifications"] })}
                                value={myData.notifications.map(notification => ({
                                    label: NOTIFICATION_OPTIONS[notification],
                                    value: notification
                                }))}
                                name={"notifications"} />
                        </FormControl>
                        <FormControl>
                            <FormLabel fontSize="xs">Notify</FormLabel>
                            <SearchableSelector
                                isMulti
                                isDisabled={!myData.notifications.length}
                                closeMenuOnSelect={false}
                                size="sm"
                                onChange={(e: Option[]) => setMyData({ ...myData, notificationCategories: e.map(({ value }) => value) })}
                                options={notificationCategories.map(category => ({
                                    label: category,
                                    value: category
                                }))}
                                value={myData.notificationCategories.map(notification => ({
                                    label: notification,
                                    value: notification
                                }))}
                                name={"notifications"} />
                        </FormControl>
                    </SimpleGrid>
                </VStack>
            </ModalBody>
            <ModalFooter>
                <HStack w="100%" justifyContent={"center"}>
                    <VStack opacity={0.8} fontSize="sm" w="100%" alignItems={"flex-start"}>
                        <Text>Target: <strong style={{
                            opacity: 1
                        }}><MinifiedNumberFormatter number={myData.target} suffix="pc(s)" /></strong></Text>
                        <Text
                            cursor="pointer"
                            _hover={{ color: "orange.400", textDecoration: "underline" }}
                            title="Click to apply Max Hourly Target"
                            onClick={() => maxHourlyTarget > 0 && setMyData(prev => ({ ...prev, hourlyTarget: maxHourlyTarget }))}
                        >
                            Max Hourly Target: <strong style={{
                                opacity: 1
                            }}><MinifiedNumberFormatter number={maxHourlyTarget} suffix=" pc(s)" /></strong>
                        </Text>
                        <Text>Expected End: <strong style={{
                            opacity: 1
                        }}><MyTooltip
                            label={
                                dayjs.unix(expectedEnd).format("DD-MM-YYYY HH:mm:ss")
                            }>
                                {`in ${minifiedSecFormatter(Math.abs(dayjs().diff(dayjs.unix(expectedEnd), "second")))}`}
                            </MyTooltip></strong></Text>
                    </VStack>
                    <VStack alignItems={"flex-end"}>
                        <Primary size="sm" onClick={submit}>Queue Target</Primary>
                    </VStack>
                </HStack>
            </ModalFooter>
        </MyModal>
    </>
}

export default QueueTarget;