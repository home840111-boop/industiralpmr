import { SapRawOrder } from "./types";

/**
 * Mock SAP Fiori Orders dataset
 * Includes verbatim records from REST_API_Documentation_AVT_Kunjisoft(1).docx
 * plus edge case scenarios (multi-material, new 0% order, overproduction, overdue)
 */
export const MOCK_SAP_ORDERS: SapRawOrder[] = [
  // 1. Verbatim Doc Order 1: High completion (95.1%)
  {
    AUFNR: "110100011489",
    MATNR: "000000004000000034",
    MAKTX: "C1 CVR SA, INS. PNL UN# 1 (55606N02210)",
    GSTRP: "2026-09-01",
    GLTRP: "2026-10-31",
    AUART: "Z101",
    PSMNG: 1200.0,
    LMNGA: 1141.0,
    WEMNG: 992.0,
  },

  // 2. Verbatim Doc Order 2 - Part A: Multi-material Order (RH Mirror)
  {
    AUFNR: "110100011490",
    MATNR: "000000004000000027",
    MAKTX: "C1 COVER, OUTER MIRROR, RH (87915N02480)",
    GSTRP: "2026-09-01",
    GLTRP: "2026-10-30",
    AUART: "Z101",
    PSMNG: 4000.0,
    LMNGA: 3840.0,
    WEMNG: 3840.0,
  },

  // 2. Verbatim Doc Order 2 - Part B: Multi-material Order (LH Mirror)
  {
    AUFNR: "110100011490",
    MATNR: "000000004000000025",
    MAKTX: "C1 COVER, OUTER MIRROR, LH (87945N02480)",
    GSTRP: "2026-09-01",
    GLTRP: "2026-10-30",
    AUART: "Z101",
    PSMNG: 4000.0,
    LMNGA: 3840.0,
    WEMNG: 3840.0,
  },

  // 3. Edge Case: Brand New Order (0% Confirmed Yield)
  {
    AUFNR: "110100011491",
    MATNR: "000000004000000051",
    MAKTX: "C1 DOOR TRIM PANEL, FRONT RH (67610N01120)",
    GSTRP: "2026-10-01",
    GLTRP: "2026-11-15",
    AUART: "Z101",
    PSMNG: 5000.0,
    LMNGA: 0.0,
    WEMNG: 0.0,
  },

  // 4. Edge Case: Overproduction (Yield > Target, 107.5%)
  {
    AUFNR: "110100011492",
    MATNR: "000000004000000062",
    MAKTX: "C1 BUMPER LOWER GRILLE (53112N08400)",
    GSTRP: "2026-09-10",
    GLTRP: "2026-10-15",
    AUART: "Z101",
    PSMNG: 2000.0,
    LMNGA: 2150.0,
    WEMNG: 2100.0,
  },

  // 5. Edge Case: Overdue Order (Finish date passed, behind schedule)
  {
    AUFNR: "110100011493",
    MATNR: "000000004000000088",
    MAKTX: "C1 INSTRUMENT CLUSTER BEZEL (55401N04210)",
    GSTRP: "2026-08-01",
    GLTRP: "2026-09-15",
    AUART: "Z101",
    PSMNG: 3500.0,
    LMNGA: 1820.0,
    WEMNG: 1750.0,
  },

  // 6. Real SAP Order: 110100011865 (Multi-Part: REFLECTOR RH + LH)
  {
    AUFNR: "110100011865",
    MATNR: "000000003000000131",
    MAKTX: "REFLECTOR RH - BUL (13222-18939-M)",
    GSTRP: "2026-10-07",
    GLTRP: "2026-10-31",
    AUART: "Z101",
    PSMNG: 800.0,
    LMNGA: 555.0,
    WEMNG: 645.0,
  },
  {
    AUFNR: "110100011865",
    MATNR: "000000003000000135",
    MAKTX: "REFLECTOR LH (13322-18939-M)",
    GSTRP: "2026-10-07",
    GLTRP: "2026-10-31",
    AUART: "Z101",
    PSMNG: 800.0,
    LMNGA: 555.0,
    WEMNG: 645.0,
  },

  // 7. Real SAP Order: 110100011901 (Crossmember)
  {
    AUFNR: "110100011901",
    MATNR: "000000004000000182",
    MAKTX: "CROSSMEMBER COMP,FR LOWER (72380B74P02P)",
    GSTRP: "2026-10-07",
    GLTRP: "2026-10-31",
    AUART: "Z101",
    PSMNG: 500.0,
    LMNGA: 152.0,
    WEMNG: 152.0,
  },

  // 8. Real SAP Order: 110100011902 (Panel Console Upper)
  {
    AUFNR: "110100011902",
    MATNR: "000000003000001974",
    MAKTX: "PANEL CONSOLE UPR (58821-02801-M)",
    GSTRP: "2026-10-07",
    GLTRP: "2026-10-31",
    AUART: "Z101",
    PSMNG: 800.0,
    LMNGA: 299.0,
    WEMNG: 299.0,
  },

  // 9. Real SAP Order: 110100011903 (C1 Panel Console Upper)
  {
    AUFNR: "110100011903",
    MATNR: "000000004000001381",
    MAKTX: "C1 PANEL CONSOLE UPR (58821N02801)",
    GSTRP: "2026-10-07",
    GLTRP: "2026-10-31",
    AUART: "Z101",
    PSMNG: 1000.0,
    LMNGA: 270.0,
    WEMNG: 270.0,
  },
];
