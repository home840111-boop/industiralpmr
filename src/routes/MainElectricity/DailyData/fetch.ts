import { DailyElectricityData } from ".";
import { get } from "../../../Components/firebase/api/db";
import dayjs from "../../../Components/Functions/dayjs";

const fetch = async (
  date: string,
  data: DailyElectricityData | null,
  hasMeter: boolean,
) => {
  const _data: DailyElectricityData = {
    today: {
      total: 0,
      average: 0,
      max: {
        name: "",
        value: 0,
      },
      min: {
        name: "",
        value: 0,
      },
      breakdown: {
        names: [],
        values: [],
      },
    },
    yesterday: {
      total: 0,
      average: 0,
      max: {
        name: "",
        value: 0,
      },
      min: {
        name: "",
        value: 0,
      },
      breakdown: {
        names: [],
        values: [],
      },
    },
    unit: "Unit#01",
    realtimeKW: {
      current: 0,
      change: 0,
    },
    lastUpdated: 0,
  };
  const prevDate = dayjs(date).subtract(1, "day").format("YYYY-MM-DD");
  if (!hasMeter) {
    // create demo random data
    _data.today.total = Math.floor(Math.random() * 1000);
    _data.today.average = Math.floor(Math.random() * 1000);
    _data.today.max = {
      name: "00:00 - 01:00",
      value: Math.floor(Math.random() * 1000),
    };
    _data.today.min = {
      name: "01:00 - 02:00",
      value: Math.floor(Math.random() * 1000),
    };
    _data.yesterday.total = Math.floor(Math.random() * 1000);
    _data.yesterday.average = Math.floor(Math.random() * 1000);
    _data.yesterday.max = {
      name: "00:00 - 01:00",
      value: Math.floor(Math.random() * 1000),
    };
    _data.yesterday.min = {
      name: "01:00 - 02:00",
      value: Math.floor(Math.random() * 1000),
    };
    for (let i = 0; i < 24; i++) {
      _data.today.breakdown.names.push(`${i}:00 - ${i + 1}:00`);
      _data.today.breakdown.values.push(Math.floor(Math.random() * 1000));
      _data.yesterday.breakdown.names.push(`${i}:00 - ${i + 1}:00`);
      _data.yesterday.breakdown.values.push(Math.floor(Math.random() * 1000));
    }
    _data.lastUpdated = dayjs().unix();
    return _data;
  }
  const promises = [get(`simple_meter/daily/${date}`)];
  promises.push(get(`simple_meter/realtime_kw`));
  promises.push(get(`simple_meter/updated`));
  promises.push(get(`simple_meter/daily/${prevDate}`));
  if (data === null) {
    promises.push(get(`simple_meter/unit`));
  }
  const snaps = await Promise.all(promises);
  const today = snaps[0].val() || {};
  const realtimeKW = snaps[1].val() || {
    current: 0,
    previous: 0,
  };
  _data.realtimeKW = {
    current: +realtimeKW.current.toFixed(2),
    change: +(
      ((realtimeKW.current - realtimeKW.previous) / realtimeKW.previous) *
        100 || 0
    ).toFixed(0),
  };
  _data.lastUpdated = dayjs(snaps[2]?.val()).unix() || 0;
  const yesterday = snaps.at(3)?.val() || {};
  _data.unit =
    data?.unit || "Unit#" + String(snaps[4]?.val() || 1).padStart(2, "0");
  _data.today.total = today.total || 0;
  _data.today.average =
    today?.total && today?.hours?.length ? today.total / today.hours.length : 0;
  const todayMax = Object.values(today.hours || {}).reduce(
    (x: any, y: any) => {
      let acc = x;
      let cur = y;
      if (acc.value < cur.value) {
        acc = cur;
      }
      return acc;
    },
    { time: "", value: -Infinity },
  ) as {
    time: string;
    value: number;
  };
  const todayMin = Object.values(today.hours || {}).reduce(
    (x: any, y: any) => {
      let acc = x;
      let cur = y;
      if (acc.value > cur.value) {
        acc = cur;
      }
      return acc;
    },
    { time: "", value: Infinity },
  ) as {
    time: string;
    value: number;
  };
  _data.today.max = {
    name: todayMax.time,
    value: todayMax.value,
  };
  _data.today.min = {
    name: todayMin.time,
    value: todayMin.value,
  };

  _data.yesterday.total = yesterday?.total || 0;
  _data.yesterday.average =
    yesterday?.total && yesterday?.hours?.length
      ? yesterday.total / yesterday.hours.length
      : 0;
  const yesterdayMax = Object.values(yesterday.hours || {}).reduce(
    (x: any, y: any) => {
      let acc = x;
      let cur = y;
      if (acc.value < cur.value) {
        acc = cur;
      }
      return acc;
    },
    { time: "", value: -Infinity },
  ) as {
    time: string;
    value: number;
  };
  const yesterdayMin = Object.values(yesterday.hours || {}).reduce(
    (x: any, y: any) => {
      let acc = x;
      let cur = y;
      if (acc.value > cur.value) {
        acc = cur;
      }
      return acc;
    },
    { time: "", value: Infinity },
  ) as {
    time: string;
    value: number;
  };
  _data.yesterday.max = {
    name: yesterdayMax.time,
    value: yesterdayMax.value,
  };
  _data.yesterday.min = {
    name: yesterdayMin.time,
    value: yesterdayMin.value,
  };

  for await (const _hour of Object.values(today?.hours || {})) {
    const hour = _hour as any;
    if (!hour) continue;
    _data.today.breakdown.names.push(hour.time as string);
    _data.today.breakdown.values.push(hour.value as number);
  }
  for await (const _hour of Object.values(yesterday?.hours || {})) {
    const hour = _hour as any;
    if (!hour) continue;
    _data.yesterday.breakdown.names.push(hour.time as string);
    _data.yesterday.breakdown.values.push(hour.value as number);
  }
  return _data;
};

export default fetch;
