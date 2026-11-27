import dayjs from "../../../Components/Functions/dayjs";
import { equipmentDetailsType, Hour, Report } from ".";
import { get } from "../../../Components/firebase/api/db";
import secToTime from "../../../Components/Functions/converters/secondsToHourMin";
import store from "../../../Components/Store";
import { equipmentsAtom, offlineTimeAtom } from "../../../Components/Store/atoms";
import minifiedSecFormatter from "../../../Components/Functions/formatters/minifiedSecFormatter";

interface ReturnType {
  equipmentFound: boolean;
  reportFound: boolean;
  equipmentDetails: equipmentDetailsType;
  report: Report;
}
const fetch = async (
  date: string,
  equipmentID: string,
): Promise<ReturnType> => {
  const dataToSend: ReturnType = {
    equipmentFound: false,
    reportFound: false,
    equipmentDetails: {
      name: "",
      lastUpdated: 0,
      status: "NA",
      statusSince: 0,
      unit: 1,
      isUpToDate: true,
    },
    report: {
      total: {
        electricity: 0,
        ontime: 0,
        sessions: 0,
      },
      hours: [],
      hourlyStats: {
        best: {
          electricity: "",
          ontime: "",
        },
        worst: {
          electricity: "",
          ontime: "",
        },
        average: {
          electricity: 0,
          ontime: 0,
        },
      },
    },
  };
  try {
    const allowedEquipments = store.get(equipmentsAtom) || {};
    const offlineTime = store.get(offlineTimeAtom);
    if (allowedEquipments[equipmentID] === undefined)
      throw new Error("Equipment not allowed");
    const snaps = [
      get(`equipments/${equipmentID}`),
      get(`reports/equipments/${equipmentID}/daily/${date}`),
      get(`reports/equipments/${equipmentID}/hourly/${date}`),
    ];
    const [equipmentSnap, reportSnap, hourlyRerportSnap] = await Promise.all(
      snaps,
    );
    if (!equipmentSnap.exists()) throw new Error("Equipment not found");
    dataToSend.equipmentFound = true;
    const equipment = equipmentSnap.val();
    equipment.unit = equipment.unit || 1;
    const unitSnap = await get(`units/${equipment.unit || 1}`);
    const unit = unitSnap.val();
    const { lastContact } = unit;
    const diff = dayjs().diff(dayjs.unix(lastContact || 0), "minute");
    const connected = diff <= offlineTime;
    unit.connected = connected;
    const { uploadedTil } = unit;
      const isUpToDate = (() => {
        if (uploadedTil === undefined) return true;
        const uploadedTilDate = dayjs(uploadedTil);
        const now = dayjs();
        // how far behind the data is
        const diff = now.diff(uploadedTilDate, "second");
        return minifiedSecFormatter(diff) + " behind";
      })();
    const status = unit.connected
      ? equipment.status
        ? "ON"
        : "IDLE"
      : unit.cleanDisconnect
      ? "OFF"
      : "NA";
    dataToSend.equipmentDetails = {
      name: equipment.name,
      lastUpdated: dayjs(equipment.updated).unix(),
      statusSince: dayjs(equipment.at).unix(),
      unit: equipment.unit || 1,
      status,
      isUpToDate,
    };
    if (!reportSnap.exists() || !hourlyRerportSnap.exists())
      throw new Error("Report not found");
    dataToSend.reportFound = true;
    const report = reportSnap.val();
    const hourlyReport = Object.values(hourlyRerportSnap.val() || {});
    const hours: Hour[] = [];
    const total = hourlyReport.length
      ? hourlyReport.length
      : hourlyReport.length - 1;
    const stats: {
      best: {
        electricity: number;
        ontime: number;
        hour: string;
      };
      worst: {
        electricity: number;
        ontime: number;
        hour: string;
      };
      average: {
        electricity: number | null;
        ontime: number | null;
      };
    } = {
      best: {
        electricity: -Infinity,
        ontime: -Infinity,
        hour: "",
      },
      worst: {
        electricity: Infinity,
        ontime: Infinity,
        hour: "",
      },
      average: {
        electricity: null,
        ontime: null,
      },
    };
    for await (const [index, _hour] of Object.entries(hourlyReport)) {
      const hour = _hour as any;
      const time = `${secToTime(hour.from)} - ${secToTime(hour.time)}`;
      const ontime = hour.ontime;
      const electricity = hour.electricity_usage;
      hours.push({
        time,
        ontime,
        electricity,
      });
      if (+index !== total) {
        if (stats.best.electricity < electricity) {
          stats.best.electricity = electricity;
          stats.best.hour = time;
        }
        if (stats.best.ontime < ontime) {
          stats.best.ontime = ontime;
          stats.best.hour = time;
        }
        if (stats.worst.electricity > electricity) {
          stats.worst.electricity = electricity;
          stats.worst.hour = time;
        }
        if (stats.worst.ontime > ontime) {
          stats.worst.ontime = ontime;
          stats.worst.hour = time;
        }
        // average
        if (stats.average.electricity === null)
          stats.average.electricity = electricity;
        else
          stats.average.electricity =
            (stats.average.electricity + electricity) / 2;
        if (stats.average.ontime === null) stats.average.ontime = ontime;
        else stats.average.ontime = (stats.average.ontime + ontime) / 2;
      }
    }
    dataToSend.report = {
      total: {
        electricity: report.electricity_usage || 0,
        ontime: report.ontime,
        sessions:
          report.total_sessions === undefined
            ? report.ontime
              ? 1
              : 0
            : report.total_sessions,
      },
      hours,
      hourlyStats: {
        best: {
          electricity: stats.best.hour,
          ontime: stats.best.hour,
        },
        worst: {
          electricity: stats.worst.hour,
          ontime: stats.worst.hour,
        },
        average: {
          electricity: stats.average.electricity || 0,
          ontime: stats.average.ontime || 0,
        },
      },
    };
  } catch (err) {
    console.log(err);
  }
  return dataToSend;
};

export type { ReturnType };
export default fetch;
