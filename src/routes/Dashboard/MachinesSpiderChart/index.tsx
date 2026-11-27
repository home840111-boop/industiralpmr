import {
    CardBody,
    CardHeader,
    Flex,
    Text,
    useColorMode
} from '@chakra-ui/react';
import { useMemo, useState, Suspense, useEffect } from 'react';
import MyCard from '../../../Components/micro/Card';
import { SmallFill } from '../../../Components/Loaders';
import Chart from './Chart';
import ShowSelector from '../../../Components/micro/ShowSelector';
import NotFound from "../../../Components/micro/NotFound";
import { factoryProductionAtom } from '../../../Components/Store/atoms';
import Get from '../../../Components/Store/hooks/Get';

interface machinesHour {
    hour: string;
    machine: string;
    value: {
        shots: number;
        production_meters: number;
        production: number;
        material: number;
        electricity: number;
    };
}
interface props {
    machines: machinesHour[],
    notFound?: boolean
}
type views = "shots" | "production" | "material" | "electricity" | "production_meters";
const MachinesSpiderChart = ({
    machines,
    notFound = false
}: props) => {
    const { colorMode } = useColorMode();
    const { border } = useMemo(() => {
        return {
            border: `${colorMode}.border`,
            linkHoverColor: `primary`,
            popoverContentBgColor: `${colorMode}.popoverContentBgColor`,
            hoverColor: `${colorMode}.popOverHoverColor`
        }
    }, [colorMode]);
    const isLoading = useMemo<boolean>(() => machines.length === 0, [machines]);
    const productionType = Get(factoryProductionAtom);
    const [view, _setView] = useState<views>("shots");

    const setView = (view: views) => {
        if (productionType === null) return;
        if (productionType === "meter" && view === "production") view = "production_meters";
        _setView(view);
    }

    useEffect(() => {
        if (productionType === null) return;
        if (productionType === "meter") _setView("production_meters");
    }, [productionType]);

    return <MyCard
        w="100%"
        h="100%"
        noPadding>
        <CardHeader
            alignItems="center"
            justifyContent="space-between"
            as={Flex}
            py={4}
            borderBottom="1px solid"
            borderColor={border}>
            <Text
                fontSize="md"
                fontWeight={500}>Machines Performance</Text>
            <ShowSelector view={view === "production_meters" ? "production" : view} setView={setView} />
        </CardHeader>
        <CardBody h="100%">
            {notFound ? <Suspense fallback={<SmallFill />}><NotFound /></Suspense> :
                isLoading ? <SmallFill /> : <Chart machines={machines} view={view} />}
        </CardBody>
    </MyCard>
}

export default MachinesSpiderChart;