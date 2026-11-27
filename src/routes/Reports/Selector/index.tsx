import { FormControl, FormLabel, GridItem, SimpleGrid } from "@chakra-ui/react";
import MyCard from "../../../Components/micro/Card";
import PrimarySelect from "../../../Components/Inputs/PrimarySelect";
import CustomDatePicker from "../../../Components/micro/CustomDatePicker";
import { useEffect, useMemo, useState } from "react";
import { DateRange } from "react-day-picker";
import { PrimaryBtn } from "../../../Components/Buttons";
import { baseDepartmentAtom, EnvListAtom, equipmentsAtom, factoriesAtom, isMasterAdminAtom, machinesAtom, selectedFactoryAtom, uidAtom } from "../../../Components/Store/atoms";
import { getScopedAssetMap, isMasterOwner, toIdArray } from "../../../Services/rbac";
import { normalizeUnitKey } from "../../../Services/telemetry/useUnitMac";
import MachineSelector from "./MachineSelector";
import { BiRightArrowAlt } from "react-icons/bi";
import { reportParametersSet, ReportParametrsType, ReportSubmitType, ReportTypes } from "./types";
import EquipmentSelector from "./EquipmentSelector";
import EnvironmentSelector from "./EnvironmentSelector";
import { SearchableSelectorOptions } from "../../../Components/Inputs/SearchableSelector";
import UnitSelector from "./UnitSelector";
import { get } from "../../../Components/firebase/api/db";
import FactorySelector from "./FactoryElectricitySelector";
import dayjs from "../../../Components/Functions/dayjs";
import CustomMonthPicker from "../../../Components/micro/CustomDatePicker/CustomMonthPicker";
import CustomYearPicker from "../../../Components/micro/CustomDatePicker/CustomYearPicker";
import MaterialSelector from "./MaterialSelector";
import Listen from "../../../Components/Store/hooks/Listen";
import MoldSelector from "./MoldSelector";
import { auth } from "../../../Components/firebase";
import FactoryReportSelector from "./FactoryReportSelector";
import ProductionTargetsSelector from "./ProductionTargetsSelector";
import PowerAnalyzerSelector from "./PowerAnalyzerSelector";

