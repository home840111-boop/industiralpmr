import secToTime from "../converters/secondsToHourMin";
import dayjs from "../dayjs";

const insertUnitOffSessions = (
  data: any,
  sessions: any,
  shiftStart: number,
  date: string,
): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    const func = async () => {
      const convertToUnix = (time: number) => {
        const unix = dayjs.utc(
          `${
            +time >= 86400
              ? dayjs(date, "YYYY-MM-DD").add(1, "day").format("YYYY-MM-DD")
              : date
          } ${secToTime(time)}`,
          "YYYY-MM-DD HH:mm:ss",
        ).unix();
        return unix;
      };
      const convertToHour = (unix: number) => {
        const _dayjs = dayjs.unix(unix).utc();
        let hour =
          _dayjs.hour() * 3600 + _dayjs.minute() * 60 + _dayjs.second();
        if (_dayjs.format("YYYY-MM-DD") !== date) hour += 86400;
        return hour;
      };
      const dummyHour = {
        new: "NEW",
        cavities: 0,
        electricity_usage: 0,
        material: "N/A",
        material_usage: 0,
        mold_name: "N/A",
        offtime: 0,
        ontime: 0,
        operator: "N/A",
        product: "N/A",
        product_color: "N/A",
        product_weight: "N/A",
        production: 0,
        shots: 0,
        status: false,
      };
      const shiftStartUnix = convertToUnix(shiftStart);
      const newHours = data;
      const hours = Object.keys(data);
      let lastKey = hours.length > 0 ? +hours[hours.length - 1] : 0;
      if (isNaN(lastKey)) lastKey = hours.length;

      if (hours.length === 0) {
        for (const _session of Object.values(sessions || {})) {
          const session = _session as any;
          if (!session || typeof session.off !== "number" || typeof session.on !== "number" || session.on <= session.off) continue;
          const sOff = Math.max(session.off, shiftStartUnix);
          const sOn = Math.min(session.on, shiftStartUnix + 86400);
          if (sOn <= sOff) continue;
          let currentUnix = sOff;
          let currentHour = convertToHour(currentUnix);
          const dummyHours = Math.floor((sOn - sOff) / 3600);
          for (let i = 0; i < dummyHours; i++) {
            lastKey++;
            newHours[lastKey] = {
              ...dummyHour,
              from: currentHour + 60,
              shutdown_time: 3600,
              time: currentHour + 3600,
            };
            currentHour += 3600;
            currentUnix += 3600;
          }
          if (sOn > currentUnix) {
            lastKey++;
            newHours[lastKey] = {
              ...dummyHour,
              from: currentHour + 60,
              shutdown_time: sOn - currentUnix,
              time: convertToHour(sOn),
            };
          }
        }
        return newHours;
      }

      for await (const _session of Object.values(sessions)) {
        const session = _session as any;
        if (!session || typeof session.off !== "number" || typeof session.on !== "number" || session.on <= session.off) continue;
        const off = Math.max(session.off, shiftStartUnix);
        const on = Math.min(session.on, shiftStartUnix + 86400);
        if (on <= off) continue;
        let done = false;
        let index = 0;
        for await (const hourKey of hours) {
          const hour = data[hourKey];
          if (done) {
            index++;
            continue;
          }
          const start = convertToUnix(hour?.from || 0);
          const end = convertToUnix(hour?.time || 0);
          // CONDITION 1: if index is 0 off is shift start        ^OFF---ON|start___end|
          if (index === 0 && Math.abs(off - shiftStartUnix) <= 60) {
            const dummyHours = Math.floor((on - off) / 3600);
            // add dummy hours to the start of the day
            for (let i = 0; i < dummyHours; i++) {
              lastKey++;
              newHours[lastKey] = {
                ...dummyHour,
                from: shiftStart + 3600 * i + 60,
                shutdown_time: 3600,
                time: +shiftStart + 3600 * (i + 1),
              };
            }
            if (on > shiftStartUnix + 3600 * dummyHours) {
              // add hour till on
              lastKey++;
              newHours[lastKey] = {
                ...dummyHour,
                from: shiftStart + 3600 * dummyHours + 60,
                shutdown_time: on - (shiftStartUnix + 3600 * dummyHours),
                time: convertToHour(on),
              };
            }
            done = true;
          }
          // CONDITION 2: if index is last and on is shift start + 24 hours       |start___end|OFF---ON^
          else if (
            index === hours.length - 1 &&
            on === shiftStartUnix + 86400
          ) {
            // end current hour till off and add dummy hours till shift end
            const dummyHours = Math.floor((on - off) / 3600);
            let lastEnd = data[hourKey].time;
            const offHour = convertToHour(off);
            newHours[hourKey].time = offHour;
            // add hour from time till lastend
            lastKey++;
            newHours[lastKey] = {
              ...dummyHour,
              from: offHour + 60,
              shutdown_time: convertToUnix(lastEnd) - off,
              time: lastEnd,
            };
            for (let i = 0; i < dummyHours; i++) {
              lastKey++;
              newHours[lastKey] = {
                ...dummyHour,
                from: lastEnd + 60,
                shutdown_time: 3600,
                time: lastEnd + 3600,
              };
              lastEnd = newHours[lastKey].time;
            }
            done = true;
          }
          // CONDITION 3: if off and on is between start and end     |start___OFF---ON___end|
          else if (off >= start && on <= end) {
            // ammend current hour
            if (newHours[hourKey].shutdown_time === undefined)
              newHours[hourKey].shutdown_time = 0;
            newHours[hourKey].shutdown_time += on - off;
          }
          // CONDITION 4: if off is less than start and on is greater than start but less than end        OFF--|start--ON___end|
          else if (off <= start && on >= start - 60 && on <= end) {
            let newOff = convertToHour(off);
            const dummyHours = Math.floor((on - off) / 3600);
            for (let i = 0; i < dummyHours; i++) {
              lastKey++;
              // add hour before start
              newHours[lastKey] = {
                ...dummyHour,
                from: newOff + 60,
                shutdown_time: 3600,
                time: newOff + 3600,
              };
              newOff = newHours[lastKey].time;
            }
            // add hour from time till lastend
            lastKey++;
            newHours[lastKey] = {
              ...dummyHour,
              from: newOff + 60,
              shutdown_time: convertToHour(on) - newOff,
              time: convertToHour(on),
            };
          }
          // if not last index
          else if (index < hours.length - 1) {
            // CONDITION 5: if off is between start and end and on is less than next hour start     |start___OFF__end|--ON|start___end|
            const nextHour = data[hours[index + 1]];
            if (
              nextHour &&
              off >= start &&
              off <= end &&
              on >= end &&
              on <= convertToUnix(nextHour.time)
            ) {
              // end current hour till off and add dummy hours till on
              let lastEnd = data[hourKey].time;
              const lastEndUnix = convertToUnix(lastEnd);
              const offHour = convertToHour(off);
              newHours[hourKey].time = offHour;
              const dummyHours = Math.floor((on - lastEndUnix) / 3600);
              // add an hour from off till lastend
              lastKey++;
              newHours[lastKey] = {
                ...dummyHour,
                from: offHour + 60,
                shutdown_time: convertToUnix(lastEnd) - off,
                time: lastEnd,
              };
              for (let i = 0; i < dummyHours; i++) {
                lastKey++;
                newHours[lastKey] = {
                  ...dummyHour,
                  from: lastEnd + 60,
                  shutdown_time: 3600,
                  time: lastEnd + 3600,
                };
                lastEnd = newHours[lastKey].time;
              }
              // add an hour from lastend till on
              lastKey++;
              newHours[lastKey] = {
                ...dummyHour,
                from: lastEnd + 60,
                shutdown_time: on - convertToUnix(lastEnd),
                time: convertToHour(on),
              };
              done = true;
            }
            // CONDITION 6: if off is greater than end and on is less than next hour start      |start___end|OFF--ON|start___end|
            else if (
              nextHour &&
              off >= end &&
              on <= convertToUnix(nextHour.from)
            ) {
              // insert from off till on
              lastKey++;
              newHours[lastKey] = {
                ...dummyHour,
                from: convertToHour(off),
                shutdown_time: on - off,
                time: convertToHour(on),
              };
              done = true;
            }
          }
          index++;
        }
      }
      // const myHours = Object.fromEntries(
      //   Object.entries(newHours).map(([key, hour]: [any, any]) => {
      //     // const { from, time, shutdown_time, status } = hour;
      //     // const duration = time - from;
      //     // if (status) hour.ontime = duration;
      //     // else hour.offtime = shutdown_time ? 0 : duration;
      //     return [key, hour];
      //   }),
      // );
      return newHours;
    };
    resolve(func());
  });
};
export default insertUnitOffSessions;
