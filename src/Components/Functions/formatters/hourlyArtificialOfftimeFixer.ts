import insertUnitOffSessions from "./insertUnitOffSessions";
import secToTime from "../converters/secondsToHourMin";
import dayjs from "../dayjs";

const MAX_DIFF_THRESHOLD = 600;

const hourlyArtificialOfftimeFixer = async (
  shifts: {
    A: number;
    B: number;
    C: number;
    shifts: number;
  },
  hourlyData: any,
  date: string,
) => {
  const convertToUnix = (time: number) => {
    return dayjs.utc(
      `${+time >= 86400 ? dayjs(date, "YYYY-MM-DD").add(1, "day").format("YYYY-MM-DD") : date} ${secToTime(time)}`,
      "YYYY-MM-DD HH:mm:ss",
    ).unix();
  };

  const sortedHours = Object.values(hourlyData || {})
    .filter((h: any) => h && typeof h.from === "number" && typeof h.time === "number")
    .sort((a: any, b: any) => a.from - b.from);

  const newOfftimes: {
    [key: number]: {
      off: number;
      on: number;
    };
  } = {};

  if (sortedHours.length === 0) {
    const offUnix = convertToUnix(shifts.A);
    const onUnix = convertToUnix(shifts.A + 86400);
    newOfftimes[offUnix] = { off: offUnix, on: onUnix };
  } else {
    let lastEnd = shifts.A;
    const shiftEnd = shifts.A + 86400;

    sortedHours.forEach((hour: any) => {
      const start = hour.from;
      const end = hour.time;
      if (start - lastEnd > MAX_DIFF_THRESHOLD) {
        const offUnix = convertToUnix(lastEnd);
        const onUnix = convertToUnix(start);
        if (onUnix > offUnix) {
          newOfftimes[offUnix] = { off: offUnix, on: onUnix };
        }
      }
      lastEnd = Math.max(lastEnd, end);
    });

    if (shiftEnd - lastEnd > MAX_DIFF_THRESHOLD) {
      const offUnix = convertToUnix(lastEnd);
      const onUnix = convertToUnix(shiftEnd);
      if (onUnix > offUnix) {
        newOfftimes[offUnix] = { off: offUnix, on: onUnix };
      }
    }
  }

  if (Object.keys(newOfftimes).length === 0) {
    return hourlyData;
  }

  const hourlyDataNew = await insertUnitOffSessions(
    hourlyData,
    newOfftimes,
    shifts.A,
    date,
  );
  return hourlyDataNew;
};

export default hourlyArtificialOfftimeFixer;
