import { useCallback, useEffect, useState } from "react";
import { fetchDowntimeReasons } from "./api";
import { DowntimeReasonEntry, entryId } from "./types";

/**
 * Loads the saved downtime reasons for the given machines and date range
 * (read only) and keeps them in state so the report can react to edits.
 */
const useDowntimeReasons = (
  machineIds: string[],
  fromDate: string | null,
  toDate: string | null,
) => {
  const [entries, setEntries] = useState<DowntimeReasonEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const idsKey = machineIds.join(",");

  useEffect(() => {
    let cancelled = false;
    if (!idsKey || !fromDate || !toDate) {
      setEntries([]);
      return;
    }
    setLoading(true);
    fetchDowntimeReasons(idsKey.split(","), fromDate, toDate)
      .then((result) => {
        if (!cancelled) setEntries(result);
      })
      .catch((err) => {
        // reasons are optional extras: never break the report because of them
        console.error("Failed to load downtime reasons", err);
        if (!cancelled) setEntries([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [idsKey, fromDate, toDate]);

  const upsert = useCallback((entry: DowntimeReasonEntry) => {
    setEntries((prev) => {
      const id = entryId(entry.machineId, entry.date, entry.key);
      const index = prev.findIndex(
        (e) => entryId(e.machineId, e.date, e.key) === id,
      );
      if (index === -1) return [...prev, entry];
      const next = [...prev];
      next[index] = entry;
      return next;
    });
  }, []);

  return { entries, loading, upsert };
};

export default useDowntimeReasons;
