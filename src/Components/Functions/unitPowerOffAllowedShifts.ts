import dayjs from "./dayjs";

const unitPowerOffAllowedShifts = (
  date: string,
  shift: any,
  sessions: {
    [key: string]: {
      off: number; // unix
      on: number; // unix
    };
  },
  allowedShifts: ("a" | "b" | "c")[],
): number => {
  const shiftData = shift as {
    shifts: number;
    shift_a_start: string; // convert to num using +
    shift_b_start: string; // convert to num using +
    shift_c_start: string; // convert to num using +
  };
  let total = 0;
  const dayStart = dayjs.utc(date).unix();
  const shiftAStart = dayStart + +shiftData.shift_a_start;
  const shiftBStart = dayStart + +shiftData.shift_b_start;
  const shiftCStart = +shiftData.shifts === 3 ? dayStart + +shiftData.shift_c_start : 0;
  const dayEnd = shiftAStart + 86400;

  for (const session of Object.values(sessions || {})) {
    const rawStart = session.off;
    const rawEnd = session.on;
    const start = Math.max(rawStart, shiftAStart);
    const end = Math.min(rawEnd, dayEnd);
    if (end <= start) continue;

    if (shift.shifts === allowedShifts.length) {
      total += end - start;
      continue;
    }
    if (shift.shifts === 2) {
      if (allowedShifts.includes("a")) {
        const s = Math.max(start, shiftAStart);
        const e = Math.min(end, shiftBStart);
        if (e > s) total += e - s;
      }
      if (allowedShifts.includes("b")) {
        const s = Math.max(start, shiftBStart);
        const e = Math.min(end, dayEnd);
        if (e > s) total += e - s;
      }
    } else if (shift.shifts === 3) {
      if (allowedShifts.includes("a")) {
        const s = Math.max(start, shiftAStart);
        const e = Math.min(end, shiftBStart);
        if (e > s) total += e - s;
      }
      if (allowedShifts.includes("b")) {
        const s = Math.max(start, shiftBStart);
        const e = Math.min(end, shiftCStart);
        if (e > s) total += e - s;
      }
      if (allowedShifts.includes("c")) {
        const s = Math.max(start, shiftCStart);
        const e = Math.min(end, dayEnd);
        if (e > s) total += e - s;
      }
    } else {
      if (allowedShifts.includes("a")) {
        const s = Math.max(start, shiftAStart);
        const e = Math.min(end, dayEnd);
        if (e > s) total += e - s;
      }
    }
  }
  return total;
};

export default unitPowerOffAllowedShifts;
