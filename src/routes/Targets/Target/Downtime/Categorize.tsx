import { serverTimestamp } from "firebase/database";
import { auth } from "../../../../Components/firebase";
import store from "../../../../Components/Store";
import { uidAtom } from "../../../../Components/Store/atoms";
import dayjs from "../../../../Components/Functions/dayjs";
import { Button, FormControl, FormLabel, HStack, ModalBody, ModalCloseButton, ModalFooter, ModalHeader, Text, Textarea, useDisclosure, useToast, VStack, Badge } from "@chakra-ui/react";
import { cloneElement, isValidElement, useEffect, useMemo, useState } from "react";
import { FaArrowRight, FaTimes } from "react-icons/fa";
import { FiEdit2 } from "react-icons/fi";
import { TbTimelineEventPlus } from "react-icons/tb";
import { useParams } from "react-router-dom";
import Primary from "../../../../Components/Buttons/Primary";
import { update } from "../../../../Components/firebase/api/db";
import secFormatter from "../../../../Components/Functions/formatters/secFormatter";
import PrimarySelect from "../../../../Components/Inputs/PrimarySelect";
import SearchableSelector from "../../../../Components/Inputs/SearchableSelector";
import BackdropLoader from "../../../../Components/Loaders/BackdropLoader"
import ConfirmDialog from "../../../../Components/micro/ConfirmDialog";
import MyModal from "../../../../Components/micro/MyModal";
import { isMasterAdminAtom, machinesAtom, roleAtom } from "../../../../Components/Store/atoms";
import Get from "../../../../Components/Store/hooks/Get";
import Listen from "../../../../Components/Store/hooks/Listen";
import { canWriteOperational } from "../../../../Services/rbac";
import downtimeCategories, { downtimeCategoriesType } from "./categories";

const CATEGORY_OPTIONS = downtimeCategories.map((category) => ({
    label: category.toUpperCase(),
    value: category
}));

export interface DowntimeItem {
    start: number;
    end: number;
    status?: "IDLE" | "OFF";
    reason?: {
        category: string;
        note: string;
        scheduled: boolean;
    };
    id: string;
}

