import { EquipmentsData } from ".";
import { get } from "../../../Components/firebase/api/db";
import store from "../../../Components/Store";
import { equipmentsAtom } from "../../../Components/Store/atoms";
import { isMasterOwner } from "../../../Services/rbac";

const fetch = async (factory: any) => {
  const promises = [get("equipments")];
  const [equipmentsSnap] = await Promise.all(promises);
  const equipments = equipmentsSnap.val() || {};
  const restrictScope = !isMasterOwner();
  const allowedEquipments = store.get(equipmentsAtom) || {};
  const equipmentsToSend: EquipmentsData = {};
  for await (const [machineID, _machine] of Object.entries(equipments)) {
    if (restrictScope && !allowedEquipments[machineID]) continue;
    if (factory && !factory.equipments?.includes(machineID)) continue;
    const equipment = _machine as any;
    equipmentsToSend[machineID] = {
      id: machineID,
      name: equipment.name,
      unit: equipment.unit || 1,
    };
  }
  return equipmentsToSend;
};

export default fetch;
