import { EquipmentData } from ".";
import logger from "../../../Components/micro/logger";
import sendDataRest from "../../../Components/micro/sendDataRest";
import store from "../../../Components/Store";
import { uidAtom } from "../../../Components/Store/atoms";

const save = async (equipment: EquipmentData): Promise<number> => {
  const payload = {
    name: equipment.name,
  };
  const uid = store.get(uidAtom);
  if (!uid) throw new Error("No user logged in");
  const response = await sendDataRest(equipment.unit, [
    "equipment",
    equipment.id,
    payload,
    undefined,
  ]);
  logger("update-equipment", {
    data: payload,
    equipment: equipment.id,
  });
  if (response === 401) throw new Error("Permission Denied");
  return response;
};

export default save;
