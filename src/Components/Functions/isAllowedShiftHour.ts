

const isAllowedShiftHour = (shift: any, hour: number, allowedShifts: ("a" | "b" | "c")[]) => {
    if (allowedShifts.length === 0) return false;
    const shiftData = shift as {
        shifts: number,
        shift_a_start: string, // convert to num using +
        shift_b_start: string, // convert to num using +
        shift_c_start: string, // convert to num using +
    };
    const _start = hour;
    if (shiftData.shifts === 1) allowedShifts = ["a"];
    else if (shiftData.shifts === 2 && allowedShifts.includes("c")) {
        const index = allowedShifts.indexOf("c");
        allowedShifts.splice(index, 1);
    }

    if (shiftData.shifts === 2) {
        if (allowedShifts.length === 1) {
            if (allowedShifts.includes("a") && _start >= +shiftData.shift_b_start) return false;
            else if (allowedShifts.includes("b") && _start < +shiftData.shift_b_start) return false;
        }
    } else if (shiftData.shifts === 3) {
        if (allowedShifts.length === 1) {
            if (allowedShifts.includes("a") && _start >= +shiftData.shift_b_start) return false;
            else if (allowedShifts.includes("b") && (_start < +shiftData.shift_b_start || _start >= +shiftData.shift_c_start)) return false;
            else if (allowedShifts.includes("c") && _start < +shiftData.shift_c_start) return false;
        } else if (allowedShifts.length === 2) {
            if (allowedShifts.includes("a") && allowedShifts.includes("b")) {
                if (_start >= +shiftData.shift_c_start) return false;
            } else if (allowedShifts.includes("b") && allowedShifts.includes("c")) {
                if (_start < +shiftData.shift_b_start) return false;
            } else if (allowedShifts.includes("a") && allowedShifts.includes("c")) {
                if (_start >= +shiftData.shift_b_start && _start < +shiftData.shift_c_start) return false;
            }
        }
    }
    return true;
}

export default isAllowedShiftHour;