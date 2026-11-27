import { sendPasswordResetEmail } from "firebase/auth";
import { z } from "zod";
import { auth } from "../../../../Components/firebase";
import { get } from "../../../../Components/firebase/api/db";
import logger from "../../../../Components/micro/logger";
import store from "../../../../Components/Store";
import { baseDepartmentAtom, departmentsAtom, uidAtom } from "../../../../Components/Store/atoms";
import {
  canManageSubUser,
  getManageableDepartmentNames,
  isAdminUser,
  isMasterOwner,
  toIdArray,
} from "../../../../Services/rbac";

const formSchema = z.object({
  name: z.string().min(1).max(50),
  email: z.string().email(),
  department: z.string().min(1),
  role: z.enum(["viewer", "editor", "admin"]),
  disabled: z.boolean(),
});

const sendResetEmail = async (email: string) => {
  await sendPasswordResetEmail(auth, email);
};

const verifyTargetSubUserInScope = async (
  uid: string,
  masterUid: string | null,
): Promise<{ ok: boolean; reason?: string }> => {
  if (!isAdminUser(masterUid)) {
    return { ok: false, reason: "Unauthorized: Admin access required." };
  }
  const callerIsMaster = isMasterOwner(masterUid);
  if (callerIsMaster) return { ok: true };

  if (auth.currentUser?.uid === uid) {
    return { ok: false, reason: "You cannot modify your own account." };
  }
  const targetSnap = await get(`sub-users/${uid}`);
  if (!targetSnap.exists()) {
    return { ok: false, reason: "Target user not found." };
  }
  const targetData = targetSnap.val() || {};
  const baseDepts = store.get(baseDepartmentAtom) || [];
  const callerHasAll = baseDepts.includes("all");
  const manageableDepts = getManageableDepartmentNames(store.get(departmentsAtom));

  const allowed = canManageSubUser(
    {
      uid,
      role: String(targetData.role || "viewer"),
      department: toIdArray(targetData.department),
    },
    manageableDepts,
    false,
    callerHasAll,
  );
  if (!allowed) {
    return {
      ok: false,
      reason: "You do not have permission to manage this user.",
    };
  }
  return { ok: true };
};

const validateEditUser = (form: FormData, setErrors: Function): boolean => {
  const formData = {
    name: form.get("name"),
    email: form.get("email"),
    department: form.get("department"),
    role: form.get("role"),
    disabled: form.get("disabled") === null,
  };

  const resp = formSchema.safeParse(formData);

  if (!resp.success) {
    const errors = resp.error.format();
    setErrors({
      name: errors.name?._errors.join(", ") || null,
      email: errors.email?._errors.join(", ") || null,
      department: errors.department?._errors.join(", ") || null,
      role: errors.role?._errors.join(", ") || null,
      disabled: errors.disabled?._errors.join(", ") || null,
    });
    return false;
  }

  const masterUid = store.get(uidAtom);
  const callerIsMaster = isMasterOwner(masterUid);
  const baseDepts = store.get(baseDepartmentAtom) || [];
  const callerHasAll = callerIsMaster || baseDepts.includes("all");
  const manageableDepts = getManageableDepartmentNames(store.get(departmentsAtom));
  const depts = ((formData.department as string) || "").split("||").filter(Boolean);

  if (!callerIsMaster && formData.role === "admin") {
    setErrors({
      name: null,
      email: null,
      department: null,
      role: "Only the Master user can assign the Admin role.",
      disabled: null,
    });
    return false;
  }

  if (
    depts.length === 0 ||
    (!callerHasAll && (depts.includes("all") || !depts.every((d) => manageableDepts.includes(d))))
  ) {
    setErrors({
      name: null,
      email: null,
      department: "You can only assign departments within your access scope.",
      role: null,
      disabled: null,
    });
    return false;
  }

  setErrors({
    name: null,
    email: null,
    department: null,
    role: null,
    disabled: null,
  });
  return true;
};

const editUser = async (
  form: FormData,
  onClose: Function,
  setErrors: Function,
  setLoading: Function,
  toast: Function,
  refetch: any,
  uid: string,
) => {
  if (!validateEditUser(form, setErrors)) return;

  const formData = {
    name: form.get("name"),
    email: form.get("email"),
    department: form.get("department"),
    role: form.get("role"),
    disabled: form.get("disabled") === null,
  };
  const masterUid = store.get(uidAtom);
  const depts = ((formData.department as string) || "").split("||").filter(Boolean);

  setLoading("Updating user");
  try {
    const scopeCheck = await verifyTargetSubUserInScope(uid, masterUid);
    if (!scopeCheck.ok) {
      throw new Error(scopeCheck.reason || "Permission Denied");
    }

    const data = {
      ...formData,
      department: depts,
      masterUid,
    };
    const URL = `${
      process.env[`REACT_APP_${process.env.NODE_ENV.toUpperCase()}_API_URL`]
    }/sub-user/${uid}`;
    logger("update-user", {
      data,
    });
    for (let i = 0; i < 3; i++) {
      try {
        const resp = await fetch(URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        });
        const respJson = await resp.json();
        if (resp.ok) break;
        else
          throw new Error(
            respJson?.message ? respJson?.message : "Something went wrong",
          );
      } catch (err: any) {
        if (i === 2) throw err;
        else setLoading("Retrying");
        console.error(err);
      }
    }
    setLoading(null);
    onClose();
    toast({
      title: "User updated",
      description: "User has been updated",
      status: "success",
      duration: 3000,
      position: "bottom",
      isClosable: true,
    });
    refetch((prev: boolean) => !prev);
  } catch (err: any) {
    setLoading(null);
    console.error(err);
    toast({
      title: "Error",
      description: err?.message || "something went wrong",
      status: "error",
      duration: 3000,
      position: "bottom",
      isClosable: true,
    });
  }
};

const deleteUser = async (uid: string, setLoading: Function) => {
  setLoading("Deleting user");
  try {
    const masterUid = store.get(uidAtom);
    const scopeCheck = await verifyTargetSubUserInScope(uid, masterUid);
    if (!scopeCheck.ok) {
      throw new Error(scopeCheck.reason || "Permission Denied");
    }

    const URL = `${
      process.env[`REACT_APP_${process.env.NODE_ENV.toUpperCase()}_API_URL`]
    }/sub-user/${uid}`;
    logger("delete-user", {
      uid,
    });

    for (let i = 0; i < 3; i++) {
      try {
        const resp = await fetch(URL, {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ masterUid }),
        });
        const respJson = await resp.json();
        if (resp.ok) break;
        else
          throw new Error(
            respJson?.message ? respJson?.message : "Something went wrong",
          );
      } catch (err: any) {
        if (i === 2) throw err;
        else setLoading("Retrying");
        console.error(err);
      }
    }

    setLoading(null);
    return "OK";
  } catch (err: any) {
    setLoading(null);
    console.error(err);
    throw new Error(err?.message || "something went wrong");
  }
};

export { sendResetEmail, validateEditUser, editUser, deleteUser };
