import { FormControl, FormLabel, GridItem, SimpleGrid } from "@chakra-ui/react"
import { useEffect, useMemo, useState } from "react"
import { get } from "../../../Components/firebase/api/db";
import PrimarySelect from "../../../Components/Inputs/PrimarySelect"
import SearchableSelector, { SearchableSelectorOptions } from "../../../Components/Inputs/SearchableSelector"
import {
    departmentAtom,
    departmentsAtom,
    factoriesAtom,
    isMasterAdminAtom,
    machinesAtom,
    selectedFactoryAtom,
    uidAtom,
} from "../../../Components/Store/atoms";
import Listen from "../../../Components/Store/hooks/Listen";
import { filterDepartmentsForView, getScopedAssetMap, isMasterOwner } from "../../../Services/rbac";
import type { Option, ReportParametrsType } from "./types";

const MaterialSelector = ({
    setReportParameters,
    reportParameters
}: {
    setReportParameters?: (params: ReportParametrsType) => void,
    reportParameters?: ReportParametrsType
}) => {
    const [reportByMachine, setReportByMachine] = useState(true);
    const [rawMaterialIds, setRawMaterialIds] = useState<string[] | null>(null);
    const [selected, setSelected] = useState<null | Option | Option[]>(null);
    const _machines = Listen(machinesAtom);
    const factories = Listen(factoriesAtom);
    const selectedFactory = Listen(selectedFactoryAtom);
    const userDepts = Listen(departmentAtom) as string[] | null;
    const allDepartments = Listen(departmentsAtom);
    Listen(isMasterAdminAtom);
    const uid = Listen(uidAtom);

    const mySelectedFactory = selectedFactory && factories ? (factories as any)[selectedFactory.value] : undefined;
    const hasAll = isMasterOwner(uid) || (userDepts || []).includes("all");
    const machines = useMemo(() => {
        const scoped = getScopedAssetMap(_machines, mySelectedFactory, "machines");
        return Object.entries(scoped).map(([id, name]) => ({
            label: name as string,
            value: id
        }))
    }, [_machines, mySelectedFactory]);

    const allowedDeptLower = useMemo(() => {
        const scopedDepts = filterDepartmentsForView(allDepartments, userDepts, hasAll, mySelectedFactory, "machines");
        return new Set(Object.keys(scopedDepts).map((d) => d.toLowerCase()));
    }, [allDepartments, userDepts, hasAll, mySelectedFactory]);

    const materials: SearchableSelectorOptions = useMemo(() => {
        if (!rawMaterialIds) return [];
        return rawMaterialIds
            .filter((mat) => {
                if (hasAll && mySelectedFactory === undefined) return true;
                const matDept = mat.match(/\(([^)]+)\)$/)?.[1]?.toLowerCase() || "";
                return matDept !== "" && allowedDeptLower.has(matDept);
            })
            .map((mat) => ({
                label: mat.toUpperCase(),
                value: mat.toLowerCase()
            }));
    }, [rawMaterialIds, hasAll, mySelectedFactory, allowedDeptLower]);

    useEffect(() => {
        setSelected(null);
    }, [selectedFactory]);

    useEffect(() => {
        setSelected(null);
        if (reportByMachine || rawMaterialIds !== null) return;
        const func = async () => {
            const snap = await get("materials/inventory");
            setRawMaterialIds(Object.keys(snap.val() || {}));
        };
        func();
    }, [reportByMachine, rawMaterialIds]);

    useEffect(() => {
        if (!setReportParameters || !reportParameters) return;
        setReportParameters({
            ...reportParameters,
            material: {
                ...reportParameters.material,
                option: reportByMachine ? {
                    value: "machine",
                    label: "Machine"
                } : {
                    value: "material",
                    label: "Material"
                },
                secondaryOption: selected
            }
        });
        // eslint-disable-next-line
    }, [reportByMachine, selected])

    return <SimpleGrid columns={3} gap={5}>
        <FormControl w="100%">
            <FormLabel fontSize="sm" opacity={0.9}>Report by</FormLabel>
            <PrimarySelect size="sm" borderRadius={"5px"} fontWeight={500} value={reportByMachine ? "machine" : "material"}
                isDisabled={machines.length === 0}
                onChange={e => {
                    setSelected(null);
                    setReportByMachine(e.target.value === "machine");
                }}>
                <option value="machine">Machine</option>
                <option value="material">Material</option>
            </PrimarySelect>
        </FormControl>
        <GridItem colSpan={2}>
            <FormControl w="100%">
                <FormLabel fontSize="sm" opacity={0.9}>{reportByMachine ? "Machine" : "Material"}</FormLabel>
                <SearchableSelector
                    onChange={setSelected}
                    value={selected}
                    isDisabled={reportByMachine ? machines.length === 0 : materials.length === 0}
                    options={reportByMachine ? machines : materials}
                    className="border-radius-5"
                    size="sm" />
            </FormControl>
        </GridItem>
    </SimpleGrid>
}

export default MaterialSelector