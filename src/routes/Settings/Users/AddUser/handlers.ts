import { z } from "zod";
import logger from "../../../../Components/micro/logger";
import store from "../../../../Components/Store";
import { baseDepartmentAtom, departmentsAtom, uidAtom } from "../../../../Components/Store/atoms";
import {
  getManageableDepartmentNames,
  isAdminUser,
  isMasterOwner,
} from "../../../../Services/rbac";

const formSchema = z
  .object({
    name: z.string().min(1).max(50),
    email: z
      .string()
      .email()
      .refine((email) => {
        const domain = email.split("@")[1];
        return domain !== "industrialpmr.com";
      }, "You cannot use this email address, contact support."),
    department: z.string().min(1),
    role: z.enum(["viewer", "editor", "admin"]),
    password: z.string().min(6),
    confirmPassword: z.string().min(6),
  })
  .superRefine(({ password, confirmPassword }, ctx) => {
    if (password !== confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Passwords do not match",
        path: ["confirmPassword"],
      });
    }
  });

const forgotPassSchema = z.object({
  email: z
    .string()
    .email()
    .refine((email) => {
      const domain = email.split("@")[1];
      return domain !== "industrialpmr.com";
    }, "You cannot reset your password with this email address, contact support."),
});

const validateUserCreationRbac = (
  role: string,
  departments: string[],
): { roleError: string | null; deptError: string | null } => {
  const masterUid = store.get(uidAtom);
  if (!isAdminUser(masterUid)) {
    return {
      roleError: "Unauthorized: Admin access required.",
      deptError: "Unauthorized: Admin access required.",
    };
  }
  const callerIsMaster = isMasterOwner(masterUid);
  const baseDepts = store.get(baseDepartmentAtom) || [];
  const callerHasAll = callerIsMaster || baseDepts.includes("all");
  const manageableDepts = getManageableDepartmentNames(store.get(departmentsAtom));

  let roleError: string | null = null;
  let deptError: string | null = null;

  if (!callerIsMaster && role === "admin") {
    roleError = "Only the Master user can create Admin users.";
  }

  if (departments.length === 0) {
    deptError = "At least one department is required.";
  } else if (!callerHasAll) {
    if (departments.includes("all") || !departments.every((d) => manageableDepts.includes(d))) {
      deptError = "You can only assign departments within your access scope.";
    }
  }

  return { roleError, deptError };
};

const verify = async (
  form: FormData,
  onClose: Function,
  onOpen: Function,
  setErrors: Function,
  setLoading: Function,
) => {
  const formData = {
    name: form.get("name"),
    email: form.get("email"),
    department: form.get("department"),
    role: form.get("role"),
    password: form.get("password"),
    confirmPassword: form.get("confirmPassword"),
  };
  const results = formSchema.safeParse(formData);
  if (!results.success) {
    const errors = results.error.format();
    setErrors({
      name: errors.name?._errors.join(", ") || null,
      email: errors.email?._errors.join(", ") || null,
      department: errors.department?._errors.join(", ") || null,
      role: errors.role?._errors.join(", ") || null,
      password: errors.password?._errors.join(", ") || null,
      confirmPassword: errors.confirmPassword?._errors.join(", ") || null,
    });
    return;
  }

  const depts = (results.data.department || "").split("||").filter(Boolean);
  const { roleError, deptError } = validateUserCreationRbac(results.data.role, depts);
  if (roleError || deptError) {
    setErrors({
      name: null,
      email: null,
      department: deptError,
      role: roleError,
      password: null,
      confirmPassword: null,
    });
    return;
  }

  setErrors({
    name: null,
    email: null,
    department: null,
    role: null,
    password: null,
    confirmPassword: null,
  });
  onClose();
  setLoading(null);
  onOpen();
};

const createUser = async (
  setLoading: Function,
  form: FormData,
): Promise<string> => {
  setLoading("Creating user");
  try {
    const masterUid = store.get(uidAtom);
    if (!masterUid) throw new Error("No master uid found");
    const role = (form.get("role") as string) || "";
    const department = ((form.get("department") as string) || "")
      .split("||")
      .filter(Boolean);

    const { roleError, deptError } = validateUserCreationRbac(role, department);
    if (roleError || deptError) {
      throw new Error(roleError || deptError || "Unauthorized");
    }

    const formData = {
      masterUid,
      name: form.get("name"),
      email: form.get("email"),
      department,
      role,
      password: form.get("password"),
    };
    const URL =
      process.env[`REACT_APP_${process.env.NODE_ENV.toUpperCase()}_API_URL`];
    const { password: _omitted, ...safeLogData } = formData;
    logger("add-user", {
      data: safeLogData,
    });
    for (let i = 0; i < 3; i++) {
      try {
        const resp = await fetch(`${URL}/create-user`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(formData),
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
    return "OK";
  } finally {
    setLoading(null);
  }
};

export { verify, createUser, forgotPassSchema };