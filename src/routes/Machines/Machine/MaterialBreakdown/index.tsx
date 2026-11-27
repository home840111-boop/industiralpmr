import { CardBody, CardHeader, Center, Text, useColorMode } from "@chakra-ui/react";
import { Suspense, useMemo } from "react";
import { SmallFill } from "../../../../Components/Loaders";
import MyCard from "../../../../Components/micro/Card";
import NotFound from "../../../../Components/micro/NotFound";
import { MaterialBreakdown as MaterialBreakdownType } from "../types";
import Chart from "./Chart";

const MaterialBreakdown = ({
    notFound,
    materialBreakdown
}: {
    notFound: boolean;
    materialBreakdown?: MaterialBreakdownType;
}) => {
    const isLoading = materialBreakdown === undefined || Object.keys(materialBreakdown).length === 0;
    const { colorMode } = useColorMode();
    const { border } = useMemo(() => {
        return {
            border: `${colorMode}.border`,
        }
    }, [colorMode]);

    return <MyCard
        w="100%"
        h="100%"
        noPadding>
        <CardHeader
            display={"flex"}
            justifyContent={"space-between"}
            alignItems={"center"}
            py={4}
            borderBottom="1px solid"
            borderColor={border}>
            <Text
                fontSize="md"
                fontWeight={500}>Material Breakdown</Text>
        </CardHeader>
        <CardBody h="100%" p={0}>
            {
                notFound ? <Suspense fallback={<SmallFill />}>
                    <NotFound />
                </Suspense> : isLoading ? <SmallFill /> : <Center>
                    <Chart breakdown={materialBreakdown} />
                </Center>
            }
        </CardBody>
    </MyCard>

}

export default MaterialBreakdown