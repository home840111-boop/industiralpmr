import { Box, Button, IconButton, Flex, Text, useToast, HStack } from "@chakra-ui/react";
import { useMemo, useState } from "react";
import { IoIosAlbums, IoMdAdd } from "react-icons/io";
import { DataToSet } from "..";
import { PrimaryBtn } from "../../../../Components/Buttons";
import MyTooltip from "../../../../Components/micro/MyTooltip";
import NumberFormatter from "../../../../Components/micro/NumberFormatter";
import Table from "../../../../Components/micro/Table";
import dayjs from "../../../../Components/Functions/dayjs";
import ConfirmDialog from "../../../../Components/micro/ConfirmDialog";
import secFormatter from "../../../../Components/Functions/formatters/secFormatter";
import QueueTarget from "../QueueTarget";
import ChangeOrder from "./ChangeOrder";
import { RiDeleteBin2Line } from "react-icons/ri";
import { get, transaction, update } from "../../../../Components/firebase/api/db";
import { useParams } from "react-router-dom";
import BackdropLoader from "../../../../Components/Loaders/BackdropLoader";
import { LuArrowRightFromLine } from "react-icons/lu";
import { serverTimestamp } from "firebase/database";

const headings = [
    "Pos",
    "Target",
    "Mold",
    "Remaining Quantity",
    "Exp Start",
    "Duration",
    "Action"
];

function getOrdinal(n: number) {
    const suffixes = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return n + (suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0]);
}

