import { Badge, CardBody, CardHeader, CircularProgress, CircularProgressLabel, IconButton, Text, useColorMode, useToast } from "@chakra-ui/react"
import { useEffect, useMemo, useState } from "react";
import MyCard from "../../../../Components/micro/Card"
import { uidAtom } from "../../../../Components/Store/atoms";
import Get from "../../../../Components/Store/hooks/Get";
import fetch from "./fetch";
import Table from "../../../../Components/micro/Table";
import MinifiedNumberFormatter from "../../../../Components/micro/MinifiedNumberFormatter";
import MyTooltip from "../../../../Components/micro/MyTooltip";
import NumberFormatter from "../../../../Components/micro/NumberFormatter";
import dayjs from "../../../../Components/Functions/dayjs";
import ConfirmDialog from "../../../../Components/micro/ConfirmDialog";
import { VscDebugRestart } from "react-icons/vsc";
import BackdropLoader from "../../../../Components/Loaders/BackdropLoader";
import { get, remove, update } from "../../../../Components/firebase/api/db";
import FilterOptions from "./FilterOptions";

interface SearchOptions {
    search: string,
    sort: "Ascending" | "Descending",
    option: "Name" | "Life" | "Consumed" | "Status" | "Last Used"
}
interface MoldHealthProps {
    name: string;
    life: number;
    consumed: number;
    lastUsed: string;
    status: "HEALTHY" | "WARNING" | "CRITICAL";
}
const MoldHealth = ({
    machineID
}: {
    machineID?: string
}) => {
    const toast = useToast();
    const uid = Get(uidAtom);
    const { colorMode } = useColorMode();
    const { border } = useMemo(() => ({
        border: `${colorMode}.border`,
    }), [colorMode]);
    const [rawMoldsBeforeFilter, setMolds] = useState<MoldHealthProps[] | null>(null);
    const [loading, setLoading] = useState<string | null>(null);
    const [searchOptions, setSearchOptions] = useState<SearchOptions>({
        search: "",
        sort: "Ascending",
        option: "Name"
    });

    const rawMolds = useMemo(() => {
        const rows = rawMoldsBeforeFilter || [];
        const { search, sort, option } = searchOptions;
        const filteredRows = rows.filter(row => row.name.toLowerCase().includes(search.toLowerCase()));
        let sortedRows = filteredRows;
        if (option === "Name") sortedRows = filteredRows.sort((a, b) => {
            if (a.name.toLowerCase() < b.name.toLowerCase()) return sort === "Ascending" ? -1 : 1;
            if (a.name.toLowerCase() > b.name.toLowerCase()) return sort === "Ascending" ? 1 : -1;
            return 0;
        });
        else if (option === "Consumed") sortedRows = filteredRows.sort((a, b) => {
            if (a.consumed < b.consumed) return sort === "Ascending" ? -1 : 1;
            if (a.consumed > b.consumed) return sort === "Ascending" ? 1 : -1;
            return 0;
        });
        else if (option === "Life") sortedRows = filteredRows.sort((a, b) => {
            if (a.life < b.life) return sort === "Ascending" ? -1 : 1;
            if (a.life > b.life) return sort === "Ascending" ? 1 : -1;
            return 0;
        });
        else if (option === "Status") sortedRows = filteredRows.sort((a, b) => {
            const map = {
                HEALTHY: 1,
                WARNING: 2,
                CRITICAL: 3
            }
            // haelthing is the highest priority, then warning, then critical
            if (map[a.status] < map[b.status]) return sort === "Ascending" ? -1 : 1;
            if (map[a.status] > map[b.status]) return sort === "Ascending" ? 1 : -1;
            return 0;
        });
        else if (option === "Last Used") sortedRows = filteredRows.sort((a, b) => {
            if ((a.lastUsed !== "Never" ? dayjs(a.lastUsed).unix() : Infinity) < (b.lastUsed !== "Never" ? dayjs(b.lastUsed).unix() : Infinity)) return sort === "Ascending" ? -1 : 1;
            if ((a.lastUsed !== "Never" ? dayjs(a.lastUsed).unix() : -Infinity) > (b.lastUsed !== "Never" ? dayjs(b.lastUsed).unix() : -Infinity)) return sort === "Ascending" ? 1 : -1;
            return 0;
        });
        return sortedRows;
    }, [rawMoldsBeforeFilter, searchOptions]);

    const resetMold = async (mold: MoldHealthProps) => {
        if (!rawMolds) return;
        setLoading(`Resetting ${mold.name}`);
        try {
            const snap = await get(`mold-life/${machineID}/${mold.name}`);
            if (snap.exists()) {
                await Promise.all([
                    update(`mold-life/${machineID}/${mold.name}`, {
                        consumed: 0,
                    }),
                    remove(`errors/mold-life/${machineID}/${mold.name}`)
                ])
            }
            toast({
                title: "Success",
                description: `${mold.name}'s usage has been reset.`,
                status: "success",
                duration: 5000,
                isClosable: true,
                position: "bottom"
            });
            const newMolds = rawMolds.map(m => {
                if (m.name === mold.name) {
                    m.consumed = 0;
                    m.lastUsed = "Never";
                }
                return m;
            });
            setMolds([...newMolds]);
        } catch (e) {
            console.error(e);
            toast({
                title: "Error",
                description: "Something went wrong while resetting mold usage.",
                status: "error",
                duration: 5000,
                isClosable: true,
                position: "bottom"
            })
        }
        setLoading(null);
    };
    const molds = useMemo(() => {
        if (!rawMolds) return [];
        return rawMolds.map(mold => {
            const efficiency = mold.consumed === 0 ? 0 : mold.life === 0 ? 100 : Math.round((mold.consumed / mold.life) * 100);
            const lastUsedDifference = mold.lastUsed === "Never" ? "Never" : dayjs.duration(dayjs().diff(dayjs(mold.lastUsed), "day"), "day").humanize();
            return [
                { element: Text, children: mold.name, props: { fontWeight: 600, fontSize: "sm" } },
                { element: MinifiedNumberFormatter, props: { number: mold.life || 0, suffix: "shot(s)" } },
                { element: Consumed, props: { efficiency, stat: mold.consumed } },
                { element: MyTooltip, props: { label: mold.lastUsed }, children: lastUsedDifference },
                { element: Badge, props: { fontWeight: 500, colorScheme: mold.status === "HEALTHY" ? "green" : mold.status === "WARNING" ? "orange" : "red" }, children: mold.status },
                { element: ConfirmDialog, props: { text: `Are you sure you want to reset ${mold.name}'s usage?`, onConfirm: () => resetMold(mold) }, children: { element: IconButton, props: { icon: <VscDebugRestart />, size: "sm", my: 2 } } }
            ]
        });
        // eslint-disable-next-line
    }, [rawMolds]);

    useEffect(() => {
        if (!uid || !machineID) return;
        fetch(machineID).then(setMolds)
            .catch(e => {
                console.error(e);
                setMolds([]);
            });
    }, [machineID, uid]);

    return <MyCard
        w="100%"
        h="100%"
        noPadding>
        <CardHeader
            display={"flex"}
            justifyContent={"space-between"}
            alignItems={"center"}
            py={4}
            borderBottom="1px solid"
            borderColor={border}>
            <Text
                fontSize="md"
                fontWeight={500}>Mold Health</Text>
            <FilterOptions setSearchOptions={setSearchOptions} />
        </CardHeader>
        <CardBody h="100%" p={0} maxH="700px" overflow="auto">
            {loading && <BackdropLoader text={loading} />}
            <Table
                notFound={rawMolds?.length === 0}
                rows={molds}
                headings={[
                    "Name",
                    "Life",
                    "Consumed",
                    "Last Used",
                    "Status",
                    "Reset"
                ]} />
        </CardBody>
    </MyCard>
}

const Consumed = ({ efficiency, stat }: { efficiency: number, stat: number }) => {

    return <MyTooltip label={<NumberFormatter number={stat} suffix="shot(s)" />}>
        <CircularProgress
            trackColor={"#cccccc40"}
            capIsRound
            value={efficiency}
            color={
                efficiency >= 100 ? "red" :
                    efficiency >= 90 ? "orange" :
                        "green"
            }>
            <CircularProgressLabel fontSize="xx-small">
                {efficiency}%
            </CircularProgressLabel>
        </CircularProgress>
    </MyTooltip>
};

export type { MoldHealthProps, SearchOptions };
export default MoldHealth