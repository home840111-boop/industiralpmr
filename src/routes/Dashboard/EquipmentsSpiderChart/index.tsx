import {
    CardBody,
    CardHeader,
    Flex,
    Text,
    useColorMode
} from '@chakra-ui/react';
import { useMemo, Suspense } from 'react';
import MyCard from '../../../Components/micro/Card';
import { SmallFill } from '../../../Components/Loaders';
import Chart from './Chart';
import NotFound from"../../../Components/micro/NotFound";

interface equipmentHour {
    hour: string;
    equipment: string;
    value: number;
}
interface props {
    equipments: equipmentHour[],
    notFound?: boolean
}
const EquipmentsSpiderChart = ({
    equipments,
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
    const isLoading = useMemo<boolean>(() => equipments.length === 0, [equipments]);

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
                fontWeight={500}>Equipments Performance</Text>
        </CardHeader>
        <CardBody minH={"25vh"}>
            {notFound ? <Suspense fallback={<SmallFill />}><NotFound /></Suspense> :
                isLoading ? <SmallFill /> : <Chart equipments={equipments} />}
        </CardBody>
    </MyCard>
}

export default EquipmentsSpiderChart;