import { get } from "../../../Components/firebase/api/db";
import secToTime from "../../../Components/Functions/converters/secondsToHourMin";
import { selectedFactoryType } from "../../../Components/Store/atoms";
import { GeneralDataProps } from "./types";

const fetch = async (
  selectedFactory: selectedFactoryType,
): Promise<GeneralDataProps> => {
  return new Promise(async (resolve, reject) => {
    try {
      const snap = await get(
        selectedFactory.value === -1
          ? `info`
          : `factories/${selectedFactory.value}/info`,
      );
      if (!snap.exists()) throw Error("No data found");
      const data = snap.val();
      const dataToReturn: GeneralDataProps = {
        factoryName: data.company_name,
        shiftCount: +data.shifts || 1,
        shiftRotation: data.shiftRotation || null,
        offTimeBasedEfficiency: data.off_time_based_efficiency || false,
        shifts: {
          A: {
            name:
              data.supervisor_a !== undefined ? data.supervisor_a : "Shift A",
            start: secToTime(
              data.shift_a_start !== undefined ? data.shift_a_start : 28800,
            ),
            hours:
              (data.shift_a_hours !== undefined ? data.shift_a_hours : 86400) /
              3600,
          },
          B: {
            name: null,
            start: null,
            hours: null,
          },
          C: {
            name: null,
            start: null,
            hours: null,
          },
        },
        offlineTime: data.offline_time || 3,
      };
      if (dataToReturn.shiftCount > 1) {
        // dataToReturn.shifts.A.hours = 43200 / 3600;
        dataToReturn.shifts.B = {
          name: data.supervisor_b || "Shift B",
          start: secToTime(data.shift_b_start || 28800),
          hours: (data.shift_b_hours || 43200) / 3600,
        };
      }
      if (dataToReturn.shiftCount > 2) {
        // dataToReturn.shifts.B.hours = 28800 / 3600;
        dataToReturn.shifts.C = {
          name: data.supervisor_c || "Shift C",
          start: secToTime(data.shift_c_start || 28800),
          hours: (data.shift_c_hours || 28800) / 3600,
        };
      }
      resolve(dataToReturn);
    } catch (err) {
      console.error(err);
      reject(err);
    }
  });
};

export default fetch;
