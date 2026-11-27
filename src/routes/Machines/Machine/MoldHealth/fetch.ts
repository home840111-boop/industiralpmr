import { MoldHealthProps } from ".";
import { get } from "../../../../Components/firebase/api/db";
import { MoldType } from "../MoldsManager/AddMold";

const fetch = async (machineID: string): Promise<MoldHealthProps[]> => {
  const promises = [get(`molds/${machineID}`), get(`mold-life/${machineID}`)];
  const [moldSnap, moldLifeSnap] = await Promise.all(promises);
  const molds: {
    [moldName: string]: Omit<MoldType, "mold">;
  } = moldSnap.val() || {};
  const toReturn: MoldHealthProps[] = [];
  const moldLife = moldLifeSnap.val() || {};
  for (const moldID in molds) {
    const mold = molds[moldID];
    const moldLifeData: {
      consumed: number;
      lastUsed: string;
    } = moldLife[moldID] || {
      consumed: 0,
      lastUsed: "Never",
    };
    // if consumed 90% of life or more, then status is WARNING
    // if consumed 100% of life or more, then status is CRITICAL
    // if consumed less than 90% of life, then status is HEALTHY
    const status =
      mold.moldLife === 0
        ? "HEALTHY"
        : moldLifeData.consumed >= mold.moldLife * 1
        ? "CRITICAL"
        : moldLifeData.consumed >= mold.moldLife * 0.9
        ? "WARNING"
        : "HEALTHY";
    toReturn.push({
      name: moldID,
      consumed: moldLifeData.consumed,
      lastUsed: moldLifeData.lastUsed,
      life: mold.moldLife,
      status,
    });
  }
  return toReturn;
};

export default fetch;
