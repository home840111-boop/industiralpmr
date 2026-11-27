import { auth } from "../Components/firebase";
import store from "../Components/Store";
import {
  baseDepartmentAtom,
  EnvListAtom,
  equipmentsAtom,
  isMasterAdminAtom,
  machinesAtom,
  roleAtom,
  uidAtom,
} from "../Components/Store/atoms";

/**
 * Normalizes Firebase RTDB array or numeric-keyed object values ({ "0": "M1" }) into string[].
 */
export const toIdArray = (val: unknown): string[] => {
  if (!val) return [];
  if (Array.isArray(val)) return val.filter(Boolean).map(String);
  if (typeof val === "object") {
    return Object.values(val as Record<string, unknown>)
      .filter(Boolean)
      .map(String);
  }
  return [];
};

/**
 * Returns true when the signed-in user is the Master owner of the active factory
 * or a platform-level Master Admin impersonating a client.
 */
export const isMasterOwner = (masterUid?: string | null): boolean => {
  const activeUid = masterUid !== undefined ? masterUid : store.get(uidAtom);
  if (!activeUid) return false;
  const isPlatformAdmin = store.get(isMasterAdminAtom);
  const { uid: myUid } = auth.currentUser || {};
  return Boolean(isPlatformAdmin || (myUid && myUid === activeUid));
};

/**
 * Returns true when the signed-in user is Master, Platform Admin, or a sub-user with role "admin".
 */
export const isAdminUser = (masterUid?: string | null): boolean => {
  if (isMasterOwner(masterUid)) return true;
  const activeUid = masterUid !== undefined ? masterUid : store.get(uidAtom);
  return Boolean(activeUid && store.get(roleAtom) === "admin");
};

/**
 * Returns true when the signed-in user can mutate operational data (Targets, Molds, Downtime, Raw Materials).
 */
export const canWriteOperational = (masterUid?: string | null): boolean => {
  if (isAdminUser(masterUid)) return true;
  const activeUid = masterUid !== undefined ? masterUid : store.get(uidAtom);
  return Boolean(activeUid && store.get(roleAtom) === "editor");
};

/**
 * Verifies that every asset inside a department exists in the caller's allowed asset maps.
 */
export const isDepartmentInScope = (
  dept: any,
  allowedMachines: Record<string, string>,
  allowedEquipments: Record<string, string>,
  allowedEnvs: Record<string, string>,
): boolean => {
  if (!dept || typeof dept !== "object") return false;
  const mIds = toIdArray(dept.machines);
  const eIds = toIdArray(dept.equipments);
  const envIds = toIdArray(dept.envs);
  if (mIds.length + eIds.length + envIds.length === 0) return false;
  return (
    mIds.every((id) => Boolean(allowedMachines[id])) &&
    eIds.every((id) => Boolean(allowedEquipments[id])) &&
    envIds.every((id) => Boolean(allowedEnvs[id]))
  );
};

/**
 * Computes effective departments accessible to an Admin: their base assigned departments
 * plus any sub-department whose assets fall strictly within the Admin's allowed assets.
 */
export const computeEffectiveAdminDepartments = (
  baseDepartments: string[],
  allDepartments: Record<string, any>,
  allowedMachines: Record<string, string>,
  allowedEquipments: Record<string, string>,
  allowedEnvs: Record<string, string>,
): string[] => {
  if (baseDepartments.includes("all")) return ["all"];
  const effective = new Set<string>();
  for (const d of baseDepartments) {
    if (allDepartments && allDepartments[d]) effective.add(d);
  }
  for (const [deptName, deptObj] of Object.entries(allDepartments || {})) {
    if (isDepartmentInScope(deptObj, allowedMachines, allowedEquipments, allowedEnvs)) {
      effective.add(deptName);
    }
  }
  return Array.from(effective);
};

/**
 * Lists department names the current user is allowed to manage in Settings.
 */
