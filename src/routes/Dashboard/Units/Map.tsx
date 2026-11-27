import { Pie } from '@ant-design/plots';
import { Center, useBreakpointValue, useColorModeValue } from '@chakra-ui/react';
import dayjs from '../../../Components/Functions/dayjs';
import { useEffect, useMemo, useState } from 'react';
import minifiedSecFormatter from '../../../Components/Functions/formatters/minifiedSecFormatter';
import { SmallFill } from '../../../Components/Loaders';

const Map = ({
    units,
    isLoading
}: {
    units: {
        [key: string]: any
    };
    isLoading: boolean;
}) => {
    const [animation, setAnimation] = useState(true);
    useEffect(() => {
        const timeout = setTimeout(() => {
            setAnimation(false);
        }, 5000);

        return () => {
            clearTimeout(timeout);
        }
    }, []);
    const { radius } = useBreakpointValue({
        base: { radius: 0.5 },
        lg: { radius: 0.9 }
    }) || {}
    const { textColor } = useColorModeValue(
        { textColor: "#4A5568" },
        { textColor: "RGBA(255, 255, 255, 0.60)" }
    ) || {};
    const [labels, colors, connected, total] = useMemo(() => {
        let total = 0;
        let connected = 0;
        const labels = Object.keys(units).map(unit => {
            const { connected: isConnected, cleanDisconnect, realtime } = units[unit];
            if (isConnected) connected++;
            const offline = !isConnected && !cleanDisconnect;
            total++;
            return {
                unit: unit.toString(),
                value: 1,
                connected: isConnected,
                offline,
                realtime
            }
        });
        labels.sort((a, b) => {
            // each has three childs, connected, offline, realtime
            // sort by first connected true and realtime also true, then connected true and realtime false, then connected false and offline false, then connected false and offline true
            if (a.connected && b.connected) {
                if (a.realtime && b.realtime) return 0;
                if (a.realtime && !b.realtime) return -1;
                if (!a.realtime && b.realtime) return 1;
                return 0;
            }
            if (a.connected && !b.connected) return -1;
            if (!a.connected && b.connected) return 1;
            if (!a.connected && !b.connected) {
                if (!a.offline && !b.offline) return 0;
                if (!a.offline && b.offline) return -1;
                if (a.offline && !b.offline) return 1;
                return 0;
            }
            return 0;
        });
        const colors = labels.map((label) => {
            const { connected, offline, realtime } = label;
            return connected ? realtime ? "#ED8936" : "#ed8936b3" : offline ? "#CCCCCC30" : "#FEEBC8";
        });
        return [labels, colors, connected, total];
    }, [units]);

    const config = {
        color: colors,
        appendPadding: 0,
        data: labels,
        angleField: 'value',
        colorField: 'unit',
        radius: radius,
        innerRadius: 0.75,
        pieStyle: {
            lineWidth: 0,
        },
        state: {
            active: {
                style: {
                    lineWidth: 1,
                    stroke: textColor
                },
            },
        },
        interactions: [
            {
                type: 'element-selected',
            },
            {
                type: 'element-active',
            },
        ],
        tooltip: {
            showTitle: false,
            showMarkers: false,
            fields: ['unit', 'value'],
            formatter: (datum: any) => {
                const unitObj = units[datum.unit] || {};
                const mac = typeof unitObj.mac === "string" && unitObj.mac.trim()
                    ? unitObj.mac.trim()
                    : typeof unitObj.device?.mac === "string" && unitObj.device.mac.trim()
                        ? unitObj.device.mac.trim()
                        : null;
                return {
                    name: `UNIT#${datum.unit.padStart(2, '0')}${mac ? ` • MAC: ${mac}` : ''}`,
                    value: units[datum.unit].connected ? units[datum.unit].realtime ? 'Connected' : `Restoring (${(units[datum.unit].uploadRemaining || 0).toFixed(0)}%) - ${(() => {
                        if (units[datum.unit]?.uploadedTil === undefined) return "Up to date";
                        const uploadedTilDate = dayjs(units[datum.unit]?.uploadedTil);
                        const now = dayjs();
                        // how far behind the data is
                        const diff = now.diff(uploadedTilDate, "second");
                        return minifiedSecFormatter(diff) + " behind";
                    })()}` : units[datum.unit].cleanDisconnect ? 'Off' : "Disconnected",
                }
            }
        },
        statistic: {
            title: {
                style: {
                    fontSize: '12px',
                    color: textColor,
                    offset: "50%"
                },
                content: 'connected',
            },
            content: {
                style: {
                    whiteSpace: 'pre-wrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    fontSize: '12px',
                    color: textColor
                },
                content: `${connected} / ${total}`,
            },
        },
    };

    return <Center
        h={{
            base: "100%",
            lg: "180px"
        }}
        p="10">
        {isLoading ? <SmallFill /> : <Pie
            animation={animation}
            label={false}
            legend={false}
            {...config} />}
    </Center>
}

export default Map