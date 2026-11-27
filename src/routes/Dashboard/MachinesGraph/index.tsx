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

interface machineProps {
    name: string;
    shots: number;
    production_meters: number;
    production: number;
    material: number;
    electricity: number;
}
interface props {
    machines: machineProps[],
    notFound?: boolean
}
type views = "shots" | "production" | "material" | "electricity" | "production_meters";
const Units = ({
    machines,
    notFound = false
}: props) => {
    const { colorMode } = useColorMode();
    const { border } = useMemo(() => {
        return {
            border: `${colorMode}.border`,
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
                fontWeight={500}>Machines Stats</Text>
            <ShowSelector view={view === "production_meters" ? "production" : view} setView={setView} />
        </CardHeader>
        <CardBody h="100%">
            {
                notFound ? <Suspense fallback={<SmallFill />}>
                    <NotFound />
                </Suspense> : isLoading ? <SmallFill /> : <Chart machines={machines} view={view} />}
        </CardBody>
    </MyCard>
}

export default Units