export const costIntelligencePaths = {
  masterSettings: "cost-intelligence/master-settings",
  dailyProductionLogs: "cost-intelligence/daily-production-logs",
} as const;

export interface MasterSettings {
  id: string;
  name: string;
  version: number;
  isActive: boolean;

  electricityRatePerKwh: number;
  materialCostPerKg: number;
  laborCostPerHour: number;
  laborPiecesPerHour: number;
  machinePurchasePrice: number;
  machineUsefulLifeHours: number;
  moldCost: number;
  moldExpectedLifeCycles: number;

  createdAt: number;
  updatedAt: number;
}

export interface MasterSettingsDraft extends Omit<
  MasterSettings,
  "id" | "createdAt" | "updatedAt"
> {}

export interface DailyProductionLog {
  id: string;
  masterSettingsId: string;
  productionDate: string;

  totalProducedPieces: number;
  totalRejectedPieces: number;
  actualMaterialUsedKg: number;
  totalKwhConsumed: number;
  totalMachineOnTimeHours: number;
  sellingPricePerPiece: number;
  notes?: string;
  calculated?: DailyProductionCostBreakdown;

  createdAt: number;
  updatedAt: number;
}

export interface DailyProductionInput {
  totalProducedPieces: number;
  totalRejectedPieces: number;
  actualMaterialUsedKg: number;
  totalKwhConsumed: number;
  totalMachineOnTimeHours: number;
  sellingPricePerPiece: number;
}

export interface DailyProductionCostBreakdown {
  goodPieces: number;
  materialCostPerPiece: number;
  electricityCostPerPiece: number;
  laborCostPerPiece: number;
  depreciationPerPiece: number;
  moldAmortizationPerPiece: number;
  totalRealCostPerPiece: number;
  wasteCost: number;
  profitPerPiece: number;
  marginPercent: number;
  totalRealCost: number;
  totalRevenue: number;
  netProfit: number;
  netMarginPercent: number;
}

export const defaultMasterSettings: MasterSettingsDraft = {
  name: "Default Settings",
  version: 1,
  isActive: true,
  electricityRatePerKwh: 0,
  materialCostPerKg: 0,
  laborCostPerHour: 0,
  laborPiecesPerHour: 0,
  machinePurchasePrice: 0,
  machineUsefulLifeHours: 1,
  moldCost: 0,
  moldExpectedLifeCycles: 1,
};

export const defaultDailyProductionInput: DailyProductionInput = {
  totalProducedPieces: 0,
  totalRejectedPieces: 0,
  actualMaterialUsedKg: 0,
  totalKwhConsumed: 0,
  totalMachineOnTimeHours: 0,
  sellingPricePerPiece: 0,
};

const round = (value: number, digits = 2) => {
  const factor = 10 ** digits;
  return Math.round((Number.isFinite(value) ? value : 0) * factor) / factor;
};

export const calculateDailyProductionCost = (
  settings: MasterSettingsDraft,
  input: DailyProductionInput,
): DailyProductionCostBreakdown => {
  const goodPieces = Math.max(
    input.totalProducedPieces - input.totalRejectedPieces,
    0,
  );

  if (goodPieces === 0) {
    return {
      goodPieces: 0,
      materialCostPerPiece: 0,
      electricityCostPerPiece: 0,
      laborCostPerPiece: 0,
      depreciationPerPiece: 0,
      moldAmortizationPerPiece: 0,
      totalRealCostPerPiece: 0,
      wasteCost: 0,
      profitPerPiece: 0,
      marginPercent: 0,
      totalRealCost: 0,
      totalRevenue: 0,
      netProfit: 0,
      netMarginPercent: 0,
    };
  }

  const materialCostPerPiece =
    (input.actualMaterialUsedKg * settings.materialCostPerKg) / goodPieces;
  const electricityCostPerPiece =
    (input.totalKwhConsumed * settings.electricityRatePerKwh) / goodPieces;
  const laborCostPerPiece =
    (settings.laborCostPerHour * input.totalMachineOnTimeHours) / goodPieces;
  const depreciationPerPiece =
    ((settings.machinePurchasePrice /
      Math.max(settings.machineUsefulLifeHours, 1)) *
      input.totalMachineOnTimeHours) /
    goodPieces;
  const moldAmortizationPerPiece =
    settings.moldCost / Math.max(settings.moldExpectedLifeCycles, 1);
  const totalRealCostPerPiece =
    materialCostPerPiece +
    electricityCostPerPiece +
    laborCostPerPiece +
    depreciationPerPiece +
    moldAmortizationPerPiece;
  const wasteCost =
    input.totalRejectedPieces *
    (materialCostPerPiece + electricityCostPerPiece + laborCostPerPiece);
  const profitPerPiece = input.sellingPricePerPiece - totalRealCostPerPiece;
  const marginPercent =
    input.sellingPricePerPiece > 0
      ? (profitPerPiece / input.sellingPricePerPiece) * 100
      : 0;
  const totalRealCost = totalRealCostPerPiece * goodPieces + wasteCost;
  const totalRevenue = input.sellingPricePerPiece * goodPieces;
  const netProfit = totalRevenue - totalRealCost;
  const netMarginPercent =
    totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

  return {
    goodPieces,
    materialCostPerPiece: round(materialCostPerPiece),
    electricityCostPerPiece: round(electricityCostPerPiece),
    laborCostPerPiece: round(laborCostPerPiece),
    depreciationPerPiece: round(depreciationPerPiece),
    moldAmortizationPerPiece: round(moldAmortizationPerPiece),
    totalRealCostPerPiece: round(totalRealCostPerPiece),
    wasteCost: round(wasteCost),
    profitPerPiece: round(profitPerPiece),
    marginPercent: round(marginPercent, 1),
    totalRealCost: round(totalRealCost),
    totalRevenue: round(totalRevenue),
    netProfit: round(netProfit),
    netMarginPercent: round(netMarginPercent, 1),
  };
};