export const getManageableDepartmentNames = (
  allDepartments: Record<string, any> | null,
): string[] => {
  if (!allDepartments) return [];
  const baseDepts = store.get(baseDepartmentAtom) || [];
  if (isMasterOwner() || baseDepts.includes("all")) {
    return Object.keys(allDepartments);
  }
  if (!isAdminUser()) return [];
  const allowedMachines = store.get(machinesAtom) || {};
  const allowedEquipments = store.get(equipmentsAtom) || {};
  const allowedEnvs = store.get(EnvListAtom) || {};
  return Object.keys(allDepartments).filter((name) =>
    isDepartmentInScope(allDepartments[name], allowedMachines, allowedEquipments, allowedEnvs),
  );
};

/**
 * Checks whether the caller can view, edit, or delete a given sub-user.
 * Admins cannot manage themselves, other Admins, or users holding departments outside their scope.
 */
export const canManageSubUser = (
  target: { uid: string; role: string; department: string[] },
  manageableDepts: string[],
  callerIsMaster: boolean,
  callerHasAll: boolean,
  callerUid?: string,
): boolean => {
  if (callerIsMaster) return true;
  const myUid = callerUid ?? auth.currentUser?.uid;
  if (myUid && target.uid === myUid) return false;
  if (target.role === "admin") return false;
  if (callerHasAll) return true;
  return (
    Array.isArray(target.department) &&
    target.department.length > 0 &&
    !target.department.includes("all") &&
    target.department.every((d) => manageableDepts.includes(d))
  );
};

/**
 * Prevents a scoped Admin from editing or deleting base departments in a way that
 * orphans any of their assigned machines, equipments, or environments.
 */
export const validateNoSelfLockout = (
  nextDepartmentsMap: Record<string, { machines?: any; equipments?: any; envs?: any }>,
  baseDepartments: string[],
  allowedMachines: Record<string, string>,
  allowedEquipments: Record<string, string>,
  allowedEnvs: Record<string, string>,
): { ok: boolean; missing: string[] } => {
  if (baseDepartments.includes("all")) return { ok: true, missing: [] };

  const coveredMachines = new Set<string>();
  const coveredEquipments = new Set<string>();
  const coveredEnvs = new Set<string>();

  for (const deptName of baseDepartments) {
    const dept = nextDepartmentsMap[deptName];
    if (!dept) continue;
    toIdArray(dept.machines).forEach((id) => coveredMachines.add(id));
    toIdArray(dept.equipments).forEach((id) => coveredEquipments.add(id));
    toIdArray(dept.envs).forEach((id) => coveredEnvs.add(id));
  }

  const missing: string[] = [];
  for (const [id, name] of Object.entries(allowedMachines || {})) {
    if (!coveredMachines.has(id)) missing.push(name || id);
  }
  for (const [id, name] of Object.entries(allowedEquipments || {})) {
    if (!coveredEquipments.has(id)) missing.push(name || id);
  }
  for (const [id, name] of Object.entries(allowedEnvs || {})) {
    if (!coveredEnvs.has(id)) missing.push(name || id);
  }

  return { ok: missing.length === 0, missing };
};

/**
 * Returns sorted numeric factory indices accessible to the user without re-indexing `factories`.
 */
export const getAccessibleFactoryIndices = (
  factories: any,
  allowedMachines: Record<string, string> | null,
  allowedEquipments: Record<string, string> | null,
  allowedEnvs: Record<string, string> | null,
  hasAllScope: boolean,
): number[] => {
  if (!factories || typeof factories !== "object") return [];
  const indices: number[] = [];
  for (const [key, f] of Object.entries(factories)) {
    const idx = Number(key);
    if (!Number.isInteger(idx) || idx < 0) continue;
    if (!f || typeof f !== "object") continue;
    if (hasAllScope) {
      indices.push(idx);
      continue;
    }
    const fac = f as any;
    const hasMachine = toIdArray(fac.machines).some((id) => Boolean(allowedMachines?.[id]));
    const hasEquipment = toIdArray(fac.equipments).some((id) => Boolean(allowedEquipments?.[id]));
    const hasEnv = toIdArray(fac.envs).some((id) => Boolean(allowedEnvs?.[id]));
    if (hasMachine || hasEquipment || hasEnv) {
      indices.push(idx);
    }
  }
  return indices.sort((a, b) => a - b);
};

