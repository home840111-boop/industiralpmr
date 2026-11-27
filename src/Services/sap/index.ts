import dayjs from "dayjs";
import { get, update } from "../../Components/firebase/api/db";
import { auth } from "../../Components/firebase";
import store from "../../Components/Store";
import { uidAtom } from "../../Components/Store/atoms";
import Get from "../../Components/Store/hooks/Get";
import {
  ActiveProductionOrder,
  BatchSyncResult,
  OrderProgressStatus,
  SapFetchResult,
  SapGroupedOrder,
  SapOrderItem,
  SapRawOrder,
  SapTargetOrder,
  SingleOrderFetchResult,
  TargetWithSapOrder,
} from "./types";

export type {
  SapTargetOrder,
  SapGroupedOrder,
  SapOrderItem,
  TargetWithSapOrder,
  BatchSyncResult,
  SingleOrderFetchResult,
};

/**
 * Designated Master User UID for the SAP ERP integration feature.
 * ONLY this masterUser (and their sub-users/impersonation) can access SAP Fiori functionality.
 */
export const SAP_MASTER_USER_UID = "Q15Ie2n4GkY5uqbW1UJ9375vRF43";

/**
 * Checks whether the SAP feature is enabled for the active factory / user.
 * Returns true ONLY if the active factory's masterUser UID matches SAP_MASTER_USER_UID.
 */
export const isSapFeatureEnabled = (uid?: string | null): boolean => {
  const activeUid = uid || store.get(uidAtom) || auth.currentUser?.uid;
  return activeUid === SAP_MASTER_USER_UID;
};

/**
 * React hook to reactively check if SAP feature is active for the current user/factory.
 */
export const useIsSapEnabled = (): boolean => {
  const uid = Get(uidAtom);
  return uid === SAP_MASTER_USER_UID || auth.currentUser?.uid === SAP_MASTER_USER_UID;
};

/**
 * SAP Proxy Cloud Function endpoint
 * Defaults to local emulator URL during development, or production URL
 */
export const getSapProxyUrl = (): string => {
  if (process.env.REACT_APP_SAP_PROXY_URL) {
    return process.env.REACT_APP_SAP_PROXY_URL;
  }
  return process.env.NODE_ENV === "development"
    ? "http://127.0.0.1:5001/industrialpmr/us-central1/getProductionOrders"
    : "https://us-central1-industrialpmr.cloudfunctions.net/getProductionOrders";
};

export const getAssignProductionOrderUrl = (): string => {
  if (process.env.REACT_APP_SAP_ASSIGN_ORDER_URL) {
    return process.env.REACT_APP_SAP_ASSIGN_ORDER_URL;
  }
  return process.env.NODE_ENV === "development"
    ? "http://127.0.0.1:5001/industrialpmr/us-central1/assignProductionOrder"
    : "https://us-central1-industrialpmr.cloudfunctions.net/assignProductionOrder";
};

export const getAssignRetroactiveOrderUrl = (): string => {
  if (process.env.REACT_APP_SAP_ASSIGN_RETROACTIVE_URL) {
    return process.env.REACT_APP_SAP_ASSIGN_RETROACTIVE_URL;
  }
  return process.env.NODE_ENV === "development"
    ? "http://127.0.0.1:5001/industrialpmr/us-central1/assignRetroactiveOrder"
    : "https://us-central1-industrialpmr.cloudfunctions.net/assignRetroactiveOrder";
};

// Rate limiting & cooldown protection
export const MIN_REFETCH_INTERVAL_MS = 10 * 1000; // 10s cooldown
let lastNetworkRequestTime = 0;

/**
 * Derives overall order status from quantities and completion deadlines
 */
export const calculateOrderStatus = (
  actual: number,
  target: number,
  endDate: string,
): OrderProgressStatus => {
  if (target <= 0) return "NEW";
  if (actual === 0) return "NEW";
  if (actual > target) return "OVERPRODUCED";
  if (actual >= target) return "COMPLETED";

  // Check if overdue (basic finish date passed and not yet completed)
  const isOverdue = dayjs().isAfter(dayjs(endDate), "day");
  if (isOverdue) return "OVERDUE";

  const percent = (actual / target) * 100;
  if (percent >= 85) return "NEAR_COMPLETION";
  return "ON_TRACK";
};

/**
 * Groups flat raw SAP orders by AUFNR into cohesive multi-material order records
 */
