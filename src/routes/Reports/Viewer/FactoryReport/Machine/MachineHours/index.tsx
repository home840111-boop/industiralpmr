import { CardHeader, GridItem, SimpleGrid, Text, useColorMode } from "@chakra-ui/react";
import { useEffect, useMemo, useState } from "react";
import { MachineHours as MH } from "../..";
import MyCard from "../../../../../../Components/micro/Card";
import ShowSelector from "../../../../../../Components/micro/ShowSelector";
import { factoryProductionAtom } from "../../../../../../Components/Store/atoms";
import Get from "../../../../../../Components/Store/hooks/Get";
import HourlyGraph from "./HourlyGraph";
import SpiderChart from "./SpiderChart";

type viewType = "shots" | "production" | "material" | "electricity" | "production_meters";
const MachineHours = ({
    hours,
    isSingleDay
}: {
    hours: MH[],
    isSingleDay: boolean
}) => {
    const { colorMode } = useColorMode();
    const { border } = useMemo(() => ({
        border: `${colorMode}.border`
    }), [colorMode]);
    const productionType = Get(factoryProductionAtom);
    const [view, _setView] = useState<viewType>("shots");

    const setView = (view: viewType) => {
        if (productionType === null) return;
        if (productionType === "meter" && view === "production") view = "production_meters";
        _setView(view);
    }

    useEffect(() => {
        if (productionType === null) return;
        if (productionType === "meter") _setView("production_meters");
    }, [productionType]);

    return <MyCard p={0}>
        <CardHeader borderBottom={"1px solid"} borderColor={border} display="flex" alignItems="center" justifyContent={"space-between"} px={2} pb={1} pt={3}>
            <Text fontWeight={500} fontSize="lg">{isSingleDay ? "Machine Hours" : "Machine Days"}</Text>
            <ShowSelector view={view === "production_meters" ? "production" : view} setView={setView} />
        </CardHeader>
        <SimpleGrid columns={{
            base: 1,
            md: 5
        }}>
            <SpiderChart view={view} hours={hours} />
            <GridItem colSpan={{
                base: 1,
                md: 3
            }}>
                <HourlyGraph view={view} hours={hours} />
            </GridItem>
        </SimpleGrid>
    </MyCard>
};

export type { viewType };
export default MachineHours;