/**
 * Filters an allowed asset map by the currently selected sub-factory (when one is selected).
 */
export const getScopedAssetMap = (
  allowedAssets: Record<string, string> | null,
  selectedFactoryObj: any,
  assetKey: "machines" | "equipments" | "envs",
): Record<string, string> => {
  if (!allowedAssets) return {};
  if (!selectedFactoryObj) return allowedAssets;
  const factoryIds = new Set(toIdArray(selectedFactoryObj?.[assetKey]));
  return Object.fromEntries(
    Object.entries(allowedAssets).filter(([id]) => factoryIds.has(id)),
  );
};

/**
 * Filters department definitions to those assigned to the user and intersecting the selected sub-factory.
 */
export const filterDepartmentsForView = (
  allDepartments: Record<string, any> | null,
  userDepartments: string[] | null,
  hasAllDepartments: boolean,
  selectedFactoryObj?: any,
  assetKey?: "machines" | "equipments" | "envs",
): Record<string, any> => {
  if (!allDepartments) return {};
  const mSet = selectedFactoryObj ? new Set(toIdArray(selectedFactoryObj?.machines)) : null;
  const eSet = selectedFactoryObj ? new Set(toIdArray(selectedFactoryObj?.equipments)) : null;
  const envSet = selectedFactoryObj ? new Set(toIdArray(selectedFactoryObj?.envs)) : null;

  return Object.fromEntries(
    Object.entries(allDepartments).filter(([name, dept]) => {
      if (!hasAllDepartments && !(userDepartments || []).includes(name)) {
        return false;
      }
      if (!selectedFactoryObj) return true;
      if (assetKey === "machines") {
        return toIdArray(dept?.machines).some((id) => mSet!.has(id));
      }
      if (assetKey === "equipments") {
        return toIdArray(dept?.equipments).some((id) => eSet!.has(id));
      }
      if (assetKey === "envs") {
        return toIdArray(dept?.envs).some((id) => envSet!.has(id));
      }
      return (
        toIdArray(dept?.machines).some((id) => mSet!.has(id)) ||
        toIdArray(dept?.equipments).some((id) => eSet!.has(id)) ||
        toIdArray(dept?.envs).some((id) => envSet!.has(id))
      );
    }),
  );
};

/**
 * Checks whether a factory activity entry corresponds to a machine or equipment within scope.
 */
export const isActivityInScope = (
  activity: { name?: string; title?: string },
  scopedMachines: Record<string, string>,
  scopedEquipments: Record<string, string>,
): boolean => {
  const normName = String(activity?.name || "").trim().toLowerCase();
  if (!normName) return false;
  const normTitle = String(activity?.title || "").toLowerCase();
  const machineNames = new Set(
    Object.values(scopedMachines || {})
      .filter(Boolean)
      .map((n) => String(n).trim().toLowerCase()),
  );
  const equipmentNames = new Set(
    Object.values(scopedEquipments || {})
      .filter(Boolean)
      .map((n) => String(n).trim().toLowerCase()),
  );
  if (normTitle.includes("machine")) return machineNames.has(normName);
  if (normTitle.includes("equipment")) return equipmentNames.has(normName);
  return machineNames.has(normName) || equipmentNames.has(normName);
};

