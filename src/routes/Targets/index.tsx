import { Box, useToast } from "@chakra-ui/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Helmet } from "react-helmet";
import { departmentAtom, departmentsAtom, factoriesAtom, isMasterAdminAtom, selectedFactoryAtom, uidAtom } from "../../Components/Store/atoms";
import Listen from "../../Components/Store/hooks/Listen";
import { filterDepartmentsForView, isMasterOwner } from "../../Services/rbac";
import fetch from "./fetch";
import GridLayout from "./GridLayout";
import Header from "./Header";
import TargetsSummaryBar, { SummaryStats } from "./TargetsSummaryBar";
import { SapTargetOrder, syncActiveTargetsBatch, TargetWithSapOrder, useIsSapEnabled } from "../../Services/sap";

interface Machine {
    id: string;
    hasTarget: boolean;
    name: string;
    target: {
        name: string,
        due?: string,
        target: number,
        started: number;
        sapOrder?: SapTargetOrder | null;
    },
    status: {
        status: "ON" | "OFF" | "IDLE" | "NA";
        since: number;
    };
    progress: {
        total: number;
        current: number;
        track: number;
        shouldbe: number;
    };
    mold: {
        name: string;
        since: number;
        cycleTime: number;
    };
    hours: {
        production: number;
        downtime: number;
        ontime: number;
        time: string;
        date: string;
        unix?: number;
        rawDate?: string;
    }[];
    OEE: number;
    timing: {
        ontime: number;
        downtime: number;
        projectedEndTime: number; //unix
    };
    operator: {
        name: string;
        shift: string;
    };
    updated: number;
};

