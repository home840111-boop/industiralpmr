import { Badge, Box, Center, Text, useColorMode, VStack } from "@chakra-ui/react";
import { DataToSet } from "..";
import { useMemo } from "react";
import { pulse } from "../../../Machines/Machine/MachineDetails";
import NumberFormatter from "../../../../Components/micro/NumberFormatter";
import MinifiedNumberFormatter from "../../../../Components/micro/MinifiedNumberFormatter";
import minifiedSecFormatter from "../../../../Components/Functions/formatters/minifiedSecFormatter";
import { RadialBar, RadialBarConfig } from "@ant-design/plots";
import { viewAll } from "../../../Reports/Viewer/FactoryReport/Machine/MachineBreakdown/PieChart";
import IsScreenSmall from "../../../../Components/Store/hooks/IsScreenSmall";

const InnerLabel = ({
    data,
    isSmall
}: {
    data: DataToSet["progress"],
    isSmall?: boolean
}) => {
    const { colorMode } = useColorMode();
    const { subText } = useMemo(() => ({
        subText: `${colorMode}.subText`,
    }), [colorMode]);

    const isTargetMet = data.total > 0 && data.current >= data.total;

    return <VStack pos="absolute" textAlign={"center"} spacing={0.5}>
        <Text fontSize={isSmall ? "2xs" : "xs"} fontWeight={600} lineHeight={1.1}>
            {/* shouldve made */}
            <MinifiedNumberFormatter number={data.shouldbe} />
            <Text color={subText} textTransform="uppercase" fontSize={isSmall ? "3xs" : "2xs"}>pc(s) expected</Text>
        </Text>
        <Text fontSize={isSmall ? "sm" : "2xl"} fontWeight={700} lineHeight={1.1} color={isTargetMet ? "green.400" : undefined}>
            <NumberFormatter number={data.current} />
            <Text color={subText} textTransform="uppercase" fontSize={isSmall ? "3xs" : "2xs"}>pc(s) of <span style={{
                fontWeight: 700
            }}><MinifiedNumberFormatter number={data.total} suffix="pc(s)" /></span></Text>
        </Text>
        {isTargetMet ? (
            <Badge colorScheme="green" variant="solid" fontSize="3xs" px={1.5} py={0.2} borderRadius="sm">
                Target Met
            </Badge>
        ) : data.total > 0 ? (
            <Badge
                colorScheme={data.track >= 0 ? "green" : data.track < -1800 ? "red" : "orange"}
                variant="subtle"
                fontSize="3xs"
                px={1.5}
                py={0.2}
                borderRadius="sm"
            >
                {data.track >= 0
                    ? "● On Track"
                    : `▲ Behind (${minifiedSecFormatter(Math.abs(data.track))})`}
            </Badge>
        ) : null}
    </VStack>
}

const ProgressSection = ({
    data,
    status
}: {
    data: DataToSet["progress"],
    status: DataToSet["status"]
}) => {
    const isBelow1400 = IsScreenSmall(1400);

    const config: RadialBarConfig = {
        data: [{
            name: "Actual",
            count: data.current
        }, {
            name: "Should be",
            count: data.shouldbe
        }, {
            name: "Target",
            count: data.total
        }],
        animation: false,
        height: isBelow1400 ? 210 : 250,
        xField: 'name',
        yField: 'count',
        maxAngle: 300,
        radius: 0.85,
        innerRadius: 0.65,
        tooltip: {
            formatter: (datum) => {
                return {
                    name: datum.name === "Actual" ? "Actual pc(s)" : datum.name === "Target" ? "Target pc(s)" : "Should be pc(s)",
                    value: viewAll(datum.count, "production"),
                };
            },
        },
        colorField: 'name',
        color: ({ name }) => {
            if (name === "Actual") {
                return data.track > 0 ? "#0d9f8b" : data.track < -1800 ? "#e95e44" : "#FDD36A"
            } else if (name === "Should be") {
                return "#FDD36A40";
            } return status ? "#0d9f8b" : "#e95e44";
        },
        barStyle: {
            lineCap: 'round',
        },
    };

    return (
        <VStack w="100%" spacing={1} alignItems="center">
            <Text
                textAlign="center"
                fontSize="xs"
                textTransform="uppercase"
                opacity={0.8}
                mb={1}
                fontWeight={700}
            >
                Target Progress
            </Text>
            <Center pos="relative">
                <Box
                    position={"absolute"}
                    animation={status.status === "ON" ? `${pulse} 2s infinite` : undefined}
                    w={isBelow1400 ? "200px" : "230px"}
                    h={isBelow1400 ? "200px" : "230px"}
                    borderRadius={"full"}
                />
                <RadialBar {...config} />
                <InnerLabel data={data} isSmall={isBelow1400} />
            </Center>
        </VStack>
    );
};

export { InnerLabel };
export default ProgressSection;