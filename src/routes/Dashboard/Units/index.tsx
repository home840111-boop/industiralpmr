import {
    CardBody,
    CardHeader,
    Flex,
    GridItem,
    Tag,
    Text,
    useColorMode
} from '@chakra-ui/react'
import MyTooltip from '../../../Components/micro/MyTooltip';
import { useMemo } from 'react';
import MyCard from '../../../Components/micro/Card';
import Map from './Map';
import Table from "../../../Components/micro/Table";
import dayjs from "../../../Components/Functions/dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import minifiedSecFormatter from '../../../Components/Functions/formatters/minifiedSecFormatter';
import { buildUnitTableCell } from '../../../Components/micro/UnitDisplay';
import { setCachedUnitMac } from '../../../Services/telemetry/useUnitMac';
dayjs.extend(relativeTime);

const Units = ({
    units,
}: {
    units: {
        [key: string]: any
    },
    notFound?: boolean
}) => {
    const { colorMode } = useColorMode();
    const { border, subText } = useMemo(() => {
        return {
            border: `${colorMode}.border`,
            subText: `${colorMode}.subText`
        }
    }, [colorMode]);
    const isLoading = useMemo<boolean>(() => Object.keys(units).length === 0, [units]);
    const [rows, offs, offlines, connecteds] = useMemo(() => {
        let offs = 0;
        let offlines = 0;
        let connecteds = 0;
        const rows = Object.entries(units).map(([unit, data]) => {
            const { connected, cleanDisconnect, last_seen, realtime, uploadRemaining, uploadedTil } = data || {};
            const mac =
                typeof data?.mac === "string" && data.mac.trim()
                    ? data.mac.trim()
                    : typeof data?.device?.mac === "string" && data.device.mac.trim()
                        ? data.device.mac.trim()
                        : null;
            if (mac) {
                setCachedUnitMac(unit, mac);
            }
            const status = connected ? realtime ? "CONNECTED" : "RESTORING" : cleanDisconnect ? "OFF" : "DISCONNECTED";
            if (status === "OFF") offs++;
            if (status === "DISCONNECTED") offlines++;
            if (status === "CONNECTED") connecteds++;
            const at = dayjs.unix(last_seen || 0);
            const exact = at.format("DD-MM-YYYY HH:mm:ss");
            const since = at.fromNow(true);
            const isUpToDate = (() => {
                if (uploadedTil === undefined) return "Up To Date";
                const uploadedTilDate = dayjs(uploadedTil);
                const now = dayjs();
                // how far behind the data is
                const diff = now.diff(uploadedTilDate, "second");
                return minifiedSecFormatter(diff) + " behind";
            })();
            return [
                buildUnitTableCell("UNIT#" + String(unit).padStart(2, "0"), mac),
                {
                    element: MyTooltip,
                    props: {
                        label: status === "CONNECTED" ? "Up to date" : status === "RESTORING" ? `Restoring previous data, ${uploadRemaining?.toFixed(2) || 0}% completed (${isUpToDate})` : status === "OFF" ? `Powered off since: ${since}(${exact})` : `Connection lost since: ${since}(${exact})`,
                    },
                    children: {
                        element: Tag,
                        props: {
                            // stick to right
                            position: "relative",
                            right: 0,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            w: "60%",
                            minW: "fit-content",
                            size: "md",
                            colorScheme:
                                status === "CONNECTED" || status === "RESTORING"
                                    ? "green"
                                    : status === "DISCONNECTED"
                                        ? "red"
                                        : status === "OFF"
                                            ? "yellow"
                                            : "gray",
                        },
                        children: status,
                    }
                }
            ]
        });
        return [rows, offs, offlines, connecteds];
    }, [units]);

    const heading = [
        "Unit",
        "Status"
    ]

    return <MyCard
        noPadding>
        <CardHeader
            py={4}
            borderBottom="1px solid"
            borderColor={border}>
            <Text
                fontSize="md"
                fontWeight={500}>Live Units Status</Text>
        </CardHeader>
        <CardBody
            p="0"
            as={Flex}
            flexDir="column"
            justifyContent="space-between"
            h="100%">
            <GridItem>
                <Map units={units} isLoading={isLoading} />
            </GridItem>
            <Flex
                justifyContent={"space-between"}
                alignItems={"center"}
                pt={3}
                px={5}>
                <Text
                    textAlign={"center"}
                    fontWeight={"medium"}
                    textTransform={"uppercase"}
                    color={subText}
                    fontSize={"md"}>
                    ON: <Text
                        textTransform={"lowercase"}
                        as={"span"}
                        ml={2}
                        fontWeight={"bold"}
                        color="green.500">
                        {connecteds}
                    </Text>
                </Text>
                <Text
                    textAlign={"center"}
                    fontWeight={"medium"}
                    textTransform={"uppercase"}
                    color={subText}
                    fontSize={"md"}>
                    OFF: <Text
                        color="yellow.500"
                        textTransform={"lowercase"}
                        as={"span"}
                        ml={2}
                        fontWeight={"bold"}>
                        {offs}
                    </Text>
                </Text>
                <Text
                    textAlign={"center"}
                    fontWeight={"medium"}
                    textTransform={"uppercase"}
                    color={subText}
                    fontSize={"md"}>
                    OFFLINE: <Text
                        textTransform={"lowercase"}
                        as={"span"}
                        ml={2}
                        fontWeight={"bold"}
                        color="red.500">
                        {offlines}
                    </Text>
                </Text>
            </Flex>
            <GridItem
                overflow={"auto"}
                h={"230px"}>
                <Table
                    fixHeader
                    rows={rows}
                    headings={heading} />
            </GridItem>
        </CardBody>
    </MyCard>
}

export default Units