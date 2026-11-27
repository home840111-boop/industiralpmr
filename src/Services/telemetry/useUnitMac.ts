import { useEffect, useState } from "react";
import { get } from "../../Components/firebase/api/db";

// In-memory cache for MAC addresses by unit
const macCache = new Map<string, string | null>();
const inFlightRequests = new Map<string, Promise<string | null>>();

/**
 * Normalizes a unit representation into a clean unit key.
 * e.g., "Unit#01" -> "1", "UNIT#02" -> "2", 1 -> "1", "plastisol_01" -> "plastisol_01"
 */
export const normalizeUnitKey = (
  unit: string | number | null | undefined,
): string | null => {
  if (unit === null || unit === undefined) return null;
  const str = String(unit).trim();
  if (!str) return null;

  // Match expressions like "Unit#01", "UNIT#1", "Unit 01", "UNIT# 01", "#01", or pure digits "1"
  const match = str.match(/^(?:unit\s*#?\s*|#\s*)?(\d+)$/i);
  if (match) {
    return String(parseInt(match[1], 10)); // e.g. "1"
  }
  return str;
};

/**
 * Manually set or update the cached MAC address for a given unit.
 */
export const setCachedUnitMac = (
  unit: string | number | null | undefined,
  mac: string | null | undefined,
) => {
  const normalized = normalizeUnitKey(unit);
  if (!normalized) return;

  const cleanMac = typeof mac === "string" && mac.trim() ? mac.trim() : null;

  macCache.set(normalized, cleanMac);
  macCache.set(String(unit), cleanMac);

  if (/^\d+$/.test(normalized)) {
    const padded = normalized.padStart(2, "0");
    macCache.set(padded, cleanMac);
    macCache.set(`Unit#${padded}`, cleanMac);
    macCache.set(`UNIT#${padded}`, cleanMac);
    macCache.set(`Unit#${normalized}`, cleanMac);
    macCache.set(`UNIT#${normalized}`, cleanMac);
  }
};

/**
 * Get the cached MAC address for a unit if already loaded.
 */
export const getCachedUnitMac = (
  unit: string | number | null | undefined,
): string | null | undefined => {
  const normalized = normalizeUnitKey(unit);
  if (!normalized) return undefined;

  if (macCache.has(normalized)) return macCache.get(normalized);
  if (macCache.has(String(unit))) return macCache.get(String(unit));

  if (/^\d+$/.test(normalized)) {
    const padded = normalized.padStart(2, "0");
    if (macCache.has(padded)) return macCache.get(padded);
    if (macCache.has(`Unit#${padded}`)) return macCache.get(`Unit#${padded}`);
    if (macCache.has(`UNIT#${padded}`)) return macCache.get(`UNIT#${padded}`);
  }

  return undefined;
};

/**
 * Fetch the MAC address for a unit from Firebase RTDB if not cached.
 */
export const fetchUnitMac = async (
  unit: string | number | null | undefined,
): Promise<string | null> => {
  const normalized = normalizeUnitKey(unit);
  if (!normalized) return null;

  const cached = getCachedUnitMac(normalized);
  if (cached !== undefined) return cached;

  if (inFlightRequests.has(normalized)) {
    return inFlightRequests.get(normalized)!;
  }

  const fetchPromise = (async (): Promise<string | null> => {
    try {
      // 1. Try units/${normalized}/mac directly
      const macSnap = await get(`units/${normalized}/mac`);
      if (macSnap.exists()) {
        const val = macSnap.val();
        if (typeof val === "string" && val.trim()) {
          const clean = val.trim();
          setCachedUnitMac(normalized, clean);
          return clean;
        }
      }

      // 2. Try units/${normalized}
      const unitSnap = await get(`units/${normalized}`);
      if (unitSnap.exists()) {
        const val = unitSnap.val();
        const mac =
          typeof val?.mac === "string" && val.mac.trim()
            ? val.mac.trim()
            : typeof val?.device?.mac === "string" && val.device.mac.trim()
              ? val.device.mac.trim()
              : null;
        if (mac) {
          setCachedUnitMac(normalized, mac);
          return mac;
        }
      }

      // 3. Fallback: try root units collection
      const allUnitsSnap = await get("units");
      if (allUnitsSnap.exists()) {
        const allUnits = allUnitsSnap.val();
        if (allUnits && typeof allUnits === "object") {
          // Warm cache with any units found
          Object.entries(allUnits).forEach(([uKey, uVal]: [string, any]) => {
            const uMac =
              typeof uVal?.mac === "string" && uVal.mac.trim()
                ? uVal.mac.trim()
                : typeof uVal?.device?.mac === "string" && uVal.device.mac.trim()
                  ? uVal.device.mac.trim()
                  : null;
            if (uMac) {
              setCachedUnitMac(uKey, uMac);
            }
          });

          // Check if root units object itself has a direct mac key
          if (typeof allUnits.mac === "string" && allUnits.mac.trim()) {
            const clean = allUnits.mac.trim();
            setCachedUnitMac(normalized, clean);
            return clean;
          }

          const targetUnit =
            allUnits[normalized] ||
            allUnits[String(normalized).padStart(2, "0")];
          const targetMac =
            typeof targetUnit?.mac === "string" && targetUnit.mac.trim()
              ? targetUnit.mac.trim()
              : typeof targetUnit?.device?.mac === "string" &&
                  targetUnit.device.mac.trim()
                ? targetUnit.device.mac.trim()
                : null;
          if (targetMac) {
            setCachedUnitMac(normalized, targetMac);
            return targetMac;
          }
        }
      }

      setCachedUnitMac(normalized, null);
      return null;
    } catch (err) {
      console.error(
        `[useUnitMac] Error fetching MAC address for unit ${normalized}:`,
        err,
      );
      return null;
    } finally {
      inFlightRequests.delete(normalized);
    }
  })();

  inFlightRequests.set(normalized, fetchPromise);
  return fetchPromise;
};

/**
 * Hook to retrieve the MAC address for a given unit.
 *
 * @param unit The unit identifier (number or string like "1", "Unit#01", etc.)
 * @param initialMac Optional pre-fetched MAC address to skip network lookup
 */
export const useUnitMac = (
  unit?: string | number | null,
  initialMac?: string | null,
): { mac: string | null; loading: boolean } => {
  const normalized = normalizeUnitKey(unit);

  if (normalized && initialMac) {
    setCachedUnitMac(normalized, initialMac);
  }

  const cached = normalized ? getCachedUnitMac(normalized) : null;
  const [mac, setMac] = useState<string | null>(initialMac || cached || null);
  const [loading, setLoading] = useState<boolean>(
    !mac && !!normalized && cached === undefined,
  );

  useEffect(() => {
    if (!normalized) {
      setMac(null);
      setLoading(false);
      return;
    }

    if (initialMac) {
      setCachedUnitMac(normalized, initialMac);
      setMac(initialMac);
      setLoading(false);
      return;
    }

    const currentCached = getCachedUnitMac(normalized);
    if (currentCached !== undefined) {
      setMac(currentCached);
      setLoading(false);
      return;
    }

    let isMounted = true;
    setLoading(true);

    fetchUnitMac(normalized).then((resolvedMac) => {
      if (isMounted) {
        setMac(resolvedMac);
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [normalized, initialMac]);

  return { mac, loading };
};