const runSelfCheck = () => {
  const assert = (cond: boolean, msg: string) => {
    if (!cond) console.error(`[RBAC self-check failed] ${msg}`);
  };
  const machines = { M1: "Machine 1", M2: "Machine 2" };
  const equips = { E1: "Chiller 1" };
  const envs = {};

  assert(
    !canManageSubUser(
      { uid: "u2", role: "admin", department: ["DeptA"] },
      ["DeptA"],
      false,
      false,
      "u1",
    ),
    "Admin must not manage another Admin",
  );
  assert(
    !canManageSubUser(
      { uid: "u1", role: "editor", department: ["DeptA"] },
      ["DeptA"],
      false,
      false,
      "u1",
    ),
    "Admin must not manage self",
  );
  assert(
    !canManageSubUser(
      { uid: "u3", role: "viewer", department: ["all"] },
      ["DeptA"],
      false,
      false,
      "u1",
    ),
    "Scoped Admin must not manage 'all' user",
  );
  assert(
    !canManageSubUser(
      { uid: "u4", role: "editor", department: ["DeptA", "DeptB"] },
      ["DeptA"],
      false,
      false,
      "u1",
    ),
    "Scoped Admin must not manage user with outside department",
  );
  assert(
    !isDepartmentInScope({ machines: ["M1", "M3"], equipments: [], envs: [] }, machines, equips, envs),
    "Department with out-of-scope machine must be rejected",
  );
  assert(
    isDepartmentInScope({ machines: ["M1"], equipments: ["E1"], envs: [] }, machines, equips, envs),
    "In-scope department must pass",
  );
  const lockoutFail = validateNoSelfLockout(
    { DeptA: { machines: ["M1"], equipments: ["E1"], envs: [] } },
    ["DeptA"],
    machines,
    equips,
    envs,
  );
  assert(!lockoutFail.ok && lockoutFail.missing.includes("Machine 2"), "Must block self-lockout");
  const lockoutOk = validateNoSelfLockout(
    { DeptA: { machines: ["M1", "M2"], equipments: ["E1"], envs: [] } },
    ["DeptA"],
    machines,
    equips,
    envs,
  );
  assert(lockoutOk.ok, "Deleting sub-department while base retains coverage must succeed");

  const testFactories = [
    { machines: ["M1", "M2"], equipments: ["E1"], envs: [] },
    { machines: ["M9"], equipments: ["E9"], envs: [] },
  ];
  assert(
    JSON.stringify(getAccessibleFactoryIndices(testFactories, { M1: "Machine 1" }, {}, {}, false)) === "[0]",
    "Single sub-factory access must only return [0]",
  );
  assert(
    JSON.stringify(getAccessibleFactoryIndices(testFactories, { M1: "Machine 1", M9: "Machine 9" }, {}, {}, false)) === "[0,1]",
    "Multi sub-factory access must return [0,1]",
  );
  assert(
    Object.keys(getScopedAssetMap(machines, testFactories[0], "machines")).length === 2 &&
      Object.keys(getScopedAssetMap({ M1: "Machine 1", M9: "Machine 9" }, testFactories[0], "machines")).length === 1,
    "getScopedAssetMap must intersect with selected factory",
  );
  assert(
    Object.keys(
      filterDepartmentsForView(
        { A: { machines: ["M1"] }, B: { machines: ["M9"] } },
        ["A", "B"],
        false,
        testFactories[0],
        "machines",
      ),
    ).join(",") === "A",
    "filterDepartmentsForView must exclude departments outside selected factory",
  );
  assert(
    isActivityInScope({ name: "Machine 1", title: "Machine $NAME$ is now $STATE$." }, { M1: "Machine 1" }, {}) &&
      !isActivityInScope({ name: "Machine 9", title: "Machine $NAME$ is now $STATE$." }, { M1: "Machine 1" }, {}) &&
      !isActivityInScope({ name: "Machine 1", title: "Equipment $NAME$ is now $STATE$." }, { M1: "Machine 1" }, {}),
    "isActivityInScope must match asset type and name within scope",
  );
};
runSelfCheck();
