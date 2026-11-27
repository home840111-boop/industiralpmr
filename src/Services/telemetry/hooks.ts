import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { auth } from "../../Components/firebase";
import { listen, get } from "../../Components/firebase/api/db";
import store from "../../Components/Store";
import { offlineTimeAtom, uidAtom } from "../../Components/Store/atoms";
import Get from "../../Components/Store/hooks/Get";
import dayjs from "../../Components/Functions/dayjs";

// REST endpoint for telemetry subscription
const restServerUrl = process.env.NODE_ENV === "development"
  ? "http://localhost:5000"
  : "https://rest-middleware-01.industrialpmr.com";
const TELEMETRY_SUB_URL = `${restServerUrl}/telemetry_sub`;
const KEEP_ALIVE_INTERVAL_MS = 15000; // 15 seconds

export interface TelemetryPayload {
  action: "REALTIME_VALUES";
  data: {
    I_R?: number;
    V_RN?: number;
    SUM_W?: number;
    timestamp?: number;
    using_external_rtc?: boolean;
    [key: string]: any;
  };
}

/**
 * Hook to get formatted timestamp string
 */
export const useFormattedTimestamp = (
  date: Date | null | undefined,
): string => {
  const [formatted, setFormatted] = useState<string>("--");

  useEffect(() => {
    if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
      setFormatted("--");
      return;
    }

    try {
      const dayjsDate = dayjs(date).tz("Asia/Karachi");
      const timeString = dayjsDate.format("hh:mm:ss A");
      const dateString = dayjsDate.format("MMM D, YYYY");

      setFormatted(`${timeString} ${dateString}`);
    } catch {
      setFormatted("--");
    }
  }, [date]);

  return formatted;
};

/**
 * Hook to handle telemetry connection via REST and Firebase RTDB.
 * Maintains the exact interface of the previous MQTT telemetry hook.
 */
