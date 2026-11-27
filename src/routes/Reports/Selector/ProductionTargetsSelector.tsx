import { FormControl, FormLabel, GridItem, SimpleGrid } from "@chakra-ui/react"
import { useEffect, useMemo, useState } from 'react';
import { get, query } from '../../../Components/firebase/api/db';
import SearchableSelector, { SearchableSelectorOptions } from '../../../Components/Inputs/SearchableSelector';
import { machinesAtom, factoriesAtom, selectedFactoryAtom } from '../../../Components/Store/atoms';
import Listen from '../../../Components/Store/hooks/Listen';
import { getScopedAssetMap } from '../../../Services/rbac';
import { Option, ReportParametrsType } from './types';
import dayjs from "../../../Components/Functions/dayjs";
import { endBefore, limitToLast, orderByKey } from "firebase/database";

const ProductionTargetsSelector = ({
    setReportParameters,
    reportParameters
}: {
    setReportParameters?: (params: ReportParametrsType) => void,
    reportParameters?: ReportParametrsType
}) => {
    const [machine, setMachine] = useState<null | Option>(null);
    const [mold, setMold] = useState<null | Option>(null);
    const [molds, setMolds] = useState<{
        [key: string]: SearchableSelectorOptions
    }>({});
    const [lastKey, setLastKey] = useState<null | string>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [productionTarget, setProductionTarget] = useState<null | Option>(null);
    const [productionTargets, setProductionTargets] = useState<{
        [key: string]: {
            [key: string]: SearchableSelectorOptions
        }
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
        setProductionTarget(null);
    }, [selectedFactory]);

    useEffect(() => {
        if (!machine) return;
        setMold(null);
        setProductionTarget(null);
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
                    value: s.key
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
            "production-targets": {
                ...reportParameters["production-targets"],
                option: machine,
                secondaryOption: mold,
                thirdOption: productionTarget
            }
        });
        // eslint-disable-next-line
    }, [machine, mold, productionTarget]);

    useEffect(() => {
        if (!machine || !mold) return;
        const func = async () => {
            setIsLoading(true);
            const snap = await query(`production-targets/completed/${machine.value}/${mold.value}`, limitToLast(5), ...(lastKey ? [orderByKey(), endBefore(lastKey)] : []));
            const productionTargets: {
                label: string,
                value: string
            }[] = [];
            snap.forEach(s => {
                if (s.key === null) return;
                const name = s.child("name").val() || "";
                const startUnix = s.child("startedAt").val();
                const finishUnix = s.child("completedAt").val();
                const startStr = startUnix && dayjs(startUnix).isValid() ? dayjs(startUnix).format("hh:mm A Do MMM") : "NA";
                const finishStr = finishUnix && dayjs(finishUnix).isValid() ? dayjs(finishUnix).format("hh:mm A Do MMM") : "NA";
                productionTargets.push({
                    label: name + `\t(${startStr} - ${finishStr})`,
                    value: s.key
                });
            });
            setProductionTargets(prev => {
                return {
                    ...prev,
                    [machine.value]: {
                        ...prev[machine.value],
                        [mold.value]: [
                            ...(prev?.[machine.value]?.[mold.value] || []),
                            ...productionTargets.reverse()
                        ]
                    }
                }
            });
            setIsLoading(false);
        }
        func();
    }, [mold, machine, lastKey]);

    return <SimpleGrid columns={{
        base: 2,
        lg: 4
    }} gap={5}>
        <FormControl w="100%">
            <FormLabel fontSize="sm" opacity={0.9}>Machine</FormLabel>
            <SearchableSelector
                onChange={setMachine}
                value={machine}
                isDisabled={machines.length === 0}
                options={machines}
                className="border-radius-5"
                size="sm" />
        </FormControl>
        <FormControl w="100%">
            <FormLabel fontSize="sm" opacity={0.9}>Mold</FormLabel>
            <SearchableSelector
                onChange={setMold}
                value={mold}
                isDisabled={!molds[machine?.value as string]}
                options={molds[machine?.value as string] || []}
                className="border-radius-5"
                size="sm" />
        </FormControl>
        <FormControl as={GridItem} colSpan={2} w="100%">
            <FormLabel fontSize="sm" opacity={0.9}>Target</FormLabel>
            <SearchableSelector
                maxMenuHeight={100}
                onMenuScrollToBottom={() => {
                    if (!machine || !mold || isLoading) return;
                    setLastKey((productionTargets[machine.value][mold.value].at(-1) as Option)?.value || null);
                }}
                isLoading={isLoading}
                onChange={setProductionTarget}
                value={productionTarget}
                isDisabled={!mold}
                options={productionTargets[machine?.value as string]?.[mold?.value as string] || [] as Option[]}
                className="border-radius-5"
                size="sm" />
        </FormControl>
    </SimpleGrid>
}

export default ProductionTargetsSelector