const ProductionQueue = ({
    productionQueues,
    refetch,
    currentMold,
    monitorDowntime,
    notificationCategories
}: {
    productionQueues: DataToSet["productionQueues"],
    monitorDowntime: boolean,
    refetch: () => void,
    currentMold: DataToSet["mold"],
    notificationCategories: string[]
}) => {
    const toast = useToast();
    const { machineID } = useParams();
    const [loading, setLoading] = useState<string | null>(null);
    const startQueue = async (id: string) => {
        if (!machineID) return;
        try {
            setLoading(`Starting Target`);
            const promises: Promise<void>[] = [];
            const queue = productionQueues.targets.find((queue) => queue.id === id);
            if (!queue) return;
            const snap = await get(`production-targets/queue/${machineID}/${queue.id}/target`);
            if (!snap.exists()) return;
            const data = snap.val();
            promises.push(update(`production-targets/active/${machineID}/${queue.mold}`, {
                ...data,
                startedAt: serverTimestamp()
            }));
            await Promise.all(promises);
            await deleteQueue(id, true)
            toast({
                title: "Success",
                description: "Queue started successfully",
                status: "success",
                duration: 2000,
                isClosable: true
            });
            refetch();
        } catch (err) {
            toast({
                title: "Error",
                description: "Failed to start queue",
                status: "error",
                duration: 2000,
                isClosable: true
            });
            console.error(err);
        } finally {
            setLoading(null);
        }
    }
    const deleteQueue = async (id: string, noShow: boolean = false) => {
        if (!machineID) return;
        try {
            if (!noShow) setLoading(`Deleting Target`);
            await transaction(`production-targets/queue/${machineID}`, (queue) => {
                if (!queue) return queue;
                const newQueue = Object.entries(queue).filter(([key]) => key !== id)
                newQueue.sort((a, b) => {
                    const aOrder = (a[1] as any).order || 0;
                    const bOrder = (b[1] as any).order || 0;
                    return aOrder - bOrder;
                });
                return Object.fromEntries(newQueue.map(([key, value]: [any, any], index) => {
                    return [key, { ...value, order: index + 1 }];
                }));
            });
            if (!noShow) toast({
                title: "Success",
                description: "Queue deleted successfully",
                status: "success",
                duration: 2000,
                isClosable: true
            });
            if (!noShow) refetch();
        } catch (err) {
            if (!noShow) toast({
                title: "Error",
                description: "Failed to delete queue",
                status: "error",
                duration: 2000,
                isClosable: true
            });
            console.error(err);
        } finally {
            if (!noShow) setLoading(null);
        }
    }
    const rows = useMemo(() => {
        const myRows: any[][] = [];
        let time = 0;
        const hasStarted = productionQueues.targets.some((queue) => queue.started);
        for (const [idx, queue] of Object.entries(productionQueues.targets)) {
            myRows.push([
                {
                    element: Text,
                    props: {
                        fontSize: "md",
                        fontWeight: 500
                    },
                    children: getOrdinal(+idx + 1)
                },
                {
                    element: Text,
                    props: {
                        fontSize: "md",
                        fontWeight: 500
                    },
                    children: queue.name
                },
                {
                    element: Text,
                    props: {
                        fontSize: "sm",
                        fontWeight: 600,
                        opacity: 0.7,
                        textTransform: "uppercase"
                    },
                    children: `${queue.mold} (${queue.cycleTime.toFixed(0)}s)`
                },
                {
                    element: NumberFormatter,
                    props: {
                        number: queue.target,
                        suffix: "pc(s)",
                        // color: hourlyTarget && hourlyTarget > hour.production ? "red" : "green",
                        fontWeight: 500
                    }
                },
                {
                    element: MyTooltip,
                    props: {
                        label: time ? dayjs().add(time, "seconds").format("YYYY-MM-DD HH:mm:ss") : queue.started ? "Started" : "NA",
                    },
                    children: time ? dayjs().add(time, "seconds").fromNow(true) : queue.started ? "Started" : "NA",
                },
                {
                    element: MyTooltip,
                    props: {
                        label: `End: ${dayjs().add(queue.duration + time, "seconds").format("YYYY-MM-DD HH:mm:ss")}`
                    },
                    children: secFormatter(queue.duration)
                },
                {
                    element: Actions,
                    props: {
                        queue,
                        currentMold: currentMold.name,
                        onDelete: deleteQueue,
                        onStart: startQueue,
                        hasStarted,
                    },
                }
            ]);
            time += queue.duration;
        }
        return myRows;
        // eslint-disable-next-line
    }, [productionQueues]);

    return <>
        {loading && <BackdropLoader text={loading} />}
        <Flex gap={2} flexDirection={"column"}>
            <Flex w="100%" justifyContent={"space-between"} alignItems={"center"} flexWrap="wrap">
                <Flex gap={1} alignItems="center">
                    <Text fontWeight={600} fontSize="xs" textTransform="uppercase" opacity={0.7}>
                        Total Occupancy:
                    </Text>
                    <Text fontWeight={700} fontSize="sm" textTransform="uppercase">
                        <MyTooltip label={`End: ${dayjs().add(productionQueues.totalOccupancy, "hour").format("HH A YYYY-MM-DD")}`}>{String(productionQueues.totalOccupancy).padStart(2, "0") + " Hours"}</MyTooltip>
                    </Text>
                </Flex>
                <Flex gap={1.5} alignItems={"center"} justifyContent={"flex-end"}>
                    <QueueTarget order={productionQueues.targets.length} refetch={refetch} notificationCategories={notificationCategories} monitorDowntime={monitorDowntime}>
                        <PrimaryBtn size="xs" leftIcon={<IoMdAdd />}>
                            Add to Queue
                        </PrimaryBtn>
                    </QueueTarget>
                    <ChangeOrder queue={productionQueues.targets} refetch={refetch}>
                        <Button colorScheme={"orange"} variant="outline" size="xs" leftIcon={<IoIosAlbums />}>
                            Change Order
                        </Button>
                    </ChangeOrder>
                </Flex>
            </Flex>
            <Box p={0} h="300px">
                <Table
                    headings={headings}
                    notFound={productionQueues.targets.length === 0}
                    rows={rows}
                />
            </Box>
        </Flex>
    </>
}

const Actions = ({
    queue,
    currentMold,
    onDelete,
    onStart,
    hasStarted
}: {
    queue: DataToSet["productionQueues"]["targets"][0],
    currentMold: DataToSet["mold"]["name"],
    onDelete: (id: string) => Promise<void>,
    onStart: (id: string) => Promise<void>,
    hasStarted: boolean
}) => {
    return <HStack>
        <ConfirmDialog text={`Are you sure you want to remove ${queue.name} from the queue?`} onConfirm={() => onDelete(queue.id)} scope="danger">
            <IconButton variant={"outline"}
                colorScheme={"red"}
                size={"xs"} aria-label="delete" isDisabled={queue.started} icon={<RiDeleteBin2Line />} />
        </ConfirmDialog>
        <ConfirmDialog text={`Are you sure you want to start ${queue.name}?`} onConfirm={() => onStart(queue.id)} scope="normal">
            <IconButton variant={"outline"}
                colorScheme={"orange"}
                size={"xs"} aria-label="delete" isDisabled={queue.mold !== currentMold || queue.started || hasStarted} icon={<LuArrowRightFromLine />} />
        </ConfirmDialog>
    </HStack>
}

export default ProductionQueue