const Categorize = ({
    downtime,
    bulkDowntimes,
    updateLog,
    onBulkSuccess,
    children,
    machineId: propMachineId,
    date: propDate
}: {
    machineId?: string;
    date?: string;
    downtime?: DowntimeItem | string;
    bulkDowntimes?: DowntimeItem[];
    updateLog?: (log: {
        start: number;
        end: number;
        status?: "IDLE" | "OFF";
        reason: {
            category: downtimeCategoriesType;
            note: string;
            scheduled: boolean;
        };
        id: string;
    }) => void;
    onBulkSuccess?: (logs: DowntimeItem[]) => void;
    children?: JSX.Element;
}) => {
    const toast = useToast();
    const { machineID } = useParams<{ machineID: string }>();
    const effectiveMachineId = propMachineId || machineID;
    const [loading, setLoading] = useState<string | null>(null);
    const { isOpen, onOpen, onClose } = useDisclosure();
    const machines = Get(machinesAtom);
    const uid = Listen(uidAtom);
    Listen(roleAtom);
    Listen(isMasterAdminAtom);
    const canWrite = canWriteOperational(uid);
    const [data, setData] = useState({
        category: "uncategorized",
        note: "",
        scheduled: false
    });

    const isBulk = Array.isArray(bulkDowntimes) && bulkDowntimes.length > 0;
    const targetItems: DowntimeItem[] = useMemo(() => {
        if (isBulk) return bulkDowntimes;
        if (downtime && typeof downtime !== "string") return [downtime];
        return [];
    }, [isBulk, bulkDowntimes, downtime]);

    const bulkTotal = useMemo(() => {
        const nowUnix = dayjs().unix();
        return targetItems.reduce((acc, d) => {
            const end = d.end && d.end > d.start ? d.end : nowUnix;
            return acc + Math.max(end - d.start, 0);
        }, 0);
    }, [targetItems]);

    const machineName = useMemo(() => {
        if (!machines || !effectiveMachineId) return effectiveMachineId;
        return machines[effectiveMachineId];
    }, [machines, effectiveMachineId]);

    const isEdit = useMemo(() => {
        if (isBulk) return false;
        if (!downtime || typeof downtime === "string" || !downtime.reason) return false;
        return Boolean(
            (downtime.reason.category && downtime.reason.category.toLowerCase() !== "uncategorized") ||
            (downtime.reason.note && downtime.reason.note !== "None" && downtime.reason.note.trim() !== "")
        );
    }, [isBulk, downtime]);

    useEffect(() => {
        if (!isBulk && downtime && typeof downtime !== "string" && downtime.reason) {
            setData({
                category: (downtime.reason.category || "uncategorized").toLowerCase(),
                note: downtime.reason.note === "None" ? "" : (downtime.reason.note || ""),
                scheduled: !!downtime.reason.scheduled
            });
        } else {
            setData({
                category: "uncategorized",
                note: "",
                scheduled: false
            });
        }
    }, [isBulk, downtime, isOpen]);

    const add = async () => {
        if (!canWriteOperational()) return;
        if (!isBulk && (!downtime || typeof downtime === "string")) {
            toast({
                title: "Downtime not found",
                description: "The downtime you are trying to categorize was not found",
                status: "error",
                isClosable: true
            });
            return;
        }
        if (targetItems.length === 0) return;

        setLoading(isBulk ? `Categorizing ${targetItems.length} items` : isEdit ? "Updating" : "Adding");
        try {
            if (!downtimeCategories.includes(data.category as downtimeCategoriesType)) throw new Error("Invalid category");
            const payload = {
                category: data.category as downtimeCategoriesType,
                note: data.note,
                scheduled: data.scheduled
            };
            if (!effectiveMachineId) throw new Error("No machineId specified");

            const by = auth.currentUser?.uid || store.get(uidAtom) || "unknown";
            const now = Date.now();
            const revisionId = `${now}`;

            const updatePromises: Promise<any>[] = [];

            for (const item of targetItems) {
                const startUnix = item.start;
                const endUnix = item.end && item.end > startUnix ? item.end : dayjs().unix();
                const dStart = dayjs.unix(startUnix);
                const itemDate = propDate || dStart.format("YYYY-MM-DD");

                // 1. Direct update into machine hourly report chunk
                updatePromises.push(
                    update(`reports/machines/${effectiveMachineId}/hourly/${itemDate}/${item.id}/reason`, payload)
                );

                // 2. Also keep revision history in downtime-reasons
                const dEnd = dayjs.unix(endUnix);
                const fromSec = dStart.hour() * 3600 + dStart.minute() * 60 + dStart.second();
                const toSec = dEnd.hour() * 3600 + dEnd.minute() * 60 + dEnd.second();
                const duration = Math.max(endUnix - startUnix, 0);

                const reasonPayload = {
                    machineId: effectiveMachineId,
                    date: itemDate,
                    key: item.id,
                    type: item.status === "OFF" ? "OFF" : "IDLE",
                    from: fromSec,
                    to: toSec,
                    start: startUnix,
                    end: endUnix,
                    duration,
                    shift: "A",
                    category: payload.category,
                    scheduled: payload.scheduled,
                    note: payload.note,
                    updatedAt: serverTimestamp(),
                    updatedBy: by,
                    history: {
                        [revisionId]: {
                            category: payload.category,
                            scheduled: payload.scheduled,
                            note: payload.note,
                            by,
                            at: serverTimestamp(),
                        }
                    }
                };
                updatePromises.push(
                    update(`downtime-reasons/${effectiveMachineId}/${itemDate}/${item.id}`, reasonPayload)
                );
            }

            await Promise.all(updatePromises);

            if (isBulk) {
                onBulkSuccess?.(targetItems.map(item => ({ ...item, reason: payload })));
            } else if (downtime && typeof downtime !== "string") {
                updateLog?.({
                    ...downtime,
                    reason: payload
                });
            }

            onClose();
            setData({
                category: "",
                note: "",
                scheduled: false
            });
            toast({
                title: isBulk
                    ? `${targetItems.length} downtimes categorized`
                    : isEdit ? "Downtime updated" : "Downtime categorized",
                description: isBulk
                    ? "Selected downtimes have been updated successfully"
                    : isEdit ? "The downtime has been updated successfully" : "The downtime has been categorized successfully",
                status: "success",
                isClosable: true
            });
        } catch (err) {
            console.error(err);
            toast({
                title: isEdit ? "Failed to update downtime" : "Failed to categorize downtime",
                description: isEdit
                    ? "An error occurred while trying to update downtime"
                    : "An error occurred while trying to categorize downtime",
                status: "error",
                isClosable: true
            });
        } finally {
            setLoading(null);
        }
    };

    const btn = isValidElement(children) ? (
        cloneElement(children as JSX.Element, {
            onClick: onOpen,
        })
    ) : (
        <Button
            py={3}
            colorScheme={isEdit ? "gray" : "orange"}
            variant="outline"
            size="xs"
            my={2}
            leftIcon={isEdit ? <FiEdit2 /> : <TbTimelineEventPlus />}
            isDisabled={!isBulk && typeof downtime === "string"}
            cursor="pointer"
            onClick={onOpen}
        >
            {isEdit ? "Edit" : "Categorize"}
        </Button>
    );

    if (!canWrite) return <></>;

    return (isBulk || typeof downtime !== "string") ? <>
        {isBulk && loading && <BackdropLoader text={loading} />}
        {btn}
        {isOpen && (
            <MyModal
                size={"xl"}
                isOpen={isOpen}
                onClose={onClose}
                closeOnOverlayClick={false}>
                <ModalHeader>{isBulk ? `Categorize ${targetItems.length} Downtimes` : isEdit ? "Edit Downtime" : "Categorize Downtime"}</ModalHeader>
                <ModalCloseButton />
                <ModalBody pb={6}>
                    <HStack pb={6} pt={3} w="100%" justifyContent={"space-between"}>
                        <Text fontWeight={600} fontSize="xl" textDecor="underline">{machineName}</Text>
                        <Text fontWeight={500} fontSize="lg">
                            {isBulk
                                ? secFormatter(bulkTotal)
                                : (downtime && typeof downtime !== "string" && downtime.end ? secFormatter(downtime.end - downtime.start) : "Ongoing")}
                        </Text>
                    </HStack>
                    {isBulk && (
                        <Text mb={4} fontSize="xs" opacity={0.7}>
                            {targetItems.length} stoppages selected | the same category and planned setting will apply to all of them
                        </Text>
                    )}
                    <VStack gap={2}>
                        <HStack w="100%">
                            <FormControl isRequired>
                                <FormLabel fontSize="sm">Planned/Unplanned</FormLabel>
                                <PrimarySelect size="sm" value={data.scheduled ? "planned" : "unplanned"} onChange={e => {
                                    setData(prev => ({
                                        ...prev,
                                        scheduled: e.target.value === "planned"
                                    }));
                                }}>
                                    <option value="planned">Planned</option>
                                    <option value="unplanned">Unplanned</option>
                                </PrimarySelect>
                                <HStack mt={1.5} spacing={1}>
                                    <Badge colorScheme={data.scheduled ? "blue" : "gray"} variant="subtle" fontSize="2xs" px={2} py={0.5} borderRadius="md">
                                        {data.scheduled ? "✓ Planned: Excluded from efficiency loss" : "Unplanned: Counts against efficiency"}
                                    </Badge>
                                </HStack>
                            </FormControl>
                            <FormControl isRequired>
                                <FormLabel fontSize="sm">Reason</FormLabel>
                                <SearchableSelector value={{
                                    label: data.category.toUpperCase(),
                                    value: data.category
                                }}
                                    onChange={value => {
                                        setData(prev => ({
                                            ...prev,
                                            category: value.value
                                        }));
                                    }}
                                    size="sm" options={CATEGORY_OPTIONS} />
                            </FormControl>
                        </HStack>
                        <FormControl>
                            <FormLabel fontSize="sm">Notes</FormLabel>
                            <Textarea focusBorderColor={"primary"} value={data.note} onChange={e => {
                                setData(prev => ({
                                    ...prev,
                                    note: e.target.value
                                }));
                            }} placeholder='Any other notes' />
                        </FormControl>
                    </VStack>
                </ModalBody>
                <ModalFooter>
                    {isBulk && targetItems.length > 1 ? (
                        <ConfirmDialog
                            onConfirm={add}
                            heading={`Categorize ${targetItems.length} Downtimes`}
                            text={`Are you sure you want to categorize ${targetItems.length} downtimes at once?`}
                        >
                            <Primary size="sm" mr={3} leftIcon={<FaArrowRight />}>Categorize All</Primary>
                        </ConfirmDialog>
                    ) : (
                        <Primary size="sm" mr={3} leftIcon={<FaArrowRight />} onClick={add}>
                            {isEdit ? "Update" : "Save"}
                        </Primary>
                    )}
                    <Button size="sm" onClick={onClose} leftIcon={<FaTimes />}>Cancel</Button>
                </ModalFooter>
            </MyModal>
        )}
    </> : <></>
}

export default Categorize;