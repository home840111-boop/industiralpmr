import { CardHeader, GridItem, SimpleGrid, Text, useColorMode } from "@chakra-ui/react";
import { useMemo } from "react";
import { EquipmentHours as EQ } from "../..";
import MyCard from "../../../../../../Components/micro/Card";
import HourlyGraph from "./HourlyGraph";
import SpiderChart from "./SpiderChart";

const EquipmentHours = ({
    hours,
    isSingleDay
}: {
    hours: EQ[],
    isSingleDay: boolean
}) => {
    const { colorMode } = useColorMode();
    const { border } = useMemo(() => ({
        border: `${colorMode}.border`
    }), [colorMode]);

    return <MyCard p={0}>
        <CardHeader borderBottom={"1px solid"} borderColor={border} display="flex" alignItems="center" justifyContent={"space-between"} px={2} pb={1} pt={3}>
            <Text fontWeight={500} fontSize="lg">{isSingleDay ? "Equipment Hours" : "Equipment Days"}</Text>
        </CardHeader>
        <SimpleGrid columns={{
            base: 1,
            md: 5
        }}>
            <SpiderChart hours={hours} />
            <GridItem colSpan={{
                base: 1,
                md: 3
            }}>
                <HourlyGraph hours={hours} />
            </GridItem>
        </SimpleGrid>
    </MyCard>
}

export default EquipmentHours