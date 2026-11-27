import { FormControl, FormLabel, SimpleGrid } from "@chakra-ui/react"
import { useEffect, useMemo, useState } from "react"
import { get } from "../../../Components/firebase/api/db";
import SearchableSelector, { SearchableSelectorOptions } from "../../../Components/Inputs/SearchableSelector"
import { machinesAtom, factoriesAtom, selectedFactoryAtom } from "../../../Components/Store/atoms";
import Listen from "../../../Components/Store/hooks/Listen";
import { getScopedAssetMap } from "../../../Services/rbac";
import type { Option, ReportParametrsType } from "./types";

const MoldSelector = ({
    setReportParameters,
    reportParameters
}: {
    setReportParameters?: (params: ReportParametrsType) => void,
    reportParameters?: ReportParametrsType
}) => {
    const [machine, setMachine] = useState<null | Option>(null);
    const [mold, setMold] = useState<null | Option | Option[]>(null);
    const [molds, setMolds] = useState<{
        [key: string]: SearchableSelectorOptions
    }>({});
    const _machines = Listen(machinesAtom);
    const factories = Listen(factoriesAtom);
    const selectedFactory = Listen(selectedFactoryAtom);
    const mySelectedFactory = selectedFactory && factories ? (factories as any)[selectedFactory.value] : undefined;
    const machines = useMemo(() => {
        const scoped = getScopedAssetMap(_machines, mySelectedFactory, "machines");
        return Object.entries(scoped).map(([id, name]) => ({
            label: name as string,
            value: id
        }))
    }, [_machines, mySelectedFactory]);

    useEffect(() => {
        setMachine(null);
        setMold(null);
    }, [selectedFactory]);

    useEffect(() => {
        if (!machine) return;
        if (molds[machine.value] !== undefined) return;
        const func = async () => {
            const snap = await get(`molds/${machine.value}`);
            const newMolds: {
                label: string,
                value: string
            }[] = [];
            snap.forEach(s => {
                if (s.key === null) return;
                const cycleTimeAvg = s.child("cycleTimeAvg").val() || 0 as number;
                newMolds.push({
                    label: cycleTimeAvg ? s.key.toUpperCase() + ` (${cycleTimeAvg.toFixed(0)}s)` : s.key.toUpperCase(),
                    value: s.key.toLowerCase()
                })
            });
            setMolds({
                ...molds,
                [machine.value]: newMolds
            });
        };
        func();
    }, [machine, molds]);

    useEffect(() => {
        if (!setReportParameters || !reportParameters) return;
        setReportParameters({
            ...reportParameters,
            mold: {
                ...reportParameters.mold,
                option: machine,
                secondaryOption: mold
            }
        });
        // eslint-disable-next-line
    }, [machine, mold]);

    return <SimpleGrid columns={2} gap={5}>
        <FormControl w="100%">
            <FormLabel fontSize="sm" opacity={0.9}>Machine</FormLabel>
            <SearchableSelector
                onChange={setMachine}
                value={machine}
                isDisabled={machines.length === 0}
                options={[{
                    label: "Extra",
                    options: [{
                        label: "Universal",
                        value: "UNIVERSAL_MOLDS"
                    }]
                }, {
                    label: "Machines",
                    options: machines
                }]}
                className="border-radius-5"
                size="sm" />
        </FormControl>
        <FormControl w="100%">
            <FormLabel fontSize="sm" opacity={0.9}>Mold</FormLabel>
            <SearchableSelector
                isMulti
                closeMenuOnSelect={false}
                onChange={setMold}
                value={mold}
                isDisabled={!molds[machine?.value as string]}
                options={molds[machine?.value as string] || []}
                className="border-radius-5"
                size="sm" />
        </FormControl>
    </SimpleGrid>
}

export default MoldSelector;