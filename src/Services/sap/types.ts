/**
 * SAP Fiori REST API - Types & Data Models
 * Corresponds to REST_API_Documentation_AVT_Kunjisoft(1).docx
 */

export interface SapRawOrder {
  AUFNR: string; // Production Order Number (e.g. "110100011489")
  MATNR: string; // Material Number (e.g. "000000004000000034")
  MAKTX: string; // Material Description
  GSTRP: string; // Basic Start Date (YYYY-MM-DD)
  GLTRP: string; // Basic Finish Date (YYYY-MM-DD)
  AUART: string; // Order Type (e.g. "Z101")
  PSMNG: number; // Total Order Quantity (Target)
  LMNGA: number; // Confirmed Yield Quantity (Actual)
  WEMNG: number; // Goods Receipt Quantity
}

export interface SapOrderItem {
  materialNumber: string;
  materialDescription: string;
  targetQuantity: number; // PSMNG
  actualQuantity: number; // LMNGA
  goodsReceiptQuantity: number; // WEMNG
  progressPercent: number;
  remainingQuantity: number;
}

export interface SapGroupedOrder {
  orderNumber: string;
  orderType: string;
  startDate: string;
  endDate: string;
  totalTarget: number;
  totalActual: number;
  totalGoodsReceipt: number;
  items: SapOrderItem[];
  lastUpdated?: number;
}

export type OrderProgressStatus =
  | "NEW"
  | "ON_TRACK"
  | "NEAR_COMPLETION"
  | "COMPLETED"
  | "OVERPRODUCED"
  | "OVERDUE";

export interface ActiveProductionOrder {
  orderNumber: string;
  orderType: string;
  startDate: string;
  endDate: string;
  selectedMaterialNumber?: string; // "ALL" or specific MATNR
  assignedAt: number; // unix ms
  assignedBy?: string;
  lastSyncedAt: number; // unix ms
  items: SapOrderItem[];
  target: number;
  actualSap: number;
  goodsReceipt: number;
  status: OrderProgressStatus;
}

export interface SapCacheEntry {
  orders: SapRawOrder[];
  lastFetched: number;
  startDate: string;
  endDate: string;
}

export interface SapFetchResult {
  orders: SapGroupedOrder[];
  lastFetched: number | null;
  fromCache: boolean;
}

export interface SapTargetOrder {
  orderNumber: string;
  materialNumber: string;
  materialDesc: string;
  target: number;
  confirmed: number;
  actual: number;
  lastSynced: number;
  status?: string;
  startDate?: string;
  endDate?: string;
}

export interface TargetWithSapOrder {
  machineID: string;
  moldName: string;
  orderNumber: string;
  materialNumber?: string;
  sapOrder?: SapTargetOrder;
}

export interface BatchSyncResult {
  orders?: SapGroupedOrder[];
  lastFetched: number | null;
  fromCache: boolean;
  updatedCount: number;
  minDate?: string | null;
  maxDate?: string | null;
  hasActiveTargets: boolean;
  warning?: string;
}

export interface SingleOrderFetchResult {
  order: SapGroupedOrder | null;
  lastFetched: number | null;
  fromCache: boolean;
  error?: string;
}


