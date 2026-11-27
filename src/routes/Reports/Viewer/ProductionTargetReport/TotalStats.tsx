import { Badge, Box, Button, CardHeader, Flex, GridItem, HStack, Progress, SimpleGrid, Text, useColorMode } from "@chakra-ui/react";
import { useMemo } from "react";
import { FaBoxes, FaBoxOpen } from "react-icons/fa";
import { FiDownload } from "react-icons/fi";
import { DataToSet } from ".";
import MyCard from "../../../../Components/micro/Card";
import MinifiedNumberFormatter from "../../../../Components/micro/MinifiedNumberFormatter";
import NumberFormatter from "../../../../Components/micro/NumberFormatter";
import { TimingBlock } from "../MachineReport/MachineTotal/Total";
import StatsBlock from "../StatsBlock";
import Table from "../../../../Components/micro/Table";
import dayjs from "../../../../Components/Functions/dayjs";
import numberFormatter from "../../../../Components/Functions/formatters/numberFormatter";
import secFormatter from "../../../../Components/Functions/formatters/secFormatter";
import downloadCSV from "../../../../Components/Exporters/csvDownload";
import { Duration, Time } from "../../../Targets/Target/Downtime";

const headings = [
    "Time",
    "Act Prod",
    "Exp Prod",
    "Ontime",
    "Downtime",
    "Reason",
    "Efficiency"
];

const ReasonCell = ({ reason, isPlanned, hasDowntime }: { reason?: string; isPlanned?: boolean; hasDowntime?: boolean }) => {
    if (!reason || reason === "-") {
        return <Text fontSize="xs" color="gray.500">{hasDowntime ? "UNCATEGORIZED" : "-"}</Text>;
    }
    const isUncat = reason.toLowerCase().includes("uncategorized");
    return (
        <HStack spacing={1.5} py={1}>
            <Text
                fontSize="xs"
                fontWeight={600}
                color={isUncat ? "red.400" : (isPlanned ? "primary" : undefined)}
                textTransform="uppercase"
            >
                {reason}
            </Text>
            {isPlanned && (
                <Badge colorScheme="blue" variant="subtle" fontSize="3xs" px={1} borderRadius="sm">
                    Planned
                </Badge>
            )}
        </HStack>
    );
};

