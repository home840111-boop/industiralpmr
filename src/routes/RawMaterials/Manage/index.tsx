import { Box, Stack } from "@chakra-ui/react"
import { useEffect, useMemo, useState } from "react"
import { Helmet } from "react-helmet";
import { get } from "../../../Components/firebase/api/db";
import {
    dateAtom,
    departmentAtom,
    departmentsAtom,
    factoriesAtom,
    isMasterAdminAtom,
    roleAtom,
    selectedFactoryAtom,
    uidAtom,
} from "../../../Components/Store/atoms";
import Listen from "../../../Components/Store/hooks/Listen";
import { filterDepartmentsForView, isMasterOwner } from "../../../Services/rbac";
import InventoryTable from "./InventoryTable";
import Stats from "./Stats"

interface StatsType {
    total: number;
    available: number;
    consumed: number;
    negatives: number;
}
interface InventoryItem {
    id: string;
    name: string;
    department?: string;
    consumed: number;
    remaining: number;
    pc_weight: number | null;
    updated: number;
    lastUsed?: string;
}

const ManageRawMaterials = () => {
    const [stats, setStats] = useState<null | StatsType>(null);
    const [rawInventory, setRawInventory] = useState<null | InventoryItem[]>(null);
    const [inventory, setInventory] = useState<null | InventoryItem[]>(null);
    const [department, setDepartment] = useState<string>("ALL");
    const date = Listen(dateAtom);
    const uid = Listen(uidAtom);
    const userDepts = Listen(departmentAtom) as string[] | null;
    const allDepartmentsRaw = Listen(departmentsAtom);
    const factories = Listen(factoriesAtom);
    const selectedFactory = Listen(selectedFactoryAtom);
    Listen(isMasterAdminAtom);
    Listen(roleAtom);

    const mySelectedFactory = selectedFactory && factories ? (factories as any)[selectedFactory.value] : undefined;
    const hasAllDepartments = isMasterOwner(uid) || (userDepts || []).includes("all");
    const allowedDepartments = useMemo(() => (
        Object.keys(filterDepartmentsForView(allDepartmentsRaw, userDepts, hasAllDepartments, mySelectedFactory))
    ), [hasAllDepartments, allDepartmentsRaw, userDepts, mySelectedFactory]);
    const allowedDeptKey = allowedDepartments.join("|");

    useEffect(() => {
        if (department !== "ALL" && !allowedDepartments.includes(department)) {
            setDepartment("ALL");
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [department, allowedDeptKey]);

    const func = async () => {
        const inventorySnap = await get("materials/inventory");
        const inventory: InventoryItem[] = Object.entries(inventorySnap.val() || {}).map(([id, item]: [string, any]) => {
            const department: string | undefined = id.split("(")[1];
            return {
                id: id,
                name: item.name,
                department: department?.substring(0, department.length - 1),
                consumed: item.consumed * 1000,
                remaining: item.remaining * 1000,
                pc_weight: ((item.pc_weight || 0) * 1000) || null,
                updated: item.dateUpdated,
                lastUsed: item.lastUsed
            }
        });
        setRawInventory(inventory);
    };

    useEffect(() => {
        if (!rawInventory) return;
        const allowedDeptLower = new Set(allowedDepartments.map((d) => d.toLowerCase()));
        const stats: StatsType = {
            available: 0,
            consumed: 0,
            negatives: 0,
            total: 0
        };
        const inventory: InventoryItem[] = [];
        for (const item of rawInventory) {
            if ((!hasAllDepartments || mySelectedFactory !== undefined) && (!item.department || !allowedDeptLower.has(item.department.toLowerCase()))) {
                continue;
            }
            if (department === "ALL" || item.department === department.toLowerCase()) {
                inventory.push(item);
                stats.total++;
                stats.available += Math.max(item.remaining, 0);
                stats.consumed += item.consumed;
                stats.negatives += item.remaining < 0 ? 1 : 0;
            }
        }
        setInventory(inventory);
        setStats(stats);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [rawInventory, department, hasAllDepartments, allowedDeptKey, mySelectedFactory]);

    useEffect(() => {
        if (!date) return;
        func();
    }, [date]);

    return <Box>
        <Helmet>
            <title>Manage Materials | Raw Materials | industrialpmr</title>
        </Helmet>
        <Stack gap={5}>
            <Stats
                loading={stats === null}
                stats={stats} />
            <InventoryTable
                department={department}
                setDepartment={setDepartment}
                allowedDepartments={allowedDepartments}
                hasAllDepartments={hasAllDepartments}
                found={inventory === null ? true : inventory.length !== 0}
                rows={inventory || []}
                refetch={func}
            />
        </Stack>
    </Box>
}

export type { StatsType, InventoryItem };
export default ManageRawMaterials