export const useDeviceTelemetry = (
  macAddress: string | null,
  machineIDFromProp?: string | null,
) => {
  const { machineID: machineIDFromParams } = useParams<{ machineID: string }>();
  const machineID = machineIDFromProp || machineIDFromParams || "plastisol_imm04";

  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [telemetryValues, setTelemetryValues] = useState<any | null>(null);
  const [timestamp, setTimestamp] = useState<Date | null>(null);
  const [isRtcSynced, setIsRtcSynced] = useState(false);
  const [rtcStatus, setRtcStatus] = useState<"SYNCED" | "OUT_OF_SYNC" | "UNKNOWN">("UNKNOWN");
  const [error, setError] = useState<Error | null>(null);
  const [connectionProgress, setConnectionProgress] = useState(0);
  const [, setTicker] = useState(0);

  const formattedTimestamp = useFormattedTimestamp(timestamp);

  const activeUid = Get(uidAtom) || auth.currentUser?.uid;
  const [unitNo, setUnitNo] = useState<number | null>(null);
  const [unitData, setUnitData] = useState<{ lastContact?: number; realtime?: boolean } | null>(null);

  // Fetch unit number
  useEffect(() => {
    if (!machineID) return;
    let isMounted = true;

    const fetchUnitNo = async () => {
      try {
        const snap = await get(`machines/${machineID}/unit`);
        if (isMounted) {
          setUnitNo(snap.val() || 1);
        }
      } catch (err) {
        console.error("Error fetching unit number:", err);
        if (isMounted) {
          setUnitNo(1); // fallback to unit 1
        }
      }
    };

    fetchUnitNo();

    return () => {
      isMounted = false;
    };
  }, [machineID]);

  // Listen to unit details (realtime and lastContact)
  useEffect(() => {
    if (unitNo === null || !activeUid) return;
    let isMounted = true;
    const unitPath = `/users/${activeUid}/units/${unitNo}`;

    const unsubscribe = listen(unitPath, (snapshot) => {
      if (!isMounted) return;
      const uVal = snapshot.val();
      if (uVal) {
        setUnitData({
          lastContact: uVal.lastContact,
          realtime: uVal.realtime,
        });
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [unitNo, activeUid]);

  // Set up ticker to force re-render every 5 seconds, updating isLiveActive age check
  useEffect(() => {
    const interval = setInterval(() => {
      setTicker((t) => t + 1);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // REST Subscription keep-alive effect
  useEffect(() => {
    if (!macAddress) {
      setIsConnected(false);
      setIsConnecting(false);
      setConnectionProgress(0);
      return;
    }

    let isMounted = true;
    let keepAliveInterval: NodeJS.Timeout | null = null;

    const sendTelemetrySub = async () => {
      try {
        const response = await fetch(TELEMETRY_SUB_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ mac: macAddress }),
        });

        if (!response.ok) {
          throw new Error(`REST server returned status ${response.status}`);
        }

        if (isMounted) {
          setIsConnected(true);
          setIsConnecting(false);
          setConnectionProgress(100);
          setError(null);
        }
      } catch (err: any) {
        console.error("Telemetry subscription request failed:", err);
        if (isMounted) {
          setError(err instanceof Error ? err : new Error(String(err)));
          setIsConnecting(false);
          setConnectionProgress(0);
        }
      }
    };

    const startStream = async () => {
      if (isMounted) {
        setIsConnecting(true);
        setConnectionProgress(20);
      }
      
      // Make initial subscription request
      await sendTelemetrySub();

      // Start the periodic keep-alive interval
      keepAliveInterval = setInterval(sendTelemetrySub, KEEP_ALIVE_INTERVAL_MS);
    };

    startStream();

    return () => {
      isMounted = false;
      if (keepAliveInterval) {
        clearInterval(keepAliveInterval);
      }
    };
  }, [macAddress]);

  // Firebase Realtime Database listener effect
  useEffect(() => {
    if (!activeUid || !machineID) {
      setTelemetryValues(null);
      setTimestamp(null);
      return;
    }

    let isMounted = true;
    const rtdbPath = `/users/${activeUid}/reports/machines/${machineID}/now`;

    const unsubscribe = listen(rtdbPath, (snapshot) => {
      if (!isMounted) return;

      const data = snapshot.val();
      if (!data) return;

      setTelemetryValues(data);

      // Parse timestamp (database timestamp is local time stored as UTC, so we subtract 5 hours to get actual UTC)
      const dataTimestamp = data.timestamp || data.updated;
      if (dataTimestamp) {
        const adjustedDate = new Date((dataTimestamp - 5 * 3600) * 1000);
        setTimestamp(adjustedDate);
      } else {
        setTimestamp(null);
      }

      // Parse RTC sync status
      const synced = data.using_external_rtc === true;
      setIsRtcSynced(synced);
      setRtcStatus(
        synced
          ? "SYNCED"
          : dataTimestamp
            ? "OUT_OF_SYNC"
            : "UNKNOWN"
      );
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [machineID, activeUid]);

  // Get offline time threshold from store
  const offlineTime = store.get(offlineTimeAtom) || 15; // default to 15 minutes

  // Determine if the device itself is connected (via lastContact)
  const lastContact = unitData?.lastContact || 0;
  const diffInMinutes = (Date.now() / 1000 - lastContact) / 60;
  const isDeviceConnected = lastContact > 0 && diffInMinutes <= offlineTime;

  // Determine if telemetry is active (packet timestamp in db is less than 60 seconds old)
  // Since database timestamp is local time stored as UTC, we subtract 5 hours to get actual UTC for comparison with client's actual UTC time
  const dataTimestamp = telemetryValues?.timestamp || telemetryValues?.updated;
  const utcDataTimestamp = dataTimestamp ? dataTimestamp - 5 * 3600 : null;
  const isTelemetryFresh = utcDataTimestamp !== null && (Date.now() / 1000 - utcDataTimestamp < 60);
  const isLiveActive: boolean | "RESTORING" = isDeviceConnected
    ? (isTelemetryFresh
        ? true
        : (unitData?.realtime === false ? "RESTORING" : true))
    : (isTelemetryFresh ? true : (isConnected && isTelemetryFresh));

  const reconnect = () => {
    if (!macAddress) return;
    setIsConnecting(true);
    setConnectionProgress(20);
    setError(null);
    fetch(TELEMETRY_SUB_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ mac: macAddress }),
    })
      .then((response) => {
        if (!response.ok) throw new Error(`Status ${response.status}`);
        setIsConnected(true);
        setIsConnecting(false);
        setConnectionProgress(100);
      })
      .catch((err) => {
        setError(err);
        setIsConnecting(false);
        setConnectionProgress(0);
      });
  };

  const deviceVersion = telemetryValues?.version !== undefined && telemetryValues?.version !== null
    ? String(telemetryValues.version)
    : null;

  return {
    isConnected: isConnected || isDeviceConnected || isTelemetryFresh,
    isConnecting: isDeviceConnected || isTelemetryFresh ? false : isConnecting,
    isLiveActive,
    telemetryValues,
    timestamp,
    formattedTimestamp,
    isRtcSynced,
    rtcStatus,
    error,
    isSubscribed: isConnected || isDeviceConnected || isTelemetryFresh,
    connectionProgress: isDeviceConnected || isTelemetryFresh ? 100 : connectionProgress,
    reconnect,
    deviceVersion,
  };
};
