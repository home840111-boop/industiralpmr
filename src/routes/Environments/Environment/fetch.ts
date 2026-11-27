import {
  endAt,
  orderByKey,
  startAt,
  get as firebaseGet,
  query,
  ref,
} from "firebase/database";
import { EnvironmentData } from ".";
import { db } from "../../../Components/firebase";
import { get } from "../../../Components/firebase/api/db";
import dayjs from "../../../Components/Functions/dayjs";
import minifiedSecFormatter from "../../../Components/Functions/formatters/minifiedSecFormatter";
import store from "../../../Components/Store";
import {
  EnvListAtom,
  EnvUnitListAtom,
  offlineTimeAtom,
  uidAtom,
} from "../../../Components/Store/atoms";

const fetch = async (
  date: string,
  name: string | undefined,
  environmentID: string,
): Promise<EnvironmentData | "NOT_FOUND"> => {
  // last 7 days start and end date
  const envs = store.get(EnvListAtom) || {};
  const offlineTime = store.get(offlineTimeAtom);
  if (envs[environmentID] === undefined) return "NOT_FOUND";
  const dates = [dayjs(date).subtract(7, "day").format("YYYY-MM-DD"), date];
  const uid = store.get(uidAtom);
  const envUnits = store.get(EnvUnitListAtom) || {};
  const promises = [get(`units/${envUnits[environmentID] || 1}`)];
  promises.push(get(`reports/env/${environmentID}/now`));
  promises.push(get(`reports/env/${environmentID}/hourly/${date}`));
  promises.push(
    firebaseGet(
      query(
        ref(db, `users/${uid}/reports/env/${environmentID}/daily`),
        orderByKey(),
        startAt(dates[0]),
        endAt(dates[1]),
      ),
    ),
  );
  const [unitSnap, nowSnap, hourlySnap, last7DaysSnap] = await Promise.all(
    promises,
  );
  const unit = unitSnap.val() || {};
  const now = nowSnap.val();
  if (!now || !name) return "NOT_FOUND";
  const lastFewDays: EnvironmentData["last7Days"] = last7DaysSnap.val();
  const daily = Object.values(lastFewDays || {})[0] || {
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
  if (lastFewDays) delete lastFewDays[date]; //now will be last 7 days
  const hourly: EnvironmentData["hourly"] = hourlySnap.exists()
    ? Object.values(hourlySnap.val()).map((data: any) => {
        return {
          time: `${data.temperature.start}-${data.temperature.end}`,
          temperature: {
            max: data.temperature.hourlyMax,
            min: data.temperature.hourlyMin,
            avg: data.temperature.hourlyAvg,
          },
          humidity: {
            max: data.humidity.hourlyMax,
            min: data.humidity.hourlyMin,
            avg: data.humidity.hourlyAvg,
          },
        };
      })
    : null;
  const { lastContact, uploadedTil } = unit;
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
  const data: EnvironmentData = {
    id: environmentID,
    name: name,
    updated: now.updated,
    isOnline: connected,
    now: {
      temperature: now.temperature,
      humidity: now.humidity,
    },
    today: daily,
    hourly: hourly,
    last7Days: Object.keys(lastFewDays || {}).length === 0 ? null : lastFewDays,
    isUpToDate,
    unit: "UNIT#" + String(envUnits[environmentID]).padStart(2, "0"),
  };
  return data;
};

export default fetch;