const Selector = ({
    onSubmit
}: {
    onSubmit: (reportParameters: ReportSubmitType) => void
}) => {
    const [date, setDate] = useState<DateRange | undefined>(undefined);
    const [reportParameters, setReportParameters] = useState<ReportParametrsType>(reportParametersSet);
    const [type, setType] = useState<ReportTypes>("factory");
    const [units, setUnits] = useState<SearchableSelectorOptions>([]);
    const [allowed, setAllowed] = useState<{
        mainElectricity: boolean
    } | null>(null);
    const machinesRaw = Listen(machinesAtom);
    const factories = Listen(factoriesAtom);
    const selectedFactory = Listen(selectedFactoryAtom);
    const equipmentsRaw = Listen(equipmentsAtom);
    const environmentsRaw = Listen(EnvListAtom);
    const uid = Listen(uidAtom);
    const baseDeptsRaw = Listen(baseDepartmentAtom) as string[] | null;
    const baseDepts = useMemo(() => baseDeptsRaw || [], [baseDeptsRaw]);
    Listen(isMasterAdminAtom);
    const machines = useMemo(() => {
        if (!factories || !selectedFactory) return [];
        const mySelectedFactory: any = factories[selectedFactory.value];
        if (machinesRaw === null) return [];
        const machines = Object.keys(machinesRaw).filter(
            (key) =>
                mySelectedFactory === undefined ||
                mySelectedFactory?.machines?.includes(key),
        ).map(key => ({
            label: machinesRaw[key],
            value: key,
        }));
        if (machines.length === 0) return [];
        return [{
            label: "Machines",
            options: machines,
        }];
    }, [machinesRaw, factories, selectedFactory]);
    const equipments = useMemo(() => {
        if (!factories || !selectedFactory) return [];
        const mySelectedFactory: any = factories[selectedFactory.value];
        if (equipmentsRaw === null) return [];
        if (Object.keys(equipmentsRaw).length === 0) return [];
        const eqs = Object.keys(equipmentsRaw).filter(
            (key) =>
                mySelectedFactory === undefined ||
                mySelectedFactory?.equipments?.includes(key),
        ).map(key => ({
            label: equipmentsRaw[key],
            value: key,
        }));
        if (eqs.length === 0) return [];
        return [{
            label: "Equipments",
            options: eqs,
        }];
    }, [equipmentsRaw, factories, selectedFactory]);
    const environments = useMemo(() => {
        if (!factories || !selectedFactory) return [];
        const mySelectedFactory: any = factories[selectedFactory.value];
        if (environmentsRaw === null) return [];
        if (Object.keys(environmentsRaw).length === 0) return [];
        const envs = Object.keys(environmentsRaw).filter(
            (key) =>
                mySelectedFactory === undefined ||
                mySelectedFactory?.envs?.includes(key),
        ).map(key => ({
            label: environmentsRaw[key],
            value: key,
        }));
        if (envs.length === 0) return [];
        return [{
            label: "Environments",
            options: envs,
        }];
    }, [environmentsRaw, factories, selectedFactory]);
    const powerAnalyzerOptions = useMemo(() => {
        const options: any[] = [];
        if (machines.length > 0 && machines[0].options.length > 0) {
            options.push({
                label: "Machines",
                options: machines[0].options.map((opt: any) => ({
                    ...opt,
                    type: "machine"
                }))
            });
        }
        if (equipments.length > 0 && equipments[0].options.length > 0) {
            options.push({
                label: "Equipments",
                options: equipments[0].options.map((opt: any) => ({
                    ...opt,
                    type: "equipment"
                }))
            });
        }
        if (allowed?.mainElectricity) {
            options.push({
                label: "Main Meter",
                options: [{ label: "Main Meter", value: "MAIN", type: "main" }]
            });
        }
        return options;
    }, [machines, equipments, allowed]);
    const isDisabled = useMemo(() => {
        if (allowed === null) return true;
        if (type === "factory") return false;
        else if (type === "production-targets") {
            if (reportParameters[type].option === null) return true;
            else if (reportParameters[type].secondaryOption === null) return true;
            else if (reportParameters[type].thirdOption === null) return true;
            return false;
        } else if (type === "main-electricity") {
            if (reportParameters[type].date === undefined) return true;
            else if (reportParameters[type].type === "year" && reportParameters[type].date === "") return true;
            return false;
        } else if (reportParameters[type].option !== undefined) {
            if (reportParameters[type].option === null) return true;
            else if (Array.isArray(reportParameters[type].option) && Object.keys(reportParameters[type].option || {}).length === 0) return true;
        }
        if (reportParameters[type].secondaryOption !== undefined && reportParameters[type].secondaryOption === null) return true;
        return false;
        // eslint-disable-next-line
    }, [reportParameters, type, allowed]);
    useEffect(() => {
        if (uid === null) return;
        const func = async () => {
            const allowed = {
                mainElectricity: false
            };
            const { uid: myUid } = auth.currentUser || {};
            const isSubUser = uid !== myUid;
            const snap = await get("simple_meter/updated");
            allowed.mainElectricity = !!snap.val() && !isSubUser;
            setAllowed(allowed);
        };
        func();
    }, [uid]);
    useEffect(() => {
        if (date === undefined) return;
        setReportParameters(prev => {
            return {
                ...prev,
                [type]: {
                    ...prev[type],
                    date,
                }
            }
        });
    }, [date, type]);
    useEffect(() => {
        if (!factories || !selectedFactory || type !== "unit-power" || uid === null) return;
        let cancelled = false;
        setUnits([]);
        Promise.all([
            get("units"),
            get("address").catch(() => null),
            get("machines").catch(() => null),
            get("equipments").catch(() => null),
        ]).then(([snap, addressSnap, machinesSnap, equipmentsSnap]) => {
            if (cancelled) return;
            const _val = snap.val();
            if (_val === null) return;
            const address = addressSnap?.val() || {};
            const rawMachines = machinesSnap?.val() || {};
            const rawEquipments = equipmentsSnap?.val() || {};
            const hasFullScope = isMasterOwner(uid) || baseDepts.includes("all");
            const mySelectedFactory: any = factories[selectedFactory.value];
            const machineNames = getScopedAssetMap(machinesRaw, mySelectedFactory, "machines");
            const equipmentNames = getScopedAssetMap(equipmentsRaw, mySelectedFactory, "equipments");
            const envNames = getScopedAssetMap(environmentsRaw, mySelectedFactory, "envs");

            const fallbackByUnit: Record<string, string[]> = {};
            const scopedAssetUnits = new Set<string>();
            const registerFallbackUnit = (
                id: string,
                label: string,
                rawMap: Record<string, any>,
            ) => {
                const u = rawMap?.[id]?.unit;
                if (u === undefined || u === null || u === "") return;
                const norm = normalizeUnitKey(u);
                if (!norm) return;
                scopedAssetUnits.add(norm);
                if (!fallbackByUnit[norm]) fallbackByUnit[norm] = [];
                fallbackByUnit[norm].push(label);
            };
            Object.entries(machineNames).forEach(([id, label]) =>
                registerFallbackUnit(id, label, rawMachines),
            );
            Object.entries(equipmentNames).forEach(([id, label]) =>
                registerFallbackUnit(id, label, rawEquipments),
            );

            const factoryUnitIds = mySelectedFactory?.units
                ? new Set(
                    toIdArray(mySelectedFactory.units)
                        .map((u) => normalizeUnitKey(u))
                        .filter((u): u is string => Boolean(u)),
                )
                : null;
            const val = Object.keys(_val).filter((key) => {
                if (factoryUnitIds === null) return true;
                const normKey = normalizeUnitKey(key);
                return normKey !== null && (factoryUnitIds.has(normKey) || scopedAssetUnits.has(normKey));
            });

            const unitsKeys = val.reduce<Array<{ value: string; label: string }>>((acc, unit) => {
                const connecteds = [] as string[];
                const unitAddr = address?.[unit];
                if (unitAddr?.["extras"]) {
                    const humidName = envNames[unitAddr["extras"].dht_humid];
                    if (humidName) connecteds.push(humidName + " (ENV)");
                } else if (unitAddr?.["60"]) {
                    const myAddresses = unitAddr["60"];
                    for (const myAddress in myAddresses) {
                        const myAddressData = String(myAddresses[myAddress] || "").split("&")[0];
                        if (!myAddressData || myAddressData === "NONE") continue;
                        else if (myAddressData.includes("eq")) {
                            if (equipmentNames[myAddressData]) connecteds.push(equipmentNames[myAddressData]);
                        } else if (myAddressData.includes("factory")) {
                            if (hasFullScope) connecteds.push("MAIN");
                        } else {
                            if (machineNames[myAddressData]) connecteds.push(machineNames[myAddressData]);
                        }
                    }
                }
                // Fallback to direct machine/equipment `.unit` mapping (MAC-mapped units without I2C address)
                if (connecteds.length === 0) {
                    const normUnit = normalizeUnitKey(unit);
                    if (normUnit && fallbackByUnit[normUnit]) {
                        connecteds.push(...fallbackByUnit[normUnit]);
                    }
                }
                const uniqueConnecteds = Array.from(new Set(connecteds));
                if (!hasFullScope && uniqueConnecteds.length === 0) return acc;
                acc.push({
                    value: unit,
                    label: `UNIT ${String(unit).padStart(2, "0")} - ${uniqueConnecteds.length === 0 ? "NONE" : uniqueConnecteds.join(", ")}`,
                });
                return acc;
            }, []);
            if (!cancelled) setUnits(unitsKeys);
        }).catch(console.error);
        return () => {
            cancelled = true;
        };
    }, [type, uid, factories, selectedFactory, machinesRaw, equipmentsRaw, environmentsRaw, baseDepts]);
    const submit = () => {
        onSubmit({
            type,
            ...reportParameters,
            [type]: {
                ...reportParameters[type],
                generated: new Date().getTime(),
            }
        });
    }
    const changeType = (e: React.ChangeEvent<HTMLSelectElement>) => {
        // reset date
        const value = e.target.value as ReportTypes;
        setType(value);
    };


    return <MyCard p={3}>
        <SimpleGrid columns={{
            base: 1,
            xl: 6,
        }} gap={5}>
            <FormControl>
                <FormLabel fontSize="sm" opacity={0.9}>Type</FormLabel>
                <PrimarySelect isDisabled={allowed === null} size="sm" borderRadius={"5px"} fontWeight={500} value={type} onChange={changeType}>
                    <optgroup label="Primary Reports">
                        <option value="factory">Factory</option>
                        <option disabled={machines.length === 0} value="machine">Machine</option>
                        <option disabled={equipments.length === 0} value="equipment">Equipment</option>
                        <option disabled={!allowed?.mainElectricity} value="main-electricity">Main Electricity</option>
                        <option value="power-analyzer">Power Analyzer</option>
                    </optgroup>
                    <optgroup label="Secondary Reports">
                        <option value="mold">Mold</option>
                        <option value="production-targets">Production Targets</option>
                        <option value="unit-power">Unit Power</option>
                        <option value="material">Material Consumption</option>
                        <option disabled={environments.length === 0} value="environment">Environment</option>
                    </optgroup>
                </PrimarySelect>
            </FormControl>
            <GridItem colSpan={{
                base: 1,
                xl: type === "production-targets" ? 4 : 3,
            }}>{
                    type === "factory" ? <FactoryReportSelector reportParameters={reportParameters} setReportParameters={setReportParameters} />
                        : type === "machine" ? <MachineSelector machines={machines} reportParameters={reportParameters} setReportParameters={setReportParameters} />
                            : type === "equipment" ? <EquipmentSelector equipments={equipments} reportParameters={reportParameters} setReportParameters={setReportParameters} />
                                : type === "environment" ? <EnvironmentSelector environments={environments} reportParameters={reportParameters} setReportParameters={setReportParameters} />
                                    : type === "unit-power" ? <UnitSelector units={units} reportParameters={reportParameters} setReportParameters={setReportParameters} />
                                        : type === "main-electricity" ? <FactorySelector reportParameters={reportParameters} setReportParameters={setReportParameters} />
                                            : type === "material" ? <MaterialSelector reportParameters={reportParameters} setReportParameters={setReportParameters} />
                                                : type === "mold" ? <MoldSelector reportParameters={reportParameters} setReportParameters={setReportParameters} />
                                                    : type === "production-targets" ? <ProductionTargetsSelector reportParameters={reportParameters} setReportParameters={setReportParameters} />
                                                        : type === "power-analyzer" ? <PowerAnalyzerSelector options={powerAnalyzerOptions} reportParameters={reportParameters} setReportParameters={setReportParameters} />
                                                            : null
                }
            </GridItem>
            {type !== "production-targets" && <FormControl>
                <FormLabel fontSize="sm" opacity={0.9}>Duration</FormLabel>
                {type === "main-electricity" ?
                    reportParameters[type].type === "month" ? <CustomMonthPicker
                        set={e => {
                            setReportParameters(prev => {
                                return {
                                    ...prev,
                                    [type]: {
                                        ...prev[type],
                                        date: `${e?.from}|${e?.to}`,
                                    }
                                }
                            });
                        }} />
                        : reportParameters[type].type === "day" ? <CustomDatePicker
                            singleMonth
                            set={e => {
                                setReportParameters(prev => {
                                    return {
                                        ...prev,
                                        [type]: {
                                            ...prev[type],
                                            date: `${dayjs(e?.from).format("YYYY-MM-DD")}|${dayjs(e?.to).format("YYYY-MM-DD")}`,
                                        }
                                    }
                                });
                            }} />
                            : <CustomYearPicker
                                set={e => {
                                    setReportParameters(prev => {
                                        return {
                                            ...prev,
                                            [type]: {
                                                ...prev[type],
                                                date: `${e?.from}|${e?.to}`,
                                            }
                                        }
                                    });
                                }} />
                    : <CustomDatePicker set={setDate} reset={type} />}
            </FormControl>}
            <FormControl w="100%">
                <FormLabel fontSize="sm" opacity={0.9}>&nbsp;</FormLabel>
                <PrimaryBtn onClick={submit} rightIcon={<BiRightArrowAlt />} display={"flex"} m="auto" size="sm" isDisabled={isDisabled}>Generate</PrimaryBtn>
            </FormControl>
        </SimpleGrid>
    </MyCard>
}

export default Selector