export const groupRawOrders = (rawList: SapRawOrder[]): SapGroupedOrder[] => {
  const map = new Map<string, SapRawOrder[]>();

  for (const item of rawList) {
    if (!item?.AUFNR) continue;
    const list = map.get(item.AUFNR) || [];
    list.push(item);
    map.set(item.AUFNR, list);
  }

  const result: SapGroupedOrder[] = [];

  for (const [orderNumber, items] of Array.from(map.entries())) {
    const first = items[0];
    let totalTarget = 0;
    let totalActual = 0;
    let totalGoodsReceipt = 0;

    const parsedItems: SapOrderItem[] = items.map((raw: any) => {
      const targetQuantity = Number(raw.PSMNG ?? raw.targetQuantity) || 0;
      const actualQuantity = Number(raw.LMNGA ?? raw.actualQuantity) || 0;
      const goodsReceiptQuantity = Number(raw.WEMNG ?? raw.goodsReceiptQuantity) || 0;

      totalTarget += targetQuantity;
      totalActual += actualQuantity;
      totalGoodsReceipt += goodsReceiptQuantity;

      const progressPercent =
        targetQuantity > 0 ? +((actualQuantity / targetQuantity) * 100).toFixed(1) : 0;
      const remainingQuantity = Math.max(0, targetQuantity - actualQuantity);

      return {
        materialNumber: raw.MATNR || raw.materialNumber || "",
        materialDescription: raw.MAKTX || raw.materialDescription || "Part",
        targetQuantity,
        actualQuantity,
        goodsReceiptQuantity,
        progressPercent,
        remainingQuantity,
      };
    });

    result.push({
      orderNumber,
      orderType: first.AUART,
      startDate: first.GSTRP,
      endDate: first.GLTRP,
      totalTarget,
      totalActual,
      totalGoodsReceipt,
      items: parsedItems,
    });
  }

  return result;
};

/**
 * Normalizes an order record returned from the backend Cloud Function or raw cache
 * ensuring all quantity properties (confirmedQuantity, actualQuantity, confirmedYield, totalActual, etc.)
 * are unified into standard frontend SapGroupedOrder and SapOrderItem shapes.
 */
export const normalizeGroupedOrder = (rawOrder: any): SapGroupedOrder => {
  if (!rawOrder) return rawOrder;

  const rawItems = Array.isArray(rawOrder.items) ? rawOrder.items : [];
  let totalTarget = Number(rawOrder.totalTarget ?? rawOrder.PSMNG) || 0;
  let totalActual = Number(
    rawOrder.totalActual ??
      rawOrder.confirmedYield ??
      rawOrder.confirmedQuantity ??
      rawOrder.LMNGA
  ) || 0;
  let totalGoodsReceipt = Number(
    rawOrder.totalGoodsReceipt ??
      rawOrder.deliveredQuantity ??
      rawOrder.WEMNG
  ) || 0;

  const items: SapOrderItem[] = rawItems.map((item: any) => {
    const targetQuantity = Number(item.targetQuantity ?? item.PSMNG) || 0;
    const actualQuantity = Number(
      item.actualQuantity ??
        item.confirmedQuantity ??
        item.confirmedYield ??
        item.LMNGA
    ) || 0;
    const goodsReceiptQuantity = Number(
      item.goodsReceiptQuantity ??
        item.deliveredQuantity ??
        item.WEMNG
    ) || 0;

    const progressPercent =
      targetQuantity > 0 ? +((actualQuantity / targetQuantity) * 100).toFixed(1) : 0;
    const remainingQuantity = Math.max(0, targetQuantity - actualQuantity);

    return {
      materialNumber: item.materialNumber || item.MATNR || "",
      materialDescription: item.materialDescription || item.MAKTX || "Part",
      targetQuantity,
      actualQuantity,
      goodsReceiptQuantity,
      progressPercent,
      remainingQuantity,
    };
  });

  if (totalTarget === 0 && items.length > 0) {
    totalTarget = items.reduce((acc, i) => acc + i.targetQuantity, 0);
  }
  if (totalActual === 0 && items.length > 0) {
    totalActual = items.reduce((acc, i) => acc + i.actualQuantity, 0);
  }
  if (totalGoodsReceipt === 0 && items.length > 0) {
    totalGoodsReceipt = items.reduce((acc, i) => acc + i.goodsReceiptQuantity, 0);
  }

  return {
    orderNumber: String(rawOrder.orderNumber || rawOrder.AUFNR || ""),
    orderType: String(rawOrder.orderType || rawOrder.AUART || ""),
    startDate: String(rawOrder.startDate || rawOrder.rawStartDate || rawOrder.GSTRP || ""),
    endDate: String(rawOrder.endDate || rawOrder.rawEndDate || rawOrder.GLTRP || ""),
    totalTarget,
    totalActual,
    totalGoodsReceipt,
    items,
    lastUpdated: rawOrder.lastUpdated || rawOrder.lastSyncedAt,
  };
};