const Targets = () => {
    const isSapEnabled = useIsSapEnabled();
    const [department, setDepartment] = useState<string>("ALL");
    const [searchQuery, setSearchQuery] = useState<string>("");
    const [rawMachines, setRawMachines] = useState<Machine[] | "NOT_FOUND">([]);
    const [targetFilter, setTargetFilter] = useState<"ALL" | "ACTIVE" | "SAP">(() => {
        const saved = localStorage.getItem("targetsFilter");
        if (saved === "SAP" || saved === "ACTIVE" || saved === "ALL") return saved;
        return localStorage.getItem("showOnlyWithTargets") === "true" ? "ACTIVE" : "ALL";
    });
    const [refresh, setRefresh] = useState<boolean>(false);
    const [isBatchSyncing, setIsBatchSyncing] = useState<boolean>(false);
    const [batchLastSynced, setBatchLastSynced] = useState<number | null>(null);
    const hasAutoSyncedRef = useRef<boolean>(false);
    const toast = useToast();

    const factories = Listen(factoriesAtom);
    const selectedFactory = Listen(selectedFactoryAtom);
    const uid = Listen(uidAtom);
    const departments = Listen(departmentsAtom);
    const userDepts = Listen(departmentAtom) as string[] | null;
    Listen(isMasterAdminAtom);
    const search = setSearchQuery;

    const mySelectedFactory = selectedFactory && factories ? (factories as any)[selectedFactory.value] : undefined;
    const hasAll = isMasterOwner(uid) || (userDepts || []).includes("all");
    const scopedDepartments = useMemo(() => (
        filterDepartmentsForView(departments, userDepts, hasAll, mySelectedFactory, "machines")
    ), [departments, userDepts, hasAll, mySelectedFactory]);

    useEffect(() => {
        if (department !== "ALL" && departments && !scopedDepartments[department]) {
            setDepartment("ALL");
        }
    }, [department, departments, scopedDepartments]);

    const summaryStats: SummaryStats | null = useMemo(() => {
        if (!Array.isArray(rawMachines) || rawMachines.length === 0) return null;
        let totalActiveTargets = 0;
        let totalSapTargets = 0;
        let onTrackTargets = 0;
        let behindTargets = 0;
        let totalTargetPieces = 0;
        let totalCurrentPieces = 0;

        rawMachines.forEach((m) => {
            if (m.hasTarget) {
                totalActiveTargets++;
                totalTargetPieces += m.progress?.total || 0;
                totalCurrentPieces += m.progress?.current || 0;
                if ((m.progress?.track || 0) >= 0) {
                    onTrackTargets++;
                } else {
                    behindTargets++;
                }
                if (m.target?.sapOrder) {
                    totalSapTargets++;
                }
            }
        });

        const overallPercent =
            totalTargetPieces > 0
                ? Math.min(100, Math.round((totalCurrentPieces / totalTargetPieces) * 100))
                : 0;

        return {
            totalMachines: rawMachines.length,
            totalActiveTargets,
            totalSapTargets,
            onTrackTargets,
            behindTargets,
            totalTargetPieces,
            totalCurrentPieces,
            overallPercent,
        };
    }, [rawMachines]);

    const activeSapTargets: TargetWithSapOrder[] = useMemo(() => {
        if (!Array.isArray(rawMachines)) return [];
        const targets: TargetWithSapOrder[] = [];
        rawMachines.forEach((m) => {
            if (m.hasTarget && m.target?.sapOrder && m.mold?.name) {
                targets.push({
                    machineID: m.id,
                    moldName: m.mold.name,
                    orderNumber: m.target.sapOrder.orderNumber,
                    materialNumber: m.target.sapOrder.materialNumber,
                    sapOrder: m.target.sapOrder,
                });
            }
        });
        return targets;
    }, [rawMachines]);

    // Reset auto-sync check whenever factory changes
    useEffect(() => {
        hasAutoSyncedRef.current = false;
    }, [selectedFactory]);

    // Daily auto-check for active SAP targets: if updated today -> 0 calls. If updated yesterday/missing -> fetch SAP
    useEffect(() => {
        if (!isSapEnabled || activeSapTargets.length === 0 || hasAutoSyncedRef.current) return;
        hasAutoSyncedRef.current = true;

        const maxInitialSync = Math.max(
            ...activeSapTargets.map((t) => t.sapOrder?.lastSynced || 0),
            0
        );
        if (maxInitialSync > 0) {
            setBatchLastSynced(maxInitialSync);
        }

        syncActiveTargetsBatch(activeSapTargets, false)
            .then((res) => {
                if (res.lastFetched) {
                    setBatchLastSynced(res.lastFetched);
                }
                if (!res.fromCache && res.updatedCount > 0) {
                    setRefresh((prev) => !prev);
                }
            })
            .catch((err) => {
                console.warn("[SAP Batch Auto-Sync] Check failed:", err);
            });
    }, [isSapEnabled, activeSapTargets]);

    const handleBatchSync = async () => {
        if (isBatchSyncing || activeSapTargets.length === 0) return;
        setIsBatchSyncing(true);
        try {
            const res = await syncActiveTargetsBatch(activeSapTargets, true);
            if (res.lastFetched) {
                setBatchLastSynced(res.lastFetched);
            }
            toast({
                title: "SAP Synced",
                description: `Updated ${res.updatedCount} active production target${res.updatedCount === 1 ? "" : "s"} from SAP Gateway.`,
                status: "success",
                duration: 3500,
                isClosable: true,
                position: "bottom-right",
            });
            setRefresh((prev) => !prev);
        } catch (err: any) {
            console.error("[SAP Batch Sync] Error:", err);
            toast({
                title: "SAP Sync Failed",
                description: err?.message || "Could not fetch updated data from SAP Gateway.",
                status: "error",
                duration: 4000,
                isClosable: true,
                position: "bottom-right",
            });
        } finally {
            setIsBatchSyncing(false);
        }
    };

    const { machines, totalMachines, viewingMachines }: {
        machines: Machine[] | "NOT_FOUND",
        totalMachines: number,
        viewingMachines: number
    } = useMemo(() => {
        if (rawMachines === "NOT_FOUND" || !departments) return {
            machines: "NOT_FOUND",
            totalMachines: 0,
            viewingMachines: 0
        };
        const machines: Machine[] = [];
        rawMachines.forEach(machine => {
            if (targetFilter === "ACTIVE") {
                if (machine.hasTarget) machines.push(machine);
            } else if (targetFilter === "SAP") {
                if (machine.hasTarget && machine.target?.sapOrder) machines.push(machine);
            } else {
                machines.push(machine);
            }
        });
        const toReturn = (() => {
            if (searchQuery) {
                return machines.filter(machine => machine.name.toLowerCase().includes(searchQuery.toLowerCase()));
            }
            if (department === "ALL") return machines;
            const machineIDsInDepartment = department === "ALL" ? Object.keys(rawMachines) : Object.values(departments[department]?.machines || {});
            return machines.filter(machine => machineIDsInDepartment.includes(machine.id));
        })();
        if (toReturn.length === 0 && rawMachines.length > 0) return {
            machines: "NOT_FOUND",
            totalMachines: rawMachines.length,
            viewingMachines: toReturn.length
        };
        return {
            machines: toReturn,
            totalMachines: rawMachines.length,
            viewingMachines: toReturn.length
        };
    }, [rawMachines, department, departments, searchQuery, targetFilter]);

    useEffect(() => {
        if (!uid || !factories) return;
        try {
            fetch(factories, selectedFactory).then(setRawMachines);
        } catch (err) {
            console.error(err);
            setRawMachines("NOT_FOUND");
        }
    }, [refresh, uid, factories, selectedFactory]);

    useEffect(() => {
        const interval = setInterval(() => setRefresh(prev => !prev), 30000);
        return () => clearInterval(interval);
    }, []);

    return <Box>
        <Helmet>
            <title>Production Targets | industrialpmr</title>
        </Helmet>
        <Header
            search={search}
            view={"grid"}
            setView={() => { }}
            department={department}
            setDepartment={setDepartment}
            departments={scopedDepartments}
            total={totalMachines}
            viewing={viewingMachines}
            targetFilter={targetFilter}
            setTargetFilter={setTargetFilter}
            hideLayoutSelector
            viewingName={"Machine"} />
        {summaryStats && summaryStats.totalActiveTargets > 0 && (
            <TargetsSummaryBar
                stats={summaryStats}
                isSapEnabled={isSapEnabled}
                activeFilter={targetFilter}
                onFilterChange={setTargetFilter}
                isBatchSyncing={isBatchSyncing}
                batchLastSynced={batchLastSynced}
                onBatchSync={handleBatchSync}
            />
        )}
        <GridLayout machines={machines === "NOT_FOUND" ? [] : machines} notFound={machines === "NOT_FOUND"} />
    </Box>
}

export type { Machine };
export default Targets