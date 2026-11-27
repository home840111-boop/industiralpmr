import {
  logEvent,
  EventNameString,
  setUserId,
  setUserProperties,
} from "firebase/analytics";
import { analytics } from "..";

const log = (event: EventNameString) => {
  logEvent(analytics, event as string);
};

const setUid = (uid: string) => {
  setUserId(analytics, uid);
};

const setUserProperty = (name: string, value: string) => {
  setUserProperties(analytics, {
    [name]: value,
  });
};

export { log, setUid, setUserProperty };
