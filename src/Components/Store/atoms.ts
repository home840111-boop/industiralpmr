import { atom } from "jotai";
import type { WorkSchedulesMap } from "../../Services/workSchedule";
import { departmentsType } from "../../routes/Machines/types";

interface KeyVal {
  [key: string]: string;
}
interface machine extends KeyVal {}
interface equipment extends KeyVal {}
interface Env extends KeyVal {}
interface EnvUnit {
  [key: string]: number;
}
interface shifts {
  shifts: 1 | 2 | 3;
  A: number;
  B: number;
  C: number;
}

interface selectedFactoryType {
  name: string;
  value: number;
  only: boolean;
}
type factoryProductionType = "molding" | "meter";

type UserRole = "viewer" | "editor" | "admin";

const uidAtom = atom<null | string>(null);
const dateAtom = atom<string | null>(null);
const companyNameAtom = atom<string | null>(null);
const departmentsAtom = atom<departmentsType | null>(null);
const machinesAtom = atom<machine | null>(null);
const machinesOrderAtom = atom<string[] | null>(null);
const isWebViewAppAtom = atom<boolean | null>(null);
const equipmentsAtom = atom<equipment | null>(null);
const roleAtom = atom<UserRole | null>(null);
const departmentAtom = atom<string[] | null>(null);
const baseDepartmentAtom = atom<string[] | null>(null);
const shiftsAtom = atom<shifts | null>(null);
const factoriesAtom = atom<object[] | null>(null);
const selectedFactoryAtom = atom<selectedFactoryType | null>(null);
const EnvListAtom = atom<Env | null>(null);
const EnvUnitListAtom = atom<EnvUnit | null>(null);
const offtimeBasedEfficiencyAtom = atom<boolean | null>(null);
const offlineTimeAtom = atom<number>(3);
const factoryProductionAtom = atom<factoryProductionType | null>(null);
const tokenAtom = atom<string | null>(null);
// null = not yet known (menu stays enabled until we know)
const hasMainElectricityAtom = atom<boolean | null>(null);

export interface MasterClientItem {
  uid: string;
  companyName: string;
  email?: string;
}

const isMasterAdminAtom = atom<boolean>(false);
const impersonatedUidAtom = atom<string | null>(null);
const masterClientListAtom = atom<MasterClientItem[]>([]);
const isImpersonationReadOnlyAtom = atom<boolean>(true);
const workSchedulesAtom = atom<WorkSchedulesMap | null>(null);

export type {
  machine,
  equipment,
  shifts,
  selectedFactoryType,
  factoryProductionType,
  UserRole,
};
export {
  uidAtom,
  dateAtom,
  companyNameAtom,
  departmentsAtom,
  machinesAtom,
  roleAtom,
  departmentAtom,
  baseDepartmentAtom,
  shiftsAtom,
  factoriesAtom,
  selectedFactoryAtom,
  equipmentsAtom,
  EnvListAtom,
  EnvUnitListAtom,
  machinesOrderAtom,
  isWebViewAppAtom,
  offtimeBasedEfficiencyAtom,
  offlineTimeAtom,
  factoryProductionAtom,
  tokenAtom,
  hasMainElectricityAtom,
  isMasterAdminAtom,
  impersonatedUidAtom,
  masterClientListAtom,
  isImpersonationReadOnlyAtom,
  workSchedulesAtom,
};