import { serverTimestamp } from "firebase/database";
import { auth } from "../firebase";
import { push } from "../firebase/api/db";

type activityType =
  | "add-mold"
  | "delete-mold"
  | "install-mold"
  | "update-info"
  | "update-machine"
  | "update-equipment"
  | "add-material"
  | "delete-material"
  | "update-material"
  | "add-user"
  | "delete-user"
  | "update-user"
  | "add-department"
  | "delete-department"
  | "update-department";
type DeviveInfo = {
  barnds: string[];
  mobile: string;
  platform: string;
};
const logger = async (
  activity: activityType,
  data: object | null,
): Promise<void> => {
  try {
    const { uid } = auth.currentUser || {};
    const agentData = (navigator as any || {}).userAgentData || {};
    const deviceInfo = {
      barnds: agentData.brands || [],
      mobile: agentData.mobile === undefined ? "NA" : agentData.mobile,
      platform: agentData.platform || "NA",
    } as DeviveInfo;
    if (!uid) return;
    const payload = {
      activity,
      deviceInfo,
      data,
      timestamp: serverTimestamp(),
    };
    await push(`logs/${uid}`, payload);
  } catch (e) {
    console.error(`Error in Logging activity: ${e}`);
  }
};

export default logger;
export type { activityType, DeviveInfo };
