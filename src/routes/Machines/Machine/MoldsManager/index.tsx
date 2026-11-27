import { CardBody, Tab, TabList, TabPanel, TabPanels, Tabs, Text } from "@chakra-ui/react"
import { useEffect, useState } from "react"
import { get } from "../../../../Components/firebase/api/db";
import MyCard from "../../../../Components/micro/Card"
import { MachineDetails, Mold } from "../types";
import InstallMold from "./InstallMold";
import AddMold from "./AddMold";
import LoadingCard from "./LoadingCard";
import Get from "../../../../Components/Store/hooks/Get";
import { factoryProductionAtom } from "../../../../Components/Store/atoms";

interface MyRawMaterial {
    name: string,
    pc_weight: number | null,
};

const MoldsManager = ({
    machineID,
    machineDetails
}: {
    machineID?: string,
    machineDetails: MachineDetails
}) => {
    const productionType = Get(factoryProductionAtom);
    const [mounted, setMounted] = useState<boolean>(false);
    const [molds, setMolds] = useState<null | Mold[]>(null);
    const [installedMold, setInstalledMold] = useState<null | Mold>(null);
    const [rawMaterials, setRawMaterials] = useState<MyRawMaterial[]>([]);

    useEffect(() => {
        if (!machineID) return;
        setMounted(false);
        setMolds(null);
        setInstalledMold(null);
        setRawMaterials([]);
    }, [machineID])


    useEffect(() => {
        if (!machineID || !machineDetails || mounted) return;
        setMounted(true);
        const func = async () => {
            const snaps = [
                get(`molds/${machineID}`),
                get(`molds/UNIVERSAL_MOLDS`),
                get(`materials/inventory`),
            ];
            const [machineParametersSnap, universalMolds, materialsSnap] = await Promise.all(snaps);
            const machineParameters = machineParametersSnap.val() || {};
            const universalMoldsData = universalMolds.val() || {};
            const materials: MyRawMaterial[] = Object.entries(materialsSnap.val() || {}).map(([key, value]: [string, any]) => ({
                name: key,
                pc_weight: (value.pc_weight || 0) * 1000 || null
            }));
            const runningMoldName = machineDetails.upcomingMold === null ? machineDetails.moldRunning : machineDetails.upcomingMold.name;
            const snap = await get(`production-targets/active/${machineID}/${runningMoldName}/target`);
            const target: {
                current: number,
                total: number
            } | null = snap.val();
            const molds: Mold[] = Object.keys(machineParameters).map(key => {
                const shotConsumptionChange = machineParameters[key]?.stats?.avgShotConsomption ? +(machineParameters[key].stats.avgShotConsomption.current - machineParameters[key].stats.avgShotConsomption.last || 0).toFixed(2) : 0;
                const shotConsumptionPercentageChange = machineParameters[key]?.stats?.avgShotConsomption ? +(shotConsumptionChange / (machineParameters[key].stats.avgShotConsomption.last || 1) * 100).toFixed(2) : 0;
                const cycleTimeChange = machineParameters[key]?.stats?.avgCycleTime ? +(machineParameters[key].stats.avgCycleTime.current - machineParameters[key].stats.avgCycleTime.last || 0).toFixed(2) : 0;
                const cycleTimePercentageChange = machineParameters[key]?.stats?.avgCycleTime ? +(cycleTimeChange / (machineParameters[key].stats.avgCycleTime.last || 1) * 100).toFixed(2) : 0;
                return {
                    name: key as string,
                    moldLife: (machineParameters[key].moldLife || 0) as number,
                    shotAlertThreshold: (machineParameters[key].shotAlertThreshold || 0) as number,
                    cavities: +machineParameters[key].cavities,
                    productName: machineParameters[key].productName as string,
                    productColor: machineParameters[key].productColor as string,
                    materials: (machineParameters[key].materials as Mold["materials"]) || [],
                    consumptionAvg: {
                        value: +(machineParameters[key].stats?.avgShotConsomption?.avg || 0).toFixed(2) as number,
                        change: shotConsumptionPercentageChange,
                    },
                    cycleTimeAvg: {
                        value: +(machineParameters[key].stats?.avgCycleTime?.avg || 0).toFixed(0) as number,
                        change: cycleTimePercentageChange,
                    },
                    isUniversal: false,
                    isInstalled: runningMoldName === key
                }
            });
            Object.keys(universalMoldsData).forEach(key => {
                if (molds.find(mold => mold.name === key)) return; // Skip if already exists
                const shotConsumptionChange = universalMoldsData[key]?.stats?.avgShotConsomption ? +(universalMoldsData[key].stats.avgShotConsomption.current - universalMoldsData[key].stats.avgShotConsomption.last || 0).toFixed(2) : 0;
                const shotConsumptionPercentageChange = universalMoldsData[key]?.stats?.avgShotConsomption ? +(shotConsumptionChange / (universalMoldsData[key].stats.avgShotConsomption.last || 1) * 100).toFixed(2) : 0;
                const cycleTimeChange = universalMoldsData[key]?.stats?.avgCycleTime ? +(universalMoldsData[key].stats.avgCycleTime.current - universalMoldsData[key].stats.avgCycleTime.last || 0).toFixed(2) : 0;
                const cycleTimePercentageChange = universalMoldsData[key]?.stats?.avgCycleTime ? +(cycleTimeChange / (universalMoldsData[key].stats.avgCycleTime.last || 1) * 100).toFixed(2) : 0;
                molds.push({
                    name: key as string,
                    moldLife: (universalMoldsData[key].moldLife || 0) as number,
                    shotAlertThreshold: (universalMoldsData[key].shotAlertThreshold || 0) as number,
                    cavities: +universalMoldsData[key].cavities,
                    productName: universalMoldsData[key].productName as string,
                    productColor: universalMoldsData[key].productColor as string,
                    materials: (universalMoldsData[key].materials as Mold["materials"]) || [],
                    consumptionAvg: {
                        value: +(universalMoldsData[key].stats?.avgShotConsomption?.avg || 0).toFixed(2) as number,
                        change: shotConsumptionPercentageChange,
                    },
                    cycleTimeAvg: {
                        value: +(universalMoldsData[key].stats?.avgCycleTime?.avg || 0).toFixed(0) as number,
                        change: cycleTimePercentageChange,
                    },
                    isUniversal: true,
                    isInstalled: universalMoldsData[key].isInstalled || false
                });
            });
            const installedMold = molds.find(mold => mold.name === runningMoldName);
            if (target && installedMold) installedMold.target = target;
            setInstalledMold(installedMold || null);
            setMolds(molds);
            setRawMaterials(materials);
        };
        func();
    }, [machineID, machineDetails, mounted]);

    return <MyCard
        w="100%"
        h="100%"
        noPadding>
        <CardBody
            flexDir="column"
            display={"flex"}
            justifyContent={"space-between"}
            alignItems={"center"}
            py={4}>
            <Text
                whiteSpace="nowrap"
                overflow={"hidden"}
                textOverflow="ellipsis"
                maxW="30%"
                left={7}
                top={5}
                position={"absolute"}
                fontSize="md"
                fontWeight={500}>Manage Molds</Text>
            <Tabs
                variant='enclosed'
                colorScheme={"orange"}
                w="100%">
                <TabList justifyContent={"flex-end"}>
                    <Tab>Install</Tab>
                    <Tab>Add</Tab>
                </TabList>
                <TabPanels>
                    <TabPanel pb={0} px={0}>
                        {molds === null ? <LoadingCard /> :
                            <InstallMold productionType={productionType} machineID={machineID} molds={molds} installedMold={installedMold} materials={rawMaterials} setMounted={setMounted} />
                        }
                    </TabPanel>
                    <TabPanel pb={0} px={0}>
                        {molds === null ? <LoadingCard /> :
                            <AddMold productionType={productionType} machineID={machineID} molds={molds} matrials={rawMaterials} setMounted={setMounted} />
                        }
                    </TabPanel>
                </TabPanels>
            </Tabs>
        </CardBody>
    </MyCard>
}

export default MoldsManager
export type { MyRawMaterial }