const TotalStats = ({
    data
}: {
    data: DataToSet
}) => {
    const { colorMode } = useColorMode();
    const { border } = useMemo(() => ({
        border: `${colorMode}.border`
    }), [colorMode]);

    const rows = useMemo(() => {
        const myRows = [];
        for (const hour of data.hourly) {
            const time = hour.datetime;
            const parsed = dayjs(time);
            const unixTime = parsed.isValid() ? parsed.unix() : 0;
            const totalDuration = (hour.ontime || 0) + (hour.downtime || 0);
            const efficiency = totalDuration > 0 ? Math.round(((hour.ontime || 0) / totalDuration) * 100) : 0;
            myRows.push([
                {
                    element: Time,
                    props: {
                        unix: unixTime
                    }
                },
                {
                    element: NumberFormatter,
                    props: {
                        number: hour.production || 0,
                        color: hour.targetProduction && hour.targetProduction > hour.production ? "red" : "green",
                        fontWeight: 500,
                        suffix: "pc(s)"
                    }
                },
                {
                    element: NumberFormatter,
                    props: {
                        number: hour.targetProduction || 0,
                        suffix: "pc(s)"
                    }
                },
                {
                    element: Duration,
                    props: {
                        duration: hour.ontime || 0
                    }
                },
                {
                    element: Duration,
                    props: {
                        duration: hour.downtime || 0
                    }
                },
                {
                    element: ReasonCell,
                    props: {
                        reason: hour.downtimeCategory || hour.downtimeReason,
                        isPlanned: hour.isPlanned,
                        hasDowntime: (hour.downtime || 0) > 0
                    }
                },
                {
                    element: Text,
                    props: {
                        py: 2,
                        fontSize: "md",
                        fontWeight: 500
                    },
                    children: `${hour.efficiency !== undefined ? hour.efficiency : efficiency}%`
                }
            ]);
        }
        return myRows;
    }, [data]);

    const handleDownloadCSV = () => {
        const csvRows = data.hourly.map((hour) => {
            const parsed = dayjs(hour.datetime);
            const totalDuration = (hour.ontime || 0) + (hour.downtime || 0);
            const efficiency = totalDuration > 0 ? Math.round(((hour.ontime || 0) / totalDuration) * 100) : 0;

            return [
                parsed.isValid() ? parsed.format("YYYY-MM-DD hh:mm A") : "NA",
                numberFormatter(hour.production || 0, "pc(s)"),
                numberFormatter(hour.targetProduction || 0, "pc(s)"),
                secFormatter(hour.ontime || 0),
                secFormatter(hour.downtime || 0),
                hour.downtimeReason || ((hour.downtime || 0) > 0 ? "UNCATEGORIZED" : "-"),
                `${hour.efficiency !== undefined ? hour.efficiency : efficiency}%`,
            ];
        });

        downloadCSV("target-stats.csv", headings, csvRows);
    };

    return <MyCard p={0}>
        <CardHeader borderBottom={"1px solid"} borderColor={border} display="flex" alignItems="center" justifyContent={"space-between"} px={2} pb={1} pt={3}>
            <Text fontWeight={500} fontSize="lg">Target Stats</Text>
            <Button
                size="sm"
                variant="outline"
                colorScheme="orange"
                leftIcon={<FiDownload />}
                onClick={handleDownloadCSV}
                isDisabled={data.hourly.length === 0}
            >
                CSV
            </Button>
        </CardHeader>
        <SimpleGrid
            h="100%"
            columns={{
                base: 1,
                lg: 2,
            }}>
            <SimpleGrid
                h="100%"
                columns={{
                    base: 1,
                    lg: 3,
                }}>
                <GridItem
                    h="100%"
                    colSpan={{
                        base: 1,
                        lg: 3
                    }}>
                    <Box
                        h="100%"
                        borderY="1px dashed"
                        display="flex"
                        alignItems="center"
                        justifyContent={"center"}
                        borderColor={border}>
                        <Text my={1} textAlign={"center"} fontSize="xs" fontWeight={600} opacity={0.8} textTransform="uppercase">production target</Text>
                    </Box>
                </GridItem>
                <GridItem colSpan={{
                    base: 1,
                    lg: 2
                }}>
                    <StatsBlock icon={FaBoxOpen} title="Achieved" value={<NumberFormatter number={data.target.completed} />} />
                </GridItem>
                <StatsBlock icon={FaBoxes} title="Set" value={<MinifiedNumberFormatter number={data.target.total} />} />
                <GridItem colSpan={{
                    base: 1,
                    lg: 3
                }}>
                    <SimpleGrid
                        h="100%"
                        columns={{
                            base: 1,
                            lg: 2,
                        }}>
                        <TimingBlock minified title={"ON Time"} value={data.stats.ontime} total={data.stats.ontime + data.stats.downtime} />
                        <TimingBlock minified title={"DOWN Time"} value={data.stats.downtime} total={data.stats.ontime + data.stats.downtime} />
                        <GridItem
                            borderTop="1px dashed"
                            borderColor={border}
                            colSpan={{
                                base: 1,
                                lg: 2
                            }}
                            w="100%"
                            as={Flex}
                            alignItems={"center"}
                            justifyContent={"space-around"}
                            py={3}
                            px={2}>
                            <Text fontSize="xs" fontWeight={500}>Efficiency:</Text>
                            <Progress
                                borderRightRadius={"full"}
                                w="60%"
                                colorScheme={
                                    data.stats.efficiency >= 75 ? "green" :
                                        data.stats.efficiency >= 50 ? "orange" :
                                            "red"
                                } h="10px" value={data.stats.efficiency} />
                            <Text fontSize="sm" fontWeight={600}>{data.stats.efficiency.toFixed(0)}%</Text>
                        </GridItem>
                    </SimpleGrid>
                </GridItem>
            </SimpleGrid>
            <Box p={0}>
                <Table
                    legacy={false}
                    headings={headings}
                    rows={rows}
                />
            </Box>
        </SimpleGrid>
    </MyCard>
}

export default TotalStats