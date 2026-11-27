import { Button, Flex, ModalBody, ModalCloseButton, ModalFooter, ModalHeader, SimpleGrid, Text, useColorMode, useDisclosure, useToast } from "@chakra-ui/react"
import { closestCenter, DndContext, DragEndEvent, KeyboardSensor, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { cloneElement, isValidElement, useEffect, useMemo, useState } from "react";
import { RiDraggable } from "react-icons/ri";
import { useParams } from "react-router-dom";
import { DataToSet } from "..";
import Primary from "../../../../Components/Buttons/Primary";
import { update } from "../../../../Components/firebase/api/db";
import BackdropLoader from "../../../../Components/Loaders/BackdropLoader"
import MyModal from "../../../../Components/micro/MyModal"
import NumberFormatter from "../../../../Components/micro/NumberFormatter";
import { SortableItem } from "../../../../Components/micro/SortableItem";

function getOrdinal(n: number) {
    const suffixes = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return n + (suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0]);
}

const ChangeOrder = ({
    children,
    refetch,
    queue
}: {
    children?: JSX.Element,
    refetch: () => void,
    queue: DataToSet["productionQueues"]["targets"],
}) => {
    const toast = useToast();
    const [loading, setLoading] = useState<string | null>(null);
    const { machineID } = useParams();
    const { colorMode } = useColorMode();
    const { border } = useMemo(() => ({
        border: `${colorMode}.border`
    }), [colorMode]);
    const { isOpen, onOpen, onClose } = useDisclosure();
    const btn = isValidElement(children) ?
        cloneElement(children as JSX.Element, { onClick: onOpen })
        : <Button onClick={onOpen}>Open</Button>;
    const [myQueue, setMyQueue] = useState<DataToSet["productionQueues"]["targets"]>([]);

    useEffect(() => {
        setMyQueue(queue.filter(item => !item.started));
    }, [queue]);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    function handleDragEnd(event: DragEndEvent) {
        const { active, over } = event;
        if (!over?.data.current) return;
        if (!active?.data.current) return;

        if (active.id !== over.id) {
            setMyQueue((queue) => {
                const oldIndex = (active.data.current?.sortable?.index as any);
                const newIndex = (over.data.current?.sortable?.index as any);

                return arrayMove(queue, oldIndex, newIndex);
            });
        }
    }

    const saveOrder = async () => {
        if (!machineID) return;
        try {

            setLoading("Saving Order...");
            const promises: Promise<any>[] = [];
            for (const [idx, queue] of Object.entries(myQueue)) {
                promises.push(update(`production-targets/queue/${machineID}/${queue.id}`, {
                    order: +idx + 1,
                }))
            }
            await Promise.all(promises);
            setLoading(null);
            refetch();
            onClose();
            toast({
                title: "Order Saved",
                status: "success",
                duration: 2000,
                isClosable: true,
            });
        } catch (error) {
            setLoading(null);
            toast({
                title: "Error Saving Order",
                status: "error",
                duration: 2000,
                isClosable: true,
            });
            console.error(error);
        }
    }

    return <>
        {loading && <BackdropLoader text={loading} />}
        {btn}
        <MyModal
            size={"3xl"}
            isOpen={isOpen}
            onClose={onClose}>
            <ModalHeader>Change Queue Order
                <Text fontSize="sm" fontWeight={400}>
                    Drag and drop to change the order of the queue. The first item will be the first to be produced.
                </Text>
            </ModalHeader>
            <ModalCloseButton />
            <ModalBody pb={6}>
                <Flex mt={3} flexDir="column" gap={5}>
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}>
                        <SortableContext
                            items={myQueue}
                            strategy={verticalListSortingStrategy}>
                            {myQueue.map((queue, idx) => <SortableItem key={queue.id} id={queue.id}>
                                <Flex px={2} py={2} gap={2} alignItems="center" rounded={"md"} key={queue.id} border="2px solid" borderColor={border}>
                                    <SimpleGrid columns={4} gap={1} w="100%">
                                        <Flex w="fit-content" gap={2} justifyContent={"center"} alignItems="center"><RiDraggable />{getOrdinal(idx + 1)}</Flex>
                                        <Flex w="fit-content" justifyContent={"center"} alignItems="center">{queue.name}</Flex>
                                        <Flex w="fit-content" justifyContent={"center"} alignItems="center">{`${queue.mold} (${queue.cycleTime.toFixed(0)}s)`}</Flex>
                                        <Flex justifyContent={"flex-end"}><NumberFormatter number={queue.target} suffix="pc(s)" fontWeight={500} /></Flex>
                                    </SimpleGrid>
                                </Flex>
                            </SortableItem>)}
                        </SortableContext>
                    </DndContext>
                </Flex>
            </ModalBody>
            <ModalFooter>
                <Primary onClick={saveOrder} isDisabled={myQueue.length === 0} size="sm">Save Order</Primary>
            </ModalFooter>
        </MyModal>
    </>
}

export default ChangeOrder