import { Button, Checkbox, Flex, FormControl, FormErrorMessage, FormLabel, GridItem, HStack, ModalBody, ModalCloseButton, ModalFooter, ModalHeader, SimpleGrid, Text, useDisclosure, useToast, VStack } from "@chakra-ui/react";
import { cloneElement, isValidElement, useEffect, useMemo, useRef, useState } from "react";
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
import { get, update } from "../../../../Components/firebase/api/db";
import { DataToSet } from "..";
import { increment, serverTimestamp } from "firebase/database";
import SearchableSelector from "../../../../Components/Inputs/SearchableSelector";
import { Option } from "../../../Reports/Selector/types";
import ConfirmDialog from "../../../../Components/micro/ConfirmDialog";
import { SapTargetOrder, useIsSapEnabled } from "../../../../Services/sap";
import SapOrderSelector from "./SapOrderSelector";

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
const AddUpdateTarget = ({
    children,
    machineID,
    target = {
        name: "",
        due: "",
        target: 0,
        hourlyTarget: 0,
        defaultMonitorDowntime: false,
        machineMonitorDowntime: false,
        notifications: [],
        notificationCategories: [],
        sapOrder: null,
    },
    queue = false,
    refetch,
    mold,
    notificationCategories
}: {
    children?: JSX.Element,
    refetch: () => void,
    machineID?: string,
    target?: {
        name: string,
        due?: string,
        target: number,
        hourlyTarget: number,
        defaultMonitorDowntime: boolean,
        machineMonitorDowntime: boolean,
        notifications: ("milestone" | "due-missed" | "exp-target-missed")[],
        notificationCategories: string[],
        sapOrder?: SapTargetOrder | null;
    },
    queue?: boolean,
    mold: DataToSet["mold"],
    notificationCategories: string[]
}) => {
    const toast = useToast();
    const isSapEnabled = useIsSapEnabled();
    const hadTarget = useMemo(() => target.name !== "", [target]);
    const [loading, setLoading] = useState<string | null>(null);
    const [autoDueDate, setAutoDueDate] = useState<boolean>(!(isSapEnabled && target.sapOrder));
    const [sapOrder, setSapOrder] = useState<SapTargetOrder | null>((isSapEnabled && target.sapOrder) || null);
    const { isOpen, onOpen, onClose } = useDisclosure();
    const prevIsOpenRef = useRef<boolean>(false);
    const btn = isValidElement(children) ?
        cloneElement(children as JSX.Element, { onClick: onOpen })
        : <Button onClick={onOpen}>Open</Button>;
    const [errors, setErrors] = useState<ErrorsType>({
        name: null,
        target: null,
        hourlyTarget: null,
        due: null
    });
    const [myData, setMyData] = useState<DataType>(target);
    const expectedEnd = useMemo(() => {
        let now = dayjs().unix();
        if (!myData.target || !mold.cycleTime) return now;
        const shots = myData.target / mold.cavities;
        if (shots < 1) return now + mold.cycleTime;
        // round up to the nearest cycle time
        return now + (mold.cycleTime * Math.ceil(shots));
    }, [myData.target, mold]);
    const maxHourlyTarget = useMemo(() => {
        return Math.floor((3600 / mold.cycleTime) * mold.cavities);
    }, [mold]);

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

    // Only initialize form fields when the modal transitions from closed to open
    useEffect(() => {
        if (isOpen && !prevIsOpenRef.current) {
            setMyData({
                ...target,
                hourlyTarget: target.hourlyTarget || maxHourlyTarget || 0,
            });
            setSapOrder((isSapEnabled && target?.sapOrder) || null);
            setAutoDueDate(!(isSapEnabled && target?.sapOrder));
            setErrors({
                name: null,
                target: null,
                hourlyTarget: null,
                due: null,
            });
        }
        prevIsOpenRef.current = isOpen;
    }, [isOpen, target, isSapEnabled, maxHourlyTarget]);

    const endNow = async () => {
        setLoading("Ending Target");
        try {
            await update(`production-targets/active/${machineID}/${mold.name}/target`, {
                completed: true,
                manualCompletion: true
            });
            setMyData({
                name: "",
                target: 0,
                hourlyTarget: 0,
                machineMonitorDowntime: false,
                notifications: [],
                notificationCategories
            });
            refetch();
            onClose();
            toast({
                title: "Success",
                description: "Target has been ended.",
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
        setLoading(null);
    }

    const submit = async () => {
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
                const month = dayjs().format("YYYY-MM");
                const changeInTarget = !!(myData.target - target.target) || !!(myData.hourlyTarget - target.hourlyTarget);
                const total = changeInTarget ? myData.target - target.target : 0;
                const isSapTarget = Boolean(isSapEnabled && sapOrder);

                // If updating an active running target (or linking a SAP order), fetch existing active data
                // so we preserve live piece counts (current) and the original startedAt timestamp instead of resetting to 0.
                let existingTargetData: any = null;
                if (hadTarget && machineID && mold?.name) {
                    try {
                        const existingSnap = await get(`production-targets/active/${machineID}/${mold.name}`);
                        existingTargetData = existingSnap.val() || null;
                    } catch (e) {
                        console.warn("[AddUpdateTarget] Could not fetch existing active target:", e);
                    }
                }

                const existingCurrent = existingTargetData?.target?.current ?? 0;
                const preservedCurrent = hadTarget ? existingCurrent : 0;
                const preservedStartedAt = hadTarget && existingTargetData?.startedAt
                    ? existingTargetData.startedAt
                    : serverTimestamp();

                const payload = {
                    name: myData.name,
                    startedAt: preservedStartedAt,
                    sapOrder: isSapTarget ? sapOrder : null,
                    isSap: isSapTarget,
                    noAutoComplete: isSapTarget,
                    target: {
                        total: myData.target,
                        hourlyTarget: myData.hourlyTarget,
                        monitorDowntime: target.defaultMonitorDowntime || myData.machineMonitorDowntime,
                        current: preservedCurrent,
                        due: myData.due || null,
                        isSap: isSapTarget,
                        noAutoComplete: isSapTarget,
                    },
                    notifications: myData.notifications || null,
                    notificationCategories: myData.notificationCategories || null
                };
                await Promise.all([
                    update(`production-targets/active/${machineID}/${mold.name}`, payload),
                    update(`production-targets/statistics/${month}/machines/${machineID}/${mold.name}`, {
                        total: increment(total)
                    })
                ]);
                refetch();
                onClose();
                toast({
                    title: "Success",
                    description: "Target has been added.",
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
            <ModalHeader py={3} px={4} fontSize="md">{queue ? "Queue" : hadTarget ? "Update" : "Add"} Target</ModalHeader>
            <ModalCloseButton top={3} right={3} size="sm" />
            <ModalBody py={3} px={4}>
                <VStack gap={3}>
                    {isSapEnabled && (
                        <SapOrderSelector
                            selectedSapOrder={sapOrder}
                            onSelect={(newSapOrder, autoValues) => {
                                setSapOrder(newSapOrder);
                                setMyData((prev) => ({
                                    ...prev,
                                    name: autoValues.name,
                                    target: Number(autoValues.target) || 0,
                                    due: autoValues.due ? dayjs(autoValues.due).format("YYYY-MM-DDTHH:mm") : prev.due,
                                }));
                                setAutoDueDate(false);
                            }}
                            onClear={() => {
                                setSapOrder(null);
                            }}
                        />
                    )}
                    <HStack w="100%" gap={3}>
                        <FormControl isRequired isInvalid={errors.name !== null}>
                            <FormLabel fontSize="xs" mb={1}>Name</FormLabel>
                            <PrimaryInput name="name" placeholder='Target Name' value={myData.name} onChange={e => setMyData({ ...myData, name: e.target.value })} />
                            <FormErrorMessage fontSize="2xs">{errors.name}</FormErrorMessage>
                        </FormControl>
                        <FormControl isRequired>
                            <FormLabel fontSize="xs" mb={1}>Mold</FormLabel>
                            <PrimarySelect isDisabled fontWeight={700} textTransform="uppercase">
                                <option selected>{`${mold.name} (${Math.round(mold.cycleTime)}s)`}</option>
                            </PrimarySelect>
                        </FormControl>
                    </HStack>
                    <SimpleGrid columns={5} w="100%" gap={3}>
                        <FormControl as={GridItem} colSpan={3} isRequired isInvalid={errors.target !== null}>
                            <Flex justifyContent="space-between" alignItems="center" mb={1}>
                                <FormLabel fontSize="xs" mb={0}>Target <span style={{ fontSize: "0.7rem", opacity: 0.8 }}>pc(s)</span></FormLabel>
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
                            <FormErrorMessage fontSize="2xs">{errors.target}</FormErrorMessage>
                        </FormControl>
                        <FormControl as={GridItem} colSpan={2} isInvalid={errors.hourlyTarget !== null}>
                            <Flex justifyContent="space-between" alignItems="center" mb={1}>
                                <FormLabel fontSize="xs" mb={0}>Hourly Target <span style={{ fontSize: "0.7rem", opacity: 0.8 }}>pc(s)</span></FormLabel>
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
                            <FormErrorMessage fontSize="2xs">{errors.hourlyTarget}</FormErrorMessage>
                        </FormControl>
                    </SimpleGrid>
                    <SimpleGrid columns={5} w="100%" gap={3}>
                        <FormControl as={GridItem} colSpan={2} isRequired>
                            <FormLabel fontSize="xs" mb={1}>Monitor Downtime</FormLabel>
                            <PrimarySelect name={"monitor-downtime"} isDisabled={target.defaultMonitorDowntime} defaultValue={target.defaultMonitorDowntime || target.machineMonitorDowntime ? "Yes" : "No"} onChange={e => setMyData({ ...myData, machineMonitorDowntime: e.target.value === "Yes" })}>
                                <option>Yes</option>
                                <option>No</option>
                            </PrimarySelect>
                        </FormControl>
                        <FormControl as={GridItem} colSpan={3} isInvalid={errors.due !== null}>
                            <Flex px={1} py={0.5} w="100%" justifyContent={"space-between"} flexDir="row">
                                <Text fontSize="xs" fontWeight={500} w="fit-content">Due Date</Text>
                                <Checkbox
                                    w="fit-content"
                                    size="sm"
                                    colorScheme="orange"
                                    isChecked={autoDueDate}
                                    onChange={e => setAutoDueDate(e.target.checked)}>
                                    <Text fontSize="xs">Auto</Text>
                                </Checkbox>
                            </Flex>
                            <PrimaryInput isDisabled={autoDueDate} name="due" placeholder='Due Date' type="datetime-local" value={myData.due} onChange={e => setMyData({ ...myData, due: e.target.value })} />
                            {isSapEnabled && sapOrder && sapOrder.endDate && (
                                <Text fontSize="2xs" color="blue.500" mt={1} fontWeight={600}>
                                    SAP Due Date: {dayjs(sapOrder.endDate).isValid() ? dayjs(sapOrder.endDate).format("DD MMM YYYY") : sapOrder.endDate}
                                </Text>
                            )}
                            <FormErrorMessage fontSize="2xs">{errors.due}</FormErrorMessage>
                        </FormControl>
                    </SimpleGrid>
                    <SimpleGrid columns={2} w="100%" gap={3}>
                        <FormControl>
                            <FormLabel fontSize="xs" mb={1}>Notifications</FormLabel>
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
                            <FormLabel fontSize="xs" mb={1}>Notify</FormLabel>
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
            <ModalFooter py={2.5} px={4} borderTop="1px solid" borderColor="inherit">
                <HStack w="100%" justifyContent={"space-between"} alignItems="center">
                    <VStack opacity={0.85} fontSize="xs" spacing={0.5} alignItems={"flex-start"}>
                        <Text>Target: <strong style={{ opacity: 1 }}><MinifiedNumberFormatter number={myData.target} suffix=" pc(s)" /></strong></Text>
                        <Text
                            cursor="pointer"
                            _hover={{ color: "orange.400", textDecoration: "underline" }}
                            title="Click to apply Max Hourly Target"
                            onClick={() => maxHourlyTarget > 0 && setMyData(prev => ({ ...prev, hourlyTarget: maxHourlyTarget }))}
                        >
                            Max Hourly Target: <strong style={{ opacity: 1 }}><MinifiedNumberFormatter number={maxHourlyTarget} suffix=" pc(s)" /></strong>
                        </Text>
                        <Text>Expected End: <strong style={{ opacity: 1 }}><MyTooltip
                            label={
                                dayjs.unix(expectedEnd).format("DD-MM-YYYY HH:mm:ss")
                            }>
                                {`in ${minifiedSecFormatter(Math.abs(dayjs().diff(dayjs.unix(expectedEnd), "second")))}`}
                            </MyTooltip></strong></Text>
                    </VStack>
                    <HStack spacing={2} alignItems={"center"}>
                        {!queue && hadTarget && <ConfirmDialog onConfirm={endNow} scope="danger">
                            <Button size="xs" h="30px" colorScheme="red" variant="outline">End Now</Button>
                        </ConfirmDialog>}
                        <Primary size="xs" h="30px" onClick={submit}>{queue ? "Queue" : hadTarget ? "Update " : "Add "}Target</Primary>
                    </HStack>
                </HStack>
            </ModalFooter>
        </MyModal>
    </>
}

export default AddUpdateTarget