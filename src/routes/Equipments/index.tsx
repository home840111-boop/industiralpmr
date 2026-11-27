import { Box } from "@chakra-ui/react";
import { Suspense, useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet";
import Header from "../../Components/Header";
import { SmallFill } from "../../Components/Loaders";
import NotFoundAlert from "../../Components/micro/NotFoundAlert";
import { dateAtom, departmentAtom, departmentsAtom, factoriesAtom, isMasterAdminAtom, selectedFactoryAtom, uidAtom } from "../../Components/Store/atoms";
import Listen from "../../Components/Store/hooks/Listen";
import { filterDepartmentsForView, isMasterOwner } from "../../Services/rbac";
import { MachineStatusTypes } from "../Machines/types";
import fetch, { RawEquipmentType } from "./fetch";
import GridLayout from "./GridLayout";
import ListLayout from "./ListLayout";

interface selectedFactoryType {
    name: string;
    value: number;
    only: boolean;
}

interface Equipment {
    id: string;
    name: string;
    status: "ON" | "OFF" | "IDLE" | "NA";
    statusSince: number;
    realtimeKW: {
        current: number;
        change: number;
    },
    updated: number;
    electricity: number;
    sessions: number;
    ontime: number;
    isUpToDate: true | string;
}

const Equipments = () => {
    const [view, _setView] = useState<'grid' | 'list'>(localStorage.getItem('equipmentsLayoutView') as 'grid' | 'list' || 'grid');
    const [searchQuery, setSearchQuery] = useState<string>("");
    const [department, setDepartment] = useState<string>("ALL");
    const [type, setType] = useState<MachineStatusTypes>("ALL");
    const selectedFactory = Listen(selectedFactoryAtom);
    const [rawEquipments, setRawEquipments] = useState<RawEquipmentType | "NOT_FOUND">({});
    const factories = Listen(factoriesAtom);
    const departments = Listen(departmentsAtom);
    const userDepts = Listen(departmentAtom) as string[] | null;
    Listen(isMasterAdminAtom);
    const uid = Listen(uidAtom);
    const date = Listen(dateAtom);
    const search = setSearchQuery;

    const mySelectedFactory = selectedFactory && factories ? (factories as any)[selectedFactory.value] : undefined;
    const hasAll = isMasterOwner(uid) || (userDepts || []).includes("all");
    const scopedDepartments = useMemo(() => (
        filterDepartmentsForView(departments, userDepts, hasAll, mySelectedFactory, "equipments")
    ), [departments, userDepts, hasAll, mySelectedFactory]);

    useEffect(() => {
        if (department !== "ALL" && departments && !scopedDepartments[department]) {
            setDepartment("ALL");
        }
    }, [department, departments, scopedDepartments]);

    useEffect(() => {
        setRawEquipments({});
    }, [selectedFactory]);

    useEffect(() => {
        if (!date || !selectedFactory || !factories) return;
        const getData = async () => {
            const data = await fetch(date, factories, selectedFactory);
            setRawEquipments(data);
        }
        const interval = setInterval(getData, 30000);
        getData();
        return () => {
            clearInterval(interval);
        }
    }, [date, selectedFactory, factories]);

    const setView = (view: 'grid' | 'list') => {
        localStorage.setItem('equipmentsLayoutView', view);
        _setView(view);
    }

    const { equipments, totalEquipments, viewingEquipments }: {
        equipments: Equipment[] | "NOT_FOUND",
        totalEquipments: number,
        viewingEquipments: number
    } = useMemo(() => {
        if (rawEquipments === "NOT_FOUND" || !departments) return {
            equipments: "NOT_FOUND",
            totalEquipments: 0,
            viewingEquipments: 0
        };
        const equipments = Object.values(rawEquipments);
        const toReturn = (() => {
            if (searchQuery) {
                return equipments.filter(equipment => equipment.name.toLowerCase().includes(searchQuery.toLowerCase()));
            }
            if (department === "ALL" && type === "ALL") return equipments;
            if (department === "ALL") return equipments.filter(machine => machine.status === type);
            const equipmentIDsInDepartment = department === "ALL" ? Object.keys(rawEquipments) : Object.values(departments[department]?.equipments || {});
            return equipments.filter(equipment => equipmentIDsInDepartment.includes(equipment.id) && (type === "ALL" ? true : equipment.status === type));
        })();
        if (toReturn.length === 0 && equipments.length > 0) return {
            equipments: "NOT_FOUND",
            totalEquipments: equipments.length,
            viewingEquipments: toReturn.length
        };
        return {
            equipments: toReturn,
            totalEquipments: equipments.length,
            viewingEquipments: toReturn.length
        };
    }, [rawEquipments, department, departments, type, searchQuery]);

    return <Box>
        <Helmet>
            <title>Equipments | industrialpmr</title>
        </Helmet>
        <Header
            search={search}
            department={department}
            setDepartment={setDepartment}
            departments={scopedDepartments}
            type={type}
            setType={setType}
            view={view}
            setView={setView}
            total={totalEquipments}
            viewing={viewingEquipments}
            viewingName={"Equipments"} />
        {
            rawEquipments === "NOT_FOUND" ? <NotFoundAlert
                title="No Equipments found!"
                description="No Equipments found in your factory, please contact support if you'd like to add a new equipment." />
                : view === 'grid' ?
                    <Suspense fallback={<SmallFill />}>
                        <GridLayout equipments={equipments === "NOT_FOUND" ? [] : equipments} notFound={equipments === "NOT_FOUND"} />
                    </Suspense> :
                    <Suspense fallback={<SmallFill />}>
                        <ListLayout equipments={equipments === "NOT_FOUND" ? [] : equipments} notFound={equipments === "NOT_FOUND"} />
                    </Suspense>
        }
    </Box>
}

export type { selectedFactoryType, Equipment };
export default Equipments