import {
    GridItem,
    SimpleGrid,
    VStack,
} from '@chakra-ui/react';
import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom';
import NotFoundAlert from '../../../Components/micro/NotFoundAlert';
import { dateAtom, shiftsAtom } from '../../../Components/Store/atoms';
import Get from '../../../Components/Store/hooks/Get';
import fetch from './fetch';
import HourlyBreakdown from './HourlyBreakdown';
import HourlyCard from './HourlyCard';
import InsightsCard from './InsightsCard';
import MachineDetails from './MachineDetails';
import MoldHealth from './MoldHealth';
import MaterialBreakdown from './MaterialBreakdown';
import MoldBreakdown from './MoldBreakdown';
import MoldsManager from './MoldsManager';
import StatsCard from './StatsCard';
import ThermocoupleCard from './ThermocoupleCard';
import ProductionTargetCard from './ProductionTargetCard';
import DowntimeCard from './DowntimeCard';
import { foundType, Insigts, MachineDetails as MachineDetailsType, Report } from './types';
import Listen from '../../../Components/Store/hooks/Listen';
import { Helmet } from 'react-helmet';

const Machine = () => {
    const { machineID } = useParams<{ machineID: string }>();
    const [refresh, setRefresh] = useState<boolean>(false);
    const [foundStatus, setFoundStatus] = useState<foundType>({
        machine: true,
        report: true
    });
    const [machineDetails, setMachineDetails] = useState<MachineDetailsType>(null);
    const [report, setReport] = useState<Report | null>(null);
    const [insights, setInsights] = useState<Insigts | null>(null);
    const date = Listen(dateAtom);
    const shifts = Get(shiftsAtom);

    useEffect(() => {
        // set to loading state
        setFoundStatus({
            machine: true,
            report: true
        });
        setMachineDetails(null);
        setReport(null);
        setInsights(null);
    }, [machineID]);

    useEffect(() => {
        if (!date || !machineID || !shifts) return;
        fetch(date, machineID, shifts).then(data => {
            if (!data.machineFound) {
                setFoundStatus(prev => ({
                    ...prev,
                    machine: false
                }));
            } else if (!data.reportFound) {
                setFoundStatus(prev => ({
                    ...prev,
                    report: false
                }));
            }
            setMachineDetails(data.machineDetails);
            setReport(data.report);
            setInsights(data.insights);
        }).catch(err => {
            console.log(err);
        })
    }, [date, refresh, machineID, shifts]);

    useEffect(() => {
        const interval = setInterval(() => {
            setRefresh(prev => !prev);
        }, 30000);
        return () => clearInterval(interval);
    }, []);

    if (!foundStatus.machine) return <NotFoundAlert
        title="No Machine found!"
        description="No Machine found with this ID, please go back to homepage and try again or contact support if issue persists." />

    return <VStack
        w="100%"
        gap={5}>
        <Helmet>
            <title>{machineDetails?.name || ""} | Machines | industrialpmr</title>
        </Helmet>

        <SimpleGrid w="100%" columns={{
            base: 1,
            lg: 4,
        }} gap={5}>
            <GridItem>
                <MachineDetails
                    details={machineDetails} />
            </GridItem>
            <GridItem colSpan={{
                base: 1,
                lg: 3
            }}>
                <VStack gap={5} h={"100%"}>
                    <StatsCard
                        notFound={!foundStatus.report}
                        total={report?.total || null}
                        isPowerAnalyzer={machineDetails?.isPowerAnalyzer}
                        machineID={machineID}
                    />
                    <HourlyCard notFound={!foundStatus.report} hourlyData={report?.hourly || null} efficiency={machineDetails?.efficiency} />
                </VStack>
            </GridItem>
        </SimpleGrid>

        {/* Dedicated Production Target Card (only if target is set) */}
        {machineDetails?.productionTarget && (
            <ProductionTargetCard
                machineID={machineID || ""}
                machineName={machineDetails?.name}
                target={machineDetails.productionTarget}
            />
        )}
        {machineDetails?.has_thermocouple && (
            <ThermocoupleCard
                machineID={machineID || ""}
                machineName={machineDetails?.name || machineID}
                unit={machineDetails?.unit}
            />
        )}
        <SimpleGrid
            gap={5}
            w="100%"
            columns={{
                base: 1,
                lg: 3
            }}>
            <InsightsCard notFound={!foundStatus.report} insights={insights || null} />
            <MaterialBreakdown notFound={!foundStatus.report} materialBreakdown={report?.total?.materialBreakdown} />
            <MoldBreakdown notFound={!foundStatus.report} moldBreakdown={report?.molds} />
        </SimpleGrid>
        <HourlyBreakdown data={report?.hourly.tree || []} notFound={!foundStatus.report} />
        <DowntimeCard
            machineId={machineID || ""}
            machineName={machineDetails?.name}
            date={date || undefined}
            machineStatus={machineDetails?.status}
            onUpdateLog={() => setRefresh(prev => !prev)}
        />
        <SimpleGrid
            gap={5}
            w="100%"
            columns={{
                base: 1,
                lg: 3
            }}>
            <GridItem colSpan={{
                base: 1,
                lg: 2
            }}>
                <MoldHealth machineID={machineID} />
            </GridItem>
            <MoldsManager machineID={machineID} machineDetails={machineDetails} />
        </SimpleGrid>
    </VStack>
}

export default Machine