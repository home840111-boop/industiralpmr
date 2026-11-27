import dayjs from "../../../../../Components/Functions/dayjs";
import { Button, FormControl, FormHelperText, FormLabel, HStack, ModalBody, ModalCloseButton, ModalFooter, ModalHeader, Text, Textarea, VStack } from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { FaArrowRight, FaTimes } from "react-icons/fa";
import Primary from "../../../../../Components/Buttons/Primary";
import secFormatter from "../../../../../Components/Functions/formatters/secFormatter";
import secToTime from "../../../../../Components/Functions/converters/secondsToHourMin";
import PrimarySelect from "../../../../../Components/Inputs/PrimarySelect";
import SearchableSelector from "../../../../../Components/Inputs/SearchableSelector";
import ConfirmDialog from "../../../../../Components/micro/ConfirmDialog";
import MyModal from "../../../../../Components/micro/MyModal";
import downtimeCategories, { downtimeCategoriesType } from "../../../../Targets/Target/Downtime/categories";
import { DowntimeReasonEntry, DowntimeSegment, ReasonInput } from "./types";

const isUncategorizedEntry = (entry?: DowntimeReasonEntry): boolean => {
    if (!entry) return true;
    if (!entry.category) return true;
    const cat = entry.category.trim().toLowerCase();
    return cat === "uncategorized" || cat === "none" || cat === "";
};

const CategorizeModal = ({
    isOpen,
    onClose,
    segment,
    entry,
    bulk,
    machineName,
    onSave
}: {
    isOpen: boolean,
    onClose: () => void,
    segment: DowntimeSegment | null,
    entry?: DowntimeReasonEntry,
    // several rows at once: the same reason is applied to all of them
    bulk?: {
        rows: { segment: DowntimeSegment, entry?: DowntimeReasonEntry }[]
    },
    machineName: string,
    onSave: (reason: ReasonInput) => void | Promise<void>
}) => {
    const [data, setData] = useState<ReasonInput>({
        category: "uncategorized",
        note: "",
        scheduled: false
    });

    // (re)load the form every time the modal is opened for a segment
    useEffect(() => {
        if (!isOpen) return;
        setData({
            category: entry?.category || "uncategorized",
            note: entry?.note || "",
            scheduled: !!entry?.scheduled
        });
    }, [isOpen, entry, segment, bulk]);

    if (!segment && !bulk) return <></>;
    const isBulk = !!bulk;
    const isEdit = !isBulk && !isUncategorizedEntry(entry);

    const segmentDateLabel = !isBulk && segment
        ? (segment.start && segment.start > 1000000
            ? dayjs.unix(segment.start).format("YYYY-MM-DD")
            : (segment.from < 25200 ? dayjs(segment.date).add(1, "day").format("YYYY-MM-DD") : segment.date))
        : "";
    const bulkRows = bulk?.rows || [];
    const bulkTotal = bulkRows.reduce((sum, row) => sum + row.segment.duration, 0);
    const bulkIdle = bulkRows.filter(row => row.segment.type === "IDLE").length;
    const bulkOff = bulkRows.length - bulkIdle;
    const bulkExisting = bulkRows.filter(row => !isUncategorizedEntry(row.entry)).length;

    return <MyModal
        size={"xl"}
        isOpen={isOpen}
        onClose={onClose}
        closeOnOverlayClick={false}>
        <ModalHeader>{isBulk ? `Categorize ${bulkRows.length} Downtimes` : isEdit ? "Edit Downtime" : "Categorize Downtime"}</ModalHeader>
        <ModalCloseButton />
        <ModalBody pb={6}>
            <HStack pb={10} pt={3} w="100%" justifyContent={"space-between"}>
                <Text fontWeight={600} fontSize="xl" textDecor="underline">{machineName}</Text>
                <Text fontWeight={500} fontSize="lg">{secFormatter(isBulk ? bulkTotal : (segment as DowntimeSegment).duration)}</Text>
            </HStack>
            <Text mt={-6} mb={6} fontSize="xs" opacity={0.7}>
                {isBulk
                    ? `${[bulkIdle ? `${bulkIdle} IDLE` : "", bulkOff ? `${bulkOff} OFF` : ""].filter(Boolean).join(" + ")} selected | the same reason is applied to all of them`
                    : `${(segment as DowntimeSegment).type} | ${segmentDateLabel} | ${secToTime((segment as DowntimeSegment).from)} - ${secToTime((segment as DowntimeSegment).to)}`}
            </Text>
            {isBulk && bulkExisting > 0 && <Text mb={4} fontSize="xs" color="orange.300">
                {bulkExisting} of the selected {bulkExisting === 1 ? "row is" : "rows are"} already categorized and will be updated (the earlier values stay in their history).
            </Text>}
            <VStack gap={2}>
                <HStack w="100%" alignItems="flex-start">
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
                        <FormHelperText fontSize="xs">Planned downtime does not affect efficiency.</FormHelperText>
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
                                    category: value.value as downtimeCategoriesType
                                }));
                            }}
                            size="sm" options={downtimeCategories.map(category => ({
                                label: category.toUpperCase(),
                                value: category
                            }))} />
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
            <ConfirmDialog
                onConfirm={() => onSave(data)}
                heading="Save Downtime"
                text={isBulk
                    ? `Are you sure you want to categorize these ${bulkRows.length} downtimes?`
                    : isEdit ? "Are you sure you want to update this downtime?" : "Are you sure you want to categorize this downtime?"}>
                <Primary size="sm" mr={3} leftIcon={<FaArrowRight />}>Save</Primary>
            </ConfirmDialog>
            <Button size="sm" onClick={onClose} leftIcon={<FaTimes />}>Cancel</Button>
        </ModalFooter>
    </MyModal>
}

export default CategorizeModal;
