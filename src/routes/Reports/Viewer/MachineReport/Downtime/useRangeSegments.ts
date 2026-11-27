import { useEffect, useState } from "react";
import { datesBetween, loadRangeSegments, MAX_DAYS } from "./loadDaySegments";
import { DowntimeSegment, ShiftKey } from "./types";

/**
 * For date range reports: finds the idle / off stretches of every day in the
 * range so they can be categorized too. Only runs when `enabled`.
 */
const useRangeSegments = (
  enabled: boolean,
  machineId: string,
  fromDate: string | null,
  toDate: string | null,
  allowedShifts: ShiftKey[],
) => {
  const [segments, setSegments] = useState<DowntimeSegment[]>([]);
  const [loading, setLoading] = useState(false);
  const shiftsKey = allowedShifts.join(",");
  const tooLong = !!(fromDate && toDate && datesBetween(fromDate, toDate).length > MAX_DAYS);

  useEffect(() => {
    let cancelled = false;
    if (!enabled || !machineId || !fromDate || !toDate || tooLong || !shiftsKey) {
      setSegments([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    loadRangeSegments(machineId, fromDate, toDate, shiftsKey.split(",") as ShiftKey[])
      .then((result) => {
        if (!cancelled) setSegments(result);
      })
      .catch((err) => {
        console.error("Failed to load downtime for date range", err);
        if (!cancelled) setSegments([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [enabled, machineId, fromDate, toDate, shiftsKey, tooLong]);

  return { segments, loading, tooLong };
};

export default useRangeSegments;
