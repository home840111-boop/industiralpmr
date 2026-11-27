import {
  endAt,
  orderByKey,
  query,
  ref,
  startAt,
  get as firebaseGet,
} from "firebase/database";
import { db } from "../../../Components/firebase";
import store from "../../../Components/Store";
import { uidAtom } from "../../../Components/Store/atoms";

const fetch = async (duration: {
  from?: string;
  to?: string;
}): Promise<null | DataToSet> => {
  if (!duration.to) duration.to = duration.from;
  const promises = [];
  const uid = store.get(uidAtom);
  promises.push(
    firebaseGet(
      query(
        ref(db, `users/${uid}/production-targets/statistics`),
        orderByKey(),
        startAt(duration.from),
        endAt(duration.to || ""),
      ),
    ),
  );
  const [snap] = await Promise.all(promises);
  const data = snap.val() || {};
  console.log("🚀 ~ data:", data)
  const dataToSet: DataToSet = {
    unitsProduced: {
        current: 0,
        total: 0,
        progress: 0,
        days: []
    }
  };
  for (const _monthData of Object.values(data)) {
    const monthData = _monthData as any;
    for (const machineData of Object.values(monthData?.machines || {})) {
        for (const _moldData of Object.values(machineData || {})) {
            const moldData = _moldData as any;
            dataToSet.unitsProduced.current += moldData?.current || 0;
            dataToSet.unitsProduced.total += moldData?.total || 0;
        }
    }
  }
  const progress = (!dataToSet.unitsProduced.current || !dataToSet.unitsProduced.total) ? 0 : (dataToSet.unitsProduced.current / dataToSet.unitsProduced.total) * 100;
  dataToSet.unitsProduced.progress = progress;
  return dataToSet;
};

interface DataToSet {
  unitsProduced: {
    current: number;
    total: number;
    progress: number; //percentage
    days: {
      name: string;
      value: number; //produced
    }[];
  };
}

export default fetch;
export type { DataToSet };
