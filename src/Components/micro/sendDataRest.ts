import { auth, db } from "../firebase";
import { get } from "../firebase/api/db";
import { ref, push } from "firebase/database";
import store from "../Store";
import {
  roleAtom,
  uidAtom,
  factoriesAtom,
  isMasterAdminAtom,
  isImpersonationReadOnlyAtom,
} from "../Store/atoms";
import { canWriteOperational, isAdminUser, toIdArray } from "../../Services/rbac";

const REST_SERVER_URL =
  process.env[
    `REACT_APP_REST_SERVER_URL_${process.env.NODE_ENV.toUpperCase()}`
  ];
const sendDataRest = async (
  unit: number,
  params: [string, string, object, number | undefined],
): Promise<number> => {
  const isMaster = store.get(isMasterAdminAtom);
  const isReadOnly = store.get(isImpersonationReadOnlyAtom);

  // If Master Admin is in Safe Mode (Read-Only), protect client data and block mutations
  if (isMaster && isReadOnly) {
    console.warn("[Safe Mode] Modification blocked: Impersonation Safe Mode is ON.");
    return 403;
  }

  const uid = store.get(uidAtom);
  const role = store.get(roleAtom);
  const { uid: myUID } = auth.currentUser || {};
  const target = params[0];
  const dataKeys = Object.keys(params[2] || {});
  const isOperationalMoldInstall =
    target === "machine" &&
    dataKeys.length > 0 &&
    dataKeys.every((k) => k === "installedMold" || k === "mold_start_time");
  const isSettingsTarget =
    target === "info" ||
    target === "equipment" ||
    (target === "machine" && !isOperationalMoldInstall);
  const hasAccess = isSettingsTarget ? isAdminUser(uid) : canWriteOperational(uid);
  if (!hasAccess) return 401;
  if (!uid) return 0;
  const factoryIdx =
    typeof params[3] === "number" && !isNaN(params[3]) ? params[3] : -1;
  const facUnits =
    factoryIdx >= 0
      ? toIdArray((store.get(factoriesAtom) as any)?.[factoryIdx]?.units)
      : [];
  let effectiveUnit: string | number = unit;
  if (target === "info" && facUnits.length > 0) {
    effectiveUnit = facUnits[0];
  }
  const headers = {
    "Content-Type": "application/json",
    uid,
    unit: String(effectiveUnit),
  };
  const payload = {
    target: params[0],
    id: params[1],
    data: params[2],
    factory: factoryIdx,
  };
  const URL = REST_SERVER_URL + "/update-data";

  let resolvedFallbackUnit = false;
  let maxAttempts = 3;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const response = await fetch(URL, {
        method: "POST",
        headers: headers,
        body: JSON.stringify(payload),
      });

      if (response.ok) return response.status;

      if (response.status === 401 && !resolvedFallbackUnit) {
        resolvedFallbackUnit = true;
        const unitsSnap = await get("units").catch(() => null);
        const unitKeys = Object.keys(unitsSnap?.val() || {});
        const validUnit =
          facUnits.find((u) => unitKeys.includes(String(u))) || unitKeys[0];
        if (validUnit && String(validUnit) !== headers.unit) {
          headers.unit = String(validUnit);
          maxAttempts++;
          continue;
        }
      }

      if (attempt === maxAttempts - 1) {
        const errorLog = {
          timestamp: Date.now(),
          type: "HTTP_ERROR",
          status: response.status,
          url: URL,
          user: { uid, role, myUID },
          request: { unit: headers.unit, payload, headers },
        };

        try {
          const text = await response.text();
          Object.assign(errorLog, { responseBody: text });
        } catch (e) {
          // ignore body read error
        }

        push(ref(db, "/admin/error-logs/"), errorLog);
        return response.status;
      }
    } catch (error: any) {
      if (attempt === maxAttempts - 1) {
        const errorLog = {
          timestamp: Date.now(),
          type: "NETWORK_ERROR",
          url: URL,
          user: { uid, role, myUID },
          request: { unit: headers.unit, payload, headers },
          error: error.message || String(error),
        };
        push(ref(db, "/admin/error-logs/"), errorLog);
        return 0;
      }
    }
  }
  return 0;
};

export default sendDataRest;
export { REST_SERVER_URL };
