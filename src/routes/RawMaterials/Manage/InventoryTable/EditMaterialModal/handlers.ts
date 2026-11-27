import dayjs from "../../../../../Components/Functions/dayjs";
import {
  update as FBUpdate,
  remove,
} from "../../../../../Components/firebase/api/db";
import logger from "../../../../../Components/micro/logger";
import store from "../../../../../Components/Store";
import { departmentAtom, uidAtom } from "../../../../../Components/Store/atoms";
import { canWriteOperational, isMasterOwner } from "../../../../../Services/rbac";

const canMutateMaterialId = (id: string): boolean => {
  if (!canWriteOperational()) return false;
  const uid = store.get(uidAtom);
  const userDepts = store.get(departmentAtom) || [];
  if (isMasterOwner(uid) || userDepts.includes("all")) return true;
  const dept = id.match(/\(([^)]+)\)$/)?.[1]?.toLowerCase();
  return Boolean(dept && userDepts.some((d) => d.toLowerCase() === dept));
};

const update = async (
  id: string,
  name: string,
  action: "set" | "add",
  quantity: number,
  setError: (e: string | null) => void,
  setLoading: (e: string | null) => void,
  toast: any,
): Promise<boolean> => {
  if (!canMutateMaterialId(id)) {
    toast({
      title: "Unauthorized",
      description: "You do not have permission to update this material.",
      status: "error",
      duration: 5000,
      isClosable: true,
    });
    return false;
  }
  if (action === "set" && quantity < 1) {
    setError("Quantity must be greater than 0");
    return false;
  } else {
    setLoading("Updating material...");
    setError(null);
    try {
      const payload = {
        name,
        consumed: 0,
        remaining: quantity,
        dateUpdated: dayjs().unix(),
      };
      logger("update-material", {
        material: name,
        data: payload,
      });
      await FBUpdate(`materials/inventory/${id}`, payload);
      toast({
        title: "Success",
        description: "Material added successfully",
        status: "success",
        duration: 5000,
        isClosable: true,
      });
      setLoading(null);
      return true;
    } catch (e: any) {
      toast({
        title: "Error",
        description: e.message,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
      return false;
    }
  }
};

const deleteMaterial = async (
  id: string,
  name: string,
  setLoading: (e: string | null) => void,
  toast: any,
): Promise<boolean> => {
  if (!canMutateMaterialId(id)) {
    toast({
      title: "Unauthorized",
      description: "You do not have permission to delete this material.",
      status: "error",
      duration: 5000,
      isClosable: true,
    });
    return false;
  }
  try {
    setLoading("Deleting material...");
    logger("delete-material", {
      material: name,
      data: null,
    });
    await remove(`materials/inventory/${id}`);
    toast({
      title: "Success",
      description: "Material deleted successfully",
      status: "success",
      duration: 5000,
      isClosable: true,
    });
    setLoading(null);
    return true;
  } catch (e: any) {
    toast({
      title: "Error",
      description: e.message,
      status: "error",
      duration: 5000,
      isClosable: true,
    });
    setLoading(null);
    return false;
  }
};

export { update, deleteMaterial };
