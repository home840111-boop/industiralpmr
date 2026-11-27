import { Box } from "@chakra-ui/react"
import { useState } from "react";
import PowerDashboard from "./AntDesign/PowerDashboard";

// Legacy imports (kept for backward compatibility)
// import { useEffect, useState } from "react";
// import Get from "../../../../Components/Store/hooks/Get";
// import { dateAtom, offlineTimeAtom, shiftsAtom } from "../../../../Components/Store/atoms";
// import { get } from "../../../../Components/firebase/api/db";
// import { dbSchemaHourlyRecord, dbSchemaNow, dbSchemaRecord } from "./types";
// import Phase from "./Phase";
// import Sum from "./Sum";
// import Listen from "../../../../Components/Store/hooks/Listen";
// import dayjs from "../../../../Components/Functions/dayjs";
// import store from "../../../../Components/Store";
// import { useParams } from "react-router-dom";
// import { Stack } from "@chakra-ui/react";

const Power = () => {
    // const { machineID } = useParams()
    const [useNewDashboard] = useState(true);

    // Toggle to switch between old and new UI (for testing/migration)
    // Uncomment the line below and the button in the JSX to enable toggling
    // const [useNewDashboard, setUseNewDashboard] = useState(true);
    // const toggleDashboard = () => { setUseNewDashboard(prev => !prev); };

    if (useNewDashboard) {
        return (
            <Box>
                {/* Uncomment this toggle button during testing to switch between old/new UI */}
                {/* <HStack justify="flex-end" mb={4}>
                    <Button size="sm" onClick={toggleDashboard} colorScheme="gray">
                        Switch to {useNewDashboard ? "Legacy" : "New"} View
                    </Button>
                </HStack> */}
                <PowerDashboard />
            </Box>
        );
    } else return <></>

    // Legacy implementation (commented out - uncomment if needed)
    // const date = Listen(dateAtom);
    // const shifts = Get(shiftsAtom);
    // const [toggle, setToggle] = useState(false);
    // const [data, setData] = useState<null | {
    //     now: dbSchemaNow,
    //     daily: dbSchemaRecord | null,
    //     hourly: dbSchemaHourlyRecord
    // }>(null);

    // useEffect(() => {
    //     const interval = setInterval(() => {
    //         setToggle(prev => !prev);
    //     }, 30000);
    //     return () => clearInterval(interval);
    // }, []);

    // useEffect(() => {
    //     if (!machineID || !date) return;
    //     const func = async () => {
    //         const promises = [
    //             get(`machines/${machineID}/unit`),
    //             get(`reports/power/machines/${machineID}/now`),
    //             get(`reports/power/machines/${machineID}/daily/${date}`),
    //             get(`reports/power/machines/${machineID}/hourly/${date}`)
    //         ];
    //         const offlineTime = store.get(offlineTimeAtom);
    //         const [machineUnitSnap, nowSnap, dailySnap, hourlySnap] = await Promise.all(promises);
    //         const machineUnit = machineUnitSnap.val();
    //         const snap = await get(`units/${machineUnit || 1}`);
    //         const unit = snap.val() || {
    //             connected: false,
    //             realtime: false
    //         };
    //         const { lastContact } = unit;
    //         const diff = dayjs().diff(dayjs.unix(lastContact || 0), "minute");
    //         const connected = diff <= offlineTime;
    //         unit.connected = connected;
    //         const now = (nowSnap.val() || null) as dbSchemaNow | null;
    //         if (!now) return;
    //         now.isOnline = unit.connected ? !unit.realtime ? "RESTORING" : true : false;
    //         const daily = (dailySnap.val() || {}) as dbSchemaRecord;
    //         const hourly = (hourlySnap.val() || {}) as dbSchemaHourlyRecord;

    //         setData({
    //             now,
    //             daily,
    //             hourly
    //         });
    //     };
    //     func();
    // }, [toggle, date, machineID]);

    // return data === null ? <>Loading...</> : <Stack gap={3}>
    //     <Sum shiftStart={shifts?.A} isOnline={data.now.isOnline} updated={data.now.updated} now={data.now.SUM} data={data.daily?.SUM} hourly={data.hourly} />
    //     <Phase shiftStart={shifts?.A} isOnline={data.now.isOnline} updated={data.now.updated} phase="R" now={data.now.R} data={data.daily?.R} hourly={data.hourly} />
    //     <Phase shiftStart={shifts?.A} isOnline={data.now.isOnline} updated={data.now.updated} phase="S" now={data.now.S} data={data.daily?.S} hourly={data.hourly} />
    //     <Phase shiftStart={shifts?.A} isOnline={data.now.isOnline} updated={data.now.updated} phase="T" now={data.now.T} data={data.daily?.T} hourly={data.hourly} />
    // </Stack>
}
export default Power