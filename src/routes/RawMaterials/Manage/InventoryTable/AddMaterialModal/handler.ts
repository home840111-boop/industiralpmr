import { z } from "zod";
import { get, update } from "../../../../../Components/firebase/api/db";
import dayjs from "../../../../../Components/Functions/dayjs";
import logger from "../../../../../Components/micro/logger";
import store from "../../../../../Components/Store";
import { departmentAtom, uidAtom } from "../../../../../Components/Store/atoms";
import { canWriteOperational, isMasterOwner } from "../../../../../Services/rbac";

const formSchema = z.object({
  name: z
    .string()
    .min(1)
    .max(50)
    .refine((name) => {
      // eslint-disable-next-line
      const specials = /[!@#$%^&*()+\=\[\]{};':"\\|,.<>\/?]+/;
      return !specials.test(name);
    }, "Special characters are not allowed."),
  quantityAmount: z.string().min(1),
  pc_weight: z.number().min(1),
  quantity: z.number().min(1),
});

const handler = async (
  form: FormData,
  setErrors: (error: {
    name: null | string;
    quantityAmount: null | string;
    pc_weight: null | string;
    quantity: null | string;
  }) => void,
  setLoading: (state: string | null) => void,
  toast: any,
): Promise<boolean> => {
  if (!canWriteOperational()) {
    toast({
      title: "Unauthorized",
      description: "You do not have permission to add raw materials.",
      status: "error",
      duration: 5000,
      isClosable: true,
    });
    return false;
  }
  const type = form.get("quantity-type") as "weight" | "custom";
  const formData = {
    name: form.get("name"),
    quantityAmount: type === "weight" ? form.get("quantity-amount") : "NULL",
    quantity: parseInt(String(form.get("quantity") || 0)),
    pc_weight: type === "custom" ? parseFloat(String(form.get("pc_weight"))) : 1,
  };
  const results = formSchema.safeParse(formData);
  if (!results.success) {
    const errors = results.error.format();
    setErrors({
      name: errors.name?._errors.join(", ") || null,
      quantityAmount: errors.quantityAmount?._errors.join(", ") || null,
      pc_weight: errors.pc_weight?._errors.join(", ") || null,
      quantity: errors.quantity?._errors.join(", ") || null,
    });
    return false;
  } else {
    setErrors({
      name: null,
      quantityAmount: null,
      pc_weight: null,
      quantity: null,
    });
    setLoading("Adding material...");
    try {
      const name = (formData.name as string).trim().toLowerCase();
      const quantity = parseInt(String(form.get("quantity") || 1));
      const quantityAmount = formData.quantityAmount as string;
      const pc_weight = +formData.pc_weight;
      const department = (
        (form.get("department") as string) || ""
      ).toLowerCase();
      const uid = store.get(uidAtom);
      const userDepts = store.get(departmentAtom) || [];
      const hasAll = isMasterOwner(uid) || userDepts.includes("all");
      const allowedLower = userDepts.map((d) => d.toLowerCase());
      if (!hasAll && (!department || !allowedLower.includes(department))) {
        toast({
          title: "Unauthorized",
          description: "You can only add materials to your assigned departments.",
          status: "error",
          duration: 5000,
          isClosable: true,
        });
        setLoading(null);
        return false;
      }
      const remaining =
        type === "weight"
          ? quantity * (quantityAmount === "bag" ? 25 : 1)
          : (quantity * pc_weight) / 1000;
      const payload = {
        name,
        consumed: 0,
        remaining,
        pc_weight: type === "custom" ? pc_weight / 1000 : null,
        dateUpdated: dayjs().unix(),
      };
      const id = department ? `${name}(${department})` : name;
      const snap = await get(`materials/inventory/${id}`);
      if (snap.exists()) {
        toast({
          title: "Error",
          description: "Material already exists",
          status: "error",
          duration: 5000,
          isClosable: true,
        });
        setLoading(null);
        return false;
      } else {
        logger("add-material", {
          material: id,
          data: payload,
        });
        await update(`materials/inventory/${id}`, payload);
        toast({
          title: "Success",
          description: "Material added successfully",
          status: "success",
          duration: 5000,
          isClosable: true,
        });
        setLoading(null);
        return true;
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
    setLoading(null);
    return false;
  }
};
export default handler;
