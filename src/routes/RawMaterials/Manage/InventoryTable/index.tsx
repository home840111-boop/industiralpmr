import { InventoryItem } from "..";
import MyCard from "../../../../Components/micro/Card";
import Table from "../../../../Components/micro/Table";
import weightFormatter from "../../../../Components/Functions/formatters/weightFormatter";
import dayjs from "../../../../Components/Functions/dayjs";
import duration from "dayjs/plugin/duration";
import relativeTime from "dayjs/plugin/relativeTime";
import MyTooltip from "../../../../Components/micro/MyTooltip";
import { Badge, Box, CardHeader, Stack, IconButton, Text, useColorMode } from "@chakra-ui/react";
import { FiEdit3 } from "react-icons/fi";
import { useMemo, useState } from "react";
import FilterOptions from "./FilterOptions";
import { PrimaryBtn } from "../../../../Components/Buttons";
import { BiPlus } from "react-icons/bi";
import AddMaterialModal from "./AddMaterialModal";
import EditMaterialModal from "./EditMaterialModal";
import {
    isMasterAdminAtom,
    roleAtom,
    uidAtom,
} from "../../../../Components/Store/atoms";
import Listen from "../../../../Components/Store/hooks/Listen";
import { canWriteOperational } from "../../../../Services/rbac";
import PrimarySelect from "../../../../Components/Inputs/PrimarySelect";
dayjs.extend(duration);
dayjs.extend(relativeTime);

interface SearchOptions {
    search: string,
    sort: "Ascending" | "Descending",
    option: "Name" | "Consumed" | "Remaining" | "Updated" | "Last Used"
}
const InventoryTable = ({
    found,
    rows,
    department,
    setDepartment,
    allowedDepartments,
    hasAllDepartments,
    refetch
}: {
    found: boolean,
    department: string,
    setDepartment: (department: string) => void,
    allowedDepartments: string[],
    hasAllDepartments: boolean,
    rows: InventoryItem[],
    refetch: () => void
}) => {
    const { colorMode } = useColorMode();
    const { border } = useMemo(() => {
        return {
            border: `${colorMode}.border`
        }
    }, [colorMode]);
    const uid = Listen(uidAtom);
    Listen(roleAtom);
    Listen(isMasterAdminAtom);
    const canWrite = canWriteOperational(uid);
    const [searchOptions, setSearchOptions] = useState<SearchOptions>({
        search: "",
        sort: "Ascending",
        option: "Name"
    });
    const myRows: InventoryItem[] = useMemo(() => {
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
        else if (option === "Remaining") sortedRows = filteredRows.sort((a, b) => {
            if (a.remaining < b.remaining) return sort === "Ascending" ? -1 : 1;
            if (a.remaining > b.remaining) return sort === "Ascending" ? 1 : -1;
            return 0;
        });
        else if (option === "Updated") sortedRows = filteredRows.sort((a, b) => {
            if (a.updated < b.updated) return sort === "Ascending" ? -1 : 1;
            if (a.updated > b.updated) return sort === "Ascending" ? 1 : -1;
            return 0;
        });
        else if (option === "Last Used") sortedRows = filteredRows.sort((a, b) => {
            if ((a.lastUsed ? dayjs(a.lastUsed).unix() : Infinity) < (b.lastUsed ? dayjs(b.lastUsed).unix() : Infinity)) return sort === "Ascending" ? -1 : 1;
            if ((a.lastUsed ? dayjs(a.lastUsed).unix() : -Infinity) > (b.lastUsed ? dayjs(b.lastUsed).unix() : -Infinity)) return sort === "Ascending" ? 1 : -1;
            return 0;
        });
        return sortedRows;
    }, [rows, searchOptions]);

    const header = [
        "Name",
        "Department",
        "Conumed",
        "Remaining",
        "Updated",
        "Last Used",
        ...(canWrite ? [""] : [])
    ];

    return <MyCard p={0}>
        <CardHeader
            display={"flex"}
            justifyContent={"space-between"}
            alignItems={"center"}
            py={4}
            gap={4}
            borderBottom="1px solid"
            borderColor={border}>
            {canWrite ? (
                <AddMaterialModal refetch={refetch} allowedDepartments={allowedDepartments} hasAllDepartments={hasAllDepartments}>
                    <PrimaryBtn size="sm" leftIcon={<BiPlus />}>Add Material</PrimaryBtn>
                </AddMaterialModal>
            ) : <Box />}
            <Stack gap={2} flexDir={{
                base: "column",
                sm: "row"
            }}
                justifyContent="center"
                alignItems={{
                    base: "flex-end",
                    sm: "center"
                }} w="fit-content">
                <PrimarySelect value={department} onChange={e => setDepartment(e.target.value)} size="sm" borderRadius={"md"}>
                    <>
                        <option value="ALL">All Departments</option>
                        {allowedDepartments.map(department => <option key={department} value={department}>{department}</option>)}
                    </>
                </PrimarySelect>
                <FilterOptions setSearchOptions={setSearchOptions} />
            </Stack>
        </CardHeader>
        <Table
            rows={myRows.map(row => ([
                {
                    element: Text,
                    props: {
                        fontWeight: 600
                    },
                    children: row.name.toUpperCase()
                },
                row.department ? {
                    element: Box,
                    children: {
                        element: Badge,
                        props: {
                            fontWeight: 500,
                            w: "fit-content",
                            colorScheme: "orange"
                        },
                        children: (row.department).toUpperCase()
                    }
                } : "",
                weightFormatter(row.consumed, row.pc_weight),
                {
                    element: Text,
                    props: {
                        fontWeight: 600,
                        color: row.remaining > 0 ? "green" : "red"
                    },
                    children: weightFormatter(row.remaining, row.pc_weight)
                },
                {
                    element: MyTooltip,
                    props: {
                        label: dayjs.unix(row.updated).format("hh:mm DD MMM, YYYY"),
                    },
                    children: {
                        element: Text,
                        props: {
                            fontWeight: 600,
                            width: "fit-content"
                        },
                        children: dayjs.duration(dayjs().diff(dayjs.unix(row.updated))).humanize()
                    }
                }, (row.lastUsed ? {
                    element: MyTooltip,
                    props: {
                        label: dayjs(row.lastUsed).format("DD MMM, YYYY"),
                    },
                    children: {
                        element: Text,
                        props: {
                            fontWeight: 600,
                            width: "fit-content"
                        },
                        children: dayjs.duration(dayjs().diff(dayjs(row.lastUsed))).humanize()
                    }
                } : {
                    element: Text,
                    props: {
                        fontWeight: 600
                    },
                    children: "Never"
                }), ...(canWrite ? [{
                    element: EditButton,
                    props: {
                        item: row,
                        refetch
                    }
                }] : [])
            ]))}
            notFound={!found || (searchOptions.search !== "" && myRows.length === 0)}
            headings={header} />
    </MyCard>
}

const EditButton = ({
    item,
    refetch
}: {
    item: InventoryItem,
    refetch: () => void
}) => {

    return <EditMaterialModal
        refetch={refetch}
        item={item}>
        <IconButton
            aria-label="Edit"
            icon={<FiEdit3 />}
        />
    </EditMaterialModal>
}

export type { SearchOptions };
export default InventoryTable