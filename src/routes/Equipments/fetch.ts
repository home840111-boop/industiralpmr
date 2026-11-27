import dayjs from "../../Components/Functions/dayjs";
import { selectedFactoryType } from ".";
import { get } from "../../Components/firebase/api/db";
import store from "../../Components/Store";
import { equipmentsAtom, offlineTimeAtom } from "../../Components/Store/atoms";
import minifiedSecFormatter from "../../Components/Functions/formatters/minifiedSecFormatter";

interface RawEquipmentType {
  [key: string]: {
    id: string;
    realtimeKW: {
      current: number;
      change: number;
    };
    name: string;
    status: "ON" | "OFF" | "IDLE" | "NA";
    statusSince: number;
    updated: number;
    // report
    electricity: number;
    sessions: number;
    ontime: number;
    isUpToDate: true | string;
  };
}

const fetch = async (
  date: string,
  factories: any,
  selectedFactory: selectedFactoryType,
) => {
  try {
    const mySelectedFactory: any = factories[selectedFactory.value];
    const snap = await get(`equipments`);
    const equipmentsAllowed = store.get(equipmentsAtom);
    const offlineTime = store.get(offlineTimeAtom);
    if (!snap.exists()) return "NOT_FOUND";
    const equipments = snap.val() || {};
    const equipmentKeys = Object.keys(equipments).filter(
      (key) =>
        (mySelectedFactory === undefined ||
          mySelectedFactory?.equipments?.includes(key)) &&
        (!equipmentsAllowed || equipmentsAllowed[key]),
    );
    const promises = [];
    promises.push(get(`units`));
    const equipmentsToSend: RawEquipmentType = {};
    for await (const equipmentKey of equipmentKeys) {
      const equipment = equipments[equipmentKey];
      promises.push(get(`reports/equipments/${equipmentKey}/daily/${date}`));
      const realtimeKW = equipment.realtime_kw || {
        current: 0,
        previous: 0,
      };
      equipmentsToSend[equipmentKey] = {
        id: equipmentKey,
        name: equipment.name,
        realtimeKW: {
          current: +realtimeKW.current.toFixed(2),
          change: +(
            ((realtimeKW.current - realtimeKW.previous) / realtimeKW.previous) *
              100 || 0
          ).toFixed(0),
        },
        status: "NA",
        statusSince: dayjs(equipment.at).unix(),
        updated: dayjs(equipment.updated).unix(),
        electricity: 0,
        sessions: 0,
        ontime: 0,
        isUpToDate: true,
      };
    }
    const [unitsSnap, ...todayEquipmentsSnap] = await Promise.all(promises);
    const units = Object.fromEntries(
      Object.entries(unitsSnap.val() || {}).map((unit: any) => {
        const { lastContact } = unit[1];
        const diff = dayjs().diff(dayjs.unix(lastContact || 0), "minute");
        const connected = diff <= offlineTime;
        return [unit[0], { ...unit[1], connected }];
      }),
    );
    let index = 0;
    for await (const equipmentKey of equipmentKeys) {
      const equipment = equipments[equipmentKey];
      const todayEquipmentSnap = todayEquipmentsSnap[index++];
      const unit = units[equipment.unit || 1];
      const { uploadedTil } = unit;
      const isUpToDate = (() => {
        if (uploadedTil === undefined) return true;
        const uploadedTilDate = dayjs(uploadedTil);
        const now = dayjs();
        // how far behind the data is
        const diff = now.diff(uploadedTilDate, "second");
        return minifiedSecFormatter(diff) + " behind";
      })();
      equipmentsToSend[equipmentKey].isUpToDate = isUpToDate;
      const status = unit?.connected
        ? equipment.status
          ? "ON"
          : "IDLE"
        : unit?.cleanDisconnect
        ? "OFF"
        : "NA";
      equipmentsToSend[equipmentKey].status = status;
      if (!todayEquipmentSnap.exists()) continue;
      const todayEquipment = todayEquipmentSnap.val() || {};
      equipmentsToSend[equipmentKey].electricity =
        todayEquipment.electricity_usage || 0;
      equipmentsToSend[equipmentKey].sessions =
        todayEquipment.total_sessions === undefined
          ? todayEquipment.ontime
            ? 1
            : 0
          : todayEquipment.total_sessions;
      equipmentsToSend[equipmentKey].ontime = todayEquipment.ontime || 0;
    }
    return equipmentsToSend;
  } catch (err) {
    console.log(err);
    return "NOT_FOUND";
  }
};

export type { RawEquipmentType };
export default fetch;