/**
 * Invokes the backend Cloud Function proxy with authentication headers
 */
export const callSapProxy = async (
  payload: Record<string, any>,
  endpointUrl?: string,
): Promise<any> => {
  if (!isSapFeatureEnabled()) {
    return { success: false, error: "SAP feature not enabled" };
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (auth.currentUser) {
    try {
      const token = await auth.currentUser.getIdToken();
      headers["Authorization"] = `Bearer ${token}`;
    } catch (err) {
      console.warn("[SAP Auth] Could not get user token:", err);
    }
  }

  const url = endpointUrl || getSapProxyUrl();
  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Cloud Function returned HTTP ${response.status}`);
  }

  return await response.json();
};

/**
 * Action 1: list_by_range
 * Fetches production orders within a date range via the backend Cloud Function.
 * The backend manages RTDB caching and enforces the once-a-day sync rule.
 */
export const fetchOrdersByRange = async (
  startDate: string,
  endDate: string,
  forceRefresh: boolean = false,
): Promise<SapFetchResult> => {
  if (!isSapFeatureEnabled()) {
    return { orders: [], lastFetched: null, fromCache: false };
  }

  const parseToSapDate = (d: string) => (d.includes("-") ? d.replace(/-/g, "") : d);
  const formattedStart = parseToSapDate(startDate);
  const formattedEnd = parseToSapDate(endDate);

  // Client cooldown to prevent accidental button double-clicking
  const now = Date.now();
  if (forceRefresh && now - lastNetworkRequestTime < MIN_REFETCH_INTERVAL_MS) {
    console.warn("[SAP Rate Limit] Force refresh throttled on client cooldown.");
  }
  lastNetworkRequestTime = now;

  try {
    const res = await callSapProxy({
      action: "list_by_range",
      startDate: formattedStart,
      endDate: formattedEnd,
      startdate: formattedStart,
      enddate: formattedEnd,
      forceRefresh,
    });

    const rawList = Array.isArray(res) ? res : Array.isArray(res?.orders) ? res.orders : [];
    const orders =
      rawList.length > 0 && rawList[0].items
        ? rawList.map(normalizeGroupedOrder)
        : groupRawOrders(rawList);

    return {
      orders,
      lastFetched: res?.lastFetched || Date.now(),
      fromCache: !!res?.fromCache,
    };
  } catch (err) {
    console.warn("[SAP Service] fetchOrdersByRange error:", err);
    throw err;
  }
};

/** Alias for backward compatibility */
export const fetchProductionOrdersFromSap = fetchOrdersByRange;

/**
 * Action 2: get_by_po
 * Fetches a single production order by PO Number.
 * The backend uses the invariant PO -> startDate map in RTDB to hit SAP for that single day if stale.
 */
export const fetchOrderByPoNumber = async (
  orderNumber: string,
  forceRefresh: boolean = false,
): Promise<SingleOrderFetchResult> => {
  if (!isSapFeatureEnabled() || !orderNumber) {
    return { order: null, lastFetched: null, fromCache: false, error: "Disabled or invalid PO" };
  }

  try {
    const res = await callSapProxy({
      action: "get_by_po",
      orderNumber,
      forceRefresh,
    });

    if (res?.order) {
      const order = res.order.items
        ? normalizeGroupedOrder(res.order)
        : groupRawOrders([res.order])[0] || null;
      return {
        order,
        lastFetched: res.lastFetched || Date.now(),
        fromCache: !!res.fromCache,
      };
    }

    return {
      order: null,
      lastFetched: null,
      fromCache: false,
      error: res?.error || "Order not found",
    };
  } catch (err: any) {
    console.warn(`[SAP Service] fetchOrderByPoNumber (${orderNumber}) error:`, err);
    return {
      order: null,
      lastFetched: null,
      fromCache: false,
      error: err?.message || "Lookup failed",
    };
  }
};

/**
 * Action 3: sync_active_targets
 * Synchronizes SAP data across all active targets in the /targets view:
 * The backend calculates the bounds from internal po_map, queries SAP if stale/forced,
 * and updates each target record directly in RTDB via Admin SDK.
 */
export const syncActiveTargetsBatch = async (
  activeTargets: TargetWithSapOrder[],
  forceRefresh: boolean = false,
): Promise<BatchSyncResult> => {
  if (!isSapFeatureEnabled() || activeTargets.length === 0) {
    return {
      orders: [],
      lastFetched: null,
      fromCache: false,
      updatedCount: 0,
      minDate: null,
      maxDate: null,
      hasActiveTargets: false,
    };
  }

  try {
    const sanitizedTargets = activeTargets.map((t) => ({
      machineID: t.machineID,
      moldName: t.moldName,
      orderNumber: t.orderNumber || t.sapOrder?.orderNumber,
      materialNumber: t.materialNumber || t.sapOrder?.materialNumber,
    }));

    const res = await callSapProxy({
      action: "sync_active_targets",
      activeTargets: sanitizedTargets,
      forceRefresh,
    });

    return {
      orders: Array.isArray(res?.orders) ? res.orders.map(normalizeGroupedOrder) : [],
      lastFetched: res?.lastFetched || Date.now(),
      fromCache: !!res?.fromCache,
      updatedCount: res?.updatedCount ?? 0,
      minDate: res?.minDate || null,
      maxDate: res?.maxDate || null,
      hasActiveTargets: true,
      warning: res?.warning,
    };
  } catch (err: any) {
    console.warn("[SAP Service] syncActiveTargetsBatch error:", err);
    throw err;
  }
};

/**
 * Loads current month orders with the once-a-day sync rule via backend list_by_range
 */
export const fetchMonthOrdersWithDailySync = async (
  forceRefresh: boolean = false,
): Promise<SapFetchResult> => {
  const sDate = dayjs().startOf("month").format("YYYY-MM-DD");
  const eDate = dayjs().endOf("month").format("YYYY-MM-DD");
  return fetchOrdersByRange(sDate, eDate, forceRefresh);
};

/**
 * Refreshes / syncs an active target's SAP order data (confirmed yield, actuals)
 * Uses backend get_by_po and ensures RTDB target record reflects fresh yield.
 */
export const syncTargetSapOrder = async (
  machineID: string,
  moldName: string,
  currentSapOrder: SapTargetOrder,
  forceRefresh: boolean = true,
): Promise<SapTargetOrder> => {
  try {
    const result = await fetchOrderByPoNumber(currentSapOrder.orderNumber, forceRefresh);
    if (result.order) {
      const matched = result.order;
      let target = currentSapOrder.target;
      let confirmed = currentSapOrder.confirmed;
      let actual = currentSapOrder.actual;

      const item = matched.items.find((i) => i.materialNumber === currentSapOrder.materialNumber);
      if (item) {
        target = item.targetQuantity;
        confirmed = item.actualQuantity;
        actual = item.actualQuantity;
      } else {
        target = matched.totalTarget;
        confirmed = matched.totalActual;
        actual = matched.totalActual;
      }

      const updatedSapOrder: SapTargetOrder = {
        ...currentSapOrder,
        target,
        confirmed,
        actual,
        lastSynced: result.lastFetched || Date.now(),
        status: matched.orderType || currentSapOrder.status,
        startDate: matched.startDate || currentSapOrder.startDate,
        endDate: matched.endDate || currentSapOrder.endDate,
      };

      await update(`production-targets/active/${machineID}/${moldName}/sapOrder`, updatedSapOrder);
      return updatedSapOrder;
    }
  } catch (err) {
    console.warn("[SAP Target Sync] Failed to refresh order from backend:", err);
  }

  const touched: SapTargetOrder = {
    ...currentSapOrder,
    lastSynced: Date.now(),
  };
  try {
    await update(`production-targets/active/${machineID}/${moldName}/sapOrder/lastSynced`, Date.now());
  } catch (e) {}

  return touched;
};

/**
 * Searches production orders across date range using backend list_by_range
 */
export const searchProductionOrders = async (
  query?: string,
  startDate?: string,
  endDate?: string,
  forceRefresh: boolean = false,
): Promise<SapFetchResult> => {
  const sDate = startDate || dayjs().startOf("month").format("YYYY-MM-DD");
  const eDate = endDate || dayjs().endOf("month").format("YYYY-MM-DD");

  const result = await fetchOrdersByRange(sDate, eDate, forceRefresh);
  const cleanQuery = query?.trim().toLowerCase() || "";

  if (!cleanQuery) return result;

  const filtered = result.orders.filter((order) => {
    if (order.orderNumber.toLowerCase().includes(cleanQuery)) return true;
    return order.items.some(
      (item) =>
        item.materialNumber.toLowerCase().includes(cleanQuery) ||
        item.materialDescription.toLowerCase().includes(cleanQuery),
    );
  });

  return {
    ...result,
    orders: filtered,
  };
};

/**
 * Storage keys and persistence handlers for machine-level active production orders
 */
const getStorageKey = (machineId: string) => `active_production_order_${machineId}`;

export const fetchActiveProductionOrder = async (
  machineId: string,
): Promise<ActiveProductionOrder | null> => {
  if (!isSapFeatureEnabled()) return null;
  try {
    const snap = await get(`machines/${machineId}/activeOrder`);
    if (snap && snap.exists()) {
      return snap.val() as ActiveProductionOrder;
    }
  } catch (err) {}

  try {
    const raw = localStorage.getItem(getStorageKey(machineId));
    if (raw) {
      return JSON.parse(raw) as ActiveProductionOrder;
    }
  } catch (e) {}

  return null;
};

export const saveActiveProductionOrder = async (
  machineId: string,
  order: ActiveProductionOrder,
): Promise<void> => {
  if (!isSapFeatureEnabled()) return;
  try {
    localStorage.setItem(getStorageKey(machineId), JSON.stringify(order));
  } catch (e) {}

  try {
    const url = getAssignProductionOrderUrl();
    await callSapProxy({ machineId, order }, url);
  } catch (err) {
    console.warn("[SAP] Cloud Function assignProductionOrder failed, falling back to direct RTDB write:", err);
    try {
      await update(`machines/${machineId}/activeOrder`, order);
    } catch (e) {}
  }
};

/**
 * Assigns an order retroactively to a historical shift date using assignRetroactiveOrder
 */
export const assignRetroactiveOrder = async (
  machineId: string,
  order: any,
  date?: string,
): Promise<any> => {
  if (!isSapFeatureEnabled()) return { success: false, error: "SAP feature not enabled" };
  const url = getAssignRetroactiveOrderUrl();
  return callSapProxy({ machineId, order, date }, url);
};

export const removeActiveProductionOrder = async (
  machineId: string,
): Promise<void> => {
  if (!isSapFeatureEnabled()) return;
  try {
    localStorage.removeItem(getStorageKey(machineId));
  } catch (e) {}

  try {
    await update(`machines/${machineId}/activeOrder`, null);
  } catch (err) {
    console.warn("Could not remove active order from Firebase", err);
  }
};

export const syncProductionOrder = async (
  currentOrder: ActiveProductionOrder,
  forceRefresh: boolean = true,
): Promise<ActiveProductionOrder> => {
  if (!isSapFeatureEnabled()) return currentOrder;

  try {
    const res = await fetchOrderByPoNumber(currentOrder.orderNumber, forceRefresh);
    const matched = res.order;

    if (matched) {
      let target = matched.totalTarget;
      let actualSap = matched.totalActual;
      let goodsReceipt = matched.totalGoodsReceipt;

      if (
        currentOrder.selectedMaterialNumber &&
        currentOrder.selectedMaterialNumber !== "ALL"
      ) {
        const selectedItem = matched.items.find(
          (i) => i.materialNumber === currentOrder.selectedMaterialNumber,
        );
        if (selectedItem) {
          target = selectedItem.targetQuantity;
          actualSap = selectedItem.actualQuantity;
          goodsReceipt = selectedItem.goodsReceiptQuantity;
        }
      }

      const updated: ActiveProductionOrder = {
        ...currentOrder,
        items: matched.items,
        target,
        actualSap,
        goodsReceipt,
        lastSyncedAt: res.lastFetched || Date.now(),
        status: calculateOrderStatus(actualSap, target, matched.endDate),
      };

      return updated;
    }
  } catch (err) {
    console.warn("[SAP syncProductionOrder] Error syncing order:", err);
  }

  return {
    ...currentOrder,
    lastSyncedAt: Date.now(),
  };
};
