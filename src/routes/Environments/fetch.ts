import { RawEnvironmentType, selectedFactoryType } from ".";
import { get } from "../../Components/firebase/api/db";
import dayjs from "../../Components/Functions/dayjs";
import duration from "dayjs/plugin/duration";
import relativeTime from "dayjs/plugin/relativeTime";
import store from "../../Components/Store";
import { EnvUnitListAtom, offlineTimeAtom } from "../../Components/Store/atoms";
import minifiedSecFormatter from "../../Components/Functions/formatters/minifiedSecFormatter";
dayjs.extend(duration);
dayjs.extend(relativeTime);

const fetch = async (
  date: string,
  envList: {
    [key: string]: string;
  },
  factories: any[],
  selectedFactory: selectedFactoryType,
): Promise<RawEnvironmentType | "NOT_FOUND"> => {
  const mySelectedFactory: any = factories[selectedFactory.value];
  const toReturn: RawEnvironmentType = {};
  if (Object.keys(envList).length === 0) return "NOT_FOUND";
  const envUnits = store.get(EnvUnitListAtom) || {};
  const offlineTime = store.get(offlineTimeAtom);
  const envs = envList;
  let promises = [];
  for (const key in envs) {
    if (mySelectedFactory && !mySelectedFactory?.envs.includes(key)) continue;
    promises.push(get(`reports/env/${key}/now`));
    promises.push(get(`reports/env/${key}/daily/${date}`));
  }
  const snaps = await Promise.all(promises);
  promises = [];
  const envsWUnitData: any = {};
  for (const [env, unit] of Object.entries(envUnits)) {
    envsWUnitData[env] = {
      unit,
    };
    promises.push(get(`units/${unit}`));
  }
  const units = await Promise.all(promises);
  for (let i = 0; i < units.length; i++) {
    envsWUnitData[Object.keys(envUnits)[i]] = {
      ...envsWUnitData[Object.keys(envUnits)[i]],
      ...(units[i].val() || {}),
    };
  }
  for (let i = 0; i < snaps.length; i += 2) {
    const now = snaps[i].val();
    const daily = snaps[i + 1].val() || {
      temperature: {
        max: 0,
        min: 0,
        avg: 0,
      },
      humidity: {
        max: 0,
        min: 0,
        avg: 0,
      },
    };
    if (!now) continue;
    const key = snaps[i].ref.parent?.key || "";
    const { lastContact, uploadedTil } = envsWUnitData[key];
    const isUpToDate = (() => {
      if (uploadedTil === undefined) return true;
      const uploadedTilDate = dayjs(uploadedTil);
      const now = dayjs();
      // how far behind the data is
      const diff = now.diff(uploadedTilDate, "second");
      return minifiedSecFormatter(diff) + " behind";
    })();
    const diff = dayjs().diff(dayjs.unix(lastContact || 0), "minute");
    const connected = diff <= offlineTime;
    toReturn[key] = {
      id: key,
      name: envs[key],
      updated: now.updated,
      isOnline: connected,
      now: {
        temperature: now.temperature,
        humidity: now.humidity,
      },
      today: daily,
      isUpToDate,
      unit: "UNIT#" + String(envsWUnitData[key].unit).padStart(2, "0"),
    };
  }
  if (Object.keys(toReturn).length === 0) return "NOT_FOUND";
  return toReturn;
};

export default fetch;
